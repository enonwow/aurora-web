import {
  isExactEffectiveCreatureStartingPackagesTwoDaTable,
  localizeEffectiveCreatureStartingPackagesTwoDa,
  parseEffectiveCreatureStartingPackagesTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-starting-packages-two-da";

describe("effective Creature packages.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "Label Name ClassID Description",
    "0 Fighter 100 4 200",
    "1 FighterFallback **** 4 201",
    "2 Cleric 102 2 202",
    "3 **** **** **** ****",
    "4 MissingTlk 9999 4 204",
    "",
  ].join("\n");

  it("retains sparse physical rows including row zero and exact ClassID", () => {
    const result = parseEffectiveCreatureStartingPackagesTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
      sourceLayer: "vanilla",
      resolveStrRef: (strRef) => strRef === 100 ? "Fighter Package" : undefined,
    });

    expect(result).toEqual({
      descriptor: {
        resourceName: "packages.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 5,
      },
      rows: [
        {
          rowIndex: 0,
          classId: 4,
          displayName: "Fighter Package",
          displaySource: "strref",
          nameStrRef: 100,
        },
        {
          rowIndex: 1,
          classId: 4,
          displayName: "FighterFallback",
          displaySource: "label",
          nameStrRef: null,
        },
        {
          rowIndex: 2,
          classId: 2,
          displayName: "StringRef 102",
          displaySource: "strref_id",
          nameStrRef: 102,
        },
        {
          rowIndex: 4,
          classId: 4,
          displayName: "StringRef 9999",
          displaySource: "strref_id",
          nameStrRef: 9999,
        },
      ],
    });
    expect(isExactEffectiveCreatureStartingPackagesTwoDaTable(result)).toBe(true);
  });

  it("relocalizes numeric names without replacing Label fallbacks", () => {
    const table = parseEffectiveCreatureStartingPackagesTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/packages.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })!;

    expect(localizeEffectiveCreatureStartingPackagesTwoDa(
      table,
      (strRef) => strRef === 9999 ? "Localized Package" : undefined,
    ).rows).toEqual([
      expect.objectContaining({ rowIndex: 0, displayName: "StringRef 100", displaySource: "strref_id" }),
      expect.objectContaining({ rowIndex: 1, displayName: "FighterFallback", displaySource: "label" }),
      expect.objectContaining({ rowIndex: 2, displayName: "StringRef 102", displaySource: "strref_id" }),
      expect.objectContaining({ rowIndex: 4, displayName: "Localized Package", displaySource: "strref" }),
    ]);
  });

  it.each([
    ["wrong version", source.replace("2DA V2.0", "2DA V1.0")],
    ["missing Label", source.replace("Label ", "Title ")],
    ["missing Name", source.replace("Name ", "StringRef ")],
    ["missing ClassID", source.replace("ClassID ", "Class ")],
    ["duplicate ClassID", source.replace("Label Name", "ClassID Name")],
  ])("rejects %s", (_label, value) => {
    expect(parseEffectiveCreatureStartingPackagesTwoDa({
      bytes: Buffer.from(value, "ascii"),
      sourceObjectKey: "x/packages.2da",
      sourceLayer: "hak",
      resolveStrRef: () => undefined,
    })).toBeNull();
  });

  it("rejects tables whose physical cardinality cannot fit StartingPackage:Byte", () => {
    const rows = Array.from({ length: 257 }, (_, index) =>
      `${index} Package${index} ${1000 + index} 4 1`);
    expect(parseEffectiveCreatureStartingPackagesTwoDa({
      bytes: Buffer.from(["2DA V2.0", "", "Label Name ClassID Description", ...rows, ""].join("\n")),
      sourceObjectKey: "x/packages.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })).toBeNull();
  });

  it("rejects malformed exact table objects", () => {
    const value = parseEffectiveCreatureStartingPackagesTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "x/packages.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })!;
    expect(isExactEffectiveCreatureStartingPackagesTwoDaTable({ ...value, extra: true })).toBe(false);
    expect(isExactEffectiveCreatureStartingPackagesTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 1 ? { ...row, rowIndex: 0 } : row),
    })).toBe(false);
    expect(isExactEffectiveCreatureStartingPackagesTwoDaTable({
      ...value,
      rows: value.rows.map((row, index) => index === 0 ? { ...row, classId: -1 } : row),
    })).toBe(false);
  });
});
