import { describe, expect, it } from "vitest";
import { shouldExpireActiveRide } from "./ride.service.js";

describe("shouldExpireActiveRide", () => {
  it("returns false inside timeout window", () => {
    const now = new Date("2025-01-01T12:15:00.000Z");
    const last = new Date("2025-01-01T12:00:00.000Z");
    expect(shouldExpireActiveRide(last, 15, now)).toBe(false);
  });

  it("returns true after inactivity longer than timeout", () => {
    const now = new Date("2025-01-01T12:16:01.000Z");
    const last = new Date("2025-01-01T12:00:00.000Z");
    expect(shouldExpireActiveRide(last, 15, now)).toBe(true);
  });
});
