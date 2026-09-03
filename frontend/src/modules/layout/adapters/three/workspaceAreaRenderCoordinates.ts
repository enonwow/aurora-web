function normalizeTileOrientation(value: number): number {
  const normalized = Math.trunc(value);
  return ((normalized % 4) + 4) % 4;
}

/**
 * Aurora stores Tile_Height as a level. The Toolset multiplies it by the
 * active SET [GENERAL] Transition value before positioning the tile. The
 * viewport uses the same 0.1 Aurora-unit scale as converted tile geometry.
 * Without an authoritative SET value, preserve the legacy preview offset.
 */
export function resolveAuroraAreaRenderTileHeight(
  tileHeight: number | undefined,
  transitionAuroraUnits: number | undefined,
  auroraUnitsToTileSpace = 0.1
): number {
  const level = Number.isFinite(tileHeight ?? Number.NaN) ? tileHeight ?? 0 : 0;
  if (!Number.isFinite(transitionAuroraUnits ?? Number.NaN) || (transitionAuroraUnits ?? 0) <= 0) {
    return level;
  }
  return level * (transitionAuroraUnits as number) * auroraUnitsToTileSpace;
}

export function resolveAuroraAreaRenderX(sourceX: number, areaWidth: number): number {
  return areaWidth - sourceX;
}

export function resolveAuroraAreaRenderOffsetX(sourceOffsetX: number): number {
  return -sourceOffsetX;
}

export function resolveAuroraAreaRenderZ(sourceY: number, areaHeight: number): number {
  void areaHeight;
  return sourceY;
}

export function resolveAuroraAreaRenderOffsetZ(sourceOffsetY: number): number {
  return sourceOffsetY;
}

export function resolveAuroraAreaRenderYaw(sourceYaw: number): number {
  return -sourceYaw;
}

// Tile orientation is discrete ARE quarter-turn state, separate from GIT object yaw.
export function resolveAuroraAreaRenderTileCenterX(
  tileCol: number,
  areaWidth: number
): number {
  void areaWidth;
  return tileCol + 0.5;
}

export function resolveAuroraAreaRenderTileCenterZ(
  tileRow: number,
  areaHeight: number
): number {
  void areaHeight;
  return tileRow + 0.5;
}

export function resolveAuroraAreaRenderTileModelOrientation(
  sourceOrientation: number,
  tilesetOrientation = 0
): number {
  // Tile_Orientation is authored relative to the tile's canonical SET
  // orientation. Converted GLBs retain that canonical model basis, so remove
  // the SET quarter turn before mirroring Aurora's yaw into Three.js.
  //
  // This is especially visible for multi-cell groups: applying the absolute
  // ARE value to every member can move the host geometry outside the group's
  // footprint, leaving its model-less companion cells black.
  return normalizeTileOrientation(tilesetOrientation - sourceOrientation);
}

export function resolveAuroraAreaRenderTileImageMapOrientation(
  sourceOrientation: number,
  tilesetOrientation = 0
): number {
  return resolveAuroraAreaRenderTileModelOrientation(sourceOrientation, tilesetOrientation);
}

export const resolveAuroraAreaRenderTileOrientation =
  resolveAuroraAreaRenderTileModelOrientation;
