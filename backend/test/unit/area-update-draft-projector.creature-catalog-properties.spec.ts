import { projectAreaUpdateDraft } from
  "../../src/modules/areas/domain/area-update-draft-projector";
import type { AreaDraftSnapshot } from
  "../../src/modules/areas/domain/area-draft.types";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
  exactCreatureHitPointState,
  retainedCreatureSceneObject,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update draft projector Creature catalog properties", () => {
  it("projects an exact soundset.2da-bound SoundSetFile Word", () => {
    const value = withCreature({
      source: {
        creatureSoundSetFile: {
          present: true,
          nativeType: "word",
          value: 0,
          table: {
            resourceName: "soundset.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/soundset.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 336_678,
            rowCount: 5_100,
            rowIndex: 0,
            resRef: "c_aasimar",
          },
        },
      },
      creatureProperties: { advancedSettings: { soundSetFile: 27 } },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      soundSetFile: {
        expectedValue: 0,
        value: 27,
        tableSha256: "a".repeat(64),
        rowCount: 5_100,
      },
    }]);
  });

  it("projects an exact packages.2da- and ClassList-bound StartingPackage Byte", () => {
    const value = withCreature({
      source: {
        creatureStartingPackage: {
          present: true,
          nativeType: "byte",
          value: 0,
          classIds: [4],
          table: {
            resourceName: "packages.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
            sourceLayer: "vanilla",
            sha256: "c".repeat(64),
            sizeBytes: 30_510,
            rowCount: 132,
            rowIndex: 0,
            classId: 4,
          },
        },
      },
      creatureProperties: { advancedSettings: { startingPackageId: 2 } },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      startingPackage: {
        expectedValue: 0,
        value: 2,
        expectedClassIds: [4],
        tableSha256: "c".repeat(64),
        rowCount: 132,
      },
    }]);
  });

  it("projects a complete physical skills.2da-bound SkillList expansion", () => {
    const value = withCreature({
      source: {
        creatureSkillList: {
          present: true,
          nativeType: "list",
          structTypeId: 0,
          rankNativeType: "byte",
          ranks: [4, 0],
          opaqueSiblingFieldCounts: [1, 0],
          table: {
            resourceName: "skills.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/skills.2da",
            sourceLayer: "vanilla",
            sha256: "c".repeat(64),
            sizeBytes: 12_345,
            rowCount: 3,
          },
        },
      },
      creatureProperties: {
        skills: [
          { skillId: 2, skill: "Concentration", rank: 2 },
          { skillId: 0, skill: "Animal Empathy", rank: 7 },
          { skillId: 1, skill: "Hidden", rank: 0 },
        ],
        skillListTruncationConfirmed: false,
      },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      skillList: {
        expectedRanks: [4, 0],
        ranks: [7, 0, 2],
        tableSha256: "c".repeat(64),
        rowCount: 3,
        resizeMode: "expand_zero_tail",
        confirmTruncation: false,
      },
    }]);
  });

  it("projects a feat.2da-bound FeatList change with row-40 HP coupling", () => {
    const value = withCreature({
      source: {
        creatureFeatList: {
          present: true,
          nativeType: "list",
          structTypeId: 1,
          featNativeType: "word",
          featIds: [2, 3],
          opaqueSiblingFieldCounts: [0, 0],
          table: {
            resourceName: "feat.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/feat.2da",
            sourceLayer: "vanilla",
            sha256: "d".repeat(64),
            sizeBytes: 98_765,
            rowCount: 100,
          },
        },
        creatureHitPointState: exactCreatureHitPointState(),
      },
      creatureProperties: {
        feats: [
          { featId: 2, name: "Armor Proficiency", type: "General", assigned: true },
          { featId: 3, name: "Shield Proficiency", type: "General", assigned: true },
          { featId: 40, name: "Toughness", type: "General", assigned: true },
        ],
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 14 },
        },
      },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      featList: {
        expectedFeatIds: [2, 3],
        featIds: [2, 3, 40],
        opaqueSiblingFieldCounts: [0, 0],
        tableSha256: "d".repeat(64),
        rowCount: 100,
        row40Transition: "added",
      },
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 7,
        expectedMaxHitPoints: 99,
        hitPoints: 10,
        currentHitPoints: 5,
        maxHitPoints: 30,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3, 2],
        featRow40Present: false,
        targetFeatRow40Present: true,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "a".repeat(64),
        racialTypesRowCount: 5,
      },
    }]);
  });

  it("projects a complete spells.2da-bound SpecAbilityList profile", () => {
    const value = withCreature({
      source: {
        creatureSpecialAbilityList: {
          present: true,
          nativeType: "list",
          structTypeId: 4,
          entries: [
            { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
            { spellId: 2, spellFlags: 1, casterLevel: 3, opaqueSiblingFieldCount: 0 },
            { spellId: 7, spellFlags: 1, casterLevel: 0, opaqueSiblingFieldCount: 0 },
          ],
          table: {
            resourceName: "spells.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/spells.2da",
            sourceLayer: "vanilla",
            sha256: "e".repeat(64),
            sizeBytes: 456_789,
            rowCount: 100,
          },
        },
      },
      creatureProperties: {
        specialAbilities: [
          { spellId: 2, name: "Acid Fog", type: "Spells", casterLevel: 5, uses: 3 },
          { spellId: 7, name: "Aura", type: "Monster Abilities", casterLevel: 0, uses: 0 },
          { spellId: 9, name: "Breath", type: "Monster Abilities", casterLevel: 0, uses: 2 },
        ],
      },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      specialAbilityList: {
        expectedEntries: [
          { spellId: 2, uses: 2, casterLevel: 3 },
          { spellId: 7, uses: 1, casterLevel: 0 },
        ],
        entries: [
          { spellId: 2, uses: 3, casterLevel: 5 },
          { spellId: 9, uses: 2, casterLevel: 0 },
        ],
        tableSha256: "e".repeat(64),
        rowCount: 100,
      },
    }]);
  });

  it("projects an exact ordered Creature VarTable compare-and-swap mutation", () => {
    const expectedEntries = [
      { sourceIndex: 0, name: "Counter", type: "int" as const, value: 1 },
      { sourceIndex: 1, name: "Label", type: "string" as const, value: "old" },
    ];
    const value = withCreature({
      source: { creatureVariables: { expectedEntries } },
      creatureProperties: { variables: [
        { name: "Label", type: "string", value: "ready" },
        { name: "Scale", type: "float", value: 2.5 },
      ] },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      variables: {
        expectedEntries,
        entries: [
          { name: "Label", type: "string", value: "ready" },
          { name: "Scale", type: "float", value: 2.5 },
        ],
      },
    }]);
  });

  it("couples a same-roster ClassLevel vector to its derived HP triplet", () => {
    const value = withCreature({
      source: {
        creatureClassLevelState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          entries: [
            { classId: 4, level: 3, opaqueSiblingFieldCount: 2 },
            { classId: 7, level: 2, opaqueSiblingFieldCount: 1 },
          ],
        },
        creatureHitPointState: exactCreatureHitPointState(),
      },
      creatureProperties: {
        classEntries: [
          { classId: 4, className: "Fighter", level: 4 },
          { classId: 7, className: "Wizard", level: 3 },
        ],
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 14 },
        },
      },
    });

    expect(project(value).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      classLevels: {
        expectedClassIds: [4, 7],
        expectedLevels: [3, 2],
        levels: [4, 3],
        opaqueSiblingFieldCounts: [2, 1],
      },
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
    }]);
  });
});

function withCreature(input: Readonly<{
  source: Readonly<Record<string, unknown>>;
  creatureProperties: Readonly<Record<string, unknown>>;
}>): AreaDraftSnapshot {
  const value = areaUpdateDraftProjectorSnapshot();
  const payload = value.draft.payload as Record<string, any>;
  const object = retainedCreatureSceneObject();
  payload.editableScene.objects = [{
    ...object,
    source: { ...object.source, sourceIndex: 0, ...input.source },
    creatureProperties: input.creatureProperties,
  }];
  return value;
}

function project(value: AreaDraftSnapshot) {
  return projectAreaUpdateDraft(value, {
    areaResRef: "crypt01",
    draftId: "draft_01",
    draftRevision: 7,
    draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
  });
}
