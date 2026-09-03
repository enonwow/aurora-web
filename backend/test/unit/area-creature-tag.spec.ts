import {
  isEditableAreaCreatureTag,
  readExistingAreaCreatureTagMutation,
  readExistingAreaCreatureTagStorage,
} from "../../src/modules/areas/domain/area-creature-tag";

describe("Existing Area Creature Tag domain", () => {
  it("admits exact absent and present provenance without normalization", () => {
    const absent = readExistingAreaCreatureTagStorage({ present: false });
    const empty = readExistingAreaCreatureTagStorage({ present: true, value: "" });
    const whitespace = readExistingAreaCreatureTagStorage({
      present: true,
      value: "  NW_GUARD  ",
    });

    expect(absent).toEqual({ present: false });
    expect(empty).toEqual({ present: true, value: "" });
    expect(whitespace).toEqual({ present: true, value: "  NW_GUARD  " });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(whitespace)).toBe(true);
  });

  it("admits only bounded no-NUL UTF-16 strings", () => {
    expect(isEditableAreaCreatureTag("")).toBe(true);
    expect(isEditableAreaCreatureTag(" A ")).toBe(true);
    expect(isEditableAreaCreatureTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaCreatureTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaCreatureTag("bad\0tag")).toBe(false);
    expect(isEditableAreaCreatureTag(15)).toBe(false);
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
    expect(readExistingAreaCreatureTagStorage(candidate)).toBeNull();
  });

  it("accepts and freezes one exact changed pair", () => {
    const mutation = readExistingAreaCreatureTagMutation({
      expectedValue: "NW_GUARD",
      value: "  NW_GUARD  ",
    });

    expect(mutation).toEqual({
      expectedValue: "NW_GUARD",
      value: "  NW_GUARD  ",
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
    expect(readExistingAreaCreatureTagMutation(candidate)).toBeNull();
  });
});
