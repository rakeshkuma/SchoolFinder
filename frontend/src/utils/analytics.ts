/**
 * Analytics, only with the visitor's consent. Two ways in, never both in one build:
 * - Google Tag Manager (GTM-PZ7WSXBS), added by index.html with Consent Mode defaults of "denied". GA4 is configured
 *   inside Tag Manager; this module tells Google about the visitor's choice (consent update) and, after Accept, passes
 *   the site's events to Tag Manager's dataLayer. Page views come from GA4's own history tracking in Tag Manager.
 * - Direct gtag.js, only when VITE_GA_MEASUREMENT_ID is set at build time and Tag Manager is not on the page.
 * Without consent track() does nothing.
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

/** True when Google Tag Manager's container script is on the page (production index.html). */
export function tagManagerPresent(): boolean {
  return typeof document !== 'undefined' && document.querySelector('script[src^="https://www.googletagmanager.com/gtm.js"]') !== null;
}

/** Direct gtag.js: only with a measurement ID and no Tag Manager, so GA4 is never installed twice. */
export function analyticsConfigured(): boolean {
  return /^G-[A-Z0-9]{4,}$/.test(GA_ID) && !tagManagerPresent();
}

/** Whether the cookie banner and the footer's "Cookie settings" are needed: some Google tag can run on this page. */
export function consentNeeded(): boolean {
  return tagManagerPresent() || analyticsConfigured();
}

/** Google Consent Mode update for Tag Manager (the default "denied" state is set in index.html). */
function updateConsentMode(choice: Consent) {
  if (tagManagerPresent() && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', { analytics_storage: choice });
  }
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
  updateConsentMode(choice);
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
  updateConsentMode('denied');
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
  if (tagManagerPresent()) {
    // Tag Manager reads these as Custom Event triggers; nothing is passed before the visitor accepts.
    if (storedConsent() === 'granted') window.dataLayer?.push({ event, ...cleanParams(params) });
    return;
  }
  if (!active()) return;
  window.gtag?.('event', event, cleanParams(params));
}
