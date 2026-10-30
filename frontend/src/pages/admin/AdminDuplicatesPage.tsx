import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { DuplicateGroup, DuplicateReason } from '../../types/api';

export const reasonLabel: Record<DuplicateReason, string> = {
  SAME_NAME_IN_DISTRICT: 'Same name in one district',
  SAME_PHONE: 'Same phone number',
  SAME_LOCATION: 'Same map position',
  SAME_PHOTO: 'Same photo on two schools',
};

/** A group is identified by its reason and schools; the detail text is shared by many groups. */
export const groupKey = (g: DuplicateGroup) => `${g.reason}-${g.schools.map((s) => s.id).join('-')}`;

const message = (e: unknown) => (e instanceof ApiError ? e.message : 'Something went wrong.');

function GroupCard({ group, onDone }: { group: DuplicateGroup; onDone: (text: string) => void }) {
  const { isAdmin } = useAuth();
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState(group.schools[0].id);
  const run = async (fn: () => Promise<unknown>, done: string) => {
    setError(null);
    try {
      await fn();
      onDone(done);
    } catch (e) {
      setError(message(e));
    }
  };
  const others = group.schools.filter((s) => s.id !== keep);
  return (
    <li className="card space-y-2 p-4 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{reasonLabel[group.reason]}</p>
      <p className="break-all text-xs text-slate-500">{group.detail}</p>
      <ul className="space-y-1">
        {group.schools.map((s) => (
          <li key={s.id} className="flex flex-wrap items-baseline gap-2">
            <input type="radio" name={`keep-${groupKey(group)}`} aria-label={`Keep ${s.name}`} checked={keep === s.id} onChange={() => setKeep(s.id)} />
            <Link className="link" to={`/admin/schools/${s.id}`}>#{s.id} {s.name}</Link>
            <span className="text-xs text-slate-500">
              {[s.city, s.stateCode, s.pinCode].filter(Boolean).join(', ')}
              {s.affiliationNumber && ` · ${s.boardCode ?? 'Board'} ${s.affiliationNumber}`}
              {s.udiseCode && ` · UDISE ${s.udiseCode}`}
            </span>
            <Link className="text-xs text-slate-500 hover:underline" to={`/schools/${s.slug}`} target="_blank">public page ↗</Link>
          </li>
        ))}
      </ul>
      <input className="input text-xs" aria-label="Note" placeholder="Note, e.g. separate junior and senior campuses" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-secondary px-2 py-1 text-xs"
          onClick={() => run(() => adminService.dismissDuplicates(group.schools.map((s) => s.id), note || undefined), 'Marked as different schools.')}>
          Different schools
        </button>
        {group.reason !== 'SAME_PHOTO' && (isAdmin ? (
          <button type="button" className="btn-primary px-2 py-1 text-xs"
            onClick={() => window.confirm(`Deactivate ${others.map((s) => `#${s.id}`).join(', ')} as duplicate${others.length > 1 ? 's' : ''} of #${keep}?`)
              && run(() => Promise.all(others.map((s) => adminService.setStatus(s.id, false, `Duplicate of school #${keep}${note ? `: ${note}` : ''}`))),
                `Deactivated ${others.map((s) => `#${s.id}`).join(', ')}; #${keep} kept.`)}>
            Keep the selected school, deactivate the others
          </button>
        ) : <span className="text-xs text-slate-500">An administrator can deactivate a real duplicate.</span>)}
        {group.reason === 'SAME_PHOTO' && (
          <span className="text-xs text-slate-500">Open each school&apos;s <Link className="link" to={`/admin/images?school=${group.schools[0].id}`}>images</Link> and reject the photo where it is not that school.</span>
        )}
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
    </li>
  );
}

/** Schools that may be recorded twice. Suggestions only: an editor decides, and the decision is kept. */
export function AdminDuplicatesPage() {
  useDocumentTitle('Admin · Possible duplicates');
  const [nonce, setNonce] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [reason, setReason] = useState<DuplicateReason | ''>('');
  const report = useApi(() => adminService.duplicates(), [nonce]);
  const groups = (report.data?.groups ?? []).filter((g) => !reason || g.reason === reason);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Possible duplicates</h1>
      <p className="text-sm text-slate-600">
        New schools and imports already refuse the same UDISE code, board affiliation number, or name and PIN code in a state. These
        groups share something else and may be the same school. Check the official sources before deciding: branches of one school are
        often separate schools.
      </p>
      {msg && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Reason">
        <button type="button" className={`chip ${reason === '' ? 'bg-brand-600 text-white' : ''}`} onClick={() => setReason('')}>All ({report.data?.groups.length ?? 0})</button>
        {(Object.keys(reasonLabel) as DuplicateReason[]).map((r) => (
          <button key={r} type="button" className={`chip ${reason === r ? 'bg-brand-600 text-white' : ''}`} onClick={() => setReason(r)}>
            {reasonLabel[r]} ({report.data?.counts[r] ?? 0})
          </button>
        ))}
      </div>
      {report.loading ? <p className="text-sm text-slate-500">Checking…</p> : groups.length === 0 ? (
        <p className="text-sm text-slate-500">No possible duplicates found.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {groups.map((g) => <GroupCard key={groupKey(g)} group={g} onDone={(t) => { setMsg(t); setNonce((n) => n + 1); }} />)}
        </ul>
      )}
    </div>
  );
}
