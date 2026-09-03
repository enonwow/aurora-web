import {
  TRIGGER_EDITOR_COMMENT_MAX_CODE_UNITS,
  canEditExistingTriggerEditorComment,
  isTriggerEditorComment,
  readTriggerEditorComment,
} from "../../../../../src/modules/scene/domain/triggerEditorComment";

describe("Trigger editor Comment domain", () => {
  it.each(["", "  west gate  ", "line one\r\nline two", "e\u0301"])(
    "admits exact bounded text %j",
    (value) => expect(isTriggerEditorComment(value)).toBe(true),
  );

  it.each([
    undefined,
    null,
    1,
    "bad\0text",
    "x".repeat(TRIGGER_EDITOR_COMMENT_MAX_CODE_UNITS + 1),
  ])("rejects invalid value %p", (value) => {
    expect(isTriggerEditorComment(value)).toBe(false);
  });

  it("reads only an exact metadata member", () => {
    expect(readTriggerEditorComment({ editorComment: " source " })).toBe(" source ");
    expect(readTriggerEditorComment({ editorComment: "bad\0text" })).toBeUndefined();
    expect(readTriggerEditorComment(undefined)).toBeUndefined();
  });

  it("admits editing only for an indexed retained Trigger source", () => {
    expect(canEditExistingTriggerEditorComment({
      type: "aurora_git",
      areaId: "area_demo",
      sourceObjectId: "trigger:0",
      sourceKind: "trigger",
      sourceIndex: 0,
      triggerEditorComment: " source ",
    })).toBe(true);
    expect(canEditExistingTriggerEditorComment({
      type: "aurora_git",
      areaId: "area_demo",
      sourceObjectId: "trigger:0",
      sourceKind: "trigger",
      sourceIndex: 0,
    })).toBe(false);
  });
});
