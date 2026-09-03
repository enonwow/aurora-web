import { describe, expect, it } from "vitest";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";
import {
  appendExistingEncounterCreatureListEntry,
  canEditExistingEncounterCreatureSingleSpawn,
  moveExistingEncounterCreatureListEntry,
  removeExistingEncounterCreatureListEntry,
  replaceExistingEncounterCreatureListEntry,
  updateExistingEncounterCreatureSingleSpawn,
} from
  "../../../../../src/modules/layout/application/encounterCreatureSingleSpawnProvenance";

describe("encounterCreatureSingleSpawnProvenance", () => {
  const source: SceneObjectSourceMetadata = {
    type: "aurora_git",
    sourceKind: "encounter",
    encounterCreatureList: { expectedEntries: [
      {
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawnByte: 0,
      },
    ] },
  };
  const current = [
    {
      entryKind: "retained" as const,
      sourceIndex: 0,
      appearance: 388,
      challengeRating: 1,
      resRef: "nw_gnoll001",
      singleSpawn: false,
    },
  ];
  const wolf = {
    entryKind: "effective_blueprint" as const,
    sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1" as const,
    templateId: "cre_wolf_alpha",
    resRef: "nw_wolf001",
    appearance: 225,
    challengeRating: Math.fround(2.5),
    sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
    sourceSizeBytes: 2048,
    sourceSha256: "a".repeat(64),
    singleSpawn: false,
  };

  it("admits only exact retained Encounter provenance", () => {
    expect(canEditExistingEncounterCreatureSingleSpawn(source)).toBe(true);
    expect(canEditExistingEncounterCreatureSingleSpawn({
      ...source,
      sourceKind: "placeable",
    })).toBe(false);
  });

  it("toggles only one existing target flag and never mutates source identity", () => {
    const updated = updateExistingEncounterCreatureSingleSpawn(source, current, 0, true);
    expect(updated).toEqual([{ ...current[0], singleSpawn: true }]);
    expect(current[0]?.singleSpawn).toBe(false);
    expect(source.encounterCreatureList?.expectedEntries[0]?.singleSpawnByte).toBe(0);
  });

  it("adds, replaces, reorders, and removes structural entries", () => {
    const appended = appendExistingEncounterCreatureListEntry(source, current, wolf);
    expect(appended).toEqual([current[0], wolf]);
    const moved = moveExistingEncounterCreatureListEntry(source, appended, 1, -1);
    expect(moved).toEqual([wolf, current[0]]);
    const replacement = { ...wolf, templateId: "cre_wolf_beta", singleSpawn: true };
    const replaced = replaceExistingEncounterCreatureListEntry(
      source,
      moved,
      0,
      replacement,
    );
    expect(replaced).toEqual([replacement, current[0]]);
    expect(removeExistingEncounterCreatureListEntry(source, replaced, 1))
      .toEqual([replacement]);
    expect(removeExistingEncounterCreatureListEntry(source, [replacement], 0))
      .toEqual([]);
  });

  it("keeps preserve-only or out-of-range edits unchanged", () => {
    const preserveOnly = { type: "aurora_git", sourceKind: "encounter" } as const;
    expect(updateExistingEncounterCreatureSingleSpawn(preserveOnly, current, 0, true))
      .toBe(current);
    expect(updateExistingEncounterCreatureSingleSpawn(source, current, 1, true))
      .toBe(current);
  });
});
