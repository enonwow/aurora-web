import {
  isEditableAreaTriggerTag,
  readExistingAreaTriggerTagMutation,
  readExistingAreaTriggerTagStorage,
} from "../../src/modules/areas/domain/area-trigger-tag";

describe("existing Area Trigger Tag contract", () => {
  it("keeps absent, empty, and whitespace storage distinct", () => {
    expect(readExistingAreaTriggerTagStorage({ present: false }))
      .toEqual({ present: false });
    expect(readExistingAreaTriggerTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readExistingAreaTriggerTagStorage({ present: true, value: "  EXIT  " }))
      .toEqual({ present: true, value: "  EXIT  " });
  });

  it("enforces the exact 32-code-unit and no-NUL boundary", () => {
    expect(isEditableAreaTriggerTag("")).toBe(true);
    expect(isEditableAreaTriggerTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaTriggerTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaTriggerTag("bad\0tag")).toBe(false);
    expect(isEditableAreaTriggerTag(1)).toBe(false);
  });

  it.each([
    null,
    {},
    { present: false, value: "invented" },
    { present: true },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "ok", extra: true },
  ])("rejects malformed source storage %#", (candidate) => {
    expect(readExistingAreaTriggerTagStorage(candidate)).toBeNull();
  });

  it("admits one exact changed compare-and-swap pair", () => {
    expect(readExistingAreaTriggerTagMutation({
      expectedValue: "GenericTrigger",
      value: "  AREA_EXIT  ",
    })).toEqual({
      expectedValue: "GenericTrigger",
      value: "  AREA_EXIT  ",
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
    expect(readExistingAreaTriggerTagMutation(candidate)).toBeNull();
  });
});
