import {
  WAYPOINT_EDITOR_COMMENT_MAX_CODE_UNITS,
  canEditExistingWaypointEditorComment,
  isWaypointEditorComment,
  readWaypointEditorComment,
} from "../../../../../src/modules/scene/domain/waypointEditorComment";

describe("Waypoint editor Comment domain", () => {
  it.each(["", "  patrol  ", "line one\r\nline two", "e\u0301"])(
    "admits exact text %j",
    (value) => expect(isWaypointEditorComment(value)).toBe(true),
  );

  it.each([undefined, null, 1, "bad\0text", "x".repeat(4097)])(
    "rejects invalid value %p",
    (value) => expect(isWaypointEditorComment(value)).toBe(false),
  );

  it("reads metadata and requires exact retained Waypoint provenance", () => {
    expect(WAYPOINT_EDITOR_COMMENT_MAX_CODE_UNITS).toBe(4096);
    expect(readWaypointEditorComment({ editorComment: " note " })).toBe(" note ");
    expect(canEditExistingWaypointEditorComment({
      type: "aurora_git",
      sourceKind: "waypoint",
      sourceIndex: 0,
      waypointEditorComment: " note ",
    })).toBe(true);
    expect(canEditExistingWaypointEditorComment({
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      waypointEditorComment: " note ",
    })).toBe(false);
  });
});
