import { describe, expect, it } from "vitest";
import {
  isEditableItemTag,
  readItemTagStorage,
} from "../../../../../src/modules/scene/domain/itemTag";

describe("ground-Item Tag domain", () => {
  it("admits exact absent, empty, and whitespace-bearing provenance", () => {
    expect(readItemTagStorage({ present: false })).toEqual({ present: false });
    expect(readItemTagStorage({ present: true, value: "" })).toEqual({
      present: true,
      value: "",
    });
    expect(readItemTagStorage({ present: true, value: "  LOOT_CHEST  " })).toEqual({
      present: true,
      value: "  LOOT_CHEST  ",
    });
  });

  it("admits only bounded no-NUL UTF-16 strings", () => {
    expect(isEditableItemTag("")).toBe(true);
    expect(isEditableItemTag(" A ")).toBe(true);
    expect(isEditableItemTag("x".repeat(32))).toBe(true);
    expect(isEditableItemTag("x".repeat(33))).toBe(false);
    expect(isEditableItemTag("bad\0tag")).toBe(false);
    expect(isEditableItemTag(1)).toBe(false);
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
    expect(readItemTagStorage(candidate)).toBeNull();
  });
});
