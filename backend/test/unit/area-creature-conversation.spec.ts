import {
  isAreaCreatureConversationSource,
  isAreaCreatureConversationTarget,
  readExistingAreaCreatureConversationMutation,
  readExistingAreaCreatureConversationStorage,
} from "../../src/modules/areas/domain/area-creature-conversation";

describe("Existing Area Creature Conversation domain", () => {
  it("admits exact absent, empty, lowercase, and legacy-uppercase source provenance", () => {
    const absent = readExistingAreaCreatureConversationStorage({ present: false });
    const empty = readExistingAreaCreatureConversationStorage({ present: true, value: "" });
    const lowercase = readExistingAreaCreatureConversationStorage({
      present: true,
      value: "guard_dialog",
    });
    const uppercase = readExistingAreaCreatureConversationStorage({
      present: true,
      value: "Guard_Dialog",
    });

    expect(absent).toEqual({ present: false });
    expect(empty).toEqual({ present: true, value: "" });
    expect(lowercase).toEqual({ present: true, value: "guard_dialog" });
    expect(uppercase).toEqual({ present: true, value: "Guard_Dialog" });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(empty)).toBe(true);
    expect(Object.isFrozen(lowercase)).toBe(true);
    expect(Object.isFrozen(uppercase)).toBe(true);
  });

  it("separates exact source admission from canonical lowercase targets", () => {
    expect(isAreaCreatureConversationSource("")).toBe(true);
    expect(isAreaCreatureConversationSource("Guard_Dialog")).toBe(true);
    expect(isAreaCreatureConversationSource("a234567890123456")).toBe(true);
    expect(isAreaCreatureConversationTarget("")).toBe(true);
    expect(isAreaCreatureConversationTarget("guard_dialog")).toBe(true);

    expect(isAreaCreatureConversationSource("bad-dialog")).toBe(false);
    expect(isAreaCreatureConversationSource("a2345678901234567")).toBe(false);
    expect(isAreaCreatureConversationSource(12)).toBe(false);
    expect(isAreaCreatureConversationTarget("Guard_Dialog")).toBe(false);
    expect(isAreaCreatureConversationTarget("bad dialog")).toBe(false);
    expect(isAreaCreatureConversationTarget(null)).toBe(false);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "" },
    { present: true },
    { present: true, value: "bad-dialog" },
    { present: true, value: "a2345678901234567" },
    { present: true, value: "guard_dialog", extra: true },
    Object.assign(Object.create({}), { present: true, value: "guard_dialog" }),
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readExistingAreaCreatureConversationStorage(candidate)).toBeNull();
  });

  it("accepts and freezes one exact changed pair", () => {
    const mutation = readExistingAreaCreatureConversationMutation({
      expectedResRef: "Guard_Dialog",
      resRef: "chicken_dialog",
    });

    expect(mutation).toEqual({
      expectedResRef: "Guard_Dialog",
      resRef: "chicken_dialog",
    });
    expect(Object.isFrozen(mutation)).toBe(true);
  });

  it.each([
    null,
    [],
    "dialog",
    { expectedResRef: "old" },
    { resRef: "new" },
    { expectedResRef: "old", resRef: "new", extra: true },
    { expectedResRef: "same", resRef: "same" },
    { expectedResRef: "bad-dialog", resRef: "new" },
    { expectedResRef: "old", resRef: "Bad_Target" },
    { expectedResRef: "old", resRef: "a2345678901234567" },
    Object.assign(Object.create({}), { expectedResRef: "old", resRef: "new" }),
  ])("rejects malformed, unchanged, or noncanonical target pair %#", (candidate) => {
    expect(readExistingAreaCreatureConversationMutation(candidate)).toBeNull();
  });
});
