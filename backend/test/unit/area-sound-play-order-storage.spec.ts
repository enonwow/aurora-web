import {
  areaSoundPlayOrderStoragesEqual,
  readAreaSoundPlayOrderStorage,
  readExistingAreaSoundPlayOrderMutation,
} from "../../src/modules/areas/domain/area-sound-play-order-storage";

describe("Area Sound Play Order storage", () => {
  it.each([0, 1])("admits exact canonical byte %i", (randomByte) => {
    const result = readAreaSoundPlayOrderStorage({ randomByte });
    expect(result).toEqual({ randomByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative", { randomByte: -1 }],
    ["noncanonical byte", { randomByte: 2 }],
    ["boolean alias", { randomByte: true }],
    ["missing", {}],
    ["unexpected key", { randomByte: 1, extra: true }],
  ])("rejects %s storage", (_label, value) => {
    expect(readAreaSoundPlayOrderStorage(value)).toBeNull();
  });

  it("compares only admitted exact storage", () => {
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 1 })).toBe(true);
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 0 })).toBe(false);
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 1, extra: 1 })).toBe(false);
  });

  it("admits one complete changed source-bound mutation", () => {
    const result = readExistingAreaSoundPlayOrderMutation({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 3,
      expectedValue: { randomByte: 0 }, value: { randomByte: 1 },
    });
    expect(result).toEqual({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 3,
      expectedValue: { randomByte: 0 }, value: { randomByte: 1 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", { expectedValue: { randomByte: 0 }, value: { randomByte: 0 } }],
    ["wrong kind", { kind: "placeable" }],
    ["invalid ordinal", { sourceIndex: -1 }],
    ["invalid expected", { expectedValue: { randomByte: 2 } }],
    ["invalid target", { value: { randomByte: 2 } }],
    ["unexpected key", { extra: true }],
  ])("rejects %s mutation", (_label, overrides) => {
    expect(readExistingAreaSoundPlayOrderMutation({
      kind: "sound", sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
      expectedValue: { randomByte: 0 }, value: { randomByte: 1 }, ...overrides,
    })).toBeNull();
  });
});
