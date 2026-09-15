import type { BrokerAdapter } from "../broker/BrokerAdapter";
import type { AssetSummary } from "../broker/types";
import { kvGet, kvSet } from "../lib/kvStore";
import { tidyName } from "./symbolSearch";

/**
 * The symbol index: every tradable US equity with its company name, pulled
 * once from the broker's asset master and cached in IndexedDB. Powers
 * type-ahead search, "is this a real symbol?" validation, and the company
 * names shown next to tickers.
 *
 * Freshness: a cached copy is used immediately (even if stale) and
 * refreshed in the background once it is older than MAX_AGE_MS. New
 * listings and renames therefore show up within a day; nothing here is
 * price data, so a day of staleness is harmless.
 */
const KEY = "symbolIndex.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Compact on-disk form: tuples, not objects, to keep the blob small. */
interface Stored {
  fetchedAt: number;
  rows: [symbol: string, name: string, exchange: string][];
}

export interface SymbolIndex {
  assets: AssetSummary[];
  bySymbol: Map<string, AssetSummary>;
  fetchedAt: number;
}

function build(rows: Stored["rows"], fetchedAt: number): SymbolIndex {
  const assets = rows.map(([symbol, name, exchange]) => ({ symbol, name, exchange }));
  return { assets, bySymbol: new Map(assets.map((a) => [a.symbol, a])), fetchedAt };
}

export async function readCachedIndex(): Promise<SymbolIndex | undefined> {
  const s = await kvGet<Stored>(KEY);
  if (!s || !Array.isArray(s.rows) || s.rows.length === 0) return undefined;
  return build(s.rows, s.fetchedAt);
}

export function isStale(index: SymbolIndex, now = Date.now()): boolean {
  return now - index.fetchedAt > MAX_AGE_MS;
}

export async function fetchIndex(broker: BrokerAdapter): Promise<SymbolIndex> {
  const raw = await broker.listAssets();
  const rows: Stored["rows"] = raw.map((a) => [a.symbol, tidyName(a.name), a.exchange]);
  const fetchedAt = Date.now();
  void kvSet<Stored>(KEY, { fetchedAt, rows });
  return build(rows, fetchedAt);
}
