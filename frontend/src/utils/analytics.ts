/**
 * Google Analytics 4, loaded only when a measurement ID is configured at build time (VITE_GA_MEASUREMENT_ID) and the
 * visitor has accepted analytics in the consent banner. Until then nothing is sent to Google and track() does nothing.
 *
 * Events carry only what describes the page or action (a school's slug, an exam's slug, a search's filters) — never
 * names, emails, mobile numbers, passwords, tokens or free text a visitor typed about themselves.
 */

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? '').trim();
const CONSENT_KEY = 'sd-consent-analytics';

export type Consent = 'granted' | 'denied';

type Gtag = (...args: unknown[]) => void;
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

/** Event names reported to GA4, so call sites cannot drift apart. */
export type AnalyticsEvent =
  | 'school_search'
  | 'school_profile_view'
  | 'school_comparison'
  | 'exam_page_view'
  | 'quiz_start'
  | 'quiz_complete'
  | 'google_sign_in'
  | 'user_registration';

type Params = Record<string, string | number | boolean | undefined>;

/** Parameters that could identify a person are dropped even if a caller passes them by mistake. */
const BLOCKED = /email|name|phone|mobile|password|token|query_text/i;

export function cleanParams(params: Params = {}): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || BLOCKED.test(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 100) : v;
  }
  return out;
}

export function analyticsConfigured(): boolean {
  return /^G-[A-Z0-9]{4,}$/.test(GA_ID);
}

export function storedConsent(): Consent | null {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

let loaded = false;

/** Adds Google's tag once. Page views are sent by trackPageView (the app changes pages without reloading). */
function load() {
  if (loaded || !analyticsConfigured()) return;
  loaded = true;
  window.dataLayer = window.dataLayer ?? [];
  // gtag must push the arguments object itself, as Google's snippet does.
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: false, anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/** Records the visitor's choice; accepting starts analytics at once, declining keeps it off. */
export function setConsent(choice: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, choice);
  } catch {
    /* private mode: the choice lasts for this page only */
  }
  if (choice === 'granted') {
    load();
    trackPageView(window.location.pathname);
  }
  window.dispatchEvent(new Event('sd-consent-change'));
}

/** Forgets the choice so the banner asks again (footer "Cookie settings"). */
export function resetConsent() {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* nothing stored */
  }
  window.dispatchEvent(new Event('sd-consent-change'));
}

/** Starts analytics on page load when the visitor accepted earlier. */
export function initAnalytics() {
  if (analyticsConfigured() && storedConsent() === 'granted') load();
}

function active(): boolean {
  return loaded && storedConsent() === 'granted' && typeof window.gtag === 'function';
}

export function trackPageView(path: string) {
  if (!active()) return;
  window.gtag?.('event', 'page_view', { page_path: path, page_location: window.location.origin + path, page_title: document.title });
}

export function track(event: AnalyticsEvent, params?: Params) {
  if (!active()) return;
  window.gtag?.('event', event, cleanParams(params));
}
