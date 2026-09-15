import type { Bar } from "../../broker/types";

/**
 * Pure helpers that turn a year of daily bars into the numbers the symbol
 * detail panel shows. No I/O, so they are trivially unit-testable.
 */

export interface PerfPoint {
  label: string;
  /** Percent change from the reference close to `last`; undefined if no bar covers the window. */
  pct?: number;
}

export interface RangeStats {
  high52?: number;
  low52?: number;
  /** 0..1 position of `last` inside the 52-week range. */
  rangePos?: number;
  avgVolume20?: number;
  avgVolume60?: number;
  perf: PerfPoint[];
  /** The earliest bar the calculation actually had. */
  barsFrom?: number;
}

const DAY = 86_400;

/** Close of the last bar at or before `t` (unix seconds). */
function closeAtOrBefore(bars: Bar[], t: number): number | undefined {
  let found: number | undefined;
  for (const b of bars) {
    if (b.time <= t) found = b.close;
    else break;
  }
  return found;
}

const pct = (from: number | undefined, to: number): number | undefined =>
  from && from > 0 ? ((to - from) / from) * 100 : undefined;

const avg = (xs: number[]): number | undefined =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;

/**
 * @param bars  daily bars, ascending, ideally ~1 year
 * @param last  the live last price (falls back to the last bar's close)
 * @param now   unix seconds; injectable for tests
 */
export function computeRangeStats(bars: Bar[], last?: number, now = Math.floor(Date.now() / 1000)): RangeStats {
  const sorted = [...bars].sort((a, b) => a.time - b.time);
  const yearAgo = now - 365 * DAY;
  const year = sorted.filter((b) => b.time >= yearAgo);
  const ref = last ?? sorted[sorted.length - 1]?.close;

  const highs = year.map((b) => b.high);
  const lows = year.map((b) => b.low);
  const high52 = highs.length ? Math.max(...highs, ref ?? -Infinity) : undefined;
  const low52 = lows.length ? Math.min(...lows, ref ?? Infinity) : undefined;
  const rangePos =
    high52 !== undefined && low52 !== undefined && ref !== undefined && high52 > low52
      ? Math.min(1, Math.max(0, (ref - low52) / (high52 - low52)))
      : undefined;

  const vols = sorted.map((b) => b.volume);
  const avgVolume20 = avg(vols.slice(-20));
  const avgVolume60 = avg(vols.slice(-60));

  const perf: PerfPoint[] = [];
  if (ref !== undefined) {
    const windows: [string, number][] = [
      ["1W", 7],
      ["1M", 30],
      ["3M", 91],
      ["6M", 182],
      ["1Y", 365],
    ];
    for (const [label, days] of windows) {
      perf.push({ label, pct: pct(closeAtOrBefore(sorted, now - days * DAY), ref) });
    }
    // YTD: last close of the previous calendar year (UTC), else undefined.
    const jan1 = Math.floor(Date.UTC(new Date(now * 1000).getUTCFullYear(), 0, 1) / 1000);
    const prevYearClose = sorted.some((b) => b.time < jan1) ? closeAtOrBefore(sorted, jan1 - 1) : undefined;
    perf.splice(4, 0, { label: "YTD", pct: pct(prevYearClose, ref) });
  }

  return { high52, low52, rangePos, avgVolume20, avgVolume60, perf, barsFrom: sorted[0]?.time };
}
