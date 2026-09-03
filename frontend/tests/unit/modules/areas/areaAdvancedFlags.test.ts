import { describe, expect, it } from "vitest";
import {
  isAreaAdvancedFlags,
  isAreaCheckModifier,
  isAreaLoadingScreenId,
  isAreaPlayerVsPlayerMode,
  isAreaTerrainTypeFlags,
  terrainTypeFlagsEqual,
} from "../../../../src/modules/areas/domain/areaAdvancedFlags";

describe("Area advanced gameplay flags", () => {
  it.each([-99, -1, 0, 1, 99])("admits Toolset check modifier %i", (value) => {
    expect(isAreaCheckModifier(value)).toBe(true);
  });

  it.each([-100, 100, 1.5, "0", null])("rejects unsupported check modifier %p", (value) => {
    expect(isAreaCheckModifier(value)).toBe(false);
  });

  it.each([0, 1, 0xffff])("admits native loading-screen Word %i", (value) => {
    expect(isAreaLoadingScreenId(value)).toBe(true);
  });

  it.each([-1, 0x1_0000, 1.5, "0", null])("rejects unsupported loading-screen Word %p", (value) => {
    expect(isAreaLoadingScreenId(value)).toBe(false);
  });

  it.each([0, 1, 2, 3])("admits PvP mode %i", (value) => {
    expect(isAreaPlayerVsPlayerMode(value)).toBe(true);
  });

  it.each([-1, 4, 1.5, "1", null])("rejects unsupported PvP mode %p", (value) => {
    expect(isAreaPlayerVsPlayerMode(value)).toBe(false);
  });

  it("requires exact terrain and advanced objects", () => {
    const terrain = { interior: true, natural: false, subterranean: true };
    expect(isAreaTerrainTypeFlags(terrain)).toBe(true);
    expect(isAreaTerrainTypeFlags({ ...terrain, extra: true })).toBe(false);
    expect(isAreaAdvancedFlags({
      terrainType: terrain,
      playerVsPlayer: 3,
      noRest: false,
      listenCheckModifier: -99,
      spotCheckModifier: 99,
      loadingScreenId: 0xffff,
    }))
      .toBe(true);
    expect(isAreaAdvancedFlags({ playerVsPlayer: 4 })).toBe(false);
    expect(isAreaAdvancedFlags({ noRest: 0 })).toBe(false);
    expect(isAreaAdvancedFlags({ listenCheckModifier: -100 })).toBe(false);
    expect(isAreaAdvancedFlags({ spotCheckModifier: 1.5 })).toBe(false);
    expect(isAreaAdvancedFlags({ loadingScreenId: 0x1_0000 })).toBe(false);
  });

  it("compares terrain flags structurally", () => {
    expect(terrainTypeFlagsEqual(
      { interior: true, natural: false, subterranean: true },
      { interior: true, natural: false, subterranean: true },
    )).toBe(true);
    expect(terrainTypeFlagsEqual(
      { interior: true, natural: false, subterranean: true },
      { interior: false, natural: false, subterranean: true },
    )).toBe(false);
  });
});
