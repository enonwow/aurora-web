import { describe, expect, it } from "vitest";
import {
  isEditableCreatureTag,
  readCreatureTagStorage,
} from "../../../../../src/modules/scene/domain/creatureTag";

describe("Creature Tag domain", () => {
  it("admits exact absent, empty and whitespace-bearing provenance", () => {
    expect(readCreatureTagStorage({ present: false })).toEqual({ present: false });
    expect(readCreatureTagStorage({ present: true, value: "" })).toEqual({
      present: true,
      value: "",
    });
    expect(readCreatureTagStorage({ present: true, value: "  NW_GUARD  " })).toEqual({
      present: true,
      value: "  NW_GUARD  ",
    });
  });

  it("admits only bounded no-NUL UTF-16 strings", () => {
    expect(isEditableCreatureTag("")).toBe(true);
    expect(isEditableCreatureTag(" A ")).toBe(true);
    expect(isEditableCreatureTag("x".repeat(32))).toBe(true);
    expect(isEditableCreatureTag("x".repeat(33))).toBe(false);
    expect(isEditableCreatureTag("bad\0tag")).toBe(false);
    expect(isEditableCreatureTag(1)).toBe(false);
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
    expect(readCreatureTagStorage(candidate)).toBeNull();
  });
});
