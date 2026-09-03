import {
  canEditExistingWaypointTag,
  isEditableWaypointTag,
  readWaypointTagStorage,
} from "../../../../../src/modules/scene/domain/waypointTag";

const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "waypoint" as const,
  sourceIndex: 0,
  waypointTag: { present: true as const, value: "NW_WAYPOINT001" },
};

describe("retained Waypoint Tag domain", () => {
  it("preserves exact absent, empty, and whitespace storage", () => {
    expect(readWaypointTagStorage({ present: false })).toEqual({ present: false });
    expect(readWaypointTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readWaypointTagStorage({ present: true, value: "  DEST  " }))
      .toEqual({ present: true, value: "  DEST  " });
  });

  it("enforces the Toolset field boundary", () => {
    expect(isEditableWaypointTag("")).toBe(true);
    expect(isEditableWaypointTag("x".repeat(32))).toBe(true);
    expect(isEditableWaypointTag("x".repeat(33))).toBe(false);
    expect(isEditableWaypointTag("bad\0tag")).toBe(false);
  });

  it("activates only for exact retained Waypoint provenance", () => {
    expect(canEditExistingWaypointTag(exactSource)).toBe(true);
    expect(canEditExistingWaypointTag({
      ...exactSource,
      waypointTag: { present: false },
    })).toBe(false);
    expect(canEditExistingWaypointTag({ ...exactSource, sourceKind: "trigger" }))
      .toBe(false);
    expect(canEditExistingWaypointTag({ ...exactSource, sourceIndex: undefined }))
      .toBe(false);
  });

  it.each([
    null,
    {},
    { present: true },
    { present: false, value: "invented" },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "ok", extra: true },
  ])("rejects malformed storage %#", (candidate) => {
    expect(readWaypointTagStorage(candidate)).toBeNull();
  });
});
