import {
  parseAreaObjectsFromGitGicGff,
  parseAreaWaypointEditorCommentsFromGicGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const ROOT_TYPE = 0xffff_ffff;

describe("Area paired GIC Waypoint editor Comment parsing", () => {
  it("reads and pairs exact Comment text without normalization", () => {
    const git = areaFile("GIT ", waypointGitFields());
    const gic = areaFile("GIC ", [{ label: "Comment", type: "cexostring", value: "  patrol\r\nroute  " }]);

    expect(parseAreaWaypointEditorCommentsFromGicGff(gic, 1)).toEqual([
      "  patrol\r\nroute  ",
    ]);
    expect(parseAreaObjectsFromGitGicGff(git, gic)?.waypoints[0]?.waypointMetadata)
      .toEqual({ editorComment: "  patrol\r\nroute  " });
  });

  it("keeps a missing Comment preserve-only", () => {
    const parsed = parseAreaObjectsFromGitGicGff(
      areaFile("GIT ", waypointGitFields()),
      areaFile("GIC ", []),
    );
    expect(parsed?.waypoints[0]).not.toHaveProperty("waypointMetadata");
  });

  it("binds the paired Comment into the dependency fingerprint", () => {
    const git = areaFile("GIT ", waypointGitFields());
    const fingerprint = (value: string) => parseAreaObjectsFromGitGicGff(
      git,
      areaFile("GIC ", [{ label: "Comment", type: "cexostring", value }]),
    )?.dependencyFingerprint;
    expect(fingerprint("patrol")).not.toBe(fingerprint("northern patrol"));
  });

  it.each([
    ["wrong struct type", 7, [{ label: "Comment", type: "cexostring", value: "x" }]],
    ["duplicate", 5, [
      { label: "Comment", type: "cexostring", value: "one" },
      { label: "Comment", type: "cexostring", value: "two" },
    ]],
    ["wrong type", 5, [{ label: "Comment", type: "resref", value: "x" }]],
    ["NUL", 5, [{ label: "Comment", type: "cexostring", value: "bad\0text" }]],
  ] as const)("rejects %s provenance", (_label, typeId, fields) => {
    expect(parseAreaWaypointEditorCommentsFromGicGff(
      areaFile("GIC ", fields as SupportedGffField[], typeId),
      1,
    )).toBeNull();
  });
});

function waypointGitFields(): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "nw_waypoint001" },
    { label: "Tag", type: "cexostring", value: "NW_WAYPOINT001" },
    { label: "XPosition", type: "float", value: 10 },
    { label: "YPosition", type: "float", value: 20 },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "XOrientation", type: "float", value: 1 },
    { label: "YOrientation", type: "float", value: 0 },
  ];
}

function areaFile(
  fileType: "GIT " | "GIC ",
  waypointFields: SupportedGffField[],
  waypointTypeId = 5,
): Buffer {
  return buildGffBuffer([
    { label: "Placeable List", type: "list", value: [] },
    { label: "Creature List", type: "list", value: [] },
    { label: "List", type: "list", value: [] },
    { label: "StoreList", type: "list", value: [] },
    { label: "Encounter List", type: "list", value: [] },
    {
      label: "WaypointList",
      type: "list",
      value: [{ typeId: waypointTypeId, fields: waypointFields }],
    },
  ], fileType, ROOT_TYPE);
}
