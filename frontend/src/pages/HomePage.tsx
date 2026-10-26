import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AdmissionStatusBadge } from '../components/common/Badges';
import { Icon, type IconName } from '../components/common/Icon';
import { AsyncContent, EmptyState, SkeletonCards, Spinner } from '../components/common/States';
import { SchoolCard } from '../components/school/SchoolCard';
import { SchoolMap } from '../components/school/SchoolMap';
import { SearchAutocomplete } from '../components/school/SearchAutocomplete';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInView } from '../hooks/useInView';
import { recentSchools, useLocalList } from '../hooks/usePersonal';
import { admissionService, locationService, referenceService, schoolService } from '../services/publicApi';
import { admissionCategoryLabel, daysUntil, formatDate, formatMoneyCompact } from '../utils/format';

const POPULAR: { label: string; to: string }[] = [
  { label: 'Kendriya Vidyalaya', to: '/network/kendriya-vidyalaya' },
  { label: 'Navodaya', to: '/network/jawahar-navodaya-vidyalaya' },
  { label: 'CBSE', to: '/boards/CBSE' },
  { label: 'Boarding', to: '/schools?hasHostel=true' },
  { label: 'IB', to: '/boards/IB' },
  { label: 'Nursery', to: '/stages/nursery' },
];

const CATEGORIES: { to: string; title: string; text: string; icon: IconName }[] = [
  { to: '/boards/CBSE', title: 'CBSE schools', text: 'Central Board of Secondary Education', icon: 'book' },
  { to: '/boards/IB', title: 'IB & international', text: 'International Baccalaureate programmes', icon: 'globe' },
  { to: '/boards/CISCE', title: 'ICSE / ISC', text: 'Council for the Indian School Certificate', icon: 'graduation' },
  { to: '/network/kendriya-vidyalaya', title: 'Kendriya Vidyalayas', text: 'Central government schools run by KVS', icon: 'building' },
  { to: '/network/jawahar-navodaya-vidyalaya', title: 'Navodaya Vidyalayas', text: 'Residential schools run by NVS', icon: 'users' },
  { to: '/type/government', title: 'Government schools', text: 'Central, state and local-body schools', icon: 'shield' },
  { to: '/stages/nursery', title: 'Nursery & KG', text: 'Entry-level and pre-primary admissions', icon: 'sparkle' },
  { to: '/stages/senior-secondary', title: 'Senior secondary', text: 'Class XI–XII streams and admissions', icon: 'users' },
];

const PILLARS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'link', title: 'Every fact has a source', text: 'Fees, dates and facilities link to the official school or government page they came from.' },
  { icon: 'shield', title: 'Unknown stays unknown', text: 'If a school has not published something, we say so — we never fill gaps with guesses or zeros.' },
  { icon: 'chart', title: 'Transparent rankings', text: 'Scores cite their sources, use published weights and show how much is verified; only verified evidence earns a rank.' },
];

// The charts library (~110 KB compressed) arrives after the page's first paint, only for the fee section.
const FeeChart = lazy(() => import('../components/home/FeeChart'));

export function HomePage() {
  useDocumentTitle(undefined);
  const feeChart = useInView<HTMLDivElement>();
  const stats = useApi(() => referenceService.stats(), []);
  // A bounded sample for the hero map and fee chart: the best-documented schools, which are the ones with confirmed
  // locations and published fees. The directory itself is paginated server-side.
  const schools = useApi(() => schoolService.search({ sortBy: 'recommended', size: 100 }), []);
  const upcoming = useApi(() => admissionService.upcoming(0, 6), []);
  const featured = useApi(() => schoolService.featured(undefined, 8), []);
  const states = useApi(() => locationService.states(), []);
  const recent = useLocalList(recentSchools);
  const coveredStates = (states.data ?? []).filter((s) => s.schoolCount > 0).sort((a, b) => b.schoolCount - a.schoolCount);

  const all = schools.data?.content ?? [];
  // The hero map is only shown on wide screens; on phones it is not rendered at all, so the map library is not loaded.
  const wide = typeof window !== 'undefined' && window.matchMedia?.('(min-width: 1024px)').matches;
  const openCount = (upcoming.data?.content ?? []).filter((a) => a.status === 'OPEN').length;
  const feeData = all
    .filter((s) => s.annualFeeFrom !== null)
    .map((s) => ({
      name: s.name.replace(/ School\b/, '').replace(/^PM SHRI /, ''),
      slug: s.slug,
      fee: s.annualFeeFrom as number,
      label: `${s.annualFeeFrom === 0 ? 'Free' : formatMoneyCompact(s.annualFeeFrom)} · ${s.annualFeeYear}`,
    }))
    .sort((a, b) => a.fee - b.fee);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="bg-grid absolute inset-0" aria-hidden />
        <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <div className="absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-accent-500/15 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          {/* min-w-0: otherwise the search input's intrinsic width widens the grid column past a phone screen. */}
          <div className="animate-fade-up min-w-0">
            {openCount > 0 ? (
              <Link to="/admissions?status=OPEN" className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-accent-200 ring-1 ring-white/10 hover:bg-white/10">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                {openCount} admission {openCount === 1 ? 'cycle is' : 'cycles are'} open right now <Icon name="arrowRight" className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-accent-200 ring-1 ring-white/10">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-400" /> Fees · Admissions · Facilities · Maps
              </p>
            )}
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Find the right school anywhere in India —{' '}
              <span className="bg-gradient-to-r from-accent-300 to-accent-500 bg-clip-text text-transparent">with facts you can check.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-300">
              Discover schools, compare fees and track admission deadlines. Every number links to the official page it came
              from, and nothing is guessed.
            </p>
            <div className="mt-8">
              <SearchAutocomplete variant="hero" />
            </div>
            <Link to="/find" className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20">
              <Icon name="sparkle" className="h-4 w-4 text-accent-300" /> Not sure where to start? Find the right school for your child
              <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-400">Popular:</span>
              {POPULAR.map((p) => (
                <Link key={p.label} to={p.to} className="rounded-full bg-white/5 px-3 py-1 text-slate-200 ring-1 ring-white/10 transition hover:bg-white/15">
                  {p.label}
                </Link>
              ))}
            </div>
            {stats.data && (
              <dl className="mt-10 grid max-w-xl grid-cols-3 gap-6">
                {([
                  ['Schools listed', stats.data.activeSchools],
                  ['States & UTs', stats.data.statesCovered],
                  ['Districts covered', stats.data.districtsCovered],
                ] as const).map(([label, value]) => (
                  <div key={label} className="min-w-0 border-l border-white/15 pl-4">
                    <dd className="stat-value text-white">{value.toLocaleString('en-IN')}</dd>
                    <dt className="mt-1 text-xs font-medium text-slate-400">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {wide && <div className="relative hidden lg:block">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-500/30 to-accent-500/20 blur-2xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl bg-white p-2 shadow-lift ring-1 ring-white/20">
              <SchoolMap height={420} schools={all} />
              <div className="pointer-events-none absolute bottom-5 left-5 right-5 z-[500] flex items-center justify-between rounded-2xl bg-white/95 px-4 py-3 shadow-card backdrop-blur">
                <div>
                  <p className="text-xs font-medium text-slate-500">Best-documented schools</p>
                  <p className="font-display text-lg font-bold text-ink">{all.filter((s) => s.latitude !== null).length} shown on the map</p>
                </div>
                <Link to="/nearby" className="btn-primary pointer-events-auto rounded-full px-4 py-2 text-xs">
                  <Icon name="pin" className="h-3.5 w-3.5" /> Near me
                </Link>
              </div>
            </div>
          </div>}
        </div>
      </section>

      {/* Trust pillars */}
      <section className="container-page -mt-8 relative z-10">
        <div className="grid gap-4 rounded-3xl bg-white p-6 shadow-lift ring-1 ring-slate-200/70 sm:grid-cols-3 sm:p-8">
          {PILLARS.map((p) => (
            <div key={p.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={p.icon} className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display font-bold text-ink">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="container-page pt-12" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Icon name="clock" className="h-5 w-5 text-slate-400" /> Recently viewed
            </h2>
            <Link to="/saved" className="text-sm font-semibold text-brand-700 hover:underline">Saved &amp; history</Link>
          </div>
          <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
            {recent.map((s) => (
              <li key={s.id} className="shrink-0">
                <Link to={`/schools/${s.slug}`} className="card card-hover block w-64 p-4">
                  <span className="block truncate font-semibold text-ink">{s.name}</span>
                  <span className="block truncate text-xs text-slate-500">{s.place || 'Location not available'}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Admissions open */}
      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Admissions</p>
            <h2 className="section-title mt-2">Open and upcoming admission cycles</h2>
          </div>
          <Link to="/admissions" className="btn-secondary rounded-full">All deadlines <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6">
          {upcoming.loading && !upcoming.data && <Spinner />}
          {upcoming.data?.content.length === 0 && (
            <EmptyState title="No open or upcoming cycles are recorded right now.">
              Check the school’s website or your state education department for official schedules.
            </EmptyState>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.data?.content.map((a) => {
              const days = daysUntil(a.applicationEndDate);
              return (
                <Link key={a.id} to={`/schools/${a.schoolSlug}?tab=admissions`} className="card card-hover flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display font-bold leading-snug text-ink">{a.schoolName}</p>
                    <AdmissionStatusBadge status={a.status} overridden={a.statusOverridden} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{a.className} · {a.academicYear} · {admissionCategoryLabel[a.category]}</p>
                  <div className="mt-4 flex items-end justify-between border-t border-slate-100 pt-4">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Applications close</p>
                      <p className="font-semibold text-ink">{formatDate(a.applicationEndDate)}</p>
                    </div>
                    {days !== null && days >= 0 && (
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${days <= 14 ? 'bg-red-50 text-red-700' : 'bg-brand-50 text-brand-700'}`}>
                        {days === 0 ? 'Closes today' : `${days} days left`}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fee snapshot */}
      {feeData.length > 0 && (
        <section className="bg-white py-16">
          <div className="container-page grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <p className="eyebrow">Fees</p>
              <h2 className="section-title mt-2">What schools officially charge per year</h2>
              <p className="mt-4 leading-relaxed text-slate-600">
                The lowest complete annual fee each school publishes (tuition, monthly and annual charges), for the latest year it
                has published. Schools with incomplete fee schedules are left out rather than estimated.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/fees" className="btn-primary rounded-full"><Icon name="rupee" className="h-4 w-4" /> Fee calculator</Link>
                <Link to="/compare" className="btn-secondary rounded-full">Compare fees side by side</Link>
              </div>
            </div>
            {/* overflow-hidden: Recharts keeps its hidden tooltip positioned beside the chart, which would otherwise
                widen the page on phones. */}
            <div className="card overflow-hidden p-4 sm:p-6">
              <div ref={feeChart.ref}>
                {feeChart.inView ? (
                  <Suspense fallback={<div className="animate-pulse rounded-xl bg-slate-100" style={{ height: Math.max(220, feeData.length * 52) }} />}>
                    <FeeChart data={feeData} />
                  </Suspense>
                ) : <div className="rounded-xl bg-slate-100" style={{ height: Math.max(220, feeData.length * 52) }} />}
              </div>
              <p className="mt-2 text-xs text-slate-500">Academic year shown next to each amount. Optional transport and one-time fees excluded. Click a bar for the full schedule and source.</p>
            </div>
          </div>
        </section>
      )}

      {/* Featured: schools with a real photo cleared for use. Hidden until there are some. */}
      {(featured.data?.length ?? 0) > 0 && (
        <section className="container-page pt-16" aria-labelledby="featured-heading">
          <p className="eyebrow">Featured</p>
          <h2 id="featured-heading" className="section-title mt-2">Schools with photos</h2>
          <p className="mt-2 text-sm text-slate-600">Schools whose photos are public domain, openly licensed or used with permission. This is not a ranking.</p>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {(featured.data ?? []).map((s) => <SchoolCard key={s.id} school={s} />)}
          </div>
        </section>
      )}

      {/* Schools */}
      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Directory</p>
            <h2 className="section-title mt-2">Explore schools</h2>
          </div>
          <Link to="/schools" className="btn-secondary rounded-full">View all schools <Icon name="arrowRight" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-6">
          <AsyncContent state={schools} loading={<SkeletonCards count={6} />} isEmpty={(d) => d.content.length === 0}
            empty={<EmptyState title="No schools have been published yet." />}>
            {(page) => (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[...page.content].sort((a, b) => Number(b.annualFeeFrom !== null) - Number(a.annualFeeFrom !== null)).slice(0, 6)
                  .map((s) => <SchoolCard key={s.id} school={s} />)}
              </div>
            )}
          </AsyncContent>
        </div>
      </section>

      {/* Categories + localities */}
      <section className="container-page grid gap-10 pb-8 lg:grid-cols-[1.5fr_1fr]">
        {/* min-w-0: the truncated card text has an intrinsic width that would widen the column on phones. */}
        <div className="min-w-0">
          <p className="eyebrow">Browse</p>
          <h2 className="section-title mt-2">By board, type and stage</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {CATEGORIES.map((c) => (
              <Link key={c.to} to={c.to} className="card card-hover group flex min-w-0 items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon name={c.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-ink">{c.title}</span>
                  <span className="block truncate text-sm text-slate-500">{c.text}</span>
                </span>
                <Icon name="arrowRight" className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">States &amp; union territories</p>
          <h2 className="section-title mt-2">Where the schools are</h2>
          <div className="mt-6 flex flex-wrap gap-2">
            {coveredStates.map((s) => (
              <Link key={s.code} to={`/states/${s.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-card transition hover:border-brand-300 hover:text-brand-700">
                <Icon name="pin" className="h-3.5 w-3.5 text-slate-400" /> {s.name}
                <span className="text-xs text-slate-500">{s.schoolCount}</span>
              </Link>
            ))}
            <Link to="/states" className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-brand-700 hover:underline">
              All 36 states &amp; UTs <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </Link>
          </div>
          {coveredStates.length > 0 && coveredStates.length < 36 && (
            <p className="mt-3 text-xs text-slate-500">
              Coverage is growing. We list a school only when its details can be linked to an official source.
            </p>
          )}
          <div className="mt-8 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-lift">
            <p className="font-display text-xl font-bold text-white">Run a school?</p>
            <p className="mt-2 text-sm text-brand-100">
              Send us your official fee circular or admission notice and we will link it here with its source.
            </p>
            <Link to="/contact" className="btn-accent mt-5 rounded-full">Submit an official source</Link>
          </div>
        </div>
      </section>
    </>
  );
}
