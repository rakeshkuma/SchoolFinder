import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Icon } from '../common/Icon';
import { useApi } from '../../hooks/useApi';
import { useMember } from '../../hooks/useMember';
import { memberPracticeService, type Achievement, type ProgressPeriod, type ProgressReport } from '../../services/accountApi';
import { participantService, useGuestToken } from '../../services/participantApi';
import { formatDate } from '../../utils/format';

const BRAND = '#1d5dee';

/** The student's progress report from the server: a member's, or a joined guest's; guests who have not joined have none. */
export function useProgressReport() {
  const { status } = useMember();
  const token = useGuestToken();
  const signedIn = status === 'signedIn';
  return useApi<ProgressReport>(() => (signedIn ? memberPracticeService.progress() : participantService.progress()),
    [signedIn, token], signedIn || !!token);
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The last `count` days, oldest first, ending today. */
export function lastDays(count: number, today = new Date()): string[] {
  return Array.from({ length: count }, (_, i) => isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i))));
}

/** "Mon DD" for a week, "Mon" for a month. */
export function periodLabel(start: string, monthly: boolean): string {
  const d = new Date(`${start}T00:00:00`);
  return d.toLocaleDateString('en-IN', monthly ? { month: 'short' } : { day: 'numeric', month: 'short' });
}

/** Streak, rank, points and badges at a glance, with the last twelve weeks of practice. */
export function ProgressSnapshot({ report }: { report: ProgressReport }) {
  const earned = report.achievements.filter((a) => a.earnedAt).length;
  const active = new Set(report.activeDays);
  const days = lastDays(84);
  const tiles: { label: string; value: string; note: string; to?: string }[] = [
    { label: 'Learning streak', value: `${report.currentStreak} ${report.currentStreak === 1 ? 'day' : 'days'}`, note: `Longest: ${report.longestStreak}` },
    { label: 'Leaderboard position', value: report.rank === null ? '–' : `#${report.rank}`,
      note: report.rank === null ? 'Earn points to be ranked' : `of ${report.participants} ranked`, to: '/exams/leaderboard' },
    { label: 'Points', value: String(report.points), note: 'Separate from test marks' },
    { label: 'Badges', value: `${earned} of ${report.achievements.length}`, note: 'See all', to: '/exams/achievements' },
  ];
  return (
    <section className="card p-5" aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className="font-display text-lg font-bold text-ink">Your learning at a glance</h2>
      <div className="mt-3 grid gap-6 lg:grid-cols-[1fr_auto]">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-xl bg-slate-50 p-3">
              <dt className="text-xs text-slate-500">{t.label}</dt>
              <dd className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">{t.value}</dd>
              <dd className="text-xs text-slate-500">{t.to ? <Link to={t.to} className="link">{t.note}</Link> : t.note}</dd>
            </div>
          ))}
        </dl>
        <div>
          <p className="text-xs text-slate-500" id="activity-label">Practised on {report.activeDays.length} of the last 84 days</p>
          {/* The sentence above carries the count, so the grid itself is decorative for screen readers. */}
          <div className="mt-2 grid w-fit grid-flow-col grid-rows-7 gap-[3px]" aria-hidden>
            {days.map((d) => <span key={d} title={formatDate(d)} className={`h-[11px] w-[11px] rounded-[3px] ${active.has(d) ? 'bg-emerald-500' : 'bg-slate-100'}`} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

/** Tests week by week or month by month, with the full numbers in a table for screen readers. */
export function PeriodProgress({ report }: { report: ProgressReport }) {
  const [monthly, setMonthly] = useState(false);
  const rows: ProgressPeriod[] = monthly ? report.months : report.weeks;
  const data = rows.map((p) => ({ ...p, label: periodLabel(p.start, monthly) }));
  const unit = monthly ? 'month' : 'week';
  return (
    <section className="card p-5" aria-labelledby="period-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="period-heading" className="font-display text-lg font-bold text-ink">Tests per {unit}</h2>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm" role="group" aria-label="Group by">
          {([[false, 'Weekly'], [true, 'Monthly']] as const).map(([value, label]) => (
            <button key={label} type="button" aria-pressed={monthly === value} onClick={() => setMonthly(value)}
              className={`rounded-md px-3 py-1 font-medium ${monthly === value ? 'bg-white text-ink shadow-sm' : 'text-slate-600'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-3 h-48" aria-hidden>
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} content={({ active, payload }) => {
              const p = payload?.[0]?.payload as (ProgressPeriod & { label: string }) | undefined;
              if (!active || !p) return null;
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
                  <p className="font-semibold text-ink">{monthly ? p.label : `Week of ${p.label}`}</p>
                  <p className="text-slate-600">{p.tests} {p.tests === 1 ? 'test' : 'tests'} · {p.accuracy === null ? 'no answers' : `${p.accuracy}% accuracy`} · {p.points} points</p>
                </div>
              );
            }} />
            <Bar dataKey="tests" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>Tests, accuracy and points per {unit}</caption>
        <thead><tr><th scope="col">{monthly ? 'Month' : 'Week of'}</th><th scope="col">Tests</th><th scope="col">Accuracy</th><th scope="col">Points</th></tr></thead>
        <tbody>{data.map((p) => <tr key={p.start}><td>{p.label}</td><td>{p.tests}</td><td>{p.accuracy === null ? 'none' : `${p.accuracy}%`}</td><td>{p.points}</td></tr>)}</tbody>
      </table>
    </section>
  );
}

export function ExamProgress({ report }: { report: ProgressReport }) {
  return (
    <section className="card p-5" aria-labelledby="exam-progress-heading">
      <h2 id="exam-progress-heading" className="font-display text-lg font-bold text-ink">By exam</h2>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {report.exams.map((e) => (
          <li key={e.examSlug} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
            <Link to={`/exams/${e.examSlug}`} className="font-medium text-ink hover:text-brand-700">{e.examName}</Link>
            <span className="tabular-nums text-slate-600">
              {e.tests} {e.tests === 1 ? 'test' : 'tests'} · {e.accuracy === null ? '–' : `${e.accuracy}%`} accuracy · best {e.bestScore}%
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Each counted daily quiz by date, newest first, and the run of consecutive days. */
export function DailyHistory({ report }: { report: ProgressReport }) {
  return (
    <section className="card p-5" aria-labelledby="daily-history-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="daily-history-heading" className="font-display text-lg font-bold text-ink">Daily quiz history</h2>
        <p className="text-sm text-slate-600">Daily streak: <strong className="text-ink">{report.dailyStreak} {report.dailyStreak === 1 ? 'day' : 'days'}</strong></p>
      </div>
      <ul className="mt-3 divide-y divide-slate-100 text-sm">
        {report.daily.map((d) => (
          <li key={d.date} className="flex items-center justify-between gap-3 py-2">
            <span className="text-slate-700">{formatDate(d.date)}</span>
            <span className="tabular-nums text-slate-600">{d.correct}/{d.total} correct · +{d.points} points</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const GROUP_ICONS: Record<string, 'star' | 'target' | 'bolt' | 'graduation' | 'trophy'> = {
  'Getting started': 'star', Practice: 'target', Streaks: 'bolt', Exams: 'graduation', Rankings: 'trophy',
};

/** One badge: coloured with its date once earned, otherwise grey with the progress towards it. */
export function AchievementCard({ a }: { a: Achievement }) {
  const earned = a.earnedAt !== null;
  const pct = a.target > 0 ? Math.round((a.current / a.target) * 100) : 0;
  return (
    <div className={`flex gap-3 rounded-xl border p-3 ${earned ? 'border-accent-200 bg-accent-50' : 'border-slate-200 bg-white'}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${earned ? 'bg-accent-400 text-ink' : 'bg-slate-100 text-slate-500'}`}>
        <Icon name={GROUP_ICONS[a.group] ?? 'star'} className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink">{a.title}</p>
        <p className="text-slate-600">{a.description}</p>
        {earned ? <p className="mt-1 text-xs font-medium text-accent-800">Earned {formatDate(a.earnedAt!.slice(0, 10))}</p>
          : a.target > 1 && (
            <div className="mt-1.5">
              <span className="block h-1.5 rounded-full bg-slate-100" aria-hidden><span className="block h-1.5 rounded-full bg-brand-500" style={{ width: `${pct}%` }} /></span>
              <p className="mt-1 text-xs tabular-nums text-slate-500">{a.current} of {a.target}</p>
            </div>
          )}
      </div>
    </div>
  );
}

/** Earned badges first, then the ones closest to being earned. */
export function badgeOrder(list: Achievement[]): Achievement[] {
  const closeness = (a: Achievement) => (a.earnedAt ? 2 : a.target > 0 ? a.current / a.target : 0);
  return [...list].sort((a, b) => closeness(b) - closeness(a));
}

export function AchievementsPreview({ report }: { report: ProgressReport }) {
  return (
    <section aria-labelledby="badges-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="badges-heading" className="font-display text-xl font-bold text-ink">Achievements</h2>
        <Link to="/exams/achievements" className="link text-sm">All achievements →</Link>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {badgeOrder(report.achievements).slice(0, 6).map((a) => <AchievementCard key={a.code} a={a} />)}
      </div>
    </section>
  );
}
