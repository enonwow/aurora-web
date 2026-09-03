import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint Appearance parsing", () => {
  it("reads one canonical Appearance Byte without inventing table provenance", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Appearance", type: "byte", value: 4 },
    ]))?.waypoints[0]?.waypointAppearance).toEqual({
      present: true,
      nativeType: "byte",
      value: 4,
    });
  });

  it.each([
    ["absent", []],
    ["wrong case", [{ label: "appearance", type: "byte", value: 1 }]],
    ["wrong type", [{ label: "Appearance", type: "word", value: 1 }]],
    ["duplicate", [
      { label: "Appearance", type: "byte", value: 1 },
      { label: "Appearance", type: "byte", value: 2 },
    ]],
  ] as const)("keeps %s preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointAppearance).toBeUndefined();
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
        { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
        ...waypointFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 1 },
        { label: "YOrientation", type: "float", value: 0 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
