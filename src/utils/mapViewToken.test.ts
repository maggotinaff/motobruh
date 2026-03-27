import { describe, expect, it } from "vitest";
import { buildMapPageUrl, signMapViewPayload, verifyMapViewToken } from "./mapViewToken.js";

const secret = "x".repeat(32);

describe("mapViewToken", () => {
  it("roundtrips payload with viewer", () => {
    const t = signMapViewPayload({ groupId: "g1", viewerUserId: "u1" }, secret);
    const v = verifyMapViewToken(t, secret);
    expect(v?.groupId).toBe("g1");
    expect(v?.viewerUserId).toBe("u1");
  });

  it("rejects wrong secret", () => {
    const t = signMapViewPayload({ groupId: null, viewerUserId: null }, secret);
    expect(verifyMapViewToken(t, "y".repeat(32))).toBeNull();
  });

  it("buildMapPageUrl embeds verifiable token", () => {
    const url = buildMapPageUrl("https://example.com", { groupId: null, viewerUserId: null }, secret);
    const u = new URL(url);
    const t = u.searchParams.get("t");
    expect(t).toBeTruthy();
    expect(verifyMapViewToken(t!, secret)?.viewerUserId).toBeNull();
  });
});
