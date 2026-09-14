# CHANGES

## 0.1.0 — Milestone 1: manual paper trading (2026-09-13)

Initial scaffold.

### Added
- React 18 + TypeScript (strict) + Vite 5 PWA (`vite-plugin-pwa`, autoUpdate,
  4 MB precache ceiling), dark phone-first UI with bottom navigation.
- **Broker layer**: broker-neutral types (`src/broker/types.ts`),
  `BrokerAdapter` interface, `AlpacaAdapter` (account, clock, positions,
  orders, cancel, submit, snapshots → quotes, paginated bars).
- **Order pipeline**: `OrderPipeline.submit()` is the single path to the
  broker — `riskGuard` (pure) → `journal` (always) → adapter (only if OK).
  `preview()` gives the ticket a live verdict while typing.
- **Risk guard** with configurable limits in `src/config/risk.ts`: max order
  value, max position value per symbol, max qty, daily-loss stop for new buys,
  no shorting, optional require-market-open, blocklist, whole shares only,
  reason required. Unit-tested (`riskGuard.test.ts`).
- **Attribution**: `client_order_id = <source>-<time>-<rand>`; parsed back
  into `Order.source` so the UI tags orders `manual` / `<strategy>` /
  `external`. Unit-tested.
- **Journal** in localStorage with CSV export (UTF-8 BOM, CRLF, RFC-4180).
- **Screens**: Watchlist (add/remove, 15 s polling paused when hidden),
  Chart (lightweight-charts candlesticks + volume, 5m/15m/1h/1D), Trade
  (manual order ticket: market/limit/stop/stop-limit, day/GTC, live guard
  preview, submit disabled until the guard passes), Account (equity, day P&L,
  cash, buying power, market-open pill, positions, open orders with cancel,
  recent orders), Journal.
- Dev-server proxy for `/api/trading` and `/api/data` → Alpaca, injecting
  keys from `.env.local` server-side (no `VITE_` prefix, so keys are never
  bundled). `ALPACA_PAPER=false` switches to live; the header pill turns red.
- Generated app icons (`public/icons`), `.env.example`, README, GitHub Pages
  workflow.

### Notes
- Alpaca's REST API sends no CORS headers, so a deployed static build needs
  the (future) Bullpen backend to serve `/api/*`; until then use `npm run dev`
  / `npm run dev:lan`.
- Verified with `tsc -b && vite build`, `vitest` (12 tests) and a headless
  Chromium smoke run against a mock Alpaca server (watchlist → chart → ticket
  → guard preview → submit → account → journal).
