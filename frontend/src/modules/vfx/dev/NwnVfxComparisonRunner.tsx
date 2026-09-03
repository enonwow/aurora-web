import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import {
  applyAuroraVfxCanonicalTextureSamplerState,
  advanceAuroraVfxCanonicalRuntimePlayback,
  createAuroraVfxCanonicalRenderGroup,
  seekAuroraVfxCanonicalRuntimePlayback,
  updateAuroraVfxCanonicalCameraBillboards,
  type AuroraVfxCanonicalModelGraph,
  type AuroraVfxCanonicalTextureSamplerState
} from "../../layout/adapters/three/auroraVfxCanonicalRenderer";
import {
  AURORA_RETAIL_BLOOM_DEFAULT_PROFILE,
  AuroraRetailBloomPass
} from "../../layout/adapters/three/auroraRetailBloomPass";
import { installAuroraVfxRenderQueueSort } from "../../layout/adapters/three/auroraVfxRenderQueue";
import { installAuroraLinearLightFalloffShaderChunk } from "../../layout/adapters/three/auroraThreeLightFalloff";
import { resolveAuroraTerrainTileSourceLightProfile } from "../../layout/adapters/three/auroraTerrainTileSourceLight";
import { installAuroraMdlSourceMaterialLighting } from "../../shared/adapters/three/auroraMdlSourceMaterialLighting";
import { resolveAuroraAreaRenderTileModelOrientation } from "../../layout/adapters/three/workspaceAreaRenderCoordinates";
import {
  probeBackendHealth,
  type BackendRuntimeBuildIdentity
} from "../../auth/adapters/httpBackendAuthFacade";
import type { AuroraVfxPayload } from "../../scene/contracts";
import type { PlaceableRenderPackageTextureBinding } from "../../placeables/contracts";
import {
  createVfxRuntimeObservabilityReport,
  recordVfxRuntimeAssetSettlement,
  registerVfxRuntimeExpectedAssets,
  setVfxRuntimeAssetBound,
  type VfxRuntimeExpectedAsset
} from "../application/vfxRuntimeObservability";
import {
  applyAuroraVfxObjectAttachmentPosition,
  type AuroraVfxObjectAttachmentResult,
  type AuroraVfxObjectAttachmentTargetKind
} from "../application/auroraVfxObjectAttachment";
import {
  materializeVfxPresentationProfile,
  shouldMaterializeVfxDiagnosticReference,
  type AuroraVfxComparisonViewProfile,
  type AuroraVfxPresentationProfile
} from "../domain/vfxIdentityNeutralProfiles";
import {
  loadNwnVfxProofSceneActor,
  type NwnVfxLoadedProofSceneActor,
  type NwnVfxProofSceneActor
} from "./NwnVfxProofSceneActorLoader";
import {
  ensureAuroraSourceHierarchyObjects,
  flipPlaceableTextureRows,
  type AuroraSourceHierarchySynthesisResult
} from "../../placeables/adapters/three/placeableThreeAssetLoader";
import { decodeAuroraTpcTexture } from "../../placeables/adapters/aurora/auroraTpcTextureDecoder";

const ROUTE = "/dev/nwn-vfx-comparison";
const DEFAULT_FIXTURE_ID = "vfx-nwn-web-row44";
const ALLOWED_FIXTURE_IDS = new Set([
  DEFAULT_FIXTURE_ID,
  "vfx-nwn-web-row28",
  "vfx-nwn-web-row68",
  "vfx-nwn-web-row22",
  "vfx-broad-row44",
  "vfx-broad-row50",
  "vfx-broad-row50-placeable",
  "vfx-broad-row210",
  "vfx-broad-row216",
  "vfx-broad-row181",
  "vfx-broad-row1",
  "vfx-broad-aoe0"
]);
const PRE_ROLL_SECONDS = 2;
const POST_ROLL_SECONDS = 2;
const SELF_RECORD_FPS = 12;
const SELF_RECORD_DURATION_SECONDS = 15.5;
const SELF_RECORD_CHUNK_SIZE = 12;

export function createNwnVfxProofSceneDdsTexture(
  bytes: ArrayBuffer
): THREE.DataTexture | null {
  const decoded = decodeAuroraTpcTexture(bytes);
  if (!decoded) return null;
  const texture = new THREE.DataTexture(
    flipPlaceableTextureRows(decoded.data, decoded.width, decoded.height),
    decoded.width,
    decoded.height,
    THREE.RGBAFormat
  );
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.userData = {
    ...texture.userData,
    auroraSourceFormat: decoded.sourceFormat,
    auroraTextureHasAlpha: decoded.hasAlpha,
    auroraTextureIsBimodal: decoded.isBimodal,
    auroraTextureSoftAlphaPixelRatio: decoded.softAlphaPixelRatio
  };
  return texture;
}

async function loadNwnVfxProofSceneTexture(
  resourceKey: string,
  texturePath: string
): Promise<THREE.Texture> {
  if (resourceKey.toLowerCase().endsWith(".tga")) {
    return new TGALoader().loadAsync(texturePath);
  }
  if (resourceKey.toLowerCase().endsWith(".dds")) {
    const response = await fetch(texturePath);
    if (!response.ok) {
      throw new Error(
        `Failed to load proof-scene DDS ${resourceKey}: HTTP ${response.status}`
      );
    }
    const texture = createNwnVfxProofSceneDdsTexture(await response.arrayBuffer());
    if (!texture) {
      throw new Error(`Unsupported proof-scene Aurora texture encoding: ${resourceKey}`);
    }
    return texture;
  }
  return new THREE.TextureLoader().loadAsync(texturePath);
}

export function selectNwnVfxObjectAttachmentTargetRoots(
  actorRoots: THREE.Object3D[]
): THREE.Object3D[] {
  return actorRoots.filter(
    (root) => root.userData.auroraVfxProofSceneActorRole === "target_creature"
  );
}

export interface NwnVfxObjectAttachmentProofTargetContract {
  version?: "aurora-vfx-object-attachment-target/v1";
  phase?: "impact" | "cessation";
  targetKind?: AuroraVfxObjectAttachmentTargetKind;
  sourceKind?: "actor-role" | "proof-scene-model-instance";
  sourceId?: string;
  targetSpecialNodePrefix?: string;
}

export interface NwnVfxObjectAttachmentProofTarget {
  status:
    | "resolved"
    | "resolved-default-creature"
    | "contract-invalid"
    | "target-missing";
  phase: "impact" | "cessation";
  targetKind: AuroraVfxObjectAttachmentTargetKind;
  targetSpecialNodePrefix: string;
  targetRoots: THREE.Object3D[];
}

export function resolveNwnVfxObjectAttachmentProofTarget(input: {
  contract?: NwnVfxObjectAttachmentProofTargetContract;
  actorRoots: THREE.Object3D[];
  modelRoots: THREE.Object3D[];
}): NwnVfxObjectAttachmentProofTarget {
  if (!input.contract) {
    const targetRoots = selectNwnVfxObjectAttachmentTargetRoots(input.actorRoots);
    return {
      status:
        targetRoots.length === 1
          ? "resolved-default-creature"
          : "target-missing",
      phase: "impact",
      targetKind: "creature",
      targetSpecialNodePrefix: "",
      targetRoots: targetRoots.length === 1 ? targetRoots : []
    };
  }

  const contract = input.contract;
  const phase =
    contract.phase === "cessation" ? "cessation" : "impact";
  const targetKind =
    contract.targetKind === "placeable" || contract.targetKind === "door"
      ? contract.targetKind
      : "creature";
  const targetSpecialNodePrefix =
    contract.targetSpecialNodePrefix?.trim() ?? "";
  const sourceId = contract.sourceId?.trim() ?? "";
  const validContract =
    contract.version === "aurora-vfx-object-attachment-target/v1" &&
    (contract.phase === "impact" || contract.phase === "cessation") &&
    (contract.targetKind === "creature" ||
      contract.targetKind === "placeable" ||
      contract.targetKind === "door") &&
    (contract.sourceKind === "actor-role" ||
      contract.sourceKind === "proof-scene-model-instance") &&
    sourceId.length > 0 &&
    (targetKind === "creature" || targetSpecialNodePrefix.length > 0);
  if (!validContract) {
    return {
      status: "contract-invalid",
      phase,
      targetKind,
      targetSpecialNodePrefix,
      targetRoots: []
    };
  }

  const candidates =
    contract.sourceKind === "actor-role"
      ? input.actorRoots.filter(
          (root) =>
            root.userData.auroraVfxProofSceneActorRole === sourceId
        )
      : input.modelRoots.filter(
          (root) =>
            root.userData.auroraVfxProofSceneModelInstanceId === sourceId
        );
  return {
    status: candidates.length === 1 ? "resolved" : "target-missing",
    phase,
    targetKind,
    targetSpecialNodePrefix,
    targetRoots: candidates.length === 1 ? candidates : []
  };
}

export function resolveNwnVfxComparisonPlaybackTimeline(input: {
  elapsedSeconds: number;
  preRollSeconds: number;
  durationSeconds: number;
  fixedTimeSeconds?: number | null;
  playbackRate?: number;
  playbackDelaySeconds?: number;
}): {
  effectSeconds: number;
  clampedEffectSeconds: number;
  playbackSeekSeconds: number;
  wallEffectSeconds: number;
  playbackRate: number;
  playbackDelaySeconds: number;
  effectiveWallDurationSeconds: number;
  phase: "baseline" | "effect" | "post";
  groupVisible: boolean;
} {
  const elapsedSeconds = Math.max(0, input.elapsedSeconds);
  const durationSeconds = Math.max(0, input.durationSeconds);
  const fixedTimeSeconds = input.fixedTimeSeconds ?? null;
  const playbackRate =
    Number.isFinite(input.playbackRate) && (input.playbackRate ?? 0) > 0
      ? input.playbackRate as number
      : 1;
  const playbackDelaySeconds =
    Number.isFinite(input.playbackDelaySeconds) &&
    (input.playbackDelaySeconds ?? -1) >= 0
      ? input.playbackDelaySeconds as number
      : 0;
  const preRollSeconds = Math.max(0, input.preRollSeconds);
  const wallEffectSeconds = Math.max(0, elapsedSeconds - preRollSeconds);
  const effectiveWallDurationSeconds =
    playbackDelaySeconds + durationSeconds / playbackRate;
  // fixedTimeSeconds is a source-time calibration contract. It must remain
  // stable when a retail-oracle playback profile changes wall-clock timing.
  const effectSeconds = fixedTimeSeconds ?? Math.max(
    0,
    (wallEffectSeconds - playbackDelaySeconds) * playbackRate
  );
  const clampedEffectSeconds = Math.min(durationSeconds, effectSeconds);
  const phase =
    fixedTimeSeconds !== null
      ? "effect"
      : elapsedSeconds < preRollSeconds + playbackDelaySeconds
        ? "baseline"
        : wallEffectSeconds <= effectiveWallDurationSeconds
          ? "effect"
          : "post";
  return {
    effectSeconds,
    clampedEffectSeconds,
    // Keep the raw logical time: seek() owns terminal-frame clamping and can
    // therefore record that a post-duration frame was hidden.
    playbackSeekSeconds: effectSeconds,
    wallEffectSeconds,
    playbackRate,
    playbackDelaySeconds,
    effectiveWallDurationSeconds,
    phase,
    groupVisible:
      fixedTimeSeconds !== null ||
      (elapsedSeconds >= preRollSeconds + playbackDelaySeconds &&
        wallEffectSeconds <= effectiveWallDurationSeconds)
  };
}

export type NwnVfxComparisonViewProfile = AuroraVfxComparisonViewProfile;

const DEFAULT_NWN_VFX_LOADING_VIEW_PROFILE: NwnVfxComparisonViewProfile = {
  projection: "orthographic",
  viewportWidth: 960,
  viewportHeight: 540,
  cameraHalfWidth: 1.2,
  cameraHalfHeight: 0.675,
  perspectiveFovDegrees: 0,
  cameraPosition: [0, 1.4, 2.2],
  cameraUp: [0, 1, 0],
  cameraLookAt: [0, 0, 0],
  receiverSize: [2.2, 1.12],
  receiverPosition: [0, 0, -0.34],
  receiverRotationX: 0,
  targetRadius: 0.11,
  targetLength: 0.32,
  targetPosition: [0, -0.16, -0.16]
};

function applyNwnVfxComparisonCameraViewOffset(
  camera: THREE.PerspectiveCamera | THREE.OrthographicCamera,
  profile: NwnVfxComparisonViewProfile
): void {
  if (!(camera instanceof THREE.PerspectiveCamera)) return;
  const [offsetX, offsetY] = profile.cameraViewOffsetPixels ?? [0, 0];
  if (offsetX === 0 && offsetY === 0) return;
  camera.setViewOffset(
    profile.viewportWidth,
    profile.viewportHeight,
    offsetX,
    offsetY,
    profile.viewportWidth,
    profile.viewportHeight
  );
}

export function projectNwnVfxComparisonWorldPointToPixel(
  profile: NwnVfxComparisonViewProfile,
  worldPosition: readonly [number, number, number]
): [number, number] {
  const camera = profile.projection === "perspective"
    ? new THREE.PerspectiveCamera(
        profile.perspectiveFovDegrees,
        profile.viewportWidth / profile.viewportHeight,
        0.1,
        100
      )
    : new THREE.OrthographicCamera(
        -profile.cameraHalfWidth,
        profile.cameraHalfWidth,
        profile.cameraHalfHeight,
        -profile.cameraHalfHeight,
        0.1,
        100
      );
  camera.position.set(...profile.cameraPosition);
  camera.up.set(...profile.cameraUp);
  camera.lookAt(...profile.cameraLookAt);
  applyNwnVfxComparisonCameraViewOffset(camera, profile);
  camera.updateMatrixWorld(true);
  const projected = new THREE.Vector3(...worldPosition).project(camera);
  return [
    (projected.x + 1) * profile.viewportWidth * 0.5,
    (1 - projected.y) * profile.viewportHeight * 0.5
  ];
}

export function measureNwnVfxComparisonCameraCalibration(
  profile: NwnVfxComparisonViewProfile
): {
  status: "not-configured" | "pass" | "fail";
  rmsErrorPixels: number | null;
  tolerancePixels: number | null;
  sampleCount: number;
} {
  const calibration = profile.cameraCalibration;
  if (!calibration || calibration.samples.length === 0) {
    return {
      status: "not-configured",
      rmsErrorPixels: null,
      tolerancePixels: null,
      sampleCount: 0
    };
  }
  const squaredErrors = calibration.samples.map((sample) => {
    const projected = projectNwnVfxComparisonWorldPointToPixel(
      profile,
      sample.worldPosition
    );
    return (
      (projected[0] - sample.retailPixelPosition[0]) ** 2 +
      (projected[1] - sample.retailPixelPosition[1]) ** 2
    );
  });
  const rmsErrorPixels = Math.sqrt(
    squaredErrors.reduce((sum, value) => sum + value, 0) /
      squaredErrors.length
  );
  return {
    status:
      rmsErrorPixels <= calibration.rmsTolerancePixels ? "pass" : "fail",
    rmsErrorPixels,
    tolerancePixels: calibration.rmsTolerancePixels,
    sampleCount: calibration.samples.length
  };
}

interface RunnerStatus {
  state: "loading" | "ready" | "error";
  phase: "baseline" | "effect" | "post";
  elapsedSeconds: number;
  effectSeconds: number;
  frameIndex: number;
  frameCount: number;
  drawParticles: number;
  renderedChunkModels: number;
  boundChunkMaterialCount: number;
  visibleFrameCount: number;
  aoeVisualOwnerCount: number;
  aoePhaseCounts: string;
  objectDurationVisualOwnerPhase: string;
  objectDurationVisualOwnerActive: boolean;
  objectDurationVisualOwnerEffectRemovalStarted: boolean;
  objectDurationVisualOwnerTimerRemainingMilliseconds: number;
  objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds: number;
  objectDurationVisualOwnerRemovalProcessedAtMilliseconds: number;
  objectDurationVisualOwnerLastUpdateAtMilliseconds: number;
  sourceLightCount: number;
  sourceLightColor: string;
  sourceLightRadius: number;
  sourceLightIntensity: number;
  collisionProfile: string;
  collisionQueryCount: number;
  collisionHitCount: number;
  collisionAppliedHitCount: number;
  collisionStaticNoHitCount: number;
  collisionLandedParticleCount: number;
  bloomStatus: string;
  bloomDownscaleOffset: number;
  bloomDownscaleSteps: number;
  bloomThreshold: number;
  bloomSoftness: number;
  bloomMultiplier: number;
  bloomNormalizationFactor: number;
  ssaoConfiguredEnabled: boolean;
  ssaoRuntimeStatus: string;
  ssaoIntensity: number;
  ssaoShaderQualityMode: number;
  ssaoPassCount: number;
  ssaoBlendSourceFactor: string;
  ssaoBlendDestinationFactor: string;
  ssaoStageOrder: string;
  ssaoFragmentSourceSha256: string;
  ssaoIncludeSourceSha256: string;
  ssaoFramebufferSourceSha256: string;
  ssaoVertexSourceSha256: string;
  rawGammaNormalVfxMeshCount: number;
  rawGammaAdditiveVfxMeshCount: number;
  colorPipelineStageOrder: string;
  textureSamplerStates: string;
  meshDiagnostics: string;
  programDiagnostics: string;
  framebufferPixelDiagnostics: string;
  vfxRuntimeObservabilityVersion: string;
  vfxRuntimeIdentityStatus: string;
  vfxRuntimeHostGraphStatus: string;
  vfxRuntimeAssetSettlementStatus: string;
  vfxRuntimeDrawLedgerStatus: string;
  vfxRuntimePlaybackGuardStatus: string;
  vfxRuntimeProofGateStatus: string;
  vfxRuntimeProofBlockers: string;
  visualParityReadinessStatus: string;
  visualParityBlockers: string;
  vfxDebugOverlayEnabled: boolean;
  vfxDebugOverlayFinalProfileDisabled: boolean;
  objectAttachmentStatus: string;
  objectAttachmentNode: string;
  objectAttachmentWorldPosition: string;
  message: string;
}

export interface NwnVfxProofSceneAreaLighting {
  status?: string;
  areaResref?: string;
  sourcePath?: string;
  sourceSha256?: string;
  phase?: "sun" | "moon";
  fields?: Array<{ field?: string; value?: number }>;
  ambientColorPacked?: number;
  ambientColorRgb?: [number, number, number];
  diffuseColorPacked?: number;
  diffuseColorRgb?: [number, number, number];
  directionalPosition?: [number, number, number];
  localTileLightingStatus?: string;
}

export interface NwnVfxProofSceneTileLight {
  channel?: "mainLight1" | "mainLight2" | "sourceLight1" | "sourceLight2";
  role?: "main" | "source";
  rowId?: number;
  colorRgb?: [number, number, number];
  colorSource?: string;
  colorSourceSha256?: string;
  rendererStatus?:
    | "source-node-resolved"
    | "source-node-absent-by-aurora-slot-count"
    | "source-node-unresolved"
    | "static-main-lane-not-reconstructed"
    | "main-native-node-resolved"
    | "main-native-node-unresolved";
  sourceNode?: {
    name?: string;
    position?: [number, number, number];
    coordinateSpace?: "model-local-aurora-z-up";
  };
  sourceSlotIndex?: 1 | 2;
  sourceNodeCount?: number;
  sourceSlotProofStatus?: "source-backed-tile-mdl-source-light-slot-count";
  sourceRadius?: number;
  sourceRadiusUnits?: "aurora-model-units";
  sourceMultiplier?: number;
  sourceMultiplierStatus?: string;
  nativeNode?: {
    name?: string;
    position?: [number, number, number];
    coordinateSpace?: "model-local-aurora-z-up";
    radius?: number;
    multiplier?: number;
    lightPriority?: number;
    ambientOnly?: boolean;
    dynamicType?: number;
    affectDynamic?: boolean;
    shadow?: boolean;
    sourceModelFileName?: string;
    sourceModelObjectKey?: string;
    sourceModelHash?: string;
    proofStatus?: string;
  };
}

export interface FixtureManifest {
  fixtureId?: string;
  sourceModel?: {
    resref?: string;
    sha256?: string;
  };
  sourceRenderableModel?: {
    version?: "aurora-vfx-source-model-renderable/v1";
    resref?: string;
    resourceKey?: string;
    sourceSha256?: string;
    sourceGeometryNodeCount?: number;
  };
  emitterNames?: string[];
  sourceEmitterNames?: string[];
  sourceLightNames?: string[];
  textures?: Array<{
    resref?: string;
    resourceKey?: string;
    txi?: AuroraVfxCanonicalTextureSamplerState;
  }>;
  texture?: { resref?: string };
  chunks?: Array<{
    resourceKey?: string;
    sourceStaticGeometryCount?: number;
    hostGraphLifecycle?: "persistent" | "transient";
    runtimePayloadResourceKey?: string;
    runtimePayloadSourceModelObjectKey?: string;
    sourceEmitterNames?: string[];
  }>;
  collisionOracle?: {
    staticTraversalProfile?: string;
    runtimeSummary?: {
      queryCount?: number;
      hitCount?: number;
      appliedHitCount?: number;
      staticNoHitCount?: number;
      landedParticleIds?: number[];
    };
  };
  comparisonContext?: {
    cameraMatchEstablished?: boolean;
    sceneMatchEstablished?: boolean;
    ownerTargetMatchEstablished?: boolean;
    comparisonStatus?: string;
  };
  nativeOracleCalibration?: {
    version?: "aurora-vfx-native-oracle-calibration/v1";
    sourceEvidence?: string;
    runtimeSeed?: number;
    additiveParticleRadianceScale?: number;
    bloomMultiplier?: number;
    viewportWidth?: number;
    viewportHeight?: number;
    runtimePlaybackRate?: number;
    runtimePlaybackDelaySeconds?: number;
    runtimeTimingCalibrationMethod?:
      | "matched-native-trigger-relative-onset-and-last-visible"
      | "aurora-active-animation-source-time-speed-1";
    nativeTriggerRelativeOnsetSeconds?: number;
    nativeTriggerRelativeLastVisibleSeconds?: number;
    sourceOnsetSeconds?: number;
    sourceDynamicPeakSeconds?: number;
    sourceLastVisibleSeconds?: number;
  };
  proofLifecycle?: {
    requestedDurationSeconds?: number;
    runtimeDurationSeconds?: number;
    groupMotion?: {
      from: [number, number, number];
      to: [number, number, number];
      durationSeconds: number;
    };
  };
  proofScene?: {
    status?: string;
    sourceCoordinateSpace?: "aurora-z-up";
    nativeBaselineLightingCalibration?: {
      areaGlobalScale: number;
      tileLocalScale: number;
      sourceEvidence: string;
      method: "matched-empty-scene-roi-luma-rmse";
    };
    effectOriginAlignment?: {
      offset: [number, number, number];
      sourceEvidence: string;
      method:
        | "native-vfx-positive-luminance-centroid"
        | "source-location-rebased-scene-origin";
    };
    meshFilter?: string;
    meshVisibilityRule?: {
      version: "nwn-vfx-proof-scene-mesh-visibility-rule/v1";
      kind: "model-y-maximum";
      maximumY: number;
      comparisonAdmission: "diagnostic-only" | "comparison-scene";
      sourceEvidence: string;
    };
    areaLighting?: NwnVfxProofSceneAreaLighting;
    models?: Array<{
      role?: string;
      instanceId?: string;
      sourceResref?: string;
      resourceKey?: string;
      translation?: [number, number, number];
      orientationQuarterTurns?: number;
      tileLights?: NwnVfxProofSceneTileLight[];
    }>;
    textures?: Array<{
      resref?: string;
      resourceKey?: string;
    }>;
    actors?: NwnVfxProofSceneActor[];
    objectAttachmentTarget?: NwnVfxObjectAttachmentProofTargetContract;
  };
}

export interface NwnVfxComparisonVisualParityReadiness {
  status: "ready" | "diagnostic-only";
  comparisonStatus: string;
  blockerManifest: string[];
}

export function resolveNwnVfxComparisonVisualParityReadiness(
  manifest: FixtureManifest
): NwnVfxComparisonVisualParityReadiness {
  const comparisonContext = manifest.comparisonContext;
  if (!comparisonContext) {
    return {
      status: "diagnostic-only",
      comparisonStatus: "comparison-context-missing",
      blockerManifest: ["comparison-context-missing"]
    };
  }

  const blockers: string[] = [];
  if (comparisonContext.cameraMatchEstablished !== true) {
    blockers.push("camera-match-unproven");
  }
  if (comparisonContext.sceneMatchEstablished !== true) {
    blockers.push("scene-match-unproven");
  }
  if (comparisonContext.ownerTargetMatchEstablished !== true) {
    blockers.push("owner-target-match-unproven");
  }
  if (
    manifest.proofScene?.meshVisibilityRule?.comparisonAdmission ===
    "diagnostic-only"
  ) {
    blockers.push("proof-scene-mesh-visibility-rule-diagnostic-only");
  }

  const tileLights = (manifest.proofScene?.models ?? []).flatMap(
    (model) => model.tileLights ?? []
  );
  const unresolvedSourceLightCount = tileLights.filter(
    (light) => light.rendererStatus === "source-node-unresolved"
  ).length;
  if (unresolvedSourceLightCount > 0) {
    blockers.push(
      `tile-source-lights-unresolved:${unresolvedSourceLightCount}`
    );
  }
  const unreconstructedMainLaneCount = tileLights.filter(
    (light) =>
      light.rendererStatus === "static-main-lane-not-reconstructed" ||
      light.rendererStatus === "main-native-node-unresolved"
  ).length;
  if (unreconstructedMainLaneCount > 0) {
    blockers.push(
      `tile-main-lanes-unreconstructed:${unreconstructedMainLaneCount}`
    );
  }

  return {
    status: blockers.length === 0 ? "ready" : "diagnostic-only",
    comparisonStatus:
      comparisonContext.comparisonStatus?.trim() || "unclassified",
    blockerManifest: blockers
  };
}

type ProofGroupMotion = NonNullable<
  NonNullable<FixtureManifest["proofLifecycle"]>["groupMotion"]
>;

type ProofSceneModel = NonNullable<
  NonNullable<FixtureManifest["proofScene"]>["models"]
>[number];

type ProofSceneMeshVisibilityRule =
  NonNullable<FixtureManifest["proofScene"]>["meshVisibilityRule"];

export function buildNwnVfxComparisonExpectedHostGraph(
  manifest: FixtureManifest,
  modelGraph?: AuroraVfxCanonicalModelGraph
) {
  const emitterBranches = uniqueNonEmptyStrings([
    ...(manifest.sourceEmitterNames ?? []),
    ...(manifest.emitterNames ?? []),
    ...(manifest.chunks ?? []).flatMap((chunk) =>
      chunk.hostGraphLifecycle === "transient"
        ? []
        : chunk.sourceEmitterNames ?? []
    )
  ]);
  const persistentEmitterBranches = new Set(emitterBranches);
  const transientEmitterBranches = uniqueNonEmptyStrings(
    (manifest.chunks ?? []).flatMap((chunk) => chunk.sourceEmitterNames ?? [])
  ).filter((entry) => !persistentEmitterBranches.has(entry));
  return {
    staticBranches: uniqueNonEmptyStrings(
      modelGraph?.nodes
        .filter((node) => node.nodeKind === "static-geometry")
        .map((node) => node.nodeName) ?? []
    ),
    emitterBranches,
    ...(transientEmitterBranches.length > 0
      ? { transientEmitterBranches }
      : {}),
    lightBranches: uniqueNonEmptyStrings(manifest.sourceLightNames ?? [])
  };
}

export function readNwnVfxComparisonSourceModelGraph(
  payload: AuroraVfxPayload
): AuroraVfxCanonicalModelGraph | undefined {
  const graph = payload.contracts.sourceModelGraph;
  if (!isRecord(graph) || !Array.isArray(graph.nodes)) {
    return undefined;
  }
  const nodeKinds = new Set([
    "transform",
    "static-geometry",
    "emitter",
    "light",
    "reference",
    "shadowblob"
  ]);
  if (
    !graph.nodes.every(
      (node) =>
        isRecord(node) &&
        nodeKinds.has(readString(node.nodeKind)) &&
        readString(node.nodeName).trim().length > 0
    )
  ) {
    return undefined;
  }
  return { nodes: graph.nodes as unknown as AuroraVfxCanonicalModelGraph["nodes"] };
}

export function buildNwnVfxComparisonRuntimeCacheKey(
  manifest: FixtureManifest
): string | null {
  const fixtureId = manifest.fixtureId?.trim();
  const sourceHash = manifest.sourceModel?.sha256?.trim();
  return fixtureId && sourceHash ? `${fixtureId}:${sourceHash}` : null;
}

export function buildNwnVfxComparisonRuntimeExpectedAssets(
  manifest: FixtureManifest,
  fixtureRoot: string
): VfxRuntimeExpectedAsset[] {
  const fixtureReference = manifest.fixtureId?.trim() || "unknown-fixture";
  const candidates: VfxRuntimeExpectedAsset[] = [
    {
      key: `${fixtureRoot}/payload.json`,
      kind: "unknown",
      reference: fixtureReference
    },
    {
      key: `${fixtureRoot}/manifest.json`,
      kind: "unknown",
      reference: fixtureReference
    },
    {
      key: `${fixtureRoot}/presentation-profile.json`,
      kind: "unknown",
      reference: fixtureReference
    },
    ...(manifest.textures ?? []).flatMap((entry) => {
      const resourceKey = entry.resourceKey?.trim();
      if (!resourceKey) return [];
      return [{
        key: `${fixtureRoot}/${resourceKey}`,
        kind: "texture" as const,
        reference: entry.resref?.trim() || resourceKey
      }];
    }),
    ...(manifest.sourceRenderableModel?.resourceKey?.trim()
      ? [{
          key: `${fixtureRoot}/${manifest.sourceRenderableModel.resourceKey.trim()}`,
          kind: "model" as const,
          reference:
            manifest.sourceRenderableModel.resref?.trim() ||
            manifest.sourceRenderableModel.resourceKey.trim()
        }]
      : []),
    ...(manifest.chunks ?? []).flatMap((entry) => {
      const resourceKey = entry.resourceKey?.trim();
      const runtimePayloadResourceKey = entry.runtimePayloadResourceKey?.trim();
      return [
        ...(resourceKey
          ? [{
              key: `${fixtureRoot}/${resourceKey}`,
              kind: "chunk-model" as const,
              reference: resourceKey
            }]
          : []),
        ...(runtimePayloadResourceKey
          ? [{
              key: `${fixtureRoot}/${runtimePayloadResourceKey}`,
              kind: "unknown" as const,
              reference: runtimePayloadResourceKey
            }]
          : [])
      ];
    }),
    ...(manifest.proofScene?.models ?? []).flatMap((entry) => {
      const resourceKey = entry.resourceKey?.trim();
      if (!resourceKey) return [];
      return [{
        key: `${fixtureRoot}/${resourceKey}`,
        kind: "model" as const,
        reference: resourceKey
      }];
    }),
    ...(manifest.proofScene?.textures ?? []).flatMap((entry) => {
      const resourceKey = entry.resourceKey?.trim();
      if (!resourceKey) return [];
      return [{
        key: `${fixtureRoot}/${resourceKey}`,
        kind: "texture" as const,
        reference: entry.resref?.trim() || resourceKey
      }];
    })
  ];
  return [...new Map(candidates.map((entry) => [entry.key, entry])).values()];
}

export function resolveNwnVfxProofSceneModelTransform(model: ProofSceneModel): {
  position: [number, number, number];
  rotationYRadians: number;
} {
  const [x, y, z] = model.translation ?? [0, 0, 0];
  const sourceOrientation =
    ((Math.trunc(model.orientationQuarterTurns ?? 0) % 4) + 4) % 4;
  return {
    position: [x, z, y],
    rotationYRadians:
      resolveAuroraAreaRenderTileModelOrientation(sourceOrientation) *
      (Math.PI / 2)
  };
}

export function createNwnVfxProofRenderFrame(): THREE.Group {
  const frame = new THREE.Group();
  frame.name = "nwn_vfx_proof_render_frame";
  frame.scale.set(-1, 1, 1);
  frame.userData = {
    auroraAreaRenderFrameMirror: "coordinate-x",
    auroraVfxProofRenderFrameStatus:
      "production-area-coordinate-x-mirror-applied-once",
    auroraVfxProofRenderFrameSource:
      "workspaceTerrainMesh.ts/workspaceObjectMeshLayer.ts production Area render frame"
  };
  return frame;
}

export function bindNwnVfxProofSourceWorldSpace(
  group: THREE.Object3D
): THREE.Object3D {
  group.userData = {
    ...group.userData,
    auroraVfxProofSourceWorldScale: 1,
    auroraVfxProofSourceWorldSpaceStatus: "standalone-source-values-preserved",
    auroraVfxProofSourceWorldSpaceSource:
      "source MDL values and Aurora emitter draw coordinates share the standalone proof world-space contract"
  };
  return group;
}

const initialStatus: RunnerStatus = {
  state: "loading",
  phase: "baseline",
  elapsedSeconds: 0,
  effectSeconds: 0,
  frameIndex: 0,
  frameCount: 0,
  drawParticles: 0,
  renderedChunkModels: 0,
  boundChunkMaterialCount: 0,
  visibleFrameCount: 0,
  aoeVisualOwnerCount: 0,
  aoePhaseCounts: "",
  objectDurationVisualOwnerPhase: "",
  objectDurationVisualOwnerActive: false,
  objectDurationVisualOwnerEffectRemovalStarted: false,
  objectDurationVisualOwnerTimerRemainingMilliseconds: 0,
  objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds: 0,
  objectDurationVisualOwnerRemovalProcessedAtMilliseconds: 0,
  objectDurationVisualOwnerLastUpdateAtMilliseconds: 0,
  sourceLightCount: 0,
  sourceLightColor: "",
  sourceLightRadius: 0,
  sourceLightIntensity: 0,
  collisionProfile: "",
  collisionQueryCount: 0,
  collisionHitCount: 0,
  collisionAppliedHitCount: 0,
  collisionStaticNoHitCount: 0,
  collisionLandedParticleCount: 0,
  bloomStatus: "",
  bloomDownscaleOffset: 0,
  bloomDownscaleSteps: 0,
  bloomThreshold: 0,
  bloomSoftness: 0,
  bloomMultiplier: 0,
  bloomNormalizationFactor: 0,
  ssaoConfiguredEnabled: false,
  ssaoRuntimeStatus: "pending-perspective-camera",
  ssaoIntensity: 0,
  ssaoShaderQualityMode: 0,
  ssaoPassCount: 0,
  ssaoBlendSourceFactor: "",
  ssaoBlendDestinationFactor: "",
  ssaoStageOrder: "",
  ssaoFragmentSourceSha256: "",
  ssaoIncludeSourceSha256: "",
  ssaoFramebufferSourceSha256: "",
  ssaoVertexSourceSha256: "",
  rawGammaNormalVfxMeshCount: 0,
  rawGammaAdditiveVfxMeshCount: 0,
  colorPipelineStageOrder: "",
  textureSamplerStates: "",
  meshDiagnostics: "",
  programDiagnostics: "",
  framebufferPixelDiagnostics: "",
  vfxRuntimeObservabilityVersion: "",
  vfxRuntimeIdentityStatus: "blocked",
  vfxRuntimeHostGraphStatus: "fail",
  vfxRuntimeAssetSettlementStatus: "pending",
  vfxRuntimeDrawLedgerStatus: "fail",
  vfxRuntimePlaybackGuardStatus: "blocked",
  vfxRuntimeProofGateStatus: "fail",
  vfxRuntimeProofBlockers: "runtime-observability-report-missing",
  visualParityReadinessStatus: "diagnostic-only",
  visualParityBlockers: "comparison-context-missing",
  vfxDebugOverlayEnabled: false,
  vfxDebugOverlayFinalProfileDisabled: true,
  objectAttachmentStatus: "not-evaluated",
  objectAttachmentNode: "",
  objectAttachmentWorldPosition: "",
  message: "loading"
};

export function isNwnVfxComparisonRunnerPath(pathname: string): boolean {
  return pathname === ROUTE;
}

export function resolveNwnVfxComparisonPlaybackMode(
  search: string
):
  | "fixed-time"
  | "armed"
  | "autoplay"
  | "self-record"
  | "static-timeline"
  | "baseline-unarmed" {
  if (readFixedTimeSeconds(search) !== null) return "fixed-time";
  if (readCaptureArmed(search)) return "armed";
  if (readCaptureAutoplay(search)) return "autoplay";
  if (readCaptureSelfRecord(search)) return "self-record";
  if (readCaptureStaticTimeline(search)) return "static-timeline";
  return "baseline-unarmed";
}

export function resolveNwnVfxComparisonSelfRecordPlan(): {
  fps: number;
  durationSeconds: number;
  frameCount: number;
  chunkSize: number;
} {
  return {
    fps: SELF_RECORD_FPS,
    durationSeconds: SELF_RECORD_DURATION_SECONDS,
    frameCount:
      Math.round(SELF_RECORD_DURATION_SECONDS * SELF_RECORD_FPS) + 1,
    chunkSize: SELF_RECORD_CHUNK_SIZE
  };
}

export function resolveNwnVfxComparisonCanvasPresentation(
  search: string
): "native-pixels" | "viewport-contain" {
  return new URLSearchParams(search).get("viewport") === "native"
    ? "native-pixels"
    : "viewport-contain";
}

export function NwnVfxComparisonRunner() {
  const fixtureId = readFixtureId(window.location.search);
  const [manifestPresentationProfile, setManifestPresentationProfile] = useState<{
    fixtureId: string;
    profile: AuroraVfxPresentationProfile;
  } | null>(null);
  const presentationProfile =
    manifestPresentationProfile?.fixtureId === fixtureId
      ? manifestPresentationProfile.profile
      : null;
  const viewProfile =
    presentationProfile?.viewProfile ?? DEFAULT_NWN_VFX_LOADING_VIEW_PROFILE;
  const nativePixelCanvas =
    resolveNwnVfxComparisonCanvasPresentation(window.location.search) ===
    "native-pixels";
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const actorHostRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const canvas = canvasRef.current;
    const actorHost = actorHostRef.current;
    if (!canvas || !actorHost) return;
    let disposed = false;
    let animationFrame = 0;
    let renderer: THREE.WebGLRenderer | undefined;
    let bloomPass: AuroraRetailBloomPass | undefined;
    let textures: THREE.Texture[] = [];
    let group: THREE.Group | undefined;
    let proofSceneInstances: THREE.Object3D[] = [];
    let proofSceneActors: NwnVfxLoadedProofSceneActor[] = [];
    const observabilityRuntime = {};
    let backendRuntimeBuild: BackendRuntimeBuildIdentity | null = null;
    let ownedProofStartHook: (() => boolean) | undefined;
    let ownedProofRenderHook: ((elapsedSeconds: number) => RunnerStatus | null | undefined) | undefined;
    const proofMeshes: THREE.Mesh[] = [];
    const timeline: Array<Record<string, unknown>> = [];

    const run = async () => {
      const fixtureRoot = `/dev-fixtures/${fixtureId}`;
      const [payload, manifest, rawPresentationProfile, backendHealth] = await Promise.all([
        loadNwnVfxObservedJson<AuroraVfxPayload>(
          observabilityRuntime,
          {
            key: `${fixtureRoot}/payload.json`,
            kind: "unknown",
            reference: fixtureId
          }
        ),
        loadNwnVfxObservedJson<FixtureManifest>(
          observabilityRuntime,
          {
            key: `${fixtureRoot}/manifest.json`,
            kind: "unknown",
            reference: fixtureId
          }
        ),
        loadNwnVfxObservedJson<unknown>(
          observabilityRuntime,
          {
            key: `${fixtureRoot}/presentation-profile.json`,
            kind: "unknown",
            reference: fixtureId
          }
        ),
        probeBackendHealth()
      ]);
      backendRuntimeBuild = backendHealth.runtimeBuild;
      const sourceModelGraph = readNwnVfxComparisonSourceModelGraph(payload);
      const resolvedPresentationProfile =
        materializeVfxPresentationProfile(rawPresentationProfile);
      if (presentationProfile?.profileHash !== resolvedPresentationProfile.profileHash) {
        if (!disposed) {
          setManifestPresentationProfile({
            fixtureId,
            profile: resolvedPresentationProfile
          });
        }
        return;
      }
      const visualParityReadiness =
        resolveNwnVfxComparisonVisualParityReadiness(manifest);
      registerVfxRuntimeExpectedAssets(
        observabilityRuntime,
        buildNwnVfxComparisonRuntimeExpectedAssets(manifest, fixtureRoot)
      );
      const textureReferences = readTextureReferences(manifest);
      const textureSamplerStatesByReference = new Map(
        textureReferences.flatMap((reference) =>
          reference.txi ? ([[reference.resref, reference.txi]] as const) : []
        )
      );
      const textureSamplerStates = textureReferences
        .filter((reference) => reference.txi)
        .map(
          (reference) =>
            `${reference.resref}:mipmap=${reference.txi?.mipmap ?? "default"},filter=${reference.txi?.filter ?? "default"},clamp=${reference.txi?.clamp ?? "default"},blending=${reference.txi?.blending ?? "default"},decal=${reference.txi?.decal ?? "default"},proceduretype=${reference.txi?.proceduretype ?? "default"}`
        )
        .join("|");
      const sourceModelTextureBindings =
        buildNwnVfxSourceModelTextureBindings(textureReferences, fixtureRoot);
      const loadedTextures = await Promise.all(
        textureReferences.map(async (reference) => {
          const texturePath = `${fixtureRoot}/${reference.resourceKey}`;
          const loaded = await loadNwnVfxObservedAsset<THREE.Texture>(
            observabilityRuntime,
            {
              key: texturePath,
              kind: "texture",
              reference: reference.resref
            },
            () =>
              reference.resourceKey.toLowerCase().endsWith(".tga")
                ? new TGALoader().loadAsync(texturePath)
                : new THREE.TextureLoader().loadAsync(texturePath)
          );
          loaded.colorSpace = THREE.SRGBColorSpace;
          applyAuroraVfxCanonicalTextureSamplerState(loaded, reference.txi);
          return [reference.resref, loaded] as const;
        })
      );
      const loadedChunks = await Promise.all(
        (manifest.chunks ?? []).map(async (chunk) => {
          const resourceKey = chunk.resourceKey?.trim();
          if (!resourceKey) return null;
          const runtimePayloadResourceKey = chunk.runtimePayloadResourceKey?.trim();
          const [gltf, runtimePayload] = await Promise.all([
            loadNwnVfxObservedAsset(
              observabilityRuntime,
              {
                key: `${fixtureRoot}/${resourceKey}`,
                kind: "chunk-model",
                reference: resourceKey
              },
              () => new GLTFLoader().loadAsync(`${fixtureRoot}/${resourceKey}`)
            ),
            runtimePayloadResourceKey
              ? loadNwnVfxObservedJson<AuroraVfxPayload>(
                  observabilityRuntime,
                  {
                    key: `${fixtureRoot}/${runtimePayloadResourceKey}`,
                    kind: "unknown",
                    reference: runtimePayloadResourceKey
                  }
                )
              : Promise.resolve(undefined)
          ]);
          return {
            resourceKey,
            scene:
              chunk.sourceStaticGeometryCount === 0
                ? new THREE.Group()
                : gltf.scene,
            ...(runtimePayload
              ? {
                  runtimePayload,
                  runtimePayloadSourceModelObjectKey:
                    chunk.runtimePayloadSourceModelObjectKey?.trim() ?? ""
                }
              : {})
          };
        })
      );
      const [sourceModelGltf, loadedProofSceneTextures, loadedProofSceneModels] = await Promise.all([
        manifest.sourceRenderableModel?.resourceKey?.trim()
          ? loadNwnVfxObservedAsset(
              observabilityRuntime,
              {
                key: `${fixtureRoot}/${manifest.sourceRenderableModel.resourceKey.trim()}`,
                kind: "model",
                reference:
                  manifest.sourceRenderableModel.resref?.trim() ||
                  manifest.sourceRenderableModel.resourceKey.trim()
              },
              () =>
                new GLTFLoader().loadAsync(
                  `${fixtureRoot}/${manifest.sourceRenderableModel!.resourceKey!.trim()}`
                )
            )
          : Promise.resolve(undefined),
        Promise.all(
          (manifest.proofScene?.textures ?? []).map(async (reference) => {
            const resref = reference.resref?.trim().toLowerCase();
            const resourceKey = reference.resourceKey?.trim();
            if (!resref || !resourceKey) return null;
            const texturePath = `${fixtureRoot}/${resourceKey}`;
            const loaded = await loadNwnVfxObservedAsset<THREE.Texture>(
              observabilityRuntime,
              {
                key: texturePath,
                kind: "texture",
                reference: resref
              },
              () => loadNwnVfxProofSceneTexture(resourceKey, texturePath)
            );
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.flipY = false;
            loaded.needsUpdate = true;
            return [resref, loaded] as const;
          })
        ),
        Promise.all(
          (manifest.proofScene?.models ?? []).map(async (model) => {
            const resourceKey = model.resourceKey?.trim();
            if (!resourceKey) return null;
            const gltf = await loadNwnVfxObservedAsset(
              observabilityRuntime,
              {
                key: `${fixtureRoot}/${resourceKey}`,
                kind: "model",
                reference: resourceKey
              },
              () => new GLTFLoader().loadAsync(`${fixtureRoot}/${resourceKey}`)
            );
            return { model, source: gltf.scene };
          })
        )
      ]);
      const proofSceneTexturesByReference = new Map(
        loadedProofSceneTextures.filter(
          (entry): entry is NonNullable<typeof entry> => entry !== null
        )
      );
      const chunkModelsByResourceKey = new Map(
        loadedChunks.filter(
          (entry): entry is NonNullable<typeof entry> => entry !== null
        ).map((entry) => [entry.resourceKey, entry.scene] as const)
      );
      const chunkModelRuntimePayloadsByResourceKey = new Map(
        loadedChunks.flatMap((entry) =>
          entry?.runtimePayload
            ? [
                [
                  entry.resourceKey,
                  {
                    payload: entry.runtimePayload,
                    sourceModelObjectKey: entry.runtimePayloadSourceModelObjectKey
                  }
                ] as const
              ]
            : []
        )
      );
      if (disposed) return;
      textures = [
        ...loadedTextures.map((entry) => entry[1]),
        ...proofSceneTexturesByReference.values()
      ];
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: false,
        antialias: true,
        preserveDrawingBuffer: true
      });
      installAuroraVfxRenderQueueSort(renderer);
      renderer.setPixelRatio(1);
      renderer.setSize(viewProfile.viewportWidth, viewProfile.viewportHeight, false);
      const backgroundColor = resolvedPresentationProfile.clearColor;
      renderer.setClearColor(backgroundColor, 1);
      bloomPass = new AuroraRetailBloomPass(
        resolveNwnVfxComparisonBloomProfile(manifest.nativeOracleCalibration),
        resolvedPresentationProfile.postprocessProfile
      );
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(backgroundColor);
      const proofRenderFrame = createNwnVfxProofRenderFrame();
      scene.add(proofRenderFrame);
      const proofSceneAreaLightingLayer =
        installNwnVfxProofSceneAreaLighting(
          scene,
          manifest.proofScene?.areaLighting,
          manifest.proofScene?.nativeBaselineLightingCalibration?.areaGlobalScale
        );
      if (!proofSceneAreaLightingLayer) {
        scene.add(new THREE.AmbientLight(0xffffff, 0.12));
      }
      proofSceneInstances = loadedProofSceneModels.flatMap((entry) =>
        entry
          ? [
              createNwnVfxProofSceneModelInstance(
                entry.source,
                entry.model,
                proofSceneTexturesByReference,
                manifest.proofScene?.meshVisibilityRule
              )
            ]
          : []
      );
      proofSceneInstances.forEach((instance) => proofRenderFrame.add(instance));
      const proofSceneMaterialLighting =
        summarizeNwnVfxProofSceneMaterialLighting(proofSceneInstances);
      const proofSceneTileLightingLayer =
        createNwnVfxProofSceneTileLightingLayer(
          manifest.proofScene?.models,
          manifest.proofScene?.nativeBaselineLightingCalibration?.tileLocalScale
        );
      if (proofSceneTileLightingLayer) {
        proofRenderFrame.add(proofSceneTileLightingLayer);
      }
      proofSceneActors = await Promise.all(
        (manifest.proofScene?.actors ?? []).map((actor) =>
          loadNwnVfxProofSceneActor({
            actor,
            host: actorHost,
            observabilityRuntime
          })
        )
      );
      proofSceneActors.forEach((actor) => proofRenderFrame.add(actor.root));
      const camera = viewProfile.projection === "perspective"
        ? new THREE.PerspectiveCamera(
            viewProfile.perspectiveFovDegrees,
            viewProfile.viewportWidth / viewProfile.viewportHeight,
            0.1,
            100
          )
        : new THREE.OrthographicCamera(
            -viewProfile.cameraHalfWidth,
            viewProfile.cameraHalfWidth,
            viewProfile.cameraHalfHeight,
            -viewProfile.cameraHalfHeight,
            0.1,
            100
          );
      camera.position.set(...viewProfile.cameraPosition);
      camera.up.set(...viewProfile.cameraUp);
      camera.lookAt(...viewProfile.cameraLookAt);
      applyNwnVfxComparisonCameraViewOffset(camera, viewProfile);
      if (
        readDiagnosticHarness(window.location.search) &&
        shouldMaterializeVfxDiagnosticReference(
          resolvedPresentationProfile.diagnosticReference,
          Boolean(manifest.proofScene)
        )
      ) {
        const receiver = new THREE.Mesh(
          new THREE.PlaneGeometry(...viewProfile.receiverSize),
          new THREE.MeshStandardMaterial({ color: 0x30383d, roughness: 0.95 })
        );
        receiver.rotation.x = viewProfile.receiverRotationX;
        receiver.position.set(...viewProfile.receiverPosition);
        receiver.name = "vfx_proof_light_receiver";
        proofRenderFrame.add(receiver);
        proofMeshes.push(receiver);

        const target = new THREE.Mesh(
          new THREE.CapsuleGeometry(
            viewProfile.targetRadius,
            viewProfile.targetLength,
            8,
            16
          ),
          new THREE.MeshStandardMaterial({ color: 0x788087, roughness: 0.8 })
        );
        target.position.set(...viewProfile.targetPosition);
        target.name = "vfx_proof_target_scale_reference";
        proofRenderFrame.add(target);
        proofMeshes.push(target);
      }
      group = createAuroraVfxCanonicalRenderGroup(payload, {
        particleTexturesByReference: new Map(loadedTextures),
        particleTextureSamplerStatesByReference: textureSamplerStatesByReference,
        chunkModelsByResourceKey,
        chunkModelTexturesByReference: new Map(loadedTextures),
        chunkModelTextureBindings: sourceModelTextureBindings,
        chunkModelRuntimePayloadsByResourceKey,
        sourceModel: sourceModelGltf?.scene,
        sourceModelTexturesByReference: new Map(loadedTextures),
        sourceModelTextureBindings,
        modelGraph: sourceModelGraph,
        objectRadius: 0.32,
        sourceCoordinateSpace: "aurora-z-up",
        additiveParticleRadianceCalibration:
          resolveNwnVfxComparisonAdditiveRadianceCalibration(
            manifest.nativeOracleCalibration
          ),
        runtimeFrameMaterialization:
          resolvedPresentationProfile.runtimeFrameMaterialization
      });
      bindNwnVfxProofSourceWorldSpace(group);
      proofRenderFrame.add(group);
      const objectAttachmentTarget = resolveNwnVfxObjectAttachmentProofTarget({
        contract: manifest.proofScene?.objectAttachmentTarget,
        actorRoots: proofSceneActors.map((actor) => actor.root),
        modelRoots: proofSceneInstances
      });
      let objectAttachment: AuroraVfxObjectAttachmentResult =
        applyAuroraVfxObjectAttachmentPosition({
          payload,
          phase: objectAttachmentTarget.phase,
          targetKind: objectAttachmentTarget.targetKind,
          targetSpecialNodePrefix:
            objectAttachmentTarget.targetSpecialNodePrefix,
          targetRoots: objectAttachmentTarget.targetRoots,
          effectGroup: group
        });
      group.position.fromArray(
        resolveNwnVfxProofSceneEffectOriginPosition(
          group.position.toArray(),
          manifest.proofScene?.effectOriginAlignment
        )
      );
      if (manifest.proofScene?.effectOriginAlignment) {
        group.userData = {
          ...group.userData,
          auroraVfxProofSceneEffectOriginAlignmentOffset:
            manifest.proofScene.effectOriginAlignment.offset,
          auroraVfxProofSceneEffectOriginAlignmentSourceEvidence:
            manifest.proofScene.effectOriginAlignment.sourceEvidence,
          auroraVfxProofSceneEffectOriginAlignmentMethod:
            manifest.proofScene.effectOriginAlignment.method
        };
      }
      const nativeTimingCalibration = manifest.nativeOracleCalibration;
      group.userData = {
        ...group.userData,
        auroraVfxProofNativePlaybackRate:
          nativeTimingCalibration?.runtimePlaybackRate ?? 1,
        auroraVfxProofNativePlaybackDelaySeconds:
          nativeTimingCalibration?.runtimePlaybackDelaySeconds ?? 0,
        auroraVfxProofNativeTimingCalibrationMethod:
          nativeTimingCalibration?.runtimeTimingCalibrationMethod ?? "none",
        auroraVfxProofNativeTimingSourceEvidence:
          nativeTimingCalibration?.sourceEvidence ?? ""
      };
      const objectAttachmentBasePosition = group.position.clone();
      const vfxDevScene = {
        scene,
        camera,
        proofRenderFrame,
        group,
        proofSceneInstances,
        proofSceneActors: proofSceneActors.map((actor) => actor.root),
        objectAttachment
      };
      (window as unknown as Record<string, unknown>).__AURORA_VFX_DEV_SCENE__ =
        vfxDevScene;

      const fixedTime = readFixedTimeSeconds(window.location.search);
      const renderDiagnosticMode = readRenderDiagnosticMode(window.location.search);
      let previousEffectSeconds = 0;
      let lastReportedFrame = -1;
      const renderAtElapsed = (elapsedSeconds: number) => {
        if (disposed || !renderer || !group || !bloomPass) return;
        const durationSeconds = readNumber(
          group.userData.auroraVfxCanonicalRuntimePlaybackDurationSeconds,
          0
        );
        const playbackTimeline = resolveNwnVfxComparisonPlaybackTimeline({
          elapsedSeconds,
          preRollSeconds: PRE_ROLL_SECONDS,
          durationSeconds,
          fixedTimeSeconds: fixedTime,
          playbackRate: nativeTimingCalibration?.runtimePlaybackRate,
          playbackDelaySeconds:
            nativeTimingCalibration?.runtimePlaybackDelaySeconds
        });
        const {
          clampedEffectSeconds,
          playbackSeekSeconds,
          wallEffectSeconds,
          playbackRate,
          playbackDelaySeconds,
          effectiveWallDurationSeconds,
          phase,
          groupVisible
        } = playbackTimeline;
        const safeElapsedSeconds = Math.max(0, elapsedSeconds);
        proofSceneActors.forEach((actor) => actor.sampleAt(safeElapsedSeconds));
        objectAttachment = applyAuroraVfxObjectAttachmentPosition({
          payload,
          phase: objectAttachmentTarget.phase,
          targetKind: objectAttachmentTarget.targetKind,
          targetSpecialNodePrefix:
            objectAttachmentTarget.targetSpecialNodePrefix,
          targetRoots: objectAttachmentTarget.targetRoots,
          effectGroup: group
        });
        vfxDevScene.objectAttachment = objectAttachment;
        if (objectAttachment.status === "attached") {
          objectAttachmentBasePosition.copy(group.position);
        }
        group.visible = groupVisible;
        applyProofGroupMotion(
          group,
          manifest.proofLifecycle?.groupMotion,
          clampedEffectSeconds,
          objectAttachmentBasePosition
        );
        const deltaSeconds = Math.max(0, playbackSeekSeconds - previousEffectSeconds);
        if (
          readCaptureArmed(window.location.search) ||
          readCaptureSelfRecord(window.location.search) ||
          readCaptureStaticTimeline(window.location.search)
        ) {
          seekAuroraVfxCanonicalRuntimePlayback(group, playbackSeekSeconds);
        } else if (deltaSeconds > 0) {
          advanceAuroraVfxCanonicalRuntimePlayback(group, deltaSeconds);
        }
        previousEffectSeconds = playbackSeekSeconds;
        const frameIndex = readNumber(
          group.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex,
          0
        );
        const visibleFrames = group.children.filter(
          (child) => child.userData.auroraVfxCanonicalRuntimeFrame === true && child.visible
        );
        const activeFrame = visibleFrames[0];
        const aoeVisualOwnerCount = group.visible
          ? readNumber(
              activeFrame?.userData.auroraVfxCanonicalAoeVisualOwnerCount,
              0
            )
          : 0;
        const aoePhaseCounts = group.visible &&
          activeFrame?.userData.auroraVfxCanonicalAoePhaseCounts &&
          typeof activeFrame.userData.auroraVfxCanonicalAoePhaseCounts === "object"
            ? JSON.stringify(activeFrame.userData.auroraVfxCanonicalAoePhaseCounts)
            : "";
        const objectDurationVisualOwnerPhase =
          group.visible &&
          typeof activeFrame?.userData
            .auroraVfxCanonicalObjectDurationVisualOwnerPhase === "string"
            ? activeFrame.userData
                .auroraVfxCanonicalObjectDurationVisualOwnerPhase
            : "";
        const objectDurationVisualOwnerActive =
          group.visible &&
          activeFrame?.userData
            .auroraVfxCanonicalObjectDurationVisualOwnerActive === true;
        const objectDurationVisualOwnerEffectRemovalStarted =
          group.visible &&
          activeFrame?.userData
            .auroraVfxCanonicalObjectDurationVisualOwnerEffectRemovalStarted ===
            true;
        const objectDurationVisualOwnerTimerRemainingMilliseconds = group.visible
          ? readNumber(
              activeFrame?.userData
                .auroraVfxCanonicalObjectDurationVisualOwnerTimerRemainingMilliseconds,
              0
            )
          : 0;
        const objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds =
          group.visible
            ? readNumber(
                activeFrame?.userData
                  .auroraVfxCanonicalObjectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds,
                0
              )
            : 0;
        const objectDurationVisualOwnerRemovalProcessedAtMilliseconds = group.visible
          ? readNumber(
              activeFrame?.userData
                .auroraVfxCanonicalObjectDurationVisualOwnerRemovalProcessedAtMilliseconds,
              0
            )
          : 0;
        const objectDurationVisualOwnerLastUpdateAtMilliseconds = group.visible
          ? readNumber(
              activeFrame?.userData
                .auroraVfxCanonicalObjectDurationVisualOwnerLastUpdateAtMilliseconds,
              0
            )
          : 0;
        const proofDrawMeshes: Array<Record<string, unknown>> = [];
        const visibleFrameCount = group.visible ? visibleFrames.length : 0;
        const drawParticles = group.visible
          ? readNumber(
              activeFrame?.userData.auroraVfxCanonicalRenderedDrawParticleCount,
              0
            )
          : 0;
        const renderedChunkModels = group.visible
          ? readNumber(
              activeFrame?.userData.auroraVfxCanonicalRenderedChunkModelCount,
              0
            )
          : 0;
        let boundChunkMaterialCount = 0;
        if (group.visible) {
          activeFrame?.traverse((node) => {
            if (!(node instanceof THREE.Mesh)) return;
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            boundChunkMaterialCount += materials.filter(
              (material) =>
                material.userData.auroraVfxCanonicalChunkModelMaterialTextureBound === true
            ).length;
          });
        }
        const collisionSummary = manifest.collisionOracle?.runtimeSummary;
        const collisionProfile = manifest.collisionOracle?.staticTraversalProfile ?? "";
        const collisionQueryCount = readNumber(collisionSummary?.queryCount, 0);
        const collisionHitCount = readNumber(collisionSummary?.hitCount, 0);
        const collisionAppliedHitCount = readNumber(collisionSummary?.appliedHitCount, 0);
        const collisionStaticNoHitCount = readNumber(
          collisionSummary?.staticNoHitCount,
          0
        );
        const collisionLandedParticleCount =
          collisionSummary?.landedParticleIds?.length ?? 0;
        const sourceLights: THREE.PointLight[] = [];
        if (group.visible) {
          activeFrame?.traverse((node) => {
            if (
              node instanceof THREE.PointLight &&
              node.userData.auroraVfxCanonicalSourceMdlLight === true
            ) {
              sourceLights.push(node);
            }
          });
        }
        const sourceLight = sourceLights[0];
        const sourceLightColor = sourceLight ? `#${sourceLight.color.getHexString()}` : "";
        const sourceLightRadius = sourceLight?.distance ?? 0;
        const sourceLightIntensity = sourceLight?.intensity ?? 0;
        if (renderDiagnosticMode === "direct") {
          updateAuroraVfxCanonicalCameraBillboards(scene, camera);
          renderer.setRenderTarget(null);
          renderer.clear();
          renderer.render(scene, camera);
        } else {
          bloomPass.render(renderer, scene, camera);
        }
        activeFrame?.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          let emitterDiagnosticOwner: THREE.Object3D | null = node;
          while (
            emitterDiagnosticOwner &&
            typeof emitterDiagnosticOwner.userData.auroraEmitterNode !== "string"
          ) {
            emitterDiagnosticOwner = emitterDiagnosticOwner.parent;
          }
          node.geometry.computeBoundingBox();
          const worldBoundingBox = new THREE.Box3().setFromObject(node);
          const positions = node.geometry.getAttribute("position");
          const material = Array.isArray(node.material) ? node.material[0] : node.material;
          const materialWithMap = material as THREE.Material & {
            color?: THREE.Color;
            map?: THREE.Texture | null;
          };
          const frontNormal = positions && positions.count >= 3
            ? new THREE.Vector3()
                .fromBufferAttribute(positions, 1)
                .sub(new THREE.Vector3().fromBufferAttribute(positions, 0))
                .cross(
                  new THREE.Vector3()
                    .fromBufferAttribute(positions, 2)
                    .sub(new THREE.Vector3().fromBufferAttribute(positions, 0))
                )
                .normalize()
                .toArray()
            : null;
          proofDrawMeshes.push({
            name: node.name,
            visible: node.visible,
            previewRole: node.userData.vfxPreviewRole ?? null,
            emitterNode:
              emitterDiagnosticOwner?.userData.auroraEmitterNode ?? null,
            emitterPreviewRole:
              emitterDiagnosticOwner?.userData.vfxPreviewRole ?? null,
            emitterLayout:
              emitterDiagnosticOwner?.userData.vfxPreviewLayout ?? null,
            emitterWorldScale: emitterDiagnosticOwner
              ? emitterDiagnosticOwner.getWorldScale(new THREE.Vector3()).toArray()
              : null,
            emitterParticleSizeStart:
              emitterDiagnosticOwner?.userData.auroraEmitterParticleSizeStart ?? null,
            emitterParticleSizeEnd:
              emitterDiagnosticOwner?.userData.auroraEmitterParticleSizeEnd ?? null,
            emitterParticleSizeTimelineScale:
              emitterDiagnosticOwner?.userData.auroraEmitterParticleSizeTimelineScale ?? null,
            emitterMotionUnitScale:
              emitterDiagnosticOwner?.userData.auroraEmitterMotionUnitScale ?? null,
            emitterBlurLengthSource:
              emitterDiagnosticOwner?.userData.auroraEmitterBlurLengthSource ?? null,
            emitterBatchVisibleCount:
              node.userData.auroraParticleBatchVisibleCount ?? null,
            motionBlurPreviousPosition:
              node.userData.auroraEmitterMotionBlurPreviousPosition ?? null,
            motionBlurCurrentPosition:
              node.userData.auroraEmitterMotionBlurCurrentPosition ?? null,
            motionBlurEndpointDistance:
              node.userData.auroraEmitterMotionBlurEndpointDistance ?? null,
            vertexCount: positions?.count ?? 0,
            frontNormal,
            colorRange: {
              r: [
                node.geometry.userData.auroraVfxCanonicalColorAttributeRMin ?? null,
                node.geometry.userData.auroraVfxCanonicalColorAttributeRMax ?? null
              ],
              g: [
                node.geometry.userData.auroraVfxCanonicalColorAttributeGMin ?? null,
                node.geometry.userData.auroraVfxCanonicalColorAttributeGMax ?? null
              ],
              b: [
                node.geometry.userData.auroraVfxCanonicalColorAttributeBMin ?? null,
                node.geometry.userData.auroraVfxCanonicalColorAttributeBMax ?? null
              ]
            },
            alphaRange: [
              node.geometry.userData.auroraVfxCanonicalAlphaAttributeMin ?? null,
              node.geometry.userData.auroraVfxCanonicalAlphaAttributeMax ?? null
            ],
            uvRange: {
              u: [
                node.geometry.userData.auroraVfxCanonicalUvAttributeUMin ?? null,
                node.geometry.userData.auroraVfxCanonicalUvAttributeUMax ?? null
              ],
              v: [
                node.geometry.userData.auroraVfxCanonicalUvAttributeVMin ?? null,
                node.geometry.userData.auroraVfxCanonicalUvAttributeVMax ?? null
              ]
            },
            boundingBox: node.geometry.boundingBox
              ? {
                  min: node.geometry.boundingBox.min.toArray(),
                  max: node.geometry.boundingBox.max.toArray()
                }
              : null,
            worldBoundingBox: {
              min: worldBoundingBox.min.toArray(),
              max: worldBoundingBox.max.toArray()
            },
            materialSide: material?.side ?? null,
            materialType: material?.type ?? null,
            materialName: material?.name ?? null,
            materialOpacity: material?.opacity ?? null,
            materialTransparent: material?.transparent ?? null,
            sourceModelNodeName:
              node.userData.auroraVfxCanonicalSourceModelNodeName ?? null,
            sourceModelMeshAlpha:
              node.userData.auroraVfxCanonicalSourceModelMeshAlpha ?? null,
            sourceModelMeshAlphaAnimation:
              node.userData.auroraVfxCanonicalSourceModelMeshAlphaAnimation ?? null,
            sourceModelMeshAlphaStatus:
              node.userData.auroraVfxCanonicalSourceModelMeshAlphaStatus ?? null,
            materialBlending: material?.blending ?? null,
            materialBlendSrc:
              material instanceof THREE.MeshBasicMaterial ? material.blendSrc : null,
            materialBlendDst:
              material instanceof THREE.MeshBasicMaterial ? material.blendDst : null,
            materialDepthTest: material?.depthTest ?? null,
            materialDepthWrite: material?.depthWrite ?? null,
            materialColor: materialWithMap.color instanceof THREE.Color
              ? `#${materialWithMap.color.getHexString()}`
              : null,
            materialMapBound: materialWithMap.map !== undefined
              ? materialWithMap.map !== null
              : null,
            materialMapColorSpace: materialWithMap.map?.colorSpace ?? null,
            materialMapImageSize: materialWithMap.map?.image
                ? {
                    width: readNumber(
                      (materialWithMap.map.image as { width?: unknown }).width,
                      0
                    ),
                    height: readNumber(
                      (materialWithMap.map.image as { height?: unknown }).height,
                      0
                    )
                  }
                : null,
            materialMapPixelStats:
              fixedTime !== null
                ? readTexturePixelStats(materialWithMap.map ?? null)
                : null
          });
        });
        const bloomDiagnostics = bloomPass.getDiagnostics();
        const programDiagnostics = renderer.info.programs?.map((program) => {
          const diagnostics = (program as unknown as {
            diagnostics?: {
              runnable?: boolean;
              programLog?: string;
              vertexShader?: { log?: string };
              fragmentShader?: { log?: string };
            };
          }).diagnostics;
          return {
            runnable: diagnostics?.runnable ?? null,
            programLog: diagnostics?.programLog ?? "",
            vertexLog: diagnostics?.vertexShader?.log ?? "",
            fragmentLog: diagnostics?.fragmentShader?.log ?? ""
          };
        }) ?? [];
        const framebufferPixelDiagnostics = fixedTime !== null
          ? readFramebufferPixelStats(renderer)
          : null;
        const vfxRuntimeObservability = createVfxRuntimeObservabilityReport({
          runtime: observabilityRuntime,
          root: group,
          profile: "final",
          overlayRequested: false,
          requirePlaceableComposition: false,
          runtimeEmittersDeferred:
            payload.contracts.runtimeEmittersDeferred === true,
          requirePostDurationHidden: phase === "post",
          expectedHostGraph:
            buildNwnVfxComparisonExpectedHostGraph(manifest, sourceModelGraph),
          additionalProofBlockers:
            proofSceneMaterialLighting.blockerManifest,
          buildIdentity: {
            frontend: {
              commit: import.meta.env.VITE_RUNTIME_BUILD_COMMIT,
              imageDigest: import.meta.env.VITE_RUNTIME_BUILD_IMAGE_DIGEST,
              builtAt: import.meta.env.VITE_RUNTIME_BUILD_BUILT_AT
            },
            backend: backendRuntimeBuild ?? undefined,
            contractVersion: backendRuntimeBuild?.contractVersion ?? null,
            cacheKey: buildNwnVfxComparisonRuntimeCacheKey(manifest)
          }
        });
        if (frameIndex !== lastReportedFrame || timeline.length === 0) {
          timeline.push({
            wallSeconds: safeElapsedSeconds,
            effectSeconds: clampedEffectSeconds,
            sourceEffectSeconds: playbackSeekSeconds,
            wallEffectSeconds,
            playbackRate,
            playbackDelaySeconds,
            effectiveWallDurationSeconds,
            frameIndex,
            drawParticles,
            renderedChunkModels,
            boundChunkMaterialCount,
            visibleFrameCount,
            aoeVisualOwnerCount,
            aoePhaseCounts,
            objectDurationVisualOwnerPhase,
            objectDurationVisualOwnerActive,
            objectDurationVisualOwnerEffectRemovalStarted,
            objectDurationVisualOwnerTimerRemainingMilliseconds,
            objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds,
            objectDurationVisualOwnerRemovalProcessedAtMilliseconds,
            objectDurationVisualOwnerLastUpdateAtMilliseconds,
            sourceLightCount: sourceLights.length,
            sourceLightColor,
            sourceLightRadius,
            sourceLightIntensity,
            collisionProfile,
            collisionQueryCount,
            collisionHitCount,
            collisionAppliedHitCount,
            collisionStaticNoHitCount,
            collisionLandedParticleCount,
            bloomStatus: bloomDiagnostics.status,
            bloomDownscaleOffset: bloomDiagnostics.downscaleOffset,
            bloomDownscaleSteps: bloomDiagnostics.downscaleSteps,
            bloomThreshold: bloomDiagnostics.threshold,
            bloomSoftness: bloomDiagnostics.softness,
            bloomMultiplier: bloomDiagnostics.multiplier,
            bloomNormalizationFactor: bloomDiagnostics.normalizationFactor,
            bloomLevelSizes: bloomDiagnostics.levelSizes,
            ssaoConfiguredEnabled: bloomDiagnostics.ssaoConfiguredEnabled,
            ssaoRuntimeStatus: bloomDiagnostics.ssaoRuntimeStatus,
            ssaoIntensity: bloomDiagnostics.ssaoIntensity,
            ssaoShaderQualityMode: bloomDiagnostics.ssaoShaderQualityMode,
            ssaoPassCount: bloomDiagnostics.ssaoPassCount,
            ssaoBlendSourceFactor: bloomDiagnostics.ssaoBlendSourceFactor,
            ssaoBlendDestinationFactor:
              bloomDiagnostics.ssaoBlendDestinationFactor,
            ssaoStageOrder: bloomDiagnostics.ssaoStageOrder,
            ssaoFragmentSourceSha256:
              bloomDiagnostics.ssaoFragmentSourceSha256,
            ssaoIncludeSourceSha256:
              bloomDiagnostics.ssaoIncludeSourceSha256,
            ssaoFramebufferSourceSha256:
              bloomDiagnostics.ssaoFramebufferSourceSha256,
            ssaoVertexSourceSha256: bloomDiagnostics.ssaoVertexSourceSha256,
            rawGammaNormalVfxMeshCount:
              bloomDiagnostics.rawGammaNormalVfxMeshCount,
            rawGammaAdditiveVfxMeshCount:
              bloomDiagnostics.rawGammaAdditiveVfxMeshCount,
            colorPipelineStageOrder: bloomDiagnostics.colorPipelineStageOrder,
            textureSamplerStates,
            vfxRuntimeProofGateStatus:
              vfxRuntimeObservability.proofGate.status,
            vfxRuntimeProofBlockers:
              vfxRuntimeObservability.proofGate.blockerManifest,
            phase
          });
          lastReportedFrame = frameIndex;
        }
        const nextStatus: RunnerStatus = {
          state: "ready",
          phase,
          elapsedSeconds: safeElapsedSeconds,
          effectSeconds: clampedEffectSeconds,
          frameIndex,
          frameCount: readNumber(
            group.userData.auroraVfxCanonicalRuntimePlaybackFrameCount,
            1
          ),
          drawParticles,
          renderedChunkModels,
          boundChunkMaterialCount,
          visibleFrameCount,
          aoeVisualOwnerCount,
          aoePhaseCounts,
          objectDurationVisualOwnerPhase,
          objectDurationVisualOwnerActive,
          objectDurationVisualOwnerEffectRemovalStarted,
          objectDurationVisualOwnerTimerRemainingMilliseconds,
          objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds,
          objectDurationVisualOwnerRemovalProcessedAtMilliseconds,
          objectDurationVisualOwnerLastUpdateAtMilliseconds,
          sourceLightCount: sourceLights.length,
          sourceLightColor,
          sourceLightRadius,
          sourceLightIntensity,
          collisionProfile,
          collisionQueryCount,
          collisionHitCount,
          collisionAppliedHitCount,
          collisionStaticNoHitCount,
          collisionLandedParticleCount,
          bloomStatus: bloomDiagnostics.status,
          bloomDownscaleOffset: bloomDiagnostics.downscaleOffset,
          bloomDownscaleSteps: bloomDiagnostics.downscaleSteps,
          bloomThreshold: bloomDiagnostics.threshold,
          bloomSoftness: bloomDiagnostics.softness,
          bloomMultiplier: bloomDiagnostics.multiplier,
          bloomNormalizationFactor: bloomDiagnostics.normalizationFactor,
          ssaoConfiguredEnabled: bloomDiagnostics.ssaoConfiguredEnabled,
          ssaoRuntimeStatus: bloomDiagnostics.ssaoRuntimeStatus,
          ssaoIntensity: bloomDiagnostics.ssaoIntensity,
          ssaoShaderQualityMode: bloomDiagnostics.ssaoShaderQualityMode,
          ssaoPassCount: bloomDiagnostics.ssaoPassCount,
          ssaoBlendSourceFactor: bloomDiagnostics.ssaoBlendSourceFactor,
          ssaoBlendDestinationFactor:
            bloomDiagnostics.ssaoBlendDestinationFactor,
          ssaoStageOrder: bloomDiagnostics.ssaoStageOrder.join(" -> "),
          ssaoFragmentSourceSha256:
            bloomDiagnostics.ssaoFragmentSourceSha256,
          ssaoIncludeSourceSha256: bloomDiagnostics.ssaoIncludeSourceSha256,
          ssaoFramebufferSourceSha256:
            bloomDiagnostics.ssaoFramebufferSourceSha256,
          ssaoVertexSourceSha256: bloomDiagnostics.ssaoVertexSourceSha256,
          rawGammaNormalVfxMeshCount:
            bloomDiagnostics.rawGammaNormalVfxMeshCount,
          rawGammaAdditiveVfxMeshCount:
            bloomDiagnostics.rawGammaAdditiveVfxMeshCount,
          colorPipelineStageOrder: bloomDiagnostics.colorPipelineStageOrder.join(
            " -> "
          ),
          textureSamplerStates,
          meshDiagnostics: JSON.stringify(proofDrawMeshes),
          programDiagnostics: JSON.stringify(programDiagnostics),
          framebufferPixelDiagnostics: JSON.stringify(framebufferPixelDiagnostics),
          vfxRuntimeObservabilityVersion: vfxRuntimeObservability.version,
          vfxRuntimeIdentityStatus: vfxRuntimeObservability.identity.status,
          vfxRuntimeHostGraphStatus: vfxRuntimeObservability.hostGraph.status,
          vfxRuntimeAssetSettlementStatus:
            vfxRuntimeObservability.assetSettlement.status,
          vfxRuntimeDrawLedgerStatus:
            vfxRuntimeObservability.drawLedger.status,
          vfxRuntimePlaybackGuardStatus:
            vfxRuntimeObservability.playbackGuard.status,
          vfxRuntimeProofGateStatus:
            vfxRuntimeObservability.proofGate.status,
          vfxRuntimeProofBlockers:
            vfxRuntimeObservability.proofGate.blockerManifest.join("|"),
          visualParityReadinessStatus: visualParityReadiness.status,
          visualParityBlockers:
            visualParityReadiness.blockerManifest.join("|"),
          vfxDebugOverlayEnabled:
            vfxRuntimeObservability.debugOverlay.enabled,
          vfxDebugOverlayFinalProfileDisabled:
            vfxRuntimeObservability.debugOverlay.finalProfileDisabled,
          objectAttachmentStatus: objectAttachment.status,
          objectAttachmentNode: objectAttachment.resolvedNodeName,
          objectAttachmentWorldPosition:
            objectAttachment.worldPosition?.join(",") ?? "",
          message: "rendered"
        };
        setStatus(nextStatus);
        (window as unknown as Record<string, unknown>).__AURORA_VFX_PROOF__ = {
          fixtureId,
          oneTrigger: true,
          loop: false,
          runtimeObservability: vfxRuntimeObservability,
          status: nextStatus,
          renderDebug: {
            renderDiagnosticMode,
            proofRenderFrameStatus:
              proofRenderFrame.userData.auroraVfxProofRenderFrameStatus,
            proofRenderFrameScale: proofRenderFrame.scale.toArray(),
            proofRenderFrameMirror:
              proofRenderFrame.userData.auroraAreaRenderFrameMirror,
            cameraPosition: camera.position.toArray(),
            cameraUp: camera.up.toArray(),
            cameraStatus: viewProfile.cameraStatus ?? "unclassified",
            cameraSourceEvidence: viewProfile.cameraSourceEvidence ?? [],
            cameraCalibration:
              measureNwnVfxComparisonCameraCalibration(viewProfile),
            visualParityReadiness,
            nativeTimingCalibration: {
              playbackRate,
              playbackDelaySeconds,
              effectiveWallDurationSeconds,
              method:
                nativeTimingCalibration?.runtimeTimingCalibrationMethod ??
                "none",
              sourceEvidence:
                nativeTimingCalibration?.sourceEvidence ?? "",
              nativeTriggerRelativeOnsetSeconds:
                nativeTimingCalibration?.nativeTriggerRelativeOnsetSeconds ??
                null,
              nativeTriggerRelativeLastVisibleSeconds:
                nativeTimingCalibration?.nativeTriggerRelativeLastVisibleSeconds ??
                null,
              sourceOnsetSeconds:
                nativeTimingCalibration?.sourceOnsetSeconds ?? null,
              sourceDynamicPeakSeconds:
                nativeTimingCalibration?.sourceDynamicPeakSeconds ?? null,
              sourceLastVisibleSeconds:
                nativeTimingCalibration?.sourceLastVisibleSeconds ?? null
            },
            drawCalls: renderer.info.render.calls,
            triangles: renderer.info.render.triangles,
            programs: programDiagnostics,
            framebufferPixelDiagnostics,
            meshes: proofDrawMeshes,
            aoeVisualOwners: {
              ownerCount: aoeVisualOwnerCount,
              phaseCounts: aoePhaseCounts
                ? JSON.parse(aoePhaseCounts) as Record<string, number>
                : {},
              owners:
                activeFrame?.userData.auroraVfxCanonicalAoeVisualOwners ?? []
            },
            objectDurationVisualOwner: {
              phase: objectDurationVisualOwnerPhase,
              active: objectDurationVisualOwnerActive,
              effectRemovalStarted:
                objectDurationVisualOwnerEffectRemovalStarted,
              ownerTimerRemainingMilliseconds:
                objectDurationVisualOwnerTimerRemainingMilliseconds,
              postRemovalTimerRemainingMilliseconds:
                objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds,
              removalProcessedAtMilliseconds:
                objectDurationVisualOwnerRemovalProcessedAtMilliseconds,
              lastUpdateAtMilliseconds:
                objectDurationVisualOwnerLastUpdateAtMilliseconds
            },
            objectAttachmentTarget: {
              status: objectAttachmentTarget.status,
              phase: objectAttachmentTarget.phase,
              targetKind: objectAttachmentTarget.targetKind,
              targetSpecialNodePrefix:
                objectAttachmentTarget.targetSpecialNodePrefix,
              targetRootNames: objectAttachmentTarget.targetRoots.map(
                (root) => root.name
              )
            },
            objectAttachment,
            bloomDiagnostics,
            proofScene: {
              status: manifest.proofScene?.status ?? "absent",
              renderFrameStatus:
                proofRenderFrame.userData.auroraVfxProofRenderFrameStatus,
              renderFrameScale: proofRenderFrame.scale.toArray(),
              modelCount: proofSceneInstances.length,
              textureCount: proofSceneTexturesByReference.size,
              materialLighting: proofSceneMaterialLighting,
              areaLightingStatus:
                manifest.proofScene?.areaLighting?.status ?? "absent",
              areaLightingPhase:
                manifest.proofScene?.areaLighting?.phase ?? "",
              areaLightingLightCount:
                proofSceneAreaLightingLayer?.children.length ?? 0,
              localTileLightingStatus:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingStatus ??
                manifest.proofScene?.areaLighting?.localTileLightingStatus ??
                "absent",
              localTileLightingPointLightCount:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingPointLightCount ?? 0,
              localTileLightingResolvedSourceCount:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingResolvedSourceCount ?? 0,
              localTileLightingAbsentSourceCount:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingAbsentSourceCount ?? 0,
              localTileLightingUnresolvedSourceCount:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingUnresolvedSourceCount ?? 0,
              localTileLightingStaticMainCount:
                proofSceneTileLightingLayer?.userData
                  .auroraVfxProofSceneTileLightingStaticMainCount ?? 0,
              actorCount: proofSceneActors.length,
              actors: proofSceneActors.map((actor) => ({
                name: actor.root.name,
                status:
                  actor.root.userData.auroraVfxProofSceneActorStatus ?? "",
                templateResRef:
                  actor.root.userData
                    .auroraVfxProofSceneActorTemplateResRef ?? "",
                sourceModel:
                  actor.root.userData.auroraVfxProofSceneActorSourceModel ?? "",
                supermodel:
                  actor.root.userData.auroraVfxProofSceneActorSupermodel ?? "",
                animationName:
                  actor.root.userData
                    .auroraVfxProofSceneActorAnimationName ?? "",
                sourceBounds: actor.sourceBounds
              }))
            }
          },
          timeline
        };
        return nextStatus;
      };
      if (fixedTime === null && readCaptureStaticTimeline(window.location.search)) {
        const staticTimelineStatus = renderAtElapsed(0);
        const globals = window as unknown as Record<string, unknown>;
        const renderProofAt = (elapsedSeconds: number) =>
          disposed ? null : renderAtElapsed(elapsedSeconds);
        ownedProofRenderHook = renderProofAt;
        globals.__AURORA_VFX_PROOF_RENDER_AT__ = renderProofAt;
        setStatus({
          ...(staticTimelineStatus ?? initialStatus),
          state: "ready",
          message: "static-timeline-armed"
        });
        return;
      }
      if (fixedTime === null && readCaptureArmed(window.location.search)) {
        let started = false;
        const armedStatus = renderAtElapsed(0);
        const globals = window as unknown as Record<string, unknown>;
        const startProof = () => {
          if (disposed) {
            return false;
          }
          started = true;
          if (globals.__AURORA_VFX_PROOF_START__ === startProof) {
            delete globals.__AURORA_VFX_PROOF_START__;
          }
          return true;
        };
        const renderProofAt = (elapsedSeconds: number) =>
          started ? renderAtElapsed(elapsedSeconds) : null;
        ownedProofStartHook = startProof;
        ownedProofRenderHook = renderProofAt;
        globals.__AURORA_VFX_PROOF_START__ = startProof;
        globals.__AURORA_VFX_PROOF_RENDER_AT__ = renderProofAt;
        setStatus({
          ...(armedStatus ?? initialStatus),
          state: "ready",
          message: "armed"
        });
        return;
      }
      if (fixedTime === null && readCaptureSelfRecord(window.location.search)) {
        const plan = resolveNwnVfxComparisonSelfRecordPlan();
        actorHost
          .querySelector("[data-vfx-self-record-root]")
          ?.remove();
        const captureRoot = document.createElement("div");
        captureRoot.dataset.vfxSelfRecordRoot = "true";
        captureRoot.dataset.vfxSelfRecordState = "recording";
        captureRoot.dataset.vfxSelfRecordFps = String(plan.fps);
        captureRoot.dataset.vfxSelfRecordFrameCount = String(plan.frameCount);
        captureRoot.dataset.vfxSelfRecordChunkSize = String(plan.chunkSize);
        actorHost.append(captureRoot);

        const recordFrames = async () => {
          let chunkStartFrame = 0;
          let chunkFrames: Array<{
            frameIndex: number;
            elapsedSeconds: number;
            pngBase64: string;
          }> = [];
          let finalStatus: RunnerStatus | null | undefined;
          const flushChunk = () => {
            if (chunkFrames.length === 0) return;
            const chunk = document.createElement("script");
            chunk.type = "application/json";
            chunk.dataset.vfxSelfRecordChunk = String(chunkStartFrame);
            chunk.textContent = JSON.stringify({
              startFrame: chunkStartFrame,
              frames: chunkFrames
            });
            captureRoot.append(chunk);
            chunkFrames = [];
          };

          for (let frameIndex = 0; frameIndex < plan.frameCount; frameIndex += 1) {
            const elapsedSeconds = Math.min(
              plan.durationSeconds,
              frameIndex / plan.fps
            );
            finalStatus = renderAtElapsed(elapsedSeconds);
            if (!finalStatus) {
              throw new Error(`Self-record frame ${frameIndex} did not render.`);
            }
            const dataUrl = canvas.toDataURL("image/png");
            const pngBase64 = dataUrl.startsWith("data:image/png;base64,")
              ? dataUrl.slice("data:image/png;base64,".length)
              : "";
            if (!pngBase64) {
              throw new Error(`Self-record frame ${frameIndex} is not PNG data.`);
            }
            if (chunkFrames.length === 0) chunkStartFrame = frameIndex;
            chunkFrames.push({ frameIndex, elapsedSeconds, pngBase64 });
            if (chunkFrames.length >= plan.chunkSize) flushChunk();
            if (frameIndex % 4 === 3) {
              await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            }
          }
          flushChunk();
          captureRoot.dataset.vfxSelfRecordState = "complete";
          captureRoot.dataset.vfxSelfRecordChunkCount = String(
            captureRoot.querySelectorAll("[data-vfx-self-record-chunk]").length
          );
          setStatus({
            ...(finalStatus ?? initialStatus),
            state: "ready",
            message: "self-record-complete"
          });
        };
        void recordFrames().catch((error: unknown) => {
          captureRoot.dataset.vfxSelfRecordState = "error";
          captureRoot.dataset.vfxSelfRecordError = describeRunnerError(error);
          setStatus({
            ...initialStatus,
            state: "error",
            message: describeRunnerError(error)
          });
        });
        return;
      }
      if (fixedTime === null && readCaptureAutoplay(window.location.search)) {
        const startedAt = performance.now();
        const renderAutoplayFrame = (now: number) => {
          const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
          const nextStatus = renderAtElapsed(elapsedSeconds);
          const durationSeconds = readNumber(
            group?.userData.auroraVfxCanonicalRuntimePlaybackDurationSeconds,
            0
          );
          if (
            nextStatus &&
            elapsedSeconds <
              PRE_ROLL_SECONDS + durationSeconds + POST_ROLL_SECONDS
          ) {
            animationFrame = requestAnimationFrame(renderAutoplayFrame);
          }
        };
        animationFrame = requestAnimationFrame(renderAutoplayFrame);
        return;
      }
      if (fixedTime === null) {
        const baselineStatus = renderAtElapsed(0);
        setStatus({
          ...(baselineStatus ?? initialStatus),
          state: "ready",
          message: "baseline-unarmed"
        });
        return;
      }
      const startedAt = performance.now();
      const render = (now: number) => {
        const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
        const nextStatus = renderAtElapsed(elapsedSeconds);
        const durationSeconds = readNumber(
          group?.userData.auroraVfxCanonicalRuntimePlaybackDurationSeconds,
          0
        );
        if (
          fixedTime === null &&
          nextStatus &&
          elapsedSeconds < PRE_ROLL_SECONDS + durationSeconds + POST_ROLL_SECONDS
        ) {
          animationFrame = requestAnimationFrame(render);
        }
      };
      animationFrame = requestAnimationFrame(render);
    };

    void run().catch((error: unknown) => {
      setStatus({
        ...initialStatus,
        state: "error",
        message: describeRunnerError(error)
      });
    });

    return () => {
      disposed = true;
      delete (window as unknown as Record<string, unknown>).__AURORA_VFX_DEV_SCENE__;
      const globals = window as unknown as Record<string, unknown>;
      if (globals.__AURORA_VFX_PROOF_START__ === ownedProofStartHook) {
        delete globals.__AURORA_VFX_PROOF_START__;
      }
      if (globals.__AURORA_VFX_PROOF_RENDER_AT__ === ownedProofRenderHook) {
        delete globals.__AURORA_VFX_PROOF_RENDER_AT__;
      }
      cancelAnimationFrame(animationFrame);
      group?.traverse((node) => {
        if (!(node instanceof THREE.Mesh)) return;
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      });
      textures.forEach((entry) => entry.dispose());
      proofMeshes.forEach((mesh) => {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
      proofSceneInstances.forEach((instance) => {
        instance.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) return;
          node.geometry.dispose();
          const materials = Array.isArray(node.material)
            ? node.material
            : [node.material];
          materials.forEach((material) => material.dispose());
        });
      });
      proofSceneInstances = [];
      proofSceneActors.forEach((actor) => actor.dispose());
      proofSceneActors = [];
      bloomPass?.dispose();
      renderer?.dispose();
    };
  }, [fixtureId, viewProfile]);

  return (
    <main
      data-testid="nwn-vfx-comparison-runner"
      data-fixture-id={fixtureId}
      data-render-diagnostic-mode={readRenderDiagnosticMode(window.location.search)}
      data-render-state={status.state}
      data-phase={status.phase}
      data-elapsed-seconds={status.elapsedSeconds.toFixed(3)}
      data-effect-seconds={status.effectSeconds.toFixed(3)}
      data-frame-index={status.frameIndex}
      data-frame-count={status.frameCount}
      data-draw-particles={status.drawParticles}
      data-rendered-chunk-models={status.renderedChunkModels}
      data-bound-chunk-material-count={status.boundChunkMaterialCount}
      data-visible-frame-count={status.visibleFrameCount}
      data-aoe-visual-owner-count={status.aoeVisualOwnerCount}
      data-aoe-phase-counts={status.aoePhaseCounts}
      data-object-duration-visual-owner-phase={
        status.objectDurationVisualOwnerPhase
      }
      data-object-duration-visual-owner-active={
        status.objectDurationVisualOwnerActive
      }
      data-object-duration-visual-owner-effect-removal-started={
        status.objectDurationVisualOwnerEffectRemovalStarted
      }
      data-object-duration-visual-owner-timer-remaining-milliseconds={
        status.objectDurationVisualOwnerTimerRemainingMilliseconds.toFixed(3)
      }
      data-object-duration-visual-owner-post-removal-timer-remaining-milliseconds={
        status.objectDurationVisualOwnerPostRemovalTimerRemainingMilliseconds.toFixed(3)
      }
      data-object-duration-visual-owner-removal-processed-at-milliseconds={
        status.objectDurationVisualOwnerRemovalProcessedAtMilliseconds.toFixed(3)
      }
      data-object-duration-visual-owner-last-update-at-milliseconds={
        status.objectDurationVisualOwnerLastUpdateAtMilliseconds.toFixed(3)
      }
      data-source-light-count={status.sourceLightCount}
      data-source-light-color={status.sourceLightColor}
      data-source-light-radius={status.sourceLightRadius.toFixed(3)}
      data-source-light-intensity={status.sourceLightIntensity.toFixed(3)}
      data-collision-profile={status.collisionProfile}
      data-collision-query-count={status.collisionQueryCount}
      data-collision-hit-count={status.collisionHitCount}
      data-collision-applied-hit-count={status.collisionAppliedHitCount}
      data-collision-static-no-hit-count={status.collisionStaticNoHitCount}
      data-collision-landed-particle-count={status.collisionLandedParticleCount}
      data-bloom-status={status.bloomStatus}
      data-bloom-downscale-offset={status.bloomDownscaleOffset}
      data-bloom-downscale-steps={status.bloomDownscaleSteps}
      data-bloom-threshold={status.bloomThreshold.toFixed(3)}
      data-bloom-softness={status.bloomSoftness.toFixed(3)}
      data-bloom-multiplier={status.bloomMultiplier.toFixed(3)}
      data-bloom-normalization-factor={status.bloomNormalizationFactor.toFixed(6)}
      data-ssao-configured-enabled={status.ssaoConfiguredEnabled}
      data-ssao-runtime-status={status.ssaoRuntimeStatus}
      data-ssao-intensity={status.ssaoIntensity.toFixed(3)}
      data-ssao-shader-quality-mode={status.ssaoShaderQualityMode}
      data-ssao-pass-count={status.ssaoPassCount}
      data-ssao-blend-source-factor={status.ssaoBlendSourceFactor}
      data-ssao-blend-destination-factor={status.ssaoBlendDestinationFactor}
      data-ssao-stage-order={status.ssaoStageOrder}
      data-ssao-fragment-source-sha256={status.ssaoFragmentSourceSha256}
      data-ssao-include-source-sha256={status.ssaoIncludeSourceSha256}
      data-ssao-framebuffer-source-sha256={status.ssaoFramebufferSourceSha256}
      data-ssao-vertex-source-sha256={status.ssaoVertexSourceSha256}
      data-raw-gamma-normal-vfx-mesh-count={status.rawGammaNormalVfxMeshCount}
      data-raw-gamma-additive-vfx-mesh-count={status.rawGammaAdditiveVfxMeshCount}
      data-color-pipeline-stage-order={status.colorPipelineStageOrder}
      data-texture-sampler-states={status.textureSamplerStates}
      data-mesh-diagnostics={status.meshDiagnostics}
      data-program-diagnostics={status.programDiagnostics}
      data-framebuffer-pixel-diagnostics={status.framebufferPixelDiagnostics}
      data-vfx-runtime-observability-version={
        status.vfxRuntimeObservabilityVersion
      }
      data-vfx-runtime-identity-status={status.vfxRuntimeIdentityStatus}
      data-vfx-runtime-host-graph-status={status.vfxRuntimeHostGraphStatus}
      data-vfx-runtime-asset-settlement-status={
        status.vfxRuntimeAssetSettlementStatus
      }
      data-vfx-runtime-draw-ledger-status={status.vfxRuntimeDrawLedgerStatus}
      data-vfx-runtime-playback-guard-status={
        status.vfxRuntimePlaybackGuardStatus
      }
      data-vfx-runtime-proof-gate-status={status.vfxRuntimeProofGateStatus}
      data-vfx-runtime-proof-blockers={status.vfxRuntimeProofBlockers}
      data-visual-parity-readiness-status={status.visualParityReadinessStatus}
      data-visual-parity-blockers={status.visualParityBlockers}
      data-vfx-debug-overlay-enabled={
        status.vfxDebugOverlayEnabled ? "true" : "false"
      }
      data-vfx-debug-overlay-final-profile-disabled={
        status.vfxDebugOverlayFinalProfileDisabled ? "true" : "false"
      }
      data-object-attachment-status={status.objectAttachmentStatus}
      data-object-attachment-node={status.objectAttachmentNode}
      data-object-attachment-world-position={status.objectAttachmentWorldPosition}
      data-camera-status={viewProfile.cameraStatus ?? "unclassified"}
      data-message={status.message}
      data-one-trigger="true"
      data-loop="false"
      style={{
        width: nativePixelCanvas ? viewProfile.viewportWidth : "100vw",
        height: nativePixelCanvas ? viewProfile.viewportHeight : "100vh",
        margin: 0,
        display: nativePixelCanvas ? "block" : "grid",
        placeItems: nativePixelCanvas ? undefined : "center",
        overflow: "hidden",
        background: "#101214"
      }}
    >
      <canvas
        ref={canvasRef}
        width={viewProfile.viewportWidth}
        height={viewProfile.viewportHeight}
        aria-label="NWN VFX comparison fixture"
        style={{
          width: nativePixelCanvas ? viewProfile.viewportWidth : "100vw",
          height: nativePixelCanvas ? viewProfile.viewportHeight : "100vh",
          objectFit: "contain"
        }}
      />
      <div
        ref={actorHostRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          width: 1,
          height: 1,
          left: -10000,
          top: -10000,
          visibility: "hidden",
          pointerEvents: "none"
        }}
      />
      {status.state === "error" ? (
        <output style={{ position: "fixed", color: "#ffffff" }}>{status.message}</output>
      ) : null}
    </main>
  );
}

function describeRunnerError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error instanceof Event) {
    const target = error.target as
      | (EventTarget & {
          responseURL?: string;
          status?: number;
          src?: string;
        })
      | null;
    const resource = target?.responseURL || target?.src || "unknown-resource";
    const status = typeof target?.status === "number" ? ` HTTP ${target.status}` : "";
    return `resource load failed: ${resource}${status}`;
  }
  return String(error);
}

function uniqueNonEmptyStrings(values: readonly string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

async function loadNwnVfxObservedJson<T>(
  runtime: object,
  asset: VfxRuntimeExpectedAsset
): Promise<T> {
  registerVfxRuntimeExpectedAssets(runtime, [asset]);
  const startedAtMs = Date.now();
  recordVfxRuntimeAssetSettlement(runtime, asset.key, {
    stage: "requested",
    startedAtMs
  });
  try {
    const response = await fetch(asset.key);
    if (!response.ok) {
      throw new Error(`${asset.reference ?? asset.key} HTTP ${response.status}`);
    }
    const result = (await response.json()) as T;
    const completedAtMs = Date.now();
    recordVfxRuntimeAssetSettlement(runtime, asset.key, {
      stage: "decoded",
      completedAtMs,
      httpStatus: response.status
    });
    setVfxRuntimeAssetBound(runtime, asset.key, completedAtMs);
    return result;
  } catch (error) {
    recordVfxRuntimeAssetSettlement(runtime, asset.key, {
      stage: "failed",
      completedAtMs: Date.now(),
      error: describeRunnerError(error)
    });
    throw error;
  }
}

async function loadNwnVfxObservedAsset<T>(
  runtime: object,
  asset: VfxRuntimeExpectedAsset,
  load: () => Promise<T>
): Promise<T> {
  registerVfxRuntimeExpectedAssets(runtime, [asset]);
  const startedAtMs = Date.now();
  recordVfxRuntimeAssetSettlement(runtime, asset.key, {
    stage: "requested",
    startedAtMs
  });
  try {
    const result = await load();
    const completedAtMs = Date.now();
    recordVfxRuntimeAssetSettlement(runtime, asset.key, {
      stage: "decoded",
      completedAtMs
    });
    setVfxRuntimeAssetBound(runtime, asset.key, completedAtMs);
    return result;
  } catch (error) {
    recordVfxRuntimeAssetSettlement(runtime, asset.key, {
      stage: "failed",
      completedAtMs: Date.now(),
      error: describeRunnerError(error)
    });
    throw error;
  }
}

function readFixedTimeSeconds(search: string): number | null {
  const raw = new URLSearchParams(search).get("time");
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function readFixtureId(search: string): string {
  const requested = new URLSearchParams(search).get("fixture")?.trim() ?? "";
  return ALLOWED_FIXTURE_IDS.has(requested) ? requested : DEFAULT_FIXTURE_ID;
}

function readCaptureArmed(search: string): boolean {
  return new URLSearchParams(search).get("capture") === "armed";
}

function readCaptureAutoplay(search: string): boolean {
  return new URLSearchParams(search).get("capture") === "autoplay";
}

function readCaptureSelfRecord(search: string): boolean {
  return new URLSearchParams(search).get("capture") === "self-record";
}

function readCaptureStaticTimeline(search: string): boolean {
  return new URLSearchParams(search).get("capture") === "static-timeline";
}

function readDiagnosticHarness(search: string): boolean {
  return new URLSearchParams(search).get("diagnostics") === "1";
}

function readRenderDiagnosticMode(search: string): "retail" | "direct" {
  return new URLSearchParams(search).get("render") === "direct"
    ? "direct"
    : "retail";
}

function readTextureReferences(
  manifest: FixtureManifest
): Array<{
  resref: string;
  resourceKey: string;
  txi?: AuroraVfxCanonicalTextureSamplerState;
}> {
  const references = (manifest.textures ?? []).flatMap((entry) => {
    const resref = entry.resref?.trim().toLowerCase();
    if (!resref) return [];
    return [
      {
        resref,
        resourceKey: entry.resourceKey?.trim() || `${resref}.png`,
        ...(entry.txi ? { txi: entry.txi } : {})
      }
    ];
  });
  const legacyReference = manifest.texture?.resref?.trim().toLowerCase();
  if (references.length === 0 && legacyReference) {
    references.push({ resref: legacyReference, resourceKey: `${legacyReference}.png` });
  }
  if (references.length === 0) {
    references.push({ resref: "fxpa_flare", resourceKey: "fxpa_flare.png" });
  }
  return [...new Map(references.map((entry) => [entry.resref, entry])).values()];
}

export function buildNwnVfxSourceModelTextureBindings(
  references: ReadonlyArray<{
    resref: string;
    resourceKey: string;
    txi?: AuroraVfxCanonicalTextureSamplerState;
  }>,
  fixtureRoot: string
): PlaceableRenderPackageTextureBinding[] {
  return references.flatMap((reference) => {
    if (!reference.txi) return [];
    const {
      source: _source,
      downsampleMin: _downsampleMin,
      downsampleMax: _downsampleMax,
      ...txi
    } = reference.txi;
    return [
      {
        reference: reference.resref,
        assetId: `proof-texture:${reference.resourceKey}`,
        fileName: reference.resourceKey,
        objectKey: reference.resourceKey,
        deliveryUrl: `${fixtureRoot}/${reference.resourceKey}`,
        txi
      }
    ];
  });
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function createNwnVfxProofSceneAreaLightingLayer(
  lighting: NwnVfxProofSceneAreaLighting | undefined,
  intensityScale?: number
): THREE.Group | null {
  if (!lighting) return null;
  const ambientColor = resolveNwnVfxProofSceneColor(lighting.ambientColorRgb);
  const diffuseColor = resolveNwnVfxProofSceneColor(lighting.diffuseColorRgb);
  if (!ambientColor && !diffuseColor) return null;

  const layer = new THREE.Group();
  layer.name = "nwn-vfx-proof-scene-area-lighting";
  layer.userData = {
    auroraVfxProofSceneAreaLighting: true,
    auroraVfxProofSceneAreaLightingStatus: lighting.status ?? "",
    auroraVfxProofSceneAreaLightingPhase: lighting.phase ?? "",
    auroraVfxProofSceneAreaResref: lighting.areaResref ?? "",
    auroraVfxProofSceneLocalTileLightingStatus:
      lighting.localTileLightingStatus ?? ""
  };

  if (ambientColor) {
    const ambient = new THREE.AmbientLight(
      ambientColor,
      resolveNwnVfxProofSceneLightIntensity(1, intensityScale)
    );
    ambient.name = "nwn-vfx-proof-scene-area-ambient-light";
    ambient.userData = {
      auroraVfxProofSceneAreaLightRole: "ambient",
      auroraVfxProofSceneAreaLightSource: "ARE global lighting",
      auroraTerrainAreaGlobalLightRole: "ambient",
      auroraTerrainAreaGlobalLightingPhase: lighting.phase ?? "",
      auroraTerrainAreaGlobalLightColor: [...lighting.ambientColorRgb!]
    };
    layer.add(ambient);
  }

  if (diffuseColor) {
    const directional = new THREE.DirectionalLight(
      diffuseColor,
      resolveNwnVfxProofSceneLightIntensity(1, intensityScale)
    );
    directional.name = "nwn-vfx-proof-scene-area-diffuse-light";
    directional.position.set(
      ...(lighting.directionalPosition ??
        (lighting.phase === "moon"
          ? ([-0.35, 0.72, -0.5] as const)
          : ([0.45, 1, 0.35] as const)))
    );
    directional.userData = {
      auroraVfxProofSceneAreaLightRole: "diffuse",
      auroraVfxProofSceneAreaLightSource: "ARE global lighting",
      auroraTerrainAreaGlobalLightRole: "diffuse",
      auroraTerrainAreaGlobalLightingPhase: lighting.phase ?? "",
      auroraTerrainAreaGlobalLightColor: [...lighting.diffuseColorRgb!]
    };
    layer.add(directional);
  }

  return layer;
}

export function installNwnVfxProofSceneAreaLighting(
  scene: THREE.Scene,
  lighting: NwnVfxProofSceneAreaLighting | undefined,
  intensityScale?: number
): THREE.Group | null {
  const layer = createNwnVfxProofSceneAreaLightingLayer(lighting, intensityScale);
  if (!layer) return null;

  scene.userData = {
    ...scene.userData,
    auroraTerrainAreaGlobalLightingStatus: "active",
    auroraTerrainAreaGlobalLightingPhase: lighting?.phase ?? "",
    auroraTerrainAreaGlobalLightingFieldCount: lighting?.fields?.length ?? 0,
    auroraTerrainAreaGlobalLightingFields:
      lighting?.fields
        ?.map((entry) => `${entry.field ?? ""}:${entry.value ?? ""}`)
        .join("|") ?? "",
    auroraVfxProofSceneAreaLightingSource:
      "source-backed ARE global ambient/diffuse"
  };
  scene.add(layer);
  return layer;
}

export function resolveNwnVfxProofSceneTileSourceLightWorldPosition(
  model: ProofSceneModel,
  sourcePosition: [number, number, number]
): [number, number, number] {
  const transform = resolveNwnVfxProofSceneModelTransform(model);
  const localPosition = new THREE.Vector3(
    sourcePosition[0],
    sourcePosition[2],
    sourcePosition[1]
  );
  localPosition.applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    transform.rotationYRadians
  );
  localPosition.add(new THREE.Vector3(...transform.position));
  return [localPosition.x, localPosition.y, localPosition.z];
}

export function createNwnVfxProofSceneTileLightingLayer(
  models: NonNullable<FixtureManifest["proofScene"]>["models"] | undefined,
  intensityScale?: number
): THREE.Group | null {
  const entries = (models ?? []).flatMap((model) =>
    (model.tileLights ?? []).map((light) => ({ model, light }))
  );
  if (entries.length === 0) return null;

  const sourceEntries = entries.filter(({ light }) => light.role === "source");
  const resolvedSourceEntries = sourceEntries.filter(
    ({ light }) =>
      light.rendererStatus === "source-node-resolved" &&
      light.sourceNode?.coordinateSpace === "model-local-aurora-z-up" &&
      Array.isArray(light.sourceNode.position)
  );
  const unresolvedSourceEntries = sourceEntries.filter(
    ({ light }) => light.rendererStatus === "source-node-unresolved"
  );
  const absentSourceEntries = sourceEntries.filter(
    ({ light }) =>
      light.rendererStatus === "source-node-absent-by-aurora-slot-count"
  );
  const mainEntries = entries.filter(({ light }) => light.role === "main");
  const resolvedMainEntries = mainEntries.filter(
    ({ light }) =>
      light.rendererStatus === "main-native-node-resolved" &&
      light.nativeNode?.coordinateSpace === "model-local-aurora-z-up" &&
      Array.isArray(light.nativeNode.position) &&
      Number.isFinite(light.nativeNode.radius) &&
      (light.nativeNode.radius ?? 0) > 0
  );
  const unresolvedMainEntries = mainEntries.filter(
    ({ light }) => light.rendererStatus !== "main-native-node-resolved"
  );
  const falloffPatch = installAuroraLinearLightFalloffShaderChunk();

  const layer = new THREE.Group();
  layer.name = "nwn-vfx-proof-scene-tile-lighting";
  const status = [
    "source-backed-tile-lighting",
    `resolved-source-${resolvedSourceEntries.length}`,
    `absent-source-${absentSourceEntries.length}`,
    `unresolved-source-${unresolvedSourceEntries.length}`,
    `resolved-main-${resolvedMainEntries.length}`,
    `unresolved-main-${unresolvedMainEntries.length}`
  ].join(":");
  layer.userData = {
    auroraVfxProofSceneTileLighting: true,
    auroraVfxProofSceneTileLightingStatus: status,
    auroraVfxProofSceneTileLightingPointLightCount:
      resolvedSourceEntries.length + resolvedMainEntries.length,
    auroraVfxProofSceneTileLightingResolvedSourceCount:
      resolvedSourceEntries.length,
    auroraVfxProofSceneTileLightingAbsentSourceCount:
      absentSourceEntries.length,
    auroraVfxProofSceneTileLightingUnresolvedSourceCount:
      unresolvedSourceEntries.length,
    auroraVfxProofSceneTileLightingStaticMainCount: unresolvedMainEntries.length,
    auroraVfxProofSceneTileLightingResolvedMainCount: resolvedMainEntries.length,
    auroraVfxProofSceneTileLightingUnresolvedMainCount: unresolvedMainEntries.length,
    auroraVfxProofSceneTileLightingFalloffPatchStatus: falloffPatch.status,
    auroraVfxProofSceneTileLightingFalloffProofStatus:
      falloffPatch.proofStatus,
    auroraVfxProofSceneTileLightingFalloffSource: falloffPatch.source
  };

  resolvedSourceEntries.forEach(({ model, light }, index) => {
    const sourceLightProfile = resolveAuroraTerrainTileSourceLightProfile(
      light.rowId ?? 0,
      {
        ...(light.colorRgb ? { color: light.colorRgb } : {}),
        ...(light.colorSource ? { colorSource: light.colorSource } : {})
      }
    );
    const colorRgb = sourceLightProfile?.color ?? light.colorRgb;
    const sourcePosition = light.sourceNode?.position;
    const radius = light.sourceRadius;
    if (
      !colorRgb ||
      !sourcePosition ||
      !Number.isFinite(radius) ||
      (radius ?? 0) <= 0
    ) {
      return;
    }
    const colorEnergy = Math.max(1, colorRgb[0], colorRgb[1], colorRgb[2]);
    const multiplier =
      sourceLightProfile?.multiplier ??
      (typeof light.sourceMultiplier === "number" &&
      Number.isFinite(light.sourceMultiplier)
        ? light.sourceMultiplier
        : 1);
    const pointLight = new THREE.PointLight(
      new THREE.Color(
        colorRgb[0] / colorEnergy,
        colorRgb[1] / colorEnergy,
        colorRgb[2] / colorEnergy
      ),
      resolveNwnVfxProofSceneLightIntensity(
        colorEnergy * multiplier,
        intensityScale
      ),
      radius,
      1
    );
    pointLight.name = [
      "nwn-vfx-proof-scene-tile-source-light",
      model.instanceId ?? index,
      light.channel ?? index
    ].join("-");
    pointLight.position.set(
      ...resolveNwnVfxProofSceneTileSourceLightWorldPosition(
        model,
        sourcePosition
      )
    );
    pointLight.userData = {
      auroraVfxProofSceneTileLight: true,
      auroraVfxProofSceneTileLightRendererStatus: light.rendererStatus,
      auroraVfxProofSceneTileLightSourceNodeName:
        light.sourceNode?.name ?? "",
      auroraVfxProofSceneTileLightSourceCoordinateSpace:
        light.sourceNode?.coordinateSpace ?? "",
      auroraVfxProofSceneTileLightSourceSlotIndex:
        light.sourceSlotIndex ?? 0,
      auroraVfxProofSceneTileLightSourceNodeCount:
        light.sourceNodeCount ?? 0,
      auroraVfxProofSceneTileLightSourceSlotProofStatus:
        light.sourceSlotProofStatus ?? "",
      auroraTerrainTileLightRole: "source",
      auroraTerrainTileLightChannel: light.channel ?? "",
      auroraTerrainTileLightRow: light.rowId,
      auroraTerrainTileLightColor: colorRgb,
      auroraTerrainTileLightColorSource:
        sourceLightProfile?.colorSource ?? light.colorSource ?? "",
      auroraTerrainTileLightSourceMultiplier: multiplier,
      auroraTerrainTileLightSourceMultiplierSource:
        sourceLightProfile?.multiplierSource ?? light.sourceMultiplierStatus ?? "",
      auroraTerrainTileLightSourceAnimationName:
        sourceLightProfile?.animationName,
      auroraTerrainTileLightStaleColorCorrectionStatus:
        sourceLightProfile?.staleColorCorrectionStatus,
      auroraTerrainTileLightIntensityProofStatus:
        sourceLightProfile?.proofStatus,
      auroraTerrainTileLightSourceModelFileName:
        sourceLightProfile?.sourceModelFileName,
      auroraTerrainTileLightSourceModelHash:
        sourceLightProfile?.sourceModelHash,
      auroraTerrainTileLightDistance: radius,
      auroraTerrainTileLightDecay: 1,
      auroraTerrainTileLightFalloffFormula:
        "max(0,1-distance/radius)",
      auroraTerrainTileLightFalloffRendererPatchStatus:
        falloffPatch.status,
      auroraTerrainTileLightFalloffRendererProofStatus:
        falloffPatch.proofStatus,
      auroraTerrainTileLightFalloffRendererSource: falloffPatch.source,
      auroraTerrainTileLightSourceRadius: radius,
      auroraTerrainTileLightSourceRadiusUnits:
        light.sourceRadiusUnits ?? "",
      auroraTerrainTileLightRendererMode: "point-light-preview",
      auroraTerrainTileId: model.instanceId ?? ""
    };
    layer.add(pointLight);
  });

  resolvedMainEntries.forEach(({ model, light }, index) => {
    const colorRgb = light.colorRgb;
    const nativeNode = light.nativeNode;
    const nativePosition = nativeNode?.position;
    const radius = nativeNode?.radius;
    if (
      !colorRgb ||
      !nativePosition ||
      !Number.isFinite(radius) ||
      (radius ?? 0) <= 0
    ) {
      return;
    }
    const colorEnergy = Math.max(1, colorRgb[0], colorRgb[1], colorRgb[2]);
    const multiplier =
      typeof nativeNode.multiplier === "number" &&
      Number.isFinite(nativeNode.multiplier)
        ? nativeNode.multiplier
        : 1;
    const pointLight = new THREE.PointLight(
      new THREE.Color(
        colorRgb[0] / colorEnergy,
        colorRgb[1] / colorEnergy,
        colorRgb[2] / colorEnergy
      ),
      resolveNwnVfxProofSceneLightIntensity(
        colorEnergy * multiplier,
        intensityScale
      ),
      radius,
      1
    );
    pointLight.name = [
      "nwn-vfx-proof-scene-tile-main-light",
      model.instanceId ?? index,
      light.channel ?? index
    ].join("-");
    pointLight.position.set(
      ...resolveNwnVfxProofSceneTileSourceLightWorldPosition(
        model,
        nativePosition
      )
    );
    pointLight.userData = {
      auroraVfxProofSceneTileLight: true,
      auroraVfxProofSceneTileLightRendererStatus: light.rendererStatus,
      auroraVfxProofSceneTileLightSourceNodeName: nativeNode.name ?? "",
      auroraVfxProofSceneTileLightSourceCoordinateSpace:
        nativeNode.coordinateSpace ?? "",
      auroraTerrainTileLightRole: "main",
      auroraTerrainTileLightChannel: light.channel ?? "",
      auroraTerrainTileLightRow: light.rowId,
      auroraTerrainTileLightColor: colorRgb,
      auroraTerrainTileLightColorSource: light.colorSource ?? "",
      auroraTerrainTileLightSourceMultiplier: multiplier,
      auroraTerrainTileLightSourceMultiplierSource:
        `${nativeNode.sourceModelFileName ?? "tile MDL"} native light multiplier`,
      auroraTerrainTileLightIntensityProofStatus:
        nativeNode.proofStatus ?? "source-backed-tile-mdl-native-main-light",
      auroraTerrainTileLightSourceModelFileName:
        nativeNode.sourceModelFileName,
      auroraTerrainTileLightSourceModelHash: nativeNode.sourceModelHash,
      auroraTerrainTileLightSourceModelObjectKey:
        nativeNode.sourceModelObjectKey,
      auroraTerrainTileLightDistance: radius,
      auroraTerrainTileLightDecay: 1,
      auroraTerrainTileLightFalloffFormula: "max(0,1-distance/radius)",
      auroraTerrainTileLightFalloffRendererPatchStatus: falloffPatch.status,
      auroraTerrainTileLightFalloffRendererProofStatus:
        falloffPatch.proofStatus,
      auroraTerrainTileLightFalloffRendererSource: falloffPatch.source,
      auroraTerrainTileLightSourceRadius: radius,
      auroraTerrainTileLightSourceRadiusUnits: "aurora-model-units",
      auroraTerrainTileLightSourcePriority: nativeNode.lightPriority,
      auroraTerrainTileLightRendererMode: "native-tile-mdl-point-light",
      auroraTerrainTileId: model.instanceId ?? ""
    };
    layer.add(pointLight);
  });

  return layer;
}

export function installNwnVfxProofSceneTileLighting(
  scene: THREE.Scene,
  models: NonNullable<FixtureManifest["proofScene"]>["models"] | undefined
): THREE.Group | null {
  const layer = createNwnVfxProofSceneTileLightingLayer(models);
  if (!layer) return null;
  scene.add(layer);
  return layer;
}

function resolveNwnVfxProofSceneColor(
  value: [number, number, number] | undefined
): THREE.Color | null {
  if (
    !value ||
    value.some((component) => !Number.isFinite(component))
  ) {
    return null;
  }
  return new THREE.Color(value[0], value[1], value[2]);
}

export function resolveNwnVfxProofSceneLightIntensity(
  sourceIntensity: number,
  calibrationScale: number | undefined
): number {
  const scale =
    typeof calibrationScale === "number" &&
    Number.isFinite(calibrationScale) &&
    calibrationScale >= 0
      ? calibrationScale
      : 1;
  return sourceIntensity * scale;
}

export function prepareNwnVfxProofSceneModelSource(
  source: THREE.Object3D
): AuroraSourceHierarchySynthesisResult {
  const result = ensureAuroraSourceHierarchyObjects(source);
  const restored =
    result.synthesizedNodeCount > 0 ||
    result.reparentedNodeCount > 0 ||
    result.rebasedGeometryCount > 0;
  source.userData = {
    ...source.userData,
    auroraVfxProofSceneSourceHierarchyStatus: restored
      ? "restored"
      : "unchanged",
    auroraVfxProofSceneSourceHierarchySynthesizedNodeCount:
      result.synthesizedNodeCount,
    auroraVfxProofSceneSourceHierarchySynthesizedNodeNames:
      result.synthesizedNodeNames,
    auroraVfxProofSceneSourceHierarchyReparentedNodeCount:
      result.reparentedNodeCount,
    auroraVfxProofSceneSourceHierarchyRebasedGeometryCount:
      result.rebasedGeometryCount,
    auroraVfxProofSceneSourceHierarchyRebasedGeometryNodeNames:
      result.rebasedGeometryNodeNames
  };
  return result;
}

function createNwnVfxProofSceneModelInstance(
  source: THREE.Object3D,
  model: ProofSceneModel,
  texturesByReference: ReadonlyMap<string, THREE.Texture>,
  meshVisibilityRule: ProofSceneMeshVisibilityRule
): THREE.Group {
  const transform = resolveNwnVfxProofSceneModelTransform(model);
  const instance = new THREE.Group();
  instance.name =
    model.instanceId?.trim() || model.sourceResref?.trim() || "proof-scene-model";
  instance.position.set(...transform.position);
  instance.rotation.y = transform.rotationYRadians;
  instance.userData = {
    auroraVfxProofSceneModel: true,
    auroraVfxProofSceneModelInstanceId: model.instanceId?.trim() ?? "",
    auroraVfxProofSceneRole: model.role ?? "",
    auroraVfxProofSceneSourceResref: model.sourceResref ?? "",
    auroraVfxProofSceneSourceCoordinateSpace: "aurora-z-up",
    auroraVfxProofSceneSourceOrientationQuarterTurns:
      model.orientationQuarterTurns ?? 0
  };

  // Filter against the immutable GLB/model-space bounds. The hierarchy
  // restoration below rebases geometry and would otherwise erase the native
  // floor/furniture versus roof/wall height separation used by this filter.
  applyNwnVfxProofSceneMeshVisibilityRule(source, meshVisibilityRule);
  prepareNwnVfxProofSceneModelSource(source);
  bindNwnVfxProofSceneModelMaterials(source, texturesByReference);
  instance.add(source);
  return instance;
}

function applyNwnVfxProofSceneMeshVisibilityRule(
  source: THREE.Object3D,
  meshVisibilityRule: ProofSceneMeshVisibilityRule
): void {
  if (!meshVisibilityRule) return;
  source.updateMatrixWorld(true);
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const modelYBounds = resolveNwnVfxProofSceneMeshModelYBounds(node);
    node.visible = resolveNwnVfxProofSceneMeshVisibility(
      meshVisibilityRule,
      modelYBounds
    );
    node.userData = {
      ...node.userData,
      auroraVfxProofSceneMeshVisibilityRuleVersion: meshVisibilityRule.version,
      auroraVfxProofSceneMeshVisibilityRuleKind: meshVisibilityRule.kind,
      auroraVfxProofSceneMeshVisibilityRuleMaximumY: meshVisibilityRule.maximumY,
      auroraVfxProofSceneMeshVisibilityRuleVisible: node.visible,
      auroraVfxProofSceneMeshVisibilityRuleModelMinY: modelYBounds.minY,
      auroraVfxProofSceneMeshVisibilityRuleModelMaxY: modelYBounds.maxY
    };
  });
}

export function resolveNwnVfxProofSceneMeshModelYBounds(
  mesh: THREE.Mesh
): { minY: number; maxY: number } {
  mesh.geometry.computeBoundingBox();
  const localBounds = mesh.geometry.boundingBox;
  if (!localBounds) {
    return {
      minY: Number.NEGATIVE_INFINITY,
      maxY: Number.POSITIVE_INFINITY
    };
  }
  mesh.updateWorldMatrix(true, false);
  const modelBounds = localBounds.clone().applyMatrix4(mesh.matrixWorld);
  return { minY: modelBounds.min.y, maxY: modelBounds.max.y };
}

export function resolveNwnVfxProofSceneMeshVisibility(
  meshVisibilityRule: ProofSceneMeshVisibilityRule,
  bounds: { minY: number; maxY: number }
): boolean {
  if (!meshVisibilityRule) return true;
  if (
    meshVisibilityRule.version !==
      "nwn-vfx-proof-scene-mesh-visibility-rule/v1" ||
    meshVisibilityRule.kind !== "model-y-maximum" ||
    !Number.isFinite(meshVisibilityRule.maximumY)
  ) {
    return false;
  }
  return bounds.maxY <= meshVisibilityRule.maximumY;
}

function bindNwnVfxProofSceneModelMaterials(
  source: THREE.Object3D,
  texturesByReference: ReadonlyMap<string, THREE.Texture>
): void {
  source.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const sourceMaterialLighting = installAuroraMdlSourceMaterialLighting(material);
      material.userData = {
        ...material.userData,
        auroraVfxProofSceneMdlMaterialLightingInstallStatus:
          sourceMaterialLighting.status
      };
      const aurora = material.userData.aurora;
      const textureReference =
        aurora &&
        typeof aurora === "object" &&
        typeof (aurora as Record<string, unknown>).textureReference === "string"
          ? ((aurora as Record<string, unknown>).textureReference as string)
              .trim()
              .toLowerCase()
          : "";
      const texture = textureReference
        ? texturesByReference.get(textureReference)
        : undefined;
      const textureMaterial = material as THREE.Material & {
        map?: THREE.Texture | null;
      };
      if (!texture || !("map" in textureMaterial)) return;
      applyNwnVfxProofSceneTextureWrap(texture);
      textureMaterial.map = texture;
      textureMaterial.needsUpdate = true;
      textureMaterial.userData = {
        ...textureMaterial.userData,
        auroraVfxProofSceneTextureReference: textureReference,
        auroraVfxProofSceneTextureBound: true,
        auroraVfxProofSceneTextureFlipY: texture.flipY
      };
    });
  });
}

export function applyNwnVfxProofSceneTextureWrap(texture: THREE.Texture): void {
  // Aurora area-model UVs intentionally extend well beyond [0, 1] (the inn
  // plank floor is around U=28..30). Without a TXI clamp contract, model
  // textures repeat; Three's ClampToEdge default collapses such meshes to a
  // single edge texel and made the accepted proof floor nearly black.
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.userData = {
    ...texture.userData,
    auroraVfxProofSceneTextureWrapStatus: "aurora-model-uv-repeat"
  };
  texture.needsUpdate = true;
}

export function bindNwnVfxProofSceneModelMaterialsForTests(
  source: THREE.Object3D,
  texturesByReference: ReadonlyMap<string, THREE.Texture>
): void {
  bindNwnVfxProofSceneModelMaterials(source, texturesByReference);
}

export interface NwnVfxProofSceneMaterialLightingSummary {
  visibleMaterialCount: number;
  installedCount: number;
  unsupportedMaterialCount: number;
  sourceMaterialUnavailableCount: number;
  unsupportedSourceProvenanceCount: number;
  unsupportedZeroDiffuseChannelCount: number;
  blockerManifest: string[];
}

export function summarizeNwnVfxProofSceneMaterialLighting(
  roots: readonly THREE.Object3D[]
): NwnVfxProofSceneMaterialLightingSummary {
  const materials = new Set<THREE.Material>();
  roots.forEach((root) => {
    root.traverseVisible((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const nodeMaterials = Array.isArray(node.material)
        ? node.material
        : [node.material];
      nodeMaterials.forEach((material) => materials.add(material));
    });
  });
  const statuses = Array.from(materials, (material) =>
    String(
      material.userData.auroraVfxProofSceneMdlMaterialLightingInstallStatus ??
        "source-material-unavailable"
    )
  );
  const installedCount = statuses.filter(
    (status) => status === "installed" || status === "already-installed"
  ).length;
  const unsupportedMaterialCount = statuses.filter(
    (status) => status === "unsupported-material"
  ).length;
  const sourceMaterialUnavailableCount = statuses.filter(
    (status) => status === "source-material-unavailable"
  ).length;
  const unsupportedSourceProvenanceCount = statuses.filter(
    (status) => status === "unsupported-source-provenance"
  ).length;
  const unsupportedZeroDiffuseChannelCount = statuses.filter(
    (status) => status === "unsupported-zero-diffuse-channel"
  ).length;
  const blockerManifest = [
    ...(unsupportedMaterialCount > 0
      ? [`proof-scene-mdl-material-unsupported:${unsupportedMaterialCount}`]
      : []),
    ...(sourceMaterialUnavailableCount > 0
      ? [`proof-scene-mdl-material-source-missing:${sourceMaterialUnavailableCount}`]
      : []),
    ...(unsupportedSourceProvenanceCount > 0
      ? [`proof-scene-mdl-material-provenance-unverified:${unsupportedSourceProvenanceCount}`]
      : []),
    ...(unsupportedZeroDiffuseChannelCount > 0
      ? [`proof-scene-mdl-material-zero-diffuse-unsupported:${unsupportedZeroDiffuseChannelCount}`]
      : [])
  ];
  return {
    visibleMaterialCount: materials.size,
    installedCount,
    unsupportedMaterialCount,
    sourceMaterialUnavailableCount,
    unsupportedSourceProvenanceCount,
    unsupportedZeroDiffuseChannelCount,
    blockerManifest
  };
}

function readTexturePixelStats(texture: THREE.Texture | null): Record<string, unknown> | null {
  const image = texture?.image as
    | { data?: ArrayLike<number>; width?: unknown; height?: unknown }
    | undefined;
  const data = image?.data;
  const width = readNumber(image?.width, 0);
  const height = readNumber(image?.height, 0);
  if (!data || width <= 0 || height <= 0) return null;
  const channelCount = data.length / (width * height);
  if (!Number.isInteger(channelCount) || channelCount <= 0) return null;
  const min = Array.from({ length: channelCount }, () => Number.POSITIVE_INFINITY);
  const max = Array.from({ length: channelCount }, () => Number.NEGATIVE_INFINITY);
  for (let index = 0; index < data.length; index += channelCount) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const value = Number(data[index + channel]);
      min[channel] = Math.min(min[channel]!, value);
      max[channel] = Math.max(max[channel]!, value);
    }
  }
  return { channelCount, min, max };
}

function readFramebufferPixelStats(
  renderer: THREE.WebGLRenderer
): Record<string, unknown> {
  const context = renderer.getContext();
  const width = context.drawingBufferWidth;
  const height = context.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  context.readPixels(
    0,
    0,
    width,
    height,
    context.RGBA,
    context.UNSIGNED_BYTE,
    pixels
  );
  const baseline = [pixels[0] ?? 0, pixels[1] ?? 0, pixels[2] ?? 0];
  let changedPixelCount = 0;
  let maxChannel = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index] ?? 0;
    const green = pixels[index + 1] ?? 0;
    const blue = pixels[index + 2] ?? 0;
    if (
      Math.abs(red - baseline[0]!) > 3 ||
      Math.abs(green - baseline[1]!) > 3 ||
      Math.abs(blue - baseline[2]!) > 3
    ) {
      changedPixelCount += 1;
    }
    maxChannel = Math.max(maxChannel, red, green, blue);
  }
  return {
    width,
    height,
    baseline,
    changedPixelCount,
    maxChannel,
    error: context.getError()
  };
}

export function resolveNwnVfxComparisonAdditiveRadianceCalibration(
  calibration: FixtureManifest["nativeOracleCalibration"]
): { scale: number; sourceEvidence: string } | undefined {
  const scale = calibration?.additiveParticleRadianceScale;
  const sourceEvidence = calibration?.sourceEvidence?.trim();
  if (
    typeof scale !== "number" ||
    !Number.isFinite(scale) ||
    scale <= 0 ||
    !sourceEvidence
  ) {
    return undefined;
  }
  return {
    scale,
    sourceEvidence
  };
}

export function resolveNwnVfxProofSceneEffectOriginPosition(
  basePosition: [number, number, number],
  alignment:
    | {
        offset: [number, number, number];
        sourceEvidence: string;
        method:
          | "native-vfx-positive-luminance-centroid"
          | "source-location-rebased-scene-origin";
      }
    | undefined
): [number, number, number] {
  if (!alignment) return [...basePosition];
  const [sourceX, sourceY, sourceZ] = alignment.offset;
  return [
    basePosition[0] + sourceX,
    basePosition[1] + sourceZ,
    basePosition[2] + sourceY
  ];
}

export function resolveNwnVfxComparisonBloomProfile(
  calibration: FixtureManifest["nativeOracleCalibration"]
) {
  const configuredMultiplier = calibration?.bloomMultiplier;
  const sourceEvidence = calibration?.sourceEvidence?.trim();
  const multiplier =
    typeof configuredMultiplier === "number" &&
    Number.isFinite(configuredMultiplier) &&
    configuredMultiplier >= 0 &&
    sourceEvidence
      ? configuredMultiplier
      : AURORA_RETAIL_BLOOM_DEFAULT_PROFILE.multiplier;
  return {
    ...AURORA_RETAIL_BLOOM_DEFAULT_PROFILE,
    multiplier
  };
}

function applyProofGroupMotion(
  group: THREE.Group,
  motion: ProofGroupMotion | undefined,
  effectSeconds: number,
  basePosition: THREE.Vector3
): void {
  group.position.fromArray(
    resolveNwnVfxProofGroupPosition(
      basePosition.toArray(),
      motion,
      effectSeconds
    )
  );
}

export function resolveNwnVfxProofGroupPosition(
  basePosition: [number, number, number],
  motion: ProofGroupMotion | undefined,
  effectSeconds: number
): [number, number, number] {
  if (!motion) {
    return [...basePosition];
  }
  const durationSeconds = Math.max(0.001, motion.durationSeconds);
  const alpha = THREE.MathUtils.clamp(effectSeconds / durationSeconds, 0, 1);
  return [
    basePosition[0] + THREE.MathUtils.lerp(motion.from[0], motion.to[0], alpha),
    basePosition[1] + THREE.MathUtils.lerp(motion.from[1], motion.to[1], alpha),
    basePosition[2] + THREE.MathUtils.lerp(motion.from[2], motion.to[2], alpha)
  ];
}
