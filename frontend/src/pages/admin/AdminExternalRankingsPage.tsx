import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SourceLink, VerificationBadge } from '../../components/common/Badges';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type {
  CsvImportResult,
  ExternalRankingRequest,
  RankingPublisher,
  RankingPublisherKind,
  RankingScope,
  SchoolSummary,
  VerificationStatus,
} from '../../types/api';
import { publisherKindLabel } from '../PublishedRankingsPage';

const message = (e: unknown) => (e instanceof ApiError ? [e.message, ...e.fieldErrors.map((f) => `${f.field}: ${f.message}`)].join(' · ') : 'Something went wrong.');
const today = () => new Date().toISOString().slice(0, 10);

export const CSV_TEMPLATE = 'school_slug,publisher_code,ranking_name,ranking_year,category,scope,region,rank_position,score_text,sponsored,source_url,retrieved_date,notes';

function PublisherForm({ publisher, onSaved }: { publisher?: RankingPublisher; onSaved: (text: string) => void }) {
  const [v, setV] = useState({
    code: publisher?.code ?? '', name: publisher?.name ?? '', kind: publisher?.kind ?? ('SURVEY' as RankingPublisherKind),
    websiteUrl: publisher?.websiteUrl ?? '', methodologyUrl: publisher?.methodologyUrl ?? '', description: publisher?.description ?? '',
    active: publisher?.active ?? true,
  });
  const [error, setError] = useState<string | null>(null);
  const nul = (s: string) => (s.trim() ? s.trim() : null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await adminService.saveRankingPublisher(v.code.trim().toUpperCase(), {
        name: v.name.trim(), kind: v.kind, websiteUrl: nul(v.websiteUrl), methodologyUrl: nul(v.methodologyUrl),
        description: nul(v.description), active: v.active,
      });
      onSaved(`Publisher ${v.name} saved.`);
    } catch (err) {
      setError(message(err));
    }
  };
  return (
    <form onSubmit={save} className="grid gap-2 text-sm sm:grid-cols-2">
      {!publisher && <input className="input" aria-label="Code" placeholder="Code, e.g. GREEN_SCHOOLS" value={v.code} onChange={(e) => setV({ ...v, code: e.target.value })} required />}
      <input className="input" aria-label="Name" placeholder="Name as the publisher writes it" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required />
      <select className="input" aria-label="Kind" value={v.kind} onChange={(e) => setV({ ...v, kind: e.target.value as RankingPublisherKind })}>
        {(Object.keys(publisherKindLabel) as RankingPublisherKind[]).map((k) => <option key={k} value={k}>{publisherKindLabel[k]}</option>)}
      </select>
      <input className="input" aria-label="Website" placeholder="Official website (https://…)" value={v.websiteUrl} onChange={(e) => setV({ ...v, websiteUrl: e.target.value })} />
      <input className="input" aria-label="Methodology page" placeholder="Methodology page (https://…)" value={v.methodologyUrl} onChange={(e) => setV({ ...v, methodologyUrl: e.target.value })} />
      <textarea className="input sm:col-span-2" rows={2} aria-label="Description" placeholder="Short neutral description in your own words (who publishes it, how often)" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      <label className="flex items-center gap-2"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Shown publicly</label>
      <div className="flex items-center gap-2"><button className="btn-primary">Save publisher</button>{error && <span role="alert" className="field-error">{error}</span>}</div>
    </form>
  );
}

function AddEntry({ publishers, onAdded }: { publishers: RankingPublisher[]; onAdded: (text: string) => void }) {
  const [q, setQ] = useState('');
  const [school, setSchool] = useState<SchoolSummary | null>(null);
  const results = useApi(() => adminService.schools(q, undefined, 0, 6), [q], q.trim().length >= 2 && !school);
  const [v, setV] = useState({
    publisherCode: publishers[0]?.code ?? '', rankingName: '', rankingYear: '', category: '', scope: 'NATIONAL' as RankingScope,
    region: '', rankPosition: '', scoreText: '', sponsored: false, sourceUrl: '', retrievedDate: today(), notes: '',
  });
  const [error, setError] = useState<string | null>(null);
  const nul = (s: string) => (s.trim() ? s.trim() : null);
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;
    setError(null);
    const body: ExternalRankingRequest = {
      publisherCode: v.publisherCode, rankingName: v.rankingName.trim(), rankingYear: v.rankingYear.trim(), category: nul(v.category),
      scope: v.scope, region: nul(v.region), rankPosition: v.rankPosition ? Number(v.rankPosition) : null, scoreText: nul(v.scoreText),
      sponsored: v.sponsored, sourceUrl: v.sourceUrl.trim(), retrievedDate: v.retrievedDate, notes: nul(v.notes),
    };
    try {
      await adminService.addExternalRanking(school.id, body);
      onAdded(`Entry for ${school.name} saved as unverified. Check it against the publisher's page to publish it.`);
      setV({ ...v, rankPosition: '', scoreText: '', notes: '' });
      setSchool(null);
      setQ('');
    } catch (err) {
      setError(message(err));
    }
  };
  return (
    <form onSubmit={save} className="grid gap-2 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        {school ? (
          <p>School: <strong>{school.name}</strong> <button type="button" className="link ml-2" onClick={() => setSchool(null)}>change</button></p>
        ) : (
          <>
            <input className="input" aria-label="School" placeholder="School name (type 2+ letters)" value={q} onChange={(e) => setQ(e.target.value)} />
            <ul className="mt-1 divide-y">
              {(q.trim().length >= 2 ? results.data?.content ?? [] : []).map((s) => (
                <li key={s.id}><button type="button" className="w-full px-2 py-1.5 text-left hover:bg-slate-50" onClick={() => setSchool(s)}>
                  {s.name} <span className="text-slate-500">· {[s.city, s.stateName].filter(Boolean).join(', ')}</span></button></li>
              ))}
            </ul>
          </>
        )}
      </div>
      <select className="input" aria-label="Publisher" value={v.publisherCode} onChange={(e) => setV({ ...v, publisherCode: e.target.value })}>
        {publishers.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
      </select>
      <input className="input" aria-label="Ranking name" placeholder="Ranking name as published *" value={v.rankingName} onChange={(e) => setV({ ...v, rankingName: e.target.value })} required />
      <input className="input" aria-label="Edition" placeholder="Edition, e.g. 2025-26 *" value={v.rankingYear} onChange={(e) => setV({ ...v, rankingYear: e.target.value })} required />
      <input className="input" aria-label="Category" placeholder="Category, e.g. Co-ed day schools" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} />
      <select className="input" aria-label="Scope" value={v.scope} onChange={(e) => setV({ ...v, scope: e.target.value as RankingScope })}>
        <option value="NATIONAL">All India list</option><option value="STATE">State list</option><option value="CITY">City list</option>
      </select>
      {v.scope !== 'NATIONAL' && <input className="input" aria-label="Region" placeholder="State or city of the list *" value={v.region} onChange={(e) => setV({ ...v, region: e.target.value })} />}
      <input className="input" type="number" min={1} aria-label="Rank position" placeholder="Rank position" value={v.rankPosition} disabled={v.sponsored} onChange={(e) => setV({ ...v, rankPosition: e.target.value })} />
      <input className="input" aria-label="Wording" placeholder="Publisher's wording, e.g. Top 10 / 1,248 points" value={v.scoreText} onChange={(e) => setV({ ...v, scoreText: e.target.value })} />
      <input className="input sm:col-span-2" aria-label="Source page" placeholder="Publisher's page showing this entry (https://…) *" value={v.sourceUrl} onChange={(e) => setV({ ...v, sourceUrl: e.target.value })} required />
      <label><span className="label">Retrieved on</span><input className="input" type="date" max={today()} value={v.retrievedDate} onChange={(e) => setV({ ...v, retrievedDate: e.target.value })} required /></label>
      <label className="flex items-center gap-2 self-end"><input type="checkbox" checked={v.sponsored} onChange={(e) => setV({ ...v, sponsored: e.target.checked, rankPosition: '' })} /> Paid / featured listing (not a ranking)</label>
      <input className="input sm:col-span-2" aria-label="Notes" placeholder="Notes for editors" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
      <div className="flex items-center gap-2 sm:col-span-2"><button className="btn-primary" disabled={!school}>Save as unverified</button>{error && <span role="alert" className="field-error">{error}</span>}</div>
    </form>
  );
}

function ImportCsv({ onDone }: { onDone: (text: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState('VALIDATE_ONLY');
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (!file) return;
    setError(null);
    try {
      const r = await adminService.importExternalRankings(file, mode);
      setResult(r);
      if (r.committed) onDone(`Imported: ${r.created} new, ${r.updated} changed (all unverified).`);
    } catch (err) {
      setError(message(err));
    }
  };
  return (
    <div className="space-y-2 text-sm">
      <p className="text-xs text-slate-600">Columns: <code className="break-all">{CSV_TEMPLATE}</code>. Enter only entries you have seen on the publisher's page; do not paste whole lists from a paywalled or copyrighted source.</p>
      <div className="flex flex-wrap items-center gap-2">
        <input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <select className="input w-auto" aria-label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="VALIDATE_ONLY">Check only</option><option value="ALL_OR_NOTHING">Import if every row is valid</option><option value="VALID_ROWS_ONLY">Import valid rows</option>
        </select>
        <button type="button" className="btn-primary" disabled={!file} onClick={run}>Run</button>
      </div>
      {error && <p role="alert" className="field-error">{error}</p>}
      {result && (
        <div className="rounded-lg bg-slate-50 p-3 text-xs">
          <p>{result.totalRows} rows · {result.validRows} valid · {result.created} new · {result.updated} changed · {result.committed ? 'saved' : 'nothing saved'}</p>
          {result.errors.length > 0 && (
            <ul className="mt-1 max-h-40 list-disc overflow-auto pl-4 text-red-700">{result.errors.map((e, i) => <li key={i}>Row {e.row}, {e.field}: {e.message}</li>)}</ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Rankings published by others: publishers, entries and their checks. Nothing appears publicly until verified. */
export function AdminExternalRankingsPage() {
  useDocumentTitle('Admin · Published rankings');
  const [nonce, setNonce] = useState(0);
  const [status, setStatus] = useState<VerificationStatus | ''>('UNVERIFIED');
  const [publisher, setPublisher] = useState('');
  const [page, setPage] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const publishers = useApi(() => adminService.rankingPublishers(), [nonce]);
  const entries = useApi(() => adminService.externalRankings({ status: status || undefined, publisher: publisher || undefined, page, size: 25 }), [status, publisher, page, nonce]);
  const done = (text: string) => {
    setMsg(text);
    setEditing(null);
    setNonce((n) => n + 1);
  };
  const decide = async (id: number, s: VerificationStatus) => {
    try {
      await adminService.verifyExternalRanking(id, s);
      done(s === 'VERIFIED' ? 'Entry verified and published.' : `Entry marked ${s.toLowerCase()}.`);
    } catch (e) {
      setMsg(message(e));
    }
  };
  const list = publishers.data ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Published rankings</h1>
      <p className="text-sm text-slate-600">
        Record a school's entry exactly as a publisher printed it, with the page it appears on. Entries are hidden until an editor opens that page and
        marks the entry verified. Sponsored or featured listings are never shown as rankings. Public page: <Link className="link" to="/rankings/published">/rankings/published</Link>.
      </p>
      {msg && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Entries to check</h2>
        <div className="flex flex-wrap gap-2 text-sm">
          <select className="input w-auto" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value as VerificationStatus | ''); setPage(0); }}>
            <option value="UNVERIFIED">Unverified</option><option value="VERIFIED">Verified</option><option value="DISPUTED">Disputed</option><option value="OUTDATED">Outdated</option><option value="">All</option>
          </select>
          <select className="input w-auto" aria-label="Publisher filter" value={publisher} onChange={(e) => { setPublisher(e.target.value); setPage(0); }}>
            <option value="">All publishers</option>{list.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
          </select>
        </div>
        {(entries.data?.content ?? []).length === 0 ? <p className="text-sm text-slate-500">No entries.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-slate-500"><tr><th className="py-2">School</th><th>List</th><th>Entry</th><th>Status</th><th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {(entries.data?.content ?? []).map(({ entry: e, schoolName, schoolSlug }) => (
                  <tr key={e.id} className="align-top">
                    <td className="py-2 pr-2">{schoolSlug ? <Link className="link" to={`/schools/${schoolSlug}`}>{schoolName}</Link> : schoolName}</td>
                    <td className="pr-2">{e.publisher} · {e.rankingName} {e.rankingYear}{e.category ? ` · ${e.category}` : ''}{e.region ? ` · ${e.region}` : ''}
                      <span className="block text-xs text-slate-500">retrieved {e.retrievedDate} · <SourceLink url={e.sourceUrl} label="open page" /></span></td>
                    <td className="pr-2">{e.sponsored ? <span className="chip bg-amber-50 text-amber-900">Sponsored</span> : e.rankPosition ? `#${e.rankPosition}` : e.scoreText}
                      {e.notes && <span className="block text-xs text-slate-500">{e.notes}</span>}</td>
                    <td className="pr-2"><VerificationBadge status={e.verificationStatus} date={e.lastVerifiedDate} /></td>
                    <td className="space-x-1 whitespace-nowrap text-xs">
                      {e.verificationStatus !== 'VERIFIED' && <button type="button" className="btn-primary px-2 py-1 text-xs" onClick={() => decide(e.id, 'VERIFIED')} title="The entry matches the publisher's page">Verify</button>}
                      {e.verificationStatus !== 'DISPUTED' && <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => decide(e.id, 'DISPUTED')}>Dispute</button>}
                      {e.verificationStatus !== 'OUTDATED' && <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => decide(e.id, 'OUTDATED')}>Outdated</button>}
                      <button type="button" className="px-1 text-red-700 hover:underline"
                        onClick={async () => { if (window.confirm('Delete this entry?')) { await adminService.deleteExternalRanking(e.id); done('Entry deleted.'); } }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {entries.data && entries.data.totalPages > 1 && (
          <div className="flex gap-2 text-sm">
            <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
            <span className="self-center">Page {page + 1} of {entries.data.totalPages}</span>
            <button type="button" className="btn-secondary" disabled={page + 1 >= entries.data.totalPages} onClick={() => setPage(page + 1)}>Next</button>
          </div>
        )}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Add an entry</h2>
        {list.length > 0 && <AddEntry publishers={list.filter((p) => p.active)} onAdded={done} />}
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Import entries from CSV <span className="text-xs font-normal text-slate-500">(administrators)</span></h2>
        <ImportCsv onDone={done} />
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold">Publishers</h2>
        <ul className="divide-y divide-slate-100 text-sm">
          {list.map((p) => (
            <li key={p.code} className="py-2">
              <div className="flex flex-wrap items-baseline gap-2">
                <strong>{p.name}</strong><span className="text-xs text-slate-500">{p.code} · {publisherKindLabel[p.kind]} · {p.verifiedEntries} verified{p.active ? '' : ' · hidden'}</span>
                {!p.websiteUrl && <span className="chip bg-amber-50 text-amber-900">Website not recorded</span>}
                <button type="button" className="link ml-auto text-xs" onClick={() => setEditing(editing === p.code ? null : p.code)}>{editing === p.code ? 'Close' : 'Edit'}</button>
              </div>
              {editing === p.code && <div className="mt-2"><PublisherForm publisher={p} onSaved={done} /></div>}
            </li>
          ))}
        </ul>
        <details>
          <summary className="cursor-pointer text-sm font-medium">Add a publisher</summary>
          <div className="mt-2"><PublisherForm onSaved={done} /></div>
        </details>
      </section>
    </div>
  );
}
