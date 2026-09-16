import { useMemo, useState } from "react";
import { useBroker } from "../../app/BrokerContext";
import { useSymbolIndex } from "../../app/SymbolIndexContext";
import { ErrorBanner } from "../../components/ErrorBanner";
import { REGIONS, US_STATES } from "../../config/usStates";
import { HqMissingError, loadHq, tally, type HqRow } from "../../data/hq";
import { isJunk } from "../../data/junk";
import { useAsync } from "../../hooks/useAsync";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { usePolling } from "../../hooks/usePolling";
import { fmtDate } from "../../lib/format";
import { useWatchlist } from "../watchlist/useWatchlist";
import { PriceCell, Row } from "./rows";

interface Pick {
  /** A REGIONS id, or "" for the state/city selects. */
  region: string;
  state: string;
  /** "" = all cities in the state. */
  city: string;
}
const DEFAULT_PICK: Pick = { region: "mahoning", state: "OH", city: "" };
const PAGE = 30;

interface Props {
  onSelect: (symbol: string) => void;
}

/**
 * Browse listed companies by where they're headquartered — SEC business
 * address, joined to tickers by scripts/build-hq.mjs. Regions are ZIP-prefix
 * based; otherwise pick a state and optionally a city.
 */
export function ByLocation({ onSelect }: Props) {
  const { broker } = useBroker();
  const index = useSymbolIndex();
  const watch = useWatchlist();
  const [pick, setPick] = useLocalStorage<Pick>("bullpen.discover.location.v1", DEFAULT_PICK);
  const [limit, setLimit] = useState(PAGE);
  const [hideJunk, setHideJunk] = useLocalStorage<boolean>("bullpen.discover.location.hideJunk.v1", true);

  const hq = useAsync(() => loadHq(), "hq");
  const data = hq.data;

  // Only US filers get a state; everything else is bucketed by country for the picker's tail.
  const usRows = useMemo(() => (data?.rows ?? []).filter((r) => r.country === "US" && US_STATES[r.state]), [data]);
  const states = useMemo(() => tally(usRows, (r) => r.state), [usRows]);
  const cities = useMemo(
    () => tally(usRows.filter((r) => r.state === pick.state), (r) => r.city),
    [usRows, pick.state],
  );

  const region = REGIONS.find((r) => r.id === pick.region);
  const { matches, hidden } = useMemo(() => {
    let rows: HqRow[];
    if (region) rows = usRows.filter((r) => region.zip3.some((z) => r.zip.startsWith(z)));
    else rows = usRows.filter((r) => r.state === pick.state && (!pick.city || r.city === pick.city));
    // Drop tickers the broker can't trade (delisted, OTC-only when the index excludes them, …).
    if (index.status === "ready") rows = rows.filter((r) => !index.isUnknown(r.symbol));
    // Warrants, units and SPAC shells: hidden by default, counted so the toggle explains itself.
    const before = rows.length;
    if (hideJunk) rows = rows.filter((r) => !isJunk(r.symbol, index.nameOf(r.symbol)));
    rows.sort((a, b) => a.city.localeCompare(b.city) || a.symbol.localeCompare(b.symbol));
    return { matches: rows, hidden: before - rows.length };
  }, [usRows, region, pick.state, pick.city, index, hideJunk]);

  const shown = matches.slice(0, limit);
  const shownSymbols = shown.map((r) => r.symbol);
  const quotes = usePolling(
    () => broker.getQuotes(shownSymbols),
    15_000,
    `loc:${shownSymbols.join(",")}`,
    shownSymbols.length > 0,
  );
  const bySym = new Map((quotes.data ?? []).map((q) => [q.symbol, q]));

  const choose = (next: Partial<Pick>) => {
    setPick((p) => ({ ...p, ...next }));
    setLimit(PAGE);
  };

  const title = region ? region.title : pick.city ? `${pick.city}, ${pick.state}` : US_STATES[pick.state] ?? pick.state;

  if (hq.error instanceof HqMissingError) {
    return (
      <div className="card">
        <div className="card__title">By location</div>
        <div className="banner banner--info" style={{ marginBottom: 0 }}>
          Location data hasn't been built yet. It comes from SEC filings, not the broker, so it's a one-time
          download: run <code>npm run build:hq</code> in <code>react-app/</code> (about a minute, ~200 MB
          of SEC data), then reload. Rebuild every quarter or so.
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__title">
        <span>By location</span>
        {data && <span className="pill pill--muted">SEC filings · {fmtDate(data.built)}</span>}
      </div>
      <ErrorBanner error={hq.error ?? quotes.error} />

      <div className="chips" style={{ paddingBottom: 8 }}>
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            className={`chip ${pick.region === r.id ? "chip--active" : ""}`}
            onClick={() => choose({ region: r.id })}
          >
            {r.title}
          </button>
        ))}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="loc-state">State</label>
          <select
            id="loc-state"
            value={pick.state}
            onChange={(e) => choose({ region: "", state: e.target.value, city: "" })}
            disabled={!data}
          >
            {states.map(([code, n]) => (
              <option key={code} value={code}>
                {US_STATES[code]} ({n})
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="loc-city">City</label>
          <select
            id="loc-city"
            value={pick.region ? "" : pick.city}
            onChange={(e) => choose({ region: "", city: e.target.value })}
            disabled={!data}
          >
            <option value="">All of {US_STATES[pick.state] ?? pick.state}</option>
            {cities.map(([city, n]) => (
              <option key={city} value={city}>
                {city} ({n})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="sub" style={{ marginBottom: 6, display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
        <span>
          {data ? `${matches.length} listed compan${matches.length === 1 ? "y" : "ies"} headquartered in ${title}` : "loading…"}
        </span>
        <label className="check">
          <input type="checkbox" checked={hideJunk} onChange={(e) => setHideJunk(e.target.checked)} />
          Hide warrants, units &amp; SPAC shells{hideJunk && hidden > 0 ? ` (${hidden} hidden)` : ""}
        </label>
      </div>

      {shown.map((r) => (
        <Row
          key={r.symbol}
          symbol={r.symbol}
          sub={`${r.city}, ${r.state}`}
          right={<PriceCell q={bySym.get(r.symbol)} />}
          inList={watch.has(r.symbol)}
          onSelect={onSelect}
          onToggle={watch.toggle}
        />
      ))}
      {data && matches.length === 0 && <div className="empty">No listed companies here.</div>}
      {matches.length > limit && (
        <button type="button" className="btn btn--ghost" style={{ width: "100%", marginTop: 8 }} onClick={() => setLimit((l) => l + PAGE)}>
          Show {Math.min(PAGE, matches.length - limit)} more of {matches.length}
        </button>
      )}
      <div className="footer-note" style={{ marginTop: 10 }}>
        Business address from the latest SEC filing. Companies incorporated abroad show their foreign HQ and don't appear here.
      </div>
    </div>
  );
}
