import { useState } from 'react';
import { AsyncContent } from '../../components/common/States';
import { Pagination } from '../../components/common/Pagination';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { formatDate } from '../../utils/format';
import { CONTACT_TOPICS } from '../ContactPage';

/** Messages from the contact form. Marking one handled removes the sender's name and email. */
export function AdminContactPage() {
  useDocumentTitle('Admin · Contact messages');
  const [status, setStatus] = useState<'OPEN' | 'HANDLED'>('OPEN');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const messages = useApi(() => adminService.contactMessages(status, page), [status, page, nonce]);

  const handled = async (id: number) => {
    if (!window.confirm('Mark this handled? The sender’s name and email will be removed, so reply first.')) return;
    try {
      await adminService.contactHandled(id);
      setNonce((n) => n + 1);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'The request failed.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact messages</h1>
        <p className="mt-1 text-sm text-slate-600">From the contact form. Reply by email, then mark the message handled.</p>
      </div>
      <div className="flex gap-2" role="group" aria-label="Show messages">
        {(['OPEN', 'HANDLED'] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => { setStatus(s); setPage(0); }}
            className={`chip px-3 py-1 text-sm ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {s === 'OPEN' ? 'Open' : 'Handled'}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <AsyncContent state={messages} isEmpty={(d) => d.content.length === 0} empty={<p className="text-sm text-slate-600">No messages here.</p>}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((m) => (
                <li key={m.id} className="card space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{m.subject}</p>
                    <p className="text-xs text-slate-500">{CONTACT_TOPICS.find((t) => t.value === m.topic)?.label} · {formatDate(m.createdAt.slice(0, 10))}</p>
                  </div>
                  <p className="whitespace-pre-line text-slate-800">{m.message}</p>
                  {m.email ? (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <a href={`mailto:${m.email}`} className="link break-all">{m.name} &lt;{m.email}&gt;</a>
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void handled(m.id)}>Mark handled</button>
                    </div>
                  ) : <p className="text-xs text-slate-500">Handled by {m.handledBy}{m.handledAt ? ` on ${formatDate(m.handledAt.slice(0, 10))}` : ''}.</p>}
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
