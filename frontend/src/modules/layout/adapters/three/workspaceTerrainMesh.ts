import * as THREE from "three";
import type {
  AreaScene,
  SceneAreaGlobalLighting,
  SceneAreaGlobalLightingFieldName,
  SceneTile,
  TerrainBrushKind
} from "../../contracts";
import type { AreaTileProcessContractReadiness } from "../../../tiles/application/areaTileProcessContractReadiness";
import {
  applyPlaceableTexturesToModel,
  ensurePlaceableModel,
  ensurePlaceableTexture,
  ensurePlaceableTexturesByReferenceProgressive,
  PLACEABLE_MODEL_LOAD_PRIORITY_HIGH,
  PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH,
  type PlaceableTextureRuntimeCache,
  type PlaceableModelRuntimeCache
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import { resolvePlaceableAssetDeliveryUrl } from "../../../placeables/application/placeableRenderAssetResolver";
import { createTextSprite } from "./workspaceCanvasSprites";
import {
  resolveAuroraAreaRenderTileCenterX,
  resolveAuroraAreaRenderTileCenterZ,
  resolveAuroraAreaRenderTileImageMapOrientation,
  resolveAuroraAreaRenderTileOrientation
} from "./workspaceAreaRenderCoordinates";
import {
  buildAuroraLightManagerPreviewScoreUserData,
  selectAuroraLightManagerPreviewBudget,
  type AuroraLightManagerPreviewScore
} from "./auroraLightManagerPreview";
import { installAuroraLinearLightFalloffShaderChunk } from "./auroraThreeLightFalloff";

const TILE_GEOMETRY_Y = 0;
const TILE_AREA_EXTENT_LAYER_NAME = "terrain-area-extent-footprint";
const TILE_MODEL_LAYER_NAME = "terrain-backend-tile-models";
const TILE_IMAGE_MAP_LAYER_NAME = "terrain-imagemap2d-tiles";
const TILE_LIGHT_LAYER_NAME = "terrain-tile-light-sources";
const AREA_GLOBAL_LIGHTING_LAYER_NAME = "terrain-area-global-lighting";
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
const TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP = 128;
const TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE =
  "decompiled FUN_00a41e30 active light slot clamp min(configured, 0x80)";
const TERRAIN_TILE_MAIN_LIGHT_DISTANCE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453281 loads lightcolor.2da for tile runtime; 453323-453528 resolves RGB channels for Tile_MainLight1/Tile_MainLight2 through FUN_00af3980; no FUN_00a546cc fx/AuroraLight carrier is created for main lights in this path";
const TERRAIN_TILE_MAIN_LIGHT_RADIUS_PROOF_STATUS =
  "source-backed-tile-main-lightcolor-static-no-point-radius";
const TERRAIN_TILE_MAIN_LIGHT_FALLOFF_FORMULA =
  "not-applicable-static-tile-lightcolor";
const TERRAIN_TILE_MAIN_LIGHT_RENDERER_MODE =
  "static-tile-lightcolor-table-diagnostic";
const TERRAIN_TILE_SOURCE_LIGHT_CARRIER_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes; nwn_base.key fx_flame01.mdl AuroraLight01 controller radius 0x58 = 7, shadowradius 0x60 = 15, verticaldisplacement 0x64 = 2";
const TERRAIN_TILE_SOURCE_LIGHT_RADIUS_PROOF_STATUS =
  "source-backed-fx_flame01-auroralight01-radius-controller";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_MODEL_FILE_NAME = "fx_flame01.mdl";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_MODEL_HASH =
  "9814d45381cab7ecb5f47f9b16bdeb23b983687ff0b9bcb0244ffc04034dfecf";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_NODE_NAME = "AuroraLight01";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_NODE_OFFSET = 21488;
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_RADIUS = 7;
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_RADIUS_UNITS = "aurora-model-units";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_UNIT_SCALE_SOURCE =
  "tile MDL Aurora model units scaled by TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE";
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_SHADOW_RADIUS = 15;
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_VERTICAL_DISPLACEMENT = 2;
const TERRAIN_TILE_SOURCE_LIGHT_SOURCE_PRIORITY = 4;
const TERRAIN_TILE_SOURCE_LIGHT_WORLD_RADIUS =
  TERRAIN_TILE_SOURCE_LIGHT_SOURCE_RADIUS * TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE;
const TERRAIN_TILE_SOURCE_LIGHT_FALLOFF_FORMULA = "max(0,1-distance/radius)";
const TERRAIN_TILE_SOURCE_LIGHT_FALLOFF_PROOF_STATUS =
  "source-backed-active-light-linear-radius-falloff";
const TERRAIN_TILE_SOURCE_LIGHT_INTENSITY_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:866543-866563 accumulates active light as color * max(0,1-distance/radius) * multiplier; Aurora Web stores normalized RGB in Three.Color and RGB max in Three.PointLight.intensity";
const TERRAIN_TILE_SOURCE_LIGHT_INTENSITY_PROOF_STATUS =
  "source-backed-tile-source-lightcolor-rgb-preserved-multiplier-neutral-fallback";
const TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_FALLBACK = 1;
const TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_SOURCE =
  "fx_flame01/AuroraLight01 multiplier is not recovered in current local resource artifacts; Aurora Web uses neutral 1.0 and does not apply preview attenuation";
const TERRAIN_TILE_LIGHT_POSITION_SOURCE =
  "tile-center-preview-not-sourcelight-node-transform";
const TERRAIN_TILE_LIGHT_SOURCE_NODE_POSITION_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:453567-453602 creates fx_flame01 at sourcelight1/sourcelight2 tile source-light nodes";
const TERRAIN_TILE_LIGHT_SOURCE_NODE_POSITION_PROOF_STATUS =
  "source-backed-tile-mdl-sourcelight-node-transform";
const TERRAIN_TILE_MATERIAL_LIGHTING_MODE =
  "texture_color_unlit_use_area_lighting_disabled";
const TERRAIN_TILE_MATERIAL_LIGHTING_MODE_SOURCE =
  "Aurora Toolset Use Area Lighting disabled; cap94 terrain basic-material A/B matched warmer source texture color without touching placeables";
const TERRAIN_AREA_GLOBAL_LIGHT_INTENSITY_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:256239-256303 selects Sun/Moon ambient+diffuse fields by IsNight, unpacks packed channels as byte0/byte1/byte2 divided by 255.0, then sends controlpart gidy_sun_amb/gidy_sun_diff color commands; Aurora Web uses Three intensity 1.0 so the source color carries the scalar";
const TERRAIN_AREA_GLOBAL_FOG_RANGE_SOURCE =
  "C:/Projects/New Folder/export/decompiled_all.c:368987-369024 enables scene fog, selects Sun/Moon FogAmount/FogColor by IsNight, unpacks color as byte0/byte1/byte2 divided by 255.0, computes fog start as 25 - FogAmount*25/15, and reads FogClipDist from area offset +0x100 for fog end; Aurora Web scales those Aurora metre values to tile space for Three.Fog";
const TERRAIN_AREA_GLOBAL_SHADOW_STATUS_SOURCE =
  "decompiled ARE SunShadows/MoonShadows/IsNight fields at decompiled_all.c:255208-255218 and decompiled_all.c:255894-255901";
const TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_SOURCE =
  "ARE.ShadowOpacity read/write at decompiled_all.c:255224/255904; normalized to shadowOpacity/100 at decompiled_all.c:256306";
const TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_FACTOR_SOURCE =
  "decompiled_all.c:256306 stores ShadowOpacity/100, then shadow plane alpha multiplies that factor at decompiled_all.c:910844";
const TERRAIN_TILE_SHADOW_RECEIVER_STATUS =
  "three-preview-terrain-receiveShadow-enabled";
const TERRAIN_TILE_SHADOW_RECEIVER_SOURCE =
  "ARE SunShadows/MoonShadows directional-light preview receiver; retail shadow-plane projection not recovered";
const TILE_ASSET_CONTRACT_SAMPLE_LIMIT = 12;
const TILE_MODEL_VISIBLE_MESH_SAMPLE_LIMIT = 32;
const TILE_TRANSFORM_SAMPLE_LIMIT = 32;
const TERRAIN_IMAGE_MAP_SOURCE_BACKED_OVERLAY = false;
const TERRAIN_IMAGE_MAP_TRANSPARENT_VOID_OVERLAY = true;
const TERRAIN_IMAGE_MAP_SOURCE_BACKED_REPLACES_TILE_MODELS = false;
const TERRAIN_IMAGE_MAP_SOURCE_BACKED_HIDES_GLB_GROUND_SURFACES = false;
const TERRAIN_TILE_ROTATETEXTURE_COMPENSATION = true;
const TERRAIN_TILE_ASSET_LOAD_TIMEOUT_MS = 120_000;
const TERRAIN_IMAGE_MAP_VOID_ALPHA_MAX_RGB = 8;
const TERRAIN_IMAGE_MAP_VOID_ALPHA_FEATHER_MAX_RGB = 32;
const BLANK_TERRAIN_IMAGE_MAP_MODEL_RESREFS = new Set([
  "sic11_a00_00",
  "tni01_o20_01"
]);

const terrainImageMapTransparentVoidTextureCache = new WeakMap<
  THREE.Texture,
  THREE.Texture
>();

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

function withTerrainTileAssetLoadTimeout<T>(
  request: Promise<T | null>
): Promise<T | null> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeoutRequest = new Promise<null>((resolve) => {
    timeout = globalThis.setTimeout(
      () => resolve(null),
      TERRAIN_TILE_ASSET_LOAD_TIMEOUT_MS
    );
  });
  return Promise.race([request, timeoutRequest]).finally(() => {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  });
}

function ensureTerrainTileModel(
  runtime: TerrainRuntime,
  deliveryUrl: string,
  options: Parameters<typeof ensurePlaceableModel>[2]
): Promise<THREE.Object3D | null> {
  return ensurePlaceableModel(runtime, deliveryUrl, options);
}

function ensureTerrainTileTexture(
  runtime: TerrainRuntime,
  deliveryUrl: string
): Promise<THREE.Texture | null> {
  return withTerrainTileAssetLoadTimeout(
    ensurePlaceableTexture(runtime, deliveryUrl, {
      priority: PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH
    })
  );
}

async function ensureTerrainTileTexturesByReference(
  runtime: TerrainRuntime,
  textureUrlsByReference: Map<string, string>,
  onTextureLoaded?: (texturesByReference: Map<string, THREE.Texture>) => void
): Promise<Map<string, THREE.Texture>> {
  return ensurePlaceableTexturesByReferenceProgressive(
    runtime,
    textureUrlsByReference,
    ({ texturesByReference }) => {
      onTextureLoaded?.(texturesByReference);
    },
    { priority: PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH }
  );
}

interface TerrainDebugState {
  textureCompression: "uastc" | "etc1s" | string;
  hiddenMeshes: boolean;
  ceilingMeshes: boolean;
  wireframe: boolean;
  textures: boolean;
  displayFog?: boolean;
  useAreaLighting?: boolean;
  walkmeshOverlay: boolean;
}

function applyAuroraAreaRenderFrameMirror(layer: THREE.Object3D, areaWidth: number): void {
  const mirrorWidth = Math.max(1, areaWidth);
  layer.position.x = mirrorWidth;
  layer.scale.x = -Math.abs(layer.scale.x || 1);
  layer.userData.auroraAreaRenderFrameMirror = "coordinate-x";
  layer.userData.auroraAreaRenderFrameMirrorWidth = mirrorWidth;
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

export interface TerrainTileModelAssetContractIdentity {
  modelResRef: string;
  cacheKey?: string;
  deliveryUrl: string;
}

export interface TerrainTileModelAssetRequestIdentity {
  deliveryUrl: string;
  runtimeCacheKey: string;
}

/**
 * Keeps the shared model cache tied to the edited tile definition and the
 * backend asset version. Cells using the same model still share one request.
 */
export function resolveTerrainTileModelAssetRequestIdentity(
  tile: Pick<SceneTile, "modelResRef">,
  contract: TerrainTileModelAssetContractIdentity
): TerrainTileModelAssetRequestIdentity {
  const modelResRef =
    tile.modelResRef?.trim().toLowerCase() || contract.modelResRef.trim().toLowerCase();
  const contractVersion = contract.cacheKey?.trim() || contract.deliveryUrl.trim();
  return {
    deliveryUrl: contract.deliveryUrl,
    runtimeCacheKey: `terrain-tile-model:${modelResRef}:${contractVersion}`
  };
}

interface TerrainTileModelRuntimeSummary {
  modelContractTileCount: number;
  modelPendingTileCount: number;
  modelLoadedTileCount: number;
  modelFailedTileCount: number;
  modelBlockedTileCount: number;
  modelVisibleMeshCount: number;
  modelMaterialCount: number;
  modelMaterialMapCount: number;
  modelShadowReceiverMeshCount: number;
  modelShadowReceiverSample: string;
  modelCeilingMeshMatchedCount: number;
  modelCeilingMeshHiddenCount: number;
  modelVisibleMeshSample: string;
  modelHiddenMeshSample: string;
  modelTileTransformSample: string;
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

type TerrainTileLightChannel =
  | "mainLight1"
  | "mainLight2"
  | "sourceLight1"
  | "sourceLight2";

interface TerrainTileLightEntry {
  tile: SceneTile;
  channel: TerrainTileLightChannel;
  role: "main" | "source";
  rowId: number;
  color: [number, number, number];
  sourceKey?: string;
}

interface TerrainTileLightBudgetEntry {
  entry: TerrainTileLightEntry;
  sourceIndex: number;
  retailScore: AuroraLightManagerPreviewScore;
  rank: number;
  accepted: boolean;
}

type AreaGlobalLightingPhase = "sun" | "moon";

interface AreaGlobalLightingPreview {
  phase: AreaGlobalLightingPhase;
  fieldsByName: Map<SceneAreaGlobalLightingFieldName, number>;
  ambientColor?: THREE.Color;
  diffuseColor?: THREE.Color;
  fogColor?: THREE.Color;
  fogClipDistance?: number;
  fogAmount?: number;
  shadowOpacity?: number;
  shadowOpacityFactor?: number;
  shadowEnabled: boolean;
  shadowSourceField: "SunShadows" | "MoonShadows";
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
  visibleMeshCount: number;
  materialCount: number;
  materialMapCount: number;
  shadowReceiverMeshCount: number;
  shadowReceiverStatus: typeof TERRAIN_TILE_SHADOW_RECEIVER_STATUS;
  shadowReceiverSource: typeof TERRAIN_TILE_SHADOW_RECEIVER_SOURCE;
  shadowReceiverSample: string;
  ceilingMeshMatchedCount: number;
  ceilingMeshHiddenCount: number;
  visibleMeshSample: string;
  hiddenMeshSample: string;
  tileTransformSample: string;
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
    `setOrientation=${tile.tilesetOrientation ?? "missing"}`,
    `path=${tile.pathNode ?? "missing"}`,
    `visibility=${tile.visibilityNode ?? "missing"}`,
    `visibilityOrientation=${tile.visibilityOrientation ?? "missing"}`,
    `doorVisibility=${tile.doorVisibilityNode ?? "missing"}`,
    `doorVisibilityOrientation=${tile.doorVisibilityOrientation ?? "missing"}`,
    `height=${height}`,
    `source=${tile.modelSource ?? "missing"}`
  ].join(",");
}

function formatAuroraWorldTileCenter(value: number): string {
  return value.toFixed(2);
}

function formatTerrainTileTransformSample(tile: SceneTile, sceneData: AreaScene): string {
  const renderYawQuarterTurns = resolveAuroraAreaRenderTileOrientation(
    tile.orientation,
    tile.tilesetOrientation
  );
  const imageMapYawQuarterTurns = resolveAuroraAreaRenderTileImageMapOrientation(
    tile.orientation
  );
  const auroraWorldCenterX = tile.col * 10 + 5;
  const auroraWorldCenterY = tile.row * 10 + 5;
  return [
    `id=${tile.id}`,
    `index=${tile.tileIndex ?? "missing"}`,
    `r${tile.row}`,
    `c${tile.col}`,
    `tile=${tile.tileId ?? "missing"}`,
    `model=${tile.modelResRef ?? "missing"}`,
    `areOrientation=${tile.orientation}`,
    `setOrientation=${tile.tilesetOrientation ?? "missing"}`,
    `renderYawQuarterTurns=${renderYawQuarterTurns}`,
    `renderYawDeg=${renderYawQuarterTurns * 90}`,
    `imageMapYawQuarterTurns=${imageMapYawQuarterTurns}`,
    `imageMapYawDeg=${imageMapYawQuarterTurns * 90}`,
    `areHeight=${tile.height ?? 0}`,
    `auroraWorldCenter=${formatAuroraWorldTileCenter(auroraWorldCenterX)}x${formatAuroraWorldTileCenter(auroraWorldCenterY)}`,
    `renderCenter=${formatAuroraWorldTileCenter(resolveAuroraAreaRenderTileCenterX(tile.col, sceneData.width))}x${formatAuroraWorldTileCenter(resolveAuroraAreaRenderTileCenterZ(tile.row, sceneData.height))}`
  ].join(",");
}

function buildTerrainTileTransformSample(sceneData: AreaScene): string {
  return (
    sceneData.tiles
      .slice(0, TILE_TRANSFORM_SAMPLE_LIMIT)
      .map((tile) => formatTerrainTileTransformSample(tile, sceneData))
      .join("|") || "none"
  );
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
  delete runtime.container.dataset.areaTerrainTileModelVisibleMeshCount;
  delete runtime.container.dataset.areaTerrainTileModelMaterialCount;
  delete runtime.container.dataset.areaTerrainTileModelMaterialMapCount;
  delete runtime.container.dataset.areaTerrainTileShadowReceiverMeshCount;
  delete runtime.container.dataset.areaTerrainTileShadowReceiverStatus;
  delete runtime.container.dataset.areaTerrainTileShadowReceiverSource;
  delete runtime.container.dataset.areaTerrainTileShadowReceiverSample;
  delete runtime.container.dataset.areaTerrainTileCeilingMeshMatchedCount;
  delete runtime.container.dataset.areaTerrainTileCeilingMeshHiddenCount;
  delete runtime.container.dataset.areaTerrainTileModelVisibleMeshSample;
  delete runtime.container.dataset.areaTerrainTileModelHiddenMeshSample;
  delete runtime.container.dataset.areaTerrainTileTransformSample;
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
  delete runtime.container.dataset.areaTerrainImageMap2DStatus;
  delete runtime.container.dataset.areaTerrainImageMap2DContractCount;
  delete runtime.container.dataset.areaTerrainImageMap2DLoadedCount;
  delete runtime.container.dataset.areaTerrainImageMap2DFailedCount;
  delete runtime.container.dataset.areaTerrainImageMap2DSample;
  delete runtime.container.dataset.areaTerrainTileLightCandidateCount;
  delete runtime.container.dataset.areaTerrainTileLightAcceptedCount;
  delete runtime.container.dataset.areaTerrainTileLightDroppedCount;
  delete runtime.container.dataset.areaTerrainTileLightBudgetCap;
  delete runtime.container.dataset.areaTerrainTileLightBudgetSource;
  delete runtime.container.dataset.areaTerrainTileLightTileCount;
  delete runtime.container.dataset.areaTerrainTileLightChannels;
  delete runtime.container.dataset.areaTerrainTileLightColorSample;
  delete runtime.container.dataset.areaTerrainTileLightSourceKeySample;
  delete runtime.container.dataset.areaTerrainTileLightPreviewColorSample;
  delete runtime.container.dataset.areaTerrainTileLightStatus;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightingStatus;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightingFieldCount;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightingPhase;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightingPhaseSource;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightingFields;
  delete runtime.container.dataset.areaTerrainAreaGlobalFogStatus;
  delete runtime.container.dataset.areaTerrainAreaGlobalFogClipDistance;
  delete runtime.container.dataset.areaTerrainAreaGlobalFogAmount;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowOpacity;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowOpacitySource;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowOpacityFactor;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowOpacityFactorSource;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowStatus;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowSourceField;
  delete runtime.container.dataset.areaTerrainAreaGlobalShadowStatusSource;
  delete runtime.container.dataset.areaTerrainAreaGlobalLightIntensitySource;
  delete runtime.container.dataset.areaTerrainAreaGlobalFogRangeSource;
}

function resolveTerrainTileModelRuntimeStatus(
  renderStatus: TerrainRenderStatus,
  tileModelSummary: TerrainTileModelRuntimeSummary
): AreaTerrainTileModelRuntimeSnapshot["status"] {
  if (renderStatus.tileCount === 0 || tileModelSummary.modelContractTileCount === 0) {
    return "blocked";
  }
  if (tileModelSummary.modelLoadedTileCount === renderStatus.tileCount) {
    if (tileModelSummary.modelMaterialTextureContractTileCount > 0) {
      if (
        tileModelSummary.modelMaterialTextureAppliedTileCount ===
        tileModelSummary.modelMaterialTextureContractTileCount
      ) {
        return "ready";
      }
      if (
        tileModelSummary.modelMaterialTextureAppliedTileCount > 0 ||
        tileModelSummary.modelMaterialTextureFailedTileCount > 0
      ) {
        return "partial";
      }
      return tileModelSummary.modelMaterialTexturePendingTileCount > 0
        ? "loading"
        : "blocked";
    }
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
    visibleMeshCount: tileModelSummary.modelVisibleMeshCount,
    materialCount: tileModelSummary.modelMaterialCount,
    materialMapCount: tileModelSummary.modelMaterialMapCount,
    shadowReceiverMeshCount: tileModelSummary.modelShadowReceiverMeshCount,
    shadowReceiverStatus: TERRAIN_TILE_SHADOW_RECEIVER_STATUS,
    shadowReceiverSource: TERRAIN_TILE_SHADOW_RECEIVER_SOURCE,
    shadowReceiverSample: tileModelSummary.modelShadowReceiverSample,
    ceilingMeshMatchedCount: tileModelSummary.modelCeilingMeshMatchedCount,
    ceilingMeshHiddenCount: tileModelSummary.modelCeilingMeshHiddenCount,
    visibleMeshSample: tileModelSummary.modelVisibleMeshSample,
    hiddenMeshSample: tileModelSummary.modelHiddenMeshSample,
    tileTransformSample: tileModelSummary.modelTileTransformSample,
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
  runtime.container.dataset.areaTerrainTileModelVisibleMeshCount = String(
    tileModelSummary.modelVisibleMeshCount
  );
  runtime.container.dataset.areaTerrainTileModelMaterialCount = String(
    tileModelSummary.modelMaterialCount
  );
  runtime.container.dataset.areaTerrainTileModelMaterialMapCount = String(
    tileModelSummary.modelMaterialMapCount
  );
  runtime.container.dataset.areaTerrainTileShadowReceiverMeshCount = String(
    tileModelSummary.modelShadowReceiverMeshCount
  );
  runtime.container.dataset.areaTerrainTileShadowReceiverStatus =
    TERRAIN_TILE_SHADOW_RECEIVER_STATUS;
  runtime.container.dataset.areaTerrainTileShadowReceiverSource =
    TERRAIN_TILE_SHADOW_RECEIVER_SOURCE;
  runtime.container.dataset.areaTerrainTileShadowReceiverSample =
    tileModelSummary.modelShadowReceiverSample;
  runtime.container.dataset.areaTerrainTileCeilingMeshMatchedCount = String(
    tileModelSummary.modelCeilingMeshMatchedCount
  );
  runtime.container.dataset.areaTerrainTileCeilingMeshHiddenCount = String(
    tileModelSummary.modelCeilingMeshHiddenCount
  );
  runtime.container.dataset.areaTerrainTileModelVisibleMeshSample =
    tileModelSummary.modelVisibleMeshSample;
  runtime.container.dataset.areaTerrainTileModelHiddenMeshSample =
    tileModelSummary.modelHiddenMeshSample;
  runtime.container.dataset.areaTerrainTileTransformSample =
    tileModelSummary.modelTileTransformSample;
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
  runtime.container.dataset.areaTerrainTileLightCandidateCount = String(
    runtime.scene.userData.auroraTerrainTileLightCandidateCount ?? 0
  );
  runtime.container.dataset.areaTerrainTileLightAcceptedCount = String(
    runtime.scene.userData.auroraTerrainTileLightAcceptedCount ?? 0
  );
  runtime.container.dataset.areaTerrainTileLightDroppedCount = String(
    runtime.scene.userData.auroraTerrainTileLightDroppedCount ?? 0
  );
  runtime.container.dataset.areaTerrainTileLightBudgetCap = String(
    runtime.scene.userData.auroraTerrainTileLightBudgetCap ?? TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP
  );
  runtime.container.dataset.areaTerrainTileLightBudgetSource = String(
    runtime.scene.userData.auroraTerrainTileLightBudgetSource ??
      TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE
  );
  runtime.container.dataset.areaTerrainTileLightTileCount = String(
    runtime.scene.userData.auroraTerrainTileLightTileCount ?? 0
  );
  runtime.container.dataset.areaTerrainTileLightChannels = String(
    runtime.scene.userData.auroraTerrainTileLightChannels ?? ""
  );
  runtime.container.dataset.areaTerrainTileLightColorSample = String(
    runtime.scene.userData.auroraTerrainTileLightColorSample ?? ""
  );
  runtime.container.dataset.areaTerrainTileLightSourceKeySample = String(
    runtime.scene.userData.auroraTerrainTileLightSourceKeySample ?? ""
  );
  runtime.container.dataset.areaTerrainTileLightPreviewColorSample = String(
    runtime.scene.userData.auroraTerrainTileLightPreviewColorSample ?? ""
  );
  runtime.container.dataset.areaTerrainTileLightStatus = String(
    runtime.scene.userData.auroraTerrainTileLightStatus ?? "missing"
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightingStatus = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus ?? "missing"
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightingFieldCount = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightingFieldCount ?? 0
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightingPhase = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightingPhase ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightingPhaseSource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightingPhaseSource ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightingFields = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightingFields ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalFogStatus = String(
    runtime.scene.userData.auroraTerrainAreaGlobalFogStatus ?? "missing"
  );
  runtime.container.dataset.areaTerrainAreaGlobalFogClipDistance = String(
    runtime.scene.userData.auroraTerrainAreaGlobalFogClipDistance ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalFogAmount = String(
    runtime.scene.userData.auroraTerrainAreaGlobalFogAmount ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowOpacity = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowOpacitySource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacitySource ??
      TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_SOURCE
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowOpacityFactor = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowOpacityFactorSource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource ??
      TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_FACTOR_SOURCE
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowStatus = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowStatus ?? "missing"
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowSourceField = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowSourceField ?? ""
  );
  runtime.container.dataset.areaTerrainAreaGlobalShadowStatusSource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalShadowStatusSource ??
      TERRAIN_AREA_GLOBAL_SHADOW_STATUS_SOURCE
  );
  runtime.container.dataset.areaTerrainAreaGlobalLightIntensitySource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalLightIntensitySource ??
      TERRAIN_AREA_GLOBAL_LIGHT_INTENSITY_SOURCE
  );
  runtime.container.dataset.areaTerrainAreaGlobalFogRangeSource = String(
    runtime.scene.userData.auroraTerrainAreaGlobalFogRangeSource ??
      TERRAIN_AREA_GLOBAL_FOG_RANGE_SOURCE
  );
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
    modelVisibleMeshCount: 0,
    modelMaterialCount: 0,
    modelMaterialMapCount: 0,
    modelShadowReceiverMeshCount: 0,
    modelShadowReceiverSample: "none",
    modelCeilingMeshMatchedCount: 0,
    modelCeilingMeshHiddenCount: 0,
    modelVisibleMeshSample: "none",
    modelHiddenMeshSample: "none",
    modelTileTransformSample: "none",
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
  textureFailedTileIds: Set<string> = new Set(),
  modelLayer: THREE.Object3D | null = null
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
  const layerSummary = summarizeTerrainTileModelLayer(modelLayer);
  return {
    modelContractTileCount: contractTiles.length,
    modelPendingTileCount: Math.max(0, contractTiles.length - loadedCount - failedCount),
    modelLoadedTileCount: loadedCount,
    modelFailedTileCount: failedCount,
    modelBlockedTileCount: blockedTiles.length,
    modelVisibleMeshCount: layerSummary.visibleMeshCount,
    modelMaterialCount: layerSummary.materialCount,
    modelMaterialMapCount: layerSummary.materialMapCount,
    modelShadowReceiverMeshCount: layerSummary.shadowReceiverMeshCount,
    modelShadowReceiverSample: layerSummary.shadowReceiverSample,
    modelCeilingMeshMatchedCount: layerSummary.ceilingMeshMatchedCount,
    modelCeilingMeshHiddenCount: layerSummary.ceilingMeshHiddenCount,
    modelVisibleMeshSample: layerSummary.visibleMeshSample,
    modelHiddenMeshSample: layerSummary.hiddenMeshSample,
    modelTileTransformSample: buildTerrainTileTransformSample(sceneData),
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

function clearTerrainImageMapLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(TILE_IMAGE_MAP_LAYER_NAME);
  if (!existing) {
    return;
  }
  existing.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.geometry.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
  runtime.scene.remove(existing);
}

function clearTerrainAreaGlobalLightingLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(AREA_GLOBAL_LIGHTING_LAYER_NAME);
  if (existing) {
    runtime.scene.remove(existing);
  }
  if (runtime.scene.userData.auroraTerrainAreaGlobalFogStatus === "active") {
    runtime.scene.fog = null;
  }
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus;
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightingFieldCount;
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightingPhase;
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightingPhaseSource;
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightingFields;
  delete runtime.scene.userData.auroraTerrainAreaGlobalFogStatus;
  delete runtime.scene.userData.auroraTerrainAreaGlobalFogClipDistance;
  delete runtime.scene.userData.auroraTerrainAreaGlobalFogAmount;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacitySource;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowStatus;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowSourceField;
  delete runtime.scene.userData.auroraTerrainAreaGlobalShadowStatusSource;
  delete runtime.scene.userData.auroraTerrainAreaGlobalLightIntensitySource;
  delete runtime.scene.userData.auroraTerrainAreaGlobalFogRangeSource;
}

function clearTerrainTileLightLayer(runtime: TerrainRuntime): void {
  const existing = runtime.scene.getObjectByName(TILE_LIGHT_LAYER_NAME);
  delete runtime.scene.userData.auroraTerrainTileLightSourceCount;
  delete runtime.scene.userData.auroraTerrainTileLightCandidateCount;
  delete runtime.scene.userData.auroraTerrainTileLightAcceptedCount;
  delete runtime.scene.userData.auroraTerrainTileLightDroppedCount;
  delete runtime.scene.userData.auroraTerrainTileLightBudgetCap;
  delete runtime.scene.userData.auroraTerrainTileLightBudgetSource;
  delete runtime.scene.userData.auroraTerrainTileLightTileCount;
  delete runtime.scene.userData.auroraTerrainTileLightChannels;
  delete runtime.scene.userData.auroraTerrainTileLightColorSample;
  delete runtime.scene.userData.auroraTerrainTileLightSourceKeySample;
  delete runtime.scene.userData.auroraTerrainTileLightPreviewColorSample;
  delete runtime.scene.userData.auroraTerrainTileLightStatus;
  if (!existing) {
    return;
  }
  existing.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    }
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
  applyAuroraAreaRenderFrameMirror(layer, width);
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
  model: THREE.Object3D,
  areaWidth: number,
  areaHeight: number,
  debugState: TerrainDebugState
): void {
  const renderYawQuarterTurns = resolveAuroraAreaRenderTileOrientation(
    tile.orientation,
    tile.tilesetOrientation
  );
  model.name = `terrain-backend-tile-model-${tile.id}`;
  if (TERRAIN_IMAGE_MAP_SOURCE_BACKED_REPLACES_TILE_MODELS) {
    model.visible = false;
    model.userData.auroraTerrainTileModelVisibility = "hidden_by_imagemap2d_source";
  }
  model.position.set(
    resolveAuroraAreaRenderTileCenterX(tile.col, areaWidth),
    TILE_GEOMETRY_Y + (tile.height ?? 0),
    resolveAuroraAreaRenderTileCenterZ(tile.row, areaHeight)
  );
  model.rotation.y = renderYawQuarterTurns * (Math.PI / 2);
  model.scale.multiplyScalar(TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE);
  model.userData.auroraTerrainTileModelRendererPath = TILE_MODEL_LOADER_PATH;
  model.userData.auroraTerrainTileModelStatus = "loaded";
  model.userData.auroraTerrainTileId = tile.id;
  model.userData.auroraTerrainTileModelResRef = tile.modelResRef ?? "";
  model.userData.auroraTerrainTileRenderYawQuarterTurns = renderYawQuarterTurns;
  model.userData.auroraTerrainTileSetOrientation = tile.tilesetOrientation ?? 0;
  model.userData.auroraTerrainTilePathNode = tile.pathNode ?? "";
  model.userData.auroraTerrainTileVisibilityNode = tile.visibilityNode ?? "";
  model.userData.auroraTerrainTileVisibilityOrientation =
    tile.visibilityOrientation ?? 0;
  model.userData.auroraTerrainTileDoorVisibilityNode = tile.doorVisibilityNode ?? "";
  model.userData.auroraTerrainTileDoorVisibilityOrientation =
    tile.doorVisibilityOrientation ?? 0;
  model.userData.auroraTerrainTileModelDeliveryUrl = contract.deliveryUrl;
  model.userData.auroraTerrainTileModelRuntimeCacheKey =
    resolveTerrainTileModelAssetRequestIdentity(tile, contract).runtimeCacheKey;
  model.userData.auroraTerrainTileModelObjectKey = contract.objectKey ?? "";
  model.userData.auroraTerrainTileMaterialTextureCount = contract.textureUrlsByReference.size;
  const overdrawVisibility = applyTerrainTileModelOverdrawVisibility(model);
  const voidMaskVisibility = applyTerrainTileVoidMaskVisibility(model);
  const groundSurfaceDepth = applyTerrainTileGroundSurfaceDepth(model);
  const ceilingVisibility = applyTerrainTileCeilingVisibility(
    model,
    debugState.ceilingMeshes
  );
  const imageMapGroundSurfaceVisibility =
    applyTerrainTileImageMapGroundSurfaceVisibility(model);
  const shadowReceiver = applyTerrainTileShadowReceiverFlags(model);
  model.userData.auroraTerrainImageMap2DModelBaseHiddenCount =
    0;
  model.userData.auroraTerrainTileModelOverdrawHiddenCount =
    overdrawVisibility.hiddenCount;
  model.userData.auroraTerrainVoidMaskHiddenCount = voidMaskVisibility.hiddenCount;
  model.userData.auroraTerrainGroundSurfaceDepthWriteDisabledCount =
    groundSurfaceDepth.disabledCount;
  model.userData.auroraTerrainImageMap2DGroundSurfaceHiddenCount =
    imageMapGroundSurfaceVisibility.hiddenCount;
  model.userData.auroraTerrainTileShadowReceiverMeshCount =
    shadowReceiver.receiverMeshCount;
  model.userData.auroraTerrainTileShadowReceiverStatus =
    TERRAIN_TILE_SHADOW_RECEIVER_STATUS;
  model.userData.auroraTerrainTileShadowReceiverSource =
    TERRAIN_TILE_SHADOW_RECEIVER_SOURCE;
  model.userData.auroraTerrainTileShadowReceiverSample =
    shadowReceiver.receiverSample;
  model.userData.auroraTerrainCeilingMeshVisibility =
    debugState.ceilingMeshes ? "visible" : "hidden";
  model.userData.auroraTerrainCeilingMeshMatchedCount = ceilingVisibility.matchedCount;
  model.userData.auroraTerrainCeilingMeshHiddenCount = ceilingVisibility.hiddenCount;
  layer.userData.auroraTerrainCeilingMeshesVisible = debugState.ceilingMeshes;
  layer.userData.auroraTerrainCeilingMeshMatchedCount =
    Number(layer.userData.auroraTerrainCeilingMeshMatchedCount ?? 0) +
    ceilingVisibility.matchedCount;
  layer.userData.auroraTerrainCeilingMeshHiddenCount =
    Number(layer.userData.auroraTerrainCeilingMeshHiddenCount ?? 0) +
    ceilingVisibility.hiddenCount;
  layer.userData.auroraTerrainVoidMaskHiddenCount =
    Number(layer.userData.auroraTerrainVoidMaskHiddenCount ?? 0) +
    voidMaskVisibility.hiddenCount;
  layer.userData.auroraTerrainGroundSurfaceDepthWriteDisabledCount =
    Number(layer.userData.auroraTerrainGroundSurfaceDepthWriteDisabledCount ?? 0) +
    groundSurfaceDepth.disabledCount;
  layer.userData.auroraTerrainTileShadowReceiverMeshCount =
    Number(layer.userData.auroraTerrainTileShadowReceiverMeshCount ?? 0) +
    shadowReceiver.receiverMeshCount;
  layer.userData.auroraTerrainTileShadowReceiverStatus =
    TERRAIN_TILE_SHADOW_RECEIVER_STATUS;
  layer.userData.auroraTerrainTileShadowReceiverSource =
    TERRAIN_TILE_SHADOW_RECEIVER_SOURCE;
  layer.add(model);
  syncTerrainTileSourceLightNodePositionsFromLoadedModel(layer.parent, tile, model);
}

function applyTerrainTileShadowReceiverFlags(
  model: THREE.Object3D
): { receiverMeshCount: number; receiverSample: string } {
  let receiverMeshCount = 0;
  const samples: string[] = [];
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.receiveShadow = true;
    node.userData = {
      ...node.userData,
      auroraTerrainTileShadowReceiver: true,
      auroraTerrainTileShadowReceiverStatus: TERRAIN_TILE_SHADOW_RECEIVER_STATUS,
      auroraTerrainTileShadowReceiverSource: TERRAIN_TILE_SHADOW_RECEIVER_SOURCE
    };
    receiverMeshCount += 1;
    if (samples.length < TILE_MODEL_VISIBLE_MESH_SAMPLE_LIMIT) {
      samples.push(formatTerrainTileShadowReceiverSample(node));
    }
  });
  return {
    receiverMeshCount,
    receiverSample: samples.join("|") || "none"
  };
}

function syncTerrainTileSourceLightNodePositionsFromLoadedModel(
  sceneRoot: THREE.Object3D | null,
  tile: SceneTile,
  model: THREE.Object3D
): number {
  if (!sceneRoot) {
    return 0;
  }
  const lightLayer = sceneRoot.getObjectByName(TILE_LIGHT_LAYER_NAME);
  if (!lightLayer) {
    return 0;
  }

  let syncedCount = 0;
  (["sourceLight1", "sourceLight2"] as const).forEach((channel) => {
    if (tile[channel] === undefined) {
      return;
    }
    const sourceNodeName = resolveTerrainTileSourceLightNodeName(channel);
    const sourceNode = findTerrainTileSourceLightNode(model, sourceNodeName);
    const lightGroup = findTerrainTileLightGroup(lightLayer, tile.id, channel);
    if (!sourceNode || !lightGroup) {
      return;
    }

    model.updateWorldMatrix(true, true);
    sourceNode.updateWorldMatrix(true, false);
    const worldPosition = new THREE.Vector3();
    sourceNode.getWorldPosition(worldPosition);
    const localPosition = worldPosition.clone();
    lightGroup.parent?.worldToLocal(localPosition);
    lightGroup.position.copy(localPosition);

    const proofUserData = {
      auroraTerrainTileLightPositionSource: TERRAIN_TILE_LIGHT_SOURCE_NODE_POSITION_SOURCE,
      auroraTerrainTileLightPositionProofStatus:
        TERRAIN_TILE_LIGHT_SOURCE_NODE_POSITION_PROOF_STATUS,
      auroraTerrainTileLightSourceNodeName: sourceNode.name,
      auroraTerrainTileLightSourceNodeKind: sourceNodeName,
      auroraTerrainTileLightSourceNodeWorldPosition: [
        worldPosition.x,
        worldPosition.y,
        worldPosition.z
      ],
      auroraTerrainTileLightSourceNodeLocalPosition: [
        localPosition.x,
        localPosition.y,
        localPosition.z
      ]
    };
    lightGroup.userData = {
      ...lightGroup.userData,
      ...proofUserData
    };
    lightGroup.traverse((node) => {
      if (node === lightGroup) {
        return;
      }
      if (
        node instanceof THREE.PointLight ||
        node.userData?.auroraTerrainTileLightMarker === true
      ) {
        node.userData = {
          ...node.userData,
          ...proofUserData
        };
      }
    });
    syncedCount += 1;
  });

  if (syncedCount > 0) {
    const previousCount = Number(
      lightLayer.userData.auroraTerrainTileLightSourceNodePositionCount ?? 0
    );
    const nextCount = previousCount + syncedCount;
    lightLayer.userData.auroraTerrainTileLightSourceNodePositionCount = nextCount;
    sceneRoot.userData.auroraTerrainTileLightSourceNodePositionCount = nextCount;
    sceneRoot.userData.auroraTerrainTileLightSourceNodePositionProofStatus =
      TERRAIN_TILE_LIGHT_SOURCE_NODE_POSITION_PROOF_STATUS;
  }
  return syncedCount;
}

export function syncTerrainTileSourceLightNodePositionsFromLoadedModelForTests(
  sceneRoot: THREE.Object3D,
  tile: SceneTile,
  model: THREE.Object3D
): number {
  return syncTerrainTileSourceLightNodePositionsFromLoadedModel(sceneRoot, tile, model);
}

function resolveTerrainTileSourceLightNodeName(
  channel: "sourceLight1" | "sourceLight2"
): "sourcelight1" | "sourcelight2" {
  return channel === "sourceLight1" ? "sourcelight1" : "sourcelight2";
}

function findTerrainTileSourceLightNode(
  model: THREE.Object3D,
  sourceNodeName: "sourcelight1" | "sourcelight2"
): THREE.Object3D | null {
  let match: THREE.Object3D | null = null;
  model.traverse((node) => {
    if (match) {
      return;
    }
    const normalized = normalizeTerrainTileSourceLightNodeName(node.name);
    if (normalized === sourceNodeName) {
      match = node;
    }
  });
  return match;
}

function findTerrainTileLightGroup(
  lightLayer: THREE.Object3D,
  tileId: string,
  channel: "sourceLight1" | "sourceLight2"
): THREE.Object3D | null {
  let match: THREE.Object3D | null = null;
  lightLayer.traverse((node) => {
    if (match) {
      return;
    }
    if (
      node.userData?.auroraTerrainTileId === tileId &&
      node.userData?.auroraTerrainTileLightChannel === channel &&
      node.userData?.auroraTerrainTileLightPreviewStatus === "active"
    ) {
      match = node;
    }
  });
  return match;
}

function normalizeTerrainTileSourceLightNodeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9_]/gu, "");
}

function applyTerrainTileModelOverdrawVisibility(
  model: THREE.Object3D
): { hiddenCount: number } {
  let hiddenCount = 0;
  model.userData.auroraTerrainTileModelVisibility = "source_model_geometry_overdraw_masked";
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isLikelyTerrainModelOverdrawMesh(node)) {
      return;
    }
    node.visible = false;
    hiddenCount += 1;
    node.userData = {
      ...node.userData,
      auroraTerrainTileModelOverdrawVisibility: "hidden_source_model_overdraw"
    };
  });
  return { hiddenCount };
}

export function applyTerrainTileModelOverdrawVisibilityForTests(
  model: THREE.Object3D
): { hiddenCount: number } {
  return applyTerrainTileModelOverdrawVisibility(model);
}

function applyTerrainTileImageMapGroundSurfaceVisibility(
  model: THREE.Object3D
): { hiddenCount: number } {
  if (
    !TERRAIN_IMAGE_MAP_SOURCE_BACKED_OVERLAY ||
    !TERRAIN_IMAGE_MAP_SOURCE_BACKED_HIDES_GLB_GROUND_SURFACES
  ) {
    return { hiddenCount: 0 };
  }
  let hiddenCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isLikelyTerrainGroundSurfaceMesh(node)) {
      return;
    }
    node.visible = false;
    hiddenCount += 1;
    node.userData = {
      ...node.userData,
      auroraTerrainImageMap2DGroundSurfaceVisibility: "hidden_imagemap2d_base"
    };
  });
  return { hiddenCount };
}

function isLikelyTerrainModelOverdrawMesh(mesh: THREE.Mesh): boolean {
  const source = readTerrainMeshAuroraSourceMetadata(mesh);
  if (hasTerrainImageMapOverdrawToken(mesh.name)) {
    return true;
  }
  if (hasTerrainImageMapOverdrawToken(source.sourceMesh)) {
    return true;
  }
  if (hasTerrainImageMapOverdrawToken(source.textureReference)) {
    return true;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => hasTerrainImageMapOverdrawToken(material?.name));
}

function normalizeTerrainImageMapReference(value: string | undefined): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/\.(dds|tga|bmp|png|jpg|jpeg|tpc)$/iu, "")
      .replace(/[^a-z0-9_-]+/gu, "_")
      .slice(0, 64) ?? ""
  );
}

function resolveTerrainTileImageMapReference(tile: SceneTile): string {
  const explicit = normalizeTerrainImageMapReference(tile.imageMap2D);
  if (explicit) {
    return explicit;
  }
  const modelResRef = normalizeTerrainImageMapReference(tile.modelResRef);
  return modelResRef ? `mi_${modelResRef}`.slice(0, 64) : "";
}

function resolveTerrainTileImageMapTextureUrl(
  tile: SceneTile,
  contract: TerrainTileModelContract
): { reference: string; deliveryUrl: string } | null {
  const reference = resolveTerrainTileImageMapReference(tile);
  if (!reference) {
    return null;
  }
  const deliveryUrl =
    contract.textureUrlsByReference.get(reference) ??
    contract.textureUrlsByReference.get(reference.replace(/^mi_/u, ""));
  return deliveryUrl ? { reference, deliveryUrl } : null;
}

function isBlankTerrainTileImageMapSource(tile: SceneTile): boolean {
  const modelResRef = tile.modelResRef?.trim().toLowerCase() ?? "";
  return tile.tileId === 0 || BLANK_TERRAIN_IMAGE_MAP_MODEL_RESREFS.has(modelResRef);
}

function shouldRenderTerrainTileImageMap(
  tile: SceneTile,
  sourceBackedModelBridge: boolean
): boolean {
  if (sourceBackedModelBridge && !TERRAIN_IMAGE_MAP_SOURCE_BACKED_OVERLAY) {
    return false;
  }
  if (!sourceBackedModelBridge) {
    return true;
  }
  return !isBlankTerrainTileImageMapSource(tile);
}

export function shouldRenderTerrainTileImageMapForTests(
  tile: Pick<SceneTile, "tileId" | "modelResRef">,
  sourceBackedModelBridge: boolean
): boolean {
  return shouldRenderTerrainTileImageMap(tile as SceneTile, sourceBackedModelBridge);
}

export function isTerrainImageMapSourceBackedOverlayEnabledForTests(): boolean {
  return TERRAIN_IMAGE_MAP_SOURCE_BACKED_OVERLAY;
}

function resolveTerrainImageMapVoidAlpha(red: number, green: number, blue: number): number {
  const maxChannel = Math.max(red, green, blue);
  if (maxChannel <= TERRAIN_IMAGE_MAP_VOID_ALPHA_MAX_RGB) {
    return 0;
  }
  if (maxChannel >= TERRAIN_IMAGE_MAP_VOID_ALPHA_FEATHER_MAX_RGB) {
    return 255;
  }
  return Math.round(
    ((maxChannel - TERRAIN_IMAGE_MAP_VOID_ALPHA_MAX_RGB) /
      (TERRAIN_IMAGE_MAP_VOID_ALPHA_FEATHER_MAX_RGB -
        TERRAIN_IMAGE_MAP_VOID_ALPHA_MAX_RGB)) *
      255
  );
}

export function resolveTerrainImageMapVoidAlphaForTests(
  red: number,
  green: number,
  blue: number
): number {
  return resolveTerrainImageMapVoidAlpha(red, green, blue);
}

function cloneTextureSettings(source: THREE.Texture, target: THREE.Texture): void {
  target.name = source.name ? `${source.name}-terrain-void-alpha` : "terrain-void-alpha";
  target.colorSpace = source.colorSpace;
  target.flipY = source.flipY;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.magFilter = source.magFilter;
  target.minFilter = source.minFilter;
  target.anisotropy = source.anisotropy;
  target.center.copy(source.center);
  target.offset.copy(source.offset);
  target.repeat.copy(source.repeat);
  target.rotation = source.rotation;
  target.userData = {
    ...source.userData,
    auroraTerrainImageMapVoidAlpha: true
  };
  target.needsUpdate = true;
}

function isTerrainImageMapByteTextureData(
  value: unknown
): value is Uint8Array | Uint8ClampedArray {
  return value instanceof Uint8Array || value instanceof Uint8ClampedArray;
}

function createTerrainImageMapDataTextureWithTransparentVoid(
  source: THREE.Texture,
  rawImage: { data?: unknown; width?: unknown; height?: unknown },
  width: number,
  height: number
): THREE.Texture | null {
  if (!isTerrainImageMapByteTextureData(rawImage.data)) {
    return null;
  }
  const expectedByteLength = width * height * 4;
  if (rawImage.data.byteLength < expectedByteLength) {
    return null;
  }
  const sourceData =
    rawImage.data instanceof Uint8Array
      ? rawImage.data
      : new Uint8Array(
          rawImage.data.buffer,
          rawImage.data.byteOffset,
          rawImage.data.byteLength
        );
  const transparentData = new Uint8Array(expectedByteLength);
  transparentData.set(sourceData.subarray(0, expectedByteLength));
  for (let index = 0; index < transparentData.length; index += 4) {
    const alpha = resolveTerrainImageMapVoidAlpha(
      transparentData[index],
      transparentData[index + 1],
      transparentData[index + 2]
    );
    transparentData[index + 3] = Math.min(transparentData[index + 3], alpha);
  }
  const transparentTexture = new THREE.DataTexture(
    transparentData,
    width,
    height,
    THREE.RGBAFormat
  );
  cloneTextureSettings(source, transparentTexture);
  transparentTexture.userData = {
    ...transparentTexture.userData,
    auroraTerrainImageMapVoidAlphaSource: "data-texture"
  };
  return transparentTexture;
}

function createTerrainImageMapTextureWithTransparentVoid(
  source: THREE.Texture
): THREE.Texture {
  const cached = terrainImageMapTransparentVoidTextureCache.get(source);
  if (cached) {
    return cached;
  }
  const rawImage = source.image as
    | ({ width?: unknown; height?: unknown } & CanvasImageSource)
    | undefined;
  const width = typeof rawImage?.width === "number" ? rawImage.width : 0;
  const height = typeof rawImage?.height === "number" ? rawImage.height : 0;
  if (!rawImage || width <= 0 || height <= 0) {
    return source;
  }
  const dataTexture = createTerrainImageMapDataTextureWithTransparentVoid(
    source,
    rawImage,
    width,
    height
  );
  if (dataTexture) {
    terrainImageMapTransparentVoidTextureCache.set(source, dataTexture);
    return dataTexture;
  }
  if (typeof document === "undefined") {
    return source;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return source;
  }
  try {
    context.drawImage(rawImage, 0, 0, width, height);
    const imageData = context.getImageData(0, 0, width, height);
    for (let index = 0; index < imageData.data.length; index += 4) {
      const alpha = resolveTerrainImageMapVoidAlpha(
        imageData.data[index],
        imageData.data[index + 1],
        imageData.data[index + 2]
      );
      imageData.data[index + 3] = Math.min(imageData.data[index + 3], alpha);
    }
    context.putImageData(imageData, 0, 0);
  } catch {
    return source;
  }
  const transparentTexture = new THREE.CanvasTexture(canvas);
  cloneTextureSettings(source, transparentTexture);
  terrainImageMapTransparentVoidTextureCache.set(source, transparentTexture);
  return transparentTexture;
}

export function createTerrainImageMapTextureWithTransparentVoidForTests(
  source: THREE.Texture
): THREE.Texture {
  return createTerrainImageMapTextureWithTransparentVoid(source);
}

function createTerrainImageMapTileMesh(
  tile: SceneTile,
  texture: THREE.Texture,
  areaWidth: number,
  areaHeight: number,
  sourceBackedModelBridge: boolean
): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const transparentVoidOverlay =
    sourceBackedModelBridge && TERRAIN_IMAGE_MAP_TRANSPARENT_VOID_OVERLAY;
  const imageMapTexture = transparentVoidOverlay
    ? createTerrainImageMapTextureWithTransparentVoid(texture)
    : texture;
  const material = new THREE.MeshBasicMaterial({
    map: imageMapTexture,
    transparent: transparentVoidOverlay,
    alphaTest: transparentVoidOverlay ? 0.04 : 0.02,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: !sourceBackedModelBridge,
    polygonOffset: sourceBackedModelBridge,
    polygonOffsetFactor: sourceBackedModelBridge ? -1 : 0,
    polygonOffsetUnits: sourceBackedModelBridge ? -1 : 0
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `terrain-imagemap2d-tile-${tile.id}`;
  mesh.position.set(
    resolveAuroraAreaRenderTileCenterX(tile.col, areaWidth),
    TILE_GEOMETRY_Y + (sourceBackedModelBridge ? 0.006 : -0.008) + (tile.height ?? 0),
    resolveAuroraAreaRenderTileCenterZ(tile.row, areaHeight)
  );
  mesh.rotation.y =
    resolveAuroraAreaRenderTileImageMapOrientation(tile.orientation) * (Math.PI / 2);
  mesh.renderOrder = sourceBackedModelBridge ? 2 : -20;
  mesh.raycast = () => undefined;
  mesh.userData.auroraTerrainImageMap2D = true;
  mesh.userData.auroraTerrainImageMap2DMode = sourceBackedModelBridge
    ? "source-backed-floor-overlay"
    : "fallback-base";
  mesh.userData.auroraTerrainTileId = tile.id;
  mesh.userData.auroraTerrainTileImageMap2D = resolveTerrainTileImageMapReference(tile);
  mesh.userData.auroraTerrainTileModelResRef = tile.modelResRef ?? "";
  mesh.userData.auroraTerrainTileOrientation = tile.orientation;
  mesh.userData.auroraTerrainTileSetOrientation = tile.tilesetOrientation ?? 0;
  mesh.userData.auroraTerrainTileImageMapRenderYawQuarterTurns =
    resolveAuroraAreaRenderTileImageMapOrientation(tile.orientation);
  return mesh;
}

function updateTerrainImageMapDataset(
  runtime: TerrainRuntime,
  layer: THREE.Group,
  contractCount: number,
  loadedCount: number,
  failedCount: number
): void {
  layer.userData.auroraTerrainImageMap2DContractCount = contractCount;
  layer.userData.auroraTerrainImageMap2DLoadedCount = loadedCount;
  layer.userData.auroraTerrainImageMap2DFailedCount = failedCount;
  const status = resolveTerrainImageMapStatus(contractCount, loadedCount, failedCount);
  layer.userData.auroraTerrainImageMap2DStatus = status;
  if (!runtime.container) {
    return;
  }
  runtime.container.dataset.areaTerrainImageMap2DStatus = status;
  runtime.container.dataset.areaTerrainImageMap2DContractCount = String(contractCount);
  runtime.container.dataset.areaTerrainImageMap2DLoadedCount = String(loadedCount);
  runtime.container.dataset.areaTerrainImageMap2DFailedCount = String(failedCount);
  runtime.container.dataset.areaTerrainImageMap2DSample =
    layer.children
      .slice(0, TILE_ASSET_CONTRACT_SAMPLE_LIMIT)
      .map((child) => String(child.userData.auroraTerrainTileImageMap2D ?? child.name))
      .join("|") || "none";
}

function resolveTerrainImageMapStatus(
  contractCount: number,
  loadedCount: number,
  failedCount: number
): "missing" | "loading" | "ready" | "partial" | "failed" {
  if (contractCount === 0) {
    return "missing";
  }
  if (loadedCount >= contractCount) {
    return "ready";
  }
  if (loadedCount + failedCount >= contractCount) {
    return loadedCount > 0 ? "partial" : "failed";
  }
  return "loading";
}

export function resolveTerrainImageMapStatusForTests(
  contractCount: number,
  loadedCount: number,
  failedCount: number
): "missing" | "loading" | "ready" | "partial" | "failed" {
  return resolveTerrainImageMapStatus(contractCount, loadedCount, failedCount);
}

function rebuildTerrainImageMapLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  contractsByModelResRef: Map<string, TerrainTileModelContract>,
  renderStatus: TerrainRenderStatus
): void {
  const sourceBackedModelBridge = renderStatus.code === "source_backed_tile_model_bridge";
  const layer = new THREE.Group();
  layer.name = TILE_IMAGE_MAP_LAYER_NAME;
  applyAuroraAreaRenderFrameMirror(layer, sceneData.width);
  runtime.scene.add(layer);
  if (sourceBackedModelBridge && !TERRAIN_IMAGE_MAP_SOURCE_BACKED_OVERLAY) {
    layer.userData.auroraTerrainImageMap2DStatus = "disabled_source_backed_glb_first";
    layer.userData.auroraTerrainImageMap2DContractCount = 0;
    layer.userData.auroraTerrainImageMap2DLoadedCount = 0;
    layer.userData.auroraTerrainImageMap2DFailedCount = 0;
    if (runtime.container) {
      runtime.container.dataset.areaTerrainImageMap2DStatus =
        "disabled_source_backed_glb_first";
      runtime.container.dataset.areaTerrainImageMap2DContractCount = "0";
      runtime.container.dataset.areaTerrainImageMap2DLoadedCount = "0";
      runtime.container.dataset.areaTerrainImageMap2DFailedCount = "0";
      runtime.container.dataset.areaTerrainImageMap2DSample = "none";
    }
    return;
  }

  const entries = sceneData.tiles
    .map((tile) => {
      if (!shouldRenderTerrainTileImageMap(tile, sourceBackedModelBridge)) {
        return null;
      }
      const contract = resolveTileModelContract(tile, contractsByModelResRef);
      if (!contract) {
        return null;
      }
      const textureUrl = resolveTerrainTileImageMapTextureUrl(tile, contract);
      return textureUrl ? { tile, textureUrl } : null;
    })
    .filter((entry): entry is { tile: SceneTile; textureUrl: { reference: string; deliveryUrl: string } } =>
      Boolean(entry)
    );

  let loadedCount = 0;
  let failedCount = 0;
  updateTerrainImageMapDataset(runtime, layer, entries.length, loadedCount, failedCount);

  entries.forEach(({ tile, textureUrl }) => {
    void ensureTerrainTileTexture(runtime, textureUrl.deliveryUrl).then((texture) => {
      if (layer.parent !== runtime.scene) {
        return;
      }
      if (!texture) {
        failedCount += 1;
        updateTerrainImageMapDataset(runtime, layer, entries.length, loadedCount, failedCount);
        return;
      }
      layer.add(
        createTerrainImageMapTileMesh(
          tile,
          texture,
          sceneData.width,
          sceneData.height,
          sourceBackedModelBridge
        )
      );
      loadedCount += 1;
      updateTerrainImageMapDataset(runtime, layer, entries.length, loadedCount, failedCount);
    }).catch(() => {
      if (layer.parent !== runtime.scene) {
        return;
      }
      failedCount += 1;
      updateTerrainImageMapDataset(runtime, layer, entries.length, loadedCount, failedCount);
    });
  });
}

function rebuildTerrainAreaGlobalLightingLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  debugState: TerrainDebugState
): void {
  const preview = resolveAreaGlobalLightingPreview(sceneData.lighting);
  const useAreaLighting = debugState.useAreaLighting !== false;
  const displayFog = debugState.displayFog !== false;
  const fieldSample =
    sceneData.lighting?.fields
      .slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT)
      .map((field) => `${field.field}:${field.value}`)
      .join("|") ?? "";
  runtime.scene.userData.auroraTerrainAreaGlobalLightingFieldCount =
    sceneData.lighting?.fields.length ?? 0;
  runtime.scene.userData.auroraTerrainAreaGlobalLightingFields = fieldSample;
  runtime.scene.userData.auroraTerrainAreaGlobalLightingPhase = preview?.phase ?? "";
  runtime.scene.userData.auroraTerrainAreaGlobalLightingPhaseSource =
    "ARE.IsNight branch; DayNightCycle bake behavior not fully mapped";
  runtime.scene.userData.auroraTerrainAreaGlobalLightingStatus = preview
    ? !useAreaLighting
      ? "available_disabled"
      : debugState.wireframe
      ? "available_wireframe_suppressed"
      : "active"
    : "missing";
  runtime.scene.userData.auroraTerrainAreaGlobalFogStatus = "missing";
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacity =
    preview?.shadowOpacity ?? null;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacitySource =
    TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_SOURCE;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactor =
    preview?.shadowOpacityFactor ?? null;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource =
    TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_FACTOR_SOURCE;
  runtime.scene.userData.auroraTerrainAreaGlobalShadowStatus = preview
    ? preview.shadowEnabled
      ? "enabled"
      : "disabled"
    : "missing";
  runtime.scene.userData.auroraTerrainAreaGlobalShadowSourceField =
    preview?.shadowSourceField ?? "";
  runtime.scene.userData.auroraTerrainAreaGlobalShadowStatusSource =
    TERRAIN_AREA_GLOBAL_SHADOW_STATUS_SOURCE;
  runtime.scene.userData.auroraTerrainAreaGlobalLightIntensitySource =
    TERRAIN_AREA_GLOBAL_LIGHT_INTENSITY_SOURCE;
  runtime.scene.userData.auroraTerrainAreaGlobalFogRangeSource =
    TERRAIN_AREA_GLOBAL_FOG_RANGE_SOURCE;
  if (!preview || !useAreaLighting || debugState.wireframe) {
    return;
  }

  const layer = new THREE.Group();
  layer.name = AREA_GLOBAL_LIGHTING_LAYER_NAME;
  layer.userData.auroraTerrainAreaGlobalLightingLayer =
    "are-root-ambient-diffuse-fog-preview";
  layer.userData.auroraTerrainAreaGlobalLightingPhase = preview.phase;
  layer.userData.auroraTerrainAreaGlobalLightingPhaseSource =
    "ARE.IsNight branch; DayNightCycle bake behavior not fully mapped";
  layer.userData.auroraTerrainAreaGlobalLightingFieldCount =
    sceneData.lighting?.fields.length ?? 0;
  layer.userData.auroraTerrainAreaGlobalLightingFields = fieldSample;
  layer.userData.auroraTerrainAreaGlobalShadowOpacity =
    preview.shadowOpacity ?? null;
  layer.userData.auroraTerrainAreaGlobalShadowOpacitySource =
    TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_SOURCE;
  layer.userData.auroraTerrainAreaGlobalShadowOpacityFactor =
    preview.shadowOpacityFactor ?? null;
  layer.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource =
    TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_FACTOR_SOURCE;
  layer.userData.auroraTerrainAreaGlobalShadowStatus = preview.shadowEnabled
    ? "enabled"
    : "disabled";
  layer.userData.auroraTerrainAreaGlobalShadowSourceField = preview.shadowSourceField;
  layer.userData.auroraTerrainAreaGlobalShadowStatusSource =
    TERRAIN_AREA_GLOBAL_SHADOW_STATUS_SOURCE;

  if (preview.ambientColor) {
    const intensity = 1;
    const ambient = new THREE.AmbientLight(preview.ambientColor, intensity);
    ambient.name = "terrain-area-global-ambient-light";
    ambient.userData.auroraTerrainAreaGlobalLightRole = "ambient";
    ambient.userData.auroraTerrainAreaGlobalLightingPhase = preview.phase;
    ambient.userData.auroraTerrainAreaGlobalLightColor =
      colorToUserDataTriplet(preview.ambientColor);
    ambient.userData.auroraTerrainAreaGlobalLightIntensity = intensity;
    ambient.userData.auroraTerrainAreaGlobalLightIntensitySource =
      TERRAIN_AREA_GLOBAL_LIGHT_INTENSITY_SOURCE;
    layer.add(ambient);
  }

  if (preview.diffuseColor) {
    const intensity = 1;
    const directional = new THREE.DirectionalLight(preview.diffuseColor, intensity);
    directional.name = "terrain-area-global-diffuse-light";
    directional.position.set(
      preview.phase === "moon" ? -0.35 : 0.45,
      preview.phase === "moon" ? 0.72 : 1,
      preview.phase === "moon" ? -0.5 : 0.35
    );
    directional.castShadow = preview.shadowEnabled;
    directional.userData.auroraTerrainAreaGlobalLightRole = "diffuse";
    directional.userData.auroraTerrainAreaGlobalLightingPhase = preview.phase;
    directional.userData.auroraTerrainAreaGlobalLightColor =
      colorToUserDataTriplet(preview.diffuseColor);
    directional.userData.auroraTerrainAreaGlobalLightIntensity = intensity;
    directional.userData.auroraTerrainAreaGlobalLightIntensitySource =
      TERRAIN_AREA_GLOBAL_LIGHT_INTENSITY_SOURCE;
    directional.userData.auroraTerrainAreaGlobalShadowOpacity =
      preview.shadowOpacity ?? null;
    directional.userData.auroraTerrainAreaGlobalShadowOpacitySource =
      TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_SOURCE;
    directional.userData.auroraTerrainAreaGlobalShadowOpacityFactor =
      preview.shadowOpacityFactor ?? null;
    directional.userData.auroraTerrainAreaGlobalShadowOpacityFactorSource =
      TERRAIN_AREA_GLOBAL_SHADOW_OPACITY_FACTOR_SOURCE;
    directional.userData.auroraTerrainAreaGlobalShadowStatus = preview.shadowEnabled
      ? "enabled"
      : "disabled";
    directional.userData.auroraTerrainAreaGlobalShadowSourceField =
      preview.shadowSourceField;
    directional.userData.auroraTerrainAreaGlobalShadowStatusSource =
      TERRAIN_AREA_GLOBAL_SHADOW_STATUS_SOURCE;
    directional.userData.auroraTerrainAreaGlobalShadowImplementationStatus =
      preview.shadowEnabled
        ? "three-directional-castShadow-flag-only-shadow-volume-not-ported"
        : "disabled-by-decompiled-ARE-shadow-branch";
    layer.add(directional);
  }

  if (preview.fogColor && displayFog) {
    const defaultClipDistance =
      Math.max(sceneData.width, sceneData.height, 1) / TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE;
    const rawClipDistance = preview.fogClipDistance ?? defaultClipDistance;
    const far = Math.max(1, rawClipDistance * TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE);
    const rawFogAmount =
      typeof preview.fogAmount === "number" && Number.isFinite(preview.fogAmount)
        ? preview.fogAmount
        : 0;
    const auroraFogStart = 25 - (rawFogAmount * 25) / 15;
    const near = Math.min(
      far,
      Math.max(0.1, auroraFogStart * TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE)
    );
    runtime.scene.fog = new THREE.Fog(preview.fogColor, near, far);
    runtime.scene.userData.auroraTerrainAreaGlobalFogStatus = "active";
    runtime.scene.userData.auroraTerrainAreaGlobalFogColor =
      colorToUserDataTriplet(preview.fogColor);
    runtime.scene.userData.auroraTerrainAreaGlobalFogClipDistance =
      preview.fogClipDistance ?? null;
    runtime.scene.userData.auroraTerrainAreaGlobalFogAmount =
      preview.fogAmount ?? null;
    layer.userData.auroraTerrainAreaGlobalFogStatus = "active";
    layer.userData.auroraTerrainAreaGlobalFogColor =
      colorToUserDataTriplet(preview.fogColor);
    layer.userData.auroraTerrainAreaGlobalFogNear = near;
    layer.userData.auroraTerrainAreaGlobalFogFar = far;
    layer.userData.auroraTerrainAreaGlobalFogRangeSource =
      TERRAIN_AREA_GLOBAL_FOG_RANGE_SOURCE;
    layer.userData.auroraTerrainAreaGlobalFogClipDistance =
      preview.fogClipDistance ?? null;
    layer.userData.auroraTerrainAreaGlobalFogAmount = preview.fogAmount ?? null;
  } else if (preview.fogColor) {
    runtime.scene.userData.auroraTerrainAreaGlobalFogStatus = "available_disabled";
    runtime.scene.userData.auroraTerrainAreaGlobalFogColor =
      colorToUserDataTriplet(preview.fogColor);
    runtime.scene.userData.auroraTerrainAreaGlobalFogClipDistance =
      preview.fogClipDistance ?? null;
    runtime.scene.userData.auroraTerrainAreaGlobalFogAmount =
      preview.fogAmount ?? null;
    layer.userData.auroraTerrainAreaGlobalFogStatus = "available_disabled";
  }

  runtime.scene.add(layer);
}

function resolveAreaGlobalLightingPreview(
  lighting: SceneAreaGlobalLighting | undefined
): AreaGlobalLightingPreview | null {
  if (!lighting || lighting.fields.length === 0) {
    return null;
  }
  const fieldsByName = new Map<SceneAreaGlobalLightingFieldName, number>();
  lighting.fields.forEach((field) => {
    if (Number.isFinite(field.value)) {
      fieldsByName.set(field.field, field.value);
    }
  });
  if (fieldsByName.size === 0) {
    return null;
  }
  const phase: AreaGlobalLightingPhase =
    (fieldsByName.get("IsNight") ?? 0) > 0 ? "moon" : "sun";
  const shadowSourceField = phase === "moon" ? "MoonShadows" : "SunShadows";
  const shadowEnabled = (fieldsByName.get(shadowSourceField) ?? 0) > 0;
  const shadowOpacity = fieldsByName.get("ShadowOpacity");
  return {
    phase,
    fieldsByName,
    ambientColor:
      decodeAreaPackedColor(
        fieldsByName.get(phase === "moon" ? "MoonAmbientColor" : "SunAmbientColor")
      ) ??
      decodeAreaPackedColor(fieldsByName.get("SunAmbientColor")) ??
      decodeAreaPackedColor(fieldsByName.get("MoonAmbientColor")),
    diffuseColor:
      decodeAreaPackedColor(
        fieldsByName.get(phase === "moon" ? "MoonDiffuseColor" : "SunDiffuseColor")
      ) ??
      decodeAreaPackedColor(fieldsByName.get("SunDiffuseColor")) ??
      decodeAreaPackedColor(fieldsByName.get("MoonDiffuseColor")),
    fogColor:
      decodeAreaPackedColor(
        fieldsByName.get(phase === "moon" ? "MoonFogColor" : "SunFogColor")
      ) ??
      decodeAreaPackedColor(fieldsByName.get("SunFogColor")) ??
      decodeAreaPackedColor(fieldsByName.get("MoonFogColor")),
    fogClipDistance: fieldsByName.get("FogClipDist"),
    fogAmount: fieldsByName.get(phase === "moon" ? "MoonFogAmount" : "SunFogAmount"),
    shadowOpacity,
    shadowOpacityFactor:
      typeof shadowOpacity === "number" && Number.isFinite(shadowOpacity)
        ? shadowOpacity / 100
        : undefined,
    shadowEnabled,
    shadowSourceField
  };
}

function decodeAreaPackedColor(value: number | undefined): THREE.Color | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  const packed = Math.trunc(value) >>> 0;
  return new THREE.Color(
    (packed & 0xff) / 255,
    ((packed >> 8) & 0xff) / 255,
    ((packed >> 16) & 0xff) / 255
  );
}

function colorToUserDataTriplet(color: THREE.Color): [number, number, number] {
  return [color.r, color.g, color.b];
}

function resolveTerrainTileLightActiveSlotCap(runtime: TerrainRuntime): {
  cap: number;
  configuredMaxLights?: number;
} {
  const configured = runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights;
  if (typeof configured !== "number" || !Number.isFinite(configured)) {
    return { cap: TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP };
  }
  const configuredMaxLights = Math.max(0, Math.trunc(configured));
  return {
    cap: Math.min(configuredMaxLights, TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP),
    configuredMaxLights
  };
}

function rebuildTerrainTileLightLayer(
  runtime: TerrainRuntime,
  sceneData: AreaScene,
  debugState: TerrainDebugState
): void {
  const entries = sceneData.tiles.flatMap((tile) => resolveTerrainTileLightEntries(tile));
  const useAreaLighting = debugState.useAreaLighting !== false;
  const staticMainEntries = entries.filter((entry) => entry.role === "main");
  const activeSourceEntries = entries.filter((entry) => entry.role === "source");
  const tileLightCap = resolveTerrainTileLightActiveSlotCap(runtime);
  const budgetedSourceEntries = buildTerrainTileSourceLightBudgetEntries(
    activeSourceEntries,
    sceneData,
    tileLightCap.cap
  );
  const acceptedSourceBudgetEntries = budgetedSourceEntries.filter(
    (entry) => entry.accepted
  );
  runtime.scene.userData.auroraTerrainTileLightSourceCount = entries.length;
  runtime.scene.userData.auroraTerrainTileLightStaticMainCount =
    staticMainEntries.length;
  runtime.scene.userData.auroraTerrainTileLightDynamicSourceCount =
    activeSourceEntries.length;
  runtime.scene.userData.auroraTerrainTileLightCandidateCount =
    activeSourceEntries.length;
  runtime.scene.userData.auroraTerrainTileLightAcceptedCount =
    acceptedSourceBudgetEntries.length;
  runtime.scene.userData.auroraTerrainTileLightDroppedCount = Math.max(
    0,
    budgetedSourceEntries.filter((entry) => !entry.accepted).length
  );
  runtime.scene.userData.auroraTerrainTileLightBudgetCap = tileLightCap.cap;
  runtime.scene.userData.auroraTerrainTileLightBudgetHardCap =
    TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP;
  runtime.scene.userData.auroraTerrainTileLightConfiguredMaxLights =
    tileLightCap.configuredMaxLights;
  runtime.scene.userData.auroraTerrainTileLightBudgetSource =
    TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE;
  runtime.scene.userData.auroraTerrainTileLightTileCount = new Set(
    entries.map((entry) => entry.tile.id)
  ).size;
  runtime.scene.userData.auroraTerrainTileLightChannels = entries
    .slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT)
    .map((entry) => `${entry.tile.id}:${entry.channel}:${entry.rowId}`)
    .join("|");
  runtime.scene.userData.auroraTerrainTileLightColorSample = entries
    .slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT)
    .map(formatTerrainTileLightColorSample)
    .join("|");
  runtime.scene.userData.auroraTerrainTileLightSourceKeySample = entries
    .slice(0, TILE_SCENE_PACKAGE_SAMPLE_LIMIT)
    .map((entry) => `${entry.tile.id}:${entry.channel}:${entry.sourceKey ?? ""}`)
    .join("|");
  runtime.scene.userData.auroraTerrainTileLightStatus =
    entries.length === 0
      ? "missing"
      : !useAreaLighting
      ? "available_disabled"
      : debugState.wireframe
      ? "available_wireframe_suppressed"
      : "active";
  if (entries.length === 0 || !useAreaLighting || debugState.wireframe) {
    return;
  }

  const falloffShaderPatch = installAuroraLinearLightFalloffShaderChunk();
  runtime.scene.userData.auroraTerrainTileLightFalloffRendererPatchStatus =
    falloffShaderPatch.status;
  runtime.scene.userData.auroraTerrainTileLightFalloffRendererProofStatus =
    falloffShaderPatch.proofStatus;
  runtime.scene.userData.auroraTerrainTileLightFalloffRendererSource =
    falloffShaderPatch.source;

  const layer = new THREE.Group();
  layer.name = TILE_LIGHT_LAYER_NAME;
  layer.userData.auroraTerrainTileLightLayer =
    "tile-main-static-source-dynamic-light-preview";
  layer.userData.auroraTerrainTileLightSourceCount = entries.length;
  layer.userData.auroraTerrainTileLightStaticMainCount =
    staticMainEntries.length;
  layer.userData.auroraTerrainTileLightDynamicSourceCount =
    activeSourceEntries.length;
  layer.userData.auroraTerrainTileLightCandidateCount =
    activeSourceEntries.length;
  layer.userData.auroraTerrainTileLightAcceptedCount =
    acceptedSourceBudgetEntries.length;
  layer.userData.auroraTerrainTileLightDroppedCount = Math.max(
    0,
    budgetedSourceEntries.filter((entry) => !entry.accepted).length
  );
  layer.userData.auroraTerrainTileLightBudgetCap = tileLightCap.cap;
  layer.userData.auroraTerrainTileLightBudgetHardCap =
    TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP;
  layer.userData.auroraTerrainTileLightConfiguredMaxLights =
    tileLightCap.configuredMaxLights;
  layer.userData.auroraTerrainTileLightBudgetSource =
    TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE;
  layer.userData.auroraTerrainTileLightTileCount = new Set(
    entries.map((entry) => entry.tile.id)
  ).size;
  layer.userData.auroraTerrainTileLightChannels = runtime.scene.userData
    .auroraTerrainTileLightChannels;
  layer.userData.auroraTerrainTileLightColorSample = runtime.scene.userData
    .auroraTerrainTileLightColorSample;
  layer.userData.auroraTerrainTileLightSourceKeySample = runtime.scene.userData
    .auroraTerrainTileLightSourceKeySample;
  runtime.scene.add(layer);

  const previewColorSamples: string[] = [];
  const renderedEntries: {
    entry: TerrainTileLightEntry;
    budgetEntry?: TerrainTileLightBudgetEntry;
  }[] = [
    ...staticMainEntries.map((entry) => ({ entry })),
    ...acceptedSourceBudgetEntries.map((budgetEntry) => ({
      entry: budgetEntry.entry,
      budgetEntry
    }))
  ];
  renderedEntries.forEach(({ entry, budgetEntry }, index) => {
    const energy = resolveTerrainTileLightColorEnergy(entry.color);
    const color = new THREE.Color(
      clampUnit(entry.color[0] / energy),
      clampUnit(entry.color[1] / energy),
      clampUnit(entry.color[2] / energy)
    );
    if (previewColorSamples.length < TILE_SCENE_PACKAGE_SAMPLE_LIMIT) {
      previewColorSamples.push(formatTerrainTileLightPreviewColorSample(entry, color));
    }
    const group = new THREE.Group();
    group.name = `terrain-tile-light-${entry.tile.id}-${entry.channel}`;
    group.position.set(
      resolveAuroraAreaRenderTileCenterX(entry.tile.col, sceneData.width),
      TILE_GEOMETRY_Y + (entry.tile.height ?? 0) + (entry.role === "source" ? 0.28 : 0.16),
      resolveAuroraAreaRenderTileCenterZ(entry.tile.row, sceneData.height)
    );
    const sourceIntensity =
      energy * TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_FALLBACK;
    const intensity = entry.role === "source" ? sourceIntensity : energy * 0.42;
    const distanceDescriptor = resolveTerrainTileLightDistance(entry);
    const activeBudgetRank = budgetEntry?.rank;
    const budgetScoreUserData = budgetEntry
      ? buildAuroraLightManagerPreviewScoreUserData(
          "auroraTerrainTileLight",
          budgetEntry.retailScore
        )
      : {};
    const radiusProofUserData = {
      auroraTerrainTileLightDistance: distanceDescriptor.distance,
      auroraTerrainTileLightDecay: distanceDescriptor.decay,
      auroraTerrainTileLightDistanceSource: distanceDescriptor.source,
      auroraTerrainTileLightRadiusProofStatus: distanceDescriptor.proofStatus,
      auroraTerrainTileLightFalloffFormula: distanceDescriptor.falloffFormula,
      auroraTerrainTileLightFalloffProofStatus:
        entry.role === "source"
          ? TERRAIN_TILE_SOURCE_LIGHT_FALLOFF_PROOF_STATUS
          : TERRAIN_TILE_MAIN_LIGHT_RADIUS_PROOF_STATUS,
      auroraTerrainTileLightFalloffRendererPatchStatus:
        entry.role === "source" ? falloffShaderPatch.status : undefined,
      auroraTerrainTileLightFalloffRendererProofStatus:
        entry.role === "source" ? falloffShaderPatch.proofStatus : undefined,
      auroraTerrainTileLightFalloffRendererSource:
        entry.role === "source" ? falloffShaderPatch.source : undefined,
      auroraTerrainTileLightSourceModelFileName:
        distanceDescriptor.sourceModelFileName,
      auroraTerrainTileLightSourceModelHash: distanceDescriptor.sourceModelHash,
      auroraTerrainTileLightSourceNodeName: distanceDescriptor.sourceNodeName,
      auroraTerrainTileLightSourceNodeOffset: distanceDescriptor.sourceNodeOffset,
      auroraTerrainTileLightSourceRadius: distanceDescriptor.sourceRadius,
      auroraTerrainTileLightSourceRadiusUnits: distanceDescriptor.sourceRadiusUnits,
      auroraTerrainTileLightSourceUnitScale: distanceDescriptor.sourceUnitScale,
      auroraTerrainTileLightSourceUnitScaleSource:
        distanceDescriptor.sourceUnitScaleSource,
      auroraTerrainTileLightSourceRadiusWorldDistance:
        distanceDescriptor.sourceRadiusWorldDistance,
      auroraTerrainTileLightSourceRadiusWorldDistanceSource:
        distanceDescriptor.sourceRadiusWorldDistanceSource,
      auroraTerrainTileLightSourceShadowRadius:
        distanceDescriptor.sourceShadowRadius,
      auroraTerrainTileLightSourceVerticalDisplacement:
        distanceDescriptor.sourceVerticalDisplacement,
      auroraTerrainTileLightSourcePriority: distanceDescriptor.sourcePriority
    };
    const rendererMode =
      entry.role === "source"
        ? "point-light-preview"
        : TERRAIN_TILE_MAIN_LIGHT_RENDERER_MODE;
    if (entry.role === "source") {
      const pointLight = new THREE.PointLight(
        color,
        intensity,
        distanceDescriptor.distance,
        distanceDescriptor.decay
      );
      pointLight.userData = {
        auroraTerrainTileLightRole: entry.role,
        auroraTerrainTileLightChannel: entry.channel,
        auroraTerrainTileLightRow: entry.rowId,
        auroraTerrainTileLightSourceKey: entry.sourceKey ?? "",
        auroraTerrainTileLightColor: entry.color,
        auroraTerrainTileLightColorSource: entry.sourceKey
          ? "ARE Tile light index resolved through source 2DA color"
          : "ARE Tile light index with missing color source metadata",
        auroraTerrainTileLightPreviewColor: [color.r, color.g, color.b],
        auroraTerrainTileLightIntensity: intensity,
        auroraTerrainTileLightIntensitySource: TERRAIN_TILE_SOURCE_LIGHT_INTENSITY_SOURCE,
        auroraTerrainTileLightIntensityProofStatus:
          TERRAIN_TILE_SOURCE_LIGHT_INTENSITY_PROOF_STATUS,
        auroraTerrainTileLightSourceMultiplier:
          TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_FALLBACK,
        auroraTerrainTileLightSourceMultiplierSource:
          TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_SOURCE,
        ...radiusProofUserData,
        auroraTerrainTileLightPositionSource: TERRAIN_TILE_LIGHT_POSITION_SOURCE,
        auroraTerrainTileLightRendererMode: rendererMode,
        auroraTerrainTileId: entry.tile.id,
        auroraTerrainTilePosition: `${entry.tile.col},${entry.tile.row}`,
        auroraTerrainTileLightBudgetRank: activeBudgetRank,
        auroraTerrainTileLightBudgetAccepted: true,
        auroraTerrainTileLightBudgetCap: tileLightCap.cap,
        auroraTerrainTileLightBudgetHardCap: TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP,
        auroraTerrainTileLightConfiguredMaxLights: tileLightCap.configuredMaxLights,
        auroraTerrainTileLightBudgetSource: TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE,
        ...budgetScoreUserData
      };
      group.add(pointLight);
    }

    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(entry.role === "source" ? 0.055 : 0.04, 14, 8),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: entry.role === "source" ? 0.78 : 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    marker.renderOrder = 6 + index;
    marker.userData = {
      auroraTerrainTileLightRole: entry.role,
      auroraTerrainTileLightChannel: entry.channel,
      auroraTerrainTileLightMarker: true,
      auroraTerrainTileId: entry.tile.id
    };
    group.add(marker);

    group.userData = {
      auroraTerrainTileLightPreviewStatus: "active",
      auroraTerrainTileLightRole: entry.role,
      auroraTerrainTileLightChannel: entry.channel,
      auroraTerrainTileLightBudgetRank: budgetEntry?.rank ?? index + 1,
      auroraTerrainTileLightBudgetAccepted: entry.role !== "source" || budgetEntry?.accepted === true,
      auroraTerrainTileLightStaticMain: entry.role === "main",
      auroraTerrainTileLightBudgetCap: tileLightCap.cap,
      auroraTerrainTileLightBudgetHardCap: TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP,
      auroraTerrainTileLightConfiguredMaxLights: tileLightCap.configuredMaxLights,
      auroraTerrainTileLightBudgetSource: TERRAIN_TILE_LIGHT_ACTIVE_SLOT_CAP_SOURCE,
      auroraTerrainTileLightRow: entry.rowId,
      auroraTerrainTileLightColor: entry.color,
      auroraTerrainTileLightColorSource: entry.sourceKey
        ? "ARE Tile light index resolved through source 2DA color"
        : "ARE Tile light index with missing color source metadata",
      auroraTerrainTileLightPreviewColor: [color.r, color.g, color.b],
      auroraTerrainTileLightIntensity: intensity,
      auroraTerrainTileLightIntensitySource:
        "2DA RGB max-channel mapped to Three.PointLight.intensity by aurora-web preview",
      ...radiusProofUserData,
      auroraTerrainTileLightSourceKey: entry.sourceKey ?? "",
      auroraTerrainTileId: entry.tile.id,
      auroraTerrainTilePosition: `${entry.tile.col},${entry.tile.row}`,
      auroraTerrainTileLightPositionSource:
        entry.role === "source"
          ? TERRAIN_TILE_LIGHT_POSITION_SOURCE
          : TERRAIN_TILE_MAIN_LIGHT_DISTANCE_SOURCE,
      ...budgetScoreUserData,
      auroraTerrainTileLightRendererMode: rendererMode
    };
    layer.add(group);
  });
  runtime.scene.userData.auroraTerrainTileLightPreviewColorSample =
    previewColorSamples.join("|");
  layer.userData.auroraTerrainTileLightPreviewColorSample =
    runtime.scene.userData.auroraTerrainTileLightPreviewColorSample;
}

function resolveTerrainTileLightEntries(tile: SceneTile): TerrainTileLightEntry[] {
  const entries: TerrainTileLightEntry[] = [];
  appendTerrainTileLightEntry(entries, tile, "mainLight1", "main", tile.mainLight1, tile.mainLight1Color);
  appendTerrainTileLightEntry(entries, tile, "mainLight2", "main", tile.mainLight2, tile.mainLight2Color);
  appendTerrainTileLightEntry(
    entries,
    tile,
    "sourceLight1",
    "source",
    tile.sourceLight1,
    tile.sourceLight1Color
  );
  appendTerrainTileLightEntry(
    entries,
    tile,
    "sourceLight2",
    "source",
    tile.sourceLight2,
    tile.sourceLight2Color
  );
  return entries;
}

function buildTerrainTileSourceLightBudgetEntries(
  entries: readonly TerrainTileLightEntry[],
  sceneData: AreaScene,
  activeSlotCap: number
): TerrainTileLightBudgetEntry[] {
  return selectAuroraLightManagerPreviewBudget(
    entries.map((entry, sourceIndex) => {
      const distanceDescriptor = resolveTerrainTileLightDistance(entry);
      const energy = resolveTerrainTileLightColorEnergy(entry.color);
      return {
        key: `${entry.tile.id}:${entry.channel}:${entry.rowId}`,
        sourceIndex,
        payload: entry,
        scoreInput: {
          position: {
            x: resolveAuroraAreaRenderTileCenterX(entry.tile.col, sceneData.width),
            y: TILE_GEOMETRY_Y + (entry.tile.height ?? 0) + 0.28,
            z: resolveAuroraAreaRenderTileCenterZ(entry.tile.row, sceneData.height)
          },
          sourceRadius:
            distanceDescriptor.sourceRadiusWorldDistance ??
            distanceDescriptor.distance,
          activeSelectionRadiusOverride:
            typeof distanceDescriptor.sourceShadowRadius === "number" &&
            typeof distanceDescriptor.sourceUnitScale === "number"
              ? distanceDescriptor.sourceShadowRadius *
                distanceDescriptor.sourceUnitScale
              : null,
          multiplier: energy * TERRAIN_TILE_SOURCE_LIGHT_MULTIPLIER_FALLBACK,
          priority: distanceDescriptor.sourcePriority ?? 0,
          enforceActiveSelectionRadius: false
        }
      };
    }),
    activeSlotCap
  ).map((entry) => ({
    entry: entry.payload,
    sourceIndex: entry.sourceIndex,
    retailScore: entry.retailScore,
    rank: entry.rank,
    accepted: entry.accepted
  }));
}

function resolveTerrainTileLightDistance(entry: TerrainTileLightEntry): {
  distance: number;
  decay: number;
  source: string;
  proofStatus: string;
  falloffFormula: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  sourceNodeName?: string;
  sourceNodeOffset?: number;
  sourceRadius?: number;
  sourceRadiusUnits?: string;
  sourceUnitScale?: number;
  sourceUnitScaleSource?: string;
  sourceRadiusWorldDistance?: number;
  sourceRadiusWorldDistanceSource?: string;
  sourceShadowRadius?: number;
  sourceVerticalDisplacement?: number;
  sourcePriority?: number;
} {
  if (entry.role === "source") {
    return {
      distance: TERRAIN_TILE_SOURCE_LIGHT_WORLD_RADIUS,
      decay: 1,
      source: TERRAIN_TILE_SOURCE_LIGHT_CARRIER_SOURCE,
      proofStatus: TERRAIN_TILE_SOURCE_LIGHT_RADIUS_PROOF_STATUS,
      falloffFormula: TERRAIN_TILE_SOURCE_LIGHT_FALLOFF_FORMULA,
      sourceModelFileName: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_MODEL_FILE_NAME,
      sourceModelHash: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_MODEL_HASH,
      sourceNodeName: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_NODE_NAME,
      sourceNodeOffset: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_NODE_OFFSET,
      sourceRadius: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_RADIUS,
      sourceRadiusUnits: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_RADIUS_UNITS,
      sourceUnitScale: TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE,
      sourceUnitScaleSource: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_UNIT_SCALE_SOURCE,
      sourceRadiusWorldDistance: TERRAIN_TILE_SOURCE_LIGHT_WORLD_RADIUS,
      sourceRadiusWorldDistanceSource:
        "fx_flame01.mdl source radius multiplied by TILE_MODEL_AURORA_UNITS_TO_TILE_SPACE",
      sourceShadowRadius: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_SHADOW_RADIUS,
      sourceVerticalDisplacement:
        TERRAIN_TILE_SOURCE_LIGHT_SOURCE_VERTICAL_DISPLACEMENT,
      sourcePriority: TERRAIN_TILE_SOURCE_LIGHT_SOURCE_PRIORITY
    };
  }
  return {
    distance: 0,
    decay: 0,
    source: TERRAIN_TILE_MAIN_LIGHT_DISTANCE_SOURCE,
    proofStatus: TERRAIN_TILE_MAIN_LIGHT_RADIUS_PROOF_STATUS,
    falloffFormula: TERRAIN_TILE_MAIN_LIGHT_FALLOFF_FORMULA
  };
}

function formatTerrainTileLightColorSample(entry: TerrainTileLightEntry): string {
  return [
    entry.tile.id,
    entry.channel,
    String(entry.rowId),
    formatTerrainTileLightNumber(entry.color[0]),
    formatTerrainTileLightNumber(entry.color[1]),
    formatTerrainTileLightNumber(entry.color[2])
  ].join(":");
}

function formatTerrainTileLightPreviewColorSample(
  entry: TerrainTileLightEntry,
  color: THREE.Color
): string {
  return [
    entry.tile.id,
    entry.channel,
    String(entry.rowId),
    formatTerrainTileLightNumber(color.r),
    formatTerrainTileLightNumber(color.g),
    formatTerrainTileLightNumber(color.b)
  ].join(":");
}

function formatTerrainTileLightNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/u, "") : "0";
}

function appendTerrainTileLightEntry(
  entries: TerrainTileLightEntry[],
  tile: SceneTile,
  channel: TerrainTileLightChannel,
  role: "main" | "source",
  rowId: number | undefined,
  color: SceneTile["mainLight1Color"]
): void {
  const resolvedRowId = color?.rowId ?? rowId;
  if (typeof resolvedRowId !== "number" || !Number.isFinite(resolvedRowId) || resolvedRowId <= 0) {
    return;
  }
  if (
    typeof color?.red !== "number" ||
    !Number.isFinite(color.red) ||
    typeof color.green !== "number" ||
    !Number.isFinite(color.green) ||
    typeof color.blue !== "number" ||
    !Number.isFinite(color.blue)
  ) {
    return;
  }
  const resolvedColor: [number, number, number] = [
    color.red,
    color.green,
    color.blue
  ];
  if (resolvedColor.every((channelValue) => Math.abs(channelValue) <= 1e-6)) {
    return;
  }
  entries.push({
    tile,
    channel,
    role,
    rowId: resolvedRowId,
    color: resolvedColor,
    sourceKey: color?.sourceKey
  });
}

function resolveTerrainTileLightColorEnergy(color: [number, number, number]): number {
  return Math.max(0.15, color[0], color[1], color[2], 1);
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

function applyTerrainTileVoidMaskVisibility(
  model: THREE.Object3D
): { hiddenCount: number } {
  const meshes: THREE.Mesh[] = [];
  const voidMasks: THREE.Mesh[] = [];
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    meshes.push(node);
    if (isLikelyTerrainVoidMaskMesh(node)) {
      voidMasks.push(node);
    }
  });
  const modelResRef = String(model.userData.auroraTerrainTileModelResRef ?? "")
    .trim()
    .toLowerCase();
  const shouldKeepOnlyTileGeometry =
    modelResRef.length > 0 && modelResRef !== "sic11_a00_00";
  if (
    voidMasks.length > 0 &&
    voidMasks.length === meshes.length &&
    shouldKeepOnlyTileGeometry
  ) {
    voidMasks.forEach((node) => {
      applyTerrainTileSourceCropMaskRenderContract(node);
      node.userData = {
        ...node.userData,
        auroraTerrainVoidMask: true,
        auroraTerrainVoidMaskVisibility: "kept_only_tile_geometry"
      };
    });
    return { hiddenCount: 0 };
  }
  if (
    voidMasks.length > 0 &&
    voidMasks.length < meshes.length &&
    shouldKeepOnlyTileGeometry
  ) {
    voidMasks.forEach((node) => {
      node.visible = true;
      applyTerrainTileSourceCropMaskRenderContract(node);
      node.userData = {
        ...node.userData,
        auroraTerrainVoidMask: true,
        auroraTerrainVoidMaskVisibility: "kept_source_crop_mask"
      };
    });
    return { hiddenCount: 0 };
  }
  let hiddenCount = 0;
  voidMasks.forEach((node) => {
    node.visible = false;
    node.userData = {
      ...node.userData,
      auroraTerrainVoidMask: true,
      auroraTerrainVoidMaskVisibility: "hidden"
    };
    hiddenCount += 1;
  });
  return { hiddenCount };
}

function applyTerrainTileSourceCropMaskRenderContract(node: THREE.Mesh): void {
  const materials = Array.isArray(node.material) ? node.material : [node.material];
  materials.forEach((material) => {
    if (!material) {
      return;
    }
    material.side = THREE.DoubleSide;
    material.depthTest = true;
    material.depthWrite = true;
    material.transparent = false;
    material.opacity = 1;
    material.blending = THREE.NormalBlending;
    material.userData = {
      ...material.userData,
      auroraTerrainVoidMaskRenderContract: "source_crop_mask"
    };
    material.needsUpdate = true;
  });
  node.userData = {
    ...node.userData,
    auroraTerrainVoidMaskRenderContract: "source_crop_mask"
  };
}

export function applyTerrainTileVoidMaskVisibilityForTests(
  model: THREE.Object3D
): { hiddenCount: number } {
  return applyTerrainTileVoidMaskVisibility(model);
}

function applyTerrainTileGroundSurfaceDepth(
  model: THREE.Object3D
): { disabledCount: number } {
  let disabledCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isLikelyTerrainGroundSurfaceMesh(node)) {
      return;
    }
    node.renderOrder = Math.min(node.renderOrder, 1);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!material) {
        return;
      }
      material.depthWrite = false;
      material.userData = {
        ...material.userData,
        auroraTerrainGroundSurfaceDepthWrite: "disabled"
      };
    });
    node.userData = {
      ...node.userData,
      auroraTerrainGroundSurfaceDepthWrite: "disabled"
    };
    disabledCount += 1;
  });
  return { disabledCount };
}

function applyTerrainTileCeilingVisibility(
  model: THREE.Object3D,
  visible: boolean
): { matchedCount: number; hiddenCount: number } {
  let matchedCount = 0;
  let hiddenCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isLikelyTerrainCeilingMesh(node)) {
      return;
    }
    matchedCount += 1;
    node.visible = visible;
    node.userData = {
      ...node.userData,
      auroraTerrainCeilingMeshCandidate: true,
      auroraTerrainCeilingMeshVisibility: visible ? "visible" : "hidden"
    };
    if (!visible) {
      hiddenCount += 1;
    }
  });
  return { matchedCount, hiddenCount };
}

function summarizeTerrainTileModelLayer(layer: THREE.Object3D | null): {
  visibleMeshCount: number;
  materialCount: number;
  materialMapCount: number;
  shadowReceiverMeshCount: number;
  shadowReceiverSample: string;
  ceilingMeshMatchedCount: number;
  ceilingMeshHiddenCount: number;
  visibleMeshSample: string;
  hiddenMeshSample: string;
} {
  if (!layer) {
    return {
      visibleMeshCount: 0,
      materialCount: 0,
      materialMapCount: 0,
      shadowReceiverMeshCount: 0,
      shadowReceiverSample: "none",
      ceilingMeshMatchedCount: 0,
      ceilingMeshHiddenCount: 0,
      visibleMeshSample: "none",
      hiddenMeshSample: "none"
    };
  }

  let visibleMeshCount = 0;
  let materialCount = 0;
  let materialMapCount = 0;
  let shadowReceiverMeshCount = 0;
  let ceilingMeshMatchedCount = 0;
  let ceilingMeshHiddenCount = 0;
  const visibleMeshSamples: string[] = [];
  const hiddenMeshSamples: string[] = [];
  const shadowReceiverSamples: string[] = [];

  layer.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (node.visible) {
      visibleMeshCount += 1;
      if (visibleMeshSamples.length < TILE_MODEL_VISIBLE_MESH_SAMPLE_LIMIT) {
        visibleMeshSamples.push(formatTerrainTileVisibleMeshSample(node));
      }
    }
    if (node.receiveShadow) {
      shadowReceiverMeshCount += 1;
      if (shadowReceiverSamples.length < TILE_MODEL_VISIBLE_MESH_SAMPLE_LIMIT) {
        shadowReceiverSamples.push(formatTerrainTileShadowReceiverSample(node));
      }
    }
    if (node.userData.auroraTerrainCeilingMeshCandidate === true) {
      ceilingMeshMatchedCount += 1;
      if (!node.visible) {
        ceilingMeshHiddenCount += 1;
        if (hiddenMeshSamples.length < TILE_MODEL_VISIBLE_MESH_SAMPLE_LIMIT) {
          hiddenMeshSamples.push(formatTerrainTileVisibleMeshSample(node));
        }
      }
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      materialCount += 1;
      if (materialSupportsRuntimeTextureMap(material)) {
        materialMapCount += 1;
      }
    });
  });

  return {
    visibleMeshCount,
    materialCount,
    materialMapCount,
    shadowReceiverMeshCount,
    shadowReceiverSample: shadowReceiverSamples.join("|") || "none",
    ceilingMeshMatchedCount,
    ceilingMeshHiddenCount,
    visibleMeshSample: visibleMeshSamples.join("|") || "none",
    hiddenMeshSample: hiddenMeshSamples.join("|") || "none"
  };
}

function formatTerrainTileVisibleMeshSample(mesh: THREE.Mesh): string {
  const tileRoot = findTerrainTileModelRoot(mesh);
  tileRoot?.updateWorldMatrix(true, true);
  mesh.updateWorldMatrix(true, false);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const materialNames = materials
    .map((material) => material?.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
    .join("+") || "material:unnamed";
  const source = readTerrainMeshAuroraSourceMetadata(mesh);
  const bounds = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const rootBounds = tileRoot ? new THREE.Box3().setFromObject(tileRoot) : null;
  const rootSize = new THREE.Vector3();
  const rootCenter = new THREE.Vector3();
  if (rootBounds && !rootBounds.isEmpty()) {
    rootBounds.getSize(rootSize);
    rootBounds.getCenter(rootCenter);
  }
  return [
    `tile=${String(tileRoot?.userData.auroraTerrainTileId ?? "missing")}`,
    `model=${String(tileRoot?.userData.auroraTerrainTileModelResRef ?? "missing")}`,
    `node=${mesh.name || "unnamed"}`,
    `source=${source.sourceMesh ?? "missing"}`,
    `parent=${source.sourceParentNode ?? "missing"}`,
    `material=${materialNames}`,
    `texture=${source.textureReference ?? "missing"}`,
    `bounds=${formatVector3(size)}`,
    `center=${formatVector3(center)}`,
    `rootScale=${formatVector3(tileRoot?.scale ?? new THREE.Vector3(0, 0, 0))}`,
    `rootBounds=${rootBounds && !rootBounds.isEmpty() ? formatVector3(rootSize) : "empty"}`,
    `rootCenter=${rootBounds && !rootBounds.isEmpty() ? formatVector3(rootCenter) : "empty"}`
  ].join(",");
}

function formatTerrainTileShadowReceiverSample(mesh: THREE.Mesh): string {
  const tileRoot = findTerrainTileModelRoot(mesh);
  const tileId = String(tileRoot?.userData.auroraTerrainTileId ?? "unknown");
  const meshName = mesh.name.trim() || "unnamed";
  return `${tileId}:${meshName}:receiveShadow=${mesh.receiveShadow ? "1" : "0"}`;
}

function findTerrainTileModelRoot(mesh: THREE.Object3D): THREE.Object3D | null {
  let current: THREE.Object3D | null = mesh;
  while (current) {
    if (typeof current.userData?.auroraTerrainTileId === "string") {
      return current;
    }
    current = current.parent;
  }
  return null;
}

function readTerrainMeshAuroraSourceMetadata(mesh: THREE.Mesh): {
  sourceMesh?: string;
  sourceParentNode?: string;
  textureReference?: string;
  rotateTexture?: boolean;
} {
  const metadata: {
    sourceMesh?: string;
    sourceParentNode?: string;
    textureReference?: string;
    rotateTexture?: boolean;
  } = {};
  const absorb = (value: unknown): void => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }
    const record = value as Record<string, unknown>;
    const aurora =
      record.aurora && typeof record.aurora === "object" && !Array.isArray(record.aurora)
        ? (record.aurora as Record<string, unknown>)
        : record;
    if (!metadata.sourceMesh && typeof aurora.sourceMesh === "string") {
      metadata.sourceMesh = aurora.sourceMesh;
    }
    if (!metadata.sourceParentNode && typeof aurora.sourceParentNode === "string") {
      metadata.sourceParentNode = aurora.sourceParentNode;
    }
    if (!metadata.textureReference && typeof aurora.textureReference === "string") {
      metadata.textureReference = aurora.textureReference;
    }
    const material =
      aurora.material && typeof aurora.material === "object" && !Array.isArray(aurora.material)
        ? (aurora.material as Record<string, unknown>)
        : null;
    if (metadata.rotateTexture !== true) {
      metadata.rotateTexture =
        aurora.rotateTexture === true || material?.rotateTexture === true;
    }
  };

  let current: THREE.Object3D | null = mesh;
  while (current) {
    absorb(current.userData);
    current = current.parent;
  }
  absorb(mesh.geometry.userData);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => absorb(material?.userData));
  return metadata;
}

function formatVector3(value: THREE.Vector3): string {
  return `${value.x.toFixed(2)}x${value.y.toFixed(2)}x${value.z.toFixed(2)}`;
}

function materialSupportsRuntimeTextureMap(
  material: THREE.Material | undefined
): material is THREE.Material & { map: THREE.Texture | null } {
  return Boolean(material && "map" in material && material.map);
}

function materialAcceptsRuntimeTextureMap(
  material: THREE.Material | undefined
): material is THREE.Material & { map: THREE.Texture | null } {
  return Boolean(material && "map" in material);
}

function isTerrainTileMaterialTextureBindingNotApplicable(model: THREE.Object3D): boolean {
  let meshCount = 0;
  let visibleMeshCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    meshCount += 1;
    if (node.visible) {
      visibleMeshCount += 1;
    }
  });
  return meshCount > 0 && visibleMeshCount === 0;
}

function normalizeTerrainTileMaterialTextureReference(value: string | undefined): string {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/\.(dds|tga|bmp|png|jpg|jpeg|tpc|plt)$/iu, "")
      .replace(/[^a-z0-9_-]+/gu, "_")
      .slice(0, 64) ?? ""
  );
}

function resolveTerrainTileMaterialTextureByReference(
  reference: string | undefined,
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  const normalized = normalizeTerrainTileMaterialTextureReference(reference);
  if (!normalized) {
    return undefined;
  }
  return (
    texturesByReference.get(normalized) ??
    texturesByReference.get(normalized.replace(/^mi_/u, "")) ??
    texturesByReference.get(`mi_${normalized}`.slice(0, 64))
  );
}

function readTerrainMaterialNameTextureReference(
  material: THREE.Material | undefined
): string | undefined {
  const name = material?.name?.trim();
  if (!name) {
    return undefined;
  }
  const auroraMaterial = name.match(/^Aurora material\s+(.+)$/iu);
  return auroraMaterial?.[1]?.trim() || name;
}

function applyTerrainTileTextureToMaterial(
  material: THREE.Material,
  texture: THREE.Texture,
  reference: string
): boolean {
  if (!materialAcceptsRuntimeTextureMap(material) || material.map) {
    return false;
  }
  material.map = texture;
  const colorMaterial = material as THREE.Material & { color?: THREE.Color };
  if (colorMaterial.color instanceof THREE.Color) {
    colorMaterial.color.set(0xffffff);
  }
  material.userData = {
    ...material.userData,
    auroraTerrainTileMaterialTextureReference: reference,
    auroraTerrainTileMaterialTextureBindingSource: "terrain-mesh-source-metadata"
  };
  material.needsUpdate = true;
  return true;
}

function applyTerrainTileMaterialTexturesFromMeshMetadata(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>
): { appliedMaterialCount: number } {
  let appliedMaterialCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const source = readTerrainMeshAuroraSourceMetadata(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (materialSupportsRuntimeTextureMap(material)) {
        return;
      }
      const reference =
        source.textureReference ?? readTerrainMaterialNameTextureReference(material);
      const texture = resolveTerrainTileMaterialTextureByReference(
        reference,
        texturesByReference
      );
      if (texture && applyTerrainTileTextureToMaterial(material, texture, reference ?? "")) {
        appliedMaterialCount += 1;
      }
    });
  });
  return { appliedMaterialCount };
}

export function applyTerrainTileMaterialTexturesFromMeshMetadataForTests(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>
): { appliedMaterialCount: number } {
  return applyTerrainTileMaterialTexturesFromMeshMetadata(model, texturesByReference);
}

function normalizeTerrainQuarterTurns(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return ((Math.trunc(numeric) % 4) + 4) % 4;
}

function cloneMaterialWithTerrainTextureRotation(
  material: THREE.Material,
  rotationRadians: number
): THREE.Material {
  if (!materialSupportsRuntimeTextureMap(material) || !material.map) {
    return material;
  }
  const clonedMaterial = material.clone() as THREE.Material & { map: THREE.Texture | null };
  const rotatedMap = material.map.clone();
  rotatedMap.center.set(0.5, 0.5);
  rotatedMap.rotation = material.map.rotation + rotationRadians;
  rotatedMap.needsUpdate = true;
  clonedMaterial.map = rotatedMap;
  clonedMaterial.needsUpdate = true;
  return clonedMaterial;
}

type TerrainTextureMaterial = THREE.Material & {
  map?: THREE.Texture | null;
  alphaMap?: THREE.Texture | null;
  alphaTest?: number;
  color?: THREE.Color;
};

function isTerrainTextureMaterial(material: THREE.Material): material is TerrainTextureMaterial {
  return "map" in material || "alphaMap" in material || "color" in material;
}

function applyTerrainTileTextureColorMaterialMode(
  model: THREE.Object3D
): { convertedMaterialCount: number; inspectedMaterialCount: number } {
  let convertedMaterialCount = 0;
  let inspectedMaterialCount = 0;
  const convertedMaterials = new WeakMap<THREE.Material, THREE.Material>();

  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const nextMaterials = materials.map((material) => {
      inspectedMaterialCount += 1;
      const nextMaterial = resolveTerrainTileTextureColorMaterial(material, convertedMaterials);
      if (nextMaterial !== material) {
        convertedMaterialCount += 1;
      }
      return nextMaterial;
    });
    node.material = Array.isArray(node.material) ? nextMaterials : nextMaterials[0];
  });

  model.userData.auroraTerrainTileMaterialLightingMode = TERRAIN_TILE_MATERIAL_LIGHTING_MODE;
  model.userData.auroraTerrainTileMaterialLightingModeSource =
    TERRAIN_TILE_MATERIAL_LIGHTING_MODE_SOURCE;
  model.userData.auroraTerrainTileMaterialLightingInspectedCount = inspectedMaterialCount;
  model.userData.auroraTerrainTileMaterialLightingConvertedCount = convertedMaterialCount;

  return { convertedMaterialCount, inspectedMaterialCount };
}

function resolveTerrainTileTextureColorMaterial(
  material: THREE.Material,
  convertedMaterials: WeakMap<THREE.Material, THREE.Material>
): THREE.Material {
  const existing = convertedMaterials.get(material);
  if (existing) {
    return existing;
  }
  if (material instanceof THREE.MeshBasicMaterial) {
    material.userData = {
      ...material.userData,
      auroraTerrainTileMaterialLightingMode: TERRAIN_TILE_MATERIAL_LIGHTING_MODE,
      auroraTerrainTileMaterialLightingModeSource: TERRAIN_TILE_MATERIAL_LIGHTING_MODE_SOURCE
    };
    return material;
  }
  const source = isTerrainTextureMaterial(material) ? material : null;
  const materialWithAlpha = material as THREE.Material & { alphaTest?: number };
  const basicMaterial = new THREE.MeshBasicMaterial({
    name: material.name,
    map: source?.map ?? null,
    alphaMap: source?.alphaMap ?? null,
    color:
      source?.color instanceof THREE.Color
        ? source.color.clone()
        : source?.map
          ? new THREE.Color(0xffffff)
          : new THREE.Color(0xffffff),
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest:
      typeof materialWithAlpha.alphaTest === "number" &&
      Number.isFinite(materialWithAlpha.alphaTest)
        ? materialWithAlpha.alphaTest
        : 0,
    side: material.side,
    depthTest: material.depthTest,
    depthWrite: material.depthWrite,
    blending: material.blending,
    polygonOffset: material.polygonOffset,
    polygonOffsetFactor: material.polygonOffsetFactor,
    polygonOffsetUnits: material.polygonOffsetUnits,
    toneMapped: material.toneMapped,
    visible: material.visible
  });
  basicMaterial.userData = {
    ...material.userData,
    auroraTerrainTileMaterialLightingMode: TERRAIN_TILE_MATERIAL_LIGHTING_MODE,
    auroraTerrainTileMaterialLightingModeSource: TERRAIN_TILE_MATERIAL_LIGHTING_MODE_SOURCE,
    auroraTerrainTileMaterialLightingConvertedFrom:
      material.type || material.constructor.name || "Material"
  };
  basicMaterial.needsUpdate = true;
  convertedMaterials.set(material, basicMaterial);
  return basicMaterial;
}

export function applyTerrainTileTextureColorMaterialModeForTests(
  model: THREE.Object3D
): { convertedMaterialCount: number; inspectedMaterialCount: number } {
  return applyTerrainTileTextureColorMaterialMode(model);
}

function applyTerrainTileRotatingTextureCompensation(
  model: THREE.Object3D
): { adjustedMaterialCount: number } {
  if (!TERRAIN_TILE_ROTATETEXTURE_COMPENSATION) {
    return { adjustedMaterialCount: 0 };
  }
  const quarterTurns = normalizeTerrainQuarterTurns(
    model.userData.auroraTerrainTileRenderYawQuarterTurns
  );
  if (quarterTurns === 0) {
    return { adjustedMaterialCount: 0 };
  }
  const rotationRadians = -quarterTurns * (Math.PI / 2);
  let adjustedMaterialCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const source = readTerrainMeshAuroraSourceMetadata(node);
    if (!shouldApplyTerrainTileRotatingTextureCompensation(source)) {
      return;
    }
    let didAdjustNodeMaterial = false;
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const rotatedMaterials = materials.map((material) => {
      const rotatedMaterial = cloneMaterialWithTerrainTextureRotation(
        material,
        rotationRadians
      );
      if (rotatedMaterial !== material) {
        didAdjustNodeMaterial = true;
        adjustedMaterialCount += 1;
      }
      return rotatedMaterial;
    });
    if (!didAdjustNodeMaterial) {
      return;
    }
    node.material = Array.isArray(node.material) ? rotatedMaterials : rotatedMaterials[0];
  });
  return { adjustedMaterialCount };
}

function shouldApplyTerrainTileRotatingTextureCompensation(source: {
  sourceMesh?: string;
  textureReference?: string;
  rotateTexture?: boolean;
}): boolean {
  if (source.rotateTexture === true) {
    return true;
  }
  const sourceMesh = source.sourceMesh?.trim().toLowerCase() ?? "";
  const textureReference = source.textureReference?.trim().toLowerCase() ?? "";
  if (textureReference !== "sic11_floor03") {
    return false;
  }
  return /^pavimento3__(?:\d+)$/u.test(sourceMesh) || sourceMesh === "23rwefsde5756";
}

export function applyTerrainTileRotatingTextureCompensationForTests(
  model: THREE.Object3D
): { adjustedMaterialCount: number } {
  return applyTerrainTileRotatingTextureCompensation(model);
}

function isLikelyTerrainCeilingMesh(mesh: THREE.Mesh): boolean {
  if (isLikelyTerrainVoidMaskMesh(mesh)) {
    return false;
  }
  if (hasTerrainCeilingToken(mesh.name)) {
    return true;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (materials.some((material) => hasTerrainCeilingToken(material.name))) {
    return true;
  }
  if (isLikelyElevatedHorizontalTileSurface(mesh.geometry)) {
    return true;
  }
  if (
    hasTerrainGroundSurfaceToken(mesh.name) ||
    materials.some((material) => hasTerrainGroundSurfaceToken(material.name))
  ) {
    return false;
  }
  return (
    isLikelyElevatedHorizontalTileSurface(mesh.geometry) ||
    isLikelyOpaqueTerrainTileShell(mesh.geometry, materials)
  );
}

export function isTerrainTileCeilingMeshForTests(mesh: THREE.Mesh): boolean {
  return isLikelyTerrainCeilingMesh(mesh);
}

function isLikelyTerrainVoidMaskMesh(mesh: THREE.Mesh): boolean {
  const source = readTerrainMeshAuroraSourceMetadata(mesh);
  if (isTerrainVoidMaskSourceMeshToken(source.sourceMesh)) {
    return true;
  }
  if (isTerrainVoidMaskToken(source.textureReference)) {
    return true;
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  return materials.some((material) => isTerrainVoidMaskToken(material?.name));
}

export function isTerrainTileVoidMaskMeshForTests(mesh: THREE.Mesh): boolean {
  return isLikelyTerrainVoidMaskMesh(mesh);
}

function isLikelyTerrainGroundSurfaceMesh(mesh: THREE.Mesh): boolean {
  if (isLikelyTerrainVoidMaskMesh(mesh) || isLikelyTerrainCeilingMesh(mesh)) {
    return false;
  }
  const source = readTerrainMeshAuroraSourceMetadata(mesh);
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  const candidates = [
    source.textureReference,
    source.sourceMesh,
    mesh.name,
    ...materials.map((material) => material?.name)
  ];
  const hasSurfaceToken = candidates.some((value) =>
    hasTerrainGroundSurfaceToken(value)
  );
  if (!hasSurfaceToken) {
    return false;
  }
  if (candidates.some((value) => hasExplicitTerrainGroundSurfaceToken(value))) {
    return true;
  }
  return isLikelyLowHorizontalTerrainSurface(mesh.geometry);
}

function isLikelyLowHorizontalTerrainSurface(
  geometry: THREE.BufferGeometry
): boolean {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const box = geometry.boundingBox;
  if (!box) {
    return false;
  }
  const size = new THREE.Vector3();
  box.getSize(size);
  const lowEnough = box.max.y <= 0.8;
  const thinEnough = size.y <= 0.16;
  const hasUsefulFootprint = Math.max(size.x, size.z) >= 0.2;
  return lowEnough && thinEnough && hasUsefulFootprint;
}

function hasExplicitTerrainGroundSurfaceToken(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  const surfaceTokens = [
    "ground",
    "floor",
    "pavimento",
    "cobble",
    "grass",
    "dirt",
    "road",
    "paver",
    "pavement",
    "plank",
    "carpet",
    "rug",
    "stair",
    "sand",
    "snow",
    "earth",
    "mud",
    "path"
  ];
  return surfaceTokens.some((token) => normalized.includes(token));
}

function hasTerrainGroundSurfaceToken(value: string | undefined): boolean {
  if (hasExplicitTerrainGroundSurfaceToken(value)) {
    return true;
  }
  const normalized = value?.trim().toLowerCase() ?? "";
  return ["stone", "wood"].some((token) => normalized.includes(token));
}

export function isTerrainTileGroundSurfaceMeshForTests(mesh: THREE.Mesh): boolean {
  return isLikelyTerrainGroundSurfaceMesh(mesh);
}

function hasTerrainCeilingToken(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /(^|[^a-z0-9])(ceiling|ceil|ciel|roof|rooftop|upper|overhang)([^a-z0-9]|$)/u.test(
    normalized
  );
}

function isTerrainVoidMaskSourceMeshToken(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /(^|[^a-z0-9])nero_01([^a-z0-9]|$)/u.test(
    normalized
  );
}

function isTerrainVoidMaskToken(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /(^|[^a-z0-9])sic11_black([^a-z0-9]|$)/u.test(normalized);
}

function hasTerrainImageMapOverdrawToken(value: string | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? "";
  return /(^|[^a-z0-9])((?:image[-_ ]?map[-_ ]?)?overdraw|tile[-_ ]?overdraw)([^a-z0-9]|$)/u.test(
    normalized
  );
}

function isLikelyElevatedHorizontalTileSurface(geometry: THREE.BufferGeometry): boolean {
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const box = geometry.boundingBox;
  if (!box) {
    return false;
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const wideAxis = Math.max(size.x, size.z);
  const narrowAxis = Math.min(size.x, size.z);
  const horizontalFootprint = wideAxis >= 6 && narrowAxis >= 4;
  const thinVerticalSurface = size.y <= Math.max(0.35, wideAxis * 0.08);
  const elevated = center.y >= 2.2 || box.min.y >= 1.4;
  return horizontalFootprint && thinVerticalSurface && elevated;
}

function isLikelyOpaqueTerrainTileShell(
  geometry: THREE.BufferGeometry,
  materials: Array<THREE.Material | undefined>
): boolean {
  if (!materials.some((material) => hasOpaqueTerrainShellMaterial(material))) {
    return false;
  }
  if (!geometry.boundingBox) {
    geometry.computeBoundingBox();
  }
  const box = geometry.boundingBox;
  if (!box) {
    return false;
  }
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const tileWide = Math.max(size.x, size.z) >= 8;
  const tileDeep = Math.min(size.x, size.z) >= 8;
  const roomHeight = size.y >= 2.5;
  const raisedCenter = center.y >= 1.2;
  return tileWide && tileDeep && roomHeight && raisedCenter;
}

function hasOpaqueTerrainShellMaterial(material: THREE.Material | undefined): boolean {
  if (!material) {
    return false;
  }
  const normalizedName = material.name.trim().toLowerCase();
  return /(^|[^a-z0-9])(roof|ceil|ceiling)([^a-z0-9]|$)/u.test(normalizedName);
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
    loaderErrorsByTileId,
    new Set(),
    new Set(),
    layer
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
  scenePackageReadiness: TerrainScenePackageReadiness,
  debugState: TerrainDebugState
): TerrainTileModelRuntimeSummary {
  const layer = new THREE.Group();
  layer.name = TILE_MODEL_LAYER_NAME;
  applyAuroraAreaRenderFrameMirror(layer, sceneData.width);
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
    textureFailedTileIds,
    layer
  );
  writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, initialSummary);

  sceneData.tiles.forEach((tile) => {
    const contract = resolveTileModelContract(tile, contractsByModelResRef);
    if (!contract) {
      return;
    }
    const assetRequest = resolveTerrainTileModelAssetRequestIdentity(tile, contract);

    void ensureTerrainTileModel(runtime, assetRequest.deliveryUrl, {
      cacheKey: assetRequest.runtimeCacheKey,
      loadMode: "loader",
      priority: PLACEABLE_MODEL_LOAD_PRIORITY_HIGH,
      sourceHierarchyMode: "preserve-loaded",
      timeoutMs: TERRAIN_TILE_ASSET_LOAD_TIMEOUT_MS
    }).then((model) => {
      if (!model || layer.parent !== runtime.scene) {
        if (!model) {
          markTerrainTileModelLoadFailed(
            runtime,
            layer,
            sceneData,
            tile,
            "tile_model_loader_returned_null_or_timeout",
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
      addLoadedTileModelToLayer(
        layer,
        tile,
        contract,
        model,
        sceneData.width,
        sceneData.height,
        debugState
      );
      if (contract.textureUrlsByReference.size > 0) {
        const applyTerrainTileMaterialTextures = (
          texturesByReference: Map<string, THREE.Texture>,
          finalize: boolean
        ): void => {
          if (layer.parent !== runtime.scene || model.parent !== layer) {
            return;
          }
          if (texturesByReference.size === 0) {
            if (!finalize) {
              return;
            }
            model.userData.auroraTerrainTileMaterialTextureStatus = "missing";
            textureFailedTileIds.add(tile.id);
            const nextSummary = buildTileModelRuntimeSummary(
              sceneData,
              contractsByModelResRef,
              loadedTileIds,
              failedTileIds,
              loaderErrorsByTileId,
              textureAppliedTileIds,
              textureFailedTileIds,
              layer
            );
            writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
            return;
          }
          applyPlaceableTexturesToModel(model, texturesByReference);
          const terrainMetadataTextureBinding =
            applyTerrainTileMaterialTexturesFromMeshMetadata(model, texturesByReference);
          model.userData.auroraTerrainTileMaterialTextureMetadataAppliedCount =
            terrainMetadataTextureBinding.appliedMaterialCount;
          const rotateTextureCompensation =
            applyTerrainTileRotatingTextureCompensation(model);
          model.userData.auroraTerrainTileRotateTextureAdjustedMaterialCount =
            rotateTextureCompensation.adjustedMaterialCount;
          const materialLightingMode =
            applyTerrainTileTextureColorMaterialMode(model);
          model.userData.auroraTerrainTileMaterialLightingConvertedCount =
            materialLightingMode.convertedMaterialCount;
          model.userData.auroraTerrainTileMaterialLightingInspectedCount =
            materialLightingMode.inspectedMaterialCount;
          const texturedModelSummary = summarizeTerrainTileModelLayer(model);
          const didBindTextureToMesh = texturedModelSummary.materialMapCount > 0;
          const textureBindingNotApplicable =
            !didBindTextureToMesh &&
            isTerrainTileMaterialTextureBindingNotApplicable(model);
          model.userData.auroraTerrainTileMaterialTextureStatus = didBindTextureToMesh
            ? "applied"
            : textureBindingNotApplicable
              ? "not_applicable_hidden_tile"
              : finalize
                ? "failed_no_material_map"
                : "loading";
          model.userData.auroraTerrainTileMaterialTextureAppliedCount =
            texturesByReference.size;
          if (didBindTextureToMesh || textureBindingNotApplicable) {
            textureAppliedTileIds.add(tile.id);
            textureFailedTileIds.delete(tile.id);
          } else if (finalize) {
            textureFailedTileIds.add(tile.id);
            textureAppliedTileIds.delete(tile.id);
          }
          const nextSummary = buildTileModelRuntimeSummary(
            sceneData,
            contractsByModelResRef,
            loadedTileIds,
            failedTileIds,
            loaderErrorsByTileId,
            textureAppliedTileIds,
            textureFailedTileIds,
            layer
          );
          writeTerrainRenderDataset(runtime, renderStatus, scenePackageReadiness, nextSummary);
        };
        void ensureTerrainTileTexturesByReference(
          runtime,
          contract.textureUrlsByReference,
          (texturesByReference) => {
            applyTerrainTileMaterialTextures(texturesByReference, false);
          }
        ).then((texturesByReference) => {
          if (layer.parent !== runtime.scene || model.parent !== layer) {
            return;
          }
          applyTerrainTileMaterialTextures(texturesByReference, true);
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
            textureFailedTileIds,
            layer
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
        textureFailedTileIds,
        layer
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
  clearTerrainImageMapLayer(runtime);
  clearTerrainAreaGlobalLightingLayer(runtime);
  clearTerrainTileLightLayer(runtime);
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
    scenePackageReadiness,
    debugState
  );
  rebuildTerrainImageMapLayer(
    runtime,
    sceneData,
    tileModelContractsByModelResRef,
    renderStatus
  );
  rebuildTerrainAreaGlobalLightingLayer(runtime, sceneData, debugState);
  rebuildTerrainTileLightLayer(runtime, sceneData, debugState);
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
    matrix.makeTranslation(
      resolveAuroraAreaRenderTileCenterX(tile.col, sceneData.width),
      TILE_GEOMETRY_Y + (tile.height ?? 0),
      resolveAuroraAreaRenderTileCenterZ(tile.row, sceneData.height)
    );
    rotation.makeRotationY(
      resolveAuroraAreaRenderTileOrientation(
        tile.orientation,
        tile.tilesetOrientation
      ) * (Math.PI / 2)
    );
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
  applyAuroraAreaRenderFrameMirror(labelLayer, sceneData.width);
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
    label.position.set(
      resolveAuroraAreaRenderTileCenterX(tile.col, sceneData.width),
      TILE_GEOMETRY_Y + (tile.height ?? 0) + 0.11,
      resolveAuroraAreaRenderTileCenterZ(tile.row, sceneData.height)
    );
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
