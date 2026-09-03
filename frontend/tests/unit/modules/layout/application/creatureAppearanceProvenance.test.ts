import { describe, expect, it, vi } from "vitest";
import {
  CreatureAppearanceCatalogError,
  canEditExistingCreatureAppearance,
  isExistingCreatureAppearanceCatalogAdmitted,
  loadExistingCreatureAppearanceCatalog,
  materializeExistingCreatureAppearance,
  readExistingCreatureAppearanceProvenance,
} from "../../../../../src/modules/layout/application/creatureAppearanceProvenance";

function exactSource(rowIndex = 249, rowCount = 1_000) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureAppearance: {
      present: true as const,
      nativeType: "word" as const,
      value: rowIndex,
      table: {
        resourceName: "appearance.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/appearance.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 200_000,
        rowCount,
        rowIndex,
      },
    },
  };
}

const row = (rowIndex: number, displayName = "Dwarf, Male") => ({
  rowIndex,
  displayName,
  displaySource: "strref" as const,
  strRef: 1234 + rowIndex,
  label: `Creature${rowIndex}`,
});

describe("existing Creature Appearance provenance", () => {
  it("admits only exact retained aurora_git Creature Word/table provenance", () => {
    expect(readExistingCreatureAppearanceProvenance(exactSource())).toEqual({
      tableSha256: "a".repeat(64), rowCount: 1_000, sourceRowIndex: 249,
    });
    expect(canEditExistingCreatureAppearance(exactSource())).toBe(true);
    expect(canEditExistingCreatureAppearance({ ...exactSource(), type: "seed" })).toBe(false);
    expect(canEditExistingCreatureAppearance({ ...exactSource(), sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureAppearance({
      ...exactSource(), creatureAppearance: { present: true, nativeType: "word", value: 249 },
    })).toBe(false);
  });

  it("loads a search page plus exact current and selected Toolset rows", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [row(52, "Badger")], total: 1, limit: 256, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [row(249)], total: 1, limit: 1, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [row(300, "Elf, Female")], total: 1, limit: 1, offset: 0,
      });
    const facade = { queries: { listRows } };

    const catalog = await loadExistingCreatureAppearanceCatalog(
      facade, "token", exactSource(), " badger ", 300,
    );

    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "a".repeat(64), query: "badger", limit: 256, offset: 0,
    });
    expect(listRows).toHaveBeenNthCalledWith(2, "token", {
      tableSha256: "a".repeat(64), rowIndex: 249, limit: 1, offset: 0,
    });
    expect(catalog.items.map((item) => item.rowIndex)).toEqual([249, 300, 52]);
    expect(isExistingCreatureAppearanceCatalogAdmitted(exactSource(), catalog)).toBe(true);
    expect(materializeExistingCreatureAppearance(exactSource(), 249, 300, catalog)).toBe(300);
    expect(materializeExistingCreatureAppearance(exactSource(), 249, 999, catalog)).toBe(249);
  });

  it("fails closed when the exact retained row is not Toolset-admitted", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [], total: 0, limit: 256, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [], total: 0, limit: 1, offset: 0,
      });

    await expect(loadExistingCreatureAppearanceCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject<Partial<CreatureAppearanceCatalogError>>({
      code: "CREATURE_APPEARANCE_CATALOG_STALE",
    });
  });

  it("rejects generic row labels and malformed StringRef fallbacks", async () => {
    for (const invalid of [
      { rowIndex: 249, displayName: "Row 249", displaySource: "row_index" },
      { rowIndex: 249, displayName: "Wrong", displaySource: "strref_id", strRef: 1234 },
    ]) {
      const listRows = vi.fn().mockResolvedValue({
        resourceName: "appearance.2da", sha256: "a".repeat(64), rowCount: 1_000,
        items: [invalid], total: 1, limit: 256, offset: 0,
      });
      await expect(loadExistingCreatureAppearanceCatalog(
        { queries: { listRows } }, "token", exactSource(), "",
      )).rejects.toMatchObject({ code: "CREATURE_APPEARANCE_CATALOG_INVALID" });
    }
  });
});
