/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __BUILD_TIME__: string;
/** true when the dev proxy points at paper-api.alpaca.markets */
declare const __PAPER__: boolean;
/** true when a FINNHUB_KEY is configured, so /api/fundamentals is live */
declare const __FUNDAMENTALS__: boolean;
