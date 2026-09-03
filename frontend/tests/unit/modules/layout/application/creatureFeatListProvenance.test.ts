import { describe, expect, it, vi } from "vitest";
import {
  isExistingCreatureFeatCatalogAdmitted,
  loadExistingCreatureFeatCatalog,
  materializeExistingCreatureFeats,
  readExistingCreatureFeatListProvenance,
} from "../../../../../src/modules/layout/application/creatureFeatListProvenance";

const TABLE_SHA256 = "d".repeat(64);

function exactSource(rowCount = 131) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureFeatList: {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 1 as const,
      featNativeType: "word" as const,
      featIds: [0, 130],
      opaqueSiblingFieldCounts: [0, 0],
      table: {
        resourceName: "feat.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/feat.2da",
        sourceLayer: "vanilla" as const,
        sha256: TABLE_SHA256,
        sizeBytes: 98_765,
        rowCount,
      },
    },
  };
}

function row(rowIndex: number) {
  return {
    rowIndex,
    featNameStrRef: 10_000 + rowIndex,
    toolsCategory: rowIndex === 40 ? 4 : 1,
    displayName: `Feat ${rowIndex}`,
  };
}

describe("existing Creature FeatList provenance", () => {
  it("loads all visible pages and requires every retained physical row", async () => {
    const rows = [...Array.from({ length: 128 }, (_, index) => row(index)), row(130)];
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "feat.2da",
        sha256: TABLE_SHA256,
        rowCount: 131,
        items: rows.slice(0, 128),
        total: 129,
        limit: 128,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "feat.2da",
        sha256: TABLE_SHA256,
        rowCount: 131,
        items: rows.slice(128),
        total: 129,
        limit: 128,
        offset: 128,
      });

    const catalog = await loadExistingCreatureFeatCatalog(
      { queries: { listRows } },
      "token",
      exactSource(),
    );

    expect(readExistingCreatureFeatListProvenance(exactSource())).toEqual({
      tableSha256: TABLE_SHA256,
      rowCount: 131,
      sourceFeatIds: [0, 130],
      opaqueSiblingFieldCounts: [0, 0],
    });
    expect(catalog.items.at(-1)?.rowIndex).toBe(130);
    expect(isExistingCreatureFeatCatalogAdmitted(exactSource(), catalog)).toBe(true);
  });

  it("fails closed when a retained row is absent from the visible catalog", async () => {
    const listRows = vi.fn().mockResolvedValue({
      resourceName: "feat.2da",
      sha256: TABLE_SHA256,
      rowCount: 131,
      items: [row(0)],
      total: 1,
      limit: 128,
      offset: 0,
    });
    await expect(loadExistingCreatureFeatCatalog(
      { queries: { listRows } },
      "token",
      exactSource(),
    )).rejects.toMatchObject({ code: "CREATURE_FEAT_CATALOG_INCOMPLETE" });
  });

  it("materializes the admitted catalog without inventing feat identities", () => {
    const current = [
      { featId: 0, name: "Feat 0", type: "", assigned: true },
      { featId: 130, name: "Feat 130", type: "", assigned: true },
    ];
    const candidate = [
      { featId: 0, name: "Feat 0", type: "", assigned: false },
      { featId: 5, name: "Feat 5", type: "", assigned: true },
      { featId: 130, name: "Feat 130", type: "", assigned: true },
    ];
    const catalog = {
      tableSha256: TABLE_SHA256,
      rowCount: 131,
      items: [row(0), row(5), row(130)],
    };
    expect(materializeExistingCreatureFeats(exactSource(), current, candidate, catalog))
      .toEqual([
        { featId: 0, name: "Feat 0", type: "ToolsCategory 1", assigned: false },
        { featId: 5, name: "Feat 5", type: "ToolsCategory 1", assigned: true },
        { featId: 130, name: "Feat 130", type: "ToolsCategory 1", assigned: true },
      ]);
    expect(materializeExistingCreatureFeats(exactSource(), current, candidate, null))
      .toEqual(current);
  });
});
