import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, SkeletonCards } from '../components/common/States';
import { BoardingCard } from '../components/school/BoardingCard';
import { BOARDING_LANDINGS, boardingLanding, type BoardingLanding } from '../content/boardingLandings';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { boardingService, locationService, schoolService } from '../services/publicApi';
import type { BoardingStats, SchoolSearchParams } from '../types/api';

const PAGE_SIZE = 24;

/** The directory query behind a landing page: its fixed filters plus the reader's state, order and page. */
export function landingSearch(landing: BoardingLanding, sp: URLSearchParams): SchoolSearchParams {
  const page = Number(sp.get('page'));
  return {
    ...landing.params,
    boarding: true,
    state: sp.get('state') || undefined,
    sortBy: sp.get('sort') === 'fee' ? 'fee' : 'name',
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
    size: PAGE_SIZE,
  };
}

/** How many schools the page's rule covers, from the counts endpoint where it has one. */
export function landingCount(landing: BoardingLanding, stats: BoardingStats | null): number | undefined {
  if (!stats) return undefined;
  if (landing.slug === 'india') return stats.total;
  if (landing.gender) return stats.byGender[landing.gender] ?? 0;
  return undefined;
}

/** One landing page; each has its own static route because /boarding/:slug is a school profile. */
export function BoardingLandingPage({ slug }: { slug: string }) {
  const landing = boardingLanding(slug);
  return landing ? <Landing key={landing.slug} landing={landing} /> : null;
}

function Landing({ landing }: { landing: BoardingLanding }) {
  useDocumentTitle(landing.title, landing.description);
  const [sp, setSp] = useSearchParams();
  const params = landingSearch(landing, sp);
  const results = useApi(() => schoolService.search(params), [JSON.stringify(params)]);
  const stats = useApi(() => boardingService.stats(), []);
  const states = useApi(() => locationService.states(), []);
  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSp(next);
  };
  const stateName = (code: string) => states.data?.find((s) => s.code === code)?.name ?? code;
  const byState = Object.entries(stats.data?.byState ?? {}).sort((a, b) => stateName(a[0]).localeCompare(stateName(b[0])));
  const count = landingCount(landing, stats.data);

  return (
    <>
      <PageHeader eyebrow="Boarding & residential" title={landing.title} subtitle={landing.description}>
        <nav aria-label="Boarding school pages" className="flex flex-wrap gap-2">
          {BOARDING_LANDINGS.map((l) => (
            <Link key={l.slug} to={`/boarding/${l.slug}`} aria-current={l.slug === landing.slug ? 'page' : undefined}
              className={`chip px-3 py-1.5 text-sm ring-1 ${l.slug === landing.slug ? 'bg-white text-ink ring-white' : 'bg-white/10 text-slate-100 ring-white/15 hover:bg-white/20'}`}>
              {l.title.replace(/ in India$/, '')}
            </Link>
          ))}
        </nav>
      </PageHeader>

      <div className="container-page space-y-10 py-10">
        <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="card p-5 text-sm leading-relaxed text-slate-700">
            <h2 className="font-semibold text-ink">Which schools are listed</h2>
            <p className="mt-1">{landing.rule}</p>
            {count !== undefined && (
              <p className="mt-2"><strong className="text-ink">{count.toLocaleString('en-IN')}</strong> school{count === 1 ? '' : 's'} listed in all of India.</p>
            )}
            {landing.gender && stats.data && stats.data.genderNotStated > 0 && (
              <p className="mt-1 text-slate-500">{stats.data.genderNotStated.toLocaleString('en-IN')} other boarding schools do not yet say whom they admit.</p>
            )}
            {landing.dataNote && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-amber-900">{landing.dataNote}</p>}
          </div>
          <div className="card p-5 text-sm">
            <h2 className="font-semibold text-ink">Before you apply</h2>
            <ul className="mt-2 space-y-2 text-slate-700">
              {landing.checks.map((c) => (
                <li key={c} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{c}</li>
              ))}
            </ul>
            <Link to="/admissions/guide#hostel" className="link mt-3 inline-block">Hostel checklist in the admission guide →</Link>
          </div>
        </section>

        {landing.slug === 'india' && byState.length > 0 && (
          <section aria-labelledby="by-state">
            <h2 id="by-state" className="section-title">Boarding schools by state</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {byState.map(([code, n]) => (
                <li key={code}>
                  <button type="button" onClick={() => { set('state', code); document.getElementById('list')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className={`card card-hover flex w-full items-center justify-between p-3 text-left text-sm ${sp.get('state') === code ? 'ring-2 ring-brand-500' : ''}`}>
                    <span className="min-w-0 truncate">{stateName(code)}</span>
                    <span className="ml-2 font-semibold tabular-nums text-slate-600">{n}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="list" aria-labelledby="list-title" className="scroll-mt-24">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="list-title" className="section-title">
              {sp.get('state') ? `${landing.title.replace(/ in India$/, '')} in ${stateName(sp.get('state')!)}` : landing.title}
            </h2>
            <div className="flex flex-wrap gap-3 text-sm">
              <label><span className="label">State</span>
                <select className="input" value={sp.get('state') ?? ''} onChange={(e) => set('state', e.target.value || undefined)}>
                  <option value="">All of India</option>
                  {byState.map(([code]) => <option key={code} value={code}>{stateName(code)}</option>)}
                </select>
              </label>
              <label><span className="label">Order</span>
                <select className="input" value={sp.get('sort') ?? ''} onChange={(e) => set('sort', e.target.value || undefined)}>
                  <option value="">Name (A–Z)</option>
                  <option value="fee">Published fee: low to high</option>
                </select>
              </label>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600" aria-live="polite">
            {results.data ? `${results.data.totalElements.toLocaleString('en-IN')} school${results.data.totalElements === 1 ? '' : 's'}` : 'Loading…'}
            {sp.get('sort') === 'fee' && ' · schools without a published fee come last'}
          </p>
          <div className="mt-4">
            <AsyncContent state={results} loading={<SkeletonCards count={6} />} isEmpty={(d) => d.content.length === 0}
              empty={
                <EmptyState title="No school we list matches this page yet.">
                  {sp.get('state') ? <button type="button" className="link" onClick={() => set('state', undefined)}>Show all of India</button>
                    : <Link className="link" to="/boarding#directory">Search the full boarding directory</Link>}
                </EmptyState>
              }>
              {(page) => (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {page.content.map((s) => <BoardingCard key={s.id} school={s} />)}
                  </div>
                  <Pagination page={page.page} totalPages={page.totalPages} onChange={(p) => set('page', String(p + 1))} />
                </>
              )}
            </AsyncContent>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <Link to="/boarding#top-boarding" className="card card-hover p-5">
            <p className="font-semibold text-ink">Top boarding schools</p>
            <p className="mt-1 text-sm text-slate-600">Ranked only on verified evidence.</p>
          </Link>
          <Link to="/exams" className="card card-hover p-5">
            <p className="font-semibold text-ink">Entrance exam guides</p>
            <p className="mt-1 text-sm text-slate-600">JNVST, AISSEE, RMS CET, RIMC and Netarhat.</p>
          </Link>
          <Link to="/boarding#directory" className="card card-hover p-5">
            <p className="font-semibold text-ink">All filters</p>
            <p className="mt-1 text-sm text-slate-600">Board, class, entrance exam, facilities and admissions.</p>
          </Link>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          Listings describe what each school's official website, prospectus or board record states, with the source on every profile.
          They are not a ranking or an endorsement. Fees appear only when the school publishes them.
        </p>
      </div>
    </>
  );
}
