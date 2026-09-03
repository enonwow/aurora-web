import {
  isAreaPlaceableConversation,
  isAreaPlaceableInterruptableValue,
} from "../../src/modules/areas/domain/area-placeable-conversation-interruptable";

describe("Placeable Conversation and Interruptable mutation survivor killers", () => {
  it.each([
    "",
    "a",
    "ABC_123",
    "a234567890123456",
  ])("accepts admitted Conversation ResRef %j", (value) => {
    expect(isAreaPlaceableConversation(value)).toBe(true);
  });

  it.each([
    null,
    1,
    "bad-dialog",
    "bad dialog",
    "a2345678901234567",
  ])("rejects invalid Conversation value %j", (value) => {
    expect(isAreaPlaceableConversation(value)).toBe(false);
  });

  it("accepts exactly both native Interruptable Byte values", () => {
    expect(isAreaPlaceableInterruptableValue(0)).toBe(true);
    expect(isAreaPlaceableInterruptableValue(1)).toBe(true);
  });

  it.each([-1, 2, false, "1", null])("rejects non-native Interruptable value %j", (value) => {
    expect(isAreaPlaceableInterruptableValue(value)).toBe(false);
  });
});
