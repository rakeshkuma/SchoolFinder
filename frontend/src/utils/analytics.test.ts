import { describe, expect, it } from 'vitest';
import { analyticsConfigured, cleanParams, track } from './analytics';

describe('analytics', () => {
  it('drops parameters that could identify a person', () => {
    expect(cleanParams({ school_slug: 'abc', email: 'a@b.c', display_name: 'X', mobile: '9', auth_token: 't', count: 3, skipped: undefined }))
      .toEqual({ school_slug: 'abc', count: 3 });
  });

  it('shortens long values', () => {
    expect(String(cleanParams({ filters: 'x'.repeat(300) }).filters)).toHaveLength(100);
  });

  it('does nothing without a measurement ID or consent', () => {
    expect(analyticsConfigured()).toBe(false);
    expect(() => track('school_search', { state: 'BR' })).not.toThrow();
    expect(window.gtag).toBeUndefined();
  });
});
