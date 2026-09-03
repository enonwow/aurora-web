import * as THREE from "three";
import {
  bindAuroraMtrFramebufferTextures,
  readAuroraMtrFramebufferRuntimeLane
} from "../../../placeables/adapters/three/auroraMtrCustomShaderProgram";
import {
  updateAuroraVfxCanonicalCameraBillboards,
  updateAuroraVfxCanonicalParticleFrameUniforms
} from "./auroraVfxCanonicalRenderer";

export interface AuroraRetailBloomProfile {
  downscaleOffset: number;
  downscaleSteps: number;
  threshold: number;
  softness: number;
  multiplier: number;
}

export interface AuroraRetailPostprocessProfile {
  sharpenEnabled: boolean;
  dynamicContrastEnabled: boolean;
  dynamicContrastInputMode: "static" | "scene-area";
  dynamicContrastIntensity: number;
  dynamicContrastMidpoint: number;
  dynamicContrastMidpointSource: string;
  vibranceEnabled: boolean;
  vibrance: number;
  fogStart: number;
  fogEnd: number;
}

export interface AuroraRetailSsaoProfile {
  enabled: boolean;
  intensity: number;
  shaderQualityMode: 1;
  angularFidelity: 8;
  rangeFidelity: 6;
  range: 30;
  nearFade: 0.135;
  occlusionDarkness: 0.15;
  exposureHighlightIntensity: 0.075;
  exposureOcclusionRatio: 4;
  fragmentSourceSha256: string;
  includeSourceSha256: string;
  framebufferSourceSha256: string;
  vertexSourceSha256: string;
}

export interface AuroraRetailDynamicContrastAreaInput {
  areaAmbientGamma: readonly [number, number, number];
  areaDiffuseGamma: readonly [number, number, number];
  areaDiffuseDirectionZ: number;
  dynamicContrastMidpoint: number;
  fogColorGamma: readonly [number, number, number];
  fogStart: number;
  fogEnd: number;
  localLightLinear?: readonly [number, number, number];
  fogMixWeight?: number;
}

export interface AuroraRetailDynamicContrastSourcePointLightContribution {
  ambientOnly: boolean;
  contributionLinear: readonly [number, number, number];
  effectiveRange: number;
  signedRangeSquared: number;
  sourceKind:
    | "canonical-vfx"
    | "placeable-source-mdl"
    | "creature-source-mdl"
    | "placeable-two-da";
}

export interface AuroraRetailDynamicContrastSceneState {
  status:
    | "source-backed-scene-light-input-active"
    | "scene-area-input-unavailable";
  midpoint: number;
  midpointSource: string;
  areaAmbientLightCount: number;
  areaDiffuseLightCount: number;
  localPointLightCount: number;
  sourceBackedLocalPointLightCount: number;
  sourceMdlLocalPointLightCount: number;
  placeableTwoDaLocalPointLightCount: number;
  pendingLocalPointLightCount: number;
  localPointLightLinearContribution: readonly [number, number, number];
  localPointLightContributionStatus:
    | "not-required-no-visible-point-lights"
    | "source-backed-native-lightColor-alpha-projection-active"
    | "source-backed-native-lightColor-alpha-projection-active-with-unmapped-point-lights"
    | "pending-unmapped-visible-point-lights";
  fogStart: number;
  fogEnd: number;
}

export interface AuroraRetailBloomLevelSize {
  width: number;
  height: number;
}

export interface AuroraRetailBloomDiagnostics {
  status: "source-backed-retail-bloom-active";
  width: number;
  height: number;
  downscaleOffset: number;
  downscaleSteps: number;
  threshold: number;
  softness: number;
  multiplier: number;
  normalizationFactor: number;
  levelSizes: AuroraRetailBloomLevelSize[];
  framebufferLane5MeshCount: number;
  framebufferLane6MeshCount: number;
  framebufferStageOrder: string[];
  rawGammaNormalVfxMeshCount: number;
  rawGammaAdditiveVfxMeshCount: number;
  colorPipelineStageOrder: string[];
  ssaoConfiguredEnabled: boolean;
  ssaoRuntimeStatus:
    | "pending-perspective-camera"
    | "source-backed-retail-ssao-active"
    | "skipped-unsupported-non-perspective-camera"
    | "disabled-by-profile";
  ssaoIntensity: number;
  ssaoShaderQualityMode: 1;
  ssaoPassCount: 3;
  ssaoBlendSourceFactor: "GL_ZERO";
  ssaoBlendDestinationFactor: "GL_SRC_ALPHA";
  ssaoStageOrder: string[];
  ssaoFragmentSourceSha256: string;
  ssaoIncludeSourceSha256: string;
  ssaoFramebufferSourceSha256: string;
  ssaoVertexSourceSha256: string;
  postprocessStatus: "source-backed-retail-postprocess-active";
  colorCorrectionType: 4;
  colorCorrectionMode: "active-retail-overflow-preserving-type-4";
  colorCorrectionConfigSourceSha256: string;
  colorCorrectionTonemapSourceSha256: string;
  dynamicContrastConfiguredEnabled: boolean;
  sharpenEnabled: boolean;
  dynamicContrastEnabled: boolean;
  dynamicContrastInputMode: "static" | "scene-area";
  dynamicContrastRuntimeStatus:
    | "static-profile-active"
    | "source-backed-scene-light-input-active"
    | "scene-area-input-unavailable"
    | "disabled-by-profile";
  dynamicContrastIntensity: number;
  dynamicContrastMidpoint: number;
  dynamicContrastMidpointSource: string;
  dynamicContrastAreaAmbientLightCount: number;
  dynamicContrastAreaDiffuseLightCount: number;
  dynamicContrastLocalPointLightCount: number;
  dynamicContrastSourceBackedLocalPointLightCount: number;
  dynamicContrastSourceMdlLocalPointLightCount: number;
  dynamicContrastPlaceableTwoDaLocalPointLightCount: number;
  dynamicContrastPendingLocalPointLightCount: number;
  dynamicContrastLocalPointLightLinearContribution: readonly [number, number, number];
  dynamicContrastLocalPointLightContributionStatus:
    | "not-required-no-visible-point-lights"
    | "source-backed-native-lightColor-alpha-projection-active"
    | "source-backed-native-lightColor-alpha-projection-active-with-unmapped-point-lights"
    | "pending-unmapped-visible-point-lights";
  vibranceEnabled: boolean;
  vibrance: number;
  fogStart: number;
  fogEnd: number;
}

export interface AuroraRetailBloomStageEnergyDiagnostics {
  stage:
    | "linear-scene"
    | "raw-gamma-vfx-composite"
    | "threshold"
    | "bloom-composite";
  status: "readback-complete" | "readback-failed";
  width: number;
  height: number;
  pixelCount: number;
  finiteRgbSampleCount: number;
  maximumRgb: [number, number, number];
  maximumChannel: number;
  meanRgb: [number, number, number];
  nonZeroPixelCount: number;
  pixelsAboveBloomThreshold: number;
  error?: string;
}

export interface AuroraRetailBloomFrameEnergyDiagnostics {
  status: "readback-complete" | "readback-failed";
  stages: AuroraRetailBloomStageEnergyDiagnostics[];
}

export interface AuroraMtrFramebufferRenderPlan {
  lane5: THREE.Object3D[];
  lane6: THREE.Object3D[];
  stageOrder: Array<"mainscene" | "framebuffer_lane_5" | "framebuffer_lane_6">;
}

export interface AuroraRawGammaVfxRenderPlan {
  normalMeshes: THREE.Mesh[];
  additiveMeshes: THREE.Mesh[];
  meshes: THREE.Mesh[];
  stageOrder: Array<
    | "linear_scene"
    | "retail_ssao"
    | "raw_gamma_vfx_composite"
    | "retail_bloom"
    | "retail_postprocess"
    | "raw_gamma_output"
  >;
}

export const AURORA_RETAIL_BLOOM_DEFAULT_PROFILE: Readonly<AuroraRetailBloomProfile> =
  Object.freeze({
    downscaleOffset: 0,
    downscaleSteps: 7,
    threshold: 1,
    softness: 0.9,
    multiplier: 1
  });

export const AURORA_RETAIL_POSTPROCESS_DEFAULT_PROFILE: Readonly<AuroraRetailPostprocessProfile> =
  Object.freeze({
    sharpenEnabled: true,
    dynamicContrastEnabled: true,
    dynamicContrastInputMode: "scene-area",
    dynamicContrastIntensity: 0.15000000596046448,
    dynamicContrastMidpoint: 0.4000000059604645,
    dynamicContrastMidpointSource:
      "settings.tml high-contrast midpoint; inc_postpr_dyn_c scene-area inputs resolved per frame",
    vibranceEnabled: true,
    vibrance: 0.699999988079071,
    fogStart: 0,
    fogEnd: 1
  });

export const AURORA_RETAIL_SSAO_DEFAULT_PROFILE: Readonly<AuroraRetailSsaoProfile> =
  Object.freeze({
    enabled: true,
    intensity: 0.5,
    shaderQualityMode: 1,
    angularFidelity: 8,
    rangeFidelity: 6,
    range: 30,
    nearFade: 0.135,
    occlusionDarkness: 0.15,
    exposureHighlightIntensity: 0.075,
    exposureOcclusionRatio: 4,
    fragmentSourceSha256:
      "98674a357fea91fbcec331a84eb66e0f60b4bfa3bee4d304560d0116ddb774bf",
    includeSourceSha256:
      "944c76f59f7e9bcaaae1d9f66a1f2b83cb57bed116fad2ee4ee06910f3f04671",
    framebufferSourceSha256:
      "4779a9fe01a4419a8a1e394ffddd095d9bbda743e2476277ebc38add23421686",
    vertexSourceSha256:
      "f68bed245a280f4e7c34189693c397942dea4a45fea906e5273222cb843a82c1"
  });

export const AURORA_RETAIL_CAPTURE_LIGHT_CUTOFF_RANGE_MULTIPLIER = 2;
const AURORA_RETAIL_COLOR_CORRECTION_TYPE = 4 as const;
const AURORA_RETAIL_COLOR_CORRECTION_CONFIG_SOURCE_SHA256 =
  "8ae83f7fa429b2d646e7fe421edd25bdfb8c13724a56d5bdb2346b27ae258a8d";
const AURORA_RETAIL_COLOR_CORRECTION_TONEMAP_SOURCE_SHA256 =
  "d59921acbe17cf2e990b70acf2a69cf2f4624e93e3cc8d0f0ba58ef7bc683133";

export function resolveAuroraRetailColorCorrectionType4(
  input: readonly [number, number, number]
): [number, number, number] {
  const maximum = Math.max(input[0], input[1], input[2]);
  if (!(maximum > 1)) {
    return [input[0], input[1], input[2]];
  }
  const modifier = 1 - ((maximum - 1) / maximum) ** 2;
  return input.map(
    (channel) => maximum - (maximum - channel) * modifier
  ) as [number, number, number];
}

export function resolveAuroraRetailDynamicContrastMidpoint(
  input: AuroraRetailDynamicContrastAreaInput
): number {
  const directionContribution =
    input.areaDiffuseDirectionZ < 0
      ? input.areaDiffuseDirectionZ * input.areaDiffuseDirectionZ
      : 0;
  const areaGamma = input.areaAmbientGamma.map((ambient, index) => {
    const diffuse = input.areaDiffuseGamma[index] ?? 0;
    const localLight = input.localLightLinear?.[index] ?? 0;
    const areaLinear =
      0.5 * Math.pow(Math.max(ambient, 0), 2.2) +
      0.5 *
        Math.pow(Math.max(diffuse, 0), 2.2) *
        (0.5 + directionContribution) +
      localLight;
    return input.dynamicContrastMidpoint * Math.pow(Math.max(areaLinear, 0), 1 / 2.2);
  });
  const fogWeight = Number.isFinite(input.fogMixWeight)
    ? Math.min(1, Math.max(0, input.fogMixWeight ?? 0))
    : 1 / (1 + 0.05 * Math.max(2 * input.fogStart + input.fogEnd, 0));
  const mixed = areaGamma.map(
    (channel, index) =>
      channel * (1 - fogWeight) + (input.fogColorGamma[index] ?? 0) * fogWeight
  );
  return Math.min(
    1,
    Math.max(0, (mixed[0] ?? 0) * 0.299 + (mixed[1] ?? 0) * 0.587 + (mixed[2] ?? 0) * 0.114)
  );
}

export function resolveAuroraRetailDynamicContrastSourcePointLightContribution(
  light: THREE.PointLight,
  camera: THREE.Camera,
  cutoffRangeMultiplier = AURORA_RETAIL_CAPTURE_LIGHT_CUTOFF_RANGE_MULTIPLIER
): AuroraRetailDynamicContrastSourcePointLightContribution | null {
  const source = readAuroraSourceMdlPointLight(light);
  if (!source) return null;

  const maximumColor = Math.max(source.color[0], source.color[1], source.color[2]);
  const colorScale =
    source.radius < 1000 && maximumColor > 1 ? 1 / maximumColor : 1;
  const normalizedColor: [number, number, number] = [
    source.color[0] * colorScale,
    source.color[1] * colorScale,
    source.color[2] * colorScale
  ];
  const effectiveRange =
    source.radius >= 1000
      ? source.radius
      : source.radius *
        source.multiplier *
        Math.max(maximumColor, 1) *
        cutoffRangeMultiplier;
  if (!Number.isFinite(effectiveRange) || effectiveRange === 0) {
    return {
      ambientOnly: source.ambientOnly,
      contributionLinear: [0, 0, 0],
      effectiveRange: 0,
      signedRangeSquared: 0,
      sourceKind: source.sourceKind
    };
  }

  camera.updateMatrixWorld(true);
  light.updateWorldMatrix(true, false);
  const viewPosition = light
    .getWorldPosition(new THREE.Vector3())
    .applyMatrix4(camera.matrixWorldInverse);
  const projectedPosition = new THREE.Vector4(
    viewPosition.x,
    viewPosition.y,
    viewPosition.z,
    1
  ).applyMatrix4(camera.projectionMatrix);
  const projectedX =
    Math.abs(projectedPosition.w) > Number.EPSILON
      ? projectedPosition.x / projectedPosition.w
      : 0;
  const projectedY =
    Math.abs(projectedPosition.w) > Number.EPSILON
      ? projectedPosition.y / projectedPosition.w
      : 0;

  let factor = 0.15;
  if (!source.ambientOnly) {
    factor /=
      0.25 *
      (1 + 0.5 * projectedX * projectedX + 0.5 * projectedY * projectedY);
  }
  factor *= factor;
  const rangeFalloff = 1 / Math.abs(effectiveRange);
  const zSquared = viewPosition.z * viewPosition.z;
  factor /=
    rangeFalloff * zSquared * (viewPosition.z < 0 ? 1 : 100) + 1;

  return {
    ambientOnly: source.ambientOnly,
    contributionLinear: [
      factor * normalizedColor[0],
      factor * normalizedColor[1],
      factor * normalizedColor[2]
    ],
    effectiveRange: Math.abs(effectiveRange),
    signedRangeSquared:
      (source.ambientOnly ? -1 : 1) * effectiveRange * effectiveRange,
    sourceKind: source.sourceKind
  };
}

export function resolveAuroraRetailDynamicContrastSceneState(
  scene: THREE.Scene,
  camera: THREE.Camera,
  dynamicContrastMidpoint: number
): AuroraRetailDynamicContrastSceneState {
  const ambientLights: THREE.AmbientLight[] = [];
  const directionalLights: THREE.DirectionalLight[] = [];
  const sourceBackedPointLights: THREE.PointLight[] = [];
  let localPointLightCount = 0;
  scene.traverseVisible((object) => {
    if (
      object instanceof THREE.AmbientLight &&
      object.userData.auroraTerrainAreaGlobalLightRole === "ambient"
    ) {
      ambientLights.push(object);
      return;
    }
    if (
      object instanceof THREE.DirectionalLight &&
      object.userData.auroraTerrainAreaGlobalLightRole === "diffuse"
    ) {
      directionalLights.push(object);
      return;
    }
    if (object instanceof THREE.PointLight) {
      localPointLightCount += 1;
      if (readAuroraSourceMdlPointLight(object)) {
        sourceBackedPointLights.push(object);
      }
    }
  });

  const areaLightingActive =
    scene.userData.auroraTerrainAreaGlobalLightingStatus === "active";
  const areaLightingAvailable =
    areaLightingActive &&
    ambientLights.length > 0 &&
    directionalLights.length > 0;
  const sourceBackedContributions = sourceBackedPointLights
    .map((light) =>
      resolveAuroraRetailDynamicContrastSourcePointLightContribution(light, camera)
    )
    .filter(
      (
        contribution
      ): contribution is AuroraRetailDynamicContrastSourcePointLightContribution =>
        contribution !== null
    );
  const localPointLightLinearContribution = sumAuroraSourcePointLightContributions(
    sourceBackedContributions
  );
  const sourceMdlLocalPointLightCount = sourceBackedContributions.filter(
    ({ sourceKind }) => sourceKind !== "placeable-two-da"
  ).length;
  const placeableTwoDaLocalPointLightCount = sourceBackedContributions.filter(
    ({ sourceKind }) => sourceKind === "placeable-two-da"
  ).length;
  const pendingLocalPointLightCount =
    localPointLightCount - sourceBackedContributions.length;
  const localPointLightContributionStatus =
    resolveAuroraRetailDynamicContrastLocalPointLightStatus(
      localPointLightCount,
      sourceBackedContributions.length,
      pendingLocalPointLightCount
    );
  if (!areaLightingAvailable && sourceBackedContributions.length === 0) {
    return {
      status: "scene-area-input-unavailable",
      midpoint: 0,
      midpointSource:
        pendingLocalPointLightCount > 0
          ? "scene area lights unavailable and visible point lights have no recovered source-MDL lightColor alpha contract; dynamic contrast disabled"
          : "scene area ambient/diffuse and source-MDL local-light inputs unavailable; dynamic contrast disabled",
      areaAmbientLightCount: ambientLights.length,
      areaDiffuseLightCount: directionalLights.length,
      localPointLightCount,
      sourceBackedLocalPointLightCount: sourceBackedContributions.length,
      sourceMdlLocalPointLightCount,
      placeableTwoDaLocalPointLightCount,
      pendingLocalPointLightCount,
      localPointLightLinearContribution,
      localPointLightContributionStatus,
      fogStart: readFiniteSceneNumber(scene.userData.auroraTerrainAreaGlobalFogNear, 0),
      fogEnd: readFiniteSceneNumber(scene.userData.auroraTerrainAreaGlobalFogFar, 1)
    };
  }

  const areaAmbientGamma = areaLightingAvailable
    ? sumAuroraAreaLightSourceColors(ambientLights)
    : ([0, 0, 0] as [number, number, number]);
  const areaDiffuseGamma = areaLightingAvailable
    ? sumAuroraAreaLightSourceColors(directionalLights)
    : ([0, 0, 0] as [number, number, number]);
  let areaDiffuseDirectionZ = 0;
  if (areaLightingAvailable) {
    const sourceDirectional = directionalLights[0];
    camera.updateMatrixWorld(true);
    sourceDirectional.updateWorldMatrix(true, false);
    sourceDirectional.target.updateWorldMatrix(true, false);
    areaDiffuseDirectionZ = sourceDirectional
      .getWorldPosition(new THREE.Vector3())
      .sub(sourceDirectional.target.getWorldPosition(new THREE.Vector3()))
      .transformDirection(camera.matrixWorldInverse)
      .normalize().z;
  }
  const fogAmount = readFiniteSceneNumber(
    scene.userData.auroraTerrainAreaGlobalFogAmount,
    0
  );
  const fogClipDistance = readFiniteSceneNumber(
    scene.userData.auroraTerrainAreaGlobalFogClipDistance,
    1
  );
  const sourceFogStart = 25 - (fogAmount * 25) / 15;
  const fogColorGamma = readSceneColorTriplet(
    scene.userData.auroraTerrainAreaGlobalFogColor
  );
  const sourceFogAvailable =
    Number.isFinite(scene.userData.auroraTerrainAreaGlobalFogAmount) &&
    Number.isFinite(scene.userData.auroraTerrainAreaGlobalFogClipDistance) &&
    Array.isArray(scene.userData.auroraTerrainAreaGlobalFogColor);
  const sceneFog = scene.fog instanceof THREE.Fog ? scene.fog : null;
  const midpointSourceParts = [
    areaLightingAvailable
      ? "inc_postpr_dyn_c area ambient/diffuse direction"
      : null,
    sourceBackedContributions.length > 0
      ? "inc_postpr_dyn_c source-backed lightColor alpha/projection local lights"
      : null,
    sourceFogAvailable ? "ARE fog inputs" : "no source fog contribution"
  ].filter((part): part is string => part !== null);
  if (pendingLocalPointLightCount > 0) {
    midpointSourceParts.push(
      `${pendingLocalPointLightCount} visible non-source-backed point light(s) excluded`
    );
  }

  return {
    status: "source-backed-scene-light-input-active",
    midpoint: resolveAuroraRetailDynamicContrastMidpoint({
      areaAmbientGamma,
      areaDiffuseGamma,
      areaDiffuseDirectionZ,
      dynamicContrastMidpoint,
      fogColorGamma,
      fogStart: sourceFogStart,
      fogEnd: fogClipDistance,
      localLightLinear: localPointLightLinearContribution,
      fogMixWeight: sourceFogAvailable ? undefined : 0
    }),
    midpointSource: midpointSourceParts.join(", "),
    areaAmbientLightCount: ambientLights.length,
    areaDiffuseLightCount: directionalLights.length,
    localPointLightCount,
    sourceBackedLocalPointLightCount: sourceBackedContributions.length,
    sourceMdlLocalPointLightCount,
    placeableTwoDaLocalPointLightCount,
    pendingLocalPointLightCount,
    localPointLightLinearContribution,
    localPointLightContributionStatus,
    fogStart: sceneFog?.near ?? 0,
    fogEnd: sceneFog?.far ?? 1
  };
}

interface AuroraSourceMdlPointLight {
  ambientOnly: boolean;
  color: readonly [number, number, number];
  multiplier: number;
  radius: number;
  sourceKind: AuroraRetailDynamicContrastSourcePointLightContribution["sourceKind"];
}

function readAuroraSourceMdlPointLight(
  light: THREE.PointLight
): AuroraSourceMdlPointLight | null {
  if (light.userData.auroraVfxCanonicalSourceMdlLight === true) {
    return {
      ambientOnly:
        light.userData.auroraVfxCanonicalSourceMdlLightAmbientOnly === true,
      color: readSceneColorTriplet(
        light.userData.auroraVfxCanonicalSourceMdlLightColor,
        [light.color.r, light.color.g, light.color.b]
      ),
      multiplier: readFiniteSceneNumber(
        light.userData.auroraVfxCanonicalSourceMdlLightMultiplier,
        light.intensity
      ),
      radius: readFiniteSceneNumber(
        light.userData.auroraVfxCanonicalSourceMdlLightRadius,
        light.distance
      ),
      sourceKind: "canonical-vfx"
    };
  }

  if (
    light.userData.placeableTwoDaLightPreviewRole ===
    "placeables-2da-point-light"
  ) {
    const parentData = light.parent?.userData ?? {};
    return {
      ambientOnly: false,
      color: readSceneColorTriplet(
        light.userData.placeableTwoDaLightColor ??
          parentData.placeableTwoDaLightColor,
        [light.color.r * light.intensity, light.color.g * light.intensity, light.color.b * light.intensity]
      ),
      // fx_placeable01 carries the lightcolor.2da RGB vector as lightColor;
      // the Three intensity is only its normalized rendering representation,
      // not an additional native multiplier.
      multiplier: 1,
      radius: readFiniteSceneNumber(
        light.userData.placeableTwoDaLightSourceRadiusWorldDistance ??
          parentData.placeableTwoDaLightSourceRadiusWorldDistance,
        light.distance
      ),
      sourceKind: "placeable-two-da"
    };
  }

  const placeableRole = light.userData.auroraLightPreviewRole;
  if (
    placeableRole === "source-mdl-point-light" ||
    placeableRole === "source-mdl-localized-ambient-point-light"
  ) {
    const parentData = light.parent?.userData ?? {};
    return {
      ambientOnly:
        light.userData.auroraLightAmbientOnly === true ||
        parentData.auroraLightAmbientOnly === true,
      color: readSceneColorTriplet(
        light.userData.auroraLightColor ?? parentData.auroraLightColor,
        [light.color.r, light.color.g, light.color.b]
      ),
      multiplier: readFiniteSceneNumber(
        light.userData.auroraLightAnimatedMultiplier ??
          parentData.auroraLightAnimatedMultiplier,
        light.intensity
      ),
      radius: readFiniteSceneNumber(
        light.userData.auroraLightSourceRadiusWorldDistance ??
          parentData.auroraLightSourceRadiusWorldDistance,
        light.distance
      ),
      sourceKind: "placeable-source-mdl"
    };
  }

  const creatureRole = light.userData.creatureAuroraLightPreviewRole;
  if (
    creatureRole === "source-mdl-point-light" ||
    creatureRole === "source-mdl-localized-ambient-point-light"
  ) {
    const parentData = light.parent?.userData ?? {};
    return {
      ambientOnly:
        light.userData.creatureAuroraLightAmbientOnly === true ||
        parentData.creatureAuroraLightAmbientOnly === true,
      color: readSceneColorTriplet(
        light.userData.creatureAuroraLightPreviewColor ??
          parentData.creatureAuroraLightPreviewColor ??
          parentData.creatureAuroraLightColor,
        [light.color.r, light.color.g, light.color.b]
      ),
      multiplier: readFiniteSceneNumber(
        light.userData.creatureAuroraLightAnimatedMultiplier ??
          parentData.creatureAuroraLightAnimatedMultiplier,
        light.intensity
      ),
      radius: readFiniteSceneNumber(
        light.userData.creatureAuroraLightSourceRadiusWorldDistance ??
          parentData.creatureAuroraLightSourceRadiusWorldDistance,
        light.distance
      ),
      sourceKind: "creature-source-mdl"
    };
  }

  return null;
}

function sumAuroraSourcePointLightContributions(
  contributions: readonly AuroraRetailDynamicContrastSourcePointLightContribution[]
): [number, number, number] {
  return contributions.reduce<[number, number, number]>(
    (sum, contribution) => [
      sum[0] + contribution.contributionLinear[0],
      sum[1] + contribution.contributionLinear[1],
      sum[2] + contribution.contributionLinear[2]
    ],
    [0, 0, 0]
  );
}

function resolveAuroraRetailDynamicContrastLocalPointLightStatus(
  localPointLightCount: number,
  sourceMdlLocalPointLightCount: number,
  pendingLocalPointLightCount: number
): AuroraRetailDynamicContrastSceneState["localPointLightContributionStatus"] {
  if (localPointLightCount === 0) {
    return "not-required-no-visible-point-lights";
  }
  if (sourceMdlLocalPointLightCount === 0) {
    return "pending-unmapped-visible-point-lights";
  }
  return pendingLocalPointLightCount > 0
    ? "source-backed-native-lightColor-alpha-projection-active-with-unmapped-point-lights"
    : "source-backed-native-lightColor-alpha-projection-active";
}

function sumAuroraAreaLightSourceColors(
  lights: readonly (THREE.AmbientLight | THREE.DirectionalLight)[]
): [number, number, number] {
  const result: [number, number, number] = [0, 0, 0];
  lights.forEach((light) => {
    const sourceColor = readSceneColorTriplet(
      light.userData.auroraTerrainAreaGlobalLightColor,
      [light.color.r, light.color.g, light.color.b]
    );
    result[0] += sourceColor[0] * light.intensity;
    result[1] += sourceColor[1] * light.intensity;
    result[2] += sourceColor[2] * light.intensity;
  });
  return result;
}

function readSceneColorTriplet(
  value: unknown,
  fallback: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  if (
    !Array.isArray(value) ||
    value.length < 3 ||
    !value.slice(0, 3).every((entry) => typeof entry === "number" && Number.isFinite(entry))
  ) {
    return [fallback[0], fallback[1], fallback[2]];
  }
  return [value[0], value[1], value[2]];
}

function readFiniteSceneNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function resolveAuroraRetailParticleFogFrameState(
  scene: THREE.Scene
): {
  enabled: boolean;
  start: number;
  end: number;
  colorGamma: [number, number, number];
  status:
    | "source_area_fog_active"
    | "disabled_no_active_source_area_fog";
} {
  const fog = scene.fog instanceof THREE.Fog ? scene.fog : null;
  const sourceColor = scene.userData.auroraTerrainAreaGlobalFogColor;
  const sourceFogActive =
    scene.userData.auroraTerrainAreaGlobalFogStatus === "active" &&
    fog !== null &&
    Array.isArray(sourceColor) &&
    sourceColor.length >= 3 &&
    sourceColor
      .slice(0, 3)
      .every(
        (entry: unknown) =>
          typeof entry === "number" && Number.isFinite(entry)
      ) &&
    fog.far > fog.near;
  if (!sourceFogActive || !fog) {
    return {
      enabled: false,
      start: 0,
      end: 1,
      colorGamma: [0, 0, 0],
      status: "disabled_no_active_source_area_fog"
    };
  }
  return {
    enabled: true,
    start: fog.near,
    end: fog.far,
    colorGamma: readSceneColorTriplet(sourceColor),
    status: "source_area_fog_active"
  };
}

const FULLSCREEN_VERTEX_SHADER = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const SCENE_TO_AURORA_GAMMA_FRAGMENT_SHADER = `
uniform sampler2D sourceTexture;
varying vec2 vUv;

vec3 toAuroraGamma(vec3 linearColor) {
  return pow(max(linearColor, vec3(0.0)), vec3(1.0 / 2.2));
}

void main() {
  vec4 sceneColor = texture2D(sourceTexture, vUv);
  gl_FragColor = vec4(toAuroraGamma(sceneColor.rgb), sceneColor.a);
}
`;

const SSAO_MODIFIER_FRAGMENT_SHADER = `
uniform sampler2D depthTexture;
uniform vec2 pixelSize;
uniform vec2 screenSize;
uniform float aspectRatio;
uniform float nearClip;
uniform float farClip;
uniform float aoIntensity;
uniform float fogEnabled;
uniform float fogStart;
uniform float fogInvEndMinusStart;
varying vec2 vUv;

const float PI = 3.14159265359;
const float PIXEL_TO_DISTANCE = 0.828427;
const float ANGULAR_FIDELITY_INVERSE = 0.125;
const float SSAO_CUTOFF_ANGLE_MODIFIER = 0.36397023;
const float SSAO_CUTOFF_LIMIT = 2.0;
const float SSAO_RANGE = 30.0;
const float SSAO_NEAR_FADE = 0.135;
const float SSAO_OCCLUSION_DARKNESS = 0.15;
const float SSAO_EXPOSURE_HIGHLIGHT = 0.075;
const float SSAO_EXPOSURE_OCCLUSION_RATIO = 4.0;

float getDepth(vec2 coords) {
  float depthToLinearModifier = 1.0 - nearClip / farClip;
  return nearClip / (1.0 - texture2D(depthTexture, coords).x * depthToLinearModifier);
}

float getViewZFromDepth(vec2 coords) {
  return -getDepth(coords);
}

float getPerpendicularPixelDistance(float distance) {
  return distance * pixelSize.y * PIXEL_TO_DISTANCE;
}

vec3 directionProjectionToView(vec3 direction, vec2 screenCoords) {
  vec2 offset = vec2((screenCoords.x - 0.5) * aspectRatio, screenCoords.y - 0.5);
  direction.xy -= direction.z * offset * PIXEL_TO_DISTANCE;
  return direction;
}

vec3 directionViewToProjection(vec3 direction, vec2 screenCoords) {
  vec2 offset = vec2((screenCoords.x - 0.5) * aspectRatio, screenCoords.y - 0.5);
  direction.xy += direction.z * offset * PIXEL_TO_DISTANCE;
  return direction;
}

vec3 getNormalVector(vec2 coords) {
  float pixelDistance = getViewZFromDepth(coords);
  float perpendicularPixelDistance = getPerpendicularPixelDistance(pixelDistance);
  vec3 horizontal = vec3(0.0);
  vec3 vertical = vec3(0.0);
  for (int axis = 0; axis < 2; axis += 1) {
    vec2 offset = axis == 0 ? vec2(pixelSize.x, 0.0) : vec2(0.0, pixelSize.y);
    float negativeDelta = pixelDistance - getViewZFromDepth(coords - offset);
    float positiveDelta = pixelDistance - getViewZFromDepth(coords + offset);
    float distanceDelta = abs(negativeDelta) < abs(positiveDelta)
      ? -negativeDelta
      : positiveDelta;
    if (axis == 0) {
      horizontal = directionProjectionToView(
        vec3(perpendicularPixelDistance, 0.0, distanceDelta),
        coords
      );
    } else {
      vertical = directionProjectionToView(
        vec3(0.0, perpendicularPixelDistance, distanceDelta),
        coords
      );
    }
  }
  return normalize(cross(horizontal, vertical));
}

struct SsaoState {
  vec2 coords;
  vec3 normal;
  float depth;
  float perpendicularPixelDistance;
  float angleIterationSize;
  vec3 offset;
  vec3 occlusion;
  vec2 occlusionCoordsOffset;
  float offset1;
  float offset2;
  float maxRange;
  float iterationRange;
  float occlusionTotal;
  float exposureTotal;
  float rangeToOpenEdge;
  float rangeToClosedEdge;
};

struct SsaoRangeProbe {
  vec2 occlusionCoords;
  float iterationRange;
  float rangeValue;
  bool extendRange;
  float occlusionRange;
  float occlusionActualRange;
  float occlusionDelta;
};

void ssaoProbeRange(inout SsaoRangeProbe probe, inout SsaoState state) {
  float actualRange = state.perpendicularPixelDistance * probe.rangeValue;
  vec2 sampleCoords = state.coords + state.occlusionCoordsOffset * probe.rangeValue;
  float expectedDepth = -state.occlusion.z * actualRange + state.depth;
  float depthDelta = getDepth(sampleCoords) - expectedDepth;
  float tolerance = actualRange + 2.0 * state.perpendicularPixelDistance;
  if (
    abs(depthDelta) > tolerance * SSAO_CUTOFF_ANGLE_MODIFIER &&
    depthDelta > -tolerance * SSAO_CUTOFF_LIMIT
  ) {
    probe.occlusionCoords = sampleCoords;
    probe.occlusionDelta = depthDelta;
    probe.occlusionRange = probe.rangeValue;
    probe.occlusionActualRange = actualRange;
    probe.extendRange = false;
    probe.iterationRange = -probe.iterationRange;
  }
  if (!probe.extendRange) {
    probe.iterationRange *= 0.5;
  }
  probe.rangeValue += probe.iterationRange;
  probe.iterationRange = abs(probe.iterationRange);
}

void ssaoProbeAngle(int angularIteration, inout SsaoState state) {
  if (angularIteration == 4) {
    state.offset = cos(state.angleIterationSize) * state.offset +
      sin(state.angleIterationSize) * cross(state.offset, state.normal);
    state.occlusion = normalize(directionViewToProjection(state.offset, state.coords));
    state.occlusionCoordsOffset = pixelSize * state.occlusion.xy;
  } else if (angularIteration == 0) {
    state.offset = cross(vec3(state.offset1, state.offset2, 0.0), state.normal);
    state.occlusion = normalize(directionViewToProjection(state.offset, state.coords));
    state.occlusionCoordsOffset = pixelSize * state.occlusion.xy;
  } else if (angularIteration == 2 || angularIteration == 6) {
    state.offset = cross(state.normal, state.offset);
    state.occlusion = normalize(directionViewToProjection(state.offset, state.coords));
    state.occlusionCoordsOffset = pixelSize * state.occlusion.xy;
  } else {
    state.occlusion = -state.occlusion;
    state.occlusionCoordsOffset = -state.occlusionCoordsOffset;
  }

  SsaoRangeProbe probe;
  probe.occlusionCoords = state.coords;
  probe.iterationRange = state.iterationRange;
  probe.rangeValue = probe.iterationRange;
  probe.extendRange = true;
  probe.occlusionRange = -1.0;
  probe.occlusionActualRange = 0.0;
  probe.occlusionDelta = 0.0;
  ssaoProbeRange(probe, state);
  ssaoProbeRange(probe, state);
  ssaoProbeRange(probe, state);
  ssaoProbeRange(probe, state);
  ssaoProbeRange(probe, state);
  ssaoProbeRange(probe, state);

  if (probe.occlusionRange != -1.0) {
    float occlusion = 1.0 - 0.8 * probe.occlusionRange / state.maxRange;
    occlusion *= occlusion;
    if (sign(probe.occlusionDelta) == -1.0) {
      vec3 idealOcclusion = state.occlusion +
        directionViewToProjection(state.normal, probe.occlusionCoords);
      float rangeOffset = probe.occlusionRange + 3.0;
      float idealDelta = 1.0;
      float delta = getDepth(
        state.coords + state.occlusionCoordsOffset * rangeOffset
      ) - state.depth;
      delta -= rangeOffset * state.perpendicularPixelDistance * (-idealOcclusion.z);
      if (sign(delta) == -1.0) {
        idealDelta *= 1.0 - delta * rangeOffset * 0.5;
      }
      float expectedDepth = -idealOcclusion.z * probe.occlusionActualRange + state.depth;
      delta = getDepth(
        state.coords + idealOcclusion.xy * pixelSize * probe.occlusionRange
      ) - expectedDepth;
      if (sign(delta) == 1.0) {
        idealDelta += 3.375 * delta / probe.occlusionActualRange;
      }
      occlusion *= 1.0 / idealDelta;
      state.rangeToClosedEdge = min(state.rangeToClosedEdge, probe.occlusionRange);
      state.occlusionTotal += occlusion;
    } else {
      state.rangeToOpenEdge = min(state.rangeToOpenEdge, probe.occlusionRange);
      state.exposureTotal += occlusion;
    }
  }
}

void main() {
  SsaoState state;
  state.coords = vUv;
  state.depth = getDepth(state.coords);
  if (state.depth <= SSAO_NEAR_FADE) {
    gl_FragColor = vec4(1.0);
    return;
  }
  state.perpendicularPixelDistance = getPerpendicularPixelDistance(state.depth);
  state.normal = getNormalVector(state.coords);
  state.offset = vec3(0.0);
  state.occlusion = vec3(0.0);
  state.angleIterationSize = PI * 2.0 * ANGULAR_FIDELITY_INVERSE;
  if (abs(fract(gl_FragCoord.x * 0.5) - fract(gl_FragCoord.y * 0.5)) >= 0.25) {
    state.offset1 = 1.0;
    state.offset2 = 0.0;
  } else {
    state.offset1 = 0.707;
    state.offset2 = 0.707;
  }
  state.maxRange = SSAO_RANGE * (45.0 / state.depth) * screenSize.y / 1080.0;
  state.iterationRange = state.maxRange / 6.0;
  state.occlusionTotal = 0.0;
  state.exposureTotal = 0.0;
  state.rangeToOpenEdge = state.maxRange;
  state.rangeToClosedEdge = state.maxRange;
  state.occlusionCoordsOffset = vec2(0.0);
  ssaoProbeAngle(0, state);
  ssaoProbeAngle(1, state);
  ssaoProbeAngle(2, state);
  ssaoProbeAngle(3, state);
  ssaoProbeAngle(4, state);
  ssaoProbeAngle(5, state);
  ssaoProbeAngle(6, state);
  ssaoProbeAngle(7, state);

  float modifier = 1.0;
  if (max(state.exposureTotal, state.occlusionTotal) > 0.0) {
    state.exposureTotal *= ANGULAR_FIDELITY_INVERSE;
    state.exposureTotal += sqrt(state.exposureTotal);
    state.occlusionTotal *= ANGULAR_FIDELITY_INVERSE;
    state.occlusionTotal += sqrt(state.occlusionTotal);
    float delta = state.exposureTotal -
      state.occlusionTotal * SSAO_EXPOSURE_OCCLUSION_RATIO;
    delta *= min(1.0, (state.depth - SSAO_NEAR_FADE) * 0.25);
    if (max(state.rangeToOpenEdge, state.rangeToClosedEdge) < state.maxRange) {
      delta *= min(
        1.0,
        2.0 * state.rangeToOpenEdge * state.rangeToClosedEdge / state.maxRange
      );
    }
    delta *= sign(delta) == -1.0
      ? SSAO_OCCLUSION_DARKNESS
      : SSAO_EXPOSURE_HIGHLIGHT;
    delta *= aoIntensity;
    modifier *= max(1.0 + delta, 0.0);
    if (fogEnabled != 0.0) {
      float fogModifier = clamp(
        (state.depth - fogStart) * fogInvEndMinusStart,
        0.0,
        1.0
      );
      if (fogModifier >= 0.99) {
        modifier = 1.0;
      } else {
        modifier = mix(modifier, 1.0, fogModifier);
      }
    }
  }
  gl_FragColor = vec4(modifier, modifier, modifier, 1.0);
}
`;

const SSAO_DIAGONAL_BLUR_FRAGMENT_SHADER = `
uniform sampler2D sourceTexture;
uniform vec2 pixelSize;
uniform vec2 blurDirection;
varying vec2 vUv;

void main() {
  vec2 offset = pixelSize * blurDirection;
  float modifier = texture2D(sourceTexture, vUv + offset).r * 4.0;
  modifier += texture2D(sourceTexture, vUv - offset).r * 4.0;
  modifier += texture2D(sourceTexture, vUv + offset * 3.0).r * 2.0;
  modifier += texture2D(sourceTexture, vUv - offset * 3.0).r * 2.0;
  modifier += texture2D(sourceTexture, vUv + offset * 5.0).r;
  modifier += texture2D(sourceTexture, vUv - offset * 5.0).r;
  modifier /= 14.0;
  gl_FragColor = vec4(modifier, modifier, modifier, 1.0);
}
`;

const SSAO_APPLY_FRAGMENT_SHADER = `
uniform sampler2D sceneTexture;
uniform sampler2D modifierTexture;
uniform vec2 pixelSize;
varying vec2 vUv;

void main() {
  vec2 offset = vec2(pixelSize.x, -pixelSize.y);
  float modifier = texture2D(modifierTexture, vUv + offset).r * 4.0;
  modifier += texture2D(modifierTexture, vUv - offset).r * 4.0;
  modifier += texture2D(modifierTexture, vUv + offset * 3.0).r * 2.0;
  modifier += texture2D(modifierTexture, vUv - offset * 3.0).r * 2.0;
  modifier += texture2D(modifierTexture, vUv + offset * 5.0).r;
  modifier += texture2D(modifierTexture, vUv - offset * 5.0).r;
  modifier /= 14.0;
  vec4 sceneColor = texture2D(sceneTexture, vUv);
  gl_FragColor = vec4(sceneColor.rgb * modifier, sceneColor.a);
}
`;

const THRESHOLD_FRAGMENT_SHADER = `
uniform sampler2D sourceTexture;
uniform float bloomThreshold;
varying vec2 vUv;

float bloomModifier(vec3 color) {
  float maximumChannel = max(color.r, max(color.g, color.b));
  if (maximumChannel <= bloomThreshold) return 0.0;
  return (maximumChannel - bloomThreshold) / maximumChannel;
}

void main() {
  vec3 color = texture2D(sourceTexture, vUv).rgb;
  color = clamp(color, vec3(-10.0), vec3(10.0));
  gl_FragColor = vec4(color * bloomModifier(color), 1.0);
}
`;

const DOWNSCALE_FRAGMENT_SHADER = `
uniform sampler2D sourceTexture;
uniform vec2 pixelSize;
uniform float bloomSoftness;
varying vec2 vUv;

void main() {
  vec2 offset = pixelSize * 0.5;
  vec3 color = texture2D(sourceTexture, vUv + offset).rgb;
  color += texture2D(sourceTexture, vUv - offset).rgb;
  color += texture2D(sourceTexture, vUv + vec2(offset.x, -offset.y)).rgb;
  color += texture2D(sourceTexture, vUv + vec2(-offset.x, offset.y)).rgb;
  gl_FragColor = vec4(color * (0.25 * bloomSoftness), 1.0);
}
`;

const UPSCALE_FRAGMENT_SHADER = `
uniform sampler2D smallerTexture;
uniform sampler2D sourceLevelTexture;
uniform vec2 pixelSize;
varying vec2 vUv;

void main() {
  vec2 offset = pixelSize * 1.5;
  vec3 color = texture2D(smallerTexture, vUv + offset).rgb;
  color += texture2D(smallerTexture, vUv - offset).rgb;
  color += texture2D(smallerTexture, vUv + vec2(offset.x, -offset.y)).rgb;
  color += texture2D(smallerTexture, vUv + vec2(-offset.x, offset.y)).rgb;
  color *= 0.25;
  color += texture2D(sourceLevelTexture, vUv).rgb;
  gl_FragColor = vec4(color, 1.0);
}
`;

const APPLY_FRAGMENT_SHADER = `
uniform sampler2D sceneTexture;
uniform sampler2D bloomTexture;
uniform sampler2D thresholdTexture;
uniform vec2 pixelSize;
uniform float bloomThreshold;
uniform float bloomMultiplier;
uniform float normalizationFactor;
varying vec2 vUv;

float bloomModifier(vec3 color) {
  float maximumChannel = max(color.r, max(color.g, color.b));
  if (maximumChannel <= bloomThreshold) return 0.0;
  return (maximumChannel - bloomThreshold) / maximumChannel;
}

void main() {
  vec2 offset = pixelSize * 1.5;
  vec3 bloom = texture2D(bloomTexture, vUv + offset).rgb;
  bloom += texture2D(bloomTexture, vUv - offset).rgb;
  bloom += texture2D(bloomTexture, vUv + vec2(offset.x, -offset.y)).rgb;
  bloom += texture2D(bloomTexture, vUv + vec2(-offset.x, offset.y)).rgb;

  offset = pixelSize * 0.5;
  bloom += texture2D(thresholdTexture, vUv + offset).rgb;
  bloom += texture2D(thresholdTexture, vUv - offset).rgb;
  bloom += texture2D(thresholdTexture, vUv + vec2(offset.x, -offset.y)).rgb;
  bloom += texture2D(thresholdTexture, vUv + vec2(-offset.x, offset.y)).rgb;
  bloom *= 0.25;

  vec3 thresholdColor = texture2D(thresholdTexture, vUv).rgb;
  float bloomAlpha = clamp(
    bloomModifier(thresholdColor + vec3(bloomThreshold)) * bloomMultiplier,
    0.0,
    1.0
  );
  bloom *= normalizationFactor * bloomMultiplier;
  bloom = max(bloom, thresholdColor * bloomMultiplier);

  vec3 sceneColor = texture2D(sceneTexture, vUv).rgb;
  gl_FragColor = vec4(bloom + sceneColor * (1.0 - bloomAlpha), 1.0);
}
`;

const POSTPROCESS_FRAGMENT_SHADER = `
uniform sampler2D sourceTexture;
uniform sampler2D depthTexture;
uniform vec2 pixelSize;
uniform float nearClip;
uniform float farClip;
uniform float perspectiveDepth;
uniform float sharpenEnabled;
uniform float dynamicContrastEnabled;
uniform float dynamicContrastIntensity;
uniform float dynamicContrastMidpoint;
uniform float vibranceEnabled;
uniform float vibrance;
uniform float fogStart;
uniform float fogEnd;
varying vec2 vUv;

float colorToLuma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

float colorToBrightness(vec3 color) {
  return dot(color, vec3(0.3333333));
}

float getDepth(vec2 coords) {
  float depth = texture2D(depthTexture, coords).x;
  float perspectiveValue = nearClip / (1.0 - depth * (1.0 - nearClip / farClip));
  float orthographicValue = nearClip + depth * (farClip - nearClip);
  return mix(orthographicValue, perspectiveValue, perspectiveDepth);
}

float colorLumaDelta(vec3 color, vec3 otherColor) {
  return colorToLuma(color - otherColor);
}

void sharpenPair(
  inout vec4 color,
  vec2 offset,
  float diagonalWeight,
  inout float lumaDeltaMax
) {
  vec4 colorA = texture2D(sourceTexture, vUv + offset);
  vec4 colorB = texture2D(sourceTexture, vUv - offset);
  float deltaA = colorLumaDelta(colorA.rgb, color.rgb);
  float deltaB = colorLumaDelta(colorB.rgb, color.rgb);
  if (color.a != colorA.a) deltaA = 0.0;
  if (color.a != colorB.a) deltaB = 0.0;
  float delta = deltaA > deltaB
    ? deltaA - abs(deltaB)
    : deltaB - abs(deltaA);
  delta *= diagonalWeight;
  if (lumaDeltaMax < delta) lumaDeltaMax = delta;
}

void applySharpen(inout vec4 color) {
  vec2 left = vec2(-pixelSize.x, 0.0);
  vec2 down = vec2(0.0, -pixelSize.y);
  vec4 leftA = texture2D(sourceTexture, vUv + left);
  vec4 leftB = texture2D(sourceTexture, vUv - left);
  float lumaDeltaMaxH = colorLumaDelta(leftA.rgb, color.rgb);
  vec3 colorAA = leftA.rgb;
  if (abs(lumaDeltaMaxH) < abs(colorLumaDelta(leftB.rgb, color.rgb))) {
    colorAA = leftB.rgb;
    lumaDeltaMaxH = colorLumaDelta(leftB.rgb, color.rgb);
  }

  vec4 downA = texture2D(sourceTexture, vUv + down);
  vec4 downB = texture2D(sourceTexture, vUv - down);
  float lumaDeltaMaxV = colorLumaDelta(downA.rgb, color.rgb);
  if (abs(lumaDeltaMaxV) < abs(colorLumaDelta(downB.rgb, color.rgb))) {
    colorAA += downB.rgb;
    lumaDeltaMaxV = colorLumaDelta(downB.rgb, color.rgb);
  } else {
    colorAA += downA.rgb;
  }

  float lumaDeltaMax = 0.0;
  sharpenPair(color, left, 1.0, lumaDeltaMax);
  sharpenPair(color, down, 1.0, lumaDeltaMax);
  sharpenPair(color, vec2(-pixelSize.x, pixelSize.y), 0.707, lumaDeltaMax);
  sharpenPair(color, -pixelSize, 0.707, lumaDeltaMax);

  float fogModifier = clamp(
    1.0 - (getDepth(vUv) - fogStart) / max(fogEnd - fogStart, 0.000001),
    0.0,
    1.0
  );
  float sharpenDepthModifier = 1.0 / (1.0 + getDepth(vUv) * 0.075);
  float modifier = 0.0;
  float aaModifier = 0.0;
  if (sign(lumaDeltaMaxH) == sign(lumaDeltaMaxV)) {
    colorAA *= 0.5;
    float edgeModifier = abs(lumaDeltaMaxH + lumaDeltaMaxV);
    aaModifier = clamp(10.0 * edgeModifier - 3.0, 0.0, 0.333333);
    color.rgb = mix(color.rgb, colorAA, aaModifier);
  }
  lumaDeltaMax -= 0.004;
  if (sign(lumaDeltaMax) == 1.0 && lumaDeltaMax < 0.15) {
    lumaDeltaMax = 1.0 - pow(max(1.0 - lumaDeltaMax * (2.0 / 0.15), 0.0), 2.0);
    modifier = -(1.0 - 2.0 * aaModifier) * lumaDeltaMax;
  }
  modifier += 0.3 * fogModifier;
  modifier /= max(colorToLuma(color.rgb), 0.2);
  color.rgb *= 1.0 + sharpenDepthModifier * 0.065 * modifier;
}

void applyDynamicContrast(inout vec4 color) {
  float brightness = colorToBrightness(color.rgb);
  float delta = colorToLuma(color.rgb) - dynamicContrastMidpoint;
  float modifier = delta * dynamicContrastIntensity * max(0.0, 1.0 - brightness * brightness);
  modifier /= max(brightness, 0.2);
  color.rgb *= modifier + 1.0;
}

void applyVibrance(inout vec4 color) {
  float luma = colorToLuma(color.rgb);
  if (luma > 0.0) {
    float maximum = max(color.r, max(color.g, color.b));
    float minimum = min(color.r, min(color.g, color.b));
    vec3 offset = color.rgb - maximum;
    float saturation = (maximum - minimum) / maximum;
    offset *= 1.0 + (1.0 - saturation) * (1.0 - saturation) * vibrance;
    color.rgb = clamp(vec3(maximum) + offset, 0.0, 1.0);
    color.rgb *= luma / colorToLuma(color.rgb);
  }
}

float square(float value) {
  return value * value;
}

vec3 auroraColorCorrectionType4(vec3 color) {
  float maximum = max(color.r, max(color.g, color.b));
  if (maximum > 1.0) {
    color = -color + maximum;
    color *= 1.0 - square((maximum - 1.0) / maximum);
    color = -color + maximum;
  }
  return color;
}

void main() {
  vec4 color = texture2D(sourceTexture, vUv);
  if (sharpenEnabled > 0.5) applySharpen(color);
  if (dynamicContrastEnabled > 0.5) applyDynamicContrast(color);
  if (vibranceEnabled > 0.5) applyVibrance(color);
  color.rgb = auroraColorCorrectionType4(color.rgb);
  gl_FragColor = color;
}
`;

function createRenderTarget(width: number, height: number, depthBuffer = false) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    type: THREE.HalfFloatType,
    format: THREE.RGBAFormat,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    generateMipmaps: false,
    depthBuffer,
    stencilBuffer: false
  });
  target.texture.colorSpace = THREE.NoColorSpace;
  if (depthBuffer) {
    target.depthTexture = new THREE.DepthTexture(width, height, THREE.UnsignedIntType);
    target.depthTexture.format = THREE.DepthFormat;
    target.depthTexture.minFilter = THREE.NearestFilter;
    target.depthTexture.magFilter = THREE.NearestFilter;
  }
  return target;
}

export function collectAuroraMtrFramebufferRenderPlan(
  scene: THREE.Scene
): AuroraMtrFramebufferRenderPlan {
  const lane5: THREE.Object3D[] = [];
  const lane6: THREE.Object3D[] = [];
  scene.traverseVisible((object) => {
    const lane = readAuroraMtrFramebufferRuntimeLane(object);
    if (lane === 5) lane5.push(object);
    if (lane === 6) lane6.push(object);
  });
  return {
    lane5,
    lane6,
    stageOrder: [
      "mainscene",
      ...(lane5.length > 0 ? (["framebuffer_lane_5"] as const) : []),
      ...(lane6.length > 0 ? (["framebuffer_lane_6"] as const) : [])
    ]
  };
}

export function collectAuroraRawGammaVfxRenderPlan(
  scene: THREE.Scene
): AuroraRawGammaVfxRenderPlan {
  const normalMeshes: THREE.Mesh[] = [];
  const additiveMeshes: THREE.Mesh[] = [];
  const meshes: THREE.Mesh[] = [];
  scene.traverseVisible((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const lane =
      object.userData.auroraCanonicalColorAccumulationLane ??
      object.userData.auroraVfxCanonicalColorAccumulationLane;
    if (lane === "aurora_raw_gamma_normal_before_retail_bloom") {
      normalMeshes.push(object);
      meshes.push(object);
    } else if (lane === "aurora_raw_gamma_additive_before_retail_bloom") {
      additiveMeshes.push(object);
      meshes.push(object);
    }
  });
  return {
    normalMeshes,
    additiveMeshes,
    meshes,
    stageOrder: [
      "linear_scene",
      "retail_ssao",
      ...(meshes.length > 0 ? (["raw_gamma_vfx_composite"] as const) : []),
      "retail_bloom",
      "retail_postprocess",
      "raw_gamma_output"
    ]
  };
}

function createFullscreenMaterial(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERTEX_SHADER,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    toneMapped: false
  });
}

export function resolveAuroraRetailBloomLevelSizes(
  width: number,
  height: number,
  profile: AuroraRetailBloomProfile = AURORA_RETAIL_BLOOM_DEFAULT_PROFILE
): AuroraRetailBloomLevelSize[] {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const offset = Math.max(0, Math.trunc(profile.downscaleOffset));
  const steps = Math.min(8, Math.max(0, Math.trunc(profile.downscaleSteps)));
  const baseWidth = Math.max(1, Math.floor(safeWidth / 2 ** offset));
  const baseHeight = Math.max(1, Math.floor(safeHeight / 2 ** offset));
  return Array.from({ length: steps }, (_, index) => ({
    width: Math.max(1, Math.floor(baseWidth / 2 ** (index + 1))),
    height: Math.max(1, Math.floor(baseHeight / 2 ** (index + 1)))
  }));
}

export function resolveAuroraRetailBloomNormalizationFactor(
  profile: AuroraRetailBloomProfile = AURORA_RETAIL_BLOOM_DEFAULT_PROFILE
): number {
  const steps = Math.min(8, Math.max(0, Math.trunc(profile.downscaleSteps)));
  if (profile.softness === 1 || steps === 0) return 1 / (1 + steps);
  return (profile.softness - 1) / (profile.softness ** (steps + 1) - 1);
}

export class AuroraRetailBloomPass {
  readonly profile: Readonly<AuroraRetailBloomProfile>;
  readonly postprocessProfile: Readonly<AuroraRetailPostprocessProfile>;
  readonly ssaoProfile: Readonly<AuroraRetailSsaoProfile>;

  private readonly sceneTarget = createRenderTarget(1, 1, true);
  private readonly ssaoModifierTarget = createRenderTarget(1, 1);
  private readonly ssaoBlurTarget = createRenderTarget(1, 1);
  private readonly ssaoSceneTarget = createRenderTarget(1, 1);
  private readonly rawGammaVfxCompositeTarget = createRenderTarget(1, 1, true);
  private readonly framebufferLane5CaptureTarget = createRenderTarget(1, 1, true);
  private readonly framebufferLane6CaptureTarget = createRenderTarget(1, 1, true);
  private readonly thresholdTarget = createRenderTarget(1, 1);
  private readonly bloomCompositeTarget = createRenderTarget(1, 1);
  private readonly downscaleTargets: THREE.WebGLRenderTarget[];
  private readonly upscaleTargets: THREE.WebGLRenderTarget[];
  private readonly fullscreenScene = new THREE.Scene();
  private readonly fullscreenCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly fullscreenQuad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly sceneToGammaMaterial: THREE.ShaderMaterial;
  private readonly ssaoModifierMaterial: THREE.ShaderMaterial;
  private readonly ssaoBlurMaterial: THREE.ShaderMaterial;
  private readonly ssaoApplyMaterial: THREE.ShaderMaterial;
  private readonly thresholdMaterial: THREE.ShaderMaterial;
  private readonly downscaleMaterial: THREE.ShaderMaterial;
  private readonly upscaleMaterial: THREE.ShaderMaterial;
  private readonly applyMaterial: THREE.ShaderMaterial;
  private readonly postprocessMaterial: THREE.ShaderMaterial;
  private readonly drawingBufferSize = new THREE.Vector2();
  private readonly previousViewport = new THREE.Vector4();
  private readonly previousScissor = new THREE.Vector4();
  private width = 0;
  private height = 0;
  private levelSizes: AuroraRetailBloomLevelSize[] = [];
  private framebufferLane5MeshCount = 0;
  private framebufferLane6MeshCount = 0;
  private framebufferStageOrder: string[] = ["mainscene"];
  private rawGammaNormalVfxMeshCount = 0;
  private rawGammaAdditiveVfxMeshCount = 0;
  private colorPipelineStageOrder: string[] = [
    "linear_scene",
    "retail_ssao",
    "retail_bloom",
    "retail_postprocess",
    "raw_gamma_output"
  ];
  private ssaoRuntimeStatus:
    | "pending-perspective-camera"
    | "source-backed-retail-ssao-active"
    | "skipped-unsupported-non-perspective-camera"
    | "disabled-by-profile" = "pending-perspective-camera";
  private readonly ssaoStageOrder = [
    "opaque_scene",
    "ssao_modifier",
    "ssao_diagonal_blur_1",
    "ssao_diagonal_blur_2_multiply",
    "later_vfx_buckets"
  ];
  private dynamicContrastRuntimeEnabled = false;
  private dynamicContrastRuntimeMidpoint = 0;
  private dynamicContrastRuntimeMidpointSource =
    "dynamic contrast has not evaluated a scene";
  private dynamicContrastRuntimeStatus:
    | "static-profile-active"
    | "source-backed-scene-light-input-active"
    | "scene-area-input-unavailable"
    | "disabled-by-profile" = "disabled-by-profile";
  private dynamicContrastAreaAmbientLightCount = 0;
  private dynamicContrastAreaDiffuseLightCount = 0;
  private dynamicContrastLocalPointLightCount = 0;
  private dynamicContrastSourceBackedLocalPointLightCount = 0;
  private dynamicContrastSourceMdlLocalPointLightCount = 0;
  private dynamicContrastPlaceableTwoDaLocalPointLightCount = 0;
  private dynamicContrastPendingLocalPointLightCount = 0;
  private dynamicContrastLocalPointLightLinearContribution: [
    number,
    number,
    number
  ] = [0, 0, 0];
  private dynamicContrastLocalPointLightContributionStatus:
    | "not-required-no-visible-point-lights"
    | "source-backed-native-lightColor-alpha-projection-active"
    | "source-backed-native-lightColor-alpha-projection-active-with-unmapped-point-lights"
    | "pending-unmapped-visible-point-lights" =
    "not-required-no-visible-point-lights";
  private postprocessFogStart = 0;
  private postprocessFogEnd = 1;

  constructor(
    profile: AuroraRetailBloomProfile = AURORA_RETAIL_BLOOM_DEFAULT_PROFILE,
    postprocessProfile: AuroraRetailPostprocessProfile =
      AURORA_RETAIL_POSTPROCESS_DEFAULT_PROFILE,
    ssaoProfile: AuroraRetailSsaoProfile = AURORA_RETAIL_SSAO_DEFAULT_PROFILE
  ) {
    this.profile = Object.freeze({
      downscaleOffset: Math.max(0, Math.trunc(profile.downscaleOffset)),
      downscaleSteps: Math.min(8, Math.max(0, Math.trunc(profile.downscaleSteps))),
      threshold: profile.threshold,
      softness: profile.softness,
      multiplier: profile.multiplier
    });
    this.postprocessProfile = Object.freeze({ ...postprocessProfile });
    this.ssaoProfile = Object.freeze({ ...ssaoProfile });
    this.ssaoRuntimeStatus = this.ssaoProfile.enabled
      ? "pending-perspective-camera"
      : "disabled-by-profile";
    this.dynamicContrastRuntimeEnabled =
      this.postprocessProfile.dynamicContrastEnabled &&
      this.postprocessProfile.dynamicContrastInputMode === "static";
    this.dynamicContrastRuntimeMidpoint =
      this.postprocessProfile.dynamicContrastMidpoint;
    this.dynamicContrastRuntimeMidpointSource =
      this.postprocessProfile.dynamicContrastMidpointSource;
    this.dynamicContrastRuntimeStatus = this.postprocessProfile.dynamicContrastEnabled
      ? this.postprocessProfile.dynamicContrastInputMode === "static"
        ? "static-profile-active"
        : "scene-area-input-unavailable"
      : "disabled-by-profile";
    this.postprocessFogStart = this.postprocessProfile.fogStart;
    this.postprocessFogEnd = this.postprocessProfile.fogEnd;
    this.downscaleTargets = Array.from(
      { length: this.profile.downscaleSteps },
      () => createRenderTarget(1, 1)
    );
    this.upscaleTargets = Array.from(
      { length: Math.max(0, this.profile.downscaleSteps - 1) },
      () => createRenderTarget(1, 1)
    );
    this.sceneToGammaMaterial = createFullscreenMaterial(
      SCENE_TO_AURORA_GAMMA_FRAGMENT_SHADER,
      {
        sourceTexture: { value: null }
      }
    );
    this.ssaoModifierMaterial = createFullscreenMaterial(
      SSAO_MODIFIER_FRAGMENT_SHADER,
      {
        depthTexture: { value: null },
        pixelSize: { value: new THREE.Vector2(1, 1) },
        screenSize: { value: new THREE.Vector2(1, 1) },
        aspectRatio: { value: 1 },
        nearClip: { value: 0.1 },
        farClip: { value: 100 },
        aoIntensity: { value: this.ssaoProfile.intensity },
        fogEnabled: { value: 0 },
        fogStart: { value: 0 },
        fogInvEndMinusStart: { value: 1 }
      }
    );
    this.ssaoBlurMaterial = createFullscreenMaterial(
      SSAO_DIAGONAL_BLUR_FRAGMENT_SHADER,
      {
        sourceTexture: { value: null },
        pixelSize: { value: new THREE.Vector2(1, 1) },
        blurDirection: { value: new THREE.Vector2(1, 1) }
      }
    );
    this.ssaoApplyMaterial = createFullscreenMaterial(
      SSAO_APPLY_FRAGMENT_SHADER,
      {
        sceneTexture: { value: null },
        modifierTexture: { value: null },
        pixelSize: { value: new THREE.Vector2(1, 1) }
      }
    );
    this.thresholdMaterial = createFullscreenMaterial(THRESHOLD_FRAGMENT_SHADER, {
      sourceTexture: { value: null },
      bloomThreshold: { value: this.profile.threshold }
    });
    this.downscaleMaterial = createFullscreenMaterial(DOWNSCALE_FRAGMENT_SHADER, {
      sourceTexture: { value: null },
      pixelSize: { value: new THREE.Vector2(1, 1) },
      bloomSoftness: { value: this.profile.softness }
    });
    this.upscaleMaterial = createFullscreenMaterial(UPSCALE_FRAGMENT_SHADER, {
      smallerTexture: { value: null },
      sourceLevelTexture: { value: null },
      pixelSize: { value: new THREE.Vector2(1, 1) }
    });
    this.applyMaterial = createFullscreenMaterial(APPLY_FRAGMENT_SHADER, {
      sceneTexture: { value: null },
      bloomTexture: { value: null },
      thresholdTexture: { value: null },
      pixelSize: { value: new THREE.Vector2(1, 1) },
      bloomThreshold: { value: this.profile.threshold },
      bloomMultiplier: { value: this.profile.multiplier },
      normalizationFactor: {
        value: resolveAuroraRetailBloomNormalizationFactor(this.profile)
      }
    });
    this.postprocessMaterial = createFullscreenMaterial(POSTPROCESS_FRAGMENT_SHADER, {
      sourceTexture: { value: null },
      depthTexture: { value: null },
      pixelSize: { value: new THREE.Vector2(1, 1) },
      nearClip: { value: 0.1 },
      farClip: { value: 100 },
      perspectiveDepth: { value: 1 },
      sharpenEnabled: { value: this.postprocessProfile.sharpenEnabled ? 1 : 0 },
      dynamicContrastEnabled: {
        value: this.dynamicContrastRuntimeEnabled ? 1 : 0
      },
      dynamicContrastIntensity: {
        value: this.postprocessProfile.dynamicContrastIntensity
      },
      dynamicContrastMidpoint: {
        value: this.dynamicContrastRuntimeMidpoint
      },
      vibranceEnabled: { value: this.postprocessProfile.vibranceEnabled ? 1 : 0 },
      vibrance: { value: this.postprocessProfile.vibrance },
      fogStart: { value: this.postprocessFogStart },
      fogEnd: { value: this.postprocessFogEnd }
    });
    this.fullscreenQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.thresholdMaterial);
    this.fullscreenQuad.frustumCulled = false;
    this.fullscreenScene.add(this.fullscreenQuad);
  }

  setSize(width: number, height: number): void {
    const safeWidth = Math.max(1, Math.floor(width));
    const safeHeight = Math.max(1, Math.floor(height));
    if (safeWidth === this.width && safeHeight === this.height) return;
    this.width = safeWidth;
    this.height = safeHeight;
    this.sceneTarget.setSize(safeWidth, safeHeight);
    this.ssaoModifierTarget.setSize(safeWidth, safeHeight);
    this.ssaoBlurTarget.setSize(safeWidth, safeHeight);
    this.ssaoSceneTarget.setSize(safeWidth, safeHeight);
    this.rawGammaVfxCompositeTarget.setSize(safeWidth, safeHeight);
    this.framebufferLane5CaptureTarget.setSize(safeWidth, safeHeight);
    this.framebufferLane6CaptureTarget.setSize(safeWidth, safeHeight);
    const offsetScale = 2 ** this.profile.downscaleOffset;
    const thresholdWidth = Math.max(1, Math.floor(safeWidth / offsetScale));
    const thresholdHeight = Math.max(1, Math.floor(safeHeight / offsetScale));
    this.thresholdTarget.setSize(thresholdWidth, thresholdHeight);
    this.bloomCompositeTarget.setSize(safeWidth, safeHeight);
    this.levelSizes = resolveAuroraRetailBloomLevelSizes(
      safeWidth,
      safeHeight,
      this.profile
    );
    this.levelSizes.forEach((size, index) => {
      this.downscaleTargets[index]?.setSize(size.width, size.height);
    });
    this.upscaleTargets.forEach((target, index) => {
      const size = this.levelSizes[index] ?? { width: 1, height: 1 };
      target.setSize(size.width, size.height);
    });
  }

  render(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    updateAuroraVfxCanonicalCameraBillboards(scene, camera);
    renderer.getDrawingBufferSize(this.drawingBufferSize);
    this.setSize(this.drawingBufferSize.x, this.drawingBufferSize.y);
    const previousTarget = renderer.getRenderTarget();
    const previousAutoClear = renderer.autoClear;
    const previousScissorTest = renderer.getScissorTest();
    const previousXrEnabled = renderer.xr.enabled;
    renderer.getViewport(this.previousViewport);
    renderer.getScissor(this.previousScissor);
    renderer.autoClear = true;
    renderer.xr.enabled = false;
    renderer.setScissorTest(false);

    const rawGammaVfxPlan = collectAuroraRawGammaVfxRenderPlan(scene);
    this.rawGammaNormalVfxMeshCount = rawGammaVfxPlan.normalMeshes.length;
    this.rawGammaAdditiveVfxMeshCount = rawGammaVfxPlan.additiveMeshes.length;
    this.colorPipelineStageOrder = [...rawGammaVfxPlan.stageOrder];
    rawGammaVfxPlan.meshes.forEach((mesh) => {
      mesh.visible = false;
    });
    try {
      this.renderSceneWithAuroraFramebufferLanes(renderer, scene, camera);
    } finally {
      rawGammaVfxPlan.meshes.forEach((mesh) => {
        mesh.visible = true;
      });
    }
    const particleFogState = resolveAuroraRetailParticleFogFrameState(scene);
    const receiverSceneTexture = this.renderRetailSsao(
      renderer,
      camera,
      particleFogState
    );
    if (
      rawGammaVfxPlan.meshes.length > 0 &&
      this.sceneTarget.depthTexture &&
      this.rawGammaVfxCompositeTarget.depthTexture
    ) {
      renderer.initRenderTarget(this.rawGammaVfxCompositeTarget);
      renderer.copyTextureToTexture(
        this.sceneTarget.depthTexture,
        this.rawGammaVfxCompositeTarget.depthTexture
      );
    }
    updateAuroraVfxCanonicalParticleFrameUniforms(rawGammaVfxPlan.meshes, {
      depthTexture: this.sceneTarget.depthTexture,
      depthSource: "aurora-retail-scene-target-depth",
      depthMatchesSceneTarget: true,
      viewportWidth: this.width,
      viewportHeight: this.height,
      camera,
      fog: particleFogState
    });
    this.renderRawGammaVfxComposite(
      renderer,
      scene,
      camera,
      rawGammaVfxPlan.meshes,
      receiverSceneTexture
    );

    this.fullscreenQuad.material = this.thresholdMaterial;
    this.thresholdMaterial.uniforms.sourceTexture.value =
      this.rawGammaVfxCompositeTarget.texture;
    this.renderFullscreen(renderer, this.thresholdTarget);

    let smallerTexture: THREE.Texture = this.thresholdTarget.texture;
    this.downscaleTargets.forEach((target, index) => {
      const size = this.levelSizes[index] ?? { width: 1, height: 1 };
      this.downscaleMaterial.uniforms.sourceTexture.value = smallerTexture;
      this.downscaleMaterial.uniforms.pixelSize.value.set(1 / size.width, 1 / size.height);
      this.fullscreenQuad.material = this.downscaleMaterial;
      this.renderFullscreen(renderer, target);
      smallerTexture = target.texture;
    });

    for (let index = this.downscaleTargets.length - 2; index >= 0; index -= 1) {
      const target = this.upscaleTargets[index];
      const sourceLevel = this.downscaleTargets[index];
      const size = this.levelSizes[index];
      if (!target || !sourceLevel || !size) continue;
      this.upscaleMaterial.uniforms.smallerTexture.value = smallerTexture;
      this.upscaleMaterial.uniforms.sourceLevelTexture.value = sourceLevel.texture;
      this.upscaleMaterial.uniforms.pixelSize.value.set(1 / size.width, 1 / size.height);
      this.fullscreenQuad.material = this.upscaleMaterial;
      this.renderFullscreen(renderer, target);
      smallerTexture = target.texture;
    }

    this.applyMaterial.uniforms.sceneTexture.value =
      this.rawGammaVfxCompositeTarget.texture;
    this.applyMaterial.uniforms.bloomTexture.value = smallerTexture;
    this.applyMaterial.uniforms.thresholdTexture.value = this.thresholdTarget.texture;
    this.applyMaterial.uniforms.pixelSize.value.set(1 / this.width, 1 / this.height);
    this.fullscreenQuad.material = this.applyMaterial;
    this.renderFullscreen(renderer, this.bloomCompositeTarget);

    this.updatePostprocessRuntimeState(scene, camera);
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    const orthographicCamera = camera as THREE.OrthographicCamera;
    this.postprocessMaterial.uniforms.sourceTexture.value =
      this.bloomCompositeTarget.texture;
    this.postprocessMaterial.uniforms.depthTexture.value = this.sceneTarget.depthTexture;
    this.postprocessMaterial.uniforms.pixelSize.value.set(1 / this.width, 1 / this.height);
    const projectionCamera =
      perspectiveCamera.isPerspectiveCamera || orthographicCamera.isOrthographicCamera
        ? (camera as THREE.PerspectiveCamera | THREE.OrthographicCamera)
        : undefined;
    this.postprocessMaterial.uniforms.nearClip.value = projectionCamera?.near ?? 0.1;
    this.postprocessMaterial.uniforms.farClip.value = projectionCamera?.far ?? 100;
    this.postprocessMaterial.uniforms.perspectiveDepth.value =
      perspectiveCamera.isPerspectiveCamera ? 1 : 0;
    this.fullscreenQuad.material = this.postprocessMaterial;
    renderer.setRenderTarget(previousTarget);
    renderer.clear();
    renderer.render(this.fullscreenScene, this.fullscreenCamera);

    renderer.autoClear = previousAutoClear;
    renderer.xr.enabled = previousXrEnabled;
    renderer.setViewport(this.previousViewport);
    renderer.setScissor(this.previousScissor);
    renderer.setScissorTest(previousScissorTest);
  }

  getDiagnostics(): AuroraRetailBloomDiagnostics {
    return {
      status: "source-backed-retail-bloom-active",
      width: this.width,
      height: this.height,
      downscaleOffset: this.profile.downscaleOffset,
      downscaleSteps: this.profile.downscaleSteps,
      threshold: this.profile.threshold,
      softness: this.profile.softness,
      multiplier: this.profile.multiplier,
      normalizationFactor: resolveAuroraRetailBloomNormalizationFactor(this.profile),
      levelSizes: this.levelSizes.map((size) => ({ ...size })),
      framebufferLane5MeshCount: this.framebufferLane5MeshCount,
      framebufferLane6MeshCount: this.framebufferLane6MeshCount,
      framebufferStageOrder: [...this.framebufferStageOrder],
      rawGammaNormalVfxMeshCount: this.rawGammaNormalVfxMeshCount,
      rawGammaAdditiveVfxMeshCount: this.rawGammaAdditiveVfxMeshCount,
      colorPipelineStageOrder: [...this.colorPipelineStageOrder],
      ssaoConfiguredEnabled: this.ssaoProfile.enabled,
      ssaoRuntimeStatus: this.ssaoRuntimeStatus,
      ssaoIntensity: this.ssaoProfile.intensity,
      ssaoShaderQualityMode: this.ssaoProfile.shaderQualityMode,
      ssaoPassCount: 3,
      ssaoBlendSourceFactor: "GL_ZERO",
      ssaoBlendDestinationFactor: "GL_SRC_ALPHA",
      ssaoStageOrder: [...this.ssaoStageOrder],
      ssaoFragmentSourceSha256: this.ssaoProfile.fragmentSourceSha256,
      ssaoIncludeSourceSha256: this.ssaoProfile.includeSourceSha256,
      ssaoFramebufferSourceSha256: this.ssaoProfile.framebufferSourceSha256,
      ssaoVertexSourceSha256: this.ssaoProfile.vertexSourceSha256,
      postprocessStatus: "source-backed-retail-postprocess-active",
      colorCorrectionType: AURORA_RETAIL_COLOR_CORRECTION_TYPE,
      colorCorrectionMode: "active-retail-overflow-preserving-type-4",
      colorCorrectionConfigSourceSha256:
        AURORA_RETAIL_COLOR_CORRECTION_CONFIG_SOURCE_SHA256,
      colorCorrectionTonemapSourceSha256:
        AURORA_RETAIL_COLOR_CORRECTION_TONEMAP_SOURCE_SHA256,
      dynamicContrastConfiguredEnabled: this.postprocessProfile.dynamicContrastEnabled,
      sharpenEnabled: this.postprocessProfile.sharpenEnabled,
      dynamicContrastEnabled: this.dynamicContrastRuntimeEnabled,
      dynamicContrastInputMode: this.postprocessProfile.dynamicContrastInputMode,
      dynamicContrastRuntimeStatus: this.dynamicContrastRuntimeStatus,
      dynamicContrastIntensity: this.postprocessProfile.dynamicContrastIntensity,
      dynamicContrastMidpoint: this.dynamicContrastRuntimeMidpoint,
      dynamicContrastMidpointSource: this.dynamicContrastRuntimeMidpointSource,
      dynamicContrastAreaAmbientLightCount:
        this.dynamicContrastAreaAmbientLightCount,
      dynamicContrastAreaDiffuseLightCount:
        this.dynamicContrastAreaDiffuseLightCount,
      dynamicContrastLocalPointLightCount:
        this.dynamicContrastLocalPointLightCount,
      dynamicContrastSourceBackedLocalPointLightCount:
        this.dynamicContrastSourceBackedLocalPointLightCount,
      dynamicContrastSourceMdlLocalPointLightCount:
        this.dynamicContrastSourceMdlLocalPointLightCount,
      dynamicContrastPlaceableTwoDaLocalPointLightCount:
        this.dynamicContrastPlaceableTwoDaLocalPointLightCount,
      dynamicContrastPendingLocalPointLightCount:
        this.dynamicContrastPendingLocalPointLightCount,
      dynamicContrastLocalPointLightLinearContribution: [
        ...this.dynamicContrastLocalPointLightLinearContribution
      ],
      dynamicContrastLocalPointLightContributionStatus:
        this.dynamicContrastLocalPointLightContributionStatus,
      vibranceEnabled: this.postprocessProfile.vibranceEnabled,
      vibrance: this.postprocessProfile.vibrance,
      fogStart: this.postprocessFogStart,
      fogEnd: this.postprocessFogEnd
    };
  }

  readFrameEnergyDiagnostics(
    renderer: THREE.WebGLRenderer
  ): AuroraRetailBloomFrameEnergyDiagnostics {
    const stages = [
      ["linear-scene", this.sceneTarget],
      ["raw-gamma-vfx-composite", this.rawGammaVfxCompositeTarget],
      ["threshold", this.thresholdTarget],
      ["bloom-composite", this.bloomCompositeTarget]
    ].map(([stage, target]) =>
      readAuroraRetailBloomTargetEnergy(
        renderer,
        stage as AuroraRetailBloomStageEnergyDiagnostics["stage"],
        target as THREE.WebGLRenderTarget,
        this.profile.threshold
      )
    );
    return {
      status: stages.every((stage) => stage.status === "readback-complete")
        ? "readback-complete"
        : "readback-failed",
      stages
    };
  }

  dispose(): void {
    this.sceneTarget.dispose();
    this.ssaoModifierTarget.dispose();
    this.ssaoBlurTarget.dispose();
    this.ssaoSceneTarget.dispose();
    this.rawGammaVfxCompositeTarget.dispose();
    this.framebufferLane5CaptureTarget.dispose();
    this.framebufferLane6CaptureTarget.dispose();
    this.thresholdTarget.dispose();
    this.bloomCompositeTarget.dispose();
    this.downscaleTargets.forEach((target) => target.dispose());
    this.upscaleTargets.forEach((target) => target.dispose());
    this.sceneToGammaMaterial.dispose();
    this.ssaoModifierMaterial.dispose();
    this.ssaoBlurMaterial.dispose();
    this.ssaoApplyMaterial.dispose();
    this.thresholdMaterial.dispose();
    this.downscaleMaterial.dispose();
    this.upscaleMaterial.dispose();
    this.applyMaterial.dispose();
    this.postprocessMaterial.dispose();
    this.fullscreenQuad.geometry.dispose();
  }

  private renderFullscreen(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget
  ): void {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.fullscreenScene, this.fullscreenCamera);
  }

  private updatePostprocessRuntimeState(
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.postprocessProfile.dynamicContrastEnabled) {
      this.dynamicContrastRuntimeEnabled = false;
      this.dynamicContrastRuntimeStatus = "disabled-by-profile";
      this.postprocessMaterial.uniforms.dynamicContrastEnabled.value = 0;
      return;
    }
    if (this.postprocessProfile.dynamicContrastInputMode === "static") {
      this.dynamicContrastRuntimeEnabled = true;
      this.dynamicContrastRuntimeMidpoint =
        this.postprocessProfile.dynamicContrastMidpoint;
      this.dynamicContrastRuntimeMidpointSource =
        this.postprocessProfile.dynamicContrastMidpointSource;
      this.dynamicContrastRuntimeStatus = "static-profile-active";
      this.postprocessFogStart = this.postprocessProfile.fogStart;
      this.postprocessFogEnd = this.postprocessProfile.fogEnd;
    } else {
      const sceneState = resolveAuroraRetailDynamicContrastSceneState(
        scene,
        camera,
        this.postprocessProfile.dynamicContrastMidpoint
      );
      this.dynamicContrastRuntimeEnabled =
        sceneState.status === "source-backed-scene-light-input-active";
      this.dynamicContrastRuntimeMidpoint = sceneState.midpoint;
      this.dynamicContrastRuntimeMidpointSource = sceneState.midpointSource;
      this.dynamicContrastRuntimeStatus = sceneState.status;
      this.dynamicContrastAreaAmbientLightCount =
        sceneState.areaAmbientLightCount;
      this.dynamicContrastAreaDiffuseLightCount =
        sceneState.areaDiffuseLightCount;
      this.dynamicContrastLocalPointLightCount = sceneState.localPointLightCount;
      this.dynamicContrastSourceBackedLocalPointLightCount =
        sceneState.sourceBackedLocalPointLightCount;
      this.dynamicContrastSourceMdlLocalPointLightCount =
        sceneState.sourceMdlLocalPointLightCount;
      this.dynamicContrastPlaceableTwoDaLocalPointLightCount =
        sceneState.placeableTwoDaLocalPointLightCount;
      this.dynamicContrastPendingLocalPointLightCount =
        sceneState.pendingLocalPointLightCount;
      this.dynamicContrastLocalPointLightLinearContribution = [
        ...sceneState.localPointLightLinearContribution
      ];
      this.dynamicContrastLocalPointLightContributionStatus =
        sceneState.localPointLightContributionStatus;
      this.postprocessFogStart = sceneState.fogStart;
      this.postprocessFogEnd = sceneState.fogEnd;
    }
    this.postprocessMaterial.uniforms.dynamicContrastEnabled.value =
      this.dynamicContrastRuntimeEnabled ? 1 : 0;
    this.postprocessMaterial.uniforms.dynamicContrastMidpoint.value =
      this.dynamicContrastRuntimeMidpoint;
    this.postprocessMaterial.uniforms.fogStart.value = this.postprocessFogStart;
    this.postprocessMaterial.uniforms.fogEnd.value = this.postprocessFogEnd;
  }

  private renderRetailSsao(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera,
    fogState: ReturnType<typeof resolveAuroraRetailParticleFogFrameState>
  ): THREE.Texture {
    if (!this.ssaoProfile.enabled) {
      this.ssaoRuntimeStatus = "disabled-by-profile";
      return this.sceneTarget.texture;
    }
    const perspectiveCamera = camera as THREE.PerspectiveCamera;
    if (!perspectiveCamera.isPerspectiveCamera) {
      this.ssaoRuntimeStatus = "skipped-unsupported-non-perspective-camera";
      return this.sceneTarget.texture;
    }

    this.ssaoRuntimeStatus = "source-backed-retail-ssao-active";
    this.ssaoModifierMaterial.uniforms.depthTexture.value =
      this.sceneTarget.depthTexture;
    this.ssaoModifierMaterial.uniforms.pixelSize.value.set(
      1 / this.width,
      1 / this.height
    );
    this.ssaoModifierMaterial.uniforms.screenSize.value.set(
      this.width,
      this.height
    );
    this.ssaoModifierMaterial.uniforms.aspectRatio.value =
      this.width / this.height;
    this.ssaoModifierMaterial.uniforms.nearClip.value = perspectiveCamera.near;
    this.ssaoModifierMaterial.uniforms.farClip.value = perspectiveCamera.far;
    this.ssaoModifierMaterial.uniforms.aoIntensity.value =
      this.ssaoProfile.intensity;
    this.ssaoModifierMaterial.uniforms.fogEnabled.value = fogState.enabled ? 1 : 0;
    this.ssaoModifierMaterial.uniforms.fogStart.value = fogState.start;
    this.ssaoModifierMaterial.uniforms.fogInvEndMinusStart.value = fogState.enabled
      ? 1 / (fogState.end - fogState.start)
      : 1;
    this.fullscreenQuad.material = this.ssaoModifierMaterial;
    this.renderFullscreen(renderer, this.ssaoModifierTarget);

    this.ssaoBlurMaterial.uniforms.sourceTexture.value =
      this.ssaoModifierTarget.texture;
    this.ssaoBlurMaterial.uniforms.pixelSize.value.set(
      1 / this.width,
      1 / this.height
    );
    this.ssaoBlurMaterial.uniforms.blurDirection.value.set(1, 1);
    this.fullscreenQuad.material = this.ssaoBlurMaterial;
    this.renderFullscreen(renderer, this.ssaoBlurTarget);

    this.ssaoApplyMaterial.uniforms.sceneTexture.value = this.sceneTarget.texture;
    this.ssaoApplyMaterial.uniforms.modifierTexture.value =
      this.ssaoBlurTarget.texture;
    this.ssaoApplyMaterial.uniforms.pixelSize.value.set(
      1 / this.width,
      1 / this.height
    );
    this.fullscreenQuad.material = this.ssaoApplyMaterial;
    this.renderFullscreen(renderer, this.ssaoSceneTarget);
    return this.ssaoSceneTarget.texture;
  }

  private renderRawGammaVfxComposite(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    meshes: readonly THREE.Mesh[],
    receiverSceneTexture: THREE.Texture
  ): void {
    const rawGammaMeshes = new Set<THREE.Object3D>(meshes);
    const hiddenRenderables: THREE.Object3D[] = [];
    const previousBackground = scene.background;
    const previousClearColor = renderer.getClearColor(new THREE.Color()).clone();
    const previousClearAlpha = renderer.getClearAlpha();
    const previousAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    try {
      this.fullscreenQuad.material = this.sceneToGammaMaterial;
      this.sceneToGammaMaterial.uniforms.sourceTexture.value =
        receiverSceneTexture;
      renderer.setRenderTarget(this.rawGammaVfxCompositeTarget);
      renderer.clear(true, false, false);
      renderer.render(this.fullscreenScene, this.fullscreenCamera);
      if (meshes.length === 0) return;

      scene.traverseVisible((object) => {
        if (rawGammaMeshes.has(object) || !isThreeRenderableObject(object)) return;
        hiddenRenderables.push(object);
        object.visible = false;
      });
      scene.background = null;
      renderer.render(scene, camera);
    } finally {
      hiddenRenderables.forEach((object) => {
        object.visible = true;
      });
      scene.background = previousBackground;
      renderer.setClearColor(previousClearColor, previousClearAlpha);
      renderer.autoClear = previousAutoClear;
    }
  }

  private renderSceneWithAuroraFramebufferLanes(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    const plan = collectAuroraMtrFramebufferRenderPlan(scene);
    const laneObjects = [...plan.lane5, ...plan.lane6];
    const previousSceneCurrentFrame = scene.userData.auroraMtrSceneCurrentFrame;
    scene.userData.auroraMtrSceneCurrentFrame = renderer.info.render.frame;
    this.framebufferLane5MeshCount = plan.lane5.length;
    this.framebufferLane6MeshCount = plan.lane6.length;
    this.framebufferStageOrder = [...plan.stageOrder];

    laneObjects.forEach((object) => {
      object.visible = false;
    });
    try {
      if (plan.lane5.length > 0) {
        this.renderScene(renderer, scene, camera, this.framebufferLane5CaptureTarget);
        plan.lane5.forEach((object) => {
          bindAuroraMtrFramebufferTextures(
            object,
            this.framebufferLane5CaptureTarget.texture,
            this.framebufferLane5CaptureTarget.depthTexture!
          );
          object.visible = true;
        });
      }

      if (plan.lane6.length > 0) {
        const lane6SourceTarget = this.framebufferLane6CaptureTarget;
        this.renderScene(renderer, scene, camera, lane6SourceTarget);
        plan.lane6.forEach((object) => {
          bindAuroraMtrFramebufferTextures(
            object,
            lane6SourceTarget.texture,
            lane6SourceTarget.depthTexture!
          );
          object.visible = true;
        });
      }

      this.renderScene(renderer, scene, camera, this.sceneTarget);
    } finally {
      laneObjects.forEach((object) => {
        object.visible = true;
      });
      if (previousSceneCurrentFrame === undefined) {
        delete scene.userData.auroraMtrSceneCurrentFrame;
      } else {
        scene.userData.auroraMtrSceneCurrentFrame = previousSceneCurrentFrame;
      }
    }
  }

  private renderScene(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    target: THREE.WebGLRenderTarget
  ): void {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(scene, camera);
  }
}

function readAuroraRetailBloomTargetEnergy(
  renderer: THREE.WebGLRenderer,
  stage: AuroraRetailBloomStageEnergyDiagnostics["stage"],
  target: THREE.WebGLRenderTarget,
  bloomThreshold: number
): AuroraRetailBloomStageEnergyDiagnostics {
  const width = Math.max(1, Math.floor(target.width));
  const height = Math.max(1, Math.floor(target.height));
  const pixelCount = width * height;
  const output = new Uint16Array(pixelCount * 4);
  try {
    renderer.readRenderTargetPixels(target, 0, 0, width, height, output);
  } catch (error) {
    return {
      stage,
      status: "readback-failed",
      width,
      height,
      pixelCount,
      finiteRgbSampleCount: 0,
      maximumRgb: [0, 0, 0],
      maximumChannel: 0,
      meanRgb: [0, 0, 0],
      nonZeroPixelCount: 0,
      pixelsAboveBloomThreshold: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }

  const maximumRgb: [number, number, number] = [0, 0, 0];
  const totalRgb: [number, number, number] = [0, 0, 0];
  let finiteRgbSampleCount = 0;
  let nonZeroPixelCount = 0;
  let pixelsAboveBloomThreshold = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const offset = pixel * 4;
    const rgb: [number, number, number] = [
      THREE.DataUtils.fromHalfFloat(output[offset] ?? 0),
      THREE.DataUtils.fromHalfFloat(output[offset + 1] ?? 0),
      THREE.DataUtils.fromHalfFloat(output[offset + 2] ?? 0)
    ];
    if (!rgb.every(Number.isFinite)) continue;
    finiteRgbSampleCount += 3;
    const maximumChannel = Math.max(rgb[0], rgb[1], rgb[2]);
    if (maximumChannel !== 0) nonZeroPixelCount += 1;
    if (maximumChannel > bloomThreshold) pixelsAboveBloomThreshold += 1;
    for (let channel = 0; channel < 3; channel += 1) {
      const value = rgb[channel] ?? 0;
      maximumRgb[channel] = Math.max(maximumRgb[channel], value);
      totalRgb[channel] += value;
    }
  }
  const finitePixelCount = finiteRgbSampleCount / 3;
  return {
    stage,
    status: "readback-complete",
    width,
    height,
    pixelCount,
    finiteRgbSampleCount,
    maximumRgb,
    maximumChannel: Math.max(...maximumRgb),
    meanRgb: finitePixelCount > 0
      ? totalRgb.map((value) => value / finitePixelCount) as [number, number, number]
      : [0, 0, 0],
    nonZeroPixelCount,
    pixelsAboveBloomThreshold
  };
}

function isThreeRenderableObject(object: THREE.Object3D): boolean {
  return (
    object instanceof THREE.Mesh ||
    object instanceof THREE.Line ||
    object instanceof THREE.Points ||
    object instanceof THREE.Sprite
  );
}
