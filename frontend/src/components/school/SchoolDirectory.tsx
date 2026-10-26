import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { referenceService, schoolService } from '../../services/publicApi';
import type { SchoolSearchParams } from '../../types/api';
import { formatMoneyCompact } from '../../utils/format';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import { AsyncContent, EmptyState, SkeletonCards } from '../common/States';
import { FilterPanel, type FilterKey } from './FilterPanel';
import { SchoolCard, schoolPlace } from './SchoolCard';
import { SchoolMap } from './SchoolMap';

const NUMERIC: FilterKey[] = ['minAnnualFee', 'maxAnnualFee', 'minRating', 'page', 'size', 'latitude', 'longitude', 'radiusKm'];
const BOOLEAN: FilterKey[] = ['hasHostel', 'hasTransport', 'boarding'];
const PAGE_SIZES = [12, 24, 48] as const;
const SORTS = [
  { value: 'recommended', label: 'Recommended (best documented first)' },
  { value: 'name', label: 'Name (A–Z)' },
  { value: 'fee', label: 'Annual fee (lowest first)' },
  { value: 'verified', label: 'Most recently verified' },
  { value: 'rating', label: 'Parent rating' },
  { value: 'reviews', label: 'Most reviewed' },
  { value: 'city', label: 'City' },
  { value: 'locality', label: 'Locality' },
  { value: 'updated', label: 'Recently updated' },
];
const IGNORED_FOR_COUNT = new Set(['page', 'size', 'sortBy', 'sortDirection', 'view']);
type View = 'list' | 'split' | 'map';
const VIEWS: { value: View; label: string; icon: 'list' | 'columns' | 'map'; className?: string }[] = [
  { value: 'list', label: 'List', icon: 'list' },
  { value: 'split', label: 'List + map', icon: 'columns', className: 'hidden lg:flex' },
  { value: 'map', label: 'Map', icon: 'map' },
];

/** Explains the default order; the rules come from the server so the page never drifts from the code. */
function OrderExplanation() {
  const rules = useApi(() => referenceService.orderRules(), []);
  return (
    <details className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
      <summary className="cursor-pointer font-medium text-ink">
        How “Recommended” is ordered: ranked and best-documented schools first
      </summary>
      <p className="mt-2">
        Schools with a definitive evidence-based rank come first, then profiles with the most sourced, checkable facts.
        Among equally documented schools, states take turns (each state&apos;s first school by name, then each state&apos;s
        second, and so on) so no single state fills whole pages; filtered to one state, ties are simply by name. The order
        is fixed, so every page continues it without repeats. This measures how well a school is documented, not how good
        it is; fees, popularity and review counts never move a school up.
      </p>
      {rules.data && (
        <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {rules.data.map((r) => (
            <li key={r.fact} className="flex gap-2"><span className="w-8 shrink-0 text-right font-semibold tabular-nums text-ink">+{r.points}</span>{r.fact}</li>
          ))}
        </ul>
      )}
      <Link to="/rankings/methodology" className="link mt-2 inline-block">Ranking methodology →</Link>
    </details>
  );
}

export function fromQuery(params: URLSearchParams): SchoolSearchParams & { view?: string } {
  const result: Record<string, unknown> = {};
  params.forEach((v, k) => {
    if (NUMERIC.includes(k as FilterKey)) result[k] = Number(v);
    else if (BOOLEAN.includes(k as FilterKey)) result[k] = v === 'true';
    else result[k] = v;
  });
  return result as SchoolSearchParams;
}

/**
 * Reusable directory (used by All Schools, board, type and stage pages). Filters are kept in the URL,
 * so results can be bookmarked and shared; `fixed` filters are applied by the page and hidden.
 */
export function SchoolDirectory({ fixed = {} }: { fixed?: SchoolSearchParams }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const all = useMemo(() => fromQuery(searchParams), [searchParams]);
  const { view: viewParam, ...filters } = all;
  const view: View = viewParam === 'map' || viewParam === 'split' ? viewParam : 'list';
  const debounced = useDebounce(filters, 300);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = PAGE_SIZES.includes(filters.size as (typeof PAGE_SIZES)[number]) ? (filters.size as number) : PAGE_SIZES[0];
  const query: SchoolSearchParams = {
    ...debounced, ...fixed, size: view === 'map' ? 100 : pageSize, page: view === 'map' ? 0 : debounced.page,
  };
  const key = JSON.stringify(query);

  const state = useApi(() => schoolService.search(query), [key]);
  const sort = filters.sortBy ?? (filters.latitude !== undefined ? 'distance' : 'recommended');
  // Page links keep every filter; page 0 is the default and is left out of the URL.
  const hrefFor = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p === 0) next.delete('page'); else next.set('page', String(p));
    const qs = next.toString();
    return qs ? `?${qs}` : '?';
  };

  const update = (next: SchoolSearchParams & { view?: string }) => {
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '' && !(k in fixed) && !(k === 'page' && v === 0) && !(k === 'view' && v === 'list')) {
        params.set(k, String(v));
      }
    });
    setSearchParams(params, { replace: true });
  };
  const setView = (v: View) => update({ ...filters, view: v });
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // dismissed share sheet or clipboard blocked: nothing to do
    }
  };

  const activeCount = Object.entries(filters).filter(([k, v]) => !IGNORED_FOR_COUNT.has(k) && v !== undefined && v !== '').length;

  return (
    <div className="grid gap-8 lg:grid-cols-[290px_1fr]">
      <aside className={`${showFilters ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block lg:self-start`}>
        <FilterPanel value={{ ...filters, ...fixed }} onChange={(n) => update({ ...n, view })} locked={Object.keys(fixed) as FilterKey[]} />
      </aside>
      <section aria-live="polite" className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button type="button" className="btn-secondary rounded-full lg:hidden" onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <Icon name="filter" className="h-4 w-4" /> Filters{activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] text-white">{activeCount}</span>}
            </button>
            <p className="text-sm text-slate-600">
              {state.data ? (
                <><span className="font-display text-lg font-bold text-ink">{state.data.totalElements}</span> school{state.data.totalElements === 1 ? '' : 's'} found</>
              ) : ' '}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {view !== 'map' && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="hidden sm:inline">Sort by</span>
                <select className="input w-auto rounded-full py-1.5" value={sort === 'distance' ? 'recommended' : sort}
                  onChange={(e) => update({ ...filters, sortBy: e.target.value as SchoolSearchParams['sortBy'], page: 0 })}>
                  {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </label>
            )}
            {view !== 'map' && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span className="hidden sm:inline">Per page</span>
                <select className="input w-auto rounded-full py-1.5" value={pageSize} aria-label="Schools per page"
                  onChange={(e) => update({ ...filters, size: Number(e.target.value) === PAGE_SIZES[0] ? undefined : Number(e.target.value), page: 0 })}>
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            )}
            <button type="button" onClick={share} className="btn-ghost rounded-full px-3 py-1.5 text-xs" aria-live="polite">
              <Icon name="share" className="h-4 w-4" /> {copied ? 'Link copied' : 'Share search'}
            </button>
            <div className="flex rounded-full bg-white p-1 shadow-card ring-1 ring-slate-200" role="group" aria-label="View">
              {VIEWS.map((v) => (
                <button key={v.value} type="button" onClick={() => setView(v.value)} aria-pressed={view === v.value}
                  className={`${v.className ?? 'flex'} items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${view === v.value ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'}`}>
                  <Icon name={v.icon} className="h-4 w-4" /> {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <AsyncContent
          state={state}
          loading={<SkeletonCards />}
          isEmpty={(d) => d.content.length === 0}
          empty={
            <EmptyState title="No schools match these filters.">
              Try removing a filter or choosing a wider area. Fee filters only match schools that publish a complete fee
              schedule for this or last academic year, and day/boarding filters only match schools whose source states it.
              Coverage is still growing state by state — we only list schools we can link to an official source.
            </EmptyState>
          }
        >
          {(page) =>
            view === 'split' ? (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="space-y-4">
                  <div className={`grid gap-4 ${state.loading ? 'opacity-60' : ''}`}>
                    {page.content.map((s) => <SchoolCard key={s.id} school={s} />)}
                  </div>
                  <Pagination page={page.page} totalPages={page.totalPages} hrefFor={hrefFor} />
                </div>
                <div className="lg:sticky lg:top-24 lg:self-start">
                  <SchoolMap height={620} schools={page.content.map((s) => ({ ...s, subtitle: schoolPlace(s) }))} />
                  <p className="mt-2 text-xs text-slate-500">The map shows the schools on this page that have a confirmed location.</p>
                </div>
              </div>
            ) : view === 'map' ? (
              <div className="space-y-4">
                <SchoolMap
                  height={560}
                  schools={page.content.map((s) => ({
                    ...s,
                    subtitle: [schoolPlace(s), s.annualFeeFrom !== null ? `from ${formatMoneyCompact(s.annualFeeFrom)}/yr (${s.annualFeeYear})` : null]
                      .filter(Boolean).join(' · '),
                  }))}
                />
                {page.content.some((s) => s.latitude === null) && (
                  <p className="text-xs text-slate-500">
                    Not on the map (no confirmed location yet): {page.content.filter((s) => s.latitude === null).map((s) => s.name).join(', ')}.
                  </p>
                )}
              </div>
            ) : (
              <>
                {sort === 'recommended' && <OrderExplanation />}
                <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 ${state.loading ? 'opacity-60' : ''}`}>
                  {page.content.map((s) => <SchoolCard key={s.id} school={s} />)}
                </div>
                <Pagination page={page.page} totalPages={page.totalPages} hrefFor={hrefFor} />
              </>
            )
          }
        </AsyncContent>
      </section>
    </div>
  );
}
