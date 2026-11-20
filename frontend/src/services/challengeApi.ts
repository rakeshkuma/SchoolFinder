import { http } from './http';
import { memberPracticeService, type AttemptPoints } from './accountApi';
import { guestToken, type LeaderboardPage } from './participantApi';
import type { PracticeCategory, PracticeScore, PracticeSession } from '../types/api';

/** Challenges: scheduled tests over the existing question bank, started, timed and scored by the server. */

export type ChallengeKind = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'EXAM' | 'SPECIAL';
export type ChallengeDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'MIXED';
export type ChallengeRelease = 'IMMEDIATE' | 'AFTER_END';
export type ChallengeStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED';

export interface ChallengeSummary {
  slug: string;
  title: string;
  description: string;
  kind: ChallengeKind;
  examSlug: string | null;
  category: PracticeCategory | null;
  difficulty: ChallengeDifficulty;
  questions: number;
  durationMinutes: number;
  startsAt: string;
  endsAt: string;
  maxScore: number;
  maxAttempts: number;
  /** students who submitted */
  participants: number;
  status: ChallengeStatus;
  resultRelease: ChallengeRelease;
}

export interface ChallengeDetail {
  summary: ChallengeSummary;
  rules: string | null;
  pointsPerCorrect: number;
  completionBonus: number;
  leaderboardEnabled: boolean;
  resultsReleased: boolean;
  /** null for someone who has not joined */
  mine: {
    attemptsUsed: number;
    attemptsLeft: number;
    inProgress: boolean;
    best: { attemptId: number; score: number; correct: number; total: number; durationSeconds: number | null; submittedAt: string; reviewFlag: string | null } | null;
  } | null;
}

export interface ChallengeStarted {
  attemptId: number;
  startedAt: string;
  deadlineAt: string;
  session: PracticeSession;
}

/** released false: the score is held back until releaseAt. */
export interface ChallengeSubmitted {
  released: boolean;
  releaseAt: string | null;
  score: PracticeScore | null;
  points: AttemptPoints | null;
  durationSeconds: number | null;
}

const auth = () => {
  const token = guestToken.get();
  return { headers: token ? { 'X-Participant-Token': token } : {} };
};

export const challengeService = {
  list: () => http.get<ChallengeSummary[]>('/challenges').then((r) => r.data),
  detail: (slug: string) => http.get<ChallengeDetail>(`/challenges/${encodeURIComponent(slug)}`, auth()).then((r) => r.data),
  board: (slug: string, page = 0, size = 50) =>
    http.get<LeaderboardPage>(`/challenges/${encodeURIComponent(slug)}/leaderboard`, { ...auth(), params: { page, size } }).then((r) => r.data),
  /** Starts an attempt, or returns the one in progress. */
  start: (slug: string, signedIn: boolean) => (signedIn ? memberPracticeService.startChallenge(slug)
    : http.post<ChallengeStarted>(`/challenges/${encodeURIComponent(slug)}/attempts`, null, auth()).then((r) => r.data)),
  submit: (slug: string, attemptId: number, answers: Record<string, number>, signedIn: boolean) => (signedIn
    ? memberPracticeService.submitChallenge(slug, attemptId, answers)
    : http.post<ChallengeSubmitted>(`/challenges/${encodeURIComponent(slug)}/attempts/${attemptId}/submit`, { answers }, auth()).then((r) => r.data)),
};

export const CHALLENGE_KIND_LABEL: Record<ChallengeKind, string> = {
  DAILY: 'Daily challenge', WEEKLY: 'Weekly challenge', MONTHLY: 'Monthly challenge', EXAM: 'Exam challenge', SPECIAL: 'Special challenge',
};
export const CHALLENGE_DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard', MIXED: 'Mixed' };
export const CHALLENGE_STATUS_LABEL: Record<ChallengeStatus, string> = { UPCOMING: 'Upcoming', ACTIVE: 'Active', COMPLETED: 'Completed' };

/** A challenge's date and time in the viewer's own time zone. */
export const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
