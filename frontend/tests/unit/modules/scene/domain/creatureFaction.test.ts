import { describe, expect, it } from "vitest";

import {
  readCreatureFactionBinding,
  readCreatureFactionProvenance,
} from "../../../../../src/modules/scene/domain/creatureFaction";

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

describe("existing Creature FactionID domain", () => {
  it("binds one canonical Word to the exact module catalog", () => {
    expect(readCreatureFactionBinding(
      { present: true, nativeType: "word", value: 1 },
      catalog,
    )).toEqual({
      expectedValue: 1,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    });
  });

  it("fails closed for absence, legacy DWord, out-of-range IDs, and malformed provenance", () => {
    expect(readCreatureFactionBinding({ present: false }, catalog)).toBeNull();
    expect(readCreatureFactionBinding(
      { present: true, nativeType: "dword", value: 1 }, catalog,
    )).toBeNull();
    expect(readCreatureFactionBinding(
      { present: true, nativeType: "word", value: 5 }, catalog,
    )).toBeNull();
    expect(readCreatureFactionProvenance({
      expectedValue: 1,
      catalogSha256: "F".repeat(64),
      catalogFactionCount: 5,
    })).toBeNull();
  });
});
