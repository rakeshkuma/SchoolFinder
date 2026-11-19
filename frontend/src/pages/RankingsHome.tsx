import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PaidLabel } from '../components/common/Badges';
import { MoreFilters } from '../components/common/FilterSheet';
import { Icon, type IconName } from '../components/common/Icon';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  directoryService, rankingService, type DirectorySchool, type DirectorySummary, type RankingEdition, type RankingPlaces,
  type RankingRow,
} from '../services/publicApi';
import type { SchoolType } from '../types/api';
import { formatDate, schoolTypeLabel } from '../utils/format';
import { BOARDS, GreenSection, pickList } from './RankingHubPage';
import { feeEstimate, profileLink } from './RankingDirectory';

/*
 * The rankings home page (/rankings). Two things are kept visibly apart:
 *  - published rankings: each list exactly as its publisher printed it (rank, ties and gaps), named by publisher, year
 *    and list, with a link to the publisher's page. Filters narrow a list and never renumber it;
 *  - SchoolDhundo's premier school directory: a selection listed A to Z, which is not a ranking and never shows a rank
 *    except a publisher's own, with its source.
 * The rest of the ranking pages (/rankings/states, /rankings/boards, ...) are unchanged and linked from here.
 */

/** As the server's head for /rankings (SeoHeadService), so the title does not change on in-app navigation. */
const TITLE = 'Best Schools in India: Published School Rankings';
const DESCRIPTION = 'Best schools in India in published rankings: browse by publisher, state, city, board and category, with every '
  + 'rank exactly as its publisher printed it.';
const PAGE_SIZE = 25;
export const TOPS: [string, string][] = [['10', 'Top 10'], ['20', 'Top 20'], ['100', 'Top 100'], ['all', 'All']];
/** The publisher's own explanation of how it ranks, where we know the page. */
const METHODOLOGY: Record<string, string> = { IIRF: 'https://iirfranking.com/iirf-methodology' };
const BOARD_LABEL: Record<string, string> = { CBSE: 'CBSE', CISCE: 'ICSE / ISC', IB: 'IB', CAMBRIDGE: 'Cambridge', STATE: 'State board', OTHER: 'Other' };
const RESIDENCE_LABEL: Record<string, string> = { BOARDING: 'Boarding', DAY_CUM_BOARDING: 'Day-cum-boarding', DAY: 'Day school' };
const GENDER_LABEL: Record<string, string> = { BOYS: 'Boys', GIRLS: 'Girls', CO_ED: 'Co-ed' };
const SCHOOL_TYPES: [string, string][] = [['GOVERNMENT', 'Government'], ['PRIVATE', 'Private'], ['AIDED', 'Government-aided'], ['INTERNATIONAL', 'International']];
const boardName = (code: string | null) => (code ? BOARDS.find(([c]) => c === code)?.[1] ?? code : '–');
const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
const isNational = (e: RankingEdition) => !e.ratingBased && e.scope === 'NATIONAL' && !e.boardCode;

/** "IIRF 2026 — Top (10+2) Schools in India": publisher, year and the list's own name. */
export const listTitle = (e: Pick<RankingEdition, 'publisherCode' | 'year' | 'category' | 'name'>) => `${e.publisherCode} ${e.year} — ${e.category ?? e.name}`;

/** The Top N choice from the address (?top=10); Top 20 when absent, as before. */
export function topFrom(value: string | null): string {
  return TOPS.some(([v]) => v === value) ? (value as string) : '20';
}

/** Ranks shared by more than one school on the page, so a tie is said, not left to look like an error. */
export function tiedRanks(rows: Pick<RankingRow, 'nationalRank'>[]): Set<number> {
  const seen = new Map<number, number>();
  rows.forEach((r) => { if (r.nationalRank !== null) seen.set(r.nationalRank, (seen.get(r.nationalRank) ?? 0) + 1); });
  return new Set([...seen].filter(([, n]) => n > 1).map(([rank]) => rank));
}

/**
 * A Wikimedia Commons photo at a sensible width (the stored address can be the full-size original, several megabytes).
 * Commons serves thumbnails only at its standard widths (a 640px request now fails), so only those are asked for.
 * Other addresses are returned unchanged.
 */
export function sizedPhoto(url: string | null | undefined, width: 330 | 500 | 960 | 1280): string | null {
  if (!url) return null;
  const m = url.match(/^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/);
  if (!m) return url;
  const [, a, ab, file] = m;
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${file}/${width}px-${file}`;
}

const initials = (name: string) => name.replace(/^the\s+/i, '').split(/[\s,.()-]+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(of|and|for|in)$/i.test(w))
  .slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** The school's own photograph, or a quiet branded cover with its initials: never another school's picture. */
function SchoolPhoto({ src, name, place, credit, className = '', eager = false, sizes }: {
  src: string | null; name: string; place?: string | null; credit?: string | null; className?: string; eager?: boolean; sizes?: string;
}) {
  const [failed, setFailed] = useState(false);
  const small = sizedPhoto(src, 500);
  if (small && !failed) {
    return (
      <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
        <img src={small} srcSet={`${sizedPhoto(src, 500)} 500w, ${sizedPhoto(src, 960)} 960w`} sizes={sizes ?? '(min-width: 1024px) 400px, 100vw'}
          alt={`${name}${place ? `, ${place}` : ''}`} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        {credit && <span className="absolute bottom-1.5 right-1.5 max-w-[80%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white">Photo: {credit}</span>}
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-[radial-gradient(120%_90%_at_20%_0%,#1a3f8f_0%,#0f2557_55%,#0b1d45_100%)] ${className}`} aria-hidden>
      <div className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_14px)]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/5 font-display text-lg font-bold tracking-wide text-white ring-2 ring-amber-300/70">
          {initials(name)}
        </span>
        {place && <span className="max-w-[85%] truncate text-[11px] font-medium uppercase tracking-[0.14em] text-blue-100/80">{place}</span>}
      </div>
    </div>
  );
}

// --- hero -------------------------------------------------------------------------------------------------------------

function Stat({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className="min-w-0">
      <dt className="sr-only">{label}</dt>
      <dd className="font-display text-2xl font-extrabold tabular-nums text-white sm:text-[26px]">{value === undefined ? '–' : value.toLocaleString('en-IN')}</dd>
      <dd className="text-[12px] leading-snug text-blue-100/85">{label}</dd>
    </div>
  );
}

const MEDAL = ['bg-gradient-to-br from-amber-200 via-amber-300 to-amber-500 text-amber-950', 'bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400 text-slate-900',
  'bg-gradient-to-br from-orange-200 via-orange-300 to-orange-500 text-orange-950'];

function Hero({ summary, list }: { summary: DirectorySummary | null; list: RankingEdition | undefined }) {
  const navigate = useNavigate();
  const podium = useApi(() => rankingService.table({ edition: list!.id, size: 3 }), [list?.id], !!list);
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    navigate(`/rankings/top-premier-schools${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };
  return (
    <section aria-labelledby="rk-title" className="relative overflow-hidden bg-navy-950 text-white">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(70%_120%_at_85%_0%,rgba(26,111,240,0.45)_0%,transparent_60%),radial-gradient(50%_80%_at_0%_100%,rgba(255,189,74,0.14)_0%,transparent_60%)]" />
      <div aria-hidden className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="container-page relative grid grid-cols-1 gap-8 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-center lg:gap-12 lg:py-11">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="text-sm text-blue-100/80">
            <ol className="flex items-center gap-1.5">
              <li><Link to="/" className="hover:text-white">Home</Link></li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-white">Rankings</li>
            </ol>
          </nav>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">School rankings · India</p>
          <h1 id="rk-title" className="mt-2 font-display text-[32px] font-extrabold leading-[1.1] tracking-tight text-white sm:text-[40px] lg:text-[44px]">
            Discover India’s Best Schools
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-blue-100 sm:text-base">{DESCRIPTION}</p>
          <form onSubmit={search} role="search" aria-label="Search schools"
            className="mt-5 flex max-w-xl items-center gap-1.5 rounded-xl bg-white p-1.5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.6)]">
            <Icon name="search" className="ml-2 h-5 w-5 shrink-0 text-slate-400" />
            <label className="min-w-0 flex-1">
              <span className="sr-only">School name, city or state</span>
              <input name="q" maxLength={100} placeholder="School name, city or state"
                className="w-full border-0 bg-transparent px-1 py-2 text-[15px] text-ink placeholder:text-slate-400 focus:ring-0" />
            </label>
            <button type="submit" className="shrink-0 rounded-lg bg-royal-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-royal-700">Search</button>
          </form>
          <dl className="mt-6 grid max-w-2xl grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-5 sm:grid-cols-4">
            <Stat value={list?.entries} label={list ? `schools with a published rank (${list.publisherCode} ${list.year})` : 'schools with a published rank'} />
            <Stat value={summary?.schools} label="schools in the premier directory" />
            <Stat value={summary?.states} label="states in the directory" />
            <Stat value={summary?.boarding} label="boarding schools in the directory" />
          </dl>
        </div>

        {list && (
          <aside aria-labelledby="rk-podium" className="rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/15 backdrop-blur">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-amber-300">
              <Icon name="trophy" className="h-4 w-4" /> Published ranking
            </p>
            <h2 id="rk-podium" className="mt-1.5 font-display text-lg font-bold leading-snug text-white">{listTitle(list)}</h2>
            <p className="mt-1 text-xs text-blue-100/75">Highest-placed schools in our directory, with the publisher’s ranks</p>
            <ol className="mt-4 space-y-2.5">
              {(podium.data?.content ?? []).map((r) => (
                <li key={r.entryId} className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-extrabold shadow-sm ${r.nationalRank !== null && r.nationalRank <= 3 ? MEDAL[r.nationalRank - 1] : 'bg-white/10 text-white ring-1 ring-white/25'}`}>
                    {r.nationalRank}
                  </span>
                  <span className="min-w-0">
                    <Link to={`/schools/${r.slug}?tab=ranking`} className="block truncate text-sm font-semibold text-white hover:underline">{r.schoolName}</Link>
                    <span className="block truncate text-xs text-blue-100/75">{[r.city, r.stateName].filter(Boolean).join(', ')}</span>
                  </span>
                </li>
              ))}
              {!podium.data && Array.from({ length: 3 }, (_, i) => <li key={i} className="h-9 animate-pulse rounded-lg bg-white/10" />)}
            </ol>
            <a href="#national" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-amber-300 hover:text-amber-200">
              See the full ranking <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </aside>
        )}
      </div>
    </section>
  );
}

// --- the four ranking categories ---------------------------------------------------------------------------------------

const PRIMARY: { label: string; to: string; icon: IconName; note: string }[] = [
  { label: 'National Rankings', to: '#national', icon: 'trophy', note: 'All-India lists from named publishers' },
  { label: 'Boarding School Rankings', to: '/rankings/government-boarding?tab=boarding', icon: 'bed', note: 'Boys, girls, co-ed and government' },
  { label: 'State & City Rankings', to: '/rankings/states', icon: 'map', note: 'Published ranks by place' },
  { label: 'Board-wise Rankings', to: '/rankings/boards', icon: 'graduation', note: 'CBSE, ICSE, IB and more' },
];

function PrimaryNav() {
  return (
    <nav aria-label="Ranking categories" className="border-b border-slate-200 bg-white">
      <ul className="container-page grid grid-cols-2 gap-2 py-3 lg:grid-cols-4">
        {PRIMARY.map((p, i) => {
          const body = (
            <>
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${i === 0 ? 'bg-navy text-amber-300' : 'bg-royal-50 text-royal-700'}`}>
                <Icon name={p.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-bold leading-tight text-navy sm:text-sm">{p.label}</span>
                <span className="hidden truncate text-xs text-slate-500 sm:block">{p.note}</span>
              </span>
            </>
          );
          const cls = `flex h-full items-center gap-2.5 rounded-xl px-2.5 py-2 transition focus-visible:ring-2 focus-visible:ring-royal-500 sm:px-3 ${
            i === 0 ? 'bg-royal-50/70 ring-1 ring-royal-200' : 'ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300'}`;
          return (
            <li key={p.label} className="min-w-0">
              {p.to.startsWith('#') ? <a href={p.to} aria-current="page" className={cls}>{body}</a> : <Link to={p.to} className={cls}>{body}</Link>}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

// --- published ranking -------------------------------------------------------------------------------------------------

function useParams() {
  const [sp, setSp] = useSearchParams();
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  return { sp, set };
}

function RankBadge({ rank, tied }: { rank: number | null; tied: boolean }) {
  if (rank === null) return <span className="text-slate-400">–</span>;
  const tone = rank <= 3 ? MEDAL[rank - 1] : 'bg-royal-50 text-navy ring-1 ring-royal-100';
  return (
    <span className="inline-flex flex-col items-center">
      <span className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-2 font-display text-[15px] font-extrabold tabular-nums ${tone}`}>
        <span className="sr-only">Rank </span>{rank}
      </span>
      {tied && <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Tied</span>}
    </span>
  );
}

function Thumb({ row }: { row: RankingRow }) {
  return <SchoolPhoto src={row.imageUrl} name={row.schoolName} credit={null} className="h-12 w-16 shrink-0 rounded-lg" sizes="64px" />;
}

const typeOf = (r: RankingRow) => schoolTypeLabel[r.schoolType as SchoolType] ?? r.schoolType ?? '–';
const placeOf = (r: RankingRow) => r.city ?? r.district ?? '–';

function RankingTable({ rows, list }: { rows: RankingRow[]; list: RankingEdition }) {
  const ties = tiedRanks(rows);
  const details = (r: RankingRow) => `/schools/${r.slug}?tab=ranking`;
  const edition = `${list.publisherCode} ${list.year}`;
  return (
    <>
      <ol className="space-y-2.5 md:hidden" aria-label={listTitle(list)}>
        {rows.map((r) => (
          <li key={r.entryId} className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-card ring-1 ring-slate-200/80">
            <RankBadge rank={r.nationalRank} tied={r.nationalRank !== null && ties.has(r.nationalRank)} />
            <div className="min-w-0 flex-1">
              <Link to={details(r)} className="block font-display text-[15px] font-bold leading-snug text-navy hover:text-royal-700">{r.schoolName}</Link>
              <p className="mt-0.5 text-[13px] text-slate-600">{[placeOf(r), r.stateName].filter((x) => x && x !== '–').join(', ')}</p>
              <p className="mt-1.5 flex flex-wrap gap-1.5 text-[11.5px]">
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700">{boardName(r.board)}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-700">{typeOf(r)}</span>
                <span className="rounded-md bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-900">{edition}</span>
              </p>
              <Link to={details(r)} className="mt-2 inline-flex items-center gap-1 text-[13px] font-bold text-royal-700">
                View details <Icon name="arrowRight" className="h-3.5 w-3.5" /><span className="sr-only">: {r.schoolName}</span>
              </Link>
            </div>
          </li>
        ))}
      </ol>
      <div className="hidden overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/80 md:block">
        <table className="w-full table-fixed text-sm">
          <caption className="sr-only">{listTitle(list)}: ranks exactly as the publisher printed them</caption>
          <colgroup>
            <col className="w-[84px]" /><col /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[9%]" />
            <col className="w-[11%]" /><col className="w-[10%]" /><col className="w-[118px]" />
          </colgroup>
          <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3 text-center">Rank</th>
              <th scope="col" className="px-3 py-3">School</th>
              <th scope="col" className="px-3 py-3">City</th>
              <th scope="col" className="px-3 py-3">State</th>
              <th scope="col" className="px-3 py-3">Board</th>
              <th scope="col" className="px-3 py-3">School type</th>
              <th scope="col" className="px-3 py-3">Publisher</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Details</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const top = r.nationalRank !== null && r.nationalRank <= 3;
              return (
                <tr key={r.entryId} className={`border-t border-slate-100 align-middle transition first:border-t-0 hover:bg-royal-50/40 ${top ? 'bg-amber-50/30' : 'even:bg-slate-50/40'}`}>
                  <td className="px-4 py-3 text-center"><RankBadge rank={r.nationalRank} tied={r.nationalRank !== null && ties.has(r.nationalRank)} /></td>
                  <td className="px-3 py-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <Thumb row={r} />
                      <Link to={details(r)} className="min-w-0 font-display font-bold leading-snug text-navy hover:text-royal-700">{r.schoolName}</Link>
                    </span>
                  </td>
                  <td className="truncate px-3 py-3 text-slate-700">{placeOf(r)}</td>
                  <td className="truncate px-3 py-3 text-slate-700">{r.stateName}</td>
                  <td className="px-3 py-3"><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{boardName(r.board)}</span></td>
                  <td className="truncate px-3 py-3 text-slate-700">{typeOf(r)}</td>
                  <td className="px-3 py-3 text-xs font-semibold text-slate-600">{edition}</td>
                  <td className="px-4 py-3 text-right">
                    <Link to={details(r)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[13px] font-bold text-royal-700 ring-1 ring-royal-200 transition hover:bg-royal-600 hover:text-white">
                      View details<span className="sr-only">: {r.schoolName}</span>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Picker({ label, value, onChange, options, empty }: {
  label: string; value: string; onChange: (v: string | undefined) => void; options: [string, string][]; empty?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>
      <select className="input py-2" value={value} onChange={(e) => onChange(e.target.value || undefined)}>
        {empty && <option value="">{empty}</option>}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function NationalRanking({ editions, firstPlaces }: { editions: RankingEdition[]; firstPlaces: { id: number; places: RankingPlaces | null } | null }) {
  const { sp, set } = useParams();
  const pick = pickList(editions.filter(isNational), { year: sp.get('year'), source: sp.get('source'), id: Number(sp.get('list')) || undefined });
  const list = pick.list;
  const top = topFrom(sp.get('top'));
  const maxRank = top === 'all' ? undefined : Number(top);
  const opt = (k: string) => sp.get(k) || undefined;
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const filters = { q: opt('q'), state: opt('state'), board: opt('board'), city: opt('city'), schoolType: opt('type'), maxRank };
  // The page already asked for the first list's places; another list (chosen by year or publisher) asks for its own.
  const own = !!list && list.id !== firstPlaces?.id;
  const fetched = useApi<RankingPlaces>(() => rankingService.places(list!.id), [list?.id], own);
  const places = { data: own ? fetched.data : firstPlaces?.places ?? null };
  const table = useApi(() => rankingService.table({ edition: list!.id, ...filters, page, size: PAGE_SIZE }),
    [list?.id, JSON.stringify(filters), page], !!list);
  if (!list) return null;
  const narrowed = !!(filters.q || filters.state || filters.board || filters.city || filters.schoolType);
  const more = [filters.city, filters.schoolType].filter(Boolean).length;
  const cities = (places.data?.cities ?? []).filter((c) => !filters.state || c.stateCode === filters.state);
  const source = list.publisher.replace(/\s*\(.*\)$/, '');
  const methodology = METHODOLOGY[list.publisherCode];
  const total = table.data?.totalElements;
  const count = total === undefined ? '' : maxRank
    ? `${plural(total, 'school holds', 'schools hold')} a published rank from 1 to ${maxRank}`
    : `${plural(total, 'school', 'schools')} in this list`;
  return (
    <section id="national" aria-labelledby="national-title" className="scroll-mt-24 space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal-700">National rankings · published list</p>
          <h2 id="national-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">{listTitle(list)}</h2>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-600">
            Published by {list.publisher}. Each school’s rank is exactly as the publisher printed it
            {list.lastVerified ? `, checked against its page on ${formatDate(list.lastVerified)}` : ''}.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 text-sm">
          <a href={list.sourceUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-navy ring-1 ring-slate-200 hover:ring-royal-300">
            {source}’s ranking <Icon name="external" className="h-3.5 w-3.5" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
          {methodology && (
            <a href={methodology} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 font-semibold text-navy ring-1 ring-slate-200 hover:ring-royal-300">
              How {list.publisherCode} ranks <Icon name="external" className="h-3.5 w-3.5" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </header>

      <div className="rounded-2xl bg-white p-3 shadow-card ring-1 ring-slate-200/80 sm:p-4" role="group" aria-label="Choose what to show">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex w-fit max-w-full gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="How many places">
            {TOPS.map(([v, l]) => (
              <button key={v} type="button" aria-pressed={top === v} onClick={() => set({ top: v === '20' ? undefined : v })}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold transition sm:px-3.5 ${top === v ? 'bg-navy text-white shadow-sm' : 'text-slate-600 hover:text-navy'}`}>
                {l}
              </button>
            ))}
          </div>
          <form className="flex min-w-0 flex-1 items-end gap-2" role="search" aria-label="Search this ranking"
            onSubmit={(e) => { e.preventDefault(); set({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined }); }}>
            <label className="block min-w-0 flex-1">
              <span className="mb-1 block text-xs font-semibold text-slate-600">School</span>
              <input name="q" className="input py-2" maxLength={100} placeholder="Search this ranking" defaultValue={filters.q ?? ''} key={filters.q ?? ''} />
            </label>
            <button type="submit" className="btn-secondary py-2"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
          </form>
          <div className="grid grid-cols-2 gap-2 lg:w-[360px]">
            <Picker label="State" value={filters.state ?? ''} empty="All states" onChange={(v) => set({ state: v, city: undefined })}
              options={(places.data?.states ?? []).map((s) => [s.code, s.name])} />
            <Picker label="Board" value={filters.board ?? ''} empty="All boards" onChange={(v) => set({ board: v })}
              options={(places.data?.boards ?? []).map((b) => [b.code, boardName(b.code)])} />
          </div>
          <div className="flex items-end gap-2">
            <MoreFilters activeCount={more} resultLabel={total === undefined ? undefined : plural(total, 'school', 'schools')}
              onClearAll={() => set({ city: undefined, type: undefined })}>
              <div className="space-y-4">
                <Picker label="City" value={filters.city ?? ''} empty="All cities" onChange={(v) => set({ city: v })}
                  options={cities.map((c) => [c.name, c.name])} />
                <Picker label="School type" value={filters.schoolType ?? ''} empty="All types" onChange={(v) => set({ type: v })} options={SCHOOL_TYPES} />
                {pick.years.length > 1 && <Picker label="Ranking year" value={pick.year ?? ''} onChange={(v) => set({ year: v, list: undefined })} options={pick.years.map((y) => [y, y])} />}
                {pick.sources.length > 1 && (
                  <Picker label="Publisher" value={pick.source ?? ''} onChange={(v) => set({ source: v, list: undefined })}
                    options={pick.sources.map((s) => [s, pick.matching.find((e) => e.publisherCode === s)?.publisher ?? s])} />
                )}
                {pick.matching.length > 1 && (
                  <Picker label="List" value={String(list.id)} onChange={(v) => set({ list: v })} options={pick.matching.map((e) => [String(e.id), e.category ?? e.name])} />
                )}
              </div>
            </MoreFilters>
            {narrowed && (
              <button type="button" className="whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-semibold text-royal-700 hover:bg-royal-50"
                onClick={() => set({ q: undefined, state: undefined, board: undefined, city: undefined, type: undefined })}>
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-600" aria-live="polite">{count}{count && narrowed ? ' (filtered)' : ''}</p>

      <AsyncContent state={table} isEmpty={(d) => d.content.length === 0} empty={(
        <EmptyState title={filters.q ? `No school called “${filters.q}” in this ranking.` : 'No school in this ranking matches these filters.'}>
          Only schools the publisher ranked appear here, and we never add any.{' '}
          {filters.q && <Link to={`/schools?q=${encodeURIComponent(filters.q)}`} className="link">Look for it in the school directory</Link>}
        </EmptyState>
      )}>
        {(data) => (
          <div className="space-y-4">
            <RankingTable rows={data.content} list={list} />
            <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p > 0 ? String(p) : undefined })} />
          </div>
        )}
      </AsyncContent>

      <div className="rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600 ring-1 ring-slate-200/70">
        <p>
          <strong className="text-navy">About this list.</strong> {list.publisher}, “{list.category ?? list.name}”, {list.year}.
          {' '}Ranks are the publisher’s own. Publishers can place several schools at one rank, and schools we cannot match to exactly one
          school in our directory are left out, so numbers can repeat or skip; we never fill the gaps or renumber.
          {narrowed && ' Filters narrow the list without renumbering it: a filtered national list is not a state, city or board ranking.'}
        </p>
        {list.methodology && <p className="mt-1.5">{list.methodology}</p>}
        <p className="mt-1.5">SchoolDhundo presents this list with a link to its publisher and is not affiliated with {source}. No school can pay for a rank.</p>
      </div>
    </section>
  );
}

// --- categories --------------------------------------------------------------------------------------------------------

interface Door { to: string; title: string; text: string; count: string; icon: IconName; kind: 'ranks' | 'directory' }

function DoorCard({ d }: { d: Door }) {
  return (
    <li>
      <Link to={d.to} className="group flex h-full flex-col rounded-2xl bg-white p-5 shadow-card ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lift hover:ring-royal-200 focus-visible:ring-2 focus-visible:ring-royal-500">
        <span className="flex items-start justify-between gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-navy text-amber-300"><Icon name={d.icon} className="h-5 w-5" /></span>
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${d.kind === 'ranks' ? 'bg-amber-50 text-amber-900 ring-1 ring-amber-200' : 'bg-slate-100 text-slate-600'}`}>
            {d.kind === 'ranks' ? 'Published ranks' : 'Directory · A to Z'}
          </span>
        </span>
        <span className="mt-4 font-display text-[17px] font-bold leading-snug text-navy">{d.title}</span>
        <span className="mt-1 flex-1 text-sm leading-relaxed text-slate-600">{d.text}</span>
        <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
          <span className="font-semibold text-slate-700">{d.count}</span>
          <span className="inline-flex items-center gap-1 font-bold text-royal-700">Explore <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
        </span>
      </Link>
    </li>
  );
}

/** Six doors first, the rest one click away. Counts come from the server; a door with nothing behind it is not shown. */
export function categoryDoors(summary: DirectorySummary, places: RankingPlaces | null): { first: Door[]; more: Door[] } {
  const n = (slug: string) => summary.categories.find((c) => c.slug === slug)?.schools ?? 0;
  const dir = (slug: string, title: string, text: string, icon: IconName): Door | null =>
    n(slug) > 0 ? { to: `/rankings/${slug}`, title, text, count: plural(n(slug), 'school', 'schools'), icon, kind: 'directory' } : null;
  const states = places?.states.length ?? 0;
  const boards = places?.boards.length ?? 0;
  const first = [
    dir('top-premier-schools', 'Premier Schools of India', 'Heritage boarding schools, leading day schools and international campuses, chosen by SchoolDhundo.', 'crown'),
    dir('boarding-schools', 'Boarding Schools', 'Residential and day-cum-boarding schools where students live on campus during term.', 'bed'),
    dir('boys-boarding-schools', 'Boys’ Boarding Schools', 'All-boys residential schools, many of them more than a century old.', 'users'),
    dir('girls-boarding-schools', 'Girls’ Boarding Schools', 'All-girls residential schools with their own houses, sport and pastoral care.', 'users'),
    states > 0 ? { to: '/rankings/states', title: 'State & City Rankings', text: 'Published ranks for schools in each state and city, never renumbered.', count: plural(states, 'state', 'states'), icon: 'map', kind: 'ranks' } : null,
    boards > 0 ? { to: '/rankings/boards', title: 'Board-wise Rankings', text: 'Published ranks for CBSE, ICSE and other boards’ schools.', count: plural(boards, 'board', 'boards'), icon: 'graduation', kind: 'ranks' } : null,
  ].filter((d): d is Door => !!d);
  const more = [
    dir('co-ed-boarding-schools', 'Co-educational Boarding Schools', 'Residential schools for boys and girls, in the hills and on the plains.', 'users'),
    dir('international-schools', 'International Schools', 'Schools offering the International Baccalaureate or Cambridge programmes.', 'globe'),
    dir('cbse-schools', 'CBSE Schools', 'Premier schools teaching the CBSE syllabus.', 'book'),
    dir('icse-schools', 'ICSE / ISC Schools', 'Premier schools affiliated to the CISCE (ICSE and ISC).', 'book'),
    dir('ib-schools', 'IB Schools', 'Schools offering International Baccalaureate programmes.', 'sparkle'),
    dir('cambridge-schools', 'Cambridge Schools', 'Schools offering Cambridge IGCSE and A Levels.', 'sparkle'),
    dir('alternative-schools', 'Alternative Education Schools', 'Krishnamurti Foundation schools and others built on inquiry and nature.', 'sun'),
    summary.states > 0 ? { to: '/rankings/schools-by-state', title: 'Premier Schools by State', text: 'The directory grouped by state.', count: plural(summary.states, 'state', 'states'), icon: 'map', kind: 'directory' } : null,
    summary.cities > 0 ? { to: '/rankings/schools-by-city', title: 'Premier Schools by City', text: 'From Mussoorie and Ooty to Mumbai and Bengaluru.', count: plural(summary.cities, 'city', 'cities'), icon: 'building', kind: 'directory' } : null,
    { to: '/rankings/government-boarding', title: 'Government & Boarding Rankings', text: 'Published ranks for government and boarding schools, by group.', count: 'By group', icon: 'institution', kind: 'ranks' },
  ].filter((d): d is Door => !!d);
  return { first, more };
}

function Categories({ summary, places }: { summary: DirectorySummary; places: RankingPlaces | null }) {
  const [open, setOpen] = useState(false);
  const { first, more } = categoryDoors(summary, places);
  return (
    <section aria-labelledby="cat-title" className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal-700">Browse</p>
        <h2 id="cat-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">Explore by category</h2>
        <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
          Cards marked <strong className="font-semibold text-amber-900">Published ranks</strong> show publishers’ ranks; the others are views of
          SchoolDhundo’s premier school directory, listed A to Z, which is not a ranking.
        </p>
      </header>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{first.map((d) => <DoorCard key={d.to} d={d} />)}</ul>
      {more.length > 0 && (
        <>
          {open && <ul id="more-cats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{more.map((d) => <DoorCard key={d.to} d={d} />)}</ul>}
          <div className="text-center">
            <button type="button" aria-expanded={open} aria-controls="more-cats" onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-navy ring-1 ring-slate-200 transition hover:ring-royal-300">
              {open ? 'Show fewer categories' : `Explore more categories (${more.length})`}
              <Icon name="chevronDown" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// --- premier directory -------------------------------------------------------------------------------------------------

function Chip({ children, confirmed = true }: { children: ReactNode; confirmed?: boolean }) {
  return (
    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-slate-700" title={confirmed ? undefined : 'Not yet confirmed with the school'}>
      {children}{!confirmed && <span aria-hidden className="text-slate-400">*</span>}{!confirmed && <span className="sr-only"> (not yet confirmed)</span>}
    </span>
  );
}

function PremierCard({ s, eager }: { s: DirectorySchool; eager: boolean }) {
  const link = profileLink(s);
  const where = [s.city, s.stateName].filter(Boolean).join(', ');
  const fee = feeEstimate(s);
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-slate-200/80 transition hover:shadow-lift">
      <div className="relative">
        <SchoolPhoto src={s.imageUrl} name={s.name} place={where} credit={s.imageCredit} eager={eager} className="aspect-[16/10]"
          sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {s.sponsored && <PaidLabel />}
          {s.featured && !s.sponsored && <span className="rounded-md bg-white/95 px-2 py-0.5 text-xs font-bold text-navy shadow-sm">Featured</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {s.rank && (
          <p className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-amber-100 px-1.5 font-display font-extrabold text-amber-900">#{s.rank.rank}</span>
            <span className="text-slate-600">
              {s.rank.publisher} {s.rank.year}, all India
              {s.rank.sourceUrl && <> · <a href={s.rank.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">source</a></>}
            </span>
          </p>
        )}
        <h3 className="font-display text-[17px] font-bold leading-snug text-navy">
          {link ? <Link to={link} className="hover:text-royal-700">{s.name}</Link> : s.name}
        </h3>
        <p className="mt-0.5 flex items-center gap-1 text-[13px] text-slate-600"><Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-slate-400" />{where}</p>
        <p className="mt-3 flex flex-wrap gap-1.5">
          {s.boards.filter((b) => b.code !== 'OTHER').map((b) => <Chip key={b.code} confirmed={b.confirmed}>{BOARD_LABEL[b.code]}</Chip>)}
          {s.residence && <Chip confirmed={s.residenceConfirmed}>{RESIDENCE_LABEL[s.residence]}</Chip>}
          {s.gender && <Chip confirmed={s.genderConfirmed}>{GENDER_LABEL[s.gender]}</Chip>}
          {s.classesLabel && <Chip confirmed={s.classesConfirmed}>{s.classesLabel}</Chip>}
        </p>
        {fee && (
          <p className="mt-3 text-[13px] text-slate-700">
            <span className="font-semibold text-navy">Approx. fee:</span> {fee} <span className="text-xs text-slate-500">(estimate; confirm with the school)</span>
          </p>
        )}
        <p className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[13px]">
          {link
            ? <Link to={link} className="inline-flex items-center gap-1 font-bold text-royal-700">{s.slug ? 'View School Details' : 'Find its campuses'} <Icon name="arrowRight" className="h-3.5 w-3.5" /></Link>
            : <span />}
          {s.websiteUrl && s.websiteChecked && (
            <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:text-royal-700">
              Website <Icon name="external" className="h-3.5 w-3.5" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </p>
      </div>
    </article>
  );
}

function PremierSchools({ total }: { total: number }) {
  const schools = useApi(() => directoryService.list({ category: 'top-premier-schools', size: 6, sort: 'photo' }), [], true, 'rankings.premier');
  return (
    <section aria-labelledby="premier-title" className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-royal-700">Featured & premier school directory</p>
          <h2 id="premier-title" className="mt-1 font-display text-2xl font-extrabold tracking-tight text-navy sm:text-[28px]">Explore Premier Schools</h2>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-600">
            India’s leading boarding and day schools, chosen by SchoolDhundo and listed A to Z: a directory, not a ranking. A rank is shown only
            where a publisher has one. Details marked * are not yet confirmed with the school.
          </p>
        </div>
        <Link to="/rankings/top-premier-schools" className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800">
          Browse all {total} schools <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </header>
      <AsyncContent state={schools} loading={<ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <li key={i} className="h-80 animate-pulse rounded-2xl bg-slate-100" />)}</ul>}>
        {(page) => (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {page.content.map((s, i) => <li key={s.id}><PremierCard s={s} eager={i < 3} /></li>)}
          </ul>
        )}
      </AsyncContent>
    </section>
  );
}

function Partner() {
  return (
    <section aria-labelledby="partner-title" className="flex flex-col gap-4 rounded-2xl bg-navy p-5 text-white sm:flex-row sm:items-center sm:justify-between sm:p-6">
      <div className="min-w-0">
        <h2 id="partner-title" className="font-display text-lg font-bold text-white">Partner with SchoolDhundo</h2>
        <p className="mt-1 text-sm text-blue-100">
          Sponsored visibility, verified profile corrections and advertising. Paid placements are always labelled, and no school can buy a better published rank.
        </p>
      </div>
      <Link to="/contact" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-bold text-navy hover:bg-amber-200">
        Contact us <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </section>
  );
}

/** /rankings */
export function RankingsHomePage() {
  useDocumentTitle(TITLE, DESCRIPTION);
  const editions = useApi(() => rankingService.editions(), [], true, 'rankings.editions');
  const summary = useApi(() => directoryService.summary(), [], true, 'rankings.summary');
  const national = (editions.data ?? []).filter(isNational);
  const first = national[0];
  const places = useApi<RankingPlaces>(() => rankingService.places(first!.id), [first?.id], !!first);
  const green = editions.data?.find((e) => e.ratingBased);
  return (
    <div className="bg-[linear-gradient(180deg,#f5f7fc_0%,#ffffff_40%)]">
      <Hero summary={summary.data} list={first} />
      <PrimaryNav />
      <div className="container-page space-y-14 py-10 sm:py-12">
        {editions.data && national.length === 0 && (
          <EmptyState title="No verified rankings to show yet.">A ranking appears only after we have checked it against its publisher’s list.</EmptyState>
        )}
        {national.length > 0 && <NationalRanking editions={editions.data ?? []} firstPlaces={first ? { id: first.id, places: places.data } : null} />}
        {green && <GreenSection list={green} />}
        {summary.data && summary.data.schools > 0 && <Categories summary={summary.data} places={places.data} />}
        {summary.data && summary.data.schools > 0 && <PremierSchools total={summary.data.schools} />}
        <Partner />
        <p className="border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          Every published rank belongs to its publisher, and SchoolDhundo is not affiliated with any publisher. The premier school directory is
          SchoolDhundo’s own selection, listed A to Z, and is not a ranking.{' '}
          <Link to="/rankings/methodology" className="underline hover:text-royal-700">How rankings are shown</Link>
        </p>
      </div>
    </div>
  );
}
