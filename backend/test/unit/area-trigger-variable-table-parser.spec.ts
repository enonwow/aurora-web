import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;

describe("Area GIT Trigger VarTable parsing", () => {
  it("reads exact absence as an editable empty ordered table", () => {
    expect(parseAreaObjectsFromGitGff(git([]))?.triggers[0]?.triggerVariables)
      .toEqual({ expectedEntries: [] });
  });

  it("reads exact INT, FLOAT, and CExoString entries without reordering duplicates", () => {
    expect(parseAreaObjectsFromGitGff(git([varTable([
      variable("dup", 1, { type: "int", value: -2 }),
      variable("dup", 2, { type: "float", value: Math.fround(1.5) }),
      variable("", 3, { type: "cexostring", value: " value " }),
    ])]))?.triggers[0]?.triggerVariables).toEqual({
      expectedEntries: [
        { sourceIndex: 0, name: "dup", type: "int", value: -2 },
        { sourceIndex: 1, name: "dup", type: "float", value: Math.fround(1.5) },
        { sourceIndex: 2, name: "", type: "string", value: " value " },
      ],
    });
  });

  it.each([
    ["wrong list case", [{ label: "vartable", type: "list", value: [] }]],
    ["duplicate list", [varTable([]), varTable([])]],
    ["wrong entry type", [varTable([{ typeId: 5, fields: [] }])]],
    ["unsupported native variable type", [varTable([
      variable("x", 4, { type: "dword", value: 1 }),
    ])]],
  ] as const)("keeps %s preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerVariables).toBeUndefined();
  });
});

function variable(
  name: string,
  nativeType: number,
  value: SupportedGffField,
): { typeId: number; fields: SupportedGffField[] } {
  return {
    typeId: 0,
    fields: [
      { label: "Name", type: "cexostring", value: name },
      { label: "Type", type: "dword", value: nativeType },
      { ...value, label: "Value" },
    ],
  };
}

function varTable(value: Array<{ typeId: number; fields: SupportedGffField[] }>): SupportedGffField {
  return { label: "VarTable", type: "list", value };
}

function git(triggerFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "TriggerList",
    type: "list",
    value: [{
      typeId: 1,
      fields: [
        { label: "TemplateResRef", type: "resref", value: "newgeneric" },
        { label: "Tag", type: "cexostring", value: "GenericTrigger" },
        ...triggerFields,
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
