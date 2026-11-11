import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '../common/States';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DesktopNav, MobileNav } from './MainNav';
import { ConsentBanner } from './ConsentBanner';
import { analyticsConfigured, initAnalytics, resetConsent, track, trackPageView } from '../../utils/analytics';
import { useMember } from '../../hooks/useMember';
import { usePracticeSync } from '../../hooks/usePracticeProgress';
import { savedSchools, useLocalList } from '../../hooks/usePersonal';
import { AccountMenu, MobileAccountLinks } from './AccountMenu';
import { Icon } from '../common/Icon';
import { CompareBar } from '../school/CompareBar';
import { CONTACT_EMAIL, CREATOR_INSTITUTE, CREATOR_NAME, DISCLAIMER } from '../../content/site';

const FOOTER: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Discover Schools',
    links: [
      { to: '/schools', label: 'Find Schools' },
      { to: '/states', label: 'Schools by State' },
      { to: '/cities', label: 'Schools by City' },
      { to: '/boarding', label: 'Boarding Schools' },
      { to: '/rankings', label: 'School Rankings' },
      { to: '/blog', label: 'Blogs' },
    ],
  },
  {
    title: 'Exam Preparation',
    links: [
      { to: '/exams', label: 'Entrance Exams' },
      { to: '/exams/practice/class10-maths-1', label: 'Class 10 Preparation' },
      { to: '/exams/practice/class12-maths-1', label: 'Class 12 Preparation' },
      { to: '/exams/practice', label: 'Mock Tests' },
      { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily Quiz' },
      { to: '/exams/resources?type=QUESTION_PAPER', label: 'Previous Year Papers' },
      { to: '/exams/leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    title: 'About',
    links: [
      { to: '/about', label: 'About SchoolDhundo' },
      { to: '/contact', label: 'Contact Us' },
      { to: '/contact?topic=LISTING', label: 'Submit School Information' },
      { to: '/contact?topic=CORRECTION', label: 'Report Incorrect Information' },
      { to: '/editorial-policy', label: 'Editorial Policy' },
      { to: '/corrections-policy', label: 'Corrections Policy' },
    ],
  },
];

/** React Router does not scroll to #fragments; wait for the target (pages load lazily) and scroll to it. */
function useScrollToHash() {
  const { hash, pathname, key } = useLocation();
  useEffect(() => {
    if (!hash) return undefined;
    let tries = 0;
    const timer = window.setInterval(() => {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el || ++tries > 40) {
        window.clearInterval(timer);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 75);
    return () => window.clearInterval(timer);
  }, [hash, pathname, key]);
}

/** Appears after scrolling down a screen or two. */
function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!show) return null;
  return (
    <button type="button" aria-label="Back to top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-lift ring-1 ring-slate-200 transition hover:bg-brand-600 hover:text-white sm:bottom-6">
      <Icon name="chevronDown" className="h-5 w-5 rotate-180" />
    </button>
  );
}

/**
 * The brand never wraps: the name stays on one line, and the tagline is shown only where it fits on one line too
 * (tablet widths; not on phones, nor beside the full desktop navigation).
 * `full` shows the tagline at every width (footer).
 */
function Logo({ light = false, full = false, compact = false }: { light?: boolean; full?: boolean; compact?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
      <span className={`whitespace-nowrap leading-none ${compact ? 'hidden min-[380px]:block' : ''}`}>
        <span className={`block font-display text-base font-extrabold tracking-tight sm:text-[17px] ${light ? 'text-white' : 'text-ink'}`}>
          SchoolDhundo
        </span>
        <span className={`mt-1 text-[11px] font-medium ${full ? 'block' : 'hidden sm:block xl:hidden'} ${light ? 'text-slate-400' : 'text-slate-500'}`}>
          Discover schools · Compare fees · Prepare
        </span>
      </span>
    </span>
  );
}

export function Layout() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const savedCount = useLocalList(savedSchools).length;
  const { notice, setNotice } = useMember();
  usePracticeSync();

  // A new page starts at the top (filter changes on the same page keep the scroll position); #fragments scroll to their target.
  useEffect(() => {
    setOpen(false);
    if (!window.location.hash) window.scrollTo({ top: 0 });
  }, [location.pathname]);
  useEffect(() => setOpen(false), [location.search, location.hash]);
  useScrollToHash();

  // The server-rendered canonical, robots and Open Graph tags describe the page first loaded; once the app navigates
  // elsewhere they would be stale, so they are dropped (the description is kept: pages update it themselves).
  const [firstPath] = useState(location.pathname);
  useEffect(() => {
    if (location.pathname === firstPath) return;
    document.head.querySelectorAll('[data-seo="server"]:not([name="description"]), link[rel="canonical"]')
      .forEach((el) => el.remove());
  }, [location.pathname, firstPath]);

  // Analytics (only with consent; see utils/analytics): start once, then one page view per page.
  useEffect(() => initAnalytics(), []);
  useEffect(() => trackPageView(location.pathname), [location.pathname]);

  // Google sign-in adds ?welcome=1 when it has just created the account: greet once, then drop the flag.
  const navigate = useNavigate();
  const { account } = useMember();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') !== '1' || !account) return;
    setNotice(`Welcome to SchoolDhundo, ${account.displayName}! Your account is ready.`);
    track('user_registration', { method: 'google' });
    params.delete('welcome');
    const query = params.toString();
    navigate({ pathname: location.pathname, search: query ? `?${query}` : '', hash: location.hash }, { replace: true });
  }, [location.search, location.pathname, location.hash, account, navigate, setNotice]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <header data-print="hide" className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur-lg transition-shadow ${scrolled ? 'border-slate-200 shadow-card' : 'border-transparent'}`}>
        {/* Wider than the page content on very wide screens, so the full navigation and every action fit on one row. */}
        <div className="container-page flex h-[68px] items-center justify-between gap-3 xl:gap-4 2xl:max-w-[1440px]">
          <Link to="/" aria-label="SchoolDhundo home" className="shrink-0 rounded-lg">
            <Logo compact />
          </Link>
          <DesktopNav />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/saved" className="btn-ghost relative hidden h-10 rounded-full px-2.5 sm:inline-flex" aria-label={`Saved schools (${savedCount})`} title="Saved schools">
              <Icon name="heart" className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-accent-400 px-1 text-center text-[10px] font-bold leading-[18px] text-ink">
                  {savedCount}
                </span>
              )}
            </Link>
            <AccountMenu />
            <button
              type="button"
              className="btn-ghost h-10 px-2.5 xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" />
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100vh-68px)] overflow-y-auto border-t border-slate-200 bg-white shadow-lift xl:hidden">
            <div className="container-page py-3">
              <MobileNav />
              <div className="mt-2 grid grid-cols-2 gap-1 border-t border-slate-100 pt-3">
                <MobileAccountLinks />
              </div>
            </div>
          </nav>
        )}
      </header>

      {notice && (
        <div role="status" className="border-b border-emerald-200 bg-emerald-50">
          <div className="container-page flex items-center justify-between gap-3 py-2 text-sm text-emerald-900">
            <span>{notice}</span>
            <button type="button" className="text-emerald-900 underline" onClick={() => setNotice(null)}>Dismiss</button>
          </div>
        </div>
      )}
      {/* isolate: z-indexes inside pages (map panes use 400–1000) stay below the sticky header and its menus. */}
      <main id="main" className="isolate flex-1">
        {/* Pages load on first visit; the header and footer stay in place meanwhile. */}
        <Suspense fallback={<div className="min-h-[60vh]"><Spinner label="Loading…" /></div>}>
          <Outlet />
        </Suspense>
      </main>

      <div data-print="hide"><CompareBar /></div>

      <div data-print="hide"><BackToTop /></div>

      <div data-print="hide"><ConsentBanner /></div>

      <footer data-print="hide" className="mt-20 bg-ink text-slate-300">
        <div className="container-page grid gap-10 py-12 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER.map((c) => <FooterColumn key={c.title} title={c.title} links={c.links} />)}
          <div>
            <p className="font-display text-sm font-semibold text-white">Creator</p>
            <p className="mt-4 text-slate-300">Created by {CREATOR_NAME}</p>
            <p className="mt-2 leading-relaxed text-slate-400">{CREATOR_INSTITUTE}</p>
            <p className="mt-2 text-slate-400">Email: <a href={`mailto:${CONTACT_EMAIL}`} className="break-all text-slate-300 underline-offset-2 hover:text-white hover:underline">{CONTACT_EMAIL}</a></p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-page py-5 text-xs leading-relaxed text-slate-400">
            <p className="max-w-4xl">{DISCLAIMER} Not affiliated with or endorsed by any school, board, ranking publisher or government body.</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>© {new Date().getFullYear()} SchoolDhundo</span>
              <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white">Terms and Conditions</Link>
              <Link to="/disclaimer" className="hover:text-white">Disclaimer</Link>
              <Link to="/data-deletion" className="hover:text-white">Delete Your Data</Link>
              {analyticsConfigured() && (
                <button type="button" onClick={resetConsent} className="hover:text-white">Cookie settings</button>
              )}
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">{CONTACT_EMAIL}</a>
              <Link to="/admin" className="hover:text-white">Administrator login</Link>
              <span>Map data © OpenStreetMap contributors</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="font-display text-sm font-semibold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-slate-400 transition hover:text-white">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
