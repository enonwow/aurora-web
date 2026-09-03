import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const SCRIPT_FIELDS = Object.freeze([
  { label: "OnEntered", type: "resref" as const, value: "enc_enter" },
  { label: "OnExit", type: "resref" as const, value: "enc_exit" },
  { label: "OnExhausted", type: "resref" as const, value: "" },
  { label: "OnHeartbeat", type: "resref" as const, value: "enc_heartbeat" },
  { label: "OnUserDefined", type: "resref" as const, value: "enc_user" },
]);

describe("Area GIT Encounter event-script parsing", () => {
  it("reads the complete exact native five-field ResRef tuple", () => {
    expect(parseAreaObjectsFromGitGff(git([...SCRIPT_FIELDS]))
      ?.encounters[0]?.encounterScriptResRefs).toEqual({
      onEntered: "enc_enter",
      onExit: "enc_exit",
      onExhausted: "",
      onHeartbeat: "enc_heartbeat",
      onUserDefined: "enc_user",
    });
  });

  it.each([
    ["absent", []],
    ["partial", SCRIPT_FIELDS.slice(0, 4)],
    ["duplicate", [...SCRIPT_FIELDS, SCRIPT_FIELDS[0]]],
    ["wrong case", SCRIPT_FIELDS.map((field, index) =>
      index === 0 ? { ...field, label: "onEntered" } : field)],
    ["wrong type", SCRIPT_FIELDS.map((field, index) =>
      index === 0 ? { label: field.label, type: "cexostring" as const, value: field.value } : field)],
  ] as const)("keeps %s Encounter script storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterScriptResRefs).toBeUndefined();
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
