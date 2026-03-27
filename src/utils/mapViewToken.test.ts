import { describe, expect, it } from "vitest";
import { buildMapPageUrl, signMapViewPayload, verifyMapViewToken } from "./mapViewToken.js";

const secret = "x".repeat(32);

describe("mapViewToken", () => {
  it("roundtrips payload", () => {
    const t = signMapViewPayload({ groupId: "g1" }, secret);
    const v = verifyMapViewToken(t, secret);
    expect(v?.groupId).toBe("g1");
  });

  it("rejects wrong secret", () => {
    const t = signMapViewPayload({ groupId: null }, secret);
    expect(verifyMapViewToken(t, "y".repeat(32))).toBeNull();
  });

  it("buildMapPageUrl embeds verifiable token", () => {
    const url = buildMapPageUrl("https://example.com", { groupId: null }, secret);
    const u = new URL(url);
    const t = u.searchParams.get("t");
    expect(t).toBeTruthy();
    expect(verifyMapViewToken(t!, secret)?.groupId).toBeNull();
  });
});
