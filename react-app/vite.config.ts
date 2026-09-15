/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages project site: base MUST equal "/<RepoName>/".
const BASE = "/Bullpen/";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Read ALL env vars (third arg "" drops the VITE_ prefix filter) so the
  // Alpaca keys can live in .env.local WITHOUT a VITE_ prefix. Vite only
  // exposes VITE_* vars to the browser bundle, so these never ship to the
  // phone — they are used here, server-side, by the dev proxy only.
  const env = loadEnv(mode, process.cwd(), "");
  const paper = env.ALPACA_PAPER !== "false";
  // Explicit URL overrides exist for tests and for pointing at a local mock.
  const tradingTarget =
    env.ALPACA_TRADING_URL ||
    (paper ? "https://paper-api.alpaca.markets" : "https://api.alpaca.markets");
  const dataTarget = env.ALPACA_DATA_URL || "https://data.alpaca.markets";
  const alpacaHeaders: Record<string, string> = {
    "APCA-API-KEY-ID": env.ALPACA_KEY_ID ?? "",
    "APCA-API-SECRET-KEY": env.ALPACA_SECRET_KEY ?? "",
  };
  // Optional. Alpaca has no fundamentals (P/E, market cap, earnings dates);
  // a free Finnhub key unlocks them on the symbol detail panel.
  const finnhubKey = env.FINNHUB_KEY ?? "";
  const fundamentalsTarget = env.FUNDAMENTALS_URL || "https://finnhub.io/api/v1";

  return {
    base: BASE,
    define: {
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __PAPER__: JSON.stringify(paper),
      __FUNDAMENTALS__: JSON.stringify(finnhubKey !== ""),
    },
    server: {
      // Alpaca's REST APIs send no CORS headers, so the browser cannot call
      // them directly. The app talks to /api/trading and /api/data; in dev
      // this proxy forwards those to Alpaca and injects the keys. In
      // production the same two routes will be served by the Bullpen backend
      // (Azure Function / small API) — the client code never changes.
      proxy: {
        "/api/trading": {
          target: tradingTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/trading/, ""),
          headers: alpacaHeaders,
        },
        "/api/data": {
          target: dataTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/data/, ""),
          headers: alpacaHeaders,
        },
        "/api/fundamentals": {
          target: fundamentalsTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api\/fundamentals/, ""),
          headers: { "X-Finnhub-Token": finnhubKey },
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.png", "icons/apple-touch-icon.png"],
        manifest: {
          name: "Bullpen",
          short_name: "Bullpen",
          description:
            "Paper-trading warm-up pen: watchlist, charts, manual order ticket and trade journal on top of the Alpaca API.",
          theme_color: "#0f1419",
          background_color: "#0f1419",
          display: "standalone",
          orientation: "portrait",
          scope: BASE,
          start_url: BASE,
          icons: [
            { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" },
            {
              src: "icons/maskable-512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,png,svg,json}"],
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
          // Never cache broker/market-data responses: stale prices or a
          // replayed order response would be actively dangerous.
          navigateFallbackDenylist: [/^\/api\//],
        },
      }),
    ],
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
