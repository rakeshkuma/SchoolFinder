import { Link } from 'react-router-dom';
import type { SchoolSummary } from '../../types/api';
import {
  boardingTypeLabel, entranceExamInfo, formatMoneyCompact, genderLabel, residentialSystemLabel,
} from '../../utils/format';
import { Icon } from '../common/Icon';
import { CompareButton } from './CompareBar';
import { photoCreditTitle, schoolPlace, SchoolCover } from './SchoolCard';

const boardLabel = (code: string | null) =>
  code === 'CISCE' ? 'ICSE/ISC' : code === 'STATE' ? 'State board' : code === 'IB' ? 'IB' : code;

/**
 * Image-led card for a residential school. Every fact comes from the directory record or its boarding profile; facts
 * that are not published are labelled, never estimated.
 */
export function BoardingCard({ school }: { school: SchoolSummary }) {
  const place = schoolPlace(school);
  const board = boardLabel(school.boardCode);
  const exam = school.entranceExam ? entranceExamInfo[school.entranceExam] : null;
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link to={`/schools/${school.slug}?tab=boarding`} className="relative block aspect-[16/9] bg-slate-100" tabIndex={-1} aria-hidden>
        {school.coverImageUrl ? (
          <img src={school.coverImageUrl} alt="" loading="lazy" decoding="async" title={photoCreditTitle(school)}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <SchoolCover name={school.name} />
        )}
        {school.coverImageUrl && school.coverImageIllustrative && school.coverImageCredit && (
          <span className="absolute bottom-1 right-1 max-w-[70%] truncate rounded bg-black/55 px-1.5 text-[10px] text-white">
            {school.coverImageCredit}
          </span>
        )}
        {school.residentialSystem && (
          <span className="absolute left-3 top-3 chip bg-white/95 font-semibold text-ink shadow-sm">
            {residentialSystemLabel[school.residentialSystem]}
          </span>
        )}
        {school.admissionStatus === 'OPEN' && (
          <span className="absolute right-3 top-3 chip bg-emerald-700 font-semibold text-white shadow-sm">Admissions open</span>
        )}
        {school.admissionStatus === 'UPCOMING' && (
          <span className="absolute right-3 top-3 chip bg-accent-400 font-semibold text-ink shadow-sm">Admissions soon</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[17px] font-bold leading-snug">
          <Link to={`/schools/${school.slug}?tab=boarding`} className="hover:text-brand-700">{school.name}</Link>
        </h3>
        <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
          <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">{place || 'Location not available'}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {board ? <span className="chip bg-slate-100 font-semibold text-ink">{board}</span>
            : <span className="chip bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200">Board not stated</span>}
          {school.genderType && <span className="chip bg-slate-100 text-slate-700">{genderLabel[school.genderType]}</span>}
          <span className="chip bg-brand-50 text-brand-700">
            {school.boardingType ? boardingTypeLabel[school.boardingType] : 'Boarding (arrangement not stated)'}
          </span>
          {school.boardingVerificationStatus === 'VERIFIED' && (
            <span className="chip bg-emerald-50 text-emerald-700"><Icon name="check" className="h-3 w-3" /> Verified profile</span>
          )}
        </div>
        {school.boardingSummary && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{school.boardingSummary}</p>}
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <dt className="text-slate-500">Entry</dt>
            <dd className="font-medium text-ink">{school.entryClasses ?? 'Not published'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Annual fee from</dt>
            <dd className="font-medium text-ink">
              {school.annualFeeFrom != null
                ? <>{school.annualFeeFrom === 0 ? 'Free' : formatMoneyCompact(school.annualFeeFrom)} <span className="text-slate-500">{school.annualFeeYear}</span></>
                : 'Not published'}
            </dd>
          </div>
          {exam && (
            <div className="col-span-2">
              <dt className="sr-only">Entrance</dt>
              <dd className="text-slate-600">
                Entrance: {exam.guide ? <Link to={`/exams/${exam.guide}`} className="link">{exam.label} guide</Link> : exam.label}
              </dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <Link to={`/schools/${school.slug}?tab=boarding`} className="btn-primary rounded-full px-3 py-1.5 text-xs">View details</Link>
          {school.websiteUrl && (
            <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="btn-ghost rounded-full px-3 py-1.5 text-xs">
              Official website <span aria-hidden>↗</span>
            </a>
          )}
          <span className="ml-auto"><CompareButton id={school.id} name={school.name} slug={school.slug} /></span>
        </div>
      </div>
    </article>
  );
}
