import type { ReactNode } from 'react';
import type { ApiError } from '../../services/http';

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-12 text-slate-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card overflow-hidden">
          <div className="h-32 animate-pulse bg-slate-100" />
          <div className="space-y-3 p-5">
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
            <div className="h-6 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function errorTitle(status: number | undefined): string {
  if (status === 0) return 'You seem to be offline, or the server can’t be reached.';
  if (status === 401) return 'Sign-in needed';
  if (status === 403) return 'Access restricted';
  if (status === 404) return 'Not found';
  if (status === 429) return 'Please slow down';
  if (status === 502 || status === 503 || status === 504) return 'Temporarily unavailable';
  return 'We couldn’t load this information.';
}

export function ErrorState({ error, onRetry }: { error: ApiError | Error; onRetry?: () => void }) {
  const status = 'status' in error ? error.status : undefined;
  // Retrying cannot fix a missing page or a permission problem, so the button is offered only where it can help.
  const retryable = onRetry && status !== 401 && status !== 403 && status !== 404;
  const notFound = status === 404;
  return (
    <div role="alert" className={`card p-6 text-center ${notFound ? 'border-slate-200' : 'border-red-200 bg-red-50'}`}>
      <p className={`font-medium ${notFound ? 'text-ink' : 'text-red-800'}`}>{errorTitle(status)}</p>
      <p className={`mt-1 text-sm ${notFound ? 'text-slate-600' : 'text-red-700'}`}>{error.message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {retryable && (
          <button type="button" onClick={onRetry} className="btn-secondary">
            Try again
          </button>
        )}
        {notFound && <a href="/" className="btn-secondary">Go to the home page</a>}
      </div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600" aria-hidden>
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
          <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />
        </svg>
      </span>
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      {children && <div className="mt-2 max-w-md text-sm text-slate-600">{children}</div>}
    </div>
  );
}

/** Wraps the three async states so pages stay declarative. */
export function AsyncContent<T>({
  state,
  children,
  loading,
  isEmpty,
  empty,
}: {
  state: { data: T | null; loading: boolean; error: ApiError | null; reload: () => void };
  children: (data: T) => ReactNode;
  loading?: ReactNode;
  isEmpty?: (data: T) => boolean;
  empty?: ReactNode;
}) {
  if (state.error) return <ErrorState error={state.error} onRetry={state.reload} />;
  if (state.loading && state.data === null) return <>{loading ?? <Spinner />}</>;
  if (state.data === null) return null;
  if (isEmpty?.(state.data)) return <>{empty ?? <EmptyState title="Nothing to show yet." />}</>;
  return <>{children(state.data)}</>;
}
