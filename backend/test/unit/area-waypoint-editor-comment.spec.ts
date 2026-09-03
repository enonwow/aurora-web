import {
  MAX_AREA_WAYPOINT_EDITOR_COMMENT_CODE_UNITS,
  isAreaWaypointEditorComment,
} from "../../src/modules/areas/domain/area-waypoint-editor-comment";

describe("Area Waypoint editor Comment domain", () => {
  it.each(["", "  patrol note  ", "line one\r\nline two", "e\u0301"])(
    "admits exact bounded text %j",
    (value) => expect(isAreaWaypointEditorComment(value)).toBe(true),
  );

  it.each([
    undefined,
    null,
    1,
    "bad\0text",
    "x".repeat(MAX_AREA_WAYPOINT_EDITOR_COMMENT_CODE_UNITS + 1),
  ])("rejects invalid value %p", (value) => {
    expect(isAreaWaypointEditorComment(value)).toBe(false);
  });
});
