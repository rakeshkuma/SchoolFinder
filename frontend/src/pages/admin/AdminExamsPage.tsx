import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { ExamStatusBadge } from '../../components/exam/ExamCard';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { formatDate } from '../../utils/format';
import { isoToday } from '../../utils/exams';

/**
 * Exam records for editors: what needs checking (stale verification, a cycle whose dates have all passed, tentative
 * dates that passed unconfirmed), a way to record a re-check, publishing, and the JSON import used for every content
 * change. Statuses shown here are derived from confirmed dates, exactly as on the public pages.
 */
export function AdminExamsPage() {
  useDocumentTitle('Admin · Entrance exams');
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const state = useApi(() => adminService.exams(), [nonce]);
  const refresh = () => setNonce((n) => n + 1);

  const run = async (action: () => Promise<unknown>, ok: string) => {
    try {
      await action();
      setMessage({ ok: true, text: ok });
      refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : 'The request failed.' });
    }
  };
  const verify = (slug: string) => {
    const note = window.prompt('Which official sources did you check? (kept in the audit log)');
    if (note === null) return;
    void run(() => adminService.verifyExam(slug, 'VERIFIED', isoToday(), note || undefined), `${slug}: verification recorded for today.`);
  };
  const readJson = async (e: ChangeEvent<HTMLInputElement>): Promise<unknown | undefined> => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return undefined;
    try {
      return JSON.parse(await file.text());
    } catch {
      setMessage({ ok: false, text: 'That file is not valid JSON.' });
      return undefined;
    }
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const body = await readJson(e);
    if (body === undefined) return;
    await run(async () => {
      const r = await adminService.importExams(body);
      setMessage({ ok: true, text: `Imported ${r.created} new and ${r.updated} updated: ${r.slugs.join(', ')}` });
    }, 'Imported.');
  };
  const onPracticeFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const body = await readJson(e);
    if (body === undefined) return;
    await run(async () => {
      const r = await adminService.importPractice(body);
      setMessage({ ok: true, text: `Imported practice sets: ${r.slugs.join(', ')}` });
    }, 'Imported.');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Entrance exams</h1>
      <p className="text-sm text-slate-600">
        Every exam change goes through the JSON import (format: <code>backend/src/main/resources/seed/exams.json</code>): edit the record
        from the official notice, set <code>lastVerifiedOn</code>, and import. Each record replaces that exam&apos;s dates and notices.
        Use “Re-checked today” when you have confirmed that nothing changed. Only records with a verification date can be published.
      </p>
      <div className="flex flex-wrap gap-2">
        <label className="btn-secondary inline-flex cursor-pointer">
          Import exam JSON…
          <input type="file" accept="application/json,.json" className="sr-only" onChange={onFile} />
        </label>
        <label className="btn-secondary inline-flex cursor-pointer">
          Import practice JSON…
          <input type="file" accept="application/json,.json" className="sr-only" onChange={onPracticeFile} />
        </label>
      </div>
      <p className="text-xs text-slate-500">
        Practice sets (<code>seed/practice.json</code>) hold our own questions only — never copy official or commercial papers. Each
        question needs four options, the correct option&apos;s index and an explanation; mock tests need a time limit.
      </p>
      {message && (
        <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>
      )}
      <AsyncContent state={state} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No exam records yet." />}>
        {(exams) => (
          <ul className="space-y-3">
            {exams.map((e) => (
              <li key={e.slug} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">
                    {e.published ? <Link to={`/exams/${e.slug}`} className="hover:text-brand-700">{e.shortName}</Link> : e.shortName}
                    <span className="ml-2 text-sm font-normal text-slate-500">{e.currentCycle}</span>
                  </p>
                  <span className="flex flex-wrap items-center gap-2">
                    <ExamStatusBadge status={e.status} />
                    <span className={`chip ${e.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{e.published ? 'Published' : 'Not published'}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {e.verificationStatus.toLowerCase().replace('_', ' ')} · {e.lastVerifiedOn ? `last checked ${formatDate(e.lastVerifiedOn)}` : 'never checked'}
                </p>
                {e.flags.length > 0 ? (
                  <ul className="space-y-1 text-sm">
                    {e.flags.map((f) => <li key={f.code + f.message} className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-900"><strong>{f.code.replace(/_/g, ' ').toLowerCase()}:</strong> {f.message}</li>)}
                  </ul>
                ) : <p className="text-sm text-emerald-700">Nothing to check.</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => verify(e.slug)}>Re-checked today</button>
                  <button type="button" className="btn-secondary py-1.5 text-xs"
                    onClick={() => run(() => adminService.publishExam(e.slug, !e.published), `${e.slug}: ${e.published ? 'unpublished' : 'published'}.`)}>
                    {e.published ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
