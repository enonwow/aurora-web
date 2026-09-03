import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter SpawnOption parsing", () => {
  it.each([0, 1])("reads exact Toolset SpawnOption INT %i", (spawnOption) => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "SpawnOption", type: "int", value: spawnOption },
    ]))?.encounters[0]?.encounterSpawnOption).toEqual({ spawnOption });
  });

  it.each([
    ["absent", []],
    ["below range", [{ label: "SpawnOption", type: "int", value: -1 }]],
    ["above range", [{ label: "SpawnOption", type: "int", value: 2 }]],
    ["duplicate", [
      { label: "SpawnOption", type: "int", value: 0 },
      { label: "SpawnOption", type: "int", value: 1 },
    ]],
    ["wrong case", [{ label: "spawnOption", type: "int", value: 0 }]],
    ["wrong type", [{ label: "SpawnOption", type: "dword", value: 0 }]],
  ] as const)("keeps %s SpawnOption storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterSpawnOption).toBeUndefined();
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
