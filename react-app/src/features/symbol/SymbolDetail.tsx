import { useMemo } from "react";
import { useBroker } from "../../app/BrokerContext";
import { BrokerError } from "../../broker/BrokerAdapter";
import { ErrorBanner } from "../../components/ErrorBanner";
import { fundamentalsEnabled, getFundamentals } from "../../data/fundamentals";
import { useAsync } from "../../hooks/useAsync";
import { usePolling } from "../../hooks/usePolling";
import { fmtAgo, fmtCompact, fmtDate, fmtMoney, fmtPct, fmtQty, fmtSigned, fmtTime, signClass } from "../../lib/format";
import { computeRangeStats } from "./stats";

interface Props {
  symbol: string;
  onBack: () => void;
  onChart: (symbol: string) => void;
  onTrade: (symbol: string) => void;
}

const YEAR_MS = 366 * 86_400_000;

/**
 * Everything Bullpen knows about one symbol, on one screen: what it is
 * (asset master), where it trades today (snapshot), where it has been
 * (52-week range and performance from daily bars), what you hold, what the
 * market says about it (fundamentals, if a provider is configured) and what
 * the news says. Read-only — trading still goes through the ticket.
 */
export function SymbolDetail({ symbol, onBack, onChart, onTrade }: Props) {
  const { broker } = useBroker();

  const quote = usePolling(() => broker.getQuotes([symbol]).then((q) => q[0]), 10_000, `q:${symbol}`, !!symbol);
  const asset = useAsync(() => broker.getAsset(symbol), `asset:${symbol}`, !!symbol);
  const bars = useAsync(
    () => broker.getBars(symbol, "1Day", { start: new Date(Date.now() - YEAR_MS), limit: 400 }),
    `bars:${symbol}`,
    !!symbol,
  );
  const news = useAsync(() => broker.getNews(symbol, { limit: 15 }), `news:${symbol}`, !!symbol);
  const positions = usePolling(() => broker.getPositions(), 30_000, "positions");
  const fundamentals = useAsync(() => getFundamentals(symbol), `fund:${symbol}`, !!symbol && fundamentalsEnabled);

  const q = quote.data;
  const stats = useMemo(() => computeRangeStats(bars.data ?? [], q?.last), [bars.data, q?.last]);
  const position = positions.data?.find((p) => p.symbol === symbol);
  const f = fundamentals.data;
  const unknown = asset.error instanceof BrokerError && asset.error.status === 404;

  const spread = q?.bid && q?.ask && q.ask >= q.bid ? q.ask - q.bid : undefined;
  const spreadPct = spread !== undefined && q?.ask ? (spread / q.ask) * 100 : undefined;
  const relVol = q?.volume && stats.avgVolume20 ? q.volume / stats.avgVolume20 : undefined;

  return (
    <>
      <div className="detail-bar">
        <button className="btn btn--ghost" type="button" onClick={onBack}>
          ← Back
        </button>
        <div className="detail-bar__actions">
          <button className="btn btn--ghost" type="button" onClick={() => onChart(symbol)}>
            Chart
          </button>
          <button className="btn btn--ghost detail-bar__trade" type="button" onClick={() => onTrade(symbol)}>
            Trade
          </button>
        </div>
      </div>

      {unknown ? (
        <div className="banner banner--warn">Alpaca doesn't know a symbol called {symbol}.</div>
      ) : (
        <ErrorBanner error={asset.error ?? quote.error ?? bars.error} />
      )}

      {/* ---- Header: identity + price ---- */}
      <div className="card">
        <div className="detail-head">
          <div className="detail-head__id">
            <div className="detail-head__sym">
              {f?.logo && <img className="detail-head__logo" src={f.logo} alt="" />}
              <span className="sym" style={{ fontSize: 22 }}>
                {symbol}
              </span>
            </div>
            <div className="detail-head__name">{asset.data?.name ?? f?.name ?? (asset.loading ? "loading…" : "")}</div>
            <div className="sub">
              {asset.data ? `${asset.data.exchange} · ${asset.data.assetClass.replace("_", " ")}` : ""}
              {f?.industry ? ` · ${f.industry}` : ""}
            </div>
          </div>
          <div className="num">
            <div className="detail-head__price">{fmtMoney(q?.last)}</div>
            <div className={`sub ${signClass(q?.change)}`}>{q ? `${fmtSigned(q.change)} (${fmtPct(q.changePct)})` : ""}</div>
            <div className="sub">{q ? `as of ${fmtTime(q.asOf)}` : quote.loading ? "loading…" : "no quote"}</div>
          </div>
        </div>
        {asset.data && (
          <div className="pill-row">
            <span className={`pill ${asset.data.status === "active" ? "pill--ok" : "pill--warn"}`}>{asset.data.status}</span>
            <span className={`pill ${asset.data.tradable ? "pill--ok" : "pill--warn"}`}>{asset.data.tradable ? "tradable" : "not tradable"}</span>
            <span className={`pill ${asset.data.shortable ? "pill--muted" : "pill--warn"}`}>{asset.data.shortable ? "shortable" : "no shorting"}</span>
            {asset.data.easyToBorrow && <span className="pill pill--muted">easy to borrow</span>}
            <span className="pill pill--muted">{asset.data.marginable ? "marginable" : "cash only"}</span>
            <span className="pill pill--muted">{asset.data.fractionable ? "fractional ok" : "whole shares"}</span>
          </div>
        )}
      </div>

      {/* ---- Your position ---- */}
      {position && (
        <div className="card">
          <div className="card__title">Your position</div>
          <div className="stat-grid">
            <Stat label="Shares" value={fmtQty(position.qty)} />
            <Stat label="Avg entry" value={fmtMoney(position.avgEntryPrice)} />
            <Stat label="Market value" value={fmtMoney(position.marketValue, 0)} />
            <Stat
              label="Unrealized P&L"
              value={`${fmtSigned(position.unrealizedPl)} (${fmtPct(position.unrealizedPlPct)})`}
              className={signClass(position.unrealizedPl)}
            />
          </div>
        </div>
      )}

      {/* ---- Today ---- */}
      <div className="card">
        <div className="card__title">Today</div>
        <div className="stat-grid stat-grid--3">
          <Stat label="Open" value={fmtMoney(q?.open)} />
          <Stat label="High" value={fmtMoney(q?.dayHigh)} />
          <Stat label="Low" value={fmtMoney(q?.dayLow)} />
          <Stat label="Prev close" value={fmtMoney(q?.prevClose)} />
          <Stat label="Bid" value={fmtMoney(q?.bid)} />
          <Stat label="Ask" value={fmtMoney(q?.ask)} />
          <Stat label="Spread" value={spread !== undefined ? `${fmtMoney(spread)} (${spreadPct?.toFixed(2)}%)` : "—"} />
          <Stat label="Volume" value={fmtCompact(q?.volume)} />
          <Stat
            label="Rel. volume"
            value={relVol !== undefined ? `${relVol.toFixed(2)}×` : "—"}
            hint={stats.avgVolume20 ? `vs 20d avg ${fmtCompact(stats.avgVolume20)}` : undefined}
          />
        </div>
      </div>

      {/* ---- Range & performance ---- */}
      <div className="card">
        <div className="card__title">
          <span>52-week range</span>
          {bars.loading && <span className="sub">loading bars…</span>}
        </div>
        {stats.high52 !== undefined && stats.low52 !== undefined ? (
          <>
            <div className="range">
              <span className="num">{fmtMoney(stats.low52)}</span>
              <div className="range__track">
                <div className="range__marker" style={{ left: `${(stats.rangePos ?? 0) * 100}%` }} />
              </div>
              <span className="num">{fmtMoney(stats.high52)}</span>
            </div>
            <div className="sub" style={{ textAlign: "center", marginBottom: 10 }}>
              {stats.rangePos !== undefined ? `${(stats.rangePos * 100).toFixed(0)}% of the way from the low to the high` : ""}
              {stats.high52 && q?.last ? ` · ${fmtPct(((q.last - stats.high52) / stats.high52) * 100)} from high` : ""}
            </div>
          </>
        ) : (
          !bars.loading && <div className="empty">No daily bars for {symbol}.</div>
        )}
        {stats.perf.length > 0 && (
          <div className="perf-grid">
            {stats.perf.map((p) => (
              <div key={p.label} className="perf">
                <div className="stat__label">{p.label}</div>
                <div className={`perf__value ${signClass(p.pct)}`}>{fmtPct(p.pct, 1)}</div>
              </div>
            ))}
          </div>
        )}
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <Stat label="Avg volume (20d)" value={fmtCompact(stats.avgVolume20)} />
          <Stat label="Avg volume (60d)" value={fmtCompact(stats.avgVolume60)} />
        </div>
      </div>

      {/* ---- Fundamentals ---- */}
      <div className="card">
        <div className="card__title">
          <span>Fundamentals</span>
          {fundamentals.loading && <span className="sub">loading…</span>}
        </div>
        {!fundamentalsEnabled ? (
          <div className="sub">
            Alpaca doesn't provide fundamentals. Add a free <code>FINNHUB_KEY</code> to <code>react-app/.env.local</code>{" "}
            (see <code>.env.example</code>) and restart the dev server to see market cap, P/E, EPS, dividend yield, beta and
            the next earnings date here.
          </div>
        ) : fundamentals.error ? (
          <div className="banner banner--warn" style={{ margin: 0 }}>
            {fundamentals.error.message}
          </div>
        ) : f ? (
          <>
            <div className="stat-grid stat-grid--3">
              <Stat label="Market cap" value={f.marketCap !== undefined ? `$${fmtCompact(f.marketCap)}` : "—"} />
              <Stat label="P/E (TTM)" value={f.pe !== undefined ? f.pe.toFixed(1) : "—"} />
              <Stat label="EPS (TTM)" value={f.eps !== undefined ? fmtMoney(f.eps) : "—"} />
              <Stat label="Dividend yield" value={f.dividendYield !== undefined ? `${f.dividendYield.toFixed(2)}%` : "—"} />
              <Stat label="Beta" value={f.beta !== undefined ? f.beta.toFixed(2) : "—"} />
              <Stat label="Shares out." value={fmtCompact(f.sharesOutstanding)} />
              <Stat
                label="Next earnings"
                value={f.nextEarnings ? fmtDate(f.nextEarnings.date) : "—"}
                hint={
                  f.nextEarnings
                    ? [f.nextEarnings.hour === "bmo" ? "before open" : f.nextEarnings.hour === "amc" ? "after close" : "", f.nextEarnings.epsEstimate !== undefined ? `est. EPS ${fmtMoney(f.nextEarnings.epsEstimate)}` : ""]
                        .filter(Boolean)
                        .join(" · ")
                    : undefined
                }
              />
              <Stat label="IPO" value={fmtDate(f.ipo)} />
              <Stat label="Country" value={f.country ?? "—"} />
            </div>
            {f.website && (
              <div className="sub" style={{ marginTop: 8 }}>
                <a href={f.website} target="_blank" rel="noopener noreferrer">
                  {f.website.replace(/^https?:\/\//, "")}
                </a>
              </div>
            )}
          </>
        ) : (
          !fundamentals.loading && <div className="empty">No fundamentals for {symbol} (common for ETFs on the free tier).</div>
        )}
      </div>

      {/* ---- News ---- */}
      <div className="card">
        <div className="card__title">
          <span>News</span>
          {news.loading && <span className="sub">loading…</span>}
        </div>
        {news.error && (
          <div className="banner banner--warn" style={{ margin: 0 }}>
            {news.error.message}
          </div>
        )}
        {news.data?.length === 0 && <div className="empty">No recent headlines for {symbol}.</div>}
        {news.data?.map((n) => (
          <a key={n.id} className="news" href={n.url} target="_blank" rel="noopener noreferrer">
            <div className="news__headline">{n.headline}</div>
            {n.summary && <div className="news__summary">{n.summary}</div>}
            <div className="sub">
              {n.source} · {fmtAgo(n.createdAt)}
              {n.symbols.length > 1 ? ` · ${n.symbols.filter((s) => s !== symbol).slice(0, 4).join(", ")}` : ""}
            </div>
          </a>
        ))}
      </div>

      <div className="footer-note">
        Quote and bars: Alpaca IEX feed (free plan). News: Alpaca (Benzinga).
        {fundamentalsEnabled ? " Fundamentals: Finnhub." : ""} Nothing here is advice.
      </div>
    </>
  );
}

function Stat({ label, value, hint, className }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={`stat__value stat__value--sm ${className ?? ""}`}>{value}</div>
      {hint && <div className="sub">{hint}</div>}
    </div>
  );
}
