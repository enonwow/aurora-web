import { describe, expect, it } from "vitest";

import {
  readPlaceableBodyBagBinding,
  readPlaceableBodyBagCatalog,
  readPlaceableBodyBagProvenance,
} from "../../../../../src/modules/scene/domain/placeableBodyBag";

function catalog() {
  return {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "modules/current/bodybag.2da",
      sourceLayer: "module",
      sha256: "e".repeat(64),
      sizeBytes: 502,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, label: "default", nameStrRef: 6671, displayName: "Default", displaySource: "strref" },
      { rowIndex: 1, label: "Treasure", nameStrRef: 66490, displayName: "Treasure", displaySource: "label" },
    ],
  };
}

describe("Placeable BodyBag domain", () => {
  it("admits one exact bounded catalog and binds the canonical native Byte", () => {
    const admitted = readPlaceableBodyBagCatalog(catalog());
    expect(admitted).toEqual(catalog());
    expect(Object.isFrozen(admitted)).toBe(true);
    expect(readPlaceableBodyBagBinding({ present: true, nativeType: "byte", value: 1 }, admitted))
      .toEqual({ expectedValue: 1, tableSha256: "e".repeat(64), tableRowCount: 2 });
    expect(readPlaceableBodyBagProvenance({
      expectedValue: 0, tableSha256: "e".repeat(64), tableRowCount: 1,
    })).toEqual({ expectedValue: 0, tableSha256: "e".repeat(64), tableRowCount: 1 });
  });

  it("fails closed for malformed, stale, unordered, extra-key, or out-of-table data", () => {
    for (const mutate of [
      (value: any) => { value.extra = true; },
      (value: any) => { value.descriptor.resourceName = "traps.2da"; },
      (value: any) => { value.descriptor.sha256 = "E".repeat(64); },
      (value: any) => { value.descriptor.rowCount = 3; },
      (value: any) => { value.rows[1].rowIndex = 0; },
      (value: any) => { value.rows[0].nameStrRef = -1; },
      (value: any) => { value.rows[0].extra = true; },
      (value: any) => { value.rows[0].displayName = ""; },
    ]) {
      const candidate = structuredClone(catalog());
      mutate(candidate);
      expect(readPlaceableBodyBagCatalog(candidate)).toBeNull();
    }
    const admitted = readPlaceableBodyBagCatalog(catalog());
    expect(readPlaceableBodyBagBinding({ present: false }, admitted)).toBeNull();
    expect(readPlaceableBodyBagBinding({ present: true, nativeType: "word", value: 1 }, admitted)).toBeNull();
    expect(readPlaceableBodyBagBinding({ present: true, nativeType: "byte", value: 2 }, admitted)).toBeNull();
  });
});
