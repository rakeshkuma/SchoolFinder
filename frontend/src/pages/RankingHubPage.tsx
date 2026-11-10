import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, NavLink, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Icon, type IconName } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, Spinner } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { availableItems, RANKING_ITEMS } from '../components/layout/MainNav';
import { CompareButton } from '../components/school/CompareBar';
import { SchoolImage } from '../components/school/SchoolImage';
import { SchoolListSection } from '../components/school/SchoolListSection';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { NETWORK_PAGES } from '../content/networks';
import { locationService, rankingService, schoolListService, schoolService, type BestPlaceSummary, type RankingEdition, type RankingPlaces, type RankingRow, type RankingTableParams, type SchoolListSummary } from '../services/publicApi';
import type { Faq } from '../utils/schoolFaq';
import { NotFoundPage } from './InfoPages';
import type { BoardingType, SchoolType } from '../types/api';
import { boardingTypeLabel, formatDate, networkLabel, schoolTypeLabel } from '../utils/format';

export const NO_SEPARATE_RANKING = 'No separate published ranking available for this category.';

const PAGE_SIZE = 25;
const TOPS: [string, string][] = [['10', 'Top 10'], ['20', 'Top 20'], ['100', 'Top 100'], ['all', 'All']];
export const BOARDS: [string, string][] = [['CBSE', 'CBSE'], ['CISCE', 'ICSE'], ['IB', 'IB'], ['CAMBRIDGE', 'Cambridge / IGCSE'], ['STATE', 'State Boards']];
const GOVERNMENT_GROUPS: [string, string][] = [['CENTRAL', 'Central Government'], ['STATE', 'State Government'], ['KV', 'Kendriya Vidyalayas'],
  ['JNV', 'Jawahar Navodaya Vidyalayas'], ['SAINIK', 'Sainik Schools'], ['OTHER', 'Other government institutions']];
const BOARDING_GROUPS: [string, string][] = [['BOYS', 'Boys’ boarding'], ['GIRLS', 'Girls’ boarding'], ['CO_ED', 'Co-educational boarding'],
  ['DAY_CUM_BOARDING', 'Day-cum-boarding'], ['OTHER', 'Other boarding']];
const RATINGS: { value: string; label: string; tone: string }[] = [
  { value: 'GREEN', label: 'Green', tone: 'bg-emerald-100 text-emerald-900' },
  { value: 'YELLOW', label: 'Yellow', tone: 'bg-yellow-100 text-yellow-900' },
  { value: 'ORANGE', label: 'Orange', tone: 'bg-orange-100 text-orange-900' },
  { value: 'RED', label: 'Red', tone: 'bg-red-100 text-red-900' },
];
const RANKS = {
  state: { label: 'State rank', short: 'State', of: (r: RankingRow) => r.stateRank },
  city: { label: 'City rank', short: 'City', of: (r: RankingRow) => r.cityRank },
  national: { label: 'National rank', short: 'National', of: (r: RankingRow) => r.nationalRank },
};
type RankKind = keyof typeof RANKS;

const isAcademic = (e: RankingEdition) => !e.ratingBased;
const isNational = (e: RankingEdition) => isAcademic(e) && e.scope === 'NATIONAL' && !e.boardCode;
const unique = <T,>(xs: T[]) => [...new Set(xs)];

/** Year, then publisher, then the list itself. Lists are never blended: whatever is asked for, one list comes back. */
export function pickList(lists: RankingEdition[], wanted: { year?: string | null; source?: string | null; id?: number }) {
  const years = unique(lists.map((e) => e.year));
  const year = years.find((y) => y === wanted.year) ?? years[0];
  const inYear = lists.filter((e) => e.year === year);
  const sources = unique(inYear.map((e) => e.publisherCode));
  const source = sources.find((s) => s === wanted.source) ?? sources[0];
  const matching = inYear.filter((e) => e.publisherCode === source);
  return { years, year, sources, source, matching, list: matching.find((e) => e.id === wanted.id) ?? matching[0] };
}
type Pick = ReturnType<typeof pickList>;

/** "#4" or an en dash: a rank the publisher did not print is never filled in. */
export const rankText = (rank: number | null) => (rank === null ? '–' : `#${rank}`);

/** The rank columns a table needs: only ranks the publisher printed for these schools, so an empty column never shows. */
export function shownRanks(rows: RankingRow[], wanted: RankKind[]): RankKind[] {
  const used = wanted.filter((k) => rows.some((r) => RANKS[k].of(r) !== null));
  return used.length > 0 ? used : wanted.slice(-1);
}

/** Boards with something to show, and those with nothing, which are named once and never given an empty ranking. */
export function boardTabs(lists: RankingEdition[], groups: { code: string }[]) {
  const has = ([code]: [string, string]) => lists.some((e) => e.boardCode === code) || groups.some((g) => g.code === code);
  return { available: BOARDS.filter(has), missing: BOARDS.filter((b) => !has(b)).map(([, name]) => name) };
}

const boardName = (code: string | null) => (code ? BOARDS.find(([c]) => c === code)?.[1] ?? code : '–');
const hasScores = (rows: RankingRow[], list: RankingEdition) => list.hasScores || rows.some((r) => r.scoreText);
const scoreText = (r: RankingRow) => (r.score !== null ? `${r.score}${r.maxScore !== null ? ` / ${r.maxScore}` : ''}` : r.scoreText ?? '–');
const joinNames = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`);

function useFilters() {
  const [sp, setSp] = useSearchParams();
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    ['page', 'gpage'].forEach((k) => { if (!(k in patch)) next.delete(k); });
    setSp(next, { replace: true });
  };
  return { sp, set };
}
type Set = ReturnType<typeof useFilters>['set'];

function useLists(select: (e: RankingEdition) => boolean) {
  const editions = useApi(() => rankingService.editions(), []);
  const { sp, set } = useFilters();
  const pick = pickList((editions.data ?? []).filter(select), { year: sp.get('year'), source: sp.get('source'), id: Number(sp.get('list')) || undefined });
  return { editions, pick, sp, set };
}

function RankingShell({ title, heading, subtitle, description, crumbs = [], hero, children }: {
  title: string; heading?: string; subtitle: ReactNode; description?: string; crumbs?: { to: string; label: string }[];
  /** Shown inside the page header, under the subtitle (the search on India's Top Schools). */
  hero?: ReactNode; children: ReactNode;
}) {
  useDocumentTitle(title, description);
  return (
    <>
      <PageHeader title={heading ?? title} subtitle={subtitle}
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/rankings', label: 'Rankings' }, ...crumbs]} />}>{hero}</PageHeader>
      <RankingSubNav />
      <div className="container-page space-y-5 py-8">
        {children}
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Every rank belongs to its publisher. SchoolDhundo is not affiliated with any publisher.{' '}
          <Link to="/rankings/methodology" className="underline hover:text-brand-700">Ranking methodology</Link>
        </p>
      </div>
    </>
  );
}

/** The ranking sections, under the page header, so moving between them never needs the main menu. */
function RankingSubNav() {
  const sections = useApi(() => rankingService.sections(), []);
  return (
    <nav aria-label="Ranking sections" className="border-b border-slate-200 bg-white">
      <ul className="container-page no-scrollbar flex gap-1 overflow-x-auto">
        {availableItems(RANKING_ITEMS, sections.data).map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end className={({ isActive }) => `block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
              isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-ink'}`}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NoRankings() {
  return (
    <EmptyState title="No verified rankings to show here yet.">
      A ranking appears only after we have checked it against the publisher’s list. <Link to="/schools" className="link">Browse schools</Link>
    </EmptyState>
  );
}

function Segmented({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label={label}>
      {options.map(([v, l]) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === v ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

function Select({ label, value, onChange, options, empty, disabled }: {
  label: string; value: string; onChange: (v: string | undefined) => void; options: [string, string][]; empty?: string; disabled?: boolean;
}) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select className="input disabled:bg-slate-50 disabled:text-slate-500" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value || undefined)}>
        {empty && <option value="">{empty}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function SearchBox({ value, set }: { value: string; set: Set }) {
  return (
    <form className="flex min-w-0 items-end gap-2" role="search" onSubmit={(e) => { e.preventDefault(); set({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined }); }}>
      <label className="block min-w-0 flex-1">
        <span className="label">Search</span>
        <input id="rk-search" name="q" className="input" maxLength={100} placeholder="School name" defaultValue={value} key={value} />
      </label>
      <button type="submit" className="btn-secondary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
    </form>
  );
}

/** Year and publisher always say which list this is; with one choice they are shown but cannot be changed. */
function ListPicker({ pick, set }: { pick: Pick; set: Set }) {
  const name = (code: string) => pick.matching.find((e) => e.publisherCode === code)?.publisher ?? code;
  return (
    <>
      <Select label="Ranking year" value={pick.year ?? ''} disabled={pick.years.length < 2} onChange={(v) => set({ year: v, list: undefined })} options={pick.years.map((y) => [y, y])} />
      <Select label="Publisher" value={pick.source ?? ''} disabled={pick.sources.length < 2} onChange={(v) => set({ source: v, list: undefined })} options={pick.sources.map((s) => [s, name(s)])} />
      {pick.matching.length > 1 && (
        <Select label="List" value={String(pick.list?.id)} onChange={(v) => set({ list: v })} options={pick.matching.map((e) => [String(e.id), e.category ?? e.name])} />
      )}
    </>
  );
}

function FilterCard({ children }: { children: ReactNode }) {
  return <section className="card space-y-4 p-4" aria-label="Choose what to show">{children}</section>;
}
const FILTER_GRID = 'grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4';

const listFor = (lists: SchoolListSummary[] | null, kind: SchoolListSummary['kind'], code?: string | null) =>
  lists?.find((l) => l.kind === kind && (code === undefined || l.code === code));

/** One published list as a table, with its loading, empty and paged states. */
function RankedSchools({ list, filters, ranks, pageKey = 'page', summary, showCaption = true, limit }: {
  list: RankingEdition; filters: Omit<RankingTableParams, 'edition' | 'page' | 'size'>; ranks: RankKind[]; pageKey?: string;
  summary?: (total: number) => string; showCaption?: boolean;
  /** Only the first rows in the publisher's order for this place (a place's Top 10, 20, 50 or 100), on one page. */
  limit?: number;
}) {
  const { sp, set } = useFilters();
  const page = limit ? 0 : Math.max(0, Number(sp.get(pageKey)) || 0);
  const table = useApi(() => rankingService.table({ edition: list.id, ...filters, page, size: limit ?? PAGE_SIZE }), [list.id, JSON.stringify(filters), page, limit]);
  const school = (n: number) => `${n.toLocaleString('en-IN')} ${n === 1 ? 'school' : 'schools'}`;
  return (
    <AsyncContent state={table} isEmpty={(d) => d.content.length === 0} empty={(
      <EmptyState title={filters.q ? `No school called “${filters.q}” in this list.` : 'No school in this list matches.'}>
        {filters.q
          ? <>Only schools the publisher listed appear here. <Link to={`/schools?q=${encodeURIComponent(filters.q)}`} className="link">Look for it in the school directory</Link></>
          : 'Only schools the publisher listed appear here, and we do not add any.'}
      </EmptyState>
    )}>
      {(data) => (
        <div className="space-y-3">
          <div aria-live="polite">
            {showCaption && <h2 className="font-display font-bold text-ink">{list.publisherCode} {list.year}<span className="font-normal text-slate-600"> · {list.category ?? list.name}</span></h2>}
            <p className="text-sm text-slate-600">{summary?.(data.totalElements) ?? school(data.totalElements)}</p>
          </div>
          <RankingTable rows={data.content} list={list} ranks={ranks} />
          {!limit && <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ [pageKey]: p > 0 ? String(p) : undefined })} />}
          {limit && data.totalElements > limit && <p className="text-sm text-slate-600">Showing the first {limit} of {data.totalElements}.</p>}
        </div>
      )}
    </AsyncContent>
  );
}

function RatingChip({ rating }: { rating: string | null }) {
  const r = RATINGS.find((x) => x.value === rating);
  return r ? <span className={`chip font-semibold ${r.tone}`}>{r.label}</span> : <span className="text-slate-500">–</span>;
}

function RankBadge({ rank }: { rank: number | null }) {
  return rank === null ? <span className="text-slate-500">–</span>
    : <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl bg-brand-50 px-2 font-display font-bold text-brand-700">#{rank}</span>;
}

/** A table on larger screens, cards on phones. Each kind of rank has its own column, so they cannot be mistaken for each other. */
function RankingTable({ rows, list, ranks }: { rows: RankingRow[]; list: RankingEdition; ranks: RankKind[] }) {
  const green = list.ratingBased;
  const kinds = shownRanks(rows, ranks);
  const scored = !green && hasScores(rows, list);
  const details = (r: RankingRow) => `/schools/${r.slug}?tab=ranking`;
  const place = (r: RankingRow) => (green ? r.district : r.city ?? r.district) ?? '–';
  const source = `${list.publisherCode} ${list.year}`;
  // School type, and boarding only where a source says so (no boarding profile is not proof of a day school).
  const kind = (r: RankingRow) => [schoolTypeLabel[r.schoolType as SchoolType] ?? r.schoolType,
    r.boardingType ? boardingTypeLabel[r.boardingType as BoardingType] ?? 'Boarding' : null].filter(Boolean).join(' · ');
  return (
    <>
      <ol className="space-y-3 md:hidden">
        {rows.map((r) => (
          <li key={r.entryId} className="card flex gap-3 p-3">
            <Link to={details(r)} className="w-24 shrink-0" tabIndex={-1} aria-hidden>
              <SchoolImage src={r.imageUrl} name={r.schoolName} credit={r.imageCredit} zoom={false} small className="rounded-lg" />
            </Link>
            <div className="min-w-0 flex-1 text-sm">
              <p className="flex flex-wrap gap-x-3 font-display font-bold text-brand-700">
                {green ? <RatingChip rating={r.rating} /> : kinds.map((k) => <span key={k}>{RANKS[k].short} {rankText(RANKS[k].of(r))}</span>)}
              </p>
              <Link to={details(r)} className="mt-0.5 block font-semibold text-ink hover:text-brand-700">{r.schoolName}</Link>
              <p className="text-xs text-slate-500">{[place(r), r.stateName].filter((x) => x !== '–').join(', ')} · {boardName(r.board)}</p>
              <p className="text-xs text-slate-500">{kind(r)} · {source}</p>
              {scored && <p className="text-xs text-slate-500">Score: {scoreText(r)}</p>}
              <p className="mt-1.5 flex flex-wrap items-center gap-3">
                <Link to={details(r)} className="link text-xs">View School Details</Link>
                <CompareButton id={r.schoolId} name={r.schoolName} slug={r.slug} />
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="card relative hidden overflow-x-auto md:block">
        <table className="w-full text-sm" aria-label={`${list.publisherCode} ${list.year}: ${list.name}`}>
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {green ? <th scope="col" className="px-4 py-3">Rating</th> : kinds.map((k) => <th key={k} scope="col" className="whitespace-nowrap px-4 py-3">{RANKS[k].label}</th>)}
              <th scope="col" className="px-4 py-3">School</th>
              <th scope="col" className="px-4 py-3">{green ? 'District' : 'City'}</th>
              <th scope="col" className="px-4 py-3">State</th>
              <th scope="col" className="px-4 py-3">Board</th>
              <th scope="col" className="px-4 py-3">Type</th>
              <th scope="col" className="px-4 py-3">Source</th>
              {scored && <th scope="col" className="px-4 py-3 text-right">Score</th>}
              <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.entryId} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                {green ? <td className="px-4 py-3"><RatingChip rating={r.rating} /></td> : kinds.map((k) => <td key={k} className="px-4 py-3"><RankBadge rank={RANKS[k].of(r)} /></td>)}
                <td className="px-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="w-20 shrink-0"><SchoolImage src={r.imageUrl} name={r.schoolName} credit={r.imageCredit} zoom={false} small className="rounded-lg" /></span>
                    <Link to={details(r)} className="font-semibold text-ink hover:text-brand-700">{r.schoolName}</Link>
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{place(r)}</td>
                <td className="px-4 py-3 text-slate-700">{r.stateName}</td>
                <td className="px-4 py-3 text-slate-700">{boardName(r.board)}</td>
                <td className="px-4 py-3 text-slate-700">{kind(r)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-500">{source}</td>
                {scored && <td className="px-4 py-3 text-right tabular-nums text-slate-700">{scoreText(r)}</td>}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link to={details(r)} className="link mr-3">View School Details</Link>
                  <CompareButton id={r.schoolId} name={r.schoolName} slug={r.slug} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SourceNote({ list: e, filtered }: { list: RankingEdition; filtered?: boolean }) {
  return (
    <p className="text-xs leading-relaxed text-slate-500">
      {e.publisher}, {e.name}, {e.year}.{e.lastVerified && ` Checked ${formatDate(e.lastVerified)}.`}{' '}
      {e.ratingBased ? 'Ratings are the publisher’s own bands, not ranks.' : 'Ranks are the publisher’s own, for schools matched to our directory, so numbers can repeat or skip.'}
      {filtered && ' Filters narrow the list and do not renumber it, so this is not a separate ranking of these schools.'}
    </p>
  );
}

/** Says plainly that these schools are a filter of a national list, not a ranking of their own. */
function FilteredListNote({ list, what }: { list: RankingEdition; what: string }) {
  return (
    <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      {list.publisherCode} did not publish a separate {what} ranking. These are {what} schools in its national list, each with its national rank.
    </p>
  );
}

const SCHOOL_TYPES: [string, string][] = [['GOVERNMENT', 'Government'], ['PRIVATE', 'Private'], ['AIDED', 'Government-aided'], ['INTERNATIONAL', 'International']];
const RESIDENCES: [string, string][] = [['BOARDING', 'Boarding'], ['DAY_CUM_BOARDING', 'Day-cum-boarding'], ['DAY', 'No boarding listed']];
const GENDERS: [string, string][] = [['BOYS', 'Boys'], ['GIRLS', 'Girls'], ['CO_ED', 'Co-educational']];
const SORTS: [string, string][] = [['NAME', 'School name'], ['STATE', 'State'], ['CITY', 'City']];

/** The search in the page header: picks the filters of the table below and scrolls to it. Only places, boards and types in the list are offered. */
function RankingHero({ places, sp, set }: { places: RankingPlaces | null; sp: URLSearchParams; set: Set }) {
  const [state, setState] = useState(sp.get('state') ?? '');
  const cities = (places?.cities ?? []).filter((c) => c.stateCode === state);
  const explore = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? '').trim() || undefined;
    set({ q: v('q'), state: v('state'), city: v('city'), board: v('board'), stype: v('stype'), top: 'all' });
    document.getElementById('ranking-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const field = 'w-full rounded-xl border-0 bg-white px-3 py-2.5 text-sm text-ink shadow-sm focus:ring-2 focus:ring-accent-300';
  return (
    <form onSubmit={explore} role="search" aria-label="Search the rankings" className="grid gap-2 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 backdrop-blur sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto]">
      <label className="min-w-0"><span className="sr-only">School name</span>
        <input name="q" className={field} placeholder="Search schools" maxLength={100} defaultValue={sp.get('q') ?? ''} /></label>
      <label className="min-w-0"><span className="sr-only">State</span>
        <select name="state" className={field} value={state} onChange={(e) => setState(e.target.value)}>
          <option value="">All states</option>
          {(places?.states ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select></label>
      <label className="min-w-0"><span className="sr-only">City</span>
        <select name="city" className={field} disabled={cities.length === 0} defaultValue={sp.get('city') ?? ''} key={state}>
          <option value="">{state ? 'All cities' : 'Choose a state first'}</option>
          {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select></label>
      <label className="min-w-0"><span className="sr-only">Board</span>
        <select name="board" className={field} defaultValue={sp.get('board') ?? ''}>
          <option value="">All boards</option>
          {(places?.boards ?? []).map((b) => <option key={b.code} value={b.code}>{boardName(b.code)}</option>)}
        </select></label>
      <label className="min-w-0"><span className="sr-only">School type</span>
        <select name="stype" className={field} defaultValue={sp.get('stype') ?? ''}>
          <option value="">All school types</option>
          {SCHOOL_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select></label>
      <button type="submit" className="btn-primary whitespace-nowrap rounded-xl bg-accent-400 px-5 text-ink hover:bg-accent-300">
        <Icon name="search" className="h-4 w-4" /> Explore rankings
      </button>
    </form>
  );
}

/**
 * Doors into each kind of ranking. The number is how many schools hold a rank in the published list shown on this page;
 * where there is none, a compiled A-to-Z list or a plain "no published ranking yet" says so instead.
 */
export function rankingCategories(places: RankingPlaces | null, lists: SchoolListSummary[] | null, source: string | null) {
  const sum = (xs: { code: string; entries: number }[] | undefined, codes?: string[]) =>
    (xs ?? []).filter((x) => !codes || codes.includes(x.code)).reduce((a, x) => a + x.entries, 0);
  const listed = (kind: SchoolListSummary['kind'], ...codes: (string | null)[]) =>
    (lists ?? []).filter((l) => l.kind === kind && (codes.length === 0 || codes.includes(l.code))).reduce((a, l) => a + l.entries, 0);
  const card = (to: string, title: string, icon: IconName, ranked: number, compiled = 0) => ({
    to, title, icon,
    note: ranked > 0 && source ? `${ranked} ${ranked === 1 ? 'school' : 'schools'} ranked in ${source}`
      : compiled > 0 ? `${compiled} listed A to Z (not ranked)` : 'No published ranking yet',
  });
  return [
    { to: '/rankings?top=100', title: 'India’s Top 100 Schools', icon: 'trophy' as IconName, note: source ? `National ranks 1 to 100, ${source}` : 'No published ranking yet' },
    card('/rankings/government-boarding?tab=boarding', 'India’s Top Boarding Schools', 'home', sum(places?.boarding), listed('BOARDING')),
    card('/rankings/government-boarding', 'India’s Top Government Schools', 'shield', sum(places?.government), listed('GOVERNMENT')),
    card('/rankings/boards?board=CBSE', 'India’s Top CBSE Schools', 'graduation', sum(places?.boards, ['CBSE']), listed('BOARD', 'CBSE')),
    card('/rankings/boards?board=CISCE', 'India’s Top ICSE Schools', 'graduation', sum(places?.boards, ['CISCE']), listed('BOARD', 'CISCE')),
    card('/rankings/boards?board=IB', 'India’s Top International Schools', 'globe', sum(places?.boards, ['IB', 'CAMBRIDGE']), listed('BOARD', 'IB', 'CAMBRIDGE')),
    card('/rankings/government-boarding?tab=boarding&group=BOYS', 'India’s Top Boys Boarding Schools', 'users', sum(places?.boarding, ['BOYS'])),
    card('/rankings/government-boarding?tab=boarding&group=GIRLS', 'India’s Top Girls Boarding Schools', 'users', sum(places?.boarding, ['GIRLS'])),
    card('/rankings/government-boarding?tab=boarding&group=CO_ED', 'India’s Top Co-educational Boarding Schools', 'users', sum(places?.boarding, ['CO_ED'])),
  ];
}

function RankingCategories({ cards }: { cards: ReturnType<typeof rankingCategories> }) {
  return (
    <section aria-labelledby="rk-cats">
      <h2 id="rk-cats" className="font-display text-xl font-bold text-ink">Ranking categories</h2>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="card group flex h-full items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-500">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{c.title}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{c.note}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** India's top schools: one page for the national table, with Top 10, 20 and 100 as tabs. */
export function TopSchoolsPage() {
  const { editions, pick, sp, set } = useLists(isNational);
  const list = pick.list;
  const top = TOPS.some(([v]) => v === sp.get('top')) ? (sp.get('top') as string) : '20';
  const maxRank = top === 'all' ? undefined : Number(top);
  const q = sp.get('q') ?? undefined;
  const green = editions.data?.find((e) => e.ratingBased);
  const schoolLists = useApi(() => schoolListService.lists(), []);
  const places = useApi(() => rankingService.places(list!.id), [list?.id], !!list);
  const compiled = listFor(schoolLists.data, 'TOP');
  const opt = (k: string) => sp.get(k) || undefined;
  const filters = { q, maxRank, state: opt('state'), city: opt('city'), board: opt('board'), schoolType: opt('stype'), residence: opt('res'), gender: opt('gender'), sort: opt('sort') };
  const narrowed = !!(filters.state || filters.city || filters.board || filters.schoolType || filters.residence || filters.gender);
  const cities = (places.data?.cities ?? []).filter((c) => c.stateCode === filters.state);
  const tie = 'Publishers can tie schools, and schools we cannot match to our directory are left out, so ranks can repeat or skip. We never fill the gaps.';
  return (
    <RankingShell title="India’s Top Schools" heading="Discover India’s Best Schools"
      subtitle="Explore school rankings across India by state, city, education board, school type and residential facilities. Every rank is the publisher’s own."
      description="India’s top schools in published rankings, with each publisher’s own rank and year. Filter by state, city, board, school type and boarding."
      hero={<RankingHero places={places.data} sp={sp} set={set} />}>
      <AsyncContent state={editions} isEmpty={() => !list && !green && !compiled} empty={<NoRankings />}>
        {() => (
          <>
            <RankingCategories cards={rankingCategories(places.data, schoolLists.data, list ? `${list.publisherCode} ${list.year}` : null)} />
            {list && (
              <div id="ranking-table" className="scroll-mt-24 space-y-5">
                <FilterCard>
                  <Segmented label="How many schools" value={top} options={TOPS} onChange={(v) => set({ top: v === '20' ? undefined : v })} />
                  <div className={FILTER_GRID}><SearchBox value={q ?? ''} set={set} /><ListPicker pick={pick} set={set} /></div>
                  <div className={FILTER_GRID}>
                    <Select label="State" value={filters.state ?? ''} empty="All states" onChange={(v) => set({ state: v, city: undefined })}
                      options={(places.data?.states ?? []).map((s) => [s.code, s.name])} />
                    <Select label="City" value={filters.city ?? ''} empty={filters.state ? 'All cities' : 'Choose a state first'} disabled={cities.length === 0}
                      onChange={(v) => set({ city: v })} options={cities.map((c) => [c.name, c.name])} />
                    <Select label="Board" value={filters.board ?? ''} empty="All boards" onChange={(v) => set({ board: v })}
                      options={(places.data?.boards ?? []).map((b) => [b.code, boardName(b.code)])} />
                    <Select label="Government / private" value={filters.schoolType ?? ''} empty="All" onChange={(v) => set({ stype: v })} options={SCHOOL_TYPES} />
                    <Select label="Boarding / day" value={filters.residence ?? ''} empty="All" onChange={(v) => set({ res: v })} options={RESIDENCES} />
                    <Select label="Boys / girls / co-ed" value={filters.gender ?? ''} empty="All" onChange={(v) => set({ gender: v })} options={GENDERS} />
                    <Select label="Sort by" value={filters.sort ?? ''} empty="Rank" onChange={(v) => set({ sort: v })} options={SORTS} />
                  </div>
                </FilterCard>
                {narrowed && (
                  <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    Filters narrow {list.publisherCode}’s national list; each school keeps its national rank. This is not a separate ranking of these schools.
                  </p>
                )}
                <RankedSchools list={list} filters={filters} ranks={['national']}
                  summary={(n) => (maxRank ? `${n} ${n === 1 ? 'school holds' : 'schools hold'} a national rank from 1 to ${maxRank}. ${tie}` : `${n} schools. ${tie}`)} />
                <SourceNote list={list} filtered={narrowed} />
              </div>
            )}
            {compiled && <SchoolListSection listKey={compiled.key} title={compiled.title} />}
            {green && <GreenSection list={green} />}
          </>
        )}
      </AsyncContent>
    </RankingShell>
  );
}

/** An optional, separate block: an environmental rating is not an academic rank, so the two never share a table. */
function GreenSection({ list }: { list: RankingEdition }) {
  const { sp, set } = useFilters();
  const open = sp.get('green') === '1';
  const places = useApi(() => rankingService.places(list.id), [list.id], open);
  const state = places.data?.states.find((s) => s.code === sp.get('gstate'));
  const rating = RATINGS.find((r) => r.value === sp.get('rating'))?.value;
  return (
    <section id="green" aria-labelledby="green-title" className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="green-title" className="font-display font-bold text-ink">Environmental ratings</h2>
          <p className="text-sm text-slate-600">{list.publisher}, {list.year}: {list.entries.toLocaleString('en-IN')} schools. An environmental audit rating, not an academic rank.</p>
        </div>
        <button type="button" className="btn-secondary" aria-expanded={open} onClick={() => set({ green: open ? undefined : '1', rating: undefined, gstate: undefined })}>
          {open ? 'Hide ratings' : 'Show ratings'}
        </button>
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <Select label="Rating" value={rating ?? ''} empty="All ratings" onChange={(v) => set({ rating: v })} options={RATINGS.map((r) => [r.value, r.label])} />
            <Select label="State" value={state?.code ?? ''} empty="All India" onChange={(v) => set({ gstate: v })} options={(places.data?.states ?? []).map((s) => [s.code, s.name])} />
          </div>
          <RankedSchools list={list} filters={{ rating, state: state?.code }} ranks={['national']} pageKey="gpage" showCaption={false} />
          <SourceNote list={list} />
        </div>
      )}
    </section>
  );
}

/** One page for places. Only places with verified entries can be chosen, so no empty state or city page exists. */
export function RankingStatesPage() {
  const { editions, pick, sp, set } = useLists(isAcademic);
  const list = pick.list;
  const places = useApi(() => rankingService.places(list!.id), [list?.id], !!list);
  const allStates = useApi(() => locationService.states(), []);
  const schoolLists = useApi(() => schoolListService.lists(), []);
  const p = places.data;
  // A place can be chosen when a published ranking or a school list covers it, and nothing else appears.
  const compiledHere = (code: string) => (schoolLists.data ?? []).filter((l) => (l.kind === 'STATE' || l.kind === 'CITY') && l.code === code);
  const choices = (allStates.data ?? []).flatMap((s) => {
    const ranked = p?.states.find((x) => x.code === s.code)?.entries ?? 0;
    const listed = compiledHere(s.code).reduce((n, l) => n + l.entries, 0);
    return ranked + listed > 0 ? [{ code: s.code, name: s.name, ranked, listed }] : [];
  });
  const state = choices.find((s) => s.code === sp.get('state'));
  const cities = (p?.cities ?? []).filter((c) => !state || c.stateCode === state.code);
  const city = state ? cities.find((c) => c.name === sp.get('city')) : undefined;
  const districts = state ? (p?.districts ?? []).filter((d) => d.stateCode === state.code) : [];
  const district = districts.find((d) => d.slug === sp.get('district'));
  const q = sp.get('q') ?? undefined;
  const name = city?.name ?? district?.name ?? state?.name;
  const here = `/rankings/states`;
  const stateLists = state ? compiledHere(state.code) : [];
  const gurugram = city?.name === 'Gurugram' || sp.get('city') === 'Gurugram';
  const chosenList = stateLists.find((l) => l.key === sp.get('slist')) ?? stateLists.find((l) => (gurugram ? l.kind === 'CITY' : l.kind === 'STATE')) ?? stateLists[0];
  const stateLink = state ? `${here}?state=${state.code}` : here;
  const shown = PLACE_TOPS.some(([v]) => v === sp.get('top')) ? Number(sp.get('top')) : undefined;
  const opt = (k: string) => sp.get(k) || undefined;
  const extra = { board: opt('board'), schoolType: opt('stype'), residence: opt('res') };
  const best = useApi(() => rankingService.bestPlaces(), []);
  const bestHere = best.data?.find((b) => b.slug === (city ? slugOf(city.name) : state ? slugOf(state.name) : ''));
  return (
    <RankingShell title={name ? `School rankings in ${name}` : 'State & City Rankings'}
      subtitle="Published rankings and school lists by place. State, city and national ranks are shown separately."
      description="Published school rankings and school lists by state, city and district."
      crumbs={[{ to: here, label: 'State & City' }, ...(state ? [{ to: stateLink, label: state.name }] : []),
        ...(city ? [{ to: `${stateLink}&city=${encodeURIComponent(city.name)}`, label: city.name }] : []),
        ...(district ? [{ to: `${stateLink}&district=${district.slug}`, label: district.name }] : [])]}>
      <AsyncContent state={editions} isEmpty={() => !list && choices.length === 0} empty={<NoRankings />}>
        {() => (
          <>
            <FilterCard>
              <div className={FILTER_GRID}>
                <Select label="State" value={state?.code ?? ''} empty="Choose a state" onChange={(v) => set({ state: v, city: undefined, district: undefined, slist: undefined })}
                  options={choices.map((s) => [s.code, s.name])} />
                <Select label="City" value={city ? `${city.stateCode}|${city.name}` : ''} empty="All cities" disabled={cities.length === 0}
                  onChange={(v) => { const [code, c] = (v ?? '').split('|'); set({ state: v ? code : state?.code, city: c || undefined, district: undefined }); }}
                  options={cities.map((c) => [`${c.stateCode}|${c.name}`, `${c.name} (${c.entries})`])} />
                {districts.length > 0 && (
                  <Select label="District" value={district?.slug ?? ''} empty="All districts" onChange={(v) => set({ district: v, city: undefined })}
                    options={districts.map((d) => [d.slug, `${d.name} (${d.entries})`])} />
                )}
                {list && <ListPicker pick={pick} set={set} />}
                {list && <SearchBox value={q ?? ''} set={set} />}
              </div>
              {list && state && (state.ranked ?? 0) > 0 && (
                <div className={FILTER_GRID}>
                  <Select label="Show" value={shown ? String(shown) : ''} empty="All, page by page" onChange={(v) => set({ top: v })} options={PLACE_TOPS} />
                  <Select label="Board" value={extra.board ?? ''} empty="All boards" onChange={(v) => set({ board: v })}
                    options={(p?.boards ?? []).map((b) => [b.code, boardName(b.code)])} />
                  <Select label="Government / private" value={extra.schoolType ?? ''} empty="All" onChange={(v) => set({ stype: v })} options={SCHOOL_TYPES} />
                  <Select label="Boarding / day" value={extra.residence ?? ''} empty="All" onChange={(v) => set({ res: v })} options={RESIDENCES} />
                </div>
              )}
            </FilterCard>
            {bestHere && bestHere.ranked + bestHere.listed >= 3 && (
              <p className="text-sm"><Link to={`/rankings/best-schools-in-${bestHere.slug}`} className="link font-semibold">Best schools in {bestHere.name}: overview and FAQ →</Link></p>
            )}
            {state || q ? (
              <>
                {list && (q || (state?.ranked ?? 0) > 0) && (
                  <>
                    <RankedSchools list={list} filters={{ state: state?.code, city: city?.name, district: district?.slug, q, ...extra }}
                      ranks={['state', 'city', 'national']} limit={shown} />
                    <SourceNote list={list} filtered={!!(state || q)} />
                  </>
                )}
                {chosenList && (
                  <>
                    {stateLists.length > 1 && (
                      <Segmented label="School list" value={chosenList.key} options={stateLists.map((l) => [l.key, l.title])} onChange={(v) => set({ slist: v, lq: undefined })} />
                    )}
                    <SchoolListSection listKey={chosenList.key} title={chosenList.title} />
                  </>
                )}
              </>
            ) : <PlacePicker states={choices} cities={p?.cities ?? []} />}
            {!state && !q && <BestPlacesIndex places={best.data ?? []} />}
          </>
        )}
      </AsyncContent>
    </RankingShell>
  );
}

const PLACE_TOPS: [string, string][] = [['10', 'Top 10'], ['20', 'Top 20'], ['50', 'Top 50'], ['100', 'Top 100']];

/** Same rule as the backend's SlugUtil for plain names: "New Delhi" → "new-delhi". */
export const slugOf = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Links to the "best schools in" pages that have enough behind them to be worth reading. */
function BestPlacesIndex({ places }: { places: BestPlaceSummary[] }) {
  const useful = places.filter((p) => p.ranked + p.listed >= 3);
  if (useful.length === 0) return null;
  return (
    <section aria-labelledby="best-in" className="space-y-3">
      <h2 id="best-in" className="section-title">Best schools by state and city</h2>
      <ul className="flex flex-wrap gap-2">
        {useful.map((p) => (
          <li key={p.slug}>
            <Link to={`/rankings/best-schools-in-${p.slug}`} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">
              Best schools in {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Best schools in {state or city}": what is ranked there in published rankings, what is named in the compiled A-to-Z
 * lists, a FAQ answered from that data, and nearby places. Every number on the page comes from the records shown.
 */
export function BestPlacePage() {
  const { page = '' } = useParams();
  const slug = page.startsWith('best-schools-in-') ? page.slice('best-schools-in-'.length) : '';
  const place = useApi(() => rankingService.bestPlace(slug), [slug], !!slug);
  const editions = useApi(() => rankingService.editions(), []);
  const lists = useApi(() => schoolListService.lists(), []);
  const p = place.data;
  const national = (editions.data ?? []).find(isNational);
  const where = p ? { state: p.stateCode, city: p.city ?? undefined } : {};
  const top = useApi(() => rankingService.table({ edition: national!.id, ...where, page: 0, size: 3 }), [national?.id, p?.slug], !!national && !!p && p.ranked > 0);
  if (!slug || place.error) return <NotFoundPage />;
  if (!p) return <Spinner label="Loading…" />;
  const year = p.rankingSource ? ` ${p.rankingSource.split(' ').pop()}` : '';
  // A city page shows its own city list where one exists, else its state's list narrowed to the city.
  const ownCity = p.kind === 'CITY' ? (lists.data ?? []).find((l) => l.kind === 'CITY' && l.title.toLowerCase().includes((p.city ?? '').toLowerCase())) : undefined;
  const placeLists = ownCity ? [{ list: ownCity, place: undefined }]
    : (lists.data ?? []).filter((l) => l.kind === 'STATE' && l.code === p.stateCode).map((l) => ({ list: l, place: p.kind === 'CITY' ? p.city ?? undefined : undefined }));
  const names = (top.data?.content ?? []).map((r) => `${r.schoolName} (${rankText(p.kind === 'CITY' ? r.cityRank ?? r.nationalRank : r.stateRank ?? r.nationalRank)})`);
  const directory = p.kind === 'CITY' ? `/states/${p.stateSlug}/city/${p.slug}` : `/states/${p.stateSlug}`;
  const faqs: Faq[] = [
    ...(names.length ? [{ question: `Which are the best schools in ${p.name}?`, answer: `In ${p.rankingSource}, the highest-placed schools in ${p.name} are ${names.join(', ')}. These are the publisher’s own ranks; the full list is below.` }] : []),
    { question: `How are schools in ${p.name} ranked here?`, answer: p.ranked > 0
      ? `SchoolDhundo does not rank schools itself on this page. It shows ranks from published rankings (${p.rankingSource}), checked against the publisher’s list, with each publisher’s own rank and year.`
      : `No published ranking that we have checked covers ${p.name} yet, so no school here has a rank. The schools shown come from SchoolDhundo’s A-to-Z lists, which are not rankings.` },
    { question: `Is there an official government ranking of schools in ${p.name}?`, answer: 'No. Government data such as UDISE+ and PGI-D describes schools and states but does not rank individual schools. Rankings shown here come from independent publishers.' },
    { question: `How many schools are listed in ${p.name}?`, answer: `SchoolDhundo’s directory has ${p.schools.toLocaleString('en-IN')} schools in ${p.name}, each linked to its official source. Most are not in any published ranking.` },
  ];
  return (
    <RankingShell title={`Best Schools in ${p.name}${year}`} heading={`Best Schools in ${p.name}${year}`}
      subtitle={p.kind === 'CITY' ? `${p.name}, ${p.stateName}. Published school rankings and school lists, with every rank as its publisher printed it.`
        : `${p.name}. Published school rankings and school lists, with every rank as its publisher printed it.`}
      description={`Best schools in ${p.name}: published rankings and school lists, with sources.`}
      crumbs={[{ to: '/rankings/states', label: 'State & City' }, { to: `/rankings/best-schools-in-${p.slug}`, label: p.name }]}>
      <section className="card grid gap-px overflow-hidden bg-slate-100 p-0 sm:grid-cols-3" aria-label="At a glance">
        {[
          [p.ranked.toLocaleString('en-IN'), p.rankingSource ? `ranked in ${p.rankingSource}` : 'ranked in published rankings'],
          [p.listed.toLocaleString('en-IN'), 'in SchoolDhundo’s A-to-Z lists (not ranks)'],
          [p.schools.toLocaleString('en-IN'), 'schools in the directory'],
        ].map(([n, label]) => (
          <div key={label} className="bg-white p-4"><p className="font-display text-2xl font-bold text-ink">{n}</p><p className="text-sm text-slate-600">{label}</p></div>
        ))}
      </section>
      <p className="text-slate-700">
        {p.ranked > 0 ? `${p.ranked} ${p.ranked === 1 ? 'school' : 'schools'} in ${p.name} ${p.ranked === 1 ? 'holds' : 'hold'} a rank in ${p.rankingSource}. ` : `No published ranking we have checked covers ${p.name} yet. `}
        {p.listed > 0 && `${p.listed} ${p.listed === 1 ? 'school is' : 'schools are'} named in SchoolDhundo’s compiled A-to-Z lists, which help you find well-known schools but are not rankings. `}
        Confirm fees, admissions and eligibility with each school before you decide.
        {p.checkedOn && ` Ranks last checked ${formatDate(p.checkedOn)}.`}
      </p>
      {national && p.ranked > 0 && (
        <>
          <RankedSchools list={national} filters={where} ranks={p.kind === 'CITY' ? ['city', 'state', 'national'] : ['state', 'national']} />
          <SourceNote list={national} filtered />
        </>
      )}
      {placeLists.map(({ list: l, place: town }) => <SchoolListSection key={l.key} listKey={l.key} place={town} title={town ? `${l.title}: ${town}` : l.title} />)}
      <section className="card p-5 text-sm text-slate-700" aria-labelledby="best-method">
        <h2 id="best-method" className="font-semibold text-ink">How this page is put together</h2>
        <p className="mt-1">Ranks come only from published rankings we have checked against the publisher’s list, and each publisher’s rank is shown as printed; we never combine them into an overall rank. A-to-Z lists are not rankings. <Link to="/rankings/methodology" className="link">Ranking methodology</Link></p>
      </section>
      <section aria-labelledby="best-faq">
        <h2 id="best-faq" className="font-display text-xl font-bold text-ink">Questions about schools in {p.name}</h2>
        <div className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
          {faqs.map((f) => (
            <details key={f.question} className="group p-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                {f.question}<Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{f.answer}</p>
            </details>
          ))}
        </div>
      </section>
      <section aria-labelledby="best-related" className="space-y-2">
        <h2 id="best-related" className="section-title">Related places</h2>
        <ul className="flex flex-wrap gap-2">
          <li><Link to={directory} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">All {p.schools.toLocaleString('en-IN')} schools in {p.name}</Link></li>
          {p.related.filter((r) => r.ranked + r.listed >= 3).map((r) => (
            <li key={r.slug}>
              <Link to={`/rankings/best-schools-in-${r.slug}`} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">Best schools in {r.name}</Link>
            </li>
          ))}
        </ul>
      </section>
    </RankingShell>
  );
}

function PlacePicker({ states, cities }: {
  states: { code: string; name: string; ranked: number; listed: number }[]; cities: { name: string; stateCode: string; entries: number }[];
}) {
  return (
    <>
      <section aria-labelledby="rank-states">
        <h2 id="rank-states" className="section-title">States</h2>
        <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {states.map((s) => (
            <li key={s.code}>
              <Link to={`/rankings/states?state=${s.code}`} className="card card-hover block p-4">
                <span className="block font-semibold text-ink">{s.name}</span>
                <span className="text-sm text-slate-500">{[s.ranked > 0 && `${s.ranked} ranked`, s.listed > 0 && `${s.listed} listed`].filter(Boolean).join(' · ')}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      {cities.length > 0 && (
        <section aria-labelledby="rank-cities">
          <h2 id="rank-cities" className="section-title">Cities</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {cities.map((c) => (
              <li key={`${c.stateCode}-${c.name}`}>
                <Link to={`/rankings/states?state=${c.stateCode}&city=${encodeURIComponent(c.name)}`} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">
                  {c.name} <span className="text-slate-500">{c.entries}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

/** One page for boards. A board appears only with data, and a filtered national list is never called a board ranking. */
export function BoardRankingsPage() {
  const { editions, pick: national, sp, set } = useLists(isNational);
  const facets = useApi(() => rankingService.places(national.list!.id), [national.list?.id], !!national.list);
  const schoolLists = useApi(() => schoolListService.lists(), []);
  const academic = (editions.data ?? []).filter(isAcademic);
  const boardLists = (schoolLists.data ?? []).filter((l) => l.kind === 'BOARD').map((l) => ({ code: l.code as string }));
  const { available, missing } = boardTabs(academic, [...(facets.data?.boards ?? []), ...boardLists]);
  const board = available.find(([c]) => c === sp.get('board'))?.[0] ?? available[0]?.[0];
  const own = academic.filter((e) => e.boardCode === board);
  const ranked = own.length > 0 || (facets.data?.boards ?? []).some((b) => b.code === board);
  const compiled = listFor(schoolLists.data, 'BOARD', board);
  const pick = own.length > 0 ? pickList(own, { year: sp.get('year'), source: sp.get('source'), id: Number(sp.get('list')) || undefined }) : national;
  const list = pick.list;
  const q = sp.get('q') ?? undefined;
  const loaded = editions.data && schoolLists.data && (facets.data || !national.list);
  return (
    <RankingShell title={board && sp.get('board') ? `${boardName(board)} school rankings` : 'Board-wise Rankings'} heading="Board-wise Rankings"
      subtitle="Schools by board. Where a publisher ranked a school, you will see its rank; we do not create board ranks."
      description="Schools in published rankings by board, with each publisher’s own rank."
      crumbs={[{ to: '/rankings/boards', label: 'Board-wise' }]}>
      {!loaded ? <Spinner label="Loading rankings…" /> : !board ? (
        <EmptyState title={NO_SEPARATE_RANKING}><Link to="/rankings" className="link">See India’s top schools</Link></EmptyState>
      ) : (
        <>
          <FilterCard>
            <Segmented label="Board" value={board} options={available} onChange={(v) => set({ board: v, year: undefined, source: undefined, list: undefined, lq: undefined })} />
            {ranked && list && <div className={FILTER_GRID}><SearchBox value={q ?? ''} set={set} /><ListPicker pick={pick} set={set} /></div>}
          </FilterCard>
          {ranked && list ? (
            <>
              {own.length === 0 && <FilteredListNote list={list} what={boardName(board)} />}
              <RankedSchools list={list} filters={{ board: own.length === 0 ? board : undefined, q }} ranks={['national']} />
              <SourceNote list={list} filtered={own.length === 0} />
            </>
          ) : <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{NO_SEPARATE_RANKING}</p>}
          {compiled && <SchoolListSection listKey={compiled.key} title={compiled.title} />}
          {missing.length > 0 && <p className="text-sm text-slate-600">No verified ranking data for {joinNames(missing)} yet, so they are not shown.</p>}
        </>
      )}
    </RankingShell>
  );
}

/** One page with two separate tabs. Neither has a rank of its own unless a publisher made one. */
export function GovernmentBoardingPage() {
  const { editions, pick, sp, set } = useLists(isNational);
  const facets = useApi(() => rankingService.places(pick.list!.id), [pick.list?.id], !!pick.list);
  const schoolLists = useApi(() => schoolListService.lists(), []);
  const own = (family: string) => (editions.data ?? []).filter((e) => isAcademic(e) && e.family === family);
  const governmentList = listFor(schoolLists.data, 'GOVERNMENT');
  const boardingList = listFor(schoolLists.data, 'BOARDING');
  const has = (family: string, groups?: unknown[], compiled?: SchoolListSummary) => own(family).length > 0 || (groups?.length ?? 0) > 0 || !!compiled;
  const tabs = [
    ...(has('GOVERNMENT', facets.data?.government, governmentList) ? [{ id: 'government', label: 'Government Schools', content: <GroupTab kind="government" lists={own('GOVERNMENT')} national={pick} compiled={governmentList} /> }] : []),
    ...(has('BOARDING', facets.data?.boarding, boardingList) ? [{ id: 'boarding', label: 'Boarding Schools', content: <GroupTab kind="boarding" lists={own('BOARDING')} national={pick} compiled={boardingList} /> }] : []),
  ];
  const loaded = editions.data && schoolLists.data && (facets.data || !pick.list);
  const active = tabs.find((t) => t.id === sp.get('tab')) ?? tabs[0];
  return (
    <RankingShell title={active?.label === 'Boarding Schools' ? 'Boarding school rankings' : active ? 'Government school rankings' : 'Government & Boarding Schools'} heading="Government & Boarding Schools"
      subtitle="Government and boarding schools, with the rank a publisher gave them wherever one exists."
      description="Government and boarding schools in published rankings, with each publisher’s own rank."
      crumbs={[{ to: '/rankings/government-boarding', label: 'Government & Boarding' }]}>
      {!loaded ? <Spinner label="Loading rankings…" /> : tabs.length === 0 ? <NoRankings /> : (
        <Tabs tabs={tabs} active={active.id} label="School group" onChange={(id) => set({ tab: id, group: undefined, q: undefined })} />
      )}
      <GovernmentNetworks />
    </RankingShell>
  );
}

/**
 * The government school networks, each kept separate: residential networks first, then Kendriya Vidyalayas, labelled as
 * day schools. Counts are schools in the directory, not ranks; each card links to the network's own official site.
 */
function GovernmentNetworks() {
  const entries = Object.entries(NETWORK_PAGES);
  const counts = useApi(() => Promise.all(entries.map(([, c]) => schoolService.search({ network: c.network, size: 1 }).then((r) => r.totalElements))), []);
  return (
    <section aria-labelledby="gov-networks" className="space-y-3">
      <h2 id="gov-networks" className="font-display text-xl font-bold text-ink">Government and residential school networks</h2>
      <p className="text-sm text-slate-600">Directories of each network, not rankings. Admission rules, fees and dates come from each network’s official notices.</p>
      <ul className="grid gap-3 md:grid-cols-2">
        {entries.map(([slug, c], i) => (
          <li key={slug} className="card flex flex-col gap-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-ink">{networkLabel[c.network]}s</h3>
              <span className={`chip ${c.residential ? 'bg-emerald-50 text-emerald-800' : 'bg-sky-50 text-sky-800'}`}>{c.residential ? 'Residential' : 'Day schools'}</span>
              {counts.data && <span className="text-xs text-slate-500">{counts.data[i].toLocaleString('en-IN')} in our directory</span>}
            </div>
            <p className="text-sm text-slate-600">{c.intro}</p>
            <p className="mt-auto flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <Link to={`/network/${slug}`} className="link font-semibold">Browse {networkLabel[c.network]}s</Link>
              <a href={c.officialUrl} target="_blank" rel="noopener noreferrer" className="link">{c.officialName} ↗</a>
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function GroupTab({ kind, lists, national, compiled }: { kind: 'government' | 'boarding'; lists: RankingEdition[]; national: Pick; compiled?: SchoolListSummary }) {
  const { sp, set } = useFilters();
  const government = kind === 'government';
  const picked = lists.length > 0 ? pickList(lists, { year: sp.get('year'), source: sp.get('source'), id: Number(sp.get('list')) || undefined }) : national;
  const list = picked.list;
  const places = useApi(() => rankingService.places(list!.id), [list?.id], !!list);
  const counts = (government ? places.data?.government : places.data?.boarding) ?? [];
  const names = government ? GOVERNMENT_GROUPS : BOARDING_GROUPS;
  const groups = names.filter(([c]) => counts.some((g) => g.code === c));
  const missing = names.filter(([c]) => c !== 'OTHER' && !counts.some((g) => g.code === c)).map(([, n]) => n);
  const group = groups.find(([c]) => c === sp.get('group'))?.[0];
  const q = sp.get('q') ?? undefined;
  const filters: Omit<RankingTableParams, 'edition' | 'page' | 'size'> = government
    ? { government: group, schoolType: lists.length === 0 ? 'GOVERNMENT' : undefined, q }
    : { boarding: group ?? (lists.length === 0 ? 'ANY' : undefined), q };
  const ranked = !!list && (lists.length > 0 || counts.length > 0);
  return (
    <div className="space-y-5">
      {ranked && list && (
        <>
          <FilterCard>
            {groups.length > 0 && <Segmented label="Kind of school" value={group ?? ''} options={[['', 'All'], ...groups]} onChange={(v) => set({ group: v || undefined })} />}
            <div className={FILTER_GRID}><SearchBox value={q ?? ''} set={set} /><ListPicker pick={picked} set={set} /></div>
          </FilterCard>
          {lists.length === 0 && <FilteredListNote list={list} what={government ? 'government' : 'boarding'} />}
          <RankedSchools list={list} filters={filters} ranks={['national']} />
          {missing.length > 0 && <p className="text-sm text-slate-600">No published ranking data for {joinNames(missing)} yet.</p>}
          <SourceNote list={list} filtered={lists.length === 0} />
        </>
      )}
      {compiled && <SchoolListSection listKey={compiled.key} title={compiled.title} />}
      {government && <p className="text-sm text-slate-600">UDISE+ and PGI-D do not rank individual schools, so we use them for school facts only.</p>}
    </div>
  );
}

/** Old state and city addresses open the single places page on the same place. */
export function RankingPlaceRedirect() {
  const { slug = '' } = useParams();
  const isCity = useLocation().pathname.startsWith('/rankings/city/');
  const states = useApi(() => locationService.states(), [], !isCity);
  const cities = useApi(() => locationService.citiesAcrossIndia(), [], isCity);
  const target = isCity ? cities : states;
  if (target.loading || (!target.data && !target.error)) return <Spinner label="Loading rankings…" />;
  const state = states.data?.find((s) => s.slug === slug);
  const city = cities.data?.find((c) => c.slug === slug);
  const query = city ? `?state=${city.stateCode}&city=${encodeURIComponent(city.name)}` : state ? `?state=${state.code}` : '';
  return <Navigate to={`/rankings/states${query}`} replace />;
}
