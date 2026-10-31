import { Link } from 'react-router-dom';
import { AsyncContent } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { formatDate } from '../../utils/format';

/** Work waiting for a person: nothing in these queues is shown publicly until someone approves it. */
function ReviewQueues() {
  const queues = useApi(async () => {
    const [docs, rankings, duplicates] = await Promise.all([
      adminService.documents({ status: 'PENDING_REVIEW', size: 1 }),
      adminService.externalRankings({ status: 'UNVERIFIED', size: 1 }),
      adminService.duplicates(),
    ]);
    return { docs: docs.totalElements, rankings: rankings.totalElements, duplicates: duplicates.groups.length };
  }, []);
  const q = queues.data;
  const items: [string, number | undefined, string][] = [
    ['Notices to review', q?.docs, '/admin/documents'],
    ['Published-ranking entries to check', q?.rankings, '/admin/external-rankings'],
    ['Possible duplicate schools', q?.duplicates, '/admin/duplicates'],
  ];
  return (
    <section aria-labelledby="queues" className="card p-4">
      <h2 id="queues" className="font-semibold">Waiting for review</h2>
      <p className="text-xs text-slate-500">School photos waiting for approval are on <Link className="link" to="/admin/images">School images</Link>, school by school.</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {items.map(([label, n, to]) => (
          <li key={to}>
            <Link to={to} className="card card-hover block p-3">
              <span className={`block text-2xl font-bold ${n ? 'text-amber-700' : 'text-slate-400'}`}>{n ?? '…'}</span>
              <span className="text-sm text-slate-600">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

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
          <ReviewQueues />
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
