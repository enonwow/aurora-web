import { describe, expect, it, vi } from "vitest";
import {
  loadExistingCreatureClassCatalog,
  materializeExistingCreatureClassIdentity,
  materializeExistingCreatureClassSlotResize,
  readExistingCreatureClassIdentityProvenance,
} from "../../../../../src/modules/layout/application/creatureClassIdentityProvenance";

function exactSource() {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureClassIdentityState: {
      present: true as const,
      nativeType: "list" as const,
      structTypeId: 2 as const,
      classNativeType: "int" as const,
      levelNativeType: "short" as const,
      classListGraphSha256: "c".repeat(64),
      entries: [{
        classId: 4,
        level: 3,
        opaqueSiblingFieldCount: 2,
        canonicalSpellListFieldCount: 4,
        spellEntryCount: 7,
      }],
      classesTable: {
        resourceName: "classes.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 12_000,
        rowCount: 64,
      },
    },
    creatureStartingPackage: {
      present: true as const,
      nativeType: "byte" as const,
      value: 0,
      classIds: [4],
      table: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: "b".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
        rowIndex: 0,
        classId: 4,
      },
    },
  };
}

describe("existing Creature class-identity provenance", () => {
  it("loads exact source class rows and preserves the graph/package bindings", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "classes.2da",
        sha256: "a".repeat(64),
        rowCount: 64,
        items: [{
          rowIndex: 5,
          displayName: "Wizard",
          displaySource: "strref" as const,
          nameStrRef: 105,
        }],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "classes.2da",
        sha256: "a".repeat(64),
        rowCount: 64,
        items: [{
          rowIndex: 4,
          displayName: "Fighter",
          displaySource: "strref" as const,
          nameStrRef: 104,
        }],
        total: 1,
        limit: 1,
        offset: 0,
      });

    const catalog = await loadExistingCreatureClassCatalog(
      { queries: { listRows } }, "token", exactSource(), " wiz ",
    );

    expect(readExistingCreatureClassIdentityProvenance(exactSource())).toMatchObject({
      sourceClassIds: [4],
      sourceLevels: [3],
      sourceStartingPackage: 0,
      classesTableSha256: "a".repeat(64),
      packagesTableSha256: "b".repeat(64),
    });
    expect(catalog.items.map((row) => row.rowIndex)).toEqual([4, 5]);
  });

  it("materializes a confirmed same-roster class and level change with both admitted catalogs", () => {
    const current = [{ classId: 4, className: "Fighter", level: 3 }];
    const candidate = [{ classId: 5, className: "stale label", level: 4 }];
    const result = materializeExistingCreatureClassIdentity(
      exactSource(),
      current,
      candidate,
      2,
      true,
      {
        tableSha256: "a".repeat(64),
        rowCount: 64,
        query: "",
        items: [
          {
            rowIndex: 4,
            displayName: "Fighter",
            displaySource: "strref",
            nameStrRef: 104,
          },
          {
            rowIndex: 5,
            displayName: "Wizard",
            displaySource: "strref",
            nameStrRef: 105,
          },
        ],
      },
      {
        tableSha256: "b".repeat(64),
        rowCount: 132,
        classIds: [5],
        query: "",
        items: [{
          rowIndex: 2,
          classId: 5,
          displayName: "Wizard package",
          displaySource: "strref",
          nameStrRef: 205,
        }],
      },
    );

    expect(result).toEqual({
      classEntries: [{ classId: 5, className: "Wizard", level: 4 }],
      startingPackageId: 2,
      destructiveSpellClearConfirmed: true,
    });
    expect(materializeExistingCreatureClassIdentity(
      exactSource(), current, candidate, 2, false,
      { tableSha256: "a".repeat(64), rowCount: 64, query: "", items: [] },
      null,
    )).toBeNull();
  });

  it("materializes only an admitted tail append or confirmed tail truncation", () => {
    const current = [{ classId: 4, className: "Fighter", level: 3 }];
    const classCatalog = {
      tableSha256: "a".repeat(64),
      rowCount: 64,
      query: "",
      items: [
        { rowIndex: 4, displayName: "Fighter", displaySource: "strref" as const, nameStrRef: 104 },
        { rowIndex: 5, displayName: "Wizard", displaySource: "strref" as const, nameStrRef: 105 },
      ],
    };
    expect(materializeExistingCreatureClassSlotResize(
      exactSource(),
      current,
      [...current, { classId: 5, className: "stale", level: 1 }],
      2,
      false,
      classCatalog,
      {
        tableSha256: "b".repeat(64),
        rowCount: 132,
        classIds: [4, 5],
        query: "",
        items: [{
          rowIndex: 2,
          classId: 5,
          displayName: "Wizard package",
          displaySource: "strref",
          nameStrRef: 205,
        }],
      },
    )).toEqual({
      classEntries: [
        { classId: 4, className: "Fighter", level: 3 },
        { classId: 5, className: "Wizard", level: 1 },
      ],
      startingPackageId: 2,
      destructiveRemovedSlotsConfirmed: false,
    });

    expect(materializeExistingCreatureClassSlotResize(
      exactSource(), current, [], 0, true, classCatalog, null,
    )).toBeNull();
    expect(materializeExistingCreatureClassSlotResize(
      exactSource(), current,
      [{ classId: 5, className: "Wizard", level: 1 }],
      2, true, classCatalog, null,
    )).toBeNull();
  });
});
