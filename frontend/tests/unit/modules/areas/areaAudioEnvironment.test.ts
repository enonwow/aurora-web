import { describe, expect, it } from "vitest";
import {
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
} from "../../../../src/modules/areas/domain/areaAudioEnvironment";

const exact = () => ({
  ambientSoundDayId: 41,
  ambientSoundNightId: 42,
  ambientSoundDayVolume: 101,
  ambientSoundNightVolume: 102,
  environmentAudioId: 7,
  musicBattleId: 13,
  musicDayId: 11,
  musicNightId: 12,
  musicDelayMilliseconds: 3000,
});

describe("Area audio environment", () => {
  it("admits only the complete exact Aurora tuple", () => {
    expect(isAreaAudioEnvironment(exact())).toBe(true);
    expect(isAreaAudioEnvironment({ ...exact(), ambientSoundDayVolume: 128 })).toBe(false);
    expect(isAreaAudioEnvironment({ ...exact(), musicDelayMilliseconds: 3500 })).toBe(false);
    const { musicNightId: _removed, ...incomplete } = exact();
    expect(isAreaAudioEnvironment(incomplete)).toBe(false);
    expect(isAreaAudioEnvironment({ ...exact(), guessedResRef: "amb_city" })).toBe(false);
  });

  it("compares all nine fields", () => {
    expect(areaAudioEnvironmentsEqual(exact(), exact())).toBe(true);
    expect(areaAudioEnvironmentsEqual(
      exact(),
      { ...exact(), environmentAudioId: 8 },
    )).toBe(false);
  });
});
