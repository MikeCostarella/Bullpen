/**
 * Headquarters data for listed companies, built from SEC filings by
 * scripts/build-hq.mjs into public/data/hq.json (see that file's header).
 * Static, ~300 KB, fetched once per session. Missing file = feature not
 * built yet; the UI explains how.
 */
export interface HqRow {
  symbol: string;
  city: string;
  /** USPS state code for US filers, otherwise the SEC's state/country code. */
  state: string;
  /** ISO-ish country code as the SEC reports it, e.g. "US", "CA", "GB". */
  country: string;
  /** SEC Standard Industrial Classification code; 0 when unknown. */
  sic: number;
  zip: string;
}

export interface HqData {
  built: string;
  quarters: string[];
  rows: HqRow[];
  bySymbol: Map<string, HqRow>;
}

interface HqFile {
  built: string;
  quarters: string[];
  columns: string[];
  rows: [string, string, string, string, number, string][];
}

export class HqMissingError extends Error {
  constructor() {
    super("Location data has not been built yet.");
    this.name = "HqMissingError";
  }
}

let cached: Promise<HqData> | undefined;

export function loadHq(): Promise<HqData> {
  if (!cached) {
    cached = (async () => {
      const url = `${import.meta.env.BASE_URL}data/hq.json`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (res.status === 404) throw new HqMissingError();
      if (!res.ok) throw new Error(`hq.json: ${res.status} ${res.statusText}`);
      const ct = res.headers.get("content-type") ?? "";
      // Vite's dev server answers index.html (200) for unknown paths under the base.
      if (!ct.includes("json")) throw new HqMissingError();
      const file = (await res.json()) as HqFile;
      const rows: HqRow[] = file.rows.map(([symbol, city, state, country, sic, zip]) => ({
        symbol,
        city,
        state,
        country,
        sic,
        zip,
      }));
      return { built: file.built, quarters: file.quarters, rows, bySymbol: new Map(rows.map((r) => [r.symbol, r])) };
    })();
    cached.catch(() => {
      cached = undefined; // let a later mount retry after the file is built
    });
  }
  return cached;
}

/** Count of rows per key, sorted by count desc then key asc. */
export function tally(rows: readonly HqRow[], key: (r: HqRow) => string | undefined): [string, number][] {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = key(r);
    if (k) m.set(k, (m.get(k) ?? 0) + 1);
  }
  return [...m].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
