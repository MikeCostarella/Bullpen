# Bullpen

A warm-up pen for trading. Bullpen is a phone-first PWA that sits on top of
the [Alpaca](https://alpaca.markets) paper-trading API so you can learn how
markets and order mechanics actually behave without risking real money —
and, if you ever decide to, switch the same app to a live account by changing
one environment variable.

**Milestone 1 (this commit):** watchlist with live quotes, candlestick chart,
manual order ticket, account/positions/orders view, and a trade journal —
all routed through a single order pipeline with a risk guard.

## How it works

```
 manual ticket ─┐
                ├──► OrderIntent ──► riskGuard ──► journal ──► BrokerAdapter ──► Alpaca
 strategies ────┘        (pure, unit-tested)    (always)     (only if guard OK)
   (later)
```

* **One path for every order.** `src/pipeline/orderPipeline.ts` is the only
  thing allowed to call `broker.submitOrder()`. The manual ticket and every
  future automated strategy call `pipeline.submit(intent)`, so the risk limits
  and the journal can never be bypassed.
* **Risk guard** (`src/pipeline/riskGuard.ts`, limits in `src/config/risk.ts`):
  max order value, max position per symbol, daily-loss stop, no shorting,
  optional market-hours check, blocklist. Pure function with unit tests.
* **Attribution.** Every order's `client_order_id` starts with its source
  (`manual-…`, `sma-cross-…`), so the Account screen can show whose order it
  was even after a reload, and strategies will only ever manage their own
  positions.
* **Journal.** Every intent is recorded — sent, blocked by the guard, or
  refused by the broker — with the reason you typed. Exportable as CSV.
* **Broker-neutral types.** `src/broker/types.ts` knows nothing about Alpaca;
  `src/broker/alpaca/AlpacaAdapter.ts` is the only Alpaca-specific file.

## Beta testers

See [BETA.md](BETA.md) — the one-page getting-started guide to send people.
The hosted app lives on GitHub Pages and talks to Alpaca through the small
Cloudflare Worker in [`relay/`](relay/README.md) (paper-only). Testers bring
their own free Alpaca paper keys via ☰ → Settings, so nothing secret ships
with the build.

### Deploying the hosted beta (one-time setup)

The pieces: GitHub Pages serves the static PWA; the Cloudflare Worker in
`relay/` forwards `/api/*` to Alpaca. The app only learns the relay's URL at
**build time**, through the `VITE_API_BASE` variable — forget it and the
hosted app shows "Can't reach the API (404)".

1. **Deploy the relay** (needs a free Cloudflare account; `wrangler login`
   opens the browser to create/sign in — GitHub login works):
   ```
   cd C:\projects\Bullpen\relay
   npx wrangler login
   npx wrangler deploy
   npx wrangler secret put FINNHUB_KEY
   ```
   The first deploy asks you to register a `workers.dev` subdomain
   (`mikecostarella`). It prints the relay URL:
   `https://bullpen-relay.mikecostarella.workers.dev`. A new subdomain's TLS
   certificate takes 5–15 minutes; until then the browser shows
   `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`. Check `<url>/health` afterwards.
2. **Repo must be public** — GitHub Pages does not publish private repos on
   the free plan. Before flipping it: regenerate the Alpaca paper keys
   (app.alpaca.markets → Paper Trading → API Keys → Regenerate), put the new
   pair in `react-app/.env.local`, and make sure `.env.example` holds only
   placeholders. Then Settings → General → Danger Zone → Change visibility.
3. **Pages source**: repo Settings → Pages → Build and deployment → Source =
   **GitHub Actions**.
4. **Relay URL variable**: repo Settings → Secrets and variables → Actions →
   **Variables** tab (not Secrets) → *New repository variable* →
   Name `VITE_API_BASE`, Value the relay URL with no trailing slash → *Add
   variable*. `deploy.yml` reads it as `vars.VITE_API_BASE`.
5. **Build**: push to `main`, or Actions → *Deploy to GitHub Pages* → *Run
   workflow*. Any time the variable changes, re-run the workflow — the value
   is baked into the bundle.
6. **Verify** at https://mikecostarella.github.io/Bullpen/ — hard-refresh
   (Ctrl+F5) because the PWA service worker caches the previous build. A
   correct fresh build shows the amber "No Alpaca keys yet — open Menu →
   Settings" banner; paste paper keys there and *Test connection*.

Later changes: app code → just push (Pages redeploys). Relay code or
`ALLOWED_ORIGINS` → `npx wrangler deploy` from `relay/`. Ending the beta →
remove `VITE_BETA` from `deploy.yml`.

## Setup

1. Create a free Alpaca account at <https://app.alpaca.markets>, open
   **Paper Trading**, and generate an API key + secret.
2. Copy `react-app/.env.example` to `react-app/.env.local` and paste the keys in.
   `.env.local` is git-ignored.
3. Install and run:

   ```
   cd C:\projects\Bullpen\react-app
   npm install
   npm run dev
   ```

   Open <http://localhost:5173/Bullpen/>.

### Running it on your phone

Alpaca's API has no CORS headers, so the browser can't call it directly. In
development the Vite dev server proxies `/api/trading` and `/api/data` to
Alpaca and injects the keys server-side (they never reach the browser
bundle). To use it from your phone on the same Wi-Fi:

```
cd C:\projects\Bullpen\react-app
npm run dev:lan
```

then open the `Network:` URL Vite prints (e.g. `http://192.168.1.20:5173/Bullpen/`)
on the phone and "Add to Home Screen". You may need to allow port 5173 through
Windows Firewall the first time.

The GitHub Pages deploy (`.github/workflows/deploy.yml`) publishes the static
shell, but it has no proxy behind it — the app will show a "can't reach the
API" banner there until the Bullpen backend exists. That backend will serve the
same two `/api/*` routes, and `VITE_API_BASE` points the PWA at it.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with the Alpaca proxy |
| `npm run dev:lan` | Same, reachable from your phone on the LAN |
| `npm run build` | `tsc -b && vite build` — the gate before every commit |
| `npm test` | Vitest unit tests (risk guard, attribution) |
| `npm run preview` | Serve the production build locally |
| `npm run build:hq` | Rebuild `public/data/hq.json` (company HQ locations) from SEC filings — see below |

### Company headquarters data (`npm run build:hq`)

The Discover tab's **By location** view needs `react-app/public/data/hq.json`,
which is built from two free SEC sources with no API key: the quarterly
[Financial Statement Data Sets](https://www.sec.gov/dera/data/financial-statement-data-sets)
(business address and SIC code for every filer) and `company_tickers.json`
(ticker ↔ CIK). Run it once, commit the result, and rebuild every quarter or so:

```
cd C:\projects\Bullpen\react-app
npm run build:hq
```

It downloads the last four quarters (~50–70 MB each) and takes about a minute.
The SEC requires a User-Agent with a contact address; set `SEC_CONTACT` in
your environment to override the default.

## Environment variables (`react-app/.env.local`)

| Variable | Purpose |
| --- | --- |
| `ALPACA_KEY_ID`, `ALPACA_SECRET_KEY` | Alpaca API keys (proxy only, never bundled) |
| `ALPACA_PAPER` | `true` (default) = paper-api.alpaca.markets; `false` = LIVE |
| `ALPACA_TRADING_URL`, `ALPACA_DATA_URL` | Optional overrides (tests, local mock) |
| `VITE_API_BASE` | Optional: URL of the Bullpen backend for deployed builds |
| `FINNHUB_KEY` | Optional: free [Finnhub](https://finnhub.io) key for fundamentals on the detail panel |
| `FUNDAMENTALS_VIA_API` | Build-time: `true` when the relay holds the Finnhub key (set in deploy.yml) |
| `VITE_BETA` | Build-time: `true` shows the Beta pill and tester hints (set in deploy.yml) |

## Roadmap

1. **Milestone 1 — manual paper trading** (this)
2. **Backtester** — run a strategy over historical bars with slippage,
   compare to buy-and-hold SPY; same strategy interface as live
3. **Backend** — Azure Function serving `/api/*`, owning keys, the journal
   and the per-source position ledger; timer-driven strategy runner
4. **Automated sources** — strategies as pipeline sources with a per-strategy
   dashboard, "suggest" mode (human approves each intent), and a pause button
5. **Live** — only after all of the above has run on paper for a while

## Free-plan limits (Alpaca)

200 API calls/min, IEX feed only, 7+ years of history, 30 websocket symbols.
Bullpen polls quotes every 15 s while visible and pauses when the tab is
hidden, which stays well inside that.

## License

Private — Costarella Innovations, LLC.
