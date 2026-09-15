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
