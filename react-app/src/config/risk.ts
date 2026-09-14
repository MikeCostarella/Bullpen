/**
 * Risk limits. Set these while you are calm. They apply to EVERY source —
 * manual and automated — and are enforced by src/pipeline/riskGuard.ts
 * before any order reaches the broker.
 *
 * Defaults are sized for the $100k Alpaca paper account. Tighten them hard
 * before ever pointing the app at live keys.
 */
export interface RiskLimits {
  /** Max dollar value of a single order (qty × reference price). */
  maxOrderNotional: number;
  /** Max dollar value held in one symbol after the order fills. */
  maxPositionNotional: number;
  /** Max number of shares in a single order. */
  maxOrderQty: number;
  /** Stop all NEW buys once today's equity drop exceeds this many dollars. */
  maxDailyLoss: number;
  /** Refuse to sell more than we hold (no shorting). */
  allowShort: boolean;
  /** Refuse orders while the market is closed (they would queue for the open). */
  requireMarketOpen: boolean;
  /** Symbols that may never be traded (e.g. things you own elsewhere). */
  blockedSymbols: string[];
}

export const riskLimits: RiskLimits = {
  maxOrderNotional: 5_000,
  maxPositionNotional: 10_000,
  maxOrderQty: 500,
  maxDailyLoss: 2_000,
  allowShort: false,
  requireMarketOpen: false,
  blockedSymbols: [],
};
