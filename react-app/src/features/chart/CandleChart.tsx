import { useEffect, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { useBroker } from "../../app/BrokerContext";
import type { Bar, Timeframe } from "../../broker/types";
import { ErrorBanner } from "../../components/ErrorBanner";
import { fmtMoney, fmtPct, signClass } from "../../lib/format";

const TIMEFRAMES: { tf: Timeframe; label: string; lookbackDays: number }[] = [
  { tf: "5Min", label: "5m", lookbackDays: 3 },
  { tf: "15Min", label: "15m", lookbackDays: 7 },
  { tf: "1Hour", label: "1h", lookbackDays: 30 },
  { tf: "1Day", label: "1D", lookbackDays: 365 * 2 },
];

interface Props {
  symbol: string;
  onTrade: (symbol: string) => void;
  onDetail: (symbol: string) => void;
}

export function CandleChart({ symbol, onTrade, onDetail }: Props) {
  const { broker } = useBroker();
  const [tf, setTf] = useState<Timeframe>("1Day");
  const [bars, setBars] = useState<Bar[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(false);

  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();
  const candlesRef = useRef<ISeriesApi<"Candlestick">>();
  const volumeRef = useRef<ISeriesApi<"Histogram">>();

  /* Create the chart once. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const css = getComputedStyle(document.documentElement);
    const chart = createChart(host, {
      layout: {
        background: { type: ColorType.Solid, color: css.getPropertyValue("--surface").trim() || "#171e26" },
        textColor: css.getPropertyValue("--text-muted").trim() || "#8b98a5",
        fontFamily: css.getPropertyValue("--font"),
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.04)" },
        horzLines: { color: "rgba(255,255,255,0.04)" },
      },
      rightPriceScale: { borderColor: "#2a3644" },
      timeScale: { borderColor: "#2a3644", timeVisible: true, secondsVisible: false },
      crosshair: { mode: 0 },
      handleScroll: { vertTouchDrag: false },
      autoSize: true,
    });
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    chartRef.current = chart;
    candlesRef.current = candles;
    volumeRef.current = volume;
    return () => {
      chart.remove();
      chartRef.current = undefined;
    };
  }, []);

  /* Load bars whenever symbol/timeframe changes. */
  useEffect(() => {
    let cancelled = false;
    const spec = TIMEFRAMES.find((t) => t.tf === tf)!;
    const start = new Date(Date.now() - spec.lookbackDays * 86_400_000);
    setLoading(true);
    broker
      .getBars(symbol, tf, { start, limit: 1000 })
      .then((b) => {
        if (cancelled) return;
        setBars(b);
        setError(undefined);
      })
      .catch((e: Error) => !cancelled && setError(e))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [broker, symbol, tf]);

  /* Push bars into the series. */
  useEffect(() => {
    const candles = candlesRef.current;
    const volume = volumeRef.current;
    const chart = chartRef.current;
    if (!candles || !volume || !chart) return;
    candles.setData(
      bars.map((b) => ({ time: b.time as UTCTimestamp, open: b.open, high: b.high, low: b.low, close: b.close })),
    );
    volume.setData(
      bars.map((b) => ({
        time: b.time as UTCTimestamp,
        value: b.volume,
        color: b.close >= b.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
      })),
    );
    chart.timeScale().applyOptions({ timeVisible: tf !== "1Day" });
    chart.timeScale().fitContent();
  }, [bars, tf]);

  const last = bars[bars.length - 1];
  const first = bars[0];
  const change = last && first ? last.close - first.open : undefined;
  const changePct = change !== undefined && first ? (change / first.open) * 100 : undefined;

  return (
    <>
      <ErrorBanner error={error} />
      <div className="chart-wrap">
        <div className="chart-toolbar">
          <div>
            <span className="sym">{symbol}</span>{" "}
            <button className="info-btn" type="button" title={`About ${symbol}`} onClick={() => onDetail(symbol)}>
              i
            </button>{" "}
            {last && (
              <span className="num" style={{ marginLeft: 6 }}>
                {fmtMoney(last.close)}{" "}
                <span className={`sub ${signClass(change)}`}>{fmtPct(changePct)} over range</span>
              </span>
            )}
          </div>
          <div className="tf">
            {TIMEFRAMES.map((t) => (
              <button key={t.tf} className={t.tf === tf ? "active" : ""} onClick={() => setTf(t.tf)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div ref={hostRef} className="chart-canvas" />
        {loading && <div className="sub" style={{ padding: "6px 10px" }}>Loading bars…</div>}
        {!loading && bars.length === 0 && !error && (
          <div className="empty">No bars returned for {symbol} on this timeframe.</div>
        )}
      </div>
      <button className="btn btn--buy" onClick={() => onTrade(symbol)}>
        Trade {symbol}
      </button>
      <div className="footer-note">Split-adjusted IEX bars. Pinch to zoom, drag to pan.</div>
    </>
  );
}
