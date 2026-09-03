import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter Tag parsing", () => {
  it("reads one exact native CExoString without normalization", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "  GNOLL_AMBUSH  " },
    ]))?.encounters[0]?.encounterTag)
      .toEqual({ present: true, value: "  GNOLL_AMBUSH  " });
  });

  it("records physical absence separately from one present empty value", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.encounters[0]?.encounterTag)
      .toEqual({ present: false });
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "" },
    ]))?.encounters[0]?.encounterTag).toEqual({ present: true, value: "" });
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
      ?.encounters[0]?.encounterTag).toBeUndefined();
  });
});

function git(encounterFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "Encounter List",
    type: "list",
    value: [{
      typeId: 7,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "x2_gnoll001" },
        ...encounterFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        {
          label: "Geometry",
          type: "list",
          value: [point(0, 0), point(1, 0), point(0, 1)],
        },
        { label: "SpawnPointList", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}

function point(x: number, y: number) {
  return {
    typeId: 1,
    fields: [
      { label: "X", type: "float" as const, value: x },
      { label: "Y", type: "float" as const, value: y },
      { label: "Z", type: "float" as const, value: 0 },
    ],
  };
}
