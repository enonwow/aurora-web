import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Waypoint map-note vector parsing", () => {
  it("reads the exact three-field vector", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "HasMapNote", type: "byte", value: 1 },
      { label: "MapNote", type: "cexolocstring", value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Old tower " }],
      } },
      { label: "MapNoteEnabled", type: "byte", value: 0 },
    ]))?.waypoints[0]?.waypointMapNote).toEqual({
      hasMapNoteByte: 1,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "IE9sZCB0b3dlciA=" }],
      },
      mapNoteEnabledByte: 0,
    });
  });

  it("binds placement identity to every map-note member", () => {
    const fingerprint = (hasMapNote: 0 | 1, text: string, enabled: 0 | 1) => (
      parseAreaObjectsFromGitGff(git([
        { label: "HasMapNote", type: "byte", value: hasMapNote },
        { label: "MapNote", type: "cexolocstring", value: {
          strRef: 0xffff_ffff,
          entries: text ? [{ languageId: 0, text }] : [],
        } },
        { label: "MapNoteEnabled", type: "byte", value: enabled },
      ]))?.dependencyFingerprint
    );
    expect(fingerprint(0, "", 1)).not.toBe(fingerprint(1, "", 1));
    expect(fingerprint(1, "", 1)).not.toBe(fingerprint(1, "Tower", 1));
    expect(fingerprint(1, "Tower", 1)).not.toBe(fingerprint(1, "Tower", 0));
  });

  it.each([
    ["missing member", [
      { label: "HasMapNote", type: "byte", value: 1 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
    ]],
    ["wrong flag value", [
      { label: "HasMapNote", type: "byte", value: 2 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
      { label: "MapNoteEnabled", type: "byte", value: 1 },
    ]],
    ["wrong case", [
      { label: "hasMapNote", type: "byte", value: 1 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
      { label: "MapNoteEnabled", type: "byte", value: 1 },
    ]],
    ["wrong type", [
      { label: "HasMapNote", type: "dword", value: 1 },
      { label: "MapNote", type: "cexolocstring", value: { strRef: 0xffff_ffff, entries: [] } },
      { label: "MapNoteEnabled", type: "byte", value: 1 },
    ]],
  ] as const)("keeps a malformed %s preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.waypoints[0]?.waypointMapNote).toBeUndefined();
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
