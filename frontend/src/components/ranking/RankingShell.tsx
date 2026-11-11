import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Breadcrumbs } from '../common/Breadcrumbs';
import { PageHeader } from '../common/PageHeader';
import { availableItems, RANKING_ITEMS } from '../layout/MainNav';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { rankingService } from '../../services/publicApi';

/** The frame of every ranking page: header with breadcrumbs, the ranking sections bar, and the publisher note. */
export function RankingShell({ title, heading, subtitle, description, crumbs = [], hero, children }: {
  title: string; heading?: string; subtitle: ReactNode; description?: string; crumbs?: { to: string; label: string }[];
  /** Shown inside the page header, under the subtitle (the search on the rankings home page). */
  hero?: ReactNode; children: ReactNode;
}) {
  useDocumentTitle(title, description);
  return (
    <>
      <PageHeader title={heading ?? title} subtitle={subtitle}
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/rankings', label: 'Rankings' }, ...crumbs]} />}>{hero}</PageHeader>
      <RankingSubNav />
      <div className="container-page space-y-8 py-8">
        {children}
        <p className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Every published rank belongs to its publisher, and SchoolDhundo is not affiliated with any publisher. The premier school directory is
          SchoolDhundo’s own selection, listed A to Z, and is not a ranking.{' '}
          <Link to="/rankings/methodology" className="underline hover:text-brand-700">Ranking methodology</Link>
        </p>
      </div>
    </>
  );
}

/** The ranking sections, under the page header, so moving between them never needs the main menu. */
function RankingSubNav() {
  const sections = useApi(() => rankingService.sections(), []);
  return (
    <nav aria-label="Ranking sections" className="border-b border-slate-200 bg-white">
      <ul className="container-page no-scrollbar flex gap-1 overflow-x-auto">
        {availableItems(RANKING_ITEMS, sections.data).map((item) => (
          <li key={item.to}>
            <NavLink to={item.to} end className={({ isActive }) => `block whitespace-nowrap border-b-2 px-3 py-3 text-sm font-semibold transition ${
              isActive ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-ink'}`}>
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
