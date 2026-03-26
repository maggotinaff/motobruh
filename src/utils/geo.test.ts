import { describe, expect, it } from "vitest";
import { isValidCoordinates } from "./geo.js";

describe("isValidCoordinates", () => {
  it("accepts valid WGS84", () => {
    expect(isValidCoordinates(50.45, 30.52)).toBe(true);
  });

  it("rejects out of range", () => {
    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
  });

  it("rejects NaN", () => {
    expect(isValidCoordinates(Number.NaN, 0)).toBe(false);
  });
});
