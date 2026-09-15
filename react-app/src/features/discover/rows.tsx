import type { ReactNode } from "react";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import type { Quote } from "../../broker/types";
import { fmtMoney, fmtPct, fmtSigned, signClass } from "../../lib/format";

interface RowProps {
  symbol: string;
  label?: string;
  sub?: ReactNode;
  right: ReactNode;
  inList: boolean;
  onSelect: (symbol: string) => void;
  onToggle: (symbol: string) => void;
}

/** Hoisted (not defined inside Discover) so polling re-renders don't remount every row. */
export function Row({ symbol, label, sub, right, inList, onSelect, onToggle }: RowProps) {
  const { nameOf } = useSymbolIndex();
  const name = label ?? nameOf(symbol);
  return (
    <div className="row row--tap" onClick={() => onSelect(symbol)}>
      <div className="row__main">
        <div className="sym-line">
          <span className="sym">{symbol}</span>
          {name && <span className="sym-name">{name}</span>}
        </div>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="num">{right}</div>
      <button
        type="button"
        className={`add-btn ${inList ? "add-btn--in" : ""}`}
        title={inList ? "Remove from watchlist" : "Add to watchlist"}
        aria-label={inList ? `Remove ${symbol} from watchlist` : `Add ${symbol} to watchlist`}
        onClick={(e) => {
          e.stopPropagation();
          onToggle(symbol);
        }}
      >
        {inList ? "✓" : "+"}
      </button>
    </div>
  );
}

export function PriceCell({ q, price, change, changePct }: { q?: Quote; price?: number; change?: number; changePct?: number }) {
  const p = q?.last ?? price;
  const c = q?.change ?? change;
  const cp = q?.changePct ?? changePct;
  return (
    <>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{p !== undefined ? fmtMoney(p) : "—"}</div>
      <div className={`sub ${signClass(c)}`}>{c !== undefined ? `${fmtSigned(c)} (${fmtPct(cp)})` : ""}</div>
    </>
  );
}
