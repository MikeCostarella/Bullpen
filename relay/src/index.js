/**
 * Bullpen relay — a Cloudflare Worker that stands between the static PWA on
 * GitHub Pages and Alpaca, because Alpaca's REST APIs send no CORS headers.
 *
 *   /api/trading/*       -> https://paper-api.alpaca.markets/*   (PAPER ONLY, hard-wired)
 *   /api/data/*          -> https://data.alpaca.markets/*
 *   /api/fundamentals/*  -> https://finnhub.io/api/v1/*          (shared FINNHUB_KEY secret)
 *
 * Bring-your-own-keys: the app sends the tester's Alpaca paper key pair as
 * X-Alpaca-Key-Id / X-Alpaca-Secret-Key on every request; the relay turns
 * them into APCA-API-KEY-ID / APCA-API-SECRET-KEY and forwards. It stores
 * nothing and has no Alpaca credentials of its own, so a request without keys
 * gets a 401 that the app turns into "open Settings".
 *
 * Only origins listed in ALLOWED_ORIGINS (wrangler.toml) may call it, which
 * keeps it from being a general-purpose open proxy. Because the trading
 * target is fixed to the paper host, no key pasted into the app can ever
 * reach live trading through here.
 */

const TARGETS = {
  "/api/trading": "https://paper-api.alpaca.markets",
  "/api/data": "https://data.alpaca.markets",
  "/api/fundamentals": "https://finnhub.io/api/v1",
};

const ALLOW_HEADERS = "Content-Type, X-Alpaca-Key-Id, X-Alpaca-Secret-Key";
const ALLOW_METHODS = "GET, POST, PATCH, DELETE, OPTIONS";

/** Which of the configured origins (if any) this request may be answered for. */
export function allowedOrigin(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const pat of list) {
    if (pat === origin) return origin;
    // "http://localhost:*" style wildcard on the port, for local dev.
    if (pat.endsWith(":*") && origin.startsWith(pat.slice(0, -1))) return origin;
  }
  return null;
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": ALLOW_METHODS,
    "Access-Control-Allow-Headers": ALLOW_HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...(origin ? corsHeaders(origin) : {}) },
  });
}

/** Map an incoming /api/... URL to its upstream URL, or null. */
export function upstreamFor(url) {
  for (const [prefix, base] of Object.entries(TARGETS)) {
    if (url.pathname === prefix || url.pathname.startsWith(prefix + "/")) {
      return { prefix, url: base + url.pathname.slice(prefix.length) + url.search };
    }
  }
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json(200, { ok: true, service: "bullpen-relay", paperOnly: true }, origin);
    }

    // Browser preflight for the custom key headers.
    if (request.method === "OPTIONS") {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!origin) return json(403, { message: "Origin not allowed." });

    const target = upstreamFor(url);
    if (!target) return json(404, { message: "Unknown route." }, origin);

    const headers = new Headers();
    headers.set("Accept", "application/json");
    const ct = request.headers.get("Content-Type");
    if (ct) headers.set("Content-Type", ct);

    if (target.prefix === "/api/fundamentals") {
      if (!env.FINNHUB_KEY) return json(503, { message: "Fundamentals are not configured on this relay." }, origin);
      headers.set("X-Finnhub-Token", env.FINNHUB_KEY);
    } else {
      const keyId = request.headers.get("X-Alpaca-Key-Id");
      const secret = request.headers.get("X-Alpaca-Secret-Key");
      if (!keyId || !secret) {
        return json(401, { message: "No Alpaca keys. Open Menu → Settings and paste your paper-trading keys." }, origin);
      }
      headers.set("APCA-API-KEY-ID", keyId);
      headers.set("APCA-API-SECRET-KEY", secret);
    }

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    let upstream;
    try {
      upstream = await fetch(target.url, {
        method: request.method,
        headers,
        body: hasBody ? request.body : undefined,
        redirect: "manual",
      });
    } catch (e) {
      return json(502, { message: `Upstream unreachable: ${e.message}` }, origin);
    }

    // Pass the upstream response through, replacing its headers with CORS + content type only.
    const out = new Headers(corsHeaders(origin));
    for (const h of ["Content-Type", "Cache-Control", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"]) {
      const v = upstream.headers.get(h);
      if (v) out.set(h, v);
    }
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
