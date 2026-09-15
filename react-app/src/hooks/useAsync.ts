import { useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
}

/**
 * Run an async loader once per `key` (no polling). Results from a stale key
 * are discarded, so fast symbol switching never shows the wrong data.
 */
export function useAsync<T>(fn: () => Promise<T>, key: string, enabled = true): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: undefined, loading: enabled });

  useEffect(() => {
    if (!enabled) {
      setState({ data: undefined, error: undefined, loading: false });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    fn().then(
      (data) => !cancelled && setState({ data, error: undefined, loading: false }),
      (error: Error) => !cancelled && setState({ data: undefined, error, loading: false }),
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return state;
}
