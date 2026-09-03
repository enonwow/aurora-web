import {
  canEditExistingEncounterTag,
  isEditableEncounterTag,
  readEncounterTagStorage,
} from "../../../../../src/modules/scene/domain/encounterTag";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 0,
  encounterTag: { present: true as const, value: "X2_GNOLL001" },
};

describe("retained Encounter Tag domain", () => {
  it("preserves exact absent, empty, and whitespace storage", () => {
    expect(readEncounterTagStorage({ present: false })).toEqual({ present: false });
    expect(readEncounterTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readEncounterTagStorage({ present: true, value: "  GNOLL  " }))
      .toEqual({ present: true, value: "  GNOLL  " });
  });

  it("enforces the Toolset field boundary", () => {
    expect(isEditableEncounterTag("")).toBe(true);
    expect(isEditableEncounterTag("x".repeat(32))).toBe(true);
    expect(isEditableEncounterTag("x".repeat(33))).toBe(false);
    expect(isEditableEncounterTag("bad\0tag")).toBe(false);
  });

  it("activates only for exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterTag(exactSource)).toBe(true);
    expect(canEditExistingEncounterTag({
      ...exactSource,
      encounterTag: { present: false },
    })).toBe(false);
    expect(canEditExistingEncounterTag({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingEncounterTag({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
  });

  it.each([
    null,
    {},
    { present: true },
    { present: false, value: "invented" },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "ok", extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readEncounterTagStorage(candidate)).toBeNull();
  });
});
