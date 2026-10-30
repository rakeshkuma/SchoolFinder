import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorBody } from '../types/api';

const TOKEN_KEY = 'dsf.admin.token';

/**
 * Admin tokens are short-lived (15 min) and kept in sessionStorage: they survive a page refresh but
 * are cleared when the tab closes, and are never sent to any origin other than the API.
 */
export const tokenStore = {
  get(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token: string) {
    try {
      sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable: the session simply won't survive a reload */
    }
  },
  clear() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export const http = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`,
  timeout: 20000,
  headers: { Accept: 'application/json' },
  // Repeat array params as ?schoolIds=1&schoolIds=2, which Spring binds to List<Long>.
  paramsSerializer: { indexes: null },
});

// Identical GETs already in flight share one network request instead of hitting the API again.
const inflight = new Map<string, Promise<AxiosResponse>>();
const networkAdapter = axios.getAdapter(axios.defaults.adapter);
http.defaults.adapter = (config) => {
  if ((config.method ?? 'get').toLowerCase() !== 'get') return networkAdapter(config);
  const key = `${http.getUri(config)}|${String(config.headers?.Authorization ?? '')}`;
  const pending = inflight.get(key);
  // Each caller gets its own response object: axios transforms response.data in place after the adapter.
  const share = (p: Promise<AxiosResponse>) => p.then((r) => ({ ...r, config }));
  if (pending) return share(pending);
  const request = networkAdapter(config).finally(() => inflight.delete(key));
  inflight.set(key, request);
  return share(request);
};

http.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token && config.url?.startsWith('/admin')) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;
export function setUnauthorizedListener(listener: UnauthorizedListener | null) {
  onUnauthorized = listener;
}

/** Temporary failures worth retrying: no response at all, or a gateway/unavailable answer. */
const RETRYABLE_STATUS = new Set([502, 503, 504]);
const RETRY_DELAYS_MS = [700, 2000];

type RetriableConfig = InternalAxiosRequestConfig & { retryCount?: number };

function shouldRetry(error: AxiosError): boolean {
  const config = error.config as RetriableConfig | undefined;
  // Only reads are retried: repeating a write could apply it twice.
  if (!config || (config.method ?? 'get').toLowerCase() !== 'get') return false;
  if ((config.retryCount ?? 0) >= RETRY_DELAYS_MS.length || axios.isCancel(error)) return false;
  return error.response ? RETRYABLE_STATUS.has(error.response.status) : error.code !== 'ECONNABORTED';
}

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorBody>) => {
    if (shouldRetry(error)) {
      const config = error.config as RetriableConfig;
      const attempt = config.retryCount ?? 0;
      config.retryCount = attempt + 1;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
      return http(config);
    }
    if (error.response?.status === 401 && error.config?.url?.startsWith('/admin')) {
      tokenStore.clear();
      onUnauthorized?.();
    }
    return Promise.reject(toApiError(error));
  },
);

/** Normalised error used throughout the UI. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: { field: string; message: string }[] = [],
    /** Stable code for outcomes the UI acts on (e.g. EMAIL_NOT_VERIFIED), when the server gives one. */
    public readonly code?: string,
  ) {
    super(message);
  }
}

/** Plain-language fallback for each status, used when the server sends no message of its own. */
export function statusMessage(status: number): string {
  if (status === 400) return 'Some of the details sent were not valid. Check them and try again.';
  if (status === 401) return 'Please sign in to continue.';
  if (status === 403) return 'You do not have permission to view this.';
  if (status === 404) return 'We could not find what you were looking for. It may have moved or been removed.';
  if (status === 409) return 'This conflicts with information that already exists.';
  if (status === 429) return 'Too many requests in a short time. Please wait a moment and try again.';
  if (status === 502 || status === 503 || status === 504) return 'The service is temporarily unavailable. Please try again shortly.';
  if (status >= 500) return 'Something went wrong on our side. Please try again in a moment.';
  return 'The request could not be completed. Please try again.';
}

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.response) {
    const { status, data } = error.response;
    const body = data && typeof data === 'object' ? data : undefined;
    // API messages are written for users; an unexpected server error (500) gets the plain-language wording instead.
    const message = status !== 500 && body?.message ? body.message : statusMessage(status);
    const code = body?.error && /^[A-Z][A-Z_]+$/.test(body.error) ? body.error : undefined;
    return new ApiError(message, status, body?.fieldErrors ?? [], code);
  }
  if (error.code === 'ECONNABORTED') {
    return new ApiError('The server took too long to respond. Please try again.', 0);
  }
  return new ApiError('Could not reach the server. Check your connection and try again.', 0);
}

/** Drops undefined, null and empty-string params so they are not sent as "undefined". */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  ) as Partial<T>;
}
