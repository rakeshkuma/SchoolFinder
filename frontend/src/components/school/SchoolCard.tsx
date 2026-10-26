import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { SchoolSummary, SchoolType } from '../../types/api';
import {
  NOT_AVAILABLE, facilityCategoryLabel, formatDate, formatMoneyCompact, networkLabel, placeLine, schoolTypeLabel,
} from '../../utils/format';
import { Stars } from '../common/Badges';
import { Icon } from '../common/Icon';
import { CompareButton } from './CompareBar';
import { SaveButton } from './SaveButton';

const PALETTES = [
  ['#1d31a7', '#3b66f5'],
  ['#0f766e', '#14b8a6'],
  ['#7c2d12', '#ea580c'],
  ['#4c1d95', '#8b5cf6'],
  ['#155e75', '#0ea5e9'],
  ['#831843', '#db2777'],
  ['#14532d', '#22c55e'],
  ['#1e293b', '#475569'],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|pm|shri)$/i.test(w));
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '🏫';
}

/**
 * Generated cover used when no official or licensed photo exists — a deterministic colour per school
 * with its monogram. We never show stock or unrelated photos.
 */
export function SchoolCover({ name, className = '', monogram = true }: { name: string; className?: string; monogram?: boolean }) {
  const [from, to] = PALETTES[hash(name) % PALETTES.length];
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
        <defs>
          <pattern id={`p-${hash(name)}`} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <path d="M0 14h28" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${hash(name)})`} />
      </svg>
      <div className="absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-white/10" aria-hidden />
      {monogram && (
        <span className="absolute bottom-3 left-4 font-display text-4xl font-extrabold tracking-tight text-white/95 drop-shadow-sm">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

const typeTone: Record<SchoolType, string> = {
  GOVERNMENT: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
  PRIVATE: 'bg-slate-100 text-slate-700 ring-slate-500/15',
  AIDED: 'bg-teal-50 text-teal-700 ring-teal-600/15',
  INTERNATIONAL: 'bg-violet-50 text-violet-700 ring-violet-600/15',
};

export function schoolPlace(s: Pick<SchoolSummary, 'locality' | 'city' | 'districtName' | 'stateName'>): string {
  return placeLine(s.locality, s.city ?? s.districtName, s.stateName);
}

/** "Nursery – XII", "Class XII" or null when the school's classes are not published. */
export function classRange(from: string | null, to: string | null): string | null {
  if (!from || !to) return null;
  return from === to ? from : `${from} – ${to}`;
}

const MAX_FACILITIES = 3;

/**
 * Photo with its credit, or the generated cover if there is no photo or it fails to load (the credit belongs to the
 * photo, so it is never shown over the fallback).
 */
function CardImage({ school }: { school: SchoolSummary }) {
  const [failed, setFailed] = useState(false);
  if (!school.coverImageUrl || failed) return <SchoolCover name={school.name} />;
  return (
    <>
      <img src={school.coverImageUrl} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
      {school.coverImageCredit && (
        <span className="absolute bottom-1 right-1 max-w-[85%] truncate rounded bg-black/55 px-1.5 text-[10px] text-white">
          {school.coverImageIllustrative ? school.coverImageCredit : `© ${school.coverImageCredit}`}
        </span>
      )}
    </>
  );
}

export function SchoolCard({ school }: { school: SchoolSummary }) {
  const board = school.boardCode === 'CISCE' ? 'ICSE/ISC' : school.boardCode === 'STATE' ? 'State board' : school.boardCode;
  const place = schoolPlace(school);
  const classes = classRange(school.classesFrom, school.classesTo);
  const facilities = school.facilityCategories ?? [];
  const verified = school.verificationStatus === 'VERIFIED';
  const checkedOn = verified ? school.lastVerifiedDate : school.sourceRetrievedDate;
  return (
    <article className="card card-hover group flex flex-col overflow-hidden">
      <Link to={`/schools/${school.slug}`} className="relative block aspect-[16/9] bg-slate-100" tabIndex={-1} aria-hidden>
        <CardImage school={school} />
        <div className="absolute right-3 top-3 flex gap-1.5">
          {board && <span className="chip bg-white/95 font-semibold text-ink shadow-sm">{board}</span>}
          {school.admissionStatus === 'OPEN' && (
            <span className="chip bg-emerald-700 font-semibold text-white shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> Admissions open
            </span>
          )}
          {school.admissionStatus === 'UPCOMING' && <span className="chip bg-accent-400 font-semibold text-ink shadow-sm">Admissions soon</span>}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[17px] font-bold leading-snug">
          <Link to={`/schools/${school.slug}`} className="hover:text-brand-700">
            {school.name}
          </Link>
        </h3>
        <p className="mt-1 flex items-start gap-1 text-sm text-slate-500">
          <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="min-w-0">
            {place || 'Location not available'}
            {school.pinCode && <span className="text-slate-500"> · {school.pinCode}</span>}
            {school.distanceKm !== null && <span className="ml-1 font-medium text-brand-700">· {school.distanceKm.toFixed(1)} km</span>}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className={`chip ring-1 ring-inset ${typeTone[school.schoolType]}`}>{schoolTypeLabel[school.schoolType]}</span>
          {school.network && (
            <span className="chip bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-600/15">{networkLabel[school.network]}</span>
          )}
          {school.hasHostel && <span className="chip bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/15">Boarding</span>}
          {!board && <span className="chip bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200">Board not stated</span>}
        </div>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-16 shrink-0 text-slate-500">Classes</dt>
            <dd className={classes ? 'text-ink' : 'text-slate-500'}>{classes ?? NOT_AVAILABLE}</dd>
          </div>
          {facilities.length > 0 && (
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 text-slate-500">Facilities</dt>
              <dd className="min-w-0 text-ink">
                {facilities.slice(0, MAX_FACILITIES).map((f) => facilityCategoryLabel[f]).join(' · ')}
                {facilities.length > MAX_FACILITIES && <span className="text-slate-500"> +{facilities.length - MAX_FACILITIES}</span>}
              </dd>
            </div>
          )}
        </dl>
        <p className={`mt-3 flex items-center gap-1 text-xs ${verified ? 'text-emerald-700' : 'text-slate-500'}`}>
          <Icon name={verified ? 'check' : 'info'} className="h-3.5 w-3.5 shrink-0" />
          {verified ? 'Verified by an editor' : 'From official source, not yet editor-verified'}
          {checkedOn && <span className="text-slate-500">· {formatDate(checkedOn)}</span>}
        </p>
        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="min-w-0">
              {school.annualFeeFrom !== null ? (
                <>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Annual fee from</p>
                  <p className="whitespace-nowrap font-display text-lg font-bold leading-tight text-ink">
                    {school.annualFeeFrom === 0 ? 'Free' : formatMoneyCompact(school.annualFeeFrom)}
                  </p>
                  {/* On its own line so narrow cards never push it under the buttons. */}
                  <p className="text-xs font-medium text-slate-500">{school.annualFeeYear}</p>
                </>
              ) : school.averageRating !== null ? (
                <div className="text-sm">
                  <Stars rating={school.averageRating} />
                  {school.reviewCount > 0 && <span className="ml-1 text-xs text-slate-500">({school.reviewCount})</span>}
                </div>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SaveButton school={{ id: school.id, name: school.name, slug: school.slug, place }} />
              <CompareButton id={school.id} name={school.name} slug={school.slug} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <Link to={`/schools/${school.slug}`} className="font-semibold text-brand-700 hover:text-brand-800">
              View details<span className="sr-only">: {school.name}</span> →
            </Link>
            {school.websiteUrl && (
              <a href={school.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:text-ink">
                Website <Icon name="external" className="h-3 w-3" /><span className="sr-only"> of {school.name} (opens in a new tab)</span>
              </a>
            )}
            {school.admissionPortalUrl ? (
              <a href={school.admissionPortalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-slate-600 hover:text-ink">
                Admissions <Icon name="external" className="h-3 w-3" /><span className="sr-only"> for {school.name} (opens in a new tab)</span>
              </a>
            ) : school.admissionStatus && (
              <Link to={`/schools/${school.slug}`} className="text-slate-600 hover:text-ink">
                Admissions<span className="sr-only"> at {school.name}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
