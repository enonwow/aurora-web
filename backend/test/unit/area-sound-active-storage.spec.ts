import {
  areaSoundActiveStoragesEqual,
  readAreaSoundActiveStorage,
  readExistingAreaSoundActiveMutation,
} from "../../src/modules/areas/domain/area-sound-active-storage";

describe("Area Sound Active storage", () => {
  it.each([0, 1])("admits exact canonical byte %i", (activeByte) => {
    const result = readAreaSoundActiveStorage({ activeByte });
    expect(result).toEqual({ activeByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { activeByte: -1 }],
    ["noncanonical byte", { activeByte: 2 }],
    ["boolean alias", { activeByte: true }],
    ["missing", {}],
    ["unexpected key", { activeByte: 1, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaSoundActiveStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaSoundActiveStoragesEqual({ activeByte: 1 }, { activeByte: 1 })).toBe(true);
    expect(areaSoundActiveStoragesEqual({ activeByte: 1 }, { activeByte: 0 })).toBe(false);
    expect(areaSoundActiveStoragesEqual({ activeByte: 1 }, { activeByte: 1, extra: 1 })).toBe(false);
  });

  it("admits one complete changed source-bound mutation", () => {
    const result = readExistingAreaSoundActiveMutation({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 3,
      expectedValue: { activeByte: 1 }, value: { activeByte: 0 },
    });
    expect(result).toEqual({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 3,
      expectedValue: { activeByte: 1 }, value: { activeByte: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", { expectedValue: { activeByte: 1 }, value: { activeByte: 1 } }],
    ["wrong kind", { kind: "placeable" }],
    ["invalid ordinal", { sourceIndex: -1 }],
    ["invalid expected", { expectedValue: { activeByte: 2 } }],
    ["invalid target", { value: { activeByte: 2 } }],
    ["unexpected key", { extra: true }],
  ])("rejects %s mutation", (_label, overrides) => {
    expect(readExistingAreaSoundActiveMutation({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: { activeByte: 1 }, value: { activeByte: 0 }, ...overrides,
    })).toBeNull();
  });
});
