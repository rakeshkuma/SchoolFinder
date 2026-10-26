import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { SourceLink, VerificationBadge } from '../components/common/Badges';
import { PageHeader } from '../components/common/PageHeader';
import { ErrorState, Spinner } from '../components/common/States';
import { SchoolPicker } from '../components/school/SchoolPicker';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MAX_COMPARE, useCompare } from '../hooks/useCompare';
import { ApiError } from '../services/http';
import { feeService, referenceService, schoolService } from '../services/publicApi';
import type { FeeCalculationSelection, FeeEstimate } from '../types/api';
import { feeComponentLabel, formatDate, formatMoney } from '../utils/format';

interface Row extends FeeCalculationSelection {
  name: string;
}

export function FeeCalculatorPage() {
  useDocumentTitle('School fee calculator');
  const [searchParams] = useSearchParams();
  const compare = useCompare();
  const classes = useApi(() => referenceService.classes(), []);
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<FeeEstimate[] | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [busy, setBusy] = useState(false);

  // Pre-fill from ?school=ID (fees tab link) or from the compare list.
  useEffect(() => {
    const id = Number(searchParams.get('school'));
    if (id) {
      schoolService.byId(id).then((s) => setRows([{ schoolId: s.id, name: s.name, classCode: 'NURSERY', includeTransport: false, includeBooksAndUniform: false }])).catch(() => undefined);
    } else if (compare.items.length) {
      setRows(compare.items.map((c) => ({ schoolId: c.id, name: c.name, classCode: 'NURSERY', includeTransport: false, includeBooksAndUniform: false })));
    }
  }, []); // only on first load: later edits belong to the user

  const update = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setResults(null);
  };

  const calculate = async () => {
    setBusy(true);
    setError(null);
    try {
      setResults(await feeService.calculate(rows.map(({ name: _name, ...sel }) => sel)));
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError('Calculation failed', 0));
    } finally {
      setBusy(false);
    }
  };

  const chartData = (results ?? []).filter((r) => r.firstYearTotal !== null).map((r) => ({
    name: r.schoolName.length > 22 ? `${r.schoolName.slice(0, 21)}…` : r.schoolName,
    'First year': r.firstYearTotal,
    'Recurring annual': r.recurringAnnualTotal,
  }));

  return (
    <>
      <PageHeader
        title="School fee calculator"
        subtitle="Estimate first-year and recurring costs from published fee schedules. Official fees and estimates are labelled separately, and refundable deposits are shown apart from charges."
      />
      <div className="container-page space-y-6 py-8">
        <section className="card space-y-4 p-5">
          <SchoolPicker
            disabled={rows.length >= MAX_COMPARE}
            exclude={rows.map((r) => r.schoolId)}
            onPick={(s) => { setRows((rs) => [...rs, { schoolId: s.id, name: s.name, classCode: 'NURSERY', includeTransport: false, includeBooksAndUniform: false }]); setResults(null); }}
          />
          {rows.length === 0 && <p className="text-sm text-slate-600">Add up to {MAX_COMPARE} schools to estimate their costs side by side.</p>}
          {rows.map((r, i) => (
            <div key={r.schoolId} className="grid items-end gap-3 rounded-lg border border-slate-200 p-3 sm:grid-cols-[1fr_180px_auto_auto_auto]">
              <p className="font-medium">{r.name}</p>
              <label className="text-sm"><span className="label">Class</span>
                <select className="input" value={r.classCode} onChange={(e) => update(i, { classCode: e.target.value })}>
                  {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.includeTransport} onChange={(e) => update(i, { includeTransport: e.target.checked })} />School transport</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={r.includeBooksAndUniform} onChange={(e) => update(i, { includeBooksAndUniform: e.target.checked })} />Books &amp; uniform (estimate)</label>
              <button type="button" className="btn-secondary px-3 py-1.5 text-xs" onClick={() => { setRows((rs) => rs.filter((_, idx) => idx !== i)); setResults(null); }}>Remove</button>
            </div>
          ))}
          <button type="button" className="btn-primary" disabled={rows.length === 0 || busy} onClick={calculate}>
            {busy ? 'Calculating…' : 'Calculate costs'}
          </button>
        </section>

        {busy && <Spinner label="Calculating…" />}
        {error && <ErrorState error={error} />}

        {results && (
          <>
            {chartData.length > 0 && (
              <section className="card p-5">
                <h2 className="font-semibold">Cost comparison</h2>
                <div className="mt-3 h-72">
                  <ResponsiveContainer>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatMoney(v)} />
                      <Legend />
                      <Bar dataKey="First year" fill="#1d5dee" />
                      <Bar dataKey="Recurring annual" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            )}
            <div className="grid gap-4 lg:grid-cols-2">
              {results.map((r) => <EstimateCard key={`${r.schoolId}-${r.classCode}`} estimate={r} />)}
            </div>
          </>
        )}
        <p className="text-xs text-slate-500">
          Estimates are for planning only. Fees can change; confirm with the school’s official fee circular. Fee regulation for
          private unaided schools in Delhi is overseen by the <a className="link" href="https://www.edudel.nic.in/" target="_blank" rel="noopener noreferrer">Directorate of Education</a>.
          {' '}<Link to="/compare" className="link">Compare schools side by side →</Link>
        </p>
      </div>
    </>
  );
}

function EstimateCard({ estimate: e }: { estimate: FeeEstimate }) {
  if (!e.feeDataAvailable) {
    return (
      <section className="card p-5">
        <h3 className="font-semibold">{e.schoolName} · {e.classCode}</h3>
        <p className="mt-2 text-sm text-slate-600">{e.formula[0]}</p>
      </section>
    );
  }
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 p-4">
        <div>
          <h3 className="font-semibold">{e.schoolName}</h3>
          <p className="text-xs text-slate-500">{e.classCode} · academic year {e.academicYear} · last verified {formatDate(e.lastVerifiedDate)}</p>
          <SourceLink url={e.sourceUrl} label="Fee source" />
        </div>
        {e.verificationStatus && <VerificationBadge status={e.verificationStatus} date={e.lastVerifiedDate} />}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs text-slate-500">
          <tr><th className="px-4 py-2">Component</th><th className="px-4 py-2 text-right">Amount</th><th className="px-4 py-2 text-right">Per year</th></tr>
        </thead>
        <tbody>
          {e.lines.map((l) => (
            <tr key={l.component} className="border-t border-slate-100">
              <td className="px-4 py-2">
                {l.label}
                <span className="ml-1 text-xs text-slate-500">
                  {!l.official && '· estimate '}{l.refundable && '· refundable '}{l.frequency === 'ONE_TIME' && '· one-time'}
                </span>
              </td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(l.amount)}{l.multiplier > 1 && <span className="text-xs text-slate-500"> × {l.multiplier}</span>}</td>
              <td className="px-4 py-2 text-right tabular-nums">{formatMoney(l.annualisedAmount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-slate-50 font-semibold">
          <tr><td className="px-4 py-2">Recurring annual</td><td /><td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.recurringAnnualTotal)}</td></tr>
          <tr><td className="px-4 py-2">First year (excl. deposit)</td><td /><td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.firstYearTotal)}</td></tr>
          {e.refundableDeposit !== null && (
            <tr className="font-normal"><td className="px-4 py-2">First-year cash outlay incl. deposit</td><td /><td className="px-4 py-2 text-right tabular-nums">{formatMoney(e.firstYearCashOutlay)}</td></tr>
          )}
        </tfoot>
      </table>
      {e.missingComponents.length > 0 && (
        <p className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800">
          {e.recurringAnnualTotal !== null ? 'The first-year total is' : 'Totals are'} unavailable because these amounts are not published: {e.missingComponents.map((c) => feeComponentLabel[c] ?? c).join(', ')}.
        </p>
      )}
      <details className="border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
        <summary className="cursor-pointer font-medium">Formula used</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">{e.formula.map((f) => <li key={f}>{f}</li>)}</ul>
      </details>
    </section>
  );
}
