import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState, ErrorState, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import { useLocalList } from '../hooks/usePersonal';
import { bookmarks, localAttempts, toggleBookmark } from '../hooks/usePracticeProgress';
import { memberPracticeService } from '../services/accountApi';
import { practiceService } from '../services/publicApi';
import type { PracticeBankQuestion } from '../types/api';
import { formatDate } from '../utils/format';
import { practiceStats, type AttemptRecord, type Tally } from '../utils/practiceStats';

const BRAND = '#1d5dee';

const duration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  return m === 0 ? `${seconds} s` : `${m} min ${String(seconds % 60).padStart(2, '0')} s`;
};

/**
 * A student's progress across every practice test: totals, trend, results by subject and chapter, weak topics, a
 * suggested next practice, bookmarked questions and the full history. Members see their account's attempts; guests
 * see the attempts kept in this browser.
 */
export function PracticeProgressPage() {
  useDocumentTitle('Your practice progress');
  const { status } = useMember();
  const signedIn = status === 'signedIn';
  const local = useLocalList(localAttempts);
  const saved = useLocalList(bookmarks);
  const bank = useApi(() => practiceService.bank(), []);
  const server = useApi(() => memberPracticeService.history(), [status], signedIn);

  const records: AttemptRecord[] | null = useMemo(() => {
    if (signedIn) {
      return server.data ? server.data.map((h) => ({
        key: String(h.attempt.id), title: h.attempt.title, createdAt: h.attempt.createdAt, durationSeconds: h.attempt.durationSeconds,
        total: h.attempt.total, attempted: h.attempt.attempted, correct: h.attempt.correct, marks: h.attempt.marks,
        maxMarks: h.attempt.maxMarks, sections: h.attempt.sections, topics: h.topics, outcomes: h.questions,
        href: `/exams/practice/attempts/${h.attempt.id}`,
      })) : null;
    }
    return local.map((a) => ({
      key: a.clientId, title: a.title, createdAt: a.createdAt, durationSeconds: a.durationSeconds, total: a.total,
      attempted: a.attempted, correct: a.correct, marks: a.marks ?? null, maxMarks: a.maxMarks ?? null, sections: a.sections,
      topics: a.topics ?? [], outcomes: a.results ?? null, href: `/exams/practice/attempts/local-${a.clientId}`,
    }));
  }, [signedIn, server.data, local]);

  const meta = useMemo(() => new Map((bank.data?.questions ?? []).map((q) => [q.id, q])), [bank.data]);
  const stats = useMemo(() => (records ? practiceStats(records, (id) => {
    const q = meta.get(id);
    return q ? { subject: q.section, chapter: q.chapter } : undefined;
  }) : null), [records, meta]);
  const liveBookmarks = saved.filter((id) => !bank.data || meta.has(id));

  return (
    <>
      <PageHeader eyebrow="Practice centre" title="Your progress"
        subtitle={signedIn
          ? 'Every practice test saved to your account, on every device.'
          : 'Practice results kept in this browser. Sign in to keep them on every device — results from this browser are added to your account when you sign in.'}>
        <div className="flex flex-wrap gap-2">
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← Practice centre</Link>
          {!signedIn && <Link to="/signin?next=%2Fexams%2Fpractice%2Fprogress" className="chip bg-accent-400 px-3 py-1.5 text-sm font-semibold text-ink">Sign in</Link>}
        </div>
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        {signedIn && server.error ? <ErrorState error={server.error} onRetry={server.reload} />
          : !stats ? <Spinner label="Loading your progress…" />
            : stats.tests === 0 ? (
              <EmptyState title="No practice tests yet">
                Your scores, strong and weak areas and history appear here after your first test.{' '}
                <Link to="/exams/practice/session?mode=QUICK" className="link">Start a quick practice →</Link>
              </EmptyState>
            ) : (
              <>
                <Totals stats={stats} />
                <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
                  <TrendCard stats={stats} />
                  <NextCard stats={stats} />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <TallyCard title="By subject" rows={stats.subjects.map((s) => ({ ...s, label: s.subject, params: { mode: 'TOPIC', section: s.subject, count: '10' } }))}
                    empty="No subject results yet." />
                  <TallyCard title="By chapter" rows={stats.chapters.map((c) => ({ ...c, label: c.chapter, hint: c.subject, params: { mode: 'TOPIC', section: c.subject, chapter: c.chapter, count: '10' } }))}
                    empty="Chapter results appear for practice from sets organised by chapter, such as Class X Mathematics." />
                </div>
                <WeakTopics stats={stats} />
                <History records={records ?? []} />
              </>
            )}
        <Bookmarks ids={liveBookmarks} meta={meta} signedIn={signedIn} />
        <p className="text-xs text-slate-500">
          Practice scores use our own practice marking and original questions. They show how practice is going, not how an
          exam will go, and do not predict any result or admission.
        </p>
      </div>
    </>
  );
}

type Stats = ReturnType<typeof practiceStats>;

function Totals({ stats }: { stats: Stats }) {
  const tiles: [string, string, string?][] = [
    ['Tests taken', String(stats.tests)],
    ['Questions attempted', `${stats.attempted}`, `of ${stats.questions} shown`],
    ['Correct', String(stats.correct)],
    ['Incorrect', String(stats.incorrect)],
    ['Accuracy', stats.accuracy === null ? '–' : `${stats.accuracy}%`, 'correct ÷ attempted'],
    ['Average time per test', stats.averageSeconds === null ? '–' : duration(stats.averageSeconds)],
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value, note]) => (
        <div key={label} className="card p-4">
          <dt className="text-xs text-slate-500">{label}</dt>
          <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{value}</dd>
          {note && <dd className="text-xs text-slate-500">{note}</dd>}
        </div>
      ))}
    </dl>
  );
}

function TrendCard({ stats }: { stats: Stats }) {
  const data = stats.trend.map((t, i) => ({ ...t, n: i + 1, label: formatDate(t.date.slice(0, 10)) }));
  const change = stats.improvement ? stats.improvement.later - stats.improvement.earlier : null;
  return (
    <section className="card p-5" aria-labelledby="trend-heading">
      <h2 id="trend-heading" className="font-display text-lg font-bold text-ink">Score in your last {data.length} test{data.length === 1 ? '' : 's'}</h2>
      <p className="mt-1 text-sm text-slate-600">
        {change === null ? 'Take a few more tests to see a trend.'
          : change > 0 ? `Up ${change} points: your later tests averaged ${stats.improvement!.later}%, the earlier ones ${stats.improvement!.earlier}%.`
            : change < 0 ? `Down ${-change} points: later tests averaged ${stats.improvement!.later}%, earlier ones ${stats.improvement!.earlier}%. Tests differ in difficulty, so compare like with like.`
              : `Steady at about ${stats.improvement!.later}%.`}
      </p>
      {/* The history table below lists every value, so the chart is decorative for screen readers. */}
      <div className="mt-3 h-56" aria-hidden>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="n" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip formatter={(v: number) => [`${v}%`, 'Score']}
              labelFormatter={(_, p) => (p?.[0] ? `${p[0].payload.title} · ${p[0].payload.label}` : '')} />
            <Line type="monotone" dataKey="score" stroke={BRAND} strokeWidth={2} dot={{ r: 4, fill: BRAND, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-xs text-slate-500">Score = correct ÷ questions in the test. Oldest on the left.</p>
    </section>
  );
}

function NextCard({ stats }: { stats: Stats }) {
  return (
    <section className="card flex flex-col p-5" aria-labelledby="next-heading">
      <p className="eyebrow">Suggested next</p>
      <h2 id="next-heading" className="mt-1 font-display text-lg font-bold text-ink">{stats.suggestion.label}</h2>
      <p className="mt-1 flex-1 text-sm text-slate-600">{stats.suggestion.reason}</p>
      <Link to={`/exams/practice/session?${new URLSearchParams(stats.suggestion.params)}`} className="btn-primary mt-4 self-start">
        Start <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
      <Link to="/exams/practice/session?mode=REVISION" className="link mt-3 text-sm">Or revise the questions you got wrong →</Link>
    </section>
  );
}

function TallyCard({ title, rows, empty }: {
  title: string; empty: string;
  rows: (Tally & { label: string; hint?: string; params: Record<string, string> })[];
}) {
  return (
    <section className="card p-5" aria-label={title}>
      <h2 className="font-display text-lg font-bold text-ink">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">Weakest first · accuracy = correct ÷ attempted</p>
      {rows.length === 0 ? <p className="mt-3 text-sm text-slate-600">{empty}</p> : (
        <ul className="mt-3 space-y-3 text-sm">
          {rows.slice(0, 10).map((r) => (
            <li key={`${r.hint ?? ''}${r.label}`}>
              <span className="flex items-baseline justify-between gap-3">
                <Link to={`/exams/practice/session?${new URLSearchParams(r.params)}`} className="min-w-0 truncate font-medium text-ink hover:text-brand-700">
                  {r.label}{r.hint && <span className="font-normal text-slate-500"> · {r.hint}</span>}
                </Link>
                <span className="shrink-0 tabular-nums text-slate-600">
                  {r.accuracy === null ? 'not attempted' : `${r.accuracy}%`} <span className="text-slate-500">({r.correct}/{r.attempted})</span>
                </span>
              </span>
              <span className="mt-1 block h-2 rounded-full bg-slate-100" aria-hidden>
                <span className={`block h-2 rounded-full ${(r.accuracy ?? 0) >= 75 ? 'bg-emerald-500' : (r.accuracy ?? 0) >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
                  style={{ width: `${r.accuracy ?? 0}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WeakTopics({ stats }: { stats: Stats }) {
  return (
    <section className="card p-5" aria-labelledby="weak-heading">
      <h2 id="weak-heading" className="font-display text-lg font-bold text-ink">Topics to work on</h2>
      {stats.weakTopics.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">No topic is below 60% accuracy with at least three questions answered. Keep practising to see a fuller picture.</p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {stats.weakTopics.slice(0, 9).map((t) => (
            <li key={t.subject + t.topic}>
              <Link to={`/exams/practice/session?${new URLSearchParams({ mode: 'TOPIC', section: t.subject, topic: t.topic, count: '10' })}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm hover:border-amber-300">
                <span className="min-w-0"><span className="block truncate font-medium text-amber-950">{t.topic}</span>
                  <span className="text-xs text-amber-900">{t.subject} · {t.accuracy}% of {t.attempted}</span></span>
                <span className="shrink-0 text-xs font-semibold text-amber-950">Practise →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function History({ records }: { records: AttemptRecord[] }) {
  const rows = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <section aria-labelledby="history-heading">
      <h2 id="history-heading" className="font-display text-xl font-bold text-ink">Test history ({rows.length})</h2>
      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th scope="col" className="px-4 py-3">Date</th>
              <th scope="col" className="px-4 py-3">Test</th>
              <th scope="col" className="px-4 py-3 text-right">Score</th>
              <th scope="col" className="px-4 py-3 text-right">Accuracy</th>
              <th scope="col" className="px-4 py-3 text-right">Marks</th>
              <th scope="col" className="px-4 py-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-slate-100">
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(r.createdAt.slice(0, 10))}</td>
                <td className="px-4 py-3"><Link to={r.href} className="font-medium text-ink hover:text-brand-700">{r.title}</Link></td>
                <td className="px-4 py-3 text-right tabular-nums">{r.correct}/{r.total}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.attempted ? `${Math.round((r.correct / r.attempted) * 100)}%` : '–'}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.marks !== null && r.maxMarks !== null ? `${r.marks}/${r.maxMarks}` : '–'}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">{r.durationSeconds ? duration(r.durationSeconds) : '–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Bookmarks({ ids, meta, signedIn }: { ids: string[]; meta: Map<string, PracticeBankQuestion>; signedIn: boolean }) {
  return (
    <section aria-labelledby="bookmarks-heading" className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="bookmarks-heading" className="font-display text-lg font-bold text-ink">Bookmarked questions ({ids.length})</h2>
        {ids.length > 0 && (
          <Link to={`/exams/practice/session?${new URLSearchParams({ mode: 'RETRY', ids: ids.slice(0, 100).join(',') })}`} className="btn-primary">
            <Icon name="bookmark" className="h-4 w-4" /> Practise {ids.length > 100 ? 'the latest 100' : 'them'}
          </Link>
        )}
      </div>
      {ids.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">
          Use <strong>Bookmark</strong> on any question during a test or in your results to save it here.
          {!signedIn && ' Bookmarks are kept in this browser until you sign in.'}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100 text-sm">
          {ids.map((id) => {
            const q = meta.get(id);
            return (
              <li key={id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate text-slate-700">
                  {q ? <>{q.section}{q.chapter ? ` · ${q.chapter}` : ''}{q.topic ? ` · ${q.topic}` : ''} <span className="text-slate-500">· {q.level}</span></> : id}
                </span>
                <span className="flex shrink-0 gap-2">
                  <Link to={`/exams/practice/session?${new URLSearchParams({ mode: 'RETRY', ids: id })}`} className="link text-xs">Practise</Link>
                  <button type="button" className="text-xs text-slate-500 underline hover:text-ink" onClick={() => void toggleBookmark(id, signedIn)}>Remove</button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
