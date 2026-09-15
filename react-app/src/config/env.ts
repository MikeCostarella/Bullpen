/**
 * Where the app finds its API. Both routes are relative so the same build
 * works behind the Vite dev proxy today and behind the Bullpen backend
 * later. Override with VITE_API_BASE (e.g. "https://bullpen-api.azurewebsites.net")
 * when the backend exists and the PWA is served from GitHub Pages.
 */
const apiBase = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? "";

export const env = {
  apiBase,
  /** Set VITE_BETA=true in the Pages build to show the Beta pill and tester hints. */
  beta: String(import.meta.env.VITE_BETA ?? "").toLowerCase() === "true",
  tradingApi: `${apiBase}/api/trading`,
  dataApi: `${apiBase}/api/data`,
  fundamentalsApi: `${apiBase}/api/fundamentals`,
  fundamentals: typeof __FUNDAMENTALS__ === "undefined" ? false : __FUNDAMENTALS__,
  paper: typeof __PAPER__ === "undefined" ? true : __PAPER__,
  buildTime: typeof __BUILD_TIME__ === "undefined" ? "" : __BUILD_TIME__,
} as const;
