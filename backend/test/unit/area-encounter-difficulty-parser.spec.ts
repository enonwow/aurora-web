import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter Difficulty pair parsing", () => {
  it("reads exact physically present Difficulty and DifficultyIndex INT storage", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Difficulty", type: "int", value: 0 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]))?.encounters[0]?.encounterDifficulty).toEqual({
      difficulty: { present: true, nativeType: "int", value: 0 },
      difficultyIndex: { present: true, nativeType: "int", value: 2 },
    });
  });

  it("preserves exact physical absence and partial presence", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.encounters[0]?.encounterDifficulty)
      .toEqual({
        difficulty: { present: false },
        difficultyIndex: { present: false },
      });
    expect(parseAreaObjectsFromGitGff(git([
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]))?.encounters[0]?.encounterDifficulty).toEqual({
      difficulty: { present: false },
      difficultyIndex: { present: true, nativeType: "int", value: 2 },
    });
  });

  it.each([
    ["wrong-case Difficulty", [
      { label: "difficulty", type: "int", value: 0 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]],
    ["wrong Difficulty type", [
      { label: "Difficulty", type: "dword", value: 0 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]],
    ["wrong DifficultyIndex type", [
      { label: "Difficulty", type: "int", value: 0 },
      { label: "DifficultyIndex", type: "dword", value: 2 },
    ]],
    ["duplicate Difficulty", [
      { label: "Difficulty", type: "int", value: 0 },
      { label: "Difficulty", type: "int", value: 5 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]],
    ["duplicate DifficultyIndex", [
      { label: "Difficulty", type: "int", value: 0 },
      { label: "DifficultyIndex", type: "int", value: 1 },
      { label: "DifficultyIndex", type: "int", value: 2 },
    ]],
  ] as const)("keeps %s storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterDifficulty).toBeUndefined();
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
