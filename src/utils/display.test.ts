import { describe, expect, it } from "vitest";
import { fallbackZoneLabel } from "./display.js";

describe("fallbackZoneLabel", () => {
  it("uses rounded coords in label", () => {
    const s = fallbackZoneLabel(50.450712, 30.523891);
    expect(s).toContain("50.451");
    expect(s).toContain("30.524");
  });
});
