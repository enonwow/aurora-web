import type { SceneObject } from "../contracts";
import { cloneSceneObjectVfxPayload } from "../../scene/domain/auroraVfxPayload";

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
            : undefined
        }
      : undefined,
    creatureProperties: object.creatureProperties
      ? {
          ...object.creatureProperties,
          statistics: object.creatureProperties.statistics
            ? {
                ...object.creatureProperties.statistics,
                abilityScores: { ...object.creatureProperties.statistics.abilityScores },
                racialModifiers: { ...object.creatureProperties.statistics.racialModifiers },
                saves: { ...object.creatureProperties.statistics.saves }
              }
            : undefined,
          appearanceSettings: object.creatureProperties.appearanceSettings
            ? { ...object.creatureProperties.appearanceSettings }
            : undefined,
          classEntries: object.creatureProperties.classEntries
            ? object.creatureProperties.classEntries.map((entry) => ({ ...entry }))
            : undefined,
          skills: object.creatureProperties.skills
            ? object.creatureProperties.skills.map((entry) => ({ ...entry }))
            : undefined,
          scriptSlots: object.creatureProperties.scriptSlots
            ? { ...object.creatureProperties.scriptSlots }
            : undefined,
          advancedSettings: object.creatureProperties.advancedSettings
            ? { ...object.creatureProperties.advancedSettings }
            : undefined,
          feats: object.creatureProperties.feats
            ? object.creatureProperties.feats.map((entry) => ({ ...entry }))
            : undefined,
          spells: object.creatureProperties.spells
            ? object.creatureProperties.spells.map((entry) => ({ ...entry }))
            : undefined,
          specialAbilities: object.creatureProperties.specialAbilities
            ? object.creatureProperties.specialAbilities.map((entry) => ({ ...entry }))
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
