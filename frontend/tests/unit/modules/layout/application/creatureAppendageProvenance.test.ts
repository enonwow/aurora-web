import { describe, expect, it, vi } from "vitest";
import {
  CreatureAppendageCatalogError,
  canEditExistingCreatureAppendage,
  isExistingCreatureAppendageCatalogAdmitted,
  loadExistingCreatureAppendageCatalog,
  materializeExistingCreatureAppendage,
  readExistingCreatureAppendageProvenance,
  resolveCreatureAppendageDisplayName,
} from "../../../../../src/modules/layout/application/creatureAppendageProvenance";

function exactSource(rowIndex = 3, rowCount = 8) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureAppendages: {
      wings: {
        present: true as const,
        value: rowIndex,
        modernDword: {
          present: true as const,
          nativeType: "dword" as const,
          value: rowIndex,
          table: {
            resourceName: "wingmodel.2da" as const,
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/wingmodel.2da",
            sourceLayer: "vanilla" as const,
            sha256: "9".repeat(64),
            sizeBytes: 350,
            rowCount,
            rowIndex,
          },
        },
        legacyByte: { present: true as const, nativeType: "byte" as const, value: 1 },
      },
      tail: { present: false as const },
    },
  };
}

const result = (items: { rowIndex: number; displayName: string }[], limit: number) => ({
  resourceName: "wingmodel.2da" as const,
  sha256: "9".repeat(64),
  rowCount: 8,
  items,
  total: items.length,
  limit,
  offset: 0,
});

describe("existing Creature appendage provenance", () => {
  it("admits only exact retained modern DWord/table provenance", () => {
    expect(readExistingCreatureAppendageProvenance(exactSource(), "wings")).toEqual({
      kind: "wings", resourceName: "wingmodel.2da", tableSha256: "9".repeat(64),
      rowCount: 8, sourceRowIndex: 3,
    });
    expect(canEditExistingCreatureAppendage(exactSource(), "wings")).toBe(true);
    expect(canEditExistingCreatureAppendage(exactSource(), "tail")).toBe(false);
    expect(canEditExistingCreatureAppendage({ ...exactSource(), type: "seed" }, "wings")).toBe(false);
    expect(canEditExistingCreatureAppendage({ ...exactSource(), sourceIndex: undefined }, "wings")).toBe(false);
  });

  it("loads a search page plus exact current and selected physical rows", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce(result([{ rowIndex: 2, displayName: "Bat" }], 256))
      .mockResolvedValueOnce(result([{ rowIndex: 3, displayName: "Angel" }], 1))
      .mockResolvedValueOnce(result([{ rowIndex: 7, displayName: "Demon" }], 1));

    const catalog = await loadExistingCreatureAppendageCatalog(
      { queries: { listRows } }, "token", exactSource(), "wings", " wing ", 7,
    );

    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      kind: "wings", tableSha256: "9".repeat(64), query: "wing", limit: 256, offset: 0,
    });
    expect(catalog.items.map((item) => item.rowIndex)).toEqual([3, 7, 2]);
    expect(isExistingCreatureAppendageCatalogAdmitted(exactSource(), "wings", catalog)).toBe(true);
    expect(materializeExistingCreatureAppendage(exactSource(), "wings", 3, 7, catalog)).toBe(7);
    expect(materializeExistingCreatureAppendage(exactSource(), "wings", 3, 4, catalog)).toBe(3);
    expect(resolveCreatureAppendageDisplayName(7, catalog, "Wings 3")).toBe("Demon");
  });

  it("fails closed when the retained row disappears or table kind changes", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce(result([], 256))
      .mockResolvedValueOnce(result([], 1));
    await expect(loadExistingCreatureAppendageCatalog(
      { queries: { listRows } }, "token", exactSource(), "wings", "",
    )).rejects.toMatchObject<Partial<CreatureAppendageCatalogError>>({
      code: "CREATURE_APPENDAGE_CATALOG_STALE",
    });

    const wrongTable = vi.fn().mockResolvedValue({
      ...result([{ rowIndex: 3, displayName: "Angel" }], 256),
      resourceName: "tailmodel.2da",
    });
    await expect(loadExistingCreatureAppendageCatalog(
      { queries: { listRows: wrongTable } }, "token", exactSource(), "wings", "",
    )).rejects.toMatchObject({ code: "CREATURE_APPENDAGE_CATALOG_STALE" });
  });
});
