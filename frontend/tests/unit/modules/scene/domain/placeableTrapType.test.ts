import { describe, expect, it } from "vitest";

import {
  readPlaceableTrapTypeBinding,
  readPlaceableTrapTypeCatalog,
  readPlaceableTrapTypeProvenance,
} from "../../../../../src/modules/scene/domain/placeableTrapType";

function catalog() {
  return {
    descriptor: {
      resourceName: "traps.2da",
      sourceObjectKey: "modules/current/traps.2da",
      sourceLayer: "module",
      sha256: "d".repeat(64),
      sizeBytes: 2048,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, setDc: 10, detectDcMod: 0, disarmDcMod: 3, displayName: "Minor", displaySource: "label" },
      { rowIndex: 1, setDc: 20, detectDcMod: 2, disarmDcMod: 6, displayName: "Deadly", displaySource: "strref" },
    ],
  };
}

describe("Placeable TrapType domain", () => {
  it("admits an exact bounded table and binds one canonical native byte", () => {
    const admitted = readPlaceableTrapTypeCatalog(catalog());
    expect(admitted).toEqual(catalog());
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(readPlaceableTrapTypeBinding({ present: true, nativeType: "byte", value: 1 }, admitted))
      .toEqual({ expectedValue: 1, tableSha256: "d".repeat(64), tableRowCount: 2 });
    expect(readPlaceableTrapTypeProvenance({
      expectedValue: 0,
      tableSha256: "d".repeat(64),
      tableRowCount: 1,
    })).toEqual({ expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 1 });
  });

  it("fails closed for absent, malformed, duplicate, unordered, or out-of-table data", () => {
    for (const mutate of [
      (value: any) => { value.extra = true; },
      (value: any) => { value.descriptor.sha256 = "D".repeat(64); },
      (value: any) => { value.descriptor.rowCount = 3; },
      (value: any) => { value.rows[1].rowIndex = 0; },
      (value: any) => { value.rows[0].setDc = 256; },
      (value: any) => { value.rows[0].extra = true; },
    ]) {
      const value = structuredClone(catalog());
      mutate(value);
      expect(readPlaceableTrapTypeCatalog(value)).toBeNull();
    }
    const admitted = readPlaceableTrapTypeCatalog(catalog());
    expect(readPlaceableTrapTypeBinding({ present: false }, admitted)).toBeNull();
    expect(readPlaceableTrapTypeBinding({ present: true, nativeType: "dword", value: 1 }, admitted)).toBeNull();
    expect(readPlaceableTrapTypeBinding({ present: true, nativeType: "byte", value: 2 }, admitted)).toBeNull();
  });

  it("enforces every exact catalog boundary and preserves every admitted display source", () => {
    const valid = catalog();
    valid.rows[0] = {
      ...valid.rows[0],
      label: "L",
      trapNameStrRef: 0,
      displayName: "M",
      displaySource: "label"
    } as never;
    valid.rows[1] = {
      ...valid.rows[1],
      label: "x".repeat(256),
      trapNameStrRef: 0xffff_ffff,
      displayName: "x".repeat(1024),
      displaySource: "row_index"
    } as never;
    for (const sourceLayer of ["module", "hak", "vanilla"] as const) {
      const candidate = structuredClone(valid);
      candidate.descriptor.sourceLayer = sourceLayer;
      expect(readPlaceableTrapTypeCatalog(candidate)?.descriptor.sourceLayer).toBe(sourceLayer);
    }
    const admitted = readPlaceableTrapTypeCatalog(valid)!;
    expect(admitted.rows[0]).toMatchObject({ label: "L", trapNameStrRef: 0, displayName: "M" });
    expect(admitted.rows[1]).toMatchObject({
      label: "x".repeat(256),
      trapNameStrRef: 0xffff_ffff,
      displayName: "x".repeat(1024),
    });
    for (const sourceObjectKey of ["x", "x".repeat(2048)]) {
      const candidate = structuredClone(valid);
      candidate.descriptor.sourceObjectKey = sourceObjectKey;
      expect(readPlaceableTrapTypeCatalog(candidate)?.descriptor.sourceObjectKey).toBe(sourceObjectKey);
    }
    const withoutOptionals = readPlaceableTrapTypeCatalog(catalog())!;
    expect(withoutOptionals.rows[0]).not.toHaveProperty("label");
    expect(withoutOptionals.rows[0]).not.toHaveProperty("trapNameStrRef");

    const invalidMutations: Array<(value: any) => void> = [
      (value) => { delete value.rows; },
      (value) => { value.wrong = value.rows; delete value.rows; },
      (value) => { value.descriptor.extra = true; },
      (value) => { value.descriptor.wrong = value.descriptor.rowCount; delete value.descriptor.rowCount; },
      (value) => { delete value.descriptor.resourceName; },
      (value) => { value.descriptor.resourceName = "placeables.2da"; },
      (value) => { value.descriptor.sourceObjectKey = 7; },
      (value) => { value.descriptor.sourceObjectKey = ""; },
      (value) => { value.descriptor.sourceObjectKey = "x".repeat(2049); },
      (value) => { value.descriptor.sourceLayer = "override"; },
      (value) => { value.descriptor.sha256 = 7; },
      (value) => { value.descriptor.sha256 = BigInt("1".repeat(64)); },
      (value) => { value.descriptor.sizeBytes = 0; },
      (value) => { value.descriptor.sizeBytes = 16 * 1024 * 1024 + 1; },
      (value) => { value.descriptor.rowCount = 0; },
      (value) => { value.descriptor.rowCount = 257; },
      (value) => { value.rows = {}; },
      (value) => { value.rows[0] = null; },
      (value) => { delete value.rows[0].setDc; },
      (value) => { value.rows[0].setDc = -1; },
      (value) => { value.rows[0].detectDcMod = 256; },
      (value) => { value.rows[0].disarmDcMod = 1.5; },
      (value) => { value.rows[0].label = 7; },
      (value) => { value.rows[0].label = ""; },
      (value) => { value.rows[0].label = "x".repeat(257); },
      (value) => { value.rows[0].label = "a\0b"; },
      (value) => { value.rows[0].trapNameStrRef = -1; },
      (value) => { value.rows[0].trapNameStrRef = 0x1_0000_0000; },
      (value) => { value.rows[0].displayName = 7; },
      (value) => { value.rows[0].displayName = ""; },
      (value) => { value.rows[0].displayName = "x".repeat(1025); },
      (value) => { value.rows[0].displayName = "a\0b"; },
      (value) => { value.rows[0].displaySource = "tlk"; },
    ];
    for (const mutate of invalidMutations) {
      const value = structuredClone(valid);
      mutate(value);
      expect(readPlaceableTrapTypeCatalog(value)).toBeNull();
    }
    expect(readPlaceableTrapTypeCatalog(null)).toBeNull();
    expect(readPlaceableTrapTypeCatalog([])).toBeNull();
    expect(readPlaceableTrapTypeCatalog(Object.create({ descriptor: valid.descriptor, rows: valid.rows }))).toBeNull();
  });

  it("fails closed for every malformed provenance and storage boundary", () => {
    const invalidProvenance = [
      null,
      [],
      {},
      { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 1, extra: true },
      { expectedValue: -1, tableSha256: "d".repeat(64), tableRowCount: 1 },
      { expectedValue: 256, tableSha256: "d".repeat(64), tableRowCount: 256 },
      { expectedValue: 0.5, tableSha256: "d".repeat(64), tableRowCount: 1 },
      { expectedValue: 0, tableSha256: 7, tableRowCount: 1 },
      { expectedValue: 0, tableSha256: BigInt("1".repeat(64)), tableRowCount: 1 },
      { expectedValue: 0, tableSha256: "D".repeat(64), tableRowCount: 1 },
      { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 0 },
      { expectedValue: 0, tableSha256: "d".repeat(64), tableRowCount: 257 },
      { expectedValue: 1, tableSha256: "d".repeat(64), tableRowCount: 1 },
      Object.assign(Object.create({}), {
        expectedValue: 0,
        tableSha256: "d".repeat(64),
        tableRowCount: 1,
      }),
    ];
    for (const value of invalidProvenance) {
      expect(readPlaceableTrapTypeProvenance(value)).toBeNull();
    }

    const admitted = readPlaceableTrapTypeCatalog(catalog())!;
    for (const storage of [
      null,
      [],
      { present: true, nativeType: "byte", value: 0, extra: true },
      { present: false, nativeType: "byte", value: 0 },
      { present: true, nativeType: "word", value: 0 },
      { present: true, nativeType: "byte", value: -1 },
      { present: true, nativeType: "byte", value: 0.5 },
      { present: true, nativeType: "byte", value: 2 },
    ]) {
      expect(readPlaceableTrapTypeBinding(storage, admitted)).toBeNull();
    }
    expect(readPlaceableTrapTypeBinding(
      { present: true, nativeType: "byte", value: 1 },
      { ...admitted, rows: [admitted.rows[0]!, { ...admitted.rows[1]!, rowIndex: 0 }] },
    )).toBeNull();
  });
});
