import {
  areaSoundPlaybackStoragesEqual,
  readAreaSoundPlaybackStorage,
  readExistingAreaSoundPlaybackMutation,
} from "../../src/modules/areas/domain/area-sound-playback-storage";

const repeatPositional = Object.freeze({
  sounds: Object.freeze(["as_an_cryday1", "as_an_cryday2"]),
  loopingByte: 0 as const,
  continuousByte: 1 as const,
  priorityByte: 20 as const,
  positionalByte: 1 as const,
  intervalDword: 25_000,
  intervalVariationDword: 5_000,
});

describe("Area Sound playback storage", () => {
  it.each([
    [[], 19],
    [["one_sound"], 2],
    [["one_sound", "one_sound"], 19],
  ] as const)("derives count-sensitive Repeat Priority for %j", (sounds, priorityByte) => {
    expect(readAreaSoundPlaybackStorage({
      sounds,
      loopingByte: 0,
      continuousByte: 1,
      priorityByte,
      positionalByte: 0,
      intervalDword: 0,
      intervalVariationDword: 0,
    })).not.toBeNull();
  });

  it("admits exact ordered duplicate ResRefs and freezes a detached list", () => {
    const input = { ...repeatPositional, sounds: ["rain_loop", "rain_loop", "wind_gust"] };
    const admitted = readAreaSoundPlaybackStorage(input);
    expect(admitted).toEqual(input);
    expect(admitted?.sounds).not.toBe(input.sounds);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted?.sounds)).toBe(true);
  });

  it.each([
    ["missing member", { ...repeatPositional, sounds: undefined }],
    ["extra member", { ...repeatPositional, extra: 1 }],
    ["non-array list", { ...repeatPositional, sounds: "rain_loop" }],
    ["empty ResRef", { ...repeatPositional, sounds: [""] }],
    ["uppercase ResRef", { ...repeatPositional, sounds: ["Rain_Loop"] }],
    ["punctuated ResRef", { ...repeatPositional, sounds: ["rain-loop"] }],
    ["oversized ResRef", { ...repeatPositional, sounds: ["12345678901234567"] }],
    ["oversized list", { ...repeatPositional, sounds: Array(1025).fill("rain_loop") }],
    ["ambiguous flags", { ...repeatPositional, loopingByte: 1, continuousByte: 1 }],
    ["wrong Priority", { ...repeatPositional, priorityByte: 3 }],
    ["changed dependency domain", { ...repeatPositional, positionalByte: 2 }],
    ["negative Interval", { ...repeatPositional, intervalDword: -1 }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaSoundPlaybackStorage(value)).toBeNull();
  });

  it("compares list order, duplicates, style, Priority, and dependencies", () => {
    expect(areaSoundPlaybackStoragesEqual(repeatPositional, { ...repeatPositional })).toBe(true);
    expect(areaSoundPlaybackStoragesEqual(repeatPositional, {
      ...repeatPositional,
      sounds: [...repeatPositional.sounds].reverse(),
    })).toBe(false);
    expect(areaSoundPlaybackStoragesEqual(repeatPositional, {
      ...repeatPositional,
      sounds: [repeatPositional.sounds[0]!, repeatPositional.sounds[0]!],
    })).toBe(false);
  });

  it("admits one atomic list plus Play Style mutation with derived Priority", () => {
    const target = {
      ...repeatPositional,
      sounds: Object.freeze(["as_an_cryday2"]),
      loopingByte: 1 as const,
      continuousByte: 0 as const,
      priorityByte: 3 as const,
    };
    const mutation = readExistingAreaSoundPlaybackMutation({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: repeatPositional,
      value: target,
    });
    expect(mutation).toEqual({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: repeatPositional,
      value: target,
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.value.sounds)).toBe(true);
  });

  it.each([
    ["unchanged target", { ...repeatPositional }],
    ["changed Positional", { ...repeatPositional, positionalByte: 0, priorityByte: 19 }],
    ["changed Interval", { ...repeatPositional, intervalDword: 0 }],
    ["changed IntervalVrtn", { ...repeatPositional, intervalVariationDword: 0 }],
    ["wrong target Priority after switching to looping", {
      ...repeatPositional,
      sounds: ["one_sound"],
      loopingByte: 1,
      continuousByte: 0,
      priorityByte: 20,
    }],
  ])("rejects mutation with %s", (_label, value) => {
    expect(readExistingAreaSoundPlaybackMutation({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: repeatPositional,
      value,
    })).toBeNull();
  });
});
