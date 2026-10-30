import { Link } from 'react-router-dom';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { rankingService, referenceService } from '../services/publicApi';
import type { RankingMethodology, RankingStatus } from '../types/api';
import { scoreExample, type ExampleEvidence } from '../utils/rankingExample';

/** Changes to the published method. Add an entry whenever app.ranking.methodology-version changes. */
const VERSION_HISTORY = [
  {
    version: '2.0',
    changes: [
      'Infrastructure, sports and accessibility can be scored from fixed published facility checklists.',
      'Teaching quality can be scored from an officially published student–teacher ratio on a fixed scale.',
      'A definitive rank now needs the minimum share of weight backed by verified evidence, not just any evidence.',
      'Documented facts older than the age limit, or marked outdated or disputed, are not scored.',
      'Provisional results are ordered by evidence share before score.',
      'Every school has a status: ranked, provisional or not yet ranked.',
    ],
  },
  {
    version: '1.0',
    changes: [
      'Scores from administrator-verified criterion scores and at least the minimum number of approved reviews.',
      'Missing criteria re-weighted rather than scored as zero; low coverage made a result provisional.',
    ],
  },
];

const STATUS_INFO: { status: RankingStatus; title: string; tone: string; text: (m: RankingMethodology) => string }[] = [
  {
    status: 'RANKED',
    title: 'Ranked',
    tone: 'border-brand-200 bg-brand-50 text-brand-900',
    text: (m) => `At least ${m.minimumCoveragePercent}% of the criterion weight is backed by verified evidence. The school gets a position; tied scores share it (1, 2, 2, 4).`,
  },
  {
    status: 'PROVISIONAL',
    title: 'Provisional',
    tone: 'border-violet-200 bg-violet-50 text-violet-900',
    text: (m) => `The school has a score, but less than ${m.minimumCoveragePercent}% of the weight is verified. It is listed after ranked schools, without a position, ordered by evidence share and then score.`,
  },
  {
    status: 'NOT_YET_RANKED',
    title: 'Not yet ranked',
    tone: 'border-slate-200 bg-slate-50 text-slate-800',
    text: () => 'No usable, source-linked evidence exists for any criterion. The school is not scored, and nothing is estimated for it.',
  },
];

/** How each criterion can be evidenced besides an administrator-verified score. */
function alternativeFor(code: string, m: RankingMethodology): string {
  const checklist = m.checklists.find((c) => c.criterionCode === code);
  if (checklist) return `Checklist: ${checklist.items.join(', ')}`;
  if (code === 'TEACHING_QUALITY') {
    return `Published student–teacher ratio (${m.studentTeacherRatioBest}:1 or better = 100, ${m.studentTeacherRatioWorst}:1 or worse = 0)`;
  }
  if (code === 'PARENT_FEEDBACK') return `Average of at least ${m.minimumReviewsForParentFeedback} approved reviews on this site (the only source)`;
  return 'Verified score only';
}

/** Illustrative evidence for the worked example. It describes no real school. */
const EXAMPLE: ExampleEvidence[] = [
  { code: 'ACADEMIC_PERFORMANCE', score: 82, verified: true, basis: 'Verified score from published board results' },
  { code: 'TEACHING_QUALITY', score: 75, verified: false, basis: 'Published ratio 25:1, not yet verified' },
  { code: 'INFRASTRUCTURE', score: 66.67, verified: false, basis: '2 of 3 checklist items documented, not yet verified' },
  { code: 'SAFETY_WELLBEING', score: 90, verified: true, basis: 'Verified score from a safety audit report' },
  { code: 'ACCESSIBILITY_TRANSPORT', score: 50, verified: false, basis: '1 of 2 checklist items documented, not yet verified' },
];

const statusLabel: Record<RankingStatus, string> = { RANKED: 'Ranked', PROVISIONAL: 'Provisional', NOT_YET_RANKED: 'Not yet ranked' };

function WorkedExample({ m }: { m: RankingMethodology }) {
  const asDocumented = scoreExample(m.criteria, EXAMPLE, m.minimumCoveragePercent);
  const allVerified = scoreExample(m.criteria, EXAMPLE.map((e) => ({ ...e, verified: true })), m.minimumCoveragePercent);
  return (
    <div className="not-prose">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Illustrative example, not a real school</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-3 py-2">Criterion</th>
              <th scope="col" className="px-3 py-2 text-right">Weight</th>
              <th scope="col" className="px-3 py-2 text-right">Score</th>
              <th scope="col" className="px-3 py-2">Evidence</th>
              <th scope="col" className="px-3 py-2 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {asDocumented.rows.map((r) => (
              <tr key={r.code} className="border-t border-slate-100">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.weight}%</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.score ?? '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-600">{r.basis}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.contribution ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-semibold text-ink">As documented</p>
          <p className="mt-1 text-slate-700">
            Score <strong>{asDocumented.score}</strong> · evidence {asDocumented.coveragePercent}% · verified{' '}
            {asDocumented.verifiedCoveragePercent}% → <strong>{statusLabel[asDocumented.status]}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Missing criteria are not counted as zero: the points are divided by the {asDocumented.coveragePercent}% of weight
            that has evidence.
          </p>
        </div>
        <div className="rounded-lg bg-brand-50 p-3 text-sm">
          <p className="font-semibold text-ink">After an administrator verifies the documented facts</p>
          <p className="mt-1 text-slate-700">
            Score <strong>{allVerified.score}</strong> · evidence {allVerified.coveragePercent}% · verified{' '}
            {allVerified.verifiedCoveragePercent}% → <strong>{statusLabel[allVerified.status]}</strong>
          </p>
          <p className="mt-1 text-xs text-slate-500">Verification changes the status, not the score.</p>
        </div>
      </div>
    </div>
  );
}

export function MethodologyPage() {
  useDocumentTitle('Ranking methodology');
  const state = useApi(() => rankingService.methodology(), []);
  const stats = useApi(() => referenceService.stats(), []);
  return (
    <>
      <PageHeader title="Ranking methodology" subtitle="How the India School Finder score is calculated, and what it does not claim." />
      <div className="container-page py-8">
        <AsyncContent state={state}>
          {(m) => {
            const notYet = stats.data ? Math.max(0, stats.data.activeSchools - m.rankedSchools - m.provisionalSchools) : null;
            const counts: Record<RankingStatus, number | null> = {
              RANKED: m.rankedSchools, PROVISIONAL: m.provisionalSchools, NOT_YET_RANKED: notYet,
            };
            return (
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div className="card prose-page min-w-0 p-6">
                  <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{m.disclaimer}</p>

                  <h2 id="statuses">Ranked, provisional and not yet ranked</h2>
                  <div className="not-prose grid gap-3 sm:grid-cols-3">
                    {STATUS_INFO.map((s) => (
                      <div key={s.status} className={`rounded-xl border p-4 ${s.tone}`}>
                        <p className="font-display text-2xl font-extrabold tabular-nums">
                          {counts[s.status] === null ? '…' : counts[s.status]!.toLocaleString('en-IN')}
                        </p>
                        <p className="font-semibold">{s.title}</p>
                        <p className="mt-1 text-xs leading-relaxed opacity-90">{s.text(m)}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">Counts for academic year {m.academicYear}, methodology version {m.methodologyVersion}.</p>

                  <h2 id="criteria">Criteria and the evidence each one accepts</h2>
                  <div className="not-prose overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full min-w-[560px] text-sm">
                      <thead className="bg-slate-50 text-left text-slate-600">
                        <tr>
                          <th scope="col" className="px-3 py-2">Criterion</th>
                          <th scope="col" className="px-3 py-2 text-right">Weight</th>
                          <th scope="col" className="px-3 py-2">What counts</th>
                          <th scope="col" className="px-3 py-2">If no verified score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {m.criteria.map((c) => (
                          <tr key={c.code} className={`border-t border-slate-100 align-top ${c.active ? '' : 'text-slate-400'}`}>
                            <td className="px-3 py-2 font-medium">{c.name}{!c.active && ' (inactive)'}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{c.weight}%</td>
                            <td className="px-3 py-2 text-xs">{c.description}</td>
                            <td className="px-3 py-2 text-xs">{alternativeFor(c.code, m)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h2 id="formula">How a score is calculated</h2>
                  <ul>
                    <li>Each criterion is scored 0–100.</li>
                    <li>Score = Σ (weight × criterion score) ÷ Σ weight of the criteria that have evidence.</li>
                    <li>Evidence share = weight with any evidence ÷ total weight. Verified share = weight with verified evidence ÷ total weight.</li>
                    <li>A verified share of at least {m.minimumCoveragePercent}% gives a rank; less gives a provisional result.</li>
                  </ul>
                  <WorkedExample m={m} />

                  <h2 id="rules">Evidence rules</h2>
                  <ul>{m.rules.map((r) => <li key={r}>{r}</li>)}</ul>

                  <h2 id="limits">What the score does not measure</h2>
                  <ul>
                    <li>It is not an official ranking by any government, board or inspectorate.</li>
                    <li>Checklist scores show what a school documents, not how good its facilities are.</li>
                    <li>Popularity, search interest and the number of online reviews are never treated as academic quality.</li>
                    <li>Fees, photos, classes and admission status appear on ranking cards for context and never change a score.</li>
                    <li>A school with little published information can be excellent; "not yet ranked" says nothing about quality.</li>
                  </ul>

                  <h2 id="corrections">Corrections and new evidence</h2>
                  <p>
                    Schools and parents can send an official document (board results, inspection or safety audit report, fee
                    circular, facility details on the school's own site) through the <Link to="/contact" className="link">contact page</Link>.
                    An administrator checks it against the source before it is marked verified, and every change is recorded
                    in the school's verification history. Rankings are recalculated after each verification and every night.
                  </p>

                  <h2 id="versions">Version history</h2>
                  <ul>
                    {VERSION_HISTORY.map((v) => (
                      <li key={v.version}>
                        <strong>Version {v.version}{v.version === m.methodologyVersion && ' (current)'}</strong>
                        <ul>{v.changes.map((c) => <li key={c}>{c}</li>)}</ul>
                      </li>
                    ))}
                  </ul>
                </div>

                <aside className="space-y-4">
                  <nav className="card p-4 text-sm" aria-label="On this page">
                    <h2 className="mb-2 font-semibold">On this page</h2>
                    <ul className="space-y-1">
                      {[['statuses', 'Statuses'], ['criteria', 'Criteria'], ['formula', 'Calculation and example'], ['rules', 'Evidence rules'],
                        ['limits', 'What it does not measure'], ['corrections', 'Corrections'], ['versions', 'Version history']].map(([id, label]) => (
                        <li key={id}><a href={`#${id}`} className="link">{label}</a></li>
                      ))}
                    </ul>
                  </nav>
                  <div className="card p-4">
                    <h2 className="mb-2 font-semibold">Weights</h2>
                    <div className="h-64 overflow-hidden">{/* the hidden tooltip is parked past the right edge; keep it from widening the page */}
                      <ResponsiveContainer>
                        <BarChart data={m.criteria.filter((c) => c.active)} layout="vertical" margin={{ left: 8 }}>
                          <XAxis type="number" domain={[0, 30]} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip formatter={(v: number) => `${v}%`} />
                          <Bar dataKey="weight" fill="#3b66f5" radius={[0, 6, 6, 0]} isAnimationActive={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <Link to="/rankings" className="btn-primary w-full rounded-full">See the rankings</Link>
                </aside>
              </div>
            );
          }}
        </AsyncContent>
      </div>
    </>
  );
}
