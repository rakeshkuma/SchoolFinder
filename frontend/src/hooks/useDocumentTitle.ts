import { useEffect } from 'react';

const SITE = 'SchoolDhundo';

/** Sets the page title and, when given, the meta description (restored to the previous one on leaving). */
export function useDocumentTitle(title: string | undefined, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} – Discover Schools, Rankings, Admissions & Exam Preparation`;
  }, [title]);
  useEffect(() => {
    if (!description) return undefined;
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
