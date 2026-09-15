import type { AssetSummary } from "../broker/types";

/**
 * Pure, dependency-free search over the cached asset list. Linear scan —
 * ~10k rows × a few string ops is well under a millisecond per keystroke,
 * so there is no index to keep in sync.
 *
 * Ranking (lower is better):
 *   0  exact symbol            "AAPL" → AAPL
 *   1  symbol prefix           "AA"   → AA, AAL, AAPL…
 *   2  name starts with query  "micro" → Microsoft, MicroVision…
 *   2.1 later word prefix      "micro" → Ambiq Micro, iShares Micro-Cap…
 *   3  name substring          "pple" → Apple…
 * OTC listings sink half a rank so exchange-listed names come first, and
 * leveraged / inverse / buffered / covered-call ETFs sink a quarter rank so
 * "apple" shows Apple Inc. before "T-Rex 2X Long Apple Daily Target ETF".
 * Symbol matches tie-break on shorter symbol then alphabetically; name
 * matches on shorter name first (the primary listing usually has the
 * plainest name).
 */
export interface SymbolMatch extends AssetSummary {
  rank: number;
}

const SUFFIXES = [
  /\s+common stock$/i,
  /\s+ordinary shares?$/i,
  /\s+common shares?$/i,
  /\s+american depositary shares?$/i,
  /\s+depositary receipts?$/i,
];

/** "Alphabet Inc. Class A Common Stock" → "Alphabet Inc. Class A". */
export function tidyName(name: string): string {
  let n = name.replace(/\s+/g, " ").trim();
  for (const re of SUFFIXES) n = n.replace(re, "");
  return n.replace(/\s+representing$/i, "").trim() || name;
}

/** Wrapper products that pile up around every popular name. */
const DERIVATIVE = /\b(\d(\.\d+)?x|leveraged|inverse|bear|bull|buffer(ed)?|daily target|yield premium|covered call|option income|strategy)\b/i;

export function searchSymbols(assets: readonly AssetSummary[], query: string, limit = 8): SymbolMatch[] {
  const q = query.trim().toUpperCase();
  if (!q) return [];
  const out: SymbolMatch[] = [];
  for (const a of assets) {
    const sym = a.symbol.toUpperCase();
    let rank: number;
    if (sym === q) rank = 0;
    else if (sym.startsWith(q)) rank = 1;
    else {
      const name = a.name.toUpperCase();
      const at = name.indexOf(q);
      if (at < 0) continue;
      rank = at === 0 ? 2 : /[\s(\-/,.]/.test(name[at - 1]) ? 2.1 : 3;
    }
    if (a.exchange === "OTC") rank += 0.5;
    if (DERIVATIVE.test(a.name)) rank += 0.25;
    out.push({ ...a, rank });
  }
  const nameLen = (m: SymbolMatch) => (m.rank >= 2 ? m.name.length : 0);
  out.sort(
    (x, y) =>
      x.rank - y.rank ||
      nameLen(x) - nameLen(y) ||
      x.symbol.length - y.symbol.length ||
      x.symbol.localeCompare(y.symbol),
  );
  return out.slice(0, limit);
}
