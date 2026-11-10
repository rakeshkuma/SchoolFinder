import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsConfigured, setConsent, storedConsent } from '../../utils/analytics';

/** True once the visitor has accepted analytics (and, when configured, ads); updates when the choice changes. */
export function useConsentGranted(): boolean {
  const [granted, setGranted] = useState(() => storedConsent() === 'granted');
  useEffect(() => {
    const update = () => setGranted(storedConsent() === 'granted');
    window.addEventListener('sd-consent-change', update);
    return () => window.removeEventListener('sd-consent-change', update);
  }, []);
  return granted;
}

/**
 * Asks once whether Google Analytics may be used. Shown only when analytics is configured for this build and the
 * visitor has not chosen yet; both buttons are equally prominent, and declining keeps the whole site working.
 */
export function ConsentBanner() {
  const [choice, setChoice] = useState(() => storedConsent());
  useEffect(() => {
    const update = () => setChoice(storedConsent());
    window.addEventListener('sd-consent-change', update);
    return () => window.removeEventListener('sd-consent-change', update);
  }, []);
  if (!analyticsConfigured() || choice) return null;
  return (
    <div role="region" aria-label="Cookie choice" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-lift backdrop-blur">
      <div className="container-page flex flex-col gap-3 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-3xl">
          May we use Google Analytics cookies to count visits and see which pages help? We never send your name, email or
          answers. You can change this any time under “Cookie settings” at the bottom of each page.{' '}
          <Link to="/privacy#analytics" className="link">Privacy Policy</Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" className="btn-secondary px-4 py-2" onClick={() => setConsent('denied')}>Decline</button>
          <button type="button" className="btn-primary px-4 py-2" onClick={() => setConsent('granted')}>Accept</button>
        </div>
      </div>
    </div>
  );
}
