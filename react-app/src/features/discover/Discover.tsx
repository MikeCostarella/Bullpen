import { useState, type ReactNode } from "react";
import { useBroker } from "../../app/BrokerContext";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import type { Quote } from "../../broker/types";
import { ErrorBanner } from "../../components/ErrorBanner";
import { discoverGroups } from "../../config/discover";
import { usePolling } from "../../hooks/usePolling";
import { fmtAgo, fmtCompact, fmtMoney, fmtPct, fmtSigned, signClass } from "../../lib/format";
import { useWatchlist } from "../watchlist/useWatchlist";

type Screen = "gainers" | "losers" | "active";

const SHOW = 10;
/** Ask for more than we show so there is something left after filtering. */
const FETCH = 40;
/** Warrants, units, rights and sub-$1 names dominate raw market-wide screens and teach nothing. */
const JUNK_SYMBOL = /[.\/]/; // e.g. SLND.WS, ABC.U
const JUNK_NAME = /\b(warrants?|rights?|units?)\b/i;
const MIN_PRICE = 1;

interface Props {
  onSelect: (symbol: string) => void;
}

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
function Row({ symbol, label, sub, right, inList, onSelect, onToggle }: RowProps) {
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

function PriceCell({ q, price, change, changePct }: { q?: Quote; price?: number; change?: number; changePct?: number }) {
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

/**
 * Discover: ways in that don't start from a ticker you already know.
 * Today's movers come from the broker's screener; the curated groups are
 * static lists in config/discover.ts with live quotes. Every row opens the
 * symbol detail panel and has a one-tap add/remove for the watchlist.
 */
export function Discover({ onSelect }: Props) {
  const { broker } = useBroker();
  const { nameOf } = useSymbolIndex();
  const watch = useWatchlist();
  const [screen, setScreen] = useState<Screen>("gainers");
  const [groupId, setGroupId] = useState(discoverGroups[0].id);
  const group = discoverGroups.find((g) => g.id === groupId) ?? discoverGroups[0];

  const movers = usePolling(() => broker.getMovers(FETCH), 60_000, "movers");
  const actives = usePolling(() => broker.getMostActive(FETCH), 60_000, "actives");
  const keep = (symbol: string, price?: number) =>
    !JUNK_SYMBOL.test(symbol) && !JUNK_NAME.test(nameOf(symbol) ?? "") && (price === undefined || price >= MIN_PRICE);
  const activeSymbols = (actives.data?.stocks ?? [])
    .filter((s) => keep(s.symbol))
    .slice(0, SHOW * 2)
    .map((s) => s.symbol);
  const activeQuotes = usePolling(
    () => broker.getQuotes(activeSymbols),
    30_000,
    `active:${activeSymbols.join(",")}`,
    activeSymbols.length > 0,
  );
  const groupSymbols = group.entries.map((e) => e.symbol);
  const groupQuotes = usePolling(() => broker.getQuotes(groupSymbols), 15_000, `group:${group.id}`);

  const quoteMap = (qs: Quote[] | undefined) => new Map((qs ?? []).map((q) => [q.symbol, q]));
  const activeBySym = quoteMap(activeQuotes.data);
  const groupBySym = quoteMap(groupQuotes.data);

  const rowCommon = { onSelect, onToggle: watch.toggle };
  const moverRows = (screen === "gainers" ? movers.data?.gainers : screen === "losers" ? movers.data?.losers : undefined)
    ?.filter((m) => keep(m.symbol, m.price))
    .slice(0, SHOW);
  const activeRows = (actives.data?.stocks ?? [])
    .filter((a) => keep(a.symbol, activeBySym.get(a.symbol)?.last))
    .slice(0, SHOW);
  const screenLoading = screen === "active" ? actives.loading : movers.loading;
  const asOf = screen === "active" ? actives.data?.asOf : movers.data?.asOf;

  return (
    <>
      <ErrorBanner error={movers.error ?? actives.error ?? groupQuotes.error} />

      <div className="card">
        <div className="card__title">
          <span>Today's movers</span>
          {asOf && <span className="pill pill--muted">as of {fmtAgo(asOf)}</span>}
        </div>
        <div className="seg">
          {(["gainers", "losers", "active"] as Screen[]).map((s) => (
            <button key={s} type="button" className={screen === s ? "active" : ""} onClick={() => setScreen(s)}>
              {s === "gainers" ? "Gainers" : s === "losers" ? "Losers" : "Most active"}
            </button>
          ))}
        </div>

        {screen !== "active" &&
          (moverRows ?? []).map((m) => (
            <Row key={m.symbol} symbol={m.symbol} {...rowCommon} inList={watch.has(m.symbol)} right={<PriceCell price={m.price} change={m.change} changePct={m.changePct} />} />
          ))}
        {screen === "active" &&
          activeRows.map((a) => (
            <Row
              key={a.symbol}
              symbol={a.symbol}
              {...rowCommon}
              inList={watch.has(a.symbol)}
              sub={`${fmtCompact(a.volume, 1)} shares · ${fmtCompact(a.tradeCount, 1)} trades`}
              right={<PriceCell q={activeBySym.get(a.symbol)} />}
            />
          ))}
        {screenLoading && <div className="empty">loading…</div>}
        {!screenLoading && screen !== "active" && (moverRows?.length ?? 0) === 0 && (
          <div className="empty">Nothing to show yet.</div>
        )}
        <div className="footer-note" style={{ marginTop: 10 }}>
          Whole-market screens, with warrants, units and sub-$1 names filtered out. Big % moves are usually tiny
          companies — tap a row before you judge it.
        </div>
      </div>

      <div className="chips">
        {discoverGroups.map((g) => (
          <button key={g.id} type="button" className={`chip ${g.id === groupId ? "chip--active" : ""}`} onClick={() => setGroupId(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card__title">
          <span>{group.title}</span>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => group.entries.forEach((e) => watch.add(e.symbol))}
            disabled={group.entries.every((e) => watch.has(e.symbol))}
          >
            Add all
          </button>
        </div>
        <div className="sub" style={{ marginBottom: 6 }}>
          {group.blurb}
        </div>
        {group.entries.map((e) => {
          const q = groupBySym.get(e.symbol);
          return (
            <Row
              key={e.symbol}
              symbol={e.symbol}
              {...rowCommon}
              inList={watch.has(e.symbol)}
              label={e.label}
              sub={e.label ? nameOf(e.symbol) : q ? `H ${fmtMoney(q.dayHigh)} · L ${fmtMoney(q.dayLow)}` : undefined}
              right={<PriceCell q={q} />}
            />
          );
        })}
        {groupQuotes.loading && !groupQuotes.data && <div className="empty">loading…</div>}
      </div>
    </>
  );
}
