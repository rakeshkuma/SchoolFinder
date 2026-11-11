import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Avatar } from '../components/common/Avatar';
import { GoogleButton } from '../components/common/GoogleButton';
import { Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import { savedExams, savedSchools, useLocalList } from '../hooks/usePersonal';
import { accountService, safeNext } from '../services/accountApi';
import { ApiError } from '../services/http';
import { locationService } from '../services/publicApi';

// --- shared pieces ---------------------------------------------------------------------------------------------------

type Errors = Record<string, string>;

/** Server field errors (by field name). */
function fieldErrorsFrom(e: unknown): Errors {
  return e instanceof ApiError ? Object.fromEntries(e.fieldErrors.map((f) => [f.field, capitalise(f.message)])) : {};
}

const capitalise = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function AuthShell({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-10 sm:py-16">
      <div className="w-full max-w-md">
        <div className="card p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm"><Link to="/" className="link">← Back to SchoolDhundo</Link></p>
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

function Alert({ tone, children }: { tone: 'error' | 'success' | 'info' | 'warning'; children: ReactNode }) {
  const styles = { error: 'bg-red-50 text-red-800', success: 'bg-emerald-50 text-emerald-800', info: 'bg-brand-50 text-brand-900', warning: 'bg-amber-50 text-amber-900' };
  return <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-xl p-3 text-sm ${styles[tone]}`}>{children}</div>;
}

const GOOGLE_ERRORS: Record<string, string> = {
  cancelled: 'Google sign-in was cancelled. You can try again.',
  unverified: 'Google has not verified the email address of that Google account, so we cannot use it to sign you in.',
  mismatch: 'This email address is already linked to a different Google account. Sign in with that Google account.',
  failed: 'Google sign-in did not complete. Please try again.',
};

// --- sign in -----------------------------------------------------------------------------------------------------------

/** Sign in with Google: the only way in. Google creates the account on first sign-in, so there is nothing to fill in. */
export function SignInPage() {
  const [params] = useSearchParams();
  const { status, config } = useMember();
  const next = safeNext(params.get('next'));
  const [remember, setRemember] = useState(false);
  const googleError = GOOGLE_ERRORS[params.get('google') ?? ''];
  useDocumentTitle('Sign in');

  if (status === 'signedIn') return <Navigate to={next} replace />;

  return (
    <AuthShell title="Sign in" subtitle="Save schools, comparisons and exams to your account.">
      {googleError && <div className="mb-4"><Alert tone="error">{googleError}</Alert></div>}
      {config && !config.googleSignInEnabled ? (
        <Alert tone="warning">Sign-in is not available right now. Please try again later.</Alert>
      ) : (
        <div className="space-y-4">
          <GoogleButton next={next} remember={remember} />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Keep me signed in on this device
          </label>
          <p className="text-xs text-slate-500">
            New here? Google creates your account, so there is nothing to fill in. By continuing you agree to the <Link to="/terms" className="link">Terms</Link> and <Link to="/privacy" className="link">Privacy Policy</Link>. If you are under 18, please ask a parent or guardian first. Do not keep a shared computer signed in.
          </p>
        </div>
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
  const [profile, setProfile] = useState({ displayName: account?.displayName ?? '', stateCode: account?.stateCode ?? '', city: account?.city ?? '', mobile: account?.mobile ?? '' });
  const [profileMsg, setProfileMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [profileErrors, setProfileErrors] = useState<Errors>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reauth, setReauth] = useState(false);

  if (!account) return null;

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile.displayName.trim()) { setProfileErrors({ displayName: 'Enter your name.' }); return; }
    setBusy('profile'); setProfileErrors({}); setProfileMsg(null);
    try {
      setAccount(await accountService.updateProfile({ displayName: profile.displayName.trim(), stateCode: profile.stateCode || null, city: profile.city.trim() || null, mobile: profile.mobile.trim() || null }));
      setProfileMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setProfileErrors(fieldErrorsFrom(err));
      setProfileMsg({ tone: 'error', text: 'Could not save your profile. Please try again.' });
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
    if (!confirmEmail.trim()) { setDeleteError('Type your email address to confirm.'); return; }
    setBusy('delete'); setDeleteError(null); setReauth(false);
    try {
      await accountService.deleteAccount(confirmEmail.trim());
      await signOut().catch(() => undefined);
      setNotice('Your account has been deleted.');
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'REAUTH_REQUIRED') { setReauth(true); setDeleteError(err.message); return; }
      const fields = fieldErrorsFrom(err);
      setDeleteError(fields.confirmEmail ?? 'Your account was not deleted. Please try again.');
    } finally { setBusy(null); }
  };

  return (
    <div className="container-page max-w-3xl space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={account.displayName} pictureUrl={account.pictureUrl} size="lg" />
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
          <Field label="Mobile number (optional)" error={profileErrors.mobile}>
            {(id, d) => <input id={id} type="tel" inputMode="tel" className="input w-full" autoComplete="tel-national" maxLength={16} value={profile.mobile} aria-describedby={d}
              aria-invalid={!!profileErrors.mobile || undefined} onChange={(e) => setProfile({ ...profile, mobile: e.target.value })} />}
          </Field>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" className="btn-primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Saving…' : 'Save profile'}</button>
            {profileMsg && <span role="status" className={profileMsg.tone === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-red-700'}>{profileMsg.text}</span>}
          </div>
          <p className="text-xs text-slate-500 sm:col-span-2">Your email address is your sign-in and cannot be changed here.</p>
        </form>
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
            <Field label="Type your email address to confirm" error={deleteError ?? undefined}
              hint="For your security this works only within 10 minutes of signing in with Google.">
              {(id, d) => <input id={id} type="email" className="input w-full" autoComplete="off" value={confirmEmail}
                aria-invalid={!!deleteError || undefined} aria-describedby={d} onChange={(e) => setConfirmEmail(e.target.value)} />}
            </Field>
            {reauth && <GoogleButton next="/account" label="Sign in with Google again" />}
            <div className="flex gap-2">
              <button type="submit" className="btn-danger" disabled={busy === 'delete'}>{busy === 'delete' ? 'Deleting…' : 'Delete account permanently'}</button>
              <button type="button" className="btn-secondary" onClick={() => { setDeleting(false); setConfirmEmail(''); setDeleteError(null); }}>Cancel</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}


