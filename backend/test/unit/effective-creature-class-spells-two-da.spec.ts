import { parseEffectiveCreatureClassesTwoDa } from
  "../../src/modules/catalog/domain/effective-creature-classes-two-da";
import {
  isExactEffectiveCreatureClassSpellsTwoDaTable,
  parseEffectiveCreatureClassSpellsTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-class-spells-two-da";

describe("effective Creature class spells.2da", () => {
  const classesBytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL NAME SpellTableColumn",
    "0 Fighter 10 ****",
    "1 Bard 11 Bard",
    "2 Cleric 12 ****",
    "9 Sorcerer 13 Wiz_Sorc",
    "40 Custom 14 CustomSpells",
    "",
  ].join("\n"), "utf8");
  const spellsBytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL Name SpellDesc Master Bard Cleric Wiz_Sorc CustomSpells",
    "0 Alpha 100 200 **** 0 **** 0 1",
    "1 Beta 101 **** **** 1 2 **** ****",
    "2 HiddenMaster 102 **** 7 1 1 1 1",
    "3 HiddenName **** 203 **** 1 1 1 1",
    "4 Gamma 104 204 **** **** 3 4 5",
    "",
  ].join("\n"), "utf8");

  function classesTable() {
    return parseEffectiveCreatureClassesTwoDa({
      bytes: classesBytes,
      sourceObjectKey: "modules/example/classes.2da",
      sourceLayer: "module",
      resolveStrRef: () => undefined,
    })!;
  }

  it("maps physical spell rows through exact and native fallback class columns", () => {
    const table = parseEffectiveCreatureClassSpellsTwoDa({
      bytes: spellsBytes,
      sourceObjectKey: "hak/example/spells.2da",
      sourceLayer: "hak",
      classesTable: classesTable(),
      resolveStrRef: (strRef) => strRef === 100 ? "Alpha spell" : undefined,
    });

    expect(table?.descriptor).toMatchObject({
      resourceName: "spells.2da",
      sourceLayer: "hak",
      rowCount: 5,
      sizeBytes: spellsBytes.length,
    });
    expect(table?.classesDescriptor).toEqual(classesTable().descriptor);
    expect(table?.rows).toEqual([
      {
        classId: 1, rowIndex: 0, spellLevel: 0, nameStrRef: 100,
        spellDescStrRef: 200, displayName: "Alpha spell", displaySource: "strref",
      },
      {
        classId: 1, rowIndex: 1, spellLevel: 1, nameStrRef: 101,
        displayName: "StringRef 101", displaySource: "strref_id",
      },
      {
        classId: 2, rowIndex: 1, spellLevel: 2, nameStrRef: 101,
        displayName: "StringRef 101", displaySource: "strref_id",
      },
      {
        classId: 2, rowIndex: 4, spellLevel: 3, nameStrRef: 104,
        spellDescStrRef: 204, displayName: "StringRef 104", displaySource: "strref_id",
      },
      {
        classId: 3, rowIndex: 0, spellLevel: 0, nameStrRef: 100,
        spellDescStrRef: 200, displayName: "Alpha spell", displaySource: "strref",
      },
      {
        classId: 3, rowIndex: 4, spellLevel: 4, nameStrRef: 104,
        spellDescStrRef: 204, displayName: "StringRef 104", displaySource: "strref_id",
      },
      {
        classId: 4, rowIndex: 0, spellLevel: 1, nameStrRef: 100,
        spellDescStrRef: 200, displayName: "Alpha spell", displaySource: "strref",
      },
      {
        classId: 4, rowIndex: 4, spellLevel: 5, nameStrRef: 104,
        spellDescStrRef: 204, displayName: "StringRef 104", displaySource: "strref_id",
      },
    ]);
    expect(isExactEffectiveCreatureClassSpellsTwoDaTable(table)).toBe(true);
  });

  it.each([
    Buffer.from("2DA V2.0\n\nMaster Bard\n0 **** 0\n", "utf8"),
    Buffer.from("2DA V2.0\n\nName Name Master Bard\n0 100 100 **** 0\n", "utf8"),
    Buffer.from("2DA V2.1\n\nName Master Bard\n0 100 **** 0\n", "utf8"),
  ])("rejects malformed or unusable complete spell sources %#", (bytes) => {
    expect(parseEffectiveCreatureClassSpellsTwoDa({
      bytes,
      sourceObjectKey: "vanilla:spells.2da",
      sourceLayer: "vanilla",
      classesTable: classesTable(),
      resolveStrRef: () => undefined,
    })).toBeNull();
  });
});
