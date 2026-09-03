import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint Description parsing", () => {
  it("reads complete exact CExoLocString storage without resolving TLK text", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "Description",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Patrol route " }],
      },
    }]))?.waypoints[0]?.waypointDescription).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IFBhdHJvbCByb3V0ZSA=" }],
    });
  });

  it("records exact physical absence", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.waypoints[0]?.waypointDescription)
      .toEqual({ present: false });
  });

  it("binds placement identity to exact Description provenance", () => {
    const dependencyFingerprint = (text: string) => parseAreaObjectsFromGitGff(git([{
      label: "Description",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text }],
      },
    }]))?.dependencyFingerprint;

    expect(dependencyFingerprint("Patrol route"))
      .not.toBe(dependencyFingerprint("Northern patrol route"));
  });

  it.each([
    ["duplicate", [
      { label: "Description", type: "cexolocstring", value: { strRef: 1, entries: [] } },
      { label: "Description", type: "cexolocstring", value: { strRef: 2, entries: [] } },
    ]],
    ["wrong case", [{
      label: "description",
      type: "cexolocstring",
      value: { strRef: 1, entries: [] },
    }]],
    ["wrong type", [{ label: "Description", type: "cexostring", value: "Patrol" }]],
  ] as const)("keeps a malformed %s field preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointDescription).toBeUndefined();
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
