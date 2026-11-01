import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDebounce } from '../../hooks/useDebounce';
import {
  recentSearches,
  rememberSearch,
  searchHistoryPaused,
  useLocalFlag,
  useLocalList,
} from '../../hooks/usePersonal';
import { schoolService } from '../../services/publicApi';
import type { PlaceSuggestion, Suggestions } from '../../types/api';
import { placeLine } from '../../utils/format';
import { Icon, type IconName } from '../common/Icon';

interface Option {
  id: string;
  label: string;
  detail?: string;
  icon: IconName;
  href: string;
  query?: string;
}

function placeHref(p: PlaceSuggestion): string {
  if (p.type === 'STATE') return `/states/${p.stateSlug}`;
  if (p.type === 'DISTRICT') return `/states/${p.stateSlug}/${p.district}`;
  return `/schools?state=${p.stateCode}&city=${encodeURIComponent(p.city ?? '')}`;
}

const searchHref = (q: string) => `/schools?q=${encodeURIComponent(q)}`;

/**
 * The name box of a school search, with suggestions (WAI-ARIA combobox pattern): matching places and schools open
 * directly, and with an empty box it offers the visitor's recent searches, stored only in this browser and able to be
 * cleared or paused. Enter with no suggestion highlighted submits the surrounding form, so its other fields apply.
 */
export function SchoolSuggestInput({ id, value, onChange, placeholder = 'School name, city, PIN or UDISE code' }: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const navigate = useNavigate();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ term: string; data: Suggestions } | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const recent = useLocalList(recentSearches);
  const paused = useLocalFlag(searchHistoryPaused);
  const term = useDebounce(value.trim(), 200);

  useEffect(() => {
    if (term.length < 2) return undefined;
    let current = true;
    setFailed(false);
    schoolService.suggest(term)
      .then((data) => current && setResult({ term, data }))
      .catch(() => current && setFailed(true));
    return () => {
      current = false;
    };
  }, [term]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const typed = value.trim();
  const fresh = result && result.term === typed ? result.data : null;
  const options: Option[] = [];
  if (typed.length >= 2) {
    fresh?.places.forEach((p, i) => options.push({
      id: `p${i}`, label: p.label, icon: 'pin', href: placeHref(p),
      detail: p.type === 'STATE' ? 'State / UT' : p.stateName,
    }));
    fresh?.schools.forEach((s) => options.push({
      id: `s${s.id}`, label: s.name, icon: 'building', href: `/schools/${s.slug}`,
      detail: placeLine(s.locality, s.city),
    }));
  } else {
    recent.forEach((r, i) => options.push({ id: `r${i}`, label: r, icon: 'clock', href: searchHref(r), query: r }));
  }

  const go = (option: Option) => {
    if (option.query) rememberSearch(option.query);
    setOpen(false);
    setActive(-1);
    navigate(option.href);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (options.length ? (i + 1) % options.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1));
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    } else if (e.key === 'Enter' && open && active >= 0 && options[active]) {
      e.preventDefault(); // open the highlighted suggestion instead of submitting the form
      go(options[active]);
    } else if (e.key === 'Enter') {
      setOpen(false);
    }
  };

  const showList = open && (options.length > 0 || (typed.length < 2 && paused) || (failed && typed.length >= 2));

  return (
    <div ref={wrapper} className="relative">
      <label htmlFor={id} className="sr-only">Search schools, cities and districts</label>
      <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 && options[active] ? `${listId}-${options[active].id}` : undefined}
        autoComplete="off"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="input h-12 pl-11"
      />
      {showList && (
        <div className="absolute left-0 right-0 top-full z-[600] mt-1 overflow-hidden rounded-2xl bg-white text-left shadow-lift ring-1 ring-slate-200">
          {typed.length < 2 && (
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
              <span>{paused ? 'Search history is paused' : 'Recent searches (this device only)'}</span>
              <span className="flex gap-3">
                {recent.length > 0 && (
                  <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => recentSearches.clear()}>Clear</button>
                )}
                <button type="button" className="font-semibold text-brand-700 hover:underline" onClick={() => searchHistoryPaused.set(!paused)}>
                  {paused ? 'Resume' : 'Pause'}
                </button>
              </span>
            </div>
          )}
          <ul id={listId} role="listbox" aria-label="Suggestions" className="max-h-80 overflow-y-auto py-1">
            {options.map((o, i) => (
              <li key={o.id} id={`${listId}-${o.id}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} onClick={() => go(o)} onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-brand-50' : ''}`}>
                <Icon name={o.icon} className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{o.label}</span>
                  {o.detail && <span className="block truncate text-xs text-slate-500">{o.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          {failed && typed.length >= 2 && (
            <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">Suggestions are unavailable right now — press Search to see results.</p>
          )}
        </div>
      )}
    </div>
  );
}
