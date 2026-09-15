import { BrokerError, type BrokerAdapter } from "../BrokerAdapter";
import type {
  Account,
  AssetInfo,
  AssetSummary,
  Bar,
  Clock,
  NewsItem,
  Order,
  OrderIntent,
  OrderStatus,
  Position,
  Quote,
  Timeframe,
} from "../types";
import { env } from "../../config/env";
import { sourceFromClientOrderId } from "../../pipeline/attribution";

/* ---------- Alpaca wire shapes (only the fields we read) ---------- */

interface ApcaAccount {
  id: string;
  status: string;
  equity: string;
  last_equity: string;
  cash: string;
  buying_power: string;
  portfolio_value: string;
  daytrade_count: number;
  pattern_day_trader: boolean;
}
interface ApcaClock {
  timestamp: string;
  is_open: boolean;
  next_open: string;
  next_close: string;
}
interface ApcaPosition {
  symbol: string;
  qty: string;
  avg_entry_price: string;
  current_price: string;
  market_value: string;
  unrealized_pl: string;
  unrealized_plpc: string;
}
interface ApcaOrder {
  id: string;
  client_order_id: string;
  symbol: string;
  qty: string | null;
  filled_qty: string;
  side: "buy" | "sell";
  type: string;
  time_in_force: string;
  limit_price: string | null;
  stop_price: string | null;
  filled_avg_price: string | null;
  status: string;
  submitted_at: string;
  filled_at: string | null;
}
interface ApcaBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}
interface ApcaAsset {
  symbol: string;
  name: string;
  exchange: string;
  class: string;
  status: string;
  tradable: boolean;
  marginable: boolean;
  shortable: boolean;
  easy_to_borrow: boolean;
  fractionable: boolean;
}
interface ApcaNews {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  created_at: string;
  symbols: string[];
}
interface ApcaSnapshot {
  latestTrade?: { p: number; t: string };
  latestQuote?: { ap: number; bp: number; t: string };
  dailyBar?: ApcaBar;
  prevDailyBar?: ApcaBar;
}

const num = (s: string | number | null | undefined, fallback = 0): number => {
  if (s === null || s === undefined) return fallback;
  const n = typeof s === "number" ? s : parseFloat(s);
  return Number.isFinite(n) ? n : fallback;
};

const STATUS_MAP: Record<string, OrderStatus> = {
  new: "new",
  accepted: "accepted",
  pending_new: "pending_new",
  partially_filled: "partially_filled",
  filled: "filled",
  canceled: "canceled",
  expired: "expired",
  rejected: "rejected",
  replaced: "replaced",
  pending_cancel: "pending_cancel",
  done_for_day: "done_for_day",
  held: "held",
};

const mapOrder = (o: ApcaOrder): Order => ({
  id: o.id,
  clientOrderId: o.client_order_id,
  source: sourceFromClientOrderId(o.client_order_id),
  symbol: o.symbol,
  side: o.side,
  qty: num(o.qty),
  filledQty: num(o.filled_qty),
  type: (o.type as Order["type"]) ?? "market",
  timeInForce: o.time_in_force === "gtc" ? "gtc" : "day",
  limitPrice: o.limit_price ? num(o.limit_price) : undefined,
  stopPrice: o.stop_price ? num(o.stop_price) : undefined,
  filledAvgPrice: o.filled_avg_price ? num(o.filled_avg_price) : undefined,
  status: STATUS_MAP[o.status] ?? "unknown",
  submittedAt: o.submitted_at,
  filledAt: o.filled_at ?? undefined,
});

const mapBar = (b: ApcaBar): Bar => ({
  time: Math.floor(new Date(b.t).getTime() / 1000),
  open: b.o,
  high: b.h,
  low: b.l,
  close: b.c,
  volume: b.v,
});

/* ---------- Adapter ---------- */

export class AlpacaAdapter implements BrokerAdapter {
  readonly name = "alpaca";
  readonly paper = env.paper;

  /** Free data plan = IEX feed only. Upgrade to "sip" with Algo Trader Plus. */
  private readonly feed = "iex";

  private async request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        ...init,
        headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      });
    } catch (e) {
      throw new BrokerError(`Network error: ${(e as Error).message}`, 0);
    }
    if (!res.ok) {
      let body: unknown = undefined;
      try {
        body = await res.json();
      } catch {
        /* non-JSON body */
      }
      const msg =
        (body as { message?: string } | undefined)?.message ??
        `${res.status} ${res.statusText}`;
      throw new BrokerError(msg, res.status, body);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  private trading<T>(path: string, init?: RequestInit) {
    return this.request<T>(env.tradingApi, path, init);
  }
  private data<T>(path: string) {
    return this.request<T>(env.dataApi, path);
  }

  async getAccount(): Promise<Account> {
    const a = await this.trading<ApcaAccount>("/v2/account");
    return {
      id: a.id,
      status: a.status,
      equity: num(a.equity),
      lastEquity: num(a.last_equity),
      cash: num(a.cash),
      buyingPower: num(a.buying_power),
      portfolioValue: num(a.portfolio_value),
      dayTradeCount: a.daytrade_count ?? 0,
      patternDayTrader: !!a.pattern_day_trader,
    };
  }

  async getClock(): Promise<Clock> {
    const c = await this.trading<ApcaClock>("/v2/clock");
    return { timestamp: c.timestamp, isOpen: c.is_open, nextOpen: c.next_open, nextClose: c.next_close };
  }

  async getPositions(): Promise<Position[]> {
    const ps = await this.trading<ApcaPosition[]>("/v2/positions");
    return ps.map((p) => ({
      symbol: p.symbol,
      qty: num(p.qty),
      avgEntryPrice: num(p.avg_entry_price),
      currentPrice: num(p.current_price),
      marketValue: num(p.market_value),
      unrealizedPl: num(p.unrealized_pl),
      unrealizedPlPct: num(p.unrealized_plpc) * 100,
    }));
  }

  async getOrders(opts: { status?: "open" | "closed" | "all"; limit?: number } = {}): Promise<Order[]> {
    const q = new URLSearchParams({
      status: opts.status ?? "all",
      limit: String(opts.limit ?? 100),
      direction: "desc",
      nested: "true",
    });
    const os = await this.trading<ApcaOrder[]>(`/v2/orders?${q}`);
    return os.map(mapOrder);
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.trading<void>(`/v2/orders/${encodeURIComponent(orderId)}`, { method: "DELETE" });
  }

  async submitOrder(intent: OrderIntent, clientOrderId: string): Promise<Order> {
    const body: Record<string, string> = {
      symbol: intent.symbol,
      qty: String(intent.qty),
      side: intent.side,
      type: intent.type,
      time_in_force: intent.timeInForce,
      client_order_id: clientOrderId,
    };
    if (intent.limitPrice !== undefined) body.limit_price = intent.limitPrice.toFixed(2);
    if (intent.stopPrice !== undefined) body.stop_price = intent.stopPrice.toFixed(2);
    const o = await this.trading<ApcaOrder>("/v2/orders", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return mapOrder(o);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    if (symbols.length === 0) return [];
    const q = new URLSearchParams({ symbols: symbols.join(","), feed: this.feed });
    const snaps = await this.data<Record<string, ApcaSnapshot>>(`/v2/stocks/snapshots?${q}`);
    return symbols
      .filter((s) => snaps[s])
      .map((s) => {
        const snap = snaps[s];
        const prevClose = snap.prevDailyBar?.c ?? snap.dailyBar?.o ?? 0;
        const last = snap.latestTrade?.p ?? snap.dailyBar?.c ?? prevClose;
        const change = prevClose ? last - prevClose : 0;
        return {
          symbol: s,
          last,
          bid: snap.latestQuote?.bp,
          ask: snap.latestQuote?.ap,
          open: snap.dailyBar?.o,
          change,
          changePct: prevClose ? (change / prevClose) * 100 : 0,
          prevClose,
          dayHigh: snap.dailyBar?.h,
          dayLow: snap.dailyBar?.l,
          volume: snap.dailyBar?.v,
          asOf: snap.latestTrade?.t ?? snap.dailyBar?.t ?? new Date().toISOString(),
        };
      });
  }

  async getAsset(symbol: string): Promise<AssetInfo> {
    const a = await this.trading<ApcaAsset>(`/v2/assets/${encodeURIComponent(symbol)}`);
    return {
      symbol: a.symbol,
      name: a.name,
      exchange: a.exchange,
      assetClass: a.class,
      status: a.status,
      tradable: !!a.tradable,
      marginable: !!a.marginable,
      shortable: !!a.shortable,
      easyToBorrow: !!a.easy_to_borrow,
      fractionable: !!a.fractionable,
    };
  }

  async listAssets(): Promise<AssetSummary[]> {
    const q = new URLSearchParams({ status: "active", asset_class: "us_equity" });
    const all = await this.trading<ApcaAsset[]>(`/v2/assets?${q}`);
    return all
      .filter((a) => a.tradable && a.symbol && a.name)
      .map((a) => ({ symbol: a.symbol, name: a.name, exchange: a.exchange }));
  }

  async getNews(symbol: string, opts: { limit?: number } = {}): Promise<NewsItem[]> {
    const q = new URLSearchParams({
      symbols: symbol,
      limit: String(opts.limit ?? 15),
      sort: "desc",
      include_content: "false",
    });
    const res = await this.data<{ news: ApcaNews[] }>(`/v1beta1/news?${q}`);
    return (res.news ?? []).map((n) => ({
      id: String(n.id),
      headline: n.headline,
      summary: n.summary || undefined,
      source: n.source,
      url: n.url,
      createdAt: n.created_at,
      symbols: n.symbols ?? [],
    }));
  }

  async getBars(
    symbol: string,
    timeframe: Timeframe,
    opts: { start?: Date; end?: Date; limit?: number } = {},
  ): Promise<Bar[]> {
    const q = new URLSearchParams({
      symbols: symbol,
      timeframe,
      limit: String(opts.limit ?? 1000),
      adjustment: "split",
      feed: this.feed,
      sort: "asc",
    });
    if (opts.start) q.set("start", opts.start.toISOString());
    if (opts.end) q.set("end", opts.end.toISOString());
    const out: Bar[] = [];
    let pageToken: string | undefined;
    // Follow pagination up to a sane cap so a 1Min request can't run away.
    for (let page = 0; page < 5; page++) {
      if (pageToken) q.set("page_token", pageToken);
      const res = await this.data<{ bars: Record<string, ApcaBar[]>; next_page_token: string | null }>(
        `/v2/stocks/bars?${q}`,
      );
      out.push(...(res.bars?.[symbol] ?? []).map(mapBar));
      if (!res.next_page_token || out.length >= (opts.limit ?? 1000)) break;
      pageToken = res.next_page_token;
    }
    return out;
  }
}
