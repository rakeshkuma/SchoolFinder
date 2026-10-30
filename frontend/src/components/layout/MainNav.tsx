import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../common/Icon';

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  hint?: string;
}

export interface NavMenu {
  label: string;
  icon: IconName;
  /** Paths (prefixes) that make this menu the active section. */
  match: string[];
  sections: { title: string; items: NavItem[] }[];
}

/**
 * The main menus. Every item opens a working page or a filtered view of one; fee information lives under Schools
 * (calculator, school profiles, comparison) rather than in a menu of its own.
 */
export const MENUS: NavMenu[] = [
  {
    label: 'Schools', icon: 'graduation', match: ['/schools', '/find', '/states', '/cities', '/boards', '/type', '/stages', '/network', '/nearby', '/fees', '/saved'],
    sections: [
      {
        title: 'Find schools',
        items: [
          { to: '/schools', label: 'Find schools', icon: 'search', hint: 'Search and filter every school' },
          { to: '/find', label: 'Help me choose', icon: 'sparkle', hint: 'Answer a few questions' },
          { to: '/states', label: 'Schools by state', icon: 'map' },
          { to: '/cities', label: 'Schools by city', icon: 'building' },
          { to: '/nearby', label: 'Schools near me', icon: 'pin' },
        ],
      },
      {
        title: 'By type',
        items: [
          { to: '/boards/CBSE', label: 'CBSE schools', icon: 'book' },
          { to: '/boards/CISCE', label: 'ICSE schools', icon: 'book' },
          { to: '/type/private-aided/international', label: 'International schools', icon: 'globe' },
          { to: '/type/government', label: 'Government schools', icon: 'shield' },
          { to: '/type/private-aided/private', label: 'Private schools', icon: 'building' },
        ],
      },
      {
        title: 'Decide',
        items: [
          { to: '/rankings', label: 'Best schools', icon: 'trophy', hint: 'Evidence-based scores' },
          { to: '/compare', label: 'Compare schools', icon: 'scale' },
          { to: '/fees', label: 'School fees & calculator', icon: 'rupee', hint: 'Official fee schedules' },
          { to: '/saved', label: 'Saved schools', icon: 'heart' },
        ],
      },
    ],
  },
  {
    label: 'Boarding', icon: 'home', match: ['/boarding', '/network/jawahar-navodaya-vidyalaya'],
    sections: [
      {
        title: 'Boarding schools',
        items: [
          { to: '/boarding#top-boarding', label: 'Best boarding schools in India', icon: 'trophy' },
          { to: '/boarding#directory', label: 'Boarding schools by state', icon: 'map', hint: 'Choose a state in the directory' },
          { to: '/boarding?system=government#directory', label: 'Government boarding schools', icon: 'shield' },
          { to: '/boarding?system=private#directory', label: 'Private boarding schools', icon: 'building' },
        ],
      },
      {
        title: 'School systems',
        items: [
          { to: '/network/jawahar-navodaya-vidyalaya', label: 'Jawahar Navodaya Vidyalaya', icon: 'graduation' },
          { to: '/boarding?system=SAINIK#directory', label: 'Sainik Schools', icon: 'flag' },
          { to: '/admissions/guide#hostel', label: 'School hostel information', icon: 'info', hint: 'What to check before you apply' },
        ],
      },
    ],
  },
  {
    label: 'Exam preparation', icon: 'target', match: ['/exams'],
    sections: [
      {
        title: 'Prepare for',
        items: [
          { to: '/exams/practice?category=SCHOOL', label: 'School subjects (CBSE syllabus)', icon: 'book', hint: 'Classes VIII, X and XII' },
          { to: '/exams/practice/class10-maths-1', label: 'Class 10 preparation', icon: 'book', hint: 'Mathematics, English and Hindi' },
          { to: '/exams/practice/class12-maths-1', label: 'Class 12 preparation', icon: 'layers', hint: 'Mathematics and Physics' },
          { to: '/exams/jnvst', label: 'JNV entrance exam (JNVST)', icon: 'graduation' },
          { to: '/exams/aissee', label: 'Sainik School entrance (AISSEE)', icon: 'flag' },
          { to: '/exams/practice?category=OLYMPIAD', label: 'Olympiad preparation', icon: 'trophy' },
          { to: '/exams/practice?category=COMPETITIVE', label: 'Government & competitive exams', icon: 'layers' },
          { to: '/exams', label: 'All school entrance exams', icon: 'calendar' },
        ],
      },
      {
        title: 'Practise',
        items: [
          { to: '/exams/practice', label: 'Mock tests & practice questions', icon: 'target' },
          { to: '/exams/practice/session?mode=DAILY&timer=1', label: 'Daily quiz', icon: 'sun', hint: 'Ten questions, new every day' },
          { to: '/exams/resources?type=QUESTION_PAPER', label: 'Previous year papers', icon: 'file', hint: 'Official papers, linked' },
          { to: '/exams/practice/progress', label: 'My progress', icon: 'chart' },
        ],
      },
    ],
  },
  {
    label: 'Rankings', icon: 'trophy', match: ['/rankings'],
    sections: [
      {
        title: 'Top schools',
        items: [
          { to: '/rankings?size=10', label: 'Top 10 schools in India', icon: 'trophy' },
          { to: '/rankings', label: 'Top 20 schools in India', icon: 'trophy' },
          { to: '/rankings?size=100', label: 'Top 100 schools in India', icon: 'trophy' },
          { to: '/rankings?focus=place', label: 'Rankings by state or city', icon: 'map' },
        ],
      },
      {
        title: 'By category',
        items: [
          { to: '/rankings?board=CBSE', label: 'CBSE school rankings', icon: 'book' },
          { to: '/rankings?board=CISCE', label: 'ICSE school rankings', icon: 'book' },
          { to: '/rankings?boarding=true', label: 'Boarding school rankings', icon: 'home' },
          { to: '/rankings/methodology', label: 'How rankings work', icon: 'info' },
        ],
      },
    ],
  },
  {
    label: 'Admissions', icon: 'calendar', match: ['/admissions'],
    sections: [
      {
        title: 'Admissions',
        items: [
          { to: '/admissions/guide', label: 'Admission guide', icon: 'book' },
          { to: '/admissions/guide#process', label: 'Admission process', icon: 'list' },
          { to: '/admissions/guide#eligibility', label: 'Admission eligibility', icon: 'check' },
          { to: '/admissions', label: 'Important dates', icon: 'calendar', hint: 'Open and upcoming deadlines' },
          { to: '/admissions/guide#documents', label: 'Documents required', icon: 'file' },
          { to: '/admissions/notifications', label: 'Admission notifications', icon: 'bolt' },
        ],
      },
    ],
  },
];

/** Whether the current address belongs to a menu (for highlighting it). */
export function menuIsActive(menu: NavMenu, pathname: string) {
  return menu.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Desktop: a button per menu opening a panel on hover or click; arrow keys move between items, Escape closes. */
export function DesktopNav() {
  const [open, setOpen] = useState<string | null>(null);
  const location = useLocation();
  const navRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number>();

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
    <nav ref={navRef} aria-label="Main" className="hidden min-w-0 items-center gap-0.5 xl:flex">
      {MENUS.map((m, i) => (
        <Dropdown key={m.label} menu={m} align={i === 0 ? 'left' : i === MENUS.length - 1 ? 'right' : 'center'}
          open={open === m.label} active={menuIsActive(m, location.pathname)}
          onOpen={() => setOpen(m.label)} onClose={() => setOpen(null)} onToggle={() => setOpen(open === m.label ? null : m.label)}
          onHover={() => hoverOpen(m.label)} onLeave={hoverClose} />
      ))}
      <NavLink to="/compare"
        className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}>
        Compare
      </NavLink>
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
        className={`flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active || open ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'}`}>
        {menu.label}
        <Icon name="chevronDown" className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div id={panelId} ref={panelRef} onKeyDown={onPanelKey} hidden={!open}
        className={`absolute top-full z-50 mt-2 animate-fade-down rounded-2xl border border-slate-200 bg-white p-4 shadow-lift ${
          align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2'} ${
          menu.sections.length > 2 ? 'w-[760px]' : wide ? 'w-[560px]' : 'w-[300px]'}`}>
        <div className={`grid gap-4 ${menu.sections.length > 2 ? 'grid-cols-3' : wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {menu.sections.map((s) => (
            <div key={s.title}>
              <p className="px-2 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{s.title}</p>
              <ul className="mt-1.5 space-y-0.5">
                {s.items.map((item) => (
                  <li key={item.to + item.label}>
                    <Link to={item.to} data-nav-item onClick={onClose}
                      className="group flex items-start gap-2.5 rounded-xl px-2 py-2 outline-none transition hover:bg-brand-50 focus-visible:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-500">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 transition group-hover:bg-brand-600 group-hover:text-white">
                        <Icon name={item.icon} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{item.label}</span>
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
  const [open, setOpen] = useState<string | null>(() => MENUS.find((m) => menuIsActive(m, location.pathname))?.label ?? null);
  return (
    <div className="divide-y divide-slate-100">
      {MENUS.map((m) => {
        const expanded = open === m.label;
        const id = `mnav-${m.label.replace(/\s+/g, '-').toLowerCase()}`;
        return (
          <div key={m.label}>
            <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setOpen(expanded ? null : m.label)}
              className={`flex w-full items-center gap-3 px-3 py-3 text-left text-base font-semibold ${menuIsActive(m, location.pathname) ? 'text-brand-700' : 'text-ink'}`}>
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name={m.icon} className="h-4 w-4" /></span>
              <span className="flex-1">{m.label}</span>
              <Icon name="chevronDown" className={`h-5 w-5 text-slate-500 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
            <div id={id} hidden={!expanded} className="pb-3">
              {m.sections.map((s) => (
                <div key={s.title} className="mt-1">
                  <p className="px-3 pt-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{s.title}</p>
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
      <Link to="/compare" className="flex items-center gap-3 px-3 py-3 text-base font-semibold text-ink">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon name="scale" className="h-4 w-4" /></span>
        Compare schools
      </Link>
    </div>
  );
}
