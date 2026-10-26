import { Link } from 'react-router-dom';

/**
 * Page controls. With `hrefFor`, every control is a real link (shareable, opens in a new tab, and browser back/forward
 * move between pages); without it, controls are buttons that call `onChange`.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  onChange?: (page: number) => void;
  hrefFor?: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = visiblePages(page, totalPages);
  const control = (target: number, label: React.ReactNode, className: string, extra: Record<string, string | undefined> = {}) => {
    const disabled = target < 0 || target >= totalPages;
    if (hrefFor && !disabled) {
      return <Link to={hrefFor(target)} className={className} {...extra} onClick={() => window.scrollTo({ top: 0 })}>{label}</Link>;
    }
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => onChange?.(target)} {...extra}>
        {label}
      </button>
    );
  };
  return (
    <nav aria-label="Pagination" className="mt-8 flex flex-col items-center gap-2">
      <div className="flex flex-wrap items-center justify-center gap-1">
        {control(page - 1, '‹ Prev', 'btn-secondary px-3', { rel: hrefFor ? 'prev' : undefined })}
        {pages.map((p, i) =>
          p === -1 ? (
            <span key={`gap-${i}`} className="px-2 text-slate-500">…</span>
          ) : (
            <span key={p}>
              {control(p, p + 1,
                `btn px-3 ${p === page ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`,
                { 'aria-current': p === page ? 'page' : undefined, 'aria-label': `Page ${p + 1}` })}
            </span>
          ),
        )}
        {control(page + 1, 'Next ›', 'btn-secondary px-3', { rel: hrefFor ? 'next' : undefined })}
      </div>
      <p className="text-xs text-slate-500">Page {page + 1} of {totalPages.toLocaleString('en-IN')}</p>
    </nav>
  );
}

/** Zero-based page numbers with -1 marking an ellipsis. */
export function visiblePages(page: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const set = new Set([0, total - 1, page - 1, page, page + 1].filter((p) => p >= 0 && p < total));
  const sorted = [...set].sort((a, b) => a - b);
  const result: number[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push(-1);
    result.push(p);
  });
  return result;
}
