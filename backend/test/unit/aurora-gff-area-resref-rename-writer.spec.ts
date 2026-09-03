import {
  readExactAreaRootResRef,
  readExactModuleAreaIdentity,
  renameAreaRootResRef,
  renameModuleAreaIdentity,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-resref-rename-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Aurora Area ResRef rename writers", () => {
  it("replaces one exact ARE root ResRef and preserves unrelated values and root type", () => {
    const source = areaAre([
      { label: "Before", type: "cexostring", value: "preserve" },
      { label: "ResRef", type: "resref", value: "old_area" },
      { label: "After", type: "void", value: Buffer.from([1, 2, 3]) },
    ], 42);

    const result = renameAreaRootResRef(source, "old_area", "new_area");

    expect(result).toMatchObject({ expectedResRef: "old_area", resRef: "new_area" });
    expect(readExactAreaRootResRef(result.bytes)).toBe("new_area");
    const document = parseRawGffDocument(result.bytes);
    expect(document?.rootStructTypeId).toBe(42);
    expect(document?.fields).toEqual([
      { label: "Before", type: "cexostring", value: "preserve" },
      { label: "ResRef", type: "resref", value: "new_area" },
      { label: "After", type: "void", value: Buffer.from([1, 2, 3]) },
    ]);
  });

  it.each([
    ["missing root identity", areaAre([]), "old_area", "new_area"],
    ["duplicate root identity", areaAre([
      { label: "ResRef", type: "resref", value: "old_area" },
      { label: "ResRef", type: "resref", value: "old_area" },
    ]), "old_area", "new_area"],
    ["wrong-case label", areaAre([
      { label: "resref", type: "resref", value: "old_area" },
    ]), "old_area", "new_area"],
    ["wrong field type", areaAre([
      { label: "ResRef", type: "cexostring", value: "old_area" },
    ]), "old_area", "new_area"],
    ["stale expected identity", areaAre([
      { label: "ResRef", type: "resref", value: "other" },
    ]), "old_area", "new_area"],
    ["unchanged identity", areaAre([
      { label: "ResRef", type: "resref", value: "old_area" },
    ]), "old_area", "old_area"],
    ["non-canonical target", areaAre([
      { label: "ResRef", type: "resref", value: "old_area" },
    ]), "old_area", "New Area"],
  ] as const)("rejects %s", (_label, source, expected, target) => {
    expect(() => renameAreaRootResRef(source, expected, target)).toThrow();
  });

  it("replaces one membership in place and conditionally replaces the entry Area", () => {
    const source = moduleIfo([
      areaEntry("keep01", 6, [{ label: "Custom", type: "dword", value: 7 }]),
      areaEntry("old_area", 11, [{ label: "Custom", type: "cexostring", value: "retain" }]),
      areaEntry("keep02", 12),
    ], "old_area");

    const result = renameModuleAreaIdentity(source, "old_area", "new_area");

    expect(result).toMatchObject({
      expectedResRef: "old_area",
      resRef: "new_area",
      entryAreaUpdated: true,
      entryAreaResRef: "new_area",
      areaCount: 3,
    });
    expect(readExactModuleAreaIdentity(result.bytes, "new_area")).toEqual({
      areaCount: 3,
      membershipCount: 1,
      entryAreaResRef: "new_area",
    });
    expect(readExactModuleAreaIdentity(result.bytes, "old_area")).toEqual({
      areaCount: 3,
      membershipCount: 0,
      entryAreaResRef: "new_area",
    });
    const document = parseRawGffDocument(result.bytes);
    const list = document?.fields.find((field) => field.label === "Mod_Area_list");
    if (list?.type !== "list") throw new Error("Expected Area list.");
    expect(list.value.map((entry) => ({
      typeId: entry.typeId,
      name: entry.fields.find((field) => field.label === "Area_Name")?.value,
      custom: entry.fields.find((field) => field.label === "Custom")?.value,
    }))).toEqual([
      { typeId: 6, name: "keep01", custom: 7 },
      { typeId: 11, name: "new_area", custom: "retain" },
      { typeId: 12, name: "keep02", custom: undefined },
    ]);
    expect(document?.fields.find((field) => field.label === "Mod_Entry_X")).toEqual({
      label: "Mod_Entry_X", type: "float", value: 1.25,
    });
    expect(document?.fields.find((field) => field.label === "CustomRoot")).toEqual({
      label: "CustomRoot", type: "void", value: Buffer.from([4, 5, 6]),
    });
  });

  it("preserves a different entry Area while renaming the membership", () => {
    const result = renameModuleAreaIdentity(
      moduleIfo([areaEntry("entry01", 6), areaEntry("old_area", 7)], "entry01"),
      "old_area",
      "new_area",
    );

    expect(result.entryAreaUpdated).toBe(false);
    expect(result.entryAreaResRef).toBe("entry01");
    expect(readExactModuleAreaIdentity(result.bytes, "new_area")).toEqual({
      areaCount: 2,
      membershipCount: 1,
      entryAreaResRef: "entry01",
    });
  });

  it.each([
    ["missing old membership", moduleIfo([areaEntry("keep01", 6)], "keep01")],
    ["duplicate old membership", moduleIfo([
      areaEntry("old_area", 6), areaEntry("old_area", 7),
    ], "old_area")],
    ["target collision", moduleIfo([
      areaEntry("old_area", 6), areaEntry("new_area", 7),
    ], "old_area")],
    ["duplicate Area_Name", moduleIfo([{
      typeId: 6,
      fields: [
        { label: "Area_Name", type: "resref" as const, value: "old_area" },
        { label: "Area_Name", type: "resref" as const, value: "old_area" },
      ],
    }], "old_area")],
    ["wrong-case Area_Name", moduleIfo([{
      typeId: 6,
      fields: [{ label: "area_name", type: "resref" as const, value: "old_area" }],
    }], "old_area")],
    ["wrong-type Area_Name", moduleIfo([{
      typeId: 6,
      fields: [{ label: "Area_Name", type: "cexostring" as const, value: "old_area" }],
    }], "old_area")],
  ] as const)("rejects %s", (_label, source) => {
    expect(() => renameModuleAreaIdentity(source, "old_area", "new_area")).toThrow();
  });

  it("rejects missing, duplicate, wrong-case, and wrong-type entry identity", () => {
    const valid = moduleFields([areaEntry("old_area", 6)], "old_area");
    const candidates = [
      valid.filter((field) => field.label !== "Mod_Entry_Area"),
      [...valid, { label: "Mod_Entry_Area", type: "resref" as const, value: "old_area" }],
      valid.map((field) => field.label === "Mod_Entry_Area"
        ? { ...field, label: "mod_entry_area" }
        : field),
      valid.map((field) => field.label === "Mod_Entry_Area"
        ? { label: "Mod_Entry_Area", type: "cexostring" as const, value: "old_area" }
        : field),
    ];
    for (const fields of candidates) {
      const source = buildGffBuffer(fields, "IFO ", 0);
      expect(readExactModuleAreaIdentity(source, "old_area")).toBeNull();
      expect(() => renameModuleAreaIdentity(source, "old_area", "new_area")).toThrow();
    }
  });
});

function areaAre(fields: Parameters<typeof buildGffBuffer>[0], rootType = 0): Buffer {
  return buildGffBuffer(fields, "ARE ", rootType);
}

function moduleIfo(entries: ReturnType<typeof areaEntry>[], entryArea: string): Buffer {
  return buildGffBuffer(moduleFields(entries, entryArea), "IFO ", 0);
}

function moduleFields(entries: ReturnType<typeof areaEntry>[], entryArea: string) {
  return [
    { label: "ModuleName", type: "cexostring" as const, value: "Preserved" },
    { label: "Mod_Entry_Area", type: "resref" as const, value: entryArea },
    { label: "Mod_Entry_X", type: "float" as const, value: 1.25 },
    { label: "Mod_Entry_Y", type: "float" as const, value: 2.5 },
    { label: "Mod_Entry_Z", type: "float" as const, value: 0 },
    { label: "Mod_Entry_Dir_X", type: "float" as const, value: 0 },
    { label: "Mod_Entry_Dir_Y", type: "float" as const, value: 1 },
    { label: "Mod_Area_list", type: "list" as const, value: entries },
    { label: "CustomRoot", type: "void" as const, value: Buffer.from([4, 5, 6]) },
  ];
}

function areaEntry(
  areaResRef: string,
  typeId: number,
  extra: Array<
    | { label: string; type: "dword"; value: number }
    | { label: string; type: "cexostring"; value: string }
  > = [],
) {
  return {
    typeId,
    fields: [
      { label: "Area_Name", type: "resref" as const, value: areaResRef },
      ...extra,
    ],
  };
}
