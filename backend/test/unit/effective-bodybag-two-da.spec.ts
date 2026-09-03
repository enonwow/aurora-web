import {
  MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES,
  MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS,
  buildEffectiveBodyBagTwoDaRowOptions,
  isEffectiveBodyBagTwoDaInputAdmitted,
  isExactEffectiveBodyBagTwoDaResolvedTable,
  parseEffectiveBodyBagTwoDa,
} from "../../src/modules/catalog/domain/effective-bodybag-two-da";

describe("effective bodybag.2da", () => {
  const retailSource = [
    "2DA V2.0",
    "",
    "LABEL Name Appearance",
    "0 default 6671 ****",
    "1 Potion 66483 194",
    "2 Scroll 66484 195",
    "3 Treasure 66490 196",
    "4 Body 66492 198",
    "5 Bones 66493 199",
    "6 Pouch 66494 200",
    "",
  ].join("\n");

  it("builds one digest-bound descriptor and all exact physical retail rows", () => {
    const parsed = parseEffectiveBodyBagTwoDa({
      bytes: Buffer.from(retailSource, "ascii"),
      sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
      sourceLayer: "vanilla",
    });

    expect(parsed).toEqual({
      descriptor: {
        resourceName: "bodybag.2da",
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/bodybag.2da",
        sourceLayer: "vanilla",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(retailSource, "ascii"),
        rowCount: 7,
      },
      rows: [
        { rowIndex: 0, label: "default", nameStrRef: 6671 },
        { rowIndex: 1, label: "Potion", nameStrRef: 66483 },
        { rowIndex: 2, label: "Scroll", nameStrRef: 66484 },
        { rowIndex: 3, label: "Treasure", nameStrRef: 66490 },
        { rowIndex: 4, label: "Body", nameStrRef: 66492 },
        { rowIndex: 5, label: "Bones", nameStrRef: 66493 },
        { rowIndex: 6, label: "Pouch", nameStrRef: 66494 },
      ],
    });
  });

  it("resolves Name StrRefs for display and falls back without changing row identity", () => {
    const parsed = parseEffectiveBodyBagTwoDa({
      bytes: Buffer.from(retailSource, "ascii"),
      sourceObjectKey: "x/bodybag.2da",
      sourceLayer: "module",
    })!;
    expect(buildEffectiveBodyBagTwoDaRowOptions(parsed.rows, (strRef) =>
      strRef === 6671 ? "Default" : undefined,
    ).slice(0, 2)).toEqual([
      { rowIndex: 0, label: "default", nameStrRef: 6671, displayName: "Default", displaySource: "strref" },
      { rowIndex: 1, label: "Potion", nameStrRef: 66483, displayName: "Potion", displaySource: "label" },
    ]);
  });

  it.each([
    ["wrong version", retailSource.replace("2DA V2.0", "2DA V9.9")],
    ["missing Name", retailSource.replace("Name", "WrongName")],
    ["duplicate Name", retailSource.replace("Name Appearance", "Name Name Appearance").replace(/6671/g, "6671 6671").replace(/66483/g, "66483 66483").replace(/66484/g, "66484 66484").replace(/66490/g, "66490 66490").replace(/66492/g, "66492 66492").replace(/66493/g, "66493 66493").replace(/66494/g, "66494 66494")],
    ["negative Name StrRef", retailSource.replace("6671", "-1")],
    ["overflow Name StrRef", retailSource.replace("6671", "4294967296")],
    ["coercible Name StrRef", retailSource.replace("6671", "+6671")],
    ["blank Name StrRef", retailSource.replace("6671", "****")],
    ["empty label", retailSource.replace("default", "\"\"")],
    ["NUL label", retailSource.replace("default", "de\0fault")],
    ["over-budget label", retailSource.replace("default", "x".repeat(257))],
  ])("rejects %s", (_label, source) => {
    expect(parseEffectiveBodyBagTwoDa({
      bytes: Buffer.from(source, "utf8"),
      sourceObjectKey: "x/bodybag.2da",
      sourceLayer: "module",
    })).toBeNull();
  });

  it("enforces input, source-key, source-layer, row, and byte budgets", () => {
    expect(isEffectiveBodyBagTwoDaInputAdmitted({
      bytes: Buffer.alloc(1), sourceObjectKey: "x", sourceLayer: "module",
    })).toBe(true);
    expect(isEffectiveBodyBagTwoDaInputAdmitted({
      bytes: Buffer.alloc(MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES),
      sourceObjectKey: "x".repeat(2048), sourceLayer: "hak",
    })).toBe(true);
    for (const input of [
      { bytes: Buffer.alloc(0), sourceObjectKey: "x", sourceLayer: "module" },
      { bytes: Buffer.alloc(MAX_EFFECTIVE_BODYBAG_TWO_DA_BYTES + 1), sourceObjectKey: "x", sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "", sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "x".repeat(2049), sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "x", sourceLayer: "override" },
    ]) expect(isEffectiveBodyBagTwoDaInputAdmitted(input)).toBe(false);

    const rows = Array.from({ length: MAX_EFFECTIVE_BODYBAG_TWO_DA_ROWS + 1 },
      (_, index) => `${index} Row${index} ${index} ****`);
    expect(parseEffectiveBodyBagTwoDa({
      bytes: Buffer.from(["2DA V2.0", "", "LABEL Name Appearance", ...rows].join("\n"), "ascii"),
      sourceObjectKey: "x/bodybag.2da", sourceLayer: "module",
    })).toBeNull();
  });

  it("validates the exact resolved table consumed across the Area boundary", () => {
    const table = () => ({
      descriptor: {
        resourceName: "bodybag.2da",
        sourceObjectKey: "x",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 1,
        rowCount: 2,
      },
      rows: [
        { rowIndex: 0, label: "Default", nameStrRef: 0, displayName: "Default", displaySource: "strref" },
        { rowIndex: 1, nameStrRef: 0xffff_ffff, displayName: "Row 1", displaySource: "row_index" },
      ],
    });
    expect(isExactEffectiveBodyBagTwoDaResolvedTable(table())).toBe(true);
    const invalidMutations: Array<(value: any) => void> = [
      (value) => { value.extra = true; },
      (value) => { value.descriptor.resourceName = "traps.2da"; },
      (value) => { value.descriptor.sha256 = "D".repeat(64); },
      (value) => { value.descriptor.rowCount = 1; },
      (value) => { value.rows[0].rowIndex = 1; },
      (value) => { value.rows[0].nameStrRef = -1; },
      (value) => { value.rows[0].displayName = ""; },
      (value) => { value.rows[0].displaySource = "tlk"; },
      (value) => { value.rows[0].extra = true; },
    ];
    for (const mutate of invalidMutations) {
      const value = table();
      mutate(value);
      expect(isExactEffectiveBodyBagTwoDaResolvedTable(value)).toBe(false);
    }
    expect(isExactEffectiveBodyBagTwoDaResolvedTable(null)).toBe(false);
    expect(isExactEffectiveBodyBagTwoDaResolvedTable([])).toBe(false);
  });
});
