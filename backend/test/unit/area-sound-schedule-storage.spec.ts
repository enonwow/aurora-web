import {
  areaSoundScheduleStoragesEqual,
  readAreaSoundScheduleStorage,
  readExistingAreaSoundScheduleMutation,
} from "../../src/modules/areas/domain/area-sound-schedule-storage";

describe("Area Sound schedule storage", () => {
  it.each([
    [0, 0],
    [1, 1],
    [0x800001, 2],
    [0xffffff, 3],
  ])("admits exact Hours 0x%s and Times %i", (hoursMask, timesByte) => {
    const result = readAreaSoundScheduleStorage({ hoursMask, timesByte });
    expect(result).toEqual({ hoursMask, timesByte });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it.each([
    ["negative Hours", { hoursMask: -1, timesByte: 0 }],
    ["high Hours bit", { hoursMask: 0x1000000, timesByte: 0 }],
    ["fractional Hours", { hoursMask: 1.5, timesByte: 0 }],
    ["negative Times", { hoursMask: 0, timesByte: -1 }],
    ["unsupported Times", { hoursMask: 0, timesByte: 4 }],
    ["fractional Times", { hoursMask: 0, timesByte: 1.5 }],
    ["missing member", { hoursMask: 0 }],
    ["unexpected key", { hoursMask: 0, timesByte: 3, extra: true }],
  ])("rejects %s", (_label, value) => {
    expect(readAreaSoundScheduleStorage(value)).toBeNull();
  });

  it("compares only admitted exact tuples", () => {
    expect(areaSoundScheduleStoragesEqual(
      { hoursMask: 5, timesByte: 0 },
      { hoursMask: 5, timesByte: 0 },
    )).toBe(true);
    expect(areaSoundScheduleStoragesEqual(
      { hoursMask: 5, timesByte: 0 },
      { hoursMask: 5, timesByte: 3 },
    )).toBe(false);
    expect(areaSoundScheduleStoragesEqual(
      { hoursMask: 5, timesByte: 0 },
      { hoursMask: 5, timesByte: 0, extra: true },
    )).toBe(false);
  });

  it("admits one complete changed source-bound mutation", () => {
    const result = readExistingAreaSoundScheduleMutation({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 3,
      expectedValue: { hoursMask: 0xffffff, timesByte: 3 },
      value: { hoursMask: 0x800001, timesByte: 0 },
    });
    expect(result).toEqual({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 3,
      expectedValue: { hoursMask: 0xffffff, timesByte: 3 },
      value: { hoursMask: 0x800001, timesByte: 0 },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.expectedValue)).toBe(true);
    expect(Object.isFrozen(result?.value)).toBe(true);
  });

  it.each([
    ["unchanged", {
      expectedValue: { hoursMask: 0, timesByte: 3 },
      value: { hoursMask: 0, timesByte: 3 },
    }],
    ["wrong kind", { kind: "placeable" }],
    ["invalid ordinal", { sourceIndex: -1 }],
    ["invalid expected", { expectedValue: { hoursMask: 0x1000000, timesByte: 0 } }],
    ["invalid target", { value: { hoursMask: 0, timesByte: 4 } }],
    ["unexpected key", { extra: true }],
  ])("rejects %s mutation", (_label, overrides) => {
    expect(readExistingAreaSoundScheduleMutation({
      kind: "sound",
      sourceObjectId: "obj_snd_animalcriesday",
      sourceIndex: 0,
      expectedValue: { hoursMask: 0, timesByte: 3 },
      value: { hoursMask: 1, timesByte: 0 },
      ...overrides,
    })).toBeNull();
  });
});
