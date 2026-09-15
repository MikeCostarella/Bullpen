import { useCallback } from "react";
import { defaultWatchlist } from "../../config/watchlist";
import { useLocalStorage } from "../../hooks/useLocalStorage";

export const WATCHLIST_KEY = "bullpen.watchlist.v1";

/**
 * The user's watchlist, persisted in localStorage. Only one tab is mounted
 * at a time, so each mount re-reads storage and sees the latest edits.
 */
export function useWatchlist() {
  const [symbols, setSymbols] = useLocalStorage<string[]>(WATCHLIST_KEY, defaultWatchlist);
  const has = useCallback((s: string) => symbols.includes(s.toUpperCase()), [symbols]);
  const add = useCallback(
    (s: string) => {
      const u = s.toUpperCase();
      setSymbols((prev) => (prev.includes(u) ? prev : [...prev, u]));
    },
    [setSymbols],
  );
  const remove = useCallback(
    (s: string) => {
      const u = s.toUpperCase();
      setSymbols((prev) => prev.filter((x) => x !== u));
    },
    [setSymbols],
  );
  const toggle = useCallback((s: string) => (has(s) ? remove(s) : add(s)), [has, add, remove]);
  return { symbols, setSymbols, has, add, remove, toggle };
}
