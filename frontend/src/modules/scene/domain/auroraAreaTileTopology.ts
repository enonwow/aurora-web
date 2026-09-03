import type {
  AuroraAreaEditableTile,
  AuroraAreaEditingState,
} from "./auroraAreaEditing";

/**
 * Returns the exact post-command tiles whose topology identity changed.
 * Per-tile visual properties do not participate in topology admission.
 */
export function collectChangedAuroraAreaTopologyTiles(
  before: AuroraAreaEditingState,
  after: AuroraAreaEditingState,
): AuroraAreaEditableTile[] {
  const beforeByCell = new Map(
    before.tiles.map((tile) => [`${tile.row}:${tile.col}`, tile]),
  );
  return after.tiles.filter((tile) => {
    const previous = beforeByCell.get(`${tile.row}:${tile.col}`);
    return !previous ||
      previous.tileId !== tile.tileId ||
      previous.orientation !== tile.orientation ||
      previous.height !== tile.height ||
      previous.groupId !== tile.groupId;
  });
}

export function collectChangedAuroraAreaTileDefinitionIds(
  before: AuroraAreaEditingState,
  after: AuroraAreaEditingState,
): number[] {
  return [...new Set(
    collectChangedAuroraAreaTopologyTiles(before, after).map(
      (tile) => tile.tileId,
    ),
  )].sort((left, right) => left - right);
}
