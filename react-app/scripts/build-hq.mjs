#!/usr/bin/env node
/**
 * build-hq.mjs — where is every listed company headquartered?
 *
 * Builds public/data/hq.json from two free SEC sources (no API key):
 *
 *   1. Financial Statement Data Sets (one zip per quarter). Its sub.txt lists
 *      every filer that quarter with CIK, name, SIC industry code and the
 *      business address (city / state / country / ZIP).
 *      https://www.sec.gov/dera/data/financial-statement-data-sets
 *   2. company_tickers.json — the SEC's ticker <-> CIK map.
 *      https://www.sec.gov/files/company_tickers.json
 *
 * The last four available quarters are merged (newest wins) so companies
 * that only file annually are still covered. Output is a compact JSON the
 * app fetches as a static file; commit it and rebuild every quarter or so.
 *
 * Usage (from react-app/):
 *   node scripts/build-hq.mjs                      # download + build
 *   node scripts/build-hq.mjs --local a.zip b.zip --tickers company_tickers.json
 *                                                  # build from files already on disk
 *   node scripts/build-hq.mjs --out some/other.json
 *
 * The SEC requires a descriptive User-Agent with a contact address on every
 * request; set SEC_CONTACT in the environment to override the default.
 * Zero dependencies: Node 18+ (global fetch), fs, zlib.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateRawSync } from "node:zlib";

const SEC_BASE = "https://www.sec.gov";
const FSDS_URL = (q) => `${SEC_BASE}/files/dera/data/financial-statement-data-sets/${q}.zip`;
const TICKERS_URL = `${SEC_BASE}/files/company_tickers.json`;
const USER_AGENT = `Bullpen build script (${process.env.SEC_CONTACT ?? "mike.costarella@gmail.com"})`;
const QUARTERS_TO_MERGE = 4;
const MAX_LOOKBACK = 8;

/* ---------- args ---------- */

const args = process.argv.slice(2);
const argVal = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const argList = (flag) => {
  const i = args.indexOf(flag);
  if (i < 0) return [];
  const out = [];
  for (let j = i + 1; j < args.length && !args[j].startsWith("--"); j++) out.push(args[j]);
  return out;
};
const outPath = resolve(argVal("--out") ?? "public/data/hq.json");
const localZips = argList("--local");
const localTickers = argVal("--tickers");

/* ---------- minimal ZIP reader (enough for the SEC's plain deflate zips) ---------- */

/** Return the uncompressed bytes of one named entry, or undefined. */
export function readZipEntry(buf, wantedName) {
  // End of central directory record: scan back for its signature.
  const EOCD = 0x06054b50;
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65_536); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip file (no end-of-central-directory record)");
  const entryCount = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (cdOffset === 0xffffffff || entryCount === 0xffff) throw new Error("zip64 archives are not supported");

  let p = cdOffset;
  for (let n = 0; n < entryCount; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("corrupt central directory");
    const method = buf.readUInt16LE(p + 10);
    const compSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name !== wantedName) continue;

    if (buf.readUInt32LE(localOffset) !== 0x04034b50) throw new Error("corrupt local file header");
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const data = buf.subarray(start, start + compSize);
    if (method === 0) return data;
    if (method === 8) return inflateRawSync(data);
    throw new Error(`unsupported zip compression method ${method} for ${name}`);
  }
  return undefined;
}

/* ---------- sub.txt parsing ---------- */

/** Parse the tab-separated sub.txt into {cik, name, sic, country, state, city, zip, form, filed}. */
export function parseSub(text) {
  const lines = text.split(/\r?\n/);
  const header = lines[0].split("\t");
  const col = (n) => {
    const i = header.indexOf(n);
    if (i < 0) throw new Error(`sub.txt has no "${n}" column (got: ${header.slice(0, 12).join(", ")}…)`);
    return i;
  };
  const iCik = col("cik"),
    iName = col("name"),
    iSic = col("sic"),
    iCountry = col("countryba"),
    iState = col("stprba"),
    iCity = col("cityba"),
    iZip = col("zipba"),
    iForm = col("form"),
    iFiled = col("filed");
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const f = lines[i].split("\t");
    out.push({
      cik: Number(f[iCik]),
      name: f[iName],
      sic: f[iSic] ? Number(f[iSic]) : undefined,
      country: f[iCountry] || undefined,
      state: f[iState] || undefined,
      city: f[iCity] || undefined,
      zip: f[iZip] || undefined,
      form: f[iForm],
      filed: f[iFiled],
    });
  }
  return out;
}

/* ---------- normalisation ---------- */

const SMALL = new Set(["of", "the", "and", "on", "at", "de", "la", "du", "des", "le", "les", "da", "do", "y"]);
const UPPER = new Set(["NY", "NYC", "DC", "SW", "NW", "SE", "NE", "USA"]);

/** "NEW YORK" → "New York", "ST. LOUIS" → "St. Louis", "MCLEAN" → "McLean" (best effort). */
export function titleCase(s) {
  if (!s) return s;
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((w, i) => {
      const up = w.toUpperCase();
      if (UPPER.has(up)) return up;
      if (i > 0 && SMALL.has(w)) return w;
      let t = w.replace(/(^|[-'/.])([a-z])/g, (_, pre, c) => pre + c.toUpperCase());
      if (/^mc[a-z]/.test(w)) t = "Mc" + t.slice(2, 3).toUpperCase() + t.slice(3);
      if (/^ft$/.test(w)) t = "Ft.";
      return t;
    })
    .join(" ");
}

/** SEC spells share classes "BRK-B"; Alpaca spells them "BRK.B". */
export const normalizeTicker = (t) => t.trim().toUpperCase().replace(/-/g, ".");

/* ---------- join ---------- */

/**
 * @param subsByQuarterOldestFirst  parsed sub.txt rows, one array per quarter, oldest first
 * @param tickersJson               the company_tickers.json object
 * @returns rows [symbol, city, state, country, sic, zip] sorted by symbol
 */
export function buildRows(subsByQuarterOldestFirst, tickersJson) {
  // Newest filing per CIK wins. Within a quarter, later `filed` wins.
  const byCik = new Map();
  for (const rows of subsByQuarterOldestFirst) {
    for (const r of rows) {
      if (!r.cik || !r.city) continue;
      const prev = byCik.get(r.cik);
      if (!prev || r.filed >= prev.filed) byCik.set(r.cik, r);
    }
  }
  const tickersByCik = new Map();
  for (const t of Object.values(tickersJson)) {
    const cik = Number(t.cik_str);
    if (!tickersByCik.has(cik)) tickersByCik.set(cik, []);
    tickersByCik.get(cik).push(normalizeTicker(t.ticker));
  }
  const out = [];
  for (const [cik, r] of byCik) {
    const tickers = tickersByCik.get(cik);
    if (!tickers) continue;
    for (const sym of tickers) {
      out.push([sym, titleCase(r.city), r.state ?? "", r.country ?? "", r.sic ?? 0, r.zip ?? ""]);
    }
  }
  out.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return out;
}

/* ---------- download ---------- */

async function get(url, as = "buffer") {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip, deflate" } });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return as === "json" ? res.json() : Buffer.from(await res.arrayBuffer());
}

function quarterLabels(now = new Date()) {
  // Newest first, starting with the current calendar quarter.
  const out = [];
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3) + 1;
  for (let i = 0; i < MAX_LOOKBACK; i++) {
    out.push(`${y}q${q}`);
    q--;
    if (q === 0) {
      q = 4;
      y--;
    }
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const t0 = Date.now();
  const subs = []; // [{label, rows}] newest first
  let tickersJson;

  if (localZips.length) {
    for (const z of localZips) {
      const buf = readFileSync(z);
      const sub = readZipEntry(buf, "sub.txt");
      if (!sub) throw new Error(`${z} has no sub.txt`);
      subs.push({ label: z, rows: parseSub(sub.toString("utf8")) });
      console.log(`${z}: ${subs.at(-1).rows.length} filings`);
    }
    if (!localTickers) throw new Error("--local also needs --tickers company_tickers.json");
    tickersJson = JSON.parse(readFileSync(localTickers, "utf8"));
  } else {
    console.log(`User-Agent: ${USER_AGENT}`);
    for (const label of quarterLabels()) {
      if (subs.length >= QUARTERS_TO_MERGE) break;
      process.stdout.write(`${label}: downloading… `);
      const buf = await get(FSDS_URL(label));
      if (!buf) {
        console.log("not published yet");
        continue;
      }
      const sub = readZipEntry(buf, "sub.txt");
      if (!sub) throw new Error(`${label}.zip has no sub.txt`);
      const rows = parseSub(sub.toString("utf8"));
      subs.push({ label, rows });
      console.log(`${(buf.length / 1e6).toFixed(1)} MB, ${rows.length} filings`);
      await sleep(250); // stay well under the SEC's 10 req/s
    }
    if (subs.length === 0) throw new Error("no quarterly data sets could be downloaded");
    process.stdout.write("company_tickers.json: downloading… ");
    tickersJson = await get(TICKERS_URL, "json");
    console.log(`${Object.keys(tickersJson).length} tickers`);
  }

  const rows = buildRows(
    subs
      .slice()
      .reverse()
      .map((s) => s.rows),
    tickersJson,
  );
  const us = rows.filter((r) => r[3] === "US").length;
  const doc = {
    built: new Date().toISOString(),
    source: "SEC Financial Statement Data Sets + company_tickers.json",
    quarters: subs.map((s) => s.label),
    columns: ["symbol", "city", "state", "country", "sic", "zip"],
    rows,
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(doc));
  console.log(
    `\nwrote ${outPath}: ${rows.length} tickers (${us} US-based) from ${subs.length} quarter(s) in ${((Date.now() - t0) / 1000).toFixed(1)}s`,
  );
}

// Run main() only when executed directly, so the test file can import the helpers.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`\nbuild-hq failed: ${e.message}`);
    process.exit(1);
  });
}
