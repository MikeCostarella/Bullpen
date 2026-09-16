import { useEffect, useState, type FormEvent } from "react";
import { useBroker } from "../../app/BrokerContext";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import { SymbolSearch } from "../../components/SymbolSearch";
import type { OrderIntent, OrderType, Side, TimeInForce } from "../../broker/types";
import { MANUAL_SOURCE } from "../../pipeline/attribution";
import type { PipelineResult } from "../../pipeline/orderPipeline";
import type { RiskVerdict } from "../../pipeline/riskGuard";
import { fmtMoney } from "../../lib/format";
import { usePolling } from "../../hooks/usePolling";

/**
 * The MANUAL source. It never talks to the broker: it builds an OrderIntent
 * and hands it to the pipeline, exactly as a strategy will.
 */
interface Props {
  symbol: string;
  onSymbolChange: (s: string) => void;
  onDetail: (s: string) => void;
  onSubmitted: (r: PipelineResult) => void;
}

export function OrderTicket({ symbol, onSymbolChange, onDetail, onSubmitted }: Props) {
  const { broker, pipeline } = useBroker();
  const { nameOf } = useSymbolIndex();
  const [side, setSide] = useState<Side>("buy");
  const [type, setType] = useState<OrderType>("market");
  const [tif, setTif] = useState<TimeInForce>("day");
  const [qty, setQty] = useState("1");
  const [limitPrice, setLimitPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<RiskVerdict>();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PipelineResult>();

  const quote = usePolling(() => broker.getQuotes([symbol]).then((q) => q[0]), 10_000, symbol, !!symbol);

  const intent = (): OrderIntent => ({
    source: MANUAL_SOURCE,
    symbol,
    side,
    qty: Number(qty),
    type,
    timeInForce: tif,
    limitPrice: limitPrice ? Number(limitPrice) : undefined,
    stopPrice: stopPrice ? Number(stopPrice) : undefined,
    reason,
  });

  /* Live guard preview, debounced. */
  useEffect(() => {
    if (!symbol || !qty) return;
    const t = window.setTimeout(() => {
      pipeline
        .preview(intent())
        .then(setPreview)
        .catch(() => setPreview(undefined));
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, side, type, tif, qty, limitPrice, stopPrice, reason]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const r = await pipeline.submit(intent());
      setResult(r);
      onSubmitted(r);
      if (r.order) {
        setReason("");
        setQty("1");
      }
    } finally {
      setBusy(false);
    }
  };

  const ref = quote.data?.last;
  const est = ref && Number(qty) > 0 ? Number(qty) * (type === "limit" ? Number(limitPrice) || ref : ref) : undefined;
  const needsLimit = type === "limit" || type === "stop_limit";
  const needsStop = type === "stop" || type === "stop_limit";
  const reasonMissing = reason.trim().length === 0;

  return (
    <form onSubmit={submit}>
      <div className="card">
        <div className="field">
          <label htmlFor="ot-symbol">
            Symbol{nameOf(symbol) ? <span className="sym-name"> · {nameOf(symbol)}</span> : null}
          </label>
          <SymbolSearch id="ot-symbol" value={symbol} onChange={(v) => onSymbolChange(v.toUpperCase())} onPick={onSymbolChange} />
          <div className="sub" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span>
              {quote.data
                ? `Last ${fmtMoney(quote.data.last)} · Bid ${fmtMoney(quote.data.bid)} · Ask ${fmtMoney(quote.data.ask)}`
                : "no quote"}
            </span>
            {symbol && (
              <button className="info-btn" type="button" title={`About ${symbol}`} onClick={() => onDetail(symbol)}>
                i
              </button>
            )}
          </div>
        </div>

        <div className="seg">
          <button type="button" className={`buy ${side === "buy" ? "active" : ""}`} onClick={() => setSide("buy")}>
            Buy
          </button>
          <button type="button" className={`sell ${side === "sell" ? "active" : ""}`} onClick={() => setSide("sell")}>
            Sell
          </button>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="ot-qty">Quantity (shares)</label>
            <input id="ot-qty" value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" pattern="[0-9]*" />
          </div>
          <div className="field">
            <label htmlFor="ot-type">Order type</label>
            <select id="ot-type" value={type} onChange={(e) => setType(e.target.value as OrderType)}>
              <option value="market">Market</option>
              <option value="limit">Limit</option>
              <option value="stop">Stop</option>
              <option value="stop_limit">Stop-limit</option>
            </select>
          </div>
        </div>

        <div className="field-row">
          {needsLimit && (
            <div className="field">
              <label htmlFor="ot-limit">Limit price</label>
              <input id="ot-limit" value={limitPrice} onChange={(e) => setLimitPrice(e.target.value)} inputMode="decimal" placeholder={ref?.toFixed(2)} />
            </div>
          )}
          {needsStop && (
            <div className="field">
              <label htmlFor="ot-stop">Stop price</label>
              <input id="ot-stop" value={stopPrice} onChange={(e) => setStopPrice(e.target.value)} inputMode="decimal" placeholder={ref?.toFixed(2)} />
            </div>
          )}
          <div className="field">
            <label htmlFor="ot-tif">Time in force</label>
            <select id="ot-tif" value={tif} onChange={(e) => setTif(e.target.value as TimeInForce)}>
              <option value="day">Day</option>
              <option value="gtc">Good-til-canceled</option>
            </select>
          </div>
        </div>

        <div className={`field field--required ${reasonMissing ? "field--missing" : ""}`}>
          <label htmlFor="ot-reason">
            Why? <span className="req" aria-hidden="true">*</span>
            <span className="sub" style={{ marginLeft: 6 }}>required — goes in the journal</span>
          </label>
          <textarea
            id="ot-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="What's the thesis? What would make you wrong? Where's the exit?"
            required
            aria-required="true"
            aria-invalid={reasonMissing}
            aria-describedby="ot-reason-hint"
          />
          <div id="ot-reason-hint" className={`field-hint ${reasonMissing ? "field-hint--missing" : ""}`}>
            {reasonMissing ? "Required — the journal needs a reason before you can trade." : "Saved with the order in the journal."}
          </div>
        </div>

        {preview && (
          <div className={`verdict ${preview.ok ? "verdict--ok" : "verdict--bad"}`}>
            <strong>{preview.ok ? "Guard: OK" : "Guard: blocked"}</strong>
            {est !== undefined && <span> · est. {fmtMoney(est)}</span>}
            {preview.violations.length > 0 && (
              <ul>
                {preview.violations.map((v) => (
                  <li key={v}>{v}</li>
                ))}
              </ul>
            )}
            {preview.warnings.length > 0 && (
              <ul style={{ color: "var(--accent)" }}>
                {preview.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button
          className={`btn ${side === "buy" ? "btn--buy" : "btn--sell"}`}
          type="submit"
          disabled={busy || !preview?.ok}
        >
          {busy ? "Submitting…" : `${side === "buy" ? "Buy" : "Sell"} ${qty || 0} ${symbol}`}
        </button>
      </div>

      {result && (
        <div className={`banner ${result.order ? "banner--info" : "banner--error"}`}>
          {result.order
            ? `Order ${result.order.status}: ${result.order.side} ${result.order.qty} ${result.order.symbol} (${result.order.clientOrderId})`
            : result.entry.outcome === "guard_rejected"
              ? `Blocked by the risk guard: ${result.entry.violations?.join("; ")}`
              : `Broker refused: ${result.entry.error}`}
        </div>
      )}
    </form>
  );
}
