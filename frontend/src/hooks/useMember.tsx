import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { accountService, type Account, type AccountConfig } from '../services/accountApi';
import { ApiError } from '../services/http';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface MemberContextValue {
  status: Status;
  account: Account | null;
  config: AccountConfig | null;
  /** Re-reads the session from the server (e.g. after sign-in or a profile change). */
  refresh: () => Promise<void>;
  setAccount: (account: Account) => void;
  signOut: () => Promise<void>;
  /** A short message shown once at the top of the page (e.g. "You have signed out."). */
  notice: string | null;
  setNotice: (message: string | null) => void;
}

const MemberContext = createContext<MemberContextValue | null>(null);

/**
 * Member session state, always taken from the server: nothing is cached in browser storage, so a signed-out or
 * expired session can never look signed in after a refresh. Until the server answers, status is "loading" and no
 * account details are shown.
 */
export function MemberProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [account, setAccountState] = useState<Account | null>(null);
  const [config, setConfig] = useState<AccountConfig | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const me = await accountService.me();
      setAccountState(me);
      setStatus('signedIn');
    } catch (e) {
      setAccountState(null);
      // Network or server trouble also shows the signed-out state; nothing private is displayed.
      setStatus('signedOut');
      if (!(e instanceof ApiError) || e.status !== 401) console.warn('Could not check the session');
    }
  }, []);

  useEffect(() => {
    void refresh();
    accountService.config().then(setConfig).catch(() => setConfig(null));
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await accountService.logout();
    } finally {
      // Clear local state whatever the server said; a later refresh confirms the session is gone.
      setAccountState(null);
      setStatus('signedOut');
    }
  }, []);

  const setAccount = useCallback((a: Account) => {
    setAccountState(a);
    setStatus('signedIn');
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const value = useMemo(() => ({ status, account, config, refresh, setAccount, signOut, notice, setNotice }),
    [status, account, config, refresh, setAccount, signOut, notice]);
  return <MemberContext.Provider value={value}>{children}</MemberContext.Provider>;
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error('useMember must be used inside MemberProvider');
  return ctx;
}
