import { env } from "../config/env";

/**
 * Fundamentals are NOT broker data — Alpaca has none — so they live outside
 * the BrokerAdapter. Today the only provider is Finnhub, reached through the
 * /api/fundamentals proxy (key injected server-side, see vite.config.ts).
 * Everything is optional: any field the provider lacks is simply undefined,
 * and ETFs/indices typically return a very sparse record.
 */
export interface Fundamentals {
  name?: string;
  industry?: string;
  country?: string;
  currency?: string;
  ipo?: string;
  website?: string;
  logo?: string;
  /** USD, absolute (not millions). */
  marketCap?: number;
  /** Absolute share count. */
  sharesOutstanding?: number;
  pe?: number;
  eps?: number;
  /** Percent, e.g. 1.32 for 1.32%. */
  dividendYield?: number;
  beta?: number;
  high52?: number;
  low52?: number;
  /** Absolute shares/day. */
  avgVolume10d?: number;
  nextEarnings?: { date: string; epsEstimate?: number; hour?: string };
}

/** true when the dev proxy has a FINNHUB_KEY; the panel hides the section otherwise. */
export const fundamentalsEnabled = env.fundamentals;

interface FhProfile {
  name?: string;
  finnhubIndustry?: string;
  country?: string;
  currency?: string;
  ipo?: string;
  weburl?: string;
  logo?: string;
  marketCapitalization?: number; // millions
  shareOutstanding?: number; // millions
}
interface FhMetric {
  metric?: Record<string, number | null | undefined>;
}
interface FhEarnings {
  earningsCalendar?: { date: string; epsEstimate?: number | null; hour?: string }[];
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

async function fh<T>(path: string): Promise<T | undefined> {
  const res = await fetch(`${env.fundamentalsApi}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Fundamentals provider: ${res.status} ${res.statusText}`);
  return (await res.json()) as T;
}

export async function getFundamentals(symbol: string): Promise<Fundamentals | undefined> {
  if (!fundamentalsEnabled) return undefined;
  const sym = encodeURIComponent(symbol);
  const today = new Date();
  const to = new Date(today.getTime() + 120 * 86_400_000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const [profile, metrics, earnings] = await Promise.all([
    fh<FhProfile>(`/stock/profile2?symbol=${sym}`),
    fh<FhMetric>(`/stock/metric?symbol=${sym}&metric=all`),
    fh<FhEarnings>(`/calendar/earnings?symbol=${sym}&from=${iso(today)}&to=${iso(to)}`).catch(() => undefined),
  ]);
  const m = metrics?.metric ?? {};
  const next = (earnings?.earningsCalendar ?? [])
    .filter((e) => e.date >= iso(today))
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  const out: Fundamentals = {
    name: profile?.name || undefined,
    industry: profile?.finnhubIndustry || undefined,
    country: profile?.country || undefined,
    currency: profile?.currency || undefined,
    ipo: profile?.ipo || undefined,
    website: profile?.weburl || undefined,
    logo: profile?.logo || undefined,
    marketCap: num(profile?.marketCapitalization) !== undefined ? profile!.marketCapitalization! * 1e6 : undefined,
    sharesOutstanding: num(profile?.shareOutstanding) !== undefined ? profile!.shareOutstanding! * 1e6 : undefined,
    pe: num(m.peBasicExclExtraTTM) ?? num(m.peTTM) ?? num(m.peNormalizedAnnual),
    eps: num(m.epsBasicExclExtraItemsTTM) ?? num(m.epsTTM) ?? num(m.epsNormalizedAnnual),
    dividendYield: num(m.dividendYieldIndicatedAnnual) ?? num(m.currentDividendYieldTTM),
    beta: num(m.beta),
    high52: num(m["52WeekHigh"]),
    low52: num(m["52WeekLow"]),
    avgVolume10d: num(m["10DayAverageTradingVolume"]) !== undefined ? m["10DayAverageTradingVolume"]! * 1e6 : undefined,
    nextEarnings: next ? { date: next.date, epsEstimate: num(next.epsEstimate), hour: next.hour } : undefined,
  };
  // A record with nothing in it (typical for ETFs on the free tier) reads as "none".
  const hasAny = Object.values(out).some((v) => v !== undefined);
  return hasAny ? out : undefined;
}
