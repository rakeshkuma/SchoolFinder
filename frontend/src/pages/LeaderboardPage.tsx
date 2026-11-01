import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { SignInOptions } from '../components/common/SignInOptions';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState, ErrorState } from '../components/common/States';
import { POINTS_RULES } from '../components/exam/LeaderboardJoin';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import {
  TRACKS, leaderboardService, useGuestToken, type LeaderboardPage as Board, type LeaderboardParams,
  type LeaderboardPeriod, type LeaderboardRow,
} from '../services/participantApi';
import { examService, locationService, practiceService } from '../services/publicApi';

const PERIODS: [LeaderboardPeriod, string][] = [['TODAY', 'Today'], ['WEEK', 'This week'], ['MONTH', 'This month'], ['ALL', 'All time']];

/** What is ranked: every practice point, one exam, a category, or the daily quiz. Values are URL-safe keys. */
const SCOPES: { key: string; label: string; params: Partial<LeaderboardParams> }[] = [
  { key: '', label: 'All practice (All India)', params: {} },
  { key: 'netarhat', label: 'Netarhat entrance (Class VI)', params: { exam: 'netarhat' } },
  { key: 'jnvst', label: 'JNV entrance (JNVST)', params: { exam: 'jnvst' } },
  { key: 'aissee', label: 'Sainik School entrance (AISSEE)', params: { exam: 'aissee' } },
  { key: 'school', label: 'School exams (Class X, XII)', params: { category: 'SCHOOL' } },
  { key: 'olympiad', label: 'Olympiads', params: { category: 'OLYMPIAD' } },
  { key: 'competitive', label: 'Government & competitive exams', params: { category: 'COMPETITIVE' } },
  { key: 'daily', label: 'Daily quiz', params: { daily: true } },
];

const SIZES = [10, 50, 100];

/** The ranking chosen in the menu (?scope=), else the preset for an exam guide's ?exam= link, else everything. */
export function scopeFor(scopeParam: string | null, exam: string) {
  return SCOPES.find((s) => s.key === (scopeParam ?? exam)) ?? SCOPES[0];
}

const testsWord = (n: number) => `${n} ${n === 1 ? 'test' : 'tests'}`;

/**
 * Students ranked by points from the practice already on the site. Every filter is in the address, so a view can be
 * shared. Students who are not publicly listed keep their place but show as "Private learner".
 */
export function LeaderboardPage() {
  useDocumentTitle('Practice leaderboard');
  const [sp, setSp] = useSearchParams();
  const { status } = useMember();
  const token = useGuestToken();
  const period = (PERIODS.some(([p]) => p === sp.get('period')) ? sp.get('period') : 'ALL') as LeaderboardPeriod;
  const exam = sp.get('exam') ?? '';
  const scope = scopeFor(sp.get('scope'), exam);
  const section = sp.get('section') ?? '';
  const state = sp.get('state') ?? '';
  const track = sp.get('track') ?? '';
  const q = sp.get('q') ?? '';
  const size = SIZES.includes(Number(sp.get('size'))) ? Number(sp.get('size')) : 50;
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const [search, setSearch] = useState(q);
  // An exam outside the presets (from an exam guide's link) is ranked on its own and named in the menu.
  const otherExam = !!exam && !SCOPES.some((s) => s.key === exam) && !sp.get('scope');
  const exams = useApi(() => examService.all(), [], otherExam);
  const examName = exams.data?.find((e) => e.slug === exam)?.shortName;

  const params: LeaderboardParams = {
    period, ...scope.params, ...(exam && !scope.params.exam && !scope.key ? { exam } : {}), section: section || undefined,
    state: state || undefined, track: track || undefined, q: q || undefined, page, size,
  };
  const board = useApi(() => leaderboardService.get(params), [JSON.stringify(params), status, token]);
  const states = useApi(() => locationService.states(), []);
  const bank = useApi(() => practiceService.bank(), []);
  const stateName = useMemo(() => new Map((states.data ?? []).map((s) => [s.code, s.name])), [states.data]);
  const subjects = useMemo(() => {
    const counts = new Map<string, number>();
    (bank.data?.questions ?? []).forEach((x) => counts.set(x.section, (counts.get(x.section) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [bank.data]);

  const update = (changes: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(sp);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!keepPage) next.delete('page');
    setSp(next, { replace: true });
  };
  const joined = status === 'signedIn' || !!token;
  const data = board.data;
  const showPodium = !!data && page === 0 && !q && data.rows.length > 0;

  return (
    <>
      <PageHeader eyebrow="Practice centre" title="Leaderboard"
        subtitle="Students ranked by points from the practice tests and daily quiz on this site — no separate test needed. Nicknames only.">
        <div className="flex flex-wrap gap-2">
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← Practice centre</Link>
          <Link to="/exams/practice/session?mode=DAILY&timer=1" className="chip bg-accent-400 px-3 py-1.5 text-sm font-semibold text-ink">Today’s quiz</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <section className="card space-y-4 p-4 sm:p-5" aria-label="Leaderboard filters">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1" role="radiogroup" aria-label="Period">
            {PERIODS.map(([p, label]) => (
              <button key={p} type="button" role="radio" aria-checked={period === p} onClick={() => update({ period: p === 'ALL' ? null : p })}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${period === p ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="label">Ranking</span>
              <select className="input" value={otherExam ? `exam:${exam}` : scope.key}
                onChange={(e) => update(e.target.value.startsWith('exam:') ? { scope: null, exam: e.target.value.slice(5) } : { scope: e.target.value || null, exam: null })}>
                {SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                {otherExam && <option value={`exam:${exam}`}>{examName ?? exam} (this exam)</option>}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">Subject</span>
              <select className="input" value={section} onChange={(e) => update({ section: e.target.value || null })}>
                <option value="">All subjects</option>
                {subjects.map(([s, n]) => <option key={s} value={s}>{s}{n < 20 ? ' (few questions yet)' : ''}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">State</span>
              <select className="input" value={state} onChange={(e) => update({ state: e.target.value || null })}>
                <option value="">All India</option>
                {(states.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            </label>
            <label className="block text-sm">
              <span className="label">Preparing for</span>
              <select className="input" value={track} onChange={(e) => update({ track: e.target.value || null })}>
                <option value="">Everyone</option>
                {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <form className="flex min-w-0 basis-full gap-2 sm:basis-0 sm:flex-1" role="search" onSubmit={(e) => { e.preventDefault(); update({ q: search.trim() || null }); }}>
              <label className="sr-only" htmlFor="lb-search">Search by nickname</label>
              <input id="lb-search" className="input" maxLength={24} placeholder="Search by nickname" value={search} onChange={(e) => setSearch(e.target.value)} />
              <button type="submit" className="btn-secondary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
            </form>
            <div className="flex items-center gap-1 text-sm" role="group" aria-label="How many to show">
              {SIZES.map((n) => (
                <button key={n} type="button" aria-pressed={size === n} onClick={() => update({ size: n === 50 ? null : String(n) })}
                  className={`chip px-3 py-1 ${size === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>Top {n}</button>
              ))}
            </div>
          </div>
        </section>

        {board.error ? <ErrorState error={board.error} onRetry={board.reload} /> : !data ? <BoardSkeleton /> : (
          <>
            <MyRankCard data={data} joined={joined} stateName={stateName} />
            {data.participants === 0 ? (
              <EmptyState title="No one has points here yet">
                Be the first: every practice test and the daily quiz earn points.{' '}
                <Link to="/exams/practice/session?mode=DAILY&timer=1" className="link">Take today’s quiz →</Link>
              </EmptyState>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  <strong className="text-ink">{data.participants.toLocaleString('en-IN')}</strong> {data.participants === 1 ? 'student' : 'students'} ranked
                  {q && <> · {data.matches} {data.matches === 1 ? 'match' : 'matches'} for “{q}” (public nicknames only)</>}
                </p>
                {showPodium && <Podium rows={data.rows.slice(0, 3)} stateName={stateName} />}
                {data.rows.length === 0 ? <EmptyState title="No public nickname matches this search." />
                  : <RankList rows={showPodium ? data.rows.slice(3) : data.rows} stateName={stateName} />}
                <Pager page={data.page} size={data.size} total={data.matches} onPage={(p) => update({ page: p === 0 ? null : String(p) }, true)} />
              </>
            )}
          </>
        )}

        <details className="card p-5 text-sm text-slate-600">
          <summary className="cursor-pointer font-semibold text-ink">How points and ranks work</summary>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {POINTS_RULES.map((r) => <li key={r}>{r}</li>)}
            <li>Ranks go by points, then accuracy (correct ÷ attempted), then whoever reached their points first.</li>
            <li>Everyone with points is ranked, so positions are true; students who keep their name private show as “Private learner”.
              Under-18s are shown only if they state that a parent or guardian agrees.</li>
            <li>Browser tests cannot rule out every kind of help; unusual results are reviewed.</li>
          </ul>
        </details>
      </div>
    </>
  );
}

function trackLabel(track: string | null) {
  return TRACKS.find((t) => t.value === track)?.label ?? null;
}

function Avatar({ row, size = 'h-10 w-10 text-sm' }: { row: LeaderboardRow; size?: string }) {
  return (
    <span aria-hidden className={`grid shrink-0 place-items-center rounded-full font-display font-bold ${size} ${row.nickname
      ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
      {row.initials ?? <Icon name="shield" className="h-4 w-4" />}
    </span>
  );
}

function place(row: LeaderboardRow, stateName: Map<string, string>) {
  return [row.city, row.stateCode ? stateName.get(row.stateCode) ?? row.stateCode : null].filter(Boolean).join(', ');
}

const MEDAL = [
  { ring: 'ring-amber-300', bg: 'from-amber-300 to-amber-500', label: 'Gold', height: 'h-28 sm:h-36' },
  { ring: 'ring-slate-300', bg: 'from-slate-200 to-slate-400', label: 'Silver', height: 'h-20 sm:h-28' },
  { ring: 'ring-orange-300', bg: 'from-orange-300 to-orange-500', label: 'Bronze', height: 'h-16 sm:h-20' },
];

/** The top three as a podium (2nd, 1st, 3rd from left), with medals by rank. */
export function Podium({ rows, stateName }: { rows: LeaderboardRow[]; stateName: Map<string, string> }) {
  const order = rows.length >= 3 ? [1, 0, 2] : rows.map((_, i) => i);
  return (
    <ol className={`mx-auto grid items-end gap-2 sm:gap-4 ${rows.length >= 3 ? 'grid-cols-3' : rows.length === 2 ? 'max-w-xl grid-cols-2' : 'max-w-xs grid-cols-1'}`} aria-label="Top three">
      {order.map((i) => {
        const r = rows[i];
        const medal = MEDAL[Math.min(r.rank, 3) - 1] ?? MEDAL[2];
        return (
          <li key={i} className="flex min-w-0 flex-col items-center text-center">
            <Avatar row={r} size={`h-12 w-12 text-base ring-4 ${medal.ring} sm:h-16 sm:w-16 sm:text-lg`} />
            <p className={`mt-2 w-full truncate font-display text-sm font-bold sm:text-base ${r.nickname ? 'text-ink' : 'text-slate-500'}`}>
              {r.nickname ?? 'Private learner'}{r.me && ' (you)'}
            </p>
            <p className="w-full truncate text-xs text-slate-500">{place(r, stateName) || ' '}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-ink">{r.points.toLocaleString('en-IN')} pts</p>
            <div className={`mt-2 grid w-full place-items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2 ${medal.bg} ${medal.height}`}>
              <span className="font-display text-2xl font-extrabold text-white drop-shadow sm:text-3xl">{r.rank}</span>
              <span className="sr-only">{medal.label}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function RankList({ rows, stateName }: { rows: LeaderboardRow[]; stateName: Map<string, string> }) {
  if (rows.length === 0) return null;
  return (
    <ol className="card divide-y divide-slate-100 overflow-hidden" aria-label="Ranking">
      {rows.map((r, i) => <RankRow key={`${r.rank}-${i}`} row={r} stateName={stateName} />)}
    </ol>
  );
}

function RankRow({ row: r, stateName }: { row: LeaderboardRow; stateName: Map<string, string> }) {
  const where = place(r, stateName);
  const track = trackLabel(r.track);
  return (
    <li className={`flex items-center gap-3 px-4 py-3 sm:gap-4 ${r.me ? 'bg-brand-50' : ''}`}>
      <span className="w-10 shrink-0 text-right font-display text-lg font-bold tabular-nums text-slate-700">{r.rank}</span>
      <Avatar row={r} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${r.nickname ? 'text-ink' : 'text-slate-500'}`}>
          {r.nickname ?? 'Private learner'}{r.me && <span className="ml-2 chip bg-brand-600 px-2 py-0.5 text-xs text-white">You</span>}
        </p>
        <p className="truncate text-xs text-slate-500">{[where, track].filter(Boolean).join(' · ') || ' '}</p>
      </div>
      <dl className="hidden shrink-0 grid-cols-3 gap-6 text-right text-xs text-slate-500 md:grid">
        <div><dt>Tests</dt><dd className="font-semibold tabular-nums text-ink">{r.tests}</dd></div>
        <div><dt>Accuracy</dt><dd className="font-semibold tabular-nums text-ink">{r.accuracy === null ? '–' : `${r.accuracy}%`}</dd></div>
        <div><dt>Streak</dt><dd className="font-semibold tabular-nums text-ink">{r.streak > 0 ? `${r.streak} d` : '–'}</dd></div>
      </dl>
      <span className="w-20 shrink-0 text-right">
        <span className="block font-display text-lg font-bold tabular-nums text-ink">{r.points.toLocaleString('en-IN')}</span>
        <span className="text-xs text-slate-500">points</span>
      </span>
    </li>
  );
}

/** Your own place (even outside the top 100), with the students just above and below; or how to get one. */
function MyRankCard({ data, joined, stateName }: { data: Board; joined: boolean; stateName: Map<string, string> }) {
  if (!joined) {
    return (
      <section className="card space-y-3 p-5" aria-label="Your rank">
        <div className="flex flex-wrap items-center gap-4">
          <Icon name="trophy" className="h-8 w-8 text-accent-500" />
          <p className="min-w-[14rem] flex-1 text-sm text-slate-700">
            <strong className="text-ink">See your own rank.</strong> Join with a nickname, or sign in, and the practice you do earns points.
          </p>
          <Link to="/exams/practice/progress" className="btn-primary">Join with a nickname</Link>
        </div>
        <SignInOptions bare text="Have an account, or want one?" />
      </section>
    );
  }
  if (!data.me) {
    return (
      <section className="card p-5 text-sm text-slate-700" aria-label="Your rank">
        You have no points in this view yet. Points come from practice tests and the daily quiz in what this view ranks.
      </section>
    );
  }
  const { row, above, below } = data.me;
  return (
    <section className="card overflow-hidden" aria-labelledby="my-rank-heading">
      <div className="flex flex-wrap items-center gap-4 bg-ink px-5 py-4 text-white">
        <h2 id="my-rank-heading" className="font-display text-lg font-bold text-white">Your rank: #{row.rank} <span className="font-normal text-slate-300">of {data.participants.toLocaleString('en-IN')}</span></h2>
        <span className="text-sm text-slate-300">{row.points.toLocaleString('en-IN')} points · {testsWord(row.tests)} · {row.accuracy === null ? '–' : `${row.accuracy}%`} accuracy{row.streak > 0 && ` · ${row.streak}-day streak`}</span>
        {!row.listed && <Link to="/exams/practice/progress" className="ml-auto text-sm text-accent-300 underline">Private — change in your profile</Link>}
      </div>
      <ol className="divide-y divide-slate-100" aria-label="Students around you">
        {above && <RankRow row={above} stateName={stateName} />}
        <RankRow row={row} stateName={stateName} />
        {below && <RankRow row={below} stateName={stateName} />}
      </ol>
    </section>
  );
}

function Pager({ page, size, total, onPage }: { page: number; size: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.ceil(total / size);
  if (pages <= 1) return null;
  return (
    <nav className="flex items-center justify-center gap-3 text-sm" aria-label="Pages">
      <button type="button" className="btn-secondary" disabled={page === 0} onClick={() => onPage(page - 1)}>← Previous</button>
      <span className="text-slate-600">Page {page + 1} of {pages}</span>
      <button type="button" className="btn-secondary" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </nav>
  );
}

function BoardSkeleton() {
  return (
    <div className="card divide-y divide-slate-100" aria-busy="true" aria-label="Loading the leaderboard">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 px-4 py-3">
          <span className="h-5 w-8 rounded bg-slate-200" /><span className="h-10 w-10 rounded-full bg-slate-200" />
          <span className="h-4 flex-1 rounded bg-slate-200" /><span className="h-5 w-16 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}
