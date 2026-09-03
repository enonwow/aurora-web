import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const TRANSITION_FIELDS = Object.freeze([
  { label: "LinkedTo", type: "cexostring" as const, value: " destination_tag " },
  { label: "LinkedToFlags", type: "byte" as const, value: 0xff },
  { label: "LoadScreenID", type: "word" as const, value: 0xffff },
]);

describe("Area GIT Trigger transition-storage parsing", () => {
  it("reads the complete exact native CExoString/Byte/Word tuple", () => {
    expect(parseAreaObjectsFromGitGff(git([...TRANSITION_FIELDS]))
      ?.triggers[0]?.triggerTransitionStorage).toEqual({
      linkedTo: " destination_tag ",
      linkedToFlags: 0xff,
      loadScreenId: 0xffff,
    });
  });

  it("binds the dependency fingerprint to every retained member", () => {
    const fingerprint = (fields: SupportedGffField[]) =>
      parseAreaObjectsFromGitGff(git(fields))?.dependencyFingerprint;
    const baseline = fingerprint([...TRANSITION_FIELDS]);
    for (const [index, value] of [[0, "other"], [1, 7], [2, 42]] as const) {
      expect(fingerprint(TRANSITION_FIELDS.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, value } as SupportedGffField : field,
      ))).not.toBe(baseline);
    }
  });

  it.each([
    ["absent", []],
    ["partial", TRANSITION_FIELDS.slice(0, 2)],
    ["duplicate", [...TRANSITION_FIELDS, TRANSITION_FIELDS[0]]],
    ["wrong case", TRANSITION_FIELDS.map((field, index) =>
      index === 0 ? { ...field, label: "linkedTo" } : field)],
    ["wrong type", TRANSITION_FIELDS.map((field, index) =>
      index === 1
        ? { label: field.label, type: "word" as const, value: field.value }
        : field)],
    ["over-budget", TRANSITION_FIELDS.map((field, index) =>
      index === 0 ? { ...field, value: "x".repeat(257) } : field)],
  ] as const)("keeps %s Trigger transition storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerTransitionStorage).toBeUndefined();
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
