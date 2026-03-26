import { describe, expect, it } from "vitest";
import { buildMapPageUrl, signMapViewPayload, verifyMapViewToken } from "./mapViewToken.js";

const secret = "x".repeat(32);

describe("mapViewToken", () => {
  it("roundtrips where payload", () => {
    const t = signMapViewPayload({ mode: "where", groupId: "g1" }, secret);
    const v = verifyMapViewToken(t, secret);
    expect(v?.mode).toBe("where");
    if (v?.mode === "where") expect(v.groupId).toBe("g1");
  });

  it("roundtrips near payload", () => {
    const t = signMapViewPayload(
      {
        mode: "near",
        groupId: null,
        requesterUserId: "u1",
        lat: 55.75,
        lng: 37.62,
        radiusKm: 5,
      },
      secret,
    );
    const v = verifyMapViewToken(t, secret);
    expect(v?.mode).toBe("near");
    if (v?.mode === "near") {
      expect(v.requesterUserId).toBe("u1");
      expect(v.radiusKm).toBe(5);
    }
  });

  it("rejects wrong secret", () => {
    const t = signMapViewPayload({ mode: "where", groupId: null }, secret);
    expect(verifyMapViewToken(t, "y".repeat(32))).toBeNull();
  });

  it("buildMapPageUrl embeds verifiable token", () => {
    const url = buildMapPageUrl("https://example.com", { mode: "where", groupId: null }, secret);
    const u = new URL(url);
    const t = u.searchParams.get("t");
    expect(t).toBeTruthy();
    expect(verifyMapViewToken(t!, secret)?.mode).toBe("where");
  });
});
