export const fmtMoney = (n: number | undefined, digits = 2): string =>
  n === undefined || !Number.isFinite(n)
    ? "—"
    : n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits });

export const fmtSigned = (n: number | undefined, digits = 2): string =>
  n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${fmtMoney(n, digits)}`;

export const fmtPct = (n: number | undefined, digits = 2): string =>
  n === undefined || !Number.isFinite(n) ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(digits)}%`;

export const fmtQty = (n: number): string => n.toLocaleString("en-US");

export const fmtTime = (iso: string | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

export const signClass = (n: number | undefined): string =>
  n === undefined || n === 0 ? "flat" : n > 0 ? "up" : "down";

/** 1234567 → "1.23M", 2.5e12 → "2.50T". */
export const fmtCompact = (n: number | undefined, digits = 2): string => {
  if (n === undefined || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [div, suffix] of units) {
    if (abs >= div) return `${(n / div).toFixed(digits)}${suffix}`;
  }
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
};

/** "4m ago", "3h ago", "2d ago"; falls back to a date beyond a week. */
export const fmtAgo = (iso: string | undefined, now = Date.now()): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const fmtDate = (iso: string | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : iso;
};
