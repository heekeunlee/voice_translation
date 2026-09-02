/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the translation proxy (see worker/). When set at build time the
   * deployed app works for every visitor with no API key of their own, and no
   * key ever reaches the browser.
   */
  readonly VITE_PROXY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
