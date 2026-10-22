import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const CORE_FIELDS = Object.freeze([
  { label: "AutoRemoveKey", type: "byte" as const, value: 1 },
  { label: "Faction", type: "dword" as const, value: 0xffff_ffff },
  { label: "Cursor", type: "byte" as const, value: 0xff },
  { label: "HighlightHeight", type: "float" as const, value: Math.fround(1.5) },
  { label: "KeyName", type: "cexostring" as const, value: " gate_key " },
  { label: "PortraitId", type: "word" as const, value: 0xffff },
  { label: "Type", type: "int" as const, value: -1 },
]);

describe("Area GIT Trigger core-properties parsing", () => {
  it("reads the complete exact native tuple", () => {
    expect(parseAreaObjectsFromGitGff(git([...CORE_FIELDS]))
      ?.triggers[0]?.triggerCoreProperties).toEqual({
      autoRemoveKey: 1,
      factionId: 0xffff_ffff,
      cursorId: 0xff,
      highlightHeight: Math.fround(1.5),
      keyName: " gate_key ",
      portraitId: 0xffff,
      triggerType: -1,
    });
  });

  it("binds the dependency fingerprint to every retained member", () => {
    const fingerprint = (fields: SupportedGffField[]) =>
      parseAreaObjectsFromGitGff(git(fields))?.dependencyFingerprint;
    const baseline = fingerprint([...CORE_FIELDS]);
    const values = [0, 7, 3, Math.fround(2.5), "other", 42, 1] as const;
    for (let index = 0; index < values.length; index += 1) {
      expect(fingerprint(CORE_FIELDS.map((field, fieldIndex) =>
        fieldIndex === index
          ? { ...field, value: values[index] } as SupportedGffField
          : field,
      ))).not.toBe(baseline);
    }
  });

  it.each([
    ["absent", []],
    ["partial", CORE_FIELDS.slice(0, 6)],
    ["duplicate", [...CORE_FIELDS, CORE_FIELDS[0]]],
    ["wrong case", CORE_FIELDS.map((field, index) =>
      index === 0 ? { ...field, label: "autoremoveKey" } : field)],
    ["wrong type", CORE_FIELDS.map((field, index) =>
      index === 2 ? { label: field.label, type: "word" as const, value: field.value } : field)],
    ["non-checkbox", CORE_FIELDS.map((field, index) =>
      index === 0 ? { ...field, value: 2 } : field)],
    ["over-budget key", CORE_FIELDS.map((field, index) =>
      index === 4 ? { ...field, value: "x".repeat(257) } : field)],
  ] as const)("keeps %s Trigger core properties preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerCoreProperties).toBeUndefined();
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
