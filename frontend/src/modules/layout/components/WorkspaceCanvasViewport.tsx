import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type SetStateAction,
  type WheelEvent
} from "react";
import * as THREE from "three";
import type {
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type {
  AreaScene,
  AuroraAreaEditingTool,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  TerrainBrushKind
} from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { ViewportFacade } from "../application/viewportFacade";
import { buildCanvasGridSegments, MASTER_CELLS_PER_TILE } from "../canvasGrid";
import type { WorkspaceOptionSettings } from "../application/layoutPreferencesFacade";
import { isContextMenuGesture, isCtrlPanGesture } from "../viewportPointerPolicy";
import { resolveAxesHelperTransform } from "../axesHelperFacade";
import {
  isVisualTransformGizmoMode,
  resolveGizmoModeBadge,
  resolveVisualTransformSelectionBlockedReason
} from "../visualTransformGizmoRules";
import { WorkspaceContextMenu } from "./WorkspaceContextMenu";
import { AdjustLocationDialog } from "./properties/AdjustLocationDialog";
import { CreaturePropertiesDialog } from "./properties/CreaturePropertiesDialog";
import { DoorPropertiesDialog } from "./properties/DoorPropertiesDialog";
import { ItemPropertiesDialog } from "./properties/ItemPropertiesDialog";
import { PlaceablePropertiesDialog } from "./properties/PlaceablePropertiesDialog";
import { SoundPropertiesDialog } from "./properties/SoundPropertiesDialog";
import {
  DEFAULT_PROPERTY_DIALOG_DRAG_STATE,
  usePropertyDialogDrag,
  type PropertyDialogDragState
} from "./usePropertyDialogDrag";
import { rebuildChunkBounds } from "../adapters/three/workspaceChunkBounds";
import { rebuildGizmoOverlay } from "../adapters/three/workspaceGizmoOverlay";
import { rebuildGridLayer } from "../adapters/three/workspaceGridLayer";
import {
  AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
  rebuildObjectMeshes,
  updateObjectMeshSelectionState,
  writePlaceableTwoDaLightRenderDiagnostics,
  writeSoundRenderDiagnostics
} from "../adapters/three/workspaceObjectMeshLayer";
import { writeAuroraScenePointLightDiagnostics } from "../adapters/three/workspaceSceneLightDiagnostics";
import {
  AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
  clearTerrainMesh,
  rebuildTerrainMesh,
  resolveTerrainScenePackageReadiness,
  resolveTerrainRenderStatus,
  type AreaTerrainTileModelRuntimeSnapshot
} from "../adapters/three/workspaceTerrainMesh";
import {
  clearAreaTilePlacementPreviewOverlay,
  syncAreaTilePlacementPreviewOverlay
} from "../adapters/three/workspaceAreaTilePlacementPreview";
import {
  PLACEABLE_MODEL_STATUS_EVENT
} from "../adapters/three/workspacePlaceableModelPresentation";
import {
  applyOrbitPointerBindings,
  applyPlaceableAssetRequestHeaders,
  applyTopDownOracleCameraLock,
  centerCameraForRuntimeObjectPreview,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  focusCameraOnPoint,
  resizeRuntime,
  sampleRuntimeObjectAnimationAtTime,
  setTopDownOracleCameraForScene,
  updateRuntimeObjectAnimationPlaybacks,
  type PlaceableAssetRequestHeaderRuntime,
  type RuntimeState
} from "../adapters/three/workspaceThreeRuntime";
import {
  workspaceThreeAnchoredOverlayRuntimePort,
  workspaceThreeCameraRuntimePort,
  workspaceThreeObjectAddRuntimePort,
  workspaceThreePointerRuntimePort,
  workspaceThreeSoundListenerRuntimePort,
  workspaceThreeTransformRuntimePort,
  type ThreeCameraBookmark
} from "../adapters/three/workspaceRenderRuntimePorts";
import {
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX,
  CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX,
  CONTEXT_MENU_FALLBACK_HEIGHT_PX,
  CONTEXT_MENU_FALLBACK_WIDTH_PX
} from "../workspaceAnchoredOverlay";
import {
  resolveAnchoredContextMenuPosition,
  resolveContextMenuAnchorScreen
} from "../adapters/three/workspaceViewportProjection";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolveUnsupportedModelCandidateReason
} from "../../placeables/application/placeableRenderAssetResolver";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import type { CreatureViewportRenderPayload } from "../../creatures/application/creatureRenderPayloadResolver";
import type { CreatureApiResourceOption } from "../../creatures/contracts";
import {
  clearPlaceableModelLoadQueue,
  clearPlaceableTextureLoadQueue,
  PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
  type PlaceableModelLoadQueueProgressDetail
} from "../../placeables/adapters/three/placeableThreeAssetLoader";
import type { AreaTileProcessContractReadiness } from "../../tiles/application/areaTileProcessContractReadiness";
import {
  clampSoundHourIndex,
  deriveMaxVolumeDistanceFromCutoff,
  encodeSoundHourMask,
  parseSoundHourMask,
  parseSoundNumericInput,
  resolveSoundHourBounds,
  buildSoundPropertiesDraft,
  applySoundPropertiesDraftToScene,
  buildPlaceablePropertiesDraft,
  buildDoorPropertiesDraft,
  buildCreaturePropertiesDraft,
  buildItemPropertiesDraft,
  areSoundPropertiesDraftsEqual,
  arePlaceablePropertiesDraftsEqual,
  areDoorPropertiesDraftsEqual,
  areCreaturePropertiesDraftsEqual,
  areItemPropertiesDraftsEqual,
  CREATURE_FEAT_FILTER_OPTIONS,
  CREATURE_METAMAGIC_FILTER_OPTIONS,
  CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS,
  CREATURE_SPELL_LEVEL_FILTER_OPTIONS,
  DOOR_APPEARANCE_TYPE_OPTIONS,
  DOOR_GENERIC_APPEARANCE_OPTIONS,
  PLACEABLE_FACTION_OPTIONS,
  PLACEABLE_INITIAL_STATE_OPTIONS,
  PLACEABLE_TRAP_TYPE_OPTIONS,
  PLACEABLE_TREASURE_MODEL_OPTIONS,
  arePlaceableAdvancedSettingsEqual,
  arePlaceableLockSettingsEqual,
  arePlaceableScriptSlotsEqual,
  arePlaceableTrapSettingsEqual,
  stableJsonStringify,
  type CreaturePropertiesDialogState,
  type CreaturePropertiesDraft,
  type CreaturePropertiesTab,
  type CreatureScriptSlotKey,
  type DoorPropertiesDialogState,
  type DoorPropertiesDraft,
  type DoorPropertiesTab,
  type ItemPropertiesDialogState,
  type ItemPropertiesDraft,
  type ItemPropertiesTab,
  type DoorScriptSlotKey,
  type PlaceablePropertiesDialogState,
  type PlaceablePropertiesDraft,
  type PlaceablePropertiesTab,
  type PlaceableScriptSlotKey,
  type SoundDayNight,
  type SoundPositioningMode,
  type SoundPropertiesDialogState,
  type SoundPropertiesDraft,
  type SoundPropertiesTab,
  type SoundWhenToPlay
} from "../application/workspaceObjectPropertyDrafts";
import { useRuntimeSoundPreview } from "../application/useRuntimeSoundPreview";
import type { RuntimeSoundNowPlayingBadge } from "../runtimeSoundPlaybackState";
import { useWorkspaceKeyboardObjectActions } from "../application/useWorkspaceKeyboardObjectActions";
import { useAuroraAreaTileClipboardCommands } from "../application/useAuroraAreaTileClipboardCommands";
import {
  serializeAreaEditingProofFeedback,
  serializeAreaEditingProofHistory,
  serializeAreaEditingProofSelection,
  serializeAreaEditingProofState,
  serializeAreaEditingProofTool,
  serializeAreaEditingProofValue
} from "../application/areaEditingProofDatasets";
import { AuroraAreaCanvasCommands } from "./AuroraAreaCanvasCommands";
import { useWorkspaceObjectCommands } from "../application/useWorkspaceObjectCommands";
import {
  useWorkspacePointerSelection,
  type SelectionBoxState
} from "../application/useWorkspacePointerSelection";
import { canUseAuroraAreaGridPointerDuringAssetLoading } from "../application/workspaceCanvasAssetLoadingPointerGate";
import { cloneSceneObject } from "../application/workspaceSceneObjectClone";
import { useWorkspaceCommandSignal } from "../application/useWorkspaceCommandSignal";
import { useWorkspaceTransformControls } from "../application/useWorkspaceTransformControls";
import {
  resolveContextMenuActionObject,
  useWorkspaceContextMenuActions,
  type ContextMenuState
} from "../application/useWorkspaceContextMenuActions";
import {
  clampWorkspaceDialogPosition,
  resolveAnchoredDialogDragTargetObject,
  useAnchoredContextMenuSync,
  useAnchoredObjectDialogSync,
  type AnchoredDialogPositionState
} from "../application/useWorkspaceDialogLifecycle";
import { useWorkspaceObjectDialogEffects } from "../application/useWorkspaceObjectDialogEffects";
import { useWorkspaceObjectAddDragDrop } from "./useWorkspaceObjectAddDragDrop";
import {
  AREA_PLACEABLE_PLACEHOLDER_REASONS,
  resolvePlaceableModelResolution,
  resolveAreaPlaceablePlaceholderReason,
  resolvePlaceableRenderContractState,
  resolvePlaceableTextureDeliveryUrl,
  resolvePlaceableTextureDeliveryUrlsByReference,
  type AreaPlaceablePlaceholderReason
} from "../application/workspacePlaceableRenderContracts";
import {
  OBJECT_KIND_BY_SCOPE,
  areObjectPlacementsEqual,
  buildAdjustLocationDraft,
  buildAdjustLocationVisualTransformInput,
  filterObjectsByRenderObjectIds,
  filterSelectedObjectIdsForVisibleSelectableObjects,
  fromAdjustLocationCoordinate,
  fromAdjustLocationHeight,
  isKindLocked,
  isObjectSelectableByCatalogScope,
  isObjectSelectableByScope,
  isObjectVisibleWithRenderFilter,
  isObjectVisibleWithRenderFilterState,
  resolveNextAdjustLocationDraftField,
  resolveAdjustLocationVisualTransformMeta,
  resolveObjectRenderStatus,
  resolveObjectAddDropPlacement,
  resolveRenderObjectIdsSet,
  resolveSidebarSelectionIds,
  resolveSceneGridVisibility,
  resolveSceneObjectName,
  resolveSceneObjectRenderScale,
  resolveVisibleSelectedObjects,
  resolveVisibleObjectForSidebarSignal,
  resolveVisibleObjectForPropertiesSignal,
  shouldRenderAreaGeometry,
  toRadians,
  type AdjustLocationDraft,
  type SceneGridVisibility
} from "../application/workspaceSceneInteraction";

export { resolveBackendDeliveryOriginFromConfig, resolveUnsupportedModelCandidateReason };
export { applyPlaceableAssetRequestHeaders };
export {
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrl,
  resolvePlaceableTextureDeliveryUrlsByReference
};
export type { PlaceableAssetRequestHeaderRuntime };

const AREA_SHARED_RENDERER_SNAPSHOT_EVENT =
  "aurora:areas:shared-renderer-snapshot";
const AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT =
  "aurora:areas:tile-process-runtime-snapshot";
const ITEM_VISUAL_PROOF_REQUEST_EVENT =
  "aurora:items:visual-proof-request";
const ITEM_VISUAL_PROOF_SNAPSHOT_EVENT =
  "aurora:items:visual-proof-snapshot";
const AREA_OBJECT_RUNTIME_DIAGNOSTICS_DEBOUNCE_MS = 300;
export const AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT = 256;
const CAMERA_WHEEL_DISTANCE_EPSILON = 0.001;

type WorkspaceCanvasDebugState = WorkspaceToolbarState["canvasDebug"];

function resolveAreaOracleCleanCanvasDebugState(
  debugState: WorkspaceCanvasDebugState
): WorkspaceCanvasDebugState {
  return {
    ...debugState,
    bounds: false,
    collisionOverlay: false,
    hiddenMeshes: false,
    objectLabels: false,
    showNonRenderMeshes: false,
    showVtPhysicalAnchor: false,
    statusMap: "off",
    textures: true,
    walkmeshOverlay: false,
    wireframe: false
  };
}

function normalizeAreaOracleRenderPriorityObjectIds(
  value: string | readonly string[] | null | undefined
): string[] {
  const rawValues = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[|,;]/u)
      : [];
  const seen = new Set<string>();
  const normalized: string[] = [];
  rawValues.forEach((rawValue) => {
    const objectId = rawValue.trim();
    if (!objectId || seen.has(objectId)) {
      return;
    }
    seen.add(objectId);
    normalized.push(objectId);
  });
  return normalized;
}

export function resolveAreaOracleRenderPriorityObjectIdsForTests(
  value: string | readonly string[] | null | undefined
): string[] {
  return normalizeAreaOracleRenderPriorityObjectIds(value);
}

function readAreaOracleRenderPriorityObjectIds(runtime: RuntimeState): string[] {
  return normalizeAreaOracleRenderPriorityObjectIds(
    runtime.container.dataset.areaOracleRenderPriorityObjectIds
  );
}

interface AreaSharedRendererRuntimeSnapshot {
  version: "aurora-areas-shared-renderer-runtime/v1";
  path: "shared-placeables-renderer";
  status: "none" | "ready" | "partial" | "blocked";
  placeholderStatus: "none" | "ready" | "partial" | "blocked";
  total: number;
  payloadBoundCount: number;
  modelReadyCount: number;
  uniqueModelUrlCount: number;
  uniqueModelCacheKeyCount: number;
  modelUrlSample: string[];
  modelCacheKeySample: string[];
  primitiveFallbackCount: number;
  primitiveFallbackRenderLimit: number;
  primitiveFallbackSuppressedCount: number;
  placeholderReasonCounts: Record<AreaPlaceablePlaceholderReason, number>;
  placeholderReasonIds: Record<AreaPlaceablePlaceholderReason, string[]>;
  missingPayloadIds: string[];
  payloadMissingModelUrlIds: string[];
  assetContractBlockedIds: string[];
  modelLoadFailedIds: string[];
  modelLoadFailedModelUrls: string[];
  modelLoadFailedModelCacheKeys: string[];
  stillLoadingIds: string[];
  primitiveFallbackIds: string[];
  textureStatusCounts: Record<string, number>;
  texturePendingIds: string[];
  textureIssueIds: string[];
  textureMissingIds: string[];
  textureFallbackIds: string[];
  textureSkippedIds: string[];
  toolsetPhysicalHiddenIds: string[];
  toolsetPhysicalHiddenReasons: string[];
  blockedIds: string[];
  areaRenderFrameMirror: AreaRenderFrameMirrorSnapshot;
  objectVisualTransformRootCount: number;
  objectVisualTransformAppliedCount: number;
  objectVisualTransformAppliedIds: string[];
  objectVisualTransformSample: AreaSharedRendererVisualTransformSampleEntry[];
  visualTransformSample: AreaSharedRendererVisualTransformSampleEntry[];
  modelBoundsSample: AreaSharedRendererModelBoundsSampleEntry[];
}

interface AreaRenderFrameMirrorLayerSnapshot {
  mirror: string | null;
  mirrorWidth: number | null;
  positionX: number;
  scaleX: number;
}

interface AreaRenderFrameMirrorSnapshot {
  status: "coordinate-x" | "disabled" | "partial";
  enabled: boolean;
  objectLayer: AreaRenderFrameMirrorLayerSnapshot;
  boundsLayer: AreaRenderFrameMirrorLayerSnapshot;
}

interface AreaSharedRendererVisualTransformSampleEntry {
  objectId: string;
  objectKind: string;
  rendererPath: string;
  sourceId: string;
  templateId: string;
  payloadStatus: string;
  geometryStatus: string;
  placeholderReason: string;
  visualTransform: string;
  effectiveVisualTransform: string;
  visualTransformApplied: boolean;
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  renderTransform: AreaSharedRendererModelBoundsSampleEntry["renderTransform"];
}

interface AreaSharedRendererModelBoundsSampleEntry {
  objectId: string;
  sourceId: string;
  templateId: string;
  sourceAppearanceType: number | null;
  sourceGenericType: number | null;
  payloadAppearanceType: number | null;
  payloadModelResRef: string;
  payloadModelGlbUrl: string;
  payloadStatus: string;
  modelUrl: string;
  modelCacheKey: string;
  bounds: string;
  maxAxis: number;
  worldBounds: string;
  worldSize: { x: number; y: number; z: number };
  worldMaxAxis: number;
  screenBounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  };
  screenCenter: { x: number; y: number };
  screenVisible: boolean;
  sourcePlacement: {
    x: number;
    y: number;
    z: number;
    bearing: number;
    bearingDegrees: number;
  };
  renderAnchorVector: { x: number; y: number; z: number };
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  layering: {
    mode: string;
    reason: string;
    footprint: number;
    thickness: number;
    renderOrder: number;
    identity: string;
  };
  renderTransform: {
    sourceBearing: number;
    sourceBearingDegrees: number;
    sourceYaw: number;
    sourceYawDegrees: number;
    renderYaw: number;
    renderYawDegrees: number;
    rotation: { x: number; y: number; z: number };
    quaternion: { x: number; y: number; z: number; w: number };
    placementMatrix: string;
    visualMatrix: string;
    matrix: string;
    offset: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
    axisMapping: string;
    yawComposition: string;
  };
  modelSurface: {
    offset: number;
    rawOffset: number;
    anchorY: number;
    parentScaleY: number;
    targetMinY: number;
    beforeBounds: string;
    beforeSize: { x: number; y: number; z: number };
    afterBounds: string;
    afterSize: { x: number; y: number; z: number };
    beforeMinY: number;
    beforeMaxY: number;
    afterMinY: number;
    afterMaxY: number;
    liftTarget: string;
    terrainSurface: {
      status: string;
      surfaceY: number;
      worldX: number;
      worldZ: number;
      rayOriginY: number;
      rayFar: number;
      hitCount: number;
      candidateMeshCount: number;
      meshName: string;
      tileId: string;
      modelResRef: string;
    };
    terrainClip: {
      status: string;
      applied: boolean;
      reason: string;
      terrainSurfaceStatus: string;
      footprint: number;
      height: number;
      maxFootprint: number;
      minHeight: number;
      source: string;
    };
    supportSurface: {
      status: string;
      confidence: string;
      candidateCount: number;
      supportObjectId: string;
      supportSourceId: string;
      supportTemplateId: string;
      supportModelResRef: string;
      supportLiftTarget: string;
      supportOverlayReason: string;
      supportTopY: number;
      supportBottomY: number;
      objectBottomY: number;
      objectTopY: number;
      sourceZ: number;
      sourceZDeltaY: number;
      gapY: number;
      overlapX: number;
      overlapZ: number;
      overlapArea: number;
      objectFootprintArea: number;
      supportFootprintArea: number;
    };
    supportCorrection: {
      status: string;
      applied: boolean;
      offsetY: number;
      objectBottomY: number;
      objectTopY: number;
      afterBottomY: number;
      afterTopY: number;
      supportObjectId: string;
      supportSourceId: string;
      supportTemplateId: string;
      supportModelResRef: string;
      supportTopY: number;
      supportBottomY: number;
      gapY: number;
      overlapX: number;
      overlapZ: number;
      overlapArea: number;
      overlapRatio: number;
    };
    overlayReason: string;
    overlayFootprint: number;
    overlayThickness: number;
    overlayRenderOrder: number;
    clamped: boolean;
  };
  renderPosition: string;
  renderAnchor: string;
  bearing: string;
  visualTransform: string;
  visualTransformApplied: boolean;
  inactiveDamageStateMeshSuppressionStatus: string;
  inactiveDamageStateMeshSuppressedCount: number;
  inactiveDamageStateMeshSuppressedNames: string;
  meshCount: number;
  textureStatus: string;
  textureReferencedMaterialCount: number;
  textureMappedMaterialCount: number;
  textureMissingMapMaterialCount: number;
  textureAvailableReferences: string[];
  textureRequestedReferences: string[];
  textureLoadedReferences: string[];
  textureFailedReferences: string[];
  materialTextureReferences: string[];
  materialMapReferences: string[];
  materialFlags: {
    usesAlpha: number;
    usesSoftAlpha: number;
    softAlphaDecal: number;
    transparent: number;
    depthWriteDisabled: number;
    multiplyBlending: number;
    auroraMaterialContract: number;
    auroraMaterialClearCustomShader: number;
    auroraMagentaKeyMaterial: number;
  };
  materialOpacityRange: { min: number; max: number };
  materialSamples: AreaSharedRendererMaterialSampleEntry[];
  diagnosticPriority: number;
}

interface AreaSharedRendererMaterialSampleEntry {
  meshName: string;
  meshRenderOrder: number;
  materialName: string;
  materialType: string;
  textureReference: string;
  mapReference: string;
  mapSourceUrl: string;
  mapSize: { width: number; height: number };
  mapFilters: {
    min: string;
    mag: string;
    wrapS: string;
    wrapT: string;
    anisotropy: number;
    generateMipmaps: boolean;
    flipY: boolean;
    colorSpace: string;
  };
  alphaMode: string;
  alphaTest: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
  depthTest: boolean;
  blending: string;
  side: string;
  polygonOffset: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
  layering: string;
}

export function resolveAreaObjectRuntimeEvidenceDatasetLimit(
  visibleCount: number,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): { rowCount: number; truncatedCount: number } {
  const safeVisibleCount = Math.max(0, Math.floor(visibleCount));
  const safeLimit = Math.max(0, Math.floor(limit));
  const rowCount = Math.min(safeVisibleCount, safeLimit);
  return {
    rowCount,
    truncatedCount: Math.max(0, safeVisibleCount - rowCount)
  };
}

export function limitAreaRuntimeIdList(
  ids: string[],
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  return ids.length <= safeLimit ? ids : ids.slice(0, safeLimit);
}

export function shouldConsumeCanvasWheelForCamera(
  runtime: Pick<RuntimeState, "camera" | "controls"> | null | undefined,
  deltaY: number,
  options: { loading?: boolean } = {}
): boolean {
  if (options.loading || !runtime || deltaY === 0) {
    return false;
  }
  const { controls } = runtime;
  if (!controls.enabled || controls.enableZoom === false) {
    return false;
  }

  const distance = runtime.camera.position.distanceTo(controls.target);
  if (!Number.isFinite(distance)) {
    return false;
  }
  const minDistance = Number.isFinite(controls.minDistance) ? controls.minDistance : 0;
  const maxDistance = Number.isFinite(controls.maxDistance)
    ? controls.maxDistance
    : Number.POSITIVE_INFINITY;
  const epsilon = Math.max(CAMERA_WHEEL_DISTANCE_EPSILON, Math.abs(distance) * 0.000001);

  if (deltaY < 0) {
    return distance > minDistance + epsilon;
  }
  return distance < maxDistance - epsilon;
}

export function normalizeWorkspaceRuntimeMaxLights(value: number): number {
  if (!Number.isFinite(value)) {
    return 128;
  }
  return Math.trunc(Math.max(0, Math.min(128, value)));
}

export function applyWorkspaceRuntimeLightBudget(
  runtime: Pick<RuntimeState, "scene"> | null | undefined,
  runtimeMaxLights: number
): number {
  const normalizedMaxLights = normalizeWorkspaceRuntimeMaxLights(runtimeMaxLights);
  if (!runtime) {
    return normalizedMaxLights;
  }
  runtime.scene.userData.auroraLightConfiguredMaxLights = normalizedMaxLights;
  runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights = normalizedMaxLights;
  runtime.scene.userData.auroraLightConfiguredMaxLightsSource =
    "workspace-options-runtime-max-lights";
  runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLightsSource =
    "workspace-options-runtime-max-lights";
  return normalizedMaxLights;
}

function roundAreaRuntimeNumber(value: number): number {
  return Number.isFinite(value) ? Number(value.toFixed(6)) : 0;
}

function formatAreaRuntimeVector(value: { x: number; y: number; z: number }): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: roundAreaRuntimeNumber(value.x),
    y: roundAreaRuntimeNumber(value.y),
    z: roundAreaRuntimeNumber(value.z)
  };
}

function formatAreaRuntimeVectorDataset(value: { x: number; y: number; z: number }): string {
  const vector = formatAreaRuntimeVector(value);
  return `${vector.x},${vector.y},${vector.z}`;
}

function formatAreaRuntimeBounds(box: THREE.Box3): string {
  if (box.isEmpty()) {
    return "empty";
  }
  return [
    formatAreaRuntimeVector(box.min),
    formatAreaRuntimeVector(box.max)
  ]
    .map((vector) => `${vector.x},${vector.y},${vector.z}`)
    .join(" -> ");
}

interface ParsedAreaRuntimeBounds {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

function parseAreaRuntimeBounds(value: string): ParsedAreaRuntimeBounds | null {
  const parts = value
    .split(" -> ")
    .flatMap((part) => part.split(",").map((token) => Number(token.trim())));
  if (parts.length !== 6 || parts.some((part) => !Number.isFinite(part))) {
    return null;
  }
  return {
    minX: Math.min(parts[0], parts[3]),
    minY: Math.min(parts[1], parts[4]),
    minZ: Math.min(parts[2], parts[5]),
    maxX: Math.max(parts[0], parts[3]),
    maxY: Math.max(parts[1], parts[4]),
    maxZ: Math.max(parts[2], parts[5])
  };
}

function readAreaRuntimeUserDataNumber(
  userData: Record<string, unknown>,
  key: string
): number {
  const value = Number(userData[key]);
  return Number.isFinite(value) ? roundAreaRuntimeNumber(value) : 0;
}

function readAreaRuntimeUserDataOptionalNumber(
  userData: Record<string, unknown>,
  key: string
): number | null {
  const rawValue = userData[key];
  if (rawValue === "" || rawValue === null || rawValue === undefined) {
    return null;
  }
  const value = Number(rawValue);
  return Number.isFinite(value) ? roundAreaRuntimeNumber(value) : null;
}

function readAreaRuntimeUserDataString(
  userData: Record<string, unknown>,
  key: string
): string {
  const value = userData[key];
  return typeof value === "string" ? value : "";
}

function readAreaRuntimeRenderTransformEvidence(
  userData: Record<string, unknown>
): AreaSharedRendererVisualTransformSampleEntry["renderTransform"] {
  return {
    sourceBearing: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceBearing"
    ),
    sourceBearingDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceBearingDegrees"
    ),
    sourceYaw: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceYaw"
    ),
    sourceYawDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformSourceYawDegrees"
    ),
    renderYaw: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformRenderYaw"
    ),
    renderYawDegrees: readAreaRuntimeUserDataNumber(
      userData,
      "auroraAreaObjectRenderTransformRenderYawDegrees"
    ),
    rotation: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformRotationZ"
      )
    },
    quaternion: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionZ"
      ),
      w: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformQuaternionW"
      )
    },
    matrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformMatrix"
    ),
    placementMatrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformPlacementMatrix"
    ),
    visualMatrix: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformVisualMatrix"
    ),
    offset: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformOffsetZ"
      )
    },
    scale: {
      x: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleX"
      ),
      y: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleY"
      ),
      z: readAreaRuntimeUserDataNumber(
        userData,
        "auroraAreaObjectRenderTransformScaleZ"
      )
    },
    axisMapping: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformAxisMapping"
    ),
    yawComposition: readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectRenderTransformYawComposition"
    )
  };
}

function createEmptyAreaSupportSurfaceEvidence(
  status: string,
  entry?: AreaSharedRendererModelBoundsSampleEntry,
  bounds?: ParsedAreaRuntimeBounds
): AreaSharedRendererModelBoundsSampleEntry["modelSurface"]["supportSurface"] {
  const sourceZ = entry?.sourcePlacement.z ?? 0;
  return {
    status,
    confidence: "none",
    candidateCount: 0,
    supportObjectId: "",
    supportSourceId: "",
    supportTemplateId: "",
    supportModelResRef: "",
    supportLiftTarget: "",
    supportOverlayReason: "",
    supportTopY: 0,
    supportBottomY: 0,
    objectBottomY: roundAreaRuntimeNumber(bounds?.minY ?? 0),
    objectTopY: roundAreaRuntimeNumber(bounds?.maxY ?? 0),
    sourceZ: roundAreaRuntimeNumber(sourceZ),
    sourceZDeltaY: 0,
    gapY: 0,
    overlapX: 0,
    overlapZ: 0,
    overlapArea: 0,
    objectFootprintArea: roundAreaRuntimeNumber(
      bounds ? resolveAreaBoundsFootprintArea(bounds) : 0
    ),
    supportFootprintArea: 0
  };
}

function resolveAreaBoundsFootprintArea(bounds: ParsedAreaRuntimeBounds): number {
  return Math.max(0, bounds.maxX - bounds.minX) *
    Math.max(0, bounds.maxZ - bounds.minZ);
}

function resolveAreaBoundsFootprintOverlap(
  objectBounds: ParsedAreaRuntimeBounds,
  supportBounds: ParsedAreaRuntimeBounds
): { x: number; z: number; area: number } {
  const x = Math.max(
    0,
    Math.min(objectBounds.maxX, supportBounds.maxX) -
      Math.max(objectBounds.minX, supportBounds.minX)
  );
  const z = Math.max(
    0,
    Math.min(objectBounds.maxZ, supportBounds.maxZ) -
      Math.max(objectBounds.minZ, supportBounds.minZ)
  );
  return {
    x,
    z,
    area: x * z
  };
}

function refreshAreaSharedRendererSupportSurfaceEvidence(
  entries: AreaSharedRendererModelBoundsSampleEntry[]
): void {
  const parsedEntries = entries.map((entry) => ({
    entry,
    bounds: parseAreaRuntimeBounds(entry.worldBounds)
  }));

  parsedEntries.forEach(({ entry, bounds }) => {
    if (!bounds) {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("invalid-bounds", entry);
      return;
    }

    const sourceZ = entry.sourcePlacement.z;
    const objectFootprintArea = resolveAreaBoundsFootprintArea(bounds);
    if (entry.modelSurface.liftTarget === "terrain-overlay") {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("terrain-overlay", entry, bounds);
      return;
    }

    const candidates = parsedEntries
      .filter((candidate) => candidate.entry !== entry && candidate.bounds)
      .filter((candidate) => candidate.entry.modelSurface.liftTarget !== "terrain-overlay")
      .map((candidate) => {
        const supportBounds = candidate.bounds as ParsedAreaRuntimeBounds;
        const overlap = resolveAreaBoundsFootprintOverlap(bounds, supportBounds);
        const supportFootprintArea =
          resolveAreaBoundsFootprintArea(supportBounds);
        const gapY = bounds.minY - supportBounds.maxY;
        const sourceZDeltaY = sourceZ - supportBounds.maxY;
        return {
          entry: candidate.entry,
          bounds: supportBounds,
          overlap,
          supportFootprintArea,
          gapY,
          sourceZDeltaY
        };
      })
      .filter((candidate) => {
        if (candidate.overlap.area <= 0.000001) {
          return false;
        }
        if (candidate.supportFootprintArea <= 0.000001) {
          return false;
        }
        if (candidate.bounds.maxY < -0.02) {
          return false;
        }
        if (candidate.gapY < -0.05 || candidate.gapY > 0.2) {
          return false;
        }
        const objectFootprintRatio =
          candidate.supportFootprintArea / Math.max(objectFootprintArea, 0.000001);
        const overlapRatio =
          candidate.overlap.area / Math.max(objectFootprintArea, 0.000001);
        if (objectFootprintRatio < 0.5 && overlapRatio < 0.5) {
          return false;
        }
        return (
          Math.abs(candidate.sourceZDeltaY) <= 0.35 ||
          Math.abs(candidate.gapY) <= 0.35
        );
      });

    if (candidates.length === 0) {
      entry.modelSurface.supportSurface =
        createEmptyAreaSupportSurfaceEvidence("none", entry, bounds);
      return;
    }

    const best = candidates.sort((left, right) => {
      const leftSizePenalty =
        left.supportFootprintArea < objectFootprintArea * 0.5 ? 0.05 : 0;
      const rightSizePenalty =
        right.supportFootprintArea < objectFootprintArea * 0.5 ? 0.05 : 0;
      const leftScore =
        Math.abs(left.sourceZDeltaY) * 100 +
        Math.abs(left.gapY) * 25 +
        leftSizePenalty -
        Math.min(1, left.overlap.area / Math.max(objectFootprintArea, 0.000001));
      const rightScore =
        Math.abs(right.sourceZDeltaY) * 100 +
        Math.abs(right.gapY) * 25 +
        rightSizePenalty -
        Math.min(1, right.overlap.area / Math.max(objectFootprintArea, 0.000001));
      return leftScore - rightScore;
    })[0];

    const sourceZDeltaAbs = Math.abs(best.sourceZDeltaY);
    const gapAbs = Math.abs(best.gapY);
    const confidence =
      sourceZDeltaAbs <= 0.012 || gapAbs <= 0.012
        ? "strong"
        : sourceZDeltaAbs <= 0.04 || gapAbs <= 0.04
          ? "medium"
          : "weak";

    entry.modelSurface.supportSurface = {
      status: "hit",
      confidence,
      candidateCount: candidates.length,
      supportObjectId: best.entry.objectId,
      supportSourceId: best.entry.sourceId,
      supportTemplateId: best.entry.templateId,
      supportModelResRef: best.entry.payloadModelResRef,
      supportLiftTarget: best.entry.modelSurface.liftTarget,
      supportOverlayReason: best.entry.modelSurface.overlayReason,
      supportTopY: roundAreaRuntimeNumber(best.bounds.maxY),
      supportBottomY: roundAreaRuntimeNumber(best.bounds.minY),
      objectBottomY: roundAreaRuntimeNumber(bounds.minY),
      objectTopY: roundAreaRuntimeNumber(bounds.maxY),
      sourceZ: roundAreaRuntimeNumber(sourceZ),
      sourceZDeltaY: roundAreaRuntimeNumber(best.sourceZDeltaY),
      gapY: roundAreaRuntimeNumber(best.gapY),
      overlapX: roundAreaRuntimeNumber(best.overlap.x),
      overlapZ: roundAreaRuntimeNumber(best.overlap.z),
      overlapArea: roundAreaRuntimeNumber(best.overlap.area),
      objectFootprintArea: roundAreaRuntimeNumber(objectFootprintArea),
      supportFootprintArea: roundAreaRuntimeNumber(best.supportFootprintArea)
    };
  });
}

function resolveAreaRuntimeScreenProjection(
  runtime: RuntimeState,
  box: THREE.Box3
): AreaSharedRendererModelBoundsSampleEntry["screenBounds"] & {
  center: AreaSharedRendererModelBoundsSampleEntry["screenCenter"];
  visible: boolean;
} {
  const canvas = runtime.renderer.domElement;
  const width = canvas.clientWidth || canvas.width || 0;
  const height = canvas.clientHeight || canvas.height || 0;
  if (box.isEmpty() || width <= 0 || height <= 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      center: { x: 0, y: 0 },
      visible: false
    };
  }

  runtime.camera.updateMatrixWorld(true);
  runtime.camera.updateProjectionMatrix();
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z)
  ];
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let visible = false;
  for (const corner of corners) {
    const projected = corner.project(runtime.camera);
    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    if (
      projected.x >= -1 &&
      projected.x <= 1 &&
      projected.y >= -1 &&
      projected.y <= 1 &&
      projected.z >= -1 &&
      projected.z <= 1
    ) {
      visible = true;
    }
  }
  const screenWidth = Math.max(0, maxX - minX);
  const screenHeight = Math.max(0, maxY - minY);
  return {
    minX: roundAreaRuntimeNumber(minX),
    minY: roundAreaRuntimeNumber(minY),
    maxX: roundAreaRuntimeNumber(maxX),
    maxY: roundAreaRuntimeNumber(maxY),
    width: roundAreaRuntimeNumber(screenWidth),
    height: roundAreaRuntimeNumber(screenHeight),
    center: {
      x: roundAreaRuntimeNumber(minX + screenWidth / 2),
      y: roundAreaRuntimeNumber(minY + screenHeight / 2)
    },
    visible
  };
}

function isAreaRuntimeObjectEffectivelyVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function resolveAreaRuntimeToolsetPhysicalVisibility(root: THREE.Object3D): {
  hidden: boolean;
  reason: string;
  source: string;
} {
  let hidden = root.userData?.auroraAreaObjectToolsetPhysicalVisibility === "hidden";
  let reason =
    typeof root.userData?.auroraAreaObjectToolsetPhysicalVisibilityReason === "string"
      ? root.userData.auroraAreaObjectToolsetPhysicalVisibilityReason
      : "";
  let source =
    typeof root.userData?.auroraAreaObjectToolsetPhysicalVisibilitySource === "string"
      ? root.userData.auroraAreaObjectToolsetPhysicalVisibilitySource
      : "";

  root.traverse((node) => {
    if (hidden) {
      return;
    }
    if (node.userData?.auroraAreaObjectToolsetPhysicalVisibility !== "hidden") {
      return;
    }
    hidden = true;
    reason =
      typeof node.userData?.auroraAreaObjectToolsetPhysicalVisibilityReason === "string"
        ? node.userData.auroraAreaObjectToolsetPhysicalVisibilityReason
        : "";
    source =
      typeof node.userData?.auroraAreaObjectToolsetPhysicalVisibilitySource === "string"
        ? node.userData.auroraAreaObjectToolsetPhysicalVisibilitySource
        : "";
  });

  return { hidden, reason, source };
}

function isAreaRuntimeMeshEffectivelyVisible(mesh: THREE.Mesh): boolean {
  if (!isAreaRuntimeObjectEffectivelyVisible(mesh)) {
    return false;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => material.visible !== false);
}

function resolveAreaRuntimeVisibleWorldBounds(root: THREE.Object3D): THREE.Box3 {
  const bounds = new THREE.Box3();
  const meshBounds = new THREE.Box3();
  root.updateWorldMatrix(true, true);
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !isAreaRuntimeMeshEffectivelyVisible(mesh)) {
      return;
    }
    meshBounds.setFromObject(mesh);
    if (!meshBounds.isEmpty()) {
      bounds.union(meshBounds);
    }
  });
  return bounds;
}

function readAreaRuntimeMaterialTextureReference(material: THREE.Material): string {
  const userData = material.userData as Record<string, unknown>;
  const primaryTextureReference = userData.auroraPrimaryTextureReference;
  if (typeof primaryTextureReference === "string" && primaryTextureReference.trim().length > 0) {
    return primaryTextureReference.trim();
  }
  const directTextureReference = userData.textureReference;
  if (typeof directTextureReference === "string" && directTextureReference.trim().length > 0) {
    return directTextureReference.trim();
  }
  const aurora = userData.aurora;
  if (aurora && typeof aurora === "object" && "textureReference" in aurora) {
    const auroraTextureReference = (aurora as { textureReference?: unknown }).textureReference;
    if (typeof auroraTextureReference === "string" && auroraTextureReference.trim().length > 0) {
      return auroraTextureReference.trim();
    }
  }
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  return materialNameMatch?.[1]?.trim() ?? "";
}

function readAreaRuntimeTextureReference(texture: THREE.Texture | null): string {
  if (!texture) {
    return "";
  }
  if (typeof texture.userData?.auroraTextureReference === "string") {
    return texture.userData.auroraTextureReference;
  }
  if (typeof texture.userData?.auroraSourceUrl === "string") {
    return texture.userData.auroraSourceUrl;
  }
  if (typeof texture.name === "string" && texture.name.trim().length > 0) {
    return texture.name.trim();
  }
  return "";
}

function readAreaRuntimeTextureImageSize(texture: THREE.Texture | null): {
  width: number;
  height: number;
} {
  const image = texture?.image as { width?: unknown; height?: unknown } | undefined;
  const width = Number(image?.width);
  const height = Number(image?.height);
  return {
    width: Number.isFinite(width) ? Math.max(0, Math.floor(width)) : 0,
    height: Number.isFinite(height) ? Math.max(0, Math.floor(height)) : 0
  };
}

function formatAreaRuntimeTextureFilter(value: unknown): string {
  switch (value) {
    case THREE.NearestFilter:
      return "NearestFilter";
    case THREE.NearestMipmapNearestFilter:
      return "NearestMipmapNearestFilter";
    case THREE.NearestMipmapLinearFilter:
      return "NearestMipmapLinearFilter";
    case THREE.LinearFilter:
      return "LinearFilter";
    case THREE.LinearMipmapNearestFilter:
      return "LinearMipmapNearestFilter";
    case THREE.LinearMipmapLinearFilter:
      return "LinearMipmapLinearFilter";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeTextureWrapping(value: unknown): string {
  switch (value) {
    case THREE.RepeatWrapping:
      return "RepeatWrapping";
    case THREE.ClampToEdgeWrapping:
      return "ClampToEdgeWrapping";
    case THREE.MirroredRepeatWrapping:
      return "MirroredRepeatWrapping";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeMaterialBlending(value: unknown): string {
  switch (value) {
    case THREE.NoBlending:
      return "NoBlending";
    case THREE.NormalBlending:
      return "NormalBlending";
    case THREE.AdditiveBlending:
      return "AdditiveBlending";
    case THREE.SubtractiveBlending:
      return "SubtractiveBlending";
    case THREE.MultiplyBlending:
      return "MultiplyBlending";
    case THREE.CustomBlending:
      return "CustomBlending";
    default:
      return String(value ?? "");
  }
}

function formatAreaRuntimeMaterialSide(value: unknown): string {
  switch (value) {
    case THREE.FrontSide:
      return "FrontSide";
    case THREE.BackSide:
      return "BackSide";
    case THREE.DoubleSide:
      return "DoubleSide";
    default:
      return String(value ?? "");
  }
}

function collectAreaSharedRendererMaterialEvidence(root: THREE.Object3D): {
  textureReferences: string[];
  mapReferences: string[];
  flags: AreaSharedRendererModelBoundsSampleEntry["materialFlags"];
  opacityRange: AreaSharedRendererModelBoundsSampleEntry["materialOpacityRange"];
  materialSamples: AreaSharedRendererModelBoundsSampleEntry["materialSamples"];
  diagnosticPriority: number;
} {
  const textureReferences = new Set<string>();
  const mapReferences = new Set<string>();
  const materialSamples: AreaSharedRendererModelBoundsSampleEntry["materialSamples"] = [];
  const flags: AreaSharedRendererModelBoundsSampleEntry["materialFlags"] = {
    usesAlpha: 0,
    usesSoftAlpha: 0,
    softAlphaDecal: 0,
    transparent: 0,
    depthWriteDisabled: 0,
    multiplyBlending: 0,
    auroraMaterialContract: 0,
    auroraMaterialClearCustomShader: 0,
    auroraMagentaKeyMaterial: 0
  };
  let minOpacity = Number.POSITIVE_INFINITY;
  let maxOpacity = 0;
  let diagnosticPriority = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material || !isAreaRuntimeMeshEffectivelyVisible(mesh)) {
      return;
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (material.visible === false) {
        return;
      }
      const userData = material.userData as Record<string, unknown>;
      const textureReference = readAreaRuntimeMaterialTextureReference(material);
      if (textureReference.length > 0) {
        textureReferences.add(textureReference);
        if (/(?:blood|dirt|plama|splat|stain|scorch|spill|mud|smudge|decal|plant|ob_plant|rug|carpet|dywan|wit2)/iu.test(textureReference)) {
          diagnosticPriority += 2;
        }
      }
      const materialWithMap = material as THREE.Material & { map?: unknown };
      const materialMap = materialWithMap.map instanceof THREE.Texture ? materialWithMap.map : null;
      const materialMapReference = readAreaRuntimeTextureReference(materialMap);
      if (materialMapReference.trim().length > 0) {
        const normalizedMaterialMapReference = materialMapReference.trim();
        mapReferences.add(normalizedMaterialMapReference);
        if (
          /fxpa_smoke01/iu.test(normalizedMaterialMapReference) &&
          material.opacity > 0.01 &&
          userData.auroraMaterialClearCustomShader !== true
        ) {
          diagnosticPriority += 8;
        }
        if (/ob_plantmag/iu.test(normalizedMaterialMapReference)) {
          diagnosticPriority += 4;
        }
      }
      minOpacity = Math.min(minOpacity, material.opacity);
      maxOpacity = Math.max(maxOpacity, material.opacity);
      if (userData.auroraTextureUsesAlpha === true) {
        flags.usesAlpha += 1;
      }
      if (userData.auroraTextureUsesSoftAlpha === true) {
        flags.usesSoftAlpha += 1;
        diagnosticPriority += 1;
      }
      if (userData.auroraSoftAlphaDecalMaterial === true) {
        flags.softAlphaDecal += 1;
        diagnosticPriority += 3;
      }
      if (material.transparent) {
        flags.transparent += 1;
      }
      if (!material.depthWrite) {
        flags.depthWriteDisabled += 1;
      }
      if (material.blending === THREE.MultiplyBlending) {
        flags.multiplyBlending += 1;
      }
      if (typeof userData.auroraMaterialContractSource === "string") {
        flags.auroraMaterialContract += 1;
      }
      if (userData.auroraMaterialClearCustomShader === true) {
        flags.auroraMaterialClearCustomShader += 1;
        diagnosticPriority += 3;
      }
      if (userData.auroraMagentaKeyMaterial === true) {
        flags.auroraMagentaKeyMaterial += 1;
        diagnosticPriority += 3;
      }
      if (materialSamples.length < 24) {
        const mapSize = readAreaRuntimeTextureImageSize(materialMap);
        materialSamples.push({
          meshName: mesh.name || "",
          meshRenderOrder: Math.floor(mesh.renderOrder),
          materialName: material.name || "",
          materialType: material.type,
          textureReference,
          mapReference: materialMapReference.trim(),
          mapSourceUrl:
            materialMap && typeof materialMap.userData?.auroraSourceUrl === "string"
              ? materialMap.userData.auroraSourceUrl
              : "",
          mapSize,
          mapFilters: {
            min: formatAreaRuntimeTextureFilter(materialMap?.minFilter),
            mag: formatAreaRuntimeTextureFilter(materialMap?.magFilter),
            wrapS: formatAreaRuntimeTextureWrapping(materialMap?.wrapS),
            wrapT: formatAreaRuntimeTextureWrapping(materialMap?.wrapT),
            anisotropy: roundAreaRuntimeNumber(Number(materialMap?.anisotropy ?? 0)),
            generateMipmaps: materialMap?.generateMipmaps === true,
            flipY: materialMap?.flipY === true,
            colorSpace: materialMap?.colorSpace ?? ""
          },
          alphaMode:
            typeof userData.auroraTextureAlphaMode === "string"
              ? userData.auroraTextureAlphaMode
              : "",
          alphaTest: roundAreaRuntimeNumber(material.alphaTest),
          opacity: roundAreaRuntimeNumber(material.opacity),
          transparent: material.transparent === true,
          depthWrite: material.depthWrite === true,
          depthTest: material.depthTest === true,
          blending: formatAreaRuntimeMaterialBlending(material.blending),
          side: formatAreaRuntimeMaterialSide(material.side),
          polygonOffset: material.polygonOffset === true,
          polygonOffsetFactor: roundAreaRuntimeNumber(material.polygonOffsetFactor),
          polygonOffsetUnits: roundAreaRuntimeNumber(material.polygonOffsetUnits),
          layering:
            typeof userData.auroraAreaObjectLayering === "string"
              ? userData.auroraAreaObjectLayering
              : ""
        });
      }
    });
  });
  return {
    textureReferences: Array.from(textureReferences).slice(0, 12),
    mapReferences: Array.from(mapReferences).slice(0, 12),
    flags,
    opacityRange: {
      min: Number.isFinite(minOpacity) ? roundAreaRuntimeNumber(minOpacity) : 0,
      max: roundAreaRuntimeNumber(maxOpacity)
    },
    materialSamples,
    diagnosticPriority
  };
}

interface AreaTileProcessRuntimeSnapshot {
  version: "aurora-areas-tile-process-runtime/v1";
  path: "backend-tile-process-contract";
  status: "not_checked" | AreaTileProcessContractReadiness["status"];
  areaId: string | null;
  checkedCandidateCount: number;
  readyCandidateCount: number;
  blockedCandidateCount: number;
  sourceAssetReadyCount: number;
  mdlSourceReadyCount: number;
  glbGeometryReadyCount: number;
  materialTextureContractReadyCount: number;
  materialBindingBlockedCount: number;
  renderLoaderReadyCount: number;
  blockerSummary: string;
  sourceObjectKeySample: string;
  sourceAssetContractSample: string;
  textureMaterialBlockerSummary: string;
  renderAssetContractBlockerSummary: string;
  mdlGlbMaterialBlockerSummary: string;
}

interface ItemVisualProofObjectSnapshot {
  objectId: string;
  kind: SceneObjectKind;
  name: string;
  tag: string;
  resRef: string;
  sourceType: string;
  sourceId: string;
  templateId: string;
  childCount: number;
  meshCount: number;
  materialCount: number;
  worldBounds: string;
  worldSize: { x: number; y: number; z: number };
  worldMaxAxis: number;
  screenBounds: AreaSharedRendererModelBoundsSampleEntry["screenBounds"];
  screenCenter: AreaSharedRendererModelBoundsSampleEntry["screenCenter"];
  screenVisible: boolean;
  rootPosition: { x: number; y: number; z: number };
  rootRotation: { x: number; y: number; z: number };
  rootScale: { x: number; y: number; z: number };
  preview: {
    mode: string;
    baseItem: number | null;
    baseItemLabel: string;
    modelType: string;
    modelParts: string;
    modelPartResRefs: string;
    textureReferenceCount: number;
    textureReferences: string[];
    modelTextureLoadStatus: string;
    modelTextureReferenceCount: number;
    modelTextureLoadedCount: number;
    modelTextureBindingCount: number;
    modelTextureReferences: string[];
    modelTextureLoadedReferences: string[];
    modelPartTextureFallbackReferences: string[];
    modelPartTextureApplicationReferences: string[];
    modelPartTextureForcedReferences: string[];
    modelPartTextureForcedMaterialCount: number;
    armorPartTextureFallbackReferences: string[];
    armorPartTextureApplicationReferences: string[];
    armorPartTextureForcedReferences: string[];
    armorPartTextureForcedMaterialCount: number;
    materialColorStatus: string;
    armorPartPltBridgeStatus: string;
    armorPartPltBridgeCount: number;
    armorPartTintStatus: string;
    armorPartTintAppliedCount: number;
    armorPartTintColor: string;
    armorPartCount: number;
    modelPartCount: number;
    iconStatus: string;
    iconResRef: string;
    iconSource: string;
    runtimeEffectStatus: string;
    runtimeEffectMode: string;
    runtimeEffectAnimationClipCount: number;
    runtimeEffectAnimationClipNames: string[];
    danglymeshStatus: string;
    danglymeshMode: string;
    danglymeshMeshCount: number;
    danglymeshWeightedVertexCount: number;
    danglymeshNodeNames: string[];
    animmeshStatus: string;
    animmeshMode: string;
    animmeshMeshCount: number;
    alphaAnimationStatus: string;
    selfIllumColorAnimationStatus: string;
    textureCycleStatus: string;
  };
  sharedRenderer: {
    marker: string;
    geometryStatus: string;
    placeholderReason: string;
    textureStatus: string;
    modelUrl: string;
    modelCacheKey: string;
    modelBounds: string;
    modelMaxAxis: number;
    modelMeshCount: number;
  };
  materialEvidence: ReturnType<typeof collectAreaSharedRendererMaterialEvidence>;
}

interface ItemVisualProofSnapshot {
  version: "aurora-items-visual-proof/v1";
  capturedAt: string;
  label: string;
  sceneId: string;
  areaName: string;
  renderAreaGeometry: boolean;
  visibleObjectCount: number;
  selectedObjectIds: string[];
  canvas: {
    width: number;
    height: number;
    clientWidth: number;
    clientHeight: number;
  };
  imageDataUrl?: string;
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
    fov: number;
    near: number;
    far: number;
    frameStatus: string;
    frameMode: string;
    frameTarget: string;
    frameDistance: string;
    frameSource: string;
  };
  objects: ItemVisualProofObjectSnapshot[];
}

function countRuntimeMeshesAndMaterials(root: THREE.Object3D): {
  meshCount: number;
  materialCount: number;
} {
  let meshCount = 0;
  let materialCount = 0;
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh || !mesh.material) {
      return;
    }
    meshCount += 1;
    materialCount += Array.isArray(mesh.material) ? mesh.material.length : 1;
  });
  return { meshCount, materialCount };
}

function readProofUserDataString(
  userData: Record<string, unknown>,
  key: string
): string {
  const value = userData[key];
  return typeof value === "string" ? value : "";
}

function readProofUserDataNumber(
  userData: Record<string, unknown>,
  key: string
): number {
  const value = Number(userData[key]);
  return Number.isFinite(value) ? value : 0;
}

function readProofUserDataStringArray(
  userData: Record<string, unknown>,
  key: string
): string[] {
  const value = userData[key];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  if (typeof value === "string") {
    return value
      .split("|")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

function buildItemVisualProofSnapshot(
  runtime: RuntimeState,
  sceneData: AreaScene | null,
  visibleObjects: SceneObject[],
  selectedObjectIds: string[],
  options: { label?: string; renderAreaGeometry?: boolean } = {}
): ItemVisualProofSnapshot {
  const canvas = runtime.renderer.domElement;
  let imageDataUrl = "";
  try {
    runtime.renderer.render(runtime.scene, runtime.camera);
    imageDataUrl = canvas.toDataURL("image/png");
  } catch {
    imageDataUrl = "";
  }
  const objects = visibleObjects
    .map((object): ItemVisualProofObjectSnapshot | null => {
      const root = runtime.objectMeshById.get(object.id);
      if (!root) {
        return null;
      }
      root.updateWorldMatrix(true, true);
      const worldBounds = new THREE.Box3().setFromObject(root);
      const worldSize = new THREE.Vector3();
      worldBounds.getSize(worldSize);
      const worldMaxAxis = worldBounds.isEmpty()
        ? 0
        : Math.max(Math.abs(worldSize.x), Math.abs(worldSize.y), Math.abs(worldSize.z));
      const projection = resolveAreaRuntimeScreenProjection(runtime, worldBounds);
      const userData = root.userData as Record<string, unknown>;
      const meshStats = countRuntimeMeshesAndMaterials(root);
      const materialEvidence = collectAreaSharedRendererMaterialEvidence(root);
      return {
        objectId: object.id,
        kind: object.kind,
        name: object.name ?? "",
        tag: object.tag,
        resRef: object.resRef,
        sourceType: object.source?.type ?? "local",
        sourceId: object.source?.sourceObjectId ?? "",
        templateId: object.source?.templateId ?? object.resRef,
        childCount: root.children.length,
        meshCount: meshStats.meshCount,
        materialCount: meshStats.materialCount,
        worldBounds: formatAreaRuntimeBounds(worldBounds),
        worldSize: formatAreaRuntimeVector(worldSize),
        worldMaxAxis: roundAreaRuntimeNumber(worldMaxAxis),
        screenBounds: {
          minX: projection.minX,
          minY: projection.minY,
          maxX: projection.maxX,
          maxY: projection.maxY,
          width: projection.width,
          height: projection.height
        },
        screenCenter: projection.center,
        screenVisible: projection.visible,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        preview: {
          mode: readProofUserDataString(userData, "itemPreviewMode"),
          baseItem: Number.isFinite(Number(userData.itemPreviewBaseItem))
            ? Number(userData.itemPreviewBaseItem)
            : null,
          baseItemLabel: readProofUserDataString(userData, "itemPreviewBaseItemLabel"),
          modelType: readProofUserDataString(userData, "itemPreviewModelType"),
          modelParts: readProofUserDataString(userData, "itemPreviewModelParts"),
          modelPartResRefs: readProofUserDataString(userData, "itemPreviewModelPartResRefs"),
          textureReferenceCount: readProofUserDataNumber(
            userData,
            "itemPreviewTextureReferenceCount"
          ),
          textureReferences: readProofUserDataStringArray(
            userData,
            "itemPreviewTextureReferences"
          ),
          modelTextureLoadStatus: readProofUserDataString(
            userData,
            "itemModelTextureLoadStatus"
          ),
          modelTextureReferenceCount: readProofUserDataNumber(
            userData,
            "itemModelTextureReferenceCount"
          ),
          modelTextureLoadedCount: readProofUserDataNumber(
            userData,
            "itemModelTextureLoadedCount"
          ),
          modelTextureBindingCount: readProofUserDataNumber(
            userData,
            "itemModelTextureBindingCount"
          ),
          modelTextureReferences: readProofUserDataStringArray(
            userData,
            "itemModelTextureReferences"
          ),
          modelTextureLoadedReferences: readProofUserDataStringArray(
            userData,
            "itemModelTextureLoadedReferences"
          ),
          modelPartTextureFallbackReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureFallbackReferences"
          ),
          modelPartTextureApplicationReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureApplicationReferences"
          ),
          modelPartTextureForcedReferences: readProofUserDataStringArray(
            userData,
            "itemModelPartTextureForcedReferences"
          ),
          modelPartTextureForcedMaterialCount: readProofUserDataNumber(
            userData,
            "itemModelPartTextureForcedMaterialCount"
          ),
          armorPartTextureFallbackReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureFallbackReferences"
          ),
          armorPartTextureApplicationReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureApplicationReferences"
          ),
          armorPartTextureForcedReferences: readProofUserDataStringArray(
            userData,
            "itemArmorPartTextureForcedReferences"
          ),
          armorPartTextureForcedMaterialCount: readProofUserDataNumber(
            userData,
            "itemArmorPartTextureForcedMaterialCount"
          ),
          materialColorStatus: readProofUserDataString(userData, "itemMaterialColorStatus"),
          armorPartPltBridgeStatus: readProofUserDataString(
            userData,
            "itemArmorPartPltBridgeStatus"
          ),
          armorPartPltBridgeCount: readProofUserDataNumber(
            userData,
            "itemArmorPartPltBridgeCount"
          ),
          armorPartTintStatus: readProofUserDataString(userData, "itemArmorPartTintStatus"),
          armorPartTintAppliedCount: readProofUserDataNumber(
            userData,
            "itemArmorPartTintAppliedCount"
          ),
          armorPartTintColor: readProofUserDataString(userData, "itemArmorPartTintColor"),
          armorPartCount: readProofUserDataNumber(
            userData,
            "itemArmorPartGroupPartCount"
          ),
          modelPartCount: readProofUserDataNumber(
            userData,
            "itemModelPartGroupPartCount"
          ),
          iconStatus: readProofUserDataString(userData, "itemIconFallbackStatus"),
          iconResRef: readProofUserDataString(userData, "itemIconFallbackIconResRef"),
          iconSource: readProofUserDataString(userData, "itemIconFallbackSource"),
          runtimeEffectStatus: readProofUserDataString(userData, "itemRuntimeEffectStatus"),
          runtimeEffectMode: readProofUserDataString(userData, "itemRuntimeEffectMode"),
          runtimeEffectAnimationClipCount: readProofUserDataNumber(
            userData,
            "itemRuntimeEffectAnimationClipCount"
          ),
          runtimeEffectAnimationClipNames: readProofUserDataStringArray(
            userData,
            "itemRuntimeEffectAnimationClipNames"
          ),
          danglymeshStatus: readProofUserDataString(userData, "itemDanglymeshStatus"),
          danglymeshMode: readProofUserDataString(userData, "itemDanglymeshMode"),
          danglymeshMeshCount: readProofUserDataNumber(userData, "itemDanglymeshMeshCount"),
          danglymeshWeightedVertexCount: readProofUserDataNumber(
            userData,
            "itemDanglymeshWeightedVertexCount"
          ),
          danglymeshNodeNames: readProofUserDataStringArray(
            userData,
            "itemDanglymeshNodeNames"
          ),
          animmeshStatus: readProofUserDataString(userData, "itemAnimmeshStatus"),
          animmeshMode: readProofUserDataString(userData, "itemAnimmeshMode"),
          animmeshMeshCount: readProofUserDataNumber(userData, "itemAnimmeshMeshCount"),
          alphaAnimationStatus: readProofUserDataString(
            userData,
            "itemAlphaAnimationStatus"
          ),
          selfIllumColorAnimationStatus: readProofUserDataString(
            userData,
            "itemSelfIllumColorAnimationStatus"
          ),
          textureCycleStatus: readProofUserDataString(userData, "itemTextureCycleStatus")
        },
        sharedRenderer: {
          marker: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererRuntimeMarker"
          ),
          geometryStatus: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererGeometryStatus"
          ),
          placeholderReason: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererPlaceholderReason"
          ),
          textureStatus: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererTextureStatus"
          ),
          modelUrl: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererModelUrl"
          ),
          modelCacheKey: readProofUserDataString(userData, "renderPackageModelCacheKey"),
          modelBounds: readProofUserDataString(
            userData,
            "auroraAreaObjectSharedRendererModelBounds"
          ),
          modelMaxAxis: readProofUserDataNumber(
            userData,
            "auroraAreaObjectSharedRendererModelMaxAxis"
          ),
          modelMeshCount: readProofUserDataNumber(
            userData,
            "auroraAreaObjectSharedRendererModelMeshCount"
          )
        },
        materialEvidence
      };
    })
    .filter((entry): entry is ItemVisualProofObjectSnapshot => entry !== null);

  const snapshot: ItemVisualProofSnapshot = {
    version: "aurora-items-visual-proof/v1",
    capturedAt: new Date().toISOString(),
    label: options.label ?? "",
    sceneId: sceneData?.sceneId ?? "",
    areaName: sceneData?.areaName ?? "",
    renderAreaGeometry: options.renderAreaGeometry ?? false,
    visibleObjectCount: visibleObjects.length,
    selectedObjectIds,
    canvas: {
      width: canvas.width,
      height: canvas.height,
      clientWidth: canvas.clientWidth,
      clientHeight: canvas.clientHeight
    },
    ...(imageDataUrl ? { imageDataUrl } : {}),
    camera: {
      position: formatAreaRuntimeVector(runtime.camera.position),
      target: formatAreaRuntimeVector(runtime.controls.target),
      up: formatAreaRuntimeVector(runtime.camera.up),
      fov: roundAreaRuntimeNumber(runtime.camera.fov),
      near: roundAreaRuntimeNumber(runtime.camera.near),
      far: roundAreaRuntimeNumber(runtime.camera.far),
      frameStatus: runtime.container.dataset.areaCameraFrameStatus ?? "",
      frameMode: runtime.container.dataset.areaCameraFrameMode ?? "",
      frameTarget: runtime.container.dataset.areaCameraFrameTarget ?? "",
      frameDistance: runtime.container.dataset.areaCameraFrameDistance ?? "",
      frameSource: runtime.container.dataset.areaCameraFrameSource ?? ""
    },
    objects
  };

  runtime.container.dataset.itemVisualProofSnapshot = JSON.stringify(snapshot);
  runtime.container.dataset.itemVisualProofSnapshotObjectCount = String(objects.length);
  runtime.container.dataset.itemVisualProofSnapshotLabel = snapshot.label;
  runtime.container.dispatchEvent(
    new CustomEvent<ItemVisualProofSnapshot>(ITEM_VISUAL_PROOF_SNAPSHOT_EVENT, {
      detail: snapshot
    })
  );
  return snapshot;
}
export {
  filterObjectsByRenderObjectIds,
  isObjectVisibleWithRenderFilter,
  resolveObjectAddDropPlacement,
  resolveRenderObjectIdsSet,
  resolveSceneGridVisibility,
  resolveSceneObjectRenderScale,
  shouldRenderAreaGeometry
};
export type { SceneGridVisibility };

type WorkspaceCanvasViewportFacade = Pick<
  ViewportFacade,
  "defaultMasterCellsPerTile" | "isContextMenuGesture" | "isCtrlPanGesture" | "buildGridSegments"
>;

type WorkspaceCanvasTelemetryTrack = (name: string, payload?: TelemetryPayload) => void;

const defaultViewportFacade: WorkspaceCanvasViewportFacade = {
  defaultMasterCellsPerTile: MASTER_CELLS_PER_TILE,
  isContextMenuGesture,
  isCtrlPanGesture,
  buildGridSegments(widthTiles, heightTiles, masterCellsPerTile) {
    return buildCanvasGridSegments(widthTiles, heightTiles, masterCellsPerTile);
  }
};

const defaultTrackTelemetryEvent: WorkspaceCanvasTelemetryTrack = (name, payload) => {
  browserTelemetryFacade.track(name, payload);
};

function isPlaceablesVfxPreviewObject(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): boolean {
  return (
    object.kind === "placeables" &&
    Boolean(
      object.vfxPayload ||
        payload?.placeable.render.isVfx ||
        payload?.placeable.render.frontendType === "vfx" ||
        payload?.placeable.placeableSubtype === "vfx"
    )
  );
}

function findVfxPreviewFrameTarget(root: THREE.Object3D | null): THREE.Object3D | null {
  if (!root) {
    return null;
  }
  let target: THREE.Object3D | null = null;
  root.traverse((node) => {
    if (target) {
      return;
    }
    const data = node.userData;
    if (
      data?.vfxPreviewRole ||
      data?.auroraEmitterPreviewMode ||
      data?.auroraEmitterParticleSizeVisibilityFloorPreviewMode
    ) {
      target = node;
    }
  });
  return target ?? root;
}

export function readPlaceablesVfxPreviewDrawMetrics(root: THREE.Object3D | null): {
  drawParticles: number;
  renderedVertices: number;
  drawLanes: string[];
  auroraLightNodes: string[];
  auroraLightSourceNodeCount: number;
  auroraLightAcceptedNodeCount: number;
  auroraLightFlarePayloadNodeCount: number;
  auroraLightFlareRadiusWriteUnverified: boolean;
  auroraLightBudgetStrategy: string | null;
  auroraLightBudgetStrategySource: string | null;
  auroraLightBudgetStrategyProofStatus: string | null;
  auroraLightPreviewMode: string | null;
} {
  let drawParticles = 0;
  let renderedVertices = 0;
  const drawLanes = new Set<string>();
  const auroraLightNodes = new Set<string>();
  let auroraLightSourceNodeCount = 0;
  let auroraLightAcceptedNodeCount = 0;
  let auroraLightFlarePayloadNodeCount = 0;
  let auroraLightFlareRadiusWriteUnverified = false;
  let auroraLightBudgetStrategy: string | null = null;
  let auroraLightBudgetStrategySource: string | null = null;
  let auroraLightBudgetStrategyProofStatus: string | null = null;
  let auroraLightPreviewMode: string | null = null;
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
  const readFiniteUserDataNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const readUserDataString = (value: unknown): string | null =>
    typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
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
      readFiniteUserDataNumber(data.auroraLightSourceNodeCount) ?? 0
    );
    auroraLightAcceptedNodeCount = Math.max(
      auroraLightAcceptedNodeCount,
      readFiniteUserDataNumber(data.auroraLightAcceptedNodeCount) ?? 0
    );
    auroraLightFlarePayloadNodeCount = Math.max(
      auroraLightFlarePayloadNodeCount,
      readFiniteUserDataNumber(data.auroraLightFlarePayloadNodeCount) ?? 0
    );
    auroraLightFlareRadiusWriteUnverified =
      auroraLightFlareRadiusWriteUnverified ||
      data.auroraLightFlareRadiusWriteUnverified === true ||
      data.auroraLightFlareRadiusProofStatus === "source-token-preserved-write-target-unverified";
    auroraLightBudgetStrategy =
      auroraLightBudgetStrategy ?? readUserDataString(data.auroraLightBudgetStrategy);
    auroraLightBudgetStrategySource =
      auroraLightBudgetStrategySource ??
      readUserDataString(data.auroraLightBudgetStrategySource);
    auroraLightBudgetStrategyProofStatus =
      auroraLightBudgetStrategyProofStatus ??
      readUserDataString(data.auroraLightBudgetStrategyProofStatus);
    auroraLightPreviewMode =
      auroraLightPreviewMode ?? readUserDataString(data.auroraLightPreviewMode);
  };

  addLane(root?.userData?.auroraEmitterPackageSource);
  addLane(root?.userData?.auroraEmitterType);
  addLane(root?.userData?.auroraEmitterBlendMode);
  addLane(root?.userData?.auroraEmitterRenderMode);
  collectAuroraLightMetrics(root?.userData);

  root?.traverse((node) => {
    collectAuroraLightMetrics(node.userData);
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
    auroraLightBudgetStrategy,
    auroraLightBudgetStrategySource,
    auroraLightBudgetStrategyProofStatus,
    auroraLightPreviewMode
  };
}

function clearPlaceablesVfxPreviewDrawMetrics(runtime: RuntimeState): void {
  delete runtime.container.dataset.appVfxDrawMetricsStatus;
  delete runtime.container.dataset.appVfxDrawMetricsObjectId;
  delete runtime.container.dataset.appVfxDrawParticles;
  delete runtime.container.dataset.appVfxRenderedVertices;
  delete runtime.container.dataset.appVfxDrawLanes;
  delete runtime.container.dataset.appVfxDrawMetricsSource;
  delete runtime.container.dataset.appVfxAuroraLightStatus;
  delete runtime.container.dataset.appVfxAuroraLightNodes;
  delete runtime.container.dataset.appVfxAuroraLightSourceNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightAcceptedNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightFlarePayloadNodeCount;
  delete runtime.container.dataset.appVfxAuroraLightFlareRadiusWriteUnverified;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategy;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategySource;
  delete runtime.container.dataset.appVfxAuroraLightBudgetStrategyProofStatus;
  delete runtime.container.dataset.appVfxAuroraLightPreviewMode;
}

function writePlaceablesVfxPreviewDrawMetrics(
  runtime: RuntimeState,
  objectId: string,
  root: THREE.Object3D | null
): void {
  const target = findVfxPreviewFrameTarget(root);
  const metrics = readPlaceablesVfxPreviewDrawMetrics(target);
  runtime.container.dataset.appVfxDrawMetricsStatus =
    metrics.drawParticles > 0 || metrics.renderedVertices > 0 ? "ready" : "missing";
  runtime.container.dataset.appVfxDrawMetricsObjectId = objectId;
  runtime.container.dataset.appVfxDrawParticles = String(metrics.drawParticles);
  runtime.container.dataset.appVfxRenderedVertices = String(metrics.renderedVertices);
  runtime.container.dataset.appVfxDrawLanes = metrics.drawLanes.join("|");
  runtime.container.dataset.appVfxDrawMetricsSource = "workspace-vfx-preview-root";
  runtime.container.dataset.appVfxAuroraLightStatus =
    metrics.auroraLightAcceptedNodeCount > 0 || metrics.auroraLightNodes.length > 0
      ? "ready"
      : "missing";
  runtime.container.dataset.appVfxAuroraLightNodes = metrics.auroraLightNodes.join("|");
  runtime.container.dataset.appVfxAuroraLightSourceNodeCount = String(
    metrics.auroraLightSourceNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightAcceptedNodeCount = String(
    metrics.auroraLightAcceptedNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightFlarePayloadNodeCount = String(
    metrics.auroraLightFlarePayloadNodeCount
  );
  runtime.container.dataset.appVfxAuroraLightFlareRadiusWriteUnverified = String(
    metrics.auroraLightFlareRadiusWriteUnverified
  );
  runtime.container.dataset.appVfxAuroraLightBudgetStrategy =
    metrics.auroraLightBudgetStrategy ?? "";
  runtime.container.dataset.appVfxAuroraLightBudgetStrategySource =
    metrics.auroraLightBudgetStrategySource ?? "";
  runtime.container.dataset.appVfxAuroraLightBudgetStrategyProofStatus =
    metrics.auroraLightBudgetStrategyProofStatus ?? "";
  runtime.container.dataset.appVfxAuroraLightPreviewMode = metrics.auroraLightPreviewMode ?? "";
}

function writeSinglePlaceablesVfxPreviewDiagnostics(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  renderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  if (visibleObjects.length !== 1) {
    clearPlaceablesVfxPreviewDrawMetrics(runtime);
    return;
  }
  const object = visibleObjects[0];
  if (!object || !isPlaceablesVfxPreviewObject(object, renderPayloadsByObjectId?.[object.id])) {
    clearPlaceablesVfxPreviewDrawMetrics(runtime);
    return;
  }
  writePlaceablesVfxPreviewDrawMetrics(
    runtime,
    object.id,
    runtime.objectMeshById.get(object.id) ?? null
  );
}

function formatAreaObjectDatasetNumber(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(fractionDigits);
}

function formatAreaObjectOrderIndex(index: number): string {
  return String(Math.max(0, index) + 1).padStart(3, "0");
}

function resolveAreaObjectOrderKey(object: SceneObject, objectIndex: number): string {
  const prefix = object.source?.type === "aurora_git" ? "GIT" : "scene";
  return `${prefix}-${formatAreaObjectOrderIndex(objectIndex)}`;
}

function resolveAreaObjectDatasetSourceId(object: SceneObject): string {
  return object.source?.sourceObjectId ?? object.id;
}

function resolveAreaObjectDatasetPlacement(object: SceneObject): string {
  return [
    formatAreaObjectDatasetNumber(object.x, 2),
    formatAreaObjectDatasetNumber(object.y, 2),
    formatAreaObjectDatasetNumber(object.z, 2),
    formatAreaObjectDatasetNumber(object.bearing, 0)
  ].join(",");
}

function resolveAreaObjectDatasetEvidence(
  object: SceneObject,
  objectIndex: number
): string {
  return [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef,
    resolveAreaObjectDatasetPlacement(object)
  ].join(";");
}

function formatAreaObjectDoorTransitionValue(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "empty";
}

function formatAreaObjectDoorTransitionMap(
  values: Record<string, unknown> | undefined
): string {
  const entries = Object.entries(values ?? {});
  if (entries.length === 0) {
    return "none";
  }
  return entries
    .map(([key, value]) => `${key}=${value === null ? "null" : String(value)}`)
    .join(",");
}

function resolveAreaObjectDoorTransitionStatus(
  object: SceneObject
): "source-backed" | "empty-source-payload" | "missing-source-payload" | "not-applicable" {
  if (object.kind !== "doors") {
    return "not-applicable";
  }
  const transition = object.doorTransition;
  if (!transition) {
    return "missing-source-payload";
  }
  const hasSourceValue =
    transition.linkedTarget.trim().length > 0 ||
    transition.linkedModule.trim().length > 0 ||
    transition.linkedTag.trim().length > 0 ||
    transition.linkedWaypoint.trim().length > 0 ||
    transition.loadScreen.trim().length > 0 ||
    Object.keys(transition.flags).length > 0 ||
    Object.keys(transition.extra ?? {}).length > 0;
  return hasSourceValue ? "source-backed" : "empty-source-payload";
}

function resolveAreaObjectDoorTransitionEvidence(
  object: SceneObject,
  objectIndex: number
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef,
    resolveAreaObjectDatasetPlacement(object)
  ];
  if (object.kind !== "doors") {
    return [
      ...base,
      "gitTransition=not-applicable",
      "sceneContract=not-applicable",
      "runtimeTransition=not-applicable",
      "dwkWok=not-applicable",
      "browserProof=not-applicable",
      "status=not-applicable"
    ].join(";");
  }
  const transition = object.doorTransition;
  if (!transition) {
    return [
      ...base,
      "gitTransition=missing-linkedto-transitiondestination-linkedtomodule-loadscreenid",
      "sceneContract=missing-doorTransition",
      "linkedTarget=missing",
      "linkedModule=missing",
      "transitionDestination=missing",
      "linkedWaypoint=missing",
      "loadScreen=missing",
      "flags=none",
      "extra=none",
      "runtimeTransition=blocked-preserve-only",
      "dwkWok=blocked",
      "browserProof=blocked",
      `status=${resolveAreaObjectDoorTransitionStatus(object)}`
    ].join(";");
  }
  return [
    ...base,
    "gitTransition=present",
    "sceneContract=doorTransition-preserved",
    `linkedTarget=${formatAreaObjectDoorTransitionValue(transition.linkedTarget)}`,
    `linkedModule=${formatAreaObjectDoorTransitionValue(transition.linkedModule)}`,
    `transitionDestination=${formatAreaObjectDoorTransitionValue(transition.linkedTag)}`,
    `linkedWaypoint=${formatAreaObjectDoorTransitionValue(transition.linkedWaypoint)}`,
    `loadScreen=${formatAreaObjectDoorTransitionValue(transition.loadScreen)}`,
    `flags=${formatAreaObjectDoorTransitionMap(transition.flags)}`,
    `extra=${formatAreaObjectDoorTransitionMap(transition.extra)}`,
    "runtimeTransition=blocked-preserve-only",
    "dwkWok=blocked",
    "browserProof=blocked",
    `status=${resolveAreaObjectDoorTransitionStatus(object)}`
  ].join(";");
}

function resolveAreaObjectDoorTransitionAggregateStatus(
  statuses: Array<"source-backed" | "empty-source-payload" | "missing-source-payload" | "not-applicable">
): string {
  const relevantStatuses = statuses.filter((status) => status !== "not-applicable");
  if (relevantStatuses.length === 0) {
    return statuses.length === 0 ? "none" : "not-applicable";
  }
  if (relevantStatuses.every((status) => status === "source-backed")) {
    return "source-backed";
  }
  if (relevantStatuses.some((status) => status === "source-backed")) {
    return "mixed";
  }
  if (relevantStatuses.every((status) => status === "empty-source-payload")) {
    return "empty-source-payload";
  }
  return "missing-source-payload";
}

function readAreaObjectPlaceableMetadataValue(
  payload: PlaceableViewportRenderPayload | null | undefined,
  keys: string[]
): string | null {
  const metadata = payload?.placeable.metadata;
  if (!metadata) {
    return null;
  }
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
  }
  return null;
}

function resolveAreaObjectDoorTwoDaRowEvidence(
  payload: PlaceableViewportRenderPayload | null | undefined,
  metadataPrefix: "doortypes2da" | "genericdoors2da",
  missingRowReason: string
): string {
  const source = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}SourceKey`]);
  const available = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Available`]);
  const row = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Row`]);
  const label = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}Label`]);
  const model = readAreaObjectPlaceableMetadataValue(payload, [`${metadataPrefix}ModelResRef`]);
  if (row) {
    return [
      `row-${row}`,
      label ? `label-${label}` : "label-missing",
      model ? `model-${model}` : "model-missing",
      source ? `source-${source}` : "source-key-missing"
    ].join("/");
  }
  if (available === "true") {
    return source
      ? `source-indexed-${source}/${missingRowReason}`
      : `source-indexed/${missingRowReason}`;
  }
  if (source) {
    return `source-${source}/${missingRowReason}`;
  }
  return `blocked-missing-${metadataPrefix}-source`;
}

function resolveAreaObjectModelContractStatus(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): "ready" | "partial" | "blocked" | "not-applicable" {
  if (object.kind === "doors") {
    if (!payload) {
      return "blocked";
    }
    const renderState = resolvePlaceableRenderContractState(payload);
    const doorModel = readAreaObjectPlaceableMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef",
      "lookupModelResRef",
      "modelResRef"
    ]);
    return renderState.modelUrl || renderState.hasModelContract || doorModel ? "partial" : "blocked";
  }
  if (object.kind !== "placeables") {
    return "not-applicable";
  }
  if (!payload) {
    return "blocked";
  }

  const renderState = resolvePlaceableRenderContractState(payload);
  const sourceAppearanceType = object.source?.appearanceType;
  const hasSourceAppearance =
    typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType);
  const hasModelName = readAreaObjectPlaceableMetadataValue(payload, [
    "lookupModelResRef",
    "modelResRef",
    "reservedModelResRef",
    "modelName",
    "ModelName"
  ]) !== null;

  if (renderState.modelUrl && hasSourceAppearance && hasModelName) {
    return "ready";
  }
  if (renderState.modelUrl) {
    return "partial";
  }
  return "blocked";
}

function resolveAreaObjectModelContractEvidence(
  object: SceneObject,
  objectIndex: number,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef
  ];

  if (object.kind === "placeables") {
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const sourceAppearanceType = object.source?.appearanceType;
    const appearanceType = payload?.placeable.placeableRuntime?.state?.appearanceType;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : typeof appearanceType === "number" && Number.isFinite(appearanceType)
          ? `render-payload-${appearanceType}-area-git-missing`
          : "missing-area-git-appearance";
    const modelName =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupModelResRef",
        "modelResRef",
        "reservedModelResRef",
        "modelName",
        "ModelName"
      ]) ?? "missing-placeables2da-modelname";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-model-asset-contract";
    return [
      ...base,
      "path=GITAppearance>placeables2daModelName>modelAsset",
      `appearance=${appearance}`,
      `modelName=${modelName}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectModelContractStatus(object, payload)}`
    ].join(";");
  }

  if (object.kind === "doors") {
    const sourceAppearanceType = object.source?.appearanceType;
    const sourceGenericType = object.source?.genericType;
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-door-appearance";
    const genericType =
      typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)
        ? `git-generic-type-${sourceGenericType}`
        : "missing-source-generic-type";
    const templateSource =
      readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]) ??
      "missing-utd-source";
    const utdAppearance =
      readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]) ??
      "missing-utd-appearance";
    const templateModel =
      readAreaObjectPlaceableMetadataValue(payload, [
        "doorLookupModelResRef",
        "genericdoors2daModelResRef",
        "doortypes2daModelResRef",
        "lookupModelResRef",
        "modelResRef",
        "modelName"
      ]) ?? "missing-utd-model";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-door-model-asset-contract";
    return [
      ...base,
      "path=templateAppearanceGenericType>doortypesGenericdoors>modelAsset",
      `appearance=${appearance}`,
      `genericType=${genericType}`,
      `utdSource=${templateSource}`,
      `utdAppearance=${utdAppearance}`,
      `templateModel=${templateModel}`,
      `doortypes=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "doortypes2da",
        "missing-doortypes-row-for-utd-appearance"
      )}`,
      `genericdoors=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "genericdoors2da",
        "missing-genericdoors-row-for-utd-generic-type"
      )}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectModelContractStatus(object, payload)}`
    ].join(";");
  }

  return [...base, "path=not-applicable", "status=not-applicable"].join(";");
}

function resolveAreaObjectLookupContractStatus(
  object: SceneObject,
  payload: PlaceableViewportRenderPayload | null | undefined
): "ready" | "partial" | "blocked" | "not-applicable" {
  if (object.kind === "doors") {
    const templateSource = readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]);
    const utdAppearance = readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]);
    const model = readAreaObjectPlaceableMetadataValue(payload, [
      "doorLookupModelResRef",
      "genericdoors2daModelResRef",
      "doortypes2daModelResRef",
      "lookupModelResRef",
      "modelResRef"
    ]);
    const doortypesSource = readAreaObjectPlaceableMetadataValue(payload, [
      "doortypes2daSourceKey",
      "doortypes2daAvailable"
    ]);
    const genericdoorsSource = readAreaObjectPlaceableMetadataValue(payload, [
      "genericdoors2daSourceKey",
      "genericdoors2daAvailable"
    ]);
    const doortypesRow = readAreaObjectPlaceableMetadataValue(payload, ["doortypes2daRow"]);
    const genericdoorsRow = readAreaObjectPlaceableMetadataValue(payload, ["genericdoors2daRow"]);
    const hasSourceAppearance =
      typeof object.source?.appearanceType === "number" &&
      Number.isFinite(object.source.appearanceType);
    const hasSourceGenericType =
      typeof object.source?.genericType === "number" && Number.isFinite(object.source.genericType);
    if (model && hasSourceAppearance && hasSourceGenericType) {
      return "ready";
    }
    if (
      templateSource ||
      utdAppearance ||
      model ||
      doortypesSource ||
      genericdoorsSource ||
      doortypesRow ||
      genericdoorsRow ||
      hasSourceAppearance ||
      hasSourceGenericType
    ) {
      return "partial";
    }
    return "blocked";
  }
  if (object.kind !== "placeables") {
    return "not-applicable";
  }
  const source2da = readAreaObjectPlaceableMetadataValue(payload, ["source2da"]);
  const row = readAreaObjectPlaceableMetadataValue(payload, ["source2daRow", "appearanceId"]);
  const model = readAreaObjectPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"]);
  if (source2da && row && model) {
    return "ready";
  }
  if (model) {
    return "partial";
  }
  return "blocked";
}

function resolveAreaObjectLookupContractEvidence(
  object: SceneObject,
  objectIndex: number,
  payload: PlaceableViewportRenderPayload | null | undefined
): string {
  const base = [
    resolveAreaObjectOrderKey(object, objectIndex),
    object.kind,
    object.source?.type ?? "local",
    resolveAreaObjectDatasetSourceId(object),
    object.source?.templateId ?? object.resRef
  ];

  if (object.kind === "placeables") {
    const sourceAppearanceType = object.source?.appearanceType;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-git-appearance";
    const source2da =
      readAreaObjectPlaceableMetadataValue(payload, ["source2da"]) ?? "missing-source2da";
    const row =
      readAreaObjectPlaceableMetadataValue(payload, ["source2daRow", "appearanceId"]) ??
      "missing-row";
    const model =
      readAreaObjectPlaceableMetadataValue(payload, ["lookupModelResRef", "modelResRef"]) ??
      "missing-model";
    const template =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupTemplateResRef",
        "templateResRef"
      ]) ?? "missing-template";
    const dependencyCount =
      readAreaObjectPlaceableMetadataValue(payload, [
        "lookupDependencyCount",
        "dependencyCount"
      ]) ?? "missing-dependency-count";
    return [
      ...base,
      "path=GITAppearance>placeables2da>ModelName>modelAsset",
      `appearance=${appearance}`,
      `source2da=${source2da}`,
      `row=${row}`,
      `template=${template}`,
      `model=${model}`,
      `dependencies=${dependencyCount}`,
      `status=${resolveAreaObjectLookupContractStatus(object, payload)}`
    ].join(";");
  }

  if (object.kind === "doors") {
    const sourceAppearanceType = object.source?.appearanceType;
    const sourceGenericType = object.source?.genericType;
    const renderState = payload ? resolvePlaceableRenderContractState(payload) : null;
    const appearance =
      typeof sourceAppearanceType === "number" && Number.isFinite(sourceAppearanceType)
        ? `git-appearance-${sourceAppearanceType}`
        : "missing-area-door-appearance";
    const genericType =
      typeof sourceGenericType === "number" && Number.isFinite(sourceGenericType)
        ? `git-generic-type-${sourceGenericType}`
        : "missing-source-generic-type";
    const templateSource =
      readAreaObjectPlaceableMetadataValue(payload, ["sourceObjectKey"]) ??
      "missing-utd-source";
    const template =
      readAreaObjectPlaceableMetadataValue(payload, [
        "templateResRef",
        "lookupTemplateResRef"
      ]) ?? "missing-utd-template";
    const utdAppearance =
      readAreaObjectPlaceableMetadataValue(payload, ["appearanceId"]) ??
      "missing-utd-appearance";
    const model =
      readAreaObjectPlaceableMetadataValue(payload, [
        "doorLookupModelResRef",
        "genericdoors2daModelResRef",
        "doortypes2daModelResRef",
        "lookupModelResRef",
        "modelResRef"
      ]) ??
      "missing-utd-model";
    const modelAsset = renderState?.modelUrl
      ? "model-url-ready"
      : renderState?.hasModelContract
        ? "model-contract-without-url"
        : "missing-door-model-asset-contract";
    return [
      ...base,
      "path=templateAppearanceGenericType>doortypes2da>genericdoors2da>modelAsset",
      `appearance=${appearance}`,
      `genericType=${genericType}`,
      `utdSource=${templateSource}`,
      `utdTemplate=${template}`,
      `utdAppearance=${utdAppearance}`,
      `utdModel=${model}`,
      `doortypes=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "doortypes2da",
        "missing-doortypes-row-for-utd-appearance"
      )}`,
      `genericdoors=${resolveAreaObjectDoorTwoDaRowEvidence(
        payload,
        "genericdoors2da",
        "missing-genericdoors-row-for-utd-generic-type"
      )}`,
      `modelAsset=${modelAsset}`,
      `status=${resolveAreaObjectLookupContractStatus(object, payload)}`
    ].join(";");
  }

  return [...base, "path=not-applicable", "status=not-applicable"].join(";");
}

function resolveAreaObjectSelectedModelContractStatus(
  statuses: Array<"ready" | "partial" | "blocked" | "not-applicable">
): string {
  const relevantStatuses = statuses.filter((status) => status !== "not-applicable");
  if (relevantStatuses.length === 0) {
    return statuses.length === 0 ? "none" : "not-applicable";
  }
  if (relevantStatuses.every((status) => status === "ready")) {
    return "ready";
  }
  if (relevantStatuses.some((status) => status === "ready" || status === "partial")) {
    return "mixed";
  }
  return "blocked";
}

function isAreaObjectBackendRenderContractTarget(object: SceneObject): boolean {
  return (
    object.source?.type === "aurora_git" &&
    (object.kind === "placeables" || object.kind === "doors")
  );
}

function createAreaPlaceablePlaceholderReasonCounts(): Record<
  AreaPlaceablePlaceholderReason,
  number
> {
  return Object.fromEntries(
    AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [reason, 0])
  ) as Record<AreaPlaceablePlaceholderReason, number>;
}

function createAreaPlaceablePlaceholderReasonIds(): Record<
  AreaPlaceablePlaceholderReason,
  string[]
> {
  return AREA_PLACEABLE_PLACEHOLDER_REASONS.reduce(
    (idsByReason, reason) => {
      idsByReason[reason] = [];
      return idsByReason;
    },
    {} as Record<AreaPlaceablePlaceholderReason, string[]>
  );
}

function resolveAreaObjectBackendRenderContractDiagnostics(
  visibleObjects: SceneObject[],
  placeableRenderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  modelLoadFailedObjectIds: ReadonlySet<string> = new Set(),
  sharedRendererRuntimeEvidenceByObjectId?: ReadonlyMap<
    string,
    {
      geometryStatus: string;
      placeholderReason: AreaPlaceablePlaceholderReason;
      modelUrl: string;
      modelCacheKey: string;
    }
  >
): {
  total: number;
  payloadReadyCount: number;
  modelUrlReadyCount: number;
  modelReadyCount: number;
  uniqueModelUrlCount: number;
  uniqueModelCacheKeyCount: number;
  modelUrlSample: string;
  modelCacheKeySample: string;
  blockedCount: number;
  primitiveFallbackCount: number;
  primitiveFallbackRenderLimit: number;
  primitiveFallbackSuppressedCount: number;
  status: "none" | "ready" | "partial" | "blocked";
  placeholderStatus: "none" | "ready" | "partial" | "blocked";
  blockedIds: string;
  missingPayloadIds: string;
  payloadMissingModelUrlIds: string;
  assetContractBlockedIds: string;
  modelLoadFailedIds: string;
  modelLoadFailedModelUrls: string;
  modelLoadFailedModelCacheKeys: string;
  stillLoadingIds: string;
  primitiveFallbackIds: string;
  placeholderReasonCounts: Record<AreaPlaceablePlaceholderReason, number>;
  placeholderReasonIds: Record<AreaPlaceablePlaceholderReason, string>;
} {
  const targets = visibleObjects.filter(isAreaObjectBackendRenderContractTarget);
  let payloadReadyCount = 0;
  let modelUrlReadyCount = 0;
  let modelReadyCount = 0;
  const modelUrls = new Set<string>();
  const modelCacheKeys = new Set<string>();
  const blockedIds: string[] = [];
  const missingPayloadIds: string[] = [];
  const primitiveFallbackIds: string[] = [];
  const modelLoadFailedModelUrls = new Set<string>();
  const modelLoadFailedModelCacheKeys = new Set<string>();
  const placeholderReasonCounts = createAreaPlaceablePlaceholderReasonCounts();
  const placeholderReasonIds = createAreaPlaceablePlaceholderReasonIds();

  targets.forEach((object) => {
    const payload = placeableRenderPayloadsByObjectId?.[object.id] ?? null;
    if (!payload) {
      const reason = resolveAreaPlaceablePlaceholderReason({
        sharedRendererTarget: true,
        payload: null
      });
      placeholderReasonCounts[reason] += 1;
      placeholderReasonIds[reason].push(object.id);
      blockedIds.push(object.id);
      missingPayloadIds.push(object.id);
      primitiveFallbackIds.push(object.id);
      return;
    }

    payloadReadyCount += 1;
    const renderState = resolvePlaceableRenderContractState(payload);
    let reason = resolveAreaPlaceablePlaceholderReason({
      sharedRendererTarget: true,
      payload,
      renderState,
      modelLoadFailed: modelLoadFailedObjectIds.has(object.id)
    });
    const runtimeEvidence = sharedRendererRuntimeEvidenceByObjectId?.get(object.id) ?? null;
    if (
      runtimeEvidence &&
      renderState.modelUrl &&
      !renderState.fallbackToPrimitive &&
      !modelLoadFailedObjectIds.has(object.id)
    ) {
      if (runtimeEvidence.geometryStatus === "model-url-ready") {
        reason = "none";
      } else if (runtimeEvidence.geometryStatus === "model-load-failed") {
        reason = "model-load-failed";
      } else if (runtimeEvidence.geometryStatus === "still-loading") {
        reason = "still-loading";
      }
    }
    placeholderReasonCounts[reason] += 1;
    placeholderReasonIds[reason].push(object.id);
    if (reason === "model-load-failed") {
      const failedModelUrl = runtimeEvidence?.modelUrl || renderState.modelUrl || "";
      const failedModelCacheKey =
        runtimeEvidence?.modelCacheKey || renderState.modelCacheKey || "";
      if (failedModelUrl) {
        modelLoadFailedModelUrls.add(failedModelUrl);
      }
      if (failedModelCacheKey) {
        modelLoadFailedModelCacheKeys.add(failedModelCacheKey);
      }
    }
    if (reason === "not-applicable") {
      return;
    }
    if (renderState.modelUrl && !renderState.fallbackToPrimitive) {
      modelUrlReadyCount += 1;
      modelUrls.add(renderState.modelUrl);
      if (renderState.modelCacheKey) {
        modelCacheKeys.add(renderState.modelCacheKey);
      }
      if (reason === "none") {
        modelReadyCount += 1;
        return;
      }
    }

    blockedIds.push(object.id);
    if (reason !== "none") {
      primitiveFallbackIds.push(object.id);
    }
  });

  const total = targets.length;
  const blockedCount = blockedIds.length;
  const notApplicableCount = placeholderReasonCounts["not-applicable"];
  const status =
    total === 0
      ? "none"
      : blockedCount === 0 && modelUrlReadyCount + notApplicableCount === total
        ? "ready"
        : payloadReadyCount > 0 || modelUrlReadyCount > 0
          ? "partial"
          : "blocked";
  const placeholderNonReadyCount =
    placeholderReasonCounts["still-loading"] +
    placeholderReasonCounts["missing-payload"] +
    placeholderReasonCounts["payload-missing-model-url"] +
    placeholderReasonCounts["asset-contract-blocked"] +
    placeholderReasonCounts["model-load-failed"];
  const placeholderStatus =
    total === 0
      ? "none"
      : placeholderNonReadyCount === 0
        ? "ready"
        : placeholderNonReadyCount < total
          ? "partial"
          : "blocked";

  return {
    total,
    payloadReadyCount,
    modelUrlReadyCount,
    modelReadyCount,
    uniqueModelUrlCount: modelUrls.size,
    uniqueModelCacheKeyCount: modelCacheKeys.size,
    modelUrlSample: Array.from(modelUrls).slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT).join("|"),
    modelCacheKeySample: Array.from(modelCacheKeys).slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT).join("|"),
    blockedCount,
    primitiveFallbackCount: primitiveFallbackIds.length,
    primitiveFallbackRenderLimit: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
    primitiveFallbackSuppressedCount: Math.max(
      0,
      primitiveFallbackIds.length - AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT
    ),
    status,
    placeholderStatus,
    blockedIds: blockedIds.join("|"),
    missingPayloadIds: missingPayloadIds.join("|"),
    payloadMissingModelUrlIds: placeholderReasonIds["payload-missing-model-url"].join("|"),
    assetContractBlockedIds: placeholderReasonIds["asset-contract-blocked"].join("|"),
    modelLoadFailedIds: placeholderReasonIds["model-load-failed"].join("|"),
    modelLoadFailedModelUrls: Array.from(modelLoadFailedModelUrls).join("|"),
    modelLoadFailedModelCacheKeys: Array.from(modelLoadFailedModelCacheKeys).join("|"),
    stillLoadingIds: placeholderReasonIds["still-loading"].join("|"),
    primitiveFallbackIds: primitiveFallbackIds.join("|"),
    placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        placeholderReasonIds[reason].join("|")
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string>
  };
}

function splitAreaRuntimeIdList(value: string): string[] {
  return value
    .split("|")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function splitLimitedAreaRuntimeIdList(
  value: string,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string[] {
  return limitAreaRuntimeIdList(splitAreaRuntimeIdList(value), limit);
}

function joinLimitedAreaRuntimeIds(
  ids: string[],
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string {
  return limitAreaRuntimeIdList(ids, limit).join("|");
}

function limitAreaRuntimeIdString(
  value: string,
  limit = AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
): string {
  return splitLimitedAreaRuntimeIdList(value, limit).join("|");
}

function countAreaRuntimeIdList(value: string): number {
  return splitAreaRuntimeIdList(value).length;
}

function collectAreaObjectSharedRendererRuntimeEvidenceByObjectId(
  runtime: RuntimeState,
  visibleObjects: SceneObject[]
): Map<
  string,
  {
    geometryStatus: string;
    placeholderReason: AreaPlaceablePlaceholderReason;
    modelUrl: string;
    modelCacheKey: string;
  }
> {
  const evidenceByObjectId = new Map<
    string,
    {
      geometryStatus: string;
      placeholderReason: AreaPlaceablePlaceholderReason;
      modelUrl: string;
      modelCacheKey: string;
    }
  >();
  visibleObjects.forEach((object) => {
    const root = runtime.objectMeshById.get(object.id);
    const userData = root?.userData;
    if (
      userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
      "shared-placeables-renderer"
    ) {
      return;
    }
    const geometryStatus = userData.auroraAreaObjectSharedRendererGeometryStatus;
    const placeholderReason = userData.auroraAreaObjectSharedRendererPlaceholderReason;
    if (typeof geometryStatus !== "string" || typeof placeholderReason !== "string") {
      return;
    }
    evidenceByObjectId.set(object.id, {
      geometryStatus,
      placeholderReason: placeholderReason as AreaPlaceablePlaceholderReason,
      modelUrl:
        typeof userData.auroraAreaObjectSharedRendererModelUrl === "string"
          ? userData.auroraAreaObjectSharedRendererModelUrl
          : typeof userData.renderPackageModelUrl === "string"
            ? userData.renderPackageModelUrl
            : "",
      modelCacheKey:
        typeof userData.renderPackageModelCacheKey === "string"
          ? userData.renderPackageModelCacheKey
          : ""
    });
  });
  return evidenceByObjectId;
}

export function formatAreaSharedRendererIssueSummary(
  diagnostics: ReturnType<typeof resolveAreaObjectBackendRenderContractDiagnostics>,
  options: { payloadRequestsInFlight?: boolean } = {}
): string {
  const missingPayloadCount = countAreaRuntimeIdList(diagnostics.missingPayloadIds);
  return [
    `${diagnostics.primitiveFallbackCount}/${diagnostics.total} primitive fallback`,
    diagnostics.primitiveFallbackSuppressedCount > 0
      ? `render capped ${diagnostics.primitiveFallbackRenderLimit}, skipped ${diagnostics.primitiveFallbackSuppressedCount}`
      : "",
    missingPayloadCount > 0
      ? options.payloadRequestsInFlight
        ? `payloads pending/in flight ${missingPayloadCount}`
        : `missing payloads ${missingPayloadCount}`
      : ""
  ]
    .filter(Boolean)
    .join(" / ");
}

function readAreaRenderFrameMirrorLayer(
  layer: RuntimeState["objectLayer"]
): AreaRenderFrameMirrorLayerSnapshot {
  const mirror =
    typeof layer.userData.auroraAreaRenderFrameMirror === "string"
      ? layer.userData.auroraAreaRenderFrameMirror
      : null;
  const mirrorWidth = Number(layer.userData.auroraAreaRenderFrameMirrorWidth);
  return {
    mirror,
    mirrorWidth: Number.isFinite(mirrorWidth) ? roundAreaRuntimeNumber(mirrorWidth) : null,
    positionX: roundAreaRuntimeNumber(Number(layer.position.x)),
    scaleX: roundAreaRuntimeNumber(Number(layer.scale.x))
  };
}

function resolveAreaRenderFrameMirrorSnapshot(
  runtime: RuntimeState
): AreaRenderFrameMirrorSnapshot {
  const objectLayer = readAreaRenderFrameMirrorLayer(runtime.objectLayer);
  const boundsLayer = readAreaRenderFrameMirrorLayer(runtime.boundsLayer);
  const enabled =
    objectLayer.mirror === "coordinate-x" &&
    boundsLayer.mirror === "coordinate-x" &&
    objectLayer.mirrorWidth !== null &&
    boundsLayer.mirrorWidth !== null &&
    Math.abs(objectLayer.mirrorWidth - boundsLayer.mirrorWidth) <= 1e-6 &&
    objectLayer.positionX === objectLayer.mirrorWidth &&
    boundsLayer.positionX === boundsLayer.mirrorWidth &&
    objectLayer.scaleX < 0 &&
    boundsLayer.scaleX < 0;
  const disabled =
    objectLayer.mirror === null &&
    boundsLayer.mirror === null &&
    objectLayer.positionX === 0 &&
    boundsLayer.positionX === 0 &&
    objectLayer.scaleX === 1 &&
    boundsLayer.scaleX === 1;
  return {
    status: enabled ? "coordinate-x" : disabled ? "disabled" : "partial",
    enabled,
    objectLayer,
    boundsLayer
  };
}

export function resolveAreaRenderFrameMirrorSnapshotForTests(
  runtime: RuntimeState
): AreaRenderFrameMirrorSnapshot {
  return resolveAreaRenderFrameMirrorSnapshot(runtime);
}

function writeAreaSharedRendererRuntimeSnapshot(
  runtime: RuntimeState,
  diagnostics: ReturnType<typeof resolveAreaObjectBackendRenderContractDiagnostics>
): void {
  const existingSnapshot = readAreaSharedRendererRuntimeSnapshot(runtime);
  const modelBoundsSample = existingSnapshot?.modelBoundsSample ?? [];
  const visualTransformSample = existingSnapshot?.visualTransformSample ?? [];
  const objectVisualTransformSample = existingSnapshot?.objectVisualTransformSample ?? [];
  const objectVisualTransformRootCount = existingSnapshot?.objectVisualTransformRootCount ?? 0;
  const objectVisualTransformAppliedCount =
    existingSnapshot?.objectVisualTransformAppliedCount ?? 0;
  const objectVisualTransformAppliedIds =
    existingSnapshot?.objectVisualTransformAppliedIds ?? [];
  const areaRenderFrameMirror = resolveAreaRenderFrameMirrorSnapshot(runtime);
  const snapshot: AreaSharedRendererRuntimeSnapshot = {
    version: "aurora-areas-shared-renderer-runtime/v1",
    path: "shared-placeables-renderer",
    status: diagnostics.status,
    placeholderStatus: diagnostics.placeholderStatus,
    total: diagnostics.total,
    payloadBoundCount: diagnostics.payloadReadyCount,
    modelReadyCount: diagnostics.modelReadyCount,
    uniqueModelUrlCount: diagnostics.uniqueModelUrlCount,
    uniqueModelCacheKeyCount: diagnostics.uniqueModelCacheKeyCount,
    modelUrlSample: splitLimitedAreaRuntimeIdList(diagnostics.modelUrlSample),
    modelCacheKeySample: splitLimitedAreaRuntimeIdList(diagnostics.modelCacheKeySample),
    primitiveFallbackCount: diagnostics.primitiveFallbackCount,
    primitiveFallbackRenderLimit: diagnostics.primitiveFallbackRenderLimit,
    primitiveFallbackSuppressedCount: diagnostics.primitiveFallbackSuppressedCount,
    placeholderReasonCounts: diagnostics.placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        splitLimitedAreaRuntimeIdList(diagnostics.placeholderReasonIds[reason])
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string[]>,
    missingPayloadIds: splitLimitedAreaRuntimeIdList(diagnostics.missingPayloadIds),
    payloadMissingModelUrlIds: splitLimitedAreaRuntimeIdList(diagnostics.payloadMissingModelUrlIds),
    assetContractBlockedIds: splitLimitedAreaRuntimeIdList(diagnostics.assetContractBlockedIds),
    modelLoadFailedIds: splitLimitedAreaRuntimeIdList(diagnostics.modelLoadFailedIds),
    modelLoadFailedModelUrls: splitLimitedAreaRuntimeIdList(
      diagnostics.modelLoadFailedModelUrls
    ),
    modelLoadFailedModelCacheKeys: splitLimitedAreaRuntimeIdList(
      diagnostics.modelLoadFailedModelCacheKeys
    ),
    stillLoadingIds: splitLimitedAreaRuntimeIdList(diagnostics.stillLoadingIds),
    primitiveFallbackIds: splitLimitedAreaRuntimeIdList(diagnostics.primitiveFallbackIds),
    textureStatusCounts: {},
    texturePendingIds: [],
    textureIssueIds: [],
    textureMissingIds: [],
    textureFallbackIds: [],
    textureSkippedIds: [],
    toolsetPhysicalHiddenIds: [],
    toolsetPhysicalHiddenReasons: [],
    blockedIds: splitLimitedAreaRuntimeIdList(diagnostics.blockedIds),
    areaRenderFrameMirror,
    objectVisualTransformRootCount,
    objectVisualTransformAppliedCount,
    objectVisualTransformAppliedIds,
    objectVisualTransformSample,
    visualTransformSample,
    modelBoundsSample
  };
  runtime.container.dataset.areaObjectSharedRendererAreaRenderFrameMirror =
    JSON.stringify(areaRenderFrameMirror);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSample =
    JSON.stringify(modelBoundsSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSample =
    JSON.stringify(visualTransformSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSampleCount =
    String(visualTransformSample.length);
  runtime.container.dataset.areaObjectVisualTransformSample =
    JSON.stringify(objectVisualTransformSample);
  runtime.container.dataset.areaObjectVisualTransformSampleCount =
    String(objectVisualTransformSample.length);
  runtime.container.dataset.areaObjectVisualTransformRootCount =
    String(objectVisualTransformRootCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedCount =
    String(objectVisualTransformAppliedCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedIds =
    joinLimitedAreaRuntimeIds(objectVisualTransformAppliedIds);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSampleCount =
    String(modelBoundsSample.length);
  runtime.container.dataset.areaObjectSharedRendererSnapshot = JSON.stringify(snapshot);
  runtime.container.dispatchEvent(
    new CustomEvent<AreaSharedRendererRuntimeSnapshot>(AREA_SHARED_RENDERER_SNAPSHOT_EVENT, {
      detail: snapshot
    })
  );
}

function refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime: RuntimeState): void {
  const rawSnapshot = runtime.container.dataset.areaObjectSharedRendererSnapshot;
  if (!rawSnapshot) {
    return;
  }
  let snapshot: AreaSharedRendererRuntimeSnapshot | null = null;
  try {
    snapshot = JSON.parse(rawSnapshot) as AreaSharedRendererRuntimeSnapshot;
  } catch {
    return;
  }
  if (snapshot.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return;
  }

  const placeholderReasonIds = createAreaPlaceablePlaceholderReasonIds();
  const modelLoadFailedModelUrls = new Set<string>();
  const modelLoadFailedModelCacheKeys = new Set<string>();
  const textureStatusCounts: Record<string, number> = {};
  const texturePendingIds: string[] = [];
  const texturePartialIds: string[] = [];
  const textureMissingIds: string[] = [];
  const textureFallbackIds: string[] = [];
  const textureSkippedIds: string[] = [];
  const toolsetPhysicalHiddenIds: string[] = [];
  const toolsetPhysicalHiddenReasons: string[] = [];
  const objectVisualTransformSampleEntries: AreaSharedRendererVisualTransformSampleEntry[] = [];
  const objectVisualTransformAppliedIds: string[] = [];
  const visualTransformSampleEntries: AreaSharedRendererVisualTransformSampleEntry[] = [];
  const modelBoundsEntries: AreaSharedRendererModelBoundsSampleEntry[] = [];
  const refreshedObjectIds = new Set<string>();
  const sharedRendererRootSample: string[] = [];
  const sharedRendererRootEvaluationSample: string[] = [];
  let objectVisualTransformRootCount = 0;
  let objectVisualTransformAppliedCount = 0;
  let sharedRendererRootCount = 0;
  let sharedRendererRootWithChildrenCount = 0;
  let sharedRendererRootChildCount = 0;
  let sharedRendererRootMeshDescendantCount = 0;
  let sharedRendererBoundsCandidateCount = 0;
  runtime.objectMeshById.forEach((root, fallbackObjectId) => {
    objectVisualTransformRootCount += 1;
    const userData = root.userData;
    const objectId =
      typeof userData.objectId === "string" && userData.objectId.length > 0
        ? userData.objectId
        : fallbackObjectId;
    const objectKind = readAreaRuntimeUserDataString(userData, "objectKind");
    const sourceId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSourceId"
    );
    const templateId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectTemplateId"
    );
    const payloadStatus =
      readAreaRuntimeUserDataString(
        userData,
        "auroraAreaObjectSharedRendererPayloadStatus"
      ) || readAreaRuntimeUserDataString(userData, "auroraAreaObjectPayloadStatus");
    const geometryStatus =
      readAreaRuntimeUserDataString(
        userData,
        "auroraAreaObjectSharedRendererGeometryStatus"
      ) || (root.children.length > 0 ? "object-root" : "empty-root");
    const rawPlaceholderReason = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSharedRendererPlaceholderReason"
    );
    const rendererPath =
      userData.auroraAreaObjectSharedRendererRuntimeMarker ===
      "shared-placeables-renderer"
        ? "shared-placeables-renderer"
        : "object-layer";
    const visualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectVisualTransform"
    );
    const effectiveVisualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectEffectiveVisualTransform"
    );
    const visualTransformApplied =
      userData.auroraAreaObjectVisualTransformApplied === true;
    if (visualTransformApplied) {
      objectVisualTransformAppliedCount += 1;
      objectVisualTransformAppliedIds.push(objectId);
    }
    if (
      objectVisualTransformSampleEntries.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT &&
      (visualTransformApplied ||
        visualTransform.trim().length > 0 ||
        effectiveVisualTransform.trim().length > 0)
    ) {
      objectVisualTransformSampleEntries.push({
        objectId,
        objectKind,
        rendererPath,
        sourceId,
        templateId,
        payloadStatus,
        geometryStatus,
        placeholderReason:
          rawPlaceholderReason.trim().length > 0
            ? rawPlaceholderReason
            : rendererPath,
        visualTransform,
        effectiveVisualTransform,
        visualTransformApplied,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        renderTransform: readAreaRuntimeRenderTransformEvidence(userData)
      });
    }
  });
  runtime.objectMeshById.forEach((root, fallbackObjectId) => {
    const userData = root.userData;
    if (
      userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
      "shared-placeables-renderer"
    ) {
      return;
    }
    sharedRendererRootCount += 1;
    if (root.children.length > 0) {
      sharedRendererRootWithChildrenCount += 1;
    }
    sharedRendererRootChildCount += root.children.length;
    let rootMeshDescendantCount = 0;
    root.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        sharedRendererRootMeshDescendantCount += 1;
        rootMeshDescendantCount += 1;
      }
    });
    const objectId =
      typeof userData.objectId === "string" && userData.objectId.length > 0
        ? userData.objectId
        : fallbackObjectId;
    const modelUrl =
      typeof userData.auroraAreaObjectSharedRendererModelUrl === "string"
        ? userData.auroraAreaObjectSharedRendererModelUrl
        : typeof userData.renderPackageModelUrl === "string"
          ? userData.renderPackageModelUrl
          : "";
    const modelCacheKey =
      typeof userData.renderPackageModelCacheKey === "string"
        ? userData.renderPackageModelCacheKey
        : "";
    const rawReason = userData.auroraAreaObjectSharedRendererPlaceholderReason;
    let reason = AREA_PLACEABLE_PLACEHOLDER_REASONS.includes(
      rawReason as AreaPlaceablePlaceholderReason
    )
      ? (rawReason as AreaPlaceablePlaceholderReason)
      : "not-applicable";
    if (sharedRendererRootSample.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      const modelLabel = modelUrl.split(/[\\/]/u).pop()?.slice(0, 64) ?? "";
      sharedRendererRootSample.push(
        [
          `id=${objectId}`,
          `kind=${typeof userData.objectKind === "string" ? userData.objectKind : ""}`,
          `type=${root.type}`,
          `reason=${reason}`,
          `geometry=${typeof userData.auroraAreaObjectSharedRendererGeometryStatus === "string" ? userData.auroraAreaObjectSharedRendererGeometryStatus : ""}`,
          `children=${root.children.length}`,
          `meshes=${rootMeshDescendantCount}`,
          `model=${modelLabel}`
        ].join(",")
      );
    }
    refreshedObjectIds.add(objectId);
    let textureStatus =
      typeof userData.auroraAreaObjectSharedRendererTextureStatus === "string" &&
      userData.auroraAreaObjectSharedRendererTextureStatus.trim().length > 0
        ? userData.auroraAreaObjectSharedRendererTextureStatus.trim()
        : "unknown";
    const modelBounds =
      typeof userData.auroraAreaObjectSharedRendererModelBounds === "string"
        ? userData.auroraAreaObjectSharedRendererModelBounds
        : "";
    const modelMaxAxis = Number(
      userData.auroraAreaObjectSharedRendererModelMaxAxis
    );
    const modelMeshCount = Number(
      userData.auroraAreaObjectSharedRendererModelMeshCount
    );
    const hasModelBoundsEvidence =
      modelBounds.trim().length > 0 ||
      (Number.isFinite(modelMaxAxis) && modelMaxAxis > 0) ||
      (Number.isFinite(modelMeshCount) && modelMeshCount > 0);
    const toolsetPhysicalVisibility =
      resolveAreaRuntimeToolsetPhysicalVisibility(root);
    if (toolsetPhysicalVisibility.hidden) {
      toolsetPhysicalHiddenIds.push(objectId);
      toolsetPhysicalHiddenReasons.push(
        [
          `id=${objectId}`,
          `reason=${toolsetPhysicalVisibility.reason}`,
          `source=${toolsetPhysicalVisibility.source}`
        ].join(",")
      );
    }
    root.updateWorldMatrix(true, true);
    const rawWorldBounds = new THREE.Box3().setFromObject(root);
    const visibleWorldBounds = resolveAreaRuntimeVisibleWorldBounds(root);
    const worldBounds =
      root.visible && !visibleWorldBounds.isEmpty()
        ? visibleWorldBounds
        : root.visible && !toolsetPhysicalVisibility.hidden
          ? rawWorldBounds
          : new THREE.Box3();
    const hasRenderableWorldBounds = !worldBounds.isEmpty();
    if (hasModelBoundsEvidence || hasRenderableWorldBounds) {
      sharedRendererBoundsCandidateCount += 1;
    }
    const rawReasonLabel = reason;
    if (reason === "still-loading" && hasRenderableWorldBounds) {
      reason = "none";
    }
    if (sharedRendererRootEvaluationSample.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      sharedRendererRootEvaluationSample.push(
        [
          `id=${objectId}`,
          `raw=${rawReasonLabel}`,
          `final=${reason}`,
          `children=${root.children.length}`,
          `meshes=${rootMeshDescendantCount}`,
          `toolsetPhysical=${toolsetPhysicalVisibility.hidden ? "hidden" : "visible"}`,
          `hasModelBounds=${hasModelBoundsEvidence ? "true" : "false"}`,
          `hasWorldBounds=${hasRenderableWorldBounds ? "true" : "false"}`
        ].join(",")
      );
    }
    placeholderReasonIds[reason].push(objectId);
    const sourceId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSourceId"
    );
    const templateId = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectTemplateId"
    );
    const payloadStatus = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectPayloadStatus"
    );
    const geometryStatus = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectSharedRendererGeometryStatus"
    );
    const visualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectVisualTransform"
    );
    const effectiveVisualTransform = readAreaRuntimeUserDataString(
      userData,
      "auroraAreaObjectEffectiveVisualTransform"
    );
    const renderTransform = readAreaRuntimeRenderTransformEvidence(userData);
    if (visualTransformSampleEntries.length < AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT) {
      visualTransformSampleEntries.push({
        objectId,
        objectKind: readAreaRuntimeUserDataString(userData, "objectKind"),
        rendererPath: "shared-placeables-renderer",
        sourceId,
        templateId,
        payloadStatus,
        geometryStatus,
        placeholderReason: reason,
        visualTransform,
        effectiveVisualTransform,
        visualTransformApplied:
          userData.auroraAreaObjectVisualTransformApplied === true,
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        renderTransform
      });
    }
    if (
      hasRenderableWorldBounds &&
      (reason === "none" || hasModelBoundsEvidence || snapshot.status === "ready")
    ) {
      const worldSize = new THREE.Vector3();
      worldBounds.getSize(worldSize);
      const worldMaxAxis = Math.max(
        Math.abs(worldSize.x),
        Math.abs(worldSize.y),
        Math.abs(worldSize.z)
      );
      const screenProjection = resolveAreaRuntimeScreenProjection(runtime, worldBounds);
      const effectivelyVisible = isAreaRuntimeObjectEffectivelyVisible(root);
      const materialEvidence = collectAreaSharedRendererMaterialEvidence(root);
      // Source-MDL emitter groups do not use the static-model texture loader's
      // root status marker. Their generated materials are nevertheless settled
      // once concrete texture maps are bound, so do not leave Area proof stuck
      // on `unknown` after both flame and smoke maps are present.
      if (
        (textureStatus === "loading" || textureStatus === "unknown") &&
        materialEvidence.mapReferences.length > 0
      ) {
        textureStatus = "applied";
      }
      textureStatusCounts[textureStatus] = (textureStatusCounts[textureStatus] ?? 0) + 1;
      modelBoundsEntries.push({
        objectId,
        sourceId,
        templateId,
        sourceAppearanceType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectSourceAppearanceType"
        ),
        sourceGenericType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectSourceGenericType"
        ),
        payloadAppearanceType: readAreaRuntimeUserDataOptionalNumber(
          userData,
          "auroraAreaObjectPayloadAppearanceType"
        ),
        payloadModelResRef: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadModelResRef"
        ),
        payloadModelGlbUrl: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadModelGlbUrl"
        ),
        payloadStatus: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaObjectPayloadStatus"
        ),
        modelUrl,
        modelCacheKey,
        bounds: modelBounds,
        maxAxis: Number.isFinite(modelMaxAxis) ? Number(modelMaxAxis.toFixed(6)) : 0,
        worldBounds: formatAreaRuntimeBounds(worldBounds),
        worldSize: formatAreaRuntimeVector(worldSize),
        worldMaxAxis: roundAreaRuntimeNumber(worldMaxAxis),
        screenBounds: {
          minX: screenProjection.minX,
          minY: screenProjection.minY,
          maxX: screenProjection.maxX,
          maxY: screenProjection.maxY,
          width: screenProjection.width,
          height: screenProjection.height
        },
        screenCenter: screenProjection.center,
        screenVisible: screenProjection.visible && effectivelyVisible,
        sourcePlacement: {
          x: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceX"),
          y: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceY"),
          z: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectSourceZ"),
          bearing: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectSourceBearing"
          ),
          bearingDegrees: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectSourceBearingDegrees"
          )
        },
        renderAnchorVector: {
          x: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorX"),
          y: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorY"),
          z: readAreaRuntimeUserDataNumber(userData, "auroraAreaObjectRenderAnchorZ")
        },
        rootPosition: formatAreaRuntimeVector(root.position),
        rootRotation: formatAreaRuntimeVector(root.rotation),
        rootScale: formatAreaRuntimeVector(root.scale),
        layering: {
          mode: readAreaRuntimeUserDataString(userData, "auroraAreaObjectLayering"),
          reason: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectLayeringReason"
          ),
          footprint: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayeringFootprint"
          ),
          thickness: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayeringThickness"
          ),
          renderOrder: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectLayerRenderOrder"
          ),
          identity: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectLayeringIdentity"
          )
        },
        renderTransform,
        modelSurface: {
          offset: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOffset"
          ),
          rawOffset: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceRawOffset"
          ),
          anchorY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAnchorY"
          ),
          parentScaleY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceParentScaleY"
          ),
          targetMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceTargetMinY"
          ),
          beforeBounds: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceBeforeBounds"
          ),
          beforeSize: {
            x: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeX"
            ),
            y: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeY"
            ),
            z: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceBeforeSizeZ"
            )
          },
          afterBounds: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceAfterBounds"
          ),
          afterSize: {
            x: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeX"
            ),
            y: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeY"
            ),
            z: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceAfterSizeZ"
            )
          },
          beforeMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceBeforeMinY"
          ),
          beforeMaxY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceBeforeMaxY"
          ),
          afterMinY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAfterMinY"
          ),
          afterMaxY: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceAfterMaxY"
          ),
          liftTarget:
            typeof userData.auroraAreaObjectModelSurfaceLiftTarget === "string"
              ? userData.auroraAreaObjectModelSurfaceLiftTarget
              : "",
          terrainSurface: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceStatus"
            ),
            surfaceY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceY"
            ),
            worldX: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceWorldX"
            ),
            worldZ: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceWorldZ"
            ),
            rayOriginY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceRayOriginY"
            ),
            rayFar: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceRayFar"
            ),
            hitCount: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceHitCount"
            ),
            candidateMeshCount: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceCandidateMeshCount"
            ),
            meshName: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceMeshName"
            ),
            tileId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceTileId"
            ),
            modelResRef: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectModelSurfaceTerrainSurfaceModelResRef"
            )
          },
          terrainClip: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipStatus"
            ),
            applied: userData.auroraAreaObjectTerrainSurfaceClipApplied === true,
            reason: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipReason"
            ),
            terrainSurfaceStatus: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipTerrainSurfaceStatus"
            ),
            footprint: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipFootprint"
            ),
            height: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipHeight"
            ),
            maxFootprint: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipMaxFootprint"
            ),
            minHeight: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectTerrainSurfaceClipMinHeight"
            ),
            source: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectTerrainSurfaceClipSource"
            )
          },
          supportSurface: createEmptyAreaSupportSurfaceEvidence("pending"),
          supportCorrection: {
            status: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionStatus"
            ),
            applied:
              userData.auroraAreaObjectSupportCorrectionApplied === true,
            offsetY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOffsetY"
            ),
            objectBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionObjectBottomY"
            ),
            objectTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionObjectTopY"
            ),
            afterBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionAfterBottomY"
            ),
            afterTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionAfterTopY"
            ),
            supportObjectId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportObjectId"
            ),
            supportSourceId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportSourceId"
            ),
            supportTemplateId: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportTemplateId"
            ),
            supportModelResRef: readAreaRuntimeUserDataString(
              userData,
              "auroraAreaObjectSupportCorrectionSupportModelResRef"
            ),
            supportTopY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionSupportTopY"
            ),
            supportBottomY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionSupportBottomY"
            ),
            gapY: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionGapY"
            ),
            overlapX: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapX"
            ),
            overlapZ: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapZ"
            ),
            overlapArea: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapArea"
            ),
            overlapRatio: readAreaRuntimeUserDataNumber(
              userData,
              "auroraAreaObjectSupportCorrectionOverlapRatio"
            )
          },
          overlayReason: readAreaRuntimeUserDataString(
            userData,
            "auroraAreaObjectModelSurfaceOverlayReason"
          ),
          overlayFootprint: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayFootprint"
          ),
          overlayThickness: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayThickness"
          ),
          overlayRenderOrder: readAreaRuntimeUserDataNumber(
            userData,
            "auroraAreaObjectModelSurfaceOverlayRenderOrder"
          ),
          clamped: userData.auroraAreaObjectModelSurfaceOffsetClamped === true
        },
        renderPosition:
          typeof userData.auroraAreaObjectPosition === "string"
            ? userData.auroraAreaObjectPosition
            : "",
        renderAnchor:
          typeof userData.auroraAreaObjectRenderAnchor === "string"
            ? userData.auroraAreaObjectRenderAnchor
            : "",
        bearing:
          typeof userData.auroraAreaObjectBearing === "string"
            ? userData.auroraAreaObjectBearing
            : "",
        visualTransform:
          typeof userData.auroraAreaObjectVisualTransform === "string"
            ? userData.auroraAreaObjectVisualTransform
            : "",
        visualTransformApplied: userData.auroraAreaObjectVisualTransformApplied === true,
        inactiveDamageStateMeshSuppressionStatus: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressionStatus"
        ),
        inactiveDamageStateMeshSuppressedCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressedCount"
        ),
        inactiveDamageStateMeshSuppressedNames: readAreaRuntimeUserDataString(
          userData,
          "auroraAreaInactiveDamageStateMeshSuppressedNames"
        ),
        meshCount: Number.isFinite(modelMeshCount) ? Math.max(0, Math.floor(modelMeshCount)) : 0,
        textureStatus,
        textureReferencedMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureReferencedMaterialCount"
        ),
        textureMappedMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureMappedMaterialCount"
        ),
        textureMissingMapMaterialCount: readAreaRuntimeUserDataNumber(
          userData,
          "auroraAreaObjectSharedRendererTextureMissingMapMaterialCount"
        ),
        textureAvailableReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureAvailableReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureAvailableReferences
            : ""
        ),
        textureRequestedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureRequestedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureRequestedReferences
            : ""
        ),
        textureLoadedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureLoadedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureLoadedReferences
            : ""
        ),
        textureFailedReferences: splitLimitedAreaRuntimeIdList(
          typeof userData.auroraAreaObjectSharedRendererTextureFailedReferences === "string"
            ? userData.auroraAreaObjectSharedRendererTextureFailedReferences
            : ""
        ),
        materialTextureReferences: materialEvidence.textureReferences,
        materialMapReferences: materialEvidence.mapReferences,
        materialFlags: materialEvidence.flags,
        materialOpacityRange: materialEvidence.opacityRange,
        materialSamples: materialEvidence.materialSamples,
        diagnosticPriority: materialEvidence.diagnosticPriority
      });
      if (textureStatus === "loading") {
        texturePendingIds.push(objectId);
      } else if (textureStatus === "missing") {
        textureMissingIds.push(objectId);
      } else if (textureStatus === "fallback") {
        textureFallbackIds.push(objectId);
      } else if (textureStatus === "skipped") {
        textureSkippedIds.push(objectId);
      } else if (textureStatus === "partial") {
        texturePartialIds.push(objectId);
      }
    }
    if (reason === "model-load-failed") {
      if (modelUrl) {
        modelLoadFailedModelUrls.add(modelUrl);
      }
      if (modelCacheKey) {
        modelLoadFailedModelCacheKeys.add(modelCacheKey);
      }
    }
  });
  (snapshot.placeholderReasonIds["not-applicable"] ?? []).forEach((objectId) => {
    if (!refreshedObjectIds.has(objectId)) {
      placeholderReasonIds["not-applicable"].push(objectId);
    }
  });

  const placeholderReasonCounts = Object.fromEntries(
    AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
      reason,
      placeholderReasonIds[reason].length
    ])
  ) as Record<AreaPlaceablePlaceholderReason, number>;
  const missingPayloadIds = placeholderReasonIds["missing-payload"];
  const payloadMissingModelUrlIds = placeholderReasonIds["payload-missing-model-url"];
  const assetContractBlockedIds = placeholderReasonIds["asset-contract-blocked"];
  const modelLoadFailedIds = placeholderReasonIds["model-load-failed"];
  const stillLoadingIds = placeholderReasonIds["still-loading"];
  const primitiveFallbackIds = AREA_PLACEABLE_PLACEHOLDER_REASONS.flatMap((reason) =>
    reason === "none" || reason === "not-applicable" ? [] : placeholderReasonIds[reason]
  );
  const textureIssueIds = [
    ...texturePartialIds,
    ...textureMissingIds,
    ...textureFallbackIds,
    ...textureSkippedIds
  ];
  const blockedIds = [
    ...primitiveFallbackIds,
    ...texturePendingIds,
    ...textureIssueIds
  ];
  const modelReadyCount = placeholderReasonIds.none.length;
  const notApplicableCount = placeholderReasonIds["not-applicable"].length;
  const readyOrNotRenderableCount = modelReadyCount + notApplicableCount;
  const total = Math.max(0, snapshot.total);
  const payloadBoundCount = Math.max(0, snapshot.payloadBoundCount);
  const primitiveFallbackCount = primitiveFallbackIds.length;
  const status =
    total === 0
      ? "none"
      : primitiveFallbackCount === 0 &&
          texturePendingIds.length === 0 &&
          textureIssueIds.length === 0 &&
          payloadBoundCount >= total &&
          readyOrNotRenderableCount >= total
        ? "ready"
        : payloadBoundCount > 0 || readyOrNotRenderableCount > 0
          ? "partial"
          : "blocked";
  const placeholderStatus =
    total === 0
      ? "none"
      : primitiveFallbackCount === 0
        ? "ready"
        : primitiveFallbackCount < total
          ? "partial"
          : "blocked";
  refreshAreaSharedRendererSupportSurfaceEvidence(modelBoundsEntries);
  const modelBoundsSample = modelBoundsEntries
    .sort(
      (left, right) =>
        right.worldMaxAxis - left.worldMaxAxis ||
        right.maxAxis - left.maxAxis ||
        right.diagnosticPriority - left.diagnosticPriority
    )
    .slice(0, AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT);
  const areaRenderFrameMirror = resolveAreaRenderFrameMirrorSnapshot(runtime);
  const refreshedSnapshot: AreaSharedRendererRuntimeSnapshot = {
    ...snapshot,
    status,
    placeholderStatus,
    modelReadyCount,
    primitiveFallbackCount,
    primitiveFallbackSuppressedCount: Math.max(
      0,
      primitiveFallbackCount - snapshot.primitiveFallbackRenderLimit
    ),
    placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        limitAreaRuntimeIdList(placeholderReasonIds[reason])
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string[]>,
    missingPayloadIds: limitAreaRuntimeIdList(missingPayloadIds),
    payloadMissingModelUrlIds: limitAreaRuntimeIdList(payloadMissingModelUrlIds),
    assetContractBlockedIds: limitAreaRuntimeIdList(assetContractBlockedIds),
    modelLoadFailedIds: limitAreaRuntimeIdList(modelLoadFailedIds),
    modelLoadFailedModelUrls: limitAreaRuntimeIdList(
      Array.from(modelLoadFailedModelUrls)
    ),
    modelLoadFailedModelCacheKeys: limitAreaRuntimeIdList(
      Array.from(modelLoadFailedModelCacheKeys)
    ),
    stillLoadingIds: limitAreaRuntimeIdList(stillLoadingIds),
    primitiveFallbackIds: limitAreaRuntimeIdList(primitiveFallbackIds),
    textureStatusCounts,
    texturePendingIds: limitAreaRuntimeIdList(texturePendingIds),
    textureIssueIds: limitAreaRuntimeIdList(textureIssueIds),
    textureMissingIds: limitAreaRuntimeIdList(textureMissingIds),
    textureFallbackIds: limitAreaRuntimeIdList(textureFallbackIds),
    textureSkippedIds: limitAreaRuntimeIdList(textureSkippedIds),
    toolsetPhysicalHiddenIds: limitAreaRuntimeIdList(toolsetPhysicalHiddenIds),
    toolsetPhysicalHiddenReasons: limitAreaRuntimeIdList(toolsetPhysicalHiddenReasons),
    blockedIds: limitAreaRuntimeIdList(blockedIds),
    areaRenderFrameMirror,
    objectVisualTransformRootCount,
    objectVisualTransformAppliedCount,
    objectVisualTransformAppliedIds: limitAreaRuntimeIdList(objectVisualTransformAppliedIds),
    objectVisualTransformSample: objectVisualTransformSampleEntries,
    visualTransformSample: visualTransformSampleEntries,
    modelBoundsSample
  };

  runtime.container.dataset.areaObjectSharedRendererModelReadyCount =
    String(modelReadyCount);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackCount =
    String(primitiveFallbackCount);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount =
    String(refreshedSnapshot.primitiveFallbackSuppressedCount);
  runtime.container.dataset.areaObjectSharedRendererMissingPayloadIds =
    joinLimitedAreaRuntimeIds(missingPayloadIds);
  runtime.container.dataset.areaObjectSharedRendererPayloadMissingModelUrlIds =
    joinLimitedAreaRuntimeIds(payloadMissingModelUrlIds);
  runtime.container.dataset.areaObjectSharedRendererAssetContractBlockedIds =
    joinLimitedAreaRuntimeIds(assetContractBlockedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedIds =
    joinLimitedAreaRuntimeIds(modelLoadFailedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelUrls =
    joinLimitedAreaRuntimeIds(Array.from(modelLoadFailedModelUrls));
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelCacheKeys =
    joinLimitedAreaRuntimeIds(Array.from(modelLoadFailedModelCacheKeys));
  runtime.container.dataset.areaObjectSharedRendererStillLoadingIds =
    joinLimitedAreaRuntimeIds(stillLoadingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureStatusCounts =
    JSON.stringify(textureStatusCounts);
  runtime.container.dataset.areaObjectSharedRendererTexturePendingIds =
    joinLimitedAreaRuntimeIds(texturePendingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureIssueIds =
    joinLimitedAreaRuntimeIds(textureIssueIds);
  runtime.container.dataset.areaObjectSharedRendererTextureMissingIds =
    joinLimitedAreaRuntimeIds(textureMissingIds);
  runtime.container.dataset.areaObjectSharedRendererTextureFallbackIds =
    joinLimitedAreaRuntimeIds(textureFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererTextureSkippedIds =
    joinLimitedAreaRuntimeIds(textureSkippedIds);
  runtime.container.dataset.areaObjectToolsetPhysicalHiddenIds =
    joinLimitedAreaRuntimeIds(toolsetPhysicalHiddenIds);
  runtime.container.dataset.areaObjectToolsetPhysicalHiddenReasons =
    joinLimitedAreaRuntimeIds(toolsetPhysicalHiddenReasons);
  runtime.container.dataset.areaObjectSharedRendererAreaRenderFrameMirror =
    JSON.stringify(areaRenderFrameMirror);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSample =
    JSON.stringify(modelBoundsSample);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSample =
    JSON.stringify(visualTransformSampleEntries);
  runtime.container.dataset.areaObjectSharedRendererVisualTransformSampleCount =
    String(visualTransformSampleEntries.length);
  runtime.container.dataset.areaObjectVisualTransformSample =
    JSON.stringify(objectVisualTransformSampleEntries);
  runtime.container.dataset.areaObjectVisualTransformSampleCount =
    String(objectVisualTransformSampleEntries.length);
  runtime.container.dataset.areaObjectVisualTransformRootCount =
    String(objectVisualTransformRootCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedCount =
    String(objectVisualTransformAppliedCount);
  runtime.container.dataset.areaObjectVisualTransformAppliedIds =
    joinLimitedAreaRuntimeIds(objectVisualTransformAppliedIds);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootCount =
    String(sharedRendererRootCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootWithChildrenCount =
    String(sharedRendererRootWithChildrenCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootChildCount =
    String(sharedRendererRootChildCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootMeshDescendantCount =
    String(sharedRendererRootMeshDescendantCount);
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootSample =
    sharedRendererRootSample.join("|");
  runtime.container.dataset.areaObjectSharedRendererRuntimeRootEvaluationSample =
    sharedRendererRootEvaluationSample.join("|");
  runtime.container.dataset.areaObjectSharedRendererModelBoundsEntryCount =
    String(modelBoundsEntries.length);
  runtime.container.dataset.areaObjectSharedRendererModelBoundsSampleCount =
    String(modelBoundsSample.length);
  runtime.container.dataset.areaObjectSharedRendererBoundsCandidateCount =
    String(sharedRendererBoundsCandidateCount);
  runtime.container.dataset.areaObjectBackendRenderBlockedCount =
    String(blockedIds.length);
  runtime.container.dataset.areaObjectBackendRenderBlockedIds =
    joinLimitedAreaRuntimeIds(blockedIds);
  runtime.container.dataset.areaObjectPrimitiveFallbackIds =
    joinLimitedAreaRuntimeIds(primitiveFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererStatus = status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderStatus = placeholderStatus;
  runtime.container.dataset.areaObjectBackendRenderContractStatus = status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonCounts =
    JSON.stringify(placeholderReasonCounts);
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonIds =
    JSON.stringify(
      Object.fromEntries(
        AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
          reason,
          joinLimitedAreaRuntimeIds(placeholderReasonIds[reason])
        ])
      )
    );
  runtime.container.dataset.areaObjectSharedRendererSnapshot = JSON.stringify(
    refreshedSnapshot
  );
  runtime.container.dispatchEvent(
    new CustomEvent<AreaSharedRendererRuntimeSnapshot>(AREA_SHARED_RENDERER_SNAPSHOT_EVENT, {
      detail: refreshedSnapshot
    })
  );
}

function scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(
  runtime: RuntimeState
): void {
  const refreshIfMounted = () => {
    if (!runtime.container.isConnected) {
      return;
    }
    safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  };
  if (typeof window === "undefined") {
    refreshIfMounted();
    return;
  }
  if (typeof window.requestAnimationFrame === "function") {
    window.requestAnimationFrame(() => {
      refreshIfMounted();
      window.setTimeout(refreshIfMounted, 250);
    });
    return;
  }
  window.setTimeout(refreshIfMounted, 0);
}

function safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(
  runtime: RuntimeState
): void {
  try {
    delete runtime.container.dataset.areaObjectSharedRendererRefreshError;
    refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  } catch (error) {
    runtime.container.dataset.areaObjectSharedRendererRefreshError =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  }
}

export function refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidenceForTests(
  runtime: RuntimeState
): void {
  refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
}

function writeAreaTileOverlayRuntimeDiagnostics(
  runtime: RuntimeState,
  options: { optionEnabled: boolean; renderLayerVisible: boolean }
): void {
  const dataset = runtime.container.dataset;
  const overlayChild = runtime.tileOverlayLayer.children[0] ?? null;
  const overlayLines = overlayChild instanceof THREE.LineSegments ? overlayChild : null;
  const overlayMaterial = Array.isArray(overlayLines?.material)
    ? overlayLines?.material[0]
    : overlayLines?.material;
  const lineMaterial =
    overlayMaterial instanceof THREE.LineBasicMaterial ? overlayMaterial : null;
  const positionAttribute = overlayLines?.geometry.getAttribute("position");
  const vertexCount = positionAttribute?.count ?? 0;

  dataset.areaTileOverlayOptionEnabled = String(options.optionEnabled);
  dataset.areaTileOverlayRenderLayerVisible = String(options.renderLayerVisible);
  dataset.areaTileOverlayGroupVisible = String(runtime.tileOverlayLayer.visible);
  dataset.areaTileOverlayChildCount = String(runtime.tileOverlayLayer.children.length);
  dataset.areaTileOverlayLineCount = String(Math.floor(vertexCount / 2));
  dataset.areaTileOverlayVertexCount = String(vertexCount);
  dataset.areaTileOverlayRenderOrder = String(overlayLines?.renderOrder ?? "none");
  dataset.areaTileOverlayDepthTest = String(lineMaterial?.depthTest ?? "none");
  dataset.areaTileOverlayDepthWrite = String(lineMaterial?.depthWrite ?? "none");
  dataset.areaTileOverlayOpacity = String(lineMaterial?.opacity ?? "none");
  dataset.areaTileOverlayColor = lineMaterial
    ? `#${lineMaterial.color.getHexString()}`
    : "none";
  dataset.areaTileOverlayPosition = overlayLines
    ? `${overlayLines.position.x.toFixed(3)},${overlayLines.position.y.toFixed(3)},${overlayLines.position.z.toFixed(3)}`
    : "none";
}

function setAreaOracleTileLightMarkersVisible(
  runtime: RuntimeState,
  visible: boolean
): number {
  let markerCount = 0;
  runtime.scene.traverse((node) => {
    if (node.userData?.auroraTerrainTileLightMarker === true) {
      node.visible = visible;
      markerCount += 1;
    }
  });
  runtime.container.dataset.areaOracleTileLightMarkersVisible = String(visible);
  runtime.container.dataset.areaOracleTileLightMarkerCount = String(markerCount);
  return markerCount;
}

function setAreaOracleTileLightsVisible(
  runtime: RuntimeState,
  visible: boolean
): { found: boolean; childCount: number } {
  const lightLayer = runtime.scene.getObjectByName("terrain-tile-light-sources");
  if (!lightLayer) {
    runtime.container.dataset.areaOracleTileLightsVisible = String(visible);
    runtime.container.dataset.areaOracleTileLightLayerFound = "false";
    runtime.container.dataset.areaOracleTileLightLayerChildCount = "0";
    return { found: false, childCount: 0 };
  }
  lightLayer.visible = visible;
  runtime.container.dataset.areaOracleTileLightsVisible = String(visible);
  runtime.container.dataset.areaOracleTileLightLayerFound = "true";
  runtime.container.dataset.areaOracleTileLightLayerChildCount = String(
    lightLayer.children.length
  );
  return { found: true, childCount: lightLayer.children.length };
}

function normalizeAreaOracleTerrainVoidMaskFilterToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function readAreaOracleTerrainVoidMaskSourceMesh(node: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    const userData = current.userData as Record<string, unknown> | undefined;
    const aurora =
      userData?.aurora && typeof userData.aurora === "object" && !Array.isArray(userData.aurora)
        ? (userData.aurora as Record<string, unknown>)
        : userData;
    const sourceMesh = normalizeAreaOracleTerrainVoidMaskFilterToken(aurora?.sourceMesh);
    if (sourceMesh) {
      return sourceMesh;
    }
    current = current.parent;
  }
  return normalizeAreaOracleTerrainVoidMaskFilterToken(node.name);
}

function readAreaOracleTerrainVoidMaskModelResRef(node: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = node;
  while (current) {
    const modelResRef = normalizeAreaOracleTerrainVoidMaskFilterToken(
      current.userData?.auroraTerrainTileModelResRef
    );
    if (modelResRef) {
      return modelResRef;
    }
    current = current.parent;
  }
  return null;
}

function setAreaOracleTerrainVoidMasksVisible(
  runtime: RuntimeState,
  visible: boolean,
  filter: { modelResRef?: string | null; sourceMesh?: string | null } = {}
): number {
  const modelResRefFilter = normalizeAreaOracleTerrainVoidMaskFilterToken(
    filter.modelResRef
  );
  const sourceMeshFilter = normalizeAreaOracleTerrainVoidMaskFilterToken(
    filter.sourceMesh
  );
  let maskCount = 0;
  let matchedCount = 0;
  runtime.scene.traverse((node) => {
    if (node.userData?.auroraTerrainVoidMask !== true) {
      return;
    }
    maskCount += 1;
    const modelResRef = readAreaOracleTerrainVoidMaskModelResRef(node);
    const sourceMesh = readAreaOracleTerrainVoidMaskSourceMesh(node);
    const matchesModel =
      !modelResRefFilter || modelResRef === modelResRefFilter;
    const matchesSource = !sourceMeshFilter || sourceMesh === sourceMeshFilter;
    if (!matchesModel || !matchesSource) {
      return;
    }
    node.visible = visible;
    node.userData = {
      ...node.userData,
      auroraTerrainVoidMaskCaptureVisibility: visible ? "visible" : "hidden"
    };
    matchedCount += 1;
  });
  runtime.container.dataset.areaOracleTerrainVoidMasksVisible = String(visible);
  runtime.container.dataset.areaOracleTerrainVoidMaskCount = String(maskCount);
  runtime.container.dataset.areaOracleTerrainVoidMaskMatchedCount = String(matchedCount);
  runtime.container.dataset.areaOracleTerrainVoidMaskFilterModelResRef =
    modelResRefFilter ?? "";
  runtime.container.dataset.areaOracleTerrainVoidMaskFilterSourceMesh =
    sourceMeshFilter ?? "";
  return matchedCount;
}

function setAreaOracleTerrainMaterialMode(
  runtime: RuntimeState,
  mode: string | null | undefined
): number {
  const normalized = typeof mode === "string" ? mode.trim().toLowerCase() : "";
  if (normalized !== "basic" && normalized !== "unlit") {
    return 0;
  }
  const layer = runtime.scene.getObjectByName("terrain-backend-tile-models");
  if (!layer) {
    runtime.container.dataset.areaOracleTerrainMaterialMode = normalized;
    runtime.container.dataset.areaOracleTerrainMaterialConvertedCount = "0";
    runtime.container.dataset.areaOracleTerrainMaterialLayerFound = "false";
    return 0;
  }
  let convertedCount = 0;
  const convertMaterial = (material: THREE.Material): THREE.Material => {
    const source = material as THREE.Material & {
      alphaTest?: number;
      color?: THREE.Color;
      map?: THREE.Texture | null;
    };
    const converted = new THREE.MeshBasicMaterial({
      alphaTest: source.alphaTest ?? 0,
      blending: material.blending,
      color: source.color instanceof THREE.Color ? source.color.clone() : 0xffffff,
      depthTest: material.depthTest,
      depthWrite: material.depthWrite,
      map: source.map ?? null,
      opacity: material.opacity,
      side: material.side,
      transparent: material.transparent
    });
    converted.name = material.name;
    converted.userData = {
      ...material.userData,
      auroraTerrainOracleMaterialMode: normalized,
      auroraTerrainOracleSourceMaterialType: material.type
    };
    convertedCount += 1;
    return converted;
  };
  layer.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => convertMaterial(material))
      : convertMaterial(node.material);
  });
  runtime.container.dataset.areaOracleTerrainMaterialMode = normalized;
  runtime.container.dataset.areaOracleTerrainMaterialConvertedCount =
    String(convertedCount);
  runtime.container.dataset.areaOracleTerrainMaterialLayerFound = "true";
  return convertedCount;
}

function setAreaOracleGlobalFogVisible(runtime: RuntimeState, visible: boolean): void {
  if (!visible) {
    runtime.scene.fog = null;
    runtime.scene.userData.auroraTerrainAreaGlobalFogStatus = "available_disabled_by_capture";
    runtime.container.dataset.areaTerrainAreaGlobalFogStatus =
      "available_disabled_by_capture";
    runtime.container.dataset.areaOracleDisplayFog = "false";
    return;
  }
  runtime.container.dataset.areaOracleDisplayFog = "true";
}

function setAreaOracleAreaLightingVisible(runtime: RuntimeState, visible: boolean): void {
  const lightingLayer = runtime.scene.getObjectByName("terrain-area-global-lighting");
  if (lightingLayer) {
    lightingLayer.visible = visible;
  }
  if (!visible) {
    runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus =
      "available_disabled_by_capture";
    runtime.container.dataset.areaTerrainAreaGlobalLightingStatus =
      "available_disabled_by_capture";
  }
  runtime.container.dataset.areaOracleUseAreaLighting = String(visible);
  runtime.container.dataset.areaOracleAreaLightingLayerFound = lightingLayer ? "true" : "false";
  runtime.container.dataset.areaOracleAreaLightingLayerChildCount = String(
    lightingLayer?.children.length ?? 0
  );
}

function writeAreaTileProcessRuntimeDiagnostics(
  runtime: RuntimeState,
  readiness: AreaTileProcessContractReadiness | null
): void {
  const dataset = runtime.container.dataset;
  const snapshot: AreaTileProcessRuntimeSnapshot = readiness
    ? {
        version: "aurora-areas-tile-process-runtime/v1",
        path: "backend-tile-process-contract",
        status: readiness.status,
        areaId: readiness.areaId,
        checkedCandidateCount: readiness.checkedCandidateCount,
        readyCandidateCount: readiness.readyCandidateCount,
        blockedCandidateCount: readiness.blockedCandidateCount,
        sourceAssetReadyCount: readiness.sourceAssetReadyCount,
        mdlSourceReadyCount: readiness.mdlSourceReadyCount,
        glbGeometryReadyCount: readiness.glbGeometryReadyCount,
        materialTextureContractReadyCount: readiness.materialTextureContractReadyCount,
        materialBindingBlockedCount: readiness.materialBindingBlockedCount,
        renderLoaderReadyCount: readiness.renderLoaderReadyCount,
        blockerSummary: readiness.blockerSummary,
        sourceObjectKeySample: readiness.sourceObjectKeySample,
        sourceAssetContractSample: readiness.sourceAssetContractSample,
        textureMaterialBlockerSummary: readiness.textureMaterialBlockerSummary,
        renderAssetContractBlockerSummary: readiness.renderAssetContractBlockerSummary,
        mdlGlbMaterialBlockerSummary: readiness.mdlGlbMaterialBlockerSummary
      }
    : {
        version: "aurora-areas-tile-process-runtime/v1",
        path: "backend-tile-process-contract",
        status: "not_checked",
        areaId: null,
        checkedCandidateCount: 0,
        readyCandidateCount: 0,
        blockedCandidateCount: 0,
        sourceAssetReadyCount: 0,
        mdlSourceReadyCount: 0,
        glbGeometryReadyCount: 0,
        materialTextureContractReadyCount: 0,
        materialBindingBlockedCount: 0,
        renderLoaderReadyCount: 0,
        blockerSummary: "not_checked",
        sourceObjectKeySample: "none",
        sourceAssetContractSample: "none",
        textureMaterialBlockerSummary: "not_checked",
        renderAssetContractBlockerSummary: "not_checked",
        mdlGlbMaterialBlockerSummary: "not_checked"
      };

  if (!readiness) {
    dataset.areaTileProcessRuntimeStatus = "not_checked";
    dataset.areaTileProcessRuntimeAreaId = "none";
    dataset.areaTileProcessRuntimeCheckedCount = "0";
    dataset.areaTileProcessRuntimeReadyCount = "0";
    dataset.areaTileProcessRuntimeBlockedCount = "0";
    dataset.areaTileProcessRuntimeSourceAssetReadyCount = "0";
    dataset.areaTileProcessRuntimeMdlSourceReadyCount = "0";
    dataset.areaTileProcessRuntimeGlbGeometryReadyCount = "0";
    dataset.areaTileProcessRuntimeMaterialTextureReadyCount = "0";
    dataset.areaTileProcessRuntimeMaterialBindingBlockedCount = "0";
    dataset.areaTileProcessRuntimeRenderLoaderReadyCount = "0";
    dataset.areaTileProcessRuntimeBlockers = "not_checked";
    dataset.areaTileProcessRuntimeSourceObjectSample = "none";
    dataset.areaTileProcessRuntimeSourceAssetContractSample = "none";
    dataset.areaTileProcessRuntimeTextureMaterialBlockers = "not_checked";
    dataset.areaTileProcessRuntimeRenderAssetContractBlockers = "not_checked";
    dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers = "not_checked";
    dataset.areaTileProcessRuntimeSnapshot = serializeAreaEditingProofValue(snapshot);
    runtime.container.dispatchEvent(
      new CustomEvent<AreaTileProcessRuntimeSnapshot>(
        AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT,
        { detail: snapshot }
      )
    );
    return;
  }

  dataset.areaTileProcessRuntimeStatus = readiness.status;
  dataset.areaTileProcessRuntimeAreaId = readiness.areaId;
  dataset.areaTileProcessRuntimeCheckedCount = String(readiness.checkedCandidateCount);
  dataset.areaTileProcessRuntimeReadyCount = String(readiness.readyCandidateCount);
  dataset.areaTileProcessRuntimeBlockedCount = String(readiness.blockedCandidateCount);
  dataset.areaTileProcessRuntimeSourceAssetReadyCount = String(
    readiness.sourceAssetReadyCount
  );
  dataset.areaTileProcessRuntimeMdlSourceReadyCount = String(readiness.mdlSourceReadyCount);
  dataset.areaTileProcessRuntimeGlbGeometryReadyCount = String(
    readiness.glbGeometryReadyCount
  );
  dataset.areaTileProcessRuntimeMaterialTextureReadyCount = String(
    readiness.materialTextureContractReadyCount
  );
  dataset.areaTileProcessRuntimeMaterialBindingBlockedCount = String(
    readiness.materialBindingBlockedCount
  );
  dataset.areaTileProcessRuntimeRenderLoaderReadyCount = String(
    readiness.renderLoaderReadyCount
  );
  dataset.areaTileProcessRuntimeBlockers = readiness.blockerSummary;
  dataset.areaTileProcessRuntimeSourceObjectSample = readiness.sourceObjectKeySample;
  dataset.areaTileProcessRuntimeSourceAssetContractSample =
    readiness.sourceAssetContractSample;
  dataset.areaTileProcessRuntimeTextureMaterialBlockers =
    readiness.textureMaterialBlockerSummary;
  dataset.areaTileProcessRuntimeRenderAssetContractBlockers =
    readiness.renderAssetContractBlockerSummary;
  dataset.areaTileProcessRuntimeMdlGlbMaterialBlockers =
    readiness.mdlGlbMaterialBlockerSummary;
  dataset.areaTileProcessRuntimeSnapshot = serializeAreaEditingProofValue(snapshot);
  runtime.container.dispatchEvent(
    new CustomEvent<AreaTileProcessRuntimeSnapshot>(
      AREA_TILE_PROCESS_RUNTIME_SNAPSHOT_EVENT,
      { detail: snapshot }
    )
  );
}

function formatAreaTileProcessRuntimeStatus(
  readiness: AreaTileProcessContractReadiness | null | undefined
): string {
  if (!readiness) {
    return "not checked";
  }
  return [
    readiness.status,
    `ready ${readiness.readyCandidateCount}/${readiness.checkedCandidateCount}`,
    `source ${readiness.sourceAssetReadyCount}/${readiness.checkedCandidateCount}`,
    `mdl ${readiness.mdlSourceReadyCount}/${readiness.checkedCandidateCount}`,
    `glb ${readiness.glbGeometryReadyCount}/${readiness.checkedCandidateCount}`,
    `loader ${readiness.renderLoaderReadyCount}/${readiness.checkedCandidateCount}`
  ].join(" / ");
}

function formatAreaTileModelLoaderRuntimeStatus(
  readiness: AreaTileProcessContractReadiness | null | undefined
): string {
  if (!readiness) {
    return "not checked";
  }

  const readyModelCount = readiness.entries.filter(
    (entry) => entry.modelDeliveryStatus === "ready" && Boolean(entry.modelDeliveryUrl)
  ).length;
  const blockedModelCount = readiness.entries.filter(
    (entry) => entry.modelDeliveryStatus === "blocked_tile_model_glb_missing"
  ).length;
  const sample =
    readiness.entries.find((entry) => entry.modelAssetObjectKey)?.modelAssetObjectKey ??
    readiness.entries.find((entry) => entry.expectedDerivedModelObjectKey)
      ?.expectedDerivedModelObjectKey ??
    "none";

  return [
    `ready ${readyModelCount}/${readiness.checkedCandidateCount}`,
    `blocked ${blockedModelCount}/${readiness.checkedCandidateCount}`,
    `sample ${sample}`
  ].join(" / ");
}

function writeAreaObjectSourceDiagnostics(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  selectedObjectIds: string[],
  placeableRenderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null,
  creatureRenderPayloadsByObjectId: Record<string, CreatureViewportRenderPayload> | null
): void {
  const counts: Record<SceneObjectKind, number> = {
    placeables: 0,
    creatures: 0,
    doors: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0
  };
  let auroraGitCount = 0;
  visibleObjects.forEach((object) => {
    counts[object.kind] += 1;
    if (object.source?.type === "aurora_git") {
      auroraGitCount += 1;
    }
  });
  const fallbackCount = Math.max(0, visibleObjects.length - auroraGitCount);
  const visibleObjectIndexById = new Map(
    visibleObjects.map((object, index) => [object.id, index])
  );
  const selectedVisibleObjects = selectedObjectIds
    .map((id) => visibleObjects[visibleObjectIndexById.get(id) ?? -1])
    .filter((object): object is SceneObject => Boolean(object));
  const selectedAuroraGitCount = selectedVisibleObjects.filter(
    (object) => object.source?.type === "aurora_git"
  ).length;
  const selectedFallbackCount = Math.max(0, selectedVisibleObjects.length - selectedAuroraGitCount);
  const sharedRendererRuntimeEvidenceByObjectId =
    collectAreaObjectSharedRendererRuntimeEvidenceByObjectId(runtime, visibleObjects);
  const backendRenderContractDiagnostics = resolveAreaObjectBackendRenderContractDiagnostics(
    visibleObjects,
    placeableRenderPayloadsByObjectId,
    new Set(),
    sharedRendererRuntimeEvidenceByObjectId
  );
  const visibleEvidenceLimit = resolveAreaObjectRuntimeEvidenceDatasetLimit(visibleObjects.length);
  const visibleEvidenceObjects = visibleObjects.slice(0, visibleEvidenceLimit.rowCount);
  const visibleCreatureObjects = visibleObjects.filter((object) => object.kind === "creatures");
  const creatureRenderPayloadReadyCount = visibleCreatureObjects.filter((object) =>
    Boolean(creatureRenderPayloadsByObjectId?.[object.id])
  ).length;
  const creatureRenderPackageReadyCount = visibleCreatureObjects.filter((object) =>
    Boolean(creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage)
  ).length;
  const creatureRenderModelUrlReadyCount = visibleCreatureObjects.filter((object) => {
    const renderPackage = creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage;
    return (
      renderPackage?.status === "ready" &&
      (Boolean(renderPackage.glbUrl?.trim()) || Boolean(renderPackage.modelUrl?.trim()))
    );
  }).length;
  const creatureRenderModelReadyCount = visibleCreatureObjects.filter((object) => {
    const userData = runtime.objectMeshById.get(object.id)?.userData;
    if (userData?.creatureRenderModelReady === true) {
      return true;
    }
    const partModelGroupStatus = userData?.creaturePartModelGroupStatus;
    return partModelGroupStatus === "loaded" || partModelGroupStatus === "partial";
  }).length;

  runtime.container.dataset.areaObjectSource = auroraGitCount > 0 ? "aurora_git" : "local_or_empty";
  runtime.container.dataset.areaObjectSourceStatus =
    visibleObjects.length === 0
      ? "empty"
      : fallbackCount === 0
        ? "source-backed"
        : auroraGitCount > 0
          ? "mixed-source-fallback"
          : "fallback";
  runtime.container.dataset.areaObjectVisibleCount = String(visibleObjects.length);
  runtime.container.dataset.areaObjectAuroraGitCount = String(auroraGitCount);
  runtime.container.dataset.areaObjectFallbackCount = String(fallbackCount);
  runtime.container.dataset.areaObjectPlaceableCount = String(counts.placeables);
  runtime.container.dataset.areaObjectDoorCount = String(counts.doors);
  runtime.container.dataset.areaObjectCreatureCount = String(counts.creatures);
  runtime.container.dataset.areaObjectItemCount = String(counts.items);
  runtime.container.dataset.areaObjectSoundCount = String(counts.sounds);
  runtime.container.dataset.areaObjectBackendRenderContractStatus =
    backendRenderContractDiagnostics.status;
  runtime.container.dataset.areaObjectBackendRenderContractTotal = String(
    backendRenderContractDiagnostics.total
  );
  runtime.container.dataset.areaObjectBackendRenderPayloadReadyCount = String(
    backendRenderContractDiagnostics.payloadReadyCount
  );
  runtime.container.dataset.areaObjectBackendRenderModelUrlReadyCount = String(
    backendRenderContractDiagnostics.modelUrlReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPayloadReadyCount = String(
    creatureRenderPayloadReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPackageReadyCount = String(
    creatureRenderPackageReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderModelUrlReadyCount = String(
    creatureRenderModelUrlReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderModelReadyCount = String(
    creatureRenderModelReadyCount
  );
  runtime.container.dataset.areaObjectCreatureRenderPayloadStatus =
    visibleCreatureObjects.length === 0
      ? "not-applicable"
      : creatureRenderPayloadReadyCount === visibleCreatureObjects.length
        ? "ready"
        : creatureRenderPayloadReadyCount > 0
          ? "partial"
          : "missing";
  runtime.container.dataset.areaObjectCreatureRenderModelStatus =
    visibleCreatureObjects.length === 0
      ? "not-applicable"
      : creatureRenderModelReadyCount === visibleCreatureObjects.length
        ? "ready"
        : creatureRenderModelReadyCount > 0 || creatureRenderModelUrlReadyCount > 0
          ? "partial"
          : "missing";
  runtime.container.dataset.areaObjectCreatureRenderPackageStatuses = visibleEvidenceObjects
    .map((object) =>
      object.kind === "creatures"
        ? (creatureRenderPayloadsByObjectId?.[object.id]?.renderPackage?.status ?? "missing")
        : "not-creature"
    )
    .join("|");
  runtime.container.dataset.areaObjectBackendRenderBlockedCount = String(
    backendRenderContractDiagnostics.blockedCount
  );
  runtime.container.dataset.areaObjectBackendRenderBlockedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.blockedIds);
  runtime.container.dataset.areaObjectPrimitiveFallbackIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.primitiveFallbackIds);
  runtime.container.dataset.areaObjectSharedRendererPath = "shared-placeables-renderer";
  runtime.container.dataset.areaObjectSharedRendererStatus =
    backendRenderContractDiagnostics.status;
  runtime.container.dataset.areaObjectSharedRendererPlaceholderStatus =
    backendRenderContractDiagnostics.placeholderStatus;
  runtime.container.dataset.areaObjectSharedRendererPayloadBoundCount = String(
    backendRenderContractDiagnostics.payloadReadyCount
  );
  runtime.container.dataset.areaObjectSharedRendererModelReadyCount = String(
    backendRenderContractDiagnostics.modelReadyCount
  );
  runtime.container.dataset.areaObjectSharedRendererUniqueModelUrlCount = String(
    backendRenderContractDiagnostics.uniqueModelUrlCount
  );
  runtime.container.dataset.areaObjectSharedRendererUniqueModelCacheKeyCount = String(
    backendRenderContractDiagnostics.uniqueModelCacheKeyCount
  );
  runtime.container.dataset.areaObjectSharedRendererModelUrlSample =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelUrlSample);
  runtime.container.dataset.areaObjectSharedRendererModelCacheKeySample =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelCacheKeySample);
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackCount = String(
    backendRenderContractDiagnostics.primitiveFallbackCount
  );
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackRenderLimit = String(
    backendRenderContractDiagnostics.primitiveFallbackRenderLimit
  );
  runtime.container.dataset.areaObjectSharedRendererPrimitiveFallbackSuppressedCount = String(
    backendRenderContractDiagnostics.primitiveFallbackSuppressedCount
  );
  runtime.container.dataset.areaObjectSharedRendererMissingPayloadIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.missingPayloadIds);
  runtime.container.dataset.areaObjectSharedRendererPayloadMissingModelUrlIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.payloadMissingModelUrlIds);
  runtime.container.dataset.areaObjectSharedRendererAssetContractBlockedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.assetContractBlockedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedIds);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelUrls =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedModelUrls);
  runtime.container.dataset.areaObjectSharedRendererModelLoadFailedModelCacheKeys =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.modelLoadFailedModelCacheKeys);
  runtime.container.dataset.areaObjectSharedRendererStillLoadingIds =
    limitAreaRuntimeIdString(backendRenderContractDiagnostics.stillLoadingIds);
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonCounts = JSON.stringify(
    backendRenderContractDiagnostics.placeholderReasonCounts
  );
  runtime.container.dataset.areaObjectSharedRendererPlaceholderReasonIds = JSON.stringify(
    Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        limitAreaRuntimeIdString(backendRenderContractDiagnostics.placeholderReasonIds[reason])
      ])
    )
  );
  writeAreaSharedRendererRuntimeSnapshot(runtime, backendRenderContractDiagnostics);
  safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
  scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
  runtime.container.dataset.areaObjectRuntimeIdListLimit = String(
    AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceLimit = String(
    AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceRowCount = String(
    visibleEvidenceLimit.rowCount
  );
  runtime.container.dataset.areaObjectRuntimeEvidenceTruncatedCount = String(
    visibleEvidenceLimit.truncatedCount
  );
  runtime.container.dataset.areaObjectSourceIds = visibleEvidenceObjects
    .map((object) => object.source?.sourceObjectId ?? object.id)
    .join("|");
  runtime.container.dataset.areaObjectOrderKeys = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectOrderKey(object, index))
    .join("|");
  runtime.container.dataset.areaObjectOrderEvidence = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectDatasetEvidence(object, index))
    .join("|");
  runtime.container.dataset.areaObjectModelContractEvidence = visibleEvidenceObjects
    .map((object, index) =>
      resolveAreaObjectModelContractEvidence(
        object,
        index,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  runtime.container.dataset.areaObjectLookupContractEvidence = visibleEvidenceObjects
    .map((object, index) =>
      resolveAreaObjectLookupContractEvidence(
        object,
        index,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const doorTransitionStatuses = visibleObjects.map((object) =>
    resolveAreaObjectDoorTransitionStatus(object)
  );
  runtime.container.dataset.areaObjectDoorTransitionStatus =
    resolveAreaObjectDoorTransitionAggregateStatus(doorTransitionStatuses);
  runtime.container.dataset.areaObjectDoorTransitionEvidence = visibleEvidenceObjects
    .map((object, index) => resolveAreaObjectDoorTransitionEvidence(object, index))
    .join("|");
  runtime.container.dataset.areaObjectSelectedCount = String(selectedVisibleObjects.length);
  runtime.container.dataset.areaObjectSelectedStatus =
    selectedVisibleObjects.length === 0
      ? "none"
      : selectedFallbackCount === 0
        ? "source-backed"
        : selectedAuroraGitCount > 0
          ? "mixed-source-fallback"
          : "fallback";
  runtime.container.dataset.areaObjectSelectedIds = selectedVisibleObjects
    .map((object) => object.id)
    .join("|");
  runtime.container.dataset.areaObjectSelectedSourceIds = selectedVisibleObjects
    .map((object) => resolveAreaObjectDatasetSourceId(object))
    .join("|");
  runtime.container.dataset.areaObjectSelectedOrderKeys = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectOrderKey(object, visibleObjectIndexById.get(object.id) ?? 0)
    )
    .join("|");
  runtime.container.dataset.areaObjectSelectedEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectDatasetEvidence(object, visibleObjectIndexById.get(object.id) ?? 0)
    )
    .join("|");
  const selectedModelContractStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectModelContractStatus(
      object,
      placeableRenderPayloadsByObjectId?.[object.id] ?? null
    )
  );
  runtime.container.dataset.areaObjectSelectedModelContractStatus =
    resolveAreaObjectSelectedModelContractStatus(selectedModelContractStatuses);
  runtime.container.dataset.areaObjectSelectedModelContractEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectModelContractEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const selectedLookupContractStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectLookupContractStatus(
      object,
      placeableRenderPayloadsByObjectId?.[object.id] ?? null
    )
  );
  runtime.container.dataset.areaObjectSelectedLookupContractStatus =
    resolveAreaObjectSelectedModelContractStatus(selectedLookupContractStatuses);
  runtime.container.dataset.areaObjectSelectedLookupContractEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectLookupContractEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0,
        placeableRenderPayloadsByObjectId?.[object.id] ?? null
      )
    )
    .join("|");
  const selectedDoorTransitionStatuses = selectedVisibleObjects.map((object) =>
    resolveAreaObjectDoorTransitionStatus(object)
  );
  runtime.container.dataset.areaObjectSelectedDoorTransitionStatus =
    resolveAreaObjectDoorTransitionAggregateStatus(selectedDoorTransitionStatuses);
  runtime.container.dataset.areaObjectSelectedDoorTransitionEvidence = selectedVisibleObjects
    .map((object) =>
      resolveAreaObjectDoorTransitionEvidence(
        object,
        visibleObjectIndexById.get(object.id) ?? 0
      )
    )
    .join("|");
  safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
}

function framePlaceablesVfxPreviewIfNeeded(
  runtime: RuntimeState,
  visibleObjects: SceneObject[],
  renderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  if (visibleObjects.length !== 1) {
    return;
  }
  const object = visibleObjects[0];
  if (!object || !isPlaceablesVfxPreviewObject(object, renderPayloadsByObjectId?.[object.id])) {
    return;
  }
  const target = findVfxPreviewFrameTarget(runtime.objectMeshById.get(object.id) ?? null);
  if (!target) {
    return;
  }
  const bounds = new THREE.Box3().setFromObject(target);
  if (bounds.isEmpty()) {
    return;
  }
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  bounds.getCenter(center);
  bounds.getSize(size);
  const span = Math.max(size.x, size.y, size.z, 0.45);
  const distance = Math.max(1.35, span * 3.1);
  runtime.controls.target.copy(center);
  runtime.camera.position.set(
    center.x + distance * 0.58,
    center.y + Math.max(0.55, span * 1.25),
    center.z + distance * 0.92
  );
  runtime.camera.lookAt(center);
  runtime.controls.update();
}

interface WorkspaceCanvasViewportProps {
  toolbarState: WorkspaceToolbarState;
  userId: string;
  sceneViewportPort: SceneViewportPort;
  viewportFacade?: WorkspaceCanvasViewportFacade;
  trackTelemetryEvent?: WorkspaceCanvasTelemetryTrack;
  commandSignal: WorkspaceCommandSignal | null;
  sidebarSelectSignal?: {
    revision: number;
    objectId: string;
    additive: boolean;
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  sidebarContextMenuSignal?: {
    revision: number;
    objectId: string;
    objectKind: SceneObjectKind;
    clientX: number;
    clientY: number;
  } | null;
  sidebarPropertiesSignal?: {
    revision: number;
    objectId: string;
    objectKind: SceneObjectKind;
  } | null;
  canvasCreateObjectSignal?: {
    revision: number;
    template: SceneObject;
  } | null;
  catalogScope?: {
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  workspaceOptions: WorkspaceOptionSettings;
  leftPanelWidthPx: number;
  rightPanelWidthPx: number;
  onSceneObjectsSnapshotChange?: (objects: SceneObject[]) => void;
  onSelectionSnapshotChange?: (selectedIds: string[]) => void;
  onObjectAddPlacementModeChange?: (
    placement:
      | {
          templateId: string;
          objectKind: SceneObjectKind;
          tag: string;
        }
      | null
  ) => void;
  externalSceneSeed?: AreaScene | null;
  areaEditorMutationSignal?: WorkspaceAreaEditorMutationSignal | null;
  areaEditingTool?: AuroraAreaEditingTool;
  onAreaSceneDraftChange?: (scene: AreaScene) => void;
  onSelectedTileChange?: (tileId: string | null, tileIds: readonly string[]) => void;
  renderObjectIds?: string[] | null;
  areaCanvasLoading?: WorkspaceAreaCanvasLoadingState | null;
  areaTileProcessReadiness?: AreaTileProcessContractReadiness | null;
  placeableRenderPayloadByObjectId?: Record<string, PlaceableViewportRenderPayload> | null;
  creatureRenderPayloadByObjectId?: Record<string, CreatureViewportRenderPayload> | null;
  creatureResourceOptions?: Partial<
    Record<"conversation" | "portrait" | "script" | "soundset", CreatureApiResourceOption[]>
  >;
  placeableAssetAccessToken?: string | null;
  onItemPreviewObjectNeeded?: (object: SceneObject) => Promise<SceneObject>;
  onItemPropertiesApplied?: (object: SceneObject, previousObject: SceneObject) => void;
  onCreaturePropertiesApplied?: (object: SceneObject, previousObject: SceneObject) => void;
  showGizmoModeBadge?: boolean;
}

export interface WorkspaceAreaEditorMutationSignal {
  revision: number;
  scene: AreaScene;
  selectedTileId?: string | null;
  selectedTileIds?: string[];
}

export function resolveWorkspaceAreaEditorMutationSelectedTileId(
  currentSelectedTileId: string | null,
  signal: WorkspaceAreaEditorMutationSignal,
  appliedRevision: number,
  currentSceneId: string
): string | null {
  if (
    signal.revision <= appliedRevision ||
    signal.scene.sceneId !== currentSceneId
  ) {
    return currentSelectedTileId;
  }
  return signal.selectedTileId === undefined
    ? currentSelectedTileId
    : signal.selectedTileId;
}

export function shouldApplyWorkspaceExternalSceneSeed(
  previouslyObservedSeed: AreaScene | null | undefined,
  nextSeed: AreaScene | null | undefined,
  currentScene: AreaScene | null
): boolean {
  return Boolean(
    nextSeed &&
      nextSeed !== previouslyObservedSeed &&
      nextSeed !== currentScene
  );
}

export function shouldPublishWorkspaceAreaSceneDraft(
  externalSceneSeed: AreaScene | null | undefined,
  observedExternalSceneSeed: AreaScene | null | undefined,
  scene: AreaScene
): boolean {
  return Boolean(
    externalSceneSeed &&
      scene.sceneId === externalSceneSeed.sceneId &&
      externalSceneSeed === observedExternalSceneSeed
  );
}

export interface WorkspaceAreaCanvasLoadingState {
  source: "areas" | "terrain" | "textures";
  label: string;
  completed?: number | null;
  total?: number | null;
  inFlight?: number | null;
  queued?: number | null;
  currentLabel?: string | null;
}

export function applyWorkspaceAreaEditorMutationSignal(
  history: SceneHistoryState,
  signal: WorkspaceAreaEditorMutationSignal,
  appliedRevision: number,
  sceneViewportPort: Pick<SceneViewportPort, "commitHistory">
): { history: SceneHistoryState; appliedRevision: number } {
  if (signal.revision <= appliedRevision) {
    return { history, appliedRevision };
  }

  if (signal.scene.sceneId !== history.present.sceneId) {
    return { history, appliedRevision: signal.revision };
  }

  return {
    history: sceneViewportPort.commitHistory(history, signal.scene),
    appliedRevision: signal.revision
  };
}

export function useWorkspaceAreaEditorMutationSignal(
  signal: WorkspaceAreaEditorMutationSignal | null | undefined,
  currentSceneId: string,
  sceneViewportPort: Pick<SceneViewportPort, "commitHistory">,
  setSceneHistory: (value: SetStateAction<SceneHistoryState>) => void,
  setSelectedTileId: (value: SetStateAction<string | null>) => void
): void {
  const appliedRevisionRef = useRef(0);

  useEffect(() => {
    if (!signal || signal.revision <= appliedRevisionRef.current) {
      return;
    }

    // React StrictMode may evaluate a functional state updater more than once.
    // Capture the previous revision so every evaluation is pure and produces
    // the same committed history, then consume the signal outside the updater.
    const previouslyAppliedRevision = appliedRevisionRef.current;
    setSelectedTileId((current) =>
      resolveWorkspaceAreaEditorMutationSelectedTileId(
        current,
        signal,
        previouslyAppliedRevision,
        currentSceneId
      )
    );
    setSceneHistory((current) =>
      applyWorkspaceAreaEditorMutationSignal(
        current,
        signal,
        previouslyAppliedRevision,
        sceneViewportPort
      ).history
    );
    appliedRevisionRef.current = signal.revision;
  }, [currentSceneId, sceneViewportPort, setSceneHistory, setSelectedTileId, signal]);
}

interface AdjustLocationDialogState {
  objectIds: string[];
  snapshotObjects: SceneObject[];
  draft: AdjustLocationDraft;
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
  windowX: number;
  windowY: number;
  collapsed: boolean;
}

const ADJUST_LOCATION_DIALOG_MARGIN_PX = 12;
const ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX = 520;
const ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX = 420;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 820;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 540;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 840;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 620;
const ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 920;
const ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 620;
const SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const ASSET_LOADING_RENDER_INTERVAL_MS = 80;
const PERF_SNAPSHOT_INTERVAL_MS = 300;
const AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT = "aurora:areas:focused-perspective-camera";
const AREA_ORACLE_TOP_DOWN_CAMERA_EVENT = "aurora:areas:oracle-top-down-camera";
const AREA_ORACLE_RENDER_VISIBILITY_EVENT = "aurora:areas:oracle-render-visibility";

interface AuroraCreatureProofRuntimeHook {
  sampleAnimationState: (timeSeconds: number) => {
    ok: boolean;
    issue?: string;
    requestedTimeSeconds: number;
    width: number;
    height: number;
    dataUrl: string;
    dataset: Record<string, string>;
    sceneGraph: ReturnType<typeof collectAuroraCreatureProofSceneGraph>;
    samples: ReturnType<typeof sampleRuntimeObjectAnimationAtTime>;
  };
  sampleAnimationFrame: (timeSeconds: number) => {
    ok: boolean;
    issue?: string;
    requestedTimeSeconds: number;
    width: number;
    height: number;
    dataUrl: string;
    dataset: Record<string, string>;
    sceneGraph: ReturnType<typeof collectAuroraCreatureProofSceneGraph>;
    samples: ReturnType<typeof sampleRuntimeObjectAnimationAtTime>;
  };
}

interface AuroraAreaRuntimeCaptureResult {
  ok: boolean;
  issue?: string;
  requestedObjectId: string;
  requestedObjectIds?: string[];
  matchedObjectId: string;
  matchedObjectIds?: string[];
  matchedObjectName: string;
  matchedObjectNames?: string[];
  visibleObjectCount: number;
  highlightedObjectCount?: number;
  width: number;
  height: number;
  dataUrl: string;
  dataset: Record<string, string>;
  camera: {
    position: { x: number; y: number; z: number };
    target: { x: number; y: number; z: number };
    up: { x: number; y: number; z: number };
    fov: number;
    near: number;
    far: number;
    frameMode: string;
    frameTarget: string;
    frameDistance: string;
    frameSource: string;
  };
}

interface AuroraAreaRuntimeCaptureHook {
  captureCanvasFrame: () => AuroraAreaRuntimeCaptureResult;
  captureIsolatedObjectFrame: (objectId: string) => AuroraAreaRuntimeCaptureResult;
  captureHighlightedObjectFrame: (objectIds: string[]) => AuroraAreaRuntimeCaptureResult;
}

function formatAuroraCreatureProofVector(value: THREE.Vector3): string {
  return `${value.x.toFixed(4)},${value.y.toFixed(4)},${value.z.toFixed(4)}`;
}

function isAuroraCreatureProofNodeVisible(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  if (node instanceof THREE.Mesh) {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    return materials.some((material) => material.visible !== false);
  }
  return true;
}

function collectAuroraCreatureProofAncestorPath(node: THREE.Object3D): string {
  const names: string[] = [];
  let current: THREE.Object3D | null = node;
  while (current && names.length < 10) {
    names.push(current.name || current.type || "(unnamed)");
    current = current.parent;
  }
  return names.join(">");
}

function isAuroraCreatureProofEquipmentMesh(node: THREE.Mesh): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (
      current.userData?.creatureEquipmentModelPartMeshStatus === "flat-composed" ||
      current.userData?.creatureEquipmentModelPartStatus === "loaded" ||
      current.userData?.creatureEquipmentModelPartItemGroupStatus ===
        "source-equipment-item-model"
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function resolveAuroraCreatureProofEquipmentTarget(node: THREE.Object3D): string {
  let current: THREE.Object3D | null = node;
  while (current) {
    const target =
      typeof current.userData?.creatureEquipmentModelPartAttachmentTarget === "string"
        ? current.userData.creatureEquipmentModelPartAttachmentTarget
        : typeof current.userData?.creatureEquipmentModelPartItemAttachmentTarget === "string"
          ? current.userData.creatureEquipmentModelPartItemAttachmentTarget
          : "";
    if (target) {
      return target;
    }
    current = current.parent;
  }
  return "";
}

export function collectAuroraCreatureProofSceneGraph(runtime: RuntimeState): {
  objectRootCount: number;
  objectRootNames: string[];
  objectRootChildNames: string[];
  meshCount: number;
  visibleMeshCount: number;
  visibleMeshNames: string[];
  visibleMeshPaths: string[];
  visibleMeshCenters: string[];
  visibleMeshSizes: string[];
  equipmentVisibleMeshCount: number;
  equipmentVisibleMeshNames: string[];
  equipmentVisibleMeshTargets: string[];
  equipmentVisibleMeshPaths: string[];
  equipmentVisibleMeshCenters: string[];
  equipmentVisibleMeshSizes: string[];
} {
  const objectRoots = Array.from(runtime.objectMeshById.values());
  const visibleMeshNames: string[] = [];
  const visibleMeshPaths: string[] = [];
  const visibleMeshCenters: string[] = [];
  const visibleMeshSizes: string[] = [];
  const equipmentVisibleMeshNames: string[] = [];
  const equipmentVisibleMeshTargets: string[] = [];
  const equipmentVisibleMeshPaths: string[] = [];
  const equipmentVisibleMeshCenters: string[] = [];
  const equipmentVisibleMeshSizes: string[] = [];
  let meshCount = 0;
  let visibleMeshCount = 0;
  let equipmentVisibleMeshCount = 0;
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  objectRoots.forEach((root) => {
    root.updateMatrixWorld(true);
    root.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      meshCount += 1;
      if (!isAuroraCreatureProofNodeVisible(node)) {
        return;
      }
      visibleMeshCount += 1;
      const isEquipmentMesh = isAuroraCreatureProofEquipmentMesh(node);
      if (isEquipmentMesh) {
        equipmentVisibleMeshCount += 1;
      }
      if (visibleMeshNames.length >= 96) {
        return;
      }
      const meshName = node.name || node.parent?.name || "(unnamed)";
      const ancestorPath = collectAuroraCreatureProofAncestorPath(node);
      visibleMeshNames.push(meshName);
      visibleMeshPaths.push(ancestorPath);
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) {
        visibleMeshCenters.push(`${meshName}:empty`);
        visibleMeshSizes.push(`${meshName}:empty`);
        if (isEquipmentMesh && equipmentVisibleMeshNames.length < 96) {
          equipmentVisibleMeshNames.push(meshName);
          equipmentVisibleMeshTargets.push(resolveAuroraCreatureProofEquipmentTarget(node));
          equipmentVisibleMeshPaths.push(ancestorPath);
          equipmentVisibleMeshCenters.push(`${meshName}:empty`);
          equipmentVisibleMeshSizes.push(`${meshName}:empty`);
        }
        return;
      }
      box.getCenter(center);
      box.getSize(size);
      visibleMeshCenters.push(
        `${meshName}:${formatAuroraCreatureProofVector(center)}`
      );
      visibleMeshSizes.push(
        `${meshName}:${formatAuroraCreatureProofVector(size)}`
      );
      if (isEquipmentMesh && equipmentVisibleMeshNames.length < 96) {
        equipmentVisibleMeshNames.push(meshName);
        equipmentVisibleMeshTargets.push(resolveAuroraCreatureProofEquipmentTarget(node));
        equipmentVisibleMeshPaths.push(ancestorPath);
        equipmentVisibleMeshCenters.push(
          `${meshName}:${formatAuroraCreatureProofVector(center)}`
        );
        equipmentVisibleMeshSizes.push(
          `${meshName}:${formatAuroraCreatureProofVector(size)}`
        );
      }
    });
  });

  return {
    objectRootCount: objectRoots.length,
    objectRootNames: objectRoots.map((root) => root.name || root.type || "(unnamed)"),
    objectRootChildNames: objectRoots.flatMap((root) =>
      root.children.map((child) => child.name || child.type || "(unnamed)")
    ),
    meshCount,
    visibleMeshCount,
    visibleMeshNames,
    visibleMeshPaths,
    visibleMeshCenters,
    visibleMeshSizes,
    equipmentVisibleMeshCount,
    equipmentVisibleMeshNames,
    equipmentVisibleMeshTargets,
    equipmentVisibleMeshPaths,
    equipmentVisibleMeshCenters,
    equipmentVisibleMeshSizes
  };
}

export function installAuroraCreatureProofRuntimeHook(runtime: RuntimeState): void {
  const targetWindow = window as typeof window & {
    __auroraCreatureProofRuntime?: AuroraCreatureProofRuntimeHook;
  };
  const sampleRuntime = (timeSeconds: number, includeDataUrl: boolean) => {
    const requestedTimeSeconds = Number.isFinite(timeSeconds)
      ? Math.max(0, timeSeconds)
      : 0;
    const samples = sampleRuntimeObjectAnimationAtTime(runtime, requestedTimeSeconds);
    let dataUrl = "";
    if (includeDataUrl) {
      runtime.renderer.render(runtime.scene, runtime.camera);
      try {
        dataUrl = runtime.renderer.domElement.toDataURL("image/png");
      } catch (error) {
        return {
          ok: false,
          issue: error instanceof Error ? error.message : String(error),
          requestedTimeSeconds,
          width: runtime.renderer.domElement.width,
          height: runtime.renderer.domElement.height,
          dataUrl: "",
          dataset: { ...runtime.container.dataset } as Record<string, string>,
          sceneGraph: collectAuroraCreatureProofSceneGraph(runtime),
          samples
        };
      }
    }
    return {
      ok: true,
      requestedTimeSeconds,
      width: runtime.renderer.domElement.width,
      height: runtime.renderer.domElement.height,
      dataUrl,
      dataset: { ...runtime.container.dataset } as Record<string, string>,
      sceneGraph: collectAuroraCreatureProofSceneGraph(runtime),
      samples
    };
  };
  targetWindow.__auroraCreatureProofRuntime = {
    sampleAnimationState: (timeSeconds: number) => sampleRuntime(timeSeconds, false),
    sampleAnimationFrame: (timeSeconds: number) => {
      return sampleRuntime(timeSeconds, true);
    }
  };
}

export function uninstallAuroraCreatureProofRuntimeHook(runtime: RuntimeState): void {
  void runtime;
  const targetWindow = window as typeof window & {
    __auroraCreatureProofRuntime?: AuroraCreatureProofRuntimeHook;
  };
  if (targetWindow.__auroraCreatureProofRuntime) {
    delete targetWindow.__auroraCreatureProofRuntime;
  }
}

function installAuroraAreaRuntimeCaptureHook(runtime: RuntimeState): void {
  const targetWindow = window as typeof window & {
    __auroraAreaRuntimeCapture?: AuroraAreaRuntimeCaptureHook;
  };
  const readCameraEvidence = (): AuroraAreaRuntimeCaptureResult["camera"] => ({
    position: formatAreaRuntimeVector(runtime.camera.position),
    target: formatAreaRuntimeVector(runtime.controls.target),
    up: formatAreaRuntimeVector(runtime.camera.up),
    fov: roundAreaRuntimeNumber(runtime.camera.fov),
    near: roundAreaRuntimeNumber(runtime.camera.near),
    far: roundAreaRuntimeNumber(runtime.camera.far),
    frameMode: runtime.container.dataset.areaCameraFrameMode ?? "",
    frameTarget: runtime.container.dataset.areaCameraFrameTarget ?? "",
    frameDistance: runtime.container.dataset.areaCameraFrameDistance ?? "",
    frameSource: runtime.container.dataset.areaCameraFrameSource ?? ""
  });
  const findRuntimeObjectMatch = (
    objectId: string
  ): [string, THREE.Object3D] | null => {
    const normalized = objectId.trim();
    return (
      Array.from(runtime.objectMeshById.entries()).find(
        ([candidateObjectId]) =>
          candidateObjectId === normalized ||
          candidateObjectId.endsWith(`:${normalized}`) ||
          candidateObjectId.endsWith(normalized)
      ) ?? null
    );
  };
  const captureFrame = (
    isolatedObjectId: string | null = null,
    highlightedObjectIds: string[] = []
  ): ReturnType<AuroraAreaRuntimeCaptureHook["captureIsolatedObjectFrame"]> => {
    const restoreVisibility: Array<[THREE.Object3D, boolean]> = [];
    const restoreMaterials: Array<
      [THREE.Mesh, THREE.Material | THREE.Material[], number]
    > = [];
    const highlightMaterials: THREE.Material[] = [];
    let matchedObjectId = "";
    let matchedObjectName = "";
    const requestedObjectIds = highlightedObjectIds
      .map((objectId) => objectId.trim())
      .filter(Boolean);
    const matchedObjectIds: string[] = [];
    const matchedObjectNames: string[] = [];
    let isolatedObjectRoot: THREE.Object3D | null = null;
    if (isolatedObjectId) {
      const normalized = isolatedObjectId.trim();
      const match = findRuntimeObjectMatch(normalized);
      if (!match) {
        return {
          ok: false,
          issue: `object_not_found:${normalized}`,
          requestedObjectId: normalized,
          matchedObjectId: "",
          matchedObjectName: "",
          visibleObjectCount: 0,
          width: runtime.renderer.domElement.width,
          height: runtime.renderer.domElement.height,
          dataUrl: "",
          dataset: { ...runtime.container.dataset } as Record<string, string>,
          camera: readCameraEvidence()
        };
      }
      matchedObjectId = match[0];
      matchedObjectName = match[1].name || match[0];
      isolatedObjectRoot = match[1];
      const visibleSet = new Set<THREE.Object3D>();
      let current: THREE.Object3D | null = isolatedObjectRoot;
      while (current) {
        visibleSet.add(current);
        current = current.parent;
      }
      isolatedObjectRoot.traverse((node) => {
        visibleSet.add(node);
      });
      runtime.scene.traverse((node) => {
        if (node === runtime.scene) {
          return;
        }
        restoreVisibility.push([node, node.visible]);
        const keepVisible = visibleSet.has(node) || node instanceof THREE.Light;
        if (!keepVisible) {
          node.visible = false;
        }
      });
    }
    if (requestedObjectIds.length > 0) {
      const palette = [0xff304c, 0xffd400, 0x459bff, 0x00ffb8, 0xff7a00, 0xdb58ff];
      for (const requestedObjectId of requestedObjectIds) {
        const match = findRuntimeObjectMatch(requestedObjectId);
        if (!match) {
          return {
            ok: false,
            issue: `object_not_found:${requestedObjectId}`,
            requestedObjectId: requestedObjectIds.join(","),
            requestedObjectIds,
            matchedObjectId: "",
            matchedObjectIds,
            matchedObjectName: "",
            matchedObjectNames,
            visibleObjectCount: runtime.objectMeshById.size,
            highlightedObjectCount: matchedObjectIds.length,
            width: runtime.renderer.domElement.width,
            height: runtime.renderer.domElement.height,
            dataUrl: "",
            dataset: { ...runtime.container.dataset } as Record<string, string>,
            camera: readCameraEvidence()
          };
        }
        matchedObjectIds.push(match[0]);
        matchedObjectNames.push(match[1].name || match[0]);
      }
      const materialByObjectId = new Map<string, THREE.Material>();
      matchedObjectIds.forEach((objectId, index) => {
        const material = new THREE.MeshBasicMaterial({
          color: palette[index % palette.length],
          transparent: true,
          opacity: 0.86,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide
        });
        highlightMaterials.push(material);
        materialByObjectId.set(objectId, material);
      });
      matchedObjectIds.forEach((objectId, index) => {
        const root = runtime.objectMeshById.get(objectId);
        const material = materialByObjectId.get(objectId);
        if (!root || !material) {
          return;
        }
        root.traverse((node) => {
          if (!(node instanceof THREE.Mesh)) {
            return;
          }
          restoreMaterials.push([node, node.material, node.renderOrder]);
          node.material = material;
          node.renderOrder = 10_000 + index;
        });
      });
    }
    try {
      const preserveFocusedPerspectiveCamera =
        runtime.container.dataset.areaCameraFrameMode === "focused_perspective";
      if (!preserveFocusedPerspectiveCamera) {
        applyTopDownOracleCameraLock(runtime);
      }
      runtime.camera.updateMatrixWorld(true);
      runtime.renderer.render(runtime.scene, runtime.camera);
      const gl = runtime.renderer.getContext();
      gl.flush();
      gl.finish();
      return {
        ok: true,
        requestedObjectId: isolatedObjectId ?? requestedObjectIds.join(","),
        requestedObjectIds: requestedObjectIds.length > 0 ? requestedObjectIds : undefined,
        matchedObjectId: matchedObjectId || matchedObjectIds.join(","),
        matchedObjectIds: matchedObjectIds.length > 0 ? matchedObjectIds : undefined,
        matchedObjectName: matchedObjectName || matchedObjectNames.join(","),
        matchedObjectNames: matchedObjectNames.length > 0 ? matchedObjectNames : undefined,
        visibleObjectCount: isolatedObjectId ? 1 : runtime.objectMeshById.size,
        highlightedObjectCount: matchedObjectIds.length || undefined,
        width: runtime.renderer.domElement.width,
        height: runtime.renderer.domElement.height,
        dataUrl: runtime.renderer.domElement.toDataURL("image/png"),
        dataset: { ...runtime.container.dataset } as Record<string, string>,
        camera: readCameraEvidence()
      };
    } catch (error) {
      return {
        ok: false,
        issue: error instanceof Error ? error.message : String(error),
        requestedObjectId: isolatedObjectId ?? requestedObjectIds.join(","),
        requestedObjectIds: requestedObjectIds.length > 0 ? requestedObjectIds : undefined,
        matchedObjectId: matchedObjectId || matchedObjectIds.join(","),
        matchedObjectIds: matchedObjectIds.length > 0 ? matchedObjectIds : undefined,
        matchedObjectName: matchedObjectName || matchedObjectNames.join(","),
        matchedObjectNames: matchedObjectNames.length > 0 ? matchedObjectNames : undefined,
        visibleObjectCount: isolatedObjectId ? 1 : runtime.objectMeshById.size,
        highlightedObjectCount: matchedObjectIds.length || undefined,
        width: runtime.renderer.domElement.width,
        height: runtime.renderer.domElement.height,
        dataUrl: "",
        dataset: { ...runtime.container.dataset } as Record<string, string>,
        camera: readCameraEvidence()
      };
    } finally {
      restoreMaterials.forEach(([mesh, material, renderOrder]) => {
        mesh.material = material;
        mesh.renderOrder = renderOrder;
      });
      highlightMaterials.forEach((material) => {
        material.dispose();
      });
      restoreVisibility.forEach(([root, visible]) => {
        root.visible = visible;
      });
      if (restoreVisibility.length > 0 || restoreMaterials.length > 0) {
        runtime.renderer.render(runtime.scene, runtime.camera);
      }
    }
  };
  targetWindow.__auroraAreaRuntimeCapture = {
    captureCanvasFrame: () => {
      return captureFrame();
    },
    captureIsolatedObjectFrame: (objectId: string) => {
      return captureFrame(objectId);
    },
    captureHighlightedObjectFrame: (objectIds: string[]) => {
      return captureFrame(null, objectIds);
    }
  };
}

function uninstallAuroraAreaRuntimeCaptureHook(runtime: RuntimeState): void {
  void runtime;
  const targetWindow = window as typeof window & {
    __auroraAreaRuntimeCapture?: AuroraAreaRuntimeCaptureHook;
  };
  if (targetWindow.__auroraAreaRuntimeCapture) {
    delete targetWindow.__auroraAreaRuntimeCapture;
  }
}

interface PerfSnapshot {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

interface CanvasLoadOverlayState {
  visible: boolean;
  completed: number;
  total: number;
  inFlight: number;
  queued: number;
  source: "areas" | "placeables" | "terrain" | "textures";
  variant: "loading" | "blocked";
  title: string;
  currentLabel: string | null;
}

interface PlaceableModelStatusEventDetailLike {
  status?: string;
  loadPhase?: string;
  loadCompleted?: string | number;
  loadTotal?: string | number;
  url?: string;
}

function updateAxesHelperForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  sceneScale: number
): void {
  const transform = resolveAxesHelperTransform(sceneData.width, sceneData.height, sceneScale);
  runtime.axesHelper.position.set(
    transform.positionX,
    transform.positionY,
    transform.positionZ
  );
  runtime.axesHelper.scale.setScalar(transform.scale);
}

function parsePlaceableLoadProgressValue(value: string | number | undefined): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseRuntimeDatasetCount(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function formatCanvasLoadCurrentLabel(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed, "http://aurora.local");
    candidate = parsed.pathname.split("/").filter(Boolean).pop() ?? trimmed;
  } catch {
    candidate =
      trimmed.split("?")[0]?.split("#")[0]?.split(/[\\/]/u).filter(Boolean).pop() ??
      trimmed;
  }
  const compact = candidate.trim() || "model";
  if (compact.length <= 48) {
    return compact;
  }
  return `${compact.slice(0, 20)}...${compact.slice(-20)}`;
}

function hasActivePlaceableModelLoadQueue(runtime: RuntimeState): boolean {
  const dataset = runtime.container.dataset;
  return (
    parseRuntimeDatasetCount(dataset.placeableModelLoadQueueActiveCount) +
      parseRuntimeDatasetCount(dataset.placeableModelLoadQueuePendingCount) >
    0
  );
}

function isCreaturePreviewCoreRenderable(runtime: RuntimeState): boolean {
  const dataset = runtime.container.dataset;
  const visibleMeshCount = parseRuntimeDatasetCount(
    dataset.creaturePartModelRuntimeVisibleMeshCount
  );
  const mixerCount = parseRuntimeDatasetCount(dataset.creatureAnimationMixerCount);
  const playbackStatuses = String(
    dataset.creatureAnimationMixerPlaybackStatuses ??
      dataset.creatureAnimationRuntimePlaybackStatuses ??
      ""
  )
    .split("|")
    .map((status) => status.trim())
    .filter(Boolean);
  return (
    dataset.placeableModelStatus === "loaded" &&
    visibleMeshCount > 0 &&
    mixerCount > 0 &&
    playbackStatuses.some((status) => status === "playing" || status === "runtime-effects")
  );
}

function createHiddenAssetLoadOverlayState(): CanvasLoadOverlayState {
  return {
    visible: false,
    completed: 0,
    total: 0,
    inFlight: 0,
    queued: 0,
    source: "placeables",
    variant: "loading",
    title: "",
    currentLabel: null
  };
}

function resolveTerrainTileModelOverlayState(
  snapshot: AreaTerrainTileModelRuntimeSnapshot
): CanvasLoadOverlayState {
  const total = Math.max(0, snapshot.contractTileCount);
  const completed = Math.max(0, snapshot.loadedTileCount + snapshot.failedTileCount);
  if (snapshot.pendingTileCount > 0) {
    return {
      visible: true,
      completed,
      total: Math.max(1, total),
      inFlight: Math.max(0, snapshot.pendingTileCount),
      queued: 0,
      source: "terrain",
      variant: "loading",
      title: "Modele kafli Areas",
      currentLabel: null
    };
  }
  if (snapshot.failedTileCount > 0 || snapshot.bridgeTileCount > 0) {
    return {
      visible: true,
      completed,
      total: Math.max(1, snapshot.tileCount),
      inFlight: 0,
      queued: 0,
      source: "terrain",
      variant: "blocked",
      title: "Modele kafli Areas",
      currentLabel: null
    };
  }
  return createHiddenAssetLoadOverlayState();
}

function isAreaSharedRendererModelLoadComplete(
  snapshot: AreaSharedRendererRuntimeSnapshot | null | undefined
): boolean {
  if (!snapshot || snapshot.version !== "aurora-areas-shared-renderer-runtime/v1") {
    return false;
  }
  return (
    snapshot.total > 0 &&
    snapshot.status === "ready" &&
    snapshot.primitiveFallbackCount === 0 &&
    snapshot.blockedIds.length === 0
  );
}

function readAreaSharedRendererRuntimeSnapshot(
  runtime: RuntimeState
): AreaSharedRendererRuntimeSnapshot | null {
  const rawSnapshot = runtime.container.dataset.areaObjectSharedRendererSnapshot;
  if (!rawSnapshot) {
    return null;
  }
  try {
    return JSON.parse(rawSnapshot) as AreaSharedRendererRuntimeSnapshot;
  } catch {
    return null;
  }
}

function isRuntimeAreaSharedRendererModelLoadComplete(runtime: RuntimeState): boolean {
  return isAreaSharedRendererModelLoadComplete(
    readAreaSharedRendererRuntimeSnapshot(runtime)
  );
}

function isPlaceableModelOverlayLoadPhase(loadPhase: string | undefined): boolean {
  if (!loadPhase || loadPhase.trim().length === 0) {
    return true;
  }
  const normalizedLoadPhase = loadPhase.trim().toLowerCase();
  return normalizedLoadPhase === "model" || normalizedLoadPhase === "vfx-chunk-model";
}

function resolveExternalAreaLoadOverlayState(
  areaCanvasLoading: WorkspaceAreaCanvasLoadingState | null | undefined
): CanvasLoadOverlayState {
  if (!areaCanvasLoading) {
    return createHiddenAssetLoadOverlayState();
  }
  const total =
    typeof areaCanvasLoading.total === "number" && Number.isFinite(areaCanvasLoading.total)
      ? Math.max(0, Math.round(areaCanvasLoading.total))
      : 0;
  const completed =
    typeof areaCanvasLoading.completed === "number" &&
    Number.isFinite(areaCanvasLoading.completed)
      ? Math.max(0, Math.min(total, Math.round(areaCanvasLoading.completed)))
      : 0;
  const remaining = Math.max(0, total - completed);
  const requestedInFlight =
    typeof areaCanvasLoading.inFlight === "number" &&
    Number.isFinite(areaCanvasLoading.inFlight)
      ? Math.max(0, Math.round(areaCanvasLoading.inFlight))
      : null;
  const inFlight =
    requestedInFlight !== null
      ? Math.min(remaining, requestedInFlight)
      : remaining > 0
        ? 1
        : 0;
  const requestedQueued =
    typeof areaCanvasLoading.queued === "number" && Number.isFinite(areaCanvasLoading.queued)
      ? Math.max(0, Math.round(areaCanvasLoading.queued))
      : null;
  const queued =
    requestedQueued !== null
      ? Math.min(Math.max(0, remaining - inFlight), requestedQueued)
      : Math.max(0, remaining - inFlight);
  if (total > 0 && remaining === 0 && inFlight === 0 && queued === 0) {
    return createHiddenAssetLoadOverlayState();
  }
  return {
    visible: true,
    completed,
    total,
    inFlight,
    queued,
    source: areaCanvasLoading.source,
    variant: "loading",
    title: areaCanvasLoading.label,
    currentLabel: formatCanvasLoadCurrentLabel(areaCanvasLoading.currentLabel)
  };
}

function resolveCanvasLoadOverlay(
  runtimeOverlay: CanvasLoadOverlayState,
  areaOverlay: CanvasLoadOverlayState
): CanvasLoadOverlayState {
  if (runtimeOverlay.visible && runtimeOverlay.variant === "loading") {
    return runtimeOverlay;
  }
  if (areaOverlay.visible) {
    return areaOverlay;
  }
  return runtimeOverlay;
}

export function formatCanvasLoadOverlayProgress(overlay: CanvasLoadOverlayState): string {
  if (overlay.total > 0) {
    return `Completed ${overlay.completed} / ${overlay.total} / In flight ${overlay.inFlight} / Queued ${overlay.queued}`;
  }
  return "Progress not reported";
}

export function WorkspaceCanvasViewport({
  toolbarState,
  userId,
  sceneViewportPort,
  viewportFacade = defaultViewportFacade,
  trackTelemetryEvent = defaultTrackTelemetryEvent,
  commandSignal,
  sidebarSelectSignal,
  sidebarContextMenuSignal,
  sidebarPropertiesSignal,
  canvasCreateObjectSignal,
  catalogScope,
  workspaceOptions,
  leftPanelWidthPx,
  rightPanelWidthPx,
  onSceneObjectsSnapshotChange,
  onSelectionSnapshotChange,
  onObjectAddPlacementModeChange,
  externalSceneSeed,
  areaEditorMutationSignal,
  areaEditingTool = { kind: "inspect" },
  onAreaSceneDraftChange,
  onSelectedTileChange,
  renderObjectIds,
  areaCanvasLoading,
  areaTileProcessReadiness,
  placeableRenderPayloadByObjectId,
  creatureRenderPayloadByObjectId,
  creatureResourceOptions,
  placeableAssetAccessToken = null,
  onItemPreviewObjectNeeded,
  onItemPropertiesApplied,
  onCreaturePropertiesApplied,
  showGizmoModeBadge = true
}: WorkspaceCanvasViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const sceneRef = useRef<AreaScene | null>(null);
  const observedExternalSceneSeedRef = useRef<AreaScene | null | undefined>(externalSceneSeed);
  const renderAreaGeometryRef = useRef(true);
  const visibleObjectsRef = useRef<SceneObject[]>([]);
  const placeableRenderPayloadByObjectIdRef =
    useRef<Record<string, PlaceableViewportRenderPayload> | null>(null);
  const creatureRenderPayloadByObjectIdRef =
    useRef<Record<string, CreatureViewportRenderPayload> | null>(null);
  const runtimeSoundNowPlayingBadgesRef = useRef<readonly RuntimeSoundNowPlayingBadge[]>([]);
  const showRuntimeSoundNowPlayingRef = useRef(false);
  const toolbarStateRef = useRef(toolbarState);
  const commandRevisionRef = useRef(0);
  const sidebarSelectRevisionRef = useRef<number | null>(null);
  const sidebarContextMenuRevisionRef = useRef<number | null>(null);
  const sidebarPropertiesRevisionRef = useRef<number | null>(null);
  const canvasCreateObjectRevisionRef = useRef<number | null>(null);
  const nextObjectSequenceRef = useRef(1);
  const clipboardObjectsRef = useRef<SceneObject[]>([]);
  const contextMenuRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const placeablePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const placeablePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const soundPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const soundPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const placeableAssetAccessTokenRef = useRef<string | null>(null);
  const doorPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const doorPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const creaturePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const creaturePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const itemPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const itemPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const lastPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const bookmark1Ref = useRef<ThreeCameraBookmark | null>(null);
  const perfFrameRef = useRef({
    frameCount: 0,
    lastAnimationAt: 0,
    lastTick: 0,
    lastRenderAt: 0
  });
  const isCanvasAssetLoadingRef = useRef(false);
  const runtimeObjectPreviewFrameAppliedRef = useRef(false);
  const perfHudEnabledRef = useRef(false);
  const areaObjectDiagnosticsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sceneHistory, setSceneHistory] = useState<SceneHistoryState>(() =>
    externalSceneSeed
      ? sceneViewportPort.createHistoryFromScene(externalSceneSeed)
      : sceneViewportPort.createInitialHistory(userId)
  );
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const selectedObjectIdsRef = useRef<string[]>([]);
  const [tileSelection, setTileSelection] = useState<{ anchorId: string | null; ids: string[] }>({
    anchorId: null,
    ids: []
  });
  const selectedTileId = tileSelection.anchorId;
  const selectedTileIds = tileSelection.ids;
  const setSelectedTileId = useCallback((value: SetStateAction<string | null>) => {
    setTileSelection((current) => {
      const next = typeof value === "function" ? value(current.anchorId) : value;
      return { anchorId: next, ids: next ? [next] : [] };
    });
  }, []);
  const setSelectedTileIds = useCallback((value: SetStateAction<string[]>) => {
    setTileSelection((current) => {
      const requested = typeof value === "function" ? value(current.ids) : value;
      const ids = [...new Set(requested)];
      const anchorId = ids.at(-1) ?? null;
      return current.anchorId === anchorId &&
        current.ids.length === ids.length &&
        current.ids.every((id, index) => id === ids[index])
        ? current
        : { anchorId, ids };
    });
  }, []);
  const [areaPlacementFeedback, setAreaPlacementFeedback] = useState<{
    variant: "success" | "error";
    message: string;
  } | null>(null);
  const terrainBrush: TerrainBrushKind = "corridor";
  const [objectBrush, setObjectBrush] = useState<SceneObjectKind>("placeables");
  const [lastSavedAtUnixMs, setLastSavedAtUnixMs] = useState<number | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const [webglFallbackReason, setWebglFallbackReason] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [adjustLocationDialog, setAdjustLocationDialog] =
    useState<AdjustLocationDialogState | null>(null);
  const [placeablePropertiesDialog, setPlaceablePropertiesDialog] =
    useState<PlaceablePropertiesDialogState | null>(null);
  const [soundPropertiesDialog, setSoundPropertiesDialog] =
    useState<SoundPropertiesDialogState | null>(null);
  const [doorPropertiesDialog, setDoorPropertiesDialog] =
    useState<DoorPropertiesDialogState | null>(null);
  const [creaturePropertiesDialog, setCreaturePropertiesDialog] =
    useState<CreaturePropertiesDialogState | null>(null);
  const [itemPropertiesDialog, setItemPropertiesDialog] =
    useState<ItemPropertiesDialogState | null>(null);
  const [creatureFeatsFilter, setCreatureFeatsFilter] = useState<string>(
    CREATURE_FEAT_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsLevelFilter, setCreatureSpellsLevelFilter] = useState<string>(
    CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsMetaMagicFilter, setCreatureSpellsMetaMagicFilter] = useState<string>(
    CREATURE_METAMAGIC_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsClassFilterIndex, setCreatureSpellsClassFilterIndex] = useState<number>(0);
  const [creatureSpecialAbilitiesFilter, setCreatureSpecialAbilitiesFilter] = useState<string>(
    CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!
  );
  const [runtimePopupPinned, setRuntimePopupPinned] = useState(false);
  const [perfSnapshot, setPerfSnapshot] = useState<PerfSnapshot>({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0
  });
  const [placeableLoadOverlay, setPlaceableLoadOverlay] = useState<CanvasLoadOverlayState>(
    createHiddenAssetLoadOverlayState
  );
  const [areaSharedRendererModelLoadComplete, setAreaSharedRendererModelLoadComplete] =
    useState(false);
  const trackTelemetry = trackTelemetryEvent;
  const scene = sceneHistory.present;
  selectedObjectIdsRef.current = selectedObjectIds;
  placeableRenderPayloadByObjectIdRef.current = placeableRenderPayloadByObjectId ?? null;
  creatureRenderPayloadByObjectIdRef.current = creatureRenderPayloadByObjectId ?? null;
  showRuntimeSoundNowPlayingRef.current = workspaceOptions.showRuntimeSoundNowPlaying;
  useEffect(() => {
    setAreaSharedRendererModelLoadComplete(false);
  }, [scene.sceneId]);
  const areaLoadOverlay = useMemo(
    () => resolveExternalAreaLoadOverlayState(areaCanvasLoading),
    [areaCanvasLoading]
  );
  const effectivePlaceableLoadOverlay = useMemo(
    () =>
      areaSharedRendererModelLoadComplete && placeableLoadOverlay.source === "placeables"
        ? createHiddenAssetLoadOverlayState()
        : placeableLoadOverlay,
    [areaSharedRendererModelLoadComplete, placeableLoadOverlay]
  );
  const canvasLoadOverlay = useMemo(
    () => resolveCanvasLoadOverlay(effectivePlaceableLoadOverlay, areaLoadOverlay),
    [areaLoadOverlay, effectivePlaceableLoadOverlay]
  );
  const isCanvasAssetLoading =
    effectivePlaceableLoadOverlay.visible ||
    (areaLoadOverlay.visible && areaLoadOverlay.variant === "loading");
  useEffect(() => {
    isCanvasAssetLoadingRef.current = isCanvasAssetLoading;
  }, [isCanvasAssetLoading]);
  useEffect(() => {
    perfHudEnabledRef.current = toolbarState.canvasDebug.perfHud;
  }, [toolbarState.canvasDebug.perfHud]);
  const adjustLocationUnitsPerTile = Math.max(1, viewportFacade.defaultMasterCellsPerTile);
  const renderObjectIdsSet = useMemo(
    () => resolveRenderObjectIdsSet(renderObjectIds),
    [renderObjectIds]
  );
  const {
    runtimeSoundNowPlayingBadges,
    playSelectedSoundPreview,
    stopSoundPreviewPlayback
  } = useRuntimeSoundPreview({
    runtimeRef,
    soundListenerRuntimePort: workspaceThreeSoundListenerRuntimePort,
    soundPropertiesDialog,
    sceneObjects: scene.objects,
    toolbarState,
    renderObjectIdsSet,
    unitsPerTile: adjustLocationUnitsPerTile,
    enableRuntimeSoundPreview: workspaceOptions.enableRuntimeSoundPreview
  });
  runtimeSoundNowPlayingBadgesRef.current = runtimeSoundNowPlayingBadges;
  const {
    objectAddPlacementMode,
    objectAddDropFeedback,
    beginObjectAddPlacement,
    cancelObjectAddPlacement,
    placeObjectAddAtSceneCenter,
    handleCanvasDragOver,
    handleCanvasDragLeave,
    handleCanvasDrop,
    handleCanvasObjectAddMouseDown,
    handleCanvasObjectAddMouseMove,
    handleCanvasObjectAddMouseLeave
  } = useWorkspaceObjectAddDragDrop({
    runtimeRef,
    objectAddRuntimePort: workspaceThreeObjectAddRuntimePort,
    scene,
    sceneViewportPort,
    renderObjectIds,
    toolbarState,
    workspaceOptions,
    nextObjectSequenceRef,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    trackTelemetry,
    userId
  });

  useEffect(() => {
    onObjectAddPlacementModeChange?.(
      objectAddPlacementMode
        ? {
            templateId: objectAddPlacementMode.template.id,
            objectKind: objectAddPlacementMode.template.kind,
            tag: objectAddPlacementMode.template.tag
          }
        : null
    );
  }, [objectAddPlacementMode, onObjectAddPlacementModeChange]);

  useEffect(() => {
    onSceneObjectsSnapshotChange?.(scene.objects);
  }, [onSceneObjectsSnapshotChange, scene.objects]);

  useEffect(() => {
    if (!sidebarSelectSignal) {
      return;
    }
    if (sidebarSelectRevisionRef.current === sidebarSelectSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForSidebarSignal({
      objects: scene.objects,
      objectId: sidebarSelectSignal.objectId,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    sidebarSelectRevisionRef.current = sidebarSelectSignal.revision;

    setSelectedTileId(null);
    setSelectedObjectIds((current) =>
      resolveSidebarSelectionIds({
        currentSelectedObjectIds: current,
        selectedObject,
        additive: sidebarSelectSignal.additive,
        allowedObjectIds: sidebarSelectSignal.allowedObjectIds,
        objects: scene.objects,
        toolbarState,
        renderObjectIdsSet
      })
    );
    setContextMenu(null);
    trackTelemetry("scene.selection.from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarSelectSignal.revision,
      additive: sidebarSelectSignal.additive,
      sourceType: sidebarSelectSignal.sourceType
    });
  }, [renderObjectIds, scene.objects, sidebarSelectSignal, toolbarState, userId]);

  useEffect(() => {
    if (!sidebarContextMenuSignal) {
      return;
    }
    if (sidebarContextMenuRevisionRef.current === sidebarContextMenuSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForSidebarSignal({
      objects: scene.objects,
      objectId: sidebarContextMenuSignal.objectId,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    sidebarContextMenuRevisionRef.current = sidebarContextMenuSignal.revision;

    const runtime = runtimeRef.current;
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const anchoredPosition = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          selectedObject,
          selectedObject.id,
          anchorOffsetX,
          anchorOffsetY
        )
      : { x: 24, y: 24 };

    setSelectedTileId(null);
    setSelectedObjectIds((current) =>
      current.includes(selectedObject.id) ? current : [selectedObject.id]
    );
    setContextMenu({
      x: anchoredPosition.x,
      y: anchoredPosition.y,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      anchorOffsetX,
      anchorOffsetY
    });
    trackTelemetry("scene.context_menu.open_from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarContextMenuSignal.revision
    });
  }, [renderObjectIds, scene.objects, sidebarContextMenuSignal, toolbarState, userId]);

  const renderAreaGeometry = useMemo(
    () => shouldRenderAreaGeometry(renderObjectIds),
    [renderObjectIds]
  );
  useEffect(() => {
    sceneRef.current = scene;
  }, [scene]);

  useEffect(() => {
    // A same-scene external update (for example enabling Aurora tile editing)
    // must reach the viewport before its older internal scene is echoed back to
    // WorkspaceLayout. Otherwise the stale draft immediately strips the newly
    // hydrated auroraAreaEditing payload.
    if (
      !shouldPublishWorkspaceAreaSceneDraft(
        externalSceneSeed,
        observedExternalSceneSeedRef.current,
        scene
      )
    ) {
      return;
    }
    onAreaSceneDraftChange?.(scene);
  }, [externalSceneSeed, onAreaSceneDraftChange, scene]);
  useEffect(() => {
    onSelectedTileChange?.(selectedTileId, selectedTileIds);
  }, [onSelectedTileChange, selectedTileId, selectedTileIds]);
  useEffect(() => {
    renderAreaGeometryRef.current = renderAreaGeometry;
  }, [renderAreaGeometry]);
  toolbarStateRef.current = toolbarState;
  const sceneGridVisibility = useMemo(
    () =>
      resolveSceneGridVisibility({
        renderObjectIds,
        gridEnabled: toolbarState.canvasDebug.grid,
        tileOverlayEnabled: workspaceOptions.showTileGridOverlay
      }),
    [renderObjectIds, toolbarState.canvasDebug.grid, workspaceOptions.showTileGridOverlay]
  );
  const terrainRenderStatus = useMemo(() => resolveTerrainRenderStatus(scene), [scene]);
  const terrainScenePackageReadiness = useMemo(
    () => resolveTerrainScenePackageReadiness(scene, terrainRenderStatus),
    [scene, terrainRenderStatus]
  );
  const objectRenderFilterState = useMemo(
    () => ({
      visibility: toolbarState.visibility,
      isolateKind: toolbarState.canvasDebug.isolateKind
    }),
    [
      toolbarState.visibility.creatures,
      toolbarState.visibility.doors,
      toolbarState.visibility.encounters,
      toolbarState.visibility.items,
      toolbarState.visibility.placeables,
      toolbarState.visibility.sounds,
      toolbarState.visibility.stores,
      toolbarState.visibility.triggers,
      toolbarState.visibility.waypoints,
      toolbarState.canvasDebug.isolateKind
    ]
  );

  const visibleObjects = useMemo(
    () =>
      scene.objects.filter(
        (object) =>
          isObjectVisibleWithRenderFilterState(
            object,
            objectRenderFilterState,
            renderObjectIdsSet
          )
      ),
    [objectRenderFilterState, renderObjectIdsSet, scene.objects]
  );
  visibleObjectsRef.current = visibleObjects;
  const areaObjectSharedRendererDiagnostics = useMemo(
    () =>
      resolveAreaObjectBackendRenderContractDiagnostics(
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      ),
    [placeableRenderPayloadByObjectId, visibleObjects]
  );
  const hasAreaPayloadRequestsInFlight =
    isCanvasAssetLoading &&
    areaObjectSharedRendererDiagnostics.total > 0 &&
    areaObjectSharedRendererDiagnostics.payloadReadyCount <
      areaObjectSharedRendererDiagnostics.total;

  const objectById = useMemo(
    () => new Map(scene.objects.map((object) => [object.id, object])),
    [scene.objects]
  );

  const catalogAllowedIdsSet = useMemo(
    () => new Set(catalogScope?.allowedObjectIds ?? scene.objects.map((object) => object.id)),
    [catalogScope?.allowedObjectIds, scene.objects]
  );

  const isSelectableByActiveFilters = useCallback(
    (object: SceneObject) =>
      isObjectSelectableByScope(object, toolbarState.selectionScope) &&
      isObjectSelectableByCatalogScope(object, catalogScope, catalogAllowedIdsSet),
    [catalogAllowedIdsSet, catalogScope, toolbarState.selectionScope]
  );

  const visibleObjectIdsSet = useMemo(
    () => new Set(visibleObjects.map((object) => object.id)),
    [visibleObjects]
  );
  const visibleSelectableSelectedObjectIds = useMemo(
    () =>
      filterSelectedObjectIdsForVisibleSelectableObjects({
        selectedObjectIds,
        objectById,
        visibleObjectIdsSet,
        isSelectableByActiveFilters
      }),
    [isSelectableByActiveFilters, objectById, selectedObjectIds, visibleObjectIdsSet]
  );

  useEffect(() => {
    onSelectionSnapshotChange?.(visibleSelectableSelectedObjectIds);
  }, [onSelectionSnapshotChange, visibleSelectableSelectedObjectIds]);

  const {
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    duplicateObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects
  } = useWorkspaceObjectCommands({
    scene,
    visibleObjects,
    sceneViewportPort,
    selectedObjectIds,
    setSelectedObjectIds,
    setSelectedTileId,
    setSceneHistory,
    toolbarState,
    workspaceOptions,
    userId,
    lastPointerWorldRef,
    nextObjectSequenceRef,
    clipboardObjectsRef,
    trackTelemetry
  });

  const {
    hasClipboardTiles,
    clipboardFeedback,
    clearClipboardFeedback,
    copySelectedTilesToClipboard,
    cutSelectedTilesToClipboard,
    deleteSelectedTiles,
    pasteClipboardTiles
  } = useAuroraAreaTileClipboardCommands({
    scene,
    selectedTileId,
    selectedTileIds,
    sceneViewportPort,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    setSelectedTileIds,
    userId,
    trackTelemetry
  });
  const copyWorkspaceSelectionToClipboard = useCallback(
    (source: string) =>
      copySelectedTilesToClipboard(source)
        ? []
        : copySelectedObjectsToClipboard(source),
    [copySelectedObjectsToClipboard, copySelectedTilesToClipboard]
  );
  const cutWorkspaceSelectionToClipboard = useCallback(
    (source: string) =>
      cutSelectedTilesToClipboard(source)
        ? 1
        : cutSelectedObjectsToClipboard(source),
    [cutSelectedObjectsToClipboard, cutSelectedTilesToClipboard]
  );
  const pasteWorkspaceClipboard = useCallback(
    (source: string) =>
      pasteClipboardTiles(source) ? [] : pasteClipboardObjects(source),
    [pasteClipboardObjects, pasteClipboardTiles]
  );
  const deleteWorkspaceSelection = useCallback(
    (source: string) =>
      deleteSelectedTiles(source) ? 1 : deleteSelectedObjects(source),
    [deleteSelectedObjects, deleteSelectedTiles]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let runtime: RuntimeState;
    try {
      runtime = createRuntime(host);
    } catch {
      setWebglFallbackReason("WebGL runtime is unavailable in this environment.");
      setWebglReady(false);
      trackTelemetry("scene.webgl.init_failed", { userId });
      return;
    }
    runtimeRef.current = runtime;
    installAuroraCreatureProofRuntimeHook(runtime);
    installAuroraAreaRuntimeCaptureHook(runtime);
    const initialPlaceableAssetAccessToken = placeableAssetAccessToken?.trim() || null;
    applyPlaceableAssetRequestHeaders(runtime, initialPlaceableAssetAccessToken);
    placeableAssetAccessTokenRef.current = initialPlaceableAssetAccessToken;
    setWebglFallbackReason(null);
    setWebglReady(true);
    let areaSharedRendererRefreshFrameId: number | null = null;
    let areaSharedRendererRefreshTimeoutId: number | null = null;
    let pendingPlaceableModelLoadQueueProgress:
      | PlaceableModelLoadQueueProgressDetail
      | null = null;
    let placeableModelLoadQueueProgressFrameId: number | null = null;
    let placeableModelLoadQueueProgressTimeoutId: number | null = null;
    let lastAreaSharedRendererEvidenceRefreshAt = 0;

    const flushAreaSharedRendererRuntimeSnapshotRefresh = () => {
      areaSharedRendererRefreshFrameId = null;
      areaSharedRendererRefreshTimeoutId = null;
      safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
    };

    const scheduleAreaSharedRendererRuntimeSnapshotRefresh = () => {
      if (
        areaSharedRendererRefreshFrameId !== null ||
        areaSharedRendererRefreshTimeoutId !== null
      ) {
        return;
      }
      if (typeof window.requestAnimationFrame === "function") {
        areaSharedRendererRefreshFrameId = window.requestAnimationFrame(
          flushAreaSharedRendererRuntimeSnapshotRefresh
        );
        return;
      }
      areaSharedRendererRefreshTimeoutId = window.setTimeout(
        flushAreaSharedRendererRuntimeSnapshotRefresh,
        0
      );
    };

    const processPlaceableModelLoadQueueProgress = () => {
      placeableModelLoadQueueProgressFrameId = null;
      placeableModelLoadQueueProgressTimeoutId = null;
      const detail = pendingPlaceableModelLoadQueueProgress;
      pendingPlaceableModelLoadQueueProgress = null;
      if (!detail || detail.loadTotal <= 0) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (isCreaturePreviewCoreRenderable(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (detail.status === "loading" && detail.loadCompleted < detail.loadTotal) {
        setPlaceableLoadOverlay({
          visible: true,
          completed: Math.max(0, Math.min(detail.loadTotal, detail.loadCompleted)),
          total: detail.loadTotal,
          inFlight: Math.max(0, detail.activeCount),
          queued: Math.max(0, detail.pendingCount),
          source: "placeables",
          variant: "loading",
          title: "Modele PLC/DOR",
          currentLabel: formatCanvasLoadCurrentLabel(detail.currentLabel)
        });
        return;
      }
      setPlaceableLoadOverlay((current) =>
        current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
      );
    };

    const schedulePlaceableModelLoadQueueProgress = (
      detail: PlaceableModelLoadQueueProgressDetail | null | undefined
    ) => {
      pendingPlaceableModelLoadQueueProgress = detail ?? null;
      if (
        placeableModelLoadQueueProgressFrameId !== null ||
        placeableModelLoadQueueProgressTimeoutId !== null
      ) {
        return;
      }
      if (typeof window.requestAnimationFrame === "function") {
        placeableModelLoadQueueProgressFrameId = window.requestAnimationFrame(
          processPlaceableModelLoadQueueProgress
        );
        return;
      }
      placeableModelLoadQueueProgressTimeoutId = window.setTimeout(
        processPlaceableModelLoadQueueProgress,
        0
      );
    };

    const handlePlaceableModelStatus = (event: Event) => {
      const customEvent = event as CustomEvent<PlaceableModelStatusEventDetailLike>;
      const detail = customEvent.detail ?? {};
      scheduleAreaSharedRendererRuntimeSnapshotRefresh();
      if (!hasActivePlaceableModelLoadQueue(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (!isPlaceableModelOverlayLoadPhase(detail.loadPhase)) {
        if (
          isRuntimeAreaSharedRendererModelLoadComplete(runtime) ||
          isCreaturePreviewCoreRenderable(runtime)
        ) {
          setPlaceableLoadOverlay((current) =>
            current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
          );
        }
        return;
      }
      const loadCompletedRaw = parsePlaceableLoadProgressValue(detail.loadCompleted);
      const loadTotalRaw = parsePlaceableLoadProgressValue(detail.loadTotal);
      if (
        loadCompletedRaw !== null &&
        loadTotalRaw !== null &&
        loadTotalRaw > 0 &&
        loadCompletedRaw < loadTotalRaw
      ) {
        const total = Math.max(1, Math.round(loadTotalRaw));
        const completed = Math.max(0, Math.min(total, Math.round(loadCompletedRaw)));
        setPlaceableLoadOverlay({
          visible: true,
          completed,
          total,
          inFlight: total > completed ? 1 : 0,
          queued: Math.max(0, total - completed - 1),
          source: "placeables",
          variant: "loading",
          title: "Modele PLC/DOR",
          currentLabel: formatCanvasLoadCurrentLabel(detail.url)
        });
        return;
      }

      if (
        loadCompletedRaw !== null &&
        loadTotalRaw !== null &&
        loadTotalRaw > 0 &&
        loadCompletedRaw >= loadTotalRaw
      ) {
        if (hasActivePlaceableModelLoadQueue(runtime)) {
          return;
        }
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
      }
    };
    const handlePlaceableModelLoadQueueProgress = (event: Event) => {
      const customEvent = event as CustomEvent<PlaceableModelLoadQueueProgressDetail>;
      scheduleAreaSharedRendererRuntimeSnapshotRefresh();
      schedulePlaceableModelLoadQueueProgress(customEvent.detail);
    };
    const handleTerrainTileModelRuntimeSnapshot = (event: Event) => {
      const customEvent = event as CustomEvent<AreaTerrainTileModelRuntimeSnapshot>;
      const snapshot = customEvent.detail;
      if (!snapshot) {
        return;
      }
      const nextOverlay = resolveTerrainTileModelOverlayState(snapshot);
      setPlaceableLoadOverlay((current) => {
        if (nextOverlay.visible) {
          return nextOverlay;
        }
        return current.source === "terrain" ? createHiddenAssetLoadOverlayState() : current;
      });
    };
    const applyOracleCleanCanvasPresentation = (detail?: {
      displayFog?: boolean | null;
      renderPriorityObjectIds?: string[] | string | null;
      source?: string;
      terrainMaterialMode?: string | null;
      terrainVoidMaskModelResRef?: string | null;
      terrainVoidMaskSourceMesh?: string | null;
      terrainVoidMasksVisible?: boolean | null;
      tileLightsVisible?: boolean | null;
      useAreaLighting?: boolean | null;
    }) => {
      runtime.gridLayer.visible = false;
      runtime.tileOverlayLayer.visible = false;
      runtime.axesHelper.visible = false;
      runtime.gizmoLayer.visible = false;
      runtime.boundsLayer.visible = false;
      runtime.transformControls.detach();
      runtime.transformControls.enabled = false;
      runtime.transformControls.getHelper().visible = false;
      setAreaOracleTileLightMarkersVisible(runtime, false);
      if (detail?.tileLightsVisible === false) {
        setAreaOracleTileLightsVisible(runtime, false);
      }
      if (detail?.displayFog === false) {
        setAreaOracleGlobalFogVisible(runtime, false);
      }
      if (detail?.useAreaLighting === false) {
        setAreaOracleAreaLightingVisible(runtime, false);
      }
      if (typeof detail?.terrainVoidMasksVisible === "boolean") {
        setAreaOracleTerrainVoidMasksVisible(
          runtime,
          detail.terrainVoidMasksVisible,
          {
            modelResRef: detail.terrainVoidMaskModelResRef,
            sourceMesh: detail.terrainVoidMaskSourceMesh
          }
        );
      }
      setAreaOracleTerrainMaterialMode(runtime, detail?.terrainMaterialMode);
      const activeScene = sceneRef.current;
      const renderPriorityObjectIds = normalizeAreaOracleRenderPriorityObjectIds(
        detail?.renderPriorityObjectIds
      );
      runtime.container.dataset.areaOracleRenderPriorityObjectIds =
        renderPriorityObjectIds.join("|");
      if (activeScene) {
        const cleanCanvasDebugState = resolveAreaOracleCleanCanvasDebugState(
          toolbarStateRef.current.canvasDebug
        );
        const sceneScale = sceneViewportPort.getSceneScale(activeScene.width, activeScene.height);
        if (renderPriorityObjectIds.length > 0) {
          rebuildObjectMeshes(
            runtime,
            visibleObjectsRef.current,
            renderPriorityObjectIds,
            cleanCanvasDebugState,
            activeScene.width,
            activeScene.height,
            sceneScale,
            renderAreaGeometryRef.current,
            adjustLocationUnitsPerTile,
            runtimeSoundNowPlayingBadgesRef.current,
            showRuntimeSoundNowPlayingRef.current,
            placeableRenderPayloadByObjectIdRef.current,
            creatureRenderPayloadByObjectIdRef.current
          );
          writePlaceableTwoDaLightRenderDiagnostics(runtime);
          writeAuroraScenePointLightDiagnostics(runtime);
          safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
          scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
        }
        updateObjectMeshSelectionState(
          runtime,
          visibleObjectsRef.current,
          [],
          cleanCanvasDebugState,
          sceneScale,
          renderAreaGeometryRef.current
        );
      }
      runtime.scene.background = new THREE.Color(0x000000);
      runtime.renderer.setClearColor(0x000000, 1);
      runtime.container.dataset.areaOracleCleanCanvas = "true";
      runtime.container.dataset.areaOracleCleanCanvasSource =
        detail?.source ?? "runtime";
      runtime.container.dataset.areaOracleSelectionVisuals = "hidden";
      runtime.container.dataset.areaOracleEditorLayersVisible = "false";
    };
    const handleOracleTopDownCamera = (event: Event) => {
      const customEvent = event as CustomEvent<{
        cleanCanvas?: boolean;
        displayFog?: boolean | null;
        distance?: number | string;
        renderPriorityObjectIds?: string[] | string | null;
        source?: string;
        targetX?: number | string;
        targetY?: number | string;
        targetZ?: number | string;
        terrainMaterialMode?: string | null;
        terrainVoidMaskModelResRef?: string | null;
        terrainVoidMaskSourceMesh?: string | null;
        terrainVoidMasksVisible?: boolean | null;
        tileLightsVisible?: boolean | null;
        useAreaLighting?: boolean | null;
      }>;
      const activeScene = sceneRef.current;
      if (!activeScene) {
        return;
      }
      const targetX = parsePlaceableLoadProgressValue(customEvent.detail?.targetX);
      const targetY = parsePlaceableLoadProgressValue(customEvent.detail?.targetY);
      const targetZ = parsePlaceableLoadProgressValue(customEvent.detail?.targetZ);
      const distance = parsePlaceableLoadProgressValue(customEvent.detail?.distance);
      setTopDownOracleCameraForScene(runtime, activeScene, {
        objectPreview: !renderAreaGeometryRef.current,
        ...(targetX !== null ? { topDownTargetX: targetX } : {}),
        ...(targetY !== null ? { topDownTargetY: targetY } : {}),
        ...(targetZ !== null ? { topDownTargetZ: targetZ } : {}),
        ...(distance !== null ? { topDownDistance: distance } : {})
      });
      applyTopDownOracleCameraLock(runtime);
      if (customEvent.detail?.cleanCanvas === true) {
        applyOracleCleanCanvasPresentation(customEvent.detail);
      }
      runtime.renderer.render(runtime.scene, runtime.camera);
    };
    const handleFocusedPerspectiveCamera = (event: Event) => {
      const customEvent = event as CustomEvent<{
        cleanCanvas?: boolean;
        displayFog?: boolean | null;
        distance?: number | string;
        elevationDegrees?: number | string;
        renderPriorityObjectIds?: string[] | string | null;
        source?: string;
        targetX?: number | string;
        targetY?: number | string;
        targetZ?: number | string;
        terrainMaterialMode?: string | null;
        terrainVoidMaskModelResRef?: string | null;
        terrainVoidMaskSourceMesh?: string | null;
        terrainVoidMasksVisible?: boolean | null;
        tileLightsVisible?: boolean | null;
        useAreaLighting?: boolean | null;
        yawDegrees?: number | string;
      }>;
      const targetX = parsePlaceableLoadProgressValue(customEvent.detail?.targetX);
      const targetY = parsePlaceableLoadProgressValue(customEvent.detail?.targetY) ?? 0.22;
      const targetZ = parsePlaceableLoadProgressValue(customEvent.detail?.targetZ);
      const distance = Math.max(
        0.8,
        parsePlaceableLoadProgressValue(customEvent.detail?.distance) ?? 3.2
      );
      const yawRadians = THREE.MathUtils.degToRad(
        parsePlaceableLoadProgressValue(customEvent.detail?.yawDegrees) ?? 45
      );
      const elevationRadians = THREE.MathUtils.degToRad(
        parsePlaceableLoadProgressValue(customEvent.detail?.elevationDegrees) ?? 52
      );
      if (targetX === null || targetZ === null) {
        return;
      }
      const horizontalDistance = Math.max(0.05, Math.cos(elevationRadians) * distance);
      const target = new THREE.Vector3(targetX, targetY, targetZ);
      runtime.controls.target.copy(target);
      runtime.camera.up.set(0, 1, 0).normalize();
      runtime.camera.position.set(
        target.x + Math.cos(yawRadians) * horizontalDistance,
        target.y + Math.sin(elevationRadians) * distance,
        target.z + Math.sin(yawRadians) * horizontalDistance
      );
      runtime.camera.lookAt(target);
      runtime.camera.near = Math.max(0.05, Math.min(0.25, distance * 0.04));
      runtime.camera.far = Math.max(1000, distance * 48);
      runtime.camera.updateProjectionMatrix();
      runtime.camera.updateMatrixWorld(true);
      runtime.controls.update();
      runtime.container.dataset.areaCameraFrameStatus = "focused-perspective";
      runtime.container.dataset.areaCameraFrameMode = "focused_perspective";
      runtime.container.dataset.areaCameraFrameSource =
        customEvent.detail?.source ?? "runtime";
      runtime.container.dataset.areaCameraFrameTarget = `${target.x.toFixed(3)},${target.y.toFixed(3)},${target.z.toFixed(3)}`;
      runtime.container.dataset.areaCameraFrameDistance = distance.toFixed(3);
      runtime.container.dataset.areaCameraFrameSize = "focused";
      runtime.container.dataset.areaCameraFrameZoomRange =
        `${runtime.controls.minDistance.toFixed(3)}..${runtime.controls.maxDistance.toFixed(3)}`;
      const focusedDirection = new THREE.Vector3();
      runtime.camera.getWorldDirection(focusedDirection);
      runtime.container.dataset.areaCameraFrameFov = runtime.camera.fov.toFixed(3);
      runtime.container.dataset.areaCameraFramePosition = formatAreaRuntimeVectorDataset(
        runtime.camera.position
      );
      runtime.container.dataset.areaCameraFrameActualTarget = formatAreaRuntimeVectorDataset(
        runtime.controls.target
      );
      runtime.container.dataset.areaCameraFrameUp = formatAreaRuntimeVectorDataset(
        runtime.camera.up
      );
      runtime.container.dataset.areaCameraFrameDirection =
        formatAreaRuntimeVectorDataset(focusedDirection);
      runtime.container.dataset.areaCameraFrameActualDistance =
        runtime.camera.position.distanceTo(runtime.controls.target).toFixed(3);
      if (customEvent.detail?.cleanCanvas === true) {
        applyOracleCleanCanvasPresentation(customEvent.detail);
      }
      runtime.renderer.render(runtime.scene, runtime.camera);
    };
    const handleOracleRenderVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{
        objectsVisible?: boolean;
        source?: string;
      }>;
      const objectsVisible = customEvent.detail?.objectsVisible !== false;
      runtime.objectLayer.visible = objectsVisible;
      runtime.container.dataset.areaOracleRenderVisibility = objectsVisible ? "all" : "terrain_only";
      runtime.container.dataset.areaOracleObjectLayerVisible = objectsVisible ? "true" : "false";
      runtime.container.dataset.areaOracleRenderVisibilitySource =
        customEvent.detail?.source ?? "runtime";
      applyTopDownOracleCameraLock(runtime);
      runtime.renderer.render(runtime.scene, runtime.camera);
    };
    const handleAreaSharedRendererSnapshot = (event: Event) => {
      const customEvent = event as CustomEvent<AreaSharedRendererRuntimeSnapshot>;
      if (!isAreaSharedRendererModelLoadComplete(customEvent.detail)) {
        return;
      }
      setAreaSharedRendererModelLoadComplete(true);
      setPlaceableLoadOverlay((current) =>
        current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
      );
    };
    const handleItemVisualProofRequest = (event: Event) => {
      const customEvent = event as CustomEvent<{ label?: string }>;
      const label = customEvent.detail?.label ?? "";
      runtime.container.dataset.itemVisualProofLastRequestLabel = label;
      runtime.container.dataset.itemVisualProofRequestCount = String(
        parseRuntimeDatasetCount(runtime.container.dataset.itemVisualProofRequestCount) + 1
      );
      delete runtime.container.dataset.itemVisualProofSnapshotError;
      try {
        runtime.renderer.render(runtime.scene, runtime.camera);
        buildItemVisualProofSnapshot(
          runtime,
          sceneRef.current,
          visibleObjectsRef.current,
          selectedObjectIdsRef.current,
          {
            label,
            renderAreaGeometry: renderAreaGeometryRef.current
          }
        );
      } catch (error) {
        runtime.container.dataset.itemVisualProofSnapshotError =
          error instanceof Error ? error.message : String(error);
      }
    };
    const handleWheelCapture = (event: globalThis.WheelEvent) => {
      if (
        shouldConsumeCanvasWheelForCamera(runtime, event.deltaY, {
          loading: isCanvasAssetLoadingRef.current
        })
      ) {
        return;
      }
      event.stopImmediatePropagation();
    };
    const wheelCaptureOptions: AddEventListenerOptions = { capture: true, passive: false };
    runtime.container.addEventListener(PLACEABLE_MODEL_STATUS_EVENT, handlePlaceableModelStatus);
    runtime.container.addEventListener(
      PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
      handlePlaceableModelLoadQueueProgress
    );
    runtime.container.addEventListener(
      AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
      handleTerrainTileModelRuntimeSnapshot
    );
    runtime.container.addEventListener(
      AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT,
      handleFocusedPerspectiveCamera
    );
    runtime.container.addEventListener(
      AREA_ORACLE_TOP_DOWN_CAMERA_EVENT,
      handleOracleTopDownCamera
    );
    runtime.container.addEventListener(
      AREA_ORACLE_RENDER_VISIBILITY_EVENT,
      handleOracleRenderVisibility
    );
    runtime.container.addEventListener(
      AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
      handleAreaSharedRendererSnapshot
    );
    runtime.container.addEventListener(
      ITEM_VISUAL_PROOF_REQUEST_EVENT,
      handleItemVisualProofRequest
    );
    runtime.container.dataset.itemVisualProofRequestListener = "ready";
    runtime.renderer.domElement.addEventListener(
      "wheel",
      handleWheelCapture,
      wheelCaptureOptions
    );

    resizeRuntime(runtime);
    centerCameraForScene(runtime, scene, { objectPreview: !renderAreaGeometry });
    runtimeObjectPreviewFrameAppliedRef.current = false;
    perfFrameRef.current = {
      frameCount: 0,
      lastAnimationAt: performance.now(),
      lastTick: performance.now(),
      lastRenderAt: 0
    };

    const animate = () => {
      const now = performance.now();
      const animationDeltaSeconds =
        (now - perfFrameRef.current.lastAnimationAt) / 1000;
      perfFrameRef.current.lastAnimationAt = now;
      updateRuntimeObjectAnimationPlaybacks(runtime, animationDeltaSeconds);
      if (renderAreaGeometry && now - lastAreaSharedRendererEvidenceRefreshAt >= 500) {
        lastAreaSharedRendererEvidenceRefreshAt = now;
        safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
      }
      const assetLoading = isCanvasAssetLoadingRef.current;
      if (!assetLoading) {
        if (!renderAreaGeometry && !runtimeObjectPreviewFrameAppliedRef.current) {
          runtimeObjectPreviewFrameAppliedRef.current =
            centerCameraForRuntimeObjectPreview(runtime);
        }
        runtime.controls.update();
      }
      applyTopDownOracleCameraLock(runtime);
      const shouldRenderFrame =
        !assetLoading ||
        now - perfFrameRef.current.lastRenderAt >= ASSET_LOADING_RENDER_INTERVAL_MS;
      if (shouldRenderFrame) {
        runtime.renderer.render(runtime.scene, runtime.camera);
        perfFrameRef.current.lastRenderAt = now;
        perfFrameRef.current.frameCount += 1;
      }
      const elapsedMs = now - perfFrameRef.current.lastTick;
      if (elapsedMs >= PERF_SNAPSHOT_INTERVAL_MS) {
        if (perfHudEnabledRef.current) {
          const fps = Math.round((perfFrameRef.current.frameCount * 1000) / elapsedMs);
          setPerfSnapshot({
            fps,
            drawCalls: runtime.renderer.info.render.calls,
            triangles: runtime.renderer.info.render.triangles,
            geometries: runtime.renderer.info.memory.geometries,
            textures: runtime.renderer.info.memory.textures
          });
        }
        perfFrameRef.current.frameCount = 0;
        perfFrameRef.current.lastTick = now;
      }
      runtime.frameId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeRuntime(runtime);
          })
        : null;
    resizeObserver?.observe(host);
    runtime.resizeObserver = resizeObserver;

    const onWindowResize = () => resizeRuntime(runtime);
    window.addEventListener("resize", onWindowResize);

    return () => {
      uninstallAuroraCreatureProofRuntimeHook(runtime);
      uninstallAuroraAreaRuntimeCaptureHook(runtime);
      window.removeEventListener("resize", onWindowResize);
      runtime.container.removeEventListener(
        PLACEABLE_MODEL_STATUS_EVENT,
        handlePlaceableModelStatus
      );
      runtime.container.removeEventListener(
        PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
        handlePlaceableModelLoadQueueProgress
      );
      runtime.container.removeEventListener(
        AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
        handleTerrainTileModelRuntimeSnapshot
      );
      runtime.container.removeEventListener(
        AREA_FOCUSED_PERSPECTIVE_CAMERA_EVENT,
        handleFocusedPerspectiveCamera
      );
      runtime.container.removeEventListener(
        AREA_ORACLE_TOP_DOWN_CAMERA_EVENT,
        handleOracleTopDownCamera
      );
      runtime.container.removeEventListener(
        AREA_ORACLE_RENDER_VISIBILITY_EVENT,
        handleOracleRenderVisibility
      );
      runtime.container.removeEventListener(
        AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
        handleAreaSharedRendererSnapshot
      );
      runtime.container.removeEventListener(
        ITEM_VISUAL_PROOF_REQUEST_EVENT,
        handleItemVisualProofRequest
      );
      delete runtime.container.dataset.itemVisualProofRequestListener;
      runtime.renderer.domElement.removeEventListener(
        "wheel",
        handleWheelCapture,
        wheelCaptureOptions
      );
      if (areaSharedRendererRefreshFrameId !== null) {
        window.cancelAnimationFrame(areaSharedRendererRefreshFrameId);
      }
      if (areaSharedRendererRefreshTimeoutId !== null) {
        window.clearTimeout(areaSharedRendererRefreshTimeoutId);
      }
      if (placeableModelLoadQueueProgressFrameId !== null) {
        window.cancelAnimationFrame(placeableModelLoadQueueProgressFrameId);
      }
      if (placeableModelLoadQueueProgressTimeoutId !== null) {
        window.clearTimeout(placeableModelLoadQueueProgressTimeoutId);
      }
      disposeRuntime(runtime);
      runtimeRef.current = null;
      setWebglReady(false);
      setPlaceableLoadOverlay(createHiddenAssetLoadOverlayState());
    };
  }, [userId]);

  useEffect(() => {
    applyWorkspaceRuntimeLightBudget(runtimeRef.current, workspaceOptions.runtimeMaxLights);
  }, [workspaceOptions.runtimeMaxLights]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const normalizedToken = placeableAssetAccessToken?.trim() || null;
    applyPlaceableAssetRequestHeaders(runtime, normalizedToken);
    if (placeableAssetAccessTokenRef.current !== normalizedToken) {
      runtime.placeableModelCacheByUrl.clear();
      runtime.placeableModelPendingByUrl.clear();
      clearPlaceableModelLoadQueue(runtime);
      runtime.placeableTextureCacheByUrl.clear();
      runtime.placeableTexturePendingByUrl.clear();
      clearPlaceableTextureLoadQueue(runtime);
      placeableAssetAccessTokenRef.current = normalizedToken;
    }
  }, [placeableAssetAccessToken]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const setCtrlPan = (ctrlPanEnabled: boolean) => {
      applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled });
    };

    setCtrlPan(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(false);
      }
    };

    const handleWindowBlur = () => {
      setCtrlPan(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      setCtrlPan(false);
    };
  }, []);

  useEffect(() => {
    if (!placeableLoadOverlay.visible) {
      return;
    }
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (isRuntimeAreaSharedRendererModelLoadComplete(runtime)) {
        setAreaSharedRendererModelLoadComplete(true);
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (isCreaturePreviewCoreRenderable(runtime)) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
        return;
      }
      if (
        !hasActivePlaceableModelLoadQueue(runtime) &&
        runtime.placeableModelPendingByUrl.size === 0
      ) {
        setPlaceableLoadOverlay((current) =>
          current.source === "placeables" ? createHiddenAssetLoadOverlayState() : current
        );
      }
    }, 220);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [placeableLoadOverlay.visible]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.controls.enabled = !effectivePlaceableLoadOverlay.visible;
    if (!effectivePlaceableLoadOverlay.visible && areaLoadOverlay.visible) {
      runtime.controls.enabled = false;
    }
    runtime.container.dataset.areaCanvasInteractionBlocked = isCanvasAssetLoading
      ? "asset-loading"
      : "false";
    runtime.container.dataset.areaCanvasInteractionBlockedSource = isCanvasAssetLoading
      ? canvasLoadOverlay.source
      : "";
    runtime.renderer.domElement.style.cursor = effectivePlaceableLoadOverlay.visible
      ? "progress"
      : areaLoadOverlay.visible
        ? "progress"
        : "crosshair";
    if (!isCanvasAssetLoading) {
      runtime.controls.update();
    }

    return () => {
      runtime.controls.enabled = true;
      runtime.container.dataset.areaCanvasInteractionBlocked = "false";
      runtime.container.dataset.areaCanvasInteractionBlockedSource = "";
      runtime.renderer.domElement.style.cursor = "crosshair";
    };
  }, [
    areaLoadOverlay.visible,
    canvasLoadOverlay.source,
    effectivePlaceableLoadOverlay.visible,
    isCanvasAssetLoading,
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.controls.rotateSpeed = workspaceOptions.cameraRotateSpeed;
    runtime.controls.zoomSpeed = workspaceOptions.cameraZoomSpeed;
    runtime.controls.panSpeed = workspaceOptions.cameraPanSpeed;
    runtime.controls.enableDamping = true;
    runtime.controls.dampingFactor = workspaceOptions.cameraDampingFactor;
    runtime.controls.update();
  }, [
    workspaceOptions.cameraDampingFactor,
    workspaceOptions.cameraPanSpeed,
    workspaceOptions.cameraRotateSpeed,
    workspaceOptions.cameraZoomSpeed
  ]);

  useEffect(() => {
    if (externalSceneSeed) {
      return;
    }
    setSceneHistory(sceneViewportPort.createInitialHistory(userId));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = 0;
  }, [externalSceneSeed, sceneViewportPort, userId]);

  useEffect(() => {
    if (!externalSceneSeed) {
      observedExternalSceneSeedRef.current = externalSceneSeed;
      return;
    }
    const shouldApply = shouldApplyWorkspaceExternalSceneSeed(
      observedExternalSceneSeedRef.current,
      externalSceneSeed,
      sceneRef.current
    );
    observedExternalSceneSeedRef.current = externalSceneSeed;
    if (!shouldApply) {
      return;
    }
    setSceneHistory(sceneViewportPort.createHistoryFromScene(externalSceneSeed));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = 0;
    const runtime = runtimeRef.current;
    if (runtime) {
      centerCameraForScene(runtime, externalSceneSeed, {
        objectPreview: !shouldRenderAreaGeometry(renderObjectIds)
      });
    }
  }, [externalSceneSeed, renderObjectIds, sceneViewportPort]);

  useWorkspaceAreaEditorMutationSignal(
    areaEditorMutationSignal,
    scene.sceneId,
    sceneViewportPort,
    setSceneHistory,
    setSelectedTileId
  );

  useEffect(() => {
    nextObjectSequenceRef.current = scene.objects.length + 1;
  }, [scene.objects.length]);

  useEffect(() => {
    const scopedKind = OBJECT_KIND_BY_SCOPE[toolbarState.selectionScope];
    if (scopedKind) {
      setObjectBrush(scopedKind);
    }
  }, [toolbarState.selectionScope]);

  useEffect(() => {
    setSelectedObjectIds((current) =>
      filterSelectedObjectIdsForVisibleSelectableObjects({
        selectedObjectIds: current,
        objectById,
        visibleObjectIdsSet,
        isSelectableByActiveFilters
      })
    );
  }, [isSelectableByActiveFilters, objectById, visibleObjectIdsSet]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);

    const areaOracleCleanCanvasActive =
      runtime.container.dataset.areaOracleCleanCanvas === "true";
    rebuildGridLayer(runtime, scene, viewportFacade, sceneGridVisibility.renderTileOverlayLayer);
    runtime.gridLayer.visible = areaOracleCleanCanvasActive
      ? false
      : sceneGridVisibility.renderGridLayer;
    runtime.tileOverlayLayer.visible = areaOracleCleanCanvasActive
      ? false
      : sceneGridVisibility.renderTileOverlayLayer;
    writeAreaTileOverlayRuntimeDiagnostics(runtime, {
      optionEnabled: workspaceOptions.showTileGridOverlay,
      renderLayerVisible: sceneGridVisibility.renderTileOverlayLayer
    });
    runtime.axesHelper.visible = areaOracleCleanCanvasActive
      ? false
      : toolbarState.canvasDebug.axes;
    updateAxesHelperForScene(runtime, scene, sceneScale);

    if (renderAreaGeometry) {
      rebuildTerrainMesh(
        runtime,
        scene,
        selectedTileId,
        toolbarState.canvasDebug,
        areaTileProcessReadiness ?? null
      );
      rebuildChunkBounds(runtime, scene, toolbarState.canvasDebug.chunkBounds);
    } else {
      clearTerrainMesh(runtime);
      rebuildChunkBounds(runtime, scene, false);
    }

    writeAreaTileProcessRuntimeDiagnostics(runtime, areaTileProcessReadiness ?? null);
    writeAuroraScenePointLightDiagnostics(runtime);
  }, [
    renderAreaGeometry,
    sceneGridVisibility,
    sceneViewportPort,
    scene,
    selectedTileId,
    toolbarState.canvasDebug.axes,
    toolbarState.canvasDebug.chunkBounds,
    toolbarState.canvasDebug.ceilingMeshes,
    toolbarState.canvasDebug.displayFog,
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.textureCompression,
    toolbarState.canvasDebug.textures,
    toolbarState.canvasDebug.useAreaLighting,
    toolbarState.canvasDebug.walkmeshOverlay,
    toolbarState.canvasDebug.wireframe,
    workspaceOptions.showTileGridOverlay,
    workspaceOptions.runtimeMaxLights,
    areaTileProcessReadiness,
    placeableAssetAccessToken,
    viewportFacade
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const areaOracleCleanCanvasActive =
      runtime.container.dataset.areaOracleCleanCanvas === "true";
    const renderSelectedObjectIds = areaOracleCleanCanvasActive
      ? readAreaOracleRenderPriorityObjectIds(runtime)
      : selectedObjectIdsRef.current;
    const objectMeshDebugState = areaOracleCleanCanvasActive
      ? resolveAreaOracleCleanCanvasDebugState(toolbarState.canvasDebug)
      : toolbarState.canvasDebug;

    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      renderSelectedObjectIds,
      objectMeshDebugState,
      scene.width,
      scene.height,
      sceneScale,
      renderAreaGeometry,
      adjustLocationUnitsPerTile,
      runtimeSoundNowPlayingBadges,
      workspaceOptions.showRuntimeSoundNowPlaying,
      placeableRenderPayloadByObjectId ?? null,
      creatureRenderPayloadByObjectId ?? null
    );
    writePlaceableTwoDaLightRenderDiagnostics(runtime);
    writeAuroraScenePointLightDiagnostics(runtime);
    safeRefreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
    scheduleAreaSharedRendererRuntimeSnapshotEvidenceRefresh(runtime);
    if (!renderAreaGeometry) {
      framePlaceablesVfxPreviewIfNeeded(
        runtime,
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      );
      writeSinglePlaceablesVfxPreviewDiagnostics(
        runtime,
        visibleObjects,
        placeableRenderPayloadByObjectId ?? null
      );
    } else {
      clearPlaceablesVfxPreviewDrawMetrics(runtime);
    }
  }, [
    renderAreaGeometry,
    scene.width,
    scene.height,
    sceneViewportPort,
    toolbarState.canvasDebug.bounds,
    toolbarState.canvasDebug.collisionOverlay,
    toolbarState.canvasDebug.displayShadows,
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.lockedKinds.creatures,
    toolbarState.canvasDebug.lockedKinds.doors,
    toolbarState.canvasDebug.lockedKinds.encounters,
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds,
    toolbarState.canvasDebug.lockedKinds.stores,
    toolbarState.canvasDebug.lockedKinds.triggers,
    toolbarState.canvasDebug.lockedKinds.waypoints,
    toolbarState.canvasDebug.objectLabels,
    toolbarState.canvasDebug.showNonRenderMeshes,
    toolbarState.canvasDebug.showVtPhysicalAnchor,
    toolbarState.canvasDebug.statusMap,
    toolbarState.canvasDebug.textures,
    toolbarState.canvasDebug.wireframe,
    visibleObjects,
    adjustLocationUnitsPerTile,
    runtimeSoundNowPlayingBadges,
    placeableRenderPayloadByObjectId,
    creatureRenderPayloadByObjectId,
    workspaceOptions.runtimeMaxLights,
    workspaceOptions.showRuntimeSoundNowPlaying
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const renderSelectedObjectIds =
      runtime.container.dataset.areaOracleCleanCanvas === "true"
        ? []
        : selectedObjectIds;
    const objectMeshDebugState =
      runtime.container.dataset.areaOracleCleanCanvas === "true"
        ? resolveAreaOracleCleanCanvasDebugState(toolbarState.canvasDebug)
        : toolbarState.canvasDebug;
    updateObjectMeshSelectionState(
      runtime,
      visibleObjects,
      renderSelectedObjectIds,
      objectMeshDebugState,
      sceneScale,
      renderAreaGeometry
    );
  }, [
    renderAreaGeometry,
    scene.width,
    scene.height,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug,
    visibleObjects
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    if (areaObjectDiagnosticsTimerRef.current !== null) {
      clearTimeout(areaObjectDiagnosticsTimerRef.current);
    }
    areaObjectDiagnosticsTimerRef.current = setTimeout(() => {
      if (!runtimeRef.current) {
        return;
      }
      writePlaceableTwoDaLightRenderDiagnostics(runtimeRef.current);
      writeSoundRenderDiagnostics(runtimeRef.current);
      writeAuroraScenePointLightDiagnostics(runtimeRef.current);
      writeAreaObjectSourceDiagnostics(
        runtimeRef.current,
        visibleObjects,
        selectedObjectIds,
        placeableRenderPayloadByObjectId ?? null,
        creatureRenderPayloadByObjectId ?? null
      );
      areaObjectDiagnosticsTimerRef.current = null;
    }, AREA_OBJECT_RUNTIME_DIAGNOSTICS_DEBOUNCE_MS);

    return () => {
      if (areaObjectDiagnosticsTimerRef.current !== null) {
        clearTimeout(areaObjectDiagnosticsTimerRef.current);
        areaObjectDiagnosticsTimerRef.current = null;
      }
    };
  }, [
    selectedObjectIds,
    visibleObjects,
    placeableRenderPayloadByObjectId,
    creatureRenderPayloadByObjectId
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    const objectRenderScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);

    rebuildGizmoOverlay(
      runtime,
      selectedObjectIds,
      objectById,
      toolbarState.canvasDebug,
      objectRenderScale
    );
  }, [
    objectById,
    renderAreaGeometry,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug.gizmoMode,
    toolbarState.canvasDebug.lockedKinds.creatures,
    toolbarState.canvasDebug.lockedKinds.doors,
    toolbarState.canvasDebug.lockedKinds.encounters,
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds,
    toolbarState.canvasDebug.lockedKinds.stores,
    toolbarState.canvasDebug.lockedKinds.triggers,
    toolbarState.canvasDebug.lockedKinds.waypoints
  ]);

  useWorkspaceTransformControls({
    runtimeRef,
    transformRuntimePort: workspaceThreeTransformRuntimePort,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    objectById,
    visibleObjects,
    toolbarState,
    setSceneHistory,
    setSelectedTileId,
    trackTelemetry,
    userId
  });

  const focusCameraOnWorldPoint = useCallback((worldX: number, worldY: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    focusCameraOnPoint(runtime, worldX, worldY);
  }, []);

  useWorkspaceCommandSignal({
    commandSignal,
    commandRevisionRef,
    runtimeRef,
    bookmark1Ref,
    cameraRuntimePort: workspaceThreeCameraRuntimePort,
    scene,
    sceneViewportPort,
    setSceneHistory,
    setSelectedObjectIds,
    setSelectedTileId,
    setLastSavedAtUnixMs,
    copySelectedObjectsToClipboard: copyWorkspaceSelectionToClipboard,
    deleteSelectedObjects: deleteWorkspaceSelection,
    duplicateObjects,
    isSelectableByActiveFilters,
    renderAreaGeometry,
    selectedObjectIds,
    toolbarState,
    userId,
    visibleObjects,
    trackTelemetry
  });

  useWorkspaceKeyboardObjectActions({
    selectedObjectCount: visibleSelectableSelectedObjectIds.length + selectedTileIds.length,
    toolbarState,
    workspaceOptions,
    copySelectedObjectsToClipboard: copyWorkspaceSelectionToClipboard,
    cutSelectedObjectsToClipboard: cutWorkspaceSelectionToClipboard,
    deleteSelectedObjects: deleteWorkspaceSelection,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects: pasteWorkspaceClipboard
  });

  const { handleMouseDown, handleMouseMove, handleMouseUp, handleMouseLeave } = useWorkspacePointerSelection({
    runtimeRef,
    pointerRuntimePort: workspaceThreePointerRuntimePort,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    scene,
    sceneViewportPort,
    viewportFacade,
    visibleObjects,
    selectedObjectIds,
    selectedTileIds,
    selectionBox,
    setSelectionBox,
    setSelectedObjectIds,
    setSelectedTileId,
    setSelectedTileIds,
    setSceneHistory,
    setContextMenu,
    toolbarState,
    workspaceOptions,
    objectBrush,
    terrainBrush,
    areaEditingTool,
    syncAuroraAreaPlacementPreview: syncAreaTilePlacementPreviewOverlay,
    clearAuroraAreaPlacementPreview: clearAreaTilePlacementPreviewOverlay,
    onAuroraAreaEditingFeedback: (feedback) => {
      clearClipboardFeedback();
      setAreaPlacementFeedback(feedback);
    },
    lastPointerWorldRef,
    nextObjectSequenceRef,
    isSelectableByActiveFilters,
    moveSelectedObjectsByDelta,
    trackTelemetry,
    userId
  });

  const blockCanvasPointerWhileLoading = useCallback((event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);
  const canvasObjectAddMouseDownHandledRef = useRef(false);

  const canUseAreaGridPointerWhileAssetsLoad = useCallback(() => {
    const runtime = runtimeRef.current;
    return canUseAuroraAreaGridPointerDuringAssetLoading({
      scene,
      selectionMode: toolbarState.selectionMode,
      areaEditingTool,
      objectAddPlacementActive: objectAddPlacementMode !== null,
      transformInteractionActive: runtime
        ? workspaceThreePointerRuntimePort.isTransformInteractionActive(runtime)
        : false
    });
  }, [areaEditingTool, objectAddPlacementMode, runtimeRef, scene, toolbarState.selectionMode]);

  const shouldBlockCanvasPointerForAssetLoading = useCallback(
    () => isCanvasAssetLoading && !canUseAreaGridPointerWhileAssetsLoad(),
    [canUseAreaGridPointerWhileAssetsLoad, isCanvasAssetLoading]
  );

  const handleCanvasMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const blockedForAssetLoading = shouldBlockCanvasPointerForAssetLoading();
      if (blockedForAssetLoading) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (handleCanvasObjectAddMouseDown(event)) {
        canvasObjectAddMouseDownHandledRef.current = event.button === 0;
        return;
      }
      handleMouseDown(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleCanvasObjectAddMouseDown,
      handleMouseDown,
      shouldBlockCanvasPointerForAssetLoading
    ]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (canvasObjectAddMouseDownHandledRef.current) {
        canvasObjectAddMouseDownHandledRef.current = false;
        return;
      }
      if (handleCanvasObjectAddMouseDown(event)) {
        return;
      }
    },
    [handleCanvasObjectAddMouseDown]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldBlockCanvasPointerForAssetLoading()) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (handleCanvasObjectAddMouseMove(event)) {
        return;
      }
      handleMouseMove(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleCanvasObjectAddMouseMove,
      handleMouseMove,
      shouldBlockCanvasPointerForAssetLoading
    ]
  );

  const handleCanvasMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (shouldBlockCanvasPointerForAssetLoading()) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      handleMouseUp(event);
    },
    [blockCanvasPointerWhileLoading, handleMouseUp, shouldBlockCanvasPointerForAssetLoading]
  );

  const handleCanvasMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (handleCanvasObjectAddMouseLeave()) {
        return;
      }
      handleMouseLeave();
      handleCanvasMouseUp(event);
    },
    [handleCanvasMouseUp, handleCanvasObjectAddMouseLeave, handleMouseLeave]
  );

  const handleCanvasWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (
        !shouldConsumeCanvasWheelForCamera(runtime, event.deltaY, {
          loading: isCanvasAssetLoading
        })
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.focus({ preventScroll: true });
    },
    [isCanvasAssetLoading]
  );

  useEffect(() => {
    return () => {
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.controls.enabled = true;
      }
    };
  }, []);

  const clampAdjustLocationDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: adjustLocationDialogRef.current,
        x,
        y,
        fallbackWidthPx: ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openAdjustLocationDialog = useCallback(
    (targets: SceneObject[]) => {
      if (targets.length === 0) {
        return;
      }
      const targetIds = targets.map((object) => object.id);

      const source = targets[0];
      const hostRect = hostRef.current?.getBoundingClientRect();
      const preferredX = hostRect
        ? hostRect.width - ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX - ADJUST_LOCATION_DIALOG_MARGIN_PX
        : ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const preferredY = ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const initialDialogPosition = clampAdjustLocationDialogPosition(preferredX, preferredY);
      const visualTransformMeta = resolveAdjustLocationVisualTransformMeta(targets);
      const snapshotObjects = targets.map(cloneSceneObject);
      setSelectedObjectIds(targetIds);
      setAdjustLocationDialog({
        objectIds: targetIds,
        snapshotObjects,
        showVisualTransforms: visualTransformMeta.showVisualTransforms,
        mixedStaticPlaceables: visualTransformMeta.mixedStaticPlaceables,
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        collapsed: false,
        draft: buildAdjustLocationDraft(
          source,
          adjustLocationUnitsPerTile,
          scene.width,
          scene.height
        )
      });
      trackTelemetry("scene.adjust_location.open", {
        userId,
        selectedCount: targets.length,
        visualTransforms: visualTransformMeta.showVisualTransforms
      });
    },
    [
      adjustLocationUnitsPerTile,
      clampAdjustLocationDialogPosition,
      cloneSceneObject,
      scene.height,
      scene.width,
      trackTelemetry,
      userId
    ]
  );

  const updateAdjustLocationDraftField = useCallback(
    (field: keyof AdjustLocationDraft, rawValue: string) => {
      setAdjustLocationDialog((current) =>
        {
          if (!current) {
            return current;
          }
          const nextDraft = resolveNextAdjustLocationDraftField(
            current.draft,
            field,
            rawValue
          );
          if (!nextDraft) {
            return current;
          }
          return {
            ...current,
            draft: nextDraft
          };
        }
      );
    },
    []
  );

  const resolveSceneWithAdjustLocationDraft = useCallback(
    (sourceScene: AreaScene, dialogState: AdjustLocationDialogState): AreaScene => {
      const draft = dialogState.draft;
      const objectIds = dialogState.objectIds;
      const includeVisualTransforms = dialogState.showVisualTransforms;
      const draftZWorld = fromAdjustLocationHeight(draft.z, adjustLocationUnitsPerTile);
      let nextScene = sceneViewportPort.setObjectsAbsoluteLocationByIds(
        sourceScene,
        objectIds,
        {
          x: fromAdjustLocationCoordinate(draft.x, scene.width, adjustLocationUnitsPerTile),
          y: fromAdjustLocationCoordinate(draft.y, scene.height, adjustLocationUnitsPerTile),
          z: draftZWorld,
          bearing: toRadians(draft.bearingDeg)
        }
      );
      if (includeVisualTransforms) {
        nextScene = sceneViewportPort.setObjectsVisualTransformByIds(
          nextScene,
          objectIds,
          buildAdjustLocationVisualTransformInput(draft, adjustLocationUnitsPerTile)
        );
      }
      return nextScene;
    },
    [adjustLocationUnitsPerTile, scene.height, scene.width, sceneViewportPort]
  );

  useEffect(() => {
    if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
      return;
    }
    setSceneHistory((current) => {
      const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
        current.present,
        adjustLocationDialog.snapshotObjects
      );
      const nextPreviewScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
      if (
        areObjectPlacementsEqual(
          current.present,
          nextPreviewScene,
          adjustLocationDialog.objectIds,
          adjustLocationDialog.showVisualTransforms
        )
      ) {
        return current;
      }
      return {
        ...current,
        present: nextPreviewScene
      };
    });
  }, [
    adjustLocationDialog,
    adjustLocationDialog?.draft,
    adjustLocationDialog?.objectIds,
    adjustLocationDialog?.showVisualTransforms,
    adjustLocationDialog?.snapshotObjects,
    resolveSceneWithAdjustLocationDraft,
    sceneViewportPort
  ]);

  const applyAdjustLocationDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
        return;
      }

      const objectIds = adjustLocationDialog.objectIds;
      const includeVisualTransforms = adjustLocationDialog.showVisualTransforms;

      setSceneHistory((current) => {
        const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        const finalScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
        if (
          areObjectPlacementsEqual(
            baseScene,
            finalScene,
            objectIds,
            includeVisualTransforms
          )
        ) {
          return current;
        }
        return sceneViewportPort.commitHistory(
          {
            ...current,
            present: baseScene
          },
          finalScene
        );
      });

      trackTelemetry("scene.adjust_location.apply", {
        userId,
        selectedCount: objectIds.length,
        closeAfterApply,
        visualTransforms: includeVisualTransforms
      });

      if (closeAfterApply) {
        setAdjustLocationDialog(null);
      }
    },
    [
      adjustLocationDialog,
      sceneViewportPort,
      trackTelemetry,
      userId,
      resolveSceneWithAdjustLocationDraft
    ]
  );

  const cancelAdjustLocationDialog = useCallback(() => {
    if (adjustLocationDialog && adjustLocationDialog.snapshotObjects.length > 0) {
      setSceneHistory((current) => {
        const restoredScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        if (
          areObjectPlacementsEqual(
            current.present,
            restoredScene,
            adjustLocationDialog.objectIds,
            adjustLocationDialog.showVisualTransforms
          )
        ) {
          return current;
        }
        return {
          ...current,
          present: restoredScene
        };
      });
      trackTelemetry("scene.adjust_location.cancel", {
        userId,
        selectedCount: adjustLocationDialog.snapshotObjects.length
      });
    }
    setAdjustLocationDialog(null);
  }, [adjustLocationDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleAdjustLocationDialogCollapsed = useCallback(() => {
    setAdjustLocationDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startAdjustLocationDialogDrag,
    onHeaderPointerMove: moveAdjustLocationDialogDrag,
    onHeaderPointerUp: endAdjustLocationDialogDrag,
    onHeaderPointerCancel: cancelAdjustLocationDialogDrag
  } = usePropertyDialogDrag({
    dialog: adjustLocationDialog,
    setDialog: setAdjustLocationDialog,
    hostRef,
    panelRef: adjustLocationDialogRef,
    dragRef: adjustLocationDialogDragRef,
    clampPosition: clampAdjustLocationDialogPosition
  });

  const clampPlaceablePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: placeablePropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openPlaceablePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "placeables") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampPlaceablePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setPlaceablePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildPlaceablePropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.placeable_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampPlaceablePropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const updatePlaceablePropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "tag"
        | "resRef"
        | "isStatic"
        | "plot"
        | "useable"
        | "hasInventory"
        | "scriptSlotsEnabled"
        | "disabledFlagsEnabled"
        | "hardness"
        | "hitPoints"
        | "fortitudeSave"
        | "reflexSave"
        | "willSave"
        | "description"
        | "comments",
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const nextDraft =
          typeof value === "boolean"
            ? { ...current.draft, [field]: value }
            : { ...current.draft, [field]: value };
        if (arePlaceablePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updatePlaceableScriptSlotDraftField = useCallback(
    (field: PlaceableScriptSlotKey, value: string) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.draft.scriptSlots[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            scriptSlotsEnabled: true,
            scriptSlots: {
              ...current.draft.scriptSlots,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableDisabledFlagDraftField = useCallback(
    (field: keyof PlaceablePropertiesDraft["disabledFlags"], value: boolean) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.draft.disabledFlags[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            disabledFlags: {
              ...current.draft.disabledFlags,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableLockDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["lockSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.lockSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableTrapDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["trapSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.trapSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableAdvancedDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["advancedSettings"],
      value: string | boolean
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const addPlaceableInventoryItem = useCallback(() => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          hasInventory: true,
          inventoryItems: [
            ...current.draft.inventoryItems,
            {
              resRef: "",
              x: 0,
              y: 0,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ]
        }
      };
    });
  }, []);

  const updatePlaceableInventoryItem = useCallback(
    (
      index: number,
      field: keyof PlaceablePropertiesDraft["inventoryItems"][number],
      value: string | number | boolean | undefined
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.inventoryItems.length) {
          return current;
        }
        const inventoryItems = current.draft.inventoryItems.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            inventoryItems
          }
        };
      });
    },
    []
  );

  const removePlaceableInventoryItem = useCallback((index: number) => {
    setPlaceablePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.inventoryItems.length) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          inventoryItems: current.draft.inventoryItems.filter(
            (_entry, entryIndex) => entryIndex !== index
          )
        }
      };
    });
  }, []);

  const setPlaceablePropertiesActiveTab = useCallback((nextTab: PlaceablePropertiesTab) => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applyPlaceablePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!placeablePropertiesDialog) {
        return;
      }

      const draft = placeablePropertiesDialog.draft;
      const objectId = placeablePropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const sourcePlaceableProperties = sourceObject.placeableProperties;
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        const nextPlaceableProperties: NonNullable<SceneObject["placeableProperties"]> = {
          plot: draft.plot,
          useable: draft.useable,
          hasInventory: draft.hasInventory,
          lockSettings: { ...draft.lockSettings },
          trapSettings: { ...draft.trapSettings },
          advancedSettings: { ...draft.advancedSettings },
          description: draft.description,
          comments: draft.comments
        };
        if (draft.scriptSlotsEnabled) {
          nextPlaceableProperties.scriptSlots = { ...draft.scriptSlots };
        }
        if (draft.disabledFlagsEnabled) {
          nextPlaceableProperties.disabledFlags = { ...draft.disabledFlags };
        }
        if (
          draft.inventoryItems.length > 0 ||
          sourcePlaceableProperties?.inventoryItems !== undefined
        ) {
          nextPlaceableProperties.inventoryItems = draft.inventoryItems.map((entry) => ({
            ...entry
          }));
        }
        const isScriptSlotsUnchanged = draft.scriptSlotsEnabled
          ? sourcePlaceableProperties?.scriptSlots !== undefined &&
            arePlaceableScriptSlotsEqual(sourcePlaceableProperties.scriptSlots, draft.scriptSlots)
          : sourcePlaceableProperties?.scriptSlots === undefined;
        const isDisabledFlagsUnchanged = draft.disabledFlagsEnabled
          ? sourcePlaceableProperties?.disabledFlags !== undefined &&
            sourcePlaceableProperties.disabledFlags.plot === draft.disabledFlags.plot &&
            sourcePlaceableProperties.disabledFlags.useable === draft.disabledFlags.useable &&
            sourcePlaceableProperties.disabledFlags.hasInventory === draft.disabledFlags.hasInventory
          : sourcePlaceableProperties?.disabledFlags === undefined;
        const isLockSettingsUnchanged = arePlaceableLockSettingsEqual(
          {
            locked: sourcePlaceableProperties?.lockSettings?.locked ?? false,
            canRelock: sourcePlaceableProperties?.lockSettings?.canRelock ?? false,
            autoRemoveKeyAfterUse:
              sourcePlaceableProperties?.lockSettings?.autoRemoveKeyAfterUse ?? false,
            keyRequiredToUnlockOrLock:
              sourcePlaceableProperties?.lockSettings?.keyRequiredToUnlockOrLock ?? false,
            openLockDc: sourcePlaceableProperties?.lockSettings?.openLockDc ?? 18,
            closeLockDc: sourcePlaceableProperties?.lockSettings?.closeLockDc ?? 0,
            keyTag: sourcePlaceableProperties?.lockSettings?.keyTag ?? ""
          },
          draft.lockSettings
        );
        const isTrapSettingsUnchanged = arePlaceableTrapSettingsEqual(
          {
            isTrapped: sourcePlaceableProperties?.trapSettings?.isTrapped ?? false,
            trapType: sourcePlaceableProperties?.trapSettings?.trapType ?? PLACEABLE_TRAP_TYPE_OPTIONS[0]!,
            detectionDc: sourcePlaceableProperties?.trapSettings?.detectionDc ?? 0,
            disarmDc: sourcePlaceableProperties?.trapSettings?.disarmDc ?? 15,
            oneShot: sourcePlaceableProperties?.trapSettings?.oneShot ?? true,
            detectable: sourcePlaceableProperties?.trapSettings?.detectable ?? true,
            disarmable: sourcePlaceableProperties?.trapSettings?.disarmable ?? true,
            onDisarmScript: sourcePlaceableProperties?.trapSettings?.onDisarmScript ?? "",
            onTrapTriggeredScript:
              sourcePlaceableProperties?.trapSettings?.onTrapTriggeredScript ?? "",
            setDc: sourcePlaceableProperties?.trapSettings?.setDc ?? 5,
            detectDcModWhenSetByRogue:
              sourcePlaceableProperties?.trapSettings?.detectDcModWhenSetByRogue ?? 10,
            disarmDcModWhenSetByRogue:
              sourcePlaceableProperties?.trapSettings?.disarmDcModWhenSetByRogue ?? 22
          },
          draft.trapSettings
        );
        const isAdvancedSettingsUnchanged = arePlaceableAdvancedSettingsEqual(
          {
            blueprintResRef:
              sourcePlaceableProperties?.advancedSettings?.blueprintResRef ?? sourceObject.resRef,
            belongsToFaction:
              sourcePlaceableProperties?.advancedSettings?.belongsToFaction ??
              PLACEABLE_FACTION_OPTIONS[0]!,
            conversation: sourcePlaceableProperties?.advancedSettings?.conversation ?? "",
            noInterrupt: sourcePlaceableProperties?.advancedSettings?.noInterrupt ?? false,
            portraitResRef: sourcePlaceableProperties?.advancedSettings?.portraitResRef ?? "",
            initialState:
              sourcePlaceableProperties?.advancedSettings?.initialState ??
              PLACEABLE_INITIAL_STATE_OPTIONS[0]!,
            treasureModel:
              sourcePlaceableProperties?.advancedSettings?.treasureModel ??
              PLACEABLE_TREASURE_MODEL_OPTIONS[0]!
          },
          draft.advancedSettings
        );
        const isDescriptionUnchanged =
          (sourcePlaceableProperties?.description ?? "") === draft.description;
        const isCommentsUnchanged = (sourcePlaceableProperties?.comments ?? "") === draft.comments;
        const isInventoryItemsUnchanged =
          stableJsonStringify(sourcePlaceableProperties?.inventoryItems ?? []) ===
          stableJsonStringify(draft.inventoryItems);
        const sourceName = sourceObject.name ?? sourceObject.tag;
        const sourceIsStatic = sourceObject.isStatic ?? true;
        if (
          sourceName === nextName &&
          sourceObject.tag === nextTag &&
          sourceObject.resRef === nextResRef &&
          sourceIsStatic === draft.isStatic &&
          sourcePlaceableProperties?.plot === draft.plot &&
          sourcePlaceableProperties?.useable === draft.useable &&
          sourcePlaceableProperties?.hasInventory === draft.hasInventory &&
          isScriptSlotsUnchanged &&
          isDisabledFlagsUnchanged &&
          isLockSettingsUnchanged &&
          isTrapSettingsUnchanged &&
          isAdvancedSettingsUnchanged &&
          isInventoryItemsUnchanged &&
          isDescriptionUnchanged &&
          isCommentsUnchanged
        ) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName,
                tag: nextTag,
                resRef: nextResRef,
                isStatic: draft.isStatic,
                placeableProperties: nextPlaceableProperties,
                soundPositioning: undefined
              }
            : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.placeable_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setPlaceablePropertiesDialog(null);
      }
    },
    [placeablePropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelPlaceablePropertiesDialog = useCallback(() => {
    if (placeablePropertiesDialog) {
      const snapshot = placeablePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const sourceDraft = buildPlaceablePropertiesDraft(sourceObject);
        const snapshotDraft = buildPlaceablePropertiesDraft(snapshot);
        if (arePlaceablePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.placeable_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setPlaceablePropertiesDialog(null);
  }, [cloneSceneObject, placeablePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const togglePlaceablePropertiesDialogCollapsed = useCallback(() => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const mapAnchoredDialogPosition = useCallback(
    function mapAnchoredDialogPosition<TDialogState extends AnchoredDialogPositionState>(
      current: TDialogState,
      nextPosition: { x: number; y: number }
    ): TDialogState {
      const runtime = runtimeRef.current;
      const targetObject = resolveAnchoredDialogDragTargetObject({
        objectId: current.objectId,
        sceneObjects: scene.objects,
        visibleObjectIdsSet
      });
      if (!runtime || !targetObject) {
        return {
          ...current,
          windowX: nextPosition.x,
          windowY: nextPosition.y
        };
      }
      const anchorScreen = resolveContextMenuAnchorScreen(
        runtime,
        targetObject,
        current.objectId
      );
      return {
        ...current,
        windowX: nextPosition.x,
        windowY: nextPosition.y,
        anchorOffsetX: nextPosition.x - anchorScreen.x,
        anchorOffsetY: nextPosition.y - anchorScreen.y
      };
    },
    [scene.objects, visibleObjectIdsSet]
  );

  const {
    onHeaderPointerDown: startPlaceablePropertiesDialogDrag,
    onHeaderPointerMove: movePlaceablePropertiesDialogDrag,
    onHeaderPointerUp: endPlaceablePropertiesDialogDrag,
    onHeaderPointerCancel: cancelPlaceablePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    hostRef,
    panelRef: placeablePropertiesDialogRef,
    dragRef: placeablePropertiesDialogDragRef,
    clampPosition: clampPlaceablePropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const clampSoundPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: soundPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openSoundPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "sounds") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampSoundPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setSoundPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildSoundPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.sound_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampSoundPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const updateSoundPropertiesDraftField = useCallback(
    (field: keyof SoundPropertiesDraft, value: string | number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }

        let nextDraft = current.draft;
        if (field === "maxVolumeDistance") {
          return current;
        }
        if (field === "mode") {
          const nextMode = value as SoundPositioningMode;
          nextDraft = {
            ...current.draft,
            mode: nextMode
          };
        } else if (field === "cutoffDistance") {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          const nextCutoffDistance = Math.max(0, numericValue);
          nextDraft = {
            ...current.draft,
            cutoffDistance: nextCutoffDistance,
            maxVolumeDistance: deriveMaxVolumeDistanceFromCutoff(nextCutoffDistance)
          };
        } else if (
          field === "name" ||
          field === "tag" ||
          field === "resRef" ||
          field === "comments" ||
          field === "timeWindow" ||
          field === "hourMask"
        ) {
          nextDraft = {
            ...current.draft,
            [field]: String(value)
          };
        } else if (
          field === "backendSoundId" ||
          field === "backendCategory" ||
          field === "backendFormat" ||
          field === "backendSpatialMode" ||
          field === "backendPlaybackMode" ||
          field === "flagsSummary" ||
          field === "extraSummary"
        ) {
          return current;
        } else {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          nextDraft = {
            ...current.draft,
            [field]: numericValue
          };
        }

        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const patchSoundPropertiesDraft = useCallback((patch: Partial<SoundPropertiesDraft>) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        ...patch
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundPropertiesActive = useCallback(() => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        active: !current.draft.active
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const setSoundWhenToPlay = useCallback((nextWhenToPlay: SoundWhenToPlay, nextDayNight?: SoundDayNight) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft: SoundPropertiesDraft = {
        ...current.draft,
        whenToPlay: nextWhenToPlay,
        dayNight:
          nextDayNight ?? (nextWhenToPlay === "always" ? "both" : current.draft.dayNight)
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundHour = useCallback(
    (hourIndex: number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const currentMaskFlags = parseSoundHourMask(
          current.draft.hourMask,
          current.draft.hoursStart,
          current.draft.hoursEnd
        );
        const safeIndex = clampSoundHourIndex(hourIndex);
        currentMaskFlags[safeIndex] = !currentMaskFlags[safeIndex];
        const bounds = resolveSoundHourBounds(currentMaskFlags);
        const nextDraft: SoundPropertiesDraft = {
          ...current.draft,
          whenToPlay: "hours",
          hourMask: encodeSoundHourMask(currentMaskFlags),
          hoursStart: bounds.start,
          hoursEnd: bounds.end
        };
        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const selectSoundListEntry = useCallback((index: number) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const safeIndex =
        current.draft.soundList.length === 0 ? -1 : Math.min(Math.max(index, 0), current.draft.soundList.length - 1);
      if (safeIndex === current.draft.selectedSoundIndex) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          selectedSoundIndex: safeIndex
        }
      };
    });
  }, []);

  const mutateSoundListDraft = useCallback(
    (
      recipe: (list: string[], selectedIndex: number) => { list: string[]; selectedIndex: number }
    ) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const { list, selectedIndex } = recipe(
          [...current.draft.soundList],
          current.draft.selectedSoundIndex
        );
        const clampedSelectedIndex =
          list.length === 0 ? -1 : Math.min(Math.max(selectedIndex, 0), list.length - 1);
        if (
          list.join("\n") === current.draft.soundList.join("\n") &&
          clampedSelectedIndex === current.draft.selectedSoundIndex
        ) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            soundList: list,
            selectedSoundIndex: clampedSelectedIndex
          }
        };
      });
    },
    []
  );

  const addSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list) => {
      const nextNameBase = "as_backend_sound";
      let counter = list.length + 1;
      let nextValue = `${nextNameBase}${counter}`;
      while (list.includes(nextValue)) {
        counter += 1;
        nextValue = `${nextNameBase}${counter}`;
      }
      const nextList = [...list, nextValue];
      return {
        list: nextList,
        selectedIndex: nextList.length - 1
      };
    });
  }, [mutateSoundListDraft]);

  const removeSelectedSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (list.length === 0 || selectedIndex < 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = list.filter((_, index) => index !== selectedIndex);
      return {
        list: nextList,
        selectedIndex: Math.min(selectedIndex, nextList.length - 1)
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryUp = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex <= 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const previous = nextList[selectedIndex - 1];
      nextList[selectedIndex - 1] = nextList[selectedIndex];
      nextList[selectedIndex] = previous;
      return {
        list: nextList,
        selectedIndex: selectedIndex - 1
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryDown = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex < 0 || selectedIndex >= list.length - 1) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const next = nextList[selectedIndex + 1];
      nextList[selectedIndex + 1] = nextList[selectedIndex];
      nextList[selectedIndex] = next;
      return {
        list: nextList,
        selectedIndex: selectedIndex + 1
      };
    });
  }, [mutateSoundListDraft]);

  const setSoundPropertiesActiveTab = useCallback((nextTab: SoundPropertiesTab) => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applySoundPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!soundPropertiesDialog) {
        return;
      }

      const draft = soundPropertiesDialog.draft;
      const objectId = soundPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const nextScene = applySoundPropertiesDraftToScene(current.present, objectId, draft);
        if (nextScene === current.present) {
          return current;
        }
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.sound_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setSoundPropertiesDialog(null);
      }
    },
    [sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]
  );

  const cancelSoundPropertiesDialog = useCallback(() => {
    if (soundPropertiesDialog) {
      const snapshot = soundPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "sounds") {
          return current;
        }
        const snapshotSound = snapshot.soundPositioning;
        const snapshotPreserve = snapshotSound?.preserve;
        const sourcePreserve = sourceObject.soundPositioning?.preserve;
        if (
          sourceObject.name === snapshot.name &&
          sourceObject.tag === snapshot.tag &&
          sourceObject.resRef === snapshot.resRef &&
          sourceObject.soundPositioning?.mode === snapshotSound?.mode &&
          sourceObject.soundPositioning?.elevation === snapshotSound?.elevation &&
          sourceObject.soundPositioning?.maxVolumeDistance === snapshotSound?.maxVolumeDistance &&
          sourceObject.soundPositioning?.cutoffDistance === snapshotSound?.cutoffDistance &&
          sourceObject.soundPositioning?.randomRangeWestEast === snapshotSound?.randomRangeWestEast &&
          sourceObject.soundPositioning?.randomRangeNorthSouth === snapshotSound?.randomRangeNorthSouth &&
          sourcePreserve?.timeWindow === snapshotPreserve?.timeWindow &&
          sourcePreserve?.hourMask === snapshotPreserve?.hourMask &&
          sourcePreserve?.active === snapshotPreserve?.active &&
          sourcePreserve?.whenToPlay === snapshotPreserve?.whenToPlay &&
          sourcePreserve?.dayNight === snapshotPreserve?.dayNight &&
          sourcePreserve?.hoursStart === snapshotPreserve?.hoursStart &&
          sourcePreserve?.hoursEnd === snapshotPreserve?.hoursEnd &&
          sourcePreserve?.playStyle === snapshotPreserve?.playStyle &&
          sourcePreserve?.playOrder === snapshotPreserve?.playOrder &&
          sourcePreserve?.intervalMs === snapshotPreserve?.intervalMs &&
          sourcePreserve?.intervalVariationMs === snapshotPreserve?.intervalVariationMs &&
          sourcePreserve?.volume === snapshotPreserve?.volume &&
          sourcePreserve?.volumeVariation === snapshotPreserve?.volumeVariation &&
          sourcePreserve?.pitchVariation === snapshotPreserve?.pitchVariation &&
          sourcePreserve?.priority === snapshotPreserve?.priority &&
          stableJsonStringify(sourcePreserve?.flags ?? {}) ===
            stableJsonStringify(snapshotPreserve?.flags ?? {}) &&
          stableJsonStringify(sourcePreserve?.extra ?? {}) ===
            stableJsonStringify(snapshotPreserve?.extra ?? {})
        ) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.sound_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setSoundPropertiesDialog(null);
  }, [cloneSceneObject, sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]);

  const toggleSoundPropertiesDialogCollapsed = useCallback(() => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startSoundPropertiesDialogDrag,
    onHeaderPointerMove: moveSoundPropertiesDialogDrag,
    onHeaderPointerUp: endSoundPropertiesDialogDrag,
    onHeaderPointerCancel: cancelSoundPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    hostRef,
    panelRef: soundPropertiesDialogRef,
    dragRef: soundPropertiesDialogDragRef,
    clampPosition: clampSoundPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampDoorPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: doorPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openDoorPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "doors") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampDoorPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setDoorPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildDoorPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.door_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampDoorPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const setDoorPropertiesActiveTab = useCallback((nextTab: DoorPropertiesTab) => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateDoorPropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "tag"
        | "resRef"
        | "appearanceType"
        | "genericAppearance"
        | "plot"
        | "hardness"
        | "hitPoints"
        | "fortitudeSave"
        | "reflexSave"
        | "willSave"
        | "description"
        | "comments",
      value: string | boolean | number
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if ((current.draft as unknown as Record<string, string | boolean | number>)[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const updateDoorLockDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["lockSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.lockSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTrapDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["trapSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.trapSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorScriptSlotDraftField = useCallback((field: DoorScriptSlotKey, value: string) => {
    setDoorPropertiesDialog((current) => {
      if (!current || current.draft.scriptSlots[field] === value) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: value
          }
        }
      };
    });
  }, []);

  const updateDoorAdvancedDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["advancedSettings"], value: string | boolean) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTransitionDraftField = useCallback(
    (
      field: "destinationTag" | "destinationType" | "linkedTarget" | "linkedModule" | "linkedWaypoint" | "loadScreen",
      value: string
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const applyDoorPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!doorPropertiesDialog) {
        return;
      }

      const draft = doorPropertiesDialog.draft;
      const objectId = doorPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "doors") {
          return current;
        }
        const sourceDraft = buildDoorPropertiesDraft(sourceObject);
        if (areDoorPropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        const nextDoorProperties: NonNullable<SceneObject["doorProperties"]> = {
          plot: draft.plot,
          hardness: draft.hardness,
          hitPoints: draft.hitPoints,
          fortitudeSave: draft.fortitudeSave,
          reflexSave: draft.reflexSave,
          willSave: draft.willSave,
          appearanceType: draft.appearanceType.trim() || DOOR_APPEARANCE_TYPE_OPTIONS[0]!,
          genericAppearance: draft.genericAppearance.trim() || DOOR_GENERIC_APPEARANCE_OPTIONS[0]!,
          lockSettings: { ...draft.lockSettings },
          trapSettings: { ...draft.trapSettings },
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            blueprintResRef: draft.advancedSettings.blueprintResRef.trim() || nextResRef
          },
          description: draft.description,
          comments: draft.comments
        };

        const nextFlags = { ...draft.transitionFlags };
        const hasTransitionFlags = Object.keys(nextFlags).length > 0;
        const nextDestinationType = draft.destinationType;
        const nextDestinationTag = draft.destinationTag.trim();
        const nextLinkedTarget =
          nextDestinationType === "none"
            ? ""
            : draft.linkedTarget.trim().length > 0
              ? draft.linkedTarget.trim()
              : nextDestinationType === "door"
                ? "door"
                : "waypoint";
        const nextLinkedModule = draft.linkedModule.trim();
        const nextLinkedWaypoint =
          nextDestinationType === "waypoint" ? draft.linkedWaypoint.trim() : "";
        const nextLoadScreen = draft.loadScreen.trim();
        const sourceTransitionExtra = sourceObject.doorTransition?.extra;
        const hasTransitionExtra = Boolean(
          sourceTransitionExtra && Object.keys(sourceTransitionExtra).length > 0
        );
        const shouldClearTransition =
          nextDestinationType === "none" &&
          nextDestinationTag.length === 0 &&
          nextLinkedModule.length === 0 &&
          nextLinkedWaypoint.length === 0 &&
          nextLoadScreen.length === 0 &&
          !hasTransitionFlags &&
          !hasTransitionExtra;
        const nextDoorTransition = shouldClearTransition
          ? undefined
          : {
              linkedTarget: nextLinkedTarget,
              linkedModule: nextLinkedModule,
              linkedTag: nextDestinationTag,
              linkedWaypoint: nextLinkedWaypoint,
              loadScreen: nextLoadScreen,
              flags: nextFlags,
              ...(hasTransitionExtra && sourceTransitionExtra
                ? { extra: { ...sourceTransitionExtra } }
                : {})
            };

        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName,
                tag: nextTag,
                resRef: nextResRef,
                doorProperties: nextDoorProperties,
                doorTransition: nextDoorTransition
              }
            : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.door_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setDoorPropertiesDialog(null);
      }
    },
    [doorPropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelDoorPropertiesDialog = useCallback(() => {
    if (doorPropertiesDialog) {
      trackTelemetry("scene.door_properties.cancel", {
        userId,
        objectId: doorPropertiesDialog.objectId
      });
    }
    setDoorPropertiesDialog(null);
  }, [doorPropertiesDialog, trackTelemetry, userId]);

  const toggleDoorPropertiesDialogCollapsed = useCallback(() => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startDoorPropertiesDialogDrag,
    onHeaderPointerMove: moveDoorPropertiesDialogDrag,
    onHeaderPointerUp: endDoorPropertiesDialogDrag,
    onHeaderPointerCancel: cancelDoorPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    hostRef,
    panelRef: doorPropertiesDialogRef,
    dragRef: doorPropertiesDialogDragRef,
    clampPosition: clampDoorPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampCreaturePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: creaturePropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openCreaturePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "creatures") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampCreaturePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setCreaturePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildCreaturePropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      setCreatureFeatsFilter(CREATURE_FEAT_FILTER_OPTIONS[0]!);
      setCreatureSpellsLevelFilter(CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!);
      setCreatureSpellsMetaMagicFilter(CREATURE_METAMAGIC_FILTER_OPTIONS[0]!);
      setCreatureSpellsClassFilterIndex(0);
      setCreatureSpecialAbilitiesFilter(CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!);
      trackTelemetry("scene.creature_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [
      clampCreaturePropertiesDialogPosition,
      cloneSceneObject,
      trackTelemetry,
      userId,
      setCreatureFeatsFilter,
      setCreatureSpellsLevelFilter,
      setCreatureSpellsMetaMagicFilter,
      setCreatureSpellsClassFilterIndex,
      setCreatureSpecialAbilitiesFilter
    ]
  );

  const setCreaturePropertiesActiveTab = useCallback((nextTab: CreaturePropertiesTab) => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateCreaturePropertiesDraftField = useCallback(
    (field: keyof CreaturePropertiesDraft, value: string | number | boolean) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const nextDraft = { ...current.draft, [field]: value };
        if (areCreaturePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updateCreatureClassEntry = useCallback(
    (index: number, field: "classId" | "className" | "level", value: string | number) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.classEntries.length) {
          return current;
        }
        const nextEntries = current.draft.classEntries.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            classEntries: nextEntries
          }
        };
      });
    },
    []
  );

  const updateCreatureSkillRank = useCallback((index: number, rank: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.skills.length) {
        return current;
      }
      const nextSkills = current.draft.skills.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, rank } : entry
      );
      return {
        ...current,
        draft: {
          ...current.draft,
          skills: nextSkills
        }
      };
    });
  }, []);

  const updateCreatureScriptSlot = useCallback((field: CreatureScriptSlotKey, value: string) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || current.draft.scriptSlots[field] === value) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: value
          }
        }
      };
    });
  }, []);

  const updateCreatureAppearancePart = useCallback(
    (field: keyof CreaturePropertiesDraft["appearanceParts"], value: string) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || current.draft.appearanceParts[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            appearanceParts: {
              ...current.draft.appearanceParts,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateCreatureAdvancedField = useCallback(
    (
      field: keyof CreaturePropertiesDraft["advancedSettings"],
      value: string | number | boolean
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const addCreatureVariable = useCallback(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          variables: [...current.draft.variables, { name: "", type: "int", value: 0 }]
        }
      };
    });
  }, []);

  const updateCreatureVariable = useCallback(
    (index: number, entry: CreaturePropertiesDraft["variables"][number]) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.variables.length) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            variables: current.draft.variables.map((currentEntry, entryIndex) =>
              entryIndex === index ? { ...entry } : currentEntry
            )
          }
        };
      });
    },
    []
  );

  const removeCreatureVariable = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.variables.length) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          variables: current.draft.variables.filter((_entry, entryIndex) => entryIndex !== index)
        }
      };
    });
  }, []);

  const addCreatureInventoryItem = useCallback(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          inventoryItems: [
            ...current.draft.inventoryItems,
            {
              resRef: "",
              x: 0,
              y: 0,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ]
        }
      };
    });
  }, []);

  const updateCreatureInventoryItem = useCallback(
    (
      index: number,
      field: keyof CreaturePropertiesDraft["inventoryItems"][number],
      value: CreaturePropertiesDraft["inventoryItems"][number][keyof CreaturePropertiesDraft["inventoryItems"][number]]
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.inventoryItems.length) {
          return current;
        }
        const inventoryItems = current.draft.inventoryItems.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            inventoryItems
          }
        };
      });
    },
    []
  );

  const removeCreatureInventoryItem = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.inventoryItems.length) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          inventoryItems: current.draft.inventoryItems.filter(
            (_entry, entryIndex) => entryIndex !== index
          )
        }
      };
    });
  }, []);

  const addCreatureEquippedItem = useCallback(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          equippedItems: [
            ...current.draft.equippedItems,
            {
              resRef: "",
              slotMask: 0,
              dropable: true,
              pickpocketable: false,
              infinite: false
            }
          ]
        }
      };
    });
  }, []);

  const updateCreatureEquippedItem = useCallback(
    (
      index: number,
      field: keyof CreaturePropertiesDraft["equippedItems"][number],
      value: CreaturePropertiesDraft["equippedItems"][number][keyof CreaturePropertiesDraft["equippedItems"][number]]
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.equippedItems.length) {
          return current;
        }
        const equippedItems = current.draft.equippedItems.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            equippedItems
          }
        };
      });
    },
    []
  );

  const removeCreatureEquippedItem = useCallback((index: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.equippedItems.length) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          equippedItems: current.draft.equippedItems.filter(
            (_entry, entryIndex) => entryIndex !== index
          )
        }
      };
    });
  }, []);

  const applyCreaturePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!creaturePropertiesDialog) {
        return;
      }
      const objectId = creaturePropertiesDialog.objectId;
      const draft = creaturePropertiesDialog.draft;
      let appliedObject: SceneObject | null = null;
      let previousObject: SceneObject | null = null;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "creatures") {
          return current;
        }

        const sourceDraft = buildCreaturePropertiesDraft(sourceObject);
        if (areCreaturePropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }

        const nextTag = draft.tag.trim() || sourceObject.tag;
        const nextFirstName = draft.firstName.trim() || resolveSceneObjectName(sourceObject);
        const nextName = [nextFirstName, draft.lastName.trim()].filter((part) => part.length > 0).join(" ");
        const requestedBlueprintResRef = draft.advancedSettings.blueprintResRef.trim();
        const nextResRef = /^[A-Za-z0-9_]{1,16}$/u.test(requestedBlueprintResRef)
          ? requestedBlueprintResRef.toLowerCase()
          : sourceObject.resRef;

        const nextCreatureProperties = {
          firstName: nextFirstName,
          lastName: draft.lastName.trim(),
          race: draft.race.trim(),
          appearance: draft.appearance.trim(),
          phenotype: draft.phenotype.trim(),
          gender: draft.gender.trim(),
          description: draft.description,
          challengeRating: Math.max(0, draft.challengeRating),
          portraitResRef: draft.portraitResRef.trim(),
          conversation: draft.conversation.trim(),
          noInterrupt: draft.noInterrupt,
          alignment: draft.alignment,
          statistics: {
            abilityScores: {
              strength: draft.strength,
              dexterity: draft.dexterity,
              constitution: draft.constitution,
              intelligence: draft.intelligence,
              wisdom: draft.wisdom,
              charisma: draft.charisma
            },
            racialModifiers: {
              strength: draft.strRacial,
              dexterity: draft.dexRacial,
              constitution: draft.conRacial,
              intelligence: draft.intRacial,
              wisdom: draft.wisRacial,
              charisma: draft.chaRacial
            },
            saves: {
              fortitudeBase: draft.fortitudeBase,
              fortitudeBonus: draft.fortitudeBonus,
              reflexBase: draft.reflexBase,
              reflexBonus: draft.reflexBonus,
              willBase: draft.willBase,
              willBonus: draft.willBonus
            },
            naturalArmorClass: draft.naturalArmorClass,
            baseArmorClass: draft.baseArmorClass,
            dexterityBonus: draft.dexterityBonus,
            sizeModifier: draft.sizeModifier,
            baseHitPoints: draft.baseHitPoints,
            hitPointBonuses: draft.hitPointBonuses,
            currentHitPoints: draft.currentHitPoints,
            maxHitPoints: draft.maxHitPoints,
            movementRate: draft.movementRate
          },
          appearanceSettings: {
            partBasedAppearance: draft.appearancePartBased,
            ...draft.appearanceParts,
            colors: { ...draft.appearanceColors },
            sourceOnlyParts: { ...draft.appearanceSourceOnlyParts }
          },
          ...(sourceObject.creatureProperties?.appearanceProfile
            ? { appearanceProfile: { ...sourceObject.creatureProperties.appearanceProfile } }
            : {}),
          ...(sourceObject.creatureProperties?.lookupProfile
            ? { lookupProfile: { ...sourceObject.creatureProperties.lookupProfile } }
            : {}),
          ...(sourceObject.creatureProperties?.listCounts
            ? { listCounts: { ...sourceObject.creatureProperties.listCounts } }
            : {}),
          ...(sourceObject.creatureProperties?.localizedStringRefs
            ? { localizedStringRefs: { ...sourceObject.creatureProperties.localizedStringRefs } }
            : {}),
          ...(sourceObject.creatureProperties?.localizedStrings
            ? { localizedStrings: { ...sourceObject.creatureProperties.localizedStrings } }
            : {}),
          classEntries: draft.classEntries
            .filter(
              (entry) => entry.className.trim().length > 0 || typeof entry.classId === "number"
            )
            .map((entry) => ({
              ...(typeof entry.classId === "number"
                ? { classId: Math.max(0, Math.min(255, Math.trunc(entry.classId))) }
                : {}),
              className: entry.className.trim(),
              level: Math.max(1, Math.trunc(entry.level))
            })),
          templateEntries: draft.templateEntries.map((entry) => ({ ...entry })),
          skills: draft.skills.map((entry) => ({
            skill: entry.skill,
            rank: Math.max(0, Math.trunc(entry.rank))
          })),
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            blueprintResRef: nextResRef,
            corpseDecayTimeSeconds: Math.max(
              0,
              Math.trunc(draft.advancedSettings.corpseDecayTimeSeconds)
            )
          },
          feats: draft.feats.map((entry) => ({ ...entry })),
          spells: draft.spells.map((entry) => ({ ...entry })),
          specialAbilities: draft.specialAbilities.map((entry) => ({ ...entry })),
          variables: draft.variables
            .map((entry) => ({ ...entry, name: entry.name.trim() }))
            .filter((entry) => entry.name.length > 0),
          inventoryItems: draft.inventoryItems.map((entry) => ({
            ...entry,
            embeddedItem: entry.embeddedItem
              ? {
                  ...entry.embeddedItem,
                  itemPropertyListEntries: entry.embeddedItem.itemPropertyListEntries
                    ? entry.embeddedItem.itemPropertyListEntries.map((propertyEntry) => ({
                        ...propertyEntry
                      }))
                    : undefined
                }
              : undefined
          })),
          equippedItems: draft.equippedItems.map((entry) => ({
            ...entry,
            embeddedItem: entry.embeddedItem
              ? {
                  ...entry.embeddedItem,
                  itemPropertyListEntries: entry.embeddedItem.itemPropertyListEntries
                    ? entry.embeddedItem.itemPropertyListEntries.map((propertyEntry) => ({
                        ...propertyEntry
                      }))
                    : undefined
                }
              : undefined
          })),
          comments: draft.comments
        };

        previousObject = cloneSceneObject(sourceObject);
        const updatedObject: SceneObject = {
          ...sourceObject,
          name: nextName.length > 0 ? nextName : nextTag,
          tag: nextTag,
          resRef: nextResRef,
          creatureProperties: nextCreatureProperties,
          placeableProperties: undefined,
          encounterProperties: undefined,
          soundPositioning: undefined,
          doorTransition: undefined
        };
        appliedObject = cloneSceneObject(updatedObject);
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId ? updatedObject : object
        );

        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.creature_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });
      if (appliedObject) {
        onCreaturePropertiesApplied?.(appliedObject, previousObject ?? appliedObject);
      }
      if (closeAfterApply) {
        setCreaturePropertiesDialog(null);
      }
    },
    [
      cloneSceneObject,
      creaturePropertiesDialog,
      onCreaturePropertiesApplied,
      sceneViewportPort,
      trackTelemetry,
      userId
    ]
  );

  const cancelCreaturePropertiesDialog = useCallback(() => {
    if (creaturePropertiesDialog) {
      const snapshot = creaturePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "creatures" || snapshot.kind !== "creatures") {
          return current;
        }
        const sourceDraft = buildCreaturePropertiesDraft(sourceObject);
        const snapshotDraft = buildCreaturePropertiesDraft(snapshot);
        if (areCreaturePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      trackTelemetry("scene.creature_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setCreaturePropertiesDialog(null);
  }, [cloneSceneObject, creaturePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleCreaturePropertiesDialogCollapsed = useCallback(() => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startCreaturePropertiesDialogDrag,
    onHeaderPointerMove: moveCreaturePropertiesDialogDrag,
    onHeaderPointerUp: endCreaturePropertiesDialogDrag,
    onHeaderPointerCancel: cancelCreaturePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    hostRef,
    panelRef: creaturePropertiesDialogRef,
    dragRef: creaturePropertiesDialogDragRef,
    clampPosition: clampCreaturePropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampItemPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) =>
      clampWorkspaceDialogPosition({
        hostElement: hostRef.current,
        panelElement: itemPropertiesDialogRef.current,
        x,
        y,
        fallbackWidthPx: ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
        fallbackHeightPx: ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
        marginPx: ADJUST_LOCATION_DIALOG_MARGIN_PX,
        panelRect
      }),
    []
  );

  const openItemPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "items") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampItemPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setItemPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildItemPropertiesDraft(target),
        activeTab: "basic",
        previewProcessingStatus: onItemPreviewObjectNeeded ? "processing" : "idle",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.item_properties.open", {
        userId,
        objectId: target.id
      });
      if (onItemPreviewObjectNeeded) {
        void onItemPreviewObjectNeeded(cloneSceneObject(target))
          .then((processedObject) => {
            setItemPropertiesDialog((current) =>
              current?.objectId === target.id
                ? {
                    ...current,
                    snapshotObject: cloneSceneObject(processedObject),
                    previewProcessingStatus: "ready"
                  }
                : current
            );
          })
          .catch(() => {
            setItemPropertiesDialog((current) =>
              current?.objectId === target.id
                ? {
                    ...current,
                    previewProcessingStatus: "error"
                  }
                : current
            );
            trackTelemetry("scene.item_properties.preview_process_failed", {
              userId,
              objectId: target.id
            });
          });
      }
    },
    [
      clampItemPropertiesDialogPosition,
      cloneSceneObject,
      onItemPreviewObjectNeeded,
      trackTelemetry,
      userId
    ]
  );

  const setItemPropertiesActiveTab = useCallback((nextTab: ItemPropertiesTab) => {
    setItemPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateItemPropertiesDraftField = useCallback(
    (field: keyof ItemPropertiesDraft, value: string | number | boolean | undefined) => {
      setItemPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const nextDraft = { ...current.draft, [field]: value };
        if (areItemPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updateItemArmorContextDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["armorPreviewContext"], value: string) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.armorPreviewContext[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            armorPreviewContext: {
              ...current.draft.armorPreviewContext,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateItemArmorPartDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["armorParts"], value: number | undefined) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.armorParts[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            armorParts: {
              ...current.draft.armorParts,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateItemMaterialColorDraftField = useCallback(
    (field: keyof ItemPropertiesDraft["materialColors"], value: number | undefined) => {
      setItemPropertiesDialog((current) => {
        if (!current || current.draft.materialColors[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            materialColors: {
              ...current.draft.materialColors,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const addItemPropertyEntry = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          propertyList: [
            ...current.draft.propertyList,
            {
              propertyLabel: "",
              chanceAppear: 100
            }
          ]
        }
      };
    });
  }, []);

  const updateItemPropertyEntry = useCallback(
    (
      index: number,
      field: keyof ItemPropertiesDraft["propertyList"][number],
      value: string | number | undefined
    ) => {
      setItemPropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.propertyList.length) {
          return current;
        }
        const nextPropertyList = current.draft.propertyList.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            propertyList: nextPropertyList
          }
        };
      });
    },
    []
  );

  const removeItemPropertyEntry = useCallback((index: number) => {
    setItemPropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.propertyList.length) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          propertyList: current.draft.propertyList.filter(
            (_entry, entryIndex) => entryIndex !== index
          )
        }
      };
    });
  }, []);

  const addItemScriptEntry = useCallback(() => {
    setItemPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const usedKeys = new Set(Object.keys(current.draft.scripts));
      let nextIndex = usedKeys.size + 1;
      let nextKey = `script_${nextIndex}`;
      while (usedKeys.has(nextKey)) {
        nextIndex += 1;
        nextKey = `script_${nextIndex}`;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scripts: {
            ...current.draft.scripts,
            [nextKey]: ""
          }
        }
      };
    });
  }, []);

  const updateItemScriptEntry = useCallback(
    (scriptKey: string, nextKey: string, value: string) => {
      setItemPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const resolvedKey = nextKey.trim().length > 0 ? nextKey.trim() : scriptKey;
        const scripts = { ...current.draft.scripts };
        delete scripts[scriptKey];
        scripts[resolvedKey] = value;
        return {
          ...current,
          draft: {
            ...current.draft,
            scripts
          }
        };
      });
    },
    []
  );

  const removeItemScriptEntry = useCallback((scriptKey: string) => {
    setItemPropertiesDialog((current) => {
      if (!current || !(scriptKey in current.draft.scripts)) {
        return current;
      }
      const scripts = { ...current.draft.scripts };
      delete scripts[scriptKey];
      return {
        ...current,
        draft: {
          ...current.draft,
          scripts
        }
      };
    });
  }, []);

  const applyItemPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!itemPropertiesDialog) {
        return;
      }

      const draft = itemPropertiesDialog.draft;
      const objectId = itemPropertiesDialog.objectId;
      let appliedObject: SceneObject | null = null;
      let previousObject: SceneObject | null = null;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "items") {
          return current;
        }

        const sourceDraft = buildItemPropertiesDraft(sourceObject);
        if (areItemPropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }

        const modelParts = [draft.modelPart1, draft.modelPart2, draft.modelPart3].filter(
          (entry): entry is number => typeof entry === "number" && Number.isFinite(entry)
        );
        const armorParts: ItemPropertiesDraft["armorParts"] = {};
        for (const [key, value] of Object.entries(draft.armorParts) as Array<
          [keyof ItemPropertiesDraft["armorParts"], number | undefined]
        >) {
          if (typeof value === "number" && Number.isFinite(value)) {
            armorParts[key] = Math.trunc(value);
          }
        }
        const materialColors: ItemPropertiesDraft["materialColors"] = {};
        for (const [key, value] of Object.entries(draft.materialColors) as Array<
          [keyof ItemPropertiesDraft["materialColors"], number | undefined]
        >) {
          if (typeof value === "number" && Number.isFinite(value)) {
            materialColors[key] = Math.max(0, Math.min(255, Math.trunc(value)));
          }
        }
        const scripts = Object.fromEntries(
          Object.entries(draft.scripts)
            .map(
              ([key, value]) =>
                [key.trim().slice(0, 16), value.trim().slice(0, 16)] as const
            )
            .filter(([key]) => key.length > 0)
        );
        const armorPreviewContextInput = draft.armorPreviewContext;
        const armorPreviewContext: NonNullable<SceneObject["itemProperties"]>["armorPreviewContext"] = {
          modelPrefix: armorPreviewContextInput.modelPrefix.trim()
        };
        const contextLabel = armorPreviewContextInput.label.trim();
        const contextRaceModel = armorPreviewContextInput.raceModel.trim();
        const contextGender = Number.parseInt(armorPreviewContextInput.gender.trim(), 10);
        const contextPhenotype = Number.parseInt(armorPreviewContextInput.phenotype.trim(), 10);
        if (contextLabel.length > 0) {
          armorPreviewContext.label = contextLabel;
        }
        if (contextRaceModel.length > 0) {
          armorPreviewContext.raceModel = contextRaceModel;
        }
        if (Number.isFinite(contextGender)) {
          armorPreviewContext.gender = contextGender;
        }
        if (Number.isFinite(contextPhenotype)) {
          armorPreviewContext.phenotype = contextPhenotype;
        }

        const nextItemProperties: NonNullable<SceneObject["itemProperties"]> = {
          ...(sourceObject.itemProperties ?? {}),
          localizedName: draft.localizedName,
          localizedNameStrRef: draft.localizedNameStrRef,
          description: draft.description,
          descriptionStrRef: draft.descriptionStrRef,
          identifiedDescription: draft.identifiedDescription,
          identifiedDescriptionStrRef: draft.identifiedDescriptionStrRef,
          comments: draft.comments,
          paletteId: draft.paletteId,
          baseItem: draft.baseItem,
          modelPart1: draft.modelPart1,
          modelPart2: draft.modelPart2,
          modelPart3: draft.modelPart3,
          modelParts,
          armorPreviewContext,
          cloakModelRow: draft.cloakModelRow,
          cloakModel: draft.cloakModel,
          cloakTexture: draft.cloakTexture,
          cloakIcon: draft.cloakIcon,
          cloakModelResRef: draft.cloakModelResRef.trim() || undefined,
          cloakTextureResRef: draft.cloakTextureResRef.trim() || undefined,
          cloakIconResRef: draft.cloakIconResRef.trim() || undefined,
          armorParts,
          materialColors,
          cost: draft.cost,
          addCost: draft.addCost,
          costTable: draft.costTable,
          costValue: draft.costValue,
          charges: draft.charges,
          stackSize: draft.stackSize,
          identified: draft.identified,
          stolen: draft.stolen,
          plot: draft.plot,
          cursed: draft.cursed,
          propertyList: draft.propertyList.map((entry) => ({ ...entry })),
          scripts
        };
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        previousObject = cloneSceneObject(sourceObject);
        const updatedObject: SceneObject = {
          ...sourceObject,
          name: nextName || nextTag || nextResRef || sourceObject.name,
          tag: nextTag || sourceObject.tag,
          resRef: nextResRef || sourceObject.resRef,
          itemProperties: nextItemProperties,
          placeableProperties: undefined,
          creatureProperties: undefined,
          encounterProperties: undefined,
          soundPositioning: undefined,
          doorTransition: undefined
        };
        appliedObject = cloneSceneObject(updatedObject);
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId ? updatedObject : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });

      trackTelemetry("scene.item_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });
      if (appliedObject) {
        onItemPropertiesApplied?.(appliedObject, previousObject ?? appliedObject);
      }
      if (closeAfterApply) {
        setItemPropertiesDialog(null);
      }
    },
    [cloneSceneObject, itemPropertiesDialog, onItemPropertiesApplied, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelItemPropertiesDialog = useCallback(() => {
    if (itemPropertiesDialog) {
      const snapshot = itemPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "items" || snapshot.kind !== "items") {
          return current;
        }
        const sourceDraft = buildItemPropertiesDraft(sourceObject);
        const snapshotDraft = buildItemPropertiesDraft(snapshot);
        if (areItemPropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      trackTelemetry("scene.item_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setItemPropertiesDialog(null);
  }, [cloneSceneObject, itemPropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleItemPropertiesDialogCollapsed = useCallback(() => {
    setItemPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startItemPropertiesDialogDrag,
    onHeaderPointerMove: moveItemPropertiesDialogDrag,
    onHeaderPointerUp: endItemPropertiesDialogDrag,
    onHeaderPointerCancel: cancelItemPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: itemPropertiesDialog,
    setDialog: setItemPropertiesDialog,
    hostRef,
    panelRef: itemPropertiesDialogRef,
    dragRef: itemPropertiesDialogDragRef,
    clampPosition: clampItemPropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const { closeContextMenu, handleContextAction } = useWorkspaceContextMenuActions({
    contextMenu,
    setContextMenu,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    sceneViewportPort,
    setSceneHistory,
    selectedObjectIds,
    setSelectedObjectIds,
    setSelectedTileId,
    toolbarState,
    userId,
    trackTelemetry,
    duplicateObjects,
    focusCameraOnWorldPoint,
    openAdjustLocationDialog,
    openPlaceablePropertiesDialog,
    openSoundPropertiesDialog,
    openDoorPropertiesDialog,
    openCreaturePropertiesDialog,
    openItemPropertiesDialog,
    clearAdjustLocationDialog: () => setAdjustLocationDialog(null),
    clearPlaceablePropertiesDialog: () => setPlaceablePropertiesDialog(null),
    clearSoundPropertiesDialog: () => setSoundPropertiesDialog(null),
    clearDoorPropertiesDialog: () => setDoorPropertiesDialog(null),
    clearCreaturePropertiesDialog: () => setCreaturePropertiesDialog(null),
    clearItemPropertiesDialog: () => setItemPropertiesDialog(null)
  });

  useEffect(() => {
    if (!sidebarPropertiesSignal) {
      return;
    }
    if (sidebarPropertiesRevisionRef.current === sidebarPropertiesSignal.revision) {
      return;
    }

    const renderObjectIdsSet = resolveRenderObjectIdsSet(renderObjectIds);
    const selectedObject = resolveVisibleObjectForPropertiesSignal({
      objects: scene.objects,
      objectId: sidebarPropertiesSignal.objectId,
      objectKind: sidebarPropertiesSignal.objectKind,
      toolbarState,
      renderObjectIdsSet
    });
    if (!selectedObject) {
      return;
    }
    if (
      selectedObject.kind !== "placeables" &&
      selectedObject.kind !== "sounds" &&
      selectedObject.kind !== "doors" &&
      selectedObject.kind !== "creatures" &&
      selectedObject.kind !== "items"
    ) {
      return;
    }

    sidebarPropertiesRevisionRef.current = sidebarPropertiesSignal.revision;
    setSelectedTileId(null);
    setSelectedObjectIds([selectedObject.id]);
    setContextMenu(null);
    setAdjustLocationDialog(null);

    if (selectedObject.kind === "placeables") {
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      openPlaceablePropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "sounds") {
      setPlaceablePropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      openSoundPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "doors") {
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      setItemPropertiesDialog(null);
      openDoorPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "creatures") {
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setItemPropertiesDialog(null);
      openCreaturePropertiesDialog(selectedObject);
    } else {
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      openItemPropertiesDialog(selectedObject);
    }

    trackTelemetry("scene.properties.open_from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarPropertiesSignal.revision
    });
  }, [
    openCreaturePropertiesDialog,
    openDoorPropertiesDialog,
    openItemPropertiesDialog,
    openPlaceablePropertiesDialog,
    openSoundPropertiesDialog,
    renderObjectIds,
    scene.objects,
    sidebarPropertiesSignal,
    toolbarState,
    trackTelemetry,
    userId
  ]);

  useEffect(() => {
    if (!canvasCreateObjectSignal) {
      return;
    }
    if (canvasCreateObjectRevisionRef.current === canvasCreateObjectSignal.revision) {
      return;
    }

    canvasCreateObjectRevisionRef.current = canvasCreateObjectSignal.revision;
    beginObjectAddPlacement(canvasCreateObjectSignal.template, canvasCreateObjectSignal.revision);
  }, [beginObjectAddPlacement, canvasCreateObjectSignal]);

  useAnchoredContextMenuSync({
    contextMenu,
    setContextMenu,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    menuRef: contextMenuRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    fallbackWidthPx: CONTEXT_MENU_FALLBACK_WIDTH_PX,
    fallbackHeightPx: CONTEXT_MENU_FALLBACK_HEIGHT_PX,
    onEscape: closeContextMenu
  });

  useAnchoredObjectDialogSync({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: soundPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "sounds",
    fallbackWidthPx: SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: soundPropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: placeablePropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "placeables",
    fallbackWidthPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: placeablePropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: doorPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "doors",
    fallbackWidthPx: DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: doorPropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: creaturePropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "creatures",
    fallbackWidthPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: creaturePropertiesDialog?.collapsed
  });

  useAnchoredObjectDialogSync({
    dialog: itemPropertiesDialog,
    setDialog: setItemPropertiesDialog,
    runtimeRef,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    panelRef: itemPropertiesDialogRef,
    sceneObjects: scene.objects,
    visibleObjectIdsSet,
    objectKind: "items",
    fallbackWidthPx: ITEM_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
    fallbackHeightPx: ITEM_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX,
    layoutKey: itemPropertiesDialog?.collapsed
  });

  useWorkspaceObjectDialogEffects({
    scene,
    visibleObjectIdsSet,
    adjustLocationUnitsPerTile,
    adjustLocationDialog,
    setAdjustLocationDialog,
    cancelAdjustLocationDialog,
    clampAdjustLocationDialogPosition,
    placeablePropertiesDialog,
    setPlaceablePropertiesDialog,
    cancelPlaceablePropertiesDialog,
    clampPlaceablePropertiesDialogPosition,
    soundPropertiesDialog,
    setSoundPropertiesDialog,
    cancelSoundPropertiesDialog,
    clampSoundPropertiesDialogPosition,
    doorPropertiesDialog,
    setDoorPropertiesDialog,
    cancelDoorPropertiesDialog,
    clampDoorPropertiesDialogPosition,
    creaturePropertiesDialog,
    setCreaturePropertiesDialog,
    cancelCreaturePropertiesDialog,
    clampCreaturePropertiesDialogPosition,
    itemPropertiesDialog,
    setItemPropertiesDialog,
    cancelItemPropertiesDialog,
    clampItemPropertiesDialogPosition
  });

  const selectedTile = selectedTileId
    ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
    : null;
  const areaEditingFeedback = clipboardFeedback ?? areaPlacementFeedback;

  const undoAreaTileEdit = useCallback(() => {
    setSceneHistory((current) => sceneViewportPort.undoHistory(current));
    setAreaPlacementFeedback(null);
    clearClipboardFeedback();
  }, [clearClipboardFeedback, sceneViewportPort]);

  const redoAreaTileEdit = useCallback(() => {
    setSceneHistory((current) => sceneViewportPort.redoHistory(current));
    setAreaPlacementFeedback(null);
    clearClipboardFeedback();
  }, [clearClipboardFeedback, sceneViewportPort]);

  const selectedSummary =
    visibleSelectableSelectedObjectIds.length > 0
      ? `${visibleSelectableSelectedObjectIds.length} object(s)`
      : selectedTile
        ? `tile ${selectedTile.col},${selectedTile.row}`
        : "none";
  const selectedObjectsForTransform = resolveVisibleSelectedObjects({
    selectedObjectIds,
    objects: visibleObjects
  });
  const gizmoModeBadge = resolveGizmoModeBadge(toolbarState.canvasDebug.gizmoMode);
  const visualTransformBlockedReason = isVisualTransformGizmoMode(toolbarState.canvasDebug.gizmoMode)
    ? resolveVisualTransformSelectionBlockedReason(
        selectedObjectsForTransform,
        toolbarState.canvasDebug
      )
    : null;
  const nonRenderCount = scene.objects.filter(
    (object) => resolveObjectRenderStatus(object) === "non_render"
  ).length;
  const lockedKinds = Object.entries(toolbarState.canvasDebug.lockedKinds)
    .filter(([, locked]) => locked)
    .map(([kind]) => kind);
  const lockSummary = lockedKinds.length > 0 ? lockedKinds.join(", ") : "none";
  const isolateSummary = toolbarState.canvasDebug.isolateKind;
  const bookmarkSaved = Boolean(bookmark1Ref.current);
  const snapSummary = [
    toolbarState.canvasDebug.snapGrid ? "grid" : null,
    toolbarState.canvasDebug.snapAngle ? "angle" : null,
    toolbarState.canvasDebug.snapHeight ? "height" : null
  ]
    .filter(Boolean)
    .join(", ");

  const saveStatus = lastSavedAtUnixMs
    ? `Saved ${new Date(lastSavedAtUnixMs).toLocaleTimeString()}`
    : "Not saved yet";
  const controlPresetLabel = "Aurora Classic";
  const inputHint =
    "LMB select/paint | Alt+LMB add object | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Arrows move selected | Ctrl/Cmd+C copy | Ctrl/Cmd+X cut | Ctrl/Cmd+V paste | Del delete | Gizmo: 1 world move / 2 world bearing / 3 VT rotate / 4 VT offset / 5 VT scale | Canvas menu: gizmo/snap/layers/debug";
  const hudLeftPx = leftPanelWidthPx + 14;
  const hudRightPx = rightPanelWidthPx + 14;
  const hudMaxWidth = `calc(100% - ${leftPanelWidthPx + rightPanelWidthPx + 28}px)`;
  const controlsHintBottomPx = 14;

  useEffect(() => {
    if (!toolbarState.canvasDebug.runtimeHud && runtimePopupPinned) {
      setRuntimePopupPinned(false);
    }
  }, [runtimePopupPinned, toolbarState.canvasDebug.runtimeHud]);

  const selectionBoxStyle = useMemo(() => {
    if (!selectionBox.active) {
      return undefined;
    }
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    };
  }, [selectionBox]);

  const contextObject = resolveContextMenuActionObject({
    contextMenu,
    sceneObjects: scene.objects,
    visibleObjectIdsSet
  });
  const isContextObjectLocked = contextObject
    ? isKindLocked(toolbarState.canvasDebug, contextObject.kind)
    : false;
  const isContextPropertiesSupported =
    contextObject?.kind === "placeables" ||
    contextObject?.kind === "sounds" ||
    contextObject?.kind === "doors" ||
    contextObject?.kind === "creatures" ||
    contextObject?.kind === "items";

  return (
    <section
      className="canvas-stage-real"
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      <div
        ref={hostRef}
        className={`workspace-render-canvas ${objectAddPlacementMode ? "is-object-add-placement" : ""}`}
        aria-label="workspace render canvas"
        role="img"
        tabIndex={0}
        data-current-scene-id={scene.sceneId}
        data-current-scene-size={`${scene.width}x${scene.height}`}
        data-current-scene-tile-count={scene.tiles.length}
        data-current-scene-object-count={scene.objects.length}
        data-area-editing-proof-state={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofState(scene)
            : undefined
        }
        data-area-editing-proof-tool={
          import.meta.env.DEV ? serializeAreaEditingProofTool(areaEditingTool) : undefined
        }
        data-area-editing-proof-history={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofHistory(sceneHistory)
            : undefined
        }
        data-area-editing-proof-history-past-count={
          import.meta.env.DEV ? sceneHistory.past.length : undefined
        }
        data-area-editing-proof-history-future-count={
          import.meta.env.DEV ? sceneHistory.future.length : undefined
        }
        data-area-editing-proof-selection={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofSelection(scene, selectedTileId, selectedTileIds)
            : undefined
        }
        data-area-editing-proof-feedback={
          import.meta.env.DEV && scene.auroraAreaEditing
            ? serializeAreaEditingProofFeedback(areaEditingFeedback)
            : undefined
        }
        data-external-scene-id={externalSceneSeed?.sceneId ?? ""}
        data-external-scene-size={
          externalSceneSeed ? `${externalSceneSeed.width}x${externalSceneSeed.height}` : ""
        }
        data-external-scene-object-count={externalSceneSeed?.objects.length ?? ""}
        onMouseDown={handleCanvasMouseDown}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseLeave}
        onWheel={handleCanvasWheel}
        onContextMenu={(event) => {
          event.preventDefault();
          if (objectAddPlacementMode) {
            cancelObjectAddPlacement("context_menu");
          }
        }}
      />

      {selectionBox.active && selectionBoxStyle ? (
        <div className="canvas-selection-box" style={selectionBoxStyle} aria-hidden="true" />
      ) : null}

      <AuroraAreaCanvasCommands
        visible={Boolean(scene.auroraAreaEditing)}
        canUndo={sceneHistory.past.length > 0}
        canRedo={sceneHistory.future.length > 0}
        hasSelectedTile={Boolean(selectedTile)}
        hasClipboardTiles={hasClipboardTiles}
        feedback={areaEditingFeedback}
        leftPx={hudLeftPx}
        maxWidth={hudMaxWidth}
        onUndo={undoAreaTileEdit}
        onRedo={redoAreaTileEdit}
        onCopy={() => copySelectedTilesToClipboard("area_canvas_toolbar")}
        onCut={() => cutSelectedTilesToClipboard("area_canvas_toolbar")}
        onPaste={() => pasteClipboardTiles("area_canvas_toolbar")}
        onRemove={() => deleteSelectedTiles("area_canvas_toolbar")}
      />

      {renderAreaGeometry &&
      !areaSharedRendererModelLoadComplete &&
      (areaObjectSharedRendererDiagnostics.primitiveFallbackCount > 0 ||
        areaObjectSharedRendererDiagnostics.missingPayloadIds) ? (
        <aside
          className="canvas-area-runtime-alert"
          role="status"
          aria-live="polite"
          aria-label="area renderer blockers"
        >
          <strong>
            {hasAreaPayloadRequestsInFlight
              ? "Area PLC/DOR payloads loading"
              : "Area PLC/DOR placeholders"}
          </strong>
          <span>
            {formatAreaSharedRendererIssueSummary(areaObjectSharedRendererDiagnostics, {
              payloadRequestsInFlight: hasAreaPayloadRequestsInFlight
            })}
          </span>
        </aside>
      ) : null}

      {canvasLoadOverlay.visible ? (
        <aside
          className={`canvas-placeable-load-overlay canvas-placeable-load-overlay-${placeableLoadOverlay.variant} canvas-placeable-load-overlay-${canvasLoadOverlay.variant} canvas-placeable-load-overlay-${canvasLoadOverlay.source}`}
          role="status"
          aria-live="polite"
          aria-label={`${canvasLoadOverlay.source} assets ${canvasLoadOverlay.variant}`}
        >
          <span className="canvas-placeable-load-spinner" aria-hidden="true" />
          <p className="canvas-placeable-load-title">{canvasLoadOverlay.title}</p>
          <p className="canvas-placeable-load-progress">
            {formatCanvasLoadOverlayProgress(canvasLoadOverlay)}
          </p>
          {canvasLoadOverlay.currentLabel ? (
            <p className="canvas-placeable-load-note">
              Current: {canvasLoadOverlay.currentLabel}
            </p>
          ) : null}
          {isCanvasAssetLoading ? (
            <p className="canvas-placeable-load-note">Orbit paused while assets load</p>
          ) : null}
        </aside>
      ) : null}

      {showGizmoModeBadge ? (
        <aside
          className={`canvas-gizmo-mode-badge canvas-gizmo-mode-badge-${gizmoModeBadge.variant}`}
          role="note"
          aria-label="gizmo mode badge"
          style={{ left: `${hudLeftPx}px` }}
        >
          {gizmoModeBadge.label}
        </aside>
      ) : null}

      {contextMenu ? (
        <WorkspaceContextMenu
          contextMenu={contextMenu}
          contextObject={contextObject}
          menuRef={contextMenuRef}
          isContextObjectLocked={isContextObjectLocked}
          isContextPropertiesSupported={isContextPropertiesSupported}
          onAction={handleContextAction}
        />
      ) : null}

      {adjustLocationDialog ? (
        <AdjustLocationDialog
          dialog={adjustLocationDialog}
          articleRef={adjustLocationDialogRef}
          onToggleCollapsed={toggleAdjustLocationDialogCollapsed}
          onClose={cancelAdjustLocationDialog}
          onDraftFieldChange={updateAdjustLocationDraftField}
          onApply={applyAdjustLocationDraft}
          onHeaderPointerDown={startAdjustLocationDialogDrag}
          onHeaderPointerMove={moveAdjustLocationDialogDrag}
          onHeaderPointerUp={endAdjustLocationDialogDrag}
          onHeaderPointerCancel={cancelAdjustLocationDialogDrag}
        />
      ) : null}

      {placeablePropertiesDialog ? (
        <PlaceablePropertiesDialog
          placeablePropertiesDialog={placeablePropertiesDialog}
          placeableRenderPayload={
            placeableRenderPayloadByObjectId?.[placeablePropertiesDialog.objectId] ?? null
          }
          placeablePropertiesDialogRef={placeablePropertiesDialogRef}
          togglePlaceablePropertiesDialogCollapsed={togglePlaceablePropertiesDialogCollapsed}
          cancelPlaceablePropertiesDialog={cancelPlaceablePropertiesDialog}
          setPlaceablePropertiesActiveTab={setPlaceablePropertiesActiveTab}
          updatePlaceablePropertiesDraftField={updatePlaceablePropertiesDraftField}
          updatePlaceableScriptSlotDraftField={updatePlaceableScriptSlotDraftField}
          updatePlaceableDisabledFlagDraftField={updatePlaceableDisabledFlagDraftField}
          updatePlaceableLockDraftField={updatePlaceableLockDraftField}
          updatePlaceableTrapDraftField={updatePlaceableTrapDraftField}
          updatePlaceableAdvancedDraftField={updatePlaceableAdvancedDraftField}
          addPlaceableInventoryItem={addPlaceableInventoryItem}
          updatePlaceableInventoryItem={updatePlaceableInventoryItem}
          removePlaceableInventoryItem={removePlaceableInventoryItem}
          applyPlaceablePropertiesDraft={applyPlaceablePropertiesDraft}
          startPlaceablePropertiesDialogDrag={startPlaceablePropertiesDialogDrag}
          movePlaceablePropertiesDialogDrag={movePlaceablePropertiesDialogDrag}
          endPlaceablePropertiesDialogDrag={endPlaceablePropertiesDialogDrag}
          cancelPlaceablePropertiesDialogDrag={cancelPlaceablePropertiesDialogDrag}
        />
      ) : null}

      {creaturePropertiesDialog ? (
        <CreaturePropertiesDialog
          creaturePropertiesDialog={creaturePropertiesDialog}
          creaturePropertiesDialogRef={creaturePropertiesDialogRef}
          toggleCreaturePropertiesDialogCollapsed={toggleCreaturePropertiesDialogCollapsed}
          cancelCreaturePropertiesDialog={cancelCreaturePropertiesDialog}
          setCreaturePropertiesActiveTab={setCreaturePropertiesActiveTab}
          updateCreaturePropertiesDraftField={updateCreaturePropertiesDraftField}
          updateCreatureClassEntry={updateCreatureClassEntry}
          updateCreatureSkillRank={updateCreatureSkillRank}
          updateCreatureScriptSlot={updateCreatureScriptSlot}
          updateCreatureAppearancePart={updateCreatureAppearancePart}
          updateCreatureAdvancedField={updateCreatureAdvancedField}
          addCreatureVariable={addCreatureVariable}
          updateCreatureVariable={updateCreatureVariable}
          removeCreatureVariable={removeCreatureVariable}
          addCreatureInventoryItem={addCreatureInventoryItem}
          updateCreatureInventoryItem={updateCreatureInventoryItem}
          removeCreatureInventoryItem={removeCreatureInventoryItem}
          addCreatureEquippedItem={addCreatureEquippedItem}
          updateCreatureEquippedItem={updateCreatureEquippedItem}
          removeCreatureEquippedItem={removeCreatureEquippedItem}
          creatureResourceOptions={creatureResourceOptions}
          applyCreaturePropertiesDraft={applyCreaturePropertiesDraft}
          creatureFeatsFilter={creatureFeatsFilter}
          setCreatureFeatsFilter={setCreatureFeatsFilter}
          creatureSpellsLevelFilter={creatureSpellsLevelFilter}
          setCreatureSpellsLevelFilter={setCreatureSpellsLevelFilter}
          creatureSpellsMetaMagicFilter={creatureSpellsMetaMagicFilter}
          setCreatureSpellsMetaMagicFilter={setCreatureSpellsMetaMagicFilter}
          creatureSpellsClassFilterIndex={creatureSpellsClassFilterIndex}
          setCreatureSpellsClassFilterIndex={setCreatureSpellsClassFilterIndex}
          creatureSpecialAbilitiesFilter={creatureSpecialAbilitiesFilter}
          setCreatureSpecialAbilitiesFilter={setCreatureSpecialAbilitiesFilter}
          startCreaturePropertiesDialogDrag={startCreaturePropertiesDialogDrag}
          moveCreaturePropertiesDialogDrag={moveCreaturePropertiesDialogDrag}
          endCreaturePropertiesDialogDrag={endCreaturePropertiesDialogDrag}
          cancelCreaturePropertiesDialogDrag={cancelCreaturePropertiesDialogDrag}
        />
      ) : null}

      {itemPropertiesDialog ? (
        <ItemPropertiesDialog
          itemPropertiesDialog={itemPropertiesDialog}
          itemPropertiesDialogRef={itemPropertiesDialogRef}
          toggleItemPropertiesDialogCollapsed={toggleItemPropertiesDialogCollapsed}
          cancelItemPropertiesDialog={cancelItemPropertiesDialog}
          setItemPropertiesActiveTab={setItemPropertiesActiveTab}
          updateItemPropertiesDraftField={updateItemPropertiesDraftField}
          updateItemArmorContextDraftField={updateItemArmorContextDraftField}
          updateItemArmorPartDraftField={updateItemArmorPartDraftField}
          updateItemMaterialColorDraftField={updateItemMaterialColorDraftField}
          addItemPropertyEntry={addItemPropertyEntry}
          updateItemPropertyEntry={updateItemPropertyEntry}
          removeItemPropertyEntry={removeItemPropertyEntry}
          addItemScriptEntry={addItemScriptEntry}
          updateItemScriptEntry={updateItemScriptEntry}
          removeItemScriptEntry={removeItemScriptEntry}
          applyItemPropertiesDraft={applyItemPropertiesDraft}
          itemAssetAccessToken={placeableAssetAccessToken}
          startItemPropertiesDialogDrag={startItemPropertiesDialogDrag}
          moveItemPropertiesDialogDrag={moveItemPropertiesDialogDrag}
          endItemPropertiesDialogDrag={endItemPropertiesDialogDrag}
          cancelItemPropertiesDialogDrag={cancelItemPropertiesDialogDrag}
        />
      ) : null}

      {soundPropertiesDialog ? (
        <SoundPropertiesDialog
          soundPropertiesDialog={soundPropertiesDialog}
          soundPropertiesDialogRef={soundPropertiesDialogRef}
          toggleSoundPropertiesDialogCollapsed={toggleSoundPropertiesDialogCollapsed}
          cancelSoundPropertiesDialog={cancelSoundPropertiesDialog}
          setSoundPropertiesActiveTab={setSoundPropertiesActiveTab}
          updateSoundPropertiesDraftField={updateSoundPropertiesDraftField}
          patchSoundPropertiesDraft={patchSoundPropertiesDraft}
          toggleSoundPropertiesActive={toggleSoundPropertiesActive}
          setSoundWhenToPlay={setSoundWhenToPlay}
          toggleSoundHour={toggleSoundHour}
          selectSoundListEntry={selectSoundListEntry}
          playSelectedSoundPreview={playSelectedSoundPreview}
          stopSoundPreviewPlayback={stopSoundPreviewPlayback}
          addSoundListEntry={addSoundListEntry}
          removeSelectedSoundListEntry={removeSelectedSoundListEntry}
          moveSoundListEntryUp={moveSoundListEntryUp}
          moveSoundListEntryDown={moveSoundListEntryDown}
          applySoundPropertiesDraft={applySoundPropertiesDraft}
          startSoundPropertiesDialogDrag={startSoundPropertiesDialogDrag}
          moveSoundPropertiesDialogDrag={moveSoundPropertiesDialogDrag}
          endSoundPropertiesDialogDrag={endSoundPropertiesDialogDrag}
          cancelSoundPropertiesDialogDrag={cancelSoundPropertiesDialogDrag}
        />
      ) : null}

      {doorPropertiesDialog ? (
        <DoorPropertiesDialog
          doorPropertiesDialog={doorPropertiesDialog}
          doorRenderPayload={
            placeableRenderPayloadByObjectId?.[doorPropertiesDialog.objectId] ?? null
          }
          doorPropertiesDialogRef={doorPropertiesDialogRef}
          toggleDoorPropertiesDialogCollapsed={toggleDoorPropertiesDialogCollapsed}
          cancelDoorPropertiesDialog={cancelDoorPropertiesDialog}
          setDoorPropertiesActiveTab={setDoorPropertiesActiveTab}
          updateDoorPropertiesDraftField={updateDoorPropertiesDraftField}
          updateDoorLockDraftField={updateDoorLockDraftField}
          updateDoorTrapDraftField={updateDoorTrapDraftField}
          updateDoorScriptSlotDraftField={updateDoorScriptSlotDraftField}
          updateDoorAdvancedDraftField={updateDoorAdvancedDraftField}
          updateDoorTransitionDraftField={updateDoorTransitionDraftField}
          applyDoorPropertiesDraft={applyDoorPropertiesDraft}
          startDoorPropertiesDialogDrag={startDoorPropertiesDialogDrag}
          moveDoorPropertiesDialogDrag={moveDoorPropertiesDialogDrag}
          endDoorPropertiesDialogDrag={endDoorPropertiesDialogDrag}
          cancelDoorPropertiesDialogDrag={cancelDoorPropertiesDialogDrag}
        />
      ) : null}

      {toolbarState.canvasDebug.runtimeHud ? (
        <aside
          className={`canvas-runtime-anchor ${runtimePopupPinned ? "is-pinned" : ""}`}
          aria-label="canvas runtime"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          <button
            type="button"
            className="canvas-runtime-chip"
            aria-label="Runtime diagnostics"
            aria-pressed={runtimePopupPinned}
            onClick={() => setRuntimePopupPinned((current) => !current)}
          >
            <span className="canvas-runtime-chip-icon" aria-hidden="true">
              i
            </span>
            <span>Runtime</span>
          </button>
          <article className="canvas-runtime-popup" role="tooltip" aria-label="runtime diagnostics panel">
            <p>
              Controls: <strong>{controlPresetLabel}</strong>
            </p>
            <p>
              Runtime: <strong>{webglReady ? "Three.js / WebGL" : "Fallback"}</strong>
            </p>
            {webglFallbackReason ? (
              <p>
                Status: <strong>{webglFallbackReason}</strong>
              </p>
            ) : null}
            <p>
              Scene: <strong>{scene.areaName}</strong>
            </p>
            <p>
              Source: <strong>{scene.source}</strong>
            </p>
            <p>
              Tile source:{" "}
              <strong>
                {scene.tileSource?.type ?? "unknown"}
                {scene.tileSource?.tilesetResRef ? ` / ${scene.tileSource.tilesetResRef}` : ""}
                {scene.tileSource?.fallbackReason
                  ? ` / not Aurora-render-correct: ${scene.tileSource.fallbackReason}`
                  : ""}
              </strong>
            </p>
            <p>
              Tile render: <strong>{terrainRenderStatus.label}</strong>
            </p>
            <p>
              Scene package: <strong>{terrainScenePackageReadiness.status}</strong>
            </p>
            <p>
              Tile assets:{" "}
              <strong>
                ARE {terrainScenePackageReadiness.areTileListStatus} / SET{" "}
                {terrainScenePackageReadiness.setTileModelStatus} / MDL{" "}
                {terrainScenePackageReadiness.mdlAvailabilityStatus} / GLB{" "}
                {terrainScenePackageReadiness.glbAvailabilityStatus} / texture{" "}
                {terrainScenePackageReadiness.textureAvailabilityStatus}
              </strong>
            </p>
            <p>
              Tile blockers:{" "}
              <strong>
                {terrainScenePackageReadiness.blockers.length > 0
                  ? terrainScenePackageReadiness.blockers.join(", ")
                  : "none"}
              </strong>
            </p>
            <p>
              Tile asset contract:{" "}
              <strong>{terrainScenePackageReadiness.tileAssetContractStatus}</strong>
            </p>
            <p>
              Tile catalog candidates:{" "}
              <strong>
                {terrainScenePackageReadiness.tileCatalogCandidateIdsSample || "none"}
              </strong>
            </p>
            <p>
              Tile process:{" "}
              <strong>{terrainScenePackageReadiness.tileProcessContractStatus}</strong>
            </p>
            <p>
              Tile process runtime:{" "}
              <strong>
                {formatAreaTileProcessRuntimeStatus(areaTileProcessReadiness)}
              </strong>
            </p>
            <p>
              Tile process source:{" "}
              <strong>
                {areaTileProcessReadiness?.sourceObjectKeySample ?? "not checked"}
              </strong>
            </p>
            <p>
              Tile process runtime blockers:{" "}
              <strong>{areaTileProcessReadiness?.blockerSummary ?? "not checked"}</strong>
            </p>
            <p>
              Tile texture/material blockers:{" "}
              <strong>
                {areaTileProcessReadiness?.textureMaterialBlockerSummary ?? "not checked"}
              </strong>
            </p>
            <p>
              Tile model loader:{" "}
              <strong>
                {formatAreaTileModelLoaderRuntimeStatus(areaTileProcessReadiness)}
              </strong>
            </p>
            <p>
              Tile texture contract:{" "}
              <strong>{terrainScenePackageReadiness.tileTextureContractStatus}</strong>
            </p>
            <p>
              Tile asset blockers:{" "}
              <strong>
                {terrainScenePackageReadiness.tileAssetContractBlockers.length > 0
                  ? terrainScenePackageReadiness.tileAssetContractBlockers.join(", ")
                  : "none"}
              </strong>
            </p>
            <p>
              Area PLC/DOR renderer:{" "}
              <strong>
                {areaObjectSharedRendererDiagnostics.status} / payload{" "}
                {areaObjectSharedRendererDiagnostics.payloadReadyCount}/
                {areaObjectSharedRendererDiagnostics.total} / model{" "}
                {areaObjectSharedRendererDiagnostics.modelUrlReadyCount}/
                {areaObjectSharedRendererDiagnostics.total} /{" "}
                {formatAreaSharedRendererIssueSummary(areaObjectSharedRendererDiagnostics, {
                  payloadRequestsInFlight: hasAreaPayloadRequestsInFlight
                })}
              </strong>
            </p>
            <p>
              Selection: <strong>{selectedSummary}</strong>
            </p>
            <p>
              Debug map: <strong>{toolbarState.canvasDebug.statusMap}</strong>
            </p>
            <p>
              Overlays:{" "}
              <strong>
                walkmesh {toolbarState.canvasDebug.walkmeshOverlay ? "on" : "off"} / collision{" "}
                {toolbarState.canvasDebug.collisionOverlay ? "on" : "off"}
              </strong>
            </p>
            <p>
              Texture mode: <strong>{toolbarState.canvasDebug.textureCompression}</strong>
            </p>
            <p>
              Gizmo: <strong>{toolbarState.canvasDebug.gizmoMode}</strong>
            </p>
            <p>
              VT physical:{" "}
              <strong>{toolbarState.canvasDebug.showVtPhysicalAnchor ? "on" : "off"}</strong>
            </p>
            <p>
              Snap: <strong>{snapSummary || "off"}</strong>
            </p>
            <p>
              Snap step:{" "}
              <strong>
                grid {workspaceOptions.snapGridStep} / angle {workspaceOptions.snapAngleStepDeg}
                deg / height {workspaceOptions.snapHeightStep}
              </strong>
            </p>
            <p>
              Box mode: <strong>{workspaceOptions.selectionBoxMode}</strong>
            </p>
            <p>
              Per-object gizmo hints:{" "}
              <strong>{workspaceOptions.showPerObjectGizmoHints ? "on" : "off"}</strong>
            </p>
            <p>
              Isolate: <strong>{isolateSummary}</strong>
            </p>
            <p>
              Locked: <strong>{lockSummary}</strong>
            </p>
            <p>
              Bookmark #1: <strong>{bookmarkSaved ? "saved" : "empty"}</strong>
            </p>
            <p>
              Non-render objs: <strong>{nonRenderCount}</strong>
            </p>
            <p>
              Draft: <strong>{saveStatus}</strong>
            </p>
            {toolbarState.canvasDebug.perfHud ? (
              <>
                <p>
                  FPS: <strong>{perfSnapshot.fps}</strong>
                </p>
                <p>
                  Draw calls: <strong>{perfSnapshot.drawCalls}</strong>
                </p>
                <p>
                  Triangles: <strong>{perfSnapshot.triangles}</strong>
                </p>
                <p>
                  GPU mem: <strong>geo {perfSnapshot.geometries} / tex {perfSnapshot.textures}</strong>
                </p>
              </>
            ) : null}
          </article>
        </aside>
      ) : null}

      {objectAddDropFeedback ? (
        <aside
          className={`canvas-object-add-drop-feedback canvas-object-add-drop-feedback-${objectAddDropFeedback.variant}`}
          role="status"
          aria-live="polite"
          style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
        >
          {objectAddDropFeedback.message}
        </aside>
      ) : objectAddPlacementMode ? (
        <aside
          className="canvas-object-add-drop-feedback canvas-object-add-placement-prompt canvas-object-add-drop-feedback-success"
          role="status"
          aria-live="polite"
          aria-label="object placement mode"
          style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
        >
          <span>
            Placing {objectAddPlacementMode.template.tag}: click tiles to add more.
          </span>
          <button
            type="button"
            className="canvas-object-add-placement-done-btn"
            onClick={() => placeObjectAddAtSceneCenter()}
          >
            Place center
          </button>
          <button
            type="button"
            className="canvas-object-add-placement-done-btn"
            onClick={() => cancelObjectAddPlacement("manual")}
          >
            Stop placing
          </button>
        </aside>
      ) : null}

      {visualTransformBlockedReason ? (
        <aside
          className="canvas-vt-blocked-note"
          role="note"
          aria-label="visual transform blocked info"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          {visualTransformBlockedReason}
        </aside>
      ) : null}

      {toolbarState.canvasDebug.controlsHint ? (
        <aside
          className="canvas-controls-hint"
          role="note"
          aria-label="controls hint"
          style={{
            left: `${hudLeftPx}px`,
            bottom: `${controlsHintBottomPx}px`,
            maxWidth: hudMaxWidth
          }}
        >
          <button type="button" className="canvas-controls-hint-chip" aria-label="Controls help">
            <span className="canvas-controls-hint-icon" aria-hidden="true">
              i
            </span>
            <span>Controls</span>
          </button>
          <div className="canvas-controls-hint-popup" role="tooltip">
            {inputHint}
          </div>
        </aside>
      ) : null}
    </section>
  );
}





