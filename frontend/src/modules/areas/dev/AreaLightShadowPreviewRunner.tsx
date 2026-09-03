import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  probeBackendHealth,
  type BackendRuntimeBuildIdentity
} from "../../auth/adapters/httpBackendAuthFacade";
import { HttpAreaApiPort } from "../adapters/httpAreaApiPort";
import { mapBackendAreaToScene } from "../application/areaSceneMapper";
import {
  applyPlaceableAssetRequestHeaders,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  readRuntimeAuroraVfxCanonicalPlaybackState,
  renderRuntime,
  renderRuntimeWithoutPostprocess,
  resizeRuntime,
  seekRuntimeAuroraVfxCanonicalPlaybacks
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildTerrainMesh } from "../../layout/adapters/three/workspaceTerrainMesh";
import {
  rebuildObjectMeshes,
  writePlaceableTwoDaLightRenderDiagnostics
} from "../../layout/adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../../layout/adapters/three/workspaceSceneLightDiagnostics";
import { resolveAuroraAreaRenderTileHeight } from "../../layout/adapters/three/workspaceAreaRenderCoordinates";
import {
  applyAuroraPlaceableLightingProofProfile,
  collectAuroraPlaceableLightingProofSceneFacts
} from "../../layout/adapters/three/auroraPlaceableLightingProofAdapter";
import {
  evaluateAuroraPlaceableLightingProof,
  resolveAuroraPlaceableLightingProofProfile,
  type AuroraPlaceableLightingPointLightSpatialSample,
  type AuroraPlaceableLightingProofProfile,
  type AuroraPlaceableLightingProofSnapshot
} from "../../layout/application/auroraPlaceableLightingProof";
import { createDefaultToolbarState } from "../../layout/roleTopbarPolicy";
import { HttpTileApiPort } from "../../tiles/adapters/httpTileApiPort";
import { HttpPlaceableApiPort } from "../../placeables/adapters/httpPlaceableApiPort";
import type { PlaceableApiProcessPayload } from "../../placeables/contracts";
import {
  fetchPlaceableViewportRenderPayloadBatch,
  type PlaceableViewportRenderPayload
} from "../../placeables/application/placeableRenderPayloadResolver";
import {
  buildCatalogVfxExpectedRuntimeAssets,
  recordCatalogVfxRuntimeBindings,
  rewriteCatalogVfxPreviewPayloadDeliveryUrls
} from "../../vfx/dev/CatalogVfxPreviewRunner";
import {
  createVfxRuntimeObservabilityReport,
  registerVfxRuntimeExpectedAssets
} from "../../vfx/application/vfxRuntimeObservability";
import { resolvePlaceableRenderPayloadLookup } from "../../layout/application/workspacePlaceableRenderContracts";
import type { DebugState } from "../../layout/application/workspaceSceneInteraction";
import {
  LEGACY_SEED_SCENE_HEIGHT_TILES,
  LEGACY_SEED_SCENE_WIDTH_TILES,
  normalizeSceneObjectMetadata
} from "../../scene/domain/sceneFactory";
import type { AreaApiProcessedArea, AreaApiProcessOptions } from "../contracts";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import {
  resolveAreaTileProcessContractReadiness,
  type AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";

const AREA_LIGHT_SHADOW_PREVIEW_PATH = "/dev/area-light-shadow-preview";
const DEFAULT_AREA_ID = "area__winds_study";
const DEFAULT_API_BASE_URL = "http://127.0.0.1:3000/api/v1";
const DEFAULT_USERNAME = "builder.user";
const DEFAULT_PASSWORD = "builder123";
const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 540;
const CAMPFIRE_PROOF_OBJECT_ID = "aurora-web-proof:plc_plc_i06";
const CAMPFIRE_PROOF_TEMPLATE_ID = "plc_plc_i06";
const CAMPFIRE_PROOF_RES_REF = "plc_i06";
const CAMPFIRE_PROOF_RETAIL_RES_REF = "plc_campfr";
// Retail placeables.2da row 58 (Campfr) resolves to plc_i06. Supplying the
// instance appearance is required so the backend's Area render path admits
// on-demand MDL -> GLB generation instead of returning a source-only package.
export const CAMPFIRE_PROOF_APPEARANCE_TYPE = 58;
const DEFAULT_AREA_SOUND_UNITS_PER_TILE = 10;
export const ALS_ORACLE_CAMPFIRE_FIXTURE_ID = "als-oracle-campfire-v1";
const ALS_ORACLE_AREA_ID = "area__als_light_lab_oracle";
const ALS_ORACLE_MODULE_SHA256 =
  "29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604";
const ALS_ORACLE_ARE_SHA256 =
  "f550902c496a0eba85877d3dc27d40fd1015b001015b1e7a3c43a54214d64c1c";
const ALS_ORACLE_GIT_SHA256 =
  "0202de0642a6670adfb4e10f9b5d635f77765736f53a0e2fd8df972f7c549a01";
const ALS_ORACLE_GIC_SHA256 =
  "20b5f2935ab06c9b974b154423a98830d1513d17ac049abd6a943b0d07728f89";
export const ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256 =
  "144d84a94f1039e1031ea6949098c0106ac81f96794df308853a28dd757d1db4";
const ALS_ORACLE_CAMPFIRE_SOURCE_MDL_OBJECT_KEY_SUFFIX =
  "/__aurora/sources/vanilla/models/plc_i06.mdl";
const ALS_ORACLE_CAMPFIRE_LIGHT_PROJECTION = {
  role: "placeables-2da-point-light",
  sourceLightColorRow: 6,
  sourceColor: [1.9, 1.9, 1] as const,
  adjustedColor: [1, 1, 0.526316] as const,
  sourceRadius: 10,
  sourceUnitScale: 0.1,
  sourceRadiusWorld: 1,
  sourceOffset: [0.240711, 0.011001, 0.194654] as const,
  mappedOffset: [0.024071, 0.019465, 0.0011] as const,
  offsetScale: 0.1,
  effectiveRange: 3.8,
  intensity: 1,
  decay: 1.25,
  falloffMode: "enhanced-performance",
  falloffProofStatus:
    "retail-binary-and-shader-backed-enhanced-performance-point-light-falloff"
} as const;
const ALS_ORACLE_TILESET_RESREF = "tin01";
const ALS_ORACLE_TILE_MODEL_RESREF = "tin01_d11_01";
const ALS_ORACLE_TILE_IMAGE_MAP = "miin01_d11";
export const ALS_ORACLE_TILE_SOURCE_MDL_SHA256 =
  "08c7810e8faf1ba4d4730cf14c8fb2737cf5f695e02e3d4f38d0e51f086da44d";
export const ALS_ORACLE_TILE_MODEL_ASSET_SHA256 =
  "0c8a58aa3f6643f09dfe888ce82cf82da25cfb2a184b31ad534b0e7425161cd1";
export const ALS_ORACLE_TILE_TEXTURE_SHA256 =
  "dae40e6294f63ac13ced7de4e138b32c57ef99357a291f2664178ed8a8ed7eb7";
const ALS_ORACLE_TILE_SOURCE_MDL_OBJECT_KEY_SUFFIX =
  "/__aurora/sources/vanilla/models/tin01_d11_01.mdl";
const ALS_ORACLE_TILE_MODEL_ASSET_OBJECT_KEY_SUFFIX =
  "/__aurora/derived/models/aurora-mdl-to-glb_v18-source-proven-texture-aliases/tin01_d11_01.glb";
const ALS_ORACLE_TILE_TEXTURE_REFERENCE = "tin01_shpflr1";
const ALS_ORACLE_TILE_TEXTURE_OBJECT_KEY_SUFFIX =
  "/__aurora/sources/vanilla/textures/tin01_shpflr1.dds";
const ALS_ORACLE_AREA_SIZE = 12;
const ALS_ORACLE_CAMPFIRE_TILE_POSITION = 6.5;

type AreaLightShadowOracleFixture = "" | typeof ALS_ORACLE_CAMPFIRE_FIXTURE_ID;

declare global {
  interface Window {
    __auroraAreaVfxPreviewBeginDeterministicCapture?: () => boolean;
    __auroraAreaVfxPreviewRenderAtTime?: (elapsedSeconds: number) => unknown;
    __auroraAreaVfxPreviewForceRender?: () => boolean;
    __auroraAreaVfxPreviewSetParticleDepthTest?: (enabled: boolean) => unknown;
    __auroraAreaVfxPreviewGetCompositionSpatialDiagnostics?: () => unknown;
    __auroraAreaVfxPreviewGetPostprocessDiagnostics?: () => unknown;
    __auroraAreaVfxPreviewGetRuntimeObservability?: () => ReturnType<
      typeof createVfxRuntimeObservabilityReport
    >;
    __auroraAreaPlaceableLightingGetProofSnapshot?: () => AuroraPlaceableLightingProofSnapshot;
  }
}

type RunnerStatus = "loading" | "ready" | "error" | "skipped-test";

interface AreaLightShadowPreviewRequest {
  areaId: string;
  apiBaseUrl: string;
  username: string;
  password: string;
  displayFog: boolean;
  useAreaLighting: boolean;
  tileProcess: boolean;
  renderObjects: boolean;
  includeAreaObjects: boolean;
  injectCampfire: boolean;
  highlightInjectedCampfire: boolean;
  fullViewport: boolean;
  canvasWidth: number;
  canvasHeight: number;
  campfireX: number | null;
  campfireY: number | null;
  campfireZ: number | null;
  objectResRefFilter: string;
  captureTimeSeconds: number | null;
  focusRenderedObjects: boolean;
  renderTerrain: boolean;
  cameraDistanceScale: number;
  cameraAzimuthDegrees: number;
  proofBackdrop: "default" | "neutral" | "warm-dark";
  lightingProofProfile: AuroraPlaceableLightingProofProfile;
  oracleFixture: AreaLightShadowOracleFixture;
}

interface AreaLightShadowPreviewSnapshot {
  status: RunnerStatus;
  error: string;
  areaId: string;
  areaName: string;
  apiBaseUrl: string;
  displayFog: boolean;
  useAreaLighting: boolean;
  tileProcess: boolean;
  renderObjects: boolean;
  includeAreaObjects: boolean;
  injectCampfire: boolean;
  highlightInjectedCampfire: boolean;
  fullViewport: boolean;
  canvasWidth: number;
  canvasHeight: number;
  tileProcessStatus: string;
  tileProcessReadyCount: number;
  tileProcessBlockedCount: number;
  tileProcessBlockers: string;
  tileProcessError: string;
  cacheHit: boolean | null;
  tileCount: number;
  objectCount: number;
  renderObjectCount: number;
  renderTerrain: boolean;
  cameraDistanceScale: number;
  cameraAzimuthDegrees: number;
  proofBackdrop: string;
  placeableLightingProofProfile: AuroraPlaceableLightingProofProfile;
  placeableLightingProof: AuroraPlaceableLightingProofSnapshot | null;
  placeableSourceLineageStatus: "pass" | "blocked" | "not-required";
  placeableSourceModelObjectKeys: string[];
  placeableSourceModelHashes: string[];
  placeableSourceLineageBlockers: string[];
  placeableLightProjectionStatus: "pass" | "blocked" | "not-required";
  placeableLightProjectionBlockers: string[];
  terrainSourceLineageStatus: "pass" | "blocked" | "not-required";
  terrainSourceModelObjectKeys: string[];
  terrainSourceModelHashes: string[];
  terrainModelAssetObjectKeys: string[];
  terrainModelAssetHashes: string[];
  terrainTextureObjectKeys: string[];
  terrainTextureHashes: string[];
  terrainSourceLineageBlockers: string[];
  objectResRefFilter: string;
  captureTimeSeconds: number | null;
  vfxPlaybackRootCount: number;
  vfxPlaybackFrameCount: number;
  vfxPlaybackDurationSeconds: number;
  vfxPlaybackCompleted: boolean;
  vfxVisibleDrawMeshCount: number;
  vfxVisibleDrawParticleCount: number;
  vfxVisibleTextureReferences: string[];
  vfxVisibleDrawBoundsCenter: number[];
  vfxVisibleDrawBoundsSize: number[];
  vfxVisibleDrawMeshSamples: Array<Record<string, unknown>>;
  vfxRuntimeObservability: ReturnType<
    typeof createVfxRuntimeObservabilityReport
  > | null;
  renderedObjectSamples: Array<Record<string, unknown>>;
  injectedCampfireObjectId: string;
  injectedCampfireTemplateId: string;
  injectedCampfireResRef: string;
  injectedCampfireRetailResRef: string;
  injectedCampfirePosition: number[];
  placeableRenderPayloadStatus: string;
  placeableRenderPayloadCount: number;
  placeableRenderPayloadError: string;
  placeableTwoDaLightStatus: string;
  placeableTwoDaLightSourceCount: number;
  placeableTwoDaLightPointLightCount: number;
  placeableTwoDaLightHaloCount: number;
  placeableTwoDaLightCoreCount: number;
  placeableTwoDaLightReceiverCount: number;
  placeableTwoDaLightFastShadowCount: number;
  placeableTwoDaLightDisabledCount: number;
  placeableTwoDaLightDisabledByLightStateCount: number;
  placeableTwoDaLightDisabledByUseAreaLightingCount: number;
  placeableTwoDaLightSamples: string[];
  placeableModelStatus: string;
  placeableModelMeshCount: number;
  placeableModelUrl: string;
  placeableModelTextureStatus: string;
  placeableModelTextureCount: number;
  placeableModelTextureLoaded: number;
  placeableModelTextureSource: string;
  placeableModelTextureSettled: boolean;
  areaGlobalLightingStatus: string;
  areaGlobalLightingPhase: string;
  areaGlobalLightingFields: string;
  areaGlobalShadowOpacity: string;
  areaGlobalShadowOpacityFactor: string;
  areaGlobalShadowStatus: string;
  areaGlobalShadowSourceField: string;
  sceneShadowProofStatus: string;
  sceneShadowRetailProjectionStatus: string;
  sceneShadowPointLightCastShadowCount: number;
  sceneShadowPointLightSamples: string[];
  sceneShadowItemPropertyLightShadowPolicyCount: number;
  sceneShadowItemPropertyLightShadowPolicySamples: string[];
  sceneShadowDirectionalLightCastShadowCount: number;
  sceneShadowDirectionalLightSamples: string[];
  sceneShadowProgFxType4ShadowRequestCount: number;
  sceneShadowProgFxType4ShadowRequestSamples: string[];
  sceneShadowAreaStatus: string;
  sceneShadowAreaSourceField: string;
  sceneShadowAreaOpacity: string;
  sceneShadowAreaOpacityFactor: string;
  terrainRuntimeStatus: string;
  terrainLoaderBlockers: string;
  terrainTileModelBlockedCount: number;
  terrainTileModelDeliveryUrlSample: string;
  terrainTileModelLoaderErrorSample: string;
  terrainTileModelBlockedTileSample: string;
  terrainAreaId: string;
  terrainTileModelLoadedCount: number;
  terrainTileModelVisibleMeshCount: number;
  terrainTileModelMaterialMapCount: number;
  terrainTileModelVisibleMeshSample: string;
  terrainTileShadowReceiverMeshCount: number;
  terrainTileShadowReceiverStatus: string;
  terrainTileShadowReceiverSource: string;
  terrainTileShadowReceiverSample: string;
  cameraPosition: number[];
  oracleFixture: AreaLightShadowOracleFixture;
}

export interface AreaLightShadowPreviewPlaceableSourceLineage {
  status: "pass" | "blocked" | "not-required";
  sourceModelObjectKeys: string[];
  sourceModelHashes: string[];
  blockerCodes: string[];
}

export interface AreaLightShadowPreviewPlaceableLightProjection {
  status: "pass" | "blocked" | "not-required";
  blockerCodes: string[];
  observedSamples: readonly AuroraPlaceableLightingPointLightSpatialSample[];
}

export interface AreaLightShadowPreviewTerrainSourceLineage {
  status: "pass" | "blocked" | "not-required";
  sourceModelObjectKeys: string[];
  sourceModelHashes: string[];
  modelAssetObjectKeys: string[];
  modelAssetHashes: string[];
  textureObjectKeys: string[];
  textureHashes: string[];
  blockerCodes: string[];
}

export function evaluateAreaLightShadowPreviewTerrainSourceLineage(
  readiness: AreaTileProcessContractReadiness | null | undefined,
  oracleFixture: AreaLightShadowOracleFixture
): AreaLightShadowPreviewTerrainSourceLineage {
  const entries = readiness?.entries ?? [];
  const uniqueSorted = (values: Array<string | undefined>): string[] =>
    [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))]
      .sort((left, right) => left.localeCompare(right));
  const sourceModelObjectKeys = uniqueSorted(entries.map((entry) => entry.sourceObjectKey));
  const sourceModelHashes = uniqueSorted(entries.map((entry) => entry.mdlSourceContentSha256));
  const modelAssetObjectKeys = uniqueSorted(entries.map((entry) => entry.modelAssetObjectKey));
  const modelAssetHashes = uniqueSorted(entries.map((entry) => entry.modelAssetContentSha256));
  const textureAssets = entries.flatMap((entry) => entry.materialTextureAssets ?? []);
  const expectedTextures = textureAssets.filter(
    (asset) =>
      asset.reference.toLowerCase() === ALS_ORACLE_TILE_TEXTURE_REFERENCE &&
      asset.resref.toLowerCase() === ALS_ORACLE_TILE_TEXTURE_REFERENCE
  );
  const textureObjectKeys = uniqueSorted(expectedTextures.map((asset) => asset.objectKey));
  const textureHashes = uniqueSorted(expectedTextures.map((asset) => asset.contentSha256));

  const result = (status: AreaLightShadowPreviewTerrainSourceLineage["status"], blockerCodes: string[]) => ({
    status,
    sourceModelObjectKeys,
    sourceModelHashes,
    modelAssetObjectKeys,
    modelAssetHashes,
    textureObjectKeys,
    textureHashes,
    blockerCodes
  });
  if (oracleFixture !== ALS_ORACLE_CAMPFIRE_FIXTURE_ID) {
    return result("not-required", []);
  }

  const blockerCodes: string[] = [];
  if (!readiness) blockerCodes.push("ALS_ORACLE_TERRAIN_READINESS_MISSING");
  if (readiness?.status !== "ready") blockerCodes.push("ALS_ORACLE_TERRAIN_READINESS_NOT_READY");
  if (entries.length !== 1) blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ENTRY_COUNT_MISMATCH");
  const entry = entries[0];
  if (entry?.modelResRef.toLowerCase() !== ALS_ORACLE_TILE_MODEL_RESREF) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_RESREF_MISMATCH");
  }
  if (entry?.status !== "ready") blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ENTRY_NOT_READY");

  if (sourceModelObjectKeys.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_SOURCE_MDL_OBJECT_KEY_MISSING_OR_AMBIGUOUS");
  } else if (!normalizeProofObjectKey(sourceModelObjectKeys[0]).endsWith(ALS_ORACLE_TILE_SOURCE_MDL_OBJECT_KEY_SUFFIX)) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_SOURCE_MDL_OBJECT_KEY_MISMATCH");
  }
  if (sourceModelHashes.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_SOURCE_MDL_HASH_MISSING_OR_AMBIGUOUS");
  } else if (sourceModelHashes[0] !== ALS_ORACLE_TILE_SOURCE_MDL_SHA256) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_SOURCE_MDL_HASH_MISMATCH");
  }
  if (modelAssetObjectKeys.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ASSET_OBJECT_KEY_MISSING_OR_AMBIGUOUS");
  } else if (!normalizeProofObjectKey(modelAssetObjectKeys[0]).endsWith(ALS_ORACLE_TILE_MODEL_ASSET_OBJECT_KEY_SUFFIX)) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ASSET_OBJECT_KEY_MISMATCH");
  }
  if (modelAssetHashes.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ASSET_HASH_MISSING_OR_AMBIGUOUS");
  } else if (modelAssetHashes[0] !== ALS_ORACLE_TILE_MODEL_ASSET_SHA256) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_MODEL_ASSET_HASH_MISMATCH");
  }

  if (expectedTextures.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_MISSING_OR_AMBIGUOUS");
  }
  const texture = expectedTextures[0];
  if (texture && texture.source !== "vanilla") {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_SOURCE_MISMATCH");
  }
  if (texture && texture.extension.toLowerCase() !== "dds") {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_EXTENSION_MISMATCH");
  }
  if (
    textureObjectKeys.length === 1 &&
    !normalizeProofObjectKey(textureObjectKeys[0]).endsWith(ALS_ORACLE_TILE_TEXTURE_OBJECT_KEY_SUFFIX)
  ) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_OBJECT_KEY_MISMATCH");
  }
  if (textureHashes.length !== 1) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_HASH_MISSING_OR_AMBIGUOUS");
  } else if (textureHashes[0] !== ALS_ORACLE_TILE_TEXTURE_SHA256) {
    blockerCodes.push("ALS_ORACLE_TERRAIN_TEXTURE_HASH_MISMATCH");
  }

  return result(blockerCodes.length === 0 ? "pass" : "blocked", blockerCodes);
}

function normalizeProofObjectKey(value: string): string {
  return value.replaceAll("\\", "/").toLowerCase();
}

export function applyAreaLightShadowPreviewPlaceableFreshnessPolicy(
  payload: PlaceableApiProcessPayload,
  oracleFixture: AreaLightShadowOracleFixture
): PlaceableApiProcessPayload {
  return oracleFixture === ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    ? { ...payload, bypassCache: true }
    : payload;
}

export function applyAreaLightShadowPreviewAreaFreshnessPolicy(
  options: AreaApiProcessOptions,
  oracleFixture: AreaLightShadowOracleFixture
): AreaApiProcessOptions {
  return oracleFixture === ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    ? { ...options, bypassCache: true }
    : options;
}

export function evaluateAreaLightShadowPreviewPlaceableSourceLineage(
  payload: Pick<PlaceableViewportRenderPayload, "renderPackage" | "placeable"> | null | undefined,
  oracleFixture: AreaLightShadowOracleFixture
): AreaLightShadowPreviewPlaceableSourceLineage {
  const renderPackage = payload?.renderPackage ?? payload?.placeable.renderPackage;
  const sourceNodes = [
    ...(renderPackage?.auroraEmitter?.emitters ?? []),
    ...(renderPackage?.auroraLight?.lights ?? []),
    ...(renderPackage?.auroraModelGraph?.staticGeometryNodes ?? []),
    ...(renderPackage?.auroraModelGraph?.nodes ?? []),
    ...(renderPackage?.auroraModelGraph?.animationEvents ?? [])
  ];
  const sourceModelObjectKeys = [
    ...new Set(
      sourceNodes
        .map((node) => node.sourceModelObjectKey?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ].sort((left, right) => left.localeCompare(right));
  const sourceModelHashes = [
    ...new Set(
      sourceNodes
        .map((node) => node.sourceModelHash?.trim())
        .filter((value): value is string => Boolean(value))
    )
  ].sort((left, right) => left.localeCompare(right));

  if (oracleFixture !== ALS_ORACLE_CAMPFIRE_FIXTURE_ID) {
    return {
      status: "not-required",
      sourceModelObjectKeys,
      sourceModelHashes,
      blockerCodes: []
    };
  }

  const blockerCodes: string[] = [];
  if (sourceNodes.length === 0) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_LINEAGE_MISSING");
  }
  if (
    sourceNodes.some((node) =>
      !node.sourceModelObjectKey || node.sourceModelObjectKey.trim().length === 0
    )
  ) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_OBJECT_KEY_MISSING");
  }
  if (
    sourceNodes.some((node) =>
      !node.sourceModelHash || node.sourceModelHash.trim().length === 0
    )
  ) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_HASH_MISSING");
  }
  if (
    sourceModelHashes.some((hash) => !/^[a-f0-9]{64}$/u.test(hash))
  ) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_HASH_INVALID");
  }
  if (sourceModelObjectKeys.length > 1) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_OBJECT_KEY_AMBIGUOUS");
  }
  if (sourceModelHashes.length > 1) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_HASH_AMBIGUOUS");
  }
  if (
    sourceModelObjectKeys.length === 1 &&
    !sourceModelObjectKeys[0]
      .replaceAll("\\", "/")
      .toLowerCase()
      .endsWith(ALS_ORACLE_CAMPFIRE_SOURCE_MDL_OBJECT_KEY_SUFFIX)
  ) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_OBJECT_KEY_MISMATCH");
  }
  if (
    sourceModelHashes.length === 1 &&
    sourceModelHashes[0] !== ALS_ORACLE_CAMPFIRE_SOURCE_MDL_SHA256
  ) {
    blockerCodes.push("ALS_ORACLE_SOURCE_MDL_HASH_MISMATCH");
  }

  return {
    status: blockerCodes.length === 0 ? "pass" : "blocked",
    sourceModelObjectKeys,
    sourceModelHashes,
    blockerCodes
  };
}

function sameProjectionNumber(left: number | undefined, right: number): boolean {
  return typeof left === "number" && Math.abs(left - right) <= 0.000001;
}

function sameProjectionTuple(
  observed: readonly number[] | undefined,
  expected: readonly [number, number, number]
): boolean {
  return (
    observed?.length === expected.length &&
    expected.every((value, index) => sameProjectionNumber(observed[index], value))
  );
}

export function evaluateAreaLightShadowPreviewPlaceableLightProjection(
  proof: AuroraPlaceableLightingProofSnapshot | null | undefined,
  oracleFixture: AreaLightShadowOracleFixture
): AreaLightShadowPreviewPlaceableLightProjection {
  const observedSamples = proof?.facts.pointLightSpatialSamples ?? [];
  if (
    oracleFixture !== ALS_ORACLE_CAMPFIRE_FIXTURE_ID ||
    proof?.profile.pointLight === false
  ) {
    return { status: "not-required", blockerCodes: [], observedSamples };
  }

  const blockerCodes: string[] = [];
  if (!proof) {
    blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_PROOF_MISSING");
  }
  if (observedSamples.length !== 1) {
    blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_COUNT_MISMATCH");
  }
  const sample = observedSamples[0];
  if (sample) {
    const expected = ALS_ORACLE_CAMPFIRE_LIGHT_PROJECTION;
    if (sample.role !== expected.role) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_ROLE_MISMATCH");
    }
    if (sample.sourceLightColorRow !== expected.sourceLightColorRow) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_COLOR_ROW_MISMATCH");
    }
    if (!sameProjectionTuple(sample.sourceColor, expected.sourceColor)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_SOURCE_COLOR_MISMATCH");
    }
    if (!sameProjectionTuple(sample.color, expected.adjustedColor)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_ADJUSTED_COLOR_MISMATCH");
    }
    if (!sameProjectionNumber(sample.sourceRadius, expected.sourceRadius)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_SOURCE_RADIUS_MISMATCH");
    }
    if (!sameProjectionNumber(sample.sourceUnitScale, expected.sourceUnitScale)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_SOURCE_SCALE_MISMATCH");
    }
    if (!sameProjectionNumber(sample.sourceRadiusWorld, expected.sourceRadiusWorld)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_WORLD_RADIUS_MISMATCH");
    }
    if (!sameProjectionTuple(sample.sourceOffset, expected.sourceOffset)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_SOURCE_OFFSET_MISMATCH");
    }
    if (!sameProjectionTuple(sample.mappedOffset, expected.mappedOffset)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_MAPPED_OFFSET_MISMATCH");
    }
    if (!sameProjectionNumber(sample.offsetScale, expected.offsetScale)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_OFFSET_SCALE_MISMATCH");
    }
    if (!sameProjectionNumber(sample.distance, expected.effectiveRange)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_EFFECTIVE_RANGE_MISMATCH");
    }
    if (!sameProjectionNumber(sample.intensity, expected.intensity)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_INTENSITY_MISMATCH");
    }
    if (!sameProjectionNumber(sample.decay, expected.decay)) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_DECAY_MISMATCH");
    }
    if (sample.falloffMode !== expected.falloffMode) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_FALLOFF_MODE_MISMATCH");
    }
    if (sample.falloffProofStatus !== expected.falloffProofStatus) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_FALLOFF_PROOF_MISMATCH");
    }
    if (
      sample.falloffRendererPatchStatus !== "installed" &&
      sample.falloffRendererPatchStatus !== "already-installed"
    ) {
      blockerCodes.push("ALS_ORACLE_LIGHT_PROJECTION_SHADER_PATCH_BLOCKED");
    }
  }

  return {
    status: blockerCodes.length === 0 ? "pass" : "blocked",
    blockerCodes,
    observedSamples
  };
}

export function isAreaLightShadowPreviewRunnerPath(pathname: string): boolean {
  return pathname === AREA_LIGHT_SHADOW_PREVIEW_PATH;
}

function readBooleanQuery(value: string | null, fallback: boolean): boolean {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return fallback;
}

function readPositiveIntegerQuery(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(1, Math.floor(parsed));
}

function readFiniteNumberQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readProofBackdrop(value: string | null): AreaLightShadowPreviewRequest["proofBackdrop"] {
  return value === "neutral" || value === "warm-dark" ? value : "default";
}

function readLightingProofReceiver(
  value: string | null
): AuroraPlaceableLightingProofProfile["receiver"] {
  return value?.trim().toLowerCase() === "debug" ? "debug" : "area";
}

function readOracleFixture(value: string | null): AreaLightShadowOracleFixture {
  return value?.trim().toLowerCase() === ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    ? ALS_ORACLE_CAMPFIRE_FIXTURE_ID
    : "";
}

function parseAreaLightShadowPreviewRequest(): AreaLightShadowPreviewRequest {
  const params = new URLSearchParams(window.location.search);
  const injectCampfire = readBooleanQuery(params.get("injectCampfire"), false);
  const objectResRefFilter = params.get("objectResRef")?.trim().toLowerCase() ?? "";
  return {
    areaId: params.get("areaId")?.trim() || DEFAULT_AREA_ID,
    apiBaseUrl: params.get("apiBaseUrl")?.trim() || DEFAULT_API_BASE_URL,
    username: params.get("username")?.trim() || DEFAULT_USERNAME,
    password: params.get("password")?.trim() || DEFAULT_PASSWORD,
    displayFog: readBooleanQuery(params.get("displayFog"), false),
    useAreaLighting: readBooleanQuery(params.get("useAreaLighting"), true),
    tileProcess: readBooleanQuery(params.get("tileProcess"), true),
    renderObjects: readBooleanQuery(params.get("renderObjects"), injectCampfire),
    includeAreaObjects: readBooleanQuery(params.get("includeAreaObjects"), !injectCampfire),
    injectCampfire,
    highlightInjectedCampfire: readBooleanQuery(
      params.get("highlightInjectedCampfire"),
      true
    ),
    fullViewport: readBooleanQuery(params.get("fullViewport"), false),
    canvasWidth: readPositiveIntegerQuery(params.get("canvasWidth"), DEFAULT_CANVAS_WIDTH),
    canvasHeight: readPositiveIntegerQuery(params.get("canvasHeight"), DEFAULT_CANVAS_HEIGHT),
    campfireX: readFiniteNumberQuery(params.get("campfireX")),
    campfireY: readFiniteNumberQuery(params.get("campfireY")),
    campfireZ: readFiniteNumberQuery(params.get("campfireZ")),
    objectResRefFilter,
    captureTimeSeconds: readFiniteNumberQuery(params.get("captureTimeSeconds")),
    focusRenderedObjects: readBooleanQuery(
      params.get("focusRenderedObjects"),
      objectResRefFilter.length > 0
    ),
    renderTerrain: readBooleanQuery(params.get("renderTerrain"), true),
    cameraDistanceScale: clamp(readFiniteNumberQuery(params.get("cameraDistanceScale")) ?? 1, 0.05, 2),
    cameraAzimuthDegrees: clamp(
      readFiniteNumberQuery(params.get("cameraAzimuthDegrees")) ?? 0,
      -360,
      360
    ),
    proofBackdrop: readProofBackdrop(params.get("proofBackdrop")),
    lightingProofProfile: resolveAuroraPlaceableLightingProofProfile({
      receiver: readLightingProofReceiver(params.get("lightingReceiver")),
      pointLight: readBooleanQuery(params.get("lightingPointLight"), true),
      halo: readBooleanQuery(params.get("lightingHalo"), true),
      vfx: readBooleanQuery(params.get("lightingVfx"), true),
      shadow: readBooleanQuery(params.get("lightingShadow"), true),
      postprocess: readBooleanQuery(params.get("lightingPostprocess"), true)
    }),
    oracleFixture: readOracleFixture(params.get("oracleFixture"))
  };
}

function createEmptySnapshot(
  status: RunnerStatus,
  request: AreaLightShadowPreviewRequest,
  error = ""
): AreaLightShadowPreviewSnapshot {
  const placeableSourceLineage =
    evaluateAreaLightShadowPreviewPlaceableSourceLineage(
      undefined,
      request.oracleFixture
    );
  const placeableLightProjection = request.lightingProofProfile.pointLight
    ? evaluateAreaLightShadowPreviewPlaceableLightProjection(
        undefined,
        request.oracleFixture
      )
    : { status: "not-required" as const, blockerCodes: [] };
  const terrainSourceLineage = evaluateAreaLightShadowPreviewTerrainSourceLineage(
    undefined,
    request.oracleFixture
  );
  return {
    status,
    error,
    areaId: request.oracleFixture ? ALS_ORACLE_AREA_ID : request.areaId,
    areaName: "",
    apiBaseUrl: request.apiBaseUrl,
    displayFog: request.displayFog,
    useAreaLighting: request.useAreaLighting,
    tileProcess: request.tileProcess,
    renderObjects: request.renderObjects,
    includeAreaObjects: request.includeAreaObjects,
    injectCampfire: request.injectCampfire,
    highlightInjectedCampfire: request.highlightInjectedCampfire,
    fullViewport: request.fullViewport,
    canvasWidth: request.canvasWidth,
    canvasHeight: request.canvasHeight,
    tileProcessStatus: "",
    tileProcessReadyCount: 0,
    tileProcessBlockedCount: 0,
    tileProcessBlockers: "",
    tileProcessError: "",
    cacheHit: null,
    tileCount: 0,
    objectCount: 0,
    renderObjectCount: 0,
    renderTerrain: request.renderTerrain,
    cameraDistanceScale: request.cameraDistanceScale,
    cameraAzimuthDegrees: request.cameraAzimuthDegrees,
    proofBackdrop: request.proofBackdrop,
    placeableLightingProofProfile: { ...request.lightingProofProfile },
    placeableLightingProof: null,
    placeableSourceLineageStatus: placeableSourceLineage.status,
    placeableSourceModelObjectKeys: placeableSourceLineage.sourceModelObjectKeys,
    placeableSourceModelHashes: placeableSourceLineage.sourceModelHashes,
    placeableSourceLineageBlockers: placeableSourceLineage.blockerCodes,
    placeableLightProjectionStatus: placeableLightProjection.status,
    placeableLightProjectionBlockers: placeableLightProjection.blockerCodes,
    terrainSourceLineageStatus: terrainSourceLineage.status,
    terrainSourceModelObjectKeys: terrainSourceLineage.sourceModelObjectKeys,
    terrainSourceModelHashes: terrainSourceLineage.sourceModelHashes,
    terrainModelAssetObjectKeys: terrainSourceLineage.modelAssetObjectKeys,
    terrainModelAssetHashes: terrainSourceLineage.modelAssetHashes,
    terrainTextureObjectKeys: terrainSourceLineage.textureObjectKeys,
    terrainTextureHashes: terrainSourceLineage.textureHashes,
    terrainSourceLineageBlockers: terrainSourceLineage.blockerCodes,
    objectResRefFilter: request.objectResRefFilter,
    captureTimeSeconds: request.captureTimeSeconds,
    vfxPlaybackRootCount: 0,
    vfxPlaybackFrameCount: 0,
    vfxPlaybackDurationSeconds: 0,
    vfxPlaybackCompleted: false,
    vfxVisibleDrawMeshCount: 0,
    vfxVisibleDrawParticleCount: 0,
    vfxVisibleTextureReferences: [],
    vfxVisibleDrawBoundsCenter: [],
    vfxVisibleDrawBoundsSize: [],
    vfxVisibleDrawMeshSamples: [],
    vfxRuntimeObservability: null,
    renderedObjectSamples: [],
    injectedCampfireObjectId: "",
    injectedCampfireTemplateId: "",
    injectedCampfireResRef: "",
    injectedCampfireRetailResRef: "",
    injectedCampfirePosition: [],
    placeableRenderPayloadStatus: "",
    placeableRenderPayloadCount: 0,
    placeableRenderPayloadError: "",
    placeableTwoDaLightStatus: "",
    placeableTwoDaLightSourceCount: 0,
    placeableTwoDaLightPointLightCount: 0,
    placeableTwoDaLightHaloCount: 0,
    placeableTwoDaLightCoreCount: 0,
    placeableTwoDaLightReceiverCount: 0,
    placeableTwoDaLightFastShadowCount: 0,
    placeableTwoDaLightDisabledCount: 0,
    placeableTwoDaLightDisabledByLightStateCount: 0,
    placeableTwoDaLightDisabledByUseAreaLightingCount: 0,
    placeableTwoDaLightSamples: [],
    placeableModelStatus: "",
    placeableModelMeshCount: 0,
    placeableModelUrl: "",
    placeableModelTextureStatus: "",
    placeableModelTextureCount: 0,
    placeableModelTextureLoaded: 0,
    placeableModelTextureSource: "",
    placeableModelTextureSettled: false,
    areaGlobalLightingStatus: "",
    areaGlobalLightingPhase: "",
    areaGlobalLightingFields: "",
    areaGlobalShadowOpacity: "",
    areaGlobalShadowOpacityFactor: "",
    areaGlobalShadowStatus: "",
    areaGlobalShadowSourceField: "",
    sceneShadowProofStatus: "",
    sceneShadowRetailProjectionStatus: "",
    sceneShadowPointLightCastShadowCount: 0,
    sceneShadowPointLightSamples: [],
    sceneShadowItemPropertyLightShadowPolicyCount: 0,
    sceneShadowItemPropertyLightShadowPolicySamples: [],
    sceneShadowDirectionalLightCastShadowCount: 0,
    sceneShadowDirectionalLightSamples: [],
    sceneShadowProgFxType4ShadowRequestCount: 0,
    sceneShadowProgFxType4ShadowRequestSamples: [],
    sceneShadowAreaStatus: "",
    sceneShadowAreaSourceField: "",
    sceneShadowAreaOpacity: "",
    sceneShadowAreaOpacityFactor: "",
    terrainRuntimeStatus: "",
    terrainLoaderBlockers: "",
    terrainTileModelBlockedCount: 0,
    terrainTileModelDeliveryUrlSample: "",
    terrainTileModelLoaderErrorSample: "",
    terrainTileModelBlockedTileSample: "",
    terrainAreaId: "",
    terrainTileModelLoadedCount: 0,
    terrainTileModelVisibleMeshCount: 0,
    terrainTileModelMaterialMapCount: 0,
    terrainTileModelVisibleMeshSample: "",
    terrainTileShadowReceiverMeshCount: 0,
    terrainTileShadowReceiverStatus: "",
    terrainTileShadowReceiverSource: "",
    terrainTileShadowReceiverSample: "",
    cameraPosition: [],
    oracleFixture: request.oracleFixture
  };
}

/**
 * Reconstructs the immutable Area used by the retail `als_oracle.mod`
 * campfire lane.  The values are extracted from the packed module and its
 * resolved `tin01.set`; they deliberately do not inherit the unrelated Area's
 * tiles, lighting or texture-atlas identity.
 */
export function createAlsOracleCampfireAreaFixture(
  baseArea: AreaApiProcessedArea
): AreaApiProcessedArea {
  const tiles = Array.from(
    { length: ALS_ORACLE_AREA_SIZE * ALS_ORACLE_AREA_SIZE },
    (_, tileIndex) => {
      const row = Math.floor(tileIndex / ALS_ORACLE_AREA_SIZE);
      const col = tileIndex % ALS_ORACLE_AREA_SIZE;
      return {
        tileInstanceId: `${ALS_ORACLE_AREA_ID}:tile-${tileIndex}`,
        areaId: ALS_ORACLE_AREA_ID,
        tilesetResRef: ALS_ORACLE_TILESET_RESREF,
        row,
        col,
        tileIndex,
        tileId: 18,
        modelResRef: ALS_ORACLE_TILE_MODEL_RESREF,
        modelSource: "set-tile-section" as const,
        imageMap2D: ALS_ORACLE_TILE_IMAGE_MAP,
        orientation: 0,
        tilesetOrientation: 0,
        mainLight1: 0,
        mainLight2: 0,
        sourceLight1: 0,
        sourceLight2: 0,
        animLoop1: 1,
        animLoop2: 1,
        animLoop3: 1,
        height: 0,
        source: "are-tile-list" as const
      };
    }
  );
  return {
    ...baseArea,
    areaId: ALS_ORACLE_AREA_ID,
    name: "enon_test_effects",
    biome: ALS_ORACLE_TILESET_RESREF,
    width: ALS_ORACLE_AREA_SIZE,
    height: ALS_ORACLE_AREA_SIZE,
    tags: [
      "immutable-retail-oracle",
      ALS_ORACLE_CAMPFIRE_FIXTURE_ID,
      `module-sha256:${ALS_ORACLE_MODULE_SHA256}`
    ],
    benchmark: true,
    previewImageUrl: "",
    textureAtlas: {
      atlasId: `${ALS_ORACLE_AREA_ID}:${ALS_ORACLE_ARE_SHA256}`,
      cacheKey: ALS_ORACLE_ARE_SHA256,
      strategy: "blob-cache"
    },
    tileSet: ALS_ORACLE_TILESET_RESREF,
    tiles,
    lighting: {
      source: "are-root-fields",
      fields: [
        { field: "LightingScheme", value: 12 },
        { field: "ShadowOpacity", value: 60 },
        { field: "DayNightCycle", value: 0 },
        { field: "IsNight", value: 1 },
        { field: "SkyBox", value: 0 },
        { field: "FogClipDist", value: 45 },
        { field: "ChanceRain", value: 0 },
        { field: "ChanceSnow", value: 0 },
        { field: "ChanceLightning", value: 0 },
        { field: "WindPower", value: 0 },
        { field: "SunAmbientColor", value: 0 },
        { field: "SunDiffuseColor", value: 0 },
        { field: "SunFogColor", value: 0 },
        { field: "SunFogAmount", value: 0 },
        { field: "SunShadows", value: 0 },
        { field: "MoonAmbientColor", value: 3947580 },
        { field: "MoonDiffuseColor", value: 11184810 },
        { field: "MoonFogColor", value: 0 },
        { field: "MoonFogAmount", value: 5 },
        { field: "MoonShadows", value: 0 }
      ]
    },
    objects: [],
    composition: {
      placeables: 0,
      doors: 0,
      creatures: 0,
      encounters: 0,
      items: 0,
      sounds: 0,
      stores: 0,
      triggers: 0,
      waypoints: 0,
      total: 0
    },
    sourceResources: {
      areSha256: ALS_ORACLE_ARE_SHA256,
      gitSha256: ALS_ORACLE_GIT_SHA256,
      gicSha256: ALS_ORACLE_GIC_SHA256
    }
  };
}

function createAreaLightShadowDebugState(
    request: Pick<AreaLightShadowPreviewRequest, "displayFog" | "useAreaLighting">
): DebugState {
  const defaults = createDefaultToolbarState().canvasDebug;
  return {
    ...defaults,
    textureCompression: "uastc",
    grid: false,
    axes: false,
    objectLabels: false,
    perfHud: false,
    runtimeHud: false,
    controlsHint: false,
    hiddenMeshes: false,
    ceilingMeshes: false,
    wireframe: false,
    textures: true,
    displayFog: request.displayFog,
    useAreaLighting: request.useAreaLighting,
    walkmeshOverlay: false
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveSceneScale(width: number, height: number): number {
  return clamp(
    Math.min(width / LEGACY_SEED_SCENE_WIDTH_TILES, height / LEGACY_SEED_SCENE_HEIGHT_TILES),
    0.08,
    1
  );
}

function createCampfireProofObject(
  scene: AreaScene,
  request: AreaLightShadowPreviewRequest
): SceneObject {
  const placement = resolveCampfireProofPlacement(scene, {
    x:
      request.campfireX ??
      (request.oracleFixture ? ALS_ORACLE_CAMPFIRE_TILE_POSITION : null),
    y:
      request.campfireY ??
      (request.oracleFixture ? ALS_ORACLE_CAMPFIRE_TILE_POSITION : null),
    z: request.campfireZ
  });
  const { x, y, z } = placement;
  return normalizeSceneObjectMetadata({
    id: CAMPFIRE_PROOF_OBJECT_ID,
    kind: "placeables",
    name: "Fire: Campfire 1",
    resRef: CAMPFIRE_PROOF_RES_REF,
    tag: "ALS_CAMPFIRE",
    isStatic: true,
    x,
    y,
    z,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: scene.sceneId,
      sourceObjectId: CAMPFIRE_PROOF_OBJECT_ID,
      sourceKind: "placeable",
      templateId: CAMPFIRE_PROOF_TEMPLATE_ID,
      sourceModelResRef: "plc_i06.mdl",
      appearanceType: CAMPFIRE_PROOF_APPEARANCE_TYPE,
      localizedName: "Fire: Campfire 1",
      description: `retail oracle resref ${CAMPFIRE_PROOF_RETAIL_RES_REF}; Aurora Web template ${CAMPFIRE_PROOF_TEMPLATE_ID}; proof placement tile=${placement.tileId || "unresolved"} z=${z}`
    },
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  });
}

interface CampfireProofPlacementInput {
  readonly x: number | null;
  readonly y: number | null;
  readonly z: number | null;
}

interface CampfireProofPlacement {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly tileId: string;
}

function resolveCampfireProofPlacement(
  scene: AreaScene,
  input: CampfireProofPlacementInput
): CampfireProofPlacement {
  const x = input.x ?? Math.max(0.5, scene.width / 2);
  const y = input.y ?? Math.max(0.5, scene.height / 2);
  const tileCol = clamp(Math.floor(x), 0, Math.max(0, scene.width - 1));
  const tileRow = clamp(Math.floor(y), 0, Math.max(0, scene.height - 1));
  const tile = scene.tiles.find(
    (candidate) => candidate.col === tileCol && candidate.row === tileRow
  );
  const tileSurfaceZ = tile
    ? resolveAuroraAreaRenderTileHeight(
        tile.height,
        scene.auroraAreaEditing?.definition.defaults?.transition
      )
    : 0;
  return {
    x,
    y,
    z: input.z ?? tileSurfaceZ,
    tileId: tile?.id ?? ""
  };
}

export function resolveCampfireProofPlacementForTests(
  scene: AreaScene,
  input: CampfireProofPlacementInput
): CampfireProofPlacement {
  return resolveCampfireProofPlacement(scene, input);
}

function resolveRenderObjectsForPreview(
  scene: AreaScene,
  request: AreaLightShadowPreviewRequest
): SceneObject[] {
  if (!request.renderObjects) {
    return [];
  }
  const objects = request.includeAreaObjects
    ? scene.objects.filter(
        (object) =>
          request.objectResRefFilter.length === 0 ||
          object.resRef.trim().toLowerCase() === request.objectResRefFilter
      )
    : [];
  if (!request.injectCampfire) {
    return objects;
  }
  const withoutPreviousCampfire = objects.filter(
    (object) => object.id !== CAMPFIRE_PROOF_OBJECT_ID
  );
  withoutPreviousCampfire.push(createCampfireProofObject(scene, request));
  return withoutPreviousCampfire;
}

function isPlaceablePayloadObject(object: SceneObject): boolean {
  return object.kind === "placeables" || object.kind === "doors";
}

async function resolvePlaceablePayloadsForPreview(
  request: AreaLightShadowPreviewRequest,
  accessToken: string,
  objects: SceneObject[]
): Promise<{
  readonly payloadByObjectId: Record<string, PlaceableViewportRenderPayload>;
  readonly status: string;
  readonly error: string;
}> {
  const entries = objects.filter(isPlaceablePayloadObject).map((object) => ({
    key: object.id,
    lookup: applyAreaLightShadowPreviewPlaceableFreshnessPolicy(
      resolvePlaceableRenderPayloadLookup(object).processPayload,
      request.oracleFixture
    )
  }));
  if (entries.length === 0) {
    return { payloadByObjectId: {}, status: "not-requested", error: "" };
  }
  try {
    const placeableApiPort = new HttpPlaceableApiPort(fetch.bind(window), request.apiBaseUrl);
    const results = await fetchPlaceableViewportRenderPayloadBatch(
      placeableApiPort,
      accessToken,
      entries,
      {
        preferBackendViewportBatch: true,
        allowPartialProcessBatchResults: true,
        backendViewportBatchTimeoutMs: 15000,
        processBatchTimeoutMs: 15000,
        assetContractBatchTimeoutMs: 15000,
        assetContractSingleTimeoutMs: 12000
      }
    );
    return {
      payloadByObjectId: Object.fromEntries(
        results.map((result) => [
          result.key,
          rewriteCatalogVfxPreviewPayloadDeliveryUrls(result.payload, request.apiBaseUrl)
        ])
      ),
      status: results.length === entries.length ? "ready" : "partial",
      error: results.length === entries.length ? "" : `resolved ${results.length}/${entries.length}`
    };
  } catch (error) {
    return {
      payloadByObjectId: {},
      status: "error",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function uniqueSortedStrings(values: readonly string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  );
}

export function buildAreaVfxExpectedHostGraph(
  payloadByObjectId: Record<string, PlaceableViewportRenderPayload>
) {
  const payloads = Object.values(payloadByObjectId);
  return {
    staticBranches: uniqueSortedStrings(
      payloads.flatMap((payload) => {
        const nodes =
          payload.renderPackage?.auroraModelGraph?.staticGeometryNodes ?? [];
        const primaryModelAssetIds = new Set(
          (payload.renderPackage?.assetRefs.modelAssetIds ?? [])
            .map((assetId) => assetId.trim())
            .filter(Boolean)
        );
        const primaryNodes =
          primaryModelAssetIds.size > 0
            ? nodes.filter((node) =>
                primaryModelAssetIds.has(node.sourceModelAssetId.trim())
              )
            : nodes;
        return primaryNodes.map((node) => node.nodeName);
      })
    ),
    emitterBranches: uniqueSortedStrings(
      payloads.flatMap(
        (payload) =>
          payload.renderPackage?.auroraEmitter?.emitters.map(
            (emitter) => emitter.nodeName
          ) ?? []
      )
    ),
    lightBranches: uniqueSortedStrings(
      payloads.flatMap(
        (payload) =>
          payload.renderPackage?.auroraLight?.lights.map(
            (light) => light.nodeName
          ) ?? []
      )
    )
  };
}

function buildAreaVfxCacheIdentity(
  areaId: string,
  payloadByObjectId: Record<string, PlaceableViewportRenderPayload>
): string | null {
  const cacheKeys = uniqueSortedStrings(
    Object.values(payloadByObjectId).map((payload) => payload.cacheKey ?? "")
  );
  return cacheKeys.length > 0 ? `${areaId}:${cacheKeys.join("|")}` : null;
}

function hasDeferredAreaVfxRuntimeEmitters(
  payloadByObjectId: Record<string, PlaceableViewportRenderPayload>
): boolean {
  return Object.values(payloadByObjectId).some((payload) => {
    const auroraPayload = payload.renderPackage?.auroraVfxPayload;
    if (!auroraPayload || typeof auroraPayload !== "object") return false;
    const contracts = (auroraPayload as { contracts?: unknown }).contracts;
    return (
      contracts !== null &&
      typeof contracts === "object" &&
      (contracts as { runtimeEmittersDeferred?: unknown })
        .runtimeEmittersDeferred === true
    );
  });
}

function readAreaVfxCompositionRoots(
  runtime: ReturnType<typeof createRuntime>,
  payloadByObjectId: Record<string, PlaceableViewportRenderPayload>
): THREE.Object3D[] {
  return Object.entries(payloadByObjectId)
    .filter(
      ([, payload]) =>
        (payload.renderPackage?.auroraEmitter?.emitters.length ?? 0) > 0
    )
    .map(([objectId]) => runtime.objectMeshById.get(objectId))
    .filter((root): root is THREE.Object3D => root !== undefined);
}

function createAreaVfxRuntimeObservability(
  runtime: ReturnType<typeof createRuntime>,
  areaId: string,
  payloadByObjectId: Record<string, PlaceableViewportRenderPayload>,
  backendRuntimeBuild: BackendRuntimeBuildIdentity | null
) {
  const compositionRoots = readAreaVfxCompositionRoots(
    runtime,
    payloadByObjectId
  );
  compositionRoots.forEach((root) =>
    recordCatalogVfxRuntimeBindings(runtime, root)
  );
  return createVfxRuntimeObservabilityReport({
    runtime,
    root: runtime.objectLayer,
    compositionRoots,
    expectedPlaybackRootCount: Math.max(1, compositionRoots.length),
    profile: "development",
    overlayRequested: false,
    runtimeEmittersDeferred:
      hasDeferredAreaVfxRuntimeEmitters(payloadByObjectId),
    expectedHostGraph: buildAreaVfxExpectedHostGraph(payloadByObjectId),
    buildIdentity: {
      frontend: {
        commit: import.meta.env.VITE_RUNTIME_BUILD_COMMIT,
        imageDigest: import.meta.env.VITE_RUNTIME_BUILD_IMAGE_DIGEST,
        builtAt: import.meta.env.VITE_RUNTIME_BUILD_BUILT_AT
      },
      backend: backendRuntimeBuild ?? undefined,
      contractVersion: backendRuntimeBuild?.contractVersion ?? null,
      cacheKey: buildAreaVfxCacheIdentity(areaId, payloadByObjectId)
    }
  });
}

async function resolveTileProcessReadinessForPreview(
  request: AreaLightShadowPreviewRequest,
  accessToken: string,
  area: Parameters<typeof resolveAreaTileProcessContractReadiness>[2]
): Promise<{
  readonly readiness: AreaTileProcessContractReadiness | null;
  readonly error: string;
}> {
  if (!request.tileProcess) {
    return { readiness: null, error: "" };
  }
  try {
    const tileApiPort = new HttpTileApiPort(fetch.bind(window), request.apiBaseUrl);
    return {
      readiness: await resolveAreaTileProcessContractReadiness(
        tileApiPort,
        accessToken,
        area,
        { bypassCache: request.oracleFixture === ALS_ORACLE_CAMPFIRE_FIXTURE_ID }
      ),
      error: ""
    };
  } catch (error) {
    return {
      readiness: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function splitDatasetList(value: string | undefined): string[] {
  return value && value.length > 0 ? value.split("|").filter(Boolean) : [];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

async function waitForTerrainRuntimeSettlement(
  runtime: ReturnType<typeof createRuntime>,
  render: () => void,
  timeoutMs = 8000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (
    runtime.container.dataset.areaTerrainTileModelRuntimeStatus === "loading" &&
    Date.now() < deadline
  ) {
    render();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  render();
}

async function waitForObjectRuntimeSettlement(
  runtime: ReturnType<typeof createRuntime>,
  render: () => void,
  timeoutMs = 12000
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      isAreaLightShadowPreviewPlaceableTextureSettled(runtime.container.dataset) &&
      runtime.placeableModelPendingByUrl.size === 0
    ) {
      break;
    }
    render();
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  }
  if (
    !isAreaLightShadowPreviewPlaceableTextureSettled(runtime.container.dataset) ||
    runtime.placeableModelPendingByUrl.size > 0
  ) {
    throw new Error(
      `AREA_PLACEABLE_TEXTURE_SETTLEMENT_TIMEOUT:${JSON.stringify({
        modelStatus: runtime.container.dataset.placeableModelStatus ?? null,
        textureStatus: runtime.container.dataset.placeableModelTextureStatus ?? null,
        textureCount: runtime.container.dataset.placeableModelTextureCount ?? null,
        textureLoaded: runtime.container.dataset.placeableModelTextureLoaded ?? null,
        pendingModelCount: runtime.placeableModelPendingByUrl.size
      })}`
    );
  }
  render();
  await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  render();
}

export function isAreaLightShadowPreviewPlaceableTextureSettled(dataset: {
  placeableModelStatus?: string;
  placeableModelTextureStatus?: string;
  placeableModelTextureCount?: string;
  placeableModelTextureLoaded?: string;
}): boolean {
  if (dataset.placeableModelStatus !== "loaded") {
    return false;
  }
  const textureCount = Number(dataset.placeableModelTextureCount ?? 0);
  const textureLoaded = Number(dataset.placeableModelTextureLoaded ?? 0);
  if (dataset.placeableModelTextureStatus === "not-applicable") {
    return textureCount === 0 && textureLoaded === 0;
  }
  return (
    dataset.placeableModelTextureStatus === "applied" &&
    textureCount > 0 &&
    textureLoaded >= textureCount
  );
}

async function seekAreaVfxForCapture(
  runtime: ReturnType<typeof createRuntime>,
  render: () => void,
  elapsedSeconds: number,
  expectedRootCount: number,
  timeoutMs = 12000
): Promise<ReturnType<typeof readRuntimeAuroraVfxCanonicalPlaybackState>> {
  const deadline = Date.now() + timeoutMs;
  let playback = readRuntimeAuroraVfxCanonicalPlaybackState(runtime);
  do {
    seekRuntimeAuroraVfxCanonicalPlaybacks(runtime, elapsedSeconds);
    render();
    playback = readRuntimeAuroraVfxCanonicalPlaybackState(runtime);
    if (
      playback.rootCount >= expectedRootCount &&
      playback.visibleDrawMeshCount > 0 &&
      playback.visibleMappedMaterialCount > 0
    ) {
      return playback;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 100));
  } while (Date.now() < deadline);
  return playback;
}

export function renderAreaLightShadowPreviewRuntime(
  runtime: ReturnType<typeof createRuntime>,
  renderFrame: (runtime: ReturnType<typeof createRuntime>) => void =
    renderRuntime
): void {
  runtime.controls.update();
  renderFrame(runtime);
}

export function rotateAreaLightShadowPreviewCameraAzimuth(
  runtime: Pick<ReturnType<typeof createRuntime>, "camera" | "controls">,
  azimuthDegrees: number
): void {
  if (!Number.isFinite(azimuthDegrees) || Math.abs(azimuthDegrees) <= Number.EPSILON) {
    return;
  }
  const target = runtime.controls.target;
  const offset = runtime.camera.position.clone().sub(target);
  offset.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    THREE.MathUtils.degToRad(azimuthDegrees)
  );
  runtime.camera.position.copy(target).add(offset);
  runtime.camera.lookAt(target);
  runtime.camera.updateMatrixWorld(true);
  runtime.controls.update();
}

export function readAreaLightShadowPreviewPostprocessDiagnostics(
  runtime: Pick<
    ReturnType<typeof createRuntime>,
    "renderer" | "auroraRetailBloomPass"
  >
): unknown {
  const pass = runtime.auroraRetailBloomPass;
  if (!pass) return null;
  return {
    contract: pass.getDiagnostics(),
    frameEnergy: pass.readFrameEnergyDiagnostics(runtime.renderer)
  };
}

export function hideAreaLightShadowPreviewEditorLayers(
  runtime: Pick<
    ReturnType<typeof createRuntime>,
    "gridLayer" | "tileOverlayLayer" | "axesHelper"
  >
): void {
  runtime.gridLayer.visible = false;
  runtime.tileOverlayLayer.visible = false;
  runtime.axesHelper.visible = false;
}

export function AreaLightShadowPreviewRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const request = useMemo(parseAreaLightShadowPreviewRequest, []);
  const [snapshot, setSnapshot] = useState<AreaLightShadowPreviewSnapshot>(() =>
    createEmptySnapshot(import.meta.env.MODE === "test" ? "skipped-test" : "loading", request)
  );

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      return undefined;
    }
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;

    async function run(): Promise<void> {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Area light shadow preview host was not mounted.");
        }

        const areaApiPort = new HttpAreaApiPort(fetch.bind(window), request.apiBaseUrl);
        const [login, health] = await Promise.all([
          areaApiPort.login(request.username, request.password),
          probeBackendHealth(fetch.bind(globalThis), request.apiBaseUrl)
        ]);
        const processed = await areaApiPort.processArea(
          login.accessToken,
          request.areaId,
          applyAreaLightShadowPreviewAreaFreshnessPolicy({}, request.oracleFixture)
        );
        const processedArea = request.oracleFixture
          ? createAlsOracleCampfireAreaFixture(processed.area)
          : processed.area;
        const tileProcessReadiness = await resolveTileProcessReadinessForPreview(
          request,
          login.accessToken,
          processedArea
        );
        const terrainSourceLineage = evaluateAreaLightShadowPreviewTerrainSourceLineage(
          tileProcessReadiness.readiness,
          request.oracleFixture
        );
        if (cancelled) {
          return;
        }

        const scene = mapBackendAreaToScene(processedArea);
        const renderObjects = resolveRenderObjectsForPreview(scene, request);
        const placeablePayloadResult: Awaited<
          ReturnType<typeof resolvePlaceablePayloadsForPreview>
        > = request.renderObjects
          ? await resolvePlaceablePayloadsForPreview(
              request,
              login.accessToken,
              renderObjects
            )
          : { payloadByObjectId: {}, status: "not-requested", error: "" };
        const placeableSourceLineage =
          evaluateAreaLightShadowPreviewPlaceableSourceLineage(
            placeablePayloadResult.payloadByObjectId[CAMPFIRE_PROOF_OBJECT_ID],
            request.oracleFixture
          );
        if (cancelled) {
          return;
        }
        const runtime = createRuntime(host);
        cleanupRuntime = () => disposeRuntime(runtime);
        hideAreaLightShadowPreviewEditorLayers(runtime);
        registerVfxRuntimeExpectedAssets(
          runtime,
          Object.values(placeablePayloadResult.payloadByObjectId).flatMap(
            buildCatalogVfxExpectedRuntimeAssets
          )
        );
        if (request.proofBackdrop !== "default") {
          const backdrop = new THREE.Color(
            request.proofBackdrop === "warm-dark" ? 0x2a211b : 0x59626d
          );
          runtime.scene.background = backdrop;
          runtime.renderer.setClearColor(backdrop, 1);
        }
        applyPlaceableAssetRequestHeaders(runtime, login.accessToken);
        host.style.width = `${request.canvasWidth}px`;
        host.style.height = `${request.canvasHeight}px`;
        resizeRuntime(runtime);
        centerCameraForScene(runtime, scene);
        const debugState = createAreaLightShadowDebugState(request);
        if (request.renderTerrain) {
          rebuildTerrainMesh(
            runtime,
            scene,
            null,
            debugState,
            tileProcessReadiness.readiness
          );
        } else {
          if (runtime.tileMesh) runtime.tileMesh.visible = false;
        }
        if (request.renderObjects) {
          rebuildObjectMeshes(
            runtime,
            renderObjects,
            request.injectCampfire && request.highlightInjectedCampfire
              ? [CAMPFIRE_PROOF_OBJECT_ID]
              : [],
            debugState,
            scene.width,
            scene.height,
            resolveSceneScale(scene.width, scene.height),
            true,
            DEFAULT_AREA_SOUND_UNITS_PER_TILE,
            [],
            false,
            placeablePayloadResult.payloadByObjectId,
            null
          );
        }

        const render = () => {
          applyAuroraPlaceableLightingProofProfile(
            { scene: runtime.scene, objectLayer: runtime.objectLayer },
            request.lightingProofProfile
          );
          renderAreaLightShadowPreviewRuntime(
            runtime,
            request.lightingProofProfile.postprocess
              ? renderRuntime
              : renderRuntimeWithoutPostprocess
          );
        };
        if (request.renderTerrain) {
          await waitForTerrainRuntimeSettlement(runtime, render);
        }
        if (request.renderObjects) {
          await waitForObjectRuntimeSettlement(runtime, render);
          if (request.injectCampfire || request.focusRenderedObjects) {
            centerCameraForRuntimeObjectPreview(runtime);
            if (request.cameraDistanceScale !== 1) {
              runtime.camera.position
                .sub(runtime.controls.target)
                .multiplyScalar(request.cameraDistanceScale)
                .add(runtime.controls.target);
              runtime.controls.update();
            }
            rotateAreaLightShadowPreviewCameraAzimuth(
              runtime,
              request.cameraAzimuthDegrees
            );
            render();
          }
        }
        const requestedCaptureTimeSeconds = Math.max(0, request.captureTimeSeconds ?? 0);
        const vfxPlayback =
          request.captureTimeSeconds !== null
            ? await seekAreaVfxForCapture(
                runtime,
                render,
                requestedCaptureTimeSeconds,
                Math.max(1, renderObjects.length)
              )
            : readRuntimeAuroraVfxCanonicalPlaybackState(runtime);
        const placeableLightDiagnostics = writePlaceableTwoDaLightRenderDiagnostics(runtime);
        const diagnostics = writeAuroraScenePointLightDiagnostics(runtime);
        const readRuntimeObservability = () =>
          createAreaVfxRuntimeObservability(
            runtime,
            processedArea.areaId,
            placeablePayloadResult.payloadByObjectId,
            health.runtimeBuild
          );
        const readPlaceableLightingProofSnapshot = () => {
          applyAuroraPlaceableLightingProofProfile(
            { scene: runtime.scene, objectLayer: runtime.objectLayer },
            request.lightingProofProfile
          );
          const runtimeObservability = readRuntimeObservability();
          const facts = collectAuroraPlaceableLightingProofSceneFacts({
            scene: runtime.scene,
            objectLayer: runtime.objectLayer,
            tileMesh: runtime.tileMesh,
            assetSettlementStatus: runtimeObservability.assetSettlement.status
          });
          return evaluateAuroraPlaceableLightingProof({
            ...facts,
            profile: request.lightingProofProfile
          });
        };
        const runtimeObservability = readRuntimeObservability();
        const placeableLightingProof = readPlaceableLightingProofSnapshot();
        const placeableLightProjection =
          evaluateAreaLightShadowPreviewPlaceableLightProjection(
            placeableLightingProof,
            request.oracleFixture
          );
        const readCapturePlaybackState = () => ({
          ...readRuntimeAuroraVfxCanonicalPlaybackState(runtime),
          cameraPosition: runtime.camera.position.toArray(),
          cameraTarget: runtime.controls.target.toArray()
        });
        window.__auroraAreaVfxPreviewBeginDeterministicCapture = () => {
          seekRuntimeAuroraVfxCanonicalPlaybacks(runtime, 0);
          render();
          return true;
        };
        window.__auroraAreaVfxPreviewRenderAtTime = (elapsedSeconds: number) => {
          if (Number.isFinite(elapsedSeconds)) {
            seekRuntimeAuroraVfxCanonicalPlaybacks(runtime, Math.max(0, elapsedSeconds));
            render();
          }
          return readCapturePlaybackState();
        };
        window.__auroraAreaVfxPreviewForceRender = () => {
          render();
          return true;
        };
        window.__auroraAreaVfxPreviewSetParticleDepthTest = (enabled: boolean) => {
          const samples: Array<Record<string, unknown>> = [];
          runtime.objectLayer.traverse((node) => {
            if (
              !(node instanceof THREE.Mesh) ||
              node.userData.auroraVfxCanonicalDrawMesh !== true
            ) {
              return;
            }
            const materials = Array.isArray(node.material)
              ? node.material
              : [node.material];
            materials.forEach((material) => {
              material.depthTest = enabled;
            });
            samples.push({
              textureReference:
                node.userData.auroraVfxCanonicalTextureReference ?? "",
              depthTest: materials.every((material) => material.depthTest)
            });
          });
          render();
          return { enabled, samples };
        };
        window.__auroraAreaVfxPreviewGetCompositionSpatialDiagnostics = () => {
          const root = runtime.objectMeshById.get(CAMPFIRE_PROOF_OBJECT_ID);
          const samples: Array<Record<string, unknown>> = [];
          root?.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            node.updateWorldMatrix(true, false);
            const bounds = new THREE.Box3().setFromObject(node, true);
            const size = bounds.isEmpty()
              ? new THREE.Vector3()
              : bounds.getSize(new THREE.Vector3());
            const center = bounds.isEmpty()
              ? new THREE.Vector3()
              : bounds.getCenter(new THREE.Vector3());
            samples.push({
              name: node.name,
              canonicalDrawMesh:
                node.userData.auroraVfxCanonicalDrawMesh === true,
              textureReference:
                node.userData.auroraVfxCanonicalTextureReference ?? "",
              hostBranchKind:
                node.userData.auroraVfxHostBranchKind ?? "",
              hostBranchName:
                node.userData.auroraVfxHostBranchName ?? "",
              visible: node.visible,
              worldBoundsMin: bounds.isEmpty() ? [] : bounds.min.toArray(),
              worldBoundsMax: bounds.isEmpty() ? [] : bounds.max.toArray(),
              worldBoundsCenter: center.toArray(),
              worldBoundsSize: size.toArray()
            });
          });
          return { rootName: root?.name ?? "", samples };
        };
        window.__auroraAreaVfxPreviewGetPostprocessDiagnostics = () =>
          readAreaLightShadowPreviewPostprocessDiagnostics(runtime);
        window.__auroraAreaVfxPreviewGetRuntimeObservability =
          readRuntimeObservability;
        window.__auroraAreaPlaceableLightingGetProofSnapshot =
          readPlaceableLightingProofSnapshot;
        const renderedObjectSamples = renderObjects.map((object) => {
          const root = runtime.objectMeshById.get(object.id);
          const worldPosition = root?.getWorldPosition(new THREE.Vector3()).toArray() ?? [];
          return {
            objectId: object.id,
            resRef: object.resRef,
            sourcePosition: [object.x, object.y, object.z],
            rootPosition: root?.position.toArray() ?? [],
            worldPosition,
            childNames: root?.children.map((child) => child.name) ?? []
          };
        });

        if (cancelled) {
          return;
        }

        const dataset = runtime.container.dataset;
        const injectedCampfire = renderObjects.find(
          (object) => object.id === CAMPFIRE_PROOF_OBJECT_ID
        );
        setSnapshot({
          status: "ready",
          error: "",
          areaId: processedArea.areaId,
          areaName: processedArea.name,
          apiBaseUrl: request.apiBaseUrl,
          displayFog: request.displayFog,
          useAreaLighting: request.useAreaLighting,
          tileProcess: request.tileProcess,
          renderObjects: request.renderObjects,
          includeAreaObjects: request.includeAreaObjects,
          injectCampfire: request.injectCampfire,
          highlightInjectedCampfire: request.highlightInjectedCampfire,
          fullViewport: request.fullViewport,
          canvasWidth: request.canvasWidth,
          canvasHeight: request.canvasHeight,
          tileProcessStatus: tileProcessReadiness.readiness?.status ?? "",
          tileProcessReadyCount: tileProcessReadiness.readiness?.readyCandidateCount ?? 0,
          tileProcessBlockedCount:
            tileProcessReadiness.readiness?.blockedCandidateCount ?? 0,
          tileProcessBlockers: tileProcessReadiness.readiness?.blockerSummary ?? "",
          tileProcessError: tileProcessReadiness.error,
          cacheHit: processed.cache.hit,
          tileCount: scene.tiles.length,
          objectCount: scene.objects.length,
          renderObjectCount: renderObjects.length,
          renderTerrain: request.renderTerrain,
          cameraDistanceScale: request.cameraDistanceScale,
          cameraAzimuthDegrees: request.cameraAzimuthDegrees,
          proofBackdrop: request.proofBackdrop,
          placeableLightingProofProfile: { ...request.lightingProofProfile },
          placeableLightingProof,
          placeableSourceLineageStatus: placeableSourceLineage.status,
          placeableSourceModelObjectKeys:
            placeableSourceLineage.sourceModelObjectKeys,
          placeableSourceModelHashes: placeableSourceLineage.sourceModelHashes,
          placeableSourceLineageBlockers: placeableSourceLineage.blockerCodes,
          placeableLightProjectionStatus: placeableLightProjection.status,
          placeableLightProjectionBlockers: placeableLightProjection.blockerCodes,
          terrainSourceLineageStatus: terrainSourceLineage.status,
          terrainSourceModelObjectKeys: terrainSourceLineage.sourceModelObjectKeys,
          terrainSourceModelHashes: terrainSourceLineage.sourceModelHashes,
          terrainModelAssetObjectKeys: terrainSourceLineage.modelAssetObjectKeys,
          terrainModelAssetHashes: terrainSourceLineage.modelAssetHashes,
          terrainTextureObjectKeys: terrainSourceLineage.textureObjectKeys,
          terrainTextureHashes: terrainSourceLineage.textureHashes,
          terrainSourceLineageBlockers: terrainSourceLineage.blockerCodes,
          objectResRefFilter: request.objectResRefFilter,
          captureTimeSeconds: request.captureTimeSeconds,
          vfxPlaybackRootCount: vfxPlayback.rootCount,
          vfxPlaybackFrameCount: vfxPlayback.frameCount,
          vfxPlaybackDurationSeconds: vfxPlayback.durationSeconds,
          vfxPlaybackCompleted: vfxPlayback.completed,
          vfxVisibleDrawMeshCount: vfxPlayback.visibleDrawMeshCount,
          vfxVisibleDrawParticleCount: vfxPlayback.visibleDrawParticleCount,
          vfxVisibleTextureReferences: vfxPlayback.visibleTextureReferences,
          vfxVisibleDrawBoundsCenter: vfxPlayback.visibleDrawBoundsCenter,
          vfxVisibleDrawBoundsSize: vfxPlayback.visibleDrawBoundsSize,
          vfxVisibleDrawMeshSamples: vfxPlayback.visibleDrawMeshSamples,
          vfxRuntimeObservability: runtimeObservability,
          renderedObjectSamples,
          injectedCampfireObjectId: injectedCampfire?.id ?? "",
          injectedCampfireTemplateId: injectedCampfire?.source?.templateId ?? "",
          injectedCampfireResRef: injectedCampfire?.resRef ?? "",
          injectedCampfireRetailResRef: injectedCampfire
            ? CAMPFIRE_PROOF_RETAIL_RES_REF
            : "",
          injectedCampfirePosition: injectedCampfire
            ? [
                roundNumber(injectedCampfire.x),
                roundNumber(injectedCampfire.y),
                roundNumber(injectedCampfire.z)
              ]
            : [],
          placeableRenderPayloadStatus: placeablePayloadResult.status,
          placeableRenderPayloadCount: Object.keys(
            placeablePayloadResult.payloadByObjectId
          ).length,
          placeableRenderPayloadError: placeablePayloadResult.error,
          placeableTwoDaLightStatus: placeableLightDiagnostics.status,
          placeableTwoDaLightSourceCount: placeableLightDiagnostics.sourceGroups,
          placeableTwoDaLightPointLightCount: placeableLightDiagnostics.pointLights,
          placeableTwoDaLightHaloCount: placeableLightDiagnostics.halos,
          placeableTwoDaLightCoreCount: placeableLightDiagnostics.cores,
          placeableTwoDaLightReceiverCount: placeableLightDiagnostics.receivers,
          placeableTwoDaLightFastShadowCount: placeableLightDiagnostics.fastShadows,
          placeableTwoDaLightDisabledCount:
            placeableLightDiagnostics.disabledByLightState +
            placeableLightDiagnostics.disabledByUseAreaLighting,
          placeableTwoDaLightDisabledByLightStateCount:
            placeableLightDiagnostics.disabledByLightState,
          placeableTwoDaLightDisabledByUseAreaLightingCount:
            placeableLightDiagnostics.disabledByUseAreaLighting,
          placeableTwoDaLightSamples: [...placeableLightDiagnostics.samples],
          placeableModelStatus: dataset.placeableModelStatus ?? "",
          placeableModelMeshCount: Number(dataset.placeableModelMeshCount ?? 0),
          placeableModelUrl: dataset.placeableModelUrl ?? "",
          placeableModelTextureStatus: dataset.placeableModelTextureStatus ?? "",
          placeableModelTextureCount: Number(
            dataset.placeableModelTextureCount ?? 0
          ),
          placeableModelTextureLoaded: Number(
            dataset.placeableModelTextureLoaded ?? 0
          ),
          placeableModelTextureSource: dataset.placeableModelTextureSource ?? "",
          placeableModelTextureSettled:
            isAreaLightShadowPreviewPlaceableTextureSettled(dataset),
          areaGlobalLightingStatus: dataset.areaTerrainAreaGlobalLightingStatus ?? "",
          areaGlobalLightingPhase: dataset.areaTerrainAreaGlobalLightingPhase ?? "",
          areaGlobalLightingFields: dataset.areaTerrainAreaGlobalLightingFields ?? "",
          areaGlobalShadowOpacity: dataset.areaTerrainAreaGlobalShadowOpacity ?? "",
          areaGlobalShadowOpacityFactor:
            dataset.areaTerrainAreaGlobalShadowOpacityFactor ?? "",
          areaGlobalShadowStatus: dataset.areaTerrainAreaGlobalShadowStatus ?? "",
          areaGlobalShadowSourceField:
            dataset.areaTerrainAreaGlobalShadowSourceField ?? "",
          sceneShadowProofStatus: diagnostics.shadow.proofStatus,
          sceneShadowRetailProjectionStatus: diagnostics.shadow.retailProjectionStatus,
          sceneShadowPointLightCastShadowCount:
            diagnostics.shadow.pointLightCastShadowCount,
          sceneShadowPointLightSamples: [...diagnostics.shadow.pointLightShadowSamples],
          sceneShadowItemPropertyLightShadowPolicyCount:
            diagnostics.shadow.itemPropertyLightShadowPolicyCount,
          sceneShadowItemPropertyLightShadowPolicySamples: [
            ...diagnostics.shadow.itemPropertyLightShadowPolicySamples
          ],
          sceneShadowDirectionalLightCastShadowCount:
            diagnostics.shadow.directionalLightCastShadowCount,
          sceneShadowDirectionalLightSamples: [
            ...diagnostics.shadow.directionalLightShadowSamples
          ],
          sceneShadowProgFxType4ShadowRequestCount:
            diagnostics.shadow.progFxType4ShadowRequestCount,
          sceneShadowProgFxType4ShadowRequestSamples: [
            ...diagnostics.shadow.progFxType4ShadowRequestSamples
          ],
          sceneShadowAreaStatus: diagnostics.shadow.areaShadowStatus,
          sceneShadowAreaSourceField: diagnostics.shadow.areaShadowSourceField,
          sceneShadowAreaOpacity:
            diagnostics.shadow.areaShadowOpacity === null
              ? ""
              : String(diagnostics.shadow.areaShadowOpacity),
          sceneShadowAreaOpacityFactor:
            diagnostics.shadow.areaShadowOpacityFactor === null
              ? ""
              : String(diagnostics.shadow.areaShadowOpacityFactor),
          terrainRuntimeStatus: dataset.areaTerrainTileModelRuntimeStatus ?? "",
          terrainLoaderBlockers: dataset.areaTerrainLoaderBlockers ?? "",
          terrainTileModelBlockedCount: Number(
            dataset.areaTerrainTileModelBlockedCount ?? "0"
          ),
          terrainTileModelDeliveryUrlSample:
            dataset.areaTerrainTileModelDeliveryUrlSample ?? "",
          terrainTileModelLoaderErrorSample:
            dataset.areaTerrainTileModelLoaderErrorSample ?? "",
          terrainTileModelBlockedTileSample:
            dataset.areaTerrainTileModelBlockedTileSample ?? "",
          terrainAreaId: dataset.areaTerrainAreaId ?? "",
          terrainTileModelLoadedCount: Number(
            dataset.areaTerrainTileModelLoadedCount ?? 0
          ),
          terrainTileModelVisibleMeshCount: Number(
            dataset.areaTerrainTileModelVisibleMeshCount ?? 0
          ),
          terrainTileModelMaterialMapCount: Number(
            dataset.areaTerrainTileModelMaterialMapCount ?? 0
          ),
          terrainTileModelVisibleMeshSample:
            dataset.areaTerrainTileModelVisibleMeshSample ?? "",
          terrainTileShadowReceiverMeshCount: Number(
            dataset.areaTerrainTileShadowReceiverMeshCount ?? 0
          ),
          terrainTileShadowReceiverStatus:
            dataset.areaTerrainTileShadowReceiverStatus ?? "",
          terrainTileShadowReceiverSource:
            dataset.areaTerrainTileShadowReceiverSource ?? "",
          terrainTileShadowReceiverSample:
            dataset.areaTerrainTileShadowReceiverSample ?? "",
          cameraPosition: [
            roundNumber(runtime.camera.position.x),
            roundNumber(runtime.camera.position.y),
            roundNumber(runtime.camera.position.z)
          ],
          oracleFixture: request.oracleFixture
        });
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            createEmptySnapshot(
              "error",
              request,
              error instanceof Error ? error.stack ?? error.message : String(error)
            )
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      delete window.__auroraAreaVfxPreviewBeginDeterministicCapture;
      delete window.__auroraAreaVfxPreviewRenderAtTime;
      delete window.__auroraAreaVfxPreviewForceRender;
      delete window.__auroraAreaVfxPreviewSetParticleDepthTest;
      delete window.__auroraAreaVfxPreviewGetCompositionSpatialDiagnostics;
      delete window.__auroraAreaVfxPreviewGetPostprocessDiagnostics;
      delete window.__auroraAreaVfxPreviewGetRuntimeObservability;
      delete window.__auroraAreaPlaceableLightingGetProofSnapshot;
      cleanupRuntime?.();
    };
  }, [request]);

  return (
    <main
      data-testid="area-light-shadow-preview-runner"
      data-render-status={snapshot.status}
      data-area-id={snapshot.areaId}
      data-area-name={snapshot.areaName}
      data-api-base-url={snapshot.apiBaseUrl}
      data-cache-hit={snapshot.cacheHit === null ? "" : String(snapshot.cacheHit)}
      data-tile-count={snapshot.tileCount}
      data-object-count={snapshot.objectCount}
      data-render-object-count={snapshot.renderObjectCount}
      data-rendered-object-samples={JSON.stringify(snapshot.renderedObjectSamples)}
      data-render-terrain={String(snapshot.renderTerrain)}
      data-camera-distance-scale={snapshot.cameraDistanceScale}
      data-camera-azimuth-degrees={snapshot.cameraAzimuthDegrees}
      data-proof-backdrop={snapshot.proofBackdrop}
      data-placeable-lighting-proof-profile-version={
        snapshot.placeableLightingProofProfile.version
      }
      data-placeable-lighting-proof-receiver={
        snapshot.placeableLightingProofProfile.receiver
      }
      data-placeable-lighting-proof-point-light={String(
        snapshot.placeableLightingProofProfile.pointLight
      )}
      data-placeable-lighting-proof-halo={String(
        snapshot.placeableLightingProofProfile.halo
      )}
      data-placeable-lighting-proof-vfx={String(
        snapshot.placeableLightingProofProfile.vfx
      )}
      data-placeable-lighting-proof-shadow={String(
        snapshot.placeableLightingProofProfile.shadow
      )}
      data-placeable-lighting-proof-postprocess={String(
        snapshot.placeableLightingProofProfile.postprocess
      )}
      data-placeable-lighting-proof-snapshot-version={
        snapshot.placeableLightingProof?.version ?? ""
      }
      data-placeable-lighting-proof-status={
        snapshot.placeableLightingProof?.status ?? ""
      }
      data-placeable-lighting-proof-retail-parity-status={
        snapshot.placeableLightingProof?.retailParityStatus ?? ""
      }
      data-placeable-lighting-proof-blockers={
        snapshot.placeableLightingProof?.blockerCodes.join("|") ?? ""
      }
      data-placeable-source-lineage-status={snapshot.placeableSourceLineageStatus}
      data-placeable-source-model-object-keys={
        snapshot.placeableSourceModelObjectKeys.join("|")
      }
      data-placeable-source-model-hashes={
        snapshot.placeableSourceModelHashes.join("|")
      }
      data-placeable-source-lineage-blockers={
        snapshot.placeableSourceLineageBlockers.join("|")
      }
      data-placeable-light-projection-status={snapshot.placeableLightProjectionStatus}
      data-placeable-light-projection-blockers={
        snapshot.placeableLightProjectionBlockers.join("|")
      }
      data-terrain-source-lineage-status={snapshot.terrainSourceLineageStatus}
      data-terrain-source-model-object-keys={snapshot.terrainSourceModelObjectKeys.join("|")}
      data-terrain-source-model-hashes={snapshot.terrainSourceModelHashes.join("|")}
      data-terrain-model-asset-object-keys={snapshot.terrainModelAssetObjectKeys.join("|")}
      data-terrain-model-asset-hashes={snapshot.terrainModelAssetHashes.join("|")}
      data-terrain-texture-object-keys={snapshot.terrainTextureObjectKeys.join("|")}
      data-terrain-texture-hashes={snapshot.terrainTextureHashes.join("|")}
      data-terrain-source-lineage-blockers={snapshot.terrainSourceLineageBlockers.join("|")}
      data-placeable-lighting-proof-area-receiver-mesh-count={
        snapshot.placeableLightingProof?.facts.areaReceiverMeshCount ?? 0
      }
      data-placeable-lighting-proof-debug-receiver-mesh-count={
        snapshot.placeableLightingProof?.facts.debugReceiverMeshCount ?? 0
      }
      data-placeable-lighting-proof-reactive-material-count={
        snapshot.placeableLightingProof?.facts.reactiveReceiverMaterialCount ?? 0
      }
      data-placeable-lighting-proof-unlit-material-count={
        snapshot.placeableLightingProof?.facts.unlitReceiverMaterialCount ?? 0
      }
      data-placeable-lighting-proof-unknown-material-count={
        snapshot.placeableLightingProof?.facts.unknownReceiverMaterialCount ?? 0
      }
      data-placeable-lighting-proof-point-light-count={
        snapshot.placeableLightingProof?.facts.pointLightCount ?? 0
      }
      data-placeable-lighting-proof-receiver-material-families={JSON.stringify(
        snapshot.placeableLightingProof?.facts.receiverMaterialFamilies ?? []
      )}
      data-object-resref-filter={snapshot.objectResRefFilter}
      data-capture-time-seconds={snapshot.captureTimeSeconds ?? ""}
      data-vfx-playback-root-count={snapshot.vfxPlaybackRootCount}
      data-vfx-playback-frame-count={snapshot.vfxPlaybackFrameCount}
      data-vfx-playback-duration-seconds={snapshot.vfxPlaybackDurationSeconds}
      data-vfx-playback-completed={String(snapshot.vfxPlaybackCompleted)}
      data-vfx-visible-draw-mesh-count={snapshot.vfxVisibleDrawMeshCount}
      data-vfx-visible-draw-particle-count={snapshot.vfxVisibleDrawParticleCount}
      data-vfx-visible-texture-references={snapshot.vfxVisibleTextureReferences.join("|")}
      data-vfx-runtime-observability-version={
        snapshot.vfxRuntimeObservability?.version ?? ""
      }
      data-vfx-runtime-identity-status={
        snapshot.vfxRuntimeObservability?.identity.status ?? ""
      }
      data-vfx-runtime-host-graph-status={
        snapshot.vfxRuntimeObservability?.hostGraph.status ?? ""
      }
      data-vfx-runtime-asset-settlement-status={
        snapshot.vfxRuntimeObservability?.assetSettlement.status ?? ""
      }
      data-vfx-runtime-draw-ledger-status={
        snapshot.vfxRuntimeObservability?.drawLedger.status ?? ""
      }
      data-vfx-runtime-playback-guard-status={
        snapshot.vfxRuntimeObservability?.playbackGuard.status ?? ""
      }
      data-vfx-runtime-proof-gate-status={
        snapshot.vfxRuntimeObservability?.proofGate.status ?? ""
      }
      data-vfx-runtime-proof-blockers={
        snapshot.vfxRuntimeObservability?.proofGate.blockerManifest.join("|") ??
        ""
      }
      data-display-fog={String(snapshot.displayFog)}
      data-use-area-lighting={String(snapshot.useAreaLighting)}
      data-tile-process={String(snapshot.tileProcess)}
      data-render-objects={String(snapshot.renderObjects)}
      data-include-area-objects={String(snapshot.includeAreaObjects)}
      data-inject-campfire={String(snapshot.injectCampfire)}
      data-highlight-injected-campfire={String(snapshot.highlightInjectedCampfire)}
      data-full-viewport={String(snapshot.fullViewport)}
      data-canvas-width={snapshot.canvasWidth}
      data-canvas-height={snapshot.canvasHeight}
      data-tile-process-status={snapshot.tileProcessStatus}
      data-tile-process-ready-count={snapshot.tileProcessReadyCount}
      data-tile-process-blocked-count={snapshot.tileProcessBlockedCount}
      data-tile-process-blockers={snapshot.tileProcessBlockers}
      data-tile-process-error={snapshot.tileProcessError}
      data-injected-campfire-object-id={snapshot.injectedCampfireObjectId}
      data-injected-campfire-template-id={snapshot.injectedCampfireTemplateId}
      data-injected-campfire-res-ref={snapshot.injectedCampfireResRef}
      data-injected-campfire-retail-res-ref={snapshot.injectedCampfireRetailResRef}
      data-injected-campfire-position={snapshot.injectedCampfirePosition.join(",")}
      data-placeable-render-payload-status={snapshot.placeableRenderPayloadStatus}
      data-placeable-render-payload-count={snapshot.placeableRenderPayloadCount}
      data-placeable-render-payload-error={snapshot.placeableRenderPayloadError}
      data-placeable-two-da-light-status={snapshot.placeableTwoDaLightStatus}
      data-placeable-two-da-light-source-count={snapshot.placeableTwoDaLightSourceCount}
      data-placeable-two-da-light-point-light-count={
        snapshot.placeableTwoDaLightPointLightCount
      }
      data-placeable-two-da-light-halo-count={snapshot.placeableTwoDaLightHaloCount}
      data-placeable-two-da-light-core-count={snapshot.placeableTwoDaLightCoreCount}
      data-placeable-two-da-light-receiver-count={snapshot.placeableTwoDaLightReceiverCount}
      data-placeable-two-da-light-fast-shadow-count={
        snapshot.placeableTwoDaLightFastShadowCount
      }
      data-placeable-two-da-light-disabled-count={snapshot.placeableTwoDaLightDisabledCount}
      data-placeable-two-da-light-disabled-by-light-state-count={
        snapshot.placeableTwoDaLightDisabledByLightStateCount
      }
      data-placeable-two-da-light-disabled-by-use-area-lighting-count={
        snapshot.placeableTwoDaLightDisabledByUseAreaLightingCount
      }
      data-placeable-two-da-light-samples={snapshot.placeableTwoDaLightSamples.join("|")}
      data-placeable-model-status={snapshot.placeableModelStatus}
      data-placeable-model-mesh-count={snapshot.placeableModelMeshCount}
      data-placeable-model-url={snapshot.placeableModelUrl}
      data-placeable-model-texture-status={snapshot.placeableModelTextureStatus}
      data-placeable-model-texture-count={snapshot.placeableModelTextureCount}
      data-placeable-model-texture-loaded={snapshot.placeableModelTextureLoaded}
      data-placeable-model-texture-source={snapshot.placeableModelTextureSource}
      data-placeable-model-texture-settled={String(
        snapshot.placeableModelTextureSettled
      )}
      data-area-global-lighting-status={snapshot.areaGlobalLightingStatus}
      data-area-global-lighting-phase={snapshot.areaGlobalLightingPhase}
      data-area-global-lighting-fields={snapshot.areaGlobalLightingFields}
      data-area-global-shadow-opacity={snapshot.areaGlobalShadowOpacity}
      data-area-global-shadow-opacity-factor={snapshot.areaGlobalShadowOpacityFactor}
      data-area-global-shadow-status={snapshot.areaGlobalShadowStatus}
      data-area-global-shadow-source-field={snapshot.areaGlobalShadowSourceField}
      data-scene-shadow-proof-status={snapshot.sceneShadowProofStatus}
      data-scene-shadow-retail-projection-status={
        snapshot.sceneShadowRetailProjectionStatus
      }
      data-scene-shadow-point-light-cast-shadow-count={
        snapshot.sceneShadowPointLightCastShadowCount
      }
      data-scene-shadow-point-light-samples={
        snapshot.sceneShadowPointLightSamples.join("|")
      }
      data-scene-shadow-item-property-light-shadow-policy-count={
        snapshot.sceneShadowItemPropertyLightShadowPolicyCount
      }
      data-scene-shadow-item-property-light-shadow-policy-samples={
        snapshot.sceneShadowItemPropertyLightShadowPolicySamples.join("|")
      }
      data-scene-shadow-directional-light-cast-shadow-count={
        snapshot.sceneShadowDirectionalLightCastShadowCount
      }
      data-scene-shadow-directional-light-samples={
        snapshot.sceneShadowDirectionalLightSamples.join("|")
      }
      data-scene-shadow-progfx-type4-shadow-request-count={
        snapshot.sceneShadowProgFxType4ShadowRequestCount
      }
      data-scene-shadow-progfx-type4-shadow-request-samples={
        snapshot.sceneShadowProgFxType4ShadowRequestSamples.join("|")
      }
      data-scene-shadow-area-status={snapshot.sceneShadowAreaStatus}
      data-scene-shadow-area-source-field={snapshot.sceneShadowAreaSourceField}
      data-scene-shadow-area-opacity={snapshot.sceneShadowAreaOpacity}
      data-scene-shadow-area-opacity-factor={snapshot.sceneShadowAreaOpacityFactor}
      data-terrain-runtime-status={snapshot.terrainRuntimeStatus}
      data-terrain-loader-blockers={snapshot.terrainLoaderBlockers}
      data-terrain-tile-model-blocked-count={snapshot.terrainTileModelBlockedCount}
      data-terrain-tile-model-delivery-url-sample={snapshot.terrainTileModelDeliveryUrlSample}
      data-terrain-tile-model-loader-error-sample={snapshot.terrainTileModelLoaderErrorSample}
      data-terrain-tile-model-blocked-tile-sample={snapshot.terrainTileModelBlockedTileSample}
      data-terrain-area-id={snapshot.terrainAreaId}
      data-terrain-tile-model-loaded-count={snapshot.terrainTileModelLoadedCount}
      data-terrain-tile-model-visible-mesh-count={
        snapshot.terrainTileModelVisibleMeshCount
      }
      data-terrain-tile-model-material-map-count={
        snapshot.terrainTileModelMaterialMapCount
      }
      data-terrain-tile-model-visible-mesh-sample={
        snapshot.terrainTileModelVisibleMeshSample
      }
      data-terrain-tile-shadow-receiver-mesh-count={
        snapshot.terrainTileShadowReceiverMeshCount
      }
      data-terrain-tile-shadow-receiver-status={
        snapshot.terrainTileShadowReceiverStatus
      }
      data-terrain-tile-shadow-receiver-source={
        snapshot.terrainTileShadowReceiverSource
      }
      data-terrain-tile-shadow-receiver-sample={
        snapshot.terrainTileShadowReceiverSample
      }
      data-camera-position={snapshot.cameraPosition.join(",")}
      data-oracle-fixture={snapshot.oracleFixture}
      data-error={snapshot.error}
      style={{
        margin: 0,
        minHeight: snapshot.fullViewport ? `${snapshot.canvasHeight}px` : "100vh",
        width: snapshot.fullViewport ? `${snapshot.canvasWidth}px` : "auto",
        display: "grid",
        placeItems: snapshot.fullViewport ? "stretch" : "center",
        background: "#07111b",
        overflow: "hidden"
      }}
    >
      <div
        ref={hostRef}
        aria-label="area light shadow render canvas"
        style={{ width: snapshot.canvasWidth, height: snapshot.canvasHeight }}
      />
      <script
        id="area-light-shadow-preview-frame"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            ...snapshot,
            sceneShadowPointLightSamples: splitDatasetList(
              snapshot.sceneShadowPointLightSamples.join("|")
            ),
            sceneShadowItemPropertyLightShadowPolicySamples: splitDatasetList(
              snapshot.sceneShadowItemPropertyLightShadowPolicySamples.join("|")
            ),
            sceneShadowDirectionalLightSamples: splitDatasetList(
              snapshot.sceneShadowDirectionalLightSamples.join("|")
            ),
            sceneShadowProgFxType4ShadowRequestSamples: splitDatasetList(
              snapshot.sceneShadowProgFxType4ShadowRequestSamples.join("|")
            ),
            placeableTwoDaLightSamples: splitDatasetList(
              snapshot.placeableTwoDaLightSamples.join("|")
            )
          })
        }}
      />
    </main>
  );
}
