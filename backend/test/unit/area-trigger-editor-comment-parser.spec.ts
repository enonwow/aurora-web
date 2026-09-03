import {
  parseAreaObjectsFromGitGicGff,
  parseAreaTriggerEditorCommentsFromGicGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const ROOT_TYPE = 0xffff_ffff;

describe("Area paired GIC Trigger editor Comment parsing", () => {
  it("reads and pairs exact Comment text without normalization", () => {
    const git = areaFile("GIT ", triggerGitFields());
    const gic = areaFile("GIC ", [{
      label: "Comment",
      type: "cexostring",
      value: "  west\r\ngate  ",
    }]);

    expect(parseAreaTriggerEditorCommentsFromGicGff(gic, 1)).toEqual([
      "  west\r\ngate  ",
    ]);
    expect(parseAreaObjectsFromGitGicGff(git, gic)?.triggers[0]?.triggerMetadata)
      .toEqual({ editorComment: "  west\r\ngate  " });
  });

  it("keeps a missing Comment preserve-only", () => {
    const parsed = parseAreaObjectsFromGitGicGff(
      areaFile("GIT ", triggerGitFields()),
      areaFile("GIC ", []),
    );
    expect(parsed?.triggers[0]).not.toHaveProperty("triggerMetadata");
  });

  it("binds the paired Comment into the dependency fingerprint", () => {
    const git = areaFile("GIT ", triggerGitFields());
    const fingerprint = (value: string) => parseAreaObjectsFromGitGicGff(
      git,
      areaFile("GIC ", [{ label: "Comment", type: "cexostring", value }]),
    )?.dependencyFingerprint;
    expect(fingerprint("west gate")).not.toBe(fingerprint("inner gate"));
  });

  it.each([
    ["wrong struct type", 7, [{ label: "Comment", type: "cexostring", value: "x" }]],
    ["duplicate", 1, [
      { label: "Comment", type: "cexostring", value: "one" },
      { label: "Comment", type: "cexostring", value: "two" },
    ]],
    ["wrong type", 1, [{ label: "Comment", type: "resref", value: "x" }]],
    ["NUL", 1, [{ label: "Comment", type: "cexostring", value: "bad\0text" }]],
  ] as const)("rejects %s provenance", (_label, typeId, fields) => {
    expect(parseAreaTriggerEditorCommentsFromGicGff(
      areaFile("GIC ", fields as SupportedGffField[], typeId),
      1,
    )).toBeNull();
  });
});

function triggerGitFields(): SupportedGffField[] {
  return [
    { label: "TemplateResRef", type: "resref", value: "newgeneric" },
    { label: "Tag", type: "cexostring", value: "GenericTrigger" },
    { label: "XPosition", type: "float", value: 10 },
    { label: "YPosition", type: "float", value: 20 },
    { label: "ZPosition", type: "float", value: 0 },
    { label: "XOrientation", type: "float", value: 1 },
    { label: "YOrientation", type: "float", value: 0 },
    { label: "ZOrientation", type: "float", value: 0 },
    { label: "Geometry", type: "list", value: [] },
  ];
}

function areaFile(
  fileType: "GIT " | "GIC ",
  triggerFields: SupportedGffField[],
  triggerTypeId = 1,
): Buffer {
  return buildGffBuffer([
    { label: "Placeable List", type: "list", value: [] },
    { label: "Creature List", type: "list", value: [] },
    { label: "List", type: "list", value: [] },
    { label: "StoreList", type: "list", value: [] },
    { label: "Encounter List", type: "list", value: [] },
    { label: "WaypointList", type: "list", value: [] },
    {
      label: "TriggerList",
      type: "list",
      value: [{ typeId: triggerTypeId, fields: triggerFields }],
    },
  ], fileType, ROOT_TYPE);
}
