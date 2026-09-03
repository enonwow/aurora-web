import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { AreaScene, SceneObject } from "../../scene/contracts";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type {
  AreaApiDetail,
  AreaApiListItem,
  AreaApiTileInstance
} from "../../areas/contracts";
import type { AreaApiPort } from "../../areas/ports/areaApiPort";
import { mapBackendAreaToScene } from "../../areas/application/areaSceneMapper";
import type { AreaLifecycleFacade } from "../../areas/application/areaLifecycleFacade";
import type { AreaCreateFacade } from "../../areas/application/areaCreateFacade";
import type { AreaDeleteFacade } from "../../areas/application/areaDeleteFacade";
import type { AreaRenameFacade } from "../../areas/application/areaRenameFacade";
import {
  resolveAreaDeleteAdmission,
  resolveAreaResRefFromAreaId
} from "../../areas/application/areaDeleteAdmission";
import { resolveAreaRenameAdmission } from "../../areas/application/areaRenameAdmission";
import type {
  AreaDeletePreview,
  AreaDeletePreviewCommand
} from "../../areas/areaDeleteContracts";
import type {
  AreaRenamePreview,
  AreaRenamePreviewCommand
} from "../../areas/areaRenameContracts";
import { resolveAreaWorkspaceDraft } from "../../areas/application/areaWorkspaceDraft";
import type { AreaWorkspaceDraftDocument } from "../../areas/areaWorkspaceDraftContracts";
import type { AreaDraftSessionRegistry } from "../../areas/ports/areaLifecyclePort";
import type { AreaWorkspaceStatusEvent } from "../../areas/application/areaWorkspaceStatus";
import {
  resolveAreaTextureAtlasReadiness,
  type AreaTextureAtlasReadiness
} from "../../areas/application/areaTextureAtlasReadiness";
import {
  resolveAreaTileProcessContractReadiness,
  type AreaTileProcessContractReadiness
} from "../../tiles/application/areaTileProcessContractReadiness";
import type { TileApiPort } from "../../tiles/ports/tileApiPort";
import type { WorkspaceAreaCanvasLoadingState } from "./WorkspaceCanvasViewport";
import {
  AreaContextMenu,
  type AreaContextMenuAction
} from "./AreaContextMenu";
import { ThumbnailHoverPreview } from "./ThumbnailHoverPreview";

interface AreaSelectionPanelProps {
  userId: string;
  backendAccessToken: string | null;
  areaApiPort: AreaApiPort;
  areaCreateFacade?: AreaCreateFacade;
  areaDeleteFacade?: AreaDeleteFacade;
  areaRenameFacade?: AreaRenameFacade;
  areaLifecycleFacade?: AreaLifecycleFacade<AreaWorkspaceDraftDocument>;
  areaDraftSessionRegistry?: AreaDraftSessionRegistry;
  tileApiPort?: TileApiPort;
  areaListClientCacheRef: { current: AreaListClientCacheEntry | null };
  hidden?: boolean;
  trackTelemetryEvent: (name: string, payload?: TelemetryPayload) => void;
  creatureTemplateObjects?: readonly SceneObject[];
  objectTemplateObjects?: readonly SceneObject[];
  onDraftCreated?: () => void;
  canDeleteAreas?: boolean;
  canRenameAreas?: boolean;
  onAreaDeleted?: (areaId: string) => void;
  onAreaRenamed?: (sourceAreaId: string, targetAreaId: string, moduleRevision: string) => void;
  onAreaWorkspaceStatusChange?: (event: AreaWorkspaceStatusEvent) => void;
  onAreaSceneSelected: (scene: AreaScene, area: AreaApiListItem) => void;
  onAreaCanvasLoadingChange?: (loading: WorkspaceAreaCanvasLoadingState | null) => void;
  onTileProcessReadinessChange?: (
    readiness: AreaTileProcessContractReadiness | null
  ) => void;
}

type AreaPanelStatus = "idle" | "loading" | "ready" | "error";

interface AreaContextMenuState {
  areaId: string;
  x: number;
  y: number;
}

interface AreaDeletePreviewState {
  readonly areaId: string;
  readonly areaName: string;
  readonly command: AreaDeletePreviewCommand;
  readonly preview: AreaDeletePreview;
  readonly idempotencyKey: string;
}

interface AreaRenamePreviewState {
  readonly areaId: string;
  readonly areaName: string;
  readonly command: AreaRenamePreviewCommand;
  readonly preview: AreaRenamePreview;
  readonly idempotencyKey: string;
}

export interface AreaListClientCacheEntry {
  accessToken: string;
  apiPort: AreaApiPort;
  items: AreaApiListItem[];
  expiresAtMs: number;
}

const AREA_LIST_CLIENT_CACHE_TTL_MS = 60_000;
const AREA_LIST_BATCH_SIZE = 100;
const AREA_LIST_RENDER_BATCH_SIZE = 100;
const AREA_TERRAIN_READINESS_SAMPLE_LIMIT = 6;
const AREA_CONTEXT_MENU_WIDTH_PX = 236;
const AREA_CONTEXT_MENU_HEIGHT_PX = 252;
const AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX = 8;
const AREA_THUMBNAIL_HOVER_PREVIEW_SIZE = 144;
const AREA_TILE_ASSET_CONTRACT_PATH =
  "ARE TileList -> SET modelResRef -> catalog/tiles tile_<modelResRef> -> tile process/cache -> MDL source key / GLB geometry / texture-material contract";
const AREA_TILE_RENDER_LOADER_HANDOFF_PATH =
  "ARE TileList -> SET modelResRef -> tile sourceAsset/renderAssetContract -> renderer loader handoff";
const AREA_TILE_RENDER_GLB_GEOMETRY_BLOCKER =
  "blocked_tile_process_contract_missing_glb_geometry";
const AREA_TILE_RENDER_MATERIAL_BINDING_BLOCKER =
  "blocked_tile_process_contract_missing_material_bindings";
const AREA_TILE_RENDER_LOADER_OUTPUT_BLOCKER = "blocked_tile_loader_output_not_proven";
const AREA_TILE_MODEL_GEOMETRY_LOADER_BLOCKER =
  "blocked_tile_model_geometry_loader_missing";

function createAreaDraftOpenIdempotencyKey(): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `area-draft-open:${randomId}`
    : `area-draft-open:${Date.now()}:${Math.random().toString(16).slice(2)}`;
}

function createAreaDeleteOpaqueId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `${prefix}-${randomId}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createAreaRenameOpaqueId(prefix: string): string {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId
    ? `${prefix}-${randomId}`
    : `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatAreaDeleteFailure(error: Readonly<{
  code: string;
  message: string;
  details: readonly Readonly<{ path: string; reason: string }>[];
}>): string {
  const details = error.details.map((entry) => `${entry.path}: ${entry.reason}`).join("; ");
  return `${error.code}: ${error.message}${details ? ` (${details})` : ""}`;
}

function formatAreaRenameFailure(error: Readonly<{
  code: string;
  message: string;
  details: readonly Readonly<{ path: string; reason: string }>[];
}>): string {
  const details = error.details.map((entry) => `${entry.path}: ${entry.reason}`).join("; ");
  return `${error.code}: ${error.message}${details ? ` (${details})` : ""}`;
}

function resolveAreaDeleteWorkspaceFailureCode(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const [candidate] = error.message.split(":", 1);
  return candidate && /^[A-Z][A-Z0-9_]*$/u.test(candidate) ? candidate : fallback;
}

type AreaTerrainReadinessStatus =
  | "blocked_missing_tile_data"
  | "blocked_tile_model_metadata_incomplete"
  | "source_backed_tile_model_bridge_ready";

interface AreaTerrainReadiness {
  areaId: string;
  tilesetResRef: string;
  status: AreaTerrainReadinessStatus;
  tileCount: number;
  modelResolvedCount: number;
  modelMissingCount: number;
  fallbackTileCount: number;
  modelSourceCounts: Record<string, number>;
  tilePlacementSample: string;
  modelResRefSample: string;
  bridgeDisclosure: string;
  loaderBlocker: string;
  tileAssetContractPath: string;
  tileAssetContractStatus:
    | "derived_tile_catalog_candidates_unverified"
    | "blocked_no_tile_model_resrefs";
  tileCatalogCandidateIdsSample: string;
  tileAssetContractSample: string;
  tileProcessContractStatus:
    | "not_requested_frontend_area_runtime_missing_tile_process_contract"
    | "blocked_no_tile_catalog_candidate_ids";
  tileTextureContractStatus:
    | "area_texture_atlas_metadata_present_per_tile_material_contract_missing"
    | "blocked_tile_material_texture_contract_missing";
  tileAssetContractBlockers: string;
  tileRenderLoaderHandoffPath: string;
  tileRenderLoaderHandoffStatus:
    | "blocked_bridge_only_no_tile_model_loader_contract"
    | "blocked_no_tile_model_resrefs";
  tileRenderGeometryMode:
    | "source_backed_bridge_not_model_geometry"
    | "not_rendered_until_source_data_ready";
  tileRenderGlbGeometryStatus:
    | "blocked_tile_process_contract_missing_glb_geometry"
    | "blocked_no_tile_model_resrefs";
  tileRenderMaterialBindingStatus:
    | "blocked_tile_process_contract_missing_material_bindings"
    | "blocked_tile_material_texture_contract_missing"
    | "blocked_no_tile_model_resrefs";
  tileRenderLoaderOutputStatus:
    | "blocked_tile_loader_output_not_proven"
    | "blocked_no_tile_model_resrefs";
  tileRenderRendererHandoffStatus:
    | "blocked_tile_model_geometry_loader_missing"
    | "blocked_no_tile_model_resrefs";
  tileBridgeParityStatus:
    | "non_parity_source_backed_bridge"
    | "blocked_no_tile_model_resrefs";
  tileRenderContractBlockers: string;
}

function formatAreaMeta(area: AreaApiListItem): string {
  return `${area.biome} | ${area.width}x${area.height} | ${area.objectCounts.total} objects`;
}

function formatAreaObjectBreakdown(area: AreaApiListItem): string {
  const counts = area.objectCounts;
  const countEntries = [
    { label: "placeable", count: counts.placeables },
    { label: "door", count: counts.doors },
    { label: "creature", count: counts.creatures },
    { label: "item", count: counts.items },
    { label: "sound", count: counts.sounds }
  ];
  const parts = countEntries
    .filter((entry) => entry.count > 0)
    .map((entry) => `${entry.count} ${entry.label}${entry.count === 1 ? "" : "s"}`);
  return parts.length > 0 ? parts.join(", ") : "No placed objects";
}

function encodePreviewSvg(value: string): string {
  return value
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
}

function escapePreviewSvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function createAreaPreviewFallbackDataUrl(area: AreaApiListItem): string {
  const label = escapePreviewSvgText(
    area.name.trim().slice(0, 10) || area.areaId.slice(0, 10)
  );
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1728" stroke="#34557d" stroke-width="2" />
      <rect x="6" y="7" width="36" height="25" rx="3" fill="#15324b" stroke="#4b6f99" />
      <path d="M10 12 H38 M10 18 H38 M10 24 H38 M16 9 V30 M24 9 V30 M32 9 V30" stroke="#5f9cff" stroke-opacity="0.35" stroke-width="1" />
      <circle cx="18" cy="17" r="2" fill="#8bd3ff" />
      <circle cx="29" cy="24" r="2" fill="#ffc970" />
      <text x="24" y="42" text-anchor="middle" font-family="Segoe UI" font-size="7" fill="#c8d9ee">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodePreviewSvg(svg)}`;
}

interface AreaPreviewImageProps {
  area: AreaApiListItem;
}

function AreaPreviewImage({ area }: AreaPreviewImageProps) {
  const providedPreviewImageUrl = area.previewImageUrl.trim();
  const fallbackPreviewImageUrl = useMemo(
    () => createAreaPreviewFallbackDataUrl(area),
    [area.areaId, area.name]
  );
  const [previewImageUrl, setPreviewImageUrl] = useState(providedPreviewImageUrl);
  const displayPreviewImageUrl = previewImageUrl || fallbackPreviewImageUrl;

  useEffect(() => {
    setPreviewImageUrl(providedPreviewImageUrl);
  }, [providedPreviewImageUrl]);

  if (providedPreviewImageUrl.length < 1) {
    return (
      <ThumbnailHoverPreview
        className="scene-object-thumbnail scene-object-thumbnail-rendered area-preview-thumbnail"
        expandedImageUrl={fallbackPreviewImageUrl}
        previewSize={AREA_THUMBNAIL_HOVER_PREVIEW_SIZE}
      >
        <span
          className="scene-object-row-preview-placeholder"
          role="img"
          aria-label={`${area.name} preview unavailable`}
        >
          No preview
        </span>
      </ThumbnailHoverPreview>
    );
  }

  return (
    <ThumbnailHoverPreview
      className="scene-object-thumbnail scene-object-thumbnail-rendered area-preview-thumbnail"
      expandedImageUrl={displayPreviewImageUrl}
      previewSize={AREA_THUMBNAIL_HOVER_PREVIEW_SIZE}
    >
      <img
        src={displayPreviewImageUrl}
        alt={`${area.name} preview`}
        onError={() => {
          if (previewImageUrl !== fallbackPreviewImageUrl) {
            setPreviewImageUrl(fallbackPreviewImageUrl);
          }
        }}
      />
    </ThumbnailHoverPreview>
  );
}

function buildAreaCanvasLoadingState(
  source: WorkspaceAreaCanvasLoadingState["source"],
  label: string,
  completed: number | null = null,
  total: number | null = null
): WorkspaceAreaCanvasLoadingState {
  return {
    source,
    label,
    completed,
    total: total && total > 0 ? total : null
  };
}

function resolveAreaContextMenuPosition(clientX: number, clientY: number): { x: number; y: number } {
  if (typeof window === "undefined") {
    return { x: clientX, y: clientY };
  }
  const maxX = Math.max(
    AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX,
    window.innerWidth - AREA_CONTEXT_MENU_WIDTH_PX - AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX
  );
  const maxY = Math.max(
    AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX,
    window.innerHeight - AREA_CONTEXT_MENU_HEIGHT_PX - AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX
  );
  return {
    x: Math.min(Math.max(clientX, AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX), maxX),
    y: Math.min(Math.max(clientY, AREA_CONTEXT_MENU_VIEWPORT_MARGIN_PX), maxY)
  };
}

function countAreaTileProcessCandidates(detail: AreaApiDetail): number {
  return new Set(
    (detail.tiles ?? [])
      .map((tile) => getTileModelResRef(tile).toLowerCase())
      .filter((modelResRef) => modelResRef.length > 0)
  ).size;
}

function formatLimitedSample(values: string[]): string {
  const uniqueValues = Array.from(
    new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))
  );
  if (uniqueValues.length < 1) {
    return "none";
  }
  const visibleValues = uniqueValues.slice(0, AREA_TERRAIN_READINESS_SAMPLE_LIMIT);
  const hiddenCount = uniqueValues.length - visibleValues.length;
  return hiddenCount > 0 ? `${visibleValues.join(", ")} +${hiddenCount}` : visibleValues.join(", ");
}

function formatTilePlacementSample(tile: AreaApiTileInstance): string {
  const tileId = typeof tile.tileId === "number" ? tile.tileId : `index ${tile.tileIndex}`;
  const orientation =
    typeof tile.orientation === "number" ? tile.orientation.toString() : "missing";
  const height = typeof tile.height === "number" ? tile.height.toString() : "missing";
  return `r${tile.row}/c${tile.col} id ${tileId} o${orientation} h${height}`;
}

function getTileModelResRef(tile: AreaApiTileInstance): string {
  return tile.modelResRef?.trim() ?? "";
}

function buildTileCatalogCandidateId(modelResRef: string): string {
  const normalized = modelResRef
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  return normalized ? `tile_${normalized}`.slice(0, 80) : "tile_missing_model_resref";
}

function formatTileAssetContractSample(tile: AreaApiTileInstance): string {
  const modelResRef = getTileModelResRef(tile).toLowerCase();
  const tileId = typeof tile.tileId === "number" ? tile.tileId.toString() : `index:${tile.tileIndex}`;
  const orientation =
    typeof tile.orientation === "number" ? tile.orientation.toString() : "missing";
  const height = typeof tile.height === "number" ? tile.height.toString() : "missing";
  return [
    `r${tile.row}`,
    `c${tile.col}`,
    `tile=${tileId}`,
    `model=${modelResRef || "missing"}`,
    `catalog=${modelResRef ? buildTileCatalogCandidateId(modelResRef) : "missing"}`,
    `orientation=${orientation}`,
    `height=${height}`,
    `source=${tile.modelSource ?? "missing"}`
  ].join(",");
}

function resolveAreaTerrainReadiness(detail: AreaApiDetail): AreaTerrainReadiness {
  const tiles = detail.tiles ?? [];
  const tileCount = tiles.length;
  const modelResolvedCount = tiles.filter((tile) => getTileModelResRef(tile).length > 0).length;
  const modelMissingCount = Math.max(tileCount - modelResolvedCount, 0);
  const fallbackTileCount = tiles.filter(
    (tile) => tile.fallbackReason?.trim().length
  ).length;
  const modelSourceCounts = tiles.reduce<Record<string, number>>((counts, tile) => {
    const key = tile.modelSource ?? "missing";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
  const status: AreaTerrainReadinessStatus =
    tileCount < 1
      ? "blocked_missing_tile_data"
      : modelMissingCount > 0
        ? "blocked_tile_model_metadata_incomplete"
        : "source_backed_tile_model_bridge_ready";
  const tilesetResRef =
    detail.tileSet?.trim() || tiles[0]?.tilesetResRef.trim() || "unknown";
  const tilePlacementSample = formatLimitedSample(tiles.map(formatTilePlacementSample));
  const modelResRefSample = formatLimitedSample(
    tiles.map((tile) => getTileModelResRef(tile) || "missing")
  );
  const modelResRefs = Array.from(
    new Set(
      tiles
        .map((tile) => getTileModelResRef(tile).toLowerCase())
        .filter((modelResRef) => modelResRef.length > 0)
    )
  );
  const tileCatalogCandidateIds = modelResRefs.map((modelResRef) =>
    buildTileCatalogCandidateId(modelResRef)
  );
  const hasModelResRefs = modelResRefs.length > 0;
  const hasAreaTextureAtlas = Boolean(
    detail.textureAtlas.objectKey && detail.textureAtlas.contentType && detail.textureAtlas.sizeBytes
  );
  const tileAssetContractBlockers =
    !hasModelResRefs
      ? "blocked_no_tile_model_resrefs"
      : [
          "tile_catalog_candidate_ids_derived_not_verified",
          "tile_process_contract_not_checked_until_readiness_action",
          "tile_mdl_source_asset_availability_not_verified",
          "missing_frontend_tile_glb_contract",
          "blocked_tile_model_geometry_loader_missing",
          hasAreaTextureAtlas
            ? "per_tile_material_texture_contract_missing"
            : "blocked_tile_material_texture_contract_missing"
        ].join(", ");
  const tileRenderContractBlockers =
    !hasModelResRefs
      ? "blocked_no_tile_model_resrefs"
      : [
          AREA_TILE_RENDER_GLB_GEOMETRY_BLOCKER,
          hasAreaTextureAtlas
            ? AREA_TILE_RENDER_MATERIAL_BINDING_BLOCKER
            : "blocked_tile_material_texture_contract_missing",
          AREA_TILE_RENDER_LOADER_OUTPUT_BLOCKER,
          AREA_TILE_MODEL_GEOMETRY_LOADER_BLOCKER
        ].join(", ");

  return {
    areaId: detail.areaId,
    tilesetResRef,
    status,
    tileCount,
    modelResolvedCount,
    modelMissingCount,
    fallbackTileCount,
    modelSourceCounts,
    tilePlacementSample,
    modelResRefSample,
    bridgeDisclosure: "source-backed local tile bridge",
    loaderBlocker: "blocked_tile_model_geometry_loader_missing",
    tileAssetContractPath: AREA_TILE_ASSET_CONTRACT_PATH,
    tileAssetContractStatus:
      hasModelResRefs
        ? "derived_tile_catalog_candidates_unverified"
        : "blocked_no_tile_model_resrefs",
    tileCatalogCandidateIdsSample: formatLimitedSample(tileCatalogCandidateIds),
    tileAssetContractSample: formatLimitedSample(
      tiles
        .filter((tile) => getTileModelResRef(tile).length > 0)
        .map(formatTileAssetContractSample)
    ),
    tileProcessContractStatus:
      modelResRefs.length > 0
        ? "not_requested_frontend_area_runtime_missing_tile_process_contract"
        : "blocked_no_tile_catalog_candidate_ids",
    tileTextureContractStatus: hasAreaTextureAtlas
      ? "area_texture_atlas_metadata_present_per_tile_material_contract_missing"
      : "blocked_tile_material_texture_contract_missing",
    tileAssetContractBlockers,
    tileRenderLoaderHandoffPath: AREA_TILE_RENDER_LOADER_HANDOFF_PATH,
    tileRenderLoaderHandoffStatus: hasModelResRefs
      ? "blocked_bridge_only_no_tile_model_loader_contract"
      : "blocked_no_tile_model_resrefs",
    tileRenderGeometryMode:
      status === "source_backed_tile_model_bridge_ready"
        ? "source_backed_bridge_not_model_geometry"
        : "not_rendered_until_source_data_ready",
    tileRenderGlbGeometryStatus: hasModelResRefs
      ? AREA_TILE_RENDER_GLB_GEOMETRY_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileRenderMaterialBindingStatus: hasModelResRefs
      ? hasAreaTextureAtlas
        ? AREA_TILE_RENDER_MATERIAL_BINDING_BLOCKER
        : "blocked_tile_material_texture_contract_missing"
      : "blocked_no_tile_model_resrefs",
    tileRenderLoaderOutputStatus: hasModelResRefs
      ? AREA_TILE_RENDER_LOADER_OUTPUT_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileRenderRendererHandoffStatus: hasModelResRefs
      ? AREA_TILE_MODEL_GEOMETRY_LOADER_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileBridgeParityStatus: hasModelResRefs
      ? "non_parity_source_backed_bridge"
      : "blocked_no_tile_model_resrefs",
    tileRenderContractBlockers
  };
}

function formatModelSourceCounts(counts: Record<string, number>): string {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  return entries.length > 0
    ? entries.map(([source, count]) => `${source} ${count}`).join(", ")
    : "none";
}

function formatAreaTerrainReadinessStatus(status: AreaTerrainReadinessStatus): string {
  switch (status) {
    case "source_backed_tile_model_bridge_ready":
      return "Source-backed bridge ready";
    case "blocked_tile_model_metadata_incomplete":
      return "Tile model metadata incomplete";
    case "blocked_missing_tile_data":
      return "Tile data missing";
  }
}

export function AreaSelectionPanel({
  userId,
  backendAccessToken,
  areaApiPort,
  areaCreateFacade,
  areaDeleteFacade,
  areaRenameFacade,
  areaLifecycleFacade,
  areaDraftSessionRegistry,
  tileApiPort,
  areaListClientCacheRef,
  hidden = false,
  trackTelemetryEvent,
  creatureTemplateObjects,
  objectTemplateObjects,
  onDraftCreated,
  canDeleteAreas = false,
  canRenameAreas = false,
  onAreaDeleted,
  onAreaRenamed,
  onAreaWorkspaceStatusChange,
  onAreaSceneSelected,
  onAreaCanvasLoadingChange,
  onTileProcessReadinessChange
}: AreaSelectionPanelProps) {
  const openDraftIdempotencyKeysRef = useRef<Record<string, string>>({});
  const [status, setStatus] = useState<AreaPanelStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [areas, setAreas] = useState<AreaApiListItem[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [isOpeningArea, setIsOpeningArea] = useState(false);
  const [isCheckingTerrainReadiness, setIsCheckingTerrainReadiness] = useState(false);
  const [isCheckingTextureReadiness, setIsCheckingTextureReadiness] = useState(false);
  const [textureReadiness, setTextureReadiness] =
    useState<AreaTextureAtlasReadiness | null>(null);
  const [terrainReadiness, setTerrainReadiness] =
    useState<AreaTerrainReadiness | null>(null);
  const [tileProcessReadiness, setTileProcessReadiness] =
    useState<AreaTileProcessContractReadiness | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [areaRenderLimit, setAreaRenderLimit] = useState(AREA_LIST_RENDER_BATCH_SIZE);
  const [areaContextMenu, setAreaContextMenu] = useState<AreaContextMenuState | null>(null);
  const [areaDeletePreview, setAreaDeletePreview] =
    useState<AreaDeletePreviewState | null>(null);
  const [areaDeleteConfirmation, setAreaDeleteConfirmation] = useState("");
  const [isPreviewingAreaDelete, setIsPreviewingAreaDelete] = useState(false);
  const [isDeletingArea, setIsDeletingArea] = useState(false);
  const [areaRenameTarget, setAreaRenameTarget] = useState("");
  const [areaRenamePreview, setAreaRenamePreview] =
    useState<AreaRenamePreviewState | null>(null);
  const [areaRenameSourceConfirmation, setAreaRenameSourceConfirmation] = useState("");
  const [areaRenameTargetConfirmation, setAreaRenameTargetConfirmation] = useState("");
  const [isPreviewingAreaRename, setIsPreviewingAreaRename] = useState(false);
  const [isRenamingArea, setIsRenamingArea] = useState(false);
  const selectedAreaIdRef = useRef<string | null>(null);
  const areaContextMenuRef = useRef<HTMLElement | null>(null);

  const publishTileProcessReadiness = useCallback(
    (readiness: AreaTileProcessContractReadiness | null) => {
      setTileProcessReadiness(readiness);
      onTileProcessReadinessChange?.(readiness);
    },
    [onTileProcessReadinessChange]
  );

  const selectArea = useCallback((areaId: string | null) => {
    selectedAreaIdRef.current = areaId;
    setSelectedAreaId(areaId);
    setAreaDeletePreview(null);
    setAreaDeleteConfirmation("");
    setAreaRenameTarget("");
    setAreaRenamePreview(null);
    setAreaRenameSourceConfirmation("");
    setAreaRenameTargetConfirmation("");
  }, []);

  const loadAreas = useCallback(async (forceRefresh = false) => {
    if (!backendAccessToken) {
      areaListClientCacheRef.current = null;
      onAreaCanvasLoadingChange?.(null);
      setStatus("idle");
      setAreas([]);
      selectArea(null);
      setErrorMessage(null);
      return;
    }

    const cachedAreas = areaListClientCacheRef.current;
    if (
      !forceRefresh &&
      cachedAreas &&
      cachedAreas.accessToken === backendAccessToken &&
      cachedAreas.apiPort === areaApiPort &&
      cachedAreas.expiresAtMs > Date.now()
    ) {
      setAreas(cachedAreas.items);
      setSelectedAreaId((current) => {
        const nextAreaId = current ?? cachedAreas.items[0]?.areaId ?? null;
        selectedAreaIdRef.current = nextAreaId;
        return nextAreaId;
      });
      setStatus("ready");
      setErrorMessage(null);
      return;
    }

    setStatus("loading");
    setErrorMessage(null);

    const aggregated: AreaApiListItem[] = [];
    const seenAreaIds = new Set<string>();
    let total: number | null = null;
    let offset = 0;

    try {
      while (true) {
        const response = await areaApiPort.listAreas(backendAccessToken, {
          limit: AREA_LIST_BATCH_SIZE,
          offset
        });
        total = total ?? response.total;
        let didAppend = false;
        response.items.forEach((area) => {
          const normalizedAreaId = area.areaId.trim().toLowerCase();
          if (seenAreaIds.has(normalizedAreaId)) {
            return;
          }
          seenAreaIds.add(normalizedAreaId);
          aggregated.push(area);
          didAppend = true;
        });
        if (didAppend) {
          setAreas([...aggregated]);
          setSelectedAreaId((current) => {
            const nextAreaId = current ?? aggregated[0]?.areaId ?? null;
            selectedAreaIdRef.current = nextAreaId;
            return nextAreaId;
          });
        }

        const pageCount = response.items.length;
        const consumedItems = offset + pageCount;
        if (pageCount === 0 || (total !== null && consumedItems >= total)) {
          break;
        }
        offset = consumedItems;
      }

      areaListClientCacheRef.current = {
        accessToken: backendAccessToken,
        apiPort: areaApiPort,
        items: aggregated,
        expiresAtMs: Date.now() + AREA_LIST_CLIENT_CACHE_TTL_MS
      };
      setAreas([...aggregated]);
      setSelectedAreaId((current) => {
        const nextAreaId = current ?? aggregated[0]?.areaId ?? null;
        selectedAreaIdRef.current = nextAreaId;
        return nextAreaId;
      });
      setStatus("ready");
      trackTelemetryEvent("ui.workspace.areas.loaded", {
        userId,
        total: total ?? aggregated.length
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load areas.";
      if (aggregated.length < 1) {
        setAreas([]);
        selectArea(null);
      }
      setStatus("error");
      setErrorMessage(message);
      trackTelemetryEvent("ui.workspace.areas.load_failed", {
        userId,
        message
      });
    }
  }, [
    areaApiPort,
    areaListClientCacheRef,
    backendAccessToken,
    onAreaCanvasLoadingChange,
    selectArea,
    trackTelemetryEvent,
    userId
  ]);

  useEffect(() => {
    void loadAreas();
  }, [loadAreas]);

  useEffect(() => {
    return () => onAreaCanvasLoadingChange?.(null);
  }, [onAreaCanvasLoadingChange]);

  const visibleAreas = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return areas;
    }
    return areas.filter((area) => {
      const tags = area.tags.join(" ").toLowerCase();
      return (
        area.name.toLowerCase().includes(normalizedQuery) ||
        area.areaId.toLowerCase().includes(normalizedQuery) ||
        area.biome.toLowerCase().includes(normalizedQuery) ||
        tags.includes(normalizedQuery)
      );
    });
  }, [areas, searchQuery]);
  const renderedAreas = useMemo(
    () => visibleAreas.slice(0, areaRenderLimit),
    [areaRenderLimit, visibleAreas]
  );

  useEffect(() => {
    setAreaRenderLimit(AREA_LIST_RENDER_BATCH_SIZE);
  }, [searchQuery]);

  const selectedArea = useMemo(
    () => visibleAreas.find((area) => area.areaId === selectedAreaId) ?? null,
    [selectedAreaId, visibleAreas]
  );

  const currentAreaDeleteAdmission = areaDeletePreview
    ? resolveAreaDeleteAdmission({
        moduleId: areaDeletePreview.command.moduleId,
        areaResRef: areaDeletePreview.command.areaResRef,
        moduleRevision: areaDeletePreview.command.expectedModuleRevision,
        preview: areaDeletePreview.preview,
        nowUnixMs: Date.now()
      })
    : null;

  const currentAreaRenameAdmission = areaRenamePreview
    ? resolveAreaRenameAdmission({
        moduleId: areaRenamePreview.command.moduleId,
        areaResRef: areaRenamePreview.command.areaResRef,
        targetAreaResRef: areaRenamePreview.command.targetAreaResRef,
        moduleRevision: areaRenamePreview.command.expectedModuleRevision,
        preview: areaRenamePreview.preview,
        nowUnixMs: Date.now()
      })
    : null;

  const previewAreaRename = useCallback(async () => {
    if (
      !selectedArea ||
      !backendAccessToken ||
      !canRenameAreas ||
      !areaCreateFacade ||
      !areaRenameFacade
    ) {
      return;
    }
    const areaResRef = resolveAreaResRefFromAreaId(selectedArea.areaId);
    const targetAreaResRef = areaRenameTarget;
    if (!areaResRef) {
      setErrorMessage("AREA_RENAME_INVALID: selected Area ID has no exact source ResRef.");
      return;
    }
    if (!/^[a-z0-9_]{1,16}$/u.test(targetAreaResRef) || targetAreaResRef === areaResRef) {
      setErrorMessage(
        "AREA_RENAME_INVALID: target ResRef must be 1-16 lowercase letters, digits, or underscores and differ from the source."
      );
      return;
    }
    setIsPreviewingAreaRename(true);
    setAreaRenamePreview(null);
    setAreaRenameSourceConfirmation("");
    setAreaRenameTargetConfirmation("");
    setErrorMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "validating",
      sceneId: selectedArea.areaId,
      occurredAtUnixMs: Date.now(),
      action: "rename"
    });
    try {
      const profiles = await areaCreateFacade.queries.getProfiles(backendAccessToken);
      if (!profiles.ok) throw new Error(formatAreaRenameFailure(profiles.error));
      const command: AreaRenamePreviewCommand = {
        schemaVersion: "area-rename-preview-command.v1",
        moduleId: profiles.value.moduleId,
        areaResRef,
        targetAreaResRef,
        expectedModuleRevision: profiles.value.moduleRevision,
        clientCommandId: createAreaRenameOpaqueId("area-rename-preview")
      };
      const result = await areaRenameFacade.commands.preview({
        accessToken: backendAccessToken,
        moduleId: command.moduleId,
        areaResRef,
        command
      });
      if (!result.ok) throw new Error(formatAreaRenameFailure(result.error));
      const admission = resolveAreaRenameAdmission({
        moduleId: command.moduleId,
        areaResRef,
        targetAreaResRef,
        moduleRevision: command.expectedModuleRevision,
        preview: result.value,
        nowUnixMs: Date.now()
      });
      if (!admission.allowed && admission.reason === "identity_mismatch") {
        throw new Error("AREA_RENAME_RESPONSE_INVALID: preview identity differs from the request.");
      }
      setAreaRenamePreview({
        areaId: selectedArea.areaId,
        areaName: selectedArea.name,
        command,
        preview: result.value,
        idempotencyKey: createAreaRenameOpaqueId("area-rename")
      });
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: admission.allowed ? "ready" : "blocked",
        sceneId: selectedArea.areaId,
        occurredAtUnixMs: Date.now(),
        action: "rename",
        ...(admission.allowed ? {} : { code: admission.reason })
      });
      trackTelemetryEvent("ui.workspace.areas.rename_previewed", {
        userId,
        areaId: selectedArea.areaId,
        targetAreaResRef,
        blockerCount: result.value.blockerCount,
        warningCount: result.value.warningCount
      });
    } catch (error) {
      const code = resolveAreaDeleteWorkspaceFailureCode(error, "AREA_RENAME_PREVIEW_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "failed",
        sceneId: selectedArea.areaId,
        occurredAtUnixMs: Date.now(),
        action: "rename",
        code
      });
      setErrorMessage(error instanceof Error ? error.message : "Area Rename preview failed.");
    } finally {
      setIsPreviewingAreaRename(false);
    }
  }, [
    areaCreateFacade,
    areaRenameFacade,
    areaRenameTarget,
    backendAccessToken,
    canRenameAreas,
    onAreaWorkspaceStatusChange,
    selectedArea,
    trackTelemetryEvent,
    userId
  ]);

  const renameAreaAtomically = useCallback(async () => {
    if (!areaRenamePreview || !areaRenameFacade || !backendAccessToken) return;
    const admission = resolveAreaRenameAdmission({
      moduleId: areaRenamePreview.command.moduleId,
      areaResRef: areaRenamePreview.command.areaResRef,
      targetAreaResRef: areaRenamePreview.command.targetAreaResRef,
      moduleRevision: areaRenamePreview.command.expectedModuleRevision,
      preview: areaRenamePreview.preview,
      nowUnixMs: Date.now()
    });
    if (
      !admission.allowed ||
      areaRenameSourceConfirmation !== areaRenamePreview.command.areaResRef ||
      areaRenameTargetConfirmation !== areaRenamePreview.command.targetAreaResRef
    ) {
      setErrorMessage(
        "Area Rename confirmation is stale, blocked, or does not match both source and target ResRefs."
      );
      return;
    }
    setIsRenamingArea(true);
    setErrorMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "materializing",
      sceneId: areaRenamePreview.areaId,
      occurredAtUnixMs: Date.now(),
      action: "rename"
    });
    try {
      const command = {
        schemaVersion: "area-rename-command.v1" as const,
        moduleId: areaRenamePreview.command.moduleId,
        areaResRef: areaRenamePreview.command.areaResRef,
        targetAreaResRef: areaRenamePreview.command.targetAreaResRef,
        expectedModuleRevision: areaRenamePreview.command.expectedModuleRevision,
        preview: { sha256: areaRenamePreview.preview.previewSha256 },
        confirmation: {
          sourceAreaResRef: areaRenamePreview.command.areaResRef,
          targetAreaResRef: areaRenamePreview.command.targetAreaResRef,
          policy: "block_on_references" as const
        },
        clientCommandId: createAreaRenameOpaqueId("area-rename-command")
      };
      const result = await areaRenameFacade.commands.rename({
        accessToken: backendAccessToken,
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        idempotencyKey: areaRenamePreview.idempotencyKey,
        command
      });
      if (!result.ok) throw new Error(formatAreaRenameFailure(result.error));
      const sourceAreaId = areaRenamePreview.areaId;
      const targetAreaId = `area_${command.targetAreaResRef}`;
      setAreas((current) => current.map((entry) =>
        entry.areaId === sourceAreaId
          ? { ...entry, areaId: targetAreaId, updatedAt: result.value.renamedAt }
          : entry
      ));
      areaListClientCacheRef.current = null;
      if (areaDraftSessionRegistry) {
        for (const [sceneId, session] of Object.entries(areaDraftSessionRegistry.current)) {
          if (
            sceneId === sourceAreaId ||
            session.productionSource?.provenance.areaId === sourceAreaId
          ) {
            delete areaDraftSessionRegistry.current[sceneId];
          }
        }
      }
      selectArea(targetAreaId);
      onAreaRenamed?.(sourceAreaId, targetAreaId, result.value.newModuleRevision);
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "verified",
        sceneId: sourceAreaId,
        occurredAtUnixMs: Date.now(),
        action: "rename"
      });
      trackTelemetryEvent("ui.workspace.areas.renamed", {
        userId,
        sourceAreaId,
        targetAreaId,
        moduleRevision: result.value.newModuleRevision,
        idempotencyStatus: result.metadata.idempotencyStatus
      });
    } catch (error) {
      const code = resolveAreaDeleteWorkspaceFailureCode(error, "AREA_RENAME_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "recovery",
        sceneId: areaRenamePreview.areaId,
        occurredAtUnixMs: Date.now(),
        action: "rename",
        code
      });
      setErrorMessage(error instanceof Error ? error.message : "Atomic Area Rename failed.");
    } finally {
      setIsRenamingArea(false);
    }
  }, [
    areaDraftSessionRegistry,
    areaListClientCacheRef,
    areaRenamePreview,
    areaRenameFacade,
    areaRenameSourceConfirmation,
    areaRenameTargetConfirmation,
    backendAccessToken,
    onAreaRenamed,
    onAreaWorkspaceStatusChange,
    selectArea,
    trackTelemetryEvent,
    userId
  ]);

  const previewAreaDelete = useCallback(async () => {
    if (
      !selectedArea ||
      !backendAccessToken ||
      !canDeleteAreas ||
      !areaCreateFacade ||
      !areaDeleteFacade
    ) {
      return;
    }
    const areaResRef = resolveAreaResRefFromAreaId(selectedArea.areaId);
    if (!areaResRef) {
      setErrorMessage("AREA_DELETE_INVALID: selected Area ID has no exact source ResRef.");
      return;
    }
    setIsPreviewingAreaDelete(true);
    setAreaDeletePreview(null);
    setAreaDeleteConfirmation("");
    setErrorMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "validating",
      sceneId: selectedArea.areaId,
      occurredAtUnixMs: Date.now(),
      action: "delete",
    });
    try {
      const profiles = await areaCreateFacade.queries.getProfiles(backendAccessToken);
      if (!profiles.ok) throw new Error(formatAreaDeleteFailure(profiles.error));
      const command: AreaDeletePreviewCommand = {
        schemaVersion: "area-delete-preview-command.v1",
        moduleId: profiles.value.moduleId,
        areaResRef,
        expectedModuleRevision: profiles.value.moduleRevision,
        clientCommandId: createAreaDeleteOpaqueId("area-delete-preview")
      };
      const result = await areaDeleteFacade.commands.preview({
        accessToken: backendAccessToken,
        moduleId: command.moduleId,
        areaResRef,
        command
      });
      if (!result.ok) throw new Error(formatAreaDeleteFailure(result.error));
      const admission = resolveAreaDeleteAdmission({
        moduleId: command.moduleId,
        areaResRef,
        moduleRevision: command.expectedModuleRevision,
        preview: result.value,
        nowUnixMs: Date.now()
      });
      if (!admission.allowed && admission.reason === "identity_mismatch") {
        throw new Error("AREA_DELETE_RESPONSE_INVALID: preview identity differs from the request.");
      }
      setAreaDeletePreview({
        areaId: selectedArea.areaId,
        areaName: selectedArea.name,
        command,
        preview: result.value,
        idempotencyKey: createAreaDeleteOpaqueId("area-delete")
      });
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: admission.allowed ? "ready" : "blocked",
        sceneId: selectedArea.areaId,
        occurredAtUnixMs: Date.now(),
        action: "delete",
        ...(admission.allowed ? {} : { code: admission.reason }),
      });
      trackTelemetryEvent("ui.workspace.areas.delete_previewed", {
        userId,
        areaId: selectedArea.areaId,
        blockerCount: result.value.blockerCount,
        warningCount: result.value.warningCount
      });
    } catch (error) {
      const code = resolveAreaDeleteWorkspaceFailureCode(
        error,
        "AREA_DELETE_PREVIEW_FAILED"
      );
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "failed",
        sceneId: selectedArea.areaId,
        occurredAtUnixMs: Date.now(),
        action: "delete",
        code,
      });
      setErrorMessage(
        error instanceof Error ? error.message : "Area Delete preview failed."
      );
    } finally {
      setIsPreviewingAreaDelete(false);
    }
  }, [
    areaCreateFacade,
    areaDeleteFacade,
    backendAccessToken,
    canDeleteAreas,
    onAreaWorkspaceStatusChange,
    selectedArea,
    trackTelemetryEvent,
    userId
  ]);

  const deleteAreaAtomically = useCallback(async () => {
    if (!areaDeletePreview || !areaDeleteFacade || !backendAccessToken) return;
    const admission = resolveAreaDeleteAdmission({
      moduleId: areaDeletePreview.command.moduleId,
      areaResRef: areaDeletePreview.command.areaResRef,
      moduleRevision: areaDeletePreview.command.expectedModuleRevision,
      preview: areaDeletePreview.preview,
      nowUnixMs: Date.now()
    });
    if (!admission.allowed || areaDeleteConfirmation !== areaDeletePreview.command.areaResRef) {
      setErrorMessage("Area Delete confirmation is stale, blocked, or does not match the ResRef.");
      return;
    }
    setIsDeletingArea(true);
    setErrorMessage(null);
    onAreaWorkspaceStatusChange?.({
      schemaVersion: "area-workspace-status.v1",
      lane: "materialization",
      state: "materializing",
      sceneId: areaDeletePreview.areaId,
      occurredAtUnixMs: Date.now(),
      action: "delete",
    });
    try {
      const command = {
        schemaVersion: "area-delete-command.v1" as const,
        moduleId: areaDeletePreview.command.moduleId,
        areaResRef: areaDeletePreview.command.areaResRef,
        expectedModuleRevision: areaDeletePreview.command.expectedModuleRevision,
        preview: { sha256: areaDeletePreview.preview.previewSha256 },
        confirmation: {
          areaResRef: areaDeletePreview.command.areaResRef,
          policy: "block_on_references" as const
        },
        clientCommandId: createAreaDeleteOpaqueId("area-delete-command")
      };
      const result = await areaDeleteFacade.commands.delete({
        accessToken: backendAccessToken,
        moduleId: command.moduleId,
        areaResRef: command.areaResRef,
        idempotencyKey: areaDeletePreview.idempotencyKey,
        command
      });
      if (!result.ok) throw new Error(formatAreaDeleteFailure(result.error));
      const deletedAreaId = areaDeletePreview.areaId;
      setAreas((current) => current.filter((entry) => entry.areaId !== deletedAreaId));
      areaListClientCacheRef.current = null;
      if (areaDraftSessionRegistry) {
        for (const [sceneId, session] of Object.entries(areaDraftSessionRegistry.current)) {
          if (
            sceneId === deletedAreaId ||
            session.productionSource?.provenance.areaId === deletedAreaId
          ) {
            delete areaDraftSessionRegistry.current[sceneId];
          }
        }
      }
      selectArea(null);
      onAreaDeleted?.(deletedAreaId);
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: "verified",
        sceneId: deletedAreaId,
        occurredAtUnixMs: Date.now(),
        action: "delete",
      });
      trackTelemetryEvent("ui.workspace.areas.deleted", {
        userId,
        areaId: deletedAreaId,
        moduleRevision: result.value.newModuleRevision,
        idempotencyStatus: result.metadata.idempotencyStatus
      });
    } catch (error) {
      const code = resolveAreaDeleteWorkspaceFailureCode(error, "AREA_DELETE_FAILED");
      onAreaWorkspaceStatusChange?.({
        schemaVersion: "area-workspace-status.v1",
        lane: "materialization",
        state: code.includes("CONFLICT") ? "conflict" : "recovery",
        sceneId: areaDeletePreview.areaId,
        occurredAtUnixMs: Date.now(),
        action: "delete",
        code,
      });
      setErrorMessage(error instanceof Error ? error.message : "Atomic Area Delete failed.");
    } finally {
      setIsDeletingArea(false);
    }
  }, [
    areaDeleteConfirmation,
    areaDeleteFacade,
    areaDeletePreview,
    areaDraftSessionRegistry,
    areaListClientCacheRef,
    backendAccessToken,
    onAreaDeleted,
    onAreaWorkspaceStatusChange,
    selectArea,
    trackTelemetryEvent,
    userId
  ]);

  const contextMenuArea = useMemo(
    () =>
      areaContextMenu
        ? areas.find((area) => area.areaId === areaContextMenu.areaId) ?? null
        : null,
    [areaContextMenu, areas]
  );

  const closeAreaContextMenu = useCallback(() => {
    setAreaContextMenu(null);
  }, []);

  useEffect(() => {
    if (!areaContextMenu) {
      return undefined;
    }

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".area-context-menu")) {
        return;
      }
      closeAreaContextMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeAreaContextMenu();
      }
    };
    const handleScroll = () => closeAreaContextMenu();

    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [areaContextMenu, closeAreaContextMenu]);

  useEffect(() => {
    if (!areaContextMenu) {
      return;
    }
    const firstEnabledMenuItem =
      areaContextMenuRef.current?.querySelector<HTMLButtonElement>(
        'button[role="menuitem"]:not(:disabled)'
      );
    firstEnabledMenuItem?.focus();
  }, [areaContextMenu]);

  useEffect(() => {
    setTextureReadiness(null);
    setTerrainReadiness(null);
    publishTileProcessReadiness(null);
  }, [backendAccessToken, publishTileProcessReadiness, selectedAreaId]);

  const runBackgroundTileReadinessCheck = useCallback(
    async (area: AreaApiListItem, detail: AreaApiDetail) => {
      if (!backendAccessToken || !tileApiPort) {
        return;
      }
      try {
        const nextTileProcessReadiness = await resolveAreaTileProcessContractReadiness(
          tileApiPort,
          backendAccessToken,
          detail,
          { bypassCache: false }
        );
        if (selectedAreaIdRef.current !== area.areaId) {
          return;
        }
        publishTileProcessReadiness(nextTileProcessReadiness);
      } catch (error) {
        if (selectedAreaIdRef.current !== area.areaId) {
          return;
        }
        publishTileProcessReadiness(null);
        const message =
          error instanceof Error
            ? error.message
            : "Tile process contract readiness failed after area open.";
        trackTelemetryEvent("ui.workspace.areas.open_tile_process_readiness_failed", {
          userId,
          areaId: area.areaId,
          message
        });
      }
    },
    [backendAccessToken, publishTileProcessReadiness, tileApiPort, trackTelemetryEvent, userId]
  );

  const openArea = useCallback(async (areaToOpen: AreaApiListItem | null) => {
    if (!backendAccessToken || !areaToOpen) {
      return;
    }

    setIsOpeningArea(true);
    onAreaCanvasLoadingChange?.(
      buildAreaCanvasLoadingState(
        "areas",
        `Opening ${areaToOpen.name}`,
        0,
        areaToOpen.objectCounts.total
      )
    );
    try {
      if (!areaLifecycleFacade || !areaDraftSessionRegistry) {
        throw new Error("Local Area draft storage is unavailable.");
      }
      const idempotencyKey =
        openDraftIdempotencyKeysRef.current[areaToOpen.areaId] ??
        createAreaDraftOpenIdempotencyKey();
      openDraftIdempotencyKeysRef.current[areaToOpen.areaId] = idempotencyKey;
      const copyResult = await areaLifecycleFacade.commands.openProductionAreaAsDraft({
        schemaVersion: "area-draft-open.v1",
        areaId: areaToOpen.areaId,
        draftTitle: `${areaToOpen.name} - Working Copy`,
        idempotencyKey
      });
      if (!copyResult.ok) {
        throw new Error(copyResult.error.message);
      }
      const resolvedDraft = resolveAreaWorkspaceDraft(copyResult.value.draft.payload);
      if (!resolvedDraft || !resolvedDraft.productionSource) {
        throw new Error("The copy-on-open response contains an invalid production Area snapshot.");
      }
      delete openDraftIdempotencyKeysRef.current[areaToOpen.areaId];
      const detail = resolvedDraft.productionSource.sourceArea;
      const nextTerrainReadiness = resolveAreaTerrainReadiness(detail);
      setTerrainReadiness(nextTerrainReadiness);
      let nextTileProcessStatus = "not_checked";
      publishTileProcessReadiness(null);
      const scene =
        creatureTemplateObjects?.length || objectTemplateObjects?.length
          ? mapBackendAreaToScene(detail, undefined, {
              creatureTemplateObjects,
              objectTemplateObjects
            })
          : resolvedDraft.scene;
      areaDraftSessionRegistry.current[scene.sceneId] = {
        draftId: copyResult.value.draftId,
        revision: copyResult.value.revision,
        normalizedSha256: copyResult.value.normalizedSha256,
        persistedSceneUpdatedAtUnixMs: scene.updatedAtUnixMs,
        productionSource: resolvedDraft.productionSource
      };
      onDraftCreated?.();
      onAreaSceneSelected(scene, areaToOpen);
      if (tileApiPort) {
        nextTileProcessStatus = "background_requested";
        void runBackgroundTileReadinessCheck(areaToOpen, detail);
      }
      trackTelemetryEvent("ui.workspace.areas.opened", {
        userId,
        areaId: areaToOpen.areaId,
        objectCount: detail.objects.length,
        terrainStatus: nextTerrainReadiness.status,
        tileCount: nextTerrainReadiness.tileCount,
        tileModelResolvedCount: nextTerrainReadiness.modelResolvedCount,
        tileModelMissingCount: nextTerrainReadiness.modelMissingCount,
        tileModelSourceSummary: formatModelSourceCounts(nextTerrainReadiness.modelSourceCounts),
        tileProcessContractStatus: nextTileProcessStatus,
        draftId: copyResult.value.draftId,
        draftRevision: copyResult.value.revision,
        idempotencyStatus: copyResult.metadata.idempotencyStatus
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open area.";
      setTerrainReadiness(null);
      publishTileProcessReadiness(null);
      setErrorMessage(message);
      setStatus("error");
      trackTelemetryEvent("ui.workspace.areas.open_failed", {
        userId,
        areaId: areaToOpen.areaId,
        message
      });
    } finally {
      setIsOpeningArea(false);
      onAreaCanvasLoadingChange?.(null);
    }
  }, [
    areaDraftSessionRegistry,
    areaLifecycleFacade,
    backendAccessToken,
    creatureTemplateObjects,
    objectTemplateObjects,
    onDraftCreated,
    onAreaSceneSelected,
    onAreaCanvasLoadingChange,
    publishTileProcessReadiness,
    runBackgroundTileReadinessCheck,
    tileApiPort,
    trackTelemetryEvent,
    userId
  ]);

  const openSelectedArea = useCallback(async () => {
    await openArea(selectedArea);
  }, [openArea, selectedArea]);

  const openAreaFromRow = useCallback(
    (area: AreaApiListItem, source: "row_keyboard") => {
      selectArea(area.areaId);
      trackTelemetryEvent("ui.workspace.areas.row_open_shortcut", {
        userId,
        areaId: area.areaId,
        source
      });
      void openArea(area);
    },
    [openArea, selectArea, trackTelemetryEvent, userId]
  );

  const checkTerrainReadiness = useCallback(async (areaOverride?: AreaApiListItem) => {
    const areaToCheck = areaOverride ?? selectedArea;
    if (!backendAccessToken || !areaToCheck) {
      return;
    }

    setIsCheckingTerrainReadiness(true);
    setTerrainReadiness(null);
    onAreaCanvasLoadingChange?.(
      buildAreaCanvasLoadingState(
        "terrain",
        `Checking terrain for ${areaToCheck.name}`,
        0,
        areaToCheck.width * areaToCheck.height
      )
    );
    try {
      const detail = await areaApiPort.getAreaById(backendAccessToken, areaToCheck.areaId);
      const nextTerrainReadiness = resolveAreaTerrainReadiness(detail);
      setTerrainReadiness(nextTerrainReadiness);
      let nextTileProcessStatus = "not_checked";
      if (tileApiPort) {
        onAreaCanvasLoadingChange?.(
          buildAreaCanvasLoadingState(
            "terrain",
            `Checking tile assets for ${areaToCheck.name}`,
            0,
            countAreaTileProcessCandidates(detail)
          )
        );
        const nextTileProcessReadiness = await resolveAreaTileProcessContractReadiness(
          tileApiPort,
          backendAccessToken,
          detail,
          { bypassCache: true }
        );
        publishTileProcessReadiness(nextTileProcessReadiness);
        nextTileProcessStatus = nextTileProcessReadiness.status;
      } else {
        publishTileProcessReadiness(null);
      }
      trackTelemetryEvent("ui.workspace.areas.terrain_readiness_checked", {
        userId,
        areaId: areaToCheck.areaId,
        terrainStatus: nextTerrainReadiness.status,
        tileCount: nextTerrainReadiness.tileCount,
        tileModelResolvedCount: nextTerrainReadiness.modelResolvedCount,
        tileModelMissingCount: nextTerrainReadiness.modelMissingCount,
        tileModelSourceSummary: formatModelSourceCounts(nextTerrainReadiness.modelSourceCounts),
        tileProcessContractStatus: nextTileProcessStatus
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to check terrain readiness.";
      setTerrainReadiness(null);
      publishTileProcessReadiness(null);
      setErrorMessage(message);
      setStatus("error");
      trackTelemetryEvent("ui.workspace.areas.terrain_readiness_failed", {
        userId,
        areaId: areaToCheck.areaId,
        message
      });
    } finally {
      setIsCheckingTerrainReadiness(false);
      onAreaCanvasLoadingChange?.(null);
    }
  }, [
    areaApiPort,
    backendAccessToken,
    onAreaCanvasLoadingChange,
    publishTileProcessReadiness,
    selectedArea,
    tileApiPort,
    trackTelemetryEvent,
    userId
  ]);

  const checkTextureReadiness = useCallback(async (
    deliveryMode: "proxy" | "direct",
    areaOverride?: AreaApiListItem
  ) => {
    const areaToCheck = areaOverride ?? selectedArea;
    if (!backendAccessToken || !areaToCheck) {
      return;
    }

    setIsCheckingTextureReadiness(true);
    setTextureReadiness(null);
    onAreaCanvasLoadingChange?.(
      buildAreaCanvasLoadingState(
        "textures",
        `Checking texture atlas for ${areaToCheck.name}`
      )
    );
    try {
      const readiness = await resolveAreaTextureAtlasReadiness(
        areaApiPort,
        backendAccessToken,
        areaToCheck.areaId,
        { deliveryMode }
      );
      setTextureReadiness(readiness);
      trackTelemetryEvent("ui.workspace.areas.texture_readiness_checked", {
        userId,
        areaId: areaToCheck.areaId,
        status: readiness.status,
        deliveryMode
      });
    } finally {
      setIsCheckingTextureReadiness(false);
      onAreaCanvasLoadingChange?.(null);
    }
  }, [
    areaApiPort,
    backendAccessToken,
    onAreaCanvasLoadingChange,
    selectedArea,
    trackTelemetryEvent,
    userId
  ]);

  const openAreaContextMenuAt = useCallback(
    (
      area: AreaApiListItem,
      clientX: number,
      clientY: number,
      source: "row_context" | "row_action"
    ) => {
      const position = resolveAreaContextMenuPosition(clientX, clientY);
      selectArea(area.areaId);
      setAreaContextMenu({
        areaId: area.areaId,
        x: position.x,
        y: position.y
      });
      trackTelemetryEvent("ui.workspace.areas.row_context_menu", {
        userId,
        areaId: area.areaId,
        source
      });
    },
    [selectArea, trackTelemetryEvent, userId]
  );

  const openAreaContextMenu = useCallback(
    (area: AreaApiListItem, event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      openAreaContextMenuAt(area, event.clientX, event.clientY, "row_context");
    },
    [openAreaContextMenuAt]
  );

  const openAreaActionMenu = useCallback(
    (area: AreaApiListItem, event: ReactMouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      openAreaContextMenuAt(area, rect.right, rect.bottom, "row_action");
    },
    [openAreaContextMenuAt]
  );

  const runAreaContextMenuAction = useCallback(
    (action: AreaContextMenuAction) => {
      const area = contextMenuArea;
      closeAreaContextMenu();

      if (action === "refresh") {
        void loadAreas(true);
        trackTelemetryEvent("ui.workspace.areas.context_menu_action", {
          userId,
          action
        });
        return;
      }

      if (!area) {
        return;
      }

      selectArea(area.areaId);
      trackTelemetryEvent("ui.workspace.areas.context_menu_action", {
        userId,
        action,
        areaId: area.areaId
      });

      switch (action) {
        case "open":
          void openArea(area);
          break;
        case "terrain_readiness":
          void checkTerrainReadiness(area);
          break;
        case "texture_readiness":
          void checkTextureReadiness("proxy", area);
          break;
        case "direct_texture_delivery":
          void checkTextureReadiness("direct", area);
          break;
      }
    },
    [
      checkTerrainReadiness,
      checkTextureReadiness,
      closeAreaContextMenu,
      contextMenuArea,
      loadAreas,
      openArea,
      selectArea,
      trackTelemetryEvent,
      userId
    ]
  );

  const hasAreaSearchQuery = searchQuery.trim().length > 0;
  const areaResultLabel = hasAreaSearchQuery ? `${visibleAreas.length}/${areas.length}` : String(areas.length);

  return (
    <article
      className="sidebar-section scene-objects-section area-selection-panel"
      aria-label="area selection section"
      hidden={hidden}
    >
      <div className="area-selection-control-stack">
        <header className="scene-objects-header">
          <h2>Areas</h2>
          <span
            className="scene-objects-total"
            title={hasAreaSearchQuery ? "Filtered areas / all areas" : "All areas"}
          >
            {areaResultLabel}
          </span>
        </header>

        <div className="scene-objects-search">
          <input
            type="search"
            aria-label="Filter areas"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Filter by id / name / tag"
            disabled={!backendAccessToken}
          />
          {searchQuery ? (
            <button
              type="button"
              className="scene-objects-search-clear"
              aria-label="Clear area filter"
              title="Clear filter"
              onClick={() => setSearchQuery("")}
              disabled={!backendAccessToken}
            >
              X
            </button>
          ) : null}
        </div>

        {backendAccessToken ? (
          <div className="area-selection-quick-actions" aria-label="selected area quick actions">
            <span className="area-selection-quick-actions-label" title={selectedArea?.name ?? "Select an area"}>
              {selectedArea?.name ?? "Select an area"}
            </span>
            <button
              type="button"
              className="area-selection-quick-action-primary"
              aria-label="Open Selected Area"
              onClick={() => void openSelectedArea()}
              disabled={!selectedArea || isOpeningArea}
            >
              {isOpeningArea ? "Opening..." : "Open"}
            </button>
            <button
              type="button"
              className="area-selection-quick-action"
              aria-label="Selected area actions menu"
              aria-haspopup="menu"
              aria-expanded={selectedArea ? areaContextMenu?.areaId === selectedArea.areaId : false}
              title={selectedArea ? `Area actions for ${selectedArea.name}` : "Select an area first"}
              disabled={!selectedArea}
              onClick={(event) => {
                if (selectedArea) {
                  openAreaActionMenu(selectedArea, event);
                }
              }}
            >
              ...
            </button>
          </div>
        ) : null}
      </div>

      {!backendAccessToken ? (
        <p className="scene-objects-empty" role="alert">
          Backend session required to list areas.
        </p>
      ) : null}

      {backendAccessToken && status === "loading" ? (
        <p className="scene-objects-empty" role="status">Loading areas...</p>
      ) : null}

      {backendAccessToken && status === "error" && errorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {backendAccessToken && visibleAreas.length > 0 ? (
        <ul className="scene-object-list" aria-label="area list">
          {renderedAreas.map((area) => {
            const isSelected = area.areaId === selectedAreaId;
            return (
              <li key={area.areaId} className="area-selection-list-item">
                <button
                  type="button"
                  className={`scene-object-row ${isSelected ? "is-selected" : ""}`}
                  aria-selected={isSelected}
                  aria-pressed={isSelected}
                  aria-haspopup="menu"
                  aria-expanded={areaContextMenu?.areaId === area.areaId}
                  aria-keyshortcuts="Control+Enter Shift+Enter"
                  data-area-id={area.areaId}
                  data-area-name={area.name}
                  data-area-width={area.width}
                  data-area-height={area.height}
                  data-area-object-count={area.objectCounts.total}
                  data-area-placeable-count={area.objectCounts.placeables}
                  data-area-texture-atlas-id={area.textureAtlasId}
                  title={`${area.name} / click to select; use Open to load; right-click for area actions`}
                  onClick={() => {
                    selectArea(area.areaId);
                    trackTelemetryEvent("ui.workspace.areas.selected", {
                      userId,
                      areaId: area.areaId
                    });
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.ctrlKey || event.metaKey || event.shiftKey)
                    ) {
                      event.preventDefault();
                      openAreaFromRow(area, "row_keyboard");
                    }
                  }}
                  onContextMenu={(event) => openAreaContextMenu(area, event)}
                >
                  <AreaPreviewImage area={area} />
                  <span className="scene-object-row-meta">
                    <strong>{area.name}</strong>
                    <small>{formatAreaMeta(area)}</small>
                    <small>{formatAreaObjectBreakdown(area)}</small>
                    <small>Atlas {area.textureAtlasId}</small>
                  </span>
                </button>
                <button
                  type="button"
                  className="scene-object-row-action area-row-action-button"
                  aria-label="Open area actions menu"
                  aria-haspopup="menu"
                  aria-expanded={areaContextMenu?.areaId === area.areaId}
                  title={`Area actions for ${area.name}`}
                  onClick={(event) => openAreaActionMenu(area, event)}
                >
                  ...
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {backendAccessToken && renderedAreas.length < visibleAreas.length ? (
        <button
          type="button"
          className="topbar-btn area-selection-show-more"
          aria-label="Show more areas"
          onClick={() =>
            setAreaRenderLimit((current) =>
              Math.min(visibleAreas.length, current + AREA_LIST_RENDER_BATCH_SIZE)
            )
          }
        >
          Show more ({renderedAreas.length}/{visibleAreas.length})
        </button>
      ) : null}

      {backendAccessToken && status === "ready" && visibleAreas.length === 0 ? (
        <p className="scene-objects-empty" role="status">
          {hasAreaSearchQuery ? "No areas match the current filter." : "No areas available."}
        </p>
      ) : null}

      {areaContextMenu && contextMenuArea ? (
        <AreaContextMenu
          area={contextMenuArea}
          x={areaContextMenu.x}
          y={areaContextMenu.y}
          menuRef={areaContextMenuRef}
          canUseBackend={Boolean(backendAccessToken)}
          isOpeningArea={isOpeningArea}
          isCheckingTerrainReadiness={isCheckingTerrainReadiness}
          isCheckingTextureReadiness={isCheckingTextureReadiness}
          isRefreshingAreas={status === "loading"}
          onAction={runAreaContextMenuAction}
        />
      ) : null}

      <div className="area-selection-actions area-selection-diagnostics-actions" aria-label="area diagnostics actions">
        {canRenameAreas ? (
          <label>
            New Area ResRef
            <input
              aria-label="New Area ResRef"
              value={areaRenameTarget}
              autoComplete="off"
              maxLength={16}
              pattern="[a-z0-9_]{1,16}"
              disabled={!backendAccessToken || !selectedArea || isRenamingArea}
              onChange={(event) => {
                setAreaRenameTarget(event.target.value.trim().toLowerCase());
                setAreaRenamePreview(null);
                setAreaRenameSourceConfirmation("");
                setAreaRenameTargetConfirmation("");
              }}
            />
          </label>
        ) : null}

        <button
          type="button"
          className="topbar-btn"
          aria-label="Check Terrain Readiness"
          onClick={() => void checkTerrainReadiness()}
          disabled={!backendAccessToken || !selectedArea || isCheckingTerrainReadiness || isOpeningArea}
        >
          {isCheckingTerrainReadiness ? "Terrain..." : "Terrain"}
        </button>

        <button
          type="button"
          className="topbar-btn"
          aria-label="Check Texture Readiness"
          onClick={() => void checkTextureReadiness("proxy")}
          disabled={!backendAccessToken || !selectedArea || isCheckingTextureReadiness}
        >
          {isCheckingTextureReadiness ? "Texture..." : "Texture"}
        </button>

        <button
          type="button"
          className="topbar-btn"
          aria-label="Check Direct Texture Delivery"
          onClick={() => void checkTextureReadiness("direct")}
          disabled={!backendAccessToken || !selectedArea || isCheckingTextureReadiness}
        >
          Direct
        </button>

        <button
          type="button"
          className="topbar-btn"
          aria-label="Refresh Areas"
          onClick={() => void loadAreas(true)}
          disabled={!backendAccessToken || status === "loading"}
        >
          {status === "loading" ? "Refresh..." : "Refresh"}
        </button>

        {canDeleteAreas ? (
          <button
            type="button"
            className="topbar-btn"
            aria-label="Preview Area Delete"
            onClick={() => void previewAreaDelete()}
            disabled={
              !backendAccessToken ||
              !selectedArea ||
              !areaCreateFacade ||
              !areaDeleteFacade ||
              isPreviewingAreaDelete ||
              isDeletingArea ||
              isRenamingArea
            }
          >
            {isPreviewingAreaDelete ? "Previewing Delete..." : "Preview Delete"}
          </button>
        ) : null}

        {canRenameAreas ? (
          <button
            type="button"
            className="topbar-btn"
            aria-label="Preview Area Rename"
            onClick={() => void previewAreaRename()}
            disabled={
              !backendAccessToken ||
              !selectedArea ||
              !areaCreateFacade ||
              !areaRenameFacade ||
              !/^[a-z0-9_]{1,16}$/u.test(areaRenameTarget) ||
              areaRenameTarget === resolveAreaResRefFromAreaId(selectedArea.areaId) ||
              isPreviewingAreaRename ||
              isRenamingArea ||
              isDeletingArea
            }
          >
            {isPreviewingAreaRename ? "Previewing Rename..." : "Preview Rename"}
          </button>
        ) : null}
      </div>

      {errorMessage && status !== "error" ? (
        <p className="scene-objects-empty" role="alert">{errorMessage}</p>
      ) : null}

      {areaRenamePreview ? (
        <section
          className="scene-object-detail-panel area-rename-preview-panel"
          aria-label="Area Rename impact preview"
          data-area-rename-preview-sha256={areaRenamePreview.preview.previewSha256}
          data-area-rename-admission={
            currentAreaRenameAdmission?.allowed
              ? "allowed"
              : currentAreaRenameAdmission?.reason ?? "unavailable"
          }
        >
          <h3>Rename {areaRenamePreview.areaName}</h3>
          <p>
            {areaRenamePreview.command.areaResRef} → {areaRenamePreview.command.targetAreaResRef}
          </p>
          <p>
            Impact scan found {areaRenamePreview.preview.blockerCount} blocker(s) and{" "}
            {areaRenamePreview.preview.warningCount} warning(s).
          </p>
          {areaRenamePreview.preview.findings.length > 0 ? (
            <ul aria-label="Area Rename findings">
              {areaRenamePreview.preview.findings.map((finding, index) => (
                <li key={`${finding.code}:${finding.resourceKey}:${index}`}>
                  {finding.severity}: {finding.code} — {finding.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <p>
            This atomically moves the exact ARE/GIT/GIC triplet, rewrites the ARE root
            identity and verified IFO membership/entry fields, then requires persisted
            readback. Static references block the operation.
          </p>
          <label>
            Confirm source Area ResRef
            <input
              aria-label="Confirm source Area ResRef"
              value={areaRenameSourceConfirmation}
              autoComplete="off"
              onChange={(event) => setAreaRenameSourceConfirmation(event.target.value)}
            />
          </label>
          <label>
            Confirm target Area ResRef
            <input
              aria-label="Confirm target Area ResRef"
              value={areaRenameTargetConfirmation}
              autoComplete="off"
              onChange={(event) => setAreaRenameTargetConfirmation(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void renameAreaAtomically()}
            disabled={
              isRenamingArea ||
              currentAreaRenameAdmission?.allowed !== true ||
              areaRenameSourceConfirmation !== areaRenamePreview.command.areaResRef ||
              areaRenameTargetConfirmation !== areaRenamePreview.command.targetAreaResRef
            }
          >
            Rename Area atomically
          </button>
          {currentAreaRenameAdmission?.allowed === false ? (
            <p role="status">Rename blocked: {currentAreaRenameAdmission.reason}.</p>
          ) : null}
        </section>
      ) : null}

      {areaDeletePreview ? (
        <section
          className="scene-object-detail-panel area-delete-preview-panel"
          aria-label="Area Delete impact preview"
          data-area-delete-preview-sha256={areaDeletePreview.preview.previewSha256}
          data-area-delete-admission={
            currentAreaDeleteAdmission?.allowed
              ? "allowed"
              : currentAreaDeleteAdmission?.reason ?? "unavailable"
          }
        >
          <h3>Delete {areaDeletePreview.areaName}</h3>
          <p>
            Impact scan found {areaDeletePreview.preview.blockerCount} blocker(s) and{" "}
            {areaDeletePreview.preview.warningCount} warning(s).
          </p>
          {areaDeletePreview.preview.findings.length > 0 ? (
            <ul aria-label="Area Delete findings">
              {areaDeletePreview.preview.findings.map((finding, index) => (
                <li key={`${finding.code}:${finding.resourceKey}:${index}`}>
                  {finding.severity}: {finding.code} — {finding.reason}
                </li>
              ))}
            </ul>
          ) : null}
          <p>
            This removes the exact ARE/GIT/GIC triplet and one module membership. It does
            not cascade or repair references.
          </p>
          <label>
            Confirm Area ResRef
            <input
              aria-label="Confirm Area ResRef"
              value={areaDeleteConfirmation}
              autoComplete="off"
              onChange={(event) => setAreaDeleteConfirmation(event.target.value)}
            />
          </label>
          <button
            type="button"
            onClick={() => void deleteAreaAtomically()}
            disabled={
              isDeletingArea ||
              currentAreaDeleteAdmission?.allowed !== true ||
              areaDeleteConfirmation !== areaDeletePreview.command.areaResRef
            }
          >
            Delete Area atomically
          </button>
          {currentAreaDeleteAdmission?.allowed === false ? (
            <p role="status">Delete blocked: {currentAreaDeleteAdmission.reason}.</p>
          ) : null}
        </section>
      ) : null}

      {isCheckingTerrainReadiness ? (
        <p className="scene-objects-empty" role="status">Checking terrain readiness...</p>
      ) : null}

      {terrainReadiness ? (
        <section
          className="scene-object-detail-panel area-readiness-detail-panel"
          aria-label="area terrain readiness status"
          data-terrain-status={terrainReadiness.status}
          data-terrain-tile-count={terrainReadiness.tileCount}
          data-terrain-model-resolved-count={terrainReadiness.modelResolvedCount}
          data-terrain-model-missing-count={terrainReadiness.modelMissingCount}
          data-terrain-model-source-summary={formatModelSourceCounts(terrainReadiness.modelSourceCounts)}
          data-terrain-loader-blocker={terrainReadiness.loaderBlocker}
          data-terrain-tile-asset-contract-status={terrainReadiness.tileAssetContractStatus}
          data-terrain-tile-catalog-candidates={terrainReadiness.tileCatalogCandidateIdsSample}
          data-terrain-tile-process-contract-status={terrainReadiness.tileProcessContractStatus}
          data-terrain-tile-texture-contract-status={terrainReadiness.tileTextureContractStatus}
          data-terrain-tile-asset-contract-blockers={terrainReadiness.tileAssetContractBlockers}
          data-terrain-tile-render-loader-handoff-path={terrainReadiness.tileRenderLoaderHandoffPath}
          data-terrain-tile-render-loader-handoff-status={terrainReadiness.tileRenderLoaderHandoffStatus}
          data-terrain-tile-render-geometry-mode={terrainReadiness.tileRenderGeometryMode}
          data-terrain-tile-render-glb-geometry-status={terrainReadiness.tileRenderGlbGeometryStatus}
          data-terrain-tile-render-material-binding-status={terrainReadiness.tileRenderMaterialBindingStatus}
          data-terrain-tile-render-loader-output-status={terrainReadiness.tileRenderLoaderOutputStatus}
          data-terrain-tile-render-renderer-handoff-status={terrainReadiness.tileRenderRendererHandoffStatus}
          data-terrain-tile-bridge-parity-status={terrainReadiness.tileBridgeParityStatus}
          data-terrain-tile-render-contract-blockers={terrainReadiness.tileRenderContractBlockers}
          data-terrain-tile-process-real-status={tileProcessReadiness?.status ?? "not_checked"}
          data-terrain-tile-process-ready-count={tileProcessReadiness?.readyCandidateCount ?? 0}
          data-terrain-tile-process-blocked-count={tileProcessReadiness?.blockedCandidateCount ?? 0}
          data-terrain-tile-process-candidate-sample={tileProcessReadiness?.candidateSample ?? "none"}
          data-terrain-tile-process-blocker-summary={tileProcessReadiness?.blockerSummary ?? "not_checked"}
          data-terrain-tile-source-object-key-sample={tileProcessReadiness?.sourceObjectKeySample ?? "none"}
          data-terrain-tile-source-asset-contract-sample={tileProcessReadiness?.sourceAssetContractSample ?? "none"}
          data-terrain-tile-source-asset-ready-count={tileProcessReadiness?.sourceAssetReadyCount ?? 0}
          data-terrain-tile-source-asset-blocked-count={tileProcessReadiness?.sourceAssetBlockedCount ?? 0}
          data-terrain-tile-mdl-source-ready-count={tileProcessReadiness?.mdlSourceReadyCount ?? 0}
          data-terrain-tile-mdl-source-blocked-count={tileProcessReadiness?.mdlSourceBlockedCount ?? 0}
          data-terrain-tile-glb-geometry-ready-count={tileProcessReadiness?.glbGeometryReadyCount ?? 0}
          data-terrain-tile-glb-geometry-blocked-count={tileProcessReadiness?.glbGeometryBlockedCount ?? 0}
          data-terrain-tile-material-texture-ready-count={tileProcessReadiness?.materialTextureContractReadyCount ?? 0}
          data-terrain-tile-material-binding-blocked-count={tileProcessReadiness?.materialBindingBlockedCount ?? 0}
          data-terrain-tile-render-loader-ready-count={tileProcessReadiness?.renderLoaderReadyCount ?? 0}
          data-terrain-tile-render-loader-blocked-count={tileProcessReadiness?.renderLoaderBlockedCount ?? 0}
          data-terrain-tile-render-asset-contract-blockers={tileProcessReadiness?.renderAssetContractBlockerSummary ?? "not_checked"}
          data-terrain-tile-mdl-glb-material-blockers={tileProcessReadiness?.mdlGlbMaterialBlockerSummary ?? "not_checked"}
        >
          <header className="scene-object-detail-panel-header">
            <h3>Terrain Readiness</h3>
            <span
              className={`scene-object-source-status ${
                terrainReadiness.status === "source_backed_tile_model_bridge_ready"
                  ? "scene-object-source-status-source-backed"
                  : "scene-object-source-status-fallback"
              }`}
            >
              {terrainReadiness.status === "source_backed_tile_model_bridge_ready"
                ? "source-backed"
                : "blocked"}
            </span>
          </header>
          <dl className="scene-object-property-list area-readiness-property-list">
            <div>
              <dt>status</dt>
              <dd>{formatAreaTerrainReadinessStatus(terrainReadiness.status)}</dd>
            </div>
            <div>
              <dt>area</dt>
              <dd>{terrainReadiness.areaId}</dd>
            </div>
            <div>
              <dt>tileset</dt>
              <dd>{terrainReadiness.tilesetResRef}</dd>
            </div>
            <div>
              <dt>tiles</dt>
              <dd>{terrainReadiness.tileCount}</dd>
            </div>
            <div>
              <dt>models</dt>
              <dd>
                {terrainReadiness.modelResolvedCount}/{terrainReadiness.tileCount} resolved
                {terrainReadiness.modelMissingCount > 0
                  ? `, ${terrainReadiness.modelMissingCount} missing`
                  : ""}
              </dd>
            </div>
            <div>
              <dt>source</dt>
              <dd>{formatModelSourceCounts(terrainReadiness.modelSourceCounts)}</dd>
            </div>
            <div>
              <dt>fallback</dt>
              <dd>{terrainReadiness.fallbackTileCount}</dd>
            </div>
            <div>
              <dt>tile sample</dt>
              <dd>{terrainReadiness.tilePlacementSample}</dd>
            </div>
            <div>
              <dt>model refs</dt>
              <dd>{terrainReadiness.modelResRefSample}</dd>
            </div>
            <div>
              <dt>bridge</dt>
              <dd>{terrainReadiness.bridgeDisclosure}</dd>
            </div>
            <div>
              <dt>loader</dt>
              <dd>{terrainReadiness.loaderBlocker}</dd>
            </div>
            <div>
              <dt>asset contract</dt>
              <dd>{terrainReadiness.tileAssetContractStatus}</dd>
            </div>
            <div>
              <dt>asset path</dt>
              <dd>{terrainReadiness.tileAssetContractPath}</dd>
            </div>
            <div>
              <dt>tile candidates</dt>
              <dd>{terrainReadiness.tileCatalogCandidateIdsSample}</dd>
            </div>
            <div>
              <dt>asset sample</dt>
              <dd>{terrainReadiness.tileAssetContractSample}</dd>
            </div>
            <div>
              <dt>process contract</dt>
              <dd>{terrainReadiness.tileProcessContractStatus}</dd>
            </div>
            <div>
              <dt>texture contract</dt>
              <dd>{terrainReadiness.tileTextureContractStatus}</dd>
            </div>
            <div>
              <dt>asset blockers</dt>
              <dd>{terrainReadiness.tileAssetContractBlockers}</dd>
            </div>
            <div>
              <dt>render handoff path</dt>
              <dd>{terrainReadiness.tileRenderLoaderHandoffPath}</dd>
            </div>
            <div>
              <dt>render handoff status</dt>
              <dd>{terrainReadiness.tileRenderLoaderHandoffStatus}</dd>
            </div>
            <div>
              <dt>geometry mode</dt>
              <dd>{terrainReadiness.tileRenderGeometryMode}</dd>
            </div>
            <div>
              <dt>glb geometry status</dt>
              <dd>{terrainReadiness.tileRenderGlbGeometryStatus}</dd>
            </div>
            <div>
              <dt>material binding status</dt>
              <dd>{terrainReadiness.tileRenderMaterialBindingStatus}</dd>
            </div>
            <div>
              <dt>loader output</dt>
              <dd>{terrainReadiness.tileRenderLoaderOutputStatus}</dd>
            </div>
            <div>
              <dt>renderer handoff</dt>
              <dd>{terrainReadiness.tileRenderRendererHandoffStatus}</dd>
            </div>
            <div>
              <dt>bridge parity</dt>
              <dd>{terrainReadiness.tileBridgeParityStatus}</dd>
            </div>
            <div>
              <dt>render contract blockers</dt>
              <dd>{terrainReadiness.tileRenderContractBlockers}</dd>
            </div>
            {tileProcessReadiness ? (
              <>
                <div>
                  <dt>tile process readiness</dt>
                  <dd>{tileProcessReadiness.status}</dd>
                </div>
                <div>
                  <dt>process checked</dt>
                  <dd>{tileProcessReadiness.checkedCandidateCount}</dd>
                </div>
                <div>
                  <dt>process ready</dt>
                  <dd>{tileProcessReadiness.readyCandidateCount}</dd>
                </div>
                <div>
                  <dt>process blocked</dt>
                  <dd>{tileProcessReadiness.blockedCandidateCount}</dd>
                </div>
                <div>
                  <dt>process sample</dt>
                  <dd>{tileProcessReadiness.candidateSample}</dd>
                </div>
                <div>
                  <dt>ready cache</dt>
                  <dd>{tileProcessReadiness.readySample}</dd>
                </div>
                <div>
                  <dt>process blockers</dt>
                  <dd>{tileProcessReadiness.blockerSummary}</dd>
                </div>
                <div>
                  <dt>source objects</dt>
                  <dd>{tileProcessReadiness.sourceObjectKeySample}</dd>
                </div>
                <div>
                  <dt>source asset contract</dt>
                  <dd>{tileProcessReadiness.sourceAssetContractSample}</dd>
                </div>
                <div>
                  <dt>source asset ready</dt>
                  <dd>
                    {tileProcessReadiness.sourceAssetReadyCount}/
                    {tileProcessReadiness.checkedCandidateCount} ready
                    {tileProcessReadiness.sourceAssetBlockedCount > 0
                      ? `, ${tileProcessReadiness.sourceAssetBlockedCount} blocked`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>mdl source</dt>
                  <dd>
                    {tileProcessReadiness.mdlSourceReadyCount}/
                    {tileProcessReadiness.checkedCandidateCount} proven
                    {tileProcessReadiness.mdlSourceBlockedCount > 0
                      ? `, ${tileProcessReadiness.mdlSourceBlockedCount} blocked`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>glb geometry</dt>
                  <dd>
                    {tileProcessReadiness.glbGeometryReadyCount}/
                    {tileProcessReadiness.checkedCandidateCount} ready
                    {tileProcessReadiness.glbGeometryBlockedCount > 0
                      ? `, ${tileProcessReadiness.glbGeometryBlockedCount} blocked`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>material texture</dt>
                  <dd>
                    {tileProcessReadiness.materialTextureContractReadyCount}/
                    {tileProcessReadiness.checkedCandidateCount} contract ready
                  </dd>
                </div>
                <div>
                  <dt>material bindings</dt>
                  <dd>
                    {tileProcessReadiness.materialBindingBlockedCount > 0
                      ? `${tileProcessReadiness.materialBindingBlockedCount} binding blockers`
                      : "none"}
                  </dd>
                </div>
                <div>
                  <dt>render handoff</dt>
                  <dd>
                    {tileProcessReadiness.renderLoaderReadyCount}/
                    {tileProcessReadiness.checkedCandidateCount} ready
                    {tileProcessReadiness.renderLoaderBlockedCount > 0
                      ? `, ${tileProcessReadiness.renderLoaderBlockedCount} blocked`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>render blockers</dt>
                  <dd>{tileProcessReadiness.renderAssetContractBlockerSummary}</dd>
                </div>
                <div>
                  <dt>mdl/glb/material blockers</dt>
                  <dd>{tileProcessReadiness.mdlGlbMaterialBlockerSummary}</dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>
      ) : null}

      {isCheckingTextureReadiness ? (
        <p className="scene-objects-empty" role="status">Checking texture readiness...</p>
      ) : null}

      {textureReadiness ? (
        <section
          className="scene-object-detail-panel area-readiness-detail-panel"
          aria-label="area texture readiness status"
        >
          <h3>
            {textureReadiness.status === "ready"
              ? "Texture Readiness Ready"
              : "Texture Readiness Blocked"}
          </h3>
          <dl className="scene-object-property-list area-readiness-property-list">
            <div>
              <dt>area</dt>
              <dd>{textureReadiness.areaId}</dd>
            </div>
            <div>
              <dt>mode</dt>
              <dd>{textureReadiness.deliveryMode}</dd>
            </div>
            {textureReadiness.status === "ready" ? (
              <>
                <div>
                  <dt>cache</dt>
                  <dd>{textureReadiness.cache.key}</dd>
                </div>
                <div>
                  <dt>atlas</dt>
                  <dd>{textureReadiness.textureAtlas.atlasId}</dd>
                </div>
                <div>
                  <dt>object key</dt>
                  <dd>{textureReadiness.textureAtlas.objectKey}</dd>
                </div>
                <div>
                  <dt>content</dt>
                  <dd>{textureReadiness.textureAtlas.contentType}</dd>
                </div>
                <div>
                  <dt>size</dt>
                  <dd>{textureReadiness.textureAtlas.sizeBytes}</dd>
                </div>
                <div>
                  <dt>etag</dt>
                  <dd>{textureReadiness.textureAtlas.etag ?? "none"}</dd>
                </div>
                <div>
                  <dt>proxy url</dt>
                  <dd>{textureReadiness.textureAtlas.proxyUrl}</dd>
                </div>
              </>
            ) : (
              <>
                <div>
                  <dt>stage</dt>
                  <dd>{textureReadiness.stage}</dd>
                </div>
                {textureReadiness.cache ? (
                  <div>
                    <dt>cache</dt>
                    <dd>{textureReadiness.cache.key}</dd>
                  </div>
                ) : null}
                <div>
                  <dt>code</dt>
                  <dd>{textureReadiness.code ?? "none"}</dd>
                </div>
                <div>
                  <dt>message</dt>
                  <dd>{textureReadiness.message}</dd>
                </div>
                {textureReadiness.infrastructureRuntimeHealth ? (
                  <div>
                    <dt>runtime health</dt>
                    <dd>{textureReadiness.failureClassification ?? "infrastructure_runtime_health"}</dd>
                  </div>
                ) : null}
                {textureReadiness.directDeliveryUnavailable ? (
                  <div>
                    <dt>direct unavailable</dt>
                    <dd>yes</dd>
                  </div>
                ) : null}
              </>
            )}
          </dl>
        </section>
      ) : null}
    </article>
  );
}
