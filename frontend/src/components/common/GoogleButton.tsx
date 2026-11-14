import { useMember } from '../../hooks/useMember';
import { googleSignInUrl } from '../../services/accountApi';
import { track } from '../../utils/analytics';

/**
 * "Sign in with Google" in Google's blue style: the coloured G on a white square, white text on blue. Shown only when
 * the server reports a configured Google client. A plain link: the server redirects to Google and back, so no Google
 * script runs on this site. `compact` is the header size: "Sign in" where the header is full (phones, and beside the desktop menus below 1536px).
 */
export function GoogleButton({ next, remember = false, label = 'Sign in with Google', compact = false }: {
  next: string; remember?: boolean; label?: string; compact?: boolean;
}) {
  const { config } = useMember();
  if (!config?.googleSignInEnabled) return null;
  return (
    <a href={googleSignInUrl(next, remember)} onClick={() => track('google_sign_in', { step: 'start' })}
      className={`inline-flex items-center gap-3 whitespace-nowrap rounded bg-[#1a73e8] p-0.5 font-medium text-white shadow-sm transition hover:bg-[#1765cc] hover:shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8] ${
        compact ? 'h-9 pr-3 text-sm' : 'h-11 w-full pr-4 text-base'}`}>
      <span className={`flex shrink-0 items-center justify-center rounded-sm bg-white ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-[18px] w-[18px]">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
      </span>
      {compact
        ? <span><span className="sm:hidden xl:inline 2xl:hidden">Sign in</span><span className="hidden sm:inline xl:hidden 2xl:inline">{label}</span></span>
        : <span className="flex-1 text-center">{label}</span>}
    </a>
  );
}
