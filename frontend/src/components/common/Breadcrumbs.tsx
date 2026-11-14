import { Link } from 'react-router-dom';

/** Breadcrumbs for the dark page header; the last item is the current page. */
export function Breadcrumbs({ items }: { items: { to: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.to} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-slate-500">/</span>}
            {i === items.length - 1
              ? <span aria-current="page" className="text-slate-200">{item.label}</span>
              : <Link to={item.to} className="text-slate-300 hover:text-white">{item.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
