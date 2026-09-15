/**
 * Curated starting points for the Discover tab. Hand-maintained — index
 * membership drifts a few names a year, so check this when something looks
 * off. `label` overrides the asset-master name in the row (the sector ETFs
 * read better as "Technology" than "Technology Select Sector SPDR Fund").
 */
export interface DiscoverEntry {
  symbol: string;
  label?: string;
}
export interface DiscoverGroup {
  id: string;
  title: string;
  blurb: string;
  entries: DiscoverEntry[];
}

const sym = (...symbols: string[]): DiscoverEntry[] => symbols.map((symbol) => ({ symbol }));

export const discoverGroups: DiscoverGroup[] = [
  {
    id: "index",
    title: "Index ETFs",
    blurb: "The whole market in one ticker. SPY is the benchmark every screen compares against.",
    entries: [
      { symbol: "SPY", label: "S&P 500" },
      { symbol: "QQQ", label: "Nasdaq-100" },
      { symbol: "DIA", label: "Dow Jones Industrial Average" },
      { symbol: "IWM", label: "Russell 2000 (small caps)" },
      { symbol: "VTI", label: "Total US stock market" },
      { symbol: "VXUS", label: "Total international ex-US" },
    ],
  },
  {
    id: "sectors",
    title: "Sectors",
    blurb: "The 11 S&P 500 sector ETFs. Watch which sectors lead and lag on a given day.",
    entries: [
      { symbol: "XLK", label: "Technology" },
      { symbol: "XLC", label: "Communication Services" },
      { symbol: "XLY", label: "Consumer Discretionary" },
      { symbol: "XLP", label: "Consumer Staples" },
      { symbol: "XLE", label: "Energy" },
      { symbol: "XLF", label: "Financials" },
      { symbol: "XLV", label: "Health Care" },
      { symbol: "XLI", label: "Industrials" },
      { symbol: "XLB", label: "Materials" },
      { symbol: "XLRE", label: "Real Estate" },
      { symbol: "XLU", label: "Utilities" },
    ],
  },
  {
    id: "mag7",
    title: "Magnificent 7",
    blurb: "The mega-cap tech names that drive most of the index's moves.",
    entries: sym("AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA"),
  },
  {
    id: "dow30",
    title: "Dow 30",
    blurb: "The 30 blue chips in the Dow Jones Industrial Average.",
    entries: sym(
      "AAPL", "AMGN", "AMZN", "AXP", "BA", "CAT", "CRM", "CSCO", "CVX", "DIS",
      "GS", "HD", "HON", "IBM", "JNJ", "JPM", "KO", "MCD", "MMM", "MRK",
      "MSFT", "NKE", "NVDA", "PG", "SHW", "TRV", "UNH", "V", "VZ", "WMT",
    ),
  },
  {
    id: "other",
    title: "Bonds, gold & more",
    blurb: "Non-stock ETFs that often move opposite to equities. Useful context, not just trades.",
    entries: [
      { symbol: "TLT", label: "20+ year Treasuries" },
      { symbol: "IEF", label: "7–10 year Treasuries" },
      { symbol: "SHY", label: "1–3 year Treasuries" },
      { symbol: "GLD", label: "Gold" },
      { symbol: "SLV", label: "Silver" },
      { symbol: "USO", label: "Crude oil" },
      { symbol: "UUP", label: "US dollar index" },
      { symbol: "BITO", label: "Bitcoin futures" },
    ],
  },
];
