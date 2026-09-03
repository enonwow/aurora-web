import type { AreaDraftSnapshot } from "./area-draft.types";
import {
  isAreaCommentsValue,
  type ExistingAreaCommentsMutation,
} from "./area-comments";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  type ExistingAreaEventScriptMutations,
} from "./area-event-scripts";
import {
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  areaNameStorageProfileForEntries,
  isAreaNameStorageProfile,
  isEditableAreaName,
  isEditableAreaTag,
  readEditableAreaNameEntries,
  type EditableAreaNameStorageEntry,
  type ExistingAreaBasicIdentityMutations,
} from "./area-basic-identity";
import {
  isAreaAdvancedFlags,
  terrainTypeFlagsEqual,
  type AreaAdvancedFlags,
  type ExistingAreaAdvancedFlagMutations,
} from "./area-advanced-flags";
import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";
import { AREA_CREATURE_CONSTRUCTION_PROFILE } from "./area-creature-construction-profile";
import {
  AREA_ITEM_CONSTRUCTION_PROFILE,
  AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE,
} from "./area-item-construction-profile";
import {
  AREA_PLACEABLE_CONSTRUCTION_PROFILE,
  AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE,
} from "./area-placeable-construction-profile";
import { AREA_SOUND_CONSTRUCTION_PROFILE } from "./area-sound-construction-profile";
import {
  AREA_STORE_CONSTRUCTION_PROFILE,
  AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE,
} from "./area-store-construction-profile";
import { AREA_TRIGGER_CONSTRUCTION_PROFILE } from "./area-trigger-construction-profile";
import {
  AREA_WAYPOINT_CONSTRUCTION_PROFILE,
  AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE,
} from "./area-waypoint-construction-profile";
import {
  AREA_ENCOUNTER_CONSTRUCTION_PROFILE,
  AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE,
} from "./area-encounter-construction-profile";
import { AREA_DOOR_CONSTRUCTION_PROFILE } from "./area-door-construction-profile";
import {
  AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS,
  type ExistingAreaPlaceableScriptField,
} from "./area-placeable-script-fields";
import {
  AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS,
  type ExistingAreaPlaceableTrapScriptField,
} from "./area-placeable-trap-script-fields";
import {
  AREA_PLACEABLE_LOCK_FIELD_MAPPINGS,
  type ExistingAreaPlaceableLockField,
  type ExistingAreaPlaceableLockValue,
} from "./area-placeable-lock-fields";
import { isAreaPlaceableKeyName } from "./area-placeable-key-name";
import {
  AreaCreatureInventoryValidationError,
  areaCreatureInventoryEntriesEqual,
  parseAreaCreatureInventorySourceEntries,
  parseAreaCreatureInventoryTargetEntries,
  type AreaCreatureInventoryMutation,
} from "./area-creature-inventory";
import {
  AreaCreatureEquipmentValidationError,
  areaCreatureEquipmentEntriesEqual,
  parseAreaCreatureEquipmentSourceEntries,
  parseAreaCreatureEquipmentTargetEntries,
  type AreaCreatureEquipmentMutation,
} from "./area-creature-equipment";
import {
  AreaItemInventoryValidationError,
  areaItemInventoryEntriesEqual,
  parseAreaItemInventorySourceEntries,
  parseAreaItemInventoryTargetEntries,
  type AreaItemInventoryMutation,
} from "./area-item-inventory";
import {
  AreaItemVisualTransformValidationError,
  areaItemVisualTransformStorageEqual,
  parseAreaItemVisualTransformStorage,
  type AreaItemVisualTransformMutation,
} from "./area-item-visual-transform";
import {
  isEditableAreaCreatureTag,
  readExistingAreaCreatureTagMutation,
  readExistingAreaCreatureTagStorage,
  type ExistingAreaCreatureTagMutation,
} from "./area-creature-tag";
import {
  isAreaCreatureConversationTarget,
  readExistingAreaCreatureConversationMutation,
  readExistingAreaCreatureConversationStorage,
  type ExistingAreaCreatureConversationMutation,
} from "./area-creature-conversation";
import {
  readAreaCreatureInterruptableStorage,
  readExistingAreaCreatureInterruptableMutation,
  type ExistingAreaCreatureInterruptableMutation,
} from "./area-creature-interruptable";
import {
  AREA_CREATURE_ADVANCED_FLAG_FIELDS,
  readAreaCreatureAdvancedFlagsStorage,
  readExistingAreaCreatureAdvancedFlagMutations,
  type AreaCreatureAdvancedFlagKey,
  type ExistingAreaCreatureAdvancedFlagMutations,
} from "./area-creature-advanced-flags";
import {
  AREA_CREATURE_DECAY_MAX_SECONDS,
  AREA_CREATURE_DECAY_MIN_SECONDS,
  AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND,
  readExistingAreaCreatureBodyBagMutation,
  readExistingAreaCreatureBodyBagProvenance,
  readExistingAreaCreatureDecayTimeMutation,
  readExistingAreaCreatureDecayTimeProvenance,
  type ExistingAreaCreatureBodyBagMutation,
  type ExistingAreaCreatureDecayTimeMutation,
} from "./area-creature-death-remains";
import {
  readAreaCreatureAppearanceStorage,
  readExistingAreaCreatureAppearanceMutation,
  type ExistingAreaCreatureAppearanceMutation,
} from "./area-creature-appearance";
import {
  readAreaCreatureGenderStorage,
  readExistingAreaCreatureGenderMutation,
  type ExistingAreaCreatureGenderMutation,
} from "./area-creature-gender";
import {
  readAreaCreaturePerceptionRangeStorage,
  readExistingAreaCreaturePerceptionRangeMutation,
  type ExistingAreaCreaturePerceptionRangeMutation,
} from "./area-creature-perception-range";
import {
  readAreaCreatureWalkRateStorage,
  readExistingAreaCreatureWalkRateMutation,
  type ExistingAreaCreatureWalkRateMutation,
} from "./area-creature-walk-rate";
import {
  readAreaCreatureSoundSetFileStorage,
  readExistingAreaCreatureSoundSetFileMutation,
  type ExistingAreaCreatureSoundSetFileMutation,
} from "./area-creature-sound-set-file";
import {
  readAreaCreatureStartingPackageStorage,
  readExistingAreaCreatureStartingPackageMutation,
  type ExistingAreaCreatureStartingPackageMutation,
} from "./area-creature-starting-package";
import {
  readAreaCreatureSkillListStorage,
  readExistingAreaCreatureSkillListMutation,
  type ExistingAreaCreatureSkillListMutation,
} from "./area-creature-skill-list";
import {
  readAreaCreatureFeatListStorage,
  readExistingAreaCreatureFeatListMutation,
  type ExistingAreaCreatureFeatListMutation,
} from "./area-creature-feat-list";
import {
  groupCanonicalCreatureSpecialAbilityEntries,
  readAreaCreatureSpecialAbilityListStorage,
  readExistingAreaCreatureSpecialAbilityListMutation,
  type ExistingAreaCreatureSpecialAbilityListMutation,
} from "./area-creature-special-ability-list";
import {
  readAreaCreatureClassLevelState,
  readExistingAreaCreatureClassLevelMutation,
  type ExistingAreaCreatureClassLevelMutation,
} from "./area-creature-class-levels";
import {
  readAreaCreatureClassIdentityState,
  readExistingAreaCreatureClassIdentityMutation,
  type ExistingAreaCreatureClassIdentityMutation,
} from "./area-creature-class-identity";
import {
  readExistingAreaCreatureClassSlotResizeMutation,
  type ExistingAreaCreatureClassSlotResizeMutation,
} from "./area-creature-class-slot-resize";
import {
  readAreaCreaturePhenotypeStorage,
  readExistingAreaCreaturePhenotypeMutation,
  type ExistingAreaCreaturePhenotypeMutation,
} from "./area-creature-phenotype";
import {
  readAreaCreaturePortraitStorage,
  readExistingAreaCreaturePortraitMutation,
  type ExistingAreaCreaturePortraitMutation,
} from "./area-creature-portrait";
import {
  normalizeAreaCreatureChallengeRating,
  readAreaCreatureChallengeRatingStorage,
  readExistingAreaCreatureChallengeRatingMutation,
  type ExistingAreaCreatureChallengeRatingMutation,
} from "./area-creature-challenge-rating";
import {
  AREA_CREATURE_ABILITY_SCORE_FIELDS,
  isAreaCreatureAbilityScore,
  readAreaCreatureAbilityScoresStorage,
  readExistingAreaCreatureAbilityScoreMutations,
  type ExistingAreaCreatureAbilityScoreMutations,
} from "./area-creature-ability-scores";
import {
  AREA_CREATURE_APPEARANCE_COLOR_FIELDS,
  isAreaCreatureAppearanceColor,
  readAreaCreatureAppearanceColorsStorage,
  readExistingAreaCreatureAppearanceColorMutations,
  type ExistingAreaCreatureAppearanceColorMutations,
} from "./area-creature-appearance-colors";
import {
  AREA_CREATURE_BODY_PART_FIELDS,
  maximumAreaCreatureBodyPartTarget,
  readAreaCreatureBodyPartsStorage,
  readExistingAreaCreatureBodyPartMutations,
  type ExistingAreaCreatureBodyPartMutations,
} from "./area-creature-body-parts";
import {
  AREA_CREATURE_APPENDAGE_FIELDS,
  readAreaCreatureAppendagesStorage,
  readExistingAreaCreatureAppendageMutations,
  type ExistingAreaCreatureAppendageMutations,
} from "./area-creature-appendages";
import {
  deriveExistingAreaCreatureHitPointTarget,
  readAreaCreatureHitPointState,
  readExistingAreaCreatureHitPointMutation,
  type ExistingAreaCreatureHitPointMutation,
} from "./area-creature-hit-points";
import {
  isAreaCreatureNaturalArmorClass,
  readAreaCreatureNaturalArmorClassStorage,
  readExistingAreaCreatureNaturalArmorClassMutation,
  type ExistingAreaCreatureNaturalArmorClassMutation,
} from "./area-creature-natural-armor-class";
import {
  AREA_CREATURE_SAVING_THROW_BONUS_FIELDS,
  isAreaCreatureSavingThrowBonus,
  readAreaCreatureSavingThrowBonusesStorage,
  readExistingAreaCreatureSavingThrowBonusMutations,
  type ExistingAreaCreatureSavingThrowBonusMutations,
} from "./area-creature-saving-throw-bonuses";
import {
  readAreaCreatureAlignmentStorage,
  readExistingAreaCreatureAlignmentMutation,
  resolveAreaCreatureAlignmentPair,
  type ExistingAreaCreatureAlignmentMutation,
} from "./area-creature-alignment";
import { readAreaCreatureNameLocalizedStrings } from "./area-creature-localized-strings";
import {
  AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS,
  isAreaCreatureNameInlineAsciiText,
  readAreaCreatureNameInlineAsciiStorage,
  readExistingAreaCreatureNameLocalizedStringMutations,
  type ExistingAreaCreatureNameLocalizedStringMutation,
} from "./area-creature-localized-string-mutation";
import {
  AreaPlaceableInventoryValidationError,
  areaPlaceableInventoryEntriesEqual,
  parseAreaPlaceableInventorySourceEntries,
  parseAreaPlaceableInventoryTargetEntries,
  type AreaPlaceableInventoryMutation,
} from "./area-placeable-inventory";
import {
  AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS,
  type ExistingAreaPlaceableBasicByteMutation,
} from "./area-placeable-basic-byte-fields";
import {
  readExistingAreaPlaceableAppearanceMutation,
  type ExistingAreaPlaceableAppearanceMutation,
} from "./area-placeable-appearance";
import {
  isAreaPlaceableConversation,
  isAreaPlaceableInterruptableValue,
  type ExistingAreaPlaceableConversationMutation,
  type ExistingAreaPlaceableInterruptableMutation,
} from "./area-placeable-conversation-interruptable";
import {
  isAreaPlaceableAnimationState,
  type ExistingAreaPlaceableAnimationStateMutation,
} from "./area-placeable-animation-state";
import {
  AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  type ExistingAreaPlaceableTrapByteMutation,
} from "./area-placeable-trap-byte-fields";
import {
  isAreaPlaceableEditorComment,
  type ExistingAreaPlaceableEditorCommentMutation,
} from "./area-placeable-editor-comment";
import {
  isAreaCreatureEditorComment,
  type ExistingAreaCreatureEditorCommentMutation,
} from "./area-creature-editor-comment";
import {
  isAreaItemEditorComment,
  type ExistingAreaItemEditorCommentMutation,
} from "./area-item-editor-comment";
import {
  isAreaStoreEditorComment,
  type ExistingAreaStoreEditorCommentMutation,
} from "./area-store-editor-comment";
import {
  isAreaEncounterEditorComment,
  type ExistingAreaEncounterEditorCommentMutation,
} from "./area-encounter-editor-comment";
import {
  isAreaWaypointEditorComment,
  type ExistingAreaWaypointEditorCommentMutation,
} from "./area-waypoint-editor-comment";
import {
  areaEncounterVariableEntriesEqual,
  parseAreaEncounterVariableProvenance,
  parseAreaEncounterVariableTargetEntries,
  type ExistingAreaEncounterVariableMutation,
} from "./area-encounter-variable-table";
import {
  areaWaypointVariableEntriesEqual,
  parseAreaWaypointVariableProvenance,
  parseAreaWaypointVariableTargetEntries,
  type ExistingAreaWaypointVariableMutation,
} from "./area-waypoint-variable-table";
import {
  projectAreaEncounterCreatureListMutation,
  type ExistingAreaEncounterCreatureListMutation,
} from "./area-encounter-creature-single-spawn";
import {
  projectAreaEncounterSpawnPointListMutation,
  type ExistingAreaEncounterSpawnPointListMutation,
} from "./area-encounter-spawn-point-list";
import {
  areaStoreCommerceValueEqual,
  readAreaStoreCommerceMutation,
  readAreaStoreCommerceValue,
  type ExistingAreaStoreCommerceMutation,
} from "./area-store-commerce";
import {
  areaStoreScriptResRefsValueEqual,
  readAreaStoreScriptResRefsMutation,
  readAreaStoreScriptResRefsTargetValue,
  readAreaStoreScriptResRefsValue,
  type ExistingAreaStoreScriptResRefsMutation,
} from "./area-store-script-resrefs";
import {
  areaStoreVariableEntriesEqual,
  parseAreaStoreVariableProvenance,
  parseAreaStoreVariableTargetEntries,
  type ExistingAreaStoreVariableMutation,
} from "./area-store-variable-table";
import {
  areaStoreRestrictionTargetsEqual,
  readAreaStoreRestrictionsTarget,
  readExistingAreaStoreRestrictionsMutation,
  readExistingAreaStoreRestrictionsProvenance,
  type ExistingAreaStoreRestrictionsMutation,
} from "./area-store-restrictions";
import {
  areaStoreInventoryExpectedTargetBuckets,
  areaStoreInventoryTargetBucketsEqual,
  readAreaStoreInventoryTargetBuckets,
  readExistingAreaStoreInventoryMutation,
  readExistingAreaStoreInventoryProvenance,
  type ExistingAreaStoreInventoryMutation,
} from "./area-store-inventory";
import { isExactEffectiveItemBaseItemsTwoDaTable } from
  "../../catalog/domain/effective-item-base-items-two-da";
import {
  isEditableAreaItemTag,
  readExistingAreaItemTagMutation,
  readExistingAreaItemTagStorage,
  type ExistingAreaItemTagMutation,
} from "./area-item-tag";
import {
  isEditableAreaTriggerTag,
  readExistingAreaTriggerTagMutation,
  readExistingAreaTriggerTagStorage,
  type ExistingAreaTriggerTagMutation,
} from "./area-trigger-tag";
import {
  isAreaTriggerTemplateResRef,
  readAreaTriggerTemplateResRefStorage,
  readExistingAreaTriggerTemplateResRefMutation,
  type ExistingAreaTriggerTemplateResRefMutation,
} from "./area-trigger-template-resref";
import {
  isAreaTriggerLocalizedNameInlineAsciiText,
  readAreaTriggerLocalizedNameInlineAsciiStorage,
  readAreaTriggerLocalizedNameStorage,
  readExistingAreaTriggerLocalizedNameMutation,
  type ExistingAreaTriggerLocalizedNameMutation,
} from "./area-trigger-localized-name";
import {
  isAreaTriggerEditorComment,
  type ExistingAreaTriggerEditorCommentMutation,
} from "./area-trigger-editor-comment";
import {
  areaTriggerScriptResRefsStoragesEqual,
  readAreaTriggerScriptResRefsStorage,
  readAreaTriggerScriptResRefsTargetStorage,
  readExistingAreaTriggerScriptResRefsMutation,
  type ExistingAreaTriggerScriptResRefsMutation,
} from "./area-trigger-script-resrefs";
import {
  areaTriggerTransitionStorageEqual,
  isAreaTriggerTransitionStorage,
  readExistingAreaTriggerTransitionStorageMutation,
  type ExistingAreaTriggerTransitionStorageMutation,
} from "./area-trigger-transition-storage";
import {
  isEditableAreaEncounterTag,
  readExistingAreaEncounterTagMutation,
  readExistingAreaEncounterTagStorage,
  type ExistingAreaEncounterTagMutation,
} from "./area-encounter-tag";
import {
  isAreaEncounterTemplateResRef,
  readAreaEncounterTemplateResRefStorage,
  readExistingAreaEncounterTemplateResRefMutation,
  type ExistingAreaEncounterTemplateResRefMutation,
} from "./area-encounter-template-resref";
import {
  isEditableAreaWaypointTag,
  readExistingAreaWaypointTagMutation,
  readExistingAreaWaypointTagStorage,
  type ExistingAreaWaypointTagMutation,
} from "./area-waypoint-tag";
import {
  isAreaWaypointTemplateResRef,
  readAreaWaypointTemplateResRefStorage,
  readExistingAreaWaypointTemplateResRefMutation,
  type ExistingAreaWaypointTemplateResRefMutation,
} from "./area-waypoint-template-resref";
import {
  isAreaWaypointLocalizedNameInlineAsciiText,
  readAreaWaypointLocalizedNameInlineAsciiStorage,
  readAreaWaypointLocalizedNameStorage,
  readExistingAreaWaypointLocalizedNameMutation,
  type ExistingAreaWaypointLocalizedNameMutation,
} from "./area-waypoint-localized-name";
import {
  isAreaWaypointDescriptionInlineAsciiText,
  readAreaWaypointDescriptionInlineAsciiStorage,
  readAreaWaypointDescriptionStorage,
  readExistingAreaWaypointDescriptionMutation,
  type ExistingAreaWaypointDescriptionMutation,
} from "./area-waypoint-description";
import {
  mapNoteValuesEqual,
  readAreaWaypointMapNoteInlineAsciiValue,
  readAreaWaypointMapNoteStorage,
  readAreaWaypointMapNoteValue,
  readExistingAreaWaypointMapNoteMutation,
  type ExistingAreaWaypointMapNoteMutation,
} from "./area-waypoint-map-note";
import {
  parseAreaWaypointAppearanceMutation,
  parseAreaWaypointAppearanceProvenance,
  type ExistingAreaWaypointAppearanceMutation,
} from "./area-waypoint-appearance";
import {
  areaEncounterActiveStoragesEqual,
  readAreaEncounterActiveStorage,
  readExistingAreaEncounterActiveMutation,
  type ExistingAreaEncounterActiveMutation,
} from "./area-encounter-active";
import {
  areaEncounterPlayerOnlyStoragesEqual,
  readAreaEncounterPlayerOnlyStorage,
  readExistingAreaEncounterPlayerOnlyMutation,
  type ExistingAreaEncounterPlayerOnlyMutation,
} from "./area-encounter-player-only";
import {
  areaEncounterResetStoragesEqual,
  readAreaEncounterResetStorage,
  readExistingAreaEncounterResetMutation,
  type ExistingAreaEncounterResetMutation,
} from "./area-encounter-reset";
import {
  areaEncounterResetTimeStoragesEqual,
  readAreaEncounterResetTimeStorage,
  readExistingAreaEncounterResetTimeMutation,
  type ExistingAreaEncounterResetTimeMutation,
} from "./area-encounter-reset-time";
import {
  areaEncounterSpawnOptionStoragesEqual,
  readAreaEncounterSpawnOptionStorage,
  readExistingAreaEncounterSpawnOptionMutation,
  type ExistingAreaEncounterSpawnOptionMutation,
} from "./area-encounter-spawn-option";
import {
  areaEncounterRespawnsStoragesEqual,
  readAreaEncounterRespawnsStorage,
  readExistingAreaEncounterRespawnsMutation,
  type ExistingAreaEncounterRespawnsMutation,
} from "./area-encounter-respawns";
import {
  areaEncounterCreatureCountStoragesEqual,
  readAreaEncounterCreatureCountStorage,
  readExistingAreaEncounterCreatureCountMutation,
  type ExistingAreaEncounterCreatureCountMutation,
} from "./area-encounter-creature-counts";
import {
  areaEncounterScriptResRefsStoragesEqual,
  readAreaEncounterScriptResRefsStorage,
  readAreaEncounterScriptResRefsTargetStorage,
  readExistingAreaEncounterScriptResRefsMutation,
  type ExistingAreaEncounterScriptResRefsMutation,
} from "./area-encounter-script-resrefs";
import {
  readExistingAreaEncounterFactionMutation,
  readExistingAreaEncounterFactionProvenance,
  type ExistingAreaEncounterFactionMutation,
} from "./area-encounter-faction";
import {
  readExistingAreaEncounterDifficultyMutation,
  readExistingAreaEncounterDifficultyProvenance,
  type ExistingAreaEncounterDifficultyMutation,
} from "./area-encounter-difficulty";
import {
  isAreaEncounterLocalizedNameInlineAsciiText,
  readAreaEncounterLocalizedNameInlineAsciiStorage,
  readAreaEncounterLocalizedNameStorage,
  readExistingAreaEncounterLocalizedNameMutation,
  type ExistingAreaEncounterLocalizedNameMutation,
} from "./area-encounter-localized-name";
import {
  isAreaItemTemplateResRef,
  readAreaItemTemplateResRefStorage,
  readExistingAreaItemTemplateResRefMutation,
  type ExistingAreaItemTemplateResRefMutation,
} from "./area-item-template-resref";
import {
  areaItemInstanceStateValueEqual,
  cloneAreaItemInstanceStateStorage,
  cloneAreaItemInstanceStateValue,
  readAreaItemInstanceStateStorage,
  readAreaItemInstanceStateValue,
  type ExistingAreaItemInstanceStateMutation,
} from "./area-item-instance-state";
import { readAreaItemLocalizedStrings } from "./area-item-localized-strings";
import {
  AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS,
  isAreaItemInlineAsciiText,
  readAreaItemInlineAsciiStorage,
  readExistingAreaItemLocalizedStringMutations,
  type ExistingAreaItemLocalizedStringMutation,
} from "./area-item-localized-string-mutation";
import {
  readExistingAreaPlaceableTrapTypeMutation,
  readExistingAreaPlaceableTrapTypeProvenance,
  type ExistingAreaPlaceableTrapTypeMutation,
} from "./area-placeable-trap-type";
import {
  readExistingAreaPlaceableBodyBagMutation,
  readExistingAreaPlaceableBodyBagProvenance,
  type ExistingAreaPlaceableBodyBagMutation,
} from "./area-placeable-body-bag";
import {
  readExistingAreaPlaceablePortraitMutation,
  readExistingAreaPlaceablePortraitProvenance,
  type ExistingAreaPlaceablePortraitMutation,
} from "./area-placeable-portrait-id";
import {
  readExistingAreaPlaceableFactionMutation,
  readExistingAreaPlaceableFactionProvenance,
  type ExistingAreaPlaceableFactionMutation,
} from "./area-placeable-faction";
import {
  readExistingAreaCreatureFactionMutation,
  readExistingAreaCreatureFactionProvenance,
  type ExistingAreaCreatureFactionMutation,
} from "./area-creature-faction";
import {
  isAreaCreatureTemplateResRef,
  readExistingAreaCreatureTemplateResRefMutation,
  type ExistingAreaCreatureTemplateResRefMutation,
} from "./area-creature-template-resref";
import {
  isAreaCreatureSpecialIdentityString,
  readExistingAreaCreatureSpecialIdentityStringsMutation,
  type ExistingAreaCreatureSpecialIdentityStringsMutation,
} from "./area-creature-special-identity-strings";
import {
  AREA_CREATURE_SCRIPT_RESREF_FIELDS,
  isAreaCreatureScriptSourceResRef,
  isAreaCreatureScriptTargetResRef,
  readExistingAreaCreatureScriptResRefMutations,
  type AreaCreatureScriptResRefKey,
  type ExistingAreaCreatureScriptResRefMutation,
} from "./area-creature-script-resrefs";
import {
  areaPlaceableVariableEntriesEqual,
  parseAreaPlaceableVariableProvenance,
  parseAreaPlaceableVariableTargetEntries,
  type ExistingAreaPlaceableVariableMutation,
} from "./area-placeable-variable-table";
import {
  areaCreatureVariableEntriesEqual,
  parseAreaCreatureVariableProvenance,
  parseAreaCreatureVariableTargetEntries,
  type ExistingAreaCreatureVariableMutation,
} from "./area-creature-variable-table";
import {
  areaItemVariableEntriesEqual,
  parseAreaItemVariableProvenance,
  parseAreaItemVariableTargetEntries,
  type ExistingAreaItemVariableMutation,
} from "./area-item-variable-table";
import {
  areaItemPropertyListEntriesEqual,
  parseAreaItemPropertyListMutation,
  parseAreaItemPropertyListProvenance,
  parseAreaItemPropertyListTargetEntries,
  type ExistingAreaItemPropertyListMutation,
} from "./area-item-property-list";
import {
  readAreaItemBaseAppearanceValue,
  readExistingAreaItemBaseAppearanceMutation,
  readExistingAreaItemBaseAppearanceProvenance,
  type ExistingAreaItemBaseAppearanceMutation,
} from "./area-item-base-appearance";
import {
  isAreaPlaceableTemplateResRef,
  type ExistingAreaPlaceableTemplateResRefMutation,
} from "./area-placeable-template-resref";
import {
  deriveAreaPlaceableCurrentHitPoints,
  isAuroraShort,
  isEditableAreaPlaceableHitPoints,
  readExistingAreaPlaceableHitPointMutation,
  type ExistingAreaPlaceableHitPointMutation,
} from "./area-placeable-hit-points";
import {
  isEditableAreaPlaceableTag,
  readExistingAreaPlaceableTagMutation,
  type ExistingAreaPlaceableTagMutation,
} from "./area-placeable-tag";
import {
  AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS,
  isAreaPlaceableInlineAsciiText,
  readAreaPlaceableInlineAsciiStorage,
  readExistingAreaPlaceableLocalizedStringMutations,
  type ExistingAreaPlaceableLocalizedStringMutation,
} from "./area-placeable-localized-string-mutation";
import {
  areaDoorTransitionStorageEqual,
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
  type ExistingAreaDoorTransitionStorageMutation,
} from "./area-door-transition-storage";
import {
  areaModuleStartLocationsEqual,
  isAreaModuleStartLocation,
  normalizeAreaModuleStartLocation,
  type ExistingAreaModuleStartLocationMutation,
} from "./area-module-start-location";
import {
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
  type ExistingAreaAudioEnvironmentMutation,
} from "./area-audio-environment";
import {
  areaVisualEnvironmentsEqual,
  isAreaVisualEnvironment,
  type ExistingAreaVisualEnvironmentMutation,
} from "./area-visual-environment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  isAreaVisualEnvironmentScalarControls,
  type ExistingAreaVisualEnvironmentScalarControlsMutation,
} from "./area-visual-environment-scalar-controls";
import {
  areaVisualEnvironmentCatalogSelectionsEqual,
  isAreaVisualEnvironmentCatalogSelection,
} from "./area-visual-environment-catalog-selection";
import type { ExistingAreaVisualEnvironmentCatalogSelectionMutation } from "./area-visual-environment-catalog-selection-mutation";
import { isExactEffectiveAreaVisualEnvironmentCatalogBundle } from "../../catalog/domain/effective-area-visual-environment-two-da";
import {
  AuroraVariableTableValidationError,
  auroraVariableEntriesEqual,
  parseAuroraVariableProvenance,
  parseAuroraVariableTargetEntries,
} from "./aurora-variable-table";
import type { ExistingAreaVariableMutation } from "./area-variable-table";
import {
  MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE,
  areaObjectPolygonGeometriesEqual,
  readAreaObjectPolygonGeometry,
  readExistingAreaObjectPolygonMutation,
  type ExistingAreaObjectPolygonMutation,
} from "./area-object-polygon-geometry";
import {
  MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE,
  areaSoundIntervalVariationStoragesEqual,
  readAreaSoundIntervalVariationStorage,
  readExistingAreaSoundIntervalVariationMutation,
  type ExistingAreaSoundIntervalVariationMutation,
} from "./area-sound-interval-variation-storage";
import {
  areaSoundVolumeStoragesEqual,
  MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE,
  readAreaSoundVolumeStorage,
  readExistingAreaSoundVolumeMutation,
  type ExistingAreaSoundVolumeMutation,
} from "./area-sound-volume-storage";
import {
  areaSoundScheduleStoragesEqual,
  MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE,
  readAreaSoundScheduleStorage,
  readExistingAreaSoundScheduleMutation,
  type ExistingAreaSoundScheduleMutation,
} from "./area-sound-schedule-storage";
import {
  areaSoundActiveStoragesEqual,
  MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE,
  readAreaSoundActiveStorage,
  readExistingAreaSoundActiveMutation,
  type ExistingAreaSoundActiveMutation,
} from "./area-sound-active-storage";
import {
  areaSoundPlayOrderStoragesEqual,
  MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE,
  readAreaSoundPlayOrderStorage,
  readExistingAreaSoundPlayOrderMutation,
  type ExistingAreaSoundPlayOrderMutation,
} from "./area-sound-play-order-storage";
import {
  areaSoundPlayStyleStoragesEqual,
  MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE,
  readAreaSoundPlayStyleStorage,
  readExistingAreaSoundPlayStyleMutation,
  type ExistingAreaSoundPlayStyleMutation,
} from "./area-sound-play-style-storage";
import {
  areaSoundPlaybackStoragesEqual,
  MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE,
  readAreaSoundPlaybackStorage,
  readExistingAreaSoundPlaybackMutation,
  type ExistingAreaSoundPlaybackMutation,
} from "./area-sound-playback-storage";
import {
  areaSoundProfileStoragesEqual,
  MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE,
  readAreaSoundProfileStorage,
  readExistingAreaSoundProfileMutation,
  type ExistingAreaSoundProfileMutation,
} from "./area-sound-profile-storage";

export interface ProjectedAreaUpdateTile {
  readonly row: number;
  readonly col: number;
  readonly sourceRow?: number;
  readonly sourceCol?: number;
  readonly tileId: number;
  readonly orientation: number;
  readonly height: number;
  readonly mainLight1?: number;
  readonly mainLight2?: number;
  readonly sourceLight1?: number;
  readonly sourceLight2?: number;
  readonly animLoop1?: number;
  readonly animLoop2?: number;
  readonly animLoop3?: number;
}

export interface ProjectedAreaUpdateDraft {
  readonly areaResRef: string;
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly tilesetResRef: string;
  readonly tilesetFingerprint: string;
  readonly areaFingerprint: string;
  readonly tiles: readonly ProjectedAreaUpdateTile[];
  readonly comments?: ExistingAreaCommentsMutation;
  readonly eventScripts?: ExistingAreaEventScriptMutations;
  readonly basicIdentity?: ExistingAreaBasicIdentityMutations;
  readonly advancedFlags?: ExistingAreaAdvancedFlagMutations;
  readonly visualEnvironment?: ExistingAreaVisualEnvironmentMutation;
  readonly visualEnvironmentScalarControls?: ExistingAreaVisualEnvironmentScalarControlsMutation;
  readonly visualEnvironmentCatalogSelection?: ExistingAreaVisualEnvironmentCatalogSelectionMutation;
  readonly moduleStartLocation?: ExistingAreaModuleStartLocationMutation;
  readonly audioEnvironment?: ExistingAreaAudioEnvironmentMutation & Readonly<{
    sourceGitSha256: string;
  }>;
  readonly variables?: ExistingAreaVariableMutation;
  readonly objectEditing?: ProjectedAreaObjectEditing;
}

export type ProjectedAreaObjectKind =
  | "creature"
  | "door"
  | "encounter"
  | "item"
  | "placeable"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";

export type ProjectedAreaSceneObjectKind =
  | "creatures"
  | "doors"
  | "encounters"
  | "items"
  | "placeables"
  | "sounds"
  | "stores"
  | "triggers"
  | "waypoints";

export interface ProjectedRetainedAreaObject {
  readonly sourceObjectId: string;
  readonly sourceIndex?: number;
  readonly sourceKind: ProjectedAreaObjectKind;
  readonly sceneKind: ProjectedAreaSceneObjectKind;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ProjectedExistingAreaPlaceablePropertyMutation {
  readonly kind: "placeable";
  readonly sourceObjectId: string;
  readonly sourceIndex?: number;
  readonly tag?: ExistingAreaPlaceableTagMutation;
  readonly expectedOnUsed?: string;
  readonly onUsed?: string;
  readonly expectedStatic?: boolean;
  readonly static?: boolean;
  readonly expectedUseable?: boolean;
  readonly useable?: boolean;
  readonly expectedPlot?: boolean;
  readonly plot?: boolean;
  readonly expectedHasInventory?: boolean;
  readonly hasInventory?: boolean;
  readonly scripts?: readonly ProjectedExistingAreaPlaceableScriptMutation[];
  readonly trapScripts?: readonly ProjectedExistingAreaPlaceableTrapScriptMutation[];
  readonly lockFields?: readonly ProjectedExistingAreaPlaceableLockMutation[];
  readonly keyName?: Readonly<{ expectedValue: string; value: string }>;
  readonly inventory?: AreaPlaceableInventoryMutation;
  readonly basicByteFields?: readonly ExistingAreaPlaceableBasicByteMutation[];
  readonly conversation?: ExistingAreaPlaceableConversationMutation;
  readonly interruptable?: ExistingAreaPlaceableInterruptableMutation;
  readonly animationState?: ExistingAreaPlaceableAnimationStateMutation;
  readonly trapFields?: readonly ExistingAreaPlaceableTrapByteMutation[];
  readonly editorComment?: ExistingAreaPlaceableEditorCommentMutation;
  readonly appearance?: ExistingAreaPlaceableAppearanceMutation;
  readonly trapType?: ExistingAreaPlaceableTrapTypeMutation;
  readonly bodyBag?: ExistingAreaPlaceableBodyBagMutation;
  readonly portrait?: ExistingAreaPlaceablePortraitMutation;
  readonly faction?: ExistingAreaPlaceableFactionMutation;
  readonly variables?: ExistingAreaPlaceableVariableMutation;
  readonly templateResRef?: ExistingAreaPlaceableTemplateResRefMutation;
  readonly hitPoints?: ExistingAreaPlaceableHitPointMutation;
  readonly localizedStrings?: readonly ExistingAreaPlaceableLocalizedStringMutation[];
}

export interface ProjectedExistingAreaCreaturePropertyMutation {
  readonly kind: "creature";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaCreatureTagMutation;
  readonly conversation?: ExistingAreaCreatureConversationMutation;
  readonly interruptable?: ExistingAreaCreatureInterruptableMutation;
  readonly advancedFlags?: ExistingAreaCreatureAdvancedFlagMutations;
  readonly bodyBag?: ExistingAreaCreatureBodyBagMutation;
  readonly decayTime?: ExistingAreaCreatureDecayTimeMutation;
  readonly appearance?: ExistingAreaCreatureAppearanceMutation;
  readonly gender?: ExistingAreaCreatureGenderMutation;
  readonly perceptionRange?: ExistingAreaCreaturePerceptionRangeMutation;
  readonly walkRate?: ExistingAreaCreatureWalkRateMutation;
  readonly soundSetFile?: ExistingAreaCreatureSoundSetFileMutation;
  readonly startingPackage?: ExistingAreaCreatureStartingPackageMutation;
  readonly skillList?: ExistingAreaCreatureSkillListMutation;
  readonly featList?: ExistingAreaCreatureFeatListMutation;
  readonly specialAbilityList?: ExistingAreaCreatureSpecialAbilityListMutation;
  readonly variables?: ExistingAreaCreatureVariableMutation;
  readonly editorComment?: ExistingAreaCreatureEditorCommentMutation;
  readonly classLevels?: ExistingAreaCreatureClassLevelMutation;
  readonly classIdentity?: ExistingAreaCreatureClassIdentityMutation;
  readonly classSlotResize?: ExistingAreaCreatureClassSlotResizeMutation;
  readonly phenotype?: ExistingAreaCreaturePhenotypeMutation;
  readonly portrait?: ExistingAreaCreaturePortraitMutation;
  readonly challengeRating?: ExistingAreaCreatureChallengeRatingMutation;
  readonly abilityScores?: ExistingAreaCreatureAbilityScoreMutations;
  readonly appearanceColors?: ExistingAreaCreatureAppearanceColorMutations;
  readonly bodyParts?: ExistingAreaCreatureBodyPartMutations;
  readonly appendages?: ExistingAreaCreatureAppendageMutations;
  readonly hitPoints?: ExistingAreaCreatureHitPointMutation;
  readonly naturalArmorClass?: ExistingAreaCreatureNaturalArmorClassMutation;
  readonly savingThrowBonuses?: ExistingAreaCreatureSavingThrowBonusMutations;
  readonly alignment?: ExistingAreaCreatureAlignmentMutation;
  readonly faction?: ExistingAreaCreatureFactionMutation;
  readonly templateResRef?: ExistingAreaCreatureTemplateResRefMutation;
  readonly specialIdentityStrings?: ExistingAreaCreatureSpecialIdentityStringsMutation;
  readonly scripts?: readonly ExistingAreaCreatureScriptResRefMutation[];
  readonly localizedStrings?: readonly ExistingAreaCreatureNameLocalizedStringMutation[];
  readonly inventory?: AreaCreatureInventoryMutation;
  readonly equipment?: AreaCreatureEquipmentMutation;
}

export interface ProjectedExistingAreaItemPropertyMutation {
  readonly kind: "item";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaItemTagMutation;
  readonly templateResRef?: ExistingAreaItemTemplateResRefMutation;
  readonly instanceState?: ExistingAreaItemInstanceStateMutation;
  readonly editorComment?: ExistingAreaItemEditorCommentMutation;
  readonly localizedStrings?: readonly ExistingAreaItemLocalizedStringMutation[];
  readonly variables?: ExistingAreaItemVariableMutation;
  readonly propertyList?: ExistingAreaItemPropertyListMutation;
  readonly baseAppearance?: ExistingAreaItemBaseAppearanceMutation;
  readonly inventory?: AreaItemInventoryMutation;
  readonly visualTransform?: AreaItemVisualTransformMutation;
}

export interface ProjectedExistingAreaStorePropertyMutation {
  readonly kind: "store";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly editorComment?: ExistingAreaStoreEditorCommentMutation;
  readonly commerce?: ExistingAreaStoreCommerceMutation;
  readonly scripts?: ExistingAreaStoreScriptResRefsMutation;
  readonly variables?: ExistingAreaStoreVariableMutation;
  readonly restrictions?: ExistingAreaStoreRestrictionsMutation;
  readonly inventory?: ExistingAreaStoreInventoryMutation;
}

export interface ProjectedExistingAreaTriggerPropertyMutation {
  readonly kind: "trigger";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaTriggerTagMutation;
  readonly templateResRef?: ExistingAreaTriggerTemplateResRefMutation;
  readonly localizedName?: ExistingAreaTriggerLocalizedNameMutation;
  readonly editorComment?: ExistingAreaTriggerEditorCommentMutation;
  readonly scripts?: ExistingAreaTriggerScriptResRefsMutation;
  readonly transitionStorage?: ExistingAreaTriggerTransitionStorageMutation;
}

export interface ProjectedExistingAreaWaypointPropertyMutation {
  readonly kind: "waypoint";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaWaypointTagMutation;
  readonly templateResRef?: ExistingAreaWaypointTemplateResRefMutation;
  readonly localizedName?: ExistingAreaWaypointLocalizedNameMutation;
  readonly description?: ExistingAreaWaypointDescriptionMutation;
  readonly mapNote?: ExistingAreaWaypointMapNoteMutation;
  readonly appearance?: ExistingAreaWaypointAppearanceMutation;
  readonly variables?: ExistingAreaWaypointVariableMutation;
  readonly editorComment?: ExistingAreaWaypointEditorCommentMutation;
}

export interface ProjectedExistingAreaEncounterPropertyMutation {
  readonly kind: "encounter";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaEncounterTagMutation;
  readonly templateResRef?: ExistingAreaEncounterTemplateResRefMutation;
  readonly active?: ExistingAreaEncounterActiveMutation;
  readonly playerOnly?: ExistingAreaEncounterPlayerOnlyMutation;
  readonly reset?: ExistingAreaEncounterResetMutation;
  readonly resetTime?: ExistingAreaEncounterResetTimeMutation;
  readonly spawnOption?: ExistingAreaEncounterSpawnOptionMutation;
  readonly respawns?: ExistingAreaEncounterRespawnsMutation;
  readonly creatureCounts?: ExistingAreaEncounterCreatureCountMutation;
  readonly scripts?: ExistingAreaEncounterScriptResRefsMutation;
  readonly faction?: ExistingAreaEncounterFactionMutation;
  readonly difficulty?: ExistingAreaEncounterDifficultyMutation;
  readonly localizedName?: ExistingAreaEncounterLocalizedNameMutation;
  readonly variables?: ExistingAreaEncounterVariableMutation;
  readonly creatureList?: ExistingAreaEncounterCreatureListMutation;
  readonly spawnPoints?: ExistingAreaEncounterSpawnPointListMutation;
  readonly editorComment?: ExistingAreaEncounterEditorCommentMutation;
}

export interface ProjectedExistingAreaPlaceableScriptMutation {
  readonly field: ExistingAreaPlaceableScriptField;
  readonly expectedResRef: string;
  readonly resRef: string;
}

export interface ProjectedExistingAreaPlaceableTrapScriptMutation {
  readonly field: ExistingAreaPlaceableTrapScriptField;
  readonly expectedResRef: string;
  readonly resRef: string;
}

export interface ProjectedExistingAreaPlaceableLockMutation {
  readonly field: ExistingAreaPlaceableLockField;
  readonly expectedValue: ExistingAreaPlaceableLockValue;
  readonly value: ExistingAreaPlaceableLockValue;
}

export type ProjectedExistingAreaPlaceableOnUsedMutation =
  ProjectedExistingAreaPlaceablePropertyMutation;

export type ProjectedExistingAreaObjectPropertyMutation =
  | ProjectedExistingAreaPlaceablePropertyMutation
  | ProjectedExistingAreaCreaturePropertyMutation
  | ProjectedExistingAreaItemPropertyMutation
  | ProjectedExistingAreaStorePropertyMutation
  | ProjectedExistingAreaTriggerPropertyMutation
  | ProjectedExistingAreaWaypointPropertyMutation
  | ProjectedExistingAreaEncounterPropertyMutation;

export interface ProjectedExistingAreaDoorTransitionStorageMutation {
  readonly kind: "door";
  readonly sourceObjectId: string;
  readonly sourceIndex: number;
  readonly transition: ExistingAreaDoorTransitionStorageMutation;
}

export interface ProjectedNewAreaWaypoint {
  readonly localObjectId: string;
  readonly sourceKind: "waypoint";
  readonly sceneKind: "waypoints";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTW ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ProjectedNewAreaCreature {
  readonly localObjectId: string;
  readonly sourceKind: "creature";
  readonly sceneKind: "creatures";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTC ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ProjectedAreaDoorHook {
  readonly profileId: string;
  readonly tilesetResRef: string;
  readonly tilesetSha256: string;
  readonly tileId: number;
  readonly tileOrientation: number;
  readonly tileHeight: number;
  readonly hookIndex: number;
  readonly hookType: number;
  readonly localX: number;
  readonly localY: number;
  readonly localZ: number;
  readonly orientationDegrees: number;
  readonly row: number;
  readonly col: number;
}

export interface ProjectedNewAreaDoor {
  readonly localObjectId: string;
  readonly sourceKind: "door";
  readonly sceneKind: "doors";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTD ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
  readonly doorHook: ProjectedAreaDoorHook;
}

export interface ProjectedNewAreaEncounter {
  readonly localObjectId: string;
  readonly sourceKind: "encounter";
  readonly sceneKind: "encounters";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTE ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: 0;
}

export interface ProjectedNewAreaSound {
  readonly localObjectId: string;
  readonly sourceKind: "sound";
  readonly sceneKind: "sounds";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTS ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: 0;
}

export interface ProjectedNewAreaStore {
  readonly localObjectId: string;
  readonly sourceKind: "store";
  readonly sceneKind: "stores";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTM ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ProjectedNewAreaTrigger {
  readonly localObjectId: string;
  readonly sourceKind: "trigger";
  readonly sceneKind: "triggers";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTT ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: 0;
}

export interface ProjectedNewAreaPlaceable {
  readonly localObjectId: string;
  readonly sourceKind: "placeable";
  readonly sceneKind: "placeables";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceObjectKey?: string;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTP ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ProjectedNewAreaItem {
  readonly localObjectId: string;
  readonly sourceKind: "item";
  readonly sceneKind: "items";
  readonly sourceProfileId: string;
  readonly templateId: string;
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
  readonly sourceSha256: string;
  readonly sourceFileType: "UTI ";
  readonly sourceFileVersion: "V3.2";
  readonly sourceStructTypeId: number;
  readonly resRef: string;
  readonly tag: string;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export type ProjectedNewAreaObject =
  | ProjectedNewAreaCreature
  | ProjectedNewAreaDoor
  | ProjectedNewAreaEncounter
  | ProjectedNewAreaItem
  | ProjectedNewAreaPlaceable
  | ProjectedNewAreaSound
  | ProjectedNewAreaStore
  | ProjectedNewAreaTrigger
  | ProjectedNewAreaWaypoint;

export interface ProjectedAreaObjectEditing {
  readonly sourceGitSha256: string;
  readonly sourceGicSha256?: string;
  readonly retainedObjects: readonly ProjectedRetainedAreaObject[];
  readonly newObjects: readonly ProjectedNewAreaObject[];
  readonly propertyMutations?: readonly ProjectedExistingAreaObjectPropertyMutation[];
  readonly doorTransitionMutations?: readonly ProjectedExistingAreaDoorTransitionStorageMutation[];
  readonly polygonMutations?: readonly ExistingAreaObjectPolygonMutation[];
  readonly soundIntervalVariationMutations?: readonly ExistingAreaSoundIntervalVariationMutation[];
  readonly soundVolumeMutations?: readonly ExistingAreaSoundVolumeMutation[];
  readonly soundScheduleMutations?: readonly ExistingAreaSoundScheduleMutation[];
  readonly soundActiveMutations?: readonly ExistingAreaSoundActiveMutation[];
  readonly soundPlayOrderMutations?: readonly ExistingAreaSoundPlayOrderMutation[];
  readonly soundPlayStyleMutations?: readonly ExistingAreaSoundPlayStyleMutation[];
  readonly soundPlaybackMutations?: readonly ExistingAreaSoundPlaybackMutation[];
  readonly soundProfileMutations?: readonly ExistingAreaSoundProfileMutation[];
}

export class AreaUpdateDraftProjectionError extends Error {
  readonly code = "AREA_UPDATE_INVALID";

  constructor(message: string, readonly path: string) {
    super(`${path}: ${message}`);
    this.name = "AreaUpdateDraftProjectionError";
  }
}

export function projectAreaUpdateDraft(
  snapshot: AreaDraftSnapshot,
  expected: Readonly<{
    areaResRef: string;
    draftId: string;
    draftRevision: number;
    draftNormalizedSha256: string;
  }>,
): ProjectedAreaUpdateDraft {
  assertEqual(snapshot.draftId, expected.draftId, "Draft ID does not match the command.", "draft.id");
  assertEqual(snapshot.revision, expected.draftRevision, "Draft revision does not match the command.", "draft.revision");
  assertEqual(
    snapshot.normalizedSha256.toLowerCase(),
    expected.draftNormalizedSha256.toLowerCase(),
    "Draft hash does not match the retained revision.",
    "draft.normalizedSha256",
  );
  if (snapshot.source.type !== "production_area") {
    fail("Only a copy of an existing production Area can be updated.", "draft.source");
  }
  assertAreaIdentity(snapshot.source.areaId, expected.areaResRef, "draft.source.areaId");

  const payload = record(snapshot.draft.payload, "draft.payload");
  assertEqual(
    payload.schemaVersion,
    "production-area-draft-payload.v1",
    "Unsupported production draft payload.",
    "draft.payload.schemaVersion",
  );
  const provenance = record(payload.provenance, "draft.payload.provenance");
  assertEqual(
    provenance.areaId,
    snapshot.source.areaId,
    "Production source provenance identifies another Area.",
    "draft.payload.provenance.areaId",
  );
  const sourceArea = record(payload.sourceArea, "draft.payload.sourceArea");
  assertAreaIdentity(sourceArea.areaId, expected.areaResRef, "draft.payload.sourceArea.areaId");
  const sourceWidth = positiveInteger(sourceArea.width, "draft.payload.sourceArea.width");
  const sourceHeight = positiveInteger(sourceArea.height, "draft.payload.sourceArea.height");

  const scene = record(payload.editableScene, "draft.payload.editableScene");
  const comments = projectAreaCommentsMutation(sourceArea, scene);
  const eventScripts = projectAreaEventScriptMutations(sourceArea, scene);
  const basicIdentity = projectAreaBasicIdentityMutations(sourceArea, scene);
  const advancedFlags = projectAreaAdvancedFlagMutations(sourceArea, scene);
  const visualEnvironmentCatalogSelection =
    projectAreaVisualEnvironmentCatalogSelectionMutation(sourceArea, scene);
  const lightingSchemeChanged = visualEnvironmentCatalogSelection !== undefined
    && visualEnvironmentCatalogSelection.expectedValue.lightingSchemeRowIndex
      !== visualEnvironmentCatalogSelection.value.lightingSchemeRowIndex;
  const visualEnvironment = lightingSchemeChanged
    ? undefined
    : projectAreaVisualEnvironmentMutation(sourceArea, scene);
  const visualEnvironmentScalarControls = lightingSchemeChanged
    ? undefined
    : projectAreaVisualEnvironmentScalarControlsMutation(sourceArea, scene);
  const audioEnvironment = projectAreaAudioEnvironmentMutation(
    sourceArea,
    scene,
    provenance,
  );
  const variables = projectAreaVariableMutation(sourceArea, scene, provenance);
  const name = nonBlank(scene.areaName, 256, "draft.payload.editableScene.areaName");
  const width = dimension(scene.width, "draft.payload.editableScene.width");
  const height = dimension(scene.height, "draft.payload.editableScene.height");
  const editing = record(
    scene.auroraAreaEditing,
    "draft.payload.editableScene.auroraAreaEditing",
  );
  const state = record(
    editing.state,
    "draft.payload.editableScene.auroraAreaEditing.state",
  );
  assertEqual(
    state.schemaVersion,
    1,
    "Unsupported Area editing state.",
    "draft.payload.editableScene.auroraAreaEditing.state.schemaVersion",
  );
  const stateWidth = dimension(
    state.width,
    "draft.payload.editableScene.auroraAreaEditing.state.width",
  );
  const stateHeight = dimension(
    state.height,
    "draft.payload.editableScene.auroraAreaEditing.state.height",
  );
  assertEqual(stateWidth, width, "Scene and editing widths differ.", "draft.payload.editableScene.width");
  assertEqual(stateHeight, height, "Scene and editing heights differ.", "draft.payload.editableScene.height");
  const areaResRef = resRef(
    state.areaResRef,
    "draft.payload.editableScene.auroraAreaEditing.state.areaResRef",
  );
  assertEqual(areaResRef, expected.areaResRef, "Editing state identifies another Area.", "draft.payload.editableScene.auroraAreaEditing.state.areaResRef");
  const moduleStartLocation = projectAreaModuleStartLocationMutation(
    sourceArea,
    scene,
    areaResRef,
  );
  const tilesetResRef = resRef(
    state.tilesetResRef,
    "draft.payload.editableScene.auroraAreaEditing.state.tilesetResRef",
  );
  const tilesetFingerprint = sha256(
    state.tilesetFingerprint,
    "draft.payload.editableScene.auroraAreaEditing.state.tilesetFingerprint",
  );
  const areaFingerprint = sha256(
    state.sourceAreaFingerprint,
    "draft.payload.editableScene.auroraAreaEditing.state.sourceAreaFingerprint",
  );
  if (!Array.isArray(state.tiles) || state.tiles.length !== width * height) {
    fail(
      `Tile count must equal width * height (${width * height}).`,
      "draft.payload.editableScene.auroraAreaEditing.state.tiles",
    );
  }
  const tiles = state.tiles.map((value, index) =>
    projectTile(value, index, width, height, sourceWidth, sourceHeight),
  );
  const objectEditing = projectObjectEditing(provenance, scene, snapshot.source.areaId, {
    tilesetResRef,
    tilesetFingerprint,
    tiles,
  });

  return deepFreeze({
    areaResRef,
    name,
    width,
    height,
    tilesetResRef,
    tilesetFingerprint,
    areaFingerprint,
    tiles,
    ...(comments ? { comments } : {}),
    ...(eventScripts ? { eventScripts } : {}),
    ...(basicIdentity ? { basicIdentity } : {}),
    ...(advancedFlags ? { advancedFlags } : {}),
    ...(visualEnvironment ? { visualEnvironment } : {}),
    ...(visualEnvironmentScalarControls ? { visualEnvironmentScalarControls } : {}),
    ...(visualEnvironmentCatalogSelection
      ? { visualEnvironmentCatalogSelection }
      : {}),
    ...(audioEnvironment ? { audioEnvironment } : {}),
    ...(variables ? { variables } : {}),
    ...(moduleStartLocation ? { moduleStartLocation } : {}),
    ...(objectEditing ? { objectEditing } : {}),
  });
}

function projectAreaVisualEnvironmentCatalogSelectionMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaVisualEnvironmentCatalogSelectionMutation | undefined {
  if (scene.areaVisualEnvironmentCatalogSelection === undefined) return undefined;
  const sourceSelection = sourceArea.visualEnvironmentCatalogSelection;
  const targetSelection = scene.areaVisualEnvironmentCatalogSelection;
  if (!isAreaVisualEnvironmentCatalogSelection(sourceSelection)) {
    fail(
      "Changed Area visual selection requires one exact retained selection pair.",
      "draft.payload.sourceArea.visualEnvironmentCatalogSelection",
    );
  }
  if (!isAreaVisualEnvironmentCatalogSelection(targetSelection)) {
    fail(
      "Area visual selection must contain two exact physical row ordinals.",
      "draft.payload.editableScene.areaVisualEnvironmentCatalogSelection",
    );
  }
  if (areaVisualEnvironmentCatalogSelectionsEqual(sourceSelection, targetSelection)) {
    return undefined;
  }
  if (!isExactEffectiveAreaVisualEnvironmentCatalogBundle(
    sourceArea.visualEnvironmentCatalogs,
  )) {
    fail(
      "Changed Area visual selection requires the exact effective catalog bundle.",
      "draft.payload.sourceArea.visualEnvironmentCatalogs",
    );
  }
  if (!isAreaVisualEnvironment(sourceArea.visualEnvironment)) {
    fail(
      "Changed Area visual selection requires one complete retained visual tuple.",
      "draft.payload.sourceArea.visualEnvironment",
    );
  }
  if (!isAreaVisualEnvironmentScalarControls(
    sourceArea.visualEnvironmentScalarControls,
  )) {
    fail(
      "Changed Area visual selection requires one complete retained scalar pair.",
      "draft.payload.sourceArea.visualEnvironmentScalarControls",
    );
  }
  const catalogs = sourceArea.visualEnvironmentCatalogs;
  const sourceRowsExist = catalogs.lightingSchemes.rows.some(
    (row) => row.rowIndex === sourceSelection.lightingSchemeRowIndex,
  ) && catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === sourceSelection.skyBoxRowIndex,
  );
  const targetLighting = catalogs.lightingSchemes.rows.find(
    (row) => row.rowIndex === targetSelection.lightingSchemeRowIndex,
  );
  const targetSkyBoxExists = catalogs.skyBoxes.rows.some(
    (row) => row.rowIndex === targetSelection.skyBoxRowIndex,
  );
  if (!sourceRowsExist || !targetLighting || !targetSkyBoxExists) {
    fail(
      "Area visual selection row is absent from the retained effective catalogs.",
      "draft.payload.editableScene.areaVisualEnvironmentCatalogSelection",
    );
  }

  const lightingSchemeChanged = sourceSelection.lightingSchemeRowIndex
    !== targetSelection.lightingSchemeRowIndex;
  let visualEnvironmentOverride;
  let visualEnvironmentScalarControlsOverride;
  if (lightingSchemeChanged) {
    if (!isAreaVisualEnvironment(scene.areaVisualEnvironment)) {
      fail(
        "Lighting Scheme selection requires one complete final visual tuple.",
        "draft.payload.editableScene.areaVisualEnvironment",
      );
    }
    if (!isAreaVisualEnvironmentScalarControls(
      scene.areaVisualEnvironmentScalarControls,
    )) {
      fail(
        "Lighting Scheme selection requires one complete final scalar pair.",
        "draft.payload.editableScene.areaVisualEnvironmentScalarControls",
      );
    }
    if (!areaVisualEnvironmentsEqual(
      scene.areaVisualEnvironment,
      targetLighting.visualEnvironment,
    )) {
      visualEnvironmentOverride = {
        ...scene.areaVisualEnvironment,
        sun: { ...scene.areaVisualEnvironment.sun },
        moon: { ...scene.areaVisualEnvironment.moon },
      };
    }
    if (!areaVisualEnvironmentScalarControlsEqual(
      scene.areaVisualEnvironmentScalarControls,
      targetLighting.visualEnvironmentScalarControls,
    )) {
      visualEnvironmentScalarControlsOverride = {
        ...scene.areaVisualEnvironmentScalarControls,
      };
    }
  }

  return {
    catalogIdentity: {
      environmentSha256: catalogs.lightingSchemes.descriptor.sha256,
      skyBoxesSha256: catalogs.skyBoxes.descriptor.sha256,
    },
    expectedValue: {
      lightingSchemeRowIndex: sourceSelection.lightingSchemeRowIndex,
      skyBoxRowIndex: sourceSelection.skyBoxRowIndex,
      visualEnvironment: {
        ...sourceArea.visualEnvironment,
        sun: { ...sourceArea.visualEnvironment.sun },
        moon: { ...sourceArea.visualEnvironment.moon },
      },
      visualEnvironmentScalarControls: {
        ...sourceArea.visualEnvironmentScalarControls,
      },
    },
    value: {
      lightingSchemeRowIndex: targetSelection.lightingSchemeRowIndex,
      skyBoxRowIndex: targetSelection.skyBoxRowIndex,
      ...(visualEnvironmentOverride ? { visualEnvironmentOverride } : {}),
      ...(visualEnvironmentScalarControlsOverride
        ? { visualEnvironmentScalarControlsOverride }
        : {}),
    },
  };
}

function projectAreaVisualEnvironmentMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaVisualEnvironmentMutation | undefined {
  if (scene.areaVisualEnvironment === undefined) return undefined;
  if (!isAreaVisualEnvironment(sourceArea.visualEnvironment)) {
    fail(
      "Changed Area visual environment requires one complete exact immutable ARE tuple.",
      "draft.payload.sourceArea.visualEnvironment",
    );
  }
  if (!isAreaVisualEnvironment(scene.areaVisualEnvironment)) {
    fail(
      "Area visual environment must contain the complete admitted source-closed tuple.",
      "draft.payload.editableScene.areaVisualEnvironment",
    );
  }
  if (areaVisualEnvironmentsEqual(sourceArea.visualEnvironment, scene.areaVisualEnvironment)) {
    return undefined;
  }
  return {
    expectedValue: {
      ...sourceArea.visualEnvironment,
      sun: { ...sourceArea.visualEnvironment.sun },
      moon: { ...sourceArea.visualEnvironment.moon },
    },
    value: {
      ...scene.areaVisualEnvironment,
      sun: { ...scene.areaVisualEnvironment.sun },
      moon: { ...scene.areaVisualEnvironment.moon },
    },
  };
}

function projectAreaVisualEnvironmentScalarControlsMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaVisualEnvironmentScalarControlsMutation | undefined {
  if (scene.areaVisualEnvironmentScalarControls === undefined) return undefined;
  if (!isAreaVisualEnvironmentScalarControls(
    sourceArea.visualEnvironmentScalarControls,
  )) {
    fail(
      "Changed Area visual-environment scalar controls require one complete exact immutable ARE pair.",
      "draft.payload.sourceArea.visualEnvironmentScalarControls",
    );
  }
  if (!isAreaVisualEnvironmentScalarControls(
    scene.areaVisualEnvironmentScalarControls,
  )) {
    fail(
      "Area visual-environment scalar controls must contain the complete admitted source-closed pair.",
      "draft.payload.editableScene.areaVisualEnvironmentScalarControls",
    );
  }
  if (areaVisualEnvironmentScalarControlsEqual(
    sourceArea.visualEnvironmentScalarControls,
    scene.areaVisualEnvironmentScalarControls,
  )) return undefined;
  return {
    expectedValue: { ...sourceArea.visualEnvironmentScalarControls },
    value: { ...scene.areaVisualEnvironmentScalarControls },
  };
}

function projectAreaVariableMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
  provenance: Record<string, unknown>,
): ExistingAreaVariableMutation | undefined {
  if (scene.areaVariables === undefined) return undefined;
  let sourceVariables: ReturnType<typeof parseAuroraVariableProvenance>;
  try {
    sourceVariables = parseAuroraVariableProvenance(sourceArea.variables);
  } catch (error) {
    if (error instanceof AuroraVariableTableValidationError) {
      fail(
        "Changed Area variables require one exact immutable GIT VarTable profile.",
        "draft.payload.sourceArea.variables",
      );
    }
    throw error;
  }
  let targetEntries: ReturnType<typeof parseAuroraVariableTargetEntries>;
  try {
    targetEntries = parseAuroraVariableTargetEntries(scene.areaVariables);
  } catch (error) {
    if (error instanceof AuroraVariableTableValidationError) {
      fail(
        "Area variables must contain only exact ordered Int, Float, or String entries within the admitted budgets.",
        "draft.payload.editableScene.areaVariables",
      );
    }
    throw error;
  }
  if (auroraVariableEntriesEqual(sourceVariables.expectedEntries, targetEntries)) {
    return undefined;
  }
  const sourceGitSha256 = sha256(
    provenance.sourceGitSha256,
    "draft.payload.provenance.sourceGitSha256",
  );
  return Object.freeze({
    expectedEntries: Object.freeze(
      sourceVariables.expectedEntries.map((entry) => Object.freeze({ ...entry })),
    ),
    entries: Object.freeze(targetEntries.map((entry) => Object.freeze({ ...entry }))),
    sourceGitSha256,
  });
}

function projectAreaAudioEnvironmentMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
  provenance: Record<string, unknown>,
): ProjectedAreaUpdateDraft["audioEnvironment"] {
  if (scene.areaAudioEnvironment === undefined) return undefined;
  if (!isAreaAudioEnvironment(sourceArea.audioEnvironment)) {
    fail(
      "Changed Area audio environment requires one complete exact immutable GIT tuple.",
      "draft.payload.sourceArea.audioEnvironment",
    );
  }
  if (!isAreaAudioEnvironment(scene.areaAudioEnvironment)) {
    fail(
      "Area audio environment must contain the complete admitted nine-field tuple.",
      "draft.payload.editableScene.areaAudioEnvironment",
    );
  }
  if (areaAudioEnvironmentsEqual(sourceArea.audioEnvironment, scene.areaAudioEnvironment)) {
    return undefined;
  }
  const sourceGitSha256 = sha256(
    provenance.sourceGitSha256,
    "draft.payload.provenance.sourceGitSha256",
  );
  return Object.freeze({
    expectedValue: Object.freeze({ ...sourceArea.audioEnvironment }),
    value: Object.freeze({ ...scene.areaAudioEnvironment }),
    sourceGitSha256,
  });
}

function projectAreaModuleStartLocationMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
  currentAreaResRef: string,
): ExistingAreaModuleStartLocationMutation | undefined {
  if (scene.moduleStartLocation === undefined) return undefined;
  if (!isAreaModuleStartLocation(sourceArea.moduleStartLocation)) {
    fail(
      "Changed module start location requires exact immutable IFO provenance.",
      "draft.payload.sourceArea.moduleStartLocation",
    );
  }
  const target = normalizeAreaModuleStartLocation(scene.moduleStartLocation);
  if (!target) {
    fail(
      "Module start location must be a complete canonical Area ResRef and five finite binary32-storable numbers.",
      "draft.payload.editableScene.moduleStartLocation",
    );
  }
  if (areaModuleStartLocationsEqual(sourceArea.moduleStartLocation, target)) {
    return undefined;
  }
  const targetAreaResRefs = projectModuleStartLocationTargets(
    sourceArea.moduleStartLocationTargets,
    currentAreaResRef,
  );
  if (!targetAreaResRefs.includes(target.areaResRef)) {
    fail(
      "The module start location target is not admitted by immutable module membership.",
      "draft.payload.editableScene.moduleStartLocation.areaResRef",
    );
  }
  return Object.freeze({
    expectedValue: Object.freeze({ ...sourceArea.moduleStartLocation }),
    value: target,
  });
}

function projectModuleStartLocationTargets(
  value: unknown,
  currentAreaResRef: string,
): readonly string[] {
  if (value === undefined) return Object.freeze([currentAreaResRef]);
  const path = "draft.payload.sourceArea.moduleStartLocationTargets";
  if (!Array.isArray(value) || value.length < 1 || value.length > 4096) {
    fail("Expected 1..4096 immutable module start-location targets.", path);
  }
  const targets = value.map((entry, index) => {
    const normalized = resRef(entry, `${path}[${index}]`);
    if (entry !== normalized) {
      fail("Module start-location targets must be exact canonical lowercase ResRefs.", `${path}[${index}]`);
    }
    return normalized;
  });
  const sorted = [...targets].sort((left, right) => left.localeCompare(right));
  if (new Set(targets).size !== targets.length
      || targets.some((target, index) => target !== sorted[index])) {
    fail("Module start-location targets must be sorted and duplicate-free.", path);
  }
  if (!targets.includes(currentAreaResRef)) {
    fail("Module start-location targets do not contain the Area being materialized.", path);
  }
  return Object.freeze(targets);
}

function projectAreaAdvancedFlagMutations(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaAdvancedFlagMutations | undefined {
  if (scene.areaAdvancedFlags === undefined) return undefined;
  if (!isAreaAdvancedFlags(scene.areaAdvancedFlags)) {
    fail(
      "Area advanced flags must contain only admitted exact native values.",
      "draft.payload.editableScene.areaAdvancedFlags",
    );
  }
  const target = scene.areaAdvancedFlags as AreaAdvancedFlags;
  const source = isAreaAdvancedFlags(sourceArea.advancedFlags)
    ? sourceArea.advancedFlags
    : undefined;
  const result: {
    terrainType?: ExistingAreaAdvancedFlagMutations["terrainType"];
    playerVsPlayer?: ExistingAreaAdvancedFlagMutations["playerVsPlayer"];
    noRest?: ExistingAreaAdvancedFlagMutations["noRest"];
    listenCheckModifier?: ExistingAreaAdvancedFlagMutations["listenCheckModifier"];
    spotCheckModifier?: ExistingAreaAdvancedFlagMutations["spotCheckModifier"];
    loadingScreenId?: ExistingAreaAdvancedFlagMutations["loadingScreenId"];
  } = {};

  if (target.terrainType !== undefined) {
    if (source?.terrainType === undefined) {
      fail(
        "Changed Area terrain type requires exact immutable source provenance.",
        "draft.payload.sourceArea.advancedFlags.terrainType",
      );
    }
    if (!terrainTypeFlagsEqual(source.terrainType, target.terrainType)) {
      result.terrainType = {
        expectedValue: source.terrainType,
        value: target.terrainType,
      };
    }
  }
  if (target.playerVsPlayer !== undefined) {
    if (source?.playerVsPlayer === undefined) {
      fail(
        "Changed Area PvP mode requires exact immutable source provenance.",
        "draft.payload.sourceArea.advancedFlags.playerVsPlayer",
      );
    }
    if (source.playerVsPlayer !== target.playerVsPlayer) {
      result.playerVsPlayer = {
        expectedValue: source.playerVsPlayer,
        value: target.playerVsPlayer,
      };
    }
  }
  if (target.noRest !== undefined) {
    if (source?.noRest === undefined) {
      fail(
        "Changed Area no-rest value requires exact immutable source provenance.",
        "draft.payload.sourceArea.advancedFlags.noRest",
      );
    }
    if (source.noRest !== target.noRest) {
      result.noRest = { expectedValue: source.noRest, value: target.noRest };
    }
  }
  for (const [key, label] of [
    ["listenCheckModifier", "Listen"],
    ["spotCheckModifier", "Spot"],
  ] as const) {
    if (target[key] === undefined) continue;
    if (source?.[key] === undefined) {
      fail(
        `Changed Area ${label} check modifier requires exact immutable source provenance.`,
        `draft.payload.sourceArea.advancedFlags.${key}`,
      );
    }
    if (source[key] !== target[key]) {
      result[key] = { expectedValue: source[key], value: target[key] };
    }
  }
  if (target.loadingScreenId !== undefined) {
    if (source?.loadingScreenId === undefined) {
      fail(
        "Changed Area loading-screen ID requires exact immutable source provenance.",
        "draft.payload.sourceArea.advancedFlags.loadingScreenId",
      );
    }
    if (source.loadingScreenId !== target.loadingScreenId) {
      result.loadingScreenId = {
        expectedValue: source.loadingScreenId,
        value: target.loadingScreenId,
      };
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

function projectAreaBasicIdentityMutations(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaBasicIdentityMutations | undefined {
  const source = sourceArea.basicIdentity === undefined
    ? undefined
    : record(sourceArea.basicIdentity, "draft.payload.sourceArea.basicIdentity");
  const targetIdentity = scene.areaBasicIdentity === undefined
    ? undefined
    : record(scene.areaBasicIdentity, "draft.payload.editableScene.areaBasicIdentity");
  const result: {
    name?: {
      expectedValue: string;
      value: string;
      expectedProfile?: "simple_inline_ascii" | "multi_entry_inline_ascii";
      expectedEntries?: readonly EditableAreaNameStorageEntry[];
      valueEntries?: readonly EditableAreaNameStorageEntry[];
    };
    tag?: { expectedValue: string; value: string };
  } = {};

  if (isEditableAreaName(source?.name)) {
    const explicitProfile = source?.nameProfile;
    const targetProfile = targetIdentity?.nameProfile;
    if (explicitProfile !== undefined && !isAreaNameStorageProfile(explicitProfile)) {
      fail(
        "Editable Area Name source profile is invalid.",
        "draft.payload.sourceArea.basicIdentity.nameProfile",
      );
    }
    if (targetProfile !== undefined && !isAreaNameStorageProfile(targetProfile)) {
      fail(
        "Editable Area Name target profile is invalid.",
        "draft.payload.editableScene.areaBasicIdentity.nameProfile",
      );
    }
    if (!isEditableAreaName(scene.areaName)) {
      fail(
        "An editable Area Name must be 1-256 printable ASCII characters and not whitespace-only.",
        "draft.payload.editableScene.areaName",
      );
    }
    const sourceEntries = source?.nameEntries === undefined
      ? undefined
      : readEditableAreaNameEntries(source.nameEntries);
    const targetEntries = targetIdentity?.nameEntries === undefined
      ? undefined
      : readEditableAreaNameEntries(targetIdentity.nameEntries);
    if ((source?.nameEntries !== undefined && !sourceEntries)
      || (targetIdentity?.nameEntries !== undefined && !targetEntries)) {
      fail(
        "Area Name entries must be complete ordered inline printable-ASCII storage.",
        "draft.payload.editableScene.areaBasicIdentity.nameEntries",
      );
    }
    if ((sourceEntries === undefined) !== (targetEntries === undefined)) {
      fail(
        "Changed Area Name entries require exact immutable source provenance.",
        "draft.payload.sourceArea.basicIdentity.nameEntries",
      );
    }
    if (
      sourceEntries === undefined
      && targetEntries === undefined
      && targetProfile !== undefined
      && targetProfile !== explicitProfile
    ) {
      fail(
        "Area Name profile changes require complete ordered source and target entries.",
        "draft.payload.editableScene.areaBasicIdentity.nameProfile",
      );
    }
    if (sourceEntries && targetEntries) {
      if (
        !explicitProfile
        || !targetProfile
        || areaNameStorageProfileForEntries(sourceEntries) !== explicitProfile
        || areaNameStorageProfileForEntries(targetEntries) !== targetProfile
        || sourceEntries.find((entry) => entry.languageId === 0)?.text !== source.name
        || targetEntries.find((entry) => entry.languageId === 0)?.text !== scene.areaName
        || !areaNameStorageEntryIdentifiersFormAdmittedTarget(sourceEntries, targetEntries)
      ) {
        fail(
          "Area Name target entries must retain identifier 0 and use only unique source or verified catalog identifiers with nonempty text for additions.",
          "draft.payload.editableScene.areaBasicIdentity.nameEntries",
        );
      }
    }
    if (source.name !== scene.areaName
      || (sourceEntries && targetEntries
        && !areaNameStorageEntriesEqual(sourceEntries, targetEntries))) {
      result.name = {
        expectedValue: source.name,
        value: scene.areaName,
        ...(explicitProfile === undefined ? {} : { expectedProfile: explicitProfile }),
        ...(sourceEntries && targetEntries
          ? { expectedEntries: sourceEntries, valueEntries: targetEntries }
          : {}),
      };
    }
  } else if (sourceArea.name !== scene.areaName) {
    fail(
      "Changed Area Name requires exact simple-inline immutable source provenance.",
      "draft.payload.sourceArea.basicIdentity.name",
    );
  }

  if (scene.areaTag !== undefined) {
    if (!isEditableAreaTag(scene.areaTag)) {
      fail(
        "Area Tag must contain at most 64 printable ASCII characters.",
        "draft.payload.editableScene.areaTag",
      );
    }
    if (!isEditableAreaTag(source?.tag)) {
      fail(
        "Changed Area Tag requires exact immutable source provenance.",
        "draft.payload.sourceArea.basicIdentity.tag",
      );
    }
    if (source.tag !== scene.areaTag) {
      result.tag = { expectedValue: source.tag, value: scene.areaTag };
    }
  }
  return Object.keys(result).length === 0 ? undefined : result;
}

function projectAreaEventScriptMutations(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaEventScriptMutations | undefined {
  if (scene.areaEventScripts === undefined) return undefined;
  const target = record(
    scene.areaEventScripts,
    "draft.payload.editableScene.areaEventScripts",
  );
  const source = record(
    sourceArea.eventScripts,
    "draft.payload.sourceArea.eventScripts",
  );
  const admittedSlots = new Set(AREA_EVENT_SCRIPT_FIELDS.map((entry) => entry.slot));
  for (const key of Object.keys(target)) {
    if (!admittedSlots.has(key as (typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"])) {
      fail("Unknown Area event-script slot.", `draft.payload.editableScene.areaEventScripts.${key}`);
    }
  }
  const result: Record<string, { expectedResRef: string; resRef: string }> = {};
  for (const { slot } of AREA_EVENT_SCRIPT_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(target, slot)) continue;
    const targetValue = target[slot];
    if (!isAreaEventScriptResRef(targetValue)) {
      fail(
        "Area event script ResRef must be empty or 1-16 lowercase ASCII [a-z0-9_] characters.",
        `draft.payload.editableScene.areaEventScripts.${slot}`,
      );
    }
    const sourceValue = source[slot];
    if (!isAreaEventScriptResRef(sourceValue)) {
      fail(
        "Editable Area event scripts require exact immutable source provenance.",
        `draft.payload.sourceArea.eventScripts.${slot}`,
      );
    }
    if (sourceValue !== targetValue) {
      result[slot] = { expectedResRef: sourceValue, resRef: targetValue };
    }
  }
  return Object.keys(result).length === 0
    ? undefined
    : result as ExistingAreaEventScriptMutations;
}

function projectAreaCommentsMutation(
  sourceArea: Record<string, unknown>,
  scene: Record<string, unknown>,
): ExistingAreaCommentsMutation | undefined {
  if (scene.areaComments === undefined) return undefined;
  if (!isAreaCommentsValue(scene.areaComments)) {
    fail(
      "Area Comments must be a string of at most 4096 code units without U+0000.",
      "draft.payload.editableScene.areaComments",
    );
  }
  if (!isAreaCommentsValue(sourceArea.comments)) {
    fail(
      "Editable Area Comments require exact immutable source provenance.",
      "draft.payload.sourceArea.comments",
    );
  }
  if (sourceArea.comments === scene.areaComments) return undefined;
  return {
    expectedValue: sourceArea.comments,
    value: scene.areaComments,
  };
}

const SCENE_KIND_TO_SOURCE_KIND: Readonly<Record<ProjectedAreaSceneObjectKind, ProjectedAreaObjectKind>> =
  Object.freeze({
    creatures: "creature",
    doors: "door",
    encounters: "encounter",
    items: "item",
    placeables: "placeable",
    sounds: "sound",
    stores: "store",
    triggers: "trigger",
    waypoints: "waypoint",
  });

function projectObjectEditing(
  provenance: Record<string, unknown>,
  scene: Record<string, unknown>,
  expectedAreaId: string,
  topology: Readonly<{
    tilesetResRef: string;
    tilesetFingerprint: string;
    tiles: readonly ProjectedAreaUpdateTile[];
  }>,
): ProjectedAreaObjectEditing | undefined {
  if (provenance.sourceGitSha256 === undefined) {
    return undefined;
  }
  const sourceGitSha256 = sha256(
    provenance.sourceGitSha256,
    "draft.payload.provenance.sourceGitSha256",
  );
  const path = "draft.payload.editableScene.objects";
  if (!Array.isArray(scene.objects) || scene.objects.length > 100_000) {
    fail("Expected an object array with no more than 100000 entries.", path);
  }
  const retainedObjects: ProjectedRetainedAreaObject[] = [];
  const newObjects: ProjectedNewAreaObject[] = [];
  const propertyMutations: ProjectedExistingAreaObjectPropertyMutation[] = [];
  const doorTransitionMutations: ProjectedExistingAreaDoorTransitionStorageMutation[] = [];
  const polygonMutations: ExistingAreaObjectPolygonMutation[] = [];
  const soundIntervalVariationMutations: ExistingAreaSoundIntervalVariationMutation[] = [];
  const soundVolumeMutations: ExistingAreaSoundVolumeMutation[] = [];
  const soundScheduleMutations: ExistingAreaSoundScheduleMutation[] = [];
  const soundActiveMutations: ExistingAreaSoundActiveMutation[] = [];
  const soundPlayOrderMutations: ExistingAreaSoundPlayOrderMutation[] = [];
  const soundPlayStyleMutations: ExistingAreaSoundPlayStyleMutation[] = [];
  const soundPlaybackMutations: ExistingAreaSoundPlaybackMutation[] = [];
  const soundProfileMutations: ExistingAreaSoundProfileMutation[] = [];
  scene.objects.forEach((input, index) => {
    const value = record(input, `${path}.${index}`);
    const source = record(value.source, `${path}.${index}.source`);
    if (source.type === "aurora_git") {
      const retained = projectRetainedObject(input, index, expectedAreaId);
      retainedObjects.push(retained);
      const propertyMutation = projectExistingObjectPropertyMutation(
        value,
        source,
        retained,
        index,
        scene.itemBaseItemCatalog,
      );
      if (propertyMutation) propertyMutations.push(propertyMutation);
      const doorTransitionMutation = projectExistingDoorTransitionStorageMutation(
        value,
        source,
        retained,
        index,
      );
      if (doorTransitionMutation) doorTransitionMutations.push(doorTransitionMutation);
      const polygonMutation = projectExistingObjectPolygonMutation(
        value,
        source,
        retained,
        index,
      );
      if (polygonMutation) polygonMutations.push(polygonMutation);
      const soundIntervalVariationMutation = projectExistingSoundIntervalVariationMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundIntervalVariationMutation) {
        soundIntervalVariationMutations.push(soundIntervalVariationMutation);
      }
      const soundVolumeMutation = projectExistingSoundVolumeMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundVolumeMutation) soundVolumeMutations.push(soundVolumeMutation);
      const soundScheduleMutation = projectExistingSoundScheduleMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundScheduleMutation) soundScheduleMutations.push(soundScheduleMutation);
      const soundActiveMutation = projectExistingSoundActiveMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundActiveMutation) soundActiveMutations.push(soundActiveMutation);
      const soundPlayOrderMutation = projectExistingSoundPlayOrderMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundPlayOrderMutation) soundPlayOrderMutations.push(soundPlayOrderMutation);
      const soundPlayStyleMutation = projectExistingSoundPlayStyleMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundPlayStyleMutation) soundPlayStyleMutations.push(soundPlayStyleMutation);
      const soundPlaybackMutation = projectExistingSoundPlaybackMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundPlaybackMutation) soundPlaybackMutations.push(soundPlaybackMutation);
      const soundProfileMutation = projectExistingSoundProfileMutation(
        value,
        source,
        retained,
        index,
      );
      if (soundProfileMutation) soundProfileMutations.push(soundProfileMutation);
      return;
    }
    if (source.type === "aurora_blueprint") {
      newObjects.push(projectNewAreaObject(input, index, topology));
      return;
    }
    fail(
      "Object source must identify an immutable aurora_git instance or an admitted Aurora blueprint.",
      `${path}.${index}.source.type`,
    );
  });
  if (newObjects.length > MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE} new Area objects are admitted per update.`,
      path,
    );
  }
  if (polygonMutations.length > MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE} retained polygons are admitted per update.`,
      path,
    );
  }
  if (
    soundIntervalVariationMutations.length
      > MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE
  ) {
    fail(
      `No more than ${MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE} retained Sound interval/variation mutations are admitted per update.`,
      path,
    );
  }
  if (soundVolumeMutations.length > MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE} retained Sound base-volume mutations are admitted per update.`,
      path,
    );
  }
  if (soundScheduleMutations.length > MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE} retained Sound schedule mutations are admitted per update.`,
      path,
    );
  }
  if (soundActiveMutations.length > MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE} retained Sound Active mutations are admitted per update.`,
      path,
    );
  }
  if (soundPlayOrderMutations.length > MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE} retained Sound Play Order mutations are admitted per update.`,
      path,
    );
  }
  if (soundPlayStyleMutations.length > MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE} retained Sound Play Style mutations are admitted per update.`,
      path,
    );
  }
  if (soundPlaybackMutations.length > MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE} retained Sound playback mutations are admitted per update.`,
      path,
    );
  }
  if (soundProfileMutations.length > MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE) {
    fail(
      `No more than ${MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE} retained Sound profile mutations are admitted per update.`,
      path,
    );
  }
  const seen = new Set<string>();
  const seenOrdinals = new Set<string>();
  retainedObjects.forEach((entry, index) => {
    if (seen.has(entry.sourceObjectId)) {
      fail("aurora_git sourceObjectId must be unique.", `${path}.${index}.source.sourceObjectId`);
    }
    seen.add(entry.sourceObjectId);
    if (entry.sourceIndex !== undefined) {
      const ordinalKey = `${entry.sourceKind}:${entry.sourceIndex}`;
      if (seenOrdinals.has(ordinalKey)) {
        fail("aurora_git source family ordinal must be unique.", `${path}.${index}.source.sourceIndex`);
      }
      seenOrdinals.add(ordinalKey);
    }
  });
  const seenLocalIds = new Set<string>();
  newObjects.forEach((entry, index) => {
    if (seenLocalIds.has(entry.localObjectId)) {
      fail("New Area object IDs must be unique.", `${path}.${index}.id`);
    }
    seenLocalIds.add(entry.localObjectId);
  });
  validateDoorHookOccupancy(retainedObjects, newObjects, path);
  const hasEditorCommentMutation = propertyMutations.some(
    (mutation) => mutation.editorComment !== undefined,
  );
  if (hasEditorCommentMutation && provenance.sourceGicSha256 === undefined) {
    const editorCommentKinds = new Set(
      propertyMutations
        .filter((mutation) => mutation.editorComment !== undefined)
        .map((mutation) => mutation.kind),
    );
    const family = editorCommentKinds.size === 1 ? [...editorCommentKinds][0] : undefined;
    fail(
      family === "placeable"
        ? "A changed Placeable editor comment requires the immutable source GIC digest."
        : family === "creature"
          ? "A changed Creature editor comment requires the immutable source GIC digest."
          : family === "item"
            ? "A changed Item editor comment requires the immutable source GIC digest."
            : family === "store"
              ? "A changed Store editor comment requires the immutable source GIC digest."
              : family === "encounter"
                ? "A changed Encounter editor comment requires the immutable source GIC digest."
                : family === "trigger"
                  ? "A changed Trigger editor comment requires the immutable source GIC digest."
                  : "A changed object editor comment requires the immutable source GIC digest.",
      "draft.payload.provenance.sourceGicSha256",
    );
  }
  const sourceGicSha256 = hasEditorCommentMutation
    ? sha256(provenance.sourceGicSha256, "draft.payload.provenance.sourceGicSha256")
    : undefined;
  return Object.freeze({
    sourceGitSha256,
    ...(sourceGicSha256 ? { sourceGicSha256 } : {}),
    retainedObjects: Object.freeze(retainedObjects),
    newObjects: Object.freeze(newObjects),
    ...(propertyMutations.length > 0
      ? { propertyMutations: Object.freeze(propertyMutations) }
      : {}),
    ...(doorTransitionMutations.length > 0
      ? { doorTransitionMutations: Object.freeze(doorTransitionMutations) }
      : {}),
    ...(polygonMutations.length > 0
      ? { polygonMutations: Object.freeze(polygonMutations) }
      : {}),
    ...(soundIntervalVariationMutations.length > 0
      ? { soundIntervalVariationMutations: Object.freeze(soundIntervalVariationMutations) }
      : {}),
    ...(soundVolumeMutations.length > 0
      ? { soundVolumeMutations: Object.freeze(soundVolumeMutations) }
      : {}),
    ...(soundScheduleMutations.length > 0
      ? { soundScheduleMutations: Object.freeze(soundScheduleMutations) }
      : {}),
    ...(soundActiveMutations.length > 0
      ? { soundActiveMutations: Object.freeze(soundActiveMutations) }
      : {}),
    ...(soundPlayOrderMutations.length > 0
      ? { soundPlayOrderMutations: Object.freeze(soundPlayOrderMutations) }
      : {}),
    ...(soundPlayStyleMutations.length > 0
      ? { soundPlayStyleMutations: Object.freeze(soundPlayStyleMutations) }
      : {}),
    ...(soundPlaybackMutations.length > 0
      ? { soundPlaybackMutations: Object.freeze(soundPlaybackMutations) }
      : {}),
    ...(soundProfileMutations.length > 0
      ? { soundProfileMutations: Object.freeze(soundProfileMutations) }
      : {}),
  });
}

function projectExistingSoundProfileMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundProfileMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundProfileStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundProfile");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound profile target requires immutable exact storage provenance.",
      `${path}.source.soundProfileStorage`,
    );
  }
  const expectedValue = readAreaSoundProfileStorage(source.soundProfileStorage);
  if (!expectedValue) {
    fail("Sound profile storage provenance is malformed.", `${path}.source.soundProfileStorage`);
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry profile storage provenance.",
      `${path}.source.soundProfileStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundProfileStorage(value.soundProfile);
  if (!targetValue) {
    fail("Sound profile storage target is malformed.", `${path}.soundProfile`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound profile mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundProfileStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundProfileMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Sound profile mutation is invalid.", `${path}.soundProfile`);
  return mutation;
}

function projectExistingSoundPlaybackMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundPlaybackMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundPlaybackStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayback");
  if (Object.prototype.hasOwnProperty.call(source, "soundProfileStorage")) {
    if (!hasTarget) return undefined;
    const fallbackSource = readAreaSoundPlaybackStorage(source.soundPlaybackStorage);
    const fallbackTarget = readAreaSoundPlaybackStorage(value.soundPlayback);
    if (
      fallbackSource
      && fallbackTarget
      && areaSoundPlaybackStoragesEqual(fallbackSource, fallbackTarget)
    ) return undefined;
    fail(
      "Complete Sound profile storage is authoritative for playback changes.",
      `${path}.soundPlayback`,
    );
  }
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound playback target requires immutable exact storage provenance.",
      `${path}.source.soundPlaybackStorage`,
    );
  }
  const expectedValue = readAreaSoundPlaybackStorage(source.soundPlaybackStorage);
  if (!expectedValue) {
    fail("Sound playback storage provenance is malformed.", `${path}.source.soundPlaybackStorage`);
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry playback storage provenance.",
      `${path}.source.soundPlaybackStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundPlaybackStorage(value.soundPlayback);
  if (!targetValue) {
    fail("Sound playback storage target is malformed.", `${path}.soundPlayback`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound playback mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundPlaybackStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundPlaybackMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Sound playback mutation is invalid.", `${path}.soundPlayback`);
  return mutation;
}

function projectExistingSoundPlayStyleMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundPlayStyleMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundPlayStyleStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayStyle");
  if (
    Object.prototype.hasOwnProperty.call(source, "soundProfileStorage")
    || Object.prototype.hasOwnProperty.call(source, "soundPlaybackStorage")
  ) {
    if (!hasTarget) return undefined;
    const legacySource = readAreaSoundPlayStyleStorage(source.soundPlayStyleStorage);
    const legacyTarget = readAreaSoundPlayStyleStorage(value.soundPlayStyle);
    if (legacySource && legacyTarget && areaSoundPlayStyleStoragesEqual(legacySource, legacyTarget)) {
      return undefined;
    }
    fail(
      "Complete Sound profile or playback storage is authoritative for Play Style changes.",
      `${path}.soundPlayStyle`,
    );
  }
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound Play Style target requires immutable exact storage provenance.",
      `${path}.source.soundPlayStyleStorage`,
    );
  }
  const expectedValue = readAreaSoundPlayStyleStorage(source.soundPlayStyleStorage);
  if (!expectedValue) {
    fail(
      "Sound Play Style storage provenance is malformed.",
      `${path}.source.soundPlayStyleStorage`,
    );
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry Play Style storage provenance.",
      `${path}.source.soundPlayStyleStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundPlayStyleStorage(value.soundPlayStyle);
  if (!targetValue) {
    fail("Sound Play Style storage target is malformed.", `${path}.soundPlayStyle`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound Play Style mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundPlayStyleStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundPlayStyleMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) {
    fail("Sound Play Style mutation is invalid.", `${path}.soundPlayStyle`);
  }
  return mutation;
}

function projectExistingSoundPlayOrderMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundPlayOrderMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundPlayOrderStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundPlayOrder");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound Play Order target requires immutable exact storage provenance.",
      `${path}.source.soundPlayOrderStorage`,
    );
  }
  const expectedValue = readAreaSoundPlayOrderStorage(source.soundPlayOrderStorage);
  if (!expectedValue) {
    fail(
      "Sound Play Order storage provenance is malformed.",
      `${path}.source.soundPlayOrderStorage`,
    );
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry Play Order storage provenance.",
      `${path}.source.soundPlayOrderStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundPlayOrderStorage(value.soundPlayOrder);
  if (!targetValue) {
    fail("Sound Play Order storage target is malformed.", `${path}.soundPlayOrder`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound Play Order mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundPlayOrderStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundPlayOrderMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) {
    fail("Sound Play Order mutation is invalid.", `${path}.soundPlayOrder`);
  }
  return mutation;
}

function projectExistingSoundActiveMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundActiveMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundActiveStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundActive");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound Active target requires immutable exact storage provenance.",
      `${path}.source.soundActiveStorage`,
    );
  }
  const expectedValue = readAreaSoundActiveStorage(source.soundActiveStorage);
  if (!expectedValue) {
    fail("Sound Active storage provenance is malformed.", `${path}.source.soundActiveStorage`);
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry Active storage provenance.",
      `${path}.source.soundActiveStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundActiveStorage(value.soundActive);
  if (!targetValue) {
    fail("Sound Active storage target is malformed.", `${path}.soundActive`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound Active mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundActiveStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundActiveMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Sound Active mutation is invalid.", `${path}.soundActive`);
  return mutation;
}

function projectExistingSoundScheduleMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundScheduleMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundScheduleStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundSchedule");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound schedule target requires immutable exact storage provenance.",
      `${path}.source.soundScheduleStorage`,
    );
  }
  const expectedValue = readAreaSoundScheduleStorage(source.soundScheduleStorage);
  if (!expectedValue) {
    fail("Sound schedule storage provenance is malformed.", `${path}.source.soundScheduleStorage`);
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry schedule storage provenance.",
      `${path}.source.soundScheduleStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundScheduleStorage(value.soundSchedule);
  if (!targetValue) {
    fail("Sound schedule storage target is malformed.", `${path}.soundSchedule`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound schedule mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundScheduleStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundScheduleMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Sound schedule mutation is invalid.", `${path}.soundSchedule`);
  return mutation;
}

function projectExistingSoundVolumeMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundVolumeMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "soundVolumeStorage");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundVolume");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound base-volume target requires immutable exact storage provenance.",
      `${path}.source.soundVolumeStorage`,
    );
  }
  const expectedValue = readAreaSoundVolumeStorage(source.soundVolumeStorage);
  if (!expectedValue) {
    fail("Sound base-volume storage provenance is malformed.", `${path}.source.soundVolumeStorage`);
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry base-volume storage provenance.",
      `${path}.source.soundVolumeStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundVolumeStorage(value.soundVolume);
  if (!targetValue) {
    fail("Sound base-volume storage target is malformed.", `${path}.soundVolume`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound base-volume mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundVolumeStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundVolumeMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Sound base-volume mutation is invalid.", `${path}.soundVolume`);
  return mutation;
}

function projectExistingSoundIntervalVariationMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaSoundIntervalVariationMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(
    source,
    "soundIntervalVariationStorage",
  );
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "soundIntervalVariation");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Sound interval/variation target requires immutable exact storage provenance.",
      `${path}.source.soundIntervalVariationStorage`,
    );
  }
  const expectedValue = readAreaSoundIntervalVariationStorage(
    source.soundIntervalVariationStorage,
  );
  if (!expectedValue) {
    fail(
      "Sound interval/variation storage provenance is malformed.",
      `${path}.source.soundIntervalVariationStorage`,
    );
  }
  if (retained.sourceKind !== "sound") {
    fail(
      "Only a retained Sound may carry interval/variation storage provenance.",
      `${path}.source.soundIntervalVariationStorage`,
    );
  }
  if (!hasTarget) return undefined;
  const targetValue = readAreaSoundIntervalVariationStorage(value.soundIntervalVariation);
  if (!targetValue) {
    fail(
      "Sound interval/variation storage target is malformed.",
      `${path}.soundIntervalVariation`,
    );
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A Sound interval/variation mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaSoundIntervalVariationStoragesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaSoundIntervalVariationMutation({
    kind: "sound",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedValue,
    value: targetValue,
  });
  if (!mutation) {
    fail(
      "Sound interval/variation mutation is invalid.",
      `${path}.soundIntervalVariation`,
    );
  }
  return mutation;
}

function projectExistingObjectPolygonMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ExistingAreaObjectPolygonMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "polygonGeometry");
  const hasTarget = Object.prototype.hasOwnProperty.call(value, "polygonGeometry");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A polygon target requires immutable exact native-local provenance.",
      `${path}.source.polygonGeometry`,
    );
  }
  const expectedGeometry = readAreaObjectPolygonGeometry(source.polygonGeometry);
  if (!expectedGeometry) {
    fail("Polygon provenance is malformed.", `${path}.source.polygonGeometry`);
  }
  if (retained.sourceKind !== "trigger" && retained.sourceKind !== "encounter") {
    fail(
      "Only retained Trigger and Encounter objects may carry polygon provenance.",
      `${path}.source.polygonGeometry`,
    );
  }
  if (!hasTarget) return undefined;
  const geometry = readAreaObjectPolygonGeometry(value.polygonGeometry);
  if (!geometry) {
    fail("Polygon target is malformed.", `${path}.polygonGeometry`);
  }
  if (retained.sourceIndex === undefined) {
    fail(
      "A polygon mutation requires an immutable family ordinal.",
      `${path}.source.sourceIndex`,
    );
  }
  if (areaObjectPolygonGeometriesEqual(expectedGeometry, geometry)) return undefined;
  const mutation = readExistingAreaObjectPolygonMutation({
    kind: retained.sourceKind,
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    expectedGeometry,
    geometry,
  });
  if (!mutation) fail("Polygon mutation is invalid.", `${path}.polygonGeometry`);
  return mutation;
}

function projectExistingDoorTransitionStorageMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
): ProjectedExistingAreaDoorTransitionStorageMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasSource = Object.prototype.hasOwnProperty.call(source, "doorTransitionStorage");
  const rawTransition = value.doorTransition;
  const transition = typeof rawTransition === "object" && rawTransition !== null &&
    !Array.isArray(rawTransition)
      ? rawTransition as Record<string, unknown>
      : undefined;
  const hasTarget = transition !== undefined &&
    Object.prototype.hasOwnProperty.call(transition, "storage");
  if (!hasSource && !hasTarget) return undefined;
  if (!hasSource) {
    fail(
      "A Door transition target requires immutable exact storage provenance.",
      `${path}.source.doorTransitionStorage`,
    );
  }
  if (!isAreaDoorTransitionStorage(source.doorTransitionStorage)) {
    fail("Door transition storage provenance is malformed.", `${path}.source.doorTransitionStorage`);
  }
  if (retained.sourceKind !== "door") {
    fail("Only a retained Door may carry Door transition storage provenance.", `${path}.source.doorTransitionStorage`);
  }
  if (!hasTarget) return undefined;
  if (!isAreaDoorTransitionStorage(transition?.storage)) {
    fail("Door transition storage target is malformed.", `${path}.doorTransition.storage`);
  }
  if (retained.sourceIndex === undefined) {
    fail("A Door transition mutation requires an immutable family ordinal.", `${path}.source.sourceIndex`);
  }
  if (areaDoorTransitionStorageEqual(source.doorTransitionStorage, transition.storage)) {
    return undefined;
  }
  return Object.freeze({
    kind: "door",
    sourceObjectId: retained.sourceObjectId,
    sourceIndex: retained.sourceIndex,
    transition: Object.freeze({
      expectedValue: cloneAreaDoorTransitionStorage(source.doorTransitionStorage),
      value: cloneAreaDoorTransitionStorage(transition.storage),
    }),
  });
}

function projectExistingObjectPropertyMutation(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  retained: ProjectedRetainedAreaObject,
  index: number,
  itemBaseItemCatalogInput: unknown,
): ProjectedExistingAreaObjectPropertyMutation | undefined {
  const path = `draft.payload.editableScene.objects.${index}`;
  const hasStoreEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "storeEditorComment",
  );
  const hasStoreCommerce = Object.prototype.hasOwnProperty.call(source, "storeCommerce");
  const hasStoreScripts = Object.prototype.hasOwnProperty.call(source, "storeScriptResRefs");
  const hasStoreVariables = Object.prototype.hasOwnProperty.call(source, "storeVariables");
  const hasStoreRestrictions = Object.prototype.hasOwnProperty.call(
    source,
    "storeRestrictions",
  );
  const hasStoreInventory = Object.prototype.hasOwnProperty.call(source, "storeInventory");
  const rawStoreProperties = typeof value.storeProperties === "object" &&
    value.storeProperties !== null && !Array.isArray(value.storeProperties)
      ? value.storeProperties as Record<string, unknown>
      : undefined;
  const hasTargetStoreCommerce = rawStoreProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(rawStoreProperties, "commerce");
  const hasTargetStoreScripts = rawStoreProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(rawStoreProperties, "scriptResRefs");
  const hasTargetStoreVariables = rawStoreProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(rawStoreProperties, "variables");
  const hasTargetStoreRestrictions = rawStoreProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(rawStoreProperties, "restrictions");
  const hasTargetStoreInventory = rawStoreProperties !== undefined &&
    Object.prototype.hasOwnProperty.call(rawStoreProperties, "inventoryBuckets");
  if (hasTargetStoreCommerce && !hasStoreCommerce) {
    fail(
      "A Store commerce target requires immutable exact source provenance.",
      `${path}.source.storeCommerce`,
    );
  }
  if (hasTargetStoreScripts && !hasStoreScripts) {
    fail(
      "A Store script target requires immutable exact source provenance.",
      `${path}.source.storeScriptResRefs`,
    );
  }
  if (hasTargetStoreVariables && !hasStoreVariables) {
    fail(
      "A Store VarTable target requires immutable exact source provenance.",
      `${path}.source.storeVariables`,
    );
  }
  if (hasTargetStoreRestrictions && !hasStoreRestrictions) {
    fail(
      "A Store restrictions target requires immutable exact source provenance.",
      `${path}.source.storeRestrictions`,
    );
  }
  if (hasTargetStoreInventory && !hasStoreInventory) {
    fail(
      "A Store inventory target requires immutable exact source provenance.",
      `${path}.source.storeInventory`,
    );
  }
  if (
    hasStoreEditorComment || hasStoreCommerce || hasStoreScripts || hasStoreVariables ||
    hasStoreRestrictions || hasStoreInventory
  ) {
    if (retained.sourceKind !== "store") {
      fail(
        "Only Stores may carry retained Store property provenance.",
        `${path}.source.${hasStoreInventory
          ? "storeInventory"
          : hasStoreRestrictions
          ? "storeRestrictions"
          : hasStoreVariables
          ? "storeVariables"
          : hasStoreScripts
          ? "storeScriptResRefs"
          : hasStoreCommerce ? "storeCommerce" : "storeEditorComment"}`,
      );
    }
    const storeProperties = record(value.storeProperties, `${path}.storeProperties`);
    const editorComment = hasStoreEditorComment
      ? projectStoreEditorCommentMutation(
          source.storeEditorComment,
          storeProperties.comments,
          `${path}.source.storeEditorComment`,
          `${path}.storeProperties.comments`,
        )
      : undefined;
    const commerce = hasStoreCommerce
      ? projectStoreCommerceMutation(
          source.storeCommerce,
          storeProperties.commerce,
          `${path}.source.storeCommerce`,
          `${path}.storeProperties.commerce`,
        )
      : undefined;
    const scripts = hasStoreScripts
      ? projectStoreScriptResRefsMutation(
          source.storeScriptResRefs,
          storeProperties.scriptResRefs,
          `${path}.source.storeScriptResRefs`,
          `${path}.storeProperties.scriptResRefs`,
        )
      : undefined;
    const variables = hasStoreVariables
      ? projectStoreVariableMutation(
          source.storeVariables,
          storeProperties.variables,
          `${path}.source.storeVariables`,
          `${path}.storeProperties.variables`,
        )
      : undefined;
    const restrictions = hasStoreRestrictions
      ? projectStoreRestrictionsMutation(
          source.storeRestrictions,
          storeProperties.restrictions,
          itemBaseItemCatalogInput,
          `${path}.source.storeRestrictions`,
          `${path}.storeProperties.restrictions`,
          "draft.payload.editableScene.itemBaseItemCatalog",
        )
      : undefined;
    const inventory = hasStoreInventory
      ? projectStoreInventoryMutation(
          source.storeInventory,
          storeProperties.inventoryBuckets,
          itemBaseItemCatalogInput,
          `${path}.source.storeInventory`,
          `${path}.storeProperties.inventoryBuckets`,
          "draft.payload.editableScene.itemBaseItemCatalog",
        )
      : undefined;
    if (!editorComment && !commerce && !scripts && !variables && !restrictions && !inventory) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "A Store property mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return Object.freeze({
      kind: "store",
      sourceObjectId: retained.sourceObjectId,
      sourceIndex: retained.sourceIndex,
      ...(editorComment ? { editorComment } : {}),
      ...(commerce ? { commerce } : {}),
      ...(scripts ? { scripts } : {}),
      ...(variables ? { variables } : {}),
      ...(restrictions ? { restrictions } : {}),
      ...(inventory ? { inventory } : {}),
    });
  }
  const hasWaypointTag = Object.prototype.hasOwnProperty.call(source, "waypointTag");
  const hasWaypointTemplateResRef = Object.prototype.hasOwnProperty.call(
    source,
    "waypointTemplateResRef",
  );
  const hasWaypointTemplateResRefTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointTemplateResRef",
  );
  const hasWaypointLocalizedName = Object.prototype.hasOwnProperty.call(
    source,
    "waypointLocalizedNameStorage",
  );
  const hasWaypointLocalizedNameTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointLocalizedName",
  );
  const hasWaypointDescription = Object.prototype.hasOwnProperty.call(
    source,
    "waypointDescriptionStorage",
  );
  const hasWaypointDescriptionTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointDescription",
  );
  const hasWaypointMapNote = Object.prototype.hasOwnProperty.call(
    source,
    "waypointMapNoteStorage",
  );
  const hasWaypointMapNoteTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointMapNote",
  );
  const hasWaypointAppearance = Object.prototype.hasOwnProperty.call(
    source,
    "waypointAppearance",
  );
  const hasWaypointAppearanceTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointAppearance",
  );
  const hasWaypointVariables = Object.prototype.hasOwnProperty.call(
    source,
    "waypointVariables",
  );
  const hasWaypointVariablesTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointVariables",
  );
  const hasWaypointEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "waypointEditorComment",
  );
  const hasWaypointEditorCommentTarget = Object.prototype.hasOwnProperty.call(
    value,
    "waypointEditorComment",
  );
  if (hasWaypointTemplateResRefTarget && !hasWaypointTemplateResRef) {
    fail(
      "Waypoint TemplateResRef target requires exact retained storage provenance.",
      `${path}.source.waypointTemplateResRef`,
    );
  }
  if (hasWaypointLocalizedNameTarget && !hasWaypointLocalizedName) {
    fail(
      "Waypoint LocalizedName target requires exact retained storage provenance.",
      `${path}.source.waypointLocalizedNameStorage`,
    );
  }
  if (hasWaypointDescriptionTarget && !hasWaypointDescription) {
    fail(
      "Waypoint Description target requires exact retained storage provenance.",
      `${path}.source.waypointDescriptionStorage`,
    );
  }
  if (hasWaypointEditorCommentTarget && !hasWaypointEditorComment) {
    fail(
      "Waypoint editor Comment target requires exact retained GIC provenance.",
      `${path}.source.waypointEditorComment`,
    );
  }
  if (hasWaypointMapNoteTarget && !hasWaypointMapNote) {
    fail(
      "Waypoint map-note target requires exact retained storage provenance.",
      `${path}.source.waypointMapNoteStorage`,
    );
  }
  if (hasWaypointAppearanceTarget && !hasWaypointAppearance) {
    fail(
      "Waypoint Appearance target requires exact table-bound Byte provenance.",
      `${path}.source.waypointAppearance`,
    );
  }
  if (hasWaypointVariablesTarget && !hasWaypointVariables) {
    fail(
      "Waypoint VarTable target requires exact retained provenance.",
      `${path}.source.waypointVariables`,
    );
  }
  if (
    hasWaypointTag || hasWaypointTemplateResRef || hasWaypointLocalizedName ||
    hasWaypointDescription || hasWaypointMapNote || hasWaypointAppearance ||
    hasWaypointVariables || hasWaypointEditorComment
  ) {
    if (retained.sourceKind !== "waypoint") {
      fail(
        "Only Waypoints may carry retained Waypoint property provenance.",
        hasWaypointTag
          ? `${path}.source.waypointTag`
          : hasWaypointTemplateResRef
            ? `${path}.source.waypointTemplateResRef`
          : hasWaypointLocalizedName
            ? `${path}.source.waypointLocalizedNameStorage`
            : hasWaypointDescription
              ? `${path}.source.waypointDescriptionStorage`
              : hasWaypointMapNote
                ? `${path}.source.waypointMapNoteStorage`
                : hasWaypointAppearance
                  ? `${path}.source.waypointAppearance`
                : hasWaypointVariables
                  ? `${path}.source.waypointVariables`
                  : `${path}.source.waypointEditorComment`,
      );
    }
    const tag = hasWaypointTag
      ? projectWaypointTagMutation(
          source.waypointTag,
          value.tag,
          `${path}.source.waypointTag`,
          `${path}.tag`,
        )
      : undefined;
    const templateResRef = hasWaypointTemplateResRef
      ? projectWaypointTemplateResRefMutation(
          source.waypointTemplateResRef,
          hasWaypointTemplateResRefTarget ? value.waypointTemplateResRef : undefined,
          `${path}.source.waypointTemplateResRef`,
          `${path}.waypointTemplateResRef`,
        )
      : undefined;
    const localizedName = hasWaypointLocalizedName
      ? projectWaypointLocalizedNameMutation(
          source.waypointLocalizedNameStorage,
          hasWaypointLocalizedNameTarget ? value.waypointLocalizedName : undefined,
          `${path}.source.waypointLocalizedNameStorage`,
          `${path}.waypointLocalizedName`,
        )
      : undefined;
    const description = hasWaypointDescription
      ? projectWaypointDescriptionMutation(
          source.waypointDescriptionStorage,
          hasWaypointDescriptionTarget ? value.waypointDescription : undefined,
          `${path}.source.waypointDescriptionStorage`,
          `${path}.waypointDescription`,
        )
      : undefined;
    const editorComment = hasWaypointEditorComment
      ? projectWaypointEditorCommentMutation(
          source.waypointEditorComment,
          hasWaypointEditorCommentTarget ? value.waypointEditorComment : undefined,
          `${path}.source.waypointEditorComment`,
          `${path}.waypointEditorComment`,
        )
      : undefined;
    const mapNote = hasWaypointMapNote
      ? projectWaypointMapNoteMutation(
          source.waypointMapNoteStorage,
          hasWaypointMapNoteTarget ? value.waypointMapNote : undefined,
          `${path}.source.waypointMapNoteStorage`,
          `${path}.waypointMapNote`,
        )
      : undefined;
    const appearance = hasWaypointAppearance
      ? projectWaypointAppearanceMutation(
          source.waypointAppearance,
          hasWaypointAppearanceTarget ? value.waypointAppearance : undefined,
          `${path}.source.waypointAppearance`,
          `${path}.waypointAppearance`,
        )
      : undefined;
    const variables = hasWaypointVariables
      ? projectWaypointVariableMutation(
          source.waypointVariables,
          hasWaypointVariablesTarget ? value.waypointVariables : undefined,
          `${path}.source.waypointVariables`,
          `${path}.waypointVariables`,
        )
      : undefined;
    if (!tag && !templateResRef && !localizedName && !description && !mapNote && !appearance && !variables &&
      !editorComment) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "A Waypoint property mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return Object.freeze({
      kind: "waypoint",
      sourceObjectId: retained.sourceObjectId,
      sourceIndex: retained.sourceIndex,
      ...(tag ? { tag } : {}),
      ...(templateResRef ? { templateResRef } : {}),
      ...(localizedName ? { localizedName } : {}),
      ...(description ? { description } : {}),
      ...(mapNote ? { mapNote } : {}),
      ...(appearance ? { appearance } : {}),
      ...(variables ? { variables } : {}),
      ...(editorComment ? { editorComment } : {}),
    });
  }
  const hasTriggerTag = Object.prototype.hasOwnProperty.call(source, "triggerTag");
  const hasTriggerTemplateResRef = Object.prototype.hasOwnProperty.call(
    source,
    "triggerTemplateResRef",
  );
  const hasTriggerTemplateResRefTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerTemplateResRef",
  );
  const hasTriggerLocalizedName = Object.prototype.hasOwnProperty.call(
    source,
    "triggerLocalizedNameStorage",
  );
  const hasTriggerLocalizedNameTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerLocalizedName",
  );
  const hasTriggerEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "triggerEditorComment",
  );
  const hasTriggerEditorCommentTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerEditorComment",
  );
  const hasTriggerScriptResRefs = Object.prototype.hasOwnProperty.call(
    source,
    "triggerScriptResRefsStorage",
  );
  const hasTriggerScriptResRefsTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerScriptResRefs",
  );
  const hasTriggerTransitionStorage = Object.prototype.hasOwnProperty.call(
    source,
    "triggerTransitionStorage",
  );
  const hasTriggerTransitionStorageTarget = Object.prototype.hasOwnProperty.call(
    value,
    "triggerTransitionStorage",
  );
  if (hasTriggerTemplateResRefTarget && !hasTriggerTemplateResRef) {
    fail(
      "Trigger TemplateResRef target requires exact retained storage provenance.",
      `${path}.source.triggerTemplateResRef`,
    );
  }
  if (hasTriggerLocalizedNameTarget && !hasTriggerLocalizedName) {
    fail(
      "Trigger LocalizedName target requires immutable exact storage provenance.",
      `${path}.source.triggerLocalizedNameStorage`,
    );
  }
  if (hasTriggerEditorCommentTarget && !hasTriggerEditorComment) {
    fail(
      "Trigger editor Comment target requires immutable exact paired-GIC provenance.",
      `${path}.source.triggerEditorComment`,
    );
  }
  if (hasTriggerScriptResRefsTarget && !hasTriggerScriptResRefs) {
    fail(
      "A Trigger script target requires immutable exact storage provenance.",
      `${path}.source.triggerScriptResRefsStorage`,
    );
  }
  if (hasTriggerTransitionStorageTarget && !hasTriggerTransitionStorage) {
    fail(
      "A Trigger transition target requires immutable exact storage provenance.",
      `${path}.source.triggerTransitionStorage`,
    );
  }
  if (
    hasTriggerTag || hasTriggerTemplateResRef || hasTriggerLocalizedName ||
    hasTriggerEditorComment || hasTriggerScriptResRefs || hasTriggerTransitionStorage
  ) {
    if (retained.sourceKind !== "trigger") {
      fail(
        "Only Triggers may carry retained Trigger property provenance.",
        `${path}.source.${hasTriggerTransitionStorage
          ? "triggerTransitionStorage"
          : hasTriggerScriptResRefs
          ? "triggerScriptResRefsStorage"
          : hasTriggerEditorComment
          ? "triggerEditorComment"
          : hasTriggerLocalizedName
          ? "triggerLocalizedNameStorage"
          : hasTriggerTemplateResRef
            ? "triggerTemplateResRef"
            : "triggerTag"}`,
      );
    }
    const tag = hasTriggerTag
      ? projectTriggerTagMutation(
          source.triggerTag,
          value.tag,
          `${path}.source.triggerTag`,
          `${path}.tag`,
        )
      : undefined;
    const templateResRef = hasTriggerTemplateResRef
      ? projectTriggerTemplateResRefMutation(
          source.triggerTemplateResRef,
          hasTriggerTemplateResRefTarget ? value.triggerTemplateResRef : undefined,
          `${path}.source.triggerTemplateResRef`,
          `${path}.triggerTemplateResRef`,
        )
      : undefined;
    const localizedName = hasTriggerLocalizedName
      ? projectTriggerLocalizedNameMutation(
          source.triggerLocalizedNameStorage,
          hasTriggerLocalizedNameTarget ? value.triggerLocalizedName : undefined,
          `${path}.source.triggerLocalizedNameStorage`,
          `${path}.triggerLocalizedName`,
        )
      : undefined;
    const editorComment = hasTriggerEditorComment
      ? projectTriggerEditorCommentMutation(
          source.triggerEditorComment,
          hasTriggerEditorCommentTarget ? value.triggerEditorComment : undefined,
          `${path}.source.triggerEditorComment`,
          `${path}.triggerEditorComment`,
        )
      : undefined;
    const scripts = hasTriggerScriptResRefs
      ? projectTriggerScriptResRefsMutation(
          source.triggerScriptResRefsStorage,
          hasTriggerScriptResRefsTarget ? value.triggerScriptResRefs : undefined,
          `${path}.source.triggerScriptResRefsStorage`,
          `${path}.triggerScriptResRefs`,
        )
      : undefined;
    const transitionStorage = hasTriggerTransitionStorage
      ? projectTriggerTransitionStorageMutation(
          source.triggerTransitionStorage,
          hasTriggerTransitionStorageTarget ? value.triggerTransitionStorage : undefined,
          `${path}.source.triggerTransitionStorage`,
          `${path}.triggerTransitionStorage`,
        )
      : undefined;
    if (
      !tag && !templateResRef && !localizedName && !editorComment && !scripts
      && !transitionStorage
    ) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "A Trigger property mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return Object.freeze({
      kind: "trigger",
      sourceObjectId: retained.sourceObjectId,
      sourceIndex: retained.sourceIndex,
      ...(tag ? { tag } : {}),
      ...(templateResRef ? { templateResRef } : {}),
      ...(localizedName ? { localizedName } : {}),
      ...(editorComment ? { editorComment } : {}),
      ...(scripts ? { scripts } : {}),
      ...(transitionStorage ? { transitionStorage } : {}),
    });
  }
  const hasEncounterTag = Object.prototype.hasOwnProperty.call(source, "encounterTag");
  const hasEncounterTemplateResRef = Object.prototype.hasOwnProperty.call(
    source,
    "encounterTemplateResRef",
  );
  const hasEncounterTemplateResRefTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterTemplateResRef",
  );
  const hasEncounterActive = Object.prototype.hasOwnProperty.call(
    source,
    "encounterActiveStorage",
  );
  const hasEncounterActiveTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterActive",
  );
  const hasEncounterPlayerOnly = Object.prototype.hasOwnProperty.call(
    source,
    "encounterPlayerOnlyStorage",
  );
  const hasEncounterPlayerOnlyTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterPlayerOnly",
  );
  const hasEncounterReset = Object.prototype.hasOwnProperty.call(
    source,
    "encounterResetStorage",
  );
  const hasEncounterResetTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterReset",
  );
  const hasEncounterResetTime = Object.prototype.hasOwnProperty.call(
    source,
    "encounterResetTimeStorage",
  );
  const hasEncounterResetTimeTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterResetTime",
  );
  const hasEncounterSpawnOption = Object.prototype.hasOwnProperty.call(
    source,
    "encounterSpawnOptionStorage",
  );
  const hasEncounterSpawnOptionTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterSpawnOption",
  );
  const hasEncounterRespawns = Object.prototype.hasOwnProperty.call(
    source,
    "encounterRespawnsStorage",
  );
  const hasEncounterRespawnsTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterRespawns",
  );
  const hasEncounterCreatureCounts = Object.prototype.hasOwnProperty.call(
    source,
    "encounterCreatureCountsStorage",
  );
  const hasEncounterCreatureCountsTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterCreatureCounts",
  );
  const hasEncounterScriptResRefs = Object.prototype.hasOwnProperty.call(
    source,
    "encounterScriptResRefsStorage",
  );
  const hasEncounterScriptResRefsTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterScriptResRefs",
  );
  const hasEncounterFaction = Object.prototype.hasOwnProperty.call(
    source,
    "encounterFaction",
  );
  const hasEncounterFactionTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterFactionId",
  );
  const hasEncounterDifficulty = Object.prototype.hasOwnProperty.call(
    source,
    "encounterDifficulty",
  );
  const hasEncounterDifficultyTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterDifficulty",
  );
  const hasEncounterLocalizedName = Object.prototype.hasOwnProperty.call(
    source,
    "encounterLocalizedNameStorage",
  );
  const hasEncounterLocalizedNameTarget = Object.prototype.hasOwnProperty.call(
    value,
    "encounterLocalizedName",
  );
  const hasEncounterEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "encounterEditorComment",
  );
  const hasEncounterVariables = Object.prototype.hasOwnProperty.call(
    source,
    "encounterVariables",
  );
  const hasEncounterCreatureList = Object.prototype.hasOwnProperty.call(
    source,
    "encounterCreatureList",
  );
  const hasEncounterSpawnPoints = Object.prototype.hasOwnProperty.call(
    source,
    "encounterSpawnPoints",
  );
  if (hasEncounterTemplateResRefTarget && !hasEncounterTemplateResRef) {
    fail(
      "Encounter TemplateResRef target requires exact retained storage provenance.",
      `${path}.source.encounterTemplateResRef`,
    );
  }
  if (hasEncounterActiveTarget && !hasEncounterActive) {
    fail(
      "An Encounter Active target requires immutable exact storage provenance.",
      `${path}.source.encounterActiveStorage`,
    );
  }
  if (hasEncounterPlayerOnlyTarget && !hasEncounterPlayerOnly) {
    fail(
      "An Encounter PlayerOnly target requires immutable exact storage provenance.",
      `${path}.source.encounterPlayerOnlyStorage`,
    );
  }
  if (hasEncounterResetTarget && !hasEncounterReset) {
    fail(
      "An Encounter Reset target requires immutable exact storage provenance.",
      `${path}.source.encounterResetStorage`,
    );
  }
  if (hasEncounterResetTimeTarget && !hasEncounterResetTime) {
    fail(
      "An Encounter ResetTime target requires immutable exact storage provenance.",
      `${path}.source.encounterResetTimeStorage`,
    );
  }
  if (hasEncounterSpawnOptionTarget && !hasEncounterSpawnOption) {
    fail(
      "An Encounter SpawnOption target requires immutable exact storage provenance.",
      `${path}.source.encounterSpawnOptionStorage`,
    );
  }
  if (hasEncounterRespawnsTarget && !hasEncounterRespawns) {
    fail(
      "An Encounter Respawns target requires immutable exact storage provenance.",
      `${path}.source.encounterRespawnsStorage`,
    );
  }
  if (hasEncounterCreatureCountsTarget && !hasEncounterCreatureCounts) {
    fail(
      "An Encounter creature-count target requires immutable exact storage provenance.",
      `${path}.source.encounterCreatureCountsStorage`,
    );
  }
  if (hasEncounterScriptResRefsTarget && !hasEncounterScriptResRefs) {
    fail(
      "An Encounter script target requires immutable exact storage provenance.",
      `${path}.source.encounterScriptResRefsStorage`,
    );
  }
  if (hasEncounterFactionTarget && !hasEncounterFaction) {
    fail(
      "An Encounter Faction target requires immutable catalog-bound provenance.",
      `${path}.source.encounterFaction`,
    );
  }
  if (hasEncounterDifficultyTarget && !hasEncounterDifficulty) {
    fail(
      "An Encounter Difficulty target requires immutable catalog-bound provenance.",
      `${path}.source.encounterDifficulty`,
    );
  }
  if (hasEncounterLocalizedNameTarget && !hasEncounterLocalizedName) {
    fail(
      "An Encounter LocalizedName target requires immutable exact storage provenance.",
      `${path}.source.encounterLocalizedNameStorage`,
    );
  }
  if (
    hasEncounterTag
    || hasEncounterTemplateResRef
    || hasEncounterActive
    || hasEncounterPlayerOnly
    || hasEncounterReset
    || hasEncounterResetTime
    || hasEncounterSpawnOption
    || hasEncounterRespawns
    || hasEncounterCreatureCounts
    || hasEncounterScriptResRefs
    || hasEncounterFaction
    || hasEncounterDifficulty
    || hasEncounterLocalizedName
    || hasEncounterVariables
    || hasEncounterCreatureList
    || hasEncounterSpawnPoints
    || hasEncounterEditorComment
  ) {
    if (retained.sourceKind !== "encounter") {
      fail(
        "Only Encounters may carry retained Encounter property provenance.",
        `${path}.source.${hasEncounterSpawnPoints
          ? "encounterSpawnPoints"
          : hasEncounterCreatureList
          ? "encounterCreatureList"
          : hasEncounterVariables
          ? "encounterVariables"
          : hasEncounterEditorComment
          ? "encounterEditorComment"
          : hasEncounterLocalizedName
          ? "encounterLocalizedNameStorage"
          : hasEncounterFaction
            ? "encounterFaction"
          : hasEncounterDifficulty
            ? "encounterDifficulty"
          : hasEncounterScriptResRefs
            ? "encounterScriptResRefsStorage"
          : hasEncounterCreatureCounts
            ? "encounterCreatureCountsStorage"
          : hasEncounterRespawns
            ? "encounterRespawnsStorage"
          : hasEncounterSpawnOption
            ? "encounterSpawnOptionStorage"
          : hasEncounterResetTime
            ? "encounterResetTimeStorage"
            : hasEncounterReset
              ? "encounterResetStorage"
              : hasEncounterPlayerOnly
                ? "encounterPlayerOnlyStorage"
                : hasEncounterActive
                  ? "encounterActiveStorage"
                  : hasEncounterTemplateResRef
                    ? "encounterTemplateResRef"
                    : "encounterTag"}`,
      );
    }
    const tag = hasEncounterTag
      ? projectEncounterTagMutation(
          source.encounterTag,
          value.tag,
          `${path}.source.encounterTag`,
          `${path}.tag`,
        )
      : undefined;
    const templateResRef = hasEncounterTemplateResRef
      ? projectEncounterTemplateResRefMutation(
          source.encounterTemplateResRef,
          hasEncounterTemplateResRefTarget ? value.encounterTemplateResRef : undefined,
          `${path}.source.encounterTemplateResRef`,
          `${path}.encounterTemplateResRef`,
        )
      : undefined;
    const active = hasEncounterActive
      ? projectEncounterActiveMutation(
          source.encounterActiveStorage,
          hasEncounterActiveTarget ? value.encounterActive : undefined,
          `${path}.source.encounterActiveStorage`,
          `${path}.encounterActive`,
        )
      : undefined;
    const playerOnly = hasEncounterPlayerOnly
      ? projectEncounterPlayerOnlyMutation(
          source.encounterPlayerOnlyStorage,
          hasEncounterPlayerOnlyTarget ? value.encounterPlayerOnly : undefined,
          `${path}.source.encounterPlayerOnlyStorage`,
          `${path}.encounterPlayerOnly`,
        )
      : undefined;
    const reset = hasEncounterReset
      ? projectEncounterResetMutation(
          source.encounterResetStorage,
          hasEncounterResetTarget ? value.encounterReset : undefined,
          `${path}.source.encounterResetStorage`,
          `${path}.encounterReset`,
        )
      : undefined;
    const resetTime = hasEncounterResetTime
      ? projectEncounterResetTimeMutation(
          source.encounterResetTimeStorage,
          hasEncounterResetTimeTarget ? value.encounterResetTime : undefined,
          `${path}.source.encounterResetTimeStorage`,
          `${path}.encounterResetTime`,
        )
      : undefined;
    const spawnOption = hasEncounterSpawnOption
      ? projectEncounterSpawnOptionMutation(
          source.encounterSpawnOptionStorage,
          hasEncounterSpawnOptionTarget ? value.encounterSpawnOption : undefined,
          `${path}.source.encounterSpawnOptionStorage`,
          `${path}.encounterSpawnOption`,
        )
      : undefined;
    const respawns = hasEncounterRespawns
      ? projectEncounterRespawnsMutation(
          source.encounterRespawnsStorage,
          hasEncounterRespawnsTarget ? value.encounterRespawns : undefined,
          `${path}.source.encounterRespawnsStorage`,
          `${path}.encounterRespawns`,
        )
      : undefined;
    const creatureCounts = hasEncounterCreatureCounts
      ? projectEncounterCreatureCountMutation(
          source.encounterCreatureCountsStorage,
          hasEncounterCreatureCountsTarget ? value.encounterCreatureCounts : undefined,
          `${path}.source.encounterCreatureCountsStorage`,
          `${path}.encounterCreatureCounts`,
        )
      : undefined;
    const scripts = hasEncounterScriptResRefs
      ? projectEncounterScriptResRefsMutation(
          source.encounterScriptResRefsStorage,
          hasEncounterScriptResRefsTarget ? value.encounterScriptResRefs : undefined,
          `${path}.source.encounterScriptResRefsStorage`,
          `${path}.encounterScriptResRefs`,
        )
      : undefined;
    const faction = hasEncounterFaction
      ? projectEncounterFactionMutation(
          source.encounterFaction,
          hasEncounterFactionTarget ? value.encounterFactionId : undefined,
          `${path}.source.encounterFaction`,
          `${path}.encounterFactionId`,
        )
      : undefined;
    const difficulty = hasEncounterDifficulty
      ? projectEncounterDifficultyMutation(
          source.encounterDifficulty,
          hasEncounterDifficultyTarget ? value.encounterDifficulty : undefined,
          `${path}.source.encounterDifficulty`,
          `${path}.encounterDifficulty`,
        )
      : undefined;
    const localizedName = hasEncounterLocalizedName
      ? projectEncounterLocalizedNameMutation(
          source.encounterLocalizedNameStorage,
          hasEncounterLocalizedNameTarget ? value.encounterLocalizedName : undefined,
          `${path}.source.encounterLocalizedNameStorage`,
          `${path}.encounterLocalizedName`,
        )
      : undefined;
    const editorComment = hasEncounterEditorComment
      ? projectEncounterEditorCommentMutation(
          source.encounterEditorComment,
          record(value.encounterProperties, `${path}.encounterProperties`).comments,
          `${path}.source.encounterEditorComment`,
          `${path}.encounterProperties.comments`,
        )
      : undefined;
    const variables = hasEncounterVariables
      ? projectEncounterVariableMutation(
          source.encounterVariables,
          record(value.encounterProperties, `${path}.encounterProperties`).variables,
          `${path}.source.encounterVariables`,
          `${path}.encounterProperties.variables`,
        )
      : undefined;
    const creatureList = hasEncounterCreatureList
      ? projectEncounterCreatureListMutation(
          source.encounterCreatureList,
          record(value.encounterProperties, `${path}.encounterProperties`).creatureList,
          `${path}.source.encounterCreatureList`,
          `${path}.encounterProperties.creatureList`,
        )
      : undefined;
    const spawnPoints = hasEncounterSpawnPoints
      ? projectEncounterSpawnPointListMutation(
          source.encounterSpawnPoints,
          record(value.encounterProperties, `${path}.encounterProperties`).spawnPoints,
          `${path}.source.encounterSpawnPoints`,
          `${path}.encounterProperties.spawnPoints`,
        )
      : undefined;
    if (
      !tag
      && !templateResRef
      && !active
      && !playerOnly
      && !reset
      && !resetTime
      && !spawnOption
      && !respawns
      && !creatureCounts
      && !scripts
      && !faction
      && !difficulty
      && !localizedName
      && !variables
      && !creatureList
      && !spawnPoints
      && !editorComment
    ) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "An Encounter property mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return Object.freeze({
      kind: "encounter",
      sourceObjectId: retained.sourceObjectId,
      sourceIndex: retained.sourceIndex,
      ...(tag ? { tag } : {}),
      ...(templateResRef ? { templateResRef } : {}),
      ...(active ? { active } : {}),
      ...(playerOnly ? { playerOnly } : {}),
      ...(reset ? { reset } : {}),
      ...(resetTime ? { resetTime } : {}),
      ...(spawnOption ? { spawnOption } : {}),
      ...(respawns ? { respawns } : {}),
      ...(creatureCounts ? { creatureCounts } : {}),
      ...(scripts ? { scripts } : {}),
      ...(faction ? { faction } : {}),
      ...(difficulty ? { difficulty } : {}),
      ...(localizedName ? { localizedName } : {}),
      ...(variables ? { variables } : {}),
      ...(creatureList ? { creatureList } : {}),
      ...(spawnPoints ? { spawnPoints } : {}),
      ...(editorComment ? { editorComment } : {}),
    });
  }
  const hasItemEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "itemEditorComment",
  );
  const hasItemInstanceState = Object.prototype.hasOwnProperty.call(
    source,
    "itemInstanceState",
  );
  const hasItemTag = Object.prototype.hasOwnProperty.call(source, "itemTag");
  const hasItemTemplateResRef = Object.prototype.hasOwnProperty.call(
    source,
    "itemTemplateResRef",
  );
  const hasItemLocalizedStrings = Object.prototype.hasOwnProperty.call(
    source,
    "itemLocalizedStrings",
  );
  const hasItemVariables = Object.prototype.hasOwnProperty.call(source, "itemVariables");
  const hasItemPropertyList = Object.prototype.hasOwnProperty.call(
    source,
    "itemPropertyList",
  );
  const hasItemBaseAppearance = Object.prototype.hasOwnProperty.call(
    source,
    "itemBaseAppearance",
  );
  const hasItemInventoryItems = Object.prototype.hasOwnProperty.call(
    source,
    "itemInventoryItems",
  );
  const hasItemVisualTransform = Object.prototype.hasOwnProperty.call(
    source,
    "itemVisualTransform",
  );
  if (
    hasItemEditorComment || hasItemInstanceState || hasItemTag ||
    hasItemTemplateResRef || hasItemLocalizedStrings || hasItemVariables ||
    hasItemPropertyList || hasItemBaseAppearance || hasItemInventoryItems ||
    hasItemVisualTransform
  ) {
    if (retained.sourceKind !== "item") {
      fail(
        "Only ground items may carry retained Item property provenance.",
        `${path}.source.${hasItemTemplateResRef
          ? "itemTemplateResRef"
          : hasItemTag
          ? "itemTag"
          : hasItemInstanceState
            ? "itemInstanceState"
            : hasItemLocalizedStrings
              ? "itemLocalizedStrings"
              : hasItemVariables
                ? "itemVariables"
                : hasItemPropertyList
                  ? "itemPropertyList"
                  : hasItemBaseAppearance
                    ? "itemBaseAppearance"
                    : hasItemInventoryItems
                      ? "itemInventoryItems"
                      : hasItemVisualTransform
                        ? "itemVisualTransform"
                        : "itemEditorComment"}`,
      );
    }
    const itemProperties = hasItemEditorComment || hasItemInstanceState ||
      hasItemLocalizedStrings || hasItemVariables || hasItemPropertyList ||
      hasItemBaseAppearance || hasItemInventoryItems || hasItemVisualTransform
      ? record(value.itemProperties, `${path}.itemProperties`)
      : undefined;
    const tag = hasItemTag
      ? projectItemTagMutation(
          source.itemTag,
          value.tag,
          `${path}.source.itemTag`,
          `${path}.tag`,
        )
      : undefined;
    const templateResRef = hasItemTemplateResRef
      ? projectItemTemplateResRefMutation(
          source.itemTemplateResRef,
          value.resRef,
          `${path}.source.itemTemplateResRef`,
          `${path}.resRef`,
        )
      : undefined;
    const editorComment = hasItemEditorComment
      ? projectItemEditorCommentMutation(
          source.itemEditorComment,
          itemProperties?.comments,
          `${path}.source.itemEditorComment`,
          `${path}.itemProperties.comments`,
        )
      : undefined;
    const instanceState = hasItemInstanceState
      ? projectItemInstanceStateMutation(
          source.itemInstanceState,
          itemProperties!,
          `${path}.source.itemInstanceState`,
          `${path}.itemProperties`,
        )
      : undefined;
    const localizedStrings = hasItemLocalizedStrings
      ? projectItemLocalizedStringMutations(
          source.itemLocalizedStrings,
          itemProperties,
          retained.sourceIndex,
          `${path}.source.itemLocalizedStrings`,
          `${path}.itemProperties`,
          `${path}.source.sourceIndex`,
        )
      : undefined;
    const variables = hasItemVariables
      ? projectItemVariableMutation(
          source.itemVariables,
          itemProperties?.variables,
          `${path}.source.itemVariables`,
          `${path}.itemProperties.variables`,
        )
      : undefined;
    const propertyList = hasItemPropertyList
      ? projectItemPropertyListMutation(
          source.itemPropertyList,
          itemProperties?.propertyList,
          `${path}.source.itemPropertyList`,
          `${path}.itemProperties.propertyList`,
        )
      : undefined;
    const baseAppearance = hasItemBaseAppearance
      ? projectItemBaseAppearanceMutation(
          source.itemBaseAppearance,
          itemProperties?.baseAppearance,
          `${path}.source.itemBaseAppearance`,
          `${path}.itemProperties.baseAppearance`,
        )
      : undefined;
    const inventory = hasItemInventoryItems
      ? projectItemInventoryMutation(
          source.itemInventoryItems,
          itemProperties?.inventoryItems,
          `${path}.source.itemInventoryItems`,
          `${path}.itemProperties.inventoryItems`,
        )
      : undefined;
    const visualTransform = hasItemVisualTransform
      ? projectItemVisualTransformMutation(
          source.itemVisualTransform,
          itemProperties?.visualTransform,
          `${path}.source.itemVisualTransform`,
          `${path}.itemProperties.visualTransform`,
        )
      : undefined;
    if (
      !tag && !templateResRef && !editorComment && !instanceState &&
      !localizedStrings && !variables && !propertyList && !baseAppearance &&
      !inventory && !visualTransform
    ) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "An Item property mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return Object.freeze({
      kind: "item",
      sourceObjectId: retained.sourceObjectId,
      sourceIndex: retained.sourceIndex,
      ...(tag ? { tag } : {}),
      ...(templateResRef ? { templateResRef } : {}),
      ...(instanceState ? { instanceState } : {}),
      ...(editorComment ? { editorComment } : {}),
      ...(localizedStrings ? { localizedStrings } : {}),
      ...(variables ? { variables } : {}),
      ...(propertyList ? { propertyList } : {}),
      ...(baseAppearance ? { baseAppearance } : {}),
      ...(inventory ? { inventory } : {}),
      ...(visualTransform ? { visualTransform } : {}),
    });
  }
  const hasCreatureTag = Object.prototype.hasOwnProperty.call(source, "creatureTag");
  const hasCreatureConversation = Object.prototype.hasOwnProperty.call(
    source,
    "creatureConversation",
  );
  const hasCreatureInterruptable = Object.prototype.hasOwnProperty.call(
    source,
    "creatureInterruptable",
  );
  const hasCreatureAdvancedFlags = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAdvancedFlags",
  );
  const hasCreatureBodyBag = Object.prototype.hasOwnProperty.call(source, "creatureBodyBag");
  const hasCreatureDecayTime = Object.prototype.hasOwnProperty.call(
    source,
    "creatureDecayTime",
  );
  const hasCreatureAppearance = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAppearance",
  );
  const hasCreatureGender = Object.prototype.hasOwnProperty.call(source, "creatureGender");
  const hasCreaturePerceptionRange = Object.prototype.hasOwnProperty.call(
    source,
    "creaturePerceptionRange",
  );
  const hasCreatureWalkRate = Object.prototype.hasOwnProperty.call(source, "creatureWalkRate");
  const hasCreatureSoundSetFile = Object.prototype.hasOwnProperty.call(
    source,
    "creatureSoundSetFile",
  );
  const hasCreatureStartingPackage = Object.prototype.hasOwnProperty.call(
    source,
    "creatureStartingPackage",
  );
  const hasCreatureSkillList = Object.prototype.hasOwnProperty.call(
    source,
    "creatureSkillList",
  );
  const hasCreatureFeatList = Object.prototype.hasOwnProperty.call(
    source,
    "creatureFeatList",
  );
  const hasCreatureSpecialAbilityList = Object.prototype.hasOwnProperty.call(
    source,
    "creatureSpecialAbilityList",
  );
  const hasCreatureVariables = Object.prototype.hasOwnProperty.call(
    source,
    "creatureVariables",
  );
  const hasCreatureEditorComment = Object.prototype.hasOwnProperty.call(
    source,
    "creatureEditorComment",
  );
  const hasCreatureClassLevelState = Object.prototype.hasOwnProperty.call(
    source,
    "creatureClassLevelState",
  );
  const hasCreatureClassIdentityState = Object.prototype.hasOwnProperty.call(
    source,
    "creatureClassIdentityState",
  );
  const hasCreaturePhenotype = Object.prototype.hasOwnProperty.call(
    source,
    "creaturePhenotype",
  );
  const hasCreaturePortrait = Object.prototype.hasOwnProperty.call(
    source,
    "creaturePortrait",
  );
  const hasCreatureChallengeRating = Object.prototype.hasOwnProperty.call(
    source,
    "creatureChallengeRating",
  );
  const hasCreatureAbilityScores = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAbilityScores",
  );
  const hasCreatureAppearanceColors = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAppearanceColors",
  );
  const hasCreatureBodyParts = Object.prototype.hasOwnProperty.call(
    source,
    "creatureBodyParts",
  );
  const hasCreatureAppendages = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAppendages",
  );
  const hasCreatureHitPointState = Object.prototype.hasOwnProperty.call(
    source,
    "creatureHitPointState",
  );
  const hasCreatureNaturalArmorClass = Object.prototype.hasOwnProperty.call(
    source,
    "creatureNaturalArmorClass",
  );
  const hasCreatureSavingThrowBonuses = Object.prototype.hasOwnProperty.call(
    source,
    "creatureSavingThrowBonuses",
  );
  const hasCreatureAlignment = Object.prototype.hasOwnProperty.call(
    source,
    "creatureAlignment",
  );
  const hasCreatureFaction = Object.prototype.hasOwnProperty.call(
    source,
    "creatureFaction",
  );
  const hasCreatureTemplateResRef = Object.prototype.hasOwnProperty.call(
    source,
    "creatureTemplateResRef",
  );
  const hasCreatureSpecialIdentityStrings = Object.prototype.hasOwnProperty.call(
    source,
    "creatureSpecialIdentityStrings",
  );
  const hasCreatureScriptResRefs = Object.prototype.hasOwnProperty.call(
    source,
    "creatureScriptResRefs",
  );
  const hasCreatureLocalizedStrings = Object.prototype.hasOwnProperty.call(
    source,
    "creatureLocalizedStrings",
  );
  const hasCreatureInventoryEntries = source.creatureInventoryItems !== undefined;
  const hasCreatureEquipmentEntries = source.creatureEquippedItems !== undefined;
  if (
    hasCreatureTag ||
    hasCreatureConversation ||
    hasCreatureInterruptable ||
    hasCreatureAdvancedFlags ||
    hasCreatureBodyBag ||
    hasCreatureDecayTime ||
    hasCreatureAppearance ||
    hasCreatureGender ||
    hasCreaturePerceptionRange ||
    hasCreatureWalkRate ||
    hasCreatureSoundSetFile ||
    hasCreatureStartingPackage ||
    hasCreatureSkillList ||
    hasCreatureFeatList ||
    hasCreatureSpecialAbilityList ||
    hasCreatureVariables ||
    hasCreatureEditorComment ||
    hasCreatureClassIdentityState ||
    hasCreaturePhenotype ||
    hasCreaturePortrait ||
    hasCreatureChallengeRating ||
    hasCreatureAbilityScores ||
    hasCreatureAppearanceColors ||
    hasCreatureBodyParts ||
    hasCreatureAppendages ||
    hasCreatureHitPointState ||
    hasCreatureNaturalArmorClass ||
    hasCreatureSavingThrowBonuses ||
    hasCreatureAlignment ||
    hasCreatureFaction ||
    hasCreatureTemplateResRef ||
    hasCreatureSpecialIdentityStrings ||
    hasCreatureScriptResRefs ||
    hasCreatureLocalizedStrings ||
    hasCreatureInventoryEntries ||
    hasCreatureEquipmentEntries
  ) {
    if (retained.sourceKind !== "creature") {
      fail(
        "Only creatures may carry retained Creature Tag, Conversation, Interruptable, advanced flags, BodyBag, DecayTime, Appearance, FactionID, TemplateResRef, Subrace, Deity, script ResRef, name, inventory, or equipment provenance.",
        `${path}.source.${hasCreatureTag
          ? "creatureTag"
          : hasCreatureConversation
            ? "creatureConversation"
            : hasCreatureInterruptable
              ? "creatureInterruptable"
              : hasCreatureAdvancedFlags
                ? "creatureAdvancedFlags"
                : hasCreatureBodyBag
                  ? "creatureBodyBag"
                  : hasCreatureDecayTime
                    ? "creatureDecayTime"
                    : hasCreatureAppearance
                      ? "creatureAppearance"
                      : hasCreatureGender
                        ? "creatureGender"
                        : hasCreaturePerceptionRange
                          ? "creaturePerceptionRange"
                          : hasCreatureWalkRate
                            ? "creatureWalkRate"
                             : hasCreatureSoundSetFile
                               ? "creatureSoundSetFile"
                               : hasCreatureStartingPackage
                                 ? "creatureStartingPackage"
                                 : hasCreatureSkillList
                                   ? "creatureSkillList"
                                 : hasCreatureFeatList
                                   ? "creatureFeatList"
                                 : hasCreatureSpecialAbilityList
                                   ? "creatureSpecialAbilityList"
                                 : hasCreatureVariables
                                   ? "creatureVariables"
                                 : hasCreatureEditorComment
                                   ? "creatureEditorComment"
                                 : hasCreaturePhenotype
                                   ? "creaturePhenotype"
                          : hasCreaturePortrait
                            ? "creaturePortrait"
                      : hasCreatureChallengeRating
                        ? "creatureChallengeRating"
                        : hasCreatureAbilityScores
                          ? "creatureAbilityScores"
                          : hasCreatureAppearanceColors
                            ? "creatureAppearanceColors"
                          : hasCreatureBodyParts
                            ? "creatureBodyParts"
                          : hasCreatureAppendages
                            ? "creatureAppendages"
                          : hasCreatureHitPointState
                            ? "creatureHitPointState"
                          : hasCreatureNaturalArmorClass
                            ? "creatureNaturalArmorClass"
                             : hasCreatureSavingThrowBonuses
                               ? "creatureSavingThrowBonuses"
                               : hasCreatureAlignment
                                 ? "creatureAlignment"
                        : hasCreatureFaction
                         ? "creatureFaction"
                        : hasCreatureTemplateResRef
                          ? "creatureTemplateResRef"
                          : hasCreatureSpecialIdentityStrings
                            ? "creatureSpecialIdentityStrings"
                          : hasCreatureScriptResRefs
                            ? "creatureScriptResRefs"
                          : hasCreatureLocalizedStrings
                            ? "creatureLocalizedStrings"
                            : hasCreatureInventoryEntries
                              ? "creatureInventoryItems"
                              : "creatureEquippedItems"}`,
      );
    }
    if (Object.prototype.hasOwnProperty.call(value, "placeableProperties")) {
      fail(
        "A Creature Tag, Conversation, Interruptable, advanced flags, BodyBag, DecayTime, Appearance, FactionID, TemplateResRef, Subrace, Deity, script ResRef, name, inventory, or equipment mutation cannot carry Placeable properties.",
        `${path}.placeableProperties`,
      );
    }
    const creatureTag = hasCreatureTag
      ? projectCreatureTagMutation(
          source.creatureTag,
          value.tag,
          `${path}.source.creatureTag`,
          `${path}.tag`,
        )
      : undefined;
    const creatureConversation = hasCreatureConversation
      ? projectCreatureConversationMutation(
          source.creatureConversation,
          record(value.creatureProperties, `${path}.creatureProperties`).conversation,
          `${path}.source.creatureConversation`,
          `${path}.creatureProperties.conversation`,
        )
      : undefined;
    const creatureInterruptable = hasCreatureInterruptable
      ? projectCreatureInterruptableMutation(
          source.creatureInterruptable,
          value.creatureProperties,
          `${path}.source.creatureInterruptable`,
          `${path}.creatureProperties`,
          `${path}.creatureProperties.noInterrupt`,
        )
      : undefined;
    const creatureAdvancedFlags = hasCreatureAdvancedFlags
      ? projectCreatureAdvancedFlagMutations(
          source.creatureAdvancedFlags,
          value.creatureProperties,
          `${path}.source.creatureAdvancedFlags`,
          `${path}.creatureProperties`,
        )
      : undefined;
    const creatureBodyBag = hasCreatureBodyBag
      ? projectCreatureBodyBagMutation(
          source.creatureBodyBag,
          source.creatureAdvancedFlags,
          value.creatureProperties,
          `${path}.source.creatureBodyBag`,
          `${path}.source.creatureAdvancedFlags`,
          `${path}.creatureProperties`,
        )
      : undefined;
    const creatureDecayTime = hasCreatureDecayTime
      ? projectCreatureDecayTimeMutation(
          source.creatureDecayTime,
          source.creatureAdvancedFlags,
          value.creatureProperties,
          `${path}.source.creatureDecayTime`,
          `${path}.source.creatureAdvancedFlags`,
          `${path}.creatureProperties`,
        )
      : undefined;
    const creatureAppearance = hasCreatureAppearance
      ? projectCreatureAppearanceMutation(
          source.creatureAppearance,
          value.creatureProperties,
          `${path}.source.creatureAppearance`,
          `${path}.creatureProperties.appearanceType`,
        )
      : undefined;
    const creatureGender = hasCreatureGender
      ? projectCreatureGenderMutation(
          source.creatureGender,
          value.creatureProperties,
          `${path}.source.creatureGender`,
          `${path}.creatureProperties.genderId`,
        )
      : undefined;
    const creaturePerceptionRange = hasCreaturePerceptionRange
      ? projectCreaturePerceptionRangeMutation(
          source.creaturePerceptionRange,
          value.creatureProperties,
          `${path}.source.creaturePerceptionRange`,
          `${path}.creatureProperties.advancedSettings.perceptionRangeId`,
        )
      : undefined;
    const creatureWalkRate = hasCreatureWalkRate
      ? projectCreatureWalkRateMutation(
          source.creatureWalkRate,
          value.creatureProperties,
          `${path}.source.creatureWalkRate`,
          `${path}.creatureProperties.advancedSettings.walkRateId`,
        )
      : undefined;
    const creatureSoundSetFile = hasCreatureSoundSetFile
      ? projectCreatureSoundSetFileMutation(
          source.creatureSoundSetFile,
          value.creatureProperties,
          `${path}.source.creatureSoundSetFile`,
          `${path}.creatureProperties.advancedSettings.soundSetFile`,
        )
      : undefined;
    const creatureClassSlotResize = hasCreatureClassIdentityState
      ? projectCreatureClassSlotResizeMutation(
          source.creatureClassIdentityState,
          source.creatureStartingPackage,
          value.creatureProperties,
          `${path}.source.creatureClassIdentityState`,
          `${path}.source.creatureStartingPackage`,
          `${path}.creatureProperties.classEntries`,
        )
      : undefined;
    const creatureClassIdentity = hasCreatureClassIdentityState && !creatureClassSlotResize
      ? projectCreatureClassIdentityMutation(
          source.creatureClassIdentityState,
          source.creatureStartingPackage,
          value.creatureProperties,
          `${path}.source.creatureClassIdentityState`,
          `${path}.source.creatureStartingPackage`,
          `${path}.creatureProperties.classEntries`,
        )
      : undefined;
    const creatureStartingPackage = hasCreatureStartingPackage && !creatureClassIdentity &&
      !creatureClassSlotResize
      ? projectCreatureStartingPackageMutation(
          source.creatureStartingPackage,
          value.creatureProperties,
          `${path}.source.creatureStartingPackage`,
          `${path}.creatureProperties.advancedSettings.startingPackageId`,
        )
      : undefined;
    const creatureSkillList = hasCreatureSkillList
      ? projectCreatureSkillListMutation(
          source.creatureSkillList,
          value.creatureProperties,
          `${path}.source.creatureSkillList`,
          `${path}.creatureProperties.skills`,
        )
      : undefined;
    const creatureFeatList = hasCreatureFeatList
      ? projectCreatureFeatListMutation(
          source.creatureFeatList,
          value.creatureProperties,
          `${path}.source.creatureFeatList`,
          `${path}.creatureProperties.feats`,
        )
      : undefined;
    const creatureSpecialAbilityList = hasCreatureSpecialAbilityList
      ? projectCreatureSpecialAbilityListMutation(
          source.creatureSpecialAbilityList,
          value.creatureProperties,
          `${path}.source.creatureSpecialAbilityList`,
          `${path}.creatureProperties.specialAbilities`,
        )
      : undefined;
    const creatureVariables = hasCreatureVariables
      ? projectCreatureVariableMutation(
          source.creatureVariables,
          record(value.creatureProperties, `${path}.creatureProperties`).variables,
          `${path}.source.creatureVariables`,
          `${path}.creatureProperties.variables`,
        )
      : undefined;
    const creatureEditorComment = hasCreatureEditorComment
      ? projectCreatureEditorCommentMutation(
          source.creatureEditorComment,
          record(value.creatureProperties, `${path}.creatureProperties`).comments,
          `${path}.source.creatureEditorComment`,
          `${path}.creatureProperties.comments`,
        )
      : undefined;
    const creatureClassLevels = hasCreatureClassLevelState && !creatureClassSlotResize
      ? projectCreatureClassLevelMutation(
          source.creatureClassLevelState,
          value.creatureProperties,
          `${path}.source.creatureClassLevelState`,
          `${path}.creatureProperties.classEntries`,
          creatureClassIdentity !== undefined,
        )
      : undefined;
    const creatureClassLevelTarget = creatureClassLevels ??
      (creatureClassIdentity?.levels.some(
        (level, index) => level !== creatureClassIdentity.expectedLevels[index],
      ) ? creatureClassIdentity : undefined) ?? creatureClassSlotResize;
    const creaturePhenotype = hasCreaturePhenotype
      ? projectCreaturePhenotypeMutation(
          source.creaturePhenotype,
          source.creatureAppearance,
          value.creatureProperties,
          `${path}.source.creaturePhenotype`,
          `${path}.source.creatureAppearance`,
          `${path}.creatureProperties.phenotypeId`,
        )
      : undefined;
    const creaturePortrait = hasCreaturePortrait
      ? projectCreaturePortraitMutation(
          source.creaturePortrait,
          value.creatureProperties,
          `${path}.source.creaturePortrait`,
          `${path}.creatureProperties.portraitId`,
        )
      : undefined;
    if (creatureAppearance && creaturePhenotype) {
      fail(
        "Creature Phenotype cannot be changed together with Appearance_Type.",
        `${path}.creatureProperties.phenotypeId`,
      );
    }
    if (creatureGender && creaturePortrait) {
      fail(
        "Creature PortraitId cannot be changed together with Gender.",
        `${path}.creatureProperties.portraitId`,
      );
    }
    const creatureChallengeRating = hasCreatureChallengeRating
      ? projectCreatureChallengeRatingMutation(
          source.creatureChallengeRating,
          value.creatureProperties,
          `${path}.source.creatureChallengeRating`,
          `${path}.creatureProperties.challengeRating`,
        )
      : undefined;
    const creatureAbilityScores = hasCreatureAbilityScores
      ? projectCreatureAbilityScoreMutations(
          source.creatureAbilityScores,
          value.creatureProperties,
          `${path}.source.creatureAbilityScores`,
          `${path}.creatureProperties.statistics.abilityScores`,
        )
      : undefined;
    const creatureAppearanceColors = hasCreatureAppearanceColors
      ? projectCreatureAppearanceColorMutations(
          source.creatureAppearanceColors,
          value.creatureProperties,
          `${path}.source.creatureAppearanceColors`,
          `${path}.creatureProperties.appearanceSettings.colors`,
        )
      : undefined;
    const creatureBodyParts = hasCreatureBodyParts
      ? projectCreatureBodyPartMutations(
          source.creatureBodyParts,
          value.creatureProperties,
          `${path}.source.creatureBodyParts`,
          `${path}.creatureProperties.appearanceSettings`,
        )
      : undefined;
    const creatureAppendages = hasCreatureAppendages
      ? projectCreatureAppendageMutations(
          source.creatureAppendages,
          value.creatureProperties,
          `${path}.source.creatureAppendages`,
          `${path}.creatureProperties.appearanceSettings`,
        )
      : undefined;
    if (creatureAbilityScores?.constitution && !hasCreatureHitPointState) {
      fail(
        "A retained Creature Constitution edit requires complete hit-point provenance.",
        `${path}.source.creatureHitPointState`,
      );
    }
    if (creatureClassLevelTarget && !hasCreatureHitPointState) {
      fail(
        "A retained Creature class-level edit requires complete hit-point provenance.",
        `${path}.source.creatureHitPointState`,
      );
    }
    if (creatureFeatList?.row40Transition !== undefined &&
      creatureFeatList.row40Transition !== "unchanged" && !hasCreatureHitPointState) {
      fail(
        "A retained Creature FeatList row-40 transition requires complete hit-point provenance.",
        `${path}.source.creatureHitPointState`,
      );
    }
    const creatureHitPoints = hasCreatureHitPointState
      ? projectCreatureHitPointMutation(
          source.creatureHitPointState,
          value.creatureProperties,
          creatureAbilityScores?.constitution,
          creatureClassLevelTarget,
          creatureFeatList,
          `${path}.source.creatureHitPointState`,
          `${path}.creatureProperties.statistics`,
        )
      : undefined;
    const creatureNaturalArmorClass = hasCreatureNaturalArmorClass
      ? projectCreatureNaturalArmorClassMutation(
          source.creatureNaturalArmorClass,
          value.creatureProperties,
          `${path}.source.creatureNaturalArmorClass`,
          `${path}.creatureProperties.statistics.naturalArmorClass`,
        )
      : undefined;
    const creatureSavingThrowBonuses = hasCreatureSavingThrowBonuses
      ? projectCreatureSavingThrowBonusMutations(
          source.creatureSavingThrowBonuses,
          value.creatureProperties,
          `${path}.source.creatureSavingThrowBonuses`,
          `${path}.creatureProperties.statistics`,
        )
      : undefined;
    const creatureAlignment = hasCreatureAlignment
      ? projectCreatureAlignmentMutation(
          source.creatureAlignment,
          value.creatureProperties,
          `${path}.source.creatureAlignment`,
          `${path}.creatureProperties.alignment`,
        )
      : undefined;
    const creatureFaction = hasCreatureFaction
      ? projectCreatureFactionMutation(
          source.creatureFaction,
          record(
            record(value.creatureProperties, `${path}.creatureProperties`).advancedSettings,
            `${path}.creatureProperties.advancedSettings`,
          ).factionId,
          `${path}.source.creatureFaction`,
          `${path}.creatureProperties.advancedSettings.factionId`,
        )
      : undefined;
    const creatureTemplateResRef = hasCreatureTemplateResRef
      ? projectCreatureTemplateResRefMutation(
          source.creatureTemplateResRef,
          record(
            record(value.creatureProperties, `${path}.creatureProperties`).advancedSettings,
            `${path}.creatureProperties.advancedSettings`,
          ).blueprintResRef,
          `${path}.source.creatureTemplateResRef`,
          `${path}.creatureProperties.advancedSettings.blueprintResRef`,
        )
      : undefined;
    const creatureSpecialIdentityStrings = hasCreatureSpecialIdentityStrings
      ? projectCreatureSpecialIdentityStringsMutation(
          source.creatureSpecialIdentityStrings,
          record(
            record(value.creatureProperties, `${path}.creatureProperties`).advancedSettings,
            `${path}.creatureProperties.advancedSettings`,
          ),
          `${path}.source.creatureSpecialIdentityStrings`,
          `${path}.creatureProperties.advancedSettings`,
        )
      : undefined;
    const creatureProperties =
      hasCreatureScriptResRefs ||
        hasCreatureLocalizedStrings ||
        hasCreatureEditorComment ||
        hasCreatureInventoryEntries ||
        hasCreatureEquipmentEntries
      ? record(value.creatureProperties, `${path}.creatureProperties`)
      : undefined;
    const creatureScripts = hasCreatureScriptResRefs
      ? projectCreatureScriptResRefMutations(
          source.creatureScriptResRefs,
          creatureProperties?.scriptSlots,
          `${path}.source.creatureScriptResRefs`,
          `${path}.creatureProperties.scriptSlots`,
        )
      : undefined;
    const localizedStrings = hasCreatureLocalizedStrings
      ? projectCreatureNameLocalizedStringMutations(
          source.creatureLocalizedStrings,
          creatureProperties,
          retained.sourceIndex,
          `${path}.source.creatureLocalizedStrings`,
          `${path}.creatureProperties`,
          `${path}.source.sourceIndex`,
        )
      : undefined;
    const inventory = hasCreatureInventoryEntries
      ? projectCreatureInventoryMutation(
          source.creatureInventoryItems,
          creatureProperties?.inventoryItems,
          `${path}.source.creatureInventoryItems`,
          `${path}.creatureProperties.inventoryItems`,
        )
      : undefined;
    const equipment = hasCreatureEquipmentEntries
      ? projectCreatureEquipmentMutation(
          source.creatureEquippedItems,
          creatureProperties?.equippedItems,
          `${path}.source.creatureEquippedItems`,
          `${path}.creatureProperties.equippedItems`,
        )
      : undefined;
    if (
      !creatureTag &&
      !creatureConversation &&
      !creatureInterruptable &&
      !creatureAdvancedFlags &&
      !creatureBodyBag &&
      !creatureDecayTime &&
      !creatureAppearance &&
      !creatureGender &&
      !creaturePerceptionRange &&
      !creatureWalkRate &&
      !creatureSoundSetFile &&
      !creatureStartingPackage &&
      !creatureSkillList &&
      !creatureFeatList &&
      !creatureSpecialAbilityList &&
      !creatureVariables &&
      !creatureEditorComment &&
      !creatureClassLevels &&
      !creatureClassIdentity &&
      !creatureClassSlotResize &&
      !creaturePhenotype &&
      !creaturePortrait &&
      !creatureChallengeRating &&
      !creatureAbilityScores &&
      !creatureAppearanceColors &&
      !creatureBodyParts &&
      !creatureAppendages &&
      !creatureHitPoints &&
      !creatureNaturalArmorClass &&
      !creatureSavingThrowBonuses &&
      !creatureAlignment &&
      !creatureFaction &&
      !creatureTemplateResRef &&
      !creatureSpecialIdentityStrings &&
      !creatureScripts &&
      !localizedStrings &&
      !inventory &&
      !equipment
    ) {
      return undefined;
    }
    if (retained.sourceIndex === undefined) {
      fail(
        "A Creature Tag, Conversation, Interruptable, advanced flags, BodyBag, DecayTime, Appearance, FactionID, TemplateResRef, Subrace, Deity, script ResRef, name, ItemList, or Equip_ItemList mutation requires an immutable family ordinal.",
        `${path}.source.sourceIndex`,
      );
    }
    return creatureTag || creatureConversation || creatureInterruptable || creatureAdvancedFlags || creatureBodyBag || creatureDecayTime || creatureAppearance || creatureGender || creaturePerceptionRange || creatureWalkRate || creatureSoundSetFile || creatureStartingPackage || creatureSkillList || creatureFeatList || creatureSpecialAbilityList || creatureVariables || creatureEditorComment || creatureClassLevels || creatureClassIdentity || creatureClassSlotResize || creaturePhenotype || creaturePortrait || creatureChallengeRating || creatureAbilityScores || creatureAppearanceColors || creatureBodyParts || creatureAppendages || creatureHitPoints || creatureNaturalArmorClass || creatureSavingThrowBonuses || creatureAlignment || creatureFaction || creatureTemplateResRef || creatureSpecialIdentityStrings || creatureScripts || localizedStrings || inventory || equipment
      ? Object.freeze({
          kind: "creature",
          sourceObjectId: retained.sourceObjectId,
          sourceIndex: retained.sourceIndex,
          ...(creatureTag ? { tag: creatureTag } : {}),
          ...(creatureConversation ? { conversation: creatureConversation } : {}),
          ...(creatureInterruptable ? { interruptable: creatureInterruptable } : {}),
          ...(creatureAdvancedFlags ? { advancedFlags: creatureAdvancedFlags } : {}),
          ...(creatureBodyBag ? { bodyBag: creatureBodyBag } : {}),
          ...(creatureDecayTime ? { decayTime: creatureDecayTime } : {}),
          ...(creatureAppearance ? { appearance: creatureAppearance } : {}),
          ...(creatureGender ? { gender: creatureGender } : {}),
          ...(creaturePerceptionRange ? { perceptionRange: creaturePerceptionRange } : {}),
          ...(creatureWalkRate ? { walkRate: creatureWalkRate } : {}),
          ...(creatureSoundSetFile ? { soundSetFile: creatureSoundSetFile } : {}),
          ...(creatureStartingPackage ? { startingPackage: creatureStartingPackage } : {}),
          ...(creatureSkillList ? { skillList: creatureSkillList } : {}),
          ...(creatureFeatList ? { featList: creatureFeatList } : {}),
          ...(creatureSpecialAbilityList
            ? { specialAbilityList: creatureSpecialAbilityList }
            : {}),
          ...(creatureVariables ? { variables: creatureVariables } : {}),
          ...(creatureEditorComment ? { editorComment: creatureEditorComment } : {}),
          ...(creatureClassLevels ? { classLevels: creatureClassLevels } : {}),
          ...(creatureClassIdentity ? { classIdentity: creatureClassIdentity } : {}),
          ...(creatureClassSlotResize ? { classSlotResize: creatureClassSlotResize } : {}),
          ...(creaturePhenotype ? { phenotype: creaturePhenotype } : {}),
          ...(creaturePortrait ? { portrait: creaturePortrait } : {}),
          ...(creatureChallengeRating
            ? { challengeRating: creatureChallengeRating }
            : {}),
          ...(creatureAbilityScores ? { abilityScores: creatureAbilityScores } : {}),
          ...(creatureAppearanceColors
            ? { appearanceColors: creatureAppearanceColors }
            : {}),
          ...(creatureBodyParts ? { bodyParts: creatureBodyParts } : {}),
          ...(creatureAppendages ? { appendages: creatureAppendages } : {}),
          ...(creatureHitPoints ? { hitPoints: creatureHitPoints } : {}),
          ...(creatureNaturalArmorClass
            ? { naturalArmorClass: creatureNaturalArmorClass }
            : {}),
          ...(creatureSavingThrowBonuses
            ? { savingThrowBonuses: creatureSavingThrowBonuses }
            : {}),
          ...(creatureAlignment ? { alignment: creatureAlignment } : {}),
          ...(creatureFaction ? { faction: creatureFaction } : {}),
          ...(creatureTemplateResRef ? { templateResRef: creatureTemplateResRef } : {}),
          ...(creatureSpecialIdentityStrings
            ? { specialIdentityStrings: creatureSpecialIdentityStrings }
            : {}),
          ...(creatureScripts ? { scripts: creatureScripts } : {}),
          ...(localizedStrings ? { localizedStrings } : {}),
          ...(inventory ? { inventory } : {}),
          ...(equipment ? { equipment } : {}),
        })
      : undefined;
  }
  const hasOnUsed = source.placeableOnUsed !== undefined;
  const hasStatic = source.placeableStatic !== undefined;
  const hasUseable = source.placeableUseable !== undefined;
  const hasPlot = source.placeablePlot !== undefined;
  const hasHasInventory = source.placeableHasInventory !== undefined;
  const hasScriptResRefs = source.placeableScriptResRefs !== undefined;
  const hasTrapScriptResRefs = source.placeableTrapScriptResRefs !== undefined;
  const hasTrapFields = source.placeableTrapSettings !== undefined;
  const hasLockFields = source.placeableLockSettings !== undefined;
  const hasInventoryEntries = source.placeableInventoryItems !== undefined;
  const hasBasicByteFields = source.placeableDurabilitySaveBytes !== undefined;
  const hasConversation = source.placeableConversation !== undefined;
  const hasInterruptable = source.placeableInterruptable !== undefined;
  const hasAnimationState = source.placeableAnimationState !== undefined;
  const hasEditorComment = source.placeableEditorComment !== undefined;
  const hasHitPointState = source.placeableHitPointState !== undefined;
  const hasTrapType = source.placeableTrapType !== undefined;
  const hasBodyBag = source.placeableBodyBag !== undefined;
  const hasPortrait = source.placeablePortrait !== undefined;
  const hasFaction = source.placeableFaction !== undefined;
  const hasVariables = source.placeableVariables !== undefined;
  const hasTemplateResRef = source.placeableTemplateResRef !== undefined;
  const basicIdentity = typeof source.placeableBasicIdentity === "object" &&
    source.placeableBasicIdentity !== null &&
    !Array.isArray(source.placeableBasicIdentity)
      ? source.placeableBasicIdentity as Record<string, unknown>
      : undefined;
  const basicIdentityTag = typeof basicIdentity?.tag === "object" &&
    basicIdentity.tag !== null &&
    !Array.isArray(basicIdentity.tag)
      ? basicIdentity.tag as Record<string, unknown>
      : undefined;
  const hasChangedTagTarget = basicIdentityTag?.present === true &&
    value.tag !== basicIdentityTag.value;
  const rawProperties = value.placeableProperties;
  const hasAppearanceTarget = typeof rawProperties === "object" &&
    rawProperties !== null &&
    !Array.isArray(rawProperties) &&
    Object.prototype.hasOwnProperty.call(rawProperties, "appearanceType");
  const hasLocalizedStringTarget = typeof rawProperties === "object" &&
    rawProperties !== null &&
    !Array.isArray(rawProperties) &&
    (
      Object.prototype.hasOwnProperty.call(rawProperties, "localizedName") ||
      Object.prototype.hasOwnProperty.call(rawProperties, "description")
    );
  if (
    !hasOnUsed &&
    !hasStatic &&
    !hasUseable &&
    !hasPlot &&
    !hasHasInventory &&
    !hasScriptResRefs &&
    !hasTrapScriptResRefs &&
    !hasTrapFields &&
    !hasLockFields &&
    !hasInventoryEntries &&
    !hasBasicByteFields &&
    !hasConversation &&
    !hasInterruptable &&
    !hasAnimationState &&
    !hasEditorComment &&
    !hasHitPointState &&
    !hasTrapType &&
    !hasBodyBag &&
    !hasPortrait &&
    !hasFaction &&
    !hasVariables &&
    !hasTemplateResRef &&
    !hasChangedTagTarget &&
    !hasAppearanceTarget &&
    !hasLocalizedStringTarget
  ) {
    return undefined;
  }
  if (retained.sourceKind !== "placeable") {
    const sourceField = hasOnUsed
      ? "placeableOnUsed"
      : hasStatic
        ? "placeableStatic"
        : hasUseable
          ? "placeableUseable"
          : hasPlot
            ? "placeablePlot"
            : hasHasInventory
              ? "placeableHasInventory"
              : hasScriptResRefs
                ? "placeableScriptResRefs"
                : hasTrapScriptResRefs
                ? "placeableTrapScriptResRefs"
                  : hasTrapFields
                    ? "placeableTrapSettings"
                    : hasLockFields
                    ? "placeableLockSettings"
                    : hasInventoryEntries
                      ? "placeableInventoryItems"
                      : hasBasicByteFields
                        ? "placeableDurabilitySaveBytes"
                        : hasConversation
                          ? "placeableConversation"
                          : hasInterruptable
                            ? "placeableInterruptable"
                            : hasAnimationState
                              ? "placeableAnimationState"
                              : hasEditorComment
                                ? "placeableEditorComment"
                                : hasHitPointState
                                  ? "placeableHitPointState"
                                  : hasTrapType
                                    ? "placeableTrapType"
                                    : hasBodyBag
                                      ? "placeableBodyBag"
                                      : hasPortrait
                                        ? "placeablePortrait"
                                        : hasFaction
                                          ? "placeableFaction"
                                        : hasVariables
                                          ? "placeableVariables"
                                        : hasTemplateResRef
                                          ? "placeableTemplateResRef"
                                        : hasChangedTagTarget
                                          ? "placeableBasicIdentity.tag"
                                          : hasAppearanceTarget
                                            ? "placeableBasicIdentity.appearance"
                                            : "placeableLocalizedStrings";
    fail(`Only placeables may carry ${sourceField} provenance.`, `${path}.source.${sourceField}`);
  }
  const projected: {
    kind: "placeable";
    sourceObjectId: string;
    sourceIndex?: number;
    tag?: ExistingAreaPlaceableTagMutation;
    expectedOnUsed?: string;
    onUsed?: string;
    expectedStatic?: boolean;
    static?: boolean;
    expectedUseable?: boolean;
    useable?: boolean;
    expectedPlot?: boolean;
    plot?: boolean;
    expectedHasInventory?: boolean;
    hasInventory?: boolean;
    scripts?: readonly ProjectedExistingAreaPlaceableScriptMutation[];
    trapScripts?: readonly ProjectedExistingAreaPlaceableTrapScriptMutation[];
    lockFields?: readonly ProjectedExistingAreaPlaceableLockMutation[];
    keyName?: Readonly<{ expectedValue: string; value: string }>;
    inventory?: AreaPlaceableInventoryMutation;
    basicByteFields?: readonly ExistingAreaPlaceableBasicByteMutation[];
    conversation?: ExistingAreaPlaceableConversationMutation;
    interruptable?: ExistingAreaPlaceableInterruptableMutation;
    animationState?: ExistingAreaPlaceableAnimationStateMutation;
    trapFields?: readonly ExistingAreaPlaceableTrapByteMutation[];
    editorComment?: ExistingAreaPlaceableEditorCommentMutation;
    appearance?: ExistingAreaPlaceableAppearanceMutation;
    hitPoints?: ExistingAreaPlaceableHitPointMutation;
    trapType?: ExistingAreaPlaceableTrapTypeMutation;
    bodyBag?: ExistingAreaPlaceableBodyBagMutation;
    portrait?: ExistingAreaPlaceablePortraitMutation;
    faction?: ExistingAreaPlaceableFactionMutation;
    variables?: ExistingAreaPlaceableVariableMutation;
    templateResRef?: ExistingAreaPlaceableTemplateResRefMutation;
    localizedStrings?: readonly ExistingAreaPlaceableLocalizedStringMutation[];
  } = {
    kind: "placeable",
    sourceObjectId: retained.sourceObjectId,
    ...(retained.sourceIndex !== undefined ? { sourceIndex: retained.sourceIndex } : {}),
  };
  if (hasChangedTagTarget) {
    projected.tag = projectPlaceableTagMutation(
      source.placeableBasicIdentity,
      value.tag,
      retained.sourceIndex,
      `${path}.source.placeableBasicIdentity.tag`,
      `${path}.tag`,
      `${path}.source.sourceIndex`,
    );
  }
  if (hasOnUsed) {
    const expectedOnUsed = scriptResRef(source.placeableOnUsed, `${path}.source.placeableOnUsed`);
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const scriptSlots = record(properties.scriptSlots, `${path}.placeableProperties.scriptSlots`);
    const onUsed = scriptResRef(scriptSlots.onUsed, `${path}.placeableProperties.scriptSlots.onUsed`);
    if (onUsed !== expectedOnUsed) {
      projected.expectedOnUsed = expectedOnUsed;
      projected.onUsed = onUsed;
    }
  }
  if (hasStatic) {
    const expectedStatic = booleanValue(source.placeableStatic, `${path}.source.placeableStatic`);
    const staticValue = booleanValue(value.isStatic, `${path}.isStatic`);
    if (staticValue !== expectedStatic) {
      projected.expectedStatic = expectedStatic;
      projected.static = staticValue;
    }
  }
  if (hasUseable) {
    const expectedUseable = booleanValue(source.placeableUseable, `${path}.source.placeableUseable`);
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const useable = booleanValue(properties.useable, `${path}.placeableProperties.useable`);
    if (useable !== expectedUseable) {
      projected.expectedUseable = expectedUseable;
      projected.useable = useable;
    }
  }
  if (hasPlot) {
    const expectedPlot = booleanValue(source.placeablePlot, `${path}.source.placeablePlot`);
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const plot = booleanValue(properties.plot, `${path}.placeableProperties.plot`);
    if (plot !== expectedPlot) {
      projected.expectedPlot = expectedPlot;
      projected.plot = plot;
    }
  }
  if (hasHasInventory) {
    const expectedHasInventory = booleanValue(
      source.placeableHasInventory,
      `${path}.source.placeableHasInventory`,
    );
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const hasInventory = booleanValue(
      properties.hasInventory,
      `${path}.placeableProperties.hasInventory`,
    );
    if (hasInventory !== expectedHasInventory) {
      projected.expectedHasInventory = expectedHasInventory;
      projected.hasInventory = hasInventory;
    }
  }
  if (hasScriptResRefs) {
    const scripts = projectPlaceableResRefMutations(
      source.placeableScriptResRefs,
      record(value.placeableProperties, `${path}.placeableProperties`).scriptSlots,
      AREA_PLACEABLE_SCRIPT_FIELD_MAPPINGS,
      `${path}.source.placeableScriptResRefs`,
      `${path}.placeableProperties.scriptSlots`,
    );
    if (scripts) projected.scripts = scripts;
  }
  if (hasTrapScriptResRefs) {
    const trapScripts = projectPlaceableResRefMutations(
      source.placeableTrapScriptResRefs,
      record(value.placeableProperties, `${path}.placeableProperties`).trapSettings,
      AREA_PLACEABLE_TRAP_SCRIPT_FIELD_MAPPINGS,
      `${path}.source.placeableTrapScriptResRefs`,
      `${path}.placeableProperties.trapSettings`,
    );
    projected.trapScripts = trapScripts;
  }
  if (hasTrapFields) {
    const trapFields = projectPlaceableTrapByteMutations(
      source.placeableTrapSettings,
      record(value.placeableProperties, `${path}.placeableProperties`).trapSettings,
      `${path}.source.placeableTrapSettings`,
      `${path}.placeableProperties.trapSettings`,
    );
    if (trapFields) projected.trapFields = trapFields;
  }
  if (hasLockFields) {
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const lockFields = projectPlaceableLockMutations(
      source.placeableLockSettings,
      properties.lockSettings,
      `${path}.source.placeableLockSettings`,
      `${path}.placeableProperties.lockSettings`,
    );
    if (lockFields) projected.lockFields = lockFields;
    projected.keyName = projectPlaceableKeyNameMutation(
      source.placeableLockSettings,
      properties.lockSettings,
      `${path}.source.placeableLockSettings`,
      `${path}.placeableProperties.lockSettings`,
    );
  }
  if (hasInventoryEntries) {
    projected.inventory = projectPlaceableInventoryMutation(
      source.placeableInventoryItems,
      record(value.placeableProperties, `${path}.placeableProperties`).inventoryItems,
      `${path}.source.placeableInventoryItems`,
      `${path}.placeableProperties.inventoryItems`,
    );
  }
  if (hasVariables) {
    projected.variables = projectPlaceableVariableMutation(
      source.placeableVariables,
      record(value.placeableProperties, `${path}.placeableProperties`).variables,
      `${path}.source.placeableVariables`,
      `${path}.placeableProperties.variables`,
    );
  }
  if (hasBasicByteFields) {
    const basicByteFields = projectPlaceableBasicByteMutations(
      source.placeableDurabilitySaveBytes,
      value.placeableProperties,
      `${path}.source.placeableDurabilitySaveBytes`,
      `${path}.placeableProperties`,
    );
    if (basicByteFields) projected.basicByteFields = basicByteFields;
  }
  if (hasConversation || hasInterruptable || hasAnimationState || hasTemplateResRef || hasFaction) {
    const advancedSettings = record(
      record(value.placeableProperties, `${path}.placeableProperties`).advancedSettings,
      `${path}.placeableProperties.advancedSettings`,
    );
    if (hasConversation) {
      projected.conversation = projectPlaceableConversationMutation(
        source.placeableConversation,
        advancedSettings.conversation,
        `${path}.source.placeableConversation`,
        `${path}.placeableProperties.advancedSettings.conversation`,
      );
    }
    if (hasInterruptable) {
      projected.interruptable = projectPlaceableInterruptableMutation(
        source.placeableInterruptable,
        advancedSettings.noInterrupt,
        `${path}.source.placeableInterruptable`,
        `${path}.placeableProperties.advancedSettings.noInterrupt`,
      );
    }
    if (hasAnimationState) {
      projected.animationState = projectPlaceableAnimationStateMutation(
        source.placeableAnimationState,
        advancedSettings.initialState,
        `${path}.source.placeableAnimationState`,
        `${path}.placeableProperties.advancedSettings.initialState`,
      );
    }
    if (hasTemplateResRef) {
      projected.templateResRef = projectPlaceableTemplateResRefMutation(
        source.placeableTemplateResRef,
        advancedSettings.blueprintResRef,
        `${path}.source.placeableTemplateResRef`,
        `${path}.placeableProperties.advancedSettings.blueprintResRef`,
      );
    }
    if (hasFaction) {
      projected.faction = projectPlaceableFactionMutation(
        source.placeableFaction,
        advancedSettings.factionId,
        `${path}.source.placeableFaction`,
        `${path}.placeableProperties.advancedSettings.factionId`,
      );
    }
  }
  if (hasEditorComment) {
    projected.editorComment = projectPlaceableEditorCommentMutation(
      source.placeableEditorComment,
      record(value.placeableProperties, `${path}.placeableProperties`).comments,
      `${path}.source.placeableEditorComment`,
      `${path}.placeableProperties.comments`,
    );
  }
  if (hasHitPointState) {
    projected.hitPoints = projectPlaceableHitPointMutation(
      source.placeableHitPointState,
      record(value.placeableProperties, `${path}.placeableProperties`).hitPoints,
      `${path}.source.placeableHitPointState`,
      `${path}.placeableProperties.hitPoints`,
    );
  }
  if (hasTrapType) {
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const trapSettings = record(
      properties.trapSettings,
      `${path}.placeableProperties.trapSettings`,
    );
    projected.trapType = projectPlaceableTrapTypeMutation(
      source.placeableTrapType,
      trapSettings.trapTypeRow,
      `${path}.source.placeableTrapType`,
      `${path}.placeableProperties.trapSettings.trapTypeRow`,
    );
  }
  if (hasBodyBag) {
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const advancedSettings = record(
      properties.advancedSettings,
      `${path}.placeableProperties.advancedSettings`,
    );
    projected.bodyBag = projectPlaceableBodyBagMutation(
      source.placeableBodyBag,
      advancedSettings.treasureModelRow,
      `${path}.source.placeableBodyBag`,
      `${path}.placeableProperties.advancedSettings.treasureModelRow`,
    );
  }
  if (hasPortrait) {
    const properties = record(value.placeableProperties, `${path}.placeableProperties`);
    const advancedSettings = record(
      properties.advancedSettings,
      `${path}.placeableProperties.advancedSettings`,
    );
    projected.portrait = projectPlaceablePortraitMutation(
      source.placeablePortrait,
      advancedSettings.portraitId,
      `${path}.source.placeablePortrait`,
      `${path}.placeableProperties.advancedSettings.portraitId`,
    );
  }
  if (hasAppearanceTarget) {
    projected.appearance = projectPlaceableAppearanceMutation(
      source.placeableBasicIdentity,
      record(value.placeableProperties, `${path}.placeableProperties`).appearanceType,
      `${path}.source.placeableBasicIdentity.appearance`,
      `${path}.placeableProperties.appearanceType`,
    );
  }
  if (hasLocalizedStringTarget) {
    const localizedStrings = projectPlaceableLocalizedStringMutations(
      source.placeableLocalizedStrings,
      rawProperties,
      retained.sourceIndex,
      `${path}.source.placeableLocalizedStrings`,
      `${path}.placeableProperties`,
      `${path}.source.sourceIndex`,
    );
    if (localizedStrings) projected.localizedStrings = localizedStrings;
  }
  if (
    projected.expectedOnUsed === undefined &&
    projected.expectedStatic === undefined &&
    projected.expectedUseable === undefined &&
    projected.expectedPlot === undefined &&
    projected.expectedHasInventory === undefined &&
    projected.scripts === undefined &&
    projected.trapScripts === undefined &&
    projected.lockFields === undefined &&
    projected.keyName === undefined &&
    projected.inventory === undefined &&
    projected.basicByteFields === undefined &&
    projected.conversation === undefined &&
    projected.interruptable === undefined &&
    projected.animationState === undefined &&
    projected.trapFields === undefined &&
    projected.editorComment === undefined &&
    projected.hitPoints === undefined &&
    projected.trapType === undefined &&
    projected.bodyBag === undefined &&
    projected.portrait === undefined &&
    projected.faction === undefined &&
    projected.variables === undefined &&
    projected.templateResRef === undefined &&
    projected.tag === undefined &&
    projected.appearance === undefined
    && projected.localizedStrings === undefined
  ) {
    return undefined;
  }
  return Object.freeze(projected);
}

function projectCreatureNameLocalizedStringMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourceIndex: number | undefined,
  sourcePath: string,
  targetPath: string,
  sourceIndexPath: string,
): readonly ExistingAreaCreatureNameLocalizedStringMutation[] | undefined {
  const source = readAreaCreatureNameLocalizedStrings(sourceInput);
  if (!source) {
    fail("Expected an exact bounded Creature name localized-string provenance pair.", sourcePath);
  }
  const target = record(targetInput, targetPath);
  const pairs: ExistingAreaCreatureNameLocalizedStringMutation[] = [];
  for (const mapping of AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(target, mapping.targetKey)) continue;
    const expectedValue = readAreaCreatureNameInlineAsciiStorage(
      source[mapping.sourceKey],
      mapping.maxBytes,
    );
    if (expectedValue === undefined) continue;
    const value = target[mapping.targetKey];
    if (!isAreaCreatureNameInlineAsciiText(value, mapping.maxBytes)) {
      fail(
        `Expected printable ASCII ${mapping.field} text within ${mapping.maxBytes} bytes.`,
        `${targetPath}.${mapping.targetKey}`,
      );
    }
    if (value !== expectedValue) {
      pairs.push({ field: mapping.field, expectedValue, value });
    }
  }
  if (pairs.length === 0) return undefined;
  if (sourceIndex === undefined) {
    fail(
      "A changed Creature name requires immutable family-ordinal provenance.",
      sourceIndexPath,
    );
  }
  const mutation = readExistingAreaCreatureNameLocalizedStringMutations(pairs);
  if (!mutation) fail("Creature name localized-string mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureTagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureTagMutation | undefined {
  const source = readExistingAreaCreatureTagStorage(sourceInput);
  if (!source) {
    fail("Creature Tag provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isEditableAreaCreatureTag(targetInput)) {
    fail("Expected a Creature Tag with no more than 32 code units and no NUL.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaCreatureTagMutation({
    expectedValue: source.value,
    value: targetInput,
  });
  if (!mutation) fail("Creature Tag mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureConversationMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureConversationMutation | undefined {
  const source = readExistingAreaCreatureConversationStorage(sourceInput);
  if (!source) {
    fail("Creature Conversation provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isAreaCreatureConversationTarget(targetInput)) {
    fail("Expected an empty or lowercase Creature Conversation ResRef of at most 16 bytes.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaCreatureConversationMutation({
    expectedResRef: source.value,
    resRef: targetInput,
  });
  if (!mutation) fail("Creature Conversation mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureInterruptableMutation(
  sourceInput: unknown,
  targetPropertiesInput: unknown,
  sourcePath: string,
  targetPropertiesPath: string,
  targetPath: string,
): ExistingAreaCreatureInterruptableMutation | undefined {
  const source = readAreaCreatureInterruptableStorage(sourceInput);
  if (!source) {
    fail("Creature Interruptable provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  const targetProperties = record(targetPropertiesInput, targetPropertiesPath);
  if (typeof targetProperties.noInterrupt !== "boolean") {
    fail("Expected a boolean Creature No Interrupt value.", targetPath);
  }
  const value = targetProperties.noInterrupt ? 0 : 1;
  if (source.value === value) return undefined;
  const mutation = readExistingAreaCreatureInterruptableMutation({
    expectedValue: source.value,
    value,
  });
  if (!mutation) fail("Creature Interruptable mutation is invalid.", targetPath);
  return mutation;
}

const CREATURE_ADVANCED_FLAG_TARGET_PROPERTIES = Object.freeze({
  disarmable: "disarmable",
  plot: "plot",
  immortal: "immortal",
  lootable: "leavesLootableCorpse",
  noPermanentDeath: "noPermanentDeath",
} as const satisfies Record<AreaCreatureAdvancedFlagKey, string>);

function projectCreatureAdvancedFlagMutations(
  sourceInput: unknown,
  targetPropertiesInput: unknown,
  sourcePath: string,
  targetPropertiesPath: string,
): ExistingAreaCreatureAdvancedFlagMutations | undefined {
  const source = readAreaCreatureAdvancedFlagsStorage(sourceInput);
  if (!source) {
    fail("Creature advanced flag provenance is malformed.", sourcePath);
  }
  const presentFields = AREA_CREATURE_ADVANCED_FLAG_FIELDS.filter(
    ({ key }) => source[key].present,
  );
  if (presentFields.length === 0) return undefined;
  const targetProperties = record(targetPropertiesInput, targetPropertiesPath);
  const advancedPath = `${targetPropertiesPath}.advancedSettings`;
  const advanced = record(targetProperties.advancedSettings, advancedPath);
  const candidate: Partial<Record<
    AreaCreatureAdvancedFlagKey,
    Readonly<{ expectedValue: 0 | 1; value: 0 | 1 }>
  >> = {};
  for (const { key } of presentFields) {
    const targetProperty = CREATURE_ADVANCED_FLAG_TARGET_PROPERTIES[key];
    const targetPath = `${advancedPath}.${targetProperty}`;
    const target = advanced[targetProperty];
    if (typeof target !== "boolean") {
      fail(`Expected a boolean Creature ${targetProperty} value.`, targetPath);
    }
    const sourceStorage = source[key];
    if (!sourceStorage.present) continue;
    const value = target ? 1 : 0;
    if (value !== sourceStorage.value) {
      candidate[key] = Object.freeze({
        expectedValue: sourceStorage.value,
        value,
      });
    }
  }
  if (Object.keys(candidate).length === 0) return undefined;
  const mutation = readExistingAreaCreatureAdvancedFlagMutations(candidate);
  if (!mutation) {
    fail("Creature advanced flag mutation is invalid.", advancedPath);
  }
  return mutation;
}

function projectCreatureBodyBagMutation(
  sourceInput: unknown,
  advancedFlagsInput: unknown,
  targetPropertiesInput: unknown,
  sourcePath: string,
  advancedFlagsSourcePath: string,
  targetPropertiesPath: string,
): ExistingAreaCreatureBodyBagMutation | undefined {
  const source = readExistingAreaCreatureBodyBagProvenance(sourceInput);
  if (!source) fail("Creature BodyBag provenance is malformed.", sourcePath);
  const advanced = creatureAdvancedSettings(targetPropertiesInput, targetPropertiesPath);
  const targetPath = `${targetPropertiesPath}.advancedSettings.treasureModelRow`;
  const target = advanced.treasureModelRow;
  const mutation = readExistingAreaCreatureBodyBagMutation({
    expectedValue: source.expectedValue,
    value: target,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  });
  if (target === source.expectedValue) return undefined;
  if (!mutation) fail("Creature BodyBag target is not one changed retained physical row.", targetPath);
  requireCreatureLootableGate(advancedFlagsInput, advanced, advancedFlagsSourcePath, targetPropertiesPath);
  return mutation;
}

function projectCreatureDecayTimeMutation(
  sourceInput: unknown,
  advancedFlagsInput: unknown,
  targetPropertiesInput: unknown,
  sourcePath: string,
  advancedFlagsSourcePath: string,
  targetPropertiesPath: string,
): ExistingAreaCreatureDecayTimeMutation | undefined {
  const source = readExistingAreaCreatureDecayTimeProvenance(sourceInput);
  if (!source) fail("Creature DecayTime provenance is malformed.", sourcePath);
  const advanced = creatureAdvancedSettings(targetPropertiesInput, targetPropertiesPath);
  const targetPath = `${targetPropertiesPath}.advancedSettings.corpseDecayTimeSeconds`;
  const seconds = advanced.corpseDecayTimeSeconds;
  if (
    !Number.isSafeInteger(seconds) ||
    Number(seconds) < AREA_CREATURE_DECAY_MIN_SECONDS ||
    Number(seconds) > AREA_CREATURE_DECAY_MAX_SECONDS
  ) {
    fail("Creature DecayTime target must be a whole Toolset second in range 5..32767.", targetPath);
  }
  const valueMilliseconds = Number(seconds) * AREA_CREATURE_DECAY_MILLISECONDS_PER_SECOND;
  if (valueMilliseconds === source.expectedMilliseconds) return undefined;
  const mutation = readExistingAreaCreatureDecayTimeMutation({
    expectedMilliseconds: source.expectedMilliseconds,
    valueMilliseconds,
  });
  if (!mutation) fail("Creature DecayTime mutation is invalid.", targetPath);
  requireCreatureLootableGate(advancedFlagsInput, advanced, advancedFlagsSourcePath, targetPropertiesPath);
  return mutation;
}

function creatureAdvancedSettings(
  targetPropertiesInput: unknown,
  targetPropertiesPath: string,
): Record<string, unknown> {
  const targetProperties = record(targetPropertiesInput, targetPropertiesPath);
  return record(
    targetProperties.advancedSettings,
    `${targetPropertiesPath}.advancedSettings`,
  );
}

function requireCreatureLootableGate(
  advancedFlagsInput: unknown,
  advanced: Record<string, unknown>,
  advancedFlagsSourcePath: string,
  targetPropertiesPath: string,
): void {
  const flags = readAreaCreatureAdvancedFlagsStorage(advancedFlagsInput);
  if (!flags?.lootable.present) {
    fail("Creature death-remains mutation requires exact present Lootable provenance.", advancedFlagsSourcePath);
  }
  if (advanced.leavesLootableCorpse !== true) {
    fail(
      "Creature death-remains controls require the current proven Lootable target.",
      `${targetPropertiesPath}.advancedSettings.leavesLootableCorpse`,
    );
  }
}

function projectPlaceableVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableVariableMutation | undefined {
  let source;
  let entries;
  try {
    source = parseAreaPlaceableVariableProvenance(sourceInput);
  } catch {
    fail("Expected exact Placeable VarTable provenance.", sourcePath);
  }
  try {
    entries = parseAreaPlaceableVariableTargetEntries(targetInput);
  } catch {
    fail("Expected an exact supported Placeable variable list.", targetPath);
  }
  if (areaPlaceableVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectCreatureVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureVariableMutation | undefined {
  let source;
  let entries;
  try {
    source = parseAreaCreatureVariableProvenance(sourceInput);
  } catch {
    fail("Expected exact Creature VarTable provenance.", sourcePath);
  }
  try {
    entries = parseAreaCreatureVariableTargetEntries(targetInput);
  } catch {
    fail("Expected an exact supported Creature variable list.", targetPath);
  }
  if (areaCreatureVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectEncounterVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterVariableMutation | undefined {
  let source;
  let entries;
  try {
    source = parseAreaEncounterVariableProvenance(sourceInput);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Encounter VarTable source is invalid.", sourcePath);
  }
  try {
    entries = parseAreaEncounterVariableTargetEntries(targetInput);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Encounter VarTable target is invalid.", targetPath);
  }
  if (areaEncounterVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectWaypointVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointVariableMutation | undefined {
  let source;
  let entries;
  try {
    source = parseAreaWaypointVariableProvenance(sourceInput);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Waypoint VarTable source is invalid.", sourcePath);
  }
  try {
    entries = parseAreaWaypointVariableTargetEntries(targetInput);
  } catch (error) {
    fail(error instanceof Error ? error.message : "Waypoint VarTable target is invalid.", targetPath);
  }
  if (areaWaypointVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectEncounterCreatureListMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterCreatureListMutation | undefined {
  try {
    return projectAreaEncounterCreatureListMutation(sourceInput, targetInput);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Encounter CreatureList SingleSpawn target is invalid.";
    fail(
      message,
      message.includes("provenance") || message.includes("source")
        ? sourcePath
        : targetPath,
    );
  }
}

function projectEncounterSpawnPointListMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterSpawnPointListMutation | undefined {
  try {
    return projectAreaEncounterSpawnPointListMutation(sourceInput, targetInput);
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : "Encounter SpawnPointList target is invalid.";
    fail(
      message,
      message.includes("provenance") || message.includes("source")
        ? sourcePath
        : targetPath,
    );
  }
}

function projectPlaceableTrapTypeMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableTrapTypeMutation | undefined {
  const source = readExistingAreaPlaceableTrapTypeProvenance(sourceInput);
  if (!source) {
    fail("Expected valid effective traps.2da provenance.", sourcePath);
  }
  const value = integer(targetInput, 0, 0xff, targetPath);
  if (value >= source.tableRowCount) {
    fail("Placeable TrapType target must be an existing physical row.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  return readExistingAreaPlaceableTrapTypeMutation({
    expectedValue: source.expectedValue,
    value,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  })!;
}

function projectPlaceableBodyBagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableBodyBagMutation | undefined {
  const source = readExistingAreaPlaceableBodyBagProvenance(sourceInput);
  if (!source) fail("Expected valid effective bodybag.2da provenance.", sourcePath);
  const value = integer(targetInput, 0, 0xff, targetPath);
  if (value >= source.tableRowCount) {
    fail("Placeable BodyBag target must be an existing physical row.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  return readExistingAreaPlaceableBodyBagMutation({
    expectedValue: source.expectedValue,
    value,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  })!;
}

function projectPlaceablePortraitMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceablePortraitMutation | undefined {
  const source = readExistingAreaPlaceablePortraitProvenance(sourceInput);
  if (!source) fail("Expected valid effective portraits.2da provenance.", sourcePath);
  const value = integer(targetInput, 0, 0xffff, targetPath);
  if (value >= source.tableRowCount) {
    fail("Placeable PortraitId target must be an existing physical row.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  return readExistingAreaPlaceablePortraitMutation({
    expectedValue: source.expectedValue,
    value,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  })!;
}

function projectPlaceableFactionMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableFactionMutation | undefined {
  const source = readExistingAreaPlaceableFactionProvenance(sourceInput);
  if (!source) fail("Expected valid module repute.fac provenance.", sourcePath);
  const value = integer(targetInput, 0, 0xffffffff, targetPath);
  if (value >= source.catalogFactionCount) {
    fail("Placeable Faction target must be an existing physical faction.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  return readExistingAreaPlaceableFactionMutation({
    expectedValue: source.expectedValue,
    value,
    catalogSha256: source.catalogSha256,
    catalogFactionCount: source.catalogFactionCount,
  })!;
}

function projectCreatureFactionMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureFactionMutation | undefined {
  const source = readExistingAreaCreatureFactionProvenance(sourceInput);
  if (!source) fail("Expected valid module repute.fac provenance.", sourcePath);
  const value = integer(targetInput, 0, 0xffff, targetPath);
  if (value >= source.catalogFactionCount) {
    fail("Creature FactionID target must be an existing physical faction.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  return readExistingAreaCreatureFactionMutation({
    expectedValue: source.expectedValue,
    value,
    catalogSha256: source.catalogSha256,
    catalogFactionCount: source.catalogFactionCount,
  })!;
}

function projectCreatureTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureTemplateResRefMutation | undefined {
  const source = record(sourceInput, sourcePath);
  if (
    !hasExactKeys(source, ["expectedResRef"]) ||
    !isAreaCreatureTemplateResRef(source.expectedResRef)
  ) {
    fail("Expected exact retained Creature TemplateResRef provenance.", sourcePath);
  }
  if (!isAreaCreatureTemplateResRef(targetInput)) {
    fail("Expected a canonical Creature TemplateResRef target.", targetPath);
  }
  if (targetInput === source.expectedResRef) return undefined;
  return readExistingAreaCreatureTemplateResRefMutation({
    expectedResRef: source.expectedResRef,
    resRef: targetInput,
  })!;
}

function projectCreatureSpecialIdentityStringsMutation(
  sourceInput: unknown,
  targetInput: Readonly<Record<string, unknown>>,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureSpecialIdentityStringsMutation | undefined {
  const source = record(sourceInput, sourcePath);
  const keys = Object.keys(source);
  if (
    keys.length === 0 ||
    keys.some((key) => key !== "subrace" && key !== "deity")
  ) {
    fail("Expected exact retained Creature Subrace/Deity provenance.", sourcePath);
  }
  const mutation: Record<string, unknown> = {};
  for (const key of keys as Array<"subrace" | "deity">) {
    const memberPath = `${sourcePath}.${key}`;
    const targetMemberPath = `${targetPath}.${key}`;
    const member = record(source[key], memberPath);
    if (
      !hasExactKeys(member, ["expectedValue"]) ||
      !isAreaCreatureSpecialIdentityString(member.expectedValue)
    ) {
      fail("Expected exact retained Creature Subrace/Deity value provenance.", memberPath);
    }
    const value = targetInput[key];
    if (!isAreaCreatureSpecialIdentityString(value)) {
      fail("Expected a canonical Creature Subrace/Deity target.", targetMemberPath);
    }
    if (value !== member.expectedValue) {
      mutation[key] = { expectedValue: member.expectedValue, value };
    }
  }
  if (Object.keys(mutation).length === 0) return undefined;
  return readExistingAreaCreatureSpecialIdentityStringsMutation(mutation)!;
}

function projectCreatureScriptResRefMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): readonly ExistingAreaCreatureScriptResRefMutation[] | undefined {
  const source = record(sourceInput, sourcePath);
  const sourceKeys = Object.keys(source);
  const admittedKeys = new Set(
    AREA_CREATURE_SCRIPT_RESREF_FIELDS.map(({ key }) => key),
  );
  if (
    sourceKeys.length === 0 ||
    sourceKeys.some((key) => !admittedKeys.has(key as AreaCreatureScriptResRefKey))
  ) {
    fail("Expected exact retained Creature script ResRef provenance.", sourcePath);
  }
  const target = record(targetInput, targetPath);
  const mutations: ExistingAreaCreatureScriptResRefMutation[] = [];
  for (const mapping of AREA_CREATURE_SCRIPT_RESREF_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(source, mapping.key)) continue;
    const memberPath = `${sourcePath}.${mapping.key}`;
    const targetMemberPath = `${targetPath}.${mapping.key}`;
    const member = record(source[mapping.key], memberPath);
    if (
      !hasExactKeys(member, ["expectedResRef"]) ||
      !isAreaCreatureScriptSourceResRef(member.expectedResRef)
    ) {
      fail("Expected exact retained Creature script ResRef value provenance.", memberPath);
    }
    const resRef = target[mapping.key];
    if (resRef === member.expectedResRef) continue;
    if (!isAreaCreatureScriptTargetResRef(resRef)) {
      fail("Expected a canonical Creature script ResRef target.", targetMemberPath);
    }
    mutations.push({
      field: mapping.nativeLabel,
      expectedResRef: member.expectedResRef,
      resRef,
    });
  }
  if (mutations.length === 0) return undefined;
  const parsed = readExistingAreaCreatureScriptResRefMutations(mutations);
  if (!parsed) fail("Creature script ResRef mutation collection is invalid.", targetPath);
  return parsed;
}

function projectPlaceableLocalizedStringMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourceIndex: number | undefined,
  sourcePath: string,
  targetPath: string,
  sourceIndexPath: string,
): readonly ExistingAreaPlaceableLocalizedStringMutation[] | undefined {
  const source = record(sourceInput, sourcePath);
  if (!hasExactKeys(source, ["locName", "description"])) {
    fail("Expected an exact Placeable localized-string provenance pair.", sourcePath);
  }
  const target = record(targetInput, targetPath);
  const pairs: ExistingAreaPlaceableLocalizedStringMutation[] = [];
  for (const mapping of AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(target, mapping.targetKey)) continue;
    const memberPath = `${sourcePath}.${mapping.sourceKey}`;
    const expectedValue = readAreaPlaceableInlineAsciiStorage(
      source[mapping.sourceKey],
      mapping.maxBytes,
    );
    if (expectedValue === undefined) {
      fail(
        `Expected one bounded inline language-0 ASCII ${mapping.field} source value.`,
        memberPath,
      );
    }
    const value = target[mapping.targetKey];
    if (!isAreaPlaceableInlineAsciiText(value, mapping.maxBytes)) {
      fail(
        `Expected printable ASCII ${mapping.field} text within ${mapping.maxBytes} bytes.`,
        `${targetPath}.${mapping.targetKey}`,
      );
    }
    if (value !== expectedValue) {
      pairs.push({ field: mapping.field, expectedValue, value });
    }
  }
  if (pairs.length === 0) return undefined;
  if (sourceIndex === undefined) {
    fail(
      "A changed Placeable localized string requires immutable family-ordinal provenance.",
      sourceIndexPath,
    );
  }
  const mutation = readExistingAreaPlaceableLocalizedStringMutations(pairs);
  if (!mutation) fail("Placeable localized-string mutation is invalid.", targetPath);
  return mutation;
}

function projectPlaceableTagMutation(
  identityInput: unknown,
  targetInput: unknown,
  sourceIndex: number | undefined,
  sourcePath: string,
  targetPath: string,
  sourceIndexPath: string,
): ExistingAreaPlaceableTagMutation {
  if (sourceIndex === undefined) {
    fail("A changed Placeable Tag requires immutable family-ordinal provenance.", sourceIndexPath);
  }
  const identity = record(identityInput, sourcePath);
  const tag = record(identity.tag, sourcePath);
  if (!hasExactKeys(tag, ["present", "value"]) || !isEditableAreaPlaceableTag(tag.value)) {
    fail("Expected one present canonical bounded Placeable Tag provenance value.", sourcePath);
  }
  if (!isEditableAreaPlaceableTag(targetInput)) {
    fail("Expected a Placeable Tag with no more than 32 code units and no NUL.", targetPath);
  }
  const mutation = readExistingAreaPlaceableTagMutation({
    expectedValue: tag.value,
    value: targetInput,
  });
  if (!mutation) fail("Placeable Tag mutation is invalid.", targetPath);
  return mutation;
}

function projectPlaceableHitPointMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableHitPointMutation | undefined {
  const source = record(sourceInput, sourcePath);
  if (!hasExactKeys(source, ["hitPoints", "currentHitPoints"])) {
    fail("Expected an exact native Placeable HP / CurrentHP source pair.", sourcePath);
  }
  const expectedHitPoints = source.hitPoints;
  const expectedCurrentHitPoints = source.currentHitPoints;
  if (!isEditableAreaPlaceableHitPoints(expectedHitPoints)) {
    fail("Expected a native Placeable HP Short in the editable range 1..10000.", `${sourcePath}.hitPoints`);
  }
  if (!isAuroraShort(expectedCurrentHitPoints)) {
    fail("Expected a native Placeable CurrentHP Short.", `${sourcePath}.currentHitPoints`);
  }
  const hitPoints = integer(targetInput, 1, 10_000, targetPath);
  if (hitPoints === expectedHitPoints) return undefined;
  const currentHitPoints = deriveAreaPlaceableCurrentHitPoints({
    expectedHitPoints,
    expectedCurrentHitPoints,
    hitPoints,
  });
  const mutation = readExistingAreaPlaceableHitPointMutation({
    expectedHitPoints,
    hitPoints,
    expectedCurrentHitPoints,
    currentHitPoints,
  });
  if (!mutation) fail("Placeable HP / CurrentHP mutation is invalid.", targetPath);
  return mutation;
}

function projectPlaceableAppearanceMutation(
  identityInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableAppearanceMutation | undefined {
  const identity = record(identityInput, sourcePath);
  const appearance = record(identity.appearance, sourcePath);
  if (!hasExactKeys(appearance, ["present", "nativeType", "value", "table"]) ||
    appearance.present !== true ||
    appearance.nativeType !== "dword") {
    fail("Expected present canonical Placeable Appearance DWord provenance.", sourcePath);
  }
  const tablePath = `${sourcePath}.table`;
  const table = record(appearance.table, tablePath);
  if (!hasExactKeys(table, [
    "resourceName",
    "sourceObjectKey",
    "sourceLayer",
    "sha256",
    "sizeBytes",
    "rowCount",
    "rowIndex",
  ])) {
    fail("Expected exact effective placeables.2da provenance.", tablePath);
  }
  if (
    table.resourceName !== "placeables.2da" ||
    typeof table.sourceObjectKey !== "string" ||
    table.sourceObjectKey.length < 1 ||
    table.sourceObjectKey.length > 2048 ||
    (table.sourceLayer !== "module" && table.sourceLayer !== "hak" && table.sourceLayer !== "vanilla") ||
    typeof table.sha256 !== "string" ||
    !/^[a-f0-9]{64}$/u.test(table.sha256) ||
    !Number.isSafeInteger(table.sizeBytes) ||
    Number(table.sizeBytes) < 1 ||
    Number(table.sizeBytes) > 64 * 1024 * 1024 ||
    !Number.isSafeInteger(table.rowCount) ||
    Number(table.rowCount) < 1 ||
    Number(table.rowCount) > 1_000_000
  ) {
    fail("Expected valid effective placeables.2da provenance.", tablePath);
  }
  const rowCount = Number(table.rowCount);
  const expectedValue = integer(appearance.value, 0, 0xffff_ffff, `${sourcePath}.value`);
  if (table.rowIndex !== expectedValue || expectedValue >= rowCount) {
    fail("Placeable Appearance must equal an existing source physical row.", `${tablePath}.rowIndex`);
  }
  const value = integer(targetInput, 0, 0xffff_ffff, targetPath);
  if (value >= rowCount) {
    fail("Placeable Appearance target must be an existing physical row.", targetPath);
  }
  if (value === expectedValue) return undefined;
  const mutation = readExistingAreaPlaceableAppearanceMutation({
    expectedValue,
    value,
    tableSha256: table.sha256,
    rowCount,
  });
  if (!mutation) {
    fail("Placeable Appearance mutation is invalid.", targetPath);
  }
  return mutation;
}

function projectCreatureAppearanceMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureAppearanceMutation | undefined {
  const source = readAreaCreatureAppearanceStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature Appearance_Type Word provenance.", sourcePath);
  }
  if (!source.present || !source.table) return undefined;
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.appearanceType$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "appearanceType")) {
    return undefined;
  }
  const value = integer(creatureProperties.appearanceType, 0, 0xffff, targetPath);
  if (value >= source.table.rowCount) {
    fail("Creature Appearance target must be an existing physical row.", targetPath);
  }
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureAppearanceMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) {
    fail("Creature Appearance mutation is invalid.", targetPath);
  }
  return mutation;
}

function projectCreatureGenderMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureGenderMutation | undefined {
  const source = readAreaCreatureGenderStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature Gender Byte provenance.", sourcePath);
  }
  if (!source.present || !source.table) return undefined;
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.genderId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "genderId")) return undefined;
  const value = integer(creatureProperties.genderId, 0, 0xff, targetPath);
  if (value >= source.table.rowCount) {
    fail("Creature Gender target must be an existing physical row.", targetPath);
  }
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureGenderMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature Gender mutation is invalid.", targetPath);
  return mutation;
}

function projectCreaturePerceptionRangeMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreaturePerceptionRangeMutation | undefined {
  const source = readAreaCreaturePerceptionRangeStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature PerceptionRange Byte provenance.", sourcePath);
  }
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.advancedSettings\.perceptionRangeId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "advancedSettings")) {
    return undefined;
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    targetPath.replace(/\.perceptionRangeId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(advancedSettings, "perceptionRangeId")) {
    return undefined;
  }
  const value = integer(advancedSettings.perceptionRangeId, 8, 11, targetPath);
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreaturePerceptionRangeMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature PerceptionRange mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureWalkRateMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureWalkRateMutation | undefined {
  const source = readAreaCreatureWalkRateStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature WalkRate Int provenance.", sourcePath);
  }
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.advancedSettings\.walkRateId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "advancedSettings")) {
    return undefined;
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    targetPath.replace(/\.walkRateId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(advancedSettings, "walkRateId")) return undefined;
  const value = integer(advancedSettings.walkRateId, 1, source.table.rowCount - 1, targetPath);
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureWalkRateMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature WalkRate mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureSoundSetFileMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureSoundSetFileMutation | undefined {
  const source = readAreaCreatureSoundSetFileStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature SoundSetFile Word provenance.", sourcePath);
  }
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.advancedSettings\.soundSetFile$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "advancedSettings")) {
    return undefined;
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    targetPath.replace(/\.soundSetFile$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(advancedSettings, "soundSetFile")) return undefined;
  const value = integer(
    advancedSettings.soundSetFile,
    0,
    Math.min(65_535, source.table.rowCount - 1),
    targetPath,
  );
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureSoundSetFileMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature SoundSetFile mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureStartingPackageMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureStartingPackageMutation | undefined {
  const source = readAreaCreatureStartingPackageStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature StartingPackage Byte provenance.", sourcePath);
  }
  if (!source.present || !source.classIds || !source.table ||
    creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.advancedSettings\.startingPackageId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "advancedSettings")) {
    return undefined;
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    targetPath.replace(/\.startingPackageId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(advancedSettings, "startingPackageId")) {
    return undefined;
  }
  const value = integer(
    advancedSettings.startingPackageId,
    0,
    Math.min(255, source.table.rowCount - 1),
    targetPath,
  );
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureStartingPackageMutation({
    expectedValue: source.value,
    value,
    expectedClassIds: source.classIds,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature StartingPackage mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureSkillListMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureSkillListMutation | undefined {
  const source = readAreaCreatureSkillListStorage(sourceInput);
  if (!source) fail("Expected exact Creature SkillList provenance.", sourcePath);
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.skills$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "skills")) return undefined;
  if (!Array.isArray(creatureProperties.skills) ||
    creatureProperties.skills.length !== source.table.rowCount) {
    fail("Creature SkillList target must contain every current physical row.", targetPath);
  }
  const ranks = new Array<number>(source.table.rowCount);
  const seen = new Set<number>();
  creatureProperties.skills.forEach((entryInput, entryIndex) => {
    const entryPath = `${targetPath}.${entryIndex}`;
    const entry = record(entryInput, entryPath);
    const skillId = integer(entry.skillId, 0, source.table!.rowCount - 1, `${entryPath}.skillId`);
    if (seen.has(skillId)) fail("Creature SkillList physical row is duplicated.", `${entryPath}.skillId`);
    seen.add(skillId);
    ranks[skillId] = integer(entry.rank, 0, 0xff, `${entryPath}.rank`);
  });
  if (seen.size !== source.table.rowCount || ranks.some((rank) => rank === undefined)) {
    fail("Creature SkillList target must cover every current physical row.", targetPath);
  }
  const normalizedSource = Array.from(
    { length: source.table.rowCount },
    (_, index) => source.ranks[index] ?? 0,
  );
  const resizeMode = source.ranks.length === source.table.rowCount
    ? "same_length"
    : source.ranks.length < source.table.rowCount
      ? "expand_zero_tail"
      : "truncate_tail";
  const changed = ranks.some((rank, index) => rank !== normalizedSource[index]);
  const confirmTruncation = creatureProperties.skillListTruncationConfirmed === true;
  if (resizeMode === "truncate_tail" && !confirmTruncation) {
    if (changed) {
      fail(
        "Creature SkillList truncation must be confirmed before changing retained ranks.",
        `${targetPath.replace(/\.skills$/u, "")}.skillListTruncationConfirmed`,
      );
    }
    return undefined;
  }
  if (!changed && resizeMode !== "truncate_tail") return undefined;
  const mutation = readExistingAreaCreatureSkillListMutation({
    expectedRanks: source.ranks,
    ranks,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
    resizeMode,
    confirmTruncation: resizeMode === "truncate_tail",
  });
  if (!mutation) fail("Creature SkillList mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureFeatListMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureFeatListMutation | undefined {
  const source = readAreaCreatureFeatListStorage(sourceInput);
  if (!source) fail("Expected exact Creature FeatList provenance.", sourcePath);
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  if (source.opaqueSiblingFieldCounts.some((count) => count !== 0) ||
    new Set(source.featIds).size !== source.featIds.length) {
    fail("Creature FeatList source is not one canonical unique vector.", sourcePath);
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.feats$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "feats")) return undefined;
  if (!Array.isArray(creatureProperties.feats)) {
    fail("Creature FeatList target must be an array.", targetPath);
  }
  const featIds: number[] = [];
  const seen = new Set<number>();
  creatureProperties.feats.forEach((entryInput, entryIndex) => {
    const entryPath = `${targetPath}.${entryIndex}`;
    const entry = record(entryInput, entryPath);
    const featId = integer(entry.featId, 0, source.table!.rowCount - 1, `${entryPath}.featId`);
    if (seen.has(featId)) fail("Creature FeatList physical row is duplicated.", `${entryPath}.featId`);
    seen.add(featId);
    if (typeof entry.assigned !== "boolean") {
      fail("Creature FeatList assignment state must be boolean.", `${entryPath}.assigned`);
    }
    if (entry.assigned) featIds.push(featId);
  });
  const selected = new Set(featIds);
  const sameMembership = featIds.length === source.featIds.length &&
    source.featIds.every((featId) => selected.has(featId));
  if (sameMembership) return undefined;
  const sourceHasRow40 = source.featIds.includes(40);
  const targetHasRow40 = featIds.includes(40);
  const mutation = readExistingAreaCreatureFeatListMutation({
    expectedFeatIds: source.featIds,
    featIds,
    opaqueSiblingFieldCounts: source.opaqueSiblingFieldCounts,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
    row40Transition: sourceHasRow40 === targetHasRow40
      ? "unchanged"
      : targetHasRow40 ? "added" : "removed",
  });
  if (!mutation) fail("Creature FeatList mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureSpecialAbilityListMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureSpecialAbilityListMutation | undefined {
  const source = readAreaCreatureSpecialAbilityListStorage(sourceInput);
  if (!source) fail("Expected exact Creature SpecAbilityList provenance.", sourcePath);
  if (!source.present || !source.table || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const sourceProfile = groupCanonicalCreatureSpecialAbilityEntries(source.entries);
  if (!sourceProfile) {
    fail("Creature SpecAbilityList source is not canonical and sibling-free.", sourcePath);
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.specialAbilities$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "specialAbilities")) {
    return undefined;
  }
  if (!Array.isArray(creatureProperties.specialAbilities) ||
    creatureProperties.specialAbilities.length > source.table.rowCount) {
    fail("Creature SpecAbilityList target must be a bounded array.", targetPath);
  }
  const seen = new Set<number>();
  const targetProfile: Array<{ spellId: number; uses: number; casterLevel: number }> = [];
  creatureProperties.specialAbilities.forEach((entryInput, entryIndex) => {
    const entryPath = `${targetPath}.${entryIndex}`;
    const entry = record(entryInput, entryPath);
    const spellId = integer(
      entry.spellId,
      0,
      source.table!.rowCount - 1,
      `${entryPath}.spellId`,
    );
    if (seen.has(spellId)) {
      fail("Creature SpecAbilityList spell row is duplicated.", `${entryPath}.spellId`);
    }
    seen.add(spellId);
    const uses = integer(entry.uses, 0, 0xff, `${entryPath}.uses`);
    const casterLevel = integer(entry.casterLevel, 0, 15, `${entryPath}.casterLevel`);
    if (uses > 0) targetProfile.push({ spellId, uses, casterLevel });
  });
  const sourceById = new Map(sourceProfile.map((entry) => [entry.spellId, entry]));
  const unchanged = sourceProfile.length === targetProfile.length &&
    targetProfile.every((entry) => {
      const expected = sourceById.get(entry.spellId);
      return expected?.uses === entry.uses && expected.casterLevel === entry.casterLevel;
    });
  if (unchanged) return undefined;
  const mutation = readExistingAreaCreatureSpecialAbilityListMutation({
    expectedEntries: sourceProfile,
    entries: targetProfile,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) fail("Creature SpecAbilityList mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureClassSlotResizeMutation(
  sourceInput: unknown,
  startingPackageInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  startingPackageSourcePath: string,
  targetPath: string,
): ExistingAreaCreatureClassSlotResizeMutation | undefined {
  const source = readAreaCreatureClassIdentityState(sourceInput);
  if (!source) fail("Expected exact Creature ClassList graph provenance.", sourcePath);
  if (!source.present || !source.classesTable || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.classEntries$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "classEntries")) {
    return undefined;
  }
  if (!Array.isArray(creatureProperties.classEntries)) {
    fail("Creature class-slot target must be an ordered array.", targetPath);
  }
  if (creatureProperties.classEntries.length === source.entries.length) return undefined;

  const startingPackage = readAreaCreatureStartingPackageStorage(startingPackageInput);
  if (!startingPackage) {
    fail("Expected exact Creature StartingPackage provenance for class-slot resize.", startingPackageSourcePath);
  }
  if (!startingPackage.present || !startingPackage.table || !startingPackage.classIds) {
    fail("Creature class-slot resize requires bound StartingPackage provenance.", startingPackageSourcePath);
  }
  if (startingPackage.classIds.length !== source.entries.length ||
    startingPackage.classIds.some((classId, index) => classId !== source.entries[index]!.classId)) {
    fail("Creature ClassList and StartingPackage provenance disagree.", startingPackageSourcePath);
  }

  const classIds: number[] = [];
  const levels: number[] = [];
  for (const [index, entryInput] of creatureProperties.classEntries.entries()) {
    const entryPath = `${targetPath}.${index}`;
    const entry = record(entryInput, entryPath);
    classIds.push(integer(entry.classId, 0, source.classesTable.rowCount - 1, `${entryPath}.classId`));
    levels.push(integer(entry.level, 1, 60, `${entryPath}.level`));
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    `${targetPath.replace(/\.classEntries$/u, "")}.advancedSettings`,
  );
  const targetPackage = integer(
    advancedSettings.startingPackageId,
    0,
    startingPackage.table.rowCount - 1,
    `${targetPath.replace(/\.classEntries$/u, "")}.advancedSettings.startingPackageId`,
  );
  const truncate = classIds.length < source.entries.length;
  const mutation = readExistingAreaCreatureClassSlotResizeMutation({
    expectedClassIds: source.entries.map((entry) => entry.classId),
    expectedLevels: source.entries.map((entry) => entry.level),
    classIds,
    levels,
    classListGraphSha256: source.classListGraphSha256,
    resizeMode: truncate ? "truncate_tail" : "append_tail",
    destructiveRemovedSlotsConfirmed:
      creatureProperties.classSlotResizeDestructiveRemovalConfirmed,
    expectedStartingPackage: startingPackage.value,
    startingPackage: targetPackage,
    classesTableSha256: source.classesTable.sha256,
    classesRowCount: source.classesTable.rowCount,
    packagesTableSha256: startingPackage.table.sha256,
    packagesRowCount: startingPackage.table.rowCount,
  });
  if (!mutation) fail("Creature class-slot resize is not an exact admitted tail transition.", targetPath);
  return mutation;
}

function projectCreatureClassIdentityMutation(
  sourceInput: unknown,
  startingPackageInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  startingPackageSourcePath: string,
  targetPath: string,
): ExistingAreaCreatureClassIdentityMutation | undefined {
  const source = readAreaCreatureClassIdentityState(sourceInput);
  if (!source) fail("Expected exact Creature ClassList graph provenance.", sourcePath);
  if (!source.present || !source.classesTable || creaturePropertiesInput === undefined) {
    return undefined;
  }
  const startingPackage = readAreaCreatureStartingPackageStorage(startingPackageInput);
  if (!startingPackage) {
    fail("Expected exact Creature StartingPackage provenance for class identity.", startingPackageSourcePath);
  }
  if (!startingPackage.present || !startingPackage.table || !startingPackage.classIds) {
    return undefined;
  }
  if (startingPackage.classIds.length !== source.entries.length ||
    startingPackage.classIds.some((classId, index) => classId !== source.entries[index]!.classId)) {
    fail("Creature ClassList and StartingPackage provenance disagree.", startingPackageSourcePath);
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.classEntries$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "classEntries")) return undefined;
  if (!Array.isArray(creatureProperties.classEntries) ||
    creatureProperties.classEntries.length !== source.entries.length) {
    fail("Creature class-identity target must preserve the exact roster size.", targetPath);
  }
  const classIds: number[] = [];
  const levels: number[] = [];
  for (const [index, entryInput] of creatureProperties.classEntries.entries()) {
    const entryPath = `${targetPath}.${index}`;
    const entry = record(entryInput, entryPath);
    const sourceEntry = source.entries[index]!;
    classIds.push(integer(entry.classId, 0, source.classesTable.rowCount - 1, `${entryPath}.classId`));
    levels.push(integer(entry.level, 1, 60, `${entryPath}.level`));
  }
  if (levels.reduce((sum, level) => sum + level, 0) > 180) {
    fail("Creature total class level must not exceed 180.", targetPath);
  }
  if (classIds.every((classId, index) => classId === source.entries[index]!.classId)) {
    return undefined;
  }
  if (creatureProperties.classIdentityDestructiveSpellClearConfirmed !== true) {
    fail(
      "Creature class identity change requires explicit destructive spell-clear confirmation.",
      `${targetPath.replace(/\.classEntries$/u, "")}.classIdentityDestructiveSpellClearConfirmed`,
    );
  }
  const advancedSettings = record(
    creatureProperties.advancedSettings,
    `${targetPath.replace(/\.classEntries$/u, "")}.advancedSettings`,
  );
  const targetPackage = integer(
    advancedSettings.startingPackageId,
    0,
    startingPackage.table.rowCount - 1,
    `${targetPath.replace(/\.classEntries$/u, "")}.advancedSettings.startingPackageId`,
  );
  const mutation = readExistingAreaCreatureClassIdentityMutation({
    expectedClassIds: source.entries.map((entry) => entry.classId),
    classIds,
    expectedLevels: source.entries.map((entry) => entry.level),
    levels,
    classListGraphSha256: source.classListGraphSha256,
    destructiveSpellClearConfirmed: true,
    expectedStartingPackage: startingPackage.value,
    startingPackage: targetPackage,
    classesTableSha256: source.classesTable.sha256,
    classesRowCount: source.classesTable.rowCount,
    packagesTableSha256: startingPackage.table.sha256,
    packagesRowCount: startingPackage.table.rowCount,
  });
  if (!mutation) fail("Creature class-identity mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureClassLevelMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
  allowClassIdentityChange = false,
): ExistingAreaCreatureClassLevelMutation | undefined {
  const source = readAreaCreatureClassLevelState(sourceInput);
  if (!source) fail("Expected exact Creature ClassList level provenance.", sourcePath);
  if (!source.present || creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.classEntries$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "classEntries")) {
    return undefined;
  }
  if (!Array.isArray(creatureProperties.classEntries) ||
    creatureProperties.classEntries.length !== source.entries.length) {
    fail("Creature class-level target must preserve the exact roster size.", targetPath);
  }
  const targetEntries = creatureProperties.classEntries;
  if (allowClassIdentityChange) {
    targetEntries.forEach((entryInput, index) => {
      const entryPath = `${targetPath}.${index}`;
      const entry = record(entryInput, entryPath);
      integer(entry.classId, 0, 0x7fff_ffff, `${entryPath}.classId`);
      integer(entry.level, 1, 60, `${entryPath}.level`);
    });
    return undefined;
  }
  const levels = targetEntries.map((entryInput, index) => {
    const entryPath = `${targetPath}.${index}`;
    const entry = record(entryInput, entryPath);
    const sourceEntry = source.entries[index]!;
    const classId = integer(entry.classId, 0, 0x7fff_ffff, `${entryPath}.classId`);
    if (classId !== sourceEntry.classId) {
      fail("Creature class-level target must preserve class identity and order.", `${entryPath}.classId`);
    }
    return integer(entry.level, 1, 60, `${entryPath}.level`);
  });
  if (levels.every((level, index) => level === source.entries[index]!.level)) {
    return undefined;
  }
  const mutation = readExistingAreaCreatureClassLevelMutation({
    expectedClassIds: source.entries.map((entry) => entry.classId),
    expectedLevels: source.entries.map((entry) => entry.level),
    levels,
    opaqueSiblingFieldCounts: source.entries.map(
      (entry) => entry.opaqueSiblingFieldCount,
    ),
  });
  if (!mutation) fail("Creature class-level mutation is invalid.", targetPath);
  return mutation;
}

function projectCreaturePhenotypeMutation(
  sourceInput: unknown,
  appearanceSourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  appearanceSourcePath: string,
  targetPath: string,
): ExistingAreaCreaturePhenotypeMutation | undefined {
  const source = readAreaCreaturePhenotypeStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature Phenotype Int provenance.", sourcePath);
  }
  const appearance = readAreaCreatureAppearanceStorage(appearanceSourceInput);
  if (!appearance) {
    fail("Expected exact Creature Appearance_Type provenance for Phenotype.", appearanceSourcePath);
  }
  if (!source.present || !source.table || !appearance.present || !appearance.table) {
    return undefined;
  }
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.phenotypeId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "phenotypeId")) {
    return undefined;
  }
  const targetAppearance = integer(
    creatureProperties.appearanceType,
    0,
    0xffff,
    targetPath.replace(/phenotypeId$/u, "appearanceType"),
  );
  if (targetAppearance !== appearance.value) {
    fail(
      "Creature Phenotype requires the retained Appearance_Type to remain unchanged.",
      targetPath.replace(/phenotypeId$/u, "appearanceType"),
    );
  }
  const value = integer(creatureProperties.phenotypeId, 0, 0xff, targetPath);
  if (value === 1 || value >= source.table.rowCount) {
    fail("Creature Phenotype target is not a round-trippable physical row.", targetPath);
  }
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreaturePhenotypeMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
    appearanceExpectedValue: appearance.value,
    appearanceTableSha256: appearance.table.sha256,
    appearanceRowCount: appearance.table.rowCount,
  });
  if (!mutation) fail("Creature Phenotype mutation is invalid.", targetPath);
  return mutation;
}

function projectCreaturePortraitMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreaturePortraitMutation | undefined {
  const source = readAreaCreaturePortraitStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature PortraitId Word provenance.", sourcePath);
  }
  if (!source.present || !source.selectorContext || !source.table) return undefined;
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.portraitId$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "portraitId")) {
    return undefined;
  }
  const value = integer(creatureProperties.portraitId, 0, 0xffff, targetPath);
  if (value >= source.table.rowCount) {
    fail("Creature PortraitId target is not a physical portraits.2da row.", targetPath);
  }
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreaturePortraitMutation({
    expectedValue: source.value,
    value,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
    genderExpectedValue: source.selectorContext.genderValue,
    raceExpectedValue: source.selectorContext.raceValue,
  });
  if (!mutation) fail("Creature PortraitId mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureChallengeRatingMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureChallengeRatingMutation | undefined {
  const source = readAreaCreatureChallengeRatingStorage(sourceInput);
  if (!source) {
    fail(
      "Expected exact presence-sensitive Creature ChallengeRating Float provenance.",
      sourcePath,
    );
  }
  if (!source.present || creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.challengeRating$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "challengeRating")) {
    return undefined;
  }
  const value = normalizeAreaCreatureChallengeRating(creatureProperties.challengeRating);
  if (value === null) {
    fail("Creature ChallengeRating target must be a finite Float in [0, 1000].", targetPath);
  }
  if (Object.is(value, source.value)) return undefined;
  const mutation = readExistingAreaCreatureChallengeRatingMutation({
    expectedValue: source.value,
    value,
  });
  if (!mutation) fail("Creature ChallengeRating mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureAbilityScoreMutations(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureAbilityScoreMutations | undefined {
  const source = readAreaCreatureAbilityScoresStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature ability-score Byte provenance.", sourcePath);
  }
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.statistics\.abilityScores$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "statistics")) return undefined;
  const statistics = record(
    creatureProperties.statistics,
    targetPath.replace(/\.abilityScores$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(statistics, "abilityScores")) return undefined;
  const target = record(statistics.abilityScores, targetPath);
  const mutations: Record<string, unknown> = {};
  for (const field of AREA_CREATURE_ABILITY_SCORE_FIELDS) {
    const sourceMember = source[field.key];
    if (!sourceMember.present || !Object.prototype.hasOwnProperty.call(target, field.key)) {
      continue;
    }
    const value = target[field.key];
    if (!isAreaCreatureAbilityScore(value)) {
      fail("Creature base ability-score target must be an integer Byte in [0, 255].", `${targetPath}.${field.key}`);
    }
    if (value !== sourceMember.value) {
      mutations[field.key] = { expectedValue: sourceMember.value, value };
    }
  }
  if (Object.keys(mutations).length === 0) return undefined;
  const result = readExistingAreaCreatureAbilityScoreMutations(mutations);
  if (!result) fail("Creature base ability-score mutation is invalid.", targetPath);
  return result;
}

function projectCreatureAppearanceColorMutations(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureAppearanceColorMutations | undefined {
  const source = readAreaCreatureAppearanceColorsStorage(sourceInput);
  if (!source) {
    fail(
      "Expected exact presence-sensitive Creature appearance-color Byte provenance.",
      sourcePath,
    );
  }
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.appearanceSettings\.colors$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "appearanceSettings")) {
    return undefined;
  }
  const appearanceSettings = record(
    creatureProperties.appearanceSettings,
    targetPath.replace(/\.colors$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(appearanceSettings, "colors")) return undefined;
  const target = record(appearanceSettings.colors, targetPath);
  const mutations: Record<string, unknown> = {};
  for (const field of AREA_CREATURE_APPEARANCE_COLOR_FIELDS) {
    const sourceMember = source[field.key];
    if (!sourceMember.present || !Object.prototype.hasOwnProperty.call(target, field.key)) {
      continue;
    }
    const rawValue = target[field.key];
    if (typeof rawValue !== "string" || !/^(?:0|[1-9][0-9]{0,2})$/u.test(rawValue)) {
      fail(
        "Creature appearance-color target must be one canonical decimal Byte string.",
        `${targetPath}.${field.key}`,
      );
    }
    const value = Number(rawValue);
    if (!isAreaCreatureAppearanceColor(value)) {
      fail(
        "Creature appearance-color target must be an integer Byte in [0, 255].",
        `${targetPath}.${field.key}`,
      );
    }
    if (value !== sourceMember.value) {
      mutations[field.key] = { expectedValue: sourceMember.value, value };
    }
  }
  if (Object.keys(mutations).length === 0) return undefined;
  const result = readExistingAreaCreatureAppearanceColorMutations(mutations);
  if (!result) fail("Creature appearance-color mutation is invalid.", targetPath);
  return result;
}

const CREATURE_SOURCE_ONLY_BODY_PART_KEYS = new Set([
  "belt",
  "rightShoulder",
  "leftShoulder",
]);

function projectCreatureBodyPartMutations(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureBodyPartMutations | undefined {
  const source = readAreaCreatureBodyPartsStorage(sourceInput);
  if (!source) {
    fail("Expected exact Creature body-part compatibility provenance.", sourcePath);
  }
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.appearanceSettings$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "appearanceSettings")) {
    return undefined;
  }
  const appearanceSettings = record(creatureProperties.appearanceSettings, targetPath);
  const hasSourceOnlyParts = Object.prototype.hasOwnProperty.call(
    appearanceSettings,
    "sourceOnlyParts",
  );
  const sourceOnlyParts = hasSourceOnlyParts
    ? record(appearanceSettings.sourceOnlyParts, `${targetPath}.sourceOnlyParts`)
    : undefined;
  const mutations: Record<string, unknown> = {};
  for (const field of AREA_CREATURE_BODY_PART_FIELDS) {
    const sourceMember = source[field.key];
    if (!sourceMember.present) continue;
    const isSourceOnly = CREATURE_SOURCE_ONLY_BODY_PART_KEYS.has(field.key);
    const target = isSourceOnly ? sourceOnlyParts : appearanceSettings;
    if (!target || !Object.prototype.hasOwnProperty.call(target, field.key)) continue;
    const memberPath = isSourceOnly
      ? `${targetPath}.sourceOnlyParts.${field.key}`
      : `${targetPath}.${field.key}`;
    const rawValue = target[field.key];
    if (typeof rawValue !== "string" || !/^(?:0|[1-9][0-9]{0,4})$/u.test(rawValue)) {
      fail("Creature body-part target must be one canonical decimal string.", memberPath);
    }
    const value = Number(rawValue);
    const maximum = maximumAreaCreatureBodyPartTarget(sourceMember);
    if (maximum === null || value > maximum) {
      fail(
        `Creature body-part target must be an integer in [0, ${maximum ?? 0}].`,
        memberPath,
      );
    }
    if (value !== sourceMember.value) {
      mutations[field.key] = { expectedValue: sourceMember.value, value };
    }
  }
  if (Object.keys(mutations).length === 0) return undefined;
  const result = readExistingAreaCreatureBodyPartMutations(mutations);
  if (!result) fail("Creature body-part mutation is invalid.", targetPath);
  return result;
}

function projectCreatureAppendageMutations(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureAppendageMutations | undefined {
  const source = readAreaCreatureAppendagesStorage(sourceInput);
  if (!source) fail("Expected exact Creature appendage provenance.", sourcePath);
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.appearanceSettings$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "appearanceSettings")) {
    return undefined;
  }
  const appearanceSettings = record(creatureProperties.appearanceSettings, targetPath);
  const mutations: Record<string, unknown> = {};
  for (const definition of AREA_CREATURE_APPENDAGE_FIELDS) {
    const member = source[definition.key];
    if (
      !member.present ||
      !member.modernDword.present ||
      !member.modernDword.table ||
      !Object.prototype.hasOwnProperty.call(appearanceSettings, definition.key)
    ) continue;
    const memberPath = `${targetPath}.${definition.key}`;
    const rawValue = appearanceSettings[definition.key];
    if (typeof rawValue !== "string" || !/^(?:0|[1-9][0-9]{0,9})$/u.test(rawValue)) {
      fail("Creature appendage target must be one canonical decimal DWord string.", memberPath);
    }
    const value = Number(rawValue);
    if (
      !Number.isSafeInteger(value) ||
      value < 0 ||
      value > 0xffff_ffff ||
      value >= member.modernDword.table.rowCount
    ) {
      fail("Creature appendage target must identify an effective physical table row.", memberPath);
    }
    if (value !== member.value) {
      mutations[definition.key] = {
        expectedValue: member.value,
        value,
        tableSha256: member.modernDword.table.sha256,
        rowCount: member.modernDword.table.rowCount,
      };
    }
  }
  if (Object.keys(mutations).length === 0) return undefined;
  const result = readExistingAreaCreatureAppendageMutations(mutations);
  if (!result) fail("Creature appendage mutation is invalid.", targetPath);
  return result;
}

function projectCreatureHitPointMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  constitutionMutation: Readonly<{ expectedValue: number; value: number }> | undefined,
  classLevelMutation: Pick<
    ExistingAreaCreatureClassLevelMutation,
    "expectedLevels" | "levels"
  > | undefined,
  featListMutation: ExistingAreaCreatureFeatListMutation | undefined,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureHitPointMutation | undefined {
  const source = readAreaCreatureHitPointState(sourceInput);
  if (!source) {
    fail("Expected exact coupled Creature hit-point provenance.", sourcePath);
  }
  if (creaturePropertiesInput === undefined) {
    if (constitutionMutation || classLevelMutation ||
      featListMutation?.row40Transition !== undefined &&
        featListMutation.row40Transition !== "unchanged") {
      fail("Creature Constitution coupling requires hit-point targets.", targetPath);
    }
    return undefined;
  }
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.statistics$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "statistics")) {
    if (constitutionMutation || classLevelMutation ||
      featListMutation?.row40Transition !== undefined &&
        featListMutation.row40Transition !== "unchanged") {
      fail("Creature Constitution coupling requires hit-point targets.", targetPath);
    }
    return undefined;
  }
  const statistics = record(creatureProperties.statistics, targetPath);
  if (!source.present) {
    if (constitutionMutation || classLevelMutation ||
      featListMutation?.row40Transition !== undefined &&
        featListMutation.row40Transition !== "unchanged") {
      fail("Creature Constitution edit requires present hit-point provenance.", sourcePath);
    }
    return undefined;
  }

  let baseHitPoints = source.hitPoints.value;
  if (Object.prototype.hasOwnProperty.call(statistics, "baseHitPoints")) {
    if (!Number.isSafeInteger(statistics.baseHitPoints)) {
      fail("Creature Base HP target must be an integer.", `${targetPath}.baseHitPoints`);
    }
    baseHitPoints = Number(statistics.baseHitPoints);
  }
  let constitution = source.constitution.value;
  if (Object.prototype.hasOwnProperty.call(statistics, "abilityScores")) {
    const abilityScores = record(
      statistics.abilityScores,
      `${targetPath}.abilityScores`,
    );
    if (Object.prototype.hasOwnProperty.call(abilityScores, "constitution")) {
      if (!isAreaCreatureAbilityScore(abilityScores.constitution)) {
        fail(
          "Creature Constitution target must be an integer Byte in [0, 255].",
          `${targetPath}.abilityScores.constitution`,
        );
      }
      constitution = Number(abilityScores.constitution);
    }
  }
  const baseChanged = baseHitPoints !== source.hitPoints.value;
  const constitutionChanged = constitution !== source.constitution.value;
  const classLevelsChanged = classLevelMutation !== undefined;
  const featRow40Changed = featListMutation?.row40Transition !== undefined &&
    featListMutation.row40Transition !== "unchanged";
  if (!baseChanged && !constitutionChanged && !classLevelsChanged && !featRow40Changed) {
    return undefined;
  }
  if (!source.racialTypes) {
    fail(
      "Creature hit-point edit requires an exact effective racialtypes.2da binding.",
      `${sourcePath}.racialTypes`,
    );
  }
  if (constitutionChanged && (!constitutionMutation ||
    constitutionMutation.expectedValue !== source.constitution.value ||
    constitutionMutation.value !== constitution)) {
    fail(
      "Creature Constitution and hit-point mutations must be coupled.",
      `${targetPath}.abilityScores.constitution`,
    );
  }
  if (constitutionMutation && (
    constitutionMutation.expectedValue !== source.constitution.value ||
    constitutionMutation.value !== constitution
  )) {
    fail(
      "Creature Constitution provenance disagrees with hit-point provenance.",
      sourcePath,
    );
  }
  if (classLevelMutation && (
    classLevelMutation.expectedLevels.length !== source.classLevels.length ||
    classLevelMutation.expectedLevels.some(
      (level, index) => level !== source.classLevels[index],
    )
  )) {
    fail(
      "Creature ClassList and hit-point provenance disagree.",
      sourcePath,
    );
  }
  const target = deriveExistingAreaCreatureHitPointTarget(source, {
    baseHitPoints,
    constitution,
    ...(classLevelMutation ? { classLevels: classLevelMutation.levels } : {}),
    ...(featRow40Changed
      ? { featRow40Present: featListMutation!.featIds.includes(40) }
      : {}),
  });
  if (!target) {
    fail(
      "Creature hit-point target violates native derivation or Toolset bounds.",
      targetPath,
    );
  }
  const mutation = readExistingAreaCreatureHitPointMutation({
    expectedHitPoints: source.hitPoints.value,
    expectedCurrentHitPoints: source.currentHitPoints.value,
    expectedMaxHitPoints: source.maxHitPoints.value,
    ...target,
    expectedConstitution: source.constitution.value,
    race: source.race.value,
    classLevels: source.classLevels,
    ...(classLevelMutation ? { targetClassLevels: classLevelMutation.levels } : {}),
    featRow40Present: source.featRow40Present,
    ...(featRow40Changed
      ? { targetFeatRow40Present: featListMutation!.featIds.includes(40) }
      : {}),
    racialConstitutionAdjust: source.racialTypes.constitutionAdjust,
    racialTypesSha256: source.racialTypes.sha256,
    racialTypesRowCount: source.racialTypes.rowCount,
  });
  if (!mutation) fail("Creature coupled hit-point mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureNaturalArmorClassMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureNaturalArmorClassMutation | undefined {
  const source = readAreaCreatureNaturalArmorClassStorage(sourceInput);
  if (!source) {
    fail(
      "Expected exact presence-sensitive Creature NaturalAC Byte provenance.",
      sourcePath,
    );
  }
  if (!source.present || creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.statistics\.naturalArmorClass$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "statistics")) {
    return undefined;
  }
  const statistics = record(
    creatureProperties.statistics,
    targetPath.replace(/\.naturalArmorClass$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(statistics, "naturalArmorClass")) {
    return undefined;
  }
  const value = statistics.naturalArmorClass;
  if (!isAreaCreatureNaturalArmorClass(value)) {
    fail("Creature NaturalAC target must be an integer Byte in [0, 255].", targetPath);
  }
  if (value === source.value) return undefined;
  const mutation = readExistingAreaCreatureNaturalArmorClassMutation({
    expectedValue: source.value,
    value,
  });
  if (!mutation) fail("Creature NaturalAC mutation is invalid.", targetPath);
  return mutation;
}

function projectCreatureSavingThrowBonusMutations(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureSavingThrowBonusMutations | undefined {
  const source = readAreaCreatureSavingThrowBonusesStorage(sourceInput);
  if (!source) {
    fail(
      "Expected exact presence-sensitive Creature saving-throw Short provenance.",
      sourcePath,
    );
  }
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.statistics$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "statistics")) {
    return undefined;
  }
  const statistics = record(creatureProperties.statistics, targetPath);
  const mutations: Record<string, unknown> = {};
  for (const field of AREA_CREATURE_SAVING_THROW_BONUS_FIELDS) {
    const sourceMember = source[field.key];
    if (
      !sourceMember.present ||
      !Object.prototype.hasOwnProperty.call(statistics, field.statisticsKey)
    ) continue;
    const value = statistics[field.statisticsKey];
    if (!isAreaCreatureSavingThrowBonus(value)) {
      fail(
        "Creature saving-throw bonus target must be an integer Short in [0, 250].",
        `${targetPath}.${field.statisticsKey}`,
      );
    }
    if (value !== sourceMember.value) {
      mutations[field.key] = { expectedValue: sourceMember.value, value };
    }
  }
  if (Object.keys(mutations).length === 0) return undefined;
  const result = readExistingAreaCreatureSavingThrowBonusMutations(mutations);
  if (!result) fail("Creature saving-throw bonus mutation is invalid.", targetPath);
  return result;
}

function projectCreatureAlignmentMutation(
  sourceInput: unknown,
  creaturePropertiesInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureAlignmentMutation | undefined {
  const source = readAreaCreatureAlignmentStorage(sourceInput);
  if (!source) {
    fail("Expected exact presence-sensitive Creature alignment Byte provenance.", sourcePath);
  }
  if (!source.goodEvil.present || !source.lawfulChaotic.present) return undefined;
  if (creaturePropertiesInput === undefined) return undefined;
  const creatureProperties = record(
    creaturePropertiesInput,
    targetPath.replace(/\.alignment$/u, ""),
  );
  if (!Object.prototype.hasOwnProperty.call(creatureProperties, "alignment")) {
    return undefined;
  }
  const target = resolveAreaCreatureAlignmentPair(creatureProperties.alignment);
  if (!target) {
    fail("Creature alignment target must be one exact canonical alignment label.", targetPath);
  }
  if (
    target.goodEvil === source.goodEvil.value &&
    target.lawfulChaotic === source.lawfulChaotic.value
  ) return undefined;
  const mutation = readExistingAreaCreatureAlignmentMutation({
    expectedGoodEvil: source.goodEvil.value,
    expectedLawfulChaotic: source.lawfulChaotic.value,
    goodEvil: target.goodEvil,
    lawfulChaotic: target.lawfulChaotic,
  });
  if (!mutation) fail("Creature alignment mutation is invalid.", targetPath);
  return mutation;
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function projectPlaceableEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableEditorCommentMutation | undefined {
  if (!isAreaPlaceableEditorComment(sourceInput)) {
    fail(
      "Expected a Placeable editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaPlaceableEditorComment(targetInput)) {
    fail(
      "Expected a Placeable editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectCreatureEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaCreatureEditorCommentMutation | undefined {
  if (!isAreaCreatureEditorComment(sourceInput)) {
    fail(
      "Expected a Creature editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaCreatureEditorComment(targetInput)) {
    fail(
      "Expected a Creature editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectItemEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemEditorCommentMutation | undefined {
  if (!isAreaItemEditorComment(sourceInput)) {
    fail(
      "Expected an Item editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaItemEditorComment(targetInput)) {
    fail(
      "Expected an Item editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectStoreEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaStoreEditorCommentMutation | undefined {
  if (!isAreaStoreEditorComment(sourceInput)) {
    fail(
      "Expected a Store editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaStoreEditorComment(targetInput)) {
    fail(
      "Expected a Store editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectEncounterEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterEditorCommentMutation | undefined {
  if (!isAreaEncounterEditorComment(sourceInput)) {
    fail(
      "Expected an Encounter editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaEncounterEditorComment(targetInput)) {
    fail(
      "Expected an Encounter editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectTriggerEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerEditorCommentMutation | undefined {
  if (!isAreaTriggerEditorComment(sourceInput)) {
    fail(
      "Expected a Trigger editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaTriggerEditorComment(targetInput)) {
    fail(
      "Expected a Trigger editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectWaypointEditorCommentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointEditorCommentMutation | undefined {
  if (!isAreaWaypointEditorComment(sourceInput)) {
    fail(
      "Expected a Waypoint editor comment with no NUL and no more than 4096 code units.",
      sourcePath,
    );
  }
  if (!isAreaWaypointEditorComment(targetInput)) {
    fail(
      "Expected a Waypoint editor comment with no NUL and no more than 4096 code units.",
      targetPath,
    );
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectStoreCommerceMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaStoreCommerceMutation | undefined {
  const source = readAreaStoreCommerceValue(sourceInput);
  if (!source) fail("Store commerce provenance is malformed.", sourcePath);
  const target = readAreaStoreCommerceValue(targetInput);
  if (!target) fail("Store commerce target is malformed.", targetPath);
  if (areaStoreCommerceValueEqual(source, target)) return undefined;
  const mutation = readAreaStoreCommerceMutation({ expectedValue: source, value: target });
  if (!mutation) fail("Store commerce mutation is malformed.", targetPath);
  return mutation;
}

function projectStoreScriptResRefsMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaStoreScriptResRefsMutation | undefined {
  const source = readAreaStoreScriptResRefsValue(sourceInput);
  if (!source) fail("Store script ResRef provenance is malformed.", sourcePath);
  const target = readAreaStoreScriptResRefsTargetValue(targetInput);
  if (!target) fail("Store script ResRef target is malformed.", targetPath);
  if (areaStoreScriptResRefsValueEqual(source, target)) return undefined;
  const mutation = readAreaStoreScriptResRefsMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Store script ResRef mutation is malformed.", targetPath);
  return mutation;
}

function projectItemTagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemTagMutation | undefined {
  const source = readExistingAreaItemTagStorage(sourceInput);
  if (!source) {
    fail("Item Tag provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isEditableAreaItemTag(targetInput)) {
    fail("Expected an Item Tag with no more than 32 code units and no NUL.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaItemTagMutation({
    expectedValue: source.value,
    value: targetInput,
  });
  if (!mutation) fail("Item Tag mutation is invalid.", targetPath);
  return mutation;
}

function projectTriggerTagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerTagMutation | undefined {
  const source = readExistingAreaTriggerTagStorage(sourceInput);
  if (!source) {
    fail("Trigger Tag provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isEditableAreaTriggerTag(targetInput)) {
    fail("Expected a Trigger Tag with no more than 32 code units and no NUL.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaTriggerTagMutation({
    expectedValue: source.value,
    value: targetInput,
  });
  if (!mutation) fail("Trigger Tag mutation is invalid.", targetPath);
  return mutation;
}

function projectTriggerTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerTemplateResRefMutation | undefined {
  const source = readAreaTriggerTemplateResRefStorage(sourceInput);
  if (!source) {
    fail("Expected exact Trigger TemplateResRef storage provenance.", sourcePath);
  }
  if (!source.present) {
    if (targetInput === undefined) return undefined;
    fail("An absent Trigger TemplateResRef is preserve-only.", targetPath);
  }
  if (targetInput === undefined || targetInput === source.value) return undefined;
  if (!isAreaTriggerTemplateResRef(targetInput)) {
    fail("Expected a canonical lowercase Trigger TemplateResRef.", targetPath);
  }
  const mutation = readExistingAreaTriggerTemplateResRefMutation({
    expectedResRef: source.value,
    resRef: targetInput,
  });
  if (!mutation) fail("Trigger TemplateResRef mutation is invalid.", targetPath);
  return mutation;
}

function projectTriggerLocalizedNameMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerLocalizedNameMutation | undefined {
  const source = readAreaTriggerLocalizedNameStorage(sourceInput);
  if (!source) fail("Trigger LocalizedName storage provenance is malformed.", sourcePath);
  if (targetInput === undefined) return undefined;
  const expectedValue = readAreaTriggerLocalizedNameInlineAsciiStorage(source);
  if (expectedValue === undefined) {
    fail("Trigger LocalizedName storage is preserve-only.", sourcePath);
  }
  if (!isAreaTriggerLocalizedNameInlineAsciiText(targetInput)) {
    fail("Expected a bounded printable-ASCII Trigger LocalizedName.", targetPath);
  }
  if (expectedValue === targetInput) return undefined;
  const mutation = readExistingAreaTriggerLocalizedNameMutation({
    expectedValue,
    value: targetInput,
  });
  if (!mutation) fail("Trigger LocalizedName mutation is invalid.", targetPath);
  return mutation;
}

function projectTriggerScriptResRefsMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerScriptResRefsMutation | undefined {
  const source = readAreaTriggerScriptResRefsStorage(sourceInput);
  if (!source) {
    fail("Trigger script storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  if (areaTriggerScriptResRefsStoragesEqual(source, targetInput)) return undefined;
  const target = readAreaTriggerScriptResRefsTargetStorage(targetInput);
  if (!target) {
    fail("Trigger script storage target is malformed.", targetPath);
  }
  const mutation = readExistingAreaTriggerScriptResRefsMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Trigger script mutation is invalid.", targetPath);
  return mutation;
}

function projectTriggerTransitionStorageMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaTriggerTransitionStorageMutation | undefined {
  if (!isAreaTriggerTransitionStorage(sourceInput)) {
    fail("Trigger transition storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  if (areaTriggerTransitionStorageEqual(sourceInput, targetInput)) return undefined;
  if (!isAreaTriggerTransitionStorage(targetInput)) {
    fail("Trigger transition storage target is malformed.", targetPath);
  }
  const mutation = readExistingAreaTriggerTransitionStorageMutation({
    expectedValue: sourceInput,
    value: targetInput,
  });
  if (!mutation) fail("Trigger transition storage mutation is invalid.", targetPath);
  return mutation;
}

function projectWaypointTagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointTagMutation | undefined {
  const source = readExistingAreaWaypointTagStorage(sourceInput);
  if (!source) fail("Expected exact Waypoint Tag storage provenance.", sourcePath);
  if (!source.present) return undefined;
  if (!isEditableAreaWaypointTag(targetInput)) {
    fail("Expected an exact Toolset-compatible Waypoint Tag.", targetPath);
  }
  if (targetInput === source.value) return undefined;
  const mutation = readExistingAreaWaypointTagMutation({
    expectedValue: source.value,
    value: targetInput,
  });
  if (!mutation) fail("Expected one changed exact Waypoint Tag pair.", targetPath);
  return mutation;
}

function projectWaypointTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointTemplateResRefMutation | undefined {
  const source = readAreaWaypointTemplateResRefStorage(sourceInput);
  if (!source) {
    fail("Expected exact Waypoint TemplateResRef storage provenance.", sourcePath);
  }
  if (!source.present) {
    if (targetInput === undefined) return undefined;
    fail("An absent Waypoint TemplateResRef is preserve-only.", targetPath);
  }
  if (targetInput === undefined || targetInput === source.value) return undefined;
  if (!isAreaWaypointTemplateResRef(targetInput)) {
    fail("Expected a canonical lowercase Waypoint TemplateResRef.", targetPath);
  }
  const mutation = readExistingAreaWaypointTemplateResRefMutation({
    expectedResRef: source.value,
    resRef: targetInput,
  });
  if (!mutation) fail("Waypoint TemplateResRef mutation is invalid.", targetPath);
  return mutation;
}

function projectWaypointLocalizedNameMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointLocalizedNameMutation | undefined {
  const source = readAreaWaypointLocalizedNameStorage(sourceInput);
  if (!source) fail("Waypoint LocalizedName storage provenance is malformed.", sourcePath);
  if (targetInput === undefined) return undefined;
  const expectedValue = readAreaWaypointLocalizedNameInlineAsciiStorage(source);
  if (expectedValue === undefined) {
    fail("Waypoint LocalizedName source is outside the admitted inline profile.", sourcePath);
  }
  if (!isAreaWaypointLocalizedNameInlineAsciiText(targetInput)) {
    fail("Waypoint LocalizedName target must be bounded printable ASCII.", targetPath);
  }
  if (expectedValue === targetInput) return undefined;
  const mutation = readExistingAreaWaypointLocalizedNameMutation({
    expectedValue,
    value: targetInput,
  });
  if (!mutation) fail("Waypoint LocalizedName mutation is invalid.", targetPath);
  return mutation;
}

function projectWaypointDescriptionMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointDescriptionMutation | undefined {
  const source = readAreaWaypointDescriptionStorage(sourceInput);
  if (!source) fail("Waypoint Description storage provenance is malformed.", sourcePath);
  if (targetInput === undefined) return undefined;
  const expectedValue = readAreaWaypointDescriptionInlineAsciiStorage(source);
  if (expectedValue === undefined) {
    fail("Waypoint Description source is outside the admitted inline profile.", sourcePath);
  }
  if (!isAreaWaypointDescriptionInlineAsciiText(targetInput)) {
    fail("Waypoint Description target must be bounded printable ASCII.", targetPath);
  }
  if (expectedValue === targetInput) return undefined;
  const mutation = readExistingAreaWaypointDescriptionMutation({
    expectedValue,
    value: targetInput,
  });
  if (!mutation) fail("Waypoint Description mutation is invalid.", targetPath);
  return mutation;
}

function projectWaypointMapNoteMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointMapNoteMutation | undefined {
  const sourceStorage = readAreaWaypointMapNoteStorage(sourceInput);
  if (!sourceStorage) fail("Waypoint map-note storage provenance is malformed.", sourcePath);
  const expectedValue = readAreaWaypointMapNoteInlineAsciiValue(sourceStorage);
  if (!expectedValue) {
    fail("Waypoint MapNote source is outside the admitted inline profile.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const targetValue = readAreaWaypointMapNoteValue(targetInput);
  if (!targetValue) fail("Waypoint map-note target vector is malformed.", targetPath);
  if (mapNoteValuesEqual(expectedValue, targetValue)) return undefined;
  const mutation = readExistingAreaWaypointMapNoteMutation({
    expectedValue,
    value: targetValue,
  });
  if (!mutation) fail("Waypoint map-note mutation is invalid.", targetPath);
  return mutation;
}

function projectWaypointAppearanceMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaWaypointAppearanceMutation | undefined {
  const source = parseAreaWaypointAppearanceProvenance(sourceInput);
  if (!source) fail("Waypoint Appearance provenance is malformed.", sourcePath);
  if (targetInput === undefined || targetInput === source.value) return undefined;
  const mutation = parseAreaWaypointAppearanceMutation({
    expectedValue: source.value,
    value: targetInput,
    tableSha256: source.table.sha256,
    rowCount: source.table.rowCount,
  });
  if (!mutation) {
    fail("Waypoint Appearance target is outside the retained physical table.", targetPath);
  }
  return mutation;
}

function projectEncounterTagMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterTagMutation | undefined {
  const source = readExistingAreaEncounterTagStorage(sourceInput);
  if (!source) {
    fail("Encounter Tag provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isEditableAreaEncounterTag(targetInput)) {
    fail("Expected an Encounter Tag with no more than 32 code units and no NUL.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaEncounterTagMutation({
    expectedValue: source.value,
    value: targetInput,
  });
  if (!mutation) fail("Encounter Tag mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterTemplateResRefMutation | undefined {
  const source = readAreaEncounterTemplateResRefStorage(sourceInput);
  if (!source) {
    fail("Expected exact Encounter TemplateResRef storage provenance.", sourcePath);
  }
  if (!source.present) {
    if (targetInput === undefined) return undefined;
    fail("An absent Encounter TemplateResRef is preserve-only.", targetPath);
  }
  if (targetInput === undefined || targetInput === source.value) return undefined;
  if (!isAreaEncounterTemplateResRef(targetInput)) {
    fail("Expected a canonical lowercase Encounter TemplateResRef.", targetPath);
  }
  const mutation = readExistingAreaEncounterTemplateResRefMutation({
    expectedResRef: source.value,
    resRef: targetInput,
  });
  if (!mutation) fail("Encounter TemplateResRef mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterActiveMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterActiveMutation | undefined {
  const source = readAreaEncounterActiveStorage(sourceInput);
  if (!source) {
    fail("Encounter Active storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterActiveStorage(targetInput);
  if (!target) {
    fail("Encounter Active storage target is malformed.", targetPath);
  }
  if (areaEncounterActiveStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterActiveMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter Active mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterPlayerOnlyMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterPlayerOnlyMutation | undefined {
  const source = readAreaEncounterPlayerOnlyStorage(sourceInput);
  if (!source) {
    fail("Encounter PlayerOnly storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterPlayerOnlyStorage(targetInput);
  if (!target) {
    fail("Encounter PlayerOnly storage target is malformed.", targetPath);
  }
  if (areaEncounterPlayerOnlyStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterPlayerOnlyMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter PlayerOnly mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterResetMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterResetMutation | undefined {
  const source = readAreaEncounterResetStorage(sourceInput);
  if (!source) {
    fail("Encounter Reset storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterResetStorage(targetInput);
  if (!target) {
    fail("Encounter Reset storage target is malformed.", targetPath);
  }
  if (areaEncounterResetStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterResetMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter Reset mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterResetTimeMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterResetTimeMutation | undefined {
  const source = readAreaEncounterResetTimeStorage(sourceInput);
  if (!source) {
    fail("Encounter ResetTime storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterResetTimeStorage(targetInput);
  if (!target) {
    fail("Encounter ResetTime storage target is malformed.", targetPath);
  }
  if (areaEncounterResetTimeStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterResetTimeMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter ResetTime mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterSpawnOptionMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterSpawnOptionMutation | undefined {
  const source = readAreaEncounterSpawnOptionStorage(sourceInput);
  if (!source) {
    fail("Encounter SpawnOption storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterSpawnOptionStorage(targetInput);
  if (!target) {
    fail("Encounter SpawnOption storage target is malformed.", targetPath);
  }
  if (areaEncounterSpawnOptionStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterSpawnOptionMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter SpawnOption mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterRespawnsMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterRespawnsMutation | undefined {
  const source = readAreaEncounterRespawnsStorage(sourceInput);
  if (!source) {
    fail("Encounter Respawns storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterRespawnsStorage(targetInput);
  if (!target) {
    fail("Encounter Respawns storage target is malformed.", targetPath);
  }
  if (areaEncounterRespawnsStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterRespawnsMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter Respawns mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterCreatureCountMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterCreatureCountMutation | undefined {
  const source = readAreaEncounterCreatureCountStorage(sourceInput);
  if (!source) {
    fail("Encounter creature-count storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterCreatureCountStorage(targetInput);
  if (!target) {
    fail("Encounter creature-count storage target is malformed.", targetPath);
  }
  if (areaEncounterCreatureCountStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterCreatureCountMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter creature-count mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterScriptResRefsMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterScriptResRefsMutation | undefined {
  const source = readAreaEncounterScriptResRefsStorage(sourceInput);
  if (!source) {
    fail("Encounter script storage provenance is malformed.", sourcePath);
  }
  if (targetInput === undefined) return undefined;
  const target = readAreaEncounterScriptResRefsTargetStorage(targetInput);
  if (!target) {
    fail("Encounter script storage target is malformed.", targetPath);
  }
  if (areaEncounterScriptResRefsStoragesEqual(source, target)) return undefined;
  const mutation = readExistingAreaEncounterScriptResRefsMutation({
    expectedValue: source,
    value: target,
  });
  if (!mutation) fail("Encounter script mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterFactionMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterFactionMutation | undefined {
  const source = readExistingAreaEncounterFactionProvenance(sourceInput);
  if (!source) fail("Expected valid Encounter module repute.fac provenance.", sourcePath);
  if (targetInput === undefined) return undefined;
  const value = integer(targetInput, 1, 0xffffffff, targetPath);
  if (value >= source.catalogFactionCount) {
    fail("Encounter Faction target must be a selectable non-PC physical faction.", targetPath);
  }
  if (value === source.expectedValue) return undefined;
  const mutation = readExistingAreaEncounterFactionMutation({
    expectedValue: source.expectedValue,
    value,
    catalogSha256: source.catalogSha256,
    catalogFactionCount: source.catalogFactionCount,
  });
  if (!mutation) fail("Encounter Faction mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterDifficultyMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterDifficultyMutation | undefined {
  const source = readExistingAreaEncounterDifficultyProvenance(sourceInput);
  if (!source) fail("Expected valid Encounter EncDifficulty.2da provenance.", sourcePath);
  if (targetInput === undefined) return undefined;
  const target = record(targetInput, targetPath);
  if (!hasExactKeys(target, ["difficulty", "difficultyIndex"])) {
    fail("Encounter Difficulty target must be one exact complete pair.", targetPath);
  }
  const value = {
    difficulty: integer(target.difficulty, -20, 20, `${targetPath}.difficulty`),
    difficultyIndex: integer(
      target.difficultyIndex,
      0,
      source.catalogRowCount - 1,
      `${targetPath}.difficultyIndex`,
    ),
  };
  if (value.difficulty === source.expectedValue.difficulty &&
      value.difficultyIndex === source.expectedValue.difficultyIndex) return undefined;
  const mutation = readExistingAreaEncounterDifficultyMutation({
    expectedValue: source.expectedValue,
    value,
    catalogSha256: source.catalogSha256,
    catalogRowCount: source.catalogRowCount,
  });
  if (!mutation) fail("Encounter Difficulty mutation is invalid.", targetPath);
  return mutation;
}

function projectEncounterLocalizedNameMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaEncounterLocalizedNameMutation | undefined {
  const source = readAreaEncounterLocalizedNameStorage(sourceInput);
  if (!source) fail("Encounter LocalizedName storage provenance is malformed.", sourcePath);
  if (targetInput === undefined) return undefined;
  const expectedValue = readAreaEncounterLocalizedNameInlineAsciiStorage(source);
  if (expectedValue === undefined) {
    fail("Encounter LocalizedName source is outside the admitted inline profile.", sourcePath);
  }
  if (!isAreaEncounterLocalizedNameInlineAsciiText(targetInput)) {
    fail("Encounter LocalizedName target must be bounded printable ASCII.", targetPath);
  }
  if (expectedValue === targetInput) return undefined;
  const mutation = readExistingAreaEncounterLocalizedNameMutation({
    expectedValue,
    value: targetInput,
  });
  if (!mutation) fail("Encounter LocalizedName mutation is invalid.", targetPath);
  return mutation;
}

function projectItemTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemTemplateResRefMutation | undefined {
  const source = readAreaItemTemplateResRefStorage(sourceInput);
  if (!source) {
    fail("Item TemplateResRef provenance is malformed.", sourcePath);
  }
  if (!source.present) return undefined;
  if (!isAreaItemTemplateResRef(targetInput)) {
    fail("Expected a canonical non-empty Item TemplateResRef.", targetPath);
  }
  if (source.value === targetInput) return undefined;
  const mutation = readExistingAreaItemTemplateResRefMutation({
    expectedResRef: source.value,
    resRef: targetInput,
  });
  if (!mutation) fail("Item TemplateResRef mutation is invalid.", targetPath);
  return mutation;
}

function projectItemInstanceStateMutation(
  sourceInput: unknown,
  targetInput: Readonly<Record<string, unknown>>,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemInstanceStateMutation | undefined {
  const source = readAreaItemInstanceStateStorage(sourceInput);
  if (!source) {
    fail("Expected complete exact Item instance-state provenance.", sourcePath);
  }
  const target = readAreaItemInstanceStateValue({
    charges: targetInput.charges,
    cost: targetInput.cost,
    stolen: targetInput.stolen,
    stackSize: targetInput.stackSize,
    plot: targetInput.plot,
    addCost: targetInput.addCost,
    identified: targetInput.identified,
    cursed: targetInput.cursed,
  });
  if (!target) {
    fail("Expected one complete bounded Item instance-state target.", targetPath);
  }
  if (areaItemInstanceStateValueEqual(source.values, target)) return undefined;
  return Object.freeze({
    expectedValue: cloneAreaItemInstanceStateStorage(source),
    value: cloneAreaItemInstanceStateValue(target),
  });
}

function projectItemLocalizedStringMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourceIndex: number | undefined,
  sourcePath: string,
  targetPath: string,
  sourceIndexPath: string,
): readonly ExistingAreaItemLocalizedStringMutation[] | undefined {
  const source = readAreaItemLocalizedStrings(sourceInput);
  if (!source) {
    fail("Expected an exact ground-Item localized-string provenance triple.", sourcePath);
  }
  const target = record(targetInput, targetPath);
  const pairs: ExistingAreaItemLocalizedStringMutation[] = [];
  for (const mapping of AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(target, mapping.targetKey)) continue;
    const expectedValue = readAreaItemInlineAsciiStorage(
      source[mapping.sourceKey],
      mapping.maxBytes,
    );
    if (expectedValue === undefined) continue;
    const value = target[mapping.targetKey];
    if (!isAreaItemInlineAsciiText(value, mapping.maxBytes)) {
      fail(
        `Expected printable ASCII ${mapping.field} text within ${mapping.maxBytes} bytes.`,
        `${targetPath}.${mapping.targetKey}`,
      );
    }
    if (value !== expectedValue) {
      pairs.push({ field: mapping.field, expectedValue, value });
    }
  }
  if (pairs.length === 0) return undefined;
  if (sourceIndex === undefined) {
    fail("A changed Item localized string requires immutable family-ordinal provenance.", sourceIndexPath);
  }
  const mutation = readExistingAreaItemLocalizedStringMutations(pairs);
  if (!mutation) fail("Item localized-string mutation is invalid.", targetPath);
  return mutation;
}

function projectItemVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemVariableMutation | undefined {
  let source: ReturnType<typeof parseAreaItemVariableProvenance>;
  try {
    source = parseAreaItemVariableProvenance(sourceInput);
  } catch {
    fail("Expected exact ground-Item VarTable provenance.", sourcePath);
  }
  let entries: ReturnType<typeof parseAreaItemVariableTargetEntries>;
  try {
    entries = parseAreaItemVariableTargetEntries(targetInput);
  } catch {
    fail("Expected one complete bounded ground-Item variable target.", targetPath);
  }
  if (areaItemVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectStoreVariableMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaStoreVariableMutation | undefined {
  let source: ReturnType<typeof parseAreaStoreVariableProvenance>;
  try {
    source = parseAreaStoreVariableProvenance(sourceInput);
  } catch {
    fail("Expected exact retained Store VarTable provenance.", sourcePath);
  }
  let entries: ReturnType<typeof parseAreaStoreVariableTargetEntries>;
  try {
    entries = parseAreaStoreVariableTargetEntries(targetInput);
  } catch {
    fail("Expected one complete bounded retained Store variable target.", targetPath);
  }
  if (areaStoreVariableEntriesEqual(source.expectedEntries, entries)) return undefined;
  return Object.freeze({
    expectedEntries: source.expectedEntries,
    entries,
  });
}

function projectStoreRestrictionsMutation(
  sourceInput: unknown,
  targetInput: unknown,
  catalogInput: unknown,
  sourcePath: string,
  targetPath: string,
  catalogPath: string,
): ExistingAreaStoreRestrictionsMutation | undefined {
  const source = readExistingAreaStoreRestrictionsProvenance(sourceInput);
  if (!source) {
    fail("Expected exact retained Store restrictions provenance.", sourcePath);
  }
  if (!isExactEffectiveItemBaseItemsTwoDaTable(catalogInput) ||
    catalogInput.descriptor.sha256 !== source.tableSha256 ||
    catalogInput.descriptor.rowCount !== source.tableRowCount) {
    fail(
      "Changed Store restrictions require the identical effective baseitems.2da catalog.",
      catalogPath,
    );
  }
  const target = readAreaStoreRestrictionsTarget(targetInput, source.tableRowCount);
  if (!target) {
    fail("Expected one complete catalog-bound Store restrictions target.", targetPath);
  }
  const expectedTarget = Object.freeze({
    willNotBuy: source.expectedValue.willNotBuy.baseItemIds,
    willOnlyBuy: source.expectedValue.willOnlyBuy.baseItemIds,
  });
  if (areaStoreRestrictionTargetsEqual(expectedTarget, target)) return undefined;
  const mutation = readExistingAreaStoreRestrictionsMutation({
    expectedValue: source.expectedValue,
    value: target,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  });
  if (!mutation) fail("Store restrictions mutation is invalid.", targetPath);
  return mutation;
}

function projectStoreInventoryMutation(
  sourceInput: unknown,
  targetInput: unknown,
  catalogInput: unknown,
  sourcePath: string,
  targetPath: string,
  catalogPath: string,
): ExistingAreaStoreInventoryMutation | undefined {
  const source = readExistingAreaStoreInventoryProvenance(sourceInput);
  if (!source) {
    fail("Expected exact retained Store inventory provenance.", sourcePath);
  }
  if (!isExactEffectiveItemBaseItemsTwoDaTable(catalogInput) ||
    catalogInput.descriptor.sha256 !== source.tableSha256 ||
    catalogInput.descriptor.rowCount !== source.tableRowCount ||
    source.expectedBuckets.some((bucket) => bucket.entries.some((entry) => {
      const row = catalogInput.rows[entry.baseItemId];
      return row?.rowIndex !== entry.baseItemId || row.invSlotWidth !== entry.slotWidth ||
        row.invSlotHeight !== entry.slotHeight;
    }))) {
    fail(
      "Changed Store inventory requires the identical effective baseitems.2da catalog and slot dimensions.",
      catalogPath,
    );
  }
  const target = readAreaStoreInventoryTargetBuckets(
    targetInput,
    source.expectedBuckets,
  );
  if (!target) {
    fail("Expected one complete retained Store inventory target.", targetPath);
  }
  if (areaStoreInventoryTargetBucketsEqual(
    target,
    areaStoreInventoryExpectedTargetBuckets(source.expectedBuckets),
  )) return undefined;
  const mutation = readExistingAreaStoreInventoryMutation({
    expectedBuckets: source.expectedBuckets,
    buckets: target,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  });
  if (!mutation) fail("Store inventory mutation is invalid.", targetPath);
  return mutation;
}

function projectItemPropertyListMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemPropertyListMutation | undefined {
  let source: ReturnType<typeof parseAreaItemPropertyListProvenance>;
  try {
    source = parseAreaItemPropertyListProvenance(sourceInput);
  } catch {
    fail("Expected exact canonical ground-Item PropertiesList provenance.", sourcePath);
  }
  let entries: ReturnType<typeof parseAreaItemPropertyListTargetEntries>;
  try {
    entries = parseAreaItemPropertyListTargetEntries(targetInput);
  } catch {
    fail("Expected one complete bounded ground-Item PropertiesList target.", targetPath);
  }
  if (areaItemPropertyListEntriesEqual(source.expectedEntries, entries)) return undefined;
  if (!source.present) {
    fail("An absent ground-Item PropertiesList is preserve-only.", sourcePath);
  }
  try {
    return parseAreaItemPropertyListMutation({ expectedValue: source, entries });
  } catch {
    fail("Ground-Item PropertiesList mutation is invalid.", targetPath);
  }
}

function projectItemBaseAppearanceMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaItemBaseAppearanceMutation | undefined {
  const source = readExistingAreaItemBaseAppearanceProvenance(sourceInput);
  if (!source) {
    fail("Expected exact catalog-bound ground-Item BaseItem/appearance provenance.", sourcePath);
  }
  const target = readAreaItemBaseAppearanceValue(targetInput);
  if (!target) {
    fail("Expected one complete catalog-bound ground-Item BaseItem/appearance target.", targetPath);
  }
  if (JSON.stringify(source.expectedValue) === JSON.stringify(target)) return undefined;
  const mutation = readExistingAreaItemBaseAppearanceMutation({
    expectedValue: source.expectedValue,
    value: target,
    tableSha256: source.tableSha256,
    tableRowCount: source.tableRowCount,
  });
  if (!mutation) fail("Ground-Item BaseItem/appearance mutation is invalid.", targetPath);
  return mutation;
}

function projectPlaceableAnimationStateMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableAnimationStateMutation | undefined {
  if (!isAreaPlaceableAnimationState(sourceInput)) {
    fail("Expected a native Placeable AnimationState Byte of 0, 1, or 2.", sourcePath);
  }
  if (!isAreaPlaceableAnimationState(targetInput)) {
    fail("Expected a Placeable AnimationState target of 0, 1, or 2.", targetPath);
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value: targetInput });
}

function projectPlaceableTrapByteMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): readonly ExistingAreaPlaceableTrapByteMutation[] | undefined {
  const source = record(sourceInput, sourcePath);
  assertOnlyKeys(
    source,
    AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.map((mapping) => mapping.slot),
    sourcePath,
  );
  const target = record(targetInput, targetPath);
  const projected: ExistingAreaPlaceableTrapByteMutation[] = [];
  for (const mapping of AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
    if (!Object.prototype.hasOwnProperty.call(source, mapping.slot)) continue;
    const expectedValue = mapping.valueKind === "flag"
      ? (booleanValue(source[mapping.slot], `${sourcePath}.${mapping.slot}`) ? 1 : 0)
      : byteIntegerValue(source[mapping.slot], `${sourcePath}.${mapping.slot}`);
    const value = mapping.valueKind === "flag"
      ? (booleanValue(target[mapping.slot], `${targetPath}.${mapping.slot}`) ? 1 : 0)
      : byteIntegerValue(target[mapping.slot], `${targetPath}.${mapping.slot}`);
    if (value !== expectedValue) {
      projected.push(Object.freeze({ field: mapping.field, expectedValue, value }));
    }
  }
  return projected.length > 0 ? Object.freeze(projected) : undefined;
}

function projectPlaceableTemplateResRefMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableTemplateResRefMutation | undefined {
  if (!isAreaPlaceableTemplateResRef(sourceInput)) {
    fail("Expected an admitted native Placeable TemplateResRef.", sourcePath);
  }
  if (!isAreaPlaceableTemplateResRef(targetInput)) {
    fail("Expected an admitted native Placeable TemplateResRef.", targetPath);
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedResRef: sourceInput, resRef: targetInput });
}

function projectPlaceableConversationMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableConversationMutation | undefined {
  if (!isAreaPlaceableConversation(sourceInput)) {
    fail("Expected an empty or 1..16 character Placeable Conversation ResRef.", sourcePath);
  }
  if (!isAreaPlaceableConversation(targetInput)) {
    fail("Expected an empty or 1..16 character Placeable Conversation ResRef.", targetPath);
  }
  return targetInput === sourceInput
    ? undefined
    : Object.freeze({ expectedResRef: sourceInput, resRef: targetInput });
}

function projectPlaceableInterruptableMutation(
  sourceInput: unknown,
  noInterruptInput: unknown,
  sourcePath: string,
  targetPath: string,
): ExistingAreaPlaceableInterruptableMutation | undefined {
  if (!isAreaPlaceableInterruptableValue(sourceInput)) {
    fail("Expected a native Placeable Interruptable Byte of 0 or 1.", sourcePath);
  }
  const noInterrupt = booleanValue(noInterruptInput, targetPath);
  const value = noInterrupt ? 0 : 1;
  return value === sourceInput
    ? undefined
    : Object.freeze({ expectedValue: sourceInput, value });
}

function projectPlaceableBasicByteMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): readonly ExistingAreaPlaceableBasicByteMutation[] | undefined {
  const source = record(sourceInput, sourcePath);
  assertOnlyKeys(
    source,
    AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS.map((mapping) => mapping.slot),
    sourcePath,
  );
  const target = record(targetInput, targetPath);
  const projected: ExistingAreaPlaceableBasicByteMutation[] = [];
  for (const mapping of AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS) {
    if (!Object.prototype.hasOwnProperty.call(source, mapping.slot)) continue;
    const expectedValue = byteIntegerValue(source[mapping.slot], `${sourcePath}.${mapping.slot}`);
    const value = byteIntegerValue(target[mapping.slot], `${targetPath}.${mapping.slot}`);
    if (value !== expectedValue) {
      projected.push(Object.freeze({ field: mapping.field, expectedValue, value }));
    }
  }
  return projected.length > 0 ? Object.freeze(projected) : undefined;
}

function projectPlaceableInventoryMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): AreaPlaceableInventoryMutation | undefined {
  try {
    const expectedEntries = parseAreaPlaceableInventorySourceEntries(sourceInput, sourcePath);
    const entries = parseAreaPlaceableInventoryTargetEntries(
      targetInput,
      expectedEntries,
      targetPath,
    );
    if (areaPlaceableInventoryEntriesEqual(expectedEntries, entries)) return undefined;
    return Object.freeze({ expectedEntries, entries });
  } catch (error) {
    if (error instanceof AreaPlaceableInventoryValidationError) {
      fail(error.message, error.path);
    }
    throw error;
  }
}

function projectCreatureInventoryMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): AreaCreatureInventoryMutation | undefined {
  try {
    const expectedEntries = parseAreaCreatureInventorySourceEntries(sourceInput, sourcePath);
    const entries = parseAreaCreatureInventoryTargetEntries(
      targetInput,
      expectedEntries,
      targetPath,
    );
    if (areaCreatureInventoryEntriesEqual(expectedEntries, entries)) return undefined;
    return Object.freeze({ expectedEntries, entries });
  } catch (error) {
    if (error instanceof AreaCreatureInventoryValidationError) {
      fail(error.message, error.path);
    }
    throw error;
  }
}

function projectItemInventoryMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): AreaItemInventoryMutation | undefined {
  try {
    const expectedEntries = parseAreaItemInventorySourceEntries(sourceInput, sourcePath);
    const entries = parseAreaItemInventoryTargetEntries(
      targetInput,
      expectedEntries,
      targetPath,
    );
    if (areaItemInventoryEntriesEqual(expectedEntries, entries)) return undefined;
    return Object.freeze({ expectedEntries, entries });
  } catch (error) {
    if (error instanceof AreaItemInventoryValidationError) {
      fail(error.message, error.path);
    }
    throw error;
  }
}

function projectItemVisualTransformMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): AreaItemVisualTransformMutation | undefined {
  try {
    const expectedValue = parseAreaItemVisualTransformStorage(sourceInput, sourcePath);
    const value = parseAreaItemVisualTransformStorage(targetInput, targetPath);
    if (areaItemVisualTransformStorageEqual(expectedValue, value)) return undefined;
    return Object.freeze({ expectedValue, value });
  } catch (error) {
    if (error instanceof AreaItemVisualTransformValidationError) {
      fail(error.message, error.path);
    }
    throw error;
  }
}

function projectCreatureEquipmentMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): AreaCreatureEquipmentMutation | undefined {
  try {
    const expectedEntries = parseAreaCreatureEquipmentSourceEntries(sourceInput, sourcePath);
    const entries = parseAreaCreatureEquipmentTargetEntries(
      targetInput,
      expectedEntries,
      targetPath,
    );
    if (areaCreatureEquipmentEntriesEqual(expectedEntries, entries)) return undefined;
    return Object.freeze({ expectedEntries, entries });
  } catch (error) {
    if (error instanceof AreaCreatureEquipmentValidationError) {
      fail(error.message, error.path);
    }
    throw error;
  }
}

function projectPlaceableKeyNameMutation(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): Readonly<{ expectedValue: string; value: string }> | undefined {
  const source = record(sourceInput, sourcePath);
  if (!Object.prototype.hasOwnProperty.call(source, "keyTag")) return undefined;
  const target = record(targetInput, targetPath);
  const expectedValue = placeableKeyName(source.keyTag, `${sourcePath}.keyTag`);
  const value = placeableKeyName(target.keyTag, `${targetPath}.keyTag`);
  return value === expectedValue ? undefined : Object.freeze({ expectedValue, value });
}

function placeableKeyName(value: unknown, path: string): string {
  if (!isAreaPlaceableKeyName(value)) {
    fail(
      "Expected a Placeable KeyName string with no NUL and no more than 32 characters.",
      path,
    );
  }
  return value;
}

function projectPlaceableLockMutations(
  sourceInput: unknown,
  targetInput: unknown,
  sourcePath: string,
  targetPath: string,
): readonly ProjectedExistingAreaPlaceableLockMutation[] | undefined {
  const source = record(sourceInput, sourcePath);
  const target = record(targetInput, targetPath);
  const projected: ProjectedExistingAreaPlaceableLockMutation[] = [];
  for (const mapping of AREA_PLACEABLE_LOCK_FIELD_MAPPINGS) {
    if (!Object.prototype.hasOwnProperty.call(source, mapping.slot)) continue;
    const expectedValue = mapping.valueKind === "boolean"
      ? booleanValue(source[mapping.slot], `${sourcePath}.${mapping.slot}`)
      : byteIntegerValue(source[mapping.slot], `${sourcePath}.${mapping.slot}`);
    const value = mapping.valueKind === "boolean"
      ? booleanValue(target[mapping.slot], `${targetPath}.${mapping.slot}`)
      : byteIntegerValue(target[mapping.slot], `${targetPath}.${mapping.slot}`);
    if (value !== expectedValue) {
      projected.push(Object.freeze({
        field: mapping.field,
        expectedValue,
        value,
      }));
    }
  }
  return projected.length > 0 ? Object.freeze(projected) : undefined;
}

function projectPlaceableResRefMutations<
  TMapping extends readonly Readonly<{ slot: string; field: string }>[],
>(
  sourceInput: unknown,
  targetInput: unknown,
  mappings: TMapping,
  sourcePath: string,
  targetPath: string,
): readonly Readonly<{
  field: TMapping[number]["field"];
  expectedResRef: string;
  resRef: string;
}>[] | undefined {
  const sourceValues = record(sourceInput, sourcePath);
  assertOnlyKeys(sourceValues, mappings.map((entry) => entry.slot), sourcePath);
  const targetValues = record(targetInput, targetPath);
  const projected: Array<Readonly<{
    field: TMapping[number]["field"];
    expectedResRef: string;
    resRef: string;
  }>> = [];
  for (const mapping of mappings) {
    if (!Object.prototype.hasOwnProperty.call(sourceValues, mapping.slot)) continue;
    const expectedResRef = scriptResRef(sourceValues[mapping.slot], `${sourcePath}.${mapping.slot}`);
    const resRef = scriptResRef(targetValues[mapping.slot], `${targetPath}.${mapping.slot}`);
    if (resRef !== expectedResRef) {
      projected.push(Object.freeze({ field: mapping.field, expectedResRef, resRef }));
    }
  }
  return projected.length > 0 ? Object.freeze(projected) : undefined;
}

type AreaObjectConstructionProfile =
  | typeof AREA_CREATURE_CONSTRUCTION_PROFILE
  | typeof AREA_DOOR_CONSTRUCTION_PROFILE
  | typeof AREA_ENCOUNTER_CONSTRUCTION_PROFILE
  | typeof AREA_ITEM_CONSTRUCTION_PROFILE
  | typeof AREA_PLACEABLE_CONSTRUCTION_PROFILE
  | typeof AREA_SOUND_CONSTRUCTION_PROFILE
  | typeof AREA_STORE_CONSTRUCTION_PROFILE
  | typeof AREA_TRIGGER_CONSTRUCTION_PROFILE
  | typeof AREA_WAYPOINT_CONSTRUCTION_PROFILE;

function projectNewAreaObject(
  input: unknown,
  index: number,
  topology: Readonly<{
    tilesetResRef: string;
    tilesetFingerprint: string;
    tiles: readonly ProjectedAreaUpdateTile[];
  }>,
): ProjectedNewAreaObject {
  const path = `draft.payload.editableScene.objects.${index}`;
  const value = record(input, path);
  const source = record(value.source, `${path}.source`);
  const sourceKind = blueprintSourceKind(source.sourceKind, `${path}.source.sourceKind`);
  if (
    sourceKind === "waypoint" &&
    source.sourceProfileId === AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE.id
  ) {
    return projectNewDynamicWaypoint(value, source, index);
  }
  if (
    sourceKind === "encounter" &&
    source.sourceProfileId === AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE.id
  ) {
    return projectNewDynamicEncounter(value, source, index);
  }
  if (
    sourceKind === "item" &&
    source.sourceProfileId === AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id
  ) {
    return projectNewDynamicItem(value, source, index);
  }
  if (
    sourceKind === "placeable" &&
    source.sourceProfileId === AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.id
  ) {
    return projectNewDynamicPlaceable(value, source, index);
  }
  if (
    sourceKind === "store" &&
    source.sourceProfileId === AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id
  ) {
    return projectNewDynamicStore(value, source, index);
  }
  const profile = sourceKind === "creature"
    ? AREA_CREATURE_CONSTRUCTION_PROFILE
    : sourceKind === "door"
      ? AREA_DOOR_CONSTRUCTION_PROFILE
      : sourceKind === "encounter"
      ? AREA_ENCOUNTER_CONSTRUCTION_PROFILE
    : sourceKind === "item"
      ? AREA_ITEM_CONSTRUCTION_PROFILE
      : sourceKind === "placeable"
      ? AREA_PLACEABLE_CONSTRUCTION_PROFILE
      : sourceKind === "sound"
        ? AREA_SOUND_CONSTRUCTION_PROFILE
        : sourceKind === "store"
          ? AREA_STORE_CONSTRUCTION_PROFILE
          : sourceKind === "trigger"
            ? AREA_TRIGGER_CONSTRUCTION_PROFILE
            : AREA_WAYPOINT_CONSTRUCTION_PROFILE;
  return projectNewObjectWithProfile(value, source, index, profile, topology);
}

function projectNewDynamicWaypoint(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
): ProjectedNewAreaWaypoint {
  const profile = AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE;
  const path = `draft.payload.editableScene.objects.${index}`;
  assertEqual(
    sceneObjectKind(value.kind, `${path}.kind`),
    profile.sceneKind,
    "This blueprint profile constructs waypoints only.",
    `${path}.kind`,
  );
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "templateResRef",
    "sourceObjectKey",
    "sourceSizeBytes",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
  ], `${path}.source`);
  assertEqual(
    source.type,
    "aurora_blueprint",
    "Expected Aurora blueprint provenance.",
    `${path}.source.type`,
  );
  assertEqual(
    source.sourceKind,
    profile.sourceKind,
    "This blueprint profile constructs waypoints only.",
    `${path}.source.sourceKind`,
  );
  assertEqual(
    source.sourceProfileId,
    profile.id,
    "Unsupported object blueprint source profile.",
    `${path}.source.sourceProfileId`,
  );
  const templateId = safeIdentifier(source.templateId, 80, `${path}.source.templateId`);
  const templateResRef = resRef(source.templateResRef, `${path}.source.templateResRef`);
  const sourceObjectKey = nonNulNonBlank(
    source.sourceObjectKey,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.source.sourceObjectKey`,
  );
  const sourceSizeBytes = integer(
    source.sourceSizeBytes,
    1,
    profile.maxSourceBytes,
    `${path}.source.sourceSizeBytes`,
  );
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(
    source.sourceFileType,
    profile.fileType,
    "Expected the admitted blueprint file type.",
    `${path}.source.sourceFileType`,
  );
  assertEqual(
    source.sourceFileVersion,
    profile.fileVersion,
    "Expected a V3.2 blueprint.",
    `${path}.source.sourceFileVersion`,
  );
  assertEqual(
    source.sourceStructTypeId,
    profile.rootStructTypeId,
    "Unexpected blueprint root struct type.",
    `${path}.source.sourceStructTypeId`,
  );
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(
    objectResRef,
    templateResRef,
    "Object ResRef must equal the immutable blueprint template.",
    `${path}.resRef`,
  );

  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceObjectKey,
    sourceSizeBytes,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag: nonNulNonBlank(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: finiteNumber(value.bearing, `${path}.bearing`),
  });
}

function projectNewDynamicEncounter(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
): ProjectedNewAreaEncounter {
  const profile = AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE;
  const path = `draft.payload.editableScene.objects.${index}`;
  assertEqual(
    sceneObjectKind(value.kind, `${path}.kind`),
    profile.sceneKind,
    "This blueprint profile constructs encounters only.",
    `${path}.kind`,
  );
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "templateResRef",
    "sourceObjectKey",
    "sourceSizeBytes",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
  ], `${path}.source`);
  assertEqual(
    source.type,
    "aurora_blueprint",
    "Expected Aurora blueprint provenance.",
    `${path}.source.type`,
  );
  assertEqual(
    source.sourceKind,
    profile.sourceKind,
    "This blueprint profile constructs encounters only.",
    `${path}.source.sourceKind`,
  );
  assertEqual(
    source.sourceProfileId,
    profile.id,
    "Unsupported object blueprint source profile.",
    `${path}.source.sourceProfileId`,
  );
  const templateId = safeIdentifier(source.templateId, 80, `${path}.source.templateId`);
  const templateResRef = resRef(source.templateResRef, `${path}.source.templateResRef`);
  const sourceObjectKey = nonNulNonBlank(
    source.sourceObjectKey,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.source.sourceObjectKey`,
  );
  const sourceSizeBytes = integer(
    source.sourceSizeBytes,
    1,
    profile.maxSourceBytes,
    `${path}.source.sourceSizeBytes`,
  );
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(
    source.sourceFileType,
    profile.fileType,
    "Expected the admitted blueprint file type.",
    `${path}.source.sourceFileType`,
  );
  assertEqual(
    source.sourceFileVersion,
    profile.fileVersion,
    "Expected a V3.2 blueprint.",
    `${path}.source.sourceFileVersion`,
  );
  assertEqual(
    source.sourceStructTypeId,
    profile.rootStructTypeId,
    "Unexpected blueprint root struct type.",
    `${path}.source.sourceStructTypeId`,
  );
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(
    objectResRef,
    templateResRef,
    "Object ResRef must equal the immutable blueprint template.",
    `${path}.resRef`,
  );
  const bearing = finiteNumber(value.bearing, `${path}.bearing`);
  if (bearing !== 0) {
    fail(
      "Encounter bearing must remain zero because UTE instances serialize no top-level orientation.",
      `${path}.bearing`,
    );
  }

  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceObjectKey,
    sourceSizeBytes,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag: nonNulNonBlank(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: 0,
  });
}

function projectNewDynamicStore(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
): ProjectedNewAreaStore {
  const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
  const path = `draft.payload.editableScene.objects.${index}`;
  assertEqual(
    sceneObjectKind(value.kind, `${path}.kind`),
    profile.sceneKind,
    "This blueprint profile constructs stores only.",
    `${path}.kind`,
  );
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "templateResRef",
    "sourceObjectKey",
    "sourceSizeBytes",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
  ], `${path}.source`);
  assertEqual(
    source.type,
    "aurora_blueprint",
    "Expected Aurora blueprint provenance.",
    `${path}.source.type`,
  );
  assertEqual(
    source.sourceKind,
    profile.sourceKind,
    "This blueprint profile constructs stores only.",
    `${path}.source.sourceKind`,
  );
  assertEqual(
    source.sourceProfileId,
    profile.id,
    "Unsupported object blueprint source profile.",
    `${path}.source.sourceProfileId`,
  );
  const templateId = safeIdentifier(source.templateId, 80, `${path}.source.templateId`);
  const templateResRef = resRef(source.templateResRef, `${path}.source.templateResRef`);
  const sourceObjectKey = nonNulNonBlank(
    source.sourceObjectKey,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.source.sourceObjectKey`,
  );
  const sourceSizeBytes = integer(
    source.sourceSizeBytes,
    1,
    profile.maxSourceBytes,
    `${path}.source.sourceSizeBytes`,
  );
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(
    source.sourceFileType,
    profile.fileType,
    "Expected the admitted blueprint file type.",
    `${path}.source.sourceFileType`,
  );
  assertEqual(
    source.sourceFileVersion,
    profile.fileVersion,
    "Expected a V3.2 blueprint.",
    `${path}.source.sourceFileVersion`,
  );
  assertEqual(
    source.sourceStructTypeId,
    profile.rootStructTypeId,
    "Unexpected blueprint root struct type.",
    `${path}.source.sourceStructTypeId`,
  );
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(
    objectResRef,
    templateResRef,
    "Object ResRef must equal the immutable blueprint template.",
    `${path}.resRef`,
  );

  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceObjectKey,
    sourceSizeBytes,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag: nonNulNonBlank(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: finiteNumber(value.bearing, `${path}.bearing`),
  });
}

function projectNewDynamicItem(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
): ProjectedNewAreaItem {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  const path = `draft.payload.editableScene.objects.${index}`;
  assertEqual(
    sceneObjectKind(value.kind, `${path}.kind`),
    profile.sceneKind,
    "This blueprint profile constructs items only.",
    `${path}.kind`,
  );
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "templateResRef",
    "sourceObjectKey",
    "sourceSizeBytes",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
  ], `${path}.source`);
  assertEqual(
    source.type,
    "aurora_blueprint",
    "Expected Aurora blueprint provenance.",
    `${path}.source.type`,
  );
  assertEqual(
    source.sourceKind,
    profile.sourceKind,
    "This blueprint profile constructs items only.",
    `${path}.source.sourceKind`,
  );
  assertEqual(
    source.sourceProfileId,
    profile.id,
    "Unsupported object blueprint source profile.",
    `${path}.source.sourceProfileId`,
  );
  const templateId = safeIdentifier(source.templateId, 80, `${path}.source.templateId`);
  const templateResRef = resRef(source.templateResRef, `${path}.source.templateResRef`);
  const sourceObjectKey = nonNulNonBlank(
    source.sourceObjectKey,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.source.sourceObjectKey`,
  );
  const sourceSizeBytes = integer(
    source.sourceSizeBytes,
    1,
    profile.maxSourceBytes,
    `${path}.source.sourceSizeBytes`,
  );
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(
    source.sourceFileType,
    profile.fileType,
    "Expected the admitted blueprint file type.",
    `${path}.source.sourceFileType`,
  );
  assertEqual(
    source.sourceFileVersion,
    profile.fileVersion,
    "Expected a V3.2 blueprint.",
    `${path}.source.sourceFileVersion`,
  );
  assertEqual(
    source.sourceStructTypeId,
    profile.rootStructTypeId,
    "Unexpected blueprint root struct type.",
    `${path}.source.sourceStructTypeId`,
  );
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(
    objectResRef,
    templateResRef,
    "Object ResRef must equal the immutable blueprint template.",
    `${path}.resRef`,
  );

  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceObjectKey,
    sourceSizeBytes,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag: nonNulNonBlank(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: finiteNumber(value.bearing, `${path}.bearing`),
  });
}

function projectNewDynamicPlaceable(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
): ProjectedNewAreaPlaceable {
  const profile = AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE;
  const path = `draft.payload.editableScene.objects.${index}`;
  assertEqual(
    sceneObjectKind(value.kind, `${path}.kind`),
    profile.sceneKind,
    "This blueprint profile constructs placeables only.",
    `${path}.kind`,
  );
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "templateResRef",
    "sourceObjectKey",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
  ], `${path}.source`);
  assertEqual(
    source.type,
    "aurora_blueprint",
    "Expected Aurora blueprint provenance.",
    `${path}.source.type`,
  );
  assertEqual(
    source.sourceKind,
    profile.sourceKind,
    "This blueprint profile constructs placeables only.",
    `${path}.source.sourceKind`,
  );
  assertEqual(
    source.sourceProfileId,
    profile.id,
    "Unsupported object blueprint source profile.",
    `${path}.source.sourceProfileId`,
  );
  const templateId = safeIdentifier(source.templateId, 80, `${path}.source.templateId`);
  const templateResRef = resRef(source.templateResRef, `${path}.source.templateResRef`);
  const sourceObjectKey = nonNulNonBlank(
    source.sourceObjectKey,
    profile.maxSourceObjectKeyCodeUnits,
    `${path}.source.sourceObjectKey`,
  );
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(
    source.sourceFileType,
    profile.fileType,
    "Expected the admitted blueprint file type.",
    `${path}.source.sourceFileType`,
  );
  assertEqual(
    source.sourceFileVersion,
    profile.fileVersion,
    "Expected a V3.2 blueprint.",
    `${path}.source.sourceFileVersion`,
  );
  assertEqual(
    source.sourceStructTypeId,
    profile.rootStructTypeId,
    "Unexpected blueprint root struct type.",
    `${path}.source.sourceStructTypeId`,
  );
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(
    objectResRef,
    templateResRef,
    "Object ResRef must equal the immutable blueprint template.",
    `${path}.resRef`,
  );

  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceObjectKey,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag: nonNulNonBlank(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: finiteNumber(value.bearing, `${path}.bearing`),
  });
}

function projectNewObjectWithProfile(
  value: Record<string, unknown>,
  source: Record<string, unknown>,
  index: number,
  profile: AreaObjectConstructionProfile,
  topology: Readonly<{
    tilesetResRef: string;
    tilesetFingerprint: string;
    tiles: readonly ProjectedAreaUpdateTile[];
  }>,
): ProjectedNewAreaObject {
  const path = `draft.payload.editableScene.objects.${index}`;
  const sceneKind = sceneObjectKind(value.kind, `${path}.kind`);
  if (sceneKind !== profile.sceneKind) {
    fail(`This blueprint profile constructs ${profile.sceneKind} only.`, `${path}.kind`);
  }
  assertOnlyKeys(source, [
    "type",
    "sourceKind",
    "sourceProfileId",
    "templateId",
    "sourceEtag",
    "sourceFileType",
    "sourceFileVersion",
    "sourceStructTypeId",
    ...(profile.sourceKind === "door" ? ["doorHook"] : []),
  ], `${path}.source`);
  assertEqual(source.type, "aurora_blueprint", "Expected Aurora blueprint provenance.", `${path}.source.type`);
  assertEqual(source.sourceKind, profile.sourceKind, `This blueprint profile constructs ${profile.sceneKind} only.`, `${path}.source.sourceKind`);
  assertEqual(source.sourceProfileId, profile.id, "Unsupported object blueprint source profile.", `${path}.source.sourceProfileId`);
  const templateId = resRef(source.templateId, `${path}.source.templateId`);
  assertEqual(templateId, profile.templateResRef, "Unsupported object blueprint template.", `${path}.source.templateId`);
  const sourceSha256 = sha256(source.sourceEtag, `${path}.source.sourceEtag`);
  assertEqual(source.sourceFileType, profile.fileType, "Expected the admitted blueprint file type.", `${path}.source.sourceFileType`);
  assertEqual(source.sourceFileVersion, profile.fileVersion, "Expected a V3.2 blueprint.", `${path}.source.sourceFileVersion`);
  assertEqual(source.sourceStructTypeId, profile.rootStructTypeId, "Unexpected blueprint root struct type.", `${path}.source.sourceStructTypeId`);
  const objectResRef = resRef(value.resRef, `${path}.resRef`);
  assertEqual(objectResRef, templateId, "Object ResRef must equal the immutable blueprint template.", `${path}.resRef`);
  const tag = boundedString(value.tag, 256, `${path}.tag`);
  assertEqual(tag, profile.templateTag, "Object Tag overrides are not admitted by this profile.", `${path}.tag`);
  const bearing = finiteNumber(value.bearing, `${path}.bearing`);
  if (
    (profile.sourceKind === "encounter" || profile.sourceKind === "sound" || profile.sourceKind === "trigger") &&
    bearing !== 0
  ) {
    fail(
      profile.sourceKind === "sound"
        ? "Sound bearing must remain zero because UTS instances serialize no orientation."
        : profile.sourceKind === "trigger"
          ? "Trigger bearing must remain zero because the admitted UTT instance profile has zero orientation."
          : "Encounter bearing must remain zero because UTE instances serialize no top-level orientation.",
      `${path}.bearing`,
    );
  }
  const x = finiteNumber(value.x, `${path}.x`);
  const y = finiteNumber(value.y, `${path}.y`);
  const z = finiteNumber(value.z, `${path}.z`);
  const doorHook = profile.sourceKind === "door"
    ? projectDoorHook(source.doorHook, index, topology, { x, y, z, bearing })
    : undefined;
  return Object.freeze({
    localObjectId: safeIdentifier(value.id, 80, `${path}.id`),
    sourceKind: profile.sourceKind,
    sceneKind: profile.sceneKind,
    sourceProfileId: profile.id,
    templateId,
    sourceSha256,
    sourceFileType: profile.fileType,
    sourceFileVersion: profile.fileVersion,
    sourceStructTypeId: profile.rootStructTypeId,
    resRef: objectResRef,
    tag,
    x,
    y,
    z,
    bearing,
    ...(doorHook ? { doorHook } : {}),
  }) as ProjectedNewAreaObject;
}

function blueprintSourceKind(value: unknown, path: string): "creature" | "door" | "encounter" | "item" | "placeable" | "sound" | "store" | "trigger" | "waypoint" {
  if (
    value !== "creature" &&
    value !== "door" &&
    value !== "encounter" &&
    value !== "item" &&
    value !== "placeable" &&
    value !== "sound" &&
    value !== "store" &&
    value !== "trigger" &&
    value !== "waypoint"
  ) {
    fail("Unsupported Aurora blueprint object family.", path);
  }
  return value;
}

function projectDoorHook(
  input: unknown,
  objectIndex: number,
  topology: Readonly<{
    tilesetResRef: string;
    tilesetFingerprint: string;
    tiles: readonly ProjectedAreaUpdateTile[];
  }>,
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }>,
): ProjectedAreaDoorHook {
  const path = `draft.payload.editableScene.objects.${objectIndex}.source.doorHook`;
  const value = record(input, path);
  const profile = AREA_DOOR_CONSTRUCTION_PROFILE.hook;
  const allowed = [
    "profileId", "tilesetResRef", "tilesetSha256", "tileId", "tileOrientation",
    "tileHeight", "hookIndex", "hookType", "localX", "localY", "localZ",
    "orientationDegrees", "row", "col",
  ] as const;
  assertOnlyKeys(value, allowed, path);
  const expectedValues: Readonly<Record<string, string | number>> = {
    profileId: profile.profileId,
    tilesetResRef: profile.tilesetResRef,
    tilesetSha256: profile.tilesetSha256,
    tileId: profile.tileId,
    tileOrientation: profile.tileOrientation,
    tileHeight: profile.tileHeight,
    hookIndex: profile.hookIndex,
    hookType: profile.hookType,
    localX: profile.localX,
    localY: profile.localY,
    localZ: profile.localZ,
    orientationDegrees: profile.orientationDegrees,
  };
  for (const [key, expected] of Object.entries(expectedValues)) {
    assertEqual(value[key], expected, "Unsupported door-hook identity.", `${path}.${key}`);
  }
  assertEqual(topology.tilesetResRef, profile.tilesetResRef, "Door hook belongs to another tileset.", `${path}.tilesetResRef`);
  assertEqual(topology.tilesetFingerprint, profile.tilesetSha256, "Door hook SET fingerprint is stale or unsupported.", `${path}.tilesetSha256`);
  const row = integer(value.row, 0, Number.MAX_SAFE_INTEGER, `${path}.row`);
  const col = integer(value.col, 0, Number.MAX_SAFE_INTEGER, `${path}.col`);
  const tile = topology.tiles.find((candidate) => candidate.row === row && candidate.col === col);
  if (
    !tile || tile.tileId !== profile.tileId ||
    tile.orientation !== profile.tileOrientation || tile.height !== profile.tileHeight
  ) {
    fail("Door hook does not exist on the retained Area tile.", path);
  }
  const expectedX = col + 0.5 + profile.localX / 10;
  const expectedY = row + 0.5 + profile.localY / 10;
  const expectedZ = profile.localZ / 10;
  if (
    transform.x !== expectedX || transform.y !== expectedY ||
    transform.z !== expectedZ || transform.bearing !== profile.sceneBearing
  ) {
    fail("Door transform must be derived from the retained tileset hook.", path);
  }
  return Object.freeze({
    ...expectedValues,
    row,
    col,
  }) as ProjectedAreaDoorHook;
}

function validateDoorHookOccupancy(
  retained: readonly ProjectedRetainedAreaObject[],
  additions: readonly ProjectedNewAreaObject[],
  path: string,
): void {
  const occupied = new Set<string>();
  for (const addition of additions) {
    if (addition.sourceKind !== "door") continue;
    const key = `${addition.doorHook.row}:${addition.doorHook.col}:${addition.doorHook.hookIndex}`;
    const retainedOccupant = retained.some((entry) =>
      entry.sourceKind === "door" &&
      entry.x === addition.x && entry.y === addition.y && entry.z === addition.z,
    );
    if (retainedOccupant || occupied.has(key)) {
      fail("Door hook is already occupied by a retained or newly added door.", path);
    }
    occupied.add(key);
  }
}

function projectRetainedObject(
  input: unknown,
  index: number,
  expectedAreaId: string,
): ProjectedRetainedAreaObject {
  const path = `draft.payload.editableScene.objects.${index}`;
  const value = record(input, path);
  const sceneKind = sceneObjectKind(value.kind, `${path}.kind`);
  const source = record(value.source, `${path}.source`);
  if (source.type !== "aurora_git") {
    fail(
      "New object construction is not admitted by the existing-object deletion slice.",
      `${path}.source.type`,
    );
  }
  if (source.areaId !== undefined && source.areaId !== expectedAreaId) {
    fail("Object provenance identifies another Area.", `${path}.source.areaId`);
  }
  const sourceObjectId = safeIdentifier(
    source.sourceObjectId,
    80,
    `${path}.source.sourceObjectId`,
  );
  const sourceKind = areaObjectKind(source.sourceKind, `${path}.source.sourceKind`);
  if (SCENE_KIND_TO_SOURCE_KIND[sceneKind] !== sourceKind) {
    fail("Scene kind and aurora_git source family differ.", `${path}.source.sourceKind`);
  }
  return Object.freeze({
    sourceObjectId,
    ...(source.sourceIndex !== undefined
      ? { sourceIndex: integer(source.sourceIndex, 0, 99_999, `${path}.source.sourceIndex`) }
      : {}),
    sourceKind,
    sceneKind,
    resRef: safeIdentifier(value.resRef, 80, `${path}.resRef`),
    tag: boundedString(value.tag, 256, `${path}.tag`),
    x: finiteNumber(value.x, `${path}.x`),
    y: finiteNumber(value.y, `${path}.y`),
    z: finiteNumber(value.z, `${path}.z`),
    bearing: finiteNumber(value.bearing, `${path}.bearing`),
  });
}

function sceneObjectKind(value: unknown, path: string): ProjectedAreaSceneObjectKind {
  if (typeof value !== "string" || !(value in SCENE_KIND_TO_SOURCE_KIND)) {
    fail("Expected one supported Area scene object kind.", path);
  }
  return value as ProjectedAreaSceneObjectKind;
}

function areaObjectKind(value: unknown, path: string): ProjectedAreaObjectKind {
  if (
    typeof value !== "string" ||
    !Object.values(SCENE_KIND_TO_SOURCE_KIND).includes(value as ProjectedAreaObjectKind)
  ) {
    fail("Expected one supported aurora_git source family.", path);
  }
  return value as ProjectedAreaObjectKind;
}

function safeIdentifier(value: unknown, max: number, path: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/u.test(value) || value.length > max) {
    fail(`Expected a safe identifier with 1..${max} characters.`, path);
  }
  return value;
}

function boundedString(value: unknown, max: number, path: string): string {
  if (typeof value !== "string" || value.length > max) {
    fail(`Expected a string with no more than ${max} characters.`, path);
  }
  return value;
}

function scriptResRef(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_]{0,16}$/u.test(value)) {
    fail("Expected an empty or 1..16 character script ResRef.", path);
  }
  return value;
}

function booleanValue(value: unknown, path: string): boolean {
  if (typeof value !== "boolean") {
    fail("Expected a boolean value.", path);
  }
  return value;
}

function byteIntegerValue(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 255) {
    fail("Expected an integer Byte value in 0..255.", path);
  }
  return value;
}

function assertOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): void {
  const allowedSet = new Set(allowed);
  const unexpected = Object.keys(value).filter((key) => !allowedSet.has(key));
  if (unexpected.length > 0) {
    fail(`Unexpected field '${unexpected[0]}'.`, `${path}.${unexpected[0]}`);
  }
}

function finiteNumber(value: unknown, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Math.abs(value) > 1_000_000) {
    fail("Expected a finite bounded number.", path);
  }
  return value;
}

function projectTile(
  input: unknown,
  index: number,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
): ProjectedAreaUpdateTile {
  const path = `draft.payload.editableScene.auroraAreaEditing.state.tiles.${index}`;
  const value = record(input, path);
  const row = integer(value.row, 0, height - 1, `${path}.row`);
  const col = integer(value.col, 0, width - 1, `${path}.col`);
  const expectedRow = Math.floor(index / width);
  const expectedCol = index % width;
  if (row !== expectedRow || col !== expectedCol) {
    fail(`Tile ${index} must be row-major cell (${expectedRow}, ${expectedCol}).`, path);
  }
  const sourceRowPresent = value.sourceRow !== undefined;
  const sourceColPresent = value.sourceCol !== undefined;
  if (sourceRowPresent !== sourceColPresent) {
    fail("sourceRow and sourceCol must both be present or absent.", path);
  }
  const sourceRow = sourceRowPresent
    ? integer(value.sourceRow, 0, sourceHeight - 1, `${path}.sourceRow`)
    : undefined;
  const sourceCol = sourceColPresent
    ? integer(value.sourceCol, 0, sourceWidth - 1, `${path}.sourceCol`)
    : undefined;
  const projected: Omit<
    ProjectedAreaUpdateTile,
    | "mainLight1"
    | "mainLight2"
    | "sourceLight1"
    | "sourceLight2"
    | "animLoop1"
    | "animLoop2"
    | "animLoop3"
  > = {
    row,
    col,
    ...(sourceRow === undefined ? {} : { sourceRow }),
    ...(sourceCol === undefined ? {} : { sourceCol }),
    tileId: integer(value.tileId, 0, 0x7fffffff, `${path}.tileId`),
    orientation: integer(value.orientation, 0, 3, `${path}.orientation`),
    height: integer(value.height, 0, 32, `${path}.height`),
  };
  const byteFields: Partial<
    Mutable<Pick<
      ProjectedAreaUpdateTile,
      | "mainLight1"
      | "mainLight2"
      | "sourceLight1"
      | "sourceLight2"
      | "animLoop1"
      | "animLoop2"
      | "animLoop3"
    >>
  > = {};
  for (const field of [
    "mainLight1",
    "mainLight2",
    "sourceLight1",
    "sourceLight2",
    "animLoop1",
    "animLoop2",
    "animLoop3",
  ] as const) {
    if (value[field] !== undefined) {
      byteFields[field] = integer(
        value[field],
        0,
        255,
        `${path}.${field}`,
      );
    }
  }
  return Object.freeze({ ...projected, ...byteFields });
}

function assertAreaIdentity(value: unknown, resRefValue: string, path: string): void {
  if (typeof value !== "string" || value.replace(/^area_/u, "").toLowerCase() !== resRefValue) {
    fail("Area identity does not match the command ResRef.", path);
  }
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    fail("Expected a JSON object.", path);
  }
  return value as Record<string, unknown>;
}

function resRef(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-z0-9_]{1,16}$/iu.test(value.trim())) {
    fail("Expected an Aurora ResRef.", path);
  }
  return value.trim().toLowerCase();
}

function sha256(value: unknown, path: string): string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/iu.test(value)) {
    fail("Expected a SHA-256 value.", path);
  }
  return value.toLowerCase();
}

function nonBlank(value: unknown, max: number, path: string): string {
  if (typeof value !== "string" || value.trim().length < 1 || value.length > max) {
    fail(`Expected 1..${max} characters.`, path);
  }
  return value;
}

function nonNulNonBlank(value: unknown, max: number, path: string): string {
  const result = nonBlank(value, max, path);
  if (result.includes("\0")) {
    fail("NUL characters are not supported.", path);
  }
  return result;
}

function positiveInteger(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) {
    fail("Expected a positive integer.", path);
  }
  return Number(value);
}

function dimension(value: unknown, path: string): number {
  return integer(value, 2, 32, path);
}

function integer(value: unknown, min: number, max: number, path: string): number {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max) {
    fail(`Expected an integer in ${min}..${max}.`, path);
  }
  return Number(value);
}

function assertEqual(
  actual: unknown,
  expected: unknown,
  message: string,
  path: string,
): void {
  if (actual !== expected) fail(message, path);
}

function fail(message: string, path: string): never {
  throw new AreaUpdateDraftProjectionError(message, path);
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };
