import { describe, expect, it } from "vitest";
import {
  areaSoundVolumeStoragesEqual,
  cloneAreaSoundVolumeStorage,
  readAreaSoundVolumeStorage,
  soundVolumePresentationFromStorage,
  soundVolumeStorageFromPresentation,
} from "../../../../src/modules/areas/domain/areaSoundVolumeStorage";

describe("Area Sound base-volume frontend storage", () => {
  it.each([0, 1, 64, 127])("admits and detaches raw byte %i", (volumeByte) => {
    const source = { volumeByte };
    const clone = cloneAreaSoundVolumeStorage(source);
    expect(clone).toEqual(source);
    expect(clone).not.toBe(source);
    expect(Object.isFrozen(clone)).toBe(true);
  });

  it("round-trips exact normalized presentation", () => {
    expect(soundVolumePresentationFromStorage({ volumeByte: 64 })).toEqual({
      volume: 64 / 127,
    });
    expect(soundVolumeStorageFromPresentation({ volume: 64 / 127 })).toEqual({
      volumeByte: 64,
    });
  });

  it.each([-0.01, 0.5, 1.01, Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects noncanonical presentation %s",
    (volume) => {
      expect(soundVolumeStorageFromPresentation({ volume })).toBeNull();
    },
  );

  it("rejects malformed storage and compares only exact admitted values", () => {
    expect(readAreaSoundVolumeStorage({ volumeByte: 128 })).toBeNull();
    expect(readAreaSoundVolumeStorage({ volumeByte: 64, extra: true })).toBeNull();
    expect(areaSoundVolumeStoragesEqual({ volumeByte: 64 }, { volumeByte: 64 })).toBe(true);
    expect(areaSoundVolumeStoragesEqual({ volumeByte: 64 }, { volumeByte: 65 })).toBe(false);
    expect(() => cloneAreaSoundVolumeStorage({ volumeByte: 128 })).toThrow(
      "Malformed Area sound base-volume storage.",
    );
  });
});
