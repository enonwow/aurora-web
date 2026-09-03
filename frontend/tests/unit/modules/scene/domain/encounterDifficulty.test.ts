import { describe, expect, it } from "vitest";
import type {
  SceneEncounterDifficultyCatalog,
  SceneObjectSourceMetadata,
} from "../../../../../src/modules/scene/contracts";
import {
  readEncounterDifficultyBinding,
  readEncounterDifficultyCatalog,
  readEncounterDifficultyCatalogBinding,
  readEncounterDifficultyProvenance,
} from "../../../../../src/modules/scene/domain/encounterDifficulty";

describe("Encounter Difficulty catalog binding", () => {
  const catalog = difficultyCatalog();
  const storage = {
    difficulty: { present: true, nativeType: "int", value: 1 },
    difficultyIndex: { present: true, nativeType: "int", value: 2 },
  } as const;

  it("binds only one complete catalog-coherent native INT pair", () => {
    expect(readEncounterDifficultyBinding(storage, catalog)).toEqual({
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    });
    expect(readEncounterDifficultyBinding({
      ...storage,
      difficulty: { present: false },
    }, catalog)).toBeNull();
    expect(readEncounterDifficultyBinding({
      ...storage,
      difficulty: { present: true, nativeType: "int", value: 2 },
    }, catalog)).toBeNull();
    expect(readEncounterDifficultyBinding(storage, {
      ...catalog,
      rows: catalog.rows.map((row) => row.rowIndex === 2 ? { ...row, rowIndex: 3 } : row),
    })).toBeNull();
  });

  it("admits only exact catalog and provenance payloads", () => {
    expect(readEncounterDifficultyCatalog(catalog)).toEqual(catalog);
    expect(readEncounterDifficultyProvenance({
      expectedValue: { difficulty: 1, difficultyIndex: 2 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    })).not.toBeNull();
    expect(readEncounterDifficultyProvenance({
      expectedValue: { difficulty: 1, difficultyIndex: 5 },
      catalogSha256: "d".repeat(64),
      catalogRowCount: 5,
    })).toBeNull();
  });

  it("rebinds retained provenance only to the same effective catalog row and value", () => {
    const source = {
      type: "aurora_git",
      sourceKind: "encounter",
      sourceIndex: 0,
      encounterDifficulty: {
        expectedValue: { difficulty: 1, difficultyIndex: 2 },
        catalogSha256: "d".repeat(64),
        catalogRowCount: 5,
      },
    } as SceneObjectSourceMetadata;
    expect(readEncounterDifficultyCatalogBinding(source, catalog)).toMatchObject({
      provenance: source.encounterDifficulty,
      catalog,
    });
    expect(readEncounterDifficultyCatalogBinding({
      ...source,
      encounterDifficulty: {
        ...source.encounterDifficulty!,
        catalogSha256: "e".repeat(64),
      },
    }, catalog)).toBeNull();
    expect(readEncounterDifficultyCatalogBinding({
      ...source,
      encounterDifficulty: {
        ...source.encounterDifficulty!,
        expectedValue: { difficulty: 2, difficultyIndex: 2 },
      },
    }, catalog)).toBeNull();
  });
});

function difficultyCatalog(): SceneEncounterDifficultyCatalog {
  const values = [-2, -1, 1, 2, 3] as const;
  return {
    schemaVersion: "area-encounter-difficulty-catalog.v1",
    descriptor: {
      resourceName: "encdifficulty.2da",
      sourceObjectKey: "modules/current/encdifficulty.2da",
      sourceLayer: "module",
      sha256: "d".repeat(64),
      sizeBytes: 256,
      rowCount: values.length,
    },
    rows: values.map((value, rowIndex) => ({
      rowIndex,
      strRef: 1000 + rowIndex,
      value,
      displayName: `Difficulty ${rowIndex}`,
      displaySource: "strref" as const,
    })),
  };
}
