import type { SceneObject } from "../contracts";
import type {
  SceneObjectEmbeddedItemSummary,
  SceneObjectCreatureProperties,
  SceneObjectItemProperties
} from "../../scene/contracts";
import { clonePlaceableLocalizedStrings } from "../../scene/domain/placeableLocalizedStrings";
import { cloneCreatureNameLocalizedStrings } from "../../scene/domain/creatureNameLocalizedStrings";
import { cloneSceneObjectVfxPayload } from "../../scene/domain/auroraVfxPayload";
import { cloneItemInstanceStateStorage } from "../../scene/domain/itemInstanceState";
import { cloneItemLocalizedStrings } from "../../scene/domain/itemLocalizedStrings";
import { cloneEncounterLocalizedNameStorage } from
  "../../scene/domain/encounterLocalizedName";
import { cloneTriggerLocalizedNameStorage } from
  "../../scene/domain/triggerLocalizedName";
import { cloneTriggerScriptResRefsStorage } from
  "../../scene/domain/triggerScriptResRefs";
import { cloneTriggerTransitionStorage } from
  "../../scene/domain/triggerTransitionStorage";
import { cloneWaypointLocalizedNameStorage } from
  "../../scene/domain/waypointLocalizedName";
import { cloneWaypointDescriptionStorage } from
  "../../scene/domain/waypointDescription";
import {
  cloneWaypointMapNoteStorage,
  cloneWaypointMapNoteValue,
} from "../../scene/domain/waypointMapNote";
import { cloneItemVisualTransformStorage } from "../../scene/domain/itemVisualTransform";
import {
  cloneItemBaseAppearanceProvenance,
  cloneItemBaseAppearanceValue,
} from "../../scene/domain/itemBaseAppearance";
import { cloneAreaDoorTransitionStorage } from "../../shared/domain/areaDoorTransitionStorage";
import { cloneAreaObjectPolygonGeometry } from "../../areas/domain/areaObjectPolygonGeometry";
import { cloneAreaSoundIntervalVariationStorage } from "../../areas/domain/areaSoundIntervalVariationStorage";
import { cloneAreaSoundVolumeStorage } from "../../areas/domain/areaSoundVolumeStorage";
import { cloneAreaSoundActiveStorage } from "../../areas/domain/areaSoundActiveStorage";
import { cloneAreaSoundPlayOrderStorage } from "../../areas/domain/areaSoundPlayOrderStorage";
import { cloneAreaSoundPlayStyleStorage } from "../../areas/domain/areaSoundPlayStyleStorage";
import { cloneAreaSoundPlaybackStorage } from "../../areas/domain/areaSoundPlaybackStorage";
import { cloneAreaSoundProfileStorage } from "../../areas/domain/areaSoundProfileStorage";
import { cloneAreaSoundScheduleStorage } from "../../areas/domain/areaSoundScheduleStorage";
import { cloneAreaStoreCommerceValue } from "../../scene/domain/storeCommerce";
import { cloneAreaStoreScriptResRefsValue } from "../../scene/domain/storeScriptResRefs";
import { cloneEncounterScriptResRefsStorage } from
  "../../scene/domain/encounterScriptResRefs";
import {
  cloneStoreRestrictionsProvenance,
  cloneStoreRestrictionsTarget,
} from "../../scene/domain/storeRestrictions";
import {
  cloneStoreInventoryProvenance,
  cloneStoreInventoryTargetBuckets,
} from "../../scene/domain/storeInventory";

function cloneEmbeddedItemSummary(
  embeddedItem: SceneObjectEmbeddedItemSummary | undefined
): SceneObjectEmbeddedItemSummary | undefined {
  return embeddedItem
    ? {
        ...embeddedItem,
        itemPropertyListEntries: embeddedItem.itemPropertyListEntries
          ? embeddedItem.itemPropertyListEntries.map((entry) => ({ ...entry }))
          : undefined
      }
    : undefined;
}

export function cloneSceneObjectCreatureProperties(
  properties: SceneObjectCreatureProperties | undefined
): SceneObjectCreatureProperties | undefined {
  return properties
    ? {
      ...properties,
        statistics: properties.statistics
          ? {
              ...properties.statistics,
              abilityScores: { ...properties.statistics.abilityScores },
              racialModifiers: { ...properties.statistics.racialModifiers },
              saves: { ...properties.statistics.saves }
            }
          : undefined,
        appearanceSettings: properties.appearanceSettings
          ? {
              ...properties.appearanceSettings,
              colors: properties.appearanceSettings.colors
                ? { ...properties.appearanceSettings.colors }
                : undefined,
              sourceOnlyParts: properties.appearanceSettings.sourceOnlyParts
                ? { ...properties.appearanceSettings.sourceOnlyParts }
                : undefined
            }
          : undefined,
        appearanceProfile: properties.appearanceProfile
          ? { ...properties.appearanceProfile }
          : undefined,
        lookupProfile: properties.lookupProfile ? { ...properties.lookupProfile } : undefined,
        listCounts: properties.listCounts ? { ...properties.listCounts } : undefined,
        localizedStringRefs: properties.localizedStringRefs
          ? { ...properties.localizedStringRefs }
          : undefined,
        localizedStrings: properties.localizedStrings
          ? { ...properties.localizedStrings }
          : undefined,
        classEntries: properties.classEntries
          ? properties.classEntries.map((entry) => ({ ...entry }))
          : undefined,
        templateEntries: properties.templateEntries
          ? properties.templateEntries.map((entry) => ({ ...entry }))
          : undefined,
        skills: properties.skills ? properties.skills.map((entry) => ({ ...entry })) : undefined,
        scriptSlots: properties.scriptSlots ? { ...properties.scriptSlots } : undefined,
        advancedSettings: properties.advancedSettings
          ? { ...properties.advancedSettings }
          : undefined,
        feats: properties.feats ? properties.feats.map((entry) => ({ ...entry })) : undefined,
        spells: properties.spells ? properties.spells.map((entry) => ({ ...entry })) : undefined,
        specialAbilities: properties.specialAbilities
          ? properties.specialAbilities.map((entry) => ({ ...entry }))
          : undefined,
        variables: properties.variables
          ? properties.variables.map((entry) => ({ ...entry }))
          : undefined,
        inventoryItems: properties.inventoryItems
          ? properties.inventoryItems.map((entry) => ({
              ...entry,
              ...(entry.embeddedItem
                ? { embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem) }
                : {})
            }))
          : undefined,
        equippedItems: properties.equippedItems
          ? properties.equippedItems.map((entry) => ({
              ...entry,
              ...(entry.embeddedItem
                ? { embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem) }
                : {})
            }))
          : undefined
      }
    : undefined;
}

export function cloneSceneObjectItemProperties(
  properties: SceneObjectItemProperties | undefined
): SceneObjectItemProperties | undefined {
  return properties
    ? {
        ...properties,
        baseAppearance: properties.baseAppearance
          ? cloneItemBaseAppearanceValue(properties.baseAppearance)
          : undefined,
        modelParts: properties.modelParts ? [...properties.modelParts] : undefined,
        modelPartResRefs: properties.modelPartResRefs
          ? [...properties.modelPartResRefs]
          : undefined,
        modelPartResRefRoles: properties.modelPartResRefRoles
          ? [...properties.modelPartResRefRoles]
          : undefined,
        cloakHiddenSlots: properties.cloakHiddenSlots
          ? [...properties.cloakHiddenSlots]
          : undefined,
        armorRobeHiddenSlots: properties.armorRobeHiddenSlots
          ? [...properties.armorRobeHiddenSlots]
          : undefined,
        armorPreviewContext: properties.armorPreviewContext
          ? { ...properties.armorPreviewContext }
          : undefined,
        modelPartCandidates: properties.modelPartCandidates
          ? properties.modelPartCandidates.map((entry) => ({ ...entry }))
          : undefined,
        armorPartModelCandidates: properties.armorPartModelCandidates
          ? properties.armorPartModelCandidates.map((entry) => ({ ...entry }))
          : undefined,
        modelAssetCandidates: properties.modelAssetCandidates
          ? properties.modelAssetCandidates.map((entry) => ({ ...entry }))
          : undefined,
        armorParts: properties.armorParts ? { ...properties.armorParts } : undefined,
        armorPartCostModifiers: properties.armorPartCostModifiers
          ? { ...properties.armorPartCostModifiers }
          : undefined,
        materialColors: properties.materialColors ? { ...properties.materialColors } : undefined,
        propertyList: properties.propertyList
          ? properties.propertyList.map((entry) => ({ ...entry }))
          : undefined,
        inventoryItems: properties.inventoryItems
          ? properties.inventoryItems.map((entry) => ({ ...entry }))
          : undefined,
        blueprintInventoryItems: properties.blueprintInventoryItems
          ? properties.blueprintInventoryItems.map((entry) => ({ ...entry }))
          : undefined,
        blueprintEquippedItems: properties.blueprintEquippedItems
          ? properties.blueprintEquippedItems.map((entry) => ({ ...entry }))
          : undefined,
        visualTransform: properties.visualTransform
          ? cloneItemVisualTransformStorage(properties.visualTransform)
          : undefined,
        variables: properties.variables
          ? properties.variables.map((entry) => ({ ...entry }))
          : undefined,
        scripts: properties.scripts ? { ...properties.scripts } : undefined
      }
    : undefined;
}

export function cloneSceneObject(object: SceneObject): SceneObject {
  const objectWithoutPolygonGeometry = { ...object };
  delete objectWithoutPolygonGeometry.polygonGeometry;
  const sourceWithoutPolygonGeometry = object.source ? { ...object.source } : undefined;
  if (sourceWithoutPolygonGeometry) {
    delete sourceWithoutPolygonGeometry.polygonGeometry;
  }
  return {
    ...objectWithoutPolygonGeometry,
    source: object.source
      ? {
          ...sourceWithoutPolygonGeometry!,
          creatureTag: object.source.creatureTag
            ? { ...object.source.creatureTag }
            : undefined,
          creatureConversation: object.source.creatureConversation
            ? { ...object.source.creatureConversation }
            : undefined,
          creatureInterruptable: object.source.creatureInterruptable
            ? { ...object.source.creatureInterruptable }
            : undefined,
          creatureAdvancedFlags: object.source.creatureAdvancedFlags
            ? {
                disarmable: { ...object.source.creatureAdvancedFlags.disarmable },
                plot: { ...object.source.creatureAdvancedFlags.plot },
                immortal: { ...object.source.creatureAdvancedFlags.immortal },
                lootable: { ...object.source.creatureAdvancedFlags.lootable },
                noPermanentDeath: {
                  ...object.source.creatureAdvancedFlags.noPermanentDeath,
                },
              }
            : undefined,
          creatureBodyBag: object.source.creatureBodyBag
            ? { ...object.source.creatureBodyBag }
            : undefined,
          creatureDecayTime: object.source.creatureDecayTime
            ? { ...object.source.creatureDecayTime }
            : undefined,
          creatureAppearance: object.source.creatureAppearance
            ? object.source.creatureAppearance.present && object.source.creatureAppearance.table
              ? {
                  ...object.source.creatureAppearance,
                  table: { ...object.source.creatureAppearance.table },
                }
              : { ...object.source.creatureAppearance }
            : undefined,
          creatureGender: object.source.creatureGender
            ? object.source.creatureGender.present && object.source.creatureGender.table
              ? {
                  ...object.source.creatureGender,
                  table: { ...object.source.creatureGender.table },
                }
              : { ...object.source.creatureGender }
            : undefined,
          creaturePerceptionRange: object.source.creaturePerceptionRange
            ? object.source.creaturePerceptionRange.present &&
              object.source.creaturePerceptionRange.table
              ? {
                  ...object.source.creaturePerceptionRange,
                  table: { ...object.source.creaturePerceptionRange.table },
                }
              : { ...object.source.creaturePerceptionRange }
            : undefined,
          creatureWalkRate: object.source.creatureWalkRate
            ? object.source.creatureWalkRate.present && object.source.creatureWalkRate.table
              ? {
                  ...object.source.creatureWalkRate,
                  table: { ...object.source.creatureWalkRate.table },
                }
              : { ...object.source.creatureWalkRate }
            : undefined,
          creatureSoundSetFile: object.source.creatureSoundSetFile
            ? object.source.creatureSoundSetFile.present &&
              object.source.creatureSoundSetFile.table
              ? {
                  ...object.source.creatureSoundSetFile,
                  table: { ...object.source.creatureSoundSetFile.table },
                }
              : { ...object.source.creatureSoundSetFile }
            : undefined,
          creatureStartingPackage: object.source.creatureStartingPackage
            ? object.source.creatureStartingPackage.present
              ? {
                  ...object.source.creatureStartingPackage,
                  ...(object.source.creatureStartingPackage.classIds
                    ? { classIds: [...object.source.creatureStartingPackage.classIds] }
                    : {}),
                  ...(object.source.creatureStartingPackage.table
                    ? { table: { ...object.source.creatureStartingPackage.table } }
                    : {}),
                }
              : { ...object.source.creatureStartingPackage }
            : undefined,
          creatureSkillList: object.source.creatureSkillList
            ? object.source.creatureSkillList.present
              ? {
                  ...object.source.creatureSkillList,
                  ranks: [...object.source.creatureSkillList.ranks],
                  opaqueSiblingFieldCounts: [
                    ...object.source.creatureSkillList.opaqueSiblingFieldCounts,
                  ],
                  ...(object.source.creatureSkillList.table
                    ? { table: { ...object.source.creatureSkillList.table } }
                    : {}),
                }
              : { present: false }
            : undefined,
          creatureFeatList: object.source.creatureFeatList
            ? object.source.creatureFeatList.present
              ? {
                  ...object.source.creatureFeatList,
                  featIds: [...object.source.creatureFeatList.featIds],
                  opaqueSiblingFieldCounts: [
                    ...object.source.creatureFeatList.opaqueSiblingFieldCounts,
                  ],
                  ...(object.source.creatureFeatList.table
                    ? { table: { ...object.source.creatureFeatList.table } }
                    : {}),
                }
              : { present: false }
            : undefined,
          creatureSpecialAbilityList: object.source.creatureSpecialAbilityList
            ? object.source.creatureSpecialAbilityList.present
              ? {
                  ...object.source.creatureSpecialAbilityList,
                  entries: object.source.creatureSpecialAbilityList.entries.map(
                    (entry) => ({ ...entry }),
                  ),
                  ...(object.source.creatureSpecialAbilityList.table
                    ? { table: { ...object.source.creatureSpecialAbilityList.table } }
                    : {}),
                }
              : { present: false }
            : undefined,
          creatureVariables: object.source.creatureVariables
            ? {
                expectedEntries: object.source.creatureVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          creatureClassLevelState: object.source.creatureClassLevelState
            ? object.source.creatureClassLevelState.present
              ? {
                  ...object.source.creatureClassLevelState,
                  entries: object.source.creatureClassLevelState.entries.map((entry) => ({
                    ...entry,
                  })),
                }
              : { present: false }
            : undefined,
          creatureClassIdentityState: object.source.creatureClassIdentityState
            ? object.source.creatureClassIdentityState.present
              ? {
                  ...object.source.creatureClassIdentityState,
                  entries: object.source.creatureClassIdentityState.entries.map((entry) => ({
                    ...entry,
                  })),
                  ...(object.source.creatureClassIdentityState.classesTable
                    ? {
                        classesTable: {
                          ...object.source.creatureClassIdentityState.classesTable,
                        },
                      }
                    : {}),
                }
              : { present: false }
            : undefined,
          creaturePhenotype: object.source.creaturePhenotype
            ? object.source.creaturePhenotype.present && object.source.creaturePhenotype.table
              ? {
                  ...object.source.creaturePhenotype,
                  table: { ...object.source.creaturePhenotype.table },
                }
              : { ...object.source.creaturePhenotype }
            : undefined,
          creaturePortrait: object.source.creaturePortrait
            ? object.source.creaturePortrait.present
              ? {
                  ...object.source.creaturePortrait,
                  ...(object.source.creaturePortrait.selectorContext
                    ? {
                        selectorContext: {
                          ...object.source.creaturePortrait.selectorContext,
                        },
                      }
                    : {}),
                  ...(object.source.creaturePortrait.table
                    ? { table: { ...object.source.creaturePortrait.table } }
                    : {}),
                }
              : { ...object.source.creaturePortrait }
            : undefined,
          creatureChallengeRating: object.source.creatureChallengeRating
            ? { ...object.source.creatureChallengeRating }
            : undefined,
          creatureAbilityScores: object.source.creatureAbilityScores
            ? {
                strength: { ...object.source.creatureAbilityScores.strength },
                dexterity: { ...object.source.creatureAbilityScores.dexterity },
                constitution: { ...object.source.creatureAbilityScores.constitution },
                intelligence: { ...object.source.creatureAbilityScores.intelligence },
                wisdom: { ...object.source.creatureAbilityScores.wisdom },
                charisma: { ...object.source.creatureAbilityScores.charisma },
              }
            : undefined,
          creatureAppearanceColors: object.source.creatureAppearanceColors
            ? {
                skin: { ...object.source.creatureAppearanceColors.skin },
                hair: { ...object.source.creatureAppearanceColors.hair },
                tattoo1: { ...object.source.creatureAppearanceColors.tattoo1 },
                tattoo2: { ...object.source.creatureAppearanceColors.tattoo2 },
              }
            : undefined,
          creatureBodyParts: object.source.creatureBodyParts
            ? Object.fromEntries(
                Object.entries(object.source.creatureBodyParts).map(([key, storage]) => [
                  key,
                  storage.present
                    ? {
                        ...storage,
                        legacyByte: { ...storage.legacyByte },
                        wideWord: { ...storage.wideWord },
                      }
                    : { ...storage },
                ]),
              ) as typeof object.source.creatureBodyParts
            : undefined,
          creatureAppendages: object.source.creatureAppendages
            ? Object.fromEntries(
                Object.entries(object.source.creatureAppendages).map(([key, storage]) => [
                  key,
                  storage.present
                    ? {
                        ...storage,
                        modernDword: storage.modernDword.present && storage.modernDword.table
                          ? {
                              ...storage.modernDword,
                              table: { ...storage.modernDword.table },
                            }
                          : { ...storage.modernDword },
                        legacyByte: { ...storage.legacyByte },
                      }
                    : { ...storage },
                ]),
              ) as typeof object.source.creatureAppendages
            : undefined,
          creatureHitPointState: object.source.creatureHitPointState
            ? object.source.creatureHitPointState.present
              ? {
                  ...object.source.creatureHitPointState,
                  hitPoints: { ...object.source.creatureHitPointState.hitPoints },
                  currentHitPoints: {
                    ...object.source.creatureHitPointState.currentHitPoints,
                  },
                  maxHitPoints: { ...object.source.creatureHitPointState.maxHitPoints },
                  constitution: { ...object.source.creatureHitPointState.constitution },
                  race: { ...object.source.creatureHitPointState.race },
                  classLevels: [...object.source.creatureHitPointState.classLevels],
                  ...(object.source.creatureHitPointState.racialTypes
                    ? {
                        racialTypes: {
                          ...object.source.creatureHitPointState.racialTypes,
                        },
                      }
                    : {}),
                }
              : { present: false }
            : undefined,
          creatureNaturalArmorClass: object.source.creatureNaturalArmorClass
            ? { ...object.source.creatureNaturalArmorClass }
            : undefined,
          creatureSavingThrowBonuses: object.source.creatureSavingThrowBonuses
            ? {
                fortitude: { ...object.source.creatureSavingThrowBonuses.fortitude },
                reflex: { ...object.source.creatureSavingThrowBonuses.reflex },
                will: { ...object.source.creatureSavingThrowBonuses.will },
              }
            : undefined,
          creatureAlignment: object.source.creatureAlignment
            ? {
                goodEvil: { ...object.source.creatureAlignment.goodEvil },
                lawfulChaotic: { ...object.source.creatureAlignment.lawfulChaotic },
              }
            : undefined,
          creatureFaction: object.source.creatureFaction
            ? { ...object.source.creatureFaction }
            : undefined,
          creatureTemplateResRef: object.source.creatureTemplateResRef
            ? { ...object.source.creatureTemplateResRef }
            : undefined,
          creatureSpecialIdentityStrings: object.source.creatureSpecialIdentityStrings
            ? {
                ...(object.source.creatureSpecialIdentityStrings.subrace
                  ? { subrace: { ...object.source.creatureSpecialIdentityStrings.subrace } }
                  : {}),
                ...(object.source.creatureSpecialIdentityStrings.deity
                  ? { deity: { ...object.source.creatureSpecialIdentityStrings.deity } }
                  : {}),
              }
            : undefined,
          creatureScriptResRefs: object.source.creatureScriptResRefs
            ? Object.fromEntries(
                Object.entries(object.source.creatureScriptResRefs).map(
                  ([key, member]) => [key, { ...member }],
                ),
              ) as typeof object.source.creatureScriptResRefs
            : undefined,
          creatureLocalizedStrings: object.source.creatureLocalizedStrings
            ? cloneCreatureNameLocalizedStrings(object.source.creatureLocalizedStrings)
            : undefined,
          creatureInventoryItems: object.source.creatureInventoryItems
            ? object.source.creatureInventoryItems.map((entry) => ({ ...entry }))
            : undefined,
          creatureEquippedItems: object.source.creatureEquippedItems
            ? object.source.creatureEquippedItems.map((entry) => ({ ...entry }))
            : undefined,
          placeableInventoryItems: object.source.placeableInventoryItems
            ? object.source.placeableInventoryItems.map((entry) => ({ ...entry }))
            : undefined,
          placeableDurabilitySaveBytes: object.source.placeableDurabilitySaveBytes
            ? { ...object.source.placeableDurabilitySaveBytes }
            : undefined,
          placeableHitPointState: object.source.placeableHitPointState
            ? { ...object.source.placeableHitPointState }
            : undefined,
          placeableTrapSettings: object.source.placeableTrapSettings
            ? { ...object.source.placeableTrapSettings }
            : undefined,
          placeableTrapType: object.source.placeableTrapType
            ? { ...object.source.placeableTrapType }
            : undefined,
          placeableBodyBag: object.source.placeableBodyBag
            ? { ...object.source.placeableBodyBag }
            : undefined,
          placeablePortrait: object.source.placeablePortrait
            ? { ...object.source.placeablePortrait }
            : undefined,
          placeableFaction: object.source.placeableFaction
            ? { ...object.source.placeableFaction }
            : undefined,
          placeableVariables: object.source.placeableVariables
            ? {
                expectedEntries: object.source.placeableVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          placeableBasicIdentity: object.source.placeableBasicIdentity
            ? {
                tag: { ...object.source.placeableBasicIdentity.tag },
                appearance: object.source.placeableBasicIdentity.appearance.present &&
                  object.source.placeableBasicIdentity.appearance.nativeType === "dword" &&
                  object.source.placeableBasicIdentity.appearance.table
                  ? {
                      ...object.source.placeableBasicIdentity.appearance,
                      table: { ...object.source.placeableBasicIdentity.appearance.table },
                    }
                  : { ...object.source.placeableBasicIdentity.appearance },
              }
            : undefined,
          placeableLocalizedStrings: object.source.placeableLocalizedStrings
            ? clonePlaceableLocalizedStrings(object.source.placeableLocalizedStrings)
            : undefined,
          doorTransitionStorage: object.source.doorTransitionStorage
            ? cloneAreaDoorTransitionStorage(object.source.doorTransitionStorage)
            : undefined,
          itemTag: object.source.itemTag
            ? { ...object.source.itemTag }
            : undefined,
          triggerTag: object.source.triggerTag
            ? { ...object.source.triggerTag }
            : undefined,
          triggerTemplateResRef: object.source.triggerTemplateResRef
            ? { ...object.source.triggerTemplateResRef }
            : undefined,
          triggerLocalizedNameStorage: object.source.triggerLocalizedNameStorage
            ? cloneTriggerLocalizedNameStorage(
                object.source.triggerLocalizedNameStorage,
              )
            : undefined,
          triggerEditorComment: object.source.triggerEditorComment,
          triggerScriptResRefsStorage: object.source.triggerScriptResRefsStorage
            ? cloneTriggerScriptResRefsStorage(object.source.triggerScriptResRefsStorage)
            : undefined,
          triggerTransitionStorage: object.source.triggerTransitionStorage
            ? cloneTriggerTransitionStorage(object.source.triggerTransitionStorage)
            : undefined,
          encounterTag: object.source.encounterTag
            ? { ...object.source.encounterTag }
            : undefined,
          encounterTemplateResRef: object.source.encounterTemplateResRef
            ? { ...object.source.encounterTemplateResRef }
            : undefined,
          waypointTag: object.source.waypointTag
            ? { ...object.source.waypointTag }
            : undefined,
          waypointTemplateResRef: object.source.waypointTemplateResRef
            ? { ...object.source.waypointTemplateResRef }
            : undefined,
          waypointLocalizedNameStorage: object.source.waypointLocalizedNameStorage
            ? cloneWaypointLocalizedNameStorage(
                object.source.waypointLocalizedNameStorage,
              )
            : undefined,
          waypointDescriptionStorage: object.source.waypointDescriptionStorage
            ? cloneWaypointDescriptionStorage(
                object.source.waypointDescriptionStorage,
              )
            : undefined,
          waypointMapNoteStorage: object.source.waypointMapNoteStorage
            ? cloneWaypointMapNoteStorage(object.source.waypointMapNoteStorage)
            : undefined,
          waypointAppearance: object.source.waypointAppearance
            ? {
                ...object.source.waypointAppearance,
                table: { ...object.source.waypointAppearance.table },
              }
            : undefined,
          waypointVariables: object.source.waypointVariables
            ? {
                expectedEntries: object.source.waypointVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          waypointEditorComment: object.source.waypointEditorComment,
          encounterActiveStorage: object.source.encounterActiveStorage
            ? { ...object.source.encounterActiveStorage }
            : undefined,
          encounterPlayerOnlyStorage: object.source.encounterPlayerOnlyStorage
            ? { ...object.source.encounterPlayerOnlyStorage }
            : undefined,
          encounterResetStorage: object.source.encounterResetStorage
            ? { ...object.source.encounterResetStorage }
            : undefined,
          encounterResetTimeStorage: object.source.encounterResetTimeStorage
            ? { ...object.source.encounterResetTimeStorage }
            : undefined,
          encounterSpawnOptionStorage: object.source.encounterSpawnOptionStorage
            ? { ...object.source.encounterSpawnOptionStorage }
            : undefined,
          encounterRespawnsStorage: object.source.encounterRespawnsStorage
            ? { ...object.source.encounterRespawnsStorage }
            : undefined,
          encounterCreatureCountsStorage: object.source.encounterCreatureCountsStorage
            ? { ...object.source.encounterCreatureCountsStorage }
            : undefined,
          encounterScriptResRefsStorage: object.source.encounterScriptResRefsStorage
            ? cloneEncounterScriptResRefsStorage(
                object.source.encounterScriptResRefsStorage,
              )
            : undefined,
          encounterFaction: object.source.encounterFaction
            ? { ...object.source.encounterFaction }
            : undefined,
          encounterDifficulty: object.source.encounterDifficulty
            ? {
                ...object.source.encounterDifficulty,
                expectedValue: { ...object.source.encounterDifficulty.expectedValue },
              }
            : undefined,
          encounterLocalizedNameStorage: object.source.encounterLocalizedNameStorage
            ? cloneEncounterLocalizedNameStorage(
                object.source.encounterLocalizedNameStorage,
              )
            : undefined,
          encounterVariables: object.source.encounterVariables
            ? {
                expectedEntries: object.source.encounterVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          encounterCreatureList: object.source.encounterCreatureList
            ? {
                expectedEntries: object.source.encounterCreatureList.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          encounterSpawnPoints: object.source.encounterSpawnPoints
            ? {
                expectedEntries: object.source.encounterSpawnPoints.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          itemTemplateResRef: object.source.itemTemplateResRef
            ? { ...object.source.itemTemplateResRef }
            : undefined,
          itemInstanceState: object.source.itemInstanceState
            ? cloneItemInstanceStateStorage(object.source.itemInstanceState)
            : undefined,
          itemLocalizedStrings: object.source.itemLocalizedStrings
            ? cloneItemLocalizedStrings(object.source.itemLocalizedStrings)
            : undefined,
          itemVariables: object.source.itemVariables
            ? {
                expectedEntries: object.source.itemVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          itemPropertyList: object.source.itemPropertyList
            ? {
                present: object.source.itemPropertyList.present,
                expectedEntries: object.source.itemPropertyList.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          itemInventoryItems: object.source.itemInventoryItems
            ? object.source.itemInventoryItems.map((entry) => ({ ...entry }))
            : undefined,
          itemVisualTransform: object.source.itemVisualTransform
            ? cloneItemVisualTransformStorage(object.source.itemVisualTransform)
            : undefined,
          itemBaseAppearance: object.source.itemBaseAppearance
            ? cloneItemBaseAppearanceProvenance(object.source.itemBaseAppearance)
            : undefined,
          storeCommerce: object.source.storeCommerce
            ? cloneAreaStoreCommerceValue(object.source.storeCommerce)
            : undefined,
          storeScriptResRefs: object.source.storeScriptResRefs
            ? cloneAreaStoreScriptResRefsValue(object.source.storeScriptResRefs)
            : undefined,
          storeVariables: object.source.storeVariables
            ? {
                expectedEntries: object.source.storeVariables.expectedEntries.map(
                  (entry) => ({ ...entry }),
                ),
              }
            : undefined,
          storeRestrictions: object.source.storeRestrictions
            ? cloneStoreRestrictionsProvenance(object.source.storeRestrictions)
            : undefined,
          storeInventory: object.source.storeInventory
            ? cloneStoreInventoryProvenance(object.source.storeInventory)
            : undefined,
          doorHook: object.source.doorHook ? { ...object.source.doorHook } : undefined,
          ...(object.source.polygonGeometry
            ? { polygonGeometry: cloneAreaObjectPolygonGeometry(object.source.polygonGeometry) }
            : {}),
          ...(object.source.soundIntervalVariationStorage
            ? {
                soundIntervalVariationStorage: cloneAreaSoundIntervalVariationStorage(
                  object.source.soundIntervalVariationStorage,
                ),
              }
            : {}),
          ...(object.source.soundVolumeStorage
            ? { soundVolumeStorage: cloneAreaSoundVolumeStorage(object.source.soundVolumeStorage) }
            : {}),
          ...(object.source.soundActiveStorage
            ? { soundActiveStorage: cloneAreaSoundActiveStorage(object.source.soundActiveStorage) }
            : {}),
          ...(object.source.soundPlayOrderStorage
            ? {
                soundPlayOrderStorage: cloneAreaSoundPlayOrderStorage(
                  object.source.soundPlayOrderStorage,
                ),
              }
            : {}),
          ...(object.source.soundPlayStyleStorage
            ? {
                soundPlayStyleStorage: cloneAreaSoundPlayStyleStorage(
                  object.source.soundPlayStyleStorage,
                ),
              }
            : {}),
          ...(object.source.soundPlaybackStorage
            ? {
                soundPlaybackStorage: cloneAreaSoundPlaybackStorage(
                  object.source.soundPlaybackStorage,
                ),
              }
            : {}),
          ...(object.source.soundProfileStorage
            ? {
                soundProfileStorage: cloneAreaSoundProfileStorage(
                  object.source.soundProfileStorage,
                ),
              }
            : {}),
          ...(object.source.soundScheduleStorage
            ? {
                soundScheduleStorage: cloneAreaSoundScheduleStorage(
                  object.source.soundScheduleStorage,
                ),
              }
            : {}),
        }
      : undefined,
    ...(object.polygonGeometry
      ? { polygonGeometry: cloneAreaObjectPolygonGeometry(object.polygonGeometry) }
      : {}),
    visualTransform: { ...object.visualTransform },
    placeableProperties: object.placeableProperties
      ? {
          ...object.placeableProperties,
          scriptSlots: object.placeableProperties.scriptSlots
            ? { ...object.placeableProperties.scriptSlots }
            : undefined,
          disabledFlags: object.placeableProperties.disabledFlags
            ? { ...object.placeableProperties.disabledFlags }
            : undefined,
          lockSettings: object.placeableProperties.lockSettings
            ? { ...object.placeableProperties.lockSettings }
            : undefined,
          trapSettings: object.placeableProperties.trapSettings
            ? { ...object.placeableProperties.trapSettings }
            : undefined,
          advancedSettings: object.placeableProperties.advancedSettings
            ? { ...object.placeableProperties.advancedSettings }
            : undefined,
          inventoryItems: object.placeableProperties.inventoryItems
            ? object.placeableProperties.inventoryItems.map((entry) => ({
                ...entry,
                embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem)
              }))
            : undefined,
          variables: object.placeableProperties.variables
            ? object.placeableProperties.variables.map((entry) => ({ ...entry }))
            : undefined
        }
      : undefined,
    creatureProperties: cloneSceneObjectCreatureProperties(object.creatureProperties),
    itemProperties: cloneSceneObjectItemProperties(object.itemProperties),
    storeProperties: object.storeProperties
      ? {
          ...object.storeProperties,
          ...(object.storeProperties.commerce
            ? { commerce: cloneAreaStoreCommerceValue(object.storeProperties.commerce) }
            : {}),
          ...(object.storeProperties.scriptResRefs
            ? {
                scriptResRefs: cloneAreaStoreScriptResRefsValue(
                  object.storeProperties.scriptResRefs,
                ),
              }
            : {}),
          ...(object.storeProperties.variables
            ? { variables: object.storeProperties.variables.map((entry) => ({ ...entry })) }
            : {}),
          ...(object.storeProperties.restrictions
            ? {
                restrictions: cloneStoreRestrictionsTarget(
                  object.storeProperties.restrictions,
                ),
              }
            : {}),
          ...(object.storeProperties.inventoryBuckets && object.source?.storeInventory
            ? {
                inventoryBuckets: cloneStoreInventoryTargetBuckets(
                  object.storeProperties.inventoryBuckets,
                  object.source.storeInventory.expectedBuckets,
                ),
              }
            : {}),
        }
      : undefined,
    encounterProperties: object.encounterProperties
      ? {
          ...object.encounterProperties,
          creatureList: object.encounterProperties.creatureList
            ? object.encounterProperties.creatureList.map((entry) => ({ ...entry }))
            : undefined,
          spawnPoints: object.encounterProperties.spawnPoints
            ? object.encounterProperties.spawnPoints.map((entry) => ({ ...entry }))
            : undefined,
          scripts: object.encounterProperties.scripts
            ? { ...object.encounterProperties.scripts }
            : undefined,
          variables: object.encounterProperties.variables
            ? object.encounterProperties.variables.map((entry) => ({ ...entry }))
            : undefined,
        }
      : undefined,
    doorTransition: object.doorTransition
      ? {
          ...object.doorTransition,
          flags: { ...object.doorTransition.flags },
          ...(object.doorTransition.storage
            ? { storage: cloneAreaDoorTransitionStorage(object.doorTransition.storage) }
            : {}),
          ...(object.doorTransition.extra ? { extra: { ...object.doorTransition.extra } } : {})
        }
      : undefined,
    soundPositioning: object.soundPositioning
      ? { ...object.soundPositioning }
      : undefined,
    soundIntervalVariation: object.soundIntervalVariation
      ? cloneAreaSoundIntervalVariationStorage(object.soundIntervalVariation)
      : undefined,
    soundVolume: object.soundVolume
      ? cloneAreaSoundVolumeStorage(object.soundVolume)
      : undefined,
    soundActive: object.soundActive
      ? cloneAreaSoundActiveStorage(object.soundActive)
      : undefined,
    encounterActive: object.encounterActive
      ? { ...object.encounterActive }
      : undefined,
    encounterPlayerOnly: object.encounterPlayerOnly
      ? { ...object.encounterPlayerOnly }
      : undefined,
    encounterReset: object.encounterReset ? { ...object.encounterReset } : undefined,
    encounterResetTime: object.encounterResetTime
      ? { ...object.encounterResetTime }
      : undefined,
    encounterSpawnOption: object.encounterSpawnOption
      ? { ...object.encounterSpawnOption }
      : undefined,
    encounterRespawns: object.encounterRespawns
      ? { ...object.encounterRespawns }
      : undefined,
    encounterCreatureCounts: object.encounterCreatureCounts
      ? { ...object.encounterCreatureCounts }
      : undefined,
    encounterScriptResRefs: object.encounterScriptResRefs
      ? cloneEncounterScriptResRefsStorage(object.encounterScriptResRefs)
      : undefined,
    encounterDifficulty: object.encounterDifficulty
      ? { ...object.encounterDifficulty }
      : undefined,
    encounterLocalizedName: object.encounterLocalizedName,
    triggerLocalizedName: object.triggerLocalizedName,
    triggerScriptResRefs: object.triggerScriptResRefs
      ? cloneTriggerScriptResRefsStorage(object.triggerScriptResRefs)
      : undefined,
    triggerTransitionStorage: object.triggerTransitionStorage
      ? cloneTriggerTransitionStorage(object.triggerTransitionStorage)
      : undefined,
    soundPlayOrder: object.soundPlayOrder
      ? cloneAreaSoundPlayOrderStorage(object.soundPlayOrder)
      : undefined,
    soundPlayStyle: object.soundPlayStyle
      ? cloneAreaSoundPlayStyleStorage(object.soundPlayStyle)
      : undefined,
    soundPlayback: object.soundPlayback
      ? cloneAreaSoundPlaybackStorage(object.soundPlayback)
      : undefined,
    soundProfile: object.soundProfile
      ? cloneAreaSoundProfileStorage(object.soundProfile)
      : undefined,
    soundSchedule: object.soundSchedule
      ? cloneAreaSoundScheduleStorage(object.soundSchedule)
      : undefined,
    vfxPayload: cloneSceneObjectVfxPayload(object.vfxPayload),
    ...(object.waypointMapNote
      ? { waypointMapNote: cloneWaypointMapNoteValue(object.waypointMapNote) }
      : {}),
    ...(object.waypointAppearance !== undefined
      ? { waypointAppearance: object.waypointAppearance }
      : {}),
    ...(object.waypointVariables
      ? { waypointVariables: object.waypointVariables.map((entry) => ({ ...entry })) }
      : {}),
  };
}
