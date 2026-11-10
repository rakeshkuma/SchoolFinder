/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  /** Google Analytics 4 measurement ID (G-XXXXXXXXXX). Unset: no analytics and no consent banner. */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** Google AdSense publisher ID (ca-pub-XXXXXXXXXXXXXXXX). Unset: ad slots render nothing. */
  readonly VITE_ADSENSE_CLIENT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
