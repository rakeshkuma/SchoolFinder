import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdmissionStatusBadge } from '../components/common/Badges';
import { Icon, type IconName } from '../components/common/Icon';
import { AsyncContent, EmptyState, SkeletonCards, Spinner } from '../components/common/States';
import { SchoolCard } from '../components/school/SchoolCard';
import { SchoolImage } from '../components/school/SchoolImage';
import { SchoolSearchForm, type HeroSearch } from '../components/school/SchoolsHero';
import { DISCLAIMER, INFORMATION_KINDS } from '../content/site';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInView } from '../hooks/useInView';
import { recentSchools, useLocalList } from '../hooks/usePersonal';
import {
  admissionService, locationService, practiceService, rankingService, referenceService, schoolService,
} from '../services/publicApi';
import type { SchoolSummary } from '../types/api';
import { admissionCategoryLabel, daysUntil, formatDate, formatMoneyCompact } from '../utils/format';

/** What a visitor can do here, each opening the page that does it. */
const SERVICES: { to: string; title: string; icon: IconName }[] = [
  { to: '/schools', title: 'Discover schools', icon: 'search' },
  { to: '/compare', title: 'Compare schools', icon: 'scale' },
  { to: '/rankings', title: 'Explore rankings', icon: 'trophy' },
  { to: '/boarding', title: 'Boarding schools', icon: 'home' },
  { to: '/admissions/guide', title: 'Admissions and fees', icon: 'calendar' },
  { to: '/exams', title: 'Entrance exams', icon: 'graduation' },
  { to: '/exams/practice', title: 'Mock tests and daily quiz', icon: 'target' },
  { to: '/exams/practice/progress', title: 'Progress and challenges', icon: 'chart' },
];

const CATEGORIES: { to: string; title: string }[] = [
  { to: '/boards/CBSE', title: 'CBSE' },
  { to: '/boards/CISCE', title: 'ICSE' },
  { to: '/type/private-aided/international', title: 'International' },
  { to: '/type/government', title: 'Government' },
  { to: '/type/private-aided/private', title: 'Private' },
  { to: '/boarding', title: 'Boarding' },
];

/** States shown first on the home page; every other state and UT is one click away. */
const HOME_STATES = ['BR', 'JH', 'UP', 'DL', 'MH', 'KA', 'RJ', 'WB', 'HR', 'TN'];
const HOME_CITIES: [string, string][] = [
  ['Buxar', 'BR'], ['Patna', 'BR'], ['Ara', 'BR'], ['Sasaram', 'BR'], ['Ranchi', 'JH'], ['Prayagraj', 'UP'], ['Noida', 'UP'], ['Delhi', 'DL'], ['Lucknow', 'UP'],
];

interface PrepLink { to?: string; label: string; note?: string }

/** Every link opens an existing page. An item with no page yet says so rather than pointing somewhere misleading. */
const PREP_GROUPS: { title: string; icon: IconName; links: PrepLink[] }[] = [
  {
    title: 'Entrance exam preparation', icon: 'graduation', links: [
      { to: '/exams/netarhat', label: 'Netarhat Awasiya Vidyalaya – Class VI' },
      { to: '/exams/jnvst', label: 'JNVST – Jawahar Navodaya Vidyalaya entrance' },
      { to: '/exams/aissee', label: 'AISSEE – Sainik School entrance' },
      { to: '/exams', label: 'Other entrance examinations' },
    ],
  },
  {
    title: 'School exam preparation', icon: 'book', links: [
      { to: '/exams/practice/class10-maths-1', label: 'Class 10 Mathematics' },
      { label: 'Class 10 English', note: 'Not available yet' },
      { label: 'Class 10 Hindi', note: 'Not available yet' },
      { to: '/exams/practice/class12-maths-1', label: 'Class 12 Mathematics' },
      { to: '/exams/practice/class12-physics-1', label: 'Class 12 Physics' },
      { to: '/exams/practice?category=OLYMPIAD', label: 'Olympiad preparation' },
    ],
  },
  {
    title: 'Government and competitive exams', icon: 'layers', links: [
      { to: '/exams/practice?category=COMPETITIVE', label: 'Competitive exam practice' },
      { to: '/exams/practice/competitive-aptitude-1', label: 'Aptitude practice set' },
    ],
  },
  {
    title: 'Practice and learning', icon: 'target', links: [
      { to: '/exams/practice', label: 'Mock tests' },
      { to: '/exams/practice/session?mode=QUICK', label: 'Practice questions' },
      { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily quiz – 10 new questions every day' },
      { to: '/exams/resources?type=QUESTION_PAPER', label: 'Previous year papers' },
      { to: '/exams/practice/progress', label: 'My progress' },
    ],
  },
  {
    title: 'Student leaderboard and challenges', icon: 'trophy', links: [
      { to: '/exams/leaderboard', label: 'All India leaderboard' },
      { to: '/exams/leaderboard', label: 'State-wise leaderboard' },
      { to: '/exams/leaderboard?exam=jnvst', label: 'Exam-wise leaderboard' },
      { to: '/exams/challenges', label: 'Daily and weekly challenges' },
      { to: '/exams/achievements', label: 'Student achievements' },
    ],
  },
];

const STEPS: { title: string; text: string; icon: IconName }[] = [
  { title: 'Discover schools', text: 'Search by name or place, or browse by state, city and board.', icon: 'search' },
  { title: 'Compare', text: 'Set facilities, fees and locations side by side.', icon: 'scale' },
  { title: 'Check rankings and admissions', text: 'See who published each ranking, and open and upcoming admissions.', icon: 'calendar' },
  { title: 'Prepare for entrance exams', text: 'Read the exam guide, pattern and official papers.', icon: 'graduation' },
  { title: 'Practise and track progress', text: 'Take tests and the daily quiz, and see what to work on next.', icon: 'chart' },
];

// The charts library (~110 KB compressed) arrives after the page's first paint, only for the fee section.
const FeeChart = lazy(() => import('../components/home/FeeChart'));

export function HomePage() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const feeChart = useInView<HTMLDivElement>();
  const stats = useApi(() => referenceService.stats(), []);
  // A bounded sample for the fee chart: the best-documented schools, which are the ones with published fees.
  // Only schools with a published fee feed the fee chart (6 of 19,000+ today), so ask for just those.
  const schools = useApi(() => schoolService.search({ sortBy: 'recommended', hasFee: true, size: 100 }), []);
  const upcoming = useApi(() => admissionService.upcoming(0, 6), []);
  const featured = useApi(() => schoolService.featured(undefined, 8), []);
  const boarding = useApi(() => schoolService.search({ boarding: true, sortBy: 'recommended', size: 3 }), []);
  const ranked = useApi(() => rankingService.top(5), []);
  const published = useApi(() => rankingService.external({ publisher: 'IIRF', size: 5 }), []);
  const bank = useApi(() => practiceService.bank(), []);
  const states = useApi(() => locationService.states(), []);
  const cities = useApi(() => locationService.citiesAcrossIndia(), []);
  const recent = useLocalList(recentSchools);

  const onSearch = (s: HeroSearch) => {
    const p = new URLSearchParams();
    if (s.q) p.set('q', s.q);
    navigate(`/schools${p.size ? `?${p}` : ''}#directory`);
  };
  const photos = (featured.data ?? []).filter((s) => s.coverImageUrl).slice(0, 4);
  const homeStates = HOME_STATES.map((c) => states.data?.find((s) => s.code === c)).filter((s): s is NonNullable<typeof s> => !!s);
  const homeCities = HOME_CITIES.map(([name, state]) => cities.data?.find((c) => c.name === name && c.stateCode === state))
    .filter((c): c is NonNullable<typeof c> => !!c && c.schoolCount > 0);
  const otherStates = (states.data ?? []).filter((s) => !HOME_STATES.includes(s.code) && s.schoolCount > 0).length;
  const list = published.data?.content ?? [];
  const source = list[0]?.entry;
  const feeData = (schools.data?.content ?? [])
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
      <section className="border-b border-slate-200 bg-white">
        <div className="container-page grid grid-cols-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_1fr] lg:py-16">
          <div className="animate-fade-up min-w-0">
            <h1 className="font-display text-4xl font-extrabold leading-tight tracking-tight text-ink sm:text-5xl">
              Find the Right School. Build a Brighter Future.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
              Discover, compare and explore thousands of schools across India. Get school rankings, admission information, boarding
              school details and exam preparation resources in one place.
            </p>
            <div className="mt-6"><SchoolSearchForm onSearch={onSearch} withBoard={false} submitLabel="Search" idPrefix="home" single /></div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link to="/schools" className="btn-primary">Explore Schools</Link>
              <Link to="/rankings" className="btn-secondary">Explore Rankings</Link>
              <Link to="/exams" className="btn-secondary">Exam Preparation</Link>
            </div>
            {stats.data && (
              <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-3">
                {([['Schools listed', stats.data.activeSchools], ['States and UTs', stats.data.statesCovered], ['Districts', stats.data.districtsCovered]] as const).map(([label, value]) => (
                  <div key={label}>
                    <dd className="font-display text-2xl font-bold tabular-nums text-ink">{value.toLocaleString('en-IN')}</dd>
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {photos.length >= 2 && <HeroPhotos schools={photos} />}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="container-page pt-10" aria-labelledby="recent-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <Icon name="clock" className="h-5 w-5 text-slate-500" /> Recently viewed
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

      <nav className="container-page pt-10" aria-label="What you can do here">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 lg:grid-cols-4">
          {SERVICES.map((s) => (
            <li key={s.to}>
              <Link to={s.to} className="group flex items-center gap-3 rounded-xl px-2 py-2.5 font-semibold text-ink hover:bg-white">
                <Icon name={s.icon} className="h-5 w-5 shrink-0 text-brand-600" />
                <span className="min-w-0 text-sm">{s.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <Section eyebrow="Schools" title="Discover Schools Across India" id="states"
        action={<Link to="/states" className="btn-secondary">All states and UTs <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {homeStates.map((s) => (
            <li key={s.code}>
              <Link to={`/states/${s.slug}`} className="card card-hover block p-4">
                <span className="block truncate font-display font-bold text-ink">{s.name}</span>
                <span className="block text-sm text-slate-500">{s.schoolCount.toLocaleString('en-IN')} schools</span>
              </Link>
            </li>
          ))}
        </ul>
        {homeCities.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700">Popular cities</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {homeCities.map((c) => (
                <li key={c.slug}>
                  <Link to={`/states/${c.stateSlug}/city/${c.slug}`} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">
                    {c.name} <span className="text-slate-500">{c.schoolCount.toLocaleString('en-IN')}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
          <span>By type:</span>
          {CATEGORIES.map((c) => <Link key={c.to} to={c.to} className="link">{c.title}</Link>)}
          {otherStates > 0 && <span>· {otherStates} more states and UTs: <Link to="/states" className="link">see all</Link> or <Link to="/cities" className="link">browse by city</Link></span>}
        </div>
      </Section>

      <Band>
        <SectionHead eyebrow="Featured" title="Featured schools" id="featured"
          note="Schools with photographs that are public domain, openly licensed or used with permission. This is not a ranking."
          action={<Link to="/schools" className="btn-secondary">View all schools <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
        <div className="mt-6">
          <AsyncContent state={featured} loading={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0}
            empty={<EmptyState title="No featured schools yet." />}>
            {(rows) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{rows.slice(0, 4).map((s) => <SchoolCard key={s.id} school={s} />)}</div>}
          </AsyncContent>
        </div>
      </Band>

      <Section eyebrow="Rankings" title="Explore India's Top-Ranked Schools" id="rankings"
        action={<Link to="/rankings" className="btn-primary">Explore All Rankings <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_1fr]">
          <section className="card p-5" aria-labelledby="published-ranking-heading">
            {source ? (
              <>
                <p className="eyebrow">{source.rankingYear} · Published by {source.publisherCode}</p>
                <h3 id="published-ranking-heading" className="mt-1 font-display text-lg font-bold text-ink">{source.rankingName}</h3>
                <ol className="mt-3 divide-y divide-slate-100">
                  {list.map((r) => (
                    <li key={r.entry.id}>
                      <Link to={r.schoolSlug ? `/schools/${r.schoolSlug}?tab=ranking` : '/rankings'} className="flex items-center gap-3 py-2.5 hover:text-brand-700">
                        <span className="w-8 shrink-0 text-center font-display font-bold tabular-nums text-brand-700">{r.entry.rankPosition}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{r.schoolName}</span>
                          <span className="block truncate text-xs text-slate-500">{r.city}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-slate-500">
                  Rank numbers are {source.publisherCode}&apos;s own, for schools matched to our directory. This is a third-party ranking, not
                  SchoolDhundo&apos;s. <Link to="/rankings/methodology#sources" className="link">Source and method</Link>
                  {' · '}<Link to="/rankings" className="link">Full table</Link>
                </p>
              </>
            ) : <p id="published-ranking-heading" className="text-sm text-slate-600">No published ranking has been verified yet.</p>}
          </section>
          <section className="card flex flex-col p-5" aria-labelledby="own-ranking-heading">
            <h3 id="own-ranking-heading" className="font-display text-lg font-bold text-ink">SchoolDhundo score</h3>
            <p className="mt-1 text-sm text-slate-600">
              Our own score from source-linked evidence, kept apart from published rankings. Only verified evidence earns a rank, and it is
              not an official government ranking.
            </p>
            <AsyncContent state={ranked} isEmpty={(d) => d.length === 0}
              empty={<p className="mt-3 text-sm text-slate-600">No school has enough verified evidence for a rank yet.</p>}>
              {(rows) => (
                <ol className="mt-3 divide-y divide-slate-100">
                  {rows.map((r, i) => (
                    <li key={r.schoolId}>
                      <Link to={`/schools/${r.slug}?tab=ranking`} className="flex items-center gap-3 py-2 hover:text-brand-700">
                        <span className="w-6 shrink-0 text-center font-bold tabular-nums text-brand-700">{r.scopePosition ?? i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-medium text-ink">{r.schoolName}</span>
                        <span className="text-sm font-bold tabular-nums text-ink">{r.totalScore.toFixed(1)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </AsyncContent>
            <ul className="mt-auto space-y-1.5 pt-4 text-sm">
              <li><Link to="/rankings/score" className="link">See our evidence score →</Link></li>
              <li><Link to="/rankings/states" className="link">Rankings by state and city →</Link></li>
              <li><Link to="/rankings/government-boarding?tab=boarding" className="link">Boarding school rankings →</Link></li>
              <li><Link to="/rankings/methodology" className="link">How scores are calculated →</Link></li>
            </ul>
          </section>
        </div>
      </Section>

      <Band>
        <SectionHead eyebrow="Exam preparation" title="Prepare for Your Dream School and Exams" id="exams"
          note="Practise smarter with entrance exam preparation, mock tests, daily quizzes, previous-year papers and performance tracking."
          action={<Link to="/exams" className="btn-primary">Explore Exam Preparation <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PREP_GROUPS.map((g) => (
            <section key={g.title} className="card p-5" aria-label={g.title}>
              <h3 className="flex items-center gap-2 font-display font-bold text-ink">
                <Icon name={g.icon} className="h-5 w-5 shrink-0 text-brand-600" /> {g.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {g.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? <Link to={l.to} className="text-slate-700 hover:text-brand-700 hover:underline">{l.label}</Link>
                      : <span className="text-slate-500">{l.label} <span className="text-xs">({l.note})</span></span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <section className="flex flex-col justify-center rounded-2xl bg-brand-700 p-5 text-white" aria-label="About the questions">
            <p className="font-display text-3xl font-bold tabular-nums text-white">{bank.data ? bank.data.questionCount.toLocaleString('en-IN') : '–'}</p>
            <p className="mt-1 text-sm text-blue-50">
              original practice questions with explanations. Free, with no sign-in needed. Written by SchoolDhundo; they are not official
              or previous-year questions.
            </p>
          </section>
        </div>
      </Band>

      <Section eyebrow="How it works" title="How SchoolDhundo Helps You" id="how">
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700"><Icon name={s.icon} className="h-5 w-5" /></span>
                <span className="text-xs font-semibold text-slate-500">Step {i + 1}</span>
              </span>
              <h3 className="mt-3 font-display font-bold text-ink">{s.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Band>
        <SectionHead eyebrow="Boarding" title="Boarding schools to explore" id="boarding"
          note="Residential schools with documented boarding. Ordered by how well each is documented; this is not a ranking."
          action={<Link to="/boarding" className="btn-secondary">All boarding schools <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
        <div className="mt-6">
          <AsyncContent state={boarding} loading={<SkeletonCards count={3} />} isEmpty={(d) => d.content.length === 0}
            empty={<EmptyState title="No boarding schools listed yet." />}>
            {(page) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{page.content.slice(0, 3).map((s) => <SchoolCard key={s.id} school={s} />)}</div>}
          </AsyncContent>
        </div>
      </Band>

      <Section eyebrow="Admissions" title="Open and upcoming admissions" id="admissions"
        action={<Link to="/admissions" className="btn-secondary">All deadlines <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
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
        <p className="mt-4 text-sm"><Link to="/admissions/guide" className="link">New to school admissions? Read the admission guide →</Link></p>
      </Section>

      {/* Fees (real published schedules only) */}
      {feeData.length > 0 && (
        <Band>
          <SectionHead eyebrow="Fees" title="What schools officially charge per year" id="fees" />
          <div className="mt-6 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <p className="leading-relaxed text-slate-600">
                The lowest complete annual fee each school publishes (tuition, monthly and annual charges), for the latest year it
                has published. Schools with incomplete fee schedules are left out rather than estimated.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/fees" className="btn-primary"><Icon name="rupee" className="h-4 w-4" /> Fee calculator</Link>
                <Link to="/compare" className="btn-secondary">Compare fees side by side</Link>
              </div>
            </div>
            {/* overflow-hidden: Recharts keeps its hidden tooltip beside the chart, which would otherwise widen phones. */}
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
        </Band>
      )}

      <Section eyebrow="Trust" title="Where our information comes from" id="trust">
        <p className="max-w-3xl leading-relaxed text-slate-700">{DISCLAIMER}</p>
        <dl className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {INFORMATION_KINDS.map((k) => (
            <div key={k.title}>
              <dt className="font-display font-bold text-ink">{k.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-slate-600">{k.text}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-xl font-bold text-white">Run a school?</p>
            <p className="mt-1 text-sm text-slate-300">Send your official fee circular or admission notice and we will link it here with its source.</p>
          </div>
          <Link to="/contact" className="btn-accent shrink-0">Submit an official source</Link>
        </div>
      </Section>
    </>
  );
}

/** Up to four real school photographs in equal frames. The name stays on the picture; the credit is on the school's page. */
function HeroPhotos({ schools }: { schools: SchoolSummary[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3" aria-label="Schools listed here">
      {schools.map((s, i) => (
        <li key={s.id}>
          <Link to={`/schools/${s.slug}`} className="group block">
            <SchoolImage src={s.coverImageUrl} name={s.name} alt={s.name} credit={s.coverImageCredit} illustrative={s.coverImageIllustrative}
              priority={i < 2} className="rounded-xl">
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-8">
                <span className="block truncate text-sm font-semibold text-white">{s.name}</span>
              </span>
            </SchoolImage>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SectionHead({ eyebrow, title, id, note, action }: { eyebrow: string; title: string; id: string; note?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-heading`} className="section-title mt-2">{title}</h2>
        {note && <p className="mt-2 text-slate-600">{note}</p>}
      </div>
      {action}
    </div>
  );
}

function Section({ eyebrow, title, id, note, action, children }: {
  eyebrow: string; title: string; id: string; note?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="container-page py-14" aria-labelledby={`${id}-heading`}>
      <SectionHead eyebrow={eyebrow} title={title} id={id} note={note} action={action} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** A full-width white band between the page-coloured sections. */
function Band({ children }: { children: React.ReactNode }) {
  return <section className="border-y border-slate-200 bg-white py-14"><div className="container-page">{children}</div></section>;
}
