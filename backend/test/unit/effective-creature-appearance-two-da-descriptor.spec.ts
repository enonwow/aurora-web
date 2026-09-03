import { createHash } from "node:crypto";

import { parseAuroraTwoDaTable } from "../../src/common/aurora/two-da/aurora-two-da-table";
import {
  buildEffectiveCreatureAppearanceTwoDaDescriptor,
  isSupportedEffectiveCreatureAppearanceTwoDaInput,
  isSupportedEffectiveCreatureAppearanceTwoDaTable,
  MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES,
  MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS,
} from "../../src/modules/catalog/domain/effective-creature-appearance-two-da-descriptor";

describe("effective creature appearance.2da descriptor", () => {
  const sourceObjectKey = "modules/current/__aurora/sources/hak/lc_2da/appearance.2da";
  const bytes = Buffer.from([
    "2DA V2.0",
    "",
    "LABEL STRING_REF MODELTYPE RACE",
    "52 AirElemental 1234 F E",
    "249 DwarfMale **** P D",
  ].join("\n"), "utf-8");

  it("describes the complete selected table bytes and physical rows", () => {
    expect(buildEffectiveCreatureAppearanceTwoDaDescriptor({
      bytes,
      sourceObjectKey,
      sourceLayer: "hak",
    })).toEqual({
      resourceName: "appearance.2da",
      sourceObjectKey,
      sourceLayer: "hak",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      sizeBytes: bytes.length,
      rowCount: 2,
    });
    expect(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES).toBe(64 * 1024 * 1024);
    expect(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS).toBe(1_000_000);
  });

  it.each(["module", "hak", "vanilla"] as const)(
    "admits the exact authoritative %s source layer",
    (sourceLayer) => {
      expect(buildEffectiveCreatureAppearanceTwoDaDescriptor({
        bytes,
        sourceObjectKey,
        sourceLayer,
      })?.sourceLayer).toBe(sourceLayer);
    },
  );

  it("accepts exact input and parsed-row boundaries", () => {
    expect(isSupportedEffectiveCreatureAppearanceTwoDaInput({
      bytes: Buffer.alloc(1),
      sourceObjectKey: "x",
      sourceLayer: "module",
    })).toBe(true);
    expect(isSupportedEffectiveCreatureAppearanceTwoDaInput({
      bytes: Buffer.alloc(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES),
      sourceObjectKey: "x".repeat(2048),
      sourceLayer: "vanilla",
    })).toBe(true);

    const table = parseAuroraTwoDaTable(bytes, { tableName: "appearance.2da" });
    expect(isSupportedEffectiveCreatureAppearanceTwoDaTable({ ...table, rows: table.rows.slice(0, 1) }))
      .toBe(true);
    expect(isSupportedEffectiveCreatureAppearanceTwoDaTable({
      ...table,
      rows: new Array(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS),
    })).toBe(true);
    expect(isSupportedEffectiveCreatureAppearanceTwoDaTable({ ...table, rows: [] })).toBe(false);
    expect(isSupportedEffectiveCreatureAppearanceTwoDaTable({
      ...table,
      rows: new Array(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS + 1),
    })).toBe(false);
  });

  it.each([
    { bytes: Buffer.alloc(0), sourceObjectKey, sourceLayer: "hak" },
    { bytes: Buffer.alloc(MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES + 1), sourceObjectKey, sourceLayer: "hak" },
    { bytes, sourceObjectKey: "", sourceLayer: "hak" },
    { bytes, sourceObjectKey: "x".repeat(2049), sourceLayer: "hak" },
    { bytes, sourceObjectKey, sourceLayer: "external_fixture" },
    { bytes: "not-a-buffer" as never, sourceObjectKey, sourceLayer: "hak" },
  ])("rejects malformed or unbounded descriptor input %#", (input) => {
    expect(isSupportedEffectiveCreatureAppearanceTwoDaInput(input)).toBe(false);
    expect(buildEffectiveCreatureAppearanceTwoDaDescriptor(input)).toBeNull();
  });

  it.each([
    Buffer.from("2da v2.0\nLABEL STRING_REF MODELTYPE\n0 Row **** P", "utf-8"),
    Buffer.from("2DA V2.0\nLABEL STRING_REF modeltype\n0 Row **** P", "utf-8"),
    Buffer.from("2DA V2.0\nLABEL STRING_REF MODELTYPE\nnot-a-row Row **** P", "utf-8"),
  ])("rejects malformed table content %#", (candidate) => {
    expect(buildEffectiveCreatureAppearanceTwoDaDescriptor({
      bytes: candidate,
      sourceObjectKey,
      sourceLayer: "hak",
    })).toBeNull();
  });
});
