import { useState } from 'react';
import { AsyncContent } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { adminService, type SyncRunRow } from '../../services/adminApi';
import { ApiError } from '../../services/http';

/** A time in India, e.g. "14 Nov 2026, 6:02 am". */
export function istTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const RUN_STYLE: Record<SyncRunRow['status'], string> = {
  RUNNING: 'bg-sky-100 text-sky-900', SUCCEEDED: 'bg-emerald-100 text-emerald-900', PARTIAL: 'bg-amber-100 text-amber-900',
  FAILED: 'bg-red-100 text-red-900', ABANDONED: 'bg-slate-200 text-slate-800',
};
const OUTCOME_STYLE: Record<string, string> = {
  OK: 'text-emerald-800', FAILED: 'text-red-700', BLOCKED: 'text-amber-800', SKIPPED: 'text-slate-500',
};

/**
 * The daily check of official websites, for staff: when it runs, how the last run went for each source, past runs,
 * and (admins only) a button to check now. The public site only ever reads what these runs stored.
 */
export function AdminSyncPanel({ onRan }: { onRan?: () => void }) {
  const { isAdmin } = useAuth();
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const status = useApi(() => adminService.syncStatus(), [nonce]);
  const history = useApi(() => adminService.syncRuns(0, 10), [nonce, showHistory], showHistory);

  const checkNow = async () => {
    setMessage(null);
    try {
      const r = await adminService.syncNow();
      setMessage({ ok: true, text: r.message });
      window.setTimeout(() => { setNonce((n) => n + 1); onRan?.(); }, 15_000);
    } catch (e) {
      const data = e instanceof ApiError ? e : null;
      setMessage({ ok: false, text: data?.message ?? 'The check could not be started.' });
    }
  };

  return (
    <section aria-labelledby="sync-title" className="card space-y-3 p-5 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="sync-title" className="text-lg font-semibold">Official sources: daily check</h2>
          <p className="mt-0.5 text-slate-600">
            The server reads the approved official websites once a day and adds their new notices here. Visitors&rsquo; pages never
            start a check.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setNonce((n) => n + 1)}>Refresh</button>
          {isAdmin && (
            <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => void checkNow()}
              disabled={status.data?.running || status.data?.enabled === false}>
              Check now
            </button>
          )}
        </div>
      </div>
      {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl p-3 ${message.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}
      <AsyncContent state={status}>
        {(s) => (
          <>
            <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-slate-500">Schedule</dt><dd>{s.enabled ? `${s.schedule} (cron ${s.cron}, ${s.timezone})` : 'Switched off'}</dd></div>
              <div><dt className="text-xs text-slate-500">Next check</dt><dd>{istTime(s.nextCheckAt)}</dd></div>
              <div><dt className="text-xs text-slate-500">Last successful check</dt><dd>{istTime(s.lastSuccessAt)}</dd></div>
              <div><dt className="text-xs text-slate-500">Waiting for review</dt><dd>{s.pendingReview}</dd></div>
            </dl>
            {s.running && <p className="rounded-xl bg-sky-50 p-3 text-sky-900" role="status">A check is running now.</p>}
            {s.lastRun ? <RunDetails run={s.lastRun} title="Last run" /> : <p className="text-slate-600">No check has run yet.</p>}
            <details className="rounded-xl bg-slate-50 p-3">
              <summary className="cursor-pointer font-semibold">Sources ({s.sources.length})</summary>
              <ul className="mt-2 space-y-1.5">
                {s.sources.map((src) => (
                  <li key={src.key}>
                    <a href={src.listingUrl} target="_blank" rel="noopener noreferrer" className="link font-semibold">{src.name}</a>
                    <span className="text-slate-600">
                      {' '}· {src.enabled ? (src.autoPublish ? 'publishes dated notices automatically' : `review only: ${src.reviewOnlyReason ?? ''}`) : 'switched off'}
                      {src.completeListing ? ' · full listing (withdrawals detected)' : ''} · {src.hosts.join(', ')}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
            <button type="button" className="text-sm font-semibold text-royal-700 hover:underline" aria-expanded={showHistory}
              onClick={() => setShowHistory((v) => !v)}>
              {showHistory ? 'Hide past runs' : 'Show past runs'}
            </button>
            {showHistory && (
              <AsyncContent state={history} isEmpty={(d) => d.content.length === 0} empty={<p className="text-slate-600">No runs yet.</p>}>
                {(d) => <div className="space-y-2">{d.content.map((r) => <RunDetails key={r.id} run={r} title={`Run #${r.id}`} />)}</div>}
              </AsyncContent>
            )}
          </>
        )}
      </AsyncContent>
    </section>
  );
}

function RunDetails({ run, title }: { run: SyncRunRow; title: string }) {
  return (
    <details className="rounded-xl ring-1 ring-slate-200" open={title === 'Last run'}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 p-3">
        <span className="font-semibold">{title}</span>
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${RUN_STYLE[run.status]}`}>{run.status}</span>
        <span className="text-slate-600">
          {istTime(run.startedAt)} · {run.trigger.toLowerCase()}{run.triggeredBy ? ` by ${run.triggeredBy}` : ''} · {run.itemsCreated} new
          ({run.itemsPublished} published, {run.itemsPending} for review) · {run.itemsUpdated} changed · {run.itemsExpired} expired
          {run.itemsWithdrawn ? ` · ${run.itemsWithdrawn} withdrawn` : ''}
        </span>
      </summary>
      <div className="overflow-x-auto px-3 pb-3">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead className="text-slate-500">
            <tr><th className="py-1 pr-2">Source</th><th className="pr-2">Result</th><th className="pr-2">Listed</th><th className="pr-2">Relevant</th>
              <th className="pr-2">New</th><th className="pr-2">Changed</th><th className="pr-2">Same</th><th className="pr-2">Too old</th><th className="pr-2">Time</th></tr>
          </thead>
          <tbody>
            {run.sources.map((s) => (
              <tr key={s.key} className="border-t border-slate-100 align-top">
                <td className="py-1 pr-2 font-semibold">{s.name}</td>
                <td className={`pr-2 font-bold ${OUTCOME_STYLE[s.outcome] ?? ''}`}>
                  {s.outcome}{s.error ? <span className="block max-w-[260px] font-normal text-slate-600">{s.error}</span> : null}
                </td>
                <td className="pr-2">{s.listed}</td><td className="pr-2">{s.relevant}</td>
                <td className="pr-2">{s.created}{s.created ? ` (${s.published} live, ${s.pending} review)` : ''}</td>
                <td className="pr-2">{s.updated}</td><td className="pr-2">{s.unchanged}</td><td className="pr-2">{s.tooOld}</td>
                <td className="pr-2">{(s.durationMs / 1000).toFixed(1)} s · {s.requests} req</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
