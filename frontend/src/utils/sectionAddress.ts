import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestedTab } from './profileLink';

/**
 * A page section's address is the page's own URL with the section as its #fragment: /schools/x#fees, /exams/rimc#dates.
 *
 * Search engines treat everything after # as the same page, so a section never becomes a second copy of it. Sections
 * used to live in the query string (?tab=fees), and in November 2026 Google indexed some school profiles and exam
 * guides only at such addresses, because each one showed a single section. nginx now answers an old ?tab= address with
 * a permanent redirect to this form (see nginx.conf), and the pages still accept ?tab= from links inside the app.
 */

/** Exams whose /exams/{slug} is a preparation dashboard; their guide (dates, pattern, FAQ …) is /exams/{slug}/guide. */
export const PREP_EXAMS: ReadonlySet<string> = new Set(['jnvst', 'aissee', 'netarhat']);

/** The section a #fragment names (lower-case letters only, as every section id is), or null. */
export function sectionOf(hash: string): string | null {
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  return /^[a-z]+$/.test(id) ? id : null;
}

/** A link to one section of an exam's guide. */
export function examGuideSection(slug: string, section: string): string {
  return `/exams/${slug}${PREP_EXAMS.has(slug) ? '/guide' : ''}#${section}`;
}

/**
 * The section a tabbed page should open, and a function that opens another one.
 *
 * The section comes from the #fragment, else from an old ?tab= value, else from a card link's navigation state (see
 * profileLink), else it is `first`. An old ?tab= value or a navigation state is moved into the fragment once, so the
 * address bar always shows the form that can be shared. The caller checks the id against its own sections.
 */
export function useSectionAddress(first: string): { requested: string; open: (id: string) => void } {
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  const fromHash = sectionOf(hash);
  const legacy = new URLSearchParams(search).get('tab');
  const linked = requestedTab(state);

  const show = useCallback((id: string | null) => {
    const rest = new URLSearchParams(search);
    rest.delete('tab');
    const query = rest.toString();
    navigate({ pathname, search: query ? `?${query}` : '', hash: id && id !== first ? `#${id}` : '' },
      { replace: true, state: withoutTab(state) });
  }, [first, navigate, pathname, search, state]);

  useEffect(() => {
    if (legacy === null && (linked === null || fromHash !== null)) return;
    show(fromHash ?? legacy ?? linked);
  }, [fromHash, legacy, linked, show]);

  return { requested: fromHash ?? legacy ?? linked ?? first, open: show };
}

/**
 * The navigation state without a card link's section request, which the fragment carries from then on. Anything else
 * in it (such as the list an exam guide was opened from) is kept.
 */
export function withoutTab(state: unknown): unknown {
  if (!state || typeof state !== 'object' || !('tab' in state)) return state;
  const rest: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) if (key !== 'tab') rest[key] = value;
  return Object.keys(rest).length > 0 ? rest : null;
}
