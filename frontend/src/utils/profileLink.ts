/**
 * Props for a <Link> to a school profile that opens one of its sections (boarding, ranking, fees …).
 *
 * The link's address is always the plain profile URL, the page search engines should index. The profile shows only the
 * chosen section, so to a crawler that runs the app a ?tab= address looks like a different page: in November 2026 Google
 * indexed ten profiles only at their ?tab=boarding or ?tab=ranking address, the addresses these cards used to link to.
 * The section now travels in the navigation state; SchoolDetailPage opens it and writes it into its own address as the
 * #fragment (utils/sectionAddress), so the visitor can still share the page at that section.
 */
export interface ProfileLinkProps {
  to: string;
  state?: ProfileLinkState;
}

export interface ProfileLinkState {
  tab: string;
}

export function profileLink(slug: string, tab?: string): ProfileLinkProps {
  const to = `/schools/${slug}`;
  return tab && tab !== 'overview' ? { to, state: { tab } } : { to };
}

/**
 * Link props for a site path that may name a profile section the old way (/schools/x?tab=admissions, as the updates feed
 * sends it): such a path becomes a profileLink; any other path is linked as it is.
 */
export function linkTo(path: string): ProfileLinkProps {
  const m = /^\/schools\/([^/?#]+)\?tab=([a-z]+)$/.exec(path);
  return m ? profileLink(m[1], m[2]) : { to: path };
}

/** The section a profileLink asked for, if the navigation state carries one. */
export function requestedTab(state: unknown): string | null {
  if (state && typeof state === 'object' && 'tab' in state) {
    const tab = (state as { tab: unknown }).tab;
    return typeof tab === 'string' && tab ? tab : null;
  }
  return null;
}
