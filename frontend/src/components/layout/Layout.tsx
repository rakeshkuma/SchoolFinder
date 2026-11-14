import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '../common/States';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { DesktopNav, MobileNav } from './MainNav';
import { ConsentBanner } from './ConsentBanner';
import { consentNeeded, initAnalytics, resetConsent, track, trackPageView } from '../../utils/analytics';
import { useMember } from '../../hooks/useMember';
import { usePracticeSync } from '../../hooks/usePracticeProgress';
import { savedSchools, useLocalList } from '../../hooks/usePersonal';
import { AccountMenu, MobileAccountLinks } from './AccountMenu';
import { Icon, type IconName } from '../common/Icon';
import { CompareBar } from '../school/CompareBar';
import { CONTACT_EMAIL, CREATOR_INSTITUTE, CREATOR_NAME, DISCLAIMER } from '../../content/site';

const FOOTER: { title: string; links: { to: string; label: string }[] }[] = [
  {
    title: 'Schools',
    links: [
      { to: '/schools', label: 'Find Schools' },
      { to: '/boarding', label: 'Boarding Schools' },
      { to: '/cities', label: 'Schools by City' },
      { to: '/states', label: 'Schools by State' },
      { to: '/boards/CBSE', label: 'CBSE Schools' },
      { to: '/claim-school', label: 'Add / List Your School' },
    ],
  },
  {
    title: 'Rankings',
    links: [
      { to: '/rankings', label: 'India’s Top Schools' },
      { to: '/rankings/boarding-schools', label: 'Top Boarding Schools' },
      { to: '/rankings/states', label: 'State-wise Rankings' },
      { to: '/rankings/boards', label: 'Board-wise Rankings' },
      { to: '/rankings/methodology', label: 'Ranking Methodology' },
    ],
  },
  {
    title: 'Exams',
    links: [
      { to: '/exams/jnvst', label: 'JNVST Preparation' },
      { to: '/exams/aissee', label: 'AISSEE Preparation' },
      { to: '/exams/netarhat', label: 'Netarhat Preparation' },
      { to: '/exams/practice', label: 'Mock Tests' },
      { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily Quiz' },
      { to: '/exams/leaderboard', label: 'Leaderboard' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { to: '/admissions/guide', label: 'Admissions Guide' },
      { to: '/fees', label: 'Fee Calculator' },
      { to: '/updates', label: 'Latest Updates' },
      { to: '/updates?category=JOB', label: 'School Jobs' },
      { to: '/blog', label: 'Blog & Articles' },
      { to: '/exams/resources', label: 'Study Material' },
    ],
  },
];

/** No address, phone number or social account is published that the site does not actually have (see content/site). */
const CONTACT: { to: string; label: string; icon: IconName }[] = [
  { to: '/contact', label: 'Contact form', icon: 'mail' },
  { to: '/contact?topic=CORRECTION', label: 'Report incorrect information', icon: 'info' },
  { to: '/contact?topic=LISTING', label: 'Submit school information', icon: 'file' },
  { to: '/advertise', label: 'Advertise with us', icon: 'megaphone' },
];

const LEGAL: { to: string; label: string }[] = [
  { to: '/about', label: 'About Us' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Use' },
  { to: '/disclaimer', label: 'Disclaimer' },
  { to: '/editorial-policy', label: 'Editorial Policy' },
  { to: '/corrections-policy', label: 'Corrections Policy' },
  { to: '/data-deletion', label: 'Delete Your Data' },
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
      className="fixed bottom-24 right-4 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-white text-royal-700 shadow-lift ring-1 ring-slate-200 transition hover:bg-royal-600 hover:text-white sm:bottom-6">
      <Icon name="chevronDown" className="h-5 w-5 rotate-180" />
    </button>
  );
}

/** The open book: SchoolDhundo's mark. */
function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 32" aria-hidden className={className}>
      <path d="M20 6.6C16.4 3.9 10.8 2.9 3.5 3.3v22.6c7.3-.4 12.9.6 16.5 3.3 3.6-2.7 9.2-3.7 16.5-3.3V3.3C29.2 2.9 23.6 3.9 20 6.6Z" fill="currentColor" />
      <path d="M20 6.6v22.6M8 9.6c3.3-.1 6.2.4 8.6 1.6M8 14.1c3.3-.1 6.2.4 8.6 1.6M8 18.6c3.3-.1 6.2.4 8.6 1.6M32 9.6c-3.3-.1-6.2.4-8.6 1.6M32 14.1c-3.3-.1-6.2.4-8.6 1.6M32 18.6c-3.3-.1-6.2.4-8.6 1.6"
        fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** The name never wraps: "School" in navy (white on the footer) and "Dhundo" in orange, beside the book mark. */
function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex shrink-0 items-center gap-2">
      <BrandMark className={`h-8 w-10 shrink-0 sm:h-9 sm:w-11 ${light ? 'text-white' : 'text-royal-600'}`} />
      <span className="whitespace-nowrap font-display text-[19px] font-extrabold leading-none tracking-tight sm:text-[22px] 2xl:text-2xl">
        <span className={light ? 'text-white' : 'text-navy'}>School</span>
        <span className={light ? 'text-flame-400' : 'text-flame-600'}>Dhundo</span>
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
  const home = location.pathname === '/';

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

  const shortlistLabel = `My shortlist: ${savedCount} ${savedCount === 1 ? 'school' : 'schools'}`;

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:p-2">
        Skip to content
      </a>
      <header data-print="hide" className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur-lg transition-shadow ${scrolled ? 'border-slate-200 shadow-card' : 'border-slate-100'}`}>
        <div className="container-wide flex h-[68px] items-center justify-between gap-2 xl:h-[72px] xl:gap-3">
          <Link to="/" aria-label="SchoolDhundo home" className="shrink-0 rounded-lg">
            <Logo />
          </Link>
          <DesktopNav />
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link to="/claim-school"
              className="hidden h-10 items-center gap-2 rounded-xl border-2 border-royal-200 bg-white px-3 text-sm font-bold text-royal-700 transition hover:border-royal-600 hover:bg-royal-50 md:inline-flex">
              <Icon name="institution" className="h-5 w-5" /> List Your School
            </Link>
            {/* The shortlist: schools saved with the heart on any card or profile, kept in this browser. On phones its count
                rides on the menu button instead, and the menu has the link. */}
            <Link to="/saved" aria-label={shortlistLabel} title="My shortlist"
              className={`relative hidden h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition sm:inline-flex ${
                savedCount > 0 ? 'bg-rose-50 text-rose-700 hover:bg-rose-100' : 'text-slate-600 hover:bg-slate-100 hover:text-navy'}`}>
              <Icon name="heart" className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white">
                  {savedCount}
                </span>
              )}
            </Link>
            <AccountMenu />
            <button
              type="button"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-navy transition hover:bg-slate-100 xl:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? 'Close menu' : 'Open menu'}
              onClick={() => setOpen((v) => !v)}
            >
              <Icon name={open ? 'close' : 'menu'} className="h-6 w-6" />
              {savedCount > 0 && !open && (
                <span aria-hidden className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white sm:hidden">
                  {savedCount}
                </span>
              )}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="max-h-[calc(100vh-68px)] overflow-y-auto border-t border-slate-200 bg-white shadow-lift xl:hidden">
            <div className="container-wide py-3">
              <div className="grid grid-cols-2 gap-2 pb-2 md:hidden">
                <Link to="/claim-school" className="flex items-center justify-center gap-2 rounded-xl border-2 border-royal-200 px-3 py-2.5 text-sm font-bold text-royal-700">
                  <Icon name="institution" className="h-5 w-5" /> List Your School
                </Link>
                <Link to="/saved" aria-label={shortlistLabel} className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">
                  <Icon name="heart" className="h-5 w-5" /> My shortlist{savedCount > 0 ? ` (${savedCount})` : ''}
                </Link>
              </div>
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

      <footer data-print="hide" className={`${home ? '' : 'mt-20'} bg-navy text-slate-300`}>
        <div className="container-wide grid grid-cols-2 gap-x-6 gap-y-10 py-12 text-sm md:grid-cols-3 md:gap-x-8 xl:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
          <div className="col-span-2 md:col-span-3 xl:col-span-1 xl:border-r xl:border-white/10 xl:pr-8">
            <Link to="/" aria-label="SchoolDhundo home" className="inline-block rounded-lg"><Logo light /></Link>
            <p className="mt-4 max-w-md leading-relaxed text-slate-300">
              A free platform to discover, compare and prepare for the best schools, admissions, rankings and entrance exams across India.
            </p>
            <p className="mt-4 text-slate-400">
              Created by <span className="text-slate-200">{CREATOR_NAME}</span>, {CREATOR_INSTITUTE}
            </p>
          </div>
          {FOOTER.map((c) => <FooterColumn key={c.title} title={c.title} links={c.links} />)}
          <div className="col-span-2 md:col-span-1">
            <p className="font-display text-base font-bold text-white">Contact</p>
            <ul className="mt-4 space-y-2.5">
              {CONTACT_EMAIL && (
                <li>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2.5 break-all text-slate-300 transition hover:text-white">
                    <Icon name="mail" className="h-4 w-4 shrink-0 text-slate-400" /> {CONTACT_EMAIL}
                  </a>
                </li>
              )}
              {CONTACT.map((c) => (
                <li key={c.to}>
                  <Link to={c.to} className="flex items-center gap-2.5 text-slate-300 transition hover:text-white">
                    <Icon name={c.icon} className="h-4 w-4 shrink-0 text-slate-400" /> {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container-wide flex flex-col gap-3 py-5 text-[13px] text-slate-300 lg:flex-row lg:items-center lg:justify-between">
            <span>© {new Date().getFullYear()} SchoolDhundo. All rights reserved.</span>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {LEGAL.map((l) => <Link key={l.to} to={l.to} className="transition hover:text-white">{l.label}</Link>)}
              <Link to="/advertise" className="transition hover:text-white">Advertise With Us</Link>
              {consentNeeded() && (
                <button type="button" onClick={resetConsent} className="transition hover:text-white">Cookie settings</button>
              )}
            </nav>
          </div>
          <p className="container-wide pb-6 text-xs leading-relaxed text-slate-400">
            {DISCLAIMER} Not affiliated with or endorsed by any school, board, ranking publisher or government body. Map data © OpenStreetMap contributors.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, links }: { title: string; links: { to: string; label: string }[] }) {
  return (
    <div>
      <p className="font-display text-base font-bold text-white">{title}</p>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className="text-slate-300 transition hover:text-white">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
