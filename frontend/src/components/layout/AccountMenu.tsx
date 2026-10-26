import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMember } from '../../hooks/useMember';
import { Avatar } from '../common/Avatar';

const ITEMS = [
  { to: '/account', label: 'My profile' },
  { to: '/saved', label: 'Saved schools' },
  { to: '/compare', label: 'School comparison' },
  { to: '/exams/calendar?saved=1', label: 'Exam favourites' },
  { to: '/account#pw-h', label: 'Account settings' },
];

/**
 * Header account control. While the session is being checked it shows a neutral placeholder, so no private details
 * appear before the server confirms the session. The menu follows the WAI-ARIA menu button pattern.
 */
export function AccountMenu() {
  const { status, account, signOut, setNotice } = useMember();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !buttonRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  if (status === 'loading') return <span className="inline-block h-9 w-9" aria-hidden />;

  if (status === 'signedOut' || !account) {
    const next = `${location.pathname}${location.search}`;
    const withNext = next.startsWith('/signin') || next.startsWith('/register') ? '' : `?next=${encodeURIComponent(next)}`;
    return (
      <span className="flex items-center gap-1">
        <Link to={`/signin${withNext}`} className="btn-ghost whitespace-nowrap rounded-full px-3 text-sm font-semibold">Sign in</Link>
        <Link to={`/register${withNext}`} className="btn-secondary hidden whitespace-nowrap rounded-full px-3 text-sm 2xl:inline-flex">Create account</Link>
      </span>
    );
  }

  const items = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  const onMenuKey = (e: KeyboardEvent) => {
    const list = items();
    const i = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); list[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); list[list.length - 1]?.focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); buttonRef.current?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  const doSignOut = async () => {
    setOpen(false);
    try {
      await signOut();
      setNotice('You have signed out.');
    } catch {
      setNotice('You have been signed out on this device.');
    }
    navigate('/', { replace: true });
  };

  return (
    <div className="relative">
      <button ref={buttonRef} type="button" aria-haspopup="menu" aria-expanded={open} aria-controls="account-menu"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); } }}
        className="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-slate-100">
        <Avatar name={account.displayName} />
        <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-ink 2xl:inline">{account.displayName}</span>
        <span className="sr-only">Account menu for {account.displayName}</span>
      </button>
      {open && (
        <div ref={menuRef} id="account-menu" role="menu" aria-label="Account" onKeyDown={onMenuKey}
          className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <div className="border-b border-slate-100 px-3 py-2" role="none">
            <p className="truncate text-sm font-semibold text-ink">{account.displayName}</p>
            <p className="truncate text-xs text-slate-500">{account.email}</p>
          </div>
          {ITEMS.map((item) => (
            <Link key={item.to} to={item.to} role="menuitem" tabIndex={-1} onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
              {item.label}
            </Link>
          ))}
          <button type="button" role="menuitem" tabIndex={-1} onClick={() => void doSignOut()}
            className="mt-1 block w-full rounded-lg border-t border-slate-100 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

/** Account links for the mobile menu. */
export function MobileAccountLinks() {
  const { status, account, signOut, setNotice } = useMember();
  const navigate = useNavigate();
  if (status !== 'signedIn' || !account) {
    return status === 'loading' ? null : (
      <div className="col-span-2 mt-2 flex gap-2 border-t border-slate-100 pt-3">
        <Link to="/signin" className="btn-secondary flex-1 justify-center">Sign in</Link>
        <Link to="/register" className="btn-primary flex-1 justify-center">Create account</Link>
      </div>
    );
  }
  return (
    <div className="col-span-2 mt-2 border-t border-slate-100 pt-3">
      <p className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Signed in as {account.displayName}</p>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {ITEMS.slice(0, 4).map((item) => (
          <Link key={item.to} to={item.to} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">{item.label}</Link>
        ))}
        <button type="button" className="rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={async () => { await signOut().catch(() => undefined); setNotice('You have signed out.'); navigate('/', { replace: true }); }}>
          Sign out
        </button>
      </div>
    </div>
  );
}
