import {
  areaSoundIntervalVariationStoragesEqual,
  cloneAreaSoundIntervalVariationStorage,
  readAreaSoundIntervalVariationStorage,
  soundIntervalVariationPresentationFromStorage,
  soundIntervalVariationStorageFromPresentation,
} from "../../../../src/modules/areas/domain/areaSoundIntervalVariationStorage";

const storage = () => ({
  intervalMilliseconds: 25000,
  intervalVariationMilliseconds: 5000,
  pitchVariationHundredths: 20,
  volumeVariationByte: 25,
});

describe("Area sound interval/variation frontend storage", () => {
  it("detaches exact immutable storage and derives presentation values", () => {
    const clone = cloneAreaSoundIntervalVariationStorage(storage());

    expect(clone).toEqual(storage());
    expect(clone).not.toBe(storage());
    expect(Object.isFrozen(clone)).toBe(true);
    expect(soundIntervalVariationPresentationFromStorage(clone)).toEqual({
      intervalMs: 25000,
      intervalVariationMs: 5000,
      pitchVariation: Math.fround(0.2),
      volumeVariation: 25 / 127,
    });
  });

  it("materializes exact native-grid storage from admitted presentation", () => {
    expect(soundIntervalVariationStorageFromPresentation({
      intervalMs: 60000,
      intervalVariationMs: 0,
      pitchVariation: 0.45,
      volumeVariation: 1,
    })).toEqual({
      intervalMilliseconds: 60000,
      intervalVariationMilliseconds: 0,
      pitchVariationHundredths: 45,
      volumeVariationByte: 127,
    });
  });

  it.each([
    ["off-grid interval", { intervalMs: 1001, intervalVariationMs: 0, pitchVariation: 0, volumeVariation: 0 }],
    ["negative variation", { intervalMs: 1000, intervalVariationMs: -10, pitchVariation: 0, volumeVariation: 0 }],
    ["non-hundredth pitch", { intervalMs: 1000, intervalVariationMs: 0, pitchVariation: 0.205, volumeVariation: 0 }],
    ["off-byte volume", { intervalMs: 1000, intervalVariationMs: 0, pitchVariation: 0, volumeVariation: 0.5 }],
  ])("rejects %s presentation", (_label, value) => {
    expect(soundIntervalVariationStorageFromPresentation(value)).toBeNull();
  });

  it("rejects loose storage and compares every member", () => {
    expect(readAreaSoundIntervalVariationStorage({ ...storage(), extra: true })).toBeNull();
    expect(areaSoundIntervalVariationStoragesEqual(storage(), storage())).toBe(true);
    expect(areaSoundIntervalVariationStoragesEqual(storage(), {
      ...storage(),
      intervalVariationMilliseconds: 5010,
    })).toBe(false);
  });
});
