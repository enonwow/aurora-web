import * as THREE from "three";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER =
  "AURORA_WEB_GAMMA_ZERO_QUADRATIC_SURFACE_FALLOFF_DECAY_ONE";

export const AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER =
  "AURORA_WEB_LOCALIZED_AMBIENT_POINT_LIGHT_NEGATIVE_DECAY";

export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SHADER_MARKER =
  "AURORA_WEB_ENHANCED_PERFORMANCE_POINT_LIGHT_FALLOFF";

export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SOURCE =
  "nwmain.exe 0x14007f380..0x14007f501 GetLightAdjustedColor/GetLightAdjustedRadius normalize local HDR RGB and expand radius by max RGB plus cutoff; 0x140080c10..0x140080ef2 SetLightGL uploads signed adjusted-radius squared in lightColor.a; retail inc_lighting.shd GAMMA_CORRECTION==1 evaluates (1-d2/radius2)/(lightMaxIntensityInv+lightFalloffFactor*d2/radius2); active Enhanced/Performance settings are cutoff=2, intensity-at-range=0.2, max-intensity=1.5, gamma=2.2";

export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_PROOF_STATUS =
  "retail-binary-and-shader-backed-enhanced-performance-point-light-falloff";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE =
  "Active retail inc_lighting.shd GAMMA_CORRECTION==0 uses 1/(1+lightQuadraticAtten*d2); C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten=9/(max(radius,0.1)^2*2)";

export const AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:874699-874721 FUN_00a4cd58 maps model ambientOnly +0xb4 to active-light channel +0x68; 865365-865408 FUN_00a40b60 selects local ambient color instead of local diffuse color while preserving position and radius attenuation";

export const AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS =
  "source-backed-gamma0-quadratic-surface-falloff-profile-parity-pending";

export const AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS =
  "source-backed-localized-ambient-irradiance-shaderchunk-adapter";

export const AURORA_THREE_DIFFUSE_POINT_LIGHT_DECAY = 1;
export const AURORA_THREE_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY = -1;
export const AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY = 1.25;
export const AURORA_THREE_ENHANCED_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY = -1.25;
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_CUTOFF_RANGE_MULTIPLIER = 2;
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_INTENSITY_AT_RANGE = 0.2;
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY = 1.5;
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_GAMMA = 2.2;
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV = Math.pow(
  AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY,
  -AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_GAMMA
);
export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FACTOR =
  Math.pow(AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_CUTOFF_RANGE_MULTIPLIER, 2) *
  (Math.pow(
    AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_INTENSITY_AT_RANGE,
    -AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_GAMMA
  ) - AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV);

export const AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FORMULA =
  "x=(distance/effectiveRange)^2; x>=1 => 0; (1-x)/(maxIntensity^-2.2 + cutoff^2*(intensityAtRange^-2.2-maxIntensity^-2.2)*x)";

export type AuroraThreeLightFalloffInstallStatus =
  | "installed"
  | "already-installed"
  | "blocked-three-shaderchunk-shape-unrecognized";

export interface AuroraThreeLightFalloffInstallResult {
  status: AuroraThreeLightFalloffInstallStatus;
  proofStatus: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS;
  source: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE;
  marker: typeof AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER;
  localizedAmbientProofStatus: typeof AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS;
  localizedAmbientSource: typeof AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE;
  localizedAmbientMarker: typeof AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER;
}

const DISTANCE_ATTENUATION_FUNCTION_PATTERN =
  /float getDistanceAttenuation\( const in float lightDistance, const in float cutoffDistance, const in float decayExponent \) \{[\s\S]*?\n\}\nfloat getSpotAttenuation/;

const AURORA_COMBINED_DISTANCE_ATTENUATION_FUNCTION = `float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
\tfloat auroraDecayExponent = abs( decayExponent );
\tif ( cutoffDistance > 0.0 && abs( auroraDecayExponent - ${AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY.toFixed(2)} ) < 0.001 ) {
\t\t// ${AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SHADER_MARKER}
\t\tfloat auroraEnhancedRange = lightDistance / max( cutoffDistance, 0.0001 );
\t\tfloat auroraEnhancedRangeSquared = auroraEnhancedRange * auroraEnhancedRange;
\t\tif ( auroraEnhancedRangeSquared >= 1.0 ) return 0.0;
\t\tfloat auroraEnhancedMaxIntensityInv = ${AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV.toPrecision(17)};
\t\tfloat auroraEnhancedFalloffFactor = ${AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FACTOR.toPrecision(17)};
\t\treturn ( 1.0 - auroraEnhancedRangeSquared ) / ( auroraEnhancedMaxIntensityInv + auroraEnhancedFalloffFactor * auroraEnhancedRangeSquared );
\t}
\tif ( cutoffDistance > 0.0 && abs( auroraDecayExponent - 1.0 ) < 0.001 ) {
\t\t// ${AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER}
\t\tfloat auroraNormalizedDistance = lightDistance / max( cutoffDistance, 0.0001 );
\t\tfloat auroraNormalizedDistanceSquared = auroraNormalizedDistance * auroraNormalizedDistance;
\t\treturn 1.0 / ( 1.0 + 4.5 * auroraNormalizedDistanceSquared );
\t}
\tfloat distanceFalloff = 1.0 / max( pow( lightDistance, auroraDecayExponent ), 0.01 );
\tif ( cutoffDistance > 0.0 ) {
\t\tdistanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
\t}
\treturn distanceFalloff;
}`;

function toFinite(value: number, fallback = 0): number {
  return Number.isFinite(value) ? value : fallback;
}

export function resolveAuroraEnhancedPerformanceLightAttenuation(
  lightDistance: number,
  effectiveRange: number
): number {
  const range = Math.abs(toFinite(effectiveRange));
  if (range <= 0) {
    return 0;
  }
  const normalizedDistance = Math.abs(toFinite(lightDistance)) / range;
  const normalizedDistanceSquared = normalizedDistance * normalizedDistance;
  if (normalizedDistanceSquared >= 1) {
    return 0;
  }
  return (
    (1 - normalizedDistanceSquared) /
    (AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_MAX_INTENSITY_INV +
      AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_FACTOR *
        normalizedDistanceSquared)
  );
}

export interface AuroraEnhancedPerformancePointLightProjectionInput {
  color: readonly [number, number, number];
  multiplier: number;
  sourceRadiusWorld: number;
  ambientOnly: boolean;
}

export interface AuroraEnhancedPerformancePointLightProjection {
  adjustedColor: [number, number, number];
  effectiveRange: number;
  intensity: 1;
  decay:
    | typeof AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY
    | typeof AURORA_THREE_ENHANCED_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY;
}

export function resolveAuroraEnhancedPerformancePointLightProjection(
  input: AuroraEnhancedPerformancePointLightProjectionInput
): AuroraEnhancedPerformancePointLightProjection {
  const color: [number, number, number] = [
    toFinite(input.color[0]),
    toFinite(input.color[1]),
    toFinite(input.color[2])
  ];
  const maximumColor = Math.max(...color);
  const sourceRadiusWorld = Math.abs(toFinite(input.sourceRadiusWorld));
  const isLocalizedLight = sourceRadiusWorld < 1000;
  const adjustedColor: [number, number, number] =
    isLocalizedLight && maximumColor > 1
      ? [color[0] / maximumColor, color[1] / maximumColor, color[2] / maximumColor]
      : color;
  const effectiveRange = isLocalizedLight
    ? sourceRadiusWorld *
      Math.abs(toFinite(input.multiplier, 1)) *
      Math.max(maximumColor, 1) *
      AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_CUTOFF_RANGE_MULTIPLIER
    : sourceRadiusWorld;

  return {
    adjustedColor,
    effectiveRange,
    intensity: 1,
    decay: input.ambientOnly
      ? AURORA_THREE_ENHANCED_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY
      : AURORA_THREE_ENHANCED_POINT_LIGHT_DECAY
  };
}

const POINT_LIGHT_ACCUMULATOR_ANCHOR =
  "IncidentLight directLight;\n#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )";
const POINT_LIGHT_COPY_ANCHOR = "\t\tpointLight = pointLights[ i ];";
const POINT_LIGHT_DIRECT_CALL_ANCHOR =
  "\t\tRE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
const INDIRECT_IRRADIANCE_ANCHOR =
  "\tvec3 irradiance = getAmbientLightIrradiance( ambientLightColor );";

function patchLocalizedAmbientPointLightChunk(current: string): string | null {
  if (current.includes(AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER)) {
    return current;
  }
  if (
    !current.includes(POINT_LIGHT_ACCUMULATOR_ANCHOR) ||
    !current.includes(POINT_LIGHT_COPY_ANCHOR) ||
    !current.includes(POINT_LIGHT_DIRECT_CALL_ANCHOR) ||
    !current.includes(INDIRECT_IRRADIANCE_ANCHOR)
  ) {
    return null;
  }

  return current
    .replace(
      POINT_LIGHT_ACCUMULATOR_ANCHOR,
      `IncidentLight directLight;

#if defined( RE_IndirectDiffuse )
	vec3 auroraLocalizedAmbientIrradiance = vec3( 0.0 );
#endif

#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )`
    )
    .replace(
      POINT_LIGHT_COPY_ANCHOR,
      `${POINT_LIGHT_COPY_ANCHOR}
		// ${AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER}`
    )
    .replace(
      POINT_LIGHT_DIRECT_CALL_ANCHOR,
      `		if ( pointLight.decay < 0.0 ) {
			#if defined( RE_IndirectDiffuse )
				auroraLocalizedAmbientIrradiance += directLight.color;
			#endif
		} else {
${POINT_LIGHT_DIRECT_CALL_ANCHOR}
		}`
    )
    .replace(
      INDIRECT_IRRADIANCE_ANCHOR,
      `${INDIRECT_IRRADIANCE_ANCHOR}
	irradiance += auroraLocalizedAmbientIrradiance;`
    );
}

function buildResult(
  status: AuroraThreeLightFalloffInstallStatus
): AuroraThreeLightFalloffInstallResult {
  return {
    status,
    proofStatus: AURORA_THREE_LINEAR_LIGHT_FALLOFF_PROOF_STATUS,
    source: AURORA_THREE_LINEAR_LIGHT_FALLOFF_SOURCE,
    marker: AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER,
    localizedAmbientProofStatus: AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_PROOF_STATUS,
    localizedAmbientSource: AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SOURCE,
    localizedAmbientMarker: AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER
  };
}

export function installAuroraLinearLightFalloffShaderChunk(): AuroraThreeLightFalloffInstallResult {
  const shaderChunk = THREE.ShaderChunk as Record<string, string | undefined>;
  const currentPars = shaderChunk.lights_pars_begin;
  const currentFragment = shaderChunk.lights_fragment_begin;
  if (!currentPars || !currentFragment) {
    return buildResult("blocked-three-shaderchunk-shape-unrecognized");
  }

  const falloffInstalled =
    currentPars.includes(AURORA_THREE_LINEAR_LIGHT_FALLOFF_SHADER_MARKER) &&
    currentPars.includes(
      AURORA_THREE_ENHANCED_PERFORMANCE_LIGHT_FALLOFF_SHADER_MARKER
    );
  const localizedAmbientInstalled = currentFragment.includes(
    AURORA_THREE_LOCALIZED_AMBIENT_LIGHT_SHADER_MARKER
  );
  if (falloffInstalled && localizedAmbientInstalled) {
    return buildResult("already-installed");
  }

  const nextPars = falloffInstalled
    ? currentPars
    : DISTANCE_ATTENUATION_FUNCTION_PATTERN.test(currentPars)
      ? currentPars.replace(
          DISTANCE_ATTENUATION_FUNCTION_PATTERN,
          `${AURORA_COMBINED_DISTANCE_ATTENUATION_FUNCTION}\nfloat getSpotAttenuation`
        )
      : null;
  const nextFragment = localizedAmbientInstalled
    ? currentFragment
    : patchLocalizedAmbientPointLightChunk(currentFragment);
  if (!nextPars || !nextFragment) {
    return buildResult("blocked-three-shaderchunk-shape-unrecognized");
  }

  shaderChunk.lights_pars_begin = nextPars;
  shaderChunk.lights_fragment_begin = nextFragment;
  return buildResult("installed");
}

export function resolveAuroraThreePointLightDecay(ambientOnly: boolean): number {
  return ambientOnly
    ? AURORA_THREE_LOCALIZED_AMBIENT_POINT_LIGHT_DECAY
    : AURORA_THREE_DIFFUSE_POINT_LIGHT_DECAY;
}

// Install before Three compiles and caches any built-in lit material program.
void installAuroraLinearLightFalloffShaderChunk();
