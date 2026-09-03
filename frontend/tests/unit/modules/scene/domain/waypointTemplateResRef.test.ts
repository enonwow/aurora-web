import { describe, expect, it } from "vitest";
import {
  isWaypointTemplateResRef,
  readWaypointTemplateResRefStorage,
} from "../../../../../src/modules/scene/domain/waypointTemplateResRef";

describe("Waypoint TemplateResRef domain", () => {
  it("admits exact absent and canonical present provenance", () => {
    expect(readWaypointTemplateResRefStorage({ present: false }))
      .toEqual({ present: false });
    expect(readWaypointTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    })).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    });
  });

  it("admits only canonical non-empty lowercase ResRefs", () => {
    expect(isWaypointTemplateResRef("a")).toBe(true);
    expect(isWaypointTemplateResRef("nw_waypoint001")).toBe(true);
    expect(isWaypointTemplateResRef("a".repeat(16))).toBe(true);
    expect(isWaypointTemplateResRef("")).toBe(false);
    expect(isWaypointTemplateResRef("NW_WAYPOINT001")).toBe(false);
    expect(isWaypointTemplateResRef("a".repeat(17))).toBe(false);
    expect(isWaypointTemplateResRef("bad-resref")).toBe(false);
  });

  it.each([
    null,
    [],
    {},
    { present: false, value: "nw_waypoint001" },
    { present: true, nativeType: "resref" },
    { present: true, nativeType: "cexostring", value: "nw_waypoint001" },
    { present: true, nativeType: "resref", value: "NW_WAYPOINT001" },
    { present: true, nativeType: "resref", value: "nw_waypoint001", extra: true },
  ])("rejects malformed provenance %#", (candidate) => {
    expect(readWaypointTemplateResRefStorage(candidate)).toBeNull();
  });
});
