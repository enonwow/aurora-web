import {
  isEditableAreaEncounterTag,
  readExistingAreaEncounterTagMutation,
  readExistingAreaEncounterTagStorage,
} from "../../src/modules/areas/domain/area-encounter-tag";

describe("existing Area Encounter Tag contract", () => {
  it("keeps absent, empty, and whitespace storage distinct", () => {
    expect(readExistingAreaEncounterTagStorage({ present: false }))
      .toEqual({ present: false });
    expect(readExistingAreaEncounterTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readExistingAreaEncounterTagStorage({ present: true, value: "  GNOLL  " }))
      .toEqual({ present: true, value: "  GNOLL  " });
  });

  it("enforces the exact shared 32-code-unit and no-NUL boundary", () => {
    expect(isEditableAreaEncounterTag("")).toBe(true);
    expect(isEditableAreaEncounterTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaEncounterTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaEncounterTag("bad\0tag")).toBe(false);
    expect(isEditableAreaEncounterTag(1)).toBe(false);
  });

  it.each([
    null,
    {},
    { present: false, value: "invented" },
    { present: true },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "ok", extra: true },
  ])("rejects malformed source storage %#", (candidate) => {
    expect(readExistingAreaEncounterTagStorage(candidate)).toBeNull();
  });

  it("admits one exact changed compare-and-swap pair", () => {
    expect(readExistingAreaEncounterTagMutation({
      expectedValue: "X2_GNOLL001",
      value: "  GNOLL_AMBUSH  ",
    })).toEqual({
      expectedValue: "X2_GNOLL001",
      value: "  GNOLL_AMBUSH  ",
    });
  });

  it.each([
    null,
    {},
    { expectedValue: "same", value: "same" },
    { expectedValue: "ok", value: "bad\0tag" },
    { expectedValue: "ok", value: "x".repeat(33) },
    { expectedValue: "old", value: "new", extra: true },
  ])("rejects malformed or no-op mutation %#", (candidate) => {
    expect(readExistingAreaEncounterTagMutation(candidate)).toBeNull();
  });
});
