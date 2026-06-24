import * as THREE from "three";
import type { AreaScene, SceneTile, TerrainBrushKind } from "../../contracts";
import type { AreaTileProcessContractReadiness } from "../../../tiles/application/areaTileProcessContractReadiness";
import {
  applyPlaceableTexturesToModel,
  ensurePlaceableModel,
  ensurePlaceableTexturesByReference,
  type PlaceableTextureRuntimeCache,
  type PlaceableModelRuntimeCache
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import { resolvePlaceableAssetDeliveryUrl } from "../../../placeables/application/placeableRenderAssetResolver";
import { createTextSprite } from "./workspaceCanvasSprites";

const TILE_GEOMETRY_Y = 0;
const TILE_AREA_EXTENT_LAYER_NAME = "terrain-area-extent-footprint";
const TILE_MODEL_LAYER_NAME = "terrain-backend-tile-models";
const TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE = 0.1;
const TILE_MODEL_LOADER_PATH =
  "AreaTileProcessContract.renderAssetContract.modelAsset.deliveryUrl -> shared-placeables-gltf-loader";
export const AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT =
  "aurora:areas:terrain-tile-model-runtime-snapshot";
const TILE_BRIDGE_DISCLOSURE =
  "local-source-backed-tile-bridge-not-retail-model-geometry";
const TILE_BRIDGE_READABILITY =
  "asymmetric-orientation-shape-model-resref-color-height-offset";
const TILE_AREA_EXTENT_FOOTPRINT_STATUS =
  "scene-dimensions-footprint-backed-by-area-contract";
const TILE_SCENE_PACKAGE_PATH =
  "ARE TileList -> SET tile model -> MDL/GLB/texture availability";
const TILE_ASSET_CONTRACT_PATH =
  "ARE TileList -> SET modelResRef -> tile sourceAsset/renderAssetContract -> MDL source key / GLB geometry / texture-material contract";
const TILE_RENDER_LOADER_HANDOFF_PATH =
  "ARE TileList -> SET modelResRef -> tile sourceAsset/renderAssetContract -> renderer loader handoff";
const TILE_MODEL_GEOMETRY_LOADER_BLOCKER = "blocked_tile_model_geometry_loader_missing";
const TILE_RENDER_GLB_GEOMETRY_BLOCKER =
  "blocked_tile_process_contract_missing_glb_geometry";
const TILE_RENDER_MATERIAL_BINDING_BLOCKER =
  "blocked_tile_process_contract_missing_material_bindings";
const TILE_RENDER_LOADER_OUTPUT_BLOCKER = "blocked_tile_loader_output_not_proven";
const TILE_RENDER_LOADER_HANDOFF_BLOCKER =
  "blocked_bridge_only_no_tile_model_loader_contract";
const TILE_RENDER_BRIDGE_GEOMETRY_MODE = "source_backed_bridge_not_model_geometry";
const TILE_RENDER_BRIDGE_PARITY_STATUS = "non_parity_source_backed_bridge";
const TILE_BRIDGE_LABEL_LAYER_NAME = "terrain-source-backed-tile-labels";
const MAX_TILE_BRIDGE_LABELS = 80;
const TILE_SCENE_PACKAGE_SAMPLE_LIMIT = 24;
const TILE_ASSET_CONTRACT_SAMPLE_LIMIT = 12;

const TERRAIN_COLORS: Record<TerrainBrushKind, string> = {
  corridor: "#4f7fb7",
  doorway: "#5a8ec8",
  inn: "#7362b2",
  kitchen: "#6e8ea0",
  livingroom: "#6b82c4",
  shop: "#6f9b5d",
  wall: "#4a6685"
};

interface TerrainRuntime extends PlaceableModelRuntimeCache, PlaceableTextureRuntimeCache {
  scene: THREE.Scene;
  container?: HTMLDivElement;
  tileMesh: THREE.InstancedMesh | null;
  tileIdByInstance: string[];
}

interface TerrainDebugState {
  textureCompression: "uastc" | "etc1s" | string;
  hiddenMeshes: boolean;
  wireframe: boolean;
  textures: boolean;
  walkmeshOverlay: boolean;
}

export interface TerrainRenderStatus {
  code:
    | "generic_mesh"
    | "source_backed_tile_model_bridge"
    | "blocked_missing_tile_data"
    | "blocked_tile_model_metadata_incomplete"
    | "blocked_tile_model_geometry_loader_missing";
  renderGenericMesh: boolean;
  label: string;
  tileCount: number;
  modelResolvedCount: number;
  modelSourceCounts: Record<string, number>;
}

export interface TerrainScenePackageReadiness {
  areaId: string;
  areaWidth: number;
  areaHeight: number;
  path: string;
  status:
    | "blocked_missing_are_tile_list"
    | "blocked_set_tile_model_metadata_incomplete"
    | "source_metadata_ready_geometry_loader_blocked";
  tilesetResRef: string;
  areTileListStatus: "ready" | "blocked_missing_are_tile_list";
  setTileModelStatus:
    | "ready"
    | "blocked_missing_are_tile_list"
    | "blocked_tile_model_metadata_incomplete";
  mdlAvailabilityStatus:
    | "not_loaded_frontend_tile_mdl_loader_missing"
    | "blocked_no_tile_model_resrefs";
  glbAvailabilityStatus:
    | "not_checked_no_tile_glb_contract"
    | "blocked_no_tile_model_resrefs";
  textureAvailabilityStatus:
    | "area_texture_atlas_present_tile_materials_unverified"
    | "blocked_tile_material_texture_contract_missing";
  tileAssetContractPath: string;
  tileAssetContractStatus:
    | "derived_tile_catalog_candidates_unverified"
    | "blocked_no_tile_model_resrefs";
  tileCatalogCandidateStatus:
    | "derived_from_set_model_resrefs_not_verified"
    | "blocked_no_tile_model_resrefs";
  tileProcessContractStatus:
    | "not_requested_frontend_area_runtime_missing_tile_process_contract"
    | "blocked_no_tile_catalog_candidate_ids";
  tileMdlSourceStatus:
    | "source_model_resrefs_present_asset_source_unverified"
    | "blocked_no_tile_model_resrefs";
  tileGlbContractStatus:
    | "missing_frontend_tile_glb_contract"
    | "blocked_no_tile_model_resrefs";
  tileTextureContractStatus:
    | "area_texture_atlas_metadata_present_per_tile_material_contract_missing"
    | "blocked_tile_material_texture_contract_missing";
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
  tileRenderContractBlockers: string[];
  tileCatalogCandidateIdsSample: string;
  tileAssetContractSamples: string;
  tileAssetContractBlockers: string[];
  geometryPreference:
    | "source_backed_bridge_only"
    | "not_rendered_until_source_data_ready";
  bridgeStatus: string;
  tileCount: number;
  modelResolvedCount: number;
  modelMissingCount: number;
  fallbackTileCount: number;
  uniqueModelResRefCount: number;
  modelSourceCounts: Record<string, number>;
  modelResRefsSample: string;
  tileIdsSample: string;
  blockers: string[];
}

interface TerrainTileModelContract {
  modelResRef: string;
  tileCatalogId: string;
  cacheKey?: string;
  deliveryUrl: string;
  rawDeliveryUrl: string;
  objectKey?: string;
  extension?: "glb" | "gltf";
  textureUrlsByReference: Map<string, string>;
}

interface TerrainTileModelRuntimeSummary {
  modelContractTileCount: number;
  modelPendingTileCount: number;
  modelLoadedTileCount: number;
  modelFailedTileCount: number;
  modelBlockedTileCount: number;
  modelMaterialTextureContractTileCount: number;
  modelMaterialTextureAppliedTileCount: number;
  modelMaterialTextureFailedTileCount: number;
  modelMaterialTexturePendingTileCount: number;
  modelDeliveryUrlSample: string;
  modelObjectKeySample: string;
  modelFailedTileSample: string;
  modelLoaderErrorSample: string;
  modelBlockedTileSample: string;
  modelMaterialTextureFailedTileSample: string;
}

export interface AreaTerrainTileModelRuntimeSnapshot {
  version: "aurora-areas-terrain-tile-model-runtime/v1";
  path: typeof TILE_MODEL_LOADER_PATH;
  layerName: typeof TILE_MODEL_LAYER_NAME;
  status: "blocked" | "loading" | "partial" | "ready";
  areaId: string;
  tilesetResRef: string;
  renderStatus: TerrainRenderStatus["code"];
  tileCount: number;
  contractTileCount: number;
  pendingTileCount: number;
  loadedTileCount: number;
  failedTileCount: number;
  bridgeTileCount: number;
  materialTextureContractTileCount: number;
  materialTextureAppliedTileCount: number;
  materialTextureFailedTileCount: number;
  materialTexturePendingTileCount: number;
  deliveryUrlSample: string;
  objectKeySample: string;
  failedTileSample: string;
  loaderErrorSample: string;
  blockedTileSample: string;
  materialTextureFailedTileSample: string;
  blockerSummary: string;
}

export function resolveTerrainRenderStatus(sceneData: AreaScene): TerrainRenderStatus {
  const tileCount = sceneData.tiles.length;
  const modelResolvedCount = sceneData.tiles.filter((tile) => Boolean(tile.modelResRef)).length;
  const modelSourceCounts = sceneData.tiles.reduce<Record<string, number>>((counts, tile) => {
    const source = tile.modelSource ?? "missing";
    counts[source] = (counts[source] ?? 0) + 1;
    return counts;
  }, {});

  if (sceneData.tileSource?.type !== "aurora_tile_list") {
    return {
      code: tileCount > 0 ? "generic_mesh" : "blocked_missing_tile_data",
      renderGenericMesh: tileCount > 0,
      label: tileCount > 0 ? "generic terrain mesh" : "blocked: missing tile data",
      tileCount,
      modelResolvedCount,
      modelSourceCounts
    };
  }

  if (tileCount < 1) {
    return {
      code: "blocked_missing_tile_data",
      renderGenericMesh: false,
      label: "blocked: missing Aurora tile list",
      tileCount,
      modelResolvedCount,
      modelSourceCounts
    };
  }

  if (modelResolvedCount < tileCount) {
    return {
      code: "source_backed_tile_model_bridge",
      renderGenericMesh: true,
      label: `source-backed tile layout (${modelResolvedCount}/${tileCount} models; model geometry blocked)`,
      tileCount,
      modelResolvedCount,
      modelSourceCounts
    };
  }

  return {
    code: "source_backed_tile_model_bridge",
    renderGenericMesh: true,
    label: `source-backed tile bridge (${modelResolvedCount}/${tileCount} models; geometry loader pending)`,
    tileCount,
    modelResolvedCount,
    modelSourceCounts
  };
}

export function resolveTerrainScenePackageReadiness(
  sceneData: AreaScene,
  renderStatus: TerrainRenderStatus = resolveTerrainRenderStatus(sceneData)
): TerrainScenePackageReadiness {
  const tileCount = sceneData.tiles.length;
  const modelMissingCount = Math.max(tileCount - renderStatus.modelResolvedCount, 0);
  const fallbackReasons = sceneData.tiles
    .map((tile) => tile.fallbackReason?.trim())
    .filter((reason): reason is string => Boolean(reason));
  const modelResRefs = Array.from(
    new Set(
      sceneData.tiles
        .map((tile) => tile.modelResRef?.trim().toLowerCase() ?? "")
        .filter((modelResRef) => modelResRef.length > 0)
    )
  );
  const tileCatalogCandidateIds = modelResRefs.map((modelResRef) =>
    buildTileCatalogCandidateId(modelResRef)
  );
  const hasAreaTextureAtlas = Boolean(
    sceneData.textureAtlas?.objectKey || sceneData.textureAtlas?.atlasId
  );
  const hasModelResRefs = modelResRefs.length > 0;
  const tileAssetContractBlockers = resolveTileAssetContractBlockers({
    hasModelResRefs,
    hasAreaTextureAtlas
  });
  const tileRenderContractBlockers = resolveTileRenderContractBlockers({
    hasModelResRefs,
    hasAreaTextureAtlas
  });
  const tileIds = Array.from(
    new Set(
      sceneData.tiles.map((tile) =>
        Number.isFinite(tile.tileId ?? Number.NaN)
          ? String(tile.tileId)
          : `index:${tile.tileIndex ?? "missing"}`
      )
    )
  );
  const hasAuroraTileList = sceneData.tileSource?.type === "aurora_tile_list" && tileCount > 0;
  const areTileListStatus = hasAuroraTileList ? "ready" : "blocked_missing_are_tile_list";
  const setTileModelStatus =
    !hasAuroraTileList
      ? "blocked_missing_are_tile_list"
      : modelMissingCount > 0
        ? "blocked_tile_model_metadata_incomplete"
        : "ready";
  const blockers = new Set<string>();

  if (!hasAuroraTileList) {
    blockers.add("blocked_missing_are_tile_list");
  }
  if (modelMissingCount > 0) {
    blockers.add("blocked_tile_model_metadata_incomplete");
  }
  if (fallbackReasons.length > 0 || sceneData.tileSource?.fallbackReason) {
    blockers.add(sceneData.tileSource?.fallbackReason ?? "tile_fallback_metadata_present");
  }
  if (hasModelResRefs) {
    blockers.add(TILE_MODEL_GEOMETRY_LOADER_BLOCKER);
    blockers.add("tile_glb_contract_missing");
  } else {
    blockers.add("blocked_no_tile_model_resrefs");
  }
  blockers.add("tile_material_texture_contract_missing");
  tileRenderContractBlockers.forEach((blocker) => blockers.add(blocker));

  const status =
    !hasAuroraTileList
      ? "blocked_missing_are_tile_list"
      : modelMissingCount > 0
        ? "blocked_set_tile_model_metadata_incomplete"
        : "source_metadata_ready_geometry_loader_blocked";

  return {
    areaId: sceneData.sceneId,
    areaWidth: Math.max(1, sceneData.width),
    areaHeight: Math.max(1, sceneData.height),
    path: TILE_SCENE_PACKAGE_PATH,
    status,
    tilesetResRef: sceneData.tileSource?.tilesetResRef ?? "",
    areTileListStatus,
    setTileModelStatus,
    mdlAvailabilityStatus:
      modelResRefs.length > 0
        ? "not_loaded_frontend_tile_mdl_loader_missing"
        : "blocked_no_tile_model_resrefs",
    glbAvailabilityStatus:
      modelResRefs.length > 0
        ? "not_checked_no_tile_glb_contract"
        : "blocked_no_tile_model_resrefs",
    textureAvailabilityStatus: hasAreaTextureAtlas
      ? "area_texture_atlas_present_tile_materials_unverified"
      : "blocked_tile_material_texture_contract_missing",
    tileAssetContractPath: TILE_ASSET_CONTRACT_PATH,
    tileAssetContractStatus:
      modelResRefs.length > 0
        ? "derived_tile_catalog_candidates_unverified"
        : "blocked_no_tile_model_resrefs",
    tileCatalogCandidateStatus:
      modelResRefs.length > 0
        ? "derived_from_set_model_resrefs_not_verified"
        : "blocked_no_tile_model_resrefs",
    tileProcessContractStatus:
      modelResRefs.length > 0
        ? "not_requested_frontend_area_runtime_missing_tile_process_contract"
        : "blocked_no_tile_catalog_candidate_ids",
    tileMdlSourceStatus:
      modelResRefs.length > 0
        ? "source_model_resrefs_present_asset_source_unverified"
        : "blocked_no_tile_model_resrefs",
    tileGlbContractStatus:
      modelResRefs.length > 0
        ? "missing_frontend_tile_glb_contract"
        : "blocked_no_tile_model_resrefs",
    tileTextureContractStatus: hasAreaTextureAtlas
      ? "area_texture_atlas_metadata_present_per_tile_material_contract_missing"
      : "blocked_tile_material_texture_contract_missing",
    tileRenderLoaderHandoffPath: TILE_RENDER_LOADER_HANDOFF_PATH,
    tileRenderLoaderHandoffStatus: hasModelResRefs
      ? TILE_RENDER_LOADER_HANDOFF_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileRenderGeometryMode:
      renderStatus.renderGenericMesh && renderStatus.code === "source_backed_tile_model_bridge"
        ? TILE_RENDER_BRIDGE_GEOMETRY_MODE
        : "not_rendered_until_source_data_ready",
    tileRenderGlbGeometryStatus: hasModelResRefs
      ? TILE_RENDER_GLB_GEOMETRY_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileRenderMaterialBindingStatus: hasModelResRefs
      ? hasAreaTextureAtlas
        ? TILE_RENDER_MATERIAL_BINDING_BLOCKER
        : "blocked_tile_material_texture_contract_missing"
      : "blocked_no_tile_model_resrefs",
    tileRenderLoaderOutputStatus: hasModelResRefs
      ? TILE_RENDER_LOADER_OUTPUT_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileRenderRendererHandoffStatus: hasModelResRefs
      ? TILE_MODEL_GEOMETRY_LOADER_BLOCKER
      : "blocked_no_tile_model_resrefs",
    tileBridgeParityStatus: hasModelResRefs
      ? TILE_RENDER_BRIDGE_PARITY_STATUS
      : "blocked_no_tile_model_resrefs",
    tileRenderContractBlockers,
    tileCatalogCandidateIdsSample: tileCatalogCandidateIds
      .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
      .join("|"),
    tileAssetContractSamples: sceneData.tiles
      .filter((tile) => tile.modelResRef?.trim())
      .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
      .map(formatTileAssetContractSample)
      .join("|"),
    tileAssetContractBlockers,
    geometryPreference:
      renderStatus.renderGenericMesh && renderStatus.code === "source_backed_tile_model_bridge"
        ? "source_backed_bridge_only"
        : "not_rendered_until_source_data_ready",
    bridgeStatus: renderStatus.code,
    tileCount,
    modelResolvedCount: renderStatus.modelResolvedCount,
    modelMissingCount,
    fallbackTileCount: fallbackReasons.length,
    uniqueModelResRefCount: modelResRefs.length,
    modelSourceCounts: { ...renderStatus.modelSourceCounts },
    modelResRefsSample: modelResRefs.slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT).join("|"),
    tileIdsSample: tileIds.slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT).join("|"),
    blockers: Array.from(blockers)
  };
}

function resolveTileAssetContractBlockers(input: {
  hasModelResRefs: boolean;
  hasAreaTextureAtlas: boolean;
}): string[] {
  const blockers: string[] = [];
  if (!input.hasModelResRefs) {
    blockers.push("blocked_no_tile_model_resrefs");
    return blockers;
  }
  blockers.push("tile_catalog_candidate_ids_derived_not_verified");
  blockers.push("frontend_area_runtime_missing_tile_process_contract");
  blockers.push("tile_mdl_source_asset_availability_not_verified");
  blockers.push("missing_frontend_tile_glb_contract");
  blockers.push(TILE_MODEL_GEOMETRY_LOADER_BLOCKER);
  blockers.push(
    input.hasAreaTextureAtlas
      ? "per_tile_material_texture_contract_missing"
      : "blocked_tile_material_texture_contract_missing"
  );
  return blockers;
}

function resolveTileRenderContractBlockers(input: {
  hasModelResRefs: boolean;
  hasAreaTextureAtlas: boolean;
}): string[] {
  if (!input.hasModelResRefs) {
    return ["blocked_no_tile_model_resrefs"];
  }
  return [
    TILE_RENDER_GLB_GEOMETRY_BLOCKER,
    input.hasAreaTextureAtlas
      ? TILE_RENDER_MATERIAL_BINDING_BLOCKER
      : "blocked_tile_material_texture_contract_missing",
    TILE_RENDER_LOADER_OUTPUT_BLOCKER,
    TILE_MODEL_GEOMETRY_LOADER_BLOCKER
  ];
}

function buildTileCatalogCandidateId(modelResRef: string): string {
  const normalized = modelResRef
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/gu, "_")
    .slice(0, 64);
  return normalized ? `tile_${normalized}`.slice(0, 80) : "tile_missing_model_resref";
}

function formatTileAssetContractSample(tile: SceneTile): string {
  const modelResRef = tile.modelResRef?.trim().toLowerCase() ?? "";
  const tileId = Number.isFinite(tile.tileId ?? Number.NaN)
    ? String(tile.tileId)
    : `index:${tile.tileIndex ?? "missing"}`;
  const height = Number.isFinite(tile.height ?? Number.NaN) ? tile.height ?? 0 : "missing";
  return [
    `r${tile.row}`,
    `c${tile.col}`,
    `tile=${tileId}`,
    `model=${modelResRef || "missing"}`,
    `catalog=${modelResRef ? buildTileCatalogCandidateId(modelResRef) : "missing"}`,
    `orientation=${tile.orientation}`,
    `height=${height}`,
    `source=${tile.modelSource ?? "missing"}`
  ].join(",");
}

function clearTerrainRenderDataset(runtime: TerrainRuntime): void {
  if (!runtime.container) {
    return;
  }
  delete runtime.container.dataset.areaTerrainRenderStatus;
  delete runtime.container.dataset.areaTerrainRenderLabel;
  delete runtime.container.dataset.areaTerrainTileCount;
  delete runtime.container.dataset.areaTerrainModelResolvedCount;
  delete runtime.container.dataset.areaTerrainModelSourceCounts;
  delete runtime.container.dataset.areaTerrainSourceBridge;
  delete runtime.container.dataset.areaTerrainGeometryStatus;
  delete runtime.container.dataset.areaTerrainBridgeReadability;
  delete runtime.container.dataset.areaTerrainExtentFootprintStatus;
  delete runtime.container.dataset.areaTerrainExtentFootprintSize;
  delete runtime.container.dataset.areaTerrainExtentFootprintLayer;
  delete runtime.container.dataset.areaTerrainBridgeLabelCount;
  delete runtime.container.dataset.areaTerrainBridgeLabelStride;
  delete runtime.container.dataset.areaTerrainAreaId;
  delete runtime.container.dataset.areaTerrainTilesetResRef;
  delete runtime.container.dataset.areaTerrainModelMissingCount;
  delete runtime.container.dataset.areaTerrainFallbackTileCount;
  delete runtime.container.dataset.areaTerrainUniqueModelResRefCount;
  delete runtime.container.dataset.areaTerrainModelResRefsSample;
  delete runtime.container.dataset.areaTerrainTileIdsSample;
  delete runtime.container.dataset.areaTerrainScenePackagePath;
  delete runtime.container.dataset.areaTerrainScenePackageStatus;
  delete runtime.container.dataset.areaTerrainAreTileListStatus;
  delete runtime.container.dataset.areaTerrainSetTileModelStatus;
  delete runtime.container.dataset.areaTerrainMdlAvailabilityStatus;
  delete runtime.container.dataset.areaTerrainGlbAvailabilityStatus;
  delete runtime.container.dataset.areaTerrainTextureAvailabilityStatus;
  delete runtime.container.dataset.areaTerrainTileAssetContractPath;
  delete runtime.container.dataset.areaTerrainTileAssetContractStatus;
  delete runtime.container.dataset.areaTerrainTileCatalogCandidateStatus;
  delete runtime.container.dataset.areaTerrainTileCatalogCandidateIdsSample;
  delete runtime.container.dataset.areaTerrainTileProcessContractStatus;
  delete runtime.container.dataset.areaTerrainTileMdlSourceStatus;
  delete runtime.container.dataset.areaTerrainTileGlbContractStatus;
  delete runtime.container.dataset.areaTerrainTileTextureContractStatus;
  delete runtime.container.dataset.areaTerrainTileAssetContractSamples;
  delete runtime.container.dataset.areaTerrainTileAssetContractBlockers;
  delete runtime.container.dataset.areaTerrainTileRenderLoaderHandoffPath;
  delete runtime.container.dataset.areaTerrainTileRenderLoaderHandoffStatus;
  delete runtime.container.dataset.areaTerrainTileRenderGeometryMode;
  delete runtime.container.dataset.areaTerrainTileRenderGlbGeometryStatus;
  delete runtime.container.dataset.areaTerrainTileRenderMaterialBindingStatus;
  delete runtime.container.dataset.areaTerrainTileRenderLoaderOutputStatus;
  delete runtime.container.dataset.areaTerrainTileRenderRendererHandoffStatus;
  delete runtime.container.dataset.areaTerrainTileBridgeParityStatus;
  delete runtime.container.dataset.areaTerrainTileRenderContractBlockers;
  delete runtime.container.dataset.areaTerrainGeometryPreference;
  delete runtime.container.dataset.areaTerrainLoaderBlockers;
  delete runtime.container.dataset.areaTerrainTileModelLoaderPath;
  delete runtime.container.dataset.areaTerrainTileModelContractTileCount;
  delete runtime.container.dataset.areaTerrainTileModelPendingCount;
  delete runtime.container.dataset.areaTerrainTileModelLoadedCount;
  delete runtime.container.dataset.areaTerrainTileModelFailedCount;
  delete runtime.container.dataset.areaTerrainTileModelBlockedCount;
  delete runtime.container.dataset.areaTerrainTileModelDeliveryUrlSample;
  delete runtime.container.dataset.areaTerrainTileModelObjectKeySample;
  delete runtime.container.dataset.areaTerrainTileModelFailedTileSample;
  delete runtime.container.dataset.areaTerrainTileModelLoaderErrorSample;
  delete runtime.container.dataset.areaTerrainTileModelBlockedTileSample;
  delete runtime.container.dataset.areaTerrainTileMaterialTextureContractCount;
  delete runtime.container.dataset.areaTerrainTileMaterialTextureAppliedCount;
  delete runtime.container.dataset.areaTerrainTileMaterialTextureFailedCount;
  delete runtime.container.dataset.areaTerrainTileMaterialTexturePendingCount;
  delete runtime.container.dataset.areaTerrainTileMaterialTextureFailedTileSample;
  delete runtime.container.dataset.areaTerrainTileModelRuntimeStatus;
  delete runtime.container.dataset.areaTerrainTileModelRuntimeSnapshot;
}

function resolveTerrainTileModelRuntimeStatus(
  renderStatus: TerrainRenderStatus,
  tileModelSummary: TerrainTileModelRuntimeSummary
): AreaTerrainTileModelRuntimeSnapshot["status"] {
  if (renderStatus.tileCount === 0 || tileModelSummary.modelContractTileCount === 0) {
    return "blocked";
  }
  if (tileModelSummary.modelLoadedTileCount === renderStatus.tileCount) {
    return "ready";
  }
  if (tileModelSummary.modelLoadedTileCount > 0) {
    return "partial";
  }
  if (tileModelSummary.modelFailedTileCount > 0) {
    return "blocked";
  }
  return tileModelSummary.modelPendingTileCount > 0 ? "loading" : "blocked";
}

function buildTerrainTileModelRuntimeBlockerSummary(
  tileModelSummary: TerrainTileModelRuntimeSummary
): string {
  const blockers: string[] = [];
  if (tileModelSummary.modelContractTileCount === 0) {
    blockers.push("tile_model_delivery_contract_missing");
  }
  if (tileModelSummary.modelBlockedTileCount > 0) {
    blockers.push(`bridge_tiles_without_model_contract:${tileModelSummary.modelBlockedTileSample}`);
  }
  if (tileModelSummary.modelFailedTileCount > 0) {
    blockers.push(
      `tile_model_loader_failed:${tileModelSummary.modelFailedTileSample}:${tileModelSummary.modelLoaderErrorSample}`
    );
  }
  if (tileModelSummary.modelMaterialTextureFailedTileCount > 0) {
    blockers.push(
      `tile_material_texture_loader_failed:${tileModelSummary.modelMaterialTextureFailedTileSample}`
    );
  }
  return blockers.join(", ") || "none";
}

function buildTerrainTileModelRuntimeSnapshot(
  renderStatus: TerrainRenderStatus,
  scenePackageReadiness: TerrainScenePackageReadiness,
  tileModelSummary: TerrainTileModelRuntimeSummary
): AreaTerrainTileModelRuntimeSnapshot {
  return {
    version: "aurora-areas-terrain-tile-model-runtime/v1",
    path: TILE_MODEL_LOADER_PATH,
    layerName: TILE_MODEL_LAYER_NAME,
    status: resolveTerrainTileModelRuntimeStatus(renderStatus, tileModelSummary),
    areaId: scenePackageReadiness.areaId,
    tilesetResRef: scenePackageReadiness.tilesetResRef,
    renderStatus: renderStatus.code,
    tileCount: renderStatus.tileCount,
    contractTileCount: tileModelSummary.modelContractTileCount,
    pendingTileCount: tileModelSummary.modelPendingTileCount,
    loadedTileCount: tileModelSummary.modelLoadedTileCount,
    failedTileCount: tileModelSummary.modelFailedTileCount,
    bridgeTileCount: tileModelSummary.modelBlockedTileCount,
    materialTextureContractTileCount:
      tileModelSummary.modelMaterialTextureContractTileCount,
    materialTextureAppliedTileCount:
      tileModelSummary.modelMaterialTextureAppliedTileCount,
    materialTextureFailedTileCount:
      tileModelSummary.modelMaterialTextureFailedTileCount,
    materialTexturePendingTileCount:
      tileModelSummary.modelMaterialTexturePendingTileCount,
    deliveryUrlSample: tileModelSummary.modelDeliveryUrlSample,
    objectKeySample: tileModelSummary.modelObjectKeySample,
    failedTileSample: tileModelSummary.modelFailedTileSample,
    loaderErrorSample: tileModelSummary.modelLoaderErrorSample,
    blockedTileSample: tileModelSummary.modelBlockedTileSample,
    materialTextureFailedTileSample:
      tileModelSummary.modelMaterialTextureFailedTileSample,
    blockerSummary: buildTerrainTileModelRuntimeBlockerSummary(tileModelSummary)
  };
}

function writeTerrainRenderDataset(
  runtime: TerrainRuntime,
  renderStatus: TerrainRenderStatus,
  scenePackageReadiness: TerrainScenePackageReadiness,
  tileModelSummary: TerrainTileModelRuntimeSummary = createEmptyTileModelRuntimeSummary()
): void {
  const tileModelSnapshot = buildTerrainTileModelRuntimeSnapshot(
    renderStatus,
    scenePackageReadiness,
    tileModelSummary
  );
  runtime.scene.userData.auroraTerrainTileModelRuntimeSnapshot = tileModelSnapshot;
  if (!runtime.container) {
    return;
  }
  runtime.container.dataset.areaTerrainRenderStatus = renderStatus.code;
  runtime.container.dataset.areaTerrainRenderLabel = renderStatus.label;
  runtime.container.dataset.areaTerrainTileCount = String(renderStatus.tileCount);
  runtime.container.dataset.areaTerrainModelResolvedCount = String(
    renderStatus.modelResolvedCount
  );
  runtime.container.dataset.areaTerrainModelSourceCounts = JSON.stringify(
    renderStatus.modelSourceCounts
  );
  runtime.container.dataset.areaTerrainSourceBridge =
    renderStatus.code === "source_backed_tile_model_bridge" ? "true" : "false";
  runtime.container.dataset.areaTerrainGeometryStatus =
    renderStatus.code === "source_backed_tile_model_bridge"
      ? TILE_BRIDGE_DISCLOSURE
      : renderStatus.code;
  runtime.container.dataset.areaTerrainBridgeReadability =
    renderStatus.code === "source_backed_tile_model_bridge" ? TILE_BRIDGE_READABILITY : "";
  runtime.container.dataset.areaTerrainExtentFootprintStatus =
    TILE_AREA_EXTENT_FOOTPRINT_STATUS;
  runtime.container.dataset.areaTerrainExtentFootprintSize =
    `${Math.max(1, scenePackageReadiness.areaWidth)}x${Math.max(1, scenePackageReadiness.areaHeight)}`;
  runtime.container.dataset.areaTerrainExtentFootprintLayer = TILE_AREA_EXTENT_LAYER_NAME;
  runtime.container.dataset.areaTerrainAreaId = scenePackageReadiness.areaId;
  runtime.container.dataset.areaTerrainTilesetResRef = scenePackageReadiness.tilesetResRef;
  runtime.container.dataset.areaTerrainModelMissingCount = String(
    scenePackageReadiness.modelMissingCount
  );
  runtime.container.dataset.areaTerrainFallbackTileCount = String(
    scenePackageReadiness.fallbackTileCount
  );
  runtime.container.dataset.areaTerrainUniqueModelResRefCount = String(
    scenePackageReadiness.uniqueModelResRefCount
  );
  runtime.container.dataset.areaTerrainModelResRefsSample =
    scenePackageReadiness.modelResRefsSample;
  runtime.container.dataset.areaTerrainTileIdsSample = scenePackageReadiness.tileIdsSample;
  runtime.container.dataset.areaTerrainScenePackagePath = scenePackageReadiness.path;
  runtime.container.dataset.areaTerrainScenePackageStatus = scenePackageReadiness.status;
  runtime.container.dataset.areaTerrainAreTileListStatus =
    scenePackageReadiness.areTileListStatus;
  runtime.container.dataset.areaTerrainSetTileModelStatus =
    scenePackageReadiness.setTileModelStatus;
  runtime.container.dataset.areaTerrainMdlAvailabilityStatus =
    scenePackageReadiness.mdlAvailabilityStatus;
  runtime.container.dataset.areaTerrainGlbAvailabilityStatus =
    scenePackageReadiness.glbAvailabilityStatus;
  runtime.container.dataset.areaTerrainTextureAvailabilityStatus =
    scenePackageReadiness.textureAvailabilityStatus;
  runtime.container.dataset.areaTerrainTileAssetContractPath =
    scenePackageReadiness.tileAssetContractPath;
  runtime.container.dataset.areaTerrainTileAssetContractStatus =
    scenePackageReadiness.tileAssetContractStatus;
  runtime.container.dataset.areaTerrainTileCatalogCandidateStatus =
    scenePackageReadiness.tileCatalogCandidateStatus;
  runtime.container.dataset.areaTerrainTileCatalogCandidateIdsSample =
    scenePackageReadiness.tileCatalogCandidateIdsSample;
  runtime.container.dataset.areaTerrainTileProcessContractStatus =
    scenePackageReadiness.tileProcessContractStatus;
  runtime.container.dataset.areaTerrainTileMdlSourceStatus =
    scenePackageReadiness.tileMdlSourceStatus;
  runtime.container.dataset.areaTerrainTileGlbContractStatus =
    scenePackageReadiness.tileGlbContractStatus;
  runtime.container.dataset.areaTerrainTileTextureContractStatus =
    scenePackageReadiness.tileTextureContractStatus;
  runtime.container.dataset.areaTerrainTileAssetContractSamples =
    scenePackageReadiness.tileAssetContractSamples;
  runtime.container.dataset.areaTerrainTileAssetContractBlockers =
    scenePackageReadiness.tileAssetContractBlockers.join("|");
  runtime.container.dataset.areaTerrainTileRenderLoaderHandoffPath =
    scenePackageReadiness.tileRenderLoaderHandoffPath;
  runtime.container.dataset.areaTerrainTileRenderLoaderHandoffStatus =
    scenePackageReadiness.tileRenderLoaderHandoffStatus;
  runtime.container.dataset.areaTerrainTileRenderGeometryMode =
    scenePackageReadiness.tileRenderGeometryMode;
  runtime.container.dataset.areaTerrainTileRenderGlbGeometryStatus =
    scenePackageReadiness.tileRenderGlbGeometryStatus;
  runtime.container.dataset.areaTerrainTileRenderMaterialBindingStatus =
    scenePackageReadiness.tileRenderMaterialBindingStatus;
  runtime.container.dataset.areaTerrainTileRenderLoaderOutputStatus =
    scenePackageReadiness.tileRenderLoaderOutputStatus;
  runtime.container.dataset.areaTerrainTileRenderRendererHandoffStatus =
    scenePackageReadiness.tileRenderRendererHandoffStatus;
  runtime.container.dataset.areaTerrainTileBridgeParityStatus =
    scenePackageReadiness.tileBridgeParityStatus;
  runtime.container.dataset.areaTerrainTileRenderContractBlockers =
    scenePackageReadiness.tileRenderContractBlockers.join("|");
  runtime.container.dataset.areaTerrainGeometryPreference =
    scenePackageReadiness.geometryPreference;
  runtime.container.dataset.areaTerrainLoaderBlockers =
    scenePackageReadiness.blockers.join("|");
  runtime.container.dataset.areaTerrainTileModelLoaderPath = TILE_MODEL_LOADER_PATH;
  runtime.container.dataset.areaTerrainTileModelContractTileCount = String(
    tileModelSummary.modelContractTileCount
  );
  runtime.container.dataset.areaTerrainTileModelPendingCount = String(
    tileModelSummary.modelPendingTileCount
  );
  runtime.container.dataset.areaTerrainTileModelLoadedCount = String(
    tileModelSummary.modelLoadedTileCount
  );
  runtime.container.dataset.areaTerrainTileModelFailedCount = String(
    tileModelSummary.modelFailedTileCount
  );
  runtime.container.dataset.areaTerrainTileModelBlockedCount = String(
    tileModelSummary.modelBlockedTileCount
  );
  runtime.container.dataset.areaTerrainTileModelDeliveryUrlSample =
    tileModelSummary.modelDeliveryUrlSample;
  runtime.container.dataset.areaTerrainTileModelObjectKeySample =
    tileModelSummary.modelObjectKeySample;
  runtime.container.dataset.areaTerrainTileModelFailedTileSample =
    tileModelSummary.modelFailedTileSample;
  runtime.container.dataset.areaTerrainTileModelLoaderErrorSample =
    tileModelSummary.modelLoaderErrorSample;
  runtime.container.dataset.areaTerrainTileModelBlockedTileSample =
    tileModelSummary.modelBlockedTileSample;
  runtime.container.dataset.areaTerrainTileMaterialTextureContractCount = String(
    tileModelSummary.modelMaterialTextureContractTileCount
  );
  runtime.container.dataset.areaTerrainTileMaterialTextureAppliedCount = String(
    tileModelSummary.modelMaterialTextureAppliedTileCount
  );
  runtime.container.dataset.areaTerrainTileMaterialTextureFailedCount = String(
    tileModelSummary.modelMaterialTextureFailedTileCount
  );
  runtime.container.dataset.areaTerrainTileMaterialTexturePendingCount = String(
    tileModelSummary.modelMaterialTexturePendingTileCount
  );
  runtime.container.dataset.areaTerrainTileMaterialTextureFailedTileSample =
    tileModelSummary.modelMaterialTextureFailedTileSample;
  runtime.container.dataset.areaTerrainTileModelRuntimeStatus =
    tileModelSnapshot.status;
  runtime.container.dataset.areaTerrainTileModelRuntimeSnapshot =
    JSON.stringify(tileModelSnapshot);
  runtime.container.dispatchEvent(
    new CustomEvent<AreaTerrainTileModelRuntimeSnapshot>(
      AREA_TERRAIN_TILE_MODEL_RUNTIME_SNAPSHOT_EVENT,
      { detail: tileModelSnapshot }
    )
  );
}

function createEmptyTileModelRuntimeSummary(): TerrainTileModelRuntimeSummary {
  return {
    modelContractTileCount: 0,
    modelPendingTileCount: 0,
    modelLoadedTileCount: 0,
    modelFailedTileCount: 0,
    modelBlockedTileCount: 0,
    modelMaterialTextureContractTileCount: 0,
    modelMaterialTextureAppliedTileCount: 0,
    modelMaterialTextureFailedTileCount: 0,
    modelMaterialTexturePendingTileCount: 0,
    modelDeliveryUrlSample: "none",
    modelObjectKeySample: "none",
    modelFailedTileSample: "none",
    modelLoaderErrorSample: "none",
    modelBlockedTileSample: "none",
    modelMaterialTextureFailedTileSample: "none"
  };
}

function buildTileModelContractsByModelResRef(
  readiness: AreaTileProcessContractReadiness | null | undefined
): Map<string, TerrainTileModelContract> {
  const contracts = new Map<string, TerrainTileModelContract>();
  if (!readiness) {
    return contracts;
  }

  readiness.entries.forEach((entry) => {
    const modelResRef = entry.modelResRef.trim().toLowerCase();
    const rawDeliveryUrl = entry.modelDeliveryUrl?.trim();
    if (
      modelResRef.length === 0 ||
      !rawDeliveryUrl ||
      entry.modelDeliveryStatus !== "ready" ||
      entry.renderLoaderHandoffStatus !== "ready"
    ) {
      return;
    }
    const textureUrlsByReference = new Map<string, string>();
    entry.materialTextureAssets?.forEach((asset) => {
      const deliveryUrl = resolvePlaceableAssetDeliveryUrl(asset.deliveryUrl);
      const reference = asset.reference.trim().toLowerCase();
      const resref = asset.resref.trim().toLowerCase();
      if (reference) {
        textureUrlsByReference.set(reference, deliveryUrl);
      }
      if (resref) {
        textureUrlsByReference.set(resref, deliveryUrl);
      }
    });
    contracts.set(modelResRef, {
      modelResRef,
      tileCatalogId: entry.tileId,
      cacheKey: entry.cacheKey,
      deliveryUrl: resolvePlaceableAssetDeliveryUrl(rawDeliveryUrl),
      rawDeliveryUrl,
      objectKey: entry.modelAssetObjectKey,
      extension: entry.modelAssetExtension,
      textureUrlsByReference
    });
  });
  return contracts;
}

function resolveTileModelContract(
  tile: SceneTile,
  contractsByModelResRef: Map<string, TerrainTileModelContract>
): TerrainTileModelContract | null {
  const modelResRef = tile.modelResRef?.trim().toLowerCase();
  if (!modelResRef) {
    return null;
  }
  return contractsByModelResRef.get(modelResRef) ?? null;
}

function buildTileModelRuntimeSummary(
  sceneData: AreaScene,
  contractsByModelResRef: Map<string, TerrainTileModelContract>,
  loadedTileIds: Set<string> = new Set(),
  failedTileIds: Set<string> = new Set(),
  loaderErrorsByTileId: Map<string, string> = new Map(),
  textureAppliedTileIds: Set<string> = new Set(),
  textureFailedTileIds: Set<string> = new Set()
): TerrainTileModelRuntimeSummary {
  const contractTiles: Array<{ tile: SceneTile; contract: TerrainTileModelContract }> = [];
  const blockedTiles: SceneTile[] = [];

  sceneData.tiles.forEach((tile) => {
    const contract = resolveTileModelContract(tile, contractsByModelResRef);
    if (contract) {
      contractTiles.push({ tile, contract });
      return;
    }
    blockedTiles.push(tile);
  });

  const loadedCount = contractTiles.filter(({ tile }) => loadedTileIds.has(tile.id)).length;
  const failedContractTiles = contractTiles.filter(({ tile }) => failedTileIds.has(tile.id));
  const failedCount = failedContractTiles.length;
  const textureContractTiles = contractTiles.filter(
    ({ contract }) => contract.textureUrlsByReference.size > 0
  );
  const textureAppliedCount = textureContractTiles.filter(({ tile }) =>
    textureAppliedTileIds.has(tile.id)
  ).length;
  const textureFailedTiles = textureContractTiles.filter(({ tile }) =>
    textureFailedTileIds.has(tile.id)
  );
  return {
    modelContractTileCount: contractTiles.length,
    modelPendingTileCount: Math.max(0, contractTiles.length - loadedCount - failedCount),
    modelLoadedTileCount: loadedCount,
    modelFailedTileCount: failedCount,
    modelBlockedTileCount: blockedTiles.length,
    modelMaterialTextureContractTileCount: textureContractTiles.length,
    modelMaterialTextureAppliedTileCount: textureAppliedCount,
    modelMaterialTextureFailedTileCount: textureFailedTiles.length,
    modelMaterialTexturePendingTileCount: Math.max(
      0,
      textureContractTiles.length - textureAppliedCount - textureFailedTiles.length
    ),
    modelDeliveryUrlSample:
      Array.from(new Set(contractTiles.map(({ contract }) => contract.rawDeliveryUrl)))
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .join("|") || "none",
    modelObjectKeySample:
      Array.from(new Set(contractTiles.map(({ contract }) => contract.objectKey ?? "missing")))
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .join("|") || "none",
    modelFailedTileSample:
      failedContractTiles
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .map(({ tile }) => tile.modelResRef ?? tile.id)
        .join("|") || "none",
    modelLoaderErrorSample:
      Array.from(new Set(failedContractTiles.map(({ tile }) => loaderErrorsByTileId.get(tile.id) ?? "unknown_loader_error")))
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .join("|") || "none",
    modelBlockedTileSample:
      blockedTiles
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .map((tile) => tile.modelResRef ?? tile.id)
        .join("|") || "none",
    modelMaterialTextureFailedTileSample:
      textureFailedTiles
        .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
        .map(({ tile }) => tile.modelResRef ?? tile.id)
        .join("|") || "none"
  };
}

function clearTerrainModelLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(TILE_MODEL_LAYER_NAME);
  if (!existing) {
    return;
  }
  existing.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
  runtime.scene.remove(existing);
}

function clearTerrainExtentLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(TILE_AREA_EXTENT_LAYER_NAME);
  if (!existing) {
    return;
  }
  existing.traverse((node) => {
    if (node instanceof THREE.Mesh || node instanceof THREE.LineSegments) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
  });
  runtime.scene.remove(existing);
}

function rebuildTerrainExtentLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  renderStatus: TerrainRenderStatus
): void {
  const width = Math.max(1, sceneData.width);
  const height = Math.max(1, sceneData.height);
  const layer = new THREE.Group();
  layer.name = TILE_AREA_EXTENT_LAYER_NAME;
  layer.userData.auroraTerrainExtentFootprintStatus = TILE_AREA_EXTENT_FOOTPRINT_STATUS;
  layer.userData.auroraTerrainExtentFootprintSize = `${width}x${height}`;
  layer.userData.auroraTerrainExtentFootprintSource = "AreaScene.width/height";
  layer.userData.auroraTerrainExtentTileRenderStatus = renderStatus.code;

  const fillGeometry = new THREE.PlaneGeometry(width, height);
  fillGeometry.rotateX(-Math.PI / 2);
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: "#12324a",
    transparent: true,
    opacity: renderStatus.code === "source_backed_tile_model_bridge" ? 0.16 : 0.1,
    depthWrite: false
  });
  const fill = new THREE.Mesh(fillGeometry, fillMaterial);
  fill.name = "terrain-area-extent-fill";
  fill.position.set(width / 2, TILE_GEOMETRY_Y - 0.018, height / 2);
  fill.raycast = () => undefined;
  layer.add(fill);

  const borderPoints = [
    new THREE.Vector3(0, TILE_GEOMETRY_Y + 0.006, 0),
    new THREE.Vector3(width, TILE_GEOMETRY_Y + 0.006, 0),
    new THREE.Vector3(width, TILE_GEOMETRY_Y + 0.006, 0),
    new THREE.Vector3(width, TILE_GEOMETRY_Y + 0.006, height),
    new THREE.Vector3(width, TILE_GEOMETRY_Y + 0.006, height),
    new THREE.Vector3(0, TILE_GEOMETRY_Y + 0.006, height),
    new THREE.Vector3(0, TILE_GEOMETRY_Y + 0.006, height),
    new THREE.Vector3(0, TILE_GEOMETRY_Y + 0.006, 0)
  ];
  const borderGeometry = new THREE.BufferGeometry().setFromPoints(borderPoints);
  const borderMaterial = new THREE.LineBasicMaterial({
    color: "#7fc2ff",
    transparent: true,
    opacity: 0.78
  });
  const border = new THREE.LineSegments(borderGeometry, borderMaterial);
  border.name = "terrain-area-extent-border";
  border.raycast = () => undefined;
  layer.add(border);

  runtime.scene.add(layer);
}

function addLoadedTileModelToLayer(
  layer: THREE.Group,
  tile: SceneTile,
  contract: TerrainTileModelContract,
  model: THREE.Object3D
): void {
  model.name = `terrain-backend-tile-model-${tile.id}`;
  model.position.set(tile.col + 0.5, TILE_GEOMETRY_Y + (tile.height ?? 0), tile.row + 0.5);
  model.rotation.y += tile.orientation * (Math.PI / 2);
  model.scale.multiplyScalar(TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE);
  model.userData.auroraTerrainTileModelRendererPath = TILE_MODEL_LOADER_PATH;
  model.userData.auroraTerrainTileModelStatus = "loaded";
  model.userData.auroraTerrainTileId = tile.id;
  model.userData.auroraTerrainTileModelResRef = tile.modelResRef ?? "";
  model.userData.auroraTerrainTileModelDeliveryUrl = contract.deliveryUrl;
  model.userData.auroraTerrainTileModelObjectKey = contract.objectKey ?? "";
  model.userData.auroraTerrainTileMaterialTextureCount = contract.textureUrlsByReference.size;
  layer.add(model);
}

function formatTerrainTileModelLoaderError(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.trim().slice(0, 180);
  }
  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim().slice(0, 180);
  }
  return "unknown_loader_error";
}

function markTerrainTileModelLoadFailed(
  runtime: TerrainRuntime,
  layer: THREE.Group,
  sceneData: AreaScene,
  tile: SceneTile,
  error: unknown,
  contractsByModelResRef: Map<string, TerrainTileModelContract>,
  renderStatus: TerrainRenderStatus,
  scenePackageReadiness: TerrainScenePackageReadiness,
  loadedTileIds: Set<string>,
  failedTileIds: Set<string>,
  loaderErrorsByTileId: Map<string, string>
): void {
  if (layer.parent !== runtime.scene) {
    return;
  }
  failedTileIds.add(tile.id);
  loaderErrorsByTileId.set(tile.id, formatTerrainTileModelLoaderError(error));
  const nextSummary = buildTileModelRuntimeSummary(
    sceneData,
    contractsByModelResRef,
    loadedTileIds,
    failedTileIds,
    loaderErrorsByTileId
  );
  layer.userData.auroraTerrainTileModelFailedCount = nextSummary.modelFailedTileCount;
  layer.userData.auroraTerrainTileModelLoaderErrorSample =
    nextSummary.modelLoaderErrorSample;
  writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
}

function rebuildTerrainModelLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  contractsByModelResRef: Map<string, TerrainTileModelContract>,
  renderStatus: TerrainRenderStatus,
  scenePackageReadiness: TerrainScenePackageReadiness
): TerrainTileModelRuntimeSummary {
  const layer = new THREE.Group();
  layer.name = TILE_MODEL_LAYER_NAME;
  layer.userData.auroraTerrainTileModelRendererPath = TILE_MODEL_LOADER_PATH;
  layer.userData.auroraTerrainTileModelContractCount = contractsByModelResRef.size;
  runtime.scene.add(layer);

  const loadedTileIds = new Set<string>();
  const failedTileIds = new Set<string>();
  const loaderErrorsByTileId = new Map<string, string>();
  const textureAppliedTileIds = new Set<string>();
  const textureFailedTileIds = new Set<string>();
  const initialSummary = buildTileModelRuntimeSummary(
    sceneData,
    contractsByModelResRef,
    loadedTileIds,
    failedTileIds,
    loaderErrorsByTileId,
    textureAppliedTileIds,
    textureFailedTileIds
  );
  writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, initialSummary);

  sceneData.tiles.forEach((tile) => {
    const contract = resolveTileModelContract(tile, contractsByModelResRef);
    if (!contract) {
      return;
    }

    void ensurePlaceableModel(runtime, contract.deliveryUrl).then((model) => {
      if (!model || layer.parent !== runtime.scene) {
        if (!model) {
          markTerrainTileModelLoadFailed(
            runtime,
            layer,
            sceneData,
            tile,
            "tile_model_loader_returned_null",
            contractsByModelResRef,
            renderStatus,
            scenePackageReadiness,
            loadedTileIds,
            failedTileIds,
            loaderErrorsByTileId
          );
        }
        return;
      }
      addLoadedTileModelToLayer(layer, tile, contract, model);
      if (contract.textureUrlsByReference.size > 0) {
        void ensurePlaceableTexturesByReference(
          runtime,
          contract.textureUrlsByReference
        ).then((texturesByReference) => {
          if (layer.parent !== runtime.scene || model.parent !== layer) {
            return;
          }
          if (texturesByReference.size === 0) {
            model.userData.auroraTerrainTileMaterialTextureStatus = "missing";
            textureFailedTileIds.add(tile.id);
            const nextSummary = buildTileModelRuntimeSummary(
              sceneData,
              contractsByModelResRef,
              loadedTileIds,
              failedTileIds,
              loaderErrorsByTileId,
              textureAppliedTileIds,
              textureFailedTileIds
            );
            writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
            return;
          }
          applyPlaceableTexturesToModel(model, texturesByReference);
          model.userData.auroraTerrainTileMaterialTextureStatus = "applied";
          model.userData.auroraTerrainTileMaterialTextureAppliedCount =
            texturesByReference.size;
          textureAppliedTileIds.add(tile.id);
          const nextSummary = buildTileModelRuntimeSummary(
            sceneData,
            contractsByModelResRef,
            loadedTileIds,
            failedTileIds,
            loaderErrorsByTileId,
            textureAppliedTileIds,
            textureFailedTileIds
          );
          writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
        }).catch(() => {
          if (layer.parent !== runtime.scene || model.parent !== layer) {
            return;
          }
          model.userData.auroraTerrainTileMaterialTextureStatus = "failed";
          textureFailedTileIds.add(tile.id);
          const nextSummary = buildTileModelRuntimeSummary(
            sceneData,
            contractsByModelResRef,
            loadedTileIds,
            failedTileIds,
            loaderErrorsByTileId,
            textureAppliedTileIds,
            textureFailedTileIds
          );
          writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
        });
      }
      loadedTileIds.add(tile.id);
      const nextSummary = buildTileModelRuntimeSummary(
        sceneData,
        contractsByModelResRef,
        loadedTileIds,
        failedTileIds,
        loaderErrorsByTileId,
        textureAppliedTileIds,
        textureFailedTileIds
      );
      layer.userData.auroraTerrainTileModelLoadedCount = nextSummary.modelLoadedTileCount;
      writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
    }).catch((error: unknown) => {
      markTerrainTileModelLoadFailed(
        runtime,
        layer,
        sceneData,
        tile,
        error,
        contractsByModelResRef,
        renderStatus,
        scenePackageReadiness,
        loadedTileIds,
        failedTileIds,
        loaderErrorsByTileId
      );
    });
  });

  return initialSummary;
}

export function clearTerrainMesh(runtime: TerrainRuntime): void {
  clearTerrainLabelLayer(runtime);
  clearTerrainModelLayer(runtime);
  clearTerrainExtentLayer(runtime);
  clearTerrainRenderDataset(runtime);
  if (!runtime.tileMesh) {
    return;
  }
  runtime.scene.remove(runtime.tileMesh);
  runtime.tileMesh.geometry.dispose();
  (runtime.tileMesh.material as THREE.Material).dispose();
  runtime.tileMesh = null;
  runtime.tileIdByInstance = [];
}

export function rebuildTerrainMesh(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  selectedTileId: string | null,
  debugState: TerrainDebugState,
  tileProcessReadiness?: AreaTileProcessContractReadiness | null
): void {
  clearTerrainMesh(runtime);
  const renderStatus = resolveTerrainRenderStatus(sceneData);
  const scenePackageReadiness = resolveTerrainScenePackageReadiness(sceneData, renderStatus);
  rebuildTerrainExtentLayer(runtime, sceneData, renderStatus);
  const tileModelContractsByModelResRef =
    buildTileModelContractsByModelResRef(tileProcessReadiness);
  const tileModelSummary = rebuildTerrainModelLayer(
    runtime,
    sceneData,
    tileModelContractsByModelResRef,
    renderStatus,
    scenePackageReadiness
  );
  runtime.scene.userData.auroraTerrainRenderStatus = renderStatus.code;
  runtime.scene.userData.auroraTerrainRenderLabel = renderStatus.label;
  runtime.scene.userData.auroraTerrainTileCount = renderStatus.tileCount;
  runtime.scene.userData.auroraTerrainModelResolvedCount = renderStatus.modelResolvedCount;
  runtime.scene.userData.auroraTerrainModelSourceCounts = {
    ...renderStatus.modelSourceCounts
  };
  runtime.scene.userData.auroraTerrainSourceBridge =
    renderStatus.code === "source_backed_tile_model_bridge";
  runtime.scene.userData.auroraTerrainGeometryStatus =
    renderStatus.code === "source_backed_tile_model_bridge"
      ? TILE_BRIDGE_DISCLOSURE
      : renderStatus.code;
  runtime.scene.userData.auroraTerrainScenePackagePath = scenePackageReadiness.path;
  runtime.scene.userData.auroraTerrainScenePackageStatus = scenePackageReadiness.status;
  runtime.scene.userData.auroraTerrainScenePackageBlockers = [
    ...scenePackageReadiness.blockers
  ];
  runtime.scene.userData.auroraTerrainMdlAvailabilityStatus =
    scenePackageReadiness.mdlAvailabilityStatus;
  runtime.scene.userData.auroraTerrainGlbAvailabilityStatus =
    scenePackageReadiness.glbAvailabilityStatus;
  runtime.scene.userData.auroraTerrainTextureAvailabilityStatus =
    scenePackageReadiness.textureAvailabilityStatus;
  runtime.scene.userData.auroraTerrainTileAssetContractPath =
    scenePackageReadiness.tileAssetContractPath;
  runtime.scene.userData.auroraTerrainTileAssetContractStatus =
    scenePackageReadiness.tileAssetContractStatus;
  runtime.scene.userData.auroraTerrainTileCatalogCandidateIdsSample =
    scenePackageReadiness.tileCatalogCandidateIdsSample;
  runtime.scene.userData.auroraTerrainTileAssetContractSamples =
    scenePackageReadiness.tileAssetContractSamples;
  runtime.scene.userData.auroraTerrainTileAssetContractBlockers = [
    ...scenePackageReadiness.tileAssetContractBlockers
  ];
  runtime.scene.userData.auroraTerrainTileRenderLoaderHandoffPath =
    scenePackageReadiness.tileRenderLoaderHandoffPath;
  runtime.scene.userData.auroraTerrainTileRenderLoaderHandoffStatus =
    scenePackageReadiness.tileRenderLoaderHandoffStatus;
  runtime.scene.userData.auroraTerrainTileRenderGeometryMode =
    scenePackageReadiness.tileRenderGeometryMode;
  runtime.scene.userData.auroraTerrainTileRenderGlbGeometryStatus =
    scenePackageReadiness.tileRenderGlbGeometryStatus;
  runtime.scene.userData.auroraTerrainTileRenderMaterialBindingStatus =
    scenePackageReadiness.tileRenderMaterialBindingStatus;
  runtime.scene.userData.auroraTerrainTileRenderLoaderOutputStatus =
    scenePackageReadiness.tileRenderLoaderOutputStatus;
  runtime.scene.userData.auroraTerrainTileRenderRendererHandoffStatus =
    scenePackageReadiness.tileRenderRendererHandoffStatus;
  runtime.scene.userData.auroraTerrainTileBridgeParityStatus =
    scenePackageReadiness.tileBridgeParityStatus;
  runtime.scene.userData.auroraTerrainTileRenderContractBlockers = [
    ...scenePackageReadiness.tileRenderContractBlockers
  ];
  runtime.scene.userData.auroraTerrainTileModelRendererPath = TILE_MODEL_LOADER_PATH;
  runtime.scene.userData.auroraTerrainTileModelContractTileCount =
    tileModelSummary.modelContractTileCount;
  runtime.scene.userData.auroraTerrainTileModelBlockedTileCount =
    tileModelSummary.modelBlockedTileCount;
  writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, tileModelSummary);

  if (!renderStatus.renderGenericMesh) {
    runtime.tileIdByInstance = sceneData.tiles.map((tile) => tile.id);
    return;
  }

  const bridgeTiles = sceneData.tiles.filter(
    (tile) => !resolveTileModelContract(tile, tileModelContractsByModelResRef)
  );
  if (bridgeTiles.length === 0) {
    runtime.tileIdByInstance = [];
    return;
  }

  const geometry = createTerrainGeometry(renderStatus);
  const compressionOpacity =
    debugState.textureCompression === "uastc"
      ? 0.95
      : debugState.textureCompression === "etc1s"
        ? 0.82
        : 0.72;
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: debugState.hiddenMeshes ? 0.55 : compressionOpacity,
    wireframe: debugState.wireframe
  });
  const mesh = new THREE.InstancedMesh(geometry, material, bridgeTiles.length);
  mesh.name = "terrain-tiles";
  mesh.userData.auroraTileSourceType = sceneData.tileSource?.type ?? "unknown";
  mesh.userData.auroraTilesetResRef = sceneData.tileSource?.tilesetResRef ?? "";
  mesh.userData.auroraTileFallbackReason = sceneData.tileSource?.fallbackReason ?? "";
  mesh.userData.auroraTerrainRenderStatus = renderStatus.code;
  mesh.userData.auroraTerrainGeometryStatus =
    renderStatus.code === "source_backed_tile_model_bridge"
      ? TILE_BRIDGE_DISCLOSURE
      : renderStatus.code;
  mesh.userData.auroraTerrainBridgeReadability =
    renderStatus.code === "source_backed_tile_model_bridge" ? TILE_BRIDGE_READABILITY : "";
  mesh.userData.auroraTerrainTileRenderLoaderHandoffStatus =
    scenePackageReadiness.tileRenderLoaderHandoffStatus;
  mesh.userData.auroraTerrainTileRenderGeometryMode =
    scenePackageReadiness.tileRenderGeometryMode;
  mesh.userData.auroraTerrainTileRenderLoaderOutputStatus =
    scenePackageReadiness.tileRenderLoaderOutputStatus;
  mesh.userData.auroraTerrainTileBridgeParityStatus =
    scenePackageReadiness.tileBridgeParityStatus;
  mesh.userData.auroraTerrainTileModelBridgeOnlyCount = bridgeTiles.length;
  mesh.userData.auroraTerrainTileModelContractTileCount =
    tileModelSummary.modelContractTileCount;
  mesh.userData.auroraTileBridgeModelResRefsSample = bridgeTiles
    .map((tile) => tile.modelResRef)
    .filter((modelResRef): modelResRef is string => Boolean(modelResRef))
    .slice(0, 24)
    .join("|");
  mesh.userData.auroraTileBridgeTileIdsSample = bridgeTiles
    .map((tile) => tile.tileId)
    .filter((tileId): tileId is number => Number.isFinite(tileId ?? Number.NaN))
    .slice(0, 24)
    .join("|");

  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Matrix4();
  const color = new THREE.Color();

  bridgeTiles.forEach((tile, index) => {
    matrix.makeTranslation(tile.col + 0.5, TILE_GEOMETRY_Y + (tile.height ?? 0), tile.row + 0.5);
    rotation.makeRotationY(tile.orientation * (Math.PI / 2));
    matrix.multiply(rotation);
    mesh.setMatrixAt(index, matrix);

    if (debugState.textures) {
      if (renderStatus.code === "source_backed_tile_model_bridge") {
        color.copy(resolveSourceBackedTileBridgeColor(tile));
      } else {
        color.set(TERRAIN_COLORS[tile.terrain]);
      }
    } else {
      color.set("#4f6179");
    }
    if (debugState.walkmeshOverlay) {
      color.lerp(new THREE.Color("#36ff9f"), 0.42);
    }
    if (selectedTileId === tile.id) {
      color.offsetHSL(0, 0, 0.18);
    }
    mesh.setColorAt(index, color);
    runtime.tileIdByInstance[index] = tile.id;
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  runtime.tileMesh = mesh;
  runtime.scene.add(mesh);
  rebuildTerrainLabelLayer(runtime, { ...sceneData, tiles: bridgeTiles }, renderStatus);
}

function createTerrainGeometry(renderStatus: TerrainRenderStatus): THREE.BufferGeometry {
  if (renderStatus.code !== "source_backed_tile_model_bridge") {
    const geometry = new THREE.PlaneGeometry(1, 1);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  const shape = new THREE.Shape([
    new THREE.Vector2(-0.46, -0.46),
    new THREE.Vector2(0.46, -0.46),
    new THREE.Vector2(0.46, 0.12),
    new THREE.Vector2(0.16, 0.46),
    new THREE.Vector2(-0.46, 0.46)
  ]);
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

function resolveSourceBackedTileBridgeColor(tile: SceneTile): THREE.Color {
  const sourceKey = [
    tile.tilesetResRef ?? "",
    tile.modelResRef ?? "",
    String(tile.tileId ?? ""),
    String(tile.tileIndex ?? "")
  ].join(":");
  const hash = hashString(sourceKey || tile.id);
  const hue = (hash % 360) / 360;
  const saturation = 0.34 + ((hash >> 3) % 20) / 100;
  const lightness = 0.34 + ((hash >> 7) % 18) / 100;
  const color = new THREE.Color().setHSL(hue, saturation, lightness);
  if (tile.modelSource === "set-tile-section") {
    color.lerp(new THREE.Color("#d8edf4"), 0.12);
  } else if (tile.modelSource === "are-tile-list") {
    color.lerp(new THREE.Color("#f2dd9f"), 0.16);
  }
  if (Number.isFinite(tile.height ?? Number.NaN) && (tile.height ?? 0) !== 0) {
    const heightLightness = Math.min(0.16, Math.abs(tile.height ?? 0) * 0.035);
    color.offsetHSL(0, 0, heightLightness);
  }
  return color;
}

function clearTerrainLabelLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(TILE_BRIDGE_LABEL_LAYER_NAME);
  if (!existing) {
    return;
  }
  existing.traverse((node) => {
    if (!(node instanceof THREE.Sprite)) {
      return;
    }
    node.material.map?.dispose();
    node.material.dispose();
  });
  runtime.scene.remove(existing);
}

function rebuildTerrainLabelLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  renderStatus: TerrainRenderStatus
): void {
  if (renderStatus.code !== "source_backed_tile_model_bridge") {
    return;
  }

  const labelLayer = new THREE.Group();
  labelLayer.name = TILE_BRIDGE_LABEL_LAYER_NAME;
  labelLayer.userData.auroraTerrainBridgeLabelLayer = true;

  const labelStride = Math.max(1, Math.ceil(sceneData.tiles.length / MAX_TILE_BRIDGE_LABELS));
  let labelCount = 0;
  sceneData.tiles.forEach((tile, index) => {
    if (index % labelStride !== 0) {
      return;
    }
    const label = createTextSprite(resolveTileBridgeLabel(tile), 0.36, {
      autoWidth: true,
      minWidthPx: 220,
      maxWidthPx: 680,
      fillColor: "#f4fbff",
      strokeColor: "rgba(0, 0, 0, 0.68)",
      backgroundFill: "rgba(7, 16, 28, 0.78)",
      backgroundStroke: "rgba(154, 213, 255, 0.86)"
    });
    label.name = `terrain-source-label-${tile.id}`;
    label.position.set(tile.col + 0.5, TILE_GEOMETRY_Y + (tile.height ?? 0) + 0.11, tile.row + 0.5);
    label.userData.auroraTileId = tile.tileId ?? "";
    label.userData.auroraTileIndex = tile.tileIndex ?? "";
    label.userData.auroraTileModelResRef = tile.modelResRef ?? "";
    label.userData.auroraTileOrientation = tile.orientation;
    label.userData.auroraTileHeight = tile.height ?? 0;
    labelLayer.add(label);
    labelCount += 1;
  });

  labelLayer.userData.auroraTerrainBridgeLabelCount = labelCount;
  labelLayer.userData.auroraTerrainBridgeLabelStride = labelStride;
  runtime.scene.userData.auroraTerrainBridgeLabelCount = labelCount;
  runtime.scene.userData.auroraTerrainBridgeLabelStride = labelStride;
  if (runtime.container) {
    runtime.container.dataset.areaTerrainBridgeLabelCount = String(labelCount);
    runtime.container.dataset.areaTerrainBridgeLabelStride = String(labelStride);
  }
  runtime.scene.add(labelLayer);
}

function resolveTileBridgeLabel(tile: SceneTile): string {
  const tileId = tile.tileId ?? tile.tileIndex ?? "?";
  const model = tile.modelResRef ?? "model?";
  const height = Number.isFinite(tile.height ?? Number.NaN) ? tile.height ?? 0 : 0;
  return `${tileId} ${model} r${tile.orientation} h${height}`;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}
