import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableBodyBag,
  materializeExistingPlaceableBodyBag,
} from "../../../../src/modules/layout/application/placeableBodyBagProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  placeableBodyBag: {
    expectedValue: 0,
    tableSha256: "e".repeat(64),
    tableRowCount: 2,
  },
};
const catalog = {
  descriptor: {
    resourceName: "bodybag.2da" as const,
    sourceObjectKey: "modules/current/bodybag.2da",
    sourceLayer: "module" as const,
    sha256: "e".repeat(64),
    sizeBytes: 502,
    rowCount: 2,
  },
  rows: [
    { rowIndex: 0, nameStrRef: 6671, displayName: "Default", displaySource: "strref" as const },
    { rowIndex: 1, nameStrRef: 66490, displayName: "Treasure", displaySource: "strref" as const },
  ],
};

describe("existing Placeable BodyBag provenance", () => {
  it("materializes only an admitted physical row and preserves unrelated Advanced settings", () => {
    expect(canEditExistingPlaceableBodyBag(source, catalog)).toBe(true);
    expect(materializeExistingPlaceableBodyBag(
      source,
      { conversation: "conv", noInterrupt: true, treasureModelRow: 0 },
      1,
      catalog,
    )).toEqual({ conversation: "conv", noInterrupt: true, treasureModelRow: 1 });
  });

  it("preserves current settings for stale, invalid, absent, or unproven input", () => {
    const current = { treasureModelRow: 0 };
    expect(materializeExistingPlaceableBodyBag(source, current, 2, catalog)).toBe(current);
    expect(materializeExistingPlaceableBodyBag(source, current, -1, catalog)).toBe(current);
    expect(materializeExistingPlaceableBodyBag(source, current, 0.5, catalog)).toBe(current);
    expect(materializeExistingPlaceableBodyBag(source, undefined, 1, catalog)).toBeUndefined();
    expect(materializeExistingPlaceableBodyBag({ ...source, type: "seed" }, current, 1, catalog)).toBe(current);
    expect(materializeExistingPlaceableBodyBag(source, current, 1, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "f".repeat(64) },
    })).toBe(current);
  });
});
