import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VerificationBadge } from '../../components/common/Badges';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDebounce } from '../../hooks/useDebounce';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { schoolTypeLabel } from '../../utils/format';

export function AdminSchoolsPage() {
  useDocumentTitle('Admin · Schools');
  const [q, setQ] = useState('');
  const [active, setActive] = useState<'' | 'true' | 'false'>('');
  const [page, setPage] = useState(0);
  const debounced = useDebounce(q, 300);
  const state = useApi(
    () => adminService.schools(debounced || undefined, active === '' ? undefined : active === 'true', page),
    [debounced, active, page],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Link to="/admin/schools/new" className="btn-primary">+ Add school</Link>
      </div>
      <div className="card flex flex-wrap gap-3 p-4">
        <input className="input max-w-xs" placeholder="Search by name" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
        <select className="input w-auto" value={active} onChange={(e) => { setActive(e.target.value as typeof active); setPage(0); }}>
          <option value="">Active and inactive</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>
      <AsyncContent state={state} isEmpty={(d) => d.content.length === 0} empty={<EmptyState title="No schools found." />}>
        {(data) => (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Locality</th><th className="px-4 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {data.content.map((s) => (
                    <tr key={s.id} className="border-t border-slate-100">
                      <td className="px-4 py-2"><Link to={`/admin/schools/${s.id}`} className="font-medium hover:text-brand-700">{s.name}</Link></td>
                      <td className="px-4 py-2">{schoolTypeLabel[s.schoolType]}</td>
                      <td className="px-4 py-2">{s.locality ?? '—'}</td>
                      <td className="px-4 py-2"><VerificationBadge status={s.verificationStatus} date={s.lastVerifiedDate} /></td>
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
