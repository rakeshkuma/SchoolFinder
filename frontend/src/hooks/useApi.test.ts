import { afterEach, describe, expect, it, vi } from 'vitest';
import { readCache, writeCache } from './useApi';

afterEach(() => {
  localStorage.clear();
  vi.useRealTimers();
});

describe('remembered answers (useApi cache key)', () => {
  it('keeps the last good answer for a week, then forgets it', () => {
    vi.useFakeTimers();
    writeCache('home.featured', [{ name: 'Sainik School Tilaiya' }]);
    expect(readCache('home.featured')).toEqual([{ name: 'Sainik School Tilaiya' }]);
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000);
    expect(readCache('home.featured')).toBeNull();
  });

  it('stores nothing without a key, and skips answers too large for the browser', () => {
    writeCache(undefined, [1, 2, 3]);
    expect(localStorage.length).toBe(0);
    writeCache('home.big', 'x'.repeat(200_000));
    expect(readCache('home.big')).toBeNull();
  });

  it('treats unreadable storage as nothing remembered', () => {
    localStorage.setItem('sd.cache.v1.home.broken', '{not json');
    expect(readCache('home.broken')).toBeNull();
  });
});
