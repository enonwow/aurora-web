import {
  canEditExistingWaypointEditorComment,
  materializeExistingWaypointEditorComment,
  reduceExistingWaypointEditorComment,
} from "../../../../../src/modules/layout/application/waypointEditorCommentProvenance";

const source = {
  type: "aurora_git",
  sourceKind: "waypoint",
  sourceIndex: 0,
  waypointEditorComment: " source ",
} as const;

describe("Waypoint editor Comment provenance", () => {
  it("reduces and materializes only exact admitted candidates", () => {
    expect(canEditExistingWaypointEditorComment(source)).toBe(true);
    expect(reduceExistingWaypointEditorComment(source, "current", " target "))
      .toBe(" target ");
    expect(materializeExistingWaypointEditorComment(source, "current", " target "))
      .toBe(" target ");
    expect(reduceExistingWaypointEditorComment(source, "current", "bad\0target"))
      .toBe("current");
  });
});
