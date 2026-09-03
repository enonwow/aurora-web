import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter TemplateResRef parsing", () => {
  it("reads one exact canonical native ResRef", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value: "x2_gnoll001",
    }]))?.encounters[0]?.encounterTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "x2_gnoll001",
    });
  });

  it("records physical absence without authorizing an insertion", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.encounters[0]?.encounterTemplateResRef)
      .toEqual({ present: false });
  });

  it("binds the dependency fingerprint to exact native provenance", () => {
    const fingerprint = (value: string) => parseAreaObjectsFromGitGff(git([{
      label: "TemplateResRef",
      type: "resref",
      value,
    }]))?.dependencyFingerprint;

    expect(fingerprint("x2_gnoll001")).not.toBe(fingerprint("x2_gnoll002"));
  });

  it.each([
    ["duplicate", [
      { label: "TemplateResRef", type: "resref", value: "x2_gnoll001" },
      { label: "TemplateResRef", type: "resref", value: "x2_gnoll002" },
    ]],
    ["wrong case label", [
      { label: "templateresref", type: "resref", value: "x2_gnoll001" },
    ]],
    ["wrong native type", [
      { label: "TemplateResRef", type: "cexostring", value: "x2_gnoll001" },
    ]],
    ["uppercase value", [
      { label: "TemplateResRef", type: "resref", value: "X2_GNOLL001" },
    ]],
    ["empty value", [
      { label: "TemplateResRef", type: "resref", value: "" },
    ]],
  ] as const)("keeps %s storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterTemplateResRef).toBeUndefined();
  });
});

function git(encounterFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "Encounter List",
    type: "list",
    value: [{
      typeId: 7,
      fields: [
        ...encounterFields,
        { label: "Tag", type: "cexostring", value: "X2_GNOLL001" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [] },
        { label: "SpawnPointList", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
