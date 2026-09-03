import {
  areaSoundPlayStyleStoragesEqual,
  deriveAreaSoundPriorityByte,
  readAreaSoundPlayStyleStorage,
  readExistingAreaSoundPlayStyleMutation,
} from "../../src/modules/areas/domain/area-sound-play-style-storage";

const oncePositional = Object.freeze({
  loopingByte: 0 as const,
  continuousByte: 0 as const,
  priorityByte: 20 as const,
  positionalByte: 1 as const,
  soundsCount: 4,
  intervalDword: 25_000,
  intervalVariationDword: 5_000,
});

describe("Area Sound Play Style storage", () => {
  it.each([
    [1, 0, 0, 4, 25_000, 5_000, 2],
    [1, 0, 1, 4, 25_000, 5_000, 3],
    [0, 1, 0, 1, 0, 0, 2],
    [0, 1, 1, 1, 0, 0, 3],
    [0, 1, 0, 2, 0, 0, 19],
    [0, 1, 1, 1, 10, 0, 20],
    [0, 1, 0, 1, 0, 10, 19],
    [0, 0, 0, 1, 0, 0, 19],
    [0, 0, 1, 4, 25_000, 5_000, 20],
  ] as const)(
    "derives Priority for looping=%i continuous=%i positional=%i count=%i interval=%i variation=%i",
    (loopingByte, continuousByte, positionalByte, soundsCount, intervalDword,
      intervalVariationDword, expected) => {
      expect(deriveAreaSoundPriorityByte({
        loopingByte,
        continuousByte,
        positionalByte,
        soundsCount,
        intervalDword,
        intervalVariationDword,
      })).toBe(expected);
    },
  );

  it("admits and freezes one exact derivation-consistent tuple", () => {
    const admitted = readAreaSoundPlayStyleStorage({ ...oncePositional });
    expect(admitted).toEqual(oncePositional);
    expect(Object.isFrozen(admitted)).toBe(true);
  });

  it.each([
    ["missing member", { ...oncePositional, priorityByte: undefined }],
    ["extra member", { ...oncePositional, extra: 1 }],
    ["noncanonical Looping", { ...oncePositional, loopingByte: 2 }],
    ["noncanonical Continuous", { ...oncePositional, continuousByte: -1 }],
    ["ambiguous flag pair", { ...oncePositional, loopingByte: 1, continuousByte: 1 }],
    ["noncanonical Positional", { ...oncePositional, positionalByte: 3 }],
    ["wrong derived Priority", { ...oncePositional, priorityByte: 19 }],
    ["unsupported Priority", { ...oncePositional, priorityByte: 18 }],
    ["negative count", { ...oncePositional, soundsCount: -1 }],
    ["fractional count", { ...oncePositional, soundsCount: 1.5 }],
    ["oversized count", { ...oncePositional, soundsCount: 0x1_0000_0000 }],
    ["negative Interval", { ...oncePositional, intervalDword: -1 }],
    ["oversized IntervalVrtn", {
      ...oncePositional, intervalVariationDword: 0x1_0000_0000,
    }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaSoundPlayStyleStorage(value)).toBeNull();
  });

  it("compares all seven exact members", () => {
    expect(areaSoundPlayStyleStoragesEqual(oncePositional, { ...oncePositional })).toBe(true);
    expect(areaSoundPlayStyleStoragesEqual(oncePositional, {
      ...oncePositional,
      soundsCount: 5,
    })).toBe(false);
  });

  it("admits only a changed canonical style with unchanged derivation dependencies", () => {
    const target = {
      ...oncePositional,
      loopingByte: 1 as const,
      continuousByte: 0 as const,
      priorityByte: 3 as const,
    };
    const mutation = readExistingAreaSoundPlayStyleMutation({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: oncePositional,
      value: target,
    });
    expect(mutation).toEqual({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: oncePositional,
      value: target,
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    ["unchanged", { ...oncePositional }],
    ["changed Positional", { ...oncePositional, positionalByte: 0, priorityByte: 19 }],
    ["changed Sounds count", { ...oncePositional, soundsCount: 1 }],
    ["changed Interval", { ...oncePositional, intervalDword: 0 }],
    ["changed IntervalVrtn", { ...oncePositional, intervalVariationDword: 0 }],
    ["wrong target Priority", {
      ...oncePositional, loopingByte: 1, continuousByte: 0, priorityByte: 20,
    }],
  ])("rejects a mutation with %s", (_label, value) => {
    expect(readExistingAreaSoundPlayStyleMutation({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: oncePositional,
      value,
    })).toBeNull();
  });
});
