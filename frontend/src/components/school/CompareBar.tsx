import { Link, useLocation } from 'react-router-dom';
import { MAX_COMPARE, useCompare } from '../../hooks/useCompare';
import { Icon } from '../common/Icon';

export function CompareButton({ id, name, slug }: { id: number; name: string; slug: string }) {
  const { has, toggle, isFull } = useCompare();
  const selected = has(id);
  return (
    <button
      type="button"
      onClick={() => toggle({ id, name, slug })}
      disabled={!selected && isFull}
      aria-pressed={selected}
      title={!selected && isFull ? `You can compare up to ${MAX_COMPARE} schools` : undefined}
      className={`btn rounded-full px-3 py-1.5 text-xs ${selected ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-slate-300 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700'}`}
    >
      {selected ? <><Icon name="check" className="h-3.5 w-3.5" /> Comparing</> : <><Icon name="scale" className="h-3.5 w-3.5" /> Compare</>}
    </button>
  );
}

export function CompareBar() {
  const { items, remove, clear } = useCompare();
  const location = useLocation();
  if (items.length === 0 || location.pathname.startsWith('/compare') || location.pathname.startsWith('/admin')) return null;
  return (
    <div className="pointer-events-none sticky bottom-4 z-30 px-4">
      <div className="pointer-events-auto mx-auto flex max-w-4xl flex-wrap items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-lift ring-1 ring-white/10">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Icon name="scale" className="h-4 w-4 text-accent-300" /> Compare {items.length}/{MAX_COMPARE}
        </span>
        <ul className="hidden flex-1 flex-wrap gap-2 md:flex">
          {items.map((item) => (
            <li key={item.id} className="chip bg-white/10 py-1 text-white ring-1 ring-white/15">
              <span className="max-w-[180px] truncate">{item.name}</span>
              <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`} className="ml-0.5 text-slate-300 hover:text-white">
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={clear} className="btn px-3 py-1.5 text-xs text-slate-300 hover:bg-white/10 hover:text-white">
          Clear
        </button>
        <Link to="/compare" className="btn-accent rounded-full px-4 py-1.5 text-xs">
          Compare now <Icon name="arrowRight" className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
