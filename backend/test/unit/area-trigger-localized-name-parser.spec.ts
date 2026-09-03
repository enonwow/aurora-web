import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Trigger LocalizedName parsing", () => {
  it("reads complete exact CExoLocString storage without resolving TLK text", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Gate Trigger " }],
      },
    }]))?.triggers[0]?.triggerLocalizedName).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdhdGUgVHJpZ2dlciA=" }],
    });
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: { strRef: 14759, entries: [] },
    }]))?.triggers[0]?.triggerLocalizedName).toEqual({
      present: true,
      strRef: 14759,
      entries: [],
    });
  });

  it("records exact physical absence", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.triggers[0]?.triggerLocalizedName)
      .toEqual({ present: false });
  });

  it("binds the dependency fingerprint to complete native provenance", () => {
    const fingerprint = (text: string) => parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: { strRef: 0xffff_ffff, entries: [{ languageId: 0, text }] },
    }]))?.dependencyFingerprint;
    expect(fingerprint("Gate Trigger")).not.toBe(fingerprint("Inner Gate Trigger"));
  });

  it.each([
    ["duplicate", [
      { label: "LocalizedName", type: "cexolocstring", value: { strRef: 1, entries: [] } },
      { label: "LocalizedName", type: "cexolocstring", value: { strRef: 2, entries: [] } },
    ]],
    ["wrong case", [{
      label: "localizedName",
      type: "cexolocstring",
      value: { strRef: 1, entries: [] },
    }]],
    ["wrong type", [{ label: "LocalizedName", type: "cexostring", value: "Gate" }]],
  ] as const)("keeps a malformed %s field preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerLocalizedName).toBeUndefined();
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
