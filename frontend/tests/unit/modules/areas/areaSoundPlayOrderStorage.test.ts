import { describe, expect, it } from "vitest";
import {
  areaSoundPlayOrderStoragesEqual,
  cloneAreaSoundPlayOrderStorage,
  readAreaSoundPlayOrderStorage,
  soundPlayOrderPresentationFromStorage,
  soundPlayOrderStorageFromPresentation,
} from "../../../../src/modules/areas/domain/areaSoundPlayOrderStorage";

describe("Area Sound Play Order frontend storage", () => {
  it.each([0, 1])("admits and detaches canonical byte %i", (randomByte) => {
    const source = { randomByte };
    const clone = cloneAreaSoundPlayOrderStorage(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(Object.isFrozen(clone)).toBe(true);
  });

  it("round-trips the exact Toolset presentation", () => {
    expect(soundPlayOrderPresentationFromStorage({ randomByte: 0 })).toEqual({
      playOrder: "sequential",
    });
    expect(soundPlayOrderPresentationFromStorage({ randomByte: 1 })).toEqual({
      playOrder: "random",
    });
    expect(soundPlayOrderStorageFromPresentation({ playOrder: "sequential" })).toEqual({
      randomByte: 0,
    });
    expect(soundPlayOrderStorageFromPresentation({ playOrder: "random" })).toEqual({
      randomByte: 1,
    });
  });

  it("rejects malformed storage and presentation", () => {
    expect(readAreaSoundPlayOrderStorage({ randomByte: 2 })).toBeNull();
    expect(readAreaSoundPlayOrderStorage({ randomByte: true })).toBeNull();
    expect(readAreaSoundPlayOrderStorage({ randomByte: 1, extra: true })).toBeNull();
    expect(soundPlayOrderStorageFromPresentation({ playOrder: "shuffle" })).toBeNull();
    expect(() => cloneAreaSoundPlayOrderStorage({ randomByte: 2 })).toThrow(
      "Malformed Area sound Play Order storage.",
    );
  });

  it("compares only exact admitted values", () => {
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 1 })).toBe(true);
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 0 })).toBe(false);
    expect(areaSoundPlayOrderStoragesEqual({ randomByte: 1 }, { randomByte: 1, extra: 1 })).toBe(false);
  });
});
