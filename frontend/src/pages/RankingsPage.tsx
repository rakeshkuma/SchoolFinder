import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ProvisionalBadge } from '../components/common/Badges';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent } from '../components/common/States';
import { CompareButton } from '../components/school/CompareBar';
import { RankingCard } from '../components/school/RankingCard';
import { useApi } from '../hooks/useApi';
import { MAX_COMPARE, useCompare } from '../hooks/useCompare';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { locationService, rankingService, referenceService, type RankingParams } from '../services/publicApi';
import type { SchoolType } from '../types/api';
import { schoolTypeLabel } from '../utils/format';

const COLORS = ['#2448e8', '#0ea5e9', '#14b8a6', '#22c55e', '#ffa520', '#f97316', '#8b5cf6'];

const TOP_N = [10, 20, 100] as const;
const VIEW_KEY = 'dsf.rankings.view';

export function RankingsPage() {
  useDocumentTitle('School rankings');
  const [params, setParams] = useState<RankingParams>({ includeProvisional: true, page: 0, size: 20 });
  const boards = useApi(() => referenceService.boards(), []);
  const states = useApi(() => locationService.states(), []);
  const districts = useApi(() => locationService.districts(params.state as string), [params.state], !!params.state);
  const cities = useApi(() => locationService.cities(params.state as string), [params.state], !!params.state);
  const state = useApi(() => rankingService.list(params), [JSON.stringify(params)]);
  const methodology = useApi(() => rankingService.methodology(), []);
  const set = (patch: Partial<RankingParams>) => setParams((p) => ({ ...p, ...patch, page: patch.page ?? 0 }));
  const compare = useCompare();
  const navigate = useNavigate();
  const [view, setView] = useState<'cards' | 'table'>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'table' ? 'table' : 'cards';
    } catch {
      return 'cards';
    }
  });
  const chooseView = (v: 'cards' | 'table') => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* storage unavailable */
    }
  };

  const stateName = (states.data ?? []).find((s) => s.code === params.state)?.name;
  const districtName = (districts.data ?? []).find((d) => d.slug === params.district)?.name;
  const scopeLabel = [params.city ?? districtName, stateName].filter(Boolean).join(', ') || 'India';
  const filtersLabel = [
    params.board && (params.board === 'CISCE' ? 'ICSE/ISC' : params.board),
    params.schoolType && schoolTypeLabel[params.schoolType],
    params.locality,
  ].filter(Boolean).join(' · ');
  const anyEvidence = (methodology.data?.rankedSchools ?? 0) + (methodology.data?.provisionalSchools ?? 0) > 0;

  return (
    <>
      <PageHeader
        title="School rankings"
        subtitle={
          <>
            Scores are calculated by India School Finder from source-linked evidence; only verified evidence earns a rank. This
            is <strong>not</strong> an official government ranking. <Link to="/rankings/methodology" className="link">How scores work →</Link>
          </>
        }
      />
      <div className="container-page grid gap-6 py-8 lg:grid-cols-[1fr_300px]">
        <section>
          <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
            <label className="text-sm">
              <span className="label">State / UT</span>
              <select className="input" value={params.state ?? ''}
                onChange={(e) => set({ state: e.target.value || undefined, district: undefined, city: undefined, locality: undefined })}>
                <option value="">India (all states and UTs)</option>
                {(states.data ?? []).filter((s) => s.schoolCount > 0).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            {params.state && (
              <label className="text-sm">
                <span className="label">District</span>
                <select className="input" value={params.district ?? ''} onChange={(e) => set({ district: e.target.value || undefined, city: undefined })}>
                  <option value="">All districts</option>
                  {(districts.data ?? []).map((d) => <option key={d.id} value={d.slug}>{d.name}</option>)}
                </select>
              </label>
            )}
            {params.state && (
              <label className="text-sm">
                <span className="label">City / town</span>
                <select className="input" value={params.city ?? ''} onChange={(e) => set({ city: e.target.value || undefined })}>
                  <option value="">All cities</option>
                  {(cities.data ?? []).map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm">
              <span className="label">Board</span>
              <select className="input" value={params.board ?? ''} onChange={(e) => set({ board: e.target.value || undefined })}>
                <option value="">All</option>
                {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE/ISC' : b.code}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="label">School type</span>
              <select className="input" value={params.schoolType ?? ''} onChange={(e) => set({ schoolType: (e.target.value || undefined) as SchoolType | undefined })}>
                <option value="">All</option>
                {(Object.keys(schoolTypeLabel) as SchoolType[]).map((t) => <option key={t} value={t}>{schoolTypeLabel[t]}</option>)}
              </select>
            </label>
            <label className="text-sm">
              <span className="label">Locality</span>
              <input className="input" placeholder="Exact locality" value={params.locality ?? ''} onChange={(e) => set({ locality: e.target.value || undefined })} />
            </label>
            <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
              <input type="checkbox" checked={params.includeProvisional ?? true} onChange={(e) => set({ includeProvisional: e.target.checked })} />
              Show provisional results
            </label>
            <div className="ml-auto grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="How many schools">
              {TOP_N.map((n) => (
                <button key={n} type="button" aria-pressed={params.size === n} onClick={() => set({ size: n })}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${params.size === n ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
                  Top {n}
                </button>
              ))}
            </div>
          </div>
          <p className="mb-3 text-sm text-slate-600" aria-live="polite">
            Top {params.size} in <strong className="text-ink">{scopeLabel}</strong>{filtersLabel && <> · {filtersLabel}</>}
            {params.includeProvisional ? ' · including provisional results' : ' · fully ranked only'}
            {state.data && <> · {state.data.totalElements} school{state.data.totalElements === 1 ? '' : 's'} with a score</>}
            {methodology.data && <> · academic year {methodology.data.academicYear}</>}
          </p>

          <AsyncContent
            state={state}
            isEmpty={(d) => d.content.length === 0}
            empty={
              <div className="card overflow-hidden">
                <div className="bg-gradient-to-br from-brand-50 to-white p-8">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
                    <Icon name="chart" className="h-6 w-6" />
                  </span>
                  {!anyEvidence ? (
                    <>
                      <h2 className="mt-4 font-display text-xl font-bold text-ink">No school has enough evidence to be scored yet</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                        None of the schools listed in India School Finder has source-linked evidence for any ranking criterion
                        yet, so every school is shown as not yet ranked. We would rather show no ranking than an invented one.
                        A school is scored from verified evidence (board results, inspection reports, safety certificates) or
                        from facts a cited source documents, such as its facilities. Until then, compare schools on facts that
                        are already published.
                      </p>
                    </>
                  ) : (
                    <>
                      <h2 className="mt-4 font-display text-xl font-bold text-ink">No scored schools in {scopeLabel}{filtersLabel && ` (${filtersLabel})`}</h2>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                        {params.includeProvisional
                          ? 'No school matching this selection has evidence yet; these schools are not yet ranked. Try a wider area or fewer filters.'
                          : 'No school matching this selection is fully ranked yet. Provisional results, based on incomplete evidence, may be available.'}
                      </p>
                    </>
                  )}
                  <div className="mt-6 flex flex-wrap gap-3">
                    {anyEvidence && !params.includeProvisional && (
                      <button type="button" className="btn-primary rounded-full" onClick={() => set({ includeProvisional: true })}>Show provisional results</button>
                    )}
                    {anyEvidence && (params.state || params.board || params.schoolType || params.locality) && (
                      <button type="button" className="btn-secondary rounded-full"
                        onClick={() => setParams({ includeProvisional: params.includeProvisional, page: 0, size: params.size })}>
                        All of India, no filters
                      </button>
                    )}
                    <Link to="/compare" className="btn-primary rounded-full"><Icon name="scale" className="h-4 w-4" /> Compare schools</Link>
                    <Link to="/fees" className="btn-secondary rounded-full"><Icon name="rupee" className="h-4 w-4" /> Compare fees</Link>
                    <Link to="/rankings/methodology" className="btn-ghost rounded-full">How scoring works</Link>
                  </div>
                </div>
                <ol className="grid gap-px bg-slate-100 sm:grid-cols-3">
                  {[
                    ['1', 'Evidence collected', 'Every criterion score cites its source; missing evidence is never estimated.'],
                    ['2', 'Verified by an admin', 'Only verified evidence counts toward a definitive rank.'],
                    ['3', 'Ranked or provisional', 'Below the minimum verified share a school is provisional and gets no rank.'],
                  ].map(([n, t, d]) => (
                    <li key={n} className="bg-white p-5">
                      <span className="font-display text-sm font-bold text-brand-600">Step {n}</span>
                      <p className="mt-1 font-semibold text-ink">{t}</p>
                      <p className="mt-1 text-sm text-slate-600">{d}</p>
                    </li>
                  ))}
                </ol>
              </div>
            }
          >
            {(page) => (
              <>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="Layout">
                    {(['cards', 'table'] as const).map((v) => (
                      <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${view === v ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
                        {v}
                      </button>
                    ))}
                  </div>
                  {page.content.length >= 2 && (
                    <button type="button" className="btn-secondary ml-auto rounded-full px-3 py-1.5 text-xs"
                      onClick={() => {
                        compare.replace(page.content.slice(0, MAX_COMPARE).map((r) => ({ id: r.schoolId, name: r.schoolName, slug: r.slug })));
                        navigate('/compare');
                      }}>
                      <Icon name="scale" className="h-3.5 w-3.5" /> Compare top {Math.min(MAX_COMPARE, page.content.length)}
                    </button>
                  )}
                </div>
                {view === 'cards' ? (
                  <div className="grid gap-3">
                    {page.content.map((r) => <RankingCard key={r.schoolId} r={r} showIndiaRank={!!params.state} />)}
                  </div>
                ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead className="bg-slate-50 text-left text-slate-600">
                      <tr>
                        <th scope="col" className="px-4 py-3">Rank</th>
                        <th scope="col" className="px-4 py-3">School</th>
                        <th scope="col" className="px-4 py-3">Board</th>
                        <th scope="col" className="px-4 py-3 text-right">Score</th>
                        <th scope="col" className="px-4 py-3 text-right">
                          <abbr title="Share of criterion weight backed by evidence, and by verified evidence" className="no-underline">
                            Evidence (verified)
                          </abbr>
                        </th>
                        <th scope="col" className="px-4 py-3"><span className="sr-only">Compare</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {page.content.map((r) => (
                        <tr key={r.schoolId} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-semibold">
                            {r.scopePosition ? `#${r.scopePosition}` : <ProvisionalBadge />}
                            {r.scopePosition && params.state && r.rankPosition && (
                              <div className="text-[11px] font-normal text-slate-500">#{r.rankPosition} in India</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link to={`/schools/${r.slug}?tab=ranking`} className="font-medium hover:text-brand-700">{r.schoolName}</Link>
                            <div className="text-xs text-slate-500">
                              {[r.locality, r.city, r.districtName, r.stateName].filter((v, i, a) => v && a.indexOf(v) === i).join(', ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">{r.boardCode ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.totalScore.toFixed(1)}</td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            {r.coveragePercent}%
                            <div className="text-[11px] text-slate-500">{r.verifiedCoveragePercent ?? 0}% verified</div>
                          </td>
                          <td className="px-4 py-3 text-right"><CompareButton id={r.schoolId} name={r.schoolName} slug={r.slug} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                )}
                {page.content.some((r) => r.provisional) && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    <strong>Provisional</strong> results have too little verified evidence for a rank. Many are scored from facts
                    a cited source documents (for example, which facilities a school lists), so they reflect what a school
                    documents, not its quality. They are ordered by evidence share first, then score. A * marks a criterion
                    score that is documented but not yet verified. Fees, classes and photos are shown for context and are
                    never part of the score.
                  </p>
                )}
                {page.totalElements < (params.size ?? 20) && (
                  <p className="mt-3 text-xs text-slate-500">
                    Only {page.totalElements} school{page.totalElements === 1 ? ' has' : 's have'} a score in this selection; the list is not padded.
                  </p>
                )}
                {page.content.some((r) => r.scopePosition) && (
                  <div className="card mt-6 p-4">
                    <h2 className="mb-2 font-semibold">Scores on this page</h2>
                    <div style={{ height: Math.max(200, page.content.length * 28) }}>
                      <ResponsiveContainer>
                        <BarChart data={page.content} layout="vertical" margin={{ left: 8, right: 24 }}>
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis type="category" dataKey="schoolName" width={200} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="totalScore" name="Score" isAnimationActive={false} radius={[0, 6, 6, 0]}>
                            {page.content.map((r) => <Cell key={r.schoolId} fill={r.provisional ? '#c4b5fd' : '#1d5dee'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </AsyncContent>
        </section>
        <aside className="space-y-4">
          <AsyncContent state={methodology}>
            {(m) => (
              <div className="card p-4">
                <h2 className="font-semibold">Criteria weights</h2>
                {/* The list below states every weight as text, so the chart is hidden from screen readers. */}
                <div className="h-56" aria-hidden>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={m.criteria.filter((c) => c.active)} dataKey="weight" nameKey="name" innerRadius={50} outerRadius={82}
                        paddingAngle={2} isAnimationActive={false} rootTabIndex={-1}>
                        {m.criteria.map((c, i) => <Cell key={c.code} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${v}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="space-y-1 text-xs">
                  {m.criteria.filter((c) => c.active).map((c, i) => (
                    <li key={c.code} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="flex-1">{c.name}</span>
                      <span className="tabular-nums text-slate-600">{c.weight}%</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-slate-600">
                  {m.rankedSchools} ranked · {m.provisionalSchools} provisional · a rank needs {m.minimumCoveragePercent}% verified evidence
                </p>
              </div>
            )}
          </AsyncContent>
        </aside>
      </div>
    </>
  );
}

