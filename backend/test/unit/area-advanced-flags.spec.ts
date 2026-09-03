import {
  decodeAreaTerrainTypeFlags,
  encodeAreaTerrainTypeFlags,
  isAreaAdvancedFlags,
  isAreaCheckModifier,
  isAreaLoadingScreenId,
  isAreaPlayerVsPlayerMode,
  isAreaTerrainTypeFlags,
  readExistingAreaAdvancedFlagMutations,
} from "../../src/modules/areas/domain/area-advanced-flags";

describe("existing Area advanced gameplay flags contract", () => {
  it.each([0, 1, 0xffff])("admits loading-screen Word %i", (value) => {
    expect(isAreaLoadingScreenId(value)).toBe(true);
  });

  it.each([-1, 0x1_0000, 1.5, "0", null])(
    "rejects unsupported loading-screen Word %p",
    (value) => {
      expect(isAreaLoadingScreenId(value)).toBe(false);
    },
  );

  it.each([-99, -1, 0, 1, 99])("admits Toolset check modifier %i", (value) => {
    expect(isAreaCheckModifier(value)).toBe(true);
  });

  it.each([-100, 100, 1.5, "0", null])("rejects unsupported check modifier %p", (value) => {
    expect(isAreaCheckModifier(value)).toBe(false);
  });

  it.each([0, 1, 2, 3])("admits PvP mode %i", (value) => {
    expect(isAreaPlayerVsPlayerMode(value)).toBe(true);
  });

  it.each([-1, 4, 1.5, "1", null])("rejects unsupported PvP mode %p", (value) => {
    expect(isAreaPlayerVsPlayerMode(value)).toBe(false);
  });

  it("round-trips all eight admitted terrain flag combinations", () => {
    for (let value = 0; value <= 7; value += 1) {
      const decoded = decodeAreaTerrainTypeFlags(value);
      expect(decoded).not.toBeNull();
      if (!decoded) throw new Error(`missing decoded terrain value ${value}`);
      expect(encodeAreaTerrainTypeFlags(decoded)).toBe(value);
      expect(isAreaTerrainTypeFlags(decoded)).toBe(true);
    }
  });

  it.each([-1, 8, 1.5, "7", null])("rejects unsupported terrain DWord %p", (value) => {
    expect(decodeAreaTerrainTypeFlags(value)).toBeNull();
  });

  it("requires exact advanced source keys and values", () => {
    expect(isAreaAdvancedFlags({
      terrainType: { interior: true, natural: false, subterranean: true },
      playerVsPlayer: 3,
      noRest: false,
      listenCheckModifier: -99,
      spotCheckModifier: 99,
      loadingScreenId: 0xffff,
    })).toBe(true);
    expect(isAreaAdvancedFlags({ playerVsPlayer: 4 })).toBe(false);
    expect(isAreaAdvancedFlags({ noRest: 0 })).toBe(false);
    expect(isAreaAdvancedFlags({ listenCheckModifier: -100 })).toBe(false);
    expect(isAreaAdvancedFlags({ spotCheckModifier: 1.5 })).toBe(false);
    expect(isAreaAdvancedFlags({ loadingScreenId: 0x1_0000 })).toBe(false);
    expect(isAreaAdvancedFlags({ playerVsPlayer: 1, extra: true })).toBe(false);
  });

  it("reads changed exact CAS pairs for every admitted value", () => {
    expect(readExistingAreaAdvancedFlagMutations({
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 2 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: 0, value: -4 },
      spotCheckModifier: { expectedValue: 2, value: 7 },
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    })).toEqual({
      terrainType: {
        expectedValue: { interior: false, natural: true, subterranean: false },
        value: { interior: true, natural: false, subterranean: true },
      },
      playerVsPlayer: { expectedValue: 0, value: 2 },
      noRest: { expectedValue: false, value: true },
      listenCheckModifier: { expectedValue: 0, value: -4 },
      spotCheckModifier: { expectedValue: 2, value: 7 },
      loadingScreenId: { expectedValue: 0, value: 0xffff },
    });
  });

  it.each([
    {},
    { noRest: { expectedValue: true, value: true } },
    { playerVsPlayer: { expectedValue: 0, value: 4 } },
    { listenCheckModifier: { expectedValue: -100, value: 0 } },
    { spotCheckModifier: { expectedValue: 0, value: 100 } },
    { spotCheckModifier: { expectedValue: 1, value: 1 } },
    { loadingScreenId: { expectedValue: 0, value: 0x1_0000 } },
    { loadingScreenId: { expectedValue: 7, value: 7 } },
    { terrainType: {
      expectedValue: { interior: false, natural: false, subterranean: false },
      value: { interior: false, natural: false, subterranean: false },
    } },
    { noRest: { expectedValue: false, value: true, extra: true } },
    { NoRest: { expectedValue: false, value: true } },
  ])("rejects malformed advanced mutation %#", (value) => {
    expect(readExistingAreaAdvancedFlagMutations(value)).toBeNull();
  });
});
