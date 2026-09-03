import {
  isAreaWaypointTemplateResRef,
  readAreaWaypointTemplateResRefStorage,
  readExistingAreaWaypointTemplateResRefMutation,
} from "../../src/modules/areas/domain/area-waypoint-template-resref";

describe("Existing Area Waypoint TemplateResRef", () => {
  it.each(["a", "nw_waypoint001", "abcdefghijklmnop", "a_0"])(
    "admits the exact lowercase native ResRef profile: %s",
    (value) => expect(isAreaWaypointTemplateResRef(value)).toBe(true),
  );

  it.each([
    "",
    "NW_WAYPOINT001",
    "abcdefghijklmnopq",
    "nw-waypoint",
    "nw waypoint",
    "żuraw",
    null,
    1,
  ])("rejects an unproven native ResRef profile: %#", (value) => {
    expect(isAreaWaypointTemplateResRef(value)).toBe(false);
  });

  it("reads and freezes exact absent and canonical present storage", () => {
    const absent = readAreaWaypointTemplateResRefStorage({ present: false });
    const present = readAreaWaypointTemplateResRefStorage({
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    });

    expect(absent).toEqual({ present: false });
    expect(present).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    });
    expect(Object.isFrozen(absent)).toBe(true);
    expect(Object.isFrozen(present)).toBe(true);
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
    Object.assign(Object.create({}), {
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    }),
  ])("rejects malformed storage: %#", (value) => {
    expect(readAreaWaypointTemplateResRefStorage(value)).toBeNull();
  });

  it("reads and freezes one exact changed pair", () => {
    const pair = readExistingAreaWaypointTemplateResRefMutation({
      expectedResRef: "nw_waypoint001",
      resRef: "custom_waypoint",
    });
    expect(pair).toEqual({
      expectedResRef: "nw_waypoint001",
      resRef: "custom_waypoint",
    });
    expect(Object.isFrozen(pair)).toBe(true);
  });

  it.each([
    null,
    [],
    { expectedResRef: "nw_waypoint001" },
    { resRef: "custom_waypoint" },
    { expectedResRef: "nw_waypoint001", resRef: "custom_waypoint", extra: true },
    { expectedResRef: "NW_WAYPOINT001", resRef: "custom_waypoint" },
    { expectedResRef: "nw_waypoint001", resRef: "bad-resref" },
    { expectedResRef: "nw_waypoint001", resRef: "nw_waypoint001" },
    Object.assign(Object.create({}), {
      expectedResRef: "nw_waypoint001",
      resRef: "custom_waypoint",
    }),
  ])("rejects a malformed or unchanged pair: %#", (value) => {
    expect(readExistingAreaWaypointTemplateResRefMutation(value)).toBeNull();
  });
});
