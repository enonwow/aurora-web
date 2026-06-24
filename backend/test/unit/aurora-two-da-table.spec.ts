import {
  parseAuroraTwoDaTable
} from "../../src/common/aurora/two-da/aurora-two-da-table";
import {
  parsePlaceablesTwoDaRows
} from "../../src/modules/catalog/adapters/outbound/blob/module-snapshot-template-catalog.repository";

function diagnosticCodes(source: ReturnType<typeof parseAuroraTwoDaTable>): string[] {
  return source.diagnostics.map((entry) => entry.code);
}

describe("aurora-two-da-table", () => {
  it("preserves a valid 2DA V2.0 table with defaults, row labels, line numbers, and source metadata", () => {
    const table = parseAuroraTwoDaTable(
      [
        "2DA V2.0",
        "# comment-only physical line",
        "",
        'DEFAULT: "quoted default" ****',
        "Label UnknownColumn",
        '0 "Friendly Fire" token'
      ].join("\n"),
      {
        tableName: "arbitrary.2da",
        profile: "vfx-p2",
        sourceObjectKey: "__aurora/sources/hak/lc_vfx/arbitrary.2da",
        sourceLayer: "hak",
        sourceHash: "sha256:table"
      }
    );

    expect(table.version).toBe("2DA V2.0");
    expect(table.defaultTokens).toEqual(["DEFAULT:", '"quoted default"', "****"]);
    expect(table.header).toEqual(["Label", "UnknownColumn"]);
    expect(table.source).toEqual({
      objectKey: "__aurora/sources/hak/lc_vfx/arbitrary.2da",
      layer: "hak",
      hash: "sha256:table"
    });
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0]).toMatchObject({
      rowId: 0,
      rowIdRaw: "0",
      label: "0",
      physicalLineNumber: 6,
      source: table.source
    });
    expect(table.rows[0].cellsByColumn.Label).toMatchObject({
      raw: '"Friendly Fire"',
      value: "Friendly Fire",
      quoted: true,
      blank: false,
      missing: false
    });
    expect(table.rows[0].cellsByColumn.UnknownColumn.value).toBe("token");
    expect(table.diagnostics).toEqual([]);
  });

  it("diagnoses empty, malformed, and headerless sources", () => {
    expect(
      diagnosticCodes(parseAuroraTwoDaTable("", { tableName: "empty.2da" }))
    ).toContain("VFX_2DA_EMPTY_SOURCE");

    expect(
      diagnosticCodes(
        parseAuroraTwoDaTable("Label ModelName\n0 Foo mdl", { tableName: "bad.2da" })
      )
    ).toContain("VFX_2DA_LOCAL_HEADER_MAGIC_REQUIRED");

    expect(
      diagnosticCodes(parseAuroraTwoDaTable("2DA V2.0", { tableName: "headerless.2da" }))
    ).toContain("VFX_2DA_HEADER_REQUIRED");
  });

  it("preserves quoted cells while stripping comments outside quotes", () => {
    const table = parseAuroraTwoDaTable(
      [
        "2DA V2.0",
        "Label ModelName",
        '0 "Value // not comment" mdl_fire # trailing comment',
        "1 Plain mdl_ice // trailing comment"
      ].join("\n"),
      { tableName: "comments.2da" }
    );

    expect(table.rows[0].cellsByColumn.Label).toMatchObject({
      raw: '"Value // not comment"',
      value: "Value // not comment",
      quoted: true
    });
    expect(table.rows[0].cellsByColumn.ModelName.value).toBe("mdl_fire");
    expect(table.rows[1].cellsByColumn.ModelName.value).toBe("mdl_ice");
    expect(table.rows.flatMap((row) => row.extraCells)).toEqual([]);
  });

  it("preserves ****, quoted blanks/stars, missing trailing cells, and extra cells", () => {
    const table = parseAuroraTwoDaTable(
      [
        "2DA V2.0",
        "Label ModelName Other",
        '0 **** "" "****" extra-token',
        "1 SparseOnly"
      ].join("\n"),
      { tableName: "sparse.2da" }
    );

    expect(table.rows[0].cellsByColumn.Label).toMatchObject({
      raw: "****",
      value: "****",
      quoted: false,
      blank: true,
      missing: false
    });
    expect(table.rows[0].cellsByColumn.ModelName).toMatchObject({
      raw: '""',
      value: "",
      quoted: true,
      blank: true,
      missing: false
    });
    expect(table.rows[0].cellsByColumn.Other).toMatchObject({
      raw: '"****"',
      value: "****",
      quoted: true,
      blank: true,
      missing: false
    });
    expect(table.rows[0].extraCells).toEqual(["extra-token"]);
    expect(table.rows[1].missingColumns).toEqual(["ModelName", "Other"]);
    expect(table.rows[1].cellsByColumn.ModelName).toMatchObject({
      raw: "****",
      value: "****",
      blank: true,
      missing: true
    });
    expect(diagnosticCodes(table)).toEqual(
      expect.arrayContaining([
        "VFX_2DA_ROW_EXTRA_CELLS_PRESERVED",
        "VFX_2DA_ROW_MISSING_CELLS_PRESERVED"
      ])
    );
  });

  it("keeps physical line numbers across blank rows and diagnoses invalid row ids", () => {
    const table = parseAuroraTwoDaTable(
      [
        "2DA V2.0",
        "Label ModelName",
        "",
        "not-a-row Foo Bar",
        "12abc Partial mdl",
        "-1 Negative mdl",
        "2 Good mdl_good"
      ].join("\n"),
      { tableName: "line-numbers.2da" }
    );

    expect(table.rows.map((row) => row.rowId)).toEqual([2]);
    expect(table.rows[0].physicalLineNumber).toBe(7);
    expect(
      diagnosticCodes(table).filter((code) => code === "VFX_2DA_ROW_ID_REQUIRED")
    ).toHaveLength(3);
  });

  it("is table-agnostic and does not require VFX-specific columns", () => {
    const table = parseAuroraTwoDaTable(
      ["2DA V2.0", "Phase ProgFX CustomColumn", "0 alpha 123 preserved"].join("\n"),
      { tableName: "not-visualeffects.2da", profile: "generic" }
    );

    expect(table.header).toEqual(["Phase", "ProgFX", "CustomColumn"]);
    expect(table.rows[0].cellsByColumn.CustomColumn.value).toBe("preserved");
    expect(table.diagnostics).toEqual([]);
  });

  it("keeps the catalog placeables helper out of the source-preserving VFX parser contract", () => {
    const source = [
      "2DA V2.0",
      "Label ModelName Extra",
      '0 "Display Name" plc_table extra',
      '1 "Missing Model" **** still',
      "2 SparseOnly"
    ].join("\n");

    const table = parseAuroraTwoDaTable(source, {
      tableName: "placeables.2da",
      sourceLayer: "external_fixture",
      sourceHash: "sha256:fixture"
    });
    const placeableRows = parsePlaceablesTwoDaRows(Buffer.from(source, "utf-8"));

    expect(table.rows).toHaveLength(3);
    expect(table.rows[0].cellsByColumn.Label).toMatchObject({
      raw: '"Display Name"',
      value: "Display Name",
      quoted: true
    });
    expect(table.rows[1].cellsByColumn.ModelName).toMatchObject({
      raw: "****",
      blank: true
    });
    expect(table.rows[2].missingColumns).toEqual(["ModelName", "Extra"]);
    expect(table.source).toEqual({
      layer: "external_fixture",
      hash: "sha256:fixture"
    });

    expect(placeableRows).toEqual([
      {
        rowId: 0,
        label: "Display Name",
        modelResRef: "plc_table"
      }
    ]);
    expect(placeableRows[0]).not.toHaveProperty("cellsByColumn");
    expect(placeableRows[0]).not.toHaveProperty("source");
  });

  it("reads fixed-width placeables.2da ModelName when an unquoted label contains spaces", () => {
    const source = [
      "2DA V2.0",
      "",
      "      Label                                                                  StrRef   ModelName           LightColor LightOffsetX",
      "26096      SVALE - kull                                               ****   plc_core_0096    ****       ****",
      "26133      LVALE - adder                                              ****   plc_core_0133    ****       ****",
      "26685      *VALE - ***                                                ****   plc_core_0685    ****       ****"
    ].join("\n");

    const placeableRows = parsePlaceablesTwoDaRows(Buffer.from(source, "utf-8"));

    expect(placeableRows).toEqual([
      {
        rowId: 26096,
        label: "SVALE - kull",
        modelResRef: "plc_core_0096"
      },
      {
        rowId: 26133,
        label: "LVALE - adder",
        modelResRef: "plc_core_0133"
      },
      {
        rowId: 26685,
        label: "*VALE - ***",
        modelResRef: "plc_core_0685"
      }
    ]);
  });
});
