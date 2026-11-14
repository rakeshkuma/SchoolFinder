import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/http';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

const CACHE_PREFIX = 'sd.cache.v1.';
/** A remembered answer older than this is not shown. */
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Large answers are not worth a place in the browser's small storage. */
const CACHE_MAX_CHARS = 150_000;

export function readCache<T>(key: string | undefined): T | null {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { at, data } = JSON.parse(raw) as { at: number; data: T };
    return Date.now() - at < CACHE_MAX_AGE_MS ? data : null;
  } catch {
    return null;
  }
}

export function writeCache(key: string | undefined, data: unknown) {
  if (!key) return;
  try {
    const raw = JSON.stringify({ at: Date.now(), data });
    if (raw.length <= CACHE_MAX_CHARS) localStorage.setItem(CACHE_PREFIX + key, raw);
  } catch {
    /* storage full or blocked: the page simply has nothing remembered next time */
  }
}

/**
 * Runs `fetcher` whenever `deps` change. Stale responses (from an earlier deps value) are ignored,
 * so fast typing in filters never shows out-of-order results.
 *
 * With a `cacheKey` (for public content that is the same for everyone, such as the home page's lists) the last good
 * answer is kept in the browser: it is shown at once on the next visit while a fresh copy loads, and it stays on
 * screen instead of an error if the server cannot be reached.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[], enabled = true, cacheKey?: string): ApiState<T> {
  const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey));
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<ApiError | null>(null);
  const [nonce, setNonce] = useState(0);
  const requestId = useRef(0);

  // Callers list the values the fetcher reads in `deps`, like useEffect.
  const run = useCallback(fetcher, deps);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    run()
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result);
        writeCache(cacheKey, result);
      })
      .catch((e: unknown) => {
        if (id !== requestId.current) return;
        const remembered = readCache<T>(cacheKey);
        if (remembered !== null) {
          setData(remembered);
          return;
        }
        setError(e instanceof ApiError ? e : new ApiError('Something went wrong.', 0));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [run, nonce, enabled, cacheKey]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
