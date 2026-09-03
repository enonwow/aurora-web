import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter ResetTime parsing", () => {
  it.each([1, 60, 32_000])("reads exact bounded ResetTime INT %i", (resetTime) => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "ResetTime", type: "int", value: resetTime },
    ]))?.encounters[0]?.encounterResetTime).toEqual({ resetTime });
  });

  it.each([
    ["absent", []],
    ["below minimum", [{ label: "ResetTime", type: "int", value: 0 }]],
    ["above maximum", [{ label: "ResetTime", type: "int", value: 32_001 }]],
    ["duplicate", [
      { label: "ResetTime", type: "int", value: 60 },
      { label: "ResetTime", type: "int", value: 90 },
    ]],
    ["wrong case", [{ label: "resetTime", type: "int", value: 60 }]],
    ["wrong type", [{ label: "ResetTime", type: "dword", value: 60 }]],
  ] as const)("keeps %s ResetTime storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterResetTime).toBeUndefined();
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
