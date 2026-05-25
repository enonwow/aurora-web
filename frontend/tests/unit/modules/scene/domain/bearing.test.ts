import { describe, expect, it } from "vitest";
import {
  normalizeBearingDegrees,
  normalizeBearingRadians
} from "../../../../../src/modules/scene/domain/bearing";

describe("bearing normalization", () => {
  it("normalizes degree bearings with fixture coverage", () => {
    const fixtures = [
      { input: -30, expected: 330 },
      { input: 390, expected: 30 },
      { input: 360, expected: 0 },
      { input: 720, expected: 0 },
      { input: Number.POSITIVE_INFINITY, expected: 0 },
      { input: Number.NaN, expected: 0 }
    ];

    fixtures.forEach(({ input, expected }) => {
      expect(normalizeBearingDegrees(input)).toBeCloseTo(expected, 6);
    });
  });

  it("clamps degree bearings to [0, 360) for boundary fixtures", () => {
    const fixtures = [
      { input: -720, expected: 0 },
      { input: -360, expected: 0 },
      { input: -0.000001, expected: 359.999999 },
      { input: 359.999999, expected: 359.999999 },
      { input: 360.000001, expected: 0.000001 },
      { input: 1080 + 45, expected: 45 }
    ];

    fixtures.forEach(({ input, expected }) => {
      const normalized = normalizeBearingDegrees(input);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThan(360);
      expect(normalized).toBeCloseTo(expected, 6);
    });
  });

  it("normalizes radian bearings with full-turn and non-finite fixtures", () => {
    const fullTurn = Math.PI * 2;
    const fixtures = [
      { input: -0.25, expected: fullTurn - 0.25 },
      { input: -fullTurn, expected: 0 },
      { input: fullTurn + 0.25, expected: 0.25 },
      { input: fullTurn, expected: 0 },
      { input: fullTurn * 3.5, expected: Math.PI },
      { input: Number.NEGATIVE_INFINITY, expected: 0 },
      { input: Number.NaN, expected: 0 }
    ];

    fixtures.forEach(({ input, expected }) => {
      const normalized = normalizeBearingRadians(input);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThan(fullTurn);
      expect(normalized).toBeCloseTo(expected, 6);
    });
  });
});
