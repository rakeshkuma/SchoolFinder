import { useSyncExternalStore } from 'react';
import { createLocalFlag, createLocalList, type LocalFlag, type LocalList } from '../utils/localList';

/** Enough to link to a school without another request. */
export interface SchoolRef {
  id: number;
  name: string;
  slug: string;
  place: string;
}

// Kept only in this browser until accounts arrive; nothing here is sent to the server.
export const savedSchools = createLocalList<SchoolRef>('isf.savedSchools', 100, (s) => String(s.id));
export const recentSchools = createLocalList<SchoolRef>('isf.recentSchools', 8, (s) => String(s.id));
export const recentSearches = createLocalList<string>('isf.recentSearches', 8, (q) => q.trim().toLowerCase());
export const searchHistoryPaused = createLocalFlag('isf.searchHistoryPaused');
/** Exam slugs the visitor saved, most recent first. */
export const savedExams = createLocalList<string>('isf.savedExams', 50, (slug) => slug);

export function useLocalList<T>(list: LocalList<T>): T[] {
  return useSyncExternalStore(list.subscribe, list.get, list.get);
}

export function useLocalFlag(flag: LocalFlag): boolean {
  return useSyncExternalStore(flag.subscribe, flag.get, flag.get);
}

/** Records a search unless the visitor paused search history. */
export function rememberSearch(q: string) {
  const term = q.trim();
  if (term.length >= 2 && !searchHistoryPaused.get()) recentSearches.add(term);
}
