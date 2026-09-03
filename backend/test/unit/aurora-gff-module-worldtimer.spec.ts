import { parseAuroraWorldTimerFromModuleIfo } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-worldtimer";
import {
  buildGffBuffer,
  type SupportedGffField
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

function buildModuleIfo(fields: SupportedGffField[]): Buffer {
  return buildGffBuffer(fields, "IFO ", 0);
}

describe("Aurora module.ifo world timer", () => {
  it("derives the native millisecond seed and day period", () => {
    const contract = parseAuroraWorldTimerFromModuleIfo(
      buildModuleIfo([
        { label: "Mod_MinPerHour", type: "byte", value: 2 },
        { label: "Mod_StartHour", type: "byte", value: 6 }
      ]),
      "modules/current/module.ifo"
    );

    expect(contract).toMatchObject({
      version: "aurora-worldtimer/v1",
      status: "ready",
      source: "module-ifo",
      sourceObjectKey: "modules/current/module.ifo",
      minutesPerHour: 2,
      startHour: 6,
      startTimeOfDayMs: 720_000,
      dayLengthMs: 2_880_000,
      tickUnit: "milliseconds",
      advanceMode: "scene-animation-delta"
    });
    expect(contract?.sourceHash).toMatch(/^[a-f0-9]{64}$/u);
    expect(contract?.fingerprint).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("applies CWorldTimer's zero-minutes-per-hour clamp", () => {
    const contract = parseAuroraWorldTimerFromModuleIfo(
      buildModuleIfo([
        { label: "Mod_MinPerHour", type: "byte", value: 0 },
        { label: "Mod_StartHour", type: "byte", value: 25 }
      ]),
      "modules/current/module.ifo"
    );

    expect(contract).toMatchObject({
      minutesPerHour: 1,
      startHour: 23,
      startTimeOfDayMs: 1_380_000,
      dayLengthMs: 1_440_000
    });
  });

  it("refuses an incomplete IFO instead of inventing a clock", () => {
    expect(
      parseAuroraWorldTimerFromModuleIfo(
        buildModuleIfo([{ label: "Mod_StartHour", type: "byte", value: 6 }]),
        "modules/current/module.ifo"
      )
    ).toBeNull();
  });
});
