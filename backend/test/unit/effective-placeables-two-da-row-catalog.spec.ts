import {
  buildEffectivePlaceablesTwoDaRowOptions,
  parseEffectivePlaceablesTwoDaRows,
  shouldAdmitEffectivePlaceablesTwoDaSource,
} from "../../src/modules/catalog/domain/effective-placeables-two-da-row-catalog";

describe("effective placeables.2da physical row catalog", () => {
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "Label StrRef ModelName Static",
    "900 WaterTrough 5747 PLC_N02 1",
    "901 \"Custom Sign With Spaces\" **** plc_sign 1",
    "902 **** **** **** 0",
  ].join("\n"), "utf-8");

  it("admits a source when either renderer rows or exact table provenance are available", () => {
    const descriptor = {
      resourceName: "placeables.2da" as const,
      sourceObjectKey: "modules/current/placeables.2da",
      sourceLayer: "module" as const,
      sha256: "a".repeat(64),
      sizeBytes: 1,
      rowCount: 1,
    };

    expect(shouldAdmitEffectivePlaceablesTwoDaSource(1, descriptor)).toBe(true);
    expect(shouldAdmitEffectivePlaceablesTwoDaSource(1, null)).toBe(true);
    expect(shouldAdmitEffectivePlaceablesTwoDaSource(0, descriptor)).toBe(true);
    expect(shouldAdmitEffectivePlaceablesTwoDaSource(0, null)).toBe(false);
  });

  it("preserves physical ordinals independently of source row labels", () => {
    expect(parseEffectivePlaceablesTwoDaRows(bytes)).toStrictEqual([
      { rowIndex: 0, label: "WaterTrough", strRef: 5747 },
      { rowIndex: 1, label: "Custom Sign With Spaces" },
      { rowIndex: 2 },
    ]);
  });

  it("resolves display text through StrRef, Label, then an explicit row fallback", () => {
    const rows = parseEffectivePlaceablesTwoDaRows(bytes);
    expect(rows).not.toBeNull();
    expect(buildEffectivePlaceablesTwoDaRowOptions(rows!, (strRef) =>
      strRef === 5747 ? "Water Trough" : undefined
    )).toStrictEqual([
      {
        rowIndex: 0,
        displayName: "Water Trough",
        displaySource: "strref",
        strRef: 5747,
        label: "WaterTrough",
      },
      {
        rowIndex: 1,
        displayName: "Custom Sign With Spaces",
        displaySource: "label",
        label: "Custom Sign With Spaces",
      },
      { rowIndex: 2, displayName: "Row 2", displaySource: "row_index" },
    ]);
  });

  it("falls back without trimming, truncating, or admitting NUL/over-budget text", () => {
    const rows = parseEffectivePlaceablesTwoDaRows(bytes)!;
    expect(buildEffectivePlaceablesTwoDaRowOptions(rows, () => "")).toHaveProperty(
      "0.displaySource",
      "label",
    );
    expect(buildEffectivePlaceablesTwoDaRowOptions(rows, () => "bad\0text")).toHaveProperty(
      "0.displaySource",
      "label",
    );
    expect(buildEffectivePlaceablesTwoDaRowOptions(rows, () => "x".repeat(1025))).toHaveProperty(
      "0.displaySource",
      "label",
    );
    expect(buildEffectivePlaceablesTwoDaRowOptions(rows, () => " exact ")).toHaveProperty(
      "0.displayName",
      " exact ",
    );
  });

  it("preserves valid native labels while omitting invalid labels and StrRefs", () => {
    const invalidTokens = Buffer.from([
      "2DA V2.0",
      "",
      "Label StrRef ModelName Static",
      "100 \" exact label \" 4294967296 plc_exact 1",
      `101 \"${"x".repeat(257)}\" -1 plc_long 1`,
      "102 \"nul\0label\" not-a-strref plc_nul 1",
    ].join("\n"), "utf-8");

    expect(parseEffectivePlaceablesTwoDaRows(invalidTokens)).toStrictEqual([
      { rowIndex: 0, label: " exact label " },
      { rowIndex: 1 },
      { rowIndex: 2 },
    ]);
  });

  it("admits exact label and StrRef boundaries without inventing optional properties", () => {
    const maxLabel = "l".repeat(256);
    const boundaryBytes = Buffer.from([
      "2DA V2.0",
      "",
      "Label StrRef ModelName",
      `0 \"${maxLabel}\" 0 plc_zero`,
      "1 One 4294967295 plc_max",
      "2 **** 1x plc_suffix",
      "3 **** x1 plc_prefix",
      "4 **** **** plc_blank",
      "5 **** 1e2 plc_exponent",
      "6 **** 1.0 plc_decimal",
    ].join("\n"), "utf-8");

    const rows = parseEffectivePlaceablesTwoDaRows(boundaryBytes);
    expect(rows).toStrictEqual([
      { rowIndex: 0, label: maxLabel, strRef: 0 },
      { rowIndex: 1, label: "One", strRef: 0xffff_ffff },
      { rowIndex: 2 },
      { rowIndex: 3 },
      { rowIndex: 4 },
      { rowIndex: 5 },
      { rowIndex: 6 },
    ]);
    expect(Object.hasOwn(rows![2]!, "label")).toBe(false);
    expect(Object.hasOwn(rows![2]!, "strRef")).toBe(false);
  });

  it("reads StrRef when it is the first column and Label is absent", () => {
    const strRefFirst = Buffer.from([
      "2DA V2.0",
      "StrRef ModelName",
      "0 5747 plc_water_trough",
    ].join("\n"), "utf-8");

    expect(parseEffectivePlaceablesTwoDaRows(strRefFirst)).toStrictEqual([
      { rowIndex: 0, strRef: 5747 },
    ]);
  });

  it("does not reinterpret malformed unquoted multi-token labels", () => {
    const malformed = Buffer.from([
      "2DA V2.0",
      "Label StrRef ModelName Static",
      "0 Custom Sign With Spaces **** plc_sign 1",
    ].join("\n"), "utf-8");

    expect(parseEffectivePlaceablesTwoDaRows(malformed)).toStrictEqual([
      { rowIndex: 0, label: "Custom" },
    ]);
  });

  it("falls back to the native label when TLK resolution throws", () => {
    expect(buildEffectivePlaceablesTwoDaRowOptions(
      [{ rowIndex: 7, strRef: 5747, label: "WaterTrough" }],
      () => {
        throw new Error("TLK unavailable");
      },
    )).toStrictEqual([{
      rowIndex: 7,
      displayName: "WaterTrough",
      displaySource: "label",
      strRef: 5747,
      label: "WaterTrough",
    }]);
  });

  it("accepts exact localized-name boundaries and rejects non-string resolver output", () => {
    const row = [{ rowIndex: 3, strRef: 7, label: "Fallback" }];
    expect(buildEffectivePlaceablesTwoDaRowOptions(row, () => "x")).toHaveProperty(
      "0.displayName",
      "x",
    );
    expect(buildEffectivePlaceablesTwoDaRowOptions(row, () => "x".repeat(1024))).toHaveProperty(
      "0.displaySource",
      "strref",
    );
    expect(buildEffectivePlaceablesTwoDaRowOptions(
      row,
      (() => 7) as unknown as (strRef: number) => string,
    )).toHaveProperty("0.displaySource", "label");
    expect(buildEffectivePlaceablesTwoDaRowOptions(
      row,
      (() => ["x"]) as unknown as (strRef: number) => string,
    )).toHaveProperty("0.displayName", "Fallback");
    expect(buildEffectivePlaceablesTwoDaRowOptions(row, () => "")).toHaveProperty(
      "0.displayName",
      "Fallback",
    );

    const resolver = jest.fn(() => "must not be used");
    const withoutOptionalValues = buildEffectivePlaceablesTwoDaRowOptions(
      [{ rowIndex: 9 }],
      resolver,
    );
    expect(withoutOptionalValues).toStrictEqual([
      { rowIndex: 9, displayName: "Row 9", displaySource: "row_index" },
    ]);
    expect(Object.hasOwn(withoutOptionalValues[0]!, "strRef")).toBe(false);
    expect(Object.hasOwn(withoutOptionalValues[0]!, "label")).toBe(false);
    expect(resolver).not.toHaveBeenCalled();
  });

  it.each([
    Buffer.from("2da v2.0\nLabel StrRef ModelName\n0 Row **** plc_row", "utf-8"),
    Buffer.from("2DA V2.0\nLabel StrRef modelname\n0 Row **** plc_row", "utf-8"),
    Buffer.from("2DA V2.0\nLabel StrRef ModelName\nnot-a-row Row **** plc_row", "utf-8"),
  ])("rejects a table outside the exact descriptor boundary", (candidate) => {
    expect(parseEffectivePlaceablesTwoDaRows(candidate)).toBeNull();
  });
});
