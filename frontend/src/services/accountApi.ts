import { http } from './http';
import type { PageResponse, PracticeAttemptSummary, PracticeHistoryItem, PracticeMode, PracticeScore } from '../types/api';

/**
 * Member accounts. The session lives on the server; the browser holds only an HttpOnly cookie that scripts cannot
 * read. State-changing calls carry the CSRF token: the server sets the XSRF-TOKEN cookie and axios copies it into
 * the X-XSRF-TOKEN header for same-origin requests. Nothing here is stored in localStorage or sessionStorage.
 */
export interface Account {
  email: string;
  displayName: string;
  emailVerified: boolean;
  stateCode: string | null;
  city: string | null;
  createdAt: string;
  termsVersion: string;
  /** False for members who signed up with Google and have not set a password. */
  hasPassword: boolean;
  googleLinked: boolean;
}

export interface AccountConfig {
  emailDeliveryConfigured: boolean;
  emailDeliveryMode: 'smtp' | 'dev-outbox' | 'none';
  googleSignInEnabled: boolean;
  passwordPolicy: string;
  termsVersion: string;
}

export interface RegisterInput {
  displayName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  stateCode?: string;
  city?: string;
}

/** Makes sure the CSRF cookie exists before the first state-changing request. */
let csrfReady: Promise<unknown> | null = null;
function ensureCsrf() {
  if (!csrfReady) csrfReady = http.get('/account/csrf').catch((e) => { csrfReady = null; throw e; });
  return csrfReady;
}

async function send<T>(method: 'post' | 'put' | 'patch' | 'delete', path: string, body?: unknown): Promise<T> {
  await ensureCsrf();
  const r = method === 'delete' ? await http.delete<T>(path, { data: body }) : await http[method]<T>(path, body);
  return r.data;
}

export const accountService = {
  config: () => http.get<AccountConfig>('/account/config').then((r) => r.data),
  /** Resolves with the signed-in member, or rejects with status 401 when signed out. */
  me: () => http.get<Account>('/account/me').then((r) => r.data),
  register: (input: RegisterInput) => send<{ status: string }>('post', '/account/register', input),
  verifyEmail: (token: string) => send<{ status: string }>('post', '/account/verify-email', { token }),
  resendVerification: (email: string) => send<{ status: string }>('post', '/account/resend-verification', { email }),
  login: (email: string, password: string, rememberMe: boolean) => send<Account>('post', '/account/login', { email, password, rememberMe }),
  logout: () => send<void>('post', '/account/logout'),
  forgotPassword: (email: string) => send<{ status: string }>('post', '/account/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => send<{ status: string }>('post', '/account/reset-password', { token, newPassword }),
  updateProfile: (input: { displayName: string; stateCode?: string | null; city?: string | null }) => send<Account>('patch', '/account/me', input),
  changePassword: (currentPassword: string, newPassword: string) => send<void>('post', '/account/change-password', { currentPassword, newPassword }),
  /** With a password, the password; without one (Google sign-up), the account's email address. */
  deleteAccount: (confirm: { password?: string; confirmEmail?: string }) => send<void>('delete', '/account/me', confirm),
};

export interface AttemptInput {
  /** Generated once per attempt in the browser; sending the same attempt again returns the first result. */
  clientId: string;
  title: string;
  mode: PracticeMode;
  examSlug?: string | null;
  setSlug?: string | null;
  questionIds: string[];
  answers: Record<string, number>;
  durationSeconds?: number | null;
}

export interface SavedAttempt {
  attempt: PracticeAttemptSummary;
  score: PracticeScore;
  /** true when this attempt had already been saved and nothing new was stored */
  duplicate: boolean;
}

/** The signed-in member's practice history and saved exams; each call only ever reaches the member's own data. */
export const memberPracticeService = {
  /** Scores the attempt on the server and saves it. */
  record: (input: AttemptInput) => send<SavedAttempt>('post', '/account/practice-attempts', input),
  list: (page = 0, size = 20) =>
    http.get<PageResponse<PracticeAttemptSummary>>('/account/practice-attempts', { params: { page, size } }).then((r) => r.data),
  get: (id: number) =>
    http.get<{ attempt: PracticeAttemptSummary; questionIds: string[]; answers: Record<string, number>; score: PracticeScore }>(
      `/account/practice-attempts/${id}`).then((r) => r.data),
  /** Question ids last answered wrongly, newest first. */
  revision: () => http.get<{ questionIds: string[] }>('/account/practice-attempts/revision').then((r) => r.data.questionIds),
  savedExams: () => http.get<string[]>('/account/saved-exams').then((r) => r.data),
  saveExam: (slug: string) => send<string[]>('put', `/account/saved-exams/${encodeURIComponent(slug)}`),
  removeExam: (slug: string) => send<string[]>('delete', `/account/saved-exams/${encodeURIComponent(slug)}`),
  mergeSavedExams: (slugs: string[]) => send<string[]>('post', '/account/saved-exams/merge', { slugs }),
  /** Latest attempts (newest first) with topic scores and per-question outcomes. */
  history: (limit = 200) =>
    http.get<PracticeHistoryItem[]>('/account/practice-history', { params: { limit } }).then((r) => r.data),
  /** Bookmarked question ids ("set/question"), newest first. */
  bookmarks: () => http.get<string[]>('/account/bookmarks').then((r) => r.data),
  addBookmark: (id: string) => send<string[]>('put', `/account/bookmarks/${bookmarkPath(id)}`),
  removeBookmark: (id: string) => send<string[]>('delete', `/account/bookmarks/${bookmarkPath(id)}`),
  mergeBookmarks: (questionIds: string[]) => send<string[]>('post', '/account/bookmarks/merge', { questionIds }),
};

/** "set-slug/question-id" → "set-slug/question-id" with each part encoded (the slash separates two path variables). */
function bookmarkPath(id: string): string {
  const [set, question] = id.split('/');
  return `${encodeURIComponent(set)}/${encodeURIComponent(question ?? '')}`;
}

/**
 * Starts "Continue with Google". This is a full-page navigation, not an API call: the server redirects to Google and,
 * after Google sends the browser back, sets the session cookie and redirects to `next` (a path on this site).
 */
export function googleSignInUrl(next: string, remember = false): string {
  const params = new URLSearchParams({ next: safeNext(next) });
  if (remember) params.set('remember', '1');
  return `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1/account/oauth2/authorization/google?${params}`;
}

/**
 * Where to go after signing in: only a path on this site. Anything else (other origins, protocol-relative "//host",
 * backslash tricks, javascript: URLs) falls back to the default.
 */
export function safeNext(next: string | null | undefined, fallback = '/account'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\') || /[\r\n]/.test(next)) return fallback;
  try {
    const url = new URL(next, 'https://isf.invalid');
    return url.origin === 'https://isf.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
