import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ExamContent, ExamSummary } from '../../types/api';
import { daysBetween, isoToday } from '../../utils/exams';
import { buildPlan, subjectsFrom } from '../../utils/studyPlan';
import { Icon } from '../common/Icon';

const PHASE: Record<'learn' | 'practice' | 'revise', { label: string; tone: string }> = {
  learn: { label: 'Learn', tone: 'bg-brand-50 text-brand-800' },
  practice: { label: 'Timed practice', tone: 'bg-amber-50 text-amber-900' },
  revise: { label: 'Mocks & revision', tone: 'bg-emerald-50 text-emerald-800' },
};

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Builds a week-by-week plan from the exam's official syllabus and marks for the time the family has. Guidance only;
 * shown only when the official pattern publishes enough to plan from.
 */
export function StudyPlanner({ exam, content }: { exam: ExamSummary; content: ExamContent }) {
  const today = isoToday();
  const subjects = useMemo(() => subjectsFrom(content), [content]);
  const daysToExam = exam.examDate && exam.examDate > today ? daysBetween(today, exam.examDate) : null;
  const choices = [30, 60, 90];
  const [days, setDays] = useState<number>(daysToExam && daysToExam >= 7 && daysToExam <= 365 ? daysToExam : 60);
  const [minutes, setMinutes] = useState(90);
  const plan = useMemo(() => buildPlan(subjects, days, minutes), [subjects, days, minutes]);

  if (subjects.length === 0) {
    return (
      <section className="card p-6 text-sm text-slate-600">
        <h2 className="font-display text-lg font-bold text-ink">Study planner</h2>
        <p className="mt-2">The official notice does not publish a subject-wise syllabus or marks for this exam, so we cannot build a plan from it. Use the steps below and the official notice.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="planner-heading" className="card p-6 print:shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="planner-heading" className="font-display text-lg font-bold text-ink">Build a study plan</h2>
          <p className="mt-1 text-sm text-slate-600">
            Spreads the official syllabus over your time and weights daily practice by marks. India School Finder guidance — not issued by the exam body, and no plan can promise a result.
          </p>
        </div>
        <button type="button" onClick={() => window.print()} className="btn-secondary py-1.5 text-sm print:hidden"><Icon name="list" className="h-4 w-4" /> Print plan</button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4 text-sm print:hidden">
        <fieldset>
          <legend className="label">Time until the exam</legend>
          <div className="flex flex-wrap gap-2">
            {daysToExam && daysToExam >= 7 && daysToExam <= 365 && (
              <label className={`chip cursor-pointer px-3 py-1.5 ring-1 ${days === daysToExam ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200'}`}>
                <input type="radio" name="plan-days" className="sr-only" checked={days === daysToExam} onChange={() => setDays(daysToExam)} />
                Until the exam ({daysToExam} days)
              </label>
            )}
            {choices.map((d) => (
              <label key={d} className={`chip cursor-pointer px-3 py-1.5 ring-1 ${days === d ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-slate-700 ring-slate-200'}`}>
                <input type="radio" name="plan-days" className="sr-only" checked={days === d} onChange={() => setDays(d)} />
                {d} days
              </label>
            ))}
          </div>
        </fieldset>
        <label><span className="label">Study time per day</span>
          <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
            {[45, 60, 90, 120].map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-ink">Each day, about</h3>
        <ul className="mt-2 flex flex-wrap gap-2 text-sm">
          {plan.daily.map((d) => <li key={d.subject} className="chip bg-slate-100 px-3 py-1 text-slate-800">{d.subject}: {d.minutes} min</li>)}
        </ul>
      </div>

      <ol className="mt-5 space-y-3">
        {plan.weeks.map((w) => (
          <li key={w.n} className="rounded-xl border border-slate-200 p-4 text-sm print:break-inside-avoid">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">Week {w.n}</span>
              <span className="text-slate-500">{addDays(today, w.fromDay - 1)} – {addDays(today, w.toDay - 1)}</span>
              <span className={`chip ${PHASE[w.phase].tone}`}>{PHASE[w.phase].label}</span>
            </div>
            {w.focus.length > 0 && (
              <dl className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {w.focus.map((f) => (
                  <div key={f.subject}>
                    <dt className="font-medium text-ink">{f.subject}</dt>
                    <dd className="text-slate-700">{f.topics.join('; ')}</dd>
                  </div>
                ))}
              </dl>
            )}
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-slate-600">{w.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs text-slate-500 print:hidden">
        For timed practice use the official papers in this guide and our <Link to="/exams/practice" className="link">practice tests</Link>. Topics come from the official syllabus for {exam.currentCycle}; check the latest notice.
      </p>
    </section>
  );
}
