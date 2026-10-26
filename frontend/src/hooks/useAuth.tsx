import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/adminApi';
import { setUnauthorizedListener, tokenStore } from '../services/http';
import type { AdminRole } from '../types/api';

interface Session {
  username: string;
  role: AdminRole;
  expiresAt: number;
}

interface AuthContextValue {
  session: Session | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const SESSION_KEY = 'dsf.admin.session';
const AuthContext = createContext<AuthContextValue | null>(null);

function readSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw || !tokenStore.get()) return null;
    const session = JSON.parse(raw) as Session;
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(readSession);

  const logout = useCallback(() => {
    tokenStore.clear();
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      /* ignore */
    }
    setSession(null);
  }, []);

  useEffect(() => {
    setUnauthorizedListener(logout);
    return () => setUnauthorizedListener(null);
  }, [logout]);

  // Log out exactly when the short-lived token expires.
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(logout, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [session, logout]);

  const login = useCallback(async (username: string, password: string) => {
    const token = await authService.login(username, password);
    tokenStore.set(token.accessToken);
    const next: Session = {
      username: token.username,
      role: token.role,
      expiresAt: Date.now() + token.expiresInSeconds * 1000,
    };
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSession(next);
  }, []);

  const value = useMemo(
    () => ({ session, login, logout, isAdmin: session?.role === 'ADMIN' }),
    [session, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
