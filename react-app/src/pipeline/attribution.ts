import type { OrderSource } from "../broker/types";

/**
 * Attribution: every order's broker client_order_id starts with its source,
 * so we can always tell whose order it was — even after a reload, even if
 * localStorage is wiped, even from another device — by asking the broker.
 *
 * Format: "<source>-<base36 time>-<4 random>"  e.g. "manual-lx3k9q2-a7f1"
 * Alpaca allows up to 128 chars; we stay far below that.
 */
export const MANUAL_SOURCE: OrderSource = "manual";

const SOURCE_RE = /^[a-z0-9][a-z0-9-]{0,23}$/;

export function assertValidSource(source: string): asserts source is OrderSource {
  if (!SOURCE_RE.test(source)) {
    throw new Error(`Invalid order source "${source}": use 1–24 chars of a-z, 0-9, "-"`);
  }
}

export function newClientOrderId(source: OrderSource): string {
  assertValidSource(source);
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 6);
  return `${source}-${t}-${r}`;
}

/** Inverse of newClientOrderId. Orders placed outside Bullpen come back as "external". */
export function sourceFromClientOrderId(clientOrderId: string | null | undefined): OrderSource {
  if (!clientOrderId) return "external";
  const m = /^([a-z0-9][a-z0-9-]{0,23}?)-[0-9a-z]{6,10}-[0-9a-z]{4}$/.exec(clientOrderId);
  return m ? m[1] : "external";
}
