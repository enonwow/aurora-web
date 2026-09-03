import { createHash } from "node:crypto";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "../../../domain/area-object-construction-profile";
import { AREA_CREATURE_CONSTRUCTION_PROFILE } from "../../../domain/area-creature-construction-profile";
import {
  AREA_PLACEABLE_CONSTRUCTION_PROFILE,
  AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE,
} from "../../../domain/area-placeable-construction-profile";
import {
  AREA_PLACEABLE_DYNAMIC_INVENTORY_ITEM_RESOURCE_TYPE,
  resolveAreaPlaceableDynamicInventoryProfile,
} from "../../../domain/area-placeable-dynamic-inventory-profile";
import {
  AREA_ITEM_CONSTRUCTION_PROFILE,
  AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE,
} from "../../../domain/area-item-construction-profile";
import { AREA_SOUND_CONSTRUCTION_PROFILE } from "../../../domain/area-sound-construction-profile";
import {
  AREA_STORE_CONSTRUCTION_PROFILE,
  AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE,
  hashAreaStoreConstructionDependencies,
} from "../../../domain/area-store-construction-profile";
import { AREA_TRIGGER_CONSTRUCTION_PROFILE } from "../../../domain/area-trigger-construction-profile";
import {
  AREA_WAYPOINT_CONSTRUCTION_PROFILE,
  AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE,
} from "../../../domain/area-waypoint-construction-profile";
import {
  AREA_ENCOUNTER_CONSTRUCTION_PROFILE,
  AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE,
} from "../../../domain/area-encounter-construction-profile";
import { AREA_DOOR_CONSTRUCTION_PROFILE } from "../../../domain/area-door-construction-profile";
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
  type ExistingAreaPlaceableLockField,
  type ExistingAreaPlaceableLockValue,
} from "../../../domain/area-placeable-lock-fields";
import { isAreaPlaceableKeyName } from "../../../domain/area-placeable-key-name";
import {
  AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS,
  findAreaPlaceableBasicByteFieldMapping,
  isAreaPlaceableByteValue,
  type ExistingAreaPlaceableBasicByteMutation,
} from "../../../domain/area-placeable-basic-byte-fields";
import {
  MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION,
  type AreaPlaceableInventoryBlueprintEntry,
  type AreaPlaceableInventorySourceEntry,
} from "../../../domain/area-placeable-inventory";
import {
  AreaCreatureInventoryValidationError,
  areaCreatureInventoryEntriesEqual,
  MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION,
  parseAreaCreatureInventoryMutation,
  AreaCreatureInventoryBlueprintEntry,
  AreaCreatureInventorySourceEntry,
} from "../../../domain/area-creature-inventory";
import {
  AreaCreatureEquipmentValidationError,
  areaCreatureEquipmentEntriesEqual,
  MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION,
  parseAreaCreatureEquipmentMutation,
  type AreaCreatureEquipmentSourceEntry,
  type AreaCreatureEquipmentTargetEntry,
} from "../../../domain/area-creature-equipment";
import {
  AreaItemInventoryValidationError,
  areaItemInventoryEntriesEqual,
  MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION,
  parseAreaItemInventoryMutation,
  type AreaItemInventoryBlueprintEntry,
  type AreaItemInventorySourceEntry,
} from "../../../domain/area-item-inventory";
import {
  AREA_ITEM_VISUAL_TRANSFORM_KEYS,
  AreaItemVisualTransformValidationError,
  areaItemVisualTransformStorageEqual,
  parseAreaItemVisualTransformMutation,
  parseAreaItemVisualTransformStorage,
  type AreaItemVisualTransformKey,
  type AreaItemVisualTransformMutation,
  type AreaItemVisualTransformStorage,
  type AreaItemVisualTransformValue,
} from "../../../domain/area-item-visual-transform";
import {
  readExistingAreaCreatureTagMutation,
  type ExistingAreaCreatureTagMutation,
} from "../../../domain/area-creature-tag";
import {
  readExistingAreaCreatureConversationMutation,
  type ExistingAreaCreatureConversationMutation,
} from "../../../domain/area-creature-conversation";
import {
  readExistingAreaCreatureInterruptableMutation,
  type ExistingAreaCreatureInterruptableMutation,
} from "../../../domain/area-creature-interruptable";
import {
  AREA_CREATURE_ADVANCED_FLAG_FIELDS,
  readExistingAreaCreatureAdvancedFlagMutations,
  type AreaCreatureAdvancedFlagKey,
  type ExistingAreaCreatureAdvancedFlagMutations,
  type ExistingAreaCreatureBinaryFlagMutation,
} from "../../../domain/area-creature-advanced-flags";
import {
  readExistingAreaCreatureBodyBagMutation,
  readExistingAreaCreatureDecayTimeMutation,
  type ExistingAreaCreatureBodyBagMutation,
  type ExistingAreaCreatureDecayTimeMutation,
} from "../../../domain/area-creature-death-remains";
import {
  readExistingAreaCreatureAppearanceMutation,
  type ExistingAreaCreatureAppearanceMutation,
} from "../../../domain/area-creature-appearance";
import {
  readExistingAreaCreatureGenderMutation,
  type ExistingAreaCreatureGenderMutation,
} from "../../../domain/area-creature-gender";
import {
  readExistingAreaCreaturePerceptionRangeMutation,
  type ExistingAreaCreaturePerceptionRangeMutation,
} from "../../../domain/area-creature-perception-range";
import {
  readExistingAreaCreatureWalkRateMutation,
  type ExistingAreaCreatureWalkRateMutation,
} from "../../../domain/area-creature-walk-rate";
import {
  readExistingAreaCreatureSoundSetFileMutation,
  type ExistingAreaCreatureSoundSetFileMutation,
} from "../../../domain/area-creature-sound-set-file";
import {
  readExistingAreaCreatureStartingPackageMutation,
  type ExistingAreaCreatureStartingPackageMutation,
} from "../../../domain/area-creature-starting-package";
import {
  readExistingAreaCreatureSkillListMutation,
  type ExistingAreaCreatureSkillListMutation,
} from "../../../domain/area-creature-skill-list";
import {
  readExistingAreaCreatureFeatListMutation,
  type ExistingAreaCreatureFeatListMutation,
} from "../../../domain/area-creature-feat-list";
import {
  readExistingAreaCreatureSpecialAbilityListMutation,
  type ExistingAreaCreatureSpecialAbilityListMutation,
} from "../../../domain/area-creature-special-ability-list";
import {
  readExistingAreaCreatureClassLevelMutation,
  type ExistingAreaCreatureClassLevelMutation,
} from "../../../domain/area-creature-class-levels";
import {
  readExistingAreaCreatureClassIdentityMutation,
  type ExistingAreaCreatureClassIdentityMutation,
} from "../../../domain/area-creature-class-identity";
import {
  readExistingAreaCreatureClassSlotResizeMutation,
  type ExistingAreaCreatureClassSlotResizeMutation,
} from "../../../domain/area-creature-class-slot-resize";
import {
  analyzeAreaCreatureClassListField,
  replaceAreaCreatureClassIdsAndClearSpellLists,
  resizeAreaCreatureClassListTail,
} from "./area-creature-class-list-gff";
import {
  readExistingAreaCreaturePhenotypeMutation,
  type ExistingAreaCreaturePhenotypeMutation,
} from "../../../domain/area-creature-phenotype";
import {
  readExistingAreaCreaturePortraitMutation,
  type ExistingAreaCreaturePortraitMutation,
} from "../../../domain/area-creature-portrait";
import {
  readExistingAreaCreatureChallengeRatingMutation,
  type ExistingAreaCreatureChallengeRatingMutation,
} from "../../../domain/area-creature-challenge-rating";
import {
  AREA_CREATURE_ABILITY_SCORE_FIELDS,
  readExistingAreaCreatureAbilityScoreMutations,
  type ExistingAreaCreatureAbilityScoreMutations,
} from "../../../domain/area-creature-ability-scores";
import {
  AREA_CREATURE_APPEARANCE_COLOR_FIELDS,
  readExistingAreaCreatureAppearanceColorMutations,
  type ExistingAreaCreatureAppearanceColorMutations,
} from "../../../domain/area-creature-appearance-colors";
import {
  AREA_CREATURE_BODY_PART_FIELDS,
  maximumAreaCreatureBodyPartTarget,
  readAreaCreatureBodyPartStorage,
  readExistingAreaCreatureBodyPartMutations,
  type ExistingAreaCreatureBodyPartMutations,
} from "../../../domain/area-creature-body-parts";
import {
  AREA_CREATURE_APPENDAGE_FIELDS,
  readAreaCreatureAppendageStorage,
  readExistingAreaCreatureAppendageMutations,
  type ExistingAreaCreatureAppendageMutations,
} from "../../../domain/area-creature-appendages";
import {
  readExistingAreaCreatureHitPointMutation,
  type ExistingAreaCreatureHitPointMutation,
} from "../../../domain/area-creature-hit-points";
import {
  readExistingAreaCreatureNaturalArmorClassMutation,
  type ExistingAreaCreatureNaturalArmorClassMutation,
} from "../../../domain/area-creature-natural-armor-class";
import {
  AREA_CREATURE_SAVING_THROW_BONUS_FIELDS,
  readExistingAreaCreatureSavingThrowBonusMutations,
  type ExistingAreaCreatureSavingThrowBonusMutations,
} from "../../../domain/area-creature-saving-throw-bonuses";
import {
  readExistingAreaCreatureAlignmentMutation,
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
  type ExistingAreaCreatureSpecialIdentityStringMutation,
  type ExistingAreaCreatureSpecialIdentityStringsMutation,
} from "../../../domain/area-creature-special-identity-strings";
import {
  readExistingAreaCreatureScriptResRefMutations,
  type ExistingAreaCreatureScriptResRefMutation,
} from "../../../domain/area-creature-script-resrefs";
import {
  AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS,
  readExistingAreaCreatureNameLocalizedStringMutations,
  type ExistingAreaCreatureNameLocalizedStringMutation,
} from "../../../domain/area-creature-localized-string-mutation";
import { isAreaInlineAsciiText } from "../../../domain/area-inline-ascii-localized-string-mutation";
import {
  isAreaPlaceableConversation,
  isAreaPlaceableInterruptableValue,
  type ExistingAreaPlaceableConversationMutation,
  type ExistingAreaPlaceableInterruptableMutation,
} from "../../../domain/area-placeable-conversation-interruptable";
import {
  AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  findAreaPlaceableTrapByteFieldMapping,
  isAreaPlaceableTrapByteMutationValue,
  type ExistingAreaPlaceableTrapByteMutation,
} from "../../../domain/area-placeable-trap-byte-fields";
import {
  isAreaPlaceableAnimationState,
  type ExistingAreaPlaceableAnimationStateMutation,
} from "../../../domain/area-placeable-animation-state";
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
  isAreaEncounterEditorComment,
  type ExistingAreaEncounterEditorCommentMutation,
} from "../../../domain/area-encounter-editor-comment";
import {
  parseAreaEncounterVariableMutation,
  parseAreaEncounterVariableTargetEntries,
  type AreaEncounterVariableSourceEntry,
  type AreaEncounterVariableTargetEntry,
  type ExistingAreaEncounterVariableMutation,
} from "../../../domain/area-encounter-variable-table";
import {
  parseAreaWaypointVariableMutation,
  type AreaWaypointVariableSourceEntry,
  type AreaWaypointVariableTargetEntry,
  type ExistingAreaWaypointVariableMutation,
} from "../../../domain/area-waypoint-variable-table";
import {
  areaEncounterCreatureListEntriesEqual,
  parseAreaEncounterCreatureListProvenance,
  parseAreaEncounterCreatureListResolvedMutation,
  type AreaEncounterCreatureListSourceEntry,
  type ExistingAreaEncounterCreatureListMutation,
  type ExistingAreaEncounterCreatureListResolvedMutation,
} from "../../../domain/area-encounter-creature-single-spawn";
import {
  areaEncounterSpawnPointSourceEntriesEqual,
  parseAreaEncounterSpawnPointListMutation,
  parseAreaEncounterSpawnPointListProvenance,
  type AreaEncounterSpawnPointSourceEntry,
  type ExistingAreaEncounterSpawnPointListMutation,
} from "../../../domain/area-encounter-spawn-point-list";
import {
  AREA_STORE_COMMERCE_FIELDS,
  areaStoreCommerceValueEqual,
  readAreaStoreCommerceMutation,
  readAreaStoreCommerceValue,
  type ExistingAreaStoreCommerceMutation,
  type AreaStoreCommerceValue,
} from "../../../domain/area-store-commerce";
import {
  AREA_STORE_SCRIPT_RESREF_FIELDS,
  areaStoreScriptResRefsValueEqual,
  readAreaStoreScriptResRefsMutation,
  readAreaStoreScriptResRefsValue,
  type AreaStoreScriptResRefsValue,
  type ExistingAreaStoreScriptResRefsMutation,
} from "../../../domain/area-store-script-resrefs";
import {
  parseAreaStoreVariableMutation,
  type AreaStoreVariableSourceEntry,
  type AreaStoreVariableTargetEntry,
  type ExistingAreaStoreVariableMutation,
} from "../../../domain/area-store-variable-table";
import {
  AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
  areaStoreRestrictionTargetsEqual,
  areaStoreRestrictionsRawMatchesExpected,
  readAreaStoreRestrictionsRawStorage,
  readExistingAreaStoreRestrictionsMutation,
  type AreaStoreRestrictionsRawStorage,
  type ExistingAreaStoreRestrictionsMutation,
} from "../../../domain/area-store-restrictions";
import {
  AREA_STORE_INVENTORY_BUCKET_TYPE_IDS,
  MAX_AREA_STORE_INVENTORY_ENTRIES,
  areaStoreInventoryRawMatchesExpected,
  packAreaStoreInventoryBuckets,
  readAreaStoreInventoryRawStorage,
  readExistingAreaStoreInventoryMutation,
  type AreaStoreInventoryRawStorage,
  type ExistingAreaStoreInventoryMutation,
} from "../../../domain/area-store-inventory";
import {
  readExistingAreaItemTagMutation,
  type ExistingAreaItemTagMutation,
} from "../../../domain/area-item-tag";
import {
  readExistingAreaTriggerTagMutation,
  type ExistingAreaTriggerTagMutation,
} from "../../../domain/area-trigger-tag";
import {
  readExistingAreaTriggerTemplateResRefMutation,
  type ExistingAreaTriggerTemplateResRefMutation,
} from "../../../domain/area-trigger-template-resref";
import {
  MAX_AREA_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
  readExistingAreaTriggerLocalizedNameMutation,
  type ExistingAreaTriggerLocalizedNameMutation,
} from "../../../domain/area-trigger-localized-name";
import {
  isAreaTriggerEditorComment,
  type ExistingAreaTriggerEditorCommentMutation,
} from "../../../domain/area-trigger-editor-comment";
import {
  AREA_TRIGGER_SCRIPT_RESREF_FIELDS,
  areaTriggerScriptResRefsStoragesEqual,
  readAreaTriggerScriptResRefsStorage,
  readExistingAreaTriggerScriptResRefsMutation,
  type AreaTriggerScriptResRefsStorage,
  type ExistingAreaTriggerScriptResRefsMutation,
} from "../../../domain/area-trigger-script-resrefs";
import {
  areaTriggerTransitionStorageEqual,
  isAreaTriggerTransitionStorage,
  readExistingAreaTriggerTransitionStorageMutation,
  type AreaTriggerTransitionStorage,
  type ExistingAreaTriggerTransitionStorageMutation,
} from "../../../domain/area-trigger-transition-storage";
import {
  readExistingAreaEncounterTagMutation,
  type ExistingAreaEncounterTagMutation,
} from "../../../domain/area-encounter-tag";
import {
  readExistingAreaEncounterTemplateResRefMutation,
  type ExistingAreaEncounterTemplateResRefMutation,
} from "../../../domain/area-encounter-template-resref";
import {
  readExistingAreaWaypointTagMutation,
  type ExistingAreaWaypointTagMutation,
} from "../../../domain/area-waypoint-tag";
import {
  readExistingAreaWaypointTemplateResRefMutation,
  type ExistingAreaWaypointTemplateResRefMutation,
} from "../../../domain/area-waypoint-template-resref";
import {
  MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
  readExistingAreaWaypointLocalizedNameMutation,
  type ExistingAreaWaypointLocalizedNameMutation,
} from "../../../domain/area-waypoint-localized-name";
import {
  MAX_AREA_WAYPOINT_DESCRIPTION_ASCII_BYTES,
  readExistingAreaWaypointDescriptionMutation,
  type ExistingAreaWaypointDescriptionMutation,
} from "../../../domain/area-waypoint-description";
import {
  MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES,
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
  readExistingAreaEncounterActiveMutation,
  type ExistingAreaEncounterActiveMutation,
} from "../../../domain/area-encounter-active";
import {
  readExistingAreaEncounterPlayerOnlyMutation,
  type ExistingAreaEncounterPlayerOnlyMutation,
} from "../../../domain/area-encounter-player-only";
import {
  readExistingAreaEncounterResetMutation,
  type ExistingAreaEncounterResetMutation,
} from "../../../domain/area-encounter-reset";
import {
  readAreaEncounterResetTimeStorage,
  readExistingAreaEncounterResetTimeMutation,
  type ExistingAreaEncounterResetTimeMutation,
} from "../../../domain/area-encounter-reset-time";
import {
  readAreaEncounterSpawnOptionStorage,
  readExistingAreaEncounterSpawnOptionMutation,
  type ExistingAreaEncounterSpawnOptionMutation,
} from "../../../domain/area-encounter-spawn-option";
import {
  readAreaEncounterRespawnsStorage,
  readExistingAreaEncounterRespawnsMutation,
  type ExistingAreaEncounterRespawnsMutation,
} from "../../../domain/area-encounter-respawns";
import {
  readAreaEncounterCreatureCountStorage,
  readExistingAreaEncounterCreatureCountMutation,
  type ExistingAreaEncounterCreatureCountMutation,
} from "../../../domain/area-encounter-creature-counts";
import {
  AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS,
  areaEncounterScriptResRefsStoragesEqual,
  readAreaEncounterScriptResRefsStorage,
  readExistingAreaEncounterScriptResRefsMutation,
  type AreaEncounterScriptResRefsStorage,
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
  MAX_AREA_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES,
  readExistingAreaEncounterLocalizedNameMutation,
  type ExistingAreaEncounterLocalizedNameMutation,
} from "../../../domain/area-encounter-localized-name";
import {
  readExistingAreaItemTemplateResRefMutation,
  type ExistingAreaItemTemplateResRefMutation,
} from "../../../domain/area-item-template-resref";
import {
  AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS,
  readExistingAreaItemLocalizedStringMutations,
  type ExistingAreaItemLocalizedStringMutation,
} from "../../../domain/area-item-localized-string-mutation";
import {
  AREA_ITEM_INSTANCE_STATE_DEFAULTS,
  AREA_ITEM_INSTANCE_STATE_FIELDS,
  areaItemInstanceStateStorageEqual,
  areaItemInstanceStateValueEqual,
  readAreaItemInstanceStateMutation,
  readAreaItemInstanceStateStorage,
  type AreaItemInstanceStateStorage,
  type AreaItemInstanceStateValue,
  type ExistingAreaItemInstanceStateMutation,
} from "../../../domain/area-item-instance-state";
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
  parseAreaPlaceableVariableMutation,
  parseAreaPlaceableVariableTargetEntries,
  type AreaPlaceableVariableSourceEntry,
  type AreaPlaceableVariableTargetEntry,
  type ExistingAreaPlaceableVariableMutation,
} from "../../../domain/area-placeable-variable-table";
import {
  parseAreaCreatureVariableMutation,
  type AreaCreatureVariableSourceEntry,
  type AreaCreatureVariableTargetEntry,
  type ExistingAreaCreatureVariableMutation,
} from "../../../domain/area-creature-variable-table";
import {
  parseAreaItemVariableMutation,
  parseAreaItemVariableTargetEntries,
  type AreaItemVariableSourceEntry,
  type AreaItemVariableTargetEntry,
  type ExistingAreaItemVariableMutation,
} from "../../../domain/area-item-variable-table";
import {
  parseAreaItemPropertyListMutation,
  parseAreaItemPropertyListTargetEntries,
  type AreaItemPropertyListSourceEntry,
  type AreaItemPropertyListTargetEntry,
  type ExistingAreaItemPropertyListMutation,
} from "../../../domain/area-item-property-list";
import {
  AREA_ITEM_ARMOR_PART_KEYS,
  AREA_ITEM_MATERIAL_COLOR_KEYS,
  itemBaseAppearanceRawMatchesValue,
  readExistingAreaItemBaseAppearanceMutation,
  readItemBaseAppearanceRawStorage,
  type AreaItemBaseAppearanceRawStorage,
  type AreaItemBaseAppearanceValue,
  type ExistingAreaItemBaseAppearanceMutation,
} from "../../../domain/area-item-base-appearance";
import {
  isAreaPlaceableTemplateResRef,
  type ExistingAreaPlaceableTemplateResRefMutation,
} from "../../../domain/area-placeable-template-resref";
import {
  readExistingAreaPlaceableHitPointMutation,
  type ExistingAreaPlaceableHitPointMutation,
} from "../../../domain/area-placeable-hit-points";
import {
  readExistingAreaPlaceableTagMutation,
  type ExistingAreaPlaceableTagMutation,
} from "../../../domain/area-placeable-tag";
import {
  AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS,
  readExistingAreaPlaceableLocalizedStringMutations,
  type ExistingAreaPlaceableLocalizedStringMutation,
} from "../../../domain/area-placeable-localized-string-mutation";
import {
  readExistingAreaDoorTransitionStorageMutation,
  type ExistingAreaDoorTransitionStorageMutation as ExistingAreaDoorTransitionStorageValueMutation,
} from "../../../domain/area-door-transition-storage";
import {
  MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE,
  areaObjectPolygonGeometriesEqual,
  readAreaObjectPolygonGeometry,
  readExistingAreaObjectPolygonMutation,
  type AreaObjectPolygonGeometry,
  type ExistingAreaObjectPolygonMutation,
} from "../../../domain/area-object-polygon-geometry";
import {
  MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE,
  pitchVariationFloat32FromHundredths,
  readExistingAreaSoundIntervalVariationMutation,
  type ExistingAreaSoundIntervalVariationMutation,
} from "../../../domain/area-sound-interval-variation-storage";
import {
  MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundVolumeMutation,
  type ExistingAreaSoundVolumeMutation,
} from "../../../domain/area-sound-volume-storage";
import {
  MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundScheduleMutation,
  type ExistingAreaSoundScheduleMutation,
} from "../../../domain/area-sound-schedule-storage";
import {
  MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundActiveMutation,
  type ExistingAreaSoundActiveMutation,
} from "../../../domain/area-sound-active-storage";
import {
  MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundPlayOrderMutation,
  type ExistingAreaSoundPlayOrderMutation,
} from "../../../domain/area-sound-play-order-storage";
import {
  MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE,
  readExistingAreaSoundPlayStyleMutation,
  type AreaSoundPlayStyleStorage,
  type ExistingAreaSoundPlayStyleMutation,
} from "../../../domain/area-sound-play-style-storage";
import {
  areaSoundPlaybackStoragesEqual,
  isAreaSoundResRef,
  MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE,
  readAreaSoundPlaybackStorage,
  readExistingAreaSoundPlaybackMutation,
  type AreaSoundPlaybackStorage,
  type ExistingAreaSoundPlaybackMutation,
} from "../../../domain/area-sound-playback-storage";
import {
  areaSoundProfileStoragesEqual,
  MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE,
  readAreaSoundProfileStorage,
  readExistingAreaSoundProfileMutation,
  type AreaSoundProfileStorage,
  type ExistingAreaSoundProfileMutation,
} from "../../../domain/area-sound-profile-storage";

export type AreaObjectPairKind =
  | "creature"
  | "door"
  | "encounter"
  | "item"
  | "placeable"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";

export interface AreaObjectPairCounts {
  readonly creature: number;
  readonly door: number;
  readonly encounter: number;
  readonly item: number;
  readonly placeable: number;
  readonly sound: number;
  readonly store: number;
  readonly trigger: number;
  readonly waypoint: number;
}

export interface AreaObjectPairInspection {
  readonly counts: AreaObjectPairCounts;
  readonly total: number;
}

export interface ExistingAreaObjectDeletion {
  readonly kind: AreaObjectPairKind;
  readonly sourceIndex: number;
}

export interface ExistingAreaCreatureTransform {
  readonly kind: "creature";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ExistingAreaEncounterPositionTransform {
  readonly kind: "encounter";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ExistingAreaPlaceableTransform {
  readonly kind: "placeable";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ExistingAreaItemTransform {
  readonly kind: "item";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ExistingAreaWaypointTransform {
  readonly kind: "waypoint";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ExistingAreaSoundTransform {
  readonly kind: "sound";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ExistingAreaStoreTransform {
  readonly kind: "store";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface ExistingAreaTriggerPositionTransform {
  readonly kind: "trigger";
  readonly sourceIndex: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export type ExistingAreaObjectTransform =
  | ExistingAreaCreatureTransform
  | ExistingAreaEncounterPositionTransform
  | ExistingAreaItemTransform
  | ExistingAreaPlaceableTransform
  | ExistingAreaSoundTransform
  | ExistingAreaStoreTransform
  | ExistingAreaTriggerPositionTransform
  | ExistingAreaWaypointTransform;

export interface ExistingAreaPlaceablePropertyMutation {
  readonly kind: "placeable";
  readonly sourceIndex: number;
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
  readonly scripts?: readonly ExistingAreaPlaceableScriptResRefMutation[];
  readonly trapScripts?: readonly ExistingAreaPlaceableTrapScriptResRefMutation[];
  readonly lockFields?: readonly ExistingAreaPlaceableLockMutation[];
  readonly keyName?: ExistingAreaPlaceableKeyNameMutation;
  readonly inventory?: ExistingAreaPlaceableInventoryMutation;
  readonly basicByteFields?: readonly ExistingAreaPlaceableBasicByteMutation[];
  readonly conversation?: ExistingAreaPlaceableConversationMutation;
  readonly interruptable?: ExistingAreaPlaceableInterruptableMutation;
  readonly trapFields?: readonly ExistingAreaPlaceableTrapByteMutation[];
  readonly animationState?: ExistingAreaPlaceableAnimationStateMutation;
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

export interface ExistingAreaCreaturePropertyMutation {
  readonly kind: "creature";
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
  readonly inventory?: ExistingAreaCreatureInventoryMutation;
  readonly equipment?: ExistingAreaCreatureEquipmentMutation;
}

export interface ExistingAreaItemPropertyMutation {
  readonly kind: "item";
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaItemTagMutation;
  readonly templateResRef?: ExistingAreaItemTemplateResRefMutation;
  readonly instanceState?: ExistingAreaItemInstanceStateMutation;
  readonly editorComment?: ExistingAreaItemEditorCommentMutation;
  readonly localizedStrings?: readonly ExistingAreaItemLocalizedStringMutation[];
  readonly variables?: ExistingAreaItemVariableMutation;
  readonly propertyList?: ExistingAreaItemPropertyListMutation;
  readonly baseAppearance?: ExistingAreaItemBaseAppearanceMutation;
  readonly inventory?: ExistingAreaItemInventoryMutation;
  readonly visualTransform?: AreaItemVisualTransformMutation;
}

export interface ExistingAreaTriggerPropertyMutation {
  readonly kind: "trigger";
  readonly sourceIndex: number;
  readonly tag?: ExistingAreaTriggerTagMutation;
  readonly templateResRef?: ExistingAreaTriggerTemplateResRefMutation;
  readonly localizedName?: ExistingAreaTriggerLocalizedNameMutation;
  readonly editorComment?: ExistingAreaTriggerEditorCommentMutation;
  readonly scripts?: ExistingAreaTriggerScriptResRefsMutation;
  readonly transitionStorage?: ExistingAreaTriggerTransitionStorageMutation;
}

export interface ExistingAreaWaypointPropertyMutation {
  readonly kind: "waypoint";
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

export interface ExistingAreaEncounterPropertyMutation {
  readonly kind: "encounter";
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
  readonly creatureList?:
    | ExistingAreaEncounterCreatureListMutation
    | ExistingAreaEncounterCreatureListResolvedMutation;
  readonly spawnPoints?: ExistingAreaEncounterSpawnPointListMutation;
  readonly editorComment?: ExistingAreaEncounterEditorCommentMutation;
}

export interface ExistingAreaStorePropertyMutation {
  readonly kind: "store";
  readonly sourceIndex: number;
  readonly editorComment?: ExistingAreaStoreEditorCommentMutation;
  readonly commerce?: ExistingAreaStoreCommerceMutation;
  readonly scripts?: ExistingAreaStoreScriptResRefsMutation;
  readonly variables?: ExistingAreaStoreVariableMutation;
  readonly restrictions?: ExistingAreaStoreRestrictionsMutation;
  readonly inventory?: ExistingAreaStoreInventoryMutation;
}

export type ExistingAreaItemInventorySourceEntry = AreaItemInventorySourceEntry;

export interface ExistingAreaItemInventoryBlueprintEntry
  extends AreaItemInventoryBlueprintEntry {
  readonly blueprintBytes?: Buffer;
  readonly resolvedModelType?: 0 | 1 | 2 | 3;
  readonly blueprintDependencies?: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
    resolvedModelType: 0 | 1 | 2 | 3;
  }>[];
}

export type ExistingAreaItemInventoryTargetEntry =
  | ExistingAreaItemInventorySourceEntry
  | ExistingAreaItemInventoryBlueprintEntry;

export interface ExistingAreaItemInventoryMutation {
  readonly expectedEntries: readonly ExistingAreaItemInventorySourceEntry[];
  readonly entries: readonly ExistingAreaItemInventoryTargetEntry[];
}

export type ExistingAreaCreatureInventorySourceEntry = AreaCreatureInventorySourceEntry;

export interface ExistingAreaCreatureInventoryBlueprintEntry
  extends AreaCreatureInventoryBlueprintEntry {
  readonly blueprintBytes?: Buffer;
}

export type ExistingAreaCreatureInventoryTargetEntry =
  | ExistingAreaCreatureInventorySourceEntry
  | ExistingAreaCreatureInventoryBlueprintEntry;

export interface ExistingAreaCreatureInventoryMutation {
  readonly expectedEntries: readonly ExistingAreaCreatureInventorySourceEntry[];
  readonly entries: readonly ExistingAreaCreatureInventoryTargetEntry[];
}

export type ExistingAreaCreatureEquipmentSourceEntry = AreaCreatureEquipmentSourceEntry;

export type ExistingAreaCreatureEquipmentTargetEntry = AreaCreatureEquipmentTargetEntry;

export interface ExistingAreaCreatureEquipmentMutation {
  readonly expectedEntries: readonly ExistingAreaCreatureEquipmentSourceEntry[];
  readonly entries: readonly ExistingAreaCreatureEquipmentTargetEntry[];
}

export type ExistingAreaPlaceableInventorySourceEntry = AreaPlaceableInventorySourceEntry;

export interface ExistingAreaPlaceableInventoryBlueprintEntry
  extends AreaPlaceableInventoryBlueprintEntry {
  readonly blueprintBytes?: Buffer;
}

export type ExistingAreaPlaceableInventoryTargetEntry =
  | ExistingAreaPlaceableInventorySourceEntry
  | ExistingAreaPlaceableInventoryBlueprintEntry;

export interface ExistingAreaPlaceableInventoryMutation {
  readonly expectedEntries: readonly ExistingAreaPlaceableInventorySourceEntry[];
  readonly entries: readonly ExistingAreaPlaceableInventoryTargetEntry[];
}

export interface ExistingAreaPlaceableScriptResRefMutation {
  readonly field: ExistingAreaPlaceableScriptField;
  readonly expectedResRef: string;
  readonly resRef: string;
}

export interface ExistingAreaPlaceableTrapScriptResRefMutation {
  readonly field: ExistingAreaPlaceableTrapScriptField;
  readonly expectedResRef: string;
  readonly resRef: string;
}

export interface ExistingAreaPlaceableLockMutation {
  readonly field: ExistingAreaPlaceableLockField;
  readonly expectedValue: ExistingAreaPlaceableLockValue;
  readonly value: ExistingAreaPlaceableLockValue;
}

export interface ExistingAreaPlaceableKeyNameMutation {
  readonly expectedValue: string;
  readonly value: string;
}

export type ExistingAreaPlaceableOnUsedMutation = ExistingAreaPlaceablePropertyMutation;

export type ExistingAreaObjectPropertyMutation =
  | ExistingAreaPlaceablePropertyMutation
  | ExistingAreaCreaturePropertyMutation
  | ExistingAreaItemPropertyMutation
  | ExistingAreaStorePropertyMutation
  | ExistingAreaTriggerPropertyMutation
  | ExistingAreaWaypointPropertyMutation
  | ExistingAreaEncounterPropertyMutation;

export interface ExistingAreaDoorTransitionStorageMutation {
  readonly kind: "door";
  readonly sourceIndex: number;
  readonly transition: ExistingAreaDoorTransitionStorageValueMutation;
}

interface NewAreaObjectAdditionBase {
  readonly localObjectId: string;
  readonly sourceProfileId: string;
  readonly templateResRef: string;
  readonly resRef: string;
  readonly tag: string;
  readonly sourceSha256: string;
  readonly blueprintBytes: Buffer;
  readonly blueprintDependencies?: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
    resolvedModelType?: 0 | 1 | 2 | 3;
  }>[];
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly bearing: number;
}

export interface NewAreaWaypointAddition extends NewAreaObjectAdditionBase {
  readonly kind: "waypoint";
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
}

export interface NewAreaCreatureAddition extends NewAreaObjectAdditionBase {
  readonly kind: "creature";
}

export interface NewAreaDoorAddition extends NewAreaObjectAdditionBase {
  readonly kind: "door";
  readonly doorHook: Readonly<{
    profileId: string;
    tilesetResRef: string;
    tilesetSha256: string;
    tileId: number;
    tileOrientation: number;
    tileHeight: number;
    hookIndex: number;
    hookType: number;
    localX: number;
    localY: number;
    localZ: number;
    orientationDegrees: number;
    row: number;
    col: number;
  }>;
}

export interface NewAreaEncounterAddition extends NewAreaObjectAdditionBase {
  readonly kind: "encounter";
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
}

export interface NewAreaSoundAddition extends NewAreaObjectAdditionBase {
  readonly kind: "sound";
}

export interface NewAreaPlaceableAddition extends NewAreaObjectAdditionBase {
  readonly kind: "placeable";
  readonly sourceObjectKey?: string;
  readonly resolvedPortraitId?: number;
}

export interface NewAreaItemAddition extends NewAreaObjectAdditionBase {
  readonly kind: "item";
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
  readonly resolvedModelType?: 0 | 1 | 2 | 3;
}

export interface NewAreaStoreAddition extends NewAreaObjectAdditionBase {
  readonly kind: "store";
  readonly sourceObjectKey?: string;
  readonly sourceSizeBytes?: number;
}

export interface NewAreaTriggerAddition extends NewAreaObjectAdditionBase {
  readonly kind: "trigger";
}

export type NewAreaObjectAddition =
  | NewAreaCreatureAddition
  | NewAreaDoorAddition
  | NewAreaEncounterAddition
  | NewAreaItemAddition
  | NewAreaPlaceableAddition
  | NewAreaSoundAddition
  | NewAreaStoreAddition
  | NewAreaTriggerAddition
  | NewAreaWaypointAddition;

export interface ExistingAreaObjectPairMutationResult {
  readonly gitBytes: Buffer;
  readonly gicBytes: Buffer;
  readonly source: AreaObjectPairInspection;
  readonly candidate: AreaObjectPairInspection;
  readonly deletedCounts: AreaObjectPairCounts;
  readonly transformedCounts: AreaObjectPairCounts;
  readonly propertyUpdatedCounts: AreaObjectPairCounts;
  readonly polygonUpdatedCounts: AreaObjectPairCounts;
  readonly soundIntervalVariationUpdatedCounts: AreaObjectPairCounts;
  readonly soundVolumeUpdatedCounts: AreaObjectPairCounts;
  readonly soundScheduleUpdatedCounts: AreaObjectPairCounts;
  readonly soundActiveUpdatedCounts: AreaObjectPairCounts;
  readonly soundPlayOrderUpdatedCounts: AreaObjectPairCounts;
  readonly soundPlayStyleUpdatedCounts: AreaObjectPairCounts;
  readonly soundPlaybackUpdatedCounts: AreaObjectPairCounts;
  readonly soundProfileUpdatedCounts: AreaObjectPairCounts;
  readonly addedCounts: AreaObjectPairCounts;
}

export type AreaObjectPairMutationErrorCode =
  | "AREA_UPDATE_COMPANION_MISMATCH"
  | "AREA_UPDATE_OBJECT_MUTATION_INVALID";

export class AreaObjectPairMutationError extends Error {
  constructor(
    readonly code: AreaObjectPairMutationErrorCode,
    message: string,
    readonly diagnostics: readonly string[] = [],
  ) {
    super(message);
    this.name = "AreaObjectPairMutationError";
  }
}

interface AreaObjectFamilyProfile {
  readonly kind: AreaObjectPairKind;
  readonly label: string;
  readonly structTypeId: number;
}

const FAMILY_PROFILES: readonly AreaObjectFamilyProfile[] = Object.freeze([
  Object.freeze({ kind: "creature", label: "Creature List", structTypeId: 4 }),
  Object.freeze({ kind: "door", label: "Door List", structTypeId: 8 }),
  Object.freeze({ kind: "encounter", label: "Encounter List", structTypeId: 7 }),
  Object.freeze({ kind: "item", label: "List", structTypeId: 0 }),
  Object.freeze({ kind: "placeable", label: "Placeable List", structTypeId: 9 }),
  Object.freeze({ kind: "sound", label: "SoundList", structTypeId: 6 }),
  Object.freeze({ kind: "store", label: "StoreList", structTypeId: 11 }),
  Object.freeze({ kind: "trigger", label: "TriggerList", structTypeId: 1 }),
  Object.freeze({ kind: "waypoint", label: "WaypointList", structTypeId: 5 }),
]);

type RawDocument = NonNullable<ReturnType<typeof parseRawGffDocument>>;
type GffListField = Extract<SupportedGffField, { type: "list" }>;

export function inspectAreaGitGicPair(
  gitBytes: Buffer,
  gicBytes: Buffer,
): AreaObjectPairInspection {
  return inspectParsedPair(parsePair(gitBytes, gicBytes));
}

export function mutateExistingAreaObjectsInGitGic(input: Readonly<{
  sourceGit: Buffer;
  sourceGic: Buffer;
  deletions: readonly ExistingAreaObjectDeletion[];
  transforms?: readonly ExistingAreaObjectTransform[];
  propertyMutations?: readonly ExistingAreaObjectPropertyMutation[];
  doorTransitionMutations?: readonly ExistingAreaDoorTransitionStorageMutation[];
  polygonMutations?: readonly ExistingAreaObjectPolygonMutation[];
  soundIntervalVariationMutations?: readonly ExistingAreaSoundIntervalVariationMutation[];
  soundVolumeMutations?: readonly ExistingAreaSoundVolumeMutation[];
  soundScheduleMutations?: readonly ExistingAreaSoundScheduleMutation[];
  soundActiveMutations?: readonly ExistingAreaSoundActiveMutation[];
  soundPlayOrderMutations?: readonly ExistingAreaSoundPlayOrderMutation[];
  soundPlayStyleMutations?: readonly ExistingAreaSoundPlayStyleMutation[];
  soundPlaybackMutations?: readonly ExistingAreaSoundPlaybackMutation[];
  soundProfileMutations?: readonly ExistingAreaSoundProfileMutation[];
  additions?: readonly NewAreaObjectAddition[];
}>): ExistingAreaObjectPairMutationResult {
  const parsed = parsePair(input.sourceGit, input.sourceGic);
  const source = inspectParsedPair(parsed);
  const deletionIndexes = normalizeDeletionIndexes(input.deletions, source.counts);
  const transforms = normalizeObjectTransforms(
    input.transforms ?? [],
    source.counts,
    deletionIndexes,
  );
  const deletedCounts = countsFrom((profile) => deletionIndexes.get(profile.kind)?.size ?? 0);
  const transformedCounts = countsFrom((profile) => countTransforms(transforms, profile.kind));
  const propertyMutations = normalizeObjectPropertyMutations(
    input.propertyMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const doorTransitionMutations = normalizeDoorTransitionMutations(
    input.doorTransitionMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const propertyUpdatedCounts = countsFrom(
    (profile) => countPropertyMutations(propertyMutations, doorTransitionMutations, profile.kind),
  );
  const polygonMutations = normalizePolygonMutations(
    input.polygonMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const polygonUpdatedCounts = countsFrom(
    (profile) => countPolygonMutations(polygonMutations, profile.kind),
  );
  const soundIntervalVariationMutations = normalizeSoundIntervalVariationMutations(
    input.soundIntervalVariationMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundIntervalVariationUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundIntervalVariationMutations.size : 0,
  );
  const soundVolumeMutations = normalizeSoundVolumeMutations(
    input.soundVolumeMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundVolumeUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundVolumeMutations.size : 0,
  );
  const soundScheduleMutations = normalizeSoundScheduleMutations(
    input.soundScheduleMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundScheduleUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundScheduleMutations.size : 0,
  );
  const soundActiveMutations = normalizeSoundActiveMutations(
    input.soundActiveMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundActiveUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundActiveMutations.size : 0,
  );
  const soundPlayOrderMutations = normalizeSoundPlayOrderMutations(
    input.soundPlayOrderMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundPlayOrderUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundPlayOrderMutations.size : 0,
  );
  const soundPlayStyleMutations = normalizeSoundPlayStyleMutations(
    input.soundPlayStyleMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  const soundPlayStyleUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundPlayStyleMutations.size : 0,
  );
  const soundPlaybackMutations = normalizeSoundPlaybackMutations(
    input.soundPlaybackMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  for (const [key, mutation] of soundPlaybackMutations) {
    if (soundPlayStyleMutations.has(key)) {
      throw mutationInvalid(
        "A Sound playback mutation cannot coexist with a legacy Play Style mutation.",
        [`sound:index=${mutation.sourceIndex}`],
      );
    }
  }
  const soundPlaybackUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundPlaybackMutations.size : 0,
  );
  const soundProfileMutations = normalizeSoundProfileMutations(
    input.soundProfileMutations ?? [],
    source.counts,
    deletionIndexes,
  );
  for (const [key, mutation] of soundProfileMutations) {
    if (soundPlaybackMutations.has(key) || soundPlayStyleMutations.has(key)) {
      throw mutationInvalid(
        "A Sound profile mutation cannot coexist with a playback or legacy Play Style mutation.",
        [`sound:index=${mutation.sourceIndex}`],
      );
    }
  }
  const soundProfileUpdatedCounts = countsFrom(
    (profile) => profile.kind === "sound" ? soundProfileMutations.size : 0,
  );
  const additions = normalizeObjectAdditions(input.additions ?? []);
  validateDoorAdditionOccupancy(
    parsed.git,
    input.additions ?? [],
    deletionIndexes.get("door") ?? new Set<number>(),
  );
  const addedCounts = countsFrom((profile) => additions.filter((addition) => addition.kind === profile.kind).length);
  const deletedTotal = sumCounts(deletedCounts);
  const hasGitPropertyMutations = doorTransitionMutations.size > 0 ||
    [...propertyMutations.values()].some(hasGitPropertyMutation);
  const hasEditorCommentMutations = [...propertyMutations.values()].some(
    (mutation) => mutation.editorComment !== undefined,
  );

  if (
    deletedTotal === 0 &&
    transforms.size === 0 &&
    propertyMutations.size === 0 &&
    doorTransitionMutations.size === 0 &&
    polygonMutations.size === 0 &&
    soundIntervalVariationMutations.size === 0 &&
    soundVolumeMutations.size === 0 &&
    soundScheduleMutations.size === 0 &&
    soundActiveMutations.size === 0 &&
    soundPlayOrderMutations.size === 0 &&
    soundPlayStyleMutations.size === 0 &&
    soundPlaybackMutations.size === 0 &&
    soundProfileMutations.size === 0 &&
    additions.length === 0
  ) {
    return Object.freeze({
      gitBytes: Buffer.from(input.sourceGit),
      gicBytes: Buffer.from(input.sourceGic),
      source,
      candidate: source,
      deletedCounts,
      transformedCounts,
      propertyUpdatedCounts,
      polygonUpdatedCounts,
      soundIntervalVariationUpdatedCounts,
      soundVolumeUpdatedCounts,
      soundScheduleUpdatedCounts,
      soundActiveUpdatedCounts,
      soundPlayOrderUpdatedCounts,
      soundPlayStyleUpdatedCounts,
      soundPlaybackUpdatedCounts,
      soundProfileUpdatedCounts,
      addedCounts,
    });
  }

  const candidateGit = deletedTotal === 0 &&
    transforms.size === 0 &&
    !hasGitPropertyMutations &&
    polygonMutations.size === 0 &&
    soundIntervalVariationMutations.size === 0 &&
    soundVolumeMutations.size === 0 &&
    soundScheduleMutations.size === 0 &&
    soundActiveMutations.size === 0 &&
    soundPlayOrderMutations.size === 0 &&
    soundPlayStyleMutations.size === 0 &&
    soundPlaybackMutations.size === 0 &&
    soundProfileMutations.size === 0 &&
    additions.length === 0
    ? Buffer.from(input.sourceGit)
    : rebuildDocument(
        parsed.git,
        deletionIndexes,
        "GIT ",
        transforms,
        propertyMutations,
        doorTransitionMutations,
        polygonMutations,
        soundIntervalVariationMutations,
        soundVolumeMutations,
        soundScheduleMutations,
        soundActiveMutations,
        soundPlayOrderMutations,
        soundPlayStyleMutations,
        soundPlaybackMutations,
        soundProfileMutations,
        additions,
      );
  const candidateGic = deletedTotal === 0 && additions.length === 0 && !hasEditorCommentMutations
    ? Buffer.from(input.sourceGic)
    : rebuildDocument(
        parsed.gic,
        deletionIndexes,
        "GIC ",
        new Map(),
        propertyMutations,
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        new Map(),
        additions,
      );
  const candidate = inspectAreaGitGicPair(candidateGit, candidateGic);
  for (const profile of FAMILY_PROFILES) {
    const expected = source.counts[profile.kind] - deletedCounts[profile.kind] + addedCounts[profile.kind];
    if (candidate.counts[profile.kind] !== expected) {
      throw companionMismatch("Candidate object cardinality differs from the admitted deletion set.", [
        `${profile.kind}:expected=${expected}:actual=${candidate.counts[profile.kind]}`,
      ]);
    }
  }
  verifyObjectTransforms(
    candidateGit,
    transforms,
    deletionIndexes,
    parsed.git,
    polygonMutations,
    propertyMutations,
  );
  verifyObjectPropertyMutations(
    candidateGit,
    propertyMutations,
    deletionIndexes,
    parsed.git,
    transforms,
  );
  verifyDoorTransitionMutations(
    candidateGit,
    doorTransitionMutations,
    deletionIndexes,
    parsed.git,
  );
  verifyPolygonMutations(
    candidateGit,
    polygonMutations,
    transforms,
    deletionIndexes,
    parsed.git,
  );
  verifySoundIntervalVariationMutations(
    candidateGit,
    soundIntervalVariationMutations,
    transforms,
    deletionIndexes,
    parsed.git,
    soundVolumeMutations,
    soundScheduleMutations,
    soundActiveMutations,
    soundPlayOrderMutations,
    soundPlayStyleMutations,
    soundPlaybackMutations,
    soundProfileMutations,
  );
  verifyObjectEditorCommentMutations(
    candidateGic,
    propertyMutations,
    deletionIndexes,
    parsed.gic,
    additions,
  );
  verifyAreaObjectAdditionsReadback(candidateGit, candidateGic, additions, source.counts, deletedCounts);

  return Object.freeze({
    gitBytes: candidateGit,
    gicBytes: candidateGic,
    source,
    candidate,
    deletedCounts,
    transformedCounts,
    propertyUpdatedCounts,
    polygonUpdatedCounts,
    soundIntervalVariationUpdatedCounts,
    soundVolumeUpdatedCounts,
    soundScheduleUpdatedCounts,
    soundActiveUpdatedCounts,
    soundPlayOrderUpdatedCounts,
    soundPlayStyleUpdatedCounts,
    soundPlaybackUpdatedCounts,
    soundProfileUpdatedCounts,
    addedCounts,
  });
}

function validateDoorAdditionOccupancy(
  git: RawDocument,
  additions: readonly NewAreaObjectAddition[],
  deletedDoorIndexes: ReadonlySet<number>,
): void {
  const doors = additions
    .map((addition, index) => ({ addition, index }))
    .filter((entry): entry is { addition: NewAreaDoorAddition; index: number } => entry.addition.kind === "door");
  const seen = new Map<string, number>();
  for (const { addition, index } of doors) {
    const key = `${addition.doorHook.row}:${addition.doorHook.col}:${addition.doorHook.hookIndex}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      throw mutationInvalid("Door hook is already occupied by another addition.", [
        `door:addition=${index}:hook_occupied_by_addition=${previous}`,
      ]);
    }
    seen.set(key, index);
  }
  const list = git.fields.find((field) => field.label === "Door List");
  if (list?.type !== "list") return;
  for (const { addition, index } of doors) {
    const expected = {
      X: Math.fround(addition.x * 10),
      Y: Math.fround(addition.y * 10),
      Z: Math.fround(addition.z * 10),
    } as const;
    const occupiedIndex = list.value.findIndex((entry, sourceIndex) => {
      if (deletedDoorIndexes.has(sourceIndex)) return false;
      return (Object.entries(expected) as Array<[keyof typeof expected, number]>).every(([label, value]) => {
        const matches = entry.fields.filter((field) => field.label === label);
        return matches.length === 1 && matches[0]!.type === "float" && matches[0]!.value === value;
      });
    });
    if (occupiedIndex >= 0) {
      throw mutationInvalid("Door hook is already occupied by a retained source door.", [
        `door:addition=${index}:hook_occupied_by_source=${occupiedIndex}`,
      ]);
    }
  }
}

export interface AreaObjectAdditionReadbackExpectation {
  readonly kind: "creature" | "door" | "encounter" | "item" | "placeable" | "sound" | "store" | "trigger" | "waypoint";
  readonly localObjectId: string;
  readonly git: GffListField["value"][number];
  readonly gic: GffListField["value"][number];
}

function normalizeObjectAdditions(
  input: readonly NewAreaObjectAddition[],
): readonly AreaObjectAdditionReadbackExpectation[] {
  if (input.length > MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE) {
    throw mutationInvalid("Too many object additions were requested in one Area update.", [
      `object:additions=${input.length}:max=${MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE}`,
    ]);
  }
  const seen = new Set<string>();
  return Object.freeze(input.map((addition, index) => {
    const kind = (addition as Readonly<{ kind: unknown }>).kind;
    if (
      kind !== "creature" &&
      kind !== "door" &&
      kind !== "encounter" &&
      kind !== "item" &&
      kind !== "placeable" &&
      kind !== "sound" &&
      kind !== "store" &&
      kind !== "trigger" &&
      kind !== "waypoint"
    ) {
      throw mutationInvalid("Object addition identifies an unsupported construction family.", [
        `object:addition=${index}:kind=${String(kind)}`,
      ]);
    }
    if (!/^[A-Za-z0-9_-]{1,80}$/u.test(addition.localObjectId)) {
      throw mutationInvalid("Object addition has an invalid local object identity.", [
        `${kind}:addition=${index}:local_object_id`,
      ]);
    }
    if (seen.has(addition.localObjectId)) {
      throw mutationInvalid("Object addition local object identities must be unique.", [
        `${kind}:addition=${index}:duplicate_local_object_id`,
      ]);
    }
    seen.add(addition.localObjectId);
    if (!Buffer.isBuffer(addition.blueprintBytes) || addition.blueprintBytes.length > 1024 * 1024) {
      throw mutationInvalid("Object blueprint bytes are missing or exceed the bounded source budget.", [
        `${kind}:addition=${index}:blueprint_size`,
      ]);
    }
    const actualSha256 = createHash("sha256").update(addition.blueprintBytes).digest("hex");
    if (!/^[a-f0-9]{64}$/u.test(addition.sourceSha256) || actualSha256 !== addition.sourceSha256) {
      throw mutationInvalid("Object blueprint digest differs from the verified source identity.", [
        `${kind}:addition=${index}:source_sha256_mismatch`,
      ]);
    }
    for (const [field, value] of Object.entries({
      x: addition.x,
      y: addition.y,
      z: addition.z,
      bearing: addition.bearing,
    })) {
      if (!Number.isFinite(value) || Math.abs(value) > 1_000_000) {
        throw mutationInvalid("Object addition contains a non-finite or out-of-range scene value.", [
          `${kind}:addition=${index}:${field}`,
        ]);
      }
    }
    if (kind === "creature") {
      return buildCreatureAddition(addition as NewAreaCreatureAddition, index);
    }
    if (kind === "door") {
      return buildDoorAddition(addition as NewAreaDoorAddition, index);
    }
    if (kind === "encounter") {
      return buildEncounterAddition(addition as NewAreaEncounterAddition, index);
    }
    if (kind === "item") {
      return buildItemAddition(addition as NewAreaItemAddition, index);
    }
    if (kind === "placeable") {
      return buildPlaceableAddition(addition as NewAreaPlaceableAddition, index);
    }
    if (kind === "store") {
      return buildStoreAddition(addition as NewAreaStoreAddition, index);
    }
    if (kind === "trigger") {
      return buildTriggerAddition(addition as NewAreaTriggerAddition, index);
    }
    return kind === "sound"
      ? buildSoundAddition(addition as NewAreaSoundAddition, index)
      : buildWaypointAddition(addition as NewAreaWaypointAddition, index);
  }));
}

function buildDoorAddition(
  addition: NewAreaDoorAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_DOOR_CONSTRUCTION_PROFILE;
  if (
    !document || document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Door blueprint is not the admitted native UTD V3.2 root profile.", [
      `door:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.sourceSha256 !== profile.sourceSha256 ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Door addition differs from the admitted immutable source profile.", [
      `door:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  const hook = addition.doorHook;
  const expectedHook = profile.hook;
  const hookIdentity = [
    ["profileId", expectedHook.profileId],
    ["tilesetResRef", expectedHook.tilesetResRef],
    ["tilesetSha256", expectedHook.tilesetSha256],
    ["tileId", expectedHook.tileId],
    ["tileOrientation", expectedHook.tileOrientation],
    ["tileHeight", expectedHook.tileHeight],
    ["hookIndex", expectedHook.hookIndex],
    ["hookType", expectedHook.hookType],
    ["localX", expectedHook.localX],
    ["localY", expectedHook.localY],
    ["localZ", expectedHook.localZ],
    ["orientationDegrees", expectedHook.orientationDegrees],
  ] as const;
  if (!hook || hookIdentity.some(([key, value]) => hook[key] !== value)) {
    throw mutationInvalid("Door addition identifies an unsupported tileset hook.", [
      `door:addition=${index}:hook_identity_mismatch`,
    ]);
  }
  if (!Number.isSafeInteger(hook.row) || hook.row < 0 || !Number.isSafeInteger(hook.col) || hook.col < 0) {
    throw mutationInvalid("Door hook row and column must be non-negative integers.", [
      `door:addition=${index}:hook_grid_invalid`,
    ]);
  }
  const expectedX = hook.col + 0.5 + expectedHook.localX / 10;
  const expectedY = hook.row + 0.5 + expectedHook.localY / 10;
  const expectedZ = expectedHook.localZ / 10;
  if (
    addition.x !== expectedX || addition.y !== expectedY || addition.z !== expectedZ ||
    addition.bearing !== expectedHook.sceneBearing
  ) {
    throw mutationInvalid("Door transform must be derived from the admitted tileset hook.", [
      `door:addition=${index}:hook_transform_mismatch`,
    ]);
  }

  const expectedLabels = [
    "Tag", "LocName", "Description", "TemplateResRef", "AutoRemoveKey",
    "CloseLockDC", "Conversation", "Interruptable", "Faction", "Plot",
    "KeyRequired", "Lockable", "Locked", "OpenLockDC", "PortraitId",
    "TrapDetectable", "TrapDetectDC", "TrapDisarmable", "DisarmDC", "TrapFlag",
    "TrapOneShot", "TrapType", "KeyName", "AnimationState", "Appearance", "HP",
    "CurrentHP", "Hardness", "Fort", "Ref", "Will", "OnClosed", "OnDamaged",
    "OnDeath", "OnDisarm", "OnHeartbeat", "OnLock", "OnMeleeAttacked", "OnOpen",
    "OnSpellCastAt", "OnTrapTriggered", "OnUnlock", "OnUserDefined", "LinkedTo",
    "LinkedToFlags", "LoadScreenID", "GenericType", "OnClick", "OnFailToOpen",
    "PaletteID", "Comment",
  ] as const;
  if (document.fields.length !== expectedLabels.length) {
    throw mutationInvalid("Door blueprint field profile is invalid.", [
      `door:addition=${index}:field_count=${document.fields.length}:expected=${expectedLabels.length}`,
    ]);
  }
  expectedLabels.forEach((label, fieldIndex) => {
    const actual = document.fields[fieldIndex]!;
    if (actual.label !== label) {
      throw mutationInvalid("Door blueprint field order is invalid.", [
        `door:addition=${index}:field=${fieldIndex}:label=${actual.label}:expected=${label}`,
      ]);
    }
  });
  const fields = new Map(document.fields.map((field) => [field.label, field]));
  const requireExact = (
    label: string,
    type: SupportedGffField["type"],
    value: unknown,
  ): SupportedGffField => {
    const field = fields.get(label);
    if (!field || field.type !== type || JSON.stringify(field.value) !== JSON.stringify(value)) {
      throw mutationInvalid("Door blueprint value profile is invalid.", [
        `door:addition=${index}:${label}:profile_mismatch`,
      ]);
    }
    return structuredClone(field);
  };
  const exactValues = new Map<string, readonly [SupportedGffField["type"], unknown]>([
    ["Tag", ["cexostring", "Barn1Door"]],
    ["LocName", ["cexolocstring", { strRef: 5349, entries: [] }]],
    ["TemplateResRef", ["resref", "nw_door_ttr_04"]],
    ["Appearance", ["dword", 0]],
    ["GenericType", ["byte", 0]],
    ["PaletteID", ["byte", 5]],
    ["Comment", ["cexostring", "Barn 1 Door"]],
  ]);
  for (const [label, [type, value]] of exactValues) requireExact(label, type, value);
  const sourceField = (label: string): SupportedGffField => structuredClone(fields.get(label)!);
  const gitLabels = [
    ...expectedLabels.slice(0, expectedLabels.indexOf("LinkedTo")),
    "OnClick",
    "LinkedTo", "LinkedToFlags", "LoadScreenID",
  ] as const;
  const gitFields: SupportedGffField[] = [
    ...gitLabels.map(sourceField),
    { label: "GenericType_New", type: "dword", value: 0 },
    sourceField("OnFailToOpen"),
  ];
  gitFields.push(
    { label: "X", type: "float", value: Math.fround(addition.x * 10) },
    { label: "Y", type: "float", value: Math.fround(addition.y * 10) },
    { label: "Z", type: "float", value: Math.fround(addition.z * 10) },
    { label: "Bearing", type: "float", value: expectedHook.nativeBearing },
  );
  return Object.freeze({
    kind: "door" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 8, fields: gitFields }),
    gic: Object.freeze({
      typeId: 8,
      fields: [{ label: "Comment", type: "cexostring" as const, value: "Barn 1 Door" }],
    }),
  });
}

function buildEncounterAddition(
  addition: NewAreaEncounterAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  if (addition.sourceProfileId === AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE.id) {
    return buildDynamicEncounterAddition(addition, index);
  }
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_ENCOUNTER_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Encounter blueprint is not the admitted native UTE V3.2 root profile.", [
      `encounter:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Encounter addition differs from the admitted immutable source profile.", [
      `encounter:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  if (addition.bearing !== 0) {
    throw mutationInvalid("Encounter addition does not admit rotation.", [
      `encounter:addition=${index}:bearing=${addition.bearing}:expected=0`,
    ]);
  }

  const expectedFields: readonly SupportedGffField[] = [
    { label: "Tag", type: "cexostring", value: "X2_GNOLL001" },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 91345, entries: [] } },
    { label: "TemplateResRef", type: "resref", value: "x2_gnoll001" },
    { label: "Active", type: "byte", value: 1 },
    { label: "Difficulty", type: "int", value: 0 },
    { label: "DifficultyIndex", type: "int", value: 2 },
    { label: "Faction", type: "dword", value: 1 },
    { label: "MaxCreatures", type: "int", value: 6 },
    { label: "PlayerOnly", type: "byte", value: 1 },
    { label: "RecCreatures", type: "int", value: 3 },
    { label: "Reset", type: "byte", value: 0 },
    { label: "ResetTime", type: "int", value: 60 },
    { label: "Respawns", type: "int", value: 0 },
    { label: "SpawnOption", type: "int", value: 1 },
    { label: "OnEntered", type: "resref", value: "" },
    { label: "OnExit", type: "resref", value: "" },
    { label: "OnExhausted", type: "resref", value: "" },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    {
      label: "CreatureList",
      type: "list",
      value: [
        {
          typeId: 0,
          fields: [
            { label: "Appearance", type: "int", value: 388 },
            { label: "CR", type: "float", value: 1 },
            { label: "ResRef", type: "resref", value: "nw_gnoll001" },
            { label: "SingleSpawn", type: "byte", value: 0 },
          ],
        },
        {
          typeId: 0,
          fields: [
            { label: "Appearance", type: "int", value: 389 },
            { label: "CR", type: "float", value: 3 },
            { label: "ResRef", type: "resref", value: "nw_gnoll002" },
            { label: "SingleSpawn", type: "byte", value: 1 },
          ],
        },
      ],
    },
    { label: "PaletteID", type: "byte", value: 5 },
    { label: "Comment", type: "cexostring", value: "" },
  ];
  if (document.fields.length !== expectedFields.length) {
    throw mutationInvalid("Encounter blueprint field profile is invalid.", [
      `encounter:addition=${index}:field_count=${document.fields.length}:expected=${expectedFields.length}`,
    ]);
  }
  for (let fieldIndex = 0; fieldIndex < expectedFields.length; fieldIndex += 1) {
    const expected = expectedFields[fieldIndex]!;
    const actual = document.fields[fieldIndex]!;
    if (actual.label !== expected.label) {
      throw mutationInvalid("Encounter blueprint field order is invalid.", [
        `encounter:addition=${index}:field=${fieldIndex}:label=${actual.label}:expected=${expected.label}`,
      ]);
    }
    if (actual.type !== expected.type) {
      throw mutationInvalid("Encounter blueprint field type profile is invalid.", [
        `encounter:addition=${index}:${expected.label}:type=${actual.type}:expected=${expected.type}`,
      ]);
    }
    if (JSON.stringify(actual.value) !== JSON.stringify(expected.value)) {
      throw mutationInvalid("Encounter blueprint value profile is invalid.", [
        `encounter:addition=${index}:${expected.label}:value_mismatch`,
      ]);
    }
  }

  const fields = new Map(document.fields.map((field) => [field.label, field]));
  const sourceField = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const gitFields: SupportedGffField[] = [
    sourceField("Tag"),
    sourceField("LocalizedName"),
    sourceField("TemplateResRef"),
    sourceField("Active"),
    sourceField("Difficulty"),
    sourceField("DifficultyIndex"),
    sourceField("Faction"),
    sourceField("MaxCreatures"),
    sourceField("PlayerOnly"),
    sourceField("RecCreatures"),
    sourceField("Reset"),
    sourceField("ResetTime"),
    sourceField("Respawns"),
    sourceField("SpawnOption"),
    sourceField("OnEntered"),
    sourceField("OnExit"),
    sourceField("OnExhausted"),
    sourceField("OnHeartbeat"),
    sourceField("OnUserDefined"),
    sourceField("CreatureList"),
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    {
      label: "Geometry",
      type: "list",
      value: profile.geometry.map((point) => ({
        typeId: 1,
        fields: [
          { label: "X", type: "float" as const, value: point.x },
          { label: "Y", type: "float" as const, value: point.y },
          { label: "Z", type: "float" as const, value: point.z },
        ],
      })),
    },
    { label: "SpawnPointList", type: "list", value: [] },
  ];
  return Object.freeze({
    kind: "encounter" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 7, fields: gitFields }),
    gic: Object.freeze({ typeId: 7, fields: [] }),
  });
}

const DYNAMIC_ENCOUNTER_ROOT_FIELD_TYPES = Object.freeze(new Map<string, SupportedGffField["type"]>([
  ["Tag", "cexostring"],
  ["LocalizedName", "cexolocstring"],
  ["TemplateResRef", "resref"],
  ["Active", "byte"],
  ["Difficulty", "int"],
  ["DifficultyIndex", "int"],
  ["Faction", "dword"],
  ["MaxCreatures", "int"],
  ["PlayerOnly", "byte"],
  ["RecCreatures", "int"],
  ["Reset", "byte"],
  ["ResetTime", "int"],
  ["Respawns", "int"],
  ["SpawnOption", "int"],
  ["OnEntered", "resref"],
  ["OnExit", "resref"],
  ["OnExhausted", "resref"],
  ["OnHeartbeat", "resref"],
  ["OnUserDefined", "resref"],
  ["VarTable", "list"],
  ["CreatureList", "list"],
  ["PaletteID", "byte"],
  ["Comment", "cexostring"],
]));

const DYNAMIC_ENCOUNTER_REQUIRED_FIELDS = Object.freeze([
  "Tag",
  "LocalizedName",
  "TemplateResRef",
  "Active",
  "Difficulty",
  "DifficultyIndex",
  "Faction",
  "MaxCreatures",
  "PlayerOnly",
  "RecCreatures",
  "Reset",
  "ResetTime",
  "Respawns",
  "SpawnOption",
  "OnEntered",
  "OnExit",
  "OnExhausted",
  "OnHeartbeat",
  "OnUserDefined",
  "CreatureList",
] as const);

const DYNAMIC_ENCOUNTER_SCRIPT_FIELDS = Object.freeze([
  "OnEntered",
  "OnExit",
  "OnExhausted",
  "OnHeartbeat",
  "OnUserDefined",
] as const);

function buildDynamicEncounterAddition(
  addition: NewAreaEncounterAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Dynamic Encounter blueprint has an unsupported GFF identity.", [
      `encounter:addition=${index}:gff_identity`,
    ]);
  }
  if (
    typeof addition.sourceObjectKey !== "string" ||
    addition.sourceObjectKey.trim().length < 1 ||
    addition.sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    addition.sourceObjectKey.includes("\0") ||
    !Number.isSafeInteger(addition.sourceSizeBytes) ||
    addition.sourceSizeBytes !== addition.blueprintBytes.length ||
    addition.blueprintBytes.length < 1 ||
    addition.blueprintBytes.length > profile.maxSourceBytes ||
    createHash("sha256").update(addition.blueprintBytes).digest("hex") !== addition.sourceSha256
  ) {
    throw mutationInvalid("Dynamic Encounter addition identity is invalid.", [
      `encounter:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  if (addition.bearing !== 0) {
    throw mutationInvalid("Encounter addition does not admit rotation.", [
      `encounter:addition=${index}:bearing=${addition.bearing}:expected=0`,
    ]);
  }

  const fields = new Map<string, SupportedGffField>();
  for (const field of document.fields) {
    const expectedType = DYNAMIC_ENCOUNTER_ROOT_FIELD_TYPES.get(field.label);
    if (!expectedType) {
      throw mutationInvalid("Dynamic Encounter blueprint contains an unsupported root field.", [
        `encounter:addition=${index}:${field.label}:${field.type}`,
      ]);
    }
    if (fields.has(field.label)) {
      throw mutationInvalid("Dynamic Encounter blueprint contains a duplicate root field.", [
        `encounter:addition=${index}:${field.label}:count=2`,
      ]);
    }
    if (field.type !== expectedType) {
      throw mutationInvalid("Dynamic Encounter blueprint field profile is invalid.", [
        `encounter:addition=${index}:${field.label}:type=${field.type}:expected=${expectedType}`,
      ]);
    }
    fields.set(field.label, field);
  }
  for (const label of DYNAMIC_ENCOUNTER_REQUIRED_FIELDS) {
    if (!fields.has(label)) {
      throw mutationInvalid("Dynamic Encounter blueprint is missing a required field.", [
        `encounter:addition=${index}:${label}:count=0`,
      ]);
    }
  }

  const templateResRef = fields.get("TemplateResRef")!;
  const tag = fields.get("Tag")!;
  if (
    templateResRef.type !== "resref" ||
    !/^[a-z0-9_]{1,16}$/u.test(templateResRef.value) ||
    addition.templateResRef !== templateResRef.value ||
    addition.resRef !== templateResRef.value ||
    tag.type !== "cexostring" ||
    tag.value.length < 1 ||
    tag.value.length > 256 ||
    tag.value.includes("\0") ||
    addition.tag !== tag.value
  ) {
    throw mutationInvalid("Dynamic Encounter source identity differs from retained provenance.", [
      `encounter:addition=${index}:source_identity_mismatch`,
    ]);
  }
  for (const label of ["Active", "PlayerOnly", "Reset"] as const) {
    const field = fields.get(label)!;
    if (field.type !== "byte" || (field.value !== 0 && field.value !== 1)) {
      throw mutationInvalid("Dynamic Encounter boolean blueprint field is non-canonical.", [
        `encounter:addition=${index}:${label}:value=${field.type === "byte" ? field.value : "invalid"}`,
      ]);
    }
  }
  for (const label of DYNAMIC_ENCOUNTER_SCRIPT_FIELDS) {
    const field = fields.get(label)!;
    if (field.type !== "resref" || !/^[A-Za-z0-9_]{0,16}$/u.test(field.value)) {
      throw mutationInvalid("Dynamic Encounter script field is non-canonical.", [
        `encounter:addition=${index}:${label}:resref`,
      ]);
    }
  }

  const varTableField = fields.get("VarTable");
  const varTable = varTableField?.type === "list" && varTableField.value.length > 0
    ? normalizeDynamicVariableTable(varTableField, index, "encounter")
    : undefined;
  const creatureListField = fields.get("CreatureList")!;
  if (creatureListField.type !== "list") {
    throw mutationInvalid("Dynamic Encounter CreatureList has an invalid native type.", [
      `encounter:addition=${index}:CreatureList:type=${creatureListField.type}`,
    ]);
  }
  const creatureList = normalizeDynamicEncounterCreatureList(creatureListField, index);
  const sourceField = (label: string): SupportedGffField => structuredClone(fields.get(label)!);
  const gitFields: SupportedGffField[] = [
    ...DYNAMIC_ENCOUNTER_REQUIRED_FIELDS
      .filter((label) => label !== "CreatureList")
      .map(sourceField),
    ...(varTable ? [varTable] : []),
    creatureList,
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    {
      label: "Geometry",
      type: "list",
      value: AREA_ENCOUNTER_CONSTRUCTION_PROFILE.geometry.map((point) => ({
        typeId: 1,
        fields: [
          { label: "X", type: "float" as const, value: point.x },
          { label: "Y", type: "float" as const, value: point.y },
          { label: "Z", type: "float" as const, value: point.z },
        ],
      })),
    },
    { label: "SpawnPointList", type: "list", value: [] },
  ];
  return Object.freeze({
    kind: "encounter" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 7, fields: gitFields }),
    gic: Object.freeze({ typeId: 7, fields: [] }),
  });
}

function normalizeDynamicVariableTable(
  field: Extract<SupportedGffField, { type: "list" }>,
  additionIndex: number,
  kind: "encounter" | "waypoint",
): SupportedGffField {
  const displayKind = kind === "encounter" ? "Encounter" : "Waypoint";
  const targets = field.value.map((entry, entryIndex) => {
    if (entry.typeId !== 0 || entry.fields.length !== 3) {
      throw mutationInvalid(`Dynamic ${displayKind} VarTable entry is malformed.`, [
        `${kind}:addition=${additionIndex}:VarTable:entry=${entryIndex}:profile`,
      ]);
    }
    const expectedLabels = ["Name", "Type", "Value"] as const;
    if (!expectedLabels.every((label, fieldIndex) => entry.fields[fieldIndex]?.label === label)) {
      throw mutationInvalid(`Dynamic ${displayKind} VarTable entry is malformed.`, [
        `${kind}:addition=${additionIndex}:VarTable:entry=${entryIndex}:field_order`,
      ]);
    }
    const [name, type, value] = entry.fields;
    if (name?.type !== "cexostring" || type?.type !== "dword") {
      throw mutationInvalid(`Dynamic ${displayKind} VarTable entry has invalid native types.`, [
        `${kind}:addition=${additionIndex}:VarTable:entry=${entryIndex}:native_type`,
      ]);
    }
    if (type.value === 1 && value?.type === "int") {
      return { name: name.value, type: "int" as const, value: value.value };
    }
    if (type.value === 2 && value?.type === "float") {
      return { name: name.value, type: "float" as const, value: value.value };
    }
    if (type.value === 3 && value?.type === "cexostring") {
      return { name: name.value, type: "string" as const, value: value.value };
    }
    throw mutationInvalid(`Dynamic ${displayKind} VarTable entry has an unsupported native type.`, [
      `${kind}:addition=${additionIndex}:VarTable:entry=${entryIndex}:Type=${type.value}:Value=${value?.type ?? "missing"}`,
    ]);
  });
  try {
    const normalized = parseAreaEncounterVariableTargetEntries(targets);
    return {
      label: "VarTable",
      type: "list",
      value: normalized.map((entry) => buildAuroraVariableEntry(entry)),
    };
  } catch (error) {
    throw mutationInvalid(`Dynamic ${displayKind} VarTable exceeds the admitted profile.`, [
      `${kind}:addition=${additionIndex}:VarTable:${error instanceof Error ? error.message : "invalid"}`,
    ]);
  }
}

function normalizeDynamicEncounterCreatureList(
  field: Extract<SupportedGffField, { type: "list" }>,
  additionIndex: number,
): SupportedGffField {
  const expectedEntries = field.value.map((entry, entryIndex) => {
    const expectedLabels = ["Appearance", "CR", "ResRef", "SingleSpawn"] as const;
    if (
      entry.typeId !== 0 ||
      entry.fields.length !== expectedLabels.length ||
      !expectedLabels.every((label, fieldIndex) => entry.fields[fieldIndex]?.label === label)
    ) {
      throw mutationInvalid("Dynamic Encounter CreatureList entry is malformed.", [
        `encounter:addition=${additionIndex}:CreatureList:entry=${entryIndex}:schema`,
      ]);
    }
    const [appearance, challengeRating, resRef, singleSpawn] = entry.fields;
    if (
      appearance?.type !== "int" ||
      challengeRating?.type !== "float" ||
      resRef?.type !== "resref" ||
      singleSpawn?.type !== "byte"
    ) {
      throw mutationInvalid("Dynamic Encounter CreatureList entry has invalid native types.", [
        `encounter:addition=${additionIndex}:CreatureList:entry=${entryIndex}:native_type`,
      ]);
    }
    return {
      sourceIndex: entryIndex,
      appearance: appearance.value,
      challengeRating: challengeRating.value,
      resRef: resRef.value,
      singleSpawnByte: singleSpawn.value,
    };
  });
  let normalized: readonly AreaEncounterCreatureListSourceEntry[];
  try {
    normalized = parseAreaEncounterCreatureListProvenance({ expectedEntries }).expectedEntries;
  } catch (error) {
    throw mutationInvalid("Dynamic Encounter CreatureList differs from the admitted native domain.", [
      `encounter:addition=${additionIndex}:CreatureList:${error instanceof Error ? error.message : "invalid"}`,
    ]);
  }
  return {
    label: "CreatureList",
    type: "list",
    value: normalized.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Appearance", type: "int" as const, value: entry.appearance },
        { label: "CR", type: "float" as const, value: entry.challengeRating },
        { label: "ResRef", type: "resref" as const, value: entry.resRef },
        { label: "SingleSpawn", type: "byte" as const, value: entry.singleSpawnByte },
      ],
    })),
  };
}

function buildTriggerAddition(
  addition: NewAreaTriggerAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_TRIGGER_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Trigger blueprint is not the admitted native UTT V3.2 root profile.", [
      `trigger:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Trigger addition differs from the admitted immutable source profile.", [
      `trigger:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  if (addition.bearing !== 0) {
    throw mutationInvalid("Trigger addition does not admit rotation.", [
      `trigger:addition=${index}:bearing=${addition.bearing}:expected=0`,
    ]);
  }

  const expectedFields: readonly SupportedGffField[] = [
    { label: "ScriptOnEnter", type: "resref", value: "" },
    { label: "Portrait", type: "resref", value: "" },
    { label: "TrapDetectDC", type: "byte", value: 0 },
    { label: "TrapOneShot", type: "byte", value: 1 },
    { label: "OnDisarm", type: "resref", value: "" },
    { label: "Tag", type: "cexostring", value: "GenericTrigger" },
    { label: "HighlightHeight", type: "float", value: 0 },
    { label: "TrapType", type: "byte", value: 0 },
    { label: "OnTrapTriggered", type: "resref", value: "" },
    { label: "ScriptHeartbeat", type: "resref", value: "" },
    { label: "TemplateResRef", type: "resref", value: "newgeneric" },
    { label: "KeyName", type: "cexostring", value: "" },
    { label: "PaletteID", type: "byte", value: 6 },
    { label: "TrapDisarmable", type: "byte", value: 1 },
    { label: "LocalizedName", type: "cexolocstring", value: { strRef: 14759, entries: [] } },
    { label: "Cursor", type: "byte", value: 0 },
    { label: "TrapFlag", type: "byte", value: 0 },
    { label: "AutoRemoveKey", type: "byte", value: 0 },
    { label: "Comment", type: "cexostring", value: "" },
    { label: "LinkedTo", type: "cexostring", value: "" },
    { label: "PartyRequired", type: "byte", value: 0 },
    { label: "Type", type: "int", value: 0 },
    { label: "DisarmDC", type: "byte", value: 0 },
    { label: "OnClick", type: "resref", value: "" },
    { label: "Faction", type: "dword", value: 1 },
    { label: "ScriptOnExit", type: "resref", value: "" },
    { label: "ScriptUserDefine", type: "resref", value: "" },
    { label: "LinkedToFlags", type: "byte", value: 0 },
  ];
  if (document.fields.length !== expectedFields.length) {
    throw mutationInvalid("Trigger blueprint field profile is invalid.", [
      `trigger:addition=${index}:field_count=${document.fields.length}:expected=${expectedFields.length}`,
    ]);
  }
  for (let fieldIndex = 0; fieldIndex < expectedFields.length; fieldIndex += 1) {
    const expected = expectedFields[fieldIndex]!;
    const actual = document.fields[fieldIndex]!;
    if (actual.label !== expected.label) {
      throw mutationInvalid("Trigger blueprint field order is invalid.", [
        `trigger:addition=${index}:field=${fieldIndex}:label=${actual.label}:expected=${expected.label}`,
      ]);
    }
    if (actual.type !== expected.type) {
      throw mutationInvalid("Trigger blueprint field type profile is invalid.", [
        `trigger:addition=${index}:${expected.label}:type=${actual.type}:expected=${expected.type}`,
      ]);
    }
    if (JSON.stringify(actual.value) !== JSON.stringify(expected.value)) {
      throw mutationInvalid("Trigger blueprint value profile is invalid.", [
        `trigger:addition=${index}:${expected.label}:value_mismatch`,
      ]);
    }
  }

  const fields = new Map(document.fields.map((field) => [field.label, field]));
  const sourceField = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const gitFields: SupportedGffField[] = [
    sourceField("Tag"),
    sourceField("TemplateResRef"),
    sourceField("LocalizedName"),
    sourceField("AutoRemoveKey"),
    sourceField("Faction"),
    sourceField("Cursor"),
    sourceField("HighlightHeight"),
    sourceField("KeyName"),
    sourceField("LinkedTo"),
    sourceField("LinkedToFlags"),
    { label: "LoadScreenID", type: "word", value: 0 },
    { label: "PortraitId", type: "word", value: 0 },
    sourceField("Type"),
    { label: "TrapDetectable", type: "byte", value: 1 },
    sourceField("TrapDetectDC"),
    sourceField("TrapDisarmable"),
    sourceField("DisarmDC"),
    sourceField("TrapFlag"),
    sourceField("TrapOneShot"),
    sourceField("TrapType"),
    sourceField("OnDisarm"),
    sourceField("OnTrapTriggered"),
    sourceField("OnClick"),
    sourceField("ScriptHeartbeat"),
    sourceField("ScriptOnEnter"),
    sourceField("ScriptOnExit"),
    sourceField("ScriptUserDefine"),
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: 0 },
    { label: "YOrientation", type: "float", value: 0 },
    { label: "ZOrientation", type: "float", value: 0 },
    {
      label: "Geometry",
      type: "list",
      value: profile.geometry.map((point) => ({
        typeId: 3,
        fields: [
          { label: "PointX", type: "float" as const, value: point.x },
          { label: "PointY", type: "float" as const, value: point.y },
          { label: "PointZ", type: "float" as const, value: point.z },
        ],
      })),
    },
  ];
  const comment = sourceField("Comment");
  return Object.freeze({
    kind: "trigger" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 1, fields: gitFields }),
    gic: Object.freeze({
      typeId: 1,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment.value as string }],
    }),
  });
}

function buildStoreAddition(
  addition: NewAreaStoreAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  if (addition.sourceProfileId === AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id) {
    return buildDynamicStoreAddition(addition, index);
  }
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_STORE_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Store blueprint is not the admitted native UTM V3.2 root profile.", [
      `store:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Store addition differs from the admitted immutable source profile.", [
      `store:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const expectedFields = [
    ["ResRef", "resref"],
    ["LocName", "cexolocstring"],
    ["Tag", "cexostring"],
    ["MarkUp", "int"],
    ["MarkDown", "int"],
    ["BlackMarket", "byte"],
    ["BM_MarkDown", "int"],
    ["IdentifyPrice", "int"],
    ["MaxBuyPrice", "int"],
    ["StoreGold", "int"],
    ["OnOpenStore", "resref"],
    ["OnStoreClosed", "resref"],
    ["WillNotBuy", "list"],
    ["WillOnlyBuy", "list"],
    ["StoreList", "list"],
    ["ID", "byte"],
    ["Comment", "cexostring"],
  ] as const;
  if (document.fields.length !== expectedFields.length) {
    throw mutationInvalid("Store blueprint field profile is invalid.", [
      `store:addition=${index}:field_count=${document.fields.length}:expected=${expectedFields.length}`,
    ]);
  }
  const fields = new Map<string, SupportedGffField>();
  expectedFields.forEach(([label, type], fieldIndex) => {
    const sourceField = document.fields[fieldIndex]!;
    if (sourceField.label !== label || sourceField.type !== type) {
      throw mutationInvalid("Store blueprint field profile is invalid.", [
        `store:addition=${index}:field=${fieldIndex}:expected=${label}:${type}:actual=${sourceField.label}:${sourceField.type}`,
      ]);
    }
    fields.set(label, requireBlueprintField(document, label, type, index, "store"));
  });
  const field = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const resRef = requireBlueprintField(document, "ResRef", "resref", index, "store");
  const tag = requireBlueprintField(document, "Tag", "cexostring", index, "store");
  const comment = requireBlueprintField(document, "Comment", "cexostring", index, "store");
  const id = requireBlueprintField(document, "ID", "byte", index, "store");
  const inventory = requireBlueprintField(document, "StoreList", "list", index, "store");
  if (resRef.value !== addition.templateResRef || tag.value !== addition.tag) {
    throw mutationInvalid("Store blueprint identity differs from the retained draft object.", [
      `store:addition=${index}:blueprint_identity`,
    ]);
  }
  if (id.value !== 5 || comment.value !== "Sample Dye Store") {
    throw mutationInvalid("Store blueprint metadata profile is invalid.", [
      `store:addition=${index}:metadata_profile`,
    ]);
  }
  const expandedInventory = buildDyeStoreInventory(
    inventory,
    addition.blueprintDependencies ?? [],
    index,
  );
  const gitFields: SupportedGffField[] = [
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: storeOrientationComponent(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: storeOrientationComponent(-Math.sin(addition.bearing)) },
    ...expectedFields.slice(0, 14).map(([label]) => field(label)),
    expandedInventory,
  ];
  return Object.freeze({
    kind: "store" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 11, fields: gitFields }),
    gic: Object.freeze({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment.value }],
    }),
  });
}

const DYNAMIC_STORE_ROOT_FIELD_TYPES = Object.freeze([
  ["ResRef", "resref"],
  ["LocName", "cexolocstring"],
  ["Tag", "cexostring"],
  ["MarkUp", "int"],
  ["MarkDown", "int"],
  ["BlackMarket", "byte"],
  ["BM_MarkDown", "int"],
  ["IdentifyPrice", "int"],
  ["MaxBuyPrice", "int"],
  ["StoreGold", "int"],
  ["OnOpenStore", "resref"],
  ["OnStoreClosed", "resref"],
  ["WillNotBuy", "list"],
  ["WillOnlyBuy", "list"],
  ["StoreList", "list"],
  ["ID", "byte"],
  ["Comment", "cexostring"],
] as const);

function buildDynamicStoreAddition(
  addition: NewAreaStoreAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
  const document = parseRawGffDocument(addition.blueprintBytes);
  if (!document || document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId) {
    throw mutationInvalid("Dynamic Store blueprint has an unsupported GFF identity.", [
      `store:addition=${index}:gff_identity`,
    ]);
  }
  if (typeof addition.sourceObjectKey !== "string" ||
    addition.sourceObjectKey.trim().length < 1 ||
    addition.sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    addition.sourceObjectKey.includes("\0") ||
    addition.sourceSizeBytes !== addition.blueprintBytes.length ||
    addition.blueprintBytes.length < 1 ||
    addition.blueprintBytes.length > profile.maxSourceBytes ||
    createHash("sha256").update(addition.blueprintBytes).digest("hex") !== addition.sourceSha256 ||
    !/^[a-z0-9_]{1,16}$/u.test(addition.templateResRef) ||
    addition.resRef !== addition.templateResRef ||
    typeof addition.tag !== "string" || addition.tag.length < 1 ||
    addition.tag.length > 256 || addition.tag.includes("\0")) {
    throw mutationInvalid("Dynamic Store addition identity is invalid.", [
      `store:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const allowedTypes = new Map<string, SupportedGffField["type"]>(
    DYNAMIC_STORE_ROOT_FIELD_TYPES,
  );
  const fieldsByLabel = new Map<string, SupportedGffField[]>();
  for (const sourceField of document.fields) {
    const expectedType = allowedTypes.get(sourceField.label);
    if (!expectedType || sourceField.type !== expectedType) {
      throw mutationInvalid("Dynamic Store blueprint contains an unsupported root field.", [
        `store:addition=${index}:${sourceField.label}:${sourceField.type}`,
      ]);
    }
    const matches = fieldsByLabel.get(sourceField.label) ?? [];
    matches.push(sourceField);
    fieldsByLabel.set(sourceField.label, matches);
  }
  const optionalField = <Type extends SupportedGffField["type"]>(
    label: string,
    type: Type,
  ): Extract<SupportedGffField, { type: Type }> | undefined => {
    const matches = fieldsByLabel.get(label) ?? [];
    if (matches.length > 1 || (matches.length === 1 && matches[0]?.type !== type)) {
      throw mutationInvalid("Dynamic Store blueprint field profile is invalid.", [
        `store:addition=${index}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}`,
      ]);
    }
    return matches[0] as Extract<SupportedGffField, { type: Type }> | undefined;
  };
  const requiredField = <Type extends SupportedGffField["type"]>(
    label: string,
    type: Type,
  ): Extract<SupportedGffField, { type: Type }> => {
    const sourceField = optionalField(label, type);
    if (!sourceField) {
      throw mutationInvalid("Dynamic Store blueprint is missing a required field.", [
        `store:addition=${index}:${label}:missing`,
      ]);
    }
    return sourceField;
  };

  const resRef = requiredField("ResRef", "resref");
  const tag = requiredField("Tag", "cexostring");
  const inventory = requiredField("StoreList", "list");
  if (resRef.value !== addition.templateResRef || tag.value !== addition.tag) {
    throw mutationInvalid("Dynamic Store source identity differs from retained provenance.", [
      `store:addition=${index}:source_identity_mismatch`,
    ]);
  }
  const locName = optionalField("LocName", "cexolocstring")?.value ?? {
    strRef: 0xffffffff,
    entries: [],
  };
  const readInt = (label: string, fallback: number): number => {
    const value = optionalField(label, "int")?.value ?? fallback;
    if (!Number.isSafeInteger(value) || value < -0x80000000 || value > 0x7fffffff) {
      throw mutationInvalid("Dynamic Store signed Int field is invalid.", [
        `store:addition=${index}:${label}:value=${value}`,
      ]);
    }
    return value;
  };
  const blackMarket = optionalField("BlackMarket", "byte")?.value ?? 0;
  if (blackMarket !== 0 && blackMarket !== 1) {
    throw mutationInvalid("Dynamic Store BlackMarket field is non-canonical.", [
      `store:addition=${index}:BlackMarket:value=${blackMarket}`,
    ]);
  }
  const willNotBuy = normalizeDynamicStoreRestrictionList(
    optionalField("WillNotBuy", "list"),
    "WillNotBuy",
    index,
  );
  const willOnlyBuy = normalizeDynamicStoreRestrictionList(
    optionalField("WillOnlyBuy", "list"),
    "WillOnlyBuy",
    index,
  );
  optionalField("ID", "byte");
  const comment = optionalField("Comment", "cexostring")?.value ?? "";
  const dependencyContext = buildDynamicStoreDependencyContext(addition, index);
  const expandedInventory = buildDynamicStoreInventory(
    inventory,
    addition,
    index,
    dependencyContext,
  );
  const unused = [...dependencyContext.dependencies.keys()].filter(
    (templateResRef) => !dependencyContext.used.has(templateResRef),
  );
  if (unused.length > 0) {
    throw mutationInvalid("Dynamic Store dependency closure contains unused entries.", [
      `store:addition=${index}:dependencies:unused=${unused.join(",")}`,
    ]);
  }

  const gitFields: SupportedGffField[] = [
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: storeOrientationComponent(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: storeOrientationComponent(-Math.sin(addition.bearing)) },
    { label: "ResRef", type: "resref", value: resRef.value },
    { label: "LocName", type: "cexolocstring", value: locName },
    { label: "Tag", type: "cexostring", value: tag.value },
    { label: "MarkUp", type: "int", value: readInt("MarkUp", 0) },
    { label: "MarkDown", type: "int", value: readInt("MarkDown", 0) },
    { label: "BlackMarket", type: "byte", value: blackMarket },
    { label: "BM_MarkDown", type: "int", value: readInt("BM_MarkDown", 0) },
    { label: "IdentifyPrice", type: "int", value: readInt("IdentifyPrice", 100) },
    { label: "MaxBuyPrice", type: "int", value: readInt("MaxBuyPrice", -1) },
    { label: "StoreGold", type: "int", value: readInt("StoreGold", -1) },
    { label: "OnOpenStore", type: "resref", value: optionalField("OnOpenStore", "resref")?.value ?? "" },
    { label: "OnStoreClosed", type: "resref", value: optionalField("OnStoreClosed", "resref")?.value ?? "" },
    willNotBuy,
    willOnlyBuy,
    expandedInventory,
  ];
  return Object.freeze({
    kind: "store" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 11, fields: gitFields }),
    gic: Object.freeze({
      typeId: 11,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment }],
    }),
  });
}

function normalizeDynamicStoreRestrictionList(
  source: Extract<SupportedGffField, { type: "list" }> | undefined,
  label: "WillNotBuy" | "WillOnlyBuy",
  additionIndex: number,
): Extract<SupportedGffField, { type: "list" }> {
  if (!source) return { label, type: "list", value: [] };
  const value = source.value.map((entry, entryIndex) => {
    if (entry.typeId !== AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID ||
      entry.fields.length !== 1 || entry.fields[0]?.label !== "BaseItem" ||
      entry.fields[0].type !== "int" || !Number.isSafeInteger(entry.fields[0].value) ||
      entry.fields[0].value < 0) {
      throw mutationInvalid("Dynamic Store restriction entry is invalid.", [
        `store:addition=${additionIndex}:${label}:index=${entryIndex}`,
      ]);
    }
    return {
      typeId: AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
      fields: [{ label: "BaseItem", type: "int" as const, value: entry.fields[0].value }],
    };
  });
  return { label, type: "list", value };
}

function buildDynamicStoreDependencyContext(
  addition: NewAreaStoreAddition,
  index: number,
): DynamicItemDependencyContext {
  const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
  const dependencies = addition.blueprintDependencies ?? [];
  if (!Array.isArray(dependencies) || dependencies.length > profile.maxUniqueDependencies) {
    throw mutationInvalid("Dynamic Store dependency count exceeds the admitted profile.", [
      `store:addition=${index}:dependencies:count=${dependencies.length}`,
    ]);
  }
  const byResRef = new Map<string, DynamicItemDependency>();
  let totalBytes = 0;
  dependencies.forEach((dependency, dependencyIndex) => {
    if (!/^[a-z0-9_]{1,16}$/u.test(dependency.templateResRef) ||
      dependency.resourceType !== profile.itemDependencyResourceType ||
      !/^[a-f0-9]{64}$/u.test(dependency.sha256) ||
      !Buffer.isBuffer(dependency.bytes) || dependency.bytes.length < 1 ||
      dependency.bytes.length > profile.maxSourceBytes ||
      createHash("sha256").update(dependency.bytes).digest("hex") !== dependency.sha256 ||
      (dependency.resolvedModelType !== 0 && dependency.resolvedModelType !== 1 &&
        dependency.resolvedModelType !== 2 && dependency.resolvedModelType !== 3) ||
      byResRef.has(dependency.templateResRef)) {
      throw mutationInvalid("Dynamic Store dependency identity is invalid.", [
        `store:addition=${index}:dependencies:index=${dependencyIndex}:identity`,
      ]);
    }
    totalBytes += dependency.bytes.length;
    if (totalBytes > profile.maxDependencyBytes) {
      throw mutationInvalid("Dynamic Store dependency bytes exceed the admitted profile.", [
        `store:addition=${index}:dependencies:bytes=${totalBytes}`,
      ]);
    }
    byResRef.set(dependency.templateResRef, dependency);
  });
  return {
    dependencies: byResRef,
    used: new Set<string>(),
    visiting: new Set<string>(),
    referenceOccurrences: 0,
  };
}

function buildDynamicStoreInventory(
  source: Extract<SupportedGffField, { type: "list" }>,
  owner: NewAreaStoreAddition,
  additionIndex: number,
  context: DynamicItemDependencyContext,
): Extract<SupportedGffField, { type: "list" }> {
  const profile = AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE;
  if (source.value.length !== profile.bucketTypeIds.length) {
    throw mutationInvalid("Dynamic Store repository count is invalid.", [
      `store:addition=${additionIndex}:StoreList:count=${source.value.length}`,
    ]);
  }
  const buckets = source.value.map((bucket, bucketIndex) => {
    if (bucket.typeId !== profile.bucketTypeIds[bucketIndex] || bucket.fields.length > 1) {
      throw mutationInvalid("Dynamic Store repository identity is invalid.", [
        `store:addition=${additionIndex}:StoreList:index=${bucketIndex}`,
      ]);
    }
    if (bucket.fields.length === 0) return { typeId: bucket.typeId, fields: [] };
    const itemList = bucket.fields[0];
    if (itemList?.label !== "ItemList" || itemList.type !== "list") {
      throw mutationInvalid("Dynamic Store repository ItemList is invalid.", [
        `store:addition=${additionIndex}:StoreList:index=${bucketIndex}:ItemList`,
      ]);
    }
    const entries = itemList.value.map((entry, sourceIndex) => {
      if (entry.typeId !== sourceIndex ||
        (entry.fields.length !== 3 && entry.fields.length !== 4)) {
        throw mutationInvalid("Dynamic Store inventory entry profile is invalid.", [
          `store:addition=${additionIndex}:StoreList=${bucketIndex}:ItemList=${sourceIndex}`,
        ]);
      }
      const byLabel = new Map(entry.fields.map((field) => [field.label, field] as const));
      const inventoryRes = byLabel.get("InventoryRes");
      const reposX = byLabel.get("Repos_PosX");
      const reposY = byLabel.get("Repos_Posy");
      const infinite = byLabel.get("Infinite");
      if (byLabel.size !== entry.fields.length || inventoryRes?.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(inventoryRes.value) ||
        reposX?.type !== "word" || reposY?.type !== "word" ||
        (infinite !== undefined && (infinite.type !== "byte" || infinite.value !== 1)) ||
        [...byLabel.keys()].some((label) =>
          label !== "InventoryRes" && label !== "Repos_PosX" &&
          label !== "Repos_Posy" && label !== "Infinite")) {
        throw mutationInvalid("Dynamic Store inventory entry native fields are invalid.", [
          `store:addition=${additionIndex}:StoreList=${bucketIndex}:ItemList=${sourceIndex}:fields`,
        ]);
      }
      const embeddedFields = buildDynamicEmbeddedDependencyFields(
        inventoryRes.value,
        owner,
        additionIndex,
        context,
        1,
      );
      return {
        typeId: sourceIndex,
        fields: [
          ...embeddedFields,
          { label: "Repos_PosX", type: "word" as const, value: reposX.value },
          { label: "Repos_Posy", type: "word" as const, value: reposY.value },
          ...(infinite ? [{ label: "Infinite", type: "byte" as const, value: 1 }] : []),
        ],
      };
    });
    return {
      typeId: bucket.typeId,
      fields: [{ label: "ItemList", type: "list" as const, value: entries }],
    };
  });
  return { label: "StoreList", type: "list", value: buckets };
}

function storeOrientationComponent(value: number): number {
  const rounded = Math.fround(value);
  return Math.abs(rounded) < Math.fround(1e-6) ? 0 : rounded;
}

function buildDyeStoreInventory(
  inventory: Extract<SupportedGffField, { type: "list" }>,
  dependencies: readonly Readonly<{
    templateResRef: string;
    resourceType: number;
    sha256: string;
    bytes: Buffer;
  }>[],
  additionIndex: number,
): Extract<SupportedGffField, { type: "list" }> {
  const expectedBucketTypes = [0, 4, 2, 3, 1] as const;
  if (inventory.value.length !== expectedBucketTypes.length) {
    throw mutationInvalid("Store blueprint inventory profile is invalid.", [
      `store:addition=${additionIndex}:StoreList:count=${inventory.value.length}`,
    ]);
  }
  inventory.value.forEach((bucket, bucketIndex) => {
    if (bucket.typeId !== expectedBucketTypes[bucketIndex]) {
      throw mutationInvalid("Store blueprint inventory profile is invalid.", [
        `store:addition=${additionIndex}:StoreList=${bucketIndex}:type=${bucket.typeId}`,
      ]);
    }
    if (bucketIndex < 4 && bucket.fields.length !== 0) {
      throw mutationInvalid("Store blueprint inventory profile is invalid.", [
        `store:addition=${additionIndex}:StoreList=${bucketIndex}:fields=${bucket.fields.length}`,
      ]);
    }
  });
  const merchandiseBucket = inventory.value[4]!;
  if (merchandiseBucket.fields.length !== 1) {
    throw mutationInvalid("Store blueprint inventory profile is invalid.", [
      `store:addition=${additionIndex}:StoreList=4:fields=${merchandiseBucket.fields.length}`,
    ]);
  }
  const itemList = merchandiseBucket.fields[0]!;
  if (itemList.label !== "ItemList") {
    throw mutationInvalid("Store blueprint inventory profile is invalid.", [
      `store:addition=${additionIndex}:StoreList=4:ItemList:label`,
    ]);
  }
  if (itemList.type !== "list") {
    throw mutationInvalid("Store blueprint inventory profile is invalid.", [
      `store:addition=${additionIndex}:StoreList=4:ItemList:type`,
    ]);
  }
  if (itemList.value.length !== AREA_STORE_CONSTRUCTION_PROFILE.dependencyCount) {
    throw mutationInvalid("Store blueprint inventory profile is invalid.", [
      `store:addition=${additionIndex}:StoreList=4:ItemList:count=${itemList.value.length}`,
    ]);
  }
  if (dependencies.length !== AREA_STORE_CONSTRUCTION_PROFILE.dependencyCount) {
    throw mutationInvalid("Store blueprint dependency set is incomplete.", [
      `store:addition=${additionIndex}:dependencies=${dependencies.length}:expected=${AREA_STORE_CONSTRUCTION_PROFILE.dependencyCount}`,
    ]);
  }
  dependencies.forEach((dependency, dependencyIndex) => {
    if (
      dependency.resourceType !== AREA_STORE_CONSTRUCTION_PROFILE.dependencyResourceType ||
      !/^[a-f0-9]{64}$/u.test(dependency.sha256) ||
      !Buffer.isBuffer(dependency.bytes)
    ) {
      throw mutationInvalid("Store blueprint dependency identity is invalid.", [
        `store:addition=${additionIndex}:dependency=${dependencyIndex}:identity`,
      ]);
    }
  });
  const expandedItems = itemList.value.map((entry, itemIndex) => {
    const expectedLabels = itemIndex === 33 || itemIndex === 54
      ? ["InventoryRes", "Repos_PosX", "Repos_Posy"]
      : ["InventoryRes", "Repos_PosX", "Repos_Posy", "Infinite"];
    if (
      entry.typeId !== itemIndex ||
      entry.fields.length !== expectedLabels.length ||
      entry.fields.some((entryField, fieldIndex) => entryField.label !== expectedLabels[fieldIndex])
    ) {
      throw mutationInvalid("Store blueprint inventory item profile is invalid.", [
        `store:addition=${additionIndex}:StoreList=4:ItemList=${itemIndex}`,
      ]);
    }
    const inventoryRes = entry.fields[0]!;
    const dependency = dependencies[itemIndex]!;
    if (
      inventoryRes.type !== "resref" ||
      dependency.templateResRef !== inventoryRes.value
    ) {
      throw mutationInvalid("Store blueprint inventory dependency order is invalid.", [
        `store:addition=${additionIndex}:StoreList=4:ItemList=${itemIndex}:dependency`,
      ]);
    }
    return buildEmbeddedStoreItem(entry, dependency.bytes, additionIndex, itemIndex);
  });
  const dependencyIdentity = dependencies.map((dependency, dependencyIndex) => {
    const actualSha256 = createHash("sha256").update(dependency.bytes).digest("hex");
    if (actualSha256 !== dependency.sha256) {
      throw mutationInvalid("Store blueprint dependency digest is invalid.", [
        `store:addition=${additionIndex}:dependency=${dependencyIndex}:source_sha256_mismatch`,
      ]);
    }
    return {
      templateResRef: dependency.templateResRef,
      resourceType: dependency.resourceType,
      sha256: dependency.sha256,
    };
  });
  if (
    hashAreaStoreConstructionDependencies(dependencyIdentity) !==
    AREA_STORE_CONSTRUCTION_PROFILE.dependencySetSha256
  ) {
    throw mutationInvalid("Store blueprint dependency set differs from the admitted immutable profile.", [
      `store:addition=${additionIndex}:dependency_set_sha256`,
    ]);
  }
  return {
    label: "StoreList",
    type: "list",
    value: inventory.value.map((bucket, bucketIndex) => bucketIndex === 4
      ? {
          typeId: bucket.typeId,
          fields: [{ label: "ItemList", type: "list", value: expandedItems }],
        }
      : bucket),
  };
}

function buildEmbeddedStoreItem(
  inventoryEntry: Extract<SupportedGffField, { type: "list" }>["value"][number],
  itemBytes: Buffer,
  additionIndex: number,
  itemIndex: number,
): Extract<SupportedGffField, { type: "list" }>["value"][number] {
  const document = parseRawGffDocument(itemBytes);
  const expectedFields = [
    ["TemplateResRef", "resref"], ["BaseItem", "int"],
    ["LocalizedName", "cexolocstring"], ["Description", "cexolocstring"],
    ["DescIdentified", "cexolocstring"], ["Tag", "cexostring"],
    ["Charges", "byte"], ["Cost", "dword"], ["Stolen", "byte"],
    ["StackSize", "word"], ["Plot", "byte"], ["AddCost", "dword"],
    ["Identified", "byte"], ["Cursed", "byte"], ["ModelPart1", "byte"],
    ["PropertiesList", "list"], ["PaletteID", "byte"], ["Comment", "cexostring"],
  ] as const;
  if (
    !document ||
    document.fileType !== "UTI " ||
    document.fileVersion !== "V3.2" ||
    document.rootStructTypeId !== 0xffffffff ||
    document.fields.length !== expectedFields.length
  ) {
    throw mutationInvalid("Store inventory item blueprint profile is invalid.", [
      `store:addition=${additionIndex}:dependency=${itemIndex}:gff_identity`,
    ]);
  }
  const fields = new Map<string, SupportedGffField>();
  expectedFields.forEach(([label, type], fieldIndex) => {
    const sourceField = document.fields[fieldIndex]!;
    if (sourceField.label !== label || sourceField.type !== type) {
      throw mutationInvalid("Store inventory item blueprint field profile is invalid.", [
        `store:addition=${additionIndex}:dependency=${itemIndex}:field=${fieldIndex}`,
      ]);
    }
    fields.set(label, sourceField);
  });
  const template = fields.get("TemplateResRef")!;
  const inventoryRes = inventoryEntry.fields[0]!;
  if (template.value !== inventoryRes.value) {
    throw mutationInvalid("Store inventory item blueprint identity is invalid.", [
      `store:addition=${additionIndex}:dependency=${itemIndex}:template`,
    ]);
  }
  const modelPart = fields.get("ModelPart1") as Extract<SupportedGffField, { type: "byte" }>;
  const field = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  return {
    typeId: inventoryEntry.typeId,
    fields: [
      { label: "XPosition", type: "float", value: -1 },
      { label: "YPosition", type: "float", value: -1 },
      { label: "ZPosition", type: "float", value: -1 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 1 },
      ...expectedFields.slice(0, 15).map(([label]) => field(label)),
      { label: "xModelPart1", type: "word", value: modelPart.value },
      field("PropertiesList"),
      ...inventoryEntry.fields.slice(1).map((repositoryField) => ({ ...repositoryField } as SupportedGffField)),
    ],
  };
}

function buildCreatureAddition(
  addition: NewAreaCreatureAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_CREATURE_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Creature blueprint is not the admitted native UTC V3.2 root profile.", [
      `creature:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Creature addition differs from the admitted immutable source profile.", [
      `creature:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const skillRanks = [0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0];
  const expectedFields = [
    ["Deity", "cexostring", ""],
    ["PerceptionRange", "byte", 11],
    ["Int", "byte", 3],
    ["NaturalAC", "byte", 0],
    ["SkillList", "list", skillRanks.map((value) => ({
      typeId: 0,
      fields: [{ label: "Rank", type: "byte", value }],
    }))],
    ["ScriptOnBlocked", "resref", "nw_c2_defaulte"],
    ["Tag", "cexostring", "NW_CHICKEN"],
    ["NoPermDeath", "byte", 0],
    ["Plot", "byte", 0],
    ["Wis", "byte", 8],
    ["fortbonus", "short", 0],
    ["FeatList", "list", [{
      typeId: 1,
      fields: [{ label: "Feat", type: "word", value: 289 }],
    }]],
    ["ScriptAttacked", "resref", "nw_c2_default5"],
    ["PortraitId", "word", 168],
    ["FirstName", "cexolocstring", { strRef: 12416, entries: [] }],
    ["Appearance_Type", "word", 31],
    ["Wings", "byte", 0],
    ["TemplateList", "list", []],
    ["FactionID", "word", 2],
    ["Description", "cexolocstring", { strRef: 12415, entries: [] }],
    ["SpecAbilityList", "list", []],
    ["Equip_ItemList", "list", []],
    ["Comment", "cexostring", ""],
    ["TemplateResRef", "resref", "nw_chicken"],
    ["Interruptable", "byte", 1],
    ["PaletteID", "byte", 6],
    ["Str", "byte", 3],
    ["ScriptUserDefine", "resref", "nw_c2_defaultd"],
    ["ScriptSpellAt", "resref", "nw_c2_defaultb"],
    ["ScriptDisturbed", "resref", "nw_c2_default8"],
    ["ScriptDamaged", "resref", "nw_c2_default6"],
    ["ScriptRested", "resref", "nw_c2_defaulta"],
    ["GoodEvil", "byte", 50],
    ["ClassList", "list", [{
      typeId: 2,
      fields: [
        { label: "Class", type: "int", value: 12 },
        { label: "ClassLevel", type: "short", value: 1 },
      ],
    }]],
    ["Phenotype", "int", 0],
    ["WalkRate", "int", 7],
    ["MaxHitPoints", "short", 6],
    ["ChallengeRating", "float", Math.fround(0.25)],
    ["BodyBag", "byte", 0],
    ["HitPoints", "short", 5],
    ["LawfulChaotic", "byte", 50],
    ["ScriptEndRound", "resref", "nw_c2_default3"],
    ["ScriptSpawn", "resref", "nw_c2_herbivore"],
    ["Race", "byte", 8],
    ["IsPC", "byte", 0],
    ["Subrace", "cexostring", ""],
    ["ScriptDeath", "resref", "nw_c2_default7"],
    ["LastName", "cexolocstring", { strRef: 0xffffffff, entries: [] }],
    ["Con", "byte", 8],
    ["Dex", "byte", 7],
    ["ScriptOnNotice", "resref", "nw_c2_default2"],
    ["CRAdjust", "int", 0],
    ["ScriptHeartbeat", "resref", "nw_c2_default1"],
    ["Conversation", "resref", ""],
    ["ScriptDialogue", "resref", "nw_c2_default4"],
    ["Gender", "byte", 1],
    ["willbonus", "short", 0],
    ["Cha", "byte", 6],
    ["Tail", "byte", 0],
    ["SoundSetFile", "word", 21],
    ["CurrentHitPoints", "short", 5],
    ["refbonus", "short", 0],
    ["Disarmable", "byte", 0],
  ] as const;
  if (document.fields.length !== expectedFields.length) {
    throw mutationInvalid("Creature blueprint field profile is invalid.", [
      `creature:addition=${index}:field_count=${document.fields.length}:expected=${expectedFields.length}`,
    ]);
  }
  const fields = new Map<string, SupportedGffField>();
  for (const [label, type, expected] of expectedFields) {
    const blueprintField = requireBlueprintField(document, label, type, index, "creature");
    if (JSON.stringify(blueprintField.value) !== JSON.stringify(expected)) {
      throw mutationInvalid("Creature blueprint value profile is invalid.", [
        `creature:addition=${index}:${label}:value_mismatch`,
      ]);
    }
    fields.set(label, blueprintField);
  }
  const field = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const sourceSkillList = requireBlueprintField(document, "SkillList", "list", index, "creature");
  const wings = requireBlueprintField(document, "Wings", "byte", index, "creature");
  const tail = requireBlueprintField(document, "Tail", "byte", index, "creature");
  const comment = requireBlueprintField(document, "Comment", "cexostring", index, "creature");
  const extendedSkillList = [
    ...sourceSkillList.value,
    ...Array.from({ length: 8 }, () => Object.freeze({
      typeId: 0,
      fields: [{ label: "Rank", type: "byte" as const, value: 0 }],
    })),
  ];
  const gitFields: SupportedGffField[] = [
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(addition.bearing)) },
    field("TemplateResRef"),
    field("Race"),
    field("FirstName"),
    field("LastName"),
    field("Appearance_Type"),
    field("Gender"),
    field("Phenotype"),
    field("PortraitId"),
    field("Description"),
    field("Tag"),
    field("Conversation"),
    field("IsPC"),
    field("FactionID"),
    field("Disarmable"),
    field("Subrace"),
    field("Deity"),
    { label: "Wings_New", type: "dword", value: wings.value },
    { label: "Tail_New", type: "dword", value: tail.value },
    field("SoundSetFile"),
    field("Plot"),
    { label: "IsImmortal", type: "byte", value: 0 },
    field("Interruptable"),
    { label: "Lootable", type: "byte", value: 0 },
    field("NoPermDeath"),
    field("BodyBag"),
    { label: "StartingPackage", type: "byte", value: 0 },
    { label: "DecayTime", type: "dword", value: 0 },
    field("Str"),
    field("Dex"),
    field("Con"),
    field("Int"),
    field("Wis"),
    field("Cha"),
    field("WalkRate"),
    field("NaturalAC"),
    field("HitPoints"),
    field("CurrentHitPoints"),
    { label: "MaxHitPoints", type: "short", value: 4 },
    field("refbonus"),
    field("willbonus"),
    field("fortbonus"),
    field("GoodEvil"),
    field("LawfulChaotic"),
    field("ChallengeRating"),
    field("CRAdjust"),
    field("PerceptionRange"),
    field("ScriptHeartbeat"),
    field("ScriptOnNotice"),
    field("ScriptSpellAt"),
    field("ScriptAttacked"),
    field("ScriptDamaged"),
    field("ScriptDisturbed"),
    field("ScriptEndRound"),
    field("ScriptDialogue"),
    field("ScriptSpawn"),
    field("ScriptRested"),
    field("ScriptDeath"),
    field("ScriptUserDefine"),
    field("ScriptOnBlocked"),
    { label: "SkillList", type: "list", value: extendedSkillList },
    field("FeatList"),
    field("TemplateList"),
    field("SpecAbilityList"),
    field("ClassList"),
    field("Equip_ItemList"),
  ];
  return Object.freeze({
    kind: "creature" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 4, fields: gitFields }),
    gic: Object.freeze({
      typeId: 4,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment.value }],
    }),
  });
}

function buildWaypointAddition(
  addition: NewAreaWaypointAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  if (addition.sourceProfileId === AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE.id) {
    return buildDynamicWaypointAddition(addition, index);
  }
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_WAYPOINT_CONSTRUCTION_PROFILE;
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Waypoint addition differs from the admitted immutable source profile.", [
      `waypoint:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Waypoint blueprint is not the admitted native UTW V3.2 root profile.", [
      `waypoint:addition=${index}:gff_identity`,
    ]);
  }
  const templateResRef = requireBlueprintField(document, "TemplateResRef", "resref", index);
  const tag = requireBlueprintField(document, "Tag", "cexostring", index);
  const linkedTo = requireBlueprintField(document, "LinkedTo", "cexostring", index);
  const localizedName = requireBlueprintField(document, "LocalizedName", "cexolocstring", index);
  const description = requireBlueprintField(document, "Description", "cexolocstring", index);
  const hasMapNote = requireBlueprintField(document, "HasMapNote", "byte", index);
  const comment = requireBlueprintField(document, "Comment", "cexostring", index);
  requireBlueprintField(document, "PaletteID", "byte", index);
  if (templateResRef.value !== addition.templateResRef || tag.value !== addition.tag) {
    throw mutationInvalid("Waypoint blueprint identity differs from the retained draft object.", [
      `waypoint:addition=${index}:blueprint_identity`,
    ]);
  }
  const appearance = optionalBlueprintField(document, "Appearance", "byte", index)?.value ?? 1;
  const mapNote = optionalBlueprintField(document, "MapNote", "cexolocstring", index) ?? {
    label: "MapNote",
    type: "cexolocstring" as const,
    value: { strRef: 0xffffffff, entries: [] },
  };
  const mapNoteEnabled = optionalBlueprintField(document, "MapNoteEnabled", "byte", index)?.value ?? 1;
  const gitFields: SupportedGffField[] = [
    { label: "Appearance", type: "byte", value: appearance },
    { ...linkedTo },
    { ...templateResRef },
    { ...tag },
    { ...localizedName },
    { ...description },
    { ...hasMapNote },
    { ...mapNote },
    { label: "MapNoteEnabled", type: "byte", value: mapNoteEnabled },
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(addition.bearing)) },
  ];
  return Object.freeze({
    kind: "waypoint" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 5, fields: gitFields }),
    gic: Object.freeze({
      typeId: 5,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment.value }],
    }),
  });
}

const DYNAMIC_WAYPOINT_ROOT_FIELD_TYPES = Object.freeze(
  new Map<string, SupportedGffField["type"]>([
    ["Appearance", "byte"],
    ["LinkedTo", "cexostring"],
    ["TemplateResRef", "resref"],
    ["Tag", "cexostring"],
    ["LocalizedName", "cexolocstring"],
    ["Description", "cexolocstring"],
    ["HasMapNote", "byte"],
    ["MapNote", "cexolocstring"],
    ["MapNoteEnabled", "byte"],
    ["VarTable", "list"],
    ["PaletteID", "byte"],
    ["Comment", "cexostring"],
  ]),
);

const DYNAMIC_WAYPOINT_REQUIRED_FIELDS = Object.freeze([
  "LinkedTo",
  "TemplateResRef",
  "Tag",
  "LocalizedName",
  "Description",
  "HasMapNote",
] as const);

function buildDynamicWaypointAddition(
  addition: NewAreaWaypointAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Dynamic Waypoint blueprint has an unsupported GFF identity.", [
      `waypoint:addition=${index}:gff_identity`,
    ]);
  }
  if (
    typeof addition.sourceObjectKey !== "string" ||
    addition.sourceObjectKey.trim().length < 1 ||
    addition.sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    addition.sourceObjectKey.includes("\0") ||
    !Number.isSafeInteger(addition.sourceSizeBytes) ||
    addition.sourceSizeBytes !== addition.blueprintBytes.length ||
    addition.blueprintBytes.length < 1 ||
    addition.blueprintBytes.length > profile.maxSourceBytes ||
    createHash("sha256").update(addition.blueprintBytes).digest("hex") !== addition.sourceSha256
  ) {
    throw mutationInvalid("Dynamic Waypoint addition identity is invalid.", [
      `waypoint:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const fields = new Map<string, SupportedGffField>();
  for (const field of document.fields) {
    const expectedType = DYNAMIC_WAYPOINT_ROOT_FIELD_TYPES.get(field.label);
    if (!expectedType) {
      throw mutationInvalid("Dynamic Waypoint blueprint contains an unsupported root field.", [
        `waypoint:addition=${index}:${field.label}:${field.type}`,
      ]);
    }
    if (fields.has(field.label)) {
      throw mutationInvalid("Dynamic Waypoint blueprint contains a duplicate root field.", [
        `waypoint:addition=${index}:${field.label}:count=2`,
      ]);
    }
    if (field.type !== expectedType) {
      throw mutationInvalid("Dynamic Waypoint blueprint field profile is invalid.", [
        `waypoint:addition=${index}:${field.label}:type=${field.type}:expected=${expectedType}`,
      ]);
    }
    fields.set(field.label, field);
  }
  for (const label of DYNAMIC_WAYPOINT_REQUIRED_FIELDS) {
    if (!fields.has(label)) {
      throw mutationInvalid("Dynamic Waypoint blueprint is missing a required field.", [
        `waypoint:addition=${index}:${label}:count=0`,
      ]);
    }
  }

  const templateResRef = fields.get("TemplateResRef")!;
  const tag = fields.get("Tag")!;
  if (
    templateResRef.type !== "resref" ||
    !/^[a-z0-9_]{1,16}$/u.test(templateResRef.value) ||
    addition.templateResRef !== templateResRef.value ||
    addition.resRef !== templateResRef.value ||
    tag.type !== "cexostring" ||
    tag.value.length < 1 ||
    tag.value.length > 256 ||
    tag.value.includes("\0") ||
    addition.tag !== tag.value
  ) {
    throw mutationInvalid("Dynamic Waypoint source identity differs from retained provenance.", [
      `waypoint:addition=${index}:source_identity_mismatch`,
    ]);
  }
  for (const label of ["HasMapNote", "MapNoteEnabled"] as const) {
    const field = fields.get(label);
    if (field && (field.type !== "byte" || (field.value !== 0 && field.value !== 1))) {
      throw mutationInvalid("Dynamic Waypoint boolean blueprint field is non-canonical.", [
        `waypoint:addition=${index}:${label}:value=${field.type === "byte" ? field.value : "invalid"}`,
      ]);
    }
  }

  const varTableField = fields.get("VarTable");
  const varTable = varTableField?.type === "list" && varTableField.value.length > 0
    ? normalizeDynamicVariableTable(varTableField, index, "waypoint")
    : undefined;
  const appearance = fields.get("Appearance") ?? {
    label: "Appearance", type: "byte" as const, value: 1,
  };
  const mapNote = fields.get("MapNote") ?? {
    label: "MapNote", type: "cexolocstring" as const,
    value: { strRef: 0xffffffff, entries: [] },
  };
  const mapNoteEnabled = fields.get("MapNoteEnabled") ?? {
    label: "MapNoteEnabled", type: "byte" as const, value: 1,
  };
  const sourceField = (label: string): SupportedGffField => structuredClone(fields.get(label)!);
  const gitFields: SupportedGffField[] = [
    structuredClone(appearance),
    sourceField("LinkedTo"),
    sourceField("TemplateResRef"),
    sourceField("Tag"),
    sourceField("LocalizedName"),
    sourceField("Description"),
    sourceField("HasMapNote"),
    structuredClone(mapNote),
    structuredClone(mapNoteEnabled),
    ...(varTable ? [varTable] : []),
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(addition.bearing)) },
  ];
  const comment = fields.get("Comment");
  return Object.freeze({
    kind: "waypoint" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 5, fields: gitFields }),
    gic: Object.freeze({
      typeId: 5,
      fields: [{
        label: "Comment",
        type: "cexostring" as const,
        value: comment?.type === "cexostring" ? comment.value : "",
      }],
    }),
  });
}

function buildSoundAddition(
  addition: NewAreaSoundAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_SOUND_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Sound blueprint is not the admitted native UTS V3.2 root profile.", [
      `sound:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Sound addition differs from the admitted immutable source profile.", [
      `sound:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }
  if (addition.bearing !== 0) {
    throw mutationInvalid("Sound additions do not serialize orientation and must retain zero bearing.", [
      `sound:addition=${index}:bearing`,
    ]);
  }

  const tag = requireBlueprintField(document, "Tag", "cexostring", index, "sound");
  const locName = requireBlueprintField(document, "LocName", "cexolocstring", index, "sound");
  const templateResRef = requireBlueprintField(document, "TemplateResRef", "resref", index, "sound");
  const active = requireBlueprintField(document, "Active", "byte", index, "sound");
  const continuous = requireBlueprintField(document, "Continuous", "byte", index, "sound");
  const looping = requireBlueprintField(document, "Looping", "byte", index, "sound");
  const positional = requireBlueprintField(document, "Positional", "byte", index, "sound");
  const randomPosition = requireBlueprintField(document, "RandomPosition", "byte", index, "sound");
  const random = requireBlueprintField(document, "Random", "byte", index, "sound");
  const elevation = requireBlueprintField(document, "Elevation", "float", index, "sound");
  const maxDistance = requireBlueprintField(document, "MaxDistance", "float", index, "sound");
  const minDistance = requireBlueprintField(document, "MinDistance", "float", index, "sound");
  const randomRangeX = requireBlueprintField(document, "RandomRangeX", "float", index, "sound");
  const randomRangeY = requireBlueprintField(document, "RandomRangeY", "float", index, "sound");
  const interval = requireBlueprintField(document, "Interval", "dword", index, "sound");
  const intervalVariation = requireBlueprintField(document, "IntervalVrtn", "dword", index, "sound");
  const pitchVariation = requireBlueprintField(document, "PitchVariation", "float", index, "sound");
  const priority = requireBlueprintField(document, "Priority", "byte", index, "sound");
  const hours = requireBlueprintField(document, "Hours", "dword", index, "sound");
  const times = requireBlueprintField(document, "Times", "byte", index, "sound");
  const volume = requireBlueprintField(document, "Volume", "byte", index, "sound");
  const volumeVariation = requireBlueprintField(document, "VolumeVrtn", "byte", index, "sound");
  const sounds = requireBlueprintField(document, "Sounds", "list", index, "sound");
  const paletteId = requireBlueprintField(document, "PaletteID", "byte", index, "sound");
  const comment = requireBlueprintField(document, "Comment", "cexostring", index, "sound");
  if (templateResRef.value !== addition.templateResRef || tag.value !== addition.tag) {
    throw mutationInvalid("Sound blueprint identity differs from the retained draft object.", [
      `sound:addition=${index}:blueprint_identity`,
    ]);
  }
  for (const [label, actual, expected] of [
    ["LocName", locName.value, { strRef: 67786, entries: [] }],
    ["Active", active.value, 1],
    ["Continuous", continuous.value, 1],
    ["Looping", looping.value, 0],
    ["Positional", positional.value, 1],
    ["RandomPosition", randomPosition.value, 1],
    ["Random", random.value, 1],
    ["Elevation", elevation.value, Math.fround(1.5)],
    ["MaxDistance", maxDistance.value, Math.fround(10)],
    ["MinDistance", minDistance.value, Math.fround(1)],
    ["RandomRangeX", randomRangeX.value, Math.fround(10)],
    ["RandomRangeY", randomRangeY.value, Math.fround(10)],
    ["Interval", interval.value, 25000],
    ["IntervalVrtn", intervalVariation.value, 5000],
    ["PitchVariation", pitchVariation.value, Math.fround(0.2)],
    ["Priority", priority.value, 18],
    ["Hours", hours.value, 0],
    ["Times", times.value, 3],
    ["Volume", volume.value, 127],
    ["VolumeVrtn", volumeVariation.value, 0],
    ["PaletteID", paletteId.value, 6],
    ["Comment", comment.value, ""],
  ] as const) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw mutationInvalid("Sound blueprint value profile is invalid.", [
        `sound:addition=${index}:${label}:value_mismatch`,
      ]);
    }
  }
  const expectedSoundResRefs = [
    "as_an_cryday1",
    "as_an_cryday2",
    "as_an_cryday3",
    "as_an_cryday4",
  ] as const;
  if (sounds.value.length !== expectedSoundResRefs.length) {
    throw mutationInvalid("Sound blueprint nested resource profile is invalid.", [
      `sound:addition=${index}:Sounds:count=${sounds.value.length}`,
    ]);
  }
  const soundEntries = sounds.value.map((entry, soundIndex) => {
    if (entry.typeId !== 1243572 || entry.fields.length !== 1) {
      throw mutationInvalid("Sound blueprint nested resource profile is invalid.", [
        `sound:addition=${index}:Sounds=${soundIndex}:profile_mismatch`,
      ]);
    }
    const sound = entry.fields[0]!;
    if (sound.label !== "Sound" || sound.type !== "resref" || sound.value !== expectedSoundResRefs[soundIndex]) {
      throw mutationInvalid("Sound blueprint nested resource profile is invalid.", [
        `sound:addition=${index}:Sounds=${soundIndex}:profile_mismatch`,
      ]);
    }
    return Object.freeze({
      typeId: 0,
      fields: [{ label: "Sound", type: "resref" as const, value: sound.value }],
    });
  });
  const gitFields: SupportedGffField[] = [
    { ...tag },
    { ...locName },
    { ...templateResRef },
    { ...active },
    { ...continuous },
    { ...looping },
    { ...positional },
    { ...randomPosition },
    { ...random },
    { ...elevation },
    { ...maxDistance },
    { ...minDistance },
    { ...randomRangeX },
    { ...randomRangeY },
    { ...interval },
    { ...intervalVariation },
    { ...pitchVariation },
    { label: "Priority", type: "byte", value: 20 },
    { ...hours },
    { ...times },
    { ...volume },
    { ...volumeVariation },
    { label: "Sounds", type: "list", value: soundEntries },
    { label: "GeneratedType", type: "dword", value: 0 },
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
  ];
  return Object.freeze({
    kind: "sound" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 6, fields: gitFields }),
    gic: Object.freeze({
      typeId: 6,
      fields: [
        { label: "PlayInToolset", type: "byte" as const, value: 1 },
        { label: "Comment", type: "cexostring" as const, value: comment.value },
      ],
    }),
  });
}

function buildPlaceableAddition(
  addition: NewAreaPlaceableAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  if (addition.sourceProfileId === AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.id) {
    return buildDynamicPlaceableAddition(addition, index);
  }
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_PLACEABLE_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Placeable blueprint is not the admitted native UTP V3.2 root profile.", [
      `placeable:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Placeable addition differs from the admitted immutable source profile.", [
      `placeable:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const expectedFields = [
    ["Ref", "byte", 0],
    ["OnUsed", "resref", ""],
    ["Portrait", "resref", "po_plc_n02_"],
    ["KeyName", "cexostring", ""],
    ["OnUserDefined", "resref", ""],
    ["HasInventory", "byte", 0],
    ["OnDamaged", "resref", ""],
    ["TemplateResRef", "resref", "plc_watertrough"],
    ["Faction", "dword", 1],
    ["Locked", "byte", 0],
    ["CloseLockDC", "byte", 0],
    ["Appearance", "dword", 104],
    ["OnOpen", "resref", ""],
    ["Tag", "cexostring", "Water Trough"],
    ["HP", "short", 15],
    ["Description", "cexolocstring", { strRef: 14751, entries: [] }],
    ["TrapDetectable", "byte", 1],
    ["PaletteID", "byte", 9],
    ["OnClosed", "resref", ""],
    ["Conversation", "resref", ""],
    ["DisarmDC", "byte", 15],
    ["OnMeleeAttacked", "resref", ""],
    ["Hardness", "byte", 5],
    ["LocName", "cexolocstring", { strRef: 5747, entries: [] }],
    ["KeyRequired", "byte", 0],
    ["AnimationState", "byte", 0],
    ["CurrentHP", "short", 15],
    ["TrapOneShot", "byte", 1],
    ["Interruptable", "byte", 1],
    ["OnLock", "resref", ""],
    ["OnTrapTriggered", "resref", ""],
    ["Type", "byte", 0],
    ["Useable", "byte", 0],
    ["TrapType", "byte", 0],
    ["OnDeath", "resref", ""],
    ["OnUnlock", "resref", ""],
    ["Comment", "cexostring", "Water Trough"],
    ["TrapDisarmable", "byte", 1],
    ["Lockable", "byte", 0],
    ["OnHeartbeat", "resref", ""],
    ["OpenLockDC", "byte", 18],
    ["TrapDetectDC", "byte", 0],
    ["OnSpellCastAt", "resref", ""],
    ["Fort", "byte", 16],
    ["Will", "byte", 0],
    ["OnInvDisturbed", "resref", ""],
    ["TrapFlag", "byte", 0],
    ["AutoRemoveKey", "byte", 0],
    ["Plot", "byte", 0],
    ["OnDisarm", "resref", ""],
  ] as const;
  const fields = new Map<string, SupportedGffField>();
  for (const [label, type, expected] of expectedFields) {
    const field = requireBlueprintField(document, label, type, index, "placeable");
    if (JSON.stringify(field.value) !== JSON.stringify(expected)) {
      throw mutationInvalid("Placeable blueprint value profile is invalid.", [
        `placeable:addition=${index}:${label}:value_mismatch`,
      ]);
    }
    fields.set(label, field);
  }
  const field = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const gitFields: SupportedGffField[] = [
    { label: "Tag", type: "cexostring", value: profile.templateTag },
    field("LocName"),
    field("Description"),
    field("TemplateResRef"),
    field("AutoRemoveKey"),
    field("CloseLockDC"),
    field("Conversation"),
    field("Interruptable"),
    field("Faction"),
    field("Plot"),
    field("KeyRequired"),
    field("Lockable"),
    field("Locked"),
    field("OpenLockDC"),
    { label: "PortraitId", type: "word", value: 462 },
    field("TrapDetectable"),
    field("TrapDetectDC"),
    field("TrapDisarmable"),
    field("DisarmDC"),
    field("TrapFlag"),
    field("TrapOneShot"),
    field("TrapType"),
    field("KeyName"),
    field("AnimationState"),
    field("Appearance"),
    field("HP"),
    field("CurrentHP"),
    field("Hardness"),
    field("Fort"),
    field("Ref"),
    field("Will"),
    field("OnClosed"),
    field("OnDamaged"),
    field("OnDeath"),
    field("OnDisarm"),
    field("OnHeartbeat"),
    field("OnLock"),
    field("OnMeleeAttacked"),
    field("OnOpen"),
    field("OnSpellCastAt"),
    field("OnTrapTriggered"),
    field("OnUnlock"),
    field("OnUserDefined"),
    { label: "OnClick", type: "resref", value: "" },
    field("HasInventory"),
    { label: "BodyBag", type: "byte", value: 0 },
    { label: "Static", type: "byte", value: 1 },
    field("Type"),
    field("Useable"),
    field("OnInvDisturbed"),
    field("OnUsed"),
    { label: "X", type: "float", value: Math.fround(addition.x * 10) },
    { label: "Y", type: "float", value: Math.fround(addition.y * 10) },
    { label: "Z", type: "float", value: Math.fround(addition.z * 10) },
    { label: "Bearing", type: "float", value: Math.fround(addition.bearing) },
  ];
  return Object.freeze({
    kind: "placeable" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 9, fields: gitFields }),
    gic: Object.freeze({
      typeId: 9,
      fields: [{ label: "Comment", type: "cexostring" as const, value: "Water Trough" }],
    }),
  });
}

const DYNAMIC_PLACEABLE_REQUIRED_FIELDS = Object.freeze([
  ["Tag", "cexostring"],
  ["LocName", "cexolocstring"],
  ["Description", "cexolocstring"],
  ["TemplateResRef", "resref"],
  ["AutoRemoveKey", "byte"],
  ["CloseLockDC", "byte"],
  ["Conversation", "resref"],
  ["Interruptable", "byte"],
  ["Faction", "dword"],
  ["Plot", "byte"],
  ["KeyRequired", "byte"],
  ["Lockable", "byte"],
  ["Locked", "byte"],
  ["OpenLockDC", "byte"],
  ["TrapDetectable", "byte"],
  ["TrapDetectDC", "byte"],
  ["TrapDisarmable", "byte"],
  ["DisarmDC", "byte"],
  ["TrapFlag", "byte"],
  ["TrapOneShot", "byte"],
  ["TrapType", "byte"],
  ["KeyName", "cexostring"],
  ["AnimationState", "byte"],
  ["Appearance", "dword"],
  ["HP", "short"],
  ["CurrentHP", "short"],
  ["Hardness", "byte"],
  ["Fort", "byte"],
  ["Ref", "byte"],
  ["Will", "byte"],
  ["OnClosed", "resref"],
  ["OnDamaged", "resref"],
  ["OnDeath", "resref"],
  ["OnDisarm", "resref"],
  ["OnHeartbeat", "resref"],
  ["OnLock", "resref"],
  ["OnMeleeAttacked", "resref"],
  ["OnOpen", "resref"],
  ["OnSpellCastAt", "resref"],
  ["OnTrapTriggered", "resref"],
  ["OnUnlock", "resref"],
  ["OnUserDefined", "resref"],
  ["HasInventory", "byte"],
  ["Type", "byte"],
  ["Useable", "byte"],
  ["OnInvDisturbed", "resref"],
  ["OnUsed", "resref"],
  ["PaletteID", "byte"],
  ["Comment", "cexostring"],
] as const satisfies readonly (readonly [string, SupportedGffField["type"]])[]);

const DYNAMIC_PLACEABLE_OPTIONAL_FIELDS = Object.freeze([
  "PortraitId",
  "Portrait",
  "BodyBag",
  "Static",
  "OnClick",
  "ItemList",
  "VarTable",
] as const);

function buildDynamicPlaceableAddition(
  addition: NewAreaPlaceableAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const profile = AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE;
  const document = parseRawGffDocument(addition.blueprintBytes);
  if (!document || document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId) {
    throw mutationInvalid("Dynamic Placeable blueprint is not an admitted UTP V3.2 root.", [
      `placeable:addition=${index}:gff_identity`,
    ]);
  }
  if (typeof addition.sourceObjectKey !== "string" || addition.sourceObjectKey.length < 1 ||
    addition.sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    addition.sourceObjectKey.includes("\0")) {
    throw mutationInvalid("Dynamic Placeable blueprint source identity is invalid.", [
      `placeable:addition=${index}:source_object_key`,
    ]);
  }
  if (!isAreaPlaceableTemplateResRef(addition.templateResRef) ||
    addition.resRef !== addition.templateResRef ||
    typeof addition.tag !== "string" || addition.tag.length < 1 ||
    addition.tag.length > 256 || addition.tag.includes("\0") ||
    !Number.isSafeInteger(addition.resolvedPortraitId) ||
    Number(addition.resolvedPortraitId) < 0 || Number(addition.resolvedPortraitId) > 0xffff) {
    throw mutationInvalid("Dynamic Placeable addition identity is invalid.", [
      `placeable:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const allowed = new Set<string>([
    ...DYNAMIC_PLACEABLE_REQUIRED_FIELDS.map(([label]) => label),
    ...DYNAMIC_PLACEABLE_OPTIONAL_FIELDS,
  ]);
  const byLabel = new Map<string, SupportedGffField[]>();
  for (const field of document.fields) {
    if (!allowed.has(field.label)) {
      throw mutationInvalid("Dynamic Placeable blueprint contains an unsupported root field.", [
        `placeable:addition=${index}:${field.label}:unsupported`,
      ]);
    }
    const fields = byLabel.get(field.label) ?? [];
    fields.push(field);
    byLabel.set(field.label, fields);
  }
  const requireField = <T extends SupportedGffField["type"]>(label: string, type: T) => {
    const matches = byLabel.get(label) ?? [];
    if (matches.length !== 1 || matches[0]?.type !== type) {
      throw mutationInvalid("Dynamic Placeable blueprint field profile is invalid.", [
        `placeable:addition=${index}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}:expected=${type}`,
      ]);
    }
    return matches[0] as Extract<SupportedGffField, { type: T }>;
  };
  const optionalField = <T extends SupportedGffField["type"]>(label: string, type: T) => {
    const matches = byLabel.get(label) ?? [];
    if (matches.length > 1 || (matches.length === 1 && matches[0]?.type !== type)) {
      throw mutationInvalid("Dynamic Placeable optional blueprint field profile is invalid.", [
        `placeable:addition=${index}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}:expected=${type}`,
      ]);
    }
    return matches[0] as Extract<SupportedGffField, { type: T }> | undefined;
  };
  for (const [label, type] of DYNAMIC_PLACEABLE_REQUIRED_FIELDS) requireField(label, type);

  const templateResRef = requireField("TemplateResRef", "resref");
  const sourceTag = requireField("Tag", "cexostring");
  const comment = requireField("Comment", "cexostring");
  if (templateResRef.value !== addition.templateResRef || sourceTag.value !== addition.tag ||
    !isAreaPlaceableEditorComment(comment.value)) {
    throw mutationInvalid("Dynamic Placeable source identity differs from retained provenance.", [
      `placeable:addition=${index}:source_identity_mismatch`,
    ]);
  }

  const portraitId = optionalField("PortraitId", "word");
  const portraitResRef = optionalField("Portrait", "resref");
  if ((portraitId ? 1 : 0) + (portraitResRef ? 1 : 0) !== 1 ||
    (portraitId && portraitId.value !== addition.resolvedPortraitId) ||
    (portraitResRef && !/^po_[A-Za-z0-9_]{1,13}$/u.test(portraitResRef.value))) {
    throw mutationInvalid("Dynamic Placeable portrait source is invalid or unresolved.", [
      `placeable:addition=${index}:portrait_profile`,
    ]);
  }

  const itemList = optionalField("ItemList", "list");
  const canonicalItemList = itemList && itemList.value.length > 0
    ? buildDynamicPlaceableInventoryItemList(addition, itemList, index)
    : undefined;
  if (!canonicalItemList && (addition.blueprintDependencies?.length ?? 0) !== 0) {
    throw mutationInvalid("Dynamic Placeable without inventory cannot carry blueprint dependencies.", [
      `placeable:addition=${index}:ItemList:unexpected_dependencies=${addition.blueprintDependencies?.length ?? 0}`,
    ]);
  }
  const useable = requireField("Useable", "byte");
  const bodyBag = optionalField("BodyBag", "byte");
  const staticField = optionalField("Static", "byte");
  const onClick = optionalField("OnClick", "resref");
  const varTable = optionalField("VarTable", "list");
  const canonicalVarTable = varTable
    ? normalizeDynamicBlueprintVarTable(varTable, index, "placeable")
    : undefined;
  for (const label of [
    "AutoRemoveKey", "Interruptable", "Plot", "KeyRequired", "Lockable", "Locked",
    "TrapDetectable", "TrapDisarmable", "TrapFlag", "TrapOneShot", "HasInventory", "Useable",
  ]) {
    const value = requireField(label, "byte").value;
    if (value !== 0 && value !== 1) {
      throw mutationInvalid("Dynamic Placeable boolean blueprint field is non-canonical.", [
        `placeable:addition=${index}:${label}:value=${value}`,
      ]);
    }
  }
  for (const [label, field] of [["BodyBag", bodyBag], ["Static", staticField]] as const) {
    if (field && field.value !== 0 && field.value !== 1) {
      throw mutationInvalid("Dynamic Placeable optional boolean field is non-canonical.", [
        `placeable:addition=${index}:${label}:value=${field.value}`,
      ]);
    }
  }

  const copy = <T extends SupportedGffField["type"]>(label: string, type: T): SupportedGffField =>
    ({ ...requireField(label, type) } as SupportedGffField);
  const gitFields: SupportedGffField[] = [
    copy("Tag", "cexostring"),
    copy("LocName", "cexolocstring"),
    copy("Description", "cexolocstring"),
    copy("TemplateResRef", "resref"),
    copy("AutoRemoveKey", "byte"),
    copy("CloseLockDC", "byte"),
    copy("Conversation", "resref"),
    copy("Interruptable", "byte"),
    copy("Faction", "dword"),
    copy("Plot", "byte"),
    copy("KeyRequired", "byte"),
    copy("Lockable", "byte"),
    copy("Locked", "byte"),
    copy("OpenLockDC", "byte"),
    { label: "PortraitId", type: "word", value: Number(addition.resolvedPortraitId) },
    copy("TrapDetectable", "byte"),
    copy("TrapDetectDC", "byte"),
    copy("TrapDisarmable", "byte"),
    copy("DisarmDC", "byte"),
    copy("TrapFlag", "byte"),
    copy("TrapOneShot", "byte"),
    copy("TrapType", "byte"),
    copy("KeyName", "cexostring"),
    copy("AnimationState", "byte"),
    copy("Appearance", "dword"),
    copy("HP", "short"),
    copy("CurrentHP", "short"),
    copy("Hardness", "byte"),
    copy("Fort", "byte"),
    copy("Ref", "byte"),
    copy("Will", "byte"),
    copy("OnClosed", "resref"),
    copy("OnDamaged", "resref"),
    copy("OnDeath", "resref"),
    copy("OnDisarm", "resref"),
    copy("OnHeartbeat", "resref"),
    copy("OnLock", "resref"),
    copy("OnMeleeAttacked", "resref"),
    copy("OnOpen", "resref"),
    copy("OnSpellCastAt", "resref"),
    copy("OnTrapTriggered", "resref"),
    copy("OnUnlock", "resref"),
    copy("OnUserDefined", "resref"),
    onClick ? { ...onClick } : { label: "OnClick", type: "resref", value: "" },
    ...(canonicalVarTable ? [canonicalVarTable] : []),
    copy("HasInventory", "byte"),
    bodyBag ? { ...bodyBag } : { label: "BodyBag", type: "byte", value: 0 },
    staticField
      ? { ...staticField }
      : { label: "Static", type: "byte", value: useable.value === 0 ? 1 : 0 },
    copy("Type", "byte"),
    copy("Useable", "byte"),
    copy("OnInvDisturbed", "resref"),
    copy("OnUsed", "resref"),
    { label: "X", type: "float", value: Math.fround(addition.x * 10) },
    { label: "Y", type: "float", value: Math.fround(addition.y * 10) },
    { label: "Z", type: "float", value: Math.fround(addition.z * 10) },
    { label: "Bearing", type: "float", value: Math.fround(addition.bearing) },
    ...(canonicalItemList ? [canonicalItemList] : []),
  ];
  return Object.freeze({
    kind: "placeable" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 9, fields: gitFields }),
    gic: Object.freeze({
      typeId: 9,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment.value }],
    }),
  });
}

function buildDynamicPlaceableInventoryItemList(
  addition: NewAreaPlaceableAddition,
  itemList: Extract<SupportedGffField, { type: "list" }>,
  additionIndex: number,
): Extract<SupportedGffField, { type: "list" }> {
  const manifest = itemList.value.map((entry, sourceIndex) => {
    if (entry.typeId !== sourceIndex || entry.fields.length !== 3) {
      throw mutationInvalid("Dynamic Placeable ItemList entry profile is invalid.", [
        `placeable:addition=${additionIndex}:ItemList:index=${sourceIndex}:struct`,
      ]);
    }
    const [inventoryRes, reposX, reposY] = entry.fields;
    if (inventoryRes?.label !== "InventoryRes" || inventoryRes.type !== "resref" ||
      reposX?.label !== "Repos_PosX" || reposX.type !== "word" ||
      reposY?.label !== "Repos_Posy" || reposY.type !== "word") {
      throw mutationInvalid("Dynamic Placeable ItemList native fields are invalid.", [
        `placeable:addition=${additionIndex}:ItemList:index=${sourceIndex}:fields`,
      ]);
    }
    return Object.freeze({
      sourceIndex,
      inventoryRes: inventoryRes.value,
      x: reposX.value,
      y: reposY.value,
    });
  });
  const profile = resolveAreaPlaceableDynamicInventoryProfile(
    addition.templateResRef,
    manifest,
  );
  if (!profile) {
    throw mutationInvalid("Dynamic Placeable ItemList differs from the admitted inventory profile.", [
      `placeable:addition=${additionIndex}:ItemList:unsupported_profile`,
    ]);
  }
  const dependencies = addition.blueprintDependencies ?? [];
  if (dependencies.length !== profile.entries.length) {
    throw mutationInvalid("Dynamic Placeable ItemList dependency set is incomplete.", [
      `placeable:addition=${additionIndex}:ItemList:dependencies=${dependencies.length}:expected=${profile.entries.length}`,
    ]);
  }
  return {
    label: "ItemList",
    type: "list",
    value: profile.entries.map((expected, sourceIndex) => {
      const dependency = dependencies[sourceIndex];
      if (!dependency || dependency.templateResRef !== expected.inventoryRes ||
        dependency.resourceType !== AREA_PLACEABLE_DYNAMIC_INVENTORY_ITEM_RESOURCE_TYPE ||
        typeof dependency.sha256 !== "string" || !/^[a-f0-9]{64}$/u.test(dependency.sha256) ||
        !Buffer.isBuffer(dependency.bytes) || dependency.bytes.length < 1 ||
        dependency.bytes.length > AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.maxSourceBytes) {
        throw mutationInvalid("Dynamic Placeable ItemList dependency identity is invalid.", [
          `placeable:addition=${additionIndex}:ItemList:dependency=${sourceIndex}:identity`,
        ]);
      }
      const actualSha256 = createHash("sha256").update(dependency.bytes).digest("hex");
      if (actualSha256 !== dependency.sha256) {
        throw mutationInvalid("Dynamic Placeable ItemList dependency digest is stale.", [
          `placeable:addition=${additionIndex}:ItemList:dependency=${sourceIndex}:sha256`,
        ]);
      }
      return buildDynamicPlaceableInventoryItem(
        expected.inventoryRes,
        dependency.bytes,
        sourceIndex,
        expected.x,
        expected.y,
        additionIndex,
      );
    }),
  };
}

function buildDynamicPlaceableInventoryItem(
  templateResRef: string,
  bytes: Buffer,
  sourceIndex: number,
  reposX: number,
  reposY: number,
  additionIndex: number,
): Extract<SupportedGffField, { type: "list" }>["value"][number] {
  const isEleven = templateResRef === "nw_it_msmlmisc11";
  if (!isEleven && templateResRef !== "nw_it_msmlmisc12") {
    throw mutationInvalid("Dynamic Placeable inventory item identity is unsupported.", [
      `placeable:addition=${additionIndex}:ItemList:dependency=${sourceIndex}:template`,
    ]);
  }
  const document = parseRawGffDocument(bytes);
  const expected = [
    ["PaletteID", "byte", isEleven ? 23 : 54],
    ["BaseItem", "int", 24],
    ["PropertiesList", "list", []],
    ["StackSize", "word", 1],
    ["Cost", "dword", isEleven ? 10 : 0],
    ["LocalizedName", "cexolocstring", { strRef: isEleven ? 13493 : 13494, entries: [] }],
    ["ModelPart1", "byte", isEleven ? 68 : 66],
    ["TemplateResRef", "resref", templateResRef],
    ["Comment", "cexostring", "1"],
    ["DescIdentified", "cexolocstring", { strRef: isEleven ? 58565 : 58566, entries: [] }],
    ["Tag", "cexostring", templateResRef.toUpperCase()],
    ["Charges", "byte", 0],
    ["Description", "cexolocstring", { strRef: 0xffffffff, entries: [] }],
    ["Stolen", "byte", 0],
    ["AddCost", "dword", isEleven ? 10 : 0],
    ["Plot", "byte", 0],
    ["Identified", "byte", 1],
  ] as const;
  if (!document || document.fileType !== "UTI " || document.fileVersion !== "V3.2" ||
    document.rootStructTypeId !== 0xffffffff || document.fields.length !== expected.length) {
    throw mutationInvalid("Dynamic Placeable inventory item blueprint profile is invalid.", [
      `placeable:addition=${additionIndex}:ItemList:dependency=${sourceIndex}:gff_identity`,
    ]);
  }
  const fields = new Map<string, SupportedGffField>();
  expected.forEach(([label, type, value], fieldIndex) => {
    const field = document.fields[fieldIndex];
    if (!field || field.label !== label || field.type !== type ||
      JSON.stringify(field.value) !== JSON.stringify(value)) {
      throw mutationInvalid("Dynamic Placeable inventory item blueprint field profile is invalid.", [
        `placeable:addition=${additionIndex}:ItemList:dependency=${sourceIndex}:field=${fieldIndex}`,
      ]);
    }
    fields.set(label, field);
  });
  const copy = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const modelPart = fields.get("ModelPart1") as Extract<SupportedGffField, { type: "byte" }>;
  return {
    typeId: sourceIndex,
    fields: [
      { label: "XPosition", type: "float", value: -1 },
      { label: "YPosition", type: "float", value: -1 },
      { label: "ZPosition", type: "float", value: -1 },
      { label: "XOrientation", type: "float", value: 0 },
      { label: "YOrientation", type: "float", value: 1 },
      copy("TemplateResRef"),
      copy("BaseItem"),
      copy("LocalizedName"),
      copy("Description"),
      copy("DescIdentified"),
      copy("Tag"),
      copy("Charges"),
      copy("Cost"),
      copy("Stolen"),
      copy("StackSize"),
      copy("Plot"),
      copy("AddCost"),
      copy("Identified"),
      { label: "Cursed", type: "byte", value: 0 },
      copy("ModelPart1"),
      { label: "xModelPart1", type: "word", value: modelPart.value },
      copy("PropertiesList"),
      { label: "Repos_PosX", type: "word", value: reposX },
      { label: "Repos_Posy", type: "word", value: reposY },
    ],
  };
}

function normalizeDynamicBlueprintVarTable(
  field: Extract<SupportedGffField, { type: "list" }>,
  additionIndex: number,
  ownerKind: "item" | "placeable",
): SupportedGffField {
  const ownerLabel = ownerKind === "item" ? "Item" : "Placeable";
  const targets = field.value.map((entry, sourceIndex) => {
    if (entry.typeId !== 0 || entry.fields.length !== 3) {
      throw mutationInvalid(`Dynamic ${ownerLabel} VarTable entry is malformed.`, [
        `${ownerKind}:addition=${additionIndex}:VarTable:index=${sourceIndex}:profile`,
      ]);
    }
    const read = (label: string) => {
      const matches = entry.fields.filter((candidate) => candidate.label === label);
      if (matches.length !== 1) {
        throw mutationInvalid(`Dynamic ${ownerLabel} VarTable entry is malformed.`, [
          `${ownerKind}:addition=${additionIndex}:VarTable:index=${sourceIndex}:${label}:count=${matches.length}`,
        ]);
      }
      return matches[0]!;
    };
    const name = read("Name");
    const type = read("Type");
    const value = read("Value");
    if (name.type !== "cexostring" || type.type !== "dword") {
      throw mutationInvalid(`Dynamic ${ownerLabel} VarTable entry has invalid native types.`, [
        `${ownerKind}:addition=${additionIndex}:VarTable:index=${sourceIndex}:native_type`,
      ]);
    }
    return type.value === 1 && value.type === "int"
      ? { name: name.value, type: "int" as const, value: value.value }
      : type.value === 2 && value.type === "float"
        ? { name: name.value, type: "float" as const, value: value.value }
        : type.value === 3 && value.type === "cexostring"
          ? { name: name.value, type: "string" as const, value: value.value }
          : (() => {
              throw mutationInvalid(`Dynamic ${ownerLabel} VarTable entry has an unsupported native type.`, [
                `${ownerKind}:addition=${additionIndex}:VarTable:index=${sourceIndex}:Type=${type.value}:Value=${value.type}`,
              ]);
            })();
  });
  let normalized;
  try {
    normalized = ownerKind === "item"
      ? parseAreaItemVariableTargetEntries(targets)
      : parseAreaPlaceableVariableTargetEntries(targets);
  } catch (error) {
    throw mutationInvalid(`Dynamic ${ownerLabel} VarTable exceeds the admitted profile.`, [
      `${ownerKind}:addition=${additionIndex}:VarTable:${error instanceof Error ? error.message : "invalid"}`,
    ]);
  }
  return {
    label: "VarTable",
    type: "list",
    value: normalized.map((entry) => buildAuroraVariableEntry(entry)),
  };
}

const DYNAMIC_ITEM_COMMON_FIELD_TYPES = Object.freeze([
  ["TemplateResRef", "resref"],
  ["BaseItem", "int"],
  ["LocalizedName", "cexolocstring"],
  ["Description", "cexolocstring"],
  ["DescIdentified", "cexolocstring"],
  ["Tag", "cexostring"],
  ["Charges", "byte"],
  ["Cost", "dword"],
  ["Stolen", "byte"],
  ["StackSize", "word"],
  ["Plot", "byte"],
  ["AddCost", "dword"],
  ["Identified", "byte"],
  ["Cursed", "byte"],
] as const);

const DYNAMIC_ITEM_WRAPPER_FIELD_TYPES = Object.freeze([
  ["PaletteID", "byte"],
  ["Comment", "cexostring"],
  ["PropertiesList", "list"],
  ["VarTable", "list"],
  ["ItemList", "list"],
  ["Equip_ItemList", "list"],
] as const);

function buildDynamicItemAddition(
  addition: NewAreaItemAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const context = buildDynamicItemDependencyContext(addition, index);
  context.visiting.add(addition.templateResRef);
  const result = buildDynamicItemAdditionInternal(addition, index, context, 0);
  context.visiting.delete(addition.templateResRef);
  const unused = [...context.dependencies.keys()].filter(
    (templateResRef) => !context.used.has(templateResRef),
  );
  if (unused.length > 0) {
    throw mutationInvalid("Dynamic Item dependency closure contains unused entries.", [
      `item:addition=${index}:dependencies:unused=${unused.join(",")}`,
    ]);
  }
  return result;
}

type DynamicItemDependency = Readonly<{
  templateResRef: string;
  resourceType: number;
  sha256: string;
  bytes: Buffer;
  resolvedModelType?: 0 | 1 | 2 | 3;
}>;

type DynamicItemDependencyContext = {
  readonly dependencies: Map<string, DynamicItemDependency>;
  readonly used: Set<string>;
  readonly visiting: Set<string>;
  referenceOccurrences: number;
};

function buildDynamicItemDependencyContext(
  addition: NewAreaItemAddition,
  index: number,
): DynamicItemDependencyContext {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  const dependencies = addition.blueprintDependencies ?? [];
  if (!Array.isArray(dependencies) || dependencies.length > profile.maxUniqueDependencies) {
    throw mutationInvalid("Dynamic Item dependency count exceeds the admitted profile.", [
      `item:addition=${index}:dependencies:count=${dependencies.length}`,
    ]);
  }
  const byResRef = new Map<string, DynamicItemDependency>();
  let totalBytes = 0;
  dependencies.forEach((dependency, dependencyIndex) => {
    if (!/^[a-z0-9_]{1,16}$/u.test(dependency.templateResRef) ||
      dependency.resourceType !== profile.resourceType ||
      !/^[a-f0-9]{64}$/u.test(dependency.sha256) ||
      !Buffer.isBuffer(dependency.bytes) || dependency.bytes.length < 1 ||
      dependency.bytes.length > profile.maxSourceBytes ||
      createHash("sha256").update(dependency.bytes).digest("hex") !== dependency.sha256 ||
      (dependency.resolvedModelType !== 0 && dependency.resolvedModelType !== 1 &&
        dependency.resolvedModelType !== 2 && dependency.resolvedModelType !== 3) ||
      byResRef.has(dependency.templateResRef)) {
      throw mutationInvalid("Dynamic Item dependency identity is invalid.", [
        `item:addition=${index}:dependencies:index=${dependencyIndex}:identity`,
      ]);
    }
    totalBytes += dependency.bytes.length;
    if (totalBytes > profile.maxDependencyBytes) {
      throw mutationInvalid("Dynamic Item dependency bytes exceed the admitted profile.", [
        `item:addition=${index}:dependencies:bytes=${totalBytes}`,
      ]);
    }
    byResRef.set(dependency.templateResRef, dependency);
  });
  return {
    dependencies: byResRef,
    used: new Set<string>(),
    visiting: new Set<string>(),
    referenceOccurrences: 0,
  };
}

function buildDynamicItemAdditionInternal(
  addition: NewAreaItemAddition,
  index: number,
  dependencyContext: DynamicItemDependencyContext,
  depth: number,
): AreaObjectAdditionReadbackExpectation {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  if (depth > profile.maxNestedDepth) {
    throw mutationInvalid("Dynamic Item dependency depth exceeds the admitted profile.", [
      `item:addition=${index}:dependencies:depth=${depth}`,
    ]);
  }
  const document = parseRawGffDocument(addition.blueprintBytes);
  if (!document || document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId) {
    throw mutationInvalid("Dynamic Item blueprint has an unsupported GFF identity.", [
      `item:addition=${index}:gff_identity`,
    ]);
  }
  if (typeof addition.sourceObjectKey !== "string" ||
    addition.sourceObjectKey.trim().length < 1 ||
    addition.sourceObjectKey.length > profile.maxSourceObjectKeyCodeUnits ||
    addition.sourceObjectKey.includes("\0") ||
    addition.sourceSizeBytes !== addition.blueprintBytes.length ||
    addition.blueprintBytes.length < 1 ||
    addition.blueprintBytes.length > profile.maxSourceBytes ||
    addition.sourceProfileId !== profile.id ||
    !/^[a-z0-9_]{1,16}$/u.test(addition.templateResRef) ||
    addition.resRef !== addition.templateResRef ||
    typeof addition.tag !== "string" || addition.tag.length < 1 ||
    addition.tag.length > 256 || addition.tag.includes("\0") ||
    (addition.resolvedModelType !== 0 && addition.resolvedModelType !== 1 &&
      addition.resolvedModelType !== 2 && addition.resolvedModelType !== 3)) {
    throw mutationInvalid("Dynamic Item addition identity is invalid.", [
      `item:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const appearanceLabels = new Set<string>(
    ITEM_BASE_APPEARANCE_GFF_PROFILE.map((entry) => entry.label),
  );
  const allowedLabels = new Set<string>([
    ...DYNAMIC_ITEM_COMMON_FIELD_TYPES.map(([label]) => label),
    ...DYNAMIC_ITEM_WRAPPER_FIELD_TYPES.map(([label]) => label),
    ...appearanceLabels,
  ]);
  const fieldsByLabel = new Map<string, SupportedGffField[]>();
  for (const field of document.fields) {
    if (!allowedLabels.has(field.label)) {
      throw mutationInvalid("Dynamic Item blueprint contains an unsupported root field.", [
        `item:addition=${index}:${field.label}:unsupported`,
      ]);
    }
    const matches = fieldsByLabel.get(field.label) ?? [];
    matches.push(field);
    fieldsByLabel.set(field.label, matches);
  }

  const optionalField = <Type extends SupportedGffField["type"]>(
    label: string,
    type: Type,
  ): Extract<SupportedGffField, { type: Type }> | undefined => {
    const matches = fieldsByLabel.get(label) ?? [];
    if (matches.length > 1 || (matches.length === 1 && matches[0]?.type !== type)) {
      throw mutationInvalid("Dynamic Item blueprint field profile is invalid.", [
        `item:addition=${index}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}:expected=${type}`,
      ]);
    }
    return matches[0] as Extract<SupportedGffField, { type: Type }> | undefined;
  };
  const requiredField = <Type extends SupportedGffField["type"]>(
    label: string,
    type: Type,
  ): Extract<SupportedGffField, { type: Type }> => {
    const field = optionalField(label, type);
    if (!field) {
      throw mutationInvalid("Dynamic Item blueprint is missing an identity field.", [
        `item:addition=${index}:${label}:missing`,
      ]);
    }
    return field;
  };

  const templateResRef = requiredField("TemplateResRef", "resref");
  const sourceTag = requiredField("Tag", "cexostring");
  const baseItem = requiredField("BaseItem", "int");
  if (templateResRef.value !== addition.templateResRef ||
    sourceTag.value !== addition.tag || !Number.isSafeInteger(baseItem.value) ||
    baseItem.value < 0 || baseItem.value > 0x7fff_ffff) {
    throw mutationInvalid("Dynamic Item source identity differs from retained provenance.", [
      `item:addition=${index}:source_identity_mismatch`,
    ]);
  }

  optionalField("PaletteID", "byte");
  const comment = optionalField("Comment", "cexostring")?.value ?? "";
  const itemList = optionalField("ItemList", "list");
  const equipItemList = optionalField("Equip_ItemList", "list");

  const sourceAppearanceLabels = new Set<string>(
    dynamicItemAppearanceProfile(addition.resolvedModelType).map((entry) => entry.label),
  );
  for (const field of document.fields) {
    if (appearanceLabels.has(field.label) && !sourceAppearanceLabels.has(field.label)) {
      throw mutationInvalid("Dynamic Item appearance differs from the effective ModelType.", [
        `item:addition=${index}:${field.label}:unexpected_for_model_type`,
      ]);
    }
  }
  const appearanceFields = dynamicItemAppearanceProfile(addition.resolvedModelType).map(
    (entry): SupportedGffField => {
      const matches = fieldsByLabel.get(entry.label) ?? [];
      const source = matches[0];
      if (matches.length > 1 || (source && source.type !== "byte" && source.type !== "word") ||
        (source && (!Number.isSafeInteger(source.value) || source.value < 0 ||
          source.value > 0xffff))) {
        throw mutationInvalid("Dynamic Item appearance field profile is invalid.", [
          `item:addition=${index}:${entry.label}:count=${matches.length}:type=${source?.type ?? "missing"}`,
        ]);
      }
      return {
        label: entry.label,
        type: entry.type,
        value: source ? Number(source.value) : 0,
      } as SupportedGffField;
    },
  );

  const defaultLocString = () => ({ strRef: 0xffffffff, entries: [] });
  const localizedName = optionalField("LocalizedName", "cexolocstring")?.value ?? defaultLocString();
  const description = optionalField("Description", "cexolocstring")?.value ?? defaultLocString();
  const identifiedDescription = optionalField("DescIdentified", "cexolocstring")?.value ??
    defaultLocString();
  const readScalar = <Type extends "byte" | "word" | "dword">(
    label: string,
    type: Type,
    fallback: number,
  ): number => {
    const field = optionalField(label, type) as Readonly<{ value: number }> | undefined;
    return field?.value ?? fallback;
  };
  const charges = readScalar("Charges", "byte", 50);
  const cost = readScalar("Cost", "dword", 0);
  const stolen = readScalar("Stolen", "byte", 0);
  const stackSize = readScalar("StackSize", "word", 1);
  const plot = readScalar("Plot", "byte", 0);
  const addCost = readScalar("AddCost", "dword", 0);
  const identified = readScalar("Identified", "byte", 0);
  const cursed = readScalar("Cursed", "byte", 0);
  for (const [label, value] of [
    ["Stolen", stolen], ["Plot", plot], ["Identified", identified], ["Cursed", cursed],
  ] as const) {
    if (value !== 0 && value !== 1) {
      throw mutationInvalid("Dynamic Item boolean field is non-canonical.", [
        `item:addition=${index}:${label}:value=${value}`,
      ]);
    }
  }

  const properties = normalizeDynamicItemPropertiesList(
    optionalField("PropertiesList", "list"),
    index,
  );
  const sourceVarTable = optionalField("VarTable", "list");
  const varTable = sourceVarTable && sourceVarTable.value.length > 0
    ? normalizeDynamicBlueprintVarTable(sourceVarTable, index, "item")
    : undefined;
  const nestedInventory = buildDynamicItemNestedInventoryFields(
    itemList,
    equipItemList,
    addition,
    index,
    dependencyContext,
    depth,
  );
  const gitFields: SupportedGffField[] = [
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(addition.bearing)) },
    { label: "TemplateResRef", type: "resref", value: templateResRef.value },
    { label: "BaseItem", type: "int", value: baseItem.value },
    { label: "LocalizedName", type: "cexolocstring", value: localizedName },
    { label: "Description", type: "cexolocstring", value: description },
    { label: "DescIdentified", type: "cexolocstring", value: identifiedDescription },
    { label: "Tag", type: "cexostring", value: sourceTag.value },
    { label: "Charges", type: "byte", value: charges },
    { label: "Cost", type: "dword", value: cost },
    { label: "Stolen", type: "byte", value: stolen },
    { label: "StackSize", type: "word", value: stackSize },
    { label: "Plot", type: "byte", value: plot },
    { label: "AddCost", type: "dword", value: addCost },
    { label: "Identified", type: "byte", value: identified },
    { label: "Cursed", type: "byte", value: cursed },
    ...appearanceFields,
    properties,
    ...(varTable ? [varTable] : []),
    ...nestedInventory,
  ];
  return Object.freeze({
    kind: "item" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 0, fields: gitFields }),
    gic: Object.freeze({
      typeId: 0,
      fields: [{ label: "Comment", type: "cexostring" as const, value: comment }],
    }),
  });
}

const DYNAMIC_ITEM_EQUIPMENT_SLOT_MASKS = new Set<number>([
  0x1, 0x2, 0x4, 0x8, 0x10, 0x20, 0x40, 0x80, 0x100,
  0x200, 0x400, 0x800, 0x1000, 0x2000, 0x4000, 0x8000,
  0x10000, 0x20000,
]);

function buildDynamicItemNestedInventoryFields(
  itemList: Extract<SupportedGffField, { type: "list" }> | undefined,
  equipItemList: Extract<SupportedGffField, { type: "list" }> | undefined,
  owner: NewAreaItemAddition,
  additionIndex: number,
  context: DynamicItemDependencyContext,
  depth: number,
): SupportedGffField[] {
  const output: SupportedGffField[] = [];
  if (itemList && itemList.value.length > 0) {
    const entries = itemList.value.map((entry, sourceIndex) => {
      if (entry.typeId !== sourceIndex || entry.fields.length !== 3) {
        throw mutationInvalid("Dynamic Item ItemList entry is non-canonical.", [
          `item:addition=${additionIndex}:ItemList:index=${sourceIndex}:profile`,
        ]);
      }
      const [inventoryRes, reposX, reposY] = entry.fields;
      if (inventoryRes?.label !== "InventoryRes" || inventoryRes.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(inventoryRes.value) ||
        reposX?.label !== "Repos_PosX" || reposX.type !== "word" ||
        reposY?.label !== "Repos_Posy" || reposY.type !== "word") {
        throw mutationInvalid("Dynamic Item ItemList entry has an invalid native grammar.", [
          `item:addition=${additionIndex}:ItemList:index=${sourceIndex}:native_fields`,
        ]);
      }
      const fields = buildDynamicEmbeddedDependencyFields(
        inventoryRes.value,
        owner,
        additionIndex,
        context,
        depth + 1,
      );
      return {
        typeId: sourceIndex,
        fields: [
          ...fields,
          { label: "Repos_PosX", type: "word" as const, value: reposX.value },
          { label: "Repos_Posy", type: "word" as const, value: reposY.value },
        ],
      };
    });
    output.push({ label: "ItemList", type: "list", value: entries });
  }
  if (equipItemList && equipItemList.value.length > 0) {
    let previousMask = 0;
    const entries = equipItemList.value.map((entry, sourceIndex) => {
      if (!DYNAMIC_ITEM_EQUIPMENT_SLOT_MASKS.has(entry.typeId) ||
        entry.typeId <= previousMask || entry.fields.length !== 1) {
        throw mutationInvalid("Dynamic Item Equip_ItemList entry is non-canonical.", [
          `item:addition=${additionIndex}:Equip_ItemList:index=${sourceIndex}:slot=${entry.typeId}`,
        ]);
      }
      previousMask = entry.typeId;
      const equippedRes = entry.fields[0];
      if (equippedRes?.label !== "EquippedRes" || equippedRes.type !== "resref" ||
        !/^[a-z0-9_]{1,16}$/u.test(equippedRes.value)) {
        throw mutationInvalid("Dynamic Item Equip_ItemList entry has an invalid native grammar.", [
          `item:addition=${additionIndex}:Equip_ItemList:index=${sourceIndex}:native_fields`,
        ]);
      }
      return {
        typeId: entry.typeId,
        fields: buildDynamicEmbeddedDependencyFields(
          equippedRes.value,
          owner,
          additionIndex,
          context,
          depth + 1,
        ),
      };
    });
    output.push({ label: "Equip_ItemList", type: "list", value: entries });
  }
  return output;
}

function buildDynamicEmbeddedDependencyFields(
  templateResRef: string,
  owner: Pick<NewAreaObjectAdditionBase, "localObjectId">,
  additionIndex: number,
  context: DynamicItemDependencyContext,
  depth: number,
): SupportedGffField[] {
  const profile = AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
  context.referenceOccurrences += 1;
  if (context.referenceOccurrences > profile.maxNestedReferenceOccurrences) {
    throw mutationInvalid("Dynamic Item reference count exceeds the admitted profile.", [
      `item:addition=${additionIndex}:dependencies:references=${context.referenceOccurrences}`,
    ]);
  }
  if (depth > profile.maxNestedDepth) {
    throw mutationInvalid("Dynamic Item dependency depth exceeds the admitted profile.", [
      `item:addition=${additionIndex}:dependencies:depth=${depth}`,
    ]);
  }
  if (context.visiting.has(templateResRef)) {
    throw mutationInvalid("Dynamic Item dependency graph contains a cycle.", [
      `item:addition=${additionIndex}:dependencies:cycle=${templateResRef}`,
    ]);
  }
  const dependency = context.dependencies.get(templateResRef);
  if (!dependency) {
    throw mutationInvalid("Dynamic Item dependency is missing.", [
      `item:addition=${additionIndex}:dependencies:missing=${templateResRef}`,
    ]);
  }
  const document = parseRawGffDocument(dependency.bytes);
  const tagFields = document?.fields.filter((field) => field.label === "Tag") ?? [];
  const tag = tagFields[0];
  if (tagFields.length !== 1 || tag?.type !== "cexostring" || tag.value.length < 1 ||
    tag.value.length > 256 || tag.value.includes("\0")) {
    throw mutationInvalid("Dynamic Item dependency Tag is invalid.", [
      `item:addition=${additionIndex}:dependencies:${templateResRef}:Tag`,
    ]);
  }
  context.used.add(templateResRef);
  context.visiting.add(templateResRef);
  try {
    const embedded = buildDynamicItemAdditionInternal({
      kind: "item",
      localObjectId: `${owner.localObjectId}:nested:${templateResRef}`,
      sourceProfileId: profile.id,
      sourceObjectKey: `dependency:${templateResRef}`,
      sourceSizeBytes: dependency.bytes.length,
      templateResRef,
      resRef: templateResRef,
      tag: tag.value,
      sourceSha256: dependency.sha256,
      resolvedModelType: dependency.resolvedModelType,
      blueprintBytes: dependency.bytes,
      x: 0,
      y: 0,
      z: 0,
      bearing: 0,
    }, additionIndex, context, depth);
    return embedded.git.fields.map((field): SupportedGffField => {
      if (field.label === "XPosition" || field.label === "YPosition" ||
        field.label === "ZPosition") {
        return { label: field.label, type: "float", value: -1 };
      }
      if (field.label === "XOrientation") {
        return { label: field.label, type: "float", value: 0 };
      }
      if (field.label === "YOrientation") {
        return { label: field.label, type: "float", value: 1 };
      }
      return field;
    });
  } finally {
    context.visiting.delete(templateResRef);
  }
}

function dynamicItemAppearanceProfile(modelType: 0 | 1 | 2 | 3) {
  const find = (key: typeof ITEM_BASE_APPEARANCE_GFF_PROFILE[number]["key"]) =>
    ITEM_BASE_APPEARANCE_GFF_PROFILE.find((entry) => entry.key === key)!;
  if (modelType === 0) return [find("modelPart1")];
  if (modelType === 1) return [
    find("modelPart1"),
    ...AREA_ITEM_MATERIAL_COLOR_KEYS.map((key) => find(key)),
  ];
  if (modelType === 2) return [find("modelPart1"), find("modelPart2"), find("modelPart3")];
  return [
    ...AREA_ITEM_ARMOR_PART_KEYS.map((key) => find(key)),
    ...AREA_ITEM_MATERIAL_COLOR_KEYS.map((key) => find(key)),
  ];
}

function normalizeDynamicItemPropertiesList(
  field: Extract<SupportedGffField, { type: "list" }> | undefined,
  additionIndex: number,
): Extract<SupportedGffField, { type: "list" }> {
  const entries = (field?.value ?? []).map((entry, sourceIndex) => {
    if (entry.typeId !== 0) {
      throw mutationInvalid("Dynamic Item PropertiesList entry has an unsupported struct type.", [
        `item:addition=${additionIndex}:PropertiesList:index=${sourceIndex}:type=${entry.typeId}`,
      ]);
    }
    const profiles = [
      ["PropertyName", "word", 0], ["Subtype", "word", 0xffff],
      ["CostTable", "byte", 0], ["CostValue", "word", 0],
      ["Param1", "byte", 0xff], ["Param1Value", "byte", 0],
      ["ChanceAppear", "byte", 100],
    ] as const;
    const allowed = new Set<string>(profiles.map(([label]) => label));
    const unexpected = entry.fields.find((candidate) => !allowed.has(candidate.label));
    if (unexpected) {
      throw mutationInvalid("Dynamic Item PropertiesList contains an unsupported field.", [
        `item:addition=${additionIndex}:PropertiesList:index=${sourceIndex}:${unexpected.label}:unsupported`,
      ]);
    }
    return Object.fromEntries(profiles.map(([label, type, fallback]) => {
      const matches = entry.fields.filter((candidate) => candidate.label === label);
      const candidate = matches[0];
      if (matches.length > 1 || (candidate && candidate.type !== type)) {
        throw mutationInvalid("Dynamic Item PropertiesList entry field is invalid.", [
          `item:addition=${additionIndex}:PropertiesList:index=${sourceIndex}:${label}:count=${matches.length}:type=${candidate?.type ?? "missing"}`,
        ]);
      }
      return [label[0]!.toLowerCase() + label.slice(1), candidate?.value ?? fallback];
    }));
  });
  let normalized;
  try {
    normalized = parseAreaItemPropertyListTargetEntries(entries);
  } catch (error) {
    throw mutationInvalid("Dynamic Item PropertiesList exceeds the admitted profile.", [
      `item:addition=${additionIndex}:PropertiesList:${error instanceof Error ? error.message : "invalid"}`,
    ]);
  }
  return {
    label: "PropertiesList",
    type: "list",
    value: normalized.map((entry) => buildNativeItemPropertyListEntry(entry)),
  };
}

function buildItemAddition(
  addition: NewAreaItemAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  return addition.sourceProfileId === AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id
    ? buildDynamicItemAddition(addition, index)
    : buildFrozenItemAddition(addition, index);
}

function buildFrozenItemAddition(
  addition: NewAreaItemAddition,
  index: number,
): AreaObjectAdditionReadbackExpectation {
  const document = parseRawGffDocument(addition.blueprintBytes);
  const profile = AREA_ITEM_CONSTRUCTION_PROFILE;
  if (
    !document ||
    document.fileType !== profile.fileType ||
    document.fileVersion !== profile.fileVersion ||
    document.rootStructTypeId !== profile.rootStructTypeId
  ) {
    throw mutationInvalid("Item blueprint is not the admitted native UTI V3.2 root profile.", [
      `item:addition=${index}:gff_identity`,
    ]);
  }
  if (
    addition.sourceProfileId !== profile.id ||
    addition.templateResRef !== profile.templateResRef ||
    addition.resRef !== profile.templateResRef ||
    addition.tag !== profile.templateTag
  ) {
    throw mutationInvalid("Item addition differs from the admitted immutable source profile.", [
      `item:addition=${index}:profile_or_identity_mismatch`,
    ]);
  }

  const expectedFields = [
    ["BaseItem", "int", 16],
    ["StackSize", "word", 1],
    ["ArmorPart_Pelvis", "byte", 3],
    ["Stolen", "byte", 0],
    ["LocalizedName", "cexolocstring", { strRef: 12923, entries: [] }],
    ["ArmorPart_RShoul", "byte", 0],
    ["ArmorPart_LThigh", "byte", 3],
    ["ArmorPart_Belt", "byte", 0],
    ["Description", "cexolocstring", { strRef: 0xffffffff, entries: [] }],
    ["ArmorPart_RThigh", "byte", 3],
    ["ArmorPart_LHand", "byte", 1],
    ["Cost", "dword", 1],
    ["ArmorPart_RFoot", "byte", 6],
    ["ArmorPart_LShoul", "byte", 0],
    ["DescIdentified", "cexolocstring", { strRef: 0xffffffff, entries: [] }],
    ["ArmorPart_LShin", "byte", 16],
    ["Leather2Color", "byte", 14],
    ["ArmorPart_RHand", "byte", 1],
    ["PropertiesList", "list", []],
    ["ArmorPart_Torso", "byte", 39],
    ["Tag", "cexostring", "NW_CLOTH022"],
    ["Leather1Color", "byte", 11],
    ["Cloth1Color", "byte", 11],
    ["PaletteID", "byte", 5],
    ["Comment", "cexostring", "1"],
    ["TemplateResRef", "resref", "nw_cloth022"],
    ["Charges", "byte", 0],
    ["Identified", "byte", 1],
    ["ArmorPart_RShin", "byte", 16],
    ["Plot", "byte", 0],
    ["ArmorPart_Neck", "byte", 1],
    ["ArmorPart_LFoot", "byte", 6],
    ["Cloth2Color", "byte", 7],
    ["Metal1Color", "byte", 23],
    ["AddCost", "dword", 0],
    ["ArmorPart_RBicep", "byte", 1],
    ["ArmorPart_RFArm", "byte", 1],
    ["ArmorPart_LFArm", "byte", 1],
    ["ArmorPart_LBicep", "byte", 1],
    ["Metal2Color", "byte", 6],
  ] as const;
  if (document.fields.length !== expectedFields.length) {
    throw mutationInvalid("Item blueprint field profile is invalid.", [
      `item:addition=${index}:field_count=${document.fields.length}:expected=${expectedFields.length}`,
    ]);
  }
  const fields = new Map<string, SupportedGffField>();
  for (const [label, type, expected] of expectedFields) {
    const blueprintField = requireBlueprintField(document, label, type, index, "item");
    if (JSON.stringify(blueprintField.value) !== JSON.stringify(expected)) {
      throw mutationInvalid("Item blueprint value profile is invalid.", [
        `item:addition=${index}:${label}:value_mismatch`,
      ]);
    }
    fields.set(label, blueprintField);
  }
  const field = (label: string): SupportedGffField => ({ ...fields.get(label)! } as SupportedGffField);
  const armorParts = [
    ["RFoot", "RFoot", 6], ["LFoot", "LFoot", 6],
    ["RShin", "RShin", 16], ["LShin", "LShin", 16],
    ["LThigh", "LThig", 3], ["RThigh", "RThig", 3],
    ["Pelvis", "Pelvi", 3], ["Torso", "Torso", 39],
    ["Belt", "Belt", 0], ["Neck", "Neck", 1],
    ["RFArm", "RFArm", 1], ["LFArm", "LFArm", 1],
    ["RBicep", "RBice", 1], ["LBicep", "LBice", 1],
    ["RShoul", "RShou", 0], ["LShoul", "LShou", 0],
    ["RHand", "RHand", 1], ["LHand", "LHand", 1],
    ["Robe", "Robe", 0],
  ] as const;
  const armorFields = armorParts.flatMap(([legacy, extended, value]): SupportedGffField[] => [
    { label: `ArmorPart_${legacy}`, type: "byte", value },
    { label: `xArmorPart_${extended}`, type: "word", value },
  ]);
  const gitFields: SupportedGffField[] = [
    { label: "XPosition", type: "float", value: Math.fround(addition.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(addition.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(addition.z * 10) },
    { label: "XOrientation", type: "float", value: Math.fround(Math.cos(addition.bearing)) },
    { label: "YOrientation", type: "float", value: Math.fround(-Math.sin(addition.bearing)) },
    field("TemplateResRef"),
    field("BaseItem"),
    field("LocalizedName"),
    field("Description"),
    field("DescIdentified"),
    field("Tag"),
    field("Charges"),
    field("Cost"),
    field("Stolen"),
    field("StackSize"),
    field("Plot"),
    field("AddCost"),
    field("Identified"),
    { label: "Cursed", type: "byte", value: 0 },
    ...armorFields,
    field("Leather1Color"),
    field("Leather2Color"),
    field("Cloth1Color"),
    field("Cloth2Color"),
    field("Metal1Color"),
    field("Metal2Color"),
    field("PropertiesList"),
  ];
  return Object.freeze({
    kind: "item" as const,
    localObjectId: addition.localObjectId,
    git: Object.freeze({ typeId: 0, fields: gitFields }),
    gic: Object.freeze({
      typeId: 0,
      fields: [{ label: "Comment", type: "cexostring" as const, value: "1" }],
    }),
  });
}

type FieldOfType<Type extends SupportedGffField["type"]> = Extract<
  SupportedGffField,
  { type: Type }
>;

function requireBlueprintField<Type extends SupportedGffField["type"]>(
  document: RawDocument,
  label: string,
  type: Type,
  additionIndex: number,
  kind: "creature" | "item" | "placeable" | "sound" | "store" | "waypoint" = "waypoint",
): FieldOfType<Type> {
  const matches = document.fields.filter((field) => field.label === label);
  if (matches.length !== 1) {
    throw mutationInvalid(`${capitalizeKind(kind)} blueprint field profile is invalid.`, [
      `${kind}:addition=${additionIndex}:${label}:count=${matches.length}:type=${matches.length === 0 ? "missing" : matches[0]!.type}`,
    ]);
  }
  const field = matches[0]!;
  if (field.type !== type) {
    throw mutationInvalid(`${capitalizeKind(kind)} blueprint field profile is invalid.`, [
      `${kind}:addition=${additionIndex}:${label}:count=1:type=${field.type}`,
    ]);
  }
  return field as FieldOfType<Type>;
}

function optionalBlueprintField<Type extends SupportedGffField["type"]>(
  document: RawDocument,
  label: string,
  type: Type,
  additionIndex: number,
): FieldOfType<Type> | undefined {
  const matches = document.fields.filter((field) => field.label === label);
  if (matches.length === 0) return undefined;
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== type) {
    throw mutationInvalid("Waypoint blueprint optional field profile is invalid.", [
      `waypoint:addition=${additionIndex}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return field as FieldOfType<Type>;
}

function parsePair(
  gitBytes: Buffer,
  gicBytes: Buffer,
): Readonly<{ git: RawDocument; gic: RawDocument }> {
  const git = parseRawGffDocument(gitBytes);
  const gic = parseRawGffDocument(gicBytes);
  const diagnostics: string[] = [];
  if (!git || git.fileType !== "GIT " || git.fileVersion !== "V3.2") {
    diagnostics.push("git:invalid_gff_identity");
  }
  if (!gic || gic.fileType !== "GIC " || gic.fileVersion !== "V3.2") {
    diagnostics.push("gic:invalid_gff_identity");
  }
  if (!git || !gic || diagnostics.length > 0) {
    throw companionMismatch("Area GIT/GIC could not be parsed as a native V3.2 pair.", diagnostics);
  }
  return Object.freeze({ git, gic });
}

function inspectParsedPair(
  pair: Readonly<{ git: RawDocument; gic: RawDocument }>,
): AreaObjectPairInspection {
  const diagnostics: string[] = [];
  const values = new Map<AreaObjectPairKind, number>();
  for (const profile of FAMILY_PROFILES) {
    const gitList = requireCanonicalList(pair.git, "git", profile, diagnostics);
    const gicList = requireCanonicalList(pair.gic, "gic", profile, diagnostics);
    if (!gitList || !gicList) {
      continue;
    }
    validateStructTypes(gitList, "git", profile, diagnostics);
    validateStructTypes(gicList, "gic", profile, diagnostics);
    if (gitList.value.length !== gicList.value.length) {
      diagnostics.push(
        `${profile.kind}:cardinality:git=${gitList.value.length}:gic=${gicList.value.length}`,
      );
      continue;
    }
    values.set(profile.kind, gitList.value.length);
  }
  if (diagnostics.length > 0 || values.size !== FAMILY_PROFILES.length) {
    throw companionMismatch(
      "Area GIT/GIC does not satisfy the canonical nine-family paired profile.",
      diagnostics,
    );
  }
  const counts = countsFrom((profile) => values.get(profile.kind) ?? 0);
  return Object.freeze({ counts, total: sumCounts(counts) });
}

function requireCanonicalList(
  document: RawDocument,
  resource: "git" | "gic",
  profile: AreaObjectFamilyProfile,
  diagnostics: string[],
): GffListField | undefined {
  const matches = document.fields.filter((field) => field.label === profile.label);
  if (matches.length !== 1) {
    diagnostics.push(`${resource}:${profile.kind}:list_count=${matches.length}`);
    return undefined;
  }
  const field = matches[0];
  if (field?.type !== "list") {
    diagnostics.push(`${resource}:${profile.kind}:list_type=${field?.type ?? "missing"}`);
    return undefined;
  }
  return field;
}

function validateStructTypes(
  field: GffListField,
  resource: "git" | "gic",
  profile: AreaObjectFamilyProfile,
  diagnostics: string[],
): void {
  field.value.forEach((entry, index) => {
    if (entry.typeId !== profile.structTypeId) {
      diagnostics.push(
        `${resource}:${profile.kind}:${index}:struct_type=${entry.typeId}:expected=${profile.structTypeId}`,
      );
    }
  });
}

function normalizeDeletionIndexes(
  deletions: readonly ExistingAreaObjectDeletion[],
  counts: AreaObjectPairCounts,
): ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>> {
  const indexes = new Map<AreaObjectPairKind, Set<number>>();
  for (const deletion of deletions) {
    const profile = FAMILY_PROFILES.find((candidate) => candidate.kind === deletion.kind);
    if (!profile) {
      throw mutationInvalid("Object deletion identifies an unsupported family.", [
        `kind=${String(deletion.kind)}`,
      ]);
    }
    if (
      !Number.isSafeInteger(deletion.sourceIndex) ||
      deletion.sourceIndex < 0 ||
      deletion.sourceIndex >= counts[profile.kind]
    ) {
      throw mutationInvalid("Object deletion source ordinal is outside the immutable family list.", [
        `${profile.kind}:index=${deletion.sourceIndex}:count=${counts[profile.kind]}`,
      ]);
    }
    const familyIndexes = indexes.get(profile.kind) ?? new Set<number>();
    if (familyIndexes.has(deletion.sourceIndex)) {
      throw mutationInvalid("The same immutable object ordinal was deleted more than once.", [
        `${profile.kind}:index=${deletion.sourceIndex}`,
      ]);
    }
    familyIndexes.add(deletion.sourceIndex);
    indexes.set(profile.kind, familyIndexes);
  }
  return indexes;
}

function normalizeObjectTransforms(
  transforms: readonly ExistingAreaObjectTransform[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaObjectTransform> {
  const normalized = new Map<string, ExistingAreaObjectTransform>();
  for (const transform of transforms) {
    const rawKind = (transform as Readonly<{ kind: unknown }>).kind;
    if (
      rawKind !== "creature" &&
      rawKind !== "encounter" &&
      rawKind !== "item" &&
      rawKind !== "placeable" &&
      rawKind !== "sound" &&
      rawKind !== "store" &&
      rawKind !== "trigger" &&
      rawKind !== "waypoint"
    ) {
      throw mutationInvalid("Existing object transform identifies an unsupported family.", [
        `kind=${String(rawKind)}`,
      ]);
    }
    const displayKind = capitalizeKind(transform.kind);
    const count = counts[transform.kind];
    if (
      !Number.isSafeInteger(transform.sourceIndex) ||
      transform.sourceIndex < 0 ||
      transform.sourceIndex >= count
    ) {
      throw mutationInvalid(`${displayKind} transform source ordinal is outside the immutable family list.`, [
        `${transform.kind}:index=${transform.sourceIndex}:count=${count}`,
      ]);
    }
    const key = transformKey(transform.kind, transform.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid(`The same immutable ${transform.kind} ordinal was transformed more than once.`, [
        `${transform.kind}:index=${transform.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get(transform.kind)?.has(transform.sourceIndex)) {
      throw mutationInvalid(`One immutable ${transform.kind} ordinal cannot be transformed and deleted.`, [
        `${transform.kind}:index=${transform.sourceIndex}`,
      ]);
    }
    const sceneValues: Readonly<Record<string, number>> = transform.kind === "encounter" || transform.kind === "sound" || transform.kind === "trigger"
      ? { x: transform.x, y: transform.y, z: transform.z }
      : { x: transform.x, y: transform.y, z: transform.z, bearing: transform.bearing };
    for (const [field, value] of Object.entries(sceneValues)) {
      if (!Number.isFinite(value) || Math.abs(value) > 1_000_000) {
        throw mutationInvalid(`${displayKind} transform contains a non-finite or out-of-range scene value.`, [
          `${transform.kind}:index=${transform.sourceIndex}:${field}`,
        ]);
      }
    }
    normalized.set(key, Object.freeze({ ...transform }));
  }
  return normalized;
}

function normalizePolygonMutations(
  mutations: readonly ExistingAreaObjectPolygonMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaObjectPolygonMutation> {
  if (mutations.length > MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained polygon mutations were requested.", [
      `polygon:count=${mutations.length}:max=${MAX_AREA_OBJECT_POLYGON_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaObjectPolygonMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaObjectPolygonMutation(input);
    if (!mutation) {
      throw mutationInvalid("Polygon mutation requires one complete changed CAS pair.", [
        `polygon:invalid`,
      ]);
    }
    const count = counts[mutation.kind];
    if (mutation.sourceIndex >= count) {
      throw mutationInvalid("Polygon mutation source ordinal is outside the immutable family list.", [
        `${mutation.kind}:index=${mutation.sourceIndex}:count=${count}`,
      ]);
    }
    const key = transformKey(mutation.kind, mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid(`One immutable ${mutation.kind} polygon cannot be mutated twice.`, [
        `${mutation.kind}:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get(mutation.kind)?.has(mutation.sourceIndex)) {
      throw mutationInvalid(`One immutable ${mutation.kind} polygon cannot be mutated and deleted.`, [
        `${mutation.kind}:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundIntervalVariationMutations(
  mutations: readonly ExistingAreaSoundIntervalVariationMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundIntervalVariationMutation> {
  if (mutations.length > MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound interval/variation mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_INTERVAL_VARIATION_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundIntervalVariationMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundIntervalVariationMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound interval/variation mutation requires one complete changed exact CAS pair.",
        ["sound:interval_variation:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound interval/variation mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid(
        "One immutable Sound interval/variation tuple cannot be mutated twice.",
        [`sound:index=${mutation.sourceIndex}`],
      );
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid(
        "One immutable Sound interval/variation tuple cannot be mutated and deleted.",
        [`sound:index=${mutation.sourceIndex}`],
      );
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundVolumeMutations(
  mutations: readonly ExistingAreaSoundVolumeMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundVolumeMutation> {
  if (mutations.length > MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound base-volume mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_VOLUME_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundVolumeMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundVolumeMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound base-volume mutation requires one complete changed exact CAS pair.",
        ["sound:volume:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound base-volume mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound base-volume value cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound base-volume value cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundScheduleMutations(
  mutations: readonly ExistingAreaSoundScheduleMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundScheduleMutation> {
  if (mutations.length > MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound schedule mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_SCHEDULE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundScheduleMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundScheduleMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound schedule mutation requires one complete changed exact CAS pair.",
        ["sound:schedule:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound schedule mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound schedule tuple cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound schedule tuple cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundActiveMutations(
  mutations: readonly ExistingAreaSoundActiveMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundActiveMutation> {
  if (mutations.length > MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound Active mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_ACTIVE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundActiveMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundActiveMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound Active mutation requires one complete changed exact CAS pair.",
        ["sound:active:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound Active mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound Active value cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound Active value cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundPlayOrderMutations(
  mutations: readonly ExistingAreaSoundPlayOrderMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundPlayOrderMutation> {
  if (mutations.length > MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound Play Order mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_PLAY_ORDER_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundPlayOrderMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlayOrderMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound Play Order mutation requires one complete changed exact CAS pair.",
        ["sound:play_order:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound Play Order mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound Play Order value cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound Play Order value cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundPlayStyleMutations(
  mutations: readonly ExistingAreaSoundPlayStyleMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundPlayStyleMutation> {
  if (mutations.length > MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound Play Style mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_PLAY_STYLE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundPlayStyleMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlayStyleMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound Play Style mutation requires one complete changed exact CAS pair.",
        ["sound:play_style:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound Play Style mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound Play Style value cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound Play Style value cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundPlaybackMutations(
  mutations: readonly ExistingAreaSoundPlaybackMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundPlaybackMutation> {
  if (mutations.length > MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound playback mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_PLAYBACK_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundPlaybackMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundPlaybackMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound playback mutation requires one complete changed exact CAS pair.",
        ["sound:playback:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound playback mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound playback value cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound playback value cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeSoundProfileMutations(
  mutations: readonly ExistingAreaSoundProfileMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaSoundProfileMutation> {
  if (mutations.length > MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE) {
    throw mutationInvalid("Too many retained Sound profile mutations were requested.", [
      `sound:count=${mutations.length}:max=${MAX_AREA_SOUND_PROFILE_MUTATIONS_PER_UPDATE}`,
    ]);
  }
  const normalized = new Map<string, ExistingAreaSoundProfileMutation>();
  for (const input of mutations) {
    const mutation = readExistingAreaSoundProfileMutation(input);
    if (!mutation) {
      throw mutationInvalid(
        "Sound profile mutation requires one complete changed exact CAS pair.",
        ["sound:profile:invalid"],
      );
    }
    if (mutation.sourceIndex >= counts.sound) {
      throw mutationInvalid(
        "Sound profile mutation source ordinal is outside the immutable family list.",
        [`sound:index=${mutation.sourceIndex}:count=${counts.sound}`],
      );
    }
    const key = transformKey("sound", mutation.sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("One immutable Sound profile cannot be mutated twice.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    if (deletionIndexes.get("sound")?.has(mutation.sourceIndex)) {
      throw mutationInvalid("One immutable Sound profile cannot be mutated and deleted.", [
        `sound:index=${mutation.sourceIndex}`,
      ]);
    }
    normalized.set(key, mutation);
  }
  return normalized;
}

function normalizeObjectPropertyMutations(
  mutations: readonly ExistingAreaObjectPropertyMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaObjectPropertyMutation> {
  const normalized = new Map<string, ExistingAreaObjectPropertyMutation>();
  for (const mutation of mutations) {
    const rawKind = (mutation as Readonly<{ kind: unknown }>).kind;
    const sourceIndex = (mutation as Readonly<{ sourceIndex: number }>).sourceIndex;
    if (rawKind === "waypoint") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.waypoint) {
        throw mutationInvalid("Waypoint property mutation source ordinal is outside the immutable family list.", [
          `waypoint:index=${sourceIndex}:count=${counts.waypoint}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => key !== "kind" && key !== "sourceIndex" &&
          key !== "tag" && key !== "templateResRef" && key !== "localizedName" && key !== "description" &&
          key !== "mapNote" && key !== "appearance" && key !== "variables" &&
          key !== "editorComment",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Waypoint property mutation contains an unsupported field.", [
          `waypoint:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
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
      if (!hasTag && !hasTemplateResRef && !hasLocalizedName && !hasDescription && !hasMapNote && !hasAppearance &&
        !hasVariables && !hasEditorComment) {
        throw mutationInvalid("Waypoint property mutation requires exact Tag, TemplateResRef, LocalizedName, Description, MapNote, Appearance, VarTable, and/or Comment CAS.", [
          `waypoint:index=${sourceIndex}:property:missing`,
        ]);
      }
      const tag = hasTag
        ? normalizeWaypointTagMutation(rawMutation.tag, sourceIndex)
        : undefined;
      const templateResRef = hasTemplateResRef
        ? normalizeWaypointTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
        : undefined;
      const localizedName = hasLocalizedName
        ? normalizeWaypointLocalizedNameMutation(rawMutation.localizedName, sourceIndex)
        : undefined;
      const description = hasDescription
        ? normalizeWaypointDescriptionMutation(rawMutation.description, sourceIndex)
        : undefined;
      const mapNote = hasMapNote
        ? normalizeWaypointMapNoteMutation(rawMutation.mapNote, sourceIndex)
        : undefined;
      const appearance = hasAppearance
        ? normalizeWaypointAppearanceMutation(rawMutation.appearance, sourceIndex)
        : undefined;
      const variables = hasVariables
        ? normalizeWaypointVariableMutation(rawMutation.variables, sourceIndex)
        : undefined;
      const editorComment = hasEditorComment
        ? normalizeWaypointEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      if (deletionIndexes.get("waypoint")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable Waypoint ordinal cannot be property-mutated and deleted.", [
          `waypoint:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("waypoint", sourceIndex);
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable Waypoint Tag is mutated more than once.", [
          `waypoint:index=${sourceIndex}:Tag:duplicate`,
        ]);
      }
      normalized.set(key, Object.freeze({
        kind: "waypoint",
        sourceIndex,
        ...(tag ? { tag } : {}),
        ...(templateResRef ? { templateResRef } : {}),
        ...(localizedName ? { localizedName } : {}),
        ...(description ? { description } : {}),
        ...(mapNote ? { mapNote } : {}),
        ...(appearance ? { appearance } : {}),
        ...(variables ? { variables } : {}),
        ...(editorComment ? { editorComment } : {}),
      }));
      continue;
    }
    if (rawKind === "store") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.store) {
        throw mutationInvalid("Store property mutation source ordinal is outside the immutable family list.", [
          `store:index=${sourceIndex}:count=${counts.store}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => key !== "kind" && key !== "sourceIndex" &&
          key !== "editorComment" && key !== "commerce" && key !== "scripts" &&
          key !== "variables" && key !== "restrictions" && key !== "inventory",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Store property mutation contains an unsupported field.", [
          `store:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
      const hasEditorComment = Object.prototype.hasOwnProperty.call(rawMutation, "editorComment");
      const hasCommerce = Object.prototype.hasOwnProperty.call(rawMutation, "commerce");
      const hasScripts = Object.prototype.hasOwnProperty.call(rawMutation, "scripts");
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasRestrictions = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "restrictions",
      );
      const hasInventory = Object.prototype.hasOwnProperty.call(rawMutation, "inventory");
      if (!hasEditorComment && !hasCommerce && !hasScripts && !hasVariables &&
        !hasRestrictions && !hasInventory) {
        throw mutationInvalid("Store property mutation requires Comment, commerce, script, VarTable, restrictions, and/or inventory CAS.", [
          `store:index=${sourceIndex}:property:missing`,
        ]);
      }
      const editorComment = hasEditorComment
        ? normalizeStoreEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      const commerce = hasCommerce
        ? normalizeStoreCommerceMutation(rawMutation.commerce, sourceIndex)
        : undefined;
      const scripts = hasScripts
        ? normalizeStoreScriptResRefsMutation(rawMutation.scripts, sourceIndex)
        : undefined;
      const variables = hasVariables
        ? normalizeStoreVariableMutation(rawMutation.variables, sourceIndex)
        : undefined;
      const restrictions = hasRestrictions
        ? normalizeStoreRestrictionsMutation(rawMutation.restrictions, sourceIndex)
        : undefined;
      const inventory = hasInventory
        ? normalizeStoreInventoryMutation(rawMutation.inventory, sourceIndex)
        : undefined;
      if (deletionIndexes.get("store")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable Store ordinal cannot be property-mutated and deleted.", [
          `store:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("store", sourceIndex);
      const normalizedMutation: ExistingAreaStorePropertyMutation = Object.freeze({
        kind: "store",
        sourceIndex,
        ...(editorComment ? { editorComment } : {}),
        ...(commerce ? { commerce } : {}),
        ...(scripts ? { scripts } : {}),
        ...(variables ? { variables } : {}),
        ...(restrictions ? { restrictions } : {}),
        ...(inventory ? { inventory } : {}),
      });
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable Store property is mutated more than once.", [
          `store:index=${sourceIndex}:${propertyMutationDisplayLabel(normalizedMutation)}:duplicate`,
        ]);
      }
      normalized.set(key, normalizedMutation);
      continue;
    }
    if (rawKind === "trigger") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.trigger) {
        throw mutationInvalid("Trigger property mutation source ordinal is outside the immutable family list.", [
          `trigger:index=${sourceIndex}:count=${counts.trigger}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => key !== "kind"
          && key !== "sourceIndex"
          && key !== "tag"
           && key !== "templateResRef"
           && key !== "localizedName"
          && key !== "editorComment"
          && key !== "scripts"
          && key !== "transitionStorage",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Trigger property mutation contains an unsupported field.", [
          `trigger:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
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
      if (!hasTag && !hasTemplateResRef && !hasLocalizedName && !hasEditorComment &&
          !hasScripts && !hasTransitionStorage) {
        throw mutationInvalid("Trigger property mutation requires Tag, TemplateResRef, LocalizedName, Comment, scripts, and/or transition-storage CAS.", [
          `trigger:index=${sourceIndex}:property:missing`,
        ]);
      }
      const tag = hasTag
        ? normalizeTriggerTagMutation(rawMutation.tag, sourceIndex)
        : undefined;
      const templateResRef = hasTemplateResRef
        ? normalizeTriggerTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
        : undefined;
      const localizedName = hasLocalizedName
        ? normalizeTriggerLocalizedNameMutation(rawMutation.localizedName, sourceIndex)
        : undefined;
      const editorComment = hasEditorComment
        ? normalizeTriggerEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      const scripts = hasScripts
        ? normalizeTriggerScriptResRefsMutation(rawMutation.scripts, sourceIndex)
        : undefined;
      const transitionStorage = hasTransitionStorage
        ? normalizeTriggerTransitionStorageMutation(rawMutation.transitionStorage, sourceIndex)
        : undefined;
      if (deletionIndexes.get("trigger")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable Trigger ordinal cannot be property-mutated and deleted.", [
          `trigger:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("trigger", sourceIndex);
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable Trigger property is mutated more than once.", [
          `trigger:index=${sourceIndex}:${[
            ...(tag ? ["Tag"] : []),
            ...(templateResRef ? ["TemplateResRef"] : []),
            ...(localizedName ? ["LocalizedName"] : []),
            ...(editorComment ? ["Comment"] : []),
            ...(scripts
              ? AREA_TRIGGER_SCRIPT_RESREF_FIELDS
                .filter((field) =>
                  scripts.expectedValue[field.key] !== scripts.value[field.key])
                .map((field) => field.label)
              : []),
            ...(transitionStorage
              ? ["LinkedTo", "LinkedToFlags", "LoadScreenID"]
              : []),
          ].join("+")}:duplicate`,
        ]);
      }
      normalized.set(key, Object.freeze({
        kind: "trigger",
        sourceIndex,
        ...(tag ? { tag } : {}),
        ...(templateResRef ? { templateResRef } : {}),
        ...(localizedName ? { localizedName } : {}),
        ...(editorComment ? { editorComment } : {}),
        ...(scripts ? { scripts } : {}),
        ...(transitionStorage ? { transitionStorage } : {}),
      }));
      continue;
    }
    if (rawKind === "encounter") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.encounter) {
        throw mutationInvalid("Encounter property mutation source ordinal is outside the immutable family list.", [
          `encounter:index=${sourceIndex}:count=${counts.encounter}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => key !== "kind"
          && key !== "sourceIndex"
          && key !== "tag"
          && key !== "templateResRef"
          && key !== "active"
          && key !== "playerOnly"
          && key !== "reset"
          && key !== "resetTime"
          && key !== "spawnOption"
          && key !== "respawns"
          && key !== "creatureCounts"
          && key !== "scripts"
          && key !== "faction"
          && key !== "difficulty"
          && key !== "localizedName"
          && key !== "variables"
          && key !== "creatureList"
          && key !== "spawnPoints"
          && key !== "editorComment",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Encounter property mutation contains an unsupported field.", [
          `encounter:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
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
      const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
      const hasCreatureList = Object.prototype.hasOwnProperty.call(rawMutation, "creatureList");
      const hasSpawnPoints = Object.prototype.hasOwnProperty.call(rawMutation, "spawnPoints");
      if (!hasTag && !hasTemplateResRef && !hasActive && !hasPlayerOnly && !hasReset && !hasResetTime && !hasSpawnOption && !hasRespawns && !hasCreatureCounts && !hasScripts && !hasFaction && !hasDifficulty && !hasLocalizedName && !hasVariables && !hasCreatureList && !hasSpawnPoints && !hasEditorComment) {
        throw mutationInvalid(
          "Encounter property mutation requires SpawnPointList, Comment, LocalizedName, VarTable, CreatureList, Tag, TemplateResRef, Active, PlayerOnly, Reset, ResetTime, SpawnOption, Respawns, creature-count, script, Faction, and/or Difficulty CAS.",
          [
          `encounter:index=${sourceIndex}:property:missing`,
          ],
        );
      }
      const tag = hasTag
        ? normalizeEncounterTagMutation(rawMutation.tag, sourceIndex)
        : undefined;
      const templateResRef = hasTemplateResRef
        ? normalizeEncounterTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
        : undefined;
      const active = hasActive
        ? normalizeEncounterActiveMutation(rawMutation.active, sourceIndex)
        : undefined;
      const playerOnly = hasPlayerOnly
        ? normalizeEncounterPlayerOnlyMutation(rawMutation.playerOnly, sourceIndex)
        : undefined;
      const reset = hasReset
        ? normalizeEncounterResetMutation(rawMutation.reset, sourceIndex)
        : undefined;
      const resetTime = hasResetTime
        ? normalizeEncounterResetTimeMutation(rawMutation.resetTime, sourceIndex)
        : undefined;
      const spawnOption = hasSpawnOption
        ? normalizeEncounterSpawnOptionMutation(rawMutation.spawnOption, sourceIndex)
        : undefined;
      const respawns = hasRespawns
        ? normalizeEncounterRespawnsMutation(rawMutation.respawns, sourceIndex)
        : undefined;
      const creatureCounts = hasCreatureCounts
        ? normalizeEncounterCreatureCountMutation(rawMutation.creatureCounts, sourceIndex)
        : undefined;
      const scripts = hasScripts
        ? normalizeEncounterScriptResRefsMutation(rawMutation.scripts, sourceIndex)
        : undefined;
      const faction = hasFaction
        ? normalizeEncounterFactionMutation(rawMutation.faction, sourceIndex)
        : undefined;
      const difficulty = hasDifficulty
        ? normalizeEncounterDifficultyMutation(rawMutation.difficulty, sourceIndex)
        : undefined;
      const localizedName = hasLocalizedName
        ? normalizeEncounterLocalizedNameMutation(rawMutation.localizedName, sourceIndex)
        : undefined;
      const editorComment = hasEditorComment
        ? normalizeEncounterEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      const variables = hasVariables
        ? normalizeEncounterVariableMutation(rawMutation.variables, sourceIndex)
        : undefined;
      const creatureList = hasCreatureList
        ? normalizeEncounterCreatureListMutation(rawMutation.creatureList, sourceIndex)
        : undefined;
      const spawnPoints = hasSpawnPoints
        ? normalizeEncounterSpawnPointListMutation(rawMutation.spawnPoints, sourceIndex)
        : undefined;
      if (deletionIndexes.get("encounter")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable Encounter ordinal cannot be property-mutated and deleted.", [
          `encounter:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("encounter", sourceIndex);
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable Encounter property is mutated more than once.", [
          `encounter:index=${sourceIndex}:property:duplicate`,
        ]);
      }
      normalized.set(key, Object.freeze({
        kind: "encounter",
        sourceIndex,
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
      }));
      continue;
    }
    if (rawKind === "item") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.item) {
        throw mutationInvalid("Item property mutation source ordinal is outside the immutable family list.", [
          `item:index=${sourceIndex}:count=${counts.item}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) => key !== "kind" && key !== "sourceIndex" &&
          key !== "tag" && key !== "templateResRef" &&
          key !== "instanceState" && key !== "editorComment" &&
          key !== "localizedStrings" && key !== "variables" &&
          key !== "propertyList" && key !== "baseAppearance" &&
          key !== "inventory" && key !== "visualTransform",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Item property mutation contains an unsupported field.", [
          `item:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
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
        !hasTag && !hasTemplateResRef && !hasInstanceState && !hasEditorComment &&
        !hasLocalizedStrings && !hasVariables && !hasPropertyList && !hasBaseAppearance &&
        !hasInventory && !hasVisualTransform
      ) {
        throw mutationInvalid("Item property mutation requires exact identity, state, and/or editor Comment CAS.", [
          `item:index=${sourceIndex}:property:missing`,
        ]);
      }
      const tag = hasTag
        ? normalizeItemTagMutation(rawMutation.tag, sourceIndex)
        : undefined;
      const templateResRef = hasTemplateResRef
        ? normalizeItemTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
        : undefined;
      const instanceState = hasInstanceState
        ? normalizeItemInstanceStateMutation(rawMutation.instanceState, sourceIndex)
        : undefined;
      const editorComment = hasEditorComment
        ? normalizeItemEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      const localizedStrings = hasLocalizedStrings
        ? normalizeItemLocalizedStringMutations(rawMutation.localizedStrings, sourceIndex)
        : undefined;
      const variables = hasVariables
        ? normalizeItemVariableMutation(rawMutation.variables, sourceIndex)
        : undefined;
      const propertyList = hasPropertyList
        ? normalizeItemPropertyListMutation(rawMutation.propertyList, sourceIndex)
        : undefined;
      const baseAppearance = hasBaseAppearance
        ? normalizeItemBaseAppearanceMutation(rawMutation.baseAppearance, sourceIndex)
        : undefined;
      const inventory = hasInventory
        ? normalizeItemInventoryMutation(rawMutation.inventory, sourceIndex)
        : undefined;
      const visualTransform = hasVisualTransform
        ? normalizeItemVisualTransformMutation(rawMutation.visualTransform, sourceIndex)
        : undefined;
      if (deletionIndexes.get("item")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable item ordinal cannot be property-mutated and deleted.", [
          `item:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("item", sourceIndex);
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable item property is mutated more than once.", [
          `item:index=${sourceIndex}:Comment:duplicate`,
        ]);
      }
      normalized.set(key, Object.freeze({
        kind: "item",
        sourceIndex,
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
      }));
      continue;
    }
    if (rawKind === "creature") {
      if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.creature) {
        throw mutationInvalid("Creature property mutation source ordinal is outside the immutable family list.", [
          `creature:index=${sourceIndex}:count=${counts.creature}`,
        ]);
      }
      const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
      const unexpected = Object.keys(rawMutation).find(
        (key) =>
          key !== "kind" &&
          key !== "sourceIndex" &&
          key !== "tag" &&
          key !== "conversation" &&
          key !== "interruptable" &&
          key !== "advancedFlags" &&
          key !== "bodyBag" &&
          key !== "decayTime" &&
          key !== "appearance" &&
          key !== "gender" &&
          key !== "perceptionRange" &&
          key !== "walkRate" &&
          key !== "soundSetFile" &&
          key !== "startingPackage" &&
          key !== "skillList" &&
          key !== "featList" &&
          key !== "specialAbilityList" &&
          key !== "variables" &&
          key !== "editorComment" &&
          key !== "classLevels" &&
          key !== "classIdentity" &&
          key !== "classSlotResize" &&
          key !== "phenotype" &&
          key !== "portrait" &&
          key !== "challengeRating" &&
          key !== "abilityScores" &&
          key !== "appearanceColors" &&
          key !== "bodyParts" &&
          key !== "appendages" &&
          key !== "hitPoints" &&
          key !== "naturalArmorClass" &&
          key !== "savingThrowBonuses" &&
          key !== "alignment" &&
          key !== "faction" &&
          key !== "templateResRef" &&
          key !== "specialIdentityStrings" &&
          key !== "scripts" &&
          key !== "localizedStrings" &&
          key !== "inventory" &&
          key !== "equipment",
      );
      if (unexpected !== undefined) {
        throw mutationInvalid("Creature property mutation contains an unsupported field.", [
          `creature:index=${sourceIndex}:unexpected_key=${unexpected}`,
        ]);
      }
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
      const hasClassIdentity = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classIdentity",
      );
      const hasClassSlotResize = Object.prototype.hasOwnProperty.call(
        rawMutation,
        "classSlotResize",
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
        !hasTag &&
        !hasConversation &&
        !hasInterruptable &&
        !hasAdvancedFlags &&
        !hasBodyBag &&
        !hasDecayTime &&
        !hasAppearance &&
        !hasGender &&
        !hasPerceptionRange &&
        !hasWalkRate &&
        !hasSoundSetFile &&
        !hasStartingPackage &&
        !hasSkillList &&
        !hasFeatList &&
        !hasSpecialAbilityList &&
        !hasVariables &&
        !hasEditorComment &&
        !hasClassLevels &&
        !hasClassIdentity &&
        !hasClassSlotResize &&
        !hasPhenotype &&
        !hasPortrait &&
        !hasChallengeRating &&
        !hasAbilityScores &&
        !hasAppearanceColors &&
        !hasBodyParts &&
        !hasAppendages &&
        !hasHitPoints &&
        !hasNaturalArmorClass &&
        !hasSavingThrowBonuses &&
        !hasAlignment &&
        !hasFaction &&
        !hasTemplateResRef &&
        !hasSpecialIdentityStrings &&
        !hasScripts &&
        !hasLocalizedStrings &&
        !hasInventory &&
        !hasEquipment
      ) {
        throw mutationInvalid("Creature property mutation requires an exact Tag, Conversation, Interruptable, advanced flag, BodyBag, DecayTime, Appearance, FactionID, TemplateResRef, Subrace, Deity, script ResRef, name, ItemList, or Equip_ItemList pair.", [
          `creature:index=${sourceIndex}:property_pair:missing`,
        ]);
      }
      if (hasAppearance && hasPhenotype) {
        throw mutationInvalid("Creature Phenotype cannot be changed together with Appearance_Type.", [
          `creature:index=${sourceIndex}:Phenotype:appearance_conflict`,
        ]);
      }
      if (hasGender && hasPortrait) {
        throw mutationInvalid("Creature PortraitId cannot be changed together with Gender.", [
          `creature:index=${sourceIndex}:PortraitId:gender_conflict`,
        ]);
      }
      if (hasClassIdentity && (hasClassLevels || hasStartingPackage)) {
        throw mutationInvalid(
          "Creature class-identity mutation owns ClassList.Class and StartingPackage and cannot be combined with their standalone mutations.",
          [`creature:index=${sourceIndex}:ClassList:class_identity_conflict`],
        );
      }
      if (hasClassSlotResize &&
        (hasClassLevels || hasClassIdentity || hasStartingPackage)) {
        throw mutationInvalid(
          "Creature class-slot resize owns ClassList and StartingPackage and cannot be combined with their other mutations.",
          [`creature:index=${sourceIndex}:ClassList:class_slot_resize_conflict`],
        );
      }
      const tag = hasTag
        ? normalizeCreatureTagMutation(rawMutation.tag, sourceIndex)
        : undefined;
      const conversation = hasConversation
        ? normalizeCreatureConversationMutation(rawMutation.conversation, sourceIndex)
        : undefined;
      const interruptable = hasInterruptable
        ? normalizeCreatureInterruptableMutation(rawMutation.interruptable, sourceIndex)
        : undefined;
      const advancedFlags = hasAdvancedFlags
        ? normalizeCreatureAdvancedFlagMutations(rawMutation.advancedFlags, sourceIndex)
        : undefined;
      const bodyBag = hasBodyBag
        ? normalizeCreatureBodyBagMutation(rawMutation.bodyBag, sourceIndex)
        : undefined;
      const decayTime = hasDecayTime
        ? normalizeCreatureDecayTimeMutation(rawMutation.decayTime, sourceIndex)
        : undefined;
      const appearance = hasAppearance
        ? normalizeCreatureAppearanceMutation(rawMutation.appearance, sourceIndex)
        : undefined;
      const gender = hasGender
        ? normalizeCreatureGenderMutation(rawMutation.gender, sourceIndex)
        : undefined;
      const perceptionRange = hasPerceptionRange
        ? normalizeCreaturePerceptionRangeMutation(rawMutation.perceptionRange, sourceIndex)
        : undefined;
      const walkRate = hasWalkRate
        ? normalizeCreatureWalkRateMutation(rawMutation.walkRate, sourceIndex)
        : undefined;
      const soundSetFile = hasSoundSetFile
        ? normalizeCreatureSoundSetFileMutation(rawMutation.soundSetFile, sourceIndex)
        : undefined;
      const startingPackage = hasStartingPackage
        ? normalizeCreatureStartingPackageMutation(rawMutation.startingPackage, sourceIndex)
        : undefined;
      const skillList = hasSkillList
        ? normalizeCreatureSkillListMutation(rawMutation.skillList, sourceIndex)
        : undefined;
      const featList = hasFeatList
        ? normalizeCreatureFeatListMutation(rawMutation.featList, sourceIndex)
        : undefined;
      const specialAbilityList = hasSpecialAbilityList
        ? normalizeCreatureSpecialAbilityListMutation(
            rawMutation.specialAbilityList,
            sourceIndex,
          )
        : undefined;
      const variables = hasVariables
        ? normalizeCreatureVariableMutation(rawMutation.variables, sourceIndex)
        : undefined;
      const editorComment = hasEditorComment
        ? normalizeCreatureEditorCommentMutation(rawMutation.editorComment, sourceIndex)
        : undefined;
      const classLevels = hasClassLevels
        ? normalizeCreatureClassLevelMutation(rawMutation.classLevels, sourceIndex)
        : undefined;
      const classIdentity = hasClassIdentity
        ? normalizeCreatureClassIdentityMutation(rawMutation.classIdentity, sourceIndex)
        : undefined;
      const classSlotResize = hasClassSlotResize
        ? normalizeCreatureClassSlotResizeMutation(rawMutation.classSlotResize, sourceIndex)
        : undefined;
      const classLevelTarget = classLevels ??
        (classIdentity?.levels.some(
          (level, index) => level !== classIdentity.expectedLevels[index],
        ) ? classIdentity : undefined) ?? classSlotResize;
      const phenotype = hasPhenotype
        ? normalizeCreaturePhenotypeMutation(rawMutation.phenotype, sourceIndex)
        : undefined;
      const portrait = hasPortrait
        ? normalizeCreaturePortraitMutation(rawMutation.portrait, sourceIndex)
        : undefined;
      const challengeRating = hasChallengeRating
        ? normalizeCreatureChallengeRatingMutation(rawMutation.challengeRating, sourceIndex)
        : undefined;
      const abilityScores = hasAbilityScores
        ? normalizeCreatureAbilityScoreMutations(rawMutation.abilityScores, sourceIndex)
        : undefined;
      const appearanceColors = hasAppearanceColors
        ? normalizeCreatureAppearanceColorMutations(rawMutation.appearanceColors, sourceIndex)
        : undefined;
      const bodyParts = hasBodyParts
        ? normalizeCreatureBodyPartMutations(rawMutation.bodyParts, sourceIndex)
        : undefined;
      const appendages = hasAppendages
        ? normalizeCreatureAppendageMutations(rawMutation.appendages, sourceIndex)
        : undefined;
      const hitPoints = hasHitPoints
        ? normalizeCreatureHitPointMutation(rawMutation.hitPoints, sourceIndex)
        : undefined;
      if (featList && featList.row40Transition !== "unchanged" && !hitPoints) {
        throw mutationInvalid(
          "Creature FeatList row-40 transition requires the coupled hit-point mutation.",
          [`creature:index=${sourceIndex}:FeatList:hit_points_coupling_missing`],
        );
      }
      if (featList && featList.row40Transition !== "unchanged" &&
        (hitPoints?.featRow40Present !== featList.expectedFeatIds.includes(40) ||
          hitPoints.targetFeatRow40Present !== featList.featIds.includes(40))) {
        throw mutationInvalid(
          "Creature FeatList and hit-point feat-row-40 states differ.",
          [`creature:index=${sourceIndex}:FeatList:hit_points_coupling_mismatch`],
        );
      }
      if (hitPoints?.targetFeatRow40Present !== undefined &&
        (!featList || featList.row40Transition === "unchanged")) {
        throw mutationInvalid(
          "Creature hit-point feat-row-40 transition requires the matching FeatList mutation.",
          [`creature:index=${sourceIndex}:FeatList:mutation_coupling_missing`],
        );
      }
      const constitutionMutation = abilityScores?.constitution;
      if (constitutionMutation && !hitPoints) {
        throw mutationInvalid(
          "Creature Constitution mutation requires the coupled hit-point mutation.",
          [`creature:index=${sourceIndex}:Con:coupling_missing`],
        );
      }
      if (hitPoints && hitPoints.constitution !== hitPoints.expectedConstitution &&
        (!constitutionMutation ||
          constitutionMutation.expectedValue !== hitPoints.expectedConstitution ||
          constitutionMutation.value !== hitPoints.constitution)) {
        throw mutationInvalid(
          "Creature hit-point Constitution change requires the matching base-score mutation.",
          [`creature:index=${sourceIndex}:Con:coupling_mismatch`],
        );
      }
      if (classLevelTarget && !hitPoints) {
        throw mutationInvalid(
          "Creature ClassLevel mutation requires the coupled hit-point mutation.",
          [`creature:index=${sourceIndex}:ClassList:hit_points_coupling_missing`],
        );
      }
      if (classLevelTarget && (!hitPoints?.targetClassLevels ||
        hitPoints.targetClassLevels.length !== classLevelTarget.levels.length ||
        hitPoints.targetClassLevels.some(
          (level, index) => level !== classLevelTarget.levels[index],
        ))) {
        throw mutationInvalid(
          "Creature ClassLevel mutation and hit-point target levels differ.",
          [`creature:index=${sourceIndex}:ClassList:hit_points_coupling_mismatch`],
        );
      }
      if (hitPoints?.targetClassLevels && !classLevelTarget) {
        throw mutationInvalid(
          "Creature hit-point target levels require the matching ClassLevel mutation.",
          [`creature:index=${sourceIndex}:ClassList:mutation_coupling_missing`],
        );
      }
      const naturalArmorClass = hasNaturalArmorClass
        ? normalizeCreatureNaturalArmorClassMutation(
            rawMutation.naturalArmorClass,
            sourceIndex,
          )
        : undefined;
      const savingThrowBonuses = hasSavingThrowBonuses
        ? normalizeCreatureSavingThrowBonusMutations(
            rawMutation.savingThrowBonuses,
            sourceIndex,
          )
        : undefined;
      const alignment = hasAlignment
        ? normalizeCreatureAlignmentMutation(rawMutation.alignment, sourceIndex)
        : undefined;
      const faction = hasFaction
        ? normalizeCreatureFactionMutation(rawMutation.faction, sourceIndex)
        : undefined;
      const templateResRef = hasTemplateResRef
        ? normalizeCreatureTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
        : undefined;
      const specialIdentityStrings = hasSpecialIdentityStrings
        ? normalizeCreatureSpecialIdentityStringsMutation(
            rawMutation.specialIdentityStrings,
            sourceIndex,
          )
        : undefined;
      const scripts = hasScripts
        ? normalizeCreatureScriptResRefMutations(rawMutation.scripts, sourceIndex)
        : undefined;
      const localizedStrings = hasLocalizedStrings
        ? normalizeCreatureNameLocalizedStringMutations(rawMutation.localizedStrings, sourceIndex)
        : undefined;
      const inventory = hasInventory
        ? normalizeCreatureInventoryMutation(rawMutation.inventory, sourceIndex)
        : undefined;
      const equipment = hasEquipment
        ? normalizeCreatureEquipmentMutation(rawMutation.equipment, sourceIndex)
        : undefined;
      if (deletionIndexes.get("creature")?.has(sourceIndex)) {
        throw mutationInvalid("One immutable Creature ordinal cannot be property-mutated and deleted.", [
          `creature:index=${sourceIndex}:deleted`,
        ]);
      }
      const key = propertyMutationKey("creature", sourceIndex);
      if (normalized.has(key)) {
        throw mutationInvalid("The same immutable Creature property set is mutated more than once.", [
          `creature:index=${sourceIndex}:property:duplicate`,
        ]);
      }
      normalized.set(key, Object.freeze({
        kind: "creature",
        sourceIndex,
        ...(tag ? { tag } : {}),
        ...(conversation ? { conversation } : {}),
        ...(interruptable ? { interruptable } : {}),
        ...(advancedFlags ? { advancedFlags } : {}),
        ...(bodyBag ? { bodyBag } : {}),
        ...(decayTime ? { decayTime } : {}),
        ...(appearance ? { appearance } : {}),
        ...(gender ? { gender } : {}),
        ...(perceptionRange ? { perceptionRange } : {}),
        ...(walkRate ? { walkRate } : {}),
        ...(soundSetFile ? { soundSetFile } : {}),
        ...(startingPackage ? { startingPackage } : {}),
        ...(skillList ? { skillList } : {}),
        ...(featList ? { featList } : {}),
        ...(specialAbilityList ? { specialAbilityList } : {}),
        ...(variables ? { variables } : {}),
        ...(editorComment ? { editorComment } : {}),
        ...(classLevels ? { classLevels } : {}),
        ...(classIdentity ? { classIdentity } : {}),
        ...(classSlotResize ? { classSlotResize } : {}),
        ...(phenotype ? { phenotype } : {}),
        ...(portrait ? { portrait } : {}),
        ...(challengeRating ? { challengeRating } : {}),
        ...(abilityScores ? { abilityScores } : {}),
        ...(appearanceColors ? { appearanceColors } : {}),
        ...(bodyParts ? { bodyParts } : {}),
        ...(appendages ? { appendages } : {}),
        ...(hitPoints ? { hitPoints } : {}),
        ...(naturalArmorClass ? { naturalArmorClass } : {}),
        ...(savingThrowBonuses ? { savingThrowBonuses } : {}),
        ...(alignment ? { alignment } : {}),
        ...(faction ? { faction } : {}),
        ...(templateResRef ? { templateResRef } : {}),
        ...(specialIdentityStrings ? { specialIdentityStrings } : {}),
        ...(scripts ? { scripts } : {}),
        ...(localizedStrings ? { localizedStrings } : {}),
        ...(inventory ? { inventory } : {}),
        ...(equipment ? { equipment } : {}),
      }));
      continue;
    }
    if (rawKind !== "placeable") {
      throw mutationInvalid("Existing object property mutation identifies an unsupported family.", [
        `kind=${String(rawKind)}`,
      ]);
    }
    if (!Number.isSafeInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= counts.placeable) {
      throw mutationInvalid("Placeable property mutation source ordinal is outside the immutable family list.", [
        `placeable:index=${sourceIndex}:count=${counts.placeable}`,
      ]);
    }
    const rawMutation = mutation as unknown as Readonly<Record<string, unknown>>;
    const hasOnUsed = rawMutation.expectedOnUsed !== undefined || rawMutation.onUsed !== undefined;
    const hasStatic = rawMutation.expectedStatic !== undefined || rawMutation.static !== undefined;
    const hasUseable = rawMutation.expectedUseable !== undefined || rawMutation.useable !== undefined;
    const hasPlot = rawMutation.expectedPlot !== undefined || rawMutation.plot !== undefined;
    const hasHasInventory =
      rawMutation.expectedHasInventory !== undefined || rawMutation.hasInventory !== undefined;
    const hasScripts = rawMutation.scripts !== undefined;
    const hasTrapScripts = rawMutation.trapScripts !== undefined;
    const hasLockFields = rawMutation.lockFields !== undefined;
    const hasKeyName = rawMutation.keyName !== undefined;
    const hasInventory = rawMutation.inventory !== undefined;
    const hasBasicByteFields = rawMutation.basicByteFields !== undefined;
    const hasConversation = rawMutation.conversation !== undefined;
    const hasInterruptable = rawMutation.interruptable !== undefined;
    const hasTrapFields = rawMutation.trapFields !== undefined;
    const hasAnimationState = rawMutation.animationState !== undefined;
    const hasEditorComment = Object.prototype.hasOwnProperty.call(rawMutation, "editorComment");
    const hasAppearance = Object.prototype.hasOwnProperty.call(rawMutation, "appearance");
    const hasTrapType = Object.prototype.hasOwnProperty.call(rawMutation, "trapType");
    const hasBodyBag = Object.prototype.hasOwnProperty.call(rawMutation, "bodyBag");
    const hasPortrait = Object.prototype.hasOwnProperty.call(rawMutation, "portrait");
    const hasFaction = Object.prototype.hasOwnProperty.call(rawMutation, "faction");
    const hasVariables = Object.prototype.hasOwnProperty.call(rawMutation, "variables");
    const hasTemplateResRef = Object.prototype.hasOwnProperty.call(rawMutation, "templateResRef");
    const hasHitPoints = Object.prototype.hasOwnProperty.call(rawMutation, "hitPoints");
    const hasTag = Object.prototype.hasOwnProperty.call(rawMutation, "tag");
    const hasLocalizedStrings = Object.prototype.hasOwnProperty.call(rawMutation, "localizedStrings");
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
      !hasTrapFields &&
      !hasAnimationState &&
      !hasEditorComment &&
      !hasAppearance &&
      !hasTrapType &&
      !hasBodyBag &&
      !hasPortrait &&
      !hasFaction &&
      !hasVariables &&
      !hasTemplateResRef &&
      !hasHitPoints &&
      !hasTag &&
      !hasLocalizedStrings
    ) {
      throw mutationInvalid("Placeable property mutation must contain at least one supported field pair.", [
        `placeable:index=${sourceIndex}:property:empty`,
      ]);
    }
    if (hasOnUsed) {
      if (!isScriptResRef(rawMutation.expectedOnUsed)) {
        throw mutationInvalid("Placeable OnUsed expected value is not a valid script ResRef.", [
          `placeable:index=${sourceIndex}:OnUsed:invalid_expected_resref`,
        ]);
      }
      if (!isScriptResRef(rawMutation.onUsed)) {
        throw mutationInvalid("Placeable OnUsed target value is not a valid script ResRef.", [
          `placeable:index=${sourceIndex}:OnUsed:invalid_resref`,
        ]);
      }
      if (rawMutation.expectedOnUsed === rawMutation.onUsed) {
        throw mutationInvalid("Placeable OnUsed mutation must change the source value.", [
          `placeable:index=${sourceIndex}:OnUsed:unchanged`,
        ]);
      }
    }
    validateBooleanPropertyPair(rawMutation, sourceIndex, "Static", "expectedStatic", "static");
    validateBooleanPropertyPair(rawMutation, sourceIndex, "Useable", "expectedUseable", "useable");
    validateBooleanPropertyPair(rawMutation, sourceIndex, "Plot", "expectedPlot", "plot");
    validateBooleanPropertyPair(
      rawMutation,
      sourceIndex,
      "HasInventory",
      "expectedHasInventory",
      "hasInventory",
    );
    const scripts = hasScripts
      ? normalizePlaceableScriptMutations(rawMutation.scripts, sourceIndex)
      : undefined;
    const trapScripts = hasTrapScripts
      ? normalizePlaceableTrapScriptMutations(rawMutation.trapScripts, sourceIndex)
      : undefined;
    const lockFields = hasLockFields
      ? normalizePlaceableLockMutations(rawMutation.lockFields, sourceIndex)
      : undefined;
    const keyName = hasKeyName
      ? normalizePlaceableKeyNameMutation(rawMutation.keyName, sourceIndex)
      : undefined;
    const inventory = hasInventory
      ? normalizePlaceableInventoryMutation(rawMutation.inventory, sourceIndex)
      : undefined;
    const basicByteFields = hasBasicByteFields
      ? normalizePlaceableBasicByteMutations(rawMutation.basicByteFields, sourceIndex)
      : undefined;
    const conversation = hasConversation
      ? normalizePlaceableConversationMutation(rawMutation.conversation, sourceIndex)
      : undefined;
    const interruptable = hasInterruptable
      ? normalizePlaceableInterruptableMutation(rawMutation.interruptable, sourceIndex)
      : undefined;
    const trapFields = hasTrapFields
      ? normalizePlaceableTrapByteMutations(rawMutation.trapFields, sourceIndex)
      : undefined;
    const animationState = hasAnimationState
      ? normalizePlaceableAnimationStateMutation(rawMutation.animationState, sourceIndex)
      : undefined;
    const editorComment = hasEditorComment
      ? normalizePlaceableEditorCommentMutation(rawMutation.editorComment, sourceIndex)
      : undefined;
    const appearance = hasAppearance
      ? normalizePlaceableAppearanceMutation(rawMutation.appearance, sourceIndex)
      : undefined;
    const trapType = hasTrapType
      ? normalizePlaceableTrapTypeMutation(rawMutation.trapType, sourceIndex)
      : undefined;
    const bodyBag = hasBodyBag
      ? normalizePlaceableBodyBagMutation(rawMutation.bodyBag, sourceIndex)
      : undefined;
    const portrait = hasPortrait
      ? normalizePlaceablePortraitMutation(rawMutation.portrait, sourceIndex)
      : undefined;
    const faction = hasFaction
      ? normalizePlaceableFactionMutation(rawMutation.faction, sourceIndex)
      : undefined;
    const variables = hasVariables
      ? normalizePlaceableVariableMutation(rawMutation.variables, sourceIndex)
      : undefined;
    const templateResRef = hasTemplateResRef
      ? normalizePlaceableTemplateResRefMutation(rawMutation.templateResRef, sourceIndex)
      : undefined;
    const hitPoints = hasHitPoints
      ? normalizePlaceableHitPointMutation(rawMutation.hitPoints, sourceIndex)
      : undefined;
    const tag = hasTag
      ? normalizePlaceableTagMutation(rawMutation.tag, sourceIndex)
      : undefined;
    const localizedStrings = hasLocalizedStrings
      ? normalizePlaceableLocalizedStringMutations(rawMutation.localizedStrings, sourceIndex)
      : undefined;
    if (deletionIndexes.get("placeable")?.has(sourceIndex)) {
      throw mutationInvalid("One immutable placeable ordinal cannot be property-mutated and deleted.", [
        `placeable:index=${sourceIndex}:deleted`,
      ]);
    }
    const key = propertyMutationKey("placeable", sourceIndex);
    if (normalized.has(key)) {
      throw mutationInvalid("The same immutable placeable property is mutated more than once.", [
        `placeable:index=${sourceIndex}:${propertyMutationDisplayLabel(mutation)}:duplicate`,
      ]);
    }
    normalized.set(key, Object.freeze({
      ...(mutation as ExistingAreaPlaceablePropertyMutation),
      ...(scripts ? { scripts } : {}),
      ...(trapScripts ? { trapScripts } : {}),
      ...(lockFields ? { lockFields } : {}),
      ...(keyName ? { keyName } : {}),
      ...(inventory ? { inventory } : {}),
      ...(basicByteFields ? { basicByteFields } : {}),
      ...(conversation ? { conversation } : {}),
      ...(interruptable ? { interruptable } : {}),
      ...(trapFields ? { trapFields } : {}),
      ...(animationState ? { animationState } : {}),
      ...(editorComment ? { editorComment } : {}),
      ...(appearance ? { appearance } : {}),
      ...(trapType ? { trapType } : {}),
      ...(bodyBag ? { bodyBag } : {}),
      ...(portrait ? { portrait } : {}),
      ...(faction ? { faction } : {}),
      ...(variables ? { variables } : {}),
      ...(templateResRef ? { templateResRef } : {}),
      ...(hitPoints ? { hitPoints } : {}),
      ...(tag ? { tag } : {}),
      ...(localizedStrings ? { localizedStrings } : {}),
    }));
  }
  return normalized;
}

function normalizeDoorTransitionMutations(
  mutations: readonly ExistingAreaDoorTransitionStorageMutation[],
  counts: AreaObjectPairCounts,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
): ReadonlyMap<string, ExistingAreaDoorTransitionStorageMutation> {
  const normalized = new Map<string, ExistingAreaDoorTransitionStorageMutation>();
  for (const input of mutations) {
    const mutation = input as unknown as Readonly<Record<string, unknown>>;
    const unexpected = Object.keys(mutation).find(
      (key) => key !== "kind" && key !== "sourceIndex" && key !== "transition",
    );
    if (unexpected !== undefined || mutation.kind !== "door") {
      throw mutationInvalid("Existing Door transition mutation has an unsupported shape.", [
        `door:unexpected_key=${unexpected ?? "kind"}`,
      ]);
    }
    const sourceIndex = mutation.sourceIndex;
    if (!Number.isSafeInteger(sourceIndex) || (sourceIndex as number) < 0 ||
        (sourceIndex as number) >= counts.door) {
      throw mutationInvalid("Door transition mutation source ordinal is outside the immutable family list.", [
        `door:index=${String(sourceIndex)}:count=${counts.door}`,
      ]);
    }
    if (deletionIndexes.get("door")?.has(sourceIndex as number)) {
      throw mutationInvalid("One immutable Door ordinal cannot be updated and deleted.", [
        `door:index=${sourceIndex}`,
      ]);
    }
    const transition = readExistingAreaDoorTransitionStorageMutation(mutation.transition);
    if (!transition) {
      throw mutationInvalid("Door transition mutation requires one complete changed exact trio pair.", [
        `door:index=${sourceIndex}:transition:invalid_pair`,
      ]);
    }
    const key = propertyMutationKey("door", sourceIndex as number);
    if (normalized.has(key)) {
      throw mutationInvalid("One Door transition may be mutated only once.", [
        `door:index=${sourceIndex}:transition:duplicate`,
      ]);
    }
    normalized.set(key, Object.freeze({
      kind: "door",
      sourceIndex: sourceIndex as number,
      transition,
    }));
  }
  return normalized;
}

function normalizePlaceableLocalizedStringMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableLocalizedStringMutation[] {
  const mutations = readExistingAreaPlaceableLocalizedStringMutations(input);
  if (!mutations) {
    throw mutationInvalid("Placeable localized-string mutation list is invalid.", [
      `placeable:index=${sourceIndex}:localizedStrings:invalid_pair`,
    ]);
  }
  return mutations;
}

function normalizePlaceableTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableTagMutation {
  const mutation = readExistingAreaPlaceableTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable Tag mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureTagMutation {
  const mutation = readExistingAreaCreatureTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Tag mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureConversationMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureConversationMutation {
  const mutation = readExistingAreaCreatureConversationMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Conversation mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Conversation:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureInterruptableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureInterruptableMutation {
  const mutation = readExistingAreaCreatureInterruptableMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Interruptable mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Interruptable:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureAdvancedFlagMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAdvancedFlagMutations {
  const mutations = readExistingAreaCreatureAdvancedFlagMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature advanced flag mutation group is invalid.", [
      `creature:index=${sourceIndex}:advancedFlags:invalid_group`,
    ]);
  }
  return mutations;
}

function normalizeCreatureBodyBagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureBodyBagMutation {
  const mutation = readExistingAreaCreatureBodyBagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature BodyBag mutation is invalid.", [
      `creature:index=${sourceIndex}:BodyBag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureDecayTimeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureDecayTimeMutation {
  const mutation = readExistingAreaCreatureDecayTimeMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature DecayTime mutation is invalid.", [
      `creature:index=${sourceIndex}:DecayTime:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureAppearanceMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAppearanceMutation {
  const mutation = readExistingAreaCreatureAppearanceMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Appearance mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Appearance_Type:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureGenderMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureGenderMutation {
  const mutation = readExistingAreaCreatureGenderMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Gender mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Gender:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreaturePerceptionRangeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreaturePerceptionRangeMutation {
  const mutation = readExistingAreaCreaturePerceptionRangeMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature PerceptionRange mutation pair is invalid.", [
      `creature:index=${sourceIndex}:PerceptionRange:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureWalkRateMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureWalkRateMutation {
  const mutation = readExistingAreaCreatureWalkRateMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature WalkRate mutation pair is invalid.", [
      `creature:index=${sourceIndex}:WalkRate:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureSoundSetFileMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureSoundSetFileMutation {
  const mutation = readExistingAreaCreatureSoundSetFileMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature SoundSetFile mutation pair is invalid.", [
      `creature:index=${sourceIndex}:SoundSetFile:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureStartingPackageMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureStartingPackageMutation {
  const mutation = readExistingAreaCreatureStartingPackageMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature StartingPackage mutation pair is invalid.", [
      `creature:index=${sourceIndex}:StartingPackage:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureSkillListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureSkillListMutation {
  const mutation = readExistingAreaCreatureSkillListMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature SkillList mutation pair is invalid.", [
      `creature:index=${sourceIndex}:SkillList:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureFeatListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureFeatListMutation {
  const mutation = readExistingAreaCreatureFeatListMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature FeatList mutation pair is invalid.", [
      `creature:index=${sourceIndex}:FeatList:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureSpecialAbilityListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureSpecialAbilityListMutation {
  const mutation = readExistingAreaCreatureSpecialAbilityListMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature SpecAbilityList mutation pair is invalid.", [
      `creature:index=${sourceIndex}:SpecAbilityList:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureClassLevelMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureClassLevelMutation {
  const mutation = readExistingAreaCreatureClassLevelMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature ClassLevel mutation vector is invalid.", [
      `creature:index=${sourceIndex}:ClassList:invalid_level_vector`,
    ]);
  }
  return mutation;
}

function normalizeCreatureClassIdentityMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureClassIdentityMutation {
  const mutation = readExistingAreaCreatureClassIdentityMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Creature class-identity mutation requires one exact same-roster destructive-clear contract.",
      [`creature:index=${sourceIndex}:ClassList:invalid_class_identity_mutation`],
    );
  }
  return mutation;
}

function normalizeCreatureClassSlotResizeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureClassSlotResizeMutation {
  const mutation = readExistingAreaCreatureClassSlotResizeMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Creature class-slot resize requires one exact tail-only append or confirmed truncation contract.",
      [`creature:index=${sourceIndex}:ClassList:invalid_class_slot_resize`],
    );
  }
  return mutation;
}

function normalizeCreaturePhenotypeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreaturePhenotypeMutation {
  const mutation = readExistingAreaCreaturePhenotypeMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Phenotype mutation requires one exact changed catalog-bound pair.", [
      `creature:index=${sourceIndex}:Phenotype:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreaturePortraitMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreaturePortraitMutation {
  const mutation = readExistingAreaCreaturePortraitMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Creature PortraitId mutation requires one exact changed catalog-bound pair.",
      [`creature:index=${sourceIndex}:PortraitId:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeCreatureChallengeRatingMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureChallengeRatingMutation {
  const mutation = readExistingAreaCreatureChallengeRatingMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature ChallengeRating mutation pair is invalid.", [
      `creature:index=${sourceIndex}:ChallengeRating:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureAbilityScoreMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAbilityScoreMutations {
  const mutations = readExistingAreaCreatureAbilityScoreMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature base ability-score mutation pairs are invalid.", [
      `creature:index=${sourceIndex}:abilityScores:invalid_pairs`,
    ]);
  }
  return mutations;
}

function normalizeCreatureAppearanceColorMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAppearanceColorMutations {
  const mutations = readExistingAreaCreatureAppearanceColorMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature appearance-color mutation pairs are invalid.", [
      `creature:index=${sourceIndex}:appearanceColors:invalid_pairs`,
    ]);
  }
  return mutations;
}

function normalizeCreatureBodyPartMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureBodyPartMutations {
  const mutations = readExistingAreaCreatureBodyPartMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature body-part mutation pairs are invalid.", [
      `creature:index=${sourceIndex}:bodyParts:invalid_pairs`,
    ]);
  }
  return mutations;
}

function normalizeCreatureAppendageMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAppendageMutations {
  const mutations = readExistingAreaCreatureAppendageMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature appendage mutation pairs are invalid.", [
      `creature:index=${sourceIndex}:appendages:invalid_pairs`,
    ]);
  }
  return mutations;
}

function normalizeCreatureHitPointMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureHitPointMutation {
  const mutation = readExistingAreaCreatureHitPointMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature coupled hit-point mutation is invalid.", [
      `creature:index=${sourceIndex}:hitPoints:invalid_coupled_values`,
    ]);
  }
  return mutation;
}

function normalizeCreatureNaturalArmorClassMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureNaturalArmorClassMutation {
  const mutation = readExistingAreaCreatureNaturalArmorClassMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature NaturalAC mutation pair is invalid.", [
      `creature:index=${sourceIndex}:NaturalAC:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureSavingThrowBonusMutations(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureSavingThrowBonusMutations {
  const mutations = readExistingAreaCreatureSavingThrowBonusMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature saving-throw bonus mutation pairs are invalid.", [
      `creature:index=${sourceIndex}:savingThrowBonuses:invalid_pairs`,
    ]);
  }
  return mutations;
}

function normalizeCreatureAlignmentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureAlignmentMutation {
  const mutation = readExistingAreaCreatureAlignmentMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature alignment mutation pair is invalid.", [
      `creature:index=${sourceIndex}:alignment:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureFactionMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureFactionMutation {
  const mutation = readExistingAreaCreatureFactionMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature FactionID mutation pair is invalid.", [
      `creature:index=${sourceIndex}:FactionID:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureTemplateResRefMutation {
  const mutation = readExistingAreaCreatureTemplateResRefMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature TemplateResRef mutation pair is invalid.", [
      `creature:index=${sourceIndex}:TemplateResRef:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureSpecialIdentityStringsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureSpecialIdentityStringsMutation {
  const mutation = readExistingAreaCreatureSpecialIdentityStringsMutation(input);
  if (!mutation) {
    throw mutationInvalid("Creature Subrace/Deity mutation pair is invalid.", [
      `creature:index=${sourceIndex}:Subrace/Deity:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeCreatureScriptResRefMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaCreatureScriptResRefMutation[] {
  const mutations = readExistingAreaCreatureScriptResRefMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature script ResRef mutation collection is invalid.", [
      `creature:index=${sourceIndex}:scripts:invalid_collection`,
    ]);
  }
  return mutations;
}

function normalizePlaceableHitPointMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableHitPointMutation {
  const mutation = readExistingAreaPlaceableHitPointMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable HP / CurrentHP mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:HP:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceableAppearanceMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableAppearanceMutation {
  const mutation = readExistingAreaPlaceableAppearanceMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable Appearance mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:Appearance:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceableTrapTypeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableTrapTypeMutation {
  const mutation = readExistingAreaPlaceableTrapTypeMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable TrapType mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:TrapType:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceableBodyBagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableBodyBagMutation {
  const mutation = readExistingAreaPlaceableBodyBagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable BodyBag mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:BodyBag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceablePortraitMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceablePortraitMutation {
  const mutation = readExistingAreaPlaceablePortraitMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable PortraitId mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:PortraitId:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceableFactionMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableFactionMutation {
  const mutation = readExistingAreaPlaceableFactionMutation(input);
  if (!mutation) {
    throw mutationInvalid("Placeable Faction mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:Faction:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizePlaceableVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableVariableMutation {
  try {
    return parseAreaPlaceableVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Placeable VarTable mutation pair is invalid.", [
      `placeable:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeCreatureVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureVariableMutation {
  try {
    return parseAreaCreatureVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Creature VarTable mutation pair is invalid.", [
      `creature:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeEncounterVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterVariableMutation {
  try {
    return parseAreaEncounterVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Encounter VarTable mutation pair is invalid.", [
      `encounter:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeWaypointVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointVariableMutation {
  try {
    return parseAreaWaypointVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Waypoint VarTable mutation pair is invalid.", [
      `waypoint:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeEncounterCreatureListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterCreatureListResolvedMutation {
  try {
    return parseAreaEncounterCreatureListResolvedMutation(input);
  } catch (error) {
    throw mutationInvalid("Encounter CreatureList mutation pair is invalid.", [
      `encounter:index=${sourceIndex}:CreatureList:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeEncounterSpawnPointListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterSpawnPointListMutation {
  try {
    return parseAreaEncounterSpawnPointListMutation(input);
  } catch (error) {
    throw mutationInvalid("Encounter SpawnPointList mutation pair is invalid.", [
      `encounter:index=${sourceIndex}:SpawnPointList:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizePlaceableEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable editor Comment mutation must be an object.", [
      `placeable:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Placeable editor Comment mutation has an unexpected key.", [
      `placeable:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Placeable editor Comment mutation requires one complete value pair.", [
      `placeable:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaPlaceableEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Placeable editor Comment expected value is not admitted.", [
      `placeable:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaPlaceableEditorComment(pair.value)) {
    throw mutationInvalid("Placeable editor Comment target value is not admitted.", [
      `placeable:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Placeable editor Comment mutation must change the source value.", [
      `placeable:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeCreatureEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaCreatureEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Creature editor Comment mutation must be an object.", [
      `creature:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Creature editor Comment mutation has an unexpected key.", [
      `creature:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Creature editor Comment mutation requires one complete value pair.", [
      `creature:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaCreatureEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Creature editor Comment expected value is not admitted.", [
      `creature:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaCreatureEditorComment(pair.value)) {
    throw mutationInvalid("Creature editor Comment target value is not admitted.", [
      `creature:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Creature editor Comment mutation must change the source value.", [
      `creature:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeItemEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Item editor Comment mutation must be an object.", [
      `item:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Item editor Comment mutation has an unexpected key.", [
      `item:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Item editor Comment mutation requires one complete value pair.", [
      `item:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaItemEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Item editor Comment expected value is not admitted.", [
      `item:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaItemEditorComment(pair.value)) {
    throw mutationInvalid("Item editor Comment target value is not admitted.", [
      `item:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Item editor Comment mutation must change the source value.", [
      `item:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeStoreEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Store editor Comment mutation must be an object.", [
      `store:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Store editor Comment mutation contains an unsupported field.", [
      `store:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Store editor Comment mutation requires one complete value pair.", [
      `store:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaStoreEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Store editor Comment expected value is not admitted.", [
      `store:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaStoreEditorComment(pair.value)) {
    throw mutationInvalid("Store editor Comment target value is not admitted.", [
      `store:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Store editor Comment mutation must change the source value.", [
      `store:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeEncounterEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Encounter editor Comment mutation must be an object.", [
      `encounter:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Encounter editor Comment mutation contains an unsupported field.", [
      `encounter:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Encounter editor Comment mutation requires one complete value pair.", [
      `encounter:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaEncounterEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Encounter editor Comment expected value is not admitted.", [
      `encounter:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaEncounterEditorComment(pair.value)) {
    throw mutationInvalid("Encounter editor Comment target value is not admitted.", [
      `encounter:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Encounter editor Comment mutation must change the source value.", [
      `encounter:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeStoreCommerceMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreCommerceMutation {
  const mutation = readAreaStoreCommerceMutation(input);
  if (!mutation) {
    throw mutationInvalid("Store commerce mutation requires one complete changed exact vector CAS.", [
      `store:index=${sourceIndex}:commerce:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeItemTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemTagMutation {
  const mutation = readExistingAreaItemTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Item Tag mutation requires one complete changed exact CAS pair.", [
      `item:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeTriggerTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerTagMutation {
  const mutation = readExistingAreaTriggerTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Trigger Tag mutation requires one complete changed exact CAS pair.", [
      `trigger:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeTriggerTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerTemplateResRefMutation {
  const mutation = readExistingAreaTriggerTemplateResRefMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Trigger TemplateResRef mutation requires one complete changed exact CAS pair.",
      [`trigger:index=${sourceIndex}:TemplateResRef:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeTriggerLocalizedNameMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerLocalizedNameMutation {
  const mutation = readExistingAreaTriggerLocalizedNameMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Trigger LocalizedName mutation requires one changed exact CAS pair.",
      [`trigger:index=${sourceIndex}:LocalizedName:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeTriggerScriptResRefsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerScriptResRefsMutation {
  const mutation = readExistingAreaTriggerScriptResRefsMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Trigger script mutation requires one complete changed exact seven-field CAS tuple.",
      [`trigger:index=${sourceIndex}:scripts:invalid_tuple`],
    );
  }
  return mutation;
}

function normalizeTriggerTransitionStorageMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerTransitionStorageMutation {
  const mutation = readExistingAreaTriggerTransitionStorageMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Trigger transition mutation requires one complete changed exact CAS tuple.",
      [`trigger:index=${sourceIndex}:transitionStorage:invalid_tuple`],
    );
  }
  return mutation;
}

function normalizeTriggerEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaTriggerEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Trigger editor Comment mutation must be an object.", [
      `trigger:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Trigger editor Comment mutation contains an unsupported field.", [
      `trigger:index=${sourceIndex}:Comment:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Trigger editor Comment mutation requires one complete value pair.", [
      `trigger:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaTriggerEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Trigger editor Comment expected value is not admitted.", [
      `trigger:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaTriggerEditorComment(pair.value)) {
    throw mutationInvalid("Trigger editor Comment target value is not admitted.", [
      `trigger:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Trigger editor Comment mutation must change the source value.", [
      `trigger:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeWaypointTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointTagMutation {
  const mutation = readExistingAreaWaypointTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Waypoint Tag mutation requires one complete changed exact CAS pair.", [
      `waypoint:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeWaypointTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointTemplateResRefMutation {
  const mutation = readExistingAreaWaypointTemplateResRefMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Waypoint TemplateResRef mutation requires one complete changed exact CAS pair.",
      [`waypoint:index=${sourceIndex}:TemplateResRef:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterTemplateResRefMutation {
  const mutation = readExistingAreaEncounterTemplateResRefMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter TemplateResRef mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:TemplateResRef:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeWaypointLocalizedNameMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointLocalizedNameMutation {
  const mutation = readExistingAreaWaypointLocalizedNameMutation(input);
  if (!mutation) {
    throw mutationInvalid("Waypoint LocalizedName mutation requires one changed exact CAS pair.", [
      `waypoint:index=${sourceIndex}:LocalizedName:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeWaypointDescriptionMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointDescriptionMutation {
  const mutation = readExistingAreaWaypointDescriptionMutation(input);
  if (!mutation) {
    throw mutationInvalid("Waypoint Description mutation requires one changed exact CAS pair.", [
      `waypoint:index=${sourceIndex}:Description:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeWaypointMapNoteMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointMapNoteMutation {
  const mutation = readExistingAreaWaypointMapNoteMutation(input);
  if (!mutation) {
    throw mutationInvalid("Waypoint MapNote mutation requires one complete changed exact CAS vector.", [
      `waypoint:index=${sourceIndex}:MapNote:invalid_vector`,
    ]);
  }
  return mutation;
}

function normalizeWaypointAppearanceMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointAppearanceMutation {
  const mutation = parseAreaWaypointAppearanceMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Waypoint Appearance mutation requires one changed digest-bound Byte CAS pair.",
      [`waypoint:index=${sourceIndex}:Appearance:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeWaypointEditorCommentMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaWaypointEditorCommentMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Waypoint editor Comment mutation must be an object.", [
      `waypoint:index=${sourceIndex}:Comment:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedKey = Object.keys(pair).find((key) =>
    key !== "expectedValue" && key !== "value"
  );
  if (unexpectedKey !== undefined) {
    throw mutationInvalid("Waypoint editor Comment mutation contains an unexpected key.", [
      `waypoint:index=${sourceIndex}:Comment:unexpected_key=${unexpectedKey}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Waypoint editor Comment mutation requires one complete pair.", [
      `waypoint:index=${sourceIndex}:Comment:incomplete`,
    ]);
  }
  if (!isAreaWaypointEditorComment(pair.expectedValue)) {
    throw mutationInvalid("Waypoint editor Comment expected value is invalid.", [
      `waypoint:index=${sourceIndex}:Comment:invalid_expected_value`,
    ]);
  }
  if (!isAreaWaypointEditorComment(pair.value)) {
    throw mutationInvalid("Waypoint editor Comment target value is invalid.", [
      `waypoint:index=${sourceIndex}:Comment:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Waypoint editor Comment mutation must change the source value.", [
      `waypoint:index=${sourceIndex}:Comment:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizeEncounterTagMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterTagMutation {
  const mutation = readExistingAreaEncounterTagMutation(input);
  if (!mutation) {
    throw mutationInvalid("Encounter Tag mutation requires one complete changed exact CAS pair.", [
      `encounter:index=${sourceIndex}:Tag:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeEncounterActiveMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterActiveMutation {
  const mutation = readExistingAreaEncounterActiveMutation(input);
  if (!mutation) {
    throw mutationInvalid("Encounter Active mutation requires one complete changed exact CAS pair.", [
      `encounter:index=${sourceIndex}:Active:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeEncounterPlayerOnlyMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterPlayerOnlyMutation {
  const mutation = readExistingAreaEncounterPlayerOnlyMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter PlayerOnly mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:PlayerOnly:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterResetMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterResetMutation {
  const mutation = readExistingAreaEncounterResetMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter Reset mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:Reset:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterResetTimeMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterResetTimeMutation {
  const mutation = readExistingAreaEncounterResetTimeMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter ResetTime mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:ResetTime:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterSpawnOptionMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterSpawnOptionMutation {
  const mutation = readExistingAreaEncounterSpawnOptionMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter SpawnOption mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:SpawnOption:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterRespawnsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterRespawnsMutation {
  const mutation = readExistingAreaEncounterRespawnsMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter Respawns mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:Respawns:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterCreatureCountMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterCreatureCountMutation {
  const mutation = readExistingAreaEncounterCreatureCountMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter creature-count mutation requires one complete changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:creatureCounts:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterScriptResRefsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterScriptResRefsMutation {
  const mutation = readExistingAreaEncounterScriptResRefsMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter script mutation requires one complete changed exact five-field CAS tuple.",
      [`encounter:index=${sourceIndex}:scripts:invalid_tuple`],
    );
  }
  return mutation;
}

function normalizeEncounterFactionMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterFactionMutation {
  const mutation = readExistingAreaEncounterFactionMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter Faction mutation requires one catalog-bound changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:Faction:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterDifficultyMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterDifficultyMutation {
  const mutation = readExistingAreaEncounterDifficultyMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter Difficulty mutation requires one catalog-bound changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:Difficulty+DifficultyIndex:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeEncounterLocalizedNameMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaEncounterLocalizedNameMutation {
  const mutation = readExistingAreaEncounterLocalizedNameMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Encounter LocalizedName mutation requires one changed exact CAS pair.",
      [`encounter:index=${sourceIndex}:LocalizedName:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeItemTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemTemplateResRefMutation {
  const mutation = readExistingAreaItemTemplateResRefMutation(input);
  if (!mutation) {
    throw mutationInvalid(
      "Item TemplateResRef mutation requires one complete changed exact CAS pair.",
      [`item:index=${sourceIndex}:TemplateResRef:invalid_pair`],
    );
  }
  return mutation;
}

function normalizeItemInstanceStateMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemInstanceStateMutation {
  const mutation = readAreaItemInstanceStateMutation(input);
  if (!mutation) {
    throw mutationInvalid("Item instance-state mutation requires one complete changed exact CAS pair.", [
      `item:index=${sourceIndex}:instance_state:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeItemLocalizedStringMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaItemLocalizedStringMutation[] {
  const mutations = readExistingAreaItemLocalizedStringMutations(input);
  if (!mutations) {
    throw mutationInvalid("Item localized-string mutation list is invalid.", [
      `item:index=${sourceIndex}:localizedStrings:invalid_pair`,
    ]);
  }
  return mutations;
}

function normalizeItemVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemVariableMutation {
  try {
    return parseAreaItemVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Ground-Item VarTable mutation pair is invalid.", [
      `item:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeItemPropertyListMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemPropertyListMutation {
  try {
    return parseAreaItemPropertyListMutation(input);
  } catch (error) {
    throw mutationInvalid("Ground-Item PropertiesList mutation pair is invalid.", [
      `item:index=${sourceIndex}:PropertiesList:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeItemBaseAppearanceMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemBaseAppearanceMutation {
  const mutation = readExistingAreaItemBaseAppearanceMutation(input);
  if (!mutation) {
    throw mutationInvalid("Item BaseItem/appearance mutation is invalid.", [
      `item:index=${sourceIndex}:BaseItem:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeItemInventoryMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaItemInventoryMutation {
  const prefix = `item:index=${sourceIndex}:ItemList`;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Ground-Item ItemList mutation must be an object.", [
      `${prefix}:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedPairKey = Object.keys(pair).find(
    (key) => key !== "expectedEntries" && key !== "entries",
  );
  if (unexpectedPairKey !== undefined || !Array.isArray(pair.expectedEntries) ||
    !Array.isArray(pair.entries) ||
    pair.expectedEntries.length > MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION ||
    pair.entries.length > MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION) {
    throw mutationInvalid("Ground-Item ItemList mutation pair is invalid.", [
      `${prefix}:shape_or_budget`,
    ]);
  }
  const rawEntries = pair.entries;
  const domainEntries = rawEntries.map((entry) => {
    if (typeof entry !== "object" || entry === null || Array.isArray(entry) ||
      Object.prototype.hasOwnProperty.call(entry, "sourceIndex")) {
      return entry;
    }
    const {
      blueprintBytes: _blueprintBytes,
      resolvedModelType: _resolvedModelType,
      blueprintDependencies: _blueprintDependencies,
      ...domainEntry
    } = entry as Readonly<Record<string, unknown>>;
    return domainEntry;
  });
  try {
    const mutation = parseAreaItemInventoryMutation(
      { expectedEntries: pair.expectedEntries, entries: domainEntries },
      `item.index.${sourceIndex}.ItemList`,
    );
    if (areaItemInventoryEntriesEqual(mutation.expectedEntries, mutation.entries)) {
      throw new AreaItemInventoryValidationError(
        "Item inventory mutation must change the exact source list.",
        `item.index.${sourceIndex}.ItemList`,
      );
    }
    const entries = mutation.entries.map((entry, entryIndex) => {
      if ("sourceIndex" in entry) return entry;
      const rawEntry = rawEntries[entryIndex] as Readonly<Record<string, unknown>>;
      const expectedKeys = new Set([
        "resRef",
        "itemTemplateId",
        "itemResRef",
        "itemSourceProfileId",
        "itemSourceObjectKey",
        "itemSourceSizeBytes",
        "itemSourceFingerprint",
        "itemTag",
        "x",
        "y",
        "blueprintBytes",
        "resolvedModelType",
        "blueprintDependencies",
      ]);
      const unexpected = Object.keys(rawEntry).find((key) => !expectedKeys.has(key));
      if (unexpected !== undefined || !Buffer.isBuffer(rawEntry.blueprintBytes) ||
        rawEntry.blueprintBytes.length !== entry.itemSourceSizeBytes ||
        rawEntry.blueprintBytes.length < 1 ||
        rawEntry.blueprintBytes.length > AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.maxSourceBytes ||
        createHash("sha256").update(rawEntry.blueprintBytes).digest("hex") !==
          entry.itemSourceFingerprint ||
        (rawEntry.resolvedModelType !== 0 && rawEntry.resolvedModelType !== 1 &&
          rawEntry.resolvedModelType !== 2 && rawEntry.resolvedModelType !== 3) ||
        (rawEntry.blueprintDependencies !== undefined &&
          !Array.isArray(rawEntry.blueprintDependencies))) {
        throw new AreaItemInventoryValidationError(
          "Dynamic Item inventory blueprint resolution is incomplete or identity-mismatched.",
          `${prefix}.entries.${entryIndex}`,
        );
      }
      const dependencies = (rawEntry.blueprintDependencies as readonly Readonly<{
        templateResRef: string;
        resourceType: number;
        sha256: string;
        bytes: Buffer;
        resolvedModelType: 0 | 1 | 2 | 3;
      }>[] | undefined)?.map((dependency) => Object.freeze({
        ...dependency,
        bytes: Buffer.isBuffer(dependency.bytes)
          ? Buffer.from(dependency.bytes)
          : dependency.bytes,
      }));
      return Object.freeze({
        ...entry,
        blueprintBytes: Buffer.from(rawEntry.blueprintBytes),
        resolvedModelType: rawEntry.resolvedModelType,
        ...(dependencies ? { blueprintDependencies: Object.freeze(dependencies) } : {}),
      }) as ExistingAreaItemInventoryBlueprintEntry;
    });
    return Object.freeze({
      expectedEntries: mutation.expectedEntries,
      entries: Object.freeze(entries),
    });
  } catch (error) {
    throw mutationInvalid("Ground-Item ItemList mutation pair is invalid.", [
      `item:index=${sourceIndex}:ItemList:${error instanceof AreaItemInventoryValidationError
        ? `${error.path}:${error.message}`
        : "invalid_pair"}`,
    ]);
  }
}

function normalizeItemVisualTransformMutation(
  input: unknown,
  sourceIndex: number,
): AreaItemVisualTransformMutation {
  try {
    return parseAreaItemVisualTransformMutation(
      input,
      `item.index.${sourceIndex}.VisTransformList`,
    );
  } catch (error) {
    throw mutationInvalid("Ground-Item VisTransformList mutation pair is invalid.", [
      `item:index=${sourceIndex}:VisTransformList:${
        error instanceof AreaItemVisualTransformValidationError
          ? `${error.path}:${error.message}`
          : "invalid_pair"
      }`,
    ]);
  }
}

function normalizePlaceableAnimationStateMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableAnimationStateMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable AnimationState mutation must be an object.", [
      `placeable:index=${sourceIndex}:AnimationState:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpected = Object.keys(pair).find(
    (key) => key !== "expectedValue" && key !== "value",
  );
  if (unexpected !== undefined) {
    throw mutationInvalid("Placeable AnimationState mutation has an unexpected key.", [
      `placeable:index=${sourceIndex}:AnimationState:unexpected_key=${unexpected}`,
    ]);
  }
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Placeable AnimationState mutation requires one complete value pair.", [
      `placeable:index=${sourceIndex}:AnimationState:incomplete`,
    ]);
  }
  if (!isAreaPlaceableAnimationState(pair.expectedValue)) {
    throw mutationInvalid("Placeable AnimationState expected value is not admitted.", [
      `placeable:index=${sourceIndex}:AnimationState:invalid_expected_value`,
    ]);
  }
  if (!isAreaPlaceableAnimationState(pair.value)) {
    throw mutationInvalid("Placeable AnimationState target value is not admitted.", [
      `placeable:index=${sourceIndex}:AnimationState:invalid_value`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Placeable AnimationState mutation must change the source value.", [
      `placeable:index=${sourceIndex}:AnimationState:unchanged`,
    ]);
  }
  return Object.freeze({
    expectedValue: pair.expectedValue,
    value: pair.value,
  });
}

function normalizePlaceableTrapByteMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableTrapByteMutation[] {
  if (!Array.isArray(input)) {
    throw mutationInvalid("Placeable trap Byte mutations must be an array.", [
      `placeable:index=${sourceIndex}:trapFields:invalid_list`,
    ]);
  }
  if (input.length === 0) {
    throw mutationInvalid("Placeable trap Byte mutations cannot be empty.", [
      `placeable:index=${sourceIndex}:trapFields:empty`,
    ]);
  }
  if (input.length > AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.length) {
    throw mutationInvalid("Too many Placeable trap Byte mutations were requested.", [
      `placeable:index=${sourceIndex}:trapFields:count=${input.length}`,
    ]);
  }
  const seen = new Set<string>();
  let previousOrder = -1;
  return Object.freeze(input.map((rawEntry, entryIndex) => {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw mutationInvalid("Placeable trap Byte mutation entry must be an object.", [
        `placeable:index=${sourceIndex}:trapFields:entry=${entryIndex}:invalid`,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableTrapByteFieldMapping(entry.field);
    if (!mapping) {
      throw mutationInvalid("Placeable trap Byte mutation field is unsupported.", [
        `placeable:index=${sourceIndex}:${String(entry.field)}:unsupported_trap_byte_field`,
      ]);
    }
    const unexpected = Object.keys(entry).find((key) =>
      key !== "field" && key !== "expectedValue" && key !== "value"
    );
    if (unexpected !== undefined) {
      throw mutationInvalid("Placeable trap Byte mutation entry has an unexpected key.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unexpected_key=${unexpected}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw mutationInvalid("Placeable trap Byte mutation fields must be unique.", [
        `placeable:index=${sourceIndex}:${mapping.field}:duplicate`,
      ]);
    }
    seen.add(mapping.field);
    const order = AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS.indexOf(mapping);
    if (order <= previousOrder) {
      throw mutationInvalid("Placeable trap Byte mutations are not in native order.", [
        `placeable:index=${sourceIndex}:${mapping.field}:out_of_order`,
      ]);
    }
    previousOrder = order;
    if (!isAreaPlaceableTrapByteMutationValue(mapping, entry.expectedValue)) {
      throw mutationInvalid("Placeable trap expected value is not an admitted Byte.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_expected_byte`,
      ]);
    }
    if (!isAreaPlaceableTrapByteMutationValue(mapping, entry.value)) {
      throw mutationInvalid("Placeable trap target value is not an admitted Byte.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_byte`,
      ]);
    }
    if (entry.expectedValue === entry.value) {
      throw mutationInvalid("Placeable trap Byte mutation must change the source value.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unchanged`,
      ]);
    }
    return Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }) as ExistingAreaPlaceableTrapByteMutation;
  }));
}

function normalizePlaceableTemplateResRefMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableTemplateResRefMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable TemplateResRef mutation must be an object.", [
      `placeable:index=${sourceIndex}:TemplateResRef:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  requireExactPlaceablePropertyPairKeys(
    pair,
    ["expectedResRef", "resRef"],
    sourceIndex,
    "TemplateResRef",
  );
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedResRef") ||
    !Object.prototype.hasOwnProperty.call(pair, "resRef")
  ) {
    throw mutationInvalid("Placeable TemplateResRef mutation requires one complete pair.", [
      `placeable:index=${sourceIndex}:TemplateResRef:incomplete`,
    ]);
  }
  if (!isAreaPlaceableTemplateResRef(pair.expectedResRef)) {
    throw mutationInvalid("Placeable TemplateResRef expected ResRef is invalid.", [
      `placeable:index=${sourceIndex}:TemplateResRef:invalid_expected_resref`,
    ]);
  }
  if (!isAreaPlaceableTemplateResRef(pair.resRef)) {
    throw mutationInvalid("Placeable TemplateResRef target ResRef is invalid.", [
      `placeable:index=${sourceIndex}:TemplateResRef:invalid_resref`,
    ]);
  }
  if (pair.expectedResRef === pair.resRef) {
    throw mutationInvalid("Placeable TemplateResRef mutation must change the source value.", [
      `placeable:index=${sourceIndex}:TemplateResRef:unchanged`,
    ]);
  }
  return Object.freeze({ expectedResRef: pair.expectedResRef, resRef: pair.resRef });
}

function normalizePlaceableConversationMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableConversationMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable Conversation mutation must be an object.", [
      `placeable:index=${sourceIndex}:Conversation:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  requireExactPlaceablePropertyPairKeys(
    pair,
    ["expectedResRef", "resRef"],
    sourceIndex,
    "Conversation",
  );
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedResRef") ||
    !Object.prototype.hasOwnProperty.call(pair, "resRef")
  ) {
    throw mutationInvalid("Placeable Conversation mutation requires one complete ResRef pair.", [
      `placeable:index=${sourceIndex}:Conversation:incomplete`,
    ]);
  }
  if (!isAreaPlaceableConversation(pair.expectedResRef)) {
    throw mutationInvalid("Placeable Conversation expected ResRef is invalid.", [
      `placeable:index=${sourceIndex}:Conversation:invalid_expected_resref`,
    ]);
  }
  if (!isAreaPlaceableConversation(pair.resRef)) {
    throw mutationInvalid("Placeable Conversation target ResRef is invalid.", [
      `placeable:index=${sourceIndex}:Conversation:invalid_resref`,
    ]);
  }
  if (pair.expectedResRef === pair.resRef) {
    throw mutationInvalid("Placeable Conversation mutation must change the source value.", [
      `placeable:index=${sourceIndex}:Conversation:unchanged`,
    ]);
  }
  return Object.freeze({ expectedResRef: pair.expectedResRef, resRef: pair.resRef });
}

function normalizePlaceableInterruptableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableInterruptableMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable Interruptable mutation must be an object.", [
      `placeable:index=${sourceIndex}:Interruptable:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  requireExactPlaceablePropertyPairKeys(
    pair,
    ["expectedValue", "value"],
    sourceIndex,
    "Interruptable",
  );
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Placeable Interruptable mutation requires one complete Byte pair.", [
      `placeable:index=${sourceIndex}:Interruptable:incomplete`,
    ]);
  }
  if (!isAreaPlaceableInterruptableValue(pair.expectedValue)) {
    throw mutationInvalid("Placeable Interruptable expected Byte is invalid.", [
      `placeable:index=${sourceIndex}:Interruptable:invalid_expected_byte`,
    ]);
  }
  if (!isAreaPlaceableInterruptableValue(pair.value)) {
    throw mutationInvalid("Placeable Interruptable target Byte is invalid.", [
      `placeable:index=${sourceIndex}:Interruptable:invalid_byte`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Placeable Interruptable mutation must change the source value.", [
      `placeable:index=${sourceIndex}:Interruptable:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function requireExactPlaceablePropertyPairKeys(
  pair: Readonly<Record<string, unknown>>,
  expectedKeys: readonly string[],
  sourceIndex: number,
  label: "Conversation" | "Interruptable" | "TemplateResRef",
): void {
  const allowed = new Set(expectedKeys);
  const unexpected = Object.keys(pair).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    throw mutationInvalid(`Placeable ${label} mutation has an unexpected key.`, [
      `placeable:index=${sourceIndex}:${label}:unexpected_key=${unexpected}`,
    ]);
  }
}

function normalizePlaceableBasicByteMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableBasicByteMutation[] {
  if (!Array.isArray(input)) {
    throw mutationInvalid("Placeable durability/save Byte mutations must be an array.", [
      `placeable:index=${sourceIndex}:basicByteFields:invalid_list`,
    ]);
  }
  if (input.length === 0) {
    throw mutationInvalid("Placeable durability/save Byte mutations cannot be empty.", [
      `placeable:index=${sourceIndex}:basicByteFields:empty`,
    ]);
  }
  if (input.length > AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS.length) {
    throw mutationInvalid("Too many Placeable durability/save Byte mutations were requested.", [
      `placeable:index=${sourceIndex}:basicByteFields:count=${input.length}`,
    ]);
  }
  const seen = new Set<string>();
  let previousOrder = -1;
  return Object.freeze(input.map((rawEntry, entryIndex) => {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw mutationInvalid("Placeable durability/save Byte mutation entry must be an object.", [
        `placeable:index=${sourceIndex}:basicByteFields:entry=${entryIndex}:invalid`,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableBasicByteFieldMapping(entry.field);
    if (!mapping) {
      throw mutationInvalid("Placeable durability/save Byte mutation field is unsupported.", [
        `placeable:index=${sourceIndex}:${String(entry.field)}:unsupported_basic_byte_field`,
      ]);
    }
    const unexpected = Object.keys(entry).find((key) =>
      key !== "field" && key !== "expectedValue" && key !== "value"
    );
    if (unexpected !== undefined) {
      throw mutationInvalid("Placeable durability/save Byte mutation entry has an unexpected key.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unexpected_key=${unexpected}`,
      ]);
    }
    if (
      !Object.prototype.hasOwnProperty.call(entry, "expectedValue") ||
      !Object.prototype.hasOwnProperty.call(entry, "value")
    ) {
      throw mutationInvalid("Placeable durability/save Byte mutation requires one complete value pair.", [
        `placeable:index=${sourceIndex}:${mapping.field}:incomplete`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw mutationInvalid("Placeable durability/save Byte mutation fields must be unique.", [
        `placeable:index=${sourceIndex}:${mapping.field}:duplicate`,
      ]);
    }
    seen.add(mapping.field);
    const order = AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS.indexOf(mapping);
    if (order <= previousOrder) {
      throw mutationInvalid("Placeable durability/save Byte mutations are not in native order.", [
        `placeable:index=${sourceIndex}:${mapping.field}:out_of_order`,
      ]);
    }
    previousOrder = order;
    if (!isAreaPlaceableByteValue(entry.expectedValue)) {
      throw mutationInvalid("Placeable durability/save expected value is not a Byte.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_expected_byte`,
      ]);
    }
    if (!isAreaPlaceableByteValue(entry.value)) {
      throw mutationInvalid("Placeable durability/save target value is not a Byte.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_byte`,
      ]);
    }
    if (entry.expectedValue === entry.value) {
      throw mutationInvalid("Placeable durability/save Byte mutation must change the source value.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unchanged`,
      ]);
    }
    return Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }) as ExistingAreaPlaceableBasicByteMutation;
  }));
}

function normalizeCreatureInventoryMutation(
  input: unknown,
  creatureIndex: number,
): ExistingAreaCreatureInventoryMutation {
  const prefix = `creature:index=${creatureIndex}:ItemList`;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Creature ItemList mutation must be an object.", [
      `${prefix}:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedPairKey = Object.keys(pair).find(
    (key) => key !== "expectedEntries" && key !== "entries",
  );
  if (unexpectedPairKey !== undefined) {
    throw mutationInvalid("Creature ItemList mutation contains an unsupported field.", [
      `${prefix}:unexpected_key=${unexpectedPairKey}`,
    ]);
  }
  if (!Array.isArray(pair.expectedEntries) || !Array.isArray(pair.entries)) {
    throw mutationInvalid("Creature ItemList mutation requires one complete exact-list pair.", [
      `${prefix}:incomplete`,
    ]);
  }
  const rawEntries = pair.entries;
  if (
    pair.expectedEntries.length > MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION
    || pair.entries.length > MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION
  ) {
    throw mutationInvalid("Creature ItemList mutation exceeds the bounded entry budget.", [
      `${prefix}:entry_budget=${MAX_AREA_CREATURE_INVENTORY_ENTRIES_PER_MUTATION}`,
    ]);
  }

  const domainEntries = rawEntries.map((entry) => {
    if (
      typeof entry !== "object"
      || entry === null
      || Array.isArray(entry)
      || Object.prototype.hasOwnProperty.call(entry, "sourceIndex")
    ) {
      return entry;
    }
    const { blueprintBytes: _blueprintBytes, ...domainEntry } = entry as Readonly<Record<string, unknown>>;
    return domainEntry;
  });
  let parsed;
  try {
    parsed = parseAreaCreatureInventoryMutation({
      expectedEntries: pair.expectedEntries,
      entries: domainEntries,
    }, prefix);
  } catch (error) {
    if (error instanceof AreaCreatureInventoryValidationError) {
      throw mutationInvalid("Creature ItemList mutation is outside the admitted mode-0 profile.", [
        `${prefix}:${compactCreatureInventoryValidationPath(error.path, prefix)}`,
      ]);
    }
    throw error;
  }
  if (areaCreatureInventoryEntriesEqual(parsed.expectedEntries, parsed.entries)) {
    throw mutationInvalid("Creature ItemList mutation must change the exact source list.", [
      `${prefix}:unchanged`,
    ]);
  }

  const entries = parsed.entries.map((entry, entryIndex) => {
    if ("sourceIndex" in entry) return entry;
    const rawEntry = rawEntries[entryIndex] as Readonly<Record<string, unknown>>;
    const expectedKeys = new Set([
      "resRef",
      "itemResRef",
      "itemSourceObjectKey",
      "itemSourceFingerprint",
      "blueprintBytes",
      "x",
      "y",
      "dropable",
      "pickpocketable",
    ]);
    const unexpected = Object.keys(rawEntry).find((key) => !expectedKeys.has(key));
    if (unexpected !== undefined) {
      throw mutationInvalid("Creature ItemList blueprint contains an unsupported field.", [
        `${prefix}:entry=${entryIndex}:unexpected_key=${unexpected}`,
      ]);
    }
    if (!Buffer.isBuffer(rawEntry.blueprintBytes) || rawEntry.blueprintBytes.length > 1024 * 1024) {
      throw mutationInvalid("Creature inventory item blueprint bytes are unresolved or exceed the source budget.", [
        `${prefix}:entry=${entryIndex}:blueprint_size`,
      ]);
    }
    const actualSha256 = createHash("sha256").update(rawEntry.blueprintBytes).digest("hex");
    if (actualSha256 !== entry.itemSourceFingerprint) {
      throw mutationInvalid("Creature inventory item blueprint digest differs from retained provenance.", [
        `${prefix}:entry=${entryIndex}:source_sha256_mismatch`,
      ]);
    }
    return Object.freeze({
      ...entry,
      blueprintBytes: Buffer.from(rawEntry.blueprintBytes),
    }) as ExistingAreaCreatureInventoryBlueprintEntry;
  });
  return Object.freeze({
    expectedEntries: parsed.expectedEntries,
    entries: Object.freeze(entries),
  });
}

function normalizeCreatureEquipmentMutation(
  input: unknown,
  creatureIndex: number,
): ExistingAreaCreatureEquipmentMutation {
  const prefix = `creature:index=${creatureIndex}:Equip_ItemList`;
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Creature Equip_ItemList mutation must be an object.", [
      `${prefix}:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  const unexpectedPairKey = Object.keys(pair).find(
    (key) => key !== "expectedEntries" && key !== "entries",
  );
  if (unexpectedPairKey !== undefined) {
    throw mutationInvalid("Creature Equip_ItemList mutation contains an unsupported field.", [
      `${prefix}:unexpected_key=${unexpectedPairKey}`,
    ]);
  }
  if (!Array.isArray(pair.expectedEntries) || !Array.isArray(pair.entries)) {
    throw mutationInvalid("Creature Equip_ItemList mutation requires one complete exact-list pair.", [
      `${prefix}:incomplete`,
    ]);
  }
  if (
    pair.expectedEntries.length > MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION
    || pair.entries.length > MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION
  ) {
    throw mutationInvalid("Creature Equip_ItemList mutation exceeds the 18-slot budget.", [
      `${prefix}:entry_budget=${MAX_AREA_CREATURE_EQUIPMENT_ENTRIES_PER_MUTATION}`,
    ]);
  }
  try {
    const parsed = parseAreaCreatureEquipmentMutation(pair, prefix);
    if (areaCreatureEquipmentEntriesEqual(parsed.expectedEntries, parsed.entries)) {
      throw mutationInvalid("Creature Equip_ItemList mutation must change the exact source list.", [
        `${prefix}:unchanged`,
      ]);
    }
    return parsed;
  } catch (error) {
    if (error instanceof AreaCreatureEquipmentValidationError) {
      throw mutationInvalid("Creature Equip_ItemList mutation is outside the admitted retained profile.", [
        `${prefix}:${error.path.startsWith(`${prefix}.`) ? error.path.slice(prefix.length + 1) : error.path}`,
      ]);
    }
    throw error;
  }
}

function compactCreatureInventoryValidationPath(path: string, prefix: string): string {
  const suffix = path.startsWith(prefix) ? path.slice(prefix.length) : path;
  return suffix.replace(/^\./u, "").replaceAll(".", ":") || "invalid";
}

function normalizePlaceableInventoryMutation(
  input: unknown,
  placeableIndex: number,
): ExistingAreaPlaceableInventoryMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable ItemList mutation must be an object.", [
      `placeable:index=${placeableIndex}:ItemList:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  requireExactPlaceableInventoryKeys(
    pair,
    ["expectedEntries", "entries"],
    `placeable:index=${placeableIndex}:ItemList`,
  );
  if (!Array.isArray(pair.expectedEntries) || !Array.isArray(pair.entries)) {
    throw mutationInvalid("Placeable ItemList mutation requires one complete exact-list pair.", [
      `placeable:index=${placeableIndex}:ItemList:incomplete`,
    ]);
  }
  if (
    pair.expectedEntries.length > MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION ||
    pair.entries.length > MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION
  ) {
    throw mutationInvalid("Placeable ItemList mutation exceeds the bounded entry budget.", [
      `placeable:index=${placeableIndex}:ItemList:entry_budget=${MAX_AREA_PLACEABLE_INVENTORY_ENTRIES_PER_MUTATION}`,
    ]);
  }

  const expectedEntries = pair.expectedEntries.map((entry, entryIndex) =>
    normalizePlaceableInventorySourceEntry(entry, placeableIndex, entryIndex, true)
  );
  const usedSourceIndexes = new Set<number>();
  const entries = pair.entries.map((entry, entryIndex) => {
    const record = requirePlaceableInventoryEntryRecord(entry, placeableIndex, entryIndex);
    rejectPlaceableInventoryModeFlags(record, placeableIndex, entryIndex);
    if (Object.prototype.hasOwnProperty.call(record, "sourceIndex")) {
      const normalized = normalizePlaceableInventorySourceEntry(
        record,
        placeableIndex,
        entryIndex,
        false,
      );
      if (usedSourceIndexes.has(normalized.sourceIndex)) {
        throw mutationInvalid("A retained Placeable inventory source entry may be selected only once.", [
          `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:duplicate_source=${normalized.sourceIndex}`,
        ]);
      }
      usedSourceIndexes.add(normalized.sourceIndex);
      const expected = expectedEntries[normalized.sourceIndex];
      if (!expected || expected.resRef !== normalized.resRef) {
        throw mutationInvalid("Retained Placeable inventory identity differs from expected provenance.", [
          `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:source_identity_mismatch`,
        ]);
      }
      return normalized;
    }
    return normalizePlaceableInventoryBlueprintEntry(record, placeableIndex, entryIndex);
  });
  if (JSON.stringify(expectedEntries) === JSON.stringify(entries)) {
    throw mutationInvalid("Placeable ItemList mutation must change the exact source list.", [
      `placeable:index=${placeableIndex}:ItemList:unchanged`,
    ]);
  }
  return Object.freeze({
    expectedEntries: Object.freeze(expectedEntries),
    entries: Object.freeze(entries),
  });
}

function requirePlaceableInventoryEntryRecord(
  input: unknown,
  placeableIndex: number,
  entryIndex: number,
): Readonly<Record<string, unknown>> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable ItemList entry must be an object.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:invalid`,
    ]);
  }
  return input as Readonly<Record<string, unknown>>;
}

function rejectPlaceableInventoryModeFlags(
  entry: Readonly<Record<string, unknown>>,
  placeableIndex: number,
  entryIndex: number,
): void {
  if (["dropable", "droppable", "pickpocketable", "infinite"].some((field) =>
    Object.prototype.hasOwnProperty.call(entry, field)
  )) {
    throw mutationInvalid("Placeable inventory mode 2 does not admit item-list flags.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:unsupported_flag`,
    ]);
  }
}

function requireExactPlaceableInventoryKeys(
  entry: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
  diagnosticPrefix: string,
): void {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(entry).find((key) => !allowed.has(key));
  if (unexpected !== undefined) {
    throw mutationInvalid("Placeable ItemList object contains an unsupported field.", [
      `${diagnosticPrefix}:unexpected_key=${unexpected}`,
    ]);
  }
  const missing = allowedKeys.find((key) => !Object.prototype.hasOwnProperty.call(entry, key));
  if (missing !== undefined) {
    throw mutationInvalid("Placeable ItemList object is incomplete.", [
      `${diagnosticPrefix}:missing_key=${missing}`,
    ]);
  }
}

function normalizePlaceableInventorySourceEntry(
  input: unknown,
  placeableIndex: number,
  entryIndex: number,
  requireNativeOrdinal: boolean,
): ExistingAreaPlaceableInventorySourceEntry {
  const entry = requirePlaceableInventoryEntryRecord(input, placeableIndex, entryIndex);
  rejectPlaceableInventoryModeFlags(entry, placeableIndex, entryIndex);
  requireExactPlaceableInventoryKeys(
    entry,
    ["sourceIndex", "resRef", "x", "y"],
    `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}`,
  );
  if (!Number.isSafeInteger(entry.sourceIndex) || (entry.sourceIndex as number) < 0) {
    throw mutationInvalid("Placeable ItemList source ordinal is invalid.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:invalid_source_index`,
    ]);
  }
  const sourceIndex = entry.sourceIndex as number;
  if (requireNativeOrdinal && sourceIndex !== entryIndex) {
    throw mutationInvalid("Expected Placeable ItemList ordinals must match native list order.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:source_index=${sourceIndex}`,
    ]);
  }
  const resRef = normalizePlaceableInventoryResRef(entry.resRef, placeableIndex, entryIndex);
  return Object.freeze({
    sourceIndex,
    resRef,
    x: normalizePlaceableInventoryWord(entry.x, placeableIndex, entryIndex, "x"),
    y: normalizePlaceableInventoryWord(entry.y, placeableIndex, entryIndex, "y"),
  });
}

function normalizePlaceableInventoryBlueprintEntry(
  entry: Readonly<Record<string, unknown>>,
  placeableIndex: number,
  entryIndex: number,
): ExistingAreaPlaceableInventoryBlueprintEntry {
  requireExactPlaceableInventoryKeys(
    entry,
    [
      "resRef",
      "itemResRef",
      "itemSourceObjectKey",
      "itemSourceFingerprint",
      "x",
      "y",
      "blueprintBytes",
    ],
    `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}`,
  );
  const resRef = normalizePlaceableInventoryResRef(entry.resRef, placeableIndex, entryIndex);
  if (
    entry.itemResRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef ||
    resRef !== AREA_ITEM_CONSTRUCTION_PROFILE.templateResRef ||
    entry.itemSourceObjectKey !== AREA_ITEM_CONSTRUCTION_PROFILE.id ||
    entry.itemSourceFingerprint !== AREA_ITEM_CONSTRUCTION_PROFILE.sourceSha256
  ) {
    throw mutationInvalid("New Placeable inventory entry differs from the admitted immutable UTI profile.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:profile_or_identity_mismatch`,
    ]);
  }
  if (!Buffer.isBuffer(entry.blueprintBytes) || entry.blueprintBytes.length > 1024 * 1024) {
    throw mutationInvalid("Placeable inventory item blueprint bytes are unresolved or exceed the source budget.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:blueprint_size`,
    ]);
  }
  const actualSha256 = createHash("sha256").update(entry.blueprintBytes).digest("hex");
  if (actualSha256 !== entry.itemSourceFingerprint) {
    throw mutationInvalid("Placeable inventory item blueprint digest differs from retained provenance.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:source_sha256_mismatch`,
    ]);
  }
  return Object.freeze({
    resRef,
    itemResRef: entry.itemResRef,
    itemSourceObjectKey: entry.itemSourceObjectKey,
    itemSourceFingerprint: entry.itemSourceFingerprint,
    blueprintBytes: Buffer.from(entry.blueprintBytes),
    x: normalizePlaceableInventoryWord(entry.x, placeableIndex, entryIndex, "x"),
    y: normalizePlaceableInventoryWord(entry.y, placeableIndex, entryIndex, "y"),
  }) as ExistingAreaPlaceableInventoryBlueprintEntry;
}

function normalizePlaceableInventoryResRef(
  value: unknown,
  placeableIndex: number,
  entryIndex: number,
): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(value)) {
    throw mutationInvalid("Placeable inventory item ResRef is invalid.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:invalid_resref`,
    ]);
  }
  return value;
}

function normalizePlaceableInventoryWord(
  value: unknown,
  placeableIndex: number,
  entryIndex: number,
  field: "x" | "y",
): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0 || (value as number) > 0xffff) {
    throw mutationInvalid("Placeable inventory repository coordinate is not a Word.", [
      `placeable:index=${placeableIndex}:ItemList:entry=${entryIndex}:${field}:invalid_word`,
    ]);
  }
  return value as number;
}

function normalizePlaceableKeyNameMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaPlaceableKeyNameMutation {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw mutationInvalid("Placeable KeyName mutation must be an object.", [
      `placeable:index=${sourceIndex}:KeyName:invalid_pair`,
    ]);
  }
  const pair = input as Readonly<Record<string, unknown>>;
  if (
    !Object.prototype.hasOwnProperty.call(pair, "expectedValue") ||
    !Object.prototype.hasOwnProperty.call(pair, "value")
  ) {
    throw mutationInvalid("Placeable KeyName mutation requires one complete string pair.", [
      `placeable:index=${sourceIndex}:KeyName:incomplete`,
    ]);
  }
  if (!isAreaPlaceableKeyName(pair.expectedValue)) {
    throw mutationInvalid("Placeable KeyName expected value is invalid.", [
      `placeable:index=${sourceIndex}:KeyName:invalid_expected`,
    ]);
  }
  if (!isAreaPlaceableKeyName(pair.value)) {
    throw mutationInvalid("Placeable KeyName target value is invalid.", [
      `placeable:index=${sourceIndex}:KeyName:invalid`,
    ]);
  }
  if (pair.expectedValue === pair.value) {
    throw mutationInvalid("Placeable KeyName mutation must change the source value.", [
      `placeable:index=${sourceIndex}:KeyName:unchanged`,
    ]);
  }
  return Object.freeze({ expectedValue: pair.expectedValue, value: pair.value });
}

function normalizePlaceableScriptMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableScriptResRefMutation[] {
  if (!Array.isArray(input)) {
    throw mutationInvalid("Placeable script mutations must be an array.", [
      `placeable:index=${sourceIndex}:scripts:invalid_list`,
    ]);
  }
  if (input.length === 0) {
    throw mutationInvalid("Placeable script mutations must not be empty.", [
      `placeable:index=${sourceIndex}:scripts:empty`,
    ]);
  }
  const normalized: ExistingAreaPlaceableScriptResRefMutation[] = [];
  const seen = new Set<ExistingAreaPlaceableScriptField>();
  input.forEach((rawEntry, entryIndex) => {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw mutationInvalid("Placeable script mutation entry must be an object.", [
        `placeable:index=${sourceIndex}:scripts:entry=${entryIndex}:invalid`,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableScriptFieldMapping(entry.field);
    if (!mapping) {
      throw mutationInvalid("Placeable script mutation identifies an unsupported native field.", [
        `placeable:index=${sourceIndex}:${String(entry.field)}:unsupported_field`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw mutationInvalid("Placeable script mutation field must be unique.", [
        `placeable:index=${sourceIndex}:${mapping.field}:duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (typeof entry.expectedResRef !== "string" || typeof entry.resRef !== "string") {
      throw mutationInvalid("Placeable script mutation requires a complete ResRef pair.", [
        `placeable:index=${sourceIndex}:${mapping.field}:incomplete`,
      ]);
    }
    if (!isScriptResRef(entry.expectedResRef)) {
      throw mutationInvalid("Placeable script expected value is not a valid ResRef.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_expected_resref`,
      ]);
    }
    if (!isScriptResRef(entry.resRef)) {
      throw mutationInvalid("Placeable script target value is not a valid ResRef.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_resref`,
      ]);
    }
    if (entry.expectedResRef === entry.resRef) {
      throw mutationInvalid("Placeable script mutation must change the source value.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unchanged`,
      ]);
    }
    normalized.push(Object.freeze({
      field: mapping.field,
      expectedResRef: entry.expectedResRef,
      resRef: entry.resRef,
    }));
  });
  return Object.freeze(normalized);
}

function normalizePlaceableLockMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableLockMutation[] {
  if (!Array.isArray(input)) {
    throw mutationInvalid("Placeable lock mutations must be an array.", [
      `placeable:index=${sourceIndex}:lockFields:invalid_list`,
    ]);
  }
  if (input.length === 0) {
    throw mutationInvalid("Placeable lock mutations must not be empty.", [
      `placeable:index=${sourceIndex}:lockFields:empty`,
    ]);
  }
  const normalized: ExistingAreaPlaceableLockMutation[] = [];
  const seen = new Set<ExistingAreaPlaceableLockField>();
  input.forEach((rawEntry, entryIndex) => {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw mutationInvalid("Placeable lock mutation entry must be an object.", [
        `placeable:index=${sourceIndex}:lockFields:entry=${entryIndex}:invalid`,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findAreaPlaceableLockFieldMapping(entry.field);
    if (!mapping) {
      throw mutationInvalid("Placeable lock mutation identifies an unsupported native field.", [
        `placeable:index=${sourceIndex}:${String(entry.field)}:unsupported_lock_field`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw mutationInvalid("Placeable lock mutation field must be unique.", [
        `placeable:index=${sourceIndex}:${mapping.field}:duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (
      !Object.prototype.hasOwnProperty.call(entry, "expectedValue") ||
      !Object.prototype.hasOwnProperty.call(entry, "value")
    ) {
      throw mutationInvalid("Placeable lock mutation requires one complete value pair.", [
        `placeable:index=${sourceIndex}:${mapping.field}:incomplete`,
      ]);
    }
    if (!isAreaPlaceableLockFieldValue(mapping, entry.expectedValue)) {
      throw mutationInvalid("Placeable lock expected value has the wrong type or range.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_expected_${mapping.valueKind}`,
      ]);
    }
    if (!isAreaPlaceableLockFieldValue(mapping, entry.value)) {
      throw mutationInvalid("Placeable lock target value has the wrong type or range.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_${mapping.valueKind}`,
      ]);
    }
    if (entry.expectedValue === entry.value) {
      throw mutationInvalid("Placeable lock mutation must change the source value.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unchanged`,
      ]);
    }
    normalized.push(Object.freeze({
      field: mapping.field,
      expectedValue: entry.expectedValue,
      value: entry.value,
    }));
  });
  const receivedOrder = normalized.map((entry) => entry.field).join("\0");
  const expectedOrder = AREA_PLACEABLE_LOCK_FIELD_MAPPINGS
    .filter((mapping) => seen.has(mapping.field))
    .map((mapping) => mapping.field)
    .join("\0");
  if (receivedOrder !== expectedOrder) {
    const field = normalized[normalized.length - 1]!.field;
    throw mutationInvalid("Placeable lock mutation fields must use frozen order.", [
      `placeable:index=${sourceIndex}:${field}:out_of_order`,
    ]);
  }
  return Object.freeze(normalized);
}

function normalizePlaceableTrapScriptMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaPlaceableTrapScriptResRefMutation[] {
  return normalizePlaceableResRefMutationList(
    input,
    sourceIndex,
    "trapScripts",
    "unsupported_trap_field",
    findAreaPlaceableTrapScriptFieldMapping,
  );
}

function normalizePlaceableResRefMutationList<TField extends string>(
  input: unknown,
  sourceIndex: number,
  collection: "trapScripts",
  unsupportedDiagnostic: "unsupported_trap_field",
  findMapping: (field: unknown) => Readonly<{ field: TField }> | undefined,
): readonly Readonly<{ field: TField; expectedResRef: string; resRef: string }>[] {
  if (!Array.isArray(input)) {
    throw mutationInvalid("Placeable trap script mutations must be an array.", [
      `placeable:index=${sourceIndex}:${collection}:invalid_list`,
    ]);
  }
  if (input.length === 0) {
    throw mutationInvalid("Placeable trap script mutations must not be empty.", [
      `placeable:index=${sourceIndex}:${collection}:empty`,
    ]);
  }
  const normalized: Array<Readonly<{ field: TField; expectedResRef: string; resRef: string }>> = [];
  const seen = new Set<TField>();
  input.forEach((rawEntry, entryIndex) => {
    if (typeof rawEntry !== "object" || rawEntry === null || Array.isArray(rawEntry)) {
      throw mutationInvalid("Placeable trap script mutation entry must be an object.", [
        `placeable:index=${sourceIndex}:${collection}:entry=${entryIndex}:invalid`,
      ]);
    }
    const entry = rawEntry as Readonly<Record<string, unknown>>;
    const mapping = findMapping(entry.field);
    if (!mapping) {
      throw mutationInvalid("Placeable trap script mutation identifies an unsupported native field.", [
        `placeable:index=${sourceIndex}:${String(entry.field)}:${unsupportedDiagnostic}`,
      ]);
    }
    if (seen.has(mapping.field)) {
      throw mutationInvalid("Placeable trap script mutation field must be unique.", [
        `placeable:index=${sourceIndex}:${mapping.field}:duplicate`,
      ]);
    }
    seen.add(mapping.field);
    if (typeof entry.expectedResRef !== "string" || typeof entry.resRef !== "string") {
      throw mutationInvalid("Placeable trap script mutation requires a complete ResRef pair.", [
        `placeable:index=${sourceIndex}:${mapping.field}:incomplete`,
      ]);
    }
    if (!isScriptResRef(entry.expectedResRef)) {
      throw mutationInvalid("Placeable trap script expected value is not a valid ResRef.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_expected_resref`,
      ]);
    }
    if (!isScriptResRef(entry.resRef)) {
      throw mutationInvalid("Placeable trap script target value is not a valid ResRef.", [
        `placeable:index=${sourceIndex}:${mapping.field}:invalid_resref`,
      ]);
    }
    if (entry.expectedResRef === entry.resRef) {
      throw mutationInvalid("Placeable trap script mutation must change the source value.", [
        `placeable:index=${sourceIndex}:${mapping.field}:unchanged`,
      ]);
    }
    normalized.push(Object.freeze({
      field: mapping.field,
      expectedResRef: entry.expectedResRef,
      resRef: entry.resRef,
    }));
  });
  return Object.freeze(normalized);
}

function validateBooleanPropertyPair(
  mutation: Readonly<Record<string, unknown>>,
  sourceIndex: number,
  label: "Static" | "Useable" | "Plot" | "HasInventory",
  expectedKey: "expectedStatic" | "expectedUseable" | "expectedPlot" | "expectedHasInventory",
  targetKey: "static" | "useable" | "plot" | "hasInventory",
): void {
  const hasPair = mutation[expectedKey] !== undefined || mutation[targetKey] !== undefined;
  if (!hasPair) return;
  if (typeof mutation[expectedKey] !== "boolean") {
    throw mutationInvalid(`Placeable ${label} expected value is not boolean.`, [
      `placeable:index=${sourceIndex}:${label}:invalid_expected_boolean`,
    ]);
  }
  if (typeof mutation[targetKey] !== "boolean") {
    throw mutationInvalid(`Placeable ${label} target value is not boolean.`, [
      `placeable:index=${sourceIndex}:${label}:invalid_boolean`,
    ]);
  }
  if (mutation[expectedKey] === mutation[targetKey]) {
    throw mutationInvalid(`Placeable ${label} mutation must change the source value.`, [
      `placeable:index=${sourceIndex}:${label}:unchanged`,
    ]);
  }
}

function rebuildDocument(
  source: RawDocument,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  fileType: "GIT " | "GIC ",
  objectTransforms: ReadonlyMap<string, ExistingAreaObjectTransform>,
  objectPropertyMutations: ReadonlyMap<string, ExistingAreaObjectPropertyMutation>,
  doorTransitionMutations: ReadonlyMap<string, ExistingAreaDoorTransitionStorageMutation>,
  polygonMutations: ReadonlyMap<string, ExistingAreaObjectPolygonMutation>,
  soundIntervalVariationMutations: ReadonlyMap<string, ExistingAreaSoundIntervalVariationMutation>,
  soundVolumeMutations: ReadonlyMap<string, ExistingAreaSoundVolumeMutation>,
  soundScheduleMutations: ReadonlyMap<string, ExistingAreaSoundScheduleMutation>,
  soundActiveMutations: ReadonlyMap<string, ExistingAreaSoundActiveMutation>,
  soundPlayOrderMutations: ReadonlyMap<string, ExistingAreaSoundPlayOrderMutation>,
  soundPlayStyleMutations: ReadonlyMap<string, ExistingAreaSoundPlayStyleMutation>,
  soundPlaybackMutations: ReadonlyMap<string, ExistingAreaSoundPlaybackMutation>,
  soundProfileMutations: ReadonlyMap<string, ExistingAreaSoundProfileMutation>,
  objectAdditions: readonly AreaObjectAdditionReadbackExpectation[],
): Buffer {
  const profileByLabel = new Map(FAMILY_PROFILES.map((profile) => [profile.label, profile]));
  const fields = source.fields.map((field): SupportedGffField => {
    const profile = profileByLabel.get(field.label);
    if (!profile) {
      return field;
    }
    const listField = field as GffListField;
    const removed = deletionIndexes.get(profile.kind);
    const familyAdditions = objectAdditions.filter((addition) => addition.kind === profile.kind);
    return {
      label: field.label,
      type: "list",
      value: listField.value
        .map((entry, index) => {
          const transform = objectTransforms.get(transformKey(profile.kind, index));
          const transformed = transform ? transformObjectEntry(entry, transform) : entry;
          const doorTransitionMutation = doorTransitionMutations.get(
            propertyMutationKey(profile.kind, index),
          );
          const transitioned = doorTransitionMutation
            ? mutateDoorTransitionStorageEntry(transformed, doorTransitionMutation)
            : transformed;
          const polygonMutation = polygonMutations.get(transformKey(profile.kind, index));
          const polygonUpdated = polygonMutation
            ? mutatePolygonGeometryEntry(transitioned, polygonMutation)
            : transitioned;
          const soundIntervalVariationMutation = soundIntervalVariationMutations.get(
            transformKey(profile.kind, index),
          );
          const soundIntervalVariationUpdated = soundIntervalVariationMutation
            ? mutateSoundIntervalVariationEntry(
                polygonUpdated,
                soundIntervalVariationMutation,
              )
            : polygonUpdated;
          const soundVolumeMutation = soundVolumeMutations.get(
            transformKey(profile.kind, index),
          );
          const soundStorageUpdated = soundVolumeMutation
            ? mutateSoundVolumeEntry(soundIntervalVariationUpdated, soundVolumeMutation)
            : soundIntervalVariationUpdated;
          const soundScheduleMutation = soundScheduleMutations.get(
            transformKey(profile.kind, index),
          );
          const soundScheduleUpdated = soundScheduleMutation
            ? mutateSoundScheduleEntry(soundStorageUpdated, soundScheduleMutation)
            : soundStorageUpdated;
          const soundActiveMutation = soundActiveMutations.get(
            transformKey(profile.kind, index),
          );
          const soundActiveUpdated = soundActiveMutation
            ? mutateSoundActiveEntry(soundScheduleUpdated, soundActiveMutation)
            : soundScheduleUpdated;
          const soundPlayOrderMutation = soundPlayOrderMutations.get(
            transformKey(profile.kind, index),
          );
          const soundPlayOrderUpdated = soundPlayOrderMutation
            ? mutateSoundPlayOrderEntry(soundActiveUpdated, soundPlayOrderMutation)
            : soundActiveUpdated;
          const soundPlayStyleMutation = soundPlayStyleMutations.get(
            transformKey(profile.kind, index),
          );
          const soundPlayStyleUpdated = soundPlayStyleMutation
            ? mutateSoundPlayStyleEntry(soundPlayOrderUpdated, soundPlayStyleMutation)
            : soundPlayOrderUpdated;
          const soundPlaybackMutation = soundPlaybackMutations.get(
            transformKey(profile.kind, index),
          );
          const soundPlaybackUpdated = soundPlaybackMutation
            ? mutateSoundPlaybackEntry(soundPlayStyleUpdated, soundPlaybackMutation)
            : soundPlayStyleUpdated;
          const soundProfileMutation = soundProfileMutations.get(
            transformKey(profile.kind, index),
          );
          const soundProfileUpdated = soundProfileMutation
            ? mutateSoundProfileEntry(soundPlaybackUpdated, soundProfileMutation)
            : soundPlaybackUpdated;
          const propertyMutation = objectPropertyMutations.get(
            propertyMutationKey(profile.kind, index),
          );
          if (!propertyMutation) return soundProfileUpdated;
          return fileType === "GIT "
            ? mutateObjectPropertyEntry(soundProfileUpdated, propertyMutation)
            : mutateObjectEditorCommentEntry(soundProfileUpdated, propertyMutation);
        })
        .filter((_entry, index) => !removed?.has(index))
        .concat(familyAdditions.map((addition) => fileType === "GIT " ? addition.git : addition.gic)),
    };
  });
  return buildGffBuffer(fields, fileType, source.rootStructTypeId);
}

export function verifyAreaObjectAdditionsReadback(
  candidateGit: Buffer,
  candidateGic: Buffer,
  additions: readonly AreaObjectAdditionReadbackExpectation[],
  sourceCounts: AreaObjectPairCounts,
  deletedCounts: AreaObjectPairCounts,
): void {
  inspectAreaGitGicPair(candidateGit, candidateGic);
  const git = parseRawGffDocument(candidateGit)!;
  const gic = parseRawGffDocument(candidateGic)!;
  const diagnostics: string[] = [];
  const offsets = new Map<AreaObjectAdditionReadbackExpectation["kind"], number>();
  for (const addition of additions) {
    const profile = FAMILY_PROFILES.find((candidate) => candidate.kind === addition.kind)!;
    const gitList = git.fields.find((field) => field.label === profile.label) as GffListField;
    const gicList = gic.fields.find((field) => field.label === profile.label) as GffListField;
    const additionIndex = offsets.get(addition.kind) ?? 0;
    const candidateIndex = sourceCounts[addition.kind] - deletedCounts[addition.kind] + additionIndex;
    if (JSON.stringify(gitList.value[candidateIndex]) !== JSON.stringify(addition.git)) {
      diagnostics.push(`${addition.kind}:addition=${additionIndex}:candidate=${candidateIndex}:git_mismatch`);
    }
    if (JSON.stringify(gicList.value[candidateIndex]) !== JSON.stringify(addition.gic)) {
      diagnostics.push(`${addition.kind}:addition=${additionIndex}:candidate=${candidateIndex}:gic_mismatch`);
    }
    offsets.set(addition.kind, additionIndex + 1);
  }
  if (diagnostics.length > 0) {
    throw companionMismatch("Candidate object additions differ from the admitted blueprint mapping.", diagnostics);
  }
}

const ORIENTATION_VECTOR_TRANSFORM_FIELDS = Object.freeze([
  "XPosition",
  "YPosition",
  "ZPosition",
  "XOrientation",
  "YOrientation",
] as const);

const PLACEABLE_TRANSFORM_FIELDS = Object.freeze([
  "X",
  "Y",
  "Z",
  "Bearing",
] as const);

const SOUND_POSITION_TRANSFORM_FIELDS = Object.freeze([
  "XPosition",
  "YPosition",
  "ZPosition",
] as const);

const TRIGGER_PRESERVED_ORIENTATION_FIELDS = Object.freeze([
  "XOrientation",
  "YOrientation",
  "ZOrientation",
] as const);

function transformObjectEntry(
  entry: GffListField["value"][number],
  transform: ExistingAreaObjectTransform,
): GffListField["value"][number] {
  const requiredFields: readonly string[] = transform.kind === "placeable"
    ? PLACEABLE_TRANSFORM_FIELDS
    : transform.kind === "encounter" || transform.kind === "sound" || transform.kind === "trigger"
      ? SOUND_POSITION_TRANSFORM_FIELDS
      : ORIENTATION_VECTOR_TRANSFORM_FIELDS;
  const ambiguousFields: readonly string[] = transform.kind === "placeable"
    ? ["XPosition", "YPosition", "ZPosition", "XOrientation", "YOrientation"]
    : transform.kind === "sound"
      ? ["Bearing", "XOrientation", "YOrientation"]
      : transform.kind === "encounter"
        ? ["Bearing", "Facing", "Orientation", "XOrientation", "YOrientation", "ZOrientation"]
      : ["Bearing"];
  const diagnostics: string[] = [];
  for (const label of requiredFields) {
    const matches = entry.fields.filter((field) => field.label === label);
    if (matches.length !== 1 || matches[0]?.type !== "float") {
      diagnostics.push(
        `${transform.kind}:index=${transform.sourceIndex}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}`,
      );
    }
  }
  for (const label of ambiguousFields) {
    const matches = entry.fields.filter((field) => field.label === label);
    if (matches.length > 0) {
      diagnostics.push(`${transform.kind}:index=${transform.sourceIndex}:${label}:count=${matches.length}`);
    }
  }
  if (diagnostics.length > 0) {
    throw mutationInvalid(
      `${capitalizeKind(transform.kind)} transform requires one unambiguous native float field for each transform component.`,
      diagnostics,
    );
  }
  if (transform.kind === "trigger") {
    const preservationDiagnostics: string[] = [];
    validateTriggerPreservationProfile(entry, transform, preservationDiagnostics);
    if (preservationDiagnostics.length > 0) {
      throw mutationInvalid(
        "Trigger transform requires one preserved native polygon geometry and orientation profile.",
        preservationDiagnostics,
      );
    }
  }
  if (transform.kind === "encounter") {
    const preservationDiagnostics: string[] = [];
    validateEncounterPreservationProfile(entry, transform, preservationDiagnostics);
    if (preservationDiagnostics.length > 0) {
      throw mutationInvalid(
        "Encounter transform requires one preserved native polygon and an empty spawn-point profile.",
        preservationDiagnostics,
      );
    }
  }
  const values = objectTransformFloat32Values(transform);
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field) => {
      const value = values.get(field.label);
      return value === undefined ? field : { label: field.label, type: "float", value };
    }),
  };
}

function mutateDoorTransitionStorageEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaDoorTransitionStorageMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 8) {
    throw mutationInvalid("Door transition mutation requires native Door struct type 8.", [
      `door:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const mappings = [
    { label: "LinkedTo", type: "cexostring", expected: mutation.transition.expectedValue.linkedTo, value: mutation.transition.value.linkedTo },
    { label: "LinkedToFlags", type: "byte", expected: mutation.transition.expectedValue.linkedToFlags, value: mutation.transition.value.linkedToFlags },
    { label: "LoadScreenID", type: "word", expected: mutation.transition.expectedValue.loadScreenId, value: mutation.transition.value.loadScreenId },
  ] as const;
  const replacements = new Map<string, SupportedGffField>();
  for (const mapping of mappings) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === mapping.label.toLowerCase(),
    );
    const field = matches[0];
    if (matches.length !== 1 || field?.label !== mapping.label || field.type !== mapping.type) {
      throw mutationInvalid(`Door ${mapping.label} mutation requires one exact native field.`, [
        `door:index=${mutation.sourceIndex}:${mapping.label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ]);
    }
    if (field.value !== mapping.expected) {
      throw mutationInvalid(`Door ${mapping.label} differs from retained provenance.`, [
        `door:index=${mutation.sourceIndex}:${mapping.label}:stale`,
      ]);
    }
    replacements.set(mapping.label, {
      label: mapping.label,
      type: mapping.type,
      value: mapping.value,
    } as SupportedGffField);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field) => replacements.get(field.label) ?? field),
  };
}

function mutateSoundIntervalVariationEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundIntervalVariationMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 6) {
    throw mutationInvalid(
      "Sound interval/variation mutation requires native Sound struct type 6.",
      [`sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const mappings = [
    {
      label: "Interval",
      type: "dword",
      expected: mutation.expectedValue.intervalMilliseconds,
      value: mutation.value.intervalMilliseconds,
    },
    {
      label: "IntervalVrtn",
      type: "dword",
      expected: mutation.expectedValue.intervalVariationMilliseconds,
      value: mutation.value.intervalVariationMilliseconds,
    },
    {
      label: "PitchVariation",
      type: "float",
      expected: pitchVariationFloat32FromHundredths(
        mutation.expectedValue.pitchVariationHundredths,
      ),
      value: pitchVariationFloat32FromHundredths(mutation.value.pitchVariationHundredths),
    },
    {
      label: "VolumeVrtn",
      type: "byte",
      expected: mutation.expectedValue.volumeVariationByte,
      value: mutation.value.volumeVariationByte,
    },
  ] as const;
  const replacements = new Map<string, SupportedGffField>();
  for (const mapping of mappings) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === mapping.label.toLowerCase(),
    );
    const field = matches[0];
    if (matches.length !== 1 || field?.label !== mapping.label || field.type !== mapping.type) {
      throw mutationInvalid(
        `Sound ${mapping.label} mutation requires one exact native field.`,
        [
          `sound:index=${mutation.sourceIndex}:${mapping.label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    if (field.value !== mapping.expected) {
      throw mutationInvalid(`Sound ${mapping.label} differs from retained provenance.`, [
        `sound:index=${mutation.sourceIndex}:${mapping.label}:stale`,
      ]);
    }
    replacements.set(mapping.label, {
      label: mapping.label,
      type: mapping.type,
      value: mapping.value,
    } as SupportedGffField);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field) => replacements.get(field.label) ?? field),
  };
}

function mutateSoundVolumeEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundVolumeMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound base-volume mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "volume");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "Volume" || field.type !== "byte") {
    throw mutationInvalid("Sound Volume mutation requires one exact native field.", [
      `sound:index=${mutation.sourceIndex}:Volume:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue.volumeByte) {
    throw mutationInvalid("Sound Volume differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:Volume:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "Volume"
      ? { label: "Volume", type: "byte", value: mutation.value.volumeByte }
      : candidate),
  };
}

function mutateSoundScheduleEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundScheduleMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound schedule mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const hoursMatches = entry.fields.filter((field) => field.label.toLowerCase() === "hours");
  const timesMatches = entry.fields.filter((field) => field.label.toLowerCase() === "times");
  const hoursField = hoursMatches[0];
  const timesField = timesMatches[0];
  if (hoursMatches.length !== 1 || hoursField?.label !== "Hours" || hoursField.type !== "dword") {
    throw mutationInvalid("Sound schedule mutation requires one exact native Hours field.", [
      `sound:index=${mutation.sourceIndex}:Hours:count=${hoursMatches.length}:label=${hoursField?.label ?? "missing"}:type=${hoursField?.type ?? "missing"}`,
    ]);
  }
  if (timesMatches.length !== 1 || timesField?.label !== "Times" || timesField.type !== "byte") {
    throw mutationInvalid("Sound schedule mutation requires one exact native Times field.", [
      `sound:index=${mutation.sourceIndex}:Times:count=${timesMatches.length}:label=${timesField?.label ?? "missing"}:type=${timesField?.type ?? "missing"}`,
    ]);
  }
  if (hoursField.value !== mutation.expectedValue.hoursMask) {
    throw mutationInvalid("Sound Hours differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:Hours:stale`,
    ]);
  }
  if (timesField.value !== mutation.expectedValue.timesByte) {
    throw mutationInvalid("Sound Times differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:Times:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      if (candidate.label === "Hours") {
        return { label: "Hours", type: "dword", value: mutation.value.hoursMask };
      }
      if (candidate.label === "Times") {
        return { label: "Times", type: "byte", value: mutation.value.timesByte };
      }
      return candidate;
    }),
  };
}

function mutateSoundActiveEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundActiveMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound Active mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "active");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "Active" || field.type !== "byte") {
    throw mutationInvalid("Sound Active mutation requires one exact native field.", [
      `sound:index=${mutation.sourceIndex}:Active:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue.activeByte) {
    throw mutationInvalid("Sound Active differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:Active:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "Active"
      ? { label: "Active", type: "byte", value: mutation.value.activeByte }
      : candidate),
  };
}

function mutateSoundPlayOrderEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundPlayOrderMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound Play Order mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "random");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "Random" || field.type !== "byte") {
    throw mutationInvalid("Sound Play Order mutation requires one exact native field.", [
      `sound:index=${mutation.sourceIndex}:Random:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue.randomByte) {
    throw mutationInvalid("Sound Play Order differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:Random:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "Random"
      ? { label: "Random", type: "byte", value: mutation.value.randomByte }
      : candidate),
  };
}

function mutateSoundPlayStyleEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundPlayStyleMutation,
): GffListField["value"][number] {
  const source = readExactSoundPlayStyleEntry(entry, mutation);
  const expected = mutation.expectedValue;
  const keys = Object.keys(expected) as Array<keyof AreaSoundPlayStyleStorage>;
  if (keys.some((key) => source[key] !== expected[key])) {
    const stale = keys.find((key) => source[key] !== expected[key])!;
    throw mutationInvalid("Sound Play Style differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:${stale}:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      if (candidate.label === "Continuous") {
        return { label: "Continuous", type: "byte", value: mutation.value.continuousByte };
      }
      if (candidate.label === "Looping") {
        return { label: "Looping", type: "byte", value: mutation.value.loopingByte };
      }
      if (candidate.label === "Priority") {
        return { label: "Priority", type: "byte", value: mutation.value.priorityByte };
      }
      return candidate;
    }),
  };
}

function mutateSoundPlaybackEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundPlaybackMutation,
): GffListField["value"][number] {
  const source = readExactSoundPlaybackEntry(entry, mutation);
  if (!areaSoundPlaybackStoragesEqual(source, mutation.expectedValue)) {
    throw mutationInvalid("Sound playback differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:playback:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      if (candidate.label === "Continuous") {
        return { label: "Continuous", type: "byte", value: mutation.value.continuousByte };
      }
      if (candidate.label === "Looping") {
        return { label: "Looping", type: "byte", value: mutation.value.loopingByte };
      }
      if (candidate.label === "Priority") {
        return { label: "Priority", type: "byte", value: mutation.value.priorityByte };
      }
      if (candidate.label === "Sounds") {
        return {
          label: "Sounds",
          type: "list",
          value: mutation.value.sounds.map((value) => ({
            typeId: 0,
            fields: [{ label: "Sound", type: "resref", value }],
          })),
        };
      }
      return candidate;
    }),
  };
}

function mutateSoundProfileEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundProfileMutation,
): GffListField["value"][number] {
  const source = readExactSoundProfileEntry(entry, mutation);
  if (!areaSoundProfileStoragesEqual(source, mutation.expectedValue)) {
    throw mutationInvalid("Sound profile differs from retained provenance.", [
      `sound:index=${mutation.sourceIndex}:profile:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      switch (candidate.label) {
        case "Continuous":
          return { label: "Continuous", type: "byte", value: mutation.value.continuousByte };
        case "Looping":
          return { label: "Looping", type: "byte", value: mutation.value.loopingByte };
        case "Priority":
          return { label: "Priority", type: "byte", value: mutation.value.priorityByte };
        case "Positional":
          return { label: "Positional", type: "byte", value: mutation.value.positionalByte };
        case "RandomPosition":
          return {
            label: "RandomPosition",
            type: "byte",
            value: mutation.value.randomPositionByte,
          };
        case "Elevation":
          return { label: "Elevation", type: "float", value: mutation.value.elevationFloat32 };
        case "MaxDistance":
          return {
            label: "MaxDistance",
            type: "float",
            value: mutation.value.maxDistanceFloat32,
          };
        case "MinDistance":
          return {
            label: "MinDistance",
            type: "float",
            value: mutation.value.minDistanceFloat32,
          };
        case "RandomRangeX":
          return {
            label: "RandomRangeX",
            type: "float",
            value: mutation.value.randomRangeXFloat32,
          };
        case "RandomRangeY":
          return {
            label: "RandomRangeY",
            type: "float",
            value: mutation.value.randomRangeYFloat32,
          };
        case "Sounds":
          return {
            label: "Sounds",
            type: "list",
            value: mutation.value.sounds.map((value) => ({
              typeId: 0,
              fields: [{ label: "Sound", type: "resref", value }],
            })),
          };
        default:
          return candidate;
      }
    }),
  };
}

function readExactSoundProfileEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundProfileMutation,
): AreaSoundProfileStorage {
  const playback = readExactSoundPlaybackEntry(entry, mutation);
  const randomPositionByte = requireExactSoundProfileNumber(
    entry,
    mutation,
    "RandomPosition",
    "byte",
  );
  const elevationFloat32 = requireExactSoundProfileNumber(
    entry,
    mutation,
    "Elevation",
    "float",
  );
  const maxDistanceFloat32 = requireExactSoundProfileNumber(
    entry,
    mutation,
    "MaxDistance",
    "float",
  );
  const minDistanceFloat32 = requireExactSoundProfileNumber(
    entry,
    mutation,
    "MinDistance",
    "float",
  );
  const randomRangeXFloat32 = requireExactSoundProfileNumber(
    entry,
    mutation,
    "RandomRangeX",
    "float",
  );
  const randomRangeYFloat32 = requireExactSoundProfileNumber(
    entry,
    mutation,
    "RandomRangeY",
    "float",
  );
  const storage = readAreaSoundProfileStorage({
    ...playback,
    randomPositionByte,
    elevationFloat32,
    maxDistanceFloat32,
    minDistanceFloat32,
    randomRangeXFloat32,
    randomRangeYFloat32,
  });
  if (!storage) {
    throw mutationInvalid("Sound profile source tuple is noncanonical.", [
      `sound:index=${mutation.sourceIndex}:profile:profile_mismatch`,
    ]);
  }
  return storage;
}

function requireExactSoundProfileNumber(
  entry: GffListField["value"][number],
  mutation: Readonly<{ sourceIndex: number }>,
  label:
    | "RandomPosition"
    | "Elevation"
    | "MaxDistance"
    | "MinDistance"
    | "RandomRangeX"
    | "RandomRangeY",
  type: "byte" | "float",
): number {
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === label.toLowerCase());
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== label || field.type !== type) {
    throw mutationInvalid("Sound profile mutation requires one exact native spatial field.", [
      `sound:index=${mutation.sourceIndex}:${label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return Number(field.value);
}

function readExactSoundPlaybackEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundPlaybackMutation,
): AreaSoundPlaybackStorage {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound playback mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const loopingByte = requireExactSoundPlayStyleNumber(entry, mutation, "Looping", "byte");
  const continuousByte = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "Continuous",
    "byte",
  );
  const priorityByte = requireExactSoundPlayStyleNumber(entry, mutation, "Priority", "byte");
  const positionalByte = requireExactSoundPlayStyleNumber(entry, mutation, "Positional", "byte");
  const intervalDword = requireExactSoundPlayStyleNumber(entry, mutation, "Interval", "dword");
  const intervalVariationDword = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "IntervalVrtn",
    "dword",
  );
  const soundsMatches = entry.fields.filter((field) => field.label.toLowerCase() === "sounds");
  const soundsField = soundsMatches[0];
  if (
    soundsMatches.length !== 1
    || soundsField?.label !== "Sounds"
    || soundsField.type !== "list"
  ) {
    throw mutationInvalid("Sound playback mutation requires one exact native Sounds list.", [
      `sound:index=${mutation.sourceIndex}:Sounds:count=${soundsMatches.length}:label=${soundsField?.label ?? "missing"}:type=${soundsField?.type ?? "missing"}`,
    ]);
  }
  const sounds: string[] = [];
  soundsField.value.forEach((child, childIndex) => {
    const member = child.fields[0];
    if (
      child.typeId !== 0
      || child.fields.length !== 1
      || member?.label !== "Sound"
      || member.type !== "resref"
      || !isAreaSoundResRef(member.value)
    ) {
      throw mutationInvalid("Sound playback mutation requires exact native Sounds children.", [
        `sound:index=${mutation.sourceIndex}:Sounds=${childIndex}:profile_mismatch`,
      ]);
    }
    sounds.push(member.value);
  });
  const storage = readAreaSoundPlaybackStorage({
    sounds,
    loopingByte,
    continuousByte,
    priorityByte,
    positionalByte,
    intervalDword,
    intervalVariationDword,
  });
  if (!storage) {
    throw mutationInvalid("Sound playback source tuple is noncanonical.", [
      `sound:index=${mutation.sourceIndex}:playback:profile_mismatch`,
    ]);
  }
  return storage;
}

function readExactSoundPlayStyleEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaSoundPlayStyleMutation,
): AreaSoundPlayStyleStorage {
  if (entry.typeId !== 6) {
    throw mutationInvalid("Sound Play Style mutation requires native Sound struct type 6.", [
      `sound:index=${mutation.sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const loopingByte = requireExactSoundPlayStyleNumber(entry, mutation, "Looping", "byte");
  const continuousByte = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "Continuous",
    "byte",
  );
  const priorityByte = requireExactSoundPlayStyleNumber(entry, mutation, "Priority", "byte");
  const positionalByte = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "Positional",
    "byte",
  );
  const intervalDword = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "Interval",
    "dword",
  );
  const intervalVariationDword = requireExactSoundPlayStyleNumber(
    entry,
    mutation,
    "IntervalVrtn",
    "dword",
  );
  const soundsMatches = entry.fields.filter((field) => field.label.toLowerCase() === "sounds");
  const sounds = soundsMatches[0];
  if (soundsMatches.length !== 1 || sounds?.label !== "Sounds" || sounds.type !== "list") {
    throw mutationInvalid("Sound Play Style mutation requires one exact native Sounds list.", [
      `sound:index=${mutation.sourceIndex}:Sounds:count=${soundsMatches.length}:label=${sounds?.label ?? "missing"}:type=${sounds?.type ?? "missing"}`,
    ]);
  }
  return {
    loopingByte: loopingByte as 0 | 1,
    continuousByte: continuousByte as 0 | 1,
    priorityByte: priorityByte as AreaSoundPlayStyleStorage["priorityByte"],
    positionalByte: positionalByte as 0 | 1,
    soundsCount: sounds.value.length,
    intervalDword,
    intervalVariationDword,
  };
}

function requireExactSoundPlayStyleNumber(
  entry: GffListField["value"][number],
  mutation: Readonly<{ sourceIndex: number }>,
  label: "Looping" | "Continuous" | "Priority" | "Positional" | "Interval" | "IntervalVrtn",
  type: "byte" | "dword",
): number {
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === label.toLowerCase());
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== label || field.type !== type) {
    throw mutationInvalid("Sound Play Style mutation requires one exact native dependency field.", [
      `sound:index=${mutation.sourceIndex}:${label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return Number(field.value);
}

function mutatePolygonGeometryEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaObjectPolygonMutation,
): GffListField["value"][number] {
  const expectedStructType = mutation.kind === "trigger" ? 1 : 7;
  if (entry.typeId !== expectedStructType) {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} polygon mutation requires its exact native struct type.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:struct_type=${entry.typeId}:expected=${expectedStructType}`,
    ]);
  }
  const sourceGeometry = readExactPolygonGeometryFromEntry(entry, mutation);
  if (!areaObjectPolygonGeometriesEqual(sourceGeometry, mutation.expectedGeometry)) {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} polygon source differs from retained provenance.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:Geometry:stale`,
    ]);
  }
  const pointStructType = mutation.kind === "trigger" ? 3 : 1;
  const labels = mutation.kind === "trigger"
    ? (["PointX", "PointY", "PointZ"] as const)
    : (["X", "Y", "Z"] as const);
  const replacement: GffListField = {
    label: "Geometry",
    type: "list",
    value: mutation.geometry.points.map((point) => ({
      typeId: pointStructType,
      fields: [
        { label: labels[0], type: "float", value: point.x },
        { label: labels[1], type: "float", value: point.y },
        { label: labels[2], type: "float", value: point.z },
      ],
    })),
  };
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field) =>
      field.label === "Geometry" ? replacement : field),
  };
}

function readExactPolygonGeometryFromEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaObjectPolygonMutation,
): AreaObjectPolygonGeometry {
  const geometryMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "geometry",
  );
  const geometry = geometryMatches[0];
  if (
    geometryMatches.length !== 1
    || geometry?.label !== "Geometry"
    || geometry.type !== "list"
  ) {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} polygon mutation requires one exact Geometry list.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:Geometry:count=${geometryMatches.length}:label=${geometry?.label ?? "missing"}:type=${geometry?.type ?? "missing"}`,
    ]);
  }
  if (mutation.kind === "encounter") {
    const spawnMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === "spawnpointlist",
    );
    const spawnPoints = spawnMatches[0];
    if (
      spawnMatches.length !== 1
      || spawnPoints?.label !== "SpawnPointList"
      || spawnPoints.type !== "list"
    ) {
      throw mutationInvalid("Encounter polygon mutation requires one exact canonical SpawnPointList.", [
        `encounter:index=${mutation.sourceIndex}:SpawnPointList:count=${spawnMatches.length}:label=${spawnPoints?.label ?? "missing"}:type=${spawnPoints?.type ?? "missing"}:entries=${spawnPoints?.type === "list" ? spawnPoints.value.length : "missing"}`,
      ]);
    }
    readExactEncounterSpawnPointSourceEntries(spawnPoints, mutation.sourceIndex);
  }
  const pointStructType = mutation.kind === "trigger" ? 3 : 1;
  const labels = mutation.kind === "trigger"
    ? (["PointX", "PointY", "PointZ"] as const)
    : (["X", "Y", "Z"] as const);
  const points: Array<{ x: number; y: number; z: number }> = [];
  geometry.value.forEach((point, pointIndex) => {
    if (point.typeId !== pointStructType || point.fields.length !== labels.length) {
      throw mutationInvalid(`${capitalizeKind(mutation.kind)} polygon point has an invalid native shape.`, [
        `${mutation.kind}:index=${mutation.sourceIndex}:Geometry:point=${pointIndex}:type=${point.typeId}:fields=${point.fields.length}`,
      ]);
    }
    const values = labels.map((label) => {
      const matches = point.fields.filter(
        (field) => field.label.toLowerCase() === label.toLowerCase(),
      );
      const field = matches[0];
      if (
        matches.length !== 1
        || field?.label !== label
        || field.type !== "float"
        || !Number.isFinite(field.value)
      ) {
        throw mutationInvalid(`${capitalizeKind(mutation.kind)} polygon coordinate is not one exact finite float.`, [
          `${mutation.kind}:index=${mutation.sourceIndex}:Geometry:point=${pointIndex}:${label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
        ]);
      }
      return field.value;
    });
    points.push({ x: values[0]!, y: values[1]!, z: values[2]! });
  });
  const admitted = readAreaObjectPolygonGeometry({
    coordinateSpace: "native_local",
    points,
  });
  if (!admitted) {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} source polygon is outside the admitted geometry profile.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:Geometry:invalid_profile`,
    ]);
  }
  return admitted;
}

const ITEM_INSTANCE_STATE_PRECEDING_LABELS = new Set([
  "XPosition",
  "YPosition",
  "ZPosition",
  "XOrientation",
  "YOrientation",
  "TemplateResRef",
  "BaseItem",
  "LocalizedName",
  "Description",
  "DescIdentified",
  "Tag",
]);

const ITEM_INSTANCE_STATE_FOLLOWING_LABELS = new Set([
  "ModelPart1",
  "ModelPart2",
  "ModelPart3",
  "PropertiesList",
  "OnUsed",
  "OnHeartbeat",
  "OnUserDefined",
  "OnInvDisturbed",
]);

const ITEM_BASE_APPEARANCE_GFF_PROFILE = Object.freeze([
  Object.freeze({ key: "modelPart1", label: "ModelPart1", type: "word" }),
  Object.freeze({ key: "modelPart2", label: "ModelPart2", type: "word" }),
  Object.freeze({ key: "modelPart3", label: "ModelPart3", type: "word" }),
  Object.freeze({ key: "rFoot", label: "ArmorPart_RFoot", type: "word" }),
  Object.freeze({ key: "lFoot", label: "ArmorPart_LFoot", type: "word" }),
  Object.freeze({ key: "rShin", label: "ArmorPart_RShin", type: "word" }),
  Object.freeze({ key: "lShin", label: "ArmorPart_LShin", type: "word" }),
  Object.freeze({ key: "lThigh", label: "ArmorPart_LThigh", type: "word" }),
  Object.freeze({ key: "rThigh", label: "ArmorPart_RThigh", type: "word" }),
  Object.freeze({ key: "pelvis", label: "ArmorPart_Pelvis", type: "word" }),
  Object.freeze({ key: "torso", label: "ArmorPart_Torso", type: "word" }),
  Object.freeze({ key: "belt", label: "ArmorPart_Belt", type: "word" }),
  Object.freeze({ key: "neck", label: "ArmorPart_Neck", type: "word" }),
  Object.freeze({ key: "rFArm", label: "ArmorPart_RFArm", type: "word" }),
  Object.freeze({ key: "lFArm", label: "ArmorPart_LFArm", type: "word" }),
  Object.freeze({ key: "rBicep", label: "ArmorPart_RBicep", type: "word" }),
  Object.freeze({ key: "lBicep", label: "ArmorPart_LBicep", type: "word" }),
  Object.freeze({ key: "rShoul", label: "ArmorPart_RShoul", type: "word" }),
  Object.freeze({ key: "lShoul", label: "ArmorPart_LShoul", type: "word" }),
  Object.freeze({ key: "rHand", label: "ArmorPart_RHand", type: "word" }),
  Object.freeze({ key: "lHand", label: "ArmorPart_LHand", type: "word" }),
  Object.freeze({ key: "robe", label: "ArmorPart_Robe", type: "word" }),
  Object.freeze({ key: "leather1", label: "Leather1Color", type: "byte" }),
  Object.freeze({ key: "leather2", label: "Leather2Color", type: "byte" }),
  Object.freeze({ key: "cloth1", label: "Cloth1Color", type: "byte" }),
  Object.freeze({ key: "cloth2", label: "Cloth2Color", type: "byte" }),
  Object.freeze({ key: "metal1", label: "Metal1Color", type: "byte" }),
  Object.freeze({ key: "metal2", label: "Metal2Color", type: "byte" }),
] as const);

const ITEM_BASE_APPEARANCE_LABELS: ReadonlySet<string> = new Set<string>(
  ITEM_BASE_APPEARANCE_GFF_PROFILE.map((profile) => profile.label),
);

function readItemBaseAppearanceRawFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaItemBaseAppearanceRawStorage {
  if (entry.typeId !== 0) {
    throw mutationInvalid("Item BaseItem/appearance mutation requires native struct type 0.", [
      `item:index=${sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const baseMatches = entry.fields.filter((field) => field.label.toLowerCase() === "baseitem");
  const baseItem = baseMatches[0];
  if (baseMatches.length !== 1 || baseItem?.label !== "BaseItem" || baseItem.type !== "int" ||
    !Number.isSafeInteger(baseItem.value) || baseItem.value < 0 || baseItem.value > 0x7fff_ffff) {
    throw mutationInvalid("Item BaseItem source is not one exact non-negative native Int.", [
      `item:index=${sourceIndex}:BaseItem:count=${baseMatches.length}:label=${baseItem?.label ?? "missing"}:type=${baseItem?.type ?? "missing"}`,
    ]);
  }
  const appearanceFields: Record<string, number> = {};
  const appearanceFieldOrder: string[] = [];
  for (const field of entry.fields) {
    const profile = ITEM_BASE_APPEARANCE_GFF_PROFILE.find(
      (candidate) => candidate.label.toLowerCase() === field.label.toLowerCase(),
    );
    if (!profile) continue;
    const matches = entry.fields.filter(
      (candidate) => candidate.label.toLowerCase() === profile.label.toLowerCase(),
    );
    if (matches.length !== 1 || field.label !== profile.label || field.type !== profile.type ||
      typeof field.value !== "number" || !Number.isSafeInteger(field.value)) {
      throw mutationInvalid("Item appearance source field is not one exact native scalar.", [
        `item:index=${sourceIndex}:${profile.label}:count=${matches.length}:label=${field.label}:type=${field.type}`,
      ]);
    }
    appearanceFields[profile.key] = field.value;
    appearanceFieldOrder.push(profile.key);
  }
  const raw = readItemBaseAppearanceRawStorage({
    baseItem: baseItem.value,
    appearanceFields,
    appearanceFieldOrder,
  });
  if (!raw) {
    throw mutationInvalid("Item BaseItem/appearance source is outside the admitted native profile.", [
      `item:index=${sourceIndex}:BaseItem:invalid_source_profile`,
    ]);
  }
  return raw;
}

function buildItemBaseAppearanceFields(
  value: AreaItemBaseAppearanceValue,
): SupportedGffField[] {
  if (value.modelType === 0) {
    return [{ label: "ModelPart1", type: "word", value: value.appearance.modelPart1 }];
  }
  if (value.modelType === 1) {
    return [
      { label: "ModelPart1", type: "word", value: value.appearance.modelPart1 },
      ...AREA_ITEM_MATERIAL_COLOR_KEYS.map((key) => ({
        label: ITEM_BASE_APPEARANCE_GFF_PROFILE.find((entry) => entry.key === key)!.label,
        type: "byte" as const,
        value: value.appearance.materialColors[key],
      })),
    ];
  }
  if (value.modelType === 2) {
    return [
      { label: "ModelPart1", type: "word", value: value.appearance.modelPart1 },
      { label: "ModelPart2", type: "word", value: value.appearance.modelPart2 },
      { label: "ModelPart3", type: "word", value: value.appearance.modelPart3 },
    ];
  }
  return [
    ...AREA_ITEM_ARMOR_PART_KEYS.map((key) => ({
      label: ITEM_BASE_APPEARANCE_GFF_PROFILE.find((entry) => entry.key === key)!.label,
      type: "word" as const,
      value: value.appearance.armorParts[key],
    })),
    ...AREA_ITEM_MATERIAL_COLOR_KEYS.map((key) => ({
      label: ITEM_BASE_APPEARANCE_GFF_PROFILE.find((entry) => entry.key === key)!.label,
      type: "byte" as const,
      value: value.appearance.materialColors[key],
    })),
  ];
}

function mutateItemBaseAppearanceEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaItemBaseAppearanceMutation,
): GffListField["value"][number] {
  const source = readItemBaseAppearanceRawFromEntry(entry, sourceIndex);
  if (!itemBaseAppearanceRawMatchesValue(source, mutation.expectedValue)) {
    throw mutationInvalid("Item BaseItem/appearance differs from retained provenance.", [
      `item:index=${sourceIndex}:BaseItem:stale_storage`,
    ]);
  }
  const firstAppearanceIndex = entry.fields.findIndex((field) =>
    ITEM_BASE_APPEARANCE_LABELS.has(field.label));
  if (firstAppearanceIndex < 0) {
    throw mutationInvalid("Item BaseItem/appearance source has no canonical appearance profile.", [
      `item:index=${sourceIndex}:appearance:missing`,
    ]);
  }
  const insertionIndex = entry.fields.slice(0, firstAppearanceIndex)
    .filter((field) => !ITEM_BASE_APPEARANCE_LABELS.has(field.label)).length;
  const withoutAppearance = entry.fields
    .filter((field) => !ITEM_BASE_APPEARANCE_LABELS.has(field.label))
    .map((field) => field.label === "BaseItem"
      ? { label: "BaseItem", type: "int" as const, value: mutation.value.baseItem }
      : field);
  const targetAppearance = buildItemBaseAppearanceFields(mutation.value);
  return {
    typeId: entry.typeId,
    fields: [
      ...withoutAppearance.slice(0, insertionIndex),
      ...targetAppearance,
      ...withoutAppearance.slice(insertionIndex),
    ],
  };
}

function readItemInstanceStateFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaItemInstanceStateStorage {
  if (entry.typeId !== 0) {
    throw mutationInvalid("Item instance-state mutation requires native Item struct type 0.", [
      `item:index=${sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const presentFields: Array<typeof AREA_ITEM_INSTANCE_STATE_FIELDS[number]["key"]> = [];
  const values: Record<string, number | boolean> = {
    ...AREA_ITEM_INSTANCE_STATE_DEFAULTS,
  };
  for (const profile of AREA_ITEM_INSTANCE_STATE_FIELDS) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (matches.length === 0) continue;
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.type !== profile.nativeType
      || typeof field.value !== "number"
      || !Number.isSafeInteger(field.value)
      || field.value < profile.minimum
      || field.value > profile.maximum
      || (profile.valueKind === "boolean" && field.value !== 0 && field.value !== 1)
    ) {
      throw mutationInvalid("Item instance-state source field is not one exact native scalar.", [
        `item:index=${sourceIndex}:${profile.label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ]);
    }
    presentFields.push(profile.key);
    values[profile.key] = profile.valueKind === "boolean" ? field.value === 1 : field.value;
  }
  const storage = readAreaItemInstanceStateStorage({ presentFields, values });
  if (!storage) {
    throw mutationInvalid("Item instance-state source tuple is noncanonical.", [
      `item:index=${sourceIndex}:instance_state:profile_mismatch`,
    ]);
  }
  return storage;
}

function buildItemInstanceStateField(
  profile: typeof AREA_ITEM_INSTANCE_STATE_FIELDS[number],
  values: AreaItemInstanceStateValue,
): SupportedGffField {
  const value = values[profile.key];
  if (profile.nativeType === "byte") {
    return {
      label: profile.label,
      type: "byte",
      value: profile.valueKind === "boolean" ? (value ? 1 : 0) : value as number,
    };
  }
  if (profile.nativeType === "word") {
    return { label: profile.label, type: "word", value: value as number };
  }
  return { label: profile.label, type: "dword", value: value as number };
}

function itemInstanceStateInsertionIndex(fields: readonly SupportedGffField[]): number {
  let precedingIndex = -1;
  fields.forEach((field, index) => {
    if (ITEM_INSTANCE_STATE_PRECEDING_LABELS.has(field.label)) precedingIndex = index;
  });
  if (precedingIndex >= 0) return precedingIndex + 1;
  const followingIndex = fields.findIndex((field) =>
    ITEM_INSTANCE_STATE_FOLLOWING_LABELS.has(field.label));
  return followingIndex >= 0 ? followingIndex : fields.length;
}

function mutateItemInstanceStateEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaItemInstanceStateMutation,
): GffListField["value"][number] {
  const source = readItemInstanceStateFromEntry(entry, sourceIndex);
  if (!areaItemInstanceStateStorageEqual(source, mutation.expectedValue)) {
    throw mutationInvalid("Item instance state differs from retained provenance.", [
      `item:index=${sourceIndex}:instance_state:stale_storage`,
    ]);
  }
  if (areaItemInstanceStateValueEqual(source.values, mutation.value)) {
    throw mutationInvalid("Item instance-state mutation must change the source value.", [
      `item:index=${sourceIndex}:instance_state:unchanged`,
    ]);
  }
  const stateLabels = new Set<string>(
    AREA_ITEM_INSTANCE_STATE_FIELDS.map((profile) => profile.label),
  );
  const fieldsWithoutState = entry.fields.filter((field) => !stateLabels.has(field.label));
  const insertionIndex = itemInstanceStateInsertionIndex(fieldsWithoutState);
  const stateFields = AREA_ITEM_INSTANCE_STATE_FIELDS.map((profile) =>
    buildItemInstanceStateField(profile, mutation.value));
  return {
    typeId: entry.typeId,
    fields: [
      ...fieldsWithoutState.slice(0, insertionIndex),
      ...stateFields,
      ...fieldsWithoutState.slice(insertionIndex),
    ],
  };
}

function readStoreCommerceFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaStoreCommerceValue {
  if (entry.typeId !== 11) {
    throw mutationInvalid("Store commerce mutation requires one type-11 native Store struct.", [
      `store:index=${sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const values: Record<string, number | boolean> = {};
  for (const profile of AREA_STORE_COMMERCE_FIELDS) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    const expectedType = profile.nativeType;
    if (matches.length !== 1 || field?.label !== profile.label ||
        field.type !== expectedType || typeof field.value !== "number") {
      throw mutationInvalid(`Store commerce mutation requires exact ${profile.label} storage.`, [
        `store:index=${sourceIndex}:${profile.label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
      ]);
    }
    if (profile.key === "blackMarket") {
      if (field.value !== 0 && field.value !== 1) {
        throw mutationInvalid("Store BlackMarket must be a canonical boolean Byte.", [
          `store:index=${sourceIndex}:BlackMarket:value=noncanonical`,
        ]);
      }
      values.blackMarket = field.value === 1;
    } else {
      values[profile.key] = field.value;
    }
  }
  const value = readAreaStoreCommerceValue(values);
  if (!value) {
    throw mutationInvalid("Store commerce source vector is outside the admitted profile.", [
      `store:index=${sourceIndex}:commerce:invalid_source`,
    ]);
  }
  return value;
}

function mutateStoreCommerceEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaStoreCommerceMutation,
): GffListField["value"][number] {
  const source = readStoreCommerceFromEntry(entry, sourceIndex);
  if (!areaStoreCommerceValueEqual(source, mutation.expectedValue)) {
    throw mutationInvalid("Store commerce differs from retained provenance.", [
      `store:index=${sourceIndex}:commerce:stale_storage`,
    ]);
  }
  const profileByLabel = new Map<string, (typeof AREA_STORE_COMMERCE_FIELDS)[number]>(
    AREA_STORE_COMMERCE_FIELDS.map((profile) => [profile.label, profile] as const),
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field): SupportedGffField => {
      const profile = profileByLabel.get(field.label);
      if (!profile) return field;
      const target = mutation.value[profile.key];
      return profile.nativeType === "byte"
        ? { label: profile.label, type: "byte", value: target ? 1 : 0 }
        : { label: profile.label, type: "int", value: target as number };
    }),
  };
}

function normalizeStoreScriptResRefsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreScriptResRefsMutation {
  const mutation = readAreaStoreScriptResRefsMutation(input);
  if (!mutation) {
    throw mutationInvalid("Store script mutation requires one complete changed exact pair CAS.", [
      `store:index=${sourceIndex}:scripts:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeStoreVariableMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreVariableMutation {
  try {
    return parseAreaStoreVariableMutation(input);
  } catch (error) {
    throw mutationInvalid("Retained Store VarTable mutation pair is invalid.", [
      `store:index=${sourceIndex}:VarTable:${error instanceof Error ? error.message : "invalid_pair"}`,
    ]);
  }
}

function normalizeStoreRestrictionsMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreRestrictionsMutation {
  const mutation = readExistingAreaStoreRestrictionsMutation(input);
  if (!mutation) {
    throw mutationInvalid("Retained Store restrictions mutation pair is invalid.", [
      `store:index=${sourceIndex}:restrictions:invalid_pair`,
    ]);
  }
  return mutation;
}

function normalizeStoreInventoryMutation(
  input: unknown,
  sourceIndex: number,
): ExistingAreaStoreInventoryMutation {
  const mutation = readExistingAreaStoreInventoryMutation(input);
  if (!mutation) {
    throw mutationInvalid("Retained Store inventory mutation pair is invalid.", [
      `store:index=${sourceIndex}:inventory:invalid_pair`,
    ]);
  }
  return mutation;
}

function readStoreScriptResRefsFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaStoreScriptResRefsValue {
  if (entry.typeId !== 11) {
    throw mutationInvalid("Store script mutation requires one type-11 native Store struct.", [
      `store:index=${sourceIndex}:struct_type=${entry.typeId}`,
    ]);
  }
  const values: Record<string, string> = {};
  for (const profile of AREA_STORE_SCRIPT_RESREF_FIELDS) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1 ||
      field?.label !== profile.label ||
      field.type !== "resref" ||
      typeof field.value !== "string"
    ) {
      throw mutationInvalid(`Store script mutation requires exact ${profile.label} storage.`, [
        `store:index=${sourceIndex}:${profile.label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
      ]);
    }
    values[profile.key] = field.value;
  }
  const value = readAreaStoreScriptResRefsValue(values);
  if (!value) {
    throw mutationInvalid("Store script source pair is outside the admitted profile.", [
      `store:index=${sourceIndex}:scripts:invalid_source`,
    ]);
  }
  return value;
}

function mutateStoreScriptResRefsEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaStoreScriptResRefsMutation,
): GffListField["value"][number] {
  const source = readStoreScriptResRefsFromEntry(entry, sourceIndex);
  if (!areaStoreScriptResRefsValueEqual(source, mutation.expectedValue)) {
    throw mutationInvalid("Store script ResRefs differ from retained provenance.", [
      `store:index=${sourceIndex}:scripts:stale_storage`,
    ]);
  }
  const profileByLabel = new Map<
    string,
    (typeof AREA_STORE_SCRIPT_RESREF_FIELDS)[number]
  >(
    AREA_STORE_SCRIPT_RESREF_FIELDS.map((profile) => [profile.label, profile] as const),
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field): SupportedGffField => {
      const profile = profileByLabel.get(field.label);
      return profile
        ? { label: profile.label, type: "resref", value: mutation.value[profile.key] }
        : field;
    }),
  };
}

function readStoreRestrictionListFromEntry(
  entry: GffListField["value"][number],
  label: "WillNotBuy" | "WillOnlyBuy",
): unknown {
  const matches = entry.fields.filter(
    (field) => field.label.toLowerCase() === label.toLowerCase(),
  );
  if (matches.length === 0) return { present: false };
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== label || field.type !== "list") return null;
  const baseItemIds: number[] = [];
  const opaqueSiblingFieldCounts: number[] = [];
  for (const child of field.value) {
    const baseItemMatches = child.fields.filter(
      (candidate) => candidate.label.toLowerCase() === "baseitem",
    );
    const baseItem = baseItemMatches[0];
    if (
      child.typeId !== AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID ||
      baseItemMatches.length !== 1 ||
      baseItem?.label !== "BaseItem" ||
      baseItem.type !== "int" ||
      typeof baseItem.value !== "number" ||
      !Number.isSafeInteger(baseItem.value) ||
      baseItem.value < 0
    ) return null;
    baseItemIds.push(baseItem.value);
    opaqueSiblingFieldCounts.push(child.fields.length - 1);
  }
  return {
    present: true,
    nativeType: "list",
    entryStructTypeId: AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
    baseItemNativeType: "int",
    baseItemIds,
    opaqueSiblingFieldCounts,
  };
}

function readStoreRestrictionsFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaStoreRestrictionsRawStorage {
  const raw = entry.typeId === 11
    ? readAreaStoreRestrictionsRawStorage({
        willNotBuy: readStoreRestrictionListFromEntry(entry, "WillNotBuy"),
        willOnlyBuy: readStoreRestrictionListFromEntry(entry, "WillOnlyBuy"),
      })
    : null;
  if (!raw) {
    throw mutationInvalid("Store restrictions source is outside the admitted native profile.", [
      `store:index=${sourceIndex}:restrictions:invalid_source_profile`,
    ]);
  }
  return raw;
}

function buildStoreRestrictionList(
  label: "WillNotBuy" | "WillOnlyBuy",
  baseItemIds: readonly number[],
): GffListField {
  return {
    label,
    type: "list",
    value: baseItemIds.map((value) => ({
      typeId: AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
      fields: [{ label: "BaseItem", type: "int", value }],
    })),
  };
}

function storeRestrictionListsEqual(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function insertCanonicalStoreRestrictionList(
  fields: readonly SupportedGffField[],
  field: GffListField,
): SupportedGffField[] {
  const followingLabels = field.label === "WillNotBuy"
    ? new Set(["WillOnlyBuy", "StoreList", "ID", "Comment"])
    : new Set(["StoreList", "ID", "Comment"]);
  const insertionIndex = fields.findIndex((candidate) => followingLabels.has(candidate.label));
  return insertionIndex < 0
    ? [...fields, field]
    : [...fields.slice(0, insertionIndex), field, ...fields.slice(insertionIndex)];
}

function mutateStoreRestrictionsFields(
  sourceStore: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaStoreRestrictionsMutation,
  baseFields: readonly SupportedGffField[],
): SupportedGffField[] {
  const source = readStoreRestrictionsFromEntry(sourceStore, sourceIndex);
  if (!areaStoreRestrictionsRawMatchesExpected(source, mutation.expectedValue)) {
    throw mutationInvalid("Store restrictions differ from retained provenance.", [
      `store:index=${sourceIndex}:restrictions:stale_storage`,
    ]);
  }
  const expectedTarget = {
    willNotBuy: mutation.expectedValue.willNotBuy.baseItemIds,
    willOnlyBuy: mutation.expectedValue.willOnlyBuy.baseItemIds,
  };
  if (areaStoreRestrictionTargetsEqual(expectedTarget, mutation.value)) {
    throw mutationInvalid("Store restrictions mutation must change at least one list.", [
      `store:index=${sourceIndex}:restrictions:unchanged`,
    ]);
  }

  let fields = [...baseFields];
  const pairs = [
    ["WillNotBuy", mutation.expectedValue.willNotBuy, mutation.value.willNotBuy],
    ["WillOnlyBuy", mutation.expectedValue.willOnlyBuy, mutation.value.willOnlyBuy],
  ] as const;
  for (const [label, expected, target] of pairs) {
    if (storeRestrictionListsEqual(expected.baseItemIds, target)) continue;
    const replacement = buildStoreRestrictionList(label, target);
    if (expected.present) {
      fields = fields.map((field) => field.label === label ? replacement : field);
    } else if (target.length > 0) {
      fields = insertCanonicalStoreRestrictionList(fields, replacement);
    }
  }
  return fields;
}

interface NativeStoreInventorySource {
  readonly raw: AreaStoreInventoryRawStorage;
  readonly entries: readonly (readonly GffListField["value"][number][])[];
}

function readStoreInventoryFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): NativeStoreInventorySource {
  const invalid = (): never => {
    throw mutationInvalid("Store inventory source is outside the admitted native profile.", [
      `store:index=${sourceIndex}:inventory:invalid_source_profile`,
    ]);
  };
  if (entry.typeId !== 11) return invalid();
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "storelist");
  const storeList = matches[0];
  if (matches.length !== 1 || storeList?.label !== "StoreList" || storeList.type !== "list" ||
    storeList.value.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) return invalid();
  let total = 0;
  const rawBuckets: Array<Readonly<{ bucketTypeId: number; entries: readonly unknown[] }>> = [];
  const sourceEntries: Array<readonly GffListField["value"][number][]> = [];
  for (const [bucketIndex, bucket] of storeList.value.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    if (bucket.typeId !== bucketTypeId) return invalid();
    if (bucket.fields.length === 0) {
      rawBuckets.push({ bucketTypeId, entries: [] });
      sourceEntries.push([]);
      continue;
    }
    const itemList = bucket.fields[0];
    if (bucket.fields.length !== 1 || itemList?.label !== "ItemList" ||
      itemList.type !== "list" || itemList.value.length === 0) return invalid();
    total += itemList.value.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return invalid();
    const rawEntries: unknown[] = [];
    for (const [itemIndex, item] of itemList.value.entries()) {
      if (item.typeId !== itemIndex || item.fields.some((field) => [
        "dropable", "droppable", "pickpocketable", "inventoryres",
      ].includes(field.label.toLowerCase()))) return invalid();
      const resRefMatches = item.fields.filter(
        (field) => field.label.toLowerCase() === "templateresref",
      );
      const resRef = resRefMatches[0];
      const baseItemMatches = item.fields.filter(
        (field) => field.label.toLowerCase() === "baseitem",
      );
      const baseItem = baseItemMatches[0];
      const xMatches = item.fields.filter(
        (field) => field.label.toLowerCase().replaceAll("_", "") === "reposposx",
      );
      const yMatches = item.fields.filter(
        (field) => field.label.toLowerCase().replaceAll("_", "") === "reposposy",
      );
      const infiniteMatches = item.fields.filter(
        (field) => field.label.toLowerCase() === "infinite",
      );
      const x = xMatches[0];
      const y = yMatches[0];
      const infinite = infiniteMatches[0];
      if (resRefMatches.length !== 1 || resRef?.label !== "TemplateResRef" ||
        resRef.type !== "resref" || typeof resRef.value !== "string" ||
        !/^[A-Za-z0-9_]{1,16}$/u.test(resRef.value) ||
        baseItemMatches.length !== 1 || baseItem?.label !== "BaseItem" ||
        baseItem.type !== "int" || typeof baseItem.value !== "number" ||
        !Number.isSafeInteger(baseItem.value) || baseItem.value < 0 ||
        baseItem.value > 0x7fff_ffff || xMatches.length !== 1 ||
        x?.label !== "Repos_PosX" || x.type !== "word" ||
        typeof x.value !== "number" || !Number.isSafeInteger(x.value) ||
        yMatches.length !== 1 || y?.label !== "Repos_Posy" || y.type !== "word" ||
        typeof y.value !== "number" || !Number.isSafeInteger(y.value) ||
        infiniteMatches.length > 1 || (infinite !== undefined &&
          (infinite.label !== "Infinite" || infinite.type !== "byte" || infinite.value !== 1))) {
        return invalid();
      }
      const tailLength = infinite ? 3 : 2;
      if (item.fields[item.fields.length - tailLength] !== x ||
        item.fields[item.fields.length - tailLength + 1] !== y ||
        (infinite && item.fields[item.fields.length - 1] !== infinite)) return invalid();
      rawEntries.push({
        sourceIndex: itemIndex,
        resRef: resRef.value,
        baseItemId: baseItem.value,
        x: x.value,
        y: y.value,
        infinite: infinite !== undefined,
      });
    }
    rawBuckets.push({ bucketTypeId, entries: rawEntries });
    sourceEntries.push(itemList.value);
  }
  const raw = readAreaStoreInventoryRawStorage({ buckets: rawBuckets });
  if (!raw) return invalid();
  return Object.freeze({ raw, entries: Object.freeze(sourceEntries) });
}

function mutateStoreInventoryFields(
  sourceStore: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaStoreInventoryMutation,
  baseFields: readonly SupportedGffField[],
): SupportedGffField[] {
  const source = readStoreInventoryFromEntry(sourceStore, sourceIndex);
  if (!areaStoreInventoryRawMatchesExpected(source.raw, mutation.expectedBuckets)) {
    throw mutationInvalid("Store inventory differs from retained provenance.", [
      `store:index=${sourceIndex}:inventory:stale_storage`,
    ]);
  }
  const packed = packAreaStoreInventoryBuckets(mutation.expectedBuckets, mutation.buckets);
  if (!packed) {
    throw mutationInvalid("Store inventory cannot be packed into the native repository budget.", [
      `store:index=${sourceIndex}:inventory:packing_failed`,
    ]);
  }
  const replacement: GffListField = {
    label: "StoreList",
    type: "list",
    value: packed.map((bucket, bucketIndex) => ({
      typeId: bucket.bucketTypeId,
      fields: bucket.entries.length === 0
        ? []
        : [{
            label: "ItemList",
            type: "list" as const,
            value: bucket.entries.map((entry, targetIndex) => {
              const retained = source.entries[bucketIndex]?.[entry.sourceIndex];
              if (!retained) {
                throw mutationInvalid("Store inventory retained source is unavailable.", [
                  `store:index=${sourceIndex}:inventory:stale_storage`,
                ]);
              }
              const fields = retained.fields.filter((field) => ![
                "reposposx", "reposposy", "infinite",
              ].includes(field.label.toLowerCase().replaceAll("_", "")));
              return {
                typeId: targetIndex,
                fields: [
                  ...fields,
                  { label: "Repos_PosX", type: "word" as const, value: entry.x },
                  { label: "Repos_Posy", type: "word" as const, value: entry.y },
                  ...(entry.infinite
                    ? [{ label: "Infinite", type: "byte" as const, value: 1 }]
                    : []),
                ],
              };
            }),
          }],
    })),
  };
  return baseFields.map((field) => field.label === "StoreList" ? replacement : field);
}

function mutateObjectPropertyEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaObjectPropertyMutation,
): GffListField["value"][number] {
  if (mutation.kind === "waypoint") {
    const templateResRefUpdated = mutation.templateResRef
      ? mutateWaypointTemplateResRefEntry(
          entry,
          mutation.sourceIndex,
          mutation.templateResRef,
        )
      : entry;
    const localizedNameUpdated = mutation.localizedName
      ? mutateWaypointLocalizedNameEntry(
          templateResRefUpdated,
          mutation.sourceIndex,
          mutation.localizedName,
        )
      : templateResRefUpdated;
    const descriptionUpdated = mutation.description
      ? mutateWaypointDescriptionEntry(
          localizedNameUpdated,
          mutation.sourceIndex,
          mutation.description,
        )
      : localizedNameUpdated;
    const mapNoteUpdated = mutation.mapNote
      ? mutateWaypointMapNoteEntry(
          descriptionUpdated,
          mutation.sourceIndex,
          mutation.mapNote,
        )
      : descriptionUpdated;
    const appearanceUpdated = mutation.appearance
      ? mutateWaypointAppearanceEntry(
          mapNoteUpdated,
          mutation.sourceIndex,
          mutation.appearance,
        )
      : mapNoteUpdated;
    const variablesUpdated = mutation.variables
      ? {
          typeId: appearanceUpdated.typeId,
          fields: mutateWaypointVariableFields(
            appearanceUpdated,
            mutation.sourceIndex,
            mutation.variables,
            appearanceUpdated.fields,
          ),
        }
      : appearanceUpdated;
    return mutation.tag
      ? mutateExactObjectTagEntry(
          variablesUpdated,
          mutation.sourceIndex,
          mutation.tag,
          "waypoint",
          "Waypoint",
        )
      : variablesUpdated;
  }
  if (mutation.kind === "trigger") {
    const templateResRefUpdated = mutation.templateResRef
      ? mutateTriggerTemplateResRefEntry(
          entry,
          mutation.sourceIndex,
          mutation.templateResRef,
        )
      : entry;
    const localizedNameUpdated = mutation.localizedName
      ? mutateTriggerLocalizedNameEntry(
          templateResRefUpdated,
          mutation.sourceIndex,
          mutation.localizedName,
        )
      : templateResRefUpdated;
    const scriptsUpdated = mutation.scripts
      ? mutateTriggerScriptResRefsEntry(
          localizedNameUpdated,
          mutation.sourceIndex,
          mutation.scripts,
        )
      : localizedNameUpdated;
    const transitionStorageUpdated = mutation.transitionStorage
      ? mutateTriggerTransitionStorageEntry(
          scriptsUpdated,
          mutation.sourceIndex,
          mutation.transitionStorage,
        )
      : scriptsUpdated;
    return mutation.tag
      ? mutateExactObjectTagEntry(
          transitionStorageUpdated,
          mutation.sourceIndex,
          mutation.tag,
          "trigger",
          "Trigger",
        )
      : transitionStorageUpdated;
  }
  if (mutation.kind === "encounter") {
    const templateResRefUpdated = mutation.templateResRef
      ? mutateEncounterTemplateResRefEntry(
          entry,
          mutation.sourceIndex,
          mutation.templateResRef,
        )
      : entry;
    const localizedNameUpdated = mutation.localizedName
      ? mutateEncounterLocalizedNameEntry(
          templateResRefUpdated,
          mutation.sourceIndex,
          mutation.localizedName,
        )
      : templateResRefUpdated;
    const tagUpdated = mutation.tag
      ? mutateExactObjectTagEntry(
          localizedNameUpdated,
          mutation.sourceIndex,
          mutation.tag,
          "encounter",
          "Encounter",
        )
      : localizedNameUpdated;
    const activeUpdated = mutation.active
      ? mutateEncounterActiveEntry(tagUpdated, mutation.sourceIndex, mutation.active)
      : tagUpdated;
    const playerOnlyUpdated = mutation.playerOnly
      ? mutateEncounterPlayerOnlyEntry(
          activeUpdated,
          mutation.sourceIndex,
          mutation.playerOnly,
        )
      : activeUpdated;
    const resetUpdated = mutation.reset
      ? mutateEncounterResetEntry(
          playerOnlyUpdated,
          mutation.sourceIndex,
          mutation.reset,
        )
      : playerOnlyUpdated;
    const resetTimeUpdated = mutation.resetTime
      ? mutateEncounterResetTimeEntry(
          resetUpdated,
          mutation.sourceIndex,
          mutation.resetTime,
        )
      : resetUpdated;
    const spawnOptionUpdated = mutation.spawnOption
      ? mutateEncounterSpawnOptionEntry(
          resetTimeUpdated,
          mutation.sourceIndex,
          mutation.spawnOption,
        )
      : resetTimeUpdated;
    const respawnsUpdated = mutation.respawns
      ? mutateEncounterRespawnsEntry(
          spawnOptionUpdated,
          mutation.sourceIndex,
          mutation.respawns,
        )
      : spawnOptionUpdated;
    const creatureCountsUpdated = mutation.creatureCounts
      ? mutateEncounterCreatureCountEntry(
          respawnsUpdated,
          mutation.sourceIndex,
          mutation.creatureCounts,
        )
      : respawnsUpdated;
    const scriptsUpdated = mutation.scripts
      ? mutateEncounterScriptResRefsEntry(
          creatureCountsUpdated,
          mutation.sourceIndex,
          mutation.scripts,
        )
      : creatureCountsUpdated;
    const factionUpdated = mutation.faction
      ? mutateEncounterFactionEntry(
          scriptsUpdated,
          mutation.sourceIndex,
          mutation.faction,
        )
      : scriptsUpdated;
    const difficultyUpdated = mutation.difficulty
      ? mutateEncounterDifficultyEntry(
          factionUpdated,
          mutation.sourceIndex,
          mutation.difficulty,
        )
      : factionUpdated;
    const creatureListUpdated = mutation.creatureList
      ? mutateEncounterCreatureListEntry(
          difficultyUpdated,
          mutation.sourceIndex,
          mutation.creatureList,
        )
      : difficultyUpdated;
    const spawnPointsUpdated = mutation.spawnPoints
      ? mutateEncounterSpawnPointListEntry(
          creatureListUpdated,
          mutation.sourceIndex,
          mutation.spawnPoints,
        )
      : creatureListUpdated;
    if (!mutation.variables) return spawnPointsUpdated;
    return {
      typeId: spawnPointsUpdated.typeId,
      fields: mutateEncounterVariableFields(
        spawnPointsUpdated,
        mutation.sourceIndex,
        mutation.variables,
        spawnPointsUpdated.fields,
      ),
    };
  }
  if (mutation.kind === "item") {
    const baseAppearanceUpdated = mutation.baseAppearance
      ? mutateItemBaseAppearanceEntry(entry, mutation.sourceIndex, mutation.baseAppearance)
      : entry;
    const templateResRefUpdated = mutation.templateResRef
      ? mutateItemTemplateResRefEntry(
          baseAppearanceUpdated,
          mutation.sourceIndex,
          mutation.templateResRef,
        )
      : baseAppearanceUpdated;
    const tagUpdated = mutation.tag
      ? mutateItemTagEntry(templateResRefUpdated, mutation.sourceIndex, mutation.tag)
      : templateResRefUpdated;
    const stateUpdated = mutation.instanceState
      ? mutateItemInstanceStateEntry(tagUpdated, mutation.sourceIndex, mutation.instanceState)
      : tagUpdated;
    const localizedUpdated = mutation.localizedStrings
      ? (() => {
          const replacements = new Map<string, SupportedGffField>();
          for (const localizedString of mutation.localizedStrings!) {
            const mapping = AREA_ITEM_LOCALIZED_STRING_MUTATION_FIELDS.find(
              (candidate) => candidate.field === localizedString.field,
            )!;
            replacements.set(
              localizedString.field,
              mutateInlineAsciiLocalizedStringField(
                stateUpdated,
                mutation.sourceIndex,
                localizedString,
                "item",
                "Item",
                mapping.maxBytes,
                true,
              ),
            );
          }
          return {
            typeId: stateUpdated.typeId,
            fields: stateUpdated.fields.map((field) => replacements.get(field.label) ?? field),
          };
        })()
      : stateUpdated;
    let fields = localizedUpdated.fields;
    if (mutation.variables) {
      fields = mutateItemVariableFields(
        localizedUpdated,
        mutation.sourceIndex,
        mutation.variables,
        fields,
      );
    }
    if (mutation.propertyList) {
      fields = mutateItemPropertyListFields(
        entry,
        mutation.sourceIndex,
        mutation.propertyList,
        fields,
      );
    }
    if (mutation.inventory) {
      fields = mutateItemInventoryFields(
        entry,
        mutation.sourceIndex,
        mutation.inventory,
        fields,
      );
    }
    if (mutation.visualTransform) {
      fields = mutateItemVisualTransformFields(
        entry,
        mutation.sourceIndex,
        mutation.visualTransform,
        fields,
      );
    }
    return fields === localizedUpdated.fields
      ? localizedUpdated
      : { typeId: localizedUpdated.typeId, fields };
  }
  if (mutation.kind === "store") {
    const commerceUpdated = mutation.commerce
      ? mutateStoreCommerceEntry(entry, mutation.sourceIndex, mutation.commerce)
      : entry;
    const scriptsUpdated = mutation.scripts
      ? mutateStoreScriptResRefsEntry(commerceUpdated, mutation.sourceIndex, mutation.scripts)
      : commerceUpdated;
    let fields = scriptsUpdated.fields;
    if (mutation.variables) {
      fields = mutateStoreVariableFields(
        entry,
        mutation.sourceIndex,
        mutation.variables,
        fields,
      );
    }
    if (mutation.restrictions) {
      fields = mutateStoreRestrictionsFields(
        entry,
        mutation.sourceIndex,
        mutation.restrictions,
        fields,
      );
    }
    if (mutation.inventory) {
      fields = mutateStoreInventoryFields(
        entry,
        mutation.sourceIndex,
        mutation.inventory,
        fields,
      );
    }
    return fields === scriptsUpdated.fields
      ? scriptsUpdated
      : { typeId: scriptsUpdated.typeId, fields };
  }
  if (mutation.kind === "creature") {
    let fields = entry.fields;
    if (mutation.tag) {
      const tag = mutateCreatureTagField(entry, mutation.sourceIndex, mutation.tag);
      fields = fields.map((field) => field.label === "Tag" ? tag : field);
    }
    if (mutation.conversation) {
      const conversation = mutateCreatureConversationField(
        entry,
        mutation.sourceIndex,
        mutation.conversation,
      );
      fields = fields.map(
        (field) => field.label === "Conversation" ? conversation : field,
      );
    }
    if (mutation.interruptable) {
      const interruptable = mutateCreatureInterruptableField(
        entry,
        mutation.sourceIndex,
        mutation.interruptable,
      );
      fields = fields.map(
        (field) => field.label === "Interruptable" ? interruptable : field,
      );
    }
    if (mutation.advancedFlags) {
      const replacements = mutateCreatureAdvancedFlagFields(
        entry,
        mutation.sourceIndex,
        mutation.advancedFlags,
      );
      fields = fields.map((field) => replacements.get(field.label) ?? field);
    }
    if (mutation.bodyBag) {
      const bodyBag = mutateCreatureBodyBagField(entry, mutation.sourceIndex, mutation.bodyBag);
      fields = fields.map((field) => field.label === "BodyBag" ? bodyBag : field);
    }
    if (mutation.decayTime) {
      const decayTime = mutateCreatureDecayTimeField(
        entry,
        mutation.sourceIndex,
        mutation.decayTime,
      );
      fields = fields.map((field) => field.label === "DecayTime" ? decayTime : field);
    }
    if (mutation.appearance) {
      const appearance = mutateCreatureAppearanceField(
        entry,
        mutation.sourceIndex,
        mutation.appearance,
      );
      fields = fields.map(
        (field) => field.label === "Appearance_Type" ? appearance : field,
      );
    }
    if (mutation.gender) {
      const gender = mutateCreatureGenderField(
        entry,
        mutation.sourceIndex,
        mutation.gender,
      );
      fields = fields.map((field) => field.label === "Gender" ? gender : field);
    }
    if (mutation.perceptionRange) {
      const perceptionRange = mutateCreaturePerceptionRangeField(
        entry,
        mutation.sourceIndex,
        mutation.perceptionRange,
      );
      fields = fields.map(
        (field) => field.label === "PerceptionRange" ? perceptionRange : field,
      );
    }
    if (mutation.walkRate) {
      const walkRate = mutateCreatureWalkRateField(
        entry,
        mutation.sourceIndex,
        mutation.walkRate,
      );
      fields = fields.map((field) => field.label === "WalkRate" ? walkRate : field);
    }
    if (mutation.soundSetFile) {
      const soundSetFile = mutateCreatureSoundSetFileField(
        entry,
        mutation.sourceIndex,
        mutation.soundSetFile,
      );
      fields = fields.map(
        (field) => field.label === "SoundSetFile" ? soundSetFile : field,
      );
    }
    if (mutation.startingPackage) {
      const startingPackage = mutateCreatureStartingPackageField(
        entry,
        mutation.sourceIndex,
        mutation.startingPackage,
      );
      fields = fields.map(
        (field) => field.label === "StartingPackage" ? startingPackage : field,
      );
    }
    if (mutation.skillList) {
      const skillList = mutateCreatureSkillListField(
        entry,
        mutation.sourceIndex,
        mutation.skillList,
      );
      fields = fields.map((field) => field.label === "SkillList" ? skillList : field);
    }
    if (mutation.featList) {
      const featList = mutateCreatureFeatListField(
        entry,
        mutation.sourceIndex,
        mutation.featList,
      );
      fields = fields.map((field) => field.label === "FeatList" ? featList : field);
    }
    if (mutation.specialAbilityList) {
      const specialAbilityList = mutateCreatureSpecialAbilityListField(
        entry,
        mutation.sourceIndex,
        mutation.specialAbilityList,
      );
      fields = fields.map((field) =>
        field.label === "SpecAbilityList" ? specialAbilityList : field);
    }
    if (mutation.variables) {
      fields = mutateCreatureVariableFields(
        entry,
        mutation.sourceIndex,
        mutation.variables,
        fields,
      );
    }
    if (mutation.classLevels) {
      const classList = mutateCreatureClassLevelField(
        entry,
        mutation.sourceIndex,
        mutation.classLevels,
      );
      fields = fields.map((field) => field.label === "ClassList" ? classList : field);
    }
    if (mutation.classIdentity) {
      const classIdentityFields = mutateCreatureClassIdentityFields(
        entry,
        mutation.sourceIndex,
        mutation.classIdentity,
      );
      fields = fields.map((field) => {
        if (field.label === "ClassList") return classIdentityFields.classList;
        if (field.label === "StartingPackage") return classIdentityFields.startingPackage;
        return field;
      });
    }
    if (mutation.classSlotResize) {
      const classSlotResizeFields = mutateCreatureClassSlotResizeFields(
        entry,
        mutation.sourceIndex,
        mutation.classSlotResize,
      );
      fields = fields.map((field) => {
        if (field.label === "ClassList") return classSlotResizeFields.classList;
        if (field.label === "StartingPackage") return classSlotResizeFields.startingPackage;
        return field;
      });
    }
    if (mutation.phenotype) {
      const phenotype = mutateCreaturePhenotypeField(
        entry,
        mutation.sourceIndex,
        mutation.phenotype,
      );
      fields = fields.map((field) => field.label === "Phenotype" ? phenotype : field);
    }
    if (mutation.portrait) {
      const portrait = mutateCreaturePortraitField(
        entry,
        mutation.sourceIndex,
        mutation.portrait,
      );
      fields = fields.map((field) => field.label === "PortraitId" ? portrait : field);
    }
    if (mutation.challengeRating) {
      const challengeRating = mutateCreatureChallengeRatingField(
        entry,
        mutation.sourceIndex,
        mutation.challengeRating,
      );
      fields = fields.map(
        (field) => field.label === "ChallengeRating" ? challengeRating : field,
      );
    }
    if (mutation.abilityScores) {
      const abilityScores = mutateCreatureAbilityScoreFields(
        entry,
        mutation.sourceIndex,
        mutation.abilityScores,
      );
      fields = fields.map((field) => abilityScores.get(field.label) ?? field);
    }
    if (mutation.appearanceColors) {
      const appearanceColors = mutateCreatureAppearanceColorFields(
        entry,
        mutation.sourceIndex,
        mutation.appearanceColors,
      );
      fields = fields.map((field) => appearanceColors.get(field.label) ?? field);
    }
    if (mutation.bodyParts) {
      const bodyParts = mutateCreatureBodyPartFields(
        entry,
        mutation.sourceIndex,
        mutation.bodyParts,
      );
      fields = fields.map((field) => bodyParts.get(field.label) ?? field);
    }
    if (mutation.appendages) {
      const appendages = mutateCreatureAppendageFields(
        entry,
        mutation.sourceIndex,
        mutation.appendages,
      );
      fields = fields.map((field) => appendages.get(field.label) ?? field);
    }
    if (mutation.hitPoints) {
      const hitPoints = mutateCreatureHitPointFields(
        entry,
        mutation.sourceIndex,
        mutation.hitPoints,
      );
      fields = fields.map((field) => hitPoints.get(field.label) ?? field);
    }
    if (mutation.naturalArmorClass) {
      const naturalArmorClass = mutateCreatureNaturalArmorClassField(
        entry,
        mutation.sourceIndex,
        mutation.naturalArmorClass,
      );
      fields = fields.map(
        (field) => field.label === "NaturalAC" ? naturalArmorClass : field,
      );
    }
    if (mutation.savingThrowBonuses) {
      const savingThrowBonuses = mutateCreatureSavingThrowBonusFields(
        entry,
        mutation.sourceIndex,
        mutation.savingThrowBonuses,
      );
      fields = fields.map((field) => savingThrowBonuses.get(field.label) ?? field);
    }
    if (mutation.alignment) {
      const alignment = mutateCreatureAlignmentFields(
        entry,
        mutation.sourceIndex,
        mutation.alignment,
      );
      fields = fields.map((field) => alignment.get(field.label) ?? field);
    }
    if (mutation.faction) {
      const faction = mutateCreatureFactionField(
        entry,
        mutation.sourceIndex,
        mutation.faction,
      );
      fields = fields.map(
        (field) => field.label === "FactionID" ? faction : field,
      );
    }
    if (mutation.templateResRef) {
      const templateResRef = mutateCreatureTemplateResRefField(
        entry,
        mutation.sourceIndex,
        mutation.templateResRef,
      );
      fields = fields.map(
        (field) => field.label === "TemplateResRef" ? templateResRef : field,
      );
    }
    if (mutation.specialIdentityStrings) {
      for (const key of ["subrace", "deity"] as const) {
        const identityMutation = mutation.specialIdentityStrings[key];
        if (!identityMutation) continue;
        const label = key === "subrace" ? "Subrace" : "Deity";
        const replacement = mutateCreatureSpecialIdentityStringField(
          entry,
          mutation.sourceIndex,
          label,
          identityMutation,
        );
        fields = fields.map((field) => field.label === label ? replacement : field);
      }
    }
    if (mutation.scripts) {
      const replacements = new Map<string, SupportedGffField>();
      for (const script of mutation.scripts) {
        replacements.set(
          script.field,
          mutateCreatureScriptResRefField(entry, mutation.sourceIndex, script),
        );
      }
      fields = fields.map((field) => replacements.get(field.label) ?? field);
    }
    if (mutation.localizedStrings) {
      const replacements = new Map<string, SupportedGffField>();
      for (const localizedString of mutation.localizedStrings) {
        const mapping = AREA_CREATURE_NAME_LOCALIZED_STRING_MUTATION_FIELDS.find(
          (candidate) => candidate.field === localizedString.field,
        )!;
        replacements.set(
          localizedString.field,
          mutateInlineAsciiLocalizedStringField(
            entry,
            mutation.sourceIndex,
            localizedString,
            "creature",
            "Creature",
            mapping.maxBytes,
            true,
          ),
        );
      }
      fields = fields.map((field) => replacements.get(field.label) ?? field);
    }
    if (mutation.inventory) {
      fields = mutateCreatureInventoryFields(
        entry,
        mutation.sourceIndex,
        mutation.inventory,
        fields,
      );
    }
    if (mutation.equipment) {
      fields = mutateCreatureEquipmentFields(
        entry,
        mutation.sourceIndex,
        mutation.equipment,
        fields,
      );
    }
    return {
      typeId: entry.typeId,
      fields,
    };
  }
  const replacements = new Map<string, SupportedGffField>();
  if (mutation.tag) {
    replacements.set(
      "Tag",
      mutatePlaceableTagField(entry, mutation.sourceIndex, mutation.tag),
    );
  }
  for (const localizedString of mutation.localizedStrings ?? []) {
    replacements.set(
      localizedString.field,
      mutatePlaceableLocalizedStringField(
        entry,
        mutation.sourceIndex,
        localizedString,
      ),
    );
  }
  if (mutation.expectedOnUsed !== undefined && mutation.onUsed !== undefined) {
    replacements.set(
      "OnUsed",
      mutatePlaceableResRefField(entry, mutation.sourceIndex, "OnUsed", mutation.expectedOnUsed, mutation.onUsed),
    );
  }
  for (const script of mutation.scripts ?? []) {
    replacements.set(
      script.field,
      mutatePlaceableResRefField(
        entry,
        mutation.sourceIndex,
        script.field,
        script.expectedResRef,
        script.resRef,
      ),
    );
  }
  for (const script of mutation.trapScripts ?? []) {
    replacements.set(
      script.field,
      mutatePlaceableResRefField(
        entry,
        mutation.sourceIndex,
        script.field,
        script.expectedResRef,
        script.resRef,
      ),
    );
  }
  for (const lockField of mutation.lockFields ?? []) {
    replacements.set(
      lockField.field,
      mutatePlaceableLockByteField(
        entry,
        mutation.sourceIndex,
        lockField.field,
        lockField.expectedValue,
        lockField.value,
      ),
    );
  }
  for (const byteField of mutation.basicByteFields ?? []) {
    replacements.set(
      byteField.field,
      mutatePlaceableBasicByteField(entry, mutation.sourceIndex, byteField),
    );
  }
  if (mutation.conversation) {
    replacements.set(
      "Conversation",
      mutatePlaceableResRefField(
        entry,
        mutation.sourceIndex,
        "Conversation",
        mutation.conversation.expectedResRef,
        mutation.conversation.resRef,
      ),
    );
  }
  if (mutation.templateResRef) {
    replacements.set(
      "TemplateResRef",
      mutatePlaceableResRefField(
        entry,
        mutation.sourceIndex,
        "TemplateResRef",
        mutation.templateResRef.expectedResRef,
        mutation.templateResRef.resRef,
      ),
    );
  }
  if (mutation.interruptable) {
    replacements.set(
      "Interruptable",
      mutatePlaceableInterruptableField(entry, mutation.sourceIndex, mutation.interruptable),
    );
  }
  for (const trapField of mutation.trapFields ?? []) {
    replacements.set(
      trapField.field,
      mutatePlaceableTrapByteField(entry, mutation.sourceIndex, trapField),
    );
  }
  if (mutation.animationState) {
    replacements.set(
      "AnimationState",
      mutatePlaceableAnimationStateField(entry, mutation.sourceIndex, mutation.animationState),
    );
  }
  if (mutation.appearance) {
    replacements.set(
      "Appearance",
      mutatePlaceableAppearanceField(entry, mutation.sourceIndex, mutation.appearance),
    );
  }
  if (mutation.trapType) {
    replacements.set(
      "TrapType",
      mutatePlaceableTrapTypeField(entry, mutation.sourceIndex, mutation.trapType),
    );
  }
  if (mutation.bodyBag) {
    replacements.set(
      "BodyBag",
      mutatePlaceableBodyBagField(entry, mutation.sourceIndex, mutation.bodyBag),
    );
  }
  if (mutation.portrait) {
    replacements.set(
      "PortraitId",
      mutatePlaceablePortraitField(entry, mutation.sourceIndex, mutation.portrait),
    );
  }
  if (mutation.faction) {
    replacements.set(
      "Faction",
      mutatePlaceableFactionField(entry, mutation.sourceIndex, mutation.faction),
    );
  }
  if (mutation.hitPoints) {
    replacements.set(
      "HP",
      mutatePlaceableShortField(
        entry,
        mutation.sourceIndex,
        "HP",
        mutation.hitPoints.expectedHitPoints,
        mutation.hitPoints.hitPoints,
      ),
    );
    replacements.set(
      "CurrentHP",
      mutatePlaceableShortField(
        entry,
        mutation.sourceIndex,
        "CurrentHP",
        mutation.hitPoints.expectedCurrentHitPoints,
        mutation.hitPoints.currentHitPoints,
      ),
    );
  }
  if (mutation.keyName) {
    replacements.set(
      "KeyName",
      mutatePlaceableKeyNameField(entry, mutation.sourceIndex, mutation.keyName),
    );
  }
  if (mutation.expectedStatic !== undefined && mutation.static !== undefined) {
    replacements.set(
      "Static",
      mutatePlaceableBooleanByteField(
        entry,
        mutation.sourceIndex,
        "Static",
        mutation.expectedStatic,
        mutation.static,
      ),
    );
  }
  if (mutation.expectedUseable !== undefined && mutation.useable !== undefined) {
    replacements.set(
      "Useable",
      mutatePlaceableBooleanByteField(
        entry,
        mutation.sourceIndex,
        "Useable",
        mutation.expectedUseable,
        mutation.useable,
      ),
    );
  }
  if (mutation.expectedPlot !== undefined && mutation.plot !== undefined) {
    replacements.set(
      "Plot",
      mutatePlaceableBooleanByteField(
        entry,
        mutation.sourceIndex,
        "Plot",
        mutation.expectedPlot,
        mutation.plot,
      ),
    );
  }
  if (
    mutation.expectedHasInventory !== undefined &&
    mutation.hasInventory !== undefined
  ) {
    replacements.set(
      "HasInventory",
      mutatePlaceableBooleanByteField(
        entry,
        mutation.sourceIndex,
        "HasInventory",
        mutation.expectedHasInventory,
        mutation.hasInventory,
      ),
    );
  }
  let fields = entry.fields.map((candidate) => replacements.get(candidate.label) ?? candidate);
  if (mutation.inventory) {
    fields = mutatePlaceableInventoryFields(entry, mutation.sourceIndex, mutation.inventory, fields);
  }
  if (mutation.variables) {
    fields = mutatePlaceableVariableFields(entry, mutation.sourceIndex, mutation.variables, fields);
  }
  return {
    typeId: entry.typeId,
    fields,
  };
}

function mutatePlaceableVariableFields(
  sourcePlaceable: GffListField["value"][number],
  placeableIndex: number,
  mutation: ExistingAreaPlaceableVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  return mutateAuroraVariableFields(
    sourcePlaceable,
    placeableIndex,
    mutation,
    baseFields,
    "placeable",
    "Placeable",
  );
}

function mutateCreatureVariableFields(
  sourceCreature: GffListField["value"][number],
  creatureIndex: number,
  mutation: ExistingAreaCreatureVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  return mutateAuroraVariableFields(
    sourceCreature,
    creatureIndex,
    mutation,
    baseFields,
    "creature",
    "Creature",
  );
}

function mutateEncounterVariableFields(
  sourceEncounter: GffListField["value"][number],
  encounterIndex: number,
  mutation: ExistingAreaEncounterVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  if (sourceEncounter.typeId !== 7) {
    throw mutationInvalid("Encounter variable mutation requires one type-7 native Encounter struct.", [
      `encounter:index=${encounterIndex}:struct_type=${sourceEncounter.typeId}`,
    ]);
  }
  return mutateAuroraVariableFields(
    sourceEncounter,
    encounterIndex,
    mutation,
    baseFields,
    "encounter",
    "Encounter",
  );
}

function mutateWaypointVariableFields(
  sourceWaypoint: GffListField["value"][number],
  waypointIndex: number,
  mutation: ExistingAreaWaypointVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  if (sourceWaypoint.typeId !== 5) {
    throw mutationInvalid("Waypoint variable mutation requires one type-5 native Waypoint struct.", [
      `waypoint:index=${waypointIndex}:struct_type=${sourceWaypoint.typeId}`,
    ]);
  }
  return mutateAuroraVariableFields(
    sourceWaypoint,
    waypointIndex,
    mutation,
    baseFields,
    "waypoint",
    "Waypoint",
  );
}

function mutateEncounterCreatureListEntry(
  sourceEncounter: GffListField["value"][number],
  encounterIndex: number,
  mutation:
    | ExistingAreaEncounterCreatureListMutation
    | ExistingAreaEncounterCreatureListResolvedMutation,
): GffListField["value"][number] {
  let resolvedMutation: ExistingAreaEncounterCreatureListResolvedMutation;
  try {
    resolvedMutation = parseAreaEncounterCreatureListResolvedMutation(mutation);
  } catch (error) {
    throw mutationInvalid(
      "Encounter CreatureList mutation pair is invalid.",
      [
        `encounter:index=${encounterIndex}:CreatureList:${
          error instanceof Error ? error.message : "invalid"
        }`,
      ],
    );
  }
  if (sourceEncounter.typeId !== 7) {
    throw mutationInvalid(
      "Encounter CreatureList mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${encounterIndex}:struct_type=${sourceEncounter.typeId}`],
    );
  }
  const matches = sourceEncounter.fields.filter(
    (field) => field.label.toLowerCase() === "creaturelist",
  );
  const sourceList = matches[0];
  if (
    matches.length !== 1
    || sourceList?.label !== "CreatureList"
    || sourceList.type !== "list"
  ) {
    throw mutationInvalid(
      "Encounter CreatureList mutation requires one canonical native list.",
      [
        `encounter:index=${encounterIndex}:CreatureList:count=${matches.length}:label=${sourceList?.label ?? "missing"}:type=${sourceList?.type ?? "missing"}`,
      ],
    );
  }
  const actualEntries = readExactEncounterCreatureListSourceEntries(
    sourceList,
    encounterIndex,
  );
  if (!areaEncounterCreatureListEntriesEqual(actualEntries, resolvedMutation.expectedEntries)) {
    throw mutationInvalid(
      "Native Encounter CreatureList differs from retained provenance.",
      [`encounter:index=${encounterIndex}:CreatureList:stale`],
    );
  }
  const targetList: GffListField = {
    label: "CreatureList",
    type: "list",
    value: resolvedMutation.entries.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Appearance", type: "int" as const, value: entry.appearance },
        { label: "CR", type: "float" as const, value: entry.challengeRating },
        { label: "ResRef", type: "resref" as const, value: entry.resRef },
        { label: "SingleSpawn", type: "byte" as const, value: entry.singleSpawnByte },
      ],
    })),
  };
  return {
    typeId: sourceEncounter.typeId,
    fields: sourceEncounter.fields.map((field) => field === sourceList ? targetList : field),
  };
}

function readExactEncounterCreatureListSourceEntries(
  sourceList: GffListField,
  encounterIndex: number,
): readonly AreaEncounterCreatureListSourceEntry[] {
  const expectedEntries = sourceList.value.map((entry, sourceIndex) => {
    const [appearance, challengeRating, resRef, singleSpawn] = entry.fields;
    if (
      entry.typeId !== 0
      || entry.fields.length !== 4
      || appearance?.label !== "Appearance"
      || appearance.type !== "int"
      || challengeRating?.label !== "CR"
      || challengeRating.type !== "float"
      || resRef?.label !== "ResRef"
      || resRef.type !== "resref"
      || singleSpawn?.label !== "SingleSpawn"
      || singleSpawn.type !== "byte"
    ) {
      throw mutationInvalid(
        "Encounter CreatureList entry differs from the exact native schema.",
        [`encounter:index=${encounterIndex}:CreatureList:entry=${sourceIndex}:schema`],
      );
    }
    return {
      sourceIndex,
      appearance: appearance.value,
      challengeRating: challengeRating.value,
      resRef: resRef.value,
      singleSpawnByte: singleSpawn.value,
    };
  });
  try {
    return parseAreaEncounterCreatureListProvenance({ expectedEntries }).expectedEntries;
  } catch (error) {
    throw mutationInvalid(
      "Encounter CreatureList entry value differs from the admitted native domain.",
      [
        `encounter:index=${encounterIndex}:CreatureList:${error instanceof Error ? error.message : "invalid_value"}`,
      ],
    );
  }
}

function mutateEncounterSpawnPointListEntry(
  sourceEncounter: GffListField["value"][number],
  encounterIndex: number,
  mutation: ExistingAreaEncounterSpawnPointListMutation,
): GffListField["value"][number] {
  if (sourceEncounter.typeId !== 7) {
    throw mutationInvalid(
      "Encounter SpawnPointList mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${encounterIndex}:struct_type=${sourceEncounter.typeId}`],
    );
  }
  const matches = sourceEncounter.fields.filter(
    (field) => field.label.toLowerCase() === "spawnpointlist",
  );
  const sourceList = matches[0];
  if (
    matches.length !== 1
    || sourceList?.label !== "SpawnPointList"
    || sourceList.type !== "list"
  ) {
    throw mutationInvalid(
      "Encounter SpawnPointList mutation requires one canonical native list.",
      [
        `encounter:index=${encounterIndex}:SpawnPointList:count=${matches.length}:label=${sourceList?.label ?? "missing"}:type=${sourceList?.type ?? "missing"}`,
      ],
    );
  }
  const actualEntries = readExactEncounterSpawnPointSourceEntries(sourceList, encounterIndex);
  if (!areaEncounterSpawnPointSourceEntriesEqual(actualEntries, mutation.expectedEntries)) {
    throw mutationInvalid(
      "Native Encounter SpawnPointList differs from retained provenance.",
      [`encounter:index=${encounterIndex}:SpawnPointList:stale`],
    );
  }
  const targetList: GffListField = {
    label: "SpawnPointList",
    type: "list",
    value: mutation.entries.map((entry) => ({
      typeId: 2,
      fields: [
        { label: "X", type: "float" as const, value: entry.nativeX },
        { label: "Y", type: "float" as const, value: entry.nativeY },
        { label: "Z", type: "float" as const, value: entry.nativeZ },
        { label: "Orientation", type: "float" as const, value: entry.orientation },
      ],
    })),
  };
  return {
    typeId: sourceEncounter.typeId,
    fields: sourceEncounter.fields.map((field) => field === sourceList ? targetList : field),
  };
}

function readExactEncounterSpawnPointSourceEntries(
  sourceList: GffListField,
  encounterIndex: number,
): readonly AreaEncounterSpawnPointSourceEntry[] {
  const expectedEntries = sourceList.value.map((entry, sourceIndex) => {
    const [x, y, z, orientation] = entry.fields;
    if (
      entry.typeId !== 2
      || entry.fields.length !== 4
      || x?.label !== "X"
      || x.type !== "float"
      || y?.label !== "Y"
      || y.type !== "float"
      || z?.label !== "Z"
      || z.type !== "float"
      || orientation?.label !== "Orientation"
      || orientation.type !== "float"
    ) {
      throw mutationInvalid(
        "Encounter SpawnPointList entry differs from the exact native schema.",
        [`encounter:index=${encounterIndex}:SpawnPointList:entry=${sourceIndex}:schema`],
      );
    }
    return {
      sourceIndex,
      nativeX: x.value,
      nativeY: y.value,
      nativeZ: z.value,
      orientation: orientation.value,
    };
  });
  try {
    return parseAreaEncounterSpawnPointListProvenance({ expectedEntries }).expectedEntries;
  } catch (error) {
    throw mutationInvalid(
      "Encounter SpawnPointList entry value differs from the admitted native domain.",
      [
        `encounter:index=${encounterIndex}:SpawnPointList:${error instanceof Error ? error.message : "invalid_value"}`,
      ],
    );
  }
}

function mutateItemVariableFields(
  sourceItem: GffListField["value"][number],
  itemIndex: number,
  mutation: ExistingAreaItemVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  return mutateAuroraVariableFields(
    sourceItem,
    itemIndex,
    mutation,
    baseFields,
    "item",
    "Item",
  );
}

function mutateStoreVariableFields(
  sourceStore: GffListField["value"][number],
  storeIndex: number,
  mutation: ExistingAreaStoreVariableMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  return mutateAuroraVariableFields(
    sourceStore,
    storeIndex,
    mutation,
    baseFields,
    "store",
    "Store",
  );
}

const ITEM_PROPERTY_LIST_NATIVE_FIELDS = Object.freeze([
  { label: "PropertyName", type: "word", key: "propertyName" },
  { label: "Subtype", type: "word", key: "subtype" },
  { label: "CostTable", type: "byte", key: "costTable" },
  { label: "CostValue", type: "word", key: "costValue" },
  { label: "Param1", type: "byte", key: "param1" },
  { label: "Param1Value", type: "byte", key: "param1Value" },
  { label: "ChanceAppear", type: "byte", key: "chanceAppear" },
] as const);

function mutateItemPropertyListFields(
  sourceItem: GffListField["value"][number],
  itemIndex: number,
  mutation: ExistingAreaItemPropertyListMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const matches = sourceItem.fields.filter(
    (field) => field.label.toLowerCase() === "propertieslist",
  );
  const sourceList = matches[0];
  if (
    !mutation.expectedValue.present ||
    matches.length !== 1 ||
    sourceList?.label !== "PropertiesList" ||
    sourceList.type !== "list"
  ) {
    throw mutationInvalid("Item PropertiesList mutation requires one canonical native list.", [
      `item:index=${itemIndex}:PropertiesList:count=${matches.length}:label=${sourceList?.label ?? "missing"}:type=${sourceList?.type ?? "missing"}`,
    ]);
  }
  if (sourceList.value.length !== mutation.expectedValue.expectedEntries.length) {
    throw mutationInvalid("Native Item PropertiesList cardinality differs from retained provenance.", [
      `item:index=${itemIndex}:PropertiesList:expected=${mutation.expectedValue.expectedEntries.length}:actual=${sourceList.value.length}`,
    ]);
  }
  mutation.expectedValue.expectedEntries.forEach((expected, sourceIndex) => {
    validateNativeItemPropertyListEntry(
      sourceList.value[sourceIndex],
      expected,
      itemIndex,
    );
  });
  const targetList: GffListField = {
    label: "PropertiesList",
    type: "list",
    value: mutation.entries.map(buildNativeItemPropertyListEntry),
  };
  return baseFields.map((field) => field.label === "PropertiesList" ? targetList : field);
}

function mutateItemInventoryFields(
  sourceItem: GffListField["value"][number],
  itemIndex: number,
  mutation: ExistingAreaItemInventoryMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const matches = sourceItem.fields.filter(
    (field) => field.label.toLowerCase() === "itemlist",
  );
  const sourceList = matches[0];
  if (mutation.expectedEntries.length === 0) {
    if (matches.length !== 0) {
      throw mutationInvalid("Empty Item ItemList provenance requires physical absence.", [
        `item:index=${itemIndex}:ItemList:count=${matches.length}:expected=0`,
      ]);
    }
  } else if (
    matches.length !== 1
    || sourceList?.label !== "ItemList"
    || sourceList.type !== "list"
  ) {
    throw mutationInvalid("Item ItemList mutation requires one canonical native list.", [
      `item:index=${itemIndex}:ItemList:count=${matches.length}:label=${sourceList?.label ?? "missing"}:type=${sourceList?.type ?? "missing"}`,
    ]);
  }
  const sourceEntries = sourceList?.type === "list" ? sourceList.value : [];
  if (sourceEntries.length !== mutation.expectedEntries.length) {
    throw mutationInvalid("Native Item ItemList cardinality differs from retained provenance.", [
      `item:index=${itemIndex}:ItemList:expected=${mutation.expectedEntries.length}:actual=${sourceEntries.length}`,
    ]);
  }
  mutation.expectedEntries.forEach((expected, sourceIndex) => {
    validateNativeItemInventoryEntry(
      sourceEntries[sourceIndex],
      expected,
      itemIndex,
    );
  });

  if (mutation.entries.length === 0) {
    return baseFields.filter((field) => field.label !== "ItemList");
  }
  const targetList: GffListField = {
    label: "ItemList",
    type: "list",
    value: mutation.entries.map((target, targetIndex) => {
      if (!("sourceIndex" in target)) {
        return buildNewGroundItemInventoryEntry(target, itemIndex, targetIndex);
      }
      const source = sourceEntries[target.sourceIndex];
      if (!source) {
        throw mutationInvalid("Retained Item inventory source ordinal is unavailable.", [
          `item:index=${itemIndex}:ItemList:source=${target.sourceIndex}:missing`,
        ]);
      }
      return {
        typeId: targetIndex,
        fields: source.fields.map((field) => {
          if (field.label === "Repos_PosX") {
            return { label: "Repos_PosX", type: "word" as const, value: target.x };
          }
          if (field.label === "Repos_Posy") {
            return { label: "Repos_Posy", type: "word" as const, value: target.y };
          }
          return field;
        }),
      };
    }),
  };
  return sourceList
    ? baseFields.map((field) => field.label === "ItemList" ? targetList : field)
    : [...baseFields, targetList];
}

function buildNewGroundItemInventoryEntry(
  target: ExistingAreaItemInventoryBlueprintEntry,
  itemIndex: number,
  targetIndex: number,
): GffListField["value"][number] {
  const expectation = buildItemAddition({
    kind: "item",
    localObjectId: `item_inventory_${itemIndex}_${targetIndex}`,
    sourceProfileId: target.itemSourceProfileId,
    sourceObjectKey: target.itemSourceObjectKey,
    sourceSizeBytes: target.itemSourceSizeBytes,
    templateResRef: target.itemResRef,
    resRef: target.resRef,
    tag: target.itemTag,
    sourceSha256: target.itemSourceFingerprint,
    resolvedModelType: target.resolvedModelType,
    blueprintBytes: Buffer.from(target.blueprintBytes!),
    ...(target.blueprintDependencies
      ? { blueprintDependencies: target.blueprintDependencies }
      : {}),
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
  }, targetIndex);
  const fields = expectation.git.fields.map((field): SupportedGffField => {
    if (field.label === "XPosition" || field.label === "YPosition" ||
      field.label === "ZPosition") {
      return { label: field.label, type: "float", value: -1 };
    }
    if (field.label === "XOrientation") {
      return { label: "XOrientation", type: "float", value: 0 };
    }
    if (field.label === "YOrientation") {
      return { label: "YOrientation", type: "float", value: 1 };
    }
    return field;
  });
  return {
    typeId: targetIndex,
    fields: [
      ...fields,
      { label: "Repos_PosX", type: "word", value: target.x },
      { label: "Repos_Posy", type: "word", value: target.y },
    ],
  };
}

const ITEM_VISUAL_TRANSFORM_STORAGE_LABELS = new Set([
  "vistransformlist",
  "visualtransformlist",
  "visualtransform",
]);

function mutateItemVisualTransformFields(
  sourceItem: GffListField["value"][number],
  itemIndex: number,
  mutation: AreaItemVisualTransformMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const actual = readCanonicalItemVisualTransformStorage(sourceItem, itemIndex);
  if (!areaItemVisualTransformStorageEqual(actual, mutation.expectedValue)) {
    throw mutationInvalid(
      "Native Item VisTransformList differs from retained provenance.",
      [`item:index=${itemIndex}:VisTransformList:stale`],
    );
  }
  if (!mutation.value.present) {
    return baseFields.filter((field) => field.label !== "VisTransformList");
  }
  if (!actual.present) {
    return [...baseFields, buildCanonicalItemVisualTransformField(mutation.value.value)];
  }
  const targetValue = mutation.value.value;
  return baseFields.map((field) =>
    field.label === "VisTransformList"
      ? replaceItemVisualTransformControllerValues(field, targetValue)
      : field
  );
}

function readCanonicalItemVisualTransformStorage(
  sourceItem: GffListField["value"][number],
  itemIndex: number,
): AreaItemVisualTransformStorage {
  const collisions = sourceItem.fields.filter((field) =>
    ITEM_VISUAL_TRANSFORM_STORAGE_LABELS.has(field.label.toLowerCase())
  );
  if (collisions.length === 0) return Object.freeze({ present: false });
  const listMatches = collisions.filter(
    (field) => field.label.toLowerCase() === "vistransformlist",
  );
  const sourceList = listMatches[0];
  if (
    collisions.length !== 1
    || listMatches.length !== 1
    || sourceList?.label !== "VisTransformList"
    || sourceList.type !== "list"
  ) {
    throw mutationInvalid("Item VisTransformList mutation requires canonical native storage.", [
      `item:index=${itemIndex}:VisTransformList:count=${collisions.length}:label=${sourceList?.label ?? "missing"}:type=${sourceList?.type ?? "missing"}`,
    ]);
  }
  const transform = sourceList.value[0];
  if (sourceList.value.length !== 1 || !transform || transform.typeId !== 6) {
    throw mutationInvalid("Item VisTransformList requires one base-scope native struct.", [
      `item:index=${itemIndex}:VisTransformList:entries=${sourceList.value.length}:struct_type=${transform?.typeId ?? "missing"}`,
    ]);
  }
  if (transform.fields.length !== 11) {
    throw mutationInvalid("Item VisTransformList base scope has a noncanonical field graph.", [
      `item:index=${itemIndex}:VisTransformList:fields=${transform.fields.length}`,
    ]);
  }
  const scope = readExactItemVisualTransformNumberField(
    transform.fields,
    "Scope",
    "int",
    itemIndex,
    "base",
  );
  if (scope !== 0) {
    throw mutationInvalid("Item VisTransformList exposes an unsupported non-base scope.", [
      `item:index=${itemIndex}:VisTransformList:Scope:nonzero`,
    ]);
  }
  const animationSpeed = readExactItemVisualTransformController(
    transform.fields,
    "AnimationSpeed",
    itemIndex,
  );
  if (animationSpeed !== 1) {
    throw mutationInvalid("Item VisTransformList exposes an unsupported animation speed.", [
      `item:index=${itemIndex}:VisTransformList:AnimationSpeed:nondefault`,
    ]);
  }
  const value = {} as Record<AreaItemVisualTransformKey, number>;
  for (const key of AREA_ITEM_VISUAL_TRANSFORM_KEYS) {
    value[key] = readExactItemVisualTransformController(
      transform.fields,
      itemVisualTransformNativeLabel(key),
      itemIndex,
    );
  }
  try {
    return parseAreaItemVisualTransformStorage(
      { present: true, value },
      `item.index.${itemIndex}.VisTransformList.source`,
    );
  } catch (error) {
    throw mutationInvalid("Item VisTransformList source values are outside the admitted profile.", [
      `item:index=${itemIndex}:VisTransformList:${
        error instanceof AreaItemVisualTransformValidationError
          ? "unsupported_value"
          : "invalid_storage"
      }`,
    ]);
  }
}

function readExactItemVisualTransformController(
  fields: readonly SupportedGffField[],
  label: string,
  itemIndex: number,
): number {
  const matches = fields.filter((field) => field.label.toLowerCase() === label.toLowerCase());
  const controller = matches[0];
  if (
    matches.length !== 1
    || controller?.label !== label
    || controller.type !== "struct"
  ) {
    throw mutationInvalid("Item VisTransformList controller storage is noncanonical.", [
      `item:index=${itemIndex}:VisTransformList:${label}:count=${matches.length}:label=${controller?.label ?? "missing"}:type=${controller?.type ?? "missing"}`,
    ]);
  }
  if (controller.value.typeId !== 0 || controller.value.fields.length !== 3) {
    throw mutationInvalid("Item VisTransformList controller struct is noncanonical.", [
      `item:index=${itemIndex}:VisTransformList:${label}:struct_type=${controller.value.typeId}:fields=${controller.value.fields.length}`,
    ]);
  }
  const timerType = readExactItemVisualTransformNumberField(
    controller.value.fields,
    "TimerType",
    "int",
    itemIndex,
    label,
  );
  const valueTo = readExactItemVisualTransformNumberField(
    controller.value.fields,
    "ValueTo",
    "float",
    itemIndex,
    label,
  );
  const lerpType = readExactItemVisualTransformNumberField(
    controller.value.fields,
    "LerpType",
    "int",
    itemIndex,
    label,
  );
  if (timerType !== 0 || lerpType !== 0) {
    throw mutationInvalid("Item VisTransformList animated controllers are preserve-only.", [
      `item:index=${itemIndex}:VisTransformList:${label}:animated`,
    ]);
  }
  return valueTo;
}

function readExactItemVisualTransformNumberField(
  fields: readonly SupportedGffField[],
  label: string,
  type: "int" | "float",
  itemIndex: number,
  scope: string,
): number {
  const matches = fields.filter((field) => field.label.toLowerCase() === label.toLowerCase());
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== label
    || field.type !== type
    || !Number.isFinite(field.value)
  ) {
    throw mutationInvalid("Item VisTransformList numeric storage is noncanonical.", [
      `item:index=${itemIndex}:VisTransformList:${scope}:${label}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return field.value;
}

function buildCanonicalItemVisualTransformField(
  value: AreaItemVisualTransformValue,
): GffListField {
  const controllerValues = new Map<string, number>([
    ["AnimationSpeed", 1],
    ...AREA_ITEM_VISUAL_TRANSFORM_KEYS.map(
      (key): [string, number] => [itemVisualTransformNativeLabel(key), value[key]],
    ),
  ]);
  return {
    label: "VisTransformList",
    type: "list",
    value: [{
      typeId: 6,
      fields: [
        { label: "Scope", type: "int", value: 0 },
        ...[...controllerValues].map(([label, controllerValue]) => ({
          label,
          type: "struct" as const,
          value: {
            typeId: 0,
            fields: [
              { label: "TimerType", type: "int" as const, value: 0 },
              { label: "ValueTo", type: "float" as const, value: controllerValue },
              { label: "LerpType", type: "int" as const, value: 0 },
            ],
          },
        })),
      ],
    }],
  };
}

function replaceItemVisualTransformControllerValues(
  field: SupportedGffField,
  value: AreaItemVisualTransformValue,
): SupportedGffField {
  if (field.type !== "list") return field;
  const targetValues = new Map<string, number>([
    ["AnimationSpeed", 1],
    ...AREA_ITEM_VISUAL_TRANSFORM_KEYS.map(
      (key): [string, number] => [itemVisualTransformNativeLabel(key), value[key]],
    ),
  ]);
  return {
    ...field,
    value: field.value.map((transform) => ({
      ...transform,
      fields: transform.fields.map((controller) => {
        const target = targetValues.get(controller.label);
        if (target === undefined || controller.type !== "struct") return controller;
        return {
          ...controller,
          value: {
            ...controller.value,
            fields: controller.value.fields.map((member) =>
              member.label === "ValueTo"
                ? { label: "ValueTo", type: "float" as const, value: target }
                : member
            ),
          },
        };
      }),
    })),
  };
}

function itemVisualTransformNativeLabel(key: AreaItemVisualTransformKey): string {
  return `${key.slice(0, 1).toUpperCase()}${key.slice(1)}`;
}

function validateNativeItemInventoryEntry(
  entry: GffListField["value"][number] | undefined,
  expected: AreaItemInventorySourceEntry,
  itemIndex: number,
): void {
  const prefix = `item:index=${itemIndex}:ItemList:source=${expected.sourceIndex}`;
  if (!entry || entry.typeId !== expected.sourceIndex) {
    throw mutationInvalid("Native Item ItemList child struct type is noncanonical.", [
      `${prefix}:type=${entry?.typeId ?? "missing"}:expected=${expected.sourceIndex}`,
    ]);
  }
  const unsupported = entry.fields.find((field) => [
    "dropable",
    "droppable",
    "pickpocketable",
    "infinite",
  ].includes(field.label.toLowerCase()));
  if (unsupported) {
    throw mutationInvalid("Native mode-1 ItemList contains an unsupported mode field.", [
      `${prefix}:unsupported_mode_field=${unsupported.label}`,
    ]);
  }
  const resRef = readExactItemInventoryResRef(entry.fields, prefix);
  const x = readExactItemInventoryWord(entry.fields, "Repos_PosX", prefix);
  const y = readExactItemInventoryWord(entry.fields, "Repos_Posy", prefix);
  if (resRef !== expected.resRef || x !== expected.x || y !== expected.y) {
    throw mutationInvalid("Native Item ItemList differs from retained provenance.", [
      `${prefix}:stale_storage`,
    ]);
  }
}

function readExactItemInventoryResRef(
  fields: readonly SupportedGffField[],
  prefix: string,
): string {
  const matches = fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== "TemplateResRef"
    || field.type !== "resref"
    || typeof field.value !== "string"
    || !/^[A-Za-z0-9_]{1,16}$/u.test(field.value)
  ) {
    throw mutationInvalid("Native Item ItemList identity is noncanonical.", [
      `${prefix}:TemplateResRef:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return field.value;
}

function readExactItemInventoryWord(
  fields: readonly SupportedGffField[],
  label: "Repos_PosX" | "Repos_Posy",
  prefix: string,
): number {
  const normalizedLabel = label.toLowerCase().replaceAll("_", "");
  const matches = fields.filter(
    (field) => field.label.toLowerCase().replaceAll("_", "") === normalizedLabel,
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== label
    || field.type !== "word"
    || typeof field.value !== "number"
    || !Number.isSafeInteger(field.value)
    || field.value < 0
    || field.value > 0xffff
  ) {
    throw mutationInvalid("Native Item ItemList repository coordinate is noncanonical.", [
      `${prefix}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  return field.value;
}

function validateNativeItemPropertyListEntry(
  entry: GffListField["value"][number] | undefined,
  expected: AreaItemPropertyListSourceEntry,
  itemIndex: number,
): void {
  if (
    !entry ||
    entry.typeId !== 0 ||
    entry.fields.length !== ITEM_PROPERTY_LIST_NATIVE_FIELDS.length
  ) {
    throw mutationInvalid("Native Item PropertiesList entry has an unsupported struct profile.", [
      `item:index=${itemIndex}:PropertiesList:source=${expected.sourceIndex}:type=${entry?.typeId ?? "missing"}:fields=${entry?.fields.length ?? 0}`,
    ]);
  }
  const valid = ITEM_PROPERTY_LIST_NATIVE_FIELDS.every((profile, fieldIndex) => {
    const field = entry.fields[fieldIndex];
    return field?.label === profile.label &&
      field.type === profile.type &&
      field.value === expected[profile.key];
  });
  if (!valid) {
    throw mutationInvalid("Native Item PropertiesList differs from retained provenance.", [
      `item:index=${itemIndex}:PropertiesList:source=${expected.sourceIndex}:stale_or_malformed`,
    ]);
  }
}

function buildNativeItemPropertyListEntry(
  entry: AreaItemPropertyListTargetEntry,
): GffListField["value"][number] {
  return {
    typeId: 0,
    fields: [
      { label: "PropertyName", type: "word", value: entry.propertyName },
      { label: "Subtype", type: "word", value: entry.subtype },
      { label: "CostTable", type: "byte", value: entry.costTable },
      { label: "CostValue", type: "word", value: entry.costValue },
      { label: "Param1", type: "byte", value: entry.param1 },
      { label: "Param1Value", type: "byte", value: entry.param1Value },
      { label: "ChanceAppear", type: "byte", value: entry.chanceAppear },
    ],
  };
}

function mutateAuroraVariableFields(
  sourceOwner: GffListField["value"][number],
  ownerIndex: number,
  mutation:
    | ExistingAreaPlaceableVariableMutation
    | ExistingAreaCreatureVariableMutation
    | ExistingAreaEncounterVariableMutation
    | ExistingAreaWaypointVariableMutation
    | ExistingAreaItemVariableMutation
    | ExistingAreaStoreVariableMutation,
  baseFields: SupportedGffField[],
  ownerKind: "placeable" | "creature" | "encounter" | "waypoint" | "item" | "store",
  ownerLabel: "Placeable" | "Creature" | "Encounter" | "Waypoint" | "Item" | "Store",
): SupportedGffField[] {
  const matches = sourceOwner.fields.filter(
    (field) => field.label.toLowerCase() === "vartable",
  );
  if (mutation.expectedEntries.length === 0) {
    if (matches.length !== 0) {
      throw mutationInvalid(`Empty ${ownerLabel} VarTable provenance requires an absent native list.`, [
        `${ownerKind}:index=${ownerIndex}:VarTable:count=${matches.length}:expected=0`,
      ]);
    }
  } else if (matches.length !== 1 || matches[0]?.label !== "VarTable" || matches[0]?.type !== "list") {
    throw mutationInvalid(`${ownerLabel} variable mutation requires one canonical native VarTable list.`, [
      `${ownerKind}:index=${ownerIndex}:VarTable:count=${matches.length}:label=${matches[0]?.label ?? "missing"}:type=${matches[0]?.type ?? "missing"}`,
    ]);
  }
  const nativeEntries = matches[0]?.label === "VarTable" && matches[0].type === "list"
    ? matches[0].value
    : [];
  if (nativeEntries.length !== mutation.expectedEntries.length) {
    throw mutationInvalid(`Native ${ownerLabel} VarTable cardinality differs from retained provenance.`, [
      `${ownerKind}:index=${ownerIndex}:VarTable:expected=${mutation.expectedEntries.length}:actual=${nativeEntries.length}`,
    ]);
  }
  mutation.expectedEntries.forEach((expected, sourceIndex) => {
    validateNativeAuroraVariableEntry(
      nativeEntries[sourceIndex],
      expected,
      ownerIndex,
      ownerKind,
      ownerLabel,
    );
  });

  if (mutation.entries.length === 0) {
    return baseFields.filter((field) => field.label !== "VarTable");
  }
  const targetList: GffListField = {
    label: "VarTable",
    type: "list",
    value: mutation.entries.map((entry) => buildAuroraVariableEntry(entry)),
  };
  if (matches.length === 0) return [...baseFields, targetList];
  return baseFields.map((field) => field.label === "VarTable" ? targetList : field);
}

function validateNativeAuroraVariableEntry(
  entry: GffListField["value"][number] | undefined,
  expected:
    | AreaPlaceableVariableSourceEntry
    | AreaCreatureVariableSourceEntry
    | AreaEncounterVariableSourceEntry
    | AreaWaypointVariableSourceEntry
    | AreaItemVariableSourceEntry
    | AreaStoreVariableSourceEntry,
  ownerIndex: number,
  ownerKind: "placeable" | "creature" | "encounter" | "waypoint" | "item" | "store",
  ownerLabel: "Placeable" | "Creature" | "Encounter" | "Waypoint" | "Item" | "Store",
): void {
  if (!entry || entry.typeId !== 0 || entry.fields.length !== 3) {
    throw mutationInvalid(`Native ${ownerLabel} variable entry has an unsupported struct profile.`, [
      `${ownerKind}:index=${ownerIndex}:VarTable:source=${expected.sourceIndex}:type=${entry?.typeId ?? "missing"}:fields=${entry?.fields.length ?? 0}`,
    ]);
  }
  const read = (label: "Name" | "Type" | "Value") => {
    const fields = entry.fields.filter((field) => field.label.toLowerCase() === label.toLowerCase());
    return fields.length === 1 && fields[0]?.label === label ? fields[0] : undefined;
  };
  const name = read("Name");
  const type = read("Type");
  const value = read("Value");
  const expectedNativeType = expected.type === "int" ? 1 : expected.type === "float" ? 2 : 3;
  const expectedValueType = expected.type === "int" ? "int" : expected.type === "float" ? "float" : "cexostring";
  if (name?.type !== "cexostring" || name.value !== expected.name ||
    type?.type !== "dword" || type.value !== expectedNativeType ||
    value?.type !== expectedValueType || !Object.is(value.value, expected.value)) {
    throw mutationInvalid(`Native ${ownerLabel} variable differs from retained provenance.`, [
      `${ownerKind}:index=${ownerIndex}:VarTable:source=${expected.sourceIndex}:stale_or_malformed`,
    ]);
  }
}

function buildAuroraVariableEntry(
  entry:
    | AreaPlaceableVariableTargetEntry
    | AreaCreatureVariableTargetEntry
    | AreaEncounterVariableTargetEntry
    | AreaWaypointVariableTargetEntry
    | AreaItemVariableTargetEntry
    | AreaStoreVariableTargetEntry,
): GffListField["value"][number] {
  const nativeType = entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3;
  const value: SupportedGffField = entry.type === "int"
    ? { label: "Value", type: "int", value: entry.value }
    : entry.type === "float"
      ? { label: "Value", type: "float", value: entry.value }
      : { label: "Value", type: "cexostring", value: entry.value };
  return {
    typeId: 0,
    fields: [
      { label: "Name", type: "cexostring", value: entry.name },
      { label: "Type", type: "dword", value: nativeType },
      value,
    ],
  };
}

function mutatePlaceableLocalizedStringField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableLocalizedStringMutation,
): SupportedGffField {
  const mapping = AREA_PLACEABLE_LOCALIZED_STRING_MUTATION_FIELDS.find(
    (candidate) => candidate.field === mutation.field,
  )!;
  return mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    mutation,
    "placeable",
    "Placeable",
    mapping.maxBytes,
    false,
  );
}

function mutateInlineAsciiLocalizedStringField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: Readonly<{
    field: string;
    expectedValue: string;
    value: string;
  }>,
  family: "placeable" | "creature" | "item" | "trigger" | "encounter" | "waypoint",
  familyLabel: "Placeable" | "Creature" | "Item" | "Trigger" | "Encounter" | "Waypoint",
  maxBytes: number,
  contentFreeStaleDiagnostic: boolean,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === mutation.field.toLowerCase(),
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === mutation.field);
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "cexolocstring"
  ) {
    throw mutationInvalid(
      `${familyLabel} ${mutation.field} mutation requires one native CExoLocString field.`,
      [
        `${family}:index=${sourceIndex}:${mutation.field}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  const value = field.value;
  const entries = value.entries ?? [];
  const actual = value.strRef === 0xffff_ffff && entries.length <= 1
    ? entries.length === 0
      ? ""
      : entries[0]?.languageId === 0 &&
          entries[0].text.length > 0 &&
          isAreaInlineAsciiText(entries[0].text, maxBytes)
        ? entries[0].text
        : undefined
    : undefined;
  if (actual === undefined) {
    throw mutationInvalid(
      `${familyLabel} ${mutation.field} source is outside the admitted inline ASCII profile.`,
      [`${family}:index=${sourceIndex}:${mutation.field}:unsupported_source`],
    );
  }
  if (actual !== mutation.expectedValue) {
    throw mutationInvalid(
      `${familyLabel} ${mutation.field} source value differs from retained provenance.`,
      [contentFreeStaleDiagnostic
        ? `${family}:index=${sourceIndex}:${mutation.field}:stale_source`
        : `${family}:index=${sourceIndex}:${mutation.field}:expected=${mutation.expectedValue}:actual=${actual}`],
    );
  }
  return {
    label: mutation.field,
    type: "cexolocstring",
    value: {
      strRef: 0xffff_ffff,
      entries: mutation.value.length === 0
        ? []
        : [{ languageId: 0, text: mutation.value }],
    },
  };
}

function normalizeCreatureNameLocalizedStringMutations(
  input: unknown,
  sourceIndex: number,
): readonly ExistingAreaCreatureNameLocalizedStringMutation[] {
  const mutations = readExistingAreaCreatureNameLocalizedStringMutations(input);
  if (!mutations) {
    throw mutationInvalid("Creature name localized-string mutation list is invalid.", [
      `creature:index=${sourceIndex}:localizedStrings:invalid_pair`,
    ]);
  }
  return mutations;
}

function mutatePlaceableTagField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableTagMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "Tag");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "cexostring") {
    throw mutationInvalid("Placeable Tag mutation requires one native CExoString field.", [
      `placeable:index=${sourceIndex}:Tag:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable Tag source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:Tag:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "Tag", type: "cexostring", value: mutation.value };
}

function mutateItemTagEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaItemTagMutation,
): GffListField["value"][number] {
  return mutateExactObjectTagEntry(entry, sourceIndex, mutation, "item", "Item");
}

function mutateExactObjectTagEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaItemTagMutation | ExistingAreaTriggerTagMutation |
    ExistingAreaEncounterTagMutation | ExistingAreaWaypointTagMutation,
  kind: "item" | "trigger" | "encounter" | "waypoint",
  familyLabel: "Item" | "Trigger" | "Encounter" | "Waypoint",
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "tag",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Tag");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "cexostring"
  ) {
    throw mutationInvalid(`${familyLabel} Tag mutation requires one canonical native CExoString field.`, [
      `${kind}:index=${sourceIndex}:Tag:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(`${familyLabel} Tag source value differs from retained provenance.`, [
      `${kind}:index=${sourceIndex}:Tag:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Tag", type: "cexostring", value: mutation.value }
      : candidate),
  };
}

function mutateEncounterActiveEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterActiveMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "active",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Active");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "byte"
  ) {
    throw mutationInvalid("Encounter Active mutation requires one canonical native BYTE field.", [
      `encounter:index=${sourceIndex}:Active:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid("Encounter Active source byte is noncanonical.", [
      `encounter:index=${sourceIndex}:Active:noncanonical`,
    ]);
  }
  if (field.value !== mutation.expectedValue.activeByte) {
    throw mutationInvalid("Encounter Active source value differs from retained provenance.", [
      `encounter:index=${sourceIndex}:Active:stale`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Active", type: "byte", value: mutation.value.activeByte }
      : candidate),
  };
}

function mutateEncounterPlayerOnlyEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterPlayerOnlyMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "playeronly",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "PlayerOnly",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "byte"
  ) {
    throw mutationInvalid(
      "Encounter PlayerOnly mutation requires one canonical native BYTE field.",
      [
        `encounter:index=${sourceIndex}:PlayerOnly:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid("Encounter PlayerOnly source byte is noncanonical.", [
      `encounter:index=${sourceIndex}:PlayerOnly:noncanonical`,
    ]);
  }
  if (field.value !== mutation.expectedValue.playerOnlyByte) {
    throw mutationInvalid(
      "Encounter PlayerOnly source value differs from retained provenance.",
      [`encounter:index=${sourceIndex}:PlayerOnly:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "PlayerOnly", type: "byte", value: mutation.value.playerOnlyByte }
      : candidate),
  };
}

function mutateEncounterResetEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterResetMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "reset",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "Reset",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "byte"
  ) {
    throw mutationInvalid(
      "Encounter Reset mutation requires one canonical native BYTE field.",
      [
        `encounter:index=${sourceIndex}:Reset:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid("Encounter Reset source byte is noncanonical.", [
      `encounter:index=${sourceIndex}:Reset:noncanonical`,
    ]);
  }
  if (field.value !== mutation.expectedValue.resetByte) {
    throw mutationInvalid(
      "Encounter Reset source value differs from retained provenance.",
      [`encounter:index=${sourceIndex}:Reset:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Reset", type: "byte", value: mutation.value.resetByte }
      : candidate),
  };
}

function mutateEncounterResetTimeEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterResetTimeMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "resettime",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "ResetTime",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "int"
  ) {
    throw mutationInvalid(
      "Encounter ResetTime mutation requires one canonical native INT field.",
      [
        `encounter:index=${sourceIndex}:ResetTime:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (!readAreaEncounterResetTimeStorage({ resetTime: field.value })) {
    throw mutationInvalid("Encounter ResetTime source INT is outside the Toolset range.", [
      `encounter:index=${sourceIndex}:ResetTime:out_of_range`,
    ]);
  }
  if (field.value !== mutation.expectedValue.resetTime) {
    throw mutationInvalid(
      "Encounter ResetTime source value differs from retained provenance.",
      [`encounter:index=${sourceIndex}:ResetTime:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "ResetTime", type: "int", value: mutation.value.resetTime }
      : candidate),
  };
}

function mutateEncounterSpawnOptionEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterSpawnOptionMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "spawnoption",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "SpawnOption",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "int"
  ) {
    throw mutationInvalid(
      "Encounter SpawnOption mutation requires one canonical native INT field.",
      [
        `encounter:index=${sourceIndex}:SpawnOption:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (!readAreaEncounterSpawnOptionStorage({ spawnOption: field.value })) {
    throw mutationInvalid("Encounter SpawnOption source INT is noncanonical.", [
      `encounter:index=${sourceIndex}:SpawnOption:noncanonical`,
    ]);
  }
  if (field.value !== mutation.expectedValue.spawnOption) {
    throw mutationInvalid(
      "Encounter SpawnOption source value differs from retained provenance.",
      [`encounter:index=${sourceIndex}:SpawnOption:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "SpawnOption", type: "int", value: mutation.value.spawnOption }
      : candidate),
  };
}

function mutateEncounterRespawnsEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterRespawnsMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "respawns",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "Respawns",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "int"
  ) {
    throw mutationInvalid(
      "Encounter Respawns mutation requires one canonical native INT field.",
      [
        `encounter:index=${sourceIndex}:Respawns:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (!readAreaEncounterRespawnsStorage({ respawns: field.value })) {
    throw mutationInvalid("Encounter Respawns source INT is noncanonical.", [
      `encounter:index=${sourceIndex}:Respawns:noncanonical`,
    ]);
  }
  if (field.value !== mutation.expectedValue.respawns) {
    throw mutationInvalid(
      "Encounter Respawns source value differs from retained provenance.",
      [`encounter:index=${sourceIndex}:Respawns:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Respawns", type: "int", value: mutation.value.respawns }
      : candidate),
  };
}

function mutateEncounterCreatureCountEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterCreatureCountMutation,
): GffListField["value"][number] {
  const maxCaseInsensitive = entry.fields.filter(
    (field) => field.label.toLowerCase() === "maxcreatures",
  );
  const recCaseInsensitive = entry.fields.filter(
    (field) => field.label.toLowerCase() === "reccreatures",
  );
  const maxExact = maxCaseInsensitive.filter((field) => field.label === "MaxCreatures");
  const recExact = recCaseInsensitive.filter((field) => field.label === "RecCreatures");
  const maxField = maxExact[0];
  const recField = recExact[0];
  if (
    maxCaseInsensitive.length !== 1
    || maxExact.length !== 1
    || maxField?.type !== "int"
    || recCaseInsensitive.length !== 1
    || recExact.length !== 1
    || recField?.type !== "int"
  ) {
    throw mutationInvalid(
      "Encounter creature-count mutation requires one canonical native INT field per pair member.",
      [
        `encounter:index=${sourceIndex}:creatureCounts:max_count=${maxExact.length}:max_label=${maxField?.label ?? "missing"}:max_type=${maxField?.type ?? "missing"}:rec_count=${recExact.length}:rec_label=${recField?.label ?? "missing"}:rec_type=${recField?.type ?? "missing"}`,
      ],
    );
  }
  const actual = readAreaEncounterCreatureCountStorage({
    maxCreatures: maxField.value,
    recCreatures: recField.value,
  });
  if (!actual) {
    throw mutationInvalid("Encounter creature-count source INT pair is noncanonical.", [
      `encounter:index=${sourceIndex}:creatureCounts:noncanonical`,
    ]);
  }
  if (
    actual.maxCreatures !== mutation.expectedValue.maxCreatures
    || actual.recCreatures !== mutation.expectedValue.recCreatures
  ) {
    throw mutationInvalid(
      "Encounter creature-count source pair differs from retained provenance.",
      [`encounter:index=${sourceIndex}:creatureCounts:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      if (candidate === maxField) {
        return { label: "MaxCreatures", type: "int", value: mutation.value.maxCreatures };
      }
      if (candidate === recField) {
        return { label: "RecCreatures", type: "int", value: mutation.value.recCreatures };
      }
      return candidate;
    }),
  };
}

function readTriggerScriptResRefsFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaTriggerScriptResRefsStorage {
  if (entry.typeId !== 1) {
    throw mutationInvalid(
      "Trigger script mutation requires one type-1 native Trigger struct.",
      [`trigger:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const values: Record<string, string> = {};
  for (const profile of AREA_TRIGGER_SCRIPT_RESREF_FIELDS) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.type !== "resref"
      || typeof field.value !== "string"
    ) {
      throw mutationInvalid(
        `Trigger script mutation requires exact ${profile.label} storage.`,
        [
          `trigger:index=${sourceIndex}:${profile.label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    values[profile.key] = field.value;
  }
  const storage = readAreaTriggerScriptResRefsStorage(values);
  if (!storage) {
    throw mutationInvalid(
      "Trigger script source tuple is outside the admitted profile.",
      [`trigger:index=${sourceIndex}:scripts:invalid_source`],
    );
  }
  return storage;
}

function mutateTriggerScriptResRefsEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaTriggerScriptResRefsMutation,
): GffListField["value"][number] {
  const source = readTriggerScriptResRefsFromEntry(entry, sourceIndex);
  if (!areaTriggerScriptResRefsStoragesEqual(source, mutation.expectedValue)) {
    throw mutationInvalid(
      "Trigger script ResRefs differ from retained provenance.",
      [`trigger:index=${sourceIndex}:scripts:stale_storage`],
    );
  }
  const profileByLabel = new Map<
    string,
    (typeof AREA_TRIGGER_SCRIPT_RESREF_FIELDS)[number]
  >(
    AREA_TRIGGER_SCRIPT_RESREF_FIELDS.map(
      (profile) => [profile.label, profile] as const,
    ),
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field): SupportedGffField => {
      const profile = profileByLabel.get(field.label);
      return profile
        ? { label: profile.label, type: "resref", value: mutation.value[profile.key] }
        : field;
    }),
  };
}

function readTriggerTransitionStorageFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaTriggerTransitionStorage {
  if (entry.typeId !== 1) {
    throw mutationInvalid(
      "Trigger transition mutation requires one type-1 native Trigger struct.",
      [`trigger:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const profiles = [
    { key: "linkedTo", label: "LinkedTo", type: "cexostring" },
    { key: "linkedToFlags", label: "LinkedToFlags", type: "byte" },
    { key: "loadScreenId", label: "LoadScreenID", type: "word" },
  ] as const;
  const values: Record<string, unknown> = {};
  for (const profile of profiles) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.type !== profile.type
    ) {
      throw mutationInvalid(
        `Trigger transition mutation requires exact ${profile.label} storage.`,
        [
          `trigger:index=${sourceIndex}:${profile.label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    values[profile.key] = field.value;
  }
  if (!isAreaTriggerTransitionStorage(values)) {
    throw mutationInvalid(
      "Trigger transition source tuple is outside the admitted profile.",
      [`trigger:index=${sourceIndex}:transitionStorage:invalid_source`],
    );
  }
  return values;
}

function mutateTriggerTransitionStorageEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaTriggerTransitionStorageMutation,
): GffListField["value"][number] {
  const source = readTriggerTransitionStorageFromEntry(entry, sourceIndex);
  if (!areaTriggerTransitionStorageEqual(source, mutation.expectedValue)) {
    throw mutationInvalid(
      "Trigger transition storage differs from retained provenance.",
      [`trigger:index=${sourceIndex}:transitionStorage:stale_storage`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field): SupportedGffField => {
      if (field.label === "LinkedTo") {
        return { label: "LinkedTo", type: "cexostring", value: mutation.value.linkedTo };
      }
      if (field.label === "LinkedToFlags") {
        return { label: "LinkedToFlags", type: "byte", value: mutation.value.linkedToFlags };
      }
      if (field.label === "LoadScreenID") {
        return { label: "LoadScreenID", type: "word", value: mutation.value.loadScreenId };
      }
      return field;
    }),
  };
}

function readEncounterScriptResRefsFromEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
): AreaEncounterScriptResRefsStorage {
  if (entry.typeId !== 7) {
    throw mutationInvalid(
      "Encounter script mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const values: Record<string, string> = {};
  for (const profile of AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS) {
    const matches = entry.fields.filter(
      (field) => field.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.type !== "resref"
      || typeof field.value !== "string"
    ) {
      throw mutationInvalid(
        `Encounter script mutation requires exact ${profile.label} storage.`,
        [
          `encounter:index=${sourceIndex}:${profile.label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    values[profile.key] = field.value;
  }
  const storage = readAreaEncounterScriptResRefsStorage(values);
  if (!storage) {
    throw mutationInvalid(
      "Encounter script source tuple is outside the admitted profile.",
      [`encounter:index=${sourceIndex}:scripts:invalid_source`],
    );
  }
  return storage;
}

function mutateEncounterScriptResRefsEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterScriptResRefsMutation,
): GffListField["value"][number] {
  const source = readEncounterScriptResRefsFromEntry(entry, sourceIndex);
  if (!areaEncounterScriptResRefsStoragesEqual(source, mutation.expectedValue)) {
    throw mutationInvalid(
      "Encounter script ResRefs differ from retained provenance.",
      [`encounter:index=${sourceIndex}:scripts:stale_storage`],
    );
  }
  const profileByLabel = new Map<
    string,
    (typeof AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS)[number]
  >(
    AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS.map(
      (profile) => [profile.label, profile] as const,
    ),
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((field): SupportedGffField => {
      const profile = profileByLabel.get(field.label);
      return profile
        ? { label: profile.label, type: "resref", value: mutation.value[profile.key] }
        : field;
    }),
  };
}

function mutateEncounterFactionEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterFactionMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 7) {
    throw mutationInvalid(
      "Encounter Faction mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "faction",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Faction");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1
    || exactMatches.length !== 1
    || field?.type !== "dword"
  ) {
    throw mutationInvalid(
      "Encounter Faction mutation requires one canonical native DWord field.",
      [
        `encounter:index=${sourceIndex}:Faction:count=${exactMatches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  const source = readAreaEncounterFactionStorage({
    present: true,
    nativeType: "dword",
    value: field.value,
  });
  if (!source?.present || source.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Encounter Faction source differs from retained provenance.",
      [`encounter:index=${sourceIndex}:Faction:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Faction", type: "dword", value: mutation.value }
      : candidate),
  };
}

function mutateEncounterDifficultyEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterDifficultyMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 7) {
    throw mutationInvalid(
      "Encounter Difficulty mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const exactField = (label: "Difficulty" | "DifficultyIndex") => {
    const insensitive = entry.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const exact = insensitive.filter((field) => field.label === label);
    const field = exact[0];
    if (insensitive.length !== 1 || exact.length !== 1 || field?.type !== "int") {
      throw mutationInvalid(
        `Encounter ${label} mutation requires one canonical native INT field.`,
        [
          `encounter:index=${sourceIndex}:${label}:count=${exact.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    return field;
  };
  const difficulty = exactField("Difficulty");
  const difficultyIndex = exactField("DifficultyIndex");
  const source = readAreaEncounterDifficultyStorage({
    difficulty: {
      present: true,
      nativeType: "int",
      value: difficulty.value,
    },
    difficultyIndex: {
      present: true,
      nativeType: "int",
      value: difficultyIndex.value,
    },
  });
  if (!source?.difficulty.present || !source.difficultyIndex.present ||
      source.difficulty.value !== mutation.expectedValue.difficulty ||
      source.difficultyIndex.value !== mutation.expectedValue.difficultyIndex) {
    throw mutationInvalid(
      "Encounter Difficulty source differs from retained provenance.",
      [`encounter:index=${sourceIndex}:Difficulty+DifficultyIndex:stale`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === difficulty
      ? { label: "Difficulty", type: "int", value: mutation.value.difficulty }
      : candidate === difficultyIndex
        ? {
            label: "DifficultyIndex",
            type: "int",
            value: mutation.value.difficultyIndex,
          }
        : candidate),
  };
}

function mutateEncounterLocalizedNameEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterLocalizedNameMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 7) {
    throw mutationInvalid(
      "Encounter LocalizedName mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const replacement = mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    {
      field: "LocalizedName",
      expectedValue: mutation.expectedValue,
      value: mutation.value,
    },
    "encounter",
    "Encounter",
    MAX_AREA_ENCOUNTER_LOCALIZED_NAME_ASCII_BYTES,
    true,
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "LocalizedName"
      ? replacement
      : candidate),
  };
}

function mutateWaypointLocalizedNameEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaWaypointLocalizedNameMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 5) {
    throw mutationInvalid(
      "Waypoint LocalizedName mutation requires one type-5 native Waypoint struct.",
      [`waypoint:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const replacement = mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    {
      field: "LocalizedName",
      expectedValue: mutation.expectedValue,
      value: mutation.value,
    },
    "waypoint",
    "Waypoint",
    MAX_AREA_WAYPOINT_LOCALIZED_NAME_ASCII_BYTES,
    true,
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "LocalizedName"
      ? replacement
      : candidate),
  };
}

function mutateWaypointTemplateResRefEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaWaypointTemplateResRefMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 5) {
    throw mutationInvalid(
      "Waypoint TemplateResRef mutation requires one type-5 native Waypoint struct.",
      [`waypoint:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "TemplateResRef",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid(
      "Waypoint TemplateResRef mutation requires one canonical native ResRef field.",
      [
        `waypoint:index=${sourceIndex}:TemplateResRef:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid(
      "Waypoint TemplateResRef source value differs from retained provenance.",
      [
        `waypoint:index=${sourceIndex}:TemplateResRef:expected=${mutation.expectedResRef}:actual=${field.value}`,
      ],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "TemplateResRef", type: "resref", value: mutation.resRef }
      : candidate),
  };
}

function mutateTriggerTemplateResRefEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaTriggerTemplateResRefMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 1) {
    throw mutationInvalid(
      "Trigger TemplateResRef mutation requires one type-1 native Trigger struct.",
      [`trigger:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "TemplateResRef",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid(
      "Trigger TemplateResRef mutation requires one canonical native ResRef field.",
      [
        `trigger:index=${sourceIndex}:TemplateResRef:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid(
      "Trigger TemplateResRef source value differs from retained provenance.",
      [
        `trigger:index=${sourceIndex}:TemplateResRef:expected=${mutation.expectedResRef}:actual=${field.value}`,
      ],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "TemplateResRef", type: "resref", value: mutation.resRef }
      : candidate),
  };
}

function mutateTriggerLocalizedNameEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaTriggerLocalizedNameMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 1) {
    throw mutationInvalid(
      "Trigger LocalizedName mutation requires one type-1 native Trigger struct.",
      [`trigger:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const replacement = mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    {
      field: "LocalizedName",
      expectedValue: mutation.expectedValue,
      value: mutation.value,
    },
    "trigger",
    "Trigger",
    MAX_AREA_TRIGGER_LOCALIZED_NAME_ASCII_BYTES,
    true,
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "LocalizedName"
      ? replacement
      : candidate),
  };
}

function mutateEncounterTemplateResRefEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaEncounterTemplateResRefMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 7) {
    throw mutationInvalid(
      "Encounter TemplateResRef mutation requires one type-7 native Encounter struct.",
      [`encounter:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "TemplateResRef",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid(
      "Encounter TemplateResRef mutation requires one canonical native ResRef field.",
      [
        `encounter:index=${sourceIndex}:TemplateResRef:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid(
      "Encounter TemplateResRef source value differs from retained provenance.",
      [
        `encounter:index=${sourceIndex}:TemplateResRef:expected=${mutation.expectedResRef}:actual=${field.value}`,
      ],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "TemplateResRef", type: "resref", value: mutation.resRef }
      : candidate),
  };
}

function mutateWaypointDescriptionEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaWaypointDescriptionMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 5) {
    throw mutationInvalid(
      "Waypoint Description mutation requires one type-5 native Waypoint struct.",
      [`waypoint:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const replacement = mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    {
      field: "Description",
      expectedValue: mutation.expectedValue,
      value: mutation.value,
    },
    "waypoint",
    "Waypoint",
    MAX_AREA_WAYPOINT_DESCRIPTION_ASCII_BYTES,
    true,
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "Description"
      ? replacement
      : candidate),
  };
}

function mutateWaypointMapNoteEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaWaypointMapNoteMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 5) {
    throw mutationInvalid(
      "Waypoint MapNote mutation requires one type-5 native Waypoint struct.",
      [`waypoint:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const mapNoteReplacement = mutateInlineAsciiLocalizedStringField(
    entry,
    sourceIndex,
    {
      field: "MapNote",
      expectedValue: mutation.expectedValue.mapNoteText,
      value: mutation.value.mapNoteText,
    },
    "waypoint",
    "Waypoint",
    MAX_AREA_WAYPOINT_MAP_NOTE_ASCII_BYTES,
    true,
  );
  const mutateBinaryByte = (
    label: "HasMapNote" | "MapNoteEnabled",
    expected: boolean,
    target: boolean,
  ): SupportedGffField => {
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter((field) => field.label === label);
    const field = exactMatches[0];
    if (
      caseInsensitiveMatches.length !== 1 ||
      exactMatches.length !== 1 ||
      field?.type !== "byte"
    ) {
      throw mutationInvalid(
        `Waypoint ${label} mutation requires one canonical native Byte field.`,
        [`waypoint:index=${sourceIndex}:${label}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`],
      );
    }
    if (field.value !== 0 && field.value !== 1) {
      throw mutationInvalid(
        `Waypoint ${label} source Byte is outside the admitted binary domain.`,
        [`waypoint:index=${sourceIndex}:${label}:value=${String(field.value)}`],
      );
    }
    if ((field.value === 1) !== expected) {
      throw mutationInvalid(
        `Waypoint ${label} source value differs from retained provenance.`,
        [`waypoint:index=${sourceIndex}:${label}:stale_source`],
      );
    }
    return { label, type: "byte", value: target ? 1 : 0 };
  };
  const hasMapNoteReplacement = mutateBinaryByte(
    "HasMapNote",
    mutation.expectedValue.hasMapNote,
    mutation.value.hasMapNote,
  );
  const mapNoteEnabledReplacement = mutateBinaryByte(
    "MapNoteEnabled",
    mutation.expectedValue.mapNoteEnabled,
    mutation.value.mapNoteEnabled,
  );
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => {
      if (candidate.label === "HasMapNote") return hasMapNoteReplacement;
      if (candidate.label === "MapNote") return mapNoteReplacement;
      if (candidate.label === "MapNoteEnabled") return mapNoteEnabledReplacement;
      return candidate;
    }),
  };
}

function mutateWaypointAppearanceEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaWaypointAppearanceMutation,
): GffListField["value"][number] {
  if (entry.typeId !== 5) {
    throw mutationInvalid(
      "Waypoint Appearance mutation requires one type-5 native Waypoint struct.",
      [`waypoint:index=${sourceIndex}:struct_type=${entry.typeId}`],
    );
  }
  const matches = entry.fields.filter((field) =>
    field.label.toLowerCase() === "appearance"
  );
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "Appearance" || field.type !== "byte") {
    throw mutationInvalid(
      "Waypoint Appearance mutation requires one canonical native Appearance Byte field.",
      [`waypoint:index=${sourceIndex}:Appearance:missing_or_unsupported`],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Waypoint Appearance source value differs from retained provenance.",
      [`waypoint:index=${sourceIndex}:Appearance:stale_source`],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "Appearance", type: "byte", value: mutation.value }
      : candidate),
  };
}

function mutateItemTemplateResRefEntry(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaItemTemplateResRefMutation,
): GffListField["value"][number] {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "TemplateResRef",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid(
      "Item TemplateResRef mutation requires one canonical native ResRef field.",
      [
        `item:index=${sourceIndex}:TemplateResRef:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid(
      "Item TemplateResRef source value differs from retained provenance.",
      [
        `item:index=${sourceIndex}:TemplateResRef:expected=${mutation.expectedResRef}:actual=${field.value}`,
      ],
    );
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate === field
      ? { label: "TemplateResRef", type: "resref", value: mutation.resRef }
      : candidate),
  };
}

function mutateCreatureTagField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureTagMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "tag",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Tag");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "cexostring"
  ) {
    throw mutationInvalid("Creature Tag mutation requires one canonical native CExoString field.", [
      `creature:index=${sourceIndex}:Tag:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature Tag source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:Tag:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "Tag", type: "cexostring", value: mutation.value };
}

function mutateCreatureConversationField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureConversationMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "conversation",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "Conversation",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid("Creature Conversation mutation requires one canonical native ResRef field.", [
      `creature:index=${sourceIndex}:Conversation:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid("Creature Conversation source ResRef differs from retained provenance.", [
      `creature:index=${sourceIndex}:Conversation:stale_source`,
    ]);
  }
  return { label: "Conversation", type: "resref", value: mutation.resRef };
}

function mutateCreatureInterruptableField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureInterruptableMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "interruptable",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "Interruptable",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "byte"
  ) {
    throw mutationInvalid("Creature Interruptable mutation requires one canonical native Byte field.", [
      `creature:index=${sourceIndex}:Interruptable:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid("Creature Interruptable source Byte is outside the admitted binary domain.", [
      `creature:index=${sourceIndex}:Interruptable:count=1:type=byte:value=${String(field.value)}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature Interruptable source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:Interruptable:stale_source`,
    ]);
  }
  return { label: "Interruptable", type: "byte", value: mutation.value };
}

function mutateCreatureAdvancedFlagFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureAdvancedFlagMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const mapping of AREA_CREATURE_ADVANCED_FLAG_FIELDS) {
    const mutation = mutations[mapping.key];
    if (!mutation) continue;
    replacements.set(
      mapping.nativeLabel,
      mutateCreatureAdvancedFlagField(
        entry,
        sourceIndex,
        mapping.key,
        mapping.nativeLabel,
        mutation,
      ),
    );
  }
  return replacements;
}

function mutateCreatureAdvancedFlagField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  _key: AreaCreatureAdvancedFlagKey,
  nativeLabel: string,
  mutation: ExistingAreaCreatureBinaryFlagMutation,
): SupportedGffField {
  const normalizedLabel = nativeLabel.toLowerCase();
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === normalizedLabel,
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === nativeLabel,
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "byte"
  ) {
    throw mutationInvalid("Creature advanced flag mutation requires one canonical native Byte field.", [
      `creature:index=${sourceIndex}:${nativeLabel}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid("Creature advanced flag source Byte is outside the admitted binary domain.", [
      `creature:index=${sourceIndex}:${nativeLabel}:count=1:type=byte:value=${String(field.value)}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature advanced flag source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:${nativeLabel}:stale_source`,
    ]);
  }
  return { label: nativeLabel, type: "byte", value: mutation.value };
}

function mutateCreatureBodyBagField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureBodyBagMutation,
): SupportedGffField {
  return mutateExactCreatureScalarField(
    entry,
    sourceIndex,
    "BodyBag",
    "byte",
    mutation.expectedValue,
    mutation.value,
  );
}

function mutateCreatureDecayTimeField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureDecayTimeMutation,
): SupportedGffField {
  return mutateExactCreatureScalarField(
    entry,
    sourceIndex,
    "DecayTime",
    "dword",
    mutation.expectedMilliseconds,
    mutation.valueMilliseconds,
  );
}

function mutateExactCreatureScalarField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  nativeLabel: "BodyBag" | "DecayTime",
  nativeType: "byte" | "dword",
  expectedValue: number,
  value: number,
): SupportedGffField {
  const normalizedLabel = nativeLabel.toLowerCase();
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === normalizedLabel,
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === nativeLabel);
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== nativeType
  ) {
    throw mutationInvalid(`Creature ${nativeLabel} mutation requires one canonical native ${nativeType === "byte" ? "Byte" : "DWord"} field.`, [
      `creature:index=${sourceIndex}:${nativeLabel}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== expectedValue) {
    throw mutationInvalid(`Creature ${nativeLabel} source value differs from retained provenance.`, [
      `creature:index=${sourceIndex}:${nativeLabel}:stale_source`,
    ]);
  }
  return { label: nativeLabel, type: nativeType, value } as SupportedGffField;
}

function mutateCreatureAppearanceField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureAppearanceMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "appearance_type",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "Appearance_Type",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "word"
  ) {
    throw mutationInvalid("Creature Appearance mutation requires one canonical native Word field.", [
      `creature:index=${sourceIndex}:Appearance_Type:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature Appearance source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:Appearance_Type:stale_source`,
    ]);
  }
  return { label: "Appearance_Type", type: "word", value: mutation.value };
}

function mutateCreatureGenderField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureGenderMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "gender",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Gender");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "byte"
  ) {
    throw mutationInvalid("Creature Gender mutation requires one canonical native Byte field.", [
      `creature:index=${sourceIndex}:Gender:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature Gender source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:Gender:stale_source`,
    ]);
  }
  return { label: "Gender", type: "byte", value: mutation.value };
}

function mutateCreaturePerceptionRangeField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreaturePerceptionRangeMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "perceptionrange",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "PerceptionRange",
  );
  const field = exactMatches[0];
  if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
    field?.type !== "byte") {
    throw mutationInvalid(
      "Creature PerceptionRange mutation requires one canonical native Byte field.",
      [
        `creature:index=${sourceIndex}:PerceptionRange:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Creature PerceptionRange source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:PerceptionRange:stale_source`],
    );
  }
  return { label: "PerceptionRange", type: "byte", value: mutation.value };
}

function mutateCreatureWalkRateField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureWalkRateMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "walkrate",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "WalkRate");
  const field = exactMatches[0];
  if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
    field?.type !== "int") {
    throw mutationInvalid(
      "Creature WalkRate mutation requires one canonical native Int field.",
      [
        `creature:index=${sourceIndex}:WalkRate:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Creature WalkRate source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:WalkRate:stale_source`],
    );
  }
  return { label: "WalkRate", type: "int", value: mutation.value };
}

function mutateCreatureSoundSetFileField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureSoundSetFileMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "soundsetfile",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "SoundSetFile");
  const field = exactMatches[0];
  if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
    field?.type !== "word") {
    throw mutationInvalid(
      "Creature SoundSetFile mutation requires one canonical native Word field.",
      [
        `creature:index=${sourceIndex}:SoundSetFile:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Creature SoundSetFile source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:SoundSetFile:stale_source`],
    );
  }
  return { label: "SoundSetFile", type: "word", value: mutation.value };
}

function mutateCreatureStartingPackageField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureStartingPackageMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "startingpackage",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "StartingPackage",
  );
  const field = exactMatches[0];
  if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
    field?.type !== "byte") {
    throw mutationInvalid(
      "Creature StartingPackage mutation requires one canonical native Byte field.",
      [
        `creature:index=${sourceIndex}:StartingPackage:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Creature StartingPackage source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:StartingPackage:stale_source`],
    );
  }
  const classIds = readCanonicalCreatureClassIds(entry.fields);
  if (!classIds || classIds.length !== mutation.expectedClassIds.length ||
    classIds.some((classId, index) => classId !== mutation.expectedClassIds[index])) {
    throw mutationInvalid(
      "Creature StartingPackage ClassList differs from retained provenance.",
      [`creature:index=${sourceIndex}:StartingPackage:stale_class_list`],
    );
  }
  return { label: "StartingPackage", type: "byte", value: mutation.value };
}

function mutateCreatureSkillListField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureSkillListMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "skilllist");
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "SkillList" || list.type !== "list") {
    throw mutationInvalid(
      "Creature SkillList mutation requires one canonical native List field.",
      [`creature:index=${sourceIndex}:SkillList:missing_or_ambiguous`],
    );
  }
  if (list.value.length !== mutation.expectedRanks.length) {
    throw mutationInvalid("Creature SkillList source length differs from retained provenance.", [
      `creature:index=${sourceIndex}:SkillList:stale_source_length`,
    ]);
  }
  const retained = list.value.map((skillEntry, rankIndex) => {
    const rankMatches = skillEntry.fields.filter(
      (field) => field.label.toLowerCase() === "rank",
    );
    const rank = rankMatches[0];
    if (skillEntry.typeId !== 0 || rankMatches.length !== 1 || rank?.label !== "Rank" ||
      rank.type !== "byte" || rank.value !== mutation.expectedRanks[rankIndex]) {
      throw mutationInvalid("Creature SkillList source vector differs from retained provenance.", [
        `creature:index=${sourceIndex}:SkillList:stale_source_vector`,
      ]);
    }
    return {
      typeId: 0,
      fields: skillEntry.fields.map((field) => field === rank
        ? { label: "Rank", type: "byte" as const, value: mutation.ranks[rankIndex]! }
        : field),
    };
  });
  const target = retained.slice(0, mutation.rowCount);
  for (let rankIndex = target.length; rankIndex < mutation.rowCount; rankIndex += 1) {
    target.push({
      typeId: 0,
      fields: [{ label: "Rank", type: "byte", value: mutation.ranks[rankIndex]! }],
    });
  }
  return { label: "SkillList", type: "list", value: target };
}

function mutateCreatureFeatListField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureFeatListMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "featlist");
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "FeatList" || list.type !== "list") {
    throw mutationInvalid(
      "Creature FeatList mutation requires one canonical native List field.",
      [`creature:index=${sourceIndex}:FeatList:missing_or_ambiguous`],
    );
  }
  if (list.value.length !== mutation.expectedFeatIds.length) {
    throw mutationInvalid("Creature FeatList source length differs from retained provenance.", [
      `creature:index=${sourceIndex}:FeatList:stale_source_length`,
    ]);
  }
  list.value.forEach((featEntry, featIndex) => {
    const featMatches = featEntry.fields.filter(
      (field) => field.label.toLowerCase() === "feat",
    );
    const feat = featMatches[0];
    if (featEntry.typeId !== 1 || featMatches.length !== 1 || feat?.label !== "Feat" ||
      feat.type !== "word" || feat.value !== mutation.expectedFeatIds[featIndex] ||
      featEntry.fields.length !== 1 || mutation.opaqueSiblingFieldCounts[featIndex] !== 0) {
      throw mutationInvalid("Creature FeatList source vector differs from retained provenance.", [
        `creature:index=${sourceIndex}:FeatList:stale_or_noncanonical_source`,
      ]);
    }
  });
  return {
    label: "FeatList",
    type: "list",
    value: mutation.featIds.map((featId) => ({
      typeId: 1,
      fields: [{ label: "Feat", type: "word", value: featId }],
    })),
  };
}

function mutateCreatureSpecialAbilityListField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureSpecialAbilityListMutation,
): SupportedGffField {
  const matches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "specabilitylist",
  );
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "SpecAbilityList" || list.type !== "list") {
    throw mutationInvalid(
      "Creature SpecAbilityList mutation requires one canonical native List field.",
      [`creature:index=${sourceIndex}:SpecAbilityList:missing_or_ambiguous`],
    );
  }
  const expectedPhysical = mutation.expectedEntries.flatMap((profile) =>
    Array.from({ length: profile.uses }, () => profile));
  if (list.value.length !== expectedPhysical.length) {
    throw mutationInvalid(
      "Creature SpecAbilityList source length differs from retained provenance.",
      [`creature:index=${sourceIndex}:SpecAbilityList:stale_source_length`],
    );
  }
  list.value.forEach((abilityEntry, abilityIndex) => {
    const expected = expectedPhysical[abilityIndex]!;
    const spellMatches = abilityEntry.fields.filter(
      (field) => field.label.toLowerCase() === "spell",
    );
    const flagsMatches = abilityEntry.fields.filter(
      (field) => field.label.toLowerCase() === "spellflags",
    );
    const casterMatches = abilityEntry.fields.filter(
      (field) => field.label.toLowerCase() === "spellcasterlevel",
    );
    const spell = spellMatches[0];
    const flags = flagsMatches[0];
    const caster = casterMatches[0];
    if (abilityEntry.typeId !== 4 || spellMatches.length !== 1 ||
      spell?.label !== "Spell" || spell.type !== "word" ||
      spell.value !== expected.spellId || flagsMatches.length !== 1 ||
      flags?.label !== "SpellFlags" || flags.type !== "byte" || flags.value !== 1 ||
      casterMatches.length !== 1 || caster?.label !== "SpellCasterLevel" ||
      caster.type !== "byte" || caster.value !== expected.casterLevel ||
      abilityEntry.fields.length !== 3) {
      throw mutationInvalid(
        "Creature SpecAbilityList differs from retained canonical provenance.",
        [`creature:index=${sourceIndex}:SpecAbilityList:stale_or_noncanonical_source`],
      );
    }
  });
  return {
    label: "SpecAbilityList",
    type: "list",
    value: mutation.entries.flatMap((profile) => Array.from(
      { length: profile.uses },
      () => ({
        typeId: 4,
        fields: [
          { label: "Spell", type: "word" as const, value: profile.spellId },
          { label: "SpellFlags", type: "byte" as const, value: 1 },
          {
            label: "SpellCasterLevel",
            type: "byte" as const,
            value: profile.casterLevel,
          },
        ],
      }),
    )),
  };
}

function mutateCreatureClassLevelField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureClassLevelMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label.toLowerCase() === "classlist");
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "ClassList" || list.type !== "list") {
    throw mutationInvalid(
      "Creature ClassLevel mutation requires one canonical native ClassList.",
      [`creature:index=${sourceIndex}:ClassList:missing_or_ambiguous`],
    );
  }
  if (list.value.length !== mutation.expectedClassIds.length) {
    throw mutationInvalid("Creature ClassList length differs from retained provenance.", [
      `creature:index=${sourceIndex}:ClassList:stale_source_length`,
    ]);
  }
  const retained = list.value.map((classEntry, classIndex) => {
    const classMatches = classEntry.fields.filter(
      (field) => field.label.toLowerCase() === "class",
    );
    const levelMatches = classEntry.fields.filter(
      (field) => field.label.toLowerCase() === "classlevel",
    );
    const classField = classMatches[0];
    const levelField = levelMatches[0];
    if (classEntry.typeId !== 2 || classMatches.length !== 1 ||
      classField?.label !== "Class" || classField.type !== "int" ||
      levelMatches.length !== 1 || levelField?.label !== "ClassLevel" ||
      levelField.type !== "short") {
      throw mutationInvalid(
        "Creature ClassLevel mutation requires canonical type-2 ClassList entries.",
        [`creature:index=${sourceIndex}:ClassList:index=${classIndex}:invalid_native_shape`],
      );
    }
    if (classField.value !== mutation.expectedClassIds[classIndex] ||
      levelField.value !== mutation.expectedLevels[classIndex] ||
      classEntry.fields.length - 2 !== mutation.opaqueSiblingFieldCounts[classIndex]) {
      throw mutationInvalid("Creature ClassList differs from retained provenance.", [
        `creature:index=${sourceIndex}:ClassList:index=${classIndex}:stale_source`,
      ]);
    }
    return {
      typeId: 2,
      fields: classEntry.fields.map((field) => field === levelField
        ? {
            label: "ClassLevel",
            type: "short" as const,
            value: mutation.levels[classIndex]!,
          }
        : field),
    };
  });
  return { label: "ClassList", type: "list", value: retained };
}

function mutateCreatureClassIdentityFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureClassIdentityMutation,
): Readonly<{
  classList: SupportedGffField;
  startingPackage: SupportedGffField;
}> {
  const classListMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "classlist",
  );
  const classList = classListMatches[0];
  if (classListMatches.length !== 1 || classList?.label !== "ClassList" ||
    classList.type !== "list") {
    throw mutationInvalid(
      "Creature class-identity mutation requires one canonical native ClassList.",
      [`creature:index=${sourceIndex}:ClassList:missing_or_ambiguous`],
    );
  }
  const analysis = analyzeAreaCreatureClassListField(classList);
  if (!analysis || analysis.classListGraphSha256 !== mutation.classListGraphSha256 ||
    analysis.entries.length !== mutation.expectedClassIds.length ||
    analysis.entries.some((classEntry, index) =>
      classEntry.classId !== mutation.expectedClassIds[index] ||
      classEntry.level !== mutation.expectedLevels[index])) {
    throw mutationInvalid(
      "Creature ClassList graph differs from retained class-identity provenance.",
      [`creature:index=${sourceIndex}:ClassList:stale_source_graph`],
    );
  }

  const packageMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "startingpackage",
  );
  const sourcePackage = packageMatches[0];
  if (packageMatches.length !== 1 || sourcePackage?.label !== "StartingPackage" ||
    sourcePackage.type !== "byte") {
    throw mutationInvalid(
      "Creature class-identity mutation requires one canonical native StartingPackage.",
      [`creature:index=${sourceIndex}:StartingPackage:missing_or_ambiguous`],
    );
  }
  if (sourcePackage.value !== mutation.expectedStartingPackage) {
    throw mutationInvalid(
      "Creature StartingPackage differs from retained class-identity provenance.",
      [`creature:index=${sourceIndex}:StartingPackage:stale_source`],
    );
  }

  const replacedClassList = replaceAreaCreatureClassIdsAndClearSpellLists(
    classList,
    mutation.expectedClassIds,
    mutation.classIds,
    mutation.levels,
  );
  if (!replacedClassList) {
    throw mutationInvalid(
      "Creature ClassList could not be rewritten under the same-roster destructive-clear contract.",
      [`creature:index=${sourceIndex}:ClassList:rewrite_refused`],
    );
  }
  return Object.freeze({
    classList: replacedClassList,
    startingPackage: {
      label: "StartingPackage",
      type: "byte",
      value: mutation.startingPackage,
    },
  });
}

function mutateCreatureClassSlotResizeFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureClassSlotResizeMutation,
): Readonly<{
  classList: SupportedGffField;
  startingPackage: SupportedGffField;
}> {
  const classListMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "classlist",
  );
  const classList = classListMatches[0];
  if (classListMatches.length !== 1 || classList?.label !== "ClassList" ||
    classList.type !== "list") {
    throw mutationInvalid(
      "Creature class-slot resize requires one canonical native ClassList.",
      [`creature:index=${sourceIndex}:ClassList:missing_or_ambiguous`],
    );
  }
  const analysis = analyzeAreaCreatureClassListField(classList);
  if (!analysis || analysis.classListGraphSha256 !== mutation.classListGraphSha256 ||
    analysis.entries.length !== mutation.expectedClassIds.length ||
    analysis.entries.some((classEntry, index) =>
      classEntry.classId !== mutation.expectedClassIds[index] ||
      classEntry.level !== mutation.expectedLevels[index])) {
    throw mutationInvalid(
      "Creature ClassList graph differs from retained class-slot provenance.",
      [`creature:index=${sourceIndex}:ClassList:stale_source_graph`],
    );
  }
  const packageMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "startingpackage",
  );
  const sourcePackage = packageMatches[0];
  if (packageMatches.length !== 1 || sourcePackage?.label !== "StartingPackage" ||
    sourcePackage.type !== "byte" || sourcePackage.value !== mutation.expectedStartingPackage) {
    throw mutationInvalid(
      "Creature class-slot resize requires the exact canonical StartingPackage source.",
      [`creature:index=${sourceIndex}:StartingPackage:stale_or_ambiguous`],
    );
  }
  const resized = resizeAreaCreatureClassListTail(
    classList,
    mutation.expectedClassIds,
    mutation.expectedLevels,
    mutation.classIds,
    mutation.levels,
  );
  if (!resized) {
    throw mutationInvalid(
      "Creature ClassList could not be rewritten under the tail-only resize contract.",
      [`creature:index=${sourceIndex}:ClassList:resize_refused`],
    );
  }
  return Object.freeze({
    classList: resized,
    startingPackage: {
      label: "StartingPackage",
      type: "byte",
      value: mutation.startingPackage,
    },
  });
}

function readCanonicalCreatureClassIds(
  fields: readonly SupportedGffField[],
): readonly number[] | null {
  const matches = fields.filter((field) => field.label.toLowerCase() === "classlist");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "ClassList" || field.type !== "list" ||
    field.value.length < 1 || field.value.length > 8) return null;
  const classIds: number[] = [];
  for (const entry of field.value) {
    if (entry.typeId !== 2) return null;
    const classMatches = entry.fields.filter((candidate) =>
      candidate.label.toLowerCase() === "class");
    const levelMatches = entry.fields.filter((candidate) =>
      candidate.label.toLowerCase() === "classlevel");
    const classField = classMatches[0];
    const levelField = levelMatches[0];
    if (classMatches.length !== 1 || classField?.label !== "Class" ||
      classField.type !== "int" || !Number.isSafeInteger(classField.value) ||
      classField.value < 0 || levelMatches.length !== 1 ||
      levelField?.label !== "ClassLevel" || levelField.type !== "short" ||
      !Number.isSafeInteger(levelField.value) || levelField.value < 0 ||
      classIds.includes(classField.value)) return null;
    classIds.push(classField.value);
  }
  return Object.freeze(classIds);
}

function mutateCreaturePhenotypeField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreaturePhenotypeMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "phenotype",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "Phenotype");
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "int"
  ) {
    throw mutationInvalid("Creature Phenotype mutation requires one canonical native Int field.", [
      `creature:index=${sourceIndex}:Phenotype:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature Phenotype source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:Phenotype:stale_source`,
    ]);
  }
  return { label: "Phenotype", type: "int", value: mutation.value };
}

function mutateCreaturePortraitField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreaturePortraitMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "portraitid",
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === "PortraitId");
  const field = exactMatches[0];
  if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
    field?.type !== "word") {
    throw mutationInvalid(
      "Creature PortraitId mutation requires one canonical native Word field.",
      [
        `creature:index=${sourceIndex}:PortraitId:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature PortraitId source differs from retained provenance.", [
      `creature:index=${sourceIndex}:PortraitId:stale_source`,
    ]);
  }
  return { label: "PortraitId", type: "word", value: mutation.value };
}

function mutateCreatureChallengeRatingField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureChallengeRatingMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "challengerating",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "ChallengeRating",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "float"
  ) {
    throw mutationInvalid(
      "Creature ChallengeRating mutation requires one canonical native Float field.",
      [
        `creature:index=${sourceIndex}:ChallengeRating:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (!Object.is(field.value, mutation.expectedValue)) {
    throw mutationInvalid(
      "Creature ChallengeRating source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:ChallengeRating:stale_source`],
    );
  }
  return { label: "ChallengeRating", type: "float", value: mutation.value };
}

function mutateCreatureAbilityScoreFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureAbilityScoreMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of AREA_CREATURE_ABILITY_SCORE_FIELDS) {
    const mutation = mutations[definition.key];
    if (!mutation) continue;
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.nativeLabel.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter(
      (field) => field.label === definition.nativeLabel,
    );
    const field = exactMatches[0];
    if (
      caseInsensitiveMatches.length !== 1 ||
      exactMatches.length !== 1 ||
      field?.type !== "byte"
    ) {
      throw mutationInvalid(
        "Creature base ability-score mutation requires one canonical native Byte field.",
        [
          `creature:index=${sourceIndex}:${definition.nativeLabel}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    if (field.value !== mutation.expectedValue) {
      throw mutationInvalid(
        "Creature base ability-score source value differs from retained provenance.",
        [`creature:index=${sourceIndex}:${definition.nativeLabel}:stale_source`],
      );
    }
    replacements.set(definition.nativeLabel, {
      label: definition.nativeLabel,
      type: "byte",
      value: mutation.value,
    });
  }
  return replacements;
}

function mutateCreatureAppearanceColorFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureAppearanceColorMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of AREA_CREATURE_APPEARANCE_COLOR_FIELDS) {
    const mutation = mutations[definition.key];
    if (!mutation) continue;
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.nativeLabel.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter(
      (field) => field.label === definition.nativeLabel,
    );
    const field = exactMatches[0];
    if (
      caseInsensitiveMatches.length !== 1 ||
      exactMatches.length !== 1 ||
      field?.type !== "byte"
    ) {
      throw mutationInvalid(
        "Creature appearance-color mutation requires one canonical native Byte field.",
        [
          `creature:index=${sourceIndex}:${definition.nativeLabel}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    if (field.value !== mutation.expectedValue) {
      throw mutationInvalid(
        "Creature appearance-color source value differs from retained provenance.",
        [`creature:index=${sourceIndex}:${definition.nativeLabel}:stale_source`],
      );
    }
    replacements.set(definition.nativeLabel, {
      label: definition.nativeLabel,
      type: "byte",
      value: mutation.value,
    });
  }
  return replacements;
}

function mutateCreatureBodyPartFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureBodyPartMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of AREA_CREATURE_BODY_PART_FIELDS) {
    const mutation = mutations[definition.key];
    if (!mutation) continue;
    const legacyMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.legacyLabel.toLowerCase(),
    );
    const wideMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.wideLabel.toLowerCase(),
    );
    const legacyField = legacyMatches.find((field) => field.label === definition.legacyLabel);
    const wideField = wideMatches.find((field) => field.label === definition.wideLabel);
    if (
      legacyMatches.length > 1 ||
      wideMatches.length > 1 ||
      legacyMatches.length !== (legacyField ? 1 : 0) ||
      wideMatches.length !== (wideField ? 1 : 0) ||
      (legacyField !== undefined && legacyField.type !== "byte") ||
      (wideField !== undefined && wideField.type !== "word") ||
      (legacyField === undefined && wideField === undefined)
    ) {
      throw mutationInvalid(
        "Creature body-part mutation requires exact retained native Byte/Word storage.",
        [
          `creature:index=${sourceIndex}:${definition.key}:legacy_count=${legacyMatches.length}:wide_count=${wideMatches.length}`,
        ],
      );
    }
    const legacyValue = legacyField?.type === "byte" ? legacyField.value : undefined;
    const wideValue = wideField?.type === "word" ? wideField.value : undefined;
    const storage = readAreaCreatureBodyPartStorage({
      present: true,
      value: wideValue ?? legacyValue,
      legacyByte: legacyValue === undefined
        ? { present: false }
        : { present: true, nativeType: "byte", value: legacyValue },
      wideWord: wideValue === undefined
        ? { present: false }
        : { present: true, nativeType: "word", value: wideValue },
    });
    const maximum = maximumAreaCreatureBodyPartTarget(storage);
    if (!storage?.present || maximum === null) {
      throw mutationInvalid("Creature body-part source storage is not canonical.", [
        `creature:index=${sourceIndex}:${definition.key}:invalid_compatibility_pair`,
      ]);
    }
    if (storage.value !== mutation.expectedValue) {
      throw mutationInvalid(
        "Creature body-part source value differs from retained provenance.",
        [`creature:index=${sourceIndex}:${definition.key}:stale_source`],
      );
    }
    if (mutation.value > maximum) {
      throw mutationInvalid("Creature body-part target exceeds retained native capacity.", [
        `creature:index=${sourceIndex}:${definition.key}:maximum=${maximum}`,
      ]);
    }
    if (legacyField) {
      replacements.set(definition.legacyLabel, {
        label: definition.legacyLabel,
        type: "byte",
        value: mutation.value <= 0xff ? mutation.value : 0,
      });
    }
    if (wideField) {
      replacements.set(definition.wideLabel, {
        label: definition.wideLabel,
        type: "word",
        value: mutation.value,
      });
    }
  }
  return replacements;
}

function mutateCreatureAppendageFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureAppendageMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of AREA_CREATURE_APPENDAGE_FIELDS) {
    const mutation = mutations[definition.key];
    if (!mutation) continue;
    const modernMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.modernLabel.toLowerCase(),
    );
    const legacyMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.legacyLabel.toLowerCase(),
    );
    const modernField = modernMatches.find((field) => field.label === definition.modernLabel);
    const legacyField = legacyMatches.find((field) => field.label === definition.legacyLabel);
    if (
      modernMatches.length !== 1 ||
      modernField?.type !== "dword" ||
      legacyMatches.length > 1 ||
      legacyMatches.length !== (legacyField ? 1 : 0) ||
      (legacyField !== undefined && legacyField.type !== "byte")
    ) {
      throw mutationInvalid(
        "Creature appendage mutation requires one modern DWord and an optional exact legacy Byte.",
        [
          `creature:index=${sourceIndex}:${definition.key}:modern_count=${modernMatches.length}:legacy_count=${legacyMatches.length}`,
        ],
      );
    }
    const storage = readAreaCreatureAppendageStorage({
      present: true,
      value: modernField.value,
      modernDword: { present: true, nativeType: "dword", value: modernField.value },
      legacyByte: legacyField?.type === "byte"
        ? { present: true, nativeType: "byte", value: legacyField.value }
        : { present: false },
    });
    if (!storage?.present || storage.value !== mutation.expectedValue) {
      throw mutationInvalid(
        "Creature appendage source value differs from retained provenance.",
        [`creature:index=${sourceIndex}:${definition.key}:stale_source`],
      );
    }
    replacements.set(definition.modernLabel, {
      label: definition.modernLabel,
      type: "dword",
      value: mutation.value,
    });
  }
  return replacements;
}

function mutateCreatureHitPointFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureHitPointMutation,
): ReadonlyMap<string, SupportedGffField> {
  const definitions = [
    { label: "HitPoints", type: "short" as const, expected: mutation.expectedHitPoints, value: mutation.hitPoints },
    { label: "CurrentHitPoints", type: "short" as const, expected: mutation.expectedCurrentHitPoints, value: mutation.currentHitPoints },
    { label: "MaxHitPoints", type: "short" as const, expected: mutation.expectedMaxHitPoints, value: mutation.maxHitPoints },
  ];
  const replacements = new Map<string, SupportedGffField>();
  const requireExact = (
    label: string,
    type: SupportedGffField["type"],
    expected: number,
  ): void => {
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter((field) => field.label === label);
    const field = exactMatches[0];
    if (caseInsensitiveMatches.length !== 1 || exactMatches.length !== 1 ||
      field?.type !== type) {
      throw mutationInvalid(
        "Creature hit-point mutation requires one canonical native field per member.",
        [`creature:index=${sourceIndex}:${label}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`],
      );
    }
    if (field.value !== expected) {
      throw mutationInvalid("Creature hit-point source differs from retained provenance.", [
        `creature:index=${sourceIndex}:${label}:stale_source`,
      ]);
    }
  };
  requireExact("Con", "byte", mutation.expectedConstitution);
  requireExact("Race", "byte", mutation.race);
  for (const definition of definitions) {
    requireExact(definition.label, definition.type, definition.expected);
    replacements.set(definition.label, {
      label: definition.label,
      type: definition.type,
      value: definition.value,
    });
  }
  return replacements;
}

function mutateCreatureNaturalArmorClassField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureNaturalArmorClassMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "naturalac",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "NaturalAC",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "byte"
  ) {
    throw mutationInvalid(
      "Creature NaturalAC mutation requires one canonical native Byte field.",
      [
        `creature:index=${sourceIndex}:NaturalAC:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
      ],
    );
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(
      "Creature NaturalAC source value differs from retained provenance.",
      [`creature:index=${sourceIndex}:NaturalAC:stale_source`],
    );
  }
  return { label: "NaturalAC", type: "byte", value: mutation.value };
}

function mutateCreatureSavingThrowBonusFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutations: ExistingAreaCreatureSavingThrowBonusMutations,
): ReadonlyMap<string, SupportedGffField> {
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of AREA_CREATURE_SAVING_THROW_BONUS_FIELDS) {
    const mutation = mutations[definition.key];
    if (!mutation) continue;
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.nativeLabel.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter(
      (field) => field.label === definition.nativeLabel,
    );
    const field = exactMatches[0];
    if (
      caseInsensitiveMatches.length !== 1 ||
      exactMatches.length !== 1 ||
      field?.type !== "short"
    ) {
      throw mutationInvalid(
        "Creature saving-throw bonus mutation requires one canonical native Short field.",
        [
          `creature:index=${sourceIndex}:${definition.nativeLabel}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    if (field.value !== mutation.expectedValue) {
      throw mutationInvalid(
        "Creature saving-throw bonus source value differs from retained provenance.",
        [`creature:index=${sourceIndex}:${definition.nativeLabel}:stale_source`],
      );
    }
    replacements.set(definition.nativeLabel, {
      label: definition.nativeLabel,
      type: "short",
      value: mutation.value,
    });
  }
  return replacements;
}

function mutateCreatureAlignmentFields(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureAlignmentMutation,
): ReadonlyMap<string, SupportedGffField> {
  const definitions = [
    {
      label: "GoodEvil",
      expectedValue: mutation.expectedGoodEvil,
      value: mutation.goodEvil,
    },
    {
      label: "LawfulChaotic",
      expectedValue: mutation.expectedLawfulChaotic,
      value: mutation.lawfulChaotic,
    },
  ] as const;
  const replacements = new Map<string, SupportedGffField>();
  for (const definition of definitions) {
    const caseInsensitiveMatches = entry.fields.filter(
      (field) => field.label.toLowerCase() === definition.label.toLowerCase(),
    );
    const exactMatches = caseInsensitiveMatches.filter(
      (field) => field.label === definition.label,
    );
    const field = exactMatches[0];
    if (
      caseInsensitiveMatches.length !== 1 ||
      exactMatches.length !== 1 ||
      field?.type !== "byte"
    ) {
      throw mutationInvalid(
        "Creature alignment mutation requires two canonical native Byte fields.",
        [
          `creature:index=${sourceIndex}:${definition.label}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
        ],
      );
    }
    if (field.value !== definition.expectedValue) {
      throw mutationInvalid("Creature alignment source value differs from retained provenance.", [
        `creature:index=${sourceIndex}:${definition.label}:stale_source`,
      ]);
    }
    replacements.set(definition.label, {
      label: definition.label,
      type: "byte",
      value: definition.value,
    });
  }
  return replacements;
}

function mutateCreatureFactionField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureFactionMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "factionid",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "FactionID",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "word"
  ) {
    throw mutationInvalid("Creature FactionID mutation requires one canonical native Word field.", [
      `creature:index=${sourceIndex}:FactionID:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Creature FactionID source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:FactionID:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "FactionID", type: "word", value: mutation.value };
}

function mutateCreatureTemplateResRefField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureTemplateResRefMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === "TemplateResRef",
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid("Creature TemplateResRef mutation requires one canonical native ResRef field.", [
      `creature:index=${sourceIndex}:TemplateResRef:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid("Creature TemplateResRef source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:TemplateResRef:expected=${mutation.expectedResRef}:actual=${field.value}`,
    ]);
  }
  return { label: "TemplateResRef", type: "resref", value: mutation.resRef };
}

function mutateCreatureScriptResRefField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaCreatureScriptResRefMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === mutation.field.toLowerCase(),
  );
  const exactMatches = caseInsensitiveMatches.filter(
    (field) => field.label === mutation.field,
  );
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "resref"
  ) {
    throw mutationInvalid("Creature script mutation requires one canonical native ResRef field.", [
      `creature:index=${sourceIndex}:${mutation.field}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedResRef) {
    throw mutationInvalid("Creature script source value differs from retained provenance.", [
      `creature:index=${sourceIndex}:${mutation.field}:stale_source`,
    ]);
  }
  return { label: mutation.field, type: "resref", value: mutation.resRef };
}

function mutateCreatureSpecialIdentityStringField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  label: "Subrace" | "Deity",
  mutation: ExistingAreaCreatureSpecialIdentityStringMutation,
): SupportedGffField {
  const caseInsensitiveMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === label.toLowerCase(),
  );
  const exactMatches = caseInsensitiveMatches.filter((field) => field.label === label);
  const field = exactMatches[0];
  if (
    caseInsensitiveMatches.length !== 1 ||
    exactMatches.length !== 1 ||
    field?.type !== "cexostring"
  ) {
    throw mutationInvalid(`Creature ${label} mutation requires one canonical native CExoString field.`, [
      `creature:index=${sourceIndex}:${label}:count=${exactMatches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(`Creature ${label} source value differs from retained provenance.`, [
      `creature:index=${sourceIndex}:${label}:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label, type: "cexostring", value: mutation.value };
}

function mutatePlaceableAppearanceField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableAppearanceMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "Appearance");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "dword") {
    throw mutationInvalid("Placeable Appearance mutation requires one native DWord field.", [
      `placeable:index=${sourceIndex}:Appearance:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable Appearance source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:Appearance:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "Appearance", type: "dword", value: mutation.value };
}

function mutatePlaceableTrapTypeField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableTrapTypeMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "TrapType");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid("Placeable TrapType mutation requires one native Byte field.", [
      `placeable:index=${sourceIndex}:TrapType:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable TrapType source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:TrapType:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "TrapType", type: "byte", value: mutation.value };
}

function mutatePlaceableBodyBagField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableBodyBagMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "BodyBag");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid("Placeable BodyBag mutation requires one native Byte field.", [
      `placeable:index=${sourceIndex}:BodyBag:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable BodyBag source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:BodyBag:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "BodyBag", type: "byte", value: mutation.value };
}

function mutatePlaceablePortraitField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceablePortraitMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "PortraitId");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "word") {
    throw mutationInvalid("Placeable PortraitId mutation requires one native Word field.", [
      `placeable:index=${sourceIndex}:PortraitId:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable PortraitId source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:PortraitId:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "PortraitId", type: "word", value: mutation.value };
}

function mutatePlaceableFactionField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableFactionMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "Faction");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "dword") {
    throw mutationInvalid("Placeable Faction mutation requires one native DWord field.", [
      `placeable:index=${sourceIndex}:Faction:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable Faction source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:Faction:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "Faction", type: "dword", value: mutation.value };
}

function mutatePlaceableShortField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  label: "HP" | "CurrentHP",
  expectedValue: number,
  value: number,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === label);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "short") {
    throw mutationInvalid(`Placeable ${label} mutation requires one native Short field.`, [
      `placeable:index=${sourceIndex}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== expectedValue) {
    throw mutationInvalid(`Placeable ${label} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${label}:expected=${expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label, type: "short", value };
}

function mutateObjectEditorCommentEntry(
  entry: GffListField["value"][number],
  mutation: ExistingAreaObjectPropertyMutation,
): GffListField["value"][number] {
  const editorComment = mutation.editorComment;
  if (!editorComment) return entry;
  const matches = entry.fields.filter((field) => field.label === "Comment");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "cexostring") {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} editor Comment mutation requires one paired native CExoString.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:Comment:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== editorComment.expectedValue) {
    throw mutationInvalid(`${capitalizeKind(mutation.kind)} editor Comment differs from retained paired-GIC provenance.`, [
      `${mutation.kind}:index=${mutation.sourceIndex}:Comment:expected=${editorComment.expectedValue}:actual=${field.value}`,
    ]);
  }
  return {
    typeId: entry.typeId,
    fields: entry.fields.map((candidate) => candidate.label === "Comment"
      ? { label: "Comment", type: "cexostring", value: editorComment.value }
      : candidate),
  };
}

function mutateCreatureInventoryFields(
  sourceCreature: GffListField["value"][number],
  creatureIndex: number,
  mutation: ExistingAreaCreatureInventoryMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const matches = sourceCreature.fields.filter(
    (field) => field.label.toLowerCase() === "itemlist",
  );
  if (mutation.expectedEntries.length === 0) {
    if (matches.length !== 0) {
      throw mutationInvalid("Empty Creature inventory provenance requires an absent native ItemList.", [
        `creature:index=${creatureIndex}:ItemList:count=${matches.length}:expected=0`,
      ]);
    }
  } else if (
    matches.length !== 1
    || matches[0]?.label !== "ItemList"
    || matches[0].type !== "list"
  ) {
    throw mutationInvalid("Creature inventory mutation requires one canonical native ItemList.", [
      `creature:index=${creatureIndex}:ItemList:count=${matches.length}:label=${matches[0]?.label ?? "missing"}:type=${matches[0]?.type ?? "missing"}`,
    ]);
  }

  const nativeEntries = matches[0]?.label === "ItemList" && matches[0].type === "list"
    ? matches[0].value
    : [];
  if (nativeEntries.length !== mutation.expectedEntries.length) {
    throw mutationInvalid("Native Creature ItemList cardinality differs from retained provenance.", [
      `creature:index=${creatureIndex}:ItemList:expected=${mutation.expectedEntries.length}:actual=${nativeEntries.length}`,
    ]);
  }
  mutation.expectedEntries.forEach((expected, sourceIndex) =>
    validateNativeCreatureInventoryEntry(nativeEntries[sourceIndex], expected, creatureIndex)
  );

  const targetEntries = mutation.entries.map((target, targetIndex) => {
    if ("sourceIndex" in target) {
      const source = nativeEntries[target.sourceIndex];
      if (!source) {
        throw mutationInvalid("Retained Creature inventory ordinal is missing from the native ItemList.", [
          `creature:index=${creatureIndex}:ItemList:entry=${targetIndex}:source=${target.sourceIndex}:missing`,
        ]);
      }
      const embeddedFields = source.fields.filter((field) =>
        !["Repos_PosX", "Repos_Posy", "Dropable", "Pickpocketable"].includes(field.label)
      );
      return {
        typeId: targetIndex,
        fields: appendCreatureInventoryPlacementFields(embeddedFields, target),
      };
    }
    return buildNewCreatureInventoryEntry(target, creatureIndex, targetIndex);
  });

  if (targetEntries.length === 0) {
    return baseFields.filter((field) => field.label !== "ItemList");
  }
  const targetList: GffListField = { label: "ItemList", type: "list", value: targetEntries };
  if (matches.length === 0) return [...baseFields, targetList];
  return baseFields.map((field) => field.label === "ItemList" ? targetList : field);
}

function mutateCreatureEquipmentFields(
  sourceCreature: GffListField["value"][number],
  creatureIndex: number,
  mutation: ExistingAreaCreatureEquipmentMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const matches = sourceCreature.fields.filter(
    (field) => field.label.toLowerCase().replaceAll("_", "") === "equipitemlist",
  );
  if (mutation.expectedEntries.length === 0) {
    if (matches.length !== 0) {
      throw mutationInvalid("Empty Creature equipment provenance requires an absent native Equip_ItemList.", [
        `creature:index=${creatureIndex}:Equip_ItemList:count=${matches.length}:expected=0`,
      ]);
    }
  } else if (
    matches.length !== 1
    || matches[0]?.label !== "Equip_ItemList"
    || matches[0].type !== "list"
  ) {
    throw mutationInvalid("Creature equipment mutation requires one canonical native Equip_ItemList.", [
      `creature:index=${creatureIndex}:Equip_ItemList:count=${matches.length}:label=${matches[0]?.label ?? "missing"}:type=${matches[0]?.type ?? "missing"}`,
    ]);
  }

  const nativeEntries = matches[0]?.label === "Equip_ItemList" && matches[0].type === "list"
    ? matches[0].value
    : [];
  if (nativeEntries.length !== mutation.expectedEntries.length) {
    throw mutationInvalid("Native Creature Equip_ItemList cardinality differs from retained provenance.", [
      `creature:index=${creatureIndex}:Equip_ItemList:expected=${mutation.expectedEntries.length}:actual=${nativeEntries.length}`,
    ]);
  }
  mutation.expectedEntries.forEach((expected, sourceIndex) =>
    validateNativeCreatureEquipmentEntry(nativeEntries[sourceIndex], expected, creatureIndex)
  );

  const targetEntries = mutation.entries.map((target, targetIndex) => {
    const source = nativeEntries[target.sourceIndex];
    if (!source) {
      throw mutationInvalid("Retained Creature equipment ordinal is missing from native Equip_ItemList.", [
        `creature:index=${creatureIndex}:Equip_ItemList:entry=${targetIndex}:source=${target.sourceIndex}:missing`,
      ]);
    }
    const fields = source.fields.filter((field) => {
      const label = field.label.toLowerCase();
      return label !== "dropable" && label !== "pickpocketable";
    });
    return {
      typeId: target.slotMask,
      fields: appendCreatureEquipmentFlags(fields, target),
    };
  });

  if (targetEntries.length === 0) {
    return baseFields.filter((field) => field.label !== "Equip_ItemList");
  }
  const targetList: GffListField = {
    label: "Equip_ItemList",
    type: "list",
    value: targetEntries,
  };
  return baseFields.map((field) => field.label === "Equip_ItemList" ? targetList : field);
}

function validateNativeCreatureEquipmentEntry(
  entry: GffListField["value"][number] | undefined,
  expected: ExistingAreaCreatureEquipmentSourceEntry,
  creatureIndex: number,
): void {
  const prefix = `creature:index=${creatureIndex}:Equip_ItemList:source=${expected.sourceIndex}`;
  if (!entry) {
    throw mutationInvalid("Native Creature equipment source entry is missing.", [`${prefix}:missing`]);
  }
  if (entry.typeId !== expected.slotMask) {
    throw mutationInvalid("Native Creature equipment slot differs from retained provenance.", [
      `${prefix}:slotMask=${entry.typeId}:expected=${expected.slotMask}`,
    ]);
  }
  const resRefMatches = entry.fields.filter(
    (field) => field.label.toLowerCase() === "templateresref",
  );
  const resRef = resRefMatches[0];
  if (
    resRefMatches.length !== 1
    || resRef?.label !== "TemplateResRef"
    || resRef.type !== "resref"
  ) {
    throw mutationInvalid("Native Creature equipment item requires one canonical TemplateResRef.", [
      `${prefix}:TemplateResRef:count=${resRefMatches.length}:label=${resRef?.label ?? "missing"}:type=${resRef?.type ?? "missing"}`,
    ]);
  }
  if (resRef.value !== expected.resRef) {
    throw mutationInvalid("Native Creature equipment identity differs from retained provenance.", [
      `${prefix}:resref:expected=${expected.resRef}:actual=${resRef.value}`,
    ]);
  }
  const unsupported = entry.fields.find((field) => {
    const label = field.label.toLowerCase().replaceAll("_", "");
    return label === "infinite" || label === "droppable" || label === "reposposx" || label === "reposposy";
  });
  if (unsupported) {
    throw mutationInvalid("Native Creature Equip_ItemList contains an unsupported mode field.", [
      `${prefix}:${unsupported.label}:unsupported_field`,
    ]);
  }
  validateNativeCreatureEquipmentFlag(entry, expected, creatureIndex, "Dropable", "dropable");
  validateNativeCreatureEquipmentFlag(
    entry,
    expected,
    creatureIndex,
    "Pickpocketable",
    "pickpocketable",
  );
}

function validateNativeCreatureEquipmentFlag(
  entry: GffListField["value"][number],
  expected: ExistingAreaCreatureEquipmentSourceEntry,
  creatureIndex: number,
  label: "Dropable" | "Pickpocketable",
  key: "dropable" | "pickpocketable",
): void {
  const matches = entry.fields.filter(
    (field) => field.label.toLowerCase() === label.toLowerCase(),
  );
  const field = matches[0];
  const prefix = `creature:index=${creatureIndex}:Equip_ItemList:source=${expected.sourceIndex}:${label}`;
  if (matches.length > 1 || (field && (field.label !== label || field.type !== "byte"))) {
    throw mutationInvalid("Native Creature equipment flag is not one canonical Byte.", [
      `${prefix}:count=${matches.length}:label=${field?.label ?? "missing"}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field && field.value !== 1) {
    throw mutationInvalid("Native Creature equipment false flag must be omitted.", [
      `${prefix}:value=${field.value}`,
    ]);
  }
  const actual = field !== undefined;
  if (actual !== expected[key]) {
    throw mutationInvalid("Native Creature equipment flag differs from retained provenance.", [
      `${prefix}:expected=${expected[key]}:actual=${actual}`,
    ]);
  }
}

function appendCreatureEquipmentFlags(
  fields: readonly SupportedGffField[],
  target: Readonly<{ dropable: boolean; pickpocketable: boolean }>,
): SupportedGffField[] {
  return [
    ...fields,
    ...(target.dropable ? [{ label: "Dropable", type: "byte" as const, value: 1 }] : []),
    ...(target.pickpocketable
      ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
      : []),
  ];
}

function validateNativeCreatureInventoryEntry(
  entry: GffListField["value"][number] | undefined,
  expected: ExistingAreaCreatureInventorySourceEntry,
  creatureIndex: number,
): void {
  const prefix = `creature:index=${creatureIndex}:ItemList:source=${expected.sourceIndex}`;
  if (!entry) {
    throw mutationInvalid("Native Creature inventory source entry is missing.", [
      `${prefix}:missing`,
    ]);
  }
  if (entry.typeId !== expected.sourceIndex) {
    throw mutationInvalid("Native Creature inventory struct ordinal differs from retained provenance.", [
      `${prefix}:type=${entry.typeId}:expected=${expected.sourceIndex}`,
    ]);
  }
  const resRefFields = entry.fields.filter((field) => field.label === "TemplateResRef");
  const resRef = resRefFields[0];
  if (resRefFields.length !== 1 || resRef?.type !== "resref") {
    throw mutationInvalid("Native Creature inventory item requires one TemplateResRef.", [
      `${prefix}:TemplateResRef:count=${resRefFields.length}:type=${resRef?.type ?? "missing"}`,
    ]);
  }
  for (const [label, expectedValue] of [
    ["Repos_PosX", expected.x],
    ["Repos_Posy", expected.y],
  ] as const) {
    const coordinateFields = entry.fields.filter((field) => field.label === label);
    const coordinate = coordinateFields[0];
    if (coordinateFields.length !== 1 || coordinate?.type !== "word") {
      throw mutationInvalid("Native Creature inventory repository coordinate must be one Word.", [
        `${prefix}:${label}:count=${coordinateFields.length}:type=${coordinate?.type ?? "missing"}`,
      ]);
    }
    if (coordinate.value !== expectedValue) {
      throw mutationInvalid("Native Creature inventory coordinate differs from retained provenance.", [
        `${prefix}:${label}:expected=${expectedValue}:actual=${coordinate.value}`,
      ]);
    }
  }
  if (resRef.value !== expected.resRef) {
    throw mutationInvalid("Native Creature inventory identity differs from retained provenance.", [
      `${prefix}:resref:expected=${expected.resRef}:actual=${resRef.value}`,
    ]);
  }
  const unsupported = entry.fields.find((field) =>
    field.label === "Infinite" || field.label === "Droppable"
  );
  if (unsupported) {
    throw mutationInvalid("Native Creature mode-0 ItemList contains an unsupported flag.", [
      `${prefix}:${unsupported.label}:unsupported_flag`,
    ]);
  }
  validateNativeCreatureInventoryFlag(entry, expected, creatureIndex, "Dropable", "dropable");
  validateNativeCreatureInventoryFlag(
    entry,
    expected,
    creatureIndex,
    "Pickpocketable",
    "pickpocketable",
  );
}

function validateNativeCreatureInventoryFlag(
  entry: GffListField["value"][number],
  expected: ExistingAreaCreatureInventorySourceEntry,
  creatureIndex: number,
  label: "Dropable" | "Pickpocketable",
  key: "dropable" | "pickpocketable",
): void {
  const matches = entry.fields.filter((field) => field.label === label);
  const field = matches[0];
  const prefix = `creature:index=${creatureIndex}:ItemList:source=${expected.sourceIndex}:${label}`;
  if (matches.length > 1 || (field && field.type !== "byte")) {
    throw mutationInvalid("Native Creature inventory flag is not one canonical Byte.", [
      `${prefix}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field && field.value !== 1) {
    throw mutationInvalid("Native Creature inventory false flag must be omitted.", [
      `${prefix}:value=${field.value}`,
    ]);
  }
  const actual = field !== undefined;
  if (actual !== expected[key]) {
    throw mutationInvalid("Native Creature inventory flag differs from retained provenance.", [
      `${prefix}:expected=${expected[key]}:actual=${actual}`,
    ]);
  }
}

function appendCreatureInventoryPlacementFields(
  fields: readonly SupportedGffField[],
  target: Readonly<{
    x: number;
    y: number;
    dropable: boolean;
    pickpocketable: boolean;
  }>,
): SupportedGffField[] {
  return [
    ...fields,
    { label: "Repos_PosX", type: "word", value: target.x },
    { label: "Repos_Posy", type: "word", value: target.y },
    ...(target.dropable ? [{ label: "Dropable", type: "byte" as const, value: 1 }] : []),
    ...(target.pickpocketable
      ? [{ label: "Pickpocketable", type: "byte" as const, value: 1 }]
      : []),
  ];
}

function buildNewCreatureInventoryEntry(
  target: ExistingAreaCreatureInventoryBlueprintEntry,
  creatureIndex: number,
  targetIndex: number,
): GffListField["value"][number] {
  const entry = buildNewInventoryEntry(target, "creature", creatureIndex, targetIndex);
  return {
    typeId: entry.typeId,
    fields: appendCreatureInventoryPlacementFields(entry.fields, target),
  };
}

function mutatePlaceableInventoryFields(
  sourcePlaceable: GffListField["value"][number],
  placeableIndex: number,
  mutation: ExistingAreaPlaceableInventoryMutation,
  baseFields: SupportedGffField[],
): SupportedGffField[] {
  const matches = sourcePlaceable.fields.filter((field) => field.label === "ItemList");
  if (mutation.expectedEntries.length === 0) {
    if (matches.length !== 0) {
      throw mutationInvalid("Empty Placeable inventory provenance requires an absent native ItemList.", [
        `placeable:index=${placeableIndex}:ItemList:count=${matches.length}:expected=0`,
      ]);
    }
  } else if (matches.length !== 1 || matches[0]?.type !== "list") {
    throw mutationInvalid("Placeable inventory mutation requires one unambiguous native ItemList.", [
      `placeable:index=${placeableIndex}:ItemList:count=${matches.length}:type=${matches[0]?.type ?? "missing"}`,
    ]);
  }

  const nativeEntries = matches[0]?.type === "list" ? matches[0].value : [];
  if (nativeEntries.length !== mutation.expectedEntries.length) {
    throw mutationInvalid("Native Placeable ItemList cardinality differs from retained provenance.", [
      `placeable:index=${placeableIndex}:ItemList:expected=${mutation.expectedEntries.length}:actual=${nativeEntries.length}`,
    ]);
  }
  mutation.expectedEntries.forEach((expected, sourceIndex) =>
    validateNativePlaceableInventoryEntry(nativeEntries[sourceIndex], expected, placeableIndex)
  );

  const targetEntries = mutation.entries.map((target, targetIndex) => {
    if ("sourceIndex" in target) {
      const source = nativeEntries[target.sourceIndex];
      if (!source) {
        throw mutationInvalid("Retained Placeable inventory ordinal is missing from the native ItemList.", [
          `placeable:index=${placeableIndex}:ItemList:entry=${targetIndex}:source=${target.sourceIndex}:missing`,
        ]);
      }
      return {
        typeId: targetIndex,
        fields: source.fields.map((field) => {
          if (field.label === "Repos_PosX") return { label: "Repos_PosX", type: "word" as const, value: target.x };
          if (field.label === "Repos_Posy") return { label: "Repos_Posy", type: "word" as const, value: target.y };
          return field;
        }),
      };
    }
    return buildNewPlaceableInventoryEntry(target, placeableIndex, targetIndex);
  });

  if (targetEntries.length === 0) {
    return baseFields.filter((field) => field.label !== "ItemList");
  }
  const targetList: GffListField = { label: "ItemList", type: "list", value: targetEntries };
  if (matches.length === 0) return [...baseFields, targetList];
  return baseFields.map((field) => field.label === "ItemList" ? targetList : field);
}

function validateNativePlaceableInventoryEntry(
  entry: GffListField["value"][number] | undefined,
  expected: ExistingAreaPlaceableInventorySourceEntry,
  placeableIndex: number,
): void {
  if (!entry) {
    throw mutationInvalid("Native Placeable inventory source entry is missing.", [
      `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:missing`,
    ]);
  }
  const resRefFields = entry.fields.filter((field) => field.label === "TemplateResRef");
  const resRef = resRefFields[0];
  if (resRefFields.length !== 1 || resRef?.type !== "resref") {
    throw mutationInvalid("Native Placeable inventory item requires one TemplateResRef.", [
      `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:TemplateResRef:count=${resRefFields.length}:type=${resRef?.type ?? "missing"}`,
    ]);
  }
  for (const [label, expectedValue] of [
    ["Repos_PosX", expected.x],
    ["Repos_Posy", expected.y],
  ] as const) {
    const coordinateFields = entry.fields.filter((field) => field.label === label);
    const coordinate = coordinateFields[0];
    if (coordinateFields.length !== 1 || coordinate?.type !== "word") {
      throw mutationInvalid("Native Placeable inventory repository coordinate must be one Word.", [
        `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:${label}:count=${coordinateFields.length}:type=${coordinate?.type ?? "missing"}`,
      ]);
    }
    if (coordinate.value !== expectedValue) {
      throw mutationInvalid("Native Placeable inventory coordinate differs from retained provenance.", [
        `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:${label}:expected=${expectedValue}:actual=${coordinate.value}`,
      ]);
    }
  }
  if (resRef.value !== expected.resRef) {
    throw mutationInvalid("Native Placeable inventory identity differs from retained provenance.", [
      `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:resref:expected=${expected.resRef}:actual=${resRef.value}`,
    ]);
  }
  const unsupported = entry.fields.find((field) =>
    ["Dropable", "Droppable", "Pickpocketable", "Infinite"].includes(field.label)
  );
  if (unsupported) {
    throw mutationInvalid("Native Placeable inventory mode 2 contains an unsupported item-list flag.", [
      `placeable:index=${placeableIndex}:ItemList:source=${expected.sourceIndex}:${unsupported.label}:unsupported_flag`,
    ]);
  }
}

function buildNewPlaceableInventoryEntry(
  target: ExistingAreaPlaceableInventoryBlueprintEntry,
  placeableIndex: number,
  targetIndex: number,
): GffListField["value"][number] {
  const entry = buildNewInventoryEntry(target, "placeable", placeableIndex, targetIndex);
  return {
    typeId: entry.typeId,
    fields: [
      ...entry.fields,
      { label: "Repos_PosX", type: "word", value: target.x },
      { label: "Repos_Posy", type: "word", value: target.y },
    ],
  };
}

function buildNewInventoryEntry(
  target: ExistingAreaPlaceableInventoryBlueprintEntry | ExistingAreaCreatureInventoryBlueprintEntry,
  ownerKind: "placeable" | "creature",
  ownerIndex: number,
  targetIndex: number,
): GffListField["value"][number] {
  const expectation = buildItemAddition({
    kind: "item",
    localObjectId: `${ownerKind}_inventory_${ownerIndex}_${targetIndex}`,
    sourceProfileId: target.itemSourceObjectKey,
    templateResRef: target.itemResRef,
    resRef: target.resRef,
    tag: AREA_ITEM_CONSTRUCTION_PROFILE.templateTag,
    sourceSha256: target.itemSourceFingerprint,
    blueprintBytes: Buffer.from(target.blueprintBytes!),
    x: 0,
    y: 0,
    z: 0,
    bearing: 0,
  }, targetIndex);
  const instanceFields = expectation.git.fields.map((field) => {
    if (field.label === "XPosition" || field.label === "YPosition" || field.label === "ZPosition") {
      return { label: field.label, type: "float" as const, value: -1 };
    }
    if (field.label === "XOrientation") {
      return { label: "XOrientation", type: "float" as const, value: 0 };
    }
    if (field.label === "YOrientation") {
      return { label: "YOrientation", type: "float" as const, value: 1 };
    }
    return field;
  });
  return {
    typeId: targetIndex,
    fields: instanceFields,
  };
}

function mutatePlaceableKeyNameField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableKeyNameMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "KeyName");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "cexostring") {
    throw mutationInvalid("Placeable KeyName mutation requires one native CExoString field.", [
      `placeable:index=${sourceIndex}:KeyName:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (!isAreaPlaceableKeyName(field.value)) {
    throw mutationInvalid("Placeable KeyName source value is invalid.", [
      `placeable:index=${sourceIndex}:KeyName:invalid_source`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable KeyName source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:KeyName:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "KeyName", type: "cexostring", value: mutation.value };
}

function mutatePlaceableResRefField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  label: "Conversation" | "TemplateResRef" | "OnUsed" | ExistingAreaPlaceableScriptField | ExistingAreaPlaceableTrapScriptField,
  expected: string,
  target: string,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === label);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "resref") {
    throw mutationInvalid(`Placeable ${label} mutation requires one native ResRef field.`, [
      `placeable:index=${sourceIndex}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== expected) {
    throw mutationInvalid(`Placeable ${label} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${label}:expected=${expected}:actual=${field.value}`,
    ]);
  }
  return { label, type: "resref", value: target };
}

function mutatePlaceableInterruptableField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableInterruptableMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "Interruptable");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid("Placeable Interruptable mutation requires one native Byte field.", [
      `placeable:index=${sourceIndex}:Interruptable:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (!isAreaPlaceableInterruptableValue(field.value)) {
    throw mutationInvalid("Placeable Interruptable field is not a boolean Byte.", [
      `placeable:index=${sourceIndex}:Interruptable:invalid_byte=${field.value}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable Interruptable source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:Interruptable:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "Interruptable", type: "byte", value: mutation.value };
}

function mutatePlaceableTrapByteField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableTrapByteMutation,
): SupportedGffField {
  const mapping = findAreaPlaceableTrapByteFieldMapping(mutation.field)!;
  const matches = entry.fields.filter((field) => field.label === mapping.field);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid(`Placeable ${mapping.field} mutation requires one native Byte field.`, [
      `placeable:index=${sourceIndex}:${mapping.field}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (!isAreaPlaceableTrapByteMutationValue(mapping, field.value)) {
    throw mutationInvalid(`Placeable ${mapping.field} source value is not an admitted Byte.`, [
      `placeable:index=${sourceIndex}:${mapping.field}:invalid_byte=${field.value}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(`Placeable ${mapping.field} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${mapping.field}:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: mapping.field, type: "byte", value: mutation.value };
}

function mutatePlaceableBooleanByteField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  label: "Static" | "Useable" | "Plot" | "HasInventory",
  expected: boolean,
  target: boolean,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === label);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid(`Placeable ${label} mutation requires one native Byte field.`, [
      `placeable:index=${sourceIndex}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== 0 && field.value !== 1) {
    throw mutationInvalid(`Placeable ${label} field is not a boolean Byte.`, [
      `placeable:index=${sourceIndex}:${label}:invalid_byte=${field.value}`,
    ]);
  }
  const actual = field.value === 1;
  if (actual !== expected) {
    throw mutationInvalid(`Placeable ${label} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${label}:expected=${expected}:actual=${actual}`,
    ]);
  }
  return { label, type: "byte", value: target ? 1 : 0 };
}

function mutatePlaceableLockByteField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  label: ExistingAreaPlaceableLockField,
  expected: ExistingAreaPlaceableLockValue,
  target: ExistingAreaPlaceableLockValue,
): SupportedGffField {
  const mapping = findAreaPlaceableLockFieldMapping(label)!;
  const matches = entry.fields.filter((field) => field.label === label);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid(`Placeable ${label} mutation requires one native Byte field.`, [
      `placeable:index=${sourceIndex}:${label}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (mapping.valueKind === "boolean" && field.value !== 0 && field.value !== 1) {
    throw mutationInvalid(`Placeable ${label} field is not a boolean Byte.`, [
      `placeable:index=${sourceIndex}:${label}:invalid_byte=${field.value}`,
    ]);
  }
  const actual = mapping.valueKind === "boolean" ? field.value === 1 : field.value;
  if (actual !== expected) {
    throw mutationInvalid(`Placeable ${label} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${label}:expected=${String(expected)}:actual=${String(actual)}`,
    ]);
  }
  return {
    label,
    type: "byte",
    value: mapping.valueKind === "boolean" ? (target ? 1 : 0) : target as number,
  };
}

function mutatePlaceableBasicByteField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableBasicByteMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === mutation.field);
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid(`Placeable ${mutation.field} mutation requires one native Byte field.`, [
      `placeable:index=${sourceIndex}:${mutation.field}:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid(`Placeable ${mutation.field} source value differs from retained provenance.`, [
      `placeable:index=${sourceIndex}:${mutation.field}:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: mutation.field, type: "byte", value: mutation.value };
}

function mutatePlaceableAnimationStateField(
  entry: GffListField["value"][number],
  sourceIndex: number,
  mutation: ExistingAreaPlaceableAnimationStateMutation,
): SupportedGffField {
  const matches = entry.fields.filter((field) => field.label === "AnimationState");
  const field = matches[0];
  if (matches.length !== 1 || field?.type !== "byte") {
    throw mutationInvalid("Placeable AnimationState mutation requires one native Byte field.", [
      `placeable:index=${sourceIndex}:AnimationState:count=${matches.length}:type=${field?.type ?? "missing"}`,
    ]);
  }
  if (!isAreaPlaceableAnimationState(field.value)) {
    throw mutationInvalid("Placeable AnimationState field is outside the admitted set.", [
      `placeable:index=${sourceIndex}:AnimationState:invalid_byte=${field.value}`,
    ]);
  }
  if (field.value !== mutation.expectedValue) {
    throw mutationInvalid("Placeable AnimationState source value differs from retained provenance.", [
      `placeable:index=${sourceIndex}:AnimationState:expected=${mutation.expectedValue}:actual=${field.value}`,
    ]);
  }
  return { label: "AnimationState", type: "byte", value: mutation.value };
}

function validateTriggerPreservationProfile(
  entry: GffListField["value"][number],
  transform: ExistingAreaTriggerPositionTransform,
  diagnostics: string[],
): void {
  for (const label of TRIGGER_PRESERVED_ORIENTATION_FIELDS) {
    const matches = entry.fields.filter((field) => field.label === label);
    if (matches.length !== 1 || matches[0]?.type !== "float") {
      diagnostics.push(
        `trigger:index=${transform.sourceIndex}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}`,
      );
    }
  }
  validatePolygonGeometry(
    entry,
    transform,
    { kind: "trigger", structTypeId: 3, coordinateLabels: ["PointX", "PointY", "PointZ"] },
    diagnostics,
  );
}

function validateEncounterPreservationProfile(
  entry: GffListField["value"][number],
  transform: ExistingAreaEncounterPositionTransform,
  diagnostics: string[],
): void {
  validatePolygonGeometry(
    entry,
    transform,
    { kind: "encounter", structTypeId: 1, coordinateLabels: ["X", "Y", "Z"] },
    diagnostics,
  );
  const spawnMatches = entry.fields.filter((field) => field.label === "SpawnPointList");
  const spawnPoints = spawnMatches[0];
  if (spawnMatches.length !== 1 || spawnPoints?.type !== "list") {
    diagnostics.push(
      `encounter:index=${transform.sourceIndex}:SpawnPointList:count=${spawnMatches.length}:type=${spawnPoints?.type ?? "missing"}`,
    );
  } else if (spawnPoints.value.length !== 0) {
    diagnostics.push(
      `encounter:index=${transform.sourceIndex}:SpawnPointList:entries=${spawnPoints.value.length}:expected=0`,
    );
  }
}

function validatePolygonGeometry(
  entry: GffListField["value"][number],
  transform: ExistingAreaTriggerPositionTransform | ExistingAreaEncounterPositionTransform,
  profile: Readonly<{
    kind: "encounter" | "trigger";
    structTypeId: number;
    coordinateLabels: readonly [string, string, string];
  }>,
  diagnostics: string[],
): void {
  const geometryMatches = entry.fields.filter((field) => field.label === "Geometry");
  const geometry = geometryMatches[0];
  if (geometryMatches.length !== 1 || geometry?.type !== "list") {
    diagnostics.push(
      `${profile.kind}:index=${transform.sourceIndex}:Geometry:count=${geometryMatches.length}:type=${geometry?.type ?? "missing"}`,
    );
    return;
  }
  if (geometry.value.length < 3) {
    diagnostics.push(
      `${profile.kind}:index=${transform.sourceIndex}:Geometry:count=${geometry.value.length}:min=3`,
    );
  }
  geometry.value.forEach((point, pointIndex) => {
    if (point.typeId !== profile.structTypeId) {
      diagnostics.push(
        `${profile.kind}:index=${transform.sourceIndex}:Geometry:point=${pointIndex}:type=${point.typeId}:expected=${profile.structTypeId}`,
      );
    }
    for (const label of profile.coordinateLabels) {
      const matches = point.fields.filter((field) => field.label === label);
      if (matches.length !== 1 || matches[0]?.type !== "float") {
        diagnostics.push(
          `${profile.kind}:index=${transform.sourceIndex}:Geometry:point=${pointIndex}:${label}:count=${matches.length}:type=${matches[0]?.type ?? "missing"}`,
        );
      } else if (!Number.isFinite(matches[0].value)) {
        diagnostics.push(
          `${profile.kind}:index=${transform.sourceIndex}:Geometry:point=${pointIndex}:${label}:value=non_finite`,
        );
      }
    }
  });
}

function objectTransformFloat32Values(
  transform: ExistingAreaObjectTransform,
): ReadonlyMap<string, number> {
  if (transform.kind === "placeable") {
    return new Map<string, number>([
      ["X", Math.fround(transform.x * 10)],
      ["Y", Math.fround(transform.y * 10)],
      ["Z", Math.fround(transform.z * 10)],
      ["Bearing", Math.fround(transform.bearing)],
    ]);
  }
  if (!("bearing" in transform)) {
    return new Map<string, number>([
      ["XPosition", Math.fround(transform.x * 10)],
      ["YPosition", Math.fround(transform.y * 10)],
      ["ZPosition", Math.fround(transform.z * 10)],
    ]);
  }
  return new Map<string, number>([
    ["XPosition", Math.fround(transform.x * 10)],
    ["YPosition", Math.fround(transform.y * 10)],
    ["ZPosition", Math.fround(transform.z * 10)],
    ["XOrientation", Math.fround(Math.cos(transform.bearing))],
    ["YOrientation", Math.fround(-Math.sin(transform.bearing))],
  ]);
}

function verifyObjectTransforms(
  candidateGit: Buffer,
  transforms: ReadonlyMap<string, ExistingAreaObjectTransform>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGit: RawDocument,
  polygonMutations: ReadonlyMap<string, ExistingAreaObjectPolygonMutation>,
  propertyMutations: ReadonlyMap<string, ExistingAreaObjectPropertyMutation>,
): void {
  if (transforms.size === 0) return;
  const candidate = parseRawGffDocument(candidateGit);
  if (!candidate) {
    throw companionMismatch("Candidate object transform readback is unavailable.", [
      "git:transform:readback_missing",
    ]);
  }
  for (const transform of transforms.values()) {
    const profile = FAMILY_PROFILES.find((entry) => entry.kind === transform.kind)!;
    const list = candidate.fields.find((field) => field.label === profile.label);
    if (list?.type !== "list") {
      throw companionMismatch("Candidate object transform readback is unavailable.", [
        `git:${transform.kind}:readback_missing`,
      ]);
    }
    const sourceIndex = transform.sourceIndex;
    const removed = deletionIndexes.get(transform.kind) ?? new Set<number>();
    const candidateIndex = sourceIndex - [...removed].filter((index) => index < sourceIndex).length;
    const entry = list.value[candidateIndex];
    const expected = objectTransformFloat32Values(transform);
    const diagnostics: string[] = [];
    const requiredFields: readonly string[] = transform.kind === "placeable"
      ? PLACEABLE_TRANSFORM_FIELDS
      : transform.kind === "encounter" || transform.kind === "sound" || transform.kind === "trigger"
        ? SOUND_POSITION_TRANSFORM_FIELDS
        : ORIENTATION_VECTOR_TRANSFORM_FIELDS;
    for (const label of requiredFields) {
      const fields = entry?.fields.filter((field) => field.label === label) ?? [];
      const actual = fields[0];
      if (fields.length !== 1 || actual?.type !== "float" || !Object.is(actual.value, expected.get(label))) {
        diagnostics.push(
          `${transform.kind}:source=${sourceIndex}:candidate=${candidateIndex}:${label}:expected=${expected.get(label)}:actual=${actual?.type === "float" ? actual.value : "missing"}`,
        );
      }
    }
    if (transform.kind === "trigger" || transform.kind === "encounter") {
      const sourceList = sourceGit.fields.find((field) => field.label === profile.label);
      const sourceEntry = sourceList?.type === "list"
        ? sourceList.value[transform.sourceIndex]
        : undefined;
      const polygonMutation = polygonMutations.get(
        transformKey(transform.kind, transform.sourceIndex),
      );
      let expectedPreservedEntry = sourceEntry && polygonMutation
        ? mutatePolygonGeometryEntry(sourceEntry, polygonMutation)
        : sourceEntry;
      const propertyMutation = propertyMutations.get(
        propertyMutationKey(transform.kind, transform.sourceIndex),
      );
      if (expectedPreservedEntry && propertyMutation) {
        expectedPreservedEntry = mutateObjectPropertyEntry(
          expectedPreservedEntry,
          propertyMutation,
        );
      }
      const preservedLabels: readonly string[] = transform.kind === "trigger"
        ? [...TRIGGER_PRESERVED_ORIENTATION_FIELDS, "Geometry"]
        : ["Geometry", "SpawnPointList"];
      for (const label of preservedLabels) {
        const sourceFields = expectedPreservedEntry?.fields
          .filter((field) => field.label === label) ?? [];
        const candidateFields = entry?.fields.filter((field) => field.label === label) ?? [];
        if (JSON.stringify(candidateFields) !== JSON.stringify(sourceFields)) {
          diagnostics.push(
            `${transform.kind}:source=${sourceIndex}:candidate=${candidateIndex}:${label}:preservation_mismatch`,
          );
        }
      }
    }
    if (diagnostics.length > 0) {
      throw companionMismatch("Candidate object transform differs from the admitted float32 mapping.", diagnostics);
    }
  }
}

export function verifyObjectPropertyMutations(
  candidateGit: Buffer,
  mutations: ReadonlyMap<string, ExistingAreaObjectPropertyMutation>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGit: RawDocument,
  transforms: ReadonlyMap<string, ExistingAreaObjectTransform> = new Map(),
): void {
  if (mutations.size === 0) return;
  const candidate = parseRawGffDocument(candidateGit);
  if (!candidate) {
    throw companionMismatch("Candidate object property readback is unavailable.", [
      "git:property:readback_missing",
    ]);
  }
  for (const mutation of mutations.values()) {
    if (!hasGitPropertyMutation(mutation)) continue;
    const profile = FAMILY_PROFILES.find((entry) => entry.kind === mutation.kind)!;
    const sourceList = sourceGit.fields.find((field) => field.label === profile.label);
    const candidateList = candidate.fields.find((field) => field.label === profile.label);
    if (sourceList?.type !== "list" || candidateList?.type !== "list") {
      const labels = new Set(
        [...mutations.values()]
          .filter((candidateMutation) => candidateMutation.kind === mutation.kind)
          .map(propertyMutationDisplayLabel),
      );
      const onlyLabel = labels.size === 1 ? [...labels][0] : undefined;
      const readbackLabel = onlyLabel && !onlyLabel.includes("+") ? onlyLabel : "property";
      throw companionMismatch("Candidate object property readback is unavailable.", [
        `git:${mutation.kind}:${readbackLabel}:readback_missing`,
      ]);
    }
    const removed = deletionIndexes.get(mutation.kind) ?? new Set<number>();
    const candidateIndex = mutation.sourceIndex - [...removed]
      .filter((index) => index < mutation.sourceIndex).length;
    const sourceEntry = sourceList.value[mutation.sourceIndex];
    const candidateEntry = candidateList.value[candidateIndex];
    let expectedEntry = sourceEntry;
    const transform = transforms.get(transformKey(mutation.kind, mutation.sourceIndex));
    if (expectedEntry && transform) expectedEntry = transformObjectEntry(expectedEntry, transform);
    if (expectedEntry) expectedEntry = mutateObjectPropertyEntry(expectedEntry, mutation);
    if (JSON.stringify(candidateEntry) !== JSON.stringify(expectedEntry)) {
      const label = propertyMutationDisplayLabel(mutation);
      throw companionMismatch("Candidate object property mutation failed exact readback.", [
        `${mutation.kind}:source=${mutation.sourceIndex}:candidate=${candidateIndex}:${label}:preservation_mismatch`,
      ]);
    }
  }
}

function verifyDoorTransitionMutations(
  candidateGit: Buffer,
  mutations: ReadonlyMap<string, ExistingAreaDoorTransitionStorageMutation>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGit: RawDocument,
): void {
  if (mutations.size === 0) return;
  const candidate = parseRawGffDocument(candidateGit);
  const sourceList = sourceGit.fields.find((field) => field.label === "Door List");
  const candidateList = candidate?.fields.find((field) => field.label === "Door List");
  if (!candidate || sourceList?.type !== "list" || candidateList?.type !== "list") {
    throw companionMismatch("Candidate Door transition readback is unavailable.", [
      "git:door:transition:readback_missing",
    ]);
  }
  const removed = deletionIndexes.get("door") ?? new Set<number>();
  for (const mutation of mutations.values()) {
    const candidateIndex = mutation.sourceIndex - [...removed]
      .filter((index) => index < mutation.sourceIndex).length;
    const sourceEntry = sourceList.value[mutation.sourceIndex];
    const candidateEntry = candidateList.value[candidateIndex];
    const expectedEntry = sourceEntry
      ? mutateDoorTransitionStorageEntry(sourceEntry, mutation)
      : undefined;
    if (JSON.stringify(candidateEntry) !== JSON.stringify(expectedEntry)) {
      throw companionMismatch("Candidate Door transition mutation failed exact readback.", [
        `door:source=${mutation.sourceIndex}:candidate=${candidateIndex}:transition:preservation_mismatch`,
      ]);
    }
  }
}

function verifyPolygonMutations(
  candidateGit: Buffer,
  mutations: ReadonlyMap<string, ExistingAreaObjectPolygonMutation>,
  transforms: ReadonlyMap<string, ExistingAreaObjectTransform>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGit: RawDocument,
): void {
  if (mutations.size === 0) return;
  const candidate = parseRawGffDocument(candidateGit);
  if (!candidate) {
    throw companionMismatch("Candidate polygon readback is unavailable.", [
      "git:polygon:readback_missing",
    ]);
  }
  for (const mutation of mutations.values()) {
    const profile = FAMILY_PROFILES.find((entry) => entry.kind === mutation.kind)!;
    const sourceList = sourceGit.fields.find((field) => field.label === profile.label);
    const candidateList = candidate.fields.find((field) => field.label === profile.label);
    if (sourceList?.type !== "list" || candidateList?.type !== "list") {
      throw companionMismatch("Candidate polygon readback is unavailable.", [
        `git:${mutation.kind}:Geometry:readback_missing`,
      ]);
    }
    const removed = deletionIndexes.get(mutation.kind) ?? new Set<number>();
    const candidateIndex = mutation.sourceIndex - [...removed]
      .filter((index) => index < mutation.sourceIndex).length;
    const sourceEntry = sourceList.value[mutation.sourceIndex];
    const candidateEntry = candidateList.value[candidateIndex];
    let expectedEntry = sourceEntry;
    const transform = transforms.get(transformKey(mutation.kind, mutation.sourceIndex));
    if (expectedEntry && transform) expectedEntry = transformObjectEntry(expectedEntry, transform);
    if (expectedEntry) expectedEntry = mutatePolygonGeometryEntry(expectedEntry, mutation);
    if (JSON.stringify(candidateEntry) !== JSON.stringify(expectedEntry)) {
      throw companionMismatch("Candidate polygon mutation failed exact readback.", [
        `${mutation.kind}:source=${mutation.sourceIndex}:candidate=${candidateIndex}:Geometry:preservation_mismatch`,
      ]);
    }
  }
}

function verifySoundIntervalVariationMutations(
  candidateGit: Buffer,
  mutations: ReadonlyMap<string, ExistingAreaSoundIntervalVariationMutation>,
  transforms: ReadonlyMap<string, ExistingAreaObjectTransform>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGit: RawDocument,
  volumeMutations: ReadonlyMap<string, ExistingAreaSoundVolumeMutation>,
  scheduleMutations: ReadonlyMap<string, ExistingAreaSoundScheduleMutation>,
  activeMutations: ReadonlyMap<string, ExistingAreaSoundActiveMutation>,
  playOrderMutations: ReadonlyMap<string, ExistingAreaSoundPlayOrderMutation>,
  playStyleMutations: ReadonlyMap<string, ExistingAreaSoundPlayStyleMutation>,
  playbackMutations: ReadonlyMap<string, ExistingAreaSoundPlaybackMutation>,
  profileMutations: ReadonlyMap<string, ExistingAreaSoundProfileMutation>,
): void {
  if (
    mutations.size === 0
    && volumeMutations.size === 0
    && scheduleMutations.size === 0
    && activeMutations.size === 0
    && playOrderMutations.size === 0
    && playStyleMutations.size === 0
    && playbackMutations.size === 0
    && profileMutations.size === 0
  ) return;
  const candidate = parseRawGffDocument(candidateGit);
  const sourceList = sourceGit.fields.find((field) => field.label === "SoundList");
  const candidateList = candidate?.fields.find((field) => field.label === "SoundList");
  if (!candidate || sourceList?.type !== "list" || candidateList?.type !== "list") {
    throw companionMismatch("Candidate Sound storage readback is unavailable.", [
      "git:sound:storage:readback_missing",
    ]);
  }
  const removed = deletionIndexes.get("sound") ?? new Set<number>();
  const keys = new Set([
    ...mutations.keys(),
    ...volumeMutations.keys(),
    ...scheduleMutations.keys(),
    ...activeMutations.keys(),
    ...playOrderMutations.keys(),
    ...playStyleMutations.keys(),
    ...playbackMutations.keys(),
    ...profileMutations.keys(),
  ]);
  for (const key of keys) {
    const intervalMutation = mutations.get(key);
    const volumeMutation = volumeMutations.get(key);
    const scheduleMutation = scheduleMutations.get(key);
    const activeMutation = activeMutations.get(key);
    const playOrderMutation = playOrderMutations.get(key);
    const playStyleMutation = playStyleMutations.get(key);
    const playbackMutation = playbackMutations.get(key);
    const profileMutation = profileMutations.get(key);
    const mutation = intervalMutation
      ?? volumeMutation
      ?? scheduleMutation
      ?? activeMutation
      ?? playOrderMutation
      ?? playStyleMutation
      ?? playbackMutation
      ?? profileMutation!;
    const candidateIndex = mutation.sourceIndex - [...removed]
      .filter((index) => index < mutation.sourceIndex).length;
    const sourceEntry = sourceList.value[mutation.sourceIndex];
    const candidateEntry = candidateList.value[candidateIndex];
    let expectedEntry = sourceEntry;
    const transform = transforms.get(transformKey("sound", mutation.sourceIndex));
    if (expectedEntry && transform) expectedEntry = transformObjectEntry(expectedEntry, transform);
    if (expectedEntry && intervalMutation) {
      expectedEntry = mutateSoundIntervalVariationEntry(expectedEntry, intervalMutation);
    }
    if (expectedEntry && volumeMutation) expectedEntry = mutateSoundVolumeEntry(expectedEntry, volumeMutation);
    if (expectedEntry && scheduleMutation) {
      expectedEntry = mutateSoundScheduleEntry(expectedEntry, scheduleMutation);
    }
    if (expectedEntry && activeMutation) {
      expectedEntry = mutateSoundActiveEntry(expectedEntry, activeMutation);
    }
    if (expectedEntry && playOrderMutation) {
      expectedEntry = mutateSoundPlayOrderEntry(expectedEntry, playOrderMutation);
    }
    if (expectedEntry && playStyleMutation) {
      expectedEntry = mutateSoundPlayStyleEntry(expectedEntry, playStyleMutation);
    }
    if (expectedEntry && playbackMutation) {
      expectedEntry = mutateSoundPlaybackEntry(expectedEntry, playbackMutation);
    }
    if (expectedEntry && profileMutation) {
      expectedEntry = mutateSoundProfileEntry(expectedEntry, profileMutation);
    }
    if (JSON.stringify(candidateEntry) !== JSON.stringify(expectedEntry)) {
      throw companionMismatch(
        "Candidate Sound storage mutation failed exact readback.",
        [
          `sound:source=${mutation.sourceIndex}:candidate=${candidateIndex}:storage:preservation_mismatch`,
        ],
      );
    }
  }
}

export function verifyObjectEditorCommentMutations(
  candidateGic: Buffer,
  mutations: ReadonlyMap<string, ExistingAreaObjectPropertyMutation>,
  deletionIndexes: ReadonlyMap<AreaObjectPairKind, ReadonlySet<number>>,
  sourceGic: RawDocument,
  additions: readonly AreaObjectAdditionReadbackExpectation[] = [],
): void {
  const editorCommentMutations = [...mutations.values()].filter(
    (mutation) => mutation.editorComment !== undefined,
  );
  if (editorCommentMutations.length === 0) return;
  const candidate = parseRawGffDocument(candidateGic);
  if (!candidate || candidate.fileType !== "GIC " || candidate.fileVersion !== "V3.2") {
    const kinds = new Set(editorCommentMutations.map((mutation) => mutation.kind));
    const kind = kinds.size === 1 ? [...kinds][0] : undefined;
    throw companionMismatch("Candidate paired-GIC editor Comment readback is unavailable.", [
      `gic:${kind ? `${kind}:` : ""}Comment:readback_missing`,
    ]);
  }
  for (const mutation of editorCommentMutations) {
    const profile = FAMILY_PROFILES.find((entry) => entry.kind === mutation.kind)!;
    const sourceList = sourceGic.fields.find((field) => field.label === profile.label);
    const candidateList = candidate.fields.find((field) => field.label === profile.label);
    if (sourceList?.type !== "list" || candidateList?.type !== "list") {
      throw companionMismatch("Candidate paired-GIC editor Comment readback is unavailable.", [
        `gic:${mutation.kind}:Comment:readback_missing`,
      ]);
    }
    const removed = deletionIndexes.get(mutation.kind) ?? new Set<number>();
    const candidateIndex = mutation.sourceIndex - [...removed]
      .filter((index) => index < mutation.sourceIndex).length;
    const sourceEntry = sourceList.value[mutation.sourceIndex];
    const candidateEntry = candidateList.value[candidateIndex];
    const expectedEntry = sourceEntry
      ? mutateObjectEditorCommentEntry(sourceEntry, mutation)
      : undefined;
    if (JSON.stringify(candidateEntry) !== JSON.stringify(expectedEntry)) {
      throw companionMismatch("Candidate paired-GIC editor Comment failed exact struct readback.", [
        `${mutation.kind}:source=${mutation.sourceIndex}:candidate=${candidateIndex}:Comment:preservation_mismatch`,
      ]);
    }
  }
  const profileByLabel = new Map(FAMILY_PROFILES.map((profile) => [profile.label, profile]));
  const expectedFields = sourceGic.fields.map((field): SupportedGffField => {
    const profile = profileByLabel.get(field.label);
    if (!profile) return field;
    const listField = field as GffListField;
    const removedIndexes = deletionIndexes.get(profile.kind);
    const familyAdditions = additions.filter((addition) => addition.kind === profile.kind);
    return {
      label: field.label,
      type: "list",
      value: listField.value
        .map((entry, index) => {
          const mutation = mutations.get(propertyMutationKey(profile.kind, index));
          return mutation ? mutateObjectEditorCommentEntry(entry, mutation) : entry;
        })
        .filter((_entry, index) => !removedIndexes?.has(index))
        .concat(familyAdditions.map((addition) => addition.gic)),
    };
  });
  if (
    candidate.rootStructTypeId !== sourceGic.rootStructTypeId ||
    JSON.stringify(candidate.fields) !== JSON.stringify(expectedFields)
  ) {
    throw companionMismatch("Candidate paired GIC differs outside the admitted editor Comment mutation.", [
      "gic:document:Comment:preservation_mismatch",
    ]);
  }
}

function countTransforms(
  transforms: ReadonlyMap<string, ExistingAreaObjectTransform>,
  kind: AreaObjectPairKind,
): number {
  let count = 0;
  for (const transform of transforms.values()) {
    if (transform.kind === kind) count += 1;
  }
  return count;
}

function countPropertyMutations(
  mutations: ReadonlyMap<string, ExistingAreaObjectPropertyMutation>,
  doorTransitionMutations: ReadonlyMap<string, ExistingAreaDoorTransitionStorageMutation>,
  kind: AreaObjectPairKind,
): number {
  if (
    kind === "creature" || kind === "item" || kind === "placeable" ||
    kind === "store" || kind === "trigger" || kind === "encounter" ||
    kind === "waypoint"
  ) {
    let count = 0;
    for (const mutation of mutations.values()) {
      if (mutation.kind === kind) count += 1;
    }
    return count;
  }
  if (kind === "door") return doorTransitionMutations.size;
  return 0;
}

function countPolygonMutations(
  mutations: ReadonlyMap<string, ExistingAreaObjectPolygonMutation>,
  kind: AreaObjectPairKind,
): number {
  let count = 0;
  for (const mutation of mutations.values()) {
    if (mutation.kind === kind) count += 1;
  }
  return count;
}

function hasGitPropertyMutation(
  mutation: ExistingAreaObjectPropertyMutation,
): boolean {
  if (mutation.kind === "waypoint") {
    return Object.keys(mutation).some(
      (key) => key !== "kind" && key !== "sourceIndex" && key !== "editorComment",
    );
  }
  if (mutation.kind === "trigger") {
    return Object.keys(mutation).some(
      (key) => key !== "kind" && key !== "sourceIndex" && key !== "editorComment",
    );
  }
  if (mutation.kind === "encounter") {
    return Object.keys(mutation).some(
      (key) => key !== "kind" && key !== "sourceIndex" && key !== "editorComment",
    );
  }
  if (mutation.kind === "store") {
    return mutation.commerce !== undefined || mutation.scripts !== undefined ||
      mutation.variables !== undefined || mutation.restrictions !== undefined ||
      mutation.inventory !== undefined;
  }
  if (mutation.kind === "item") {
    return mutation.tag !== undefined ||
      mutation.templateResRef !== undefined ||
      mutation.instanceState !== undefined ||
      mutation.localizedStrings !== undefined ||
      mutation.variables !== undefined ||
      mutation.propertyList !== undefined ||
      mutation.baseAppearance !== undefined ||
      mutation.inventory !== undefined ||
      mutation.visualTransform !== undefined;
  }
  if (mutation.kind === "creature") {
    return Object.keys(mutation).some(
      (key) => key !== "kind" && key !== "sourceIndex" && key !== "editorComment",
    );
  }
  return mutation.tag !== undefined ||
    mutation.expectedOnUsed !== undefined ||
    mutation.onUsed !== undefined ||
    mutation.expectedStatic !== undefined ||
    mutation.static !== undefined ||
    mutation.expectedUseable !== undefined ||
    mutation.useable !== undefined ||
    mutation.expectedPlot !== undefined ||
    mutation.plot !== undefined ||
    mutation.expectedHasInventory !== undefined ||
    mutation.hasInventory !== undefined ||
    mutation.scripts !== undefined ||
    mutation.trapScripts !== undefined ||
    mutation.lockFields !== undefined ||
    mutation.keyName !== undefined ||
    mutation.inventory !== undefined ||
    mutation.basicByteFields !== undefined ||
    mutation.conversation !== undefined ||
    mutation.interruptable !== undefined ||
    mutation.trapFields !== undefined ||
    mutation.animationState !== undefined ||
    mutation.appearance !== undefined ||
    mutation.trapType !== undefined ||
    mutation.bodyBag !== undefined ||
    mutation.portrait !== undefined ||
    mutation.faction !== undefined ||
    mutation.variables !== undefined ||
    mutation.templateResRef !== undefined ||
    mutation.hitPoints !== undefined ||
    mutation.localizedStrings !== undefined;
}

function transformKey(kind: AreaObjectPairKind, sourceIndex: number): string {
  return `${kind}:${sourceIndex}`;
}

function propertyMutationKey(kind: AreaObjectPairKind, sourceIndex: number): string {
  return `${kind}:${sourceIndex}:property`;
}

function propertyMutationDisplayLabel(mutation: ExistingAreaObjectPropertyMutation): string {
  if (mutation.kind === "waypoint") {
    return [
      ...(mutation.tag ? ["Tag"] : []),
      ...(mutation.templateResRef ? ["TemplateResRef"] : []),
      ...(mutation.localizedName ? ["LocalizedName"] : []),
      ...(mutation.description ? ["Description"] : []),
      ...(mutation.mapNote ? ["MapNote"] : []),
      ...(mutation.variables ? ["VarTable"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
    ].join("+") || "property";
  }
  if (mutation.kind === "trigger") {
    return [
      ...(mutation.tag ? ["Tag"] : []),
      ...(mutation.templateResRef ? ["TemplateResRef"] : []),
      ...(mutation.localizedName ? ["LocalizedName"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
      ...(mutation.scripts
        ? AREA_TRIGGER_SCRIPT_RESREF_FIELDS
          .filter((field) =>
            mutation.scripts?.expectedValue[field.key] !== mutation.scripts?.value[field.key])
          .map((field) => field.label)
        : []),
    ].join("+") || "property";
  }
  if (mutation.kind === "encounter") {
    return [
      ...(mutation.tag ? ["Tag"] : []),
      ...(mutation.templateResRef ? ["TemplateResRef"] : []),
      ...(mutation.active ? ["Active"] : []),
      ...(mutation.playerOnly ? ["PlayerOnly"] : []),
      ...(mutation.reset ? ["Reset"] : []),
      ...(mutation.resetTime ? ["ResetTime"] : []),
      ...(mutation.spawnOption ? ["SpawnOption"] : []),
      ...(mutation.respawns ? ["Respawns"] : []),
      ...(mutation.creatureCounts ? ["MaxCreatures", "RecCreatures"] : []),
      ...(mutation.scripts
        ? AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS
          .filter((field) =>
            mutation.scripts?.expectedValue[field.key] !== mutation.scripts?.value[field.key])
          .map((field) => field.label)
        : []),
      ...(mutation.faction ? ["Faction"] : []),
      ...(mutation.difficulty ? ["Difficulty", "DifficultyIndex"] : []),
      ...(mutation.localizedName ? ["LocalizedName"] : []),
      ...(mutation.variables ? ["VarTable"] : []),
      ...(mutation.creatureList ? ["CreatureList"] : []),
      ...(mutation.spawnPoints ? ["SpawnPointList"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
    ].join("+") || "property";
  }
  if (mutation.kind === "store") {
    return [
      ...(mutation.commerce
        ? AREA_STORE_COMMERCE_FIELDS
          .filter((field) =>
            mutation.commerce?.expectedValue[field.key] !== mutation.commerce?.value[field.key])
          .map((field) => field.label)
        : []),
      ...(mutation.scripts
        ? AREA_STORE_SCRIPT_RESREF_FIELDS
          .filter((field) =>
            mutation.scripts?.expectedValue[field.key] !== mutation.scripts?.value[field.key])
          .map((field) => field.label)
        : []),
      ...(mutation.variables ? ["VarTable"] : []),
      ...(mutation.restrictions ? ["WillNotBuy", "WillOnlyBuy"] : []),
      ...(mutation.inventory ? ["StoreList"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
    ].join("+") || "property";
  }
  if (mutation.kind === "item") {
    const labels = [
      ...(mutation.templateResRef ? ["TemplateResRef"] : []),
      ...(mutation.tag ? ["Tag"] : []),
      ...(mutation.instanceState
        ? AREA_ITEM_INSTANCE_STATE_FIELDS
          .filter((profile) =>
            mutation.instanceState?.expectedValue.values[profile.key]
              !== mutation.instanceState?.value[profile.key])
          .map((profile) => profile.label)
        : []),
      ...(mutation.localizedStrings?.map((entry) => entry.field) ?? []),
      ...(mutation.variables ? ["VarTable"] : []),
      ...(mutation.propertyList ? ["PropertiesList"] : []),
      ...(mutation.baseAppearance ? ["BaseItem", "appearance"] : []),
      ...(mutation.inventory ? ["ItemList"] : []),
      ...(mutation.visualTransform ? ["VisTransformList"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
    ];
    return labels.join("+") || "property";
  }
  if (mutation.kind === "creature") {
    return [
      ...(mutation.tag ? ["Tag"] : []),
      ...(mutation.conversation ? ["Conversation"] : []),
      ...(mutation.interruptable ? ["Interruptable"] : []),
      ...(mutation.advancedFlags
        ? AREA_CREATURE_ADVANCED_FLAG_FIELDS
          .filter((field) => mutation.advancedFlags?.[field.key] !== undefined)
          .map((field) => field.nativeLabel)
        : []),
      ...(mutation.bodyBag ? ["BodyBag"] : []),
      ...(mutation.decayTime ? ["DecayTime"] : []),
      ...(mutation.appearance ? ["Appearance_Type"] : []),
      ...(mutation.gender ? ["Gender"] : []),
      ...(mutation.skillList ? ["SkillList"] : []),
      ...(mutation.featList ? ["FeatList"] : []),
      ...(mutation.specialAbilityList ? ["SpecAbilityList"] : []),
      ...(mutation.variables ? ["VarTable"] : []),
      ...(mutation.editorComment ? ["Comment"] : []),
      ...(mutation.challengeRating ? ["ChallengeRating"] : []),
      ...(mutation.abilityScores
        ? AREA_CREATURE_ABILITY_SCORE_FIELDS
          .filter((field) => mutation.abilityScores?.[field.key] !== undefined)
          .map((field) => field.nativeLabel)
        : []),
      ...(mutation.appearanceColors
        ? AREA_CREATURE_APPEARANCE_COLOR_FIELDS
          .filter((field) => mutation.appearanceColors?.[field.key] !== undefined)
          .map((field) => field.nativeLabel)
        : []),
      ...(mutation.bodyParts
        ? AREA_CREATURE_BODY_PART_FIELDS
          .filter((field) => mutation.bodyParts?.[field.key] !== undefined)
          .flatMap((field) => [field.legacyLabel, field.wideLabel])
        : []),
      ...(mutation.appendages
        ? AREA_CREATURE_APPENDAGE_FIELDS
          .filter((field) => mutation.appendages?.[field.key] !== undefined)
          .map((field) => field.modernLabel)
        : []),
      ...(mutation.classLevels ? ["ClassList.ClassLevel"] : []),
      ...(mutation.classIdentity
        ? [
            "ClassList.Class",
            ...(mutation.classIdentity.levels.some(
              (level, index) => level !== mutation.classIdentity!.expectedLevels[index],
            ) ? ["ClassList.ClassLevel"] : []),
            "ClassList.SpellLists(clear)",
            "StartingPackage",
          ]
        : []),
      ...(mutation.classSlotResize
        ? ["ClassList(slot-count)", "StartingPackage"]
        : []),
      ...(mutation.hitPoints
        ? ["HitPoints", "CurrentHitPoints", "MaxHitPoints"]
        : []),
      ...(mutation.naturalArmorClass ? ["NaturalAC"] : []),
      ...(mutation.savingThrowBonuses
        ? AREA_CREATURE_SAVING_THROW_BONUS_FIELDS
          .filter((field) => mutation.savingThrowBonuses?.[field.key] !== undefined)
          .map((field) => field.nativeLabel)
        : []),
      ...(mutation.alignment ? ["GoodEvil", "LawfulChaotic"] : []),
      ...(mutation.faction ? ["FactionID"] : []),
      ...(mutation.templateResRef ? ["TemplateResRef"] : []),
      ...(mutation.specialIdentityStrings?.subrace ? ["Subrace"] : []),
      ...(mutation.specialIdentityStrings?.deity ? ["Deity"] : []),
      ...(mutation.scripts?.map((entry) => entry.field) ?? []),
      ...(mutation.localizedStrings?.map((entry) => entry.field) ?? []),
      ...(mutation.inventory ? ["ItemList"] : []),
      ...(mutation.equipment ? ["Equip_ItemList"] : []),
    ].join(",");
  }
  const labels: string[] = [];
  if (mutation.expectedOnUsed !== undefined || mutation.onUsed !== undefined) labels.push("OnUsed");
  if (mutation.expectedStatic !== undefined || mutation.static !== undefined) labels.push("Static");
  if (mutation.expectedUseable !== undefined || mutation.useable !== undefined) labels.push("Useable");
  if (mutation.expectedPlot !== undefined || mutation.plot !== undefined) labels.push("Plot");
  if (mutation.expectedHasInventory !== undefined || mutation.hasInventory !== undefined) {
    labels.push("HasInventory");
  }
  for (const script of mutation.scripts ?? []) labels.push(script.field);
  for (const script of mutation.trapScripts ?? []) labels.push(script.field);
  for (const lockField of mutation.lockFields ?? []) labels.push(lockField.field);
  for (const byteField of mutation.basicByteFields ?? []) labels.push(byteField.field);
  if (mutation.conversation !== undefined) labels.push("Conversation");
  if (mutation.interruptable !== undefined) labels.push("Interruptable");
  for (const trapField of mutation.trapFields ?? []) labels.push(trapField.field);
  if (mutation.animationState !== undefined) labels.push("AnimationState");
  if (mutation.editorComment !== undefined) labels.push("Comment");
  if (mutation.appearance !== undefined) labels.push("Appearance");
  if (mutation.trapType !== undefined) labels.push("TrapType");
  if (mutation.bodyBag !== undefined) labels.push("BodyBag");
  if (mutation.portrait !== undefined) labels.push("PortraitId");
  if (mutation.faction !== undefined) labels.push("Faction");
  if (mutation.variables !== undefined) labels.push("VarTable");
  if (mutation.templateResRef !== undefined) labels.push("TemplateResRef");
  if (mutation.hitPoints !== undefined) labels.push("HP+CurrentHP");
  for (const localizedString of mutation.localizedStrings ?? []) labels.push(localizedString.field);
  if (mutation.tag !== undefined) labels.push("Tag");
  if (mutation.keyName !== undefined) labels.push("KeyName");
  if (mutation.inventory !== undefined) labels.push("ItemList");
  return labels.join("+") || "property";
}

function isScriptResRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_]{0,16}$/u.test(value);
}

function capitalizeKind(kind: ExistingAreaObjectTransform["kind"]): string {
  if (kind === "creature") return "Creature";
  if (kind === "encounter") return "Encounter";
  if (kind === "item") return "Item";
  if (kind === "placeable") return "Placeable";
  if (kind === "sound") return "Sound";
  if (kind === "store") return "Store";
  if (kind === "trigger") return "Trigger";
  return "Waypoint";
}

function countsFrom(resolve: (profile: AreaObjectFamilyProfile) => number): AreaObjectPairCounts {
  return Object.freeze({
    creature: resolve(FAMILY_PROFILES[0]!),
    door: resolve(FAMILY_PROFILES[1]!),
    encounter: resolve(FAMILY_PROFILES[2]!),
    item: resolve(FAMILY_PROFILES[3]!),
    placeable: resolve(FAMILY_PROFILES[4]!),
    sound: resolve(FAMILY_PROFILES[5]!),
    store: resolve(FAMILY_PROFILES[6]!),
    trigger: resolve(FAMILY_PROFILES[7]!),
    waypoint: resolve(FAMILY_PROFILES[8]!),
  });
}

function sumCounts(counts: AreaObjectPairCounts): number {
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

function companionMismatch(message: string, diagnostics: readonly string[]): AreaObjectPairMutationError {
  return new AreaObjectPairMutationError(
    "AREA_UPDATE_COMPANION_MISMATCH",
    message,
    Object.freeze([...diagnostics]),
  );
}

function mutationInvalid(message: string, diagnostics: readonly string[]): AreaObjectPairMutationError {
  return new AreaObjectPairMutationError(
    "AREA_UPDATE_OBJECT_MUTATION_INVALID",
    message,
    Object.freeze([...diagnostics]),
  );
}
