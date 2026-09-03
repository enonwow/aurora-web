import { describe, expect, it } from "vitest";

import {
  readPlaceableFactionBinding,
  readPlaceableFactionCatalog,
  readPlaceableFactionProvenance,
} from "../../../../../src/modules/scene/domain/placeableFaction";

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

describe("existing Placeable Faction domain", () => {
  it("admits an exact module catalog and canonical DWord binding", () => {
    expect(readPlaceableFactionCatalog(catalog)).toEqual(catalog);
    expect(readPlaceableFactionBinding(
      { present: true, nativeType: "dword", value: 2 },
      catalog,
    )).toEqual({
      expectedValue: 2,
      catalogSha256: "f".repeat(64),
      catalogFactionCount: 5,
    });
  });

  it("fails closed for malformed storage, catalogs, and provenance", () => {
    expect(readPlaceableFactionBinding({ present: false }, catalog)).toBeNull();
    expect(readPlaceableFactionBinding(
      { present: true, nativeType: "word", value: 2 }, catalog,
    )).toBeNull();
    expect(readPlaceableFactionBinding(
      { present: true, nativeType: "dword", value: 5 }, catalog,
    )).toBeNull();
    expect(readPlaceableFactionProvenance({
      expectedValue: 2,
      catalogSha256: "F".repeat(64),
      catalogFactionCount: 5,
    })).toBeNull();
    expect(readPlaceableFactionCatalog({
      ...catalog,
      rows: catalog.rows.map((row, index) => index === 1 ? { ...row, factionId: 2 } : row),
    })).toBeNull();
  });
});
