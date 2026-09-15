import { describe, expect, it } from "vitest";
import type { Bar } from "../../broker/types";
import { computeRangeStats } from "./stats";

const DAY = 86_400;
// "now" = 2026-09-14T20:00:00Z
const NOW = Math.floor(Date.UTC(2026, 8, 14, 20) / 1000);

/** One bar per calendar day going back `days` days, close = 100 + i (older = lower). */
function bars(days: number, opts: { volume?: number } = {}): Bar[] {
  const out: Bar[] = [];
  for (let i = days; i >= 1; i--) {
    const close = 100 + (days - i);
    out.push({
      time: NOW - i * DAY - 6 * 3600, // bar timestamp at 04:00Z, before "now" on the same day
      open: close - 0.5,
      high: close + 1,
      low: close - 1,
      close,
      volume: opts.volume ?? 1_000 + i,
    });
  }
  return out;
}

describe("computeRangeStats", () => {
  it("returns empty stats for no bars", () => {
    const s = computeRangeStats([], undefined, NOW);
    expect(s.high52).toBeUndefined();
    expect(s.low52).toBeUndefined();
    expect(s.perf).toEqual([]);
  });

  it("computes the 52-week range and position including the live price", () => {
    const b = bars(400);
    // bars inside the 365-day window: closes 136..499 → highs up to 500, lows down to 135
    const s = computeRangeStats(b, 505, NOW);
    expect(s.high52).toBe(505); // live price above every bar high
    expect(s.low52).toBe(135);
    expect(s.rangePos).toBe(1);
    const mid = computeRangeStats(b, 200, NOW);
    expect(mid.low52).toBe(135);
    expect(mid.high52).toBe(500);
    expect(mid.rangePos).toBeCloseTo((200 - 135) / (500 - 135), 6);
  });

  it("ignores bars older than a year for the range but not for volume averages", () => {
    const b = bars(400, { volume: 10 });
    const s = computeRangeStats(b, 300, NOW);
    expect(s.low52).toBe(135); // the 400-day-old lows (99..) are excluded
    expect(s.avgVolume20).toBe(10);
    expect(s.avgVolume60).toBe(10);
  });

  it("computes performance windows from the close at or before the window start", () => {
    const b = bars(400);
    const last = 499; // equals the most recent close
    const s = computeRangeStats(b, last, NOW);
    const by = Object.fromEntries(s.perf.map((p) => [p.label, p.pct]));
    // close 7 days ago = 100 + (400 - 7) = 493
    expect(by["1W"]).toBeCloseTo(((499 - 493) / 493) * 100, 6);
    expect(by["1M"]).toBeCloseTo(((499 - (100 + 400 - 30)) / (100 + 400 - 30)) * 100, 6);
    expect(by["1Y"]).toBeCloseTo(((499 - (100 + 400 - 365)) / (100 + 400 - 365)) * 100, 6);
    expect(s.perf.map((p) => p.label)).toEqual(["1W", "1M", "3M", "6M", "YTD", "1Y"]);
  });

  it("uses the last close of the previous calendar year for YTD", () => {
    const b = bars(400);
    const s = computeRangeStats(b, 499, NOW);
    const ytd = s.perf.find((p) => p.label === "YTD")!;
    // 2025-12-31 is 257 days before 2026-09-14 → close = 100 + (400 - 257) = 243
    expect(ytd.pct).toBeCloseTo(((499 - 243) / 243) * 100, 6);
  });

  it("leaves a window undefined when no bar is old enough", () => {
    const b = bars(10);
    const s = computeRangeStats(b, 109, NOW);
    const by = Object.fromEntries(s.perf.map((p) => [p.label, p.pct]));
    expect(by["1W"]).toBeDefined();
    expect(by["1M"]).toBeUndefined();
    expect(by["YTD"]).toBeUndefined();
  });
});
