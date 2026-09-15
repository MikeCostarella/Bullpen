import type {
  Account,
  ActiveStock,
  AssetInfo,
  AssetSummary,
  Bar,
  Clock,
  Mover,
  NewsItem,
  Order,
  OrderIntent,
  Position,
  Quote,
  Timeframe,
} from "./types";

/**
 * The only door to the outside world. Exactly ONE thing calls
 * submitOrder(): the order pipeline. UI components and strategies must go
 * through the pipeline so the risk guard and journal can never be skipped.
 */
export interface BrokerAdapter {
  readonly name: string;
  readonly paper: boolean;

  getAccount(): Promise<Account>;
  getClock(): Promise<Clock>;
  getPositions(): Promise<Position[]>;
  getOrders(opts?: { status?: "open" | "closed" | "all"; limit?: number }): Promise<Order[]>;
  cancelOrder(orderId: string): Promise<void>;

  /** Pipeline-only. `clientOrderId` carries the source attribution. */
  submitOrder(intent: OrderIntent, clientOrderId: string): Promise<Order>;

  getQuotes(symbols: string[]): Promise<Quote[]>;
  /** Asset master lookup (name, exchange, tradability flags). Throws BrokerError 404 for unknown symbols. */
  getAsset(symbol: string): Promise<AssetInfo>;
  /** Every active, tradable US equity the broker knows. Large (~10k rows); callers cache it. */
  listAssets(): Promise<AssetSummary[]>;
  /** Today's biggest percentage gainers and losers (last session when the market is closed). */
  getMovers(top?: number): Promise<{ gainers: Mover[]; losers: Mover[]; asOf?: string }>;
  /** Today's most traded symbols by share volume. */
  getMostActive(top?: number): Promise<{ stocks: ActiveStock[]; asOf?: string }>;
  /** Recent headlines mentioning the symbol, newest first. */
  getNews(symbol: string, opts?: { limit?: number }): Promise<NewsItem[]>;
  getBars(symbol: string, timeframe: Timeframe, opts?: { start?: Date; end?: Date; limit?: number }): Promise<Bar[]>;
}

/** Thrown for HTTP-level failures so the UI can tell "no keys" from "offline". */
export class BrokerError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = "BrokerError";
  }
  get unauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }
}
