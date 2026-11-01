/**
 * Small, bounded lists kept in this browser's localStorage (saved schools, recently viewed, recent searches).
 * Storage can be unavailable (private mode, blocked site data), so every access is guarded and an
 * in-memory copy keeps the page working for the current visit.
 */
export interface LocalList<T> {
  get(): T[];
  add(item: T): void;
  remove(item: T): void;
  clear(): void;
  /** Replaces the whole list (e.g. with the copy saved in the member's account). */
  replace(items: T[]): void;
  subscribe(listener: () => void): () => void;
}

/** A boolean preference stored the same way (default false). */
export interface LocalFlag {
  get(): boolean;
  set(value: boolean): void;
  subscribe(listener: () => void): () => void;
}

export function createLocalFlag(key: string): LocalFlag {
  const list = createLocalList<true>(key, 1, () => 'on');
  return {
    get: () => list.get().length > 0,
    set: (value) => (value ? list.add(true) : list.clear()),
    subscribe: list.subscribe,
  };
}

export function createLocalList<T>(key: string, max: number, identity: (item: T) => string): LocalList<T> {
  let memory: T[] | null = null;
  const listeners = new Set<() => void>();

  const read = (): T[] => {
    if (memory) return memory;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : [];
      memory = Array.isArray(parsed) ? (parsed as T[]).slice(0, max) : [];
    } catch {
      memory = [];
    }
    return memory;
  };

  const write = (items: T[]) => {
    memory = items;
    try {
      window.localStorage.setItem(key, JSON.stringify(items));
    } catch {
      // keep the in-memory copy only
    }
    listeners.forEach((l) => l());
  };

  return {
    get: read,
    // Most recent first; re-adding moves an item to the front.
    add: (item) => write([item, ...read().filter((i) => identity(i) !== identity(item))].slice(0, max)),
    remove: (item) => write(read().filter((i) => identity(i) !== identity(item))),
    clear: () => write([]),
    replace: (items) => write(items.slice(0, max)),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
