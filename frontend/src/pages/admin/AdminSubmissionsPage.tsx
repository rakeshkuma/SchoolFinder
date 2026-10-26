import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import type { SubmissionStatus, SubmitterRole, UpdateTopic } from '../../types/api';
import { formatDate } from '../../utils/format';

const TOPIC_LABEL: Record<UpdateTopic, string> = {
  FEES: 'Fees', ADMISSIONS: 'Admissions', CLASSES: 'Classes', CONTACT: 'Contact details', FACILITIES: 'Facilities',
  PHOTOS: 'Photos', CORRECTION: 'Correction', OTHER: 'Other',
};
const ROLE_LABEL: Record<SubmitterRole, string> = { SCHOOL: 'from the school', PARENT: 'parent / guardian', OTHER: 'other' };

/**
 * Suggested updates from schools and parents. Accepting does not change any data by itself: open the cited page, apply
 * the change with the school editor (citing that page), then accept. Closing a submission erases the reply e-mail.
 */
export function AdminSubmissionsPage() {
  useDocumentTitle('Admin · Suggested updates');
  const [status, setStatus] = useState<SubmissionStatus>('NEW');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const state = useApi(() => adminService.updateSubmissions(status, page), [status, page, nonce]);
  const close = async (id: number, next: SubmissionStatus) => {
    const note = window.prompt(next === 'ACCEPTED'
      ? 'What was changed? (kept internally, optional)'
      : 'Why is it rejected? (kept internally)') ?? undefined;
    if (next === 'REJECTED' && note === undefined) return;
    await adminService.reviewUpdateSubmission(id, next, note || undefined);
    setNonce((n) => n + 1);
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Suggested updates</h1>
      <p className="text-sm text-slate-600">
        Open the linked page and check it. If it confirms the update, apply it in the school editor with that page as the source,
        then accept. Reply to the sender (if they left an e-mail) before closing: the address is deleted when you accept or reject.
      </p>
      <div className="flex gap-2">
        {(['NEW', 'ACCEPTED', 'REJECTED'] as SubmissionStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => { setStatus(s); setPage(0); }} aria-pressed={s === status}
            className={`chip px-3 py-1 text-sm ${s === status ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{s.toLowerCase()}</button>
        ))}
      </div>
      <AsyncContent state={state} isEmpty={(d) => d.content.length === 0}
        empty={<EmptyState title={status === 'NEW' ? 'No suggestions waiting.' : `No ${status.toLowerCase()} suggestions.`} />}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((s) => (
                <li key={s.id} className="card space-y-2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">
                      {s.schoolSlug ? <Link to={`/schools/${s.schoolSlug}`} className="hover:text-brand-700">{s.schoolName}</Link> : `School #${s.schoolId}`}
                    </p>
                    <span className="chip bg-slate-100 text-slate-700">{TOPIC_LABEL[s.topic]}</span>
                  </div>
                  <p className="whitespace-pre-line text-sm text-slate-800">{s.message}</p>
                  <p className="text-sm">
                    Source: <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="link break-all">{s.sourceUrl}</a>
                  </p>
                  <p className="text-xs text-slate-500">
                    {ROLE_LABEL[s.role]} · received {formatDate(s.createdAt)}
                    {s.contactEmail && <> · reply to <a href={`mailto:${s.contactEmail}`} className="link">{s.contactEmail}</a></>}
                    {s.reviewedAt && <> · {s.status.toLowerCase()} by {s.reviewedBy} on {formatDate(s.reviewedAt)}</>}
                  </p>
                  {s.reviewerNote && <p className="text-xs text-slate-600">Note: {s.reviewerNote}</p>}
                  {s.status === 'NEW' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Link to={`/admin/schools/${s.schoolId}`} className="btn-secondary py-1.5 text-xs">Open in school editor</Link>
                      <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => close(s.id, 'ACCEPTED')}>Applied — accept</button>
                      <button type="button" className="btn-danger py-1.5 text-xs" onClick={() => close(s.id, 'REJECTED')}>Reject</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
