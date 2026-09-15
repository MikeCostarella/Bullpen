import { useState } from "react";
import { useBroker } from "../../app/BrokerContext";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import { useWatchlist } from "./useWatchlist";
import { usePolling } from "../../hooks/usePolling";
import { fmtMoney, fmtPct, fmtSigned, signClass } from "../../lib/format";
import { ErrorBanner } from "../../components/ErrorBanner";
import { SymbolSearch } from "../../components/SymbolSearch";

interface Props {
  onSelect: (symbol: string) => void;
}

export function Watchlist({ onSelect }: Props) {
  const { broker } = useBroker();
  const { nameOf } = useSymbolIndex();
  const { symbols, add: addToList, remove } = useWatchlist();
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const quotes = usePolling(() => broker.getQuotes(symbols), 15_000, symbols.join(","), symbols.length > 0);
  const bySymbol = new Map((quotes.data ?? []).map((q) => [q.symbol, q]));

  const add = (s: string) => {
    addToList(s);
    setDraft("");
  };

  return (
    <>
      <ErrorBanner error={quotes.error} />
      <div className="inline-form" style={{ alignItems: "flex-start" }}>
        <SymbolSearch value={draft} onChange={setDraft} onPick={add} placeholder="Add symbol or company" actionLabel="Add" />
        <button className="btn btn--ghost" type="button" style={{ minHeight: 42 }} onClick={() => setEditing((v) => !v)}>
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="card">
        {symbols.length === 0 && <div className="empty">Watchlist is empty. Add a symbol above.</div>}
        {symbols.map((s) => {
          const q = bySymbol.get(s);
          return (
            <div key={s} className="row row--tap" onClick={() => (editing ? undefined : onSelect(s))}>
              <div className="row__main">
                <div className="sym-line">
                  <span className="sym">{s}</span>
                  {nameOf(s) && <span className="sym-name">{nameOf(s)}</span>}
                </div>
                <div className="sub">
                  {q ? `H ${fmtMoney(q.dayHigh)} · L ${fmtMoney(q.dayLow)}` : quotes.loading ? "loading…" : "no data"}
                </div>
              </div>
              {editing ? (
                <button className="btn btn--danger" onClick={() => remove(s)}>
                  Remove
                </button>
              ) : (
                <div className="num">
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{q ? fmtMoney(q.last) : "—"}</div>
                  <div className={`sub ${signClass(q?.change)}`}>
                    {q ? `${fmtSigned(q.change)} (${fmtPct(q.changePct)})` : ""}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="footer-note">
        Tap a symbol for details. Quotes from the IEX feed (free plan), refreshed every 15s while the app is visible.
      </div>
    </>
  );
}
