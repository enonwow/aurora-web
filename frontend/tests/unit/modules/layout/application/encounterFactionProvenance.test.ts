import { describe, expect, it } from "vitest";

import {
  canEditExistingEncounterFaction,
  materializeExistingEncounterFaction,
} from "../../../../../src/modules/layout/application/encounterFactionProvenance";

const source = {
  type: "aurora_git" as const,
  sourceKind: "encounter" as const,
  sourceIndex: 2,
  encounterFaction: {
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

describe("existing Encounter Faction provenance", () => {
  it("materializes a selected non-PC physical row", () => {
    expect(canEditExistingEncounterFaction(source, catalog)).toBe(true);
    expect(materializeExistingEncounterFaction(source, 1, 4, catalog)).toBe(4);
  });

  it("preserves current value for row zero, stale catalog, invalid input, and wrong family", () => {
    expect(materializeExistingEncounterFaction(source, 1, 0, catalog)).toBe(1);
    expect(materializeExistingEncounterFaction(source, 1, 5, catalog)).toBe(1);
    expect(materializeExistingEncounterFaction(source, 1, 3.5, catalog)).toBe(1);
    expect(materializeExistingEncounterFaction(
      { ...source, sourceKind: "placeable" as const }, 1, 4, catalog,
    )).toBe(1);
    expect(materializeExistingEncounterFaction(source, 1, 4, {
      ...catalog,
      descriptor: { ...catalog.descriptor, sha256: "a".repeat(64) },
    })).toBe(1);
  });
});
