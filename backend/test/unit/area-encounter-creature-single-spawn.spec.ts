import {
  AreaEncounterCreatureSingleSpawnValidationError,
  areaEncounterCreatureListEntriesEqual,
  parseAreaEncounterCreatureListMutation,
  parseAreaEncounterCreatureListProvenance,
  parseAreaEncounterCreatureListTargetEntries,
  projectAreaEncounterCreatureListMutation,
} from "../../src/modules/areas/domain/area-encounter-creature-single-spawn";

describe("Area Encounter CreatureList SingleSpawn domain", () => {
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
  const catalogBlueprint = {
    entryKind: "effective_blueprint" as const,
    sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1",
    templateId: "cre_wolf_alpha",
    resRef: "nw_wolf001",
    appearance: 225,
    challengeRating: Math.fround(2.5),
    sourceObjectKey: "module/catalog/creatures/nw_wolf001.utc",
    sourceSizeBytes: 4096,
    sourceSha256: "a".repeat(64),
    singleSpawn: false,
  };

  it("admits the exact ordered immutable identity and boolean target", () => {
    expect(parseAreaEncounterCreatureListProvenance({ expectedEntries }))
      .toEqual({ expectedEntries });
    expect(parseAreaEncounterCreatureListTargetEntries([
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: false },
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
    ])).toEqual([
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: false },
      { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
    ]);
  });

  it("projects only changed SingleSpawn bytes while retaining complete identity", () => {
    const mutation = projectAreaEncounterCreatureListMutation(
      { expectedEntries },
      [
        { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: true },
        { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
      ],
    );
    expect(mutation).toEqual({
      expectedEntries,
      entries: [
        { ...expectedEntries[0], singleSpawnByte: 1 },
        expectedEntries[1],
      ],
    });
    expect(parseAreaEncounterCreatureListMutation(mutation)).toEqual(mutation);
    expect(areaEncounterCreatureListEntriesEqual(
      expectedEntries,
      mutation.entries,
    )).toBe(false);
  });

  it("returns undefined for an unchanged target", () => {
    expect(projectAreaEncounterCreatureListMutation(
      { expectedEntries },
      [
        { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: false },
        { appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true },
      ],
    )).toBeUndefined();
  });

  it("projects add, remove, reorder, replacement and duplicate blueprint selection", () => {
    const mutation = projectAreaEncounterCreatureListMutation(
      { expectedEntries },
      [
        {
          entryKind: "retained",
          sourceIndex: 1,
          appearance: 389,
          challengeRating: Math.fround(3),
          resRef: "nw_gnoll002",
          singleSpawn: false,
        },
        catalogBlueprint,
        { ...catalogBlueprint, singleSpawn: true },
      ],
    );
    expect(mutation).toEqual({
      expectedEntries,
      entries: [
        {
          entryKind: "retained",
          sourceIndex: 1,
          appearance: 389,
          challengeRating: 3,
          resRef: "nw_gnoll002",
          singleSpawn: false,
        },
        catalogBlueprint,
        { ...catalogBlueprint, singleSpawn: true },
      ],
    });
    expect(parseAreaEncounterCreatureListMutation(mutation)).toEqual(mutation);
  });

  it("admits a complete empty target and treats canonical retained projection as unchanged", () => {
    expect(projectAreaEncounterCreatureListMutation({ expectedEntries }, []))
      .toEqual({ expectedEntries, entries: [] });
    expect(projectAreaEncounterCreatureListMutation(
      { expectedEntries },
      expectedEntries.map((entry) => ({
        entryKind: "retained" as const,
        sourceIndex: entry.sourceIndex,
        appearance: entry.appearance,
        challengeRating: entry.challengeRating,
        resRef: entry.resRef,
        singleSpawn: entry.singleSpawnByte === 1,
      })),
    )).toBeUndefined();
  });

  it.each([
    [
      "duplicate retained source index",
      [
        {
          entryKind: "retained",
          sourceIndex: 0,
          appearance: 388,
          challengeRating: 1,
          resRef: "nw_gnoll001",
          singleSpawn: false,
        },
        {
          entryKind: "retained",
          sourceIndex: 0,
          appearance: 388,
          challengeRating: 1,
          resRef: "nw_gnoll001",
          singleSpawn: true,
        },
      ],
    ],
    ["retained identity drift", [{
      entryKind: "retained",
      sourceIndex: 0,
      appearance: 389,
      challengeRating: 1,
      resRef: "nw_gnoll001",
      singleSpawn: false,
    }]],
    ["unbound structural tuple", [{
      entryKind: "effective_blueprint",
      ...catalogBlueprint,
      sourceSha256: "not-a-sha",
    }]],
    ["mixed legacy and structural entries", [
      { appearance: 388, challengeRating: 1, resRef: "nw_gnoll001", singleSpawn: false },
      catalogBlueprint,
    ]],
  ])("rejects %s", (_label, target) => {
    expect(() => projectAreaEncounterCreatureListMutation({ expectedEntries }, target))
      .toThrow(AreaEncounterCreatureSingleSpawnValidationError);
  });

  it.each([
    { expectedEntries: [{ ...expectedEntries[0], sourceIndex: 1 }] },
    { expectedEntries: [{ ...expectedEntries[0], challengeRating: 0.1 }] },
    { expectedEntries: [{ ...expectedEntries[0], resRef: "bad-resref" }] },
    { expectedEntries: [{ ...expectedEntries[0], singleSpawnByte: 2 }] },
    { expectedEntries, extra: true },
  ])("rejects malformed provenance %#", (value) => {
    expect(() => parseAreaEncounterCreatureListProvenance(value))
      .toThrow(AreaEncounterCreatureSingleSpawnValidationError);
  });

  it("rejects structural target changes and unchanged wire mutations", () => {
    expect(() => projectAreaEncounterCreatureListMutation(
      { expectedEntries },
      [{ appearance: 389, challengeRating: 3, resRef: "nw_gnoll002", singleSpawn: true }],
    )).toThrow(/identity|length/u);
    expect(() => parseAreaEncounterCreatureListMutation({
      expectedEntries,
      entries: expectedEntries,
    })).toThrow(/unchanged/u);
  });
});
