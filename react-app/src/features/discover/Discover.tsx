import { useState } from "react";
import { useBroker } from "../../app/BrokerContext";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import type { Quote } from "../../broker/types";
import { ErrorBanner } from "../../components/ErrorBanner";
import { SymbolSearch } from "../../components/SymbolSearch";
import { discoverGroups } from "../../config/discover";
import { isJunk } from "../../data/junk";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { usePolling } from "../../hooks/usePolling";
import { fmtAgo, fmtCompact, fmtMoney } from "../../lib/format";
import { useWatchlist } from "../watchlist/useWatchlist";
import { ByLocation } from "./ByLocation";
import { PriceCell, Row } from "./rows";

const MOVERS = "movers";
const LOCATION = "location";

type Screen = "gainers" | "losers" | "active";

const SHOW = 10;
/** Ask for more than we show so there is something left after filtering. */
const FETCH = 40;
/** Sub-$1 names dominate raw market-wide screens and teach nothing; see data/junk.ts for the rest. */
const MIN_PRICE = 1;

interface Props {
  onSelect: (symbol: string) => void;
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
  const [query, setQuery] = useState("");
  const [groupId, setGroupId] = useLocalStorage<string>("bullpen.discover.chip.v1", MOVERS);
  const group = discoverGroups.find((g) => g.id === groupId) ?? discoverGroups[0];
  const isGroup = groupId !== MOVERS && groupId !== LOCATION;

  const movers = usePolling(() => broker.getMovers(FETCH), 60_000, "movers", groupId === MOVERS);
  const actives = usePolling(() => broker.getMostActive(FETCH), 60_000, "actives", groupId === MOVERS);
  const keep = (symbol: string, price?: number) =>
    !isJunk(symbol, nameOf(symbol)) && (price === undefined || price >= MIN_PRICE);
  const activeSymbols = (actives.data?.stocks ?? [])
    .filter((s) => keep(s.symbol))
    .slice(0, SHOW * 2)
    .map((s) => s.symbol);
  const activeQuotes = usePolling(
    () => broker.getQuotes(activeSymbols),
    30_000,
    `active:${activeSymbols.join(",")}`,
    groupId === MOVERS && activeSymbols.length > 0,
  );
  const groupSymbols = group.entries.map((e) => e.symbol);
  const groupQuotes = usePolling(() => broker.getQuotes(groupSymbols), 15_000, `group:${group.id}`, isGroup);

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

      {/* Same type-ahead as the watchlist, but picking opens the detail panel
          instead of adding a row — Discover is for looking, not collecting. */}
      <div className="inline-form">
        <SymbolSearch
          value={query}
          onChange={setQuery}
          onPick={(s) => {
            setQuery("");
            onSelect(s);
          }}
          placeholder="Find a company or ticker"
        />
      </div>

      <div className="chips">
        <button type="button" className={`chip ${groupId === MOVERS ? "chip--active" : ""}`} onClick={() => setGroupId(MOVERS)}>
          Today's movers
        </button>
        <button type="button" className={`chip ${groupId === LOCATION ? "chip--active" : ""}`} onClick={() => setGroupId(LOCATION)}>
          By location
        </button>
        {discoverGroups.map((g) => (
          <button key={g.id} type="button" className={`chip ${g.id === groupId ? "chip--active" : ""}`} onClick={() => setGroupId(g.id)}>
            {g.title}
          </button>
        ))}
      </div>

      {groupId === MOVERS && (
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
          Whole-market screens, with warrants, units, preferreds and sub-$1 names filtered out. Big % moves are usually tiny
          companies — tap a row before you judge it.
        </div>
      </div>
      )}

      {groupId === LOCATION && <ByLocation onSelect={onSelect} />}
      {isGroup && (
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
      )}
    </>
  );
}
