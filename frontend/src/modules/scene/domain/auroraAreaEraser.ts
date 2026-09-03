import {
  AURORA_AREA_CORNERS,
  AURORA_AREA_EDGES,
  type AuroraAreaCell,
  type AuroraAreaCorner,
  type AuroraAreaEdge,
  type AuroraAreaCommandFailure,
  type AuroraAreaCommandSuccess,
  type AuroraAreaEditableTile,
  type AuroraAreaEditingState,
  type AuroraAreaGroupInstance,
  type AuroraAreaTilesetDefinition,
  type AuroraAreaTilesetTile,
  type AuroraAreaTopology
} from "./auroraAreaEditing";
export { drawAuroraNativeRandom } from "./auroraAreaRandom";
import { drawAuroraNativeRandom } from "./auroraAreaRandom";

export interface ConservativeAuroraAreaEraserPlan {
  topology: AuroraAreaTopology;
  affectedCells: AuroraAreaCell[];
  removedGroups: AuroraAreaGroupInstance[];
  replacements: Array<{
    beforeTileId: string;
    tile: AuroraAreaEditableTile;
  }>;
  /** Native Delphi RNG state, present only when the caller supplied its seed. */
  randomSeedBefore?: number;
  randomSeedAfter?: number;
  randomDrawCount: number;
}

export interface ConservativeAuroraAreaEraserOptions {
  /**
   * State used by Aurora's runtime RNG before this Eraser command.
   * Overrides the editor-local seed when supplied (primarily for oracle tests).
   */
  randomSeed?: number;
}

export type ConservativeAuroraAreaEraserResult =
  | { ok: true; plan: ConservativeAuroraAreaEraserPlan }
  | {
      ok: false;
      code: "AMBIGUOUS_ERASER" | "TILE_UNKNOWN";
      message: string;
    };

export type AuroraAreaEraserCommandResult =
  | AuroraAreaCommandFailure
  | (AuroraAreaCommandSuccess & { randomSeedAfter?: number });

interface TileCandidate {
  tile: AuroraAreaTilesetTile;
  orientation: 0 | 1 | 2 | 3;
}

interface TileSignature {
  terrain: Record<AuroraAreaCorner, string | null>;
  crossers: Record<AuroraAreaEdge, string | null>;
  cornerHeights: Record<AuroraAreaCorner, number>;
}

interface NativeEraserDirectionCase {
  edge: AuroraAreaEdge;
  /** The two neighbour edges relaxed by mode 4 after the first rule miss. */
  relaxationEdges: readonly [AuroraAreaEdge, AuroraAreaEdge];
  /** Matching diagonal cells, in native enqueue order. */
  diagonalOffsets: readonly [AuroraAreaCell, AuroraAreaCell];
}

/**
 * `FUN_0067f760` handles the four incident edges in this exact order.  For a
 * failed neighbour signature it then relaxes the two perpendicular edges and
 * queues the corresponding diagonals before retrying `FUN_005e7ac8`.
 */
const NATIVE_ERASER_DIRECTION_CASES: readonly NativeEraserDirectionCase[] = [
  {
    edge: "left",
    relaxationEdges: ["bottom", "top"],
    diagonalOffsets: [{ row: 1, col: -1 }, { row: -1, col: -1 }]
  },
  {
    edge: "right",
    relaxationEdges: ["bottom", "top"],
    diagonalOffsets: [{ row: 1, col: 1 }, { row: -1, col: 1 }]
  },
  {
    edge: "top",
    relaxationEdges: ["left", "right"],
    diagonalOffsets: [{ row: -1, col: -1 }, { row: -1, col: 1 }]
  },
  {
    edge: "bottom",
    relaxationEdges: ["left", "right"],
    diagonalOffsets: [{ row: 1, col: -1 }, { row: 1, col: 1 }]
  }
] as const;

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

/**
 * Recovered Aurora mode-4 Eraser contract.
 *
 * The recovered native path clears incident half-grid edge tokens, expands SET
 * groups atomically and retiles the resulting closure.
 *
 * Exact recovered candidate invariants:
 * - `FUN_005e33e8`, decompiled_all.c:281371-281479 walks SET tiles in source
 *   order, excludes group members (`tile+0xc4 != 0`), then appends matching
 *   orientations in numeric order 0,1,2,3.
 * - `FUN_005e7ac8`, decompiled_all.c:283363-283411 validates the same 12-short
 *   terrain/crosser/relative-height signature under four rotations.
 * - `FUN_005e38e4`, decompiled_all.c:281559-281570 draws once and selects
 *   `random % candidateCount` from the parallel tile/orientation arrays.
 * - `FUN_00b90fe8`, decompiled_all.c:1061777-1061788 advances the unsigned
 *   32-bit state with `seed * 0x015a4e35 + 1` and returns bits 16..30.
 * - `FUN_00660bf8` plus `FUN_0066178c`, decompiled_all.c:350987-351015 and
 *   351476-351489, sort changed cell centers and consume candidates row-major.
 * - `FUN_0068045c`, decompiled_all.c:368798-368843, propagates a valid touched
 *   group member to every valid member and queues invalid members for closure.
 * - `FUN_00712100` initializes object bytes +0x40..+0x46 from the selected SET
 *   tile; the ARE serializer at 255946-255952 writes those seven bytes as the
 *   two main lights, two source lights and three animation loops.
 *
 * The planner therefore resolves multi-candidate cells exactly when the
 * editor state supplies a seed. Legacy states without one still fail closed on
 * ambiguity; the planner never substitutes a default or lowest-ID tile.
 */
export function createConservativeAuroraAreaEraserPlan(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  selectedCell: AuroraAreaCell,
  options: ConservativeAuroraAreaEraserOptions = {}
): ConservativeAuroraAreaEraserResult {
  const selectedTile = tileAt(state, selectedCell);
  if (!selectedTile) {
    return {
      ok: false,
      code: "TILE_UNKNOWN",
      message: `No Area tile exists at (${selectedCell.row},${selectedCell.col}).`
    };
  }

  const topology = cloneTopology(state.topology);
  const queue: AuroraAreaCell[] = [];
  const pendingCells = new Set<string>();
  const processedCells = new Set<string>();
  const affectedCells = new Set<string>();
  const orderedAffectedCells: AuroraAreaCell[] = [];
  const removedGroupIndexes = new Set<number>();
  const seedCandidate = options.randomSeed ?? state.randomSeed;
  const randomSeedBefore = seedCandidate === undefined ? undefined : seedCandidate >>> 0;
  let randomSeed = randomSeedBefore;
  let randomDrawCount = 0;

  enqueueCellOrGroup(
    state,
    selectedCell,
    queue,
    pendingCells,
    processedCells,
    removedGroupIndexes
  );

  while (queue.length > 0) {
    const cell = queue.shift() as AuroraAreaCell;
    const key = cellKey(cell);
    pendingCells.delete(key);
    if (processedCells.has(key) || !hasCell(state, cell)) continue;
    processedCells.add(key);

    const groupIndex = groupIndexAtCell(state, cell);
    if (groupIndex >= 0) {
      removedGroupIndexes.add(groupIndex);
      for (const member of state.groupInstances[groupIndex].cells) {
        enqueueCellOrGroup(
          state,
          member,
          queue,
          pendingCells,
          processedCells,
          removedGroupIndexes
        );
      }
    }

    addAffectedCell(cell, affectedCells, orderedAffectedCells);

    for (const direction of NATIVE_ERASER_DIRECTION_CASES) {
      const point = edgePoint(cell, direction.edge);
      // Native mode 4 skips an already-relaxed (-1) incident edge entirely.
      if (getToken(topology, point) === null) continue;
      setToken(topology, point, null);
      const neighbour = adjacentCell(cell, direction.edge);
      if (!hasCell(state, neighbour)) continue;
      addAffectedCell(neighbour, affectedCells, orderedAffectedCells);

      if (findLooseCandidates(topology, definition, neighbour).length > 0) {
        propagateValidAdjacentGroup(
          state,
          definition,
          topology,
          neighbour,
          queue,
          pendingCells,
          processedCells,
          affectedCells,
          orderedAffectedCells,
          removedGroupIndexes
        );
        continue;
      }

      // First miss: conditionally relax the neighbour's perpendicular outer
      // edges and enqueue bottom/top or left/right diagonals in native order.
      for (let index = 0; index < direction.relaxationEdges.length; index += 1) {
        const relaxationPoint = edgePoint(neighbour, direction.relaxationEdges[index]);
        if (getToken(topology, relaxationPoint) === null) continue;
        setToken(topology, relaxationPoint, null);
        const offset = direction.diagonalOffsets[index];
        enqueueCellOrGroup(
          state,
          { row: cell.row + offset.row, col: cell.col + offset.col },
          queue,
          pendingCells,
          processedCells,
          removedGroupIndexes
        );
      }

      // Second miss: the shared edge has already been relaxed; the neighbour
      // itself now joins the closure. A successful retry is retained for the
      // later native-order retile pass without expanding the closure further.
      if (findLooseCandidates(topology, definition, neighbour).length === 0) {
        enqueueCellOrGroup(
          state,
          neighbour,
          queue,
          pendingCells,
          processedCells,
          removedGroupIndexes
        );
      } else {
        propagateValidAdjacentGroup(
          state,
          definition,
          topology,
          neighbour,
          queue,
          pendingCells,
          processedCells,
          affectedCells,
          orderedAffectedCells,
          removedGroupIndexes
        );
      }
    }
  }

  const replacements: ConservativeAuroraAreaEraserPlan["replacements"] = [];
  // `FUN_00660bf8` inserts half-grid center indices into 0x63c in ascending
  // order; `FUN_0066178c` consumes that exact list for candidate RNG draws.
  // Center-index ordering is Area row-major ordering.
  orderedAffectedCells.sort((left, right) => left.row - right.row || left.col - right.col);

  for (const cell of orderedAffectedCells) {
    const current = tileAt(state, cell);
    if (!current) {
      return ambiguous(`The Eraser closure lost tile (${cell.row},${cell.col}).`);
    }
    const candidates = findLooseCandidates(topology, definition, cell);
    if (candidates.length === 0) {
      return ambiguous(
        `Eraser has no exact loose SET candidate at (${cell.row},${cell.col}).`
      );
    }
    if (candidates.length > 1 && randomSeed === undefined) {
      return ambiguous(
        `Eraser found ${candidates.length} exact SET candidates at (${cell.row},${cell.col}), but the native RNG seed is unavailable.`
      );
    }

    let selectedIndex = 0;
    if (randomSeed !== undefined) {
      const draw = drawAuroraNativeRandom(randomSeed);
      randomSeed = draw.seed;
      randomDrawCount += 1;
      selectedIndex = draw.value % candidates.length;
    }
    const selected = candidates[selectedIndex];
    const replacement: AuroraAreaEditableTile = {
      ...current,
      id: makeTileId(cell, selected.tile.tileId),
      tileId: selected.tile.tileId,
      orientation: selected.orientation,
      height: minimumCellHeight(topology, cell),
      mainLight1: selected.tile.mainLight1 ?? 0,
      mainLight2: selected.tile.mainLight2 ?? 0,
      sourceLight1: selected.tile.sourceLight1 ?? 0,
      sourceLight2: selected.tile.sourceLight2 ?? 0,
      animLoop1: selected.tile.animLoop1 ?? 0,
      animLoop2: selected.tile.animLoop2 ?? 0,
      animLoop3: selected.tile.animLoop3 ?? 0
    };
    delete replacement.groupId;
    replacements.push({ beforeTileId: current.id, tile: replacement });
  }

  // Native `FUN_0066178c` validates/retiles only the sorted changed-center list
  // (0x63c). Pre-existing shared-corner inconsistencies outside that list must
  // not make an otherwise local Eraser command fail atomically.
  for (const { tile: effective } of replacements) {
    const definitionTile = definition.tiles.find((tile) => tile.tileId === effective.tileId);
    if (!definitionTile) {
      return ambiguous(`Tile_ID ${effective.tileId} is missing from the selected SET.`);
    }
    if (!signaturesMatch(readCellSignature(topology, effective), orientTile(definitionTile, effective.orientation))) {
      return ambiguous(
        `The Eraser plan is not topology-safe at (${effective.row},${effective.col}).`
      );
    }
  }

  return {
    ok: true,
    plan: {
      topology,
      affectedCells: orderedAffectedCells,
      removedGroups: [...removedGroupIndexes]
        .sort((left, right) => left - right)
        .map((index) => cloneGroup(state.groupInstances[index])),
      replacements,
      randomDrawCount,
      ...(randomSeedBefore === undefined
        ? {}
        : { randomSeedBefore, randomSeedAfter: randomSeed as number })
    }
  };
}

/** Applies the recovered mode-4 plan atomically; legacy states without RNG state remain fail-closed. */
export function eraseAuroraAreaConservatively(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  selectedCell: AuroraAreaCell,
  options: ConservativeAuroraAreaEraserOptions = {}
): AuroraAreaEraserCommandResult {
  const planned = createConservativeAuroraAreaEraserPlan(state, definition, selectedCell, options);
  if (!planned.ok) {
    return {
      ok: false,
      code: planned.code,
      message: planned.message
    };
  }
  const replacementById = new Map(
    planned.plan.replacements.map((replacement) => [replacement.beforeTileId, replacement.tile])
  );
  const removedGroupKeys = new Set(planned.plan.removedGroups.map(groupKey));
  const next: AuroraAreaEditingState = {
    ...state,
    ...(planned.plan.randomSeedAfter === undefined
      ? {}
      : { randomSeed: planned.plan.randomSeedAfter }),
    topology: cloneTopology(planned.plan.topology),
    tiles: state.tiles.map((tile) => ({ ...(replacementById.get(tile.id) ?? tile) })),
    groupInstances: state.groupInstances
      .filter((group) => !removedGroupKeys.has(groupKey(group)))
      .map(cloneGroup)
  };
  return {
    ok: true,
    state: next,
    changedTileIds: planned.plan.replacements.map((replacement) => replacement.tile.id),
    ...(planned.plan.randomSeedAfter === undefined
      ? {}
      : { randomSeedAfter: planned.plan.randomSeedAfter })
  };
}

function ambiguous(message: string): ConservativeAuroraAreaEraserResult {
  return { ok: false, code: "AMBIGUOUS_ERASER", message };
}

function enqueueCellOrGroup(
  state: AuroraAreaEditingState,
  cell: AuroraAreaCell,
  queue: AuroraAreaCell[],
  pendingCells: Set<string>,
  processedCells: Set<string>,
  removedGroupIndexes: Set<number>
): void {
  if (!hasCell(state, cell)) return;
  const groupIndex = groupIndexAtCell(state, cell);
  if (groupIndex < 0) {
    enqueueUnique(cell, queue, pendingCells, processedCells);
    return;
  }
  removedGroupIndexes.add(groupIndex);
  state.groupInstances[groupIndex].cells.forEach((member) =>
    enqueueUnique(member, queue, pendingCells, processedCells)
  );
}

function enqueueUnique(
  cell: AuroraAreaCell,
  queue: AuroraAreaCell[],
  pendingCells: Set<string>,
  processedCells: Set<string>
): void {
  const key = cellKey(cell);
  if (pendingCells.has(key) || processedCells.has(key)) return;
  pendingCells.add(key);
  queue.push({ ...cell });
}

/** Mirrors the group-member propagation in `FUN_0068045c`. */
function propagateValidAdjacentGroup(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  topology: AuroraAreaTopology,
  neighbour: AuroraAreaCell,
  queue: AuroraAreaCell[],
  pendingCells: Set<string>,
  processedCells: Set<string>,
  affectedCells: Set<string>,
  orderedAffectedCells: AuroraAreaCell[],
  removedGroupIndexes: Set<number>
): void {
  const groupIndex = groupIndexAtCell(state, neighbour);
  if (groupIndex < 0) return;
  removedGroupIndexes.add(groupIndex);
  const group = state.groupInstances[groupIndex];
  for (const member of group.cells) {
    if (cellKey(member) === cellKey(neighbour)) continue;
    if (findLooseCandidates(topology, definition, member).length === 0) {
      enqueueCellOrGroup(
        state,
        member,
        queue,
        pendingCells,
        processedCells,
        removedGroupIndexes
      );
      continue;
    }
    addAffectedCell(member, affectedCells, orderedAffectedCells);
    processedCells.add(cellKey(member));
  }
  processedCells.add(cellKey(neighbour));
}

function addAffectedCell(
  cell: AuroraAreaCell,
  affectedCells: Set<string>,
  orderedAffectedCells: AuroraAreaCell[]
): void {
  const key = cellKey(cell);
  if (affectedCells.has(key)) return;
  affectedCells.add(key);
  orderedAffectedCells.push({ ...cell });
}

function findLooseCandidates(
  topology: AuroraAreaTopology,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell
): TileCandidate[] {
  const signature = readCellSignature(topology, cell);
  const candidates: TileCandidate[] = [];
  for (const tile of definition.tiles) {
    if (tile.groupId) continue;
    for (const orientation of [0, 1, 2, 3] as const) {
      if (signaturesMatch(signature, orientTile(tile, orientation))) {
        candidates.push({ tile, orientation });
      }
    }
  }
  return candidates;
}

function readCellSignature(topology: AuroraAreaTopology, cell: AuroraAreaCell): TileSignature {
  const heights = Object.fromEntries(
    AURORA_AREA_CORNERS.map((corner) => [corner, getHeight(topology, heightCornerPoint(cell, corner))])
  ) as Record<AuroraAreaCorner, number>;
  const baseHeight = Math.min(...Object.values(heights));
  return {
    terrain: Object.fromEntries(
      AURORA_AREA_CORNERS.map((corner) => [corner, getToken(topology, tokenCornerPoint(cell, corner))])
    ) as Record<AuroraAreaCorner, string | null>,
    crossers: Object.fromEntries(
      AURORA_AREA_EDGES.map((edge) => [edge, getToken(topology, edgePoint(cell, edge))])
    ) as Record<AuroraAreaEdge, string | null>,
    cornerHeights: Object.fromEntries(
      AURORA_AREA_CORNERS.map((corner) => [corner, heights[corner] - baseHeight])
    ) as Record<AuroraAreaCorner, number>
  };
}

function orientTile(
  tile: AuroraAreaTilesetTile,
  orientation: 0 | 1 | 2 | 3
): TileSignature {
  return {
    terrain: Object.fromEntries(
      AURORA_AREA_CORNERS.map((corner) => {
        const source = AURORA_AREA_CORNERS[(CORNER_INDEX[corner] - orientation + 4) % 4];
        return [corner, tile.terrain[source] ?? null];
      })
    ) as Record<AuroraAreaCorner, string | null>,
    crossers: Object.fromEntries(
      AURORA_AREA_EDGES.map((edge) => {
        const source = AURORA_AREA_EDGES[(EDGE_INDEX[edge] - orientation + 4) % 4];
        return [edge, tile.crossers[source] ?? null];
      })
    ) as Record<AuroraAreaEdge, string | null>,
    cornerHeights: Object.fromEntries(
      AURORA_AREA_CORNERS.map((corner) => {
        const source = AURORA_AREA_CORNERS[(CORNER_INDEX[corner] - orientation + 4) % 4];
        return [corner, tile.cornerHeights[source] ?? 0];
      })
    ) as Record<AuroraAreaCorner, number>
  };
}

function signaturesMatch(left: TileSignature, right: TileSignature): boolean {
  return (
    AURORA_AREA_CORNERS.every(
      (corner) =>
        left.terrain[corner] === right.terrain[corner] &&
        left.cornerHeights[corner] === right.cornerHeights[corner]
    ) && AURORA_AREA_EDGES.every((edge) => left.crossers[edge] === right.crossers[edge])
  );
}

function groupIndexAtCell(state: AuroraAreaEditingState, cell: AuroraAreaCell): number {
  const tile = tileAt(state, cell);
  return tile
    ? state.groupInstances.findIndex((group) => group.tileIds.includes(tile.id))
    : -1;
}

function tileAt(state: AuroraAreaEditingState, cell: AuroraAreaCell): AuroraAreaEditableTile | undefined {
  return state.tiles.find((tile) => tile.row === cell.row && tile.col === cell.col);
}

function hasCell(state: AuroraAreaEditingState, cell: AuroraAreaCell): boolean {
  return cell.row >= 0 && cell.row < state.height && cell.col >= 0 && cell.col < state.width;
}

function adjacentCell(cell: AuroraAreaCell, edge: AuroraAreaEdge): AuroraAreaCell {
  if (edge === "top") return { row: cell.row - 1, col: cell.col };
  if (edge === "right") return { row: cell.row, col: cell.col + 1 };
  if (edge === "bottom") return { row: cell.row + 1, col: cell.col };
  return { row: cell.row, col: cell.col - 1 };
}

function tokenCornerPoint(cell: AuroraAreaCell, corner: AuroraAreaCorner): AuroraAreaCell {
  const point = heightCornerPoint(cell, corner);
  return { row: point.row * 2, col: point.col * 2 };
}

function heightCornerPoint(cell: AuroraAreaCell, corner: AuroraAreaCorner): AuroraAreaCell {
  if (corner === "topLeft") return { row: cell.row, col: cell.col };
  if (corner === "topRight") return { row: cell.row, col: cell.col + 1 };
  if (corner === "bottomRight") return { row: cell.row + 1, col: cell.col + 1 };
  return { row: cell.row + 1, col: cell.col };
}

function edgePoint(cell: AuroraAreaCell, edge: AuroraAreaEdge): AuroraAreaCell {
  if (edge === "top") return { row: cell.row * 2, col: cell.col * 2 + 1 };
  if (edge === "right") return { row: cell.row * 2 + 1, col: cell.col * 2 + 2 };
  if (edge === "bottom") return { row: cell.row * 2 + 2, col: cell.col * 2 + 1 };
  return { row: cell.row * 2 + 1, col: cell.col * 2 };
}

function minimumCellHeight(topology: AuroraAreaTopology, cell: AuroraAreaCell): number {
  return Math.min(
    ...AURORA_AREA_CORNERS.map((corner) => getHeight(topology, heightCornerPoint(cell, corner)))
  );
}

function getToken(topology: AuroraAreaTopology, point: AuroraAreaCell): string | null {
  return topology.tokens[point.row * topology.tokenWidth + point.col] ?? null;
}

function setToken(topology: AuroraAreaTopology, point: AuroraAreaCell, value: string | null): void {
  topology.tokens[point.row * topology.tokenWidth + point.col] = value;
}

function getHeight(topology: AuroraAreaTopology, point: AuroraAreaCell): number {
  return topology.heights[point.row * topology.cornerWidth + point.col] ?? 0;
}

function cloneTopology(topology: AuroraAreaTopology): AuroraAreaTopology {
  return { ...topology, tokens: [...topology.tokens], heights: [...topology.heights] };
}

function cloneGroup(group: AuroraAreaGroupInstance): AuroraAreaGroupInstance {
  return {
    ...group,
    tileIds: [...group.tileIds],
    cells: group.cells.map((cell) => ({ ...cell })),
    ...(group.underlay
      ? { underlay: { tiles: group.underlay.tiles.map((tile) => ({ ...tile })) } }
      : {})
  };
}

function groupKey(group: AuroraAreaGroupInstance): string {
  return `${group.groupId}:${group.anchorRow}:${group.anchorCol}:${group.orientation}`;
}

function makeTileId(cell: AuroraAreaCell, tileId: number): string {
  return `area-tile:${cell.row}:${cell.col}:${tileId}`;
}

function cellKey(cell: AuroraAreaCell): string {
  return `${cell.row}:${cell.col}`;
}
