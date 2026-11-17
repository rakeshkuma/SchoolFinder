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
 * The text and the button sit side by side only when the box has room for both (it wraps by its own width, not the
 * screen's), so in a narrow sidebar the button goes under the text instead of squeezing it to a word per line.
 */
export function SignInOptions({ text, next, bare = false }: { text: string; next?: string; bare?: boolean }) {
  const { status } = useMember();
  const back = useBackHere(next);
  if (status !== 'signedOut') return null;
  return (
    <section aria-label="Sign in" className={`flex flex-wrap items-center justify-between gap-3 ${bare ? 'border-t border-slate-100 pt-3' : 'card p-4'}`}>
      <p className="min-w-[14rem] flex-1 text-sm text-slate-600">{text}</p>
      <div className="w-full shrink-0 space-y-1.5 sm:w-64">
        <GoogleButton next={back} />
      </div>
    </section>
  );
}
