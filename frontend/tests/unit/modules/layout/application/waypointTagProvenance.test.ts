import {
  materializeExistingWaypointTag,
  reduceExistingWaypointTag,
} from "../../../../../src/modules/layout/application/waypointTagProvenance";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "waypoint" as const,
  sourceIndex: 0,
  waypointTag: { present: true as const, value: "NW_WAYPOINT001" },
};

describe("retained Waypoint Tag provenance", () => {
  it("reduces only an exact valid retained edit", () => {
    expect(reduceExistingWaypointTag(exactSource, "NW_WAYPOINT001", "  DEST  "))
      .toBe("  DEST  ");
    expect(reduceExistingWaypointTag(exactSource, "NW_WAYPOINT001", ""))
      .toBe("");
    expect(reduceExistingWaypointTag(
      { ...exactSource, waypointTag: { present: false } },
      "NW_WAYPOINT001",
      "DEST",
    )).toBe("NW_WAYPOINT001");
    expect(reduceExistingWaypointTag(
      exactSource,
      "NW_WAYPOINT001",
      "x".repeat(33),
    )).toBe("NW_WAYPOINT001");
  });

  it("materializes only a source-bound value", () => {
    expect(materializeExistingWaypointTag(
      exactSource,
      "NW_WAYPOINT001",
      "DEST",
    )).toBe("DEST");
    expect(materializeExistingWaypointTag(
      { ...exactSource, sourceKind: "trigger" },
      "NW_WAYPOINT001",
      "DEST",
    )).toBe("NW_WAYPOINT001");
  });
});
