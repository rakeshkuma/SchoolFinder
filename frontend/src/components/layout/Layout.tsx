import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '../common/States';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { DesktopNav, MobileNav } from './MainNav';
import { useMember } from '../../hooks/useMember';
import { usePracticeSync } from '../../hooks/usePracticeProgress';
import { savedSchools, useLocalList } from '../../hooks/usePersonal';
import { AccountMenu, MobileAccountLinks } from './AccountMenu';
import { Icon } from '../common/Icon';
import { CompareBar } from '../school/CompareBar';

const FOOTER: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Schools',
    links: [
      { to: '/schools', label: 'Find schools' },
      { to: '/states', label: 'Schools by state' },
      { to: '/cities', label: 'Schools by city' },
      { to: '/boarding', label: 'Boarding schools' },
      { to: '/boards/CBSE', label: 'CBSE schools' },
      { to: '/boards/CISCE', label: 'ICSE schools' },
      { to: '/compare', label: 'Compare schools' },
      { to: '/fees', label: 'School fees & calculator' },
    ],
  },
  {
    title: 'Rankings & admissions',
    links: [
      { to: '/rankings', label: 'School rankings' },
      { to: '/rankings/methodology', label: 'How rankings work' },
      { to: '/admissions/guide', label: 'Admission guide' },
      { to: '/admissions', label: 'Admission dates' },
      { to: '/admissions/notifications', label: 'Admission notifications' },
      { to: '/reviews', label: 'Parent reviews' },
    ],
  },
  {
    title: 'Exam preparation',
    links: [
      { to: '/exams', label: 'School entrance exams' },
      { to: '/exams/practice', label: 'Mock tests & practice' },
      { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily quiz' },
      { to: '/exams/resources', label: 'Previous year papers & resources' },
      { to: '/exams/practice/progress', label: 'My progress' },
    ],
  },
  {
    title: 'About',
    links: [
      { to: '/about', label: 'About us' },
      { to: '/contact', label: 'Contact us' },
      { to: '/privacy', label: 'Privacy policy' },
      { to: '/terms', label: 'Terms and conditions' },
      { to: '/disclaimer', label: 'Disclaimer' },
      { to: '/admin', label: 'Administrator login' },
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
export function Logo({ light = false, full = false }: { light?: boolean; full?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5">
      <img src="/favicon.svg" alt="" width={36} height={36} className="h-9 w-9 shrink-0" />
      <span className="whitespace-nowrap leading-none">
        <span className={`block font-display text-base font-extrabold tracking-tight sm:text-[17px] ${light ? 'text-white' : 'text-ink'}`}>
          India School Finder
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
      <header className={`sticky top-0 z-40 border-b bg-white/90 backdrop-blur-lg transition-shadow ${scrolled ? 'border-slate-200 shadow-card' : 'border-transparent'}`}>
        {/* Wider than the page content on very wide screens, so the full navigation and every action fit on one row. */}
        <div className="container-page flex h-[68px] items-center justify-between gap-3 xl:gap-4 2xl:max-w-[1440px]">
          <Link to="/" aria-label="India School Finder home" className="shrink-0 rounded-lg">
            <Logo />
          </Link>
          <DesktopNav />
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Link to="/saved" className="btn-ghost relative h-10 rounded-full px-2.5" aria-label={`Saved schools (${savedCount})`} title="Saved schools">
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

      <CompareBar />

      <BackToTop />

      <footer className="mt-20 bg-ink text-slate-300">
        <div className="h-1 bg-gradient-to-r from-brand-600 via-violet-600 to-accent-400" aria-hidden />
        <div className="container-page grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo light full />
            <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
              Fees, admission dates, facilities and locations for schools across India — every fact linked to the official
              page it came from — and free, original practice tests for school and entrance exams.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10">
              <Icon name="shield" className="h-4 w-4 text-accent-300" /> No invented data. Unknown stays unknown.
            </p>
          </div>
          {FOOTER.map((c) => <FooterColumn key={c.title} title={c.title} links={c.links} />)}
        </div>
        <div className="border-t border-white/10">
          <div className="container-page flex flex-col gap-2 py-5 text-xs text-slate-400 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} India School Finder. An independent directory — not affiliated with or endorsed by any school or government body. Rankings here are not official rankings.</span>
            <span>Map data © OpenStreetMap contributors</span>
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
