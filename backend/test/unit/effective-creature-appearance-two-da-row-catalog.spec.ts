import {
  buildEffectiveCreatureAppearanceTwoDaRowOptions,
  parseEffectiveCreatureAppearanceTwoDaRows,
  shouldAdmitEffectiveCreatureAppearanceTwoDaSource,
} from "../../src/modules/catalog/domain/effective-creature-appearance-two-da-row-catalog";

describe("effective creature appearance.2da Toolset row catalog", () => {
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL STRING_REF MODELTYPE RACE",
    "900 AirElemental 5747 F E",
    "901 DwarfMale **** P D",
    "902 ExplicitZero 0 P D",
    "903 ExplicitMinusOne -1 P D",
    "904 **** **** P D",
    "905 InvalidRef nope P D",
  ].join("\n"), "utf-8");

  it("preserves physical ordinals and distinguishes failed STRING_REF reads", () => {
    expect(parseEffectiveCreatureAppearanceTwoDaRows(bytes)).toStrictEqual([
      { rowIndex: 0, label: "AirElemental", strRef: 5747 },
      { rowIndex: 1, label: "DwarfMale" },
      { rowIndex: 2, label: "ExplicitZero", strRef: 0 },
      { rowIndex: 3, label: "ExplicitMinusOne", strRef: 0xffff_ffff },
      { rowIndex: 4 },
      { rowIndex: 5, label: "InvalidRef" },
    ]);
  });

  it("reproduces native Toolset admission without LABEL rescue for explicit 0/-1 refs", () => {
    const rows = parseEffectiveCreatureAppearanceTwoDaRows(bytes)!;
    expect(buildEffectiveCreatureAppearanceTwoDaRowOptions(rows, (strRef) =>
      strRef === 5747 ? "Elemental, Air" : undefined
    )).toStrictEqual([
      {
        rowIndex: 0,
        displayName: "Elemental, Air",
        displaySource: "strref",
        strRef: 5747,
        label: "AirElemental",
      },
      {
        rowIndex: 1,
        displayName: "DwarfMale",
        displaySource: "label",
        label: "DwarfMale",
      },
      {
        rowIndex: 5,
        displayName: "InvalidRef",
        displaySource: "label",
        label: "InvalidRef",
      },
    ]);
  });

  it("keeps a native admitted STRING_REF row visible when TLK lookup fails", () => {
    expect(buildEffectiveCreatureAppearanceTwoDaRowOptions(
      [{ rowIndex: 52, strRef: 1234, label: "AirElemental" }],
      () => undefined,
    )).toStrictEqual([{
      rowIndex: 52,
      displayName: "StringRef 1234",
      displaySource: "strref_id",
      strRef: 1234,
      label: "AirElemental",
    }]);
    expect(buildEffectiveCreatureAppearanceTwoDaRowOptions(
      [{ rowIndex: 52, strRef: 1234 }],
      () => { throw new Error("TLK unavailable"); },
    )).toHaveProperty("0.displaySource", "strref_id");
  });

  it("excludes rows that cannot round-trip through native Word", () => {
    expect(buildEffectiveCreatureAppearanceTwoDaRowOptions([
      { rowIndex: 0xffff, label: "LastWord" },
      { rowIndex: 0x1_0000, label: "Overflow" },
    ], () => undefined)).toStrictEqual([{
      rowIndex: 0xffff,
      displayName: "LastWord",
      displaySource: "label",
      label: "LastWord",
    }]);
  });

  it("does not trim, truncate, synthesize Row N, or admit invalid display text", () => {
    expect(buildEffectiveCreatureAppearanceTwoDaRowOptions([
      { rowIndex: 7, label: " exact " },
      { rowIndex: 8 },
      { rowIndex: 9, label: "bad\0label" },
      { rowIndex: 10, label: "x".repeat(257) },
    ], () => undefined)).toStrictEqual([{
      rowIndex: 7,
      displayName: " exact ",
      displaySource: "label",
      label: " exact ",
    }]);
  });

  it("admits a source only when exact descriptor provenance is available", () => {
    const descriptor = {
      resourceName: "appearance.2da" as const,
      sourceObjectKey: "modules/current/appearance.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 1,
      rowCount: 1,
    };
    expect(shouldAdmitEffectiveCreatureAppearanceTwoDaSource(descriptor)).toBe(true);
    expect(shouldAdmitEffectiveCreatureAppearanceTwoDaSource(null)).toBe(false);
  });

  it.each([
    Buffer.from("2da v2.0\nLABEL STRING_REF MODELTYPE\n0 Row **** P", "utf-8"),
    Buffer.from("2DA V2.0\nLABEL STRING_REF modeltype\n0 Row **** P", "utf-8"),
    Buffer.from("2DA V2.0\nLABEL STRING_REF MODELTYPE\nnot-a-row Row **** P", "utf-8"),
  ])("rejects a table outside the exact descriptor boundary", (candidate) => {
    expect(parseEffectiveCreatureAppearanceTwoDaRows(candidate)).toBeNull();
  });
});
