import {
  bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity,
  bindEffectiveCreatureClassSpellsTwoDaToCreatureClassIdentity,
  readAreaCreatureClassIdentityState,
  readExistingAreaCreatureClassIdentityMutation,
} from "../../src/modules/areas/domain/area-creature-class-identity";

describe("Existing Area Creature same-roster class identity clear", () => {
  const graphSha256 = "a".repeat(64);
  const storage = {
    present: true as const,
    nativeType: "list" as const,
    structTypeId: 2 as const,
    classNativeType: "int" as const,
    levelNativeType: "short" as const,
    classListGraphSha256: graphSha256,
    entries: [
      {
        classId: 1,
        level: 3,
        opaqueSiblingFieldCount: 1,
        canonicalSpellListFieldCount: 2,
        spellEntryCount: 3,
      },
      {
        classId: 9,
        level: 2,
        opaqueSiblingFieldCount: 0,
        canonicalSpellListFieldCount: 0,
        spellEntryCount: 0,
      },
    ],
  };

  it("accepts exact complete-graph provenance and binds one immutable class table", () => {
    expect(readAreaCreatureClassIdentityState(storage)).toEqual(storage);
    const bound = bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity(storage, {
      descriptor: {
        resourceName: "classes.2da",
        sourceObjectKey: "module/classes.2da",
        sourceLayer: "module",
        sha256: "b".repeat(64),
        sizeBytes: 100,
        rowCount: 12,
      },
      rows: [
        { rowIndex: 1, displayName: "Wizard", displaySource: "strref", nameStrRef: 10 },
        { rowIndex: 9, displayName: "Sorcerer", displaySource: "strref", nameStrRef: 11 },
      ],
    });
    expect(bound).toMatchObject({ present: true, classesTable: { rowCount: 12 } });
  });

  it("binds spells provenance only when it matches the bound classes source", () => {
    const classesBound = bindEffectiveCreatureClassesTwoDaToCreatureClassIdentity(storage, {
      descriptor: {
        resourceName: "classes.2da", sourceObjectKey: "module/classes.2da",
        sourceLayer: "module", sha256: "b".repeat(64), sizeBytes: 100, rowCount: 12,
      },
      rows: [
        { rowIndex: 1, displayName: "Bard", displaySource: "strref", nameStrRef: 10 },
        { rowIndex: 9, displayName: "Sorcerer", displaySource: "strref", nameStrRef: 11 },
      ],
    });
    const bound = bindEffectiveCreatureClassSpellsTwoDaToCreatureClassIdentity(
      classesBound,
      {
        descriptor: {
          resourceName: "spells.2da", sourceObjectKey: "module/spells.2da",
          sourceLayer: "module", sha256: "c".repeat(64), sizeBytes: 200, rowCount: 100,
        },
        classesDescriptor: {
          resourceName: "classes.2da", sourceObjectKey: "module/classes.2da",
          sourceLayer: "module", sha256: "b".repeat(64), sizeBytes: 100, rowCount: 12,
        },
        rows: [],
      },
    );
    expect(bound).toMatchObject({
      present: true,
      classesTable: { sha256: "b".repeat(64) },
      spellsTable: { sha256: "c".repeat(64), rowCount: 100 },
    });
    expect(readAreaCreatureClassIdentityState(bound)).toEqual(bound);
  });

  it.each([
    { ...storage, classListGraphSha256: "A".repeat(64) },
    { ...storage, entries: [] },
    { ...storage, entries: [{ ...storage.entries[0], classId: -1 }] },
    { ...storage, entries: [{ ...storage.entries[0], level: 61 }] },
    { ...storage, entries: [{ ...storage.entries[0], canonicalSpellListFieldCount: 29 }] },
    { ...storage, entries: [{ ...storage.entries[0], spellEntryCount: -1 }] },
    { ...storage, extra: true },
  ])("rejects ambiguous or malformed provenance %#", (candidate) => {
    expect(readAreaCreatureClassIdentityState(candidate)).toBeNull();
  });

  it("accepts one atomic same-roster identity and level change with destructive clear", () => {
    const mutation = {
      expectedClassIds: [1, 9],
      classIds: [2, 9],
      expectedLevels: [3, 2],
      levels: [4, 2],
      classListGraphSha256: graphSha256,
      destructiveSpellClearConfirmed: true,
      expectedStartingPackage: 4,
      startingPackage: 7,
      classesTableSha256: "b".repeat(64),
      classesRowCount: 12,
      packagesTableSha256: "c".repeat(64),
      packagesRowCount: 20,
    };
    expect(readExistingAreaCreatureClassIdentityMutation(mutation)).toEqual(mutation);
  });

  it.each([
    { expectedClassIds: [1], classIds: [1], expectedLevels: [3], levels: [4] },
    { expectedClassIds: [1], classIds: [2, 3], expectedLevels: [3], levels: [4] },
    { expectedClassIds: [1], classIds: [2], expectedLevels: [3], levels: [4], destructiveSpellClearConfirmed: false },
    { expectedClassIds: [1], classIds: [20], expectedLevels: [3], levels: [4] },
    { expectedClassIds: [1], classIds: [2], expectedLevels: [3], levels: [61] },
  ])("rejects an unsafe mutation %#", (overrides) => {
    expect(readExistingAreaCreatureClassIdentityMutation({
      expectedClassIds: [1],
      classIds: [2],
      expectedLevels: [3],
      levels: [3],
      classListGraphSha256: graphSha256,
      destructiveSpellClearConfirmed: true,
      expectedStartingPackage: 4,
      startingPackage: 7,
      classesTableSha256: "b".repeat(64),
      classesRowCount: 12,
      packagesTableSha256: "c".repeat(64),
      packagesRowCount: 20,
      ...overrides,
    })).toBeNull();
  });
});
