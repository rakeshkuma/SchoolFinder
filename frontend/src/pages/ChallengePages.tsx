import { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { SignInOptions } from '../components/common/SignInOptions';
import { PageHeader } from '../components/common/PageHeader';
import { EmptyState, ErrorState, SkeletonCards, Spinner } from '../components/common/States';
import { ParticipantForm } from '../components/exam/LeaderboardJoin';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import {
  CHALLENGE_DIFFICULTY_LABEL, CHALLENGE_KIND_LABEL, CHALLENGE_STATUS_LABEL, challengeService, when,
  type ChallengeDetail, type ChallengeStatus, type ChallengeSummary,
} from '../services/challengeApi';
import { ApiError } from '../services/http';
import { participantService, useGuestToken } from '../services/participantApi';
import { locationService, practiceService } from '../services/publicApi';
import { CATEGORY_LABEL, Player, type Sitting } from './PracticePages';
import { NotFoundPage } from './InfoPages';
import { Podium, RankList } from './LeaderboardPage';

const STATUS_TONE: Record<ChallengeStatus, string> = {
  ACTIVE: 'bg-emerald-50 text-emerald-800', UPCOMING: 'bg-brand-50 text-brand-800', COMPLETED: 'bg-slate-100 text-slate-700',
};

const GROUPS: [ChallengeStatus, string][] = [['ACTIVE', 'Open now'], ['UPCOMING', 'Coming up'], ['COMPLETED', 'Finished']];

const pointsWord = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`;

/** How points work for this challenge, in one sentence. */
export function scoringLine(d: Pick<ChallengeDetail, 'pointsPerCorrect' | 'completionBonus'>): string {
  const bonus = d.completionBonus > 0 ? `, plus a finishing bonus of ${pointsWord(d.completionBonus)}` : '';
  return `${pointsWord(d.pointsPerCorrect)} for each correct answer${bonus}. Wrong and unanswered questions score nothing.`;
}

function ChallengeCard({ c }: { c: ChallengeSummary }) {
  return (
    <Link to={`/exams/challenges/${c.slug}`} className="card card-hover flex h-full flex-col p-5">
      <span className="flex flex-wrap items-center gap-2">
        <span className={`chip ${STATUS_TONE[c.status]}`}>{CHALLENGE_STATUS_LABEL[c.status]}</span>
        <span className="chip bg-slate-100 text-slate-700">{CHALLENGE_KIND_LABEL[c.kind]}</span>
      </span>
      <h3 className="mt-3 font-display text-lg font-bold text-ink">{c.title}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-600">{c.description}</p>
      <p className="mt-3 text-xs text-slate-500">
        {c.questions} questions · {c.durationMinutes} min · {CHALLENGE_DIFFICULTY_LABEL[c.difficulty]} · up to {c.maxScore} points
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {c.status === 'UPCOMING' ? `Opens ${when(c.startsAt)}` : c.status === 'ACTIVE' ? `Closes ${when(c.endsAt)}` : `Ended ${when(c.endsAt)}`}
        {' · '}{c.participants} {c.participants === 1 ? 'student' : 'students'}
      </p>
    </Link>
  );
}

/** Published challenges: open ones first. Nothing here is invented: an empty list is shown as empty. */
export function ChallengesPage() {
  useDocumentTitle('Challenges');
  const list = useApi(() => challengeService.list(), []);
  return (
    <>
      <PageHeader eyebrow="Practice centre" title="Challenges" subtitle="Scheduled tests from our practice questions, with their own rankings.">
        <div className="flex flex-wrap gap-2">
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← Practice centre</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        {list.error ? <ErrorState error={list.error} onRetry={list.reload} /> : !list.data ? <SkeletonCards count={3} />
          : list.data.length === 0 ? (
            <EmptyState title="No challenges are scheduled yet">
              New challenges appear here. Until then, every practice test and the daily quiz earn points.{' '}
              <Link to="/exams/practice/session?mode=DAILY&timer=1" className="link">Take today’s quiz →</Link>
            </EmptyState>
          ) : GROUPS.map(([status, heading]) => {
            const rows = list.data!.filter((c) => c.status === status);
            return rows.length === 0 ? null : (
              <section key={status} aria-label={heading}>
                <h2 className="font-display text-xl font-bold text-ink">{heading}</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {rows.map((c) => <ChallengeCard key={c.slug} c={c} />)}
                </div>
              </section>
            );
          })}
      </div>
    </>
  );
}

/** What the student can do now: join, start, carry on, or see their result. */
function TakePart({ d, onJoined }: { d: ChallengeDetail; onJoined: () => void }) {
  const { status: member } = useMember();
  const token = useGuestToken();
  const { summary: c, mine } = d;
  const signedIn = member === 'signedIn';
  const joined = signedIn || !!token;
  return (
    <section className="card space-y-3 p-5" aria-labelledby="take-part-heading">
      <h2 id="take-part-heading" className="font-display text-lg font-bold text-ink">Take part</h2>
      {mine?.best && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          Your best: <strong>{mine.best.score} of {c.maxScore}</strong> ({mine.best.correct}/{mine.best.total} correct).{' '}
          {mine.best.reviewFlag === 'TOO_FAST' && 'It was answered very quickly, so it is waiting for review and is not ranked yet. '}
          {mine.best.reviewFlag === 'VOIDED' && 'It was removed after review and does not count. '}
          <Link to={`/exams/practice/attempts/${token && !signedIn ? 'guest-' : ''}${mine.best.attemptId}`} className="link">Review your answers →</Link>
        </p>
      )}
      {c.status === 'UPCOMING' && <p className="text-sm text-slate-700">Opens {when(c.startsAt)}. Come back then to start.</p>}
      {c.status === 'COMPLETED' && <p className="text-sm text-slate-700">This challenge has ended.</p>}
      {c.status === 'ACTIVE' && (!joined ? (
        <>
          <p className="text-sm text-slate-700">Join with a nickname to take part. No account needed.</p>
          <ParticipantForm member={false} submitLabel="Join" onSubmit={async (r) => { await participantService.join(r); onJoined(); }} />
          <SignInOptions bare text="Or sign in to keep your results on every device." />
        </>
      ) : mine && mine.attemptsLeft === 0 && !mine.inProgress ? (
        <p className="text-sm text-slate-700">You have used {mine.attemptsUsed === 1 ? 'your attempt' : `all ${mine.attemptsUsed} attempts`}.</p>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Link to={`/exams/challenges/${c.slug}/take`} className="btn-primary">
            {mine?.inProgress ? 'Carry on' : 'Start now'} <Icon name="arrowRight" className="h-4 w-4" />
          </Link>
          <span className="text-sm text-slate-600">
            {mine?.inProgress ? 'Your timer is running.' : `The ${c.durationMinutes}-minute timer starts as soon as you press Start.`}
            {mine && !mine.inProgress && ` ${mine.attemptsLeft} ${mine.attemptsLeft === 1 ? 'attempt' : 'attempts'} left.`}
          </span>
        </div>
      ))}
    </section>
  );
}

function ChallengeBoard({ d }: { d: ChallengeDetail }) {
  const { status } = useMember();
  const token = useGuestToken();
  const board = useApi(() => challengeService.board(d.summary.slug), [d.summary.slug, status, token], d.leaderboardEnabled && d.resultsReleased);
  const states = useApi(() => locationService.states(), []);
  const stateName = useMemo(() => new Map((states.data ?? []).map((s) => [s.code, s.name])), [states.data]);
  if (!d.leaderboardEnabled) return null;
  const data = board.data;
  return (
    <section className="space-y-3" aria-labelledby="challenge-board-heading">
      <h2 id="challenge-board-heading" className="font-display text-xl font-bold text-ink">Leaderboard</h2>
      {!d.resultsReleased ? <p className="card p-4 text-sm text-slate-700">The ranking appears when the challenge ends, on {when(d.summary.endsAt)}.</p>
        : board.error ? <ErrorState error={board.error} onRetry={board.reload} />
          : !data ? <Spinner />
            : data.rows.length === 0 ? <p className="card p-4 text-sm text-slate-700">No ranked results yet.</p> : (
              <>
                {data.me && <p className="text-sm text-slate-700">Your rank: <strong className="text-ink">#{data.me.row.rank}</strong> of {data.participants}</p>}
                <Podium rows={data.rows.slice(0, 3)} stateName={stateName} />
                <RankList rows={data.rows.slice(3)} stateName={stateName} />
              </>
            )}
      <p className="text-xs text-slate-500">Ranked by best valid attempt: score, then accuracy, then the shorter time, then the earlier submission.</p>
    </section>
  );
}

export function ChallengeDetailPage() {
  const { slug = '' } = useParams();
  const [sp] = useSearchParams();
  const { status } = useMember();
  const token = useGuestToken();
  const state = useApi(() => challengeService.detail(slug), [slug, status, token]);
  useDocumentTitle(state.data ? state.data.summary.title : 'Challenge');
  if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!state.data) return <Spinner />;
  const d = state.data;
  const c = d.summary;
  const facts: [string, string][] = [
    ['Status', CHALLENGE_STATUS_LABEL[c.status]],
    ['Exam category', c.category ? CATEGORY_LABEL[c.category] : 'All subjects'],
    ['Difficulty', CHALLENGE_DIFFICULTY_LABEL[c.difficulty]],
    ['Questions', String(c.questions)],
    ['Duration', `${c.durationMinutes} minutes`],
    ['Maximum score', String(c.maxScore)],
    ['Opens', when(c.startsAt)],
    ['Closes', when(c.endsAt)],
    ['Students so far', String(c.participants)],
  ];
  return (
    <>
      <PageHeader eyebrow={CHALLENGE_KIND_LABEL[c.kind]} title={c.title} subtitle={c.description}>
        <div className="flex flex-wrap gap-2">
          <Link to="/exams/challenges" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← All challenges</Link>
        </div>
      </PageHeader>
      <div className="container-page max-w-4xl space-y-6 py-8">
        {sp.get('submitted') && (
          <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">
            Your answers are in. Your score and the answers appear here after the challenge ends, on {when(c.endsAt)}.
          </p>
        )}
        <TakePart d={d} onJoined={state.reload} />
        <section className="card p-5" aria-label="Challenge details">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            {facts.map(([label, value]) => (
              <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-semibold text-ink">{value}</dd></div>
            ))}
          </dl>
        </section>
        <section className="card p-5 text-sm text-slate-700" aria-labelledby="rules-heading">
          <h2 id="rules-heading" className="font-display text-lg font-bold text-ink">Rules</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>{scoringLine(d)}</li>
            <li>{c.maxAttempts === 1 ? 'One attempt.' : `Up to ${c.maxAttempts} attempts; your best one counts.`} An attempt you leave unfinished still counts as used.</li>
            <li>The timer runs on our server from the moment you start, and it does not stop if you leave the page.</li>
            <li>{c.resultRelease === 'AFTER_END' ? 'Your score and the answers appear after the challenge ends.' : 'You see your score and the answers as soon as you submit.'}</li>
            <li>Answers given implausibly fast earn nothing and are reviewed by a person.</li>
            {d.rules && <li className="whitespace-pre-line">{d.rules}</li>}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Questions come from our own practice bank, so some may be familiar. Browser-based tests cannot fully prevent cheating;
            a challenge rank is a practice result, not an official one.
          </p>
        </section>
        <ChallengeBoard d={d} />
      </div>
    </>
  );
}

/** Starts the attempt on the server (or picks up the one in progress) and opens the test. */
export function ChallengeTakePage() {
  const { slug = '' } = useParams();
  const { status } = useMember();
  const token = useGuestToken();
  const signedIn = status === 'signedIn';
  const state = useApi(async () => {
    const [started, detail] = await Promise.all([challengeService.start(slug, signedIn), challengeService.detail(slug)]);
    return { started, detail };
  }, [slug, signedIn, token], status !== 'loading');
  useDocumentTitle(state.data ? state.data.detail.summary.title : 'Challenge');
  const sitting = useMemo<Sitting | null>(() => {
    if (!state.data) return null;
    const { started, detail } = state.data;
    const s = started.session;
    return {
      key: `challenge-${started.attemptId}`, progressKey: `challenge:${started.attemptId}`, mode: 'CHALLENGE', eyebrow: 'Challenge',
      title: detail.summary.title, description: detail.summary.description, examSlug: detail.summary.examSlug, setSlug: null,
      passages: s.passages, questions: s.questions, marking: null, minutes: detail.summary.durationMinutes, reviewedOn: null,
      bankId: (id) => id,
      guestScore: (answers) => practiceService.scoreSession(s.questions.map((q) => q.id), answers),
      challenge: {
        slug, startedAt: Date.parse(started.startedAt), deadline: Date.parse(started.deadlineAt), pointsNote: scoringLine(detail),
        submit: (answers) => challengeService.submit(slug, started.attemptId, answers, signedIn),
      },
    };
  }, [state.data, slug, signedIn]);
  if (state.error) {
    return (
      <div className="container-page max-w-2xl py-10">
        <EmptyState title="This challenge could not be started">
          {state.error.message} <Link to={`/exams/challenges/${slug}`} className="link">Back to the challenge</Link>
        </EmptyState>
      </div>
    );
  }
  if (!sitting) return <Spinner label="Starting…" />;
  return <Player key={sitting.key} sitting={sitting} />;
}
