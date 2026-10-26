import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { locationService } from '../../services/publicApi';
import type { FacilityQueueItem, VerificationStatus } from '../../types/api';
import { facilityCategoryLabel, verificationLabel } from '../../utils/format';

/** The source most of the selected records cite, as a starting value the editor must still check. */
function commonSource(item: FacilityQueueItem, ids: number[]): string {
  const counts = new Map<string, number>();
  for (const f of item.facilities) {
    if (ids.includes(f.id)) counts.set(f.sourceUrl, (counts.get(f.sourceUrl) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
}

export function SchoolQueueCard({ item, onDone }: { item: FacilityQueueItem; onDone: (message: string) => void }) {
  const unverified = item.facilities.filter((f) => f.verificationStatus === 'UNVERIFIED');
  const [selected, setSelected] = useState<number[]>([]);
  const [sourceUrl, setSourceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (id: number) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    if (!sourceUrl) setSourceUrl(commonSource(item, next));
  };

  const decide = async (status: VerificationStatus) => {
    setBusy(true);
    setError(null);
    try {
      const done = await adminService.verifyBatch(item.schoolId, {
        entityType: 'FACILITY', entityIds: selected, status, sourceUrl: sourceUrl.trim(), notes: notes.trim() || null,
      });
      onDone(`${item.schoolName}: ${done.length} record${done.length === 1 ? '' : 's'} marked ${verificationLabel[status].toLowerCase()}. Rankings recalculated.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save the decision');
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">
          <Link to={`/admin/schools/${item.schoolId}`} className="hover:text-brand-700">{item.schoolName}</Link>
        </h2>
        <span className="text-xs text-slate-500">{item.stateName ?? item.stateCode} · {item.unverifiedCount} unverified</span>
      </div>
      <p className="mt-1 flex flex-wrap gap-3 text-xs">
        {item.websiteUrl && <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer nofollow" className="link">School website</a>}
        {item.sourceUrl && <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link">Profile source</a>}
        <Link to={`/schools/${item.slug}`} className="link">Public page</Link>
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="w-10 px-3 py-2">
                <input type="checkbox" aria-label="Select all unverified"
                  checked={unverified.length > 0 && selected.length === unverified.length}
                  onChange={(e) => {
                    const next = e.target.checked ? unverified.map((f) => f.id) : [];
                    setSelected(next);
                    if (!sourceUrl) setSourceUrl(commonSource(item, next));
                  }} />
              </th>
              <th scope="col" className="px-3 py-2">Facility</th>
              <th scope="col" className="px-3 py-2">Category</th>
              <th scope="col" className="px-3 py-2">Stated</th>
              <th scope="col" className="px-3 py-2">Status</th>
              <th scope="col" className="px-3 py-2">Cited source</th>
            </tr>
          </thead>
          <tbody>
            {item.facilities.map((f) => (
              <tr key={f.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {f.verificationStatus === 'UNVERIFIED' && (
                    <input type="checkbox" aria-label={`Select ${f.name}`} checked={selected.includes(f.id)} onChange={() => toggle(f.id)} />
                  )}
                </td>
                <td className="px-3 py-2">{f.name}</td>
                <td className="px-3 py-2">{facilityCategoryLabel[f.category]}</td>
                <td className="px-3 py-2">{f.available === null ? 'Not stated' : f.available ? 'Available' : 'Not available'}</td>
                <td className="px-3 py-2 text-xs">{verificationLabel[f.verificationStatus]}</td>
                <td className="max-w-[220px] truncate px-3 py-2 text-xs">
                  <a href={f.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link" title={f.sourceUrl}>{f.sourceUrl}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="text-sm">
          <span className="label">Source you checked</span>
          <input className="input" type="url" placeholder="https://…" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="label">Notes (optional)</span>
          <input className="input" maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary py-2 text-xs" disabled={busy || selected.length === 0 || !sourceUrl.trim()}
            onClick={() => decide('VERIFIED')}>
            Verify {selected.length || ''}
          </button>
          <button type="button" className="btn-secondary py-2 text-xs" disabled={busy || selected.length === 0 || !sourceUrl.trim()}
            onClick={() => decide('DISPUTED')}>
            Disputed
          </button>
          <button type="button" className="btn-secondary py-2 text-xs" disabled={busy || selected.length === 0 || !sourceUrl.trim()}
            onClick={() => decide('OUTDATED')}>
            Outdated
          </button>
        </div>
      </div>
      {error && <p className="field-error mt-2">{error}</p>}
    </li>
  );
}

/**
 * Queue of schools whose facility records still need checking. Verified facilities count toward the verified share
 * of a ranking; disputed or outdated ones stop counting at all.
 */
export function AdminFacilityVerificationPage() {
  useDocumentTitle('Admin · Facility verification');
  const [state, setState] = useState('');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const states = useApi(() => locationService.states(), []);
  const queue = useApi(() => adminService.facilityQueue(state || undefined, page), [state, page, nonce]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Facility verification</h1>
      <p className="max-w-3xl text-sm text-slate-600">
        Open the cited source, confirm each selected facility is stated there, then record the decision with the URL you
        checked. Every record gets its own entry in the school's verification history. <strong>Verified</strong> facilities
        count toward a school's verified share; <strong>disputed</strong> or <strong>outdated</strong> ones are no longer
        scored. Never verify from memory or from a third-party listing.
      </p>
      <label className="block text-sm">
        <span className="label">State / UT</span>
        <select className="input max-w-xs" value={state} onChange={(e) => { setState(e.target.value); setPage(0); }}>
          <option value="">All states and UTs</option>
          {(states.data ?? []).filter((s) => s.schoolCount > 0).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
      </label>
      {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p>}
      <AsyncContent state={queue} isEmpty={(d) => d.content.length === 0}
        empty={<EmptyState title="No facility records are waiting for verification here." />}>
        {(data) => (
          <>
            <p className="text-sm text-slate-600">{data.totalElements} school{data.totalElements === 1 ? '' : 's'} waiting</p>
            <ul className="space-y-3">
              {data.content.map((item) => (
                <SchoolQueueCard key={`${item.schoolId}-${nonce}`} item={item}
                  onDone={(m) => { setMessage(m); setNonce((n) => n + 1); }} />
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
