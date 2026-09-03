import { describe, expect, it } from "vitest";
import {
  areaSoundPlayStylePresentationFromStorage,
  areaSoundPlayStyleStorageFromPresentation,
  cloneAreaSoundPlayStyleStorage,
  deriveAreaSoundPriorityByte,
  readAreaSoundPlayStyleStorage,
} from "../../../../src/modules/areas/domain/areaSoundPlayStyleStorage";

const repeatPositional = Object.freeze({
  loopingByte: 0 as const,
  continuousByte: 1 as const,
  priorityByte: 20 as const,
  positionalByte: 1 as const,
  soundsCount: 4,
  intervalDword: 25_000,
  intervalVariationDword: 5_000,
});

describe("Area Sound Play Style storage", () => {
  it("validates, clones, and presents all three canonical styles", () => {
    expect(areaSoundPlayStylePresentationFromStorage(repeatPositional)).toEqual({
      playStyle: "repeat",
    });
    expect(areaSoundPlayStylePresentationFromStorage({
      ...repeatPositional, loopingByte: 0, continuousByte: 0,
    })).toEqual({ playStyle: "once" });
    expect(areaSoundPlayStylePresentationFromStorage({
      ...repeatPositional, loopingByte: 1, continuousByte: 0, priorityByte: 3,
    })).toEqual({ playStyle: "loop" });
    const clone = cloneAreaSoundPlayStyleStorage(repeatPositional);
    expect(clone).toEqual(repeatPositional);
    expect(clone).not.toBe(repeatPositional);
  });

  it("recomputes Priority while preserving every hidden dependency", () => {
    expect(areaSoundPlayStyleStorageFromPresentation(repeatPositional, {
      playStyle: "loop",
    })).toEqual({
      ...repeatPositional,
      loopingByte: 1,
      continuousByte: 0,
      priorityByte: 3,
    });
    expect(areaSoundPlayStyleStorageFromPresentation(repeatPositional, {
      playStyle: "once",
    })).toEqual({
      ...repeatPositional,
      loopingByte: 0,
      continuousByte: 0,
      priorityByte: 20,
    });
  });

  it("covers the native special repeat priority branch", () => {
    const singleZeroTiming = {
      ...repeatPositional,
      soundsCount: 1,
      intervalDword: 0,
      intervalVariationDword: 0,
      priorityByte: 3 as const,
    };
    expect(deriveAreaSoundPriorityByte(singleZeroTiming)).toBe(3);
    expect(areaSoundPlayStyleStorageFromPresentation(singleZeroTiming, {
      playStyle: "repeat",
    })).toEqual(singleZeroTiming);
  });

  it.each([
    { ...repeatPositional, loopingByte: 1, continuousByte: 1 },
    { ...repeatPositional, priorityByte: 3 },
    { ...repeatPositional, positionalByte: 2 },
    { ...repeatPositional, soundsCount: -1 },
    { ...repeatPositional, intervalDword: 0x1_0000_0000 },
    { ...repeatPositional, extra: true },
  ])("rejects malformed or derivation-inconsistent storage", (value) => {
    expect(readAreaSoundPlayStyleStorage(value)).toBeNull();
  });

  it("rejects unknown presentation and malformed source storage", () => {
    expect(areaSoundPlayStyleStorageFromPresentation(repeatPositional, {
      playStyle: "shuffle",
    })).toBeNull();
    expect(areaSoundPlayStyleStorageFromPresentation({
      ...repeatPositional,
      priorityByte: 3,
    }, { playStyle: "once" })).toBeNull();
  });
});
