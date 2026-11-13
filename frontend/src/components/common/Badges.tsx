import type { AdmissionStatus, VerificationStatus } from '../../types/api';
import { admissionStatusLabel, formatDate, verificationLabel } from '../../utils/format';

const admissionStyles: Record<AdmissionStatus, string> = {
  OPEN: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  UPCOMING: 'bg-amber-100 text-amber-800 ring-amber-600/20',
  CLOSED: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  NOT_ANNOUNCED: 'bg-slate-100 text-slate-600 ring-slate-400/20',
};

export function AdmissionStatusBadge({ status, overridden }: { status: AdmissionStatus; overridden?: boolean }) {
  return (
    <span className={`chip ring-1 ring-inset ${admissionStyles[status]}`} title={overridden ? 'Set by an administrator from an official notice' : undefined}>
      {admissionStatusLabel[status]}
      {overridden && <span aria-hidden> *</span>}
    </span>
  );
}

const verificationStyles: Record<VerificationStatus, string> = {
  VERIFIED: 'bg-emerald-50 text-emerald-700',
  UNVERIFIED: 'bg-amber-50 text-amber-700',
  OUTDATED: 'bg-orange-50 text-orange-700',
  DISPUTED: 'bg-red-50 text-red-700',
};

/**
 * A record's verification status. Visitors see only positive or cautionary states (verified, outdated, disputed); a
 * record not yet checked by an editor shows nothing, since its source is linked beside it. Admin screens pass `admin`
 * to see every state.
 */
export function VerificationBadge({ status, date, admin = false }: { status: VerificationStatus; date?: string | null; admin?: boolean }) {
  if (status === 'UNVERIFIED' && !admin) return null;
  const title = status === 'VERIFIED' && date ? `Verified on ${formatDate(date)}` : verificationLabel[status];
  return (
    <span className={`chip ${verificationStyles[status]}`} title={title}>
      {status === 'VERIFIED' ? '✓ ' : ''}
      {verificationLabel[status]}
    </span>
  );
}

/**
 * When a fee or admission fact was last confirmed, in words a parent trusts: verified by an editor on a date; or, before
 * that, taken from the official document linked beside it and when it was last updated from it.
 */
export function TrustBadge({ status, verifiedOn, updatedOn, hasSource, kind = 'notice' }: {
  status: VerificationStatus; verifiedOn?: string | null; updatedOn?: string | null; hasSource: boolean; kind?: 'notice' | 'schedule';
}) {
  if (status === 'VERIFIED') {
    return (
      <span className="chip bg-emerald-50 text-emerald-700" title="Checked by an editor against the official source">
        ✓ Verified{verifiedOn ? ` ${formatDate(verifiedOn)}` : ''}
      </span>
    );
  }
  if (status === 'UNVERIFIED' && hasSource) {
    const what = kind === 'schedule' ? 'Official fee schedule' : 'Official notice';
    return (
      <span className="chip bg-sky-50 text-sky-800" title={`Taken from the ${what.toLowerCase()} linked here. An editor has not re-checked it yet.`}>
        {what}{updatedOn ? ` · updated ${formatDate(updatedOn.slice(0, 10))}` : ''}
      </span>
    );
  }
  return <VerificationBadge status={status} date={verifiedOn} />;
}

export function ProvisionalBadge() {
  return (
    <span className="chip bg-violet-50 text-violet-700" title="Based on incomplete evidence; no rank position is given">
      Provisional
    </span>
  );
}

export function SourceLink({ url, label = 'Source' }: { url: string | null | undefined; label?: string }) {
  if (!url) return null;
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    /* keep raw */
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="text-xs text-slate-500 underline-offset-2 hover:underline">
      {label}: {host} ↗
    </a>
  );
}

export function Stars({ rating, size = 'sm' }: { rating: number | null; size?: 'sm' | 'lg' }) {
  if (rating === null) return <span className="text-xs text-slate-500">No ratings yet</span>;
  const rounded = Math.round(rating * 2) / 2;
  return (
    <span className={`inline-flex items-center gap-1 ${size === 'lg' ? 'text-lg' : 'text-sm'}`} aria-label={`${rating.toFixed(1)} out of 5`}>
      <span className="text-amber-500" aria-hidden>
        {'★'.repeat(Math.floor(rounded))}
        {rounded % 1 ? '½' : ''}
        <span className="text-slate-300">{'★'.repeat(5 - Math.ceil(rounded))}</span>
      </span>
      <span className="font-medium text-slate-700">{rating.toFixed(1)}</span>
    </span>
  );
}

/**
 * The one label for anything paid: "Sponsored" on a promoted school or article, "Advertisement" on an ad unit. Paid
 * placements always carry it, never sit inside rankings or school facts, and never change a rank or a fact.
 */
export function PaidLabel({ kind = 'Sponsored', className = '' }: { kind?: 'Sponsored' | 'Advertisement'; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600 ring-1 ring-inset ring-slate-300 ${className}`}>
      {kind}
    </span>
  );
}
