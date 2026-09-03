import { describe, expect, it } from "vitest";

import {
  canEditExistingCreatureFaction,
  materializeExistingCreatureFaction,
} from "../../../../../src/modules/layout/application/creatureFactionProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "creature" as const,
  creatureFaction: {
    expectedValue: 1,
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

describe("existing Creature FactionID provenance", () => {
  it("materializes the selected physical ID and derived display name without touching siblings", () => {
    expect(canEditExistingCreatureFaction(source, catalog)).toBe(true);
    expect(materializeExistingCreatureFaction(
      source,
      { faction: "Hostile", factionId: 1, subrace: "Human" },
      4,
      catalog,
    )).toEqual({
      faction: "Defender",
      factionId: 4,
      subrace: "Human",
    });
  });

  it("preserves current settings for stale, invalid, wrong-family, and missing targets", () => {
    const current = { faction: "Hostile", factionId: 1 };
    expect(materializeExistingCreatureFaction(source, current, 5, catalog)).toBe(current);
    expect(materializeExistingCreatureFaction(source, current, 3.5, catalog)).toBe(current);
    expect(materializeExistingCreatureFaction(source, undefined, 4, catalog)).toBeUndefined();
    expect(materializeExistingCreatureFaction(
      { ...source, sourceKind: "placeable" as const }, current, 4, catalog,
    )).toBe(current);
    expect(materializeExistingCreatureFaction(source, current, 4, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "a".repeat(64) },
    })).toBe(current);
  });
});
