import { describe, expect, it } from "vitest";
import {
  MAX_CREATURE_CONVERSATION_RESREF_BYTES,
  canEditExistingCreatureConversation,
  isCreatureConversationSourceResRef,
  isCreatureConversationTargetResRef,
  readCreatureConversationStorage,
} from "../../../../../src/modules/scene/domain/creatureConversation";

describe("Creature Conversation provenance", () => {
  it("accepts exact empty or ASCII source ResRefs without normalization", () => {
    expect(MAX_CREATURE_CONVERSATION_RESREF_BYTES).toBe(16);
    expect(isCreatureConversationSourceResRef("")).toBe(true);
    expect(isCreatureConversationSourceResRef("Guard_Dialog")).toBe(true);
    expect(readCreatureConversationStorage({
      present: true,
      value: "Guard_Dialog",
    })).toEqual({ present: true, value: "Guard_Dialog" });
    expect(readCreatureConversationStorage({ present: false })).toEqual({ present: false });
  });

  it("requires a canonical lowercase target and never silently case-folds", () => {
    expect(isCreatureConversationTargetResRef("")).toBe(true);
    expect(isCreatureConversationTargetResRef("guard_dialog")).toBe(true);
    expect(isCreatureConversationTargetResRef("Guard_Dialog")).toBe(false);
    expect(isCreatureConversationTargetResRef("bad-dialog")).toBe(false);
    expect(isCreatureConversationTargetResRef("a2345678901234567")).toBe(false);
  });

  it.each([
    null,
    [],
    { present: false, value: "" },
    { present: true },
    { present: true, value: "bad-dialog" },
    { present: true, value: "a2345678901234567" },
    { present: true, value: "guard_dialog", extra: true },
  ])("rejects malformed storage %#", (input) => {
    expect(readCreatureConversationStorage(input)).toBeNull();
  });

  it("activates editing only for exact present retained Creature provenance", () => {
    const exact = {
      type: "aurora_git" as const,
      sourceKind: "creature" as const,
      sourceIndex: 0,
      creatureConversation: { present: true as const, value: "Guard_Dialog" },
    };
    expect(canEditExistingCreatureConversation(exact)).toBe(true);
    expect(canEditExistingCreatureConversation({
      ...exact,
      creatureConversation: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureConversation({ ...exact, sourceKind: "placeable" })).toBe(false);
    expect(canEditExistingCreatureConversation({ ...exact, sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureConversation(undefined)).toBe(false);
  });
});
