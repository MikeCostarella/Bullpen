import { describe, expect, it } from "vitest";
import { evaluateRisk, type RiskContext } from "./riskGuard";
import type { OrderIntent } from "../broker/types";
import type { RiskLimits } from "../config/risk";

const limits: RiskLimits = {
  maxOrderNotional: 5_000,
  maxPositionNotional: 10_000,
  maxOrderQty: 500,
  maxDailyLoss: 2_000,
  allowShort: false,
  requireMarketOpen: false,
  blockedSymbols: ["GME"],
};

const ctx = (over: Partial<RiskContext> = {}): RiskContext => ({
  account: {
    id: "a",
    status: "ACTIVE",
    equity: 100_000,
    lastEquity: 100_000,
    cash: 100_000,
    buyingPower: 200_000,
    portfolioValue: 100_000,
    dayTradeCount: 0,
    patternDayTrader: false,
  },
  positions: [],
  clock: { timestamp: "", isOpen: true, nextOpen: "", nextClose: "" },
  referencePrice: 100,
  ...over,
});

const intent = (over: Partial<OrderIntent> = {}): OrderIntent => ({
  source: "manual",
  symbol: "AAPL",
  side: "buy",
  qty: 10,
  type: "market",
  timeInForce: "day",
  reason: "test buy",
  ...over,
});

describe("evaluateRisk", () => {
  it("accepts a sane buy", () => {
    const v = evaluateRisk(intent(), ctx(), limits);
    expect(v.ok).toBe(true);
    expect(v.notional).toBe(1_000);
  });

  it("requires a reason", () => {
    const v = evaluateRisk(intent({ reason: "" }), ctx(), limits);
    expect(v.ok).toBe(false);
    expect(v.violations.join()).toMatch(/reason/i);
  });

  it("rejects fractional and non-positive qty", () => {
    expect(evaluateRisk(intent({ qty: 1.5 }), ctx(), limits).ok).toBe(false);
    expect(evaluateRisk(intent({ qty: 0 }), ctx(), limits).ok).toBe(false);
  });

  it("caps order notional", () => {
    const v = evaluateRisk(intent({ qty: 60 }), ctx(), limits); // 6,000 > 5,000
    expect(v.violations.join()).toMatch(/exceeds max \$5,000/);
  });

  it("caps resulting position notional using held qty", () => {
    const c = ctx({
      positions: [{ symbol: "AAPL", qty: 80, avgEntryPrice: 90, currentPrice: 100, marketValue: 8_000, unrealizedPl: 800, unrealizedPlPct: 11 }],
    });
    const v = evaluateRisk(intent({ qty: 30 }), c, limits); // (80+30)*100 = 11,000 > 10,000
    expect(v.violations.join()).toMatch(/per-symbol cap/);
  });

  it("blocks shorting when allowShort is false", () => {
    const v = evaluateRisk(intent({ side: "sell", qty: 5 }), ctx(), limits);
    expect(v.violations.join()).toMatch(/don't hold/);
    const c = ctx({
      positions: [{ symbol: "AAPL", qty: 3, avgEntryPrice: 90, currentPrice: 100, marketValue: 300, unrealizedPl: 30, unrealizedPlPct: 11 }],
    });
    expect(evaluateRisk(intent({ side: "sell", qty: 5 }), c, limits).violations.join()).toMatch(/hold 3/);
    expect(evaluateRisk(intent({ side: "sell", qty: 3 }), c, limits).ok).toBe(true);
  });

  it("stops new buys after the daily loss limit, still allows sells", () => {
    const c = ctx({ account: { ...ctx().account, equity: 97_500, lastEquity: 100_000 } });
    expect(evaluateRisk(intent(), c, limits).violations.join()).toMatch(/Daily loss/);
    const holding = { ...c, positions: [{ symbol: "AAPL", qty: 10, avgEntryPrice: 90, currentPrice: 100, marketValue: 1_000, unrealizedPl: 100, unrealizedPlPct: 11 }] };
    expect(evaluateRisk(intent({ side: "sell" }), holding, limits).ok).toBe(true);
  });

  it("honours the blocklist and market-hours setting", () => {
    expect(evaluateRisk(intent({ symbol: "gme" }), ctx(), limits).violations.join()).toMatch(/blocked/);
    const closed = ctx({ clock: { timestamp: "", isOpen: false, nextOpen: "", nextClose: "" } });
    const soft = evaluateRisk(intent(), closed, limits);
    expect(soft.ok).toBe(true);
    expect(soft.warnings.join()).toMatch(/closed/);
    const hard = evaluateRisk(intent(), closed, { ...limits, requireMarketOpen: true });
    expect(hard.ok).toBe(false);
  });

  it("requires prices for limit/stop types", () => {
    expect(evaluateRisk(intent({ type: "limit" }), ctx(), limits).violations.join()).toMatch(/limit price/);
    expect(evaluateRisk(intent({ type: "stop" }), ctx(), limits).violations.join()).toMatch(/stop price/);
    expect(evaluateRisk(intent({ type: "stop_limit", limitPrice: 99, stopPrice: 98 }), ctx(), limits).ok).toBe(true);
  });
});
