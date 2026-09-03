import { describe, expect, it } from "vitest";
import {
  areaSoundProfilePresentationFromStorage,
  areaSoundProfileStorageFromPresentation,
  cloneAreaSoundProfileStorage,
  readAreaSoundProfileStorage,
} from "../../../../src/modules/areas/domain/areaSoundProfileStorage";

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
  it("deeply clones and presents one exact profile", () => {
    expect(areaSoundProfilePresentationFromStorage(repeatRandom)).toEqual({
      sounds: ["wind_a", "wind_b"],
      playStyle: "repeat",
      mode: "random",
      elevation: 1.5,
      cutoffDistance: 10,
      maxVolumeDistance: 1,
      randomRangeWestEast: 10,
      randomRangeNorthSouth: 10,
    });
    const clone = cloneAreaSoundProfileStorage(repeatRandom);
    expect(clone).toEqual(repeatRandom);
    expect(clone.sounds).not.toBe(repeatRandom.sounds);
  });

  it("atomically changes list, style, mode, distances, ranges, and Priority", () => {
    expect(areaSoundProfileStorageFromPresentation(repeatRandom, {
      sounds: ["wind_b"],
      playStyle: "loop",
      mode: "specific",
      elevation: -2,
      cutoffDistance: 20,
      maxVolumeDistance: 4,
      randomRangeWestEast: 0,
      randomRangeNorthSouth: 0,
    })).toEqual({
      ...repeatRandom,
      sounds: ["wind_b"],
      loopingByte: 1,
      continuousByte: 0,
      priorityByte: 3,
      randomPositionByte: 0,
      elevationFloat32: -2,
      maxDistanceFloat32: 20,
      minDistanceFloat32: 4,
      randomRangeXFloat32: 0,
      randomRangeYFloat32: 0,
    });
  });

  it.each([
    ["everywhere", 0, 0],
    ["specific", 1, 0],
    ["random", 1, 1],
  ] as const)("maps %s to canonical positional flags", (mode, positionalByte, randomPositionByte) => {
    const value = areaSoundProfileStorageFromPresentation(repeatRandom, {
      ...areaSoundProfilePresentationFromStorage(repeatRandom), mode,
    });
    expect(value).toMatchObject({ positionalByte, randomPositionByte });
  });

  it("rejects malformed storage and out-of-domain presentation", () => {
    expect(readAreaSoundProfileStorage({ ...repeatRandom, elevationFloat32: 0.1 })).toBeNull();
    expect(areaSoundProfileStorageFromPresentation(repeatRandom, {
      ...areaSoundProfilePresentationFromStorage(repeatRandom), cutoffDistance: 0.1,
    })).toBeNull();
    expect(areaSoundProfileStorageFromPresentation(repeatRandom, {
      ...areaSoundProfilePresentationFromStorage(repeatRandom), maxVolumeDistance: 11,
    })).toBeNull();
    expect(areaSoundProfileStorageFromPresentation(repeatRandom, {
      ...areaSoundProfilePresentationFromStorage(repeatRandom), mode: "nearby",
    })).toBeNull();
  });
});
