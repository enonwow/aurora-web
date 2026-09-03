import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableConversation,
  canEditExistingPlaceableInterruptable,
  materializeExistingPlaceableConversationInterruptable,
  reduceExistingPlaceableConversation,
  reduceExistingPlaceableNoInterrupt
} from "../../../../../src/modules/layout/application/placeableConversationInterruptableProvenance";

const advancedSettings = {
  blueprintResRef: "plc_watertrough",
  belongsToFaction: "Hostile",
  conversation: "",
  noInterrupt: true,
  portraitResRef: "",
  initialState: "Default",
  treasureModel: "Default"
};

describe("existing Placeable Conversation/Interruptable provenance", () => {
  const source = {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableConversation: "",
    placeableInterruptable: 0
  };

  it("admits explicitly empty Conversation and native Interruptable zero", () => {
    expect(canEditExistingPlaceableConversation(source)).toBe(true);
    expect(canEditExistingPlaceableInterruptable(source)).toBe(true);
  });

  it("rejects absent, invalid, and cross-family provenance independently", () => {
    expect(canEditExistingPlaceableConversation({
      type: "aurora_git",
      sourceKind: "placeable"
    })).toBe(false);
    expect(canEditExistingPlaceableConversation({
      ...source,
      placeableConversation: "bad-conversation"
    })).toBe(false);
    expect(canEditExistingPlaceableInterruptable({
      ...source,
      placeableInterruptable: 2
    })).toBe(false);
    expect(canEditExistingPlaceableConversation({ ...source, type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableInterruptable({
      ...source,
      sourceKind: "creature"
    })).toBe(false);
  });

  it("reduces only valid values with their exact independent provenance", () => {
    expect(reduceExistingPlaceableConversation(source, "", "new_conv_01")).toBe("new_conv_01");
    expect(reduceExistingPlaceableConversation(source, "keep", "bad-conv")).toBe("keep");
    expect(reduceExistingPlaceableNoInterrupt(source, true, false)).toBe(false);
    expect(reduceExistingPlaceableNoInterrupt({
      ...source,
      placeableInterruptable: undefined
    }, true, false)).toBe(true);
  });

  it("materializes proven values and preserves absent provenance without creating fields", () => {
    const result = materializeExistingPlaceableConversationInterruptable({
      ...source,
      placeableInterruptable: undefined
    }, advancedSettings, {
      ...advancedSettings,
      conversation: "new_conv",
      noInterrupt: false,
      portraitResRef: "new_portrait"
    });

    expect(result).toEqual({
      ...advancedSettings,
      conversation: "new_conv",
      noInterrupt: true
    });

    const provenInterruptable = materializeExistingPlaceableConversationInterruptable(
      source,
      advancedSettings,
      { ...advancedSettings, noInterrupt: false }
    );
    expect(provenInterruptable.noInterrupt).toBe(false);

    const preserveCurrent = materializeExistingPlaceableConversationInterruptable({
      type: "aurora_git",
      sourceKind: "placeable"
    }, advancedSettings, {
      ...advancedSettings,
      conversation: "must_not_apply"
    });
    expect(preserveCurrent.conversation).toBe("");

    const absentResult = materializeExistingPlaceableConversationInterruptable({
      type: "aurora_git",
      sourceKind: "placeable"
    }, {
      blueprintResRef: "keep",
      belongsToFaction: "Hostile",
      portraitResRef: "",
      initialState: "Default",
      treasureModel: "Default"
    }, advancedSettings);
    expect(absentResult).not.toHaveProperty("conversation");
    expect(absentResult).not.toHaveProperty("noInterrupt");
    expect(materializeExistingPlaceableConversationInterruptable(
      source,
      undefined,
      advancedSettings
    )).toBeUndefined();
  });
});
