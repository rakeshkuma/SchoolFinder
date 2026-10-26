import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import { savedExams, savedSchools, useLocalList } from '../hooks/usePersonal';
import { accountService, googleSignInUrl, safeNext } from '../services/accountApi';
import { ApiError } from '../services/http';
import { locationService } from '../services/publicApi';

// --- shared pieces ---------------------------------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MIN = 10;
const PASSWORD_MAX = 64;

type Errors = Record<string, string>;

/** Server field errors (by field name) merged over client ones. */
function fieldErrorsFrom(e: unknown): Errors {
  return e instanceof ApiError ? Object.fromEntries(e.fieldErrors.map((f) => [f.field, capitalise(f.message)])) : {};
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`;
  if (password.length > PASSWORD_MAX) return `Use at most ${PASSWORD_MAX} characters.`;
  return null;
}

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-slate-600">{footer}</div>}
        <p className="mt-6 text-center text-sm"><Link to="/" className="link">← Back to India School Finder</Link></p>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: ReactNode; children: (id: string, describedBy?: string) => ReactNode }) {
  const id = useId();
  const describedBy = [error ? `${id}-err` : null, hint ? `${id}-hint` : null].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children(id, describedBy)}
      {hint && !error && <p id={`${id}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} className="field-error mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
}

function PasswordInput({ id, value, onChange, describedBy, autoComplete, invalid }: {
  id: string; value: string; onChange: (v: string) => void; describedBy?: string; autoComplete: string; invalid: boolean;
}) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input id={id} type={shown ? 'text' : 'password'} className="input w-full pr-20" value={value} autoComplete={autoComplete}
        aria-invalid={invalid || undefined} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => setShown((s) => !s)} aria-pressed={shown} aria-controls={id}
        className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-brand-700 hover:text-brand-800">
        {shown ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

function Alert({ tone, children }: { tone: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const styles = { error: 'bg-red-50 text-red-800', success: 'bg-emerald-50 text-emerald-800', info: 'bg-brand-50 text-brand-900', warning: 'bg-amber-50 text-amber-900' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${styles[tone]}`}>{children}</div>;
}

function EmailUnavailable() {
  const { config } = useMember();
  if (!config || config.emailDeliveryMode === 'smtp') return null;
  if (config.emailDeliveryMode === 'dev-outbox') {
    return <Alert tone="info">Development server: emails are not sent. They are kept in the local outbox for testing.</Alert>;
  }
  return <Alert tone="warning">Email delivery is not set up on this server yet, so verification and password-reset emails cannot be sent.</Alert>;
}

/**
 * "Continue with Google", shown only when the server reports a configured Google client. A plain link: the server
 * redirects to Google and back, so no Google script runs on this site.
 */
function GoogleButton({ next, remember = false, label = 'Continue with Google' }: { next: string; remember?: boolean; label?: string }) {
  const { config } = useMember();
  if (!config?.googleSignInEnabled) return null;
  return (
    <a href={googleSignInUrl(next, remember)}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-400 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
      {label}
    </a>
  );
}

function OrDivider() {
  const { config } = useMember();
  if (!config?.googleSignInEnabled) return null;
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-medium uppercase tracking-wide text-slate-500" aria-hidden="true">
      <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
}

const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: 'Google sign-in was cancelled. You can try again or use your email and password.',
  unverified: 'Google has not verified the email address of that Google account, so we cannot use it to sign you in.',
  mismatch: 'This email address is already linked to a different Google account. Sign in with that Google account or with your password.',
  failed: 'Google sign-in did not complete. Please try again.',
};

// --- sign in ---------------------------------------------------------------------------------------------------------

export function SignInPage() {
  useDocumentTitle('Sign in');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { status, config, setAccount, setNotice } = useMember();
  const next = safeNext(params.get('next'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<{ code: string; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [resent, setResent] = useState(false);
  const googleError = GOOGLE_ERRORS[params.get('google') ?? ''];

  if (status === 'signedIn') return <Navigate to={next} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: Errors = {};
    if (!email.trim()) errs.email = 'Enter your email address.';
    else if (!EMAIL_RE.test(email.trim())) errs.email = 'Enter an email address like name@example.com.';
    if (!password) errs.password = 'Enter your password.';
    setErrors(errs);
    setFormError(null);
    setResent(false);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const account = await accountService.login(email.trim(), password, remember);
      setAccount(account);
      setNotice(`Welcome back, ${account.displayName}.`);
      navigate(next, { replace: true });
    } catch (err) {
      setPassword('');
      if (err instanceof ApiError && err.code) setFormError({ code: err.code, message: err.message });
      else setFormError({ code: 'ERROR', message: err instanceof ApiError && err.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'We could not sign you in right now. Please try again.' });
      setErrors(fieldErrorsFrom(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    try {
      await accountService.resendVerification(email.trim());
      setResent(true);
    } catch {
      setFormError({ code: 'ERROR', message: 'Could not send a new link. Please try again later.' });
    }
  };

  return (
    <AuthShell title="Sign in" subtitle="Save schools, comparisons and exams to your account."
      footer={<>New to India School Finder? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(next)}` : ''}`} className="link">Create an account</Link></>}>
      {googleError && !formError && <div className="mb-4"><Alert tone="error">{googleError}</Alert></div>}
      <GoogleButton next={next} remember={remember} />
      <OrDivider />
      <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
        {formError && (
          <Alert tone="error">
            {formError.message}
            {formError.code === 'EMAIL_NOT_VERIFIED' && !resent && (
              <button type="button" className="ml-1 font-semibold underline" onClick={() => void resend()}>Send a new link</button>
            )}
          </Alert>
        )}
        {resent && <Alert tone="success">If that address needs confirming, a new link is on its way. Check your inbox.</Alert>}
        <Field label="Email address" error={errors.email}>
          {(id, d) => <input id={id} type="email" className="input w-full" autoComplete="email" value={email}
            aria-invalid={!!errors.email || undefined} aria-describedby={d} onChange={(e) => setEmail(e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(id, d) => <PasswordInput id={id} value={password} onChange={setPassword} describedBy={d} autoComplete="current-password" invalid={!!errors.password} />}
        </Field>
        <div className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in
          </label>
          <Link to="/forgot-password" className="link">Forgot password?</Link>
        </div>
        <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-xs text-slate-500">“Keep me signed in” keeps this device signed in for up to 30 days{config?.googleSignInEnabled ? ', also when you continue with Google' : ''}. Do not use it on a shared computer.</p>
        {config?.googleSignInEnabled && (
          <p className="text-xs text-slate-500">Continuing with Google creates an account if you do not have one, and means you agree to the <Link to="/terms" className="link">Terms</Link> and <Link to="/privacy" className="link">Privacy Policy</Link> and confirm you are 18 or older.</p>
        )}
      </form>
    </AuthShell>
  );
}

// --- register --------------------------------------------------------------------------------------------------------

export function RegisterPage() {
  useDocumentTitle('Create an account');
  const [params] = useSearchParams();
  const { status, config } = useMember();
  const states = useApi(() => locationService.states(), []);
  const [form, setForm] = useState({ displayName: '', email: '', password: '', confirm: '', acceptTerms: false, stateCode: '', city: '' });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  if (status === 'signedIn') return <Navigate to={safeNext(params.get('next'))} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: Errors = {};
    if (!form.displayName.trim()) errs.displayName = 'Enter your name.';
    if (!EMAIL_RE.test(form.email.trim())) errs.email = 'Enter an email address like name@example.com.';
    const pw = passwordProblem(form.password);
    if (pw) errs.password = pw;
    if (form.confirm !== form.password) errs.confirm = 'The passwords do not match.';
    if (!form.acceptTerms) errs.acceptTerms = 'Please accept the Terms of Service and Privacy Policy.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await accountService.register({
        displayName: form.displayName.trim(), email: form.email.trim(), password: form.password, acceptTerms: true,
        stateCode: form.stateCode || undefined, city: form.city.trim() || undefined,
      });
      setSentTo(form.email.trim());
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(err instanceof ApiError && err.status === 429 ? 'Too many sign-ups from this connection. Please try again later.'
        : err instanceof ApiError && err.fieldErrors.length ? 'Please correct the highlighted fields.' : 'We could not create your account right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <AuthShell title="Check your email" subtitle={<>We sent a confirmation link to <strong>{sentTo}</strong>.</>}>
        <div className="space-y-4 text-sm text-slate-700">
          <EmailUnavailable />
          <p>Open the link to confirm your address, then sign in. The link works once and expires in 24 hours.</p>
          <p>Nothing arrived? Check your spam folder, or <ResendLink email={sentTo} />.</p>
          <p>If this address already has an account, we have emailed it instead — you can <Link to="/signin" className="link">sign in</Link> or <Link to="/forgot-password" className="link">reset your password</Link>.</p>
          <Link to="/signin" className="btn-primary w-full justify-center">Go to sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create an account" subtitle="Free. We only ask for what an account needs."
      footer={<>Already have an account? <Link to="/signin" className="link">Sign in</Link></>}>
      <GoogleButton next={safeNext(params.get('next'))} label="Sign up with Google" />
      {config?.googleSignInEnabled && (
        <p className="mt-2 text-xs text-slate-500">By signing up with Google you agree to the <Link to="/terms" className="link">Terms of Service</Link> and <Link to="/privacy" className="link">Privacy Policy</Link> and confirm you are 18 or older. We receive only your name, email address and Google account ID.</p>
      )}
      <OrDivider />
      <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
        <EmailUnavailable />
        {formError && <Alert tone="error">{formError}</Alert>}
        <Field label="Your name" error={errors.displayName}>
          {(id, d) => <input id={id} className="input w-full" autoComplete="name" maxLength={80} value={form.displayName}
            aria-invalid={!!errors.displayName || undefined} aria-describedby={d} onChange={(e) => set('displayName', e.target.value)} />}
        </Field>
        <Field label="Email address" error={errors.email} hint="Used to sign in and for account emails only — never for marketing.">
          {(id, d) => <input id={id} type="email" className="input w-full" autoComplete="email" maxLength={254} value={form.email}
            aria-invalid={!!errors.email || undefined} aria-describedby={d} onChange={(e) => set('email', e.target.value)} />}
        </Field>
        <Field label="Password" error={errors.password} hint={config?.passwordPolicy ?? `At least ${PASSWORD_MIN} characters.`}>
          {(id, d) => <PasswordInput id={id} value={form.password} onChange={(v) => set('password', v)} describedBy={d} autoComplete="new-password" invalid={!!errors.password} />}
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          {(id, d) => <PasswordInput id={id} value={form.confirm} onChange={(v) => set('confirm', v)} describedBy={d} autoComplete="new-password" invalid={!!errors.confirm} />}
        </Field>
        <details className="rounded-xl border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-ink">Optional: your area</summary>
          <p className="mt-2 text-xs text-slate-500">Helps us suggest schools near you. You can change or remove it later.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="State or UT">
              {(id) => (
                <select id={id} className="input w-full" value={form.stateCode} onChange={(e) => set('stateCode', e.target.value)}>
                  <option value="">Not set</option>
                  {(states.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                </select>
              )}
            </Field>
            <Field label="City">
              {(id) => <input id={id} className="input w-full" autoComplete="address-level2" maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} />}
            </Field>
          </div>
        </details>
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300" checked={form.acceptTerms}
              aria-invalid={!!errors.acceptTerms || undefined} aria-describedby={errors.acceptTerms ? 'terms-err' : undefined}
              onChange={(e) => set('acceptTerms', e.target.checked)} />
            <span>I agree to the <Link to="/terms" className="link" target="_blank">Terms of Service</Link> and <Link to="/privacy" className="link" target="_blank">Privacy Policy</Link>, and I am 18 or older.</span>
          </label>
          {errors.acceptTerms && <p id="terms-err" className="field-error mt-1 text-sm text-red-700">{errors.acceptTerms}</p>}
        </div>
        <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  );
}

function ResendLink({ email }: { email: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  if (state === 'sent') return <span className="font-medium text-emerald-700">a new link has been sent</span>;
  return (
    <button type="button" className="link" disabled={state === 'busy'} onClick={async () => {
      setState('busy');
      try { await accountService.resendVerification(email); setState('sent'); } catch { setState('error'); }
    }}>{state === 'error' ? 'try sending it again' : 'send it again'}</button>
  );
}

// --- verify email ----------------------------------------------------------------------------------------------------

export function VerifyEmailPage() {
  useDocumentTitle('Confirm your email');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'working' | 'done' | 'failed'>('working');
  const [message, setMessage] = useState('');
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // the link is single-use: never call twice (e.g. React strict mode)
    started.current = true;
    if (!token) { setState('failed'); setMessage('This link is incomplete. Open the link from your email again.'); return; }
    accountService.verifyEmail(token).then(() => setState('done')).catch((e) => {
      setState('failed');
      setMessage(e instanceof ApiError ? e.message : 'We could not confirm your email right now. Please try again.');
    });
  }, [token]);
  return (
    <AuthShell title="Confirm your email">
      {state === 'working' && <Spinner label="Confirming…" />}
      {state === 'done' && (
        <div className="space-y-4">
          <Alert tone="success">Your email address is confirmed. You can now sign in.</Alert>
          <Link to="/signin" className="btn-primary w-full justify-center">Sign in</Link>
        </div>
      )}
      {state === 'failed' && (
        <div className="space-y-4 text-sm">
          <Alert tone="error">{message}</Alert>
          <p>Sign in with your email and password and we will offer to send a new link.</p>
          <Link to="/signin" className="btn-secondary w-full justify-center">Go to sign in</Link>
        </div>
      )}
    </AuthShell>
  );
}

// --- forgot / reset password -----------------------------------------------------------------------------------------

export function ForgotPasswordPage() {
  useDocumentTitle('Reset your password');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!EMAIL_RE.test(email.trim())) { setError('Enter an email address like name@example.com.'); return; }
    setError(null);
    setBusy(true);
    try {
      await accountService.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 429 ? 'Too many requests. Please try again later.' : 'We could not send the email right now. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Reset your password" subtitle="We will email you a link to choose a new password."
      footer={<>Remembered it? <Link to="/signin" className="link">Sign in</Link></>}>
      {sent ? (
        <div className="space-y-3 text-sm text-slate-700">
          <EmailUnavailable />
          <Alert tone="success">If an account uses <strong>{email.trim()}</strong>, a reset link is on its way. It works once and expires in 30 minutes.</Alert>
          <p>Nothing arrived? Check your spam folder or try again in a few minutes.</p>
        </div>
      ) : (
        <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
          <EmailUnavailable />
          <Field label="Email address" error={error ?? undefined}>
            {(id, d) => <input id={id} type="email" className="input w-full" autoComplete="email" value={email}
              aria-invalid={!!error || undefined} aria-describedby={d} onChange={(e) => setEmail(e.target.value)} />}
          </Field>
          <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  useDocumentTitle('Choose a new password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { config, setNotice, refresh } = useMember();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const errs: Errors = {};
    const pw = passwordProblem(password);
    if (pw) errs.newPassword = pw;
    if (confirm !== password) errs.confirm = 'The passwords do not match.';
    setErrors(errs);
    setFormError(null);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await accountService.resetPassword(token, password);
      await refresh(); // every session was ended, including this one
      setNotice('Your password has been changed. Please sign in with your new password.');
      navigate('/signin', { replace: true });
    } catch (err) {
      setErrors(fieldErrorsFrom(err));
      setFormError(err instanceof ApiError && !err.fieldErrors.length ? err.message : null);
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthShell title="Choose a new password" subtitle="You will be signed out on every device and can then sign in with the new password.">
      {!token ? <Alert tone="error">This link is incomplete. Open the link from your email again, or <Link to="/forgot-password" className="underline">request a new one</Link>.</Alert> : (
        <form noValidate onSubmit={submit} className="space-y-4" aria-busy={busy}>
          {formError && <Alert tone="error">{formError} <Link to="/forgot-password" className="underline">Request a new link</Link>.</Alert>}
          <Field label="New password" error={errors.newPassword} hint={config?.passwordPolicy}>
            {(id, d) => <PasswordInput id={id} value={password} onChange={setPassword} describedBy={d} autoComplete="new-password" invalid={!!errors.newPassword} />}
          </Field>
          <Field label="Confirm new password" error={errors.confirm}>
            {(id, d) => <PasswordInput id={id} value={confirm} onChange={setConfirm} describedBy={d} autoComplete="new-password" invalid={!!errors.confirm} />}
          </Field>
          <button type="submit" className="btn-primary w-full justify-center" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
        </form>
      )}
    </AuthShell>
  );
}

// --- protected pages -------------------------------------------------------------------------------------------------

/** Shows its children only to a signed-in member; otherwise sends them to sign in and back here afterwards. */
export function RequireMember({ children }: { children: ReactNode }) {
  const { status } = useMember();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Checking your session…" />;
  if (status === 'signedOut') {
    return <Navigate to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  return <>{children}</>;
}

export function AccountPage() {
  return <RequireMember><AccountSettings /></RequireMember>;
}

function AccountSettings() {
  useDocumentTitle('My account');
  const { account, setAccount, signOut, setNotice } = useMember();
  const navigate = useNavigate();
  const states = useApi(() => locationService.states(), []);
  const savedSchoolCount = useLocalList(savedSchools).length;
  const savedExamCount = useLocalList(savedExams).length;
  const [profile, setProfile] = useState({ displayName: account?.displayName ?? '', stateCode: account?.stateCode ?? '', city: account?.city ?? '' });
  const [profileMsg, setProfileMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [profileErrors, setProfileErrors] = useState<Errors>({});
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwErrors, setPwErrors] = useState<Errors>({});
  const [pwMsg, setPwMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);
  const [setPwState, setSetPwState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');

  if (!account) return null;

  const sendSetPasswordLink = async () => {
    setSetPwState('busy');
    try { await accountService.forgotPassword(account.email); setSetPwState('sent'); } catch { setSetPwState('error'); }
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.displayName.trim()) { setProfileErrors({ displayName: 'Enter your name.' }); return; }
    setBusy('profile'); setProfileErrors({}); setProfileMsg(null);
    try {
      setAccount(await accountService.updateProfile({ displayName: profile.displayName.trim(), stateCode: profile.stateCode || null, city: profile.city.trim() || null }));
      setProfileMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setProfileErrors(fieldErrorsFrom(err));
      setProfileMsg({ tone: 'error', text: 'Could not save your profile. Please try again.' });
    } finally { setBusy(null); }
  };

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    const errs: Errors = {};
    if (!pw.current) errs.currentPassword = 'Enter your current password.';
    const p = passwordProblem(pw.next);
    if (p) errs.newPassword = p;
    if (pw.confirm !== pw.next) errs.confirm = 'The passwords do not match.';
    setPwErrors(errs); setPwMsg(null);
    if (Object.keys(errs).length) return;
    setBusy('password');
    try {
      await accountService.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', confirm: '' });
      setPwMsg({ tone: 'success', text: 'Password changed. You have been signed out on your other devices.' });
    } catch (err) {
      setPwErrors(fieldErrorsFrom(err));
      setPwMsg({ tone: 'error', text: 'Your password was not changed.' });
    } finally { setBusy(null); }
  };

  const doSignOut = async () => {
    setBusy('signout');
    try { await signOut(); } finally { setBusy(null); }
    setNotice('You have signed out.');
    navigate('/', { replace: true });
  };

  const deleteAccount = async (e: FormEvent) => {
    e.preventDefault();
    if (!deletePw) { setDeleteError(account.hasPassword ? 'Enter your password to confirm.' : 'Type your email address to confirm.'); return; }
    setBusy('delete'); setDeleteError(null); setReauth(false);
    try {
      await accountService.deleteAccount(account.hasPassword ? { password: deletePw } : { confirmEmail: deletePw });
      await signOut().catch(() => undefined);
      setNotice('Your account has been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REAUTH_REQUIRED') { setReauth(true); setDeleteError(err.message); return; }
      const fields = fieldErrorsFrom(err);
      setDeleteError(fields.password ?? fields.confirmEmail ?? 'Your account was not deleted. Please try again.');
    } finally { setBusy(null); }
  };

  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={account.displayName} size="lg" />
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{account.displayName}</h1>
            <p className="text-sm text-slate-600">{account.email} · {account.emailVerified ? <span className="text-emerald-700">email confirmed</span> : 'email not confirmed'}</p>
          </div>
        </div>
        <button type="button" className="btn-secondary" onClick={() => void doSignOut()} disabled={busy === 'signout'}>{busy === 'signout' ? 'Signing out…' : 'Sign out'}</button>
      </div>

      <section className="card p-5 text-sm" aria-labelledby="saved-h">
        <h2 id="saved-h" className="font-display text-lg font-bold text-ink">Your saved items</h2>
        <ul className="mt-2 space-y-1">
          <li><Link to="/saved" className="link">Saved schools ({savedSchoolCount})</Link></li>
          <li><Link to="/compare" className="link">School comparison</Link></li>
          <li><Link to="/exams/calendar?saved=1" className="link">Saved exams ({savedExamCount})</Link></li>
        </ul>
        <p className="mt-2 text-xs text-slate-500">These are kept in this browser for now. Saving them to your account so they follow you to other devices is coming next.</p>
      </section>

      <section className="card p-5" aria-labelledby="profile-h">
        <h2 id="profile-h" className="font-display text-lg font-bold text-ink">Profile</h2>
        <form noValidate onSubmit={saveProfile} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name" error={profileErrors.displayName}>
              {(id, d) => <input id={id} className="input w-full" maxLength={80} value={profile.displayName} aria-describedby={d}
                aria-invalid={!!profileErrors.displayName || undefined} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} />}
            </Field>
          </div>
          <Field label="State or UT (optional)">
            {(id) => (
              <select id={id} className="input w-full" value={profile.stateCode} onChange={(e) => setProfile({ ...profile, stateCode: e.target.value })}>
                <option value="">Not set</option>
                {(states.data ?? []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
            )}
          </Field>
          <Field label="City (optional)">
            {(id) => <input id={id} className="input w-full" maxLength={80} value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />}
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
            {profileMsg && <span role="status" className={profileMsg.tone === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>{profileMsg.text}</span>}
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">Your email address is your sign-in and cannot be changed here.</p>
        </form>
      </section>

      <section className="card p-5" aria-labelledby="pw-h">
        <h2 id="pw-h" className="font-display text-lg font-bold text-ink">{account.hasPassword ? 'Change password' : 'Password'}</h2>
        {account.googleLinked && (
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800">Google</span>
            You can sign in with your Google account{account.hasPassword ? ' or with your email and password' : ''}.
          </p>
        )}
        {!account.hasPassword ? (
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p>You signed up with Google, so this account has no password. To also sign in with your email address, set a password through a link we email to <strong>{account.email}</strong>.</p>
            <EmailUnavailable />
            {setPwState === 'sent'
              ? <Alert tone="success">Check your inbox for a link to set your password. It works once and expires in 30 minutes.</Alert>
              : <button type="button" className="btn-secondary" disabled={setPwState === 'busy'} onClick={() => void sendSetPasswordLink()}>{setPwState === 'busy' ? 'Sending…' : 'Email me a link to set a password'}</button>}
            {setPwState === 'error' && <Alert tone="error">The link could not be sent. Please try again later.</Alert>}
          </div>
        ) : (
        <form noValidate onSubmit={changePassword} className="mt-4 space-y-4">
          {pwMsg && <Alert tone={pwMsg.tone}>{pwMsg.text}</Alert>}
          <Field label="Current password" error={pwErrors.currentPassword}>
            {(id, d) => <PasswordInput id={id} value={pw.current} onChange={(v) => setPw({ ...pw, current: v })} describedBy={d} autoComplete="current-password" invalid={!!pwErrors.currentPassword} />}
          </Field>
          <Field label="New password" error={pwErrors.newPassword}>
            {(id, d) => <PasswordInput id={id} value={pw.next} onChange={(v) => setPw({ ...pw, next: v })} describedBy={d} autoComplete="new-password" invalid={!!pwErrors.newPassword} />}
          </Field>
          <Field label="Confirm new password" error={pwErrors.confirm}>
            {(id, d) => <PasswordInput id={id} value={pw.confirm} onChange={(v) => setPw({ ...pw, confirm: v })} describedBy={d} autoComplete="new-password" invalid={!!pwErrors.confirm} />}
          </Field>
          <button type="submit" className="btn-primary" disabled={busy === 'password'}>{busy === 'password' ? 'Changing…' : 'Change password'}</button>
        </form>
        )}
      </section>

      <section className="card border-red-200 p-5" aria-labelledby="del-h">
        <h2 id="del-h" className="font-display text-lg font-bold text-ink">Delete account</h2>
        <p className="mt-1 text-sm text-slate-600">
          Deletes your account, name, email and preferences straight away and signs you out everywhere. Schools and exams saved in this
          browser stay on this device. This cannot be undone.
        </p>
        {!deleting ? (
          <button type="button" className="btn-danger mt-4" onClick={() => setDeleting(true)}>Delete my account…</button>
        ) : (
          <form noValidate onSubmit={deleteAccount} className="mt-4 space-y-3">
            {account.hasPassword ? (
              <Field label="Enter your password to confirm" error={deleteError ?? undefined}>
                {(id, d) => <PasswordInput id={id} value={deletePw} onChange={setDeletePw} describedBy={d} autoComplete="current-password" invalid={!!deleteError} />}
              </Field>
            ) : (
              <Field label="Type your email address to confirm" error={deleteError ?? undefined}
                hint="For your security this works only within 10 minutes of signing in with Google.">
                {(id, d) => <input id={id} type="email" className="input w-full" autoComplete="off" value={deletePw}
                  aria-invalid={!!deleteError || undefined} aria-describedby={d} onChange={(e) => setDeletePw(e.target.value)} />}
              </Field>
            )}
            {reauth && <GoogleButton next="/account" label="Sign in with Google again" />}
            <div className="flex gap-2">
              <button type="submit" className="btn-danger" disabled={busy === 'delete'}>{busy === 'delete' ? 'Deleting…' : 'Delete account permanently'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setDeleting(false); setDeletePw(''); setDeleteError(null); }}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}


