import { describe, expect, it } from "vitest";
import {
  convertAuroraEnhancedGammaComponentToLinear,
  convertAuroraEnhancedGammaTripletToLinear
} from "../../../../src/modules/shared/adapters/three/auroraEnhancedColorSpace";

describe("auroraEnhancedColorSpace", () => {
  it("matches the active retail ApplyColorSpace pow(2.2) contract", () => {
    expect(convertAuroraEnhancedGammaComponentToLinear(60 / 255)).toBeCloseTo(
      Math.pow(60 / 255, 2.2),
      12
    );
    expect(convertAuroraEnhancedGammaComponentToLinear(-0.5)).toBeCloseTo(
      -Math.pow(0.5, 2.2),
      12
    );
    expect(convertAuroraEnhancedGammaComponentToLinear(1.5)).toBeCloseTo(
      Math.pow(1.5, 2.2),
      12
    );
    expect(convertAuroraEnhancedGammaTripletToLinear([0.8, 0.5, 0.75])).toEqual([
      Math.pow(0.8, 2.2),
      Math.pow(0.5, 2.2),
      Math.pow(0.75, 2.2)
    ]);
  });
});
