# CHANGES

## 0.6.0 — Beta packaging: bring-your-own-keys, relay, Pages (2026-09-15)

### Added
- **Settings screen** (`src/features/settings/SettingsPanel.tsx`, ☰ → Tools →
  Settings · Alpaca keys): paste an Alpaca *paper* key pair, test the
  connection, remove it. Keys live in this browser only
  (`src/config/credentials.ts`, `useCredentials()`), are masked on screen,
  and ride along on every API call as `X-Alpaca-Key-Id` /
  `X-Alpaca-Secret-Key` (`AlpacaAdapter`). The Vite dev proxy honours them
  too, falling back to `.env.local`.
- **Cloudflare Worker relay** (`relay/`): forwards `/api/trading` →
  `paper-api.alpaca.markets` (hard-wired, never live), `/api/data` →
  `data.alpaca.markets`, `/api/fundamentals` → Finnhub with a shared secret.
  Origin allow-list, CORS + preflight, 401 with guidance when no keys are
  sent. `node test.mjs` covers routing, CORS and paper-only. See
  `relay/README.md` for the three-command deploy.
- **BETA.md**: tester guide (Alpaca signup → paste keys → add to home
  screen → what to try → how to report). ☰ → Links → *Report feedback* opens
  a GitHub issue.
- Beta pill next to Paper when built with `VITE_BETA=true`; `env.beta`,
  `env.apiBase`. Menu Status shows where keys come from.

### Changed
- `deploy.yml` passes `VITE_API_BASE` (repo variable = relay URL),
  `VITE_BETA=true` and `FUNDAMENTALS_VIA_API=true`.
- `ErrorBanner` on 401 now points to Settings (hosted) or `.env.local` (dev);
  the "can't reach the API" message no longer mentions a backend that isn't
  built yet.

## 0.5.1 — Main menu, build stamp, Discover layout (2026-09-15)

### Added
- **Hamburger main menu** (`src/components/MainMenu.tsx`), left of the title,
  in the fleet's accordion style: View (the six tabs), Tools (refresh symbol
  list, restore default watchlist — two-tap confirm), Status (paper/live,
  symbol count and age, fundamentals on/off, watchlist size) and Links
  (Alpaca dashboard, GitHub Actions, repository, MyWebSite, Statehouse Home).
- **Build stamp footer** (`src/components/BuildStamp.tsx`): © Costarella
  Innovations, LLC and the build time with time zone, pinned above the bottom
  nav (`--footer-h`).
- `useSymbolIndex().updatedAt`.

### Changed
- **Discover** now leads with the browse chips — Today's movers, By location,
  Index ETFs, Sectors, Magnificent 7, Dow 30, Bonds — and shows one card
  below them, so nothing hides below the fold. The chosen chip is remembered.
  Screener polling only runs while the movers chip is selected.
- Preferred stock and depositary shares are filtered out of the movers screens.

## 0.5.0 — Browse by headquarters location (2026-09-15)

### Added
- **By location** on the Discover tab (`src/features/discover/ByLocation.tsx`):
  browse listed companies by where they're headquartered. Region chips
  (Mahoning Valley, Northeast Ohio, Pittsburgh, Columbus, Cincinnati — by
  3-digit ZIP prefix, `src/config/usStates.ts`) or a State + City picker with
  counts. Rows carry live quotes, open the detail panel, and have the +/✓
  watchlist toggle. Choice is remembered; 30 rows per page.
- **HQ dataset build** (`scripts/build-hq.mjs`, `npm run build:hq`): downloads
  the last four SEC *Financial Statement Data Sets* quarters (business
  address + SIC per filer) and `company_tickers.json`, joins on CIK, and writes
  `public/data/hq.json` (~300 KB, committed). Zero dependencies — includes a
  minimal zip reader. Newest filing wins; `BRK-B` → `BRK.B` to match Alpaca.
  Rebuild quarterly. Until it's run the panel explains how.
- `src/data/hq.ts` loader (static fetch, cached) and `tally()` helper.

### Changed
- Discover's `Row` / `PriceCell` moved to `src/features/discover/rows.tsx`.
- `<select>`s inside `.field-row` no longer overflow the card on phones.

## 0.4.0 — Discover tab (2026-09-15)

### Added
- **Discover tab** (`src/features/discover/Discover.tsx`, new bottom-nav
  entry between Watch and Chart): ways in that don't start from a ticker you
  already know.
  - *Today's movers*: Gainers / Losers / Most active from Alpaca's screener
    (`/v1beta1/screener/stocks/movers` and `/most-actives`), refreshed every
    60s. Warrants, units, rights and sub-$1 names are filtered out client-side
    (40 fetched, 10 shown) so the lists aren't pure penny-stock noise. Most
    active rows also carry live price/change via a snapshot call.
  - *Curated groups* (`src/config/discover.ts`, chips): Index ETFs, the 11
    S&P sector ETFs, Magnificent 7, Dow 30, and bonds/gold/oil/dollar/bitcoin
    ETFs — each with live quotes, a one-line blurb, and "Add all".
  - Every row opens the symbol detail panel; the trailing **+ / ✓** button
    adds or removes the symbol from the watchlist in place.
- Broker layer: `Mover` / `ActiveStock` types, `getMovers()` and
  `getMostActive()` on `BrokerAdapter` / `AlpacaAdapter`.
- `useWatchlist()` hook (`src/features/watchlist/useWatchlist.ts`) — the
  watchlist's localStorage state with `add` / `remove` / `has` / `toggle`,
  shared by the Watch and Discover tabs.

### Changed
- Bottom nav is now six tabs (label font 11px).

## 0.3.0 — Symbol search and company names (2026-09-15)

### Added
- **Symbol type-ahead** (`src/components/SymbolSearch.tsx`): the watchlist
  "Add" box and the Trade ticket's symbol field now search by ticker *or*
  company name as you type ("app" → APP, AAPL, Apple Hospitality…). Pick
  with a tap, ↑/↓ + Enter, or the Add button. Enter never submits the
  enclosing form. Typed tickers are validated against the asset master, so
  a typo shows "isn't a tradable US symbol" instead of a dead watchlist row.
  Until the index has loaded the box falls back to accepting any text.
- **Symbol index** (`src/data/symbolIndex.ts`, `src/app/SymbolIndexContext.tsx`):
  every active, tradable US equity from `GET /v2/assets`, cached in
  IndexedDB (`src/lib/kvStore.ts`) and refreshed in the background once a
  day. `useSymbolIndex()` exposes `search`, `nameOf`, `lookup`, `isUnknown`.
- **Search ranking** (`src/data/symbolSearch.ts`, pure, unit-tested):
  exact symbol → symbol prefix → name word-prefix → name substring; OTC
  listings sort below exchange-listed ones. `tidyName()` strips
  "Common Stock" / "Ordinary Shares" / ADS boilerplate from Alpaca names.
- **Company names** next to the ticker on watchlist rows, the Chart toolbar
  and the Trade ticket label.
- Broker layer: `AssetSummary` type and `listAssets()` on
  `BrokerAdapter` / `AlpacaAdapter`.

## 0.2.0 — Symbol detail panel (2026-09-14)

### Added
- **Symbol detail panel** (`src/features/symbol/SymbolDetail.tsx`): tap any
  watchlist or position row, or the ⓘ button on the Chart and Trade screens.
  Shows identity (name, exchange, asset class, tradable / shortable /
  marginable / fractionable flags), live price, your position if any,
  today's open / high / low / prev close / bid / ask / spread / volume /
  relative volume, 52-week range with position marker, 1W-1M-3M-6M-YTD-1Y
  performance, 20d/60d average volume, fundamentals, and recent news.
  Chart and Trade buttons in the panel bar keep the old flows one tap away.
- **Broker layer**: `AssetInfo` and `NewsItem` types; `getAsset()` and
  `getNews()` on `BrokerAdapter` / `AlpacaAdapter` (`/v2/assets`,
  `/v1beta1/news`); `Quote.open`.
- **Range stats** (`src/features/symbol/stats.ts`, pure, unit-tested):
  52-week high/low/position, performance windows, volume averages from
  daily bars.
- **Optional fundamentals** via Finnhub (`src/data/fundamentals.ts`): set
  `FINNHUB_KEY` in `.env.local` and the dev proxy serves
  `/api/fundamentals` (key injected server-side, never bundled). Market cap,
  P/E, EPS, dividend yield, beta, shares outstanding, IPO date, industry,
  website, logo, next earnings date. Without a key the panel explains how
  to enable it.
- `useAsync` hook (one-shot loader keyed by symbol), `fmtCompact`,
  `fmtAgo`, `fmtDate` formatters.

### Changed
- Watchlist and Account rows now open the detail panel instead of jumping
  straight to the chart.


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
