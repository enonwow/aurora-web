import { describe, expect, it } from "vitest";

import {
  areaStoreRestrictionTargetsEqual,
  bindStoreRestrictionsProvenanceToCatalog,
  cloneStoreRestrictionsProvenance,
  readStoreRestrictionsProvenance,
  readStoreRestrictionsTarget,
} from "../../../../../src/modules/scene/domain/storeRestrictions";

const provenance = {
  expectedValue: {
    willNotBuy: { present: true, baseItemIds: [2, 1, 2] },
    willOnlyBuy: { present: false, baseItemIds: [] },
  },
  tableSha256: "e".repeat(64),
  tableRowCount: 4,
} as const;

const catalog = {
  descriptor: {
    resourceName: "baseitems.2da" as const,
    sourceObjectKey: "modules/current/baseitems.2da",
    sourceLayer: "module" as const,
    sha256: "e".repeat(64),
    sizeBytes: 4096,
    rowCount: 4,
  },
  rows: Array.from({ length: 4 }, (_, rowIndex) => ({
    rowIndex,
    modelType: 0 as const,
    displayName: `Base item ${rowIndex}`,
  })),
};

describe("Store restrictions", () => {
  it("admits, detaches, and preserves ordered duplicate BaseItem IDs and list presence", () => {
    const parsed = readStoreRestrictionsProvenance(provenance);
    const cloned = cloneStoreRestrictionsProvenance(provenance);
    const target = readStoreRestrictionsTarget({
      willNotBuy: [1, 2, 1],
      willOnlyBuy: [0, 0],
    }, 4);

    expect(parsed).toStrictEqual(provenance);
    expect(parsed).not.toBe(provenance);
    expect(parsed?.expectedValue.willNotBuy.baseItemIds)
      .not.toBe(provenance.expectedValue.willNotBuy.baseItemIds);
    expect(cloned).toStrictEqual(provenance);
    expect(cloned).not.toBe(provenance);
    expect(target).toStrictEqual({ willNotBuy: [1, 2, 1], willOnlyBuy: [0, 0] });
    expect(areaStoreRestrictionTargetsEqual(target!, {
      willNotBuy: [1, 2, 1],
      willOnlyBuy: [0, 0],
    })).toBe(true);
  });

  it("binds the exact provenance to the current physical baseitems.2da rows", () => {
    expect(bindStoreRestrictionsProvenanceToCatalog(provenance, catalog))
      .toStrictEqual(provenance);
    expect(bindStoreRestrictionsProvenanceToCatalog({
      ...provenance,
      tableSha256: "f".repeat(64),
    }, catalog)).toBeNull();
    expect(bindStoreRestrictionsProvenanceToCatalog({
      ...provenance,
      expectedValue: {
        ...provenance.expectedValue,
        willNotBuy: { present: true, baseItemIds: [4] },
      },
    }, catalog)).toBeNull();
  });

  it("rejects malformed, over-budget, extra-key, and out-of-catalog targets", () => {
    expect(readStoreRestrictionsProvenance({
      ...provenance,
      unexpected: true,
    })).toBeNull();
    expect(readStoreRestrictionsProvenance({
      ...provenance,
      expectedValue: {
        willNotBuy: { present: false, baseItemIds: [0] },
        willOnlyBuy: { present: false, baseItemIds: [] },
      },
    })).toBeNull();
    expect(readStoreRestrictionsTarget({
      willNotBuy: Array.from({ length: 4097 }, () => 0),
      willOnlyBuy: [],
    }, 4)).toBeNull();
    expect(readStoreRestrictionsTarget({ willNotBuy: [4], willOnlyBuy: [] }, 4))
      .toBeNull();
  });
});
