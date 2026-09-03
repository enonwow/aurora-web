import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceablePortrait,
  materializeExistingPlaceablePortrait,
} from "../../../../src/modules/layout/application/placeablePortraitProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  placeablePortrait: {
    expectedValue: 462,
    tableSha256: "a".repeat(64),
    tableRowCount: 700,
  },
};
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

describe("existing Placeable PortraitId provenance", () => {
  it("materializes the selected physical row and derived BaseResRef without touching siblings", () => {
    expect(canEditExistingPlaceablePortrait(source, catalog)).toBe(true);
    expect(materializeExistingPlaceablePortrait(
      source,
      { conversation: "conv", portraitId: 462, portraitResRef: "po_hu_m_01_" },
      463,
      catalog,
    )).toEqual({
      conversation: "conv",
      portraitId: 463,
      portraitResRef: "po_hu_m_02_",
    });
  });

  it("preserves current settings for stale, absent, invalid, wrong-family, or non-selectable input", () => {
    const current = { portraitId: 462, portraitResRef: "po_hu_m_01_" };
    expect(materializeExistingPlaceablePortrait(source, current, 464, catalog)).toBe(current);
    expect(materializeExistingPlaceablePortrait(source, current, 463.5, catalog)).toBe(current);
    expect(materializeExistingPlaceablePortrait(source, undefined, 463, catalog)).toBeUndefined();
    expect(materializeExistingPlaceablePortrait(
      { ...source, sourceKind: "creature" as const }, current, 463, catalog,
    )).toBe(current);
    expect(materializeExistingPlaceablePortrait(source, current, 463, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "b".repeat(64) },
    })).toBe(current);
  });
});
