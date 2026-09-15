/**
 * Bring-your-own-keys: a tester's Alpaca PAPER key pair, kept in this
 * browser only (localStorage) and sent with every /api request as
 * X-Alpaca-Key-Id / X-Alpaca-Secret-Key. The relay (relay/) forwards them
 * to paper-api.alpaca.markets and nowhere else; the Vite dev proxy honours
 * them too, falling back to the keys in .env.local when none are stored.
 *
 * Nothing here is encrypted — localStorage is readable by anyone at the
 * keyboard — which is acceptable for paper keys that cannot move money.
 * Never store LIVE keys this way.
 */
const KEY = "bullpen.credentials.v1";

export interface Credentials {
  keyId: string;
  secretKey: string;
}

type Listener = (c: Credentials | undefined) => void;
const listeners = new Set<Listener>();

function read(): Credentials | undefined {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    const c = JSON.parse(raw) as Credentials;
    return c.keyId && c.secretKey ? c : undefined;
  } catch {
    return undefined;
  }
}

let current = read();

export function getCredentials(): Credentials | undefined {
  return current;
}

export function setCredentials(c: Credentials | undefined): void {
  current = c && c.keyId.trim() && c.secretKey.trim() ? { keyId: c.keyId.trim(), secretKey: c.secretKey.trim() } : undefined;
  try {
    if (current) localStorage.setItem(KEY, JSON.stringify(current));
    else localStorage.removeItem(KEY);
  } catch {
    /* best-effort */
  }
  listeners.forEach((l) => l(current));
}

export function subscribeCredentials(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Headers to attach to every API request; empty when nothing is stored. */
export function credentialHeaders(): Record<string, string> {
  return current ? { "X-Alpaca-Key-Id": current.keyId, "X-Alpaca-Secret-Key": current.secretKey } : {};
}

/** "PK…3F2A" for display. */
export function maskKey(k: string): string {
  return k.length <= 6 ? "••••" : `${k.slice(0, 2)}…${k.slice(-4)}`;
}
