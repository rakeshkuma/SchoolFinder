import { useEffect } from 'react';

const SITE = 'SchoolDhundo';

/** The address the app started on: the page whose <head> the server wrote (see SeoHeadService and index.html). */
const firstPath = typeof window === 'undefined' ? '' : window.location.pathname;

/**
 * True while the app still shows the page the server described. The server writes a canonical link only for a page
 * it knows and that may be indexed, together with that page's full title and description; Google reads the page after
 * the app has run, so those are kept instead of being replaced by the app's shorter ones. Layout removes the canonical
 * link after the first navigation, and from then on the app sets every title itself.
 */
export function serverHeadInPlace(): boolean {
  return window.location.pathname === firstPath
    && document.head.querySelector('link[rel="canonical"]') !== null
    && document.head.querySelector('meta[name="robots"][content*="noindex"]') === null;
}

/**
 * True when the server's head for the first-loaded page names a preview photo (og:image). On a school profile the
 * server sets one only when the school has a real photo, so the page can keep room for it while the photos load.
 */
export function serverPageHasPhoto(): boolean {
  return window.location.pathname === firstPath
    && document.head.querySelector('meta[property="og:image"][data-seo="server"]') !== null;
}

/** Sets the page title and, when given, the meta description (restored to the previous one on leaving). */
export function useDocumentTitle(title: string | undefined, description?: string) {
  useEffect(() => {
    if (serverHeadInPlace()) return;
    document.title = title ? `${title} · ${SITE}` : `${SITE}: Find Schools, Rankings, Admissions & Exam Prep`;
  }, [title]);
  useEffect(() => {
    if (!description || serverHeadInPlace()) return undefined;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const previous = meta.content;
    meta.content = description;
    return () => {
      if (meta) meta.content = previous;
    };
  }, [description]);
}
