import { Link } from 'react-router-dom';
import { AsyncContent } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { formatDate } from '../../utils/format';

export function AdminDashboardPage() {
  useDocumentTitle('Admin · Data quality');
  const state = useApi(() => adminService.dataQuality(), []);
  return (
    <AsyncContent state={state}>
      {(r) => (
        <div className="space-y-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="text-2xl font-bold">Data quality</h1>
            <p className="text-xs text-slate-500">Generated {formatDate(r.generatedAt)} · academic year {r.currentAcademicYear}</p>
          </div>
          <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Active schools', r.activeSchools, ''],
              ['Verified', r.verifiedSchools, 'text-emerald-700'],
              ['Pending verification', r.unverifiedSchools, 'text-amber-700'],
              ['Stale verifications', r.staleVerifications, 'text-orange-700'],
              ['Missing coordinates', r.missingCoordinates, ''],
              ['No phone or email', r.missingContactDetails, ''],
              ['Board not recorded', r.missingBoard, ''],
              [`No ${r.currentAcademicYear} fees`, r.schoolsWithoutCurrentFees, ''],
              ['Admissions without dates', r.admissionsWithoutDates, ''],
              ['Pending reviews', r.pendingReviews, r.pendingReviews ? 'text-brand-700' : ''],
              ['Ranked (definitive)', r.definitiveRankings, ''],
              ['Provisional rankings', r.provisionalRankings, ''],
            ].map(([label, value, cls]) => (
              <div key={label as string} className="card p-4">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className={`text-2xl font-bold ${cls}`}>{value}</dd>
              </div>
            ))}
          </dl>
          <section className="card">
            <h2 className="border-b border-slate-100 p-4 font-semibold">Schools needing attention</h2>
            {r.schoolsNeedingAttention.length === 0 ? (
              <p className="p-4 text-sm text-slate-600">Nothing to fix. 🎉</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {r.schoolsNeedingAttention.map((s) => (
                  <li key={s.schoolId} className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <Link to={`/admin/schools/${s.schoolId}`} className="font-medium hover:text-brand-700">{s.name}</Link>
                      <ul className="mt-1 flex flex-wrap gap-1">
                        {s.issues.map((i) => <li key={i} className="chip bg-amber-50 text-amber-800">{i}</li>)}
                      </ul>
                    </div>
                    <Link to={`/admin/schools/${s.schoolId}`} className="btn-secondary py-1.5 text-xs">Fix</Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </AsyncContent>
  );
}
