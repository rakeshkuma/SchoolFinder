import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AsyncContent } from '../../components/common/States';
import { Pagination } from '../../components/common/Pagination';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService, type EnquiryStatus } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { formatDate } from '../../utils/format';

const TABS: { value: EnquiryStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'FORWARDED', label: 'Forwarded to school' },
  { value: 'CLOSED', label: 'Closed' },
];

/**
 * Parents' admission enquiries from school profiles. Staff pass each one to the school (the parent agreed to that),
 * mark it forwarded, and close it when done; closing removes the parent's contact details.
 */
export function AdminEnquiriesPage() {
  useDocumentTitle('Admin · Admission enquiries');
  const [status, setStatus] = useState<EnquiryStatus>('NEW');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const enquiries = useApi(() => adminService.enquiries(status, page), [status, page, nonce]);

  const change = async (id: number, next: EnquiryStatus) => {
    const note = next === 'FORWARDED' ? window.prompt('How was it passed to the school? (optional note, e.g. "emailed the office")') : null;
    if (next === 'FORWARDED' && note === null) return;
    if (next === 'CLOSED' && !window.confirm('Close this enquiry? The parent’s name, phone, email and message will be removed.')) return;
    try {
      await adminService.enquiryStatus(id, next, note ?? undefined);
      setNonce((n) => n + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The request failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admission enquiries</h1>
        <p className="mt-1 text-sm text-slate-600">
          From “Enquire about admission” on school profiles. The parent agreed to the details being shared with that school only.
          Pass it on, mark it forwarded, and close it when done.
        </p>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Show enquiries">
        {TABS.map((t) => (
          <button key={t.value} type="button" aria-pressed={status === t.value} onClick={() => { setStatus(t.value); setPage(0); }}
            className={`chip px-3 py-1 text-sm ${status === t.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <AsyncContent state={enquiries} isEmpty={(d) => d.content.length === 0} empty={<p className="text-sm text-slate-600">No enquiries here.</p>}>
        {(data) => (
          <>
            <p className="text-sm text-slate-600">{data.totalElements} {data.totalElements === 1 ? 'enquiry' : 'enquiries'}</p>
            <ul className="space-y-3">
              {data.content.map((e) => (
                <li key={e.id} className="card space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">
                      {e.schoolSlug ? <Link to={`/schools/${e.schoolSlug}`} className="link" target="_blank">{e.schoolName}</Link> : `School #${e.schoolId}`}
                      {' · '}{e.classCode}{e.academicYear ? ` · ${e.academicYear}` : ''}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(e.createdAt.slice(0, 10))}</p>
                  </div>
                  {e.message && <p className="whitespace-pre-line text-slate-800">{e.message}</p>}
                  {e.phone ? (
                    <p className="flex flex-wrap gap-x-4 gap-y-1">
                      <span className="font-medium">{e.parentName}</span>
                      <a href={`tel:+91${e.phone}`} className="link">{e.phone}</a>
                      {e.email && <a href={`mailto:${e.email}`} className="link break-all">{e.email}</a>}
                    </p>
                  ) : <p className="text-xs text-slate-500">Contact details removed when closed.</p>}
                  {e.staffNote && <p className="text-xs text-slate-600">Note: {e.staffNote}</p>}
                  {e.handledBy && <p className="text-xs text-slate-500">Last updated by {e.handledBy}{e.updatedAt ? ` on ${formatDate(e.updatedAt.slice(0, 10))}` : ''}.</p>}
                  {e.status !== 'CLOSED' && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {e.status === 'NEW' && <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void change(e.id, 'FORWARDED')}>Mark forwarded</button>}
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void change(e.id, 'CLOSED')}>Close</button>
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
