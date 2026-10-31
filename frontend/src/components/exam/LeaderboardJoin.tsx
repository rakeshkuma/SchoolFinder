import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { useApi } from '../../hooks/useApi';
import type { AttemptPoints } from '../../services/accountApi';
import { ApiError } from '../../services/http';
import { TRACKS, type AgeConfirmation, type ParticipantProfile, type ParticipantRequest } from '../../services/participantApi';
import { locationService } from '../../services/publicApi';

/** How points work, shown wherever points appear (kept in step with PointsService on the server). */
export const POINTS_RULES = [
  '10 points for each question the first time you answer it correctly; wrong and skipped answers cost nothing.',
  'The daily quiz earns 10 points per correct answer once a day, for that day’s ten questions.',
  'Points never come from speed: answers faster than a person can read (about 1.5 seconds each) earn nothing.',
  'Points are separate from your marks, which follow each test’s own marking scheme.',
  'Challenges set their own points, shown before you start.',
];

function guestAge(profile?: ParticipantProfile | null): AgeConfirmation {
  if (profile?.ageBand === 'ADULT') return 'ADULT';
  return profile?.publicListing ? 'MINOR_WITH_GUARDIAN' : 'MINOR';
}

function initial(member: boolean, profile?: ParticipantProfile | null): ParticipantRequest {
  return {
    nickname: profile && !profile.nickname.startsWith('Learner ') ? profile.nickname : '',
    stateCode: profile?.stateCode ?? null,
    city: profile?.city ?? null,
    showCity: profile?.showCity ?? false,
    track: profile?.track ?? null,
    age: member ? 'ADULT' : guestAge(profile),
    publicListing: profile?.publicListing ?? false,
  };
}

/**
 * Nickname, state, optional city and what the student prepares for. Guests also answer the age question that decides
 * whether a public listing is allowed; accounts are for adults, so members are not asked.
 */
export function ParticipantForm({ profile, member, submitLabel, onSubmit }: {
  profile?: ParticipantProfile | null;
  member: boolean;
  submitLabel: string;
  onSubmit: (request: ParticipantRequest) => Promise<void>;
}) {
  const [form, setForm] = useState<ParticipantRequest>(() => initial(member, profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const states = useApi(() => locationService.states(), []);
  const set = <K extends keyof ParticipantRequest>(k: K, v: ParticipantRequest[K]) => setForm((f) => ({ ...f, [k]: v }));
  const canList = form.age === 'ADULT' || form.age === 'MINOR_WITH_GUARDIAN';
  const ages: [AgeConfirmation, string][] = [
    ['ADULT', 'I am 18 or older'],
    ['MINOR_WITH_GUARDIAN', 'I am under 18 and my parent or guardian agrees that my nickname may be shown'],
    ['MINOR', 'I am under 18 — keep me off public lists'],
  ];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({ ...form, publicListing: canList && form.publicListing, city: form.city?.trim() || null });
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors[0]?.message ?? err.message) : 'Could not save. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 text-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">Nickname</span>
          <input className="input" required minLength={3} maxLength={24} value={form.nickname} autoComplete="off"
            onChange={(e) => set('nickname', e.target.value)} placeholder="e.g. Star Learner" />
          <span className="mt-1 block text-xs text-slate-500">Shown instead of your name. Please don’t use your real full name.</span>
        </label>
        <label className="block">
          <span className="label">State or union territory</span>
          <select className="input" value={form.stateCode ?? ''} onChange={(e) => set('stateCode', e.target.value || null)}>
            <option value="">Prefer not to say</option>
            {(states.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">City or town (optional)</span>
          <input className="input" maxLength={80} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
          <span className="mt-1 flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={form.showCity} disabled={!form.city?.trim()} onChange={(e) => set('showCity', e.target.checked)} />
            Show my city on leaderboards
          </span>
        </label>
        <label className="block">
          <span className="label">Preparing for</span>
          <select className="input" value={form.track ?? ''} onChange={(e) => set('track', e.target.value || null)}>
            <option value="">Choose (optional)</option>
            {TRACKS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
      </div>
      {!member && (
        <fieldset>
          <legend className="label">Your age</legend>
          <div className="space-y-1.5">
            {ages.map(([v, label]) => (
              <label key={v} className="flex items-start gap-2">
                <input type="radio" name="age" className="mt-1" checked={form.age === v} onChange={() => set('age', v)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className={`flex items-start gap-2 rounded-xl p-3 ${canList ? 'bg-brand-50' : 'bg-slate-50 text-slate-500'}`}>
        <input type="checkbox" className="mt-1" disabled={!canList} checked={canList && form.publicListing}
          onChange={(e) => set('publicListing', e.target.checked)} />
        <span>
          Show my nickname on public leaderboards.{' '}
          {canList ? 'You can change this at any time.' : 'Not available: you are ranked privately and can still see your own position.'}
        </span>
      </label>
      <p className="text-xs text-slate-500">
        We never show your email or phone number. Your results are used only for your progress and rankings.
        {member
          ? ' Accounts are for adults. If your child practises on your account, you decide whether this nickname is shown; please choose one that doesn’t identify them.'
          : ' Your entry is kept in this browser. Accounts are for adults (18 or older); signing in to one here moves these results into it.'}
        {' '}<Link to="/privacy" className="link">Privacy policy</Link>
      </p>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
    </form>
  );
}

/** How this score compares with the student's best earlier one on the same test. */
export function bestNote(percent: number, previousBest: number): string {
  if (percent > previousBest) return `New best on this test: up ${percent - previousBest} from ${previousBest}%.`;
  return percent === previousBest ? `Level with your best on this test (${previousBest}%).` : `Your best on this test is ${previousBest}%.`;
}

/**
 * What the attempt earned, and why (or why not), with the student's rank, their best earlier score and any new badges;
 * guests who have not joined can join and count this result.
 */
export function PointsPanel({ points, signedIn, scorePercent, note, onJoin }: {
  points: AttemptPoints | null;
  signedIn: boolean;
  /** how points work for this test, when not the usual way (a challenge) */
  note?: string;
  /** this attempt's score, compared with the student's previous best */
  scorePercent?: number;
  /** For guests who have not joined: join with these details and count this attempt. */
  onJoin?: (request: ParticipantRequest) => Promise<AttemptPoints>;
}) {
  const [joined, setJoined] = useState<AttemptPoints | null>(null);
  const [open, setOpen] = useState(false);
  const shown = points ?? joined;
  if (!shown) {
    if (signedIn || !onJoin) return null;
    return (
      <section className="card p-5" aria-labelledby="join-heading">
        <h2 id="join-heading" className="flex items-center gap-2 font-display text-lg font-bold text-ink">
          <Icon name="trophy" className="h-5 w-5 text-accent-500" /> Count this result on the leaderboard
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Join with a nickname to earn points for this test and the ones you take next. No account needed.
        </p>
        {open ? (
          <div className="mt-4">
            <ParticipantForm member={false} submitLabel="Join and count this result"
              onSubmit={async (r) => setJoined(await onJoin(r))} />
          </div>
        ) : (
          <button type="button" className="btn-secondary mt-3" onClick={() => setOpen(true)}>Join with a nickname</button>
        )}
      </section>
    );
  }
  const why = shown.reviewFlag === 'TOO_FAST' ? 'Answers came faster than a person can read them, so this test earned no points.'
    : shown.reviewFlag === 'DAILY_REPEAT' ? 'Today’s quiz already counted for you; come back tomorrow for new questions.'
      : shown.reviewFlag === 'NO_TIMING' ? 'This test was not timed, so it earned no points.'
        : note ? note : shown.earned === 0 ? 'Points come the first time you answer a question correctly; these were already counted.'
          : shown.dailyQuiz ? 'Today’s daily quiz: 10 points for each correct answer.' : '10 points for each question answered correctly for the first time.';
  return (
    <section className="card p-5" aria-label="Leaderboard points">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-100 text-accent-700"><Icon name="trophy" className="h-6 w-6" /></span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold text-ink">+{shown.earned} points</p>
          <p className="text-sm text-slate-600">{why}</p>
          {scorePercent !== undefined && shown.previousBest != null && <p className="text-sm text-slate-600">{bestNote(scorePercent, shown.previousBest)}</p>}
        </div>
        {shown.rank != null && (
          <Link to="/exams/leaderboard" className="link text-sm">Your rank: #{shown.rank} of {shown.participants} →</Link>
        )}
      </div>
      {(shown.achievements?.length ?? 0) > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 text-sm">
          <span className="font-semibold text-ink">New {shown.achievements!.length === 1 ? 'badge' : 'badges'}:</span>
          {shown.achievements!.map((a) => (
            <Link key={a.code} to="/exams/achievements" className="chip bg-accent-100 text-accent-900">{a.title}</Link>
          ))}
        </div>
      )}
    </section>
  );
}
