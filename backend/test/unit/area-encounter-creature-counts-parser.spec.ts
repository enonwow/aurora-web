import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter creature-count pair parsing", () => {
  it.each([
    [1, 1],
    [4, 2],
    [8, 8],
  ])("reads exact coherent pair max=%i min=%i", (maxCreatures, recCreatures) => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "MaxCreatures", type: "int", value: maxCreatures },
      { label: "RecCreatures", type: "int", value: recCreatures },
    ]))?.encounters[0]?.encounterCreatureCounts).toEqual({
      maxCreatures,
      recCreatures,
    });
  });

  it.each([
    ["absent", []],
    ["partial", [{ label: "MaxCreatures", type: "int", value: 4 }]],
    ["out of range", [
      { label: "MaxCreatures", type: "int", value: 9 },
      { label: "RecCreatures", type: "int", value: 2 },
    ]],
    ["incoherent", [
      { label: "MaxCreatures", type: "int", value: 2 },
      { label: "RecCreatures", type: "int", value: 3 },
    ]],
    ["duplicate", [
      { label: "MaxCreatures", type: "int", value: 4 },
      { label: "MaxCreatures", type: "int", value: 5 },
      { label: "RecCreatures", type: "int", value: 2 },
    ]],
    ["wrong case", [
      { label: "maxCreatures", type: "int", value: 4 },
      { label: "RecCreatures", type: "int", value: 2 },
    ]],
    ["wrong type", [
      { label: "MaxCreatures", type: "dword", value: 4 },
      { label: "RecCreatures", type: "int", value: 2 },
    ]],
  ] as const)("keeps %s creature-count storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterCreatureCounts).toBeUndefined();
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
