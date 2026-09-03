import { describe, expect, it } from "vitest";

import {
  readPlaceablePortraitBinding,
  readPlaceablePortraitCatalog,
  readPlaceablePortraitProvenance,
} from "../../../../../src/modules/scene/domain/placeablePortrait";

const catalog = {
  descriptor: {
    resourceName: "portraits.2da" as const,
    sourceObjectKey: "modules/current/portraits.2da",
    sourceLayer: "module" as const,
    sha256: "a".repeat(64),
    sizeBytes: 4096,
    rowCount: 700,
  },
  rows: [
    { rowIndex: 462, baseResRef: "po_hu_m_01_" },
    { rowIndex: 463, baseResRef: "po_hu_m_02_" },
  ],
};

describe("existing Placeable PortraitId domain", () => {
  it("admits an exact sparse portraits.2da catalog and canonical Word binding", () => {
    expect(readPlaceablePortraitCatalog(catalog)).toEqual(catalog);
    expect(readPlaceablePortraitBinding(
      { present: true, nativeType: "word", value: 462 },
      catalog,
    )).toEqual({
      expectedValue: 462,
      tableSha256: "a".repeat(64),
      tableRowCount: 700,
    });
  });

  it("admits the retail physical row count with a sparse selectable row set", () => {
    expect(readPlaceablePortraitCatalog({
      descriptor: { ...catalog.descriptor, rowCount: 16_001 },
      rows: [{ rowIndex: 15_157, baseResRef: "plc_dagflag" }],
    })).toMatchObject({
      descriptor: { rowCount: 16_001 },
      rows: [{ rowIndex: 15_157, baseResRef: "plc_dagflag" }],
    });
  });

  it("fails closed for non-canonical storage, malformed provenance, and non-selectable rows", () => {
    expect(readPlaceablePortraitBinding({ present: false }, catalog)).toBeNull();
    expect(readPlaceablePortraitBinding(
      { present: true, nativeType: "dword", value: 462 },
      catalog,
    )).toBeNull();
    expect(readPlaceablePortraitBinding(
      { present: true, nativeType: "word", value: 464 },
      catalog,
    )).toBeNull();
    expect(readPlaceablePortraitProvenance({
      expectedValue: 462,
      tableSha256: "A".repeat(64),
      tableRowCount: 700,
    })).toBeNull();
    expect(readPlaceablePortraitCatalog({
      ...catalog,
      rows: [catalog.rows[1], catalog.rows[0]],
    })).toBeNull();
  });
});
