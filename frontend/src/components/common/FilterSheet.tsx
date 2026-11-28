import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

/**
 * "More filters": a button that opens the less-used filters in a side drawer (desktop) or a bottom sheet (phones).
 * Filters apply as they change, so "Show results" only closes the panel. Escape and the backdrop close it, focus
 * moves into the panel on open and back to the button on close, and the page behind does not scroll.
 */
export function MoreFilters({ activeCount, resultLabel, onClearAll, children, label = 'More filters' }: {
  /** How many of the filters inside are set (shown on the button). */
  activeCount: number;
  /** e.g. "248 schools" — shown on the close button so the effect of each change is visible. */
  resultLabel?: string;
  onClearAll?: () => void;
  children: ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('select, input, button:not([data-close])')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      if (e.key === 'Tab' && panelRef.current) {
        // Keep keyboard focus inside the open panel.
        const items = [...panelRef.current.querySelectorAll<HTMLElement>('select, input, button, a[href], textarea')]
          .filter((el) => !el.hasAttribute('disabled'));
        if (items.length === 0) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
      buttonRef.current?.focus();
    };
  }, [open]);

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold ring-1 transition ${
          activeCount > 0 ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-700 ring-slate-200 hover:ring-brand-300'}`}>
        <Icon name="filter" className="h-4 w-4" /> {label}
        {activeCount > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[11px] leading-5 text-white">{activeCount}</span>}
      </button>
      {/* Rendered at the end of <body>: the page content is an isolated stacking context below the sticky header. */}
      {open && createPortal(
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden />
          <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={titleId}
            className="absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-lift sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[420px] sm:rounded-none sm:rounded-l-3xl">
            <div className="border-b border-slate-100 px-5 pb-3 pt-2 sm:pt-4">
              <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-slate-200 sm:hidden" aria-hidden />
              <div className="flex items-center justify-between gap-3">
                <h2 id={titleId} className="font-display text-lg font-bold text-ink">{label}</h2>
                <button type="button" data-close onClick={() => setOpen(false)} className="btn-ghost h-9 w-9 rounded-full p-0" aria-label="Close">
                  <Icon name="close" className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="h-4 shrink-0" aria-hidden />
            <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-5">{children}</div>
            <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-4">
              {onClearAll && <button type="button" className="btn-ghost" onClick={onClearAll}>Clear all</button>}
              <button type="button" className="btn-primary ml-auto" onClick={() => setOpen(false)}>
                {resultLabel ? `Show ${resultLabel}` : 'Done'}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

/** A labelled control in a filter bar or panel. */
export function FilterField({ label, htmlFor, children, className = '' }: {
  label: string; htmlFor?: string; children: ReactNode; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">{label}</label>
      {children}
    </div>
  );
}
