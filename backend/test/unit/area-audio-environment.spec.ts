import {
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
} from "../../src/modules/areas/domain/area-audio-environment";

describe("Area audio-environment contract", () => {
  const source = Object.freeze({
    ambientSoundDayId: 31,
    ambientSoundNightId: 32,
    ambientSoundDayVolume: 0,
    ambientSoundNightVolume: 127,
    environmentAudioId: 104,
    musicBattleId: 34,
    musicDayId: 20,
    musicNightId: 21,
    musicDelayMilliseconds: 90_000,
  });

  it("accepts one complete Toolset-stable nine-member tuple", () => {
    expect(isAreaAudioEnvironment(source)).toBe(true);
    expect(isAreaAudioEnvironment({
      ...source,
      ambientSoundDayId: 0,
      ambientSoundNightId: 0x7fff_ffff,
      musicDelayMilliseconds: -99_000,
    })).toBe(true);
  });

  it.each([
    ["missing member", (({ musicDayId: _removed, ...value }) => value)(source)],
    ["unknown member", { ...source, guessedResRef: "amb_forest_day" }],
    ["negative ID", { ...source, environmentAudioId: -1 }],
    ["ID beyond signed INT", { ...source, musicNightId: 0x8000_0000 }],
    ["fractional ID", { ...source, musicBattleId: 3.5 }],
    ["volume below range", { ...source, ambientSoundDayVolume: -1 }],
    ["volume above range", { ...source, ambientSoundNightVolume: 128 }],
    ["fractional volume", { ...source, ambientSoundDayVolume: 31.5 }],
    ["delay below UI range", { ...source, musicDelayMilliseconds: -100_000 }],
    ["delay above UI range", { ...source, musicDelayMilliseconds: 100_000 }],
    ["delay not whole Toolset seconds", { ...source, musicDelayMilliseconds: 90_001 }],
    ["non-number", { ...source, musicDayId: "20" }],
  ])("rejects %s", (_label, value) => {
    expect(isAreaAudioEnvironment(value)).toBe(false);
  });

  it("compares all nine members without normalization", () => {
    expect(areaAudioEnvironmentsEqual(source, { ...source })).toBe(true);
    for (const key of Object.keys(source) as Array<keyof typeof source>) {
      const changed = {
        ...source,
        [key]: key.includes("Volume") ? 64 : key === "musicDelayMilliseconds" ? 0 : 1,
      };
      expect(areaAudioEnvironmentsEqual(source, changed)).toBe(false);
    }
    expect(areaAudioEnvironmentsEqual(source, { ...source, extra: 1 })).toBe(false);
  });
});
