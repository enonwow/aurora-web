import {
  MAX_AREA_TRIGGER_EDITOR_COMMENT_CODE_UNITS,
  isAreaTriggerEditorComment,
} from "../../src/modules/areas/domain/area-trigger-editor-comment";

describe("Existing Area Trigger editor Comment", () => {
  it.each(["", "  west gate  ", "line one\r\nline two", "e\u0301"])(
    "admits exact bounded text %j",
    (value) => expect(isAreaTriggerEditorComment(value)).toBe(true),
  );

  it.each([
    undefined,
    null,
    1,
    "bad\0text",
    "x".repeat(MAX_AREA_TRIGGER_EDITOR_COMMENT_CODE_UNITS + 1),
  ])("rejects invalid value %p", (value) => {
    expect(isAreaTriggerEditorComment(value)).toBe(false);
  });
});
