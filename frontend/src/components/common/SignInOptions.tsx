import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMember } from '../../hooks/useMember';
import { GoogleButton } from './GoogleButton';

function useBackHere(next?: string) {
  const { pathname, search } = useLocation();
  return next ?? `${pathname}${search}`;
}

/** A sign-in link that returns to this page afterwards. */
export function SignInLink({ next, children = 'sign in' }: { next?: string; children?: ReactNode }) {
  const back = useBackHere(next);
  return <Link to={`/signin?next=${encodeURIComponent(back)}`} className="link">{children}</Link>;
}

/**
 * For signed-out visitors: why to sign in, then the Google button (when configured). Pass `next` when returning to this
 * exact address would lose something, such as a finished test. `bare` is for use inside a card.
 */
export function SignInOptions({ text, next, bare = false }: { text: string; next?: string; bare?: boolean }) {
  const { status } = useMember();
  const back = useBackHere(next);
  if (status !== 'signedOut') return null;
  return (
    <section aria-label="Sign in" className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${bare ? 'border-t border-slate-100 pt-3' : 'card p-4'}`}>
      <p className="min-w-0 text-sm text-slate-600">{text}</p>
      <div className="w-full shrink-0 space-y-1.5 sm:w-64">
        <GoogleButton next={back} />
      </div>
    </section>
  );
}
