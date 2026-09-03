import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Trigger Tag parsing", () => {
  it("reads one exact native CExoString without normalization", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "  AREA_EXIT  " },
    ]))?.triggers[0]?.triggerTag).toEqual({ present: true, value: "  AREA_EXIT  " });
  });

  it("records physical absence separately from one present empty value", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.triggers[0]?.triggerTag)
      .toEqual({ present: false });
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "" },
    ]))?.triggers[0]?.triggerTag).toEqual({ present: true, value: "" });
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
      ?.triggers[0]?.triggerTag).toBeUndefined();
  });
});

function git(triggerFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "TriggerList",
    type: "list",
    value: [{
      typeId: 1,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "newgeneric" },
        ...triggerFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: 0 },
        { label: "ZOrientation", type: "float", value: 0 },
        {
          label: "Geometry",
          type: "list",
          value: [
            point(0, 0),
            point(1, 0),
            point(0, 1),
          ],
        },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}

function point(x: number, y: number) {
  return {
    typeId: 3,
    fields: [
      { label: "PointX", type: "float" as const, value: x },
      { label: "PointY", type: "float" as const, value: y },
      { label: "PointZ", type: "float" as const, value: 0 },
    ],
  };
}
