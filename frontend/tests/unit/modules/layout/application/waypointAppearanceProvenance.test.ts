import { describe, expect, it, vi } from "vitest";

import {
  WaypointAppearanceCatalogError,
  canEditExistingWaypointAppearance,
  isExistingWaypointAppearanceCatalogAdmitted,
  loadExistingWaypointAppearanceCatalog,
  materializeExistingWaypointAppearance,
  readExistingWaypointAppearanceProvenance,
  reduceExistingWaypointAppearance,
} from "../../../../../src/modules/layout/application/waypointAppearanceProvenance";

const digest = "a".repeat(64);
const exactSource = {
  type: "aurora_git" as const,
  sourceKind: "waypoint" as const,
  sourceIndex: 0,
  waypointAppearance: {
    present: true as const,
    nativeType: "byte" as const,
    value: 1,
    table: {
      resourceName: "waypoint.2da" as const,
      sourceObjectKey: "vanilla:waypoint.2da",
      sourceLayer: "vanilla" as const,
      sha256: digest,
      sizeBytes: 321,
      rowCount: 5,
      rowIndex: 1,
    },
  },
};
const items = [
  {
    rowIndex: 1,
    modelResRef: "wpt_blue",
    strRef: 123,
    label: "blue",
    displayName: "Blue Waypoint",
    displaySource: "strref" as const,
  },
  {
    rowIndex: 4,
    modelResRef: "wpt_yellow",
    strRef: 126,
    label: "yellow",
    displayName: "Yellow Waypoint",
    displaySource: "strref" as const,
  },
];
const catalog = { tableSha256: digest, rowCount: 5, items };

describe("retained Waypoint Appearance provenance", () => {
  it("admits only the exact canonical Byte and waypoint.2da identity", () => {
    expect(readExistingWaypointAppearanceProvenance(exactSource)).toEqual({
      tableSha256: digest,
      rowCount: 5,
      sourceRowIndex: 1,
    });
    expect(canEditExistingWaypointAppearance(exactSource)).toBe(true);
    expect(canEditExistingWaypointAppearance({
      ...exactSource,
      waypointAppearance: {
        ...exactSource.waypointAppearance,
        nativeType: "word",
      },
    })).toBe(false);
    expect(canEditExistingWaypointAppearance({
      ...exactSource,
      waypointAppearance: {
        ...exactSource.waypointAppearance,
        table: { ...exactSource.waypointAppearance.table, rowIndex: 4 },
      },
    })).toBe(false);
  });

  it("loads one digest-bound complete selector page and rejects stale identity", async () => {
    const listWaypointAppearanceRows = vi.fn(async () => ({
      resourceName: "waypoint.2da" as const,
      sha256: digest,
      rowCount: 5,
      items,
      total: 2,
      limit: 256,
      offset: 0,
    }));
    const loaded = await loadExistingWaypointAppearanceCatalog(
      { listWaypointAppearanceRows },
      "token",
      exactSource,
    );
    expect(listWaypointAppearanceRows).toHaveBeenCalledWith("token", {
      tableSha256: digest,
      limit: 256,
      offset: 0,
    });
    expect(loaded).toEqual(catalog);
    expect(isExistingWaypointAppearanceCatalogAdmitted(exactSource, loaded)).toBe(true);

    await expect(loadExistingWaypointAppearanceCatalog({
      listWaypointAppearanceRows: async () => ({
        resourceName: "waypoint.2da",
        sha256: "b".repeat(64),
        rowCount: 5,
        items,
        total: 2,
        limit: 256,
        offset: 0,
      }),
    }, "token", exactSource)).rejects.toMatchObject<WaypointAppearanceCatalogError>({
      code: "WAYPOINT_APPEARANCE_CATALOG_STALE",
    });
  });

  it("reduces and materializes only rows admitted by the current catalog", () => {
    expect(reduceExistingWaypointAppearance(exactSource, 1, 4, catalog)).toBe(4);
    expect(reduceExistingWaypointAppearance(exactSource, 1, 2, catalog)).toBe(1);
    expect(materializeExistingWaypointAppearance(exactSource, 1, 4, catalog)).toBe(4);
    expect(materializeExistingWaypointAppearance(
      exactSource,
      1,
      4,
      { ...catalog, tableSha256: "b".repeat(64) },
    )).toBe(1);
  });
});
