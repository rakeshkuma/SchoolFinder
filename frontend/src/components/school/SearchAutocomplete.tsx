import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
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

export function placeHref(p: PlaceSuggestion): string {
  if (p.type === 'STATE') return `/states/${p.stateSlug}`;
  if (p.type === 'DISTRICT') return `/states/${p.stateSlug}/${p.district}`;
  return `/schools?state=${p.stateCode}&city=${encodeURIComponent(p.city ?? '')}`;
}

const searchHref = (q: string) => `/schools?q=${encodeURIComponent(q)}`;

/**
 * School and place search with suggestions (WAI-ARIA combobox pattern). With an empty box it offers the
 * visitor's recent searches, which are stored only in this browser and can be cleared or paused.
 */
export function SearchAutocomplete({ variant = 'hero', placeholder }: { variant?: 'hero' | 'compact'; placeholder?: string }) {
  const navigate = useNavigate();
  const listId = useId();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [result, setResult] = useState<{ term: string; data: Suggestions } | null>(null);
  const [failed, setFailed] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const recent = useLocalList(recentSearches);
  const paused = useLocalFlag(searchHistoryPaused);
  const term = useDebounce(q.trim(), 200);

  useEffect(() => {
    if (term.length < 2) return;
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

  const typed = q.trim();
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
    options.push({ id: 'all', label: `Search all schools for “${typed}”`, icon: 'search', href: searchHref(typed), query: typed });
  } else {
    recent.forEach((r, i) => options.push({ id: `r${i}`, label: r, icon: 'clock', href: searchHref(r), query: r }));
  }

  const go = (option: Option) => {
    if (option.query) rememberSearch(option.query);
    setOpen(false);
    setActive(-1);
    navigate(option.href);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && options[active]) return go(options[active]);
    rememberSearch(typed);
    setOpen(false);
    navigate(typed ? searchHref(typed) : '/schools');
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
    }
  };

  const showList = open && (options.length > 0 || (typed.length < 2 && paused));
  const hero = variant === 'hero';

  return (
    <div ref={wrapper} className={`relative ${hero ? 'max-w-xl' : 'w-full'}`}>
      <form onSubmit={submit} role="search"
        className={hero
          ? 'flex items-center gap-2 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-white/20'
          : 'flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-2 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15'}>
        <label htmlFor={`${listId}-input`} className="sr-only">Search schools, cities and districts</label>
        <Icon name="search" className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
        <input
          id={`${listId}-input`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 && options[active] ? `${listId}-${options[active].id}` : undefined}
          autoComplete="off"
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'School, city, district, PIN or UDISE code…'}
          className={`min-w-0 flex-1 border-0 bg-transparent px-1 text-ink placeholder:text-slate-400 focus:outline-none ${hero ? 'h-12 text-base' : 'h-10 text-sm'}`}
        />
        <button type="submit" className={hero ? 'btn-accent h-12 rounded-xl px-6 text-base' : 'btn-primary h-8 rounded-lg px-3 text-xs'}>
          Search
        </button>
      </form>

      {showList && (
        <div className="absolute left-0 right-0 top-full z-[600] mt-2 overflow-hidden rounded-2xl bg-white text-left shadow-lift ring-1 ring-slate-200">
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
          <ul id={`${listId}-list`} role="listbox" aria-label="Suggestions" className="max-h-80 overflow-y-auto py-1">
            {options.map((o, i) => (
              <li key={o.id} id={`${listId}-${o.id}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()} onClick={() => go(o)} onMouseEnter={() => setActive(i)}
                className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm ${i === active ? 'bg-brand-50' : ''}`}>
                <Icon name={o.icon} className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate ${o.id === 'all' ? 'font-semibold text-brand-700' : 'font-medium text-ink'}`}>{o.label}</span>
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
