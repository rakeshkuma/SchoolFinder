import { Link, useSearchParams } from 'react-router-dom';
import { SourceLink } from '../components/common/Badges';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { rankingService, type ExternalRankingParams } from '../services/publicApi';
import type { ExternalRanking, ExternalRankingListItem, RankingPublisherKind } from '../types/api';
import { formatDate } from '../utils/format';

export const publisherKindLabel: Record<RankingPublisherKind, string> = {
  SURVEY: 'Survey rankings',
  AWARD: 'Awards',
  GREEN: 'Green school ratings',
  OTHER: 'Other',
};

/** "EducationWorld · India School Rankings 2025-26 · Day schools · Delhi" */
export function listTitle(e: ExternalRanking): string {
  return [e.publisher, `${e.rankingName} ${e.rankingYear}`, e.category, e.region].filter(Boolean).join(' · ');
}

/** Entries arrive grouped by list and in rank order; positions only compare within one list. */
export function groupByList(items: ExternalRankingListItem[]): { title: string; items: ExternalRankingListItem[] }[] {
  const groups = new Map<string, ExternalRankingListItem[]>();
  for (const item of items) {
    const key = listTitle(item.entry);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return [...groups.entries()].map(([title, list]) => ({ title, items: list }));
}

const KINDS: (RankingPublisherKind | undefined)[] = [undefined, 'SURVEY', 'AWARD', 'GREEN'];

/** Rankings published by other organisations, entry by entry, each checked against the publisher's own page. */
export function PublishedRankingsPage() {
  const [search, setSearch] = useSearchParams();
  const params: ExternalRankingParams = {
    publisher: search.get('publisher') || undefined,
    kind: (search.get('kind') || undefined) as RankingPublisherKind | undefined,
    year: search.get('year') || undefined,
    category: search.get('category') || undefined,
    size: 100,
  };
  const green = params.kind === 'GREEN';
  useDocumentTitle(green ? 'Green school rankings' : 'Published school rankings');
  const publishers = useApi(() => rankingService.publishers(), []);
  const facets = useApi(() => rankingService.externalFacets(), []);
  const entries = useApi(() => rankingService.external(params), [params.publisher, params.kind, params.year, params.category]);
  const set = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key === 'kind') next.delete('publisher');
    setSearch(next, { replace: true });
  };
  const shownPublishers = (publishers.data ?? []).filter((p) => !params.kind || p.kind === params.kind);

  return (
    <>
      <PageHeader eyebrow="Rankings" title={green ? 'Green school rankings' : 'Published school rankings'}
        subtitle="Rankings and ratings published by other organisations. Each entry here was checked by our editors against the publisher's own page, which is linked. They are shown separately from India School Finder's own score." />
      <div className="container-page space-y-6 py-8">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Type of ranking">
          {KINDS.map((k) => (
            <button key={k ?? 'all'} type="button" aria-pressed={params.kind === k}
              className={`chip ${params.kind === k ? 'bg-brand-600 text-white' : ''}`} onClick={() => set('kind', k)}>
              {k ? publisherKindLabel[k] : 'All'}
            </button>
          ))}
        </div>

        <section aria-labelledby="publishers-title">
          <h2 id="publishers-title" className="mb-3 text-lg font-semibold">Publishers</h2>
          {shownPublishers.length === 0 ? (
            <p className="text-sm text-slate-600">No publisher of this kind is recorded yet.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shownPublishers.map((p) => (
                <li key={p.code} className="card p-4 text-sm">
                  <p className="font-semibold text-ink">{p.name}</p>
                  <p className="text-xs text-slate-500">{publisherKindLabel[p.kind]} · {p.verifiedEntries} checked {p.verifiedEntries === 1 ? 'entry' : 'entries'}</p>
                  {p.description && <p className="mt-2 text-slate-600">{p.description}</p>}
                  <p className="mt-2 flex flex-wrap gap-3">
                    {p.websiteUrl && <SourceLink url={p.websiteUrl} label="Website" />}
                    {p.methodologyUrl && <SourceLink url={p.methodologyUrl} label="Methodology" />}
                    {p.verifiedEntries > 0 && (
                      <button type="button" className="link" onClick={() => set('publisher', p.code)}>Show entries</button>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="card flex flex-wrap items-end gap-3 p-4 text-sm">
          <label><span className="label">Publisher</span>
            <select className="input" value={params.publisher ?? ''} onChange={(e) => set('publisher', e.target.value || undefined)}>
              <option value="">All</option>
              {shownPublishers.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </label>
          <label><span className="label">Edition</span>
            <select className="input" value={params.year ?? ''} onChange={(e) => set('year', e.target.value || undefined)}>
              <option value="">All</option>
              {(facets.data?.years ?? []).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label><span className="label">Category</span>
            <select className="input" value={params.category ?? ''} onChange={(e) => set('category', e.target.value || undefined)}>
              <option value="">All</option>
              {(facets.data?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <Link to="/rankings/compare" className="btn-secondary ml-auto">Compare schools' rankings</Link>
        </div>

        <AsyncContent state={entries} isEmpty={(d) => d.content.length === 0}
          empty={<EmptyState title="No checked entries yet.">
            We add entries one by one after checking them on the publisher's page, so this list starts small. A school that is
            not listed here may still appear in the publisher's own list.
          </EmptyState>}>
          {(page) => (
            <div className="space-y-4">
              {groupByList(page.content).map((g) => {
                const first = g.items[0].entry;
                return (
                  <section key={g.title} className="card p-5">
                    <h2 className="font-semibold text-ink">{g.title}</h2>
                    <p className="text-xs text-slate-500">
                      {first.scope === 'NATIONAL' ? 'All India' : first.scope === 'STATE' ? 'State list' : 'City list'} · retrieved{' '}
                      {formatDate(first.retrievedDate)} · <SourceLink url={first.sourceUrl} label="Publisher's page" />
                    </p>
                    <ol className="mt-3 divide-y divide-slate-100 text-sm">
                      {g.items.map((i) => (
                        <li key={i.entry.id} className="flex flex-wrap items-baseline gap-x-3 py-2">
                          <span className="w-14 shrink-0 font-semibold text-brand-700">{i.entry.rankPosition ? `#${i.entry.rankPosition}` : '—'}</span>
                          <span className="min-w-0 flex-1">
                            {i.schoolSlug ? <Link className="link" to={`/schools/${i.schoolSlug}`}>{i.schoolName}</Link> : i.schoolName}
                            {i.city && <span className="text-slate-500"> · {i.city}</span>}
                          </span>
                          {i.entry.scoreText && <span className="text-slate-600">{i.entry.scoreText}</span>}
                        </li>
                      ))}
                    </ol>
                  </section>
                );
              })}
            </div>
          )}
        </AsyncContent>

        <aside className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
          Positions compare only within the same list, edition and region. Paid or "featured" listings are never shown as rankings.
          We record only the entries we have checked; we do not reproduce publishers' full lists or estimate positions. For our own
          evidence-based score see <Link className="link" to="/rankings">Best schools</Link> and the{' '}
          <Link className="link" to="/rankings/methodology">ranking method</Link>.
        </aside>
      </div>
    </>
  );
}
