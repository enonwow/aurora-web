import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FACTOR,
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV,
  AURORA_THREE_ENHANCED_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY,
  AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY,
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS,
  AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER,
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS,
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER,
  installAuroraLinearLightFalloffShaderChunk,
  resolveAuroraEnhancedPerformanceLightAttenuation,
  resolveAuroraEnhancedPerformancePointLightProjection,
  resolveAuroraThreePointLightDecay
} from "../../../../src/modules/layout/adapters/three/auroraThreeLightFalloff";

describe("auroraThreeLightFalloff", () => {
  it("patches Three point lights for the recovered enhanced-performance and legacy equations", () => {
    const first = installAuroraLinearLightFalloffShaderChunk();

    expect(["installed", "already-installed"]).toContain(first.status);
    expect(first.proofStatus).toBe(AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS);
    expect(first.localizedAmbientProofStatus).toBe(
      AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS
    );

    const parsChunk = THREE.ShaderChunk.lights_pars_begin;
    expect(parsChunk).toContain(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER);
    expect(parsChunk).toContain("AURORA_WEB_ENHANCED_PERFORMANCE_POINT_LIGHT_FALLOFF");
    expect(parsChunk).toContain(
      "return ( 1.0 - auroraEnhancedRangeSquared ) / ( auroraEnhancedMaxIntensityInv + auroraEnhancedFalloffFactor * auroraEnhancedRangeSquared );"
    );
    expect(parsChunk).toContain("float auroraDecayExponent = abs( decayExponent );");
    expect(parsChunk).toContain("abs( auroraDecayExponent - 1.0 ) < 0.001");
    expect(parsChunk).toContain("float auroraNormalizedDistanceSquared");
    expect(parsChunk).toContain(
      "return 1.0 / ( 1.0 + 4.5 * auroraNormalizedDistanceSquared );"
    );
    expect(parsChunk).toContain("pow4( lightDistance / cutoffDistance )");

    const fragmentChunk = THREE.ShaderChunk.lights_fragment_begin;
    expect(fragmentChunk).toContain(AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER);
    expect(fragmentChunk).not.toContain("bool auroraLocalizedAmbientOnly");
    expect(fragmentChunk).toContain("if ( pointLight.decay < 0.0 )");
    expect(fragmentChunk).toContain(
      "auroraLocalizedAmbientIrradiance += directLight.color;"
    );
    expect(fragmentChunk).toContain("irradiance += auroraLocalizedAmbientIrradiance;");

    const second = installAuroraLinearLightFalloffShaderChunk();
    expect(second.status).toBe("already-installed");
    expect(
      THREE.ShaderChunk.lights_pars_begin.match(
        new RegExp(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER, "g")
      )?.length
    ).toBe(1);
    expect(
      THREE.ShaderChunk.lights_fragment_begin.match(
        new RegExp(AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER, "g")
      )?.length
    ).toBe(1);
  });

  it("projects source radius, multiplier and HDR color through the recovered nwmain enhanced-light contract", () => {
    expect(AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV).toBeCloseTo(
      Math.pow(1.5, -2.2),
      12
    );
    expect(AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FACTOR).toBeCloseTo(
      Math.pow(2, 2) * (Math.pow(0.2, -2.2) - Math.pow(1.5, -2.2)),
      12
    );
    expect(resolveAuroraEnhancedPerformanceLightAttenuation(0, 19)).toBeCloseTo(
      Math.pow(1.5, 2.2),
      12
    );
    expect(resolveAuroraEnhancedPerformanceLightAttenuation(19, 19)).toBe(0);
    expect(resolveAuroraEnhancedPerformanceLightAttenuation(20, 19)).toBe(0);

    expect(
      resolveAuroraEnhancedPerformancePointLightProjection({
        color: [1.9, 1.7, 0.06],
        multiplier: 1,
        sourceRadiusWorld: 5,
        ambientOnly: false
      })
    ).toEqual({
      adjustedColor: [1, 1.7 / 1.9, 0.06 / 1.9],
      effectiveRange: 19,
      intensity: 1,
      decay: AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY
    });
  });

  it("preserves signed source-MDL color while deriving enhanced range from source fields", () => {
    expect(
      resolveAuroraEnhancedPerformancePointLightProjection({
        color: [-1, -0.5, -0.25],
        multiplier: 8,
        sourceRadiusWorld: 2.75,
        ambientOnly: true
      })
    ).toEqual({
      adjustedColor: [-1, -0.5, -0.25],
      effectiveRange: 44,
      intensity: 1,
      decay: AURORA_THREE_ENHANCED_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY
    });
  });

  it("uses negative decay only as the localized ambient channel marker", () => {
    expect(resolveAuroraThreePointLightDecay(false)).toBe(1);
    expect(resolveAuroraThreePointLightDecay(true)).toBe(-1);
  });
});
