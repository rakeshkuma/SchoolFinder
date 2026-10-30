import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { rememberSearch } from '../../hooks/usePersonal';
import { locationService, referenceService } from '../../services/publicApi';
import { Icon } from '../common/Icon';
import { SchoolSuggestInput } from './SearchAutocomplete';

export interface HeroSearch {
  q?: string;
  state?: string;
  city?: string;
  board?: string;
}

/**
 * One school search: name (with suggestions of schools and places, and recent searches), state, city and optionally
 * board. Submitting hands the choice to `onSearch`; the form itself never filters anything.
 */
export function SchoolSearchForm({ value = {}, onSearch, withBoard = true, submitLabel = 'Search', idPrefix = 'hero', stacked = false }: {
  value?: HeroSearch;
  onSearch: (next: HeroSearch) => void;
  withBoard?: boolean;
  submitLabel?: string;
  idPrefix?: string;
  /** For narrower columns: the name on its own row, the rest below it. */
  stacked?: boolean;
}) {
  const [draft, setDraft] = useState<HeroSearch>(value);
  useEffect(() => setDraft(value), [value.q, value.state, value.city, value.board]); // eslint-disable-line react-hooks/exhaustive-deps
  const states = useApi(() => locationService.states(), []);
  const boards = useApi(() => referenceService.boards(), [], withBoard);
  const cities = useApi(() => locationService.cities(draft.state as string), [draft.state], !!draft.state);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.q?.trim()) rememberSearch(draft.q.trim());
    onSearch({ q: draft.q?.trim() || undefined, state: draft.state || undefined, city: draft.city || undefined, board: draft.board || undefined });
  };
  const noCities = (cities.data?.length ?? 0) === 0;

  return (
    <form onSubmit={submit} role="search" aria-label="Search schools"
      className={`grid gap-3 rounded-3xl bg-white p-3 text-ink shadow-lift ${stacked ? 'sm:grid-cols-[1fr_1fr_auto]'
        : `sm:grid-cols-2 ${withBoard ? 'lg:grid-cols-[2fr_1fr_1fr_1fr_auto]' : 'lg:grid-cols-[2fr_1fr_1fr_auto]'}`}`}>
      <div className={stacked ? 'sm:col-span-3' : ''}>
        <SchoolSuggestInput id={`${idPrefix}-q`} value={draft.q ?? ''} onChange={(q) => setDraft({ ...draft, q })}
          placeholder="School name, city, PIN or UDISE code" />
      </div>
      <label className="sr-only" htmlFor={`${idPrefix}-state`}>State</label>
      <select id={`${idPrefix}-state`} className="input h-12" value={draft.state ?? ''} onChange={(e) => setDraft({ ...draft, state: e.target.value || undefined, city: undefined })}>
        <option value="">All states</option>
        {(states.data ?? []).filter((s) => s.schoolCount > 0).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <label className="sr-only" htmlFor={`${idPrefix}-city`}>City</label>
      <select id={`${idPrefix}-city`} className="input h-12 disabled:bg-slate-50 disabled:text-slate-500" disabled={!draft.state || noCities}
        value={draft.city ?? ''} onChange={(e) => setDraft({ ...draft, city: e.target.value || undefined })}>
        <option value="">{draft.state ? (noCities ? 'No cities listed' : 'All cities') : 'Choose a state first'}</option>
        {(cities.data ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select>
      {withBoard && (
        <>
          <label className="sr-only" htmlFor={`${idPrefix}-board`}>Board</label>
          <select id={`${idPrefix}-board`} className="input h-12" value={draft.board ?? ''} onChange={(e) => setDraft({ ...draft, board: e.target.value || undefined })}>
            <option value="">All boards</option>
            {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC' : b.code}</option>)}
          </select>
        </>
      )}
      <button type="submit" className={`btn-accent h-12 whitespace-nowrap rounded-2xl px-6 text-base ${stacked ? '' : 'sm:col-span-2 lg:col-span-1'}`}>
        <Icon name="search" className="h-5 w-5" /> {submitLabel}
      </button>
    </form>
  );
}

/** Hero of the Schools page: a colourful band with the school search. */
export function SchoolsHero({ value, onSearch, total }: { value: HeroSearch; onSearch: (next: HeroSearch) => void; total?: number }) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 text-white">
      {/* Decorative: soft shapes and a faint grid — no stock photography, so nothing implies a particular school. */}
      <div className="bg-grid absolute inset-0 opacity-40" aria-hidden />
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-accent-400/30 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 left-10 h-72 w-72 rounded-full bg-violet-400/30 blur-3xl" aria-hidden />
      <svg className="absolute bottom-0 right-6 hidden h-56 w-56 text-white/10 lg:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.6} aria-hidden>
        <path d="M2 9l10-5 10 5-10 5L2 9zm4 2.2V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.8M22 9v6" />
      </svg>
      <div className="container-page relative py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-200">School directory</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">Discover the Best Schools Across India</h1>
        <p className="mt-3 max-w-2xl text-base text-blue-50 sm:text-lg">
          Explore schools, compare facilities, check admissions and find the right school for your child.
        </p>
        <div className="mt-8"><SchoolSearchForm value={value} onSearch={onSearch} /></div>
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm">
          {total !== undefined && <span className="mr-2 text-blue-50"><strong className="text-white">{total.toLocaleString('en-IN')}</strong> schools listed</span>}
          <Link to="/find" className="chip bg-white/15 px-3 py-1.5 text-white ring-1 ring-white/25 hover:bg-white/25"><Icon name="sparkle" className="h-4 w-4" /> Help me choose</Link>
          <Link to="/nearby" className="chip bg-white/15 px-3 py-1.5 text-white ring-1 ring-white/25 hover:bg-white/25"><Icon name="pin" className="h-4 w-4" /> Schools near me</Link>
          <Link to="/compare" className="chip bg-white/15 px-3 py-1.5 text-white ring-1 ring-white/25 hover:bg-white/25"><Icon name="scale" className="h-4 w-4" /> Compare schools</Link>
        </div>
      </div>
    </section>
  );
}
