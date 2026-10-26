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

export function VerificationBadge({ status, date }: { status: VerificationStatus; date?: string | null }) {
  const title = status === 'VERIFIED' && date ? `Verified on ${formatDate(date)}` : verificationLabel[status];
  return (
    <span className={`chip ${verificationStyles[status]}`} title={title}>
      {status === 'VERIFIED' ? '✓ ' : ''}
      {verificationLabel[status]}
    </span>
  );
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
