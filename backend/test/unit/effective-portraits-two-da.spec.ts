import {
  MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES,
  MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS,
  isEffectivePortraitsTwoDaInputAdmitted,
  isExactEffectivePortraitsTwoDaTable,
  parseEffectivePortraitsTwoDa,
} from "../../src/modules/catalog/domain/effective-portraits-two-da";

describe("effective portraits.2da", () => {
  const source = [
    "2DA V2.0",
    "",
    "BaseResRef Sex Race",
    "0 po_hu_m_01 0 6",
    "1 **** 0 6",
    "2 po_el_f_01 1 1",
    "",
  ].join("\n");

  it("builds one digest-bound descriptor and preserves sparse selectable physical rows", () => {
    expect(parseEffectivePortraitsTwoDa({
      bytes: Buffer.from(source, "ascii"),
      sourceObjectKey: "modules/current/__aurora/sources/hak/ui/portraits.2da",
      sourceLayer: "hak",
    })).toEqual({
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "modules/current/__aurora/sources/hak/ui/portraits.2da",
        sourceLayer: "hak",
        sha256: expect.stringMatching(/^[a-f0-9]{64}$/u),
        sizeBytes: Buffer.byteLength(source, "ascii"),
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, baseResRef: "po_hu_m_01" },
        { rowIndex: 2, baseResRef: "po_el_f_01" },
      ],
    });
  });

  it.each([
    ["wrong version", source.replace("2DA V2.0", "2DA V9.9")],
    ["missing BaseResRef", source.replace("BaseResRef", "Portrait")],
    ["duplicate BaseResRef", source.replace("BaseResRef Sex", "BaseResRef BaseResRef Sex")
      .replace("po_hu_m_01 0 6", "po_hu_m_01 po_hu_m_01 0 6")
      .replace("**** 0 6", "**** **** 0 6")
      .replace("po_el_f_01 1 1", "po_el_f_01 po_el_f_01 1 1")],
    ["invalid BaseResRef", source.replace("po_hu_m_01", "po-hu-m-01")],
    ["overlength BaseResRef", source.replace("po_hu_m_01", "abcdefghijklmnopq")],
    ["empty BaseResRef", source.replace("po_hu_m_01", '""')],
  ])("rejects %s", (_label, value) => {
    expect(parseEffectivePortraitsTwoDa({
      bytes: Buffer.from(value, "utf8"),
      sourceObjectKey: "x/portraits.2da",
      sourceLayer: "module",
    })).toBeNull();
  });

  it("normalizes retail uppercase BaseResRef cells while keeping canonical output lowercase", () => {
    const result = parseEffectivePortraitsTwoDa({
      bytes: Buffer.from(source.replace("po_hu_m_01", "PO_HU_M_01"), "ascii"),
      sourceObjectKey: "x/portraits.2da",
      sourceLayer: "vanilla",
    });

    expect(result?.rows[0]).toEqual({ rowIndex: 0, baseResRef: "po_hu_m_01" });
    expect(isExactEffectivePortraitsTwoDaTable(result)).toBe(true);
  });

  it("enforces input, source-key, source-layer, row, and byte budgets", () => {
    expect(isEffectivePortraitsTwoDaInputAdmitted({
      bytes: Buffer.alloc(1), sourceObjectKey: "x", sourceLayer: "module",
    })).toBe(true);
    expect(isEffectivePortraitsTwoDaInputAdmitted({
      bytes: Buffer.alloc(MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES),
      sourceObjectKey: "x".repeat(2048), sourceLayer: "vanilla",
    })).toBe(true);
    for (const input of [
      { bytes: Buffer.alloc(0), sourceObjectKey: "x", sourceLayer: "module" },
      { bytes: Buffer.alloc(MAX_EFFECTIVE_PORTRAITS_TWO_DA_BYTES + 1), sourceObjectKey: "x", sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "", sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "x".repeat(2049), sourceLayer: "module" },
      { bytes: Buffer.alloc(1), sourceObjectKey: "x", sourceLayer: "override" },
    ]) expect(isEffectivePortraitsTwoDaInputAdmitted(input)).toBe(false);

    const rows = Array.from({ length: MAX_EFFECTIVE_PORTRAITS_TWO_DA_ROWS + 1 },
      (_, index) => `${index} p_${index} 0 0`);
    expect(parseEffectivePortraitsTwoDa({
      bytes: Buffer.from(["2DA V2.0", "", "BaseResRef Sex Race", ...rows].join("\n"), "ascii"),
      sourceObjectKey: "x/portraits.2da", sourceLayer: "module",
    })).toBeNull();
  });

  it("validates the exact sparse table consumed across the Area boundary", () => {
    const table = () => ({
      descriptor: {
        resourceName: "portraits.2da",
        sourceObjectKey: "x",
        sourceLayer: "module",
        sha256: "d".repeat(64),
        sizeBytes: 1,
        rowCount: 3,
      },
      rows: [
        { rowIndex: 0, baseResRef: "po_a" },
        { rowIndex: 2, baseResRef: "po_b" },
      ],
    });
    expect(isExactEffectivePortraitsTwoDaTable(table())).toBe(true);
    for (const mutate of [
      (value: any) => { value.extra = true; },
      (value: any) => { value.descriptor.resourceName = "portrait.2da"; },
      (value: any) => { value.descriptor.sha256 = "D".repeat(64); },
      (value: any) => { value.descriptor.rowCount = 1; },
      (value: any) => { value.rows[1].rowIndex = 0; },
      (value: any) => { value.rows[1].rowIndex = 3; },
      (value: any) => { value.rows[0].baseResRef = "PO_A"; },
      (value: any) => { value.rows[0].extra = true; },
    ]) {
      const value = table();
      mutate(value);
      expect(isExactEffectivePortraitsTwoDaTable(value)).toBe(false);
    }
    expect(isExactEffectivePortraitsTwoDaTable(null)).toBe(false);
    expect(isExactEffectivePortraitsTwoDaTable([])).toBe(false);
  });
});
