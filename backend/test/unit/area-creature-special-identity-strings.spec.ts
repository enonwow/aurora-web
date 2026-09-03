import {
  isAreaCreatureSpecialIdentityString,
  readAreaCreatureSpecialIdentityStringStorage,
  readAreaCreatureSpecialIdentityStringsStorage,
  readExistingAreaCreatureSpecialIdentityStringMutation,
  readExistingAreaCreatureSpecialIdentityStringsMutation,
} from "../../src/modules/areas/domain/area-creature-special-identity-strings";

describe("Existing Area Creature Subrace / Deity domain", () => {
  it("admits empty and bounded printable ASCII without normalization", () => {
    expect(isAreaCreatureSpecialIdentityString("")).toBe(true);
    expect(isAreaCreatureSpecialIdentityString("  Red Wizard  ")).toBe(true);
    expect(isAreaCreatureSpecialIdentityString("x".repeat(256))).toBe(true);
    expect(isAreaCreatureSpecialIdentityString("x".repeat(257))).toBe(false);
    expect(isAreaCreatureSpecialIdentityString("line\nbreak")).toBe(false);
    expect(isAreaCreatureSpecialIdentityString("Bóstwo")).toBe(false);
    expect(isAreaCreatureSpecialIdentityString(1)).toBe(false);
  });

  it("reads and freezes exact presence-sensitive native storage", () => {
    const absent = readAreaCreatureSpecialIdentityStringStorage({ present: false });
    const present = readAreaCreatureSpecialIdentityStringStorage({
      present: true,
      nativeType: "cexostring",
      value: "",
    });
    expect(absent).toEqual({ present: false });
    expect(present).toEqual({ present: true, nativeType: "cexostring", value: "" });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
  });

  it.each([
    { present: true, nativeType: "cexolocstring", value: "Elf" },
    { present: true, nativeType: "cexostring", value: "bad\tvalue" },
    { present: true, nativeType: "cexostring", value: "x".repeat(257) },
    { present: true, nativeType: "cexostring", value: "Elf", extra: true },
    { present: false, value: "" },
  ])("rejects malformed member storage %#", (candidate) => {
    expect(readAreaCreatureSpecialIdentityStringStorage(candidate)).toBeNull();
  });

  it("reads one exact two-member storage group", () => {
    const input = {
      subrace: { present: true, nativeType: "cexostring", value: "Moon Elf" },
      deity: { present: false },
    };
    const parsed = readAreaCreatureSpecialIdentityStringsStorage(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(parsed?.subrace)).toBe(true);
    expect(Object.isFrozen(parsed?.deity)).toBe(true);
    expect(readAreaCreatureSpecialIdentityStringsStorage({ ...input, extra: true })).toBeNull();
  });

  it("reads independently changed member pairs and freezes the group", () => {
    const member = readExistingAreaCreatureSpecialIdentityStringMutation({
      expectedValue: "Moon Elf",
      value: "Sun Elf",
    });
    expect(member).toEqual({ expectedValue: "Moon Elf", value: "Sun Elf" });
    expect(Object.isFrozen(member)).toBe(true);

    const group = readExistingAreaCreatureSpecialIdentityStringsMutation({
      subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
      deity: { expectedValue: "", value: "Mystra" },
    });
    expect(group).toEqual({
      subrace: { expectedValue: "Moon Elf", value: "Sun Elf" },
      deity: { expectedValue: "", value: "Mystra" },
    });
    expect(Object.isFrozen(group)).toBe(true);
    expect(Object.isFrozen(group?.subrace)).toBe(true);
    expect(Object.isFrozen(group?.deity)).toBe(true);
  });

  it.each([
    {},
    { subrace: { expectedValue: "same", value: "same" } },
    { deity: { expectedValue: "", value: "bad\nvalue" } },
    { subrace: { expectedValue: "old", value: "new" }, extra: true },
    { subrace: { expectedValue: "old", value: "new", extra: true } },
  ])("rejects empty, malformed, unchanged, or aliased mutation groups %#", (candidate) => {
    expect(readExistingAreaCreatureSpecialIdentityStringsMutation(candidate)).toBeNull();
  });
});
