function normalizeTileOrientation(value: number): number {
  const normalized = Math.trunc(value);
  return ((normalized % 4) + 4) % 4;
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
  void tilesetOrientation;
  return normalizeTileOrientation(-sourceOrientation);
}

export function resolveAuroraAreaRenderTileImageMapOrientation(
  sourceOrientation: number
): number {
  return normalizeTileOrientation(-sourceOrientation);
}

export const resolveAuroraAreaRenderTileOrientation =
  resolveAuroraAreaRenderTileModelOrientation;
