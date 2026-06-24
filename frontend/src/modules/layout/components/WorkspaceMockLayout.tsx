import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AreaScene, SceneObject, SceneObjectKind } from "../contracts";
import type {
  WorkspaceChromeFacade,
  WorkspaceCommandSignal,
  WorkspaceUserRole,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type { SceneObjectCatalogQueryFacade } from "../application/sceneObjectCatalogQueryFacade";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import { AreasModePanel } from "./AreasModePanel";
import { PlaceablesModePanel, type PlaceablesSubtypeFilter } from "./PlaceablesModePanel";
import { PlaceablesModeRightPanel } from "./PlaceablesModeRightPanel";
import { SceneObjectListPanel } from "./SceneObjectListPanel";
import {
  SoundsModePanel,
  type SoundPlaybackDeliveryEvidence,
  type SoundPlaybackPipelineState,
  type SoundsCategoryFilter,
  type SoundsSourceFilter
} from "./SoundsModePanel";
import { SoundsModeRightPanel } from "./SoundsModeRightPanel";
import { WorkspaceModeSwitch } from "./WorkspaceModeSwitch";
import type { SceneObjectCatalogType } from "./SceneObjectListPanel";
import {
  WorkspaceCanvasViewport,
  type WorkspaceAreaCanvasLoadingState
} from "./WorkspaceCanvasViewport";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  type WorkspaceOptionSettings
} from "../workspaceOptionSettings";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { AreaListClientCacheEntry } from "./AreaSelectionPanel";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import {
  resolveAreaTileProcessContractReadiness,
  type AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";
import type { TileApiPort } from "../../tiles/ports/tileApiPort";
import type { PlaceableApiPort } from "../../placeables/ports/placeableApiPort";
import type { SoundApiPort } from "../../sounds/ports/soundApiPort";
import type {
  SoundApiAudioDeliveryContract,
  SoundApiListItem
} from "../../sounds/contracts";
import { mapSoundApiListItemToSceneObject } from "../../sounds/application/soundSceneObjectMapper";
import { mapPlaceablePreviewToScene } from "../../placeables/application/placeablePreviewSceneMapper";
import { createSeedAreaScene } from "../../scene/domain/sceneFactory";
import {
  buildVfxPayloadFromPlaceablePreview,
  buildVfxPayloadFromRenderPayload,
  isPlaceablePreviewVfx
} from "../../placeables/application/placeableVfxPreservePayload";
import {
  fetchPlaceableViewportRenderPayload,
  fetchPlaceableViewportRenderPayloadBatch,
  type FetchPlaceableViewportRenderPayloadBatchResult,
  type PlaceableViewportRenderPayload
} from "../../placeables/application/placeableRenderPayloadResolver";
import {
  getDefaultWorkspaceModeId,
  resolveWorkspaceMode,
  type WorkspaceModeDefinition,
  type WorkspaceModeId
} from "../workspaceModes";
import {
  AREA_PLACEABLE_PLACEHOLDER_REASONS,
  resolveAreaPlaceablePlaceholderReason,
  isSharedPlaceablesRendererSceneObject,
  resolvePlaceableRenderContractState,
  resolvePlaceableRenderPayloadFromLookup,
  resolvePlaceableRenderPayloadLookup,
  resolvePublishedPlaceableRenderPayloadKeys,
  SHARED_PLACEABLES_RENDERER_PATH,
  type AreaPlaceablePlaceholderReason,
  type PlaceableRenderPayloadLookup
} from "../application/workspacePlaceableRenderContracts";

interface WorkspaceMockLayoutProps {
  role: WorkspaceUserRole;
  userId: string;
  workspaceChromeFacade: WorkspaceChromeFacade;
  sceneViewportPort: SceneViewportPort;
  areaApiPort: AreaApiPort;
  tileApiPort?: TileApiPort;
  placeableApiPort?: PlaceableApiPort;
  soundApiPort?: SoundApiPort;
  backendAccessToken: string | null;
  sceneObjectCatalogQueryFacade: SceneObjectCatalogQueryFacade;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  activeBuilderModeId?: WorkspaceModeId;
  onActiveBuilderModeChange?: (modeId: WorkspaceModeId) => void;
  toolbarState: WorkspaceToolbarState;
  commandSignal: WorkspaceCommandSignal | null;
  workspaceOptions: WorkspaceOptionSettings;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  onToggleLeftCollapsed: () => void;
  onToggleRightCollapsed: () => void;
  onBackendSessionInvalidated?: (
    source: "placeables_catalog" | "sounds_catalog",
    accessToken: string
  ) => void;
}

const SIDEBAR_EXPANDED_WIDTH_PX = 320;
const SIDEBAR_COLLAPSED_WIDTH_PX = 44;
export const PLACEABLES_MODE_STATE_STORAGE_KEY = "aurora_web.placeables_mode_state.v1";
export const AREAS_MODE_SELECTED_SCENE_STORAGE_KEY =
  "aurora_web.areas_mode_selected_scene.v1";

interface PersistedPlaceablesModeState {
  activeObjectId: string | null;
  searchQuery: string;
  subtypeFilter: PlaceablesSubtypeFilter;
}

function isPlaceablesSubtypeFilter(value: unknown): value is PlaceablesSubtypeFilter {
  return (
    value === "all" ||
    value === "generic" ||
    value === "door" ||
    value === "container" ||
    value === "vfx" ||
    value === "light_source" ||
    value === "trigger_proxy"
  );
}

function resolvePlaceablesCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load placeables from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load placeables from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load placeables: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load placeables from backend: ${detail}` : fallbackMessage;
}

function resolveSoundsCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load sounds from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load sounds from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load sounds: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load sounds from backend: ${detail}` : fallbackMessage;
}

function isBackendInvalidSessionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  return status === 401 && code === "INVALID_SESSION";
}

interface SidebarSelectSignal {
  revision: number;
  objectId: string;
  additive: boolean;
  sourceType: SceneObjectCatalogType;
  allowedObjectIds: string[];
}

interface SidebarContextMenuSignal {
  revision: number;
  objectId: string;
  objectKind: SceneObjectKind;
  clientX: number;
  clientY: number;
}

interface SidebarPropertiesSignal {
  revision: number;
  objectId: string;
  objectKind: SceneObjectKind;
}

interface CanvasCreateObjectSignal {
  revision: number;
  template: SceneObject;
}

function loadPersistedPlaceablesModeState(
  storage: Storage
): PersistedPlaceablesModeState {
  try {
    const raw = storage.getItem(PLACEABLES_MODE_STATE_STORAGE_KEY);
    if (!raw) {
      return {
        activeObjectId: null,
        searchQuery: "",
        subtypeFilter: "all"
      };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        activeObjectId: null,
        searchQuery: "",
        subtypeFilter: "all"
      };
    }
    const record = parsed as Record<string, unknown>;
    return {
      activeObjectId:
        typeof record.activeObjectId === "string" && record.activeObjectId.trim().length > 0
          ? record.activeObjectId
          : null,
      searchQuery:
        typeof record.searchQuery === "string" && record.searchQuery.trim().length > 0
          ? record.searchQuery.slice(0, 120)
          : "",
      subtypeFilter: isPlaceablesSubtypeFilter(record.subtypeFilter)
        ? record.subtypeFilter
        : "all"
    };
  } catch {
    return {
      activeObjectId: null,
      searchQuery: "",
      subtypeFilter: "all"
    };
  }
}

function loadInitialPlaceablesModeState(
  storage: Storage,
  search: string
): PersistedPlaceablesModeState {
  const persisted = loadPersistedPlaceablesModeState(storage);
  const params = new URLSearchParams(search);
  const requestedPlaceable =
    params.get("placeable")?.trim() ||
    params.get("templateId")?.trim() ||
    params.get("resref")?.trim() ||
    "";
  const requestedSubtype = params.get("subtype")?.trim() || "";

  return {
    activeObjectId: requestedPlaceable || persisted.activeObjectId,
    searchQuery: requestedPlaceable || persisted.searchQuery,
    subtypeFilter: isPlaceablesSubtypeFilter(requestedSubtype)
      ? requestedSubtype
      : persisted.subtypeFilter
  };
}

function persistPlaceablesModeState(
  state: PersistedPlaceablesModeState,
  storage: Storage
): void {
  try {
    storage.setItem(PLACEABLES_MODE_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota/availability issues; the in-memory preview still works.
  }
}

function isPersistableAreaScene(value: unknown): value is AreaScene {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<AreaScene>;
  return (
    record.source === "aurora_area" &&
    typeof record.sceneId === "string" &&
    record.sceneId.trim().length > 0 &&
    typeof record.width === "number" &&
    typeof record.height === "number" &&
    Array.isArray(record.tiles) &&
    Array.isArray(record.objects)
  );
}

function loadPersistedAreaSceneSeed(storage: Storage | null | undefined): AreaScene | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    return isPersistableAreaScene(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistAreaSceneSeed(scene: AreaScene | null, storage: Storage | null | undefined): void {
  if (!storage) {
    return;
  }
  try {
    if (!isPersistableAreaScene(scene)) {
      storage.removeItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY);
      return;
    }
    storage.setItem(AREAS_MODE_SELECTED_SCENE_STORAGE_KEY, JSON.stringify(scene));
  } catch {
    // Session restore is a convenience; live Area rendering remains source-driven.
  }
}

function buildAreaSceneTileProcessReadinessSignature(scene: AreaScene): string {
  return [scene.sceneId, scene.backendUpdatedAt ?? "", scene.tiles.length].join(":");
}

interface SceneObjectCatalogScope {
  sourceType: SceneObjectCatalogType;
  allowedObjectIds: string[];
}

interface PlaceablesCatalogClientCacheEntry {
  query: string;
  subtypeFilter: PlaceablesSubtypeFilter;
  objects: SceneObject[];
  total: number;
  expiresAtMs: number;
}

interface SoundsCatalogClientCacheEntry {
  query: string;
  items: SoundApiListItem[];
  total: number;
  expiresAtMs: number;
}

interface PlaceablesCatalogListItem {
  templateId: string;
  resref: string;
  name: string;
  category: string;
  placeableSubtype?:
    | "generic"
    | "door"
    | "vfx"
    | "container"
    | "light_source"
    | "trigger_proxy";
  previewImageUrl?: string;
}

const PLACEABLES_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const PLACEABLES_CATALOG_BATCH_SIZE = 1000;
const PLACEABLES_CATALOG_PAGE_YIELD_MS = 75;
const PLACEABLES_CATALOG_SEARCH_DEBOUNCE_MS = 250;
const AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY = 16;
const AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY = 2;
const AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS = 0;
const AREAS_RENDER_PAYLOAD_BATCH_SIZE = 128;
const AREAS_RENDER_PAYLOAD_BATCH_RETRY_LIMIT = 5;
const AREAS_RENDER_PAYLOAD_BATCH_RETRY_DELAY_MS = 60;
const AREAS_RENDER_PAYLOAD_LOADING_LABEL = "Loading Area PLC/DOR render payloads";
const PLACEABLE_PAYLOAD_RENDER_FLUSH_MS = 16;
const AREAS_RENDER_PAYLOAD_SNAPSHOT_ID_LIMIT = 24;
const SOUNDS_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const SOUNDS_CATALOG_BATCH_SIZE = 100;
const SOUNDS_CATALOG_PAGE_YIELD_MS = 75;
const SOUNDS_CATALOG_SEARCH_DEBOUNCE_MS = 250;

type AreaPlaceableRenderPayloadQueueMode = "batch" | "single" | "unavailable";
type AreaPlaceableRenderPayloadQueueStatus = "idle" | "loading" | "ready" | "blocked";

interface AreaPlaceableRenderPayloadQueueSnapshot {
  rendererPath: typeof SHARED_PLACEABLES_RENDERER_PATH;
  status: AreaPlaceableRenderPayloadQueueStatus;
  placeholderStatus: AreaPlaceableRenderPayloadQueueStatus;
  queueMode: AreaPlaceableRenderPayloadQueueMode;
  objectCount: number;
  lookupCount: number;
  payloadReadyLookupCount: number;
  modelReadyLookupCount: number;
  stillLoadingLookupCount: number;
  missingPayloadCount: number;
  failedLookupCount: number;
  batchSize: number;
  batchCount: number;
  completedBatchCount: number;
  pendingObjectIds: string;
  missingPayloadIds: string;
  placeholderReasonCounts: Record<AreaPlaceablePlaceholderReason, number>;
  placeholderReasonIds: Record<AreaPlaceablePlaceholderReason, string[]>;
}

const DEFAULT_VISUAL_TRANSFORM = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  roll: 0,
  yaw: 0
} as const;

const PLACEABLES_PREVIEW_VISIBILITY: WorkspaceToolbarState["visibility"] = {
  creatures: false,
  doors: false,
  encounters: false,
  items: false,
  merchants: false,
  placeables: true,
  sounds: false,
  triggers: false,
  waypoints: false,
  start_location: false
};

const PLACEABLES_PREVIEW_LOCKED_KINDS: WorkspaceToolbarState["canvasDebug"]["lockedKinds"] = {
  creatures: false,
  doors: false,
  items: false,
  placeables: false,
  sounds: false
};

const PLACEABLES_PREVIEW_WORKSPACE_OPTIONS: WorkspaceOptionSettings = {
  ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
  showPerObjectGizmoHints: false,
  showTileGridOverlay: false,
  enableRuntimeSoundPreview: false,
  showRuntimeSoundNowPlaying: false
};

const SCENE_KIND_TO_CATALOG_TYPE: Record<SceneObjectKind, SceneObjectCatalogType> = {
  placeables: "placeables",
  creatures: "creatures",
  doors: "doors",
  items: "items",
  sounds: "sounds"
};

function resolvePlaceablesPreviewToolbarState(
  toolbarState: WorkspaceToolbarState
): WorkspaceToolbarState {
  return {
    ...toolbarState,
    selectionMode: "object",
    selectionScope: "placeables",
    visibility: { ...PLACEABLES_PREVIEW_VISIBILITY },
    canvasDebug: {
      ...toolbarState.canvasDebug,
      wireframe: false,
      textures: true,
      grid: true,
      axes: true,
      bounds: false,
      hiddenMeshes: false,
      showNonRenderMeshes: false,
      showVtPhysicalAnchor: false,
      statusMap: "off",
      textureCompression: "none",
      gizmoMode: "translate",
      snapGrid: false,
      snapAngle: false,
      snapHeight: false,
      lockedKinds: { ...PLACEABLES_PREVIEW_LOCKED_KINDS },
      isolateKind: "none",
      chunkBounds: false,
      objectLabels: false,
      perfHud: false,
      walkmeshOverlay: false,
      collisionOverlay: false,
      controlsHint: false,
      runtimeHud: false
    }
  };
}

function filterObjectsForWorkspaceMode(
  objects: SceneObject[],
  mode: WorkspaceModeDefinition
): SceneObject[] {
  const allowedTypes = new Set(mode.allowedCatalogTypes);
  if (allowedTypes.has("all")) {
    return objects;
  }
  return objects.filter((object) => allowedTypes.has(SCENE_KIND_TO_CATALOG_TYPE[object.kind]));
}

function buildPlaceablePreviewIdentityFromObject(object: SceneObject): {
  templateId: string;
  resref: string;
  name: string;
  kind: "placeables";
} {
  const templateId = object.id.startsWith("preview:")
    ? object.id.slice("preview:".length)
    : object.id;
  return {
    templateId,
    resref: object.resRef,
    name: object.name ?? object.tag,
    kind: "placeables"
  };
}

function resolveSceneObjectPreviewVfxPayload(object: SceneObject | null | undefined) {
  if (!object || object.kind !== "placeables") {
    return undefined;
  }
  if (object.vfxPayload) {
    return object.vfxPayload;
  }
  return buildVfxPayloadFromPlaceablePreview(buildPlaceablePreviewIdentityFromObject(object));
}

interface BuildPreviewSceneFromObjectOptions {
  now?: () => number;
  renderPayload?: PlaceableViewportRenderPayload | null;
}

function buildPreviewSceneFromObject(
  object: SceneObject,
  options: BuildPreviewSceneFromObjectOptions = {}
): AreaScene {
  const now = options.now ?? (() => Date.now());
  const renderVfxPayload = options.renderPayload
    ? buildVfxPayloadFromRenderPayload(options.renderPayload)
    : undefined;
  const previewIdentity = buildPlaceablePreviewIdentityFromObject(object);
  const isPreviewVfx =
    Boolean(renderVfxPayload) ||
    Boolean(resolveSceneObjectPreviewVfxPayload(object)) ||
    isPlaceablePreviewVfx(previewIdentity);
  const previewScene = mapPlaceablePreviewToScene(
    {
      ...previewIdentity,
      tag: object.tag,
      ...(isPreviewVfx ? { placeableSubtype: "vfx" } : {}),
      x: 0.5,
      y: 0.5,
      z: 0,
      bearing: object.bearing
    },
    {
      now,
      width: 1,
      height: 1
    }
  );
  if (!renderVfxPayload) {
    return previewScene;
  }
  return {
    ...previewScene,
    objects: previewScene.objects.map((previewObject, index) =>
      index === 0
        ? {
            ...previewObject,
            vfxPayload: renderVfxPayload
          }
        : previewObject
    )
  };
}

function filterPlaceablesByQuery(objects: SceneObject[], query: string): SceneObject[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return objects;
  }
  return objects.filter((object) => {
    const normalizedTemplateId = object.id.toLowerCase();
    const normalizedName = (object.name ?? "").toLowerCase();
    const normalizedTag = object.tag.toLowerCase();
    const normalizedResRef = object.resRef.toLowerCase();
    return (
      normalizedTemplateId.includes(normalizedQuery) ||
      normalizedName.includes(normalizedQuery) ||
      normalizedTag.includes(normalizedQuery) ||
      normalizedResRef.includes(normalizedQuery)
    );
  });
}

function mapPlaceableListItemToSceneObject(
  item: {
    templateId: string;
    resref: string;
    name: string;
    category: string;
    placeableSubtype?: PlaceablesCatalogListItem["placeableSubtype"];
    previewImageUrl?: string;
  },
  index: number
): SceneObject {
  const fallbackTag = item.resref.trim().length > 0 ? item.resref : item.templateId;
  const normalizedName = item.name.trim().length > 0 ? item.name : `${item.category} ${String(index + 1).padStart(3, "0")}`;
  const normalizedTagSource = normalizedName.trim().length > 0 ? normalizedName : fallbackTag;
  const vfxPayload = buildVfxPayloadFromPlaceablePreview({
    templateId: item.templateId,
    resref: item.resref,
    name: normalizedName,
    kind: "placeables",
    ...(item.placeableSubtype ? { placeableSubtype: item.placeableSubtype } : {})
  });
  return {
    id: item.templateId,
    kind: "placeables",
    name: normalizedName,
    resRef: item.resref,
    tag: normalizedTagSource.toUpperCase(),
    isStatic: true,
    x: 0.5,
    y: 0.5,
    z: 0,
    bearing: 0,
    previewImageUrl: item.previewImageUrl?.trim() || undefined,
    visualTransform: { ...DEFAULT_VISUAL_TRANSFORM },
    placeableProperties: {
      plot: false,
      useable: false,
      hasInventory: false
    },
    ...(vfxPayload ? { vfxPayload } : {})
  };
}

function joinLimitedIds(ids: string[]): string {
  return ids.slice(0, AREAS_RENDER_PAYLOAD_SNAPSHOT_ID_LIMIT).join("|");
}

function createWorkspaceModeResetScene(mode: WorkspaceModeDefinition): AreaScene {
  const seed = createSeedAreaScene(1, 1);
  const modeSlug = mode.id.replace(/_mode$/u, "");
  return {
    ...seed,
    sceneId: `${mode.id}_empty_preview`,
    areaName: `${mode.label} Preview`,
    width: 1,
    height: 1,
    tileSource: {
      type: "seed_placeholder",
      tileCount: 0,
      fallbackReason: `${modeSlug}-mode-empty-preview`
    },
    tiles: [],
    objects: [],
    updatedAtUnixMs: Date.now()
  };
}

function createAreaPlaceablePlaceholderReasonCounts(): Record<
  AreaPlaceablePlaceholderReason,
  number
> {
  return AREA_PLACEABLE_PLACEHOLDER_REASONS.reduce(
    (counts, reason) => {
      counts[reason] = 0;
      return counts;
    },
    {} as Record<AreaPlaceablePlaceholderReason, number>
  );
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

function resolvePayloadForLookupFromStores(
  lookup: PlaceableRenderPayloadLookup,
  payloadByTemplateId: Record<string, PlaceableViewportRenderPayload>,
  payloadCache: Map<string, PlaceableViewportRenderPayload>
): PlaceableViewportRenderPayload | null {
  const statePayload = resolvePlaceableRenderPayloadFromLookup(payloadByTemplateId, lookup);
  if (statePayload) {
    return statePayload;
  }
  return (
    lookup.indexKeys
      .map((key) => payloadCache.get(key))
      .find((payload): payload is PlaceableViewportRenderPayload => Boolean(payload)) ?? null
  );
}

function lookupHasPendingPlaceableRenderPayload(
  lookup: PlaceableRenderPayloadLookup,
  pendingPayloads: Map<string, Promise<PlaceableViewportRenderPayload | null>>
): boolean {
  return lookup.indexKeys.some((key) => pendingPayloads.has(key));
}

function resolveAreaPlaceableRenderPayloadQueueSnapshot(input: {
  queueMode: AreaPlaceableRenderPayloadQueueMode;
  lookups: PlaceableRenderPayloadLookup[];
  objectIdsByLookupCacheKey: Map<string, string[]>;
  payloadByTemplateId: Record<string, PlaceableViewportRenderPayload>;
  payloadCache: Map<string, PlaceableViewportRenderPayload>;
  pendingPayloads: Map<string, Promise<PlaceableViewportRenderPayload | null>>;
  failedLookupKeys: Set<string>;
  treatUnresolvedAsStillLoading: boolean;
  completedBatchCount: number;
}): AreaPlaceableRenderPayloadQueueSnapshot {
  let payloadReadyLookupCount = 0;
  let modelReadyLookupCount = 0;
  let stillLoadingLookupCount = 0;
  let missingPayloadCount = 0;
  const pendingObjectIds: string[] = [];
  const missingPayloadIds: string[] = [];
  const placeholderReasonCounts = createAreaPlaceablePlaceholderReasonCounts();
  const placeholderReasonIds = createAreaPlaceablePlaceholderReasonIds();

  input.lookups.forEach((lookup) => {
    const objectIds = input.objectIdsByLookupCacheKey.get(lookup.cacheKey) ?? [];
    const payload = resolvePayloadForLookupFromStores(
      lookup,
      input.payloadByTemplateId,
      input.payloadCache
    );
    if (payload) {
      payloadReadyLookupCount += 1;
      const renderState = resolvePlaceableRenderContractState(payload);
      const reason = resolveAreaPlaceablePlaceholderReason({
        payload,
        renderState
      });
      placeholderReasonCounts[reason] += 1;
      placeholderReasonIds[reason].push(...objectIds);
      if (reason === "none") {
        modelReadyLookupCount += 1;
      }
      return;
    }

    const isPending =
      lookupHasPendingPlaceableRenderPayload(lookup, input.pendingPayloads) ||
      (input.treatUnresolvedAsStillLoading && !input.failedLookupKeys.has(lookup.cacheKey));
    const reason = resolveAreaPlaceablePlaceholderReason({
      payload: null,
      isPending
    });
    placeholderReasonCounts[reason] += 1;
    placeholderReasonIds[reason].push(...objectIds);
    if (isPending) {
      stillLoadingLookupCount += 1;
      pendingObjectIds.push(...objectIds);
      return;
    }

    missingPayloadCount += 1;
    missingPayloadIds.push(...objectIds);
  });

  const lookupCount = input.lookups.length;
  const batchCount =
    lookupCount > 0 ? Math.ceil(lookupCount / AREAS_RENDER_PAYLOAD_BATCH_SIZE) : 0;
  const status: AreaPlaceableRenderPayloadQueueStatus =
    lookupCount === 0
      ? "idle"
      : stillLoadingLookupCount > 0
        ? "loading"
        : payloadReadyLookupCount === lookupCount
          ? "ready"
          : "blocked";
  const placeholderBlockerCount =
    placeholderReasonCounts["missing-payload"] +
    placeholderReasonCounts["payload-missing-model-url"] +
    placeholderReasonCounts["asset-contract-blocked"] +
    placeholderReasonCounts["model-load-failed"];
  const placeholderStatus: AreaPlaceableRenderPayloadQueueStatus =
    lookupCount === 0
      ? "idle"
      : stillLoadingLookupCount > 0
        ? "loading"
        : placeholderBlockerCount > 0
          ? "blocked"
          : "ready";

  return {
    rendererPath: SHARED_PLACEABLES_RENDERER_PATH,
    status,
    placeholderStatus,
    queueMode: input.queueMode,
    objectCount: Array.from(input.objectIdsByLookupCacheKey.values()).reduce(
      (total, objectIds) => total + objectIds.length,
      0
    ),
    lookupCount,
    payloadReadyLookupCount,
    modelReadyLookupCount,
    stillLoadingLookupCount,
    missingPayloadCount,
    failedLookupCount: input.failedLookupKeys.size,
    batchSize: AREAS_RENDER_PAYLOAD_BATCH_SIZE,
    batchCount,
    completedBatchCount: Math.min(batchCount, input.completedBatchCount),
    pendingObjectIds: joinLimitedIds(pendingObjectIds),
    missingPayloadIds: joinLimitedIds(missingPayloadIds),
    placeholderReasonCounts,
    placeholderReasonIds: Object.fromEntries(
      AREA_PLACEABLE_PLACEHOLDER_REASONS.map((reason) => [
        reason,
        placeholderReasonIds[reason].slice(0, AREAS_RENDER_PAYLOAD_SNAPSHOT_ID_LIMIT)
      ])
    ) as Record<AreaPlaceablePlaceholderReason, string[]>
  };
}

function resolveAreaPlaceableRenderPayloadLoadingState(
  snapshot: AreaPlaceableRenderPayloadQueueSnapshot | null
): WorkspaceAreaCanvasLoadingState | null {
  if (snapshot?.status !== "loading" || snapshot.lookupCount < 1) {
    return null;
  }

  const completed = Math.max(
    0,
    Math.min(
      snapshot.lookupCount,
      snapshot.payloadReadyLookupCount + snapshot.failedLookupCount
    )
  );
  const remaining = Math.max(0, snapshot.lookupCount - completed);
  const activeBatchSize =
    snapshot.queueMode === "batch"
      ? Math.max(1, snapshot.batchSize * AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY)
      : AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY;
  const inFlight = Math.min(remaining, activeBatchSize);
  const queued = Math.max(0, remaining - inFlight);
  const currentLabel = (() => {
    if (snapshot.queueMode !== "batch" || snapshot.batchCount < 1) {
      return "Area PLC/DOR payload queue";
    }
    const firstActiveBatch = Math.min(snapshot.batchCount, snapshot.completedBatchCount + 1);
    const activeBatchCount = Math.min(
      AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY,
      Math.max(1, snapshot.batchCount - snapshot.completedBatchCount)
    );
    const lastActiveBatch = Math.min(
      snapshot.batchCount,
      snapshot.completedBatchCount + activeBatchCount
    );
    if (firstActiveBatch === lastActiveBatch) {
      return `Area PLC/DOR payload batch ${firstActiveBatch}/${snapshot.batchCount}`;
    }
    return `Area PLC/DOR payload batches ${firstActiveBatch}-${lastActiveBatch}/${snapshot.batchCount}`;
  })();

  return {
    source: "areas",
    label: AREAS_RENDER_PAYLOAD_LOADING_LABEL,
    completed,
    total: snapshot.lookupCount,
    inFlight,
    queued,
    currentLabel
  };
}

function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function resolveSoundDeliverySource(objectKey: string): SoundPlaybackDeliveryEvidence["source"] {
  const normalizedKey = objectKey.toLowerCase();
  if (normalizedKey.includes("/__aurora/sources/vanilla/")) {
    return "vanilla";
  }
  if (normalizedKey.includes("/__aurora/sources/hak/")) {
    return "hak";
  }
  if (normalizedKey.includes("/__aurora/sources/module/") || normalizedKey.includes("/audio/")) {
    return "module";
  }
  return "other";
}

function buildSoundDeliveryEvidence(
  contract: SoundApiAudioDeliveryContract,
  preview?: SoundPlaybackDeliveryEvidence["preview"]
): SoundPlaybackDeliveryEvidence {
  return {
    mode: contract.mode,
    objectKey: contract.objectKey,
    contentType: contract.contentType,
    sizeBytes: contract.sizeBytes,
    etag: contract.etag,
    source: resolveSoundDeliverySource(contract.objectKey),
    preview
  };
}

async function resolveBrowserPreviewDurationMs(blob: Blob): Promise<number | null> {
  const audioGlobals = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  const AudioContextConstructor =
    typeof audioGlobals.AudioContext !== "undefined"
      ? audioGlobals.AudioContext
      : typeof audioGlobals.webkitAudioContext !== "undefined"
        ? audioGlobals.webkitAudioContext
        : null;
  if (!AudioContextConstructor) {
    return null;
  }

  let audioContext: AudioContext | null = null;
  try {
    audioContext = new AudioContextConstructor();
    const buffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    const durationMs = decoded.duration * 1000;
    return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
  } catch {
    return null;
  } finally {
    if (audioContext) {
      await audioContext.close().catch(() => undefined);
    }
  }
}

function resolveAudioElementPreviewDurationMs(audio: HTMLAudioElement): number | null {
  const durationMs = audio.duration * 1000;
  return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
}

function isSoundPlaybackActivationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("user didn't interact") || message.includes("notallowederror");
}

function SidebarColumn({
  side,
  title,
  sections,
  customContent,
  workspaceModeId,
  collapsed,
  onToggle
}: {
  side: "left" | "right";
  title: string;
  sections: { key: string; title: string; items: string[] }[];
  customContent?: ReactNode;
  workspaceModeId?: WorkspaceModeId;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const toggleLabel = `Collapse ${side} panel`;
  const panelTitle = side === "left" ? "Tools panel" : "Inspector panel";
  const workspaceModeClassName = workspaceModeId
    ? `workspace-sidebar-mode-${workspaceModeId.replace(/_mode$/u, "")}`
    : "";
  const sidebarClassName = `workspace-sidebar workspace-sidebar-${side} ${workspaceModeClassName} ${collapsed ? "is-collapsed" : ""}`;
  const titleClassName = `workspace-sidebar-title ${collapsed ? "workspace-sidebar-title-collapsed" : ""}`;
  const buttonIcon = side === "left" ? "<" : ">";
  const collapsedAriaLabel = `Expand ${side} panel`;

  useEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar || collapsed) {
      return;
    }
    sidebar.scrollTop = 0;
    sidebar
      .querySelectorAll<HTMLElement>(
        ".workspace-sidebar-content, .workspace-mode-panel, .scene-object-add-panel, .scene-object-add-list, .scene-object-list"
      )
      .forEach((element) => {
        element.scrollTop = 0;
      });
  }, [collapsed, workspaceModeId]);

  return (
    <aside
      ref={sidebarRef}
      className={sidebarClassName}
      aria-label={title}
      role={collapsed ? "button" : undefined}
      aria-expanded={collapsed ? false : undefined}
      tabIndex={collapsed ? 0 : undefined}
      onClick={collapsed ? onToggle : undefined}
      onKeyDown={
        collapsed
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onToggle();
              }
            }
          : undefined
      }
      title={collapsed ? collapsedAriaLabel : undefined}
    >
      <header className="workspace-sidebar-header">
        {side === "left" ? (
          <>
            <p className={titleClassName}>{panelTitle}</p>
            {!collapsed ? (
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggle}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                {buttonIcon}
              </button>
            ) : null}
          </>
        ) : (
          <>
            {!collapsed ? (
              <button
                type="button"
                className="sidebar-toggle-btn"
                onClick={onToggle}
                aria-label={toggleLabel}
                title={toggleLabel}
              >
                {buttonIcon}
              </button>
            ) : null}
            <p className={titleClassName}>{panelTitle}</p>
          </>
        )}
      </header>

      {collapsed ? null : (
        <div className="workspace-sidebar-content">
          {customContent}
          {sections.map((section) => (
            <article className="sidebar-section" key={section.key}>
              <h2>{section.title}</h2>
              <ul>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </aside>
  );
}

function WorkspaceStatusStrip({
  activeMode,
  objectCount,
  selectedCount,
  leftCollapsed,
  rightCollapsed,
  leftPanelWidthPx,
  rightPanelWidthPx,
  loadingState
}: {
  activeMode: WorkspaceModeDefinition;
  objectCount: number;
  selectedCount: number;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  leftPanelWidthPx: number;
  rightPanelWidthPx: number;
  loadingState: WorkspaceAreaCanvasLoadingState | null;
}) {
  const activityLabel = loadingState
    ? `${loadingState.label} ${loadingState.completed}/${loadingState.total}`
    : "Idle";
  const toolsDockState = leftCollapsed ? "Tools hidden" : "Tools docked";
  const inspectorDockState = rightCollapsed ? "Inspector hidden" : "Inspector docked";
  return (
    <footer
      className="workspace-status-strip"
      role="contentinfo"
      aria-label={`workspace status: ${activeMode.label}; Objects ${objectCount}; Selection ${selectedCount}; ${toolsDockState}; ${inspectorDockState}; ${activityLabel}`}
      style={{
        left: `${leftPanelWidthPx}px`,
        right: `${rightPanelWidthPx}px`
      }}
    >
      <span className="workspace-status-item workspace-status-item-strong">
        <span className="workspace-status-label">Mode</span>{" "}
        <strong>{activeMode.label}</strong>
      </span>
      <span className="workspace-status-item">
        <span className="workspace-status-label">Objects</span>{" "}
        <strong>{objectCount}</strong>
      </span>
      <span className="workspace-status-item">
        <span className="workspace-status-label">Selection</span>{" "}
        <strong>{selectedCount}</strong>
      </span>
      <span className="workspace-status-item">
        <span className="workspace-status-label">Left</span>{" "}
        <span>{toolsDockState}</span>
      </span>
      <span className="workspace-status-item">
        <span className="workspace-status-label">Right</span>{" "}
        <span>{inspectorDockState}</span>
      </span>
      <span className="workspace-status-item workspace-status-item-activity">
        <span className="workspace-status-label">Activity</span>{" "}
        <strong>{activityLabel}</strong>
      </span>
    </footer>
  );
}

export function WorkspaceMockLayout({
  role,
  userId,
  workspaceChromeFacade,
  sceneViewportPort,
  areaApiPort,
  tileApiPort,
  placeableApiPort,
  soundApiPort,
  backendAccessToken,
  sceneObjectCatalogQueryFacade,
  trackTelemetryEvent,
  activeBuilderModeId: controlledActiveBuilderModeId,
  onActiveBuilderModeChange,
  toolbarState,
  commandSignal,
  workspaceOptions,
  leftCollapsed,
  rightCollapsed,
  onToggleLeftCollapsed,
  onToggleRightCollapsed,
  onBackendSessionInvalidated
}: WorkspaceMockLayoutProps) {
  const panels = workspaceChromeFacade.getRoleWorkspacePanels(role);
  const [uncontrolledActiveBuilderModeId, setUncontrolledActiveBuilderModeId] =
    useState<WorkspaceModeId>(getDefaultWorkspaceModeId());
  const activeBuilderModeId =
    controlledActiveBuilderModeId ?? uncontrolledActiveBuilderModeId;
  const activeBuilderMode = useMemo(
    () => resolveWorkspaceMode(activeBuilderModeId),
    [activeBuilderModeId]
  );
  const defaultAreasSceneSeed = useMemo(
    () => sceneViewportPort.createInitialHistory(userId).present,
    [sceneViewportPort, userId]
  );
  const focusedModeResetScene = useMemo(
    () => createWorkspaceModeResetScene(activeBuilderMode),
    [activeBuilderMode]
  );
  const [sceneObjectsSnapshot, setSceneObjectsSnapshot] = useState<SceneObject[]>(
    () => sceneViewportPort.createInitialHistory(userId).present.objects
  );
  const modeScopedObjects = useMemo(
    () => filterObjectsForWorkspaceMode(sceneObjectsSnapshot, activeBuilderMode),
    [activeBuilderMode, sceneObjectsSnapshot]
  );
  const modeScopedObjectIds = useMemo(
    () => modeScopedObjects.map((object) => object.id),
    [modeScopedObjects]
  );
  const [selectedObjectIdsSnapshot, setSelectedObjectIdsSnapshot] = useState<string[]>([]);
  const [sidebarSelectSignal, setSidebarSelectSignal] = useState<SidebarSelectSignal | null>(
    null
  );
  const [sidebarContextMenuSignal, setSidebarContextMenuSignal] =
    useState<SidebarContextMenuSignal | null>(null);
  const [sidebarPropertiesSignal, setSidebarPropertiesSignal] =
    useState<SidebarPropertiesSignal | null>(null);
  const [canvasCreateObjectSignal, setCanvasCreateObjectSignal] =
    useState<CanvasCreateObjectSignal | null>(null);
  const [activeObjectAddTemplateId, setActiveObjectAddTemplateId] =
    useState<string | null>(null);
  const [sceneObjectCatalogScope, setSceneObjectCatalogScope] =
    useState<SceneObjectCatalogScope>({
      sourceType: "all",
      allowedObjectIds: sceneObjectsSnapshot.map((object) => object.id)
    });
  const [placeablesCatalogObjects, setPlaceablesCatalogObjects] = useState<SceneObject[]>([]);
  const [placeablesCatalogTotal, setPlaceablesCatalogTotal] = useState(0);
  const [placeablesCatalogStatus, setPlaceablesCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [placeablesCatalogError, setPlaceablesCatalogError] = useState<string | null>(null);
  const [placeablesPreviewError, setPlaceablesPreviewError] = useState<string | null>(null);
  const persistedPlaceablesModeState = useMemo(
    () => loadInitialPlaceablesModeState(window.localStorage, window.location.search),
    []
  );
  const [activePlaceablesPreviewObjectId, setActivePlaceablesPreviewObjectId] = useState<
    string | null
  >(() => persistedPlaceablesModeState.activeObjectId);
  const [placeablesSearchQuery, setPlaceablesSearchQuery] = useState(
    () => persistedPlaceablesModeState.searchQuery
  );
  const [placeablesCatalogQuery, setPlaceablesCatalogQuery] = useState(
    () => persistedPlaceablesModeState.searchQuery
  );
  const [placeablesSubtypeFilter, setPlaceablesSubtypeFilter] = useState<PlaceablesSubtypeFilter>(
    () => persistedPlaceablesModeState.subtypeFilter
  );
  const [soundsCatalogItems, setSoundsCatalogItems] = useState<SoundApiListItem[]>([]);
  const [soundsCatalogTotal, setSoundsCatalogTotal] = useState(0);
  const [soundsCatalogStatus, setSoundsCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [soundsCatalogError, setSoundsCatalogError] = useState<string | null>(null);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [soundsSearchQuery, setSoundsSearchQuery] = useState("");
  const [soundsCatalogQuery, setSoundsCatalogQuery] = useState("");
  const [soundsCategoryFilter, setSoundsCategoryFilter] = useState<SoundsCategoryFilter>("all");
  const [soundsSourceFilter, setSoundsSourceFilter] = useState<SoundsSourceFilter>("all");
  const [soundPlaybackState, setSoundPlaybackState] = useState<SoundPlaybackPipelineState>({
    kind: "idle",
    soundId: null,
    message: null
  });
  const [areaSceneSeed, setAreaSceneSeed] = useState<AreaScene | null>(() =>
    loadPersistedAreaSceneSeed(
      typeof window !== "undefined" ? window.sessionStorage : null
    )
  );
  const [areaCanvasLoading, setAreaCanvasLoading] =
    useState<WorkspaceAreaCanvasLoadingState | null>(null);
  const [
    areaPlaceableRenderPayloadQueueSnapshot,
    setAreaPlaceableRenderPayloadQueueSnapshot
  ] = useState<AreaPlaceableRenderPayloadQueueSnapshot | null>(null);
  const [areaTileProcessReadiness, setAreaTileProcessReadiness] =
    useState<AreaTileProcessContractReadiness | null>(null);
  const [placeablesModeSceneSeed, setPlaceablesModeSceneSeed] = useState<AreaScene | null>(null);
  const areaListClientCacheRef = useRef<AreaListClientCacheEntry | null>(null);
  const placeablesCatalogClientCacheRef = useRef<PlaceablesCatalogClientCacheEntry | null>(null);
  const soundsCatalogClientCacheRef = useRef<SoundsCatalogClientCacheEntry | null>(null);
  const soundPlaybackAudioRef = useRef<{
    soundId: string;
    audio: HTMLAudioElement;
    objectUrl: string | null;
    cacheHit: boolean;
  } | null>(null);
  const soundPlaybackRequestRevisionRef = useRef(0);
  const placeableRenderPayloadCacheRef = useRef<Map<string, PlaceableViewportRenderPayload>>(
    new Map()
  );
  const placeableRenderPayloadPendingRef = useRef<
    Map<string, Promise<PlaceableViewportRenderPayload | null>>
  >(new Map());
  const placeableRenderPayloadPublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeableRenderPayloadPublishQueuedRef = useRef(false);
  const isMountedRef = useRef(true);
  const restoredAreaTileProcessReadinessSignatureRef = useRef<string | null>(null);
  const areaPlaceableRenderPayloadQueueActiveSignatureRef = useRef<string | null>(null);
  const areaPlaceableRenderPayloadQueueActivePromiseRef = useRef<Promise<void> | null>(null);
  const [placeableRenderPayloadByTemplateId, setPlaceableRenderPayloadByTemplateId] = useState<
    Record<string, PlaceableViewportRenderPayload>
  >({});
  const placeableRenderPayloadByTemplateIdRef = useRef<Record<string, PlaceableViewportRenderPayload>>(
    {}
  );
  const sidebarSignalRevisionRef = useRef(0);
  const leftPanelWidthPx = leftCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const rightPanelWidthPx = rightCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;

  const isBuilder = role === "builder";
  const shouldRenderSceneObjectsPanel = isBuilder && activeBuilderMode.showSceneObjectListPanel;
  const shouldRenderSceneObjectAddPanel = isBuilder && activeBuilderMode.showSceneObjectAddPanel;
  const shouldRenderAreaSelectionPanel =
    isBuilder && activeBuilderMode.showAreaSelectionPanel;
  const isPlaceablesMode = isBuilder && activeBuilderMode.id === "placeables_mode";
  const isSoundsMode = isBuilder && activeBuilderMode.id === "sounds_mode";
  useEffect(() => {
    if (!shouldRenderAreaSelectionPanel) {
      setAreaCanvasLoading(null);
      setAreaPlaceableRenderPayloadQueueSnapshot(null);
    }
  }, [shouldRenderAreaSelectionPanel]);
  useEffect(() => {
    placeableRenderPayloadByTemplateIdRef.current = placeableRenderPayloadByTemplateId;
  }, [placeableRenderPayloadByTemplateId]);
  useEffect(() => {
    persistAreaSceneSeed(
      areaSceneSeed,
      typeof window !== "undefined" ? window.sessionStorage : null
    );
  }, [areaSceneSeed]);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (placeableRenderPayloadPublishTimerRef.current !== null) {
        clearTimeout(placeableRenderPayloadPublishTimerRef.current);
      }
      placeableRenderPayloadPublishTimerRef.current = null;
      placeableRenderPayloadPublishQueuedRef.current = false;
    };
  }, []);
  useEffect(() => {
    const loadingState = resolveAreaPlaceableRenderPayloadLoadingState(
      areaPlaceableRenderPayloadQueueSnapshot
    );
    if (loadingState) {
      setAreaCanvasLoading(loadingState);
      return;
    }

    setAreaCanvasLoading((current) =>
      current?.label === AREAS_RENDER_PAYLOAD_LOADING_LABEL ? null : current
    );
  }, [areaPlaceableRenderPayloadQueueSnapshot]);
  useEffect(() => {
    if (
      isPlaceablesMode ||
      isSoundsMode ||
      !areaSceneSeed ||
      areaSceneSeed.source !== "aurora_area" ||
      !backendAccessToken ||
      !tileApiPort
    ) {
      return;
    }
    if (areaTileProcessReadiness?.areaId === areaSceneSeed.sceneId) {
      return;
    }

    const signature = buildAreaSceneTileProcessReadinessSignature(areaSceneSeed);
    if (restoredAreaTileProcessReadinessSignatureRef.current === signature) {
      return;
    }

    let cancelled = false;
    const loadingLabel = `Restoring terrain for ${areaSceneSeed.areaName ?? areaSceneSeed.sceneId}`;
    setAreaCanvasLoading({
      source: "terrain",
      label: loadingLabel,
      completed: 0,
      total: areaSceneSeed.tiles.length > 0 ? areaSceneSeed.tiles.length : null
    });

    void areaApiPort
      .getAreaById(backendAccessToken, areaSceneSeed.sceneId)
      .then((detail) =>
        resolveAreaTileProcessContractReadiness(tileApiPort, backendAccessToken, detail, {
          bypassCache: false
        })
      )
      .then((readiness) => {
        if (!cancelled) {
          restoredAreaTileProcessReadinessSignatureRef.current = signature;
          setAreaTileProcessReadiness(readiness);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          trackTelemetryEvent("ui.workspace.areas.restore_tile_process_readiness_failed", {
            userId,
            areaId: areaSceneSeed.sceneId,
            message:
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "unknown_error"
          });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setAreaCanvasLoading((current) =>
            current?.label === loadingLabel ? null : current
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    areaApiPort,
    areaSceneSeed,
    areaTileProcessReadiness?.areaId,
    backendAccessToken,
    isPlaceablesMode,
    isSoundsMode,
    tileApiPort,
    trackTelemetryEvent,
    userId
  ]);
  const shouldLoadBackendSoundsCatalog =
    isBuilder && activeBuilderMode.allowedCatalogTypes.includes("sounds");
  const backendSoundTemplateObjects = useMemo(
    () =>
      soundsCatalogItems.map((sound, index) =>
        mapSoundApiListItemToSceneObject(sound, index + 1)
      ),
    [soundsCatalogItems]
  );
  const areaModeAddPanelObjects = useMemo(
    () =>
      !isPlaceablesMode && !isSoundsMode
        ? [...modeScopedObjects, ...backendSoundTemplateObjects]
        : modeScopedObjects,
    [backendSoundTemplateObjects, isPlaceablesMode, isSoundsMode, modeScopedObjects]
  );
  const viewportToolbarState = useMemo(
    () =>
      isPlaceablesMode ? resolvePlaceablesPreviewToolbarState(toolbarState) : toolbarState,
    [isPlaceablesMode, toolbarState]
  );
  const viewportWorkspaceOptions = isPlaceablesMode
    ? PLACEABLES_PREVIEW_WORKSPACE_OPTIONS
    : workspaceOptions;
  const placeablesModeObjects = useMemo(() => placeablesCatalogObjects, [placeablesCatalogObjects]);
  const filteredPlaceablesModeObjects = useMemo(
    () => filterPlaceablesByQuery(placeablesModeObjects, placeablesSearchQuery),
    [placeablesModeObjects, placeablesSearchQuery]
  );
  const filteredSoundsCatalogItems = useMemo(
    () =>
      soundsCatalogItems.filter((sound) => {
        if (soundsCategoryFilter !== "all" && sound.category !== soundsCategoryFilter) {
          return false;
        }
        if (soundsSourceFilter !== "all" && sound.source.layer !== soundsSourceFilter) {
          return false;
        }
        return true;
      }),
    [soundsCatalogItems, soundsCategoryFilter, soundsSourceFilter]
  );
  const activeSound = useMemo(() => {
    if (!isSoundsMode || !activeSoundId) {
      return null;
    }
    return soundsCatalogItems.find((sound) => sound.soundId === activeSoundId) ?? null;
  }, [activeSoundId, isSoundsMode, soundsCatalogItems]);
  const activePlaceablesPreviewObject = useMemo(() => {
    if (!isPlaceablesMode || !activePlaceablesPreviewObjectId) {
      return null;
    }
    return (
      placeablesModeObjects.find((object) => object.id === activePlaceablesPreviewObjectId) ??
      null
    );
  }, [activePlaceablesPreviewObjectId, isPlaceablesMode, placeablesModeObjects]);
  const placeablesModeRenderObjectId = placeablesModeSceneSeed?.objects[0]?.id;
  const renderObjectIds = useMemo(
    () =>
      isPlaceablesMode
        ? [placeablesModeRenderObjectId ?? "__placeables_mode_render_none__"]
        : null,
    [isPlaceablesMode, placeablesModeRenderObjectId]
  );
  const externalSceneSeed = isPlaceablesMode
    ? (placeablesModeSceneSeed ?? focusedModeResetScene)
    : isSoundsMode
      ? focusedModeResetScene
      : (areaSceneSeed ?? defaultAreasSceneSeed);
  const externalSceneSeedKey = [
    activeBuilderModeId,
    externalSceneSeed.sceneId,
    externalSceneSeed.updatedAtUnixMs,
    externalSceneSeed.width,
    externalSceneSeed.height,
    externalSceneSeed.tiles.length,
    externalSceneSeed.objects.length
  ].join(":");
  const areasModePlaceableProcessObjects = useMemo(
    () =>
      !isPlaceablesMode
      && !isSoundsMode
        ? (areaSceneSeed?.objects ?? sceneObjectsSnapshot).filter(
            (object) => isSharedPlaceablesRendererSceneObject(object)
          )
        : [],
    [areaSceneSeed?.objects, isPlaceablesMode, isSoundsMode, sceneObjectsSnapshot]
  );
  const placeablesModePreviewObject = placeablesModeSceneSeed?.objects[0] ?? null;
  const activePlaceableRenderPayload = useMemo(() => {
    if (!isPlaceablesMode || !activePlaceablesPreviewObjectId) {
      return null;
    }
    const directPayload = placeableRenderPayloadByTemplateId[activePlaceablesPreviewObjectId];
    if (directPayload) {
      return directPayload;
    }
    const payloadLookupObject = activePlaceablesPreviewObject ?? placeablesModePreviewObject;
    if (!payloadLookupObject) {
      return null;
    }
    return resolvePlaceableRenderPayloadFromLookup(
      placeableRenderPayloadByTemplateId,
      resolvePlaceableRenderPayloadLookup(payloadLookupObject)
    );
  }, [
    activePlaceablesPreviewObject,
    activePlaceablesPreviewObjectId,
    isPlaceablesMode,
    placeableRenderPayloadByTemplateId,
    placeablesModePreviewObject
  ]);
  const activePlaceablesInspectorObject = activePlaceableRenderPayload
    ? activePlaceablesPreviewObject ?? placeablesModePreviewObject
    : resolveSceneObjectPreviewVfxPayload(activePlaceablesPreviewObject)
      ? activePlaceablesPreviewObject
      : resolveSceneObjectPreviewVfxPayload(placeablesModePreviewObject)
        ? placeablesModePreviewObject
        : activePlaceablesPreviewObject ?? placeablesModePreviewObject;
  const placeableRenderPayloadByObjectId = useMemo(() => {
    if (isPlaceablesMode) {
      if (!activePlaceableRenderPayload) {
        return null;
      }
      const previewObjectId = placeablesModeSceneSeed?.objects[0]?.id;
      if (!previewObjectId) {
        return null;
      }
      return {
        [previewObjectId]: activePlaceableRenderPayload
      };
    }

    if (areasModePlaceableProcessObjects.length < 1) {
      return null;
    }

    const payloadByObjectId: Record<string, PlaceableViewportRenderPayload> = {};
    areasModePlaceableProcessObjects.forEach((object) => {
      const lookup = resolvePlaceableRenderPayloadLookup(object);
      const payload = resolvePayloadForLookupFromStores(
        lookup,
        placeableRenderPayloadByTemplateId,
        placeableRenderPayloadCacheRef.current
      );
      if (payload) {
        payloadByObjectId[object.id] = payload;
      }
    });
    return Object.keys(payloadByObjectId).length > 0 ? payloadByObjectId : null;
  }, [
    activePlaceableRenderPayload,
    areaPlaceableRenderPayloadQueueSnapshot,
    areaSceneSeed,
    areasModePlaceableProcessObjects,
    isPlaceablesMode,
    placeableRenderPayloadByTemplateId,
    placeablesModeSceneSeed
  ]);

  const stopSoundPlayback = useCallback(() => {
    const current = soundPlaybackAudioRef.current;
    if (!current) {
      return;
    }
    current.audio.pause();
    current.audio.removeAttribute("src");
    current.audio.load();
    if (current.objectUrl && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(current.objectUrl);
    }
    soundPlaybackAudioRef.current = null;
  }, []);

  const clearSoundPlaybackState = useCallback(() => {
    soundPlaybackRequestRevisionRef.current += 1;
    stopSoundPlayback();
    setSoundPlaybackState({
      kind: "idle",
      soundId: null,
      message: null
    });
  }, [stopSoundPlayback]);

  const stopSoundPreview = useCallback(
    (sound: SoundApiListItem) => {
      if (soundPlaybackAudioRef.current?.soundId !== sound.soundId) {
        return;
      }
      clearSoundPlaybackState();
      trackTelemetryEvent("ui.workspace.sounds_mode.sound_stopped", {
        userId,
        soundId: sound.soundId
      });
    },
    [clearSoundPlaybackState, trackTelemetryEvent, userId]
  );

  const playSoundPreview = useCallback(
    (sound: SoundApiListItem) => {
      if (!soundApiPort || !backendAccessToken) {
        setSoundPlaybackState({
          kind: "error",
          soundId: sound.soundId,
          message: "Backend sound preview is unavailable."
        });
        return;
      }

      const preparedAudio = soundPlaybackAudioRef.current;
      if (preparedAudio?.soundId === sound.soundId && soundPlaybackState.kind === "prepared") {
        const delivery = soundPlaybackState.delivery;
        setActiveSoundId(sound.soundId);
        setSoundPlaybackState({
          kind: "playing",
          soundId: sound.soundId,
          message: "Starting prepared sound...",
          delivery
        });
        void preparedAudio.audio
          .play()
          .then(() => {
            setSoundPlaybackState({
              kind: "playing",
              soundId: sound.soundId,
              message: "Playing from backend audio cache.",
              delivery
            });
            trackTelemetryEvent("ui.workspace.sounds_mode.sound_played", {
              userId,
              soundId: sound.soundId,
              cacheHit: preparedAudio.cacheHit
            });
          })
          .catch((error) => {
            if (isSoundPlaybackActivationError(error)) {
              setSoundPlaybackState({
                kind: "prepared",
                soundId: sound.soundId,
                message:
                  "Ready to play from backend audio cache. Browser playback needs a direct Play click.",
                delivery
              });
              trackTelemetryEvent("ui.workspace.sounds_mode.sound_play_blocked", {
                userId,
                soundId: sound.soundId
              });
              return;
            }
            stopSoundPlayback();
            setSoundPlaybackState({
              kind: "error",
              soundId: sound.soundId,
              message:
                error instanceof Error && error.message.trim().length > 0
                  ? `Sound preview failed: ${error.message}`
                  : "Sound preview failed through backend audio pipeline."
            });
            trackTelemetryEvent("ui.workspace.sounds_mode.sound_play_failed", {
              userId,
              soundId: sound.soundId
            });
          });
        return;
      }

      const playbackRequestRevision = soundPlaybackRequestRevisionRef.current + 1;
      soundPlaybackRequestRevisionRef.current = playbackRequestRevision;
      const isCurrentPlaybackRequest = () =>
        soundPlaybackRequestRevisionRef.current === playbackRequestRevision;
      stopSoundPlayback();
      setActiveSoundId(sound.soundId);
      setSoundPlaybackState({
        kind: "processing",
        soundId: sound.soundId,
        message: "Processing sound..."
      });

      void (async () => {
        const processed = await soundApiPort.processSound(backendAccessToken, sound.soundId, {
          bypassCache: false
        });
        if (!isCurrentPlaybackRequest()) {
          return;
        }
        setSoundPlaybackState({
          kind: "contracts",
          soundId: sound.soundId,
          message: "Resolving audio contract..."
        });
        const contracts = await soundApiPort.getSoundAudioContracts(
          backendAccessToken,
          processed.cacheKey,
          "proxy"
        );
        if (!isCurrentPlaybackRequest()) {
          return;
        }
        const initialDelivery = buildSoundDeliveryEvidence(contracts.audio);
        setSoundPlaybackState({
          kind: "loading_audio",
          soundId: sound.soundId,
          message: "Loading audio...",
          delivery: initialDelivery
        });
        const blob = await soundApiPort.getSoundAudioBlob(backendAccessToken, processed.cacheKey);
        if (!isCurrentPlaybackRequest()) {
          return;
        }
        const objectUrl = URL.createObjectURL(blob);
        const audio = new Audio(objectUrl);
        const previewDurationMs =
          (await resolveBrowserPreviewDurationMs(blob)) ??
          resolveAudioElementPreviewDurationMs(audio);
        if (!isCurrentPlaybackRequest()) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        const delivery = buildSoundDeliveryEvidence(
          contracts.audio,
          previewDurationMs === null
            ? undefined
            : {
                durationMs: previewDurationMs,
                durationSource: "browser-preview"
              }
        );
        audio.loop = processed.sound.spatial.loop || processed.sound.playback.mode === "looping";
        audio.onended = () => {
          if (soundPlaybackAudioRef.current?.audio === audio) {
            stopSoundPlayback();
            setSoundPlaybackState({
              kind: "idle",
              soundId: null,
              message: null
            });
          }
        };
        audio.onerror = () => {
          if (soundPlaybackAudioRef.current?.audio === audio) {
            stopSoundPlayback();
            setSoundPlaybackState({
              kind: "error",
              soundId: sound.soundId,
              message: "Backend audio pipeline returned an audio payload that could not be played."
            });
          }
        };
        soundPlaybackAudioRef.current = {
          soundId: sound.soundId,
          audio,
          objectUrl,
          cacheHit: processed.cacheHit
        };
        setSoundPlaybackState({
          kind: "prepared",
          soundId: sound.soundId,
          message: "Ready to play from backend audio cache. Click Play again.",
          delivery
        });
        trackTelemetryEvent("ui.workspace.sounds_mode.sound_prepared", {
          userId,
          soundId: sound.soundId,
          cacheHit: processed.cacheHit
        });
      })().catch((error) => {
        if (!isCurrentPlaybackRequest()) {
          return;
        }
        stopSoundPlayback();
        setSoundPlaybackState({
          kind: "error",
          soundId: sound.soundId,
          message:
            error instanceof Error && error.message.trim().length > 0
              ? `Sound preview failed: ${error.message}`
              : "Sound preview failed through backend audio pipeline."
        });
        trackTelemetryEvent("ui.workspace.sounds_mode.sound_play_failed", {
          userId,
          soundId: sound.soundId
        });
      });
    },
    [
      backendAccessToken,
      soundApiPort,
      soundPlaybackState.kind,
      stopSoundPlayback,
      trackTelemetryEvent,
      userId
    ]
  );

  useEffect(() => {
    if (!isPlaceablesMode || !activePlaceablesPreviewObject || !activePlaceableRenderPayload) {
      return;
    }
    const renderVfxPayload = buildVfxPayloadFromRenderPayload(activePlaceableRenderPayload);
    if (!renderVfxPayload) {
      return;
    }
    const previewSceneId = `preview:${
      buildPlaceablePreviewIdentityFromObject(activePlaceablesPreviewObject).templateId
    }`;
    setPlaceablesModeSceneSeed((current) => {
      if (current?.sceneId !== previewSceneId) {
        return current;
      }
      const currentVfxPayload = current.objects[0]?.vfxPayload;
      if (
        currentVfxPayload?.previewMode === renderVfxPayload.previewMode &&
        currentVfxPayload?.sourceResRef === renderVfxPayload.sourceResRef &&
        currentVfxPayload?.extra?.cacheKey === renderVfxPayload.extra.cacheKey
      ) {
        return current;
      }
      return buildPreviewSceneFromObject(activePlaceablesPreviewObject, {
        renderPayload: activePlaceableRenderPayload
      });
    });
  }, [activePlaceableRenderPayload, activePlaceablesPreviewObject, isPlaceablesMode]);

  const publishPlaceableRenderPayload = useCallback(
    (
      lookup: PlaceableRenderPayloadLookup,
      payload: PlaceableViewportRenderPayload,
      {
        shouldCache,
        deferCommit = false,
        scheduleCommit = true
      }: { shouldCache: boolean; deferCommit?: boolean; scheduleCommit?: boolean }
    ) => {
      const resolvedKeys = resolvePublishedPlaceableRenderPayloadKeys(lookup, payload);
      if (shouldCache) {
        resolvedKeys.forEach((key) => {
          placeableRenderPayloadCacheRef.current.set(key, payload);
        });
      }
      const current = placeableRenderPayloadByTemplateIdRef.current;
      let didChange = false;
      const next = { ...current };
      resolvedKeys.forEach((key) => {
      if (next[key] !== payload) {
          next[key] = payload;
          didChange = true;
        }
      });
      if (didChange) {
        placeableRenderPayloadByTemplateIdRef.current = next;
        if (!isMountedRef.current) {
          placeableRenderPayloadPublishQueuedRef.current = false;
          return resolvedKeys;
        }
        if (deferCommit) {
          placeableRenderPayloadPublishQueuedRef.current = true;
          if (scheduleCommit && placeableRenderPayloadPublishTimerRef.current === null) {
            placeableRenderPayloadPublishTimerRef.current = setTimeout(() => {
              placeableRenderPayloadPublishTimerRef.current = null;
              if (!isMountedRef.current) {
                placeableRenderPayloadPublishQueuedRef.current = false;
                return;
              }
              if (!placeableRenderPayloadPublishQueuedRef.current) {
                return;
              }
              placeableRenderPayloadPublishQueuedRef.current = false;
              setPlaceableRenderPayloadByTemplateId(
                { ...placeableRenderPayloadByTemplateIdRef.current }
              );
            }, PLACEABLE_PAYLOAD_RENDER_FLUSH_MS);
          }
        } else {
          if (placeableRenderPayloadPublishTimerRef.current !== null) {
            clearTimeout(placeableRenderPayloadPublishTimerRef.current);
            placeableRenderPayloadPublishTimerRef.current = null;
            placeableRenderPayloadPublishQueuedRef.current = false;
          }
          setPlaceableRenderPayloadByTemplateId(next);
        }
      }
      return resolvedKeys;
    },
    []
  );

  const ensurePlaceableRenderPayload = useCallback(
    (
      lookupInput: string | PlaceableRenderPayloadLookup
    ): Promise<PlaceableViewportRenderPayload | null> => {
      if (!placeableApiPort || !backendAccessToken) {
        return Promise.resolve(null);
      }
      const lookup =
        typeof lookupInput === "string"
          ? {
              cacheKey: lookupInput,
              processPayload: { templateId: lookupInput },
              indexKeys: [lookupInput],
              publishTemplateAliases: true
            }
          : lookupInput;
      const cachedPayload = lookup.indexKeys
        .map((key) => placeableRenderPayloadCacheRef.current.get(key))
        .find((payload): payload is PlaceableViewportRenderPayload => Boolean(payload));
      if (cachedPayload) {
        publishPlaceableRenderPayload(lookup, cachedPayload, { shouldCache: false });
        return Promise.resolve(cachedPayload);
      }
      const pendingPayload = lookup.indexKeys
        .map((key) => placeableRenderPayloadPendingRef.current.get(key))
        .find((payload): payload is Promise<PlaceableViewportRenderPayload | null> =>
          Boolean(payload)
        );
      if (pendingPayload) {
        return pendingPayload.then((payload) => {
          if (payload) {
            publishPlaceableRenderPayload(lookup, payload, { shouldCache: true });
          }
          return payload;
        });
      }
      const request = fetchPlaceableViewportRenderPayload(
        placeableApiPort,
        backendAccessToken,
        lookup.processPayload,
        {
          onProcessPayload: (payload) => {
            if (lookup.publishTemplateAliases && !buildVfxPayloadFromRenderPayload(payload)) {
              return;
            }
            publishPlaceableRenderPayload(lookup, payload, { shouldCache: false });
          }
        }
      )
        .then((payload) => {
          publishPlaceableRenderPayload(lookup, payload, { shouldCache: true });
          trackTelemetryEvent("ui.workspace.placeables_mode.render_payload_loaded", {
            userId,
            templateId: lookup.cacheKey,
            resolvedTemplateId: payload.templateId,
            cacheHit: payload.cacheHit
          });
          return payload;
        })
        .catch((error) => {
          trackTelemetryEvent("ui.workspace.placeables_mode.render_payload_failed", {
            userId,
            templateId: lookup.cacheKey,
            message:
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "unknown_error"
          });
          throw error;
        })
        .finally(() => {
          lookup.indexKeys.forEach((key) => {
            placeableRenderPayloadPendingRef.current.delete(key);
          });
        });
      lookup.indexKeys.forEach((key) => {
        placeableRenderPayloadPendingRef.current.set(key, request);
      });
      return request;
    },
    [backendAccessToken, placeableApiPort, publishPlaceableRenderPayload, trackTelemetryEvent, userId]
  );

  const requestPlaceablesModeRenderPayloadForObject = useCallback(
    (object: SceneObject) => {
      const previewScene = buildPreviewSceneFromObject(object);
      const lookup = resolvePlaceableRenderPayloadLookup(object);
      const previewVfxPayload = resolveSceneObjectPreviewVfxPayload(object);

      setPlaceablesPreviewError(null);
      setPlaceablesModeSceneSeed(previewScene);

      void ensurePlaceableRenderPayload(lookup)
        .then((payload) => {
          if (!payload) {
            return;
          }
          const renderVfxPayload = buildVfxPayloadFromRenderPayload(payload);
          if (!previewVfxPayload && !renderVfxPayload) {
            return;
          }
          setPlaceablesModeSceneSeed((current) =>
            current?.sceneId === previewScene.sceneId
              ? buildPreviewSceneFromObject(object, { renderPayload: payload })
              : current
          );
        })
        .catch(() => {
          setPlaceablesPreviewError("Failed to load placeable render payload from backend.");
        });
    },
    [ensurePlaceableRenderPayload]
  );

  const requestSceneObjectThumbnailRenderPayload = useCallback(
    (object: SceneObject) => {
      if (!isSharedPlaceablesRendererSceneObject(object)) {
        return;
      }
      void ensurePlaceableRenderPayload(resolvePlaceableRenderPayloadLookup(object)).catch(
        () => undefined
      );
    },
    [ensurePlaceableRenderPayload]
  );

  useEffect(() => {
    if (isPlaceablesMode || !areaSceneSeed) {
      setAreaPlaceableRenderPayloadQueueSnapshot(null);
      return;
    }
    const lookupByCacheKey = new Map<string, PlaceableRenderPayloadLookup>();
    const objectIdsByLookupCacheKey = new Map<string, string[]>();
    areasModePlaceableProcessObjects.forEach((object) => {
      const lookup = resolvePlaceableRenderPayloadLookup(object);
      const objectIds = objectIdsByLookupCacheKey.get(lookup.cacheKey) ?? [];
      objectIds.push(object.id);
      objectIdsByLookupCacheKey.set(lookup.cacheKey, objectIds);
      if (lookupByCacheKey.has(lookup.cacheKey)) {
        return;
      }
      lookupByCacheKey.set(lookup.cacheKey, lookup);
    });
    const lookups = Array.from(lookupByCacheKey.values());
    const failedLookupKeys = new Set<string>();
    let cancelled = false;
    let completedBatchCount = 0;
    const queueSignature = [
      areaSceneSeed.sceneId,
      lookups.map((lookup) => lookup.cacheKey).join("\u001f")
    ].join("\u001e");
    const isCurrentQueue = () =>
      areaPlaceableRenderPayloadQueueActiveSignatureRef.current === queueSignature;

    const publishQueueSnapshot = (
      queueMode: AreaPlaceableRenderPayloadQueueMode,
      treatUnresolvedAsStillLoading: boolean,
      batchProgress: number
    ) => {
      if (cancelled || !isCurrentQueue()) {
        return null;
      }
      const snapshot = resolveAreaPlaceableRenderPayloadQueueSnapshot({
        queueMode,
        lookups,
        objectIdsByLookupCacheKey,
        payloadByTemplateId: placeableRenderPayloadByTemplateIdRef.current,
        payloadCache: placeableRenderPayloadCacheRef.current,
        pendingPayloads: placeableRenderPayloadPendingRef.current,
        failedLookupKeys,
        treatUnresolvedAsStillLoading,
        completedBatchCount: batchProgress
      });
      setAreaPlaceableRenderPayloadQueueSnapshot(snapshot);
      trackTelemetryEvent("ui.workspace.areas_mode.render_payload_queue_snapshot", {
        userId,
        rendererPath: snapshot.rendererPath,
        status: snapshot.status,
        placeholderStatus: snapshot.placeholderStatus,
        queueMode: snapshot.queueMode,
        objectCount: snapshot.objectCount,
        lookupCount: snapshot.lookupCount,
        payloadReadyLookupCount: snapshot.payloadReadyLookupCount,
        modelReadyLookupCount: snapshot.modelReadyLookupCount,
        stillLoadingLookupCount: snapshot.stillLoadingLookupCount,
        missingPayloadCount: snapshot.missingPayloadCount,
        failedLookupCount: snapshot.failedLookupCount,
        placeholderReasonStillLoadingCount:
          snapshot.placeholderReasonCounts["still-loading"],
        placeholderReasonMissingPayloadCount:
          snapshot.placeholderReasonCounts["missing-payload"],
        placeholderReasonPayloadMissingModelUrlCount:
          snapshot.placeholderReasonCounts["payload-missing-model-url"],
        placeholderReasonAssetContractBlockedCount:
          snapshot.placeholderReasonCounts["asset-contract-blocked"],
        placeholderReasonModelLoadFailedCount:
          snapshot.placeholderReasonCounts["model-load-failed"],
        batchSize: snapshot.batchSize,
        batchCount: snapshot.batchCount,
        completedBatchCount: snapshot.completedBatchCount,
        pendingObjectIds: snapshot.pendingObjectIds || null,
        missingPayloadIds: snapshot.missingPayloadIds || null
      });
      return snapshot;
    };
    const publishAreaPlaceableRenderPayload = (
      lookup: PlaceableRenderPayloadLookup,
      payload: PlaceableViewportRenderPayload,
      options: { shouldCache: boolean; deferCommit?: boolean; scheduleCommit?: boolean }
    ) => {
      const objectIds = objectIdsByLookupCacheKey.get(lookup.cacheKey) ?? [];
      const expandedLookup = {
        ...lookup,
        indexKeys: Array.from(new Set([...lookup.indexKeys, ...objectIds]))
      };
      return publishPlaceableRenderPayload(expandedLookup, payload, {
        ...options,
        deferCommit: true
      });
    };

    if (lookups.length < 1) {
      publishQueueSnapshot("unavailable", false, 0);
      return;
    }

    if (!placeableApiPort || !backendAccessToken) {
      publishQueueSnapshot("unavailable", false, 0);
      return;
    }
    const existingQueuePromise =
      areaPlaceableRenderPayloadQueueActiveSignatureRef.current === queueSignature
        ? areaPlaceableRenderPayloadQueueActivePromiseRef.current
        : null;
    if (existingQueuePromise) {
      const observerQueueMode: AreaPlaceableRenderPayloadQueueMode = placeableApiPort.processPlaceables
        ? "batch"
        : "single";
      publishQueueSnapshot(observerQueueMode, true, completedBatchCount);
      void existingQueuePromise.finally(() => {
        publishQueueSnapshot(observerQueueMode, false, lookups.length);
      });
      return () => {
        cancelled = true;
      };
    }
    areaPlaceableRenderPayloadQueueActiveSignatureRef.current = queueSignature;

    const hasAreaPlaceablePayload = (
      lookup: PlaceableRenderPayloadLookup
    ): boolean => {
      const payload = resolvePayloadForLookupFromStores(
        lookup,
        placeableRenderPayloadByTemplateIdRef.current,
        placeableRenderPayloadCacheRef.current
      );
      return Boolean(payload);
    };

    const runSingleRecoveryQueue = async () => {
      const recoveryLookups = lookups.filter(
        (lookup) => !hasAreaPlaceablePayload(lookup)
      );
      if (recoveryLookups.length < 1) {
        return;
      }

      publishQueueSnapshot("single", true, completedBatchCount);
      let recoveryCursor = 0;
      const runRecoveryWorker = async () => {
        while (!cancelled && isCurrentQueue() && recoveryCursor < recoveryLookups.length) {
          const lookup = recoveryLookups[recoveryCursor];
          recoveryCursor += 1;
          if (!lookup || hasAreaPlaceablePayload(lookup)) {
            continue;
          }
          try {
            const payload = await fetchPlaceableViewportRenderPayload(
              placeableApiPort,
              backendAccessToken,
              lookup.processPayload
            );
            if (cancelled || !isCurrentQueue()) {
              publishPlaceableRenderPayload(lookup, payload, {
                shouldCache: true,
                deferCommit: true
              });
              return;
            }
            publishAreaPlaceableRenderPayload(lookup, payload, { shouldCache: true });
            failedLookupKeys.delete(lookup.cacheKey);
            trackTelemetryEvent(
              "ui.workspace.areas_mode.render_payload_batch_recovered_single",
              {
                userId,
                templateId: lookup.cacheKey,
                resolvedTemplateId: payload.templateId,
                cacheHit: payload.cacheHit
              }
            );
          } catch (error) {
            failedLookupKeys.add(lookup.cacheKey);
            trackTelemetryEvent(
              "ui.workspace.areas_mode.render_payload_batch_recovery_failed",
              {
                userId,
                templateId: lookup.cacheKey,
                message:
                  error instanceof Error && error.message.trim().length > 0
                    ? error.message
                    : "unknown_error"
              }
            );
          }
          publishQueueSnapshot("single", true, completedBatchCount);
          if (!cancelled && isCurrentQueue() && AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS > 0) {
            await new Promise((resolve) => {
              window.setTimeout(resolve, AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS);
            });
          }
        }
      };

      const workerCount = Math.min(
        AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY,
        recoveryLookups.length
      );
      await Promise.all(Array.from({ length: workerCount }, () => runRecoveryWorker()));
    };

    const runBatchQueue = async () => {
      publishQueueSnapshot("batch", true, completedBatchCount);
      const batchCount = Math.ceil(lookups.length / AREAS_RENDER_PAYLOAD_BATCH_SIZE);
      let batchCursor = 0;
      const runBatchWorker = async () => {
        while (!cancelled && isCurrentQueue()) {
          const batchIndex = batchCursor;
          batchCursor += 1;
          const startIndex = batchIndex * AREAS_RENDER_PAYLOAD_BATCH_SIZE;
          if (startIndex >= lookups.length) {
            return;
          }
          const batchLookups = lookups.slice(
            startIndex,
            startIndex + AREAS_RENDER_PAYLOAD_BATCH_SIZE
          );
        const unresolvedLookups = batchLookups.filter((lookup) => {
          const cachedPayload = lookup.indexKeys
            .map((key) => placeableRenderPayloadCacheRef.current.get(key))
            .find((payload): payload is PlaceableViewportRenderPayload => Boolean(payload));
          if (cachedPayload) {
            publishAreaPlaceableRenderPayload(lookup, cachedPayload, { shouldCache: true });
            return false;
          }
          return !lookup.indexKeys.some((key) => placeableRenderPayloadPendingRef.current.has(key));
        });
        if (unresolvedLookups.length < 1) {
          completedBatchCount += 1;
          publishQueueSnapshot("batch", completedBatchCount < batchCount, completedBatchCount);
          continue;
        }
        const lookupByBatchKey = new Map(unresolvedLookups.map((lookup) => [lookup.cacheKey, lookup]));
        let batchLoaded = false;
        for (
          let attempt = 0;
          !cancelled && isCurrentQueue() && attempt <= AREAS_RENDER_PAYLOAD_BATCH_RETRY_LIMIT;
          attempt += 1
        ) {
          let resolveBatchRequest:
            | ((results: FetchPlaceableViewportRenderPayloadBatchResult[]) => void)
            | null = null;
          let rejectBatchRequest: ((reason?: unknown) => void) | null = null;
          const batchRequest = new Promise<FetchPlaceableViewportRenderPayloadBatchResult[]>(
            (resolve, reject) => {
              resolveBatchRequest = resolve;
              rejectBatchRequest = reject;
            }
          );
          unresolvedLookups.forEach((lookup) => {
            const pendingPayload = batchRequest.then(
              (results) => results.find((result) => result.key === lookup.cacheKey)?.payload ?? null,
              () => null
            );
            lookup.indexKeys.forEach((key) => {
              placeableRenderPayloadPendingRef.current.set(key, pendingPayload);
            });
          });
          publishQueueSnapshot("batch", true, completedBatchCount);
          void fetchPlaceableViewportRenderPayloadBatch(
            placeableApiPort,
            backendAccessToken,
            unresolvedLookups.map((lookup) => ({
              key: lookup.cacheKey,
              lookup: lookup.processPayload
            })),
            {
              onProcessPayload: (payload, context) => {
                if (cancelled || !isCurrentQueue()) {
                  return;
                }
                const lookup = context?.key ? lookupByBatchKey.get(context.key) : undefined;
                if (!lookup) {
                  return;
                }
                publishAreaPlaceableRenderPayload(lookup, payload, { shouldCache: false });
              }
            }
          ).then(
            (results) => resolveBatchRequest?.(results),
            (error) => rejectBatchRequest?.(error)
          );
          try {
            const results = await batchRequest;
            results.forEach((result) => {
              const lookup = lookupByBatchKey.get(result.key);
              if (!lookup) {
                return;
              }
              if (cancelled || !isCurrentQueue()) {
                publishPlaceableRenderPayload(lookup, result.payload, {
                  shouldCache: true,
                  deferCommit: true
                });
                return;
              }
              publishAreaPlaceableRenderPayload(lookup, result.payload, { shouldCache: true });
              trackTelemetryEvent("ui.workspace.areas_mode.render_payload_batch_loaded", {
                userId,
                templateId: lookup.cacheKey,
                resolvedTemplateId: result.payload.templateId,
                cacheHit: result.payload.cacheHit
              });
            });
            if (cancelled || !isCurrentQueue()) {
              return;
            }
            batchLoaded = true;
            break;
          } catch (error) {
            const message =
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "unknown_error";
            const shouldRetry =
              attempt < AREAS_RENDER_PAYLOAD_BATCH_RETRY_LIMIT && !cancelled && isCurrentQueue();
            trackTelemetryEvent(
              shouldRetry
                ? "ui.workspace.areas_mode.render_payload_batch_retry"
                : "ui.workspace.areas_mode.render_payload_batch_failed",
              {
                userId,
                batchSize: unresolvedLookups.length,
                attempt: attempt + 1,
                message
              }
            );
            if (!shouldRetry) {
              unresolvedLookups.forEach((lookup) => {
                failedLookupKeys.add(lookup.cacheKey);
              });
            } else {
              await new Promise((resolve) => {
                window.setTimeout(
                  resolve,
                  AREAS_RENDER_PAYLOAD_BATCH_RETRY_DELAY_MS * (attempt + 1)
                );
              });
            }
          } finally {
            unresolvedLookups.forEach((lookup) => {
              lookup.indexKeys.forEach((key) => {
                placeableRenderPayloadPendingRef.current.delete(key);
              });
            });
          }
        }
        if (!cancelled && isCurrentQueue() && batchLoaded) {
          failedLookupKeys.forEach((key) => {
            if (lookupByBatchKey.has(key)) {
              failedLookupKeys.delete(key);
            }
          });
        }
        completedBatchCount += 1;
        publishQueueSnapshot("batch", completedBatchCount < batchCount, completedBatchCount);
        if (!cancelled && isCurrentQueue() && AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS > 0) {
          await new Promise((resolve) => {
            window.setTimeout(resolve, AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS);
          });
        }
        }
      };
      const workerCount = Math.min(AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY, batchCount);
      await Promise.all(Array.from({ length: workerCount }, () => runBatchWorker()));
      await runSingleRecoveryQueue();
      publishQueueSnapshot("batch", false, completedBatchCount);
    };

    const runSinglePayloadQueue = async () => {
      let cursor = 0;
      publishQueueSnapshot("single", true, completedBatchCount);
      const runWorker = async () => {
        while (!cancelled && isCurrentQueue() && cursor < lookups.length) {
          const lookup = lookups[cursor];
          cursor += 1;
          if (!lookup) {
            continue;
          }
          await ensurePlaceableRenderPayload(lookup).catch(() => {
            failedLookupKeys.add(lookup.cacheKey);
          });
          completedBatchCount += 1;
          publishQueueSnapshot("single", cursor < lookups.length, completedBatchCount);
          if (!cancelled && isCurrentQueue() && AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS > 0) {
            await new Promise((resolve) => {
              window.setTimeout(resolve, AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS);
            });
          }
        }
      };
      const workerCount = Math.min(AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY, lookups.length);
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
      publishQueueSnapshot("single", false, completedBatchCount);
    };

    const queuePromise = placeableApiPort.processPlaceables
      ? runBatchQueue()
      : runSinglePayloadQueue();
    const trackedQueuePromise = queuePromise.finally(() => {
      if (areaPlaceableRenderPayloadQueueActivePromiseRef.current === trackedQueuePromise) {
        areaPlaceableRenderPayloadQueueActivePromiseRef.current = null;
      }
    });
    areaPlaceableRenderPayloadQueueActivePromiseRef.current = trackedQueuePromise;
    void trackedQueuePromise;

    return () => {
      if (areaPlaceableRenderPayloadQueueActiveSignatureRef.current !== queueSignature) {
        cancelled = true;
      }
    };
  }, [
    areaSceneSeed,
    areasModePlaceableProcessObjects,
    backendAccessToken,
    ensurePlaceableRenderPayload,
    isPlaceablesMode,
    placeableApiPort,
    publishPlaceableRenderPayload,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setPlaceablesCatalogQuery(placeablesSearchQuery);
    }, PLACEABLES_CATALOG_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isPlaceablesMode, placeablesSearchQuery]);

  useEffect(() => {
    if (!isSoundsMode) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setSoundsCatalogQuery(soundsSearchQuery);
    }, SOUNDS_CATALOG_SEARCH_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSoundsMode, soundsSearchQuery]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    persistPlaceablesModeState(
      {
        activeObjectId: activePlaceablesPreviewObjectId,
        searchQuery: placeablesSearchQuery,
        subtypeFilter: placeablesSubtypeFilter
      },
      window.localStorage
    );
  }, [
    activePlaceablesPreviewObjectId,
    isPlaceablesMode,
    placeablesSearchQuery,
    placeablesSubtypeFilter
  ]);

  useEffect(() => {
    placeablesCatalogClientCacheRef.current = null;
    placeableRenderPayloadCacheRef.current.clear();
    placeableRenderPayloadPendingRef.current.clear();
    setPlaceableRenderPayloadByTemplateId({});
  }, [backendAccessToken, placeableApiPort]);

  useEffect(() => {
    soundsCatalogClientCacheRef.current = null;
    setSoundsCatalogItems([]);
    setSoundsCatalogTotal(0);
    setActiveSoundId(null);
    clearSoundPlaybackState();
  }, [backendAccessToken, soundApiPort, clearSoundPlaybackState]);

  useEffect(() => {
    if (isSoundsMode) {
      return;
    }
    setActiveSoundId(null);
    clearSoundPlaybackState();
  }, [clearSoundPlaybackState, isSoundsMode]);

  useEffect(() => {
    return () => {
      stopSoundPlayback();
    };
  }, [stopSoundPlayback]);

  useEffect(() => {
    if (!isBuilder) {
      return;
    }
    setSceneObjectCatalogScope((current) => {
      if (
        current.sourceType === activeBuilderMode.defaultListType &&
        areStringArraysEqual(current.allowedObjectIds, modeScopedObjectIds)
      ) {
        return current;
      }
      return {
        sourceType: activeBuilderMode.defaultListType,
        allowedObjectIds: modeScopedObjectIds
      };
    });
  }, [activeBuilderMode.defaultListType, isBuilder, modeScopedObjectIds]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    if (!placeableApiPort || !backendAccessToken) {
      placeablesCatalogClientCacheRef.current = null;
      setPlaceablesCatalogObjects([]);
      setPlaceablesCatalogTotal(0);
      setActivePlaceablesPreviewObjectId(null);
      setPlaceablesModeSceneSeed(null);
      setPlaceablesCatalogStatus("error");
      setPlaceablesCatalogError("Backend placeables catalog is unavailable.");
      setPlaceablesPreviewError(null);
      return;
    }

    const normalizedPlaceablesQuery = placeablesCatalogQuery.trim();
    const cachedCatalog = placeablesCatalogClientCacheRef.current;
    if (
      cachedCatalog &&
      cachedCatalog.query === normalizedPlaceablesQuery &&
      cachedCatalog.subtypeFilter === placeablesSubtypeFilter &&
      cachedCatalog.expiresAtMs > Date.now()
    ) {
      setPlaceablesCatalogObjects(cachedCatalog.objects);
      setPlaceablesCatalogTotal(cachedCatalog.total);
      setPlaceablesCatalogStatus("ready");
      setPlaceablesCatalogError(null);
      setPlaceablesPreviewError(null);
      return;
    }

    let cancelled = false;
    setPlaceablesCatalogStatus("loading");
    setPlaceablesCatalogObjects([]);
    setPlaceablesCatalogTotal(0);
    setActivePlaceablesPreviewObjectId(null);
    setPlaceablesModeSceneSeed(null);
    setPlaceablesCatalogError(null);
    setPlaceablesPreviewError(null);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: SceneObject[] = [];
      const seenTemplateIds = new Set<string>();

      try {
        while (true) {
          const result = await placeableApiPort.listPlaceables(backendAccessToken, {
            limit: PLACEABLES_CATALOG_BATCH_SIZE,
            offset,
            ...(normalizedPlaceablesQuery ? { query: normalizedPlaceablesQuery } : {}),
            ...(placeablesSubtypeFilter !== "all" ? { subtype: placeablesSubtypeFilter } : {})
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          setPlaceablesCatalogTotal(total);
          let didAppend = false;
          result.items.forEach((item: PlaceablesCatalogListItem, pageIndex: number) => {
            const object = mapPlaceableListItemToSceneObject(item, offset + pageIndex);
            const normalizedTemplateId = object.id.trim().toLowerCase();
            if (seenTemplateIds.has(normalizedTemplateId)) {
              return;
            }
            seenTemplateIds.add(normalizedTemplateId);
            aggregated.push(object);
            didAppend = true;
          });
          if (didAppend) {
            setPlaceablesCatalogObjects([...aggregated]);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0 || (total !== null && consumedItems >= total)) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, PLACEABLES_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        placeablesCatalogClientCacheRef.current = {
          query: normalizedPlaceablesQuery,
          subtypeFilter: placeablesSubtypeFilter,
          objects: aggregated,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + PLACEABLES_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setPlaceablesCatalogObjects([...aggregated]);
        setPlaceablesCatalogTotal(total ?? aggregated.length);
        setPlaceablesCatalogStatus("ready");
        setPlaceablesCatalogError(null);
        trackTelemetryEvent("ui.workspace.placeables_mode.catalog_loaded", {
          userId,
          count: aggregated.length,
          subtypeFilter: placeablesSubtypeFilter
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setPlaceablesCatalogObjects([]);
          setPlaceablesCatalogTotal(0);
          setActivePlaceablesPreviewObjectId(null);
          setPlaceablesModeSceneSeed(null);
        }
        setPlaceablesCatalogStatus("error");
        setPlaceablesCatalogError(resolvePlaceablesCatalogErrorMessage(error));
        trackTelemetryEvent("ui.workspace.placeables_mode.catalog_load_failed", {
          userId,
          errorName: error instanceof Error ? error.name : "unknown",
          status:
            typeof (error as { status?: unknown })?.status === "number"
              ? (error as { status: number }).status
              : null,
          code:
            typeof (error as { code?: unknown })?.code === "string"
              ? (error as { code: string }).code
              : null
        });
        if (isBackendInvalidSessionError(error)) {
          onBackendSessionInvalidated?.("placeables_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    isPlaceablesMode,
    placeableApiPort,
    placeablesCatalogQuery,
    placeablesSubtypeFilter,
    onBackendSessionInvalidated,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!isSoundsMode) {
      setSoundsSearchQuery("");
      setSoundsCatalogQuery("");
      setSoundsCatalogError(null);
      setSoundPlaybackState({ kind: "idle", soundId: null, message: null });
      stopSoundPlayback();
    }
    if (!shouldLoadBackendSoundsCatalog) {
      soundsCatalogClientCacheRef.current = null;
      setSoundsCatalogItems([]);
      setSoundsCatalogTotal(0);
      setActiveSoundId(null);
      setSoundsCatalogStatus("idle");
      setSoundsCatalogError(null);
      return;
    }
    if (!soundApiPort || !backendAccessToken) {
      soundsCatalogClientCacheRef.current = null;
      setSoundsCatalogItems([]);
      setSoundsCatalogTotal(0);
      setActiveSoundId(null);
      setSoundsCatalogStatus("error");
      setSoundsCatalogError("Backend sounds catalog is unavailable.");
      return;
    }

    const normalizedSoundsQuery = isSoundsMode ? soundsCatalogQuery.trim() : "";
    const cachedCatalog = soundsCatalogClientCacheRef.current;
    if (
      cachedCatalog &&
      cachedCatalog.query === normalizedSoundsQuery &&
      cachedCatalog.expiresAtMs > Date.now()
    ) {
      setSoundsCatalogItems(cachedCatalog.items);
      setSoundsCatalogTotal(cachedCatalog.total);
      setSoundsCatalogStatus("ready");
      setSoundsCatalogError(null);
      return;
    }

    let cancelled = false;
    setSoundsCatalogStatus("loading");
    setSoundsCatalogItems([]);
    setSoundsCatalogTotal(0);
    setActiveSoundId(null);
    setSoundsCatalogError(null);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: SoundApiListItem[] = [];
      const seenSoundIds = new Set<string>();

      try {
        while (true) {
          const result = await soundApiPort.listSounds(backendAccessToken, {
            limit: SOUNDS_CATALOG_BATCH_SIZE,
            offset,
            ...(normalizedSoundsQuery ? { query: normalizedSoundsQuery } : {})
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          let didAppend = false;
          result.items.forEach((item) => {
            const normalizedSoundId = item.soundId.trim().toLowerCase();
            if (seenSoundIds.has(normalizedSoundId)) {
              return;
            }
            seenSoundIds.add(normalizedSoundId);
            aggregated.push(item);
            didAppend = true;
          });
          if (didAppend) {
            setSoundsCatalogItems([...aggregated]);
            setSoundsCatalogTotal(total ?? aggregated.length);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0 || (total !== null && consumedItems >= total)) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, SOUNDS_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        soundsCatalogClientCacheRef.current = {
          query: normalizedSoundsQuery,
          items: aggregated,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + SOUNDS_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setSoundsCatalogItems([...aggregated]);
        setSoundsCatalogTotal(total ?? aggregated.length);
        setSoundsCatalogStatus("ready");
        setSoundsCatalogError(null);
        trackTelemetryEvent("ui.workspace.sounds_mode.catalog_loaded", {
          userId,
          count: aggregated.length
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setSoundsCatalogItems([]);
          setSoundsCatalogTotal(0);
          setActiveSoundId(null);
        }
        setSoundsCatalogStatus("error");
        setSoundsCatalogError(resolveSoundsCatalogErrorMessage(error));
        trackTelemetryEvent("ui.workspace.sounds_mode.catalog_load_failed", {
          userId,
          errorName: error instanceof Error ? error.name : "unknown",
          status:
            typeof (error as { status?: unknown })?.status === "number"
              ? (error as { status: number }).status
              : null,
          code:
            typeof (error as { code?: unknown })?.code === "string"
              ? (error as { code: string }).code
              : null
        });
        if (isBackendInvalidSessionError(error)) {
          onBackendSessionInvalidated?.("sounds_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    isSoundsMode,
    shouldLoadBackendSoundsCatalog,
    soundApiPort,
    soundsCatalogQuery,
    onBackendSessionInvalidated,
    stopSoundPlayback,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!isSoundsMode) {
      return;
    }
    const soundIds = soundsCatalogItems.map((sound) => sound.soundId);
    if (soundIds.length < 1) {
      return;
    }
    setActiveSoundId((current) =>
      current && soundIds.includes(current) ? current : (soundIds[0] ?? null)
    );
  }, [isSoundsMode, soundsCatalogItems]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      return;
    }
    const placeableIds = placeablesModeObjects.map((object) => object.id);
    if (placeableIds.length < 1) {
      return;
    }
    setActivePlaceablesPreviewObjectId((current) =>
      current && placeableIds.includes(current) ? current : (placeableIds[0] ?? null)
    );
  }, [isPlaceablesMode, placeablesModeObjects]);

  useEffect(() => {
    if (!isPlaceablesMode) {
      setPlaceablesSearchQuery("");
      setPlaceablesCatalogQuery("");
      setPlaceablesPreviewError(null);
    }
  }, [isPlaceablesMode]);

  useEffect(() => {
    if (!isPlaceablesMode || !activePlaceablesPreviewObject) {
      setPlaceablesModeSceneSeed(null);
      setPlaceablesPreviewError(null);
      return;
    }
    const activeObject = activePlaceablesPreviewObject;
    if (!placeableApiPort || !backendAccessToken) {
      setPlaceablesModeSceneSeed(null);
      setPlaceablesPreviewError("Backend placeable preview is unavailable.");
      return;
    }
    let cancelled = false;
    setPlaceablesPreviewError(null);
    setPlaceablesModeSceneSeed(buildPreviewSceneFromObject(activeObject));
    const activeObjectVfxPayload = resolveSceneObjectPreviewVfxPayload(activeObject);
    const activeObjectIsVfx = Boolean(activeObjectVfxPayload);
    const renderPayloadLookup = resolvePlaceableRenderPayloadLookup(activeObject);
    void ensurePlaceableRenderPayload(renderPayloadLookup)
      .then((payload) => {
        if (cancelled || !payload) {
          return;
        }
        const renderVfxPayload = buildVfxPayloadFromRenderPayload(payload);
        if (!activeObjectVfxPayload && !renderVfxPayload) {
          return;
        }
        setPlaceablesModeSceneSeed(buildPreviewSceneFromObject(activeObject, { renderPayload: payload }));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPlaceablesPreviewError("Failed to load placeable render payload from backend.");
      });
    if (activeObjectIsVfx) {
      return () => {
        cancelled = true;
      };
    }
    void placeableApiPort
      .getPlaceablePreview(backendAccessToken, activeObject.id)
      .then((preview) => {
        if (cancelled) {
          return;
        }
        setPlaceablesModeSceneSeed(
          mapPlaceablePreviewToScene(
            {
              ...preview,
              templateId: preview.templateId.trim().length > 0 ? preview.templateId : activeObject.id,
              resref: preview.resref.trim().length > 0 ? preview.resref : activeObject.resRef,
              name: preview.name.trim().length > 0 ? preview.name : activeObject.name ?? activeObject.tag,
              kind: "placeables",
              ...(activeObjectIsVfx ? { placeableSubtype: "vfx" as const } : {}),
              x: 0.5,
              y: 0.5,
              z: 0
            },
            { width: 1, height: 1 }
          )
        );
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setPlaceablesModeSceneSeed(null);
        setPlaceablesPreviewError("Failed to load placeable preview from backend.");
      });
    return () => {
      cancelled = true;
    };
  }, [
    activePlaceablesPreviewObject,
    backendAccessToken,
    ensurePlaceableRenderPayload,
    isPlaceablesMode,
    placeableApiPort
  ]);
  const handleSceneObjectsSnapshotChange = useCallback((objects: SceneObject[]) => {
    setSceneObjectsSnapshot(objects);
  }, []);
  const handleSceneObjectSelect = useCallback(
    (
      object: SceneObject,
      options?: {
        additive: boolean;
        sourceType: SceneObjectCatalogType;
        allowedObjectIds: string[];
      }
    ) => {
      sidebarSignalRevisionRef.current += 1;
      setSidebarSelectSignal({
        revision: sidebarSignalRevisionRef.current,
        objectId: object.id,
        additive: Boolean(options?.additive),
        sourceType: options?.sourceType ?? "all",
        allowedObjectIds: options?.allowedObjectIds ?? [object.id]
      });
    },
    []
  );
  const handleSceneObjectContextMenu = useCallback(
    (object: SceneObject, clientX: number, clientY: number) => {
      sidebarSignalRevisionRef.current += 1;
      setSidebarContextMenuSignal({
        revision: sidebarSignalRevisionRef.current,
        objectId: object.id,
        objectKind: object.kind,
        clientX,
        clientY
      });
    },
    []
  );
  const handleSceneObjectPropertiesOpen = useCallback((object: SceneObject) => {
    sidebarSignalRevisionRef.current += 1;
    setSidebarPropertiesSignal({
      revision: sidebarSignalRevisionRef.current,
      objectId: object.id,
      objectKind: object.kind
    });
  }, []);
  const handleSceneObjectCreate = useCallback((object: SceneObject) => {
    sidebarSignalRevisionRef.current += 1;
    setActiveObjectAddTemplateId(object.id);
    setCanvasCreateObjectSignal({
      revision: sidebarSignalRevisionRef.current,
      template: object
    });
  }, []);
  const handleObjectAddPlacementModeChange = useCallback(
    (placement: { templateId: string } | null) => {
      setActiveObjectAddTemplateId(placement?.templateId ?? null);
    },
    []
  );
  const handleBuilderModeSelect = useCallback(
    (modeId: WorkspaceModeId) => {
      if (activeBuilderModeId === "areas_mode" && modeId !== "areas_mode") {
        setAreaSceneSeed((current) => ({
          ...(current ?? defaultAreasSceneSeed),
          objects: sceneObjectsSnapshot
        }));
      }
      if (controlledActiveBuilderModeId === undefined) {
        setUncontrolledActiveBuilderModeId(modeId);
      }
      if (modeId !== activeBuilderModeId) {
        setActiveObjectAddTemplateId(null);
      }
      onActiveBuilderModeChange?.(modeId);
      trackTelemetryEvent("ui.workspace.mode.changed", {
        userId,
        mode: modeId
      });
    },
    [
      activeBuilderModeId,
      controlledActiveBuilderModeId,
      defaultAreasSceneSeed,
      onActiveBuilderModeChange,
      sceneObjectsSnapshot,
      trackTelemetryEvent,
      userId
    ]
  );
  const areaPlaceableRenderPayloadQueueSnapshotJson = areaPlaceableRenderPayloadQueueSnapshot
    ? JSON.stringify(areaPlaceableRenderPayloadQueueSnapshot)
    : undefined;
  return (
    <section
      className="workspace-layout"
      aria-label="workspace layout"
      data-area-placeable-render-payload-queue-status={
        areaPlaceableRenderPayloadQueueSnapshot?.status ?? "idle"
      }
      data-area-placeable-render-payload-queue-mode={
        areaPlaceableRenderPayloadQueueSnapshot?.queueMode ?? "unavailable"
      }
      data-area-placeable-render-payload-placeholder-status={
        areaPlaceableRenderPayloadQueueSnapshot?.placeholderStatus ?? "idle"
      }
      data-area-placeable-render-payload-queue-snapshot={
        areaPlaceableRenderPayloadQueueSnapshotJson
      }
    >
      <section
        className="workspace-canvas-layer"
        aria-label="workspace canvas"
        data-external-scene-id={externalSceneSeed.sceneId}
        data-external-scene-size={`${externalSceneSeed.width}x${externalSceneSeed.height}`}
        data-external-scene-object-count={externalSceneSeed.objects.length}
      >
        <WorkspaceCanvasViewport
          key={`workspace-canvas-${externalSceneSeedKey}`}
          toolbarState={viewportToolbarState}
          userId={userId}
          sceneViewportPort={sceneViewportPort}
          trackTelemetryEvent={trackTelemetryEvent}
          commandSignal={commandSignal}
          sidebarSelectSignal={sidebarSelectSignal}
          sidebarContextMenuSignal={sidebarContextMenuSignal}
          sidebarPropertiesSignal={sidebarPropertiesSignal}
          canvasCreateObjectSignal={canvasCreateObjectSignal}
          catalogScope={isSoundsMode ? null : sceneObjectCatalogScope}
          workspaceOptions={viewportWorkspaceOptions}
          leftPanelWidthPx={leftPanelWidthPx}
          rightPanelWidthPx={rightPanelWidthPx}
          onSceneObjectsSnapshotChange={handleSceneObjectsSnapshotChange}
          onSelectionSnapshotChange={setSelectedObjectIdsSnapshot}
          onObjectAddPlacementModeChange={handleObjectAddPlacementModeChange}
          externalSceneSeed={externalSceneSeed}
          renderObjectIds={renderObjectIds}
          areaCanvasLoading={areaCanvasLoading}
          areaTileProcessReadiness={areaTileProcessReadiness}
          placeableRenderPayloadByObjectId={placeableRenderPayloadByObjectId}
          placeableAssetAccessToken={backendAccessToken}
          showGizmoModeBadge={!isPlaceablesMode}
        />
      </section>

      <WorkspaceStatusStrip
        activeMode={activeBuilderMode}
        objectCount={modeScopedObjects.length}
        selectedCount={selectedObjectIdsSnapshot.length}
        leftCollapsed={leftCollapsed}
        rightCollapsed={rightCollapsed}
        leftPanelWidthPx={leftPanelWidthPx}
        rightPanelWidthPx={rightPanelWidthPx}
        loadingState={areaCanvasLoading}
      />

      <SidebarColumn
        side="left"
        title="left sidebar"
        sections={panels.left}
        customContent={
          shouldRenderSceneObjectAddPanel ? (
            <>
              <WorkspaceModeSwitch
                activeModeId={activeBuilderModeId}
                onModeSelect={handleBuilderModeSelect}
              />
              {isPlaceablesMode ? (
                <PlaceablesModePanel
                  objects={filteredPlaceablesModeObjects}
                  total={placeablesCatalogTotal}
                  activeObjectId={activePlaceablesPreviewObjectId}
                  subtypeFilter={placeablesSubtypeFilter}
                  searchQuery={placeablesSearchQuery}
                  isLoading={placeablesCatalogStatus === "loading"}
                  loadErrorMessage={placeablesCatalogError}
                  previewErrorMessage={placeablesPreviewError}
                  placeableRenderPayloadByTemplateId={placeableRenderPayloadByTemplateId}
                  placeableAssetAccessToken={backendAccessToken}
                  onObjectRenderPayloadNeeded={requestSceneObjectThumbnailRenderPayload}
                  onSubtypeFilterChange={(value) => {
                    setPlaceablesCatalogStatus("loading");
                    setPlaceablesCatalogObjects([]);
                    setPlaceablesCatalogTotal(0);
                    setActivePlaceablesPreviewObjectId(null);
                    setPlaceablesModeSceneSeed(null);
                    setPlaceablesPreviewError(null);
                    placeablesCatalogClientCacheRef.current = null;
                    setPlaceablesSubtypeFilter(value);
                    trackTelemetryEvent("ui.workspace.placeables_mode.subtype_filter_changed", {
                      userId,
                      subtypeFilter: value
                    });
                  }}
                  onSearchQueryChange={(value) => {
                    setPlaceablesCatalogStatus("loading");
                    setPlaceablesCatalogObjects([]);
                    setPlaceablesCatalogTotal(0);
                    setActivePlaceablesPreviewObjectId(null);
                    setPlaceablesModeSceneSeed(null);
                    setPlaceablesPreviewError(null);
                    setPlaceablesSearchQuery(value);
                    trackTelemetryEvent("ui.workspace.placeables_mode.filter_changed", {
                      userId,
                      query: value
                    });
                  }}
                  onResetFilters={() => {
                    setPlaceablesCatalogStatus("loading");
                    setPlaceablesCatalogObjects([]);
                    setPlaceablesCatalogTotal(0);
                    setActivePlaceablesPreviewObjectId(null);
                    setPlaceablesModeSceneSeed(null);
                    setPlaceablesPreviewError(null);
                    placeablesCatalogClientCacheRef.current = null;
                    setPlaceablesSubtypeFilter("all");
                    setPlaceablesSearchQuery("");
                    setPlaceablesCatalogQuery("");
                    trackTelemetryEvent("ui.workspace.placeables_mode.filters_reset", {
                      userId
                    });
                  }}
                  onObjectClick={(clickedObject) => {
                    const objectId = clickedObject.id;
                    setActivePlaceablesPreviewObjectId(objectId);
                    setSceneObjectCatalogScope({
                      sourceType: "placeables",
                      allowedObjectIds: [objectId]
                    });
                    trackTelemetryEvent("ui.workspace.placeables_mode.object_selected", {
                      userId,
                      objectId
                    });
                    requestPlaceablesModeRenderPayloadForObject(clickedObject);
                  }}
                />
              ) : isSoundsMode ? (
                <SoundsModePanel
                  sounds={filteredSoundsCatalogItems}
                  total={soundsCatalogTotal}
                  activeSoundId={activeSoundId}
                  searchQuery={soundsSearchQuery}
                  categoryFilter={soundsCategoryFilter}
                  sourceFilter={soundsSourceFilter}
                  isLoading={soundsCatalogStatus === "loading"}
                  loadErrorMessage={soundsCatalogError}
                  playbackState={soundPlaybackState}
                  onSearchQueryChange={(value) => {
                    clearSoundPlaybackState();
                    setSoundsCatalogStatus("loading");
                    setSoundsCatalogItems([]);
                    setSoundsCatalogTotal(0);
                    setActiveSoundId(null);
                    setSoundsCatalogError(null);
                    setSoundsSearchQuery(value);
                    trackTelemetryEvent("ui.workspace.sounds_mode.filter_changed", {
                      userId,
                      query: value
                    });
                  }}
                  onCategoryFilterChange={(value) => {
                    clearSoundPlaybackState();
                    setSoundsCategoryFilter(value);
                    setActiveSoundId(null);
                    trackTelemetryEvent("ui.workspace.sounds_mode.category_filter_changed", {
                      userId,
                      category: value
                    });
                  }}
                  onSourceFilterChange={(value) => {
                    clearSoundPlaybackState();
                    setSoundsSourceFilter(value);
                    setActiveSoundId(null);
                    trackTelemetryEvent("ui.workspace.sounds_mode.source_filter_changed", {
                      userId,
                      source: value
                    });
                  }}
                  onResetFilters={() => {
                    clearSoundPlaybackState();
                    setSoundsCatalogStatus("loading");
                    setSoundsCatalogItems([]);
                    setSoundsCatalogTotal(0);
                    setActiveSoundId(null);
                    setSoundsCatalogError(null);
                    soundsCatalogClientCacheRef.current = null;
                    setSoundsSearchQuery("");
                    setSoundsCatalogQuery("");
                    setSoundsCategoryFilter("all");
                    setSoundsSourceFilter("all");
                    trackTelemetryEvent("ui.workspace.sounds_mode.filters_reset", {
                      userId
                    });
                  }}
                  onSoundSelect={(sound) => {
                    if (sound.soundId !== activeSoundId) {
                      clearSoundPlaybackState();
                    }
                    setActiveSoundId(sound.soundId);
                    trackTelemetryEvent("ui.workspace.sounds_mode.sound_selected", {
                      userId,
                      soundId: sound.soundId
                    });
                  }}
                  onSoundPlay={playSoundPreview}
                  onSoundStop={stopSoundPreview}
                />
              ) : (
                <AreasModePanel
                  userId={userId}
                  objects={areaModeAddPanelObjects}
                  activeMode={activeBuilderMode}
                  backendAccessToken={backendAccessToken}
                  areaApiPort={areaApiPort}
                  tileApiPort={tileApiPort}
                  areaListClientCacheRef={areaListClientCacheRef}
                  sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
                  placeableRenderPayloadByTemplateId={placeableRenderPayloadByTemplateId}
                  placeableAssetAccessToken={backendAccessToken}
                  trackTelemetryEvent={trackTelemetryEvent}
                  onAreaCanvasLoadingChange={setAreaCanvasLoading}
                  onTileProcessReadinessChange={setAreaTileProcessReadiness}
                  onObjectCreate={handleSceneObjectCreate}
                  activeCreateObjectId={activeObjectAddTemplateId}
                  onAreaSceneSelected={(scene) => {
                    const scopedObjects = filterObjectsForWorkspaceMode(scene.objects, activeBuilderMode);
                    setAreaTileProcessReadiness(null);
                    setAreaSceneSeed(scene);
                    setSceneObjectCatalogScope({
                      sourceType: activeBuilderMode.defaultListType,
                      allowedObjectIds: scopedObjects.map((object) => object.id)
                    });
                  }}
                />
              )}
            </>
          ) : undefined
        }
        workspaceModeId={activeBuilderModeId}
        collapsed={leftCollapsed}
        onToggle={onToggleLeftCollapsed}
      />

      <SidebarColumn
        side="right"
        title="right sidebar"
        sections={panels.right}
        customContent={
          isPlaceablesMode ? (
            <PlaceablesModeRightPanel
              activePayload={activePlaceableRenderPayload}
              activePreviewObject={activePlaceablesInspectorObject}
              previewErrorMessage={placeablesPreviewError}
            />
          ) : isSoundsMode ? (
            <SoundsModeRightPanel
              activeSound={activeSound}
              playbackState={soundPlaybackState}
            />
          ) : shouldRenderSceneObjectsPanel ? (
            <SceneObjectListPanel
              key={`scene-object-list-panel-${activeBuilderModeId}`}
              userId={userId}
              objects={modeScopedObjects}
              sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
              trackTelemetryEvent={trackTelemetryEvent}
              allowedCatalogTypes={[...activeBuilderMode.allowedCatalogTypes]}
              defaultActiveType={activeBuilderMode.defaultListType}
              hideUnsupportedCatalogTypes
              selectedObjectIds={selectedObjectIdsSnapshot}
              placeableRenderPayloadByObjectId={placeableRenderPayloadByObjectId}
              placeableAssetAccessToken={backendAccessToken}
              onCatalogScopeChange={setSceneObjectCatalogScope}
              onObjectSelect={handleSceneObjectSelect}
              onObjectContextMenu={handleSceneObjectContextMenu}
              onObjectPropertiesOpen={handleSceneObjectPropertiesOpen}
            />
          ) : undefined
        }
        workspaceModeId={activeBuilderModeId}
        collapsed={rightCollapsed}
        onToggle={onToggleRightCollapsed}
      />
    </section>
  );
}
