import { describe, expect, it, vi } from "vitest";
import {
  loadExistingCreatureWalkRateCatalog,
  materializeExistingCreatureWalkRate,
  readExistingCreatureWalkRateProvenance,
  resolveCreatureWalkRateDisplayName,
} from "../../../../../src/modules/layout/application/creatureWalkRateProvenance";

function exactSource() {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureWalkRate: {
      present: true as const,
      nativeType: "int" as const,
      value: 4,
      table: {
        resourceName: "creaturespeed.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/creaturespeed.2da",
        sourceLayer: "vanilla" as const,
        sha256: "d".repeat(64),
        sizeBytes: 4_096,
        rowCount: 9,
        rowIndex: 4,
        twoDaName: "NORM",
      },
    },
  };
}

const rows = [
  {
    rowIndex: 2,
    displayName: "Slow",
    displaySource: "strref" as const,
    nameStrRef: 1002,
    twoDaName: "SLOW",
  },
  {
    rowIndex: 4,
    displayName: "Normal",
    displaySource: "strref" as const,
    nameStrRef: 1004,
    twoDaName: "NORM",
  },
];

describe("existing Creature WalkRate provenance", () => {
  it("loads and admits only rows from the exact effective creaturespeed.2da", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "creaturespeed.2da",
        sha256: "d".repeat(64),
        rowCount: 9,
        items: [rows[0]],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "creaturespeed.2da",
        sha256: "d".repeat(64),
        rowCount: 9,
        items: [rows[1]],
        total: 1,
        limit: 1,
        offset: 0,
      });
    const catalog = await loadExistingCreatureWalkRateCatalog(
      { queries: { listRows } }, "token", exactSource(), " slow ", 2,
    );

    expect(readExistingCreatureWalkRateProvenance(exactSource())).toEqual({
      tableSha256: "d".repeat(64),
      rowCount: 9,
      sourceRowIndex: 4,
    });
    expect(materializeExistingCreatureWalkRate(exactSource(), 4, 2, catalog)).toBe(2);
    expect(materializeExistingCreatureWalkRate(exactSource(), 4, 0, catalog)).toBe(4);
    expect(resolveCreatureWalkRateDisplayName(2, catalog, "Normal")).toBe("Slow");
    expect(catalog.query).toBe("slow");
    expect(catalog.items.map((row) => row.rowIndex)).toEqual([4, 2]);
    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "d".repeat(64),
      query: "slow",
      limit: 100,
      offset: 0,
    });
  });

  it("rejects a duplicate catalog before applying a candidate", () => {
    const duplicateCatalog = {
      tableSha256: "d".repeat(64),
      rowCount: 9,
      query: "",
      items: [rows[1]!, rows[1]!],
    };
    expect(materializeExistingCreatureWalkRate(
      exactSource(), 4, 2, duplicateCatalog,
    )).toBe(4);
  });

  it("fails closed for row zero and a missing retained row", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "creaturespeed.2da",
        sha256: "d".repeat(64),
        rowCount: 9,
        items: [rows[0]],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "creaturespeed.2da",
        sha256: "d".repeat(64),
        rowCount: 9,
        items: [],
        total: 0,
        limit: 1,
        offset: 0,
      });
    await expect(loadExistingCreatureWalkRateCatalog(
      { queries: { listRows } }, "token", exactSource(), "", 0,
    )).rejects.toMatchObject({ code: "CREATURE_WALK_RATE_CATALOG_INVALID" });
    await expect(loadExistingCreatureWalkRateCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject({ code: "CREATURE_WALK_RATE_CATALOG_STALE" });
  });
});
