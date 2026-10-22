import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const TRAP_FIELDS = Object.freeze([
  { label: "TrapDetectable", type: "byte" as const, value: 1 },
  { label: "TrapDetectDC", type: "byte" as const, value: 17 },
  { label: "TrapDisarmable", type: "byte" as const, value: 1 },
  { label: "DisarmDC", type: "byte" as const, value: 23 },
  { label: "TrapFlag", type: "byte" as const, value: 0 },
  { label: "TrapOneShot", type: "byte" as const, value: 1 },
  { label: "TrapType", type: "byte" as const, value: 7 },
]);

describe("Area GIT Trigger trap-properties parsing", () => {
  it("reads the complete exact native tuple", () => {
    expect(parseAreaObjectsFromGitGff(git([...TRAP_FIELDS]))
      ?.triggers[0]?.triggerTrapProperties).toEqual({
      trapDetectable: 1,
      trapDetectDc: 17,
      trapDisarmable: 1,
      disarmDc: 23,
      trapFlag: 0,
      trapOneShot: 1,
      trapType: 7,
    });
  });

  it("binds the dependency fingerprint to every retained member", () => {
    const fingerprint = (fields: SupportedGffField[]) =>
      parseAreaObjectsFromGitGff(git(fields))?.dependencyFingerprint;
    const baseline = fingerprint([...TRAP_FIELDS]);
    for (let index = 0; index < TRAP_FIELDS.length; index += 1) {
      expect(fingerprint(TRAP_FIELDS.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, value: field.value + 1 } : field,
      ))).not.toBe(baseline);
    }
  });

  it.each([
    ["absent", []],
    ["partial", TRAP_FIELDS.slice(0, 6)],
    ["duplicate", [...TRAP_FIELDS, TRAP_FIELDS[0]]],
    ["wrong case", TRAP_FIELDS.map((field, index) =>
      index === 0 ? { ...field, label: "trapDetectable" } : field)],
    ["wrong type", TRAP_FIELDS.map((field, index) =>
      index === 2 ? { label: field.label, type: "word" as const, value: field.value } : field)],
  ] as const)("keeps %s Trigger trap properties preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerTrapProperties).toBeUndefined();
  });
});

function git(triggerFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "TriggerList",
    type: "list",
    value: [{
      typeId: 1,
      fields: [
        ...triggerFields,
        { label: "TemplateResRef", type: "resref", value: "newgeneric" },
        { label: "Tag", type: "cexostring", value: "GenericTrigger" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
