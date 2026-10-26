import { http } from './http';

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

async function send<T>(method: 'post' | 'patch' | 'delete', path: string, body?: unknown): Promise<T> {
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
