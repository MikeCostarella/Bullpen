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
