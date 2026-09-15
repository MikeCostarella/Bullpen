import { describe, expect, it } from "vitest";
import type { AssetSummary } from "../broker/types";
import { searchSymbols, tidyName } from "./symbolSearch";

const A = (symbol: string, name: string, exchange = "NASDAQ"): AssetSummary => ({ symbol, name, exchange });
const ASSETS: AssetSummary[] = [
  A("AAPL", "Apple Inc. Common Stock"),
  A("APLE", "Apple Hospitality REIT, Inc.", "NYSE"),
  A("AA", "Alcoa Corporation", "NYSE"),
  A("AAL", "American Airlines Group Inc."),
  A("APP", "AppLovin Corporation"),
  A("PINEAPL", "Pineapple Holdings", "OTC"),
  A("AAPX", "T-Rex 2X Long Apple Daily Target ETF", "BATS"),
  A("AAPY", "Kurv Yield Premium Strategy Apple (AAPL) ETF", "BATS"),
  A("SPY", "SPDR S&P 500 ETF Trust", "ARCA"),
  A("GOOGL", "Alphabet Inc. Class A Common Stock"),
  A("MSFT", "Microsoft Corporation"),
  A("AMBQ", "Ambiq Micro, Inc.", "NYSE"),
];

describe("searchSymbols", () => {
  it("returns nothing for a blank query", () => {
    expect(searchSymbols(ASSETS, "  ")).toEqual([]);
  });

  it("puts the exact symbol first, then symbol prefixes, then names", () => {
    const syms = searchSymbols(ASSETS, "aa").map((m) => m.symbol);
    // AAPX/AAPY are symbol-prefix matches too, but wrapper ETFs sink below the rest.
    expect(syms).toEqual(["AA", "AAL", "AAPL", "AAPX", "AAPY"]);
  });

  it("finds companies by name, word-prefix before substring, OTC last", () => {
    const syms = searchSymbols(ASSETS, "apple").map((m) => m.symbol);
    // AAPL and APLE both start a word with "apple" (shorter name first);
    // PINEAPL only contains it and is OTC.
    expect(syms.slice(0, 2)).toEqual(["AAPL", "APLE"]);
    expect(syms[syms.length - 1]).toBe("PINEAPL");
  });

  it("sinks leveraged / income wrapper ETFs below the underlying company", () => {
    const syms = searchSymbols(ASSETS, "apple").map((m) => m.symbol);
    expect(syms.indexOf("AAPL")).toBeLessThan(syms.indexOf("AAPX"));
    expect(syms.indexOf("APLE")).toBeLessThan(syms.indexOf("AAPY"));
  });

  it("matches symbol prefix ahead of name matches", () => {
    const syms = searchSymbols(ASSETS, "app").map((m) => m.symbol);
    expect(syms[0]).toBe("APP");
    expect(syms).toContain("AAPL");
  });

  it("is case-insensitive and honours the limit", () => {
    expect(searchSymbols(ASSETS, "A", 2)).toHaveLength(2);
    expect(searchSymbols(ASSETS, "msft")[0].symbol).toBe("MSFT");
  });

  it("prefers names that start with the query over a later word", () => {
    expect(searchSymbols(ASSETS, "micro").map((m) => m.symbol)).toEqual(["MSFT", "AMBQ"]);
  });

  it("matches inside names for things like ETFs", () => {
    expect(searchSymbols(ASSETS, "s&p")[0].symbol).toBe("SPY");
  });
});

describe("tidyName", () => {
  it("drops the security-type boilerplate", () => {
    expect(tidyName("Apple Inc. Common Stock")).toBe("Apple Inc.");
    expect(tidyName("Alphabet Inc. Class A Common Stock")).toBe("Alphabet Inc. Class A");
    expect(tidyName("Shell plc American Depositary Shares")).toBe("Shell plc");
    expect(tidyName("Alcoa   Corporation ")).toBe("Alcoa Corporation");
  });
  it("never returns an empty string", () => {
    expect(tidyName("Common Stock")).toBe("Common Stock");
  });
});
