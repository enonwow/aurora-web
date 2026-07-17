import * as THREE from "three";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER =
  "AURORA_WEB_LINEAR_LIGHT_FALLOFF_DECAY_ONE";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866543-866563 FUN_00a423d8 adds active light color as max(0,1-distance/radius)*color*fade";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS =
  "source-backed-linear-radius-falloff-preview-shaderchunk-adapter";

export type AuroraThreeLightFalloffInstallStatus =
  | "installed"
  | "already-installed"
  | "blocked-three-shaderchunk-shape-unrecognized";

export interface AuroraThreeLightFalloffInstallResult {
  status: AuroraThreeLightFalloffInstallStatus;
  proofStatus: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
  source: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
  marker: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER;
}

const DISTANCE_ATTENUATION_FUNCTION_PATTERN =
  /float getDistanceAttenuation\( const in float lightDistance, const in float cutoffDistance, const in float decayExponent \) \{[\s\S]*?\n\}\nfloat getSpotAttenuation/;

const AURORA_LINEAR_DISTANCE_ATTENUATION_FUNCTION = `float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
\tif ( cutoffDistance > 0.0 && abs( decayExponent - 1.0 ) < 0.001 ) {
\t\t// ${AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER}
\t\treturn saturate( 1.0 - lightDistance / cutoffDistance );
\t}
\tfloat distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
\tif ( cutoffDistance > 0.0 ) {
\t\tdistanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
\t}
\treturn distanceFalloff;
}`;

function buildResult(
  status: AuroraThreeLightFalloffInstallStatus
): AuroraThreeLightFalloffInstallResult {
  return {
    status,
    proofStatus: AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS,
    source: AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE,
    marker: AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER
  };
}

export function installAuroraLinearLightFalloffShaderChunk(): AuroraThreeLightFalloffInstallResult {
  const shaderChunk = THREE.ShaderChunk as Record<string, string | undefined>;
  const current = shaderChunk.lights_pars_begin;
  if (!current) {
    return buildResult("blocked-three-shaderchunk-shape-unrecognized");
  }
  if (current.includes(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER)) {
    return buildResult("already-installed");
  }
  if (!DISTANCE_ATTENUATION_FUNCTION_PATTERN.test(current)) {
    return buildResult("blocked-three-shaderchunk-shape-unrecognized");
  }
  shaderChunk.lights_pars_begin = current.replace(
    DISTANCE_ATTENUATION_FUNCTION_PATTERN,
    `${AURORA_LINEAR_DISTANCE_ATTENUATION_FUNCTION}\nfloat getSpotAttenuation`
  );
  return buildResult("installed");
}
