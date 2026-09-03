import { describe, expect, it } from "vitest";
import {
  canEditExistingCreatureConversation,
  materializeExistingCreatureConversation,
  reduceExistingCreatureConversation,
} from "../../../../../src/modules/layout/application/creatureConversationProvenance";
import type { SceneObjectSourceMetadata } from "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "creature",
  sourceIndex: 0,
  creatureConversation: { present: true, value: "Guard_Dialog" },
};

describe("existing Creature Conversation provenance", () => {
  it("activates only exact present native Creature provenance", () => {
    expect(canEditExistingCreatureConversation(exactSource)).toBe(true);
    expect(canEditExistingCreatureConversation({
      ...exactSource,
      creatureConversation: { present: false },
    })).toBe(false);
    expect(canEditExistingCreatureConversation({
      ...exactSource,
      sourceKind: "placeable",
    })).toBe(false);
    expect(canEditExistingCreatureConversation({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
    expect(canEditExistingCreatureConversation({
      ...exactSource,
      creatureConversation: { present: true, value: "bad-dialog" },
    })).toBe(false);
  });

  it("reduces canonical lowercase targets verbatim, including empty", () => {
    expect(reduceExistingCreatureConversation(
      exactSource,
      "Guard_Dialog",
      "guard_dialog",
    )).toBe("guard_dialog");
    expect(reduceExistingCreatureConversation(
      exactSource,
      "Guard_Dialog",
      "",
    )).toBe("");
  });

  it.each([
    ["uppercase", "Guard_Dialog"],
    ["punctuation", "guard-dialog"],
    ["over budget", "x".repeat(17)],
    ["non-string", 42],
  ])("fails closed for a %s candidate", (_label, candidate) => {
    expect(reduceExistingCreatureConversation(
      exactSource,
      "guard_dialog",
      candidate,
    )).toBe("guard_dialog");
  });

  it("materializes only provenance-bound canonical targets", () => {
    expect(materializeExistingCreatureConversation(
      exactSource,
      "Guard_Dialog",
      "guard_dialog",
    )).toBe("guard_dialog");
    expect(materializeExistingCreatureConversation(
      { ...exactSource, creatureConversation: { present: false } },
      "Guard_Dialog",
      "guard_dialog",
    )).toBe("Guard_Dialog");
    expect(materializeExistingCreatureConversation(
      exactSource,
      "Guard_Dialog",
      "Guard_Dialog",
    )).toBe("Guard_Dialog");
  });
});
