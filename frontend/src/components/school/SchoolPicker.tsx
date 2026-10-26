import { useState } from 'react';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { schoolService } from '../../services/publicApi';
import type { SchoolSummary } from '../../types/api';

/** Type-ahead school search used by the calculator and comparison pages. */
export function SchoolPicker({ onPick, exclude = [], disabled }: { onPick: (s: SchoolSummary) => void; exclude?: number[]; disabled?: boolean }) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q.trim(), 250);
  const results = useApi(() => schoolService.search({ q: debounced, size: 8 }), [debounced], debounced.length >= 2);
  const options = (results.data?.content ?? []).filter((s) => !exclude.includes(s.id));
  return (
    <div className="relative">
      <label htmlFor="school-picker" className="sr-only">Add a school</label>
      <input id="school-picker" className="input" placeholder={disabled ? 'Maximum of 4 schools selected' : 'Type a school name to add…'}
        value={q} onChange={(e) => setQ(e.target.value)} disabled={disabled} autoComplete="off" />
      {debounced.length >= 2 && q && (
        <ul className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg" role="listbox">
          {results.loading && <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>}
          {!results.loading && options.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No matching schools</li>}
          {options.map((s) => (
            <li key={s.id} role="option" aria-selected={false}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => { onPick(s); setQ(''); }}>
                <span className="font-medium">{s.name}</span>
                <span className="ml-2 text-xs text-slate-500">{s.locality}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
