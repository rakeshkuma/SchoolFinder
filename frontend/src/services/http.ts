import axios, { AxiosError } from 'axios';
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

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
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

function toApiError(error: AxiosError<ApiErrorBody>): ApiError {
  if (error.response) {
    const body = error.response.data;
    const message = body?.message ?? `Request failed (${error.response.status})`;
    const code = body?.error && /^[A-Z][A-Z_]+$/.test(body.error) ? body.error : undefined;
    return new ApiError(message, error.response.status, body?.fieldErrors ?? [], code);
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
