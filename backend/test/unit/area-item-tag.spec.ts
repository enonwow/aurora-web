import {
  isEditableAreaItemTag,
  readExistingAreaItemTagMutation,
  readExistingAreaItemTagStorage,
} from "../../src/modules/areas/domain/area-item-tag";

describe("Existing Area ground-Item Tag domain", () => {
  it("admits exact absent and present provenance without normalization", () => {
    const absent = readExistingAreaItemTagStorage({ present: false });
    const empty = readExistingAreaItemTagStorage({ present: true, value: "" });
    const whitespace = readExistingAreaItemTagStorage({
      present: true,
      value: "  LOOT_CHEST  ",
    });

    expect(absent).toEqual({ present: false });
    expect(empty).toEqual({ present: true, value: "" });
    expect(whitespace).toEqual({ present: true, value: "  LOOT_CHEST  " });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(whitespace)).toBe(true);
  });

  it("admits only bounded no-NUL UTF-16 strings", () => {
    expect(isEditableAreaItemTag("")).toBe(true);
    expect(isEditableAreaItemTag(" A ")).toBe(true);
    expect(isEditableAreaItemTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaItemTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaItemTag("bad\0tag")).toBe(false);
    expect(isEditableAreaItemTag(15)).toBe(false);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "invented" },
    { present: true },
    { present: true, value: "valid", extra: true },
    { present: 1, value: "valid" },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "bad\0tag" },
    Object.assign(Object.create({}), { present: true, value: "valid" }),
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readExistingAreaItemTagStorage(candidate)).toBeNull();
  });

  it("accepts and freezes one exact changed pair", () => {
    const mutation = readExistingAreaItemTagMutation({
      expectedValue: "NW_CLOTH022",
      value: "  LOOT_CHEST  ",
    });

    expect(mutation).toEqual({
      expectedValue: "NW_CLOTH022",
      value: "  LOOT_CHEST  ",
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
    Object.assign(Object.create({}), { expectedValue: "old", value: "new" }),
  ])("rejects malformed or unchanged pair %#", (candidate) => {
    expect(readExistingAreaItemTagMutation(candidate)).toBeNull();
  });
});
