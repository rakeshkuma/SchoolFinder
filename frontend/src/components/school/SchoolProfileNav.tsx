import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Icon } from '../common/Icon';

export interface ProfileSection {
  id: string;
  label: string;
  /** Shown after the label, e.g. the number of photos; left out when 0 or unknown. */
  count?: number | null;
  /** Primary sections are always in the bar; the rest are under "More". */
  primary: boolean;
}

export const tabId = (id: string) => `school-tab-${id}`;
export const PANEL_ID = 'school-panel';
const MORE_ID = 'school-tab-more';

/** Which element names the open panel: its tab, or the "More" button when the section is one of the secondary ones. */
export function labelledBy(sections: ProfileSection[], active: string): string {
  return sections.find((s) => s.id === active)?.primary === false ? MORE_ID : tabId(active);
}

/**
 * The school profile's one sticky bar: the main sections as tabs (arrow keys, Home and End move between them, as the
 * WAI-ARIA tabs pattern describes), the less-used sections under "More", and room for one action on wide screens.
 * The active section lives in the URL (?tab=…), so every section keeps its address.
 */
export function SchoolProfileNav({ sections, active, onChange, action }: {
  sections: ProfileSection[];
  active: string;
  onChange: (id: string) => void;
  action?: ReactNode;
}) {
  const primary = sections.filter((s) => s.primary);
  const secondary = sections.filter((s) => !s.primary);
  const listRef = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = primary.length - 1;
    const next = e.key === 'ArrowRight' ? (index === last ? 0 : index + 1)
      : e.key === 'ArrowLeft' ? (index === 0 ? last : index - 1)
        : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (next === null) return;
    e.preventDefault();
    onChange(primary[next].id);
    listRef.current?.querySelector<HTMLButtonElement>(`#${tabId(primary[next].id)}`)?.focus();
  };

  return (
    <div className="sticky top-[68px] z-30 border-b border-slate-200 bg-white/95 shadow-[0_1px_0_rgba(15,37,87,0.04)] backdrop-blur">
      <div className="container-page flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
        {/* On narrow screens the strip scrolls; a fade at its right edge shows there is more. */}
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-white to-transparent md:hidden" />
        <div ref={listRef} role="tablist" aria-label="School profile sections" className="no-scrollbar -mx-1 flex min-w-0 overflow-x-auto pr-6 md:pr-0">
          {primary.map((s, i) => {
            const selected = s.id === active;
            return (
              <button key={s.id} id={tabId(s.id)} type="button" role="tab" aria-selected={selected} aria-controls={PANEL_ID}
                tabIndex={selected || (!primary.some((p) => p.id === active) && i === 0) ? 0 : -1}
                onClick={() => onChange(s.id)} onKeyDown={(e) => onKey(e, i)}
                className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${
                  selected ? 'text-navy' : 'text-slate-600 hover:text-navy'}`}>
                {s.label}
                {!!s.count && <span className={`rounded-full px-1.5 text-[11px] font-semibold ${selected ? 'bg-navy text-white' : 'bg-slate-100 text-slate-600'}`}>{s.count}</span>}
                <span aria-hidden className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${selected ? 'bg-flame-500' : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
        </div>
        {secondary.length > 0 && <MoreMenu sections={secondary} active={active} onChange={onChange} />}
        {action && <div className="hidden shrink-0 lg:block">{action}</div>}
      </div>
    </div>
  );
}

function MoreMenu({ sections, active, onChange }: { sections: ProfileSection[]; active: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = sections.find((s) => s.id === active);

  useEffect(() => {
    if (!open) return undefined;
    wrapRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    const away = (e: MouseEvent) => { if (!wrapRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const close = () => { setOpen(false); buttonRef.current?.focus(); };
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...(wrapRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length]?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length]?.focus(); }
    else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative shrink-0" onKeyDown={onMenuKey}>
      <button ref={buttonRef} id={MORE_ID} type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={`relative flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${
          current ? 'bg-royal-50 text-navy' : 'text-slate-600 hover:bg-slate-50 hover:text-navy'}`}>
        {current ? current.label : 'More'}
        <span className="sr-only"> (more sections)</span>
        <Icon name="chevronDown" className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-labelledby={MORE_ID}
          className="absolute right-0 top-full z-40 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lift">
          {sections.map((s) => (
            <button key={s.id} type="button" role="menuitem" onClick={() => { onChange(s.id); close(); }}
              className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none ${
                s.id === active ? 'font-semibold text-navy' : 'text-slate-700'}`}>
              {s.label}
              {!!s.count && <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold text-slate-600">{s.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
