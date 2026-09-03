import { AreaUpdateCandidateCompiler } from
  "../../src/modules/areas/application/area-update-candidate.compiler";
import type { ExistingAreaObjectPropertyMutation } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-object-pair-writer";

type CatalogBoundaryName =
  | "validateCreatureSoundSetFileMutations"
  | "validateCreatureStartingPackageMutations"
  | "validateCreatureSkillListMutations"
  | "validateCreatureSpecialAbilityListMutations"
  | "validateCreatureHitPointMutations";

describe("AreaUpdateCandidateCompiler Creature catalog-property wiring", () => {
  it("routes SoundSetFile, StartingPackage, SkillList, and HP through exact effective tables", async () => {
    const catalog = createCatalog();
    const compiler = new AreaUpdateCandidateCompiler({ appearanceCatalog: catalog } as never);

    await expect(invoke(compiler, "validateCreatureSoundSetFileMutations", [soundSetMutation()]))
      .resolves.toBeUndefined();
    await expect(invoke(compiler, "validateCreatureStartingPackageMutations", [packageMutation()]))
      .resolves.toBeUndefined();
    await expect(invoke(compiler, "validateCreatureSkillListMutations", [skillMutation()]))
      .resolves.toBeUndefined();
    await expect(invoke(
      compiler,
      "validateCreatureSpecialAbilityListMutations",
      [specialAbilityMutation()],
    )).resolves.toBeUndefined();
    await expect(invoke(compiler, "validateCreatureHitPointMutations", [hitPointMutation()]))
      .resolves.toBeUndefined();

    expect(catalog.resolveEffectiveCreatureSoundSetsTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureStartingPackagesTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureSkillsTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureSpecialAbilitiesTwoDaTable).toHaveBeenCalledTimes(1);
    expect(catalog.resolveEffectiveCreatureRacialTypesTwoDaTable).toHaveBeenCalledTimes(1);
  });
});

function invoke(
  compiler: AreaUpdateCandidateCompiler,
  boundary: CatalogBoundaryName,
  mutations: readonly ExistingAreaObjectPropertyMutation[],
): Promise<void> {
  const callable = compiler as unknown as Record<
    CatalogBoundaryName,
    (value: readonly ExistingAreaObjectPropertyMutation[]) => Promise<void>
  >;
  return callable[boundary].call(compiler, mutations);
}

function createCatalog() {
  return {
    resolveEffectiveCreatureSoundSetsTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "soundset.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
        sourceLayer: "vanilla" as const,
        sha256: "a".repeat(64),
        sizeBytes: 336_678,
        rowCount: 5_100,
      },
      rows: [{
        rowIndex: 27,
        displayName: "Voice 27",
        displaySource: "strref_id" as const,
        nameStrRef: 8_027,
        resRef: "voice_27",
      }],
    })),
    resolveEffectiveCreatureStartingPackagesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "packages.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 30_510,
        rowCount: 132,
      },
      rows: [
        { rowIndex: 0, classId: 4 },
        { rowIndex: 2, classId: 4 },
      ].map((row) => ({
        ...row,
        displayName: `Package ${row.rowIndex}`,
        displaySource: "label" as const,
        nameStrRef: null,
      })),
    })),
    resolveEffectiveCreatureSkillsTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "skills.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
        sourceLayer: "vanilla" as const,
        sha256: "c".repeat(64),
        sizeBytes: 12_345,
        rowCount: 3,
      },
      rows: [],
    })),
    resolveEffectiveCreatureSpecialAbilitiesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "spells.2da" as const,
        sourceObjectKey: "runtime-source/vanilla/nwn_base.key/spells.2da",
        sourceLayer: "vanilla" as const,
        sha256: "e".repeat(64),
        sizeBytes: 456_789,
        rowCount: 100,
      },
      rows: [{
        rowIndex: 2,
        nameStrRef: 8_002,
        userType: 1 as const,
        displayName: "Acid Fog",
        displaySource: "strref" as const,
      }],
    })),
    resolveEffectiveCreatureRacialTypesTwoDaTable: jest.fn(async () => ({
      descriptor: {
        resourceName: "racialtypes.2da" as const,
        sourceObjectKey: "module/racialtypes.2da",
        sourceLayer: "module" as const,
        sha256: "a".repeat(64),
        sizeBytes: 100,
        rowCount: 5,
      },
      rows: [{ rowIndex: 1, constitutionAdjust: 2 }],
    })),
  };
}

function soundSetMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    soundSetFile: {
      expectedValue: 0,
      value: 27,
      tableSha256: "a".repeat(64),
      rowCount: 5_100,
    },
  };
}

function packageMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    startingPackage: {
      expectedValue: 0,
      value: 2,
      expectedClassIds: [4],
      tableSha256: "c".repeat(64),
      rowCount: 132,
    },
  };
}

function skillMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    skillList: {
      expectedRanks: [4, 0],
      ranks: [7, 0, 2],
      tableSha256: "c".repeat(64),
      rowCount: 3,
      resizeMode: "expand_zero_tail",
      confirmTruncation: false,
    },
  };
}

function hitPointMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    hitPoints: {
      expectedHitPoints: 10,
      expectedCurrentHitPoints: 7,
      expectedMaxHitPoints: 99,
      hitPoints: 10,
      currentHitPoints: 4,
      maxHitPoints: 31,
      expectedConstitution: 14,
      constitution: 14,
      race: 1,
      classLevels: [3, 2],
      targetClassLevels: [4, 3],
      featRow40Present: false,
      racialConstitutionAdjust: 2,
      racialTypesSha256: "a".repeat(64),
      racialTypesRowCount: 5,
    },
  };
}

function specialAbilityMutation(): ExistingAreaObjectPropertyMutation {
  return {
    kind: "creature",
    sourceIndex: 0,
    specialAbilityList: {
      expectedEntries: [{ spellId: 2, uses: 2, casterLevel: 3 }],
      entries: [{ spellId: 2, uses: 3, casterLevel: 5 }],
      tableSha256: "e".repeat(64),
      rowCount: 100,
    },
  };
}
