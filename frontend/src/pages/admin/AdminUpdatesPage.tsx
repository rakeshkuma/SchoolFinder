import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent } from '../../components/common/States';
import { CATEGORY_LABEL } from '../../components/home/updateVisuals';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService, type SiteUpdateRequest, type SiteUpdateRow, type SiteUpdateStatus } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { UpdateCategory } from '../../services/publicApi';
import { formatDate } from '../../utils/format';

const TABS: { value: SiteUpdateStatus; label: string }[] = [
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const EMPTY: SiteUpdateRequest = {
  category: 'JOB', title: '', summary: '', imageUrl: null, publishedOn: today(), eventDate: null, eventLabel: null, deadline: false,
  sourceUrl: null, sourceName: null, linkPath: null, actionLabel: null, verificationStatus: 'UNVERIFIED', expiresOn: null, priority: 0,
};

const toRequest = (r: SiteUpdateRow): SiteUpdateRequest => ({
  category: r.category, title: r.title, summary: r.summary, imageUrl: r.imageUrl, publishedOn: r.publishedOn, eventDate: r.eventDate,
  eventLabel: r.eventLabel, deadline: r.deadline, sourceUrl: r.sourceUrl, sourceName: r.sourceName, linkPath: r.linkPath,
  actionLabel: r.actionLabel, verificationStatus: r.verificationStatus, expiresOn: r.expiresOn, priority: r.priority,
});

/**
 * Editorial school and exam updates (job alerts and notices the automatic feed does not cover). Each is saved as a
 * draft, appears on the home page and /updates only once published, and drops off on its expiry date. Exam dates,
 * open admissions and new practice sets reach the feed by themselves and are not entered here.
 */
export function AdminUpdatesPage() {
  useDocumentTitle('Admin · School & exam updates');
  const [status, setStatus] = useState<SiteUpdateStatus>('DRAFT');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [form, setForm] = useState<SiteUpdateRequest>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const rows = useApi(() => adminService.updates(status, page), [status, page, nonce]);

  const set = <K extends keyof SiteUpdateRequest>(key: K, value: SiteUpdateRequest[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: 'title' | 'summary' | 'imageUrl' | 'eventLabel' | 'sourceUrl' | 'sourceName' | 'linkPath' | 'actionLabel') =>
    ({ value: form[key] ?? '', onChange: (e: { target: { value: string } }) => set(key, key === 'title' || key === 'summary' ? e.target.value : e.target.value || null) });

  const failed = (e: unknown) => {
    if (e instanceof ApiError) {
      const fields = e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
      setMessage({ ok: false, text: fields ? `${e.message} ${fields}` : e.message });
    } else {
      setMessage({ ok: false, text: 'The request failed.' });
    }
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const body = { ...form, title: form.title.trim(), summary: form.summary.trim() };
      if (editing) await adminService.saveUpdate(editing, body);
      else await adminService.createUpdate(body);
      setMessage({ ok: true, text: editing ? 'Saved.' : 'Saved as a draft. Publish it from the Drafts list when it is checked.' });
      setEditing(null);
      setForm({ ...EMPTY, publishedOn: today() });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  };

  const act = async (row: SiteUpdateRow, action: 'publish' | 'archive') => {
    if (action === 'publish' && row.category !== 'PREP' && !row.sourceUrl) {
      setMessage({ ok: false, text: 'Add the official source before publishing.' });
      return;
    }
    if (action === 'archive' && !window.confirm(`Archive “${row.title}”? It will no longer be shown.`)) return;
    try {
      if (action === 'publish') await adminService.publishUpdate(row.id);
      else await adminService.archiveUpdate(row.id);
      setMessage({ ok: true, text: action === 'publish' ? 'Published: it now appears in the public feed.' : 'Archived.' });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    }
  };

  const edit = (row: SiteUpdateRow) => {
    setEditing(row.id);
    setForm(toRequest(row));
    setMessage(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School &amp; exam updates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Notices for the home page’s “Latest School &amp; Exam Updates” and <Link to="/updates" className="link" target="_blank">/updates</Link>,
          such as teaching job alerts. Exam dates, open admissions and new practice sets appear there by themselves. Every notice
          except practice needs its official source; nothing is copied from other websites.
        </p>
      </div>

      <form ref={formRef} onSubmit={(e) => void save(e)} className="card space-y-4 p-5 text-sm" aria-labelledby="update-form-title">
        <h2 id="update-form-title" className="text-lg font-semibold">{editing ? `Edit update #${editing}` : 'New update (saved as a draft)'}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Kind</span>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value as UpdateCategory)}>
              {(Object.keys(CATEGORY_LABEL) as UpdateCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Published on</span>
            <input type="date" required className="input" value={form.publishedOn} onChange={(e) => set('publishedOn', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Remove after (optional)</span>
            <input type="date" className="input" value={form.expiresOn ?? ''} onChange={(e) => set('expiresOn', e.target.value || null)} />
          </label>
        </div>
        <label className="block">
          <span className="label">Headline (10–160 characters)</span>
          <input className="input" required minLength={10} maxLength={160} {...text('title')} />
        </label>
        <label className="block">
          <span className="label">Summary (20–400 characters)</span>
          <textarea className="input min-h-[84px]" required minLength={20} maxLength={400} {...text('summary')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Key date (optional)</span>
            <input type="date" className="input" value={form.eventDate ?? ''} onChange={(e) => set('eventDate', e.target.value || null)} />
          </label>
          <label className="block">
            <span className="label">What the date is</span>
            <input className="input" maxLength={60} placeholder="Last date to apply" {...text('eventLabel')} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5">
            <input type="checkbox" checked={form.deadline} onChange={(e) => set('deadline', e.target.checked)} />
            <span>It is a deadline (shows “Closing soon” in its last 14 days)</span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Official source URL {form.category === 'PREP' ? '(optional)' : '(required)'}</span>
            <input type="url" className="input" maxLength={600} placeholder="https://…" {...text('sourceUrl')} />
          </label>
          <label className="block">
            <span className="label">Source name</span>
            <input className="input" maxLength={120} placeholder="e.g. Navodaya Vidyalaya Samiti" {...text('sourceName')} />
          </label>
          <label className="block">
            <span className="label">Page on this site (optional; otherwise the source opens)</span>
            <input className="input" maxLength={300} placeholder="/exams/aissee" pattern="/[^/].*|/" {...text('linkPath')} />
          </label>
          <label className="block">
            <span className="label">Button text (optional)</span>
            <input className="input" maxLength={40} placeholder="View Jobs" {...text('actionLabel')} />
          </label>
          <label className="block">
            <span className="label">Image URL (optional; only a licensed or own picture)</span>
            <input type="url" className="input" maxLength={600} {...text('imageUrl')} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Checked against the source?</span>
              <select className="input" value={form.verificationStatus ?? 'UNVERIFIED'}
                onChange={(e) => set('verificationStatus', e.target.value as SiteUpdateRequest['verificationStatus'])}>
                <option value="UNVERIFIED">Not yet</option>
                <option value="VERIFIED">Yes, checked</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Priority (−100 to 100)</span>
              <input type="number" min={-100} max={100} className="input" value={form.priority}
                onChange={(e) => set('priority', Number.parseInt(e.target.value, 10) || 0)} />
            </label>
          </div>
        </div>
        {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl p-3 ${message.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm({ ...EMPTY, publishedOn: today() }); }}>Cancel</button>}
        </div>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show updates">
        {TABS.map((t) => (
          <button key={t.value} type="button" aria-pressed={status === t.value} onClick={() => { setStatus(t.value); setPage(0); }}
            className={`chip px-3 py-1 text-sm ${status === t.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <AsyncContent state={rows} isEmpty={(d) => d.content.length === 0} empty={<p className="text-sm text-slate-600">Nothing here.</p>}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((r) => (
                <li key={r.id} className="card space-y-1.5 p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold">{r.title}</p>
                    <p className="text-xs text-slate-500">{CATEGORY_LABEL[r.category]} · published {formatDate(r.publishedOn)}{r.expiresOn ? ` · until ${formatDate(r.expiresOn)}` : ''}</p>
                  </div>
                  <p className="text-slate-700">{r.summary}</p>
                  <p className="text-xs text-slate-500">
                    {r.eventDate ? `${r.eventLabel ?? 'Date'}: ${formatDate(r.eventDate)}${r.deadline ? ' (deadline)' : ''} · ` : ''}
                    {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">{r.sourceName ?? 'Source'}</a> : 'No source'}
                    {' · '}{r.verificationStatus === 'VERIFIED' ? 'Checked' : 'Not checked yet'}
                    {r.updatedBy ? ` · last edited by ${r.updatedBy}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => edit(r)}>Edit</button>
                    {r.status !== 'PUBLISHED' && <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => void act(r, 'publish')}>Publish</button>}
                    {r.status !== 'ARCHIVED' && <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void act(r, 'archive')}>Archive</button>}
                  </div>
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
