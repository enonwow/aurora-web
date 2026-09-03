import {
  areaSoundProfileStoragesEqual,
  readAreaSoundProfileStorage,
  readExistingAreaSoundProfileMutation,
} from "../../src/modules/areas/domain/area-sound-profile-storage";

const repeatRandom = Object.freeze({
  sounds: Object.freeze(["wind_a", "wind_b"]),
  loopingByte: 0 as const,
  continuousByte: 1 as const,
  priorityByte: 20 as const,
  positionalByte: 1 as const,
  randomPositionByte: 1 as const,
  elevationFloat32: Math.fround(1.5),
  maxDistanceFloat32: Math.fround(10),
  minDistanceFloat32: Math.fround(1),
  randomRangeXFloat32: Math.fround(10),
  randomRangeYFloat32: Math.fround(10),
  intervalDword: 25_000,
  intervalVariationDword: 5_000,
});

describe("Area Sound aggregate profile storage", () => {
  it("admits and deeply freezes one exact native profile", () => {
    const admitted = readAreaSoundProfileStorage(repeatRandom);
    expect(admitted).toEqual(repeatRandom);
    expect(admitted).not.toBe(repeatRandom);
    expect(admitted?.sounds).not.toBe(repeatRandom.sounds);
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(Object.isFrozen(admitted?.sounds)).toBe(true);
  });

  it.each([
    ["everywhere", { positionalByte: 0, randomPositionByte: 0, priorityByte: 19 }],
    ["specific", { positionalByte: 1, randomPositionByte: 0, priorityByte: 20 }],
    ["random", { positionalByte: 1, randomPositionByte: 1, priorityByte: 20 }],
  ] as const)("admits canonical %s mode", (_mode, values) => {
    expect(readAreaSoundProfileStorage({ ...repeatRandom, ...values })).not.toBeNull();
  });

  it.each([
    ["extra key", { ...repeatRandom, extra: true }],
    ["noncanonical everywhere pair", { ...repeatRandom, positionalByte: 0, randomPositionByte: 1 }],
    ["wrong Priority", { ...repeatRandom, priorityByte: 3 }],
    ["non-binary32 elevation", { ...repeatRandom, elevationFloat32: 0.1 }],
    ["low elevation", { ...repeatRandom, elevationFloat32: Math.fround(-10.1) }],
    ["high elevation", { ...repeatRandom, elevationFloat32: Math.fround(10.1) }],
    ["low outer radius", { ...repeatRandom, maxDistanceFloat32: Math.fround(0.1) }],
    ["high outer radius", { ...repeatRandom, maxDistanceFloat32: Math.fround(321) }],
    ["negative inner radius", { ...repeatRandom, minDistanceFloat32: Math.fround(-1) }],
    ["inner radius over outer", { ...repeatRandom, minDistanceFloat32: Math.fround(11) }],
    ["negative X range", { ...repeatRandom, randomRangeXFloat32: Math.fround(-1) }],
    ["high Y range", { ...repeatRandom, randomRangeYFloat32: Math.fround(321) }],
    ["malformed ResRef", { ...repeatRandom, sounds: ["Wind-A"] }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaSoundProfileStorage(value)).toBeNull();
  });

  it("compares every exact member including order", () => {
    expect(areaSoundProfileStoragesEqual(repeatRandom, { ...repeatRandom })).toBe(true);
    expect(areaSoundProfileStoragesEqual(repeatRandom, {
      ...repeatRandom, sounds: [...repeatRandom.sounds].reverse(),
    })).toBe(false);
    expect(areaSoundProfileStoragesEqual(repeatRandom, {
      ...repeatRandom, randomRangeXFloat32: Math.fround(11),
    })).toBe(false);
  });

  it("admits one atomic playback plus spatial mutation and preserves timing", () => {
    const target = {
      ...repeatRandom,
      sounds: Object.freeze(["wind_b"]),
      loopingByte: 1 as const,
      continuousByte: 0 as const,
      priorityByte: 3 as const,
      randomPositionByte: 0 as const,
      elevationFloat32: Math.fround(-2),
      maxDistanceFloat32: Math.fround(20),
      minDistanceFloat32: Math.fround(4),
      randomRangeXFloat32: Math.fround(0),
      randomRangeYFloat32: Math.fround(0),
    };
    expect(readExistingAreaSoundProfileMutation({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: repeatRandom,
      value: target,
    })).toEqual({
      kind: "sound",
      sourceObjectId: "sound_0",
      sourceIndex: 0,
      expectedValue: repeatRandom,
      value: target,
    });
  });

  it.each([
    ["unchanged", { ...repeatRandom }],
    ["changed Interval", { ...repeatRandom, intervalDword: 0, priorityByte: 20 }],
    ["changed IntervalVrtn", { ...repeatRandom, intervalVariationDword: 0 }],
  ])("rejects mutation with %s", (_label, value) => {
    expect(readExistingAreaSoundProfileMutation({
      kind: "sound", sourceObjectId: "sound_0", sourceIndex: 0,
      expectedValue: repeatRandom, value,
    })).toBeNull();
  });
});
