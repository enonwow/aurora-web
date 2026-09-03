import {
  AREA_SOUND_INTERVAL_VARIATION_STORAGE_REVISION,
  MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE,
  areaSoundIntervalVariationStoragesEqual,
  pitchVariationFloat32FromHundredths,
  readAreaSoundIntervalVariationStorage,
  readExistingAreaSoundIntervalVariationMutation,
} from "../../src/modules/areas/domain/area-sound-interval-variation-storage";

const source = () => ({
  intervalMilliseconds: 25000,
  intervalVariationMilliseconds: 5000,
  pitchVariationHundredths: 20,
  volumeVariationByte: 25,
});

describe("Existing Area sound interval/variation storage CAS", () => {
  it("freezes the exact admitted tuple and float32 pitch projection", () => {
    const parsed = readAreaSoundIntervalVariationStorage(source());

    expect(parsed).toEqual(source());
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(pitchVariationFloat32FromHundredths(20)).toBe(Math.fround(0.2));
    expect(AREA_SOUND_INTERVAL_VARIATION_STORAGE_REVISION)
      .toBe("aurora-area-sound-interval-variation-storage.v1");
    expect(MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE).toBe(1024);
  });

  it.each([
    ["missing member", { ...source(), intervalMilliseconds: undefined }],
    ["unknown member", { ...source(), priority: 20 }],
    ["fractional interval", { ...source(), intervalMilliseconds: 1000.5 }],
    ["interval above native bound", { ...source(), intervalMilliseconds: 60010 }],
    ["interval not on ten-millisecond grid", { ...source(), intervalMilliseconds: 1001 }],
    ["negative variation", { ...source(), intervalVariationMilliseconds: -10 }],
    ["pitch above one octave", { ...source(), pitchVariationHundredths: 101 }],
    ["volume variation above byte range", { ...source(), volumeVariationByte: 128 }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaSoundIntervalVariationStorage(value)).toBeNull();
  });

  it("compares every exact storage member", () => {
    expect(areaSoundIntervalVariationStoragesEqual(source(), source())).toBe(true);
    expect(areaSoundIntervalVariationStoragesEqual(source(), {
      ...source(),
      pitchVariationHundredths: 21,
    })).toBe(false);
  });

  it("reads and freezes one changed exact sound mutation", () => {
    const mutation = readExistingAreaSoundIntervalVariationMutation({
      kind: "sound",
      sourceObjectId: "sound-source-0",
      sourceIndex: 0,
      expectedValue: source(),
      value: { ...source(), volumeVariationByte: 127 },
    });

    expect(mutation).toEqual({
      kind: "sound",
      sourceObjectId: "sound-source-0",
      sourceIndex: 0,
      expectedValue: source(),
      value: { ...source(), volumeVariationByte: 127 },
    });
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.expectedValue)).toBe(true);
    expect(Object.isFrozen(mutation?.value)).toBe(true);
  });

  it.each([
    ["wrong family", { kind: "placeable", sourceObjectId: "x", sourceIndex: 0, expectedValue: source(), value: { ...source(), volumeVariationByte: 0 } }],
    ["empty source identity", { kind: "sound", sourceObjectId: "", sourceIndex: 0, expectedValue: source(), value: { ...source(), volumeVariationByte: 0 } }],
    ["fractional ordinal", { kind: "sound", sourceObjectId: "x", sourceIndex: 0.5, expectedValue: source(), value: { ...source(), volumeVariationByte: 0 } }],
    ["unknown member", { kind: "sound", sourceObjectId: "x", sourceIndex: 0, expectedValue: source(), value: { ...source(), volumeVariationByte: 0 }, mode: "replace" }],
    ["unchanged tuple", { kind: "sound", sourceObjectId: "x", sourceIndex: 0, expectedValue: source(), value: source() }],
  ])("rejects a mutation with %s", (_label, value) => {
    expect(readExistingAreaSoundIntervalVariationMutation(value)).toBeNull();
  });
});
