import { describe, expect, it } from "vitest";
import {
  admittedCreaturePortraitRows,
  canEditExistingCreaturePortrait,
  readCreaturePortraitCatalog,
  readCreaturePortraitStorage,
} from "../../../../../src/modules/scene/domain/creaturePortrait";

const descriptor = {
  resourceName: "portraits.2da" as const,
  sourceObjectKey: "runtime-source/vanilla/nwn_base.key/portraits.2da",
  sourceLayer: "vanilla" as const,
  sha256: "a".repeat(64),
  sizeBytes: 100_000,
  rowCount: 16_001,
};

const catalog = {
  descriptor,
  rows: [
    { rowIndex: 10, baseResRef: "po_hm_guard", sex: 0, race: 6, plot: 0 as const },
    { rowIndex: 11, baseResRef: "po_em_guard", sex: 0, race: 1, plot: 0 as const },
    { rowIndex: 12, baseResRef: "po_hf_guard", sex: 1, race: 6, plot: 0 as const },
    { rowIndex: 13, baseResRef: "po_npc_other", sex: 4, race: 7, plot: 0 as const },
  ],
};

const source = {
  type: "aurora_git" as const,
  sourceKind: "creature" as const,
  sourceIndex: 0,
  creaturePortrait: {
    present: true as const,
    nativeType: "word" as const,
    value: 10,
    selectorContext: { genderValue: 0, raceValue: 4 },
    table: { ...descriptor, rowIndex: 10, baseResRef: "po_hm_guard" },
  },
};

describe("Creature PortraitId provenance", () => {
  it("reads exact storage and filters physical rows with the Toolset Race 4 rule", () => {
    expect(readCreaturePortraitStorage(source.creaturePortrait)).toEqual(
      source.creaturePortrait,
    );
    expect(readCreaturePortraitCatalog(catalog)).toEqual(catalog);
    expect(admittedCreaturePortraitRows(source, catalog).map((row) => row.rowIndex))
      .toEqual([10, 11]);
    expect(canEditExistingCreaturePortrait(source, catalog)).toBe(true);

    const npcSource = {
      ...source,
      creaturePortrait: {
        ...source.creaturePortrait,
        value: 13,
        selectorContext: { genderValue: 0, raceValue: 7 },
        table: { ...source.creaturePortrait.table, rowIndex: 13, baseResRef: "po_npc_other" },
      },
    };
    expect(admittedCreaturePortraitRows(npcSource, catalog).map((row) => row.rowIndex))
      .toEqual([13]);
  });

  it("fails closed on stale identity, plot rows, and malformed table bindings", () => {
    expect(admittedCreaturePortraitRows(source, {
      ...catalog,
      descriptor: { ...descriptor, sha256: "b".repeat(64) },
    })).toEqual([]);
    expect(readCreaturePortraitCatalog({
      ...catalog,
      rows: [{ ...catalog.rows[0], plot: 1 }],
    })).toBeNull();
    expect(readCreaturePortraitStorage({
      ...source.creaturePortrait,
      table: { ...source.creaturePortrait.table, rowIndex: 11 },
    })).toBeNull();
  });

  it("does not authorize a loose or legacy portrait ResRef", () => {
    expect(canEditExistingCreaturePortrait({
      type: "aurora_git",
      sourceKind: "creature",
      sourceIndex: 0,
      creaturePortrait: { present: false },
    }, catalog)).toBe(false);
    expect(readCreaturePortraitStorage({
      present: true,
      nativeType: "resref",
      value: "po_hm_guard",
    })).toBeNull();
  });
});
