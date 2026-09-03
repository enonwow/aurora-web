import { describe, expect, it } from "vitest";
import {
  areaSoundPlaybackPresentationFromStorage,
  areaSoundPlaybackStorageFromPresentation,
  cloneAreaSoundPlaybackStorage,
  readAreaSoundPlaybackStorage,
} from "../../../../src/modules/areas/domain/areaSoundPlaybackStorage";

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
  it("validates, detaches, freezes, and presents one exact tuple", () => {
    const presentation = areaSoundPlaybackPresentationFromStorage(repeatPositional);
    expect(presentation).toEqual({
      sounds: ["as_an_cryday1", "as_an_cryday2"],
      playStyle: "repeat",
    });
    expect(Object.isFrozen(presentation.sounds)).toBe(true);
    const clone = cloneAreaSoundPlaybackStorage(repeatPositional);
    expect(clone).toEqual(repeatPositional);
    expect(clone).not.toBe(repeatPositional);
    expect(clone.sounds).not.toBe(repeatPositional.sounds);
  });

  it("atomically changes list and Play Style and recomputes Priority", () => {
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: ["as_an_cryday2"],
      playStyle: "loop",
    })).toEqual({
      ...repeatPositional,
      sounds: ["as_an_cryday2"],
      loopingByte: 1,
      continuousByte: 0,
      priorityByte: 3,
    });
  });

  it("covers count-sensitive Repeat Priority transitions", () => {
    const zeroTiming = {
      ...repeatPositional,
      intervalDword: 0,
      intervalVariationDword: 0,
      priorityByte: 20 as const,
    };
    expect(areaSoundPlaybackStorageFromPresentation(zeroTiming, {
      sounds: ["one_sound"],
      playStyle: "repeat",
    })?.priorityByte).toBe(3);
    expect(areaSoundPlaybackStorageFromPresentation(zeroTiming, {
      sounds: ["one_sound", "two_sound"],
      playStyle: "repeat",
    })?.priorityByte).toBe(20);
  });

  it("admits empty and duplicate lists but rejects arbitrary or malformed ResRefs", () => {
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: [], playStyle: "once",
    })?.sounds).toEqual([]);
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: ["rain_loop", "rain_loop"], playStyle: "once",
    })?.sounds).toEqual(["rain_loop", "rain_loop"]);
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: ["Rain-Loop"], playStyle: "once",
    })).toBeNull();
  });

  it.each([
    { ...repeatPositional, sounds: "rain_loop" },
    { ...repeatPositional, sounds: ["12345678901234567"] },
    { ...repeatPositional, sounds: Array(1025).fill("rain_loop") },
    { ...repeatPositional, loopingByte: 1, continuousByte: 1 },
    { ...repeatPositional, priorityByte: 3 },
    { ...repeatPositional, extra: true },
  ])("rejects malformed or derivation-inconsistent storage", (value) => {
    expect(readAreaSoundPlaybackStorage(value)).toBeNull();
  });

  it("rejects partial/unknown presentation and malformed source", () => {
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: [...repeatPositional.sounds],
    })).toBeNull();
    expect(areaSoundPlaybackStorageFromPresentation(repeatPositional, {
      sounds: [...repeatPositional.sounds], playStyle: "shuffle",
    })).toBeNull();
    expect(areaSoundPlaybackStorageFromPresentation({
      ...repeatPositional, priorityByte: 3,
    }, { sounds: [], playStyle: "once" })).toBeNull();
  });
});
