import { useSyncExternalStore } from 'react';
import { http } from './http';
import type { Achievement, AttemptInput, ProgressReport, SavedAttempt } from './accountApi';
import type { PracticeAttemptSummary, PracticeHistoryItem, PracticeScore } from '../types/api';

/**
 * Leaderboard participation without an account. Joining returns a secret token, kept only in this browser and sent
 * back in X-Participant-Token; anyone with it can act as this guest, so it is never shown or put in a URL.
 */

/** ADULT: 18 or over. MINOR_WITH_GUARDIAN: under 18, a parent or guardian agrees to a public nickname. MINOR: kept private. */
export type AgeConfirmation = 'ADULT' | 'MINOR_WITH_GUARDIAN' | 'MINOR';

export interface ParticipantRequest {
  nickname: string;
  stateCode: string | null;
  city: string | null;
  showCity: boolean;
  track: string | null;
  age: AgeConfirmation;
  publicListing: boolean;
}

export interface ParticipantProfile {
  publicId: string;
  nickname: string;
  stateCode: string | null;
  city: string | null;
  showCity: boolean;
  track: string | null;
  ageBand: 'ADULT' | 'MINOR' | 'UNKNOWN';
  publicListing: boolean;
  /** shown on public leaderboards now */
  listed: boolean;
  member: boolean;
  points: number;
  attempts: number;
}

/** What students prepare for; used to group rankings. */
export const TRACKS: { value: string; label: string }[] = [
  { value: 'NETARHAT', label: 'Netarhat entrance (Class VI)' },
  { value: 'JNVST', label: 'JNV entrance (JNVST)' },
  { value: 'AISSEE', label: 'Sainik School entrance (AISSEE)' },
  { value: 'CLASS_6_8', label: 'Class VI–VIII' },
  { value: 'CLASS_9_10', label: 'Class IX–X' },
  { value: 'CLASS_11_12', label: 'Class XI–XII' },
  { value: 'OLYMPIAD', label: 'Olympiads' },
  { value: 'COMPETITIVE', label: 'Government & competitive exams' },
  { value: 'OTHER', label: 'Something else' },
];

const KEY = 'isf.participant';
const listeners = new Set<() => void>();
let cached: string | null | undefined;

/** The guest token in this browser (null when this browser has not joined, or storage is unavailable). */
export const guestToken = {
  get(): string | null {
    if (cached !== undefined) return cached;
    try {
      cached = window.localStorage.getItem(KEY);
    } catch {
      cached = null;
    }
    return cached;
  },
  set(token: string | null) {
    cached = token;
    try {
      if (token) window.localStorage.setItem(KEY, token);
      else window.localStorage.removeItem(KEY);
    } catch {
      // private mode: the token lives only for this page view
    }
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export function useGuestToken(): string | null {
  return useSyncExternalStore(guestToken.subscribe, guestToken.get, guestToken.get);
}

const auth = () => ({ headers: { 'X-Participant-Token': guestToken.get() ?? '' } });

export const participantService = {
  /** Joins as a guest and keeps the token in this browser. */
  join: async (request: ParticipantRequest) => {
    const r = await http.post<{ profile: ParticipantProfile; token: string }>('/participants', request);
    guestToken.set(r.data.token);
    return r.data.profile;
  },
  me: () => http.get<ParticipantProfile>('/participants/me', auth()).then((r) => r.data),
  update: (request: ParticipantRequest) => http.put<ParticipantProfile>('/participants/me', request, auth()).then((r) => r.data),
  /** Deletes this guest's results and points, and forgets the token. */
  remove: async () => {
    await http.delete('/participants/me', auth());
    guestToken.set(null);
  },
  record: (input: AttemptInput) => http.post<SavedAttempt>('/participants/me/attempts', input, auth()).then((r) => r.data),
  /** This guest's stored attempts, newest first, as memberPracticeService.history gives a member's. */
  history: (limit = 200) =>
    http.get<PracticeHistoryItem[]>('/participants/me/history', { ...auth(), params: { limit } }).then((r) => r.data),
  attempt: (id: number) =>
    http.get<{ attempt: PracticeAttemptSummary; questionIds: string[]; answers: Record<string, number>; score: PracticeScore }>(
      `/participants/me/attempts/${id}`, auth()).then((r) => r.data),
  progress: () => http.get<ProgressReport>('/participants/me/progress', auth()).then((r) => r.data),
};

export type LeaderboardPeriod = 'TODAY' | 'WEEK' | 'MONTH' | 'ALL';

export interface LeaderboardParams {
  period?: LeaderboardPeriod;
  exam?: string;
  category?: string;
  section?: string;
  daily?: boolean;
  state?: string;
  city?: string;
  track?: string;
  q?: string;
  page?: number;
  size?: number;
}

/** One ranked student; a student who is not publicly listed has no nickname or place (only rank and numbers). */
export interface LeaderboardRow {
  rank: number;
  listed: boolean;
  nickname: string | null;
  initials: string | null;
  stateCode: string | null;
  city: string | null;
  track: string | null;
  points: number;
  tests: number;
  accuracy: number | null;
  streak: number;
  me: boolean;
}

export interface LeaderboardPage {
  period: LeaderboardPeriod;
  from: string;
  /** everyone ranked in this view */
  participants: number;
  /** rows found by a name search (equal to participants without one) */
  matches: number;
  page: number;
  size: number;
  rows: LeaderboardRow[];
  me: { row: LeaderboardRow; above: LeaderboardRow | null; below: LeaderboardRow | null } | null;
}

export const leaderboardService = {
  /** Every badge and how to earn it. */
  achievements: () => http.get<Achievement[]>('/leaderboard/achievements').then((r) => r.data),
  /** Sends the guest token when there is one, so the page can show "your rank". Members are known by their session. */
  get: (params: LeaderboardParams) => {
    const token = guestToken.get();
    const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== false));
    return http.get<LeaderboardPage>('/leaderboard', { params: clean, headers: token ? { 'X-Participant-Token': token } : {} })
      .then((r) => r.data);
  },
};
