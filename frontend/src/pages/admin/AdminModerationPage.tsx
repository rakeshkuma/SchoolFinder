import { useState } from 'react';
import { AsyncContent } from '../../components/common/States';
import { Pagination } from '../../components/common/Pagination';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService, type FlaggedAttempt, type ModeratedParticipant } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { formatDate } from '../../utils/format';

/**
 * Fair play: attempts flagged as implausibly fast, and hiding nicknames. Moderators see nicknames and public ids only.
 * A flag is not proof, so nothing is decided automatically; each decision needs a note, kept in the audit log.
 */
export function AdminModerationPage() {
  useDocumentTitle('Admin · Student moderation');
  const [nonce, setNonce] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const overview = useApi(() => adminService.moderationOverview(), [nonce]);
  const queue = useApi(() => adminService.flaggedAttempts(page), [page, nonce]);
  const people = useApi(() => adminService.moderationParticipants(search), [search, nonce]);

  const run = async (action: () => Promise<void>, text: string) => {
    try {
      await action();
      setMessage({ ok: true, text });
      setNonce((n) => n + 1);
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : 'The request failed.' });
    }
  };
  const decide = (a: FlaggedAttempt, decision: 'CLEAR' | 'VOID') => {
    const note = window.prompt(decision === 'CLEAR'
      ? `Why is ${a.nickname}'s attempt genuine? It will earn its points. (kept in the audit log)`
      : `Why should ${a.nickname}'s attempt not count? It will stay out of rankings and its badges will be rechecked. (kept in the audit log)`);
    if (!note?.trim()) return;
    void run(() => adminService.decideAttempt(a.attemptId, decision, note.trim()), decision === 'CLEAR' ? 'Attempt cleared.' : 'Attempt voided.');
  };
  const hide = (p: ModeratedParticipant) => {
    const note = window.prompt(`${p.hidden ? 'Show' : 'Hide'} the nickname "${p.nickname}"? Say why. (kept in the audit log)`);
    if (!note?.trim()) return;
    void run(() => adminService.hideParticipant(p.publicId, !p.hidden, note.trim()), p.hidden ? 'Nickname shown again.' : 'Nickname hidden.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Student moderation</h1>
        <p className="mt-1 text-sm text-slate-600">
          A flag means answers came faster than a person can read; it is not proof of cheating. Students are shown by nickname and public id only.
        </p>
      </div>
      {overview.data && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {([['Students', overview.data.participants], ['Publicly listed', overview.data.listed], ['Attempts, 7 days', overview.data.attemptsLast7Days],
            ['Awaiting review', overview.data.awaitingReview], ['Active challenges', overview.data.activeChallenges]] as const).map(([label, value]) => (
            <div key={label} className="card p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-xl font-bold tabular-nums">{value}</dd></div>
          ))}
        </dl>
      )}
      {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}

      <section aria-labelledby="flagged-h">
        <h2 id="flagged-h" className="text-lg font-semibold">Flagged attempts</h2>
        <AsyncContent state={queue} isEmpty={(d) => d.content.length === 0} empty={<p className="mt-3 text-sm text-emerald-700">Nothing is waiting for review.</p>}>
          {(data) => (
            <>
              <ul className="mt-3 space-y-3">
                {data.content.map((a) => (
                  <li key={a.attemptId} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold">{a.nickname} <span className="font-normal text-slate-500">({a.publicId})</span></p>
                      <p className="text-xs text-slate-600">
                        {a.title}{a.challengeSlug ? ' · challenge' : ''} · {a.correct}/{a.total} correct, {a.attempted} answered in {a.durationSeconds ?? '?'} s · {formatDate(a.createdAt.slice(0, 10))}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => decide(a, 'CLEAR')}>Clear</button>
                      <button type="button" className="btn-danger py-1.5 text-xs" onClick={() => decide(a, 'VOID')}>Void</button>
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </AsyncContent>
      </section>

      <section aria-labelledby="people-h" className="space-y-3">
        <h2 id="people-h" className="text-lg font-semibold">Students</h2>
        <form className="flex max-w-md gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }}>
          <label className="sr-only" htmlFor="student-search">Search by nickname or public id</label>
          <input id="student-search" className="input" maxLength={24} placeholder="Nickname or public id" value={q} onChange={(e) => setQ(e.target.value)} />
          <button type="submit" className="btn-secondary">Search</button>
        </form>
        <AsyncContent state={people} isEmpty={(d) => d.length === 0} empty={<p className="text-sm text-slate-600">No students found.</p>}>
          {(rows) => (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th scope="col" className="px-3 py-2">Nickname</th><th scope="col" className="px-3 py-2">Type</th>
                    <th scope="col" className="px-3 py-2 text-right">Points</th><th scope="col" className="px-3 py-2 text-right">Tests</th>
                    <th scope="col" className="px-3 py-2 text-right">Flagged</th><th scope="col" className="px-3 py-2">Shown</th><th scope="col" className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.publicId} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium">{p.nickname} <span className="text-xs font-normal text-slate-500">{p.publicId}</span></td>
                      <td className="px-3 py-2 text-slate-600">{p.guest ? 'Guest' : 'Member'}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.points}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.attempts}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{p.flagged}</td>
                      <td className="px-3 py-2 text-slate-600">{p.hidden ? 'Hidden by moderator' : p.listed ? 'Public' : 'Private'}</td>
                      <td className="px-3 py-2 text-right"><button type="button" className="btn-secondary py-1 text-xs" onClick={() => hide(p)}>{p.hidden ? 'Show' : 'Hide'}</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncContent>
      </section>
    </div>
  );
}
