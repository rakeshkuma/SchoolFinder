import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/http';

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  reload: () => void;
}

/**
 * Runs `fetcher` whenever `deps` change. Stale responses (from an earlier deps value) are ignored,
 * so fast typing in filters never shows out-of-order results.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[], enabled = true): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
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
        if (id === requestId.current) setData(result);
      })
      .catch((e: unknown) => {
        if (id === requestId.current) {
          setError(e instanceof ApiError ? e : new ApiError('Something went wrong.', 0));
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [run, nonce, enabled]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
