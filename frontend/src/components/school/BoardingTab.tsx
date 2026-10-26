import { Link } from 'react-router-dom';
import type { BoardingProfile } from '../../types/api';
import { boardingTypeLabel, entranceExamInfo, formatDate, residentialSystemLabel } from '../../utils/format';
import { SourceLink, VerificationBadge } from '../common/Badges';

/** Boarding profile of a residential school; each blank field is shown as "not stated by the source". */
export function BoardingTab({ boarding }: { boarding: BoardingProfile }) {
  const exam = boarding.entranceExam ? entranceExamInfo[boarding.entranceExam] : null;
  const rows: [string, string | null][] = [
    ['Accommodation', boarding.accommodation],
    ['Pastoral care and supervision', boarding.pastoralCare],
    ['Dining', boarding.dining],
    ['Medical care', boarding.medicalCare],
    ['Nearest transport', boarding.nearestTransport],
    ['Academic session', boarding.academicSession],
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold text-ink">Boarding and residential life</h2>
          <VerificationBadge status={boarding.verificationStatus} date={boarding.lastVerifiedDate} />
        </div>
        {boarding.summary && <p className="mt-3 text-sm leading-relaxed text-slate-700">{boarding.summary}</p>}
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">School system</dt>
            <dd className="mt-1 text-sm">{residentialSystemLabel[boarding.residentialSystem]}
              {boarding.governmentSystem && <span className="text-slate-500"> · government</span>}
              {boarding.defenceOriented && <span className="text-slate-500"> · defence-oriented</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Boarding arrangement</dt>
            <dd className="mt-1 text-sm">
              {boarding.boardingType ? boardingTypeLabel[boarding.boardingType]
                : <span className="text-slate-500">Residential; whether every student boards is not stated</span>}
            </dd>
          </div>
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
              <dd className="mt-1 text-sm">{value ?? <span className="text-slate-500">Not stated by the source</span>}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
          Source: <SourceLink url={boarding.sourceUrl} />
          {boarding.lastVerifiedDate && <> · verified {formatDate(boarding.lastVerifiedDate)}</>}.
          We list only what the source states and never assume a facility exists.
        </p>
      </section>
      <aside className="space-y-4">
        <div className="card p-5">
          <p className="eyebrow">Admission route</p>
          <p className="mt-1 font-display font-bold text-ink">{exam?.label ?? 'Not stated'}</p>
          {boarding.entryClasses && <p className="mt-1 text-sm text-slate-600">Entry: {boarding.entryClasses}</p>}
          {exam?.guide && <Link to={`/exams/${exam.guide}`} className="link mt-3 inline-block text-sm">Eligibility, pattern and preparation →</Link>}
          <p className="mt-3 text-xs text-slate-500">Eligibility rules differ between school systems; check the official notification for the current cycle.</p>
        </div>
        <Link to={`/boarding?system=${boarding.residentialSystem}`} className="btn-secondary w-full rounded-full">
          More {residentialSystemLabel[boarding.residentialSystem]}s
        </Link>
      </aside>
    </div>
  );
}
