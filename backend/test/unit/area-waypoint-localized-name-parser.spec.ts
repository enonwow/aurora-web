import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint LocalizedName parsing", () => {
  it("reads complete exact CExoLocString storage without resolving TLK text", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Patrol Point " }],
      },
    }]))?.waypoints[0]?.waypointLocalizedName).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCBQb2ludCA=" }],
    });
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: { strRef: 14817, entries: [] },
    }]))?.waypoints[0]?.waypointLocalizedName).toEqual({
      present: true,
      strRef: 14817,
      entries: [],
    });
  });

  it("records exact physical absence", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.waypoints[0]?.waypointLocalizedName)
      .toEqual({ present: false });
  });

  it.each([
    ["duplicate", [
      { label: "LocalizedName", type: "cexolocstring", value: { strRef: 1, entries: [] } },
      { label: "LocalizedName", type: "cexolocstring", value: { strRef: 2, entries: [] } },
    ]],
    ["wrong case", [{
      label: "localizedName",
      type: "cexolocstring",
      value: { strRef: 1, entries: [] },
    }]],
    ["wrong type", [{ label: "LocalizedName", type: "cexostring", value: "Patrol" }]],
  ] as const)("keeps a malformed %s field preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointLocalizedName).toBeUndefined();
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
