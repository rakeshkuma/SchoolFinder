import { Link } from 'react-router-dom';
import { AsyncContent } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import type { StateCoverage } from '../../types/api';
import { formatDate } from '../../utils/format';

const COLUMNS: { key: keyof StateCoverage; label: string }[] = [
  { key: 'verified', label: 'Verified' },
  { key: 'withPhoto', label: 'Photo' },
  { key: 'withFees', label: 'Fees' },
  { key: 'withAdmissions', label: 'Admissions' },
  { key: 'withContact', label: 'Phone / e-mail' },
  { key: 'withCoordinates', label: 'Map location' },
  { key: 'withClasses', label: 'Classes' },
];

/** "12 / 474" plus a bar; the share is of schools held here, not of the state's real total. */
function Share({ n, of }: { n: number; of: number }) {
  const pct = of === 0 ? 0 : Math.round((n / of) * 100);
  return (
    <div className="min-w-[5.5rem]">
      <span className="tabular-nums">{n.toLocaleString('en-IN')}</span>
      <span className="text-slate-400"> · {pct}%</span>
      <div className="mt-1 h-1.5 rounded bg-slate-100" aria-hidden>
        <div className="h-1.5 rounded bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function AdminCoveragePage() {
  useDocumentTitle('Admin · State coverage');
  const state = useApi(() => adminService.coverage(), []);
  return (
    <AsyncContent state={state}>
      {(r) => {
        const priority = r.states.filter((s) => s.priority);
        const others = r.states.filter((s) => !s.priority && s.schools > 0);
        const empty = r.states.filter((s) => !s.priority && s.schools === 0);
        const table = (rows: StateCoverage[]) => (
          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs text-slate-500">
                <tr>
                  <th className="p-3">State / UT</th>
                  <th className="p-3">Schools</th>
                  <th className="p-3">Private</th>
                  {COLUMNS.map((c) => <th key={c.key} className="p-3">{c.label}</th>)}
                  <th className="p-3">Last change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((s) => (
                  <tr key={s.code}>
                    <td className="p-3 font-medium">
                      <Link to={`/schools?state=${s.code}`} className="hover:text-brand-700">{s.name}</Link>
                    </td>
                    <td className="p-3 tabular-nums">{s.schools.toLocaleString('en-IN')}</td>
                    <td className="p-3 tabular-nums">{s.privateSchools.toLocaleString('en-IN')}</td>
                    {COLUMNS.map((c) => <td key={c.key} className="p-3"><Share n={s[c.key] as number} of={s.schools} /></td>)}
                    <td className="p-3 text-xs text-slate-500">{s.lastUpdated ? formatDate(s.lastUpdated) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        return (
          <div className="space-y-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-2xl font-bold">State coverage</h1>
              <p className="text-xs text-slate-500">Generated {formatDate(r.generatedAt)}</p>
            </div>
            <p className="text-sm text-slate-600">
              Counts of active schools held in this directory and how many have each kind of information. Percentages are of the
              schools listed here, not of every school in the state, so no state is shown as complete.
            </p>
            <section className="space-y-2">
              <h2 className="font-semibold">Priority states</h2>
              {table(priority)}
            </section>
            {others.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-semibold">Other states and UTs with listings</h2>
                {table(others)}
              </section>
            )}
            {empty.length > 0 && (
              <p className="text-xs text-slate-500">No schools listed yet: {empty.map((s) => s.name).join(', ')}.</p>
            )}
          </div>
        );
      }}
    </AsyncContent>
  );
}
