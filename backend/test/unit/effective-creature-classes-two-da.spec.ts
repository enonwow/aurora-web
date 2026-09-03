import {
  isExactEffectiveCreatureClassesTwoDaTable,
  parseEffectiveCreatureClassesTwoDa,
} from "../../src/modules/catalog/domain/effective-creature-classes-two-da";

describe("effective Creature classes.2da", () => {
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL NAME PLAYERCLASS",
    "0 Fighter 10 1",
    "1 Wizard 11 1",
    "2 Hidden **** 0",
    "3 Custom 12 0",
    "",
  ].join("\n"), "utf8");

  it("preserves admitted physical class rows and immutable identity", () => {
    const table = parseEffectiveCreatureClassesTwoDa({
      bytes,
      sourceObjectKey: "modules/example/classes.2da",
      sourceLayer: "module",
      resolveStrRef: (strRef) => strRef === 10 ? "Fighter" : undefined,
    });

    expect(table).not.toBeNull();
    expect(table?.descriptor).toMatchObject({
      resourceName: "classes.2da",
      sourceLayer: "module",
      rowCount: 4,
      sizeBytes: bytes.length,
    });
    expect(table?.rows).toEqual([
      { rowIndex: 0, displayName: "Fighter", displaySource: "strref", nameStrRef: 10 },
      { rowIndex: 1, displayName: "StringRef 11", displaySource: "strref_id", nameStrRef: 11 },
      { rowIndex: 3, displayName: "StringRef 12", displaySource: "strref_id", nameStrRef: 12 },
    ]);
    expect(isExactEffectiveCreatureClassesTwoDaTable(table)).toBe(true);
  });

  it.each([
    Buffer.from("2DA V2.0\n\nLABEL\n0 Fighter\n", "utf8"),
    Buffer.from("2DA V2.0\n\nNAME NAME\n0 10 10\n", "utf8"),
    Buffer.from("2DA V2.0\n\nNAME\n0 ****\n", "utf8"),
  ])("rejects a malformed or unadmitted complete source", (candidate) => {
    expect(parseEffectiveCreatureClassesTwoDa({
      bytes: candidate,
      sourceObjectKey: "hak/example/classes.2da",
      sourceLayer: "hak",
      resolveStrRef: () => undefined,
    })).toBeNull();
  });
});
