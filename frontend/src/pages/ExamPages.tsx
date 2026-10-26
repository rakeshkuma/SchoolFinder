import { useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ExamCard, ExamStatusBadge, SaveExamButton, scopeText } from '../components/exam/ExamCard';
import { StudyPlanner } from '../components/exam/StudyPlanner';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, ErrorState, Spinner } from '../components/common/States';
import { Tabs } from '../components/common/Tabs';
import { BOARDING_SCHOOLS } from '../content/boarding';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { savedExams, useLocalList } from '../hooks/usePersonal';
import { downloadIcs } from '../utils/ics';
import { examService, locationService, practiceService, type ExamListParams } from '../services/publicApi';
import { PRACTICE_LABEL, PracticeCard } from './PracticePages';
import type { ExamBoarding, ExamDate, ExamMode, ExamNotice, ExamSchoolType, ExamStatus, ExamSummary } from '../types/api';
import { formatDate } from '../utils/format';
import {
  classLabel, countdown, daysBetween, examBoardingLabel, examDateKindLabel, examModeLabel, examNoticeKindLabel,
  examSchoolTypeLabel, examStatusLabel, formatExamDate, isFirm, isoToday, lastDay, romanClass, upcomingEvents,
} from '../utils/exams';
import { ApiError } from '../services/http';
import { NotFoundPage } from './InfoPages';

const PAGE_SIZE = 12;

/** Status groups for the dashboard tiles; each tile filters the list to its statuses. */
const STATUS_TILES: { label: string; statuses: ExamStatus[]; tone: string }[] = [
  { label: 'Applications open', statuses: ['APPLICATIONS_OPEN', 'DEADLINE_APPROACHING'], tone: 'text-emerald-700' },
  { label: 'Opening soon', statuses: ['APPLICATIONS_OPENING_SOON'], tone: 'text-sky-700' },
  { label: 'Exam date announced', statuses: ['EXAM_DATE_ANNOUNCED'], tone: 'text-brand-700' },
  { label: 'Awaiting official notification', statuses: ['AWAITING_NOTIFICATION'], tone: 'text-slate-700' },
];

const FILTER_KEYS = ['q', 'class', 'state', 'type', 'boarding', 'free', 'status', 'session', 'mode', 'authority', 'month', 'sort'] as const;

/** "Navodaya Vidyalaya Samiti (Ministry of Education)" → "Navodaya Vidyalaya Samiti"; matches by contains on the server. */
const authorityShort = (a: string) => a.split(/[(,;]/)[0].trim();

function useStateNames() {
  const states = useApi(() => locationService.states(), []);
  const byCode = useMemo(() => new Map((states.data ?? []).map((s) => [s.code, s.name])), [states.data]);
  return { states: states.data ?? [], name: (code: string) => byCode.get(code) ?? code };
}

export function ExamsPage() {
  useDocumentTitle('School entrance exams in India');
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { states, name: stateName } = useStateNames();
  const savedCount = useLocalList(savedExams).length;
  const today = isoToday();

  const page =Math.max(0, Number(params.get('page') ?? 0) || 0);
  const query: ExamListParams = {
    q: params.get('q') ?? undefined,
    entryClass: params.get('class') ? Number(params.get('class')) : undefined,
    state: params.get('state') ?? undefined,
    schoolType: (params.get('type') as ExamSchoolType | null) ?? undefined,
    boarding: (params.get('boarding') as ExamBoarding | null) ?? undefined,
    free: params.get('free') === 'true' ? true : params.get('free') === 'false' ? false : undefined,
    status: params.get('status') ?? undefined,
    session: params.get('session') ?? undefined,
    mode: (params.get('mode') as ExamMode | null) ?? undefined,
    authority: params.get('authority') ?? undefined,
    examMonth: params.get('month') ?? undefined,
    sort: (params.get('sort') as ExamListParams['sort'] | null) ?? 'relevance',
    page,
    size: PAGE_SIZE,
  };
  const list = useApi(() => examService.list(query), [params.toString()]);
  const all = useApi(() => examService.all(), []);
  const notices = useApi(() => examService.notices(6), []);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === '') next.delete(k); else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: false });
  };
  const filtered = FILTER_KEYS.some((k) => k !== 'sort' && params.get(k));
  const [draft, setDraft] = useState(params.get('q') ?? '');
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    set({ q: draft.trim() || undefined });
    document.getElementById('exam-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const showStatuses = (statuses: ExamStatus[]) => {
    set({ status: statuses.join(',') });
    document.getElementById('exam-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const exams = all.data ?? [];
  // Class pages are for classes reached through an entrance test; admission processes (e.g. KV) cover many classes.
  const classes = [...new Set(exams.filter((e) => e.kind === 'ENTRANCE_TEST').flatMap((e) => e.entryClasses))].sort((a, b) => a - b);
  const stateExams = exams.filter((e) => e.scope === 'STATE');
  const events = upcomingEvents(exams, today);
  const tentative = upcomingEvents(exams, today, true).filter(({ date }) => !isFirm(date));
  const linkState = { from: `${location.pathname}${location.search}` };

  return (
    <>
      <PageHeader
        eyebrow="Entrance exams"
        title="Find the Right School Entrance Exam"
        subtitle="Eligibility, dates, exam pattern, syllabus and official papers for school entrance exams across India — every fact linked to the conducting body’s own notice."
      >
        <form role="search" onSubmit={onSearch} className="flex max-w-2xl flex-col gap-2 sm:flex-row">
          <label htmlFor="exam-search" className="sr-only">Search exams by name, school, class or state</label>
          <input
            id="exam-search"
            type="search"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Try “Navodaya”, “Class 9”, “Sainik” or “Jharkhand”"
            className="input min-w-0 flex-1 border-white/20 bg-white text-ink"
          />
          <button type="submit" className="btn-primary justify-center"><Icon name="search" className="h-4 w-4" /> Search exams</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/exams/finder" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
            <Icon name="sparkle" className="h-3.5 w-3.5" /> Which exams can my child take?
          </Link>
          <Link to="/exams/calendar" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
            <Icon name="calendar" className="h-3.5 w-3.5" /> Exam calendar
          </Link>
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
            <Icon name="book" className="h-3.5 w-3.5" /> Free practice tests
          </Link>
          <Link to="/exams/syllabus" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
            <Icon name="list" className="h-3.5 w-3.5" /> Syllabus &amp; pattern
          </Link>
          <Link to="/exams/calendar?saved=1" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
            <Icon name="heart" className="h-3.5 w-3.5" /> Saved exams ({savedCount})
          </Link>
        </div>
      </PageHeader>

      <div className="container-page space-y-12 py-10">
        {/* Dashboard */}
        <section aria-labelledby="glance-heading">
          <h2 id="glance-heading" className="font-display text-xl font-bold text-ink">At a glance</h2>
          <p className="mt-1 text-sm text-slate-600">
            Statuses are worked out from dates confirmed in official notices only — a missing or tentative date never makes an exam look open or upcoming.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATUS_TILES.map((t) => {
              const count = exams.filter((e) => t.statuses.includes(e.status)).length;
              return (
                <button key={t.label} type="button" onClick={() => showStatuses(t.statuses)}
                  className="card card-hover p-4 text-left" aria-label={`${t.label}: ${count} exam${count === 1 ? '' : 's'}. Show them`}>
                  <span className={`block font-display text-3xl font-bold ${t.tone}`}>{all.data ? count : '–'}</span>
                  <span className="mt-1 block text-sm text-slate-700">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section aria-labelledby="lists-heading">
          <h2 id="lists-heading" className="sr-only">Exams by class, boarding and results</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <DashboardList title="For Class VI admission" exams={exams.filter((e) => e.entryClasses.includes(6))} linkState={linkState}
              more={() => set({ class: '6' })} />
            <DashboardList title="For Class IX admission" exams={exams.filter((e) => e.entryClasses.includes(9))} linkState={linkState}
              more={() => set({ class: '9' })} />
            <DashboardList title="Boarding-school exams" exams={exams.filter((e) => e.boarding !== 'DAY')} linkState={linkState}
              more={() => set({ boarding: 'BOARDING' })} />
            <ResultsList exams={exams} notices={notices.data ?? []} />
          </div>
        </section>

        {/* Key dates */}
        <section aria-labelledby="dates-heading" className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0">
            <h2 id="dates-heading" className="font-display text-xl font-bold text-ink">Key dates ahead</h2>
            <p className="mt-1 text-sm text-slate-600">Confirmed dates from the latest official notices, soonest first.</p>
            {all.loading ? <Spinner /> : events.length === 0 ? (
              <p className="card mt-4 p-5 text-sm text-slate-600">No confirmed dates are ahead right now. Exams awaiting their notice are listed below.</p>
            ) : (
              <ol className="mt-4 space-y-2">
                {events.slice(0, 8).map(({ exam, date }) => {
                  const days = daysBetween(today, date.startsOn < today ? lastDay(date) : date.startsOn);
                  return (
                    <li key={`${exam.slug}-${date.kind}-${date.startsOn}`} className="card p-4 text-sm sm:flex sm:items-center sm:gap-4">
                      <span className="flex items-baseline justify-between gap-3 sm:w-40 sm:shrink-0 sm:flex-col sm:gap-0">
                        <span className="font-medium text-ink">{formatExamDate(date)}</span>
                        <span className="font-semibold text-brand-700">{countdown(days)}</span>
                      </span>
                      <span className="mt-1 block min-w-0 flex-1 sm:mt-0">
                        <Link to={`/exams/${exam.slug}`} state={linkState} className="font-semibold text-ink hover:text-brand-700">{exam.shortName}</Link>
                        <span className="text-slate-600"> · {date.label}</span>
                      </span>
                      <a href={date.sourceUrl} target="_blank" rel="noopener noreferrer" className="link mt-1 inline-block text-xs sm:mt-0">Official notice ↗</a>
                    </li>
                  );
                })}
              </ol>
            )}
            {tentative.length > 0 && (
              <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
                <p className="font-semibold text-ink">Later, without an exact date yet</p>
                <ul className="mt-2 space-y-1 text-slate-600">
                  {tentative.map(({ exam, date }) => (
                    <li key={`${exam.slug}-${date.kind}-${date.startsOn}`}>
                      {exam.shortName} · {date.label}: {formatExamDate(date)}{' '}
                      <span className="text-slate-500">({date.confirmed ? 'month given in the official notice' : 'tentative'})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <aside aria-labelledby="notices-heading" className="card h-fit p-5">
            <h2 id="notices-heading" className="font-display text-lg font-bold text-ink">Recent official notices</h2>
            <AsyncContent state={notices} isEmpty={(d) => d.length === 0} empty={<p className="mt-3 text-sm text-slate-600">No notices recorded yet.</p>}>
              {(items) => (
                <ul className="mt-3 divide-y divide-slate-100 text-sm">
                  {items.map((n) => (
                    <li key={n.url + n.title} className="py-3">
                      <p className="text-xs text-slate-500">{formatDate(n.publishedOn)} · {n.examShortName} · {examNoticeKindLabel[n.kind]}</p>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-medium text-ink hover:text-brand-700">{n.title} ↗</a>
                    </li>
                  ))}
                </ul>
              )}
            </AsyncContent>
          </aside>
        </section>

        {/* Directory */}
        <section id="exam-results" aria-labelledby="results-heading" className="scroll-mt-20">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="results-heading" className="font-display text-xl font-bold text-ink">All entrance exams</h2>
              <p className="mt-1 text-sm text-slate-600" aria-live="polite">
                {list.data ? `${list.data.totalElements} exam${list.data.totalElements === 1 ? '' : 's'}${filtered ? ' match your filters' : ''}` : ' '}
              </p>
            </div>
            <label className="text-sm"><span className="label">Sort by</span>
              <select className="input" value={query.sort} onChange={(e) => set({ sort: e.target.value === 'relevance' ? undefined : e.target.value })}>
                <option value="relevance">Relevance</option>
                <option value="deadline">Upcoming deadline</option>
                <option value="exam_date">Exam date</option>
                <option value="updated">Recently checked</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-6 lg:grid-cols-[260px_1fr]">
            <form aria-label="Filter exams" className="card h-fit space-y-4 p-4 text-sm" onSubmit={(e) => e.preventDefault()}>
              <label className="block"><span className="label">Admission to class</span>
                <select className="input w-full" value={params.get('class') ?? ''} onChange={(e) => set({ class: e.target.value || undefined })}>
                  <option value="">Any class</option>
                  {[4, 5, 6, 7, 8, 9, 10, 11].map((c) => <option key={c} value={c}>Class {romanClass(c)} ({c})</option>)}
                </select>
              </label>
              <label className="block"><span className="label">Your state or UT</span>
                <select className="input w-full" value={params.get('state') ?? ''} onChange={(e) => set({ state: e.target.value || undefined })}>
                  <option value="">All of India</option>
                  {states.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              </label>
              <label className="block"><span className="label">School type</span>
                <select className="input w-full" value={params.get('type') ?? ''} onChange={(e) => set({ type: e.target.value || undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(examSchoolTypeLabel) as ExamSchoolType[]).map((t) => <option key={t} value={t}>{examSchoolTypeLabel[t]}</option>)}
                </select>
              </label>
              <label className="block"><span className="label">Boarding or day</span>
                <select className="input w-full" value={params.get('boarding') ?? ''} onChange={(e) => set({ boarding: e.target.value || undefined })}>
                  <option value="">Either</option>
                  <option value="BOARDING">Boarding</option>
                  <option value="DAY">Day school</option>
                </select>
              </label>
              <label className="block"><span className="label">Application fee</span>
                <select className="input w-full" value={params.get('free') ?? ''} onChange={(e) => set({ free: e.target.value || undefined })}>
                  <option value="">Any</option>
                  <option value="true">Free to apply</option>
                  <option value="false">Fee charged</option>
                </select>
              </label>
              <label className="block"><span className="label">Status</span>
                <select className="input w-full" value={params.get('status') ?? ''} onChange={(e) => set({ status: e.target.value || undefined })}>
                  <option value="">Any status</option>
                  <option value="APPLICATIONS_OPEN,DEADLINE_APPROACHING">Applications open (any deadline)</option>
                  {(Object.keys(examStatusLabel) as ExamStatus[]).map((s) => <option key={s} value={s}>{examStatusLabel[s]}</option>)}
                </select>
              </label>
              <details open={['session', 'mode', 'authority', 'month'].some((k) => params.get(k)) || undefined} className="group">
                <summary className="cursor-pointer font-semibold text-ink">More filters</summary>
                <div className="mt-3 space-y-4">
                  <label className="block"><span className="label">Admission year</span>
                    <select className="input w-full" value={params.get('session') ?? ''} onChange={(e) => set({ session: e.target.value || undefined })}>
                      <option value="">Any session</option>
                      {[...new Set(exams.map((e) => e.academicSession).filter((s): s is string => !!s))].sort()
                        .map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="label">Exam month (confirmed dates)</span>
                    <select className="input w-full" value={params.get('month') ?? ''} onChange={(e) => set({ month: e.target.value || undefined })}>
                      <option value="">Any month</option>
                      {[...new Set(exams.map((e) => e.examDate?.slice(0, 7)).filter((m): m is string => !!m))].sort()
                        .map((m) => <option key={m} value={m}>{new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="label">Exam mode</span>
                    <select className="input w-full" value={params.get('mode') ?? ''} onChange={(e) => set({ mode: e.target.value || undefined })}>
                      <option value="">Any mode</option>
                      {[...new Set(exams.map((e) => e.examMode).filter((m): m is ExamMode => !!m))]
                        .map((m) => <option key={m} value={m}>{examModeLabel[m]}</option>)}
                    </select>
                  </label>
                  <label className="block"><span className="label">Conducting authority</span>
                    <select className="input w-full" value={params.get('authority') ?? ''} onChange={(e) => set({ authority: e.target.value || undefined })}>
                      <option value="">Any authority</option>
                      {[...new Set(exams.map((e) => authorityShort(e.conductingAuthority)))].sort()
                        .map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </label>
                </div>
              </details>
              {filtered && (
                <button type="button" className="btn-secondary w-full justify-center" onClick={() => { setDraft(''); setParams(new URLSearchParams()); }}>
                  Clear all filters
                </button>
              )}
            </form>

            <div className={`min-w-0 transition-opacity ${list.loading && list.data ? 'opacity-60' : ''}`} aria-busy={list.loading}>
              {params.get('q') && (
                <p className="mb-3 text-sm text-slate-600">
                  Results for “{params.get('q')}” · <button type="button" className="link" onClick={() => { setDraft(''); set({ q: undefined }); }}>clear search</button>
                </p>
              )}
              <AsyncContent state={list} isEmpty={(d) => d.content.length === 0}
                empty={
                  <EmptyState title="No exams match these filters.">
                    Try removing a filter. We only list exams whose details we could check against an official source.
                  </EmptyState>
                }>
                {(data) => (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      {data.content.map((e) => <ExamCard key={e.slug} exam={e} stateName={stateName} linkState={linkState} />)}
                    </div>
                    <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: String(p) })} />
                  </>
                )}
              </AsyncContent>
            </div>
          </div>
        </section>

        {/* Browse */}
        <section aria-labelledby="browse-heading" className="grid gap-6 md:grid-cols-2">
          <h2 id="browse-heading" className="sr-only">Browse exams</h2>
          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink">By admission class</h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {classes.map((c) => {
                const n = exams.filter((e) => e.entryClasses.includes(c)).length;
                return (
                  <li key={c}>
                    <Link to={`/exams/class/${c}`} className="chip bg-brand-50 px-3 py-1.5 text-sm text-brand-800 hover:bg-brand-100">
                      Class {romanClass(c)} · {n} exam{n === 1 ? '' : 's'}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-sm text-slate-600">
              Most entrance tests are for Class VI or IX. Other classes are usually reached through a school&apos;s own process — for example
              <Link to="/exams/kvs-admission" className="link"> Kendriya Vidyalaya admission</Link> (Class I by draw of lots) — see also <Link to="/admissions" className="link">admissions</Link>.
            </p>
          </div>
          <div className="card p-5">
            <h3 className="font-display text-lg font-bold text-ink">By state</h3>
            <p className="mt-2 text-sm text-slate-600">
              {exams.filter((e) => e.scope === 'NATIONAL').length} national exams are open to candidates from every state and UT:{' '}
              {exams.filter((e) => e.scope === 'NATIONAL').map((e, i, arr) => (
                <span key={e.slug}><Link to={`/exams/${e.slug}`} className="link">{e.shortName}</Link>{i < arr.length - 1 ? ', ' : '.'}</span>
              ))}
            </p>
            {stateExams.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {stateExams.map((e) => (
                  <li key={e.slug}>
                    <span className="font-medium text-ink">
                      {e.stateCodes.map((code, i) => {
                        const st = states.find((x) => x.code === code);
                        return <span key={code}>{i > 0 && ', '}{st ? <Link to={`/exams/state/${st.slug}`} className="hover:text-brand-700">{st.name}</Link> : stateName(code)}</span>;
                      })}:
                    </span>{' '}
                    <Link to={`/exams/${e.slug}`} className="link">{e.name}</Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">More state-level exams are added as each one is checked against its official notice.</p>
          </div>
        </section>

        {/* Preparation */}
        <section aria-labelledby="prep-heading">
          <h2 id="prep-heading" className="font-display text-xl font-bold text-ink">Preparation resources</h2>
          <p className="mt-1 text-sm text-slate-600">
            Official papers and answer keys are linked at the conducting body&apos;s own site — we do not copy them. Preparation plans are our general guidance and are labelled as such.
            {' '}<Link to="/exams/practice" className="link">Try our free practice quizzes and mock tests →</Link>
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exams.map((e) => (
              <li key={e.slug} className="card flex items-center justify-between gap-3 p-4 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{e.shortName}</span>
                  <span className="text-slate-600">{e.officialPaperCount} official paper / key link{e.officialPaperCount === 1 ? '' : 's'}</span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <Link to={`/exams/${e.slug}?tab=papers`} className="link">Papers</Link>
                  <Link to={`/exams/${e.slug}?tab=prep`} className="link">Preparation plan</Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

/** A compact list for the dashboard: each exam with its session, status and next confirmed date (with source). */
function DashboardList({ title, exams, linkState, more }: { title: string; exams: ExamSummary[]; linkState: unknown; more: () => void }) {
  const today = isoToday();
  return (
    <div className="card flex flex-col p-4">
      <h3 className="font-display text-base font-bold text-ink">{title}</h3>
      {exams.length === 0 ? <p className="mt-2 text-sm text-slate-600">None recorded yet.</p> : (
        <ul className="mt-2 flex-1 divide-y divide-slate-100 text-sm">
          {exams.slice(0, 5).map((e) => (
            <li key={e.slug} className="py-2">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/exams/${e.slug}`} state={linkState} className="font-semibold text-ink hover:text-brand-700">{e.shortName}</Link>
                <ExamStatusBadge status={e.status} />
              </div>
              <p className="text-xs text-slate-600">
                {e.academicSession ? `Session ${e.academicSession}` : e.currentCycle}
                {e.nextDate ? (
                  <> · {examDateKindLabel[e.nextDate.kind]} {formatExamDate(e.nextDate)} ({countdown(daysBetween(today, e.nextDate.startsOn < today ? lastDay(e.nextDate) : e.nextDate.startsOn))})
                    {' '}<a href={e.nextDate.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">source ↗</a></>
                ) : ' · no confirmed date ahead'}
              </p>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={() => { more(); document.getElementById('exam-results')?.scrollIntoView({ behavior: 'smooth' }); }} className="link mt-2 self-start text-sm">
        Show all {exams.length} →
      </button>
    </div>
  );
}

/** Result announcements and counselling updates from recorded official notices. */
function ResultsList({ exams, notices }: { exams: ExamSummary[]; notices: ExamNotice[] }) {
  const announced = exams.filter((e) => e.status === 'RESULT_ANNOUNCED');
  const updates = notices.filter((n) => n.kind === 'RESULT' || n.kind === 'COUNSELLING');
  return (
    <div className="card p-4">
      <h3 className="font-display text-base font-bold text-ink">Results &amp; counselling</h3>
      {announced.length === 0 && updates.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No result or counselling notices among the recent notices.</p>
      ) : (
        <ul className="mt-2 divide-y divide-slate-100 text-sm">
          {announced.map((e) => (
            <li key={e.slug} className="py-2"><Link to={`/exams/${e.slug}?tab=dates`} className="font-semibold text-ink hover:text-brand-700">{e.shortName}</Link>
              <span className="block text-xs text-slate-600">{e.currentCycle}: result announced</span></li>
          ))}
          {updates.map((n) => (
            <li key={n.url + n.title} className="py-2">
              <span className="text-xs text-slate-500">{formatDate(n.publishedOn)} · {n.examShortName}</span>
              <a href={n.url} target="_blank" rel="noopener noreferrer" className="block font-medium text-ink hover:text-brand-700">{n.title} ↗</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// --- Exam profile ---------------------------------------------------------------------------------------------------

const TAB_IDS = ['overview', 'dates', 'pattern', 'prep', 'papers', 'faq', 'sources'] as const;

export function ExamGuidePage() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const state = useApi(() => examService.get(slug), [slug]);
  const { name: stateName } = useStateNames();
  const detail = state.data;
  useDocumentTitle(detail ? `${detail.exam.shortName}: eligibility, dates, pattern and syllabus` : undefined);

  if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!detail) return <Spinner />;

  const { exam, content } = detail;
  const tab = TAB_IDS.includes(params.get('tab') as (typeof TAB_IDS)[number]) ? params.get('tab')! : 'overview';
  const setTab = (id: string) => {
    const next = new URLSearchParams(params);
    if (id === 'overview') next.delete('tab'); else next.set('tab', id);
    setParams(next, { replace: true });
  };
  const backTo = (location.state as { from?: string } | null)?.from ?? '/exams';
  const today = isoToday();
  const schools = BOARDING_SCHOOLS.filter((s) => s.examSlug === exam.slug);
  const upcomingFirm = exam.currentDates.filter((d) => isFirm(d) && lastDay(d) >= today);
  // The current cycle comes first even when it has no dates yet, so an earlier cycle is never read as this year's.
  const cycles = [exam.currentCycle, ...[...new Set(detail.dates.map((d) => d.cycle))].filter((c) => c !== exam.currentCycle)
    .sort((a, b) => b.localeCompare(a))];

  return (
    <>
      <PageHeader eyebrow={`${exam.shortName} guide`} title={exam.name}
        subtitle={<>{exam.summary} <span className="text-slate-400">Conducted by {exam.conductingAuthority}.</span></>}>
        <div className="flex flex-wrap gap-2">
          {content.officialLinks.map((l) => (
            <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">
              {l.label} <Icon name="external" className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </PageHeader>

      <div className="container-page py-6">
        <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-brand-700">Home</Link> /</li>
            <li><Link to={backTo} className="hover:text-brand-700">Entrance exams</Link> /</li>
            <li aria-current="page" className="font-medium text-ink">{exam.shortName}</li>
          </ol>
        </nav>

        <section aria-label="Current status" className="card mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 p-4 text-sm">
          <ExamStatusBadge status={exam.status} />
          <span><span className="text-slate-500">Cycle:</span> <span className="font-medium text-ink">{exam.currentCycle}</span>{exam.academicSession && <span className="text-slate-600"> (session {exam.academicSession})</span>}</span>
          <span><span className="text-slate-500">For:</span> <span className="font-medium text-ink">{classLabel(exam.entryClasses)}</span></span>
          <span><span className="text-slate-500">Open to:</span> <span className="font-medium text-ink">{scopeText(exam, stateName)}</span></span>
          {exam.nextDate && (
            <span>
              <span className="text-slate-500">Next:</span>{' '}
              <span className="font-medium text-ink">{exam.nextDate.label}, {formatExamDate(exam.nextDate)}</span>{' '}
              <span className="text-slate-600">({countdown(daysBetween(today, exam.nextDate.startsOn < today ? lastDay(exam.nextDate) : exam.nextDate.startsOn))})</span>
            </span>
          )}
          <span className="text-xs text-slate-500 sm:ml-auto">
            {exam.lastVerifiedOn ? `Checked against official sources on ${formatDate(exam.lastVerifiedOn)}` : 'Not yet verified'}
          </span>
          <span className="flex w-full flex-wrap gap-2 border-t border-slate-100 pt-3">
            <SaveExamButton slug={exam.slug} name={exam.shortName} />
            {upcomingFirm.length > 0 && (
              <button type="button" className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() => downloadIcs(`${exam.slug}-dates.ics`, upcomingFirm.map((date) => ({ examSlug: exam.slug, examName: exam.shortName, date })))}>
                <Icon name="calendar" className="h-3.5 w-3.5" /> Add {upcomingFirm.length} confirmed date{upcomingFirm.length === 1 ? '' : 's'} to my calendar
              </button>
            )}
          </span>
        </section>

        <Tabs
          label={`${exam.shortName} guide`}
          active={tab}
          onChange={setTab}
          tabs={[
            {
              id: 'overview', label: 'Overview & eligibility', content: (
                <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                  <section className="card p-6">
                    <h2 className="font-display text-lg font-bold text-ink">Who can apply</h2>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {content.eligibility.map((e) => <li key={e} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{e}</li>)}
                    </ul>
                    <h2 className="mt-6 font-display text-lg font-bold text-ink">How selection works</h2>
                    <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{content.selection.map((x) => <li key={x}>{x}</li>)}</ul>
                    {content.fee && <><h2 className="mt-6 font-display text-lg font-bold text-ink">Fees</h2><p className="mt-2 text-sm text-slate-700">{content.fee}</p></>}
                    {content.applicationSteps && content.applicationSteps.length > 0 && (
                      <>
                        <h2 className="mt-6 font-display text-lg font-bold text-ink">How to apply</h2>
                        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">{content.applicationSteps.map((s) => <li key={s}>{s}</li>)}</ol>
                        <p className="mt-2 text-xs text-slate-500">From the official notice for {exam.currentCycle}.</p>
                      </>
                    )}
                    {content.examDay && content.examDay.length > 0 && (
                      <>
                        <h2 className="mt-6 font-display text-lg font-bold text-ink">On the exam day</h2>
                        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{content.examDay.map((s) => <li key={s}>{s}</li>)}</ul>
                        <p className="mt-2 text-xs text-slate-500">From the official notice; the admit card&apos;s instructions come first.</p>
                      </>
                    )}
                    {content.documents && content.documents.length > 0 && (
                      <>
                        <h2 className="mt-6 font-display text-lg font-bold text-ink">Documents to keep ready</h2>
                        <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                          {content.documents.map((d) => <li key={d} className="flex gap-2"><span aria-hidden className="mt-0.5 h-4 w-4 shrink-0 rounded border border-slate-300" />{d}</li>)}
                        </ul>
                        <p className="mt-2 text-xs text-slate-500">As listed in the official notice; the notice is final.</p>
                      </>
                    )}
                  </section>
                  <aside className="space-y-4">
                    <KeyDatesCard dates={detail.dates.filter((d) => d.cycle === exam.currentCycle)} cycle={exam.currentCycle} today={today} onAll={() => setTab('dates')} />
                    <div className="card p-5 text-sm">
                      <p className="font-semibold text-ink">At a glance</p>
                      <dl className="mt-2 space-y-1.5">
                        <div><dt className="inline text-slate-500">Admission: </dt><dd className="inline">{content.entryClassText}</dd></div>
                        <div><dt className="inline text-slate-500">Boarding: </dt><dd className="inline">{examBoardingLabel[exam.boarding]}</dd></div>
                        {exam.examMode && <div><dt className="inline text-slate-500">Mode: </dt><dd className="inline">{examModeLabel[exam.examMode]}</dd></div>}
                        {content.languages && <div><dt className="inline text-slate-500">Languages: </dt><dd className="inline">{content.languages}</dd></div>}
                        {exam.applicationFree !== null && <div><dt className="inline text-slate-500">Application: </dt><dd className="inline">{exam.applicationFree ? 'Free' : 'Fee charged'}</dd></div>}
                        <div><dt className="inline text-slate-500">Schools: </dt><dd className="inline">{exam.schoolTypes.map((t) => examSchoolTypeLabel[t]).join(', ')}</dd></div>
                      </dl>
                    </div>
                    <div className="card p-5 text-sm">
                      <p className="font-semibold text-ink">For schools</p>
                      <p className="mt-1 text-slate-600">{content.forSchools}</p>
                      {schools.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {schools.map((s) => <Link key={s.slug} to={`/boarding/${s.slug}`} className="link block">{s.name}</Link>)}
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              ),
            },
            {
              id: 'dates', label: 'Dates & notices', content: (
                <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
                  <section className="card overflow-hidden">
                    <h2 className="border-b border-slate-100 p-5 font-display text-lg font-bold text-ink">Important dates</h2>
                    {cycles.map((cycle) => {
                      const rows = detail.dates.filter((d) => d.cycle === cycle);
                      return (
                        <div key={cycle} className="border-t border-slate-100 first:border-t-0">
                          <p className="bg-slate-50 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {cycle}{cycle === exam.currentCycle ? ' — current cycle' : ' — earlier cycle, for reference only'}
                          </p>
                          {rows.length === 0 ? (
                            <p className="px-5 py-4 text-sm text-slate-700">
                              <span className="font-semibold">Not announced.</span> Dates appear here once the official notice is published.
                            </p>
                          ) : (
                            <ul className="divide-y divide-slate-100">
                              {rows.map((d) => <DateRow key={`${d.kind}-${d.startsOn}-${d.label}`} date={d} today={today} />)}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </section>
                  <section className="card h-fit p-5">
                    <h2 className="font-display text-lg font-bold text-ink">Official notices</h2>
                    {detail.notices.length === 0 ? <p className="mt-3 text-sm text-slate-600">No dated notices recorded yet; see the official links above.</p> : (
                      <ul className="mt-3 divide-y divide-slate-100 text-sm">
                        {detail.notices.map((n) => (
                          <li key={n.url + n.title} className="py-3">
                            <p className="text-xs text-slate-500">{formatDate(n.publishedOn)} · {examNoticeKindLabel[n.kind]}</p>
                            <a href={n.url} target="_blank" rel="noopener noreferrer" className="mt-0.5 block font-medium text-ink hover:text-brand-700">{n.title} ↗</a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </div>
              ),
            },
            {
              id: 'pattern', label: 'Exam pattern & syllabus', content: (
                <div className="space-y-6">
                  {content.pattern.map((p) => (
                    <section key={p.title} className="card overflow-hidden">
                      <h2 className="border-b border-slate-100 p-5 font-display text-lg font-bold text-ink">{p.title}</h2>
                      {p.sections.length > 0 && <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={p.title}>
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 text-left text-slate-600">
                            <tr><th className="px-5 py-2.5">Section</th><th className="px-5 py-2.5 text-right">Questions</th><th className="px-5 py-2.5 text-right">Marks</th><th className="px-5 py-2.5 text-right">Time</th></tr>
                          </thead>
                          <tbody>
                            {p.sections.map((s) => (
                              <tr key={s.name} className="border-t border-slate-100">
                                <td className="px-5 py-2.5 font-medium text-ink">{s.name}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{s.questions ?? '—'}</td>
                                <td className="px-5 py-2.5 text-right tabular-nums">{s.marks ?? '—'}</td>
                                <td className="px-5 py-2.5 text-right">{s.duration ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>}
                      <ul className={`list-disc space-y-1 py-3 pl-10 pr-5 text-sm text-slate-600 ${p.sections.length > 0 ? 'border-t border-slate-100' : ''}`}>{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                    </section>
                  ))}
                  <section className="card p-6">
                    <h2 className="font-display text-lg font-bold text-ink">Syllabus</h2>
                    <div className="mt-4 grid gap-5 md:grid-cols-2">
                      {content.syllabus.map((s) => (
                        <div key={s.area}>
                          <p className="font-semibold text-ink">{s.area}</p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{s.topics.map((t) => <li key={t}>{t}</li>)}</ul>
                        </div>
                      ))}
                    </div>
                    <p className="mt-5 text-xs text-slate-500">From the official notice for {exam.currentCycle}; check the latest bulletin before you start.</p>
                  </section>
                </div>
              ),
            },
            {
              id: 'prep', label: 'Preparation plan', content: (
                <div className="space-y-6">
                <StudyPlanner exam={exam} content={content} />
                <section className="card p-6">
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                    India School Finder guidance, built on the official exam pattern — it is not issued by the exam body and does not promise a result.
                  </p>
                  <ol className="mt-5 space-y-4">
                    {content.preparation.map((p, i) => (
                      <li key={p.step} className="flex gap-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display font-bold text-white">{i + 1}</span>
                        <div>
                          <p className="font-semibold text-ink">{p.step}</p>
                          <p className="mt-0.5 text-sm text-slate-600">{p.detail}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <ExamPractice examSlug={exam.slug} />
                </section>
                </div>
              ),
            },
            {
              id: 'papers', label: 'Previous papers & answer keys', content: (
                <section className="card overflow-hidden">
                  <div className="border-b border-slate-100 p-5">
                    <h2 className="font-display text-lg font-bold text-ink">Officially published papers and answer keys</h2>
                    {content.papersNote && <p className="mt-1 text-sm text-slate-600">{content.papersNote}</p>}
                  </div>
                  {content.papers.length === 0 ? (
                    <p className="p-5 text-sm text-slate-500">None published officially.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {content.papers.map((p) => (
                        <li key={p.url + p.title} className="flex flex-wrap items-center gap-3 p-5">
                          <span className="w-24 shrink-0 font-display text-lg font-bold text-ink">{p.year}</span>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-ink">{p.title}</p>
                            <p className="text-xs text-slate-500"><span className="chip bg-slate-100 text-slate-700">{p.kind}</span>{p.note && <span className="ml-2">{p.note}</span>}</p>
                          </div>
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn-secondary rounded-full text-xs">
                            Open official file <Icon name="external" className="h-3.5 w-3.5" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ),
            },
            {
              id: 'faq', label: 'FAQ', content: (
                <section className="card divide-y divide-slate-100">
                  {(content.faq ?? []).length === 0 && <p className="p-5 text-sm text-slate-600">No questions answered yet for this exam.</p>}
                  {(content.faq ?? []).map((f) => (
                    <details key={f.question} className="group p-5">
                      <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                        <span className="flex items-start justify-between gap-4">{f.question}<span aria-hidden className="text-slate-400 group-open:rotate-45">+</span></span>
                      </summary>
                      <p className="mt-2 text-sm text-slate-700">{f.answer}</p>
                      <p className="mt-1 text-xs text-slate-500">{f.guidance ? 'Our guidance' : 'From the official notice'}</p>
                    </details>
                  ))}
                </section>
              ),
            },
            {
              id: 'sources', label: 'Sources', content: (
                <section className="card p-6 text-sm">
                  <h2 className="font-display text-lg font-bold text-ink">Official links</h2>
                  <ul className="mt-3 space-y-2">
                    {content.officialLinks.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="link">{l.label} ↗</a></li>)}
                  </ul>
                  <h2 className="mt-6 font-display text-lg font-bold text-ink">Where the facts on this page come from</h2>
                  <ul className="mt-3 space-y-2">
                    {content.sources.map((l) => <li key={l.url}><a href={l.url} target="_blank" rel="noopener noreferrer" className="link break-all">{l.label} ↗</a></li>)}
                  </ul>
                  <p className="mt-4 text-xs text-slate-500">
                    {exam.lastVerifiedOn ? `Checked against these sources on ${formatDate(exam.lastVerifiedOn)}. ` : ''}
                    Notices change — always confirm dates and eligibility with the latest official notice. Spotted something out of date?{' '}
                    <Link to="/contact" className="link">Tell us</Link>.
                  </p>
                </section>
              ),
            },
          ]}
        />
      </div>
    </>
  );
}

/** This exam's practice sets, under its preparation plan. */
function ExamPractice({ examSlug }: { examSlug: string }) {
  const sets = useApi(() => practiceService.list(examSlug), [examSlug]);
  if (!sets.data || sets.data.length === 0) return null;
  return (
    <div className="mt-8 border-t border-slate-100 pt-6">
      <h2 className="font-display text-lg font-bold text-ink">Practise with our questions</h2>
      <p className="mt-1 text-sm text-slate-600">{PRACTICE_LABEL} — original questions in the style of the official pattern, not official questions.</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">{sets.data.map((s) => <li key={s.slug}><PracticeCard set={s} /></li>)}</ul>
    </div>
  );
}

function KeyDatesCard({ dates, cycle, today, onAll }: { dates: ExamDate[]; cycle: string; today: string; onAll: () => void }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">Key dates · {cycle}</p>
      {dates.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">Not announced yet. Dates appear here once the official notice is published.</p>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          {dates.map((d) => (
            <div key={`${d.kind}-${d.startsOn}-${d.label}`}>
              <dt className="text-slate-500">{d.label}</dt>
              <dd className="font-semibold text-ink">
                {formatExamDate(d)}
                {!d.confirmed && <span className="ml-2 chip bg-amber-50 text-xs font-medium text-amber-800">Tentative</span>}
                {isFirm(d) && lastDay(d) < today && <span className="ml-2 text-xs font-normal text-slate-500">(passed)</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <button type="button" onClick={onAll} className="link mt-4 text-sm">All dates and official notices →</button>
    </div>
  );
}

function DateRow({ date, today }: { date: ExamDate; today: string }) {
  const passed = lastDay(date) < today;
  const days = isFirm(date) && !passed ? daysBetween(today, date.startsOn < today ? lastDay(date) : date.startsOn) : null;
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-sm">
      <span className="w-full shrink-0 font-medium text-ink sm:w-36">{formatExamDate(date)}</span>
      <span className="min-w-0 basis-full sm:basis-auto sm:flex-1">
        <span className="text-ink">{date.label}</span>
        <span className="text-slate-500"> · {examDateKindLabel[date.kind]}</span>
        {date.note && <span className="block text-xs text-slate-500">{date.note}</span>}
      </span>
      {!date.confirmed ? <span className="chip bg-amber-50 text-xs text-amber-800">Tentative</span>
        : date.precision === 'MONTH' ? <span className="chip bg-sky-50 text-xs text-sky-800">Month confirmed</span>
          : <span className="chip bg-emerald-50 text-xs text-emerald-800">Confirmed</span>}
      {days !== null ? <span className="text-xs font-semibold text-brand-700">{countdown(days)}</span> : passed ? <span className="text-xs text-slate-500">passed</span> : null}
      <a href={date.sourceUrl} target="_blank" rel="noopener noreferrer" className="link text-xs">Source ↗</a>
    </li>
  );
}

