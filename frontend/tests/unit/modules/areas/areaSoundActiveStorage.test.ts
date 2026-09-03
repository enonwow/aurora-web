import { describe, expect, it } from "vitest";
import {
  areaSoundActiveStoragesEqual,
  cloneAreaSoundActiveStorage,
  readAreaSoundActiveStorage,
  soundActivePresentationFromStorage,
  soundActiveStorageFromPresentation,
} from "../../../../src/modules/areas/domain/areaSoundActiveStorage";

describe("Area Sound Active frontend storage", () => {
  it.each([0, 1])("admits and detaches canonical byte %i", (activeByte) => {
    const source = { activeByte };
    const clone = cloneAreaSoundActiveStorage(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(Object.isFrozen(clone)).toBe(true);
  });

  it("round-trips exact boolean presentation", () => {
    expect(soundActivePresentationFromStorage({ activeByte: 1 })).toEqual({ active: true });
    expect(soundActivePresentationFromStorage({ activeByte: 0 })).toEqual({ active: false });
    expect(soundActiveStorageFromPresentation({ active: true })).toEqual({ activeByte: 1 });
    expect(soundActiveStorageFromPresentation({ active: false })).toEqual({ activeByte: 0 });
  });

  it("rejects malformed storage and compares only exact admitted values", () => {
    expect(readAreaSoundActiveStorage({ activeByte: 2 })).toBeNull();
    expect(readAreaSoundActiveStorage({ activeByte: true })).toBeNull();
    expect(readAreaSoundActiveStorage({ activeByte: 1, extra: true })).toBeNull();
    expect(areaSoundActiveStoragesEqual({ activeByte: 1 }, { activeByte: 1 })).toBe(true);
    expect(areaSoundActiveStoragesEqual({ activeByte: 1 }, { activeByte: 0 })).toBe(false);
    expect(() => cloneAreaSoundActiveStorage({ activeByte: 2 })).toThrow(
      "Malformed Area sound Active storage.",
    );
  });
});
