import { Link } from 'react-router-dom';
import type { ExamStatus, ExamSummary } from '../../types/api';
import { formatDate } from '../../utils/format';
import { examBoardingLabel, examModeLabel } from '../../utils/exams';
import { scopeText } from './ExamCard';

/** Statuses in which the exam date is still ahead; the server's SeoHeadService.examDateSentence uses the same four. */
const AHEAD: ExamStatus[] = ['APPLICATIONS_OPEN', 'DEADLINE_APPROACHING', 'APPLICATIONS_OPENING_SOON', 'EXAM_DATE_ANNOUNCED'];

/** "28 Nov 2026" while ahead, "Held on 28 Nov 2026" once passed: a past date is never offered as the next one. */
export function examDateText(e: Pick<ExamSummary, 'examDate' | 'status'>): string {
  if (!e.examDate) return e.status === 'AWAITING_NOTIFICATION' ? 'Not announced yet' : 'No confirmed date';
  return AHEAD.includes(e.status) ? formatDate(e.examDate) : `Held on ${formatDate(e.examDate)}`;
}

export function applicationText(free: boolean | null): string {
  return free === null ? 'Not stated' : free ? 'Free' : 'Fee charged';
}

/**
 * The exams for one class side by side: who runs each, who can apply, the kind of school, the exam date, the application
 * fee, the mode and the official source, all from the exams' own records, each checked against its notice. The server
 * writes the same table into the page's HTML (SeoBodyService.examTable), for search engines and AI assistants that do
 * not run the app.
 */
export function ExamComparison({ exams, stateName, caption }: {
  exams: ExamSummary[];
  stateName: (code: string) => string;
  caption: string;
}) {
  return (
    <section aria-labelledby="exam-compare" className="space-y-2">
      <h2 id="exam-compare" className="font-display text-xl font-bold text-ink">Compare at a glance</h2>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">Exam</th>
              <th scope="col" className="px-4 py-3">Who can apply</th>
              <th scope="col" className="px-4 py-3">Schools</th>
              <th scope="col" className="px-4 py-3">Exam date</th>
              <th scope="col" className="px-4 py-3">Application</th>
              <th scope="col" className="px-4 py-3">Mode</th>
              <th scope="col" className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {exams.map((e) => (
              <tr key={e.slug} className="align-top">
                <th scope="row" className="px-4 py-3 font-normal">
                  <Link to={`/exams/${e.slug}`} className="font-semibold text-ink hover:text-brand-700">{e.shortName}</Link>
                  <span className="mt-0.5 block text-xs text-slate-500">{e.conductingAuthority}</span>
                </th>
                <td className="px-4 py-3 text-slate-700">{scopeText(e, stateName)}</td>
                <td className="px-4 py-3 text-slate-700">{examBoardingLabel[e.boarding]}</td>
                <td className="px-4 py-3 text-slate-700">
                  {examDateText(e)}
                  <span className="mt-0.5 block text-xs text-slate-500">{e.currentCycle}</span>
                </td>
                <td className="px-4 py-3 text-slate-700">{applicationText(e.applicationFree)}</td>
                <td className="px-4 py-3 text-slate-700">{e.examMode ? examModeLabel[e.examMode] : 'Not stated'}</td>
                <td className="px-4 py-3">
                  <a href={e.officialUrl} target="_blank" rel="noopener noreferrer" className="link whitespace-nowrap">Official site ↗</a>
                  {e.lastVerifiedOn && <span className="mt-0.5 block text-xs text-slate-500">Checked {formatDate(e.lastVerifiedOn)}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
