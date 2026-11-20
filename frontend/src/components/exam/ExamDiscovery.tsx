import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '../common/Icon';
import type { ExamSummary, IndianState } from '../../types/api';
import { classLabel, romanClass } from '../../utils/exams';

interface Suggestion {
  key: string;
  label: string;
  hint: string;
  /** a path to open, or a search to run */
  to?: string;
  q?: string;
  /** a state code: show every exam open to its residents (national ones included) */
  state?: string;
}

/** Word-start match, like the server's search ("navo" finds Navodaya; "vi" does not match inside "vidyalaya"). */
const matchesWords = (text: string, query: string) => {
  const hay = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')}`;
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(` ${w}`));
};

/**
 * Search box with suggestions (WAI-ARIA combobox): matching exams open their guide directly; classes and states run a
 * search. Pressing Enter without choosing a suggestion searches for the text as typed. Suggestions come only from
 * published exams and real states, never invented entries.
 */
export function ExamSearch({ exams, states, initial, onSearch, onState }: {
  exams: ExamSummary[];
  states: IndianState[];
  initial: string;
  onSearch: (q: string) => void;
  onState: (code: string) => void;
}) {
  const navigate = useNavigate();
  const [text, setText] = useState(initial);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const suggestions = useMemo<Suggestion[]>(() => {
    const q = text.trim();
    if (q.length < 2) return [];
    const out: Suggestion[] = exams
      .filter((e) => matchesWords(`${e.shortName} ${e.name} ${e.conductingAuthority}`, q))
      .slice(0, 5)
      .map((e) => ({ key: `exam-${e.slug}`, label: e.shortName, hint: `${classLabel(e.entryClasses)} · ${e.kind === 'SELECTION_PROCESS' ? 'admission process' : 'entrance test'}`, to: `/exams/${e.slug}` }));
    const n = Number(q.replace(/^class\s*/i, ''));
    if (Number.isInteger(n) && n >= 1 && n <= 12) {
      const count = exams.filter((e) => e.entryClasses.includes(n)).length;
      out.push({ key: `class-${n}`, label: `Class ${romanClass(n)} (${n}) admission`, hint: `${count} exam${count === 1 ? '' : 's'}`, q: `class ${n}` });
    }
    states.filter((s) => matchesWords(s.name, q)).slice(0, 2)
      .forEach((s) => out.push({ key: `state-${s.code}`, label: `Exams open to students in ${s.name}`, hint: 'national and state', state: s.code }));
    if (out.length > 0) out.push({ key: 'all', label: `Search all exams for “${q}”`, hint: 'search', q });
    return out;
  }, [text, exams, states]);

  const choose = (s: Suggestion) => {
    setOpen(false);
    setActive(-1);
    if (s.to) navigate(s.to);
    else if (s.state) { setText(''); onState(s.state); }
    else { setText(s.q ?? text); onSearch(s.q ?? text); }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && suggestions[active]) { choose(suggestions[active]); return; }
    setOpen(false);
    onSearch(text.trim());
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((a) => Math.min(suggestions.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(-1, a - 1)); }
    else if (e.key === 'Escape') { setOpen(false); setActive(-1); }
  };
  const expanded = open && suggestions.length > 0;

  return (
    <form role="search" onSubmit={submit} className="relative">
      <label htmlFor="exam-search" className="sr-only">Search by exam, school, class, state or authority</label>
      <div className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-black/5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-2">
          <Icon name="search" className="h-5 w-5 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            id="exam-search"
            type="search"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
            autoComplete="off"
            value={text}
            onChange={(e) => { setText(e.target.value); setOpen(true); setActive(-1); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKey}
            placeholder="Navodaya, Sainik School, Class 6, Bihar…"
            className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-base text-ink placeholder:text-slate-400 focus:outline-none focus:ring-0"
          />
        </div>
        <button type="submit" className="btn-primary justify-center rounded-xl px-5 py-3">Search exams</button>
      </div>
      {expanded && (
        <ul id={listId} role="listbox" aria-label="Suggestions"
          className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 text-sm shadow-lift">
          {suggestions.map((s, i) => (
            <li key={s.key} id={`${listId}-${i}`} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 ${i === active ? 'bg-brand-50' : 'hover:bg-slate-50'}`}>
              <span className="truncate font-medium text-ink">{s.label}</span>
              <span className="shrink-0 text-xs text-slate-500">{s.hint}</span>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export interface StatTile {
  label: string;
  /** null while loading or when the data is not available */
  value: number | null;
  help: string;
  tone: string;
  icon: IconName;
  to?: string;
  onClick?: () => void;
}

/** Counts worked out from the current records — nothing here is typed in by hand. */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {tiles.map((t) => {
        const body = (
          <>
            <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${t.tone}`}><Icon name={t.icon} className="h-5 w-5" /></span>
            <span className="mt-3 block font-display text-2xl font-bold tabular-nums text-ink">{t.value ?? '–'}</span>
            <span className="mt-0.5 block text-sm font-medium text-slate-700">{t.label}</span>
            <span className="mt-0.5 block text-xs text-slate-500">{t.help}</span>
          </>
        );
        const cls = 'card card-hover flex h-full flex-col items-start justify-start p-4 text-left';
        return (
          <li key={t.label}>
            {t.to ? <Link to={t.to} className={cls}>{body}</Link>
              : <button type="button" onClick={t.onClick} className={`${cls} w-full`}>{body}</button>}
          </li>
        );
      })}
    </ul>
  );
}

export interface DiscoveryTile {
  title: string;
  text: string;
  icon: IconName;
  to?: string;
  onClick?: () => void;
  badge?: ReactNode;
}

export function DiscoveryTiles({ tiles }: { tiles: DiscoveryTile[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tiles.map((t) => {
        const body = (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
              <Icon name={t.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-semibold text-ink">{t.title}{t.badge}</span>
              <span className="mt-0.5 block text-sm text-slate-600">{t.text}</span>
            </span>
            <Icon name="arrowRight" className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-700" />
          </>
        );
        const cls = 'card group flex h-full items-start gap-3 p-4 text-left transition hover:border-brand-200 hover:shadow-lift';
        return (
          <li key={t.title}>
            {t.to ? <Link to={t.to} className={cls}>{body}</Link>
              : <button type="button" onClick={t.onClick} className={`${cls} w-full`}>{body}</button>}
          </li>
        );
      })}
    </ul>
  );
}
