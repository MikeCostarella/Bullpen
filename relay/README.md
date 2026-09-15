# Bullpen relay

A ~120-line Cloudflare Worker that lets the static PWA on GitHub Pages talk to
Alpaca (whose APIs send no CORS headers). Paper trading only — the trading
target is hard-wired to `paper-api.alpaca.markets`. It holds no Alpaca keys:
each tester's paper key pair travels with their requests from the app's
Settings screen. Free tier (100k requests/day) covers a beta many times over.

## Deploy (once)

```
cd C:\projects\Bullpen\relay
npx wrangler login
npx wrangler deploy
```

`wrangler deploy` prints the URL, e.g. `https://bullpen-relay.<account>.workers.dev`.
Optional shared fundamentals key (Finnhub):

```
cd C:\projects\Bullpen\relay
npx wrangler secret put FINNHUB_KEY
```

Then in the GitHub repo: **Settings → Secrets and variables → Actions →
Variables**, add `VITE_API_BASE` = that URL, and re-run *Deploy to GitHub
Pages* from the Actions tab. `npx wrangler deploy` again whenever
`src/index.js` or `wrangler.toml` changes.

Sanity check: open `<url>/health` in a browser — you should see
`{"ok":true,"service":"bullpen-relay","paperOnly":true}`.

## Test locally

`node test.mjs` runs the routing, CORS, key-forwarding and paper-only checks
against a mock upstream (no network, no wrangler needed).
