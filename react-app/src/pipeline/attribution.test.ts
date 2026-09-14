import { describe, expect, it } from "vitest";
import { newClientOrderId, sourceFromClientOrderId } from "./attribution";

describe("attribution", () => {
  it("round-trips the source through the client order id", () => {
    for (const src of ["manual", "sma-cross", "s1", "mean-revert-v2"]) {
      const id = newClientOrderId(src);
      expect(id.length).toBeLessThan(48);
      expect(sourceFromClientOrderId(id)).toBe(src);
    }
  });

  it("maps foreign ids to external", () => {
    expect(sourceFromClientOrderId("")).toBe("external");
    expect(sourceFromClientOrderId("3f2b1c9a-uuid-from-alpaca-web")).toBe("external");
    expect(sourceFromClientOrderId(undefined)).toBe("external");
  });

  it("rejects bad source names", () => {
    expect(() => newClientOrderId("Manual")).toThrow();
    expect(() => newClientOrderId("has space")).toThrow();
    expect(() => newClientOrderId("")).toThrow();
  });
});
