import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExamStatusBadge, SaveExamButton } from '../components/exam/ExamCard';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { savedExams, useLocalList } from '../hooks/usePersonal';
import { examService, locationService } from '../services/publicApi';
import type { ExamSchoolType, ExamSummary } from '../types/api';
import { EMPTY_ANSWERS, findExams, readAnswers, writeAnswers, type FinderAnswers, type FinderResult } from '../utils/examFinder';
import {
  countdown, daysBetween, examDateKindLabel, examSchoolTypeLabel, formatExamDate, isFirm, isoToday, lastDay, romanClass,
  type ExamEvent,
} from '../utils/exams';
import { downloadIcs } from '../utils/ics';

function useStates() {
  const states = useApi(() => locationService.states(), []);
  const names = useMemo(() => new Map((states.data ?? []).map((s) => [s.code, s.name])), [states.data]);
  return { list: states.data ?? [], name: (code: string) => names.get(code) ?? code };
}

function ExamToolLinks({ current }: { current: 'finder' | 'calendar' }) {
  const saved = useLocalList(savedExams).length;
  const chip = 'chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20';
  return (
    <div className="flex flex-wrap gap-2">
      <Link to="/exams" className={chip}>All entrance exams</Link>
      {current !== 'finder' && <Link to="/exams/finder" className={chip}>Exam finder</Link>}
      {current !== 'calendar' && <Link to="/exams/calendar" className={chip}>Exam calendar</Link>}
      <Link to="/exams/practice" className={chip}>Practice tests</Link>
      {current === 'calendar' ? null : <Link to="/exams/calendar?saved=1" className={chip}>Saved exams ({saved})</Link>}
    </div>
  );
}

// --- Exam finder ----------------------------------------------------------------------------------------------------

const SCHOOL_TYPES: ExamSchoolType[] = ['GOVERNMENT', 'RESIDENTIAL', 'MILITARY'];

export function ExamFinderPage() {
  useDocumentTitle('Which entrance exams can my child take?');
  const [params, setParams] = useSearchParams();
  const answers = readAnswers(params);
  const [draft, setDraft] = useState<FinderAnswers>(answers);
  const exams = useApi(() => examService.all(), []);
  const states = useStates();
  const submitted = answers.currentClass !== null;
  const outcome = useMemo(() => findExams(exams.data ?? [], answers, states.name), [exams.data, params.toString(), states.name]);

  const show = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(writeAnswers(draft));
    setTimeout(() => document.getElementById('finder-results')?.focus(), 0);
  };
  const restart = () => {
    setDraft(EMPTY_ANSWERS);
    setParams(new URLSearchParams());
  };

  return (
    <>
      <PageHeader eyebrow="Exam finder" title="Which entrance exams can my child take?"
        subtitle="Answer up to four questions. We match them against the facts recorded for each exam and explain why each one may fit — the official notice always has the final word on eligibility.">
        <ExamToolLinks current="finder" />
      </PageHeader>
      <div className="container-page grid gap-8 py-10 lg:grid-cols-[380px_1fr]">
        <form onSubmit={show} className="card h-fit space-y-5 p-5 text-sm" aria-label="Exam finder questions">
          <fieldset>
            <legend className="font-semibold text-ink">1. Which class is your child in now?</legend>
            <select required className="input mt-2 w-full" value={draft.currentClass ?? ''}
              onChange={(e) => setDraft({ ...draft, currentClass: e.target.value ? Number(e.target.value) : null })} aria-label="Current class">
              <option value="">Choose a class</option>
              {Array.from({ length: 11 }, (_, i) => i + 1).map((c) => <option key={c} value={c}>Class {romanClass(c)} ({c})</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">We look for exams that admit to the next class, and to later classes.</p>
          </fieldset>
          <fieldset>
            <legend className="font-semibold text-ink">2. Where do you live? <span className="font-normal text-slate-500">(optional)</span></legend>
            <select className="input mt-2 w-full" value={draft.state} onChange={(e) => setDraft({ ...draft, state: e.target.value })} aria-label="State or union territory">
              <option value="">Prefer not to say</option>
              {states.list.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-slate-500">Some exams are only for residents of one state.</p>
          </fieldset>
          <fieldset>
            <legend className="font-semibold text-ink">3. What kind of school? <span className="font-normal text-slate-500">(optional)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(['', ...SCHOOL_TYPES] as const).map((t) => (
                <label key={t || 'any'} className={`chip cursor-pointer px-3 py-1.5 ring-1 ${draft.schoolType === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200'}`}>
                  <input type="radio" name="type" className="sr-only" checked={draft.schoolType === t} onChange={() => setDraft({ ...draft, schoolType: t })} />
                  {t ? examSchoolTypeLabel[t] : 'Any'}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="font-semibold text-ink">4. Boarding or day school? <span className="font-normal text-slate-500">(optional)</span></legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {([['', 'Either'], ['BOARDING', 'Boarding'], ['DAY', 'Day school']] as const).map(([v, label]) => (
                <label key={label} className={`chip cursor-pointer px-3 py-1.5 ring-1 ${draft.boarding === v ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200'}`}>
                  <input type="radio" name="boarding" className="sr-only" checked={draft.boarding === v} onChange={() => setDraft({ ...draft, boarding: v })} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="submit" className="btn-primary">Show matching exams</button>
            {submitted && <button type="button" onClick={restart} className="btn-secondary">Start again</button>}
          </div>
          <p className="text-xs text-slate-500">Your answers stay in this page&apos;s address; nothing is sent to us or stored.</p>
        </form>

        <section id="finder-results" tabIndex={-1} aria-labelledby="finder-results-heading" className="min-w-0 outline-none">
          {!submitted ? (
            <div className="card p-6 text-sm text-slate-600">
              <h2 id="finder-results-heading" className="font-display text-lg font-bold text-ink">Your results will appear here</h2>
              <p className="mt-2">Most school entrance exams admit to Class VI or Class IX. Admission to other classes is usually through each school&apos;s own process — see <Link to="/admissions" className="link">admissions</Link>.</p>
            </div>
          ) : exams.loading && !exams.data ? <Spinner /> : (
            <div className="space-y-8">
              <div>
                <h2 id="finder-results-heading" className="font-display text-xl font-bold text-ink">
                  {outcome.now.length > 0
                    ? `${outcome.now.length} ${outcome.now.length === 1 ? 'route' : 'routes'} into Class ${romanClass(answers.currentClass! + 1)}`
                    : `No recorded exam or admission route into Class ${romanClass(answers.currentClass! + 1)}`}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  These may fit based on what you told us. Confirm age limits, residence and every other rule in the official notice before applying — we cannot guarantee eligibility or admission.
                </p>
                <div className="mt-4 space-y-4">
                  {outcome.now.map((r) => <FinderCard key={r.exam.slug} result={r} />)}
                </div>
                {outcome.now.length === 0 && (
                  <p className="card mt-4 p-5 text-sm text-slate-600">
                    For Class {romanClass(answers.currentClass! + 1)}, admission is usually through the school itself. Browse <Link to="/schools" className="link">schools</Link> or the <Link to="/admissions" className="link">admissions calendar</Link>.
                  </p>
                )}
              </div>
              {outcome.later.length > 0 && (
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">For later years</h2>
                  <div className="mt-3 space-y-4">{outcome.later.map((r) => <FinderCard key={r.exam.slug} result={r} />)}</div>
                </div>
              )}
              {outcome.excluded.length > 0 && (
                <details className="card p-5 text-sm">
                  <summary className="cursor-pointer font-semibold text-ink">Not a match ({outcome.excluded.length})</summary>
                  <ul className="mt-3 space-y-1 text-slate-600">
                    {outcome.excluded.map(({ exam, reason }) => (
                      <li key={exam.slug}><Link to={`/exams/${exam.slug}`} className="link">{exam.shortName}</Link>: {reason}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function FinderCard({ result }: { result: FinderResult }) {
  const { exam, reasons } = result;
  // Eligibility rules come from the full guide; loaded per card so the finder works with the list alone.
  const detail = useApi(() => examService.get(exam.slug), [exam.slug]);
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-bold text-ink"><Link to={`/exams/${exam.slug}`} className="hover:text-brand-700">{exam.shortName}</Link></h3>
          <p className="text-sm text-slate-700">{exam.name}</p>
        </div>
        <span className="flex items-center gap-2"><ExamStatusBadge status={exam.status} /><SaveExamButton slug={exam.slug} name={exam.shortName} compact /></span>
      </div>
      <ApplicationWindow exam={exam} />
      <h4 className="mt-4 text-sm font-semibold text-ink">Why it may fit</h4>
      <ul className="mt-1 space-y-1 text-sm text-slate-700">
        {reasons.map((r) => <li key={r} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{r}</li>)}
      </ul>
      <h4 className="mt-4 text-sm font-semibold text-ink">Confirm in the official notice</h4>
      {detail.data ? (
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{detail.data.content.eligibility.map((e) => <li key={e}>{e}</li>)}</ul>
      ) : <p className="mt-1 text-sm text-slate-500">Loading the eligibility rules…</p>}
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to={`/exams/${exam.slug}`} className="link">Full guide →</Link>
        <Link to={`/exams/${exam.slug}?tab=dates`} className="link">Dates & notices</Link>
      </div>
    </article>
  );
}

/** Where the current cycle's applications stand, so a match is never mistaken for "you can still apply". */
function ApplicationWindow({ exam }: { exam: ExamSummary }) {
  const today = isoToday();
  const deadline = exam.applicationDeadline;
  const late = exam.currentDates.find((d) => d.kind === 'LATE_APPLICATION_END' && isFirm(d));
  const lastDayToApply = late ? lastDay(late) : deadline;
  let text: string;
  let tone: string;
  if (exam.status === 'APPLICATIONS_OPEN' || exam.status === 'DEADLINE_APPROACHING') {
    text = `Applications for ${exam.currentCycle} are open until ${formatExamDate({ startsOn: lastDayToApply!, endsOn: null, precision: 'DAY' })}.`;
    tone = 'bg-emerald-50 text-emerald-900';
  } else if (exam.status === 'APPLICATIONS_OPENING_SOON') {
    text = `Applications for ${exam.currentCycle} have not opened yet — see the dates in the guide.`;
    tone = 'bg-sky-50 text-sky-900';
  } else if (exam.status === 'AWAITING_NOTIFICATION') {
    text = `Dates for ${exam.currentCycle} have not been announced yet.`;
    tone = 'bg-slate-100 text-slate-700';
  } else if (lastDayToApply && lastDayToApply < today) {
    text = `Applications for ${exam.currentCycle} closed on ${formatExamDate({ startsOn: lastDayToApply, endsOn: null, precision: 'DAY' })}.`
      + (exam.examDate && exam.examDate >= today ? ` Registered candidates sit the test on ${formatExamDate({ startsOn: exam.examDate, endsOn: null, precision: 'DAY' })}.` : '');
    tone = 'bg-amber-50 text-amber-900';
  } else {
    text = `Applications for ${exam.currentCycle} are closed.`;
    tone = 'bg-amber-50 text-amber-900';
  }
  return <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${tone}`}>{text}</p>;
}

// --- Exam calendar --------------------------------------------------------------------------------------------------

export function ExamCalendarPage() {
  useDocumentTitle('School entrance exam calendar');
  const [params, setParams] = useSearchParams();
  const exams = useApi(() => examService.all(), []);
  const states = useStates();
  const saved = useLocalList(savedExams);
  const today = isoToday();
  const cls = Number(params.get('class')) || null;
  const state = params.get('state') ?? '';
  const onlySaved = params.get('saved') === '1';
  const showPast = params.get('past') === '1';
  const set = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const shown = (exams.data ?? []).filter((e) => (!cls || e.entryClasses.includes(cls))
    && (!state || e.scope === 'NATIONAL' || e.stateCodes.includes(state))
    && (!onlySaved || saved.includes(e.slug)));
  const events: ExamEvent[] = shown
    .flatMap((exam) => exam.currentDates.map((date) => ({ exam, date })))
    .filter(({ date }) => showPast || lastDay(date) >= today)
    .sort((a, b) => a.date.startsOn.localeCompare(b.date.startsOn));
  const months = [...new Set(events.map((e) => e.date.startsOn.slice(0, 7)))];
  const firm = events.filter((e) => isFirm(e.date) && lastDay(e.date) >= today);
  const noDates = shown.filter((e) => e.currentDates.length === 0);
  const savedButMissing = onlySaved && saved.length === 0;

  return (
    <>
      <PageHeader eyebrow="Exam calendar" title="School entrance exam calendar"
        subtitle="Application deadlines, admit cards and exam dates for the current cycle of each exam, month by month. Add confirmed dates to your own calendar with a reminder the day before.">
        <ExamToolLinks current="calendar" />
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <div className="card flex flex-wrap items-end gap-3 p-4 text-sm">
          <label><span className="label">Admission to class</span>
            <select className="input" value={cls ?? ''} onChange={(e) => set('class', e.target.value || null)}>
              <option value="">Any class</option>
              {[...new Set((exams.data ?? []).flatMap((e) => e.entryClasses))].sort((a, b) => a - b)
                .map((c) => <option key={c} value={c}>Class {romanClass(c)}</option>)}
            </select>
          </label>
          <label><span className="label">Your state or UT</span>
            <select className="input" value={state} onChange={(e) => set('state', e.target.value || null)}>
              <option value="">All of India</option>
              {states.list.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-2.5"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={onlySaved} onChange={(e) => set('saved', e.target.checked ? '1' : null)} /> Only my saved exams ({saved.length})</label>
          <label className="flex items-center gap-2 pb-2.5"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={showPast} onChange={(e) => set('past', e.target.checked ? '1' : null)} /> Show dates that have passed</label>
          <button type="button" disabled={firm.length === 0} className="btn-primary ml-auto disabled:opacity-50"
            onClick={() => downloadIcs('entrance-exam-dates.ics', firm.map(({ exam, date }) => ({ examSlug: exam.slug, examName: exam.shortName, date })))}>
            <Icon name="calendar" className="h-4 w-4" /> Add {firm.length} confirmed date{firm.length === 1 ? '' : 's'} to my calendar
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Calendar entries and reminders are for your convenience only. Conducting bodies change dates — always follow the latest official notice. Tentative dates are shown but never added to calendars.
        </p>

        <AsyncContent state={exams} isEmpty={() => false}>
          {() => savedButMissing ? (
            <div className="card p-6 text-sm text-slate-600">You haven&apos;t saved any exams yet. Use “Save” on an exam to follow its dates here.</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div className="min-w-0 space-y-6">
                {months.length === 0 && <p className="card p-6 text-sm text-slate-600">No dates ahead for these exams. Turn on “Show dates that have passed” to see the current cycle in full.</p>}
                {months.map((m) => (
                  <section key={m} aria-labelledby={`m-${m}`}>
                    <h2 id={`m-${m}`} className="font-display text-lg font-bold text-ink">
                      {new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </h2>
                    <ol className="mt-2 space-y-2">
                      {events.filter((e) => e.date.startsOn.startsWith(m)).map(({ exam, date }) => (
                        <CalendarRow key={`${exam.slug}-${date.kind}-${date.startsOn}-${date.label}`} exam={exam} date={date} today={today} />
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
              <aside className="card h-fit p-5 text-sm">
                <h2 className="font-display text-lg font-bold text-ink">Awaiting dates</h2>
                {noDates.length === 0 ? <p className="mt-2 text-slate-600">Every exam shown has published dates for its current cycle.</p> : (
                  <ul className="mt-2 space-y-2">
                    {noDates.map((e) => (
                      <li key={e.slug}>
                        <Link to={`/exams/${e.slug}`} className="font-medium text-ink hover:text-brand-700">{e.shortName}</Link>
                        <span className="block text-xs text-slate-500">{e.currentCycle}: not announced yet</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-4 text-xs text-slate-500">These appear in the calendar once the official notice gives the dates.</p>
              </aside>
            </div>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

function CalendarRow({ exam, date, today }: { exam: ExamSummary; date: ExamEvent['date']; today: string }) {
  const firm = isFirm(date);
  const passed = lastDay(date) < today;
  const days = firm && !passed ? daysBetween(today, date.startsOn < today ? lastDay(date) : date.startsOn) : null;
  return (
    <li className={`card p-4 text-sm sm:flex sm:items-center sm:gap-4 ${passed ? 'opacity-70' : ''}`}>
      <span className="flex items-baseline justify-between gap-3 sm:w-40 sm:shrink-0 sm:flex-col sm:gap-0">
        <span className="font-semibold text-ink">{formatExamDate(date)}</span>
        <span className="text-xs text-slate-600">
          {days !== null ? countdown(days) : passed ? 'passed' : date.confirmed ? 'month confirmed' : 'tentative'}
        </span>
      </span>
      <span className="mt-1 block min-w-0 flex-1 sm:mt-0">
        <Link to={`/exams/${exam.slug}?tab=dates`} className="font-semibold text-ink hover:text-brand-700">{exam.shortName}</Link>
        <span className="text-slate-600"> · {date.label}</span>
        <span className="block text-xs text-slate-500">{examDateKindLabel[date.kind]} · {date.cycle}</span>
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-3 sm:mt-0">
        <a href={date.sourceUrl} target="_blank" rel="noopener noreferrer" className="link text-xs">Official notice ↗</a>
        {firm && !passed && (
          <button type="button" className="btn-secondary py-1 text-xs"
            onClick={() => downloadIcs(`${exam.slug}-${date.kind.toLowerCase()}.ics`, [{ examSlug: exam.slug, examName: exam.shortName, date }])}
            aria-label={`Add ${exam.shortName} ${date.label} to my calendar`}>
            <Icon name="calendar" className="h-3.5 w-3.5" /> Add
          </button>
        )}
      </span>
    </li>
  );
}
