import { useState, type FormEvent } from "react";
import { useBroker } from "../../app/BrokerContext";
import { defaultWatchlist } from "../../config/watchlist";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { usePolling } from "../../hooks/usePolling";
import { fmtMoney, fmtPct, fmtSigned, signClass } from "../../lib/format";
import { ErrorBanner } from "../../components/ErrorBanner";

interface Props {
  onSelect: (symbol: string) => void;
}

export function Watchlist({ onSelect }: Props) {
  const { broker } = useBroker();
  const [symbols, setSymbols] = useLocalStorage<string[]>("bullpen.watchlist.v1", defaultWatchlist);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const quotes = usePolling(() => broker.getQuotes(symbols), 15_000, symbols.join(","), symbols.length > 0);
  const bySymbol = new Map((quotes.data ?? []).map((q) => [q.symbol, q]));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const s = draft.trim().toUpperCase();
    if (s && !symbols.includes(s)) setSymbols([...symbols, s]);
    setDraft("");
  };
  const remove = (s: string) => setSymbols(symbols.filter((x) => x !== s));

  return (
    <>
      <ErrorBanner error={quotes.error} />
      <form className="inline-form" onSubmit={add}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add symbol"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
        />
        <button className="btn btn--ghost" type="submit" disabled={!draft.trim()}>
          Add
        </button>
        <button className="btn btn--ghost" type="button" onClick={() => setEditing((v) => !v)}>
          {editing ? "Done" : "Edit"}
        </button>
      </form>

      <div className="card">
        {symbols.length === 0 && <div className="empty">Watchlist is empty. Add a symbol above.</div>}
        {symbols.map((s) => {
          const q = bySymbol.get(s);
          return (
            <div key={s} className="row row--tap" onClick={() => (editing ? undefined : onSelect(s))}>
              <div>
                <div className="sym">{s}</div>
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
