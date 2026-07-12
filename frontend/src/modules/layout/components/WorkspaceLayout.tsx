import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_AURORA_AREA_EDITING_TOOL,
  type AreaScene,
  type AuroraAreaEditingTool,
  type SceneObject,
  type SceneObjectKind
} from "../contracts";
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
import { CreaturesModePanel } from "./CreaturesModePanel";
import { CreaturesModeRightPanel } from "./CreaturesModeRightPanel";
import { ItemsModePanel } from "./ItemsModePanel";
import { ItemsModeRightPanel } from "./ItemsModeRightPanel";
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
  type WorkspaceAreaCanvasLoadingState,
  type WorkspaceAreaEditorMutationSignal
} from "./WorkspaceCanvasViewport";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  type WorkspaceOptionSettings
} from "../workspaceOptionSettings";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { AreaListClientCacheEntry } from "./AreaSelectionPanel";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import {
  buildAreaTileProcessContractSceneKey,
  isCurrentAreaTileProcessRequest,
  resolveAreaTileProcessContractReadinessForModelResRefs,
  scopeAreaTileProcessReadinessToScene,
  shouldRequestAreaTileProcessReadiness,
  type AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";
import type { TileApiPort } from "../../tiles/ports/tileApiPort";
import type { PlaceableApiPort } from "../../placeables/ports/placeableApiPort";
import type { CreatureApiPort } from "../../creatures/ports/creatureApiPort";
import type {
  CreatureApiListItem,
  CreatureApiProcessPayload,
  CreatureApiResourceOption,
  CreatureApiResourceOptionKind
} from "../../creatures/contracts";
import { buildCreatureAppearanceProcessOverride } from "../../creatures/application/creatureRenderPayloadOverrides";
import { buildCreatureBlueprintCreatePayloadFromSceneObject } from "../../creatures/application/creatureCreationWizard";
import { mapCreatureApiListItemToSceneObject } from "../../creatures/application/creatureSceneObjectMapper";
import {
  fetchCreatureViewportRenderPayload,
  type CreatureViewportRenderPayload
} from "../../creatures/application/creatureRenderPayloadResolver";
import type { EncounterApiPort } from "../../encounters/ports/encounterApiPort";
import type { EncounterApiListItem } from "../../encounters/contracts";
import { mapEncounterApiListItemToSceneObject } from "../../encounters/application/encounterSceneObjectMapper";
import type { ItemApiPort } from "../../items/ports/itemApiPort";
import type {
  ItemApiBaseItemEntry,
  ItemApiCustomPaletteWritePayload,
  ItemApiGeneratorSupportResult,
  ItemApiListItem,
  ItemApiPaletteTreeResult,
  ItemApiPropertyDictionaryEntry,
  ItemApiVisualOverride
} from "../../items/contracts";
import {
  applyItemApiProcessResultToSceneObject,
  compareItemSceneObjectsByAuroraStorePanel,
  mapItemApiBaseItemToSceneObject,
  mapItemApiListItemToSceneObject
} from "../../items/application/itemSceneObjectMapper";
import {
  buildItemBlueprintCreatePayloadFromWizardSceneObject,
  buildItemVisualOverrideFromSceneObjectItem,
  isItemCreationWizardSceneObject,
  mergeProcessedItemWizardSceneObject
} from "../../items/application/itemCreationWizard";
import type { SoundApiPort } from "../../sounds/ports/soundApiPort";
import type {
  SoundApiAudioDeliveryContract,
  SoundApiListItem
} from "../../sounds/contracts";
import type { StoreApiPort } from "../../stores/ports/storeApiPort";
import type {
  StoreApiBlueprintCreatePayload,
  StoreApiListItem
} from "../../stores/contracts";
import { mapStoreApiListItemToSceneObject } from "../../stores/application/storeSceneObjectMapper";
import { mapSoundApiListItemToSceneObject } from "../../sounds/application/soundSceneObjectMapper";
import { mapPlaceablePreviewToScene } from "../../placeables/application/placeablePreviewSceneMapper";
import { createSeedAreaScene } from "../../scene/domain/sceneFactory";
import {
  buildVfxPayloadFromPlaceablePreview,
  buildVfxPayloadFromRenderPayload,
  isPlaceablePreviewVfx
} from "../../placeables/application/placeableVfxPreservePayload";
import {
  buildPlaceableViewportProcessPreviewPayload,
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

interface WorkspaceLayoutProps {
  role: WorkspaceUserRole;
  userId: string;
  workspaceChromeFacade: WorkspaceChromeFacade;
  sceneViewportPort: SceneViewportPort;
  areaApiPort: AreaApiPort;
  tileApiPort?: TileApiPort;
  placeableApiPort?: PlaceableApiPort;
  creatureApiPort?: CreatureApiPort;
  encounterApiPort?: EncounterApiPort;
  itemApiPort?: ItemApiPort;
  soundApiPort?: SoundApiPort;
  storeApiPort?: StoreApiPort;
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
  viewportFullscreen?: boolean;
  onExitViewportFullscreen?: () => void;
  onBackendSessionInvalidated?: (
    source:
      | "placeables_catalog"
      | "creatures_catalog"
      | "encounters_catalog"
      | "items_catalog"
      | "stores_catalog"
      | "sounds_catalog",
    accessToken: string
  ) => void;
}

const SIDEBAR_EXPANDED_WIDTH_PX = 320;
const SIDEBAR_COLLAPSED_WIDTH_PX = 44;
export const PLACEABLES_MODE_STATE_STORAGE_KEY = "aurora_web.placeables_mode_state.v1";
export const AREAS_MODE_SELECTED_SCENE_STORAGE_KEY =
  "aurora_web.areas_mode_selected_scene.v1";
export const CREATURES_MODE_CUSTOM_TEMPLATES_STORAGE_KEY =
  "aurora_web.creatures_mode_custom_templates.v1";
export const ITEMS_MODE_CUSTOM_TEMPLATES_STORAGE_KEY =
  "aurora_web.items_mode_custom_templates.v1";

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

function resolveCreaturesCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load creatures from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load creatures from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load creatures: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load creatures from backend: ${detail}` : fallbackMessage;
}

function resolveEncountersCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load encounters from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load encounters from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load encounters: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load encounters from backend: ${detail}` : fallbackMessage;
}

function resolveItemsCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load items from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load items from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load items: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load items from backend: ${detail}` : fallbackMessage;
}

function resolveStoresCatalogErrorMessage(error: unknown): string {
  const fallbackMessage = "Failed to load stores from backend.";
  if (!(error instanceof Error)) {
    return fallbackMessage;
  }

  const status = (error as { status?: unknown }).status;
  const code = (error as { code?: unknown }).code;
  if (typeof status === "number" && Number.isFinite(status)) {
    const codeLabel = typeof code === "string" && code.trim().length > 0 ? ` ${code}` : "";
    return `Failed to load stores from backend (${status}${codeLabel}).`;
  }

  if (error.name === "ZodError") {
    return "Failed to load stores: backend catalog response does not match the expected contract.";
  }

  const detail = error.message.trim();
  return detail ? `Failed to load stores from backend: ${detail}` : fallbackMessage;
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

function loadInitialItemsSearchQuery(search: string): string {
  const params = new URLSearchParams(search);
  return (
    params.get("item")?.trim() ||
    params.get("itemQuery")?.trim() ||
    params.get("itemResref")?.trim() ||
    ""
  ).slice(0, 120);
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

function isPersistableCustomCreatureTemplate(value: unknown): value is SceneObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<SceneObject>;
  return (
    record.kind === "creatures" &&
    typeof record.id === "string" &&
    record.id.startsWith("cre_wizard_") &&
    typeof record.resRef === "string" &&
    record.resRef.trim().length > 0 &&
    typeof record.tag === "string" &&
    record.tag.trim().length > 0 &&
    typeof record.source === "object" &&
    record.source?.sourceKind === "creature" &&
    record.source?.type === "aurora_git"
  );
}

function loadPersistedCustomCreatureTemplateObjects(
  storage: Storage | null | undefined
): SceneObject[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(CREATURES_MODE_CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isPersistableCustomCreatureTemplate);
  } catch {
    return [];
  }
}

function persistCustomCreatureTemplateObjects(
  objects: SceneObject[],
  storage: Storage | null | undefined
): void {
  if (!storage) {
    return;
  }
  try {
    const persistableObjects = objects.filter(isPersistableCustomCreatureTemplate);
    if (persistableObjects.length < 1) {
      storage.removeItem(CREATURES_MODE_CUSTOM_TEMPLATES_STORAGE_KEY);
      return;
    }
    storage.setItem(
      CREATURES_MODE_CUSTOM_TEMPLATES_STORAGE_KEY,
      JSON.stringify(persistableObjects)
    );
  } catch {
    // Custom blueprints remain available in memory even when localStorage is unavailable.
  }
}

function isPersistableCustomItemTemplate(value: unknown): value is SceneObject {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Partial<SceneObject>;
  return (
    record.kind === "items" &&
    typeof record.id === "string" &&
    record.id.startsWith("itm_wizard_") &&
    typeof record.resRef === "string" &&
    record.resRef.trim().length > 0 &&
    typeof record.tag === "string" &&
    record.tag.trim().length > 0 &&
    typeof record.source === "object" &&
    record.source?.sourceKind === "item" &&
    record.source?.type === "aurora_git"
  );
}

function loadPersistedCustomItemTemplateObjects(
  storage: Storage | null | undefined
): SceneObject[] {
  if (!storage) {
    return [];
  }
  try {
    const raw = storage.getItem(ITEMS_MODE_CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isPersistableCustomItemTemplate);
  } catch {
    return [];
  }
}

function persistCustomItemTemplateObjects(
  objects: SceneObject[],
  storage: Storage | null | undefined
): void {
  if (!storage) {
    return;
  }
  try {
    const persistableObjects = objects.filter(isPersistableCustomItemTemplate);
    if (persistableObjects.length < 1) {
      storage.removeItem(ITEMS_MODE_CUSTOM_TEMPLATES_STORAGE_KEY);
      return;
    }
    storage.setItem(ITEMS_MODE_CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(persistableObjects));
  } catch {
    // Custom blueprints remain available in memory even when localStorage is unavailable.
  }
}

function normalizeCatalogResRef(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function readCatalogItemTemplateResRef(item: ItemApiListItem): string {
  const templateResRef = item.metadata?.templateResRef;
  return typeof templateResRef === "string" && templateResRef.trim().length > 0
    ? templateResRef
    : item.resref;
}

export function pruneCustomItemTemplatesBackedByCatalog(
  customObjects: readonly SceneObject[],
  catalogItems: readonly ItemApiListItem[]
): SceneObject[] {
  if (customObjects.length < 1 || catalogItems.length < 1) {
    return [...customObjects];
  }
  const catalogResRefs = new Set(
    catalogItems
      .map((item) => normalizeCatalogResRef(readCatalogItemTemplateResRef(item)))
      .filter((resRef) => resRef.length > 0)
  );
  return customObjects.filter(
    (object) => !catalogResRefs.has(normalizeCatalogResRef(object.resRef))
  );
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

interface CreaturesCatalogClientCacheEntry {
  items: CreatureApiListItem[];
  total: number;
  expiresAtMs: number;
}

interface EncountersCatalogClientCacheEntry {
  items: EncounterApiListItem[];
  total: number;
  expiresAtMs: number;
}

interface ItemsCatalogClientCacheEntry {
  items: ItemApiListItem[];
  query: string;
  total: number;
  expiresAtMs: number;
}

interface StoresCatalogClientCacheEntry {
  items: StoreApiListItem[];
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
const AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY = 4;
const AREAS_RENDER_PAYLOAD_BATCH_QUEUE_CONCURRENCY = 1;
const AREAS_RENDER_PAYLOAD_QUEUE_YIELD_MS = 120;
const AREAS_RENDER_PAYLOAD_BATCH_SIZE = 128;
const AREAS_RENDER_PAYLOAD_PROCESS_BATCH_TIMEOUT_MS = 180_000;
const AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS = 30_000;
const AREAS_RENDER_PAYLOAD_EARLY_SINGLE_RECOVERY_DELAY_MS = 5_000;
const AREAS_RENDER_PAYLOAD_BATCH_RETRY_LIMIT = 5;
const AREAS_RENDER_PAYLOAD_BATCH_RETRY_DELAY_MS = 60;
const AREAS_RENDER_PAYLOAD_LOADING_LABEL = "Loading Area PLC/DOR render payloads";
const AREAS_USE_BACKEND_VIEWPORT_RENDER_PAYLOAD_BATCH = true;
const AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY_SESSION_KEY =
  "aurora_web.areas_runtime_capture.terrain_only.v1";
const PLACEABLE_PAYLOAD_RENDER_FLUSH_MS = 16;
const AREAS_RENDER_PAYLOAD_SNAPSHOT_ID_LIMIT = 24;
const SOUNDS_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const SOUNDS_CATALOG_BATCH_SIZE = 100;
const SOUNDS_CATALOG_PAGE_YIELD_MS = 75;
const SOUNDS_CATALOG_SEARCH_DEBOUNCE_MS = 250;
const CREATURES_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const CREATURES_CATALOG_BATCH_SIZE = 1000;
const CREATURES_CATALOG_PAGE_YIELD_MS = 75;
const AREAS_CREATURE_RENDER_PAYLOAD_QUEUE_CONCURRENCY = 8;
const ENCOUNTERS_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const ENCOUNTERS_CATALOG_BATCH_SIZE = 1000;
const ENCOUNTERS_CATALOG_PAGE_YIELD_MS = 75;
const ITEMS_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const ITEMS_CATALOG_BATCH_SIZE = 1000;
const ITEMS_CATALOG_PAGE_YIELD_MS = 75;
const ITEMS_CATALOG_EMPTY_PAGE_RETRY_LIMIT = 3;
const STORES_CATALOG_CLIENT_CACHE_TTL_MS = 60_000;
const STORES_CATALOG_BATCH_SIZE = 1000;
const STORES_CATALOG_PAGE_YIELD_MS = 75;

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

function isAreasRuntimeCaptureTerrainOnlyObjectPayloadSkipEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const runtimeWindow = window as typeof window & {
    __AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__?: boolean;
  };
  if (runtimeWindow.__AURORA_AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY__ === true) {
    return true;
  }
  try {
    return (
      window.sessionStorage.getItem(
        AREAS_RUNTIME_CAPTURE_TERRAIN_ONLY_SESSION_KEY
      ) === "true"
    );
  } catch {
    return false;
  }
}

interface CreatureRenderPayloadLookup {
  cacheKey: string;
  processPayload: CreatureApiProcessPayload;
  indexKeys: string[];
}

interface CreatureRenderPayloadRequestOptions {
  refresh?: boolean;
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
  stores: false,
  triggers: false,
  waypoints: false,
  start_location: false
};

const CREATURES_PREVIEW_VISIBILITY: WorkspaceToolbarState["visibility"] = {
  creatures: true,
  doors: false,
  encounters: false,
  items: false,
  merchants: false,
  placeables: false,
  sounds: false,
  stores: false,
  triggers: false,
  waypoints: false,
  start_location: false
};

const ITEMS_PREVIEW_VISIBILITY: WorkspaceToolbarState["visibility"] = {
  creatures: false,
  doors: false,
  encounters: false,
  items: true,
  merchants: false,
  placeables: false,
  sounds: false,
  stores: false,
  triggers: false,
  waypoints: false,
  start_location: false
};

const PLACEABLES_PREVIEW_LOCKED_KINDS: WorkspaceToolbarState["canvasDebug"]["lockedKinds"] = {
  creatures: false,
  doors: false,
  encounters: false,
  items: false,
  placeables: false,
  sounds: false,
  stores: false,
  triggers: false,
  waypoints: false
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
  encounters: "encounters",
  items: "items",
  sounds: "sounds",
  stores: "stores",
  triggers: "triggers",
  waypoints: "waypoints"
};

function resolveObjectPreviewToolbarState(
  toolbarState: WorkspaceToolbarState,
  selectionScope: WorkspaceToolbarState["selectionScope"],
  visibility: WorkspaceToolbarState["visibility"]
): WorkspaceToolbarState {
  return {
    ...toolbarState,
    selectionMode: "object",
    selectionScope,
    visibility: { ...visibility },
    canvasDebug: {
      ...toolbarState.canvasDebug,
      wireframe: false,
      textures: true,
      grid: true,
      axes: true,
      bounds: false,
      displayShadows: toolbarState.canvasDebug.displayShadows,
      displayFog: toolbarState.canvasDebug.displayFog,
      useAreaLighting: toolbarState.canvasDebug.useAreaLighting,
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

function resolvePlaceablesPreviewToolbarState(
  toolbarState: WorkspaceToolbarState
): WorkspaceToolbarState {
  return resolveObjectPreviewToolbarState(
    toolbarState,
    "placeables",
    PLACEABLES_PREVIEW_VISIBILITY
  );
}

function resolveCreaturesPreviewToolbarState(
  toolbarState: WorkspaceToolbarState
): WorkspaceToolbarState {
  return resolveObjectPreviewToolbarState(
    toolbarState,
    "creatures",
    CREATURES_PREVIEW_VISIBILITY
  );
}

function resolveItemsPreviewToolbarState(
  toolbarState: WorkspaceToolbarState
): WorkspaceToolbarState {
  return resolveObjectPreviewToolbarState(toolbarState, "items", ITEMS_PREVIEW_VISIBILITY);
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

function buildCreaturePreviewSceneFromObject(
  object: SceneObject,
  options: { now?: () => number } = {}
): AreaScene {
  const now = options.now ?? (() => Date.now());
  const seed = createSeedAreaScene(1, 1);
  const templateId = object.id.startsWith("preview:")
    ? object.id.slice("preview:".length)
    : object.id;
  const previewObjectId = `preview:${templateId}`;
  return {
    ...seed,
    sceneId: `creatures_mode_preview:${templateId}`,
    areaName: `${object.name ?? object.tag} Preview`,
    width: 1,
    height: 1,
    tileSource: {
      type: "seed_placeholder",
      tileCount: 0,
      fallbackReason: "creatures-mode-preview"
    },
    tiles: [],
    objects: [
      {
        ...object,
        id: previewObjectId,
        x: 0.5,
        y: 0.5,
        z: 0,
        bearing: object.bearing ?? 0,
        visualTransform: object.visualTransform ?? { ...DEFAULT_VISUAL_TRANSFORM }
      }
    ],
    updatedAtUnixMs: now()
  };
}

function buildItemPreviewSceneFromObject(
  object: SceneObject,
  options: { now?: () => number } = {}
): AreaScene {
  const now = options.now ?? (() => Date.now());
  const seed = createSeedAreaScene(1, 1);
  const templateId = object.id.startsWith("preview:")
    ? object.id.slice("preview:".length)
    : object.id;
  const previewObjectId = `preview:${templateId}`;
  return {
    ...seed,
    sceneId: `items_mode_preview:${templateId}`,
    areaName: `${object.name ?? object.tag} Preview`,
    width: 1,
    height: 1,
    tileSource: {
      type: "seed_placeholder",
      tileCount: 0,
      fallbackReason: "items-mode-preview"
    },
    tiles: [],
    objects: [
      {
        ...object,
        id: previewObjectId,
        x: 0.5,
        y: 0.5,
        z: 0,
        bearing: object.bearing ?? 0,
        visualTransform: object.visualTransform ?? { ...DEFAULT_VISUAL_TRANSFORM }
      }
    ],
    updatedAtUnixMs: now()
  };
}

function hasRenderableItemPreviewAssets(object: SceneObject): boolean {
  const properties = object.itemProperties;
  return Boolean(
    properties?.modelPartCandidates?.some((candidate) =>
      Boolean(candidate.glbUrl?.trim() || candidate.modelUrl?.trim())
    ) ||
      properties?.armorPartModelCandidates?.some((candidate) =>
        Boolean(candidate.glbUrl?.trim() || candidate.modelUrl?.trim())
      ) ||
      properties?.modelAssetCandidates?.some((candidate) => {
        const role = candidate.role.trim().toLowerCase();
        const extension = candidate.extension.trim().toLowerCase();
        return (
          candidate.assetUrl.trim().length > 0 &&
          (role === "texture" || role === "material") &&
          ["bmp", "dds", "gif", "jpg", "jpeg", "plt", "png", "svg", "tga", "tpc", "webp"].includes(
            extension
          )
        );
      })
  );
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

function dedupeNonEmptyWorkspaceText(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function buildCreatureTemplateIdFromResRef(resRef: string): string {
  return `cre_${resRef.trim()}`.slice(0, 80);
}

function buildWorkspaceLayoutStringFingerprint(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableWorkspaceLayoutJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableWorkspaceLayoutJsonStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableWorkspaceLayoutJsonStringify(entry)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function buildCreatureProcessPayloadLookupKey(
  objectId: string,
  templateId: string,
  processPayload: CreatureApiProcessPayload
): string {
  const identity = objectId.trim().length > 0 ? objectId.trim() : templateId.trim();
  return `${identity}:process:${buildWorkspaceLayoutStringFingerprint(
    stableWorkspaceLayoutJsonStringify(processPayload)
  )}`;
}

function cloneSceneCreatureSourceMetadata(
  object: SceneObject
): CreatureApiProcessPayload["creatureMetadata"] | undefined {
  if (
    object.kind !== "creatures" ||
    object.source?.type !== "aurora_git" ||
    !object.source.creatureMetadata
  ) {
    return undefined;
  }
  return { ...object.source.creatureMetadata };
}

function resolveCreatureRenderPayloadLookup(object: SceneObject): CreatureRenderPayloadLookup {
  const objectId = object.id.trim();
  const resRef = object.resRef.trim();
  const sourceTemplateId =
    object.source?.type === "aurora_git" ? object.source.templateId?.trim() : undefined;
  const objectIdCanBeTemplateId =
    objectId.length > 0 && !objectId.startsWith("area_") && !objectId.startsWith("preview:");
  const fallbackTemplateId =
    sourceTemplateId && sourceTemplateId.length > 0
      ? sourceTemplateId
      : resRef.length > 0
        ? buildCreatureTemplateIdFromResRef(resRef)
        : objectId;
  const templateId = objectIdCanBeTemplateId && object.source?.type !== "aurora_git"
    ? objectId
    : fallbackTemplateId;
  const creatureAppearanceOverride = buildCreatureAppearanceProcessOverride(object);
  const creatureMetadata = cloneSceneCreatureSourceMetadata(object);
  const processPayload: CreatureApiProcessPayload = {
    templateId,
    ...(resRef.length > 0 ? { resref: resRef } : {}),
    ...(creatureMetadata ? { creatureMetadata } : {}),
    ...(creatureAppearanceOverride ? { creatureAppearanceOverride } : {})
  };
  const areaGitCreatureProcessLookupKey = creatureMetadata
    ? buildCreatureProcessPayloadLookupKey(objectId, templateId, processPayload)
    : null;
  const indexKeys = areaGitCreatureProcessLookupKey
    ? [areaGitCreatureProcessLookupKey]
    : creatureAppearanceOverride
    ? dedupeNonEmptyWorkspaceText([
        objectId,
        resRef,
        resRef.length > 0 ? buildCreatureTemplateIdFromResRef(resRef) : null
      ])
    : dedupeNonEmptyWorkspaceText([
        objectId,
        templateId,
        sourceTemplateId,
        resRef,
        resRef.length > 0 ? buildCreatureTemplateIdFromResRef(resRef) : null
      ]);
  return {
    cacheKey: areaGitCreatureProcessLookupKey ?? indexKeys[0] ?? templateId,
    processPayload,
    indexKeys
  };
}

function applyCreatureAnimationSelectionToObject(
  object: SceneObject,
  animationName: string | undefined,
  animationState: number | undefined
): SceneObject {
  if (
    object.kind !== "creatures" ||
    (animationName === undefined && animationState === undefined)
  ) {
    return object;
  }
  const creatureProperties = object.creatureProperties;
  if (!creatureProperties) {
    return object;
  }
  const advancedSettings = creatureProperties.advancedSettings;
  if (!advancedSettings) {
    return object;
  }
  const normalizedAnimationName = animationName?.trim();
  let nextAdvancedSettings = advancedSettings;
  if (normalizedAnimationName !== undefined) {
    nextAdvancedSettings =
      normalizedAnimationName.length > 0
        ? {
            ...nextAdvancedSettings,
            animationName: normalizedAnimationName
          }
        : (() => {
            const { animationName: _animationName, ...rest } = nextAdvancedSettings;
            return rest;
          })();
  }
  if (animationState !== undefined) {
    nextAdvancedSettings = {
      ...nextAdvancedSettings,
      animationState
    };
  }
  return {
    ...object,
    creatureProperties: {
      ...creatureProperties,
      advancedSettings: nextAdvancedSettings
    }
  };
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

function withOptionalAreaPlaceableAbortableTimeout<T>(
  requestFactory: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number,
  label: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return requestFactory();
  }

  return new Promise<T>((resolve, reject) => {
    const abortController = new AbortController();
    const timeoutError = new Error(`${label} timed out after ${Math.floor(timeoutMs)}ms`);
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      abortController.abort();
      reject(timeoutError);
    }, Math.max(1, Math.floor(timeoutMs)));

    requestFactory(abortController.signal).then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        reject(abortController.signal.aborted ? timeoutError : error);
      }
    );
  });
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

function resolveBrowserAudioContextConstructor(): typeof AudioContext | null {
  const audioGlobals = globalThis as typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };
  return (
    typeof audioGlobals.AudioContext !== "undefined"
      ? audioGlobals.AudioContext
      : typeof audioGlobals.webkitAudioContext !== "undefined"
        ? audioGlobals.webkitAudioContext
        : null
  );
}

function primeSoundPlaybackAudioContext(audioContext: AudioContext): void {
  try {
    if (typeof audioContext.resume === "function") {
      void audioContext.resume().catch(() => undefined);
    }
    const createBuffer = (audioContext as Partial<AudioContext>).createBuffer;
    const createBufferSource = (audioContext as Partial<AudioContext>).createBufferSource;
    if (typeof createBuffer !== "function" || typeof createBufferSource !== "function") {
      return;
    }
    const sampleRate = Number.isFinite(audioContext.sampleRate) ? audioContext.sampleRate : 44100;
    const buffer = createBuffer.call(audioContext, 1, 1, sampleRate);
    const source = createBufferSource.call(audioContext);
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start(0);
  } catch {
    // Best-effort user-gesture unlock; the HTMLAudioElement fallback remains available.
  }
}

async function createSoundPlaybackBufferSource(
  blob: Blob,
  audioContext: AudioContext,
  loop: boolean
): Promise<{ source: AudioBufferSourceNode; durationMs: number | null } | null> {
  const createBufferSource = (audioContext as Partial<AudioContext>).createBufferSource;
  if (
    audioContext.state === "closed" ||
    typeof audioContext.decodeAudioData !== "function" ||
    typeof createBufferSource !== "function"
  ) {
    return null;
  }

  try {
    if (typeof audioContext.resume === "function") {
      await audioContext.resume().catch(() => undefined);
    }
    const buffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(buffer.slice(0));
    const source = createBufferSource.call(audioContext);
    source.buffer = decoded;
    source.loop = loop;
    source.connect(audioContext.destination);
    const durationMs = decoded.duration * 1000;
    return {
      source,
      durationMs: Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null
    };
  } catch {
    return null;
  }
}

async function resolveBrowserPreviewDurationMs(blob: Blob): Promise<number | null> {
  const AudioContextConstructor = resolveBrowserAudioContextConstructor();
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

function getSoundStageStatusLabel(playbackState: SoundPlaybackPipelineState): string | null {
  if (playbackState.kind === "processing") {
    return "Processing";
  }
  if (playbackState.kind === "contracts") {
    return "Resolving";
  }
  if (playbackState.kind === "loading_audio") {
    return "Loading";
  }
  if (playbackState.kind === "prepared") {
    return "Ready";
  }
  if (playbackState.kind === "playing") {
    return "Playing";
  }
  if (playbackState.kind === "error") {
    return "Error";
  }
  return null;
}

function SoundsModeAudioStage({
  activeSound,
  loadedSounds,
  playbackState
}: {
  activeSound: SoundApiListItem | null;
  loadedSounds: number;
  playbackState: SoundPlaybackPipelineState;
}) {
  const statusLabel =
    activeSound && playbackState.soundId === activeSound.soundId
      ? getSoundStageStatusLabel(playbackState)
      : null;
  const statusMessage =
    activeSound && playbackState.soundId === activeSound.soundId ? playbackState.message : null;

  return (
    <section
      className="workspace-canvas-layer sounds-mode-audio-stage"
      aria-label="sounds mode audio stage"
    >
      <div className="sounds-mode-audio-mark" aria-hidden="true">
        ♪
      </div>
      <div className="sounds-mode-audio-copy">
        <h2>{activeSound?.resref ?? "Audio"}</h2>
        <p>
          {activeSound
            ? `${activeSound.category} / ${activeSound.format} / ${activeSound.source.layer}`
            : `${loadedSounds} loaded`}
        </p>
        {statusLabel ? <p className="sounds-mode-audio-status">{statusLabel}</p> : null}
        {statusMessage ? <p className="sounds-mode-audio-message">{statusMessage}</p> : null}
      </div>
    </section>
  );
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

export function WorkspaceLayout({
  role,
  userId,
  workspaceChromeFacade,
  sceneViewportPort,
  areaApiPort,
  tileApiPort,
  placeableApiPort,
  creatureApiPort,
  encounterApiPort,
  itemApiPort,
  soundApiPort,
  storeApiPort,
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
  viewportFullscreen = false,
  onExitViewportFullscreen,
  onBackendSessionInvalidated
}: WorkspaceLayoutProps) {
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
  const [pendingItemWizardPlacementTemplate, setPendingItemWizardPlacementTemplate] =
    useState<SceneObject | null>(null);
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
  const [creaturesCatalogItems, setCreaturesCatalogItems] = useState<CreatureApiListItem[]>([]);
  const [creaturesCatalogTotal, setCreaturesCatalogTotal] = useState(0);
  const [creaturesCatalogStatus, setCreaturesCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [creaturesCatalogError, setCreaturesCatalogError] = useState<string | null>(null);
  const [creaturesPreviewError, setCreaturesPreviewError] = useState<string | null>(null);
  const [customCreatureTemplateObjects, setCustomCreatureTemplateObjects] = useState<
    SceneObject[]
  >(() =>
    loadPersistedCustomCreatureTemplateObjects(
      typeof window !== "undefined" ? window.localStorage : null
    )
  );
  const [creatureResourceOptions, setCreatureResourceOptions] = useState<
    Partial<Record<CreatureApiResourceOptionKind, CreatureApiResourceOption[]>>
  >({});
  const [creatureAnimationSelectionsByObjectId, setCreatureAnimationSelectionsByObjectId] =
    useState<Record<string, string>>({});
  const [creatureAnimationStatesByObjectId, setCreatureAnimationStatesByObjectId] =
    useState<Record<string, number>>({});
  const [encountersCatalogItems, setEncountersCatalogItems] = useState<EncounterApiListItem[]>([]);
  const [itemsCatalogItems, setItemsCatalogItems] = useState<ItemApiListItem[]>([]);
  const [itemsCatalogTotal, setItemsCatalogTotal] = useState(0);
  const [itemsCatalogStatus, setItemsCatalogStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [itemsCatalogError, setItemsCatalogError] = useState<string | null>(null);
  const [storesCatalogItems, setStoresCatalogItems] = useState<StoreApiListItem[]>([]);
  const [itemsPropertyDictionary, setItemsPropertyDictionary] = useState<
    ItemApiPropertyDictionaryEntry[]
  >([]);
  const [itemsBaseItems, setItemsBaseItems] = useState<ItemApiBaseItemEntry[]>([]);
  const [itemsPaletteTree, setItemsPaletteTree] = useState<ItemApiPaletteTreeResult | null>(
    null
  );
  const [itemsGeneratorSupport, setItemsGeneratorSupport] =
    useState<ItemApiGeneratorSupportResult | null>(null);
  const [customItemTemplateObjects, setCustomItemTemplateObjects] = useState<SceneObject[]>(() =>
    loadPersistedCustomItemTemplateObjects(
      typeof window !== "undefined" ? window.localStorage : null
    )
  );
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
  const [activeCreaturePreviewObjectId, setActiveCreaturePreviewObjectId] = useState<
    string | null
  >(null);
  const [creaturesSearchQuery, setCreaturesSearchQuery] = useState("");
  const [activeItemPreviewObjectId, setActiveItemPreviewObjectId] = useState<string | null>(
    null
  );
  const [processedItemPreviewObjectsById, setProcessedItemPreviewObjectsById] = useState<
    Record<string, SceneObject>
  >({});
  const [itemPreviewThumbnailUrlsById, setItemPreviewThumbnailUrlsById] = useState<
    Record<string, string>
  >({});
  const [itemsCreatorStatus, setItemsCreatorStatus] = useState<"idle" | "applying">("idle");
  const [itemsPreviewStatus, setItemsPreviewStatus] = useState<"idle" | "applying">("idle");
  const itemsPreviewProcessRequestRef = useRef(0);
  const [itemsCreatorError, setItemsCreatorError] = useState<string | null>(null);
  const [itemsSearchQuery, setItemsSearchQuery] = useState(() =>
    loadInitialItemsSearchQuery(window.location.search)
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
  const [selectedAreaTileId, setSelectedAreaTileId] = useState<string | null>(null);
  const [selectedAreaTileIds, setSelectedAreaTileIds] = useState<string[]>([]);
  const [areaEditingTool, setAreaEditingTool] = useState<AuroraAreaEditingTool>(
    DEFAULT_AURORA_AREA_EDITING_TOOL
  );
  const areaEditorMutationRevisionRef = useRef(0);
  const [areaEditorMutationSignal, setAreaEditorMutationSignal] =
    useState<WorkspaceAreaEditorMutationSignal | null>(null);
  const handleAreaSceneDraftChange = useCallback((scene: AreaScene) => {
    setAreaSceneSeed(scene);
  }, []);
  const handleAreaSceneMutation = useCallback((
    scene: AreaScene,
    selectedTileId?: string | null,
    selectedTileIds?: string[]
  ) => {
    areaEditorMutationRevisionRef.current += 1;
    setAreaEditorMutationSignal({
      revision: areaEditorMutationRevisionRef.current,
      scene,
      selectedTileId,
      selectedTileIds
    });
  }, []);
  const handleSelectedAreaTileChange = useCallback((
    tileId: string | null,
    tileIds: readonly string[]
  ) => {
    setSelectedAreaTileId((current) => current === tileId ? current : tileId);
    setSelectedAreaTileIds((current) =>
      current.length === tileIds.length &&
      current.every((id, index) => id === tileIds[index])
        ? current
        : [...tileIds]
    );
  }, []);
  const [areaCanvasLoading, setAreaCanvasLoading] =
    useState<WorkspaceAreaCanvasLoadingState | null>(null);
  const [isAreasModeAddPlaceablesStepActive, setIsAreasModeAddPlaceablesStepActive] =
    useState(false);
  const [
    areaPlaceableRenderPayloadQueueSnapshot,
    setAreaPlaceableRenderPayloadQueueSnapshot
  ] = useState<AreaPlaceableRenderPayloadQueueSnapshot | null>(null);
  const [areaTileProcessReadiness, setAreaTileProcessReadiness] =
    useState<AreaTileProcessContractReadiness | null>(null);
  const [areaTileProcessReadinessSceneKey, setAreaTileProcessReadinessSceneKey] =
    useState<string | null>(null);
  const [areaTileProcessRequestPhase, setAreaTileProcessRequestPhase] = useState<
    "idle" | "loading" | "ready" | "failed"
  >("idle");
  const currentAreaTileProcessSceneKey = areaSceneSeed
    ? buildAreaTileProcessContractSceneKey(
        areaSceneSeed.sceneId,
        areaSceneSeed.tiles.map((tile) => tile.modelResRef)
      )
    : null;
  const currentAreaTileProcessReadiness = scopeAreaTileProcessReadinessToScene(
    areaTileProcessReadiness,
    areaTileProcessReadinessSceneKey,
    currentAreaTileProcessSceneKey
  );
  const acceptedAreaTileProcessSceneKeyRef = useRef<string | null>(null);
  const inFlightAreaTileProcessRequestRef = useRef<{
    sceneKey: string;
    revision: number;
  } | null>(null);
  const areaTileProcessRequestRevisionRef = useRef(0);
  const areaTileProcessReadinessRef = useRef<AreaTileProcessContractReadiness | null>(
    areaTileProcessReadiness
  );
  areaTileProcessReadinessRef.current = areaTileProcessReadiness;
  const [placeablesModeSceneSeed, setPlaceablesModeSceneSeed] = useState<AreaScene | null>(null);
  const [creaturesModeSceneSeed, setCreaturesModeSceneSeed] = useState<AreaScene | null>(null);
  const [itemsModeSceneSeed, setItemsModeSceneSeed] = useState<AreaScene | null>(null);
  const areaListClientCacheRef = useRef<AreaListClientCacheEntry | null>(null);
  const placeablesCatalogClientCacheRef = useRef<PlaceablesCatalogClientCacheEntry | null>(null);
  const creaturesCatalogClientCacheRef = useRef<CreaturesCatalogClientCacheEntry | null>(null);
  const encountersCatalogClientCacheRef = useRef<EncountersCatalogClientCacheEntry | null>(null);
  const itemsCatalogClientCacheRef = useRef<ItemsCatalogClientCacheEntry | null>(null);
  const storesCatalogClientCacheRef = useRef<StoresCatalogClientCacheEntry | null>(null);
  const soundsCatalogClientCacheRef = useRef<SoundsCatalogClientCacheEntry | null>(null);
  const soundPlaybackAudioRef = useRef<{
    soundId: string;
    audio: HTMLAudioElement | null;
    objectUrl: string | null;
    cacheHit: boolean;
    webAudioSource: AudioBufferSourceNode | null;
  } | null>(null);
  const soundPlaybackAudioContextRef = useRef<AudioContext | null>(null);
  const soundPlaybackRequestRevisionRef = useRef(0);
  const placeableRenderPayloadCacheRef = useRef<Map<string, PlaceableViewportRenderPayload>>(
    new Map()
  );
  const placeableRenderPayloadPendingRef = useRef<
    Map<string, Promise<PlaceableViewportRenderPayload | null>>
  >(new Map());
  const creatureRenderPayloadCacheRef = useRef<Map<string, CreatureViewportRenderPayload>>(
    new Map()
  );
  const creatureRenderPayloadPendingRef = useRef<
    Map<string, Promise<CreatureViewportRenderPayload | null>>
  >(new Map());
  const creatureRenderPayloadFailedKeysRef = useRef<Set<string>>(new Set());
  const placeableRenderPayloadPublishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placeableRenderPayloadPublishQueuedRef = useRef(false);
  const isMountedRef = useRef(true);
  const areaPlaceableRenderPayloadQueueActiveSignatureRef = useRef<string | null>(null);
  const areaPlaceableRenderPayloadQueueActivePromiseRef = useRef<Promise<void> | null>(null);
  const [placeableRenderPayloadByTemplateId, setPlaceableRenderPayloadByTemplateId] = useState<
    Record<string, PlaceableViewportRenderPayload>
  >({});
  const placeableRenderPayloadByTemplateIdRef = useRef<Record<string, PlaceableViewportRenderPayload>>(
    {}
  );
  const [creatureRenderPayloadByLookupKey, setCreatureRenderPayloadByLookupKey] = useState<
    Record<string, CreatureViewportRenderPayload>
  >({});
  const sidebarSignalRevisionRef = useRef(0);
  const rawLeftPanelWidthPx = leftCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const rawRightPanelWidthPx = rightCollapsed
    ? SIDEBAR_COLLAPSED_WIDTH_PX
    : SIDEBAR_EXPANDED_WIDTH_PX;
  const leftPanelWidthPx = viewportFullscreen ? 0 : rawLeftPanelWidthPx;
  const rightPanelWidthPx = viewportFullscreen ? 0 : rawRightPanelWidthPx;

  useEffect(() => {
    if (!viewportFullscreen || !onExitViewportFullscreen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onExitViewportFullscreen();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onExitViewportFullscreen, viewportFullscreen]);

  const isBuilder = role === "builder";
  const shouldRenderSceneObjectsPanel = isBuilder && activeBuilderMode.showSceneObjectListPanel;
  const shouldRenderSceneObjectAddPanel = isBuilder && activeBuilderMode.showSceneObjectAddPanel;
  const shouldRenderAreaSelectionPanel =
    isBuilder && activeBuilderMode.showAreaSelectionPanel;
  const isPlaceablesMode = isBuilder && activeBuilderMode.id === "placeables_mode";
  const isCreaturesMode = isBuilder && activeBuilderMode.id === "creatures_mode";
  const isItemsMode = isBuilder && activeBuilderMode.id === "items_mode";
  const isSoundsMode = isBuilder && activeBuilderMode.id === "sounds_mode";
  const areaRuntimeCaptureTerrainOnlyObjectPayloadSkip =
    isAreasRuntimeCaptureTerrainOnlyObjectPayloadSkipEnabled();
  const isFocusedPreviewMode = isPlaceablesMode || isCreaturesMode || isItemsMode;
  const shouldLoadPlaceablesCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    !isCreaturesMode &&
    !isItemsMode &&
    !isSoundsMode &&
    (isPlaceablesMode || isAreasModeAddPlaceablesStepActive) &&
    activeBuilderMode.allowedCatalogTypes.includes("placeables");
  useEffect(() => {
    if (isPlaceablesMode || isCreaturesMode || isItemsMode || isSoundsMode) {
      setIsAreasModeAddPlaceablesStepActive(false);
    }
  }, [isCreaturesMode, isItemsMode, isPlaceablesMode, isSoundsMode]);
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
    persistCustomCreatureTemplateObjects(
      customCreatureTemplateObjects,
      typeof window !== "undefined" ? window.localStorage : null
    );
  }, [customCreatureTemplateObjects]);
  useEffect(() => {
    if (
      areaRuntimeCaptureTerrainOnlyObjectPayloadSkip ||
      !creatureApiPort?.listCreatureResourceOptions ||
      !backendAccessToken
    ) {
      setCreatureResourceOptions({});
      return;
    }
    let cancelled = false;
    const kinds: CreatureApiResourceOptionKind[] = [
      "conversation",
      "portrait",
      "script",
      "soundset"
    ];
    void Promise.all(
      kinds.map((kind) => creatureApiPort.listCreatureResourceOptions(backendAccessToken, kind))
    )
      .then((results) => {
        if (cancelled) {
          return;
        }
        setCreatureResourceOptions(
          Object.fromEntries(results.map((result) => [result.kind, result.items])) as Partial<
            Record<CreatureApiResourceOptionKind, CreatureApiResourceOption[]>
          >
        );
      })
      .catch(() => {
        if (!cancelled) {
          setCreatureResourceOptions({});
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    areaRuntimeCaptureTerrainOnlyObjectPayloadSkip,
    backendAccessToken,
    creatureApiPort
  ]);
  useEffect(() => {
    persistCustomItemTemplateObjects(
      customItemTemplateObjects,
      typeof window !== "undefined" ? window.localStorage : null
    );
  }, [customItemTemplateObjects]);
  useEffect(() => {
    setCustomItemTemplateObjects((current) => {
      const pruned = pruneCustomItemTemplatesBackedByCatalog(current, itemsCatalogItems);
      return pruned.length === current.length ? current : pruned;
    });
  }, [itemsCatalogItems]);
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
    const sceneForTileContracts = areaSceneSeed;
    const modelResRefs = sceneForTileContracts?.tiles.map((tile) => tile.modelResRef) ?? [];
    const sceneContractKey = currentAreaTileProcessSceneKey;
    if (
      isPlaceablesMode ||
      isCreaturesMode ||
      isItemsMode ||
      isSoundsMode ||
      !sceneForTileContracts ||
      !backendAccessToken ||
      !tileApiPort
    ) {
      return;
    }
    if (!sceneContractKey) {
      return;
    }
    if (
      !shouldRequestAreaTileProcessReadiness({
        currentSceneKey: sceneContractKey,
        acceptedSceneKey: acceptedAreaTileProcessSceneKeyRef.current,
        inFlightSceneKey:
          inFlightAreaTileProcessRequestRef.current?.sceneKey ?? null,
        hasReadiness: areaTileProcessReadinessRef.current !== null
      })
    ) {
      return;
    }

    let cancelled = false;
    const requestRevision = areaTileProcessRequestRevisionRef.current + 1;
    areaTileProcessRequestRevisionRef.current = requestRevision;
    inFlightAreaTileProcessRequestRef.current = {
      sceneKey: sceneContractKey,
      revision: requestRevision
    };
    acceptedAreaTileProcessSceneKeyRef.current = null;
    setAreaTileProcessRequestPhase("loading");
    setAreaTileProcessReadiness(null);
    const loadingLabel = `Restoring terrain for ${sceneForTileContracts.areaName ?? sceneForTileContracts.sceneId}`;
    setAreaCanvasLoading({
      source: "terrain",
      label: loadingLabel,
      completed: 0,
      total:
        sceneForTileContracts.tiles.length > 0
          ? sceneForTileContracts.tiles.length
          : null
    });

    void resolveAreaTileProcessContractReadinessForModelResRefs(
      tileApiPort,
      backendAccessToken,
      sceneForTileContracts.sceneId,
      modelResRefs,
      { bypassCache: false }
    )
      .then((readiness) => {
        if (!cancelled) {
          acceptedAreaTileProcessSceneKeyRef.current = sceneContractKey;
          setAreaTileProcessReadiness(readiness);
          setAreaTileProcessReadinessSceneKey(sceneContractKey);
          setAreaTileProcessRequestPhase("ready");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setAreaTileProcessRequestPhase("failed");
          trackTelemetryEvent("ui.workspace.areas.restore_tile_process_readiness_failed", {
            userId,
            areaId: sceneForTileContracts.sceneId,
            message:
              error instanceof Error && error.message.trim().length > 0
                ? error.message
                : "unknown_error"
          });
        }
      })
      .finally(() => {
        if (isCurrentAreaTileProcessRequest(
          inFlightAreaTileProcessRequestRef.current,
          sceneContractKey,
          requestRevision
        )) {
          inFlightAreaTileProcessRequestRef.current = null;
        }
        if (!cancelled) {
          setAreaCanvasLoading((current) =>
            current?.label === loadingLabel ? null : current
          );
        }
      });

    return () => {
      cancelled = true;
      if (isCurrentAreaTileProcessRequest(
        inFlightAreaTileProcessRequestRef.current,
        sceneContractKey,
        requestRevision
      )) {
        inFlightAreaTileProcessRequestRef.current = null;
      }
    };
  }, [
    backendAccessToken,
    currentAreaTileProcessSceneKey,
    isCreaturesMode,
    isItemsMode,
    isPlaceablesMode,
    isSoundsMode,
    tileApiPort,
    trackTelemetryEvent,
    userId
  ]);
  const shouldLoadBackendSoundsCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    activeBuilderMode.allowedCatalogTypes.includes("sounds");
  const shouldLoadBackendCreaturesCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    !isPlaceablesMode &&
    !isItemsMode &&
    !isSoundsMode &&
    activeBuilderMode.allowedCatalogTypes.includes("creatures");
  const shouldLoadBackendEncountersCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    !isPlaceablesMode &&
    !isCreaturesMode &&
    !isItemsMode &&
    !isSoundsMode &&
    activeBuilderMode.allowedCatalogTypes.includes("encounters");
  const shouldLoadBackendItemsCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    activeBuilderMode.allowedCatalogTypes.includes("items") &&
    (isItemsMode ||
      (!isPlaceablesMode && !isCreaturesMode && !isSoundsMode && shouldRenderSceneObjectAddPanel));
  const shouldLoadBackendStoresCatalog =
    isBuilder &&
    !areaRuntimeCaptureTerrainOnlyObjectPayloadSkip &&
    !isPlaceablesMode &&
    !isCreaturesMode &&
    !isSoundsMode &&
    (isItemsMode || activeBuilderMode.allowedCatalogTypes.includes("stores"));
  const storesCatalogTelemetrySource = isItemsMode ? "items_mode" : "areas_mode";
  const backendSoundTemplateObjects = useMemo(
    () =>
      soundsCatalogItems.map((sound, index) =>
        mapSoundApiListItemToSceneObject(sound, index + 1)
      ),
    [soundsCatalogItems]
  );
  const backendCreatureTemplateObjects = useMemo(
    () =>
      creaturesCatalogItems.map((creature, index) =>
        mapCreatureApiListItemToSceneObject(creature, index + 1)
      ),
    [creaturesCatalogItems]
  );
  const backendItemTemplateObjects = useMemo(
    () =>
      itemsCatalogItems
        .map((item, index) => mapItemApiListItemToSceneObject(item, index + 1))
        .sort(compareItemSceneObjectsByAuroraStorePanel),
    [itemsCatalogItems]
  );
  const backendItemBaseTemplateObjects = useMemo(
    () =>
      itemsBaseItems
        .map((baseItem, index) => mapItemApiBaseItemToSceneObject(baseItem, index + 1))
        .sort(compareItemSceneObjectsByAuroraStorePanel),
    [itemsBaseItems]
  );
  const itemCreationBaseObjects = useMemo(
    () => [...backendItemBaseTemplateObjects, ...backendItemTemplateObjects],
    [backendItemBaseTemplateObjects, backendItemTemplateObjects]
  );
  const creatureTemplateObjects = useMemo(
    () =>
      [...customCreatureTemplateObjects, ...backendCreatureTemplateObjects].map((object) =>
        applyCreatureAnimationSelectionToObject(
          object,
          creatureAnimationSelectionsByObjectId[object.id],
          creatureAnimationStatesByObjectId[object.id]
        )
      ),
    [
      backendCreatureTemplateObjects,
      creatureAnimationSelectionsByObjectId,
      creatureAnimationStatesByObjectId,
      customCreatureTemplateObjects
    ]
  );
  const backendEncounterTemplateObjects = useMemo(
    () =>
      encountersCatalogItems.map((encounter, index) =>
        mapEncounterApiListItemToSceneObject(encounter, index + 1)
      ),
    [encountersCatalogItems]
  );
  const backendStoreTemplateObjects = useMemo(
    () =>
      storesCatalogItems.map((store, index) =>
        mapStoreApiListItemToSceneObject(store, index + 1)
      ),
    [storesCatalogItems]
  );
  const backendPlaceableTemplateObjects = useMemo(
    () => placeablesCatalogObjects,
    [placeablesCatalogObjects]
  );
  const areaModeAddPanelObjects = useMemo(
    () =>
      !isPlaceablesMode && !isCreaturesMode && !isItemsMode && !isSoundsMode
        ? [
            ...backendPlaceableTemplateObjects,
            ...creatureTemplateObjects,
            ...customItemTemplateObjects,
            ...backendItemTemplateObjects,
            ...backendEncounterTemplateObjects,
            ...modeScopedObjects,
            ...backendStoreTemplateObjects,
            ...backendSoundTemplateObjects
          ]
        : modeScopedObjects,
    [
      backendEncounterTemplateObjects,
      backendItemTemplateObjects,
      backendPlaceableTemplateObjects,
      backendSoundTemplateObjects,
      backendStoreTemplateObjects,
      creatureTemplateObjects,
      customItemTemplateObjects,
      isCreaturesMode,
      isItemsMode,
      isPlaceablesMode,
      isSoundsMode,
      modeScopedObjects
    ]
  );
  const viewportToolbarState = useMemo(
    () => {
      if (isPlaceablesMode) {
        return resolvePlaceablesPreviewToolbarState(toolbarState);
      }
      if (isCreaturesMode) {
        return resolveCreaturesPreviewToolbarState(toolbarState);
      }
      if (isItemsMode) {
        return resolveItemsPreviewToolbarState(toolbarState);
      }
      return toolbarState;
    },
    [isCreaturesMode, isItemsMode, isPlaceablesMode, toolbarState]
  );
  const viewportWorkspaceOptions = isFocusedPreviewMode
    ? PLACEABLES_PREVIEW_WORKSPACE_OPTIONS
    : workspaceOptions;
  const placeablesModeObjects = useMemo(() => placeablesCatalogObjects, [placeablesCatalogObjects]);
  const filteredPlaceablesModeObjects = useMemo(
    () => filterPlaceablesByQuery(placeablesModeObjects, placeablesSearchQuery),
    [placeablesModeObjects, placeablesSearchQuery]
  );
  const creaturesModeObjects = useMemo(
    () => creatureTemplateObjects,
    [creatureTemplateObjects]
  );
  const filteredCreaturesModeObjects = useMemo(
    () => filterPlaceablesByQuery(creaturesModeObjects, creaturesSearchQuery),
    [creaturesModeObjects, creaturesSearchQuery]
  );
  const itemsModeObjects = useMemo(
    () => [...customItemTemplateObjects, ...backendItemTemplateObjects],
    [backendItemTemplateObjects, customItemTemplateObjects]
  );
  const filteredItemsModeObjects = useMemo(
    () => filterPlaceablesByQuery(itemsModeObjects, itemsSearchQuery),
    [itemsModeObjects, itemsSearchQuery]
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
  const activeCreaturePreviewObject = useMemo(() => {
    if (!isCreaturesMode || !activeCreaturePreviewObjectId) {
      return null;
    }
    return (
      creaturesModeObjects.find((object) => object.id === activeCreaturePreviewObjectId) ??
      null
    );
  }, [activeCreaturePreviewObjectId, creaturesModeObjects, isCreaturesMode]);
  const activeItemCatalogObject = useMemo(() => {
    if (!isItemsMode || !activeItemPreviewObjectId) {
      return null;
    }
    return itemsModeObjects.find((object) => object.id === activeItemPreviewObjectId) ?? null;
  }, [activeItemPreviewObjectId, isItemsMode, itemsModeObjects]);
  const activeItemPreviewObject = useMemo(() => {
    if (!activeItemCatalogObject || !activeItemPreviewObjectId) {
      return null;
    }
    return processedItemPreviewObjectsById[activeItemPreviewObjectId] ?? activeItemCatalogObject;
  }, [
    activeItemCatalogObject,
    activeItemPreviewObjectId,
    processedItemPreviewObjectsById
  ]);
  const activeItemCatalogObjectProcessKey = activeItemCatalogObject
    ? [
        activeItemCatalogObject.id,
        activeItemCatalogObject.resRef,
        activeItemCatalogObject.source?.templateId ?? ""
      ].join("|")
    : null;
  const processItemsModePreviewObject = useCallback(
    async (
      sourceObject: SceneObject,
      itemVisualOverride?: ItemApiVisualOverride,
      bypassCache = false
    ): Promise<SceneObject> => {
      if (!itemApiPort || !backendAccessToken) {
        return sourceObject;
      }
      const isWizardCreatedItem = isItemCreationWizardSceneObject(sourceObject);
      const isModuleBackedWizardItem =
        isWizardCreatedItem &&
        sourceObject.source?.sourceFileType === "UTI " &&
        Boolean(sourceObject.source?.templateId);
      const processingResRef = (
        isWizardCreatedItem && !isModuleBackedWizardItem
          ? sourceObject.source?.sourceModelResRef ?? sourceObject.resRef
          : sourceObject.resRef
      ).trim();
      const resolvedVisualOverride =
        itemVisualOverride ??
        (isWizardCreatedItem && !isModuleBackedWizardItem
          ? buildItemVisualOverrideFromSceneObjectItem(sourceObject)
          : undefined);
      const processResult = await itemApiPort.processItem(backendAccessToken, {
        templateId: sourceObject.source?.templateId ?? sourceObject.id,
        ...(processingResRef.length > 0 ? { resref: processingResRef } : {}),
        ...(resolvedVisualOverride ? { itemVisualOverride: resolvedVisualOverride } : {}),
        bypassCache,
        includeBenchmarkMetadata: true
      });
      const processedObject = applyItemApiProcessResultToSceneObject(sourceObject, processResult);
      return isWizardCreatedItem
        ? mergeProcessedItemWizardSceneObject(sourceObject, processedObject)
        : processedObject;
    },
    [backendAccessToken, itemApiPort]
  );

  useEffect(() => {
    if (!isItemsMode || !activeItemPreviewObjectId || !itemsModeSceneSeed) {
      return;
    }

    let cancelled = false;
    const host = document.querySelector<HTMLElement>('[aria-label="workspace render canvas"]');
    if (!host) {
      return;
    }
    type ItemVisualSnapshot = {
      imageDataUrl?: string;
      canvas?: { width?: number; height?: number };
      objects?: Array<{
        objectId?: string;
        kind?: string;
        screenBounds?: {
          minX?: number;
          minY?: number;
          maxX?: number;
          maxY?: number;
          width?: number;
          height?: number;
        };
      }>;
    };
    const cropSnapshotToItem = async (snapshot: ItemVisualSnapshot): Promise<string | null> => {
      const imageDataUrl = snapshot.imageDataUrl ?? "";
      if (!imageDataUrl.startsWith("data:image/png")) {
        return null;
      }
      const itemSnapshot =
        snapshot.objects?.find((entry) => entry.objectId === activeItemPreviewObjectId) ??
        snapshot.objects?.find((entry) => entry.kind === "items") ??
        null;
      const bounds = itemSnapshot?.screenBounds;
      const sourceWidth = Math.max(1, Math.floor(snapshot.canvas?.width ?? 0));
      const sourceHeight = Math.max(1, Math.floor(snapshot.canvas?.height ?? 0));
      if (!bounds || sourceWidth < 1 || sourceHeight < 1) {
        return null;
      }
      const minX = Number(bounds.minX);
      const minY = Number(bounds.minY);
      const width = Number(bounds.width);
      const height = Number(bounds.height);
      if (
        !Number.isFinite(minX) ||
        !Number.isFinite(minY) ||
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width < 4 ||
        height < 4
      ) {
        return null;
      }
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error("item-preview-image-load-failed"));
        nextImage.src = imageDataUrl;
      });
      if (cancelled) {
        return null;
      }
      const outputSize = 256;
      const padding = Math.max(18, Math.max(width, height) * 0.12);
      const cropCenterX = minX + width / 2;
      const cropCenterY = minY + height / 2;
      const cropSize = Math.min(
        Math.max(width, height) + padding * 2,
        Math.max(sourceWidth, sourceHeight)
      );
      const sx = Math.max(0, Math.min(sourceWidth - cropSize, cropCenterX - cropSize / 2));
      const sy = Math.max(0, Math.min(sourceHeight - cropSize, cropCenterY - cropSize / 2));
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        return null;
      }
      context.fillStyle = "#071426";
      context.fillRect(0, 0, outputSize, outputSize);
      context.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);
      const pixels = context.getImageData(0, 0, outputSize, outputSize).data;
      let visiblePixelCount = 0;
      for (let index = 0; index < pixels.length; index += 4) {
        const alpha = pixels[index + 3] ?? 0;
        const brightness =
          (pixels[index] ?? 0) + (pixels[index + 1] ?? 0) + (pixels[index + 2] ?? 0);
        if (alpha > 8 && brightness > 36) {
          visiblePixelCount += 1;
        }
      }
      return visiblePixelCount > 24 ? canvas.toDataURL("image/png") : null;
    };
    const handleSnapshot = (event: Event) => {
      const snapshot = (event as CustomEvent<ItemVisualSnapshot>).detail;
      void cropSnapshotToItem(snapshot)
        .then((dataUrl) => {
          if (!dataUrl || cancelled) {
            return;
          }
          setItemPreviewThumbnailUrlsById((current) =>
            current[activeItemPreviewObjectId] === dataUrl
              ? current
              : {
                  ...current,
                  [activeItemPreviewObjectId]: dataUrl
                }
          );
        })
        .catch(() => {
          // Keep the direct model thumbnail when a proof snapshot cannot be cropped.
        });
    };
    host.addEventListener("aurora:items:visual-proof-snapshot", handleSnapshot);
    const captureDelaysMs = [350, 900, 1550, 2400];
    const timeouts = captureDelaysMs.map((delayMs) =>
      window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        host.dispatchEvent(
          new CustomEvent("aurora:items:visual-proof-request", {
            detail: { label: `items-mode-thumbnail:${activeItemPreviewObjectId}:${delayMs}` }
          })
        );
      }, delayMs)
    );

    return () => {
      cancelled = true;
      host.removeEventListener("aurora:items:visual-proof-snapshot", handleSnapshot);
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
    };
  }, [activeItemPreviewObjectId, isItemsMode, itemsModeSceneSeed]);

  const placeablesModeRenderObjectId = placeablesModeSceneSeed?.objects[0]?.id;
  const creaturesModeRenderObjectId = creaturesModeSceneSeed?.objects[0]?.id;
  const itemsModeRenderObjectId = itemsModeSceneSeed?.objects[0]?.id;
  const renderObjectIds = useMemo(
    () =>
      isPlaceablesMode
        ? [placeablesModeRenderObjectId ?? "__placeables_mode_render_none__"]
        : isCreaturesMode
          ? [creaturesModeRenderObjectId ?? "__creatures_mode_render_none__"]
          : isItemsMode
            ? [itemsModeRenderObjectId ?? "__items_mode_render_none__"]
            : null,
    [
      creaturesModeRenderObjectId,
      isCreaturesMode,
      isItemsMode,
      isPlaceablesMode,
      itemsModeRenderObjectId,
      placeablesModeRenderObjectId
    ]
  );
  const externalSceneSeed = isPlaceablesMode
    ? (placeablesModeSceneSeed ?? focusedModeResetScene)
    : isCreaturesMode
      ? (creaturesModeSceneSeed ?? focusedModeResetScene)
      : isItemsMode
        ? (itemsModeSceneSeed ?? focusedModeResetScene)
    : isSoundsMode
      ? focusedModeResetScene
      : (areaSceneSeed ?? defaultAreasSceneSeed);
  const externalSceneSeedKey = [
    activeBuilderModeId,
    externalSceneSeed.sceneId
  ].join(":");
  const areasModePlaceableProcessObjects = useMemo(
    () =>
      !isPlaceablesMode
      && !isCreaturesMode
      && !isItemsMode
      && !isSoundsMode
        ? (areaSceneSeed?.objects ?? sceneObjectsSnapshot).filter(
            (object) => isSharedPlaceablesRendererSceneObject(object)
          )
        : [],
    [
      areaSceneSeed?.objects,
      isCreaturesMode,
      isItemsMode,
      isPlaceablesMode,
      isSoundsMode,
      sceneObjectsSnapshot
    ]
  );
  const areasModeCreatureProcessObjects = useMemo(
    () =>
      !isPlaceablesMode && !isCreaturesMode && !isItemsMode && !isSoundsMode
        ? (areaSceneSeed?.objects ?? sceneObjectsSnapshot).filter(
            (object) => object.kind === "creatures"
          )
        : [],
    [
      areaSceneSeed?.objects,
      isCreaturesMode,
      isItemsMode,
      isPlaceablesMode,
      isSoundsMode,
      sceneObjectsSnapshot
    ]
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
  const creaturesModePreviewObject = creaturesModeSceneSeed?.objects[0] ?? null;
  const activeCreatureRenderPayload = useMemo(() => {
    if (!isCreaturesMode || !activeCreaturePreviewObjectId) {
      return null;
    }
    const payloadLookupObject = activeCreaturePreviewObject ?? creaturesModePreviewObject;
    if (!payloadLookupObject) {
      return null;
    }
    const lookup = resolveCreatureRenderPayloadLookup(payloadLookupObject);
    return (
      lookup.indexKeys
        .map((key) => creatureRenderPayloadByLookupKey[key])
        .find((entry): entry is CreatureViewportRenderPayload => Boolean(entry)) ??
      lookup.indexKeys
        .map((key) => creatureRenderPayloadCacheRef.current.get(key))
        .find((entry): entry is CreatureViewportRenderPayload => Boolean(entry)) ??
      null
    );
  }, [
    activeCreaturePreviewObject,
    activeCreaturePreviewObjectId,
    creatureRenderPayloadByLookupKey,
    creaturesModePreviewObject,
    isCreaturesMode
  ]);
  const activeCreaturesInspectorObject =
    activeCreaturePreviewObject ?? creaturesModePreviewObject;
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
  const creatureRenderPayloadByObjectId = useMemo(() => {
    if (isCreaturesMode) {
      if (!activeCreatureRenderPayload) {
        return null;
      }
      const previewObjectId = creaturesModeSceneSeed?.objects[0]?.id;
      if (!previewObjectId) {
        return null;
      }
      return {
        [previewObjectId]: activeCreatureRenderPayload
      };
    }

    if (areasModeCreatureProcessObjects.length < 1) {
      return null;
    }
    const payloadByObjectId: Record<string, CreatureViewportRenderPayload> = {};
    areasModeCreatureProcessObjects.forEach((object) => {
      const lookup = resolveCreatureRenderPayloadLookup(object);
      const payload =
        lookup.indexKeys
          .map((key) => creatureRenderPayloadByLookupKey[key])
          .find((entry): entry is CreatureViewportRenderPayload => Boolean(entry)) ??
        lookup.indexKeys
          .map((key) => creatureRenderPayloadCacheRef.current.get(key))
          .find((entry): entry is CreatureViewportRenderPayload => Boolean(entry));
      if (payload) {
        payloadByObjectId[object.id] = payload;
      }
    });
    return Object.keys(payloadByObjectId).length > 0 ? payloadByObjectId : null;
  }, [
    activeCreatureRenderPayload,
    areasModeCreatureProcessObjects,
    creatureRenderPayloadByLookupKey,
    creaturesModeSceneSeed,
    isCreaturesMode
  ]);
  const isAreaPlaceableRenderPayloadQueueSettled =
    areaPlaceableRenderPayloadQueueSnapshot?.status === "ready" ||
    areaPlaceableRenderPayloadQueueSnapshot?.status === "blocked";
  const isAreaPlaceablePlaceholderQueueSettled =
    areaPlaceableRenderPayloadQueueSnapshot?.placeholderStatus === "ready" ||
    areaPlaceableRenderPayloadQueueSnapshot?.placeholderStatus === "blocked";
  const areaThumbnailRenderEnabled =
    areasModePlaceableProcessObjects.length < 1 ||
    (areaCanvasLoading === null &&
      isAreaPlaceableRenderPayloadQueueSettled &&
      isAreaPlaceablePlaceholderQueueSettled);
  const placeablesModeThumbnailRenderEnabled = placeablesCatalogStatus === "ready";
  const creaturesModeThumbnailRenderEnabled = creaturesCatalogStatus === "ready";

  const stopSoundPlayback = useCallback(() => {
    const current = soundPlaybackAudioRef.current;
    if (!current) {
      return;
    }
    if (current.webAudioSource) {
      current.webAudioSource.onended = null;
      try {
        current.webAudioSource.stop();
      } catch {
        // Source may already have ended.
      }
      current.webAudioSource.disconnect();
    }
    if (current.audio) {
      current.audio.pause();
      current.audio.removeAttribute("src");
      current.audio.load();
    }
    if (current.objectUrl && typeof URL.revokeObjectURL === "function") {
      URL.revokeObjectURL(current.objectUrl);
    }
    soundPlaybackAudioRef.current = null;
  }, []);

  const unlockSoundPlaybackAudioContext = useCallback((): AudioContext | null => {
    const existing = soundPlaybackAudioContextRef.current;
    if (existing && existing.state !== "closed") {
      primeSoundPlaybackAudioContext(existing);
      return existing;
    }

    const AudioContextConstructor = resolveBrowserAudioContextConstructor();
    if (!AudioContextConstructor) {
      soundPlaybackAudioContextRef.current = null;
      return null;
    }

    try {
      const audioContext = new AudioContextConstructor();
      soundPlaybackAudioContextRef.current = audioContext;
      primeSoundPlaybackAudioContext(audioContext);
      return audioContext;
    } catch {
      soundPlaybackAudioContextRef.current = null;
      return null;
    }
  }, []);

  const closeSoundPlaybackAudioContext = useCallback(() => {
    const audioContext = soundPlaybackAudioContextRef.current;
    soundPlaybackAudioContextRef.current = null;
    if (audioContext && audioContext.state !== "closed" && typeof audioContext.close === "function") {
      void audioContext.close().catch(() => undefined);
    }
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
      const unlockedAudioContext = unlockSoundPlaybackAudioContext();

      const playPreparedAudio = async (
        audio: HTMLAudioElement,
        delivery: SoundPlaybackDeliveryEvidence,
        cacheHit: boolean,
        isCurrentPlaybackRequest: () => boolean = () => true
      ) => {
        setActiveSoundId(sound.soundId);
        setSoundPlaybackState({
          kind: "playing",
          soundId: sound.soundId,
          message: "Starting sound...",
          delivery
        });

        try {
          await audio.play();
          if (!isCurrentPlaybackRequest()) {
            return;
          }
          setSoundPlaybackState({
            kind: "playing",
            soundId: sound.soundId,
            message: "Playing from backend audio cache.",
            delivery
          });
          trackTelemetryEvent("ui.workspace.sounds_mode.sound_played", {
            userId,
            soundId: sound.soundId,
            cacheHit
          });
        } catch (error) {
          if (!isCurrentPlaybackRequest()) {
            return;
          }
          if (isSoundPlaybackActivationError(error)) {
            setSoundPlaybackState({
              kind: "prepared",
              soundId: sound.soundId,
              message: "Audio is loaded. Browser playback needs a direct Play click.",
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
        }
      };

      const playPreparedWebAudio = (
        source: AudioBufferSourceNode,
        delivery: SoundPlaybackDeliveryEvidence,
        cacheHit: boolean,
        isCurrentPlaybackRequest: () => boolean = () => true
      ): boolean => {
        setActiveSoundId(sound.soundId);
        setSoundPlaybackState({
          kind: "playing",
          soundId: sound.soundId,
          message: "Starting sound...",
          delivery
        });
        source.onended = () => {
          if (soundPlaybackAudioRef.current?.webAudioSource === source) {
            stopSoundPlayback();
            setSoundPlaybackState({
              kind: "idle",
              soundId: null,
              message: null
            });
          }
        };
        soundPlaybackAudioRef.current = {
          soundId: sound.soundId,
          audio: null,
          objectUrl: null,
          cacheHit,
          webAudioSource: source
        };

        try {
          source.start(0);
        } catch {
          soundPlaybackAudioRef.current = null;
          return false;
        }
        if (!isCurrentPlaybackRequest()) {
          return true;
        }
        setSoundPlaybackState({
          kind: "playing",
          soundId: sound.soundId,
          message: "Playing from backend audio cache.",
          delivery
        });
        trackTelemetryEvent("ui.workspace.sounds_mode.sound_played", {
          userId,
          soundId: sound.soundId,
          cacheHit
        });
        return true;
      };

      const preparedAudio = soundPlaybackAudioRef.current;
      if (
        preparedAudio?.audio &&
        preparedAudio.soundId === sound.soundId &&
        soundPlaybackState.kind === "prepared" &&
        soundPlaybackState.delivery
      ) {
        const delivery = soundPlaybackState.delivery;
        void playPreparedAudio(preparedAudio.audio, delivery, preparedAudio.cacheHit);
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
        const loop = processed.sound.spatial.loop || processed.sound.playback.mode === "looping";
        const webAudioPlayback = unlockedAudioContext
          ? await createSoundPlaybackBufferSource(blob, unlockedAudioContext, loop)
          : null;
        if (!isCurrentPlaybackRequest()) {
          return;
        }
        if (webAudioPlayback) {
          const delivery = buildSoundDeliveryEvidence(
            contracts.audio,
            webAudioPlayback.durationMs === null
              ? undefined
              : {
                  durationMs: webAudioPlayback.durationMs,
                  durationSource: "browser-preview"
                }
          );
          if (
            playPreparedWebAudio(
              webAudioPlayback.source,
              delivery,
              processed.cacheHit,
              isCurrentPlaybackRequest
            )
          ) {
            return;
          }
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
        audio.loop = loop;
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
          cacheHit: processed.cacheHit,
          webAudioSource: null
        };
        trackTelemetryEvent("ui.workspace.sounds_mode.sound_prepared", {
          userId,
          soundId: sound.soundId,
          cacheHit: processed.cacheHit
        });
        await playPreparedAudio(audio, delivery, processed.cacheHit, isCurrentPlaybackRequest);
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
      soundPlaybackState,
      stopSoundPlayback,
      trackTelemetryEvent,
      unlockSoundPlaybackAudioContext,
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
          },
          assetContractSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS,
          processSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS
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

  const publishCreatureRenderPayload = useCallback(
    (
      lookup: CreatureRenderPayloadLookup,
      payload: CreatureViewportRenderPayload,
      { shouldCache }: { shouldCache: boolean }
    ) => {
      if (shouldCache) {
        lookup.indexKeys.forEach((key) => {
          creatureRenderPayloadCacheRef.current.set(key, payload);
        });
      }
      setCreatureRenderPayloadByLookupKey((current) => {
        let didChange = false;
        const next = { ...current };
        lookup.indexKeys.forEach((key) => {
          if (next[key] !== payload) {
            next[key] = payload;
            didChange = true;
          }
        });
        return didChange ? next : current;
      });
      return lookup.indexKeys;
    },
    []
  );

  const ensureCreatureRenderPayload = useCallback(
    (
      lookupInput: string | CreatureRenderPayloadLookup,
      options: CreatureRenderPayloadRequestOptions = {}
    ): Promise<CreatureViewportRenderPayload | null> => {
      if (!creatureApiPort || !backendAccessToken) {
        return Promise.resolve(null);
      }
      const shouldRefresh = options.refresh === true;
      const lookup =
        typeof lookupInput === "string"
          ? {
              cacheKey: lookupInput,
              processPayload: { templateId: lookupInput },
              indexKeys: [lookupInput]
            }
          : lookupInput;
      if (!shouldRefresh) {
        const cachedPayload = lookup.indexKeys
          .map((key) => creatureRenderPayloadCacheRef.current.get(key))
          .find((payload): payload is CreatureViewportRenderPayload => Boolean(payload));
        if (cachedPayload) {
          publishCreatureRenderPayload(lookup, cachedPayload, { shouldCache: false });
          return Promise.resolve(cachedPayload);
        }
        const pendingPayload = lookup.indexKeys
          .map((key) => creatureRenderPayloadPendingRef.current.get(key))
          .find((payload): payload is Promise<CreatureViewportRenderPayload | null> =>
            Boolean(payload)
          );
        if (pendingPayload) {
          return pendingPayload.then((payload) => {
            if (payload) {
              publishCreatureRenderPayload(lookup, payload, { shouldCache: true });
            }
            return payload;
          });
        }
      }
      const request = fetchCreatureViewportRenderPayload(
        creatureApiPort,
        backendAccessToken,
        lookup.processPayload,
        {
          bypassCache: shouldRefresh ? true : undefined,
          onProcessPayload: (payload) => {
            publishCreatureRenderPayload(lookup, payload, { shouldCache: false });
          }
        }
      )
        .then((payload) => {
          publishCreatureRenderPayload(lookup, payload, { shouldCache: true });
          creatureRenderPayloadFailedKeysRef.current.delete(lookup.cacheKey);
          trackTelemetryEvent(
            isCreaturesMode
              ? "ui.workspace.creatures_mode.render_payload_loaded"
              : "ui.workspace.areas_mode.creature_render_payload_loaded",
            {
              userId,
              templateId: lookup.cacheKey,
              resolvedTemplateId: payload.templateId,
              cacheHit: payload.cacheHit,
              renderPackageStatus: payload.renderPackage?.status ?? "missing"
            }
          );
          return payload;
        })
        .catch((error) => {
          creatureRenderPayloadFailedKeysRef.current.add(lookup.cacheKey);
          trackTelemetryEvent(
            isCreaturesMode
              ? "ui.workspace.creatures_mode.render_payload_failed"
              : "ui.workspace.areas_mode.creature_render_payload_failed",
            {
              userId,
              templateId: lookup.cacheKey,
              message:
                error instanceof Error && error.message.trim().length > 0
                  ? error.message
                  : "unknown_error"
            }
          );
          throw error;
        })
        .finally(() => {
          lookup.indexKeys.forEach((key) => {
            creatureRenderPayloadPendingRef.current.delete(key);
          });
        });
      lookup.indexKeys.forEach((key) => {
        creatureRenderPayloadPendingRef.current.set(key, request);
      });
      return request;
    },
    [
      backendAccessToken,
      creatureApiPort,
      isCreaturesMode,
      publishCreatureRenderPayload,
      trackTelemetryEvent,
      userId
    ]
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

  const requestCreaturesModeRenderPayloadForObject = useCallback(
    (object: SceneObject) => {
      const previewScene = buildCreaturePreviewSceneFromObject(object);
      const lookup = resolveCreatureRenderPayloadLookup(object);

      setCreaturesPreviewError(null);
      setCreaturesModeSceneSeed((current) => {
        const currentObject = current?.objects[0];
        const nextObject = previewScene.objects[0];
        const currentAnimation =
          currentObject?.creatureProperties?.advancedSettings?.animationName?.trim() ?? "";
        const nextAnimation =
          nextObject?.creatureProperties?.advancedSettings?.animationName?.trim() ?? "";
        const currentAnimationState =
          currentObject?.creatureProperties?.advancedSettings?.animationState ?? null;
        const nextAnimationState =
          nextObject?.creatureProperties?.advancedSettings?.animationState ?? null;
        return current?.sceneId === previewScene.sceneId &&
          currentObject?.resRef === nextObject?.resRef &&
          currentAnimation === nextAnimation &&
          currentAnimationState === nextAnimationState
          ? current
          : previewScene;
      });

      if (!creatureApiPort || !backendAccessToken) {
        setCreaturesPreviewError("Backend creature preview is unavailable.");
        return;
      }

      void ensureCreatureRenderPayload(lookup)
        .then(() => undefined)
        .catch(() => {
          setCreaturesPreviewError("Failed to load creature render payload from backend.");
        });
    },
    [backendAccessToken, creatureApiPort, ensureCreatureRenderPayload]
  );

  const updateCreaturePreviewAnimationSelection = useCallback(
    (object: SceneObject, animationName: string) => {
      const sourceObjectId = object.id.startsWith("preview:")
        ? object.id.slice("preview:".length)
        : object.id;
      const normalizedAnimationName = animationName.trim();
      setCreatureAnimationSelectionsByObjectId((current) => {
        if (normalizedAnimationName.length > 0) {
          if (current[sourceObjectId] === normalizedAnimationName) {
            return current;
          }
          return {
            ...current,
            [sourceObjectId]: normalizedAnimationName
          };
        }
        if (!(sourceObjectId in current)) {
          return current;
        }
        const { [sourceObjectId]: _removedAnimationName, ...next } = current;
        return next;
      });
      trackTelemetryEvent("ui.workspace.creatures_mode.animation_selected", {
        userId,
        objectId: sourceObjectId,
        animationName: normalizedAnimationName || "auto"
      });
    },
    [trackTelemetryEvent, userId]
  );

  const updateCreaturePreviewAnimationState = useCallback(
    (object: SceneObject, animationState: number | undefined) => {
      const sourceObjectId = object.id.startsWith("preview:")
        ? object.id.slice("preview:".length)
        : object.id;
      setCreatureAnimationStatesByObjectId((current) => {
        if (animationState !== undefined) {
          if (current[sourceObjectId] === animationState) {
            return current;
          }
          return { ...current, [sourceObjectId]: animationState };
        }
        if (!(sourceObjectId in current)) {
          return current;
        }
        const { [sourceObjectId]: _removedAnimationState, ...next } = current;
        return next;
      });
      trackTelemetryEvent("ui.workspace.creatures_mode.animation_state_selected", {
        userId,
        objectId: sourceObjectId,
        animationState: animationState ?? "source"
      });
    },
    [trackTelemetryEvent, userId]
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
    if (isPlaceablesMode || isItemsMode || !areaSceneSeed) {
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
      if (cancelled || !isCurrentQueue() || !isMountedRef.current) {
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
    const flushAreaPlaceableRenderPayloadState = () => {
      if (cancelled || !isCurrentQueue() || !isMountedRef.current) {
        return;
      }
      if (placeableRenderPayloadPublishTimerRef.current !== null) {
        clearTimeout(placeableRenderPayloadPublishTimerRef.current);
        placeableRenderPayloadPublishTimerRef.current = null;
      }
      placeableRenderPayloadPublishQueuedRef.current = false;
      setPlaceableRenderPayloadByTemplateId({
        ...placeableRenderPayloadByTemplateIdRef.current
      });
    };
    const activateSnapshotOnlyQueue = () => {
      areaPlaceableRenderPayloadQueueActiveSignatureRef.current = queueSignature;
      areaPlaceableRenderPayloadQueueActivePromiseRef.current = null;
    };
    const cleanupSnapshotOnlyQueue = () => {
      cancelled = true;
      if (areaPlaceableRenderPayloadQueueActiveSignatureRef.current === queueSignature) {
        areaPlaceableRenderPayloadQueueActiveSignatureRef.current = null;
      }
    };

    if (lookups.length < 1) {
      activateSnapshotOnlyQueue();
      publishQueueSnapshot("unavailable", false, 0);
      return cleanupSnapshotOnlyQueue;
    }

    if (areaRuntimeCaptureTerrainOnlyObjectPayloadSkip) {
      activateSnapshotOnlyQueue();
      publishQueueSnapshot("unavailable", false, lookups.length);
      trackTelemetryEvent("ui.workspace.areas_mode.render_payload_queue_skipped", {
        userId,
        rendererPath: SHARED_PLACEABLES_RENDERER_PATH,
        objectCount: areasModePlaceableProcessObjects.length,
        lookupCount: lookups.length,
        reason: "terrain_only_runtime_capture"
      });
      return cleanupSnapshotOnlyQueue;
    }

    if (!placeableApiPort || !backendAccessToken) {
      activateSnapshotOnlyQueue();
      publishQueueSnapshot("unavailable", false, 0);
      return cleanupSnapshotOnlyQueue;
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
    let singleRecoveryPromise: Promise<void> | null = null;
    let earlySingleRecoveryTimeoutId: number | null = null;

    const runSingleRecoveryQueue = async () => {
      const recoveryLookups = lookups.filter(
        (lookup) =>
          !hasAreaPlaceablePayload(lookup) &&
          !lookupHasPendingPlaceableRenderPayload(
            lookup,
            placeableRenderPayloadPendingRef.current
          )
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
            const processResult = await withOptionalAreaPlaceableAbortableTimeout(
              (signal) =>
                placeableApiPort.processPlaceable(
                  backendAccessToken,
                  {
                    ...lookup.processPayload,
                    includeBenchmarkMetadata: false
                  },
                  signal ? { signal } : undefined
                ),
              AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS,
              `Area placeable process recovery ${lookup.cacheKey}`
            );
            const payload = buildPlaceableViewportProcessPreviewPayload(processResult);
            if (cancelled || !isCurrentQueue()) {
              publishPlaceableRenderPayload(lookup, payload, {
                shouldCache: false,
                deferCommit: true
              });
              return;
            }
            publishAreaPlaceableRenderPayload(lookup, payload, {
              shouldCache: false,
              deferCommit: true
            });
            failedLookupKeys.delete(lookup.cacheKey);
            trackTelemetryEvent(
              "ui.workspace.areas_mode.render_payload_batch_recovered_process_preview",
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
              "ui.workspace.areas_mode.render_payload_batch_recovery_process_preview_failed",
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
      flushAreaPlaceableRenderPayloadState();
      completedBatchCount = Math.max(completedBatchCount, lookups.length);
      publishQueueSnapshot("single", false, completedBatchCount);

      const fullRecoveryLookups = recoveryLookups.filter(
        (lookup) =>
          !hasAreaPlaceablePayload(lookup) &&
          !lookupHasPendingPlaceableRenderPayload(
            lookup,
            placeableRenderPayloadPendingRef.current
          )
      );
      if (fullRecoveryLookups.length < 1) {
        return;
      }

      let fullRecoveryCursor = 0;
      const runFullRecoveryWorker = async () => {
        while (
          !cancelled &&
          isCurrentQueue() &&
          fullRecoveryCursor < fullRecoveryLookups.length
        ) {
          const lookup = fullRecoveryLookups[fullRecoveryCursor];
          fullRecoveryCursor += 1;
          if (!lookup || hasAreaPlaceablePayload(lookup)) {
            continue;
          }
          try {
            const payload = await fetchPlaceableViewportRenderPayload(
              placeableApiPort,
              backendAccessToken,
              lookup.processPayload,
              {
                onProcessPayload: (payload) => {
                  if (cancelled || !isCurrentQueue()) {
                    return;
                  }
                  publishAreaPlaceableRenderPayload(lookup, payload, {
                    shouldCache: false,
                    deferCommit: true
                  });
                },
                assetContractSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS,
                processSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS
              }
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

      const fullWorkerCount = Math.min(
        AREAS_RENDER_PAYLOAD_QUEUE_CONCURRENCY,
        fullRecoveryLookups.length
      );
      await Promise.all(Array.from({ length: fullWorkerCount }, () => runFullRecoveryWorker()));
      flushAreaPlaceableRenderPayloadState();
    };
    const ensureSingleRecoveryQueue = () => {
      if (singleRecoveryPromise) {
        return singleRecoveryPromise;
      }
      const currentPromise = runSingleRecoveryQueue().finally(() => {
        if (singleRecoveryPromise === currentPromise) {
          singleRecoveryPromise = null;
        }
      });
      singleRecoveryPromise = currentPromise;
      return currentPromise;
    };
    const scheduleEarlySingleRecoveryQueue = () => {
      if (
        earlySingleRecoveryTimeoutId !== null ||
        AREAS_RENDER_PAYLOAD_EARLY_SINGLE_RECOVERY_DELAY_MS <= 0
      ) {
        return;
      }
      earlySingleRecoveryTimeoutId = window.setTimeout(() => {
        earlySingleRecoveryTimeoutId = null;
        if (cancelled || !isCurrentQueue()) {
          return;
        }
        void ensureSingleRecoveryQueue();
      }, AREAS_RENDER_PAYLOAD_EARLY_SINGLE_RECOVERY_DELAY_MS);
    };
    const replayBatchPayloadsForRendererSettlement = async () => {
      if (
        !AREAS_USE_BACKEND_VIEWPORT_RENDER_PAYLOAD_BATCH ||
        !placeableApiPort.getPlaceableViewportRenderPayloadBatch
      ) {
        return;
      }
      const replayLookups = lookups.filter(hasAreaPlaceablePayload);
      if (replayLookups.length < 1 || cancelled || !isCurrentQueue()) {
        return;
      }
      try {
        const results = await fetchPlaceableViewportRenderPayloadBatch(
          placeableApiPort,
          backendAccessToken,
          replayLookups.map((lookup) => ({
            key: lookup.cacheKey,
            lookup: lookup.processPayload
          })),
          { preferBackendViewportBatch: AREAS_USE_BACKEND_VIEWPORT_RENDER_PAYLOAD_BATCH }
        );
        results.forEach((result) => {
          const lookup = replayLookups.find((entry) => entry.cacheKey === result.key);
          if (!lookup) {
            return;
          }
          publishAreaPlaceableRenderPayload(lookup, result.payload, {
            shouldCache: true,
            deferCommit: true,
            scheduleCommit: false
          });
        });
        flushAreaPlaceableRenderPayloadState();
        trackTelemetryEvent("ui.workspace.areas_mode.render_payload_batch_replayed", {
          userId,
          rendererPath: SHARED_PLACEABLES_RENDERER_PATH,
          lookupCount: replayLookups.length,
          resultCount: results.length
        });
      } catch (error) {
        trackTelemetryEvent("ui.workspace.areas_mode.render_payload_batch_replay_failed", {
          userId,
          rendererPath: SHARED_PLACEABLES_RENDERER_PATH,
          lookupCount: replayLookups.length,
          message:
            error instanceof Error && error.message.trim().length > 0
              ? error.message
              : "unknown_error"
        });
      }
    };

    const runBatchQueue = async () => {
      publishQueueSnapshot("batch", true, completedBatchCount);
      if (!AREAS_USE_BACKEND_VIEWPORT_RENDER_PAYLOAD_BATCH) {
        scheduleEarlySingleRecoveryQueue();
      }
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
              },
              allowPartialProcessBatchResults: true,
              assetContractBatchTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_BATCH_TIMEOUT_MS,
              assetContractSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS,
              backendViewportBatchTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_BATCH_TIMEOUT_MS,
              processBatchTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_BATCH_TIMEOUT_MS,
              resolveProcessPreviewOnly: true,
              processSingleTimeoutMs: AREAS_RENDER_PAYLOAD_PROCESS_SINGLE_TIMEOUT_MS,
              preferBackendViewportBatch: AREAS_USE_BACKEND_VIEWPORT_RENDER_PAYLOAD_BATCH
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
      await ensureSingleRecoveryQueue();
      flushAreaPlaceableRenderPayloadState();
      await replayBatchPayloadsForRendererSettlement();
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
      flushAreaPlaceableRenderPayloadState();
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
      const queueChanged =
        areaPlaceableRenderPayloadQueueActiveSignatureRef.current !== queueSignature;
      if (queueChanged && earlySingleRecoveryTimeoutId !== null) {
        window.clearTimeout(earlySingleRecoveryTimeoutId);
        earlySingleRecoveryTimeoutId = null;
      }
      if (queueChanged) {
        cancelled = true;
      }
    };
  }, [
    areaSceneSeed,
    areaRuntimeCaptureTerrainOnlyObjectPayloadSkip,
    areasModePlaceableProcessObjects,
    backendAccessToken,
    ensurePlaceableRenderPayload,
    isItemsMode,
    isPlaceablesMode,
    placeableApiPort,
    publishPlaceableRenderPayload,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (areasModeCreatureProcessObjects.length < 1) {
      return;
    }
    if (!creatureApiPort || !backendAccessToken) {
      return;
    }
    const lookupByCacheKey = new Map<string, CreatureRenderPayloadLookup>();
    areasModeCreatureProcessObjects.forEach((object) => {
      const lookup = resolveCreatureRenderPayloadLookup(object);
      if (lookup.cacheKey.trim().length > 0 && !lookupByCacheKey.has(lookup.cacheKey)) {
        lookupByCacheKey.set(lookup.cacheKey, lookup);
      }
    });
    const lookups = Array.from(lookupByCacheKey.values()).filter((lookup) => {
      if (creatureRenderPayloadFailedKeysRef.current.has(lookup.cacheKey)) {
        return false;
      }
      const hasCachedPayload = lookup.indexKeys.some((key) =>
        creatureRenderPayloadCacheRef.current.has(key)
      );
      if (hasCachedPayload) {
        return false;
      }
      return !lookup.indexKeys.some((key) => creatureRenderPayloadPendingRef.current.has(key));
    });
    if (lookups.length < 1) {
      return;
    }

    let cancelled = false;
    let cursor = 0;
    const runWorker = async () => {
      while (!cancelled && cursor < lookups.length) {
        const lookup = lookups[cursor];
        cursor += 1;
        if (!lookup) {
          continue;
        }
        try {
          await ensureCreatureRenderPayload(lookup);
        } catch (error) {
          if (cancelled) {
            return;
          }
          if (isBackendInvalidSessionError(error)) {
            onBackendSessionInvalidated?.("creatures_catalog", backendAccessToken);
          }
        }
      }
    };
    const workerCount = Math.min(
      AREAS_CREATURE_RENDER_PAYLOAD_QUEUE_CONCURRENCY,
      lookups.length
    );
    void Promise.all(Array.from({ length: workerCount }, () => runWorker()));

    return () => {
      cancelled = true;
    };
  }, [
    areasModeCreatureProcessObjects,
    backendAccessToken,
    creatureApiPort,
    ensureCreatureRenderPayload,
    onBackendSessionInvalidated
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
    creaturesCatalogClientCacheRef.current = null;
    creatureRenderPayloadCacheRef.current.clear();
    creatureRenderPayloadPendingRef.current.clear();
    creatureRenderPayloadFailedKeysRef.current.clear();
    setCreatureRenderPayloadByLookupKey({});
  }, [backendAccessToken, creatureApiPort]);

  useEffect(() => {
    itemsCatalogClientCacheRef.current = null;
    setItemsCatalogItems([]);
    setItemsCatalogTotal(0);
    setItemsBaseItems([]);
    setActiveItemPreviewObjectId(null);
    setProcessedItemPreviewObjectsById({});
    setItemsCreatorStatus("idle");
    setItemsPreviewStatus("idle");
    setItemsCreatorError(null);
    setItemsModeSceneSeed(null);
  }, [backendAccessToken, itemApiPort]);

  useEffect(() => {
    storesCatalogClientCacheRef.current = null;
    setStoresCatalogItems([]);
  }, [backendAccessToken, storeApiPort]);

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
      closeSoundPlaybackAudioContext();
    };
  }, [closeSoundPlaybackAudioContext, stopSoundPlayback]);

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
    if (!shouldLoadPlaceablesCatalog) {
      setPlaceablesCatalogObjects([]);
      setPlaceablesCatalogTotal(0);
      setPlaceablesCatalogStatus("idle");
      setPlaceablesCatalogError(null);
      setPlaceablesPreviewError(null);
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

    const normalizedPlaceablesQuery = isPlaceablesMode ? placeablesCatalogQuery.trim() : "";
    const effectivePlaceablesSubtypeFilter: PlaceablesSubtypeFilter = isPlaceablesMode
      ? placeablesSubtypeFilter
      : "all";
    const cachedCatalog = placeablesCatalogClientCacheRef.current;
    if (
      cachedCatalog &&
      cachedCatalog.query === normalizedPlaceablesQuery &&
      cachedCatalog.subtypeFilter === effectivePlaceablesSubtypeFilter &&
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
            ...(effectivePlaceablesSubtypeFilter !== "all"
              ? { subtype: effectivePlaceablesSubtypeFilter }
              : {})
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
          subtypeFilter: effectivePlaceablesSubtypeFilter,
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
          subtypeFilter: effectivePlaceablesSubtypeFilter,
          source: isPlaceablesMode ? "placeables_mode" : "areas_mode"
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
    shouldLoadPlaceablesCatalog,
    onBackendSessionInvalidated,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!shouldLoadBackendCreaturesCatalog) {
      setCreaturesCatalogItems([]);
      setCreaturesCatalogTotal(0);
      setActiveCreaturePreviewObjectId(null);
      setCreaturesModeSceneSeed(null);
      setCreaturesCatalogStatus("idle");
      setCreaturesCatalogError(null);
      setCreaturesPreviewError(null);
      return;
    }
    if (!creatureApiPort || !backendAccessToken) {
      creaturesCatalogClientCacheRef.current = null;
      setCreaturesCatalogItems([]);
      setCreaturesCatalogTotal(0);
      setActiveCreaturePreviewObjectId(null);
      setCreaturesModeSceneSeed(null);
      setCreaturesCatalogStatus("error");
      setCreaturesCatalogError("Backend creatures catalog is unavailable.");
      setCreaturesPreviewError(null);
      return;
    }

    const cachedCatalog = creaturesCatalogClientCacheRef.current;
    if (cachedCatalog && cachedCatalog.expiresAtMs > Date.now()) {
      setCreaturesCatalogItems(cachedCatalog.items);
      setCreaturesCatalogTotal(cachedCatalog.total);
      setCreaturesCatalogStatus("ready");
      setCreaturesCatalogError(null);
      return;
    }

    let cancelled = false;
    setCreaturesCatalogStatus("loading");
    setCreaturesCatalogError(null);
    setCreaturesPreviewError(null);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: CreatureApiListItem[] = [];
      const seenTemplateIds = new Set<string>();

      try {
        while (true) {
          const result = await creatureApiPort.listCreatures(backendAccessToken, {
            limit: CREATURES_CATALOG_BATCH_SIZE,
            offset
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          setCreaturesCatalogTotal(total);
          let didAppend = false;
          result.items.forEach((item) => {
            const normalizedTemplateId = item.templateId.trim().toLowerCase();
            if (seenTemplateIds.has(normalizedTemplateId)) {
              return;
            }
            seenTemplateIds.add(normalizedTemplateId);
            aggregated.push(item);
            didAppend = true;
          });
          if (didAppend) {
            setCreaturesCatalogItems([...aggregated]);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0 || (total !== null && consumedItems >= total)) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, CREATURES_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        creaturesCatalogClientCacheRef.current = {
          items: aggregated,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + CREATURES_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setCreaturesCatalogItems([...aggregated]);
        setCreaturesCatalogTotal(total ?? aggregated.length);
        setCreaturesCatalogStatus("ready");
        setCreaturesCatalogError(null);
        trackTelemetryEvent("ui.workspace.creatures_catalog.loaded", {
          userId,
          count: aggregated.length,
          source: isCreaturesMode ? "creatures_mode" : "areas_mode"
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setCreaturesCatalogItems([]);
          setCreaturesCatalogTotal(0);
          setActiveCreaturePreviewObjectId(null);
          setCreaturesModeSceneSeed(null);
        }
        setCreaturesCatalogStatus("error");
        setCreaturesCatalogError(resolveCreaturesCatalogErrorMessage(error));
        trackTelemetryEvent("ui.workspace.creatures_catalog.load_failed", {
          userId,
          message: resolveCreaturesCatalogErrorMessage(error),
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
          onBackendSessionInvalidated?.("creatures_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    creatureApiPort,
    isCreaturesMode,
    onBackendSessionInvalidated,
    shouldLoadBackendCreaturesCatalog,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!shouldLoadBackendEncountersCatalog) {
      setEncountersCatalogItems([]);
      return;
    }
    if (!encounterApiPort || !backendAccessToken) {
      encountersCatalogClientCacheRef.current = null;
      setEncountersCatalogItems([]);
      return;
    }

    const cachedCatalog = encountersCatalogClientCacheRef.current;
    if (cachedCatalog && cachedCatalog.expiresAtMs > Date.now()) {
      setEncountersCatalogItems(cachedCatalog.items);
      return;
    }

    let cancelled = false;
    setEncountersCatalogItems([]);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: EncounterApiListItem[] = [];
      const seenTemplateIds = new Set<string>();

      try {
        while (true) {
          const result = await encounterApiPort.listEncounters(backendAccessToken, {
            limit: ENCOUNTERS_CATALOG_BATCH_SIZE,
            offset
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          let didAppend = false;
          result.items.forEach((item) => {
            const normalizedTemplateId = item.templateId.trim().toLowerCase();
            if (seenTemplateIds.has(normalizedTemplateId)) {
              return;
            }
            seenTemplateIds.add(normalizedTemplateId);
            aggregated.push(item);
            didAppend = true;
          });
          if (didAppend) {
            setEncountersCatalogItems([...aggregated]);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0 || (total !== null && consumedItems >= total)) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, ENCOUNTERS_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        encountersCatalogClientCacheRef.current = {
          items: aggregated,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + ENCOUNTERS_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setEncountersCatalogItems([...aggregated]);
        trackTelemetryEvent("ui.workspace.encounters_catalog.loaded", {
          userId,
          count: aggregated.length,
          source: "areas_mode"
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setEncountersCatalogItems([]);
        }
        trackTelemetryEvent("ui.workspace.encounters_catalog.load_failed", {
          userId,
          message: resolveEncountersCatalogErrorMessage(error),
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
          onBackendSessionInvalidated?.("encounters_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    encounterApiPort,
    onBackendSessionInvalidated,
    shouldLoadBackendEncountersCatalog,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!shouldLoadBackendStoresCatalog) {
      setStoresCatalogItems([]);
      return;
    }
    if (!storeApiPort || !backendAccessToken) {
      storesCatalogClientCacheRef.current = null;
      setStoresCatalogItems([]);
      return;
    }

    const cachedCatalog = storesCatalogClientCacheRef.current;
    if (cachedCatalog && cachedCatalog.expiresAtMs > Date.now()) {
      setStoresCatalogItems(cachedCatalog.items);
      return;
    }

    let cancelled = false;
    setStoresCatalogItems([]);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: StoreApiListItem[] = [];
      const seenTemplateIds = new Set<string>();

      try {
        while (true) {
          const result = await storeApiPort.listStores(backendAccessToken, {
            limit: STORES_CATALOG_BATCH_SIZE,
            offset
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          let didAppend = false;
          result.items.forEach((item) => {
            const normalizedTemplateId = item.templateId.trim().toLowerCase();
            if (seenTemplateIds.has(normalizedTemplateId)) {
              return;
            }
            seenTemplateIds.add(normalizedTemplateId);
            aggregated.push(item);
            didAppend = true;
          });
          if (didAppend) {
            setStoresCatalogItems([...aggregated]);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0 || (total !== null && consumedItems >= total)) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, STORES_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        storesCatalogClientCacheRef.current = {
          items: aggregated,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + STORES_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setStoresCatalogItems([...aggregated]);
        trackTelemetryEvent("ui.workspace.stores_catalog.loaded", {
          userId,
          count: aggregated.length,
          source: storesCatalogTelemetrySource
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setStoresCatalogItems([]);
        }
        trackTelemetryEvent("ui.workspace.stores_catalog.load_failed", {
          userId,
          message: resolveStoresCatalogErrorMessage(error),
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
          onBackendSessionInvalidated?.("stores_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    onBackendSessionInvalidated,
    shouldLoadBackendStoresCatalog,
    storeApiPort,
    storesCatalogTelemetrySource,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!shouldLoadBackendItemsCatalog) {
      itemsCatalogClientCacheRef.current = null;
      setItemsCatalogItems([]);
      setItemsCatalogTotal(0);
      setItemsBaseItems([]);
      setActiveItemPreviewObjectId(null);
      setProcessedItemPreviewObjectsById({});
      setItemsCreatorStatus("idle");
      setItemsPreviewStatus("idle");
      setItemsCreatorError(null);
      setItemsModeSceneSeed(null);
      setItemsCatalogStatus("idle");
      setItemsCatalogError(null);
      return;
    }
    if (!itemApiPort || !backendAccessToken) {
      itemsCatalogClientCacheRef.current = null;
      setItemsCatalogItems([]);
      setItemsCatalogTotal(0);
      setItemsBaseItems([]);
      setActiveItemPreviewObjectId(null);
      setProcessedItemPreviewObjectsById({});
      setItemsCreatorStatus("idle");
      setItemsPreviewStatus("idle");
      setItemsCreatorError(null);
      setItemsModeSceneSeed(null);
      setItemsCatalogStatus("error");
      setItemsCatalogError("Backend items catalog is unavailable.");
      return;
    }

    const catalogQuery = itemsSearchQuery.trim();
    const isSearchCatalogQuery = catalogQuery.length > 0;
    const cachedCatalog = itemsCatalogClientCacheRef.current;
    if (
      cachedCatalog &&
      cachedCatalog.query === catalogQuery &&
      cachedCatalog.expiresAtMs > Date.now()
    ) {
      setItemsCatalogItems(cachedCatalog.items);
      setItemsCatalogTotal(cachedCatalog.total);
      setItemsCatalogStatus("ready");
      setItemsCatalogError(null);
      return;
    }

    let cancelled = false;
    setItemsCatalogStatus("loading");
    setItemsCatalogItems([]);
    setItemsCatalogTotal(0);
    setItemsBaseItems([]);
    setActiveItemPreviewObjectId(null);
    setProcessedItemPreviewObjectsById({});
    setItemsCreatorStatus("idle");
    setItemsPreviewStatus("idle");
    setItemsCreatorError(null);
    setItemsModeSceneSeed(null);
    setItemsCatalogError(null);

    void (async () => {
      let offset = 0;
      let total: number | null = null;
      const aggregated: ItemApiListItem[] = [];
      const seenTemplateIds = new Set<string>();
      const emptyPageRetryByOffset = new Map<number, number>();

      try {
        while (true) {
          const result = await itemApiPort.listItems(backendAccessToken, {
            ...(isSearchCatalogQuery ? { query: catalogQuery } : {}),
            limit: ITEMS_CATALOG_BATCH_SIZE,
            offset
          });
          if (cancelled) {
            return;
          }

          total = total ?? result.total;
          setItemsCatalogTotal(total);
          let didAppend = false;
          result.items.forEach((item) => {
            const normalizedTemplateId = item.templateId.trim().toLowerCase();
            if (seenTemplateIds.has(normalizedTemplateId)) {
              return;
            }
            seenTemplateIds.add(normalizedTemplateId);
            aggregated.push(item);
            didAppend = true;
          });
          if (didAppend) {
            setItemsCatalogItems([...aggregated]);
          }

          const pageCount = result.items.length;
          const consumedItems = offset + pageCount;
          if (pageCount === 0) {
            const retryCount = emptyPageRetryByOffset.get(offset) ?? 0;
            const shouldRetryEmptyPage =
              total === null || aggregated.length < total;
            if (shouldRetryEmptyPage && retryCount < ITEMS_CATALOG_EMPTY_PAGE_RETRY_LIMIT) {
              emptyPageRetryByOffset.set(offset, retryCount + 1);
              await new Promise((resolve) => {
                window.setTimeout(resolve, ITEMS_CATALOG_PAGE_YIELD_MS * (retryCount + 2));
              });
              if (cancelled) {
                return;
              }
              continue;
            }
            break;
          }
          if (isSearchCatalogQuery && pageCount < ITEMS_CATALOG_BATCH_SIZE) {
            break;
          }
          if (total !== null && consumedItems >= total) {
            break;
          }
          offset = consumedItems;
          await new Promise((resolve) => {
            window.setTimeout(resolve, ITEMS_CATALOG_PAGE_YIELD_MS);
          });
          if (cancelled) {
            return;
          }
        }

        if (cancelled) {
          return;
        }
        if (!isSearchCatalogQuery && total !== null && aggregated.length < total) {
          throw new Error(
            `Items catalog loaded ${aggregated.length} of ${total} items before the backend returned an empty page.`
          );
        }
        itemsCatalogClientCacheRef.current = {
          items: aggregated,
          query: catalogQuery,
          total: total ?? aggregated.length,
          expiresAtMs: Date.now() + ITEMS_CATALOG_CLIENT_CACHE_TTL_MS
        };
        setItemsCatalogItems([...aggregated]);
        setItemsCatalogTotal(total ?? aggregated.length);
        setItemsCatalogStatus("ready");
        setItemsCatalogError(null);
        trackTelemetryEvent("ui.workspace.items_mode.catalog_loaded", {
          userId,
          count: aggregated.length
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (aggregated.length < 1) {
          setItemsCatalogItems([]);
          setItemsCatalogTotal(0);
          setItemsBaseItems([]);
          setActiveItemPreviewObjectId(null);
          setProcessedItemPreviewObjectsById({});
          setItemsCreatorStatus("idle");
          setItemsCreatorError(null);
          setItemsModeSceneSeed(null);
        }
        setItemsCatalogStatus("error");
        setItemsCatalogError(resolveItemsCatalogErrorMessage(error));
        trackTelemetryEvent("ui.workspace.items_mode.catalog_load_failed", {
          userId,
          message: resolveItemsCatalogErrorMessage(error),
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
          onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    itemApiPort,
    onBackendSessionInvalidated,
    shouldLoadBackendItemsCatalog,
    itemsSearchQuery,
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
    if (!isItemsMode) {
      return;
    }
    const itemIds = filteredItemsModeObjects.map((object) => object.id);
    if (itemIds.length < 1) {
      setActiveItemPreviewObjectId(null);
      setProcessedItemPreviewObjectsById({});
      setItemsCreatorStatus("idle");
      setItemsPreviewStatus("idle");
      setItemsCreatorError(null);
      return;
    }
    const normalizedItemsSearchQuery = itemsSearchQuery.trim().toLowerCase();
    const exactQueryMatch =
      normalizedItemsSearchQuery.length > 0
        ? filteredItemsModeObjects.find((object) => {
            const candidates = [
              object.id,
              object.resRef,
              object.tag,
              object.source?.templateId ?? ""
            ].map((value) => value.trim().toLowerCase());
            return candidates.includes(normalizedItemsSearchQuery);
          })
        : null;
    setActiveItemPreviewObjectId((current) =>
      current && itemIds.includes(current)
        ? current
        : (exactQueryMatch?.id ?? itemIds[0] ?? null)
    );
  }, [filteredItemsModeObjects, isItemsMode, itemsSearchQuery]);

  useEffect(() => {
    if (!isItemsMode) {
      setItemsSearchQuery("");
      setItemsCatalogError(null);
      setActiveItemPreviewObjectId(null);
      setProcessedItemPreviewObjectsById({});
      setItemsCreatorStatus("idle");
      setItemsPreviewStatus("idle");
      setItemsCreatorError(null);
      setItemsModeSceneSeed(null);
    }
  }, [isItemsMode]);

  useEffect(() => {
    if (!shouldLoadBackendItemsCatalog || !itemApiPort || !backendAccessToken) {
      setItemsPropertyDictionary([]);
      setItemsBaseItems([]);
      setItemsPaletteTree(null);
      setItemsGeneratorSupport(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const [propertyResult, baseItemsResult, paletteResult, generatorSupportResult] =
          await Promise.all([
            itemApiPort.getItemPropertyDictionary(backendAccessToken),
            itemApiPort.getItemBaseItems(backendAccessToken),
            itemApiPort.getItemPaletteTree(backendAccessToken),
            itemApiPort.getItemGeneratorSupport(backendAccessToken)
          ]);
        if (!cancelled) {
          setItemsPropertyDictionary(propertyResult.properties);
          setItemsBaseItems(baseItemsResult.items);
          setItemsPaletteTree(paletteResult);
          setItemsGeneratorSupport(generatorSupportResult);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        setItemsPropertyDictionary([]);
        setItemsBaseItems([]);
        setItemsPaletteTree(null);
        setItemsGeneratorSupport(null);
        trackTelemetryEvent("ui.workspace.items_mode.property_dictionary_failed", {
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
          onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    backendAccessToken,
    itemApiPort,
    onBackendSessionInvalidated,
    shouldLoadBackendItemsCatalog,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    if (!isItemsMode || !activeItemCatalogObject) {
      itemsPreviewProcessRequestRef.current += 1;
      setItemsModeSceneSeed(null);
      setItemsPreviewStatus("idle");
      return;
    }
    setItemsCreatorError(null);
    if (!itemApiPort || !backendAccessToken) {
      itemsPreviewProcessRequestRef.current += 1;
      setItemsPreviewStatus("idle");
      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(activeItemCatalogObject));
      return;
    }

    const cachedProcessedObject = processedItemPreviewObjectsById[activeItemCatalogObject.id];
    if (cachedProcessedObject) {
      itemsPreviewProcessRequestRef.current += 1;
      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(cachedProcessedObject));
      setItemsPreviewStatus("idle");
      return;
    } else if (hasRenderableItemPreviewAssets(activeItemCatalogObject)) {
      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(activeItemCatalogObject));
    }
    const requestId = itemsPreviewProcessRequestRef.current + 1;
    itemsPreviewProcessRequestRef.current = requestId;
    setItemsPreviewStatus("applying");
    setItemsCatalogError(null);
    void processItemsModePreviewObject(activeItemCatalogObject, undefined, false)
      .then((processedObject) => {
        if (itemsPreviewProcessRequestRef.current !== requestId) {
          return;
        }
        setProcessedItemPreviewObjectsById((current) => ({
          ...current,
          [activeItemCatalogObject.id]: processedObject
        }));
        setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));
        setItemsPreviewStatus("idle");
      })
      .catch((error) => {
        if (itemsPreviewProcessRequestRef.current !== requestId) {
          return;
        }
        setItemsCatalogError(resolveItemsCatalogErrorMessage(error));
        setItemsPreviewStatus("idle");
      });
  }, [
    activeItemCatalogObjectProcessKey,
    backendAccessToken,
    isItemsMode,
    itemApiPort,
    processedItemPreviewObjectsById,
    processItemsModePreviewObject
  ]);

  const handleApplyItemVisualOverride = useCallback(
    async (itemVisualOverride: ItemApiVisualOverride) => {
      if (!activeItemCatalogObject) {
        return;
      }
      if (!itemApiPort || !backendAccessToken) {
        setItemsCreatorError("Backend items catalog is unavailable.");
        return;
      }

      setItemsPreviewStatus("applying");
      setItemsCreatorError(null);
      setItemsCatalogError(null);
      try {
        const processedObject = await processItemsModePreviewObject(
          activeItemCatalogObject,
          itemVisualOverride,
          true
        );
        setProcessedItemPreviewObjectsById((current) => ({
          ...current,
          [activeItemCatalogObject.id]: processedObject
        }));
        setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));
        trackTelemetryEvent("ui.workspace.items_mode.creator_apply", {
          userId,
          objectId: activeItemCatalogObject.id,
          resRef: activeItemCatalogObject.resRef
        });
      } catch (error) {
        const message = resolveItemsCatalogErrorMessage(error);
        setItemsCreatorError(message);
        setItemsCatalogError(message);
        trackTelemetryEvent("ui.workspace.items_mode.creator_apply_failed", {
          userId,
          objectId: activeItemCatalogObject.id,
          message,
          errorName: error instanceof Error ? error.name : "unknown"
        });
        if (isBackendInvalidSessionError(error)) {
          onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
        }
      } finally {
        setItemsPreviewStatus("idle");
      }
    },
    [
      activeItemCatalogObject,
      backendAccessToken,
      itemApiPort,
      onBackendSessionInvalidated,
      processItemsModePreviewObject,
      trackTelemetryEvent,
      userId
    ]
  );

  const handleResetItemVisualOverride = useCallback(async () => {
    if (!activeItemCatalogObject) {
      return;
    }
    if (!itemApiPort || !backendAccessToken) {
      setProcessedItemPreviewObjectsById((current) => {
        const next = { ...current };
        delete next[activeItemCatalogObject.id];
        return next;
      });
      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(activeItemCatalogObject));
      setItemsCreatorError(null);
      return;
    }

    setItemsPreviewStatus("applying");
    setItemsCreatorError(null);
    setItemsCatalogError(null);
    try {
      const processedObject = await processItemsModePreviewObject(
        activeItemCatalogObject,
        undefined,
        true
      );
      setProcessedItemPreviewObjectsById((current) => ({
        ...current,
        [activeItemCatalogObject.id]: processedObject
      }));
      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));
      trackTelemetryEvent("ui.workspace.items_mode.creator_reset", {
        userId,
        objectId: activeItemCatalogObject.id,
        resRef: activeItemCatalogObject.resRef
      });
    } catch (error) {
      const message = resolveItemsCatalogErrorMessage(error);
      setItemsCreatorError(message);
      setItemsCatalogError(message);
      if (isBackendInvalidSessionError(error)) {
        onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
      }
    } finally {
      setItemsPreviewStatus("idle");
    }
  }, [
    activeItemCatalogObject,
    backendAccessToken,
    itemApiPort,
    onBackendSessionInvalidated,
    processItemsModePreviewObject,
    trackTelemetryEvent,
    userId
  ]);

  const handleCreateConfiguredItemFromWizard = useCallback(
    async (itemVisualOverride?: ItemApiVisualOverride) => {
      if (!activeItemCatalogObject) {
        return;
      }
      if (!itemApiPort || !backendAccessToken) {
        setItemsCreatorError("Backend items catalog is unavailable.");
        return;
      }

      setItemsPreviewStatus("applying");
      setItemsCreatorError(null);
      setItemsCatalogError(null);
      try {
        const cachedProcessedObject = processedItemPreviewObjectsById[activeItemCatalogObject.id];
        const processedObject =
          !itemVisualOverride && cachedProcessedObject
            ? cachedProcessedObject
            : await processItemsModePreviewObject(
                activeItemCatalogObject,
                itemVisualOverride,
                Boolean(itemVisualOverride)
              );
        setProcessedItemPreviewObjectsById((current) => ({
          ...current,
          [activeItemCatalogObject.id]: processedObject
        }));
        setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));

        setPendingItemWizardPlacementTemplate(processedObject);
        if (controlledActiveBuilderModeId === undefined) {
          setUncontrolledActiveBuilderModeId("areas_mode");
        }
        onActiveBuilderModeChange?.("areas_mode");
        trackTelemetryEvent("ui.workspace.items_mode.wizard_place_armed", {
          userId,
          objectId: activeItemCatalogObject.id,
          resRef: activeItemCatalogObject.resRef
        });
      } catch (error) {
        const message = resolveItemsCatalogErrorMessage(error);
        setItemsCreatorError(message);
        setItemsCatalogError(message);
        trackTelemetryEvent("ui.workspace.items_mode.wizard_place_failed", {
          userId,
          objectId: activeItemCatalogObject.id,
          message,
          errorName: error instanceof Error ? error.name : "unknown"
        });
        if (isBackendInvalidSessionError(error)) {
          onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
        }
      } finally {
        setItemsPreviewStatus("idle");
      }
    },
    [
      activeItemCatalogObject,
      backendAccessToken,
      controlledActiveBuilderModeId,
      itemApiPort,
      onActiveBuilderModeChange,
      onBackendSessionInvalidated,
      processedItemPreviewObjectsById,
      processItemsModePreviewObject,
      trackTelemetryEvent,
      userId
    ]
  );

  useEffect(() => {
    if (activeBuilderModeId !== "areas_mode" || !pendingItemWizardPlacementTemplate) {
      return;
    }
    sidebarSignalRevisionRef.current += 1;
    setActiveObjectAddTemplateId(pendingItemWizardPlacementTemplate.id);
    setCanvasCreateObjectSignal({
      revision: sidebarSignalRevisionRef.current,
      template: pendingItemWizardPlacementTemplate
    });
    setPendingItemWizardPlacementTemplate(null);
  }, [activeBuilderModeId, pendingItemWizardPlacementTemplate]);

  useEffect(() => {
    if (!isCreaturesMode) {
      return;
    }
    const creatureIds = filteredCreaturesModeObjects.map((object) => object.id);
    if (creatureIds.length < 1) {
      setActiveCreaturePreviewObjectId(null);
      return;
    }
    setActiveCreaturePreviewObjectId((current) =>
      current && creatureIds.includes(current) ? current : (creatureIds[0] ?? null)
    );
  }, [filteredCreaturesModeObjects, isCreaturesMode]);

  useEffect(() => {
    if (!isCreaturesMode) {
      setCreaturesSearchQuery("");
      setCreaturesPreviewError(null);
      setActiveCreaturePreviewObjectId(null);
      setCreaturesModeSceneSeed(null);
    }
  }, [isCreaturesMode]);

  useEffect(() => {
    if (!isCreaturesMode || !activeCreaturePreviewObject) {
      setCreaturesModeSceneSeed(null);
      setCreaturesPreviewError(null);
      return;
    }
    requestCreaturesModeRenderPayloadForObject(activeCreaturePreviewObject);
  }, [
    activeCreaturePreviewObject,
    isCreaturesMode,
    requestCreaturesModeRenderPayloadForObject
  ]);

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
  const handleCreaturePropertiesApplied = useCallback(
    (updatedObject: SceneObject, previousObject: SceneObject) => {
      if (
        updatedObject.kind !== "creatures" ||
        previousObject.kind !== "creatures" ||
        !updatedObject.id.startsWith("cre_wizard_")
      ) {
        return;
      }
      if (!creatureApiPort || !backendAccessToken) {
        setCreaturesCatalogError("Backend creature authoring is unavailable.");
        return;
      }

      const existingCustomObject = customCreatureTemplateObjects.find(
        (object) => object.id === updatedObject.id || object.resRef === previousObject.resRef
      );
      const sourceObject: SceneObject = {
        ...updatedObject,
        id: existingCustomObject?.id ?? updatedObject.id,
        source: {
          ...existingCustomObject?.source,
          ...updatedObject.source,
          type: "aurora_git",
          sourceKind: "creature"
        }
      };
      const payload = buildCreatureBlueprintCreatePayloadFromSceneObject(sourceObject);
      if (!payload) {
        setCreaturesCatalogError("Creature blueprint payload could not be built.");
        return;
      }

      const isPersistedBlueprint = Boolean(existingCustomObject?.source?.sourceFileType);
      const writeRequest = isPersistedBlueprint
        ? sourceObject.resRef !== previousObject.resRef
          ? creatureApiPort.renameCreatureBlueprint(
              backendAccessToken,
              previousObject.resRef,
              sourceObject.resRef
            )
          : creatureApiPort.updateCreatureBlueprint(backendAccessToken, previousObject.resRef, payload)
        : creatureApiPort.createCreatureBlueprint(backendAccessToken, payload);

      void writeRequest
        .then((updateResult) => {
          const sourceBackedObject: SceneObject = {
            ...sourceObject,
            source: {
              ...sourceObject.source,
              type: "aurora_git",
              sourceKind: "creature",
              sourceObjectId: updateResult.blueprint.templateId,
              templateId: updateResult.blueprint.templateId,
              sourceEtag: updateResult.blueprint.etag,
              sourceFileType: updateResult.blueprint.sourceFileType,
              sourceFileVersion: updateResult.blueprint.sourceFileVersion,
              localizedName: updateResult.blueprint.name,
              creatureMetadata: updateResult.creature.metadata
            }
          };
          creaturesCatalogClientCacheRef.current = null;
          setCustomCreatureTemplateObjects((current) => [
            sourceBackedObject,
            ...current.filter((object) => object.id !== sourceBackedObject.id)
          ]);
          trackTelemetryEvent("ui.workspace.creature_properties.blueprint_updated", {
            userId,
            objectId: sourceBackedObject.id,
            resRef: sourceBackedObject.resRef,
            objectKey: updateResult.blueprint.objectKey
          });
          requestCreaturesModeRenderPayloadForObject(sourceBackedObject);
        })
        .catch((error) => {
          const message = resolveCreaturesCatalogErrorMessage(error);
          setCreaturesCatalogError(message);
          trackTelemetryEvent("ui.workspace.creature_properties.blueprint_update_failed", {
            userId,
            objectId: updatedObject.id,
            resRef: previousObject.resRef,
            message,
            errorName: error instanceof Error ? error.name : "unknown"
          });
          if (isBackendInvalidSessionError(error)) {
            onBackendSessionInvalidated?.("creatures_catalog", backendAccessToken);
          }
        });
    },
    [
      backendAccessToken,
      creatureApiPort,
      customCreatureTemplateObjects,
      onBackendSessionInvalidated,
      requestCreaturesModeRenderPayloadForObject,
      trackTelemetryEvent,
      userId
    ]
  );

  const handleItemPropertiesApplied = useCallback(
    (updatedObject: SceneObject, previousObject: SceneObject) => {
      if (updatedObject.kind !== "items" || previousObject.kind !== "items") {
        return;
      }
      if (!itemApiPort || !backendAccessToken) {
        return;
      }

      const previousResRef = previousObject.resRef.trim().toLowerCase();
      const updatedResRef = updatedObject.resRef.trim().toLowerCase();
      const existingCustomObject = customItemTemplateObjects.find((object) => {
        const objectResRef = object.resRef.trim().toLowerCase();
        return objectResRef === previousResRef || objectResRef === updatedResRef;
      });

      const sourceObject: SceneObject = {
        ...updatedObject,
        id: existingCustomObject?.id ?? updatedObject.id,
        source: {
          ...existingCustomObject?.source,
          ...updatedObject.source,
          type: updatedObject.source?.type ?? existingCustomObject?.source?.type ?? "aurora_git",
          sourceKind: "item"
        }
      };
      const updatePayload = buildItemBlueprintCreatePayloadFromWizardSceneObject(sourceObject);
      if (!updatePayload) {
        return;
      }

      const writeRequest = existingCustomObject
        ? itemApiPort.updateItemBlueprint(backendAccessToken, previousObject.resRef, {
            ...updatePayload,
            overwrite: true
          })
        : itemApiPort.createItemBlueprint(backendAccessToken, {
            ...updatePayload,
            overwrite: true
          });

      void writeRequest
        .then((updateResult) => {
          const sourceBackedObject: SceneObject = {
            ...sourceObject,
            source: {
              ...sourceObject.source,
              type: "aurora_git",
              sourceKind: "item",
              sourceObjectId: updateResult.blueprint.templateId,
              templateId: updateResult.blueprint.templateId,
              sourceEtag: updateResult.blueprint.etag,
              sourceFileType: updateResult.blueprint.sourceFileType,
              sourceFileVersion: updateResult.blueprint.sourceFileVersion,
              sourceModelResRef: sourceObject.source?.sourceModelResRef ?? sourceObject.resRef,
              localizedName: updateResult.blueprint.name,
              description: sourceObject.itemProperties?.description
            }
          };
          const processedObject = mergeProcessedItemWizardSceneObject(
            sourceBackedObject,
            applyItemApiProcessResultToSceneObject(sourceBackedObject, updateResult)
          );
          itemsCatalogClientCacheRef.current = null;
          setCustomItemTemplateObjects((current) => [
            processedObject,
            ...current.filter(
              (object) =>
                object.id !== processedObject.id &&
                object.resRef.trim().toLowerCase() !== processedObject.resRef.trim().toLowerCase()
            )
          ]);
          setProcessedItemPreviewObjectsById((current) => ({
            ...current,
            [processedObject.id]: processedObject,
            [updatedObject.id]: processedObject
          }));
          trackTelemetryEvent("ui.workspace.item_properties.blueprint_updated", {
            userId,
            objectId: updatedObject.id,
            resRef: processedObject.resRef,
            objectKey: updateResult.blueprint.objectKey
          });
        })
        .catch((error) => {
          const message = resolveItemsCatalogErrorMessage(error);
          setItemsCatalogError(message);
          trackTelemetryEvent("ui.workspace.item_properties.blueprint_update_failed", {
            userId,
            objectId: updatedObject.id,
            resRef: previousObject.resRef,
            message,
            errorName: error instanceof Error ? error.name : "unknown"
          });
          if (isBackendInvalidSessionError(error)) {
            onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
          }
        });
    },
    [
      backendAccessToken,
      customItemTemplateObjects,
      itemApiPort,
      onBackendSessionInvalidated,
      trackTelemetryEvent,
      userId
    ]
  );

  const areaPlaceableRenderPayloadQueueSnapshotJson = areaPlaceableRenderPayloadQueueSnapshot
    ? JSON.stringify(areaPlaceableRenderPayloadQueueSnapshot)
    : undefined;
  const itemsRightPanelCreatorStatus =
    itemsCreatorStatus === "applying" || itemsPreviewStatus === "applying"
      ? "applying"
      : "idle";
  return (
    <section
      className={`workspace-layout${viewportFullscreen ? " is-viewport-fullscreen" : ""}`}
      aria-label="workspace layout"
      data-viewport-fullscreen={viewportFullscreen ? "true" : "false"}
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
      data-area-runtime-capture-terrain-only-object-payload-skip={
        areaRuntimeCaptureTerrainOnlyObjectPayloadSkip ? "true" : "false"
      }
      data-area-tile-process-request-phase={areaTileProcessRequestPhase}
      data-area-tile-process-current-scene-key={
        currentAreaTileProcessSceneKey?.replaceAll("\u0000", "|") ?? "none"
      }
      data-area-tile-process-readiness-scene-key={
        areaTileProcessReadinessSceneKey?.replaceAll("\u0000", "|") ?? "none"
      }
      data-area-tile-process-port-ready={tileApiPort ? "true" : "false"}
      data-area-tile-process-token-ready={backendAccessToken ? "true" : "false"}
      data-area-tile-process-mode={activeBuilderModeId}
    >
      {isSoundsMode ? (
        <SoundsModeAudioStage
          activeSound={activeSound}
          loadedSounds={soundsCatalogTotal}
          playbackState={soundPlaybackState}
        />
      ) : (
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
            catalogScope={sceneObjectCatalogScope}
            workspaceOptions={viewportWorkspaceOptions}
            leftPanelWidthPx={leftPanelWidthPx}
            rightPanelWidthPx={rightPanelWidthPx}
            onSceneObjectsSnapshotChange={handleSceneObjectsSnapshotChange}
            onSelectionSnapshotChange={setSelectedObjectIdsSnapshot}
            onObjectAddPlacementModeChange={handleObjectAddPlacementModeChange}
            externalSceneSeed={externalSceneSeed}
            areaEditorMutationSignal={areaEditorMutationSignal}
            areaEditingTool={areaEditingTool}
            onAreaSceneDraftChange={handleAreaSceneDraftChange}
            onSelectedTileChange={handleSelectedAreaTileChange}
            renderObjectIds={renderObjectIds}
            areaCanvasLoading={areaCanvasLoading}
            areaTileProcessReadiness={currentAreaTileProcessReadiness}
            placeableRenderPayloadByObjectId={placeableRenderPayloadByObjectId}
            creatureRenderPayloadByObjectId={creatureRenderPayloadByObjectId}
            creatureResourceOptions={creatureResourceOptions}
            placeableAssetAccessToken={backendAccessToken}
            onItemPreviewObjectNeeded={(object) =>
              processItemsModePreviewObject(object, undefined, false)
            }
            onCreaturePropertiesApplied={handleCreaturePropertiesApplied}
            onItemPropertiesApplied={handleItemPropertiesApplied}
            showGizmoModeBadge={!isFocusedPreviewMode}
          />
          {viewportFullscreen && onExitViewportFullscreen ? (
            <button
              type="button"
              className="workspace-viewport-fullscreen-exit"
              onClick={onExitViewportFullscreen}
              aria-label="Exit viewport fullscreen"
              title="Exit viewport fullscreen"
            >
              Exit Fullscreen
            </button>
          ) : null}
        </section>
      )}

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
                  thumbnailRenderEnabled={placeablesModeThumbnailRenderEnabled}
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
              ) : isCreaturesMode ? (
                <CreaturesModePanel
                  objects={filteredCreaturesModeObjects}
                  total={creaturesCatalogTotal + customCreatureTemplateObjects.length}
                  activeObjectId={activeCreaturePreviewObjectId}
                  searchQuery={creaturesSearchQuery}
                  isLoading={creaturesCatalogStatus === "loading"}
                  loadErrorMessage={creaturesCatalogError}
                  previewErrorMessage={creaturesPreviewError}
                  thumbnailRenderEnabled={creaturesModeThumbnailRenderEnabled}
                  creationBaseObjects={creaturesModeObjects}
                  createSequence={creaturesCatalogTotal + customCreatureTemplateObjects.length + 1}
                  onSearchQueryChange={(value) => {
                    setCreaturesPreviewError(null);
                    setCreaturesSearchQuery(value);
                    trackTelemetryEvent("ui.workspace.creatures_mode.filter_changed", {
                      userId,
                      query: value
                    });
                  }}
                  onResetFilters={() => {
                    setCreaturesPreviewError(null);
                    setCreaturesSearchQuery("");
                    trackTelemetryEvent("ui.workspace.creatures_mode.filters_reset", {
                      userId
                    });
                  }}
                  onObjectClick={(clickedObject) => {
                    const objectId = clickedObject.id;
                    setActiveCreaturePreviewObjectId(objectId);
                    setSceneObjectCatalogScope({
                      sourceType: "creatures",
                      allowedObjectIds: [objectId]
                    });
                    trackTelemetryEvent("ui.workspace.creatures_mode.object_selected", {
                      userId,
                      objectId
                    });
                    requestCreaturesModeRenderPayloadForObject(clickedObject);
                  }}
                  onCreateCreature={async (createdObject) => {
                    setCreaturesSearchQuery("");
                    setCreaturesPreviewError(null);
                    setCreaturesCatalogError(null);
                    if (!creatureApiPort || !backendAccessToken) {
                      const message = "Backend creature authoring is unavailable.";
                      setCreaturesCatalogError(message);
                      throw new Error(message);
                    }
                    const createPayload = buildCreatureBlueprintCreatePayloadFromSceneObject(
                      createdObject
                    );
                    if (!createPayload) {
                      const message = "Creature blueprint payload could not be built.";
                      setCreaturesCatalogError(message);
                      throw new Error(message);
                    }
                    let createResult;
                    try {
                      createResult = await creatureApiPort.createCreatureBlueprint(
                        backendAccessToken,
                        createPayload
                      );
                    } catch (error) {
                      const message = resolveCreaturesCatalogErrorMessage(error);
                      setCreaturesCatalogError(message);
                      trackTelemetryEvent("ui.workspace.creatures_mode.creature_create_failed", {
                        userId,
                        objectId: createdObject.id,
                        resRef: createdObject.resRef,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("creatures_catalog", backendAccessToken);
                      }
                      throw error;
                    }
                    const sourceBackedObject: SceneObject = {
                      ...createdObject,
                      source: {
                        ...createdObject.source,
                        type: "aurora_git",
                        sourceKind: "creature",
                        sourceObjectId: createResult.blueprint.templateId,
                        templateId: createResult.blueprint.templateId,
                        sourceEtag: createResult.blueprint.etag,
                        sourceFileType: createResult.blueprint.sourceFileType,
                        sourceFileVersion: createResult.blueprint.sourceFileVersion,
                        localizedName: createResult.blueprint.name,
                        creatureMetadata: createResult.creature.metadata
                      }
                    };
                    creaturesCatalogClientCacheRef.current = null;
                    setCustomCreatureTemplateObjects((current) => [
                      sourceBackedObject,
                      ...current.filter((object) => object.id !== sourceBackedObject.id)
                    ]);
                    setActiveCreaturePreviewObjectId(sourceBackedObject.id);
                    setSceneObjectCatalogScope({
                      sourceType: "creatures",
                      allowedObjectIds: [sourceBackedObject.id]
                    });
                    trackTelemetryEvent("ui.workspace.creatures_mode.creature_created", {
                      userId,
                      objectId: sourceBackedObject.id,
                      resRef: sourceBackedObject.resRef,
                      templateId: createResult.blueprint.templateId,
                      objectKey: createResult.blueprint.objectKey
                    });
                    requestCreaturesModeRenderPayloadForObject(sourceBackedObject);
                  }}
                  onDeleteCreature={async (deletedObject) => {
                    const removeDeletedObject = () => {
                      setCustomCreatureTemplateObjects((current) =>
                        current.filter((object) => object.id !== deletedObject.id)
                      );
                      setCreatureAnimationSelectionsByObjectId((current) => {
                        const remaining = { ...current };
                        delete remaining[deletedObject.id];
                        return remaining;
                      });
                      if (activeCreaturePreviewObjectId === deletedObject.id) {
                        setActiveCreaturePreviewObjectId(null);
                        setSceneObjectCatalogScope({
                          sourceType: "creatures",
                          allowedObjectIds: []
                        });
                        setCreaturesModeSceneSeed(null);
                        setCreaturesPreviewError(null);
                      }
                    };
                    const shouldDeleteBackendBlueprint =
                      deletedObject.source?.sourceFileType === "UTC " ||
                      deletedObject.source?.sourceFileType === "UTC";
                    if (shouldDeleteBackendBlueprint) {
                      if (!creatureApiPort || !backendAccessToken) {
                        const message = "Backend creature authoring is unavailable.";
                        setCreaturesCatalogError(message);
                        throw new Error(message);
                      }
                      try {
                        const deleteResult = await creatureApiPort.deleteCreatureBlueprint(
                          backendAccessToken,
                          deletedObject.resRef
                        );
                        creaturesCatalogClientCacheRef.current = null;
                        removeDeletedObject();
                        trackTelemetryEvent("ui.workspace.creatures_mode.creature_deleted", {
                          userId,
                          objectId: deletedObject.id,
                          resRef: deleteResult.resref,
                          objectKey: deleteResult.objectKey
                        });
                      } catch (error) {
                        const message = resolveCreaturesCatalogErrorMessage(error);
                        setCreaturesCatalogError(message);
                        if (isBackendInvalidSessionError(error)) {
                          onBackendSessionInvalidated?.("creatures_catalog", backendAccessToken);
                        }
                        throw error;
                      }
                      return;
                    }

                    removeDeletedObject();
                    trackTelemetryEvent("ui.workspace.creatures_mode.creature_deleted", {
                      userId,
                      objectId: deletedObject.id,
                      resRef: deletedObject.resRef
                    });
                  }}
                />
              ) : isItemsMode ? (
                <ItemsModePanel
                  objects={filteredItemsModeObjects}
                  total={itemsCatalogTotal + customItemTemplateObjects.length}
                  activeObjectId={activeItemPreviewObjectId}
                  searchQuery={itemsSearchQuery}
                  isLoading={itemsCatalogStatus === "loading"}
                  loadErrorMessage={itemsCatalogError}
                  creationBaseObjects={itemCreationBaseObjects}
                  propertyDictionary={itemsPropertyDictionary}
                  paletteTree={itemsPaletteTree}
                  generatorSupport={itemsGeneratorSupport}
                  processedPreviewObjectsById={processedItemPreviewObjectsById}
                  previewThumbnailUrlsByObjectId={itemPreviewThumbnailUrlsById}
                  stores={storesCatalogItems}
                  createSequence={itemsCatalogTotal + customItemTemplateObjects.length + 1}
                  storeCreateSequence={storesCatalogItems.length + 1}
                  storeCreatorStatus={itemsCreatorStatus}
                  storeCreatorErrorMessage={itemsCreatorError}
                  backendAccessToken={backendAccessToken}
                  onSearchQueryChange={(value) => {
                    setItemsSearchQuery(value);
                    trackTelemetryEvent("ui.workspace.items_mode.filter_changed", {
                      userId,
                      query: value
                    });
                  }}
                  onResetFilters={() => {
                    setItemsSearchQuery("");
                    trackTelemetryEvent("ui.workspace.items_mode.filters_reset", {
                      userId
                    });
                  }}
                  onObjectClick={(clickedObject) => {
                    const objectId = clickedObject.id;
                    setActiveItemPreviewObjectId(objectId);
                    setSceneObjectCatalogScope({
                      sourceType: "items",
                      allowedObjectIds: [objectId]
                    });
                    trackTelemetryEvent("ui.workspace.items_mode.object_selected", {
                      userId,
                      objectId
                    });
                  }}
                  onCreateItem={async (createdObject, options) => {
                    setItemsSearchQuery("");
                    setItemsCreatorError(null);
                    setItemsCatalogError(null);
                    if (!itemApiPort || !backendAccessToken) {
                      setItemsCreatorError("Backend items catalog is unavailable.");
                      return;
                    }
                    const createPayload = buildItemBlueprintCreatePayloadFromWizardSceneObject(
                      createdObject,
                      { overwrite: options?.overwrite ?? false }
                    );
                    if (!createPayload) {
                      setItemsCreatorError("Item blueprint is missing a valid base item.");
                      return;
                    }

                    setItemsCreatorStatus("applying");
                    try {
                      const createResult = await itemApiPort.createItemBlueprint(
                        backendAccessToken,
                        createPayload
                      );
                      const sourceBackedObject: SceneObject = {
                        ...createdObject,
                        source: {
                          ...createdObject.source,
                          type: "aurora_git",
                          sourceKind: "item",
                          sourceObjectId: createResult.blueprint.templateId,
                          templateId: createResult.blueprint.templateId,
                          sourceEtag: createResult.blueprint.etag,
                          sourceFileType: createResult.blueprint.sourceFileType,
                          sourceFileVersion: createResult.blueprint.sourceFileVersion,
                          sourceModelResRef:
                            createdObject.source?.sourceModelResRef ?? createdObject.resRef,
                          localizedName: createResult.blueprint.name,
                          description: createdObject.itemProperties?.description
                        }
                      };
                      const processedObject = mergeProcessedItemWizardSceneObject(
                        sourceBackedObject,
                        applyItemApiProcessResultToSceneObject(sourceBackedObject, createResult)
                      );
                      itemsCatalogClientCacheRef.current = null;
                      setCustomItemTemplateObjects((current) => [
                        processedObject,
                        ...current.filter((object) => object.id !== processedObject.id)
                      ]);
                      setProcessedItemPreviewObjectsById((current) => ({
                        ...current,
                        [processedObject.id]: processedObject
                      }));
                      setActiveItemPreviewObjectId(processedObject.id);
                      setSceneObjectCatalogScope({
                        sourceType: "items",
                        allowedObjectIds: [processedObject.id]
                      });
                      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));
                      trackTelemetryEvent("ui.workspace.items_mode.item_created", {
                        userId,
                        objectId: processedObject.id,
                        resRef: processedObject.resRef,
                        inheritedTemplateId: processedObject.source?.templateId,
                        baseItem: processedObject.itemProperties?.baseItem ?? null,
                        objectKey: createResult.blueprint.objectKey
                      });
                    } catch (error) {
                      const message = resolveItemsCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      setItemsCatalogError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.item_create_failed", {
                        userId,
                        objectId: createdObject.id,
                        resRef: createdObject.resRef,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
                      }
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onUpdateItem={async (resRef, updatedObject) => {
                    setItemsCreatorError(null);
                    setItemsCatalogError(null);
                    if (!itemApiPort || !backendAccessToken) {
                      const message = "Backend items catalog is unavailable.";
                      setItemsCreatorError(message);
                      throw new Error(message);
                    }
                    const updatePayload =
                      buildItemBlueprintCreatePayloadFromWizardSceneObject(updatedObject);
                    if (!updatePayload) {
                      const message = "Item blueprint is missing a valid base item.";
                      setItemsCreatorError(message);
                      throw new Error(message);
                    }

                    const existingObject = customItemTemplateObjects.find(
                      (object) =>
                        object.resRef.trim().toLowerCase() === resRef.trim().toLowerCase()
                    );
                    const sourceObject: SceneObject = existingObject
                      ? {
                          ...updatedObject,
                          id: existingObject.id,
                          source: {
                            ...existingObject.source,
                            ...updatedObject.source,
                            type:
                              updatedObject.source?.type ??
                              existingObject.source?.type ??
                              "aurora_git"
                          }
                        }
                      : updatedObject;
                    setItemsCreatorStatus("applying");
                    try {
                      const updateResult = await itemApiPort.updateItemBlueprint(
                        backendAccessToken,
                        resRef,
                        {
                          ...updatePayload,
                          overwrite: true
                        }
                      );
                      const sourceBackedObject: SceneObject = {
                        ...sourceObject,
                        source: {
                          ...sourceObject.source,
                          type: "aurora_git",
                          sourceKind: "item",
                          sourceObjectId: updateResult.blueprint.templateId,
                          templateId: updateResult.blueprint.templateId,
                          sourceEtag: updateResult.blueprint.etag,
                          sourceFileType: updateResult.blueprint.sourceFileType,
                          sourceFileVersion: updateResult.blueprint.sourceFileVersion,
                          sourceModelResRef:
                            sourceObject.source?.sourceModelResRef ?? sourceObject.resRef,
                          localizedName: updateResult.blueprint.name,
                          description: sourceObject.itemProperties?.description
                        }
                      };
                      const processedObject = mergeProcessedItemWizardSceneObject(
                        sourceBackedObject,
                        applyItemApiProcessResultToSceneObject(sourceBackedObject, updateResult)
                      );
                      itemsCatalogClientCacheRef.current = null;
                      setCustomItemTemplateObjects((current) => [
                        processedObject,
                        ...current.filter(
                          (object) =>
                            object.id !== processedObject.id &&
                            object.resRef.trim().toLowerCase() !==
                              processedObject.resRef.trim().toLowerCase()
                        )
                      ]);
                      setProcessedItemPreviewObjectsById((current) => ({
                        ...current,
                        [processedObject.id]: processedObject
                      }));
                      setActiveItemPreviewObjectId(processedObject.id);
                      setSceneObjectCatalogScope({
                        sourceType: "items",
                        allowedObjectIds: [processedObject.id]
                      });
                      setItemsModeSceneSeed(buildItemPreviewSceneFromObject(processedObject));
                      trackTelemetryEvent("ui.workspace.items_mode.item_updated", {
                        userId,
                        objectId: processedObject.id,
                        resRef: processedObject.resRef,
                        objectKey: updateResult.blueprint.objectKey
                      });
                    } catch (error) {
                      const message = resolveItemsCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      setItemsCatalogError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.item_update_failed", {
                        userId,
                        resRef,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
                      }
                      throw error;
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onCreateStore={async (payload: StoreApiBlueprintCreatePayload) => {
                    setItemsCreatorError(null);
                    if (!storeApiPort || !backendAccessToken) {
                      const message = "Backend stores catalog is unavailable.";
                      setItemsCreatorError(message);
                      throw new Error(message);
                    }
                    setItemsCreatorStatus("applying");
                    try {
                      const createResult = await storeApiPort.createStoreBlueprint(
                        backendAccessToken,
                        payload
                      );
                      storesCatalogClientCacheRef.current = null;
                      setStoresCatalogItems((current) => [
                        createResult.store,
                        ...current.filter(
                          (store) => store.templateId !== createResult.store.templateId
                        )
                      ]);
                      trackTelemetryEvent("ui.workspace.items_mode.store_created", {
                        userId,
                        resRef: createResult.blueprint.resref,
                        templateId: createResult.blueprint.templateId,
                        objectKey: createResult.blueprint.objectKey
                      });
                    } catch (error) {
                      const message = resolveStoresCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.store_create_failed", {
                        userId,
                        resRef: payload.resRef,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("stores_catalog", backendAccessToken);
                      }
                      throw error;
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onUpdateStore={async (
                    resRef: string,
                    payload: StoreApiBlueprintCreatePayload
                  ) => {
                    setItemsCreatorError(null);
                    if (!storeApiPort || !backendAccessToken) {
                      const message = "Backend stores catalog is unavailable.";
                      setItemsCreatorError(message);
                      throw new Error(message);
                    }
                    setItemsCreatorStatus("applying");
                    try {
                      const updateResult = await storeApiPort.updateStoreBlueprint(
                        backendAccessToken,
                        resRef,
                        payload
                      );
                      storesCatalogClientCacheRef.current = null;
                      setStoresCatalogItems((current) => [
                        updateResult.store,
                        ...current.filter(
                          (store) => store.templateId !== updateResult.store.templateId
                        )
                      ]);
                      trackTelemetryEvent("ui.workspace.items_mode.store_updated", {
                        userId,
                        resRef: updateResult.blueprint.resref,
                        templateId: updateResult.blueprint.templateId,
                        objectKey: updateResult.blueprint.objectKey
                      });
                    } catch (error) {
                      const message = resolveStoresCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.store_update_failed", {
                        userId,
                        resRef,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("stores_catalog", backendAccessToken);
                      }
                      throw error;
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onDeleteStore={async (store) => {
                    setItemsCreatorError(null);
                    if (!storeApiPort || !backendAccessToken) {
                      const message = "Backend stores catalog is unavailable.";
                      setItemsCreatorError(message);
                      throw new Error(message);
                    }
                    setItemsCreatorStatus("applying");
                    try {
                      const deleteResult = await storeApiPort.deleteStoreBlueprint(
                        backendAccessToken,
                        store.resref
                      );
                      storesCatalogClientCacheRef.current = null;
                      setStoresCatalogItems((current) =>
                        current.filter(
                          (entry) =>
                            entry.resref !== deleteResult.resref &&
                            entry.templateId !== store.templateId
                        )
                      );
                      trackTelemetryEvent("ui.workspace.items_mode.store_deleted", {
                        userId,
                        resRef: deleteResult.resref,
                        objectKey: deleteResult.objectKey
                      });
                    } catch (error) {
                      const message = resolveStoresCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.store_delete_failed", {
                        userId,
                        resRef: store.resref,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("stores_catalog", backendAccessToken);
                      }
                      throw error;
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onWriteCustomPalette={async (payload: ItemApiCustomPaletteWritePayload) => {
                    setItemsCreatorError(null);
                    if (!itemApiPort || !backendAccessToken) {
                      setItemsCreatorError("Backend items catalog is unavailable.");
                      return;
                    }
                    setItemsCreatorStatus("applying");
                    try {
                      const writeResult = await itemApiPort.writeCustomItemPalette(
                        backendAccessToken,
                        payload
                      );
                      setItemsPaletteTree(writeResult.tree);
                      trackTelemetryEvent("ui.workspace.items_mode.custom_palette_written", {
                        userId,
                        objectKey: writeResult.palette.objectKey,
                        leafCount: writeResult.palette.leafCount,
                        rootCount: writeResult.palette.rootCount
                      });
                    } catch (error) {
                      const message = resolveItemsCatalogErrorMessage(error);
                      setItemsCreatorError(message);
                      trackTelemetryEvent("ui.workspace.items_mode.custom_palette_write_failed", {
                        userId,
                        message,
                        errorName: error instanceof Error ? error.name : "unknown"
                      });
                      if (isBackendInvalidSessionError(error)) {
                        onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
                      }
                    } finally {
                      setItemsCreatorStatus("idle");
                    }
                  }}
                  onDeleteItem={async (deletedObject) => {
                    const removeDeletedObject = () => {
                      setCustomItemTemplateObjects((current) =>
                        current.filter((object) => object.id !== deletedObject.id)
                      );
                      setProcessedItemPreviewObjectsById((current) => {
                        const next = { ...current };
                        delete next[deletedObject.id];
                        return next;
                      });
                      if (activeItemPreviewObjectId === deletedObject.id) {
                        setActiveItemPreviewObjectId(null);
                        setSceneObjectCatalogScope({
                          sourceType: "items",
                          allowedObjectIds: []
                        });
                        setItemsModeSceneSeed(null);
                        setItemsCreatorError(null);
                      }
                    };
                    const shouldDeleteBackendBlueprint =
                      deletedObject.source?.sourceFileType === "UTI " ||
                      deletedObject.source?.sourceFileType === "UTI";
                    if (shouldDeleteBackendBlueprint) {
                      if (!itemApiPort || !backendAccessToken) {
                        const message = "Backend items catalog is unavailable.";
                        setItemsCreatorError(message);
                        throw new Error(message);
                      }
                      setItemsCreatorStatus("applying");
                      try {
                        const deleteResult = await itemApiPort.deleteItemBlueprint(
                          backendAccessToken,
                          deletedObject.resRef
                        );
                        itemsCatalogClientCacheRef.current = null;
                        removeDeletedObject();
                        trackTelemetryEvent("ui.workspace.items_mode.item_deleted", {
                          userId,
                          objectId: deletedObject.id,
                          resRef: deleteResult.resref,
                          objectKey: deleteResult.objectKey
                        });
                      } catch (error) {
                        const message = resolveItemsCatalogErrorMessage(error);
                        setItemsCreatorError(message);
                        setItemsCatalogError(message);
                        trackTelemetryEvent("ui.workspace.items_mode.item_delete_failed", {
                          userId,
                          objectId: deletedObject.id,
                          resRef: deletedObject.resRef,
                          message,
                          errorName: error instanceof Error ? error.name : "unknown"
                        });
                        if (isBackendInvalidSessionError(error)) {
                          onBackendSessionInvalidated?.("items_catalog", backendAccessToken);
                        }
                        throw error;
                      } finally {
                        setItemsCreatorStatus("idle");
                      }
                      return;
                    }

                    removeDeletedObject();
                    trackTelemetryEvent("ui.workspace.items_mode.item_deleted", {
                      userId,
                      objectId: deletedObject.id,
                      resRef: deletedObject.resRef
                    });
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
                  creatureTemplateObjects={creatureTemplateObjects}
                  activeMode={activeBuilderMode}
                  backendAccessToken={backendAccessToken}
                  areaApiPort={areaApiPort}
                  tileApiPort={tileApiPort}
                  areaListClientCacheRef={areaListClientCacheRef}
                  sceneObjectCatalogQueryFacade={sceneObjectCatalogQueryFacade}
                  placeableRenderPayloadByTemplateId={placeableRenderPayloadByTemplateId}
                  placeableAssetAccessToken={backendAccessToken}
                  itemPaletteTree={itemsPaletteTree}
                  thumbnailRenderEnabled={areaThumbnailRenderEnabled}
                  openedAreaScene={areaSceneSeed}
                  selectedAreaTileId={selectedAreaTileId}
                  selectedAreaTileIds={selectedAreaTileIds}
                  areaTileProcessReadiness={currentAreaTileProcessReadiness}
                  areaEditingTool={areaEditingTool}
                  trackTelemetryEvent={trackTelemetryEvent}
                  onAreaCanvasLoadingChange={setAreaCanvasLoading}
                  onObjectCreate={handleSceneObjectCreate}
                  onPlaceablesWorkflowActiveChange={setIsAreasModeAddPlaceablesStepActive}
                  activeCreateObjectId={activeObjectAddTemplateId}
                  onAreaSceneSelected={(scene) => {
                    const scopedObjects = filterObjectsForWorkspaceMode(scene.objects, activeBuilderMode);
                    const nextTileProcessSceneKey = buildAreaTileProcessContractSceneKey(
                      scene.sceneId,
                      scene.tiles.map((tile) => tile.modelResRef)
                    );
                    setAreaEditorMutationSignal(null);
                    setAreaEditingTool(DEFAULT_AURORA_AREA_EDITING_TOOL);
                    if (nextTileProcessSceneKey !== currentAreaTileProcessSceneKey) {
                      acceptedAreaTileProcessSceneKeyRef.current = null;
                      setAreaTileProcessReadiness(null);
                      setAreaTileProcessReadinessSceneKey(null);
                      setAreaTileProcessRequestPhase("idle");
                    }
                    setAreaSceneSeed(scene);
                    setSceneObjectsSnapshot(scene.objects);
                    setSelectedObjectIdsSnapshot([]);
                    setSceneObjectCatalogScope({
                      sourceType: activeBuilderMode.defaultListType,
                      allowedObjectIds: scopedObjects.map((object) => object.id)
                    });
                  }}
                  onAreaSceneMutation={handleAreaSceneMutation}
                  onAreaEditingToolChange={setAreaEditingTool}
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
          ) : isCreaturesMode ? (
            <CreaturesModeRightPanel
              activePayload={activeCreatureRenderPayload}
              activePreviewObject={activeCreaturesInspectorObject}
              previewErrorMessage={creaturesPreviewError}
              onSelectedAnimationNameChange={updateCreaturePreviewAnimationSelection}
              onSelectedAnimationStateChange={updateCreaturePreviewAnimationState}
            />
          ) : isItemsMode ? (
            <ItemsModeRightPanel
              activePreviewObject={activeItemPreviewObject}
              sourcePreviewObject={activeItemCatalogObject}
              loadedItems={itemsCatalogTotal + customItemTemplateObjects.length}
              creatorStatus={itemsRightPanelCreatorStatus}
              creatorErrorMessage={itemsCreatorError}
              onApplyVisualOverride={handleApplyItemVisualOverride}
              onResetVisualOverride={handleResetItemVisualOverride}
              onCreateConfiguredItem={handleCreateConfiguredItemFromWizard}
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
              thumbnailRenderEnabled={areaThumbnailRenderEnabled}
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
