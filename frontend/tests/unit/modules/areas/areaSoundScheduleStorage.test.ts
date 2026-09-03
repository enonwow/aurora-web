import { describe, expect, it } from "vitest";
import {
  areaSoundSchedulePresentationFromStorage,
  areaSoundScheduleStorageFromPresentation,
  areaSoundScheduleStoragesEqual,
  cloneAreaSoundScheduleStorage,
  readAreaSoundScheduleStorage,
} from "../../../../src/modules/areas/domain/areaSoundScheduleStorage";

describe("Area Sound schedule frontend storage", () => {
  it("admits and detaches the exact storage tuple", () => {
    const source = { hoursMask: 0x800001, timesByte: 0 };
    const clone = cloneAreaSoundScheduleStorage(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(Object.isFrozen(clone)).toBe(true);
  });

  it.each([
    [0, "hours", "both"],
    [1, "dayNight", "day"],
    [2, "dayNight", "night"],
    [3, "always", "both"],
  ] as const)("maps Times %i to the exact Toolset mode", (timesByte, whenToPlay, dayNight) => {
    expect(areaSoundSchedulePresentationFromStorage({
      hoursMask: 0x800001,
      timesByte,
    })).toEqual({
      whenToPlay,
      dayNight,
      hourMask: "100000000000000000000001",
    });
  });

  it.each([
    ["hours", "both", 0],
    ["dayNight", "day", 1],
    ["dayNight", "night", 2],
    ["always", "both", 3],
  ] as const)("maps %s/%s back to Times %i", (whenToPlay, dayNight, timesByte) => {
    expect(areaSoundScheduleStorageFromPresentation({
      whenToPlay,
      dayNight,
      hourMask: "100000000000000000000001",
    })).toEqual({ hoursMask: 0x800001, timesByte });
  });

  it.each([
    ["non-binary mask", { whenToPlay: "hours", dayNight: "both", hourMask: "2".repeat(24) }],
    ["short mask", { whenToPlay: "hours", dayNight: "both", hourMask: "0".repeat(23) }],
    ["day with wrong dayNight", { whenToPlay: "dayNight", dayNight: "both", hourMask: "0".repeat(24) }],
    ["always with day", { whenToPlay: "always", dayNight: "day", hourMask: "0".repeat(24) }],
  ])("rejects %s presentation", (_label, value) => {
    expect(areaSoundScheduleStorageFromPresentation(value)).toBeNull();
  });

  it("rejects malformed storage and compares only exact admitted tuples", () => {
    expect(readAreaSoundScheduleStorage({ hoursMask: 0x1000000, timesByte: 0 })).toBeNull();
    expect(readAreaSoundScheduleStorage({ hoursMask: 0, timesByte: 4 })).toBeNull();
    expect(areaSoundScheduleStoragesEqual(
      { hoursMask: 1, timesByte: 0 },
      { hoursMask: 1, timesByte: 0 },
    )).toBe(true);
    expect(areaSoundScheduleStoragesEqual(
      { hoursMask: 1, timesByte: 0 },
      { hoursMask: 2, timesByte: 0 },
    )).toBe(false);
    expect(() => cloneAreaSoundScheduleStorage({ hoursMask: 0, timesByte: 4 })).toThrow(
      "Malformed Area sound schedule storage.",
    );
  });
});
