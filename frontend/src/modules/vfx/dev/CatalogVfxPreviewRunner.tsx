import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { WorkspaceToolbarState } from "../../layout/roleTopbarPolicy";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import { createHttpPlaceableApiPort } from "../../placeables/adapters/httpPlaceableApiPort";
import {
  fetchPlaceableViewportRenderPayload,
  type PlaceableViewportRenderPayload
} from "../../placeables/application/placeableRenderPayloadResolver";
import type { PlaceableApiSubtypeHint } from "../../placeables/contracts";
import {
  applyPlaceableAssetRequestHeaders,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  resizeRuntime,
  updateRuntimeObjectAnimationPlaybacks
} from "../../layout/adapters/three/workspaceThreeRuntime";
import { rebuildGridLayer } from "../../layout/adapters/three/workspaceGridLayer";
import {
  rebuildObjectMeshes,
  writePlaceableTwoDaLightRenderDiagnostics
} from "../../layout/adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../../layout/adapters/three/workspaceSceneLightDiagnostics";

const CATALOG_VFX_PREVIEW_PATH = "/dev/catalog-vfx-preview";
const DEFAULT_TEMPLATE_ID = "plc_zlc_o45";
const DEFAULT_SUBTYPE_HINT: PlaceableApiSubtypeHint = "vfx";
const DEFAULT_TIME_SECONDS = 0.32;
const DEFAULT_SEED = 211;
const OBJECT_PIXEL_THRESHOLD = 80;
const CATALOG_VFX_EMITTER_PROOF_MODE_OBVIOUS = "obvious";
const CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA =
  "source-mdl-emitter-obvious-video-proof";
const CATALOG_VFX_EMITTER_OBVIOUS_PARTICLE_SCALE = 4.25;
const CATALOG_VFX_EMITTER_OBVIOUS_MODEL_OPACITY = 0.12;
const CATALOG_VFX_EMITTER_OBVIOUS_RENDER_ORDER = 120;
const CATALOG_VFX_EMITTER_PROOF_DEFAULT_DISTANCE_SCALE = 0.46;
const CATALOG_PREVIEW_AREA_SHADOW_OPACITY_SOURCE =
  "ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306";
const CATALOG_PREVIEW_AREA_SHADOW_OPACITY_FACTOR_SOURCE =
  "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844";
const CATALOG_PREVIEW_AUTH_SESSION_STORAGE_KEY = "aurora_web.auth_session.v1";
const CATALOG_PREVIEW_DEFAULT_API_BASE_URL = "/_aurora/v1";

declare global {
  interface Window {
    __auroraCatalogVfxPreviewForceRender?: () => boolean;
  }
}

type RunnerStatus = "loading" | "ready" | "error";
type CatalogVfxEmitterProofMode = "off" | "obvious";
type CatalogVfxEmitterCameraTarget = "source-mdl" | "flame";
type CatalogVfxTextureSourceOverride = "module" | "hak" | "vanilla";

interface PixelSignal {
  objectVisible: boolean;
  objectPixelCount: number;
}

interface LoginEnvelope {
  data?: {
    session?: {
      accessToken?: string;
    };
  };
}

interface StoredAuthSessionEnvelope {
  session?: {
    accessToken?: string;
  };
}

type JsonRecord = Record<string, unknown>;

interface RunnerSnapshot {
  status: RunnerStatus;
  error: string | null;
  templateId: string;
  resref: string;
  appearanceType: number | null;
  genericType: number | null;
  tag: string;
  localizedName: string;
  subtypeHint: PlaceableApiSubtypeHint;
  placeableSubtype: string;
  renderIsVfx: boolean | null;
  routeTimeSeconds: number;
  seed: number;
  lightStateOverride: number | null;
  shadowSizeOverride: number | null;
  areaShadowOpacityOverride: number | null;
  areaShadowOpacityFactorOverride: number | null;
  maxLightsOverride: number | null;
  useAreaLightingOverride: boolean | null;
  displayShadowsOverride: boolean | null;
  rendererStencilBuffer: boolean | null;
  shadowVolumeStencilMaterialCount: number;
  shadowVolumeStencilReceiverCount: number;
  canvasNonblank: boolean;
  objectPixelsWithoutGrid: number;
  renderPackageStatus: string;
  diagnosticCodes: string[];
  modelFileName: string;
  textureUrls: string[];
  placeableModelStatus: string;
  placeableModelLoadPhase: string;
  placeableModelTextureStatus: string;
  placeableModelTextureLoaded: number | null;
  placeableModelTextureCount: number | null;
  placeableModelTextureSource: string;
  sourceMdlPayloadReady: boolean;
  sourceMdlEmitterPreviewStatus: string;
  sourceMdlEmitterPreviewMode: string;
  sourceMdlEmitterPreviewVisibilityMode: string;
  sourceMdlEmitterPreviewTextureStatus: string;
  emitterProofMode: CatalogVfxEmitterProofMode;
  textureSourceOverride: CatalogVfxTextureSourceOverride | null;
  emitterProofDistanceScale: number | null;
  emitterCameraDistanceScale: number | null;
  emitterCameraOrbitDeg: number | null;
  emitterCameraTarget: CatalogVfxEmitterCameraTarget;
  emitterAxisDebug: boolean;
  emitterSource: string;
  emitterCount: number;
  emitterNodes: string[];
  renderedEmitterCount: number;
  renderedEmitterNodes: string[];
  renderedEmitterTextures: string[];
  emitterNode: string;
  emitterType: string;
  emitterTexture: string;
  emitterBlendMode: string;
  emitterRenderMode: string;
  particleCount: number;
  textureStatus: string;
  alphaStart: number | null;
  alphaEnd: number | null;
  sizeStart: number | null;
  sizeEnd: number | null;
  particleSizeVisibilityFloorPreviewMode: string;
  flameEmitterNode: string;
  flameEmitterParticleCount: number;
  flameEmitterBatchVisibleCount: number;
  flameEmitterBatchSlotCount: number;
  flameEmitterColumnPreviewMode: string;
  flameEmitterAxisPreviewMode: string;
  flameEmitterColorPreviewMode: string;
  flameEmitterAlphaPreviewMode: string;
  flameEmitterDensityPreviewMode: string;
  flameEmitterCorePreviewMode: string;
  flameEmitterSchedulePreviewMode: string;
  flameEmitterTransformUnitScalePreviewMode: string;
  emitterAxisDebugSamples: string[];
  colorStart: number[];
  colorEnd: number[];
  meshCount: number;
  visibleMeshCount: number;
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
  auroraLightNodes: string[];
  auroraLightSourceNodeCount: number;
  auroraLightAcceptedNodeCount: number;
  auroraLightFlarePayloadNodeCount: number;
  auroraLightFlareRadiusWriteUnverified: boolean;
  auroraLightShadowCastCount: number;
  auroraLightShadowProofStatuses: string[];
  auroraLightAnimatedSourceRadius: number | null;
  auroraLightQuadraticAtten: number | null;
  auroraLightQuadraticAttenProofStatuses: string[];
  auroraLightBudgetCap: number | null;
  auroraLightBudgetHardCap: number | null;
  auroraLightConfiguredMaxLights: number | null;
  auroraLightBudgetStrategy: string;
  auroraLightBudgetStrategySource: string;
  auroraLightBudgetStrategyProofStatus: string;
  auroraLightPreviewMode: string;
  auroraLightSamples: string[];
  sourceMdlLightPayloadReady: boolean;
  lightSource: string;
  lightNode: string;
  lightRadius: number | null;
  lightShadowRadius: number | null;
  lightVerticalDisplacement: number | null;
  lightMultiplier: number | null;
  lightColor: number[];
  lightAmbientOnly: boolean | null;
  lightDynamicType: number | null;
  lightAffectDynamic: boolean | null;
  lightShadow: boolean | null;
  lightPriority: number | null;
  lightGenerateFlare: boolean | null;
  lightGenerateFlareProofStatus: string;
  lightLensFlares: boolean | null;
  lightLensFlaresProofStatus: string;
  lightFadingLight: boolean | null;
  lightFadingLightProofStatus: string;
  lightTextureNames: string[];
  lightFlareSizeCount: number;
  lightFlarePositionCount: number;
  lightFlareColorShiftCount: number;
  lightFlareArrayProofStatus: string;
  lightFlareRadius: number | null;
  lightFlareRadiusProofStatus: string;
  placeableTwoDaLightStatus: string;
  placeableTwoDaLightSourceCount: number;
  placeableTwoDaLightPointLightCount: number;
  placeableTwoDaLightFastShadowCount: number;
  placeableTwoDaLightDisabledCount: number;
  placeableTwoDaLightDisabledByLightStateCount: number;
  placeableTwoDaLightDisabledByUseAreaLightingCount: number;
  placeableTwoDaLightSamples: string[];
  scenePointLightProofStatus: string;
  scenePointLightRetailOrderingStatus: string;
  scenePointLightRetailOrderingSortScoreSource: string;
  scenePointLightRetailOrderingSortScoreFormula: string;
  scenePointLightRetailOrderingSortDirection: string;
  scenePointLightRetailOrderingSortScoreProofStatus: string;
  scenePointLightRetailOrderingCoverageStatus: string;
  scenePointLightRetailOrderingRequiredLanes: string[];
  scenePointLightRetailOrderingObservedLanes: string[];
  scenePointLightRetailOrderingMissingLanes: string[];
  scenePointLightRetailOrderingRuntimeProbeStatus: string;
  scenePointLightRetailOrderingRuntimeProbeProofSource: string;
  scenePointLightRetailOrderingRuntimeProbeBlocker: string;
  scenePointLightRetailOrderingRuntimeProbeLocalOrderSource: string;
  scenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount: number;
  scenePointLightRetailOrderingRuntimeProbePointLightSampleCount: number;
  scenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount: number;
  scenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes: string[];
  scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: string[];
  scenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: string[];
  scenePointLightRetailOrderingRuntimeProbeLocalOrderSamples: string[];
  scenePointLightBudgetMode: string;
  scenePointLightCount: number;
  sceneSourceBackedPointLightCount: number;
  scenePointLightLanes: string[];
  scenePointLightLaneCounts: Record<string, number>;
  scenePointLightPreviewBudgetCap: number | null;
  scenePointLightPreviewBudgetHardCap: number | null;
  scenePointLightPreviewBudgetCapSource: string;
  scenePointLightPreviewBudgetCapProofStatus: string;
  scenePointLightConfiguredMaxLights: number | null;
  scenePointLightPreviewBudgetAcceptedCount: number;
  scenePointLightPreviewBudgetDroppedCount: number;
  scenePointLightSamples: string[];
  sceneNonPointLightRequestCount: number;
  sceneNonPointLightRequestLanes: string[];
  sceneNonPointLightRequestLaneCounts: Record<string, number>;
  sceneNonPointLightRequestSamples: string[];
  sceneShadowProofStatus: string;
  sceneShadowRetailProjectionStatus: string;
  sceneShadowRetailProjectionSource: string;
  sceneShadowRetailProjectionShaderNames: string[];
  sceneShadowRetailProjectionProofStatus: string;
  sceneShadowRetailProjectionBlocker: string;
  sceneShadowRetailProjectionRuntimeProbeStatus: string;
  sceneShadowRetailProjectionRuntimeProbeProofSource: string;
  sceneShadowRetailProjectionRuntimeProbeBlocker: string;
  sceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus: string;
  sceneShadowRetailProjectionRuntimeProbeActiveCasterCount: number;
  sceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount: number;
  sceneShadowRetailProjectionRuntimeProbeStencilReceiverCount: number;
  sceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount: number;
  sceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses: string[];
  sceneShadowRetailProjectionRuntimeProbeObservedStencilPasses: string[];
  sceneShadowRetailProjectionRuntimeProbeRenderShaderNames: string[];
  sceneShadowRetailProjectionRuntimeProbeRenderBuckets: string[];
  sceneShadowRetailProjectionRuntimeProbeSamples: string[];
  sceneShadowPointLightCastShadowCount: number;
  sceneShadowPointLightSamples: string[];
  sceneShadowItemPropertyLightShadowPolicyCount: number;
  sceneShadowItemPropertyLightShadowPolicySamples: string[];
  sceneShadowDirectionalLightCastShadowCount: number;
  sceneShadowDirectionalLightSamples: string[];
  sceneShadowProgFxType4ShadowRequestCount: number;
  sceneShadowProgFxType4ShadowRequestSamples: string[];
  sceneShadowFastShadowProxyCount: number;
  sceneShadowFastShadowDisabledCount: number;
  sceneShadowFastShadowSamples: string[];
  sceneShadowAreaStatus: string;
  sceneShadowAreaSourceField: string;
  sceneShadowAreaStatusSource: string;
  sceneShadowAreaOpacity: number | null;
  sceneShadowAreaOpacitySource: string;
  sceneShadowAreaOpacityFactor: number | null;
  sceneShadowAreaOpacityFactorSource: string;
  emitterWorldBoundsCenter: number[];
  emitterWorldBoundsSize: number[];
  cameraPosition: number[];
  materialOpacity: number | null;
  materialTransparent: boolean | null;
  materialFallbackApplied: boolean;
  campfireCoreCount: number;
  campfireCoreSamples: string[];
}

export function isCatalogVfxPreviewRunnerPath(pathname: string): boolean {
  return pathname === CATALOG_VFX_PREVIEW_PATH;
}

function readNumberQuery(value: string | null, fallback: number): number {
  if (value === null || value.trim().length === 0) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export interface CatalogVfxPreviewRouteRequest {
  templateId: string;
  resref: string | null;
  appearanceType: number | null;
  genericType: number | null;
  tag: string | null;
  localizedName: string | null;
  subtypeHint: PlaceableApiSubtypeHint;
  timeSeconds: number;
  seed: number;
  lightStateOverride: number | null;
  shadowSizeOverride: number | null;
  areaShadowOpacityOverride: number | null;
  maxLightsOverride: number | null;
  useAreaLightingOverride: boolean | null;
  displayShadowsOverride: boolean | null;
  emitterProofMode: CatalogVfxEmitterProofMode;
  textureSourceOverride: CatalogVfxTextureSourceOverride | null;
  emitterProofDistanceScale: number | null;
  emitterCameraDistanceScale: number | null;
  emitterCameraOrbitDeg: number | null;
  emitterCameraTarget: CatalogVfxEmitterCameraTarget;
  emitterAxisDebug: boolean;
  apiBaseUrl: string;
}

function readOptionalLightStateQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

function readOptionalNonNegativeIntegerQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function readOptionalTextQuery(value: string | null): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function readOptionalAreaShadowOpacityQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
}

function readOptionalMaxLightsQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
}

function readOptionalPositiveNumberQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function readOptionalFiniteNumberQuery(value: string | null): number | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readEmitterCameraTargetQuery(value: string | null): CatalogVfxEmitterCameraTarget {
  const normalized = value?.trim().toLowerCase();
  return normalized === "flame" || normalized === "omenemitter250" ? "flame" : "source-mdl";
}

function readTextureSourceOverrideQuery(
  value: string | null
): CatalogVfxTextureSourceOverride | null {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "retail" || normalized === "vanilla") {
    return "vanilla";
  }
  if (normalized === "hak" || normalized === "module-hak") {
    return "hak";
  }
  if (normalized === "module" || normalized === "current-module") {
    return "module";
  }
  return null;
}

function readOptionalBooleanQuery(value: string | null): boolean | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  return null;
}

function readApiBaseUrlQuery(value: string | null): string {
  const normalized = value?.trim().replace(/\/+$/u, "");
  return normalized && normalized.length > 0
    ? normalized
    : CATALOG_PREVIEW_DEFAULT_API_BASE_URL;
}

function readEmitterProofModeQuery(value: string | null): CatalogVfxEmitterProofMode {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === CATALOG_VFX_EMITTER_PROOF_MODE_OBVIOUS ||
    normalized === "1" ||
    normalized === "true" ||
    normalized === "visible"
  ) {
    return CATALOG_VFX_EMITTER_PROOF_MODE_OBVIOUS;
  }
  return "off";
}

function readSubtypeHintQuery(value: string | null): PlaceableApiSubtypeHint {
  const normalized = value?.trim().toLowerCase();
  switch (normalized) {
    case "generic":
    case "door":
    case "vfx":
    case "container":
    case "light_source":
    case "trigger_proxy":
    case "vvx":
    case "vvxy":
      return normalized;
    default:
      return DEFAULT_SUBTYPE_HINT;
  }
}

export function readCatalogVfxPreviewRouteRequest(
  search = window.location.search
): CatalogVfxPreviewRouteRequest {
  const params = new URLSearchParams(search);
  const resref = params.get("resref")?.trim() || null;
  const templateId = params.get("templateId")?.trim() || (resref ? "" : DEFAULT_TEMPLATE_ID);
  return {
    templateId,
    resref,
    appearanceType: readOptionalNonNegativeIntegerQuery(
      params.get("appearanceType") ?? params.get("appearance")
    ),
    genericType: readOptionalNonNegativeIntegerQuery(params.get("genericType")),
    tag: readOptionalTextQuery(params.get("tag")),
    localizedName: readOptionalTextQuery(params.get("localizedName") ?? params.get("name")),
    subtypeHint: readSubtypeHintQuery(params.get("subtypeHint") ?? params.get("subtype")),
    timeSeconds: readNumberQuery(params.get("time"), DEFAULT_TIME_SECONDS),
    seed: readNumberQuery(params.get("seed"), DEFAULT_SEED),
    lightStateOverride: readOptionalLightStateQuery(params.get("lightState")),
    shadowSizeOverride: readOptionalLightStateQuery(
      params.get("shadowSize") ?? params.get("shadowSizeOverride")
    ),
    areaShadowOpacityOverride: readOptionalAreaShadowOpacityQuery(
      params.get("areaShadowOpacity") ?? params.get("shadowOpacity")
    ),
    maxLightsOverride: readOptionalMaxLightsQuery(params.get("maxLights")),
    useAreaLightingOverride: readOptionalBooleanQuery(params.get("useAreaLighting")),
    displayShadowsOverride: readOptionalBooleanQuery(params.get("displayShadows")),
    emitterProofMode: readEmitterProofModeQuery(
      params.get("emitterProof") ?? params.get("emitterProofMode") ?? params.get("proof")
    ),
    textureSourceOverride: readTextureSourceOverrideQuery(
      params.get("textureSource") ??
        params.get("textureSourceOverride") ??
        params.get("textureProfile")
    ),
    emitterProofDistanceScale: readOptionalPositiveNumberQuery(
      params.get("emitterProofDistanceScale") ??
        params.get("proofDistanceScale") ??
        params.get("proofZoom")
    ),
    emitterCameraDistanceScale: readOptionalPositiveNumberQuery(
      params.get("emitterCameraDistanceScale") ??
        params.get("cameraDistanceScale") ??
        params.get("cameraZoom")
    ),
    emitterCameraOrbitDeg: readOptionalFiniteNumberQuery(
      params.get("cameraOrbitDeg") ?? params.get("cameraYawDeg") ?? params.get("cameraAzimuthDeg")
    ),
    emitterCameraTarget: readEmitterCameraTargetQuery(
      params.get("cameraTarget") ?? params.get("emitterCameraTarget")
    ),
    emitterAxisDebug: readOptionalBooleanQuery(
      params.get("emitterAxisDebug") ?? params.get("axisDebug")
    ) === true,
    apiBaseUrl: readApiBaseUrlQuery(params.get("apiBaseUrl"))
  };
}

export function applyCatalogVfxPreviewLightStateOverride(
  payload: PlaceableViewportRenderPayload,
  lightStateOverride: number | null
): PlaceableViewportRenderPayload {
  if (lightStateOverride === null) {
    return payload;
  }
  return {
    ...payload,
    placeable: {
      ...payload.placeable,
      metadata: {
        ...(payload.placeable.metadata ?? {}),
        lightState: lightStateOverride,
        lightStateOverrideSource: "dev-catalog-vfx-preview-query"
      },
      placeableRuntime: {
        ...(payload.placeable.placeableRuntime ?? {}),
        state: {
          ...(payload.placeable.placeableRuntime?.state ?? {}),
          lightState: lightStateOverride
        }
      }
    }
  };
}

export function applyCatalogVfxPreviewShadowSizeOverride(
  payload: PlaceableViewportRenderPayload,
  shadowSizeOverride: number | null
): PlaceableViewportRenderPayload {
  if (shadowSizeOverride === null) {
    return payload;
  }
  const shadowSize = Math.max(0, Math.trunc(shadowSizeOverride));
  return {
    ...payload,
    placeable: {
      ...payload.placeable,
      metadata: {
        ...(payload.placeable.metadata ?? {}),
        source2daShadowSize: shadowSize,
        source2daShadowSizeOverrideSource:
          "dev-catalog-vfx-preview-query-shadowSize-local-diagnostic-override",
        source2daShadowSizeOverrideProofStatus:
          "local-diagnostic-shadowsize-override-source-backed-retail-selection-rule"
      }
    }
  };
}

function resolveDirectApiBase(apiBaseUrl: string): URL | null {
  try {
    const resolved = new URL(apiBaseUrl, window.location.origin);
    return resolved.origin === window.location.origin ? null : resolved;
  } catch {
    return null;
  }
}

function rewriteCatalogVfxPreviewDeliveryUrl(value: string, directApiBase: URL): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return value;
  }
  const directOrigin = directApiBase.origin;
  const directBasePath = directApiBase.pathname.replace(/\/+$/u, "");
  const rewritePath = (pathname: string, suffix: string): string =>
    `${directOrigin}${pathname}${suffix}`;

  if (normalized.startsWith("/_aurora/v1/")) {
    return rewritePath(directBasePath, normalized.slice("/_aurora/v1".length));
  }
  if (normalized.startsWith("/api/v1/")) {
    return rewritePath("/api/v1", normalized.slice("/api/v1".length));
  }
  if (normalized.startsWith("/api/")) {
    return rewritePath("/api", normalized.slice("/api".length));
  }

  try {
    const parsed = new URL(normalized);
    const isCurrentOrigin = parsed.origin === window.location.origin;
    if (isCurrentOrigin && parsed.pathname.startsWith("/_aurora/v1/")) {
      return `${directOrigin}${directBasePath}${parsed.pathname.slice("/_aurora/v1".length)}${parsed.search}${parsed.hash}`;
    }
    if (isCurrentOrigin && parsed.pathname.startsWith("/api/")) {
      return `${directOrigin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
  } catch {
    // Non-URL source strings are preserved.
  }
  return value;
}

function rewriteCatalogVfxPreviewDeliveryUrlsDeep(
  value: unknown,
  directApiBase: URL
): unknown {
  if (typeof value === "string") {
    return rewriteCatalogVfxPreviewDeliveryUrl(value, directApiBase);
  }
  if (Array.isArray(value)) {
    return value.map((entry) =>
      rewriteCatalogVfxPreviewDeliveryUrlsDeep(entry, directApiBase)
    );
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as JsonRecord).map(([key, entry]) => [
        key,
        rewriteCatalogVfxPreviewDeliveryUrlsDeep(entry, directApiBase)
      ])
    );
  }
  return value;
}

export function rewriteCatalogVfxPreviewPayloadDeliveryUrls(
  payload: PlaceableViewportRenderPayload,
  apiBaseUrl: string
): PlaceableViewportRenderPayload {
  const directApiBase = resolveDirectApiBase(apiBaseUrl);
  if (!directApiBase) {
    return payload;
  }
  return rewriteCatalogVfxPreviewDeliveryUrlsDeep(
    payload,
    directApiBase
  ) as PlaceableViewportRenderPayload;
}

function matchesTextureSourceOverride(
  objectKey: string | undefined,
  override: CatalogVfxTextureSourceOverride
): boolean {
  const normalized = objectKey?.replace(/\\/gu, "/").toLowerCase() ?? "";
  if (override === "vanilla") {
    return normalized.includes("/__aurora/sources/vanilla/");
  }
  if (override === "hak") {
    return normalized.includes("/__aurora/sources/hak/");
  }
  return !normalized.includes("/__aurora/sources/");
}

function scoreTextureSourceOverride(
  objectKey: string | undefined,
  override: CatalogVfxTextureSourceOverride
): number {
  if (matchesTextureSourceOverride(objectKey, override)) {
    return 0;
  }
  const normalized = objectKey?.replace(/\\/gu, "/").toLowerCase() ?? "";
  if (override === "vanilla" && !normalized.includes("/__aurora/sources/hak/")) {
    return 1;
  }
  if (override === "hak" && normalized.includes("/__aurora/sources/vanilla/")) {
    return 2;
  }
  return 3;
}

export function applyCatalogVfxPreviewTextureSourceOverride(
  payload: PlaceableViewportRenderPayload,
  override: CatalogVfxTextureSourceOverride | null
): PlaceableViewportRenderPayload {
  const textureBindings = payload.renderPackage?.textureBindings;
  if (!override || !textureBindings || textureBindings.length === 0) {
    return payload;
  }

  const groups: Array<{
    entries: Array<{ binding: (typeof textureBindings)[number]; index: number }>;
  }> = [];
  const groupsByReference = new Map<string, (typeof groups)[number]>();
  textureBindings.forEach((binding, index) => {
    const referenceKey = (binding.reference.trim() || binding.fileName.trim()).toLowerCase();
    let group = groupsByReference.get(referenceKey);
    if (!group) {
      group = { entries: [] };
      groupsByReference.set(referenceKey, group);
      groups.push(group);
    }
    group.entries.push({ binding, index });
  });

  const reorderedBindings = groups.flatMap((group) =>
    [...group.entries]
      .sort((left, right) => {
        const sourceDelta =
          scoreTextureSourceOverride(left.binding.objectKey, override) -
          scoreTextureSourceOverride(right.binding.objectKey, override);
        if (sourceDelta !== 0) {
          return sourceDelta;
        }
        return left.index - right.index;
      })
      .map((entry) => entry.binding)
  );
  const reorderedTextureUrls = reorderedBindings.map((binding) => binding.deliveryUrl);

  return {
    ...payload,
    renderPackage: payload.renderPackage
      ? {
          ...payload.renderPackage,
          textureBindings: reorderedBindings,
          textureUrls: reorderedTextureUrls,
          diagnostics: [
            ...(payload.renderPackage.diagnostics ?? []),
            {
              code: "CATALOG_VFX_PREVIEW_TEXTURE_SOURCE_OVERRIDE",
              severity: "warn",
              message: `Dev catalog VFX preview reordered texture bindings for ${override} source proof.`
            }
          ]
        }
      : payload.renderPackage
  };
}

export function applyCatalogVfxPreviewAreaShadowOpacityOverride(
  runtime: Pick<ReturnType<typeof createRuntime>, "scene">,
  areaShadowOpacityOverride: number | null
): void {
  if (areaShadowOpacityOverride === null) {
    return;
  }
  const opacity = Math.max(0, Math.min(100, areaShadowOpacityOverride));
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity = opacity;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacitySource =
    CATALOG_PREVIEW_AREA_SHADOW_OPACITY_SOURCE;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor = opacity / 100;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource =
    CATALOG_PREVIEW_AREA_SHADOW_OPACITY_FACTOR_SOURCE;
}

export function applyCatalogVfxPreviewMaxLightsOverride(
  runtime: Pick<ReturnType<typeof createRuntime>, "scene">,
  maxLightsOverride: number | null
): void {
  if (maxLightsOverride === null) {
    return;
  }
  runtime.scene.userData.auroraLightConfiguredMaxLights = Math.max(
    0,
    Math.trunc(maxLightsOverride)
  );
}

export function readCatalogVfxPreviewStoredAccessToken(
  storage: Pick<Storage, "getItem"> = window.localStorage
): string | null {
  try {
    const rawValue = storage.getItem(CATALOG_PREVIEW_AUTH_SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as StoredAuthSessionEnvelope;
    const token = parsed.session?.accessToken?.trim();
    return token && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export async function loginForDevPreview(
  apiBaseUrl = CATALOG_PREVIEW_DEFAULT_API_BASE_URL,
  fetchFn: typeof fetch = fetch.bind(globalThis)
): Promise<string> {
  const storedAccessToken = readCatalogVfxPreviewStoredAccessToken();
  if (storedAccessToken) {
    try {
      const sessionResponse = await fetchFn(`${apiBaseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${storedAccessToken}` }
      });
      if (sessionResponse.ok) {
        return storedAccessToken;
      }
    } catch {
      // Continue with the deterministic dev login below.
    }
  }
  const response = await fetchFn(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "builder.user", password: "builder123" })
  });
  if (!response.ok) {
    throw new Error(`Catalog VFX preview login failed: ${response.status}`);
  }
  const payload = (await response.json()) as LoginEnvelope;
  const token = payload.data?.session?.accessToken;
  if (!token) {
    throw new Error("Catalog VFX preview login returned no access token");
  }
  return token;
}

export function createCatalogVfxPreviewDebugState(
  request: Pick<
    CatalogVfxPreviewRouteRequest,
    "useAreaLightingOverride" | "displayShadowsOverride"
  >
): WorkspaceToolbarState["canvasDebug"] {
  const debugState: WorkspaceToolbarState["canvasDebug"] = {
    wireframe: false,
    textures: true,
    grid: true,
    axes: false,
    bounds: false,
    displayShadows: true,
    displayFog: true,
    useAreaLighting: true,
    ceilingMeshes: true,
    hiddenMeshes: false,
    showNonRenderMeshes: false,
    showVtPhysicalAnchor: false,
    statusMap: "off",
    textureCompression: "none",
    gizmoMode: "translate",
    snapGrid: false,
    snapAngle: false,
    snapHeight: false,
    lockedKinds: {
      creatures: false,
      doors: false,
      encounters: false,
      items: false,
      placeables: false,
      sounds: false,
      stores: false,
      triggers: false,
      waypoints: false
    },
    isolateKind: "none",
    chunkBounds: false,
    objectLabels: false,
    perfHud: false,
    walkmeshOverlay: false,
    collisionOverlay: false,
    controlsHint: false,
    runtimeHud: false
  };
  if (request.useAreaLightingOverride !== null) {
    debugState.useAreaLighting = request.useAreaLightingOverride;
  }
  if (request.displayShadowsOverride !== null) {
    debugState.displayShadows = request.displayShadowsOverride;
  }
  return debugState;
}

function createPreviewObject(templateId: string, payload: PlaceableViewportRenderPayload): SceneObject {
  const sourceRow = payload.placeable.metadata?.source2daRow;
  const objectKey = templateId || payload.placeable.templateId || payload.placeable.resref;
  return {
    id: `catalog-vfx-preview:${objectKey}`,
    kind: "placeables",
    name: payload.placeable.name,
    resRef: payload.placeable.resref,
    tag: objectKey,
    x: 1,
    y: 1,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    },
    placeableProperties: {
      plot: false,
      useable: false,
      hasInventory: false
    },
    vfxPayload: {
      version: "scene-object-vfx-preserve/v1",
      profile: "catalog-placeable-vfx-preview",
      emitter: "source-mdl",
      script: "",
      sourceKind: "placeable_preview",
      sourceProfile: "placeables.2da",
      sourceTable: "placeables.2da",
      sourceRowId: typeof sourceRow === "number" ? sourceRow : undefined,
      sourceLabel: payload.placeable.name,
      sourceResRef: payload.placeable.resref,
      previewMode: "aurora_emitter_particle_preview",
      canonicalStatus: "preview_only",
      diagnostics: [],
      flags: {},
      extra: {}
    }
  };
}

function createPreviewScene(object: SceneObject): AreaScene {
  return {
    sceneId: "catalog-vfx-preview-scene",
    areaName: "Catalog VFX Preview",
    width: 2,
    height: 2,
    tiles: [],
    objects: [object],
    updatedAtUnixMs: 0,
    source: "local_draft"
  };
}

function createViewportFacade() {
  return {
    defaultMasterCellsPerTile: 4,
    buildGridSegments(widthTiles: number, heightTiles: number, masterCellsPerTile: number) {
      const segments: Array<{
        kind: "major" | "minor";
        start: readonly [number, number, number];
        end: readonly [number, number, number];
      }> = [];
      const divisions = Math.max(1, masterCellsPerTile);
      for (let x = 0; x <= widthTiles * divisions; x += 1) {
        const worldX = x / divisions;
        segments.push({
          kind: x % divisions === 0 ? "major" : "minor",
          start: [worldX, 0, 0],
          end: [worldX, 0, heightTiles]
        });
      }
      for (let z = 0; z <= heightTiles * divisions; z += 1) {
        const worldZ = z / divisions;
        segments.push({
          kind: z % divisions === 0 ? "major" : "minor",
          start: [0, 0, worldZ],
          end: [widthTiles, 0, worldZ]
        });
      }
      return segments;
    }
  };
}

function readObjectPixelSignal(renderer: THREE.WebGLRenderer, width: number, height: number): PixelSignal {
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const red = pixels[0] ?? 0;
  const green = pixels[1] ?? 0;
  const blue = pixels[2] ?? 0;
  let objectPixelCount = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const delta =
      Math.abs((pixels[index] ?? 0) - red) +
      Math.abs((pixels[index + 1] ?? 0) - green) +
      Math.abs((pixels[index + 2] ?? 0) - blue);
    if (delta > 36) {
      objectPixelCount += 1;
    }
  }
  return {
    objectVisible: objectPixelCount > OBJECT_PIXEL_THRESHOLD,
    objectPixelCount
  };
}

function findPreviewRoot(runtime: ReturnType<typeof createRuntime>, objectId: string): THREE.Object3D | null {
  return runtime.objectMeshById.get(objectId) ?? null;
}

function findEmitterGroup(root: THREE.Object3D | null): THREE.Object3D | null {
  let multiEmitterGroup: THREE.Object3D | null = null;
  let found: THREE.Object3D | null = null;
  const sourceEmitterNodes: THREE.Object3D[] = [];
  root?.traverse((node) => {
    const isSourceMdlEmitter = node.userData?.auroraEmitterPackageSource === "source-mdl";
    if (
      !multiEmitterGroup &&
      isSourceMdlEmitter &&
      (node.userData?.vfxPreviewRole === "aurora-multi-emitter" ||
        node.userData?.vfxPreviewKind === "multi_emitter" ||
        (Array.isArray(node.userData?.auroraEmitterNodes) &&
          node.userData.auroraEmitterNodes.length > 1))
    ) {
      multiEmitterGroup = node;
    }
    if (node !== root && isSourceMdlEmitter) {
      sourceEmitterNodes.push(node);
    }
    if (
      !found &&
      node !== root &&
      isSourceMdlEmitter
    ) {
      found = node;
    }
  });
  if (multiEmitterGroup) {
    return multiEmitterGroup;
  }
  const foundEmitter = found as THREE.Object3D | null;
  if (foundEmitter?.parent) {
    const siblingSourceCount = foundEmitter.parent.children.filter(
      (child) => child.userData?.auroraEmitterPackageSource === "source-mdl"
    ).length;
    if (siblingSourceCount > 1 || sourceEmitterNodes.length > 1) {
      return foundEmitter.parent;
    }
  }
  if (foundEmitter) {
    return foundEmitter;
  }
  return root?.userData?.auroraEmitterPackageSource === "source-mdl" ? root : null;
}

function findSourceMdlLightGroup(root: THREE.Object3D | null): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root?.traverse((node) => {
    if (
      !found &&
      (node.userData?.vfxPreviewRole === "aurora-light-node-group" ||
        node.userData?.auroraLightPreviewMode === "source-mdl-light-node-preview")
    ) {
      found = node;
    }
  });
  return found;
}

export function findSourceMdlPreviewGroup(root: THREE.Object3D | null): THREE.Object3D | null {
  return findEmitterGroup(root) ?? findSourceMdlLightGroup(root);
}

function findFlameEmitterGroup(root: THREE.Object3D | null): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root?.traverse((node) => {
    if (
      !found &&
      (node.userData?.auroraEmitterFlameLike === true ||
        node.userData?.auroraEmitterFlameColumnPreviewMode ===
          "source-low-velocity-flame-column-preserved")
    ) {
      found = node;
    }
  });
  return found;
}

function findParticleBatchMesh(root: THREE.Object3D | null): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  root?.traverse((node) => {
    if (
      !found &&
      node instanceof THREE.Mesh &&
      node.userData?.auroraParticleBatchRendererPreviewMode &&
      (node.userData?.vfxPreviewRole === "camera-billboard-batch" ||
        node.userData?.auroraParticleBatchVisibleMeshRole)
    ) {
      found = node;
    }
  });
  return found;
}

function isDescendantOf(candidate: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = candidate;
  while (current) {
    if (current === ancestor) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function forEachObjectMaterial(
  node: THREE.Mesh | THREE.Sprite,
  callback: (material: THREE.Material) => void
): void {
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  materials.forEach((material) => {
    if (material) {
      callback(material);
    }
  });
}

function replaceObjectMaterials(
  node: THREE.Mesh | THREE.Sprite,
  materialFactory: () => THREE.Material
): void {
  if (Array.isArray(node.material)) {
    node.material = node.material.map(() => materialFactory());
    return;
  }
  node.material = materialFactory() as typeof node.material;
}

export function applyCatalogVfxEmitterObviousProofMode(
  root: THREE.Object3D | null,
  emitterGroup: THREE.Object3D | null,
  distanceScale: number | null = null
): boolean {
  if (!root || !emitterGroup) {
    return false;
  }
  const emitterBounds = new THREE.Box3().setFromObject(emitterGroup);
  const emitterCenter = new THREE.Vector3();
  if (!emitterBounds.isEmpty()) {
    emitterBounds.getCenter(emitterCenter);
  }
  const proofDistanceScale =
    typeof distanceScale === "number" && Number.isFinite(distanceScale) && distanceScale > 0
      ? distanceScale
      : CATALOG_VFX_EMITTER_PROOF_DEFAULT_DISTANCE_SCALE;

  root.userData = {
    ...root.userData,
    catalogVfxEmitterProofMode: CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA,
    catalogVfxEmitterProofParticleScale: CATALOG_VFX_EMITTER_OBVIOUS_PARTICLE_SCALE,
    catalogVfxEmitterProofModelOpacity: CATALOG_VFX_EMITTER_OBVIOUS_MODEL_OPACITY,
    catalogVfxEmitterProofDistanceScale: proofDistanceScale
  };
  emitterGroup.userData = {
    ...emitterGroup.userData,
    catalogVfxEmitterProofMode: CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA,
    catalogVfxEmitterProofParticleScale: CATALOG_VFX_EMITTER_OBVIOUS_PARTICLE_SCALE,
    catalogVfxEmitterProofDistanceScale: proofDistanceScale,
    catalogVfxEmitterProofCenter: readVector3(emitterCenter)
  };

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.Sprite)) {
      return;
    }
    if (isDescendantOf(node, emitterGroup)) {
      node.visible = true;
      node.renderOrder = Math.max(node.renderOrder, CATALOG_VFX_EMITTER_OBVIOUS_RENDER_ORDER);
      node.scale.multiplyScalar(CATALOG_VFX_EMITTER_OBVIOUS_PARTICLE_SCALE);
      node.userData = {
        ...node.userData,
        catalogVfxEmitterProofMode: CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA
      };
      forEachObjectMaterial(node, (material) => {
        if (material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial) {
          material.color.set(0xffd45a);
          material.opacity = 1;
          material.transparent = true;
          material.depthTest = false;
          material.depthWrite = false;
          material.blending = THREE.AdditiveBlending;
          material.toneMapped = false;
          material.userData = {
            ...material.userData,
            catalogVfxEmitterProofMode: CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA
          };
          material.needsUpdate = true;
        }
      });
      return;
    }

    replaceObjectMaterials(
      node,
      () =>
        new THREE.MeshBasicMaterial({
          color: 0x253040,
          transparent: true,
          opacity: CATALOG_VFX_EMITTER_OBVIOUS_MODEL_OPACITY,
          depthWrite: false,
          side: THREE.DoubleSide
        })
    );
    node.renderOrder = Math.min(node.renderOrder, -10);
    node.userData = {
      ...node.userData,
      catalogVfxEmitterProofMode: "source-mdl-emitter-obvious-video-proof-silhouette"
    };
  });
  return true;
}

function readNumericUserData(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readNumberList(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is number => typeof entry === "number" && Number.isFinite(entry))
    : [];
}

function readStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry)).filter((entry) => entry.length > 0)
    : [];
}

function roundNumber(value: number): number {
  return Number(value.toFixed(4));
}

function readVector3(value: THREE.Vector3): number[] {
  return [roundNumber(value.x), roundNumber(value.y), roundNumber(value.z)];
}

function formatRunnerSampleValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => formatRunnerSampleValue(entry)).join(",");
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(roundNumber(value));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "unknown";
}

function readObjectMaterial(node: THREE.Object3D): THREE.Material | null {
  if (!(node instanceof THREE.Mesh) && !(node instanceof THREE.Sprite)) {
    return null;
  }
  const material = node.material;
  return Array.isArray(material) ? material[0] ?? null : material ?? null;
}

function isCampfireSourceEmitterObject(node: THREE.Object3D): boolean {
  let cursor: THREE.Object3D | null = node;
  while (cursor) {
    const nodeName =
      typeof cursor.userData?.auroraEmitterNode === "string"
        ? cursor.userData.auroraEmitterNode.trim().toLowerCase()
        : "";
    const sourceMode =
      typeof cursor.userData?.auroraEmitterCampfireSourceEmitterPreviewMode === "string"
        ? cursor.userData.auroraEmitterCampfireSourceEmitterPreviewMode.trim()
        : "";
    if (
      nodeName === "omenemitter250" ||
      sourceMode === "source-mdl-omenemitter250-fountain-atlas"
    ) {
      return true;
    }
    cursor = cursor.parent;
  }
  return false;
}

function buildCampfireSourceEmitterSamples(root: THREE.Object3D | null): string[] {
  const samples: string[] = [];
  root?.updateMatrixWorld(true);
  root?.traverse((node) => {
    const role =
      typeof node.userData?.vfxPreviewRole === "string" ? node.userData.vfxPreviewRole : "";
    if (
      !isCampfireSourceEmitterObject(node) ||
      (role !== "camera-billboard-batch" && role !== "camera-billboard-particle")
    ) {
      return;
    }
    const material = readObjectMaterial(node);
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const bounds = new THREE.Box3().setFromObject(node);
    const boundsCenter = new THREE.Vector3();
    const boundsSize = new THREE.Vector3();
    node.getWorldPosition(position);
    node.getWorldScale(scale);
    if (!bounds.isEmpty()) {
      bounds.getCenter(boundsCenter);
      bounds.getSize(boundsSize);
    }
    const hasMap =
      material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial
        ? Boolean(material.map)
        : false;
    const materialColor =
      material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial
        ? [roundNumber(material.color.r), roundNumber(material.color.g), roundNumber(material.color.b)]
        : [];
    samples.push(
      [
        `role=${formatRunnerSampleValue(role)}`,
        `visible=${formatRunnerSampleValue(node.visible)}`,
        `world=${formatRunnerSampleValue(readVector3(position))}`,
        `scale=${formatRunnerSampleValue(readVector3(scale))}`,
        `boundsCenter=${formatRunnerSampleValue(readVector3(boundsCenter))}`,
        `boundsSize=${formatRunnerSampleValue(readVector3(boundsSize))}`,
        `renderOrder=${formatRunnerSampleValue(node.renderOrder)}`,
        `opacity=${formatRunnerSampleValue(material?.opacity)}`,
        `transparent=${formatRunnerSampleValue(material?.transparent)}`,
        `depthTest=${formatRunnerSampleValue(material?.depthTest)}`,
        `depthWrite=${formatRunnerSampleValue(material?.depthWrite)}`,
        `alphaTest=${formatRunnerSampleValue(
          material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial
            ? material.alphaTest
            : undefined
        )}`,
        `toneMapped=${formatRunnerSampleValue(
          material instanceof THREE.MeshBasicMaterial || material instanceof THREE.SpriteMaterial
            ? material.toneMapped
            : undefined
        )}`,
        `map=${formatRunnerSampleValue(hasMap)}`,
        `color=${formatRunnerSampleValue(materialColor)}`,
        `alphaMode=${formatRunnerSampleValue(material?.userData?.auroraTextureAlphaMode)}`,
        `atlasFrame=${formatRunnerSampleValue(material?.userData?.auroraAtlasRawFrame)}`
      ].join(";")
    );
  });
  return samples;
}

function setEmitterAxisDebugMaterialFlags(object: THREE.Object3D): void {
  object.traverse((node) => {
    const material = readObjectMaterial(node);
    if (!material) {
      return;
    }
    material.depthTest = false;
    material.depthWrite = false;
    material.transparent = true;
  });
}

function applyCatalogVfxEmitterAxisDebug(target: THREE.Object3D | null): boolean {
  if (!target) {
    return false;
  }
  const oldHelper = target.getObjectByName("catalog_vfx_emitter_axis_debug");
  if (oldHelper) {
    target.remove(oldHelper);
  }
  const helper = new THREE.Group();
  helper.name = "catalog_vfx_emitter_axis_debug";
  helper.renderOrder = 1000;
  helper.userData = {
    vfxPreviewRole: "catalog-emitter-axis-debug",
    auroraEmitterAxisDebugSource:
      "dev-only runtime overlay: green=Aurora local +Z emission mapped to Three local +Y; red=Three local +X; blue=Three local +Z"
  };
  const length = 0.42;
  const axes: Array<{ name: string; direction: THREE.Vector3; color: number }> = [
    { name: "emission_aurora_local_plus_z", direction: new THREE.Vector3(0, 1, 0), color: 0x30ff63 },
    { name: "three_local_plus_x", direction: new THREE.Vector3(1, 0, 0), color: 0xff3848 },
    { name: "three_local_plus_z", direction: new THREE.Vector3(0, 0, 1), color: 0x42a5ff }
  ];
  for (const axis of axes) {
    const arrow = new THREE.ArrowHelper(axis.direction, new THREE.Vector3(), length, axis.color, 0.12, 0.065);
    arrow.name = `catalog_vfx_axis_${axis.name}`;
    arrow.renderOrder = helper.renderOrder;
    arrow.userData = {
      vfxPreviewRole: "catalog-emitter-axis-debug-arrow",
      axis: axis.name
    };
    setEmitterAxisDebugMaterialFlags(arrow);
    helper.add(arrow);
  }
  target.add(helper);
  return true;
}

function buildEmitterAxisDebugSamples(root: THREE.Object3D | null): string[] {
  const target = findFlameEmitterGroup(root) ?? root;
  if (!target) {
    return [];
  }
  target.updateMatrixWorld(true);
  const origin = new THREE.Vector3();
  const emissionWorld = new THREE.Vector3(0, 1, 0);
  const localXWorld = new THREE.Vector3(1, 0, 0);
  const localZWorld = new THREE.Vector3(0, 0, 1);
  target.getWorldPosition(origin);
  emissionWorld.transformDirection(target.matrixWorld).normalize();
  localXWorld.transformDirection(target.matrixWorld).normalize();
  localZWorld.transformDirection(target.matrixWorld).normalize();
  return [
    [
      `node=${formatRunnerSampleValue(target.userData?.auroraEmitterNode)}`,
      `mode=${formatRunnerSampleValue(target.userData?.auroraEmitterFlameAxisPreviewMode)}`,
      `origin=${formatRunnerSampleValue(readVector3(origin))}`,
      `emissionWorld=${formatRunnerSampleValue(readVector3(emissionWorld))}`,
      `threeLocalXWorld=${formatRunnerSampleValue(readVector3(localXWorld))}`,
      `threeLocalZWorld=${formatRunnerSampleValue(readVector3(localZWorld))}`,
      `mappedOrientationAxis=${formatRunnerSampleValue(
        target.userData?.auroraEmitterTransformMappedAxis
      )}`,
      `angleRadians=${formatRunnerSampleValue(
        target.userData?.auroraEmitterTransformAngleRadians
      )}`,
      `positionMap=${formatRunnerSampleValue(
        target.userData?.auroraEmitterTransformMappedPosition
      )}`,
      `source=dev-only-runtime-axis-sample`
    ].join(";")
  ];
}

function formatAuroraLightSampleValue(value: unknown): string {
  if (Array.isArray(value)) {
    const entries = value
      .map((entry) =>
        typeof entry === "number" && Number.isFinite(entry) ? String(roundNumber(entry)) : String(entry)
      )
      .filter((entry) => entry.length > 0);
    return entries.length > 0 ? entries.join(",") : "unknown";
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(roundNumber(value));
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  return "unknown";
}

function buildAuroraLightPointLightSample(node: THREE.PointLight): string | null {
  const nodeName = node.userData?.auroraLightNodeName;
  if (typeof nodeName !== "string" || nodeName.trim().length === 0) {
    return null;
  }
  const color = [roundNumber(node.color.r), roundNumber(node.color.g), roundNumber(node.color.b)];
  return [
    `role=${formatAuroraLightSampleValue(node.userData.auroraLightPreviewRole)}`,
    `node=${formatAuroraLightSampleValue(nodeName)}`,
    `color=${formatAuroraLightSampleValue(color)}`,
    `intensity=${formatAuroraLightSampleValue(node.intensity)}`,
    `distance=${formatAuroraLightSampleValue(node.distance)}`,
    `castShadow=${formatAuroraLightSampleValue(node.castShadow)}`,
    `sourceRadius=${formatAuroraLightSampleValue(node.userData.auroraLightSourceRadius)}`,
    `sourceRadiusUnits=${formatAuroraLightSampleValue(
      node.userData.auroraLightSourceRadiusUnits
    )}`,
    `sourceUnitScale=${formatAuroraLightSampleValue(node.userData.auroraLightSourceUnitScale)}`,
    `sourceWorldDistance=${formatAuroraLightSampleValue(
      node.userData.auroraLightSourceRadiusWorldDistance
    )}`,
    `animatedSourceRadius=${formatAuroraLightSampleValue(
      node.userData.auroraLightAnimatedSourceRadius
    )}`,
    `worldRadius=${formatAuroraLightSampleValue(node.userData.auroraLightWorldRadius)}`,
    `sourceMultiplier=${formatAuroraLightSampleValue(node.userData.auroraLightMultiplier)}`,
    `animatedMultiplier=${formatAuroraLightSampleValue(
      node.userData.auroraLightAnimatedMultiplier
    )}`,
    `shadowRadius=${formatAuroraLightSampleValue(node.userData.auroraLightAnimatedShadowRadius)}`,
    `quadraticAtten=${formatAuroraLightSampleValue(node.userData.auroraLightQuadraticAtten)}`,
    `quadraticProof=${formatAuroraLightSampleValue(
      node.userData.auroraLightQuadraticAttenProofStatus
    )}`,
    `shadowProof=${formatAuroraLightSampleValue(node.userData.auroraLightShadowProofStatus)}`
  ].join(";");
}

function readFirstMaterial(root: THREE.Object3D | null): THREE.Material | null {
  let material: THREE.Material | null = null;
  root?.traverse((node) => {
    if (material || !(node instanceof THREE.Mesh)) {
      return;
    }
    const candidate = Array.isArray(node.material) ? node.material[0] : node.material;
    if (candidate) {
      material = candidate;
    }
  });
  return material;
}

export function frameCameraForEmitter(
  runtime: ReturnType<typeof createRuntime>,
  emitterGroup: THREE.Object3D | null,
  cameraDistanceScale: number | null = null,
  cameraOrbitDeg: number | null = null
): void {
  if (!emitterGroup) {
    return;
  }
  const bounds = new THREE.Box3().setFromObject(emitterGroup);
  if (bounds.isEmpty()) {
    return;
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);
  const maxDimension = Math.max(size.x, size.y, size.z, 0.35);
  const sourceMdlVisibilityProof =
    emitterGroup.userData?.sourceMdlEmitterPreviewVisibilityMode ===
      "source-mdl-emitter-visibility-floor-preview" ||
    emitterGroup.userData?.auroraSourceMdlEmitterVisibilityProofMode ===
      "source-mdl-emitter-visibility-floor-preview";
  const obviousEmitterProof =
    emitterGroup.userData?.catalogVfxEmitterProofMode ===
    CATALOG_VFX_EMITTER_OBVIOUS_PROOF_USER_DATA;
  const proofDistanceScale = readNumericUserData(
    emitterGroup.userData?.catalogVfxEmitterProofDistanceScale
  );
  const requestedDistanceScale =
    readNumericUserData(emitterGroup.userData?.catalogVfxCameraDistanceScale) ??
    cameraDistanceScale;
  const distance = obviousEmitterProof
    ? Math.max(
        0.25,
        maxDimension * (proofDistanceScale ?? CATALOG_VFX_EMITTER_PROOF_DEFAULT_DISTANCE_SCALE)
      )
    : requestedDistanceScale !== null
    ? Math.max(0.25, maxDimension * requestedDistanceScale)
    : sourceMdlVisibilityProof
    ? Math.max(0.85, maxDimension * 1.35)
    : Math.max(1.2, maxDimension * 2.6);
  const cameraOffset = new THREE.Vector3(distance, distance * 0.9, distance);
  if (cameraOrbitDeg !== null) {
    cameraOffset.applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(cameraOrbitDeg)
    );
  }
  runtime.camera.position.copy(center).add(cameraOffset);
  runtime.controls.target.copy(center);
  runtime.camera.lookAt(center);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
}

function readMeshCounts(root: THREE.Object3D | null): { meshCount: number; visibleMeshCount: number } {
  let meshCount = 0;
  let visibleMeshCount = 0;
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    meshCount += 1;
    if (node.visible) {
      visibleMeshCount += 1;
    }
  });
  return { meshCount, visibleMeshCount };
}

function readShadowVolumeStencilRuntimeProof(
  runtime: ReturnType<typeof createRuntime> | null,
  root: THREE.Object3D | null
): {
  rendererStencilBuffer: boolean | null;
  shadowVolumeStencilMaterialCount: number;
  shadowVolumeStencilReceiverCount: number;
} {
  let rendererStencilBuffer: boolean | null = null;
  if (runtime) {
    try {
      rendererStencilBuffer =
        runtime.renderer.getContext().getContextAttributes()?.stencil ?? null;
    } catch {
      rendererStencilBuffer = null;
    }
  }

  let shadowVolumeStencilMaterialCount = 0;
  let shadowVolumeStencilReceiverCount = 0;
  root?.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      if (material?.stencilWrite === true) {
        shadowVolumeStencilMaterialCount += 1;
      }
      if (material?.userData?.auroraShadowVolumeStencilReceiverStencilFunc === "NotEqual") {
        shadowVolumeStencilReceiverCount += 1;
      }
    }
  });

  return {
    rendererStencilBuffer,
    shadowVolumeStencilMaterialCount,
    shadowVolumeStencilReceiverCount
  };
}

export function readEmitterDrawMetrics(root: THREE.Object3D | null): {
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
  auroraLightNodes: string[];
  auroraLightSourceNodeCount: number;
  auroraLightAcceptedNodeCount: number;
  auroraLightFlarePayloadNodeCount: number;
  auroraLightFlareRadiusWriteUnverified: boolean;
  auroraLightShadowCastCount: number;
  auroraLightShadowProofStatuses: string[];
  auroraLightAnimatedSourceRadius: number | null;
  auroraLightQuadraticAtten: number | null;
  auroraLightQuadraticAttenProofStatuses: string[];
  auroraLightBudgetCap: number | null;
  auroraLightBudgetHardCap: number | null;
  auroraLightConfiguredMaxLights: number | null;
  auroraLightBudgetStrategy: string;
  auroraLightBudgetStrategySource: string;
  auroraLightBudgetStrategyProofStatus: string;
  auroraLightPreviewMode: string;
  auroraLightSamples: string[];
} {
  let drawParticles = 0;
  let renderedVertices = 0;
  const drawLanes = new Set<string>();
  const auroraLightNodes = new Set<string>();
  let auroraLightSourceNodeCount = 0;
  let auroraLightAcceptedNodeCount = 0;
  let auroraLightFlarePayloadNodeCount = 0;
  let auroraLightFlareRadiusWriteUnverified = false;
  let auroraLightShadowCastCount = 0;
  const auroraLightShadowProofStatuses = new Set<string>();
  let auroraLightAnimatedSourceRadius: number | null = null;
  let auroraLightQuadraticAtten: number | null = null;
  const auroraLightQuadraticAttenProofStatuses = new Set<string>();
  let auroraLightBudgetCap: number | null = null;
  let auroraLightBudgetHardCap: number | null = null;
  let auroraLightConfiguredMaxLights: number | null = null;
  let auroraLightBudgetStrategy = "";
  let auroraLightBudgetStrategySource = "";
  let auroraLightBudgetStrategyProofStatus = "";
  let auroraLightPreviewMode = "";
  const auroraLightSamples = new Set<string>();
  const rootUserData = root?.userData ?? {};
  const addLane = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      drawLanes.add(value.trim());
    }
  };
  const addAuroraLightNode = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      auroraLightNodes.add(value.trim());
    }
  };
  const collectAuroraLightMetrics = (data: THREE.Object3D["userData"] | undefined) => {
    if (!data) {
      return;
    }
    if (Array.isArray(data.auroraLightNodes)) {
      data.auroraLightNodes.forEach(addAuroraLightNode);
    }
    addAuroraLightNode(data.auroraLightNodeName);
    auroraLightSourceNodeCount = Math.max(
      auroraLightSourceNodeCount,
      readNumericUserData(data.auroraLightSourceNodeCount) ?? 0
    );
    auroraLightAcceptedNodeCount = Math.max(
      auroraLightAcceptedNodeCount,
      readNumericUserData(data.auroraLightAcceptedNodeCount) ?? 0
    );
    auroraLightFlarePayloadNodeCount = Math.max(
      auroraLightFlarePayloadNodeCount,
      readNumericUserData(data.auroraLightFlarePayloadNodeCount) ?? 0
    );
    auroraLightFlareRadiusWriteUnverified =
      auroraLightFlareRadiusWriteUnverified ||
      data.auroraLightFlareRadiusWriteUnverified === true ||
      data.auroraLightFlareRadiusProofStatus === "source-token-preserved-write-target-unverified";
    if (typeof data.auroraLightShadowProofStatus === "string") {
      auroraLightShadowProofStatuses.add(data.auroraLightShadowProofStatus);
    }
    const animatedSourceRadius = readNumericUserData(data.auroraLightAnimatedSourceRadius);
    if (auroraLightAnimatedSourceRadius === null && animatedSourceRadius !== null) {
      auroraLightAnimatedSourceRadius = animatedSourceRadius;
    }
    const quadraticAtten = readNumericUserData(data.auroraLightQuadraticAtten);
    if (auroraLightQuadraticAtten === null && quadraticAtten !== null) {
      auroraLightQuadraticAtten = quadraticAtten;
    }
    if (typeof data.auroraLightQuadraticAttenProofStatus === "string") {
      auroraLightQuadraticAttenProofStatuses.add(
        data.auroraLightQuadraticAttenProofStatus
      );
    }
    const budgetCap = readNumericUserData(data.auroraLightBudgetCap);
    if (auroraLightBudgetCap === null && budgetCap !== null) {
      auroraLightBudgetCap = budgetCap;
    }
    const budgetHardCap = readNumericUserData(data.auroraLightBudgetHardCap);
    if (auroraLightBudgetHardCap === null && budgetHardCap !== null) {
      auroraLightBudgetHardCap = budgetHardCap;
    }
    const configuredMaxLights = readNumericUserData(data.auroraLightConfiguredMaxLights);
    if (auroraLightConfiguredMaxLights === null && configuredMaxLights !== null) {
      auroraLightConfiguredMaxLights = configuredMaxLights;
    }
    if (!auroraLightBudgetStrategy && typeof data.auroraLightBudgetStrategy === "string") {
      auroraLightBudgetStrategy = data.auroraLightBudgetStrategy;
    }
    if (
      !auroraLightBudgetStrategySource &&
      typeof data.auroraLightBudgetStrategySource === "string"
    ) {
      auroraLightBudgetStrategySource = data.auroraLightBudgetStrategySource;
    }
    if (
      !auroraLightBudgetStrategyProofStatus &&
      typeof data.auroraLightBudgetStrategyProofStatus === "string"
    ) {
      auroraLightBudgetStrategyProofStatus = data.auroraLightBudgetStrategyProofStatus;
    }
    if (!auroraLightPreviewMode && typeof data.auroraLightPreviewMode === "string") {
      auroraLightPreviewMode = data.auroraLightPreviewMode;
    }
  };

  addLane(rootUserData.auroraEmitterPackageSource);
  addLane(rootUserData.auroraEmitterType);
  addLane(rootUserData.auroraEmitterBlendMode);
  addLane(rootUserData.auroraEmitterRenderMode);
  collectAuroraLightMetrics(root?.userData);

  root?.traverse((node) => {
    collectAuroraLightMetrics(node.userData);
    if (node instanceof THREE.PointLight) {
      const sample = buildAuroraLightPointLightSample(node);
      if (sample) {
        auroraLightSamples.add(sample);
      }
      if (node.castShadow) {
        auroraLightShadowCastCount += 1;
      }
    }
    if (!(node instanceof THREE.Mesh) || !node.visible) {
      return;
    }
    drawParticles += 1;
    const positionAttribute = node.geometry.getAttribute("position");
    if (positionAttribute) {
      renderedVertices += positionAttribute.count;
    }
    addLane(node.userData?.auroraEmitterPackageSource);
    addLane(node.userData?.auroraEmitterType);
    addLane(node.userData?.auroraEmitterBlendMode);
    addLane(node.userData?.auroraEmitterRenderMode);
    const material = Array.isArray(node.material) ? node.material[0] : node.material;
    addLane(material?.userData?.auroraEmitterPackageSource);
    addLane(material?.userData?.auroraEmitterType);
    addLane(material?.userData?.auroraEmitterBlendMode);
    addLane(material?.userData?.auroraEmitterRenderMode);
  });

  return {
    drawParticles,
    renderedVertices,
    drawLanes: Array.from(drawLanes),
    auroraLightNodes: Array.from(auroraLightNodes),
    auroraLightSourceNodeCount,
    auroraLightAcceptedNodeCount,
    auroraLightFlarePayloadNodeCount,
    auroraLightFlareRadiusWriteUnverified,
    auroraLightShadowCastCount,
    auroraLightShadowProofStatuses: Array.from(auroraLightShadowProofStatuses),
    auroraLightAnimatedSourceRadius,
    auroraLightQuadraticAtten,
    auroraLightQuadraticAttenProofStatuses: Array.from(
      auroraLightQuadraticAttenProofStatuses
    ),
    auroraLightBudgetCap,
    auroraLightBudgetHardCap,
    auroraLightConfiguredMaxLights,
    auroraLightBudgetStrategy,
    auroraLightBudgetStrategySource,
    auroraLightBudgetStrategyProofStatus,
    auroraLightPreviewMode,
    auroraLightSamples: Array.from(auroraLightSamples)
  };
}

function buildSnapshot(
  status: RunnerStatus,
  request: ReturnType<typeof readCatalogVfxPreviewRouteRequest>,
  payload: PlaceableViewportRenderPayload | null,
  root: THREE.Object3D | null,
  runtime: ReturnType<typeof createRuntime> | null,
  pixelSignal: PixelSignal,
  error: string | null
): RunnerSnapshot {
  const emitter = payload?.renderPackage?.auroraEmitter?.emitters?.[0] ?? null;
  const emitters = payload?.renderPackage?.auroraEmitter?.emitters ?? [];
  const light = payload?.renderPackage?.auroraLight?.lights?.[0] ?? null;
  const previewGroup = findSourceMdlPreviewGroup(root);
  const flameEmitterGroup = findFlameEmitterGroup(previewGroup);
  const flameEmitterBatch = findParticleBatchMesh(flameEmitterGroup);
  const userData = previewGroup?.userData ?? {};
  const flameEmitterUserData = flameEmitterGroup?.userData ?? {};
  const flameEmitterBatchUserData = flameEmitterBatch?.userData ?? {};
  const rootUserData = root?.userData ?? {};
  const diagnostics = payload?.renderPackage?.diagnostics ?? [];
  const meshCounts = readMeshCounts(root);
  const emitterBounds = new THREE.Box3();
  const emitterBoundsCenter = new THREE.Vector3();
  const emitterBoundsSize = new THREE.Vector3();
  if (previewGroup) {
    emitterBounds.setFromObject(previewGroup);
    if (!emitterBounds.isEmpty()) {
      emitterBounds.getCenter(emitterBoundsCenter);
      emitterBounds.getSize(emitterBoundsSize);
    }
  }
  const material = readFirstMaterial(previewGroup);
  const drawMetrics = readEmitterDrawMetrics(previewGroup);
  const campfireCoreSamples = buildCampfireSourceEmitterSamples(previewGroup);
  const emitterAxisDebugSamples = buildEmitterAxisDebugSamples(previewGroup);
  const renderedEmitterNodesFromGroup = readStringList(userData.auroraEmitterNodes);
  const renderedEmitterNode =
    typeof userData.auroraEmitterNode === "string" ? userData.auroraEmitterNode : "";
  const renderedEmitterNodes =
    renderedEmitterNodesFromGroup.length > 0
      ? renderedEmitterNodesFromGroup
      : renderedEmitterNode.length > 0
        ? [renderedEmitterNode]
        : [];
  const renderedEmitterTexturesFromGroup = readStringList(userData.auroraEmitterTextures);
  const renderedEmitterTexture =
    typeof userData.auroraEmitterTexture === "string" ? userData.auroraEmitterTexture : "";
  const renderedEmitterTextures =
    renderedEmitterTexturesFromGroup.length > 0
      ? renderedEmitterTexturesFromGroup
      : renderedEmitterTexture.length > 0
        ? [renderedEmitterTexture]
        : [];
  const renderedEmitterCount =
    readNumericUserData(userData.vfxEmitterCount) ??
    (renderedEmitterNodes.length > 0 ? renderedEmitterNodes.length : 0);
  const runtimeDataset = runtime?.container.dataset;
  const placeableTwoDaLightDiagnostics = runtime
    ? writePlaceableTwoDaLightRenderDiagnostics(runtime)
    : null;
  const scenePointLightDiagnostics = runtime
    ? writeAuroraScenePointLightDiagnostics(runtime)
    : null;
  const shadowVolumeStencilRuntime = readShadowVolumeStencilRuntimeProof(runtime, root);
  return {
    status,
    error,
    templateId: request.templateId,
    resref: request.resref ?? "",
    appearanceType: request.appearanceType,
    genericType: request.genericType,
    tag: request.tag ?? "",
    localizedName: request.localizedName ?? "",
    subtypeHint: request.subtypeHint,
    placeableSubtype: payload?.placeable.placeableSubtype ?? "",
    renderIsVfx: payload?.placeable.render.isVfx ?? null,
    routeTimeSeconds: request.timeSeconds,
    seed: request.seed,
    lightStateOverride: request.lightStateOverride,
    shadowSizeOverride: request.shadowSizeOverride,
    areaShadowOpacityOverride: request.areaShadowOpacityOverride,
    areaShadowOpacityFactorOverride:
      request.areaShadowOpacityOverride === null ? null : request.areaShadowOpacityOverride / 100,
    maxLightsOverride: request.maxLightsOverride,
    useAreaLightingOverride: request.useAreaLightingOverride,
    displayShadowsOverride: request.displayShadowsOverride,
    rendererStencilBuffer: shadowVolumeStencilRuntime.rendererStencilBuffer,
    shadowVolumeStencilMaterialCount:
      shadowVolumeStencilRuntime.shadowVolumeStencilMaterialCount,
    shadowVolumeStencilReceiverCount:
      shadowVolumeStencilRuntime.shadowVolumeStencilReceiverCount,
    canvasNonblank: pixelSignal.objectVisible,
    objectPixelsWithoutGrid: pixelSignal.objectPixelCount,
    renderPackageStatus: payload?.renderPackage?.status ?? "",
    diagnosticCodes: diagnostics.map((entry) => entry.code),
    modelFileName: emitter?.sourceModelFileName ?? light?.sourceModelFileName ?? "",
    textureUrls: readStringList(payload?.renderPackage?.textureUrls),
    placeableModelStatus: runtimeDataset?.placeableModelStatus ?? "",
    placeableModelLoadPhase: runtimeDataset?.placeableModelLoadPhase ?? "",
    placeableModelTextureStatus: runtimeDataset?.placeableModelTextureStatus ?? "",
    placeableModelTextureLoaded: readNumericUserData(runtimeDataset?.placeableModelTextureLoaded),
    placeableModelTextureCount: readNumericUserData(runtimeDataset?.placeableModelTextureCount),
    placeableModelTextureSource: runtimeDataset?.placeableModelTextureSource ?? "",
    sourceMdlPayloadReady: diagnostics.some(
      (entry) =>
        entry.code === "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY" ||
        entry.code === "PLACEABLE_AURORA_MDL_EMITTER_PAYLOAD_READY"
    ),
    sourceMdlEmitterPreviewStatus:
      typeof rootUserData.sourceMdlEmitterPreviewStatus === "string"
        ? rootUserData.sourceMdlEmitterPreviewStatus
        : "",
    sourceMdlEmitterPreviewMode:
      typeof rootUserData.sourceMdlEmitterPreviewMode === "string"
        ? rootUserData.sourceMdlEmitterPreviewMode
        : "",
    sourceMdlEmitterPreviewVisibilityMode:
      typeof rootUserData.sourceMdlEmitterPreviewVisibilityMode === "string"
        ? rootUserData.sourceMdlEmitterPreviewVisibilityMode
        : "",
    sourceMdlEmitterPreviewTextureStatus:
      typeof rootUserData.sourceMdlEmitterPreviewTextureStatus === "string"
        ? rootUserData.sourceMdlEmitterPreviewTextureStatus
        : "",
    emitterProofMode: request.emitterProofMode,
    textureSourceOverride: request.textureSourceOverride,
    emitterProofDistanceScale:
      readNumericUserData(rootUserData.catalogVfxEmitterProofDistanceScale) ??
      request.emitterProofDistanceScale,
    emitterCameraDistanceScale: request.emitterCameraDistanceScale,
    emitterCameraOrbitDeg: request.emitterCameraOrbitDeg,
    emitterCameraTarget: request.emitterCameraTarget,
    emitterAxisDebug: request.emitterAxisDebug,
    emitterSource: payload?.renderPackage?.auroraEmitter?.source ?? "",
    emitterCount: emitters.length,
    emitterNodes: emitters.map((entry) => entry.nodeName).filter((entry) => entry.length > 0),
    renderedEmitterCount,
    renderedEmitterNodes,
    renderedEmitterTextures,
    emitterNode: emitter?.nodeName ?? "",
    emitterType: emitter?.emitterType ?? "",
    emitterTexture: emitter?.texture ?? "",
    emitterBlendMode: emitter?.blendMode ?? "",
    emitterRenderMode: emitter?.renderMode ?? "",
    particleCount: readNumericUserData(userData.auroraEmitterParticleCount) ?? 0,
    textureStatus: typeof userData.vfxTextureStatus === "string" ? userData.vfxTextureStatus : "",
    alphaStart: readNumericUserData(userData.auroraEmitterParticleAlphaStart),
    alphaEnd: readNumericUserData(userData.auroraEmitterParticleAlphaEnd),
    sizeStart: readNumericUserData(userData.auroraEmitterParticleSizeStart),
    sizeEnd: readNumericUserData(userData.auroraEmitterParticleSizeEnd),
    particleSizeVisibilityFloorPreviewMode:
      typeof userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode === "string"
        ? userData.auroraEmitterParticleSizeVisibilityFloorPreviewMode
        : "",
    flameEmitterNode:
      typeof flameEmitterUserData.auroraEmitterNode === "string"
        ? flameEmitterUserData.auroraEmitterNode
        : "",
    flameEmitterParticleCount:
      readNumericUserData(flameEmitterUserData.auroraEmitterParticleCount) ?? 0,
    flameEmitterBatchVisibleCount:
      readNumericUserData(flameEmitterBatchUserData.auroraParticleBatchVisibleCount) ?? 0,
    flameEmitterBatchSlotCount:
      readNumericUserData(flameEmitterUserData.auroraParticleBatchSlotCount) ?? 0,
    flameEmitterColumnPreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameColumnPreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameColumnPreviewMode
        : "",
    flameEmitterAxisPreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameAxisPreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameAxisPreviewMode
        : "",
    flameEmitterColorPreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameColorPreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameColorPreviewMode
        : "",
    flameEmitterAlphaPreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameAlphaPreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameAlphaPreviewMode
        : "",
    flameEmitterDensityPreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameDensityPreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameDensityPreviewMode
        : "",
    flameEmitterCorePreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameCorePreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameCorePreviewMode
        : "",
    flameEmitterSchedulePreviewMode:
      typeof flameEmitterUserData.auroraEmitterFlameSchedulePreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterFlameSchedulePreviewMode
        : "",
    flameEmitterTransformUnitScalePreviewMode:
      typeof flameEmitterUserData.auroraEmitterTransformUnitScalePreviewMode === "string"
        ? flameEmitterUserData.auroraEmitterTransformUnitScalePreviewMode
        : "",
    emitterAxisDebugSamples,
    colorStart: readNumberList(userData.auroraEmitterParticleColorStart),
    colorEnd: readNumberList(userData.auroraEmitterParticleColorEnd),
    meshCount: meshCounts.meshCount,
    visibleMeshCount: meshCounts.visibleMeshCount,
    drawParticles: drawMetrics.drawParticles,
    renderedVertices: drawMetrics.renderedVertices,
    drawLanes: drawMetrics.drawLanes,
    auroraLightNodes: drawMetrics.auroraLightNodes,
    auroraLightSourceNodeCount: drawMetrics.auroraLightSourceNodeCount,
    auroraLightAcceptedNodeCount: drawMetrics.auroraLightAcceptedNodeCount,
    auroraLightFlarePayloadNodeCount: drawMetrics.auroraLightFlarePayloadNodeCount,
    auroraLightFlareRadiusWriteUnverified: drawMetrics.auroraLightFlareRadiusWriteUnverified,
    auroraLightShadowCastCount: drawMetrics.auroraLightShadowCastCount,
    auroraLightShadowProofStatuses: drawMetrics.auroraLightShadowProofStatuses,
    auroraLightAnimatedSourceRadius: drawMetrics.auroraLightAnimatedSourceRadius,
    auroraLightQuadraticAtten: drawMetrics.auroraLightQuadraticAtten,
    auroraLightQuadraticAttenProofStatuses:
      drawMetrics.auroraLightQuadraticAttenProofStatuses,
    auroraLightBudgetCap: drawMetrics.auroraLightBudgetCap,
    auroraLightBudgetHardCap: drawMetrics.auroraLightBudgetHardCap,
    auroraLightConfiguredMaxLights: drawMetrics.auroraLightConfiguredMaxLights,
    auroraLightBudgetStrategy: drawMetrics.auroraLightBudgetStrategy,
    auroraLightBudgetStrategySource: drawMetrics.auroraLightBudgetStrategySource,
    auroraLightBudgetStrategyProofStatus:
      drawMetrics.auroraLightBudgetStrategyProofStatus,
    auroraLightPreviewMode: drawMetrics.auroraLightPreviewMode,
    auroraLightSamples: drawMetrics.auroraLightSamples,
    sourceMdlLightPayloadReady: diagnostics.some(
      (entry) => entry.code === "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY"
    ),
    lightSource: payload?.renderPackage?.auroraLight?.source ?? "",
    lightNode: light?.nodeName ?? drawMetrics.auroraLightNodes[0] ?? "",
    lightRadius: light?.radius ?? null,
    lightShadowRadius: light?.shadowRadius ?? null,
    lightVerticalDisplacement: light?.verticalDisplacement ?? null,
    lightMultiplier: light?.multiplier ?? null,
    lightColor: readNumberList(light?.color),
    lightAmbientOnly: light?.ambientOnly ?? null,
    lightDynamicType: light?.dynamicType ?? null,
    lightAffectDynamic: light?.affectDynamic ?? null,
    lightShadow: light?.shadow ?? null,
    lightPriority: light?.lightPriority ?? null,
    lightGenerateFlare: light?.generateFlare ?? null,
    lightGenerateFlareProofStatus:
      light?.generateFlare !== undefined
        ? "source-backed-mdl-light-generateflare-token-preserved"
        : "",
    lightLensFlares: light?.lensFlares ?? null,
    lightLensFlaresProofStatus:
      light?.lensFlares !== undefined
        ? "source-backed-mdl-light-lensflares-token-preserved"
        : "",
    lightFadingLight: light?.fadingLight ?? null,
    lightFadingLightProofStatus:
      light?.fadingLight !== undefined
        ? "source-backed-mdl-light-fadinglight-token-preserved"
        : "",
    lightTextureNames: light?.textureNames ?? [],
    lightFlareSizeCount: light?.flareSizes?.length ?? 0,
    lightFlarePositionCount: light?.flarePositions?.length ?? 0,
    lightFlareColorShiftCount: light?.flareColorShifts?.length ?? 0,
    lightFlareArrayProofStatus:
      (light?.flareSizes?.length ?? 0) > 0 ||
      (light?.flarePositions?.length ?? 0) > 0 ||
      (light?.flareColorShifts?.length ?? 0) > 0 ||
      (light?.textureNames?.length ?? 0) > 0
        ? "source-backed-mdl-light-flare-array-payload-preserved"
        : "",
    lightFlareRadius: light?.flareRadius ?? null,
    lightFlareRadiusProofStatus:
      light?.flareRadius !== undefined ? "source-token-preserved-write-target-unverified" : "",
    placeableTwoDaLightStatus: placeableTwoDaLightDiagnostics?.status ?? "",
    placeableTwoDaLightSourceCount: placeableTwoDaLightDiagnostics?.sourceGroups ?? 0,
    placeableTwoDaLightPointLightCount: placeableTwoDaLightDiagnostics?.pointLights ?? 0,
    placeableTwoDaLightFastShadowCount: placeableTwoDaLightDiagnostics?.fastShadows ?? 0,
    placeableTwoDaLightDisabledCount:
      (placeableTwoDaLightDiagnostics?.disabledByLightState ?? 0) +
      (placeableTwoDaLightDiagnostics?.disabledByUseAreaLighting ?? 0),
    placeableTwoDaLightDisabledByLightStateCount:
      placeableTwoDaLightDiagnostics?.disabledByLightState ?? 0,
    placeableTwoDaLightDisabledByUseAreaLightingCount:
      placeableTwoDaLightDiagnostics?.disabledByUseAreaLighting ?? 0,
    placeableTwoDaLightSamples: Array.from(placeableTwoDaLightDiagnostics?.samples ?? []),
    scenePointLightProofStatus: scenePointLightDiagnostics?.proofStatus ?? "",
    scenePointLightRetailOrderingStatus:
      scenePointLightDiagnostics?.retailOrderingStatus ?? "",
    scenePointLightRetailOrderingSortScoreSource:
      scenePointLightDiagnostics?.retailOrderingSortScoreSource ?? "",
    scenePointLightRetailOrderingSortScoreFormula:
      scenePointLightDiagnostics?.retailOrderingSortScoreFormula ?? "",
    scenePointLightRetailOrderingSortDirection:
      scenePointLightDiagnostics?.retailOrderingSortDirection ?? "",
    scenePointLightRetailOrderingSortScoreProofStatus:
      scenePointLightDiagnostics?.retailOrderingSortScoreProofStatus ?? "",
    scenePointLightRetailOrderingCoverageStatus:
      scenePointLightDiagnostics?.retailOrderingCoverageStatus ?? "",
    scenePointLightRetailOrderingRequiredLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingRequiredLanes ?? []
    ),
    scenePointLightRetailOrderingObservedLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingObservedLanes ?? []
    ),
    scenePointLightRetailOrderingMissingLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingMissingLanes ?? []
    ),
    scenePointLightRetailOrderingRuntimeProbeStatus:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeStatus ?? "",
    scenePointLightRetailOrderingRuntimeProbeProofSource:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeProofSource ?? "",
    scenePointLightRetailOrderingRuntimeProbeBlocker:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeBlocker ?? "",
    scenePointLightRetailOrderingRuntimeProbeLocalOrderSource:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeLocalOrderSource ?? "",
    scenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeRequiredLaneCoverageCount ??
      0,
    scenePointLightRetailOrderingRuntimeProbePointLightSampleCount:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbePointLightSampleCount ?? 0,
    scenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount:
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeNonPointRequestSampleCount ??
      0,
    scenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeBudgetAcceptedLanes ?? []
    ),
    scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeBudgetDroppedLanes ?? []
    ),
    scenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes: Array.from(
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeBudgetUnknownLanes ?? []
    ),
    scenePointLightRetailOrderingRuntimeProbeLocalOrderSamples: Array.from(
      scenePointLightDiagnostics?.retailOrderingRuntimeProbeLocalOrderSamples ?? []
    ),
    scenePointLightBudgetMode: scenePointLightDiagnostics?.budgetMode ?? "",
    scenePointLightCount: scenePointLightDiagnostics?.pointLightCount ?? 0,
    sceneSourceBackedPointLightCount:
      scenePointLightDiagnostics?.sourceBackedPointLightCount ?? 0,
    scenePointLightLanes: Array.from(scenePointLightDiagnostics?.lanes ?? []),
    scenePointLightLaneCounts: {
      ...(scenePointLightDiagnostics?.laneCounts ?? {})
    },
    scenePointLightPreviewBudgetCap:
      scenePointLightDiagnostics?.previewBudgetCap ?? null,
    scenePointLightPreviewBudgetHardCap:
      scenePointLightDiagnostics?.previewBudgetHardCap ?? null,
    scenePointLightPreviewBudgetCapSource:
      scenePointLightDiagnostics?.previewBudgetCapSource ?? "",
    scenePointLightPreviewBudgetCapProofStatus:
      scenePointLightDiagnostics?.previewBudgetCapProofStatus ?? "",
    scenePointLightConfiguredMaxLights:
      scenePointLightDiagnostics?.configuredMaxLights ?? null,
    scenePointLightPreviewBudgetAcceptedCount:
      scenePointLightDiagnostics?.previewBudgetAcceptedCount ?? 0,
    scenePointLightPreviewBudgetDroppedCount:
      scenePointLightDiagnostics?.previewBudgetDroppedCount ?? 0,
    scenePointLightSamples: Array.from(scenePointLightDiagnostics?.samples ?? []),
    sceneNonPointLightRequestCount:
      scenePointLightDiagnostics?.nonPointLightRequestCount ?? 0,
    sceneNonPointLightRequestLanes: Array.from(
      scenePointLightDiagnostics?.nonPointLightRequestLanes ?? []
    ),
    sceneNonPointLightRequestLaneCounts: {
      ...(scenePointLightDiagnostics?.nonPointLightRequestLaneCounts ?? {})
    },
    sceneNonPointLightRequestSamples: Array.from(
      scenePointLightDiagnostics?.nonPointLightRequestSamples ?? []
    ),
    sceneShadowProofStatus: scenePointLightDiagnostics?.shadow.proofStatus ?? "",
    sceneShadowRetailProjectionStatus:
      scenePointLightDiagnostics?.shadow.retailProjectionStatus ?? "",
    sceneShadowRetailProjectionSource:
      scenePointLightDiagnostics?.shadow.retailProjectionSource ?? "",
    sceneShadowRetailProjectionShaderNames: Array.from(
      scenePointLightDiagnostics?.shadow.retailProjectionShaderNames ?? []
    ),
    sceneShadowRetailProjectionProofStatus:
      scenePointLightDiagnostics?.shadow.retailProjectionProofStatus ?? "",
    sceneShadowRetailProjectionBlocker:
      scenePointLightDiagnostics?.shadow.retailProjectionBlocker ?? "",
    sceneShadowRetailProjectionRuntimeProbeStatus:
      scenePointLightDiagnostics?.shadow.retailProjectionRuntimeProbeStatus ?? "",
    sceneShadowRetailProjectionRuntimeProbeProofSource:
      scenePointLightDiagnostics?.shadow.retailProjectionRuntimeProbeProofSource ?? "",
    sceneShadowRetailProjectionRuntimeProbeBlocker:
      scenePointLightDiagnostics?.shadow.retailProjectionRuntimeProbeBlocker ?? "",
    sceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus:
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeLocalPixelProofStatus ?? "",
    sceneShadowRetailProjectionRuntimeProbeActiveCasterCount:
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeActiveCasterCount ?? 0,
    sceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount:
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeProjectionPreviewCount ?? 0,
    sceneShadowRetailProjectionRuntimeProbeStencilReceiverCount:
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeStencilReceiverCount ?? 0,
    sceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount:
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeStencilVolumePassCount ?? 0,
    sceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses: Array.from(
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeExpectedStencilPasses ?? []
    ),
    sceneShadowRetailProjectionRuntimeProbeObservedStencilPasses: Array.from(
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeObservedStencilPasses ?? []
    ),
    sceneShadowRetailProjectionRuntimeProbeRenderShaderNames: Array.from(
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeRenderShaderNames ?? []
    ),
    sceneShadowRetailProjectionRuntimeProbeRenderBuckets: Array.from(
      scenePointLightDiagnostics?.shadow
        .retailProjectionRuntimeProbeRenderBuckets ?? []
    ),
    sceneShadowRetailProjectionRuntimeProbeSamples: Array.from(
      scenePointLightDiagnostics?.shadow.retailProjectionRuntimeProbeSamples ?? []
    ),
    sceneShadowPointLightCastShadowCount:
      scenePointLightDiagnostics?.shadow.pointLightCastShadowCount ?? 0,
    sceneShadowPointLightSamples: Array.from(
      scenePointLightDiagnostics?.shadow.pointLightShadowSamples ?? []
    ),
    sceneShadowItemPropertyLightShadowPolicyCount:
      scenePointLightDiagnostics?.shadow.itemPropertyLightShadowPolicyCount ?? 0,
    sceneShadowItemPropertyLightShadowPolicySamples: Array.from(
      scenePointLightDiagnostics?.shadow.itemPropertyLightShadowPolicySamples ?? []
    ),
    sceneShadowDirectionalLightCastShadowCount:
      scenePointLightDiagnostics?.shadow.directionalLightCastShadowCount ?? 0,
    sceneShadowDirectionalLightSamples: Array.from(
      scenePointLightDiagnostics?.shadow.directionalLightShadowSamples ?? []
    ),
    sceneShadowProgFxType4ShadowRequestCount:
      scenePointLightDiagnostics?.shadow.progFxType4ShadowRequestCount ?? 0,
    sceneShadowProgFxType4ShadowRequestSamples: Array.from(
      scenePointLightDiagnostics?.shadow.progFxType4ShadowRequestSamples ?? []
    ),
    sceneShadowFastShadowProxyCount:
      scenePointLightDiagnostics?.shadow.fastShadowProxyCount ?? 0,
    sceneShadowFastShadowDisabledCount:
      scenePointLightDiagnostics?.shadow.fastShadowDisabledCount ?? 0,
    sceneShadowFastShadowSamples: Array.from(
      scenePointLightDiagnostics?.shadow.fastShadowSamples ?? []
    ),
    sceneShadowAreaStatus: scenePointLightDiagnostics?.shadow.areaShadowStatus ?? "",
    sceneShadowAreaSourceField:
      scenePointLightDiagnostics?.shadow.areaShadowSourceField ?? "",
    sceneShadowAreaStatusSource:
      scenePointLightDiagnostics?.shadow.areaShadowStatusSource ?? "",
    sceneShadowAreaOpacity: scenePointLightDiagnostics?.shadow.areaShadowOpacity ?? null,
    sceneShadowAreaOpacitySource:
      scenePointLightDiagnostics?.shadow.areaShadowOpacitySource ?? "",
    sceneShadowAreaOpacityFactor:
      scenePointLightDiagnostics?.shadow.areaShadowOpacityFactor ?? null,
    sceneShadowAreaOpacityFactorSource:
      scenePointLightDiagnostics?.shadow.areaShadowOpacityFactorSource ?? "",
    emitterWorldBoundsCenter: readVector3(emitterBoundsCenter),
    emitterWorldBoundsSize: readVector3(emitterBoundsSize),
    cameraPosition: runtime ? readVector3(runtime.camera.position) : [],
    materialOpacity: material instanceof THREE.Material ? material.opacity : null,
    materialTransparent: material instanceof THREE.Material ? material.transparent : null,
    materialFallbackApplied: Boolean(material?.userData?.auroraSurfaceEmitterVisibilityFallbackMaterial),
    campfireCoreCount: campfireCoreSamples.length,
    campfireCoreSamples
  };
}

export function CatalogVfxPreviewRunner() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [snapshot, setSnapshot] = useState<RunnerSnapshot>(() =>
    buildSnapshot(
      "loading",
      readCatalogVfxPreviewRouteRequest(),
      null,
      null,
      null,
      { objectVisible: false, objectPixelCount: 0 },
      null
    )
  );
  const request = useMemo(readCatalogVfxPreviewRouteRequest, []);

  useEffect(() => {
    let cancelled = false;
    let cleanupRuntime: (() => void) | null = null;
    let previewAnimationTimer: number | null = null;
    let proofAnimationTimer: number | null = null;
    let forceRenderHook: (() => boolean) | null = null;

    async function run(): Promise<void> {
      try {
        const host = hostRef.current;
        if (!host) {
          throw new Error("Catalog VFX preview host was not mounted");
        }
        const accessToken = await loginForDevPreview(request.apiBaseUrl);
        const placeableApiPort = createHttpPlaceableApiPort(undefined, request.apiBaseUrl);
        const fetchedPayload = await fetchPlaceableViewportRenderPayload(
          placeableApiPort,
          accessToken,
          {
            ...(request.templateId ? { templateId: request.templateId } : {}),
            ...(request.resref ? { resref: request.resref } : {}),
            ...(request.appearanceType !== null
              ? { appearanceType: request.appearanceType }
              : {}),
            ...(request.genericType !== null ? { genericType: request.genericType } : {}),
            ...(request.tag ? { tag: request.tag } : {}),
            ...(request.localizedName ? { localizedName: request.localizedName } : {}),
            subtypeHint: request.subtypeHint,
            bypassCache: true
          }
        );
        if (cancelled) {
          return;
        }
        const lightStatePayload = applyCatalogVfxPreviewLightStateOverride(
          fetchedPayload,
          request.lightStateOverride
        );
        const payload = applyCatalogVfxPreviewShadowSizeOverride(
          lightStatePayload,
          request.shadowSizeOverride
        );
        const deliveryPayload = rewriteCatalogVfxPreviewPayloadDeliveryUrls(
          payload,
          request.apiBaseUrl
        );
        const renderPayload = applyCatalogVfxPreviewTextureSourceOverride(
          deliveryPayload,
          request.textureSourceOverride
        );

        const runtime = createRuntime(host);
        cleanupRuntime = () => disposeRuntime(runtime);
        applyCatalogVfxPreviewAreaShadowOpacityOverride(
          runtime,
          request.areaShadowOpacityOverride
        );
        applyCatalogVfxPreviewMaxLightsOverride(runtime, request.maxLightsOverride);
        applyPlaceableAssetRequestHeaders(runtime, accessToken);
        host.style.width = "960px";
        host.style.height = "540px";
        resizeRuntime(runtime);

        const object = createPreviewObject(request.templateId, renderPayload);
        const scene = createPreviewScene(object);
        const viewportFacade = createViewportFacade();
        rebuildGridLayer(runtime, scene, viewportFacade, true);
        runtime.gridLayer.visible = true;
        runtime.tileOverlayLayer.visible = true;
        runtime.axesHelper.visible = false;
        centerCameraForScene(runtime, scene, { objectPreview: true });
        rebuildObjectMeshes(
          runtime,
          scene.objects,
          [],
          createCatalogVfxPreviewDebugState(request),
          scene.width,
          scene.height,
          1,
          false,
          10,
          [],
          false,
          { [object.id]: renderPayload }
        );

        const render = () => {
          runtime.controls.update();
          runtime.renderer.render(runtime.scene, runtime.camera);
        };
        let lastAnimationUpdateMs = window.performance.now();
        const renderAnimatedFrame = () => {
          const nowMs = window.performance.now();
          const deltaSeconds = Math.min(
            0.1,
            Math.max(0, (nowMs - lastAnimationUpdateMs) / 1000)
          );
          lastAnimationUpdateMs = nowMs;
          updateRuntimeObjectAnimationPlaybacks(runtime, deltaSeconds);
          render();
          return true;
        };
        forceRenderHook = renderAnimatedFrame;
        window.__auroraCatalogVfxPreviewForceRender = renderAnimatedFrame;
        const startPreviewAnimationLoop = () => {
          if (previewAnimationTimer !== null) {
            return;
          }
          previewAnimationTimer = window.setInterval(() => {
            if (cancelled) {
              return;
            }
            renderAnimatedFrame();
          }, 33);
        };
        render();
        await new Promise((resolve) => window.setTimeout(resolve, 1400));
        if (cancelled) {
          return;
        }
        render();
        for (let index = 0; index < 20; index += 1) {
          const currentRoot = findPreviewRoot(runtime, object.id);
          const currentEmitterGroup = findSourceMdlPreviewGroup(currentRoot);
          if (currentEmitterGroup?.userData.vfxTextureStatus === "applied") {
            break;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          render();
          if (cancelled) {
            return;
          }
        }
        await new Promise((resolve) => window.setTimeout(resolve, 700));
        if (cancelled) {
          return;
        }
        const finalRoot = findPreviewRoot(runtime, object.id);
        const finalEmitterGroup = findSourceMdlPreviewGroup(finalRoot);
        const finalCameraTargetGroup =
          request.emitterCameraTarget === "flame"
            ? findFlameEmitterGroup(finalEmitterGroup) ?? finalEmitterGroup
            : finalEmitterGroup;
        const obviousEmitterProofApplied =
          request.emitterProofMode === CATALOG_VFX_EMITTER_PROOF_MODE_OBVIOUS &&
          applyCatalogVfxEmitterObviousProofMode(
            finalRoot,
            finalCameraTargetGroup,
            request.emitterProofDistanceScale
          );
        if (request.emitterAxisDebug) {
          applyCatalogVfxEmitterAxisDebug(
            findFlameEmitterGroup(finalEmitterGroup) ?? finalCameraTargetGroup
          );
        }
        if (obviousEmitterProofApplied) {
          runtime.scene.background = new THREE.Color(0x030812);
          runtime.renderer.setClearColor(0x030812, 1);
        }
        frameCameraForEmitter(
          runtime,
          finalCameraTargetGroup ?? finalRoot,
          request.emitterCameraDistanceScale,
          request.emitterCameraOrbitDeg
        );
        runtime.gridLayer.visible = false;
        runtime.tileOverlayLayer.visible = false;
        render();
        startPreviewAnimationLoop();
        if (obviousEmitterProofApplied && finalRoot) {
          const startMs = window.performance.now();
          const baseRotationY = finalRoot.rotation.y;
          proofAnimationTimer = window.setInterval(() => {
            if (cancelled) {
              return;
            }
            const elapsedSeconds = (window.performance.now() - startMs) / 1000;
            finalRoot.rotation.y = baseRotationY + Math.sin(elapsedSeconds * 1.15) * 0.24;
            render();
          }, 33);
        }
        await new Promise((resolve) => requestAnimationFrame(resolve));

        const root = findPreviewRoot(runtime, object.id);
        const { width, height } = runtime.renderer.domElement;
        const gridVisible = runtime.gridLayer.visible;
        const tileGridVisible = runtime.tileOverlayLayer.visible;
        runtime.gridLayer.visible = false;
        runtime.tileOverlayLayer.visible = false;
        render();
        const pixelSignal = readObjectPixelSignal(runtime.renderer, width, height);
        runtime.gridLayer.visible = gridVisible;
        runtime.tileOverlayLayer.visible = tileGridVisible;
        render();

        if (!cancelled) {
          setSnapshot(
            buildSnapshot("ready", request, renderPayload, root, runtime, pixelSignal, null)
          );
        }
      } catch (error) {
        if (!cancelled) {
          setSnapshot(
            buildSnapshot(
              "error",
              request,
              null,
              null,
              null,
              { objectVisible: false, objectPixelCount: 0 },
              error instanceof Error ? error.message : String(error)
            )
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (proofAnimationTimer !== null) {
        window.clearInterval(proofAnimationTimer);
      }
      if (previewAnimationTimer !== null) {
        window.clearInterval(previewAnimationTimer);
      }
      if (
        forceRenderHook &&
        window.__auroraCatalogVfxPreviewForceRender === forceRenderHook
      ) {
        delete window.__auroraCatalogVfxPreviewForceRender;
      }
      cleanupRuntime?.();
    };
  }, [request]);

  return (
    <main
      data-testid="catalog-vfx-preview-runner"
      data-template-id={snapshot.templateId}
      data-resref={snapshot.resref}
      data-appearance-type={snapshot.appearanceType ?? ""}
      data-generic-type={snapshot.genericType ?? ""}
      data-tag={snapshot.tag}
      data-localized-name={snapshot.localizedName}
      data-subtype-hint={snapshot.subtypeHint}
      data-placeable-subtype={snapshot.placeableSubtype}
      data-render-is-vfx={snapshot.renderIsVfx === null ? "" : String(snapshot.renderIsVfx)}
      data-light-state-override={snapshot.lightStateOverride ?? ""}
      data-shadow-size-override={snapshot.shadowSizeOverride ?? ""}
      data-area-shadow-opacity-override={snapshot.areaShadowOpacityOverride ?? ""}
      data-area-shadow-opacity-factor-override={snapshot.areaShadowOpacityFactorOverride ?? ""}
      data-max-lights-override={snapshot.maxLightsOverride ?? ""}
      data-use-area-lighting-override={
        snapshot.useAreaLightingOverride === null ? "" : String(snapshot.useAreaLightingOverride)
      }
      data-display-shadows-override={
        snapshot.displayShadowsOverride === null ? "" : String(snapshot.displayShadowsOverride)
      }
      data-renderer-stencil-buffer={
        snapshot.rendererStencilBuffer === null ? "" : String(snapshot.rendererStencilBuffer)
      }
      data-shadow-volume-stencil-material-count={
        snapshot.shadowVolumeStencilMaterialCount
      }
      data-shadow-volume-stencil-receiver-count={
        snapshot.shadowVolumeStencilReceiverCount
      }
      data-render-status={snapshot.status}
      data-canvas-nonblank={snapshot.canvasNonblank ? "true" : "false"}
      data-object-pixels={snapshot.objectPixelsWithoutGrid}
      data-render-package-status={snapshot.renderPackageStatus}
      data-source-mdl-payload-ready={snapshot.sourceMdlPayloadReady ? "true" : "false"}
      data-source-mdl-emitter-preview-status={snapshot.sourceMdlEmitterPreviewStatus}
      data-source-mdl-emitter-preview-mode={snapshot.sourceMdlEmitterPreviewMode}
      data-source-mdl-emitter-preview-visibility-mode={
        snapshot.sourceMdlEmitterPreviewVisibilityMode
      }
      data-source-mdl-emitter-preview-texture-status={
        snapshot.sourceMdlEmitterPreviewTextureStatus
      }
      data-emitter-proof-mode={snapshot.emitterProofMode}
      data-texture-source-override={snapshot.textureSourceOverride ?? ""}
      data-emitter-proof-distance-scale={snapshot.emitterProofDistanceScale ?? ""}
      data-emitter-camera-distance-scale={snapshot.emitterCameraDistanceScale ?? ""}
      data-emitter-camera-orbit-deg={snapshot.emitterCameraOrbitDeg ?? ""}
      data-emitter-camera-target={snapshot.emitterCameraTarget}
      data-emitter-axis-debug={snapshot.emitterAxisDebug ? "true" : "false"}
      data-model-file-name={snapshot.modelFileName}
      data-texture-urls={snapshot.textureUrls.join("|")}
      data-placeable-model-status={snapshot.placeableModelStatus}
      data-placeable-model-load-phase={snapshot.placeableModelLoadPhase}
      data-placeable-model-texture-status={snapshot.placeableModelTextureStatus}
      data-placeable-model-texture-loaded={snapshot.placeableModelTextureLoaded ?? ""}
      data-placeable-model-texture-count={snapshot.placeableModelTextureCount ?? ""}
      data-placeable-model-texture-source={snapshot.placeableModelTextureSource}
      data-diagnostic-codes={snapshot.diagnosticCodes.join("|")}
      data-emitter-source={snapshot.emitterSource}
      data-emitter-count={snapshot.emitterCount}
      data-emitter-nodes={snapshot.emitterNodes.join("|")}
      data-rendered-emitter-count={snapshot.renderedEmitterCount}
      data-rendered-emitter-nodes={snapshot.renderedEmitterNodes.join("|")}
      data-rendered-emitter-textures={snapshot.renderedEmitterTextures.join("|")}
      data-emitter-node={snapshot.emitterNode}
      data-emitter-type={snapshot.emitterType}
      data-emitter-texture={snapshot.emitterTexture}
      data-emitter-blend-mode={snapshot.emitterBlendMode}
      data-emitter-render-mode={snapshot.emitterRenderMode}
      data-particle-count={snapshot.particleCount}
      data-texture-status={snapshot.textureStatus}
      data-alpha-start={snapshot.alphaStart ?? ""}
      data-alpha-end={snapshot.alphaEnd ?? ""}
      data-size-start={snapshot.sizeStart ?? ""}
      data-size-end={snapshot.sizeEnd ?? ""}
      data-particle-size-visibility-floor-preview-mode={
        snapshot.particleSizeVisibilityFloorPreviewMode
      }
      data-flame-emitter-node={snapshot.flameEmitterNode}
      data-flame-emitter-particle-count={snapshot.flameEmitterParticleCount}
      data-flame-emitter-batch-visible-count={snapshot.flameEmitterBatchVisibleCount}
      data-flame-emitter-batch-slot-count={snapshot.flameEmitterBatchSlotCount}
      data-flame-emitter-column-preview-mode={snapshot.flameEmitterColumnPreviewMode}
      data-flame-emitter-axis-preview-mode={snapshot.flameEmitterAxisPreviewMode}
      data-flame-emitter-color-preview-mode={snapshot.flameEmitterColorPreviewMode}
      data-flame-emitter-alpha-preview-mode={snapshot.flameEmitterAlphaPreviewMode}
      data-flame-emitter-density-preview-mode={snapshot.flameEmitterDensityPreviewMode}
      data-flame-emitter-core-preview-mode={snapshot.flameEmitterCorePreviewMode}
      data-flame-emitter-schedule-preview-mode={snapshot.flameEmitterSchedulePreviewMode}
      data-flame-emitter-transform-unit-scale-preview-mode={
        snapshot.flameEmitterTransformUnitScalePreviewMode
      }
      data-emitter-axis-debug-samples={snapshot.emitterAxisDebugSamples.join("|")}
      data-color-start={snapshot.colorStart.join(",")}
      data-color-end={snapshot.colorEnd.join(",")}
      data-mesh-count={snapshot.meshCount}
      data-visible-mesh-count={snapshot.visibleMeshCount}
      data-draw-particles={snapshot.drawParticles}
      data-rendered-vertices={snapshot.renderedVertices}
      data-draw-lanes={snapshot.drawLanes.join("|")}
      data-source-mdl-light-payload-ready={
        snapshot.sourceMdlLightPayloadReady ? "true" : "false"
      }
      data-light-source={snapshot.lightSource}
      data-light-node={snapshot.lightNode}
      data-light-radius={snapshot.lightRadius ?? ""}
      data-light-shadow-radius={snapshot.lightShadowRadius ?? ""}
      data-light-vertical-displacement={snapshot.lightVerticalDisplacement ?? ""}
      data-light-multiplier={snapshot.lightMultiplier ?? ""}
      data-light-color={snapshot.lightColor.join(",")}
      data-light-ambient-only={snapshot.lightAmbientOnly ?? ""}
      data-light-dynamic-type={snapshot.lightDynamicType ?? ""}
      data-light-affect-dynamic={snapshot.lightAffectDynamic ?? ""}
      data-light-shadow={snapshot.lightShadow ?? ""}
      data-light-priority={snapshot.lightPriority ?? ""}
      data-light-generate-flare={snapshot.lightGenerateFlare ?? ""}
      data-light-generate-flare-proof-status={snapshot.lightGenerateFlareProofStatus}
      data-light-lens-flares={snapshot.lightLensFlares ?? ""}
      data-light-lens-flares-proof-status={snapshot.lightLensFlaresProofStatus}
      data-light-fading-light={snapshot.lightFadingLight ?? ""}
      data-light-fading-light-proof-status={snapshot.lightFadingLightProofStatus}
      data-light-texture-names={snapshot.lightTextureNames.join("|")}
      data-light-flare-size-count={snapshot.lightFlareSizeCount}
      data-light-flare-position-count={snapshot.lightFlarePositionCount}
      data-light-flare-color-shift-count={snapshot.lightFlareColorShiftCount}
      data-light-flare-array-proof-status={snapshot.lightFlareArrayProofStatus}
      data-light-flare-radius={snapshot.lightFlareRadius ?? ""}
      data-light-flare-radius-proof-status={snapshot.lightFlareRadiusProofStatus}
      data-aurora-light-nodes={snapshot.auroraLightNodes.join("|")}
      data-aurora-light-source-node-count={snapshot.auroraLightSourceNodeCount}
      data-aurora-light-accepted-node-count={snapshot.auroraLightAcceptedNodeCount}
      data-aurora-light-flare-payload-node-count={snapshot.auroraLightFlarePayloadNodeCount}
      data-aurora-light-flare-radius-write-unverified={
        snapshot.auroraLightFlareRadiusWriteUnverified ? "true" : "false"
      }
      data-aurora-light-shadow-cast-count={snapshot.auroraLightShadowCastCount}
      data-aurora-light-shadow-proof-statuses={snapshot.auroraLightShadowProofStatuses.join("|")}
      data-aurora-light-animated-source-radius={snapshot.auroraLightAnimatedSourceRadius ?? ""}
      data-aurora-light-quadratic-atten={snapshot.auroraLightQuadraticAtten ?? ""}
      data-aurora-light-quadratic-atten-proof-statuses={
        snapshot.auroraLightQuadraticAttenProofStatuses.join("|")
      }
      data-aurora-light-budget-cap={snapshot.auroraLightBudgetCap ?? ""}
      data-aurora-light-budget-hard-cap={snapshot.auroraLightBudgetHardCap ?? ""}
      data-aurora-light-configured-max-lights={snapshot.auroraLightConfiguredMaxLights ?? ""}
      data-aurora-light-budget-strategy={snapshot.auroraLightBudgetStrategy}
      data-aurora-light-budget-strategy-source={snapshot.auroraLightBudgetStrategySource}
      data-aurora-light-budget-strategy-proof-status={
        snapshot.auroraLightBudgetStrategyProofStatus
      }
      data-aurora-light-preview-mode={snapshot.auroraLightPreviewMode}
      data-aurora-light-samples={snapshot.auroraLightSamples.join("|")}
      data-placeable-2da-light-status={snapshot.placeableTwoDaLightStatus}
      data-placeable-2da-light-source-count={snapshot.placeableTwoDaLightSourceCount}
      data-placeable-2da-light-point-light-count={snapshot.placeableTwoDaLightPointLightCount}
      data-placeable-2da-light-fast-shadow-count={snapshot.placeableTwoDaLightFastShadowCount}
      data-placeable-2da-light-disabled-count={snapshot.placeableTwoDaLightDisabledCount}
      data-placeable-2da-light-disabled-by-light-state-count={
        snapshot.placeableTwoDaLightDisabledByLightStateCount
      }
      data-placeable-2da-light-disabled-by-use-area-lighting-count={
        snapshot.placeableTwoDaLightDisabledByUseAreaLightingCount
      }
      data-placeable-2da-light-samples={snapshot.placeableTwoDaLightSamples.join("|")}
      data-scene-point-light-proof-status={snapshot.scenePointLightProofStatus}
      data-scene-point-light-retail-ordering-status={
        snapshot.scenePointLightRetailOrderingStatus
      }
      data-scene-point-light-retail-ordering-sort-score-source={
        snapshot.scenePointLightRetailOrderingSortScoreSource
      }
      data-scene-point-light-retail-ordering-sort-score-formula={
        snapshot.scenePointLightRetailOrderingSortScoreFormula
      }
      data-scene-point-light-retail-ordering-sort-direction={
        snapshot.scenePointLightRetailOrderingSortDirection
      }
      data-scene-point-light-retail-ordering-sort-score-proof-status={
        snapshot.scenePointLightRetailOrderingSortScoreProofStatus
      }
      data-scene-point-light-retail-ordering-coverage-status={
        snapshot.scenePointLightRetailOrderingCoverageStatus
      }
      data-scene-point-light-retail-ordering-required-lanes={
        snapshot.scenePointLightRetailOrderingRequiredLanes.join("|")
      }
      data-scene-point-light-retail-ordering-observed-lanes={
        snapshot.scenePointLightRetailOrderingObservedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-missing-lanes={
        snapshot.scenePointLightRetailOrderingMissingLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-status={
        snapshot.scenePointLightRetailOrderingRuntimeProbeStatus
      }
      data-scene-point-light-retail-ordering-runtime-probe-proof-source={
        snapshot.scenePointLightRetailOrderingRuntimeProbeProofSource
      }
      data-scene-point-light-retail-ordering-runtime-probe-blocker={
        snapshot.scenePointLightRetailOrderingRuntimeProbeBlocker
      }
      data-scene-point-light-retail-ordering-runtime-probe-local-order-source={
        snapshot.scenePointLightRetailOrderingRuntimeProbeLocalOrderSource
      }
      data-scene-point-light-retail-ordering-runtime-probe-required-lane-coverage-count={
        snapshot.scenePointLightRetailOrderingRuntimeProbeRequiredLaneCoverageCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-point-light-sample-count={
        snapshot.scenePointLightRetailOrderingRuntimeProbePointLightSampleCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-non-point-request-sample-count={
        snapshot.scenePointLightRetailOrderingRuntimeProbeNonPointRequestSampleCount
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-accepted-lanes={
        snapshot.scenePointLightRetailOrderingRuntimeProbeBudgetAcceptedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-dropped-lanes={
        snapshot.scenePointLightRetailOrderingRuntimeProbeBudgetDroppedLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-budget-unknown-lanes={
        snapshot.scenePointLightRetailOrderingRuntimeProbeBudgetUnknownLanes.join("|")
      }
      data-scene-point-light-retail-ordering-runtime-probe-local-order-samples={
        snapshot.scenePointLightRetailOrderingRuntimeProbeLocalOrderSamples.join("|")
      }
      data-scene-point-light-budget-mode={snapshot.scenePointLightBudgetMode}
      data-scene-point-light-count={snapshot.scenePointLightCount}
      data-scene-source-backed-point-light-count={snapshot.sceneSourceBackedPointLightCount}
      data-scene-point-light-lanes={snapshot.scenePointLightLanes.join("|")}
      data-scene-point-light-lane-counts={JSON.stringify(snapshot.scenePointLightLaneCounts)}
      data-scene-point-light-preview-budget-cap={
        snapshot.scenePointLightPreviewBudgetCap ?? ""
      }
      data-scene-point-light-preview-budget-hard-cap={
        snapshot.scenePointLightPreviewBudgetHardCap ?? ""
      }
      data-scene-point-light-preview-budget-cap-source={
        snapshot.scenePointLightPreviewBudgetCapSource
      }
      data-scene-point-light-preview-budget-cap-proof-status={
        snapshot.scenePointLightPreviewBudgetCapProofStatus
      }
      data-scene-point-light-configured-max-lights={
        snapshot.scenePointLightConfiguredMaxLights ?? ""
      }
      data-scene-point-light-preview-budget-accepted-count={
        snapshot.scenePointLightPreviewBudgetAcceptedCount
      }
      data-scene-point-light-preview-budget-dropped-count={
        snapshot.scenePointLightPreviewBudgetDroppedCount
      }
      data-scene-point-light-samples={snapshot.scenePointLightSamples.join("|")}
      data-scene-non-point-light-request-count={snapshot.sceneNonPointLightRequestCount}
      data-scene-non-point-light-request-lanes={
        snapshot.sceneNonPointLightRequestLanes.join("|")
      }
      data-scene-non-point-light-request-lane-counts={JSON.stringify(
        snapshot.sceneNonPointLightRequestLaneCounts
      )}
      data-scene-non-point-light-request-samples={
        snapshot.sceneNonPointLightRequestSamples.join("|")
      }
      data-scene-shadow-proof-status={snapshot.sceneShadowProofStatus}
      data-scene-shadow-retail-projection-status={snapshot.sceneShadowRetailProjectionStatus}
      data-scene-shadow-retail-projection-source={snapshot.sceneShadowRetailProjectionSource}
      data-scene-shadow-retail-projection-shader-names={
        snapshot.sceneShadowRetailProjectionShaderNames.join("|")
      }
      data-scene-shadow-retail-projection-proof-status={
        snapshot.sceneShadowRetailProjectionProofStatus
      }
      data-scene-shadow-retail-projection-blocker={
        snapshot.sceneShadowRetailProjectionBlocker
      }
      data-scene-shadow-retail-projection-runtime-probe-status={
        snapshot.sceneShadowRetailProjectionRuntimeProbeStatus
      }
      data-scene-shadow-retail-projection-runtime-probe-proof-source={
        snapshot.sceneShadowRetailProjectionRuntimeProbeProofSource
      }
      data-scene-shadow-retail-projection-runtime-probe-blocker={
        snapshot.sceneShadowRetailProjectionRuntimeProbeBlocker
      }
      data-scene-shadow-retail-projection-runtime-probe-local-pixel-proof-status={
        snapshot.sceneShadowRetailProjectionRuntimeProbeLocalPixelProofStatus
      }
      data-scene-shadow-retail-projection-runtime-probe-active-caster-count={
        snapshot.sceneShadowRetailProjectionRuntimeProbeActiveCasterCount
      }
      data-scene-shadow-retail-projection-runtime-probe-projection-preview-count={
        snapshot.sceneShadowRetailProjectionRuntimeProbeProjectionPreviewCount
      }
      data-scene-shadow-retail-projection-runtime-probe-stencil-receiver-count={
        snapshot.sceneShadowRetailProjectionRuntimeProbeStencilReceiverCount
      }
      data-scene-shadow-retail-projection-runtime-probe-stencil-volume-pass-count={
        snapshot.sceneShadowRetailProjectionRuntimeProbeStencilVolumePassCount
      }
      data-scene-shadow-retail-projection-runtime-probe-expected-stencil-passes={
        snapshot.sceneShadowRetailProjectionRuntimeProbeExpectedStencilPasses.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-observed-stencil-passes={
        snapshot.sceneShadowRetailProjectionRuntimeProbeObservedStencilPasses.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-render-shader-names={
        snapshot.sceneShadowRetailProjectionRuntimeProbeRenderShaderNames.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-render-buckets={
        snapshot.sceneShadowRetailProjectionRuntimeProbeRenderBuckets.join("|")
      }
      data-scene-shadow-retail-projection-runtime-probe-samples={
        snapshot.sceneShadowRetailProjectionRuntimeProbeSamples.join("|")
      }
      data-scene-shadow-point-light-cast-shadow-count={
        snapshot.sceneShadowPointLightCastShadowCount
      }
      data-scene-shadow-point-light-samples={snapshot.sceneShadowPointLightSamples.join("|")}
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
      data-scene-shadow-fast-shadow-proxy-count={snapshot.sceneShadowFastShadowProxyCount}
      data-scene-shadow-fast-shadow-disabled-count={
        snapshot.sceneShadowFastShadowDisabledCount
      }
      data-scene-shadow-fast-shadow-samples={snapshot.sceneShadowFastShadowSamples.join("|")}
      data-scene-shadow-area-status={snapshot.sceneShadowAreaStatus}
      data-scene-shadow-area-source-field={snapshot.sceneShadowAreaSourceField}
      data-scene-shadow-area-status-source={snapshot.sceneShadowAreaStatusSource}
      data-scene-shadow-area-opacity={snapshot.sceneShadowAreaOpacity ?? ""}
      data-scene-shadow-area-opacity-source={snapshot.sceneShadowAreaOpacitySource}
      data-scene-shadow-area-opacity-factor={snapshot.sceneShadowAreaOpacityFactor ?? ""}
      data-scene-shadow-area-opacity-factor-source={
        snapshot.sceneShadowAreaOpacityFactorSource
      }
      data-emitter-world-bounds-center={snapshot.emitterWorldBoundsCenter.join(",")}
      data-emitter-world-bounds-size={snapshot.emitterWorldBoundsSize.join(",")}
      data-camera-position={snapshot.cameraPosition.join(",")}
      data-material-opacity={snapshot.materialOpacity ?? ""}
      data-material-transparent={snapshot.materialTransparent ?? ""}
      data-material-fallback-applied={snapshot.materialFallbackApplied ? "true" : "false"}
      data-campfire-core-count={snapshot.campfireCoreCount}
      data-campfire-core-samples={snapshot.campfireCoreSamples.join("|")}
      data-error={snapshot.error ?? ""}
      style={{
        margin: 0,
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#07111b"
      }}
    >
      <div ref={hostRef} style={{ width: 960, height: 540 }} />
      <script
        id="catalog-vfx-preview-frame"
        type="application/json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(snapshot) }}
      />
    </main>
  );
}
