import { describe, expect, it, vi } from "vitest";
import {
  CreatureGenderCatalogError,
  canEditExistingCreatureGender,
  isExistingCreatureGenderCatalogAdmitted,
  loadExistingCreatureGenderCatalog,
  materializeExistingCreatureGender,
  readExistingCreatureGenderProvenance,
  resolveCreatureGenderDisplayName,
} from "../../../../../src/modules/layout/application/creatureGenderProvenance";

function exactSource(rowIndex = 4, rowCount = 5) {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureGender: {
      present: true as const,
      nativeType: "byte" as const,
      value: rowIndex,
      table: {
        resourceName: "gender.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/gender.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 250,
        rowCount,
        rowIndex,
      },
    },
  };
}

const row = (rowIndex: number, displayName: string) => ({
  rowIndex,
  displayName,
  displaySource: "strref" as const,
  nameStrRef: 156 + rowIndex,
  genderToken: ["M", "F", "B", "O", "N"][rowIndex]!,
  constant: ["GENDER_MALE", "GENDER_FEMALE", "GENDER_BOTH", "GENDER_OTHER", "GENDER_NONE"][rowIndex]!,
});

describe("existing Creature Gender provenance", () => {
  it("admits only exact retained aurora_git Creature Byte/table provenance", () => {
    expect(readExistingCreatureGenderProvenance(exactSource())).toEqual({
      tableSha256: "c".repeat(64), rowCount: 5, sourceRowIndex: 4,
    });
    expect(canEditExistingCreatureGender(exactSource())).toBe(true);
    expect(canEditExistingCreatureGender({ ...exactSource(), type: "seed" })).toBe(false);
    expect(canEditExistingCreatureGender({ ...exactSource(), sourceIndex: undefined })).toBe(false);
    expect(canEditExistingCreatureGender({
      ...exactSource(), creatureGender: { present: true, nativeType: "byte", value: 4 },
    })).toBe(false);
  });

  it("loads a search page plus exact current and selected physical rows", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [row(3, "Other")], total: 1, limit: 256, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [row(4, "None")], total: 1, limit: 1, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [row(0, "Male")], total: 1, limit: 1, offset: 0,
      });
    const facade = { queries: { listRows } };

    const catalog = await loadExistingCreatureGenderCatalog(
      facade, "token", exactSource(), " other ", 0,
    );

    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "c".repeat(64), query: "other", limit: 256, offset: 0,
    });
    expect(catalog.items.map((item) => item.rowIndex)).toEqual([4, 0, 3]);
    expect(isExistingCreatureGenderCatalogAdmitted(exactSource(), catalog)).toBe(true);
    expect(materializeExistingCreatureGender(exactSource(), 4, 0, catalog)).toBe(0);
    expect(materializeExistingCreatureGender(exactSource(), 4, 2, catalog)).toBe(4);
    expect(resolveCreatureGenderDisplayName(0, catalog, "Gender 4")).toBe("Male");
  });

  it("fails closed when the retained physical row is not Toolset-admitted", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [], total: 0, limit: 256, offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [], total: 0, limit: 1, offset: 0,
      });

    await expect(loadExistingCreatureGenderCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject<Partial<CreatureGenderCatalogError>>({
      code: "CREATURE_GENDER_CATALOG_STALE",
    });
  });

  it("rejects generic labels and malformed StringRef fallbacks", async () => {
    for (const invalid of [
      { rowIndex: 4, displayName: "Row 4", displaySource: "row_index", nameStrRef: 202, genderToken: "N" },
      { rowIndex: 4, displayName: "Wrong", displaySource: "strref_id", nameStrRef: 202, genderToken: "N" },
    ]) {
      const listRows = vi.fn().mockResolvedValue({
        resourceName: "gender.2da", sha256: "c".repeat(64), rowCount: 5,
        items: [invalid], total: 1, limit: 256, offset: 0,
      });
      await expect(loadExistingCreatureGenderCatalog(
        { queries: { listRows } }, "token", exactSource(), "",
      )).rejects.toMatchObject({ code: "CREATURE_GENDER_CATALOG_INVALID" });
    }
  });
});
