import { describe, expect, it } from "vitest";
import {
  normalizeBearingDegrees,
  normalizeBearingRadians
} from "../../../../../src/modules/scene/domain/bearing";

describe("bearing normalization", () => {
  it("normalizes degree bearings to 0..360", () => {
    expect(normalizeBearingDegrees(-30)).toBeCloseTo(330);
    expect(normalizeBearingDegrees(390)).toBeCloseTo(30);
  });

  it("normalizes radian bearings to 0..2pi", () => {
    expect(normalizeBearingRadians(-0.25)).toBeCloseTo((Math.PI * 2) - 0.25);
    expect(normalizeBearingRadians((Math.PI * 2) + 0.25)).toBeCloseTo(0.25);
  });
});
