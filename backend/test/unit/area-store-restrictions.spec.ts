import {
  AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
  MAX_AREA_STORE_RESTRICTION_ENTRIES,
  areaStoreRestrictionTargetsEqual,
  bindEffectiveBaseItemsTwoDaToStoreRestrictions,
  cloneAreaStoreRestrictionsProvenance,
  materializeAreaStoreRestrictionTargetStorage,
  readAreaStoreRestrictionsRawStorage,
  readExistingAreaStoreRestrictionsMutation,
} from "../../src/modules/areas/domain/area-store-restrictions";

const table = {
  descriptor: {
    resourceName: "baseitems.2da" as const,
    sourceObjectKey: "modules/current/baseitems.2da",
    sourceLayer: "module" as const,
    sha256: "a".repeat(64),
    sizeBytes: 321,
    rowCount: 4,
  },
  rows: [
    { rowIndex: 0, modelType: 0 as const, displayName: "Short sword" },
    { rowIndex: 1, modelType: 1 as const, displayName: "Potion" },
    { rowIndex: 2, modelType: 2 as const, displayName: "Double axe" },
    { rowIndex: 3, modelType: 3 as const, displayName: "Armor" },
  ],
};

const raw = {
  willNotBuy: {
    present: true as const,
    nativeType: "list" as const,
    entryStructTypeId: 0x0001_7e4d as const,
    baseItemNativeType: "int" as const,
    baseItemIds: [2, 1, 2],
    opaqueSiblingFieldCounts: [0, 0, 0],
  },
  willOnlyBuy: { present: false as const },
};

describe("existing Area Store restrictions", () => {
  it("freezes the exact native entry profile and combined budget", () => {
    expect(AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID).toBe(0x0001_7e4d);
    expect(MAX_AREA_STORE_RESTRICTION_ENTRIES).toBe(4_096);
  });

  it("binds exact ordered duplicate-preserving storage to effective baseitems.2da", () => {
    const admitted = readAreaStoreRestrictionsRawStorage(raw);
    expect(admitted).not.toBeNull();
    const provenance = bindEffectiveBaseItemsTwoDaToStoreRestrictions(admitted!, table);
    expect(provenance).toEqual({
      expectedValue: {
        willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      tableSha256: "a".repeat(64),
      tableRowCount: 4,
    });
    expect(Object.isFrozen(provenance)).toBe(true);
    expect(Object.isFrozen(provenance?.expectedValue.willNotBuy.baseItemIds)).toBe(true);

    const clone = cloneAreaStoreRestrictionsProvenance(provenance!);
    expect(clone).toEqual(provenance);
    expect(clone).not.toBe(provenance);
    expect(clone.expectedValue).not.toBe(provenance?.expectedValue);
  });

  it("rejects malformed native storage and unavailable catalog rows", () => {
    const invalid = [
      { ...raw, willNotBuy: { ...raw.willNotBuy, entryStructTypeId: 0 } },
      { ...raw, willNotBuy: { ...raw.willNotBuy, baseItemNativeType: "dword" } },
      { ...raw, willNotBuy: { ...raw.willNotBuy, baseItemIds: [-1] } },
      { ...raw, willNotBuy: { ...raw.willNotBuy, baseItemIds: [0x8000_0000] } },
      { ...raw, willNotBuy: { ...raw.willNotBuy, opaqueSiblingFieldCounts: [0, 1, 0] } },
      { ...raw, extra: true },
      { willNotBuy: { present: false, baseItemIds: [] }, willOnlyBuy: { present: false } },
    ];
    for (const candidate of invalid) {
      expect(readAreaStoreRestrictionsRawStorage(candidate)).toBeNull();
    }

    const outOfCatalog = readAreaStoreRestrictionsRawStorage({
      ...raw,
      willNotBuy: { ...raw.willNotBuy, baseItemIds: [4], opaqueSiblingFieldCounts: [0] },
    });
    expect(outOfCatalog).not.toBeNull();
    expect(bindEffectiveBaseItemsTwoDaToStoreRestrictions(outOfCatalog!, table)).toBeNull();
  });

  it("admits one complete changed catalog-bound CAS and rejects loose/no-op targets", () => {
    const provenance = bindEffectiveBaseItemsTwoDaToStoreRestrictions(
      readAreaStoreRestrictionsRawStorage(raw)!,
      table,
    )!;
    const valid = {
      ...provenance,
      value: { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 3] },
    };
    const mutation = readExistingAreaStoreRestrictionsMutation(valid);
    expect(mutation).toEqual(valid);
    expect(Object.isFrozen(mutation)).toBe(true);
    expect(Object.isFrozen(mutation?.value.willOnlyBuy)).toBe(true);
    expect(areaStoreRestrictionTargetsEqual(
      mutation!.value,
      { willNotBuy: [1, 2, 1], willOnlyBuy: [0, 3] },
    )).toBe(true);
    expect(areaStoreRestrictionTargetsEqual(
      mutation!.value,
      { willNotBuy: [1, 1, 2], willOnlyBuy: [0, 3] },
    )).toBe(false);

    for (const candidate of [
      { ...valid, extra: true },
      { ...valid, tableSha256: "A".repeat(64) },
      { ...valid, tableRowCount: 0 },
      { ...valid, value: { willNotBuy: [2, 1, 2], willOnlyBuy: [] } },
      { ...valid, value: { willNotBuy: [4], willOnlyBuy: [] } },
      { ...valid, value: { willNotBuy: [1.5], willOnlyBuy: [] } },
      { ...valid, value: { willNotBuy: [], willOnlyBuy: [], alias: true } },
    ]) {
      expect(readExistingAreaStoreRestrictionsMutation(candidate)).toBeNull();
    }
  });

  it("enforces the combined entry budget", () => {
    const overBudget = readAreaStoreRestrictionsRawStorage({
      willNotBuy: {
        ...raw.willNotBuy,
        baseItemIds: Array.from({ length: MAX_AREA_STORE_RESTRICTION_ENTRIES }, () => 0),
        opaqueSiblingFieldCounts: Array.from(
          { length: MAX_AREA_STORE_RESTRICTION_ENTRIES },
          () => 0,
        ),
      },
      willOnlyBuy: {
        ...raw.willNotBuy,
        baseItemIds: [0],
        opaqueSiblingFieldCounts: [0],
      },
    });
    expect(overBudget).toBeNull();
  });

  it("materializes deterministic physical presence without synthesizing unchanged absence", () => {
    expect(materializeAreaStoreRestrictionTargetStorage(
      {
        willNotBuy: { present: false, baseItemIds: [] },
        willOnlyBuy: { present: true, baseItemIds: [1] },
      },
      { willNotBuy: [], willOnlyBuy: [] },
    )).toEqual({
      willNotBuy: { present: false, baseItemIds: [] },
      willOnlyBuy: { present: true, baseItemIds: [] },
    });
    expect(materializeAreaStoreRestrictionTargetStorage(
      {
        willNotBuy: { present: false, baseItemIds: [] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
      { willNotBuy: [2], willOnlyBuy: [] },
    )).toEqual({
      willNotBuy: { present: true, baseItemIds: [2] },
      willOnlyBuy: { present: false, baseItemIds: [] },
    });
  });
});
