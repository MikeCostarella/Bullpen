import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AssetSummary } from "../broker/types";
import { fetchIndex, isStale, readCachedIndex, type SymbolIndex } from "../data/symbolIndex";
import { searchSymbols, type SymbolMatch } from "../data/symbolSearch";
import { useBroker } from "./BrokerContext";

export type IndexStatus = "loading" | "ready" | "error";

interface SymbolIndexCtx {
  status: IndexStatus;
  /** Set when status is "error"; the app still works, just without search/names. */
  error?: Error;
  /** Number of symbols known; 0 until loaded. */
  count: number;
  search: (query: string, limit?: number) => SymbolMatch[];
  /** Company name for a ticker, or undefined if unknown / not loaded yet. */
  nameOf: (symbol: string) => string | undefined;
  lookup: (symbol: string) => AssetSummary | undefined;
  /** true once loaded and the symbol is NOT in the asset master. */
  isUnknown: (symbol: string) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<SymbolIndexCtx | null>(null);

export function SymbolIndexProvider({ children }: { children: ReactNode }) {
  const { broker } = useBroker();
  const [index, setIndex] = useState<SymbolIndex>();
  const [status, setStatus] = useState<IndexStatus>("loading");
  const [error, setError] = useState<Error>();
  const inflight = useRef<Promise<void>>();

  const refresh = useCallback(async () => {
    if (inflight.current) return inflight.current;
    inflight.current = fetchIndex(broker)
      .then((idx) => {
        setIndex(idx);
        setStatus("ready");
        setError(undefined);
      })
      .catch((e: Error) => {
        setError(e);
        // Keep whatever we had; only flag an error when there is nothing to show.
        setStatus((s) => (s === "ready" ? s : "error"));
      })
      .finally(() => {
        inflight.current = undefined;
      });
    return inflight.current;
  }, [broker]);

  useEffect(() => {
    let cancelled = false;
    readCachedIndex().then((cached) => {
      if (cancelled) return;
      if (cached) {
        setIndex(cached);
        setStatus("ready");
        if (isStale(cached)) void refresh();
      } else {
        void refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<SymbolIndexCtx>(() => {
    const assets = index?.assets ?? [];
    const by = index?.bySymbol;
    return {
      status,
      error,
      count: assets.length,
      search: (q, limit) => searchSymbols(assets, q, limit),
      nameOf: (s) => by?.get(s.toUpperCase())?.name,
      lookup: (s) => by?.get(s.toUpperCase()),
      isUnknown: (s) => !!by && !by.has(s.toUpperCase()),
      refresh,
    };
  }, [index, status, error, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSymbolIndex(): SymbolIndexCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSymbolIndex must be used inside SymbolIndexProvider");
  return v;
}
