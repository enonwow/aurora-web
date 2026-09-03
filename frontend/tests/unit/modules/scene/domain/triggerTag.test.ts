import {
  canEditExistingTriggerTag,
  isEditableTriggerTag,
  readTriggerTagStorage,
} from "../../../../../src/modules/scene/domain/triggerTag";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "trigger" as const,
  sourceIndex: 0,
  triggerTag: { present: true as const, value: "GenericTrigger" },
};

describe("retained Trigger Tag domain", () => {
  it("preserves exact absent, empty, and whitespace storage", () => {
    expect(readTriggerTagStorage({ present: false })).toEqual({ present: false });
    expect(readTriggerTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readTriggerTagStorage({ present: true, value: "  EXIT  " }))
      .toEqual({ present: true, value: "  EXIT  " });
  });

  it("enforces the Toolset field boundary", () => {
    expect(isEditableTriggerTag("")).toBe(true);
    expect(isEditableTriggerTag("x".repeat(32))).toBe(true);
    expect(isEditableTriggerTag("x".repeat(33))).toBe(false);
    expect(isEditableTriggerTag("bad\0tag")).toBe(false);
  });

  it("activates only for exact retained Trigger provenance", () => {
    expect(canEditExistingTriggerTag(exactSource)).toBe(true);
    expect(canEditExistingTriggerTag({
      ...exactSource,
      triggerTag: { present: false },
    })).toBe(false);
    expect(canEditExistingTriggerTag({ ...exactSource, sourceKind: "encounter" }))
      .toBe(false);
    expect(canEditExistingTriggerTag({ ...exactSource, sourceIndex: undefined }))
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
    expect(readTriggerTagStorage(candidate)).toBeNull();
  });
});
