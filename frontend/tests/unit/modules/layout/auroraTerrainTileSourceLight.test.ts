import { describe, expect, it } from "vitest";

import {
  AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_FILE_NAME,
  AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_HASH,
  resolveAuroraTerrainTileSourceLightProfile
} from "../../../../src/modules/layout/adapters/three/auroraTerrainTileSourceLight";

describe("resolveAuroraTerrainTileSourceLightProfile", () => {
  it.each([
    [1, [2, 2, 2]],
    [2, [0.94, 0.94, 0.5]],
    [3, [1.9, 1.9, 1]],
    [4, [0.72, 0.87, 0.56]],
    [5, [1.4, 1.8, 1.4]],
    [6, [0.65, 0.96, 0.91]],
    [7, [1.3, 1.92, 1.82]],
    [8, [0.7, 0.7, 1.2]],
    [9, [1.4, 1.4, 2.4]],
    [10, [0.92, 0.65, 0.92]],
    [11, [1.84, 1.3, 1.84]],
    [12, [1, 0.5, 0.5]],
    [13, [2, 1.2, 1.2]],
    [14, [1, 0.75, 0.3]],
    [15, [1.85, 1.2, 0.6]]
  ])("maps Tile_SrcLight row %i to fx_flame01 animation color", (rowId, expected) => {
    const profile = resolveAuroraTerrainTileSourceLightProfile(rowId);

    expect(profile).not.toBeNull();
    expect(profile?.animationName).toBe(String(rowId));
    expect(profile?.color).toEqual(expected.map(Math.fround));
    expect(profile?.sourceModelFileName).toBe(
      AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_FILE_NAME
    );
    expect(profile?.sourceModelHash).toBe(AURORA_TERRAIN_TILE_SOURCE_LIGHT_MODEL_HASH);
    expect(profile?.multiplier).toBe(1);
  });

  it("preserves a source-model-backed color and reports stale tilecolor correction", () => {
    expect(
      resolveAuroraTerrainTileSourceLightProfile(3, {
        color: [0.25, 0.5, 0.75],
        colorSource: "custom/fx_flame01.mdl",
        sourceModelHash: "custom-hash"
      })
    ).toMatchObject({
      color: [0.25, 0.5, 0.75],
      sourceModelHash: "custom-hash",
      staleColorCorrectionStatus: "source-model-animation-color"
    });

    expect(
      resolveAuroraTerrainTileSourceLightProfile(3, {
        color: [0.49, 0.29, 0.07],
        colorSource: "nwn_base.key/tilecolor.2da"
      })
    ).toMatchObject({
      color: [Math.fround(1.9), Math.fround(1.9), 1],
      staleColorCorrectionStatus: "corrected-stale-tilecolor-source"
    });
  });

  it.each([0, -1, 16, 1.5, Number.NaN])("rejects unsupported row %s", (rowId) => {
    expect(resolveAuroraTerrainTileSourceLightProfile(rowId)).toBeNull();
  });
});
