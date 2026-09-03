import { describe, expect, it, vi } from "vitest";

import {
  PlaceableAppearanceCatalogError,
  canEditExistingPlaceableAppearance,
  isExistingPlaceableAppearanceCatalogAdmitted,
  loadExistingPlaceableAppearanceCatalog,
  materializeExistingPlaceableAppearance,
  readExistingPlaceableAppearanceProvenance,
  reduceExistingPlaceableAppearance
} from "../../../../../src/modules/layout/application/placeableAppearanceProvenance";
import {
  arePlaceablePropertiesDraftsEqual,
  buildPlaceablePropertiesDraft
} from "../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../src/modules/scene/domain/sceneFactory";

function exactSource(rowIndex = 104, rowCount = 400) {
  return {
    type: "aurora_git" as const,
    sourceKind: "placeable" as const,
    placeableBasicIdentity: {
      tag: { present: true as const, value: "WaterTrough" },
      appearance: {
        present: true as const,
        nativeType: "dword" as const,
        value: rowIndex,
        table: {
          resourceName: "placeables.2da" as const,
          sourceObjectKey: "modules/current/__aurora/sources/hak/lc_2da/placeables.2da",
          sourceLayer: "hak" as const,
          sha256: "a".repeat(64),
          sizeBytes: 8192,
          rowCount,
          rowIndex
        }
      }
    }
  };
}

function exactRow(rowIndex = 104) {
  return { rowIndex, displayName: `Row ${rowIndex}`, displaySource: "row_index" as const };
}

function exactCatalog(rowCount = 400) {
  return {
    tableSha256: "a".repeat(64),
    rowCount,
    query: "",
    items: [exactRow(104), exactRow(105)]
  };
}

function exactPage(overrides: Record<string, unknown> = {}) {
  return {
    resourceName: "placeables.2da",
    sha256: "a".repeat(64),
    rowCount: 400,
    items: [exactRow(104)],
    total: 400,
    limit: 256,
    offset: 0,
    ...overrides
  };
}

describe("existing Placeable Appearance provenance", () => {
  it("admits only exact retained aurora_git Placeable DWord/table provenance", () => {
    expect(readExistingPlaceableAppearanceProvenance(exactSource())).toEqual({
      tableSha256: "a".repeat(64),
      rowCount: 400,
      sourceRowIndex: 104
    });
    expect(canEditExistingPlaceableAppearance(exactSource())).toBe(true);
    expect(canEditExistingPlaceableAppearance({ ...exactSource(), type: "seed" })).toBe(false);
    expect(canEditExistingPlaceableAppearance({ ...exactSource(), sourceKind: "door" })).toBe(false);
    expect(canEditExistingPlaceableAppearance({
      ...exactSource(),
      placeableBasicIdentity: {
        ...exactSource().placeableBasicIdentity,
        appearance: { present: true, nativeType: "byte", value: 104 }
      }
    })).toBe(false);
    expect(canEditExistingPlaceableAppearance({
      ...exactSource(),
      placeableBasicIdentity: {
        ...exactSource().placeableBasicIdentity,
        appearance: {
          ...exactSource().placeableBasicIdentity.appearance,
          table: {
            ...exactSource().placeableBasicIdentity.appearance.table,
            sha256: "A".repeat(64)
          }
        }
      }
    })).toBe(false);
  });

  it("rejects every malformed or non-exact retained Appearance provenance boundary", () => {
    const cases: Array<(candidate: any) => void> = [
      (candidate) => { candidate.placeableBasicIdentity.appearance = null; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.extra = true; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.present = false; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.nativeType = "byte"; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table = null; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.extra = true; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.resourceName = "appearance.2da"; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sourceObjectKey = 1; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sourceObjectKey = ""; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sourceObjectKey = "x".repeat(2049); },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sourceLayer = "override"; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sha256 = 1; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sha256 = "A".repeat(64); },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sizeBytes = 0; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.sizeBytes = 64 * 1024 * 1024 + 1; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.rowCount = 0; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.rowCount = 1_000_001; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.value = -1; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.value = 104.5; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.rowIndex = 105; },
      (candidate) => { candidate.placeableBasicIdentity.appearance.table.rowIndex = 400; },
      (candidate) => {
        candidate.placeableBasicIdentity.appearance.value = 400;
        candidate.placeableBasicIdentity.appearance.table.rowIndex = 400;
      },
      (candidate) => { delete candidate.placeableBasicIdentity.appearance.table.rowIndex; }
    ];
    for (const mutate of cases) {
      const candidate: any = structuredClone(exactSource());
      mutate(candidate);
      expect(readExistingPlaceableAppearanceProvenance(candidate)).toBeNull();
    }
    for (const sourceLayer of ["module", "hak", "vanilla"] as const) {
      const candidate: any = structuredClone(exactSource(0, 1));
      candidate.placeableBasicIdentity.appearance.table.sourceLayer = sourceLayer;
      candidate.placeableBasicIdentity.appearance.table.sourceObjectKey = "x";
      candidate.placeableBasicIdentity.appearance.table.sizeBytes = 1;
      expect(readExistingPlaceableAppearanceProvenance(candidate)).not.toBeNull();
      candidate.placeableBasicIdentity.appearance.table.sourceObjectKey = "x".repeat(2048);
      candidate.placeableBasicIdentity.appearance.table.sizeBytes = 64 * 1024 * 1024;
      expect(readExistingPlaceableAppearanceProvenance(candidate)).not.toBeNull();
    }
  });

  it("loads one digest-bound search page and independently retains the current physical row", async () => {
    const listPlaceableAppearanceRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 400,
        items: [{ rowIndex: 7, displayName: "Water Bowl", displaySource: "label" }],
        total: 1,
        limit: 256,
        offset: 0
      })
      .mockResolvedValueOnce({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 400,
        items: [{ rowIndex: 300, displayName: "Current Chest", displaySource: "strref" }],
        total: 400,
        limit: 1,
        offset: 300
      });

    const result = await loadExistingPlaceableAppearanceCatalog(
      { listPlaceableAppearanceRows },
      "token-1",
      exactSource(300),
      " water "
    );

    expect(listPlaceableAppearanceRows).toHaveBeenNthCalledWith(1, "token-1", {
      tableSha256: "a".repeat(64),
      query: "water",
      limit: 256,
      offset: 0
    });
    expect(listPlaceableAppearanceRows).toHaveBeenNthCalledWith(2, "token-1", {
      tableSha256: "a".repeat(64),
      limit: 1,
      offset: 300
    });
    expect(result).toEqual({
      tableSha256: "a".repeat(64),
      rowCount: 400,
      query: "water",
      items: [
        { rowIndex: 300, displayName: "Current Chest", displaySource: "strref" },
        { rowIndex: 7, displayName: "Water Bowl", displaySource: "label" }
      ]
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });

  it("retains both the native source row and the selected target row across a filtered search", async () => {
    const listPlaceableAppearanceRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 400,
        items: [{ rowIndex: 7, displayName: "Water Bowl", displaySource: "label" }],
        total: 1,
        limit: 256,
        offset: 0
      })
      .mockResolvedValueOnce({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 400,
        items: [{ rowIndex: 300, displayName: "Native Chest", displaySource: "strref" }],
        total: 400,
        limit: 1,
        offset: 300
      })
      .mockResolvedValueOnce({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 400,
        items: [{ rowIndex: 105, displayName: "Selected Chair", displaySource: "label" }],
        total: 400,
        limit: 1,
        offset: 105
      });

    const result = await loadExistingPlaceableAppearanceCatalog(
      { listPlaceableAppearanceRows },
      "token-1",
      exactSource(300),
      "water",
      105
    );

    expect(listPlaceableAppearanceRows).toHaveBeenNthCalledWith(3, "token-1", {
      tableSha256: "a".repeat(64),
      limit: 1,
      offset: 105
    });
    expect(result.items.map((item) => item.rowIndex)).toEqual([300, 105, 7]);
  });

  it("deduplicates retained rows already present in the page without redundant row reads", async () => {
    const listPlaceableAppearanceRows = vi.fn().mockResolvedValue(exactPage({
      items: [exactRow(104), exactRow(105)],
      total: 2
    }));
    const result = await loadExistingPlaceableAppearanceCatalog(
      { listPlaceableAppearanceRows },
      "t",
      exactSource(),
      "",
      105
    );
    expect(listPlaceableAppearanceRows).toHaveBeenCalledTimes(1);
    expect(result.items.map((item) => item.rowIndex)).toEqual([104, 105]);
  });

  it("fails closed on invalid request inputs and preserves a typed catalog error", async () => {
    const port = { listPlaceableAppearanceRows: vi.fn() };
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", undefined, ""))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_PROVENANCE_INVALID" });
    await expect(loadExistingPlaceableAppearanceCatalog({} as any, "t", exactSource(), ""))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE" });
    await expect(loadExistingPlaceableAppearanceCatalog(port, "", exactSource(), ""))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE" });
    await expect(loadExistingPlaceableAppearanceCatalog(port, 7 as any, exactSource(), ""))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE" });
    for (const selected of [-1, 104.5, 400]) {
      await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), "", selected))
        .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_INVALID" });
    }
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), "x".repeat(129)))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_INVALID" });
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), "a\0b"))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_INVALID" });
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), 7 as any))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_INVALID" });

    const typed = new PlaceableAppearanceCatalogError("PLACEABLE_APPEARANCE_CATALOG_STALE", "typed");
    port.listPlaceableAppearanceRows.mockRejectedValueOnce(typed);
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), "x".repeat(128)))
      .rejects.toBe(typed);
    port.listPlaceableAppearanceRows.mockRejectedValueOnce(new Error("offline"));
    await expect(loadExistingPlaceableAppearanceCatalog(port, "t", exactSource(), ""))
      .rejects.toMatchObject({ code: "PLACEABLE_APPEARANCE_CATALOG_UNAVAILABLE" });
  });

  it("rejects inconsistent page metadata and every malformed row shape", async () => {
    const invalidPages = [
      exactPage({ resourceName: "appearance.2da" }),
      exactPage({ sha256: "b".repeat(64) }),
      exactPage({ rowCount: 401 }),
      exactPage({ limit: 255 }),
      exactPage({ offset: 1 }),
      exactPage({ total: -1 }),
      exactPage({ total: 1.5 }),
      exactPage({ items: null }),
      exactPage({ items: Array.from({ length: 257 }, (_, rowIndex) => exactRow(rowIndex)) }),
      exactPage({ items: [exactRow(104), exactRow(104)] }),
      exactPage({ items: [null] }),
      exactPage({ items: [{ ...exactRow(104), extra: true }] }),
      exactPage({ items: [{ ...exactRow(104), rowIndex: -1 }] }),
      exactPage({ items: [{ ...exactRow(104), rowIndex: 104.5 }] }),
      exactPage({ items: [{ ...exactRow(104), rowIndex: 400 }] }),
      exactPage({ items: [{ ...exactRow(104), displayName: 1 }] }),
      exactPage({ items: [{ ...exactRow(104), displayName: "" }] }),
      exactPage({ items: [{ ...exactRow(104), displayName: "x".repeat(1025) }] }),
      exactPage({ items: [{ ...exactRow(104), displayName: "a\0b" }] }),
      exactPage({ items: [{ ...exactRow(104), displaySource: "tlk" }] }),
      exactPage({ items: [{ ...exactRow(104), strRef: -1 }] }),
      exactPage({ items: [{ ...exactRow(104), strRef: 4_294_967_296 }] }),
      exactPage({ items: [{ ...exactRow(104), label: 1 }] }),
      exactPage({ items: [{ ...exactRow(104), label: "" }] }),
      exactPage({ items: [{ ...exactRow(104), label: "x".repeat(257) }] }),
      exactPage({ items: [{ ...exactRow(104), label: "a\0b" }] })
    ];
    for (const page of invalidPages) {
      await expect(loadExistingPlaceableAppearanceCatalog(
        { listPlaceableAppearanceRows: vi.fn().mockResolvedValue(page) },
        "t",
        exactSource(),
        ""
      )).rejects.toBeInstanceOf(PlaceableAppearanceCatalogError);
    }

    const validBoundaryRows = [
      { rowIndex: 0, displayName: "x", displaySource: "label" as const, strRef: 0, label: "x" },
      {
        rowIndex: 399,
        displayName: "x".repeat(1024),
        displaySource: "strref" as const,
        strRef: 4_294_967_295,
        label: "x".repeat(256)
      }
    ];
    for (const row of validBoundaryRows) {
      expect(isExistingPlaceableAppearanceCatalogAdmitted(exactSource(), {
        ...exactCatalog(),
        items: [row]
      })).toBe(true);
    }
  });

  it("requires exact unfiltered metadata and the requested retained ordinal", async () => {
    const first = exactPage({ items: [], total: 0 });
    for (const retained of [
      { ...exactPage({ items: [exactRow(104)], limit: 1, offset: 104 }), total: 399 },
      exactPage({ items: [], limit: 1, offset: 104 }),
      exactPage({ items: [exactRow(103)], limit: 1, offset: 104 })
    ]) {
      const listPlaceableAppearanceRows = vi.fn()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(retained);
      await expect(loadExistingPlaceableAppearanceCatalog(
        { listPlaceableAppearanceRows }, "t", exactSource(), ""
      )).rejects.toBeInstanceOf(PlaceableAppearanceCatalogError);
    }
  });

  it("accepts a zero-result filter while retaining the native row and avoids re-reading an equal selection", async () => {
    const listPlaceableAppearanceRows = vi.fn()
      .mockResolvedValueOnce(exactPage({ items: [], total: 0 }))
      .mockResolvedValueOnce(exactPage({
        items: [exactRow(104)],
        total: 400,
        limit: 1,
        offset: 104
      }));
    const result = await loadExistingPlaceableAppearanceCatalog(
      { listPlaceableAppearanceRows }, "t", exactSource(), "missing", 104
    );
    expect(result.items.map((item) => item.rowIndex)).toEqual([104]);
    expect(listPlaceableAppearanceRows).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the catalog digest, cardinality, page, or current row is inconsistent", async () => {
    const port = {
      listPlaceableAppearanceRows: vi.fn().mockResolvedValue({
        resourceName: "placeables.2da",
        sha256: "b".repeat(64),
        rowCount: 400,
        items: [],
        total: 0,
        limit: 256,
        offset: 0
      })
    };
    await expect(loadExistingPlaceableAppearanceCatalog(
      port,
      "token",
      exactSource(),
      ""
    )).rejects.toBeInstanceOf(PlaceableAppearanceCatalogError);
  });

  it("reduces and materializes only a row admitted by the exact loaded catalog", () => {
    const catalog = Object.freeze({
      tableSha256: "a".repeat(64),
      rowCount: 400,
      query: "",
      items: Object.freeze([
        Object.freeze({ rowIndex: 104, displayName: "Source", displaySource: "row_index" as const }),
        Object.freeze({ rowIndex: 105, displayName: "Target", displaySource: "label" as const })
      ])
    });
    expect(reduceExistingPlaceableAppearance(exactSource(), 104, 105, catalog)).toBe(105);
    expect(reduceExistingPlaceableAppearance(exactSource(), 104, 106, catalog)).toBe(104);
    expect(reduceExistingPlaceableAppearance({ ...exactSource(), type: "seed" }, 104, 105, catalog))
      .toBe(104);
    expect(reduceExistingPlaceableAppearance(exactSource(), 104, 105, {
      ...catalog,
      tableSha256: "b".repeat(64)
    })).toBe(104);

    expect(materializeExistingPlaceableAppearance(exactSource(), 104, 105, catalog)).toBe(105);
    expect(materializeExistingPlaceableAppearance(exactSource(), undefined, 105, catalog)).toBe(105);
    expect(materializeExistingPlaceableAppearance(exactSource(), 104, 106, catalog)).toBe(104);
    expect(materializeExistingPlaceableAppearance({ ...exactSource(), type: "seed" }, undefined, 105, catalog))
      .toBeUndefined();

    for (const invalidCandidate of [-1, 104.5, 400, "105", undefined, null]) {
      expect(reduceExistingPlaceableAppearance(exactSource(), 104, invalidCandidate, catalog)).toBe(104);
    }
    const zeroCatalog = { ...catalog, rowCount: 1, items: [exactRow(0)] };
    expect(reduceExistingPlaceableAppearance(exactSource(0, 1), 0, 0, zeroCatalog)).toBe(0);
  });

  it("admits only a strict, duplicate-free exact catalog", () => {
    const invalidCatalogs: unknown[] = [
      null,
      { ...exactCatalog(), tableSha256: "b".repeat(64) },
      { ...exactCatalog(), rowCount: 401 },
      { ...exactCatalog(), query: 1 },
      { ...exactCatalog(), query: "x".repeat(129) },
      { ...exactCatalog(), items: [exactRow(400)] },
      { ...exactCatalog(), items: [{ ...exactRow(104), label: 1 }] },
      {
        ...exactCatalog(),
        items: [{
          ...exactRow(104),
          label: { length: 1, includes: () => false }
        }]
      },
      { ...exactCatalog(), items: null },
      { ...exactCatalog(), items: [exactRow(104), exactRow(104)] },
      { ...exactCatalog(), items: [exactRow(104), { ...exactRow(105), displayName: "" }] }
    ];
    for (const catalog of invalidCatalogs) {
      expect(isExistingPlaceableAppearanceCatalogAdmitted(exactSource(), catalog as any)).toBe(false);
    }
    expect(isExistingPlaceableAppearanceCatalogAdmitted(exactSource(), exactCatalog())).toBe(true);
    expect(isExistingPlaceableAppearanceCatalogAdmitted(exactSource(), {
      ...exactCatalog(),
      query: "x".repeat(128)
    })).toBe(true);
    expect(isExistingPlaceableAppearanceCatalogAdmitted(
      { ...exactSource(), type: "seed" },
      exactCatalog()
    )).toBe(false);
  });

  it("builds a presence-sensitive numeric draft from exact target or retained source provenance", () => {
    const object = createNewSceneObject("placeables", 1, 2, 3);
    object.source = exactSource();
    expect(buildPlaceablePropertiesDraft(object).appearanceType).toBe(104);

    object.placeableProperties = {
      plot: false,
      useable: false,
      hasInventory: false,
      appearanceType: 105
    };
    const targetDraft = buildPlaceablePropertiesDraft(object);
    expect(targetDraft.appearanceType).toBe(105);
    expect(arePlaceablePropertiesDraftsEqual(targetDraft, {
      ...targetDraft,
      appearanceType: 106
    })).toBe(false);
    expect(arePlaceablePropertiesDraftsEqual(targetDraft, { ...targetDraft })).toBe(true);
  });
});
