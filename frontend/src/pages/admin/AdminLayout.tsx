import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const LINKS = [
  { to: '/admin', label: 'Data quality', end: true },
  { to: '/admin/coverage', label: 'State coverage' },
  { to: '/admin/schools', label: 'Schools' },
  { to: '/admin/facility-verification', label: 'Facility verification' },
  { to: '/admin/import', label: 'Import', adminOnly: true },
  { to: '/admin/submissions', label: 'Suggested updates' },
  { to: '/admin/exams', label: 'Entrance exams' },
  { to: '/admin/practice', label: 'Practice questions' },
  { to: '/admin/reviews', label: 'Review moderation' },
  { to: '/admin/rankings', label: 'Ranking weights' },
  { to: '/admin/audit', label: 'Audit log', adminOnly: true },
];

/** Guards every admin route; the API enforces the same rules server-side. */
export function AdminLayout() {
  const { session, logout, isAdmin } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;

  return (
    <div className="container-page grid gap-6 py-8 lg:grid-cols-[220px_1fr]">
      <aside className="space-y-4">
        <div className="card p-4 text-sm">
          <p className="font-semibold">{session.username}</p>
          <p className="text-xs text-slate-500">{session.role === 'ADMIN' ? 'Administrator' : 'Editor'}</p>
          <button type="button" className="btn-secondary mt-3 w-full py-1.5 text-xs" onClick={logout}>Sign out</button>
        </div>
        <nav aria-label="Admin" className="card flex flex-col p-2 text-sm">
          {LINKS.filter((l) => !l.adminOnly || isAdmin).map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `rounded-lg px-3 py-2 ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-700 hover:bg-slate-50'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <section className="min-w-0"><Outlet /></section>
    </div>
  );
}
