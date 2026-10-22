import type { AreaApiDetail } from "../contracts";
import type { ProductionAreaDraftPayload } from "../ports/areaLifecyclePort";
import type {
  AreaScene,
  SceneObject,
  SceneObjectSourceMetadata,
  SceneObjectVisualTransform,
  SceneTile,
} from "../../scene/contracts";
import {
  canEditExistingCreatureInventory,
  readCreatureInventoryTargetEntries,
} from "../../scene/domain/creatureInventory";
import {
  canEditExistingCreatureEquipment,
  readCreatureEquipmentTargetEntries,
} from "../../scene/domain/creatureEquipment";
import {
  canEditExistingCreatureTag,
  isEditableCreatureTag,
  readCreatureTagStorage,
} from "../../scene/domain/creatureTag";
import {
  canEditExistingCreatureConversation,
  isCreatureConversationTargetResRef,
  readCreatureConversationStorage,
} from "../../scene/domain/creatureConversation";
import {
  canEditExistingCreatureInterruptable,
  readCreatureInterruptableStorage,
} from "../../scene/domain/creatureInterruptable";
import {
  CREATURE_ADVANCED_FLAG_FIELDS,
  canEditExistingCreatureAdvancedFlag,
  readCreatureAdvancedFlagsStorage,
  type CreatureAdvancedFlagKey,
} from "../../scene/domain/creatureAdvancedFlags";
import {
  creatureDecaySecondsToMilliseconds,
  readCreatureBodyBagProvenance,
  readCreatureDecayTimeProvenance,
} from "../../scene/domain/creatureDeathRemains";
import {
  canEditExistingCreatureAppearance,
  readCreatureAppearanceStorage,
} from "../../scene/domain/creatureAppearance";
import {
  canEditExistingCreatureGender,
  readCreatureGenderStorage,
} from "../../scene/domain/creatureGender";
import {
  canEditExistingCreaturePerceptionRange,
  isCreaturePerceptionRangeRow,
  readCreaturePerceptionRangeStorage,
} from "../../scene/domain/creaturePerceptionRange";
import {
  canEditExistingCreatureWalkRate,
  readCreatureWalkRateStorage,
} from "../../scene/domain/creatureWalkRate";
import {
  canEditExistingCreatureSoundSetFile,
  readCreatureSoundSetFileStorage,
} from "../../scene/domain/creatureSoundSetFile";
import {
  canEditExistingCreatureStartingPackage,
  readCreatureStartingPackageStorage,
} from "../../scene/domain/creatureStartingPackage";
import {
  canEditExistingCreatureSkillList,
  readCreatureSkillListStorage,
} from "../../scene/domain/creatureSkillList";
import {
  canEditExistingCreatureFeatList,
  readCreatureFeatListStorage,
} from "../../scene/domain/creatureFeatList";
import {
  canEditExistingCreatureSpecialAbilityList,
  readCreatureSpecialAbilityListStorage,
} from "../../scene/domain/creatureSpecialAbilityList";
import {
  readCreatureVariableProvenance,
  readCreatureVariableTargetEntries,
} from "../../scene/domain/creatureVariableTable";
import {
  readEncounterVariableProvenance,
  readEncounterVariableTargetEntries,
} from "../../scene/domain/encounterVariableTable";
import {
  readWaypointVariableProvenance,
  readWaypointVariableTargetEntries,
} from "../../scene/domain/waypointVariableTable";
import {
  readTriggerVariableProvenance,
  readTriggerVariableTargetEntries,
} from "../../scene/domain/triggerVariableTable";
import {
  encounterCreatureListIdentityMatches,
  readEncounterCreatureListProvenance,
  readEncounterCreatureListTargetEntries,
} from "../../scene/domain/encounterCreatureSingleSpawn";
import {
  readEncounterSpawnPointListProvenance,
  readEncounterSpawnPointTargetEntries,
} from "../../scene/domain/encounterSpawnPointList";
import { readCreatureClassLevelState } from "../../scene/domain/creatureClassLevels";
import { readCreatureClassIdentityState } from "../../scene/domain/creatureClassIdentity";
import {
  canEditExistingCreaturePhenotype,
  readCreaturePhenotypeStorage,
} from "../../scene/domain/creaturePhenotype";
import {
  admittedCreaturePortraitRows,
  readCreaturePortraitCatalog,
  readCreaturePortraitStorage,
} from "../../scene/domain/creaturePortrait";
import {
  normalizeCreatureChallengeRating,
  readCreatureChallengeRatingStorage,
} from "../../scene/domain/creatureChallengeRating";
import {
  CREATURE_ABILITY_SCORE_FIELDS,
  normalizeCreatureAbilityScore,
  readCreatureAbilityScoresStorage,
} from "../../scene/domain/creatureAbilityScores";
import {
  CREATURE_APPEARANCE_COLOR_FIELDS,
  normalizeCreatureAppearanceColor,
  readCreatureAppearanceColorsStorage,
} from "../../scene/domain/creatureAppearanceColors";
import {
  CREATURE_BODY_PART_FIELDS,
  maximumCreatureBodyPartTarget,
  readCreatureBodyPartsStorage,
} from "../../scene/domain/creatureBodyParts";
import { readCreatureAppendagesStorage } from "../../scene/domain/creatureAppendages";
import {
  deriveExistingCreatureHitPointTarget,
  readCreatureHitPointState,
} from "../../scene/domain/creatureHitPoints";
import {
  normalizeCreatureNaturalArmorClass,
  readCreatureNaturalArmorClassStorage,
} from "../../scene/domain/creatureNaturalArmorClass";
import {
  CREATURE_SAVING_THROW_BONUS_FIELDS,
  normalizeCreatureSavingThrowBonus,
  readCreatureSavingThrowBonusesStorage,
} from "../../scene/domain/creatureSavingThrowBonuses";
import {
  normalizeCreatureAlignmentLabel,
  readCreatureAlignmentStorage,
} from "../../scene/domain/creatureAlignment";
import { readCreatureFactionProvenance } from "../../scene/domain/creatureFaction";
import {
  isCreatureTemplateResRef,
  readCreatureTemplateResRefProvenance,
} from "../../scene/domain/creatureTemplateResRef";
import {
  isCreatureSpecialIdentityString,
  readCreatureSpecialIdentityStringsProvenance,
} from "../../scene/domain/creatureSpecialIdentityStrings";
import {
  CREATURE_SCRIPT_RESREF_FIELDS,
  isCreatureScriptTargetResRef,
  readCreatureScriptResRefsProvenance,
} from "../../scene/domain/creatureScriptResRefs";
import {
  isCreatureNameInlineAsciiText,
  MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  readEditableCreatureLocalizedStringEntries,
  readEditableCreatureLocalizedStringStorage,
  readCreatureNameLocalizedStrings,
} from "../../scene/domain/creatureNameLocalizedStrings";
import {
  readPlaceableFactionCatalog,
  readPlaceableFactionProvenance,
} from "../../scene/domain/placeableFaction";
import {
  readPlaceableBodyBagCatalog,
  readPlaceableBodyBagProvenance,
} from "../../scene/domain/placeableBodyBag";
import {
  isPlaceableAnimationState,
  isPlaceableAnimationStateToken,
} from "../../scene/domain/placeableAnimationState";
import {
  isAuroraConversationResRef,
  isPlaceableInterruptable,
} from "../../scene/domain/placeableConversationInterruptable";
import {
  PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS,
  isPlaceableDurabilitySaveByte,
} from "../../scene/domain/placeableDurabilitySaveBytes";
import {
  isEditablePlaceableHitPoints,
  readPlaceableHitPointState,
} from "../../scene/domain/placeableHitPoints";
import { isPlaceableEditorComment } from "../../scene/domain/placeableEditorComment";
import {
  MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
  MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
  isPlaceableInlineAsciiText,
  readEditablePlaceableLocalizedStringEntries,
  readEditablePlaceableLocalizedStringStorage,
  readPlaceableLocalizedStrings,
} from "../../scene/domain/placeableLocalizedStrings";
import { isAddableAreaNameStorageEntryIdentifier } from
  "../domain/areaNameLanguageCatalog";
import { isCreatureEditorComment } from "../../scene/domain/creatureEditorComment";
import { isItemEditorComment } from "../../scene/domain/itemEditorComment";
import { isStoreEditorComment } from "../../scene/domain/storeEditorComment";
import { isAreaStoreCommerceValue } from "../../scene/domain/storeCommerce";
import {
  isAreaStoreScriptResRefsTargetValue,
  isAreaStoreScriptResRefsValue,
} from "../../scene/domain/storeScriptResRefs";
import {
  readStoreVariableProvenance,
  readStoreVariableTargetEntries,
} from "../../scene/domain/storeVariableTable";
import {
  bindStoreRestrictionsProvenanceToCatalog,
  readStoreRestrictionsTarget,
} from "../../scene/domain/storeRestrictions";
import {
  bindStoreInventoryProvenanceToCatalog,
  readStoreInventoryTargetBuckets,
} from "../../scene/domain/storeInventory";
import { isEditableItemTag, readItemTagStorage } from "../../scene/domain/itemTag";
import { isEditableTriggerTag, readTriggerTagStorage } from
  "../../scene/domain/triggerTag";
import { isEditableEncounterTag, readEncounterTagStorage } from
  "../../scene/domain/encounterTag";
import { isEditableWaypointTag, readWaypointTagStorage } from
  "../../scene/domain/waypointTag";
import {
  isWaypointTemplateResRef,
  readWaypointTemplateResRefStorage,
} from "../../scene/domain/waypointTemplateResRef";
import {
  isEncounterTemplateResRef,
  readEncounterTemplateResRefStorage,
} from "../../scene/domain/encounterTemplateResRef";
import {
  isTriggerTemplateResRef,
  readTriggerTemplateResRefStorage,
} from "../../scene/domain/triggerTemplateResRef";
import {
  isTriggerLocalizedNameInlineAsciiText,
  readTriggerLocalizedNameInlineAsciiStorage,
  readTriggerLocalizedNameStorage,
} from "../../scene/domain/triggerLocalizedName";
import {
  isWaypointLocalizedNameInlineAsciiText,
  readWaypointLocalizedNameInlineAsciiStorage,
  readWaypointLocalizedNameStorage,
} from "../../scene/domain/waypointLocalizedName";
import {
  isWaypointDescriptionInlineAsciiText,
  readWaypointDescriptionInlineAsciiStorage,
  readWaypointDescriptionStorage,
} from "../../scene/domain/waypointDescription";
import {
  readWaypointMapNoteInlineAsciiValue,
  readWaypointMapNoteStorage,
  readWaypointMapNoteValue,
} from "../../scene/domain/waypointMapNote";
import { isWaypointEditorComment } from "../../scene/domain/waypointEditorComment";
import { isTriggerEditorComment } from "../../scene/domain/triggerEditorComment";
import {
  readTriggerScriptResRefsStorage,
  readTriggerScriptResRefsTargetStorage,
  triggerScriptResRefsStoragesEqual,
} from "../../scene/domain/triggerScriptResRefs";
import { isTriggerTransitionStorage } from
  "../../scene/domain/triggerTransitionStorage";
import { isTriggerCoreProperties } from
  "../../scene/domain/triggerCoreProperties";
import { isTriggerTrapProperties } from
  "../../scene/domain/triggerTrapProperties";
import { readEncounterActiveStorage } from "../../scene/domain/encounterActive";
import { readEncounterPlayerOnlyStorage } from
  "../../scene/domain/encounterPlayerOnly";
import { readEncounterResetStorage } from "../../scene/domain/encounterReset";
import { readEncounterResetTimeStorage } from
  "../../scene/domain/encounterResetTime";
import { readEncounterSpawnOptionStorage } from
  "../../scene/domain/encounterSpawnOption";
import { readEncounterRespawnsStorage } from
  "../../scene/domain/encounterRespawns";
import { readEncounterCreatureCountStorage } from
  "../../scene/domain/encounterCreatureCounts";
import {
  readEncounterScriptResRefsStorage,
  readEncounterScriptResRefsTargetStorage,
} from "../../scene/domain/encounterScriptResRefs";
import { readEncounterFactionProvenance } from "../../scene/domain/encounterFaction";
import {
  readEncounterDifficultyCatalog,
  readEncounterDifficultyProvenance,
} from "../../scene/domain/encounterDifficulty";
import {
  isEncounterLocalizedNameInlineAsciiText,
  readEncounterLocalizedNameInlineAsciiStorage,
  readEncounterLocalizedNameStorage,
} from "../../scene/domain/encounterLocalizedName";
import { isEncounterEditorComment } from "../../scene/domain/encounterEditorComment";
import {
  isItemTemplateResRef,
  readItemTemplateResRefStorage,
} from "../../scene/domain/itemTemplateResRef";
import {
  readItemInstanceStateStorage,
  readItemInstanceStateValue,
} from "../../scene/domain/itemInstanceState";
import {
  readItemVariableProvenance,
  readItemVariableTargetEntries,
} from "../../scene/domain/itemVariableTable";
import {
  readItemPropertyListProvenance,
  readItemPropertyListTargetEntries,
} from "../../scene/domain/itemPropertyList";
import {
  readItemInventorySourceEntries,
  readItemInventoryTargetEntries,
} from "../../scene/domain/itemInventory";
import {
  itemVisualTransformStorageEqual,
  readItemVisualTransformStorage,
  sceneVisualTransformToItemStorage,
} from "../../scene/domain/itemVisualTransform";
import {
  bindItemBaseAppearanceProvenanceToCatalog,
  readItemBaseAppearanceValue,
  readItemBaseItemCatalog,
} from "../../scene/domain/itemBaseAppearance";
import {
  MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  isItemLocalizedStringInlineAsciiText,
  readEditableItemLocalizedStringEntries,
  readEditableItemLocalizedStringStorage,
  readItemLocalizedStrings,
} from "../../scene/domain/itemLocalizedStrings";
import {
  readPlaceableTrapTypeCatalog,
  readPlaceableTrapTypeProvenance,
} from "../../scene/domain/placeableTrapType";
import {
  readPlaceablePortraitCatalog,
  readPlaceablePortraitProvenance,
} from "../../scene/domain/placeablePortrait";
import { readPlaceableTemplateResRef } from "../../scene/domain/placeableTemplateResRef";
import { mapBackendAreaToScene } from "./areaSceneMapper";
import { isAreaCommentsValue } from "../domain/areaComments";
import { AREA_EVENT_SCRIPT_FIELDS, isAreaEventScriptResRef } from "../domain/areaEventScripts";
import {
  isAreaNameStorageProfile,
  isEditableAreaName,
  isEditableAreaTag,
  readEditableAreaNameEntries,
} from "../domain/areaBasicIdentity";
import { isAreaAdvancedFlags } from "../domain/areaAdvancedFlags";
import {
  isAreaModuleStartLocation,
  readModuleStartLocationTargets,
} from "../domain/areaModuleStartLocation";
import { isAreaAudioEnvironment } from "../domain/areaAudioEnvironment";
import { isAreaVisualEnvironment } from "../domain/areaVisualEnvironment";
import { isAreaVisualEnvironmentScalarControls } from "../domain/areaVisualEnvironmentScalarControls";
import { isEffectiveAreaAudioCatalogBundle } from "../domain/effectiveAreaAudioCatalog";
import { isEffectiveAreaLoadingScreenCatalog } from "../domain/effectiveAreaLoadingScreenCatalog";
import { isEffectiveAreaVisualEnvironmentCatalogBundle } from "../domain/effectiveAreaVisualEnvironmentCatalog";
import { isAreaVisualEnvironmentCatalogSelection } from "../domain/areaVisualEnvironmentCatalogSelection";
import { isAreaDoorTransitionStorage } from "../../shared/domain/areaDoorTransitionStorage";
import { readAuroraVariableTargetEntries } from "../../shared/domain/auroraVariableTable";
import { isAreaObjectPolygonGeometry } from "../domain/areaObjectPolygonGeometry";
import { readAreaSoundIntervalVariationStorage } from "../domain/areaSoundIntervalVariationStorage";
import { readAreaSoundVolumeStorage } from "../domain/areaSoundVolumeStorage";
import { readAreaSoundActiveStorage } from "../domain/areaSoundActiveStorage";
import { readAreaSoundPlayOrderStorage } from "../domain/areaSoundPlayOrderStorage";
import {
  areaSoundPlayStyleStoragesEqual,
  readAreaSoundPlayStyleStorage,
} from "../domain/areaSoundPlayStyleStorage";
import {
  areaSoundPlaybackStoragesEqual,
  readAreaSoundPlaybackStorage,
} from "../domain/areaSoundPlaybackStorage";
import {
  areaSoundProfileStoragesEqual,
  readAreaSoundProfileStorage,
} from "../domain/areaSoundProfileStorage";
import { readAreaSoundScheduleStorage } from "../domain/areaSoundScheduleStorage";

export interface ResolvedAreaWorkspaceDraft {
  readonly scene: AreaScene;
  readonly productionSource?: ProductionAreaDraftPayload<AreaApiDetail, AreaScene>;
}

export function resolveAreaWorkspaceDraft(
  value: unknown,
): ResolvedAreaWorkspaceDraft | null {
  if (isProductionAreaDraftPayload(value)) {
    const editableScene = parseAreaScene(value.editableScene);
    if (editableScene) return { scene: editableScene, productionSource: value };
    if (!isAreaApiDetail(value.sourceArea)) return null;
    try {
      const scene = parseAreaScene(mapBackendAreaToScene(value.sourceArea));
      return scene ? { scene, productionSource: value } : null;
    } catch {
      return null;
    }
  }
  const scene = parseAreaScene(value);
  return scene ? { scene } : null;
}

export function buildAreaWorkspaceDraftPayload(
  scene: AreaScene,
  productionSource?: ProductionAreaDraftPayload<AreaApiDetail, AreaScene>,
): AreaScene | ProductionAreaDraftPayload<AreaApiDetail, AreaScene> {
  return productionSource
    ? {
        ...productionSource,
        editableScene: scene,
      }
    : scene;
}

export function parseAreaScene(value: unknown): AreaScene | null {
  if (!isRecord(value)) return null;
  if (!isNonBlank(value.sceneId) || !isNonBlank(value.areaName)) return null;
  if (!isPositiveInteger(value.width) || !isPositiveInteger(value.height)) return null;
  if (!Number.isFinite(value.updatedAtUnixMs)) return null;
  if (value.areaComments !== undefined && !isAreaCommentsValue(value.areaComments)) return null;
  if (value.areaEventScripts !== undefined && !isAreaEventScripts(value.areaEventScripts)) return null;
  if (value.areaBasicIdentity !== undefined) {
    if (!isAreaBasicIdentity(value.areaBasicIdentity)) return null;
    if (value.areaBasicIdentity.name !== undefined && value.areaName !== value.areaBasicIdentity.name) return null;
    if (value.areaBasicIdentity.tag !== undefined && value.areaTag !== value.areaBasicIdentity.tag) return null;
  } else if (value.areaTag !== undefined) {
    return null;
  }
  if (value.areaAdvancedFlags !== undefined && !isAreaAdvancedFlags(value.areaAdvancedFlags)) {
    return null;
  }
  if (value.areaVisualEnvironment !== undefined
      && !isAreaVisualEnvironment(value.areaVisualEnvironment)) return null;
  if (value.areaVisualEnvironmentScalarControls !== undefined
      && !isAreaVisualEnvironmentScalarControls(
        value.areaVisualEnvironmentScalarControls,
      )) return null;
  if (value.areaVisualEnvironmentCatalogSelection !== undefined
      && !isAreaVisualEnvironmentCatalogSelection(
        value.areaVisualEnvironmentCatalogSelection,
      )) return null;
  if (value.areaAudioEnvironment !== undefined
      && !isAreaAudioEnvironment(value.areaAudioEnvironment)) return null;
  if (value.areaAudioEnvironmentCatalogs !== undefined
      && !isEffectiveAreaAudioCatalogBundle(value.areaAudioEnvironmentCatalogs)) return null;
  if (value.areaVisualEnvironmentCatalogs !== undefined
      && !isEffectiveAreaVisualEnvironmentCatalogBundle(
        value.areaVisualEnvironmentCatalogs,
      )) return null;
  if (value.areaLoadingScreenCatalog !== undefined
      && !isEffectiveAreaLoadingScreenCatalog(value.areaLoadingScreenCatalog)) return null;
  if (value.moduleStartLocation !== undefined
      && !isAreaModuleStartLocation(value.moduleStartLocation)) return null;
  if (value.moduleStartLocationTargets !== undefined
      && readModuleStartLocationTargets(value.moduleStartLocationTargets) === null) return null;
  if (value.areaVariables !== undefined
      && readAuroraVariableTargetEntries(value.areaVariables) === null) return null;
  const placeableBodyBagCatalog = value.placeableBodyBagCatalog === undefined
    ? null
    : readPlaceableBodyBagCatalog(value.placeableBodyBagCatalog);
  if (value.placeableBodyBagCatalog !== undefined && !placeableBodyBagCatalog) return null;
  const placeableFactionCatalog = value.placeableFactionCatalog === undefined
    ? null
    : readPlaceableFactionCatalog(value.placeableFactionCatalog);
  if (value.placeableFactionCatalog !== undefined && !placeableFactionCatalog) return null;
  const encounterDifficultyCatalog = value.encounterDifficultyCatalog === undefined
    ? null
    : readEncounterDifficultyCatalog(value.encounterDifficultyCatalog);
  if (value.encounterDifficultyCatalog !== undefined && !encounterDifficultyCatalog) return null;
  const placeablePortraitCatalog = value.placeablePortraitCatalog === undefined
    ? null
    : readPlaceablePortraitCatalog(value.placeablePortraitCatalog);
  if (value.placeablePortraitCatalog !== undefined && !placeablePortraitCatalog) return null;
  const creaturePortraitCatalog = value.creaturePortraitCatalog === undefined
    ? null
    : readCreaturePortraitCatalog(value.creaturePortraitCatalog);
  if (value.creaturePortraitCatalog !== undefined && !creaturePortraitCatalog) return null;
  const placeableTrapTypeCatalog = value.placeableTrapTypeCatalog === undefined
    ? null
    : readPlaceableTrapTypeCatalog(value.placeableTrapTypeCatalog);
  if (value.placeableTrapTypeCatalog !== undefined && !placeableTrapTypeCatalog) return null;
  const itemBaseItemCatalog = value.itemBaseItemCatalog === undefined
    ? null
    : readItemBaseItemCatalog(value.itemBaseItemCatalog);
  if (value.itemBaseItemCatalog !== undefined && !itemBaseItemCatalog) return null;
  if (value.source !== "seed" && value.source !== "local_draft" && value.source !== "aurora_area") return null;
  if (!Array.isArray(value.tiles) || !value.tiles.every(isSceneTile)) return null;
  if (!Array.isArray(value.objects) || !value.objects.every(
    (object) => isSceneObject(
      object,
      placeableBodyBagCatalog,
      placeableFactionCatalog,
      encounterDifficultyCatalog,
      placeablePortraitCatalog,
      creaturePortraitCatalog,
      placeableTrapTypeCatalog,
      itemBaseItemCatalog,
    ),
  )) return null;
  return value as unknown as AreaScene;
}

function isAreaBasicIdentity(
  value: unknown,
): value is {
  name?: string;
  nameProfile?: "simple_inline_ascii" | "multi_entry_inline_ascii";
  nameEntries?: readonly Readonly<{ languageId: number; text: string }>[];
  tag?: string;
} {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  const keys = Object.keys(value);
  if (keys.some((key) => key !== "name" && key !== "nameProfile" && key !== "nameEntries" && key !== "tag")) return false;
  if (value.nameProfile !== undefined) {
    if (value.name === undefined || !isAreaNameStorageProfile(value.nameProfile)) return false;
  }
  if (value.nameEntries !== undefined) {
    const entries = readEditableAreaNameEntries(value.nameEntries);
    if (
      !entries
      || value.name === undefined
      || entries.find((entry) => entry.languageId === 0)?.text !== value.name
      || (entries.length === 1 ? "simple_inline_ascii" : "multi_entry_inline_ascii")
        !== value.nameProfile
    ) return false;
  }
  return (value.name === undefined || isEditableAreaName(value.name))
    && (value.tag === undefined || isEditableAreaTag(value.tag));
}

function isAreaEventScripts(value: unknown): boolean {
  if (!isRecord(value) || Object.keys(value).length === 0) return false;
  const slots = new Set(AREA_EVENT_SCRIPT_FIELDS.map((entry) => entry.slot));
  return Object.entries(value).every(
    ([slot, resRef]) => slots.has(slot as (typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"])
      && isAreaEventScriptResRef(resRef),
  );
}

function isProductionAreaDraftPayload(
  value: unknown,
): value is ProductionAreaDraftPayload<AreaApiDetail, AreaScene> {
  if (!isRecord(value) || value.schemaVersion !== "production-area-draft-payload.v1") {
    return false;
  }
  if (!isRecord(value.provenance)) return false;
  return (
    isNonBlank(value.provenance.areaId) &&
    isNonBlank(value.provenance.sourceUpdatedAt) &&
    isNonBlank(value.provenance.processingCacheKey) &&
    "sourceArea" in value
  );
}

function isAreaApiDetail(value: unknown): value is AreaApiDetail {
  if (!isRecord(value)) return false;
  return (
    isNonBlank(value.areaId) &&
    isNonBlank(value.name) &&
    isPositiveInteger(value.width) &&
    isPositiveInteger(value.height) &&
    Array.isArray(value.tags) &&
    Array.isArray(value.tiles) &&
    Array.isArray(value.objects) &&
    isRecord(value.textureAtlas) &&
    isRecord(value.composition) &&
    isNonBlank(value.updatedAt)
  );
}

function isSceneTile(value: unknown): value is SceneTile {
  if (!isRecord(value)) return false;
  return (
    isNonBlank(value.id) &&
    isNonNegativeInteger(value.row) &&
    isNonNegativeInteger(value.col) &&
    isNonBlank(value.terrain) &&
    [0, 1, 2, 3].includes(Number(value.orientation)) &&
    typeof value.rotateTexture === "boolean" &&
    typeof value.plot === "boolean"
  );
}

function isSceneObject(
  value: unknown,
  placeableBodyBagCatalog: ReturnType<typeof readPlaceableBodyBagCatalog>,
  placeableFactionCatalog: ReturnType<typeof readPlaceableFactionCatalog>,
  encounterDifficultyCatalog: ReturnType<typeof readEncounterDifficultyCatalog>,
  placeablePortraitCatalog: ReturnType<typeof readPlaceablePortraitCatalog>,
  creaturePortraitCatalog: ReturnType<typeof readCreaturePortraitCatalog>,
  placeableTrapTypeCatalog: ReturnType<typeof readPlaceableTrapTypeCatalog>,
  itemBaseItemCatalog: ReturnType<typeof readItemBaseItemCatalog>,
): value is SceneObject {
  if (!isRecord(value) || !isRecord(value.visualTransform)) return false;
  if (!isDoorTransitionStorageState(value)) return false;
  if (!isPlaceableBodyBagState(value, placeableBodyBagCatalog)) return false;
  if (!isPlaceableFactionState(value, placeableFactionCatalog)) return false;
  if (!isPlaceablePortraitState(value, placeablePortraitCatalog)) return false;
  if (!isPlaceableTrapTypeState(value, placeableTrapTypeCatalog)) return false;
  if (!isPlaceableTemplateResRefState(value)) return false;
  if (!isPlaceableAnimationStateState(value)) return false;
  if (!isPlaceableConversationInterruptableState(value)) return false;
  if (!isPlaceableStaticUseableState(value)) return false;
  if (!isPlaceablePlotHasInventoryState(value)) return false;
  if (!isPlaceableDurabilitySaveByteState(value)) return false;
  if (!isPlaceableHitPointState(value)) return false;
  if (!isPlaceableLocalizedStringState(value)) return false;
  if (!isPlaceableEditorCommentState(value)) return false;
  if (!isItemTagState(value)) return false;
  if (!isTriggerTagState(value)) return false;
  if (!isEncounterTagState(value)) return false;
  if (!isWaypointTagState(value)) return false;
  if (!isTriggerTemplateResRefState(value)) return false;
  if (!isTriggerLocalizedNameState(value)) return false;
  if (!isTriggerEditorCommentState(value)) return false;
  if (!isTriggerScriptResRefsState(value)) return false;
  if (!isTriggerTransitionStorageState(value)) return false;
  if (!isTriggerCorePropertiesState(value)) return false;
  if (!isTriggerTrapPropertiesState(value)) return false;
  if (!isTriggerVariableState(value)) return false;
  if (!isEncounterTemplateResRefState(value)) return false;
  if (!isWaypointTemplateResRefState(value)) return false;
  if (!isWaypointLocalizedNameState(value)) return false;
  if (!isWaypointDescriptionState(value)) return false;
  if (!isWaypointMapNoteState(value)) return false;
  if (!isWaypointAppearanceState(value)) return false;
  if (!isWaypointVariableState(value)) return false;
  if (!isWaypointEditorCommentState(value)) return false;
  if (!isEncounterActiveState(value)) return false;
  if (!isEncounterPlayerOnlyState(value)) return false;
  if (!isEncounterResetState(value)) return false;
  if (!isEncounterResetTimeState(value)) return false;
  if (!isEncounterSpawnOptionState(value)) return false;
  if (!isEncounterRespawnsState(value)) return false;
  if (!isEncounterCreatureCountState(value)) return false;
  if (!isEncounterScriptResRefsState(value)) return false;
  if (!isEncounterFactionState(value, placeableFactionCatalog)) return false;
  if (!isEncounterDifficultyState(value, encounterDifficultyCatalog)) return false;
  if (!isEncounterLocalizedNameState(value)) return false;
  if (!isEncounterVariableState(value)) return false;
  if (!isEncounterCreatureListState(value)) return false;
  if (!isEncounterSpawnPointListState(value)) return false;
  if (!isEncounterEditorCommentState(value)) return false;
  if (!isItemTemplateResRefState(value)) return false;
  if (!isItemEditorCommentState(value)) return false;
  if (!isStoreEditorCommentState(value)) return false;
  if (!isStoreCommerceState(value)) return false;
  if (!isStoreScriptResRefsState(value)) return false;
  if (!isStoreVariableState(value)) return false;
  if (!isStoreRestrictionState(value, itemBaseItemCatalog)) return false;
  if (!isStoreInventoryState(value, itemBaseItemCatalog)) return false;
  if (!isItemInstanceStateState(value)) return false;
  if (!isItemLocalizedStringState(value)) return false;
  if (!isItemVariableState(value)) return false;
  if (!isItemPropertyListState(value)) return false;
  if (!isItemInventoryState(value)) return false;
  if (!isItemVisualTransformState(value)) return false;
  if (!isItemBaseAppearanceState(value, itemBaseItemCatalog)) return false;
  if (!isCreatureTagState(value)) return false;
  if (!isCreatureConversationState(value)) return false;
  if (!isCreatureInterruptableState(value)) return false;
  if (!isCreatureAdvancedFlagsState(value)) return false;
  if (!isCreatureDeathRemainsState(value, placeableBodyBagCatalog)) return false;
  if (!isCreatureAppearanceState(value)) return false;
  if (!isCreatureGenderState(value)) return false;
  if (!isCreaturePerceptionRangeState(value)) return false;
  if (!isCreatureWalkRateState(value)) return false;
  if (!isCreatureSoundSetFileState(value)) return false;
  if (!isCreatureStartingPackageState(value)) return false;
  if (!isCreatureSkillListState(value)) return false;
  if (!isCreatureFeatListState(value)) return false;
  if (!isCreatureSpecialAbilityListState(value)) return false;
  if (!isCreatureVariableState(value)) return false;
  if (!isCreatureEditorCommentState(value)) return false;
  if (!isCreatureClassLevelState(value)) return false;
  if (!isCreatureClassIdentityState(value)) return false;
  if (!isCreaturePhenotypeState(value)) return false;
  if (!isCreaturePortraitState(value, creaturePortraitCatalog)) return false;
  if (!isCreatureChallengeRatingState(value)) return false;
  if (!isCreatureAbilityScoresState(value)) return false;
  if (!isCreatureAppearanceColorsState(value)) return false;
  if (!isCreatureBodyPartsState(value)) return false;
  if (!isCreatureAppendagesState(value)) return false;
  if (!isCreatureHitPointState(value)) return false;
  if (!isCreatureNaturalArmorClassState(value)) return false;
  if (!isCreatureSavingThrowBonusesState(value)) return false;
  if (!isCreatureAlignmentState(value)) return false;
  if (!isCreatureFactionState(value, placeableFactionCatalog)) return false;
  if (!isCreatureTemplateResRefState(value)) return false;
  if (!isCreatureSpecialIdentityStringsState(value)) return false;
  if (!isCreatureScriptResRefsState(value)) return false;
  if (!isCreatureNameLocalizedStringState(value)) return false;
  if (!isCreatureInventoryState(value)) return false;
  if (!isCreatureEquipmentState(value)) return false;
  if (!isPolygonGeometryState(value)) return false;
  if (!isSoundIntervalVariationState(value)) return false;
  if (!isSoundVolumeState(value)) return false;
  if (!isSoundActiveState(value)) return false;
  if (!isSoundPlayOrderState(value)) return false;
  if (!isSoundPlayStyleState(value)) return false;
  if (!isSoundPlaybackState(value)) return false;
  if (!isSoundProfileState(value)) return false;
  if (!isSoundScheduleState(value)) return false;
  return (
    isNonBlank(value.id) &&
    ["creatures", "doors", "encounters", "items", "placeables", "sounds", "stores", "triggers", "waypoints"].includes(String(value.kind)) &&
    typeof value.resRef === "string" &&
    typeof value.tag === "string" &&
    [value.x, value.y, value.z, value.bearing].every(Number.isFinite) &&
    [
      value.visualTransform.scale,
      value.visualTransform.offsetX,
      value.visualTransform.offsetY,
      value.visualTransform.offsetZ,
      value.visualTransform.pitch,
      value.visualTransform.roll,
      value.visualTransform.yaw,
    ].every(Number.isFinite)
  );
}

function isPlaceableBodyBagState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableBodyBagCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableBodyBag");
  const hasTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "treasureModelRow");
  if (!hasSource && !hasTarget) return true;

  const provenance = readPlaceableBodyBagProvenance(source?.placeableBodyBag);
  if (
    !isRetainedPlaceable
    || !isNonNegativeInteger(source?.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.tableSha256
    || catalog.descriptor.rowCount !== provenance.tableRowCount
    || catalog.rows[provenance.expectedValue]?.rowIndex !== provenance.expectedValue
    || !advancedSettings
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "treasureModelRow")
    || !isNonNegativeInteger(advancedSettings.treasureModelRow)
    || advancedSettings.treasureModelRow > 0xff
  ) {
    return false;
  }

  return catalog.rows[advancedSettings.treasureModelRow]?.rowIndex
    === advancedSettings.treasureModelRow;
}

function isPlaceableTrapTypeState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableTrapTypeCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const trapSettings = isRecord(placeableProperties?.trapSettings)
    ? placeableProperties.trapSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableTrapType");
  const hasTarget = isRetainedPlaceable
    && trapSettings !== undefined
    && Object.prototype.hasOwnProperty.call(trapSettings, "trapTypeRow");
  if (!hasSource && !hasTarget) return true;

  const provenance = readPlaceableTrapTypeProvenance(source?.placeableTrapType);
  if (
    !isRetainedPlaceable
    || !isNonNegativeInteger(source?.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.tableSha256
    || catalog.descriptor.rowCount !== provenance.tableRowCount
    || catalog.rows[provenance.expectedValue]?.rowIndex !== provenance.expectedValue
    || !trapSettings
    || !Object.prototype.hasOwnProperty.call(trapSettings, "trapTypeRow")
    || !Object.prototype.hasOwnProperty.call(trapSettings, "setDc")
    || !Object.prototype.hasOwnProperty.call(trapSettings, "detectDcModWhenSetByRogue")
    || !Object.prototype.hasOwnProperty.call(trapSettings, "disarmDcModWhenSetByRogue")
    || !isNonNegativeInteger(trapSettings.trapTypeRow)
    || trapSettings.trapTypeRow > 0xff
    || !isNonNegativeInteger(trapSettings.setDc)
    || !isNonNegativeInteger(trapSettings.detectDcModWhenSetByRogue)
    || !isNonNegativeInteger(trapSettings.disarmDcModWhenSetByRogue)
  ) {
    return false;
  }

  const targetRow = catalog.rows[trapSettings.trapTypeRow];
  return targetRow?.rowIndex === trapSettings.trapTypeRow
    && targetRow.setDc === trapSettings.setDc
    && targetRow.detectDcMod === trapSettings.detectDcModWhenSetByRogue
    && targetRow.disarmDcMod === trapSettings.disarmDcModWhenSetByRogue;
}

function isPlaceableFactionState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableFactionCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableFaction");
  const hasTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "factionId");
  if (!hasSource && !hasTarget) return true;

  const provenance = readPlaceableFactionProvenance(source?.placeableFaction);
  if (
    value.kind !== "placeables"
    || source?.type !== "aurora_git"
    || source.sourceKind !== "placeable"
    || !isNonNegativeInteger(source.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.catalogSha256
    || catalog.descriptor.factionCount !== provenance.catalogFactionCount
    || !catalog.rows.some((row) => row.factionId === provenance.expectedValue)
    || !advancedSettings
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "factionId")
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "belongsToFaction")
    || !isNonNegativeInteger(advancedSettings.factionId)
    || typeof advancedSettings.belongsToFaction !== "string"
  ) {
    return false;
  }

  const targetRow = catalog.rows.find(
    (row) => row.factionId === advancedSettings.factionId,
  );
  return targetRow !== undefined && targetRow.name === advancedSettings.belongsToFaction;
}

function isCreatureFactionState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableFactionCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const isRetainedCreature = value.kind === "creatures"
    && source?.type === "aurora_git"
    && source.sourceKind === "creature";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureFaction");
  const hasTarget = isRetainedCreature
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "factionId");
  if (!hasSource && !hasTarget) return true;

  const provenance = readCreatureFactionProvenance(source?.creatureFaction);
  if (
    !isRetainedCreature
    || !isNonNegativeInteger(source?.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.catalogSha256
    || catalog.descriptor.factionCount !== provenance.catalogFactionCount
    || !catalog.rows.some((row) => row.factionId === provenance.expectedValue)
    || !advancedSettings
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "factionId")
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "faction")
    || !isNonNegativeInteger(advancedSettings.factionId)
    || typeof advancedSettings.faction !== "string"
  ) {
    return false;
  }

  const targetRow = catalog.rows.find(
    (row) => row.factionId === advancedSettings.factionId,
  );
  return targetRow !== undefined && targetRow.name === advancedSettings.faction;
}

function isCreatureTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureTemplateResRef");
  if (!hasSource) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  return value.kind === "creatures" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "creature" &&
    isNonNegativeInteger(source.sourceIndex) &&
    readCreatureTemplateResRefProvenance(source.creatureTemplateResRef) !== null &&
    advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "blueprintResRef") &&
    isCreatureTemplateResRef(advancedSettings.blueprintResRef);
}

function isCreatureSpecialIdentityStringsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureSpecialIdentityStrings");
  if (!hasSource) return true;

  const provenance = readCreatureSpecialIdentityStringsProvenance(
    source.creatureSpecialIdentityStrings,
  );
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  if (
    value.kind !== "creatures" ||
    source.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !provenance ||
    !advancedSettings
  ) {
    return false;
  }
  return (["subrace", "deity"] as const).every((key) =>
    provenance[key] === undefined ||
    (
      Object.prototype.hasOwnProperty.call(advancedSettings, key) &&
      isCreatureSpecialIdentityString(advancedSettings[key])
    )
  );
}

function isCreatureScriptResRefsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureScriptResRefs");
  if (!hasSource) return true;

  const provenance = readCreatureScriptResRefsProvenance(source.creatureScriptResRefs);
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const scriptSlots = isRecord(creatureProperties?.scriptSlots)
    ? creatureProperties.scriptSlots
    : undefined;
  if (
    value.kind !== "creatures" ||
    source.type !== "aurora_git" ||
    source.sourceKind !== "creature" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !provenance ||
    !scriptSlots
  ) {
    return false;
  }
  return CREATURE_SCRIPT_RESREF_FIELDS.every(({ key }) => {
    const member = provenance[key];
    if (!member) return true;
    if (!Object.prototype.hasOwnProperty.call(scriptSlots, key)) return false;
    const target = scriptSlots[key];
    return target === member.expectedResRef || isCreatureScriptTargetResRef(target);
  });
}

function isPlaceablePortraitState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceablePortraitCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeablePortrait");
  const hasTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "portraitId");
  if (!hasSource && !hasTarget) return true;

  const provenance = readPlaceablePortraitProvenance(source?.placeablePortrait);
  if (
    !isRetainedPlaceable
    || !isNonNegativeInteger(source?.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.tableSha256
    || catalog.descriptor.rowCount !== provenance.tableRowCount
    || !catalog.rows.some((row) => row.rowIndex === provenance.expectedValue)
    || !advancedSettings
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "portraitId")
    || !Object.prototype.hasOwnProperty.call(advancedSettings, "portraitResRef")
    || !isNonNegativeInteger(advancedSettings.portraitId)
    || advancedSettings.portraitId > 0xffff
    || typeof advancedSettings.portraitResRef !== "string"
  ) {
    return false;
  }

  const targetRow = catalog.rows.find(
    (row) => row.rowIndex === advancedSettings.portraitId,
  );
  return targetRow !== undefined
    && targetRow.baseResRef === advancedSettings.portraitResRef;
}

function isPlaceableTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableTemplateResRef");
  const hasTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "blueprintResRef");
  if (!hasSource && !hasTarget) return true;

  return isRetainedPlaceable
    && isNonNegativeInteger(source?.sourceIndex)
    && readPlaceableTemplateResRef(source?.placeableTemplateResRef) !== undefined
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "blueprintResRef")
    && readPlaceableTemplateResRef(advancedSettings.blueprintResRef) !== undefined;
}

function isPlaceableAnimationStateState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableAnimationState");
  const hasTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "initialState");
  if (!hasSource && !hasTarget) return true;

  return isRetainedPlaceable
    && isNonNegativeInteger(source?.sourceIndex)
    && isPlaceableAnimationState(source?.placeableAnimationState)
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "initialState")
    && isPlaceableAnimationStateToken(advancedSettings.initialState);
}

function isPlaceableConversationInterruptableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const advancedSettings = isRecord(placeableProperties?.advancedSettings)
    ? placeableProperties.advancedSettings
    : undefined;
  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  const hasConversationSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableConversation");
  const hasConversationTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "conversation");
  const hasInterruptableSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableInterruptable");
  const hasInterruptableTarget = isRetainedPlaceable
    && advancedSettings !== undefined
    && Object.prototype.hasOwnProperty.call(advancedSettings, "noInterrupt");
  if (
    !hasConversationSource
    && !hasConversationTarget
    && !hasInterruptableSource
    && !hasInterruptableTarget
  ) {
    return true;
  }
  if (!isRetainedPlaceable || !isNonNegativeInteger(source?.sourceIndex)) return false;

  const conversationIsCoherent = !hasConversationSource && !hasConversationTarget
    || hasConversationSource
      && hasConversationTarget
      && isAuroraConversationResRef(source?.placeableConversation)
      && isAuroraConversationResRef(advancedSettings?.conversation);
  const interruptableIsCoherent = !hasInterruptableSource && !hasInterruptableTarget
    || hasInterruptableSource
      && hasInterruptableTarget
      && isPlaceableInterruptable(source?.placeableInterruptable)
      && typeof advancedSettings?.noInterrupt === "boolean";
  return conversationIsCoherent && interruptableIsCoherent;
}

function isPlaceableStaticUseableState(value: Record<string, unknown>): boolean {
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  return isPlaceableBooleanPropertyState(value, [
    { sourceKey: "placeableStatic", target: value, targetKey: "isStatic" },
    { sourceKey: "placeableUseable", target: placeableProperties, targetKey: "useable" },
  ]);
}

function isPlaceablePlotHasInventoryState(value: Record<string, unknown>): boolean {
  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  return isPlaceableBooleanPropertyState(value, [
    { sourceKey: "placeablePlot", target: placeableProperties, targetKey: "plot" },
    {
      sourceKey: "placeableHasInventory",
      target: placeableProperties,
      targetKey: "hasInventory",
    },
  ]);
}

function isPlaceableBooleanPropertyState(
  value: Record<string, unknown>,
  fields: readonly Readonly<{
    sourceKey: string;
    target: Record<string, unknown> | undefined;
    targetKey: string;
  }>[],
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const provenFields = fields.filter(({ sourceKey }) => source !== undefined
    && Object.prototype.hasOwnProperty.call(source, sourceKey));
  if (provenFields.length === 0) return true;

  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  if (!isRetainedPlaceable || !isNonNegativeInteger(source?.sourceIndex)) return false;

  return provenFields.every(({ sourceKey, target, targetKey }) =>
    typeof source?.[sourceKey] === "boolean"
    && target !== undefined
    && Object.prototype.hasOwnProperty.call(target, targetKey)
    && typeof target[targetKey] === "boolean");
}

function isPlaceableDurabilitySaveByteState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableDurabilitySaveBytes");
  if (!hasSource) return true;

  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  if (!isRetainedPlaceable || !isNonNegativeInteger(source?.sourceIndex)) return false;

  const sourceBytes = isRecord(source.placeableDurabilitySaveBytes)
    ? source.placeableDurabilitySaveBytes
    : undefined;
  const targetBytes = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  if (!sourceBytes || !targetBytes) return false;

  const sourceKeys = Object.keys(sourceBytes);
  if (sourceKeys.length === 0) return false;
  return sourceKeys.every((field) =>
    PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS.includes(
      field as (typeof PLACEABLE_DURABILITY_SAVE_BYTE_FIELDS)[number],
    )
    && isPlaceableDurabilitySaveByte(sourceBytes[field])
    && Object.prototype.hasOwnProperty.call(targetBytes, field)
    && isPlaceableDurabilitySaveByte(targetBytes[field]));
}

function isPlaceableHitPointState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableHitPointState");
  if (!hasSource) return true;

  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  if (!isRetainedPlaceable || !isNonNegativeInteger(source?.sourceIndex)) return false;
  if (!readPlaceableHitPointState(source.placeableHitPointState)) return false;

  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  return placeableProperties !== undefined
    && Object.prototype.hasOwnProperty.call(placeableProperties, "hitPoints")
    && isEditablePlaceableHitPoints(placeableProperties.hitPoints);
}

function isPlaceableEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "placeableEditorComment");
  if (!hasSource) return true;

  const isRetainedPlaceable = value.kind === "placeables"
    && source?.type === "aurora_git"
    && source.sourceKind === "placeable";
  if (!isRetainedPlaceable || !isNonNegativeInteger(source?.sourceIndex)) return false;
  if (!isPlaceableEditorComment(source.placeableEditorComment)) return false;

  const placeableProperties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  return placeableProperties !== undefined
    && Object.prototype.hasOwnProperty.call(placeableProperties, "comments")
    && isPlaceableEditorComment(placeableProperties.comments);
}

function isPlaceableLocalizedStringFieldState(
  sourceStorageValue: unknown,
  properties: Record<string, unknown>,
  scalarKey: "localizedName" | "description",
  entriesKey: "localizedNameEntries" | "descriptionEntries",
  maxDefaultBytes: number,
): boolean {
  const sourceStorage = readEditablePlaceableLocalizedStringStorage(
    sourceStorageValue,
    maxDefaultBytes,
  );
  const hasScalar = Object.prototype.hasOwnProperty.call(properties, scalarKey);
  const hasEntries = Object.prototype.hasOwnProperty.call(properties, entriesKey);
  if (!sourceStorage) return !hasEntries;
  if (!hasScalar || !isPlaceableInlineAsciiText(properties[scalarKey], maxDefaultBytes)) {
    return false;
  }
  if (!hasEntries) return true;

  const targetEntries = readEditablePlaceableLocalizedStringEntries(
    properties[entriesKey],
    maxDefaultBytes,
  );
  if (!targetEntries) return false;
  const defaultText = targetEntries.find((entry) => entry.languageId === 0)?.text ?? "";
  if (properties[scalarKey] !== defaultText) return false;
  const sourceIdentifiers = new Set(sourceStorage.entries.map((entry) => entry.languageId));
  return targetEntries.every((entry) =>
    sourceIdentifiers.has(entry.languageId) ||
    (isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0));
}

function isPlaceableLocalizedStringState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const properties = isRecord(value.placeableProperties)
    ? value.placeableProperties
    : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "placeableLocalizedStrings",
  );
  const hasEntryTargets = properties !== undefined && (
    Object.prototype.hasOwnProperty.call(properties, "localizedNameEntries") ||
    Object.prototype.hasOwnProperty.call(properties, "descriptionEntries")
  );
  if (!hasSource) return !hasEntryTargets;
  if (
    value.kind !== "placeables" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "placeable" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !properties
  ) return false;
  const sourceStrings = readPlaceableLocalizedStrings(source.placeableLocalizedStrings);
  return sourceStrings !== undefined &&
    isPlaceableLocalizedStringFieldState(
      sourceStrings.locName,
      properties,
      "localizedName",
      "localizedNameEntries",
      MAX_PLACEABLE_LOC_NAME_ASCII_BYTES,
    ) &&
    isPlaceableLocalizedStringFieldState(
      sourceStrings.description,
      properties,
      "description",
      "descriptionEntries",
      MAX_PLACEABLE_DESCRIPTION_ASCII_BYTES,
    );
}

function isItemEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemEditorComment");
  if (!hasSource) return true;
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  return value.kind === "items" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "item" &&
    isNonNegativeInteger(source.sourceIndex) &&
    isItemEditorComment(source.itemEditorComment) &&
    itemProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(itemProperties, "comments") &&
    isItemEditorComment(itemProperties.comments);
}

function isStoreEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeEditorComment");
  if (!hasSource) return true;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  return value.kind === "stores" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "store" &&
    isNonNegativeInteger(source.sourceIndex) &&
    isStoreEditorComment(source.storeEditorComment) &&
    storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "comments") &&
    isStoreEditorComment(storeProperties.comments);
}

function isStoreCommerceState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeCommerce");
  const hasTarget = storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "commerce");
  if (!hasSource) return !hasTarget;
  return value.kind === "stores" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "store" &&
    isNonNegativeInteger(source.sourceIndex) &&
    isAreaStoreCommerceValue(source.storeCommerce) &&
    hasTarget &&
    isAreaStoreCommerceValue(storeProperties?.commerce);
}

function isStoreScriptResRefsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeScriptResRefs");
  const hasTarget = storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "scriptResRefs");
  if (!hasSource) return !hasTarget;
  return value.kind === "stores" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "store" &&
    isNonNegativeInteger(source.sourceIndex) &&
    isAreaStoreScriptResRefsValue(source.storeScriptResRefs) &&
    hasTarget &&
    isAreaStoreScriptResRefsTargetValue(storeProperties?.scriptResRefs);
}

function isStoreVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeVariables");
  const hasTarget = storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "variables");
  if (!hasSource) return !hasTarget;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  return value.kind === "stores" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "store" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    readStoreVariableProvenance(sourceMetadata.storeVariables) !== null &&
    hasTarget &&
    readStoreVariableTargetEntries(storeProperties?.variables) !== null;
}

function isStoreRestrictionState(
  value: Record<string, unknown>,
  itemBaseItemCatalog: ReturnType<typeof readItemBaseItemCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeRestrictions");
  const hasTarget = storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "restrictions");
  if (!hasSource) return !hasTarget;
  if (value.kind !== "stores" || source?.type !== "aurora_git" ||
    source.sourceKind !== "store" || !isNonNegativeInteger(source.sourceIndex) ||
    !itemBaseItemCatalog) return false;
  const provenance = bindStoreRestrictionsProvenanceToCatalog(
    source.storeRestrictions,
    itemBaseItemCatalog,
  );
  return provenance !== null && hasTarget &&
    readStoreRestrictionsTarget(
      storeProperties?.restrictions,
      provenance.tableRowCount,
    ) !== null;
}

function isStoreInventoryState(
  value: Record<string, unknown>,
  itemBaseItemCatalog: ReturnType<typeof readItemBaseItemCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const storeProperties = isRecord(value.storeProperties)
    ? value.storeProperties
    : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "storeInventory");
  const hasTarget = storeProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(storeProperties, "inventoryBuckets");
  if (!hasSource) return !hasTarget;
  if (value.kind !== "stores" || source?.type !== "aurora_git" ||
    source.sourceKind !== "store" || !isNonNegativeInteger(source.sourceIndex) ||
    !itemBaseItemCatalog) return false;
  const provenance = bindStoreInventoryProvenanceToCatalog(
    source.storeInventory,
    itemBaseItemCatalog,
  );
  return provenance !== null && hasTarget &&
    readStoreInventoryTargetBuckets(
      storeProperties?.inventoryBuckets,
      provenance.expectedBuckets,
    ) !== null;
}

function isItemTagState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemTag");
  if (!hasSource) return true;
  if (
    value.kind !== "items" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "item" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readItemTagStorage(source.itemTag);
  if (!storage) return false;
  return !storage.present || isEditableItemTag(value.tag);
}

function isTriggerTagState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "triggerTag");
  if (!hasSource) return true;
  if (
    value.kind !== "triggers" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "trigger" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readTriggerTagStorage(source.triggerTag);
  if (!storage) return false;
  return !storage.present || isEditableTriggerTag(value.tag);
}

function isEncounterTagState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "encounterTag");
  if (!hasSource) return true;
  if (
    value.kind !== "encounters" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "encounter" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readEncounterTagStorage(source.encounterTag);
  if (!storage) return false;
  return !storage.present || isEditableEncounterTag(value.tag);
}

function isWaypointTagState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "waypointTag");
  if (!hasSource) return true;
  if (
    value.kind !== "waypoints" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readWaypointTagStorage(source.waypointTag);
  if (!storage) return false;
  return !storage.present || isEditableWaypointTag(value.tag);
}

function isWaypointTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointTemplateResRef",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointTemplateResRef",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    !hasSource ||
    value.kind !== "waypoints" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readWaypointTemplateResRefStorage(source.waypointTemplateResRef);
  if (!storage) return false;
  if (!storage.present) return !hasTarget;
  return hasTarget && isWaypointTemplateResRef(value.waypointTemplateResRef);
}

function isEncounterTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterTemplateResRef",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterTemplateResRef",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    !source ||
    source.type !== "aurora_git" ||
    source.sourceKind !== "encounter" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) {
    return false;
  }
  const storage = readEncounterTemplateResRefStorage(source.encounterTemplateResRef);
  if (!storage) return false;
  if (!storage.present) return !hasTarget;
  return hasTarget && isEncounterTemplateResRef(value.encounterTemplateResRef);
}

function isTriggerTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "triggerTemplateResRef",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerTemplateResRef",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    !source ||
    source.type !== "aurora_git" ||
    source.sourceKind !== "trigger" ||
    !Number.isSafeInteger(source.sourceIndex) ||
    Number(source.sourceIndex) < 0
  ) {
    return false;
  }
  const storage = readTriggerTemplateResRefStorage(source.triggerTemplateResRef);
  if (!storage) return false;
  if (!storage.present) return !hasTarget;
  return hasTarget && isTriggerTemplateResRef(value.triggerTemplateResRef);
}

function isTriggerLocalizedNameState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "triggerLocalizedNameStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerLocalizedName",
  );
  if (!hasSource && !hasTarget) return true;
  const storage = readTriggerLocalizedNameStorage(
    source?.triggerLocalizedNameStorage,
  );
  if (
    value.kind !== "triggers" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "trigger" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !storage
  ) return false;
  const inlineValue = readTriggerLocalizedNameInlineAsciiStorage(storage);
  if (inlineValue === undefined) return !hasTarget;
  return !hasTarget || isTriggerLocalizedNameInlineAsciiText(
    value.triggerLocalizedName,
  );
}

function isTriggerEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "triggerEditorComment",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerEditorComment",
  );
  if (!hasSource && !hasTarget) return true;
  return value.kind === "triggers" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "trigger" &&
    isNonNegativeInteger(source.sourceIndex) &&
    hasSource &&
    hasTarget &&
    isTriggerEditorComment(source.triggerEditorComment) &&
    isTriggerEditorComment(value.triggerEditorComment);
}

function isTriggerScriptResRefsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "triggerScriptResRefsStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "triggerScriptResRefs");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "triggers"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "trigger"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readTriggerScriptResRefsStorage(source.triggerScriptResRefsStorage)
  ) return false;
  if (!hasTarget) return true;
  const sourceStorage = readTriggerScriptResRefsStorage(
    source.triggerScriptResRefsStorage,
  );
  if (triggerScriptResRefsStoragesEqual(
    sourceStorage,
    value.triggerScriptResRefs,
  )) return true;
  return readTriggerScriptResRefsTargetStorage(value.triggerScriptResRefs) !== null;
}

function isTriggerTransitionStorageState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "triggerTransitionStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerTransitionStorage",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "triggers"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "trigger"
    || !isNonNegativeInteger(source.sourceIndex)
    || !isTriggerTransitionStorage(source.triggerTransitionStorage)
  ) return false;
  return !hasTarget || isTriggerTransitionStorage(value.triggerTransitionStorage);
}

function isTriggerCorePropertiesState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "triggerCoreProperties");
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerCoreProperties",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "triggers"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "trigger"
    || !isNonNegativeInteger(source.sourceIndex)
    || !isTriggerCoreProperties(source.triggerCoreProperties)
  ) return false;
  return !hasTarget || isTriggerCoreProperties(value.triggerCoreProperties);
}

function isTriggerTrapPropertiesState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "triggerTrapProperties");
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerTrapProperties",
  );
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "triggers"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "trigger"
    || !isNonNegativeInteger(source.sourceIndex)
    || !isTriggerTrapProperties(source.triggerTrapProperties)
  ) return false;
  return !hasTarget || isTriggerTrapProperties(value.triggerTrapProperties);
}

function isWaypointLocalizedNameState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointLocalizedNameStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointLocalizedName",
  );
  if (!hasSource && !hasTarget) return true;
  const storage = readWaypointLocalizedNameStorage(
    source?.waypointLocalizedNameStorage,
  );
  if (
    value.kind !== "waypoints" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !storage
  ) return false;
  const inlineValue = readWaypointLocalizedNameInlineAsciiStorage(storage);
  if (inlineValue === undefined) return !hasTarget;
  return !hasTarget || isWaypointLocalizedNameInlineAsciiText(
    value.waypointLocalizedName,
  );
}

function isWaypointDescriptionState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointDescriptionStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointDescription",
  );
  if (!hasSource && !hasTarget) return true;
  const storage = readWaypointDescriptionStorage(
    source?.waypointDescriptionStorage,
  );
  if (
    value.kind !== "waypoints" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !storage
  ) return false;
  const inlineValue = readWaypointDescriptionInlineAsciiStorage(storage);
  if (inlineValue === undefined) return !hasTarget;
  return !hasTarget || isWaypointDescriptionInlineAsciiText(
    value.waypointDescription,
  );
}

function isWaypointMapNoteState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointMapNoteStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointMapNote",
  );
  if (!hasSource && !hasTarget) return true;
  const storage = readWaypointMapNoteStorage(source?.waypointMapNoteStorage);
  if (
    value.kind !== "waypoints" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !storage
  ) return false;
  const sourceValue = readWaypointMapNoteInlineAsciiValue(storage);
  if (!sourceValue) return !hasTarget;
  return !hasTarget || readWaypointMapNoteValue(value.waypointMapNote) !== undefined;
}

function isWaypointVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointVariables",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "waypointVariables");
  if (!hasSource && !hasTarget) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  return value.kind === "waypoints" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "waypoint" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    readWaypointVariableProvenance(sourceMetadata.waypointVariables) !== null &&
    hasTarget && readWaypointVariableTargetEntries(value.waypointVariables) !== null;
}

function isTriggerVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "triggerVariables",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "triggerVariables");
  if (!hasSource && !hasTarget) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  return value.kind === "triggers" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "trigger" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    readTriggerVariableProvenance(sourceMetadata.triggerVariables) !== null &&
    hasTarget && readTriggerVariableTargetEntries(value.triggerVariables) !== null;
}

function isWaypointAppearanceState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointAppearance",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "waypointAppearance");
  if (!hasSource && !hasTarget) return true;
  if (value.kind !== "waypoints" || source?.type !== "aurora_git" ||
    source.sourceKind !== "waypoint" || !isNonNegativeInteger(source.sourceIndex)) return false;
  const provenance = source.waypointAppearance;
  if (!isRecord(provenance) || !hasExactKeys(
    provenance,
    ["present", "nativeType", "value", "table"],
  )) return false;
  const table = provenance.table;
  if (!isRecord(table) || !hasExactKeys(table, [
    "resourceName", "sourceObjectKey", "sourceLayer", "sha256", "sizeBytes",
    "rowCount", "rowIndex",
  ])) return false;
  if (provenance.present !== true || provenance.nativeType !== "byte" ||
    !isIntegerBetween(provenance.value, 0, 0xff) || table.resourceName !== "waypoint.2da" ||
    typeof table.sourceObjectKey !== "string" || table.sourceObjectKey.length < 1 ||
    table.sourceObjectKey.length > 2048 ||
    (table.sourceLayer !== "module" && table.sourceLayer !== "hak" &&
      table.sourceLayer !== "vanilla") ||
    typeof table.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(table.sha256) ||
    !isIntegerBetween(table.sizeBytes, 1, 1024 * 1024) ||
    !isIntegerBetween(table.rowCount, 1, 256) ||
    !isIntegerBetween(table.rowIndex, 0, 0xff) ||
    provenance.value !== table.rowIndex || table.rowIndex >= table.rowCount) return false;
  return !hasTarget || (isIntegerBetween(value.waypointAppearance, 0, 0xff) &&
    Number(value.waypointAppearance) < Number(table.rowCount));
}

function isWaypointEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "waypointEditorComment",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointEditorComment",
  );
  if (!hasSource && !hasTarget) return true;
  return value.kind === "waypoints" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "waypoint" &&
    isNonNegativeInteger(source.sourceIndex) &&
    hasSource &&
    hasTarget &&
    isWaypointEditorComment(source.waypointEditorComment) &&
    isWaypointEditorComment(value.waypointEditorComment);
}

function isEncounterActiveState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterActiveStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterActive");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterActiveStorage(source.encounterActiveStorage)
  ) {
    return false;
  }
  return !hasTarget || readEncounterActiveStorage(value.encounterActive) !== null;
}

function isEncounterPlayerOnlyState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterPlayerOnlyStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterPlayerOnly");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterPlayerOnlyStorage(source.encounterPlayerOnlyStorage)
  ) {
    return false;
  }
  return !hasTarget
    || readEncounterPlayerOnlyStorage(value.encounterPlayerOnly) !== null;
}

function isEncounterResetState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterResetStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterReset");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterResetStorage(source.encounterResetStorage)
  ) {
    return false;
  }
  return !hasTarget || readEncounterResetStorage(value.encounterReset) !== null;
}

function isEncounterResetTimeState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterResetTimeStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterResetTime");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterResetTimeStorage(source.encounterResetTimeStorage)
  ) {
    return false;
  }
  return !hasTarget
    || readEncounterResetTimeStorage(value.encounterResetTime) !== null;
}

function isEncounterSpawnOptionState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterSpawnOptionStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterSpawnOption");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterSpawnOptionStorage(source.encounterSpawnOptionStorage)
  ) {
    return false;
  }
  return !hasTarget
    || readEncounterSpawnOptionStorage(value.encounterSpawnOption) !== null;
}

function isEncounterRespawnsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterRespawnsStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterRespawns");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterRespawnsStorage(source.encounterRespawnsStorage)
  ) {
    return false;
  }
  return !hasTarget
    || readEncounterRespawnsStorage(value.encounterRespawns) !== null;
}

function isEncounterCreatureCountState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterCreatureCountsStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterCreatureCounts");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterCreatureCountStorage(source.encounterCreatureCountsStorage)
  ) return false;
  return !hasTarget
    || readEncounterCreatureCountStorage(value.encounterCreatureCounts) !== null;
}

function isEncounterScriptResRefsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterScriptResRefsStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterScriptResRefs");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "encounters"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readEncounterScriptResRefsStorage(source.encounterScriptResRefsStorage)
  ) return false;
  return !hasTarget
    || readEncounterScriptResRefsTargetStorage(value.encounterScriptResRefs) !== null;
}

function isEncounterFactionState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableFactionCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "encounterFaction");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterFactionId");
  if (!hasSource && !hasTarget) return true;
  const provenance = readEncounterFactionProvenance(source?.encounterFaction);
  if (
    value.kind !== "encounters"
    || source?.type !== "aurora_git"
    || source.sourceKind !== "encounter"
    || !isNonNegativeInteger(source.sourceIndex)
    || !provenance
    || !catalog
    || catalog.descriptor.sha256 !== provenance.catalogSha256
    || catalog.descriptor.factionCount !== provenance.catalogFactionCount
    || !catalog.rows.some((row) => row.factionId === provenance.expectedValue)
    || !isNonNegativeInteger(value.encounterFactionId)
    || Number(value.encounterFactionId) < 1
  ) return false;
  return catalog.rows.some((row) => row.factionId === value.encounterFactionId);
}

function isEncounterDifficultyState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readEncounterDifficultyCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "encounterDifficulty");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "encounterDifficulty");
  if (!hasSource && !hasTarget) return true;
  const provenance = readEncounterDifficultyProvenance(source?.encounterDifficulty);
  if (value.kind !== "encounters" || source?.type !== "aurora_git" ||
      source.sourceKind !== "encounter" || !isNonNegativeInteger(source.sourceIndex) ||
      !provenance || !catalog ||
      catalog.descriptor.sha256 !== provenance.catalogSha256 ||
      catalog.descriptor.rowCount !== provenance.catalogRowCount) return false;
  const sourceRow = catalog.rows[provenance.expectedValue.difficultyIndex];
  if (!sourceRow || sourceRow.value !== provenance.expectedValue.difficulty ||
      !isRecord(value.encounterDifficulty) ||
      !hasExactKeys(value.encounterDifficulty, ["difficulty", "difficultyIndex"]) ||
      !isIntegerBetween(value.encounterDifficulty.difficulty, -20, 20) ||
      !isNonNegativeInteger(value.encounterDifficulty.difficultyIndex)) return false;
  const targetRow = catalog.rows[Number(value.encounterDifficulty.difficultyIndex)];
  return !!targetRow && targetRow.value === value.encounterDifficulty.difficulty;
}

function isEncounterLocalizedNameState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterLocalizedNameStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterLocalizedName",
  );
  if (!hasSource && !hasTarget) return true;
  const storage = readEncounterLocalizedNameStorage(
    source?.encounterLocalizedNameStorage,
  );
  if (
    value.kind !== "encounters" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "encounter" ||
    !isNonNegativeInteger(source.sourceIndex) ||
    !storage
  ) return false;
  const inlineValue = readEncounterLocalizedNameInlineAsciiStorage(storage);
  if (inlineValue === undefined) return !hasTarget;
  return !hasTarget || isEncounterLocalizedNameInlineAsciiText(
    value.encounterLocalizedName,
  );
}

function isEncounterEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterEditorComment",
  );
  if (!hasSource) return true;
  const encounterProperties = isRecord(value.encounterProperties)
    ? value.encounterProperties
    : undefined;
  return value.kind === "encounters" &&
    source?.type === "aurora_git" &&
    source.sourceKind === "encounter" &&
    isNonNegativeInteger(source.sourceIndex) &&
    isEncounterEditorComment(source.encounterEditorComment) &&
    encounterProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(encounterProperties, "comments") &&
    isEncounterEditorComment(encounterProperties.comments);
}

function isEncounterVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterVariables",
  );
  if (!hasSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const encounterProperties = isRecord(value.encounterProperties)
    ? value.encounterProperties
    : undefined;
  return value.kind === "encounters" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "encounter" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    readEncounterVariableProvenance(sourceMetadata.encounterVariables) !== null &&
    encounterProperties !== undefined &&
    readEncounterVariableTargetEntries(encounterProperties.variables) !== null;
}

function isEncounterCreatureListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterCreatureList",
  );
  if (!hasSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const encounterProperties = isRecord(value.encounterProperties)
    ? value.encounterProperties
    : undefined;
  const provenance = readEncounterCreatureListProvenance(
    sourceMetadata.encounterCreatureList,
  );
  const target = readEncounterCreatureListTargetEntries(
    encounterProperties?.creatureList,
  );
  return value.kind === "encounters"
    && sourceMetadata.type === "aurora_git"
    && sourceMetadata.sourceKind === "encounter"
    && isNonNegativeInteger(sourceMetadata.sourceIndex)
    && provenance !== null
    && target !== null
    && encounterCreatureListIdentityMatches(provenance.expectedEntries, target);
}

function isEncounterSpawnPointListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "encounterSpawnPoints",
  );
  if (!hasSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const encounterProperties = isRecord(value.encounterProperties)
    ? value.encounterProperties
    : undefined;
  return value.kind === "encounters"
    && sourceMetadata.type === "aurora_git"
    && sourceMetadata.sourceKind === "encounter"
    && isNonNegativeInteger(sourceMetadata.sourceIndex)
    && readEncounterSpawnPointListProvenance(sourceMetadata.encounterSpawnPoints) !== null
    && readEncounterSpawnPointTargetEntries(encounterProperties?.spawnPoints) !== null;
}

function isItemTemplateResRefState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemTemplateResRef");
  if (!hasSource) return true;
  if (
    value.kind !== "items" ||
    source?.type !== "aurora_git" ||
    source.sourceKind !== "item" ||
    !isNonNegativeInteger(source.sourceIndex)
  ) {
    return false;
  }
  const storage = readItemTemplateResRefStorage(source.itemTemplateResRef);
  if (!storage) return false;
  return !storage.present || isItemTemplateResRef(value.resRef);
}

function isItemInstanceStateState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemInstanceState");
  if (!hasSource) return true;
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  if (
    value.kind !== "items"
    || source?.type !== "aurora_git"
    || source.sourceKind !== "item"
    || !isNonNegativeInteger(source.sourceIndex)
    || readItemInstanceStateStorage(source.itemInstanceState) === null
    || itemProperties === undefined
  ) {
    return false;
  }
  return readItemInstanceStateValue({
    charges: itemProperties.charges,
    cost: itemProperties.cost,
    stolen: itemProperties.stolen,
    stackSize: itemProperties.stackSize,
    plot: itemProperties.plot,
    addCost: itemProperties.addCost,
    identified: itemProperties.identified,
    cursed: itemProperties.cursed,
  }) !== null;
}

function isItemLocalizedStringFieldState(
  sourceStorageValue: unknown,
  properties: Record<string, unknown>,
  scalarKey: "localizedName" | "description" | "identifiedDescription",
  entriesKey:
    | "localizedNameEntries"
    | "descriptionEntries"
    | "identifiedDescriptionEntries",
  maxDefaultBytes: number,
): boolean {
  const sourceStorage = readEditableItemLocalizedStringStorage(
    sourceStorageValue,
    maxDefaultBytes,
  );
  const hasScalar = Object.prototype.hasOwnProperty.call(properties, scalarKey);
  const hasEntries = Object.prototype.hasOwnProperty.call(properties, entriesKey);
  if (!sourceStorage) {
    return !hasEntries && hasScalar && isItemLocalizedStringInlineAsciiText(
      properties[scalarKey],
      maxDefaultBytes,
    );
  }
  if (!hasScalar || !isItemLocalizedStringInlineAsciiText(
    properties[scalarKey],
    maxDefaultBytes,
  )) return false;
  if (!hasEntries) return true;

  const targetEntries = readEditableItemLocalizedStringEntries(
    properties[entriesKey],
    maxDefaultBytes,
  );
  if (!targetEntries) return false;
  const defaultText = targetEntries.find((entry) => entry.languageId === 0)?.text ?? "";
  if (properties[scalarKey] !== defaultText) return false;
  const sourceIdentifiers = new Set(sourceStorage.entries.map((entry) => entry.languageId));
  return targetEntries.every((entry) => sourceIdentifiers.has(entry.languageId) || (
    isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0
  ));
}

function isItemLocalizedStringState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemLocalizedStrings");
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  const hasEntryTargets = itemProperties !== undefined && (
    Object.prototype.hasOwnProperty.call(itemProperties, "localizedNameEntries") ||
    Object.prototype.hasOwnProperty.call(itemProperties, "descriptionEntries") ||
    Object.prototype.hasOwnProperty.call(itemProperties, "identifiedDescriptionEntries")
  );
  if (!hasExactSource) return !hasEntryTargets;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const localizedStrings = readItemLocalizedStrings(sourceMetadata.itemLocalizedStrings);
  if (
    value.kind !== "items" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "item" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !localizedStrings ||
    !itemProperties ||
    !Object.prototype.hasOwnProperty.call(itemProperties, "localizedName") ||
    !Object.prototype.hasOwnProperty.call(itemProperties, "description") ||
    !Object.prototype.hasOwnProperty.call(itemProperties, "identifiedDescription")
  ) {
    return false;
  }

  return isItemLocalizedStringFieldState(
    localizedStrings.localizedName,
    itemProperties,
    "localizedName",
    "localizedNameEntries",
    MAX_ITEM_LOCALIZED_NAME_ASCII_BYTES,
  ) && isItemLocalizedStringFieldState(
    localizedStrings.description,
    itemProperties,
    "description",
    "descriptionEntries",
    MAX_ITEM_DESCRIPTION_ASCII_BYTES,
  ) && isItemLocalizedStringFieldState(
    localizedStrings.identifiedDescription,
    itemProperties,
    "identifiedDescription",
    "identifiedDescriptionEntries",
    MAX_ITEM_IDENTIFIED_DESCRIPTION_ASCII_BYTES,
  );
}

function isItemVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemVariables");
  if (!hasSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const provenance = readItemVariableProvenance(sourceMetadata.itemVariables);
  const itemProperties = isRecord(value.itemProperties)
    ? value.itemProperties
    : undefined;
  return value.kind === "items" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "item" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    provenance !== null &&
    itemProperties !== undefined &&
    readItemVariableTargetEntries(itemProperties.variables) !== null;
}

function isItemPropertyListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemPropertyList");
  if (!hasSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const provenance = readItemPropertyListProvenance(sourceMetadata.itemPropertyList);
  if (
    value.kind !== "items" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "item" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    provenance === null
  ) return false;
  if (!provenance.present) return true;
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  return itemProperties !== undefined &&
    readItemPropertyListTargetEntries(itemProperties.propertyList) !== null;
}

function isItemInventoryState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemInventoryItems");
  if (!hasSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const sourceEntries = readItemInventorySourceEntries(
    sourceMetadata.itemInventoryItems,
  );
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  return value.kind === "items" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "item" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    sourceEntries !== null &&
    itemProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(itemProperties, "inventoryItems") &&
    readItemInventoryTargetEntries(itemProperties.inventoryItems, sourceEntries) !== null;
}

function isItemVisualTransformState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "itemVisualTransform");
  const hasTarget = itemProperties !== undefined
    && Object.prototype.hasOwnProperty.call(itemProperties, "visualTransform");
  if (!hasSource && !hasTarget) return true;
  if (!hasSource || !hasTarget) return false;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const sourceStorage = readItemVisualTransformStorage(
    sourceMetadata.itemVisualTransform,
  );
  const targetStorage = readItemVisualTransformStorage(
    itemProperties.visualTransform,
  );
  const presentationStorage = sceneVisualTransformToItemStorage(
    value.visualTransform as unknown as SceneObjectVisualTransform,
  );
  return value.kind === "items"
    && sourceMetadata.type === "aurora_git"
    && sourceMetadata.sourceKind === "item"
    && isNonNegativeInteger(sourceMetadata.sourceIndex)
    && sourceStorage !== null
    && targetStorage !== null
    && presentationStorage !== null
    && itemVisualTransformStorageEqual(targetStorage, presentationStorage);
}

function isItemBaseAppearanceState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readItemBaseItemCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "itemBaseAppearance");
  if (!hasSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const provenance = bindItemBaseAppearanceProvenanceToCatalog(
    sourceMetadata.itemBaseAppearance,
    catalog,
  );
  if (value.kind !== "items" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "item" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !provenance || !catalog) return false;
  const itemProperties = isRecord(value.itemProperties) ? value.itemProperties : undefined;
  const target = readItemBaseAppearanceValue(itemProperties?.baseAppearance);
  if (!target) return false;
  const row = catalog.rows[target.baseItem];
  return row?.rowIndex === target.baseItem && row.modelType === target.modelType;
}

function isCreatureTagState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureTag");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureTagStorage(sourceMetadata.creatureTag);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) {
    return false;
  }
  if (!storage.present) return true;
  return canEditExistingCreatureTag(sourceMetadata) && isEditableCreatureTag(value.tag);
}

function isCreatureConversationState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureConversation");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureConversationStorage(sourceMetadata.creatureConversation);
  if (
    value.kind !== "creatures"
    || sourceMetadata.type !== "aurora_git"
    || sourceMetadata.sourceKind !== "creature"
    || !isNonNegativeInteger(sourceMetadata.sourceIndex)
    || !storage
  ) {
    return false;
  }
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return canEditExistingCreatureConversation(sourceMetadata)
    && creatureProperties !== undefined
    && Object.prototype.hasOwnProperty.call(creatureProperties, "conversation")
    && isCreatureConversationTargetResRef(creatureProperties.conversation);
}

function isCreatureInterruptableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureInterruptable");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureInterruptableStorage(sourceMetadata.creatureInterruptable);
  if (
    value.kind !== "creatures"
    || sourceMetadata.type !== "aurora_git"
    || sourceMetadata.sourceKind !== "creature"
    || !isNonNegativeInteger(sourceMetadata.sourceIndex)
    || !storage
  ) {
    return false;
  }
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return canEditExistingCreatureInterruptable(sourceMetadata)
    && creatureProperties !== undefined
    && Object.prototype.hasOwnProperty.call(creatureProperties, "noInterrupt")
    && typeof creatureProperties.noInterrupt === "boolean";
}

const CREATURE_ADVANCED_FLAG_TARGET_KEYS = Object.freeze({
  disarmable: "disarmable",
  plot: "plot",
  immortal: "immortal",
  lootable: "leavesLootableCorpse",
  noPermanentDeath: "noPermanentDeath",
} satisfies Readonly<Record<CreatureAdvancedFlagKey, string>>);

function isCreatureAdvancedFlagsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureAdvancedFlags");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAdvancedFlagsStorage(sourceMetadata.creatureAdvancedFlags);
  if (
    value.kind !== "creatures"
    || sourceMetadata.type !== "aurora_git"
    || sourceMetadata.sourceKind !== "creature"
    || !isNonNegativeInteger(sourceMetadata.sourceIndex)
    || !storage
  ) {
    return false;
  }

  const presentFields = CREATURE_ADVANCED_FLAG_FIELDS.filter(
    (field) => storage[field].present,
  );
  if (presentFields.length === 0) return true;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = creatureProperties && isRecord(creatureProperties.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  return advancedSettings !== undefined && presentFields.every((field) => {
    const targetKey = CREATURE_ADVANCED_FLAG_TARGET_KEYS[field];
    return canEditExistingCreatureAdvancedFlag(sourceMetadata, field)
      && Object.prototype.hasOwnProperty.call(advancedSettings, targetKey)
      && typeof advancedSettings[targetKey] === "boolean";
  });
}

function isCreatureDeathRemainsState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readPlaceableBodyBagCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata | undefined;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = creatureProperties && isRecord(creatureProperties.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const isRetainedCreature = value.kind === "creatures" &&
    sourceMetadata?.type === "aurora_git" &&
    sourceMetadata.sourceKind === "creature" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex);
  const hasBodyBagSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureBodyBag");
  const hasBodyBagTarget = isRetainedCreature && advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "treasureModelRow");
  const hasDecayTimeSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureDecayTime");
  const hasDecayTimeTarget = isRetainedCreature && advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "corpseDecayTimeSeconds");

  if (!hasBodyBagSource && !hasBodyBagTarget && !hasDecayTimeSource && !hasDecayTimeTarget) {
    return true;
  }
  if (!isRetainedCreature || !sourceMetadata || !advancedSettings) return false;

  if (hasBodyBagSource !== hasBodyBagTarget) return false;
  if (hasBodyBagSource) {
    const provenance = readCreatureBodyBagProvenance(sourceMetadata.creatureBodyBag);
    const target = advancedSettings.treasureModelRow;
    if (
      !provenance ||
      !catalog ||
      provenance.tableSha256 !== catalog.descriptor.sha256 ||
      provenance.tableRowCount !== catalog.descriptor.rowCount ||
      catalog.rows[provenance.expectedValue]?.rowIndex !== provenance.expectedValue ||
      !isNonNegativeInteger(target) ||
      target > 0xff ||
      catalog.rows[target]?.rowIndex !== target
    ) {
      return false;
    }
  }

  if (hasDecayTimeSource !== hasDecayTimeTarget) return false;
  if (hasDecayTimeSource) {
    const provenance = readCreatureDecayTimeProvenance(sourceMetadata.creatureDecayTime);
    if (!provenance ||
      creatureDecaySecondsToMilliseconds(advancedSettings.corpseDecayTimeSeconds) === undefined) {
      return false;
    }
  }
  return true;
}

function isCreatureVariableState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureVariables");
  if (!hasSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const provenance = readCreatureVariableProvenance(sourceMetadata.creatureVariables);
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return value.kind === "creatures" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "creature" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    provenance !== null &&
    creatureProperties !== undefined &&
    readCreatureVariableTargetEntries(creatureProperties.variables) !== null;
}

function isCreatureEditorCommentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureEditorComment");
  if (!hasSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return value.kind === "creatures" &&
    sourceMetadata.type === "aurora_git" &&
    sourceMetadata.sourceKind === "creature" &&
    isNonNegativeInteger(sourceMetadata.sourceIndex) &&
    isCreatureEditorComment(sourceMetadata.creatureEditorComment) &&
    creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "comments") &&
    isCreatureEditorComment(creatureProperties.comments);
}

function isCreatureAppearanceState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureAppearance");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAppearanceStorage(sourceMetadata.creatureAppearance);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const hasTarget = creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "appearanceType");
  if (!storage.table) {
    return !hasTarget || creatureProperties?.appearanceType === storage.value;
  }
  const target = creatureProperties?.appearanceType;
  return canEditExistingCreatureAppearance(sourceMetadata) &&
    hasTarget &&
    Number.isSafeInteger(target) &&
    Number(target) >= 0 &&
    Number(target) <= 0xffff &&
    Number(target) < storage.table.rowCount;
}

function isCreatureGenderState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureGender");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureGenderStorage(sourceMetadata.creatureGender);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const hasTarget = creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "genderId");
  if (!storage.table) {
    return !hasTarget || creatureProperties?.genderId === storage.value;
  }
  const target = creatureProperties?.genderId;
  return canEditExistingCreatureGender(sourceMetadata) &&
    hasTarget &&
    Number.isSafeInteger(target) &&
    Number(target) >= 0 &&
    Number(target) <= 0xff &&
    Number(target) < storage.table.rowCount;
}

function isCreaturePerceptionRangeState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creaturePerceptionRange");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreaturePerceptionRangeStorage(
    sourceMetadata.creaturePerceptionRange,
  );
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const hasTarget = advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "perceptionRangeId");
  if (!storage.table) {
    return !hasTarget || advancedSettings?.perceptionRangeId === storage.value;
  }
  const target = advancedSettings?.perceptionRangeId;
  return canEditExistingCreaturePerceptionRange(sourceMetadata) && hasTarget &&
    isCreaturePerceptionRangeRow(target) && Number(target) < storage.table.rowCount;
}

function isCreatureWalkRateState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureWalkRate");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureWalkRateStorage(sourceMetadata.creatureWalkRate);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const hasTarget = advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "walkRateId");
  if (!storage.table) return !hasTarget || advancedSettings?.walkRateId === storage.value;
  const target = advancedSettings?.walkRateId;
  return canEditExistingCreatureWalkRate(sourceMetadata) && hasTarget &&
    Number.isSafeInteger(target) && Number(target) >= 1 && Number(target) < storage.table.rowCount;
}

function isCreatureSoundSetFileState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureSoundSetFile");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureSoundSetFileStorage(sourceMetadata.creatureSoundSetFile);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const hasTarget = advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "soundSetFile");
  if (!storage.table) return !hasTarget || advancedSettings?.soundSetFile === storage.value;
  const target = advancedSettings?.soundSetFile;
  return canEditExistingCreatureSoundSetFile(sourceMetadata) && hasTarget &&
    Number.isSafeInteger(target) && Number(target) >= 0 && Number(target) <= 0xffff &&
    Number(target) < storage.table.rowCount;
}

function isCreatureStartingPackageState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureStartingPackage");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureStartingPackageStorage(sourceMetadata.creatureStartingPackage);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  const hasTarget = advancedSettings !== undefined &&
    Object.prototype.hasOwnProperty.call(advancedSettings, "startingPackageId");
  if (!storage.classIds || !storage.table) {
    return !hasTarget || advancedSettings?.startingPackageId === storage.value;
  }
  const target = advancedSettings?.startingPackageId;
  return canEditExistingCreatureStartingPackage(sourceMetadata) && hasTarget &&
    Number.isSafeInteger(target) && Number(target) >= 0 && Number(target) <= 0xff &&
    Number(target) < storage.table.rowCount;
}

function isCreatureSkillListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureSkillList");
  if (!hasExactSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureSkillListStorage(sourceMetadata.creatureSkillList);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present || !storage.table) return true;
  if (!canEditExistingCreatureSkillList(sourceMetadata)) return false;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const skills = creatureProperties?.skills;
  if (!Array.isArray(skills) || skills.length !== storage.table.rowCount) return false;
  const seen = new Set<number>();
  for (const rawEntry of skills) {
    if (!isRecord(rawEntry) || !isNonNegativeInteger(rawEntry.skillId) ||
      Number(rawEntry.skillId) >= storage.table.rowCount || seen.has(Number(rawEntry.skillId)) ||
      !Number.isSafeInteger(rawEntry.rank) || Number(rawEntry.rank) < 0 ||
      Number(rawEntry.rank) > 0xff) return false;
    seen.add(Number(rawEntry.skillId));
  }
  return seen.size === storage.table.rowCount &&
    (creatureProperties?.skillListTruncationConfirmed === undefined ||
      typeof creatureProperties.skillListTruncationConfirmed === "boolean");
}

function isCreatureFeatListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureFeatList");
  if (!hasExactSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureFeatListStorage(sourceMetadata.creatureFeatList);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present || !storage.table) return true;
  if (!canEditExistingCreatureFeatList(sourceMetadata)) return false;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const feats = creatureProperties?.feats;
  if (!Array.isArray(feats)) return false;
  const seen = new Set<number>();
  for (const rawEntry of feats) {
    if (!isRecord(rawEntry) || !isNonNegativeInteger(rawEntry.featId) ||
      Number(rawEntry.featId) >= storage.table.rowCount ||
      seen.has(Number(rawEntry.featId)) || typeof rawEntry.assigned !== "boolean") return false;
    seen.add(Number(rawEntry.featId));
  }
  return true;
}

function isCreatureSpecialAbilityListState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureSpecialAbilityList");
  if (!hasExactSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureSpecialAbilityListStorage(
    sourceMetadata.creatureSpecialAbilityList,
  );
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present || !storage.table) return true;
  if (!canEditExistingCreatureSpecialAbilityList(sourceMetadata)) return false;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const abilities = creatureProperties?.specialAbilities;
  if (!Array.isArray(abilities) || abilities.length > storage.table.rowCount) return false;
  const seen = new Set<number>();
  for (const rawEntry of abilities) {
    if (!isRecord(rawEntry) || !isNonNegativeInteger(rawEntry.spellId) ||
      Number(rawEntry.spellId) >= storage.table.rowCount ||
      seen.has(Number(rawEntry.spellId)) || !Number.isSafeInteger(rawEntry.uses) ||
      Number(rawEntry.uses) < 0 || Number(rawEntry.uses) > 0xff ||
      !Number.isSafeInteger(rawEntry.casterLevel) || Number(rawEntry.casterLevel) < 0 ||
      Number(rawEntry.casterLevel) > 15) return false;
    seen.add(Number(rawEntry.spellId));
  }
  return true;
}

function isCreatureClassLevelState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureClassLevelState");
  if (!hasExactSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureClassLevelState(sourceMetadata.creatureClassLevelState);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;
  const hitPoints = readCreatureHitPointState(sourceMetadata.creatureHitPointState);
  if (!hitPoints?.present || !hitPoints.racialTypes ||
    hitPoints.classLevels.length !== storage.entries.length ||
    hitPoints.classLevels.some((level, index) => level !== storage.entries[index]?.level)) {
    return false;
  }
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const classEntries = creatureProperties?.classEntries;
  if (!Array.isArray(classEntries) || classEntries.length < 1 || classEntries.length > 8) {
    return false;
  }
  let totalLevel = 0;
  const identity = readCreatureClassIdentityState(sourceMetadata.creatureClassIdentityState);
  const classesTable = identity?.present ? identity.classesTable : undefined;
  const slotCountChanged = classEntries.length !== storage.entries.length;
  if (slotCountChanged && (!identity?.present || !identity.classesTable ||
    identity.entries.length !== storage.entries.length ||
    identity.entries.some((entry, index) =>
      entry.classId !== storage.entries[index]?.classId ||
      entry.level !== storage.entries[index]?.level))) return false;
  const classIdsChanged = Array.isArray(classEntries) && classEntries.some(
    (candidate, index) => isRecord(candidate) &&
      candidate.classId !== storage.entries[index]?.classId,
  );
  for (let index = 0; index < classEntries.length; index += 1) {
    const candidate = classEntries[index];
    const retained = storage.entries[index];
    if (!isRecord(candidate) || !isNonNegativeInteger(candidate.classId) ||
      (classesTable && Number(candidate.classId) >= classesTable.rowCount) ||
      !Number.isSafeInteger(candidate.level) || Number(candidate.level) < 1 ||
      Number(candidate.level) > 60) return false;
    if (slotCountChanged) {
      if (index < Math.min(classEntries.length, storage.entries.length) &&
        (!retained || candidate.classId !== retained.classId ||
          candidate.level !== retained.level)) return false;
    } else if (!retained ||
      (!classIdsChanged && candidate.classId !== retained.classId) ||
      (classIdsChanged && (!identity?.present || !identity.classesTable ||
        identity.entries[index]?.classId !== retained.classId ||
        identity.entries[index]?.level !== retained.level))) return false;
    totalLevel += Number(candidate.level);
  }
  return totalLevel <= 180 && new Set(classEntries.map((entry) =>
    Number((entry as Record<string, unknown>).classId))).size === classEntries.length;
}

function isCreatureClassIdentityState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureClassIdentityState");
  if (!hasExactSource) return true;
  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureClassIdentityState(sourceMetadata.creatureClassIdentityState);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const classEntries = creatureProperties?.classEntries;
  if (!Array.isArray(classEntries) || classEntries.length < 1 || classEntries.length > 8) {
    return false;
  }
  const targetClassIds: number[] = [];
  const targetLevels: number[] = [];
  for (let index = 0; index < classEntries.length; index += 1) {
    const candidate = classEntries[index];
    if (!isRecord(candidate) || !isNonNegativeInteger(candidate.classId) ||
      !Number.isSafeInteger(candidate.level) || Number(candidate.level) < 1 ||
      Number(candidate.level) > 60 ||
      (storage.classesTable && Number(candidate.classId) >= storage.classesTable.rowCount)) {
      return false;
    }
    targetClassIds.push(Number(candidate.classId));
    targetLevels.push(Number(candidate.level));
  }
  const totalLevel = targetLevels.reduce((sum, level) => sum + level, 0);
  if (totalLevel > 180) return false;
  if (new Set(targetClassIds).size !== targetClassIds.length) return false;
  const rawClassSpellClearSlotIndices = creatureProperties?.classSpellClearSlotIndices;
  const rawClassSpellClearConfirmed = creatureProperties?.classSpellClearConfirmed;
  let classSpellClearRequested = false;
  if (rawClassSpellClearSlotIndices !== undefined) {
    if (!Array.isArray(rawClassSpellClearSlotIndices) ||
      rawClassSpellClearSlotIndices.length > storage.entries.length) return false;
    let previousIndex = -1;
    for (const rawIndex of rawClassSpellClearSlotIndices) {
      if (!Number.isSafeInteger(rawIndex) || Number(rawIndex) <= previousIndex ||
        Number(rawIndex) < 0 || Number(rawIndex) >= storage.entries.length ||
        storage.entries[Number(rawIndex)]?.canonicalSpellListFieldCount === 0) return false;
      previousIndex = Number(rawIndex);
    }
    classSpellClearRequested = rawClassSpellClearSlotIndices.length > 0;
  }
  if (classSpellClearRequested) {
    if (rawClassSpellClearConfirmed !== true) return false;
  } else if (rawClassSpellClearConfirmed !== undefined &&
    rawClassSpellClearConfirmed !== false) return false;
  const rawClassSpellRemovalTargets = creatureProperties?.classSpellRemovalTargets;
  const rawClassSpellRemovalConfirmed = creatureProperties?.classSpellRemovalConfirmed;
  let classSpellRemovalRequested = false;
  if (rawClassSpellRemovalTargets !== undefined) {
    if (!Array.isArray(rawClassSpellRemovalTargets) ||
      rawClassSpellRemovalTargets.length > 256 ||
      storage.entries.some((entry) => !entry.spellLists)) return false;
    const sourceTargets = new Set(storage.entries.flatMap((entry, classSlotIndex) =>
      entry.spellLists!.flatMap((list) => list.entries.map((_spell, entryIndex) =>
        `${classSlotIndex}:${list.listKind}:${list.spellLevel}:${entryIndex}`))));
    let previousOrder = -1;
    for (const rawTarget of rawClassSpellRemovalTargets) {
      if (!isRecord(rawTarget) || Object.keys(rawTarget).length !== 4 ||
        !isNonNegativeInteger(rawTarget.classSlotIndex) ||
        Number(rawTarget.classSlotIndex) >= storage.entries.length ||
        (rawTarget.listKind !== "known" && rawTarget.listKind !== "memorized") ||
        !isNonNegativeInteger(rawTarget.spellLevel) || Number(rawTarget.spellLevel) > 13 ||
        !isNonNegativeInteger(rawTarget.entryIndex) || Number(rawTarget.entryIndex) > 255) {
        return false;
      }
      const order = Number(rawTarget.classSlotIndex) * 28 * 256 +
        (rawTarget.listKind === "known" ? 0 : 14) * 256 +
        Number(rawTarget.spellLevel) * 256 + Number(rawTarget.entryIndex);
      const key = `${rawTarget.classSlotIndex}:${rawTarget.listKind}:` +
        `${rawTarget.spellLevel}:${rawTarget.entryIndex}`;
      if (order <= previousOrder || !sourceTargets.has(key)) return false;
      previousOrder = order;
    }
    classSpellRemovalRequested = rawClassSpellRemovalTargets.length > 0;
  }
  if (classSpellRemovalRequested) {
    if (rawClassSpellRemovalConfirmed !== true || classSpellClearRequested) return false;
  } else if (rawClassSpellRemovalConfirmed !== undefined &&
    rawClassSpellRemovalConfirmed !== false) return false;
  const rawClassSpellReorders = creatureProperties?.classSpellReorders;
  const rawClassSpellReorderConfirmed = creatureProperties?.classSpellReorderConfirmed;
  let classSpellReorderRequested = false;
  if (rawClassSpellReorders !== undefined) {
    if (!Array.isArray(rawClassSpellReorders) || rawClassSpellReorders.length > 224 ||
      storage.entries.some((entry) => !entry.spellLists)) return false;
    const sourceLists = new Map<string, number>(storage.entries.flatMap((entry, classSlotIndex) =>
      entry.spellLists!.filter((list) => list.entries.length >= 2).map((list) => [
        `${classSlotIndex}:${list.listKind}:${list.spellLevel}`,
        list.entries.length,
      ] as const)));
    let previousOrder = -1;
    let carriedEntryCount = 0;
    for (const rawReorder of rawClassSpellReorders) {
      if (!isRecord(rawReorder) || Object.keys(rawReorder).length !== 4 ||
        !isNonNegativeInteger(rawReorder.classSlotIndex) ||
        Number(rawReorder.classSlotIndex) >= storage.entries.length ||
        (rawReorder.listKind !== "known" && rawReorder.listKind !== "memorized") ||
        !isNonNegativeInteger(rawReorder.spellLevel) || Number(rawReorder.spellLevel) > 13 ||
        !Array.isArray(rawReorder.entryOrder)) return false;
      const order = Number(rawReorder.classSlotIndex) * 28 +
        (rawReorder.listKind === "known" ? 0 : 14) + Number(rawReorder.spellLevel);
      const key = `${rawReorder.classSlotIndex}:${rawReorder.listKind}:${rawReorder.spellLevel}`;
      const sourceLength = sourceLists.get(key);
      if (order <= previousOrder || sourceLength === undefined ||
        rawReorder.entryOrder.length !== sourceLength) return false;
      const seen = new Set<number>();
      let changed = false;
      for (let index = 0; index < rawReorder.entryOrder.length; index += 1) {
        const rawIndex = rawReorder.entryOrder[index];
        if (!Number.isSafeInteger(rawIndex) || Number(rawIndex) < 0 ||
          Number(rawIndex) >= sourceLength || seen.has(Number(rawIndex))) return false;
        seen.add(Number(rawIndex));
        changed ||= Number(rawIndex) !== index;
      }
      if (!changed) return false;
      previousOrder = order;
      carriedEntryCount += sourceLength;
      if (carriedEntryCount > 256) return false;
    }
    classSpellReorderRequested = rawClassSpellReorders.length > 0;
  }
  if (classSpellReorderRequested) {
    if (rawClassSpellReorderConfirmed !== true || classSpellClearRequested ||
      classSpellRemovalRequested) return false;
  } else if (rawClassSpellReorderConfirmed !== undefined &&
    rawClassSpellReorderConfirmed !== false) return false;
  const slotCountChanged = classEntries.length !== storage.entries.length;
  if (slotCountChanged) {
    if (classSpellClearRequested || classSpellRemovalRequested || classSpellReorderRequested) {
      return false;
    }
    const retainedPrefixLength = Math.min(classEntries.length, storage.entries.length);
    if (!storage.classesTable || targetClassIds.slice(0, retainedPrefixLength).some(
      (classId, index) => classId !== storage.entries[index]?.classId ||
        targetLevels[index] !== storage.entries[index]?.level,
    )) return false;
    const classLevels = readCreatureClassLevelState(sourceMetadata.creatureClassLevelState);
    const hitPoints = readCreatureHitPointState(sourceMetadata.creatureHitPointState);
    if (!classLevels?.present || !hitPoints?.present || !hitPoints.racialTypes ||
      classLevels.entries.length !== storage.entries.length ||
      hitPoints.classLevels.length !== storage.entries.length ||
      classLevels.entries.some((entry, index) =>
        entry.classId !== storage.entries[index]?.classId ||
        entry.level !== storage.entries[index]?.level ||
        hitPoints.classLevels[index] !== storage.entries[index]?.level)) return false;
    const startingPackage = readCreatureStartingPackageStorage(
      sourceMetadata.creatureStartingPackage,
    );
    const advancedSettings = isRecord(creatureProperties?.advancedSettings)
      ? creatureProperties.advancedSettings
      : undefined;
    const sourceClassIds = storage.entries.map((entry) => entry.classId);
    const shrinking = classEntries.length < storage.entries.length;
    return Boolean(startingPackage?.present && startingPackage.table &&
      startingPackage.classIds?.length === sourceClassIds.length &&
      startingPackage.classIds.every((classId, index) => classId === sourceClassIds[index]) &&
      creatureProperties?.classSlotResizeDestructiveRemovalConfirmed === shrinking &&
      creatureProperties?.classIdentityDestructiveSpellClearConfirmed !== true &&
      isNonNegativeInteger(advancedSettings?.startingPackageId) &&
      Number(advancedSettings?.startingPackageId) <= 0xff &&
      Number(advancedSettings?.startingPackageId) < startingPackage.table.rowCount);
  }
  const levelsChanged = targetLevels.some(
    (level, index) => level !== storage.entries[index]?.level,
  );
  if (levelsChanged) {
    if (classSpellClearRequested || classSpellRemovalRequested || classSpellReorderRequested) {
      return false;
    }
    const classLevels = readCreatureClassLevelState(sourceMetadata.creatureClassLevelState);
    const hitPoints = readCreatureHitPointState(sourceMetadata.creatureHitPointState);
    if (!classLevels?.present || !hitPoints?.present || !hitPoints.racialTypes ||
      classLevels.entries.length !== storage.entries.length ||
      hitPoints.classLevels.length !== storage.entries.length ||
      classLevels.entries.some((entry, index) =>
        entry.classId !== storage.entries[index]?.classId ||
        entry.level !== storage.entries[index]?.level ||
        hitPoints.classLevels[index] !== storage.entries[index]?.level)) return false;
  }
  const changed = targetClassIds.some(
    (classId, index) => classId !== storage.entries[index]?.classId,
  );
  if (changed && (classSpellClearRequested || classSpellRemovalRequested ||
    classSpellReorderRequested)) return false;
  if (!changed) {
    return creatureProperties?.classIdentityDestructiveSpellClearConfirmed === undefined ||
      typeof creatureProperties.classIdentityDestructiveSpellClearConfirmed === "boolean";
  }
  const startingPackage = readCreatureStartingPackageStorage(
    sourceMetadata.creatureStartingPackage,
  );
  const advancedSettings = isRecord(creatureProperties?.advancedSettings)
    ? creatureProperties.advancedSettings
    : undefined;
  return Boolean(storage.classesTable && startingPackage?.present && startingPackage.table &&
    creatureProperties?.classIdentityDestructiveSpellClearConfirmed === true &&
    isNonNegativeInteger(advancedSettings?.startingPackageId) &&
    Number(advancedSettings?.startingPackageId) <= 0xff &&
    Number(advancedSettings?.startingPackageId) < startingPackage.table.rowCount);
}

function isCreaturePhenotypeState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creaturePhenotype");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreaturePhenotypeStorage(sourceMetadata.creaturePhenotype);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const hasTarget = creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "phenotypeId");
  if (!storage.table) {
    return !hasTarget || creatureProperties?.phenotypeId === storage.value;
  }
  const target = creatureProperties?.phenotypeId;
  if (target === storage.value) return true;
  const appearance = readCreatureAppearanceStorage(sourceMetadata.creatureAppearance);
  return canEditExistingCreaturePhenotype(sourceMetadata) &&
    hasTarget &&
    Number.isSafeInteger(target) &&
    Number(target) >= 0 &&
    Number(target) <= 0xff &&
    Number(target) !== 1 &&
    Number(target) < storage.table.rowCount &&
    appearance?.present === true &&
    appearance.table !== undefined &&
    creatureProperties?.appearanceType === appearance.value;
}

function isCreaturePortraitState(
  value: Record<string, unknown>,
  catalog: ReturnType<typeof readCreaturePortraitCatalog>,
): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creaturePortrait");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreaturePortraitStorage(sourceMetadata.creaturePortrait);
  if (value.kind !== "creatures" || sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) || !storage) return false;
  if (!storage.present) return true;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const hasTarget = creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "portraitId");
  if (!storage.table || !storage.selectorContext) {
    return !hasTarget || creatureProperties?.portraitId === storage.value;
  }
  const target = creatureProperties?.portraitId;
  if (!hasTarget || !Number.isSafeInteger(target) ||
    typeof creatureProperties?.portraitResRef !== "string") return false;
  const row = admittedCreaturePortraitRows(sourceMetadata, catalog)
    .find((candidate) => candidate.rowIndex === target);
  return row !== undefined && row.baseResRef === creatureProperties.portraitResRef;
}

function isCreatureChallengeRatingState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureChallengeRating");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureChallengeRatingStorage(
    sourceMetadata.creatureChallengeRating,
  );
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "challengeRating") &&
    normalizeCreatureChallengeRating(creatureProperties.challengeRating) !== null;
}

function isCreatureAbilityScoresState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureAbilityScores");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAbilityScoresStorage(
    sourceMetadata.creatureAbilityScores,
  );
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const statistics = isRecord(creatureProperties?.statistics)
    ? creatureProperties.statistics
    : undefined;
  const abilityScores = isRecord(statistics?.abilityScores)
    ? statistics.abilityScores
    : undefined;
  for (const definition of CREATURE_ABILITY_SCORE_FIELDS) {
    const member = storage[definition.key];
    if (!member.present) continue;
    const normalized = abilityScores &&
      Object.prototype.hasOwnProperty.call(abilityScores, definition.key)
      ? normalizeCreatureAbilityScore(abilityScores[definition.key])
      : null;
    if (
      normalized === null
    ) return false;
    if (definition.key === "constitution" && normalized !== member.value) {
      const hitPoints = readCreatureHitPointState(sourceMetadata.creatureHitPointState);
      if (!hitPoints?.present || !hitPoints.racialTypes ||
        hitPoints.constitution.value !== member.value) return false;
    }
  }
  return true;
}

function isCreatureAppearanceColorsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureAppearanceColors");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAppearanceColorsStorage(
    sourceMetadata.creatureAppearanceColors,
  );
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const appearanceSettings = isRecord(creatureProperties?.appearanceSettings)
    ? creatureProperties.appearanceSettings
    : undefined;
  const colors = isRecord(appearanceSettings?.colors)
    ? appearanceSettings.colors
    : undefined;
  for (const definition of CREATURE_APPEARANCE_COLOR_FIELDS) {
    if (!storage[definition.key].present) continue;
    const candidate = colors?.[definition.key];
    if (
      typeof candidate !== "string" ||
      !/^(?:0|[1-9]\d{0,2})$/u.test(candidate) ||
      normalizeCreatureAppearanceColor(Number(candidate)) === null ||
      String(Number(candidate)) !== candidate
    ) return false;
  }
  return true;
}

function isCreatureBodyPartsState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureBodyParts");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureBodyPartsStorage(sourceMetadata.creatureBodyParts);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const appearanceSettings = isRecord(creatureProperties?.appearanceSettings)
    ? creatureProperties.appearanceSettings
    : undefined;
  if (!appearanceSettings || appearanceSettings.partBasedAppearance !== true) return false;
  const sourceOnlyParts = isRecord(appearanceSettings.sourceOnlyParts)
    ? appearanceSettings.sourceOnlyParts
    : undefined;
  for (const definition of CREATURE_BODY_PART_FIELDS) {
    const member = storage[definition.key];
    if (!member.present) continue;
    const sourceOnly = definition.key === "belt" ||
      definition.key === "rightShoulder" ||
      definition.key === "leftShoulder";
    const target = sourceOnly ? sourceOnlyParts : appearanceSettings;
    const candidate = target?.[definition.key];
    const maximum = maximumCreatureBodyPartTarget(member);
    if (
      maximum === null ||
      typeof candidate !== "string" ||
      !/^(?:0|[1-9]\d{0,4})$/u.test(candidate) ||
      Number(candidate) > maximum ||
      String(Number(candidate)) !== candidate
    ) return false;
  }
  return true;
}

function isCreatureAppendagesState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureAppendages");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAppendagesStorage(sourceMetadata.creatureAppendages);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const appearanceSettings = isRecord(creatureProperties?.appearanceSettings)
    ? creatureProperties.appearanceSettings
    : undefined;
  for (const key of ["wings", "tail"] as const) {
    const member = storage[key];
    if (!member.present) continue;
    const candidate = appearanceSettings?.[key];
    if (
      typeof candidate !== "string" ||
      !/^(?:0|[1-9]\d{0,9})$/u.test(candidate) ||
      !Number.isSafeInteger(Number(candidate)) ||
      Number(candidate) > 0xffff_ffff ||
      String(Number(candidate)) !== candidate
    ) return false;
    if (member.modernDword.present && member.modernDword.table) {
      if (Number(candidate) >= member.modernDword.table.rowCount) return false;
    } else if (Number(candidate) !== member.value) {
      return false;
    }
  }
  return true;
}

function isCreatureHitPointState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureHitPointState");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureHitPointState(sourceMetadata.creatureHitPointState);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const statistics = isRecord(creatureProperties?.statistics)
    ? creatureProperties.statistics
    : undefined;
  const abilityScores = isRecord(statistics?.abilityScores)
    ? statistics.abilityScores
    : undefined;
  const constitution = abilityScores
    ? normalizeCreatureAbilityScore(abilityScores.constitution)
    : null;
  const baseHitPoints = Number(statistics?.baseHitPoints);
  const hitPointBonuses = Number(statistics?.hitPointBonuses);
  const currentHitPoints = Number(statistics?.currentHitPoints);
  const maxHitPoints = Number(statistics?.maxHitPoints);
  if (constitution === null || !Number.isSafeInteger(baseHitPoints) ||
    !Number.isSafeInteger(hitPointBonuses) || !Number.isSafeInteger(currentHitPoints) ||
    !Number.isSafeInteger(maxHitPoints)) return false;

  const abilityStorage = readCreatureAbilityScoresStorage(
    sourceMetadata.creatureAbilityScores,
  );
  if (abilityStorage?.constitution.present &&
    abilityStorage.constitution.value !== storage.constitution.value) return false;

  const classLevelStorage = readCreatureClassLevelState(
    sourceMetadata.creatureClassLevelState,
  );
  let targetClassLevels: readonly number[] | undefined;
  if (classLevelStorage?.present) {
    const classEntries = creatureProperties?.classEntries;
    if (!Array.isArray(classEntries) || classEntries.length < 1 || classEntries.length > 8) {
      return false;
    }
    const levels: number[] = [];
    const identity = readCreatureClassIdentityState(sourceMetadata.creatureClassIdentityState);
    const classesTable = identity?.present ? identity.classesTable : undefined;
    const slotCountChanged = classEntries.length !== classLevelStorage.entries.length;
    if (slotCountChanged && (!identity?.present || !identity.classesTable ||
      identity.entries.length !== classLevelStorage.entries.length ||
      identity.entries.some((entry, index) =>
        entry.classId !== classLevelStorage.entries[index]?.classId ||
        entry.level !== classLevelStorage.entries[index]?.level))) return false;
    const classIdsChanged = classEntries.some((candidate, index) =>
      isRecord(candidate) && candidate.classId !== classLevelStorage.entries[index]?.classId);
    for (let index = 0; index < classEntries.length; index += 1) {
      const candidate = classEntries[index];
      const retained = classLevelStorage.entries[index];
      if (!isRecord(candidate) || !isNonNegativeInteger(candidate.classId) ||
        (classesTable && Number(candidate.classId) >= classesTable.rowCount) ||
        !Number.isSafeInteger(candidate.level) || Number(candidate.level) < 1 ||
        Number(candidate.level) > 60) return false;
      if (slotCountChanged) {
        if (index < Math.min(classEntries.length, classLevelStorage.entries.length) &&
          (!retained || candidate.classId !== retained.classId ||
            candidate.level !== retained.level)) return false;
      } else if (!retained ||
        (!classIdsChanged && candidate.classId !== retained.classId) ||
        (classIdsChanged && (!identity?.present || !identity.classesTable ||
          identity.entries[index]?.classId !== retained.classId ||
          identity.entries[index]?.level !== retained.level))) return false;
      levels.push(Number(candidate.level));
    }
    if (levels.reduce((sum, level) => sum + level, 0) > 180 ||
      new Set(classEntries.map((entry) => Number(
        (entry as Record<string, unknown>).classId,
      ))).size !== classEntries.length) return false;
    targetClassLevels = levels;
  }

  const featListStorage = readCreatureFeatListStorage(sourceMetadata.creatureFeatList);
  let targetFeatRow40Present: boolean | undefined;
  if (featListStorage?.present && featListStorage.table) {
    const feats = creatureProperties?.feats;
    if (!Array.isArray(feats)) return false;
    targetFeatRow40Present = feats.some((candidate) =>
      isRecord(candidate) && candidate.featId === 40 && candidate.assigned === true);
  }

  if (!storage.racialTypes) {
    return constitution === storage.constitution.value &&
      baseHitPoints === storage.hitPoints.value &&
      currentHitPoints === storage.hitPoints.value &&
      maxHitPoints === storage.maxHitPoints.value &&
      hitPointBonuses === storage.maxHitPoints.value - storage.hitPoints.value &&
      (targetFeatRow40Present === undefined ||
        targetFeatRow40Present === storage.featRow40Present);
  }
  const target = deriveExistingCreatureHitPointTarget(storage, {
    baseHitPoints,
    constitution,
    ...(targetClassLevels ? { classLevels: targetClassLevels } : {}),
    ...(targetFeatRow40Present !== undefined
      ? { featRow40Present: targetFeatRow40Present }
      : {}),
  });
  return target !== null &&
    currentHitPoints === target.currentHitPoints &&
    maxHitPoints === target.maxHitPoints &&
    hitPointBonuses === target.maxHitPoints - target.hitPoints;
}

function isCreatureNaturalArmorClassState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureNaturalArmorClass");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureNaturalArmorClassStorage(
    sourceMetadata.creatureNaturalArmorClass,
  );
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const statistics = isRecord(creatureProperties?.statistics)
    ? creatureProperties.statistics
    : undefined;
  return statistics !== undefined &&
    Object.prototype.hasOwnProperty.call(statistics, "naturalArmorClass") &&
    normalizeCreatureNaturalArmorClass(statistics.naturalArmorClass) !== null;
}

function isCreatureSavingThrowBonusesState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureSavingThrowBonuses");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureSavingThrowBonusesStorage(
    sourceMetadata.creatureSavingThrowBonuses,
  );
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const statistics = isRecord(creatureProperties?.statistics)
    ? creatureProperties.statistics
    : undefined;
  const saves = isRecord(statistics?.saves) ? statistics.saves : undefined;
  for (const definition of CREATURE_SAVING_THROW_BONUS_FIELDS) {
    if (!storage[definition.key].present) continue;
    if (
      !saves ||
      !Object.prototype.hasOwnProperty.call(saves, definition.statisticsKey) ||
      normalizeCreatureSavingThrowBonus(saves[definition.statisticsKey]) === null
    ) return false;
  }
  return true;
}

function isCreatureAlignmentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "creatureAlignment");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const storage = readCreatureAlignmentStorage(sourceMetadata.creatureAlignment);
  if (
    value.kind !== "creatures" ||
    sourceMetadata.type !== "aurora_git" ||
    sourceMetadata.sourceKind !== "creature" ||
    !isNonNegativeInteger(sourceMetadata.sourceIndex) ||
    !storage
  ) return false;
  if (!storage.goodEvil.present || !storage.lawfulChaotic.present) return true;

  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  return creatureProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(creatureProperties, "alignment") &&
    normalizeCreatureAlignmentLabel(creatureProperties.alignment) !== null;
}

function isCreatureLocalizedStringFieldState(
  sourceStorageValue: unknown,
  properties: Record<string, unknown>,
  scalarKey: "firstName" | "lastName" | "description",
  entriesKey: "firstNameEntries" | "lastNameEntries" | "descriptionEntries",
  maxDefaultBytes: number,
): boolean {
  const sourceStorage = readEditableCreatureLocalizedStringStorage(
    sourceStorageValue,
    maxDefaultBytes,
  );
  const hasScalar = Object.prototype.hasOwnProperty.call(properties, scalarKey);
  const hasEntries = Object.prototype.hasOwnProperty.call(properties, entriesKey);
  if (!sourceStorage) return !hasEntries && hasScalar && typeof properties[scalarKey] === "string";
  if (!hasScalar || !isCreatureNameInlineAsciiText(
    properties[scalarKey],
    maxDefaultBytes,
  )) return false;
  if (!hasEntries) return true;

  const targetEntries = readEditableCreatureLocalizedStringEntries(
    properties[entriesKey],
    maxDefaultBytes,
  );
  if (!targetEntries) return false;
  const defaultText = targetEntries.find((entry) => entry.languageId === 0)?.text ?? "";
  if (properties[scalarKey] !== defaultText) return false;
  const sourceIdentifiers = new Set(sourceStorage.entries.map((entry) => entry.languageId));
  return targetEntries.every((entry) => sourceIdentifiers.has(entry.languageId) || (
    isAddableAreaNameStorageEntryIdentifier(entry.languageId) && entry.text.length > 0
  ));
}

function isCreatureNameLocalizedStringState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureLocalizedStrings");
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  const hasEntryTargets = creatureProperties !== undefined && (
    Object.prototype.hasOwnProperty.call(creatureProperties, "firstNameEntries")
    || Object.prototype.hasOwnProperty.call(creatureProperties, "lastNameEntries")
    || Object.prototype.hasOwnProperty.call(creatureProperties, "descriptionEntries")
  );
  if (!hasExactSource) return !hasEntryTargets;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const localizedStrings = readCreatureNameLocalizedStrings(
    sourceMetadata.creatureLocalizedStrings,
  );
  if (
    value.kind !== "creatures"
    || sourceMetadata.type !== "aurora_git"
    || sourceMetadata.sourceKind !== "creature"
    || !isNonNegativeInteger(sourceMetadata.sourceIndex)
    || !localizedStrings
    || !creatureProperties
    || !Object.prototype.hasOwnProperty.call(creatureProperties, "firstName")
    || !Object.prototype.hasOwnProperty.call(creatureProperties, "lastName")
    || typeof creatureProperties.firstName !== "string"
    || typeof creatureProperties.lastName !== "string"
    || (localizedStrings.description !== undefined
      && (!Object.prototype.hasOwnProperty.call(creatureProperties, "description")
        || typeof creatureProperties.description !== "string"))
  ) {
    return false;
  }

  if (!isCreatureLocalizedStringFieldState(
    localizedStrings.firstName,
    creatureProperties,
    "firstName",
    "firstNameEntries",
    MAX_CREATURE_FIRST_NAME_ASCII_BYTES,
  ) || !isCreatureLocalizedStringFieldState(
    localizedStrings.lastName,
    creatureProperties,
    "lastName",
    "lastNameEntries",
    MAX_CREATURE_LAST_NAME_ASCII_BYTES,
  )) return false;
  if (localizedStrings.description === undefined) {
    return !Object.prototype.hasOwnProperty.call(creatureProperties, "descriptionEntries");
  }
  return isCreatureLocalizedStringFieldState(
    localizedStrings.description,
    creatureProperties,
    "description",
    "descriptionEntries",
    MAX_CREATURE_DESCRIPTION_ASCII_BYTES,
  );
}

function isCreatureInventoryState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureInventoryItems");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  if (
    value.kind !== "creatures"
    || !canEditExistingCreatureInventory(sourceMetadata)
    || !creatureProperties
    || !Object.prototype.hasOwnProperty.call(creatureProperties, "inventoryItems")
    || !sourceMetadata.creatureInventoryItems
  ) {
    return false;
  }

  return readCreatureInventoryTargetEntries(
    creatureProperties.inventoryItems,
    sourceMetadata.creatureInventoryItems,
  ) !== undefined;
}

function isCreatureEquipmentState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasExactSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "creatureEquippedItems");
  if (!hasExactSource) return true;

  const sourceMetadata = source as unknown as SceneObjectSourceMetadata;
  const creatureProperties = isRecord(value.creatureProperties)
    ? value.creatureProperties
    : undefined;
  if (
    value.kind !== "creatures"
    || !canEditExistingCreatureEquipment(sourceMetadata)
    || !creatureProperties
    || !Object.prototype.hasOwnProperty.call(creatureProperties, "equippedItems")
    || !sourceMetadata.creatureEquippedItems
  ) {
    return false;
  }

  return readCreatureEquipmentTargetEntries(
    creatureProperties.equippedItems,
    sourceMetadata.creatureEquippedItems,
  ) !== undefined;
}

function isSoundIntervalVariationState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined && Object.prototype.hasOwnProperty.call(
    source,
    "soundIntervalVariationStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundIntervalVariation");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "sounds"
    || !hasSource
    || source?.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readAreaSoundIntervalVariationStorage(source.soundIntervalVariationStorage)
  ) {
    return false;
  }
  return !hasTarget || readAreaSoundIntervalVariationStorage(value.soundIntervalVariation) !== null;
}

function isSoundVolumeState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundVolumeStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundVolume");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "sounds"
    || !hasSource
    || source?.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readAreaSoundVolumeStorage(source.soundVolumeStorage)
  ) {
    return false;
  }
  return !hasTarget || readAreaSoundVolumeStorage(value.soundVolume) !== null;
}

function isSoundActiveState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundActiveStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundActive");
  if (!hasSource && !hasTarget) return true;
  if (
    !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !Number.isSafeInteger(source.sourceIndex)
    || Number(source.sourceIndex) < 0
    || !readAreaSoundActiveStorage(source.soundActiveStorage)
  ) {
    return false;
  }
  return !hasTarget || readAreaSoundActiveStorage(value.soundActive) !== null;
}

function isSoundPlayOrderState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundPlayOrderStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayOrder");
  if (!hasSource && !hasTarget) return true;
  if (
    !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !Number.isSafeInteger(source.sourceIndex)
    || Number(source.sourceIndex) < 0
    || !readAreaSoundPlayOrderStorage(source.soundPlayOrderStorage)
  ) {
    return false;
  }
  return !hasTarget || readAreaSoundPlayOrderStorage(value.soundPlayOrder) !== null;
}

function isSoundPlayStyleState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundPlayStyleStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayStyle");
  if (!hasSource && !hasTarget) return true;
  const sourceStorage = source
    ? readAreaSoundPlayStyleStorage(source.soundPlayStyleStorage)
    : null;
  if (
    value.kind !== "sounds"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !Number.isSafeInteger(source.sourceIndex)
    || Number(source.sourceIndex) < 0
    || !sourceStorage
  ) {
    return false;
  }
  if (!hasTarget) return true;
  const targetStorage = readAreaSoundPlayStyleStorage(value.soundPlayStyle);
  if (targetStorage === null) return false;
  const playbackSource = source
    ? readAreaSoundPlaybackStorage(source.soundPlaybackStorage)
    : null;
  return playbackSource
    ? areaSoundPlayStyleStoragesEqual(sourceStorage, targetStorage)
    : soundPlayStyleDependenciesEqual(sourceStorage, targetStorage);
}

function soundPlayStyleDependenciesEqual(
  source: NonNullable<ReturnType<typeof readAreaSoundPlayStyleStorage>>,
  target: NonNullable<ReturnType<typeof readAreaSoundPlayStyleStorage>>,
): boolean {
  if (areaSoundPlayStyleStoragesEqual(source, target)) return true;
  return source.positionalByte === target.positionalByte
    && source.soundsCount === target.soundsCount
    && source.intervalDword === target.intervalDword
    && source.intervalVariationDword === target.intervalVariationDword;
}

function isSoundPlaybackState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundPlaybackStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayback");
  if (!hasSource && !hasTarget) return true;
  const sourceStorage = source
    ? readAreaSoundPlaybackStorage(source.soundPlaybackStorage)
    : null;
  if (
    value.kind !== "sounds"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !Number.isSafeInteger(source.sourceIndex)
    || Number(source.sourceIndex) < 0
    || !sourceStorage
  ) {
    return false;
  }
  if (!hasTarget) return true;
  const targetStorage = readAreaSoundPlaybackStorage(value.soundPlayback);
  if (!targetStorage) return false;
  const profileSource = source
    ? readAreaSoundProfileStorage(source.soundProfileStorage)
    : null;
  if (profileSource) return areaSoundPlaybackStoragesEqual(sourceStorage, targetStorage);
  if (areaSoundPlaybackStoragesEqual(sourceStorage, targetStorage)) return true;
  return sourceStorage.positionalByte === targetStorage.positionalByte
    && sourceStorage.intervalDword === targetStorage.intervalDword
    && sourceStorage.intervalVariationDword === targetStorage.intervalVariationDword;
}

function isSoundProfileState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundProfileStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundProfile");
  if (!hasSource && !hasTarget) return true;
  const sourceStorage = source
    ? readAreaSoundProfileStorage(source.soundProfileStorage)
    : null;
  if (
    value.kind !== "sounds"
    || !source
    || source.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !Number.isSafeInteger(source.sourceIndex)
    || Number(source.sourceIndex) < 0
    || !sourceStorage
  ) return false;
  if (!hasTarget) return true;
  const targetStorage = readAreaSoundProfileStorage(value.soundProfile);
  if (!targetStorage) return false;
  if (areaSoundProfileStoragesEqual(sourceStorage, targetStorage)) return true;
  return sourceStorage.intervalDword === targetStorage.intervalDword
    && sourceStorage.intervalVariationDword === targetStorage.intervalVariationDword;
}

function isSoundScheduleState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined
    && Object.prototype.hasOwnProperty.call(source, "soundScheduleStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundSchedule");
  if (!hasSource && !hasTarget) return true;
  if (
    value.kind !== "sounds"
    || !hasSource
    || source?.type !== "aurora_git"
    || source.sourceKind !== "sound"
    || !isNonNegativeInteger(source.sourceIndex)
    || !readAreaSoundScheduleStorage(source.soundScheduleStorage)
  ) {
    return false;
  }
  return !hasTarget || readAreaSoundScheduleStorage(value.soundSchedule) !== null;
}

function isPolygonGeometryState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "polygonGeometry");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "polygonGeometry");
  if (!hasSource && !hasTarget) return true;
  const expectedSourceKind = value.kind === "triggers"
    ? "trigger"
    : value.kind === "encounters"
      ? "encounter"
      : undefined;
  if (!expectedSourceKind) return false;
  if (
    !hasSource
    || source?.type !== "aurora_git"
    || source.sourceKind !== expectedSourceKind
    || !isNonNegativeInteger(source.sourceIndex)
    || !isAreaObjectPolygonGeometry(source.polygonGeometry)
  ) {
    return false;
  }
  return !hasTarget || isAreaObjectPolygonGeometry(value.polygonGeometry);
}

function isDoorTransitionStorageState(value: Record<string, unknown>): boolean {
  const source = isRecord(value.source) ? value.source : undefined;
  const transition = isRecord(value.doorTransition) ? value.doorTransition : undefined;
  const hasSource = source !== undefined &&
    Object.prototype.hasOwnProperty.call(source, "doorTransitionStorage");
  const hasTarget = transition !== undefined &&
    Object.prototype.hasOwnProperty.call(transition, "storage");
  if (!hasSource && !hasTarget) return true;
  if (value.kind !== "doors") return false;
  if (!hasSource || source?.type !== "aurora_git" || source.sourceKind !== "door" ||
      !isNonNegativeInteger(source.sourceIndex) ||
      !isAreaDoorTransitionStorage(source.doorTransitionStorage)) {
    return false;
  }
  return !hasTarget || isAreaDoorTransitionStorage(transition?.storage);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function isNonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}
function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}
function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isSafeInteger(value) && Number(value) >= minimum && Number(value) <= maximum;
}
function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}
