import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint Tag parsing", () => {
  it("reads one exact native CExoString without normalization", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "  AREA_DESTINATION  " },
    ]))?.waypoints[0]?.waypointTag).toEqual({
      present: true,
      value: "  AREA_DESTINATION  ",
    });
  });

  it("records physical absence separately from one present empty value", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.waypoints[0]?.waypointTag)
      .toEqual({ present: false });
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "" },
    ]))?.waypoints[0]?.waypointTag).toEqual({ present: true, value: "" });
  });

  it.each([
    ["duplicate", [
      { label: "Tag", type: "cexostring", value: "ONE" },
      { label: "Tag", type: "cexostring", value: "TWO" },
    ]],
    ["wrong case", [{ label: "tag", type: "cexostring", value: "ONE" }]],
    ["wrong type", [{ label: "Tag", type: "resref", value: "one" }]],
    ["over budget", [{ label: "Tag", type: "cexostring", value: "x".repeat(33) }]],
    ["NUL-bearing", [{ label: "Tag", type: "cexostring", value: "bad\0tag" }]],
  ] as const)("keeps a malformed %s Tag preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointTag).toBeUndefined();
  });
});

function git(waypointFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "WaypointList",
    type: "list",
    value: [{
      typeId: 5,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
        ...waypointFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: 1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
