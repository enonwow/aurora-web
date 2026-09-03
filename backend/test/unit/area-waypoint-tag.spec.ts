import {
  isEditableAreaWaypointTag,
  readExistingAreaWaypointTagMutation,
  readExistingAreaWaypointTagStorage,
} from "../../src/modules/areas/domain/area-waypoint-tag";

describe("existing Area Waypoint Tag contract", () => {
  it("keeps absent, empty, and whitespace storage distinct", () => {
    expect(readExistingAreaWaypointTagStorage({ present: false }))
      .toEqual({ present: false });
    expect(readExistingAreaWaypointTagStorage({ present: true, value: "" }))
      .toEqual({ present: true, value: "" });
    expect(readExistingAreaWaypointTagStorage({ present: true, value: "  DEST  " }))
      .toEqual({ present: true, value: "  DEST  " });
  });

  it("enforces the exact 32-code-unit and no-NUL boundary", () => {
    expect(isEditableAreaWaypointTag("")).toBe(true);
    expect(isEditableAreaWaypointTag("x".repeat(32))).toBe(true);
    expect(isEditableAreaWaypointTag("x".repeat(33))).toBe(false);
    expect(isEditableAreaWaypointTag("bad\0tag")).toBe(false);
    expect(isEditableAreaWaypointTag(1)).toBe(false);
  });

  it.each([
    null,
    {},
    { present: false, value: "invented" },
    { present: true },
    { present: true, value: "x".repeat(33) },
    { present: true, value: "ok", extra: true },
  ])("rejects malformed source storage %#", (candidate) => {
    expect(readExistingAreaWaypointTagStorage(candidate)).toBeNull();
  });

  it("admits one exact changed compare-and-swap pair", () => {
    expect(readExistingAreaWaypointTagMutation({
      expectedValue: "NW_WAYPOINT001",
      value: "  AREA_DESTINATION  ",
    })).toEqual({
      expectedValue: "NW_WAYPOINT001",
      value: "  AREA_DESTINATION  ",
    });
  });

  it.each([
    null,
    {},
    { expectedValue: "same", value: "same" },
    { expectedValue: "ok", value: "bad\0tag" },
    { expectedValue: "ok", value: "x".repeat(33) },
    { expectedValue: "old", value: "new", extra: true },
  ])("rejects malformed or no-op mutation %#", (candidate) => {
    expect(readExistingAreaWaypointTagMutation(candidate)).toBeNull();
  });
});
