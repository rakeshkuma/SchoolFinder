import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { DocumentStatus, ExtractionMethod, SchoolSummary, SourceDocumentDetail } from '../../types/api';
import { formatDate } from '../../utils/format';

const message = (e: unknown) => (e instanceof ApiError ? [e.message, ...e.fieldErrors.map((f) => f.message)].join(' · ') : 'Something went wrong.');

export const statusLabel: Record<DocumentStatus, string> = {
  PENDING_REVIEW: 'Waiting for review',
  VERIFIED: 'Verified',
  REJECTED: 'Rejected',
};

export const methodLabel: Record<ExtractionMethod, string> = {
  TEXT_LAYER: 'Text read from the PDF',
  OCR: 'Text read by OCR — check every word',
  NONE: 'Scanned, no text: type it from the pages',
};

const statusTone: Record<DocumentStatus, string> = {
  PENDING_REVIEW: 'bg-amber-50 text-amber-900',
  VERIFIED: 'bg-emerald-50 text-emerald-800',
  REJECTED: 'bg-red-50 text-red-800',
};

/** Pages are fetched with the admin token and shown from blob URLs, which are released when the view closes. */
function PageImage({ id, page }: { id: number; page: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current: string | null = null;
    let cancelled = false;
    adminService.documentPage(id, page)
      .then((blob) => {
        if (cancelled) return;
        current = URL.createObjectURL(blob);
        setUrl(current);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [id, page]);
  if (failed) return <p className="p-4 text-sm text-red-700">Page {page} could not be drawn.</p>;
  if (!url) return <div className="h-96 animate-pulse rounded-lg bg-slate-100" />;
  return <img src={url} alt={`Page ${page} of the document`} className="w-full rounded-lg border border-slate-200 bg-white" />;
}

function Review({ id }: { id: number }) {
  const [, setParams] = useSearchParams();
  const [nonce, setNonce] = useState(0);
  const state = useApi(() => adminService.document(id), [id, nonce]);
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (state.data) {
      setText(state.data.reviewedText ?? state.data.extractedText ?? '');
      setNote(state.data.reviewNote ?? '');
    }
  }, [state.data]);
  const d = state.data?.document;
  if (!state.data || !d) return <p className="text-sm text-slate-500">{state.error ? state.error.message : 'Loading…'}</p>;

  const act = async (fn: () => Promise<SourceDocumentDetail | unknown>, done: string) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setSaved(done);
      setNonce((n) => n + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">{d.title}</h1>
          <p className="text-sm text-slate-600">
            <span className={`chip ${statusTone[d.status]}`}>{statusLabel[d.status]}</span>{' '}
            {methodLabel[d.extractionMethod]} · {d.pageCount} page{d.pageCount === 1 ? '' : 's'}
            {d.publishedOn && ` · dated ${formatDate(d.publishedOn)}`}
            {d.schoolName && <> · <Link className="link" to={`/admin/schools/${d.schoolId}`}>{d.schoolName}</Link></>}
          </p>
          <p className="break-all text-xs text-slate-500">Published at <a className="link" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">{d.sourceUrl}</a> · {d.fileName}</p>
          {d.reviewedBy && <p className="text-xs text-slate-500">Reviewed by {d.reviewedBy}{d.reviewedAt ? ` on ${formatDate(d.reviewedAt)}` : ''}</p>}
        </div>
        <button type="button" className="btn-secondary text-sm" onClick={() => setParams({})}>Back to the list</button>
      </header>
      {saved && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{saved}</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Pages" className="space-y-2">
          {d.pageCount > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <button type="button" className="btn-secondary px-2 py-1" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {d.pageCount}</span>
              <button type="button" className="btn-secondary px-2 py-1" disabled={page === d.pageCount} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
          <PageImage id={d.id} page={page} />
        </section>
        <section aria-label="Text" className="space-y-2">
          <label htmlFor="doc-text" className="font-semibold">Text of the notice</label>
          <p className="text-xs text-slate-600">
            {d.extractionMethod === 'NONE'
              ? 'This is a scan with no text. Type the parts you need (dates, classes, seats, eligibility, fees) exactly as printed.'
              : 'Compare every date, number and name with the page image and correct the text where it differs.'}
          </p>
          <textarea id="doc-text" className="input min-h-[24rem] font-mono text-sm" value={text} onChange={(e) => setText(e.target.value)} />
          <input className="input text-sm" aria-label="Review note" placeholder="Note (required to reject: wrong school, unreadable, not official…)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" disabled={busy}
              onClick={() => act(() => adminService.reviewDocument(d.id, { status: 'VERIFIED', reviewedText: text, note }), 'Marked verified: the text matches the official notice.')}>
              Verified: text matches the notice
            </button>
            <button type="button" className="btn-secondary" disabled={busy}
              onClick={() => act(() => adminService.reviewDocument(d.id, { status: 'REJECTED', reviewedText: text, note }), 'Rejected.')}>Reject</button>
            <button type="button" className="btn-secondary" disabled={busy}
              onClick={() => act(() => adminService.reviewDocument(d.id, { status: 'PENDING_REVIEW', reviewedText: text, note }), 'Draft saved; still waiting for review.')}>Save draft</button>
            {state.data.ocrAvailable && (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => act(() => adminService.rerunOcr(d.id), 'OCR run again.')}>Run OCR again</button>
            )}
          </div>
          {error && <p role="alert" className="field-error">{error}</p>}
          {state.data.extractedText && state.data.extractedText !== text && (
            <details className="text-xs text-slate-600">
              <summary className="cursor-pointer">Text as first read from the file</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2">{state.data.extractedText}</pre>
            </details>
          )}
        </section>
      </div>
    </div>
  );
}

function Upload({ onDone }: { onDone: (id: number) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [v, setV] = useState({ title: '', sourceUrl: '', examSlug: '', publishedOn: '' });
  const [q, setQ] = useState('');
  const [school, setSchool] = useState<SchoolSummary | null>(null);
  const results = useApi(() => adminService.schools(q, undefined, 0, 6), [q], q.trim().length >= 2 && !school);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const d = await adminService.uploadDocument(file, {
        title: v.title.trim(), sourceUrl: v.sourceUrl.trim(), schoolId: school?.id ?? null,
        examSlug: v.examSlug.trim() || null, publishedOn: v.publishedOn || null,
      });
      onDone(d.document.id);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={submit} className="card grid gap-2 p-5 text-sm sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Add a notice</h2>
      <p className="text-xs text-slate-600 sm:col-span-2">
        Download the notice from the official site and upload it here (PDF, PNG or JPEG, up to 15 MB). Give the page where it is published,
        so readers can check it. Nothing is published from a notice until its text is verified.
      </p>
      <input type="file" accept="application/pdf,image/png,image/jpeg" className="sm:col-span-2" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required />
      <input className="input" aria-label="Title" placeholder="Title, e.g. Admission advertisement 2026-27 *" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} required />
      <input className="input" aria-label="Published at" placeholder="Page where it is published (https://…) *" value={v.sourceUrl} onChange={(e) => setV({ ...v, sourceUrl: e.target.value })} required />
      <div className="sm:col-span-2">
        {school ? (
          <p>School: <strong>{school.name}</strong> <button type="button" className="link ml-2" onClick={() => setSchool(null)}>change</button></p>
        ) : (
          <>
            <input className="input" aria-label="School" placeholder="School (optional; type 2+ letters)" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="divide-y">
              {(q.trim().length >= 2 ? results.data?.content ?? [] : []).map((s) => (
                <li key={s.id}><button type="button" className="w-full px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => setSchool(s)}>{s.name} <span className="text-slate-500">· {[s.city, s.stateName].filter(Boolean).join(', ')}</span></button></li>
              ))}
            </ul>
          </>
        )}
      </div>
      <input className="input" aria-label="Exam" placeholder="Exam (optional), e.g. netarhat" value={v.examSlug} onChange={(e) => setV({ ...v, examSlug: e.target.value })} />
      <label><span className="label">Date on the notice</span><input className="input" type="date" value={v.publishedOn} onChange={(e) => setV({ ...v, publishedOn: e.target.value })} /></label>
      <div className="flex items-center gap-2 sm:col-span-2">
        <button className="btn-primary" disabled={!file || busy}>{busy ? 'Reading the file…' : 'Upload and read'}</button>
        {error && <span role="alert" className="field-error">{error}</span>}
      </div>
    </form>
  );
}

/** Official notices (PDF or scans): read, compared with the page images, corrected and verified before use. */
export function AdminDocumentsPage() {
  useDocumentTitle('Admin · Documents');
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState<DocumentStatus | ''>('PENDING_REVIEW');
  const [page, setPage] = useState(0);
  const list = useApi(() => adminService.documents({ status: status || undefined, page, size: 20 }), [status, page]);
  const id = Number(params.get('id'));
  if (Number.isInteger(id) && id > 0) return <Review id={id} />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Documents (PDF and OCR review)</h1>
      <Upload onDone={(newId) => setParams({ id: String(newId) })} />
      <section className="card space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-semibold">Notices</h2>
          <select className="input w-auto text-sm" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as DocumentStatus | ''); setPage(0); }}>
            {(Object.keys(statusLabel) as DocumentStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
            <option value="">All</option>
          </select>
        </div>
        {(list.data?.content ?? []).length === 0 ? <p className="text-sm text-slate-500">No documents.</p> : (
          <ul className="divide-y divide-slate-100 text-sm">
            {(list.data?.content ?? []).map((d) => (
              <li key={d.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                <button type="button" className="link font-medium" onClick={() => setParams({ id: String(d.id) })}>{d.title}</button>
                <span className={`chip ${statusTone[d.status]}`}>{statusLabel[d.status]}</span>
                <span className="text-xs text-slate-500">{methodLabel[d.extractionMethod]} · {d.pageCount} p. · added {formatDate(d.createdAt)}{d.schoolName ? ` · ${d.schoolName}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
        {list.data && list.data.totalPages > 1 && (
          <div className="flex gap-2 text-sm">
            <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <button type="button" className="btn-secondary" disabled={page + 1 >= list.data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>
    </div>
  );
}
