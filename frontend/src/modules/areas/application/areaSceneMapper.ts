import type {
  AreaScene,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../../scene/contracts";
import { normalizeSceneObjectMetadata } from "../../scene/domain/sceneFactory";
import type { AreaApiDetail, AreaApiObjectKind, AreaApiTileInstance } from "../contracts";

const AURORA_TILE_TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

const BACKEND_KIND_TO_SCENE_KIND: Record<AreaApiObjectKind, SceneObjectKind> = {
  placeable: "placeables",
  door: "doors",
  creature: "creatures",
  item: "items",
  sound: "sounds"
};

function toSceneObject(
  areaId: string,
  entry: AreaApiDetail["objects"][number]
): SceneObject {
  const sceneKind = BACKEND_KIND_TO_SCENE_KIND[entry.kind];
  const sourceResRef = entry.resRef?.trim() || entry.templateId;
  return normalizeSceneObjectMetadata({
    id: `${areaId}:${entry.objectId}`,
    kind: sceneKind,
    name: entry.templateId,
    resRef: sourceResRef,
    tag: entry.templateId.toUpperCase(),
    isStatic: sceneKind === "placeables",
    x: entry.x,
    y: entry.y,
    z: entry.z,
    bearing: entry.bearing,
    source: {
      type: "aurora_git",
      areaId,
      sourceObjectId: entry.objectId,
      sourceKind: entry.kind,
      templateId: entry.templateId,
      ...(entry.appearanceType !== undefined ? { appearanceType: entry.appearanceType } : {}),
      ...(entry.genericType !== undefined ? { genericType: entry.genericType } : {})
    },
    ...(sceneKind === "sounds" && entry.soundPositioning
      ? {
          soundPositioning: entry.soundPositioning
        }
      : {}),
    ...(sceneKind === "doors" && entry.doorTransition
      ? {
          doorTransition: {
            ...entry.doorTransition,
            flags: { ...entry.doorTransition.flags },
            ...(entry.doorTransition.extra
              ? { extra: { ...entry.doorTransition.extra } }
              : {})
          }
        }
      : {}),
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

function terrainFromAuroraTile(tileId: number | undefined, tileIndex: number): TerrainBrushKind {
  const sourceIndex = Number.isFinite(tileId ?? Number.NaN) ? tileId ?? 0 : tileIndex;
  return AURORA_TILE_TERRAIN_SEQUENCE[Math.abs(sourceIndex) % AURORA_TILE_TERRAIN_SEQUENCE.length];
}

function normalizeOrientation(value: number | undefined): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0;
  }
  return ((((Math.trunc(value ?? 0) % 4) + 4) % 4) as 0 | 1 | 2 | 3);
}

function toSceneTile(area: AreaApiDetail, tile: AreaApiTileInstance): SceneTile {
  const orientation = normalizeOrientation(tile.orientation);
  return {
    id: tile.tileInstanceId,
    row: tile.row,
    col: tile.col,
    terrain: terrainFromAuroraTile(tile.tileId, tile.tileIndex),
    orientation,
    rotateTexture: orientation % 2 === 1,
    plot: false,
    source: "aurora_tile_list",
    areaId: tile.areaId || area.areaId,
    tilesetResRef: tile.tilesetResRef,
    tileIndex: tile.tileIndex,
    ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
    ...(tile.modelResRef ? { modelResRef: tile.modelResRef } : {}),
    ...(tile.modelSource ? { modelSource: tile.modelSource } : {}),
    ...(tile.height !== undefined ? { height: tile.height } : {}),
    ...(tile.fallbackReason ? { fallbackReason: tile.fallbackReason } : {})
  };
}

export function mapBackendAreaToScene(
  area: AreaApiDetail,
  now: () => number = () => Date.now()
): AreaScene {
  const areaTiles = area.tiles ?? [];
  const objects = area.objects.map((entry) => toSceneObject(area.areaId, entry));
  if (areaTiles.length > 0) {
    return {
      sceneId: area.areaId,
      areaName: area.name,
      width: area.width,
      height: area.height,
      biome: area.biome,
      tags: [...area.tags],
      benchmark: area.benchmark,
      previewImageUrl: area.previewImageUrl,
      textureAtlas: { ...area.textureAtlas },
      composition: { ...area.composition },
      backendUpdatedAt: area.updatedAt,
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: area.tileSet ?? areaTiles[0]?.tilesetResRef,
        tileCount: areaTiles.length,
        ...(areaTiles.some((tile) => tile.fallbackReason)
          ? { fallbackReason: "tile-metadata-incomplete" }
          : {})
      },
      tiles: areaTiles.map((tile) => toSceneTile(area, tile)),
      objects,
      updatedAtUnixMs: now(),
      source: "aurora_area"
    };
  }

  return {
    sceneId: area.areaId,
    areaName: area.name,
    width: area.width,
    height: area.height,
    biome: area.biome,
    tags: [...area.tags],
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlas: { ...area.textureAtlas },
    composition: { ...area.composition },
    backendUpdatedAt: area.updatedAt,
    tileSource: {
      type: "blocked_missing_tile_data",
      tileCount: 0,
      fallbackReason: "area-api-tile-list-missing"
    },
    tiles: [],
    objects,
    updatedAtUnixMs: now(),
    source: "aurora_area"
  };
}
