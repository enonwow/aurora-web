import { createHash } from "node:crypto";

import {
  buildEffectivePlaceablesTwoDaDescriptor,
  isSupportedEffectivePlaceablesTwoDaTable,
  isSupportedEffectivePlaceablesTwoDaInput,
  MAX_EFFECTIVE_PLACEABLES_TWO_DA_BYTES,
  MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS,
} from "../../src/modules/catalog/domain/effective-placeables-two-da-descriptor";
import { parseAuroraTwoDaTable } from "../../src/common/aurora/two-da/aurora-two-da-table";

describe("effective placeables.2da descriptor", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/hak/lc_2da/placeables.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "Label ModelName Static",
    "900 Reserved **** 0",
    "901 Chair plc_chair01 1",
  ].join("\n"), "utf-8");

  it("describes the complete selected table bytes and physical rows", () => {
    expect(buildEffectivePlaceablesTwoDaDescriptor({
      bytes,
      sourceObjectKey,
      sourceLayer: "hak",
    })).toEqual({
      resourceName: "placeables.2da",
      sourceObjectKey,
      sourceLayer: "hak",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      rowCount: 2,
    });
    expect(MAX_EFFECTIVE_PLACEABLES_TWO_DA_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS).toBe(1_000_000);
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "admits the exact authoritative %s source layer",
    (sourceLayer) => {
      expect(buildEffectivePlaceablesTwoDaDescriptor({
        bytes,
        sourceObjectKey,
        sourceLayer,
      })?.sourceLayer).toBe(sourceLayer);
    },
  );

  it("admits the exact input boundaries before parsing", () => {
    expect(isSupportedEffectivePlaceablesTwoDaInput({
      bytes: Buffer.alloc(1),
      sourceObjectKey: "x",
      sourceLayer: "module",
    })).toBe(true);
    expect(isSupportedEffectivePlaceablesTwoDaInput({
      bytes: Buffer.alloc(MAX_EFFECTIVE_PLACEABLES_TWO_DA_BYTES),
      sourceObjectKey: "x".repeat(2048),
      sourceLayer: "vanilla",
    })).toBe(true);
  });

  it("rejects a parsed table above the physical-row budget without materializing rows", () => {
    const table = parseAuroraTwoDaTable(bytes, { tableName: "placeables.2da" });
    expect(isSupportedEffectivePlaceablesTwoDaTable({
      ...table,
      rows: new Array(MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS + 1),
    })).toBe(false);
  });

  it("admits exact physical-row count boundaries and rejects an empty table", () => {
    const table = parseAuroraTwoDaTable(bytes, { tableName: "placeables.2da" });
    expect(isSupportedEffectivePlaceablesTwoDaTable({ ...table, rows: table.rows.slice(0, 1) }))
      .toBe(true);
    expect(isSupportedEffectivePlaceablesTwoDaTable({
      ...table,
      rows: new Array(MAX_EFFECTIVE_PLACEABLES_TWO_DA_ROWS),
    })).toBe(true);
    expect(isSupportedEffectivePlaceablesTwoDaTable({ ...table, rows: [] })).toBe(false);
  });

  it("rejects when only one of several parser diagnostics is fatal", () => {
    const table = parseAuroraTwoDaTable(bytes, { tableName: "placeables.2da" });
    expect(isSupportedEffectivePlaceablesTwoDaTable({
      ...table,
      diagnostics: [
        { code: "IGNORED_INFO", severity: "info", message: "info" },
        { code: "VFX_2DA_ROW_ID_REQUIRED", severity: "warn", message: "fatal" },
      ],
    })).toBe(false);
  });

  it("admits non-fatal diagnostics and rejects a generic parser error", () => {
    const table = parseAuroraTwoDaTable(bytes, { tableName: "placeables.2da" });
    expect(isSupportedEffectivePlaceablesTwoDaTable({
      ...table,
      diagnostics: [{ code: "IGNORED_INFO", severity: "info", message: "info" }],
    })).toBe(true);
    expect(isSupportedEffectivePlaceablesTwoDaTable({
      ...table,
      diagnostics: [{ code: "GENERIC_ERROR", severity: "error", message: "error" }],
    })).toBe(false);
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "hak" },
    { bytes: Buffer.alloc(MAX_EFFECTIVE_PLACEABLES_TWO_DA_BYTES + 1), sourceObjectKey, sourceLayer: "hak" },
    { bytes, sourceObjectKey: "", sourceLayer: "hak" },
    { bytes, sourceObjectKey: 7 as never, sourceLayer: "hak" },
    { bytes, sourceObjectKey: { length: 1 } as never, sourceLayer: "hak" },
    { bytes, sourceObjectKey: "x".repeat(2049), sourceLayer: "hak" },
    { bytes, sourceObjectKey, sourceLayer: "external_fixture" },
    { bytes: "not-a-buffer" as never, sourceObjectKey, sourceLayer: "hak" },
  ])("rejects malformed or unbounded descriptor input %#", (input) => {
    expect(isSupportedEffectivePlaceablesTwoDaInput(input)).toBe(false);
    expect(buildEffectivePlaceablesTwoDaDescriptor(input)).toBeNull();
  });

  it.each([
    { bytes: Buffer.from("2da v2.0\nLabel ModelName\n0 Row plc_row", "utf-8"), sourceObjectKey, sourceLayer: "hak" },
    { bytes: Buffer.from("2DA V2.0\nLabel modelname\n0 Row plc_row", "utf-8"), sourceObjectKey, sourceLayer: "hak" },
    { bytes: Buffer.from("2DA V2.0\nLabel ModelName\nnot-a-row Row plc_row", "utf-8"), sourceObjectKey, sourceLayer: "hak" },
  ])("rejects malformed table content %#", (input) => {
    expect(isSupportedEffectivePlaceablesTwoDaInput(input)).toBe(true);
    expect(buildEffectivePlaceablesTwoDaDescriptor(input)).toBeNull();
  });
});
