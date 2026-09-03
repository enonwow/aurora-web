import { describe, expect, it, vi } from "vitest";
import {
  loadExistingCreatureStartingPackageCatalog,
  materializeExistingCreatureStartingPackageId,
  readExistingCreatureStartingPackageProvenance,
  resolveCreatureStartingPackageDisplayName,
} from "../../../../../src/modules/layout/application/creatureStartingPackageProvenance";

function exactSource() {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureStartingPackage: {
      present: true as const,
      nativeType: "byte" as const,
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    },
  };
}

const rows = [
  {
    rowIndex: 0,
    classId: 4,
    displayName: "Fighter package zero",
    displaySource: "strref" as const,
    nameStrRef: 100,
  },
  {
    rowIndex: 2,
    classId: 4,
    displayName: "Fighter package two",
    displaySource: "label" as const,
    nameStrRef: null,
  },
];

describe("existing Creature StartingPackage provenance", () => {
  it("loads and admits only rows from exact packages.2da and retained ClassList", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "packages.2da",
        sha256: "c".repeat(64),
        rowCount: 132,
        classIds: [4],
        items: [rows[1]],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "packages.2da",
        sha256: "c".repeat(64),
        rowCount: 132,
        classIds: [4],
        items: [rows[0]],
        total: 1,
        limit: 1,
        offset: 0,
      });
    const catalog = await loadExistingCreatureStartingPackageCatalog(
      { queries: { listRows } }, "token", exactSource(), " fighter ", 2,
    );

    expect(readExistingCreatureStartingPackageProvenance(exactSource())).toEqual({
      tableSha256: "c".repeat(64),
      rowCount: 132,
      sourceRowIndex: 0,
      classIds: [4],
    });
    expect(materializeExistingCreatureStartingPackageId(exactSource(), 0, 2, catalog)).toBe(2);
    expect(materializeExistingCreatureStartingPackageId(exactSource(), 0, 1, catalog)).toBe(0);
    expect(resolveCreatureStartingPackageDisplayName(2, catalog, "Package 0"))
      .toBe("Fighter package two");
    expect(catalog.items.map((row) => row.rowIndex)).toEqual([0, 2]);
    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "c".repeat(64),
      classIds: [4],
      query: "fighter",
      limit: 100,
      offset: 0,
    });
  });

  it("rejects a class-incompatible catalog before applying a candidate", () => {
    const catalog = {
      tableSha256: "c".repeat(64),
      rowCount: 132,
      classIds: [4],
      query: "",
      items: [{ ...rows[0]!, classId: 2 }],
    };
    expect(materializeExistingCreatureStartingPackageId(exactSource(), 0, 2, catalog)).toBe(0);
  });

  it("fails closed when the response echoes a different ClassList", async () => {
    const listRows = vi.fn().mockResolvedValue({
      resourceName: "packages.2da",
      sha256: "c".repeat(64),
      rowCount: 132,
      classIds: [2],
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
    });
    await expect(loadExistingCreatureStartingPackageCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject({ code: "CREATURE_STARTING_PACKAGE_CATALOG_STALE" });
  });
});
