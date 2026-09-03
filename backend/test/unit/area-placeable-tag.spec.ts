import {
  isEditableAreaPlaceableTag,
  readExistingAreaPlaceableTagMutation,
} from "../../src/modules/areas/domain/area-placeable-tag";

describe("Existing Area Placeable Tag mutation", () => {
  it("admits exact empty and 32-code-unit values without normalization", () => {
    expect(isEditableAreaPlaceableTag("")).toBe(true);
    expect(isEditableAreaPlaceableTag(" A ")).toBe(true);
    expect(isEditableAreaPlaceableTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaPlaceableTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaPlaceableTag("bad\0tag")).toBe(false);
    expect(isEditableAreaPlaceableTag(15)).toBe(false);
    expect(isEditableAreaPlaceableTag({ length: 0, includes: () => false })).toBe(false);
  });

  it("accepts and freezes one exact changed pair", () => {
    const mutation = readExistingAreaPlaceableTagMutation({
      expectedValue: "WaterTrough",
      value: " Water Trough ",
    });
    expect(mutation).toEqual({
      expectedValue: "WaterTrough",
      value: " Water Trough ",
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    "tag",
    { expectedValue: "old" },
    { value: "new" },
    { expectedValue: "old", value: "new", extra: true },
    { expectedValue: "same", value: "same" },
    { expectedValue: "x".repeat(33), value: "new" },
    { expectedValue: "old", value: "x".repeat(33) },
    { expectedValue: "old", value: "bad\0tag" },
  ])("rejects invalid pair %#", (candidate) => {
    expect(readExistingAreaPlaceableTagMutation(candidate)).toBeNull();
  });

  it("rejects a callable record even when it carries otherwise valid pair properties", () => {
    const candidate = Object.assign(() => undefined, {
      expectedValue: "old",
      value: "new",
    });
    expect(readExistingAreaPlaceableTagMutation(candidate)).toBeNull();
  });
});
