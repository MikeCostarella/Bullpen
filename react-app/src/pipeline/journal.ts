import type { OrderIntent } from "../broker/types";

/**
 * The trade journal: every intent that enters the pipeline is written here
 * whether it was accepted, rejected by the guard, or refused by the broker.
 * Stored in localStorage for now; the backend will own this later.
 */
export type JournalOutcome = "accepted" | "guard_rejected" | "broker_rejected";

export interface JournalEntry {
  id: string;
  at: string;
  intent: OrderIntent;
  outcome: JournalOutcome;
  /** Broker order id when accepted. */
  orderId?: string;
  clientOrderId?: string;
  notional?: number;
  violations?: string[];
  warnings?: string[];
  error?: string;
}

const KEY = "bullpen.journal.v1";
const MAX_ENTRIES = 2000;

type Listener = (entries: JournalEntry[]) => void;
const listeners = new Set<Listener>();

function load(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

function save(entries: JournalEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  } catch {
    /* quota or private mode: journal is best-effort in the browser */
  }
  listeners.forEach((l) => l(entries));
}

export const journal = {
  all(): JournalEntry[] {
    return load();
  },
  add(entry: Omit<JournalEntry, "id" | "at">): JournalEntry {
    const full: JournalEntry = {
      ...entry,
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date().toISOString(),
    };
    save([full, ...load()]);
    return full;
  },
  clear() {
    save([]);
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  exportCsv(): string {
    const rows = load().map((e) => [
      e.at,
      e.intent.source,
      e.intent.symbol,
      e.intent.side,
      e.intent.qty,
      e.intent.type,
      e.intent.limitPrice ?? "",
      e.intent.stopPrice ?? "",
      e.outcome,
      e.orderId ?? "",
      e.notional?.toFixed(2) ?? "",
      e.intent.reason,
      (e.violations ?? []).join("; "),
      e.error ?? "",
    ]);
    const header = [
      "at", "source", "symbol", "side", "qty", "type", "limit", "stop",
      "outcome", "orderId", "notional", "reason", "violations", "error",
    ];
    const esc = (v: unknown) => {
      const s = String(v ?? "");
      return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // UTF-8 BOM + CRLF, RFC 4180 style, so Excel opens it cleanly.
    return "\uFEFF" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
  },
};
