import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint TemplateResRef parsing", () => {
  it("reads one exact canonical native ResRef", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value: "nw_waypoint001",
    }]))?.waypoints[0]?.waypointTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_waypoint001",
    });
  });

  it("records physical absence without authorizing an insertion", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.waypoints[0]?.waypointTemplateResRef)
      .toEqual({ present: false });
  });

  it("binds the dependency fingerprint to exact native provenance", () => {
    const fingerprint = (value: string) => parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value,
    }]))?.dependencyFingerprint;

    expect(fingerprint("nw_waypoint001")).not.toBe(fingerprint("nw_waypoint002"));
  });

  it.each([
    ["duplicate", [
      { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
      { label: "TemplateResRef", type: "resref", value: "nw_waypoint002" },
    ]],
    ["wrong case label", [
      { label: "templateresref", type: "resref", value: "nw_waypoint001" },
    ]],
    ["wrong native type", [
      { label: "TemplateResRef", type: "cexostring", value: "nw_waypoint001" },
    ]],
    ["uppercase value", [
      { label: "TemplateResRef", type: "resref", value: "NW_WAYPOINT001" },
    ]],
    ["empty value", [
      { label: "TemplateResRef", type: "resref", value: "" },
    ]],
  ] as const)("keeps %s storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointTemplateResRef).toBeUndefined();
  });
});

function git(waypointFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "WaypointList",
    type: "list",
    value: [{
      typeId: 5,
      fields: [
        ...waypointFields,
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 1 },
        { label: "YOrientation", type: "float", value: 0 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
