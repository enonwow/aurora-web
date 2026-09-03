import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT ground-Item TemplateResRef parsing", () => {
  it("reads one exact native ResRef", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
    ]))?.items[0]?.itemTemplateResRef).toEqual({
      present: true,
      nativeType: "resref",
      value: "nw_cloth022",
    });
  });

  it("records physical absence separately", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.items[0]?.itemTemplateResRef)
      .toEqual({ present: false });
  });

  it.each([
    ["duplicate", [
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
      { label: "TemplateResRef", type: "resref", value: "nw_cloth023" },
    ]],
    ["wrong case", [
      { label: "templateresref", type: "resref", value: "nw_cloth022" },
    ]],
    ["wrong type", [
      { label: "TemplateResRef", type: "cexostring", value: "nw_cloth022" },
    ]],
    ["empty", [{ label: "TemplateResRef", type: "resref", value: "" }]],
    ["uppercase", [
      { label: "TemplateResRef", type: "resref", value: "NW_CLOTH022" },
    ]],
  ] as const)("keeps a malformed %s TemplateResRef preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.items[0]?.itemTemplateResRef).toBeUndefined();
  });

  it("binds exact TemplateResRef provenance into the dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git([
      { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
    ]));
    const second = parseAreaObjectsFromGitGff(git([
      { label: "TemplateResRef", type: "resref", value: "nw_cloth023" },
    ]));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
  });
});

function git(itemFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "List",
    type: "list",
    value: [{
      typeId: 0,
      fields: [
        ...itemFields,
        { label: "Tag", type: "cexostring", value: "NW_CLOTH022" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
