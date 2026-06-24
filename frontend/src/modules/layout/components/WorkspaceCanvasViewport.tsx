import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type WheelEvent
} from "react";
import * as THREE from "three";
import type {
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type {
  AreaScene,
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
  writeSoundRenderDiagnostics
} from "../adapters/three/workspaceObjectMeshLayer";
import {
  AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
  clearTerrainMesh,
  rebuildTerrainMesh,
  resolveTerrainScenePackageReadiness,
  resolveTerrainRenderStatus,
  type AreaTerrainTileModelRuntimeSnapshot
} from "../adapters/three/workspaceTerrainMesh";
import {
  PLACEABLE_MODEL_STATUS_EVENT
} from "../adapters/three/workspacePlaceableModelPresentation";
import {
  applyOrbitPointerBindings,
  applyPlaceableAssetRequestHeaders,
  centerCameraForScene,
  createRuntime,
  disposeRuntime,
  focusCameraOnPoint,
  resizeRuntime,
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
import {
  clearPlaceableModelLoadQueue,
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
  areSoundPropertiesDraftsEqual,
  arePlaceablePropertiesDraftsEqual,
  areDoorPropertiesDraftsEqual,
  areCreaturePropertiesDraftsEqual,
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
import { useWorkspaceKeyboardObjectActions } from "../application/useWorkspaceKeyboardObjectActions";
import { useWorkspaceObjectCommands } from "../application/useWorkspaceObjectCommands";
import {
  useWorkspacePointerSelection,
  type SelectionBoxState
} from "../application/useWorkspacePointerSelection";
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
  filterObjectsByRenderObjectIds,
  filterSelectedObjectIdsForVisibleSelectableObjects,
  fromAdjustLocationCoordinate,
  fromAdjustLocationHeight,
  isKindLocked,
  isObjectSelectableByCatalogScope,
  isObjectSelectableByScope,
  isObjectVisibleWithRenderFilter,
  isObjectVisibleWithRenderFilterState,
  normalizeBearingDegreesForInput,
  resolveAdjustLocationVisualTransformMeta,
  resolveMockRenderStatus,
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
const AREA_OBJECT_RUNTIME_DIAGNOSTICS_DEBOUNCE_MS = 300;
export const AREA_OBJECT_RUNTIME_EVIDENCE_DATASET_LIMIT = 256;

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
  stillLoadingIds: string[];
  primitiveFallbackIds: string[];
  blockedIds: string[];
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
} {
  let drawParticles = 0;
  let renderedVertices = 0;
  const drawLanes = new Set<string>();
  const addLane = (value: unknown) => {
    if (typeof value === "string" && value.trim().length > 0) {
      drawLanes.add(value.trim());
    }
  };

  addLane(root?.userData?.auroraEmitterPackageSource);
  addLane(root?.userData?.auroraEmitterType);
  addLane(root?.userData?.auroraEmitterBlendMode);
  addLane(root?.userData?.auroraEmitterRenderMode);

  root?.traverse((node) => {
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
    drawLanes: Array.from(drawLanes)
  };
}

function clearPlaceablesVfxPreviewDrawMetrics(runtime: RuntimeState): void {
  delete runtime.container.dataset.appVfxDrawMetricsStatus;
  delete runtime.container.dataset.appVfxDrawMetricsObjectId;
  delete runtime.container.dataset.appVfxDrawParticles;
  delete runtime.container.dataset.appVfxRenderedVertices;
  delete runtime.container.dataset.appVfxDrawLanes;
  delete runtime.container.dataset.appVfxDrawMetricsSource;
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
  const status =
    total === 0
      ? "none"
      : blockedCount === 0 && modelUrlReadyCount === total
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
  }
> {
  const evidenceByObjectId = new Map<
    string,
    {
      geometryStatus: string;
      placeholderReason: AreaPlaceablePlaceholderReason;
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
      placeholderReason: placeholderReason as AreaPlaceablePlaceholderReason
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

function writeAreaSharedRendererRuntimeSnapshot(
  runtime: RuntimeState,
  diagnostics: ReturnType<typeof resolveAreaObjectBackendRenderContractDiagnostics>
): void {
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
    stillLoadingIds: splitLimitedAreaRuntimeIdList(diagnostics.stillLoadingIds),
    primitiveFallbackIds: splitLimitedAreaRuntimeIdList(diagnostics.primitiveFallbackIds),
    blockedIds: splitLimitedAreaRuntimeIdList(diagnostics.blockedIds)
  };
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
  runtime.objectMeshById.forEach((root, fallbackObjectId) => {
    const userData = root.userData;
    if (
      userData?.auroraAreaObjectSharedRendererRuntimeMarker !==
      "shared-placeables-renderer"
    ) {
      return;
    }
    const objectId =
      typeof userData.objectId === "string" && userData.objectId.length > 0
        ? userData.objectId
        : fallbackObjectId;
    const rawReason = userData.auroraAreaObjectSharedRendererPlaceholderReason;
    const reason = AREA_PLACEABLE_PLACEHOLDER_REASONS.includes(
      rawReason as AreaPlaceablePlaceholderReason
    )
      ? (rawReason as AreaPlaceablePlaceholderReason)
      : "not-applicable";
    placeholderReasonIds[reason].push(objectId);
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
  const blockedIds = primitiveFallbackIds;
  const modelReadyCount = placeholderReasonIds.none.length;
  const total = Math.max(0, snapshot.total);
  const payloadBoundCount = Math.max(0, snapshot.payloadBoundCount);
  const primitiveFallbackCount = primitiveFallbackIds.length;
  const status =
    total === 0
      ? "none"
      : primitiveFallbackCount === 0 &&
          payloadBoundCount >= total &&
          modelReadyCount >= total
        ? "ready"
        : payloadBoundCount > 0 || modelReadyCount > 0
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
    stillLoadingIds: limitAreaRuntimeIdList(stillLoadingIds),
    primitiveFallbackIds: limitAreaRuntimeIdList(primitiveFallbackIds),
    blockedIds: limitAreaRuntimeIdList(blockedIds)
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
  runtime.container.dataset.areaObjectSharedRendererStillLoadingIds =
    joinLimitedAreaRuntimeIds(stillLoadingIds);
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
    dataset.areaTileProcessRuntimeSnapshot = JSON.stringify(snapshot);
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
  dataset.areaTileProcessRuntimeSnapshot = JSON.stringify(snapshot);
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
  placeableRenderPayloadsByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  const counts: Record<SceneObjectKind, number> = {
    placeables: 0,
    creatures: 0,
    doors: 0,
    items: 0,
    sounds: 0
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
  renderObjectIds?: string[] | null;
  areaCanvasLoading?: WorkspaceAreaCanvasLoadingState | null;
  areaTileProcessReadiness?: AreaTileProcessContractReadiness | null;
  placeableRenderPayloadByObjectId?: Record<string, PlaceableViewportRenderPayload> | null;
  placeableAssetAccessToken?: string | null;
  showGizmoModeBadge?: boolean;
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
const SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const ASSET_LOADING_RENDER_INTERVAL_MS = 80;
const PERF_SNAPSHOT_INTERVAL_MS = 300;

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
    snapshot.modelReadyCount >= snapshot.total &&
    snapshot.primitiveFallbackCount === 0
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
  return {
    visible: true,
    completed,
    total,
    inFlight,
    queued:
      requestedQueued !== null
        ? Math.min(Math.max(0, remaining - inFlight), requestedQueued)
        : Math.max(0, remaining - inFlight),
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
  renderObjectIds,
  areaCanvasLoading,
  areaTileProcessReadiness,
  placeableRenderPayloadByObjectId,
  placeableAssetAccessToken = null,
  showGizmoModeBadge = true
}: WorkspaceCanvasViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
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
  const lastPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const bookmark1Ref = useRef<ThreeCameraBookmark | null>(null);
  const perfFrameRef = useRef({
    frameCount: 0,
    lastTick: 0,
    lastRenderAt: 0
  });
  const isCanvasAssetLoadingRef = useRef(false);
  const perfHudEnabledRef = useRef(false);
  const areaObjectDiagnosticsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sceneHistory, setSceneHistory] = useState<SceneHistoryState>(() =>
    externalSceneSeed
      ? sceneViewportPort.createHistoryFromScene(externalSceneSeed)
      : sceneViewportPort.createInitialHistory(userId)
  );
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const selectedObjectIdsRef = useRef<string[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
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
  const {
    objectAddPlacementMode,
    objectAddDropFeedback,
    beginObjectAddPlacement,
    cancelObjectAddPlacement,
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
      toolbarState.visibility.items,
      toolbarState.visibility.placeables,
      toolbarState.visibility.sounds,
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
    const initialPlaceableAssetAccessToken = placeableAssetAccessToken?.trim() || null;
    applyPlaceableAssetRequestHeaders(runtime, initialPlaceableAssetAccessToken);
    placeableAssetAccessTokenRef.current = initialPlaceableAssetAccessToken;
    setWebglFallbackReason(null);
    setWebglReady(true);
    const handlePlaceableModelStatus = (event: Event) => {
      const customEvent = event as CustomEvent<PlaceableModelStatusEventDetailLike>;
      const detail = customEvent.detail ?? {};
      refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
      if (!isPlaceableModelOverlayLoadPhase(detail.loadPhase)) {
        if (isRuntimeAreaSharedRendererModelLoadComplete(runtime)) {
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
      const detail = customEvent.detail;
      refreshAreaSharedRendererRuntimeSnapshotFromObjectEvidence(runtime);
      if (!detail || detail.loadTotal <= 0) {
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
      AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
      handleAreaSharedRendererSnapshot
    );

    resizeRuntime(runtime);
    centerCameraForScene(runtime, scene, { objectPreview: !renderAreaGeometry });
    perfFrameRef.current = {
      frameCount: 0,
      lastTick: performance.now(),
      lastRenderAt: 0
    };

    const animate = () => {
      const now = performance.now();
      const assetLoading = isCanvasAssetLoadingRef.current;
      if (!assetLoading) {
        runtime.controls.update();
      }
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
        AREA_SHARED_RENDERER_SNAPSHOT_EVENT,
        handleAreaSharedRendererSnapshot
      );
      disposeRuntime(runtime);
      runtimeRef.current = null;
      setWebglReady(false);
      setPlaceableLoadOverlay(createHiddenAssetLoadOverlayState());
    };
  }, [userId]);

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

    rebuildGridLayer(runtime, scene, viewportFacade, sceneGridVisibility.renderTileOverlayLayer);
    runtime.gridLayer.visible = sceneGridVisibility.renderGridLayer;
    runtime.tileOverlayLayer.visible = sceneGridVisibility.renderTileOverlayLayer;
    runtime.axesHelper.visible = toolbarState.canvasDebug.axes;
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
  }, [
    renderAreaGeometry,
    sceneGridVisibility,
    sceneViewportPort,
    scene,
    selectedTileId,
    toolbarState.canvasDebug.axes,
    toolbarState.canvasDebug.chunkBounds,
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.textureCompression,
    toolbarState.canvasDebug.textures,
    toolbarState.canvasDebug.walkmeshOverlay,
    toolbarState.canvasDebug.wireframe,
    areaTileProcessReadiness,
    viewportFacade
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);

    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      selectedObjectIdsRef.current,
      toolbarState.canvasDebug,
      sceneScale,
      renderAreaGeometry,
      adjustLocationUnitsPerTile,
      runtimeSoundNowPlayingBadges,
      workspaceOptions.showRuntimeSoundNowPlaying,
      placeableRenderPayloadByObjectId ?? null
    );
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
    toolbarState.canvasDebug.hiddenMeshes,
    toolbarState.canvasDebug.lockedKinds.creatures,
    toolbarState.canvasDebug.lockedKinds.doors,
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds,
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
    workspaceOptions.showRuntimeSoundNowPlaying
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
    updateObjectMeshSelectionState(
      runtime,
      visibleObjects,
      selectedObjectIds,
      toolbarState.canvasDebug,
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
      writeSoundRenderDiagnostics(runtimeRef.current);
      writeAreaObjectSourceDiagnostics(
        runtimeRef.current,
        visibleObjects,
        selectedObjectIds,
        placeableRenderPayloadByObjectId ?? null
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
    placeableRenderPayloadByObjectId
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
    toolbarState.canvasDebug.lockedKinds.items,
    toolbarState.canvasDebug.lockedKinds.placeables,
    toolbarState.canvasDebug.lockedKinds.sounds
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
    copySelectedObjectsToClipboard,
    deleteSelectedObjects,
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
    selectedObjectCount: visibleSelectableSelectedObjectIds.length,
    toolbarState,
    workspaceOptions,
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects
  });

  const { handleMouseDown, handleMouseMove, handleMouseUp } = useWorkspacePointerSelection({
    runtimeRef,
    pointerRuntimePort: workspaceThreePointerRuntimePort,
    anchoredOverlayRuntimePort: workspaceThreeAnchoredOverlayRuntimePort,
    scene,
    sceneViewportPort,
    viewportFacade,
    visibleObjects,
    selectedObjectIds,
    selectionBox,
    setSelectionBox,
    setSelectedObjectIds,
    setSelectedTileId,
    setSceneHistory,
    setContextMenu,
    toolbarState,
    workspaceOptions,
    objectBrush,
    terrainBrush,
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

  const handleCanvasMouseDown = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isCanvasAssetLoading) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      if (handleCanvasObjectAddMouseDown(event)) {
        return;
      }
      handleMouseDown(event);
    },
    [
      blockCanvasPointerWhileLoading,
      handleCanvasObjectAddMouseDown,
      handleMouseDown,
      isCanvasAssetLoading
    ]
  );

  const handleCanvasMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isCanvasAssetLoading) {
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
      isCanvasAssetLoading
    ]
  );

  const handleCanvasMouseUp = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (isCanvasAssetLoading) {
        blockCanvasPointerWhileLoading(event);
        return;
      }
      handleMouseUp(event);
    },
    [blockCanvasPointerWhileLoading, handleMouseUp, isCanvasAssetLoading]
  );

  const handleCanvasMouseLeave = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (handleCanvasObjectAddMouseLeave()) {
        return;
      }
      handleCanvasMouseUp(event);
    },
    [handleCanvasMouseUp, handleCanvasObjectAddMouseLeave]
  );

  const handleCanvasWheel = useCallback(
    (event: WheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (isCanvasAssetLoading) {
        return;
      }
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
      const nextValue = Number(rawValue);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      const sanitizedValue =
        field === "bearingDeg" ? normalizeBearingDegreesForInput(nextValue) : nextValue;
      setAdjustLocationDialog((current) =>
        current
          ? {
              ...current,
              draft: {
                ...current.draft,
                [field]: sanitizedValue
              }
            }
          : current
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
      const draftVtZWorld = fromAdjustLocationHeight(
        draft.zTranslation,
        adjustLocationUnitsPerTile
      );
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
        nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, objectIds, {
          scale: draft.scale,
          offsetX: draft.xTranslation,
          offsetY: draft.yTranslation,
          offsetZ: draftVtZWorld,
          pitch: toRadians(draft.xRotationDeg),
          yaw: toRadians(draft.yRotationDeg),
          roll: toRadians(draft.zRotationDeg)
        });
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
        const sourcePlaceableProperties = sourceObject.placeableProperties;
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
      const nextNameBase = "as_mock_sound";
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
    (index: number, field: "className" | "level", value: string | number) => {
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

  const applyCreaturePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!creaturePropertiesDialog) {
        return;
      }
      const objectId = creaturePropertiesDialog.objectId;
      const draft = creaturePropertiesDialog.draft;
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
        const nextAppearanceResRef = draft.appearance.trim() || sourceObject.resRef;
        const nextFirstName = draft.firstName.trim() || resolveSceneObjectName(sourceObject);
        const nextName = [nextFirstName, draft.lastName.trim()].filter((part) => part.length > 0).join(" ");

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
            movementRate: draft.movementRate
          },
          appearanceSettings: {
            partBasedAppearance: draft.appearancePartBased,
            ...draft.appearanceParts
          },
          classEntries: draft.classEntries
            .filter((entry) => entry.className.trim().length > 0)
            .map((entry) => ({
              className: entry.className.trim(),
              level: Math.max(1, Math.trunc(entry.level))
            })),
          skills: draft.skills.map((entry) => ({
            skill: entry.skill,
            rank: Math.max(0, Math.trunc(entry.rank))
          })),
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            corpseDecayTimeSeconds: Math.max(
              0,
              Math.trunc(draft.advancedSettings.corpseDecayTimeSeconds)
            )
          },
          feats: draft.feats.map((entry) => ({ ...entry })),
          spells: draft.spells.map((entry) => ({ ...entry })),
          specialAbilities: draft.specialAbilities.map((entry) => ({ ...entry })),
          comments: draft.comments
        };

        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName.length > 0 ? nextName : nextTag,
                tag: nextTag,
                resRef: nextAppearanceResRef,
                creatureProperties: nextCreatureProperties,
                placeableProperties: undefined,
                soundPositioning: undefined,
                doorTransition: undefined
              }
            : object
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
      if (closeAfterApply) {
        setCreaturePropertiesDialog(null);
      }
    },
    [creaturePropertiesDialog, sceneViewportPort, trackTelemetry, userId]
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
    clearAdjustLocationDialog: () => setAdjustLocationDialog(null),
    clearPlaceablePropertiesDialog: () => setPlaceablePropertiesDialog(null),
    clearSoundPropertiesDialog: () => setSoundPropertiesDialog(null),
    clearDoorPropertiesDialog: () => setDoorPropertiesDialog(null),
    clearCreaturePropertiesDialog: () => setCreaturePropertiesDialog(null)
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
      selectedObject.kind !== "creatures"
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
      openPlaceablePropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "sounds") {
      setPlaceablePropertiesDialog(null);
      setDoorPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      openSoundPropertiesDialog(selectedObject);
    } else if (selectedObject.kind === "doors") {
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setCreaturePropertiesDialog(null);
      openDoorPropertiesDialog(selectedObject);
    } else {
      setPlaceablePropertiesDialog(null);
      setSoundPropertiesDialog(null);
      setDoorPropertiesDialog(null);
      openCreaturePropertiesDialog(selectedObject);
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
    clampCreaturePropertiesDialogPosition
  });

  const selectedTile = selectedTileId
    ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
    : null;

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
    (object) => resolveMockRenderStatus(object) === "non_render"
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
    contextObject?.kind === "creatures";

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
        data-external-scene-id={externalSceneSeed?.sceneId ?? ""}
        data-external-scene-size={
          externalSceneSeed ? `${externalSceneSeed.width}x${externalSceneSeed.height}` : ""
        }
        data-external-scene-object-count={externalSceneSeed?.objects.length ?? ""}
        onMouseDown={handleCanvasMouseDown}
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

      {renderAreaGeometry &&
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





