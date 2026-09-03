import { describe, expect, it } from "vitest";

import {
  canEditExistingPlaceableFaction,
  materializeExistingPlaceableFaction,
} from "../../../../../src/modules/layout/application/placeableFactionProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "placeable" as const,
  placeableFaction: {
    expectedValue: 2,
    catalogSha256: "f".repeat(64),
    catalogFactionCount: 5,
  },
};
const catalog = {
  descriptor: {
    resourceName: "repute.fac" as const,
    sourceObjectKey: "modules/current/repute.fac",
    sha256: "f".repeat(64),
    sizeBytes: 1889,
    factionCount: 5,
  },
  rows: ["PC", "Hostile", "Commoner", "Merchant", "Defender"].map(
    (name, factionId) => ({ factionId, name, parentFactionId: 0xffffffff, isGlobal: true }),
  ),
};

describe("existing Placeable Faction provenance", () => {
  it("materializes the selected physical ID and derived name without touching siblings", () => {
    expect(canEditExistingPlaceableFaction(source, catalog)).toBe(true);
    expect(materializeExistingPlaceableFaction(
      source,
      { conversation: "conv", factionId: 2, belongsToFaction: "Commoner" },
      3,
      catalog,
    )).toEqual({
      conversation: "conv",
      factionId: 3,
      belongsToFaction: "Merchant",
    });
  });

  it("preserves current settings for stale, invalid, wrong-family, and missing targets", () => {
    const current = { factionId: 2, belongsToFaction: "Commoner" };
    expect(materializeExistingPlaceableFaction(source, current, 5, catalog)).toBe(current);
    expect(materializeExistingPlaceableFaction(source, current, 3.5, catalog)).toBe(current);
    expect(materializeExistingPlaceableFaction(source, undefined, 3, catalog)).toBeUndefined();
    expect(materializeExistingPlaceableFaction(
      { ...source, sourceKind: "door" as const }, current, 3, catalog,
    )).toBe(current);
    expect(materializeExistingPlaceableFaction(source, current, 3, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "a".repeat(64) },
    })).toBe(current);
  });
});
