import { lazy, Suspense } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AdmissionStatusBadge } from '../components/common/Badges';
import { Icon, type IconName } from '../components/common/Icon';
import { AsyncContent, EmptyState, SkeletonCards, Spinner } from '../components/common/States';
import { photoCreditTitle, SchoolCard } from '../components/school/SchoolCard';
import { SchoolSearchForm, type HeroSearch } from '../components/school/SchoolsHero';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useInView } from '../hooks/useInView';
import { recentSchools, useLocalList } from '../hooks/usePersonal';
import {
  admissionService, locationService, practiceService, rankingService, referenceService, schoolService,
} from '../services/publicApi';
import type { SchoolSummary } from '../types/api';
import { admissionCategoryLabel, daysUntil, formatDate, formatMoneyCompact } from '../utils/format';

/** Colourful category tiles: each opens the matching directory. */
const CATEGORIES: { to: string; title: string; text: string; icon: IconName; tone: string }[] = [
  { to: '/boards/CBSE', title: 'CBSE schools', text: 'Central Board of Secondary Education', icon: 'book', tone: 'from-brand-600 to-brand-400' },
  { to: '/boards/CISCE', title: 'ICSE schools', text: 'ICSE and ISC (CISCE) schools', icon: 'graduation', tone: 'from-violet-600 to-violet-400' },
  { to: '/type/private-aided/international', title: 'International schools', text: 'IB, Cambridge and international curricula', icon: 'globe', tone: 'from-teal-600 to-teal-400' },
  { to: '/type/government', title: 'Government schools', text: 'Central, state and local-body schools', icon: 'shield', tone: 'from-emerald-600 to-emerald-400' },
  { to: '/type/private-aided/private', title: 'Private schools', text: 'Private unaided schools', icon: 'building', tone: 'from-accent-600 to-accent-400' },
  { to: '/boarding', title: 'Boarding schools', text: 'Residential and hostel schools', icon: 'home', tone: 'from-rose-600 to-rose-400' },
];

/** States shown first on the home page; every other state and UT is one click away. */
const HOME_STATES = ['DL', 'UP', 'BR', 'JH', 'HR', 'MH', 'KA', 'TN', 'RJ', 'WB'];
const STATE_TONES = ['bg-brand-50 text-brand-700', 'bg-violet-50 text-violet-700', 'bg-accent-50 text-accent-700', 'bg-emerald-50 text-emerald-700', 'bg-rose-50 text-rose-700'];

const EXAMS: { to: string; title: string; text: string; icon: IconName; tone: string }[] = [
  { to: '/exams/jnvst', title: 'JNV entrance (JNVST)', text: 'Guide, pattern and mock tests for Class VI', icon: 'graduation', tone: 'bg-brand-600' },
  { to: '/exams/aissee', title: 'Sainik School (AISSEE)', text: 'Class VI and IX practice by subject', icon: 'flag', tone: 'bg-emerald-600' },
  { to: '/exams/practice/class10-maths-1', title: 'Class X Mathematics', text: 'Chapter-wise practice in English and Hindi', icon: 'book', tone: 'bg-violet-600' },
  { to: '/exams/practice?category=OLYMPIAD', title: 'Olympiad preparation', text: 'Original Olympiad-style questions', icon: 'trophy', tone: 'bg-accent-500' },
  { to: '/exams/practice', title: 'Online mock tests', text: 'Timed tests with instant results', icon: 'clock', tone: 'bg-rose-600' },
  { to: '/exams/practice/class12-maths-1', title: 'CBSE Class 12', text: 'Mathematics and Physics, chapter by chapter', icon: 'layers', tone: 'bg-teal-600' },
];

// The charts library (~110 KB compressed) arrives after the page's first paint, only for the fee section.
const FeeChart = lazy(() => import('../components/home/FeeChart'));

export function HomePage() {
  useDocumentTitle(undefined);
  const navigate = useNavigate();
  const feeChart = useInView<HTMLDivElement>();
  const stats = useApi(() => referenceService.stats(), []);
  // A bounded sample for the fee chart: the best-documented schools, which are the ones with published fees.
  const schools = useApi(() => schoolService.search({ sortBy: 'recommended', size: 100 }), []);
  const upcoming = useApi(() => admissionService.upcoming(0, 6), []);
  const featured = useApi(() => schoolService.featured(undefined, 8), []);
  const boarding = useApi(() => schoolService.search({ boarding: true, sortBy: 'recommended', size: 6 }), []);
  const ranked = useApi(() => rankingService.top(5), []);
  const bank = useApi(() => practiceService.bank(), []);
  const states = useApi(() => locationService.states(), []);
  const recent = useLocalList(recentSchools);

  const onSearch = (s: HeroSearch) => {
    const p = new URLSearchParams();
    (['q', 'state', 'city'] as const).forEach((k) => { if (s[k]) p.set(k, s[k]!); });
    navigate(`/schools${p.size ? `?${p}` : ''}#directory`);
  };
  const photos = (featured.data ?? []).filter((s) => s.coverImageUrl).slice(0, 4);
  const homeStates = HOME_STATES.map((c) => states.data?.find((s) => s.code === c)).filter((s): s is NonNullable<typeof s> => !!s);
  const otherStates = (states.data ?? []).filter((s) => !HOME_STATES.includes(s.code) && s.schoolCount > 0).length;
  const all = schools.data?.content ?? [];
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
      {/* 1. Hero: light and colourful, with real (credited) school photographs. */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-50 via-white to-violet-50">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-brand-200/50 blur-3xl" aria-hidden />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-violet-200/50 blur-3xl" aria-hidden />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-accent-200/40 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-14 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div className="animate-fade-up min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-card ring-1 ring-brand-100">
              <Icon name="sparkle" className="h-3.5 w-3.5 text-accent-500" /> Schools · Fees · Admissions · Exam preparation
            </p>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-ink sm:text-6xl">
              Find the Perfect School for{' '}
              <span className="bg-gradient-to-r from-brand-600 via-violet-600 to-accent-500 bg-clip-text text-transparent">Your Child</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              Explore thousands of schools across India. Compare fees, facilities, rankings and admissions in one place.
            </p>
            <div className="mt-8"><SchoolSearchForm onSearch={onSearch} withBoard={false} submitLabel="Search Schools" idPrefix="home" stacked /></div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Link to="/find" className="chip bg-white px-3 py-1.5 font-semibold text-brand-700 shadow-card ring-1 ring-brand-100 hover:bg-brand-50">
                <Icon name="sparkle" className="h-4 w-4" /> Help me choose
              </Link>
              <Link to="/nearby" className="chip bg-white px-3 py-1.5 font-semibold text-slate-700 shadow-card ring-1 ring-slate-200 hover:bg-slate-50">
                <Icon name="pin" className="h-4 w-4" /> Schools near me
              </Link>
            </div>
            {stats.data && (
              <dl className="mt-8 grid max-w-xl grid-cols-3 gap-4">
                {([
                  ['Schools listed', stats.data.activeSchools, 'text-brand-700'],
                  ['States & UTs', stats.data.statesCovered, 'text-violet-700'],
                  ['Districts', stats.data.districtsCovered, 'text-accent-600'],
                ] as const).map(([label, value, tone]) => (
                  <div key={label} className="rounded-2xl bg-white/80 p-3 shadow-card ring-1 ring-slate-100">
                    <dd className={`font-display text-2xl font-extrabold tabular-nums ${tone}`}>{value.toLocaleString('en-IN')}</dd>
                    <dt className="text-xs font-medium text-slate-500">{label}</dt>
                  </div>
                ))}
              </dl>
            )}
          </div>
          {photos.length >= 2 && <PhotoMosaic schools={photos} />}
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

      {/* 2. Categories */}
      <Section eyebrow="Explore" title="Explore schools by category" id="categories">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((c) => (
            <Link key={c.to} to={c.to} className="group relative overflow-hidden rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${c.tone} text-white shadow-md`}>
                <Icon name={c.icon} className="h-6 w-6" />
              </span>
              <span className="mt-4 block font-display text-lg font-bold text-ink">{c.title}</span>
              <span className="mt-1 block text-sm text-slate-600">{c.text}</span>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Explore <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
              <span className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${c.tone} opacity-10`} aria-hidden />
            </Link>
          ))}
        </div>
      </Section>

      {/* 3. Schools with real photographs. These are not a ranking, so the heading does not call them "top". */}
      <Section eyebrow="Featured" title="Featured schools across India" id="featured"
        note="Schools whose photographs are public domain, openly licensed or used with permission. This is not a ranking."
        action={<Link to="/schools" className="btn-secondary rounded-full">View all schools <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
        <AsyncContent state={featured} loading={<SkeletonCards count={4} />} isEmpty={(d) => d.length === 0}
          empty={<EmptyState title="No featured schools yet." />}>
          {(list) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.slice(0, 8).map((s) => <SchoolCard key={s.id} school={s} />)}</div>}
        </AsyncContent>
      </Section>

      {/* 4. States */}
      <section className="bg-white py-14">
        <div className="container-page">
          <SectionHead eyebrow="States & union territories" title="Explore schools by state" id="states"
            action={<Link to="/states" className="btn-secondary rounded-full">All states &amp; UTs <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {homeStates.map((s, i) => (
              <li key={s.code}>
                <Link to={`/states/${s.slug}`} className="card card-hover flex items-center gap-3 p-4">
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-sm font-extrabold ${STATE_TONES[i % STATE_TONES.length]}`}>{s.code}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-display font-bold text-ink">{s.name}</span>
                    <span className="block text-xs text-slate-500">{s.schoolCount.toLocaleString('en-IN')} schools</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {otherStates > 0 && (
            <p className="mt-4 text-sm text-slate-600">
              Plus schools in {otherStates} more states and union territories — <Link to="/states" className="link">see all</Link> or <Link to="/cities" className="link">browse by city</Link>.
            </p>
          )}
        </div>
      </section>

      {/* Admissions open (real cycles from official notices) */}
      <Section eyebrow="Admissions" title="Open and upcoming admissions" id="admissions"
        action={<Link to="/admissions" className="btn-secondary rounded-full">All deadlines <Icon name="arrowRight" className="h-4 w-4" /></Link>}>
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

      {/* 5. Boarding */}
      <section className="bg-gradient-to-br from-rose-50 via-white to-accent-50 py-14">
        <div className="container-page">
          <SectionHead eyebrow="Boarding" title="Boarding schools to explore" id="boarding"
            note="Residential schools with documented boarding — Navodaya, Sainik, military and private boarding schools. Ordered by how well each is documented; not a ranking."
            action={<Link to="/boarding" className="btn-secondary rounded-full">All boarding schools <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
          <div className="mt-6">
            <AsyncContent state={boarding} loading={<SkeletonCards count={3} />} isEmpty={(d) => d.content.length === 0}
              empty={<EmptyState title="No boarding schools listed yet." />}>
              {(page) => <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{page.content.slice(0, 6).map((s) => <SchoolCard key={s.id} school={s} />)}</div>}
            </AsyncContent>
          </div>
        </div>
      </section>

      {/* 6. Rankings */}
      <Section eyebrow="Rankings" title="School rankings" id="rankings"
        note="India School Finder scores schools from source-linked evidence; only verified evidence earns a rank. These are not official government rankings.">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          <div className="grid grid-cols-2 gap-3">
            {([
              ['/rankings?size=10', 'Top 10 schools', 'in India', 'from-brand-600 to-violet-600'],
              ['/rankings', 'Top 20 schools', 'in India', 'from-violet-600 to-rose-500'],
              ['/rankings?size=100', 'Top 100 schools', 'in India', 'from-accent-500 to-rose-500'],
              ['/rankings?focus=place', 'State-wise', 'rankings', 'from-emerald-600 to-teal-500'],
            ] as const).map(([to, title, sub, tone]) => (
              <Link key={to} to={to} className={`flex flex-col justify-between rounded-3xl bg-gradient-to-br ${tone} p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
                <Icon name="trophy" className="h-7 w-7 text-white/90" />
                <span className="mt-6">
                  <span className="block font-display text-xl font-extrabold">{title}</span>
                  <span className="text-sm text-white/85">{sub}</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="card p-5">
            <p className="font-display font-bold text-ink">Highest scores right now</p>
            <AsyncContent state={ranked} isEmpty={(d) => d.length === 0}
              empty={<p className="mt-3 text-sm text-slate-600">No school has enough verified evidence for a rank yet. <Link to="/rankings/methodology" className="link">How scoring works</Link></p>}>
              {(list) => (
                <ol className="mt-3 divide-y divide-slate-100">
                  {list.map((r, i) => (
                    <li key={r.schoolId}>
                      <Link to={`/schools/${r.slug}?tab=ranking`} className="flex items-center gap-3 py-2.5 hover:text-brand-700">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 font-display text-sm font-extrabold text-brand-700">{r.scopePosition ?? i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-ink">{r.schoolName}</span>
                          <span className="block truncate text-xs text-slate-500">{[r.city ?? r.districtName, r.stateName].filter(Boolean).join(', ')}</span>
                        </span>
                        <span className="text-sm font-bold tabular-nums text-ink">{r.totalScore.toFixed(1)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </AsyncContent>
            <Link to="/rankings/methodology" className="link mt-3 inline-block text-sm">How scores are calculated →</Link>
          </div>
        </div>
      </Section>

      {/* 7. Exam preparation */}
      <section className="bg-gradient-to-br from-violet-50 via-white to-brand-50 py-14">
        <div className="container-page">
          <SectionHead eyebrow="Exam preparation" title="Prepare for school and entrance exams" id="exams"
            note={`${bank.data ? `${bank.data.questionCount} original practice questions` : 'Original practice questions'} with explanations, timed mock tests and a daily quiz — free, no sign-in needed. Written by India School Finder; not official or previous-year questions.`}
            action={<Link to="/exams/practice" className="btn-primary rounded-full">Start practising <Icon name="arrowRight" className="h-4 w-4" /></Link>} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {EXAMS.map((e) => (
              <Link key={e.to} to={e.to} className="group flex items-center gap-4 rounded-3xl bg-white p-5 shadow-card ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-lift">
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${e.tone} text-white shadow-md`}><Icon name={e.icon} className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-bold text-ink">{e.title}</span>
                  <span className="block text-sm text-slate-600">{e.text}</span>
                </span>
                <Icon name="arrowRight" className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Fees (real published schedules only) */}
      {feeData.length > 0 && (
        <Section eyebrow="Fees" title="What schools officially charge per year" id="fees">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <p className="leading-relaxed text-slate-600">
                The lowest complete annual fee each school publishes (tuition, monthly and annual charges), for the latest year it
                has published. Schools with incomplete fee schedules are left out rather than estimated.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/fees" className="btn-primary rounded-full"><Icon name="rupee" className="h-4 w-4" /> Fee calculator</Link>
                <Link to="/compare" className="btn-secondary rounded-full">Compare fees side by side</Link>
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
        </Section>
      )}

      {/* 8. Why choose */}
      <section className="bg-white py-14">
        <div className="container-page">
          <SectionHead eyebrow="Why India School Finder" title="Why parents choose India School Finder" id="why" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['map', 'Schools across India', `${stats.data ? stats.data.activeSchools.toLocaleString('en-IN') : 'Thousands of'} schools in every state and union territory, each linked to an official source.`, 'bg-brand-50 text-brand-700'],
              ['scale', 'Easy school comparison', 'Compare up to four schools side by side — board, classes, fees, facilities and distance — with differences highlighted.', 'bg-violet-50 text-violet-700'],
              ['calendar', 'Admission information', 'Open and upcoming admission cycles from official notices, and a plain guide to the process and documents.', 'bg-emerald-50 text-emerald-700'],
              ['rupee', 'Transparent fee information', 'Only official fee schedules, with their year and source — never estimated or filled in.', 'bg-accent-50 text-accent-700'],
              ['target', 'Exam preparation', 'Guides to JNVST, AISSEE and other entrance exams, with patterns, syllabi and official papers linked.', 'bg-rose-50 text-rose-700'],
              ['book', 'Free practice questions', 'Original quizzes and timed mock tests with explanations, many in English and Hindi, and progress tracking.', 'bg-teal-50 text-teal-700'],
            ] as const).map(([icon, title, text, tone]) => (
              <div key={title} className="flex gap-4 rounded-3xl bg-canvas p-5 ring-1 ring-slate-100">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon name={icon} className="h-5 w-5" /></span>
                <div>
                  <p className="font-display font-bold text-ink">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-brand-600 to-violet-600 p-6 text-white shadow-lift sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-xl font-bold text-white">Run a school?</p>
              <p className="mt-1 text-sm text-blue-50">Send your official fee circular or admission notice and we will link it here with its source.</p>
            </div>
            <Link to="/contact" className="btn-accent shrink-0 rounded-full">Submit an official source</Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Up to four real school photographs, each with its credit and a link to the school. */
function PhotoMosaic({ schools }: { schools: SchoolSummary[] }) {
  return (
    <div className="relative hidden lg:block">
      <div className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-300/40 via-violet-300/30 to-accent-300/40 blur-2xl" aria-hidden />
      <ul className="relative grid grid-cols-2 gap-3">
        {schools.map((s, i) => (
          <li key={s.id} className={`overflow-hidden rounded-3xl bg-slate-100 shadow-lift ring-4 ring-white ${i % 2 === 1 ? 'translate-y-6' : ''}`}>
            <Link to={`/schools/${s.slug}`} className="group relative block aspect-[4/3]">
              <img src={s.coverImageUrl!} alt={`${s.name}`} loading={i < 2 ? 'eager' : 'lazy'} decoding="async"
                title={photoCreditTitle(s)} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-8">
                <span className="block truncate text-sm font-semibold text-white">{s.name}</span>
                {s.coverImageIllustrative && s.coverImageCredit && (
                  <span className="block truncate text-[10px] text-white/80">{s.coverImageCredit}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SectionHead({ eyebrow, title, id, note, action }: { eyebrow: string; title: string; id: string; note?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={`${id}-heading`} className="section-title mt-2">{title}</h2>
        {note && <p className="mt-2 text-sm text-slate-600">{note}</p>}
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
