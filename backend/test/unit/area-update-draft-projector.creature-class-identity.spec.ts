import { projectAreaUpdateDraft } from
  "../../src/modules/areas/domain/area-update-draft-projector";
import {
  AREA_UPDATE_DRAFT_HASH,
  areaUpdateDraftProjectorSnapshot,
  retainedCreatureSceneObject,
} from "../support/area-update-draft-projector-fixture";

describe("Area Update draft projector Creature class identity", () => {
  it("projects the confirmed same-roster mutation without fabricating ClassLevel changes", () => {
    const value = areaUpdateDraftProjectorSnapshot();
    const payload = value.draft.payload as Record<string, any>;
    const object = retainedCreatureSceneObject();
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureClassIdentityState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          classListGraphSha256: "c".repeat(64),
          entries: [{
            classId: 4,
            level: 3,
            opaqueSiblingFieldCount: 1,
            canonicalSpellListFieldCount: 2,
            spellEntryCount: 3,
          }],
          classesTable: {
            resourceName: "classes.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 12_000,
            rowCount: 64,
          },
        },
        creatureClassLevelState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 3 }],
        },
        creatureStartingPackage: {
          present: true,
          nativeType: "byte",
          value: 0,
          classIds: [4],
          table: {
            resourceName: "packages.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
            sourceLayer: "vanilla",
            sha256: "d".repeat(64),
            sizeBytes: 30_510,
            rowCount: 132,
            rowIndex: 0,
            classId: 4,
          },
        },
      },
      creatureProperties: {
        classEntries: [{ classId: 5, className: "Wizard", level: 3 }],
        classIdentityDestructiveSpellClearConfirmed: true,
        advancedSettings: { startingPackageId: 2 },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      classIdentity: {
        expectedClassIds: [4],
        classIds: [5],
        expectedLevels: [3],
        levels: [3],
        classListGraphSha256: "c".repeat(64),
        destructiveSpellClearConfirmed: true,
        expectedStartingPackage: 0,
        startingPackage: 2,
        classesTableSha256: "a".repeat(64),
        classesRowCount: 64,
        packagesTableSha256: "d".repeat(64),
        packagesRowCount: 132,
      },
    }]);
  });

  it("projects an identity and level change with one coupled HP target", () => {
    const value = areaUpdateDraftProjectorSnapshot();
    const payload = value.draft.payload as Record<string, any>;
    const object = retainedCreatureSceneObject();
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureClassIdentityState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          classListGraphSha256: "c".repeat(64),
          entries: [{
            classId: 4,
            level: 3,
            opaqueSiblingFieldCount: 1,
            canonicalSpellListFieldCount: 2,
            spellEntryCount: 3,
          }],
          classesTable: {
            resourceName: "classes.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 12_000,
            rowCount: 64,
          },
        },
        creatureClassLevelState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 3 }],
        },
        creatureStartingPackage: {
          present: true,
          nativeType: "byte",
          value: 0,
          classIds: [4],
          table: {
            resourceName: "packages.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
            sourceLayer: "vanilla",
            sha256: "d".repeat(64),
            sizeBytes: 30_510,
            rowCount: 132,
            rowIndex: 0,
            classId: 4,
          },
        },
        creatureHitPointState: {
          present: true,
          hitPoints: { nativeType: "short", value: 10 },
          currentHitPoints: { nativeType: "short", value: 7 },
          maxHitPoints: { nativeType: "short", value: 99 },
          constitution: { nativeType: "byte", value: 14 },
          race: { nativeType: "byte", value: 1 },
          classLevels: [3],
          featRow40Present: false,
          racialTypes: {
            resourceName: "racialtypes.2da",
            sourceObjectKey: "runtime-source/module/racialtypes.2da",
            sourceLayer: "module",
            sha256: "e".repeat(64),
            sizeBytes: 400,
            rowCount: 5,
            rowIndex: 1,
            constitutionAdjust: 2,
          },
        },
      },
      creatureProperties: {
        classEntries: [{ classId: 5, className: "Wizard", level: 4 }],
        classIdentityDestructiveSpellClearConfirmed: true,
        advancedSettings: { startingPackageId: 2 },
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 14 },
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      classIdentity: {
        expectedClassIds: [4],
        classIds: [5],
        expectedLevels: [3],
        levels: [4],
        classListGraphSha256: "c".repeat(64),
        destructiveSpellClearConfirmed: true,
        expectedStartingPackage: 0,
        startingPackage: 2,
        classesTableSha256: "a".repeat(64),
        classesRowCount: 64,
        packagesTableSha256: "d".repeat(64),
        packagesRowCount: 132,
      },
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 7,
        expectedMaxHitPoints: 99,
        hitPoints: 10,
        currentHitPoints: 7,
        maxHitPoints: 22,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3],
        targetClassLevels: [4],
        featRow40Present: false,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "e".repeat(64),
        racialTypesRowCount: 5,
      },
    }]);
  });

  it("projects one appended tail slot with package and HP coupling", () => {
    const value = areaUpdateDraftProjectorSnapshot();
    const payload = value.draft.payload as Record<string, any>;
    const object = retainedCreatureSceneObject();
    payload.editableScene.objects = [{
      ...object,
      source: {
        ...object.source,
        sourceIndex: 0,
        creatureClassIdentityState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          classListGraphSha256: "c".repeat(64),
          entries: [{
            classId: 4,
            level: 3,
            opaqueSiblingFieldCount: 1,
            canonicalSpellListFieldCount: 2,
            spellEntryCount: 3,
          }],
          classesTable: {
            resourceName: "classes.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/classes.2da",
            sourceLayer: "vanilla",
            sha256: "a".repeat(64),
            sizeBytes: 12_000,
            rowCount: 64,
          },
        },
        creatureClassLevelState: {
          present: true,
          nativeType: "list",
          structTypeId: 2,
          classNativeType: "int",
          levelNativeType: "short",
          entries: [{ classId: 4, level: 3, opaqueSiblingFieldCount: 3 }],
        },
        creatureStartingPackage: {
          present: true,
          nativeType: "byte",
          value: 0,
          classIds: [4],
          table: {
            resourceName: "packages.2da",
            sourceObjectKey: "runtime-source/vanilla/nwn_base.key/packages.2da",
            sourceLayer: "vanilla",
            sha256: "d".repeat(64),
            sizeBytes: 30_510,
            rowCount: 132,
            rowIndex: 0,
            classId: 4,
          },
        },
        creatureHitPointState: {
          present: true,
          hitPoints: { nativeType: "short", value: 10 },
          currentHitPoints: { nativeType: "short", value: 7 },
          maxHitPoints: { nativeType: "short", value: 99 },
          constitution: { nativeType: "byte", value: 14 },
          race: { nativeType: "byte", value: 1 },
          classLevels: [3],
          featRow40Present: false,
          racialTypes: {
            resourceName: "racialtypes.2da",
            sourceObjectKey: "runtime-source/module/racialtypes.2da",
            sourceLayer: "module",
            sha256: "e".repeat(64),
            sizeBytes: 400,
            rowCount: 5,
            rowIndex: 1,
            constitutionAdjust: 2,
          },
        },
      },
      creatureProperties: {
        classEntries: [
          { classId: 4, className: "Fighter", level: 3 },
          { classId: 5, className: "Wizard", level: 1 },
        ],
        classSlotResizeDestructiveRemovalConfirmed: false,
        advancedSettings: { startingPackageId: 2 },
        statistics: {
          baseHitPoints: 10,
          abilityScores: { constitution: 14 },
        },
      },
    }];

    expect(projectAreaUpdateDraft(value, {
      areaResRef: "crypt01",
      draftId: "draft_01",
      draftRevision: 7,
      draftNormalizedSha256: AREA_UPDATE_DRAFT_HASH,
    }).objectEditing?.propertyMutations).toEqual([{
      kind: "creature",
      sourceObjectId: "obj_cre_guard",
      sourceIndex: 0,
      classSlotResize: {
        expectedClassIds: [4],
        expectedLevels: [3],
        classIds: [4, 5],
        levels: [3, 1],
        classListGraphSha256: "c".repeat(64),
        resizeMode: "append_tail",
        destructiveRemovedSlotsConfirmed: false,
        expectedStartingPackage: 0,
        startingPackage: 2,
        classesTableSha256: "a".repeat(64),
        classesRowCount: 64,
        packagesTableSha256: "d".repeat(64),
        packagesRowCount: 132,
      },
      hitPoints: {
        expectedHitPoints: 10,
        expectedCurrentHitPoints: 7,
        expectedMaxHitPoints: 99,
        hitPoints: 10,
        currentHitPoints: 7,
        maxHitPoints: 22,
        expectedConstitution: 14,
        constitution: 14,
        race: 1,
        classLevels: [3],
        targetClassLevels: [3, 1],
        featRow40Present: false,
        racialConstitutionAdjust: 2,
        racialTypesSha256: "e".repeat(64),
        racialTypesRowCount: 5,
      },
    }]);
  });
});
