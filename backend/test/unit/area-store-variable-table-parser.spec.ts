import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const exactVariables: SupportedGffField = {
  label: "VarTable",
  type: "list",
  value: [
    { typeId: 0, fields: [
      { label: "Name", type: "cexostring", value: "Counter" },
      { label: "Type", type: "dword", value: 1 },
      { label: "Value", type: "int", value: -2 },
    ] },
    { typeId: 0, fields: [
      { label: "Name", type: "cexostring", value: "Scale" },
      { label: "Type", type: "dword", value: 2 },
      { label: "Value", type: "float", value: Math.fround(1.5) },
    ] },
    { typeId: 0, fields: [
      { label: "Name", type: "cexostring", value: "" },
      { label: "Type", type: "dword", value: 3 },
      { label: "Value", type: "cexostring", value: "" },
    ] },
  ],
};

describe("Area GIT retained Store VarTable parsing", () => {
  it("admits exact absence as an empty table", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.stores[0]?.storeMetadata?.variables)
      .toEqual({ expectedEntries: [] });
  });

  it("admits one exact ordered native three-type table", () => {
    expect(parseAreaObjectsFromGitGff(git([exactVariables]))?.stores[0]
      ?.storeMetadata?.variables).toEqual({ expectedEntries: [
      { sourceIndex: 0, name: "Counter", type: "int", value: -2 },
      { sourceIndex: 1, name: "Scale", type: "float", value: Math.fround(1.5) },
      { sourceIndex: 2, name: "", type: "string", value: "" },
    ] });
  });

  it.each([
    ["wrong field case", [{ ...exactVariables, label: "vartable" }]],
    ["wrong root type", [{ label: "VarTable", type: "byte" as const, value: 0 }]],
    ["duplicate root", [exactVariables, exactVariables]],
    ["unsupported value type", [{
      label: "VarTable",
      type: "list" as const,
      value: [{ typeId: 0, fields: [
        { label: "Name", type: "cexostring" as const, value: "x" },
        { label: "Type", type: "dword" as const, value: 4 },
        { label: "Value", type: "dword" as const, value: 1 },
      ] }],
    }]],
  ] as const)("keeps %s variables preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.stores[0]?.storeMetadata?.variables).toBeUndefined();
  });

  it("binds the exact ordered table into the GIT dependency fingerprint", () => {
    const first = parseAreaObjectsFromGitGff(git([exactVariables]));
    const changed = structuredClone(exactVariables);
    if (changed.type === "list") {
      const valueField = changed.value[0]?.fields.find((field) => field.label === "Value");
      if (valueField?.type === "int") valueField.value = -3;
    }
    const second = parseAreaObjectsFromGitGff(git([changed]));
    expect(second?.dependencyFingerprint).not.toBe(first?.dependencyFingerprint);
  });
});

function git(fields: SupportedGffField[], structTypeId = 11): Buffer {
  return buildGffBuffer([{
    label: "StoreList",
    type: "list",
    value: [{
      typeId: structTypeId,
      fields: [
        { label: "ResRef", type: "resref", value: "x2_merc_dye" },
        { label: "Tag", type: "cexostring", value: "x2_merc_dye" },
        ...fields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "XOrientation", type: "float", value: 0 },
        { label: "YOrientation", type: "float", value: -1 },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
