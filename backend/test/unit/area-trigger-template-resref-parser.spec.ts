import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Trigger TemplateResRef parsing", () => {
  it("reads one exact canonical native ResRef", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value: "newgeneric",
    }]))?.triggers[0]?.triggerTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "newgeneric",
    });
  });

  it("records physical absence without authorizing an insertion", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.triggers[0]?.triggerTemplateResRef)
      .toEqual({ present: false });
  });

  it("binds the dependency fingerprint to exact native provenance", () => {
    const fingerprint = (value: string) => parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value,
    }]))?.dependencyFingerprint;

    expect(fingerprint("newgeneric")).not.toBe(fingerprint("newgeneric2"));
  });

  it.each([
    ["duplicate", [
      { label: "TemplateResRef", type: "resref", value: "newgeneric" },
      { label: "TemplateResRef", type: "resref", value: "newgeneric2" },
    ]],
    ["wrong case label", [
      { label: "templateresref", type: "resref", value: "newgeneric" },
    ]],
    ["wrong native type", [
      { label: "TemplateResRef", type: "cexostring", value: "newgeneric" },
    ]],
    ["uppercase value", [
      { label: "TemplateResRef", type: "resref", value: "NEWGENERIC" },
    ]],
    ["empty value", [
      { label: "TemplateResRef", type: "resref", value: "" },
    ]],
  ] as const)("keeps %s storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerTemplateResRef).toBeUndefined();
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
        { label: "Tag", type: "cexostring", value: "GenericTrigger" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
