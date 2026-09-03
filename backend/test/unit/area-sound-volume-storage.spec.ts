import {
  areaSoundVolumeStoragesEqual,
  readAreaSoundVolumeStorage,
  readExistingAreaSoundVolumeMutation,
} from "../../src/modules/areas/domain/area-sound-volume-storage";

describe("Area Sound base-volume storage", () => {
  it.each([0, 1, 64, 127])("admits exact raw byte %i", (volumeByte) => {
    const result = readAreaSoundVolumeStorage({ volumeByte });
    expect(result).toEqual({ volumeByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { volumeByte: -1 }],
    ["above native maximum", { volumeByte: 128 }],
    ["fractional", { volumeByte: 64.5 }],
    ["missing", {}],
    ["unexpected key", { volumeByte: 64, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaSoundVolumeStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaSoundVolumeStoragesEqual({ volumeByte: 64 }, { volumeByte: 64 })).toBe(true);
    expect(areaSoundVolumeStoragesEqual({ volumeByte: 64 }, { volumeByte: 65 })).toBe(false);
    expect(areaSoundVolumeStoragesEqual({ volumeByte: 64 }, { volumeByte: 64, extra: 1 })).toBe(false);
  });

  it("admits one complete changed source-bound mutation", () => {
    const result = readExistingAreaSoundVolumeMutation({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 3,
      expectedValue: { volumeByte: 64 },
      value: { volumeByte: 127 },
    });
    expect(result).toEqual({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 3,
      expectedValue: { volumeByte: 64 },
      value: { volumeByte: 127 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", { expectedValue: { volumeByte: 64 }, value: { volumeByte: 64 } }],
    ["wrong kind", { kind: "placeable" }],
    ["invalid ordinal", { sourceIndex: -1 }],
    ["invalid expected", { expectedValue: { volumeByte: 128 } }],
    ["invalid target", { value: { volumeByte: 128 } }],
    ["unexpected key", { extra: true }],
  ])("rejects %s mutation", (_label, overrides) => {
    expect(readExistingAreaSoundVolumeMutation({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: { volumeByte: 64 },
      value: { volumeByte: 127 },
      ...overrides,
    })).toBeNull();
  });
});
