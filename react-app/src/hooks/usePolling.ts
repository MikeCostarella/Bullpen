import { useCallback, useEffect, useRef, useState } from "react";

export interface Polled<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  refresh: () => Promise<void>;
  lastUpdated: number | undefined;
}

/**
 * Poll an async source on an interval, pausing while the tab is hidden
 * (phones background the PWA constantly; no point burning API quota).
 * `key` restarts polling when it changes (e.g. the symbol list).
 */
export function usePolling<T>(fn: () => Promise<T>, intervalMs: number, key: string, enabled = true): Polled<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number>();
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const refresh = useCallback(async () => {
    try {
      const d = await fnRef.current();
      setData(d);
      setError(undefined);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
      timer = window.setTimeout(tick, intervalMs);
    };
    setLoading(true);
    tick();
    const onVis = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [intervalMs, key, enabled, refresh]);

  return { data, error, loading, refresh, lastUpdated };
}
