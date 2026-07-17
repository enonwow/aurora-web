export const AURORA_AREA_CORNERS = [
  "topLeft",
  "topRight",
  "bottomRight",
  "bottomLeft"
] as const;

export const AURORA_AREA_EDGES = ["top", "right", "bottom", "left"] as const;

export type AuroraAreaCorner = (typeof AURORA_AREA_CORNERS)[number];
export type AuroraAreaEdge = (typeof AURORA_AREA_EDGES)[number];

export interface AuroraAreaTransitionRule {
  placedTerrain: string;
  placedHeight: number;
  adjacentTerrain: string;
  adjacentHeight: number;
  changedTerrain: string;
  changedHeight: number;
}

export interface AuroraAreaTilesetTile {
  tileId: number;
  modelResRef?: string;
  orientation?: 0 | 1 | 2 | 3;
  terrain: Partial<Record<AuroraAreaCorner, string>>;
  crossers: Partial<Record<AuroraAreaEdge, string>>;
  cornerHeights: Partial<Record<AuroraAreaCorner, number>>;
  groupId?: string;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface AuroraAreaTilesetGroup {
  id: string;
  name: string;
  rows: number;
  columns: number;
  tileIds: readonly number[];
}

export interface AuroraAreaTilesetNamedType {
  id: string;
  name: string;
}

export interface AuroraAreaTilesetDefaults {
  interior?: boolean;
  hasHeightTransition?: boolean;
  transition?: number;
  borderTerrain?: string;
  defaultTerrain?: string;
  floorTerrain?: string;
}

export interface AuroraAreaTilesetDefinitionDiagnostic {
  code: string;
  message: string;
  section: string;
  severity: "warning" | "error";
}

export interface AuroraAreaTilesetDefinition {
  schemaVersion?: 1;
  tilesetResRef: string;
  fingerprint: string;
  /** Full SET [GENERAL] authoring defaults. Optional for local/legacy fixtures. */
  defaults?: AuroraAreaTilesetDefaults;
  /** Named SET terrain palette entries. Missing legacy payloads are mapped to an empty array. */
  terrainTypes?: readonly AuroraAreaTilesetNamedType[];
  /** Named SET crosser palette entries. Missing legacy payloads are mapped to an empty array. */
  crosserTypes?: readonly AuroraAreaTilesetNamedType[];
  /** Parser diagnostics retained so the editor can explain incomplete SET palettes. */
  diagnostics?: readonly AuroraAreaTilesetDefinitionDiagnostic[];
  defaultTerrain?: string;
  transitionRules: readonly AuroraAreaTransitionRule[];
  tiles: readonly AuroraAreaTilesetTile[];
  groups: readonly AuroraAreaTilesetGroup[];
}

export interface AuroraAreaEditableTile {
  id: string;
  row: number;
  col: number;
  /** Original ARE Tile_List cell used for lossless per-struct field patching. */
  sourceRow?: number;
  sourceCol?: number;
  tileId: number;
  orientation: 0 | 1 | 2 | 3;
  height: number;
  groupId?: string;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface AuroraAreaTopology {
  tokenWidth: number;
  tokenHeight: number;
  tokens: Array<string | null>;
  cornerWidth: number;
  cornerHeight: number;
  heights: number[];
}

export interface AuroraAreaGroupInstance {
  groupId: string;
  anchorRow: number;
  anchorCol: number;
  orientation: 0 | 1 | 2 | 3;
  /**
   * Runtime identifiers of the tiles owned by this placed group, in the same
   * order as the SET group definition. Coordinates are retained as a render
   * convenience, but membership is resolved through these IDs so a selection
   * cannot accidentally target another instance of the same SET group.
   */
  tileIds: string[];
  cells: Array<{ row: number; col: number }>;
  /**
   * Editor-only, lossless snapshot of the loose tiles replaced when this
   * group was placed. ARE files do not contain this information, therefore
   * reconstructed source groups deliberately omit it and cannot be removed
   * or rotated without guessing what used to be underneath them.
   */
  underlay?: {
    tiles: AuroraAreaEditableTile[];
  };
}

export interface AuroraAreaEditingState {
  schemaVersion: 1;
  areaResRef: string;
  tilesetResRef: string;
  tilesetFingerprint: string;
  /**
   * Editor-local state for Aurora's exact tile-candidate LCG tie-break.
   * This is deliberately absent from ARE/GFF export payloads.
   */
  randomSeed?: number;
  sourceAreaFingerprint?: string;
  width: number;
  height: number;
  tiles: AuroraAreaEditableTile[];
  topology: AuroraAreaTopology;
  groupInstances: AuroraAreaGroupInstance[];
}

export interface AuroraAreaCell {
  row: number;
  col: number;
}

export interface AuroraAreaCrosserTarget extends AuroraAreaCell {
  edge: AuroraAreaEdge;
}

export interface AuroraAreaCommandSuccess {
  ok: true;
  state: AuroraAreaEditingState;
  changedTileIds: string[];
}

export interface AuroraAreaCommandFailure {
  ok: false;
  code:
    | "AREA_SIZE_LIMIT"
    | "GROUP_OUT_OF_BOUNDS"
    | "GROUP_OVERLAP"
    | "GROUP_LOCKED"
    | "GROUP_UNKNOWN"
    | "CLIPBOARD_COLLISION"
    | "CLIPBOARD_EMPTY"
    | "CLIPBOARD_INCOMPATIBLE"
    | "AMBIGUOUS_ERASER"
    | "NO_MATCHING_TILE"
    | "TILE_UNKNOWN";
  message: string;
}

export type AuroraAreaCommandResult = AuroraAreaCommandSuccess | AuroraAreaCommandFailure;
export type AuroraAreaCandidateSelector = (candidateCount: number) => number;

export interface AuroraAreaTileClipboardPayload {
  schemaVersion: 1;
  tilesetResRef: string;
  tilesetFingerprint: string;
  width: number;
  height: number;
  tiles: Array<{
    relativeRow: number;
    relativeCol: number;
    tile: Omit<AuroraAreaEditableTile, "id" | "row" | "col" | "sourceRow" | "sourceCol">;
  }>;
  groups: Array<{
    groupId: string;
    relativeAnchorRow: number;
    relativeAnchorCol: number;
    orientation: 0 | 1 | 2 | 3;
    memberTileIndexes: number[];
  }>;
}

export type AuroraAreaClipboardCopyResult =
  | { ok: true; payload: AuroraAreaTileClipboardPayload; sourceTileIds: string[] }
  | AuroraAreaCommandFailure;

export type AuroraAreaClipboardCutResult =
  | (AuroraAreaCommandSuccess & { payload: AuroraAreaTileClipboardPayload })
  | AuroraAreaCommandFailure;

/** Bounds enforced by Aurora Toolset's height editing path (FUN_0066e2ec). */
export const AURORA_AREA_TILE_MIN_HEIGHT = 0;
export const AURORA_AREA_TILE_MAX_HEIGHT = 32;

interface AuroraAreaTileSignature {
  terrain: Record<AuroraAreaCorner, string | null>;
  crossers: Record<AuroraAreaEdge, string | null>;
  cornerHeights: Record<AuroraAreaCorner, number>;
}

const CORNER_INDEX: Record<AuroraAreaCorner, number> = {
  topLeft: 0,
  topRight: 1,
  bottomRight: 2,
  bottomLeft: 3
};

const EDGE_INDEX: Record<AuroraAreaEdge, number> = {
  top: 0,
  right: 1,
  bottom: 2,
  left: 3
};

export function createAuroraAreaEditingState(input: {
  areaResRef: string;
  width: number;
  height: number;
  definition: AuroraAreaTilesetDefinition;
  selector?: AuroraAreaCandidateSelector;
}): AuroraAreaCommandResult {
  if (!withinAreaLimits(input.width, input.height)) {
    return failure("AREA_SIZE_LIMIT", "Area dimensions must remain within 2..32 tiles.");
  }
  const state: AuroraAreaEditingState = {
    schemaVersion: 1,
    areaResRef: input.areaResRef,
    tilesetResRef: input.definition.tilesetResRef,
    tilesetFingerprint: input.definition.fingerprint,
    randomSeed: createAuroraAreaEditorRandomSeed(input.areaResRef, input.definition.fingerprint),
    width: input.width,
    height: input.height,
    tiles: [],
    topology: createDefaultTopology(input.width, input.height, resolveTilesetDefaultTerrain(input.definition)),
    groupInstances: []
  };
  return retileUngrouped(state, input.definition, input.selector);
}

export function hydrateAuroraAreaEditingState(input: {
  areaResRef: string;
  width: number;
  height: number;
  definition: AuroraAreaTilesetDefinition;
  tiles: readonly AuroraAreaEditableTile[];
  sourceAreaFingerprint?: string;
}): AuroraAreaCommandResult {
  if (!withinAreaLimits(input.width, input.height)) {
    return failure("AREA_SIZE_LIMIT", "Area dimensions must remain within 2..32 tiles.");
  }
  const state: AuroraAreaEditingState = {
    schemaVersion: 1,
    areaResRef: input.areaResRef,
    tilesetResRef: input.definition.tilesetResRef,
    tilesetFingerprint: input.definition.fingerprint,
    randomSeed: createAuroraAreaEditorRandomSeed(input.areaResRef, input.definition.fingerprint),
    ...(input.sourceAreaFingerprint ? { sourceAreaFingerprint: input.sourceAreaFingerprint } : {}),
    width: input.width,
    height: input.height,
    tiles: [],
    topology: createDefaultTopology(input.width, input.height, resolveTilesetDefaultTerrain(input.definition)),
    groupInstances: []
  };
  for (const sourceTile of input.tiles) {
    if (!hasCell(state, sourceTile.row, sourceTile.col)) {
      return failure("TILE_UNKNOWN", `Tile (${sourceTile.row},${sourceTile.col}) falls outside Area bounds.`);
    }
    const definitionTile = input.definition.tiles.find((tile) => tile.tileId === sourceTile.tileId);
    if (!definitionTile) {
      return failure("TILE_UNKNOWN", `Tile_ID ${sourceTile.tileId} is missing from the selected SET.`);
    }
    const tile: AuroraAreaEditableTile = {
      ...sourceTile,
      sourceRow: sourceTile.sourceRow ?? sourceTile.row,
      sourceCol: sourceTile.sourceCol ?? sourceTile.col,
      groupId: definitionTile.groupId
    };
    replaceTile(state, tile);
    writeTileTopology(state.topology, tile, definitionTile);
  }
  if (state.tiles.length !== input.width * input.height) {
    return failure("TILE_UNKNOWN", "Area does not contain a complete Tile_List.");
  }
  const restoredGroups = restoreGroupInstances(state, input.definition);
  if (restoredGroups.ok === false) {
    return failure("TILE_UNKNOWN", restoredGroups.message);
  }
  return success(state, state.tiles.map((tile) => tile.id));
}
export function applyTerrainStroke(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cells: readonly AuroraAreaCell[],
  terrain: string,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const next = pruneStaleGroupMembers(state);
  const pendingTerrain = new Map<string, string>();
  for (const cell of cells) {
    if (!hasCell(next, cell.row, cell.col)) {
      continue;
    }
    const tile = tileAt(next, cell.row, cell.col);
    if (tile && isGroupedTile(next, tile)) {
      return failure("GROUP_LOCKED", "Terrain cannot overwrite a tile that belongs to a placed group.");
    }
    pendingTerrain.set(cellKey(cell), terrain);
  }

  propagateTerrainTransitions(next, definition, pendingTerrain);
  return retileUngrouped(next, definition, selector);
}

/**
 * Applies a SET [CROSSER TYPES] entry to one or more half-grid edges.
 *
 * Aurora's terrain input path stores the selected crosser in the shared
 * half-grid token array before validating/retiling the adjacent cells
 * (FUN_00670550). Group footprints remain atomic and therefore fail closed.
 */
export function applyCrosserStroke(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  targets: readonly AuroraAreaCrosserTarget[],
  crosser: string,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const next = pruneStaleGroupMembers(state);
  if (!crosser.trim()) {
    return failure("NO_MATCHING_TILE", "Select a crosser palette item before painting.");
  }
  if (
    definition.crosserTypes?.length &&
    !definition.crosserTypes.some((candidate) => candidate.id === crosser)
  ) {
    return failure("NO_MATCHING_TILE", `Crosser "${crosser}" is missing from SET [CROSSER TYPES].`);
  }
  const changedCells = new Set<string>();
  for (const target of targets) {
    if (!hasCell(next, target.row, target.col)) {
      return failure("TILE_UNKNOWN", `Tile (${target.row},${target.col}) falls outside Area bounds.`);
    }
    const adjacent = cellsSharingEdge(next, target);
    if (adjacent.some((cell) => {
      const tile = tileAt(next, cell.row, cell.col);
      return tile ? isGroupedTile(next, tile) : false;
    })) {
      return failure("GROUP_LOCKED", "A crosser cannot overwrite an edge owned by a placed group.");
    }
    const point = edgePoint(target.row, target.col, target.edge);
    if (getToken(next.topology, point.row, point.col) === crosser) {
      continue;
    }
    setToken(next.topology, point.row, point.col, crosser);
    adjacent.forEach((cell) => changedCells.add(cellKey(cell)));
  }
  if (changedCells.size === 0) {
    return success(next, []);
  }
  return retileUngrouped(next, definition, selector);
}

export function placeAuroraAreaGroup(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  groupId: string,
  anchor: AuroraAreaCell,
  orientation: 0 | 1 | 2 | 3,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const group = definition.groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    return failure("GROUP_UNKNOWN", `Tileset group "${groupId}" does not exist.`);
  }
  const placements = rotateGroupCells(group, anchor, orientation);
  if (placements.some((placement) => !hasCell(prepared, placement.row, placement.col))) {
    return failure("GROUP_OUT_OF_BOUNDS", "Group placement falls outside the Area bounds.");
  }
  if (
    placements.some((placement) => {
      const tile = tileAt(prepared, placement.row, placement.col);
      return tile ? isGroupedTile(prepared, tile) : false;
    })
  ) {
    return failure("GROUP_OVERLAP", "Group placement overlaps an existing group.");
  }
  const next = cloneState(prepared);
  const underlay = captureGroupUnderlay(next, placements);
  const footprintHeight = resolveCommonTileHeight(underlay.tiles);
  if (footprintHeight === null) {
    return failure(
      "GROUP_LOCKED",
      "Group placement requires one common base height across its complete footprint."
    );
  }
  const changedTileIds: string[] = [];
  placements.forEach((placement, index) => {
    const tileId = group.tileIds[index];
    const tileDefinition = definition.tiles.find((tile) => tile.tileId === tileId);
    if (!tileDefinition) {
      throw new Error(`Invalid tileset group ${group.id}: Tile${tileId} is missing.`);
    }
    const tile: AuroraAreaEditableTile = {
      id: makeTileId(placement.row, placement.col, tileId),
      row: placement.row,
      col: placement.col,
      ...(copyTileSourceProvenance(underlay.tiles[index])),
      tileId,
      orientation: normalizeOrientation((tileDefinition.orientation ?? 0) + orientation),
      height: footprintHeight,
      groupId: group.id,
      ...copyTileRuntimeFields(tileDefinition)
    };
    replaceTile(next, tile);
    writeTileTopology(next.topology, tile, tileDefinition);
    changedTileIds.push(tile.id);
  });
  next.groupInstances.push({
    groupId: group.id,
    anchorRow: anchor.row,
    anchorCol: anchor.col,
    orientation,
    tileIds: [...changedTileIds],
    cells: placements.map(({ row, col }) => ({ row, col })),
    underlay
  });
  const retiled = retileUngrouped(next, definition, selector);
  return retiled.ok
    ? { ok: true, state: retiled.state, changedTileIds: unique([...changedTileIds, ...retiled.changedTileIds]) }
    : retiled;
}

export function rotateAuroraAreaTile(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  delta: -1 | 1,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const current = tileAt(prepared, cell.row, cell.col);
  if (!current) {
    return failure("TILE_UNKNOWN", "No tile exists at the selected cell.");
  }
  if (resolveAuroraAreaGroupInstanceAtCell(prepared, cell)) {
    return rotateAuroraAreaGroupAtCell(prepared, definition, cell, delta, selector);
  }
  const definitionTile = definition.tiles.find((tile) => tile.tileId === current.tileId);
  if (!definitionTile) {
    return failure("TILE_UNKNOWN", `Tile_ID ${current.tileId} is missing from the tileset.`);
  }
  const next = cloneState(prepared);
  const tile = tileAt(next, cell.row, cell.col) as AuroraAreaEditableTile;
  tile.orientation = normalizeOrientation(tile.orientation + delta);
  writeTileTopology(next.topology, tile, definitionTile);
  // Orientation changes write shared half-grid tokens/corner heights. Retile
  // every affected loose neighbour so Tile_ID/orientation cannot drift away
  // from the topology that will be exported.
  return retileUngrouped(next, definition, selector);
}

export function changeAuroraAreaTileHeight(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  delta: -1 | 1,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const current = tileAt(prepared, cell.row, cell.col);
  if (!current) {
    return failure("TILE_UNKNOWN", "No tile exists at the selected cell.");
  }
  if (resolveAuroraAreaGroupInstanceAtCell(prepared, cell)) {
    return failure(
      "GROUP_LOCKED",
      "A placed group member cannot be raised or lowered as a loose tile; use the explicit group-height command."
    );
  }
  const definitionTile = definition.tiles.find((tile) => tile.tileId === current.tileId);
  if (!definitionTile) {
    return failure("TILE_UNKNOWN", `Tile_ID ${current.tileId} is missing from the tileset.`);
  }
  const height = current.height + delta;
  if (height < AURORA_AREA_TILE_MIN_HEIGHT || height > AURORA_AREA_TILE_MAX_HEIGHT) {
    // Toolset restores the previous height when the edit crosses either bound.
    return success(cloneState(prepared), []);
  }

  const next = cloneState(prepared);
  const tile = tileAt(next, cell.row, cell.col) as AuroraAreaEditableTile;
  tile.height = height;
  writeTileTopology(next.topology, tile, definitionTile);
  return retileUngrouped(next, definition, selector);
}

/**
 * Chooses another SET tile compatible with the cell's existing topology.
 *
 * Reroll is intentionally topology-neutral: it only replaces Tile_ID and
 * orientation. ARE cell provenance plus the four light and three animation
 * bytes stay attached to the cell instead of being reset from SET defaults.
 */
export function rerollAuroraAreaTileVariant(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const current = tileAt(prepared, cell.row, cell.col);
  if (!current) {
    return failure("TILE_UNKNOWN", "No tile exists at the selected cell.");
  }
  if (resolveAuroraAreaGroupInstanceAtCell(prepared, cell)) {
    return failure("GROUP_LOCKED", "A placed group member cannot be rerolled independently.");
  }

  const signature = readCellSignature(prepared.topology, cell.row, cell.col);
  const candidates = findMatchingTiles(definition, signature);
  const differentTileIdCandidates = candidates.filter(
    (candidate) => candidate.tile.tileId !== current.tileId
  );
  const alternatives = (differentTileIdCandidates.length > 0
    ? differentTileIdCandidates
    : candidates).filter(
    (candidate) =>
      candidate.tile.tileId !== current.tileId || candidate.orientation !== current.orientation
  );
  if (alternatives.length === 0) {
    return failure(
      "NO_MATCHING_TILE",
      `No alternate SET tile variant matches topology at (${cell.row},${cell.col}).`
    );
  }

  const selected = alternatives[selectCandidate(alternatives.length, selector)];
  const next = cloneState(prepared);
  const rerolled: AuroraAreaEditableTile = {
    ...current,
    id: makeTileId(cell.row, cell.col, selected.tile.tileId),
    tileId: selected.tile.tileId,
    orientation: selected.orientation,
    height: Math.min(...Object.values(readCellHeights(prepared.topology, cell.row, cell.col)))
  };
  replaceTile(next, rerolled);
  return success(next, [rerolled.id]);
}

/**
 * Captures tiles using Aurora's relative bounding-box clipboard contract.
 * Selecting any member of a SET group expands the payload to that complete
 * runtime group instance; the editor-only underlay is deliberately not copied.
 */
export function copyAuroraAreaTilesToClipboard(
  state: AuroraAreaEditingState,
  cells: readonly AuroraAreaCell[]
): AuroraAreaClipboardCopyResult {
  const prepared = pruneStaleGroupMembers(state);
  const selectedTileIds = new Set<string>();
  for (const cell of cells) {
    const tile = tileAt(prepared, cell.row, cell.col);
    if (!tile) {
      return failure("TILE_UNKNOWN", `No tile exists at (${cell.row},${cell.col}).`);
    }
    const group = resolveAuroraAreaGroupInstanceAtCell(prepared, cell);
    if (group) {
      group.tileIds.forEach((tileId) => selectedTileIds.add(tileId));
    } else {
      selectedTileIds.add(tile.id);
    }
  }
  if (selectedTileIds.size === 0) {
    return failure("CLIPBOARD_EMPTY", "No Area tiles are selected for copying.");
  }

  const selectedTiles = prepared.tiles
    .filter((tile) => selectedTileIds.has(tile.id))
    .sort((left, right) => left.row - right.row || left.col - right.col);
  const minRow = Math.min(...selectedTiles.map((tile) => tile.row));
  const minCol = Math.min(...selectedTiles.map((tile) => tile.col));
  const maxRow = Math.max(...selectedTiles.map((tile) => tile.row));
  const maxCol = Math.max(...selectedTiles.map((tile) => tile.col));
  const tileIndexById = new Map(selectedTiles.map((tile, index) => [tile.id, index]));
  const groups = prepared.groupInstances
    .filter((group) => group.tileIds.every((tileId) => selectedTileIds.has(tileId)))
    .map((group) => ({
      groupId: group.groupId,
      relativeAnchorRow: group.anchorRow - minRow,
      relativeAnchorCol: group.anchorCol - minCol,
      orientation: group.orientation,
      memberTileIndexes: group.tileIds.map((tileId) => tileIndexById.get(tileId) as number)
    }));

  return {
    ok: true,
    sourceTileIds: selectedTiles.map((tile) => tile.id),
    payload: {
      schemaVersion: 1,
      tilesetResRef: prepared.tilesetResRef,
      tilesetFingerprint: prepared.tilesetFingerprint,
      width: maxCol - minCol + 1,
      height: maxRow - minRow + 1,
      tiles: selectedTiles.map((tile) => {
        const {
          id: _id,
          row: _row,
          col: _col,
          sourceRow: _sourceRow,
          sourceCol: _sourceCol,
          ...snapshot
        } = tile;
        return {
          relativeRow: tile.row - minRow,
          relativeCol: tile.col - minCol,
          tile: snapshot
        };
      }),
      groups
    }
  };
}

/**
 * Pastes the complete relative clipboard payload as one fail-closed mutation.
 * Pasted cells are new ARE cells and therefore never inherit source provenance.
 */
export function pasteAuroraAreaTilesFromClipboard(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  payload: AuroraAreaTileClipboardPayload,
  anchor: AuroraAreaCell
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  if (payload.schemaVersion !== 1 || payload.tiles.length === 0) {
    return failure("CLIPBOARD_EMPTY", "The Area tile clipboard is empty or unsupported.");
  }
  if (
    payload.tilesetResRef !== prepared.tilesetResRef ||
    payload.tilesetFingerprint !== prepared.tilesetFingerprint
  ) {
    return failure("CLIPBOARD_INCOMPATIBLE", "Clipboard tiles belong to a different SET definition.");
  }

  const destinations = payload.tiles.map((entry) => ({
    row: anchor.row + entry.relativeRow,
    col: anchor.col + entry.relativeCol
  }));
  const destinationKeys = new Set(destinations.map(cellKey));
  if (destinationKeys.size !== destinations.length) {
    return failure("CLIPBOARD_INCOMPATIBLE", "Clipboard contains duplicate relative tile cells.");
  }
  if (destinations.some((cell) => !hasCell(prepared, cell.row, cell.col))) {
    return failure("GROUP_OUT_OF_BOUNDS", "Clipboard paste falls outside the Area bounds.");
  }
  if (
    destinations.some((cell) => {
      const tile = tileAt(prepared, cell.row, cell.col);
      return tile ? isGroupedTile(prepared, tile) : false;
    })
  ) {
    return failure("CLIPBOARD_COLLISION", "Clipboard paste overlaps an existing placed group.");
  }
  if (payload.tiles.some((entry) => !definition.tiles.some((tile) => tile.tileId === entry.tile.tileId))) {
    return failure("TILE_UNKNOWN", "Clipboard contains a Tile_ID missing from the selected SET.");
  }

  const claimedIndexes = new Set<number>();
  for (const group of payload.groups) {
    const groupDefinition = definition.groups.find((candidate) => candidate.id === group.groupId);
    if (!groupDefinition) {
      return failure("GROUP_UNKNOWN", `Clipboard SET group "${group.groupId}" does not exist.`);
    }
    if (
      group.memberTileIndexes.length !== groupDefinition.tileIds.length ||
      group.memberTileIndexes.some(
        (index) =>
          !Number.isInteger(index) ||
          index < 0 ||
          index >= payload.tiles.length ||
          claimedIndexes.has(index)
      )
    ) {
      return failure("CLIPBOARD_INCOMPATIBLE", "Clipboard group membership is incomplete or overlaps.");
    }
    const expectedCells = rotateGroupCells(
      groupDefinition,
      { row: group.relativeAnchorRow, col: group.relativeAnchorCol },
      group.orientation
    );
    const exactLayout = group.memberTileIndexes.every((tileIndex, memberIndex) => {
      const entry = payload.tiles[tileIndex];
      const expected = expectedCells[memberIndex];
      const tileDefinition = definition.tiles.find((tile) => tile.tileId === entry.tile.tileId);
      return (
        entry.tile.tileId === groupDefinition.tileIds[memberIndex] &&
        tileDefinition?.groupId === group.groupId &&
        entry.relativeRow === expected.row &&
        entry.relativeCol === expected.col
      );
    });
    if (!exactLayout) {
      return failure(
        "CLIPBOARD_INCOMPATIBLE",
        `Clipboard group "${group.groupId}" does not match its SET member order and rotated layout.`
      );
    }
    group.memberTileIndexes.forEach((index) => claimedIndexes.add(index));
  }
  const orphanedGroupTile = payload.tiles.some((entry, index) => {
    const tileDefinition = definition.tiles.find((tile) => tile.tileId === entry.tile.tileId);
    return Boolean(tileDefinition?.groupId) !== claimedIndexes.has(index);
  });
  if (orphanedGroupTile) {
    return failure(
      "CLIPBOARD_INCOMPATIBLE",
      "Clipboard SET group tiles must belong to exactly one complete group instance."
    );
  }

  const next = cloneState(prepared);
  const destinationUnderlays = payload.groups.map((group) => ({
    group,
    underlay: {
      tiles: group.memberTileIndexes.map((index) => {
        const cell = destinations[index];
        const tile = tileAt(next, cell.row, cell.col);
        if (!tile || isGroupedTile(next, tile)) {
          throw new Error(`Cannot capture paste underlay at (${cell.row},${cell.col}).`);
        }
        return { ...tile };
      })
    }
  }));
  const pastedTiles = payload.tiles.map((entry, index) => {
    const cell = destinations[index];
    const destinationTile = tileAt(next, cell.row, cell.col);
    if (!destinationTile) {
      throw new Error(`Cannot paste over a missing destination tile at (${cell.row},${cell.col}).`);
    }
    const tile: AuroraAreaEditableTile = {
      ...entry.tile,
      id: makeTileId(cell.row, cell.col, entry.tile.tileId),
      row: cell.row,
      col: cell.col,
      // Do not copy provenance from the clipboard source. The pasted cell
      // retains the destination ARE struct provenance so unknown Tile_List
      // fields at that coordinate remain lossless on export.
      ...copyTileSourceProvenance(destinationTile)
    };
    delete tile.groupId;
    replaceTile(next, tile);
    return tile;
  });

  for (const { group, underlay } of destinationUnderlays) {
    const memberTiles = group.memberTileIndexes.map((index) => pastedTiles[index]);
    memberTiles.forEach((tile) => {
      tile.groupId = group.groupId;
    });
    next.groupInstances.push({
      groupId: group.groupId,
      anchorRow: anchor.row + group.relativeAnchorRow,
      anchorCol: anchor.col + group.relativeAnchorCol,
      orientation: group.orientation,
      tileIds: memberTiles.map((tile) => tile.id),
      cells: memberTiles.map((tile) => ({ row: tile.row, col: tile.col })),
      underlay
    });
  }
  rebuildTopology(next, definition);
  if (!doesEveryTileMatchRebuiltTopology(next, definition)) {
    return failure(
      "CLIPBOARD_INCOMPATIBLE",
      "Clipboard tile boundaries are incompatible with the destination topology."
    );
  }
  return success(next, pastedTiles.map((tile) => tile.id));
}

/** Copies the expanded selection, then clears it in one atomic Area mutation. */
export function cutAuroraAreaTilesToClipboard(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cells: readonly AuroraAreaCell[]
): AuroraAreaClipboardCutResult {
  const copied = copyAuroraAreaTilesToClipboard(state, cells);
  if (copied.ok === false) {
    return failure(copied.code, copied.message);
  }
  const prepared = pruneStaleGroupMembers(state);
  const selectedIds = new Set(copied.sourceTileIds);
  const selectedGroups = prepared.groupInstances.filter((group) =>
    group.tileIds.some((tileId) => selectedIds.has(tileId))
  );
  if (selectedGroups.some((group) => !group.underlay)) {
    return failure(
      "GROUP_LOCKED",
      "A source-backed group cannot be cut because its replaced-tile underlay is unavailable."
    );
  }
  const groupMemberIds = new Set(selectedGroups.flatMap((group) => group.tileIds));
  const looseTiles = prepared.tiles.filter(
    (tile) => selectedIds.has(tile.id) && !groupMemberIds.has(tile.id)
  );
  const blankCandidate = resolveUniqueTopologyDefaultTile(definition);
  if (looseTiles.length > 0 && !blankCandidate) {
    return failure(
      "NO_MATCHING_TILE",
      "Cut requires exactly one ungrouped tile matching the SET default topology; no unambiguous blank exists."
    );
  }

  const next = cloneState(prepared);
  const changedTileIds: string[] = [];
  for (const selectedGroup of selectedGroups) {
    const index = next.groupInstances.findIndex((group) => sameGroupInstance(group, selectedGroup));
    if (index < 0) {
      return failure("GROUP_UNKNOWN", "The selected group is no longer present in the Area.");
    }
    changedTileIds.push(...next.groupInstances[index].tileIds);
    changedTileIds.push(...restoreGroupUnderlay(next, next.groupInstances[index]));
    next.groupInstances.splice(index, 1);
  }
  if (blankCandidate) {
    for (const source of looseTiles) {
      const current = tileAt(next, source.row, source.col);
      if (!current) {
        return failure("TILE_UNKNOWN", "The selected loose tile is no longer present in the Area.");
      }
      const blankTile: AuroraAreaEditableTile = {
        id: makeTileId(source.row, source.col, blankCandidate.tile.tileId),
        row: source.row,
        col: source.col,
        ...copyTileSourceProvenance(current),
        tileId: blankCandidate.tile.tileId,
        orientation: blankCandidate.orientation,
        height: 0,
        ...copyTileRuntimeFields(blankCandidate.tile)
      };
      replaceTile(next, blankTile);
      changedTileIds.push(current.id, blankTile.id);
    }
  }
  rebuildTopology(next, definition);
  if (!doesEveryTileMatchRebuiltTopology(next, definition)) {
    return failure(
      "CLIPBOARD_INCOMPATIBLE",
      "Cut replacement is incompatible with the surrounding tile topology."
    );
  }
  return {
    ok: true,
    state: next,
    changedTileIds: unique(changedTileIds),
    payload: copied.payload
  };
}

/** Resolves a placed group only when the selected runtime tile is its member. */
export function resolveAuroraAreaGroupInstanceAtCell(
  state: AuroraAreaEditingState,
  cell: AuroraAreaCell
): AuroraAreaGroupInstance | undefined {
  const tile = tileAt(state, cell.row, cell.col);
  if (!tile) {
    return undefined;
  }
  return state.groupInstances.find((group) => groupTileIds(state, group).includes(tile.id));
}

/**
 * Removes an editor-placed SET group and atomically restores the exact loose
 * tiles that occupied its footprint. Reconstructed ARE groups fail closed
 * because their pre-placement underlay does not exist in the source format.
 */
export function removeAuroraAreaGroupAtCell(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  _selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const instance = resolveAuroraAreaGroupInstanceAtCell(prepared, cell);
  if (!instance) {
    return failure("GROUP_UNKNOWN", "The selected tile does not belong to a placed group.");
  }
  if (!instance.underlay) {
    return failure(
      "GROUP_LOCKED",
      "This source-backed group has no editor underlay and cannot be removed without guessing replaced tiles."
    );
  }

  const next = cloneState(prepared);
  const index = next.groupInstances.findIndex((group) => sameGroupInstance(group, instance));
  if (index < 0) {
    return failure("GROUP_UNKNOWN", "The selected group is no longer present in the Area.");
  }
  const changedTileIds = [...next.groupInstances[index].tileIds];
  const restoredTileIds = restoreGroupUnderlay(next, next.groupInstances[index]);
  next.groupInstances.splice(index, 1);
  rebuildTopology(next, definition);
  return success(next, unique([...changedTileIds, ...restoredTileIds]));
}

/** Rotates an entire placed SET group selected through any one of its tiles. */
export function rotateAuroraAreaGroupAtCell(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  delta: -1 | 1,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const instance = resolveAuroraAreaGroupInstanceAtCell(prepared, cell);
  if (!instance) {
    return failure("GROUP_UNKNOWN", "The selected tile does not belong to a placed group.");
  }
  if (!instance.underlay) {
    return failure(
      "GROUP_LOCKED",
      "This source-backed group has no editor underlay and cannot be rotated without guessing replaced tiles."
    );
  }
  const group = definition.groups.find((candidate) => candidate.id === instance.groupId);
  if (!group) {
    return failure("GROUP_UNKNOWN", `Tileset group "${instance.groupId}" does not exist.`);
  }
  const orientation = normalizeOrientation(instance.orientation + delta);
  const placements = rotateGroupCells(group, { row: instance.anchorRow, col: instance.anchorCol }, orientation);
  if (placements.some((placement) => !hasCell(prepared, placement.row, placement.col))) {
    return failure("GROUP_OUT_OF_BOUNDS", "Group rotation falls outside the Area bounds.");
  }
  const memberIds = new Set(instance.tileIds);
  if (
    placements.some((placement) => {
      const tile = tileAt(prepared, placement.row, placement.col);
      return tile ? isGroupedTile(prepared, tile) && !memberIds.has(tile.id) : false;
    })
  ) {
    return failure("GROUP_OVERLAP", "Group rotation overlaps an existing group.");
  }

  const next = cloneState(prepared);
  const instanceIndex = next.groupInstances.findIndex((candidate) => sameGroupInstance(candidate, instance));
  if (instanceIndex < 0) {
    return failure("GROUP_UNKNOWN", "The selected group is no longer present in the Area.");
  }
  const previousInstance = next.groupInstances[instanceIndex];
  const previousTiles = previousInstance.tileIds
    .map((tileId) => tileById(next, tileId))
    .filter((tile): tile is AuroraAreaEditableTile => Boolean(tile));
  const groupHeight = previousTiles[0]?.height ?? 0;
  restoreGroupUnderlay(next, previousInstance);
  next.groupInstances.splice(instanceIndex, 1);
  rebuildTopology(next, definition);
  const underlay = captureGroupUnderlay(next, placements);

  const changedTileIds: string[] = [];
  placements.forEach((placement, index) => {
    const tileId = group.tileIds[index];
    const definitionTile = definition.tiles.find((candidate) => candidate.tileId === tileId);
    if (!definitionTile) {
      throw new Error(`Invalid tileset group ${group.id}: Tile${tileId} is missing.`);
    }
    const tile: AuroraAreaEditableTile = {
      id: makeTileId(placement.row, placement.col, tileId),
      row: placement.row,
      col: placement.col,
      ...(copyTileSourceProvenance(underlay.tiles[index])),
      tileId,
      orientation: normalizeOrientation((definitionTile.orientation ?? 0) + orientation),
      height: groupHeight,
      groupId: group.id,
      ...copyTileRuntimeFields(definitionTile)
    };
    replaceTile(next, tile);
    writeTileTopology(next.topology, tile, definitionTile);
    changedTileIds.push(tile.id);
  });
  next.groupInstances.splice(instanceIndex, 0, {
    ...previousInstance,
    orientation,
    tileIds: [...changedTileIds],
    cells: placements.map(({ row, col }) => ({ row, col })),
    underlay
  });
  const retiled = retileUngrouped(next, definition, selector);
  return retiled.ok
    ? { ok: true, state: retiled.state, changedTileIds: unique([...changedTileIds, ...retiled.changedTileIds]) }
    : retiled;
}

/** Changes the common height of a placed group selected through a member tile. */
export function changeAuroraAreaGroupHeightAtCell(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  delta: -1 | 1,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const instance = resolveAuroraAreaGroupInstanceAtCell(prepared, cell);
  if (!instance) {
    return failure("GROUP_UNKNOWN", "The selected tile does not belong to a placed group.");
  }
  const memberTiles = instance.tileIds
    .map((tileId) => tileById(prepared, tileId))
    .filter((tile): tile is AuroraAreaEditableTile => Boolean(tile));
  if (memberTiles.length !== instance.tileIds.length) {
    return failure("GROUP_UNKNOWN", "The selected group no longer has all of its member tiles.");
  }
  if (memberTiles.some((tile) => {
    const height = tile.height + delta;
    return height < AURORA_AREA_TILE_MIN_HEIGHT || height > AURORA_AREA_TILE_MAX_HEIGHT;
  })) {
    return success(cloneState(prepared), []);
  }
  const next = cloneState(prepared);
  const changedTileIds: string[] = [];
  for (const tileId of instance.tileIds) {
    const tile = tileById(next, tileId);
    if (!tile) {
      continue;
    }
    const definitionTile = definition.tiles.find((candidate) => candidate.tileId === tile.tileId);
    if (!definitionTile) {
      return failure("TILE_UNKNOWN", `Tile_ID ${tile.tileId} is missing from the tileset.`);
    }
    tile.height += delta;
    writeTileTopology(next.topology, tile, definitionTile);
    changedTileIds.push(tile.id);
  }
  // Editing a committed group's height is an explicit web extension rather
  // than a recovered native group command. Keep the group atomic and bounded;
  // do not invent Aurora neighbour-transition semantics for it.
  void selector;
  return success(next, changedTileIds);
}

export function resizeAuroraArea(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  edge: "top" | "right" | "bottom" | "left",
  delta: number,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  if (!Number.isInteger(delta) || delta === 0) {
    return success(cloneState(state), []);
  }
  const prepared = pruneStaleGroupMembers(state);
  const width = prepared.width + (edge === "left" || edge === "right" ? delta : 0);
  const height = prepared.height + (edge === "top" || edge === "bottom" ? delta : 0);
  if (!withinAreaLimits(width, height)) {
    return failure("AREA_SIZE_LIMIT", "Area dimensions must remain within 2..32 tiles.");
  }
  const next = createSkeleton(prepared, width, height, resolveTilesetDefaultTerrain(definition));
  const rowShift = edge === "top" ? delta : 0;
  const colShift = edge === "left" ? delta : 0;
  const remappedTileIds = new Map<string, string>();
  for (const tile of prepared.tiles) {
    const row = tile.row + rowShift;
    const col = tile.col + colShift;
    if (!hasCell(next, row, col)) {
      if (isGroupedTile(prepared, tile)) {
        return failure("GROUP_OUT_OF_BOUNDS", "Resize would split a placed group.");
      }
      continue;
    }
    const id = makeTileId(row, col, tile.tileId);
    replaceTile(next, { ...tile, row, col, id });
    remappedTileIds.set(tile.id, id);
  }
  next.groupInstances = prepared.groupInstances
    .map((group) => ({
      ...group,
      anchorRow: group.anchorRow + rowShift,
      anchorCol: group.anchorCol + colShift,
      tileIds: group.tileIds.map((tileId) => remappedTileIds.get(tileId) ?? tileId),
      cells: group.cells.map((cell) => ({ row: cell.row + rowShift, col: cell.col + colShift })),
      ...(group.underlay
        ? {
            underlay: {
              tiles: group.underlay.tiles.map((tile) => {
                const row = tile.row + rowShift;
                const col = tile.col + colShift;
                return { ...tile, row, col, id: makeTileId(row, col, tile.tileId) };
              })
            }
          }
        : {})
    }))
    .filter((group) => group.cells.every((cell) => hasCell(next, cell.row, cell.col)));
  rebuildTopology(next, definition);
  return retileUngrouped(next, definition, selector);
}

export function rotateAuroraArea(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  turns: 1 | 2 | 3,
  selector?: AuroraAreaCandidateSelector
): AuroraAreaCommandResult {
  const prepared = pruneStaleGroupMembers(state);
  const width = turns % 2 === 0 ? prepared.width : prepared.height;
  const height = turns % 2 === 0 ? prepared.height : prepared.width;
  const remappedTileIds = new Map<string, string>();
  for (const tile of prepared.tiles) {
    const cell = rotateCell(tile.row, tile.col, prepared.width, prepared.height, turns);
    const id = makeTileId(cell.row, cell.col, tile.tileId);
    remappedTileIds.set(tile.id, id);
  }

  const remappedGroups: AuroraAreaGroupInstance[] = [];
  for (const group of prepared.groupInstances) {
    const groupDefinition = definition.groups.find((candidate) => candidate.id === group.groupId);
    if (!groupDefinition) {
      return failure("GROUP_UNKNOWN", `Tileset group "${group.groupId}" does not exist.`);
    }
    const orientation = normalizeOrientation(group.orientation + turns);
    const cells = group.cells.map((cell) =>
      rotateCell(cell.row, cell.col, prepared.width, prepared.height, turns)
    );
    const anchor = resolveGroupAnchorFromOrderedCells(groupDefinition, cells, orientation);
    if (!anchor) {
      return failure(
        "GROUP_UNKNOWN",
        `Placed group "${group.groupId}" does not match its ordered SET member layout.`
      );
    }
    remappedGroups.push({
      ...group,
      anchorRow: anchor.row,
      anchorCol: anchor.col,
      orientation,
      tileIds: group.tileIds.map((tileId) => remappedTileIds.get(tileId) ?? tileId),
      cells,
      ...(group.underlay
        ? {
            underlay: {
              tiles: group.underlay.tiles.map((tile) => {
                const cell = rotateCell(tile.row, tile.col, prepared.width, prepared.height, turns);
                return {
                  ...tile,
                  row: cell.row,
                  col: cell.col,
                  id: makeTileId(cell.row, cell.col, tile.tileId),
                  orientation: normalizeOrientation(tile.orientation + turns)
                };
              })
            }
          }
        : {})
    });
  }

  const next = createSkeleton(prepared, width, height, resolveTilesetDefaultTerrain(definition));
  for (const tile of prepared.tiles) {
    const cell = rotateCell(tile.row, tile.col, prepared.width, prepared.height, turns);
    replaceTile(next, {
      ...tile,
      row: cell.row,
      col: cell.col,
      id: remappedTileIds.get(tile.id) as string,
      orientation: normalizeOrientation(tile.orientation + turns)
    });
  }
  next.groupInstances = remappedGroups;
  rebuildTopology(next, definition);
  return retileUngrouped(next, definition, selector);
}

export function resolvePrimaryTransition(
  rules: readonly AuroraAreaTransitionRule[],
  placedTerrain: string,
  placedHeight: number,
  adjacentTerrain: string,
  adjacentHeight: number
): Pick<AuroraAreaTransitionRule, "changedTerrain" | "changedHeight"> | null {
  const rule = rules.find(
    (candidate) =>
      candidate.placedTerrain === placedTerrain &&
      candidate.placedHeight === placedHeight &&
      candidate.adjacentTerrain === adjacentTerrain &&
      candidate.adjacentHeight === adjacentHeight
  );
  return rule ? { changedTerrain: rule.changedTerrain, changedHeight: rule.changedHeight } : null;
}

function restoreGroupInstances(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition
): { ok: true } | { ok: false; message: string } {
  const occupied = new Set<string>();
  for (const group of definition.groups) {
    const memberTiles = state.tiles.filter((tile) => tile.groupId === group.id);
    if (memberTiles.length === 0) {
      continue;
    }
    for (let row = 0; row < state.height; row += 1) {
      for (let col = 0; col < state.width; col += 1) {
        for (const orientation of [0, 1, 2, 3] as const) {
          const cells = rotateGroupCells(group, { row, col }, orientation);
          if (
            cells.some(
              (cell) =>
                !hasCell(state, cell.row, cell.col) || occupied.has(`${cell.row}:${cell.col}`)
            )
          ) {
            continue;
          }
          const matches = cells.every((cell, index) => {
            const tile = tileAt(state, cell.row, cell.col);
            const definitionTile = definition.tiles.find((candidate) => candidate.tileId === group.tileIds[index]);
            return (
              tile?.groupId === group.id &&
              tile.tileId === group.tileIds[index] &&
              Boolean(definitionTile) &&
              tile.orientation === normalizeOrientation((definitionTile?.orientation ?? 0) + orientation)
            );
          });
          if (!matches) {
            continue;
          }
          cells.forEach((cell) => occupied.add(`${cell.row}:${cell.col}`));
          state.groupInstances.push({
            groupId: group.id,
            anchorRow: row,
            anchorCol: col,
            orientation,
            tileIds: cells.map((cell) => {
              const tile = tileAt(state, cell.row, cell.col);
              if (!tile) {
                throw new Error("Cannot restore a group without all of its member tiles.");
              }
              return tile.id;
            }),
            cells
          });
        }
      }
    }
    if (memberTiles.some((tile) => !occupied.has(`${tile.row}:${tile.col}`))) {
      return {
        ok: false,
        message: `Tiles from ${group.name} do not form a complete rectangular group placement.`
      };
    }
  }
  return { ok: true };
}

function retileUngrouped(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  selector: AuroraAreaCandidateSelector | undefined
): AuroraAreaCommandResult {
  const next = pruneStaleGroupMembers(state);
  const changed: string[] = [];
  for (let row = 0; row < next.height; row += 1) {
    for (let col = 0; col < next.width; col += 1) {
      const current = tileAt(next, row, col);
      if (current && isGroupedTile(next, current)) {
        continue;
      }
      const signature = readCellSignature(next.topology, row, col);
      const candidates = findMatchingTiles(definition, signature);
      if (candidates.length === 0) {
        return failure("NO_MATCHING_TILE", `No SET tile matches topology at (${row},${col}).`);
      }
      const currentCandidateIndex = current
        ? candidates.findIndex(
            (candidate) =>
              candidate.tile.tileId === current.tileId &&
              candidate.orientation === current.orientation
          )
        : -1;
      const selected = candidates[
        currentCandidateIndex >= 0
          ? currentCandidateIndex
          : selectCandidate(candidates.length, selector)
      ];
      const height = Math.min(...Object.values(readCellHeights(next.topology, row, col)));
      const tile: AuroraAreaEditableTile = {
        id: makeTileId(row, col, selected.tile.tileId),
        row,
        col,
        ...(current ? copyTileSourceProvenance(current) : {}),
        tileId: selected.tile.tileId,
        orientation: selected.orientation,
        height,
        ...(current ? copyEditableTileRuntimeFields(current) : copyTileRuntimeFields(selected.tile))
      };
      replaceTile(next, tile);
      changed.push(tile.id);
    }
  }
  return success(next, changed);
}

function findMatchingTiles(
  definition: AuroraAreaTilesetDefinition,
  signature: AuroraAreaTileSignature
): Array<{ tile: AuroraAreaTilesetTile; orientation: 0 | 1 | 2 | 3 }> {
  const matches: Array<{ tile: AuroraAreaTilesetTile; orientation: 0 | 1 | 2 | 3 }> = [];
  for (const tile of definition.tiles) {
    if (tile.groupId) {
      continue;
    }
    for (const orientation of [0, 1, 2, 3] as const) {
      if (signaturesMatch(signature, orientTile(tile, orientation))) {
        matches.push({ tile, orientation });
      }
    }
  }
  return matches;
}

function orientTile(tile: AuroraAreaTilesetTile, orientation: 0 | 1 | 2 | 3): AuroraAreaTileSignature {
  const terrain = {} as Record<AuroraAreaCorner, string | null>;
  const crossers = {} as Record<AuroraAreaEdge, string | null>;
  const cornerHeights = {} as Record<AuroraAreaCorner, number>;
  for (const corner of AURORA_AREA_CORNERS) {
    const source = AURORA_AREA_CORNERS[(CORNER_INDEX[corner] - orientation + 4) % 4];
    terrain[corner] = tile.terrain[source] ?? null;
    cornerHeights[corner] = tile.cornerHeights[source] ?? 0;
  }
  for (const edge of AURORA_AREA_EDGES) {
    const source = AURORA_AREA_EDGES[(EDGE_INDEX[edge] - orientation + 4) % 4];
    crossers[edge] = tile.crossers[source] ?? null;
  }
  return { terrain, crossers, cornerHeights };
}

function signaturesMatch(left: AuroraAreaTileSignature, right: AuroraAreaTileSignature): boolean {
  return (
    AURORA_AREA_CORNERS.every(
      (corner) =>
        left.terrain[corner] === right.terrain[corner] &&
        left.cornerHeights[corner] === right.cornerHeights[corner]
    ) && AURORA_AREA_EDGES.every((edge) => left.crossers[edge] === right.crossers[edge])
  );
}

function createSkeleton(
  state: AuroraAreaEditingState,
  width: number,
  height: number,
  defaultTerrain: string | null
): AuroraAreaEditingState {
  return {
    schemaVersion: 1,
    areaResRef: state.areaResRef,
    tilesetResRef: state.tilesetResRef,
    tilesetFingerprint: state.tilesetFingerprint,
    ...(state.randomSeed === undefined ? {} : { randomSeed: state.randomSeed }),
    ...(state.sourceAreaFingerprint ? { sourceAreaFingerprint: state.sourceAreaFingerprint } : {}),
    width,
    height,
    tiles: [],
    topology: createDefaultTopology(width, height, defaultTerrain),
    groupInstances: []
  };
}

function createDefaultTopology(width: number, height: number, defaultTerrain: string | null): AuroraAreaTopology {
  const tokenWidth = width * 2 + 1;
  const tokenHeight = height * 2 + 1;
  const tokens = Array<string | null>(tokenWidth * tokenHeight).fill(null);
  for (let row = 0; row <= height; row += 1) {
    for (let col = 0; col <= width; col += 1) {
      tokens[(row * 2) * tokenWidth + col * 2] = defaultTerrain;
    }
  }
  return {
    tokenWidth,
    tokenHeight,
    tokens,
    cornerWidth: width + 1,
    cornerHeight: height + 1,
    heights: Array<number>((width + 1) * (height + 1)).fill(0)
  };
}

/**
 * SET [GENERAL].Default is Aurora's initial topology contract. Some callers
 * still provide the legacy flattened field, while real parser payloads retain
 * the value under `defaults`; no non-SET terrain is guessed when both are absent.
 */
function resolveTilesetDefaultTerrain(definition: AuroraAreaTilesetDefinition): string | null {
  return definition.defaultTerrain ?? definition.defaults?.defaultTerrain ?? null;
}

/** Stable web-editor seed; candidate draws themselves use Aurora's native LCG. */
export function createAuroraAreaEditorRandomSeed(areaResRef: string, tilesetFingerprint: string): number {
  const source = `${areaResRef.trim().toLowerCase()}\0${tilesetFingerprint.trim().toLowerCase()}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
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
      tileIds: groupTileIds(state, group),
      cells: group.cells.map((cell) => ({ ...cell })),
      ...(group.underlay
        ? { underlay: { tiles: group.underlay.tiles.map((tile) => ({ ...tile })) } }
        : {})
    }))
  };
}

function captureGroupUnderlay(
  state: AuroraAreaEditingState,
  cells: readonly AuroraAreaCell[]
): NonNullable<AuroraAreaGroupInstance["underlay"]> {
  return {
    tiles: cells.map((cell) => {
      const tile = tileAt(state, cell.row, cell.col);
      if (!tile || isGroupedTile(state, tile)) {
        throw new Error(`Cannot capture a loose tile underlay at (${cell.row},${cell.col}).`);
      }
      return { ...tile };
    })
  };
}

/** Native group placement receives one elevation shared by every footprint member. */
function resolveCommonTileHeight(tiles: readonly AuroraAreaEditableTile[]): number | null {
  const first = tiles[0]?.height;
  return first !== undefined && tiles.every((tile) => tile.height === first) ? first : null;
}

function restoreGroupUnderlay(
  state: AuroraAreaEditingState,
  group: AuroraAreaGroupInstance
): string[] {
  if (!group.underlay) {
    return [];
  }
  const restoredTileIds: string[] = [];
  for (const snapshot of group.underlay.tiles) {
    const tile = { ...snapshot };
    delete tile.groupId;
    replaceTile(state, tile);
    restoredTileIds.push(tile.id);
  }
  return restoredTileIds;
}

/**
 * Drops invalid group memberships from a cloned state. A SET group is atomic:
 * a missing, duplicated, or mismatched member releases every remaining member
 * instead of leaving a partial Tile_group that can no longer be selected or
 * exported safely. States saved before runtime IDs were introduced are
 * migrated from their stored cells on first use.
 */
export function pruneStaleAuroraAreaGroupMembers(
  state: AuroraAreaEditingState
): AuroraAreaEditingState {
  return pruneStaleGroupMembers(state);
}

function pruneStaleGroupMembers(state: AuroraAreaEditingState): AuroraAreaEditingState {
  const next = cloneState(state);
  const claimedTileIds = new Set<string>();
  const survivingGroups: AuroraAreaGroupInstance[] = [];

  for (const group of next.groupInstances) {
    const tileIds = group.tileIds;
    const complete =
      tileIds.length > 0 &&
      tileIds.length === group.cells.length &&
      tileIds.every((tileId) => {
        const tile = tileById(next, tileId);
        return Boolean(tile) && tile?.groupId === group.groupId && !claimedTileIds.has(tileId);
      });

    if (!complete) {
      const ownedTileIds = unique([
        ...tileIds,
        ...group.cells
          .map((cell) => tileAt(next, cell.row, cell.col)?.id)
          .filter((tileId): tileId is string => Boolean(tileId))
      ]);
      for (const tileId of ownedTileIds) {
        const tile = tileById(next, tileId);
        if (tile?.groupId === group.groupId) {
          delete tile.groupId;
        }
      }
      continue;
    }

    tileIds.forEach((tileId) => claimedTileIds.add(tileId));
    survivingGroups.push({
      ...group,
      tileIds: [...tileIds],
      cells: tileIds.map((tileId) => {
        const tile = tileById(next, tileId) as AuroraAreaEditableTile;
        return { row: tile.row, col: tile.col };
      })
    });
  }

  next.groupInstances = survivingGroups;
  return next;
}

function groupTileIds(
  state: AuroraAreaEditingState,
  group: AuroraAreaGroupInstance
): string[] {
  const rawTileIds = (group as AuroraAreaGroupInstance & { tileIds?: unknown }).tileIds;
  if (Array.isArray(rawTileIds)) {
    return unique(rawTileIds.filter((tileId): tileId is string => typeof tileId === "string"));
  }
  return unique(
    group.cells
      .map((cell) => tileAt(state, cell.row, cell.col)?.id)
      .filter((tileId): tileId is string => Boolean(tileId))
  );
}

function isGroupedTile(state: AuroraAreaEditingState, tile: AuroraAreaEditableTile): boolean {
  return state.groupInstances.some((group) => groupTileIds(state, group).includes(tile.id));
}

function sameGroupInstance(
  left: AuroraAreaGroupInstance,
  right: AuroraAreaGroupInstance
): boolean {
  return (
    left.groupId === right.groupId &&
    left.tileIds.length === right.tileIds.length &&
    left.tileIds.every((tileId, index) => tileId === right.tileIds[index])
  );
}

function resolveUniqueTopologyDefaultTile(
  definition: AuroraAreaTilesetDefinition
): { tile: AuroraAreaTilesetTile; orientation: 0 | 1 | 2 | 3 } | null {
  const defaultTerrain = definition.defaultTerrain ?? definition.defaults?.defaultTerrain;
  if (!defaultTerrain) {
    return null;
  }
  const matches: Array<{ tile: AuroraAreaTilesetTile; orientation: 0 | 1 | 2 | 3 }> = [];
  for (const tile of definition.tiles) {
    if (tile.groupId) continue;
    const orientation = ([0, 1, 2, 3] as const).find((candidate) => {
      const signature = orientTile(tile, candidate);
      return (
        AURORA_AREA_CORNERS.every(
          (corner) =>
            signature.terrain[corner] === defaultTerrain &&
            signature.cornerHeights[corner] === 0
        ) && AURORA_AREA_EDGES.every((edge) => signature.crossers[edge] === null)
      );
    });
    if (orientation !== undefined) matches.push({ tile, orientation });
  }
  return matches.length === 1 ? matches[0] : null;
}

function doesEveryTileMatchRebuiltTopology(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition
): boolean {
  return state.tiles.every((tile) => {
    const tileDefinition = definition.tiles.find((candidate) => candidate.tileId === tile.tileId);
    if (!tileDefinition) return false;
    const expected = orientTile(tileDefinition, tile.orientation);
    const actual = readCellSignature(state.topology, tile.row, tile.col);
    const absoluteBaseHeight = Math.min(
      ...Object.values(readCellHeights(state.topology, tile.row, tile.col))
    );
    return absoluteBaseHeight === tile.height && signaturesMatch(expected, actual);
  });
}

function rebuildTopology(state: AuroraAreaEditingState, definition: AuroraAreaTilesetDefinition): void {
  state.topology = createDefaultTopology(state.width, state.height, resolveTilesetDefaultTerrain(definition));
  for (const tile of state.tiles) {
    const tileDefinition = definition.tiles.find((candidate) => candidate.tileId === tile.tileId);
    if (tileDefinition) {
      writeTileTopology(state.topology, tile, tileDefinition);
    }
  }
}

function writeCellTerrain(topology: AuroraAreaTopology, row: number, col: number, terrain: string): void {
  for (const corner of AURORA_AREA_CORNERS) {
    const point = tokenCornerPoint(row, col, corner);
    setToken(topology, point.row, point.col, terrain);
  }
}

function propagateTerrainTransitions(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  pendingTerrain: Map<string, string>
): void {
  const initialCells = new Map<string, { terrain: string | null; height: number }>();
  for (let row = 0; row < state.height; row += 1) {
    for (let col = 0; col < state.width; col += 1) {
      initialCells.set(cellKey({ row, col }), {
        terrain: uniformCellTerrain(state.topology, row, col),
        height: Math.min(...Object.values(readCellHeights(state.topology, row, col)))
      });
    }
  }

  const pendingHeight = new Map<string, number>();
  const queue = [...pendingTerrain.keys()];
  const processed = new Set<string>();
  for (let index = 0; index < queue.length; index += 1) {
    const key = queue[index];
    const cell = cellFromKey(key);
    const terrain = pendingTerrain.get(key);
    if (!cell || terrain === undefined) {
      continue;
    }
    const height = pendingHeight.get(key) ?? initialCells.get(key)?.height ?? 0;
    const stateKey = `${key}\u0000${terrain}\u0000${height}`;
    if (processed.has(stateKey)) {
      continue;
    }
    processed.add(stateKey);
    writeCellTerrain(state.topology, cell.row, cell.col, terrain);
    if (pendingHeight.has(key)) {
      writeCellHeight(state.topology, cell.row, cell.col, height);
    }

    for (const adjacent of adjacentCells(state, cell)) {
      const adjacentKey = cellKey(adjacent);
      const adjacentTile = tileAt(state, adjacent.row, adjacent.col);
      if (adjacentTile && isGroupedTile(state, adjacentTile)) {
        continue;
      }
      const adjacentTerrain = pendingTerrain.get(adjacentKey) ?? initialCells.get(adjacentKey)?.terrain;
      if (!adjacentTerrain) {
        continue;
      }
      const adjacentHeight = pendingHeight.get(adjacentKey) ?? initialCells.get(adjacentKey)?.height ?? 0;
      const transition = resolvePrimaryTransition(
        definition.transitionRules,
        terrain,
        height,
        adjacentTerrain,
        adjacentHeight
      );
      if (!transition) {
        continue;
      }
      if (
        pendingTerrain.get(adjacentKey) === transition.changedTerrain &&
        (pendingHeight.get(adjacentKey) ?? adjacentHeight) === transition.changedHeight
      ) {
        continue;
      }
      pendingTerrain.set(adjacentKey, transition.changedTerrain);
      pendingHeight.set(adjacentKey, transition.changedHeight);
      queue.push(adjacentKey);
    }
  }
}

function uniformCellTerrain(topology: AuroraAreaTopology, row: number, col: number): string | null {
  const terrains = AURORA_AREA_CORNERS.map((corner) => {
    const point = tokenCornerPoint(row, col, corner);
    return getToken(topology, point.row, point.col);
  });
  const terrain = terrains[0];
  return terrain && terrains.every((candidate) => candidate === terrain) ? terrain : null;
}

function writeCellHeight(topology: AuroraAreaTopology, row: number, col: number, height: number): void {
  for (const corner of AURORA_AREA_CORNERS) {
    const point = heightCornerPoint(row, col, corner);
    setHeight(topology, point.row, point.col, height);
  }
}

function writeTileTopology(
  topology: AuroraAreaTopology,
  tile: AuroraAreaEditableTile,
  definition: AuroraAreaTilesetTile
): void {
  const signature = orientTile(definition, tile.orientation);
  for (const corner of AURORA_AREA_CORNERS) {
    const tokenPoint = tokenCornerPoint(tile.row, tile.col, corner);
    const heightPoint = heightCornerPoint(tile.row, tile.col, corner);
    setToken(topology, tokenPoint.row, tokenPoint.col, signature.terrain[corner]);
    setHeight(topology, heightPoint.row, heightPoint.col, tile.height + signature.cornerHeights[corner]);
  }
  for (const edge of AURORA_AREA_EDGES) {
    const point = edgePoint(tile.row, tile.col, edge);
    setToken(topology, point.row, point.col, signature.crossers[edge]);
  }
}

function readCellSignature(topology: AuroraAreaTopology, row: number, col: number): AuroraAreaTileSignature {
  const heights = readCellHeights(topology, row, col);
  const baseHeight = Math.min(...Object.values(heights));
  const terrain = {} as Record<AuroraAreaCorner, string | null>;
  const crossers = {} as Record<AuroraAreaEdge, string | null>;
  const cornerHeights = {} as Record<AuroraAreaCorner, number>;
  for (const corner of AURORA_AREA_CORNERS) {
    const point = tokenCornerPoint(row, col, corner);
    terrain[corner] = getToken(topology, point.row, point.col);
    cornerHeights[corner] = heights[corner] - baseHeight;
  }
  for (const edge of AURORA_AREA_EDGES) {
    const point = edgePoint(row, col, edge);
    crossers[edge] = getToken(topology, point.row, point.col);
  }
  return { terrain, crossers, cornerHeights };
}

function readCellHeights(topology: AuroraAreaTopology, row: number, col: number): Record<AuroraAreaCorner, number> {
  return Object.fromEntries(
    AURORA_AREA_CORNERS.map((corner) => {
      const point = heightCornerPoint(row, col, corner);
      return [corner, getHeight(topology, point.row, point.col)];
    })
  ) as Record<AuroraAreaCorner, number>;
}

function rotateGroupCells(
  group: AuroraAreaTilesetGroup,
  anchor: AuroraAreaCell,
  orientation: 0 | 1 | 2 | 3
): AuroraAreaCell[] {
  return group.tileIds.map((_tileId, index) => {
    const sourceRow = Math.floor(index / group.columns);
    const sourceCol = index % group.columns;
    const rotated = rotateCell(sourceRow, sourceCol, group.columns, group.rows, orientation);
    return { row: anchor.row + rotated.row, col: anchor.col + rotated.col };
  });
}

/**
 * A group anchor is the origin of its orientation-specific member offsets,
 * not a member cell that can be transformed independently. Recovering it
 * from every ordered member keeps the SET member order as the invariant and
 * fails closed when a malformed instance cannot be reconstructed exactly.
 */
function resolveGroupAnchorFromOrderedCells(
  group: AuroraAreaTilesetGroup,
  cells: readonly AuroraAreaCell[],
  orientation: 0 | 1 | 2 | 3
): AuroraAreaCell | null {
  if (cells.length !== group.tileIds.length || cells.length === 0) {
    return null;
  }
  const offsets = rotateGroupCells(group, { row: 0, col: 0 }, orientation);
  const anchor = {
    row: cells[0].row - offsets[0].row,
    col: cells[0].col - offsets[0].col
  };
  return cells.every(
    (cell, index) =>
      cell.row === anchor.row + offsets[index].row &&
      cell.col === anchor.col + offsets[index].col
  )
    ? anchor
    : null;
}

function rotateCell(
  row: number,
  col: number,
  width: number,
  height: number,
  turns: 0 | 1 | 2 | 3
): AuroraAreaCell {
  if (turns === 0) {
    return { row, col };
  }
  if (turns === 1) {
    return { row: col, col: height - 1 - row };
  }
  if (turns === 2) {
    return { row: height - 1 - row, col: width - 1 - col };
  }
  return { row: width - 1 - col, col: row };
}

function tokenCornerPoint(row: number, col: number, corner: AuroraAreaCorner): AuroraAreaCell {
  const point = heightCornerPoint(row, col, corner);
  return { row: point.row * 2, col: point.col * 2 };
}

function heightCornerPoint(row: number, col: number, corner: AuroraAreaCorner): AuroraAreaCell {
  if (corner === "topLeft") return { row, col };
  if (corner === "topRight") return { row, col: col + 1 };
  if (corner === "bottomRight") return { row: row + 1, col: col + 1 };
  return { row: row + 1, col };
}

function edgePoint(row: number, col: number, edge: AuroraAreaEdge): AuroraAreaCell {
  if (edge === "top") return { row: row * 2, col: col * 2 + 1 };
  if (edge === "right") return { row: row * 2 + 1, col: col * 2 + 2 };
  if (edge === "bottom") return { row: row * 2 + 2, col: col * 2 + 1 };
  return { row: row * 2 + 1, col: col * 2 };
}

function cellsSharingEdge(
  state: AuroraAreaEditingState,
  target: AuroraAreaCrosserTarget
): AuroraAreaCell[] {
  const adjacent = target.edge === "top"
    ? { row: target.row - 1, col: target.col }
    : target.edge === "right"
      ? { row: target.row, col: target.col + 1 }
      : target.edge === "bottom"
        ? { row: target.row + 1, col: target.col }
        : { row: target.row, col: target.col - 1 };
  return [
    { row: target.row, col: target.col },
    ...(hasCell(state, adjacent.row, adjacent.col) ? [adjacent] : [])
  ];
}

function setToken(topology: AuroraAreaTopology, row: number, col: number, value: string | null): void {
  topology.tokens[row * topology.tokenWidth + col] = value;
}

function getToken(topology: AuroraAreaTopology, row: number, col: number): string | null {
  return topology.tokens[row * topology.tokenWidth + col] ?? null;
}

function setHeight(topology: AuroraAreaTopology, row: number, col: number, value: number): void {
  topology.heights[row * topology.cornerWidth + col] = value;
}

function getHeight(topology: AuroraAreaTopology, row: number, col: number): number {
  return topology.heights[row * topology.cornerWidth + col] ?? 0;
}

function replaceTile(state: AuroraAreaEditingState, tile: AuroraAreaEditableTile): void {
  const index = state.tiles.findIndex((candidate) => candidate.row === tile.row && candidate.col === tile.col);
  if (index >= 0) state.tiles[index] = tile;
  else state.tiles.push(tile);
}

function copyTileSourceProvenance(
  tile: Pick<AuroraAreaEditableTile, "sourceRow" | "sourceCol">
): Pick<AuroraAreaEditableTile, "sourceRow" | "sourceCol"> {
  return tile.sourceRow !== undefined && tile.sourceCol !== undefined
    ? { sourceRow: tile.sourceRow, sourceCol: tile.sourceCol }
    : {};
}

function tileAt(state: AuroraAreaEditingState, row: number, col: number): AuroraAreaEditableTile | undefined {
  return state.tiles.find((tile) => tile.row === row && tile.col === col);
}

function tileById(state: AuroraAreaEditingState, tileId: string): AuroraAreaEditableTile | undefined {
  return state.tiles.find((tile) => tile.id === tileId);
}

function cellKey(cell: AuroraAreaCell): string {
  return `${cell.row}:${cell.col}`;
}

function cellFromKey(key: string): AuroraAreaCell | undefined {
  const [row, col] = key.split(":").map(Number);
  return Number.isInteger(row) && Number.isInteger(col) ? { row, col } : undefined;
}

function adjacentCells(state: AuroraAreaEditingState, cell: AuroraAreaCell): AuroraAreaCell[] {
  return [
    { row: cell.row - 1, col: cell.col },
    { row: cell.row, col: cell.col + 1 },
    { row: cell.row + 1, col: cell.col },
    { row: cell.row, col: cell.col - 1 }
  ].filter((candidate) => hasCell(state, candidate.row, candidate.col));
}

function hasCell(state: Pick<AuroraAreaEditingState, "width" | "height">, row: number, col: number): boolean {
  return row >= 0 && col >= 0 && row < state.height && col < state.width;
}

function withinAreaLimits(width: number, height: number): boolean {
  return Number.isInteger(width) && Number.isInteger(height) && width >= 2 && height >= 2 && width <= 32 && height <= 32;
}

function selectCandidate(count: number, selector: AuroraAreaCandidateSelector | undefined): number {
  const value = selector ? selector(count) : Math.floor(Math.random() * count);
  return Math.min(count - 1, Math.max(0, Math.floor(value)));
}

function normalizeOrientation(value: number): 0 | 1 | 2 | 3 {
  return ((((value % 4) + 4) % 4) as 0 | 1 | 2 | 3);
}

function makeTileId(row: number, col: number, tileId: number): string {
  return `area-tile:${row}:${col}:${tileId}`;
}

function copyTileRuntimeFields(tile: AuroraAreaTilesetTile): Omit<AuroraAreaEditableTile, "id" | "row" | "col" | "tileId" | "orientation" | "height" | "groupId"> {
  return {
    ...(tile.mainLight1 === undefined ? {} : { mainLight1: tile.mainLight1 }),
    ...(tile.mainLight2 === undefined ? {} : { mainLight2: tile.mainLight2 }),
    ...(tile.sourceLight1 === undefined ? {} : { sourceLight1: tile.sourceLight1 }),
    ...(tile.sourceLight2 === undefined ? {} : { sourceLight2: tile.sourceLight2 }),
    ...(tile.animLoop1 === undefined ? {} : { animLoop1: tile.animLoop1 }),
    ...(tile.animLoop2 === undefined ? {} : { animLoop2: tile.animLoop2 }),
    ...(tile.animLoop3 === undefined ? {} : { animLoop3: tile.animLoop3 })
  };
}

function copyEditableTileRuntimeFields(
  tile: AuroraAreaEditableTile
): Omit<AuroraAreaEditableTile, "id" | "row" | "col" | "sourceRow" | "sourceCol" | "tileId" | "orientation" | "height" | "groupId"> {
  return {
    ...(tile.mainLight1 === undefined ? {} : { mainLight1: tile.mainLight1 }),
    ...(tile.mainLight2 === undefined ? {} : { mainLight2: tile.mainLight2 }),
    ...(tile.sourceLight1 === undefined ? {} : { sourceLight1: tile.sourceLight1 }),
    ...(tile.sourceLight2 === undefined ? {} : { sourceLight2: tile.sourceLight2 }),
    ...(tile.animLoop1 === undefined ? {} : { animLoop1: tile.animLoop1 }),
    ...(tile.animLoop2 === undefined ? {} : { animLoop2: tile.animLoop2 }),
    ...(tile.animLoop3 === undefined ? {} : { animLoop3: tile.animLoop3 })
  };
}

function success(state: AuroraAreaEditingState, changedTileIds: string[]): AuroraAreaCommandSuccess {
  return { ok: true, state, changedTileIds: unique(changedTileIds) };
}

function failure(code: AuroraAreaCommandFailure["code"], message: string): AuroraAreaCommandFailure {
  return { ok: false, code, message };
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values)];
}
