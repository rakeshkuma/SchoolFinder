import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const MAX_COMPARE = 4;
const STORAGE_KEY = 'dsf.compare';

export interface CompareItem {
  id: number;
  name: string;
  slug: string;
}

interface CompareContextValue {
  items: CompareItem[];
  has: (id: number) => boolean;
  toggle: (item: CompareItem) => void;
  remove: (id: number) => void;
  /** Replaces the selection (capped at MAX_COMPARE), e.g. "compare the top schools of this ranking". */
  replace: (items: CompareItem[]) => void;
  clear: () => void;
  isFull: boolean;
}

const CompareContext = createContext<CompareContextValue | null>(null);

function load(): CompareItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CompareItem[]) : [];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

/** Schools picked for comparison, remembered per browser (no personal data). */
export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CompareItem[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage unavailable */
    }
  }, [items]);

  const toggle = useCallback((item: CompareItem) => {
    setItems((current) => {
      if (current.some((i) => i.id === item.id)) return current.filter((i) => i.id !== item.id);
      if (current.length >= MAX_COMPARE) return current;
      return [...current, item];
    });
  }, []);

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      has: (id) => items.some((i) => i.id === id),
      toggle,
      remove: (id) => setItems((c) => c.filter((i) => i.id !== id)),
      replace: (next) => setItems(next.slice(0, MAX_COMPARE)),
      clear: () => setItems([]),
      isFull: items.length >= MAX_COMPARE,
    }),
    [items, toggle],
  );
  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
