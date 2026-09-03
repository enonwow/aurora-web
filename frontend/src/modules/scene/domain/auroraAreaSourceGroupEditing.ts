import {
  copyAuroraAreaTilesToClipboard,
  cutAuroraAreaTilesToClipboard,
  placeAuroraAreaGroup,
  resolveAuroraAreaGroupInstanceAtCell,
  type AuroraAreaCell,
  type AuroraAreaClipboardCutResult,
  type AuroraAreaCommandResult,
  type AuroraAreaEditingState,
  type AuroraAreaTilesetDefinition
} from "./auroraAreaEditing";
import {
  eraseAuroraAreaConservatively,
  type ConservativeAuroraAreaEraserOptions
} from "./auroraAreaEraser";

/** Removes a reconstructed source group through the recovered Eraser closure. */
export function removeSourceAuroraAreaGroupConservatively(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  options: ConservativeAuroraAreaEraserOptions = {}
): AuroraAreaCommandResult {
  const group = resolveAuroraAreaGroupInstanceAtCell(state, cell);
  if (!group) {
    return { ok: false, code: "GROUP_UNKNOWN", message: "The selected tile does not belong to a placed group." };
  }
  if (group.underlay) {
    return {
      ok: false,
      code: "GROUP_LOCKED",
      message: "Editor-backed groups must be removed through their exact captured underlay."
    };
  }
  return eraseAuroraAreaConservatively(state, definition, cell, options);
}

/** Erases a source group to a unique loose topology, then places its rotated footprint atomically. */
export function rotateSourceAuroraAreaGroupConservatively(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cell: AuroraAreaCell,
  delta: -1 | 1,
  options: ConservativeAuroraAreaEraserOptions = {}
): AuroraAreaCommandResult {
  const group = resolveAuroraAreaGroupInstanceAtCell(state, cell);
  if (!group) {
    return { ok: false, code: "GROUP_UNKNOWN", message: "The selected tile does not belong to a placed group." };
  }
  if (group.underlay) {
    return {
      ok: false,
      code: "GROUP_LOCKED",
      message: "Editor-backed groups must be rotated through their exact captured underlay."
    };
  }
  const erased = eraseAuroraAreaConservatively(state, definition, cell, options);
  if (!erased.ok) return erased;
  const placed = placeAuroraAreaGroup(
    erased.state,
    definition,
    group.groupId,
    { row: group.anchorRow, col: group.anchorCol },
    normalizeOrientation(group.orientation + delta)
  );
  return placed.ok
    ? {
        ok: true,
        // The recovered source-group path consumes its exact candidate draw in
        // the Eraser closure. Group placement itself must not advance that
        // seed again while rebuilding the already-selected loose underlay.
        state: { ...placed.state, randomSeed: erased.state.randomSeed },
        changedTileIds: [...new Set([...erased.changedTileIds, ...placed.changedTileIds])]
      }
    : placed;
}

/**
 * Native-grounded Cut fallback for selections containing source-backed groups.
 * Source groups use the recovered mode-4 Eraser; remaining editor groups/loose
 * tiles retain the existing exact-underlay/default-topology Cut path.
 */
export function cutAuroraAreaTilesWithSourceGroups(
  state: AuroraAreaEditingState,
  definition: AuroraAreaTilesetDefinition,
  cells: readonly AuroraAreaCell[],
  options: ConservativeAuroraAreaEraserOptions = {}
): AuroraAreaClipboardCutResult {
  const copied = copyAuroraAreaTilesToClipboard(state, cells);
  if (!copied.ok) return copied;

  const sourceGroups = new Map<string, NonNullable<ReturnType<typeof resolveAuroraAreaGroupInstanceAtCell>>>();
  for (const cell of cells) {
    const group = resolveAuroraAreaGroupInstanceAtCell(state, cell);
    if (group && !group.underlay) sourceGroups.set(groupKey(group), group);
  }
  if (sourceGroups.size === 0) {
    return cutAuroraAreaTilesToClipboard(state, definition, cells);
  }

  const sourceGroupCells = new Set(
    [...sourceGroups.values()].flatMap((group) => group.cells.map(cellKey))
  );
  let working = state;
  let randomSeed = options.randomSeed;
  const changedTileIds: string[] = [];
  for (const group of sourceGroups.values()) {
    const survivingMember = group.cells.find((member) =>
      Boolean(resolveAuroraAreaGroupInstanceAtCell(working, member))
    );
    if (!survivingMember) continue;
    const erased = eraseAuroraAreaConservatively(
      working,
      definition,
      survivingMember,
      randomSeed === undefined ? {} : { randomSeed }
    );
    if (!erased.ok) return erased;
    working = erased.state;
    randomSeed = erased.randomSeedAfter;
    changedTileIds.push(...erased.changedTileIds);
  }

  const remainingCells = cells.filter((cell) => !sourceGroupCells.has(cellKey(cell)));
  if (remainingCells.length > 0) {
    const remainingCut = cutAuroraAreaTilesToClipboard(working, definition, remainingCells);
    if (!remainingCut.ok) return remainingCut;
    working = remainingCut.state;
    changedTileIds.push(...remainingCut.changedTileIds);
  }
  return {
    ok: true,
    state: working,
    changedTileIds: [...new Set(changedTileIds)],
    payload: copied.payload
  };
}

function normalizeOrientation(value: number): 0 | 1 | 2 | 3 {
  return (((value % 4) + 4) % 4) as 0 | 1 | 2 | 3;
}

function groupKey(group: { groupId: string; anchorRow: number; anchorCol: number; orientation: number }): string {
  return `${group.groupId}:${group.anchorRow}:${group.anchorCol}:${group.orientation}`;
}

function cellKey(cell: AuroraAreaCell): string {
  return `${cell.row}:${cell.col}`;
}
