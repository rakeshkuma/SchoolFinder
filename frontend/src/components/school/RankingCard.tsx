import { Link } from 'react-router-dom';
import type { SchoolRanking } from '../../types/api';
import { formatMoneyCompact, schoolTypeLabel } from '../../utils/format';
import { ProvisionalBadge } from '../common/Badges';
import { Icon } from '../common/Icon';
import { CompareButton } from './CompareBar';
import { photoCreditTitle, SchoolCover } from './SchoolCard';

/**
 * One school in a ranking. Fees, classes, photo and admission status are shown for context only; they are never part of
 * the score. Facts that are not published are shown as "not published", never estimated.
 */
export function RankingCard({ r, showIndiaRank }: { r: SchoolRanking; showIndiaRank: boolean }) {
  const card = r.card;
  const board = r.boardCode === 'CISCE' ? 'ICSE/ISC' : r.boardCode === 'STATE' ? 'State board' : r.boardCode;
  const place = [r.locality, r.city, r.districtName, r.stateName].filter((v, i, a) => v && a.indexOf(v) === i).join(', ');
  const classes = r.lowestClass && r.highestClass
    ? r.lowestClass === r.highestClass ? r.lowestClass : `${r.lowestClass} – ${r.highestClass}`
    : null;
  const strongest = r.breakdown
    .filter((c) => c.dataAvailable && c.normalizedScore !== null)
    .sort((a, b) => (b.normalizedScore ?? 0) - (a.normalizedScore ?? 0))
    .slice(0, 2);

  return (
    <article className="card card-hover group flex flex-col overflow-hidden sm:flex-row">
      <Link to={`/schools/${r.slug}?tab=ranking`} className="relative block h-36 shrink-0 bg-slate-100 sm:h-auto sm:w-48" tabIndex={-1} aria-hidden>
        {card?.coverImageUrl ? (
          <img src={card.coverImageUrl} alt="" loading="lazy" title={photoCreditTitle(card)} className="h-full w-full object-cover" />
        ) : (
          <SchoolCover name={r.schoolName} />
        )}
        {card?.coverImageUrl && card.coverImageIllustrative && card.coverImageCredit && (
          <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 text-[10px] text-white">{card.coverImageCredit}</span>
        )}
        <span className="absolute left-3 top-3">
          {r.scopePosition ? (
            <span className="rounded-xl bg-white/95 px-2.5 py-1 font-display text-lg font-extrabold text-ink shadow-sm">#{r.scopePosition}</span>
          ) : (
            <ProvisionalBadge />
          )}
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="min-w-0 flex-1 basis-56">
            <h3 className="font-display text-[17px] font-bold leading-snug">
              {/* The visual badge sits on the (aria-hidden) photo link, so the status is repeated for screen readers. */}
              <span className="sr-only">{r.scopePosition ? `Rank ${r.scopePosition}: ` : 'Provisional, no rank: '}</span>
              <Link to={`/schools/${r.slug}?tab=ranking`} className="hover:text-brand-700">{r.schoolName}</Link>
            </h3>
            <p className="mt-0.5 flex items-start gap-1 text-sm text-slate-500">
              <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0">{place || 'Location not available'}</span>
            </p>
            {showIndiaRank && r.scopePosition && r.rankPosition && (
              <p className="text-xs text-slate-500">#{r.rankPosition} in India</p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-2xl font-extrabold tabular-nums text-ink">
              {r.totalScore.toFixed(1)}<span className="text-sm font-medium text-slate-500">/100</span>
            </p>
            <p className="text-[11px] text-slate-500">{r.coveragePercent}% evidence · {r.verifiedCoveragePercent ?? 0}% verified</p>
          </div>
        </div>

        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden>
          <div className="relative h-full rounded-full bg-brand-200" style={{ width: `${r.coveragePercent}%` }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-brand-600"
              style={{ width: r.coveragePercent > 0 ? `${((r.verifiedCoveragePercent ?? 0) / r.coveragePercent) * 100}%` : 0 }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {board ? <span className="chip bg-slate-100 font-semibold text-ink">{board}</span>
            : <span className="chip bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200">Board not stated</span>}
          <span className="chip bg-slate-100 text-slate-700">{schoolTypeLabel[r.schoolType]}</span>
          {card?.hasHostel && <span className="chip bg-amber-50 text-amber-800">Boarding</span>}
          {card?.admissionStatus === 'OPEN' && <span className="chip bg-emerald-700 font-semibold text-white">Admissions open</span>}
          {card?.admissionStatus === 'UPCOMING' && <span className="chip bg-accent-400 font-semibold text-ink">Admissions soon</span>}
          {strongest.map((c) => (
            <span key={c.criterionCode} className="chip bg-brand-50 text-brand-700" title={c.evidenceNote ?? undefined}>
              {c.criterionName} {c.normalizedScore}
              {c.verified === false && <span className="ml-0.5 text-amber-700" aria-label="documented, not verified">*</span>}
            </span>
          ))}
        </div>

        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">Classes</dt>
            <dd className="font-medium text-ink">{classes ?? 'Not published'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Annual fee from</dt>
            <dd className="font-medium text-ink">
              {card?.annualFeeFrom != null
                ? <>{card.annualFeeFrom === 0 ? 'Free' : formatMoneyCompact(card.annualFeeFrom)} <span className="text-slate-500">{card.annualFeeYear}</span></>
                : 'Not published'}
            </dd>
          </div>
          <div className="hidden sm:block">
            <dt className="text-slate-500">Profile</dt>
            <dd className="font-medium text-ink">{card?.verificationStatus === 'VERIFIED' ? 'Verified' : 'Not yet verified'}</dd>
          </div>
        </dl>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          <Link to={`/schools/${r.slug}?tab=ranking`} className="btn-ghost rounded-full px-3 py-1.5 text-xs">Score breakdown</Link>
          <Link to={`/schools/${r.slug}?tab=fees`} className="btn-ghost rounded-full px-3 py-1.5 text-xs">Fees</Link>
          <span className="ml-auto"><CompareButton id={r.schoolId} name={r.schoolName} slug={r.slug} /></span>
        </div>
      </div>
    </article>
  );
}
