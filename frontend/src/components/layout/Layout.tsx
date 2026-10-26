import { Suspense, useEffect, useState } from 'react';
import { Spinner } from '../common/States';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMember } from '../../hooks/useMember';
import { savedSchools, useLocalList } from '../../hooks/usePersonal';
import { AccountMenu, MobileAccountLinks } from './AccountMenu';
import { Icon } from '../common/Icon';
import { CompareBar } from '../school/CompareBar';

const NAV = [
  { to: '/find', label: 'Find a school' },
  { to: '/schools', label: 'Schools' },
  { to: '/boarding', label: 'Boarding' },
  { to: '/exams', label: 'Exam prep' },
  { to: '/rankings', label: 'Rankings' },
  { to: '/admissions', label: 'Admissions' },
  { to: '/fees', label: 'Fees' },
  { to: '/compare', label: 'Compare' },
];

const BROWSE = [
  { to: '/states', label: 'Schools by state' },
  { to: '/boards/CBSE', label: 'CBSE schools' },
  { to: '/boards/CISCE', label: 'ICSE / ISC schools' },
  { to: '/boards/IB', label: 'IB schools' },
  { to: '/network/kendriya-vidyalaya', label: 'Kendriya Vidyalayas' },
  { to: '/network/jawahar-navodaya-vidyalaya', label: 'Navodaya Vidyalayas' },
  { to: '/type/government', label: 'Government schools' },
  { to: '/type/private-aided', label: 'Private & aided schools' },
  { to: '/stages/nursery', label: 'Nursery & KG' },
  { to: '/stages/primary', label: 'Primary' },
  { to: '/stages/senior-secondary', label: 'Senior secondary' },
];

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className={`block font-display text-[17px] font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
          India School Finder
        </span>
        <span className={`mt-1 block text-[11px] font-medium ${light ? 'text-slate-400' : 'text-slate-500'}`}>
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

  useEffect(() => {
    setOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  // The server-rendered canonical, robots and Open Graph tags describe the page first loaded; once the app navigates
  // elsewhere they would be stale, so they are dropped (the description is kept: pages update it themselves).
  const [firstPath] = useState(location.pathname);
  useEffect(() => {
    if (location.pathname === firstPath) return;
    document.head.querySelectorAll('[data-seo="server"]:not([name="description"]), link[rel="canonical"]')
      .forEach((el) => el.remove());
  }, [location.pathname, firstPath]);

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
        <div className="container-page flex h-[68px] items-center justify-between gap-4">
          <Link to="/" aria-label="India School Finder home">
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-0.5 xl:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/saved" className="btn-ghost relative rounded-full px-2.5" aria-label={`Saved schools (${savedCount})`} title="Saved schools">
              <Icon name="heart" className="h-5 w-5" />
              {savedCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-accent-400 px-1 text-center text-[10px] font-bold leading-[18px] text-ink">
                  {savedCount}
                </span>
              )}
            </Link>
            <Link to="/nearby" className="btn-primary hidden whitespace-nowrap rounded-full px-4 sm:inline-flex xl:px-3 2xl:px-4" title="Schools near me">
              <Icon name="pin" className="h-4 w-4" /> <span className="xl:sr-only 2xl:not-sr-only">Near me</span>
            </Link>
            <AccountMenu />
            <button
              type="button"
              className="btn-ghost px-2.5 xl:hidden"
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
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-slate-200 bg-white xl:hidden">
            <div className="container-page grid grid-cols-2 gap-1 py-3">
              {[...NAV, { to: '/nearby', label: 'Schools near me' }, ...BROWSE].map((item) => (
                <NavLink key={item.to} to={item.to} className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  {item.label}
                </NavLink>
              ))}
              <MobileAccountLinks />
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
      <main id="main" className="flex-1">
        {/* Pages load on first visit; the header and footer stay in place meanwhile. */}
        <Suspense fallback={<div className="min-h-[60vh]"><Spinner label="Loading…" /></div>}>
          <Outlet />
        </Suspense>
      </main>

      <CompareBar />

      <footer className="mt-20 bg-ink text-slate-300">
        <div className="container-page grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo light />
            <p className="mt-4 max-w-xs leading-relaxed text-slate-400">
              Fees, admission dates, facilities and locations for schools across India — every fact linked to the official
              page it came from. Always confirm with the school or the relevant education department before acting.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-slate-300 ring-1 ring-white/10">
              <Icon name="shield" className="h-4 w-4 text-accent-300" /> No invented data. Unknown stays unknown.
            </p>
          </div>
          <FooterColumn title="Browse" links={BROWSE} />
          <FooterColumn
            title="Admissions & tools"
            links={[
              { to: '/admissions', label: 'Admission deadlines' },
              { to: '/admissions/notifications', label: 'Latest notifications' },
              { to: '/fees', label: 'Fee calculator' },
              { to: '/compare', label: 'Compare schools' },
              { to: '/nearby', label: 'Schools near me' },
              { to: '/saved', label: 'Saved schools' },
              { to: '/reviews', label: 'Parent reviews' },
              { to: '/rankings/methodology', label: 'Ranking methodology' },
            ]}
          />
          <FooterColumn
            title="About"
            links={[
              { to: '/about', label: 'About us' },
              { to: '/contact', label: 'Contact' },
              { to: '/privacy', label: 'Privacy policy' },
              { to: '/disclaimer', label: 'Disclaimer' },
              { to: '/admin', label: 'Administrator login' },
            ]}
          />
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
