import { describe, expect, it } from "vitest";
import {
  resolveAuroraAreaRenderOffsetX,
  resolveAuroraAreaRenderOffsetZ,
  resolveAuroraAreaRenderTileCenterX,
  resolveAuroraAreaRenderTileCenterZ,
  resolveAuroraAreaRenderTileImageMapOrientation,
  resolveAuroraAreaRenderTileOrientation,
  resolveAuroraAreaRenderX,
  resolveAuroraAreaRenderYaw,
  resolveAuroraAreaRenderZ
} from "../../../../src/modules/layout/adapters/three/workspaceAreaRenderCoordinates";

describe("workspaceAreaRenderCoordinates", () => {
  const ENON_BAKERY_TILE_CONTRACT_ROWS = [
    { row: 0, col: 0, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 0 },
    { row: 0, col: 1, sourceOrientation: 2, webMirrorOrientation: 2, tilesetOrientation: 0 },
    { row: 0, col: 2, sourceOrientation: 0, webMirrorOrientation: 0, tilesetOrientation: 0 },
    { row: 0, col: 3, sourceOrientation: 1, webMirrorOrientation: 3, tilesetOrientation: 0 },
    { row: 1, col: 0, sourceOrientation: 2, webMirrorOrientation: 2, tilesetOrientation: 0 },
    { row: 1, col: 1, sourceOrientation: 1, webMirrorOrientation: 3, tilesetOrientation: 1 },
    { row: 1, col: 2, sourceOrientation: 2, webMirrorOrientation: 2, tilesetOrientation: 2 },
    { row: 1, col: 3, sourceOrientation: 2, webMirrorOrientation: 2, tilesetOrientation: 0 },
    { row: 2, col: 0, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 0 },
    { row: 2, col: 1, sourceOrientation: 0, webMirrorOrientation: 0, tilesetOrientation: 1 },
    { row: 2, col: 2, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 1 },
    { row: 2, col: 3, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 0 },
    { row: 3, col: 0, sourceOrientation: 1, webMirrorOrientation: 3, tilesetOrientation: 0 },
    { row: 3, col: 1, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 0 },
    { row: 3, col: 2, sourceOrientation: 3, webMirrorOrientation: 1, tilesetOrientation: 0 },
    { row: 3, col: 3, sourceOrientation: 1, webMirrorOrientation: 3, tilesetOrientation: 0 }
  ] as const;

  it("maps terrain tile centers into the Aurora Toolset top-down frame", () => {
    expect(resolveAuroraAreaRenderTileCenterX(2, 4)).toBe(2.5);
    expect(resolveAuroraAreaRenderTileCenterX(0, 4)).toBe(0.5);
    expect(resolveAuroraAreaRenderTileCenterZ(0, 4)).toBe(0.5);
    expect(resolveAuroraAreaRenderTileCenterZ(3, 4)).toBe(3.5);
  });

  it("maps GIT object coordinates into the Aurora Toolset top-down frame", () => {
    expect(resolveAuroraAreaRenderX(1.3557, 4)).toBeCloseTo(2.6443);
    expect(resolveAuroraAreaRenderZ(2.0516, 4)).toBeCloseTo(2.0516);
    expect(resolveAuroraAreaRenderOffsetX(0.2)).toBeCloseTo(-0.2);
    expect(resolveAuroraAreaRenderOffsetZ(0.2)).toBeCloseTo(0.2);
    expect(resolveAuroraAreaRenderYaw(0)).toBeCloseTo(0);
    expect(resolveAuroraAreaRenderYaw(Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
    expect(resolveAuroraAreaRenderYaw(Math.PI)).toBeCloseTo(-Math.PI);
  });

  it("maps Area terrain GLB orientation from ARE tile orientation", () => {
    expect(resolveAuroraAreaRenderTileOrientation(0, 0)).toBe(0);
    expect(resolveAuroraAreaRenderTileOrientation(1, 0)).toBe(3);
    expect(resolveAuroraAreaRenderTileOrientation(2, 0)).toBe(2);
    expect(resolveAuroraAreaRenderTileOrientation(3, 0)).toBe(1);
    expect(resolveAuroraAreaRenderTileOrientation(0, 1)).toBe(0);
    expect(resolveAuroraAreaRenderTileOrientation(1, 1)).toBe(3);
    expect(resolveAuroraAreaRenderTileOrientation(2, 2)).toBe(2);
    expect(resolveAuroraAreaRenderTileOrientation(3, 1)).toBe(1);
    expect(resolveAuroraAreaRenderTileOrientation(0, 7)).toBe(0);
    expect(resolveAuroraAreaRenderTileOrientation(3, 7)).toBe(1);
  });

  it("keeps continuous object yaw separate from discrete tile quarter turns", () => {
    expect(resolveAuroraAreaRenderYaw(1)).toBeCloseTo(-1);
    expect(resolveAuroraAreaRenderTileOrientation(1, 0)).toBe(3);
    expect(resolveAuroraAreaRenderYaw(2.75)).toBeCloseTo(-2.75);
    expect(resolveAuroraAreaRenderTileOrientation(3, 0)).toBe(1);
  });

  it("maps ImageMap2D yaw from ARE tile orientation without SET model basis", () => {
    expect(resolveAuroraAreaRenderTileImageMapOrientation(0)).toBe(0);
    expect(resolveAuroraAreaRenderTileImageMapOrientation(1)).toBe(3);
    expect(resolveAuroraAreaRenderTileImageMapOrientation(2)).toBe(2);
    expect(resolveAuroraAreaRenderTileImageMapOrientation(3)).toBe(1);
    expect(resolveAuroraAreaRenderTileImageMapOrientation(7)).toBe(1);
  });

  it("matches the enon_bakery source-pack tile mirror contract", () => {
    ENON_BAKERY_TILE_CONTRACT_ROWS.forEach((tile) => {
      expect(
        resolveAuroraAreaRenderTileOrientation(
          tile.sourceOrientation,
          tile.tilesetOrientation
        ),
        `tile r${tile.row} c${tile.col}`
      ).toBe(tile.webMirrorOrientation);
      expect(
        resolveAuroraAreaRenderTileImageMapOrientation(tile.sourceOrientation),
        `imagemap r${tile.row} c${tile.col}`
      ).toBe(tile.webMirrorOrientation);
    });
  });

  it("matches the enon_bakery source-pack tile center contract", () => {
    ENON_BAKERY_TILE_CONTRACT_ROWS.forEach((tile) => {
      expect(
        resolveAuroraAreaRenderTileCenterX(tile.col, 4),
        `center x r${tile.row} c${tile.col}`
      ).toBeCloseTo(tile.col + 0.5);
      expect(
        resolveAuroraAreaRenderTileCenterZ(tile.row, 4),
        `center z r${tile.row} c${tile.col}`
      ).toBeCloseTo(tile.row + 0.5);
    });
  });
});
