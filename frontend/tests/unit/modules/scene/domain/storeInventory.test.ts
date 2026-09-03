import { describe, expect, it } from "vitest";

import {
  areaStoreInventoryTargetsEqual,
  bindStoreInventoryProvenanceToCatalog,
  cloneStoreInventoryProvenance,
  countChangedStoreInventoryEntries,
  readStoreInventoryProvenance,
  readStoreInventoryTargetBuckets,
  storeInventoryTargetFromProvenance,
} from "../../../../../src/modules/scene/domain/storeInventory";

const SHA = "a".repeat(64);

describe("retained Store inventory", () => {
  it("binds exact dimensions and canonical first-fit coordinates", () => {
    const provenance = inventoryProvenance();

    expect(readStoreInventoryProvenance(provenance)).toEqual(provenance);
    expect(bindStoreInventoryProvenanceToCatalog(provenance, catalog())).toEqual(provenance);
    expect(bindStoreInventoryProvenanceToCatalog(provenance, catalog(2, 1))).toBeNull();
    expect(bindStoreInventoryProvenanceToCatalog({
      ...provenance,
      expectedBuckets: provenance.expectedBuckets.map((bucket, index) => index === 0
        ? {
            ...bucket,
            entries: bucket.entries.map((entry, entryIndex) => entryIndex === 1
              ? { ...entry, x: 7 }
              : entry),
          }
        : bucket),
    }, catalog())).toBeNull();
  });

  it("allows only reorder, removal, and Infinite changes inside the source bucket", () => {
    const provenance = inventoryProvenance();
    const target = storeInventoryTargetFromProvenance(provenance);
    const changed = target.map((bucket, index) => index === 0
      ? {
          ...bucket,
          entries: [
            { ...bucket.entries[1]!, infinite: true },
            { ...bucket.entries[0]!, infinite: false },
          ],
        }
      : bucket);

    const parsed = readStoreInventoryTargetBuckets(changed, provenance.expectedBuckets);
    expect(parsed).toEqual(changed);
    expect(areaStoreInventoryTargetsEqual(target, parsed!)).toBe(false);
    expect(countChangedStoreInventoryEntries(target, parsed!)).toBe(2);
    expect(readStoreInventoryTargetBuckets(changed.map((bucket, index) => index === 0
      ? { ...bucket, entries: [...bucket.entries, bucket.entries[0]!] }
      : bucket), provenance.expectedBuckets)).toBeNull();
    expect(readStoreInventoryTargetBuckets(changed.map((bucket, index) => index === 0
      ? {
          ...bucket,
          entries: bucket.entries.map((entry, entryIndex) => entryIndex === 0
            ? { ...entry, resRef: "different" }
            : entry),
        }
      : bucket), provenance.expectedBuckets)).toBeNull();
  });

  it("deep-clones provenance and accepts the native page boundary", () => {
    const entries = Array.from({ length: 51 }, (_, sourceIndex) => ({
      sourceIndex,
      resRef: `itm_${sourceIndex}`,
      baseItemId: 0,
      slotWidth: 2,
      slotHeight: 1,
      x: (sourceIndex % 5) * 2,
      y: Math.floor((sourceIndex % 50) / 5) + Math.floor(sourceIndex / 50) * 10,
      infinite: false,
    }));
    const provenance = inventoryProvenance(entries);
    const parsed = bindStoreInventoryProvenanceToCatalog(provenance, catalog(2, 1));
    const cloned = cloneStoreInventoryProvenance(parsed!);

    expect(cloned.expectedBuckets[0]?.entries[50]).toMatchObject({ x: 0, y: 10 });
    expect(cloned).not.toBe(parsed);
    expect(cloned.expectedBuckets).not.toBe(parsed?.expectedBuckets);
  });
});

function inventoryProvenance(entries = [
  {
    sourceIndex: 0,
    resRef: "itm_a",
    baseItemId: 0,
    slotWidth: 1,
    slotHeight: 1,
    x: 0,
    y: 0,
    infinite: true,
  },
  {
    sourceIndex: 1,
    resRef: "itm_b",
    baseItemId: 0,
    slotWidth: 1,
    slotHeight: 1,
    x: 1,
    y: 0,
    infinite: false,
  },
]) {
  return {
    expectedBuckets: [
      { bucketTypeId: 0 as const, entries },
      { bucketTypeId: 4 as const, entries: [] },
      { bucketTypeId: 2 as const, entries: [] },
      { bucketTypeId: 3 as const, entries: [] },
      { bucketTypeId: 1 as const, entries: [] },
    ],
    tableSha256: SHA,
    tableRowCount: 1,
  };
}

function catalog(invSlotWidth = 1, invSlotHeight = 1) {
  return {
    descriptor: {
      resourceName: "baseitems.2da" as const,
      sourceObjectKey: "module/baseitems.2da",
      sourceLayer: "module" as const,
      sha256: SHA,
      sizeBytes: 128,
      rowCount: 1,
    },
    rows: [{
      rowIndex: 0,
      modelType: 0 as const,
      displayName: "Base item 0",
      invSlotWidth,
      invSlotHeight,
    }],
  };
}
