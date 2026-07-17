import type { SceneObject } from "../contracts";
import type {
  SceneObjectEmbeddedItemSummary,
  SceneObjectCreatureProperties,
  SceneObjectItemProperties
} from "../../scene/contracts";
import { cloneSceneObjectVfxPayload } from "../../scene/domain/auroraVfxPayload";

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
        inventoryItems: properties.inventoryItems
          ? properties.inventoryItems.map((entry) => ({
              ...entry,
              embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem)
            }))
          : undefined,
        equippedItems: properties.equippedItems
          ? properties.equippedItems.map((entry) => ({
              ...entry,
              embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem)
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
        scripts: properties.scripts ? { ...properties.scripts } : undefined
      }
    : undefined;
}

export function cloneSceneObject(object: SceneObject): SceneObject {
  return {
    ...object,
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
            : undefined
        }
      : undefined,
    creatureProperties: cloneSceneObjectCreatureProperties(object.creatureProperties),
    itemProperties: cloneSceneObjectItemProperties(object.itemProperties),
    encounterProperties: object.encounterProperties
      ? {
          ...object.encounterProperties,
          creatureList: object.encounterProperties.creatureList
            ? object.encounterProperties.creatureList.map((entry) => ({ ...entry }))
            : undefined,
          scripts: object.encounterProperties.scripts
            ? { ...object.encounterProperties.scripts }
            : undefined
        }
      : undefined,
    doorTransition: object.doorTransition
      ? {
          ...object.doorTransition,
          flags: { ...object.doorTransition.flags },
          ...(object.doorTransition.extra ? { extra: { ...object.doorTransition.extra } } : {})
        }
      : undefined,
    soundPositioning: object.soundPositioning
      ? { ...object.soundPositioning }
      : undefined,
    vfxPayload: cloneSceneObjectVfxPayload(object.vfxPayload)
  };
}
