import { Link } from 'react-router-dom';
import { SourceLink } from '../components/common/Badges';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState, Spinner } from '../components/common/States';
import { SchoolPicker } from '../components/school/SchoolPicker';
import { useApi } from '../hooks/useApi';
import { MAX_COMPARE, useCompare } from '../hooks/useCompare';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { schoolService } from '../services/publicApi';
import type { ExternalRanking, SchoolRankingDetail } from '../types/api';
import { listTitle } from './PublishedRankingsPage';

/** Every published list any of the schools appears in, in a stable order; sponsored listings are kept apart. */
export function rankingRows(details: SchoolRankingDetail[]): string[] {
  const titles = new Set<string>();
  details.forEach((d) => d.externalRankings.filter((e) => !e.sponsored).forEach((e) => titles.add(listTitle(e))));
  return [...titles].sort();
}

function cell(d: SchoolRankingDetail, title: string): ExternalRanking | undefined {
  return d.externalRankings.find((e) => !e.sponsored && listTitle(e) === title);
}

/** The schools on the comparison list, side by side: our score and each verified published ranking. */
export function RankingComparePage() {
  useDocumentTitle('Compare school rankings');
  const { items, toggle, remove } = useCompare();
  const ids = items.map((i) => i.id);
  const state = useApi(() => Promise.all(ids.map((id) => schoolService.ranking(id))), [ids.join(',')], ids.length > 0);
  const details = state.data && state.data.length === ids.length ? state.data : [];
  const rows = rankingRows(details);

  return (
    <>
      <PageHeader eyebrow="Rankings" title="Compare school rankings"
        subtitle="Our evidence-based score and every published ranking we have checked, side by side. “Not listed” means we have no checked entry, not a low rank." />
      <div className="container-page space-y-6 py-8">
        <div className="card p-4">
          <SchoolPicker disabled={items.length >= MAX_COMPARE} exclude={ids} onPick={(s) => toggle({ id: s.id, name: s.name, slug: s.slug })} />
          <p className="mt-2 text-xs text-slate-500">Up to {MAX_COMPARE} schools. The same list is used on <Link className="link" to="/compare">Compare schools</Link>.</p>
        </div>
        {ids.length === 0 ? (
          <EmptyState title="Add schools to compare.">Search above, or use “Compare” on any school card.</EmptyState>
        ) : state.loading || details.length === 0 ? (
          state.error ? <p role="alert" className="field-error">{state.error.message}</p> : <Spinner label="Loading rankings…" />
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <caption className="sr-only">Rankings of the selected schools</caption>
              <thead>
                <tr className="text-left">
                  <th scope="col" className="w-56 p-3 text-slate-500">Ranking</th>
                  {items.map((s) => (
                    <th key={s.id} scope="col" className="p-3 align-top">
                      <Link className="link font-semibold" to={`/schools/${s.slug}`}>{s.name}</Link>
                      <button type="button" className="ml-2 text-xs text-slate-500 hover:underline" onClick={() => remove(s.id)} aria-label={`Remove ${s.name}`}>Remove</button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <th scope="row" className="p-3 text-left font-medium">India School Finder score</th>
                  {details.map((d) => (
                    <td key={d.schoolId} className="p-3">
                      {d.siteRanking ? (
                        <>
                          <span className="font-semibold">{d.siteRanking.totalScore.toFixed(1)}/100</span>{' '}
                          <span className="text-slate-600">{d.siteRanking.rankPosition ? `· #${d.siteRanking.rankPosition} in India` : '· provisional'}</span>
                        </>
                      ) : <span className="text-slate-500">Not yet ranked</span>}
                    </td>
                  ))}
                </tr>
                {rows.map((title) => (
                  <tr key={title}>
                    <th scope="row" className="p-3 text-left font-medium">{title}</th>
                    {details.map((d) => {
                      const e = cell(d, title);
                      return (
                        <td key={d.schoolId} className="p-3">
                          {e ? (
                            <>
                              <span className="font-semibold">{e.rankPosition ? `#${e.rankPosition}` : e.scoreText ?? 'Listed'}</span>{' '}
                              <SourceLink url={e.sourceUrl} />
                            </>
                          ) : <span className="text-slate-500">Not listed</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {details.some((d) => d.externalRankings.some((e) => e.sponsored)) && (
                  <tr>
                    <th scope="row" className="p-3 text-left font-medium">Sponsored or featured listings <span className="block text-xs font-normal text-slate-500">Paid placements, not rankings</span></th>
                    {details.map((d) => (
                      <td key={d.schoolId} className="p-3 text-slate-600">
                        {d.externalRankings.filter((e) => e.sponsored).map((e) => e.publisher).join(', ') || '—'}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="border-t border-slate-100 p-3 text-sm text-slate-600">None of these schools has a checked entry in a published ranking yet.</p>
            )}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Published positions compare only within the same list and edition. See <Link className="link" to="/rankings/published">published rankings</Link> and
          our <Link className="link" to="/rankings/methodology">ranking method</Link>.
        </p>
      </div>
    </>
  );
}
