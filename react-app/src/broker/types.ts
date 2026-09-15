/**
 * Broker-neutral domain types. Nothing in here knows about Alpaca; the
 * Alpaca adapter maps its JSON onto these. Strategies, the risk guard, the
 * journal and every UI component work only with these shapes, so swapping
 * or adding a broker is a single new adapter.
 */

export type Side = "buy" | "sell";
export type OrderType = "market" | "limit" | "stop" | "stop_limit";
export type TimeInForce = "day" | "gtc";

/**
 * Who asked for an order. "manual" is the human on the phone; every
 * automated strategy gets its own short id (e.g. "sma-cross"). Used as the
 * prefix of the broker client_order_id so attribution survives round trips.
 * Keep it short and [a-z0-9-] only.
 */
export type OrderSource = string;

/** What a source WANTS to happen. Not yet an order — it must pass the pipeline. */
export interface OrderIntent {
  source: OrderSource;
  symbol: string;
  side: Side;
  qty: number;
  type: OrderType;
  timeInForce: TimeInForce;
  limitPrice?: number;
  stopPrice?: number;
  /** Required: the "why". The journal refuses intents without one. */
  reason: string;
}

export type OrderStatus =
  | "new"
  | "accepted"
  | "pending_new"
  | "partially_filled"
  | "filled"
  | "canceled"
  | "expired"
  | "rejected"
  | "replaced"
  | "pending_cancel"
  | "done_for_day"
  | "held"
  | "unknown";

export interface Order {
  id: string;
  clientOrderId: string;
  source: OrderSource;
  symbol: string;
  side: Side;
  qty: number;
  filledQty: number;
  type: OrderType;
  timeInForce: TimeInForce;
  limitPrice?: number;
  stopPrice?: number;
  filledAvgPrice?: number;
  status: OrderStatus;
  submittedAt: string;
  filledAt?: string;
}

export interface Position {
  symbol: string;
  qty: number;
  avgEntryPrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPl: number;
  unrealizedPlPct: number;
}

export interface Account {
  id: string;
  status: string;
  equity: number;
  lastEquity: number;
  cash: number;
  buyingPower: number;
  portfolioValue: number;
  dayTradeCount: number;
  patternDayTrader: boolean;
}

export interface Clock {
  timestamp: string;
  isOpen: boolean;
  nextOpen: string;
  nextClose: string;
}

/** One OHLCV candle. `time` is unix seconds (UTC). */
export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Timeframe = "1Min" | "5Min" | "15Min" | "1Hour" | "1Day";

export interface Quote {
  symbol: string;
  last: number;
  bid?: number;
  ask?: number;
  /** Today's open. */
  open?: number;
  /** Today's daily bar close-to-date vs previous close. */
  change: number;
  changePct: number;
  prevClose: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
  asOf: string;
}

/** Static facts about a tradable instrument (from the broker's asset master). */
export interface AssetInfo {
  symbol: string;
  name: string;
  exchange: string;
  /** e.g. "us_equity", "crypto". */
  assetClass: string;
  /** Broker status, e.g. "active" | "inactive". */
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easyToBorrow: boolean;
  fractionable: boolean;
}

/**
 * One row of the broker's asset master, trimmed to what search and labels
 * need. Thousands of these are cached client-side (see data/symbolIndex.ts),
 * so keep it small.
 */
export interface AssetSummary {
  symbol: string;
  name: string;
  exchange: string;
}

/** One row of the broker's top-gainers / top-losers screen. */
export interface Mover {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
}

/** One row of the broker's most-active screen (by share volume). */
export interface ActiveStock {
  symbol: string;
  volume: number;
  tradeCount: number;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary?: string;
  source: string;
  url: string;
  createdAt: string;
  symbols: string[];
}
