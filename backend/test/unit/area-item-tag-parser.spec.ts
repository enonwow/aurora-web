import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT ground-Item Tag parsing", () => {
  it("reads one exact native CExoString without normalization", () => {
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "  LOOT_CHEST  " },
    ]))?.items[0]?.itemTag).toEqual({ present: true, value: "  LOOT_CHEST  " });
  });

  it("records physical absence separately from one present empty value", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.items[0]?.itemTag).toEqual({ present: false });
    expect(parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "" },
    ]))?.items[0]?.itemTag).toEqual({ present: true, value: "" });
  });

  it.each([
    ["duplicate", [
      { label: "Tag", type: "cexostring", value: "ONE" },
      { label: "Tag", type: "cexostring", value: "TWO" },
    ]],
    ["wrong case", [{ label: "tag", type: "cexostring", value: "ONE" }]],
    ["wrong type", [{ label: "Tag", type: "resref", value: "one" }]],
    ["over budget", [{ label: "Tag", type: "cexostring", value: "x".repeat(33) }]],
    ["NUL-bearing", [{ label: "Tag", type: "cexostring", value: "bad\0tag" }]],
  ] as const)("keeps a malformed %s Tag preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))?.items[0]?.itemTag)
      .toBeUndefined();
  });

  it("binds exact Tag provenance into the dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "ONE" },
    ]));
    const second = parseAreaObjectsFromGitGff(git([
      { label: "Tag", type: "cexostring", value: "TWO" },
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
        { label: "TemplateResRef", type: "resref", value: "nw_cloth022" },
        ...itemFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
