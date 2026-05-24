import type {
  AreaScene,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";

const TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

export const LEGACY_SEED_SCENE_WIDTH_TILES = 18;
export const LEGACY_SEED_SCENE_HEIGHT_TILES = 18;
export const DEFAULT_SEED_SCENE_WIDTH_TILES = 2;
export const DEFAULT_SEED_SCENE_HEIGHT_TILES = 2;

function terrainByIndex(index: number): TerrainBrushKind {
  return TERRAIN_SEQUENCE[index % TERRAIN_SEQUENCE.length];
}

function createTile(row: number, col: number): SceneTile {
  const id = `tile_${row}_${col}`;
  const sequenceIndex = (row * 17 + col * 31) % TERRAIN_SEQUENCE.length;
  return {
    id,
    row,
    col,
    terrain: terrainByIndex(sequenceIndex),
    orientation: ((row + col) % 4) as 0 | 1 | 2 | 3,
    rotateTexture: (row + col) % 2 === 0,
    plot: false
  };
}

function scaleCoordinate(value: number, from: number, to: number): number {
  if (from <= 0) {
    return value;
  }
  return (value / from) * to;
}

export function rescaleSceneObjectsToSize(
  objects: SceneObject[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): SceneObject[] {
  return objects.map((object) => ({
    ...object,
    x: scaleCoordinate(object.x, fromWidth, toWidth),
    y: scaleCoordinate(object.y, fromHeight, toHeight)
  }));
}

function createSeedObjects(width: number, height: number): SceneObject[] {
  const seedObjects: Array<
    Omit<SceneObject, "visualTransform" | "bearing" | "tag" | "resRef"> & {
      resRef: string;
      tag: string;
      bearing?: number;
    }
  > = [
    { id: "plc_barrel_01", kind: "placeables", x: 3.2, y: 5.7, resRef: "plc_a01", tag: "PLC_BARREL_01" },
    { id: "plc_table_02", kind: "placeables", x: 6.6, y: 9.4, resRef: "plc_a02", tag: "PLC_TABLE_02" },
    { id: "plc_chair_03", kind: "placeables", x: 10.1, y: 8.1, resRef: "plc_x02", tag: "PLC_CHAIR_03" },
    { id: "plc_crate_04", kind: "placeables", x: 12.8, y: 13.4, resRef: "plc_a03", tag: "PLC_CRATE_04" },
    { id: "crt_devo_01", kind: "creatures", x: 8.4, y: 7.3, resRef: "nw_battdevour", tag: "CRT_DEVOURER_01" },
    { id: "crt_guard_02", kind: "creatures", x: 13.7, y: 6.4, resRef: "nw_hguard", tag: "CRT_GUARD_02" },
    { id: "dr_nw_01", kind: "doors", x: 1.5, y: 8.5, resRef: "nw_door_ttr_11", tag: "DOOR_WEST_01" },
    { id: "dr_nw_02", kind: "doors", x: 17.2, y: 9.1, resRef: "nw_door_ttr_11", tag: "DOOR_EAST_02" },
    { id: "itm_chest_01", kind: "items", x: 9.8, y: 4.7, resRef: "nw_it_mpotion001", tag: "ITEM_CHEST_01" },
    { id: "itm_sword_02", kind: "items", x: 14.2, y: 12.7, resRef: "nw_wswm001", tag: "ITEM_SWORD_02" },
    { id: "snd_amb_01", kind: "sounds", x: 5.1, y: 14.8, resRef: "as_amb_forest", tag: "SOUND_FOREST_01" },
    { id: "snd_amb_02", kind: "sounds", x: 15.4, y: 3.2, resRef: "as_amb_caves", tag: "SOUND_CAVES_02" }
  ];

  return seedObjects.map((entry) => ({
    ...entry,
    x: scaleCoordinate(entry.x, LEGACY_SEED_SCENE_WIDTH_TILES, width),
    y: scaleCoordinate(entry.y, LEGACY_SEED_SCENE_HEIGHT_TILES, height),
    bearing: entry.bearing ?? 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  }));
}

export function createSeedAreaScene(
  width = DEFAULT_SEED_SCENE_WIDTH_TILES,
  height = DEFAULT_SEED_SCENE_HEIGHT_TILES
): AreaScene {
  const tiles: SceneTile[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      tiles.push(createTile(row, col));
    }
  }

  return {
    sceneId: "wnd_seed_builder_v1",
    areaName: "Seed Area (MVP Runtime)",
    width,
    height,
    tiles,
    objects: createSeedObjects(width, height),
    updatedAtUnixMs: Date.now(),
    source: "seed"
  };
}

export function createNewSceneObject(
  kind: SceneObjectKind,
  x: number,
  y: number,
  sequence: number
): SceneObject {
  const index = String(sequence).padStart(3, "0");
  const baseResRefByKind: Record<SceneObjectKind, string> = {
    placeables: "plc_a01",
    creatures: "nw_hguard",
    doors: "nw_door_ttr_11",
    items: "nw_it_mpotion001",
    sounds: "as_amb_forest"
  };

  const key = kind.slice(0, 3);
  return {
    id: `${key}_${index}`,
    kind,
    resRef: baseResRefByKind[kind],
    tag: `${kind.toUpperCase()}_${index}`,
    x,
    y,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  };
}
