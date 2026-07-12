import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS,
  AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER,
  installAuroraLinearLightFalloffShaderChunk
} from "../../../../src/modules/layout/adapters/three/auroraThreeLightFalloff";

describe("auroraThreeLightFalloff", () => {
  it("patches Three point-light attenuation for Aurora linear radius falloff", () => {
    const first = installAuroraLinearLightFalloffShaderChunk();

    expect(["installed", "already-installed"]).toContain(first.status);
    expect(first.proofStatus).toBe(AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS);

    const shaderChunk = THREE.ShaderChunk.lights_pars_begin;
    expect(shaderChunk).toContain(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER);
    expect(shaderChunk).toContain("abs( decayExponent - 1.0 ) < 0.001");
    expect(shaderChunk).toContain("return saturate( 1.0 - lightDistance / cutoffDistance );");
    expect(shaderChunk).toContain("pow4( lightDistance / cutoffDistance )");

    const second = installAuroraLinearLightFalloffShaderChunk();
    expect(second.status).toBe("already-installed");
    expect(
      THREE.ShaderChunk.lights_pars_begin.match(
        new RegExp(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER, "g")
      )?.length
    ).toBe(1);
  });
});
