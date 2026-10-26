import { useEffect, useState } from 'react';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { Stars } from '../../components/common/Badges';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import { rankingService } from '../../services/publicApi';
import type { CsvImportResult, RankingCriterion, ReviewStatus } from '../../types/api';
import { formatDate } from '../../utils/format';

const CSV_TEMPLATE = [
  'name,school_type,management,network,udise_code,affiliation_number,principal_name,managing_body,board_code,class_codes,medium_of_instruction,gender_type,website_url,admission_portal_url,phone,email,address_line,locality,city,district,state_code,pin_code,latitude,longitude,school_timings,established_year,has_transport,has_hostel,accessibility_features,description,source_url,source_retrieved_date,facilities,facilities_source_url',
].join('\n');

export function AdminImportPage() {
  useDocumentTitle('Admin · Import');
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState('VALIDATE_ONLY');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await adminService.importCsv(file, mode, updateExisting));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import schools (CSV or JSON)</h1>
      <div className="card space-y-4 p-6">
        <p className="text-sm text-slate-600">
          Every row is validated (required source URL and state/UT, Indian PIN codes and coordinates, 11-digit UDISE codes,
          known board and class codes, duplicates) before anything is saved. Start with <strong>Validate only</strong>.
          Blank cells are stored as “not available”. <code>state_code</code> accepts an ISO code (UP) or the full name.
          Duplicates are matched by UDISE code first, then by name + PIN within the state. New district names are created —
          check spelling in the validation report first.
        </p>
        <p className="text-sm text-slate-600">
          JSON works too: an array of objects (or <code>{'{"schools": [...]}'}</code>) using the same column names as keys;
          <code>class_codes</code> and <code>facilities</code> may be arrays. Errors then refer to the school's position in the array.
          Schools an administrator has verified are never overwritten by an import.
        </p>
        <a className="link text-sm" download="schools-template.csv" href={`data:text/csv;charset=utf-8,${encodeURIComponent(CSV_TEMPLATE + '\n')}`}>Download template</a>
        <input type="file" accept=".csv,text/csv,.json,application/json" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block text-sm" />
        <div className="flex flex-wrap gap-4 text-sm">
          {[['VALIDATE_ONLY', 'Validate only'], ['ALL_OR_NOTHING', 'Import if every row is valid'], ['VALID_ROWS_ONLY', 'Import valid rows, skip invalid']].map(([v, l]) => (
            <label key={v} className="flex items-center gap-2"><input type="radio" name="mode" value={v} checked={mode === v} onChange={() => setMode(v)} />{l}</label>
          ))}
          <label className="flex items-center gap-2"><input type="checkbox" checked={updateExisting} onChange={(e) => setUpdateExisting(e.target.checked)} />Update existing schools (same name + PIN)</label>
        </div>
        <button type="button" className="btn-primary" disabled={!file || busy} onClick={run}>{busy ? 'Processing…' : 'Run'}</button>
        {error && <p className="field-error">{error}</p>}
      </div>
      {result && (
        <div className="card p-6">
          <p className="font-semibold">{result.committed ? '✅ Import committed' : result.mode === 'VALIDATE_ONLY' ? 'Validation finished (nothing saved)' : '⚠️ Nothing saved'}</p>
          <p className="mt-1 text-sm text-slate-600">
            {result.totalRows} rows · {result.validRows} valid · {result.created} created · {result.updated} updated · {result.errors.length} problems
          </p>
          {result.errors.length > 0 && (
            <div className="mt-4 max-h-96 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left"><tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Column</th><th className="px-3 py-2">Problem</th></tr></thead>
                <tbody>{result.errors.map((e, i) => <tr key={i} className="border-t border-slate-100"><td className="px-3 py-1.5">{e.row}</td><td className="px-3 py-1.5 font-mono text-xs">{e.field}</td><td className="px-3 py-1.5">{e.message}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function AdminReviewsPage() {
  useDocumentTitle('Admin · Reviews');
  const [status, setStatus] = useState<ReviewStatus>('PENDING');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const state = useApi(() => adminService.reviews(status, page), [status, page, nonce]);
  const moderate = async (id: number, next: ReviewStatus) => {
    const note = next === 'REJECTED' ? window.prompt('Reason for rejection (kept internally):') ?? undefined : undefined;
    await adminService.moderateReview(id, next, note);
    setNonce((n) => n + 1);
  };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Review moderation</h1>
      <div className="flex gap-2">
        {(['PENDING', 'APPROVED', 'REJECTED'] as ReviewStatus[]).map((s) => (
          <button key={s} type="button" onClick={() => { setStatus(s); setPage(0); }}
            className={`chip px-3 py-1 text-sm ${s === status ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{s.toLowerCase()}</button>
        ))}
      </div>
      <AsyncContent state={state} isEmpty={(d) => d.content.length === 0} empty={<EmptyState title={`No ${status.toLowerCase()} reviews.`} />}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((r) => (
                <li key={r.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{r.title}</p>
                    <Stars rating={r.rating} />
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{r.comment}</p>
                  <p className="mt-2 text-xs text-slate-500">School #{r.schoolId} · {r.reviewerName ?? 'Anonymous'} · {r.relationship} · {formatDate(r.createdAt)}</p>
                  <p className="mt-1 text-xs text-amber-700">Check for personal data about children, contact details or abuse before approving.</p>
                  <div className="mt-3 flex gap-2">
                    {r.status !== 'APPROVED' && <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => moderate(r.id, 'APPROVED')}>Approve</button>}
                    {r.status !== 'REJECTED' && <button type="button" className="btn-danger py-1.5 text-xs" onClick={() => moderate(r.id, 'REJECTED')}>Reject</button>}
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

export function AdminRankingPage() {
  useDocumentTitle('Admin · Ranking weights');
  const methodology = useApi(() => rankingService.methodology(), []);
  const [criteria, setCriteria] = useState<RankingCriterion[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    if (methodology.data) setCriteria(methodology.data.criteria);
  }, [methodology.data]);
  const total = criteria.filter((c) => c.active).reduce((sum, c) => sum + Number(c.weight || 0), 0);

  const save = async () => {
    try {
      const m = await adminService.updateWeights(criteria.map((c) => ({ code: c.code, weight: Number(c.weight), active: c.active })));
      setCriteria(m.criteria);
      setMsg({ ok: true, text: `Saved and recalculated: ${m.rankedSchools} ranked, ${m.provisionalSchools} provisional.` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };
  const recalc = async () => {
    const r = await adminService.recalculateRankings();
    setMsg({ ok: true, text: `Recalculated: ${r.scoredSchools} schools scored.` });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Ranking weights</h1>
      <div className="card overflow-x-auto p-4">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-600"><tr><th className="py-2">Criterion</th><th className="py-2">Active</th><th className="py-2 text-right">Weight %</th></tr></thead>
          <tbody>
            {criteria.map((c, i) => (
              <tr key={c.code} className="border-t border-slate-100">
                <td className="py-2"><p className="font-medium">{c.name}</p><p className="text-xs text-slate-500">{c.description}</p></td>
                <td className="py-2"><input type="checkbox" checked={c.active} onChange={(e) => setCriteria((cs) => cs.map((x, j) => (j === i ? { ...x, active: e.target.checked } : x)))} /></td>
                <td className="py-2 text-right">
                  <input type="number" min={0} max={100} step={0.5} className="input ml-auto w-24 text-right" value={c.weight}
                    onChange={(e) => setCriteria((cs) => cs.map((x, j) => (j === i ? { ...x, weight: Number(e.target.value) } : x)))} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-slate-200 font-semibold"><td className="py-2">Total (active)</td><td /><td className={`py-2 text-right ${total === 100 ? 'text-emerald-700' : 'text-red-600'}`}>{total}%</td></tr></tfoot>
        </table>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn-primary" disabled={total !== 100} onClick={save}>Save weights</button>
          <button type="button" className="btn-secondary" onClick={recalc}>Recalculate now</button>
          {msg && <p className={msg.ok ? 'text-sm text-emerald-700' : 'field-error'}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}

export function AdminAuditPage() {
  useDocumentTitle('Admin · Audit log');
  const [page, setPage] = useState(0);
  const state = useApi(() => adminService.auditLog(page), [page]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit log</h1>
      <AsyncContent state={state} isEmpty={(d) => d.content.length === 0} empty={<EmptyState title="No administrative changes yet." />}>
        {(data) => (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">Record</th><th className="px-3 py-2">Details</th></tr></thead>
                <tbody>
                  {data.content.map((a) => (
                    <tr key={a.id} className="border-t border-slate-100">
                      <td className="whitespace-nowrap px-3 py-2">{new Date(a.createdAt).toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2">{a.actor}</td>
                      <td className="px-3 py-2 font-mono text-xs">{a.action}</td>
                      <td className="px-3 py-2">{a.entityType}{a.entityId !== null && ` #${a.entityId}`}</td>
                      <td className="px-3 py-2 text-xs text-slate-600">{a.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
