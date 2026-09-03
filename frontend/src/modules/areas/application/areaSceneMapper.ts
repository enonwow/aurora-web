import type {
  AreaScene,
  SceneObject,
  SceneObjectCreatureEquipmentSourceEntry,
  SceneObjectCreatureBodyBagProvenance,
  SceneObjectCreatureDecayTimeProvenance,
  SceneObjectCreatureFactionProvenance,
  SceneObjectCreatureTemplateResRefProvenance,
  SceneObjectCreatureSpecialIdentityStringsProvenance,
  SceneObjectCreatureScriptResRefsProvenance,
  SceneObjectCreatureInventorySourceEntry,
  SceneObjectCreatureProperties,
  SceneObjectCreatureVariableProvenance,
  SceneObjectEncounterCreatureListProvenance,
  SceneObjectEncounterSpawnPointListProvenance,
  SceneObjectEncounterVariableProvenance,
  SceneObjectWaypointVariableProvenance,
  SceneObjectItemProperties,
  SceneObjectItemPropertyListProvenance,
  SceneObjectItemVariableProvenance,
  SceneObjectStoreVariableProvenance,
  SceneObjectKind,
  SceneObjectPlaceableDurabilitySaveBytes,
  SceneObjectPlaceableLockSettings,
  SceneObjectPlaceableInventorySourceEntry,
  SceneObjectPlaceableProperties,
  SceneObjectPlaceableScriptSlots,
  SceneObjectPlaceableTrapByteSettings,
  SceneObjectPlaceableTrapSettings,
  SceneObjectPlaceableTrapTypeProvenance,
  SceneObjectPlaceableBodyBagProvenance,
  SceneObjectPlaceablePortraitProvenance,
  SceneObjectPlaceableFactionProvenance,
  SceneObjectPlaceableVariableProvenance,
  ScenePlaceableBodyBagCatalog,
  ScenePlaceablePortraitCatalog,
  SceneCreaturePortraitCatalog,
  ScenePlaceablePortraitRow,
  ScenePlaceableFactionCatalog,
  ScenePlaceableFactionRow,
  SceneEncounterDifficultyCatalog,
  ScenePlaceableTrapTypeCatalog,
  ScenePlaceableTrapTypeRow,
  SceneItemBaseItemCatalog,
  SceneTile,
  TerrainBrushKind
} from "../../scene/contracts";
import {
  createEmptyPlaceableScriptSlots,
  createDefaultPlaceableTrapSettings,
  normalizeSceneObjectMetadata
} from "../../scene/domain/sceneFactory";
import {
  PLACEABLE_LOCK_FIELD_MAPPINGS,
  isPlaceableLockFieldValue
} from "../../scene/domain/placeableLockFields";
import { isPlaceableKeyName } from "../../scene/domain/placeableKeyName";
import { readPlaceableInventorySourceEntries } from "../../scene/domain/placeableInventory";
import { readCreatureInventorySourceEntries } from "../../scene/domain/creatureInventory";
import {
  readCreatureEquipmentSourceEntries,
  sortCreatureEquipmentTargetEntries
} from "../../scene/domain/creatureEquipment";
import { readCreatureTagStorage } from "../../scene/domain/creatureTag";
import { readItemTagStorage } from "../../scene/domain/itemTag";
import { readTriggerTagStorage } from "../../scene/domain/triggerTag";
import { readTriggerTemplateResRefStorage } from
  "../../scene/domain/triggerTemplateResRef";
import {
  cloneTriggerLocalizedNameStorage,
  readTriggerLocalizedNameInlineAsciiStorage,
  readTriggerLocalizedNameStorage,
} from "../../scene/domain/triggerLocalizedName";
import { readEncounterTagStorage } from "../../scene/domain/encounterTag";
import { readEncounterTemplateResRefStorage } from
  "../../scene/domain/encounterTemplateResRef";
import { readWaypointTagStorage } from "../../scene/domain/waypointTag";
import { readWaypointTemplateResRefStorage } from
  "../../scene/domain/waypointTemplateResRef";
import {
  cloneWaypointLocalizedNameStorage,
  readWaypointLocalizedNameInlineAsciiStorage,
  readWaypointLocalizedNameStorage,
} from "../../scene/domain/waypointLocalizedName";
import {
  cloneWaypointDescriptionStorage,
  readWaypointDescriptionInlineAsciiStorage,
  readWaypointDescriptionStorage,
} from "../../scene/domain/waypointDescription";
import {
  cloneWaypointMapNoteStorage,
  cloneWaypointMapNoteValue,
  readWaypointMapNoteInlineAsciiValue,
  readWaypointMapNoteStorage,
} from "../../scene/domain/waypointMapNote";
import { readWaypointEditorComment } from "../../scene/domain/waypointEditorComment";
import { readTriggerEditorComment } from "../../scene/domain/triggerEditorComment";
import {
  cloneTriggerScriptResRefsStorage,
  readTriggerScriptResRefsStorage,
} from "../../scene/domain/triggerScriptResRefs";
import {
  cloneTriggerTransitionStorage,
  isTriggerTransitionStorage,
} from "../../scene/domain/triggerTransitionStorage";
import {
  cloneEncounterActiveStorage,
  readEncounterActiveStorage,
} from "../../scene/domain/encounterActive";
import {
  cloneEncounterPlayerOnlyStorage,
  readEncounterPlayerOnlyStorage,
} from "../../scene/domain/encounterPlayerOnly";
import {
  cloneEncounterResetStorage,
  readEncounterResetStorage,
} from "../../scene/domain/encounterReset";
import {
  cloneEncounterResetTimeStorage,
  readEncounterResetTimeStorage,
} from "../../scene/domain/encounterResetTime";
import {
  cloneEncounterSpawnOptionStorage,
  readEncounterSpawnOptionStorage,
} from "../../scene/domain/encounterSpawnOption";
import {
  cloneEncounterRespawnsStorage,
  readEncounterRespawnsStorage,
} from "../../scene/domain/encounterRespawns";
import {
  cloneEncounterCreatureCountStorage,
  readEncounterCreatureCountStorage,
} from "../../scene/domain/encounterCreatureCounts";
import {
  cloneEncounterScriptResRefsStorage,
  readEncounterScriptResRefsStorage,
} from "../../scene/domain/encounterScriptResRefs";
import { readEncounterFactionBinding } from "../../scene/domain/encounterFaction";
import {
  readEncounterDifficultyBinding,
  readEncounterDifficultyCatalog,
} from "../../scene/domain/encounterDifficulty";
import {
  cloneEncounterLocalizedNameStorage,
  readEncounterLocalizedNameInlineAsciiStorage,
  readEncounterLocalizedNameStorage,
} from "../../scene/domain/encounterLocalizedName";
import { readEncounterEditorComment } from "../../scene/domain/encounterEditorComment";
import { readItemTemplateResRefStorage } from "../../scene/domain/itemTemplateResRef";
import {
  cloneItemVisualTransformStorage,
  readItemVisualTransformStorage,
} from "../../scene/domain/itemVisualTransform";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  cloneItemLocalizedStrings,
  readItemLocalizedStringInlineAsciiStorage,
  readItemLocalizedStrings,
} from "../../scene/domain/itemLocalizedStrings";
import { readCreatureConversationStorage } from "../../scene/domain/creatureConversation";
import {
  creatureInterruptableToNoInterrupt,
  readCreatureInterruptableStorage,
} from "../../scene/domain/creatureInterruptable";
import {
  creatureAdvancedFlagToBoolean,
  readCreatureAdvancedFlagsStorage,
} from "../../scene/domain/creatureAdvancedFlags";
import {
  creatureDecayMillisecondsToSeconds,
  readCreatureBodyBagBinding,
  readCreatureDecayTimeBinding,
} from "../../scene/domain/creatureDeathRemains";
import { readCreatureAppearanceStorage } from "../../scene/domain/creatureAppearance";
import { readCreatureGenderStorage } from "../../scene/domain/creatureGender";
import { readCreaturePerceptionRangeStorage } from
  "../../scene/domain/creaturePerceptionRange";
import { readCreatureWalkRateStorage } from "../../scene/domain/creatureWalkRate";
import { readCreatureSoundSetFileStorage } from "../../scene/domain/creatureSoundSetFile";
import { readCreatureStartingPackageStorage } from
  "../../scene/domain/creatureStartingPackage";
import { readCreatureSkillListStorage } from "../../scene/domain/creatureSkillList";
import { readCreatureFeatListStorage } from "../../scene/domain/creatureFeatList";
import {
  groupCanonicalCreatureSpecialAbilityEntries,
  readCreatureSpecialAbilityListStorage,
} from "../../scene/domain/creatureSpecialAbilityList";
import { readCreatureVariableProvenance } from "../../scene/domain/creatureVariableTable";
import { readEncounterVariableProvenance } from "../../scene/domain/encounterVariableTable";
import { readWaypointVariableProvenance } from "../../scene/domain/waypointVariableTable";
import { readEncounterCreatureListProvenance } from
  "../../scene/domain/encounterCreatureSingleSpawn";
import {
  readEncounterSpawnPointListProvenance,
  sourceEncounterSpawnPointsToTarget,
} from "../../scene/domain/encounterSpawnPointList";
import { readCreatureClassLevelState } from "../../scene/domain/creatureClassLevels";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";
import { readCreaturePhenotypeStorage } from "../../scene/domain/creaturePhenotype";
import {
  readCreaturePortraitCatalog,
  readCreaturePortraitStorage,
} from "../../scene/domain/creaturePortrait";
import { readCreatureChallengeRatingStorage } from "../../scene/domain/creatureChallengeRating";
import {
  CREATURE_ABILITY_SCORE_FIELDS,
  readCreatureAbilityScoresStorage,
} from "../../scene/domain/creatureAbilityScores";
import {
  CREATURE_APPEARANCE_COLOR_FIELDS,
  readCreatureAppearanceColorsStorage,
} from "../../scene/domain/creatureAppearanceColors";
import {
  CREATURE_BODY_PART_FIELDS,
  readCreatureBodyPartsStorage,
} from "../../scene/domain/creatureBodyParts";
import { readCreatureAppendagesStorage } from "../../scene/domain/creatureAppendages";
import {
  calculateCreatureHitPoints,
  readCreatureHitPointState,
} from "../../scene/domain/creatureHitPoints";
import { readCreatureNaturalArmorClassStorage } from "../../scene/domain/creatureNaturalArmorClass";
import {
  CREATURE_SAVING_THROW_BONUS_FIELDS,
  readCreatureSavingThrowBonusesStorage,
} from "../../scene/domain/creatureSavingThrowBonuses";
import {
  readCreatureAlignmentStorage,
  resolveCreatureAlignmentLabel,
} from "../../scene/domain/creatureAlignment";
import { readCreatureFactionBinding } from "../../scene/domain/creatureFaction";
import { readCreatureTemplateResRefStorage } from "../../scene/domain/creatureTemplateResRef";
import { readCreatureSpecialIdentityStringsStorage } from "../../scene/domain/creatureSpecialIdentityStrings";
import {
  CREATURE_SCRIPT_RESREF_FIELDS,
  readCreatureScriptResRefsStorage,
  type CreatureScriptResRefsStorage,
} from "../../scene/domain/creatureScriptResRefs";
import {
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  cloneCreatureNameLocalizedStrings,
  readCreatureNameInlineAsciiStorage,
  readCreatureNameLocalizedStrings,
} from "../../scene/domain/creatureNameLocalizedStrings";
import { readPlaceableDurabilitySaveBytes } from "../../scene/domain/placeableDurabilitySaveBytes";
import {
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
} from "../../shared/domain/areaDoorTransitionStorage";
import {
  cloneAreaSoundIntervalVariationStorage,
  readAreaSoundIntervalVariationStorage,
} from "../domain/areaSoundIntervalVariationStorage";
import {
  cloneAreaSoundVolumeStorage,
  readAreaSoundVolumeStorage,
} from "../domain/areaSoundVolumeStorage";
import {
  cloneAreaSoundActiveStorage,
  readAreaSoundActiveStorage,
} from "../domain/areaSoundActiveStorage";
import {
  cloneAreaSoundPlayOrderStorage,
  readAreaSoundPlayOrderStorage,
} from "../domain/areaSoundPlayOrderStorage";
import {
  cloneAreaSoundPlayStyleStorage,
  readAreaSoundPlayStyleStorage,
} from "../domain/areaSoundPlayStyleStorage";
import {
  cloneAreaSoundPlaybackStorage,
  readAreaSoundPlaybackStorage,
} from "../domain/areaSoundPlaybackStorage";
import {
  areaSoundProfilePresentationFromStorage,
  cloneAreaSoundProfileStorage,
  readAreaSoundProfileStorage,
} from "../domain/areaSoundProfileStorage";
import {
  cloneAreaSoundScheduleStorage,
  readAreaSoundScheduleStorage,
} from "../domain/areaSoundScheduleStorage";
import {
  projectPlaceableNoInterrupt,
  readPlaceableConversation,
  readPlaceableInterruptable,
  type PlaceableInterruptable
} from "../../scene/domain/placeableConversationInterruptable";
import {
  PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  readPlaceableTrapByteSettings
} from "../../scene/domain/placeableTrapByteFields";
import {
  projectPlaceableAnimationStateToken,
  readPlaceableAnimationState,
  type PlaceableAnimationState
} from "../../scene/domain/placeableAnimationState";
import { readPlaceableEditorComment } from "../../scene/domain/placeableEditorComment";
import { readCreatureEditorComment } from "../../scene/domain/creatureEditorComment";
import { readItemEditorComment } from "../../scene/domain/itemEditorComment";
import { readStoreEditorComment } from "../../scene/domain/storeEditorComment";
import {
  cloneAreaStoreCommerceValue,
  readAreaStoreCommerceValue,
} from "../../scene/domain/storeCommerce";
import {
  cloneAreaStoreScriptResRefsValue,
  readAreaStoreScriptResRefsValue,
} from "../../scene/domain/storeScriptResRefs";
import { readStoreVariableProvenance } from "../../scene/domain/storeVariableTable";
import {
  bindStoreRestrictionsProvenanceToCatalog,
  cloneStoreRestrictionsProvenance,
  cloneStoreRestrictionsTarget,
} from "../../scene/domain/storeRestrictions";
import {
  bindStoreInventoryProvenanceToCatalog,
  cloneStoreInventoryProvenance,
  cloneStoreInventoryTargetBuckets,
  storeInventoryTargetFromProvenance,
} from "../../scene/domain/storeInventory";
import {
  cloneItemInstanceStateStorage,
  readItemInstanceStateStorage,
} from "../../scene/domain/itemInstanceState";
import { readItemVariableProvenance } from "../../scene/domain/itemVariableTable";
import { readItemPropertyListProvenance } from "../../scene/domain/itemPropertyList";
import { readItemInventorySourceEntries } from "../../scene/domain/itemInventory";
import {
  bindItemBaseAppearanceProvenanceToCatalog,
  cloneItemBaseAppearanceProvenance,
  projectItemBaseAppearanceToProperties,
  readItemBaseItemCatalog,
} from "../../scene/domain/itemBaseAppearance";
import { readPlaceableBasicIdentity } from "../../scene/domain/placeableBasicIdentity";
import {
  readPlaceableTrapTypeBinding,
  readPlaceableTrapTypeCatalog,
} from "../../scene/domain/placeableTrapType";
import {
  readPlaceableBodyBagBinding,
  readPlaceableBodyBagCatalog,
} from "../../scene/domain/placeableBodyBag";
import { readPlaceableTemplateResRef } from "../../scene/domain/placeableTemplateResRef";
import {
  readPlaceablePortraitBinding,
  readPlaceablePortraitCatalog,
} from "../../scene/domain/placeablePortrait";
import {
  readPlaceableFactionBinding,
  readPlaceableFactionCatalog,
} from "../../scene/domain/placeableFaction";
import { readPlaceableVariableProvenance } from "../../scene/domain/placeableVariableTable";
import { readAuroraVariableProvenance } from "../../shared/domain/auroraVariableTable";
import {
  MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  readPlaceableInlineAsciiStorage,
  readPlaceableLocalizedStrings
} from "../../scene/domain/placeableLocalizedStrings";
import {
  readPlaceableHitPointState,
  type PlaceableHitPointState
} from "../../scene/domain/placeableHitPoints";
import { mapCreatureApiListItemToSceneObject } from "../../creatures/application/creatureSceneObjectMapper";
import type {
  AreaApiCreatureMetadataPrimitive,
  AreaApiDetail,
  AreaApiObjectKind,
  AreaApiTileInstance
} from "../contracts";
import { isAreaCommentsValue } from "../domain/areaComments";
import {
  cloneAreaObjectPolygonGeometry,
  isAreaObjectPolygonGeometry,
} from "../domain/areaObjectPolygonGeometry";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  type AreaEventScripts,
} from "../domain/areaEventScripts";
import {
  cloneAreaNameStorageEntries,
  isAreaNameStorageProfile,
  isEditableAreaName,
  isEditableAreaTag,
  readEditableAreaNameEntries,
  type AreaBasicIdentity,
} from "../domain/areaBasicIdentity";
import {
  isAreaAdvancedFlags,
  type AreaAdvancedFlags,
} from "../domain/areaAdvancedFlags";
import { isAreaAudioEnvironment } from "../domain/areaAudioEnvironment";
import {
  cloneAreaVisualEnvironment,
  isAreaVisualEnvironment,
} from "../domain/areaVisualEnvironment";
import {
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
} from "../domain/areaVisualEnvironmentScalarControls";
import {
  cloneEffectiveAreaAudioCatalogBundle,
  isEffectiveAreaAudioCatalogBundle,
} from "../domain/effectiveAreaAudioCatalog";
import {
  cloneEffectiveAreaVisualEnvironmentCatalogBundle,
  isEffectiveAreaVisualEnvironmentCatalogBundle,
} from "../domain/effectiveAreaVisualEnvironmentCatalog";
import {
  cloneAreaVisualEnvironmentCatalogSelection,
  isAreaVisualEnvironmentCatalogSelection,
} from "../domain/areaVisualEnvironmentCatalogSelection";
import {
  cloneEffectiveAreaLoadingScreenCatalog,
  isEffectiveAreaLoadingScreenCatalog,
} from "../domain/effectiveAreaLoadingScreenCatalog";
import {
  isAreaModuleStartLocation,
  readModuleStartLocationTargets,
} from "../domain/areaModuleStartLocation";

const AURORA_TILE_TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

const BACKEND_KIND_TO_SCENE_KIND: Record<AreaApiObjectKind, SceneObjectKind> = {
  placeable: "placeables",
  door: "doors",
  creature: "creatures",
  encounter: "encounters",
  item: "items",
  sound: "sounds",
  store: "stores",
  trigger: "triggers",
  waypoint: "waypoints"
};

const RADIANS_PER_DEGREE = Math.PI / 180;
type AreaCreatureMetadata = Record<string, AreaApiCreatureMetadataPrimitive>;
type AreaPlaceableMetadata = Record<string, AreaApiCreatureMetadataPrimitive>;
type AreaItemMetadata = Record<string, AreaApiCreatureMetadataPrimitive>;

const AREA_PLACEABLE_SCRIPT_METADATA_MAPPINGS = [
  ["script.onClick", "onClick"],
  ["script.onClosed", "onClosed"],
  ["script.onDamaged", "onDamaged"],
  ["script.onDeath", "onDeath"],
  ["script.onHeartbeat", "onHeartbeat"],
  ["script.onInventoryDisturbed", "onInvDisturbed"],
  ["script.onLock", "onLock"],
  ["script.onMeleeAttacked", "onMeleeAttacked"],
  ["script.onOpen", "onOpen"],
  ["script.onSpellCastAt", "onSpellCastAt"],
  ["script.onUnlock", "onUnlock"],
  ["script.onUserDefined", "onUserDefined"]
] as const;

type AreaPlaceableScriptResRefs = Partial<
  Omit<SceneObjectPlaceableScriptSlots, "onUsed">
>;
type AreaPlaceableTrapScriptResRefs = Partial<
  Pick<SceneObjectPlaceableTrapSettings, "onDisarmScript" | "onTrapTriggeredScript">
>;
type AreaPlaceableLockSettings = Partial<SceneObjectPlaceableLockSettings>;

const CREATURE_LOOKUP_PROFILE_METADATA_KEYS = [
  "raceLabelSource2daRow",
  "raceLabelSourceKey",
  "genderLabelSource2daRow",
  "genderLabelSourceKey",
  "portraitResolvedSource2daRow",
  "portraitResolvedSourceKey",
  "soundSetResRef",
  "soundSetSource2daRow",
  "soundSetSourceKey"
] as const;

const CREATURE_LIST_COUNT_METADATA_KEYS = [
  "classListCount",
  "skillListCount",
  "featListCount",
  "templateListCount",
  "specAbilityListCount",
  "inventoryItemListCount",
  "equipItemListCount"
] as const;

const CREATURE_LOCALIZED_STRING_REF_METADATA_KEYS = [
  "firstNameStrRef",
  "lastNameStrRef",
  "localizedNameStrRef",
  "descriptionStrRef",
  "identifiedDescriptionStrRef",
  "subraceStrRef",
  "deityStrRef"
] as const;

const CREATURE_LOCALIZED_STRING_METADATA_KEYS = [
  "localizedName",
  "displayName",
  "identifiedDescription"
] as const;

export interface AreaSceneMapperOptions {
  creatureTemplateObjects?: readonly SceneObject[];
  objectTemplateObjects?: readonly SceneObject[];
}

const AREA_OBJECT_TEMPLATE_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "doors",
  "items"
]);

const DEFAULT_VISUAL_TRANSFORM: SceneObject["visualTransform"] = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  offsetZ: 0,
  pitch: 0,
  roll: 0,
  yaw: 0
};

function hasNonDefaultVisualTransform(transform: SceneObject["visualTransform"]): boolean {
  const scaleX = transform.scaleX ?? transform.scale;
  const scaleY = transform.scaleY ?? transform.scale;
  const scaleZ = transform.scaleZ ?? transform.scale;
  return (
    Math.abs(scaleX - 1) > 1e-6 ||
    Math.abs(scaleY - 1) > 1e-6 ||
    Math.abs(scaleZ - 1) > 1e-6 ||
    Math.abs(transform.offsetX) > 1e-6 ||
    Math.abs(transform.offsetY) > 1e-6 ||
    Math.abs(transform.offsetZ) > 1e-6 ||
    Math.abs(transform.pitch) > 1e-6 ||
    Math.abs(transform.roll) > 1e-6 ||
    Math.abs(transform.yaw) > 1e-6
  );
}

function resolveAreaPlaceableStaticFlag(
  entry: AreaApiDetail["objects"][number],
  templateObject: SceneObject | undefined,
  visualTransform: SceneObject["visualTransform"]
): boolean {
  if (hasNonDefaultVisualTransform(visualTransform)) {
    return false;
  }
  return entry.isStatic ?? templateObject?.isStatic ?? true;
}

function toSceneBearingRadians(bearingDegrees: number): number {
  if (!Number.isFinite(bearingDegrees)) {
    return 0;
  }
  return (((bearingDegrees % 360) + 360) % 360) * RADIANS_PER_DEGREE;
}

function toSceneObject(
  areaId: string,
  entry: AreaApiDetail["objects"][number],
  creatureTemplateLookup: ReadonlyMap<string, SceneObject>,
  objectTemplateLookup: ReadonlyMap<string, SceneObject>,
  placeableTrapTypeCatalog: ScenePlaceableTrapTypeCatalog | null,
  placeableBodyBagCatalog: ScenePlaceableBodyBagCatalog | null,
  placeablePortraitCatalog: ScenePlaceablePortraitCatalog | null,
  creaturePortraitCatalog: SceneCreaturePortraitCatalog | null,
  placeableFactionCatalog: ScenePlaceableFactionCatalog | null,
  encounterDifficultyCatalog: SceneEncounterDifficultyCatalog | null,
  itemBaseItemCatalog: SceneItemBaseItemCatalog | null,
): SceneObject {
  const sceneKind = BACKEND_KIND_TO_SCENE_KIND[entry.kind];
  const itemTemplateResRef = sceneKind === "items"
    ? readItemTemplateResRefStorage(entry.itemTemplateResRef)
    : null;
  const sourceResRef = itemTemplateResRef?.present === true
    ? itemTemplateResRef.value
    : entry.resRef?.trim() || entry.templateId;
  const templateObject = resolveAreaObjectTemplateObject(
    entry,
    sceneKind,
    sourceResRef,
    objectTemplateLookup
  );
  const templateCreature =
    sceneKind === "creatures"
      ? resolveCreatureTemplateObject(entry, sourceResRef, creatureTemplateLookup)
      : undefined;
  const mappedCreature =
    sceneKind === "creatures" && entry.creatureMetadata
      ? mapCreatureApiListItemToSceneObject(
          {
            templateId: entry.templateId,
            resref: sourceResRef,
            name:
              typeof entry.creatureMetadata.firstName === "string" &&
              entry.creatureMetadata.firstName.trim().length > 0
                ? entry.creatureMetadata.firstName.trim()
                : entry.templateId,
            category: "area-git",
            tags: ["area-git"],
            previewImageUrl: "",
            metadata: {
              ...entry.creatureMetadata,
              templateResRef:
                typeof entry.creatureMetadata.templateResRef === "string"
                  ? entry.creatureMetadata.templateResRef
                  : sourceResRef
            }
          },
          1
        )
      : undefined;
  const creatureInventoryItems: readonly SceneObjectCreatureInventorySourceEntry[] | undefined =
    sceneKind === "creatures"
      ? readCreatureInventorySourceEntries(
          entry.creatureMetadata?.inventoryItemListEntries,
          entry.creatureMetadata?.inventoryItemListCount
        )
      : undefined;
  const creatureEquippedItems: readonly SceneObjectCreatureEquipmentSourceEntry[] | undefined =
    sceneKind === "creatures"
      ? readCreatureEquipmentSourceEntries(
          entry.creatureMetadata?.equipItemListMutationEntries,
          entry.creatureMetadata?.equipItemListCount
        )
      : undefined;
  const creatureEquipmentTargets = creatureEquippedItems !== undefined
    ? sortCreatureEquipmentTargetEntries(creatureEquippedItems)
    : undefined;
  const creatureTag = sceneKind === "creatures"
    ? readCreatureTagStorage(entry.creatureTag)
    : null;
  const exactCreatureTag = creatureTag?.present === true
    ? creatureTag.value
    : undefined;
  const creatureConversation = sceneKind === "creatures"
    ? readCreatureConversationStorage(entry.creatureConversation)
    : null;
  const creatureInterruptable = sceneKind === "creatures"
    ? readCreatureInterruptableStorage(entry.creatureInterruptable)
    : null;
  const creatureAdvancedFlags = sceneKind === "creatures"
    ? readCreatureAdvancedFlagsStorage(entry.creatureAdvancedFlags)
    : null;
  const creatureBodyBag: SceneObjectCreatureBodyBagProvenance | null =
    sceneKind === "creatures"
      ? readCreatureBodyBagBinding(entry.creatureBodyBag, placeableBodyBagCatalog)
      : null;
  const creatureDecayTime: SceneObjectCreatureDecayTimeProvenance | null =
    sceneKind === "creatures"
      ? readCreatureDecayTimeBinding(entry.creatureDecayTime)
      : null;
  const creatureAppearance = sceneKind === "creatures"
    ? readCreatureAppearanceStorage(entry.creatureAppearance)
    : null;
  const creatureGender = sceneKind === "creatures"
    ? readCreatureGenderStorage(entry.creatureGender)
    : null;
  const creaturePerceptionRange = sceneKind === "creatures"
    ? readCreaturePerceptionRangeStorage(entry.creaturePerceptionRange)
    : null;
  const creatureWalkRate = sceneKind === "creatures"
    ? readCreatureWalkRateStorage(entry.creatureWalkRate)
    : null;
  const creatureSoundSetFile = sceneKind === "creatures"
    ? readCreatureSoundSetFileStorage(entry.creatureSoundSetFile)
    : null;
  const creatureStartingPackage = sceneKind === "creatures"
    ? readCreatureStartingPackageStorage(entry.creatureStartingPackage)
    : null;
  const creatureSkillList = sceneKind === "creatures"
    ? readCreatureSkillListStorage(entry.creatureSkillList)
    : null;
  const creatureFeatList = sceneKind === "creatures"
    ? readCreatureFeatListStorage(entry.creatureFeatList)
    : null;
  const creatureSpecialAbilityList = sceneKind === "creatures"
    ? readCreatureSpecialAbilityListStorage(entry.creatureSpecialAbilityList)
    : null;
  const creatureVariables: SceneObjectCreatureVariableProvenance | null =
    sceneKind === "creatures"
      ? readCreatureVariableProvenance(entry.creatureVariables)
      : null;
  const creatureEditorComment = sceneKind === "creatures"
    ? readCreatureEditorComment(entry.creatureMetadata)
    : undefined;
  const creatureClassLevelState = sceneKind === "creatures"
    ? readCreatureClassLevelState(entry.creatureClassLevelState)
    : null;
  const creatureClassIdentityState = sceneKind === "creatures"
    ? readCreatureClassIdentityState(entry.creatureClassIdentityState)
    : null;
  const creaturePhenotype = sceneKind === "creatures"
    ? readCreaturePhenotypeStorage(entry.creaturePhenotype)
    : null;
  const creaturePortrait = sceneKind === "creatures"
    ? readCreaturePortraitStorage(entry.creaturePortrait)
    : null;
  const creatureChallengeRating = sceneKind === "creatures"
    ? readCreatureChallengeRatingStorage(entry.creatureChallengeRating)
    : null;
  const creatureAbilityScores = sceneKind === "creatures"
    ? readCreatureAbilityScoresStorage(entry.creatureAbilityScores)
    : null;
  const creatureAppearanceColors = sceneKind === "creatures"
    ? readCreatureAppearanceColorsStorage(entry.creatureAppearanceColors)
    : null;
  const creatureBodyParts = sceneKind === "creatures"
    ? readCreatureBodyPartsStorage(entry.creatureBodyParts)
    : null;
  const creatureAppendages = sceneKind === "creatures"
    ? readCreatureAppendagesStorage(entry.creatureAppendages)
    : null;
  const creatureHitPointState = sceneKind === "creatures"
    ? readCreatureHitPointState(entry.creatureHitPointState)
    : null;
  const creatureNaturalArmorClass = sceneKind === "creatures"
    ? readCreatureNaturalArmorClassStorage(entry.creatureNaturalArmorClass)
    : null;
  const creatureSavingThrowBonuses = sceneKind === "creatures"
    ? readCreatureSavingThrowBonusesStorage(entry.creatureSavingThrowBonuses)
    : null;
  const creatureAlignment = sceneKind === "creatures"
    ? readCreatureAlignmentStorage(entry.creatureAlignment)
    : null;
  const creatureAlignmentLabel =
    creatureAlignment?.goodEvil.present === true &&
    creatureAlignment.lawfulChaotic.present === true
      ? resolveCreatureAlignmentLabel(
          creatureAlignment.goodEvil.value,
          creatureAlignment.lawfulChaotic.value,
        )
      : null;
  const creatureFaction: SceneObjectCreatureFactionProvenance | null =
    sceneKind === "creatures"
      ? readCreatureFactionBinding(entry.creatureFaction, placeableFactionCatalog)
      : null;
  const creatureFactionRow: ScenePlaceableFactionRow | undefined = creatureFaction
    ? placeableFactionCatalog?.rows.find((row) => row.factionId === creatureFaction.expectedValue)
    : undefined;
  const creatureTemplateResRefStorage = sceneKind === "creatures"
    ? readCreatureTemplateResRefStorage(entry.creatureTemplateResRef)
    : null;
  const creatureTemplateResRef: SceneObjectCreatureTemplateResRefProvenance | null =
    creatureTemplateResRefStorage?.present === true
      ? Object.freeze({ expectedResRef: creatureTemplateResRefStorage.value })
      : null;
  const creatureSpecialIdentityStringsStorage = sceneKind === "creatures"
    ? readCreatureSpecialIdentityStringsStorage(entry.creatureSpecialIdentityStrings)
    : null;
  const creatureSpecialIdentityStrings:
    SceneObjectCreatureSpecialIdentityStringsProvenance | null =
    creatureSpecialIdentityStringsStorage &&
      (creatureSpecialIdentityStringsStorage.subrace.present === true ||
        creatureSpecialIdentityStringsStorage.deity.present === true)
      ? Object.freeze({
          ...(creatureSpecialIdentityStringsStorage.subrace.present === true
            ? {
                subrace: Object.freeze({
                  expectedValue: creatureSpecialIdentityStringsStorage.subrace.value,
                }),
              }
            : {}),
          ...(creatureSpecialIdentityStringsStorage.deity.present === true
            ? {
                deity: Object.freeze({
                  expectedValue: creatureSpecialIdentityStringsStorage.deity.value,
                }),
              }
            : {}),
        })
      : null;
  const creatureScriptResRefsStorage = sceneKind === "creatures"
    ? readCreatureScriptResRefsStorage(entry.creatureScriptResRefs)
    : null;
  const creatureScriptResRefs = creatureScriptResRefsStorage
    ? buildCreatureScriptResRefsProvenance(creatureScriptResRefsStorage)
    : null;
  const creatureLocalizedStrings = sceneKind === "creatures"
    ? readCreatureNameLocalizedStrings(entry.creatureLocalizedStrings)
    : undefined;
  const exactCreatureFirstName = readCreatureNameInlineAsciiStorage(
    creatureLocalizedStrings?.firstName,
    MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  );
  const exactCreatureLastName = readCreatureNameInlineAsciiStorage(
    creatureLocalizedStrings?.lastName,
    MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  );
  const exactCreatureDescription = readCreatureNameInlineAsciiStorage(
    creatureLocalizedStrings?.description,
    MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  );
  const creatureProperties = mergeAreaCreatureProperties(
    templateCreature?.creatureProperties,
    mappedCreature?.creatureProperties,
    entry.creatureMetadata
  );
  if (creatureProperties && creatureInventoryItems !== undefined) {
    creatureProperties.inventoryItems = creatureInventoryItems.map((inventoryItem) => ({
      ...inventoryItem
    }));
  }
  if (creatureProperties && creatureEquipmentTargets !== undefined) {
    creatureProperties.equippedItems = creatureEquipmentTargets.map((equipmentItem) => ({
      ...equipmentItem
    }));
  }
  if (creatureProperties && exactCreatureFirstName !== undefined) {
    creatureProperties.firstName = exactCreatureFirstName;
  }
  if (creatureProperties && exactCreatureLastName !== undefined) {
    creatureProperties.lastName = exactCreatureLastName;
  }
  if (creatureProperties && exactCreatureDescription !== undefined) {
    creatureProperties.description = exactCreatureDescription;
  }
  if (creatureProperties && creatureEditorComment !== undefined) {
    creatureProperties.comments = creatureEditorComment;
  }
  if (creatureProperties && creatureConversation?.present === true) {
    creatureProperties.conversation = creatureConversation.value;
  }
  if (creatureProperties && creatureInterruptable?.present === true) {
    creatureProperties.noInterrupt =
      creatureInterruptableToNoInterrupt(creatureInterruptable.value)!;
  }
  if (creatureProperties?.advancedSettings && creatureAdvancedFlags) {
    const settings = creatureProperties.advancedSettings;
    if (creatureAdvancedFlags.disarmable.present) {
      settings.disarmable = creatureAdvancedFlagToBoolean(
        creatureAdvancedFlags.disarmable.value,
      )!;
    }
    if (creatureAdvancedFlags.plot.present) {
      settings.plot = creatureAdvancedFlagToBoolean(creatureAdvancedFlags.plot.value)!;
    }
    if (creatureAdvancedFlags.immortal.present) {
      settings.immortal = creatureAdvancedFlagToBoolean(
        creatureAdvancedFlags.immortal.value,
      )!;
    }
    if (creatureAdvancedFlags.lootable.present) {
      settings.leavesLootableCorpse = creatureAdvancedFlagToBoolean(
        creatureAdvancedFlags.lootable.value,
      )!;
    }
    if (creatureAdvancedFlags.noPermanentDeath.present) {
      settings.noPermanentDeath = creatureAdvancedFlagToBoolean(
        creatureAdvancedFlags.noPermanentDeath.value,
      )!;
    }
  }
  if (creatureProperties?.advancedSettings && creatureBodyBag) {
    creatureProperties.advancedSettings.treasureModelRow = creatureBodyBag.expectedValue;
  }
  if (creatureProperties?.advancedSettings && creatureDecayTime) {
    creatureProperties.advancedSettings.corpseDecayTimeSeconds =
      creatureDecayMillisecondsToSeconds(creatureDecayTime.expectedMilliseconds)!;
  }
  if (creatureProperties && creatureAppearance?.present === true && creatureAppearance.table) {
    creatureProperties.appearanceType = creatureAppearance.value;
  }
  if (creatureProperties && creatureGender?.present === true && creatureGender.table) {
    creatureProperties.genderId = creatureGender.value;
  }
  if (creatureProperties?.advancedSettings &&
    creaturePerceptionRange?.present === true && creaturePerceptionRange.table) {
    creatureProperties.advancedSettings.perceptionRangeId = creaturePerceptionRange.value;
  }
  if (creatureProperties?.advancedSettings &&
    creatureWalkRate?.present === true && creatureWalkRate.table) {
    creatureProperties.advancedSettings.walkRateId = creatureWalkRate.value;
    if (creatureProperties.statistics) {
      creatureProperties.statistics.movementRate = String(creatureWalkRate.value);
    }
  }
  if (creatureProperties?.advancedSettings &&
    creatureSoundSetFile?.present === true && creatureSoundSetFile.table) {
    creatureProperties.advancedSettings.soundSetFile = creatureSoundSetFile.value;
  }
  if (creatureProperties?.advancedSettings && creatureStartingPackage?.present === true &&
    creatureStartingPackage.classIds && creatureStartingPackage.table) {
    creatureProperties.advancedSettings.startingPackageId = creatureStartingPackage.value;
  }
  if (creatureProperties && creatureSkillList?.present === true && creatureSkillList.table) {
    const labels = new Map(
      (creatureProperties.skills ?? []).flatMap((skill) =>
        Number.isSafeInteger(skill.skillId) && Number(skill.skillId) >= 0
          ? [[Number(skill.skillId), skill.skill] as const]
          : []),
    );
    creatureProperties.skills = Array.from(
      { length: creatureSkillList.table.rowCount },
      (_, skillId) => ({
        skillId,
        skill: labels.get(skillId) ?? `Skill ${skillId + 1}`,
        rank: creatureSkillList.ranks[skillId] ?? 0,
      }),
    );
  }
  if (creatureProperties && creatureFeatList?.present === true && creatureFeatList.table) {
    const labels = new Map(
      (creatureProperties.feats ?? []).flatMap((feat) =>
        Number.isSafeInteger(feat.featId) && Number(feat.featId) >= 0
          ? [[Number(feat.featId), feat.name] as const]
          : []),
    );
    creatureProperties.feats = creatureFeatList.featIds.map((featId) => ({
      featId,
      name: labels.get(featId) ?? `Feat ${featId}`,
      type: "",
      assigned: true,
    }));
  }
  if (creatureProperties && creatureSpecialAbilityList?.present === true &&
    creatureSpecialAbilityList.table) {
    const profile = groupCanonicalCreatureSpecialAbilityEntries(
      creatureSpecialAbilityList.entries,
    );
    if (profile) {
      const labels = new Map(
        (creatureProperties.specialAbilities ?? []).flatMap((ability) =>
          Number.isSafeInteger(ability.spellId) && Number(ability.spellId) >= 0
            ? [[Number(ability.spellId), ability] as const]
            : []),
      );
      creatureProperties.specialAbilities = profile.map((ability) => ({
        spellId: ability.spellId,
        name: labels.get(ability.spellId)?.name ?? `Special Ability ${ability.spellId}`,
        type: labels.get(ability.spellId)?.type ?? "",
        casterLevel: ability.casterLevel,
        uses: ability.uses,
      }));
    }
  }
  if (creatureProperties && creatureVariables) {
    creatureProperties.variables = creatureVariables.expectedEntries.map(
      ({ sourceIndex: _, ...variable }) => ({ ...variable }),
    );
  }
  const authoritativeCreatureClassEntries = creatureClassIdentityState?.present === true
    ? creatureClassIdentityState.entries
    : creatureClassLevelState?.present === true
      ? creatureClassLevelState.entries
      : null;
  if (creatureProperties && authoritativeCreatureClassEntries) {
    const labels = new Map(
      (creatureProperties.classEntries ?? []).flatMap((classEntry) =>
        Number.isSafeInteger(classEntry.classId) && Number(classEntry.classId) >= 0
          ? [[Number(classEntry.classId), classEntry.className] as const]
          : []),
    );
    creatureProperties.classEntries = authoritativeCreatureClassEntries.map((classEntry) => ({
      classId: classEntry.classId,
      className: labels.get(classEntry.classId) ?? `Class ${classEntry.classId}`,
      level: classEntry.level,
    }));
  }
  if (creatureProperties && creaturePhenotype?.present === true && creaturePhenotype.table) {
    creatureProperties.phenotypeId = creaturePhenotype.value;
  }
  if (creatureProperties && creaturePortrait?.present === true && creaturePortrait.table &&
    creaturePortraitCatalog?.descriptor.sha256 === creaturePortrait.table.sha256 &&
    creaturePortraitCatalog.descriptor.rowCount === creaturePortrait.table.rowCount) {
    creatureProperties.portraitId = creaturePortrait.value;
    creatureProperties.portraitResRef = creaturePortrait.table.baseResRef;
  }
  if (creatureProperties && creatureChallengeRating?.present === true) {
    creatureProperties.challengeRating = creatureChallengeRating.value;
  }
  if (creatureProperties?.statistics && creatureAbilityScores) {
    for (const definition of CREATURE_ABILITY_SCORE_FIELDS) {
      const storage = creatureAbilityScores[definition.key];
      if (storage.present) {
        creatureProperties.statistics.abilityScores[definition.key] = storage.value;
      }
    }
  }
  if (creatureProperties?.appearanceSettings?.colors && creatureAppearanceColors) {
    for (const definition of CREATURE_APPEARANCE_COLOR_FIELDS) {
      const storage = creatureAppearanceColors[definition.key];
      if (storage.present) {
        creatureProperties.appearanceSettings.colors[definition.key] = String(storage.value);
      }
    }
  }
  if (creatureProperties?.appearanceSettings && creatureBodyParts) {
    const appearanceSettings = creatureProperties.appearanceSettings;
    const sourceOnlyParts = appearanceSettings.sourceOnlyParts;
    let hasPresentBodyPart = false;
    for (const definition of CREATURE_BODY_PART_FIELDS) {
      const storage = creatureBodyParts[definition.key];
      if (!storage.present) continue;
      hasPresentBodyPart = true;
      const value = String(storage.value);
      if (
        definition.key === "belt" ||
        definition.key === "rightShoulder" ||
        definition.key === "leftShoulder"
      ) {
        if (sourceOnlyParts) sourceOnlyParts[definition.key] = value;
      } else {
        appearanceSettings[definition.key] = value;
      }
    }
    if (hasPresentBodyPart) appearanceSettings.partBasedAppearance = true;
  }
  if (creatureProperties?.appearanceSettings && creatureAppendages) {
    for (const key of ["wings", "tail"] as const) {
      const storage = creatureAppendages[key];
      if (storage.present) {
        creatureProperties.appearanceSettings[key] = String(storage.value);
      }
    }
  }
  if (creatureProperties?.statistics && creatureHitPointState?.present) {
    const statistics = creatureProperties.statistics;
    statistics.baseHitPoints = creatureHitPointState.hitPoints.value;
    statistics.currentHitPoints = creatureHitPointState.hitPoints.value;
    statistics.maxHitPoints = creatureHitPointState.maxHitPoints.value;
    statistics.hitPointBonuses =
      creatureHitPointState.maxHitPoints.value - creatureHitPointState.hitPoints.value;
    if (creatureHitPointState.racialTypes) {
      const calculated = calculateCreatureHitPoints({
        baseHitPoints: creatureHitPointState.hitPoints.value,
        constitution: creatureHitPointState.constitution.value,
        racialConstitutionAdjust: creatureHitPointState.racialTypes.constitutionAdjust,
        classLevels: creatureHitPointState.classLevels,
        featRow40Present: creatureHitPointState.featRow40Present,
      });
      if (calculated) {
        statistics.hitPointBonuses = calculated.maxHitPoints -
          creatureHitPointState.hitPoints.value;
        statistics.maxHitPoints = calculated.maxHitPoints;
        statistics.racialModifiers.constitution =
          creatureHitPointState.racialTypes.constitutionAdjust;
      }
    }
  }
  if (
    creatureProperties?.statistics &&
    creatureNaturalArmorClass?.present === true
  ) {
    creatureProperties.statistics.naturalArmorClass = creatureNaturalArmorClass.value;
  }
  if (creatureProperties?.statistics && creatureSavingThrowBonuses) {
    for (const definition of CREATURE_SAVING_THROW_BONUS_FIELDS) {
      const storage = creatureSavingThrowBonuses[definition.key];
      if (storage.present) {
        creatureProperties.statistics.saves[definition.statisticsKey] = storage.value;
      }
    }
  }
  if (creatureProperties && creatureAlignmentLabel) {
    creatureProperties.alignment = creatureAlignmentLabel;
  }
  if (creatureProperties?.advancedSettings) {
    if (creatureTemplateResRef) {
      creatureProperties.advancedSettings.blueprintResRef =
        creatureTemplateResRef.expectedResRef;
    }
    if (creatureSpecialIdentityStrings?.subrace) {
      creatureProperties.advancedSettings.subrace =
        creatureSpecialIdentityStrings.subrace.expectedValue;
    }
    if (creatureSpecialIdentityStrings?.deity) {
      creatureProperties.advancedSettings.deity =
        creatureSpecialIdentityStrings.deity.expectedValue;
    }
    if (creatureFactionRow) {
      creatureProperties.advancedSettings.factionId = creatureFactionRow.factionId;
      creatureProperties.advancedSettings.faction = creatureFactionRow.name;
    } else {
      delete creatureProperties.advancedSettings.factionId;
    }
  }
  if (creatureProperties?.scriptSlots && creatureScriptResRefs) {
    for (const { key } of CREATURE_SCRIPT_RESREF_FIELDS) {
      const member = creatureScriptResRefs[key];
      if (member) creatureProperties.scriptSlots[key] = member.expectedResRef;
    }
  }
  let itemProperties = mergeAreaItemProperties(
    templateObject?.itemProperties,
    entry.itemMetadata
  );
  const itemEditorComment = sceneKind === "items"
    ? readItemEditorComment(entry.itemMetadata)
    : undefined;
  const storeEditorComment = sceneKind === "stores"
    ? readStoreEditorComment(entry.storeMetadata)
    : undefined;
  const storeCommerce = sceneKind === "stores"
    ? readAreaStoreCommerceValue(entry.storeMetadata?.commerce)
    : undefined;
  const storeScriptResRefs = sceneKind === "stores"
    ? readAreaStoreScriptResRefsValue(entry.storeMetadata?.scriptResRefs)
    : undefined;
  const storeVariables: SceneObjectStoreVariableProvenance | null = sceneKind === "stores"
    ? readStoreVariableProvenance(entry.storeMetadata?.variables)
    : null;
  const storeRestrictions = sceneKind === "stores"
    ? bindStoreRestrictionsProvenanceToCatalog(
        entry.storeMetadata?.restrictions,
        itemBaseItemCatalog,
      )
    : null;
  const storeInventory = sceneKind === "stores"
    ? bindStoreInventoryProvenanceToCatalog(
        entry.storeMetadata?.inventory,
        itemBaseItemCatalog,
      )
    : null;
  const itemTag = sceneKind === "items"
    ? readItemTagStorage(entry.itemTag)
    : null;
  const exactItemTag = itemTag?.present === true ? itemTag.value : undefined;
  const triggerTag = sceneKind === "triggers"
    ? readTriggerTagStorage(entry.triggerTag)
    : null;
  const exactTriggerTag = triggerTag?.present === true ? triggerTag.value : undefined;
  const encounterTag = sceneKind === "encounters"
    ? readEncounterTagStorage(entry.encounterTag)
    : null;
  const exactEncounterTag = encounterTag?.present === true
    ? encounterTag.value
    : undefined;
  const waypointTag = sceneKind === "waypoints"
    ? readWaypointTagStorage(entry.waypointTag)
    : null;
  const exactWaypointTag = waypointTag?.present === true
    ? waypointTag.value
    : undefined;
  const triggerTemplateResRefStorage = sceneKind === "triggers"
    ? readTriggerTemplateResRefStorage(entry.triggerTemplateResRef)
    : null;
  const triggerTemplateResRef = triggerTemplateResRefStorage?.present === true
    ? triggerTemplateResRefStorage.value
    : undefined;
  const triggerLocalizedNameStorage = sceneKind === "triggers"
    ? readTriggerLocalizedNameStorage(entry.triggerLocalizedName)
    : undefined;
  const triggerLocalizedName = triggerLocalizedNameStorage
    ? readTriggerLocalizedNameInlineAsciiStorage(triggerLocalizedNameStorage)
    : undefined;
  const triggerEditorComment = sceneKind === "triggers"
    ? readTriggerEditorComment(entry.triggerMetadata)
    : undefined;
  const triggerScriptResRefs = sceneKind === "triggers"
    ? readTriggerScriptResRefsStorage(entry.triggerScriptResRefs)
    : null;
  const triggerTransitionStorage = sceneKind === "triggers"
    && isTriggerTransitionStorage(entry.triggerTransitionStorage)
    ? entry.triggerTransitionStorage
    : undefined;
  const encounterTemplateResRefStorage = sceneKind === "encounters"
    ? readEncounterTemplateResRefStorage(entry.encounterTemplateResRef)
    : null;
  const encounterTemplateResRef = encounterTemplateResRefStorage?.present === true
    ? encounterTemplateResRefStorage.value
    : undefined;
  const waypointTemplateResRefStorage = sceneKind === "waypoints"
    ? readWaypointTemplateResRefStorage(entry.waypointTemplateResRef)
    : null;
  const waypointTemplateResRef = waypointTemplateResRefStorage?.present === true
    ? waypointTemplateResRefStorage.value
    : undefined;
  const waypointLocalizedNameStorage = sceneKind === "waypoints"
    ? readWaypointLocalizedNameStorage(entry.waypointLocalizedName)
    : undefined;
  const waypointLocalizedName = waypointLocalizedNameStorage
    ? readWaypointLocalizedNameInlineAsciiStorage(waypointLocalizedNameStorage)
    : undefined;
  const waypointDescriptionStorage = sceneKind === "waypoints"
    ? readWaypointDescriptionStorage(entry.waypointDescription)
    : undefined;
  const waypointDescription = waypointDescriptionStorage
    ? readWaypointDescriptionInlineAsciiStorage(waypointDescriptionStorage)
    : undefined;
  const waypointMapNoteStorage = sceneKind === "waypoints"
    ? readWaypointMapNoteStorage(entry.waypointMapNote)
    : undefined;
  const waypointMapNote = waypointMapNoteStorage
    ? readWaypointMapNoteInlineAsciiValue(waypointMapNoteStorage)
    : undefined;
  const waypointAppearance = sceneKind === "waypoints" && entry.waypointAppearance
    ? {
        ...entry.waypointAppearance,
        table: { ...entry.waypointAppearance.table },
      }
    : undefined;
  const waypointVariables: SceneObjectWaypointVariableProvenance | null =
    sceneKind === "waypoints"
      ? readWaypointVariableProvenance(entry.waypointVariables)
      : null;
  const waypointEditorComment = sceneKind === "waypoints"
    ? readWaypointEditorComment(entry.waypointMetadata)
    : undefined;
  const encounterActive = sceneKind === "encounters"
    ? readEncounterActiveStorage(entry.encounterActive)
    : null;
  const encounterPlayerOnly = sceneKind === "encounters"
    ? readEncounterPlayerOnlyStorage(entry.encounterPlayerOnly)
    : null;
  const encounterReset = sceneKind === "encounters"
    ? readEncounterResetStorage(entry.encounterReset)
    : null;
  const encounterResetTime = sceneKind === "encounters"
    ? readEncounterResetTimeStorage(entry.encounterResetTime)
    : null;
  const encounterSpawnOption = sceneKind === "encounters"
    ? readEncounterSpawnOptionStorage(entry.encounterSpawnOption)
    : null;
  const encounterRespawns = sceneKind === "encounters"
    ? readEncounterRespawnsStorage(entry.encounterRespawns)
    : null;
  const encounterCreatureCounts = sceneKind === "encounters"
    ? readEncounterCreatureCountStorage(entry.encounterCreatureCounts)
    : null;
  const encounterScriptResRefs = sceneKind === "encounters"
    ? readEncounterScriptResRefsStorage(entry.encounterScriptResRefs)
    : null;
  const encounterFaction = sceneKind === "encounters"
    ? readEncounterFactionBinding(entry.encounterFaction, placeableFactionCatalog)
    : null;
  const encounterDifficulty = sceneKind === "encounters"
    ? readEncounterDifficultyBinding(
        entry.encounterDifficulty,
        encounterDifficultyCatalog,
      )
    : null;
  const encounterLocalizedNameStorage = sceneKind === "encounters"
    ? readEncounterLocalizedNameStorage(entry.encounterLocalizedName)
    : undefined;
  const encounterLocalizedName = encounterLocalizedNameStorage
    ? readEncounterLocalizedNameInlineAsciiStorage(
        encounterLocalizedNameStorage,
      )
    : undefined;
  const encounterEditorComment = sceneKind === "encounters"
    ? readEncounterEditorComment(entry.encounterMetadata)
    : undefined;
  const encounterVariables: SceneObjectEncounterVariableProvenance | null =
    sceneKind === "encounters"
      ? readEncounterVariableProvenance(entry.encounterVariables)
      : null;
  const encounterCreatureList: SceneObjectEncounterCreatureListProvenance | null =
    sceneKind === "encounters"
      ? readEncounterCreatureListProvenance(entry.encounterCreatureList)
      : null;
  const encounterSpawnPoints: SceneObjectEncounterSpawnPointListProvenance | null =
    sceneKind === "encounters"
      ? readEncounterSpawnPointListProvenance(entry.encounterSpawnPoints)
      : null;
  const itemInstanceState = sceneKind === "items"
    ? readItemInstanceStateStorage(entry.itemInstanceState)
    : null;
  if (itemInstanceState) {
    itemProperties = {
      ...(itemProperties ?? {}),
      ...itemInstanceState.values,
    };
  }
  const itemLocalizedStrings = sceneKind === "items"
    ? readItemLocalizedStrings(entry.itemLocalizedStrings)
    : undefined;
  const itemVariables: SceneObjectItemVariableProvenance | null = sceneKind === "items"
    ? readItemVariableProvenance(entry.itemVariables)
    : null;
  if (itemVariables) {
    itemProperties = {
      ...(itemProperties ?? {}),
      variables: itemVariables.expectedEntries.map(({ sourceIndex: _, ...variable }) => ({
        ...variable,
      })),
    };
  }
  const itemPropertyList: SceneObjectItemPropertyListProvenance | null = sceneKind === "items"
    ? readItemPropertyListProvenance(entry.itemPropertyList)
    : null;
  if (itemPropertyList?.present) {
    itemProperties = {
      ...(itemProperties ?? {}),
      propertyList: itemPropertyList.expectedEntries.map(({ sourceIndex: _, ...property }) => ({
        ...property,
      })),
    };
  }
  const itemInventoryItems = sceneKind === "items"
    ? readItemInventorySourceEntries(entry.itemInventoryItems)
    : null;
  if (itemInventoryItems) {
    itemProperties = {
      ...(itemProperties ?? {}),
      inventoryItems: itemInventoryItems.map((item) => ({ ...item })),
    };
  }
  const itemVisualTransform = sceneKind === "items"
    ? readItemVisualTransformStorage(entry.itemVisualTransform)
    : null;
  if (itemVisualTransform) {
    itemProperties = {
      ...(itemProperties ?? {}),
      visualTransform: cloneItemVisualTransformStorage(itemVisualTransform),
    };
  }
  const itemBaseAppearance = sceneKind === "items"
    ? bindItemBaseAppearanceProvenanceToCatalog(
        entry.itemBaseAppearance,
        itemBaseItemCatalog,
      )
    : null;
  if (itemBaseAppearance) {
    itemProperties = projectItemBaseAppearanceToProperties(
      itemProperties,
      itemBaseAppearance.expectedValue,
    );
  }
  const exactItemLocalizedName = readItemLocalizedStringInlineAsciiStorage(
    itemLocalizedStrings?.localizedName,
    MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  );
  const exactItemDescription = readItemLocalizedStringInlineAsciiStorage(
    itemLocalizedStrings?.description,
    MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  );
  const exactItemIdentifiedDescription = readItemLocalizedStringInlineAsciiStorage(
    itemLocalizedStrings?.identifiedDescription,
    MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  );
  if (
    exactItemLocalizedName !== undefined ||
    exactItemDescription !== undefined ||
    exactItemIdentifiedDescription !== undefined
  ) {
    itemProperties = {
      ...(itemProperties ?? {}),
      ...(exactItemLocalizedName !== undefined
        ? { localizedName: exactItemLocalizedName }
        : {}),
      ...(exactItemDescription !== undefined
        ? { description: exactItemDescription }
        : {}),
      ...(exactItemIdentifiedDescription !== undefined
        ? { identifiedDescription: exactItemIdentifiedDescription }
        : {}),
    };
  }
  if (itemProperties && itemEditorComment !== undefined) {
    itemProperties.comments = itemEditorComment;
  }
  const placeableOnUsed = readAreaPlaceableOnUsed(entry.placeableMetadata);
  const placeableScriptResRefs = readAreaPlaceableScriptResRefs(entry.placeableMetadata);
  const placeableTrapScriptResRefs = readAreaPlaceableTrapScriptResRefs(entry.placeableMetadata);
  const placeableStatic = readAreaPlaceableBoolean(entry.placeableMetadata, "static");
  const placeableUseable = readAreaPlaceableBoolean(entry.placeableMetadata, "useable");
  const placeablePlot = readAreaPlaceableBoolean(entry.placeableMetadata, "plot");
  const placeableHasInventory = readAreaPlaceableBoolean(
    entry.placeableMetadata,
    "hasInventory"
  );
  const placeableLockSettings = readAreaPlaceableLockSettings(entry.placeableMetadata);
  const placeableInventoryItems = readPlaceableInventorySourceEntries(
    entry.placeableMetadata?.inventoryItemListEntries
  );
  const placeableDurabilitySaveBytes = readPlaceableDurabilitySaveBytes(
    entry.placeableMetadata
  );
  const placeableConversation = readPlaceableConversation(entry.placeableMetadata);
  const placeableInterruptable = readPlaceableInterruptable(entry.placeableMetadata);
  const placeableTrapSettings = readPlaceableTrapByteSettings(entry.placeableMetadata);
  const placeableAnimationState = readPlaceableAnimationState(entry.placeableMetadata);
  const placeableEditorComment = readPlaceableEditorComment(entry.placeableMetadata);
  const placeableBasicIdentity = readPlaceableBasicIdentity(entry.placeableBasicIdentity);
  const placeableTrapType: SceneObjectPlaceableTrapTypeProvenance | null =
    sceneKind === "placeables"
      ? readPlaceableTrapTypeBinding(entry.placeableTrapType, placeableTrapTypeCatalog)
      : null;
  const placeableTrapTypeRow: ScenePlaceableTrapTypeRow | undefined = placeableTrapType
    ? placeableTrapTypeCatalog?.rows[placeableTrapType.expectedValue]
    : undefined;
  const placeableBodyBag: SceneObjectPlaceableBodyBagProvenance | null =
    sceneKind === "placeables"
      ? readPlaceableBodyBagBinding(entry.placeableBodyBag, placeableBodyBagCatalog)
      : null;
  const placeablePortrait: SceneObjectPlaceablePortraitProvenance | null =
    sceneKind === "placeables"
      ? readPlaceablePortraitBinding(entry.placeablePortraitId, placeablePortraitCatalog)
      : null;
  const placeablePortraitRow: ScenePlaceablePortraitRow | undefined = placeablePortrait
    ? placeablePortraitCatalog?.rows.find((row) => row.rowIndex === placeablePortrait.expectedValue)
    : undefined;
  const placeableFaction: SceneObjectPlaceableFactionProvenance | null =
    sceneKind === "placeables"
      ? readPlaceableFactionBinding(entry.placeableFaction, placeableFactionCatalog)
      : null;
  const placeableFactionRow: ScenePlaceableFactionRow | undefined = placeableFaction
    ? placeableFactionCatalog?.rows.find((row) => row.factionId === placeableFaction.expectedValue)
    : undefined;
  const placeableVariables: SceneObjectPlaceableVariableProvenance | null =
    sceneKind === "placeables"
      ? readPlaceableVariableProvenance(entry.placeableVariables)
      : null;
  const placeableTemplateResRef = sceneKind === "placeables"
    ? readPlaceableTemplateResRef(entry.placeableTemplateResRef)
    : undefined;
  const placeableLocalizedStrings = readPlaceableLocalizedStrings(
    entry.placeableLocalizedStrings,
  );
  const placeableLocalizedName = readPlaceableInlineAsciiStorage(
    placeableLocalizedStrings?.locName,
    MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  );
  const placeableDescription = readPlaceableInlineAsciiStorage(
    placeableLocalizedStrings?.description,
    MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  );
  const exactPlaceableTag = sceneKind === "placeables" && placeableBasicIdentity?.tag.present === true
    ? placeableBasicIdentity.tag.value
    : undefined;
  const placeableHitPointState = readAreaPlaceableHitPointState(entry.placeableMetadata);
  const placeableAppearanceType =
    placeableBasicIdentity?.appearance.present === true &&
    placeableBasicIdentity.appearance.nativeType === "dword" &&
    placeableBasicIdentity.appearance.table !== undefined
      ? placeableBasicIdentity.appearance.value
      : undefined;
  const placeableProperties = mergeAreaPlaceableProperties(
    templateObject?.placeableProperties,
    placeableOnUsed,
    placeableScriptResRefs,
    placeableTrapScriptResRefs,
    placeableUseable,
    placeablePlot,
    placeableHasInventory,
    placeableLockSettings,
    placeableInventoryItems,
    placeableVariables?.expectedEntries.map(({ sourceIndex: _, ...variable }) => variable),
    placeableDurabilitySaveBytes,
    placeableConversation,
    placeableInterruptable,
    placeableTrapSettings,
    placeableTrapTypeRow,
    placeableBodyBag?.expectedValue,
    placeablePortraitRow,
    placeableFactionRow,
    placeableTemplateResRef,
    placeableAnimationState,
    placeableEditorComment,
    placeableAppearanceType,
    placeableHitPointState,
    placeableLocalizedName,
    placeableDescription
  );
  const hasGitFirstName = hasMetadataKey(entry.creatureMetadata, "firstName");
  const visualTransform = cloneVisualTransform(entry.visualTransform);
  const doorTransitionStorage = sceneKind === "doors" &&
    isAreaDoorTransitionStorage(entry.doorTransition?.storage)
      ? cloneAreaDoorTransitionStorage(entry.doorTransition.storage)
      : undefined;
  const polygonGeometry = (sceneKind === "triggers" || sceneKind === "encounters")
    && isAreaObjectPolygonGeometry(entry.polygonGeometry)
      ? cloneAreaObjectPolygonGeometry(entry.polygonGeometry)
      : undefined;
  const soundIntervalVariation = sceneKind === "sounds"
    ? readAreaSoundIntervalVariationStorage(entry.soundIntervalVariation)
    : null;
  const soundVolume = sceneKind === "sounds"
    ? readAreaSoundVolumeStorage(entry.soundVolume)
    : null;
  const soundActive = sceneKind === "sounds"
    ? readAreaSoundActiveStorage(entry.soundActive)
    : null;
  const soundPlayOrder = sceneKind === "sounds"
    ? readAreaSoundPlayOrderStorage(entry.soundPlayOrder)
    : null;
  const soundPlayStyle = sceneKind === "sounds"
    ? readAreaSoundPlayStyleStorage(entry.soundPlayStyle)
    : null;
  const soundPlayback = sceneKind === "sounds"
    ? readAreaSoundPlaybackStorage(entry.soundPlayback)
    : null;
  const soundProfile = sceneKind === "sounds"
    ? readAreaSoundProfileStorage(entry.soundProfile)
    : null;
  const exactSoundPositioning = soundProfile
    ? areaSoundProfilePresentationFromStorage(soundProfile)
    : null;
  const soundSchedule = sceneKind === "sounds"
    ? readAreaSoundScheduleStorage(entry.soundSchedule)
    : null;
  const normalized = normalizeSceneObjectMetadata({
    id: `${areaId}:${entry.objectId}`,
    kind: sceneKind,
    name:
      sceneKind === "creatures"
        ? hasGitFirstName
          ? mappedCreature?.name ?? templateCreature?.name ?? entry.templateId
          : templateCreature?.name ?? mappedCreature?.name ?? entry.templateId
        : sceneKind === "waypoints" && waypointLocalizedName !== undefined
          ? waypointLocalizedName
        : sceneKind === "placeables" && placeableLocalizedName !== undefined
          ? placeableLocalizedName
          : templateObject?.name ?? entry.localizedName ?? entry.templateId,
    resRef: sourceResRef,
    tag:
      exactPlaceableTag ?? exactCreatureTag ?? exactItemTag ?? exactTriggerTag ??
      exactEncounterTag ?? exactWaypointTag ?? (
        entry.tag?.trim() ||
        mappedCreature?.tag ||
        templateCreature?.tag ||
        templateObject?.tag ||
        entry.templateId.toUpperCase()
      ),
    isStatic:
      sceneKind === "placeables"
        ? placeableStatic ?? resolveAreaPlaceableStaticFlag(entry, templateObject, visualTransform)
        : false,
    x: entry.x,
    y: entry.y,
    z: entry.z,
    bearing: toSceneBearingRadians(entry.bearing),
    source: {
      type: "aurora_git",
      areaId,
      sourceObjectId: entry.objectId,
      ...(Number.isSafeInteger(entry.sourceIndex) && Number(entry.sourceIndex) >= 0
        ? { sourceIndex: Number(entry.sourceIndex) }
        : {}),
      sourceKind: entry.kind,
      templateId: entry.templateId,
      ...(entry.appearanceType !== undefined ? { appearanceType: entry.appearanceType } : {}),
      ...(entry.genericType !== undefined ? { genericType: entry.genericType } : {}),
      ...(entry.localizedName ? { localizedName: entry.localizedName } : {}),
      ...(entry.description ? { description: entry.description } : {}),
      ...(sceneKind === "creatures" && entry.creatureMetadata
        ? { creatureMetadata: { ...entry.creatureMetadata } }
        : {}),
      ...(sceneKind === "creatures" && creatureTag
        ? { creatureTag: { ...creatureTag } }
        : {}),
      ...(sceneKind === "creatures" && creatureConversation
        ? { creatureConversation: { ...creatureConversation } }
        : {}),
      ...(sceneKind === "creatures" && creatureInterruptable
        ? { creatureInterruptable: { ...creatureInterruptable } }
        : {}),
      ...(sceneKind === "creatures" && creatureAdvancedFlags
        ? {
            creatureAdvancedFlags: {
              disarmable: { ...creatureAdvancedFlags.disarmable },
              plot: { ...creatureAdvancedFlags.plot },
              immortal: { ...creatureAdvancedFlags.immortal },
              lootable: { ...creatureAdvancedFlags.lootable },
              noPermanentDeath: { ...creatureAdvancedFlags.noPermanentDeath },
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureBodyBag
        ? { creatureBodyBag: { ...creatureBodyBag } }
        : {}),
      ...(sceneKind === "creatures" && creatureDecayTime
        ? { creatureDecayTime: { ...creatureDecayTime } }
        : {}),
      ...(sceneKind === "creatures" && creatureAppearance
        ? {
            creatureAppearance: creatureAppearance.present && creatureAppearance.table
              ? { ...creatureAppearance, table: { ...creatureAppearance.table } }
              : { ...creatureAppearance },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureGender
        ? {
            creatureGender: creatureGender.present && creatureGender.table
              ? { ...creatureGender, table: { ...creatureGender.table } }
              : { ...creatureGender },
          }
        : {}),
      ...(sceneKind === "creatures" && creaturePerceptionRange
        ? {
            creaturePerceptionRange: creaturePerceptionRange.present &&
              creaturePerceptionRange.table
              ? { ...creaturePerceptionRange, table: { ...creaturePerceptionRange.table } }
              : { ...creaturePerceptionRange },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureWalkRate
        ? {
            creatureWalkRate: creatureWalkRate.present && creatureWalkRate.table
              ? { ...creatureWalkRate, table: { ...creatureWalkRate.table } }
              : { ...creatureWalkRate },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureSoundSetFile
        ? {
            creatureSoundSetFile: creatureSoundSetFile.present && creatureSoundSetFile.table
              ? { ...creatureSoundSetFile, table: { ...creatureSoundSetFile.table } }
              : { ...creatureSoundSetFile },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureStartingPackage
        ? {
            creatureStartingPackage: creatureStartingPackage.present
              ? {
                  ...creatureStartingPackage,
                  ...(creatureStartingPackage.classIds
                    ? { classIds: [...creatureStartingPackage.classIds] }
                    : {}),
                  ...(creatureStartingPackage.table
                    ? { table: { ...creatureStartingPackage.table } }
                    : {}),
                }
              : { ...creatureStartingPackage },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureSkillList
        ? {
            creatureSkillList: creatureSkillList.present
              ? {
                  ...creatureSkillList,
                  ranks: [...creatureSkillList.ranks],
                  opaqueSiblingFieldCounts: [
                    ...creatureSkillList.opaqueSiblingFieldCounts,
                  ],
                  ...(creatureSkillList.table
                    ? { table: { ...creatureSkillList.table } }
                    : {}),
                }
              : { ...creatureSkillList },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureFeatList
        ? {
            creatureFeatList: creatureFeatList.present
              ? {
                  ...creatureFeatList,
                  featIds: [...creatureFeatList.featIds],
                  opaqueSiblingFieldCounts: [
                    ...creatureFeatList.opaqueSiblingFieldCounts,
                  ],
                  ...(creatureFeatList.table
                    ? { table: { ...creatureFeatList.table } }
                    : {}),
                }
              : { ...creatureFeatList },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureSpecialAbilityList
        ? {
            creatureSpecialAbilityList: creatureSpecialAbilityList.present
              ? {
                  ...creatureSpecialAbilityList,
                  entries: creatureSpecialAbilityList.entries.map((ability) => ({ ...ability })),
                  ...(creatureSpecialAbilityList.table
                    ? { table: { ...creatureSpecialAbilityList.table } }
                    : {}),
                }
              : { ...creatureSpecialAbilityList },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureVariables
        ? {
            creatureVariables: {
              expectedEntries: creatureVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureEditorComment !== undefined
        ? { creatureEditorComment }
        : {}),
      ...(sceneKind === "creatures" && creatureClassLevelState
        ? {
            creatureClassLevelState: creatureClassLevelState.present
              ? {
                  ...creatureClassLevelState,
                  entries: creatureClassLevelState.entries.map((classEntry) => ({
                    ...classEntry,
                  })),
                }
              : { present: false },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureClassIdentityState
        ? {
            creatureClassIdentityState: creatureClassIdentityState.present
              ? {
                  ...creatureClassIdentityState,
                  entries: creatureClassIdentityState.entries.map((classEntry) => ({
                    ...classEntry,
                  })),
                  ...(creatureClassIdentityState.classesTable
                    ? { classesTable: { ...creatureClassIdentityState.classesTable } }
                    : {}),
                }
              : { present: false },
          }
        : {}),
      ...(sceneKind === "creatures" && creaturePhenotype
        ? {
            creaturePhenotype: creaturePhenotype.present && creaturePhenotype.table
              ? { ...creaturePhenotype, table: { ...creaturePhenotype.table } }
              : { ...creaturePhenotype },
          }
        : {}),
      ...(sceneKind === "creatures" && creaturePortrait
        ? {
            creaturePortrait: creaturePortrait.present
              ? {
                  ...creaturePortrait,
                  ...(creaturePortrait.selectorContext
                    ? { selectorContext: { ...creaturePortrait.selectorContext } }
                    : {}),
                  ...(creaturePortrait.table
                    ? { table: { ...creaturePortrait.table } }
                    : {}),
                }
              : { ...creaturePortrait },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureChallengeRating
        ? { creatureChallengeRating: { ...creatureChallengeRating } }
        : {}),
      ...(sceneKind === "creatures" && creatureAbilityScores
        ? {
            creatureAbilityScores: {
              strength: { ...creatureAbilityScores.strength },
              dexterity: { ...creatureAbilityScores.dexterity },
              constitution: { ...creatureAbilityScores.constitution },
              intelligence: { ...creatureAbilityScores.intelligence },
              wisdom: { ...creatureAbilityScores.wisdom },
              charisma: { ...creatureAbilityScores.charisma },
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureAppearanceColors
        ? {
            creatureAppearanceColors: {
              skin: { ...creatureAppearanceColors.skin },
              hair: { ...creatureAppearanceColors.hair },
              tattoo1: { ...creatureAppearanceColors.tattoo1 },
              tattoo2: { ...creatureAppearanceColors.tattoo2 },
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureBodyParts
        ? {
            creatureBodyParts: Object.fromEntries(
              Object.entries(creatureBodyParts).map(([key, storage]) => [
                key,
                storage.present
                  ? {
                      ...storage,
                      legacyByte: { ...storage.legacyByte },
                      wideWord: { ...storage.wideWord },
                    }
                  : { ...storage },
              ]),
            ) as typeof creatureBodyParts,
          }
        : {}),
      ...(sceneKind === "creatures" && creatureAppendages
        ? {
            creatureAppendages: Object.fromEntries(
              Object.entries(creatureAppendages).map(([key, storage]) => [
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
            ) as typeof creatureAppendages,
          }
        : {}),
      ...(sceneKind === "creatures" && creatureHitPointState
        ? {
            creatureHitPointState: creatureHitPointState.present
              ? {
                  ...creatureHitPointState,
                  hitPoints: { ...creatureHitPointState.hitPoints },
                  currentHitPoints: { ...creatureHitPointState.currentHitPoints },
                  maxHitPoints: { ...creatureHitPointState.maxHitPoints },
                  constitution: { ...creatureHitPointState.constitution },
                  race: { ...creatureHitPointState.race },
                  classLevels: [...creatureHitPointState.classLevels],
                  ...(creatureHitPointState.racialTypes
                    ? { racialTypes: { ...creatureHitPointState.racialTypes } }
                    : {}),
                }
              : { present: false },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureNaturalArmorClass
        ? { creatureNaturalArmorClass: { ...creatureNaturalArmorClass } }
        : {}),
      ...(sceneKind === "creatures" && creatureSavingThrowBonuses
        ? {
            creatureSavingThrowBonuses: {
              fortitude: { ...creatureSavingThrowBonuses.fortitude },
              reflex: { ...creatureSavingThrowBonuses.reflex },
              will: { ...creatureSavingThrowBonuses.will },
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureAlignment
        ? {
            creatureAlignment: {
              goodEvil: { ...creatureAlignment.goodEvil },
              lawfulChaotic: { ...creatureAlignment.lawfulChaotic },
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureFaction
        ? { creatureFaction }
        : {}),
      ...(sceneKind === "creatures" && creatureTemplateResRef
        ? { creatureTemplateResRef: { ...creatureTemplateResRef } }
        : {}),
      ...(sceneKind === "creatures" && creatureSpecialIdentityStrings
        ? {
            creatureSpecialIdentityStrings: {
              ...(creatureSpecialIdentityStrings.subrace
                ? { subrace: { ...creatureSpecialIdentityStrings.subrace } }
                : {}),
              ...(creatureSpecialIdentityStrings.deity
                ? { deity: { ...creatureSpecialIdentityStrings.deity } }
                : {}),
            },
          }
        : {}),
      ...(sceneKind === "creatures" && creatureScriptResRefs
        ? {
            creatureScriptResRefs: Object.freeze(Object.fromEntries(
              CREATURE_SCRIPT_RESREF_FIELDS.flatMap(({ key }) => {
                const member = creatureScriptResRefs[key];
                return member ? [[key, Object.freeze({ ...member })] as const] : [];
              }),
            ) as SceneObjectCreatureScriptResRefsProvenance),
          }
        : {}),
      ...(sceneKind === "creatures" && creatureLocalizedStrings
        ? {
            creatureLocalizedStrings:
              cloneCreatureNameLocalizedStrings(creatureLocalizedStrings),
          }
        : {}),
      ...(sceneKind === "creatures" && creatureInventoryItems !== undefined
        ? {
            creatureInventoryItems: creatureInventoryItems.map((inventoryItem) => ({
              ...inventoryItem
            }))
          }
        : {}),
      ...(sceneKind === "creatures" && creatureEquippedItems !== undefined
        ? {
            creatureEquippedItems: creatureEquippedItems.map((equipmentItem) => ({
              ...equipmentItem
            }))
          }
        : {}),
      ...(sceneKind === "placeables" && placeableOnUsed !== undefined
        ? { placeableOnUsed }
        : {}),
      ...(sceneKind === "placeables" && placeableScriptResRefs !== undefined
        ? { placeableScriptResRefs: { ...placeableScriptResRefs } }
        : {}),
      ...(sceneKind === "placeables" && placeableTrapScriptResRefs !== undefined
        ? { placeableTrapScriptResRefs: { ...placeableTrapScriptResRefs } }
        : {}),
      ...(sceneKind === "placeables" && placeableStatic !== undefined
        ? { placeableStatic }
        : {}),
      ...(sceneKind === "placeables" && placeableUseable !== undefined
        ? { placeableUseable }
        : {}),
      ...(sceneKind === "placeables" && placeablePlot !== undefined
        ? { placeablePlot }
        : {}),
      ...(sceneKind === "placeables" && placeableHasInventory !== undefined
        ? { placeableHasInventory }
        : {}),
      ...(sceneKind === "placeables" && placeableLockSettings !== undefined
        ? { placeableLockSettings: { ...placeableLockSettings } }
        : {}),
      ...(sceneKind === "placeables" && placeableInventoryItems !== undefined
        ? {
            placeableInventoryItems: placeableInventoryItems.map((inventoryItem) => ({
              ...inventoryItem
            }))
          }
        : {}),
      ...(sceneKind === "placeables" && placeableDurabilitySaveBytes !== undefined
        ? { placeableDurabilitySaveBytes: { ...placeableDurabilitySaveBytes } }
        : {}),
      ...(sceneKind === "placeables" && placeableConversation !== undefined
        ? { placeableConversation }
        : {}),
      ...(sceneKind === "placeables" && placeableInterruptable !== undefined
        ? { placeableInterruptable }
        : {}),
      ...(sceneKind === "placeables" && placeableTrapSettings !== undefined
        ? { placeableTrapSettings: { ...placeableTrapSettings } }
        : {}),
      ...(sceneKind === "placeables" && placeableAnimationState !== undefined
        ? { placeableAnimationState }
        : {}),
      ...(sceneKind === "placeables" && placeableEditorComment !== undefined
        ? { placeableEditorComment }
        : {}),
      ...(sceneKind === "items" && itemEditorComment !== undefined
        ? { itemEditorComment }
        : {}),
      ...(sceneKind === "stores" && storeEditorComment !== undefined
        ? { storeEditorComment }
        : {}),
      ...(sceneKind === "stores" && storeCommerce
        ? { storeCommerce: cloneAreaStoreCommerceValue(storeCommerce) }
        : {}),
      ...(sceneKind === "stores" && storeScriptResRefs
        ? {
            storeScriptResRefs:
              cloneAreaStoreScriptResRefsValue(storeScriptResRefs),
          }
        : {}),
      ...(sceneKind === "stores" && storeVariables
        ? {
            storeVariables: {
              expectedEntries: storeVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "stores" && storeRestrictions
        ? { storeRestrictions: cloneStoreRestrictionsProvenance(storeRestrictions) }
        : {}),
      ...(sceneKind === "stores" && storeInventory
        ? { storeInventory: cloneStoreInventoryProvenance(storeInventory) }
        : {}),
      ...(sceneKind === "items" && itemTag
        ? { itemTag: { ...itemTag } }
        : {}),
      ...(sceneKind === "triggers" && triggerTag
        ? { triggerTag: { ...triggerTag } }
        : {}),
      ...(sceneKind === "triggers" && triggerTemplateResRefStorage
        ? { triggerTemplateResRef: { ...triggerTemplateResRefStorage } }
        : {}),
      ...(sceneKind === "triggers" && triggerLocalizedNameStorage
        ? {
            triggerLocalizedNameStorage:
              cloneTriggerLocalizedNameStorage(triggerLocalizedNameStorage),
          }
        : {}),
      ...(sceneKind === "triggers" && triggerEditorComment !== undefined
        ? { triggerEditorComment }
        : {}),
      ...(sceneKind === "triggers" && triggerScriptResRefs
        ? {
            triggerScriptResRefsStorage:
              cloneTriggerScriptResRefsStorage(triggerScriptResRefs),
          }
        : {}),
      ...(sceneKind === "triggers" && triggerTransitionStorage
        ? {
            triggerTransitionStorage:
              cloneTriggerTransitionStorage(triggerTransitionStorage),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterTag
        ? { encounterTag: { ...encounterTag } }
        : {}),
      ...(sceneKind === "encounters" && encounterTemplateResRefStorage
        ? { encounterTemplateResRef: { ...encounterTemplateResRefStorage } }
        : {}),
      ...(sceneKind === "waypoints" && waypointTag
        ? { waypointTag: { ...waypointTag } }
        : {}),
      ...(sceneKind === "waypoints" && waypointTemplateResRefStorage
        ? { waypointTemplateResRef: { ...waypointTemplateResRefStorage } }
        : {}),
      ...(sceneKind === "waypoints" && waypointLocalizedNameStorage
        ? {
            waypointLocalizedNameStorage:
              cloneWaypointLocalizedNameStorage(waypointLocalizedNameStorage),
          }
        : {}),
      ...(sceneKind === "waypoints" && waypointDescriptionStorage
        ? {
            waypointDescriptionStorage:
              cloneWaypointDescriptionStorage(waypointDescriptionStorage),
          }
        : {}),
      ...(sceneKind === "waypoints" && waypointMapNoteStorage
        ? {
            waypointMapNoteStorage:
              cloneWaypointMapNoteStorage(waypointMapNoteStorage),
          }
        : {}),
      ...(sceneKind === "waypoints" && waypointAppearance
        ? { waypointAppearance }
        : {}),
      ...(sceneKind === "waypoints" && waypointVariables
        ? {
            waypointVariables: {
              expectedEntries: waypointVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "waypoints" && waypointEditorComment !== undefined
        ? { waypointEditorComment }
        : {}),
      ...(sceneKind === "encounters" && encounterActive
        ? { encounterActiveStorage: cloneEncounterActiveStorage(encounterActive) }
        : {}),
      ...(sceneKind === "encounters" && encounterPlayerOnly
        ? {
            encounterPlayerOnlyStorage:
              cloneEncounterPlayerOnlyStorage(encounterPlayerOnly),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterReset
        ? { encounterResetStorage: cloneEncounterResetStorage(encounterReset) }
        : {}),
      ...(sceneKind === "encounters" && encounterResetTime
        ? {
            encounterResetTimeStorage:
              cloneEncounterResetTimeStorage(encounterResetTime),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterSpawnOption
        ? {
            encounterSpawnOptionStorage:
              cloneEncounterSpawnOptionStorage(encounterSpawnOption),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterRespawns
        ? {
            encounterRespawnsStorage:
              cloneEncounterRespawnsStorage(encounterRespawns),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterCreatureCounts
        ? {
            encounterCreatureCountsStorage:
              cloneEncounterCreatureCountStorage(encounterCreatureCounts),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterScriptResRefs
        ? {
            encounterScriptResRefsStorage:
              cloneEncounterScriptResRefsStorage(encounterScriptResRefs),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterFaction
        ? { encounterFaction: { ...encounterFaction } }
        : {}),
      ...(sceneKind === "encounters" && encounterDifficulty
        ? {
            encounterDifficulty: {
              ...encounterDifficulty,
              expectedValue: { ...encounterDifficulty.expectedValue },
            },
          }
        : {}),
      ...(sceneKind === "encounters" && encounterLocalizedNameStorage
        ? {
            encounterLocalizedNameStorage:
              cloneEncounterLocalizedNameStorage(encounterLocalizedNameStorage),
          }
        : {}),
      ...(sceneKind === "encounters" && encounterVariables
        ? {
            encounterVariables: {
              expectedEntries: encounterVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "encounters" && encounterCreatureList
        ? {
            encounterCreatureList: {
              expectedEntries: encounterCreatureList.expectedEntries.map(
                (entry) => ({ ...entry }),
              ),
            },
          }
        : {}),
      ...(sceneKind === "encounters" && encounterSpawnPoints
        ? {
            encounterSpawnPoints: {
              expectedEntries: encounterSpawnPoints.expectedEntries.map(
                (entry) => ({ ...entry }),
              ),
            },
          }
        : {}),
      ...(sceneKind === "encounters" && encounterEditorComment !== undefined
        ? { encounterEditorComment }
        : {}),
      ...(sceneKind === "items" && itemTemplateResRef
        ? { itemTemplateResRef: { ...itemTemplateResRef } }
        : {}),
      ...(sceneKind === "items" && itemInstanceState
        ? { itemInstanceState: cloneItemInstanceStateStorage(itemInstanceState) }
        : {}),
      ...(sceneKind === "items" && itemLocalizedStrings
        ? { itemLocalizedStrings: cloneItemLocalizedStrings(itemLocalizedStrings) }
        : {}),
      ...(sceneKind === "items" && itemVariables
        ? {
            itemVariables: {
              expectedEntries: itemVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "items" && itemPropertyList
        ? {
            itemPropertyList: {
              present: itemPropertyList.present,
              expectedEntries: itemPropertyList.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(sceneKind === "items" && itemInventoryItems
        ? {
            itemInventoryItems: itemInventoryItems.map((item) => ({ ...item })),
          }
        : {}),
      ...(sceneKind === "items" && itemVisualTransform
        ? {
            itemVisualTransform: cloneItemVisualTransformStorage(itemVisualTransform),
          }
        : {}),
      ...(sceneKind === "items" && itemBaseAppearance
        ? {
            itemBaseAppearance: cloneItemBaseAppearanceProvenance(
              itemBaseAppearance,
            ),
          }
        : {}),
      ...(sceneKind === "placeables" && placeableBasicIdentity !== undefined
        ? { placeableBasicIdentity }
        : {}),
      ...(placeableTrapType !== null
        ? { placeableTrapType }
        : {}),
      ...(placeableBodyBag !== null
        ? { placeableBodyBag }
        : {}),
      ...(placeablePortrait !== null
        ? { placeablePortrait }
        : {}),
      ...(placeableFaction !== null
        ? { placeableFaction }
        : {}),
      ...(placeableVariables !== null
        ? {
            placeableVariables: {
              expectedEntries: placeableVariables.expectedEntries.map((entry) => ({ ...entry })),
            },
          }
        : {}),
      ...(placeableTemplateResRef !== undefined
        ? { placeableTemplateResRef }
        : {}),
      ...(sceneKind === "placeables" && placeableLocalizedStrings !== undefined
        ? { placeableLocalizedStrings }
        : {}),
      ...(sceneKind === "placeables" && placeableHitPointState !== undefined
        ? { placeableHitPointState: { ...placeableHitPointState } }
        : {}),
      ...(doorTransitionStorage
        ? { doorTransitionStorage: cloneAreaDoorTransitionStorage(doorTransitionStorage) }
        : {}),
      ...(polygonGeometry
        ? { polygonGeometry: cloneAreaObjectPolygonGeometry(polygonGeometry) }
        : {}),
      ...(soundIntervalVariation
        ? {
            soundIntervalVariationStorage:
              cloneAreaSoundIntervalVariationStorage(soundIntervalVariation),
          }
        : {}),
      ...(soundVolume
        ? { soundVolumeStorage: cloneAreaSoundVolumeStorage(soundVolume) }
        : {}),
      ...(soundActive
        ? { soundActiveStorage: cloneAreaSoundActiveStorage(soundActive) }
        : {}),
      ...(soundPlayOrder
        ? { soundPlayOrderStorage: cloneAreaSoundPlayOrderStorage(soundPlayOrder) }
        : {}),
      ...(soundPlayStyle
        ? { soundPlayStyleStorage: cloneAreaSoundPlayStyleStorage(soundPlayStyle) }
        : {}),
      ...(soundPlayback
        ? { soundPlaybackStorage: cloneAreaSoundPlaybackStorage(soundPlayback) }
        : {}),
      ...(soundProfile
        ? { soundProfileStorage: cloneAreaSoundProfileStorage(soundProfile) }
        : {}),
      ...(soundSchedule
        ? { soundScheduleStorage: cloneAreaSoundScheduleStorage(soundSchedule) }
        : {}),
    },
    ...(sceneKind === "sounds" && (entry.soundPositioning || exactSoundPositioning)
      ? {
          soundPositioning: exactSoundPositioning
            ? {
                mode: exactSoundPositioning.mode,
                elevation: exactSoundPositioning.elevation,
                maxVolumeDistance: exactSoundPositioning.maxVolumeDistance,
                cutoffDistance: exactSoundPositioning.cutoffDistance,
                randomRangeWestEast: exactSoundPositioning.randomRangeWestEast,
                randomRangeNorthSouth: exactSoundPositioning.randomRangeNorthSouth,
                ...(entry.soundPositioning?.preserve
                  ? { preserve: entry.soundPositioning.preserve }
                  : {}),
              }
            : entry.soundPositioning
        }
      : {}),
    ...(soundIntervalVariation
      ? { soundIntervalVariation: cloneAreaSoundIntervalVariationStorage(soundIntervalVariation) }
      : {}),
    ...(soundVolume ? { soundVolume: cloneAreaSoundVolumeStorage(soundVolume) } : {}),
    ...(soundActive ? { soundActive: cloneAreaSoundActiveStorage(soundActive) } : {}),
    ...(encounterActive
      ? { encounterActive: cloneEncounterActiveStorage(encounterActive) }
      : {}),
    ...(encounterPlayerOnly
      ? { encounterPlayerOnly: cloneEncounterPlayerOnlyStorage(encounterPlayerOnly) }
      : {}),
    ...(encounterReset
      ? { encounterReset: cloneEncounterResetStorage(encounterReset) }
      : {}),
    ...(encounterResetTime
      ? { encounterResetTime: cloneEncounterResetTimeStorage(encounterResetTime) }
      : {}),
    ...(encounterSpawnOption
      ? { encounterSpawnOption: cloneEncounterSpawnOptionStorage(encounterSpawnOption) }
      : {}),
    ...(encounterRespawns
      ? { encounterRespawns: cloneEncounterRespawnsStorage(encounterRespawns) }
      : {}),
    ...(encounterCreatureCounts
      ? { encounterCreatureCounts: cloneEncounterCreatureCountStorage(encounterCreatureCounts) }
      : {}),
    ...(encounterScriptResRefs
      ? { encounterScriptResRefs: cloneEncounterScriptResRefsStorage(encounterScriptResRefs) }
      : {}),
    ...(encounterFaction
      ? { encounterFactionId: encounterFaction.expectedValue }
      : {}),
    ...(encounterDifficulty
      ? { encounterDifficulty: { ...encounterDifficulty.expectedValue } }
      : {}),
    ...(encounterLocalizedName !== undefined
      ? { encounterLocalizedName }
      : {}),
    ...(encounterTemplateResRef !== undefined
      ? { encounterTemplateResRef }
      : {}),
    ...(triggerTemplateResRef !== undefined
      ? { triggerTemplateResRef }
      : {}),
    ...(triggerLocalizedName !== undefined
      ? { triggerLocalizedName }
      : {}),
    ...(triggerEditorComment !== undefined
      ? { triggerEditorComment }
      : {}),
    ...(triggerScriptResRefs
      ? { triggerScriptResRefs: cloneTriggerScriptResRefsStorage(triggerScriptResRefs) }
      : {}),
    ...(triggerTransitionStorage
      ? {
          triggerTransitionStorage:
            cloneTriggerTransitionStorage(triggerTransitionStorage),
        }
      : {}),
    ...(waypointLocalizedName !== undefined
      ? { waypointLocalizedName }
      : {}),
    ...(waypointTemplateResRef !== undefined
      ? { waypointTemplateResRef }
      : {}),
    ...(waypointDescription !== undefined
      ? { waypointDescription }
      : {}),
    ...(waypointMapNote !== undefined
      ? { waypointMapNote: cloneWaypointMapNoteValue(waypointMapNote) }
      : {}),
    ...(waypointAppearance
      ? { waypointAppearance: waypointAppearance.value }
      : {}),
    ...(waypointVariables
      ? {
          waypointVariables: waypointVariables.expectedEntries.map(
            ({ sourceIndex: _, ...entry }) => ({ ...entry }),
          ),
        }
      : {}),
    ...(waypointEditorComment !== undefined
      ? { waypointEditorComment }
      : {}),
    ...(sceneKind === "encounters" && (
      encounterEditorComment !== undefined || encounterVariables || encounterCreatureList
      || encounterSpawnPoints
    )
      ? {
          encounterProperties: {
            ...(encounterEditorComment !== undefined
              ? { comments: encounterEditorComment }
              : {}),
            ...(encounterVariables
              ? {
                  variables: encounterVariables.expectedEntries.map(
                    ({ sourceIndex: _, ...entry }) => ({ ...entry }),
                  ),
                }
              : {}),
            ...(encounterCreatureList
              ? {
                  creatureList: encounterCreatureList.expectedEntries.map((entry) => ({
                    appearance: entry.appearance,
                    challengeRating: entry.challengeRating,
                    resRef: entry.resRef,
                    singleSpawn: entry.singleSpawnByte === 1,
                  })),
                }
              : {}),
            ...(encounterSpawnPoints
              ? {
                  spawnPoints: sourceEncounterSpawnPointsToTarget(
                    encounterSpawnPoints.expectedEntries,
                  ).map((entry) => ({ ...entry })),
                }
              : {}),
          },
        }
      : {}),
    ...(soundPlayOrder
      ? { soundPlayOrder: cloneAreaSoundPlayOrderStorage(soundPlayOrder) }
      : {}),
    ...(soundPlayStyle
      ? { soundPlayStyle: cloneAreaSoundPlayStyleStorage(soundPlayStyle) }
      : {}),
    ...(soundPlayback
      ? { soundPlayback: cloneAreaSoundPlaybackStorage(soundPlayback) }
      : {}),
    ...(soundProfile
      ? { soundProfile: cloneAreaSoundProfileStorage(soundProfile) }
      : {}),
    ...(soundSchedule ? { soundSchedule: cloneAreaSoundScheduleStorage(soundSchedule) } : {}),
    ...(sceneKind === "doors" && entry.doorTransition
      ? {
          doorTransition: {
            linkedTarget: entry.doorTransition.linkedTarget,
            linkedModule: entry.doorTransition.linkedModule,
            linkedTag: entry.doorTransition.linkedTag,
            linkedWaypoint: entry.doorTransition.linkedWaypoint,
            loadScreen: entry.doorTransition.loadScreen,
            flags: { ...entry.doorTransition.flags },
            ...(doorTransitionStorage
              ? { storage: cloneAreaDoorTransitionStorage(doorTransitionStorage) }
              : {}),
            ...(entry.doorTransition.extra
              ? { extra: { ...entry.doorTransition.extra } }
              : {})
          }
        }
      : {}),
    ...(polygonGeometry
      ? { polygonGeometry: cloneAreaObjectPolygonGeometry(polygonGeometry) }
      : {}),
    ...(creatureProperties
      ? {
          creatureProperties
        }
      : {}),
    ...(sceneKind === "placeables" && placeableProperties
      ? {
          placeableProperties
        }
      : {}),
    ...(sceneKind === "items" && itemProperties
      ? {
          itemProperties
        }
      : {}),
    ...(sceneKind === "stores" && (
      storeEditorComment !== undefined || storeCommerce || storeScriptResRefs || storeVariables ||
        storeRestrictions || storeInventory
    )
      ? {
          storeProperties: {
            comments: storeEditorComment ?? "",
            ...(storeCommerce
              ? { commerce: cloneAreaStoreCommerceValue(storeCommerce) }
              : {}),
            ...(storeScriptResRefs
              ? {
                  scriptResRefs:
                    cloneAreaStoreScriptResRefsValue(storeScriptResRefs),
              }
              : {}),
            ...(storeVariables
              ? {
                  variables: storeVariables.expectedEntries.map(
                    ({ sourceIndex: _, ...entry }) => ({ ...entry }),
                  ),
                }
              : {}),
            ...(storeRestrictions
              ? {
                  restrictions: cloneStoreRestrictionsTarget({
                    willNotBuy: storeRestrictions.expectedValue.willNotBuy.baseItemIds,
                    willOnlyBuy: storeRestrictions.expectedValue.willOnlyBuy.baseItemIds,
                  }),
                }
              : {}),
            ...(storeInventory
              ? {
                  inventoryBuckets: cloneStoreInventoryTargetBuckets(
                    storeInventoryTargetFromProvenance(storeInventory),
                    storeInventory.expectedBuckets,
                  ),
                }
              : {}),
          }
        }
      : {}),
    visualTransform
  });
  if (sceneKind === "creatures" && normalized.creatureProperties?.advancedSettings) {
    if (!creatureBodyBag) {
      Reflect.deleteProperty(
        normalized.creatureProperties.advancedSettings,
        "treasureModelRow",
      );
    }
    if (!creatureDecayTime) {
      Reflect.deleteProperty(
        normalized.creatureProperties.advancedSettings,
        "corpseDecayTimeSeconds",
      );
    }
  }
  if (!exactSoundPositioning || !normalized.soundPositioning) return normalized;
  return {
    ...normalized,
    soundPositioning: {
      ...normalized.soundPositioning,
      elevation: exactSoundPositioning.elevation,
    },
  };
}

function cloneVisualTransform(
  transform: SceneObject["visualTransform"] | undefined
): SceneObject["visualTransform"] {
  return transform ? { ...transform } : { ...DEFAULT_VISUAL_TRANSFORM };
}

function buildCreatureTemplateLookup(
  objects: readonly SceneObject[] | undefined
): ReadonlyMap<string, SceneObject> {
  const lookup = new Map<string, SceneObject>();
  for (const object of objects ?? []) {
    if (object.kind !== "creatures" || !object.creatureProperties) {
      continue;
    }
    addCreatureTemplateLookupKey(lookup, object.resRef, object);
    addCreatureTemplateLookupKey(lookup, object.source?.templateId, object);
    addCreatureTemplateLookupKey(lookup, object.id.replace(/^cre_template_/u, ""), object);
  }
  return lookup;
}

function buildAreaObjectTemplateLookup(
  objects: readonly SceneObject[] | undefined
): ReadonlyMap<string, SceneObject> {
  const lookup = new Map<string, SceneObject>();
  for (const object of objects ?? []) {
    if (!AREA_OBJECT_TEMPLATE_KINDS.has(object.kind)) {
      continue;
    }
    addTemplateLookupKey(lookup, object.resRef, object);
    addTemplateLookupKey(lookup, object.source?.templateId, object);
    addTemplateLookupKey(lookup, object.id, object);
    addTemplateLookupKey(lookup, object.id.replace(/^preview:/u, ""), object);
  }
  return lookup;
}

function addCreatureTemplateLookupKey(
  lookup: Map<string, SceneObject>,
  value: string | undefined,
  object: SceneObject
): void {
  addTemplateLookupKey(lookup, value, object);
}

function addTemplateLookupKey(
  lookup: Map<string, SceneObject>,
  value: string | undefined,
  object: SceneObject
): void {
  const key = normalizeLookupKey(value);
  if (key && !lookup.has(key)) {
    lookup.set(key, object);
  }
}

function resolveAreaObjectTemplateObject(
  entry: AreaApiDetail["objects"][number],
  sceneKind: SceneObjectKind,
  sourceResRef: string,
  lookup: ReadonlyMap<string, SceneObject>
): SceneObject | undefined {
  if (!AREA_OBJECT_TEMPLATE_KINDS.has(sceneKind)) {
    return undefined;
  }
  return (
    lookup.get(normalizeLookupKey(sourceResRef)) ??
    lookup.get(normalizeLookupKey(entry.resRef)) ??
    lookup.get(normalizeLookupKey(entry.templateId))
  );
}

function resolveCreatureTemplateObject(
  entry: AreaApiDetail["objects"][number],
  sourceResRef: string,
  lookup: ReadonlyMap<string, SceneObject>
): SceneObject | undefined {
  const metadataTemplateResRef =
    typeof entry.creatureMetadata?.templateResRef === "string"
      ? entry.creatureMetadata.templateResRef
      : undefined;
  return (
    lookup.get(normalizeLookupKey(metadataTemplateResRef)) ??
    lookup.get(normalizeLookupKey(sourceResRef)) ??
    lookup.get(normalizeLookupKey(entry.templateId))
  );
}

function normalizeLookupKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function mergeAreaCreatureProperties(
  templateProperties: SceneObjectCreatureProperties | undefined,
  gitProperties: SceneObjectCreatureProperties | undefined,
  metadata: AreaCreatureMetadata | undefined
): SceneObjectCreatureProperties | undefined {
  if (!templateProperties) {
    return gitProperties ? cloneCreatureProperties(gitProperties) : undefined;
  }
  const merged = cloneCreatureProperties(templateProperties);
  if (!gitProperties || !metadata) {
    return merged;
  }

  if (hasMetadataKey(metadata, "firstName")) merged.firstName = gitProperties.firstName;
  if (hasMetadataKey(metadata, "lastName")) merged.lastName = gitProperties.lastName;
  if (hasAnyMetadataKey(metadata, ["race", "raceLabel"])) merged.race = gitProperties.race;
  if (hasAnyMetadataKey(metadata, ["appearanceId", "appearanceLabel"])) {
    merged.appearance = gitProperties.appearance;
  }
  if (hasAnyMetadataKey(metadata, ["phenotype", "phenotypeLabel"])) {
    merged.phenotype = gitProperties.phenotype;
  }
  if (hasMetadataKey(metadata, "gender")) merged.gender = gitProperties.gender;
  if (hasMetadataKey(metadata, "description")) merged.description = gitProperties.description;
  if (hasMetadataKey(metadata, "comments")) merged.comments = gitProperties.comments;
  if (hasAnyMetadataKey(metadata, ["challengeRating", "challengeRatingEffective"])) {
    merged.challengeRating = gitProperties.challengeRating;
  }
  if (hasAnyMetadataKey(metadata, ["portraitId", "portraitResRef", "portraitResolvedResRef"])) {
    merged.portraitResRef = gitProperties.portraitResRef;
  }
  if (hasMetadataKey(metadata, "conversation")) merged.conversation = gitProperties.conversation;
  if (hasMetadataKey(metadata, "interruptable")) merged.noInterrupt = gitProperties.noInterrupt;
  if (hasAnyMetadataKey(metadata, ["goodEvil", "lawfulChaotic"])) {
    merged.alignment = gitProperties.alignment;
  }
  if (hasCreatureAppearanceMetadata(metadata) && gitProperties.appearanceSettings) {
    merged.appearanceSettings = cloneAppearanceSettings(gitProperties.appearanceSettings);
  }
  if (hasCreatureAppearanceProfileMetadata(metadata) && gitProperties.appearanceProfile) {
    merged.appearanceProfile = { ...gitProperties.appearanceProfile };
  }
  if (hasAnyMetadataKey(metadata, CREATURE_LOOKUP_PROFILE_METADATA_KEYS) && gitProperties.lookupProfile) {
    merged.lookupProfile = { ...gitProperties.lookupProfile };
  }
  if (
    hasAnyMetadataKey(metadata, CREATURE_LOCALIZED_STRING_REF_METADATA_KEYS) &&
    gitProperties.localizedStringRefs
  ) {
    merged.localizedStringRefs = { ...gitProperties.localizedStringRefs };
  }
  if (
    hasAnyMetadataKey(metadata, CREATURE_LOCALIZED_STRING_METADATA_KEYS) &&
    gitProperties.localizedStrings
  ) {
    merged.localizedStrings = { ...gitProperties.localizedStrings };
  }
  merged.statistics = mergeCreatureStatistics(
    merged.statistics,
    gitProperties.statistics,
    metadata
  );
  merged.scriptSlots = mergeCreatureScriptSlots(
    merged.scriptSlots,
    gitProperties.scriptSlots,
    metadata
  );
  merged.advancedSettings = mergeCreatureAdvancedSettings(
    merged.advancedSettings,
    gitProperties.advancedSettings,
    metadata
  );
  mergeCreatureListProperties(merged, gitProperties, metadata);
  if (hasAnyMetadataKey(metadata, CREATURE_LIST_COUNT_METADATA_KEYS) && gitProperties.listCounts) {
    merged.listCounts = { ...gitProperties.listCounts };
  }

  return merged;
}

function mergeCreatureListProperties(
  merged: SceneObjectCreatureProperties,
  gitProperties: SceneObjectCreatureProperties,
  metadata: AreaCreatureMetadata
): void {
  if (hasAnyMetadataKey(metadata, ["classListEntries", "classListCount"])) {
    merged.classEntries = cloneObjectList(gitProperties.classEntries);
    merged.spells = cloneObjectList(gitProperties.spells);
  }
  if (hasAnyMetadataKey(metadata, ["templateListEntries", "templateListCount"])) {
    merged.templateEntries = cloneObjectList(gitProperties.templateEntries);
  }
  if (hasAnyMetadataKey(metadata, ["skillListEntries", "skillListCount"])) {
    merged.skills = cloneObjectList(gitProperties.skills);
  }
  if (hasAnyMetadataKey(metadata, ["featListEntries", "featListCount"])) {
    merged.feats = cloneObjectList(gitProperties.feats);
  }
  if (hasAnyMetadataKey(metadata, ["specAbilityListEntries", "specAbilityListCount"])) {
    merged.specialAbilities = cloneObjectList(gitProperties.specialAbilities);
  }
  if (hasAnyMetadataKey(metadata, ["inventoryItemListEntries", "inventoryItemListCount"])) {
    merged.inventoryItems = cloneObjectList(gitProperties.inventoryItems);
  }
  if (hasAnyMetadataKey(metadata, ["equipItemListEntries", "equipItemListCount"])) {
    merged.equippedItems = cloneObjectList(gitProperties.equippedItems);
  }
}

function cloneCreatureProperties(
  source: SceneObjectCreatureProperties
): SceneObjectCreatureProperties {
  return {
    ...source,
    statistics: source.statistics
      ? {
          ...source.statistics,
          abilityScores: { ...source.statistics.abilityScores },
          racialModifiers: { ...source.statistics.racialModifiers },
          saves: { ...source.statistics.saves }
        }
      : undefined,
    appearanceSettings: source.appearanceSettings
      ? cloneAppearanceSettings(source.appearanceSettings)
      : undefined,
    appearanceProfile: source.appearanceProfile ? { ...source.appearanceProfile } : undefined,
    lookupProfile: source.lookupProfile ? { ...source.lookupProfile } : undefined,
    listCounts: source.listCounts ? { ...source.listCounts } : undefined,
    localizedStringRefs: source.localizedStringRefs
      ? { ...source.localizedStringRefs }
      : undefined,
    localizedStrings: source.localizedStrings ? { ...source.localizedStrings } : undefined,
    classEntries: source.classEntries?.map((entry) => ({ ...entry })),
    templateEntries: source.templateEntries?.map((entry) => ({ ...entry })),
    skills: source.skills?.map((entry) => ({ ...entry })),
    scriptSlots: source.scriptSlots ? { ...source.scriptSlots } : undefined,
    advancedSettings: source.advancedSettings ? { ...source.advancedSettings } : undefined,
    feats: source.feats?.map((entry) => ({ ...entry })),
    spells: source.spells?.map((entry) => ({ ...entry })),
    specialAbilities: source.specialAbilities?.map((entry) => ({ ...entry })),
    variables: source.variables?.map((entry) => ({ ...entry })),
    inventoryItems: source.inventoryItems?.map((entry) => ({ ...entry })),
    equippedItems: source.equippedItems?.map((entry) => ({ ...entry }))
  };
}

function clonePlaceableProperties(
  source: SceneObjectPlaceableProperties
): SceneObjectPlaceableProperties {
  return {
    ...source,
    scriptSlots: source.scriptSlots ? { ...source.scriptSlots } : undefined,
    disabledFlags: source.disabledFlags ? { ...source.disabledFlags } : undefined,
    lockSettings: source.lockSettings ? { ...source.lockSettings } : undefined,
    trapSettings: source.trapSettings ? { ...source.trapSettings } : undefined,
    advancedSettings: source.advancedSettings ? { ...source.advancedSettings } : undefined,
    ...(source.inventoryItems
      ? { inventoryItems: source.inventoryItems.map((entry) => ({ ...entry })) }
      : {}),
    ...(source.variables
      ? { variables: source.variables.map((entry) => ({ ...entry })) }
      : {})
  };
}

function readAreaPlaceableOnUsed(metadata: AreaPlaceableMetadata | undefined): string | undefined {
  const value = metadata?.["script.onUsed"];
  return typeof value === "string" ? value : undefined;
}

function readAreaPlaceableScriptResRefs(
  metadata: AreaPlaceableMetadata | undefined
): AreaPlaceableScriptResRefs | undefined {
  const result: AreaPlaceableScriptResRefs = {};
  for (const [metadataKey, slot] of AREA_PLACEABLE_SCRIPT_METADATA_MAPPINGS) {
    const value = metadata?.[metadataKey];
    if (typeof value === "string") {
      result[slot] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function readAreaPlaceableTrapScriptResRefs(
  metadata: AreaPlaceableMetadata | undefined
): AreaPlaceableTrapScriptResRefs | undefined {
  const result: AreaPlaceableTrapScriptResRefs = {};
  const onDisarm = metadata?.["script.onDisarm"];
  const onTrapTriggered = metadata?.["script.onTrapTriggered"];
  if (typeof onDisarm === "string") result.onDisarmScript = onDisarm;
  if (typeof onTrapTriggered === "string") {
    result.onTrapTriggeredScript = onTrapTriggered;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function readAreaPlaceableBoolean(
  metadata: AreaPlaceableMetadata | undefined,
  key: "static" | "useable" | "plot" | "hasInventory"
): boolean | undefined {
  const value = metadata?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readAreaPlaceableHitPointState(
  metadata: AreaPlaceableMetadata | undefined
): Readonly<PlaceableHitPointState> | undefined {
  if (!metadata ||
    !Object.prototype.hasOwnProperty.call(metadata, "hitPoints") ||
    !Object.prototype.hasOwnProperty.call(metadata, "currentHitPoints")) {
    return undefined;
  }
  return readPlaceableHitPointState({
    hitPoints: metadata.hitPoints,
    currentHitPoints: metadata.currentHitPoints
  }) ?? undefined;
}

function readAreaPlaceableLockSettings(
  metadata: AreaPlaceableMetadata | undefined
): AreaPlaceableLockSettings | undefined {
  const result: AreaPlaceableLockSettings = {};
  for (const mapping of PLACEABLE_LOCK_FIELD_MAPPINGS) {
    const value = metadata?.[mapping.metadataKey];
    if (isPlaceableLockFieldValue(mapping.valueKind, value)) {
      result[mapping.slot] = value as never;
    }
  }
  const keyName = metadata?.keyName;
  if (isPlaceableKeyName(keyName)) result.keyTag = keyName;
  return Object.keys(result).length > 0 ? result : undefined;
}

function mergeAreaPlaceableProperties(
  templateProperties: SceneObjectPlaceableProperties | undefined,
  placeableOnUsed: string | undefined,
  placeableScriptResRefs: AreaPlaceableScriptResRefs | undefined,
  placeableTrapScriptResRefs: AreaPlaceableTrapScriptResRefs | undefined,
  placeableUseable: boolean | undefined,
  placeablePlot: boolean | undefined,
  placeableHasInventory: boolean | undefined,
  placeableLockSettings: AreaPlaceableLockSettings | undefined,
  placeableInventoryItems: readonly SceneObjectPlaceableInventorySourceEntry[] | undefined,
  placeableVariables: SceneObjectPlaceableProperties["variables"] | undefined,
  placeableDurabilitySaveBytes: SceneObjectPlaceableDurabilitySaveBytes | undefined,
  placeableConversation: string | undefined,
  placeableInterruptable: PlaceableInterruptable | undefined,
  placeableTrapByteSettings: SceneObjectPlaceableTrapByteSettings | undefined,
  placeableTrapTypeRow: ScenePlaceableTrapTypeRow | undefined,
  placeableBodyBagRow: number | undefined,
  placeablePortraitRow: ScenePlaceablePortraitRow | undefined,
  placeableFactionRow: ScenePlaceableFactionRow | undefined,
  placeableTemplateResRef: string | undefined,
  placeableAnimationState: PlaceableAnimationState | undefined,
  placeableEditorComment: string | undefined,
  placeableAppearanceType: number | undefined,
  placeableHitPointState: Readonly<PlaceableHitPointState> | undefined,
  placeableLocalizedName: string | undefined,
  placeableDescription: string | undefined
): SceneObjectPlaceableProperties {
  const merged = templateProperties
    ? clonePlaceableProperties(templateProperties)
    : { plot: false, useable: false, hasInventory: false };
  if (placeableUseable !== undefined) {
    merged.useable = placeableUseable;
  }
  if (placeablePlot !== undefined) {
    merged.plot = placeablePlot;
  }
  if (placeableHasInventory !== undefined) {
    merged.hasInventory = placeableHasInventory;
  }
  if (placeableAppearanceType !== undefined) {
    merged.appearanceType = placeableAppearanceType;
  } else {
    delete merged.appearanceType;
  }
  if (placeableHitPointState !== undefined) {
    merged.hitPoints = placeableHitPointState.hitPoints;
  } else {
    delete merged.hitPoints;
  }
  if (placeableInventoryItems !== undefined) {
    merged.inventoryItems = placeableInventoryItems.map((entry) => ({ ...entry }));
  }
  if (placeableVariables !== undefined) {
    merged.variables = placeableVariables.map((entry) => ({ ...entry }));
  } else {
    delete merged.variables;
  }
  Object.assign(merged, placeableDurabilitySaveBytes ?? {});
  if (placeableEditorComment !== undefined) {
    merged.comments = placeableEditorComment;
  }
  if (placeableLocalizedName !== undefined) {
    merged.localizedName = placeableLocalizedName;
  } else {
    delete merged.localizedName;
  }
  if (placeableDescription !== undefined) {
    merged.description = placeableDescription;
  } else {
    delete merged.description;
  }
  if (
    placeableTemplateResRef === undefined &&
    merged.advancedSettings &&
    Object.prototype.hasOwnProperty.call(merged.advancedSettings, "blueprintResRef")
  ) {
    const advancedSettings = { ...merged.advancedSettings };
    delete advancedSettings.blueprintResRef;
    if (Object.keys(advancedSettings).length === 0) {
      delete merged.advancedSettings;
    } else {
      merged.advancedSettings = advancedSettings;
    }
  }
  if (
    placeablePortraitRow === undefined && merged.advancedSettings &&
    (Object.prototype.hasOwnProperty.call(merged.advancedSettings, "portraitId") ||
      Object.prototype.hasOwnProperty.call(merged.advancedSettings, "portraitResRef"))
  ) {
    const advancedSettings = { ...merged.advancedSettings };
    delete advancedSettings.portraitId;
    delete advancedSettings.portraitResRef;
    if (Object.keys(advancedSettings).length === 0) delete merged.advancedSettings;
    else merged.advancedSettings = advancedSettings;
  }
  if (
    placeableFactionRow === undefined && merged.advancedSettings &&
    (Object.prototype.hasOwnProperty.call(merged.advancedSettings, "factionId") ||
      Object.prototype.hasOwnProperty.call(merged.advancedSettings, "belongsToFaction"))
  ) {
    const advancedSettings = { ...merged.advancedSettings };
    delete advancedSettings.factionId;
    delete advancedSettings.belongsToFaction;
    if (Object.keys(advancedSettings).length === 0) delete merged.advancedSettings;
    else merged.advancedSettings = advancedSettings;
  }
  if (
    placeableConversation !== undefined ||
    placeableInterruptable !== undefined ||
    placeableAnimationState !== undefined ||
    placeableBodyBagRow !== undefined ||
    placeablePortraitRow !== undefined ||
    placeableFactionRow !== undefined ||
    placeableTemplateResRef !== undefined
  ) {
    const advancedSettings = merged.advancedSettings
      ? { ...merged.advancedSettings }
      : {};
    if (placeableConversation !== undefined) {
      advancedSettings.conversation = placeableConversation;
    }
    if (placeableInterruptable !== undefined) {
      advancedSettings.noInterrupt = projectPlaceableNoInterrupt(placeableInterruptable);
    }
    if (placeableAnimationState !== undefined) {
      advancedSettings.initialState = projectPlaceableAnimationStateToken(placeableAnimationState);
    }
    if (placeableBodyBagRow !== undefined) {
      advancedSettings.treasureModelRow = placeableBodyBagRow;
      delete advancedSettings.treasureModel;
    }
    if (placeablePortraitRow !== undefined) {
      advancedSettings.portraitId = placeablePortraitRow.rowIndex;
      advancedSettings.portraitResRef = placeablePortraitRow.baseResRef;
    }
    if (placeableFactionRow !== undefined) {
      advancedSettings.factionId = placeableFactionRow.factionId;
      advancedSettings.belongsToFaction = placeableFactionRow.name;
    }
    if (placeableTemplateResRef !== undefined) {
      advancedSettings.blueprintResRef = placeableTemplateResRef;
    }
    merged.advancedSettings = advancedSettings;
  }
  if (placeableLockSettings !== undefined) {
    const lockSettings: SceneObjectPlaceableLockSettings = templateProperties?.lockSettings
      ? { ...templateProperties.lockSettings }
      : {
          locked: false,
          canRelock: false,
          autoRemoveKeyAfterUse: false,
          keyRequiredToUnlockOrLock: false,
          openLockDc: 18,
          closeLockDc: 0,
          keyTag: ""
        };
    Object.assign(lockSettings, placeableLockSettings);
    merged.lockSettings = lockSettings;
  }
  if (placeableOnUsed !== undefined || placeableScriptResRefs !== undefined) {
    const scriptSlots: SceneObjectPlaceableScriptSlots = templateProperties?.scriptSlots
      ? { ...templateProperties.scriptSlots }
      : createEmptyPlaceableScriptSlots();
    if (placeableOnUsed !== undefined) scriptSlots.onUsed = placeableOnUsed;
    for (const [slot, value] of Object.entries(placeableScriptResRefs ?? {})) {
      scriptSlots[slot as keyof AreaPlaceableScriptResRefs] = value;
    }
    merged.scriptSlots = scriptSlots;
  }
  if (placeableTrapScriptResRefs !== undefined) {
    const trapSettings = merged.trapSettings
      ? { ...merged.trapSettings }
      : createAreaPlaceableTrapSettingsBase();
    Object.assign(trapSettings, placeableTrapScriptResRefs);
    merged.trapSettings = trapSettings;
  }
  if (placeableTrapByteSettings !== undefined) {
    const trapSettings = merged.trapSettings
      ? { ...merged.trapSettings }
      : createAreaPlaceableTrapSettingsBase();
    Object.assign(trapSettings, placeableTrapByteSettings);
    merged.trapSettings = trapSettings;
  }
  if (placeableTrapTypeRow !== undefined) {
    const trapSettings = merged.trapSettings
      ? { ...merged.trapSettings }
      : createAreaPlaceableTrapSettingsBase();
    trapSettings.trapTypeRow = placeableTrapTypeRow.rowIndex;
    trapSettings.setDc = placeableTrapTypeRow.setDc;
    trapSettings.detectDcModWhenSetByRogue = placeableTrapTypeRow.detectDcMod;
    trapSettings.disarmDcModWhenSetByRogue = placeableTrapTypeRow.disarmDcMod;
    merged.trapSettings = trapSettings;
  }
  return merged;
}

function createAreaPlaceableTrapSettingsBase(): SceneObjectPlaceableTrapSettings {
  const settings = createDefaultPlaceableTrapSettings();
  for (const mapping of PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
    delete settings[mapping.slot];
  }
  return settings;
}

function cloneItemProperties(source: SceneObjectItemProperties): SceneObjectItemProperties {
  return {
    ...source,
    modelParts: source.modelParts ? [...source.modelParts] : undefined,
    modelPartResRefs: source.modelPartResRefs ? [...source.modelPartResRefs] : undefined,
    modelPartResRefRoles: source.modelPartResRefRoles ? [...source.modelPartResRefRoles] : undefined,
    baseItemReqFeats: source.baseItemReqFeats ? [...source.baseItemReqFeats] : undefined,
    armorPreviewContext: source.armorPreviewContext
      ? { ...source.armorPreviewContext }
      : undefined,
    modelPartCandidates: source.modelPartCandidates?.map((entry) => ({ ...entry })),
    armorPartModelCandidates: source.armorPartModelCandidates?.map((entry) => ({ ...entry })),
    modelAssetCandidates: source.modelAssetCandidates?.map((entry) => ({ ...entry })),
    armorPartCostModifiers: source.armorPartCostModifiers
      ? { ...source.armorPartCostModifiers }
      : undefined,
    armorParts: source.armorParts ? { ...source.armorParts } : undefined,
    materialColors: source.materialColors ? { ...source.materialColors } : undefined,
    propertyList: source.propertyList?.map((entry) => ({ ...entry })),
    scripts: source.scripts ? { ...source.scripts } : undefined
  };
}

function mergeAreaItemProperties(
  templateProperties: SceneObjectItemProperties | undefined,
  metadata: AreaItemMetadata | undefined
): SceneObjectItemProperties | undefined {
  const merged = templateProperties ? cloneItemProperties(templateProperties) : {};
  if (!metadata) {
    return templateProperties ? merged : undefined;
  }

  setItemStringField(merged, metadata, "localizedName", "localizedName");
  setItemStringField(merged, metadata, "description", "description");
  setItemStringField(merged, metadata, "identifiedDescription", "identifiedDescription");
  setItemStringField(merged, metadata, "comments", "comments");

  const numericBindings: Array<[string, keyof SceneObjectItemProperties]> = [
    ["localizedNameStrRef", "localizedNameStrRef"],
    ["descriptionStrRef", "descriptionStrRef"],
    ["identifiedDescriptionStrRef", "identifiedDescriptionStrRef"],
    ["paletteId", "paletteId"],
    ["baseItem", "baseItem"],
    ["modelPart1", "modelPart1"],
    ["modelPart2", "modelPart2"],
    ["modelPart3", "modelPart3"],
    ["cost", "cost"],
    ["addCost", "addCost"],
    ["costTable", "costTable"],
    ["costValue", "costValue"],
    ["charges", "charges"],
    ["stackSize", "stackSize"]
  ];
  for (const [metadataKey, propertyKey] of numericBindings) {
    setItemNumberField(merged, metadata, metadataKey, propertyKey);
  }
  merged.modelParts = [merged.modelPart1, merged.modelPart2, merged.modelPart3].filter(
    (entry): entry is number => typeof entry === "number" && Number.isFinite(entry)
  );

  const booleanBindings: Array<[string, keyof SceneObjectItemProperties]> = [
    ["identified", "identified"],
    ["stolen", "stolen"],
    ["plot", "plot"],
    ["cursed", "cursed"]
  ];
  for (const [metadataKey, propertyKey] of booleanBindings) {
    setItemBooleanField(merged, metadata, metadataKey, propertyKey);
  }

  const armorParts = { ...(merged.armorParts ?? {}) };
  const armorBindings: Array<[string, keyof NonNullable<SceneObjectItemProperties["armorParts"]>]> = [
    ["bodyPartRFoot", "rFoot"],
    ["bodyPartLFoot", "lFoot"],
    ["bodyPartRShin", "rShin"],
    ["bodyPartLShin", "lShin"],
    ["bodyPartLThigh", "lThigh"],
    ["bodyPartRThigh", "rThigh"],
    ["bodyPartPelvis", "pelvis"],
    ["bodyPartTorso", "torso"],
    ["bodyPartBelt", "belt"],
    ["bodyPartNeck", "neck"],
    ["bodyPartRFArm", "rFArm"],
    ["bodyPartLFArm", "lFArm"],
    ["bodyPartRBicep", "rBicep"],
    ["bodyPartLBicep", "lBicep"],
    ["bodyPartRShoul", "rShoul"],
    ["bodyPartLShoul", "lShoul"],
    ["bodyPartRHand", "rHand"],
    ["bodyPartLHand", "lHand"],
    ["bodyPartRobe", "robe"]
  ];
  for (const [metadataKey, partKey] of armorBindings) {
    const value = readMetadataNumber(metadata, metadataKey);
    if (value !== undefined) {
      armorParts[partKey] = value;
    }
  }
  if (Object.keys(armorParts).length > 0) {
    merged.armorParts = armorParts;
  }

  const materialColors = { ...(merged.materialColors ?? {}) };
  const colorBindings: Array<[string, keyof NonNullable<SceneObjectItemProperties["materialColors"]>]> = [
    ["leather1Color", "leather1"],
    ["leather2Color", "leather2"],
    ["cloth1Color", "cloth1"],
    ["cloth2Color", "cloth2"],
    ["metal1Color", "metal1"],
    ["metal2Color", "metal2"]
  ];
  for (const [metadataKey, colorKey] of colorBindings) {
    const value = readMetadataNumber(metadata, metadataKey);
    if (value !== undefined) {
      materialColors[colorKey] = value;
    }
  }
  if (Object.keys(materialColors).length > 0) {
    merged.materialColors = materialColors;
  }

  const propertyList = readItemPropertyEntries(metadata.itemPropertyListEntries);
  if (propertyList) {
    merged.propertyList = propertyList;
  }
  const scripts = readItemScriptEntries(metadata);
  if (scripts) {
    merged.scripts = scripts;
  }

  return Object.keys(merged).length > 0 ? merged : undefined;
}

function readMetadataString(metadata: AreaItemMetadata, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readMetadataNumber(metadata: AreaItemMetadata, key: string): number | undefined {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readMetadataBoolean(metadata: AreaItemMetadata, key: string): boolean | undefined {
  const value = metadata[key];
  return typeof value === "boolean" ? value : undefined;
}

function setItemStringField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataString(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function setItemNumberField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataNumber(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function setItemBooleanField(
  target: SceneObjectItemProperties,
  metadata: AreaItemMetadata,
  metadataKey: string,
  propertyKey: keyof SceneObjectItemProperties
): void {
  const value = readMetadataBoolean(metadata, metadataKey);
  if (value !== undefined) {
    (target as Record<string, unknown>)[propertyKey] = value;
  }
}

function readItemPropertyEntries(
  value: AreaApiCreatureMetadataPrimitive | undefined
): SceneObjectItemProperties["propertyList"] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry) => ({
        propertyName: readFiniteObjectNumber(entry, "propertyName"),
        subtype: readFiniteObjectNumber(entry, "subtype"),
        costTable: readFiniteObjectNumber(entry, "costTable"),
        costValue: readFiniteObjectNumber(entry, "costValue"),
        param1: readFiniteObjectNumber(entry, "param1"),
        param1Value: readFiniteObjectNumber(entry, "param1Value"),
        chanceAppear: readFiniteObjectNumber(entry, "chanceAppear")
      }))
      .filter((entry) =>
        Object.values(entry).some((entryValue) => typeof entryValue === "number")
      );
  } catch {
    return undefined;
  }
}

function readFiniteObjectNumber(source: Record<string, unknown>, key: string): number | undefined {
  const value = source[key];
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : undefined;
}

function readItemScriptEntries(metadata: AreaItemMetadata): Record<string, string> | undefined {
  const scripts = Object.fromEntries(
    Object.entries(metadata)
      .filter(([key, value]) => key.startsWith("script.") && typeof value === "string")
      .map(([key, value]) => [key.slice("script.".length), String(value).trim()] as const)
      .filter(([key, value]) => key.length > 0 && value.length > 0)
  );
  return Object.keys(scripts).length > 0 ? scripts : undefined;
}

function cloneObjectList<T extends object>(source: readonly T[] | undefined): T[] | undefined {
  return source?.map((entry) => ({ ...entry }));
}

function cloneAppearanceSettings(
  source: NonNullable<SceneObjectCreatureProperties["appearanceSettings"]>
): NonNullable<SceneObjectCreatureProperties["appearanceSettings"]> {
  return {
    ...source,
    colors: source.colors ? { ...source.colors } : undefined,
    sourceOnlyParts: source.sourceOnlyParts ? { ...source.sourceOnlyParts } : undefined
  };
}

function mergeCreatureStatistics(
  templateStats: SceneObjectCreatureProperties["statistics"],
  gitStats: SceneObjectCreatureProperties["statistics"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["statistics"] {
  if (!gitStats) {
    return templateStats;
  }
  const merged = templateStats
    ? {
        ...templateStats,
        abilityScores: { ...templateStats.abilityScores },
        racialModifiers: { ...templateStats.racialModifiers },
        saves: { ...templateStats.saves }
      }
    : {
        ...gitStats,
        abilityScores: { ...gitStats.abilityScores },
        racialModifiers: { ...gitStats.racialModifiers },
        saves: { ...gitStats.saves }
      };

  if (hasMetadataKey(metadata, "strength")) merged.abilityScores.strength = gitStats.abilityScores.strength;
  if (hasMetadataKey(metadata, "dexterity")) merged.abilityScores.dexterity = gitStats.abilityScores.dexterity;
  if (hasMetadataKey(metadata, "constitution")) {
    merged.abilityScores.constitution = gitStats.abilityScores.constitution;
  }
  if (hasMetadataKey(metadata, "intelligence")) {
    merged.abilityScores.intelligence = gitStats.abilityScores.intelligence;
  }
  if (hasMetadataKey(metadata, "wisdom")) merged.abilityScores.wisdom = gitStats.abilityScores.wisdom;
  if (hasMetadataKey(metadata, "charisma")) merged.abilityScores.charisma = gitStats.abilityScores.charisma;
  if (hasMetadataKey(metadata, "strengthAdjust")) {
    merged.racialModifiers.strength = gitStats.racialModifiers.strength;
  }
  if (hasMetadataKey(metadata, "dexterityAdjust")) {
    merged.racialModifiers.dexterity = gitStats.racialModifiers.dexterity;
  }
  if (hasMetadataKey(metadata, "constitutionAdjust")) {
    merged.racialModifiers.constitution = gitStats.racialModifiers.constitution;
  }
  if (hasMetadataKey(metadata, "intelligenceAdjust")) {
    merged.racialModifiers.intelligence = gitStats.racialModifiers.intelligence;
  }
  if (hasMetadataKey(metadata, "wisdomAdjust")) {
    merged.racialModifiers.wisdom = gitStats.racialModifiers.wisdom;
  }
  if (hasMetadataKey(metadata, "charismaAdjust")) {
    merged.racialModifiers.charisma = gitStats.racialModifiers.charisma;
  }
  if (hasMetadataKey(metadata, "naturalAc")) merged.naturalArmorClass = gitStats.naturalArmorClass;
  if (hasMetadataKey(metadata, "reflexBonus")) merged.saves.reflexBonus = gitStats.saves.reflexBonus;
  if (hasMetadataKey(metadata, "willBonus")) merged.saves.willBonus = gitStats.saves.willBonus;
  if (hasMetadataKey(metadata, "fortitudeBonus")) merged.saves.fortitudeBonus = gitStats.saves.fortitudeBonus;
  if (hasAnyMetadataKey(metadata, ["hitPoints", "maxHitPoints"])) {
    merged.baseHitPoints = gitStats.baseHitPoints;
    merged.hitPointBonuses = gitStats.hitPointBonuses;
    merged.maxHitPoints = gitStats.maxHitPoints;
  }
  if (hasMetadataKey(metadata, "currentHitPoints")) {
    merged.currentHitPoints = gitStats.currentHitPoints;
  }
  if (hasAnyMetadataKey(metadata, ["walkRate", "walkRateEffective"])) {
    merged.movementRate = gitStats.movementRate;
  }
  return merged;
}

function buildCreatureScriptResRefsProvenance(
  storage: CreatureScriptResRefsStorage,
): SceneObjectCreatureScriptResRefsProvenance | null {
  const provenance: Record<string, Readonly<{ expectedResRef: string }>> = {};
  for (const { key } of CREATURE_SCRIPT_RESREF_FIELDS) {
    const member = storage[key];
    if (member.present) {
      provenance[key] = Object.freeze({ expectedResRef: member.value });
    }
  }
  return Object.keys(provenance).length > 0
    ? Object.freeze(provenance) as SceneObjectCreatureScriptResRefsProvenance
    : null;
}

function mergeCreatureScriptSlots(
  templateSlots: SceneObjectCreatureProperties["scriptSlots"],
  gitSlots: SceneObjectCreatureProperties["scriptSlots"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["scriptSlots"] {
  if (!gitSlots) {
    return templateSlots;
  }
  const merged = templateSlots ? { ...templateSlots } : { ...gitSlots };
  const bindings: Array<[string, keyof NonNullable<SceneObjectCreatureProperties["scriptSlots"]>]> = [
    ["script.scriptonblocked", "onBlocked"],
    ["script.scriptendround", "onCombatRoundEnd"],
    ["script.scriptdialogue", "onConversation"],
    ["script.scriptdamaged", "onDamaged"],
    ["script.scriptdeath", "onDeath"],
    ["script.scriptdisturbed", "onDisturbed"],
    ["script.scriptheartbeat", "onHeartbeat"],
    ["script.scriptonnotice", "onPerception"],
    ["script.scriptattacked", "onPhysicalAttacked"],
    ["script.scriptrested", "onRested"],
    ["script.scriptspawn", "onSpawn"],
    ["script.scriptspellat", "onSpellCastAt"],
    ["script.scriptuserdefine", "onUserDefined"]
  ];
  for (const [metadataKey, slotKey] of bindings) {
    if (hasMetadataKey(metadata, metadataKey)) {
      merged[slotKey] = gitSlots[slotKey];
    }
  }
  return merged;
}

function mergeCreatureAdvancedSettings(
  templateSettings: SceneObjectCreatureProperties["advancedSettings"],
  gitSettings: SceneObjectCreatureProperties["advancedSettings"],
  metadata: AreaCreatureMetadata
): SceneObjectCreatureProperties["advancedSettings"] {
  if (!gitSettings) {
    return templateSettings;
  }
  const merged = templateSettings ? { ...templateSettings } : { ...gitSettings };
  if (hasMetadataKey(metadata, "templateResRef")) merged.blueprintResRef = gitSettings.blueprintResRef;
  if (hasMetadataKey(metadata, "paletteId")) merged.paletteId = gitSettings.paletteId;
  if (hasMetadataKey(metadata, "disarmable")) merged.disarmable = gitSettings.disarmable;
  if (hasMetadataKey(metadata, "plot")) merged.plot = gitSettings.plot;
  if (hasMetadataKey(metadata, "isPc")) merged.playerCharacter = gitSettings.playerCharacter;
  if (hasMetadataKey(metadata, "lootable")) merged.leavesLootableCorpse = gitSettings.leavesLootableCorpse;
  if (hasMetadataKey(metadata, "noPermDeath")) merged.noPermanentDeath = gitSettings.noPermanentDeath;
  if (hasMetadataKey(metadata, "isImmortal")) merged.immortal = gitSettings.immortal;
  if (hasMetadataKey(metadata, "bodyBag")) merged.bodyBag = gitSettings.bodyBag;
  if (hasMetadataKey(metadata, "startingPackage")) merged.startingPackage = gitSettings.startingPackage;
  if (hasMetadataKey(metadata, "decayTime")) {
    merged.corpseDecayTimeSeconds = gitSettings.corpseDecayTimeSeconds;
  }
  if (hasMetadataKey(metadata, "factionId")) merged.faction = gitSettings.faction;
  if (hasMetadataKey(metadata, "subrace")) merged.subrace = gitSettings.subrace;
  if (hasMetadataKey(metadata, "deity")) merged.deity = gitSettings.deity;
  if (hasMetadataKey(metadata, "crAdjust")) {
    merged.challengeRatingAdjustment = gitSettings.challengeRatingAdjustment;
  }
  if (hasAnyMetadataKey(metadata, ["soundSetFile", "soundSetLabel", "soundSetResRef"])) {
    merged.soundSet = gitSettings.soundSet;
  }
  if (hasAnyMetadataKey(metadata, ["perceptionRange", "perceptionRangeEffective"])) {
    merged.perceptionRange = gitSettings.perceptionRange;
  }
  return merged;
}

function hasCreatureAppearanceMetadata(metadata: AreaCreatureMetadata): boolean {
  return hasAnyMetadataKey(metadata, [
    "appearanceHead",
    "bodyPartNeck",
    "bodyPartTorso",
    "bodyPartPelvis",
    "bodyPartBelt",
    "bodyPartRBicep",
    "bodyPartLBicep",
    "bodyPartRShoul",
    "bodyPartLShoul",
    "bodyPartRFArm",
    "bodyPartLFArm",
    "bodyPartRHand",
    "bodyPartLHand",
    "bodyPartRThigh",
    "bodyPartLThigh",
    "bodyPartRShin",
    "bodyPartLShin",
    "bodyPartRFoot",
    "bodyPartLFoot",
    "bodyPartRobe",
    "wingsNew",
    "tailNew",
    "colorSkin",
    "colorHair",
    "colorTattoo1",
    "colorTattoo2"
  ]);
}

function hasCreatureAppearanceProfileMetadata(metadata: AreaCreatureMetadata): boolean {
  return hasAnyMetadataKey(metadata, [
    "appearanceLabelSource2daRow",
    "appearanceLabelSourceKey",
    "appearanceModelType",
    "appearanceRaceModel",
    "appearancePortrait2da",
    "appearanceEnvMap",
    "appearanceDefaultPhenotype",
    "appearanceBloodColor",
    "appearanceSizeCategory",
    "appearanceSizeCategoryLabel",
    "appearanceSizeCategorySource2daRow",
    "appearanceSizeCategorySourceKey",
    "raceAppearanceId"
  ]);
}

function hasAnyMetadataKey(
  metadata: AreaCreatureMetadata | undefined,
  keys: readonly string[]
): boolean {
  return keys.some((key) => hasMetadataKey(metadata, key));
}

function hasMetadataKey(metadata: AreaCreatureMetadata | undefined, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(metadata ?? {}, key);
}

function terrainFromAuroraTile(tileId: number | undefined, tileIndex: number): TerrainBrushKind {
  const sourceIndex = Number.isFinite(tileId ?? Number.NaN) ? tileId ?? 0 : tileIndex;
  return AURORA_TILE_TERRAIN_SEQUENCE[Math.abs(sourceIndex) % AURORA_TILE_TERRAIN_SEQUENCE.length];
}

function normalizeOrientation(value: number | undefined): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return 0;
  }
  return ((((Math.trunc(value ?? 0) % 4) + 4) % 4) as 0 | 1 | 2 | 3);
}

function toSceneTile(area: AreaApiDetail, tile: AreaApiTileInstance): SceneTile {
  const orientation = normalizeOrientation(tile.orientation);
  return {
    id: tile.tileInstanceId,
    row: tile.row,
    col: tile.col,
    terrain: terrainFromAuroraTile(tile.tileId, tile.tileIndex),
    orientation,
    rotateTexture: orientation % 2 === 1,
    plot: false,
    source: "aurora_tile_list",
    areaId: tile.areaId || area.areaId,
    tilesetResRef: tile.tilesetResRef,
    tileIndex: tile.tileIndex,
    ...(tile.tileId !== undefined ? { tileId: tile.tileId } : {}),
    ...(tile.modelResRef ? { modelResRef: tile.modelResRef } : {}),
    ...(tile.modelSource ? { modelSource: tile.modelSource } : {}),
    ...(tile.imageMap2D ? { imageMap2D: tile.imageMap2D } : {}),
    ...(tile.tilesetOrientation !== undefined
      ? { tilesetOrientation: normalizeOrientation(tile.tilesetOrientation) }
      : {}),
    ...(tile.mainLight1 !== undefined ? { mainLight1: tile.mainLight1 } : {}),
    ...(tile.mainLight2 !== undefined ? { mainLight2: tile.mainLight2 } : {}),
    ...(tile.sourceLight1 !== undefined ? { sourceLight1: tile.sourceLight1 } : {}),
    ...(tile.sourceLight2 !== undefined ? { sourceLight2: tile.sourceLight2 } : {}),
    ...(tile.mainLight1Color
      ? {
          mainLight1Color: {
            ...tile.mainLight1Color,
            ...(tile.mainLight1Color.nativeNode
              ? {
                  nativeNode: {
                    ...tile.mainLight1Color.nativeNode,
                    position: [...tile.mainLight1Color.nativeNode.position] as [number, number, number]
                  }
                }
              : {})
          }
        }
      : {}),
    ...(tile.mainLight2Color
      ? {
          mainLight2Color: {
            ...tile.mainLight2Color,
            ...(tile.mainLight2Color.nativeNode
              ? {
                  nativeNode: {
                    ...tile.mainLight2Color.nativeNode,
                    position: [...tile.mainLight2Color.nativeNode.position] as [number, number, number]
                  }
                }
              : {})
          }
        }
      : {}),
    ...(tile.sourceLight1Color
      ? {
          sourceLight1Color: {
            ...tile.sourceLight1Color,
            ...(tile.sourceLight1Color.sourceNode
              ? {
                  sourceNode:
                    tile.sourceLight1Color.sourceNode.status === "source-node-resolved"
                      ? {
                          ...tile.sourceLight1Color.sourceNode,
                          position: [...tile.sourceLight1Color.sourceNode.position] as [
                            number,
                            number,
                            number
                          ]
                        }
                      : { ...tile.sourceLight1Color.sourceNode }
                }
              : {})
          }
        }
      : {}),
    ...(tile.sourceLight2Color
      ? {
          sourceLight2Color: {
            ...tile.sourceLight2Color,
            ...(tile.sourceLight2Color.sourceNode
              ? {
                  sourceNode:
                    tile.sourceLight2Color.sourceNode.status === "source-node-resolved"
                      ? {
                          ...tile.sourceLight2Color.sourceNode,
                          position: [...tile.sourceLight2Color.sourceNode.position] as [
                            number,
                            number,
                            number
                          ]
                        }
                      : { ...tile.sourceLight2Color.sourceNode }
                }
              : {})
          }
        }
      : {}),
    ...(tile.animLoop1 !== undefined ? { animLoop1: tile.animLoop1 } : {}),
    ...(tile.animLoop2 !== undefined ? { animLoop2: tile.animLoop2 } : {}),
    ...(tile.animLoop3 !== undefined ? { animLoop3: tile.animLoop3 } : {}),
    ...(tile.pathNode ? { pathNode: tile.pathNode } : {}),
    ...(tile.visibilityNode ? { visibilityNode: tile.visibilityNode } : {}),
    ...(tile.visibilityOrientation !== undefined
      ? { visibilityOrientation: normalizeOrientation(tile.visibilityOrientation) }
      : {}),
    ...(tile.doorVisibilityNode ? { doorVisibilityNode: tile.doorVisibilityNode } : {}),
    ...(tile.doorVisibilityOrientation !== undefined
      ? { doorVisibilityOrientation: normalizeOrientation(tile.doorVisibilityOrientation) }
      : {}),
    ...(tile.edges ? { edges: { ...tile.edges } } : {}),
    ...(tile.cornerHeights ? { cornerHeights: { ...tile.cornerHeights } } : {}),
    ...(tile.height !== undefined ? { height: tile.height } : {}),
    ...(tile.fallbackReason ? { fallbackReason: tile.fallbackReason } : {})
  };
}

function mapAreaSceneLighting(
  lighting: AreaApiDetail["lighting"]
): Pick<AreaScene, "lighting"> {
  if (!lighting || lighting.fields.length === 0) {
    return {};
  }
  return {
    lighting: {
      source: lighting.source,
      fields: lighting.fields.map((field) => ({
        field: field.field,
        value: field.value
      }))
    }
  };
}

function mapAreaAdvancedFlags(value: unknown): AreaAdvancedFlags | undefined {
  if (!isAreaAdvancedFlags(value)) return undefined;
  return {
    ...(value.terrainType ? { terrainType: { ...value.terrainType } } : {}),
    ...(value.playerVsPlayer !== undefined ? { playerVsPlayer: value.playerVsPlayer } : {}),
    ...(value.noRest !== undefined ? { noRest: value.noRest } : {}),
    ...(value.listenCheckModifier !== undefined
      ? { listenCheckModifier: value.listenCheckModifier }
      : {}),
    ...(value.spotCheckModifier !== undefined
      ? { spotCheckModifier: value.spotCheckModifier }
      : {}),
    ...(value.loadingScreenId !== undefined
      ? { loadingScreenId: value.loadingScreenId }
      : {}),
  };
}

export function mapBackendAreaToScene(
  area: AreaApiDetail,
  now: () => number = () => Date.now(),
  options: AreaSceneMapperOptions = {}
): AreaScene {
  const areaTiles = area.tiles ?? [];
  const creatureTemplateLookup = buildCreatureTemplateLookup(options.creatureTemplateObjects);
  const objectTemplateLookup = buildAreaObjectTemplateLookup(options.objectTemplateObjects);
  const placeableTrapTypeCatalog = readPlaceableTrapTypeCatalog(area.placeableTrapTypeCatalog);
  const placeableBodyBagCatalog = readPlaceableBodyBagCatalog(area.placeableBodyBagCatalog);
  const placeablePortraitCatalog = readPlaceablePortraitCatalog(area.placeablePortraitCatalog);
  const creaturePortraitCatalog = readCreaturePortraitCatalog(area.creaturePortraitCatalog);
  const placeableFactionCatalog = readPlaceableFactionCatalog(area.placeableFactionCatalog);
  const encounterDifficultyCatalog = readEncounterDifficultyCatalog(
    area.encounterDifficultyCatalog,
  );
  const itemBaseItemCatalog = readItemBaseItemCatalog(area.itemBaseItemCatalog);
  const areaEventScripts = mapAreaEventScripts(area.eventScripts);
  const areaBasicIdentity = mapAreaBasicIdentity(area.basicIdentity);
  const areaAdvancedFlags = mapAreaAdvancedFlags(area.advancedFlags);
  const areaVariableProvenance = readAuroraVariableProvenance(area.variables);
  const areaVariables = areaVariableProvenance?.expectedEntries.map(
    ({ sourceIndex: _, ...entry }) => ({ ...entry }),
  );
  const areaAudioEnvironment = isAreaAudioEnvironment(area.audioEnvironment)
    ? { ...area.audioEnvironment }
    : undefined;
  const areaVisualEnvironment = isAreaVisualEnvironment(area.visualEnvironment)
    ? cloneAreaVisualEnvironment(area.visualEnvironment)
    : undefined;
  const areaVisualEnvironmentScalarControls = isAreaVisualEnvironmentScalarControls(
    area.visualEnvironmentScalarControls,
  )
    ? cloneAreaVisualEnvironmentScalarControls(area.visualEnvironmentScalarControls)
    : undefined;
  const areaVisualEnvironmentCatalogSelection = isAreaVisualEnvironmentCatalogSelection(
    area.visualEnvironmentCatalogSelection,
  )
    ? cloneAreaVisualEnvironmentCatalogSelection(area.visualEnvironmentCatalogSelection)
    : undefined;
  const areaAudioEnvironmentCatalogs = isEffectiveAreaAudioCatalogBundle(
    area.audioEnvironmentCatalogs,
  )
    ? cloneEffectiveAreaAudioCatalogBundle(area.audioEnvironmentCatalogs)
    : undefined;
  const areaVisualEnvironmentCatalogs = isEffectiveAreaVisualEnvironmentCatalogBundle(
    area.visualEnvironmentCatalogs,
  )
    ? cloneEffectiveAreaVisualEnvironmentCatalogBundle(area.visualEnvironmentCatalogs)
    : undefined;
  const areaLoadingScreenCatalog = isEffectiveAreaLoadingScreenCatalog(
    area.loadingScreenCatalog,
  )
    ? cloneEffectiveAreaLoadingScreenCatalog(area.loadingScreenCatalog)
    : undefined;
  const moduleStartLocation = isAreaModuleStartLocation(area.moduleStartLocation)
    ? { ...area.moduleStartLocation }
    : undefined;
  const moduleStartLocationTargets = readModuleStartLocationTargets(
    area.moduleStartLocationTargets,
  );
  const objects = area.objects.map((entry) =>
    toSceneObject(
      area.areaId,
      entry,
      creatureTemplateLookup,
      objectTemplateLookup,
      placeableTrapTypeCatalog,
      placeableBodyBagCatalog,
      placeablePortraitCatalog,
      creaturePortraitCatalog,
      placeableFactionCatalog,
      encounterDifficultyCatalog,
      itemBaseItemCatalog,
    )
  );
  if (areaTiles.length > 0) {
    return {
      sceneId: area.areaId,
      areaName: areaBasicIdentity?.name ?? area.name,
      width: area.width,
      height: area.height,
      biome: area.biome,
      tags: [...area.tags],
      ...(isAreaCommentsValue(area.comments) ? { areaComments: area.comments } : {}),
      ...(areaEventScripts ? { areaEventScripts } : {}),
      ...(areaBasicIdentity ? { areaBasicIdentity } : {}),
      ...(areaBasicIdentity?.tag !== undefined ? { areaTag: areaBasicIdentity.tag } : {}),
      ...(areaAdvancedFlags ? { areaAdvancedFlags } : {}),
      ...(areaVariables ? { areaVariables } : {}),
      ...(areaVisualEnvironment ? { areaVisualEnvironment } : {}),
      ...(areaVisualEnvironmentScalarControls
        ? { areaVisualEnvironmentScalarControls }
        : {}),
      ...(areaVisualEnvironmentCatalogSelection
        ? { areaVisualEnvironmentCatalogSelection }
        : {}),
      ...(areaAudioEnvironment ? { areaAudioEnvironment } : {}),
      ...(areaAudioEnvironmentCatalogs ? { areaAudioEnvironmentCatalogs } : {}),
      ...(areaVisualEnvironmentCatalogs ? { areaVisualEnvironmentCatalogs } : {}),
      ...(areaLoadingScreenCatalog ? { areaLoadingScreenCatalog } : {}),
      ...(moduleStartLocation ? { moduleStartLocation } : {}),
      ...(moduleStartLocationTargets
        ? { moduleStartLocationTargets: [...moduleStartLocationTargets] }
        : {}),
      benchmark: area.benchmark,
      previewImageUrl: area.previewImageUrl,
      textureAtlas: { ...area.textureAtlas },
      composition: { ...area.composition },
      backendUpdatedAt: area.updatedAt,
      ...(area.auroraVfxCollision
        ? { auroraVfxCollision: area.auroraVfxCollision }
        : {}),
      ...(area.auroraWorldTimer ? { auroraWorldTimer: area.auroraWorldTimer } : {}),
      ...mapAreaSceneLighting(area.lighting),
      ...(placeableTrapTypeCatalog ? { placeableTrapTypeCatalog } : {}),
      ...(placeableBodyBagCatalog ? { placeableBodyBagCatalog } : {}),
      ...(placeablePortraitCatalog ? { placeablePortraitCatalog } : {}),
      ...(creaturePortraitCatalog ? { creaturePortraitCatalog } : {}),
      ...(placeableFactionCatalog ? { placeableFactionCatalog } : {}),
      ...(encounterDifficultyCatalog ? { encounterDifficultyCatalog } : {}),
      ...(itemBaseItemCatalog ? { itemBaseItemCatalog } : {}),
      tileSource: {
        type: "aurora_tile_list",
        tilesetResRef: area.tileSet ?? areaTiles[0]?.tilesetResRef,
        tileCount: areaTiles.length,
        ...(areaTiles.some((tile) => tile.fallbackReason)
          ? { fallbackReason: "tile-metadata-incomplete" }
          : {})
      },
      tiles: areaTiles.map((tile) => toSceneTile(area, tile)),
      objects,
      updatedAtUnixMs: now(),
      source: "aurora_area"
    };
  }

  return {
    sceneId: area.areaId,
    areaName: areaBasicIdentity?.name ?? area.name,
    width: area.width,
    height: area.height,
    biome: area.biome,
    tags: [...area.tags],
    ...(isAreaCommentsValue(area.comments) ? { areaComments: area.comments } : {}),
    ...(areaEventScripts ? { areaEventScripts } : {}),
    ...(areaBasicIdentity ? { areaBasicIdentity } : {}),
    ...(areaBasicIdentity?.tag !== undefined ? { areaTag: areaBasicIdentity.tag } : {}),
    ...(areaAdvancedFlags ? { areaAdvancedFlags } : {}),
    ...(areaVariables ? { areaVariables } : {}),
    ...(areaVisualEnvironment ? { areaVisualEnvironment } : {}),
    ...(areaVisualEnvironmentScalarControls
      ? { areaVisualEnvironmentScalarControls }
      : {}),
    ...(areaVisualEnvironmentCatalogSelection
      ? { areaVisualEnvironmentCatalogSelection }
      : {}),
    ...(areaAudioEnvironment ? { areaAudioEnvironment } : {}),
    ...(areaAudioEnvironmentCatalogs ? { areaAudioEnvironmentCatalogs } : {}),
    ...(areaVisualEnvironmentCatalogs ? { areaVisualEnvironmentCatalogs } : {}),
    ...(areaLoadingScreenCatalog ? { areaLoadingScreenCatalog } : {}),
    ...(moduleStartLocation ? { moduleStartLocation } : {}),
    ...(moduleStartLocationTargets
      ? { moduleStartLocationTargets: [...moduleStartLocationTargets] }
      : {}),
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlas: { ...area.textureAtlas },
    composition: { ...area.composition },
    backendUpdatedAt: area.updatedAt,
    ...(area.auroraVfxCollision
      ? { auroraVfxCollision: area.auroraVfxCollision }
      : {}),
    ...(area.auroraWorldTimer ? { auroraWorldTimer: area.auroraWorldTimer } : {}),
    ...mapAreaSceneLighting(area.lighting),
    ...(placeableTrapTypeCatalog ? { placeableTrapTypeCatalog } : {}),
    ...(placeableBodyBagCatalog ? { placeableBodyBagCatalog } : {}),
    ...(placeablePortraitCatalog ? { placeablePortraitCatalog } : {}),
    ...(creaturePortraitCatalog ? { creaturePortraitCatalog } : {}),
    ...(placeableFactionCatalog ? { placeableFactionCatalog } : {}),
    ...(encounterDifficultyCatalog ? { encounterDifficultyCatalog } : {}),
    ...(itemBaseItemCatalog ? { itemBaseItemCatalog } : {}),
    tileSource: {
      type: "blocked_missing_tile_data",
      tileCount: 0,
      fallbackReason: "area-api-tile-list-missing"
    },
    tiles: [],
    objects,
    updatedAtUnixMs: now(),
    source: "aurora_area"
  };
}

function mapAreaEventScripts(value: unknown): AreaEventScripts | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: Partial<Record<(typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"], string>> = {};
  for (const { slot } of AREA_EVENT_SCRIPT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, slot)) continue;
    if (!isAreaEventScriptResRef(source[slot])) return undefined;
    result[slot] = source[slot];
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

function mapAreaBasicIdentity(value: unknown): AreaBasicIdentity | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const result: {
    name?: string;
    nameProfile?: AreaBasicIdentity["nameProfile"];
    nameEntries?: AreaBasicIdentity["nameEntries"];
    tag?: string;
  } = {};
  if (Object.prototype.hasOwnProperty.call(source, "name")) {
    if (isEditableAreaName(source.name) && isAreaNameStorageProfile(source.nameProfile)) {
      if (Object.prototype.hasOwnProperty.call(source, "nameEntries")) {
        const entries = readEditableAreaNameEntries(source.nameEntries);
        if (
          entries
          && entries.find((entry) => entry.languageId === 0)?.text === source.name
          && (entries.length === 1 ? "simple_inline_ascii" : "multi_entry_inline_ascii")
            === source.nameProfile
        ) {
          result.name = source.name;
          result.nameProfile = source.nameProfile;
          result.nameEntries = cloneAreaNameStorageEntries(entries);
        }
      } else {
        result.name = source.name;
        result.nameProfile = source.nameProfile;
      }
    }
  }
  if (Object.prototype.hasOwnProperty.call(source, "tag")) {
    if (!isEditableAreaTag(source.tag)) return undefined;
    result.tag = source.tag;
  }
  return Object.keys(result).length === 0 ? undefined : result;
}
