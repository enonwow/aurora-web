import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter PlayerOnly parsing", () => {
  it.each([0, 1])("reads exact canonical PlayerOnly BYTE %i", (playerOnlyByte) => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "PlayerOnly", type: "byte", value: playerOnlyByte },
    ]))?.encounters[0]?.encounterPlayerOnly).toEqual({ playerOnlyByte });
  });

  it.each([
    ["absent", []],
    ["noncanonical", [{ label: "PlayerOnly", type: "byte", value: 2 }]],
    ["duplicate", [
      { label: "PlayerOnly", type: "byte", value: 1 },
      { label: "PlayerOnly", type: "byte", value: 0 },
    ]],
    ["wrong case", [{ label: "playerOnly", type: "byte", value: 1 }]],
    ["wrong type", [{ label: "PlayerOnly", type: "word", value: 1 }]],
  ] as const)("keeps %s PlayerOnly storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterPlayerOnly).toBeUndefined();
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
