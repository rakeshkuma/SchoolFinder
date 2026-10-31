import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, http, statusMessage } from './http';

/** Fake transport answering with the given statuses in turn (0 = network failure). */
function transport(...statuses: number[]) {
  const calls: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config);
    const status = statuses[Math.min(calls.length - 1, statuses.length - 1)];
    if (status === 0) throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response = { data: status < 400 ? { ok: true } : {}, status, statusText: '', headers: new AxiosHeaders(), config };
    if (status >= 400) throw new AxiosError('failed', 'ERR_BAD_RESPONSE', config, null, response);
    return response;
  };
  return { adapter, calls };
}

describe('http client', () => {
  afterEach(() => vi.useRealTimers());

  it('retries a GET after a temporary failure and returns the later success', async () => {
    vi.useFakeTimers();
    const { adapter, calls } = transport(503, 0, 200);
    const result = http.get('/stats', { adapter });
    await vi.runAllTimersAsync();
    await expect(result).resolves.toMatchObject({ data: { ok: true } });
    expect(calls).toHaveLength(3);
  });

  it('gives up after two retries with a friendly message', async () => {
    vi.useFakeTimers();
    const { adapter, calls } = transport(503);
    const result = http.get('/stats', { adapter }).catch((e: unknown) => e);
    await vi.runAllTimersAsync();
    const error = (await result) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(error.message).toBe(statusMessage(503));
    expect(calls).toHaveLength(3);
  });

  it('never repeats a write', async () => {
    const { adapter, calls } = transport(503);
    await expect(http.post('/reviews', {}, { adapter })).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(1);
  });

  it('does not retry client errors and maps a body-less 500 to plain language', async () => {
    const notFound = transport(404);
    await expect(http.get('/schools/1', { adapter: notFound.adapter })).rejects.toMatchObject({ status: 404 });
    expect(notFound.calls).toHaveLength(1);

    const crash = transport(500);
    await expect(http.get('/schools/1', { adapter: crash.adapter }))
      .rejects.toMatchObject({ status: 500, message: 'Something went wrong on our side. Please try again in a moment.' });
    expect(crash.calls).toHaveLength(1);
  });

  it('has a message for every status the UI distinguishes', () => {
    for (const s of [400, 401, 403, 404, 409, 429, 500, 502, 503, 504]) {
      expect(statusMessage(s)).not.toMatch(/\(\d{3}\)/);
    }
  });
});
