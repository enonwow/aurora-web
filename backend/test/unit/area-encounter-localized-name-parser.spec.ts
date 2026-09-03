import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Encounter LocalizedName parsing", () => {
  it("reads complete exact CExoLocString storage without resolving TLK text", () => {
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, text: " Gnoll Ambush " }],
      },
    }]))?.encounters[0]?.encounterLocalizedName).toEqual({
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "IEdub2xsIEFtYnVzaCA=" }],
    });
    expect(parseAreaObjectsFromGitGff(git([{
      label: "LocalizedName",
      type: "cexolocstring",
      value: { strRef: 91345, entries: [] },
    }]))?.encounters[0]?.encounterLocalizedName).toEqual({
      present: true,
      strRef: 91345,
      entries: [],
    });
  });

  it("records exact physical absence", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.encounters[0]?.encounterLocalizedName)
      .toEqual({ present: false });
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
    ["wrong type", [{ label: "LocalizedName", type: "cexostring", value: "Gnoll" }]],
  ] as const)("keeps a malformed %s field preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.encounters[0]?.encounterLocalizedName).toBeUndefined();
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
