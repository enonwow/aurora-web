import { describe, expect, it } from "vitest";

import {
  isAuroraConversationResRef,
  isPlaceableInterruptable,
  projectPlaceableInterruptable,
  readPlaceableConversation,
  readPlaceableInterruptable
} from "../../../../../src/modules/scene/domain/placeableConversationInterruptable";

describe("Placeable Conversation/Interruptable domain", () => {
  it.each([
    "",
    "a",
    "Conv_01",
    "A123456789_BCDEF"
  ])("accepts exact Aurora Conversation ResRef %j", (value) => {
    expect(isAuroraConversationResRef(value)).toBe(true);
    expect(readPlaceableConversation({ conversation: value })).toBe(value);
  });

  it.each([
    "has-dash",
    "has space",
    "A123456789_BCDEFG",
    7,
    null,
    undefined
  ])("rejects invalid Conversation value %j", (value) => {
    expect(isAuroraConversationResRef(value)).toBe(false);
    expect(readPlaceableConversation({ conversation: value })).toBeUndefined();
  });

  it("accepts only numeric native Interruptable 0 or 1", () => {
    expect(isPlaceableInterruptable(0)).toBe(true);
    expect(isPlaceableInterruptable(1)).toBe(true);
    expect(readPlaceableInterruptable({ interruptable: 0 })).toBe(0);
    expect(readPlaceableInterruptable({ interruptable: 1 })).toBe(1);
    for (const invalid of [-1, 2, 0.5, "0", false, undefined]) {
      expect(isPlaceableInterruptable(invalid)).toBe(false);
      expect(readPlaceableInterruptable({ interruptable: invalid })).toBeUndefined();
    }
  });

  it("projects the UI No Interrupt checkbox through the exact native inversion", () => {
    expect(projectPlaceableInterruptable(true)).toBe(0);
    expect(projectPlaceableInterruptable(false)).toBe(1);
  });
});
