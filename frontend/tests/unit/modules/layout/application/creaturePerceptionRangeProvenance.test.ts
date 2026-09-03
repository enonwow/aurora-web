import { describe, expect, it, vi } from "vitest";
import {
  loadExistingCreaturePerceptionRangeCatalog,
  materializeExistingCreaturePerceptionRange,
  readExistingCreaturePerceptionRangeProvenance,
  resolveCreaturePerceptionRangeDisplayName,
} from "../../../../../src/modules/layout/application/creaturePerceptionRangeProvenance";

function exactSource() {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creaturePerceptionRange: {
      present: true as const,
      nativeType: "byte" as const,
      value: 11,
      table: {
        resourceName: "ranges.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/ranges.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 1220,
        rowCount: 12,
        rowIndex: 11 as const,
      },
    },
  };
}

const rows = [
  { rowIndex: 8 as const, displayName: "Short", displaySource: "strref" as const, nameStrRef: 6668 },
  { rowIndex: 9 as const, displayName: "Medium", displaySource: "strref" as const, nameStrRef: 6669 },
  { rowIndex: 10 as const, displayName: "Long", displaySource: "strref" as const, nameStrRef: 6670 },
  { rowIndex: 11 as const, displayName: "Default", displaySource: "strref" as const, nameStrRef: 6671 },
];

describe("existing Creature PerceptionRange provenance", () => {
  it("loads and admits the exact four native Toolset rows", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "ranges.2da",
        sha256: "c".repeat(64),
        rowCount: 12,
        items: [rows[1]],
        total: 1,
        limit: 16,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "ranges.2da",
        sha256: "c".repeat(64),
        rowCount: 12,
        items: [rows[3]],
        total: 1,
        limit: 1,
        offset: 0,
      });
    const catalog = await loadExistingCreaturePerceptionRangeCatalog(
      { queries: { listRows } }, "token", exactSource(), " medium ", 9,
    );
    expect(readExistingCreaturePerceptionRangeProvenance(exactSource())).toEqual({
      tableSha256: "c".repeat(64), rowCount: 12, sourceRowIndex: 11,
    });
    expect(materializeExistingCreaturePerceptionRange(exactSource(), 11, 9, catalog)).toBe(9);
    expect(materializeExistingCreaturePerceptionRange(exactSource(), 11, 7, catalog)).toBe(11);
    expect(resolveCreaturePerceptionRangeDisplayName(9, catalog, "Default")).toBe("Medium");
    expect(catalog.query).toBe("medium");
    expect(catalog.items.map((row) => row.rowIndex)).toEqual([11, 9]);
    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "c".repeat(64),
      query: "medium",
      limit: 16,
      offset: 0,
    });
    expect(listRows).toHaveBeenNthCalledWith(2, "token", {
      tableSha256: "c".repeat(64),
      rowIndex: 11,
      limit: 1,
      offset: 0,
    });
  });

  it("rejects a duplicate catalog before applying a candidate", () => {
    const duplicateCatalog = {
      tableSha256: "c".repeat(64),
      rowCount: 12,
      query: "",
      items: [rows[3]!, rows[3]!],
    };
    expect(materializeExistingCreaturePerceptionRange(
      exactSource(), 9, 11, duplicateCatalog,
    )).toBe(9);
  });

  it("fails closed for invented or missing selector rows", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "ranges.2da",
        sha256: "c".repeat(64),
        rowCount: 12,
        items: rows.slice(0, 3),
        total: 3,
        limit: 16,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "ranges.2da",
        sha256: "c".repeat(64),
        rowCount: 12,
        items: [],
        total: 0,
        limit: 1,
        offset: 0,
      });
    await expect(loadExistingCreaturePerceptionRangeCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject({ code: "CREATURE_PERCEPTION_RANGE_CATALOG_STALE" });
    await expect(loadExistingCreaturePerceptionRangeCatalog(
      { queries: { listRows } }, "token", exactSource(), "", 12,
    )).rejects.toMatchObject({ code: "CREATURE_PERCEPTION_RANGE_CATALOG_INVALID" });
  });
});
