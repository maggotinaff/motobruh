import { describe, expect, it } from "vitest";
import { formatKm, haversineKm } from "./distance.js";

describe("haversineKm", () => {
  it("returns ~0 for same point", () => {
    expect(haversineKm(50.45, 30.52, 50.45, 30.52)).toBeLessThan(0.001);
  });

  it("returns plausible distance for Kyiv reference points", () => {
    const km = haversineKm(50.45, 30.52, 50.46, 30.53);
    expect(km).toBeGreaterThan(1);
    expect(km).toBeLessThan(2);
  });
});

describe("formatKm", () => {
  it("formats one decimal", () => {
    expect(formatKm(2.456)).toBe("2.5 км");
  });
});
