import { describe, expect, it } from "vitest";
import {
  encounterCreatureListEntriesEqual,
  encounterCreatureListIdentityMatches,
  encounterCreatureListTargetEntriesEqual,
  normalizeEncounterCreatureListTargetEntries,
  projectEncounterCreatureListSourceEntries,
  readEncounterCreatureBlueprintTargetEntry,
  readEncounterCreatureListProvenance,
  readEncounterCreatureListTargetEntries,
} from "../../../../../src/modules/scene/domain/encounterCreatureSingleSpawn";
import type { SceneObject } from "../../../../../src/modules/scene/contracts";

describe("encounterCreatureSingleSpawn", () => {
  const expectedEntries = [
    {
      sourceIndex: 0,
      appearance: 388,
      challengeRating: Math.fround(1),
      resRef: "nw_gnoll001",
      singleSpawnByte: 0 as const,
    },
    {
      sourceIndex: 1,
      appearance: 389,
      challengeRating: Math.fround(3),
      resRef: "nw_gnoll002",
      singleSpawnByte: 1 as const,
    },
  ];

  it("reads exact immutable provenance and a complete boolean target", () => {
    expect(readEncounterCreatureListProvenance({ expectedEntries }))
      .toEqual({ expectedEntries });
    const target = [
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: false },
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
    ];
    expect(readEncounterCreatureListTargetEntries(target)).toEqual(target);
    expect(encounterCreatureListEntriesEqual(expectedEntries, target)).toBe(true);
  });

  it("reads structural retained/blueprint entries and preserves physical target order", () => {
    const blueprint = {
      entryKind: "effective_blueprint" as const,
      sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1" as const,
      templateId: "cre_wolf_alpha",
      resRef: "nw_wolf001",
      appearance: 225,
      challengeRating: Math.fround(2.5),
      sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
      sourceSizeBytes: 2048,
      sourceSha256: "a".repeat(64),
      singleSpawn: true,
    };
    const target = [
      {
        entryKind: "retained" as const,
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: false,
      },
      blueprint,
    ];

    expect(readEncounterCreatureListTargetEntries(target)).toEqual(target);
    expect(encounterCreatureListIdentityMatches(expectedEntries, target)).toBe(true);
    expect(encounterCreatureListEntriesEqual(expectedEntries, target)).toBe(false);
    expect(encounterCreatureListTargetEntriesEqual(target, target)).toBe(true);
  });

  it("migrates a legacy target to source-index-bound retained entries", () => {
    const legacy = [
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: true },
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: false },
    ];
    expect(normalizeEncounterCreatureListTargetEntries(expectedEntries, legacy)).toEqual([
      {
        entryKind: "retained",
        sourceIndex: 0,
        appearance: 388,
        challengeRating: 1,
        resRef: "nw_gnoll001",
        singleSpawn: true,
      },
      {
        entryKind: "retained",
        sourceIndex: 1,
        appearance: 389,
        challengeRating: 3,
        resRef: "nw_gnoll002",
        singleSpawn: false,
      },
    ]);
    expect(projectEncounterCreatureListSourceEntries(expectedEntries)[0]).toMatchObject({
      entryKind: "retained",
      sourceIndex: 0,
      singleSpawn: false,
    });
    expect(encounterCreatureListIdentityMatches(expectedEntries, [])).toBe(true);
    expect(normalizeEncounterCreatureListTargetEntries(expectedEntries, [])).toEqual([]);
  });

  it("derives an immutable effective UTC binding from one admitted creature catalog object", () => {
    const object = {
      id: "cre_template_cre_wolf_alpha",
      kind: "creatures",
      name: "Wolf",
      resRef: "nw_wolf001",
      tag: "NW_WOLF001",
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1, offsetX: 0, offsetY: 0, offsetZ: 0,
        pitch: 0, yaw: 0, roll: 0,
      },
      source: {
        type: "aurora_git",
        sourceKind: "creature",
        templateId: "cre_wolf_alpha",
        sourceFileType: "UTC ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
        creatureMetadata: {
          templateResRef: "nw_wolf001",
          appearanceId: 225,
          challengeRating: Math.fround(2.5),
          sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
          sourceSizeBytes: 2048,
          sourceSha256: "a".repeat(64),
        },
      },
    } satisfies SceneObject;

    expect(readEncounterCreatureBlueprintTargetEntry(object)).toEqual({
      entryKind: "effective_blueprint",
      sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
      templateId: "cre_wolf_alpha",
      resRef: "nw_wolf001",
      appearance: 225,
      challengeRating: 2.5,
      sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
      sourceSizeBytes: 2048,
      sourceSha256: "a".repeat(64),
      singleSpawn: false,
    });
    expect(readEncounterCreatureBlueprintTargetEntry({
      ...object,
      source: { ...object.source!, sourceFileType: "UTP " },
    })).toBeNull();
  });

  it("rejects mixed legacy/structural and duplicate retained references", () => {
    const retained = {
      entryKind: "retained",
      sourceIndex: 0,
      appearance: 388,
      challengeRating: 1,
      resRef: "nw_gnoll001",
      singleSpawn: false,
    };
    expect(readEncounterCreatureListTargetEntries([
      retained,
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
    ])).toBeNull();
    expect(readEncounterCreatureListTargetEntries([retained, retained])).toBeNull();
  });

  it.each([
    { expectedEntries: [{ ...expectedEntries[0], sourceIndex: 1 }] },
    { expectedEntries: [{ ...expectedEntries[0], challengeRating: 0.1 }] },
    { expectedEntries: [{ ...expectedEntries[0], resRef: "bad-resref" }] },
    { expectedEntries: [], extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(readEncounterCreatureListProvenance(value)).toBeNull();
  });
});
