import { describe, expect, it, vi } from "vitest";
import {
  loadExistingCreatureSoundSetCatalog,
  materializeExistingCreatureSoundSetFile,
  readExistingCreatureSoundSetProvenance,
  resolveCreatureSoundSetDisplayName,
} from "../../../../../src/modules/layout/application/creatureSoundSetProvenance";

function exactSource() {
  return {
    type: "aurora_git" as const,
    sourceKind: "creature" as const,
    sourceIndex: 0,
    creatureSoundSetFile: {
      present: true as const,
      nativeType: "word" as const,
      value: 0,
      table: {
        resourceName: "soundset.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 336_678,
        rowCount: 5_100,
        rowIndex: 0,
        resRef: "c_aasimar",
      },
    },
  };
}

const rows = [
  {
    rowIndex: 0,
    displayName: "Aasimar",
    displaySource: "strref" as const,
    nameStrRef: 8291,
    resRef: "c_aasimar",
  },
  {
    rowIndex: 27,
    displayName: "Custom Dragon",
    displaySource: "label" as const,
    nameStrRef: null,
    resRef: "c_dragon",
  },
];

describe("existing Creature SoundSetFile provenance", () => {
  it("loads and admits only sparse rows from the exact effective soundset.2da", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "soundset.2da",
        sha256: "a".repeat(64),
        rowCount: 5_100,
        items: [rows[1]],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "soundset.2da",
        sha256: "a".repeat(64),
        rowCount: 5_100,
        items: [rows[0]],
        total: 1,
        limit: 1,
        offset: 0,
      });
    const catalog = await loadExistingCreatureSoundSetCatalog(
      { queries: { listRows } }, "token", exactSource(), " dragon ", 27,
    );

    expect(readExistingCreatureSoundSetProvenance(exactSource())).toEqual({
      tableSha256: "a".repeat(64),
      rowCount: 5_100,
      sourceRowIndex: 0,
    });
    expect(materializeExistingCreatureSoundSetFile(exactSource(), 0, 27, catalog)).toBe(27);
    expect(materializeExistingCreatureSoundSetFile(exactSource(), 0, 3, catalog)).toBe(0);
    expect(resolveCreatureSoundSetDisplayName(27, catalog, "Aasimar")).toBe("Custom Dragon");
    expect(catalog.items.map((row) => row.rowIndex)).toEqual([0, 27]);
    expect(listRows).toHaveBeenNthCalledWith(1, "token", {
      tableSha256: "a".repeat(64),
      query: "dragon",
      limit: 100,
      offset: 0,
    });
  });

  it("rejects a duplicate or malformed catalog before applying a candidate", () => {
    const duplicateCatalog = {
      tableSha256: "a".repeat(64),
      rowCount: 5_100,
      query: "",
      items: [rows[0]!, rows[0]!],
    };
    expect(materializeExistingCreatureSoundSetFile(
      exactSource(), 0, 27, duplicateCatalog,
    )).toBe(0);
  });

  it("fails closed when the retained sparse row is absent", async () => {
    const listRows = vi.fn()
      .mockResolvedValueOnce({
        resourceName: "soundset.2da",
        sha256: "a".repeat(64),
        rowCount: 5_100,
        items: [rows[1]],
        total: 1,
        limit: 100,
        offset: 0,
      })
      .mockResolvedValueOnce({
        resourceName: "soundset.2da",
        sha256: "a".repeat(64),
        rowCount: 5_100,
        items: [],
        total: 0,
        limit: 1,
        offset: 0,
      });
    await expect(loadExistingCreatureSoundSetCatalog(
      { queries: { listRows } }, "token", exactSource(), "",
    )).rejects.toMatchObject({ code: "CREATURE_SOUND_SET_CATALOG_STALE" });
  });
});
