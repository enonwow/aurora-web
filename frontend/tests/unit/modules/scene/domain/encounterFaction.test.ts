import { describe, expect, it } from "vitest";

import {
  readEncounterFactionBinding,
  readEncounterFactionProvenance,
} from "../../../../../src/modules/scene/domain/encounterFaction";

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

describe("existing Encounter Faction domain", () => {
  it("binds one canonical non-PC DWord to the exact module catalog", () => {
    expect(readEncounterFactionBinding(
      { present: true, nativeType: "dword", value: 1 },
      catalog,
    )).toEqual({
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    });
  });

  it("fails closed for absence, wrong type, PC row zero, out-of-range IDs, and malformed provenance", () => {
    expect(readEncounterFactionBinding({ present: false }, catalog)).toBeNull();
    expect(readEncounterFactionBinding(
      { present: true, nativeType: "word", value: 1 }, catalog,
    )).toBeNull();
    expect(readEncounterFactionBinding(
      { present: true, nativeType: "dword", value: 0 }, catalog,
    )).toBeNull();
    expect(readEncounterFactionBinding(
      { present: true, nativeType: "dword", value: 5 }, catalog,
    )).toBeNull();
    expect(readEncounterFactionProvenance({
      expectedValue: 1,
      catalogSha256: "F".repeat(64),
      catalogFactionCount: 5,
    })).toBeNull();
    expect(readEncounterFactionProvenance({
      expectedValue: 0,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    })).toBeNull();
  });
});
