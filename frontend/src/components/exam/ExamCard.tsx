import { Link } from 'react-router-dom';
import { savedExams, useLocalList } from '../../hooks/usePersonal';
import { Icon } from '../common/Icon';
import type { ExamStatus, ExamSummary } from '../../types/api';
import { formatDate } from '../../utils/format';
import {
  classLabel, countdown, daysBetween, examBoardingLabel, examDateKindLabel, examStatusHelp, examStatusLabel, examStatusStyle,
  formatExamDate, isoToday,
} from '../../utils/exams';

/** Saves an exam in this browser only (no account); used by the calendar's "my saved exams" view. */
export function SaveExamButton({ slug, name, compact }: { slug: string; name: string; compact?: boolean }) {
  const saved = useLocalList(savedExams).includes(slug);
  return (
    <button type="button" aria-pressed={saved} onClick={() => (saved ? savedExams.remove(slug) : savedExams.add(slug))}
      aria-label={saved ? `Remove ${name} from saved exams` : `Save ${name}`}
      className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
        saved ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'}`}>
      <Icon name="heart" className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
      {compact ? (saved ? 'Saved' : 'Save') : saved ? 'Saved' : 'Save exam'}
    </button>
  );
}

export function ExamStatusBadge({ status }: { status: ExamStatus }) {
  return (
    <span className={`chip whitespace-nowrap ring-1 ring-inset ${examStatusStyle[status]}`} title={examStatusHelp[status]}>
      {examStatusLabel[status]}
    </span>
  );
}

/** "National" or the state names, for scope chips. */
export function scopeText(exam: Pick<ExamSummary, 'scope' | 'stateCodes'>, stateName: (code: string) => string): string {
  return exam.scope === 'NATIONAL' ? 'All India' : exam.stateCodes.map(stateName).join(', ');
}

export function ExamCard({ exam, stateName, linkState }: {
  exam: ExamSummary;
  stateName: (code: string) => string;
  /** Router state for the detail link, so its back link returns to the same filtered list. */
  linkState?: unknown;
}) {
  const today = isoToday();
  const next = exam.nextDate;
  const days = next ? daysBetween(today, next.startsOn < today ? (next.endsOn ?? next.startsOn) : next.startsOn) : null;
  return (
    <article className="card card-hover relative flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-bold text-ink">
          <Link to={`/exams/${exam.slug}`} state={linkState} className="after:absolute after:inset-0 hover:text-brand-700">
            {exam.shortName}
          </Link>
        </h3>
        <ExamStatusBadge status={exam.status} />
      </div>
      <p className="mt-1 text-sm text-slate-700">{exam.name}</p>
      <ul className="mt-3 flex flex-wrap gap-1.5 text-xs" aria-label="Key facts">
        <li className="chip bg-slate-100 text-slate-700">{classLabel(exam.entryClasses)}</li>
        <li className="chip bg-slate-100 text-slate-700">{scopeText(exam, stateName)}</li>
        <li className="chip bg-slate-100 text-slate-700">{examBoardingLabel[exam.boarding]}</li>
        {exam.applicationFree !== null && (
          <li className="chip bg-slate-100 text-slate-700">{exam.applicationFree ? 'Free application' : 'Application fee'}</li>
        )}
        {exam.kind === 'SELECTION_PROCESS' && <li className="chip bg-amber-50 text-amber-800">Admission process, not a test</li>}
      </ul>
      <p className="mt-3 text-xs text-slate-500">{exam.conductingAuthority}</p>
      <div className="mt-4 flex-1 rounded-xl bg-slate-50 p-3 text-sm">
        {next && days !== null ? (
          <p>
            <span className="text-slate-500">{examDateKindLabel[next.kind]}:</span>{' '}
            <span className="font-semibold text-ink">{formatExamDate(next)}</span>{' '}
            <span className="text-slate-600">({countdown(days)})</span>
          </p>
        ) : exam.status === 'AWAITING_NOTIFICATION' ? (
          <p className="text-slate-600">No confirmed dates yet for {exam.currentCycle}.</p>
        ) : (
          <p className="text-slate-600">No further confirmed dates for {exam.currentCycle}.</p>
        )}
        <p className="mt-1 text-xs text-slate-500">
          {exam.currentCycle}{exam.academicSession ? ` · session ${exam.academicSession}` : ''}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {exam.lastVerifiedOn ? `Checked against official sources on ${formatDate(exam.lastVerifiedOn)}` : 'Not yet verified'}
        </p>
        <SaveExamButton slug={exam.slug} name={exam.shortName} compact />
      </div>
    </article>
  );
}
