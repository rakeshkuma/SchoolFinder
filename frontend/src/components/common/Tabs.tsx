import { useId, type ReactNode } from 'react';

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/** Accessible tabs; the active tab is controlled so it can live in the URL. */
export function Tabs({ tabs, active, onChange, label = 'School information' }: {
  tabs: TabDef[];
  active: string;
  onChange: (id: string) => void;
  label?: string;
}) {
  const base = useId();
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div>
      <div role="tablist" aria-label={label}
        className="no-scrollbar sticky top-[68px] z-20 -mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 bg-canvas/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
        {tabs.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              id={`${base}-${tab.id}-tab`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${base}-${tab.id}-panel`}
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                selected ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-600 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${base}-${current.id}-panel`} aria-labelledby={`${base}-${current.id}-tab`} className="pt-6">
        {current.content}
      </div>
    </div>
  );
}
