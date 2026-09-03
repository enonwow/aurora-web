import {
  ensureModuleIfoHak,
  moduleIfoAreaMembershipCount,
  moduleIfoContainsArea,
  readModuleIfoEntryArea,
  readModuleIfoStartLocation,
  removeAreaFromModuleIfoAreaList,
  updateModuleIfoStartLocation,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Aurora module IFO Area-list writer", () => {
  it("appends one exact HAK while preserving ordered HAKs, Area membership, struct types, and sibling fields", () => {
    const source = moduleIfo(
      [areaEntry("keep01", 6, [{ label: "Custom", type: "dword", value: 77 }])],
      "keep01",
      [hakEntry("test_snow", 8), hakEntry("grass_textures", 11, [
        { label: "HakCustom", type: "dword", value: 91 },
      ])],
    );

    const result = ensureModuleIfoHak(source, "cep3_tiles");

    expect(result).toMatchObject({
      hakCount: 3,
      alreadyPresent: false,
      orderedHakResRefs: ["test_snow", "grass_textures", "cep3_tiles"],
    });
    expect(moduleIfoContainsArea(result.bytes, "keep01")).toBe(true);
    expect(readModuleIfoEntryArea(result.bytes)).toBe("keep01");
    const document = parseRawGffDocument(result.bytes);
    expect(document?.fields.find((field) => field.label === "ModuleName")).toMatchObject({
      type: "cexostring",
      value: "Preserved Module",
    });
    const hakList = document?.fields.find((field) => field.label === "Mod_HakList");
    expect(hakList).toMatchObject({ type: "list" });
    if (hakList?.type !== "list") throw new Error("Expected HAK list.");
    expect(hakList.value.map((entry) => ({
      typeId: entry.typeId,
      hak: entry.fields.find((field) => field.label === "Mod_Hak")?.value,
      custom: entry.fields.find((field) => field.label === "HakCustom")?.value,
    }))).toEqual([
      { typeId: 8, hak: "test_snow", custom: undefined },
      { typeId: 11, hak: "grass_textures", custom: 91 },
      { typeId: 8, hak: "cep3_tiles", custom: undefined },
    ]);
  });

  it("returns byte-identical IFO for an already present exact HAK", () => {
    const source = moduleIfo(
      [areaEntry("keep01", 6)],
      "keep01",
      [hakEntry("test_snow", 8), hakEntry("CEP3_TILES", 8)],
    );

    const result = ensureModuleIfoHak(source, "cep3_tiles");

    expect(result).toMatchObject({
      hakCount: 2,
      alreadyPresent: true,
      orderedHakResRefs: ["test_snow", "cep3_tiles"],
    });
    expect(result.bytes.equals(source)).toBe(true);
  });

  it.each([
    ["invalid target", "../cep3_tiles", moduleIfo([areaEntry("keep01", 6)], "keep01")],
    ["non-list Mod_HakList", "cep3_tiles", buildGffBuffer([
      { label: "Mod_HakList", type: "cexostring", value: "broken" },
    ], "IFO ", 0)],
    ["missing Mod_Hak", "cep3_tiles", moduleIfo(
      [areaEntry("keep01", 6)],
      "keep01",
      [{ typeId: 8, fields: [{ label: "Other", type: "cexostring" as const, value: "x" }] }],
    )],
    ["duplicate Mod_Hak in one entry", "cep3_tiles", moduleIfo(
      [areaEntry("keep01", 6)],
      "keep01",
      [{ typeId: 8, fields: [
        { label: "Mod_Hak", type: "cexostring" as const, value: "one" },
        { label: "Mod_Hak", type: "cexostring" as const, value: "two" },
      ] }],
    )],
  ] as const)("rejects %s fail closed", (_label, target, source) => {
    expect(() => ensureModuleIfoHak(source, target)).toThrow();
  });

  it("removes exactly one Area while preserving the entry Area, root fields, list order, struct types, and sibling fields", () => {
    const source = moduleIfo([
      areaEntry("keep01", 6, [{ label: "Custom", type: "dword", value: 77 }]),
      areaEntry("delete01", 9, [{ label: "Custom", type: "cexostring", value: "retain-me" }]),
      areaEntry("keep02", 12),
    ], "keep01");

    const result = removeAreaFromModuleIfoAreaList(source, "DELETE01");

    expect(result).toMatchObject({ areaCount: 2, removedCount: 1 });
    expect(moduleIfoContainsArea(result.bytes, "delete01")).toBe(false);
    expect(moduleIfoAreaMembershipCount(result.bytes, "delete01")).toBe(0);
    expect(readModuleIfoEntryArea(result.bytes)).toBe("keep01");
    const document = parseRawGffDocument(result.bytes);
    expect(document?.fields.find((field) => field.label === "ModuleName")).toMatchObject({
      type: "cexostring",
      value: "Preserved Module",
    });
    const areaList = document?.fields.find((field) => field.label === "Mod_Area_list");
    expect(areaList).toMatchObject({ type: "list" });
    if (areaList?.type !== "list") throw new Error("Expected Area list.");
    expect(areaList.value.map((entry) => ({
      typeId: entry.typeId,
      area: entry.fields.find((field) => field.label === "Area_Name")?.value,
      custom: entry.fields.find((field) => field.label === "Custom")?.value,
    }))).toEqual([
      { typeId: 6, area: "keep01", custom: 77 },
      { typeId: 12, area: "keep02", custom: undefined },
    ]);
  });

  it.each([
    ["missing membership", [areaEntry("keep01", 6)]],
    ["duplicate membership", [areaEntry("delete01", 6), areaEntry("DELETE01", 7)]],
  ] as const)("rejects %s instead of producing an ambiguous IFO", (_label, entries) => {
    expect(() => removeAreaFromModuleIfoAreaList(
      moduleIfo([...entries], "keep01"),
      "delete01",
    )).toThrow("module.ifo must contain exactly one target Area membership.");
  });

  it("reads membership and entry identity case-insensitively and rejects malformed Area-list shapes", () => {
    const source = moduleIfo([areaEntry("Delete01", 6)], "DELETE01");
    expect(moduleIfoAreaMembershipCount(source, "delete01")).toBe(1);
    expect(readModuleIfoEntryArea(source)).toBe("delete01");

    const wrongList = buildGffBuffer([
      { label: "Mod_Area_list", type: "cexostring", value: "not-a-list" },
    ], "IFO ", 0);
    expect(() => removeAreaFromModuleIfoAreaList(wrongList, "delete01")).toThrow(
      "module.ifo Mod_Area_list is not a GFF list.",
    );
    expect(moduleIfoAreaMembershipCount(Buffer.from("not-gff"), "delete01")).toBe(-1);
    expect(readModuleIfoEntryArea(Buffer.from("not-gff"))).toBeNull();
  });

  it("reads and updates one exact six-field start tuple while preserving unrelated IFO state", () => {
    const source = moduleIfoWithStartLocation(
      [areaEntry("keep01", 6), areaEntry("entry02", 9)],
      {
        areaResRef: "keep01",
        x: 1.25,
        y: -2.5,
        z: 0.125,
        directionX: 0,
        directionY: 1,
      },
    );
    const target = {
      areaResRef: "entry02",
      x: Math.fround(10.1),
      y: Math.fround(20.2),
      z: Math.fround(0.3),
      directionX: Math.fround(0.6),
      directionY: Math.fround(0.8),
    } as const;

    expect(readModuleIfoStartLocation(source)).toEqual({
      areaResRef: "keep01",
      x: 1.25,
      y: -2.5,
      z: 0.125,
      directionX: 0,
      directionY: 1,
    });

    const result = updateModuleIfoStartLocation(source, {
      expectedValue: readModuleIfoStartLocation(source)!,
      value: target,
    });

    expect(result.startLocation).toEqual(target);
    expect(readModuleIfoStartLocation(result.bytes)).toEqual(target);
    expect(moduleIfoAreaMembershipCount(result.bytes, "keep01")).toBe(1);
    expect(moduleIfoAreaMembershipCount(result.bytes, "entry02")).toBe(1);
    const document = parseRawGffDocument(result.bytes);
    expect(document?.fields.find((field) => field.label === "CustomRoot")).toMatchObject({
      type: "void",
      value: Buffer.from([1, 2, 3]),
    });
    expect(document?.fields.find((field) => field.label === "ModuleName")).toMatchObject({
      type: "cexostring",
      value: "Preserved Module",
    });
  });

  it.each([
    ["stale expected tuple", (source: Buffer) => updateModuleIfoStartLocation(source, {
      expectedValue: { ...readModuleIfoStartLocation(source)!, x: 99 },
      value: { ...readModuleIfoStartLocation(source)!, y: 7 },
    })],
    ["unchanged target", (source: Buffer) => {
      const current = readModuleIfoStartLocation(source)!;
      return updateModuleIfoStartLocation(source, { expectedValue: current, value: current });
    }],
    ["non-member target", (source: Buffer) => updateModuleIfoStartLocation(source, {
      expectedValue: readModuleIfoStartLocation(source)!,
      value: { ...readModuleIfoStartLocation(source)!, areaResRef: "missing" },
    })],
  ])("rejects %s instead of producing an ambiguous start tuple", (_label, mutate) => {
    const source = moduleIfoWithStartLocation(
      [areaEntry("keep01", 6)],
      { areaResRef: "keep01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1 },
    );
    expect(() => mutate(source)).toThrow();
  });

  it("keeps missing, duplicate, wrong-case, and wrong-type start fields preserve-only", () => {
    const fields = moduleIfoFields(
      [areaEntry("keep01", 6)],
      { areaResRef: "keep01", x: 1, y: 2, z: 3, directionX: 0, directionY: 1 },
    );
    const missing = buildGffBuffer(
      fields.filter((field) => field.label !== "Mod_Entry_Dir_Y"),
      "IFO ",
      0,
    );
    const duplicate = buildGffBuffer([
      ...fields,
      { label: "Mod_Entry_X", type: "float", value: 4 },
    ], "IFO ", 0);
    const wrongCase = buildGffBuffer(fields.map((field) => field.label === "Mod_Entry_X"
      ? { ...field, label: "mod_entry_x" }
      : field), "IFO ", 0);
    const wrongType = buildGffBuffer(fields.map((field) => field.label === "Mod_Entry_X"
      ? { label: field.label, type: "dword" as const, value: 1 }
      : field), "IFO ", 0);

    for (const candidate of [missing, duplicate, wrongCase, wrongType]) {
      expect(readModuleIfoStartLocation(candidate)).toBeNull();
    }
  });
});

function moduleIfoWithStartLocation(
  entries: ReturnType<typeof areaEntry>[],
  start: Readonly<{
    areaResRef: string;
    x: number;
    y: number;
    z: number;
    directionX: number;
    directionY: number;
  }>,
): Buffer {
  return buildGffBuffer(moduleIfoFields(entries, start), "IFO ", 0);
}

function moduleIfoFields(
  entries: ReturnType<typeof areaEntry>[],
  start: Readonly<{
    areaResRef: string;
    x: number;
    y: number;
    z: number;
    directionX: number;
    directionY: number;
  }>,
) {
  return [
    { label: "ModuleName", type: "cexostring" as const, value: "Preserved Module" },
    { label: "Mod_Entry_Area", type: "resref" as const, value: start.areaResRef },
    { label: "Mod_Entry_X", type: "float" as const, value: start.x },
    { label: "Mod_Entry_Y", type: "float" as const, value: start.y },
    { label: "Mod_Entry_Z", type: "float" as const, value: start.z },
    { label: "Mod_Entry_Dir_X", type: "float" as const, value: start.directionX },
    { label: "Mod_Entry_Dir_Y", type: "float" as const, value: start.directionY },
    { label: "Mod_Area_list", type: "list" as const, value: entries },
    { label: "CustomRoot", type: "void" as const, value: Buffer.from([1, 2, 3]) },
  ];
}

function moduleIfo(
  entries: ReturnType<typeof areaEntry>[],
  entryArea: string,
  hakEntries: ReturnType<typeof hakEntry>[] = [],
): Buffer {
  return buildGffBuffer([
    { label: "ModuleName", type: "cexostring", value: "Preserved Module" },
    { label: "Mod_Entry_Area", type: "resref", value: entryArea },
    { label: "Mod_Area_list", type: "list", value: entries },
    { label: "Mod_HakList", type: "list", value: hakEntries },
    { label: "CustomRoot", type: "void", value: Buffer.from([1, 2, 3]) },
  ], "IFO ", 0);
}

function hakEntry(
  hakResRef: string,
  typeId: number,
  extra: Array<{ label: string; type: "dword"; value: number }> = [],
) {
  return {
    typeId,
    fields: [
      { label: "Mod_Hak", type: "cexostring" as const, value: hakResRef },
      ...extra,
    ],
  };
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
