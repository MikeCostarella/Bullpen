import { useBroker } from "../../app/BrokerContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { usePolling } from "../../hooks/usePolling";
import { fmtMoney, fmtPct, fmtQty, fmtSigned, fmtTime, signClass } from "../../lib/format";
import { env } from "../../config/env";

const OPEN_STATUSES = new Set(["new", "accepted", "pending_new", "partially_filled", "held"]);

export function AccountPanel({ onSelect }: { onSelect: (symbol: string) => void }) {
  const { broker } = useBroker();
  const account = usePolling(() => broker.getAccount(), 20_000, "account");
  const positions = usePolling(() => broker.getPositions(), 15_000, "positions");
  const orders = usePolling(() => broker.getOrders({ status: "all", limit: 50 }), 15_000, "orders");
  const clock = usePolling(() => broker.getClock(), 60_000, "clock");

  const a = account.data;
  const dayPl = a ? a.equity - a.lastEquity : undefined;
  const dayPlPct = a && a.lastEquity ? ((a.equity - a.lastEquity) / a.lastEquity) * 100 : undefined;

  const cancel = async (id: string) => {
    try {
      await broker.cancelOrder(id);
      await orders.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  const open = (orders.data ?? []).filter((o) => OPEN_STATUSES.has(o.status));
  const recent = (orders.data ?? []).filter((o) => !OPEN_STATUSES.has(o.status)).slice(0, 15);

  return (
    <>
      <ErrorBanner error={account.error ?? positions.error ?? orders.error} />

      <div className="card">
        <div className="card__title">
          <span>{env.paper ? "Paper account" : "LIVE ACCOUNT"}</span>
          <span className={`pill ${clock.data?.isOpen ? "pill--ok" : "pill--muted"}`}>
            {clock.data ? (clock.data.isOpen ? "Market open" : "Market closed") : "…"}
          </span>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="stat__label">Equity</div>
            <div className="stat__value">{fmtMoney(a?.equity, 0)}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Today</div>
            <div className={`stat__value ${signClass(dayPl)}`}>
              {fmtSigned(dayPl, 0)} <span style={{ fontSize: 12 }}>{fmtPct(dayPlPct)}</span>
            </div>
          </div>
          <div className="stat">
            <div className="stat__label">Cash</div>
            <div className="stat__value">{fmtMoney(a?.cash, 0)}</div>
          </div>
          <div className="stat">
            <div className="stat__label">Buying power</div>
            <div className="stat__value">{fmtMoney(a?.buyingPower, 0)}</div>
          </div>
        </div>
        {a && a.dayTradeCount > 0 && (
          <div className="sub" style={{ marginTop: 8 }}>
            Day trades (5-day window): {a.dayTradeCount}
            {a.patternDayTrader ? " · flagged PDT" : ""}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card__title">Positions</div>
        {positions.data?.length === 0 && <div className="empty">No open positions.</div>}
        {positions.data?.map((p) => (
          <div key={p.symbol} className="row row--tap" onClick={() => onSelect(p.symbol)}>
            <div>
              <div className="sym">{p.symbol}</div>
              <div className="sub">
                {fmtQty(p.qty)} @ {fmtMoney(p.avgEntryPrice)} · now {fmtMoney(p.currentPrice)}
              </div>
            </div>
            <div className="num">
              <div style={{ fontWeight: 600 }}>{fmtMoney(p.marketValue, 0)}</div>
              <div className={`sub ${signClass(p.unrealizedPl)}`}>
                {fmtSigned(p.unrealizedPl)} ({fmtPct(p.unrealizedPlPct)})
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card__title">Open orders</div>
        {open.length === 0 && <div className="empty">No open orders.</div>}
        {open.map((o) => (
          <div key={o.id} className="row">
            <div>
              <div>
                <span className={`sym ${o.side === "buy" ? "up" : "down"}`}>{o.side.toUpperCase()}</span>{" "}
                <span className="sym">
                  {fmtQty(o.qty)} {o.symbol}
                </span>{" "}
                <span className="pill pill--muted">{o.source}</span>
              </div>
              <div className="sub">
                {o.type}
                {o.limitPrice ? ` @ ${fmtMoney(o.limitPrice)}` : ""}
                {o.stopPrice ? ` stop ${fmtMoney(o.stopPrice)}` : ""} · {o.timeInForce} · {o.status} · {fmtTime(o.submittedAt)}
              </div>
            </div>
            <button className="btn btn--danger" onClick={() => cancel(o.id)}>
              Cancel
            </button>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card__title">Recent orders</div>
        {recent.length === 0 && <div className="empty">Nothing yet.</div>}
        {recent.map((o) => (
          <div key={o.id} className="row">
            <div>
              <div>
                <span className={`sym ${o.side === "buy" ? "up" : "down"}`}>{o.side.toUpperCase()}</span>{" "}
                <span className="sym">
                  {fmtQty(o.filledQty || o.qty)} {o.symbol}
                </span>{" "}
                <span className="pill pill--muted">{o.source}</span>
              </div>
              <div className="sub">
                {o.status}
                {o.filledAvgPrice ? ` @ ${fmtMoney(o.filledAvgPrice)}` : ""} · {fmtTime(o.filledAt ?? o.submittedAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
