import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { rankingService, type RankingSections } from '../../services/publicApi';
import { Icon, type IconName } from '../common/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  hint?: string;
  /** Shown only when this says there is verified data behind the page. */
  needs?: (s: RankingSections) => boolean;
}

export interface NavMenu {
  label: string;
  icon: IconName;
  /** Paths (prefixes) that make this menu the active section. */
  match: string[];
  sections: { title?: string; items: NavItem[] }[];
}

/** The ranking pages' own section bar (RankingShell): the destinations, the last being the one comparison page. */
export const RANKING_ITEMS: NavItem[] = [
  { to: '/rankings', label: 'India’s Top Schools', icon: 'trophy' },
  { to: '/rankings/top-premier-schools', label: 'Premier Schools', icon: 'star' },
  { to: '/rankings/boarding-schools', label: 'Boarding Schools', icon: 'home' },
  { to: '/rankings/states', label: 'State & City Rankings', icon: 'map', needs: (s) => s.rankings },
  { to: '/rankings/boards', label: 'Board-wise Rankings', icon: 'book', needs: (s) => s.boards },
  { to: '/rankings/government-boarding', label: 'Government & Boarding Schools', icon: 'shield', needs: (s) => s.government || s.boarding },
  { to: '/compare', label: 'Compare Schools', icon: 'scale' },
];

/** Hides items with nothing behind them. Until the answer arrives, or if it fails, every item stays. */
export const availableItems = (items: NavItem[], sections: RankingSections | null) =>
  items.filter((item) => !item.needs || !sections || item.needs(sections));

/** A top-level link with no menu of its own. */
interface NavLinkEntry { label: string; icon: IconName; to: string; match: string[] }
type NavEntry = NavMenu | NavLinkEntry;
const isMenu = (e: NavEntry): e is NavMenu => 'sections' in e;

/**
 * Four menus (schools, rankings, admissions, exam preparation) and three direct links (the updates feed, compare and
 * the blog). Every item opens a working page or a filtered view of one, and each destination appears under one menu.
 */
const ENTRIES: NavEntry[] = [
  {
    label: 'Schools', icon: 'institution',
    match: ['/schools', '/find', '/states', '/cities', '/boards', '/type', '/stages', '/network', '/nearby', '/boarding'],
    sections: [
      {
        title: 'Find schools',
        items: [
          { to: '/schools', label: 'Search all schools', icon: 'search', hint: 'Every school, with filters' },
          { to: '/find', label: 'Help me choose', icon: 'sparkle', hint: 'Answer a few questions' },
          { to: '/states', label: 'Schools by state', icon: 'map' },
          { to: '/cities', label: 'Schools by city', icon: 'building' },
          { to: '/nearby', label: 'Schools near me', icon: 'pin' },
        ],
      },
      {
        title: 'By board and type',
        items: [
          { to: '/boards/CBSE', label: 'CBSE schools', icon: 'book' },
          { to: '/boards/CISCE', label: 'ICSE schools', icon: 'book' },
          { to: '/type/private-aided/international', label: 'International schools', icon: 'globe' },
          { to: '/type/government', label: 'Government schools', icon: 'shield' },
          { to: '/type/private-aided/private', label: 'Private schools', icon: 'building' },
        ],
      },
      {
        title: 'Boarding schools',
        items: [
          { to: '/boarding', label: 'All boarding schools', icon: 'bed', hint: 'Residential schools across India' },
          { to: '/boarding/government', label: 'Government boarding schools', icon: 'shield' },
          { to: '/boarding/girls', label: 'Girls boarding schools', icon: 'users' },
          { to: '/network/jawahar-navodaya-vidyalaya', label: 'Jawahar Navodaya Vidyalayas', icon: 'graduation' },
          { to: '/boarding?system=SAINIK#directory', label: 'Sainik Schools', icon: 'flag' },
        ],
      },
    ],
  },
  {
    label: 'Rankings', icon: 'trophy', match: ['/rankings'],
    sections: [
      {
        title: 'Rankings',
        items: [
          { to: '/rankings', label: 'India’s top schools', icon: 'trophy', hint: 'Published rankings, with their sources' },
          { to: '/rankings/top-premier-schools', label: 'Premier schools', icon: 'star' },
          { to: '/rankings/boarding-schools', label: 'Top boarding schools', icon: 'bed' },
          { to: '/rankings/government-boarding', label: 'Government & residential', icon: 'shield', hint: 'JNV, Sainik, EMRS, KV and more', needs: (s) => s.government || s.boarding },
        ],
      },
      {
        title: 'By place and board',
        items: [
          { to: '/rankings/states', label: 'State & city rankings', icon: 'map', needs: (s) => s.rankings },
          { to: '/rankings/boards', label: 'Board-wise rankings', icon: 'layers', hint: 'CBSE, ICSE, IB, Cambridge', needs: (s) => s.boards },
          { to: '/rankings/methodology', label: 'How rankings work', icon: 'info', hint: 'Sources and methodology' },
        ],
      },
    ],
  },
  {
    label: 'Admissions', icon: 'calendar', match: ['/admissions', '/fees', '/saved'],
    sections: [
      {
        title: 'Admissions',
        items: [
          { to: '/admissions', label: 'Open admissions & deadlines', icon: 'calendar', hint: 'Every open and upcoming cycle' },
          { to: '/admissions/notifications', label: 'Admission notifications', icon: 'bolt', hint: 'Official notices, newest first' },
          { to: '/admissions/guide', label: 'Admission guide', icon: 'book', hint: 'Process, eligibility and age rules' },
          { to: '/admissions/guide#documents', label: 'Documents required', icon: 'file' },
        ],
      },
      {
        title: 'Fees and planning',
        items: [
          { to: '/fees', label: 'Fee calculator', icon: 'rupee', hint: 'From official fee schedules' },
          { to: '/saved', label: 'My shortlist', icon: 'heart', hint: 'Saved and recently viewed schools' },
        ],
      },
    ],
  },
  {
    label: 'Exam Prep', icon: 'target', match: ['/exams'],
    sections: [
      {
        title: 'Entrance exams',
        items: [
          { to: '/exams/jnvst', label: 'JNV entrance exam (JNVST)', icon: 'graduation', hint: 'Class 6 mock tests and study plan' },
          { to: '/exams/aissee', label: 'Sainik School entrance (AISSEE)', icon: 'flag', hint: 'Class 6 mock tests and study plan' },
          { to: '/exams/netarhat', label: 'Netarhat entrance exam', icon: 'graduation', hint: 'Netarhat Awasiya Vidyalaya, Class VI' },
          { to: '/exams', label: 'All entrance exams', icon: 'calendar', hint: 'Dates, eligibility and patterns' },
        ],
      },
      {
        title: 'School and other exams',
        items: [
          { to: '/exams/practice/class10-maths-1', label: 'Class 10 preparation', icon: 'book', hint: 'Mathematics' },
          { to: '/exams/practice/class12-maths-1', label: 'Class 12 preparation', icon: 'layers', hint: 'Mathematics and Physics' },
          { to: '/exams/practice?category=OLYMPIAD', label: 'Olympiad preparation', icon: 'trophy' },
          { to: '/exams/practice?category=COMPETITIVE', label: 'Government & competitive exams', icon: 'layers' },
        ],
      },
      {
        title: 'Practise',
        items: [
          { to: '/exams/practice', label: 'Mock tests & practice', icon: 'target' },
          { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily quiz', icon: 'sun', hint: 'Ten questions, new every day' },
          { to: '/exams/resources?type=QUESTION_PAPER', label: 'Previous year papers', icon: 'file', hint: 'Official papers, linked' },
          { to: '/exams/practice/progress', label: 'My progress', icon: 'chart' },
          { to: '/exams/leaderboard', label: 'Leaderboard & challenges', icon: 'trophy', hint: 'All India, by state and exam' },
        ],
      },
    ],
  },
  { label: 'Notifications', icon: 'bolt', to: '/updates', match: ['/updates'] },
  { label: 'Compare', icon: 'scale', to: '/compare', match: ['/compare'] },
  { label: 'Blog', icon: 'file', to: '/blog', match: ['/blog'] },
];

function useEntries() {
  const sections = useApi(() => rankingService.sections(), []);
  return useMemo(() => ENTRIES.map((e) => (isMenu(e)
    ? { ...e, sections: e.sections.map((s) => ({ ...s, items: availableItems(s.items, sections.data) })) }
    : e)), [sections.data]);
}

/** The pillar the current address belongs to: the longest matching path wins (boarding rankings light up Boarding). */
export function activeLabel(entries: { label: string; match: string[] }[], pathname: string): string | null {
  let best: { label: string; length: number } | null = null;
  for (const e of entries) {
    for (const p of e.match) {
      if ((pathname === p || pathname.startsWith(`${p}/`)) && (!best || p.length > best.length)) best = { label: e.label, length: p.length };
    }
  }
  return best?.label ?? null;
}

/** The menus' labels and paths, for tests. */
export const NAV_PILLARS = ENTRIES.map((e) => ({ label: e.label, match: e.match }));

const topLink = (active: boolean) => `flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-2 text-[14px] font-semibold transition 2xl:px-3 2xl:text-[15px] ${
  active ? 'bg-royal-50 text-royal-700' : 'text-navy hover:bg-slate-100 hover:text-royal-700'}`;

/** Desktop: a button per menu opening a panel on hover or click; arrow keys move between items, Escape closes. */
export function DesktopNav() {
  const [open, setOpen] = useState<string | null>(null);
  const entries = useEntries();
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number>();
  const current = activeLabel(ENTRIES, location.pathname);

  useEffect(() => setOpen(null), [location.pathname, location.search, location.hash]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e: MouseEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);
  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const hoverOpen = (label: string) => { window.clearTimeout(closeTimer.current); setOpen(label); };
  const hoverClose = () => { closeTimer.current = window.setTimeout(() => setOpen(null), 160); };

  return (
    <nav ref={navRef} aria-label="Main" className="hidden min-w-0 items-center gap-1 xl:flex">
      {entries.map((e, i) => (isMenu(e) ? (
        <Dropdown key={e.label} menu={e} align={i === 0 ? 'left' : i === entries.length - 1 ? 'right' : 'center'}
          open={open === e.label} active={current === e.label}
          onOpen={() => setOpen(e.label)} onClose={() => setOpen(null)} onToggle={() => setOpen(open === e.label ? null : e.label)}
          onHover={() => hoverOpen(e.label)} onLeave={hoverClose} />
      ) : (
        <NavLink key={e.label} to={e.to} className={() => topLink(current === e.label)}>{e.label}</NavLink>
      )))}
    </nav>
  );
}

function Dropdown({ menu, align, open, active, onOpen, onClose, onToggle, onHover, onLeave }: {
  menu: NavMenu; align: 'left' | 'center' | 'right'; open: boolean; active: boolean;
  onOpen: () => void; onClose: () => void; onToggle: () => void; onHover: () => void; onLeave: () => void;
}) {
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const links = () => [...(panelRef.current?.querySelectorAll<HTMLAnchorElement>('a[data-nav-item]') ?? [])];
  const focusItem = (index: number) => {
    const all = links();
    all[(index + all.length) % all.length]?.focus();
  };

  const onButtonKey = (e: ReactKeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      onOpen();
      window.requestAnimationFrame(() => focusItem(0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  };
  const onPanelKey = (e: ReactKeyboardEvent) => {
    const all = links();
    const i = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); focusItem(i + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusItem(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusItem(0); }
    else if (e.key === 'End') { e.preventDefault(); focusItem(all.length - 1); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); buttonRef.current?.focus(); }
  };
  const wide = menu.sections.length > 1;

  return (
    <div className="relative" onMouseEnter={onHover} onMouseLeave={onLeave}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) onClose(); }}>
      <button ref={buttonRef} type="button" aria-expanded={open} aria-controls={panelId} onClick={onToggle} onKeyDown={onButtonKey}
        className={topLink(active || open)}>
        {menu.label}
        <Icon name="chevronDown" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} ref={panelRef} onKeyDown={onPanelKey} hidden={!open}
        className={`absolute top-full z-50 mt-2 animate-fade-down rounded-2xl border border-slate-200 bg-white p-4 shadow-lift ${
          align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'} ${
          menu.sections.length > 2 ? 'w-[760px]' : wide ? 'w-[560px]' : 'w-[300px]'}`}>
        <div className={`grid gap-4 ${menu.sections.length > 2 ? 'grid-cols-3' : wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {menu.sections.map((s) => (
            <div key={s.title ?? menu.label}>
              {s.title && <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{s.title}</p>}
              <ul className="mt-1.5 space-y-0.5">
                {s.items.map((item) => (
                  <li key={item.to + item.label}>
                    <Link to={item.to} data-nav-item onClick={onClose}
                      className="group flex items-start gap-2.5 rounded-xl px-2 py-2 outline-none transition hover:bg-royal-50 focus-visible:bg-royal-50 focus-visible:ring-2 focus-visible:ring-royal-500">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-royal-600 group-hover:text-white">
                        <Icon name={item.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-navy">{item.label}</span>
                        {item.hint && <span className="block text-xs text-slate-500">{item.hint}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Mobile and tablet: each menu is an accordion section; the current section starts open. */
export function MobileNav() {
  const location = useLocation();
  const entries = useEntries();
  const current = activeLabel(ENTRIES, location.pathname);
  const [open, setOpen] = useState<string | null>(current);
  const iconBox = 'flex h-8 w-8 items-center justify-center rounded-lg bg-royal-50 text-royal-700';
  return (
    <div className="divide-y divide-slate-100">
      {entries.map((e) => {
        if (!isMenu(e)) {
          return (
            <Link key={e.label} to={e.to} className={`flex items-center gap-3 px-3 py-3 text-base font-semibold ${current === e.label ? 'text-royal-700' : 'text-navy'}`}>
              <span className={iconBox}><Icon name={e.icon} className="h-4 w-4" /></span>
              {e.label}
            </Link>
          );
        }
        const expanded = open === e.label;
        const id = `mnav-${e.label.replace(/\W+/g, '-').toLowerCase()}`;
        return (
          <div key={e.label}>
            <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(expanded ? null : e.label)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left text-base font-semibold ${current === e.label ? 'text-royal-700' : 'text-navy'}`}>
              <span className={iconBox}><Icon name={e.icon} className="h-4 w-4" /></span>
              <span className="flex-1">{e.label}</span>
              <Icon name="chevronDown" className={`h-5 w-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div id={id} hidden={!expanded} className="pb-3">
              {e.sections.map((s) => (
                <div key={s.title ?? e.label} className="mt-1">
                  {s.title && <p className="px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{s.title}</p>}
                  <ul className="grid gap-0.5 sm:grid-cols-2">
                    {s.items.map((item) => (
                      <li key={item.to + item.label}>
                        <Link to={item.to} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                          <Icon name={item.icon} className="h-4 w-4 shrink-0 text-slate-500" /> {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
