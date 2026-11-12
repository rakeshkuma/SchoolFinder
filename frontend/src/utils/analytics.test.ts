import { afterEach, describe, expect, it } from 'vitest';
import { analyticsConfigured, cleanParams, consentNeeded, resetConsent, setConsent, track } from './analytics';

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

  describe('with Google Tag Manager on the page', () => {
    const addTagManager = () => {
      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-PZ7WSXBS';
      document.head.appendChild(script);
      window.dataLayer = [];
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer?.push(arguments);
      };
    };
    afterEach(() => {
      document.head.querySelectorAll('script[src*="gtm.js"]').forEach((s) => s.remove());
      localStorage.clear();
      delete window.gtag;
      delete window.dataLayer;
    });

    it('asks for consent, and never installs gtag.js as well', () => {
      addTagManager();
      expect(consentNeeded()).toBe(true);
      expect(analyticsConfigured()).toBe(false);
      expect(document.querySelector('script[src*="gtag/js"]')).toBeNull();
    });

    it('passes events only after Accept, with the consent update first', () => {
      addTagManager();
      track('school_search', { state: 'BR', email: 'a@b.c' });
      expect(window.dataLayer).toEqual([]);
      setConsent('granted');
      expect(Array.from(window.dataLayer?.[0] as IArguments)).toEqual(['consent', 'update', { analytics_storage: 'granted' }]);
      track('school_search', { state: 'BR', email: 'a@b.c' });
      expect(window.dataLayer?.[1]).toEqual({ event: 'school_search', state: 'BR' });
      resetConsent();
      expect(Array.from(window.dataLayer?.[2] as IArguments)).toEqual(['consent', 'update', { analytics_storage: 'denied' }]);
      track('quiz_start', { mode: 'SET' });
      expect(window.dataLayer).toHaveLength(3);
    });
  });
});
