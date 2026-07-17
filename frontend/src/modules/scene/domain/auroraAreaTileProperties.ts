import type {
  AuroraAreaEditableTile,
  AuroraAreaEditingState,
  AuroraAreaTilesetDefinition
} from "./auroraAreaEditing";

export const AURORA_AREA_TILE_PROPERTY_FIELDS = [
  "mainLight1",
  "mainLight2",
  "sourceLight1",
  "sourceLight2",
  "animLoop1",
  "animLoop2",
  "animLoop3"
] as const;

export type AuroraAreaTilePropertyField =
  (typeof AURORA_AREA_TILE_PROPERTY_FIELDS)[number];

/** `null` removes an override; `undefined` leaves the current value unchanged. */
export type AuroraAreaTilePropertyPatch = Partial<
  Record<AuroraAreaTilePropertyField, number | null>
>;

export type AuroraAreaTilePropertiesResult =
  | {
      ok: true;
      state: AuroraAreaEditingState;
      changedTileIds: string[];
    }
  | {
      ok: false;
      code: "TILE_UNKNOWN" | "TILE_PROPERTY_INVALID";
      message: string;
    };

/**
 * Atomically applies the seven instance fields exposed by Aurora's Tile
 * Properties dialog. These bytes do not alter SET topology, orientation, or
 * group reconstruction.
 */
export function applyAuroraAreaTileProperties(
  state: AuroraAreaEditingState,
  tileIds: readonly string[],
  patch: AuroraAreaTilePropertyPatch
): AuroraAreaTilePropertiesResult {
  const uniqueTileIds = [...new Set(tileIds)];
  if (uniqueTileIds.length === 0) {
    return { ok: false, code: "TILE_UNKNOWN", message: "Select at least one tile." };
  }
  for (const field of AURORA_AREA_TILE_PROPERTY_FIELDS) {
    const value = patch[field];
    if (value !== undefined && value !== null && !isByte(value)) {
      return {
        ok: false,
        code: "TILE_PROPERTY_INVALID",
        message: `${field} must be an integer in the 0..255 range.`
      };
    }
  }
  const selected = new Set(uniqueTileIds);
  if (uniqueTileIds.some((tileId) => !state.tiles.some((tile) => tile.id === tileId))) {
    return {
      ok: false,
      code: "TILE_UNKNOWN",
      message: "The Tile Properties selection contains a tile that is no longer present."
    };
  }

  const next = cloneState(state);
  const changedTileIds: string[] = [];
  for (const tile of next.tiles) {
    if (!selected.has(tile.id)) {
      continue;
    }
    const before = propertySnapshot(tile);
    applyPatch(tile, patch);
    if (AURORA_AREA_TILE_PROPERTY_FIELDS.some((field) => before[field] !== tile[field])) {
      changedTileIds.push(tile.id);
    }
  }
  return {
    ok: true,
    state: changedTileIds.length > 0 ? next : state,
    changedTileIds
  };
}

/** Resets every selected tile to the seven defaults authored by its SET tile. */
export function resetAuroraAreaTilePropertiesToSetDefaults(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  tileIds: readonly string[]
): AuroraAreaTilePropertiesResult {
  const uniqueTileIds = [...new Set(tileIds)];
  if (uniqueTileIds.length === 0) {
    return { ok: false, code: "TILE_UNKNOWN", message: "Select at least one tile." };
  }
  const next = cloneState(state);
  const changedTileIds: string[] = [];
  for (const tileId of uniqueTileIds) {
    const tile = next.tiles.find((candidate) => candidate.id === tileId);
    if (!tile) {
      return {
        ok: false,
        code: "TILE_UNKNOWN",
        message: "The Tile Properties selection contains a tile that is no longer present."
      };
    }
    const authored = definition.tiles.find((candidate) => candidate.tileId === tile.tileId);
    if (!authored) {
      return {
        ok: false,
        code: "TILE_UNKNOWN",
        message: `Tile_ID ${tile.tileId} is missing from the selected SET.`
      };
    }
    const before = propertySnapshot(tile);
    for (const field of AURORA_AREA_TILE_PROPERTY_FIELDS) {
      const value = authored[field];
      if (value === undefined) {
        delete tile[field];
      } else {
        tile[field] = value;
      }
    }
    if (AURORA_AREA_TILE_PROPERTY_FIELDS.some((field) => before[field] !== tile[field])) {
      changedTileIds.push(tile.id);
    }
  }
  return {
    ok: true,
    state: changedTileIds.length > 0 ? next : state,
    changedTileIds
  };
}

function propertySnapshot(
  tile: AuroraAreaEditableTile
): Record<AuroraAreaTilePropertyField, number | undefined> {
  return Object.fromEntries(
    AURORA_AREA_TILE_PROPERTY_FIELDS.map((field) => [field, tile[field]])
  ) as Record<AuroraAreaTilePropertyField, number | undefined>;
}

function applyPatch(
  tile: AuroraAreaEditableTile,
  patch: AuroraAreaTilePropertyPatch
): void {
  for (const field of AURORA_AREA_TILE_PROPERTY_FIELDS) {
    const value = patch[field];
    if (value === undefined) {
      continue;
    }
    if (value === null) {
      delete tile[field];
    } else {
      tile[field] = value;
    }
  }
}

function isByte(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 255;
}

function cloneState(state: AuroraAreaEditingState): AuroraAreaEditingState {
  return {
    ...state,
    tiles: state.tiles.map((tile) => ({ ...tile })),
    topology: {
      ...state.topology,
      tokens: [...state.topology.tokens],
      heights: [...state.topology.heights]
    },
    groupInstances: state.groupInstances.map((group) => ({
      ...group,
      tileIds: [...group.tileIds],
      cells: group.cells.map((cell) => ({ ...cell }))
    }))
  };
}
