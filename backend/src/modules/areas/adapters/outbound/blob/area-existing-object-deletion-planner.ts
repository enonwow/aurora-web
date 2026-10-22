import {
  enumerateAreaObjectSources,
  normalizeAreaObjectSourceToken,
  type IndexedAreaObjectSource,
} from "../../../domain/area-object-source-identity";
import type { ProjectedAreaObjectEditing } from "../../../domain/area-update-draft-projector";
import {
  findAreaPlaceableScriptFieldMapping,
  type ExistingAreaPlaceableScriptField,
} from "../../../domain/area-placeable-script-fields";
import {
  findAreaPlaceableTrapScriptFieldMapping,
  type ExistingAreaPlaceableTrapScriptField,
} from "../../../domain/area-placeable-trap-script-fields";
import {
  AREA_PLACEABLE_LOCK_FIELD_MAPPINGS,
  findAreaPlaceableLockFieldMapping,
  isAreaPlaceableLockFieldValue,
} from "../../../domain/area-placeable-lock-fields";
import { isAreaPlaceableKeyName } from "../../../domain/area-placeable-key-name";
import {
  AreaPlaceableInventoryValidationError,
  areaPlaceableInventoryEntriesEqual,
  parseAreaPlaceableInventoryMutation,
  parseAreaPlaceableInventorySourceEntries,
} from "../../../domain/area-placeable-inventory";
import {
  AreaCreatureInventoryValidationError,
  areaCreatureInventoryEntriesEqual,
  parseAreaCreatureInventoryMutation,
  parseAreaCreatureInventorySourceEntries,
} from "../../../domain/area-creature-inventory";
import {
  AreaCreatureEquipmentValidationError,
  areaCreatureEquipmentEntriesEqual,
  parseAreaCreatureEquipmentMutation,
  parseAreaCreatureEquipmentSourceEntries,
} from "../../../domain/area-creature-equipment";
import {
  AreaItemInventoryValidationError,
  areaItemInventoryEntriesEqual,
  parseAreaItemInventoryMutation,
  parseAreaItemInventorySourceEntries,
  type AreaItemInventoryMutation,
} from "../../../domain/area-item-inventory";
import {
  AreaItemVisualTransformValidationError,
  areaItemVisualTransformStorageEqual,
  parseAreaItemVisualTransformMutation,
  parseAreaItemVisualTransformStorage,
  type AreaItemVisualTransformMutation,
} from "../../../domain/area-item-visual-transform";
import {
  readExistingAreaCreatureTagMutation,
  readExistingAreaCreatureTagStorage,
  type AreaCreatureTagStorage,
  type ExistingAreaCreatureTagMutation,
} from "../../../domain/area-creature-tag";
import {
  readExistingAreaCreatureConversationMutation,
  readExistingAreaCreatureConversationStorage,
  type AreaCreatureConversationStorage,
  type ExistingAreaCreatureConversationMutation,
} from "../../../domain/area-creature-conversation";
import {
  readAreaCreatureInterruptableStorage,
  readExistingAreaCreatureInterruptableMutation,
  type AreaCreatureInterruptableStorage,
  type ExistingAreaCreatureInterruptableMutation,
} from "../../../domain/area-creature-interruptable";
import {
  AREA_CREATURE_ADVANCED_FLAG_FIELDS,
  readAreaCreatureAdvancedFlagsStorage,
  readExistingAreaCreatureAdvancedFlagMutations,
  type AreaCreatureAdvancedFlagsStorage,
  type ExistingAreaCreatureAdvancedFlagMutations,
} from "../../../domain/area-creature-advanced-flags";
import {
  readAreaCreatureBodyBagStorage,
  readAreaCreatureDecayTimeStorage,
  readExistingAreaCreatureBodyBagMutation,
  readExistingAreaCreatureDecayTimeMutation,
  type AreaCreatureBodyBagStorage,
  type AreaCreatureDecayTimeStorage,
  type ExistingAreaCreatureBodyBagMutation,
  type ExistingAreaCreatureDecayTimeMutation,
} from "../../../domain/area-creature-death-remains";
import {
  readAreaCreatureAppearanceStorage,
  readExistingAreaCreatureAppearanceMutation,
  type AreaCreatureAppearanceStorage,
  type ExistingAreaCreatureAppearanceMutation,
} from "../../../domain/area-creature-appearance";
import {
  readAreaCreatureGenderStorage,
  readExistingAreaCreatureGenderMutation,
  type AreaCreatureGenderStorage,
  type ExistingAreaCreatureGenderMutation,
} from "../../../domain/area-creature-gender";
import {
  readAreaCreaturePerceptionRangeStorage,
  readExistingAreaCreaturePerceptionRangeMutation,
  type AreaCreaturePerceptionRangeStorage,
  type ExistingAreaCreaturePerceptionRangeMutation,
} from "../../../domain/area-creature-perception-range";
import {
  readAreaCreatureWalkRateStorage,
  readExistingAreaCreatureWalkRateMutation,
  type AreaCreatureWalkRateStorage,
  type ExistingAreaCreatureWalkRateMutation,
} from "../../../domain/area-creature-walk-rate";
import {
  readAreaCreatureSoundSetFileStorage,
  readExistingAreaCreatureSoundSetFileMutation,
  type AreaCreatureSoundSetFileStorage,
  type ExistingAreaCreatureSoundSetFileMutation,
} from "../../../domain/area-creature-sound-set-file";
import {
  readAreaCreatureStartingPackageStorage,
  readExistingAreaCreatureStartingPackageMutation,
  type AreaCreatureStartingPackageStorage,
  type ExistingAreaCreatureStartingPackageMutation,
} from "../../../domain/area-creature-starting-package";
import {
  readAreaCreatureSkillListStorage,
  readExistingAreaCreatureSkillListMutation,
  type AreaCreatureSkillListStorage,
  type ExistingAreaCreatureSkillListMutation,
} from "../../../domain/area-creature-skill-list";
import {
  readAreaCreatureFeatListStorage,
  readExistingAreaCreatureFeatListMutation,
  type AreaCreatureFeatListStorage,
  type ExistingAreaCreatureFeatListMutation,
} from "../../../domain/area-creature-feat-list";
import {
  groupCanonicalCreatureSpecialAbilityEntries,
  readAreaCreatureSpecialAbilityListStorage,
  readExistingAreaCreatureSpecialAbilityListMutation,
  type AreaCreatureSpecialAbilityListStorage,
  type ExistingAreaCreatureSpecialAbilityListMutation,
} from "../../../domain/area-creature-special-ability-list";
import {
  readAreaCreatureClassLevelState,
  readExistingAreaCreatureClassLevelMutation,
  type AreaCreatureClassLevelState,
  type ExistingAreaCreatureClassLevelMutation,
} from "../../../domain/area-creature-class-levels";
import {
  readAreaCreatureClassIdentityState,
  readExistingAreaCreatureClassIdentityMutation,
  type AreaCreatureClassIdentityState,
  type ExistingAreaCreatureClassIdentityMutation,
} from "../../../domain/area-creature-class-identity";
import {
  readExistingAreaCreatureClassSlotResizeMutation,
  type ExistingAreaCreatureClassSlotResizeMutation,
} from "../../../domain/area-creature-class-slot-resize";
import {
  readExistingAreaCreatureClassSpellClearMutation,
  type ExistingAreaCreatureClassSpellClearMutation,
} from "../../../domain/area-creature-class-spell-clear";
import {
  readExistingAreaCreatureClassSpellRemovalMutation,
  type ExistingAreaCreatureClassSpellRemovalMutation,
} from "../../../domain/area-creature-class-spell-removal";
import {
  readExistingAreaCreatureClassSpellReorderMutation,
  type ExistingAreaCreatureClassSpellReorderMutation,
} from "../../../domain/area-creature-class-spell-reorder";
import {
  readExistingAreaCreatureClassSpellReplacementMutation,
  type ExistingAreaCreatureClassSpellReplacementMutation,
} from "../../../domain/area-creature-class-spell-replacement";
import {
  readAreaCreaturePhenotypeStorage,
  readExistingAreaCreaturePhenotypeMutation,
  type AreaCreaturePhenotypeStorage,
  type ExistingAreaCreaturePhenotypeMutation,
} from "../../../domain/area-creature-phenotype";
import {
  readAreaCreaturePortraitStorage,
  readExistingAreaCreaturePortraitMutation,
  type AreaCreaturePortraitStorage,
  type ExistingAreaCreaturePortraitMutation,
} from "../../../domain/area-creature-portrait";
import {
  readAreaCreatureChallengeRatingStorage,
  readExistingAreaCreatureChallengeRatingMutation,
  type AreaCreatureChallengeRatingStorage,
  type ExistingAreaCreatureChallengeRatingMutation,
} from "../../../domain/area-creature-challenge-rating";
import {
  readAreaCreatureAbilityScoresStorage,
  readExistingAreaCreatureAbilityScoreMutations,
  type AreaCreatureAbilityScoresStorage,
  type ExistingAreaCreatureAbilityScoreMutations,
} from "../../../domain/area-creature-ability-scores";
import {
  readAreaCreatureAppearanceColorsStorage,
  readExistingAreaCreatureAppearanceColorMutations,
  type AreaCreatureAppearanceColorsStorage,
  type ExistingAreaCreatureAppearanceColorMutations,
} from "../../../domain/area-creature-appearance-colors";
import {
  maximumAreaCreatureBodyPartTarget,
  readAreaCreatureBodyPartsStorage,
  readExistingAreaCreatureBodyPartMutations,
  type AreaCreatureBodyPartsStorage,
  type ExistingAreaCreatureBodyPartMutations,
} from "../../../domain/area-creature-body-parts";
import {
  readAreaCreatureAppendagesStorage,
  readExistingAreaCreatureAppendageMutations,
  type AreaCreatureAppendagesStorage,
  type ExistingAreaCreatureAppendageMutations,
} from "../../../domain/area-creature-appendages";
import {
  readAreaCreatureHitPointState,
  readExistingAreaCreatureHitPointMutation,
  type AreaCreatureHitPointState,
  type ExistingAreaCreatureHitPointMutation,
} from "../../../domain/area-creature-hit-points";
import {
  readAreaCreatureNaturalArmorClassStorage,
  readExistingAreaCreatureNaturalArmorClassMutation,
  type AreaCreatureNaturalArmorClassStorage,
  type ExistingAreaCreatureNaturalArmorClassMutation,
} from "../../../domain/area-creature-natural-armor-class";
import {
  readAreaCreatureSavingThrowBonusesStorage,
  readExistingAreaCreatureSavingThrowBonusMutations,
  type AreaCreatureSavingThrowBonusesStorage,
  type ExistingAreaCreatureSavingThrowBonusMutations,
} from "../../../domain/area-creature-saving-throw-bonuses";
import {
  readAreaCreatureAlignmentStorage,
  readExistingAreaCreatureAlignmentMutation,
  type AreaCreatureAlignmentStorage,
  type ExistingAreaCreatureAlignmentMutation,
} from "../../../domain/area-creature-alignment";
import {
  readExistingAreaCreatureFactionMutation,
  type ExistingAreaCreatureFactionMutation,
} from "../../../domain/area-creature-faction";
import {
  readExistingAreaCreatureTemplateResRefMutation,
  type ExistingAreaCreatureTemplateResRefMutation,
} from "../../../domain/area-creature-template-resref";
import {
  readExistingAreaCreatureSpecialIdentityStringsMutation,
  type ExistingAreaCreatureSpecialIdentityStringsMutation,
} from "../../../domain/area-creature-special-identity-strings";
import {
  AREA_CREATURE_SCRIPT_RESREF_FIELDS,
  readExistingAreaCreatureScriptResRefMutations,
  type ExistingAreaCreatureScriptResRefMutation,
} from "../../../domain/area-creature-script-resrefs";
import {
  AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS,
  areaCreatureLocalizedStringEntriesEqual,
  readEditableAreaCreatureLocalizedStringStorage,
  readAreaCreatureNameInlineAsciiStorage,
  readExistingAreaCreatureNameLocalizedStringMutations,
  type ExistingAreaCreatureNameLocalizedStringMutation,
} from "../../../domain/area-creature-localized-string-mutation";
import type { ExistingAreaObjectTagMutation } from "../../../domain/area-object-tag";
import {
  AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS,
  findAreaPlaceableBasicByteFieldMapping,
  isAreaPlaceableByteValue,
  type ExistingAreaPlaceableBasicByteMutation,
} from "../../../domain/area-placeable-basic-byte-fields";
import {
  isAreaPlaceableConversation,
  isAreaPlaceableInterruptableValue,
  type ExistingAreaPlaceableConversationMutation,
  type ExistingAreaPlaceableInterruptableMutation,
} from "../../../domain/area-placeable-conversation-interruptable";
import {
  isAreaPlaceableAnimationState,
  type ExistingAreaPlaceableAnimationStateMutation,
} from "../../../domain/area-placeable-animation-state";
import {
  AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  findAreaPlaceableTrapByteFieldMapping,
  isAreaPlaceableTrapByteMutationValue,
  type ExistingAreaPlaceableTrapByteMutation,
} from "../../../domain/area-placeable-trap-byte-fields";
import {
  isAreaPlaceableEditorComment,
  type ExistingAreaPlaceableEditorCommentMutation,
} from "../../../domain/area-placeable-editor-comment";
import {
  isAreaCreatureEditorComment,
  type ExistingAreaCreatureEditorCommentMutation,
} from "../../../domain/area-creature-editor-comment";
import {
  isAreaItemEditorComment,
  type ExistingAreaItemEditorCommentMutation,
} from "../../../domain/area-item-editor-comment";
import {
  isAreaStoreEditorComment,
  type ExistingAreaStoreEditorCommentMutation,
} from "../../../domain/area-store-editor-comment";
import {
  areaStoreCommerceValueEqual,
  readAreaStoreCommerceMutation,
  readAreaStoreCommerceValue,
  type ExistingAreaStoreCommerceMutation,
} from "../../../domain/area-store-commerce";
import {
  areaStoreScriptResRefsValueEqual,
  readAreaStoreScriptResRefsMutation,
  readAreaStoreScriptResRefsValue,
  type ExistingAreaStoreScriptResRefsMutation,
} from "../../../domain/area-store-script-resrefs";
import {
  areaStoreVariableSourceEntriesEqual,
  parseAreaStoreVariableMutation,
  type ExistingAreaStoreVariableMutation,
} from "../../../domain/area-store-variable-table";
import {
  areaStoreRestrictionsRawMatchesExpected,
  readExistingAreaStoreRestrictionsMutation,
  type AreaStoreRestrictionsRawStorage,
  type ExistingAreaStoreRestrictionsMutation,
} from "../../../domain/area-store-restrictions";
import {
  areaStoreInventoryRawMatchesExpected,
  readExistingAreaStoreInventoryMutation,
  type AreaStoreInventoryRawStorage,
  type ExistingAreaStoreInventoryMutation,
} from "../../../domain/area-store-inventory";
import {
  readExistingAreaItemTagMutation,
  readExistingAreaItemTagStorage,
  type ExistingAreaItemTagMutation,
} from "../../../domain/area-item-tag";
import {
  readExistingAreaTriggerTagMutation,
  readExistingAreaTriggerTagStorage,
  type ExistingAreaTriggerTagMutation,
} from "../../../domain/area-trigger-tag";
import {
  readExistingAreaTriggerTemplateResRefMutation,
  type ExistingAreaTriggerTemplateResRefMutation,
} from "../../../domain/area-trigger-template-resref";
import {
  readAreaTriggerLocalizedNameInlineAsciiStorage,
  readExistingAreaTriggerLocalizedNameMutation,
  type ExistingAreaTriggerLocalizedNameMutation,
} from "../../../domain/area-trigger-localized-name";
import {
  isAreaTriggerEditorComment,
  type ExistingAreaTriggerEditorCommentMutation,
} from "../../../domain/area-trigger-editor-comment";
import {
  areaTriggerScriptResRefsStoragesEqual,
  readAreaTriggerScriptResRefsStorage,
  readExistingAreaTriggerScriptResRefsMutation,
  type ExistingAreaTriggerScriptResRefsMutation,
} from "../../../domain/area-trigger-script-resrefs";
import {
  areaTriggerTransitionStorageEqual,
  isAreaTriggerTransitionStorage,
  readExistingAreaTriggerTransitionStorageMutation,
  type ExistingAreaTriggerTransitionStorageMutation,
} from "../../../domain/area-trigger-transition-storage";
import {
  areaTriggerCorePropertiesEqual,
  isAreaTriggerCoreProperties,
  readExistingAreaTriggerCorePropertiesMutation,
  type ExistingAreaTriggerCorePropertiesMutation,
} from "../../../domain/area-trigger-core-properties";
import {
  areaTriggerTrapPropertiesEqual,
  isAreaTriggerTrapProperties,
  readExistingAreaTriggerTrapPropertiesMutation,
  type ExistingAreaTriggerTrapPropertiesMutation,
} from "../../../domain/area-trigger-trap-properties";
import {
  readExistingAreaEncounterTagMutation,
  readExistingAreaEncounterTagStorage,
  type ExistingAreaEncounterTagMutation,
} from "../../../domain/area-encounter-tag";
import {
  readExistingAreaEncounterTemplateResRefMutation,
  type ExistingAreaEncounterTemplateResRefMutation,
} from "../../../domain/area-encounter-template-resref";
import {
  readExistingAreaWaypointTagMutation,
  readExistingAreaWaypointTagStorage,
  type ExistingAreaWaypointTagMutation,
} from "../../../domain/area-waypoint-tag";
import {
  readExistingAreaWaypointTemplateResRefMutation,
  type ExistingAreaWaypointTemplateResRefMutation,
} from "../../../domain/area-waypoint-template-resref";
import {
  readAreaWaypointLocalizedNameInlineAsciiStorage,
  readExistingAreaWaypointLocalizedNameMutation,
  type ExistingAreaWaypointLocalizedNameMutation,
} from "../../../domain/area-waypoint-localized-name";
import {
  readAreaWaypointDescriptionInlineAsciiStorage,
  readExistingAreaWaypointDescriptionMutation,
  type ExistingAreaWaypointDescriptionMutation,
} from "../../../domain/area-waypoint-description";
import {
  mapNoteValuesEqual,
  readAreaWaypointMapNoteInlineAsciiValue,
  readExistingAreaWaypointMapNoteMutation,
  type ExistingAreaWaypointMapNoteMutation,
} from "../../../domain/area-waypoint-map-note";
import {
  parseAreaWaypointAppearanceMutation,
  type ExistingAreaWaypointAppearanceMutation,
} from "../../../domain/area-waypoint-appearance";
import {
  isAreaWaypointEditorComment,
  type ExistingAreaWaypointEditorCommentMutation,
} from "../../../domain/area-waypoint-editor-comment";
import {
  areaEncounterActiveStoragesEqual,
  readAreaEncounterActiveStorage,
  readExistingAreaEncounterActiveMutation,
  type ExistingAreaEncounterActiveMutation,
} from "../../../domain/area-encounter-active";
import {
  areaEncounterPlayerOnlyStoragesEqual,
  readAreaEncounterPlayerOnlyStorage,
  readExistingAreaEncounterPlayerOnlyMutation,
  type ExistingAreaEncounterPlayerOnlyMutation,
} from "../../../domain/area-encounter-player-only";
import {
  areaEncounterResetStoragesEqual,
  readAreaEncounterResetStorage,
  readExistingAreaEncounterResetMutation,
  type ExistingAreaEncounterResetMutation,
} from "../../../domain/area-encounter-reset";
import {
  areaEncounterResetTimeStoragesEqual,
  readAreaEncounterResetTimeStorage,
  readExistingAreaEncounterResetTimeMutation,
  type ExistingAreaEncounterResetTimeMutation,
} from "../../../domain/area-encounter-reset-time";
import {
  areaEncounterSpawnOptionStoragesEqual,
  readAreaEncounterSpawnOptionStorage,
  readExistingAreaEncounterSpawnOptionMutation,
  type ExistingAreaEncounterSpawnOptionMutation,
} from "../../../domain/area-encounter-spawn-option";
import {
  areaEncounterRespawnsStoragesEqual,
  readAreaEncounterRespawnsStorage,
  readExistingAreaEncounterRespawnsMutation,
  type ExistingAreaEncounterRespawnsMutation,
} from "../../../domain/area-encounter-respawns";
import {
  areaEncounterCreatureCountStoragesEqual,
  readAreaEncounterCreatureCountStorage,
  readExistingAreaEncounterCreatureCountMutation,
  type ExistingAreaEncounterCreatureCountMutation,
} from "../../../domain/area-encounter-creature-counts";
import {
  areaEncounterScriptResRefsStoragesEqual,
  readAreaEncounterScriptResRefsStorage,
  readExistingAreaEncounterScriptResRefsMutation,
  type ExistingAreaEncounterScriptResRefsMutation,
} from "../../../domain/area-encounter-script-resrefs";
import {
  readAreaEncounterFactionStorage,
  readExistingAreaEncounterFactionMutation,
  type ExistingAreaEncounterFactionMutation,
} from "../../../domain/area-encounter-faction";
import {
  readAreaEncounterDifficultyStorage,
  readExistingAreaEncounterDifficultyMutation,
  type ExistingAreaEncounterDifficultyMutation,
} from "../../../domain/area-encounter-difficulty";
import {
  readAreaEncounterLocalizedNameInlineAsciiStorage,
  readExistingAreaEncounterLocalizedNameMutation,
  type ExistingAreaEncounterLocalizedNameMutation,
} from "../../../domain/area-encounter-localized-name";
import {
  isAreaEncounterEditorComment,
  type ExistingAreaEncounterEditorCommentMutation,
} from "../../../domain/area-encounter-editor-comment";
import {
  areaEncounterVariableSourceEntriesEqual,
  parseAreaEncounterVariableMutation,
  type ExistingAreaEncounterVariableMutation,
} from "../../../domain/area-encounter-variable-table";
import {
  areaWaypointVariableSourceEntriesEqual,
  parseAreaWaypointVariableMutation,
  type ExistingAreaWaypointVariableMutation,
} from "../../../domain/area-waypoint-variable-table";
import {
  areaTriggerVariableSourceEntriesEqual,
  parseAreaTriggerVariableMutation,
  type ExistingAreaTriggerVariableMutation,
} from "../../../domain/area-trigger-variable-table";
import {
  areaEncounterCreatureListEntriesEqual,
  parseAreaEncounterCreatureListMutation,
  type ExistingAreaEncounterCreatureListMutation,
} from "../../../domain/area-encounter-creature-single-spawn";
import {
  areaEncounterSpawnPointSourceEntriesEqual,
  parseAreaEncounterSpawnPointListMutation,
  type ExistingAreaEncounterSpawnPointListMutation,
} from "../../../domain/area-encounter-spawn-point-list";
import {
  readAreaItemTemplateResRefStorage,
  readExistingAreaItemTemplateResRefMutation,
  type ExistingAreaItemTemplateResRefMutation,
} from "../../../domain/area-item-template-resref";
import {
  areaItemInstanceStateStorageEqual,
  readAreaItemInstanceStateMutation,
  readAreaItemInstanceStateStorage,
  type ExistingAreaItemInstanceStateMutation,
} from "../../../domain/area-item-instance-state";
import { readAreaItemLocalizedStrings } from "../../../domain/area-item-localized-strings";
import {
  AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS,
  areaItemLocalizedStringEntriesEqual,
  readEditableAreaItemLocalizedStringStorage,
  readAreaItemInlineAsciiStorage,
  readExistingAreaItemLocalizedStringMutations,
  type ExistingAreaItemLocalizedStringMutation,
} from "../../../domain/area-item-localized-string-mutation";
import {
  readExistingAreaPlaceableAppearanceMutation,
  type ExistingAreaPlaceableAppearanceMutation,
} from "../../../domain/area-placeable-appearance";
import {
  readExistingAreaPlaceableTrapTypeMutation,
  type ExistingAreaPlaceableTrapTypeMutation,
} from "../../../domain/area-placeable-trap-type";
import {
  readExistingAreaPlaceableBodyBagMutation,
  type ExistingAreaPlaceableBodyBagMutation,
} from "../../../domain/area-placeable-body-bag";
import {
  readExistingAreaPlaceablePortraitMutation,
  type ExistingAreaPlaceablePortraitMutation,
} from "../../../domain/area-placeable-portrait-id";
import {
  readExistingAreaPlaceableFactionMutation,
  type ExistingAreaPlaceableFactionMutation,
} from "../../../domain/area-placeable-faction";
import {
  areaPlaceableVariableSourceEntriesEqual,
  parseAreaPlaceableVariableMutation,
  type ExistingAreaPlaceableVariableMutation,
} from "../../../domain/area-placeable-variable-table";
import {
  areaCreatureVariableSourceEntriesEqual,
  parseAreaCreatureVariableMutation,
  type ExistingAreaCreatureVariableMutation,
} from "../../../domain/area-creature-variable-table";
import {
  areaItemVariableSourceEntriesEqual,
  parseAreaItemVariableMutation,
  type ExistingAreaItemVariableMutation,
} from "../../../domain/area-item-variable-table";
import {
  areaItemPropertyListSourceEntriesEqual,
  parseAreaItemPropertyListMutation,
  parseAreaItemPropertyListProvenance,
  type ExistingAreaItemPropertyListMutation,
} from "../../../domain/area-item-property-list";
import {
  itemBaseAppearanceRawMatchesValue,
  readExistingAreaItemBaseAppearanceMutation,
  type ExistingAreaItemBaseAppearanceMutation,
} from "../../../domain/area-item-base-appearance";
import {
  isAreaPlaceableTemplateResRef,
  type ExistingAreaPlaceableTemplateResRefMutation,
} from "../../../domain/area-placeable-template-resref";
import {
  isAuroraShort,
  isEditableAreaPlaceableHitPoints,
  readExistingAreaPlaceableHitPointMutation,
  type ExistingAreaPlaceableHitPointMutation,
} from "../../../domain/area-placeable-hit-points";
import {
  readExistingAreaPlaceableTagMutation,
  type ExistingAreaPlaceableTagMutation,
} from "../../../domain/area-placeable-tag";
import {
  AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS,
  areaPlaceableLocalizedStringEntriesEqual,
  readEditableAreaPlaceableLocalizedStringStorage,
  readAreaPlaceableInlineAsciiStorage,
  readExistingAreaPlaceableLocalizedStringMutations,
  type ExistingAreaPlaceableLocalizedStringMutation,
} from "../../../domain/area-placeable-localized-string-mutation";
import type {
  ExistingAreaDoorTransitionStorageMutation,
  ExistingAreaObjectPropertyMutation,
  ExistingAreaObjectDeletion,
  ExistingAreaObjectTransform,
  ExistingAreaPlaceableScriptResRefMutation,
  ExistingAreaPlaceableTrapScriptResRefMutation,
  ExistingAreaPlaceableLockMutation,
  ExistingAreaPlaceableKeyNameMutation,
  ExistingAreaPlaceableInventoryMutation,
  ExistingAreaCreatureInventoryMutation,
  ExistingAreaCreatureEquipmentMutation,
} from "./aurora-gff-area-object-pair-writer";
import {
  areaDoorTransitionStorageEqual,
  readExistingAreaDoorTransitionStorageMutation,
} from "../../../domain/area-door-transition-storage";
import {
  parseAreaObjectsFromGitGicGff,
  type ParsedAreaPlacementBlueprint,
} from "./aurora-gff-area-parser";
import {
  MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE,
  areaObjectPolygonGeometriesEqual,
  readExistingAreaObjectPolygonMutation,
  type ExistingAreaObjectPolygonMutation,
} from "../../../domain/area-object-polygon-geometry";
import {
  MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE,
  areaSoundIntervalVariationStoragesEqual,
  readExistingAreaSoundIntervalVariationMutation,
  type ExistingAreaSoundIntervalVariationMutation,
} from "../../../domain/area-sound-interval-variation-storage";
import {
  areaSoundVolumeStoragesEqual,
  MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundVolumeMutation,
  type ExistingAreaSoundVolumeMutation,
} from "../../../domain/area-sound-volume-storage";
import {
  areaSoundScheduleStoragesEqual,
  MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundScheduleMutation,
  type ExistingAreaSoundScheduleMutation,
} from "../../../domain/area-sound-schedule-storage";
import {
  areaSoundActiveStoragesEqual,
  MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundActiveMutation,
  type ExistingAreaSoundActiveMutation,
} from "../../../domain/area-sound-active-storage";
import {
  areaSoundPlayOrderStoragesEqual,
  MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundPlayOrderMutation,
  type ExistingAreaSoundPlayOrderMutation,
} from "../../../domain/area-sound-play-order-storage";
import {
  areaSoundPlayStyleStoragesEqual,
  MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundPlayStyleMutation,
  type ExistingAreaSoundPlayStyleMutation,
} from "../../../domain/area-sound-play-style-storage";
import {
  areaSoundPlaybackStoragesEqual,
  MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundPlaybackMutation,
  type ExistingAreaSoundPlaybackMutation,
} from "../../../domain/area-sound-playback-storage";
import {
  areaSoundProfileStoragesEqual,
  MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundProfileMutation,
  type ExistingAreaSoundProfileMutation,
} from "../../../domain/area-sound-profile-storage";

export class AreaExistingObjectDeletionPlanError extends Error {
  readonly code = "AREA_UPDATE_OBJECT_MUTATION_INVALID" as const;

  constructor(message: string, readonly details: readonly string[] = []) {
    super(message);
    this.name = "AreaExistingObjectDeletionPlanError";
  }
}

export interface ExistingAreaObjectDeletionPlan {
  readonly deletions: readonly ExistingAreaObjectDeletion[];
  readonly transforms: readonly ExistingAreaObjectTransform[];
  readonly propertyMutations: readonly ExistingAreaObjectPropertyMutation[];
  readonly doorTransitionMutations: readonly ExistingAreaDoorTransitionStorageMutation[];
  readonly polygonMutations: readonly ExistingAreaObjectPolygonMutation[];
  readonly soundIntervalVariationMutations: readonly ExistingAreaSoundIntervalVariationMutation[];
  readonly soundVolumeMutations: readonly ExistingAreaSoundVolumeMutation[];
  readonly soundScheduleMutations: readonly ExistingAreaSoundScheduleMutation[];
  readonly soundActiveMutations: readonly ExistingAreaSoundActiveMutation[];
  readonly soundPlayOrderMutations: readonly ExistingAreaSoundPlayOrderMutation[];
  readonly soundPlayStyleMutations: readonly ExistingAreaSoundPlayStyleMutation[];
  readonly soundPlaybackMutations: readonly ExistingAreaSoundPlaybackMutation[];
  readonly soundProfileMutations: readonly ExistingAreaSoundProfileMutation[];
  readonly sourceObjectCount: number;
  readonly retainedObjectCount: number;
}

export function planExistingAreaObjectDeletions(
  sourceGit: Buffer,
  sourceGic: Buffer,
  editing: ProjectedAreaObjectEditing,
): ExistingAreaObjectDeletionPlan {
  const parsed = parseAreaObjectsFromGitGicGff(sourceGit, sourceGic);
  if (!parsed) {
    throw invalid("The exact source GIT/GIC pair cannot be parsed as paired Area object resources.");
  }
  const indexed = enumerateAreaObjectSources(parsed);
  const sourceById = new Map(indexed.map((entry) => [entry.sourceObjectId, entry]));
  const sourceByOrdinal = new Map(
    indexed.map((entry) => [sourceOrdinalKey(entry.kind, entry.sourceIndex), entry]),
  );
  const retainedSourceKeys = new Set<string>();
  const retainedDiagnosticIds = new Set<string>();
  const resolvedRetained: Array<Readonly<{
    retained: ProjectedAreaObjectEditing["retainedObjects"][number];
    source: IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>;
  }>> = [];
  const transforms: ExistingAreaObjectTransform[] = [];

  for (const retained of editing.retainedObjects) {
    retainedDiagnosticIds.add(retained.sourceObjectId);
    const source = retained.sourceIndex !== undefined
      ? sourceByOrdinal.get(sourceOrdinalKey(retained.sourceKind, retained.sourceIndex))
      : sourceById.get(retained.sourceObjectId);
    if (!source) {
      throw invalid("A retained object does not exist in the exact source GIT.", [
        retained.sourceObjectId,
        ...(retained.sourceIndex !== undefined ? [`ordinal=${retained.sourceIndex}`] : []),
      ]);
    }
    const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
    if (retainedSourceKeys.has(sourceKey)) {
      throw invalid("One source object identity is retained more than once.", [
        retained.sourceObjectId,
      ]);
    }
    retainedSourceKeys.add(sourceKey);
    if (source.kind !== retained.sourceKind) {
      throw invalid("A retained object identifies another GIT family.", [
        retained.sourceObjectId,
        `expected=${source.kind}`,
        `actual=${retained.sourceKind}`,
      ]);
    }
    resolvedRetained.push(Object.freeze({ retained, source }));
  }

  const propertyMutations = planPropertyMutations(
    editing.propertyMutations ?? [],
    sourceById,
    sourceByOrdinal,
    retainedSourceKeys,
    retainedDiagnosticIds,
  );
  const doorTransitionMutations = planDoorTransitionMutations(
    editing.doorTransitionMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
  );
  const retainedIdentityByOrdinal = new Map(
    resolvedRetained.map(({ retained, source }) => [
      sourceOrdinalKey(source.kind, source.sourceIndex),
      retained.sourceObjectId,
    ]),
  );
  const polygonMutations = planPolygonMutations(
    editing.polygonMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundIntervalVariationMutations = planSoundIntervalVariationMutations(
    editing.soundIntervalVariationMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundVolumeMutations = planSoundVolumeMutations(
    editing.soundVolumeMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundScheduleMutations = planSoundScheduleMutations(
    editing.soundScheduleMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundActiveMutations = planSoundActiveMutations(
    editing.soundActiveMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundPlayOrderMutations = planSoundPlayOrderMutations(
    editing.soundPlayOrderMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundPlayStyleMutations = planSoundPlayStyleMutations(
    editing.soundPlayStyleMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundPlaybackMutations = planSoundPlaybackMutations(
    editing.soundPlaybackMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const soundProfileMutations = planSoundProfileMutations(
    editing.soundProfileMutations ?? [],
    sourceByOrdinal,
    retainedSourceKeys,
    retainedIdentityByOrdinal,
  );
  const playbackOrdinals = new Set(soundPlaybackMutations.map((entry) => entry.sourceIndex));
  const conflictingPlayStyle = soundPlayStyleMutations.find(
    (entry) => playbackOrdinals.has(entry.sourceIndex),
  );
  if (conflictingPlayStyle) {
    throw invalid("A Sound playback mutation cannot coexist with a legacy Play Style mutation.", [
      conflictingPlayStyle.sourceObjectId,
      `ordinal=${conflictingPlayStyle.sourceIndex}`,
    ]);
  }
  const profileOrdinals = new Set(soundProfileMutations.map((entry) => entry.sourceIndex));
  const conflictingProfileFallback = [
    ...soundPlaybackMutations,
    ...soundPlayStyleMutations,
  ].find((entry) => profileOrdinals.has(entry.sourceIndex));
  if (conflictingProfileFallback) {
    throw invalid(
      "A Sound profile mutation cannot coexist with a playback or legacy Play Style mutation.",
      [
        conflictingProfileFallback.sourceObjectId,
        `ordinal=${conflictingProfileFallback.sourceIndex}`,
      ],
    );
  }
  const tagMutationByOrdinal = new Map(
    propertyMutations.flatMap((mutation) => {
      if (mutation.kind === "store" || mutation.tag === undefined) return [];
      return [[
        sourceOrdinalKey(mutation.kind, mutation.sourceIndex),
        mutation.tag,
      ] as const];
    }),
  );
  const itemTemplateResRefMutationByOrdinal = new Map(
    propertyMutations.flatMap((mutation) => {
      if (mutation.kind !== "item" || mutation.templateResRef === undefined) return [];
      return [[
        sourceOrdinalKey(mutation.kind, mutation.sourceIndex),
        mutation.templateResRef,
      ] as const];
    }),
  );
  for (const { retained, source } of resolvedRetained) {
    const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
    const transform = planSurvivorTransform(
      source.placement,
      retained,
      source.sourceIndex,
      tagMutationByOrdinal.get(sourceKey),
      itemTemplateResRefMutationByOrdinal.get(sourceKey),
    );
    if (transform) transforms.push(transform);
  }

  const deletions = indexed
    .filter((source) => !retainedSourceKeys.has(sourceOrdinalKey(source.kind, source.sourceIndex)))
    .map(({ kind, sourceIndex }) => Object.freeze({ kind, sourceIndex }));
  return Object.freeze({
    deletions: Object.freeze(deletions),
    transforms: Object.freeze(transforms),
    propertyMutations: Object.freeze(propertyMutations),
    doorTransitionMutations: Object.freeze(doorTransitionMutations),
    polygonMutations: Object.freeze(polygonMutations),
    soundIntervalVariationMutations: Object.freeze(soundIntervalVariationMutations),
    soundVolumeMutations: Object.freeze(soundVolumeMutations),
    soundScheduleMutations: Object.freeze(soundScheduleMutations),
    soundActiveMutations: Object.freeze(soundActiveMutations),
    soundPlayOrderMutations: Object.freeze(soundPlayOrderMutations),
    soundPlayStyleMutations: Object.freeze(soundPlayStyleMutations),
    soundPlaybackMutations: Object.freeze(soundPlaybackMutations),
    soundProfileMutations: Object.freeze(soundProfileMutations),
    sourceObjectCount: indexed.length,
    retainedObjectCount: retainedSourceKeys.size,
  });
}

function planSoundProfileMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundProfileMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundProfileMutation[] {
  if (mutations.length > MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound profile mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundProfileMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundProfileMutation(input);
    if (!mutation) {
      throw invalid("A Sound profile mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound profile mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound profile mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound profile mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound profile is mutated more than once.", [mutation.sourceObjectId]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundProfile
      || !areaSoundProfileStoragesEqual(source.placement.soundProfile, mutation.expectedValue)
    ) {
      throw invalid("Sound profile expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundPlaybackMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundPlaybackMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundPlaybackMutation[] {
  if (mutations.length > MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound playback mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundPlaybackMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlaybackMutation(input);
    if (!mutation) {
      throw invalid("A Sound playback mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound playback mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound playback mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound playback mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound playback value is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundPlayback
      || !areaSoundPlaybackStoragesEqual(source.placement.soundPlayback, mutation.expectedValue)
    ) {
      throw invalid("Sound playback expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundPlayStyleMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundPlayStyleMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundPlayStyleMutation[] {
  if (mutations.length > MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound Play Style mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundPlayStyleMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlayStyleMutation(input);
    if (!mutation) {
      throw invalid("A Sound Play Style mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound Play Style mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound Play Style mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound Play Style mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound Play Style value is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundPlayStyle
      || !areaSoundPlayStyleStoragesEqual(source.placement.soundPlayStyle, mutation.expectedValue)
    ) {
      throw invalid("Sound Play Style expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundPlayOrderMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundPlayOrderMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundPlayOrderMutation[] {
  if (mutations.length > MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound Play Order mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundPlayOrderMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlayOrderMutation(input);
    if (!mutation) {
      throw invalid("A Sound Play Order mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound Play Order mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound Play Order mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound Play Order mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound Play Order value is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundPlayOrder
      || !areaSoundPlayOrderStoragesEqual(source.placement.soundPlayOrder, mutation.expectedValue)
    ) {
      throw invalid("Sound Play Order expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundActiveMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundActiveMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundActiveMutation[] {
  if (mutations.length > MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound Active mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundActiveMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundActiveMutation(input);
    if (!mutation) {
      throw invalid("A Sound Active mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound Active mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound Active mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound Active mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound Active value is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundActive
      || !areaSoundActiveStoragesEqual(source.placement.soundActive, mutation.expectedValue)
    ) {
      throw invalid("Sound Active expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundScheduleMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundScheduleMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundScheduleMutation[] {
  if (mutations.length > MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound schedule mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundScheduleMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundScheduleMutation(input);
    if (!mutation) {
      throw invalid("A Sound schedule mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound schedule mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound schedule mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound schedule mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound schedule tuple is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundSchedule
      || !areaSoundScheduleStoragesEqual(source.placement.soundSchedule, mutation.expectedValue)
    ) {
      throw invalid("Sound schedule expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundVolumeMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundVolumeMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundVolumeMutation[] {
  if (mutations.length > MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound base-volume mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundVolumeMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundVolumeMutation(input);
    if (!mutation) {
      throw invalid("A Sound base-volume mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid("A Sound base-volume mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Sound base-volume mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A Sound base-volume mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound base-volume value is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundVolume
      || !areaSoundVolumeStoragesEqual(source.placement.soundVolume, mutation.expectedValue)
    ) {
      throw invalid("Sound base-volume expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planSoundIntervalVariationMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["soundIntervalVariationMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaSoundIntervalVariationMutation[] {
  if (mutations.length > MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained Sound interval/variation mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaSoundIntervalVariationMutation[] = [];
  const seen = new Set<number>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundIntervalVariationMutation(input);
    if (!mutation) {
      throw invalid(
        "A Sound interval/variation mutation requires one complete changed exact CAS pair.",
      );
    }
    const sourceKey = sourceOrdinalKey("sound", mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== "sound") {
      throw invalid(
        "A Sound interval/variation mutation target does not exist in the exact source GIT.",
        [mutation.sourceObjectId, `ordinal=${mutation.sourceIndex}`],
      );
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid(
        "A Sound interval/variation mutation target is not retained in the editable scene.",
        [mutation.sourceObjectId],
      );
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid(
        "A Sound interval/variation mutation source identity differs from the retained object.",
        [mutation.sourceObjectId, `ordinal=${mutation.sourceIndex}`],
      );
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Sound interval/variation tuple is mutated more than once.", [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(source.sourceIndex);
    if (
      !source.placement.soundIntervalVariation
      || !areaSoundIntervalVariationStoragesEqual(
        source.placement.soundIntervalVariation,
        mutation.expectedValue,
      )
    ) {
      throw invalid(
        "Sound interval/variation expected value differs from exact source GIT provenance.",
        [mutation.sourceObjectId, `ordinal=${mutation.sourceIndex}`],
      );
    }
    planned.push(mutation);
  }
  return planned;
}

function planPolygonMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["polygonMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedIdentityByOrdinal: ReadonlyMap<string, string>,
): ExistingAreaObjectPolygonMutation[] {
  if (mutations.length > MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE) {
    throw invalid("Too many retained polygon mutations were requested.", [
      `count=${mutations.length}:max=${MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const planned: ExistingAreaObjectPolygonMutation[] = [];
  const seen = new Set<string>();
  for (const input of mutations) {
    const mutation = readExistingAreaObjectPolygonMutation(input);
    if (!mutation) {
      throw invalid("A polygon mutation requires one complete changed exact CAS pair.");
    }
    const sourceKey = sourceOrdinalKey(mutation.kind, mutation.sourceIndex);
    const source = sourceByOrdinal.get(sourceKey);
    if (!source || source.kind !== mutation.kind) {
      throw invalid("A polygon mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A polygon mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (retainedIdentityByOrdinal.get(sourceKey) !== mutation.sourceObjectId) {
      throw invalid("A polygon mutation source identity differs from the retained object.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    if (seen.has(sourceKey)) {
      throw invalid(`One ${mutation.kind} polygon is mutated more than once.`, [
        mutation.sourceObjectId,
      ]);
    }
    seen.add(sourceKey);
    if (
      !source.placement.polygonGeometry
      || !areaObjectPolygonGeometriesEqual(
        source.placement.polygonGeometry,
        mutation.expectedGeometry,
      )
    ) {
      throw invalid("Polygon expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(mutation);
  }
  return planned;
}

function planDoorTransitionMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["doorTransitionMutations"]>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
): ExistingAreaDoorTransitionStorageMutation[] {
  const planned: ExistingAreaDoorTransitionStorageMutation[] = [];
  const seen = new Set<number>();
  for (const mutation of mutations) {
    if (mutation.kind !== "door" || !Number.isSafeInteger(mutation.sourceIndex) ||
        mutation.sourceIndex < 0) {
      throw invalid("A Door transition mutation requires an immutable Door ordinal.", [
        mutation.sourceObjectId,
      ]);
    }
    const source = sourceByOrdinal.get(sourceOrdinalKey("door", mutation.sourceIndex));
    if (!source || source.kind !== "door") {
      throw invalid("A Door transition mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    const sourceKey = sourceOrdinalKey("door", source.sourceIndex);
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A Door transition mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (seen.has(source.sourceIndex)) {
      throw invalid("One Door transition is mutated more than once.", [mutation.sourceObjectId]);
    }
    seen.add(source.sourceIndex);
    const transition = readExistingAreaDoorTransitionStorageMutation(mutation.transition);
    if (!transition) {
      throw invalid("A Door transition mutation requires one complete changed exact trio pair.", [
        mutation.sourceObjectId,
      ]);
    }
    const parsedStorage = source.placement.doorTransition?.storage;
    if (!parsedStorage || !areaDoorTransitionStorageEqual(parsedStorage, transition.expectedValue)) {
      throw invalid("Door transition expected value differs from exact source GIT provenance.", [
        mutation.sourceObjectId,
        `ordinal=${mutation.sourceIndex}`,
      ]);
    }
    planned.push(Object.freeze({
      kind: "door",
      sourceIndex: source.sourceIndex,
      transition,
    }));
  }
  return planned;
}

function planPropertyMutations(
  mutations: NonNullable<ProjectedAreaObjectEditing["propertyMutations"]>,
  sourceById: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  sourceByOrdinal: ReadonlyMap<string, IndexedAreaObjectSource<ParsedAreaPlacementBlueprint>>,
  retainedSourceKeys: ReadonlySet<string>,
  retainedDiagnosticIds: ReadonlySet<string>,
): ExistingAreaObjectPropertyMutation[] {
  const planned: ExistingAreaObjectPropertyMutation[] = [];
  const seen = new Set<string>();
  for (const mutation of mutations) {
    if (mutation.kind === "waypoint") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => ![
          "kind", "sourceObjectId", "sourceIndex", "tag", "templateResRef", "localizedName", "description",
          "mapNote", "appearance", "variables", "editorComment",
        ].includes(key),
      );
      const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
      const hasTemplateResRef = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "templateResRef",
      );
      const hasLocalizedName = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "localizedName",
      );
      const hasDescription = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "description",
      );
      const hasMapNote = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "mapNote",
      );
      const hasAppearance = Object.prototype.hasOwnProperty.call(rawMutation, "appearance");
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasEditorComment = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "editorComment",
      );
      if (
        unexpected !== undefined ||
        (!hasTag && !hasTemplateResRef && !hasLocalizedName && !hasDescription && !hasMapNote && !hasAppearance &&
          !hasVariables && !hasEditorComment)
      ) {
        throw invalid("A Waypoint property mutation requires exact Tag, TemplateResRef, LocalizedName, Description, MapNote, Appearance, VarTable, and/or Comment CAS.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
        ]);
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("A Waypoint property mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("waypoint", mutation.sourceIndex));
      if (!source) {
        throw invalid("A Waypoint property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "waypoint") {
        throw invalid("A Waypoint property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      planned.push(Object.freeze({
        kind: "waypoint",
        sourceIndex: source.sourceIndex,
        ...(hasTag
          ? {
              tag: planWaypointTagMutation(
                mutation.sourceObjectId,
                source.placement.waypointTag,
                rawMutation.tag,
              ),
            }
          : {}),
        ...(hasTemplateResRef
          ? {
              templateResRef: planWaypointTemplateResRefMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.templateResRef,
              ),
            }
          : {}),
        ...(hasLocalizedName
          ? {
              localizedName: planWaypointLocalizedNameMutation(
                mutation.sourceObjectId,
                source.placement.waypointLocalizedName,
                rawMutation.localizedName,
              ),
            }
          : {}),
        ...(hasDescription
          ? {
              description: planWaypointDescriptionMutation(
                mutation.sourceObjectId,
                source.placement.waypointDescription,
                rawMutation.description,
              ),
            }
          : {}),
        ...(hasMapNote
          ? {
              mapNote: planWaypointMapNoteMutation(
                mutation.sourceObjectId,
                source.placement.waypointMapNote,
                rawMutation.mapNote,
              ),
            }
          : {}),
        ...(hasAppearance
          ? {
              appearance: planWaypointAppearanceMutation(
                mutation.sourceObjectId,
                source.placement.waypointAppearance,
                rawMutation.appearance,
              ),
            }
          : {}),
        ...(hasVariables
          ? {
              variables: planWaypointVariableMutation(
                mutation.sourceObjectId,
                source.placement.waypointVariables,
                rawMutation.variables,
              ),
            }
          : {}),
        ...(hasEditorComment
          ? {
              editorComment: planWaypointEditorCommentMutation(
                mutation.sourceObjectId,
                source.placement.waypointMetadata,
                rawMutation.editorComment,
              ),
            }
          : {}),
      }));
      continue;
    }
    if (mutation.kind === "store") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => ![
          "kind", "sourceObjectId", "sourceIndex", "editorComment", "commerce", "scripts",
          "variables", "restrictions", "inventory",
        ].includes(key),
      );
      const hasEditorComment = Object.prototype.hasOwnProperty.call(rawMutation, "editorComment");
      const hasCommerce = Object.prototype.hasOwnProperty.call(rawMutation, "commerce");
      const hasScripts = Object.prototype.hasOwnProperty.call(rawMutation, "scripts");
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasRestrictions = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "restrictions",
      );
      const hasInventory = Object.prototype.hasOwnProperty.call(rawMutation, "inventory");
      if (unexpected !== undefined ||
        (!hasEditorComment && !hasCommerce && !hasScripts && !hasVariables &&
          !hasRestrictions && !hasInventory)) {
        throw invalid("A Store property mutation requires exact Comment, commerce, script, VarTable, restrictions, and/or inventory CAS.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
        ]);
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("A Store property mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("store", mutation.sourceIndex));
      if (!source) {
        throw invalid("A Store property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "store") {
        throw invalid("A Store property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      planned.push(Object.freeze({
        kind: "store",
        sourceIndex: source.sourceIndex,
        ...(hasEditorComment ? {
          editorComment: planStoreEditorCommentMutation(
            mutation.sourceObjectId,
            source.placement.storeMetadata,
            rawMutation.editorComment,
          ),
        } : {}),
        ...(hasCommerce ? {
          commerce: planStoreCommerceMutation(
            mutation.sourceObjectId,
            source.placement.storeMetadata,
            rawMutation.commerce,
          ),
        } : {}),
        ...(hasScripts ? {
          scripts: planStoreScriptResRefsMutation(
            mutation.sourceObjectId,
            source.placement.storeMetadata,
            rawMutation.scripts,
          ),
        } : {}),
        ...(hasVariables ? {
          variables: planStoreVariableMutation(
            mutation.sourceObjectId,
            source.placement.storeMetadata,
            rawMutation.variables,
          ),
        } : {}),
        ...(hasRestrictions ? {
          restrictions: planStoreRestrictionsMutation(
            mutation.sourceObjectId,
            source.placement.storeRestrictionsRaw,
            rawMutation.restrictions,
          ),
        } : {}),
        ...(hasInventory ? {
          inventory: planStoreInventoryMutation(
            mutation.sourceObjectId,
            source.placement.storeInventoryRaw,
            rawMutation.inventory,
          ),
        } : {}),
      }));
      continue;
    }
    if (mutation.kind === "trigger") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => ![
          "kind",
          "sourceObjectId",
          "sourceIndex",
          "tag",
          "templateResRef",
          "localizedName",
          "editorComment",
          "scripts",
          "transitionStorage",
          "coreProperties",
          "trapProperties",
          "variables",
        ].includes(key),
      );
      const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
      const hasTemplateResRef = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "templateResRef",
      );
      const hasLocalizedName = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "localizedName",
      );
      const hasEditorComment = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "editorComment",
      );
      const hasScripts = Object.prototype.hasOwnProperty.call(rawMutation, "scripts");
      const hasTransitionStorage = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "transitionStorage",
      );
      const hasCoreProperties = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "coreProperties",
      );
      const hasTrapProperties = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "trapProperties",
      );
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      if (
        unexpected !== undefined ||
        (!hasTag && !hasTemplateResRef && !hasLocalizedName && !hasEditorComment &&
          !hasScripts && !hasTransitionStorage && !hasCoreProperties &&
          !hasTrapProperties && !hasVariables)
      ) {
        throw invalid("A Trigger property mutation requires Tag, TemplateResRef, LocalizedName, Comment, scripts, transition-storage, and/or VarTable CAS.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
        ]);
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("A Trigger property mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("trigger", mutation.sourceIndex));
      if (!source) {
        throw invalid("A Trigger property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "trigger") {
        throw invalid("A Trigger property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      planned.push(Object.freeze({
        kind: "trigger",
        sourceIndex: source.sourceIndex,
        ...(hasTag
          ? {
              tag: planTriggerTagMutation(
                mutation.sourceObjectId,
                source.placement.triggerTag,
                rawMutation.tag,
              ),
            }
          : {}),
        ...(hasTemplateResRef
          ? {
              templateResRef: planTriggerTemplateResRefMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.templateResRef,
              ),
            }
          : {}),
        ...(hasLocalizedName
          ? {
              localizedName: planTriggerLocalizedNameMutation(
                mutation.sourceObjectId,
                source.placement.triggerLocalizedName,
                rawMutation.localizedName,
              ),
            }
          : {}),
        ...(hasEditorComment
          ? {
              editorComment: planTriggerEditorCommentMutation(
                mutation.sourceObjectId,
                source.placement.triggerMetadata,
                rawMutation.editorComment,
              ),
            }
          : {}),
        ...(hasScripts
          ? {
              scripts: planTriggerScriptResRefsMutation(
                mutation.sourceObjectId,
                source.placement.triggerScriptResRefs,
                rawMutation.scripts,
              ),
            }
          : {}),
        ...(hasTransitionStorage
          ? {
              transitionStorage: planTriggerTransitionStorageMutation(
                mutation.sourceObjectId,
                source.placement.triggerTransitionStorage,
                rawMutation.transitionStorage,
              ),
            }
          : {}),
        ...(hasCoreProperties
          ? {
              coreProperties: planTriggerCorePropertiesMutation(
                mutation.sourceObjectId,
                source.placement.triggerCoreProperties,
                rawMutation.coreProperties,
              ),
            }
          : {}),
        ...(hasTrapProperties
          ? {
              trapProperties: planTriggerTrapPropertiesMutation(
                mutation.sourceObjectId,
                source.placement.triggerTrapProperties,
                rawMutation.trapProperties,
              ),
            }
          : {}),
        ...(hasVariables
          ? {
              variables: planTriggerVariableMutation(
                mutation.sourceObjectId,
                source.placement.triggerVariables,
                rawMutation.variables,
              ),
            }
          : {}),
      }));
      continue;
    }
    if (mutation.kind === "encounter") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => ![
          "kind",
          "sourceObjectId",
          "sourceIndex",
          "tag",
          "templateResRef",
          "active",
          "playerOnly",
          "reset",
          "resetTime",
          "spawnOption",
          "respawns",
          "creatureCounts",
          "scripts",
          "faction",
          "difficulty",
          "localizedName",
          "variables",
          "creatureList",
          "spawnPoints",
          "editorComment",
        ].includes(key),
      );
      const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
      const hasTemplateResRef = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "templateResRef",
      );
      const hasActive = Object.prototype.hasOwnProperty.call(rawMutation, "active");
      const hasPlayerOnly = Object.prototype.hasOwnProperty.call(rawMutation, "playerOnly");
      const hasReset = Object.prototype.hasOwnProperty.call(rawMutation, "reset");
      const hasResetTime = Object.prototype.hasOwnProperty.call(rawMutation, "resetTime");
      const hasSpawnOption = Object.prototype.hasOwnProperty.call(rawMutation, "spawnOption");
      const hasRespawns = Object.prototype.hasOwnProperty.call(rawMutation, "respawns");
      const hasCreatureCounts = Object.prototype.hasOwnProperty.call(rawMutation, "creatureCounts");
      const hasScripts = Object.prototype.hasOwnProperty.call(rawMutation, "scripts");
      const hasFaction = Object.prototype.hasOwnProperty.call(rawMutation, "faction");
      const hasDifficulty = Object.prototype.hasOwnProperty.call(rawMutation, "difficulty");
      const hasLocalizedName = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "localizedName",
      );
      const hasEditorComment = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "editorComment",
      );
      const hasVariables = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "variables",
      );
      const hasCreatureList = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "creatureList",
      );
      const hasSpawnPoints = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "spawnPoints",
      );
      if (
        unexpected !== undefined
        || (!hasTag && !hasTemplateResRef && !hasActive && !hasPlayerOnly && !hasReset && !hasResetTime && !hasSpawnOption && !hasRespawns && !hasCreatureCounts && !hasScripts && !hasFaction && !hasDifficulty && !hasLocalizedName && !hasVariables && !hasCreatureList && !hasSpawnPoints && !hasEditorComment)
      ) {
        throw invalid(
          "An Encounter property mutation requires SpawnPointList, CreatureList, Comment, LocalizedName, VarTable, Tag, TemplateResRef, Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature-count, script, Faction, and/or Difficulty CAS.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
          ],
        );
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("An Encounter property mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("encounter", mutation.sourceIndex));
      if (!source) {
        throw invalid("An Encounter property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "encounter") {
        throw invalid("An Encounter property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      planned.push(Object.freeze({
        kind: "encounter",
        sourceIndex: source.sourceIndex,
        ...(hasTag
          ? {
              tag: planEncounterTagMutation(
                mutation.sourceObjectId,
                source.placement.encounterTag,
                rawMutation.tag,
              ),
            }
          : {}),
        ...(hasTemplateResRef
          ? {
              templateResRef: planEncounterTemplateResRefMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.templateResRef,
              ),
            }
          : {}),
        ...(hasActive
          ? {
              active: planEncounterActiveMutation(
                mutation.sourceObjectId,
                source.placement.encounterActive,
                rawMutation.active,
              ),
            }
          : {}),
        ...(hasPlayerOnly
          ? {
              playerOnly: planEncounterPlayerOnlyMutation(
                mutation.sourceObjectId,
                source.placement.encounterPlayerOnly,
                rawMutation.playerOnly,
              ),
            }
          : {}),
        ...(hasReset
          ? {
              reset: planEncounterResetMutation(
                mutation.sourceObjectId,
                source.placement.encounterReset,
                rawMutation.reset,
              ),
            }
          : {}),
        ...(hasResetTime
          ? {
              resetTime: planEncounterResetTimeMutation(
                mutation.sourceObjectId,
                source.placement.encounterResetTime,
                rawMutation.resetTime,
              ),
            }
          : {}),
        ...(hasSpawnOption
          ? {
              spawnOption: planEncounterSpawnOptionMutation(
                mutation.sourceObjectId,
                source.placement.encounterSpawnOption,
                rawMutation.spawnOption,
              ),
            }
          : {}),
        ...(hasRespawns
          ? {
              respawns: planEncounterRespawnsMutation(
                mutation.sourceObjectId,
                source.placement.encounterRespawns,
                rawMutation.respawns,
              ),
            }
          : {}),
        ...(hasCreatureCounts
          ? {
              creatureCounts: planEncounterCreatureCountMutation(
                mutation.sourceObjectId,
                source.placement.encounterCreatureCounts,
                rawMutation.creatureCounts,
              ),
            }
          : {}),
        ...(hasScripts
          ? {
              scripts: planEncounterScriptResRefsMutation(
                mutation.sourceObjectId,
                source.placement.encounterScriptResRefs,
                rawMutation.scripts,
              ),
            }
          : {}),
        ...(hasFaction
          ? {
              faction: planEncounterFactionMutation(
                mutation.sourceObjectId,
                source.placement.encounterFaction,
                rawMutation.faction,
              ),
            }
          : {}),
        ...(hasDifficulty
          ? {
              difficulty: planEncounterDifficultyMutation(
                mutation.sourceObjectId,
                source.placement.encounterDifficulty,
                rawMutation.difficulty,
              ),
            }
          : {}),
        ...(hasLocalizedName
          ? {
              localizedName: planEncounterLocalizedNameMutation(
                mutation.sourceObjectId,
                source.placement.encounterLocalizedName,
                rawMutation.localizedName,
              ),
            }
          : {}),
        ...(hasVariables
          ? {
              variables: planEncounterVariableMutation(
                mutation.sourceObjectId,
                source.placement.encounterVariables,
                rawMutation.variables,
              ),
            }
          : {}),
        ...(hasCreatureList
          ? {
              creatureList: planEncounterCreatureListMutation(
                mutation.sourceObjectId,
                source.placement.encounterCreatureList,
                rawMutation.creatureList,
              ),
            }
          : {}),
        ...(hasSpawnPoints
          ? {
              spawnPoints: planEncounterSpawnPointListMutation(
                mutation.sourceObjectId,
                source.placement.encounterSpawnPoints,
                rawMutation.spawnPoints,
              ),
            }
          : {}),
        ...(hasEditorComment
          ? {
              editorComment: planEncounterEditorCommentMutation(
                mutation.sourceObjectId,
                source.placement.encounterMetadata,
                rawMutation.editorComment,
              ),
            }
          : {}),
      }));
      continue;
    }
    if (mutation.kind === "item") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => ![
          "kind",
          "sourceObjectId",
          "sourceIndex",
          "tag",
          "templateResRef",
          "instanceState",
          "editorComment",
          "localizedStrings",
          "variables",
          "propertyList",
          "baseAppearance",
          "inventory",
          "visualTransform",
        ].includes(key),
      );
      const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
      const hasTemplateResRef = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "templateResRef",
      );
      const hasInstanceState = Object.prototype.hasOwnProperty.call(rawMutation, "instanceState");
      const hasEditorComment = Object.prototype.hasOwnProperty.call(rawMutation, "editorComment");
      const hasLocalizedStrings = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "localizedStrings",
      );
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasPropertyList = Object.prototype.hasOwnProperty.call(rawMutation, "propertyList");
      const hasBaseAppearance = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "baseAppearance",
      );
      const hasInventory = Object.prototype.hasOwnProperty.call(rawMutation, "inventory");
      const hasVisualTransform = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "visualTransform",
      );
      if (
        unexpected !== undefined ||
        (!hasTag && !hasTemplateResRef && !hasInstanceState && !hasEditorComment &&
          !hasLocalizedStrings && !hasVariables && !hasPropertyList && !hasBaseAppearance &&
          !hasInventory && !hasVisualTransform)
      ) {
        throw invalid("An Item property mutation requires exact identity, state, and/or editor Comment CAS.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
        ]);
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("An Item property mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("item", mutation.sourceIndex));
      if (!source) {
        throw invalid("An Item property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "item") {
        throw invalid("An Item property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      planned.push(Object.freeze({
        kind: "item",
        sourceIndex: source.sourceIndex,
        ...(hasTag
          ? {
              tag: planItemTagMutation(
                mutation.sourceObjectId,
                source.placement.itemTag,
                rawMutation.tag,
              ),
            }
          : {}),
        ...(hasTemplateResRef
          ? {
              templateResRef: planItemTemplateResRefMutation(
                mutation.sourceObjectId,
                source.placement.itemTemplateResRef,
                rawMutation.templateResRef,
              ),
            }
          : {}),
        ...(hasInstanceState
          ? {
              instanceState: planItemInstanceStateMutation(
                mutation.sourceObjectId,
                source.placement.itemInstanceState,
                rawMutation.instanceState,
              ),
            }
          : {}),
        ...(hasEditorComment
          ? {
              editorComment: planItemEditorCommentMutation(
                mutation.sourceObjectId,
                source.placement.itemMetadata,
                rawMutation.editorComment,
              ),
            }
          : {}),
        ...(hasLocalizedStrings
          ? {
              localizedStrings: planItemLocalizedStringMutations(
                mutation.sourceObjectId,
                source.placement.itemLocalizedStrings,
                rawMutation.localizedStrings,
              ),
            }
          : {}),
        ...(hasVariables
          ? {
              variables: planItemVariableMutation(
                mutation.sourceObjectId,
                source.placement.itemVariables,
                rawMutation.variables,
              ),
            }
          : {}),
        ...(hasPropertyList
          ? {
              propertyList: planItemPropertyListMutation(
                mutation.sourceObjectId,
                source.placement.itemPropertyList,
                rawMutation.propertyList,
              ),
            }
          : {}),
        ...(hasBaseAppearance
          ? {
              baseAppearance: planItemBaseAppearanceMutation(
                mutation.sourceObjectId,
                source.placement.itemBaseAppearanceRaw,
                rawMutation.baseAppearance,
              ),
            }
          : {}),
        ...(hasInventory
          ? {
              inventory: planItemInventoryMutation(
                mutation.sourceObjectId,
                source.placement.itemInventoryItems,
                rawMutation.inventory,
              ),
            }
          : {}),
        ...(hasVisualTransform
          ? {
              visualTransform: planItemVisualTransformMutation(
                mutation.sourceObjectId,
                source.placement.itemVisualTransform,
                rawMutation.visualTransform,
              ),
            }
          : {}),
      }));
      continue;
    }
    if (mutation.kind === "creature") {
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find((key) =>
        ![
          "kind",
          "sourceObjectId",
          "sourceIndex",
          "tag",
          "conversation",
          "interruptable",
          "advancedFlags",
          "bodyBag",
          "decayTime",
          "appearance",
          "gender",
          "perceptionRange",
          "walkRate",
          "soundSetFile",
          "startingPackage",
          "skillList",
          "featList",
          "specialAbilityList",
          "variables",
          "editorComment",
          "classLevels",
          "classIdentity",
          "classSlotResize",
          "classSpellClear",
          "classSpellRemoval",
          "classSpellReorder",
          "classSpellReplacement",
          "phenotype",
          "portrait",
          "challengeRating",
          "abilityScores",
          "appearanceColors",
          "bodyParts",
          "appendages",
          "hitPoints",
          "naturalArmorClass",
          "savingThrowBonuses",
          "alignment",
          "faction",
          "templateResRef",
          "specialIdentityStrings",
          "scripts",
          "localizedStrings",
          "inventory",
          "equipment",
        ].includes(key)
      );
      const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
      const hasConversation = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "conversation",
      );
      const hasInterruptable = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "interruptable",
      );
      const hasAdvancedFlags = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "advancedFlags",
      );
      const hasBodyBag = Object.prototype.hasOwnProperty.call(rawMutation, "bodyBag");
      const hasDecayTime = Object.prototype.hasOwnProperty.call(rawMutation, "decayTime");
      const hasAppearance = Object.prototype.hasOwnProperty.call(rawMutation, "appearance");
      const hasGender = Object.prototype.hasOwnProperty.call(rawMutation, "gender");
      const hasPerceptionRange = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "perceptionRange",
      );
      const hasWalkRate = Object.prototype.hasOwnProperty.call(rawMutation, "walkRate");
      const hasSoundSetFile = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "soundSetFile",
      );
      const hasStartingPackage = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "startingPackage",
      );
      const hasSkillList = Object.prototype.hasOwnProperty.call(rawMutation, "skillList");
      const hasFeatList = Object.prototype.hasOwnProperty.call(rawMutation, "featList");
      const hasSpecialAbilityList = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "specialAbilityList",
      );
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasEditorComment = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "editorComment",
      );
      const hasClassLevels = Object.prototype.hasOwnProperty.call(rawMutation, "classLevels");
      const hasClassIdentity = Object.prototype.hasOwnProperty.call(rawMutation, "classIdentity");
      const hasClassSlotResize = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSlotResize",
      );
      const hasClassSpellClear = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSpellClear",
      );
      const hasClassSpellRemoval = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSpellRemoval",
      );
      const hasClassSpellReorder = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSpellReorder",
      );
      const hasClassSpellReplacement = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSpellReplacement",
      );
      const hasPhenotype = Object.prototype.hasOwnProperty.call(rawMutation, "phenotype");
      const hasPortrait = Object.prototype.hasOwnProperty.call(rawMutation, "portrait");
      const hasChallengeRating = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "challengeRating",
      );
      const hasAbilityScores = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "abilityScores",
      );
      const hasAppearanceColors = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "appearanceColors",
      );
      const hasBodyParts = Object.prototype.hasOwnProperty.call(rawMutation, "bodyParts");
      const hasAppendages = Object.prototype.hasOwnProperty.call(rawMutation, "appendages");
      const hasHitPoints = Object.prototype.hasOwnProperty.call(rawMutation, "hitPoints");
      const hasNaturalArmorClass = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "naturalArmorClass",
      );
      const hasSavingThrowBonuses = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "savingThrowBonuses",
      );
      const hasAlignment = Object.prototype.hasOwnProperty.call(rawMutation, "alignment");
      const hasFaction = Object.prototype.hasOwnProperty.call(rawMutation, "faction");
      const hasTemplateResRef = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "templateResRef",
      );
      const hasSpecialIdentityStrings = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "specialIdentityStrings",
      );
      const hasScripts = Object.prototype.hasOwnProperty.call(rawMutation, "scripts");
      const hasLocalizedStrings = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "localizedStrings",
      );
      const hasInventory = Object.prototype.hasOwnProperty.call(rawMutation, "inventory");
      const hasEquipment = Object.prototype.hasOwnProperty.call(rawMutation, "equipment");
      if (
        unexpected !== undefined ||
        (!hasTag && !hasConversation && !hasInterruptable && !hasAdvancedFlags && !hasBodyBag && !hasDecayTime && !hasAppearance && !hasGender && !hasPerceptionRange && !hasWalkRate && !hasSoundSetFile && !hasStartingPackage && !hasSkillList && !hasFeatList && !hasSpecialAbilityList && !hasVariables && !hasEditorComment && !hasClassLevels && !hasClassIdentity && !hasClassSlotResize && !hasClassSpellClear && !hasClassSpellRemoval && !hasClassSpellReorder && !hasClassSpellReplacement && !hasPhenotype && !hasPortrait && !hasChallengeRating && !hasAbilityScores && !hasAppearanceColors && !hasBodyParts && !hasAppendages && !hasHitPoints && !hasNaturalArmorClass && !hasSavingThrowBonuses && !hasAlignment && !hasFaction && !hasTemplateResRef && !hasSpecialIdentityStrings && !hasScripts && !hasLocalizedStrings &&
          !hasInventory && !hasEquipment)
      ) {
        throw invalid("A Creature property mutation requires an exact Tag, Conversation, Interruptable, advanced flag, BodyBag, DecayTime, Appearance, FactionID, TemplateResRef, Subrace, Deity, script, name, ItemList, or Equip_ItemList pair.", [
          mutation.sourceObjectId,
          `field=${unexpected ?? "missing"}`,
        ]);
      }
      if (hasAppearance && hasPhenotype) {
        throw invalid("Creature Phenotype cannot be changed together with Appearance_Type.", [
          mutation.sourceObjectId,
          "field=Phenotype",
        ]);
      }
      if (hasGender && hasPortrait) {
        throw invalid("Creature PortraitId cannot be changed together with Gender.", [
          mutation.sourceObjectId,
          "field=PortraitId",
        ]);
      }
      if (hasClassIdentity && (hasClassLevels || hasStartingPackage)) {
        throw invalid(
          "Creature class-identity clear owns ClassList and StartingPackage exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=conflict"],
        );
      }
      if (hasClassSlotResize &&
        (hasClassLevels || hasClassIdentity || hasStartingPackage)) {
        throw invalid(
          "Creature class-slot resize owns ClassList and StartingPackage exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=resize_conflict"],
        );
      }
      if (hasClassSpellClear &&
        (hasClassLevels || hasClassIdentity || hasClassSlotResize || hasClassSpellRemoval || hasClassSpellReorder || hasClassSpellReplacement)) {
        throw invalid(
          "Creature class spell-list clear owns ClassList exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=spell_clear_conflict"],
        );
      }
      if (hasClassSpellRemoval &&
        (hasClassLevels || hasClassIdentity || hasClassSlotResize || hasClassSpellClear || hasClassSpellReorder || hasClassSpellReplacement)) {
        throw invalid(
          "Creature class spell-entry removal owns ClassList exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=spell_removal_conflict"],
        );
      }
      if (hasClassSpellReorder &&
        (hasClassLevels || hasClassIdentity || hasClassSlotResize || hasClassSpellClear || hasClassSpellRemoval || hasClassSpellReplacement)) {
        throw invalid(
          "Creature class spell-entry reorder owns ClassList exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=spell_reorder_conflict"],
        );
      }
      if (hasClassSpellReplacement &&
        (hasClassLevels || hasClassIdentity || hasClassSlotResize || hasClassSpellClear || hasClassSpellRemoval || hasClassSpellReorder)) {
        throw invalid(
          "Creature class spell-entry replacement owns ClassList exclusively.",
          [mutation.sourceObjectId, "field=ClassList", "coupling=spell_replacement_conflict"],
        );
      }
      if (!Number.isSafeInteger(mutation.sourceIndex) || mutation.sourceIndex < 0) {
        throw invalid("A Creature ItemList mutation requires an immutable family ordinal.", [
          mutation.sourceObjectId,
          "ordinal missing_or_invalid",
        ]);
      }
      const source = sourceByOrdinal.get(sourceOrdinalKey("creature", mutation.sourceIndex));
      if (!source) {
        throw invalid("A property mutation target does not exist in the exact source GIT.", [
          mutation.sourceObjectId,
          `ordinal=${mutation.sourceIndex}`,
        ]);
      }
      const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
      if (seen.has(sourceKey)) {
        throw invalid("One source object property is mutated more than once.", [
          mutation.sourceObjectId,
        ]);
      }
      seen.add(sourceKey);
      if (!retainedSourceKeys.has(sourceKey) || source.kind !== "creature") {
        throw invalid("A Creature property mutation target is not retained in the editable scene.", [
          mutation.sourceObjectId,
        ]);
      }
      const abilityScores = hasAbilityScores
        ? planCreatureAbilityScoreMutations(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureAbilityScores,
            rawMutation.abilityScores,
          )
        : undefined;
      const appearanceColors = hasAppearanceColors
        ? planCreatureAppearanceColorMutations(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureAppearanceColors,
            rawMutation.appearanceColors,
          )
        : undefined;
      const bodyParts = hasBodyParts
        ? planCreatureBodyPartMutations(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureBodyParts,
            rawMutation.bodyParts,
          )
        : undefined;
      const appendages = hasAppendages
        ? planCreatureAppendageMutations(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureAppendages,
            rawMutation.appendages,
          )
        : undefined;
      const classLevels = hasClassLevels
        ? planCreatureClassLevelMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassLevelState,
            rawMutation.classLevels,
          )
        : undefined;
      const classIdentity = hasClassIdentity
        ? planCreatureClassIdentityMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            source.placement.creatureStartingPackage,
            rawMutation.classIdentity,
          )
        : undefined;
      const classSlotResize = hasClassSlotResize
        ? planCreatureClassSlotResizeMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            source.placement.creatureStartingPackage,
            rawMutation.classSlotResize,
          )
        : undefined;
      const classSpellClear = hasClassSpellClear
        ? planCreatureClassSpellClearMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            rawMutation.classSpellClear,
          )
        : undefined;
      const classSpellRemoval = hasClassSpellRemoval
        ? planCreatureClassSpellRemovalMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            rawMutation.classSpellRemoval,
          )
        : undefined;
      const classSpellReorder = hasClassSpellReorder
        ? planCreatureClassSpellReorderMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            rawMutation.classSpellReorder,
          )
        : undefined;
      const classSpellReplacement = hasClassSpellReplacement
        ? planCreatureClassSpellReplacementMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureClassIdentityState,
            rawMutation.classSpellReplacement,
          )
        : undefined;
      const classLevelTarget = classLevels ??
        (classIdentity?.levels.some(
          (level, index) => level !== classIdentity.expectedLevels[index],
        ) ? classIdentity : undefined) ?? classSlotResize;
      const featList = hasFeatList
        ? planCreatureFeatListMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureFeatList,
            rawMutation.featList,
          )
        : undefined;
      const specialAbilityList = hasSpecialAbilityList
        ? planCreatureSpecialAbilityListMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureSpecialAbilityList,
            rawMutation.specialAbilityList,
          )
        : undefined;
      const hitPoints = hasHitPoints
        ? planCreatureHitPointMutation(
            mutation.sourceObjectId,
            source.sourceIndex,
            source.placement.creatureHitPointState,
            rawMutation.hitPoints,
          )
        : undefined;
      if (featList && featList.row40Transition !== "unchanged" && !hitPoints) {
        throw invalid(
          "A Creature FeatList row-40 transition requires the coupled hit-point mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "FeatList hp_coupling_missing"],
        );
      }
      if (featList && featList.row40Transition !== "unchanged" &&
        (hitPoints?.featRow40Present !== featList.expectedFeatIds.includes(40) ||
          hitPoints.targetFeatRow40Present !== featList.featIds.includes(40))) {
        throw invalid(
          "Creature FeatList and hit-point feat-row-40 states must be coupled.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "FeatList hp_coupling_mismatch"],
        );
      }
      if (hitPoints?.targetFeatRow40Present !== undefined &&
        (!featList || featList.row40Transition === "unchanged")) {
        throw invalid(
          "A Creature hit-point feat-row-40 transition requires the matching FeatList mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "hitPoints feat_coupling_missing"],
        );
      }
      const constitutionMutation = abilityScores?.constitution;
      if (constitutionMutation && !hitPoints) {
        throw invalid(
          "A Creature Constitution mutation requires the coupled hit-point mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "Con coupling_missing"],
        );
      }
      if (classLevelTarget && !hitPoints) {
        throw invalid(
          "A Creature class-level mutation requires the coupled hit-point mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "ClassList hp_coupling_missing"],
        );
      }
      if (classLevelTarget && (!hitPoints?.targetClassLevels ||
        hitPoints.targetClassLevels.length !== classLevelTarget.levels.length ||
        hitPoints.targetClassLevels.some(
          (level, index) => level !== classLevelTarget.levels[index],
        ))) {
        throw invalid(
          "Creature ClassList and hit-point target levels must be coupled.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "ClassList hp_coupling_mismatch"],
        );
      }
      if (hitPoints?.targetClassLevels && !classLevelTarget) {
        throw invalid(
          "Creature hit-point target levels require the matching ClassList mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "hitPoints class_coupling_missing"],
        );
      }
      if (hitPoints && hitPoints.constitution !== hitPoints.expectedConstitution &&
        (!constitutionMutation ||
          constitutionMutation.expectedValue !== hitPoints.expectedConstitution ||
          constitutionMutation.value !== hitPoints.constitution)) {
        throw invalid(
          "A Creature hit-point Constitution change requires the matching base-score mutation.",
          [mutation.sourceObjectId, `ordinal=${source.sourceIndex}`, "Con coupling_mismatch"],
        );
      }
      planned.push(Object.freeze({
        kind: "creature",
        sourceIndex: source.sourceIndex,
        ...(hasTag
          ? {
              tag: planCreatureTagMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureTag,
                mutation.tag,
              ),
            }
          : {}),
        ...(hasConversation
          ? {
              conversation: planCreatureConversationMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureConversation,
                rawMutation.conversation,
              ),
            }
          : {}),
        ...(hasInterruptable
          ? {
              interruptable: planCreatureInterruptableMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureInterruptable,
                rawMutation.interruptable,
              ),
            }
          : {}),
        ...(hasAdvancedFlags
          ? {
              advancedFlags: planCreatureAdvancedFlagMutations(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureAdvancedFlags,
                rawMutation.advancedFlags,
              ),
            }
          : {}),
        ...(hasBodyBag
          ? {
              bodyBag: planCreatureBodyBagMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureBodyBag,
                rawMutation.bodyBag,
              ),
            }
          : {}),
        ...(hasDecayTime
          ? {
              decayTime: planCreatureDecayTimeMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureDecayTime,
                rawMutation.decayTime,
              ),
            }
          : {}),
        ...(hasAppearance
          ? {
              appearance: planCreatureAppearanceMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureAppearance,
                rawMutation.appearance,
              ),
            }
          : {}),
        ...(hasGender
          ? {
              gender: planCreatureGenderMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureGender,
                rawMutation.gender,
              ),
            }
          : {}),
        ...(hasPerceptionRange
          ? {
              perceptionRange: planCreaturePerceptionRangeMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creaturePerceptionRange,
                rawMutation.perceptionRange,
              ),
            }
          : {}),
        ...(hasWalkRate
          ? {
              walkRate: planCreatureWalkRateMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureWalkRate,
                rawMutation.walkRate,
              ),
            }
          : {}),
        ...(hasSoundSetFile
          ? {
              soundSetFile: planCreatureSoundSetFileMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureSoundSetFile,
                rawMutation.soundSetFile,
              ),
            }
          : {}),
        ...(hasStartingPackage
          ? {
              startingPackage: planCreatureStartingPackageMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureStartingPackage,
                rawMutation.startingPackage,
              ),
            }
          : {}),
        ...(hasSkillList
          ? {
              skillList: planCreatureSkillListMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureSkillList,
                rawMutation.skillList,
              ),
            }
          : {}),
        ...(featList ? { featList } : {}),
        ...(specialAbilityList ? { specialAbilityList } : {}),
        ...(hasVariables
          ? {
              variables: planCreatureVariableMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.variables,
              ),
            }
          : {}),
        ...(hasEditorComment
          ? {
              editorComment: planCreatureEditorCommentMutation(
                mutation.sourceObjectId,
                source.placement.creatureMetadata,
                rawMutation.editorComment,
              ),
            }
          : {}),
        ...(classLevels ? { classLevels } : {}),
        ...(classIdentity ? { classIdentity } : {}),
        ...(classSlotResize ? { classSlotResize } : {}),
        ...(classSpellClear ? { classSpellClear } : {}),
        ...(classSpellRemoval ? { classSpellRemoval } : {}),
        ...(classSpellReorder ? { classSpellReorder } : {}),
        ...(classSpellReplacement ? { classSpellReplacement } : {}),
        ...(hasPhenotype
          ? {
              phenotype: planCreaturePhenotypeMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creaturePhenotype,
                source.placement.creatureAppearance,
                rawMutation.phenotype,
              ),
            }
          : {}),
        ...(hasPortrait
          ? {
              portrait: planCreaturePortraitMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creaturePortrait,
                rawMutation.portrait,
              ),
            }
          : {}),
        ...(hasChallengeRating
          ? {
              challengeRating: planCreatureChallengeRatingMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureChallengeRating,
                rawMutation.challengeRating,
              ),
            }
          : {}),
        ...(abilityScores ? { abilityScores } : {}),
        ...(appearanceColors ? { appearanceColors } : {}),
        ...(bodyParts ? { bodyParts } : {}),
        ...(appendages ? { appendages } : {}),
        ...(hitPoints ? { hitPoints } : {}),
        ...(hasNaturalArmorClass
          ? {
              naturalArmorClass: planCreatureNaturalArmorClassMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureNaturalArmorClass,
                rawMutation.naturalArmorClass,
              ),
            }
          : {}),
        ...(hasSavingThrowBonuses
          ? {
              savingThrowBonuses: planCreatureSavingThrowBonusMutations(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureSavingThrowBonuses,
                rawMutation.savingThrowBonuses,
              ),
            }
          : {}),
        ...(hasAlignment
          ? {
              alignment: planCreatureAlignmentMutation(
                mutation.sourceObjectId,
                source.sourceIndex,
                source.placement.creatureAlignment,
                rawMutation.alignment,
              ),
            }
          : {}),
        ...(hasFaction
          ? {
              faction: planCreatureFactionMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.faction,
              ),
            }
          : {}),
        ...(hasTemplateResRef
          ? {
              templateResRef: planCreatureTemplateResRefMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.templateResRef,
              ),
            }
          : {}),
        ...(hasSpecialIdentityStrings
          ? {
              specialIdentityStrings: planCreatureSpecialIdentityStringsMutation(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.specialIdentityStrings,
              ),
            }
          : {}),
        ...(hasScripts
          ? {
              scripts: planCreatureScriptResRefMutations(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.scripts,
              ),
            }
          : {}),
        ...(hasLocalizedStrings
          ? {
              localizedStrings: planCreatureNameLocalizedStringMutations(
                mutation.sourceObjectId,
                source.placement,
                rawMutation.localizedStrings,
              ),
            }
          : {}),
        ...(hasInventory
          ? {
              inventory: planCreatureInventoryMutation(
                mutation.sourceObjectId,
                source.placement.creatureMetadata,
                mutation.inventory,
              ),
            }
          : {}),
        ...(hasEquipment
          ? {
              equipment: planCreatureEquipmentMutation(
                mutation.sourceObjectId,
                source.placement.creatureMetadata,
                mutation.equipment,
              ),
            }
          : {}),
      }));
      continue;
    }
    if (mutation.kind !== "placeable") {
      throw invalid("An existing object property mutation identifies an unsupported family.", [
        `kind=${String((mutation as Readonly<{ kind: unknown }>).kind)}`,
      ]);
    }
    const hasTag = Object.prototype.hasOwnProperty.call(mutation, "tag");
    if (hasTag && mutation.sourceIndex === undefined) {
      throw invalid("A Placeable Tag mutation requires an immutable family ordinal.", [
        mutation.sourceObjectId,
        "ordinal missing",
      ]);
    }
    if (mutation.sourceIndex === undefined && !retainedDiagnosticIds.has(mutation.sourceObjectId)) {
      throw invalid("A property mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    const source = mutation.sourceIndex !== undefined
      ? sourceByOrdinal.get(sourceOrdinalKey("placeable", mutation.sourceIndex))
      : sourceById.get(mutation.sourceObjectId);
    if (!source) {
      throw invalid("A property mutation target does not exist in the exact source GIT.", [
        mutation.sourceObjectId,
        ...(mutation.sourceIndex !== undefined ? [`ordinal=${mutation.sourceIndex}`] : []),
      ]);
    }
    const sourceKey = sourceOrdinalKey(source.kind, source.sourceIndex);
    if (seen.has(sourceKey)) {
      throw invalid("One source object property is mutated more than once.", [mutation.sourceObjectId]);
    }
    seen.add(sourceKey);
    if (!retainedSourceKeys.has(sourceKey)) {
      throw invalid("A property mutation target is not retained in the editable scene.", [
        mutation.sourceObjectId,
      ]);
    }
    if (source.kind !== "placeable") {
      throw invalid("A placeable property mutation identifies another GIT family.", [
        mutation.sourceObjectId,
      ]);
    }
    const hasOnUsed = mutation.expectedOnUsed !== undefined || mutation.onUsed !== undefined;
    const hasStatic = mutation.expectedStatic !== undefined || mutation.static !== undefined;
    const hasUseable = mutation.expectedUseable !== undefined || mutation.useable !== undefined;
    const hasPlot = mutation.expectedPlot !== undefined || mutation.plot !== undefined;
    const hasHasInventory =
      mutation.expectedHasInventory !== undefined || mutation.hasInventory !== undefined;
    const hasScripts = mutation.scripts !== undefined;
    const hasTrapScripts = mutation.trapScripts !== undefined;
    const hasLockFields = mutation.lockFields !== undefined;
    const hasKeyName = mutation.keyName !== undefined;
    const hasInventory = Object.prototype.hasOwnProperty.call(mutation, "inventory");
    const hasBasicByteFields = Object.prototype.hasOwnProperty.call(mutation, "basicByteFields");
    const hasConversation = Object.prototype.hasOwnProperty.call(mutation, "conversation");
    const hasInterruptable = Object.prototype.hasOwnProperty.call(mutation, "interruptable");
    const hasAnimationState = Object.prototype.hasOwnProperty.call(mutation, "animationState");
    const hasTrapFields = Object.prototype.hasOwnProperty.call(mutation, "trapFields");
    const hasEditorComment = Object.prototype.hasOwnProperty.call(mutation, "editorComment");
    const hasAppearance = Object.prototype.hasOwnProperty.call(mutation, "appearance");
    const hasTrapType = Object.prototype.hasOwnProperty.call(mutation, "trapType");
    const hasBodyBag = Object.prototype.hasOwnProperty.call(mutation, "bodyBag");
    const hasPortrait = Object.prototype.hasOwnProperty.call(mutation, "portrait");
    const hasFaction = Object.prototype.hasOwnProperty.call(mutation, "faction");
    const hasVariables = Object.prototype.hasOwnProperty.call(mutation, "variables");
    const hasTemplateResRef = Object.prototype.hasOwnProperty.call(mutation, "templateResRef");
    const hasHitPoints = Object.prototype.hasOwnProperty.call(mutation, "hitPoints");
    const hasLocalizedStrings = Object.prototype.hasOwnProperty.call(mutation, "localizedStrings");
    if (hasLocalizedStrings && mutation.sourceIndex === undefined) {
      throw invalid("A Placeable localized-string mutation requires an immutable family ordinal.", [
        mutation.sourceObjectId,
        "ordinal missing",
      ]);
    }
    if (
      !hasOnUsed &&
      !hasStatic &&
      !hasUseable &&
      !hasPlot &&
      !hasHasInventory &&
      !hasScripts &&
      !hasTrapScripts &&
      !hasLockFields &&
      !hasKeyName &&
      !hasInventory &&
      !hasBasicByteFields &&
      !hasConversation &&
      !hasInterruptable &&
      !hasAnimationState &&
      !hasTrapFields &&
      !hasEditorComment &&
      !hasAppearance &&
      !hasTrapType &&
      !hasBodyBag &&
      !hasPortrait &&
      !hasFaction &&
      !hasVariables &&
      !hasTemplateResRef &&
      !hasHitPoints &&
      !hasLocalizedStrings &&
      !hasTag
    ) {
      throw invalid("A placeable property mutation must contain at least one supported field pair.", [
        mutation.sourceObjectId,
      ]);
    }
    const projected: ExistingAreaObjectPropertyMutation & Readonly<{
      basicByteFields?: readonly ExistingAreaPlaceableBasicByteMutation[];
      conversation?: ExistingAreaPlaceableConversationMutation;
      interruptable?: ExistingAreaPlaceableInterruptableMutation;
      animationState?: ExistingAreaPlaceableAnimationStateMutation;
      trapFields?: readonly ExistingAreaPlaceableTrapByteMutation[];
      editorComment?: ExistingAreaPlaceableEditorCommentMutation;
      appearance?: ExistingAreaPlaceableAppearanceMutation;
      trapType?: ExistingAreaPlaceableTrapTypeMutation;
      bodyBag?: ExistingAreaPlaceableBodyBagMutation;
      portrait?: ExistingAreaPlaceablePortraitMutation;
      faction?: ExistingAreaPlaceableFactionMutation;
      variables?: ExistingAreaPlaceableVariableMutation;
      templateResRef?: ExistingAreaPlaceableTemplateResRefMutation;
      hitPoints?: ExistingAreaPlaceableHitPointMutation;
      localizedStrings?: readonly ExistingAreaPlaceableLocalizedStringMutation[];
      tag?: ExistingAreaPlaceableTagMutation;
    }> = {
      kind: "placeable",
      sourceIndex: source.sourceIndex,
      ...(hasTag
        ? {
            tag: planPlaceableTagMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.tag,
            ),
          }
        : {}),
      ...(hasOnUsed
        ? planStringPropertyPair(
            mutation.sourceObjectId,
            "OnUsed",
            source.placement.placeableMetadata?.["script.onUsed"],
            mutation.expectedOnUsed,
            mutation.onUsed,
          )
        : {}),
      ...(hasStatic
        ? planBooleanPropertyPair(
            mutation.sourceObjectId,
            "Static",
            source.placement.placeableMetadata?.static,
            mutation.expectedStatic,
            mutation.static,
            "expectedStatic",
            "static",
          )
        : {}),
      ...(hasUseable
        ? planBooleanPropertyPair(
            mutation.sourceObjectId,
            "Useable",
            source.placement.placeableMetadata?.useable,
            mutation.expectedUseable,
            mutation.useable,
            "expectedUseable",
            "useable",
          )
        : {}),
      ...(hasPlot
        ? planBooleanPropertyPair(
            mutation.sourceObjectId,
            "Plot",
            source.placement.placeableMetadata?.plot,
            mutation.expectedPlot,
            mutation.plot,
            "expectedPlot",
            "plot",
          )
        : {}),
      ...(hasHasInventory
        ? planBooleanPropertyPair(
            mutation.sourceObjectId,
            "HasInventory",
            source.placement.placeableMetadata?.hasInventory,
            mutation.expectedHasInventory,
            mutation.hasInventory,
            "expectedHasInventory",
            "hasInventory",
          )
        : {}),
      ...(hasScripts
        ? {
            scripts: planPlaceableScriptMutations(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.scripts,
            ),
          }
        : {}),
      ...(hasTrapScripts
        ? {
            trapScripts: planPlaceableTrapScriptMutations(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.trapScripts,
            ),
          }
        : {}),
      ...(hasLockFields
        ? {
            lockFields: planPlaceableLockMutations(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.lockFields,
            ),
          }
        : {}),
      ...(hasKeyName
        ? {
            keyName: planPlaceableKeyNameMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.keyName,
            ),
          }
        : {}),
      ...(hasInventory
        ? {
            inventory: planPlaceableInventoryMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.inventory,
            ),
          }
        : {}),
      ...(hasBasicByteFields
        ? {
            basicByteFields: planPlaceableBasicByteMutations(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.basicByteFields,
            ),
          }
        : {}),
      ...(hasConversation
        ? {
            conversation: planPlaceableConversationMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.conversation,
            ),
          }
        : {}),
      ...(hasInterruptable
        ? {
            interruptable: planPlaceableInterruptableMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.interruptable,
            ),
          }
        : {}),
      ...(hasAnimationState
        ? {
            animationState: planPlaceableAnimationStateMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.animationState,
            ),
          }
        : {}),
      ...(hasTrapFields
        ? {
            trapFields: planPlaceableTrapByteMutations(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.trapFields,
            ),
          }
        : {}),
      ...(hasEditorComment
        ? {
            editorComment: planPlaceableEditorCommentMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.editorComment,
            ),
          }
        : {}),
      ...(hasAppearance
        ? {
            appearance: planPlaceableAppearanceMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.appearance,
            ),
          }
        : {}),
      ...(hasTrapType
        ? {
            trapType: planPlaceableTrapTypeMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.trapType,
            ),
          }
        : {}),
      ...(hasBodyBag
        ? {
            bodyBag: planPlaceableBodyBagMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.bodyBag,
            ),
          }
        : {}),
      ...(hasPortrait
        ? {
            portrait: planPlaceablePortraitMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.portrait,
            ),
          }
        : {}),
      ...(hasFaction
        ? {
            faction: planPlaceableFactionMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.faction,
            ),
          }
        : {}),
      ...(hasVariables
        ? {
            variables: planPlaceableVariableMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.variables,
            ),
          }
        : {}),
      ...(hasTemplateResRef
        ? {
            templateResRef: planPlaceableTemplateResRefMutation(
              mutation.sourceObjectId,
              source.placement,
              mutation.templateResRef,
            ),
          }
        : {}),
      ...(hasHitPoints
        ? {
            hitPoints: planPlaceableHitPointMutation(
              mutation.sourceObjectId,
              source.placement.placeableMetadata,
              mutation.hitPoints,
            ),
          }
        : {}),
      ...(hasLocalizedStrings
        ? {
            localizedStrings: planPlaceableLocalizedStringMutations(
              mutation.sourceObjectId,
              source.placement,
              mutation.localizedStrings,
            ),
          }
        : {}),
    };
    planned.push(Object.freeze(projected));
  }
  return planned;
}

function planCreatureTagMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureTagStorage | undefined,
  input: unknown,
): ExistingAreaCreatureTagMutation {
  const mutation = readExistingAreaCreatureTagMutation(input);
  if (!mutation) {
    throw invalid("Creature Tag mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readExistingAreaCreatureTagStorage(storage);
  if (!source?.present) {
    throw invalid("Creature Tag mutation requires one exact present native Tag.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  if (mutation.expectedValue !== source.value) {
    throw invalid("Creature Tag expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  return mutation;
}

function planCreatureConversationMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureConversationStorage | undefined,
  input: unknown,
): ExistingAreaCreatureConversationMutation {
  const mutation = readExistingAreaCreatureConversationMutation(input);
  if (!mutation) {
    throw invalid("Creature Conversation mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readExistingAreaCreatureConversationStorage(storage);
  if (!source?.present) {
    throw invalid("Creature Conversation mutation requires one exact present native ResRef.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  if (mutation.expectedResRef !== source.value) {
    throw invalid("Creature Conversation expected ResRef differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  return mutation;
}

function planCreatureInterruptableMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureInterruptableStorage | undefined,
  input: unknown,
): ExistingAreaCreatureInterruptableMutation {
  const mutation = readExistingAreaCreatureInterruptableMutation(input);
  if (!mutation) {
    throw invalid("Creature Interruptable mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readAreaCreatureInterruptableStorage(storage);
  if (!source?.present) {
    throw invalid("Creature Interruptable mutation requires one exact present native Byte.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  if (mutation.expectedValue !== source.value) {
    throw invalid("Creature Interruptable expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  return mutation;
}

function planCreatureAdvancedFlagMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAdvancedFlagsStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAdvancedFlagMutations {
  const mutations = readExistingAreaCreatureAdvancedFlagMutations(input);
  if (!mutations) {
    throw invalid("Creature advanced flag mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readAreaCreatureAdvancedFlagsStorage(storage);
  for (const mapping of AREA_CREATURE_ADVANCED_FLAG_FIELDS) {
    const mutation = mutations[mapping.key];
    if (!mutation) continue;
    const sourceField = source?.[mapping.key];
    if (!sourceField?.present) {
      throw invalid("Creature advanced flag mutation requires one exact present native Byte.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `field=${mapping.nativeLabel}`,
      ]);
    }
    if (mutation.expectedValue !== sourceField.value) {
      throw invalid("Creature advanced flag expected value differs from exact source GIT.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `field=${mapping.nativeLabel}`,
      ]);
    }
  }
  return mutations;
}

function planCreatureBodyBagMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureBodyBagStorage | undefined,
  input: unknown,
): ExistingAreaCreatureBodyBagMutation {
  const mutation = readExistingAreaCreatureBodyBagMutation(input);
  if (!mutation) {
    throw invalid("Creature BodyBag mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readAreaCreatureBodyBagStorage(storage);
  if (!source?.present) {
    throw invalid("Creature BodyBag mutation requires one exact present native Byte.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "field=BodyBag",
    ]);
  }
  if (mutation.expectedValue !== source.value) {
    throw invalid("Creature BodyBag expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "field=BodyBag",
    ]);
  }
  return mutation;
}

function planCreatureDecayTimeMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureDecayTimeStorage | undefined,
  input: unknown,
): ExistingAreaCreatureDecayTimeMutation {
  const mutation = readExistingAreaCreatureDecayTimeMutation(input);
  if (!mutation) {
    throw invalid("Creature DecayTime mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
    ]);
  }
  const source = readAreaCreatureDecayTimeStorage(storage);
  if (!source?.present) {
    throw invalid("Creature DecayTime mutation requires one exact present native DWord.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "field=DecayTime",
    ]);
  }
  if (mutation.expectedMilliseconds !== source.valueMilliseconds) {
    throw invalid("Creature DecayTime expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "field=DecayTime",
    ]);
  }
  return mutation;
}

function planCreatureAppearanceMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAppearanceStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAppearanceMutation {
  const mutation = readExistingAreaCreatureAppearanceMutation(input);
  if (!mutation) {
    throw invalid("Creature Appearance mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Appearance_Type invalid_pair",
    ]);
  }
  const source = readAreaCreatureAppearanceStorage(storage);
  if (!source?.present || source.nativeType !== "word") {
    throw invalid(
      "Creature Appearance mutation requires one exact present native Appearance_Type Word.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "Appearance_Type missing_canonical_word"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature Appearance expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Appearance_Type stale_source",
    ]);
  }
  return mutation;
}

function planCreatureGenderMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureGenderStorage | undefined,
  input: unknown,
): ExistingAreaCreatureGenderMutation {
  const mutation = readExistingAreaCreatureGenderMutation(input);
  if (!mutation) {
    throw invalid("Creature Gender mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Gender invalid_pair",
    ]);
  }
  const source = readAreaCreatureGenderStorage(storage);
  if (!source?.present || source.nativeType !== "byte") {
    throw invalid(
      "Creature Gender mutation requires one exact present native Gender Byte.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "Gender missing_canonical_byte"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature Gender expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Gender stale_source",
    ]);
  }
  return mutation;
}

function planCreaturePerceptionRangeMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreaturePerceptionRangeStorage | undefined,
  input: unknown,
): ExistingAreaCreaturePerceptionRangeMutation {
  const mutation = readExistingAreaCreaturePerceptionRangeMutation(input);
  if (!mutation) {
    throw invalid("Creature PerceptionRange mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "PerceptionRange invalid_pair",
    ]);
  }
  const source = readAreaCreaturePerceptionRangeStorage(storage);
  if (!source?.present || source.nativeType !== "byte") {
    throw invalid(
      "Creature PerceptionRange mutation requires one exact present native Byte.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "PerceptionRange missing_canonical_byte"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature PerceptionRange expected source differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "PerceptionRange stale_source",
    ]);
  }
  return mutation;
}

function planCreatureWalkRateMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureWalkRateStorage | undefined,
  input: unknown,
): ExistingAreaCreatureWalkRateMutation {
  const mutation = readExistingAreaCreatureWalkRateMutation(input);
  if (!mutation) {
    throw invalid("Creature WalkRate mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "WalkRate invalid_pair",
    ]);
  }
  const source = readAreaCreatureWalkRateStorage(storage);
  if (!source?.present || source.nativeType !== "int") {
    throw invalid(
      "Creature WalkRate mutation requires one exact present native Int.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "WalkRate missing_canonical_int"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature WalkRate expected source differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "WalkRate stale_source",
    ]);
  }
  return mutation;
}

function planCreatureSoundSetFileMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureSoundSetFileStorage | undefined,
  input: unknown,
): ExistingAreaCreatureSoundSetFileMutation {
  const mutation = readExistingAreaCreatureSoundSetFileMutation(input);
  if (!mutation) {
    throw invalid("Creature SoundSetFile mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SoundSetFile invalid_pair",
    ]);
  }
  const source = readAreaCreatureSoundSetFileStorage(storage);
  if (!source?.present || source.nativeType !== "word") {
    throw invalid(
      "Creature SoundSetFile mutation requires one exact present native Word.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "SoundSetFile missing_canonical_word"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature SoundSetFile expected source differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SoundSetFile stale_source",
    ]);
  }
  return mutation;
}

function planCreatureStartingPackageMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureStartingPackageStorage | undefined,
  input: unknown,
): ExistingAreaCreatureStartingPackageMutation {
  const mutation = readExistingAreaCreatureStartingPackageMutation(input);
  if (!mutation) {
    throw invalid("Creature StartingPackage mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "StartingPackage invalid_pair",
    ]);
  }
  const source = readAreaCreatureStartingPackageStorage(storage);
  if (!source?.present || source.nativeType !== "byte" || !source.classIds) {
    throw invalid(
      "Creature StartingPackage mutation requires one exact present native Byte and ClassList.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "StartingPackage missing_canonical_context"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature StartingPackage expected source differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "StartingPackage stale_source",
    ]);
  }
  if (source.classIds.length !== mutation.expectedClassIds.length ||
    source.classIds.some((classId, index) => classId !== mutation.expectedClassIds[index])) {
    throw invalid("Creature StartingPackage ClassList differs from retained provenance.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "StartingPackage stale_class_list",
    ]);
  }
  return mutation;
}

function planCreatureSkillListMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureSkillListStorage | undefined,
  input: unknown,
): ExistingAreaCreatureSkillListMutation {
  const mutation = readExistingAreaCreatureSkillListMutation(input);
  if (!mutation) {
    throw invalid("Creature SkillList mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SkillList invalid_pair",
    ]);
  }
  const source = readAreaCreatureSkillListStorage(storage);
  if (!source?.present || source.nativeType !== "list") {
    throw invalid("Creature SkillList mutation requires one exact canonical List.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SkillList missing_canonical_context",
    ]);
  }
  if (source.ranks.length !== mutation.expectedRanks.length ||
    source.ranks.some((rank, index) => rank !== mutation.expectedRanks[index])) {
    throw invalid("Creature SkillList expected vector differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SkillList stale_source_vector",
    ]);
  }
  return mutation;
}

function planCreatureFeatListMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureFeatListStorage | undefined,
  input: unknown,
): ExistingAreaCreatureFeatListMutation {
  const mutation = readExistingAreaCreatureFeatListMutation(input);
  if (!mutation) {
    throw invalid("Creature FeatList mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "FeatList invalid_pair",
    ]);
  }
  const source = readAreaCreatureFeatListStorage(storage);
  if (!source?.present || source.nativeType !== "list" || !source.table ||
    source.opaqueSiblingFieldCounts.some((count) => count !== 0) ||
    new Set(source.featIds).size !== source.featIds.length) {
    throw invalid("Creature FeatList mutation requires one exact canonical List.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "FeatList missing_canonical_context",
    ]);
  }
  if (source.featIds.length !== mutation.expectedFeatIds.length ||
    source.featIds.some((featId, index) => featId !== mutation.expectedFeatIds[index]) ||
    source.opaqueSiblingFieldCounts.length !== mutation.opaqueSiblingFieldCounts.length ||
    source.opaqueSiblingFieldCounts.some(
      (count, index) => count !== mutation.opaqueSiblingFieldCounts[index],
    )) {
    throw invalid("Creature FeatList expected vector differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "FeatList stale_source_vector",
    ]);
  }
  if (source.table.sha256 !== mutation.tableSha256 ||
    source.table.rowCount !== mutation.rowCount) {
    throw invalid("Creature FeatList effective feat.2da differs from retained provenance.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "FeatList stale_table",
    ]);
  }
  return mutation;
}

function planCreatureSpecialAbilityListMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureSpecialAbilityListStorage | undefined,
  input: unknown,
): ExistingAreaCreatureSpecialAbilityListMutation {
  const mutation = readExistingAreaCreatureSpecialAbilityListMutation(input);
  if (!mutation) {
    throw invalid("Creature SpecAbilityList mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SpecAbilityList invalid_pair",
    ]);
  }
  const source = readAreaCreatureSpecialAbilityListStorage(storage);
  const profile = source?.present
    ? groupCanonicalCreatureSpecialAbilityEntries(source.entries)
    : null;
  if (!source?.present || source.nativeType !== "list" || !profile) {
    throw invalid("Creature SpecAbilityList mutation requires one canonical List.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SpecAbilityList missing_canonical_context",
    ]);
  }
  if (profile.length !== mutation.expectedEntries.length ||
    profile.some((entry, index) => entry.spellId !== mutation.expectedEntries[index]?.spellId ||
      entry.uses !== mutation.expectedEntries[index]?.uses ||
      entry.casterLevel !== mutation.expectedEntries[index]?.casterLevel)) {
    throw invalid("Creature SpecAbilityList expected profile differs from exact GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "SpecAbilityList stale_source_profile",
    ]);
  }
  return mutation;
}

function planCreatureClassLevelMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassLevelState | undefined,
  input: unknown,
): ExistingAreaCreatureClassLevelMutation {
  const mutation = readExistingAreaCreatureClassLevelMutation(input);
  if (!mutation) {
    throw invalid("Creature ClassList level mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_level_target",
    ]);
  }
  const source = readAreaCreatureClassLevelState(storage);
  if (!source?.present) {
    throw invalid("Creature class-level mutation requires one exact canonical ClassList.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList missing_canonical_context",
    ]);
  }
  if (source.entries.length !== mutation.expectedClassIds.length ||
    source.entries.some((entry, index) =>
      entry.classId !== mutation.expectedClassIds[index] ||
      entry.level !== mutation.expectedLevels[index] ||
      entry.opaqueSiblingFieldCount !== mutation.opaqueSiblingFieldCounts[index])) {
    throw invalid("Creature ClassList expected roster differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_roster",
    ]);
  }
  return mutation;
}

function planCreatureClassIdentityMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  startingPackageStorage: AreaCreatureStartingPackageStorage | undefined,
  input: unknown,
): ExistingAreaCreatureClassIdentityMutation {
  const mutation = readExistingAreaCreatureClassIdentityMutation(input);
  if (!mutation) {
    throw invalid("Creature class-identity clear mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_identity_clear",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  const startingPackage = readAreaCreatureStartingPackageStorage(startingPackageStorage);
  if (!source?.present || !startingPackage?.present || !startingPackage.classIds) {
    throw invalid(
      "Creature class-identity clear requires exact bound ClassList and StartingPackage provenance.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "ClassList missing_canonical_context"],
    );
  }
  const sourceIds = source.entries.map((entry) => entry.classId);
  const sourceLevels = source.entries.map((entry) => entry.level);
  if (mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== sourceIds.length ||
    mutation.expectedClassIds.some((classId, index) => classId !== sourceIds[index]) ||
    mutation.expectedLevels.length !== sourceLevels.length ||
    mutation.expectedLevels.some((level, index) => level !== sourceLevels[index])) {
    throw invalid("Creature class-identity source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_graph",
    ]);
  }
  if (startingPackage.classIds.length !== sourceIds.length ||
    startingPackage.classIds.some((classId, index) => classId !== sourceIds[index]) ||
    startingPackage.value !== mutation.expectedStartingPackage) {
    throw invalid("Creature class-identity StartingPackage source is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "StartingPackage stale_source",
    ]);
  }
  if (source.classesTable && (
    source.classesTable.sha256 !== mutation.classesTableSha256 ||
    source.classesTable.rowCount !== mutation.classesRowCount
  ) || startingPackage.table && (
    startingPackage.table.sha256 !== mutation.packagesTableSha256 ||
    startingPackage.table.rowCount !== mutation.packagesRowCount
  )) {
    throw invalid("Creature class-identity table provenance is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_table",
    ]);
  }
  return mutation;
}

function planCreatureClassSpellClearMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  input: unknown,
): ExistingAreaCreatureClassSpellClearMutation {
  const mutation = readExistingAreaCreatureClassSpellClearMutation(input);
  if (!mutation) {
    throw invalid("Creature class spell-list clear mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_spell_clear",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  if (!source?.present ||
    mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== source.entries.length ||
    mutation.expectedClassIds.some((classId, index) =>
      classId !== source.entries[index]!.classId) ||
    mutation.expectedLevels.some((level, index) =>
      level !== source.entries[index]!.level)) {
    throw invalid("Creature class spell-list clear source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_spell_clear_graph",
    ]);
  }
  if (mutation.classSlotIndices.some((slotIndex) =>
    source.entries[slotIndex]!.canonicalSpellListFieldCount === 0)) {
    throw invalid("Creature class spell-list clear target contains no canonical spell lists.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList empty_spell_clear_target",
    ]);
  }
  return mutation;
}

function planCreatureClassSpellRemovalMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  input: unknown,
): ExistingAreaCreatureClassSpellRemovalMutation {
  const mutation = readExistingAreaCreatureClassSpellRemovalMutation(input);
  if (!mutation) {
    throw invalid("Creature class spell-entry removal mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_spell_removal",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  if (!source?.present || source.entries.some((entry) => !entry.spellLists) ||
    mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== source.entries.length ||
    mutation.expectedClassIds.some((classId, index) =>
      classId !== source.entries[index]!.classId) ||
    mutation.expectedLevels.some((level, index) =>
      level !== source.entries[index]!.level)) {
    throw invalid("Creature class spell-entry removal source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_spell_removal_graph",
    ]);
  }
  for (const target of mutation.targets) {
    const list = source.entries[target.classSlotIndex]!.spellLists!.find((candidate) =>
      candidate.listKind === target.listKind && candidate.spellLevel === target.spellLevel);
    if (!list || target.entryIndex >= list.entries.length) {
      throw invalid("Creature class spell-entry removal target is absent.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        "ClassList absent_spell_removal_target",
      ]);
    }
  }
  return mutation;
}

function planCreatureClassSpellReorderMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  input: unknown,
): ExistingAreaCreatureClassSpellReorderMutation {
  const mutation = readExistingAreaCreatureClassSpellReorderMutation(input);
  if (!mutation) {
    throw invalid("Creature class spell-entry reorder mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_spell_reorder",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  if (!source?.present || source.entries.some((entry) => !entry.spellLists) ||
    mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== source.entries.length ||
    mutation.expectedClassIds.some((classId, index) =>
      classId !== source.entries[index]!.classId) ||
    mutation.expectedLevels.some((level, index) =>
      level !== source.entries[index]!.level)) {
    throw invalid("Creature class spell-entry reorder source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_spell_reorder_graph",
    ]);
  }
  for (const target of mutation.reorders) {
    const list = source.entries[target.classSlotIndex]!.spellLists!.find((candidate) =>
      candidate.listKind === target.listKind && candidate.spellLevel === target.spellLevel);
    if (!list || list.entries.length < 2 ||
      target.entryOrder.length !== list.entries.length) {
      throw invalid("Creature class spell-entry reorder target is absent or stale.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        "ClassList absent_spell_reorder_target",
      ]);
    }
  }
  return mutation;
}

function planCreatureClassSpellReplacementMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  input: unknown,
): ExistingAreaCreatureClassSpellReplacementMutation {
  const mutation = readExistingAreaCreatureClassSpellReplacementMutation(input);
  if (!mutation) {
    throw invalid("Creature class spell-entry replacement mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_spell_replacement",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  if (!source?.present || source.entries.some((entry) => !entry.spellLists) ||
    mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== source.entries.length ||
    mutation.expectedClassIds.some((classId, index) =>
      classId !== source.entries[index]!.classId) ||
    mutation.expectedLevels.some((level, index) =>
      level !== source.entries[index]!.level)) {
    throw invalid("Creature class spell-entry replacement source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_spell_replacement_graph",
    ]);
  }
  for (const replacement of mutation.replacements) {
    const list = source.entries[replacement.classSlotIndex]!.spellLists!.find((candidate) =>
      candidate.listKind === replacement.listKind &&
      candidate.spellLevel === replacement.spellLevel);
    const entry = list?.entries[replacement.entryIndex];
    if (!entry || entry.spellId !== replacement.expectedSpellId ||
      entry.spellMetaMagic !== 0) {
      throw invalid("Creature class spell-entry replacement target is absent or stale.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        "ClassList absent_spell_replacement_target",
      ]);
    }
  }
  return mutation;
}

function planCreatureClassSlotResizeMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureClassIdentityState | undefined,
  startingPackageStorage: AreaCreatureStartingPackageStorage | undefined,
  input: unknown,
): ExistingAreaCreatureClassSlotResizeMutation {
  const mutation = readExistingAreaCreatureClassSlotResizeMutation(input);
  if (!mutation) {
    throw invalid("Creature class-slot resize mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList invalid_slot_resize",
    ]);
  }
  const source = readAreaCreatureClassIdentityState(storage);
  const startingPackage = readAreaCreatureStartingPackageStorage(startingPackageStorage);
  if (!source?.present || !startingPackage?.present || !startingPackage.classIds) {
    throw invalid(
      "Creature class-slot resize requires exact bound ClassList and StartingPackage provenance.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "ClassList missing_resize_context"],
    );
  }
  const sourceIds = source.entries.map((entry) => entry.classId);
  const sourceLevels = source.entries.map((entry) => entry.level);
  if (mutation.classListGraphSha256 !== source.classListGraphSha256 ||
    mutation.expectedClassIds.length !== sourceIds.length ||
    mutation.expectedClassIds.some((classId, index) => classId !== sourceIds[index]) ||
    mutation.expectedLevels.length !== sourceLevels.length ||
    mutation.expectedLevels.some((level, index) => level !== sourceLevels[index])) {
    throw invalid("Creature class-slot resize source graph is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_resize_graph",
    ]);
  }
  if (startingPackage.classIds.length !== sourceIds.length ||
    startingPackage.classIds.some((classId, index) => classId !== sourceIds[index]) ||
    startingPackage.value !== mutation.expectedStartingPackage) {
    throw invalid("Creature class-slot resize StartingPackage source is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "StartingPackage stale_resize_source",
    ]);
  }
  if (source.classesTable && (
    source.classesTable.sha256 !== mutation.classesTableSha256 ||
    source.classesTable.rowCount !== mutation.classesRowCount
  ) || startingPackage.table && (
    startingPackage.table.sha256 !== mutation.packagesTableSha256 ||
    startingPackage.table.rowCount !== mutation.packagesRowCount
  )) {
    throw invalid("Creature class-slot resize table provenance is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ClassList stale_resize_table",
    ]);
  }
  return mutation;
}

function planCreaturePhenotypeMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreaturePhenotypeStorage | undefined,
  appearanceStorage: AreaCreatureAppearanceStorage | undefined,
  input: unknown,
): ExistingAreaCreaturePhenotypeMutation {
  const mutation = readExistingAreaCreaturePhenotypeMutation(input);
  if (!mutation) {
    throw invalid("Creature Phenotype mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Phenotype invalid_pair",
    ]);
  }
  const source = readAreaCreaturePhenotypeStorage(storage);
  if (!source?.present || source.nativeType !== "int" || !source.table) {
    throw invalid(
      "Creature Phenotype mutation requires one catalog-bound native Phenotype Int.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "Phenotype missing_canonical_int"],
    );
  }
  const appearance = readAreaCreatureAppearanceStorage(appearanceStorage);
  if (!appearance?.present || appearance.nativeType !== "word" || !appearance.table) {
    throw invalid(
      "Creature Phenotype mutation requires catalog-bound Appearance_Type Word provenance.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "Appearance_Type missing_canonical_word"],
    );
  }
  if (
    source.value !== mutation.expectedValue ||
    source.table.sha256 !== mutation.tableSha256 ||
    source.table.rowCount !== mutation.rowCount
  ) {
    throw invalid("Creature Phenotype expected value or table differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Phenotype stale_source",
    ]);
  }
  if (
    appearance.value !== mutation.appearanceExpectedValue ||
    appearance.table.sha256 !== mutation.appearanceTableSha256 ||
    appearance.table.rowCount !== mutation.appearanceRowCount
  ) {
    throw invalid("Creature Phenotype appearance gate differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "Appearance_Type stale_source",
    ]);
  }
  return mutation;
}

function planCreaturePortraitMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreaturePortraitStorage | undefined,
  input: unknown,
): ExistingAreaCreaturePortraitMutation {
  const mutation = readExistingAreaCreaturePortraitMutation(input);
  if (!mutation) {
    throw invalid("Creature PortraitId mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "PortraitId invalid_pair",
    ]);
  }
  const source = readAreaCreaturePortraitStorage(storage);
  if (!source?.present || source.nativeType !== "word" || !source.selectorContext) {
    throw invalid(
      "Creature PortraitId mutation requires one context-bound canonical native Word.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "PortraitId missing_canonical_word"],
    );
  }
  if (source.value !== mutation.expectedValue ||
    source.selectorContext.genderValue !== mutation.genderExpectedValue ||
    source.selectorContext.raceValue !== mutation.raceExpectedValue) {
    throw invalid("Creature PortraitId source or selector context is stale.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "PortraitId stale_source",
    ]);
  }
  return mutation;
}

function planCreatureChallengeRatingMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureChallengeRatingStorage | undefined,
  input: unknown,
): ExistingAreaCreatureChallengeRatingMutation {
  const mutation = readExistingAreaCreatureChallengeRatingMutation(input);
  if (!mutation) {
    throw invalid("Creature ChallengeRating mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ChallengeRating invalid_pair",
    ]);
  }
  const source = readAreaCreatureChallengeRatingStorage(storage);
  if (!source?.present || source.nativeType !== "float") {
    throw invalid(
      "Creature ChallengeRating mutation requires one exact present native Float.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "ChallengeRating missing_canonical_float"],
    );
  }
  if (!Object.is(source.value, mutation.expectedValue)) {
    throw invalid("Creature ChallengeRating expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "ChallengeRating stale_source",
    ]);
  }
  return mutation;
}

function planCreatureAbilityScoreMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAbilityScoresStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAbilityScoreMutations {
  const mutations = readExistingAreaCreatureAbilityScoreMutations(input);
  if (!mutations) {
    throw invalid("Creature base ability-score mutation group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "abilityScores invalid_pairs",
    ]);
  }
  const source = readAreaCreatureAbilityScoresStorage(storage);
  if (!source) {
    throw invalid("Creature base ability-score source group is not exact.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "abilityScores invalid_source_group",
    ]);
  }
  for (const [key, mutation] of Object.entries(mutations)) {
    const actual = source[key as keyof AreaCreatureAbilityScoresStorage];
    if (!actual.present || actual.nativeType !== "byte") {
      throw invalid("Creature base ability-score mutation requires one exact present native Byte.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} missing_canonical_byte`,
      ]);
    }
    if (actual.value !== mutation!.expectedValue) {
      throw invalid("Creature base ability-score expected value differs from exact source GIT.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} stale_source`,
      ]);
    }
  }
  return mutations;
}

function planCreatureAppearanceColorMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAppearanceColorsStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAppearanceColorMutations {
  const mutations = readExistingAreaCreatureAppearanceColorMutations(input);
  if (!mutations) {
    throw invalid("Creature appearance-color mutation group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "appearanceColors invalid_pairs",
    ]);
  }
  const source = readAreaCreatureAppearanceColorsStorage(storage);
  if (!source) {
    throw invalid("Creature appearance-color source group is not exact.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "appearanceColors invalid_source_group",
    ]);
  }
  for (const [key, mutation] of Object.entries(mutations)) {
    const actual = source[key as keyof AreaCreatureAppearanceColorsStorage];
    if (!actual.present || actual.nativeType !== "byte") {
      throw invalid(
        "Creature appearance-color mutation requires one exact present native Byte.",
        [sourceObjectId, `ordinal=${sourceIndex}`, `${key} missing_canonical_byte`],
      );
    }
    if (actual.value !== mutation!.expectedValue) {
      throw invalid(
        "Creature appearance-color expected value differs from exact source GIT.",
        [sourceObjectId, `ordinal=${sourceIndex}`, `${key} stale_source`],
      );
    }
  }
  return mutations;
}

function planCreatureBodyPartMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureBodyPartsStorage | undefined,
  input: unknown,
): ExistingAreaCreatureBodyPartMutations {
  const mutations = readExistingAreaCreatureBodyPartMutations(input);
  if (!mutations) {
    throw invalid("Creature body-part mutation group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "bodyParts invalid_pairs",
    ]);
  }
  const source = readAreaCreatureBodyPartsStorage(storage);
  if (!source) {
    throw invalid("Creature body-part source group is not exact.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "bodyParts invalid_source_group",
    ]);
  }
  for (const [key, mutation] of Object.entries(mutations)) {
    const actual = source[key as keyof AreaCreatureBodyPartsStorage];
    const maximum = maximumAreaCreatureBodyPartTarget(actual);
    if (!actual.present || maximum === null) {
      throw invalid("Creature body-part mutation requires exact present native storage.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} missing_compatible_storage`,
      ]);
    }
    if (actual.value !== mutation!.expectedValue) {
      throw invalid("Creature body-part expected value differs from exact source GIT.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} stale_source`,
      ]);
    }
    if (mutation!.value > maximum) {
      throw invalid("Creature body-part target exceeds retained native capacity.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} maximum=${maximum}`,
      ]);
    }
  }
  return mutations;
}

function planCreatureAppendageMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAppendagesStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAppendageMutations {
  const mutations = readExistingAreaCreatureAppendageMutations(input);
  if (!mutations) {
    throw invalid("Creature appendage mutation group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "appendages invalid_pairs",
    ]);
  }
  const source = readAreaCreatureAppendagesStorage(storage);
  if (!source) {
    throw invalid("Creature appendage source group is not exact.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "appendages invalid_source_group",
    ]);
  }
  for (const [key, mutation] of Object.entries(mutations)) {
    const member = source[key as keyof AreaCreatureAppendagesStorage];
    if (!member.present || !member.modernDword.present) {
      throw invalid("Creature appendage mutation requires one exact modern DWord.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} missing_modern_dword`,
      ]);
    }
    if (member.value !== mutation!.expectedValue) {
      throw invalid("Creature appendage mutation differs from retained provenance.", [
        sourceObjectId,
        `ordinal=${sourceIndex}`,
        `${key} stale_source`,
      ]);
    }
  }
  return mutations;
}

function planCreatureHitPointMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureHitPointState | undefined,
  input: unknown,
): ExistingAreaCreatureHitPointMutation {
  const mutation = readExistingAreaCreatureHitPointMutation(input);
  if (!mutation) {
    throw invalid("Creature coupled hit-point mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "hitPoints invalid_coupled_values",
    ]);
  }
  const source = readAreaCreatureHitPointState(storage);
  if (!source?.present) {
    throw invalid("Creature hit-point mutation requires exact present source provenance.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "hitPoints missing_exact_source",
    ]);
  }
  if (source.hitPoints.value !== mutation.expectedHitPoints ||
    source.currentHitPoints.value !== mutation.expectedCurrentHitPoints ||
    source.maxHitPoints.value !== mutation.expectedMaxHitPoints) {
    throw invalid("Creature hit-point expected triplet differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "hitPoints stale_triplet",
    ]);
  }
  if (source.constitution.value !== mutation.expectedConstitution ||
    source.race.value !== mutation.race ||
    source.featRow40Present !== mutation.featRow40Present ||
    source.classLevels.length !== mutation.classLevels.length ||
    source.classLevels.some((level, index) => level !== mutation.classLevels[index])) {
    throw invalid("Creature hit-point dependencies differ from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "hitPoints stale_dependencies",
    ]);
  }
  return mutation;
}

function planCreatureNaturalArmorClassMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureNaturalArmorClassStorage | undefined,
  input: unknown,
): ExistingAreaCreatureNaturalArmorClassMutation {
  const mutation = readExistingAreaCreatureNaturalArmorClassMutation(input);
  if (!mutation) {
    throw invalid("Creature NaturalAC mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "NaturalAC invalid_pair",
    ]);
  }
  const source = readAreaCreatureNaturalArmorClassStorage(storage);
  if (!source?.present || source.nativeType !== "byte") {
    throw invalid(
      "Creature NaturalAC mutation requires one exact present native Byte.",
      [sourceObjectId, `ordinal=${sourceIndex}`, "NaturalAC missing_canonical_byte"],
    );
  }
  if (source.value !== mutation.expectedValue) {
    throw invalid("Creature NaturalAC expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "NaturalAC stale_source",
    ]);
  }
  return mutation;
}

function planCreatureSavingThrowBonusMutations(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureSavingThrowBonusesStorage | undefined,
  input: unknown,
): ExistingAreaCreatureSavingThrowBonusMutations {
  const mutations = readExistingAreaCreatureSavingThrowBonusMutations(input);
  if (!mutations) {
    throw invalid("Creature saving-throw bonus mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "savingThrowBonuses invalid_pair",
    ]);
  }
  const source = readAreaCreatureSavingThrowBonusesStorage(storage);
  if (!source) {
    throw invalid("Creature saving-throw bonus source group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "savingThrowBonuses invalid_source_group",
    ]);
  }
  for (const [key, mutation] of Object.entries(mutations)) {
    const actual = source[key as keyof AreaCreatureSavingThrowBonusesStorage];
    if (!actual.present || actual.nativeType !== "short") {
      throw invalid(
        "Creature saving-throw bonus mutation requires one exact present native Short.",
        [sourceObjectId, `ordinal=${sourceIndex}`, `${key} missing_canonical_short`],
      );
    }
    if (actual.value !== mutation!.expectedValue) {
      throw invalid(
        "Creature saving-throw bonus expected value differs from exact source GIT.",
        [sourceObjectId, `ordinal=${sourceIndex}`, `${key} stale_source`],
      );
    }
  }
  return mutations;
}

function planCreatureAlignmentMutation(
  sourceObjectId: string,
  sourceIndex: number,
  storage: AreaCreatureAlignmentStorage | undefined,
  input: unknown,
): ExistingAreaCreatureAlignmentMutation {
  const mutation = readExistingAreaCreatureAlignmentMutation(input);
  if (!mutation) {
    throw invalid("Creature alignment mutation is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "alignment invalid_pair",
    ]);
  }
  const source = readAreaCreatureAlignmentStorage(storage);
  if (!source) {
    throw invalid("Creature alignment source group is invalid.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "alignment invalid_source_group",
    ]);
  }
  if (
    !source.goodEvil.present ||
    source.goodEvil.nativeType !== "byte" ||
    !source.lawfulChaotic.present ||
    source.lawfulChaotic.nativeType !== "byte"
  ) {
    throw invalid("Creature alignment mutation requires two exact present native Bytes.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "alignment missing_canonical_bytes",
    ]);
  }
  if (
    source.goodEvil.value !== mutation.expectedGoodEvil ||
    source.lawfulChaotic.value !== mutation.expectedLawfulChaotic
  ) {
    throw invalid("Creature alignment expected value differs from exact source GIT.", [
      sourceObjectId,
      `ordinal=${sourceIndex}`,
      "alignment stale_source",
    ]);
  }
  return mutation;
}

function planCreatureNameLocalizedStringMutations(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): readonly ExistingAreaCreatureNameLocalizedStringMutation[] {
  const mutations = readExistingAreaCreatureNameLocalizedStringMutations(input);
  if (!mutations) {
    throw invalid("A Creature name localized-string mutation list is invalid.", [
      sourceObjectId,
      "localizedStrings invalid_pair",
    ]);
  }
  const source = placement.creatureLocalizedStrings;
  for (const mutation of mutations) {
    const mapping = AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS.find(
      (candidate) => candidate.field === mutation.field,
    )!;
    if (mutation.expectedEntries && mutation.expectedProfile) {
      const actualStorage = source
        ? readEditableAreaCreatureLocalizedStringStorage(
            source[mapping.sourceKey],
            mapping.maxBytes,
          )
        : undefined;
      if (!actualStorage) {
        throw invalid("The exact source Creature localized string is outside the admitted profile.", [
          sourceObjectId,
          `${mutation.field} unsupported_source`,
        ]);
      }
      if (
        actualStorage.value !== mutation.expectedValue ||
        actualStorage.profile !== mutation.expectedProfile ||
        !areaCreatureLocalizedStringEntriesEqual(
          actualStorage.entries,
          mutation.expectedEntries,
        )
      ) {
        throw invalid("The exact source Creature localized string differs from immutable provenance.", [
          sourceObjectId,
          `${mutation.field} stale_source`,
        ]);
      }
      continue;
    }
    const actual = source
      ? readAreaCreatureNameInlineAsciiStorage(source[mapping.sourceKey], mapping.maxBytes)
      : undefined;
    if (actual === undefined) {
      throw invalid("The exact source Creature name is outside the admitted profile.", [
        sourceObjectId,
        `${mutation.field} unsupported_source`,
      ]);
    }
    if (actual !== mutation.expectedValue) {
      throw invalid("The exact source Creature name differs from immutable provenance.", [
        sourceObjectId,
        `${mutation.field} stale_source`,
      ]);
    }
  }
  return mutations;
}

function planPlaceableLocalizedStringMutations(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): readonly ExistingAreaPlaceableLocalizedStringMutation[] {
  const mutations = readExistingAreaPlaceableLocalizedStringMutations(input);
  if (!mutations) {
    throw invalid("A Placeable localized-string mutation list is invalid.", [
      sourceObjectId,
      "localizedStrings invalid_pair",
    ]);
  }
  const source = placement.placeableLocalizedStrings;
  for (const mutation of mutations) {
    const mapping = AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS.find(
      (candidate) => candidate.field === mutation.field,
    )!;
    if (mutation.expectedEntries && mutation.expectedProfile) {
      const actualStorage = source
        ? readEditableAreaPlaceableLocalizedStringStorage(
            source[mapping.sourceKey],
            mapping.maxBytes,
          )
        : undefined;
      if (!actualStorage) {
        throw invalid("The exact source Placeable localized string is outside the admitted profile.", [
          sourceObjectId,
          `${mutation.field} unsupported_source`,
        ]);
      }
      if (
        actualStorage.value !== mutation.expectedValue ||
        actualStorage.profile !== mutation.expectedProfile ||
        !areaPlaceableLocalizedStringEntriesEqual(
          actualStorage.entries,
          mutation.expectedEntries,
        )
      ) {
        throw invalid("The exact source Placeable localized string differs from immutable provenance.", [
          sourceObjectId,
          `${mutation.field} stale_source`,
        ]);
      }
      continue;
    }
    const actual = source
      ? readAreaPlaceableInlineAsciiStorage(source[mapping.sourceKey], mapping.maxBytes)
      : undefined;
    if (actual === undefined) {
      throw invalid("The exact source Placeable localized string is outside the admitted profile.", [
        sourceObjectId,
        `${mutation.field} unsupported_source`,
      ]);
    }
    if (actual !== mutation.expectedValue) {
      throw invalid("The exact source Placeable localized string differs from immutable provenance.", [
        sourceObjectId,
        `${mutation.field} expected=${mutation.expectedValue} actual=${actual}`,
      ]);
    }
  }
  return mutations;
}

function planPlaceableTagMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableTagMutation {
  const mutation = readExistingAreaPlaceableTagMutation(input);
  if (!mutation) {
    throw invalid("A Placeable Tag mutation pair is invalid.", [sourceObjectId, "Tag invalid_pair"]);
  }
  const nativeTag = placement.placeableBasicIdentity?.tag;
  if (nativeTag?.present !== true) {
    throw invalid("The exact source Placeable lacks one canonical Tag CExoString.", [
      sourceObjectId,
      "Tag missing",
    ]);
  }
  if (nativeTag.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable Tag differs from immutable provenance.", [
      sourceObjectId,
      `Tag expected=${mutation.expectedValue} actual=${nativeTag.value}`,
    ]);
  }
  return mutation;
}

function planPlaceableHitPointMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableHitPointMutation {
  const mutation = readExistingAreaPlaceableHitPointMutation(input);
  if (!mutation) {
    throw invalid("A Placeable HP / CurrentHP mutation pair is invalid.", [
      sourceObjectId,
      "HP invalid_pair",
    ]);
  }
  const actualHitPoints = metadata?.hitPoints;
  const actualCurrentHitPoints = metadata?.currentHitPoints;
  if (!isEditableAreaPlaceableHitPoints(actualHitPoints) || !isAuroraShort(actualCurrentHitPoints)) {
    throw invalid("The exact source Placeable lacks one canonical HP / CurrentHP Short pair.", [
      sourceObjectId,
      "HP missing",
    ]);
  }
  if (actualHitPoints !== mutation.expectedHitPoints) {
    throw invalid("The exact source Placeable HP differs from immutable provenance.", [
      sourceObjectId,
      `HP expected=${mutation.expectedHitPoints} actual=${actualHitPoints}`,
    ]);
  }
  if (actualCurrentHitPoints !== mutation.expectedCurrentHitPoints) {
    throw invalid("The exact source Placeable CurrentHP differs from immutable provenance.", [
      sourceObjectId,
      `CurrentHP expected=${mutation.expectedCurrentHitPoints} actual=${actualCurrentHitPoints}`,
    ]);
  }
  return mutation;
}

function planPlaceableAppearanceMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableAppearanceMutation {
  const mutation = readExistingAreaPlaceableAppearanceMutation(input);
  if (!mutation) {
    throw invalid("A Placeable Appearance mutation pair is invalid.", [
      sourceObjectId,
      "Appearance invalid_pair",
    ]);
  }
  const actualAppearance = placement.placeableBasicIdentity?.appearance;
  if (!actualAppearance?.present || actualAppearance.nativeType !== "dword") {
    throw invalid("The exact source Placeable lacks one canonical Appearance DWord.", [
      sourceObjectId,
      "Appearance missing_canonical_dword",
    ]);
  }
  if (actualAppearance.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable Appearance differs from immutable provenance.", [
      sourceObjectId,
      `Appearance expected=${mutation.expectedValue} actual=${actualAppearance.value}`,
    ]);
  }
  return mutation;
}

function planPlaceableTrapTypeMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableTrapTypeMutation {
  const mutation = readExistingAreaPlaceableTrapTypeMutation(input);
  if (!mutation) {
    throw invalid("A Placeable TrapType mutation pair is invalid.", [
      sourceObjectId,
      "TrapType invalid_pair",
    ]);
  }
  const actualTrapType = placement.placeableTrapType;
  if (actualTrapType?.present !== true) {
    throw invalid("The exact source Placeable lacks one canonical TrapType Byte.", [
      sourceObjectId,
      "TrapType missing_canonical_byte",
    ]);
  }
  if (actualTrapType.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable TrapType differs from immutable provenance.", [
      sourceObjectId,
      `TrapType expected=${mutation.expectedValue} actual=${actualTrapType.value}`,
    ]);
  }
  return mutation;
}

function planPlaceableBodyBagMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableBodyBagMutation {
  const mutation = readExistingAreaPlaceableBodyBagMutation(input);
  if (!mutation) {
    throw invalid("A Placeable BodyBag mutation pair is invalid.", [
      sourceObjectId,
      "BodyBag invalid_pair",
    ]);
  }
  const actualBodyBag = placement.placeableBodyBag;
  if (actualBodyBag?.present !== true) {
    throw invalid("The exact source Placeable lacks one canonical BodyBag Byte.", [
      sourceObjectId,
      "BodyBag missing_canonical_byte",
    ]);
  }
  if (actualBodyBag.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable BodyBag differs from immutable provenance.", [
      sourceObjectId,
      `BodyBag expected=${mutation.expectedValue} actual=${actualBodyBag.value}`,
    ]);
  }
  return mutation;
}

function planPlaceablePortraitMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceablePortraitMutation {
  const mutation = readExistingAreaPlaceablePortraitMutation(input);
  if (!mutation) {
    throw invalid("A Placeable PortraitId mutation pair is invalid.", [
      sourceObjectId,
      "PortraitId invalid_pair",
    ]);
  }
  const actualPortrait = placement.placeablePortraitId;
  if (actualPortrait?.present !== true) {
    throw invalid("The exact source Placeable lacks one canonical PortraitId Word.", [
      sourceObjectId,
      "PortraitId missing_canonical_word",
    ]);
  }
  if (actualPortrait.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable PortraitId differs from immutable provenance.", [
      sourceObjectId,
      `PortraitId expected=${mutation.expectedValue} actual=${actualPortrait.value}`,
    ]);
  }
  return mutation;
}

function planPlaceableFactionMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableFactionMutation {
  const mutation = readExistingAreaPlaceableFactionMutation(input);
  if (!mutation) {
    throw invalid("A Placeable Faction mutation pair is invalid.", [
      sourceObjectId,
      "Faction invalid_pair",
    ]);
  }
  const actualFaction = placement.placeableFaction;
  if (actualFaction?.present !== true) {
    throw invalid("The exact source Placeable lacks one canonical Faction DWord.", [
      sourceObjectId,
      "Faction missing_canonical_dword",
    ]);
  }
  if (actualFaction.value !== mutation.expectedValue) {
    throw invalid("The exact source Placeable Faction differs from immutable provenance.", [
      sourceObjectId,
      `Faction expected=${mutation.expectedValue} actual=${actualFaction.value}`,
    ]);
  }
  return mutation;
}

function planCreatureFactionMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaCreatureFactionMutation {
  const mutation = readExistingAreaCreatureFactionMutation(input);
  if (!mutation) {
    throw invalid("A Creature FactionID mutation pair is invalid.", [
      sourceObjectId,
      "FactionID invalid_pair",
    ]);
  }
  const actualFaction = placement.creatureFaction;
  if (actualFaction?.present !== true) {
    throw invalid("The exact source Creature lacks one canonical FactionID Word.", [
      sourceObjectId,
      "FactionID missing_canonical_word",
    ]);
  }
  if (actualFaction.value !== mutation.expectedValue) {
    throw invalid("The exact source Creature FactionID differs from immutable provenance.", [
      sourceObjectId,
      `FactionID expected=${mutation.expectedValue} actual=${actualFaction.value}`,
    ]);
  }
  return mutation;
}

function planCreatureTemplateResRefMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaCreatureTemplateResRefMutation {
  const mutation = readExistingAreaCreatureTemplateResRefMutation(input);
  if (!mutation) {
    throw invalid("A Creature TemplateResRef mutation pair is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid_pair",
    ]);
  }
  const actualTemplateResRef = placement.creatureTemplateResRef;
  if (actualTemplateResRef?.present !== true) {
    throw invalid("The exact source Creature lacks one canonical TemplateResRef ResRef.", [
      sourceObjectId,
      "TemplateResRef missing_canonical_resref",
    ]);
  }
  if (actualTemplateResRef.value !== mutation.expectedResRef) {
    throw invalid("The exact source Creature TemplateResRef differs from immutable provenance.", [
      sourceObjectId,
      `TemplateResRef expected=${mutation.expectedResRef} actual=${actualTemplateResRef.value}`,
    ]);
  }
  return mutation;
}

function planCreatureSpecialIdentityStringsMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaCreatureSpecialIdentityStringsMutation {
  const mutation = readExistingAreaCreatureSpecialIdentityStringsMutation(input);
  if (!mutation) {
    throw invalid("A Creature Subrace/Deity mutation pair is invalid.", [
      sourceObjectId,
      "Subrace/Deity invalid_pair",
    ]);
  }
  const actual = placement.creatureSpecialIdentityStrings;
  for (const key of ["subrace", "deity"] as const) {
    const pair = mutation[key];
    if (!pair) continue;
    const label = key === "subrace" ? "Subrace" : "Deity";
    const storage = actual?.[key];
    if (storage?.present !== true) {
      throw invalid(`The exact source Creature lacks one canonical ${label} CExoString.`, [
        sourceObjectId,
        `${label} missing_canonical_cexostring`,
      ]);
    }
    if (storage.value !== pair.expectedValue) {
      throw invalid(`The exact source Creature ${label} differs from immutable provenance.`, [
        sourceObjectId,
        `${label} expected=${pair.expectedValue} actual=${storage.value}`,
      ]);
    }
  }
  return mutation;
}

function planCreatureScriptResRefMutations(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): readonly ExistingAreaCreatureScriptResRefMutation[] {
  const mutations = readExistingAreaCreatureScriptResRefMutations(input);
  if (!mutations) {
    throw invalid("A Creature script ResRef mutation collection is invalid.", [
      sourceObjectId,
      "scripts invalid_collection",
    ]);
  }
  for (const mutation of mutations) {
    const mapping = AREA_CREATURE_SCRIPT_RESREF_FIELDS.find(
      ({ nativeLabel }) => nativeLabel === mutation.field,
    )!;
    const storage = placement.creatureScriptResRefs?.[mapping.key];
    if (storage?.present !== true) {
      throw invalid(`The exact source Creature lacks one canonical ${mutation.field} ResRef.`, [
        sourceObjectId,
        `${mutation.field} missing_canonical_resref`,
      ]);
    }
    if (storage.value !== mutation.expectedResRef) {
      throw invalid(`The exact source Creature ${mutation.field} differs from immutable provenance.`, [
        sourceObjectId,
        `${mutation.field} expected=${mutation.expectedResRef} actual=${storage.value}`,
      ]);
    }
  }
  return mutations;
}

function planPlaceableVariableMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableVariableMutation {
  let mutation: ExistingAreaPlaceableVariableMutation;
  try {
    mutation = parseAreaPlaceableVariableMutation(input);
  } catch (error) {
    throw invalid("A Placeable VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  const actual = placement.placeableVariables;
  if (!actual) {
    throw invalid("The exact source Placeable VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaPlaceableVariableSourceEntriesEqual(actual.expectedEntries, mutation.expectedEntries)) {
    throw invalid("The exact source Placeable VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planCreatureVariableMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaCreatureVariableMutation {
  let mutation: ExistingAreaCreatureVariableMutation;
  try {
    mutation = parseAreaCreatureVariableMutation(input);
  } catch (error) {
    throw invalid("A Creature VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  const actual = placement.creatureVariables;
  if (!actual) {
    throw invalid("The exact source Creature VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaCreatureVariableSourceEntriesEqual(actual.expectedEntries, mutation.expectedEntries)) {
    throw invalid("The exact source Creature VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planEncounterVariableMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterVariables"],
  input: unknown,
): ExistingAreaEncounterVariableMutation {
  let mutation: ExistingAreaEncounterVariableMutation;
  try {
    mutation = parseAreaEncounterVariableMutation(input);
  } catch (error) {
    throw invalid("An Encounter VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source Encounter VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaEncounterVariableSourceEntriesEqual(
    actualInput.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw invalid("The exact source Encounter VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planWaypointVariableMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointVariables"],
  input: unknown,
): ExistingAreaWaypointVariableMutation {
  let mutation: ExistingAreaWaypointVariableMutation;
  try {
    mutation = parseAreaWaypointVariableMutation(input);
  } catch (error) {
    throw invalid("A Waypoint VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source Waypoint VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaWaypointVariableSourceEntriesEqual(
    actualInput.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw invalid("The exact source Waypoint VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planTriggerVariableMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerVariables"],
  input: unknown,
): ExistingAreaTriggerVariableMutation {
  let mutation: ExistingAreaTriggerVariableMutation;
  try {
    mutation = parseAreaTriggerVariableMutation(input);
  } catch (error) {
    throw invalid("A Trigger VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source Trigger VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaTriggerVariableSourceEntriesEqual(
    actualInput.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw invalid("The exact source Trigger VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planEncounterCreatureListMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterCreatureList"],
  input: unknown,
): ExistingAreaEncounterCreatureListMutation {
  let mutation: ExistingAreaEncounterCreatureListMutation;
  try {
    mutation = parseAreaEncounterCreatureListMutation(input);
  } catch (error) {
    throw invalid("An Encounter CreatureList SingleSpawn mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "CreatureList invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source Encounter CreatureList is outside the admitted profile.", [
      sourceObjectId,
      "CreatureList malformed_or_unsupported",
    ]);
  }
  if (!areaEncounterCreatureListEntriesEqual(
    actualInput.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw invalid("The exact source Encounter CreatureList differs from immutable provenance.", [
      sourceObjectId,
      "CreatureList stale",
    ]);
  }
  return mutation;
}

function planEncounterSpawnPointListMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterSpawnPoints"],
  input: unknown,
): ExistingAreaEncounterSpawnPointListMutation {
  let mutation: ExistingAreaEncounterSpawnPointListMutation;
  try {
    mutation = parseAreaEncounterSpawnPointListMutation(input);
  } catch (error) {
    throw invalid("An Encounter SpawnPointList mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "SpawnPointList invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source Encounter SpawnPointList is outside the admitted profile.", [
      sourceObjectId,
      "SpawnPointList malformed_or_unsupported",
    ]);
  }
  if (!areaEncounterSpawnPointSourceEntriesEqual(
    actualInput.expectedEntries,
    mutation.expectedEntries,
  )) {
    throw invalid("The exact source Encounter SpawnPointList differs from immutable provenance.", [
      sourceObjectId,
      "SpawnPointList stale",
    ]);
  }
  return mutation;
}

function planPlaceableTemplateResRefMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaPlaceableTemplateResRefMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable TemplateResRef mutation must be an object.", [
      sourceObjectId,
      "TemplateResRef invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find(
    (key) => key !== "expectedResRef" && key !== "resRef",
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Placeable TemplateResRef mutation has an unexpected key.", [
      sourceObjectId,
      `TemplateResRef unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedResRef") ||
    !Object.prototype.hasOwnProperty.call(pair, "resRef")
  ) {
    throw invalid("Placeable TemplateResRef mutation requires one complete pair.", [
      sourceObjectId,
      "TemplateResRef incomplete",
    ]);
  }
  if (!isAreaPlaceableTemplateResRef(pair.expectedResRef)) {
    throw invalid("Placeable TemplateResRef expected value is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid_expected",
    ]);
  }
  if (!isAreaPlaceableTemplateResRef(pair.resRef)) {
    throw invalid("Placeable TemplateResRef target value is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid",
    ]);
  }
  const actual = placement.placeableTemplateResRef;
  if (!isAreaPlaceableTemplateResRef(actual)) {
    throw invalid("The exact source Placeable lacks one canonical TemplateResRef.", [
      sourceObjectId,
      "TemplateResRef missing",
    ]);
  }
  if (actual !== pair.expectedResRef) {
    throw invalid("The exact source Placeable TemplateResRef differs from immutable provenance.", [
      sourceObjectId,
      `TemplateResRef expected=${pair.expectedResRef} actual=${actual}`,
    ]);
  }
  if (pair.resRef === pair.expectedResRef) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({
    expectedResRef: pair.expectedResRef,
    resRef: pair.resRef,
  });
}

function planPlaceableEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Placeable Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Placeable Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaPlaceableEditorComment(pair.expectedValue)) {
    throw invalid("Placeable Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaPlaceableEditorComment(pair.value)) {
    throw invalid("Placeable Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Placeable Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Placeable Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planCreatureEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["creatureMetadata"],
  input: unknown,
): ExistingAreaCreatureEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Creature Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Creature Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Creature Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaCreatureEditorComment(pair.expectedValue)) {
    throw invalid("Creature Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaCreatureEditorComment(pair.value)) {
    throw invalid("Creature Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Creature Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Creature Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A Creature property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planItemEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["itemMetadata"],
  input: unknown,
): ExistingAreaItemEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Item Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Item Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Item Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaItemEditorComment(pair.expectedValue)) {
    throw invalid("Item Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaItemEditorComment(pair.value)) {
    throw invalid("Item Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Item Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Item Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("An Item property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planStoreEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["storeMetadata"],
  input: unknown,
): ExistingAreaStoreEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Store Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Store Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Store Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaStoreEditorComment(pair.expectedValue)) {
    throw invalid("Store Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaStoreEditorComment(pair.value)) {
    throw invalid("Store Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Store Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Store Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A Store property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planEncounterEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["encounterMetadata"],
  input: unknown,
): ExistingAreaEncounterEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Encounter Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Encounter Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Encounter Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaEncounterEditorComment(pair.expectedValue)) {
    throw invalid("Encounter Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaEncounterEditorComment(pair.value)) {
    throw invalid("Encounter Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Encounter Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Encounter Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("An Encounter property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planTriggerEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["triggerMetadata"],
  input: unknown,
): ExistingAreaTriggerEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Trigger Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Trigger Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Trigger Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaTriggerEditorComment(pair.expectedValue)) {
    throw invalid("Trigger Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaTriggerEditorComment(pair.value)) {
    throw invalid("Trigger Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Trigger Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Trigger Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A Trigger property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planWaypointEditorCommentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["waypointMetadata"],
  input: unknown,
): ExistingAreaWaypointEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Waypoint Comment mutation must be an object.", [
      sourceObjectId,
      "Comment invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Waypoint Comment mutation has an unexpected key.", [
      sourceObjectId,
      `Comment unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Waypoint Comment mutation requires one complete pair.", [
      sourceObjectId,
      "Comment incomplete",
    ]);
  }
  if (!isAreaWaypointEditorComment(pair.expectedValue)) {
    throw invalid("Waypoint Comment mutation has an invalid expected value.", [
      sourceObjectId,
      "Comment invalid_expected",
    ]);
  }
  if (!isAreaWaypointEditorComment(pair.value)) {
    throw invalid("Waypoint Comment mutation has an invalid target value.", [
      sourceObjectId,
      "Comment invalid",
    ]);
  }
  const actual = metadata?.editorComment;
  if (typeof actual !== "string") {
    throw invalid("Waypoint Comment mutation requires one native GIC Comment CExoString.", [
      sourceObjectId,
      "Comment missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained Waypoint Comment provenance differs from the exact source GIC.", [
      sourceObjectId,
      `Comment expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A Waypoint property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planStoreCommerceMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["storeMetadata"],
  input: unknown,
): ExistingAreaStoreCommerceMutation {
  const mutation = readAreaStoreCommerceMutation(input);
  if (!mutation) {
    throw invalid("Store commerce mutation requires one complete changed exact vector CAS.", [
      sourceObjectId,
      "commerce invalid_pair",
    ]);
  }
  const actual = readAreaStoreCommerceValue(metadata?.commerce);
  if (!actual) {
    throw invalid("Store commerce mutation requires one exact native GIT vector.", [
      sourceObjectId,
      "commerce missing",
    ]);
  }
  if (!areaStoreCommerceValueEqual(actual, mutation.expectedValue)) {
    throw invalid("The retained Store commerce provenance differs from the exact source GIT.", [
      sourceObjectId,
      "commerce stale",
    ]);
  }
  return mutation;
}

function planStoreScriptResRefsMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["storeMetadata"],
  input: unknown,
): ExistingAreaStoreScriptResRefsMutation {
  const mutation = readAreaStoreScriptResRefsMutation(input);
  if (!mutation) {
    throw invalid("Store script mutation requires one complete changed exact pair CAS.", [
      sourceObjectId,
      "scripts invalid_pair",
    ]);
  }
  const actual = readAreaStoreScriptResRefsValue(metadata?.scriptResRefs);
  if (!actual) {
    throw invalid("Store script mutation requires one exact native GIT pair.", [
      sourceObjectId,
      "scripts missing",
    ]);
  }
  if (!areaStoreScriptResRefsValueEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Store script ResRef provenance differs from the exact source GIT.",
      [sourceObjectId, "scripts stale"],
    );
  }
  return mutation;
}

function planStoreVariableMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["storeMetadata"],
  input: unknown,
): ExistingAreaStoreVariableMutation {
  let mutation: ExistingAreaStoreVariableMutation;
  try {
    mutation = parseAreaStoreVariableMutation(input);
  } catch (error) {
    throw invalid("A retained Store VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  const actual = metadata?.variables;
  if (!actual) {
    throw invalid("The exact source Store VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaStoreVariableSourceEntriesEqual(actual.expectedEntries, mutation.expectedEntries)) {
    throw invalid("The retained Store VarTable provenance differs from the exact source GIT.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planStoreRestrictionsMutation(
  sourceObjectId: string,
  rawStorage: AreaStoreRestrictionsRawStorage | undefined,
  input: unknown,
): ExistingAreaStoreRestrictionsMutation {
  const mutation = readExistingAreaStoreRestrictionsMutation(input);
  if (!mutation) {
    throw invalid("A retained Store restrictions mutation pair is invalid.", [
      sourceObjectId,
      "restrictions invalid_pair",
    ]);
  }
  if (!areaStoreRestrictionsRawMatchesExpected(rawStorage, mutation.expectedValue)) {
    throw invalid("The retained Store restrictions provenance differs from the exact source GIT.", [
      sourceObjectId,
      "restrictions stale",
    ]);
  }
  return mutation;
}

function planStoreInventoryMutation(
  sourceObjectId: string,
  rawStorage: AreaStoreInventoryRawStorage | undefined,
  input: unknown,
): ExistingAreaStoreInventoryMutation {
  const mutation = readExistingAreaStoreInventoryMutation(input);
  if (!mutation) {
    throw invalid("A retained Store inventory mutation pair is invalid.", [
      sourceObjectId,
      "inventory invalid_pair",
    ]);
  }
  if (!areaStoreInventoryRawMatchesExpected(rawStorage, mutation.expectedBuckets)) {
    throw invalid("The retained Store inventory provenance differs from the exact source GIT.", [
      sourceObjectId,
      "inventory stale",
    ]);
  }
  return mutation;
}

function planItemTagMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemTag"],
  input: unknown,
): ExistingAreaItemTagMutation {
  const mutation = readExistingAreaItemTagMutation(input);
  if (!mutation) {
    throw invalid("Item Tag mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "Tag invalid_pair",
    ]);
  }
  const actual = readExistingAreaItemTagStorage(actualInput);
  if (!actual?.present) {
    throw invalid("Item Tag mutation requires one native GIT Tag CExoString.", [
      sourceObjectId,
      "Tag missing",
    ]);
  }
  if (actual.value !== mutation.expectedValue) {
    throw invalid("The retained Item Tag provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Tag expected=${mutation.expectedValue} actual=${actual.value}`,
    ]);
  }
  return mutation;
}

function planTriggerTagMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerTag"],
  input: unknown,
): ExistingAreaTriggerTagMutation {
  const mutation = readExistingAreaTriggerTagMutation(input);
  if (!mutation) {
    throw invalid("Trigger Tag mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "Tag invalid_pair",
    ]);
  }
  const actual = readExistingAreaTriggerTagStorage(actualInput);
  if (!actual?.present) {
    throw invalid("Trigger Tag mutation requires one native GIT Tag CExoString.", [
      sourceObjectId,
      "Tag missing",
    ]);
  }
  if (actual.value !== mutation.expectedValue) {
    throw invalid("The retained Trigger Tag provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Tag expected=${mutation.expectedValue} actual=${actual.value}`,
    ]);
  }
  return mutation;
}

function planTriggerTemplateResRefMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaTriggerTemplateResRefMutation {
  const mutation = readExistingAreaTriggerTemplateResRefMutation(input);
  if (!mutation) {
    throw invalid("A Trigger TemplateResRef mutation pair is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid_pair",
    ]);
  }
  const actual = placement.triggerTemplateResRef;
  if (actual?.present !== true) {
    throw invalid("The exact source Trigger lacks one canonical TemplateResRef ResRef.", [
      sourceObjectId,
      "TemplateResRef missing_canonical_resref",
    ]);
  }
  if (actual.value !== mutation.expectedResRef) {
    throw invalid(
      "The exact source Trigger TemplateResRef differs from immutable provenance.",
      [
        sourceObjectId,
        `TemplateResRef expected=${mutation.expectedResRef} actual=${actual.value}`,
      ],
    );
  }
  return mutation;
}

function planTriggerLocalizedNameMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerLocalizedName"],
  input: unknown,
): ExistingAreaTriggerLocalizedNameMutation {
  const mutation = readExistingAreaTriggerLocalizedNameMutation(input);
  if (!mutation) {
    throw invalid(
      "Trigger LocalizedName mutation requires one changed exact CAS pair.",
      [sourceObjectId, "LocalizedName invalid_pair"],
    );
  }
  const actual = readAreaTriggerLocalizedNameInlineAsciiStorage(actualInput);
  if (actual === undefined) {
    throw invalid(
      "Trigger LocalizedName mutation requires one admitted native CExoLocString.",
      [sourceObjectId, "LocalizedName missing_or_unsupported"],
    );
  }
  if (actual !== mutation.expectedValue) {
    throw invalid(
      "The retained Trigger LocalizedName provenance differs from the exact source GIT.",
      [sourceObjectId, "LocalizedName stale"],
    );
  }
  return mutation;
}

function planWaypointTagMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointTag"],
  input: unknown,
): ExistingAreaWaypointTagMutation {
  const mutation = readExistingAreaWaypointTagMutation(input);
  if (!mutation) {
    throw invalid("Waypoint Tag mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "Tag invalid_pair",
    ]);
  }
  const actual = readExistingAreaWaypointTagStorage(actualInput);
  if (!actual?.present) {
    throw invalid("Waypoint Tag mutation requires one native GIT Tag CExoString.", [
      sourceObjectId,
      "Tag missing",
    ]);
  }
  if (actual.value !== mutation.expectedValue) {
    throw invalid("The retained Waypoint Tag provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Tag expected=${mutation.expectedValue} actual=${actual.value}`,
    ]);
  }
  return mutation;
}

function planWaypointTemplateResRefMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaWaypointTemplateResRefMutation {
  const mutation = readExistingAreaWaypointTemplateResRefMutation(input);
  if (!mutation) {
    throw invalid("A Waypoint TemplateResRef mutation pair is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid_pair",
    ]);
  }
  const actual = placement.waypointTemplateResRef;
  if (actual?.present !== true) {
    throw invalid("The exact source Waypoint lacks one canonical TemplateResRef ResRef.", [
      sourceObjectId,
      "TemplateResRef missing_canonical_resref",
    ]);
  }
  if (actual.value !== mutation.expectedResRef) {
    throw invalid("The exact source Waypoint TemplateResRef differs from immutable provenance.", [
      sourceObjectId,
      `TemplateResRef expected=${mutation.expectedResRef} actual=${actual.value}`,
    ]);
  }
  return mutation;
}

function planWaypointLocalizedNameMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointLocalizedName"],
  input: unknown,
): ExistingAreaWaypointLocalizedNameMutation {
  const mutation = readExistingAreaWaypointLocalizedNameMutation(input);
  if (!mutation) {
    throw invalid(
      "Waypoint LocalizedName mutation requires one changed exact CAS pair.",
      [sourceObjectId, "LocalizedName invalid_pair"],
    );
  }
  const actual = readAreaWaypointLocalizedNameInlineAsciiStorage(actualInput);
  if (actual === undefined) {
    throw invalid(
      "Waypoint LocalizedName mutation requires one admitted native CExoLocString.",
      [sourceObjectId, "LocalizedName missing_or_unsupported"],
    );
  }
  if (actual !== mutation.expectedValue) {
    throw invalid(
      "The retained Waypoint LocalizedName provenance differs from the exact source GIT.",
      [sourceObjectId, "LocalizedName stale"],
    );
  }
  return mutation;
}

function planWaypointDescriptionMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointDescription"],
  input: unknown,
): ExistingAreaWaypointDescriptionMutation {
  const mutation = readExistingAreaWaypointDescriptionMutation(input);
  if (!mutation) {
    throw invalid(
      "Waypoint Description mutation requires one changed exact CAS pair.",
      [sourceObjectId, "Description invalid_pair"],
    );
  }
  const actual = readAreaWaypointDescriptionInlineAsciiStorage(actualInput);
  if (actual === undefined) {
    throw invalid(
      "Waypoint Description mutation requires one admitted native CExoLocString.",
      [sourceObjectId, "Description missing_or_unsupported"],
    );
  }
  if (actual !== mutation.expectedValue) {
    throw invalid(
      "The retained Waypoint Description provenance differs from the exact source GIT.",
      [sourceObjectId, "Description stale"],
    );
  }
  return mutation;
}

function planWaypointMapNoteMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointMapNote"],
  input: unknown,
): ExistingAreaWaypointMapNoteMutation {
  const mutation = readExistingAreaWaypointMapNoteMutation(input);
  if (!mutation) {
    throw invalid(
      "Waypoint MapNote mutation requires one complete changed exact CAS vector.",
      [sourceObjectId, "MapNote invalid_vector"],
    );
  }
  const actual = readAreaWaypointMapNoteInlineAsciiValue(actualInput);
  if (!actual) {
    throw invalid(
      "Waypoint MapNote mutation requires one admitted native HasMapNote/MapNote/MapNoteEnabled vector.",
      [sourceObjectId, "MapNote missing_or_unsupported"],
    );
  }
  if (!mapNoteValuesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Waypoint MapNote provenance differs from the exact source GIT.",
      [sourceObjectId, "MapNote stale"],
    );
  }
  return mutation;
}

function planWaypointAppearanceMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["waypointAppearance"],
  input: unknown,
): ExistingAreaWaypointAppearanceMutation {
  const mutation = parseAreaWaypointAppearanceMutation(input);
  if (!mutation) {
    throw invalid(
      "Waypoint Appearance mutation requires one changed digest-bound Byte CAS pair.",
      [sourceObjectId, "Appearance invalid_pair"],
    );
  }
  if (!actualInput?.present || actualInput.nativeType !== "byte") {
    throw invalid(
      "Waypoint Appearance mutation requires one canonical native Byte field.",
      [sourceObjectId, "Appearance missing_or_unsupported"],
    );
  }
  if (actualInput.value !== mutation.expectedValue) {
    throw invalid(
      "The retained Waypoint Appearance provenance differs from the exact source GIT.",
      [sourceObjectId, "Appearance stale"],
    );
  }
  return mutation;
}

function planEncounterTagMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterTag"],
  input: unknown,
): ExistingAreaEncounterTagMutation {
  const mutation = readExistingAreaEncounterTagMutation(input);
  if (!mutation) {
    throw invalid("Encounter Tag mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "Tag invalid_pair",
    ]);
  }
  const actual = readExistingAreaEncounterTagStorage(actualInput);
  if (!actual?.present) {
    throw invalid("Encounter Tag mutation requires one native GIT Tag CExoString.", [
      sourceObjectId,
      "Tag missing",
    ]);
  }
  if (actual.value !== mutation.expectedValue) {
    throw invalid("The retained Encounter Tag provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Tag expected=${mutation.expectedValue} actual=${actual.value}`,
    ]);
  }
  return mutation;
}

function planEncounterTemplateResRefMutation(
  sourceObjectId: string,
  placement: ParsedAreaPlacementBlueprint,
  input: unknown,
): ExistingAreaEncounterTemplateResRefMutation {
  const mutation = readExistingAreaEncounterTemplateResRefMutation(input);
  if (!mutation) {
    throw invalid("An Encounter TemplateResRef mutation pair is invalid.", [
      sourceObjectId,
      "TemplateResRef invalid_pair",
    ]);
  }
  const actual = placement.encounterTemplateResRef;
  if (actual?.present !== true) {
    throw invalid("The exact source Encounter lacks one canonical TemplateResRef ResRef.", [
      sourceObjectId,
      "TemplateResRef missing_canonical_resref",
    ]);
  }
  if (actual.value !== mutation.expectedResRef) {
    throw invalid(
      "The exact source Encounter TemplateResRef differs from immutable provenance.",
      [
        sourceObjectId,
        `TemplateResRef expected=${mutation.expectedResRef} actual=${actual.value}`,
      ],
    );
  }
  return mutation;
}

function planEncounterActiveMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterActive"],
  input: unknown,
): ExistingAreaEncounterActiveMutation {
  const mutation = readExistingAreaEncounterActiveMutation(input);
  if (!mutation) {
    throw invalid("Encounter Active mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "Active invalid_pair",
    ]);
  }
  const actual = readAreaEncounterActiveStorage(actualInput);
  if (!actual) {
    throw invalid("Encounter Active mutation requires one canonical native GIT Active BYTE.", [
      sourceObjectId,
      "Active missing_or_noncanonical",
    ]);
  }
  if (!areaEncounterActiveStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter Active provenance differs from the exact source GIT.",
      [sourceObjectId, "Active stale"],
    );
  }
  return mutation;
}

function planEncounterPlayerOnlyMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterPlayerOnly"],
  input: unknown,
): ExistingAreaEncounterPlayerOnlyMutation {
  const mutation = readExistingAreaEncounterPlayerOnlyMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter PlayerOnly mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "PlayerOnly invalid_pair"],
    );
  }
  const actual = readAreaEncounterPlayerOnlyStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter PlayerOnly mutation requires one canonical native GIT PlayerOnly BYTE.",
      [sourceObjectId, "PlayerOnly missing_or_noncanonical"],
    );
  }
  if (!areaEncounterPlayerOnlyStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter PlayerOnly provenance differs from the exact source GIT.",
      [sourceObjectId, "PlayerOnly stale"],
    );
  }
  return mutation;
}

function planEncounterResetMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterReset"],
  input: unknown,
): ExistingAreaEncounterResetMutation {
  const mutation = readExistingAreaEncounterResetMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter Reset mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "Reset invalid_pair"],
    );
  }
  const actual = readAreaEncounterResetStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter Reset mutation requires one canonical native GIT Reset BYTE.",
      [sourceObjectId, "Reset missing_or_noncanonical"],
    );
  }
  if (!areaEncounterResetStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter Reset provenance differs from the exact source GIT.",
      [sourceObjectId, "Reset stale"],
    );
  }
  return mutation;
}

function planEncounterResetTimeMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterResetTime"],
  input: unknown,
): ExistingAreaEncounterResetTimeMutation {
  const mutation = readExistingAreaEncounterResetTimeMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter ResetTime mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "ResetTime invalid_pair"],
    );
  }
  const actual = readAreaEncounterResetTimeStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter ResetTime mutation requires one bounded native GIT ResetTime INT.",
      [sourceObjectId, "ResetTime missing_or_out_of_range"],
    );
  }
  if (!areaEncounterResetTimeStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter ResetTime provenance differs from the exact source GIT.",
      [sourceObjectId, "ResetTime stale"],
    );
  }
  return mutation;
}

function planEncounterSpawnOptionMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterSpawnOption"],
  input: unknown,
): ExistingAreaEncounterSpawnOptionMutation {
  const mutation = readExistingAreaEncounterSpawnOptionMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter SpawnOption mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "SpawnOption invalid_pair"],
    );
  }
  const actual = readAreaEncounterSpawnOptionStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter SpawnOption mutation requires one canonical native GIT SpawnOption INT.",
      [sourceObjectId, "SpawnOption missing_or_noncanonical"],
    );
  }
  if (!areaEncounterSpawnOptionStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter SpawnOption provenance differs from the exact source GIT.",
      [sourceObjectId, "SpawnOption stale"],
    );
  }
  return mutation;
}

function planEncounterRespawnsMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterRespawns"],
  input: unknown,
): ExistingAreaEncounterRespawnsMutation {
  const mutation = readExistingAreaEncounterRespawnsMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter Respawns mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "Respawns invalid_pair"],
    );
  }
  const actual = readAreaEncounterRespawnsStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter Respawns mutation requires one finite-or-Infinite native GIT INT.",
      [sourceObjectId, "Respawns missing_or_noncanonical"],
    );
  }
  if (!areaEncounterRespawnsStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter Respawns provenance differs from the exact source GIT.",
      [sourceObjectId, "Respawns stale"],
    );
  }
  return mutation;
}

function planEncounterCreatureCountMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterCreatureCounts"],
  input: unknown,
): ExistingAreaEncounterCreatureCountMutation {
  const mutation = readExistingAreaEncounterCreatureCountMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter creature-count mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "creatureCounts invalid_pair"],
    );
  }
  const actual = readAreaEncounterCreatureCountStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter creature-count mutation requires one coherent native GIT INT pair.",
      [sourceObjectId, "creatureCounts missing_or_noncanonical"],
    );
  }
  if (!areaEncounterCreatureCountStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter creature-count provenance differs from the exact source GIT.",
      [sourceObjectId, "creatureCounts stale"],
    );
  }
  return mutation;
}

function planEncounterScriptResRefsMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterScriptResRefs"],
  input: unknown,
): ExistingAreaEncounterScriptResRefsMutation {
  const mutation = readExistingAreaEncounterScriptResRefsMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter script mutation requires one complete changed exact five-field CAS tuple.",
      [sourceObjectId, "scripts invalid_tuple"],
    );
  }
  const actual = readAreaEncounterScriptResRefsStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Encounter script mutation requires one exact native GIT ResRef tuple.",
      [sourceObjectId, "scripts missing_or_noncanonical"],
    );
  }
  if (!areaEncounterScriptResRefsStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Encounter script provenance differs from the exact source GIT.",
      [sourceObjectId, "scripts stale"],
    );
  }
  return mutation;
}

function planTriggerScriptResRefsMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerScriptResRefs"],
  input: unknown,
): ExistingAreaTriggerScriptResRefsMutation {
  const mutation = readExistingAreaTriggerScriptResRefsMutation(input);
  if (!mutation) {
    throw invalid(
      "Trigger script mutation requires one complete changed exact seven-field CAS tuple.",
      [sourceObjectId, "scripts invalid_tuple"],
    );
  }
  const actual = readAreaTriggerScriptResRefsStorage(actualInput);
  if (!actual) {
    throw invalid(
      "Trigger script mutation requires one exact native GIT ResRef tuple.",
      [sourceObjectId, "scripts missing_or_noncanonical"],
    );
  }
  if (!areaTriggerScriptResRefsStoragesEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The retained Trigger script provenance differs from the exact source GIT.",
      [sourceObjectId, "scripts stale"],
    );
  }
  return mutation;
}

function planTriggerTransitionStorageMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerTransitionStorage"],
  input: unknown,
): ExistingAreaTriggerTransitionStorageMutation {
  const mutation = readExistingAreaTriggerTransitionStorageMutation(input);
  if (!mutation) {
    throw invalid(
      "Trigger transition mutation requires one complete changed exact CAS tuple.",
      [sourceObjectId, "transitionStorage invalid_tuple"],
    );
  }
  if (!isAreaTriggerTransitionStorage(actualInput)) {
    throw invalid(
      "Trigger transition mutation requires one exact native GIT storage tuple.",
      [sourceObjectId, "transitionStorage missing_or_noncanonical"],
    );
  }
  if (!areaTriggerTransitionStorageEqual(actualInput, mutation.expectedValue)) {
    throw invalid(
      "The retained Trigger transition provenance differs from the exact source GIT.",
      [sourceObjectId, "transitionStorage stale"],
    );
  }
  return mutation;
}

function planTriggerCorePropertiesMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerCoreProperties"],
  input: unknown,
): ExistingAreaTriggerCorePropertiesMutation {
  const mutation = readExistingAreaTriggerCorePropertiesMutation(input);
  if (!mutation) {
    throw invalid(
      "Trigger core-properties mutation requires one complete changed exact CAS tuple.",
      [sourceObjectId, "coreProperties invalid_tuple"],
    );
  }
  if (!isAreaTriggerCoreProperties(actualInput)) {
    throw invalid(
      "Trigger core-properties mutation requires one exact native GIT storage tuple.",
      [sourceObjectId, "coreProperties missing_or_noncanonical"],
    );
  }
  if (!areaTriggerCorePropertiesEqual(actualInput, mutation.expectedValue)) {
    throw invalid(
      "The retained Trigger core-properties provenance differs from the exact source GIT.",
      [sourceObjectId, "coreProperties stale"],
    );
  }
  return mutation;
}

function planTriggerTrapPropertiesMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["triggerTrapProperties"],
  input: unknown,
): ExistingAreaTriggerTrapPropertiesMutation {
  const mutation = readExistingAreaTriggerTrapPropertiesMutation(input);
  if (!mutation) {
    throw invalid(
      "Trigger trap-properties mutation requires one complete changed exact CAS tuple.",
      [sourceObjectId, "trapProperties invalid_tuple"],
    );
  }
  if (!isAreaTriggerTrapProperties(actualInput)) {
    throw invalid(
      "Trigger trap-properties mutation requires one exact native GIT storage tuple.",
      [sourceObjectId, "trapProperties missing_or_noncanonical"],
    );
  }
  if (!areaTriggerTrapPropertiesEqual(actualInput, mutation.expectedValue)) {
    throw invalid(
      "The retained Trigger trap-properties provenance differs from the exact source GIT.",
      [sourceObjectId, "trapProperties stale"],
    );
  }
  return mutation;
}

function planEncounterFactionMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterFaction"],
  input: unknown,
): ExistingAreaEncounterFactionMutation {
  const mutation = readExistingAreaEncounterFactionMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter Faction mutation requires one catalog-bound changed exact CAS pair.",
      [sourceObjectId, "Faction invalid_pair"],
    );
  }
  const actual = readAreaEncounterFactionStorage(actualInput);
  if (!actual?.present) {
    throw invalid(
      "Encounter Faction mutation requires one canonical native GIT DWord.",
      [sourceObjectId, "Faction missing_or_noncanonical"],
    );
  }
  if (actual.value !== mutation.expectedValue) {
    throw invalid(
      "The retained Encounter Faction provenance differs from the exact source GIT.",
      [sourceObjectId, "Faction stale"],
    );
  }
  return mutation;
}

function planEncounterDifficultyMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterDifficulty"],
  input: unknown,
): ExistingAreaEncounterDifficultyMutation {
  const mutation = readExistingAreaEncounterDifficultyMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter Difficulty mutation requires one catalog-bound changed exact CAS pair.",
      [sourceObjectId, "Difficulty+DifficultyIndex invalid_pair"],
    );
  }
  const actual = readAreaEncounterDifficultyStorage(actualInput);
  if (!actual?.difficulty.present || !actual.difficultyIndex.present) {
    throw invalid(
      "Encounter Difficulty mutation requires two canonical native GIT INT fields.",
      [sourceObjectId, "Difficulty+DifficultyIndex missing_or_noncanonical"],
    );
  }
  if (actual.difficulty.value !== mutation.expectedValue.difficulty ||
      actual.difficultyIndex.value !== mutation.expectedValue.difficultyIndex) {
    throw invalid(
      "The retained Encounter Difficulty provenance differs from the exact source GIT.",
      [sourceObjectId, "Difficulty+DifficultyIndex stale"],
    );
  }
  return mutation;
}

function planEncounterLocalizedNameMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["encounterLocalizedName"],
  input: unknown,
): ExistingAreaEncounterLocalizedNameMutation {
  const mutation = readExistingAreaEncounterLocalizedNameMutation(input);
  if (!mutation) {
    throw invalid(
      "Encounter LocalizedName mutation requires one changed exact CAS pair.",
      [sourceObjectId, "LocalizedName invalid_pair"],
    );
  }
  const actual = readAreaEncounterLocalizedNameInlineAsciiStorage(actualInput);
  if (actual === undefined) {
    throw invalid(
      "Encounter LocalizedName mutation requires one admitted native CExoLocString.",
      [sourceObjectId, "LocalizedName missing_or_unsupported"],
    );
  }
  if (actual !== mutation.expectedValue) {
    throw invalid(
      "The retained Encounter LocalizedName provenance differs from the exact source GIT.",
      [sourceObjectId, "LocalizedName stale"],
    );
  }
  return mutation;
}

function planItemTemplateResRefMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemTemplateResRef"],
  input: unknown,
): ExistingAreaItemTemplateResRefMutation {
  const mutation = readExistingAreaItemTemplateResRefMutation(input);
  if (!mutation) {
    throw invalid(
      "Item TemplateResRef mutation requires one complete changed exact CAS pair.",
      [sourceObjectId, "TemplateResRef invalid_pair"],
    );
  }
  const actual = readAreaItemTemplateResRefStorage(actualInput);
  if (!actual?.present) {
    throw invalid("Item TemplateResRef mutation requires one native GIT ResRef.", [
      sourceObjectId,
      "TemplateResRef missing",
    ]);
  }
  if (actual.value !== mutation.expectedResRef) {
    throw invalid(
      "The retained Item TemplateResRef provenance differs from the exact source GIT.",
      [
        sourceObjectId,
        `TemplateResRef expected=${mutation.expectedResRef} actual=${actual.value}`,
      ],
    );
  }
  return mutation;
}

function planItemInstanceStateMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemInstanceState"],
  input: unknown,
): ExistingAreaItemInstanceStateMutation {
  const mutation = readAreaItemInstanceStateMutation(input);
  if (!mutation) {
    throw invalid("Item instance-state mutation requires one complete changed exact CAS pair.", [
      sourceObjectId,
      "instance_state invalid_pair",
    ]);
  }
  const actual = readAreaItemInstanceStateStorage(actualInput);
  if (!actual) {
    throw invalid("Item instance-state mutation requires exact source GIT provenance.", [
      sourceObjectId,
      "instance_state missing",
    ]);
  }
  if (!areaItemInstanceStateStorageEqual(actual, mutation.expectedValue)) {
    throw invalid("The retained Item instance-state provenance differs from the exact source GIT.", [
      sourceObjectId,
      "instance_state stale_storage",
    ]);
  }
  return mutation;
}

function planItemLocalizedStringMutations(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemLocalizedStrings"],
  input: unknown,
): readonly ExistingAreaItemLocalizedStringMutation[] {
  const mutations = readExistingAreaItemLocalizedStringMutations(input);
  if (!mutations) {
    throw invalid("Item localized-string mutation list is invalid.", [
      sourceObjectId,
      "localizedStrings invalid_pair",
    ]);
  }
  const actual = readAreaItemLocalizedStrings(actualInput);
  if (!actual) {
    throw invalid("Item localized-string mutation requires exact source GIT provenance.", [
      sourceObjectId,
      "localizedStrings missing",
    ]);
  }
  for (const mutation of mutations) {
    const mapping = AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS.find(
      (candidate) => candidate.field === mutation.field,
    )!;
    if (mutation.expectedEntries && mutation.expectedProfile) {
      const storage = readEditableAreaItemLocalizedStringStorage(
        actual[mapping.sourceKey],
        mapping.maxBytes,
      );
      if (!storage) {
        throw invalid("Item localized-string source is outside the admitted profile.", [
          sourceObjectId,
          `${mutation.field} unsupported_source`,
        ]);
      }
      if (
        storage.value !== mutation.expectedValue ||
        storage.profile !== mutation.expectedProfile ||
        !areaItemLocalizedStringEntriesEqual(storage.entries, mutation.expectedEntries)
      ) {
        throw invalid("Item localized-string expected value differs from exact source GIT.", [
          sourceObjectId,
          `${mutation.field} stale_source`,
        ]);
      }
      continue;
    }
    const value = readAreaItemInlineAsciiStorage(
      actual[mapping.sourceKey],
      mapping.maxBytes,
    );
    if (value === undefined) {
      throw invalid("Item localized-string source is outside the admitted profile.", [
        sourceObjectId,
        `${mutation.field} unsupported_source`,
      ]);
    }
    if (value !== mutation.expectedValue) {
      throw invalid("Item localized-string expected value differs from exact source GIT.", [
        sourceObjectId,
        `${mutation.field} stale_source`,
      ]);
    }
  }
  return mutations;
}

function planItemVariableMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemVariables"],
  input: unknown,
): ExistingAreaItemVariableMutation {
  let mutation: ExistingAreaItemVariableMutation;
  try {
    mutation = parseAreaItemVariableMutation(input);
  } catch (error) {
    throw invalid("A ground-Item VarTable mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "VarTable invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source ground-Item VarTable is outside the admitted profile.", [
      sourceObjectId,
      "VarTable malformed_or_unsupported",
    ]);
  }
  if (!areaItemVariableSourceEntriesEqual(actualInput.expectedEntries, mutation.expectedEntries)) {
    throw invalid("The exact source ground-Item VarTable differs from immutable provenance.", [
      sourceObjectId,
      "VarTable stale",
    ]);
  }
  return mutation;
}

function planItemPropertyListMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemPropertyList"],
  input: unknown,
): ExistingAreaItemPropertyListMutation {
  let mutation: ExistingAreaItemPropertyListMutation;
  try {
    mutation = parseAreaItemPropertyListMutation(input);
  } catch (error) {
    throw invalid("A ground-Item PropertiesList mutation pair is invalid.", [
      sourceObjectId,
      error instanceof Error ? error.message : "PropertiesList invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source ground-Item PropertiesList is outside the admitted profile.", [
      sourceObjectId,
      "PropertiesList malformed_or_unsupported",
    ]);
  }
  let actual: ReturnType<typeof parseAreaItemPropertyListProvenance>;
  try {
    actual = parseAreaItemPropertyListProvenance(actualInput);
  } catch {
    throw invalid("The exact source ground-Item PropertiesList is outside the admitted profile.", [
      sourceObjectId,
      "PropertiesList malformed_or_unsupported",
    ]);
  }
  if (
    actual.present !== mutation.expectedValue.present ||
    !areaItemPropertyListSourceEntriesEqual(
      actual.expectedEntries,
      mutation.expectedValue.expectedEntries,
    )
  ) {
    throw invalid("The exact source ground-Item PropertiesList differs from immutable provenance.", [
      sourceObjectId,
      "PropertiesList stale",
    ]);
  }
  return mutation;
}

function planItemBaseAppearanceMutation(
  sourceObjectId: string,
  source: ParsedAreaPlacementBlueprint["itemBaseAppearanceRaw"],
  input: unknown,
): ExistingAreaItemBaseAppearanceMutation {
  const mutation = readExistingAreaItemBaseAppearanceMutation(input);
  if (!mutation) {
    throw invalid("A ground-Item BaseItem/appearance mutation pair is invalid.", [
      sourceObjectId,
      "BaseItem invalid_pair",
    ]);
  }
  if (!source || !itemBaseAppearanceRawMatchesValue(source, mutation.expectedValue)) {
    throw invalid(
      "The exact source ground-Item BaseItem/appearance differs from immutable provenance.",
      [sourceObjectId, "BaseItem stale_source_vector"],
    );
  }
  return mutation;
}

function planItemInventoryMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemInventoryItems"],
  input: unknown,
): AreaItemInventoryMutation {
  let mutation: AreaItemInventoryMutation;
  try {
    mutation = parseAreaItemInventoryMutation(input, "ItemList");
  } catch (error) {
    throw invalid("A ground-Item ItemList mutation pair is invalid.", [
      sourceObjectId,
      error instanceof AreaItemInventoryValidationError
        ? `${error.path} ${error.message}`
        : "ItemList invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid("The exact source ground-Item ItemList is outside the admitted profile.", [
      sourceObjectId,
      "ItemList malformed_or_unsupported",
    ]);
  }
  let actual;
  try {
    actual = parseAreaItemInventorySourceEntries(actualInput, "ItemList.source");
  } catch {
    throw invalid("The exact source ground-Item ItemList is outside the admitted profile.", [
      sourceObjectId,
      "ItemList malformed_or_unsupported",
    ]);
  }
  if (!areaItemInventoryEntriesEqual(actual, mutation.expectedEntries)) {
    throw invalid("The exact source ground-Item ItemList differs from immutable provenance.", [
      sourceObjectId,
      "ItemList stale",
    ]);
  }
  return mutation;
}

function planItemVisualTransformMutation(
  sourceObjectId: string,
  actualInput: ParsedAreaPlacementBlueprint["itemVisualTransform"],
  input: unknown,
): AreaItemVisualTransformMutation {
  let mutation: AreaItemVisualTransformMutation;
  try {
    mutation = parseAreaItemVisualTransformMutation(input, "VisTransformList");
  } catch (error) {
    throw invalid("A ground-Item VisTransformList mutation pair is invalid.", [
      sourceObjectId,
      error instanceof AreaItemVisualTransformValidationError
        ? `${error.path} ${error.message}`
        : "VisTransformList invalid_pair",
    ]);
  }
  if (!actualInput) {
    throw invalid(
      "The exact source ground-Item VisTransformList is outside the admitted profile.",
      [sourceObjectId, "VisTransformList malformed_or_unsupported"],
    );
  }
  let actual;
  try {
    actual = parseAreaItemVisualTransformStorage(
      actualInput,
      "VisTransformList.source",
    );
  } catch {
    throw invalid(
      "The exact source ground-Item VisTransformList is outside the admitted profile.",
      [sourceObjectId, "VisTransformList malformed_or_unsupported"],
    );
  }
  if (!areaItemVisualTransformStorageEqual(actual, mutation.expectedValue)) {
    throw invalid(
      "The exact source ground-Item VisTransformList differs from immutable provenance.",
      [sourceObjectId, "VisTransformList stale"],
    );
  }
  return mutation;
}

function planPlaceableAnimationStateMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableAnimationStateMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable AnimationState mutation must be an object.", [
      sourceObjectId,
      "AnimationState invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Placeable AnimationState mutation has an unexpected key.", [
      sourceObjectId,
      `AnimationState unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Placeable AnimationState mutation requires one complete Byte pair.", [
      sourceObjectId,
      "AnimationState incomplete",
    ]);
  }
  if (!isAreaPlaceableAnimationState(pair.expectedValue)) {
    throw invalid("Placeable AnimationState expected Byte is invalid.", [
      sourceObjectId,
      "AnimationState invalid_expected",
    ]);
  }
  if (!isAreaPlaceableAnimationState(pair.value)) {
    throw invalid("Placeable AnimationState target Byte is invalid.", [
      sourceObjectId,
      "AnimationState invalid",
    ]);
  }
  const actual = metadata?.animationState;
  if (!isAreaPlaceableAnimationState(actual)) {
    throw invalid("A placeable property mutation requires one native AnimationState Byte.", [
      sourceObjectId,
      "AnimationState missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained placeable AnimationState provenance differs from the exact source GIT.", [
      sourceObjectId,
      `AnimationState expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planPlaceableTrapByteMutations(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): readonly ExistingAreaPlaceableTrapByteMutation[] {
  if (!Array.isArray(input)) {
    throw invalid("Placeable trap byte mutations must be an array.", [
      sourceObjectId,
      "trapFields invalid_list",
    ]);
  }
  if (input.length === 0) {
    throw invalid("Placeable trap byte mutations must not be empty.", [
      sourceObjectId,
      "trapFields empty",
    ]);
  }
  const planned: ExistingAreaPlaceableTrapByteMutation[] = [];
  const seen = new Set<string>();
  for (const rawEntry of input) {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw invalid("Placeable trap byte mutation entry must be an object.", [
        sourceObjectId,
        "trapFields entry invalid",
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableTrapByteFieldMapping(entry.field);
    if (!mapping) {
      throw invalid("Placeable trap mutation identifies an unsupported native field.", [
        sourceObjectId,
        `${String(entry.field)} unsupported_trap_field`,
      ]);
    }
    const unexpectedKey = Object.keys(entry).find((key) =>
      key !== "field" && key !== "expectedValue" && key !== "value"
    );
    if (unexpectedKey !== undefined) {
      throw invalid("Placeable trap byte mutation entry has an unexpected key.", [
        sourceObjectId,
        `${mapping.field} unexpected_key=${unexpectedKey}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw invalid("Placeable trap byte mutation field must be unique.", [
        sourceObjectId,
        `${mapping.field} duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (
      !Object.prototype.hasOwnProperty.call(entry, "expectedValue") ||
      !Object.prototype.hasOwnProperty.call(entry, "value")
    ) {
      throw invalid("Placeable trap byte mutation requires one complete value pair.", [
        sourceObjectId,
        `${mapping.field} incomplete`,
      ]);
    }
    if (!isAreaPlaceableTrapByteMutationValue(mapping, entry.expectedValue)) {
      throw invalid("Placeable trap expected value has the wrong type or range.", [
        sourceObjectId,
        `${mapping.field} invalid_expected_${mapping.valueKind}`,
      ]);
    }
    if (!isAreaPlaceableTrapByteMutationValue(mapping, entry.value)) {
      throw invalid("Placeable trap target value has the wrong type or range.", [
        sourceObjectId,
        `${mapping.field} invalid_${mapping.valueKind}`,
      ]);
    }
    const actual = nativePlaceableTrapByteValue(metadata?.[mapping.metadataKey], mapping.valueKind);
    if (actual === undefined) {
      throw invalid(`A placeable property mutation requires one native ${mapping.field} Byte.`, [
        sourceObjectId,
        `${mapping.field} missing`,
      ]);
    }
    if (actual !== entry.expectedValue) {
      throw invalid(
        `The retained placeable ${mapping.field} provenance differs from the exact source GIT.`,
        [
          sourceObjectId,
          `${mapping.field} expected=${entry.expectedValue} actual=${actual}`,
        ],
      );
    }
    if (entry.value === entry.expectedValue) {
      throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
    }
    planned.push(Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }));
  }
  const receivedOrder = planned.map((entry) => entry.field).join("\0");
  const expectedOrder = AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS
    .filter((mapping) => seen.has(mapping.field))
    .map((mapping) => mapping.field)
    .join("\0");
  if (receivedOrder !== expectedOrder) {
    const field = planned[planned.length - 1]!.field;
    throw invalid("Placeable trap byte fields must use frozen order.", [
      sourceObjectId,
      `${field} out_of_order`,
    ]);
  }
  return Object.freeze(planned);
}

function nativePlaceableTrapByteValue(
  input: unknown,
  valueKind: "flag" | "byte",
): number | undefined {
  if (valueKind === "flag" && typeof input === "boolean") return input ? 1 : 0;
  if (
    typeof input === "number" &&
    Number.isInteger(input) &&
    input >= 0 &&
    input <= (valueKind === "flag" ? 1 : 0xff)
  ) {
    return input;
  }
  return undefined;
}

function planPlaceableConversationMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableConversationMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable Conversation mutation must be an object.", [
      sourceObjectId,
      "Conversation invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedResRef" && key !== "resRef"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Placeable Conversation mutation has an unexpected key.", [
      sourceObjectId,
      `Conversation unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedResRef") ||
    !Object.prototype.hasOwnProperty.call(pair, "resRef")
  ) {
    throw invalid("Placeable Conversation mutation requires one complete ResRef pair.", [
      sourceObjectId,
      "Conversation incomplete",
    ]);
  }
  if (!isAreaPlaceableConversation(pair.expectedResRef)) {
    throw invalid("Placeable Conversation expected ResRef is invalid.", [
      sourceObjectId,
      "Conversation invalid_expected",
    ]);
  }
  if (!isAreaPlaceableConversation(pair.resRef)) {
    throw invalid("Placeable Conversation target ResRef is invalid.", [
      sourceObjectId,
      "Conversation invalid",
    ]);
  }
  const actual = metadata?.conversation;
  if (!isAreaPlaceableConversation(actual)) {
    throw invalid("A placeable property mutation requires one native Conversation ResRef.", [
      sourceObjectId,
      "Conversation missing",
    ]);
  }
  if (actual !== pair.expectedResRef) {
    throw invalid("The retained placeable Conversation provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Conversation expected=${pair.expectedResRef} actual=${actual}`,
    ]);
  }
  if (pair.resRef === pair.expectedResRef) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedResRef: pair.expectedResRef, resRef: pair.resRef });
}

function planPlaceableInterruptableMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableInterruptableMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable Interruptable mutation must be an object.", [
      sourceObjectId,
      "Interruptable invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw invalid("Placeable Interruptable mutation has an unexpected key.", [
      sourceObjectId,
      `Interruptable unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Placeable Interruptable mutation requires one complete Byte pair.", [
      sourceObjectId,
      "Interruptable incomplete",
    ]);
  }
  if (!isAreaPlaceableInterruptableValue(pair.expectedValue)) {
    throw invalid("Placeable Interruptable expected Byte is invalid.", [
      sourceObjectId,
      "Interruptable invalid_expected",
    ]);
  }
  if (!isAreaPlaceableInterruptableValue(pair.value)) {
    throw invalid("Placeable Interruptable target Byte is invalid.", [
      sourceObjectId,
      "Interruptable invalid",
    ]);
  }
  const actual = metadata?.interruptable;
  if (!isAreaPlaceableInterruptableValue(actual)) {
    throw invalid("A placeable property mutation requires one native Interruptable Byte.", [
      sourceObjectId,
      "Interruptable missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained placeable Interruptable provenance differs from the exact source GIT.", [
      sourceObjectId,
      `Interruptable expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planPlaceableBasicByteMutations(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): readonly ExistingAreaPlaceableBasicByteMutation[] {
  if (!Array.isArray(input)) {
    throw invalid("Placeable durability/save byte mutations must be an array.", [
      sourceObjectId,
      "basicByteFields invalid_list",
    ]);
  }
  if (input.length === 0) {
    throw invalid("Placeable durability/save byte mutations must not be empty.", [
      sourceObjectId,
      "basicByteFields empty",
    ]);
  }
  const planned: ExistingAreaPlaceableBasicByteMutation[] = [];
  const seen = new Set<string>();
  for (const rawEntry of input) {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw invalid("Placeable durability/save byte mutation entry must be an object.", [
        sourceObjectId,
        "basicByteFields entry invalid",
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableBasicByteFieldMapping(entry.field);
    if (!mapping) {
      throw invalid("Placeable durability/save mutation identifies an unsupported native field.", [
        sourceObjectId,
        `${String(entry.field)} unsupported_basic_byte_field`,
      ]);
    }
    const unexpectedKey = Object.keys(entry).find((key) =>
      key !== "field" && key !== "expectedValue" && key !== "value"
    );
    if (unexpectedKey !== undefined) {
      throw invalid("Placeable durability/save byte mutation entry has an unexpected key.", [
        sourceObjectId,
        `${mapping.field} unexpected_key=${unexpectedKey}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw invalid("Placeable durability/save byte mutation field must be unique.", [
        sourceObjectId,
        `${mapping.field} duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (
      !Object.prototype.hasOwnProperty.call(entry, "expectedValue") ||
      !Object.prototype.hasOwnProperty.call(entry, "value")
    ) {
      throw invalid("Placeable durability/save byte mutation requires one complete value pair.", [
        sourceObjectId,
        `${mapping.field} incomplete`,
      ]);
    }
    if (!isAreaPlaceableByteValue(entry.expectedValue)) {
      throw invalid("Placeable durability/save expected value is not a Byte.", [
        sourceObjectId,
        `${mapping.field} invalid_expected_byte`,
      ]);
    }
    if (!isAreaPlaceableByteValue(entry.value)) {
      throw invalid("Placeable durability/save target value is not a Byte.", [
        sourceObjectId,
        `${mapping.field} invalid_byte`,
      ]);
    }
    const actual = metadata?.[mapping.metadataKey];
    if (!isAreaPlaceableByteValue(actual)) {
      throw invalid(`A placeable property mutation requires one native ${mapping.field} Byte.`, [
        sourceObjectId,
        `${mapping.field} missing`,
      ]);
    }
    if (actual !== entry.expectedValue) {
      throw invalid(
        `The retained placeable ${mapping.field} provenance differs from the exact source GIT.`,
        [
          sourceObjectId,
          `${mapping.field} expected=${entry.expectedValue} actual=${actual}`,
        ],
      );
    }
    if (entry.value === entry.expectedValue) {
      throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
    }
    planned.push(Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }));
  }
  const receivedOrder = planned.map((entry) => entry.field).join("\0");
  const expectedOrder = AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS
    .filter((mapping) => seen.has(mapping.field))
    .map((mapping) => mapping.field)
    .join("\0");
  if (receivedOrder !== expectedOrder) {
    const field = planned[planned.length - 1]!.field;
    throw invalid("Placeable durability/save byte fields must use frozen order.", [
      sourceObjectId,
      `${field} out_of_order`,
    ]);
  }
  return Object.freeze(planned);
}

function planPlaceableInventoryMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableInventoryMutation {
  const mutation = parseInventoryMutationInput(sourceObjectId, input);
  const actualEntries = parseNativePlaceableInventoryEntries(sourceObjectId, metadata);
  if (!areaPlaceableInventoryEntriesEqual(mutation.expectedEntries, actualEntries)) {
    const mismatchIndex = firstInventoryMismatchIndex(mutation.expectedEntries, actualEntries);
    throw invalid(
      "The retained Placeable inventory provenance differs from the exact source GIT.",
      [
        sourceObjectId,
        mismatchIndex === undefined
          ? `inventory expected count=${mutation.expectedEntries.length} actual=${actualEntries.length}`
          : `inventory expected entry ${mismatchIndex} differs from exact source GIT`,
      ],
    );
  }
  if (areaPlaceableInventoryEntriesEqual(mutation.expectedEntries, mutation.entries)) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return mutation;
}

function planCreatureInventoryMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["creatureMetadata"],
  input: unknown,
): ExistingAreaCreatureInventoryMutation {
  const mutation = parseCreatureInventoryMutationInput(sourceObjectId, input);
  const actualEntries = parseNativeCreatureInventoryEntries(sourceObjectId, metadata);
  if (!areaCreatureInventoryEntriesEqual(mutation.expectedEntries, actualEntries)) {
    const mismatchIndex = firstCreatureInventoryMismatchIndex(
      mutation.expectedEntries,
      actualEntries,
    );
    throw invalid(
      "The retained Creature inventory provenance differs from the exact source GIT.",
      [
        sourceObjectId,
        mismatchIndex === undefined
          ? `inventory expected count=${mutation.expectedEntries.length} actual=${actualEntries.length}`
          : `inventory expected entry ${mismatchIndex} differs from exact source GIT`,
      ],
    );
  }
  if (areaCreatureInventoryEntriesEqual(mutation.expectedEntries, mutation.entries)) {
    throw invalid("A Creature property mutation must change the source value.", [
      sourceObjectId,
    ]);
  }
  return mutation;
}

function parseCreatureInventoryMutationInput(
  sourceObjectId: string,
  input: unknown,
): ExistingAreaCreatureInventoryMutation {
  try {
    return parseAreaCreatureInventoryMutation(input, "inventory");
  } catch (error) {
    if (error instanceof AreaCreatureInventoryValidationError) {
      throw invalid("Creature ItemList mutation is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
}

function parseNativeCreatureInventoryEntries(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["creatureMetadata"],
): ReturnType<typeof parseAreaCreatureInventorySourceEntries> {
  const count = metadata?.inventoryItemListCount;
  if (!Number.isSafeInteger(count) || Number(count) < 0) {
    throw invalid("A Creature ItemList mutation requires one exact native list count.", [
      sourceObjectId,
      "inventoryItemListCount missing_or_invalid",
    ]);
  }
  const raw = metadata?.inventoryItemListEntries;
  if (count === 0 && raw === undefined) return Object.freeze([]);
  if (typeof raw !== "string") {
    throw invalid("A Creature ItemList mutation requires exact parsed native entries.", [
      sourceObjectId,
      "inventoryItemListEntries missing_or_invalid",
    ]);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw invalid("A Creature ItemList mutation requires valid parsed native entries.", [
      sourceObjectId,
      "inventoryItemListEntries invalid_json",
    ]);
  }
  let entries: ReturnType<typeof parseAreaCreatureInventorySourceEntries>;
  try {
    entries = parseAreaCreatureInventorySourceEntries(
      decoded,
      "inventory.sourceEntries",
    );
  } catch (error) {
    if (error instanceof AreaCreatureInventoryValidationError) {
      throw invalid("Parsed native Creature ItemList provenance is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
  if (entries.length !== count) {
    throw invalid("Parsed native Creature ItemList count differs from the exact source GIT.", [
      sourceObjectId,
      `inventory expected_count=${count} parsed_count=${entries.length}`,
    ]);
  }
  return entries;
}

function firstCreatureInventoryMismatchIndex(
  expected: readonly Readonly<{
    sourceIndex: number;
    resRef: string;
    x: number;
    y: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[],
  actual: readonly Readonly<{
    sourceIndex: number;
    resRef: string;
    x: number;
    y: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[],
): number | undefined {
  const comparableCount = Math.min(expected.length, actual.length);
  for (let index = 0; index < comparableCount; index += 1) {
    const left = expected[index]!;
    const right = actual[index]!;
    if (
      left.sourceIndex !== right.sourceIndex ||
      left.resRef !== right.resRef ||
      left.x !== right.x ||
      left.y !== right.y ||
      left.dropable !== right.dropable ||
      left.pickpocketable !== right.pickpocketable
    ) {
      return index;
    }
  }
  return undefined;
}

function planCreatureEquipmentMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["creatureMetadata"],
  input: unknown,
): ExistingAreaCreatureEquipmentMutation {
  const mutation = parseCreatureEquipmentMutationInput(sourceObjectId, input);
  const actualEntries = parseNativeCreatureEquipmentEntries(sourceObjectId, metadata);
  if (!areaCreatureEquipmentEntriesEqual(mutation.expectedEntries, actualEntries)) {
    const mismatchIndex = firstCreatureEquipmentMismatchIndex(
      mutation.expectedEntries,
      actualEntries,
    );
    throw invalid(
      "The retained Creature equipment provenance differs from the exact source GIT.",
      [
        sourceObjectId,
        mismatchIndex === undefined
          ? `equipment expected count=${mutation.expectedEntries.length} actual=${actualEntries.length}`
          : `equipment expected entry ${mismatchIndex} differs from exact source GIT`,
      ],
    );
  }
  if (areaCreatureEquipmentEntriesEqual(mutation.expectedEntries, mutation.entries)) {
    throw invalid("A Creature equipment mutation must change the source value.", [
      sourceObjectId,
    ]);
  }
  return mutation;
}

function parseCreatureEquipmentMutationInput(
  sourceObjectId: string,
  input: unknown,
): ExistingAreaCreatureEquipmentMutation {
  try {
    return parseAreaCreatureEquipmentMutation(input, "equipment");
  } catch (error) {
    if (error instanceof AreaCreatureEquipmentValidationError) {
      throw invalid("Creature Equip_ItemList mutation is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
}

function parseNativeCreatureEquipmentEntries(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["creatureMetadata"],
): ReturnType<typeof parseAreaCreatureEquipmentSourceEntries> {
  const count = metadata?.equipItemListCount;
  if (!Number.isSafeInteger(count) || Number(count) < 0) {
    throw invalid("A Creature Equip_ItemList mutation requires one exact native list count.", [
      sourceObjectId,
      "equipItemListCount missing_or_invalid",
    ]);
  }
  const raw = metadata?.equipItemListMutationEntries;
  if (count === 0 && raw === undefined) return Object.freeze([]);
  if (typeof raw !== "string") {
    throw invalid("A Creature Equip_ItemList mutation requires exact parsed native entries.", [
      sourceObjectId,
      "equipItemListMutationEntries missing_or_invalid",
    ]);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw invalid("A Creature Equip_ItemList mutation requires valid parsed native entries.", [
      sourceObjectId,
      "equipItemListMutationEntries invalid_json",
    ]);
  }
  let entries: ReturnType<typeof parseAreaCreatureEquipmentSourceEntries>;
  try {
    entries = parseAreaCreatureEquipmentSourceEntries(decoded, "equipment.sourceEntries");
  } catch (error) {
    if (error instanceof AreaCreatureEquipmentValidationError) {
      throw invalid("Parsed native Creature Equip_ItemList provenance is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
  if (entries.length !== count) {
    throw invalid("Parsed native Creature Equip_ItemList count differs from the exact source GIT.", [
      sourceObjectId,
      `equipment expected_count=${count} parsed_count=${entries.length}`,
    ]);
  }
  return entries;
}

function firstCreatureEquipmentMismatchIndex(
  expected: readonly Readonly<{
    sourceIndex: number;
    resRef: string;
    slotMask: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[],
  actual: readonly Readonly<{
    sourceIndex: number;
    resRef: string;
    slotMask: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>[],
): number | undefined {
  const comparableCount = Math.min(expected.length, actual.length);
  for (let index = 0; index < comparableCount; index += 1) {
    const left = expected[index]!;
    const right = actual[index]!;
    if (
      left.sourceIndex !== right.sourceIndex
      || left.resRef !== right.resRef
      || left.slotMask !== right.slotMask
      || left.dropable !== right.dropable
      || left.pickpocketable !== right.pickpocketable
    ) {
      return index;
    }
  }
  return undefined;
}

function parseInventoryMutationInput(
  sourceObjectId: string,
  input: unknown,
): ExistingAreaPlaceableInventoryMutation {
  try {
    return parseAreaPlaceableInventoryMutation(input, "inventory");
  } catch (error) {
    if (error instanceof AreaPlaceableInventoryValidationError) {
      throw invalid("Placeable ItemList mutation is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
}

function parseNativePlaceableInventoryEntries(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
): ReturnType<typeof parseAreaPlaceableInventorySourceEntries> {
  const count = metadata?.inventoryItemListCount;
  if (!Number.isSafeInteger(count) || Number(count) < 0) {
    throw invalid("A placeable ItemList mutation requires one exact native list count.", [
      sourceObjectId,
      "inventoryItemListCount missing_or_invalid",
    ]);
  }
  const raw = metadata?.inventoryItemListEntries;
  if (count === 0 && raw === undefined) return Object.freeze([]);
  if (typeof raw !== "string") {
    throw invalid("A placeable ItemList mutation requires exact parsed native entries.", [
      sourceObjectId,
      "inventoryItemListEntries missing_or_invalid",
    ]);
  }
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    throw invalid("A placeable ItemList mutation requires valid parsed native entries.", [
      sourceObjectId,
      "inventoryItemListEntries invalid_json",
    ]);
  }
  let entries: ReturnType<typeof parseAreaPlaceableInventorySourceEntries>;
  try {
    entries = parseAreaPlaceableInventorySourceEntries(decoded, "inventory.sourceEntries");
  } catch (error) {
    if (error instanceof AreaPlaceableInventoryValidationError) {
      throw invalid("Parsed native Placeable ItemList provenance is invalid.", [
        sourceObjectId,
        `${error.path}: ${error.message}`,
      ]);
    }
    throw error;
  }
  if (entries.length !== count) {
    throw invalid("Parsed native Placeable ItemList count differs from the exact source GIT.", [
      sourceObjectId,
      `inventory expected_count=${count} parsed_count=${entries.length}`,
    ]);
  }
  return entries;
}

function firstInventoryMismatchIndex(
  expected: readonly Readonly<{ sourceIndex: number; resRef: string; x: number; y: number }>[],
  actual: readonly Readonly<{ sourceIndex: number; resRef: string; x: number; y: number }>[],
): number | undefined {
  const comparableCount = Math.min(expected.length, actual.length);
  for (let index = 0; index < comparableCount; index += 1) {
    const left = expected[index]!;
    const right = actual[index]!;
    if (
      left.sourceIndex !== right.sourceIndex ||
      left.resRef !== right.resRef ||
      left.x !== right.x ||
      left.y !== right.y
    ) {
      return index;
    }
  }
  return undefined;
}

function planPlaceableKeyNameMutation(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): ExistingAreaPlaceableKeyNameMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw invalid("Placeable KeyName mutation must be an object.", [
      sourceObjectId,
      "KeyName invalid_pair",
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw invalid("Placeable KeyName mutation requires one complete string pair.", [
      sourceObjectId,
      "KeyName incomplete",
    ]);
  }
  if (!isAreaPlaceableKeyName(pair.expectedValue)) {
    throw invalid("Placeable KeyName expected value is invalid.", [
      sourceObjectId,
      "KeyName invalid_expected",
    ]);
  }
  if (!isAreaPlaceableKeyName(pair.value)) {
    throw invalid("Placeable KeyName target value is invalid.", [
      sourceObjectId,
      "KeyName invalid",
    ]);
  }
  const actual = metadata?.keyName;
  if (!isAreaPlaceableKeyName(actual)) {
    throw invalid("A placeable property mutation requires one native KeyName CExoString.", [
      sourceObjectId,
      "KeyName missing",
    ]);
  }
  if (actual !== pair.expectedValue) {
    throw invalid("The retained placeable KeyName provenance differs from the exact source GIT.", [
      sourceObjectId,
      `KeyName expected=${pair.expectedValue} actual=${actual}`,
    ]);
  }
  if (pair.value === pair.expectedValue) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function planPlaceableLockMutations(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): readonly ExistingAreaPlaceableLockMutation[] {
  if (!Array.isArray(input)) {
    throw invalid("Placeable lock mutations must be an array.", [
      sourceObjectId,
      "lockFields invalid_list",
    ]);
  }
  if (input.length === 0) {
    throw invalid("Placeable lock mutations must not be empty.", [
      sourceObjectId,
      "lockFields empty",
    ]);
  }
  const planned: ExistingAreaPlaceableLockMutation[] = [];
  const seen = new Set<string>();
  for (const rawEntry of input) {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw invalid("Placeable lock mutation entry must be an object.", [
        sourceObjectId,
        "lockFields entry invalid",
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableLockFieldMapping(entry.field);
    if (!mapping) {
      throw invalid("Placeable lock mutation identifies an unsupported native field.", [
        sourceObjectId,
        `${String(entry.field)} unsupported_lock_field`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw invalid("Placeable lock mutation field must be unique.", [
        sourceObjectId,
        `${mapping.field} duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (
      !Object.prototype.hasOwnProperty.call(entry, "expectedValue") ||
      !Object.prototype.hasOwnProperty.call(entry, "value")
    ) {
      throw invalid("Placeable lock mutation requires one complete value pair.", [
        sourceObjectId,
        `${mapping.field} incomplete`,
      ]);
    }
    if (!isAreaPlaceableLockFieldValue(mapping, entry.expectedValue)) {
      throw invalid("Placeable lock expected value has the wrong type or range.", [
        sourceObjectId,
        `${mapping.field} invalid_expected_${mapping.valueKind}`,
      ]);
    }
    if (!isAreaPlaceableLockFieldValue(mapping, entry.value)) {
      throw invalid("Placeable lock target value has the wrong type or range.", [
        sourceObjectId,
        `${mapping.field} invalid_${mapping.valueKind}`,
      ]);
    }
    const actual = metadata?.[mapping.metadataKey];
    if (!isAreaPlaceableLockFieldValue(mapping, actual)) {
      throw invalid(`A placeable property mutation requires one native ${mapping.field} Byte.`, [
        sourceObjectId,
        `${mapping.field} missing`,
      ]);
    }
    if (actual !== entry.expectedValue) {
      throw invalid(
        `The retained placeable ${mapping.field} provenance differs from the exact source GIT.`,
        [
          sourceObjectId,
          `${mapping.field} expected=${String(entry.expectedValue)} actual=${String(actual)}`,
        ],
      );
    }
    if (entry.value === entry.expectedValue) {
      throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
    }
    planned.push(Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }));
  }
  const receivedOrder = planned.map((entry) => entry.field).join("\0");
  const expectedOrder = AREA_PLACEABLE_LOCK_FIELD_MAPPINGS
    .filter((mapping) => seen.has(mapping.field))
    .map((mapping) => mapping.field)
    .join("\0");
  if (receivedOrder !== expectedOrder) {
    const field = planned[planned.length - 1]!.field;
    throw invalid("Placeable lock mutation fields must use frozen order.", [
      sourceObjectId,
      `${field} out_of_order`,
    ]);
  }
  return Object.freeze(planned);
}

function planPlaceableTrapScriptMutations(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): readonly ExistingAreaPlaceableTrapScriptResRefMutation[] {
  return planPlaceableResRefMutations(
    sourceObjectId,
    metadata,
    input,
    "trapScripts",
    "trap script entry invalid",
    findAreaPlaceableTrapScriptFieldMapping,
  );
}

function planPlaceableResRefMutations<TField extends string>(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
  collection: "trapScripts",
  invalidEntryDiagnostic: "trap script entry invalid",
  findMapping: (field: unknown) => Readonly<{
    field: TField;
    metadataKey: string;
  }> | undefined,
): readonly Readonly<{ field: TField; expectedResRef: string; resRef: string }>[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw invalid("A placeable trap script mutation requires a non-empty entry list.", [
      sourceObjectId,
      Array.isArray(input) ? `${collection} empty` : `${collection} invalid`,
    ]);
  }
  const planned: Array<Readonly<{ field: TField; expectedResRef: string; resRef: string }>> = [];
  const seen = new Set<TField>();
  for (const rawEntry of input) {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw invalid("A placeable trap script mutation entry must be an object.", [
        sourceObjectId,
        invalidEntryDiagnostic,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findMapping(entry.field);
    if (!mapping) {
      throw invalid("A placeable trap script mutation identifies an unsupported native field.", [
        sourceObjectId,
        `field=${String(entry.field)}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw invalid("One native placeable trap script field is mutated more than once.", [
        sourceObjectId,
        `${mapping.field} duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (typeof entry.expectedResRef !== "string" || typeof entry.resRef !== "string") {
      throw invalid("A placeable trap script mutation requires one complete ResRef pair.", [
        sourceObjectId,
        `${mapping.field} incomplete`,
      ]);
    }
    if (!isScriptResRef(entry.expectedResRef)) {
      throw invalid("A placeable trap script mutation expected value is invalid.", [
        sourceObjectId,
        `${mapping.field} invalid expected ResRef`,
      ]);
    }
    if (!isScriptResRef(entry.resRef)) {
      throw invalid("A placeable trap script mutation target value is invalid.", [
        sourceObjectId,
        `${mapping.field} invalid target ResRef`,
      ]);
    }
    const actual = metadata?.[mapping.metadataKey];
    if (typeof actual !== "string") {
      throw invalid("A placeable trap script mutation requires one native ResRef.", [
        sourceObjectId,
        `${mapping.field} missing`,
      ]);
    }
    if (actual !== entry.expectedResRef) {
      throw invalid("The retained placeable trap script provenance differs from the exact source GIT.", [
        sourceObjectId,
        `${mapping.field} expected=${entry.expectedResRef} actual=${actual}`,
      ]);
    }
    if (entry.resRef === entry.expectedResRef) {
      throw invalid("A placeable trap script mutation must change the source value.", [
        sourceObjectId,
        `${mapping.field} unchanged`,
      ]);
    }
    planned.push(Object.freeze({
      field: mapping.field,
      expectedResRef: entry.expectedResRef,
      resRef: entry.resRef,
    }));
  }
  return Object.freeze(planned);
}

function planPlaceableScriptMutations(
  sourceObjectId: string,
  metadata: ParsedAreaPlacementBlueprint["placeableMetadata"],
  input: unknown,
): readonly ExistingAreaPlaceableScriptResRefMutation[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw invalid("A placeable script mutation requires a non-empty entry list.", [
      sourceObjectId,
      Array.isArray(input) ? "scripts empty" : "scripts invalid",
    ]);
  }
  const planned: ExistingAreaPlaceableScriptResRefMutation[] = [];
  const seen = new Set<ExistingAreaPlaceableScriptField>();
  for (const rawEntry of input) {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw invalid("A placeable script mutation entry must be an object.", [
        sourceObjectId,
        "script entry invalid",
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableScriptFieldMapping(entry.field);
    if (!mapping) {
      throw invalid("A placeable script mutation identifies an unsupported native field.", [
        sourceObjectId,
        `field=${String(entry.field)}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw invalid("One native placeable script field is mutated more than once.", [
        sourceObjectId,
        `${mapping.field} duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (typeof entry.expectedResRef !== "string" || typeof entry.resRef !== "string") {
      throw invalid("A placeable script mutation requires one complete ResRef pair.", [
        sourceObjectId,
        `${mapping.field} incomplete`,
      ]);
    }
    if (!isScriptResRef(entry.expectedResRef)) {
      throw invalid("A placeable script mutation expected value is invalid.", [
        sourceObjectId,
        `${mapping.field} invalid expected ResRef`,
      ]);
    }
    if (!isScriptResRef(entry.resRef)) {
      throw invalid("A placeable script mutation target value is invalid.", [
        sourceObjectId,
        `${mapping.field} invalid target ResRef`,
      ]);
    }
    const actual = metadata?.[mapping.metadataKey];
    if (typeof actual !== "string") {
      throw invalid("A placeable script mutation requires one native ResRef.", [
        sourceObjectId,
        `${mapping.field} missing`,
      ]);
    }
    if (actual !== entry.expectedResRef) {
      throw invalid("The retained placeable script provenance differs from the exact source GIT.", [
        sourceObjectId,
        `${mapping.field} expected=${entry.expectedResRef} actual=${actual}`,
      ]);
    }
    if (entry.resRef === entry.expectedResRef) {
      throw invalid("A placeable script mutation must change the source value.", [
        sourceObjectId,
        `${mapping.field} unchanged`,
      ]);
    }
    planned.push(Object.freeze({
      field: mapping.field,
      expectedResRef: entry.expectedResRef,
      resRef: entry.resRef,
    }));
  }
  return Object.freeze(planned);
}

function planStringPropertyPair(
  sourceObjectId: string,
  label: "OnUsed",
  actual: unknown,
  expected: unknown,
  target: unknown,
): Readonly<{ expectedOnUsed: string; onUsed: string }> {
  if (typeof expected !== "string" || typeof target !== "string") {
    throw invalid(`A placeable ${label} mutation requires one complete string pair.`, [
      sourceObjectId,
      `${label} incomplete`,
    ]);
  }
  if (typeof actual !== "string") {
    throw invalid(`A placeable property mutation requires one native ${label} ResRef.`, [
      sourceObjectId,
      `${label} missing`,
    ]);
  }
  if (actual !== expected) {
    throw invalid(`The retained placeable ${label} provenance differs from the exact source GIT.`, [
      sourceObjectId,
      `${label} expected=${expected} actual=${actual}`,
    ]);
  }
  if (target === expected) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return { expectedOnUsed: expected, onUsed: target };
}

function isScriptResRef(value: string): boolean {
  return /^[A-Za-z0-9_]{0,16}$/u.test(value);
}

function planBooleanPropertyPair(
  sourceObjectId: string,
  label: "Static" | "Useable" | "Plot" | "HasInventory",
  actual: unknown,
  expected: unknown,
  target: unknown,
  expectedKey: "expectedStatic" | "expectedUseable" | "expectedPlot" | "expectedHasInventory",
  targetKey: "static" | "useable" | "plot" | "hasInventory",
): Readonly<Record<string, boolean>> {
  if (typeof expected !== "boolean" || typeof target !== "boolean") {
    throw invalid(`A placeable ${label} mutation requires one complete boolean pair.`, [
      sourceObjectId,
      `${label} incomplete`,
    ]);
  }
  if (typeof actual !== "boolean") {
    throw invalid(`A placeable property mutation requires one native ${label} Byte.`, [
      sourceObjectId,
      `${label} missing`,
    ]);
  }
  if (actual !== expected) {
    throw invalid(`The retained placeable ${label} provenance differs from the exact source GIT.`, [
      sourceObjectId,
      `${label} expected=${expected} actual=${actual}`,
    ]);
  }
  if (target === expected) {
    throw invalid("A placeable property mutation must change the source value.", [sourceObjectId]);
  }
  return { [expectedKey]: expected, [targetKey]: target };
}

function planSurvivorTransform(
  source: ParsedAreaPlacementBlueprint,
  retained: ProjectedAreaObjectEditing["retainedObjects"][number],
  sourceIndex: number,
  tagMutation?: ExistingAreaObjectTagMutation,
  itemTemplateResRefMutation?: ExistingAreaItemTemplateResRefMutation,
): ExistingAreaObjectTransform | undefined {
  const identityMismatches: string[] = [];
  const sourceResRef = source.itemTemplateResRef?.present
    ? source.itemTemplateResRef.value
    : normalizeAreaObjectSourceToken(source.templateResRef ?? "");
  if (sourceResRef && retained.resRef !== sourceResRef) {
    if (
      itemTemplateResRefMutation?.expectedResRef !== sourceResRef ||
      itemTemplateResRefMutation.resRef !== retained.resRef
    ) {
      identityMismatches.push(`resRef expected=${sourceResRef} actual=${retained.resRef}`);
    }
  }
  let sourceTag = source.tag?.trim();
  if (source.placeableBasicIdentity?.tag.present) {
    sourceTag = source.placeableBasicIdentity.tag.value;
  }
  if (source.creatureTag?.present) {
    sourceTag = source.creatureTag.value;
  }
  if (source.itemTag?.present) {
    sourceTag = source.itemTag.value;
  }
  if (sourceTag !== undefined && retained.tag !== sourceTag) {
    if (tagMutation?.expectedValue !== sourceTag || tagMutation.value !== retained.tag) {
      identityMismatches.push(`tag expected=${sourceTag} actual=${retained.tag}`);
    }
  }
  if (identityMismatches.length > 0) {
    throw invalid(
      "Existing-object deletion cannot silently persist other object mutations.",
      [retained.sourceObjectId, ...identityMismatches],
    );
  }

  const positionMismatches: string[] = [];
  compareNumber("x", toSceneCoordinate(source.x), retained.x, positionMismatches);
  compareNumber("y", toSceneCoordinate(source.y), retained.y, positionMismatches);
  compareNumber("z", toSceneCoordinate(source.z), retained.z, positionMismatches);
  const bearingMismatches: string[] = [];
  compareBearing(toSceneBearing(source.bearing), retained.bearing, bearingMismatches);
  if (positionMismatches.length === 0 && bearingMismatches.length === 0) return undefined;
  if (source.listKind === "sound") {
    if (bearingMismatches.length > 0) {
      throw invalid(
        "Existing sound bearing cannot be materialized because SoundList has no native orientation fields.",
        [retained.sourceObjectId, ...bearingMismatches],
      );
    }
    return Object.freeze({
      kind: "sound",
      sourceIndex,
      x: retained.x,
      y: retained.y,
      z: retained.z,
    });
  }
  if (source.listKind === "trigger") {
    if (bearingMismatches.length > 0) {
      throw invalid(
        "Existing trigger bearing cannot be materialized without proven rotation authority.",
        [retained.sourceObjectId, ...bearingMismatches],
      );
    }
    return Object.freeze({
      kind: "trigger",
      sourceIndex,
      x: retained.x,
      y: retained.y,
      z: retained.z,
    });
  }
  if (source.listKind === "encounter") {
    if (bearingMismatches.length > 0) {
      throw invalid(
        "Existing encounter bearing cannot be materialized without proven rotation authority.",
        [retained.sourceObjectId, ...bearingMismatches],
      );
    }
    return Object.freeze({
      kind: "encounter",
      sourceIndex,
      x: retained.x,
      y: retained.y,
      z: retained.z,
    });
  }
  const transformMismatches = [...positionMismatches, ...bearingMismatches];
  if (
    source.listKind !== "creature" &&
    source.listKind !== "item" &&
    source.listKind !== "placeable" &&
    source.listKind !== "store" &&
    source.listKind !== "waypoint"
  ) {
    throw invalid("Existing object transform is not admitted for this family.", [
      retained.sourceObjectId,
      `kind=${source.listKind}`,
      ...transformMismatches,
    ]);
  }
  return Object.freeze({
    kind: source.listKind,
    sourceIndex,
    x: retained.x,
    y: retained.y,
    z: retained.z,
    bearing: retained.bearing,
  });
}

function toSceneCoordinate(value: number): number {
  return value / 10;
}

function toSceneBearing(value: number): number {
  const normalizedDegrees = ((value % 360) + 360) % 360;
  return (normalizedDegrees * Math.PI) / 180;
}

function compareBearing(expected: number, actual: number, mismatches: string[]): void {
  const fullTurn = Math.PI * 2;
  const delta = Math.abs((((actual - expected) % fullTurn) + fullTurn) % fullTurn);
  if (Math.min(delta, fullTurn - delta) > 1e-6) {
    mismatches.push(`bearing expected=${expected} actual=${actual}`);
  }
}

function compareNumber(
  field: string,
  expected: number,
  actual: number,
  mismatches: string[],
): void {
  if (Math.abs(expected - actual) > 1e-6) {
    mismatches.push(`${field} expected=${expected} actual=${actual}`);
  }
}

function sourceOrdinalKey(kind: string, sourceIndex: number): string {
  return `${kind}:${sourceIndex}`;
}

function invalid(
  message: string,
  details: readonly string[] = [],
): AreaExistingObjectDeletionPlanError {
  return new AreaExistingObjectDeletionPlanError(message, Object.freeze([...details]));
}
