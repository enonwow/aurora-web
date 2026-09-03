import { describe, expect, it } from "vitest";
import {
  resolveTerrainTileCeilingsVisibleForTests,
  resolveTerrainTileHeightOffsetForTests
} from "../../../../src/modules/layout/adapters/three/workspaceTerrainMesh";

describe("workspaceTerrainMesh Aurora tile height", () => {
  it("converts tms01 Tile_Height through SET [GENERAL] Transition", () => {
    // Aurora Toolset: renderHeight = Tile_Height * SET.Transition.
    // tms01 has Transition=5 and the GLB tile unit scale is 0.1.
    expect(resolveTerrainTileHeightOffsetForTests({ height: 1, transition: 5 })).toBeCloseTo(0.5);
    expect(resolveTerrainTileHeightOffsetForTests({ height: 2, transition: 5 })).toBeCloseTo(1);
  });

  it("keeps elevated terrain fragments visible for exterior SETs", () => {
    expect(
      resolveTerrainTileCeilingsVisibleForTests({ interior: false, debugCeilingsVisible: false })
    ).toBe(true);
    expect(
      resolveTerrainTileCeilingsVisibleForTests({ interior: true, debugCeilingsVisible: false })
    ).toBe(false);
  });
});
