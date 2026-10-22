import { createHash } from "node:crypto";
import type {
  AreaPlaceableBasicIdentity,
  AreaPlaceableBodyBagStorage,
  AreaPlaceableFactionStorage,
  AreaPlaceablePortraitIdStorage,
  AreaPlaceableTrapTypeStorage,
} from "../../../domain/area.types";
import {
  MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION,
  type AreaItemInventorySourceEntry,
} from "../../../domain/area-item-inventory";
import {
  AREA_ITEM_VISUAL_TRANSFORM_KEYS,
  AreaItemVisualTransformValidationError,
  parseAreaItemVisualTransformStorage,
  type AreaItemVisualTransformStorage,
} from "../../../domain/area-item-visual-transform";
import {
  type AreaPlaceableLocalizedStrings,
} from "../../../domain/area-placeable-localized-strings";
import {
  MAX_AREA_LOCALIZED_STRING_ENTRIES,
  MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES,
  MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES,
  type AreaLocalizedStringStorage,
} from "../../../domain/area-localized-string-storage";
import type {
  AreaCreatureNameLocalizedStrings,
} from "../../../domain/area-creature-localized-strings";
import { AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS } from "../../../domain/area-placeable-basic-byte-fields";
import { isAreaPlaceableAnimationState } from "../../../domain/area-placeable-animation-state";
import { isAreaPlaceableEditorComment } from "../../../domain/area-placeable-editor-comment";
import { isAreaCreatureEditorComment } from "../../../domain/area-creature-editor-comment";
import { isAreaItemEditorComment } from "../../../domain/area-item-editor-comment";
import { isAreaStoreEditorComment } from "../../../domain/area-store-editor-comment";
import { isAreaEncounterEditorComment } from
  "../../../domain/area-encounter-editor-comment";
import { isAreaWaypointEditorComment } from
  "../../../domain/area-waypoint-editor-comment";
import { isAreaTriggerEditorComment } from
  "../../../domain/area-trigger-editor-comment";
import {
  AREA_TRIGGER_SCRIPT_RESREF_FIELDS,
  readAreaTriggerScriptResRefsStorage,
  type AreaTriggerScriptResRefsStorage,
} from "../../../domain/area-trigger-script-resrefs";
import {
  isAreaTriggerTransitionStorage,
  type AreaTriggerTransitionStorage,
} from "../../../domain/area-trigger-transition-storage";
import {
  isAreaTriggerCoreProperties,
  type AreaTriggerCoreProperties,
} from "../../../domain/area-trigger-core-properties";
import {
  AREA_TRIGGER_TRAP_PROPERTY_FIELDS,
  isAreaTriggerTrapProperties,
  type AreaTriggerTrapProperties,
} from "../../../domain/area-trigger-trap-properties";
import {
  AREA_STORE_COMMERCE_FIELDS,
  readAreaStoreCommerceValue,
  type AreaStoreCommerceValue,
} from "../../../domain/area-store-commerce";
import {
  AREA_STORE_SCRIPT_RESREF_FIELDS,
  readAreaStoreScriptResRefsValue,
  type AreaStoreScriptResRefsValue,
} from "../../../domain/area-store-script-resrefs";
import {
  AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS,
  readAreaEncounterScriptResRefsStorage,
  type AreaEncounterScriptResRefsStorage,
} from "../../../domain/area-encounter-script-resrefs";
import {
  readAreaEncounterFactionStorage,
  type AreaEncounterFactionStorage,
} from "../../../domain/area-encounter-faction";
import {
  readAreaEncounterDifficultyStorage,
  type AreaEncounterDifficultyStorage,
} from "../../../domain/area-encounter-difficulty";
import type { AreaEncounterLocalizedNameStorage } from
  "../../../domain/area-encounter-localized-name";
import {
  AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
  MAX_AREA_STORE_RESTRICTION_ENTRIES,
  readAreaStoreRestrictionsRawStorage,
  type AreaStoreRestrictionRawListStorage,
  type AreaStoreRestrictionsRawStorage,
} from "../../../domain/area-store-restrictions";
import {
  AREA_STORE_INVENTORY_BUCKET_TYPE_IDS,
  MAX_AREA_STORE_INVENTORY_ENTRIES,
  readAreaStoreInventoryRawStorage,
  type AreaStoreInventoryRawStorage,
} from "../../../domain/area-store-inventory";
import { isAreaCommentsValue } from "../../../domain/area-comments";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  type AreaEventScripts,
} from "../../../domain/area-event-scripts";
import {
  readEditableAreaNameStorage,
  isEditableAreaTag,
  type AreaBasicIdentity,
} from "../../../domain/area-basic-identity";
import {
  readExistingAreaCreatureTagStorage,
  type AreaCreatureTagStorage,
} from "../../../domain/area-creature-tag";
import {
  readExistingAreaCreatureConversationStorage,
  type AreaCreatureConversationStorage,
} from "../../../domain/area-creature-conversation";
import {
  readAreaCreatureInterruptableStorage,
  type AreaCreatureInterruptableStorage,
} from "../../../domain/area-creature-interruptable";
import {
  AREA_CREATURE_ADVANCED_FLAG_FIELDS,
  readAreaCreatureAdvancedFlagsStorage,
  readAreaCreatureBinaryFlagStorage,
  type AreaCreatureAdvancedFlagsStorage,
  type AreaCreatureBinaryFlagStorage,
} from "../../../domain/area-creature-advanced-flags";
import {
  readAreaCreatureBodyBagStorage,
  readAreaCreatureDecayTimeStorage,
  type AreaCreatureBodyBagStorage,
  type AreaCreatureDecayTimeStorage,
} from "../../../domain/area-creature-death-remains";
import {
  readAreaCreatureFactionStorage,
  type AreaCreatureFactionStorage,
} from "../../../domain/area-creature-faction";
import {
  readAreaCreatureTemplateResRefStorage,
  type AreaCreatureTemplateResRefStorage,
} from "../../../domain/area-creature-template-resref";
import {
  readAreaCreatureSpecialIdentityStringsStorage,
  type AreaCreatureSpecialIdentityStringStorage,
  type AreaCreatureSpecialIdentityStringsStorage,
} from "../../../domain/area-creature-special-identity-strings";
import {
  AREA_CREATURE_SCRIPT_RESREF_FIELDS,
  readAreaCreatureScriptResRefsStorage,
  type AreaCreatureScriptResRefStorage,
  type AreaCreatureScriptResRefsStorage,
} from "../../../domain/area-creature-script-resrefs";
import {
  readAreaCreatureAppearanceStorage,
  type AreaCreatureAppearanceStorage,
} from "../../../domain/area-creature-appearance";
import {
  readAreaCreatureGenderStorage,
  type AreaCreatureGenderStorage,
} from "../../../domain/area-creature-gender";
import {
  readAreaCreaturePerceptionRangeStorage,
  type AreaCreaturePerceptionRangeStorage,
} from "../../../domain/area-creature-perception-range";
import {
  readAreaCreatureWalkRateStorage,
  type AreaCreatureWalkRateStorage,
} from "../../../domain/area-creature-walk-rate";
import {
  readAreaCreatureSoundSetFileStorage,
  type AreaCreatureSoundSetFileStorage,
} from "../../../domain/area-creature-sound-set-file";
import {
  readAreaCreatureStartingPackageStorage,
  type AreaCreatureStartingPackageStorage,
} from "../../../domain/area-creature-starting-package";
import {
  readAreaCreatureSkillListStorage,
  type AreaCreatureSkillListStorage,
} from "../../../domain/area-creature-skill-list";
import {
  readAreaCreatureFeatListStorage,
  type AreaCreatureFeatListStorage,
} from "../../../domain/area-creature-feat-list";
import {
  readAreaCreatureSpecialAbilityListStorage,
  type AreaCreatureSpecialAbilityListStorage,
} from "../../../domain/area-creature-special-ability-list";
import {
  readAreaCreatureClassLevelState,
  type AreaCreatureClassLevelState,
} from "../../../domain/area-creature-class-levels";
import {
  readAreaCreatureClassIdentityState,
  type AreaCreatureClassIdentityState,
} from "../../../domain/area-creature-class-identity";
import {
  analyzeAreaCreatureClassListField,
} from "./area-creature-class-list-gff";
import {
  parseRawGffDocument,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type { SupportedGffField } from
  "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  readAreaCreaturePhenotypeStorage,
  type AreaCreaturePhenotypeStorage,
} from "../../../domain/area-creature-phenotype";
import {
  readAreaCreaturePortraitStorage,
  type AreaCreaturePortraitStorage,
} from "../../../domain/area-creature-portrait";
import {
  readAreaCreatureChallengeRatingStorage,
  type AreaCreatureChallengeRatingStorage,
} from "../../../domain/area-creature-challenge-rating";
import {
  AREA_CREATURE_ABILITY_SCORE_FIELDS,
  readAreaCreatureAbilityScoreStorage,
  readAreaCreatureAbilityScoresStorage,
  type AreaCreatureAbilityScoresStorage,
} from "../../../domain/area-creature-ability-scores";
import {
  AREA_CREATURE_APPEARANCE_COLOR_FIELDS,
  readAreaCreatureAppearanceColorStorage,
  readAreaCreatureAppearanceColorsStorage,
  type AreaCreatureAppearanceColorsStorage,
} from "../../../domain/area-creature-appearance-colors";
import {
  AREA_CREATURE_BODY_PART_FIELDS,
  readAreaCreatureBodyPartStorage,
  readAreaCreatureBodyPartsStorage,
  type AreaCreatureBodyPartsStorage,
} from "../../../domain/area-creature-body-parts";
import {
  AREA_CREATURE_APPENDAGE_FIELDS,
  readAreaCreatureAppendageStorage,
  readAreaCreatureAppendagesStorage,
  type AreaCreatureAppendagesStorage,
} from "../../../domain/area-creature-appendages";
import {
  readAreaCreatureHitPointState,
  type AreaCreatureHitPointState,
} from "../../../domain/area-creature-hit-points";
import {
  readAreaCreatureNaturalArmorClassStorage,
  type AreaCreatureNaturalArmorClassStorage,
} from "../../../domain/area-creature-natural-armor-class";
import {
  AREA_CREATURE_SAVING_THROW_BONUS_FIELDS,
  readAreaCreatureSavingThrowBonusStorage,
  readAreaCreatureSavingThrowBonusesStorage,
  type AreaCreatureSavingThrowBonusesStorage,
} from "../../../domain/area-creature-saving-throw-bonuses";
import {
  readAreaCreatureAlignmentStorage,
  type AreaCreatureAlignmentStorage,
} from "../../../domain/area-creature-alignment";
import {
  decodeAreaTerrainTypeFlags,
  isAreaCheckModifier,
  isAreaLoadingScreenId,
  isAreaPlayerVsPlayerMode,
  type AreaAdvancedFlags,
} from "../../../domain/area-advanced-flags";
import {
  AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS,
  isAreaAudioEnvironment,
  type AreaAudioEnvironment,
} from "../../../domain/area-audio-environment";
import {
  decodeAreaDayNightMode,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
} from "../../../domain/area-visual-environment";
import {
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
} from "../../../domain/area-visual-environment-scalar-controls";
import {
  isAreaVisualEnvironmentCatalogSelection,
  type AreaVisualEnvironmentCatalogSelection,
} from "../../../domain/area-visual-environment-catalog-selection";
import { isAreaPlaceableTemplateResRef } from "../../../domain/area-placeable-template-resref";
import {
  type AreaPlaceableVariableProvenance,
} from "../../../domain/area-placeable-variable-table";
import {
  type AreaCreatureVariableProvenance,
} from "../../../domain/area-creature-variable-table";
import {
  type AreaEncounterVariableProvenance,
} from "../../../domain/area-encounter-variable-table";
import {
  type AreaWaypointVariableProvenance,
} from "../../../domain/area-waypoint-variable-table";
import {
  type AreaTriggerVariableProvenance,
} from "../../../domain/area-trigger-variable-table";
import {
  MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES,
  parseAreaEncounterCreatureListProvenance,
  type AreaEncounterCreatureListProvenance,
} from "../../../domain/area-encounter-creature-single-spawn";
import {
  MAX_AREA_ENCOUNTER_SPAWN_POINT_ENTRIES,
  parseAreaEncounterSpawnPointListProvenance,
  type AreaEncounterSpawnPointListProvenance,
} from "../../../domain/area-encounter-spawn-point-list";
import {
  type AreaItemVariableProvenance,
} from "../../../domain/area-item-variable-table";
import {
  MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES,
  parseAreaItemPropertyListProvenance,
  type AreaItemPropertyListProvenance,
} from "../../../domain/area-item-property-list";
import {
  readAreaSoundIntervalVariationStorage,
  type AreaSoundIntervalVariationStorage,
} from "../../../domain/area-sound-interval-variation-storage";
import {
  readAreaSoundVolumeStorage,
  type AreaSoundVolumeStorage,
} from "../../../domain/area-sound-volume-storage";
import {
  readAreaSoundActiveStorage,
  type AreaSoundActiveStorage,
} from "../../../domain/area-sound-active-storage";
import {
  readAreaSoundPlayOrderStorage,
  type AreaSoundPlayOrderStorage,
} from "../../../domain/area-sound-play-order-storage";
import {
  readAreaSoundPlayStyleStorage,
  type AreaSoundPlayStyleStorage,
} from "../../../domain/area-sound-play-style-storage";
import {
  isAreaSoundResRef,
  readAreaSoundPlaybackStorage,
  type AreaSoundPlaybackStorage,
} from "../../../domain/area-sound-playback-storage";
import {
  readAreaSoundProfileStorage,
  type AreaSoundProfileStorage,
} from "../../../domain/area-sound-profile-storage";
import {
  readAreaSoundScheduleStorage,
  type AreaSoundScheduleStorage,
} from "../../../domain/area-sound-schedule-storage";
import {
  MAX_AURORA_VARIABLE_ENTRIES,
  parseAuroraVariableProvenance,
  type AuroraVariableProvenance,
  type AuroraVariableSourceEntry,
} from "../../../domain/aurora-variable-table";
import {
  type AreaPlaceableHitPointState,
  isAuroraShort,
  isEditableAreaPlaceableHitPoints,
} from "../../../domain/area-placeable-hit-points";
import { AREA_CREATURE_EQUIPMENT_SLOT_MASKS } from "../../../domain/area-creature-equipment";
import {
  AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS,
  isAreaPlaceableTrapByteMutationValue,
} from "../../../domain/area-placeable-trap-byte-fields";
import {
  isAreaDoorTransitionStorage,
  type AreaDoorTransitionStorage,
} from "../../../domain/area-door-transition-storage";
import {
  readAreaObjectPolygonGeometry,
  type AreaObjectPolygonGeometry,
} from "../../../domain/area-object-polygon-geometry";
import {
  AREA_ITEM_INSTANCE_STATE_DEFAULTS,
  AREA_ITEM_INSTANCE_STATE_FIELDS,
  readAreaItemInstanceStateStorage,
  type AreaItemInstanceStateStorage,
  type AreaItemInstanceStateValue,
} from "../../../domain/area-item-instance-state";
import {
  readExistingAreaItemTagStorage,
  type AreaItemTagStorage,
} from "../../../domain/area-item-tag";
import {
  readExistingAreaTriggerTagStorage,
  type AreaTriggerTagStorage,
} from "../../../domain/area-trigger-tag";
import {
  readExistingAreaEncounterTagStorage,
  type AreaEncounterTagStorage,
} from "../../../domain/area-encounter-tag";
import {
  readExistingAreaWaypointTagStorage,
  type AreaWaypointTagStorage,
} from "../../../domain/area-waypoint-tag";
import type { AreaWaypointLocalizedNameStorage } from
  "../../../domain/area-waypoint-localized-name";
import type { AreaWaypointDescriptionStorage } from
  "../../../domain/area-waypoint-description";
import {
  readAreaWaypointMapNoteStorage,
  type AreaWaypointMapNoteStorage,
} from "../../../domain/area-waypoint-map-note";
import type { AreaWaypointAppearanceStorage } from
  "../../../domain/area-waypoint-appearance";
import {
  readAreaEncounterActiveStorage,
  type AreaEncounterActiveStorage,
} from "../../../domain/area-encounter-active";
import {
  readAreaEncounterPlayerOnlyStorage,
  type AreaEncounterPlayerOnlyStorage,
} from "../../../domain/area-encounter-player-only";
import {
  readAreaEncounterResetStorage,
  type AreaEncounterResetStorage,
} from "../../../domain/area-encounter-reset";
import {
  readAreaEncounterResetTimeStorage,
  type AreaEncounterResetTimeStorage,
} from "../../../domain/area-encounter-reset-time";
import {
  readAreaEncounterSpawnOptionStorage,
  type AreaEncounterSpawnOptionStorage,
} from "../../../domain/area-encounter-spawn-option";
import {
  readAreaEncounterRespawnsStorage,
  type AreaEncounterRespawnsStorage,
} from "../../../domain/area-encounter-respawns";
import {
  readAreaEncounterCreatureCountStorage,
  type AreaEncounterCreatureCountStorage,
} from "../../../domain/area-encounter-creature-counts";
import {
  readAreaItemTemplateResRefStorage,
  type AreaItemTemplateResRefStorage,
} from "../../../domain/area-item-template-resref";
import {
  readAreaWaypointTemplateResRefStorage,
  type AreaWaypointTemplateResRefStorage,
} from "../../../domain/area-waypoint-template-resref";
import {
  readAreaEncounterTemplateResRefStorage,
  type AreaEncounterTemplateResRefStorage,
} from "../../../domain/area-encounter-template-resref";
import {
  readAreaTriggerTemplateResRefStorage,
  type AreaTriggerTemplateResRefStorage,
} from "../../../domain/area-trigger-template-resref";
import type { AreaTriggerLocalizedNameStorage } from
  "../../../domain/area-trigger-localized-name";
import type { AreaItemLocalizedStrings } from "../../../domain/area-item-localized-strings";
import {
  readItemBaseAppearanceRawStorage,
  type AreaItemBaseAppearanceRawStorage,
  type AreaItemRawAppearanceKey,
} from "../../../domain/area-item-base-appearance";

interface GffHeader {
  fileType: string;
  fileVersion: string;
  structOffset: number;
  structCount: number;
  fieldOffset: number;
  fieldCount: number;
  labelOffset: number;
  labelCount: number;
  fieldDataOffset: number;
  fieldDataCount: number;
  fieldIndicesOffset: number;
  fieldIndicesCount: number;
  listIndicesOffset: number;
  listIndicesCount: number;
}

interface GffStructEntry {
  typeId: number;
  dataOrOffset: number;
  fieldCount: number;
}

interface ParsedCExoLocString {
  strRef: number;
  text: string;
  entries: string[];
}

interface GffFieldRef {
  typeId: number;
  dataOrOffset: number;
}

interface GffLabeledFieldRef {
  label: string;
  field: GffFieldRef;
}

export interface ParsedAreaSoundIds {
  ambientDay?: number;
  ambientNight?: number;
  ambientDayVolume?: number;
  ambientNightVolume?: number;
  envAudio?: number;
  musicDay?: number;
  musicNight?: number;
  musicBattle?: number;
  musicDelay?: number;
}

export type ParsedAreaObjectMetadataPrimitive = string | number | boolean;
export type ParsedAreaCreatureMetadataPrimitive = ParsedAreaObjectMetadataPrimitive;

interface ParsedAreaCreatureSpellListEntry {
  spellId?: number;
  spellLevel?: number;
  metaMagic?: number;
  flags?: number;
}

interface ParsedAreaCreatureClassListEntry {
  classId?: number;
  level?: number;
  knownSpellCount?: number;
  memorizedSpellCount?: number;
  knownSpells?: ParsedAreaCreatureSpellListEntry[];
  memorizedSpells?: ParsedAreaCreatureSpellListEntry[];
}

interface ParsedAreaCreatureSkillListEntry {
  skillId?: number;
  rank?: number;
}

interface ParsedAreaCreatureIdListEntry {
  featId?: number;
}

interface ParsedAreaCreatureSpecAbilityListEntry {
  spellId?: number;
  flags?: number;
  casterLevel?: number;
}

interface ParsedAreaCreatureInventoryItemListEntry {
  sourceIndex: number;
  resRef?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
}

interface ParsedAreaPlaceableInventoryItemListEntry {
  sourceIndex: number;
  resRef: string;
  x: number;
  y: number;
}

interface ParsedAreaCreatureEquipItemListEntry {
  sourceIndex?: number;
  resRef?: string;
  slotMask?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface ParsedAreaMetadataBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  name?: string;
  tag?: string;
  comments?: string;
  eventScripts?: AreaEventScripts;
  basicIdentity?: AreaBasicIdentity;
  advancedFlags?: AreaAdvancedFlags;
  visualEnvironment?: AreaVisualEnvironment;
  visualEnvironmentScalarControls?: AreaVisualEnvironmentScalarControls;
  visualEnvironmentCatalogSelection?: AreaVisualEnvironmentCatalogSelection;
  width?: number;
  height?: number;
  tileSet?: string;
  tileCount?: number;
  tiles: ParsedAreaTileBlueprint[];
  soundIds: ParsedAreaSoundIds;
  globalLighting: ParsedAreaGlobalLightingBlueprint;
  dependencyFingerprint: string;
}

export type ParsedAreaGlobalLightingFieldName =
  | "LightingScheme"
  | "ShadowOpacity"
  | "DayNightCycle"
  | "IsNight"
  | "SkyBox"
  | "FogClipDist"
  | "ChanceRain"
  | "ChanceSnow"
  | "ChanceLightning"
  | "WindPower"
  | "SunAmbientColor"
  | "SunDiffuseColor"
  | "SunFogColor"
  | "SunFogAmount"
  | "SunShadows"
  | "MoonAmbientColor"
  | "MoonDiffuseColor"
  | "MoonFogColor"
  | "MoonFogAmount"
  | "MoonShadows";

export interface ParsedAreaGlobalLightingField {
  field: ParsedAreaGlobalLightingFieldName;
  value: number;
}

export interface ParsedAreaGlobalLightingBlueprint {
  fields: ParsedAreaGlobalLightingField[];
}

export interface ParsedAreaTileBlueprint {
  index: number;
  row: number;
  col: number;
  tileId?: number;
  modelResRef?: string;
  orientation?: number;
  height?: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface ParsedAreaPlacementBlueprint {
  listKind:
    | "placeable"
    | "door"
    | "creature"
    | "encounter"
    | "item"
    | "sound"
    | "store"
    | "trigger"
    | "waypoint";
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  description?: string;
  appearanceType?: number;
  genericType?: number;
  isStatic?: boolean;
  placeableBasicIdentity?: AreaPlaceableBasicIdentity;
  placeableTrapType?: AreaPlaceableTrapTypeStorage;
  placeableBodyBag?: AreaPlaceableBodyBagStorage;
  placeablePortraitId?: AreaPlaceablePortraitIdStorage;
  placeableFaction?: AreaPlaceableFactionStorage;
  placeableVariables?: AreaPlaceableVariableProvenance;
  placeableTemplateResRef?: string;
  placeableLocalizedStrings?: AreaPlaceableLocalizedStrings;
  placeableMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  creatureTag?: AreaCreatureTagStorage;
  creatureConversation?: AreaCreatureConversationStorage;
  creatureInterruptable?: AreaCreatureInterruptableStorage;
  creatureAdvancedFlags?: AreaCreatureAdvancedFlagsStorage;
  creatureBodyBag?: AreaCreatureBodyBagStorage;
  creatureDecayTime?: AreaCreatureDecayTimeStorage;
  creatureFaction?: AreaCreatureFactionStorage;
  creatureTemplateResRef?: AreaCreatureTemplateResRefStorage;
  creatureSpecialIdentityStrings?: AreaCreatureSpecialIdentityStringsStorage;
  creatureScriptResRefs?: AreaCreatureScriptResRefsStorage;
  creatureAppearance?: AreaCreatureAppearanceStorage;
  creatureGender?: AreaCreatureGenderStorage;
  creaturePerceptionRange?: AreaCreaturePerceptionRangeStorage;
  creatureWalkRate?: AreaCreatureWalkRateStorage;
  creatureSoundSetFile?: AreaCreatureSoundSetFileStorage;
  creatureStartingPackage?: AreaCreatureStartingPackageStorage;
  creatureSkillList?: AreaCreatureSkillListStorage;
  creatureFeatList?: AreaCreatureFeatListStorage;
  creatureSpecialAbilityList?: AreaCreatureSpecialAbilityListStorage;
  creatureVariables?: AreaCreatureVariableProvenance;
  creatureClassLevelState?: AreaCreatureClassLevelState;
  creatureClassIdentityState?: AreaCreatureClassIdentityState;
  creaturePhenotype?: AreaCreaturePhenotypeStorage;
  creaturePortrait?: AreaCreaturePortraitStorage;
  creatureChallengeRating?: AreaCreatureChallengeRatingStorage;
  creatureAbilityScores?: AreaCreatureAbilityScoresStorage;
  creatureAppearanceColors?: AreaCreatureAppearanceColorsStorage;
  creatureBodyParts?: AreaCreatureBodyPartsStorage;
  creatureAppendages?: AreaCreatureAppendagesStorage;
  creatureHitPointState?: AreaCreatureHitPointState;
  creatureNaturalArmorClass?: AreaCreatureNaturalArmorClassStorage;
  creatureSavingThrowBonuses?: AreaCreatureSavingThrowBonusesStorage;
  creatureAlignment?: AreaCreatureAlignmentStorage;
  creatureLocalizedStrings?: AreaCreatureNameLocalizedStrings;
  creatureMetadata?: Record<string, ParsedAreaCreatureMetadataPrimitive>;
  itemTag?: AreaItemTagStorage;
  triggerTag?: AreaTriggerTagStorage;
  triggerTemplateResRef?: AreaTriggerTemplateResRefStorage;
  triggerLocalizedName?: AreaTriggerLocalizedNameStorage;
  triggerScriptResRefs?: AreaTriggerScriptResRefsStorage;
  triggerTransitionStorage?: AreaTriggerTransitionStorage;
  triggerCoreProperties?: AreaTriggerCoreProperties;
  triggerTrapProperties?: AreaTriggerTrapProperties;
  triggerVariables?: AreaTriggerVariableProvenance;
  triggerMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  encounterTag?: AreaEncounterTagStorage;
  encounterTemplateResRef?: AreaEncounterTemplateResRefStorage;
  waypointTag?: AreaWaypointTagStorage;
  waypointTemplateResRef?: AreaWaypointTemplateResRefStorage;
  waypointLocalizedName?: AreaWaypointLocalizedNameStorage;
  waypointDescription?: AreaWaypointDescriptionStorage;
  waypointMapNote?: AreaWaypointMapNoteStorage;
  waypointAppearance?: AreaWaypointAppearanceStorage;
  waypointVariables?: AreaWaypointVariableProvenance;
  waypointMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  encounterActive?: AreaEncounterActiveStorage;
  encounterPlayerOnly?: AreaEncounterPlayerOnlyStorage;
  encounterReset?: AreaEncounterResetStorage;
  encounterResetTime?: AreaEncounterResetTimeStorage;
  encounterSpawnOption?: AreaEncounterSpawnOptionStorage;
  encounterRespawns?: AreaEncounterRespawnsStorage;
  encounterCreatureCounts?: AreaEncounterCreatureCountStorage;
  encounterScriptResRefs?: AreaEncounterScriptResRefsStorage;
  encounterFaction?: AreaEncounterFactionStorage;
  encounterDifficulty?: AreaEncounterDifficultyStorage;
  encounterLocalizedName?: AreaEncounterLocalizedNameStorage;
  encounterVariables?: AreaEncounterVariableProvenance;
  encounterCreatureList?: AreaEncounterCreatureListProvenance;
  encounterSpawnPoints?: AreaEncounterSpawnPointListProvenance;
  encounterMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  itemTemplateResRef?: AreaItemTemplateResRefStorage;
  itemInstanceState?: AreaItemInstanceStateStorage;
  itemLocalizedStrings?: AreaItemLocalizedStrings;
  itemVariables?: AreaItemVariableProvenance;
  itemPropertyList?: AreaItemPropertyListProvenance;
  itemBaseAppearanceRaw?: AreaItemBaseAppearanceRawStorage;
  itemInventoryItems?: readonly AreaItemInventorySourceEntry[];
  itemVisualTransform?: AreaItemVisualTransformStorage;
  itemMetadata?: Record<string, ParsedAreaObjectMetadataPrimitive>;
  storeMetadata?: {
    readonly editorComment?: string;
    readonly commerce?: AreaStoreCommerceValue;
    readonly scriptResRefs?: AreaStoreScriptResRefsValue;
    readonly variables?: AuroraVariableProvenance;
  };
  storeRestrictionsRaw?: AreaStoreRestrictionsRawStorage;
  storeInventoryRaw?: AreaStoreInventoryRawStorage;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform?: ParsedAreaVisualTransformBlueprint;
  soundPositioning?: ParsedAreaSoundPositioningBlueprint;
  soundIntervalVariation?: AreaSoundIntervalVariationStorage;
  soundVolume?: AreaSoundVolumeStorage;
  soundActive?: AreaSoundActiveStorage;
  soundPlayOrder?: AreaSoundPlayOrderStorage;
  soundPlayStyle?: AreaSoundPlayStyleStorage;
  soundPlayback?: AreaSoundPlaybackStorage;
  soundProfile?: AreaSoundProfileStorage;
  soundSchedule?: AreaSoundScheduleStorage;
  doorTransition?: ParsedAreaDoorTransitionBlueprint;
  geometry?: ParsedAreaGeometryPoint[];
  polygonGeometry?: AreaObjectPolygonGeometry;
}

export interface ParsedAreaGeometryPoint {
  x: number;
  y: number;
  z: number;
}

export interface ParsedAreaVisualTransformBlueprint {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  translateX: number;
  translateY: number;
  translateZ: number;
}

export interface ParsedAreaDoorTransitionBlueprint {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra: Record<string, string | number | boolean | null>;
  storage?: AreaDoorTransitionStorage;
}

export interface ParsedAreaSoundPositioningPreserveBlueprint {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: "always" | "dayNight" | "hours";
  dayNight?: "both" | "day" | "night";
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: "once" | "repeat" | "loop";
  playOrder?: "sequential" | "random";
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, string | number | boolean | null>;
}

export interface ParsedAreaSoundPositioningBlueprint {
  mode: "everywhere" | "random" | "specific";
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve: ParsedAreaSoundPositioningPreserveBlueprint;
}

export interface ParsedAreaObjectBlueprint {
  sourceFileType: string;
  sourceFileVersion: string;
  sourceStructTypeId: number;
  /**
   * Area audio settings from the GIT `AreaProperties` struct. In Aurora these
   * fields live only in the .git file (the .are writer never emits them).
   */
  soundIds: ParsedAreaSoundIds;
  audioEnvironment?: AreaAudioEnvironment;
  variables?: AuroraVariableProvenance;
  placeables: ParsedAreaPlacementBlueprint[];
  doors: ParsedAreaPlacementBlueprint[];
  creatures: ParsedAreaPlacementBlueprint[];
  encounters: ParsedAreaPlacementBlueprint[];
  items: ParsedAreaPlacementBlueprint[];
  sounds: ParsedAreaPlacementBlueprint[];
  stores: ParsedAreaPlacementBlueprint[];
  triggers: ParsedAreaPlacementBlueprint[];
  waypoints: ParsedAreaPlacementBlueprint[];
  dependencyFingerprint: string;
}

const GFF_HEADER_SIZE_BYTES = 56;
const GFF_STRUCT_ENTRY_SIZE_BYTES = 12;
const GFF_FIELD_ENTRY_SIZE_BYTES = 12;
const GFF_LABEL_ENTRY_SIZE_BYTES = 16;
const AURORA_SPELL_FLAGS_RUNTIME_BIT = 1;
const AURORA_DEFAULT_SPELL_META_MAGIC = 0;
const AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL = 1;
const AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL = 0xf;
const AURORA_DEFAULT_CREATURE_SKILL_COUNT = 28;
const AURORA_VISUAL_TRANSFORM_BASE_SCOPE = 0;

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  STRUCT: 14,
  LIST: 15
} as const;

const AREA_GLOBAL_LIGHTING_FIELD_ALIASES: Array<{
  field: ParsedAreaGlobalLightingFieldName;
  aliases: readonly string[];
}> = [
  { field: "LightingScheme", aliases: ["LightingScheme", "LightScheme"] },
  { field: "ShadowOpacity", aliases: ["ShadowOpacity"] },
  { field: "DayNightCycle", aliases: ["DayNightCycle", "DayNight"] },
  { field: "IsNight", aliases: ["IsNight"] },
  { field: "SkyBox", aliases: ["SkyBox"] },
  { field: "FogClipDist", aliases: ["FogClipDist", "FogClipDistance"] },
  { field: "ChanceRain", aliases: ["ChanceRain"] },
  { field: "ChanceSnow", aliases: ["ChanceSnow"] },
  { field: "ChanceLightning", aliases: ["ChanceLightning"] },
  { field: "WindPower", aliases: ["WindPower"] },
  { field: "SunAmbientColor", aliases: ["SunAmbientColor"] },
  { field: "SunDiffuseColor", aliases: ["SunDiffuseColor"] },
  { field: "SunFogColor", aliases: ["SunFogColor"] },
  { field: "SunFogAmount", aliases: ["SunFogAmount"] },
  { field: "SunShadows", aliases: ["SunShadows"] },
  { field: "MoonAmbientColor", aliases: ["MoonAmbientColor"] },
  { field: "MoonDiffuseColor", aliases: ["MoonDiffuseColor"] },
  { field: "MoonFogColor", aliases: ["MoonFogColor"] },
  { field: "MoonFogAmount", aliases: ["MoonFogAmount"] },
  { field: "MoonShadows", aliases: ["MoonShadows"] }
];

class GffView {
  private constructor(
    private readonly bytes: Buffer,
    readonly header: GffHeader,
    readonly labels: string[],
    readonly structs: GffStructEntry[]
  ) {}

  static fromBuffer(bytes: Buffer): GffView | null {
    try {
      const header = parseHeader(bytes);
      if (!header) {
        return null;
      }
      const labels = parseLabels(bytes, header);
      const structs = parseStructs(bytes, header);
      if (structs.length === 0) {
        return null;
      }
      return new GffView(bytes, header, labels, structs);
    } catch {
      return null;
    }
  }

  getStructFields(structIndex: number): Map<string, GffFieldRef> {
    const entries = this.getStructFieldEntries(structIndex);
    if (!entries) {
      return new Map();
    }
    const fields = new Map<string, GffFieldRef>();
    for (const entry of entries) {
      const label = normalizeLabel(entry.label);
      if (label) fields.set(label, entry.field);
    }
    return fields;
  }

  getStructFieldEntries(structIndex: number): readonly GffLabeledFieldRef[] | null {
    if (structIndex < 0 || structIndex >= this.structs.length) {
      return null;
    }

    const struct = this.structs[structIndex];
    const indices = resolveStructFieldIndices(this.bytes, this.header, struct);
    if (!indices) {
      return null;
    }

    const fields: GffLabeledFieldRef[] = [];
    for (const fieldIndex of indices) {
      if (fieldIndex < 0 || fieldIndex >= this.header.fieldCount) {
        return null;
      }
      const fieldOffset = this.header.fieldOffset + fieldIndex * GFF_FIELD_ENTRY_SIZE_BYTES;
      const typeId = this.bytes.readUInt32LE(fieldOffset);
      const labelIndex = this.bytes.readUInt32LE(fieldOffset + 4);
      const dataOrOffset = this.bytes.readUInt32LE(fieldOffset + 8);
      const label = this.labels[labelIndex];
      if (label === undefined) return null;
      fields.push({
        label,
        field: { typeId, dataOrOffset },
      });
    }

    return fields;
  }

  readNumber(field: GffFieldRef | undefined): number | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.BYTE) {
      return field.dataOrOffset & 0xff;
    }
    if (field.typeId === FIELD_TYPE.CHAR) {
      // Signed 8-bit: sign-extend instead of masking to unsigned.
      return ((field.dataOrOffset & 0xff) << 24) >> 24;
    }
    if (field.typeId === FIELD_TYPE.WORD) {
      return field.dataOrOffset & 0xffff;
    }
    if (field.typeId === FIELD_TYPE.SHORT) {
      // Signed 16-bit: sign-extend instead of masking to unsigned.
      return ((field.dataOrOffset & 0xffff) << 16) >> 16;
    }
    if (field.typeId === FIELD_TYPE.DWORD) {
      // Unsigned 32-bit (e.g. Sun/Moon color DWORDs): `| 0` would flip values >= 2^31 negative.
      return field.dataOrOffset >>> 0;
    }
    if (field.typeId === FIELD_TYPE.INT) {
      return field.dataOrOffset | 0;
    }
    if (field.typeId === FIELD_TYPE.FLOAT) {
      const inline = Buffer.allocUnsafe(4);
      inline.writeUInt32LE(field.dataOrOffset, 0);
      return inline.readFloatLE(0);
    }

    return undefined;
  }

  readString(field: GffFieldRef | undefined): string | undefined {
    if (!field) {
      return undefined;
    }

    if (field.typeId === FIELD_TYPE.CEXOSTRING) {
      return readCExoString(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.RESREF) {
      return readResRef(this.bytes, this.header, field.dataOrOffset);
    }
    if (field.typeId === FIELD_TYPE.CEXOLOCSTRING) {
      const loc = readCExoLocString(this.bytes, this.header, field.dataOrOffset);
      if (!loc) {
        return undefined;
      }
      return sanitizeUtf8(loc.text);
    }

    return undefined;
  }

  readExactString(field: GffFieldRef | undefined): string | undefined {
    if (!field || field.typeId !== FIELD_TYPE.CEXOSTRING) return undefined;
    return readCExoStringExact(this.bytes, this.header, field.dataOrOffset);
  }

  readExactResRef(field: GffFieldRef | undefined): string | undefined {
    if (!field || field.typeId !== FIELD_TYPE.RESREF) return undefined;
    return readResRefExact(this.bytes, this.header, field.dataOrOffset);
  }

  readLocString(field: GffFieldRef | undefined): ParsedCExoLocString | undefined {
    if (!field || field.typeId !== FIELD_TYPE.CEXOLOCSTRING) {
      return undefined;
    }
    return readCExoLocString(this.bytes, this.header, field.dataOrOffset);
  }

  readExactLocStringStorage(
    field: GffFieldRef,
  ): Extract<AreaLocalizedStringStorage, { present: true }> | undefined {
    return readExactCExoLocStringStorage(this.bytes, this.header, field.dataOrOffset);
  }

  readListStructIndices(field: GffFieldRef | undefined): number[] {
    if (!field || field.typeId !== FIELD_TYPE.LIST) {
      return [];
    }

    const offset = this.header.listIndicesOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(this.bytes, offset, 4)) {
      return [];
    }

    const count = this.bytes.readUInt32LE(offset);
    const bodyOffset = offset + 4;
    if (!isRangeWithinBuffer(this.bytes, bodyOffset, count * 4)) {
      return [];
    }

    const indices: number[] = [];
    for (let index = 0; index < count; index += 1) {
      indices.push(this.bytes.readUInt32LE(bodyOffset + index * 4));
    }
    return indices;
  }

  readExactListStructIndices(field: GffFieldRef | undefined): readonly number[] | null {
    if (!field || field.typeId !== FIELD_TYPE.LIST) return null;
    const offset = this.header.listIndicesOffset + field.dataOrOffset;
    if (!isRangeWithinBuffer(this.bytes, offset, 4)) return null;
    const count = this.bytes.readUInt32LE(offset);
    const bodyOffset = offset + 4;
    if (!isRangeWithinBuffer(this.bytes, bodyOffset, count * 4)) return null;
    const indices: number[] = [];
    const seen = new Set<number>();
    for (let index = 0; index < count; index += 1) {
      const structIndex = this.bytes.readUInt32LE(bodyOffset + index * 4);
      if (structIndex >= this.structs.length || seen.has(structIndex)) return null;
      seen.add(structIndex);
      indices.push(structIndex);
    }
    return indices;
  }

  readStructIndex(field: GffFieldRef | undefined): number | undefined {
    if (!field || field.typeId !== FIELD_TYPE.STRUCT) {
      return undefined;
    }
    return field.dataOrOffset;
  }
}

export function parseAreaMetadataFromAreGff(
  bytes: Buffer
): ParsedAreaMetadataBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "ARE") {
    return null;
  }

  const root = view.getStructFields(0);

  const name = readNameByAliases(view, root, ["name", "locname", "displayname"]);
  const tag = readStringByAliases(view, root, ["tag"]);
  const comments = readCanonicalAreaComments(view);
  const eventScripts = readCanonicalAreaEventScripts(view);
  const basicIdentity = readCanonicalAreaBasicIdentity(view);
  const advancedFlags = readCanonicalAreaAdvancedFlags(view);
  const visualEnvironment = readCanonicalAreaVisualEnvironment(view);
  const visualEnvironmentScalarControls = readCanonicalAreaVisualEnvironmentScalarControls(view);
  const visualEnvironmentCatalogSelection = readCanonicalAreaVisualEnvironmentCatalogSelection(view);
  const width = readNumberByAliases(view, root, ["width"]);
  const height = readNumberByAliases(view, root, ["height"]);
  const tileSet = readStringByAliases(view, root, ["tileset", "tilesetresref", "tilesetname"]);
  const tiles = parseAreaTileList(view, root, width);
  const tileCount = tiles.length;
  const globalLighting = parseAreaGlobalLightingFields(view, root);

  const soundIds: ParsedAreaSoundIds = {
    ambientDay: readNumberByAliases(view, root, ["ambientsndday", "ambientsoundday"]),
    ambientNight: readNumberByAliases(view, root, ["ambientsndnight", "ambientsoundnight"]),
    musicDay: readNumberByAliases(view, root, ["musicday"]),
    musicNight: readNumberByAliases(view, root, ["musicnight"]),
    musicBattle: readNumberByAliases(view, root, ["musicbattle"])
  };

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        name ?? "",
        tag ?? "",
        comments === undefined ? "comments:absent" : `comments:present:${comments}`,
        ...AREA_EVENT_SCRIPT_FIELDS.map(({ slot }) => eventScripts?.[slot] === undefined
          ? `${slot}:absent`
          : `${slot}:present:${eventScripts[slot]}`),
        basicIdentity?.name === undefined
          ? "basic-name:preserve-only"
          : `basic-name:editable:${basicIdentity.nameProfile}:${basicIdentity.name}`,
        basicIdentity?.tag === undefined
          ? "basic-tag:preserve-only"
          : `basic-tag:editable:${basicIdentity.tag}`,
        advancedFlags?.terrainType === undefined
          ? "advanced-terrain:preserve-only"
          : `advanced-terrain:${advancedFlags.terrainType.interior ? 1 : 0}${advancedFlags.terrainType.natural ? 1 : 0}${advancedFlags.terrainType.subterranean ? 1 : 0}`,
        advancedFlags?.playerVsPlayer === undefined
          ? "advanced-pvp:preserve-only"
          : `advanced-pvp:${advancedFlags.playerVsPlayer}`,
        advancedFlags?.noRest === undefined
          ? "advanced-no-rest:preserve-only"
          : `advanced-no-rest:${advancedFlags.noRest ? 1 : 0}`,
        advancedFlags?.listenCheckModifier === undefined
          ? "advanced-listen-modifier:preserve-only"
          : `advanced-listen-modifier:${advancedFlags.listenCheckModifier}`,
        advancedFlags?.spotCheckModifier === undefined
          ? "advanced-spot-modifier:preserve-only"
          : `advanced-spot-modifier:${advancedFlags.spotCheckModifier}`,
        advancedFlags?.loadingScreenId === undefined
          ? "advanced-loading-screen:preserve-only"
          : `advanced-loading-screen:${advancedFlags.loadingScreenId}`,
        visualEnvironment === undefined
          ? "visual-environment:preserve-only"
          : `visual-environment:${JSON.stringify(visualEnvironment)}`,
        visualEnvironmentScalarControls === undefined
          ? "visual-environment-scalars:preserve-only"
          : `visual-environment-scalars:${visualEnvironmentScalarControls.fogClipDistance}:${visualEnvironmentScalarControls.windPower}`,
        visualEnvironmentCatalogSelection === undefined
          ? "visual-environment-catalog-selection:preserve-only"
          : `visual-environment-catalog-selection:${visualEnvironmentCatalogSelection.lightingSchemeRowIndex}:${visualEnvironmentCatalogSelection.skyBoxRowIndex}`,
        String(width ?? -1),
        String(height ?? -1),
        tileSet ?? "",
        String(tileCount ?? -1),
        ...tiles.map((tile) => stringifyAreaTile(tile)),
        ...globalLighting.fields.map((field) => `${field.field}:${field.value}`),
        String(soundIds.ambientDay ?? -1),
        String(soundIds.ambientNight ?? -1),
        String(soundIds.musicDay ?? -1),
        String(soundIds.musicNight ?? -1),
        String(soundIds.musicBattle ?? -1)
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    name,
    tag,
    comments,
    eventScripts,
    basicIdentity,
    advancedFlags,
    visualEnvironment,
    visualEnvironmentScalarControls,
    visualEnvironmentCatalogSelection,
    width,
    height,
    tileSet,
    tileCount,
    tiles,
    soundIds,
    globalLighting,
    dependencyFingerprint
  };
}

export function parseAreaVisualEnvironmentFromAreGff(
  bytes: Buffer,
): AreaVisualEnvironment | null {
  const view = GffView.fromBuffer(bytes);
  if (!view || view.header.fileType.trim() !== "ARE") return null;
  return readCanonicalAreaVisualEnvironment(view) ?? null;
}

export function parseAreaVisualEnvironmentScalarControlsFromAreGff(
  bytes: Buffer,
): AreaVisualEnvironmentScalarControls | null {
  const view = GffView.fromBuffer(bytes);
  if (!view || view.header.fileType.trim() !== "ARE") return null;
  return readCanonicalAreaVisualEnvironmentScalarControls(view) ?? null;
}

export function parseAreaVisualEnvironmentCatalogSelectionFromAreGff(
  bytes: Buffer,
): AreaVisualEnvironmentCatalogSelection | null {
  const view = GffView.fromBuffer(bytes);
  if (!view || view.header.fileType.trim() !== "ARE") return null;
  return readCanonicalAreaVisualEnvironmentCatalogSelection(view) ?? null;
}

function readCanonicalAreaVisualEnvironmentCatalogSelection(
  view: GffView,
): AreaVisualEnvironmentCatalogSelection | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const value = {
    lightingSchemeRowIndex: readExactNumericRootField(
      view,
      entries,
      "LightingScheme",
      FIELD_TYPE.BYTE,
    ),
    skyBoxRowIndex: readExactNumericRootField(view, entries, "SkyBox", FIELD_TYPE.BYTE),
  };
  return isAreaVisualEnvironmentCatalogSelection(value)
    ? Object.freeze(value)
    : undefined;
}

function readCanonicalAreaVisualEnvironmentScalarControls(
  view: GffView,
): AreaVisualEnvironmentScalarControls | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const value = {
    fogClipDistance: readExactNumericRootField(
      view,
      entries,
      "FogClipDist",
      FIELD_TYPE.FLOAT,
    ),
    windPower: readExactNumericRootField(view, entries, "WindPower", FIELD_TYPE.INT),
  };
  if (!isAreaVisualEnvironmentScalarControls(value)) return undefined;
  return Object.freeze(value);
}

function readCanonicalAreaVisualEnvironment(
  view: GffView,
): AreaVisualEnvironment | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;

  const dayNightCycle = readExactNumericRootField(
    view,
    entries,
    "DayNightCycle",
    FIELD_TYPE.BYTE,
  );
  const isNight = readExactNumericRootField(view, entries, "IsNight", FIELD_TYPE.BYTE);
  const dayNightMode = decodeAreaDayNightMode(dayNightCycle, isNight);
  if (!dayNightMode) return undefined;

  const value = {
    dayNightMode,
    shadowOpacity: readExactNumericRootField(
      view,
      entries,
      "ShadowOpacity",
      FIELD_TYPE.BYTE,
    ),
    chanceRain: readExactNumericRootField(view, entries, "ChanceRain", FIELD_TYPE.INT),
    chanceSnow: readExactNumericRootField(view, entries, "ChanceSnow", FIELD_TYPE.INT),
    chanceLightning: readExactNumericRootField(
      view,
      entries,
      "ChanceLightning",
      FIELD_TYPE.INT,
    ),
    sun: {
      ambientColor: readExactNumericRootField(
        view,
        entries,
        "SunAmbientColor",
        FIELD_TYPE.DWORD,
      ),
      diffuseColor: readExactNumericRootField(
        view,
        entries,
        "SunDiffuseColor",
        FIELD_TYPE.DWORD,
      ),
      fogColor: readExactNumericRootField(view, entries, "SunFogColor", FIELD_TYPE.DWORD),
      fogAmount: readExactNumericRootField(view, entries, "SunFogAmount", FIELD_TYPE.BYTE),
      shadows: readExactBooleanByteRootField(view, entries, "SunShadows"),
    },
    moon: {
      ambientColor: readExactNumericRootField(
        view,
        entries,
        "MoonAmbientColor",
        FIELD_TYPE.DWORD,
      ),
      diffuseColor: readExactNumericRootField(
        view,
        entries,
        "MoonDiffuseColor",
        FIELD_TYPE.DWORD,
      ),
      fogColor: readExactNumericRootField(view, entries, "MoonFogColor", FIELD_TYPE.DWORD),
      fogAmount: readExactNumericRootField(view, entries, "MoonFogAmount", FIELD_TYPE.BYTE),
      shadows: readExactBooleanByteRootField(view, entries, "MoonShadows"),
    },
  };

  if (!isAreaVisualEnvironment(value)) return undefined;
  return Object.freeze({
    ...value,
    sun: Object.freeze(value.sun),
    moon: Object.freeze(value.moon),
  });
}

function readExactBooleanByteRootField(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  label: string,
): boolean | undefined {
  const value = readExactNumericRootField(view, entries, label, FIELD_TYPE.BYTE);
  if (value !== 0 && value !== 1) return undefined;
  return value === 1;
}

function readCanonicalAreaAdvancedFlags(view: GffView): AreaAdvancedFlags | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const result: {
    terrainType?: NonNullable<AreaAdvancedFlags["terrainType"]>;
    playerVsPlayer?: NonNullable<AreaAdvancedFlags["playerVsPlayer"]>;
    noRest?: boolean;
    listenCheckModifier?: number;
    spotCheckModifier?: number;
    loadingScreenId?: number;
  } = {};

  const flags = readExactNumericRootField(view, entries, "Flags", FIELD_TYPE.DWORD);
  const terrainType = decodeAreaTerrainTypeFlags(flags);
  if (terrainType) result.terrainType = terrainType;

  const playerVsPlayer = readExactNumericRootField(
    view,
    entries,
    "PlayerVsPlayer",
    FIELD_TYPE.BYTE,
  );
  if (isAreaPlayerVsPlayerMode(playerVsPlayer)) result.playerVsPlayer = playerVsPlayer;

  const noRest = readExactNumericRootField(view, entries, "NoRest", FIELD_TYPE.BYTE);
  if (noRest === 0 || noRest === 1) result.noRest = noRest === 1;

  const listenCheckModifier = readExactNumericRootField(
    view,
    entries,
    "ModListenCheck",
    FIELD_TYPE.INT,
  );
  if (isAreaCheckModifier(listenCheckModifier)) {
    result.listenCheckModifier = listenCheckModifier;
  }

  const spotCheckModifier = readExactNumericRootField(
    view,
    entries,
    "ModSpotCheck",
    FIELD_TYPE.INT,
  );
  if (isAreaCheckModifier(spotCheckModifier)) {
    result.spotCheckModifier = spotCheckModifier;
  }

  const loadingScreenId = readExactNumericRootField(
    view,
    entries,
    "LoadScreenID",
    FIELD_TYPE.WORD,
  );
  if (isAreaLoadingScreenId(loadingScreenId)) {
    result.loadingScreenId = loadingScreenId;
  }

  return Object.keys(result).length === 0 ? undefined : Object.freeze(result);
}

function readExactNumericRootField(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  label: string,
  typeId: number,
): number | undefined {
  const matches = entries.filter((entry) => entry.label.toLowerCase() === label.toLowerCase());
  if (matches.length !== 1 || matches[0]?.label !== label || matches[0].field.typeId !== typeId) {
    return undefined;
  }
  return view.readNumber(matches[0].field);
}

function readCanonicalAreaBasicIdentity(view: GffView): AreaBasicIdentity | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const result: {
    name?: string;
    nameProfile?: AreaBasicIdentity["nameProfile"];
    nameEntries?: AreaBasicIdentity["nameEntries"];
    tag?: string;
  } = {};

  const nameMatches = entries.filter((entry) => entry.label.toLowerCase() === "name");
  if (
    nameMatches.length === 1
    && nameMatches[0]?.label === "Name"
    && nameMatches[0].field.typeId === FIELD_TYPE.CEXOLOCSTRING
  ) {
    const storage = view.readExactLocStringStorage(nameMatches[0].field);
    const admitted = storage ? readEditableAreaNameStorage(storage) : undefined;
    if (admitted) {
      result.name = admitted.name;
      result.nameProfile = admitted.profile;
      result.nameEntries = admitted.entries;
    }
  }

  const tagMatches = entries.filter((entry) => entry.label.toLowerCase() === "tag");
  if (
    tagMatches.length === 1
    && tagMatches[0]?.label === "Tag"
    && tagMatches[0].field.typeId === FIELD_TYPE.CEXOSTRING
  ) {
    const value = view.readExactString(tagMatches[0].field);
    if (isEditableAreaTag(value)) result.tag = value;
  }

  return Object.keys(result).length === 0 ? undefined : Object.freeze(result);
}

function readCanonicalAreaEventScripts(view: GffView): AreaEventScripts | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const result: Partial<Record<(typeof AREA_EVENT_SCRIPT_FIELDS)[number]["slot"], string>> = {};
  let presentCount = 0;
  for (const { slot, field } of AREA_EVENT_SCRIPT_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === field.toLowerCase(),
    );
    if (matches.length === 0) continue;
    if (
      matches.length !== 1
      || matches[0]?.label !== field
      || matches[0].field.typeId !== FIELD_TYPE.RESREF
    ) {
      return undefined;
    }
    const value = view.readExactResRef(matches[0].field);
    if (!isAreaEventScriptResRef(value)) return undefined;
    result[slot] = value;
    presentCount += 1;
  }
  return presentCount === 0 ? undefined : Object.freeze(result);
}

function readCanonicalAreaComments(view: GffView): string | undefined {
  const entries = view.getStructFieldEntries(0);
  if (!entries) return undefined;
  const caseInsensitiveMatches = entries.filter(
    (entry) => entry.label.toLowerCase() === "comments",
  );
  if (
    caseInsensitiveMatches.length !== 1
    || caseInsensitiveMatches[0]?.label !== "Comments"
  ) {
    return undefined;
  }
  const value = view.readExactString(caseInsensitiveMatches[0].field);
  return isAreaCommentsValue(value) ? value : undefined;
}

function parseAreaGlobalLightingFields(
  view: GffView,
  root: Map<string, GffFieldRef>
): ParsedAreaGlobalLightingBlueprint {
  const fields = AREA_GLOBAL_LIGHTING_FIELD_ALIASES.flatMap(({ field, aliases }) => {
    const value = readNumberByAliases(view, root, aliases);
    return Number.isFinite(value ?? Number.NaN) ? [{ field, value: value ?? 0 }] : [];
  });
  return { fields };
}

function parseAreaTileList(
  view: GffView,
  root: Map<string, GffFieldRef>,
  width: number | undefined
): ParsedAreaTileBlueprint[] {
  const listField = findFieldByAliases(root, ["tilelist"]);
  const structIndices = view.readListStructIndices(listField);
  const gridWidth = Number.isFinite(width ?? Number.NaN) && (width ?? 0) > 0 ? Math.floor(width ?? 0) : 0;
  return structIndices.map((structIndex, index) => {
    const fields = view.getStructFields(structIndex);
    const row = gridWidth > 0 ? Math.floor(index / gridWidth) : 0;
    const col = gridWidth > 0 ? index % gridWidth : index;
    const tileId = readNumberByAliases(view, fields, [
      "tileid",
      "tile_id",
      "id",
      "modelid",
      "model_id"
    ]);
    const orientation = readNumberByAliases(view, fields, [
      "orientation",
      "tileorientation",
      "tile_orientation",
      "rotation",
      "rotate"
    ]);
    const height = readNumberByAliases(view, fields, [
      "height",
      "tileheight",
      "tile_height",
      "z",
      "zposition"
    ]);
    const modelResRef = readStringByAliases(view, fields, [
      "modelresref",
      "model",
      "resref",
      "tileresref",
      "tile_resref"
    ]);
    const mainLight1 = readTileLightValueByAliases(view, fields, [
      "tilemainlight1",
      "tile_mainlight1",
      "mainlight1"
    ]);
    const mainLight2 = readTileLightValueByAliases(view, fields, [
      "tilemainlight2",
      "tile_mainlight2",
      "mainlight2"
    ]);
    const sourceLight1 = readTileLightValueByAliases(view, fields, [
      "tilesrclight1",
      "tile_srclight1",
      "sourcesrclight1",
      "sourcelight1"
    ]);
    const sourceLight2 = readTileLightValueByAliases(view, fields, [
      "tilesrclight2",
      "tile_srclight2",
      "sourcesrclight2",
      "sourcelight2"
    ]);
    const animLoop1 = readTileLightValueByAliases(view, fields, [
      "tileanimloop1",
      "tile_animloop1",
      "animloop1"
    ]);
    const animLoop2 = readTileLightValueByAliases(view, fields, [
      "tileanimloop2",
      "tile_animloop2",
      "animloop2"
    ]);
    const animLoop3 = readTileLightValueByAliases(view, fields, [
      "tileanimloop3",
      "tile_animloop3",
      "animloop3"
    ]);
    return {
      index,
      row,
      col,
      ...(Number.isFinite(tileId ?? Number.NaN) ? { tileId: Math.trunc(tileId ?? 0) } : {}),
      ...(modelResRef ? { modelResRef } : {}),
      ...(Number.isFinite(orientation ?? Number.NaN) ? { orientation: normalizeTileOrientation(orientation ?? 0) } : {}),
      ...(Number.isFinite(height ?? Number.NaN) ? { height: clampNumber(height ?? 0) } : {}),
      ...optionalTileNumber("mainLight1", mainLight1),
      ...optionalTileNumber("mainLight2", mainLight2),
      ...optionalTileNumber("sourceLight1", sourceLight1),
      ...optionalTileNumber("sourceLight2", sourceLight2),
      ...optionalTileNumber("animLoop1", animLoop1),
      ...optionalTileNumber("animLoop2", animLoop2),
      ...optionalTileNumber("animLoop3", animLoop3)
    };
  });
}

function readTileLightValueByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const value = readIntegerByAliases(view, fields, aliases);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return Math.max(0, value ?? 0);
}

function optionalTileNumber<TKey extends string>(
  key: TKey,
  value: number | undefined
): { [K in TKey]?: number } {
  return value === undefined ? {} : { [key]: value } as { [K in TKey]?: number };
}

function stringifyAreaTile(tile: ParsedAreaTileBlueprint): string {
  return [
    tile.index,
    tile.row,
    tile.col,
    tile.tileId ?? "",
    tile.modelResRef ?? "",
    tile.orientation ?? "",
    tile.height ?? "",
    tile.mainLight1 ?? "",
    tile.mainLight2 ?? "",
    tile.sourceLight1 ?? "",
    tile.sourceLight2 ?? "",
    tile.animLoop1 ?? "",
    tile.animLoop2 ?? "",
    tile.animLoop3 ?? ""
  ].join(":");
}

function normalizeTileOrientation(value: number): number {
  const numeric = Math.trunc(value);
  return ((numeric % 4) + 4) % 4;
}

export function parseAreaObjectsFromGitGff(
  bytes: Buffer
): ParsedAreaObjectBlueprint | null {
  const view = GffView.fromBuffer(bytes);
  if (!view) {
    return null;
  }
  if (view.header.fileType.trim() !== "GIT") {
    return null;
  }

  const root = view.getStructFields(0);
  const raw = parseRawGffDocument(bytes);
  const rawRootFields = raw?.fileType.trim() === "GIT" ? raw.fields : undefined;

  const soundIds = parseGitAreaProperties(view, root);
  const audioEnvironment = readCanonicalGitAreaAudioEnvironment(view);
  const variables = readCanonicalGitAreaVariables(view);
  const placeables = parsePlacementList(view, root, ["placeablelist"], "placeable");
  const doors = parsePlacementList(view, root, ["doorlist"], "door");
  const creatures = parsePlacementList(
    view,
    root,
    ["creaturelist"],
    "creature",
    readRawPlacementStructs(rawRootFields, ["creaturelist"]),
  );
  const encounters = parsePlacementList(view, root, ["encounterlist"], "encounter");
  const items = parsePlacementList(view, root, ["itemlist", "list"], "item");
  const sounds = parsePlacementList(view, root, ["soundlist"], "sound");
  const stores = parsePlacementList(view, root, ["storelist"], "store");
  const triggers = parsePlacementList(view, root, ["triggerlist"], "trigger");
  const waypoints = parsePlacementList(view, root, ["waypointlist"], "waypoint");

  const dependencyFingerprint = createHash("sha256")
    .update(
      [
        stringifyAreaSoundIds(soundIds),
        ...(audioEnvironment
          ? AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS.map(
              ({ property }) => `${property}:${audioEnvironment[property]}`,
            )
          : ["audio-environment:preserve-only"]),
        variables ? JSON.stringify(variables) : "area-variables:preserve-only",
        ...placeables.map((entry) => stringifyPlacement(entry)),
        ...doors.map((entry) => stringifyPlacement(entry)),
        ...creatures.map((entry) => stringifyPlacement(entry)),
        ...encounters.map((entry) => stringifyPlacement(entry)),
        ...items.map((entry) => stringifyPlacement(entry)),
        ...sounds.map((entry) => stringifyPlacement(entry)),
        ...stores.map((entry) => stringifyPlacement(entry)),
        ...triggers.map((entry) => stringifyPlacement(entry)),
        ...waypoints.map((entry) => stringifyPlacement(entry))
      ].join("|")
    )
    .digest("hex");

  return {
    sourceFileType: view.header.fileType,
    sourceFileVersion: view.header.fileVersion,
    sourceStructTypeId: view.structs[0]?.typeId ?? 0,
    soundIds,
    ...(audioEnvironment ? { audioEnvironment } : {}),
    ...(variables ? { variables } : {}),
    placeables,
    doors,
    creatures,
    encounters,
    items,
    sounds,
    stores,
    triggers,
    waypoints,
    dependencyFingerprint
  };
}

/** Reads one exact top-level Area-owned GIT VarTable; exact absence is empty. */
export function parseAreaVariablesFromGitGff(
  bytes: Buffer,
): AuroraVariableProvenance | null {
  const view = GffView.fromBuffer(bytes);
  if (!view || view.header.fileType !== "GIT " || view.header.fileVersion !== "V3.2") {
    return null;
  }
  return readCanonicalGitAreaVariables(view) ?? null;
}

function readCanonicalGitAreaVariables(
  view: GffView,
): AuroraVariableProvenance | undefined {
  if (view.header.fileType !== "GIT " || view.header.fileVersion !== "V3.2") {
    return undefined;
  }
  return readAuroraVariables(view, 0);
}

/** Reads only one complete exact-case, type-100, nine-INT GIT audio tuple. */
export function parseAreaAudioEnvironmentFromGitGff(
  bytes: Buffer,
): AreaAudioEnvironment | null {
  const view = GffView.fromBuffer(bytes);
  if (!view || view.header.fileType !== "GIT " || view.header.fileVersion !== "V3.2") {
    return null;
  }
  return readCanonicalGitAreaAudioEnvironment(view) ?? null;
}

function readCanonicalGitAreaAudioEnvironment(
  view: GffView,
): AreaAudioEnvironment | undefined {
  if (view.header.fileType !== "GIT " || view.header.fileVersion !== "V3.2") {
    return undefined;
  }
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return undefined;
  const areaPropertiesMatches = rootEntries.filter(
    (entry) => entry.label.toLowerCase() === "areaproperties",
  );
  if (areaPropertiesMatches.length !== 1 ||
      areaPropertiesMatches[0]?.label !== "AreaProperties" ||
      areaPropertiesMatches[0].field.typeId !== FIELD_TYPE.STRUCT) return undefined;
  const structIndex = view.readStructIndex(areaPropertiesMatches[0].field);
  if (structIndex === undefined || view.structs[structIndex]?.typeId !== 100) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const value: Partial<Record<keyof AreaAudioEnvironment, number>> = {};
  for (const { property, label } of AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === label.toLowerCase(),
    );
    if (matches.length !== 1 || matches[0]?.label !== label ||
        matches[0].field.typeId !== FIELD_TYPE.INT) return undefined;
    const fieldValue = view.readNumber(matches[0].field);
    if (fieldValue === undefined) return undefined;
    value[property] = fieldValue;
  }
  return isAreaAudioEnvironment(value) ? Object.freeze(value) : undefined;
}

export function parseAreaObjectsFromGitGicGff(
  gitBytes: Buffer,
  gicBytes: Buffer,
): ParsedAreaObjectBlueprint | null {
  const parsed = parseAreaObjectsFromGitGff(gitBytes);
  if (!parsed) return null;
  const gitView = GffView.fromBuffer(gitBytes);
  if (
    !gitView ||
    gitView.header.fileType !== "GIT " ||
    gitView.header.fileVersion !== "V3.2"
  ) return null;
  const gitPlaceableIndices = readExactPlaceableListStructIndices(gitView);
  if (!gitPlaceableIndices || gitPlaceableIndices.length !== parsed.placeables.length) return null;
  const comments = parseAreaPlaceableEditorCommentsFromGicGff(
    gicBytes,
    gitPlaceableIndices.length,
  );
  if (!comments) return null;

  const gitCreatureIndices = readExactCreatureListStructIndices(gitView);
  if (!gitCreatureIndices || gitCreatureIndices.length !== parsed.creatures.length) return null;
  const creatureComments = gitCreatureIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaCreatureEditorCommentsFromGicGff(gicBytes, gitCreatureIndices.length);
  if (!creatureComments) return null;

  const gitItemIndices = readExactItemListStructIndices(gitView);
  if (!gitItemIndices || gitItemIndices.length !== parsed.items.length) return null;
  const itemComments = gitItemIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaItemEditorCommentsFromGicGff(gicBytes, gitItemIndices.length);
  if (!itemComments) return null;

  const gitStoreIndices = readExactStoreListStructIndices(gitView);
  if (!gitStoreIndices || gitStoreIndices.length !== parsed.stores.length) return null;
  const storeComments = gitStoreIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaStoreEditorCommentsFromGicGff(gicBytes, gitStoreIndices.length);
  if (!storeComments) return null;

  const gitEncounterIndices = readExactEncounterListStructIndices(gitView);
  if (!gitEncounterIndices || gitEncounterIndices.length !== parsed.encounters.length) return null;
  const encounterComments = gitEncounterIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaEncounterEditorCommentsFromGicGff(gicBytes, gitEncounterIndices.length);
  if (!encounterComments) return null;

  const gitWaypointIndices = readExactWaypointListStructIndices(gitView);
  if (!gitWaypointIndices || gitWaypointIndices.length !== parsed.waypoints.length) return null;
  const waypointComments = gitWaypointIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaWaypointEditorCommentsFromGicGff(gicBytes, gitWaypointIndices.length);
  if (!waypointComments) return null;

  const gitTriggerIndices = readExactTriggerListStructIndices(gitView);
  if (!gitTriggerIndices || gitTriggerIndices.length !== parsed.triggers.length) return null;
  const triggerComments = gitTriggerIndices.length === 0
    ? Object.freeze([] as Array<string | undefined>)
    : parseAreaTriggerEditorCommentsFromGicGff(gicBytes, gitTriggerIndices.length);
  if (!triggerComments) return null;

  const placeables = parsed.placeables.map((placement, sourceIndex) => {
    const editorComment = comments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      placeableMetadata: {
        ...(placement.placeableMetadata ?? {}),
        editorComment,
      },
    };
  });
  const creatures = parsed.creatures.map((placement, sourceIndex) => {
    const editorComment = creatureComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      creatureMetadata: {
        ...(placement.creatureMetadata ?? {}),
        editorComment,
      },
    };
  });
  const items = parsed.items.map((placement, sourceIndex) => {
    const editorComment = itemComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      itemMetadata: {
        ...(placement.itemMetadata ?? {}),
        editorComment,
      },
    };
  });
  const stores = parsed.stores.map((placement, sourceIndex) => {
    const editorComment = storeComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      storeMetadata: {
        ...(placement.storeMetadata ?? {}),
        editorComment,
      },
    };
  });
  const encounters = parsed.encounters.map((placement, sourceIndex) => {
    const editorComment = encounterComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      encounterMetadata: {
        ...(placement.encounterMetadata ?? {}),
        editorComment,
      },
    };
  });
  const waypoints = parsed.waypoints.map((placement, sourceIndex) => {
    const editorComment = waypointComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      waypointMetadata: {
        ...(placement.waypointMetadata ?? {}),
        editorComment,
      },
    };
  });
  const triggers = parsed.triggers.map((placement, sourceIndex) => {
    const editorComment = triggerComments[sourceIndex];
    if (editorComment === undefined) return placement;
    return {
      ...placement,
      triggerMetadata: {
        ...(placement.triggerMetadata ?? {}),
        editorComment,
      },
    };
  });
  const commentFingerprint = comments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const creatureCommentFingerprint = creatureComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const itemCommentFingerprint = itemComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const storeCommentFingerprint = storeComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const encounterCommentFingerprint = encounterComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const waypointCommentFingerprint = waypointComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  const triggerCommentFingerprint = triggerComments
    .map((comment) => comment === undefined ? "absent" : `present:${comment.length}:${comment}`)
    .join("|");
  return {
    ...parsed,
    placeables,
    creatures,
    items,
    stores,
    encounters,
    waypoints,
    triggers,
    dependencyFingerprint: createHash("sha256")
      .update(
        `${parsed.dependencyFingerprint}|gic-placeable-comments|${commentFingerprint}` +
        `|gic-creature-comments|${creatureCommentFingerprint}` +
        `|gic-item-comments|${itemCommentFingerprint}` +
        `|gic-store-comments|${storeCommentFingerprint}` +
        `|gic-encounter-comments|${encounterCommentFingerprint}` +
        `|gic-waypoint-comments|${waypointCommentFingerprint}` +
        `|gic-trigger-comments|${triggerCommentFingerprint}`,
      )
      .digest("hex"),
  };
}

export function parseAreaTriggerEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedTriggerCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedTriggerCount) || expectedTriggerCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactTriggerListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedTriggerCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 1) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaTriggerEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaWaypointEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedWaypointCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedWaypointCount) || expectedWaypointCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactWaypointListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedWaypointCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 5) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaWaypointEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaEncounterEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedEncounterCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedEncounterCount) || expectedEncounterCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactEncounterListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedEncounterCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 7) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaEncounterEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaStoreEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedStoreCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedStoreCount) || expectedStoreCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactStoreListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedStoreCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 11) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaStoreEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaItemEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedItemCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedItemCount) || expectedItemCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactItemListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedItemCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 0) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaItemEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaCreatureEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedCreatureCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedCreatureCount) || expectedCreatureCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactCreatureListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedCreatureCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 4) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaCreatureEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

export function parseAreaPlaceableEditorCommentsFromGicGff(
  gicBytes: Buffer,
  expectedPlaceableCount: number,
): readonly (string | undefined)[] | null {
  if (!Number.isInteger(expectedPlaceableCount) || expectedPlaceableCount < 0) return null;
  const view = GffView.fromBuffer(gicBytes);
  if (!view || view.header.fileType !== "GIC " || view.header.fileVersion !== "V3.2") return null;
  const structIndices = readExactPlaceableListStructIndices(view);
  if (!structIndices || structIndices.length !== expectedPlaceableCount) return null;
  const comments: Array<string | undefined> = [];
  for (const structIndex of structIndices) {
    const entries = view.getStructFieldEntries(structIndex);
    if (!entries || view.structs[structIndex]?.typeId !== 9) return null;
    const commentFields = entries.filter((entry) => entry.label === "Comment");
    if (commentFields.length === 0) {
      comments.push(undefined);
      continue;
    }
    if (commentFields.length !== 1) return null;
    const value = view.readExactString(commentFields[0].field);
    if (!isAreaPlaceableEditorComment(value)) return null;
    comments.push(value);
  }
  return Object.freeze(comments);
}

function readExactPlaceableListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "Placeable List");
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 9)
    ? structIndices
    : null;
}

function readExactCreatureListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "Creature List");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 4)
    ? structIndices
    : null;
}

function readExactItemListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "List");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 0)
    ? structIndices
    : null;
}

function readExactStoreListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "StoreList");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 11)
    ? structIndices
    : null;
}

function readExactEncounterListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "Encounter List");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 7)
    ? structIndices
    : null;
}

function readExactWaypointListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "WaypointList");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 5)
    ? structIndices
    : null;
}

function readExactTriggerListStructIndices(view: GffView): readonly number[] | null {
  const rootEntries = view.getStructFieldEntries(0);
  if (!rootEntries) return null;
  const listFields = rootEntries.filter((entry) => entry.label === "TriggerList");
  if (listFields.length === 0) return Object.freeze([]);
  if (listFields.length !== 1) return null;
  const structIndices = view.readExactListStructIndices(listFields[0].field);
  if (!structIndices) return null;
  return structIndices.every((structIndex) => view.structs[structIndex]?.typeId === 1)
    ? structIndices
    : null;
}

const AURORA_DEFAULT_AMBIENT_SOUND_VOLUME = 0x7f;

/**
 * Reads area audio settings from the GIT root `AreaProperties` struct.
 * Aurora stores AmbientSnd and Music fields only here (never in the .are
 * file) and defaults both ambient volumes to 127 when absent.
 */
function parseGitAreaProperties(
  view: GffView,
  root: Map<string, GffFieldRef>
): ParsedAreaSoundIds {
  const structIndex = view.readStructIndex(findFieldByAliases(root, ["areaproperties"]));
  if (structIndex === undefined) {
    return {};
  }
  const fields = view.getStructFields(structIndex);
  const soundIds: ParsedAreaSoundIds = {
    ambientDay: readNumberByAliases(view, fields, ["ambientsndday"]),
    ambientNight: readNumberByAliases(view, fields, ["ambientsndnight"]),
    ambientDayVolume:
      readNumberByAliases(view, fields, ["ambientsnddayvol"]) ??
      AURORA_DEFAULT_AMBIENT_SOUND_VOLUME,
    ambientNightVolume:
      readNumberByAliases(view, fields, ["ambientsndnitvol"]) ??
      AURORA_DEFAULT_AMBIENT_SOUND_VOLUME,
    envAudio: readNumberByAliases(view, fields, ["envaudio"]),
    musicDay: readNumberByAliases(view, fields, ["musicday"]),
    musicNight: readNumberByAliases(view, fields, ["musicnight"]),
    musicBattle: readNumberByAliases(view, fields, ["musicbattle"]),
    musicDelay: readNumberByAliases(view, fields, ["musicdelay"])
  };
  for (const key of Object.keys(soundIds) as Array<keyof ParsedAreaSoundIds>) {
    if (soundIds[key] === undefined) {
      delete soundIds[key];
    }
  }
  return soundIds;
}

function stringifyAreaSoundIds(soundIds: ParsedAreaSoundIds): string {
  return [
    soundIds.ambientDay ?? "",
    soundIds.ambientNight ?? "",
    soundIds.ambientDayVolume ?? "",
    soundIds.ambientNightVolume ?? "",
    soundIds.envAudio ?? "",
    soundIds.musicDay ?? "",
    soundIds.musicNight ?? "",
    soundIds.musicBattle ?? "",
    soundIds.musicDelay ?? ""
  ].join(":");
}

function readRawPlacementStructs(
  fields: readonly SupportedGffField[] | undefined,
  aliases: readonly string[],
): readonly { typeId: number; fields: SupportedGffField[] }[] | undefined {
  if (!fields) return undefined;
  const normalizedAliases = new Set(aliases.map(normalizeLabel));
  const matches = fields.filter((field) => normalizedAliases.has(normalizeLabel(field.label)));
  const field = matches[0];
  return matches.length === 1 && field?.type === "list" ? field.value : undefined;
}

function parsePlacementList(
  view: GffView,
  root: Map<string, GffFieldRef>,
  aliases: readonly string[],
  kind: ParsedAreaPlacementBlueprint["listKind"],
  rawStructs?: readonly { typeId: number; fields: SupportedGffField[] }[],
): ParsedAreaPlacementBlueprint[] {
  const listField = findFieldByAliases(root, aliases);
  const structIndices = view.readListStructIndices(listField);
  const placements: ParsedAreaPlacementBlueprint[] = [];

  for (const [placementIndex, structIndex] of structIndices.entries()) {
    const fields = view.getStructFields(structIndex);

    const positionStructIndex = view.readStructIndex(
      findFieldByAliases(fields, ["position", "location"])
    );
    const positionStruct =
      positionStructIndex === undefined ? new Map<string, GffFieldRef>() : view.getStructFields(positionStructIndex);

    let x =
      readNumberByAliases(view, fields, ["xposition", "x", "xpos"]) ??
      readNumberByAliases(view, positionStruct, ["x"]);
    let y =
      readNumberByAliases(view, fields, ["yposition", "y", "ypos"]) ??
      readNumberByAliases(view, positionStruct, ["y"]);
    let z =
      readNumberByAliases(view, fields, ["zposition", "z", "zpos"]) ??
      readNumberByAliases(view, positionStruct, ["z"]);
    const geometry = kind === "trigger" || kind === "encounter" ? readPlacementGeometry(view, fields) : [];
    const polygonGeometry = kind === "trigger" || kind === "encounter"
      ? readExactEditablePlacementPolygon(view, structIndex, kind)
      : undefined;
    if ((x === undefined || y === undefined || z === undefined) && kind === "trigger") {
      const geometryCenter = readGeometryCenter(geometry);
      x = x ?? geometryCenter?.x;
      y = y ?? geometryCenter?.y;
      z = z ?? geometryCenter?.z;
    }
    z = z ?? 0;

    const xOrientation =
      readNumberByAliases(view, fields, ["xorientation"]) ??
      readNumberByAliases(view, positionStruct, ["xorientation"]);
    const yOrientation =
      readNumberByAliases(view, fields, ["yorientation"]) ??
      readNumberByAliases(view, positionStruct, ["yorientation"]);

    const explicitBearingRadians = readNumberByAliases(view, fields, ["bearing", "facing", "orientation"]);
    const derivedBearing =
      (explicitBearingRadians !== undefined
        ? deriveBearingFromRadians(explicitBearingRadians)
        : undefined) ??
      deriveBearingFromOrientation(xOrientation, yOrientation) ??
      0;

    const templateResRef = readStringByAliases(view, fields, [
      "templateresref",
      "resref",
      "template",
      "sound",
      "soundresref"
    ]);
    const tag = readStringByAliases(view, fields, ["tag"]);
    const localizedNameInfo = readNameInfoByAliases(view, fields, [
      "locname",
      "localizedname",
      "name"
    ]);
    const localizedName = localizedNameInfo.text;
    const description =
      readNameByAliases(view, fields, ["description", "identifieddescription", "desc"]) ??
      readAlternateLocalizedNameEntry(localizedNameInfo, localizedName);
    const appearanceType =
      kind === "placeable" || kind === "door" || kind === "creature"
        ? readIntegerByAliases(view, fields, ["appearance", "appearancetype", "appearanceid"])
        : undefined;
    const useable =
      kind === "placeable" ? readBooleanByAliases(view, fields, ["useable"]) : undefined;
    const isStatic =
      kind === "placeable"
        ? (readBooleanByAliases(view, fields, ["static"]) ??
          (useable !== undefined ? !useable : undefined))
        : undefined;
    // Aurora initializes a door GenericType to 0, then overwrites it only when
    // GenericType_New or GenericType exists in the GFF.  Preserve that runtime
    // default when legacy GIT entries omit the field so the door can resolve
    // through genericdoors.2da rather than being treated as source-incomplete.
    const genericType =
      kind === "door"
        ? (readIntegerByAliases(view, fields, ["generictype", "genericappearance"]) ?? 0)
        : undefined;
    const soundPositioning =
      kind === "sound" ? parseSoundPositioning(view, fields, clampNumber(z)) : undefined;
    const soundIntervalVariation =
      kind === "sound" ? readExactSoundIntervalVariationStorage(view, structIndex) : undefined;
    const soundVolume = kind === "sound" ? readExactSoundVolumeStorage(view, structIndex) : undefined;
    const soundActive = kind === "sound" ? readExactSoundActiveStorage(view, structIndex) : undefined;
    const soundPlayOrder = kind === "sound"
      ? readExactSoundPlayOrderStorage(view, structIndex)
      : undefined;
    const soundPlayStyle = kind === "sound"
      ? readExactSoundPlayStyleStorage(view, structIndex)
      : undefined;
    const soundPlayback = kind === "sound"
      ? readExactSoundPlaybackStorage(view, structIndex)
      : undefined;
    const soundProfile = kind === "sound"
      ? readExactSoundProfileStorage(view, structIndex)
      : undefined;
    const soundSchedule = kind === "sound"
      ? readExactSoundScheduleStorage(view, structIndex)
      : undefined;
    const doorTransition =
      kind === "door" ? parseDoorTransition(view, structIndex, fields) : undefined;
    const creatureMetadata =
      kind === "creature"
        ? buildCreatureMetadata(view, structIndex, fields, templateResRef, tag, appearanceType)
        : undefined;
    const creatureTag =
      kind === "creature" ? readCreatureTag(view, structIndex) : undefined;
    const creatureConversation =
      kind === "creature" ? readCreatureConversation(view, structIndex) : undefined;
    const creatureInterruptable =
      kind === "creature" ? readCreatureInterruptable(view, structIndex) : undefined;
    const creatureAdvancedFlags =
      kind === "creature" ? readCreatureAdvancedFlags(view, structIndex) : undefined;
    const creatureBodyBag =
      kind === "creature" ? readCreatureBodyBag(view, structIndex) : undefined;
    const creatureDecayTime =
      kind === "creature" ? readCreatureDecayTime(view, structIndex) : undefined;
    const creatureFaction =
      kind === "creature" ? readCreatureFaction(view, structIndex) : undefined;
    const creatureTemplateResRef =
      kind === "creature" ? readCreatureTemplateResRef(view, structIndex) : undefined;
    const creatureSpecialIdentityStrings =
      kind === "creature" ? readCreatureSpecialIdentityStrings(view, structIndex) : undefined;
    const creatureScriptResRefs =
      kind === "creature" ? readCreatureScriptResRefs(view, structIndex) : undefined;
    const creatureAppearance =
      kind === "creature" ? readCreatureAppearance(view, structIndex) : undefined;
    const creatureGender =
      kind === "creature" ? readCreatureGender(view, structIndex) : undefined;
    const creaturePerceptionRange =
      kind === "creature" ? readCreaturePerceptionRange(view, structIndex) : undefined;
    const creatureWalkRate =
      kind === "creature" ? readCreatureWalkRate(view, structIndex) : undefined;
    const creatureSoundSetFile =
      kind === "creature" ? readCreatureSoundSetFile(view, structIndex) : undefined;
    const creatureStartingPackage =
      kind === "creature" ? readCreatureStartingPackage(view, structIndex) : undefined;
    const creatureSkillList =
      kind === "creature" ? readExactCreatureSkillList(view, structIndex) : undefined;
    const creatureFeatList =
      kind === "creature" ? readExactCreatureFeatList(view, structIndex) : undefined;
    const creatureSpecialAbilityList = kind === "creature"
      ? readExactCreatureSpecialAbilityList(view, structIndex)
      : undefined;
    const creatureVariables =
      kind === "creature" ? readCreatureVariables(view, structIndex) : undefined;
    const creatureClassLevelState =
      kind === "creature" ? readExactCreatureClassLevelState(view, structIndex) : undefined;
    const creatureClassIdentityState = kind === "creature"
      ? readExactCreatureClassIdentityState(rawStructs?.[placementIndex])
      : undefined;
    const creaturePhenotype =
      kind === "creature" ? readCreaturePhenotype(view, structIndex) : undefined;
    const creaturePortrait =
      kind === "creature" ? readCreaturePortrait(view, structIndex) : undefined;
    const creatureChallengeRating =
      kind === "creature" ? readCreatureChallengeRating(view, structIndex) : undefined;
    const creatureAbilityScores =
      kind === "creature" ? readCreatureAbilityScores(view, structIndex) : undefined;
    const creatureAppearanceColors =
      kind === "creature" ? readCreatureAppearanceColors(view, structIndex) : undefined;
    const creatureBodyParts =
      kind === "creature" ? readCreatureBodyParts(view, structIndex) : undefined;
    const creatureAppendages =
      kind === "creature" ? readCreatureAppendages(view, structIndex) : undefined;
    const creatureHitPointState =
      kind === "creature" ? readCreatureHitPointState(view, structIndex) : undefined;
    const creatureNaturalArmorClass =
      kind === "creature" ? readCreatureNaturalArmorClass(view, structIndex) : undefined;
    const creatureSavingThrowBonuses =
      kind === "creature" ? readCreatureSavingThrowBonuses(view, structIndex) : undefined;
    const creatureAlignment =
      kind === "creature" ? readCreatureAlignment(view, structIndex) : undefined;
    const creatureLocalizedStrings =
      kind === "creature" ? readCreatureNameLocalizedStrings(view, structIndex) : undefined;
    const placeableMetadata =
      kind === "placeable"
        ? buildPlaceableMetadata(view, structIndex, fields, templateResRef, tag, appearanceType)
        : undefined;
    const placeableBasicIdentity =
      kind === "placeable" ? readPlaceableBasicIdentity(view, structIndex) : undefined;
    const placeableTrapType =
      kind === "placeable" ? readPlaceableTrapType(view, structIndex) : undefined;
    const placeableBodyBag =
      kind === "placeable" ? readPlaceableBodyBag(view, structIndex) : undefined;
    const placeablePortraitId =
      kind === "placeable" ? readPlaceablePortraitId(view, structIndex) : undefined;
    const placeableFaction =
      kind === "placeable" ? readPlaceableFaction(view, structIndex) : undefined;
    const placeableVariables =
      kind === "placeable" ? readPlaceableVariables(view, structIndex) : undefined;
    const placeableTemplateResRef =
      kind === "placeable" ? readPlaceableTemplateResRef(view, structIndex) : undefined;
    const placeableLocalizedStrings =
      kind === "placeable" ? readPlaceableLocalizedStrings(view, structIndex) : undefined;
    const itemMetadata =
      kind === "item" ? buildItemMetadata(view, fields, templateResRef, tag) : undefined;
    const itemTag = kind === "item" ? readExactItemTag(view, structIndex) : undefined;
    const triggerTag = kind === "trigger"
      ? readExactTriggerTag(view, structIndex)
      : undefined;
    const triggerTemplateResRef = kind === "trigger"
      ? readExactTriggerTemplateResRef(view, structIndex)
      : undefined;
    const triggerLocalizedName = kind === "trigger"
      ? readExactTriggerLocalizedNameStorage(view, structIndex)
      : undefined;
    const triggerScriptResRefs = kind === "trigger"
      ? readExactTriggerScriptResRefsStorage(view, structIndex)
      : undefined;
    const triggerTransitionStorage = kind === "trigger"
      ? readExactTriggerTransitionStorage(view, structIndex)
      : undefined;
    const triggerCoreProperties = kind === "trigger"
      ? readExactTriggerCoreProperties(view, structIndex)
      : undefined;
    const triggerTrapProperties = kind === "trigger"
      ? readExactTriggerTrapProperties(view, structIndex)
      : undefined;
    const triggerVariables = kind === "trigger"
      ? readTriggerVariables(view, structIndex)
      : undefined;
    const encounterTag = kind === "encounter"
      ? readExactEncounterTag(view, structIndex)
      : undefined;
    const encounterTemplateResRef = kind === "encounter"
      ? readExactEncounterTemplateResRef(view, structIndex)
      : undefined;
    const waypointTag = kind === "waypoint"
      ? readExactWaypointTag(view, structIndex)
      : undefined;
    const waypointTemplateResRef = kind === "waypoint"
      ? readExactWaypointTemplateResRef(view, structIndex)
      : undefined;
    const waypointLocalizedName = kind === "waypoint"
      ? readExactWaypointLocalizedNameStorage(view, structIndex)
      : undefined;
    const waypointDescription = kind === "waypoint"
      ? readExactWaypointDescriptionStorage(view, structIndex)
      : undefined;
    const waypointMapNote = kind === "waypoint"
      ? readExactWaypointMapNoteStorage(view, structIndex)
      : undefined;
    const waypointAppearance = kind === "waypoint"
      ? readExactWaypointAppearanceStorage(view, structIndex)
      : undefined;
    const encounterActive = kind === "encounter"
      ? readExactEncounterActiveStorage(view, structIndex)
      : undefined;
    const encounterPlayerOnly = kind === "encounter"
      ? readExactEncounterPlayerOnlyStorage(view, structIndex)
      : undefined;
    const encounterReset = kind === "encounter"
      ? readExactEncounterResetStorage(view, structIndex)
      : undefined;
    const encounterResetTime = kind === "encounter"
      ? readExactEncounterResetTimeStorage(view, structIndex)
      : undefined;
    const encounterSpawnOption = kind === "encounter"
      ? readExactEncounterSpawnOptionStorage(view, structIndex)
      : undefined;
    const encounterRespawns = kind === "encounter"
      ? readExactEncounterRespawnsStorage(view, structIndex)
      : undefined;
    const encounterCreatureCounts = kind === "encounter"
      ? readExactEncounterCreatureCountStorage(view, structIndex)
      : undefined;
    const encounterScriptResRefs = kind === "encounter"
      ? readExactEncounterScriptResRefsStorage(view, structIndex)
      : undefined;
    const encounterFaction = kind === "encounter"
      ? readExactEncounterFactionStorage(view, structIndex)
      : undefined;
    const encounterDifficulty = kind === "encounter"
      ? readExactEncounterDifficultyStorage(view, structIndex)
      : undefined;
    const encounterLocalizedName = kind === "encounter"
      ? readExactEncounterLocalizedNameStorage(view, structIndex)
      : undefined;
    const encounterVariables = kind === "encounter"
      ? readEncounterVariables(view, structIndex)
      : undefined;
    const waypointVariables = kind === "waypoint"
      ? readWaypointVariables(view, structIndex)
      : undefined;
    const encounterCreatureList = kind === "encounter"
      ? readExactEncounterCreatureList(view, structIndex)
      : undefined;
    const encounterSpawnPoints = kind === "encounter"
      ? readExactEncounterSpawnPointList(view, structIndex)
      : undefined;
    const itemTemplateResRef = kind === "item"
      ? readExactItemTemplateResRef(view, structIndex)
      : undefined;
    const itemInstanceState =
      kind === "item" ? readExactItemInstanceState(view, structIndex) : undefined;
    const itemLocalizedStrings =
      kind === "item" ? readItemLocalizedStrings(view, structIndex) : undefined;
    const itemVariables =
      kind === "item" ? readItemVariables(view, structIndex) : undefined;
    const itemPropertyList =
      kind === "item" ? readExactItemPropertyList(view, structIndex) : undefined;
    const itemBaseAppearanceRaw =
      kind === "item" ? readExactItemBaseAppearanceRaw(view, structIndex) : undefined;
    const itemInventoryItems =
      kind === "item" ? readExactItemInventoryItems(view, structIndex) : undefined;
    const itemVisualTransform =
      kind === "item" ? readExactItemVisualTransform(view, structIndex) : undefined;
    const storeCommerce =
      kind === "store" ? readExactAreaStoreCommerce(view, structIndex) : undefined;
    const storeScriptResRefs =
      kind === "store" ? readExactAreaStoreScriptResRefs(view, structIndex) : undefined;
    const storeVariables =
      kind === "store" ? readStoreVariables(view, structIndex) : undefined;
    const storeRestrictionsRaw =
      kind === "store" ? readExactAreaStoreRestrictions(view, structIndex) : undefined;
    const storeInventoryRaw =
      kind === "store" ? readExactAreaStoreInventory(view, structIndex) : undefined;
    const storeMetadata = storeCommerce || storeScriptResRefs || storeVariables
      ? Object.freeze({
          ...(storeScriptResRefs ? { scriptResRefs: storeScriptResRefs } : {}),
          ...(storeCommerce ? { commerce: storeCommerce } : {}),
          ...(storeVariables ? { variables: storeVariables } : {}),
        })
      : undefined;
    const visualTransform = parseVisualTransform(view, fields);

    if (!Number.isFinite(x ?? Number.NaN) || !Number.isFinite(y ?? Number.NaN)) {
      continue;
    }

    placements.push({
      listKind: kind,
      templateResRef,
      tag,
      ...(localizedName ? { localizedName } : {}),
      ...(description ? { description } : {}),
      ...(appearanceType !== undefined ? { appearanceType } : {}),
      ...(genericType !== undefined ? { genericType } : {}),
      ...(isStatic !== undefined ? { isStatic } : {}),
      ...(placeableBasicIdentity ? { placeableBasicIdentity } : {}),
      ...(placeableTrapType ? { placeableTrapType } : {}),
      ...(placeableBodyBag ? { placeableBodyBag } : {}),
      ...(placeablePortraitId ? { placeablePortraitId } : {}),
      ...(placeableFaction ? { placeableFaction } : {}),
      ...(placeableVariables ? { placeableVariables } : {}),
      ...(placeableTemplateResRef ? { placeableTemplateResRef } : {}),
      ...(placeableLocalizedStrings ? { placeableLocalizedStrings } : {}),
      ...(placeableMetadata ? { placeableMetadata } : {}),
      ...(creatureTag ? { creatureTag } : {}),
      ...(creatureConversation ? { creatureConversation } : {}),
      ...(creatureInterruptable ? { creatureInterruptable } : {}),
      ...(creatureAdvancedFlags ? { creatureAdvancedFlags } : {}),
      ...(creatureBodyBag ? { creatureBodyBag } : {}),
      ...(creatureDecayTime ? { creatureDecayTime } : {}),
      ...(creatureFaction ? { creatureFaction } : {}),
      ...(creatureTemplateResRef ? { creatureTemplateResRef } : {}),
      ...(creatureSpecialIdentityStrings ? { creatureSpecialIdentityStrings } : {}),
      ...(creatureScriptResRefs ? { creatureScriptResRefs } : {}),
      ...(creatureAppearance ? { creatureAppearance } : {}),
      ...(creatureGender ? { creatureGender } : {}),
      ...(creaturePerceptionRange ? { creaturePerceptionRange } : {}),
      ...(creatureWalkRate ? { creatureWalkRate } : {}),
      ...(creatureSoundSetFile ? { creatureSoundSetFile } : {}),
      ...(creatureStartingPackage ? { creatureStartingPackage } : {}),
      ...(creatureSkillList ? { creatureSkillList } : {}),
      ...(creatureFeatList ? { creatureFeatList } : {}),
      ...(creatureSpecialAbilityList ? { creatureSpecialAbilityList } : {}),
      ...(creatureVariables ? { creatureVariables } : {}),
      ...(creatureClassLevelState ? { creatureClassLevelState } : {}),
      ...(creatureClassIdentityState ? { creatureClassIdentityState } : {}),
      ...(creaturePhenotype ? { creaturePhenotype } : {}),
      ...(creaturePortrait ? { creaturePortrait } : {}),
      ...(creatureChallengeRating ? { creatureChallengeRating } : {}),
      ...(creatureAbilityScores ? { creatureAbilityScores } : {}),
      ...(creatureAppearanceColors ? { creatureAppearanceColors } : {}),
      ...(creatureBodyParts ? { creatureBodyParts } : {}),
      ...(creatureAppendages ? { creatureAppendages } : {}),
      ...(creatureHitPointState ? { creatureHitPointState } : {}),
      ...(creatureNaturalArmorClass ? { creatureNaturalArmorClass } : {}),
      ...(creatureSavingThrowBonuses ? { creatureSavingThrowBonuses } : {}),
      ...(creatureAlignment ? { creatureAlignment } : {}),
      ...(creatureLocalizedStrings ? { creatureLocalizedStrings } : {}),
      ...(creatureMetadata ? { creatureMetadata } : {}),
      ...(itemTag ? { itemTag } : {}),
      ...(triggerTag ? { triggerTag } : {}),
      ...(triggerTemplateResRef ? { triggerTemplateResRef } : {}),
      ...(triggerLocalizedName ? { triggerLocalizedName } : {}),
      ...(triggerScriptResRefs ? { triggerScriptResRefs } : {}),
      ...(triggerTransitionStorage ? { triggerTransitionStorage } : {}),
      ...(triggerCoreProperties ? { triggerCoreProperties } : {}),
      ...(triggerTrapProperties ? { triggerTrapProperties } : {}),
      ...(triggerVariables ? { triggerVariables } : {}),
      ...(encounterTag ? { encounterTag } : {}),
      ...(encounterTemplateResRef ? { encounterTemplateResRef } : {}),
      ...(waypointTag ? { waypointTag } : {}),
      ...(waypointTemplateResRef ? { waypointTemplateResRef } : {}),
      ...(waypointLocalizedName ? { waypointLocalizedName } : {}),
      ...(waypointDescription ? { waypointDescription } : {}),
      ...(waypointMapNote ? { waypointMapNote } : {}),
      ...(waypointAppearance ? { waypointAppearance } : {}),
      ...(waypointVariables ? { waypointVariables } : {}),
      ...(encounterActive ? { encounterActive } : {}),
      ...(encounterPlayerOnly ? { encounterPlayerOnly } : {}),
      ...(encounterReset ? { encounterReset } : {}),
      ...(encounterResetTime ? { encounterResetTime } : {}),
      ...(encounterSpawnOption ? { encounterSpawnOption } : {}),
      ...(encounterRespawns ? { encounterRespawns } : {}),
      ...(encounterCreatureCounts ? { encounterCreatureCounts } : {}),
      ...(encounterScriptResRefs ? { encounterScriptResRefs } : {}),
      ...(encounterFaction ? { encounterFaction } : {}),
      ...(encounterDifficulty ? { encounterDifficulty } : {}),
      ...(encounterLocalizedName ? { encounterLocalizedName } : {}),
      ...(encounterVariables ? { encounterVariables } : {}),
      ...(encounterCreatureList ? { encounterCreatureList } : {}),
      ...(encounterSpawnPoints ? { encounterSpawnPoints } : {}),
      ...(itemTemplateResRef ? { itemTemplateResRef } : {}),
      ...(itemInstanceState ? { itemInstanceState } : {}),
      ...(itemLocalizedStrings ? { itemLocalizedStrings } : {}),
      ...(itemVariables ? { itemVariables } : {}),
      ...(itemPropertyList ? { itemPropertyList } : {}),
      ...(itemBaseAppearanceRaw ? { itemBaseAppearanceRaw } : {}),
      ...(itemInventoryItems ? { itemInventoryItems } : {}),
      ...(itemVisualTransform ? { itemVisualTransform } : {}),
      ...(itemMetadata ? { itemMetadata } : {}),
      ...(storeMetadata ? { storeMetadata } : {}),
      ...(storeRestrictionsRaw ? { storeRestrictionsRaw } : {}),
      ...(storeInventoryRaw ? { storeInventoryRaw } : {}),
      x: clampNumber(x ?? 0),
      y: clampNumber(y ?? 0),
      z: clampNumber(z),
      bearing: normalizeBearing(derivedBearing),
      ...(visualTransform ? { visualTransform } : {}),
      ...(soundPositioning ? { soundPositioning } : {}),
      ...(soundIntervalVariation ? { soundIntervalVariation } : {}),
      ...(soundVolume ? { soundVolume } : {}),
      ...(soundActive ? { soundActive } : {}),
      ...(soundPlayOrder ? { soundPlayOrder } : {}),
      ...(soundPlayStyle ? { soundPlayStyle } : {}),
      ...(soundPlayback ? { soundPlayback } : {}),
      ...(soundProfile ? { soundProfile } : {}),
      ...(soundSchedule ? { soundSchedule } : {}),
      ...(doorTransition ? { doorTransition } : {}),
      ...(geometry.length > 0 ? { geometry } : {}),
      ...(polygonGeometry ? { polygonGeometry } : {}),
    });
  }

  return placements;
}

function readExactAreaStoreCommerce(
  view: GffView,
  structIndex: number,
): AreaStoreCommerceValue | undefined {
  if (view.structs[structIndex]?.typeId !== 11) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const values: Record<string, number | boolean> = {};
  for (const profile of AREA_STORE_COMMERCE_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    const expectedType = profile.nativeType === "byte" ? FIELD_TYPE.BYTE : FIELD_TYPE.INT;
    if (matches.length !== 1 || field?.label !== profile.label ||
        field.field.typeId !== expectedType) return undefined;
    const raw = view.readNumber(field.field);
    if (raw === undefined) return undefined;
    if (profile.key === "blackMarket") {
      if (raw !== 0 && raw !== 1) return undefined;
      values[profile.key] = raw === 1;
    } else {
      values[profile.key] = raw;
    }
  }
  return readAreaStoreCommerceValue(values) ?? undefined;
}

function readExactAreaStoreScriptResRefs(
  view: GffView,
  structIndex: number,
): AreaStoreScriptResRefsValue | undefined {
  if (view.structs[structIndex]?.typeId !== 11) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const values: Record<string, string> = {};
  for (const profile of AREA_STORE_SCRIPT_RESREF_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1 ||
      field?.label !== profile.label ||
      field.field.typeId !== FIELD_TYPE.RESREF
    ) return undefined;
    const raw = view.readString(field.field);
    if (typeof raw !== "string") return undefined;
    values[profile.key] = raw;
  }
  return readAreaStoreScriptResRefsValue(values) ?? undefined;
}

function readExactCreatureClassIdentityState(
  rawStruct: { typeId: number; fields: SupportedGffField[] } | undefined,
): AreaCreatureClassIdentityState | undefined {
  if (!rawStruct || rawStruct.typeId !== 4) return undefined;
  const matches = rawStruct.fields.filter(
    (field) => normalizeLabel(field.label) === "classlist",
  );
  if (matches.length === 0) {
    return readAreaCreatureClassIdentityState({ present: false }) ?? undefined;
  }
  const field = matches[0];
  if (matches.length !== 1 || !field || field.label !== "ClassList") return undefined;
  const analysis = analyzeAreaCreatureClassListField(field);
  if (!analysis) return undefined;
  return readAreaCreatureClassIdentityState({
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    classListGraphSha256: analysis.classListGraphSha256,
    entries: analysis.entries,
  }) ?? undefined;
}

function readExactSoundIntervalVariationStorage(
  view: GffView,
  structIndex: number,
): AreaSoundIntervalVariationStorage | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const intervalMilliseconds = readExactNumericRootField(
    view,
    entries,
    "Interval",
    FIELD_TYPE.DWORD,
  );
  const intervalVariationMilliseconds = readExactNumericRootField(
    view,
    entries,
    "IntervalVrtn",
    FIELD_TYPE.DWORD,
  );
  const pitchVariation = readExactNumericRootField(
    view,
    entries,
    "PitchVariation",
    FIELD_TYPE.FLOAT,
  );
  const volumeVariationByte = readExactNumericRootField(
    view,
    entries,
    "VolumeVrtn",
    FIELD_TYPE.BYTE,
  );
  if (
    intervalMilliseconds === undefined
    || intervalVariationMilliseconds === undefined
    || pitchVariation === undefined
    || volumeVariationByte === undefined
  ) {
    return undefined;
  }
  const pitchVariationHundredths = Math.round(pitchVariation * 100);
  if (pitchVariation !== Math.fround(pitchVariationHundredths / 100)) return undefined;
  return readAreaSoundIntervalVariationStorage({
    intervalMilliseconds,
    intervalVariationMilliseconds,
    pitchVariationHundredths,
    volumeVariationByte,
  }) ?? undefined;
}

function readExactSoundVolumeStorage(
  view: GffView,
  structIndex: number,
): AreaSoundVolumeStorage | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const volumeByte = readExactNumericRootField(
    view,
    entries,
    "Volume",
    FIELD_TYPE.BYTE,
  );
  if (volumeByte === undefined) return undefined;
  return readAreaSoundVolumeStorage({ volumeByte }) ?? undefined;
}

function readExactSoundActiveStorage(
  view: GffView,
  structIndex: number,
): AreaSoundActiveStorage | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const activeByte = readExactNumericRootField(
    view,
    entries,
    "Active",
    FIELD_TYPE.BYTE,
  );
  if (activeByte === undefined) return undefined;
  return readAreaSoundActiveStorage({ activeByte }) ?? undefined;
}

function readExactSoundPlayOrderStorage(
  view: GffView,
  structIndex: number,
): AreaSoundPlayOrderStorage | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const randomByte = readExactNumericRootField(
    view,
    entries,
    "Random",
    FIELD_TYPE.BYTE,
  );
  if (randomByte === undefined) return undefined;
  return readAreaSoundPlayOrderStorage({ randomByte }) ?? undefined;
}

function readExactSoundPlayStyleStorage(
  view: GffView,
  structIndex: number,
): AreaSoundPlayStyleStorage | undefined {
  const core = readExactSoundPlaybackCore(view, structIndex);
  if (!core) return undefined;
  return readAreaSoundPlayStyleStorage({
    loopingByte: core.loopingByte,
    continuousByte: core.continuousByte,
    priorityByte: core.priorityByte,
    positionalByte: core.positionalByte,
    soundsCount: core.soundStructIndices.length,
    intervalDword: core.intervalDword,
    intervalVariationDword: core.intervalVariationDword,
  }) ?? undefined;
}

function readExactSoundPlaybackStorage(
  view: GffView,
  structIndex: number,
): AreaSoundPlaybackStorage | undefined {
  const core = readExactSoundPlaybackCore(view, structIndex);
  if (!core) return undefined;
  const sounds: string[] = [];
  for (const soundStructIndex of core.soundStructIndices) {
    if (view.structs[soundStructIndex]?.typeId !== 0) return undefined;
    const entries = view.getStructFieldEntries(soundStructIndex);
    if (!entries || entries.length !== 1) return undefined;
    const sound = entries[0];
    if (sound?.label !== "Sound" || sound.field.typeId !== FIELD_TYPE.RESREF) {
      return undefined;
    }
    const value = view.readExactResRef(sound.field);
    if (!isAreaSoundResRef(value)) return undefined;
    sounds.push(value);
  }
  return readAreaSoundPlaybackStorage({
    sounds,
    loopingByte: core.loopingByte,
    continuousByte: core.continuousByte,
    priorityByte: core.priorityByte,
    positionalByte: core.positionalByte,
    intervalDword: core.intervalDword,
    intervalVariationDword: core.intervalVariationDword,
  }) ?? undefined;
}

function readExactSoundProfileStorage(
  view: GffView,
  structIndex: number,
): AreaSoundProfileStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 6) return undefined;
  const playback = readExactSoundPlaybackStorage(view, structIndex);
  const entries = view.getStructFieldEntries(structIndex);
  if (!playback || !entries) return undefined;
  const randomPositionByte = readExactNumericRootField(
    view,
    entries,
    "RandomPosition",
    FIELD_TYPE.BYTE,
  );
  const elevationFloat32 = readExactNumericRootField(
    view,
    entries,
    "Elevation",
    FIELD_TYPE.FLOAT,
  );
  const maxDistanceFloat32 = readExactNumericRootField(
    view,
    entries,
    "MaxDistance",
    FIELD_TYPE.FLOAT,
  );
  const minDistanceFloat32 = readExactNumericRootField(
    view,
    entries,
    "MinDistance",
    FIELD_TYPE.FLOAT,
  );
  const randomRangeXFloat32 = readExactNumericRootField(
    view,
    entries,
    "RandomRangeX",
    FIELD_TYPE.FLOAT,
  );
  const randomRangeYFloat32 = readExactNumericRootField(
    view,
    entries,
    "RandomRangeY",
    FIELD_TYPE.FLOAT,
  );
  if (
    randomPositionByte === undefined
    || elevationFloat32 === undefined
    || maxDistanceFloat32 === undefined
    || minDistanceFloat32 === undefined
    || randomRangeXFloat32 === undefined
    || randomRangeYFloat32 === undefined
  ) return undefined;
  return readAreaSoundProfileStorage({
    sounds: playback.sounds,
    loopingByte: playback.loopingByte,
    continuousByte: playback.continuousByte,
    priorityByte: playback.priorityByte,
    positionalByte: playback.positionalByte,
    randomPositionByte,
    elevationFloat32,
    maxDistanceFloat32,
    minDistanceFloat32,
    randomRangeXFloat32,
    randomRangeYFloat32,
    intervalDword: playback.intervalDword,
    intervalVariationDword: playback.intervalVariationDword,
  }) ?? undefined;
}

interface ExactSoundPlaybackCore {
  readonly loopingByte: number;
  readonly continuousByte: number;
  readonly priorityByte: number;
  readonly positionalByte: number;
  readonly intervalDword: number;
  readonly intervalVariationDword: number;
  readonly soundStructIndices: readonly number[];
}

function readExactSoundPlaybackCore(
  view: GffView,
  structIndex: number,
): ExactSoundPlaybackCore | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const loopingByte = readExactNumericRootField(view, entries, "Looping", FIELD_TYPE.BYTE);
  const continuousByte = readExactNumericRootField(
    view,
    entries,
    "Continuous",
    FIELD_TYPE.BYTE,
  );
  const priorityByte = readExactNumericRootField(view, entries, "Priority", FIELD_TYPE.BYTE);
  const positionalByte = readExactNumericRootField(
    view,
    entries,
    "Positional",
    FIELD_TYPE.BYTE,
  );
  const intervalDword = readExactNumericRootField(
    view,
    entries,
    "Interval",
    FIELD_TYPE.DWORD,
  );
  const intervalVariationDword = readExactNumericRootField(
    view,
    entries,
    "IntervalVrtn",
    FIELD_TYPE.DWORD,
  );
  const soundsMatches = entries.filter((entry) => entry.label.toLowerCase() === "sounds");
  if (
    loopingByte === undefined
    || continuousByte === undefined
    || priorityByte === undefined
    || positionalByte === undefined
    || intervalDword === undefined
    || intervalVariationDword === undefined
    || soundsMatches.length !== 1
    || soundsMatches[0]?.label !== "Sounds"
    || soundsMatches[0].field.typeId !== FIELD_TYPE.LIST
  ) {
    return undefined;
  }
  const soundStructIndices = view.readExactListStructIndices(soundsMatches[0].field);
  if (!soundStructIndices) return undefined;
  return Object.freeze({
    loopingByte,
    continuousByte,
    priorityByte,
    positionalByte,
    intervalDword,
    intervalVariationDword,
    soundStructIndices: Object.freeze([...soundStructIndices]),
  });
}

function readExactSoundScheduleStorage(
  view: GffView,
  structIndex: number,
): AreaSoundScheduleStorage | undefined {
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const hoursMask = readExactNumericRootField(
    view,
    entries,
    "Hours",
    FIELD_TYPE.DWORD,
  );
  const timesByte = readExactNumericRootField(
    view,
    entries,
    "Times",
    FIELD_TYPE.BYTE,
  );
  if (hoursMask === undefined || timesByte === undefined) return undefined;
  return readAreaSoundScheduleStorage({ hoursMask, timesByte }) ?? undefined;
}

function readPlaceableBasicIdentity(
  view: GffView,
  structIndex: number,
): AreaPlaceableBasicIdentity | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;

  const tagFields = entries.filter((entry) => normalizeLabel(entry.label) === "tag");
  let tag: AreaPlaceableBasicIdentity["tag"];
  if (tagFields.length === 0) {
    tag = { present: false };
  } else {
    const tagField = tagFields[0];
    if (tagFields.length !== 1 || tagField.label !== "Tag") return undefined;
    const value = view.readExactString(tagField.field);
    if (value === undefined) return undefined;
    tag = { present: true, value };
  }

  const appearanceFields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "appearance",
  );
  let appearance: AreaPlaceableBasicIdentity["appearance"];
  if (appearanceFields.length === 0) {
    appearance = { present: false };
  } else {
    const appearanceField = appearanceFields[0];
    if (appearanceFields.length !== 1 || appearanceField.label !== "Appearance") {
      return undefined;
    }
    const nativeType =
      appearanceField.field.typeId === FIELD_TYPE.DWORD
        ? "dword"
        : appearanceField.field.typeId === FIELD_TYPE.BYTE
          ? "byte"
          : undefined;
    if (!nativeType) return undefined;
    const value = view.readNumber(appearanceField.field);
    if (value === undefined) return undefined;
    appearance = { present: true, nativeType, value };
  }

  return { tag, appearance };
}

function readCreatureTag(
  view: GffView,
  structIndex: number,
): AreaCreatureTagStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const tagFields = entries.filter((entry) => normalizeLabel(entry.label) === "tag");
  if (tagFields.length === 0) {
    return readExistingAreaCreatureTagStorage({ present: false }) ?? undefined;
  }
  const tagField = tagFields[0];
  if (tagFields.length !== 1 || tagField.label !== "Tag") return undefined;
  const value = view.readExactString(tagField.field);
  if (value === undefined) return undefined;
  return readExistingAreaCreatureTagStorage({ present: true, value }) ?? undefined;
}

function readCreatureConversation(
  view: GffView,
  structIndex: number,
): AreaCreatureConversationStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "conversation",
  );
  if (fields.length === 0) {
    return readExistingAreaCreatureConversationStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (fields.length !== 1 || field.label !== "Conversation") return undefined;
  const value = view.readExactResRef(field.field);
  if (value === undefined) return undefined;
  return readExistingAreaCreatureConversationStorage({ present: true, value }) ?? undefined;
}

function readCreatureInterruptable(
  view: GffView,
  structIndex: number,
): AreaCreatureInterruptableStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "interruptable",
  );
  if (fields.length === 0) {
    return readAreaCreatureInterruptableStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "Interruptable" ||
    field.field.typeId !== FIELD_TYPE.BYTE
  ) {
    return undefined;
  }
  const value = view.readNumber(field.field);
  return readAreaCreatureInterruptableStorage({ present: true, value }) ?? undefined;
}

function readCreatureAdvancedFlags(
  view: GffView,
  structIndex: number,
): AreaCreatureAdvancedFlagsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const storage = {} as Record<
    typeof AREA_CREATURE_ADVANCED_FLAG_FIELDS[number]["key"],
    AreaCreatureBinaryFlagStorage
  >;
  for (const definition of AREA_CREATURE_ADVANCED_FLAG_FIELDS) {
    const normalizedNativeLabel = normalizeLabel(definition.nativeLabel);
    const fields = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizedNativeLabel,
    );
    const fieldStorage = fields.length === 0
      ? readAreaCreatureBinaryFlagStorage({ present: false })
      : fields.length === 1 &&
          fields[0]?.label === definition.nativeLabel &&
          fields[0].field.typeId === FIELD_TYPE.BYTE
        ? readAreaCreatureBinaryFlagStorage({
            present: true,
            value: view.readNumber(fields[0].field),
          })
        : null;
    if (!fieldStorage) return undefined;
    storage[definition.key] = fieldStorage;
  }
  return readAreaCreatureAdvancedFlagsStorage(storage) ?? undefined;
}

function readCreatureBodyBag(
  view: GffView,
  structIndex: number,
): AreaCreatureBodyBagStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "bodybag");
  if (fields.length === 0) {
    return readAreaCreatureBodyBagStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "BodyBag" ||
    field.field.typeId !== FIELD_TYPE.BYTE
  ) {
    return undefined;
  }
  return readAreaCreatureBodyBagStorage({
    present: true,
    nativeType: "byte",
    value: view.readNumber(field.field),
  }) ?? undefined;
}

function readCreatureDecayTime(
  view: GffView,
  structIndex: number,
): AreaCreatureDecayTimeStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "decaytime");
  if (fields.length === 0) {
    return readAreaCreatureDecayTimeStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "DecayTime" ||
    field.field.typeId !== FIELD_TYPE.DWORD
  ) {
    return undefined;
  }
  return readAreaCreatureDecayTimeStorage({
    present: true,
    nativeType: "dword",
    valueMilliseconds: view.readNumber(field.field),
  }) ?? undefined;
}

function readCreatureFaction(
  view: GffView,
  structIndex: number,
): AreaCreatureFactionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "factionid");
  if (fields.length === 0) {
    return readAreaCreatureFactionStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "FactionID" ||
    field.field.typeId !== FIELD_TYPE.WORD
  ) {
    return undefined;
  }
  return readAreaCreatureFactionStorage({
    present: true,
    nativeType: "word",
    value: view.readNumber(field.field),
  }) ?? undefined;
}

function readCreatureTemplateResRef(
  view: GffView,
  structIndex: number,
): AreaCreatureTemplateResRefStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "templateresref",
  );
  if (fields.length === 0) {
    return readAreaCreatureTemplateResRefStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "TemplateResRef" ||
    field.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  return readAreaCreatureTemplateResRefStorage({
    present: true,
    nativeType: "resref",
    value: view.readString(field.field),
  }) ?? undefined;
}

function readCreatureSpecialIdentityStrings(
  view: GffView,
  structIndex: number,
): AreaCreatureSpecialIdentityStringsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const subrace = readCreatureSpecialIdentityStringMember(
    view,
    entries,
    "Subrace",
  );
  const deity = readCreatureSpecialIdentityStringMember(
    view,
    entries,
    "Deity",
  );
  if (!subrace || !deity) return undefined;
  return readAreaCreatureSpecialIdentityStringsStorage({ subrace, deity }) ?? undefined;
}

function readCreatureSpecialIdentityStringMember(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  exactLabel: "Subrace" | "Deity",
): AreaCreatureSpecialIdentityStringStorage | undefined {
  const normalizedLabel = normalizeLabel(exactLabel);
  const matches = entries.filter(
    (entry) => normalizeLabel(entry.label) === normalizedLabel,
  );
  if (matches.length === 0) return { present: false };
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match.label !== exactLabel ||
    match.field.typeId !== FIELD_TYPE.CEXOSTRING
  ) {
    return undefined;
  }
  const value = view.readExactString(match.field);
  if (value === undefined) return undefined;
  return {
    present: true,
    nativeType: "cexostring",
    value,
  };
}

function readCreatureScriptResRefs(
  view: GffView,
  structIndex: number,
): AreaCreatureScriptResRefsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const storage = {} as Record<string, AreaCreatureScriptResRefStorage>;
  for (const { key, nativeLabel } of AREA_CREATURE_SCRIPT_RESREF_FIELDS) {
    const normalizedLabel = normalizeLabel(nativeLabel);
    const matches = entries.filter((entry) => normalizeLabel(entry.label) === normalizedLabel);
    if (matches.length === 0) {
      storage[key] = { present: false };
      continue;
    }
    const match = matches[0]!;
    if (
      matches.length !== 1 ||
      match.label !== nativeLabel ||
      match.field.typeId !== FIELD_TYPE.RESREF
    ) {
      return undefined;
    }
    const value = view.readString(match.field);
    if (typeof value !== "string") return undefined;
    storage[key] = {
      present: true,
      nativeType: "resref",
      value,
    };
  }
  return readAreaCreatureScriptResRefsStorage(storage) ?? undefined;
}

function readCreatureAppearance(
  view: GffView,
  structIndex: number,
): AreaCreatureAppearanceStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "appearancetype",
  );
  if (fields.length === 0) {
    return readAreaCreatureAppearanceStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "Appearance_Type" ||
    field.field.typeId !== FIELD_TYPE.WORD
  ) {
    return undefined;
  }
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureAppearanceStorage({
    present: true,
    nativeType: "word",
    value,
  }) ?? undefined;
}

function readCreatureGender(
  view: GffView,
  structIndex: number,
): AreaCreatureGenderStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "gender");
  if (fields.length === 0) {
    return readAreaCreatureGenderStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "Gender" ||
    field.field.typeId !== FIELD_TYPE.BYTE
  ) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureGenderStorage({
    present: true,
    nativeType: "byte",
    value,
  }) ?? undefined;
}

function readCreaturePerceptionRange(
  view: GffView,
  structIndex: number,
): AreaCreaturePerceptionRangeStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "perceptionrange");
  if (fields.length === 0) {
    return readAreaCreaturePerceptionRangeStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (fields.length !== 1 || field.label !== "PerceptionRange" ||
    field.field.typeId !== FIELD_TYPE.BYTE) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreaturePerceptionRangeStorage({
    present: true,
    nativeType: "byte",
    value,
  }) ?? undefined;
}

function readCreatureWalkRate(
  view: GffView,
  structIndex: number,
): AreaCreatureWalkRateStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "walkrate");
  if (fields.length === 0) {
    return readAreaCreatureWalkRateStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (fields.length !== 1 || field.label !== "WalkRate" ||
    field.field.typeId !== FIELD_TYPE.INT) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureWalkRateStorage({
    present: true,
    nativeType: "int",
    value,
  }) ?? undefined;
}

function readCreatureSoundSetFile(
  view: GffView,
  structIndex: number,
): AreaCreatureSoundSetFileStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "soundsetfile");
  if (fields.length === 0) {
    return readAreaCreatureSoundSetFileStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (fields.length !== 1 || field.label !== "SoundSetFile" ||
    field.field.typeId !== FIELD_TYPE.WORD) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureSoundSetFileStorage({
    present: true,
    nativeType: "word",
    value,
  }) ?? undefined;
}

function readCreatureStartingPackage(
  view: GffView,
  structIndex: number,
): AreaCreatureStartingPackageStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "startingpackage");
  if (fields.length === 0) {
    return readAreaCreatureStartingPackageStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (fields.length !== 1 || field.label !== "StartingPackage" ||
    field.field.typeId !== FIELD_TYPE.BYTE) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  const classIds = readExactCreatureStartingPackageClassIds(view, entries);
  return readAreaCreatureStartingPackageStorage({
    present: true,
    nativeType: "byte",
    value,
    ...(classIds ? { classIds } : {}),
  }) ?? undefined;
}

function readExactCreatureSkillList(
  view: GffView,
  structIndex: number,
): AreaCreatureSkillListStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === "skilllist");
  if (matches.length === 0) {
    return readAreaCreatureSkillListStorage({ present: false }) ?? undefined;
  }
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "SkillList" ||
    list.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const structIndices = view.readExactListStructIndices(list.field);
  if (!structIndices || structIndices.length > 4_096) return undefined;
  const ranks: number[] = [];
  const opaqueSiblingFieldCounts: number[] = [];
  for (const skillStructIndex of structIndices) {
    if (view.structs[skillStructIndex]?.typeId !== 0) return undefined;
    const skillEntries = view.getStructFieldEntries(skillStructIndex);
    if (!skillEntries) return undefined;
    const rankMatches = skillEntries.filter(
      (entry) => normalizeLabel(entry.label) === "rank",
    );
    const rankField = rankMatches[0];
    if (rankMatches.length !== 1 || rankField?.label !== "Rank" ||
      rankField.field.typeId !== FIELD_TYPE.BYTE) return undefined;
    const rank = view.readNumber(rankField.field);
    if (!Number.isSafeInteger(rank) || Number(rank) < 0 || Number(rank) > 0xff) {
      return undefined;
    }
    ranks.push(Number(rank));
    opaqueSiblingFieldCounts.push(skillEntries.length - 1);
  }
  return readAreaCreatureSkillListStorage({
    present: true,
    nativeType: "list",
    structTypeId: 0,
    rankNativeType: "byte",
    ranks,
    opaqueSiblingFieldCounts,
  }) ?? undefined;
}

function readExactCreatureFeatList(
  view: GffView,
  structIndex: number,
): AreaCreatureFeatListStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === "featlist");
  if (matches.length === 0) {
    return readAreaCreatureFeatListStorage({ present: false }) ?? undefined;
  }
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "FeatList" ||
    list.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const structIndices = view.readExactListStructIndices(list.field);
  if (!structIndices || structIndices.length > 65_536) return undefined;
  const featIds: number[] = [];
  const opaqueSiblingFieldCounts: number[] = [];
  for (const featStructIndex of structIndices) {
    if (view.structs[featStructIndex]?.typeId !== 1) return undefined;
    const featEntries = view.getStructFieldEntries(featStructIndex);
    if (!featEntries) return undefined;
    const featMatches = featEntries.filter(
      (entry) => normalizeLabel(entry.label) === "feat",
    );
    const featField = featMatches[0];
    if (featMatches.length !== 1 || featField?.label !== "Feat" ||
      featField.field.typeId !== FIELD_TYPE.WORD) return undefined;
    const featId = view.readNumber(featField.field);
    if (!Number.isSafeInteger(featId) || Number(featId) < 0 ||
      Number(featId) > 0xffff) return undefined;
    featIds.push(Number(featId));
    opaqueSiblingFieldCounts.push(featEntries.length - 1);
  }
  return readAreaCreatureFeatListStorage({
    present: true,
    nativeType: "list",
    structTypeId: 1,
    featNativeType: "word",
    featIds,
    opaqueSiblingFieldCounts,
  }) ?? undefined;
}

function readExactCreatureSpecialAbilityList(
  view: GffView,
  structIndex: number,
): AreaCreatureSpecialAbilityListStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter(
    (entry) => normalizeLabel(entry.label) === "specabilitylist",
  );
  if (matches.length === 0) {
    return readAreaCreatureSpecialAbilityListStorage({ present: false }) ?? undefined;
  }
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "SpecAbilityList" ||
    list.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const structIndices = view.readExactListStructIndices(list.field);
  if (!structIndices || structIndices.length > 65_536) return undefined;
  const physicalEntries: Array<{
    spellId: number;
    spellFlags: number;
    casterLevel: number;
    opaqueSiblingFieldCount: number;
  }> = [];
  for (const abilityStructIndex of structIndices) {
    if (view.structs[abilityStructIndex]?.typeId !== 4) return undefined;
    const abilityEntries = view.getStructFieldEntries(abilityStructIndex);
    if (!abilityEntries) return undefined;
    const spellMatches = abilityEntries.filter(
      (entry) => normalizeLabel(entry.label) === "spell",
    );
    const flagsMatches = abilityEntries.filter(
      (entry) => normalizeLabel(entry.label) === "spellflags",
    );
    const casterMatches = abilityEntries.filter(
      (entry) => normalizeLabel(entry.label) === "spellcasterlevel",
    );
    const spell = spellMatches[0];
    const flags = flagsMatches[0];
    const caster = casterMatches[0];
    if (spellMatches.length !== 1 || spell?.label !== "Spell" ||
      spell.field.typeId !== FIELD_TYPE.WORD || flagsMatches.length !== 1 ||
      flags?.label !== "SpellFlags" || flags.field.typeId !== FIELD_TYPE.BYTE ||
      casterMatches.length !== 1 || caster?.label !== "SpellCasterLevel" ||
      caster.field.typeId !== FIELD_TYPE.BYTE) return undefined;
    const spellId = view.readNumber(spell.field);
    const spellFlags = view.readNumber(flags.field);
    const casterLevel = view.readNumber(caster.field);
    if (!Number.isSafeInteger(spellId) || Number(spellId) < 0 ||
      Number(spellId) > 0xffff || !Number.isSafeInteger(spellFlags) ||
      Number(spellFlags) < 0 || Number(spellFlags) > 0xff ||
      !Number.isSafeInteger(casterLevel) || Number(casterLevel) < 0 ||
      Number(casterLevel) > 0xff) return undefined;
    physicalEntries.push({
      spellId: Number(spellId),
      spellFlags: Number(spellFlags),
      casterLevel: Number(casterLevel),
      opaqueSiblingFieldCount: abilityEntries.length - 3,
    });
  }
  return readAreaCreatureSpecialAbilityListStorage({
    present: true,
    nativeType: "list",
    structTypeId: 4,
    entries: physicalEntries,
  }) ?? undefined;
}

function readExactCreatureClassLevelState(
  view: GffView,
  structIndex: number,
): AreaCreatureClassLevelState | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === "classlist");
  if (matches.length === 0) {
    return readAreaCreatureClassLevelState({ present: false }) ?? undefined;
  }
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== "ClassList" ||
    list.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const structIndices = view.readExactListStructIndices(list.field);
  if (!structIndices || structIndices.length < 1 || structIndices.length > 8) {
    return undefined;
  }
  const classEntries: Array<{
    classId: number;
    level: number;
    opaqueSiblingFieldCount: number;
  }> = [];
  for (const classStructIndex of structIndices) {
    if (view.structs[classStructIndex]?.typeId !== 2) return undefined;
    const fields = view.getStructFieldEntries(classStructIndex);
    if (!fields) return undefined;
    const classMatches = fields.filter((entry) => normalizeLabel(entry.label) === "class");
    const levelMatches = fields.filter(
      (entry) => normalizeLabel(entry.label) === "classlevel",
    );
    const classField = classMatches[0];
    const levelField = levelMatches[0];
    if (classMatches.length !== 1 || classField?.label !== "Class" ||
      classField.field.typeId !== FIELD_TYPE.INT || levelMatches.length !== 1 ||
      levelField?.label !== "ClassLevel" ||
      levelField.field.typeId !== FIELD_TYPE.SHORT) return undefined;
    const classId = view.readNumber(classField.field);
    const level = view.readNumber(levelField.field);
    if (!Number.isSafeInteger(classId) || !Number.isSafeInteger(level)) return undefined;
    classEntries.push({
      classId: Number(classId),
      level: Number(level),
      opaqueSiblingFieldCount: fields.length - 2,
    });
  }
  return readAreaCreatureClassLevelState({
    present: true,
    nativeType: "list",
    structTypeId: 2,
    classNativeType: "int",
    levelNativeType: "short",
    entries: classEntries,
  }) ?? undefined;
}

function readExactCreatureStartingPackageClassIds(
  view: GffView,
  creatureEntries: readonly GffLabeledFieldRef[],
): readonly number[] | undefined {
  const matches = creatureEntries.filter(
    (entry) => normalizeLabel(entry.label) === "classlist",
  );
  if (matches.length !== 1 || matches[0]?.label !== "ClassList" ||
    matches[0].field.typeId !== FIELD_TYPE.LIST) return undefined;
  const classStructIndices = view.readExactListStructIndices(matches[0].field);
  if (!classStructIndices || classStructIndices.length < 1 || classStructIndices.length > 8) {
    return undefined;
  }
  const classIds: number[] = [];
  for (const classStructIndex of classStructIndices) {
    if (view.structs[classStructIndex]?.typeId !== 2) return undefined;
    const entries = view.getStructFieldEntries(classStructIndex);
    if (!entries) return undefined;
    const classMatches = entries.filter((entry) => normalizeLabel(entry.label) === "class");
    const levelMatches = entries.filter((entry) => normalizeLabel(entry.label) === "classlevel");
    if (classMatches.length !== 1 || classMatches[0]?.label !== "Class" ||
      classMatches[0].field.typeId !== FIELD_TYPE.INT || levelMatches.length !== 1 ||
      levelMatches[0]?.label !== "ClassLevel" ||
      levelMatches[0].field.typeId !== FIELD_TYPE.SHORT) return undefined;
    const classId = view.readNumber(classMatches[0].field);
    const classLevel = view.readNumber(levelMatches[0].field);
    if (!Number.isSafeInteger(classId) || Number(classId) < 0 ||
      !Number.isSafeInteger(classLevel) || Number(classLevel) < 0 ||
      classIds.includes(Number(classId))) return undefined;
    classIds.push(Number(classId));
  }
  return Object.freeze(classIds);
}

function readCreaturePhenotype(
  view: GffView,
  structIndex: number,
): AreaCreaturePhenotypeStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "phenotype");
  if (fields.length === 0) {
    return readAreaCreaturePhenotypeStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "Phenotype" ||
    field.field.typeId !== FIELD_TYPE.INT
  ) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreaturePhenotypeStorage({
    present: true,
    nativeType: "int",
    value,
  }) ?? undefined;
}

function readCreaturePortrait(
  view: GffView,
  structIndex: number,
): AreaCreaturePortraitStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const portraitFields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "portraitid",
  );
  if (portraitFields.length === 0) {
    return readAreaCreaturePortraitStorage({ present: false }) ?? undefined;
  }
  const portraitField = portraitFields[0];
  if (portraitFields.length !== 1 || portraitField.label !== "PortraitId" ||
    portraitField.field.typeId !== FIELD_TYPE.WORD) return undefined;
  const value = view.readNumber(portraitField.field);
  if (value === undefined) return undefined;

  const readContextByte = (label: "Gender" | "Race"): number | undefined => {
    const matches = entries.filter(
      (entry) => normalizeLabel(entry.label) === label.toLowerCase(),
    );
    if (matches.length !== 1 || matches[0]?.label !== label ||
      matches[0].field.typeId !== FIELD_TYPE.BYTE) return undefined;
    return view.readNumber(matches[0].field);
  };
  const genderValue = readContextByte("Gender");
  const raceValue = readContextByte("Race");
  return readAreaCreaturePortraitStorage({
    present: true,
    nativeType: "word",
    value,
    ...(genderValue !== undefined && raceValue !== undefined
      ? { selectorContext: { genderValue, raceValue } }
      : {}),
  }) ?? undefined;
}

function readCreatureChallengeRating(
  view: GffView,
  structIndex: number,
): AreaCreatureChallengeRatingStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "challengerating",
  );
  if (fields.length === 0) {
    return readAreaCreatureChallengeRatingStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "ChallengeRating" ||
    field.field.typeId !== FIELD_TYPE.FLOAT
  ) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureChallengeRatingStorage({
    present: true,
    nativeType: "float",
    value,
  }) ?? undefined;
}

function readCreatureAbilityScores(
  view: GffView,
  structIndex: number,
): AreaCreatureAbilityScoresStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const fieldProfile of AREA_CREATURE_ABILITY_SCORE_FIELDS) {
    const fields = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(fieldProfile.nativeLabel),
    );
    if (fields.length === 0) {
      result[fieldProfile.key] = readAreaCreatureAbilityScoreStorage({ present: false });
      continue;
    }
    const field = fields[0];
    if (
      fields.length !== 1 ||
      field.label !== fieldProfile.nativeLabel ||
      field.field.typeId !== FIELD_TYPE.BYTE
    ) return undefined;
    const value = view.readNumber(field.field);
    if (value === undefined) return undefined;
    const storage = readAreaCreatureAbilityScoreStorage({
      present: true,
      nativeType: "byte",
      value,
    });
    if (!storage) return undefined;
    result[fieldProfile.key] = storage;
  }
  return readAreaCreatureAbilityScoresStorage(result) ?? undefined;
}

function readCreatureAppearanceColors(
  view: GffView,
  structIndex: number,
): AreaCreatureAppearanceColorsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const fieldProfile of AREA_CREATURE_APPEARANCE_COLOR_FIELDS) {
    const fields = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(fieldProfile.nativeLabel),
    );
    if (fields.length === 0) {
      result[fieldProfile.key] = readAreaCreatureAppearanceColorStorage({ present: false });
      continue;
    }
    const field = fields[0];
    if (
      fields.length !== 1 ||
      field.label !== fieldProfile.nativeLabel ||
      field.field.typeId !== FIELD_TYPE.BYTE
    ) return undefined;
    const value = view.readNumber(field.field);
    if (value === undefined) return undefined;
    const storage = readAreaCreatureAppearanceColorStorage({
      present: true,
      nativeType: "byte",
      value,
    });
    if (!storage) return undefined;
    result[fieldProfile.key] = storage;
  }
  return readAreaCreatureAppearanceColorsStorage(result) ?? undefined;
}

function readCreatureBodyParts(
  view: GffView,
  structIndex: number,
): AreaCreatureBodyPartsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const fieldProfile of AREA_CREATURE_BODY_PART_FIELDS) {
    const legacyMatches = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(fieldProfile.legacyLabel),
    );
    const wideMatches = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(fieldProfile.wideLabel),
    );
    if (
      legacyMatches.length > 1 ||
      wideMatches.length > 1 ||
      (legacyMatches.length === 1 && (
        legacyMatches[0].label !== fieldProfile.legacyLabel ||
        legacyMatches[0].field.typeId !== FIELD_TYPE.BYTE
      )) ||
      (wideMatches.length === 1 && (
        wideMatches[0].label !== fieldProfile.wideLabel ||
        wideMatches[0].field.typeId !== FIELD_TYPE.WORD
      ))
    ) return undefined;
    if (legacyMatches.length === 0 && wideMatches.length === 0) {
      result[fieldProfile.key] = readAreaCreatureBodyPartStorage({ present: false });
      continue;
    }
    const legacyValue = legacyMatches.length === 1
      ? view.readNumber(legacyMatches[0].field)
      : undefined;
    const wideValue = wideMatches.length === 1
      ? view.readNumber(wideMatches[0].field)
      : undefined;
    if (
      (legacyMatches.length === 1 && legacyValue === undefined) ||
      (wideMatches.length === 1 && wideValue === undefined)
    ) return undefined;
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
    if (!storage) return undefined;
    result[fieldProfile.key] = storage;
  }
  return readAreaCreatureBodyPartsStorage(result) ?? undefined;
}

function readCreatureAppendages(
  view: GffView,
  structIndex: number,
): AreaCreatureAppendagesStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const definition of AREA_CREATURE_APPENDAGE_FIELDS) {
    const modernMatches = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(definition.modernLabel),
    );
    const legacyMatches = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(definition.legacyLabel),
    );
    if (
      modernMatches.length > 1 ||
      legacyMatches.length > 1 ||
      (modernMatches.length === 1 && (
        modernMatches[0].label !== definition.modernLabel ||
        modernMatches[0].field.typeId !== FIELD_TYPE.DWORD
      )) ||
      (legacyMatches.length === 1 && (
        legacyMatches[0].label !== definition.legacyLabel ||
        legacyMatches[0].field.typeId !== FIELD_TYPE.BYTE
      ))
    ) return undefined;
    if (modernMatches.length === 0 && legacyMatches.length === 0) {
      result[definition.key] = readAreaCreatureAppendageStorage({ present: false });
      continue;
    }
    const modernValue = modernMatches.length === 1
      ? view.readNumber(modernMatches[0].field)
      : undefined;
    const legacyValue = legacyMatches.length === 1
      ? view.readNumber(legacyMatches[0].field)
      : undefined;
    if (
      (modernMatches.length === 1 && modernValue === undefined) ||
      (legacyMatches.length === 1 && legacyValue === undefined)
    ) return undefined;
    const storage = readAreaCreatureAppendageStorage({
      present: true,
      value: modernValue ?? legacyValue,
      modernDword: modernValue === undefined
        ? { present: false }
        : { present: true, nativeType: "dword", value: modernValue },
      legacyByte: legacyValue === undefined
        ? { present: false }
        : { present: true, nativeType: "byte", value: legacyValue },
    });
    if (!storage) return undefined;
    result[definition.key] = storage;
  }
  return readAreaCreatureAppendagesStorage(result) ?? undefined;
}

function readCreatureHitPointState(
  view: GffView,
  structIndex: number,
): AreaCreatureHitPointState | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = (label: string) => entries.filter(
    (entry) => normalizeLabel(entry.label) === normalizeLabel(label),
  );
  const hitPointMatches = [
    ...matches("HitPoints"),
    ...matches("CurrentHitPoints"),
    ...matches("MaxHitPoints"),
  ];
  if (hitPointMatches.length === 0) {
    return readAreaCreatureHitPointState({ present: false }) ?? undefined;
  }
  const readExactNumber = (
    label: string,
    typeId: number,
  ): number | undefined => {
    const fields = matches(label);
    if (fields.length !== 1 || fields[0]?.label !== label ||
      fields[0].field.typeId !== typeId) return undefined;
    return view.readNumber(fields[0].field);
  };
  const hitPoints = readExactNumber("HitPoints", FIELD_TYPE.SHORT);
  const currentHitPoints = readExactNumber("CurrentHitPoints", FIELD_TYPE.SHORT);
  const maxHitPoints = readExactNumber("MaxHitPoints", FIELD_TYPE.SHORT);
  const constitution = readExactNumber("Con", FIELD_TYPE.BYTE);
  const race = readExactNumber("Race", FIELD_TYPE.BYTE);
  if (hitPoints === undefined || currentHitPoints === undefined ||
    maxHitPoints === undefined || constitution === undefined || race === undefined) {
    return undefined;
  }

  const readExactList = (label: string): readonly number[] | null => {
    const fields = matches(label);
    if (fields.length === 0) return [];
    if (fields.length !== 1 || fields[0]?.label !== label ||
      fields[0].field.typeId !== FIELD_TYPE.LIST) return null;
    return view.readExactListStructIndices(fields[0].field);
  };
  const classStructIndices = readExactList("ClassList");
  const featStructIndices = readExactList("FeatList");
  if (!classStructIndices || classStructIndices.length > 8 || !featStructIndices) {
    return undefined;
  }
  const classLevels: number[] = [];
  for (const classStructIndex of classStructIndices) {
    const classEntries = view.getStructFieldEntries(classStructIndex);
    if (!classEntries) return undefined;
    const levelFields = classEntries.filter(
      (entry) => normalizeLabel(entry.label) === "classlevel",
    );
    if (levelFields.length !== 1 || levelFields[0]?.label !== "ClassLevel" ||
      levelFields[0].field.typeId !== FIELD_TYPE.SHORT) return undefined;
    const level = view.readNumber(levelFields[0].field);
    if (!Number.isSafeInteger(level) || Number(level) < 0 || Number(level) > 0xff) {
      return undefined;
    }
    classLevels.push(Number(level));
  }
  let featRow40Present = false;
  for (const featStructIndex of featStructIndices) {
    const featEntries = view.getStructFieldEntries(featStructIndex);
    if (!featEntries) return undefined;
    const featFields = featEntries.filter((entry) => normalizeLabel(entry.label) === "feat");
    if (featFields.length !== 1 || featFields[0]?.label !== "Feat" ||
      featFields[0].field.typeId !== FIELD_TYPE.WORD) return undefined;
    const feat = view.readNumber(featFields[0].field);
    if (!Number.isSafeInteger(feat) || Number(feat) < 0 || Number(feat) > 0xffff) {
      return undefined;
    }
    featRow40Present ||= feat === 40;
  }
  return readAreaCreatureHitPointState({
    present: true,
    hitPoints: { nativeType: "short", value: hitPoints },
    currentHitPoints: { nativeType: "short", value: currentHitPoints },
    maxHitPoints: { nativeType: "short", value: maxHitPoints },
    constitution: { nativeType: "byte", value: constitution },
    race: { nativeType: "byte", value: race },
    classLevels,
    featRow40Present,
  }) ?? undefined;
}

function readCreatureNaturalArmorClass(
  view: GffView,
  structIndex: number,
): AreaCreatureNaturalArmorClassStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "naturalac",
  );
  if (fields.length === 0) {
    return readAreaCreatureNaturalArmorClassStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1 ||
    field.label !== "NaturalAC" ||
    field.field.typeId !== FIELD_TYPE.BYTE
  ) return undefined;
  const value = view.readNumber(field.field);
  if (value === undefined) return undefined;
  return readAreaCreatureNaturalArmorClassStorage({
    present: true,
    nativeType: "byte",
    value,
  }) ?? undefined;
}

function readCreatureSavingThrowBonuses(
  view: GffView,
  structIndex: number,
): AreaCreatureSavingThrowBonusesStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const fieldProfile of AREA_CREATURE_SAVING_THROW_BONUS_FIELDS) {
    const fields = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(fieldProfile.nativeLabel),
    );
    if (fields.length === 0) {
      result[fieldProfile.key] = readAreaCreatureSavingThrowBonusStorage({ present: false });
      continue;
    }
    const field = fields[0];
    if (
      fields.length !== 1 ||
      field.label !== fieldProfile.nativeLabel ||
      field.field.typeId !== FIELD_TYPE.SHORT
    ) return undefined;
    const value = view.readNumber(field.field);
    if (value === undefined) return undefined;
    const storage = readAreaCreatureSavingThrowBonusStorage({
      present: true,
      nativeType: "short",
      value,
    });
    if (!storage) return undefined;
    result[fieldProfile.key] = storage;
  }
  return readAreaCreatureSavingThrowBonusesStorage(result) ?? undefined;
}

function readCreatureAlignment(
  view: GffView,
  structIndex: number,
): AreaCreatureAlignmentStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const result: Record<string, unknown> = {};
  for (const definition of [
    { key: "goodEvil", nativeLabel: "GoodEvil" },
    { key: "lawfulChaotic", nativeLabel: "LawfulChaotic" },
  ] as const) {
    const fields = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(definition.nativeLabel),
    );
    if (fields.length === 0) {
      result[definition.key] = { present: false };
      continue;
    }
    const field = fields[0];
    if (
      fields.length !== 1 ||
      field.label !== definition.nativeLabel ||
      field.field.typeId !== FIELD_TYPE.BYTE
    ) return undefined;
    const value = view.readNumber(field.field);
    if (value === undefined) return undefined;
    result[definition.key] = { present: true, nativeType: "byte", value };
  }
  return readAreaCreatureAlignmentStorage(result) ?? undefined;
}

function readCreatureNameLocalizedStrings(
  view: GffView,
  structIndex: number,
): AreaCreatureNameLocalizedStrings | undefined {
  if (view.structs[structIndex]?.typeId !== 4) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const firstName = readExactLocalizedStringStorageMember(
    view,
    entries,
    "firstname",
    "FirstName",
  );
  const lastName = readExactLocalizedStringStorageMember(
    view,
    entries,
    "lastname",
    "LastName",
  );
  const description = readExactLocalizedStringStorageMember(
    view,
    entries,
    "description",
    "Description",
  );
  return firstName && lastName && description
    ? { firstName, lastName, description }
    : undefined;
}

function readPlaceableTrapType(
  view: GffView,
  structIndex: number,
): AreaPlaceableTrapTypeStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "traptype");
  if (fields.length === 0) return { present: false };
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "TrapType" || field.field.typeId !== FIELD_TYPE.BYTE) {
    return undefined;
  }
  const value = view.readNumber(field.field);
  return value === undefined
    ? undefined
    : { present: true, nativeType: "byte", value };
}

function readPlaceableBodyBag(
  view: GffView,
  structIndex: number,
): AreaPlaceableBodyBagStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "bodybag");
  if (fields.length === 0) return { present: false };
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "BodyBag" || field.field.typeId !== FIELD_TYPE.BYTE) return undefined;
  const value = view.readNumber(field.field);
  return value === undefined ? undefined : { present: true, nativeType: "byte", value };
}

function readPlaceablePortraitId(
  view: GffView,
  structIndex: number,
): AreaPlaceablePortraitIdStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "portraitid");
  if (fields.length === 0) return { present: false };
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "PortraitId" || field.field.typeId !== FIELD_TYPE.WORD) return undefined;
  const value = view.readNumber(field.field);
  return value === undefined ? undefined : { present: true, nativeType: "word", value };
}

function readPlaceableFaction(
  view: GffView,
  structIndex: number,
): AreaPlaceableFactionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "faction");
  if (fields.length === 0) return { present: false };
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "Faction" || field.field.typeId !== FIELD_TYPE.DWORD) return undefined;
  const value = view.readNumber(field.field);
  return value === undefined ? undefined : { present: true, nativeType: "dword", value };
}

function readPlaceableVariables(
  view: GffView,
  structIndex: number,
): AreaPlaceableVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 9);
}

function readCreatureVariables(
  view: GffView,
  structIndex: number,
): AreaCreatureVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 4);
}

function readEncounterVariables(
  view: GffView,
  structIndex: number,
): AreaEncounterVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 7);
}

function readWaypointVariables(
  view: GffView,
  structIndex: number,
): AreaWaypointVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 5);
}

function readTriggerVariables(
  view: GffView,
  structIndex: number,
): AreaTriggerVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 1);
}

function readExactEncounterCreatureList(
  view: GffView,
  structIndex: number,
): AreaEncounterCreatureListProvenance | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const fields = view.getStructFieldEntries(structIndex);
  if (!fields) return undefined;
  const matches = fields.filter(
    (entry) => normalizeLabel(entry.label) === "creaturelist",
  );
  if (
    matches.length !== 1
    || matches[0]?.label !== "CreatureList"
    || matches[0].field.typeId !== FIELD_TYPE.LIST
  ) return undefined;
  const structIndices = view.readExactListStructIndices(matches[0].field);
  if (
    !structIndices
    || structIndices.length > MAX_AREA_ENCOUNTER_CREATURE_LIST_ENTRIES
  ) return undefined;
  const expectedEntries: Array<Readonly<Record<string, unknown>>> = [];
  for (let sourceIndex = 0; sourceIndex < structIndices.length; sourceIndex += 1) {
    const entryStructIndex = structIndices[sourceIndex]!;
    if (view.structs[entryStructIndex]?.typeId !== 0) return undefined;
    const entryFields = view.getStructFieldEntries(entryStructIndex);
    if (
      !entryFields
      || entryFields.length !== 4
      || entryFields[0]?.label !== "Appearance"
      || entryFields[0].field.typeId !== FIELD_TYPE.INT
      || entryFields[1]?.label !== "CR"
      || entryFields[1].field.typeId !== FIELD_TYPE.FLOAT
      || entryFields[2]?.label !== "ResRef"
      || entryFields[2].field.typeId !== FIELD_TYPE.RESREF
      || entryFields[3]?.label !== "SingleSpawn"
      || entryFields[3].field.typeId !== FIELD_TYPE.BYTE
    ) return undefined;
    const appearance = view.readNumber(entryFields[0].field);
    const challengeRating = view.readNumber(entryFields[1].field);
    const resRef = view.readExactResRef(entryFields[2].field);
    const singleSpawnByte = view.readNumber(entryFields[3].field);
    if (
      appearance === undefined
      || challengeRating === undefined
      || resRef === undefined
      || singleSpawnByte === undefined
    ) return undefined;
    expectedEntries.push({
      sourceIndex,
      appearance,
      challengeRating,
      resRef,
      singleSpawnByte,
    });
  }
  try {
    return parseAreaEncounterCreatureListProvenance({ expectedEntries });
  } catch {
    return undefined;
  }
}

function readExactEncounterSpawnPointList(
  view: GffView,
  structIndex: number,
): AreaEncounterSpawnPointListProvenance | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const fields = view.getStructFieldEntries(structIndex);
  if (!fields) return undefined;
  const matches = fields.filter(
    (entry) => normalizeLabel(entry.label) === "spawnpointlist",
  );
  if (
    matches.length !== 1
    || matches[0]?.label !== "SpawnPointList"
    || matches[0].field.typeId !== FIELD_TYPE.LIST
  ) return undefined;
  const structIndices = view.readExactListStructIndices(matches[0].field);
  if (!structIndices || structIndices.length > MAX_AREA_ENCOUNTER_SPAWN_POINT_ENTRIES) {
    return undefined;
  }
  const expectedEntries: Array<Readonly<Record<string, unknown>>> = [];
  const labels = ["X", "Y", "Z", "Orientation"] as const;
  for (let sourceIndex = 0; sourceIndex < structIndices.length; sourceIndex += 1) {
    const entryStructIndex = structIndices[sourceIndex]!;
    if (view.structs[entryStructIndex]?.typeId !== 2) return undefined;
    const entryFields = view.getStructFieldEntries(entryStructIndex);
    if (!entryFields || entryFields.length !== labels.length) return undefined;
    const values: number[] = [];
    for (let fieldIndex = 0; fieldIndex < labels.length; fieldIndex += 1) {
      const field = entryFields[fieldIndex];
      if (field?.label !== labels[fieldIndex] || field.field.typeId !== FIELD_TYPE.FLOAT) {
        return undefined;
      }
      const value = view.readNumber(field.field);
      if (value === undefined) return undefined;
      values.push(value);
    }
    expectedEntries.push({
      sourceIndex,
      nativeX: values[0],
      nativeY: values[1],
      nativeZ: values[2],
      orientation: values[3],
    });
  }
  try {
    return parseAreaEncounterSpawnPointListProvenance({ expectedEntries });
  } catch {
    return undefined;
  }
}

function readItemVariables(
  view: GffView,
  structIndex: number,
): AreaItemVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 0);
}

function readStoreVariables(
  view: GffView,
  structIndex: number,
): AuroraVariableProvenance | undefined {
  return readAuroraVariables(view, structIndex, 11);
}

function readExactAreaStoreRestrictions(
  view: GffView,
  structIndex: number,
): AreaStoreRestrictionsRawStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 11) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const willNotBuy = readExactAreaStoreRestrictionList(view, entries, "WillNotBuy");
  const willOnlyBuy = readExactAreaStoreRestrictionList(view, entries, "WillOnlyBuy");
  if (!willNotBuy || !willOnlyBuy) return undefined;
  return readAreaStoreRestrictionsRawStorage({ willNotBuy, willOnlyBuy }) ?? undefined;
}

function readExactAreaStoreInventory(
  view: GffView,
  structIndex: number,
): AreaStoreInventoryRawStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 11) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === "storelist");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "StoreList" ||
    field.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const bucketStructIndices = view.readExactListStructIndices(field.field);
  if (!bucketStructIndices ||
    bucketStructIndices.length !== AREA_STORE_INVENTORY_BUCKET_TYPE_IDS.length) {
    return undefined;
  }
  let total = 0;
  const buckets: Array<Readonly<{ bucketTypeId: number; entries: readonly unknown[] }>> = [];
  for (const [bucketIndex, bucketStructIndex] of bucketStructIndices.entries()) {
    const bucketTypeId = AREA_STORE_INVENTORY_BUCKET_TYPE_IDS[bucketIndex];
    if (view.structs[bucketStructIndex]?.typeId !== bucketTypeId) return undefined;
    const bucketFields = view.getStructFieldEntries(bucketStructIndex);
    if (!bucketFields) return undefined;
    if (bucketFields.length === 0) {
      buckets.push(Object.freeze({ bucketTypeId, entries: Object.freeze([]) }));
      continue;
    }
    if (bucketFields.length !== 1) return undefined;
    const itemList = bucketFields[0];
    if (itemList?.label !== "ItemList" || itemList.field.typeId !== FIELD_TYPE.LIST) {
      return undefined;
    }
    const itemStructIndices = view.readExactListStructIndices(itemList.field);
    if (!itemStructIndices || itemStructIndices.length === 0) return undefined;
    total += itemStructIndices.length;
    if (total > MAX_AREA_STORE_INVENTORY_ENTRIES) return undefined;
    const inventoryEntries: unknown[] = [];
    for (const [sourceIndex, itemStructIndex] of itemStructIndices.entries()) {
      if (view.structs[itemStructIndex]?.typeId !== sourceIndex) return undefined;
      const itemFields = view.getStructFieldEntries(itemStructIndex);
      if (!itemFields || hasStoreInventoryProhibitedField(itemFields)) return undefined;
      const resRef = readExactNestedItemInventoryResRef(view, itemFields);
      const baseItemId = readExactStoreInventoryBaseItem(view, itemFields);
      const x = readExactNestedItemInventoryWord(view, itemFields, "Repos_PosX");
      const y = readExactNestedItemInventoryWord(view, itemFields, "Repos_Posy");
      const infinite = readExactStoreInventoryInfinite(view, itemFields);
      if (resRef === undefined || baseItemId === undefined || x === undefined ||
        y === undefined || infinite === undefined ||
        !hasCanonicalStoreInventoryTail(itemFields, infinite)) return undefined;
      inventoryEntries.push(Object.freeze({ sourceIndex, resRef, baseItemId, x, y, infinite }));
    }
    buckets.push(Object.freeze({
      bucketTypeId,
      entries: Object.freeze(inventoryEntries),
    }));
  }
  return readAreaStoreInventoryRawStorage({ buckets }) ?? undefined;
}

function hasCanonicalStoreInventoryTail(
  fields: readonly GffLabeledFieldRef[],
  infinite: boolean,
): boolean {
  const tail = infinite ? fields.slice(-3) : fields.slice(-2);
  return tail.length === (infinite ? 3 : 2) &&
    tail[0]?.label === "Repos_PosX" &&
    tail[1]?.label === "Repos_Posy" &&
    (!infinite || tail[2]?.label === "Infinite");
}

function hasStoreInventoryProhibitedField(fields: readonly GffLabeledFieldRef[]): boolean {
  const prohibited = new Set([
    "dropable", "droppable", "pickpocketable", "inventoryres",
  ]);
  return fields.some((entry) => prohibited.has(normalizeLabel(entry.label)));
}

function readExactStoreInventoryBaseItem(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
): number | undefined {
  const matches = fields.filter((entry) => normalizeLabel(entry.label) === "baseitem");
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "BaseItem" ||
    field.field.typeId !== FIELD_TYPE.INT) return undefined;
  const value = view.readNumber(field.field);
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0x7fff_ffff
    ? Number(value)
    : undefined;
}

function readExactStoreInventoryInfinite(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
): boolean | undefined {
  const matches = fields.filter((entry) => normalizeLabel(entry.label) === "infinite");
  if (matches.length === 0) return false;
  const field = matches[0];
  if (matches.length !== 1 || field?.label !== "Infinite" ||
    field.field.typeId !== FIELD_TYPE.BYTE || view.readNumber(field.field) !== 1) {
    return undefined;
  }
  return true;
}

function readExactAreaStoreRestrictionList(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  label: "WillNotBuy" | "WillOnlyBuy",
): AreaStoreRestrictionRawListStorage | undefined {
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === label.toLowerCase());
  if (matches.length === 0) return Object.freeze({ present: false });
  const list = matches[0];
  if (matches.length !== 1 || list?.label !== label || list.field.typeId !== FIELD_TYPE.LIST) {
    return undefined;
  }
  const structIndices = view.readExactListStructIndices(list.field);
  if (!structIndices || structIndices.length > MAX_AREA_STORE_RESTRICTION_ENTRIES) {
    return undefined;
  }
  const baseItemIds: number[] = [];
  const opaqueSiblingFieldCounts: number[] = [];
  for (const entryStructIndex of structIndices) {
    if (view.structs[entryStructIndex]?.typeId !==
      AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID) return undefined;
    const entryFields = view.getStructFieldEntries(entryStructIndex);
    if (!entryFields) return undefined;
    const baseItemMatches = entryFields.filter(
      (entry) => normalizeLabel(entry.label) === "baseitem",
    );
    const baseItemField = baseItemMatches[0];
    if (baseItemMatches.length !== 1 || baseItemField?.label !== "BaseItem" ||
      baseItemField.field.typeId !== FIELD_TYPE.INT) return undefined;
    const baseItemId = view.readNumber(baseItemField.field);
    if (!Number.isSafeInteger(baseItemId) || Number(baseItemId) < 0 ||
      Number(baseItemId) > 0x7fff_ffff) return undefined;
    baseItemIds.push(Number(baseItemId));
    opaqueSiblingFieldCounts.push(entryFields.length - 1);
  }
  return readAreaStoreRestrictionsRawStorage({
    willNotBuy: {
      present: true,
      nativeType: "list",
      entryStructTypeId: AREA_STORE_RESTRICTION_ENTRY_STRUCT_TYPE_ID,
      baseItemNativeType: "int",
      baseItemIds,
      opaqueSiblingFieldCounts,
    },
    willOnlyBuy: { present: false },
  })?.willNotBuy;
}

const ITEM_BASE_APPEARANCE_FIELD_PROFILE = Object.freeze([
  Object.freeze({ key: "modelPart1", label: "ModelPart1", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "modelPart2", label: "ModelPart2", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "modelPart3", label: "ModelPart3", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rFoot", label: "ArmorPart_RFoot", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lFoot", label: "ArmorPart_LFoot", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rShin", label: "ArmorPart_RShin", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lShin", label: "ArmorPart_LShin", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lThigh", label: "ArmorPart_LThigh", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rThigh", label: "ArmorPart_RThigh", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "pelvis", label: "ArmorPart_Pelvis", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "torso", label: "ArmorPart_Torso", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "belt", label: "ArmorPart_Belt", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "neck", label: "ArmorPart_Neck", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rFArm", label: "ArmorPart_RFArm", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lFArm", label: "ArmorPart_LFArm", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rBicep", label: "ArmorPart_RBicep", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lBicep", label: "ArmorPart_LBicep", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rShoul", label: "ArmorPart_RShoul", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lShoul", label: "ArmorPart_LShoul", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "rHand", label: "ArmorPart_RHand", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "lHand", label: "ArmorPart_LHand", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "robe", label: "ArmorPart_Robe", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "leather1", label: "Leather1Color", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "leather2", label: "Leather2Color", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "cloth1", label: "Cloth1Color", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "cloth2", label: "Cloth2Color", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "metal1", label: "Metal1Color", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "metal2", label: "Metal2Color", typeId: FIELD_TYPE.BYTE }),
] as const);

function readExactItemBaseAppearanceRaw(
  view: GffView,
  structIndex: number,
): AreaItemBaseAppearanceRawStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 0) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const baseItemMatches = entries.filter(
    (entry) => normalizeLabel(entry.label) === "baseitem",
  );
  if (baseItemMatches.length !== 1 || baseItemMatches[0]?.label !== "BaseItem" ||
    baseItemMatches[0].field.typeId !== FIELD_TYPE.INT) return undefined;
  const baseItem = view.readNumber(baseItemMatches[0].field);
  if (!Number.isSafeInteger(baseItem)) return undefined;

  const appearanceFields: Partial<Record<AreaItemRawAppearanceKey, number>> = {};
  const appearanceFieldOrder: AreaItemRawAppearanceKey[] = [];
  const profileByNormalizedLabel = new Map(
    ITEM_BASE_APPEARANCE_FIELD_PROFILE.map((profile) => [
      normalizeLabel(profile.label),
      profile,
    ]),
  );
  for (const entry of entries) {
    const profile = profileByNormalizedLabel.get(normalizeLabel(entry.label));
    if (profile) appearanceFieldOrder.push(profile.key);
  }
  for (const profile of ITEM_BASE_APPEARANCE_FIELD_PROFILE) {
    const matches = entries.filter(
      (entry) => normalizeLabel(entry.label) === normalizeLabel(profile.label),
    );
    if (matches.length === 0) continue;
    const match = matches[0]!;
    if (matches.length !== 1 || match.label !== profile.label ||
      match.field.typeId !== profile.typeId) return undefined;
    const rawValue = view.readNumber(match.field);
    if (!Number.isSafeInteger(rawValue)) return undefined;
    appearanceFields[profile.key] = rawValue;
  }
  return readItemBaseAppearanceRawStorage({
    baseItem,
    appearanceFields,
    appearanceFieldOrder,
  }) ?? undefined;
}

const ITEM_PROPERTY_LIST_FIELD_PROFILE = Object.freeze([
  Object.freeze({ key: "propertyName", label: "PropertyName", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "subtype", label: "Subtype", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "costTable", label: "CostTable", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "costValue", label: "CostValue", typeId: FIELD_TYPE.WORD }),
  Object.freeze({ key: "param1", label: "Param1", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "param1Value", label: "Param1Value", typeId: FIELD_TYPE.BYTE }),
  Object.freeze({ key: "chanceAppear", label: "ChanceAppear", typeId: FIELD_TYPE.BYTE }),
] as const);

function readExactItemPropertyList(
  view: GffView,
  structIndex: number,
): AreaItemPropertyListProvenance | undefined {
  if (view.structs[structIndex]?.typeId !== 0) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "propertieslist",
  );
  if (fields.length === 0) {
    return parseAreaItemPropertyListProvenance({
      present: false,
      expectedEntries: [],
    });
  }
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "PropertiesList" || field.field.typeId !== FIELD_TYPE.LIST) {
    return undefined;
  }
  const structIndices = view.readExactListStructIndices(field.field);
  if (!structIndices || structIndices.length > MAX_AREA_ITEM_PROPERTY_LIST_ENTRIES) {
    return undefined;
  }
  const expectedEntries: Array<Record<string, number>> = [];
  for (let sourceIndex = 0; sourceIndex < structIndices.length; sourceIndex += 1) {
    const propertyStructIndex = structIndices[sourceIndex];
    if (view.structs[propertyStructIndex]?.typeId !== 0) return undefined;
    const propertyFields = view.getStructFieldEntries(propertyStructIndex);
    if (!propertyFields || propertyFields.length !== ITEM_PROPERTY_LIST_FIELD_PROFILE.length) {
      return undefined;
    }
    const property: Record<string, number> = { sourceIndex };
    for (let fieldIndex = 0; fieldIndex < ITEM_PROPERTY_LIST_FIELD_PROFILE.length; fieldIndex += 1) {
      const profile = ITEM_PROPERTY_LIST_FIELD_PROFILE[fieldIndex]!;
      const candidate = propertyFields[fieldIndex];
      if (candidate?.label !== profile.label || candidate.field.typeId !== profile.typeId) {
        return undefined;
      }
      const value = view.readNumber(candidate.field);
      if (!Number.isSafeInteger(value)) return undefined;
      property[profile.key] = value!;
    }
    expectedEntries.push(property);
  }
  try {
    return parseAreaItemPropertyListProvenance({
      present: true,
      expectedEntries,
    });
  } catch {
    return undefined;
  }
}

function readAuroraVariables(
  view: GffView,
  structIndex: number,
  expectedStructTypeId?: number,
): AuroraVariableProvenance | undefined {
  if (expectedStructTypeId !== undefined &&
      view.structs[structIndex]?.typeId !== expectedStructTypeId) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "vartable");
  if (fields.length === 0) return { expectedEntries: [] };
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "VarTable" || field.field.typeId !== FIELD_TYPE.LIST) return undefined;
  const structIndices = view.readExactListStructIndices(field.field);
  if (!structIndices || structIndices.length > MAX_AURORA_VARIABLE_ENTRIES) {
    return undefined;
  }

  const variables: AuroraVariableSourceEntry[] = [];
  for (let sourceIndex = 0; sourceIndex < structIndices.length; sourceIndex += 1) {
    const variableStructIndex = structIndices[sourceIndex];
    if (view.structs[variableStructIndex]?.typeId !== 0) return undefined;
    const variableFields = view.getStructFieldEntries(variableStructIndex);
    if (!variableFields || variableFields.length !== 3) return undefined;
    const readExactField = (label: "Name" | "Type" | "Value"): GffFieldRef | undefined => {
      const matches = variableFields.filter(
        (candidate) => normalizeLabel(candidate.label) === normalizeLabel(label),
      );
      return matches.length === 1 && matches[0].label === label
        ? matches[0].field
        : undefined;
    };
    const nameField = readExactField("Name");
    const typeField = readExactField("Type");
    const valueField = readExactField("Value");
    if (!nameField || nameField.typeId !== FIELD_TYPE.CEXOSTRING ||
      !typeField || typeField.typeId !== FIELD_TYPE.DWORD || !valueField) {
      return undefined;
    }
    const name = view.readExactString(nameField);
    const nativeType = view.readNumber(typeField);
    if (name === undefined) return undefined;
    if (nativeType === 1 && valueField.typeId === FIELD_TYPE.INT) {
      const value = view.readNumber(valueField);
      if (value === undefined) return undefined;
      variables.push({ sourceIndex, name, type: "int", value });
    } else if (nativeType === 2 && valueField.typeId === FIELD_TYPE.FLOAT) {
      const value = view.readNumber(valueField);
      if (value === undefined) return undefined;
      variables.push({ sourceIndex, name, type: "float", value });
    } else if (nativeType === 3 && valueField.typeId === FIELD_TYPE.CEXOSTRING) {
      const value = view.readExactString(valueField);
      if (value === undefined) return undefined;
      variables.push({ sourceIndex, name, type: "string", value });
    } else {
      return undefined;
    }
  }

  try {
    return parseAuroraVariableProvenance({ expectedEntries: variables });
  } catch {
    return undefined;
  }
}

function readPlaceableTemplateResRef(
  view: GffView,
  structIndex: number,
): string | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "templateresref",
  );
  if (fields.length !== 1) return undefined;
  const field = fields[0];
  if (field.label !== "TemplateResRef" || field.field.typeId !== FIELD_TYPE.RESREF) {
    return undefined;
  }
  const value = view.readString(field.field);
  return isAreaPlaceableTemplateResRef(value) ? value : undefined;
}

function readPlaceableLocalizedStrings(
  view: GffView,
  structIndex: number,
): AreaPlaceableLocalizedStrings | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;

  const locName = readExactLocalizedStringStorageMember(view, entries, "locname", "LocName");
  const description = readExactLocalizedStringStorageMember(
    view,
    entries,
    "description",
    "Description",
  );
  return locName && description ? { locName, description } : undefined;
}

function readItemLocalizedStrings(
  view: GffView,
  structIndex: number,
): AreaItemLocalizedStrings | undefined {
  if (view.structs[structIndex]?.typeId !== 0) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const localizedName = readExactLocalizedStringStorageMember(
    view,
    entries,
    "localizedname",
    "LocalizedName",
  );
  const description = readExactLocalizedStringStorageMember(
    view,
    entries,
    "description",
    "Description",
  );
  const identifiedDescription = readExactLocalizedStringStorageMember(
    view,
    entries,
    "descidentified",
    "DescIdentified",
  );
  return localizedName && description && identifiedDescription
    ? { localizedName, description, identifiedDescription }
    : undefined;
}

function readExactEncounterLocalizedNameStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterLocalizedNameStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  return readExactLocalizedStringStorageMember(
    view,
    entries,
    "localizedname",
    "LocalizedName",
  );
}

function readExactTriggerLocalizedNameStorage(
  view: GffView,
  structIndex: number,
): AreaTriggerLocalizedNameStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  return readExactLocalizedStringStorageMember(
    view,
    entries,
    "localizedname",
    "LocalizedName",
  );
}

function readExactWaypointLocalizedNameStorage(
  view: GffView,
  structIndex: number,
): AreaWaypointLocalizedNameStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 5) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  return readExactLocalizedStringStorageMember(
    view,
    entries,
    "localizedname",
    "LocalizedName",
  );
}

function readExactWaypointDescriptionStorage(
  view: GffView,
  structIndex: number,
): AreaWaypointDescriptionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 5) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  return readExactLocalizedStringStorageMember(
    view,
    entries,
    "description",
    "Description",
  );
}

function readExactWaypointMapNoteStorage(
  view: GffView,
  structIndex: number,
): AreaWaypointMapNoteStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 5) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const hasMapNoteByte = readExactNumericRootField(
    view,
    entries,
    "HasMapNote",
    FIELD_TYPE.BYTE,
  );
  const mapNoteStorage = readExactLocalizedStringStorageMember(
    view,
    entries,
    "mapnote",
    "MapNote",
  );
  const mapNoteEnabledByte = readExactNumericRootField(
    view,
    entries,
    "MapNoteEnabled",
    FIELD_TYPE.BYTE,
  );
  if (
    (hasMapNoteByte !== 0 && hasMapNoteByte !== 1)
    || !mapNoteStorage?.present
    || (mapNoteEnabledByte !== 0 && mapNoteEnabledByte !== 1)
  ) return undefined;
  return readAreaWaypointMapNoteStorage({
    hasMapNoteByte,
    mapNoteStorage,
    mapNoteEnabledByte,
  });
}

function readExactWaypointAppearanceStorage(
  view: GffView,
  structIndex: number,
): AreaWaypointAppearanceStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 5) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const value = readExactNumericRootField(
    view,
    entries,
    "Appearance",
    FIELD_TYPE.BYTE,
  );
  return Number.isSafeInteger(value) && value! >= 0 && value! <= 0xff
    ? Object.freeze({ present: true, nativeType: "byte", value: value! })
    : undefined;
}

function readExactLocalizedStringStorageMember(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  normalizedLabel: string,
  exactLabel: string,
): AreaLocalizedStringStorage | undefined {
  const matches = entries.filter((entry) => normalizeLabel(entry.label) === normalizedLabel);
  if (matches.length === 0) return { present: false };
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match.label !== exactLabel ||
    match.field.typeId !== FIELD_TYPE.CEXOLOCSTRING
  ) return undefined;
  return view.readExactLocStringStorage(match.field);
}

function readPlaceableHitPointState(
  view: GffView,
  structIndex: number,
): AreaPlaceableHitPointState | undefined {
  if (view.structs[structIndex]?.typeId !== 9) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const hpFields = entries.filter((entry) => normalizeLabel(entry.label) === "hp");
  const currentHpFields = entries.filter(
    (entry) => normalizeLabel(entry.label) === "currenthp",
  );
  if (hpFields.length !== 1 || currentHpFields.length !== 1) return undefined;
  const hpField = hpFields[0];
  const currentHpField = currentHpFields[0];
  if (hpField.label !== "HP" || currentHpField.label !== "CurrentHP" ||
      hpField.field.typeId !== FIELD_TYPE.SHORT ||
      currentHpField.field.typeId !== FIELD_TYPE.SHORT) {
    return undefined;
  }
  const hitPoints = view.readNumber(hpField.field);
  const currentHitPoints = view.readNumber(currentHpField.field);
  if (!isEditableAreaPlaceableHitPoints(hitPoints) || !isAuroraShort(currentHitPoints)) {
    return undefined;
  }
  return { hitPoints, currentHitPoints };
}

function readPlacementGeometry(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaGeometryPoint[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["geometry"]);
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (const structIndex of structIndices) {
    const pointFields = view.getStructFields(structIndex);
    const x = readNumberByAliases(view, pointFields, ["pointx", "x"]);
    const y = readNumberByAliases(view, pointFields, ["pointy", "y"]);
    const z = readNumberByAliases(view, pointFields, ["pointz", "z"]) ?? 0;
    if (Number.isFinite(x ?? Number.NaN) && Number.isFinite(y ?? Number.NaN)) {
      points.push({ x: x ?? 0, y: y ?? 0, z });
    }
  }
  return points.map((point) => ({ x: clampNumber(point.x), y: clampNumber(point.y), z: clampNumber(point.z) }));
}

function readExactEditablePlacementPolygon(
  view: GffView,
  structIndex: number,
  kind: "trigger" | "encounter",
): AreaObjectPolygonGeometry | undefined {
  const expectedPlacementStructType = kind === "trigger" ? 1 : 7;
  const expectedPointStructType = kind === "trigger" ? 3 : 1;
  const coordinateLabels = kind === "trigger"
    ? (["PointX", "PointY", "PointZ"] as const)
    : (["X", "Y", "Z"] as const);
  if (view.structs[structIndex]?.typeId !== expectedPlacementStructType) return undefined;

  const placementEntries = view.getStructFieldEntries(structIndex);
  if (!placementEntries) return undefined;
  const geometryMatches = placementEntries.filter(
    (entry) => entry.label.toLowerCase() === "geometry",
  );
  if (
    geometryMatches.length !== 1
    || geometryMatches[0]?.label !== "Geometry"
    || geometryMatches[0].field.typeId !== FIELD_TYPE.LIST
  ) {
    return undefined;
  }

  if (kind === "encounter") {
    if (!readExactEncounterSpawnPointList(view, structIndex)) return undefined;
  }

  const pointStructIndices = view.readExactListStructIndices(geometryMatches[0].field);
  if (!pointStructIndices) return undefined;
  const points: Array<{ x: number; y: number; z: number }> = [];
  for (const pointStructIndex of pointStructIndices) {
    if (view.structs[pointStructIndex]?.typeId !== expectedPointStructType) return undefined;
    const pointEntries = view.getStructFieldEntries(pointStructIndex);
    if (!pointEntries || pointEntries.length !== coordinateLabels.length) return undefined;
    const coordinates = coordinateLabels.map((label) =>
      readExactPolygonCoordinate(view, pointEntries, label));
    if (coordinates.some((coordinate) => coordinate === undefined)) return undefined;
    points.push({
      x: coordinates[0] as number,
      y: coordinates[1] as number,
      z: coordinates[2] as number,
    });
  }

  return readAreaObjectPolygonGeometry({
    coordinateSpace: "native_local",
    points,
  }) ?? undefined;
}

function readExactPolygonCoordinate(
  view: GffView,
  entries: readonly GffLabeledFieldRef[],
  label: string,
): number | undefined {
  const matches = entries.filter(
    (entry) => entry.label.toLowerCase() === label.toLowerCase(),
  );
  if (
    matches.length !== 1
    || matches[0]?.label !== label
    || matches[0].field.typeId !== FIELD_TYPE.FLOAT
  ) {
    return undefined;
  }
  const value = view.readNumber(matches[0].field);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readGeometryCenter(
  points: ParsedAreaGeometryPoint[]
): { x: number; y: number; z: number } | undefined {
  if (points.length === 0) return undefined;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
    y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    z: points.reduce((sum, point) => sum + point.z, 0) / points.length
  };
}

const CREATURE_STRING_METADATA_FIELDS = [
  { key: "templateResRef", aliases: ["templateresref", "resref", "template"] },
  { key: "tag", aliases: ["tag"] },
  { key: "conversation", aliases: ["conversation", "conv"] },
  { key: "portraitResRef", aliases: ["portrait"] }
] as const;

const CREATURE_LOCALIZED_METADATA_FIELDS = [
  { key: "firstName", strRefKey: "firstNameStrRef", aliases: ["firstname"] },
  { key: "lastName", strRefKey: "lastNameStrRef", aliases: ["lastname"] },
  { key: "description", strRefKey: "descriptionStrRef", aliases: ["description", "desc"] },
  { key: "comments", aliases: ["comment", "comments"] },
  { key: "subrace", strRefKey: "subraceStrRef", aliases: ["subrace"] },
  { key: "deity", strRefKey: "deityStrRef", aliases: ["deity"] }
] as const;

const CREATURE_NUMBER_METADATA_FIELDS = [
  { key: "paletteId", aliases: ["paletteid"] },
  { key: "appearanceId", aliases: ["appearance", "appearancetype", "appearanceid"] },
  { key: "gender", aliases: ["gender"] },
  { key: "race", aliases: ["race"] },
  { key: "phenotype", aliases: ["phenotype"] },
  { key: "factionId", aliases: ["factionid", "faction"] },
  { key: "portraitId", aliases: ["portraitid"] },
  { key: "soundSetFile", aliases: ["soundsetfile"] },
  { key: "wingsNew", aliases: ["wingsnew", "wings"] },
  { key: "tailNew", aliases: ["tailnew", "tail"] },
  { key: "walkRate", aliases: ["walkrate"] },
  { key: "naturalAc", aliases: ["naturalac"] },
  { key: "decayTime", aliases: ["decaytime"] },
  { key: "hitPoints", aliases: ["hitpoints", "hp"] },
  { key: "currentHitPoints", aliases: ["currenthitpoints", "currenthp"] },
  { key: "maxHitPoints", aliases: ["maxhitpoints"] },
  { key: "reflexBonus", aliases: ["refbonus", "refsave"] },
  { key: "willBonus", aliases: ["willbonus", "willsave"] },
  { key: "fortitudeBonus", aliases: ["fortbonus", "fortsave"] },
  { key: "goodEvil", aliases: ["goodevil"] },
  { key: "lawfulChaotic", aliases: ["lawfulchaotic"] },
  { key: "challengeRating", aliases: ["challengerating"] },
  { key: "crAdjust", aliases: ["cradjust"] },
  { key: "perceptionRange", aliases: ["perceptionrange"] },
  { key: "strength", aliases: ["str", "strength"] },
  { key: "dexterity", aliases: ["dex", "dexterity"] },
  { key: "constitution", aliases: ["con", "constitution"] },
  { key: "intelligence", aliases: ["int", "intelligence"] },
  { key: "wisdom", aliases: ["wis", "wisdom"] },
  { key: "charisma", aliases: ["cha", "charisma"] },
  { key: "strengthAdjust", aliases: ["stradjust", "strengthadjust"] },
  { key: "dexterityAdjust", aliases: ["dexadjust", "dexterityadjust"] },
  { key: "constitutionAdjust", aliases: ["conadjust", "constitutionadjust"] },
  { key: "intelligenceAdjust", aliases: ["intadjust", "intelligenceadjust"] },
  { key: "wisdomAdjust", aliases: ["wisadjust", "wisdomadjust"] },
  { key: "charismaAdjust", aliases: ["chaadjust", "charismaadjust"] },
  { key: "appearanceHead", aliases: ["appearancehead", "appearance_head"] },
  { key: "bodyPartRFoot", aliases: ["bodypartrfoot", "armorpartrfoot"] },
  { key: "bodyPartLFoot", aliases: ["bodypartlfoot", "armorpartlfoot"] },
  { key: "bodyPartRShin", aliases: ["bodypartrshin", "armorpartrshin"] },
  { key: "bodyPartLShin", aliases: ["bodypartlshin", "armorpartlshin"] },
  { key: "bodyPartLThigh", aliases: ["bodypartlthigh", "armorpartlthigh"] },
  { key: "bodyPartRThigh", aliases: ["bodypartrthigh", "armorpartrthigh"] },
  { key: "bodyPartPelvis", aliases: ["bodypartpelvis", "armorpartpelvis"] },
  { key: "bodyPartTorso", aliases: ["bodyparttorso", "armorparttorso"] },
  { key: "bodyPartBelt", aliases: ["bodypartbelt", "armorpartbelt"] },
  { key: "bodyPartNeck", aliases: ["bodypartneck", "armorpartneck"] },
  { key: "bodyPartRFArm", aliases: ["bodypartrfarm", "armorpartrfarm"] },
  { key: "bodyPartLFArm", aliases: ["bodypartlfarm", "armorpartlfarm"] },
  { key: "bodyPartRBicep", aliases: ["bodypartrbicep", "armorpartrbicep"] },
  { key: "bodyPartLBicep", aliases: ["bodypartlbicep", "armorpartlbicep"] },
  { key: "bodyPartRShoul", aliases: ["bodypartrshoul", "armorpartrshoul"] },
  { key: "bodyPartLShoul", aliases: ["bodypartlshoul", "armorpartlshoul"] },
  { key: "bodyPartRHand", aliases: ["bodypartrhand", "armorpartrhand"] },
  { key: "bodyPartLHand", aliases: ["bodypartlhand", "armorpartlhand"] },
  { key: "colorSkin", aliases: ["colorskin"] },
  { key: "colorHair", aliases: ["colorhair"] },
  { key: "colorTattoo1", aliases: ["colortattoo1"] },
  { key: "colorTattoo2", aliases: ["colortattoo2"] }
] as const;

const CREATURE_BOOLEAN_METADATA_FIELDS = [
  { key: "plot", aliases: ["plot"] },
  { key: "disarmable", aliases: ["disarmable"] },
  { key: "isPc", aliases: ["ispc"] },
  { key: "isImmortal", aliases: ["isimmortal"] },
  { key: "interruptable", aliases: ["interruptable", "interruptible"] },
  { key: "lootable", aliases: ["lootable"] },
  { key: "noPermDeath", aliases: ["nopermdeath"] },
  { key: "bodyBag", aliases: ["bodybag"] },
  { key: "startingPackage", aliases: ["startingpackage"] }
] as const;

const CREATURE_SCRIPT_METADATA_FIELDS = [
  { key: "script.scriptheartbeat", aliases: ["scriptheartbeat", "onheartbeat"] },
  { key: "script.scriptonnotice", aliases: ["scriptonnotice"] },
  { key: "script.scriptspellat", aliases: ["scriptspellat", "onspellcastat"] },
  { key: "script.scriptattacked", aliases: ["scriptattacked", "onmeleeattacked"] },
  { key: "script.scriptdamaged", aliases: ["scriptdamaged", "ondamaged"] },
  {
    key: "script.scriptdisturbed",
    aliases: ["scriptdisturbed", "oninventorydisturbed", "oninvdisturbed"]
  },
  { key: "script.scriptendround", aliases: ["scriptendround"] },
  { key: "script.scriptdialogue", aliases: ["scriptdialogue", "ondialog"] },
  { key: "script.scriptspawn", aliases: ["scriptspawn"] },
  { key: "script.scriptrested", aliases: ["scriptrested"] },
  { key: "script.scriptdeath", aliases: ["scriptdeath", "ondeath"] },
  { key: "script.scriptuserdefine", aliases: ["scriptuserdefine", "onuserdefined"] },
  { key: "script.scriptonblocked", aliases: ["scriptonblocked"] }
] as const;

const PLACEABLE_NUMBER_METADATA_FIELDS = [
  { key: "appearanceId", aliases: ["appearance", "appearancetype", "appearanceid"] },
  { key: "factionId", aliases: ["faction", "factionid"] },
  { key: "maxHitPoints", aliases: ["maxhp", "maxhitpoints"] },
  { key: "openLockDc", aliases: ["openlockdc"] },
  { key: "closeLockDc", aliases: ["closelockdc"] },
  { key: "trapType", aliases: ["traptype"] },
  { key: "bodyBag", aliases: ["bodybag"] }
] as const;

const PLACEABLE_BOOLEAN_METADATA_FIELDS = [
  { key: "static", aliases: ["static"] },
  { key: "useable", aliases: ["useable", "usable"] },
  { key: "hasInventory", aliases: ["hasinventory"] },
  { key: "plot", aliases: ["plot"] },
  { key: "locked", aliases: ["locked"] },
  { key: "lockable", aliases: ["lockable"] },
  { key: "keyRequired", aliases: ["keyrequired"] },
  { key: "autoRemoveKey", aliases: ["autoremovekey"] }
] as const;

const PLACEABLE_SCRIPT_METADATA_FIELDS = [
  { key: "script.onClick", aliases: ["onclick"] },
  { key: "script.onHeartbeat", aliases: ["onheartbeat", "scriptheartbeat"] },
  { key: "script.onInventoryDisturbed", aliases: ["oninventorydisturbed", "oninvdisturbed"] },
  { key: "script.onUsed", aliases: ["onused"] },
  { key: "script.onOpen", aliases: ["onopen"] },
  { key: "script.onClosed", aliases: ["onclosed", "onclose"] },
  { key: "script.onLock", aliases: ["onlock", "onlocked"] },
  { key: "script.onUnlock", aliases: ["onunlock", "onunlocked"] },
  { key: "script.onDamaged", aliases: ["ondamaged"] },
  { key: "script.onDeath", aliases: ["ondeath"] },
  { key: "script.onDisarm", aliases: ["ondisarm"] },
  { key: "script.onMeleeAttacked", aliases: ["onmeleeattacked"] },
  { key: "script.onSpellCastAt", aliases: ["onspellcastat"] },
  { key: "script.onTrapTriggered", aliases: ["ontraptriggered"] },
  { key: "script.onUserDefined", aliases: ["onuserdefined"] }
] as const;

function buildPlaceableMetadata(
  view: GffView,
  structIndex: number,
  fields: Map<string, GffFieldRef>,
  templateResRef: string | undefined,
  tag: string | undefined,
  appearanceType: number | undefined
): Record<string, ParsedAreaObjectMetadataPrimitive> | undefined {
  const metadata: Record<string, ParsedAreaObjectMetadataPrimitive> = {};
  addStringMetadata(metadata, "templateResRef", templateResRef);
  addStringMetadata(metadata, "tag", tag);
  addNumberMetadata(metadata, "appearanceId", appearanceType);
  addExactStringMetadata(metadata, "keyName", readExactStringByAliases(view, fields, ["keyname"]));
  addStringMetadata(metadata, "comments", readStringByAliases(view, fields, ["comment", "comments"]));

  const localizedNameInfo = readNameInfoByAliases(view, fields, ["locname", "localizedname", "name"]);
  addStringMetadata(metadata, "localizedName", localizedNameInfo.text);
  addNumberMetadata(metadata, "localizedNameStrRef", localizedNameInfo.strRef);
  const descriptionInfo = readNameInfoByAliases(view, fields, ["description", "desc"]);
  addStringMetadata(metadata, "description", descriptionInfo.text);
  addNumberMetadata(metadata, "descriptionStrRef", descriptionInfo.strRef);

  for (const field of PLACEABLE_NUMBER_METADATA_FIELDS) {
    addNumberMetadata(metadata, field.key, readNumberByAliases(view, fields, field.aliases));
  }
  const hitPointState = readPlaceableHitPointState(view, structIndex);
  if (hitPointState) {
    addNumberMetadata(metadata, "hitPoints", hitPointState.hitPoints);
    addNumberMetadata(metadata, "currentHitPoints", hitPointState.currentHitPoints);
  }
  for (const mapping of AREA_PLACEABLE_BASIC_BYTE_FIELD_MAPPINGS) {
    addNumberMetadata(
      metadata,
      mapping.metadataKey,
      readByteByAliases(view, fields, [mapping.field])
    );
  }
  const animationState = readByteByAliases(view, fields, ["AnimationState"]);
  addNumberMetadata(
    metadata,
    "animationState",
    isAreaPlaceableAnimationState(animationState) ? animationState : undefined,
  );
  for (const mapping of AREA_PLACEABLE_TRAP_BYTE_FIELD_MAPPINGS) {
    const value = readByteByAliases(view, fields, [mapping.field]);
    addNumberMetadata(
      metadata,
      mapping.metadataKey,
      isAreaPlaceableTrapByteMutationValue(mapping, value) ? value : undefined
    );
  }
  for (const field of PLACEABLE_BOOLEAN_METADATA_FIELDS) {
    addBooleanMetadata(metadata, field.key, readBooleanByAliases(view, fields, field.aliases));
  }
  const conversation = readResRefIncludingEmptyByAliases(view, fields, ["conversation"]);
  if (conversation !== undefined) {
    metadata.conversation = conversation;
  }
  addNumberMetadata(
    metadata,
    "interruptable",
    readBooleanByteNumberByAliases(view, fields, ["interruptable"])
  );
  for (const field of PLACEABLE_SCRIPT_METADATA_FIELDS) {
    const value = readStringIncludingEmptyByAliases(view, fields, field.aliases);
    if (value !== undefined) {
      metadata[field.key] = value;
    }
  }

  const inventoryEntries = readPlaceableInventoryItemListEntries(view, fields);
  metadata.inventoryItemListCount = readListCountByAliases(view, fields, ["itemlist"]) ?? 0;
  metadata.inventoryItemListEntries = JSON.stringify(inventoryEntries);

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

const ITEM_NUMBER_METADATA_FIELDS = [
  { key: "baseItem", aliases: ["baseitem"] },
  { key: "modelPart1", aliases: ["modelpart1"] },
  { key: "modelPart2", aliases: ["modelpart2"] },
  { key: "modelPart3", aliases: ["modelpart3"] },
  { key: "cost", aliases: ["cost"] },
  { key: "addCost", aliases: ["addcost"] },
  { key: "costTable", aliases: ["costtable"] },
  { key: "costValue", aliases: ["costvalue"] },
  { key: "charges", aliases: ["charges"] },
  { key: "stackSize", aliases: ["stacksize"] },
  { key: "paletteId", aliases: ["paletteid"] },
  { key: "bodyPartRFoot", aliases: ["armorpart_rfoot", "bodypartrfoot"] },
  { key: "bodyPartLFoot", aliases: ["armorpart_lfoot", "bodypartlfoot"] },
  { key: "bodyPartRShin", aliases: ["armorpart_rshin", "bodypartrshin"] },
  { key: "bodyPartLShin", aliases: ["armorpart_lshin", "bodypartlshin"] },
  { key: "bodyPartLThigh", aliases: ["armorpart_lthigh", "bodypartlthigh"] },
  { key: "bodyPartRThigh", aliases: ["armorpart_rthigh", "bodypartrthigh"] },
  { key: "bodyPartPelvis", aliases: ["armorpart_pelvis", "bodypartpelvis"] },
  { key: "bodyPartTorso", aliases: ["armorpart_torso", "bodyparttorso"] },
  { key: "bodyPartBelt", aliases: ["armorpart_belt", "bodypartbelt"] },
  { key: "bodyPartNeck", aliases: ["armorpart_neck", "bodypartneck"] },
  { key: "bodyPartRFArm", aliases: ["armorpart_rfarm", "bodypartrfarm"] },
  { key: "bodyPartLFArm", aliases: ["armorpart_lfarm", "bodypartlfarm"] },
  { key: "bodyPartRBicep", aliases: ["armorpart_rbicep", "bodypartrbicep"] },
  { key: "bodyPartLBicep", aliases: ["armorpart_lbicep", "bodypartlbicep"] },
  { key: "bodyPartRShoul", aliases: ["armorpart_rshoul", "bodypartrshoul"] },
  { key: "bodyPartLShoul", aliases: ["armorpart_lshoul", "bodypartlshoul"] },
  { key: "bodyPartRHand", aliases: ["armorpart_rhand", "bodypartrhand"] },
  { key: "bodyPartLHand", aliases: ["armorpart_lhand", "bodypartlhand"] },
  { key: "bodyPartRobe", aliases: ["armorpart_robe", "bodypartrobe"] },
  { key: "leather1Color", aliases: ["leather1color"] },
  { key: "leather2Color", aliases: ["leather2color"] },
  { key: "cloth1Color", aliases: ["cloth1color"] },
  { key: "cloth2Color", aliases: ["cloth2color"] },
  { key: "metal1Color", aliases: ["metal1color"] },
  { key: "metal2Color", aliases: ["metal2color"] }
] as const;

const ITEM_BOOLEAN_METADATA_FIELDS = [
  { key: "identified", aliases: ["identified"] },
  { key: "droppable", aliases: ["dropable", "droppable"] },
  { key: "stolen", aliases: ["stolen"] },
  { key: "plot", aliases: ["plot"] },
  { key: "cursed", aliases: ["cursed"] }
] as const;

const ITEM_SCRIPT_METADATA_FIELDS = [
  { key: "script.onused", aliases: ["onused"] },
  { key: "script.onheartbeat", aliases: ["onheartbeat"] },
  { key: "script.onuserdefined", aliases: ["onuserdefined"] },
  { key: "script.oninventorydisturbed", aliases: ["oninventorydisturbed", "oninvdisturbed"] }
] as const;

function buildItemMetadata(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  templateResRef: string | undefined,
  tag: string | undefined
): Record<string, ParsedAreaObjectMetadataPrimitive> | undefined {
  const metadata: Record<string, ParsedAreaObjectMetadataPrimitive> = {};
  addStringMetadata(metadata, "templateResRef", templateResRef);
  addStringMetadata(metadata, "tag", tag);
  addStringMetadata(metadata, "comments", readStringByAliases(view, fields, ["comment", "comments"]));

  const localizedNameInfo = readNameInfoByAliases(view, fields, ["locname", "localizedname", "name"]);
  addStringMetadata(metadata, "localizedName", localizedNameInfo.text);
  addNumberMetadata(metadata, "localizedNameStrRef", localizedNameInfo.strRef);
  const descriptionInfo = readNameInfoByAliases(view, fields, ["description", "desc"]);
  addStringMetadata(metadata, "description", descriptionInfo.text);
  addNumberMetadata(metadata, "descriptionStrRef", descriptionInfo.strRef);
  const identifiedDescriptionInfo = readNameInfoByAliases(view, fields, [
    "descidentified",
    "identifieddescription"
  ]);
  addStringMetadata(metadata, "identifiedDescription", identifiedDescriptionInfo.text);
  addNumberMetadata(metadata, "identifiedDescriptionStrRef", identifiedDescriptionInfo.strRef);

  for (const field of ITEM_NUMBER_METADATA_FIELDS) {
    addNumberMetadata(metadata, field.key, readNumberByAliases(view, fields, field.aliases));
  }
  for (const field of ITEM_BOOLEAN_METADATA_FIELDS) {
    addBooleanMetadata(metadata, field.key, readBooleanByAliases(view, fields, field.aliases));
  }
  for (const field of ITEM_SCRIPT_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }

  const itemPropertyListEntries = readItemPropertyListEntries(view, fields);
  addNumberMetadata(metadata, "itemPropertyListCount", itemPropertyListEntries.length);
  addJsonMetadata(metadata, "itemPropertyListEntries", itemPropertyListEntries);

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function readExactItemInventoryItems(
  view: GffView,
  itemStructIndex: number,
): readonly AreaItemInventorySourceEntry[] | undefined {
  if (view.structs[itemStructIndex]?.typeId !== 0) return undefined;
  const itemFields = view.getStructFieldEntries(itemStructIndex);
  if (!itemFields) return undefined;
  const listMatches = itemFields.filter(
    (entry) => entry.label.toLowerCase() === "itemlist",
  );
  if (listMatches.length === 0) {
    return Object.freeze([] as AreaItemInventorySourceEntry[]);
  }
  const list = listMatches[0];
  if (
    listMatches.length !== 1
    || list?.label !== "ItemList"
    || list.field.typeId !== FIELD_TYPE.LIST
  ) {
    return undefined;
  }
  const itemStructIndices = view.readExactListStructIndices(list.field);
  if (
    !itemStructIndices
    || itemStructIndices.length === 0
    || itemStructIndices.length > MAX_AREA_ITEM_INVENTORY_ENTRIES_PER_MUTATION
  ) {
    return undefined;
  }

  const result: AreaItemInventorySourceEntry[] = [];
  for (const [sourceIndex, nestedItemStructIndex] of itemStructIndices.entries()) {
    if (view.structs[nestedItemStructIndex]?.typeId !== sourceIndex) return undefined;
    const fields = view.getStructFieldEntries(nestedItemStructIndex);
    if (!fields || hasItemInventoryModeField(fields)) return undefined;
    const resRef = readExactNestedItemInventoryResRef(view, fields);
    const x = readExactNestedItemInventoryWord(view, fields, "Repos_PosX");
    const y = readExactNestedItemInventoryWord(view, fields, "Repos_Posy");
    if (resRef === undefined || x === undefined || y === undefined) return undefined;
    result.push(Object.freeze({ sourceIndex, resRef, x, y }));
  }
  return Object.freeze(result);
}

const ITEM_VISUAL_TRANSFORM_CONTROLLER_LABELS = Object.freeze([
  "AnimationSpeed",
  "ScaleX",
  "ScaleY",
  "ScaleZ",
  "RotateX",
  "RotateY",
  "RotateZ",
  "TranslateX",
  "TranslateY",
  "TranslateZ",
] as const);

function readExactItemVisualTransform(
  view: GffView,
  itemStructIndex: number,
): AreaItemVisualTransformStorage | undefined {
  if (view.structs[itemStructIndex]?.typeId !== 0) return undefined;
  const itemFields = view.getStructFieldEntries(itemStructIndex);
  if (!itemFields) return undefined;
  const storageCollisions = itemFields.filter((entry) => [
    "vistransformlist",
    "visualtransformlist",
    "visualtransform",
  ].includes(entry.label.toLowerCase()));
  const listMatches = storageCollisions.filter(
    (entry) => entry.label.toLowerCase() === "vistransformlist",
  );
  if (storageCollisions.length === 0) {
    return Object.freeze({ present: false });
  }
  const list = listMatches[0];
  if (
    storageCollisions.length !== 1
    || listMatches.length !== 1
    || list?.label !== "VisTransformList"
    || list.field.typeId !== FIELD_TYPE.LIST
  ) {
    return undefined;
  }
  const transformIndices = view.readExactListStructIndices(list.field);
  const transformIndex = transformIndices?.[0];
  if (
    transformIndices?.length !== 1
    || transformIndex === undefined
    || view.structs[transformIndex]?.typeId !== 6
  ) {
    return undefined;
  }
  const transformFields = view.getStructFieldEntries(transformIndex);
  if (!transformFields || transformFields.length !== 11) return undefined;
  const scope = readExactVisualTransformNumber(
    view,
    transformFields,
    "Scope",
    FIELD_TYPE.INT,
  );
  if (scope !== 0) return undefined;

  const controllerValues = new Map<string, number>();
  for (const label of ITEM_VISUAL_TRANSFORM_CONTROLLER_LABELS) {
    const matches = transformFields.filter(
      (entry) => entry.label.toLowerCase() === label.toLowerCase(),
    );
    const controllerField = matches[0];
    if (
      matches.length !== 1
      || controllerField?.label !== label
      || controllerField.field.typeId !== FIELD_TYPE.STRUCT
    ) {
      return undefined;
    }
    const controllerIndex = view.readStructIndex(controllerField.field);
    if (
      controllerIndex === undefined
      || view.structs[controllerIndex]?.typeId !== 0
    ) {
      return undefined;
    }
    const controllerFields = view.getStructFieldEntries(controllerIndex);
    if (!controllerFields || controllerFields.length !== 3) return undefined;
    const timerType = readExactVisualTransformNumber(
      view,
      controllerFields,
      "TimerType",
      FIELD_TYPE.INT,
    );
    const valueTo = readExactVisualTransformNumber(
      view,
      controllerFields,
      "ValueTo",
      FIELD_TYPE.FLOAT,
    );
    const lerpType = readExactVisualTransformNumber(
      view,
      controllerFields,
      "LerpType",
      FIELD_TYPE.INT,
    );
    if (timerType !== 0 || valueTo === undefined || lerpType !== 0) {
      return undefined;
    }
    controllerValues.set(label, valueTo);
  }
  if (controllerValues.get("AnimationSpeed") !== 1) return undefined;
  const value = Object.fromEntries(
    AREA_ITEM_VISUAL_TRANSFORM_KEYS.map((key) => {
      const nativeLabel = key.charAt(0).toUpperCase() + key.slice(1);
      return [key, controllerValues.get(nativeLabel)];
    }),
  );
  try {
    return parseAreaItemVisualTransformStorage(
      { present: true, value },
      "itemVisualTransform",
    );
  } catch (error) {
    if (error instanceof AreaItemVisualTransformValidationError) return undefined;
    throw error;
  }
}

function readExactVisualTransformNumber(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
  label: string,
  typeId: number,
): number | undefined {
  const matches = fields.filter(
    (entry) => entry.label.toLowerCase() === label.toLowerCase(),
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== label
    || field.field.typeId !== typeId
  ) {
    return undefined;
  }
  const value = view.readNumber(field.field);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function hasItemInventoryModeField(fields: readonly GffLabeledFieldRef[]): boolean {
  const unsupported = new Set([
    "dropable",
    "droppable",
    "pickpocketable",
    "infinite",
  ]);
  return fields.some((entry) => unsupported.has(entry.label.toLowerCase()));
}

function readExactNestedItemInventoryResRef(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
): string | undefined {
  const matches = fields.filter(
    (entry) => entry.label.toLowerCase() === "templateresref",
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== "TemplateResRef"
    || field.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  const value = view.readExactResRef(field.field);
  return typeof value === "string" && /^[A-Za-z0-9_]{1,16}$/u.test(value)
    ? value
    : undefined;
}

function readExactNestedItemInventoryWord(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
  label: "Repos_PosX" | "Repos_Posy",
): number | undefined {
  const normalizedLabel = label.toLowerCase().replaceAll("_", "");
  const matches = fields.filter(
    (entry) => entry.label.toLowerCase().replaceAll("_", "") === normalizedLabel,
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== label
    || field.field.typeId !== FIELD_TYPE.WORD
  ) {
    return undefined;
  }
  const value = view.readNumber(field.field);
  return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff
    ? Number(value)
    : undefined;
}

function readExactItemInstanceState(
  view: GffView,
  structIndex: number,
): AreaItemInstanceStateStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 0) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const presentFields: Array<typeof AREA_ITEM_INSTANCE_STATE_FIELDS[number]["key"]> = [];
  const values: Record<string, number | boolean> = { ...AREA_ITEM_INSTANCE_STATE_DEFAULTS };
  for (const profile of AREA_ITEM_INSTANCE_STATE_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === profile.label.toLowerCase(),
    );
    if (matches.length === 0) continue;
    const match = matches[0]!;
    const expectedType = profile.nativeType === "byte"
      ? FIELD_TYPE.BYTE
      : profile.nativeType === "word"
        ? FIELD_TYPE.WORD
        : FIELD_TYPE.DWORD;
    if (matches.length !== 1 || match.label !== profile.label || match.field.typeId !== expectedType) {
      return undefined;
    }
    const rawValue = view.readNumber(match.field);
    if (!Number.isSafeInteger(rawValue) || rawValue! < profile.minimum || rawValue! > profile.maximum) {
      return undefined;
    }
    if (profile.valueKind === "boolean" && rawValue !== 0 && rawValue !== 1) return undefined;
    presentFields.push(profile.key);
    values[profile.key] = profile.valueKind === "boolean" ? rawValue === 1 : rawValue!;
  }
  return readAreaItemInstanceStateStorage({
    presentFields,
    values: values as unknown as AreaItemInstanceStateValue,
  }) ?? undefined;
}

function readExactItemTag(
  view: GffView,
  structIndex: number,
): AreaItemTagStorage | undefined {
  return readExactObjectTagStorage(
    view,
    structIndex,
    0,
    readExistingAreaItemTagStorage,
  );
}

function readExactTriggerTag(
  view: GffView,
  structIndex: number,
): AreaTriggerTagStorage | undefined {
  return readExactObjectTagStorage(
    view,
    structIndex,
    1,
    readExistingAreaTriggerTagStorage,
  );
}

function readExactEncounterTag(
  view: GffView,
  structIndex: number,
): AreaEncounterTagStorage | undefined {
  return readExactObjectTagStorage(
    view,
    structIndex,
    7,
    readExistingAreaEncounterTagStorage,
  );
}

function readExactWaypointTag(
  view: GffView,
  structIndex: number,
): AreaWaypointTagStorage | undefined {
  return readExactObjectTagStorage(
    view,
    structIndex,
    5,
    readExistingAreaWaypointTagStorage,
  );
}

function readExactEncounterActiveStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterActiveStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const activeByte = readExactNumericRootField(
    view,
    entries,
    "Active",
    FIELD_TYPE.BYTE,
  );
  if (activeByte === undefined) return undefined;
  return readAreaEncounterActiveStorage({ activeByte }) ?? undefined;
}

function readExactEncounterPlayerOnlyStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterPlayerOnlyStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const playerOnlyByte = readExactNumericRootField(
    view,
    entries,
    "PlayerOnly",
    FIELD_TYPE.BYTE,
  );
  if (playerOnlyByte === undefined) return undefined;
  return readAreaEncounterPlayerOnlyStorage({ playerOnlyByte }) ?? undefined;
}

function readExactEncounterResetStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterResetStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const resetByte = readExactNumericRootField(
    view,
    entries,
    "Reset",
    FIELD_TYPE.BYTE,
  );
  if (resetByte === undefined) return undefined;
  return readAreaEncounterResetStorage({ resetByte }) ?? undefined;
}

function readExactEncounterResetTimeStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterResetTimeStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const resetTime = readExactNumericRootField(
    view,
    entries,
    "ResetTime",
    FIELD_TYPE.INT,
  );
  if (resetTime === undefined) return undefined;
  return readAreaEncounterResetTimeStorage({ resetTime }) ?? undefined;
}

function readExactEncounterSpawnOptionStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterSpawnOptionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const spawnOption = readExactNumericRootField(
    view,
    entries,
    "SpawnOption",
    FIELD_TYPE.INT,
  );
  if (spawnOption === undefined) return undefined;
  return readAreaEncounterSpawnOptionStorage({ spawnOption }) ?? undefined;
}

function readExactEncounterRespawnsStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterRespawnsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const respawns = readExactNumericRootField(
    view,
    entries,
    "Respawns",
    FIELD_TYPE.INT,
  );
  if (respawns === undefined) return undefined;
  return readAreaEncounterRespawnsStorage({ respawns }) ?? undefined;
}

function readExactEncounterCreatureCountStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterCreatureCountStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const maxCreatures = readExactNumericRootField(
    view,
    entries,
    "MaxCreatures",
    FIELD_TYPE.INT,
  );
  const recCreatures = readExactNumericRootField(
    view,
    entries,
    "RecCreatures",
    FIELD_TYPE.INT,
  );
  if (maxCreatures === undefined || recCreatures === undefined) return undefined;
  return readAreaEncounterCreatureCountStorage({ maxCreatures, recCreatures }) ?? undefined;
}

function readExactEncounterScriptResRefsStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterScriptResRefsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const values: Record<string, string> = {};
  for (const profile of AREA_ENCOUNTER_SCRIPT_RESREF_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.field.typeId !== FIELD_TYPE.RESREF
    ) return undefined;
    const raw = view.readString(field.field);
    if (typeof raw !== "string") return undefined;
    values[profile.key] = raw;
  }
  return readAreaEncounterScriptResRefsStorage(values) ?? undefined;
}

function readExactTriggerScriptResRefsStorage(
  view: GffView,
  structIndex: number,
): AreaTriggerScriptResRefsStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const values: Record<string, string> = {};
  for (const profile of AREA_TRIGGER_SCRIPT_RESREF_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === profile.label.toLowerCase(),
    );
    const field = matches[0];
    if (
      matches.length !== 1
      || field?.label !== profile.label
      || field.field.typeId !== FIELD_TYPE.RESREF
    ) return undefined;
    const raw = view.readString(field.field);
    if (typeof raw !== "string") return undefined;
    values[profile.key] = raw;
  }
  return readAreaTriggerScriptResRefsStorage(values) ?? undefined;
}

function readExactTriggerTransitionStorage(
  view: GffView,
  structIndex: number,
): AreaTriggerTransitionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const readExact = (
    label: "LinkedTo" | "LinkedToFlags" | "LoadScreenID",
    typeId: number,
  ) => {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === label.toLowerCase(),
    );
    return matches.length === 1
      && matches[0]?.label === label
      && matches[0].field.typeId === typeId
      ? matches[0].field
      : undefined;
  };
  const linkedToField = readExact("LinkedTo", FIELD_TYPE.CEXOSTRING);
  const linkedToFlagsField = readExact("LinkedToFlags", FIELD_TYPE.BYTE);
  const loadScreenIdField = readExact("LoadScreenID", FIELD_TYPE.WORD);
  if (!linkedToField || !linkedToFlagsField || !loadScreenIdField) return undefined;
  const value = {
    linkedTo: view.readExactString(linkedToField),
    linkedToFlags: view.readNumber(linkedToFlagsField),
    loadScreenId: view.readNumber(loadScreenIdField),
  };
  return isAreaTriggerTransitionStorage(value) ? Object.freeze(value) : undefined;
}

function readExactTriggerCoreProperties(
  view: GffView,
  structIndex: number,
): AreaTriggerCoreProperties | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const readExact = (label: string, typeId: number) => {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === label.toLowerCase(),
    );
    return matches.length === 1
      && matches[0]?.label === label
      && matches[0].field.typeId === typeId
      ? matches[0].field
      : undefined;
  };
  const autoRemoveKey = readExact("AutoRemoveKey", FIELD_TYPE.BYTE);
  const faction = readExact("Faction", FIELD_TYPE.DWORD);
  const cursor = readExact("Cursor", FIELD_TYPE.BYTE);
  const highlightHeight = readExact("HighlightHeight", FIELD_TYPE.FLOAT);
  const keyName = readExact("KeyName", FIELD_TYPE.CEXOSTRING);
  const portraitId = readExact("PortraitId", FIELD_TYPE.WORD);
  const triggerType = readExact("Type", FIELD_TYPE.INT);
  if (!autoRemoveKey || !faction || !cursor || !highlightHeight || !keyName
    || !portraitId || !triggerType) return undefined;
  const value = {
    autoRemoveKey: view.readNumber(autoRemoveKey),
    factionId: view.readNumber(faction),
    cursorId: view.readNumber(cursor),
    highlightHeight: view.readNumber(highlightHeight),
    keyName: view.readExactString(keyName),
    portraitId: view.readNumber(portraitId),
    triggerType: view.readNumber(triggerType),
  };
  return isAreaTriggerCoreProperties(value) ? Object.freeze(value) : undefined;
}

function readExactTriggerTrapProperties(
  view: GffView,
  structIndex: number,
): AreaTriggerTrapProperties | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const value: Record<string, unknown> = {};
  for (const field of AREA_TRIGGER_TRAP_PROPERTY_FIELDS) {
    const matches = entries.filter(
      (entry) => entry.label.toLowerCase() === field.label.toLowerCase(),
    );
    if (matches.length !== 1
      || matches[0]?.label !== field.label
      || matches[0].field.typeId !== FIELD_TYPE.BYTE) return undefined;
    value[field.key] = view.readNumber(matches[0].field);
  }
  return isAreaTriggerTrapProperties(value) ? Object.freeze(value) : undefined;
}

function readExactEncounterFactionStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterFactionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const fields = entries.filter((entry) => normalizeLabel(entry.label) === "faction");
  if (fields.length === 0) {
    return readAreaEncounterFactionStorage({ present: false }) ?? undefined;
  }
  const field = fields[0];
  if (
    fields.length !== 1
    || field.label !== "Faction"
    || field.field.typeId !== FIELD_TYPE.DWORD
  ) return undefined;
  const value = view.readNumber(field.field);
  return value === undefined
    ? undefined
    : readAreaEncounterFactionStorage({
        present: true,
        nativeType: "dword",
        value,
      }) ?? undefined;
}

function readExactEncounterDifficultyStorage(
  view: GffView,
  structIndex: number,
): AreaEncounterDifficultyStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const readField = (label: "Difficulty" | "DifficultyIndex") => {
    const matches = entries.filter(
      (entry) => normalizeLabel(entry.label) === label.toLowerCase(),
    );
    if (matches.length === 0) return { present: false } as const;
    const field = matches[0];
    if (matches.length !== 1 || field?.label !== label ||
        field.field.typeId !== FIELD_TYPE.INT) return null;
    const value = view.readNumber(field.field);
    return value === undefined
      ? null
      : { present: true, nativeType: "int" as const, value };
  };
  const difficulty = readField("Difficulty");
  const difficultyIndex = readField("DifficultyIndex");
  if (!difficulty || !difficultyIndex) return undefined;
  return readAreaEncounterDifficultyStorage({ difficulty, difficultyIndex }) ?? undefined;
}

function readExactObjectTagStorage<T>(
  view: GffView,
  structIndex: number,
  expectedStructTypeId: number,
  readStorage: (input: unknown) => T | null,
): T | undefined {
  if (view.structs[structIndex]?.typeId !== expectedStructTypeId) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter((entry) => entry.label.toLowerCase() === "tag");
  if (matches.length === 0) {
    return readStorage({ present: false }) ?? undefined;
  }
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match?.label !== "Tag" ||
    match.field.typeId !== FIELD_TYPE.CEXOSTRING
  ) {
    return undefined;
  }
  const value = view.readExactString(match.field);
  return readStorage({ present: true, value }) ?? undefined;
}

function readExactItemTemplateResRef(
  view: GffView,
  structIndex: number,
): AreaItemTemplateResRefStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 0) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter(
    (entry) => entry.label.toLowerCase() === "templateresref",
  );
  if (matches.length === 0) {
    return readAreaItemTemplateResRefStorage({ present: false }) ?? undefined;
  }
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match?.label !== "TemplateResRef" ||
    match.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  return readAreaItemTemplateResRefStorage({
    present: true,
    nativeType: "resref",
    value: view.readString(match.field),
  }) ?? undefined;
}

function readExactWaypointTemplateResRef(
  view: GffView,
  structIndex: number,
): AreaWaypointTemplateResRefStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 5) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter(
    (entry) => entry.label.toLowerCase() === "templateresref",
  );
  if (matches.length === 0) {
    return readAreaWaypointTemplateResRefStorage({ present: false }) ?? undefined;
  }
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match?.label !== "TemplateResRef" ||
    match.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  return readAreaWaypointTemplateResRefStorage({
    present: true,
    nativeType: "resref",
    value: view.readString(match.field),
  }) ?? undefined;
}

function readExactEncounterTemplateResRef(
  view: GffView,
  structIndex: number,
): AreaEncounterTemplateResRefStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 7) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter(
    (entry) => entry.label.toLowerCase() === "templateresref",
  );
  if (matches.length === 0) {
    return readAreaEncounterTemplateResRefStorage({ present: false }) ?? undefined;
  }
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match?.label !== "TemplateResRef" ||
    match.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  return readAreaEncounterTemplateResRefStorage({
    present: true,
    nativeType: "resref",
    value: view.readString(match.field),
  }) ?? undefined;
}

function readExactTriggerTemplateResRef(
  view: GffView,
  structIndex: number,
): AreaTriggerTemplateResRefStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 1) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const matches = entries.filter(
    (entry) => entry.label.toLowerCase() === "templateresref",
  );
  if (matches.length === 0) {
    return readAreaTriggerTemplateResRefStorage({ present: false }) ?? undefined;
  }
  const match = matches[0];
  if (
    matches.length !== 1 ||
    match?.label !== "TemplateResRef" ||
    match.field.typeId !== FIELD_TYPE.RESREF
  ) {
    return undefined;
  }
  return readAreaTriggerTemplateResRefStorage({
    present: true,
    nativeType: "resref",
    value: view.readString(match.field),
  }) ?? undefined;
}

function buildCreatureMetadata(
  view: GffView,
  structIndex: number,
  fields: Map<string, GffFieldRef>,
  templateResRef: string | undefined,
  tag: string | undefined,
  appearanceType: number | undefined
): Record<string, ParsedAreaCreatureMetadataPrimitive> | undefined {
  const metadata: Record<string, ParsedAreaCreatureMetadataPrimitive> = {};

  addStringMetadata(metadata, "templateResRef", templateResRef);
  addStringMetadata(metadata, "tag", tag);
  addNumberMetadata(metadata, "appearanceId", appearanceType);

  for (const field of CREATURE_STRING_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_LOCALIZED_METADATA_FIELDS) {
    const nameInfo = readNameInfoByAliases(view, fields, field.aliases);
    addStringMetadata(metadata, field.key, nameInfo.text);
    if ("strRefKey" in field) {
      addNumberMetadata(metadata, field.strRefKey, nameInfo.strRef);
    }
  }
  for (const field of CREATURE_NUMBER_METADATA_FIELDS) {
    addNumberMetadata(metadata, field.key, readNumberByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_BOOLEAN_METADATA_FIELDS) {
    addBooleanMetadata(metadata, field.key, readBooleanByAliases(view, fields, field.aliases));
  }
  for (const field of CREATURE_SCRIPT_METADATA_FIELDS) {
    addStringMetadata(metadata, field.key, readStringByAliases(view, fields, field.aliases));
  }

  const classListCount = readListCountByAliases(view, fields, ["classlist"]);
  const skillListCount = readListCountByAliases(view, fields, ["skilllist"]);
  const featListCount = readListCountByAliases(view, fields, ["featlist"]);
  const templateListCount = readListCountByAliases(view, fields, ["templatelist"]);
  const specAbilityListCount = readListCountByAliases(view, fields, ["specabilitylist"]);
  const inventoryItemListCount = readListCountByAliases(view, fields, ["itemlist"]) ?? 0;
  const equipItemListCount = readListCountByAliases(view, fields, [
    "equipitemlist",
    "equip_itemlist"
  ]) ?? 0;

  addNumberMetadata(metadata, "classListCount", classListCount);
  addNumberMetadata(metadata, "skillListCount", skillListCount);
  addNumberMetadata(metadata, "featListCount", featListCount);
  addNumberMetadata(metadata, "templateListCount", templateListCount);
  addNumberMetadata(metadata, "specAbilityListCount", specAbilityListCount);
  addNumberMetadata(metadata, "inventoryItemListCount", inventoryItemListCount);
  addNumberMetadata(metadata, "equipItemListCount", equipItemListCount);

  addJsonMetadata(metadata, "classListEntries", readCreatureClassListEntries(view, fields));
  addJsonMetadata(metadata, "skillListEntries", readCreatureSkillListEntries(view, fields));
  addJsonMetadata(
    metadata,
    "featListEntries",
    readCreatureIdListEntries(view, fields, ["featlist"], ["feat", "featid"])
  );
  addJsonMetadata(
    metadata,
    "templateListEntries",
    readCreatureIdListEntries(view, fields, ["templatelist"], ["templateid"]).map((entry) => ({
      templateId: entry.featId
    }))
  );
  addJsonMetadata(metadata, "specAbilityListEntries", readCreatureSpecAbilityListEntries(view, fields));
  addJsonMetadata(
    metadata,
    "inventoryItemListEntries",
    readCreatureInventoryItemListEntries(view, fields)
  );
  addJsonMetadata(
    metadata,
    "equipItemListEntries",
    readCreatureEquipItemListEntries(view, fields)
  );
  const exactEquipmentEntries = readExactCreatureEquipmentMutationEntries(
    view,
    structIndex,
  );
  if (exactEquipmentEntries !== undefined) {
    addJsonMetadata(
      metadata,
      "equipItemListMutationEntries",
      exactEquipmentEntries,
    );
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined;
}

function addStringMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: string | undefined
): void {
  if (value && value.trim().length > 0) {
    metadata[key] = value.trim();
  }
}

function addExactStringMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: string | undefined
): void {
  if (typeof value === "string") metadata[key] = value;
}

function addNumberMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: number | undefined
): void {
  if (Number.isFinite(value ?? Number.NaN)) {
    metadata[key] = clampNumber(value ?? 0);
  }
}

function addBooleanMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  value: boolean | undefined
): void {
  if (value !== undefined) {
    metadata[key] = value;
  }
}

function addJsonMetadata(
  metadata: Record<string, ParsedAreaCreatureMetadataPrimitive>,
  key: string,
  entries: readonly object[]
): void {
  if (entries.length > 0) {
    metadata[key] = JSON.stringify(entries);
  }
}

function readCreatureClassListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureClassListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["classlist"]);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const rawClassId = readNumberByAliases(view, entryFields, ["class"]);
    const rawLevel = readNumberByAliases(view, entryFields, ["classlevel"]);
    const classId = normalizeListNumber(rawClassId, 0);
    const level = normalizeListNumber(rawLevel, 0);
    const shouldReadKnownSpells = classId === 1 || classId === 9;
    const knownSpells = shouldReadKnownSpells
      ? [
          ...readCreatureClassSpellListEntries(view, entryFields, ["knownlist"]),
          ...readLeveledCreatureClassSpellListEntries(view, entryFields, "knownlist")
        ]
      : [];
    const memorizedSpells = [
      ...readCreatureClassSpellListEntries(view, entryFields, ["memorizedlist"]),
      ...readLeveledCreatureClassSpellListEntries(view, entryFields, "memorizedlist")
    ];
    return {
      classId,
      level,
      knownSpellCount: knownSpells.length > 0 ? knownSpells.length : undefined,
      memorizedSpellCount: memorizedSpells.length > 0 ? memorizedSpells.length : undefined,
      knownSpells: knownSpells.length > 0 ? knownSpells : undefined,
      memorizedSpells: memorizedSpells.length > 0 ? memorizedSpells : undefined
    };
  });
}

function readCreatureClassSpellListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  listAliases: readonly string[]
): ParsedAreaCreatureSpellListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, listAliases);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const spellId = readNumberByAliases(view, entryFields, ["spell"]);
    const metaMagic = readNumberByAliases(view, entryFields, ["spellmetamagic"]);
    const flags = readNumberByAliases(view, entryFields, ["spellflags"]);
    return {
      spellId: normalizeListNumber(spellId, 0),
      metaMagic: normalizeAuroraSpellMetaMagic(metaMagic),
      flags: normalizeAuroraSpellFlags(flags)
    };
  });
}

function readLeveledCreatureClassSpellListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  baseAlias: "knownlist" | "memorizedlist"
): ParsedAreaCreatureSpellListEntry[] {
  const entries: ParsedAreaCreatureSpellListEntry[] = [];
  for (let spellLevel = 0; spellLevel < 14; spellLevel += 1) {
    const levelEntries = readCreatureClassSpellListEntries(view, fields, [
      `${baseAlias}${spellLevel}`
    ]);
    for (const entry of levelEntries) {
      entries.push({
        ...entry,
        spellLevel
      });
    }
  }
  return entries;
}

function readCreatureSkillListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureSkillListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["skilllist"]);
  if (structIndices.length === 0 && !findFieldByAliases(fields, ["skilllist"])) {
    return [];
  }
  const entryCount = Math.max(AURORA_DEFAULT_CREATURE_SKILL_COUNT, structIndices.length);
  return Array.from({ length: entryCount }, (_, index) => {
    const structIndex = structIndices[index];
    const entryFields =
      structIndex === undefined ? new Map<string, GffFieldRef>() : view.getStructFields(structIndex);
    const rank = readNumberByAliases(view, entryFields, ["rank"]);
    return {
      skillId: index,
      rank: normalizeListNumber(rank, 0)
    };
  });
}

function readCreatureIdListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  listAliases: readonly string[],
  idAliases: readonly string[]
): ParsedAreaCreatureIdListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, listAliases);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const featId = readNumberByAliases(view, entryFields, idAliases);
    return {
      featId: normalizeListNumber(featId, 0)
    };
  });
}

function readCreatureSpecAbilityListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureSpecAbilityListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["specabilitylist"]);
  return structIndices.map((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const spellId = readNumberByAliases(view, entryFields, ["spell"]);
    const flags = readNumberByAliases(view, entryFields, ["spellflags"]);
    const casterLevel = readNumberByAliases(view, entryFields, ["spellcasterlevel"]);
    return {
      spellId: normalizeListNumber(spellId, 0),
      flags: normalizeAuroraSpellFlags(flags),
      casterLevel: normalizeAuroraSpecialAbilityCasterLevel(casterLevel)
    };
  });
}

function readCreatureInventoryItemListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureInventoryItemListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["itemlist"]);
  return structIndices.flatMap((structIndex, sourceIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const resRef = readStringByAliases(view, entryFields, [
      "inventoryres",
      "templateresref",
      "resref"
    ]);
    if (!resRef) {
      return [];
    }
    const x = readNumberByAliases(view, entryFields, ["reposposx", "repos_posx"]);
    const y = readNumberByAliases(view, entryFields, ["reposposy", "repos_posy"]);
    return [{
      sourceIndex,
      resRef,
      x: normalizeListNumber(x, 0),
      y: normalizeListNumber(y, 0),
      dropable: readBooleanByAliases(view, entryFields, ["dropable", "droppable"]) ?? false,
      pickpocketable: readBooleanByAliases(view, entryFields, ["pickpocketable"]) ?? false
    }];
  });
}

function readPlaceableInventoryItemListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaPlaceableInventoryItemListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, ["itemlist"]);
  return structIndices.flatMap((structIndex, sourceIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const resRef = readStringByAliases(view, entryFields, ["templateresref"]);
    if (!resRef) return [];
    return [{
      sourceIndex,
      resRef,
      x: normalizeListNumber(
        readNumberByAliases(view, entryFields, ["reposposx", "repos_posx"]),
        0
      ) ?? 0,
      y: normalizeListNumber(
        readNumberByAliases(view, entryFields, ["reposposy", "repos_posy"]),
        0
      ) ?? 0
    }];
  });
}

function readItemPropertyListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): Array<{
  propertyName?: number;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
}> {
  const structIndices = readListStructIndicesByAliases(view, fields, ["propertieslist"]);
  return structIndices
    .map((structIndex) => {
      const entryFields = view.getStructFields(structIndex);
      return {
        propertyName: readIntegerByAliases(view, entryFields, ["propertyname"]),
        subtype: readIntegerByAliases(view, entryFields, ["subtype"]),
        costTable: readIntegerByAliases(view, entryFields, ["costtable"]),
        costValue: readIntegerByAliases(view, entryFields, ["costvalue"]),
        param1: readIntegerByAliases(view, entryFields, ["param1"]),
        param1Value: readIntegerByAliases(view, entryFields, ["param1value"]),
        chanceAppear: readIntegerByAliases(view, entryFields, ["chanceappear"])
      };
    })
    .filter((entry) =>
      Object.values(entry).some((value) => Number.isFinite(value ?? Number.NaN))
    );
}

function readCreatureEquipItemListEntries(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaCreatureEquipItemListEntry[] {
  const structIndices = readListStructIndicesByAliases(view, fields, [
    "equipitemlist",
    "equip_itemlist"
  ]);
  return structIndices.flatMap((structIndex) => {
    const entryFields = view.getStructFields(structIndex);
    const resRef = readStringByAliases(view, entryFields, [
      "equippedres",
      "templateresref",
      "resref"
    ]);
    if (!resRef) {
      return [];
    }
    return [{
      resRef,
      slotMask: normalizeListNumber(view.structs[structIndex]?.typeId, undefined),
      dropable: readBooleanByAliases(view, entryFields, ["dropable", "droppable"]) ?? false,
      pickpocketable: readBooleanByAliases(view, entryFields, ["pickpocketable"]) ?? false,
      infinite: readBooleanByAliases(view, entryFields, ["infinite"]) ?? false
    }];
  });
}

function readExactCreatureEquipmentMutationEntries(
  view: GffView,
  creatureStructIndex: number,
): ParsedAreaCreatureEquipItemListEntry[] | undefined {
  const creatureFields = view.getStructFieldEntries(creatureStructIndex);
  if (!creatureFields) return undefined;
  const listMatches = creatureFields.filter(
    (entry) => entry.label.toLowerCase().replaceAll("_", "") === "equipitemlist",
  );
  if (listMatches.length === 0) return [];
  const list = listMatches[0];
  if (
    listMatches.length !== 1
    || list?.label !== "Equip_ItemList"
    || list.field.typeId !== FIELD_TYPE.LIST
  ) {
    return undefined;
  }
  const structIndices = view.readExactListStructIndices(list.field);
  if (
    !structIndices
    || structIndices.length === 0
    || structIndices.length > AREA_CREATURE_EQUIPMENT_SLOT_MASKS.length
  ) {
    return undefined;
  }

  const admittedSlots = new Set<number>(AREA_CREATURE_EQUIPMENT_SLOT_MASKS);
  const usedSlots = new Set<number>();
  const result: ParsedAreaCreatureEquipItemListEntry[] = [];
  for (const [sourceIndex, equipmentStructIndex] of structIndices.entries()) {
    const slotMask = view.structs[equipmentStructIndex]?.typeId;
    if (
      slotMask === undefined
      || !admittedSlots.has(slotMask)
      || usedSlots.has(slotMask)
    ) {
      return undefined;
    }
    const fields = view.getStructFieldEntries(equipmentStructIndex);
    if (!fields) return undefined;
    const resRefMatches = fields.filter(
      (entry) => entry.label.toLowerCase() === "templateresref",
    );
    const resRefField = resRefMatches[0];
    if (
      resRefMatches.length !== 1
      || resRefField?.label !== "TemplateResRef"
      || resRefField.field.typeId !== FIELD_TYPE.RESREF
    ) {
      return undefined;
    }
    const resRef = view.readExactResRef(resRefField.field);
    if (typeof resRef !== "string" || !/^[A-Za-z0-9_]{1,16}$/u.test(resRef)) {
      return undefined;
    }
    if (fields.some((entry) => {
      const label = entry.label.toLowerCase();
      return label === "infinite"
        || label === "droppable"
        || label === "repos_posx"
        || label === "repos_posy"
        || label === "reposposx"
        || label === "reposposy";
    })) {
      return undefined;
    }
    const dropable = readExactCreatureEquipmentTrueOnlyFlag(
      view,
      fields,
      "Dropable",
    );
    const pickpocketable = readExactCreatureEquipmentTrueOnlyFlag(
      view,
      fields,
      "Pickpocketable",
    );
    if (dropable === undefined || pickpocketable === undefined) return undefined;
    usedSlots.add(slotMask);
    result.push({
      sourceIndex,
      resRef,
      slotMask,
      dropable,
      pickpocketable,
    });
  }
  return result;
}

function readExactCreatureEquipmentTrueOnlyFlag(
  view: GffView,
  fields: readonly GffLabeledFieldRef[],
  label: "Dropable" | "Pickpocketable",
): boolean | undefined {
  const matches = fields.filter(
    (entry) => entry.label.toLowerCase() === label.toLowerCase(),
  );
  if (matches.length === 0) return false;
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== label
    || field.field.typeId !== FIELD_TYPE.BYTE
    || view.readNumber(field.field) !== 1
  ) {
    return undefined;
  }
  return true;
}

function parseVisualTransform(
  view: GffView,
  fields: Map<string, GffFieldRef>
): ParsedAreaVisualTransformBlueprint | undefined {
  const transformStructIndices = [
    ...readListStructIndicesByAliases(view, fields, ["vistransformlist"]),
    ...readListStructIndicesByAliases(view, fields, ["visualtransformlist"])
  ];
  const transformStructFieldSets = transformStructIndices
    .map((structIndex) => view.getStructFields(structIndex))
    .filter((entry): entry is Map<string, GffFieldRef> => Boolean(entry));
  const transformFieldsFromList =
    transformStructFieldSets.find(
      (entry) =>
        (readNumberByAliases(view, entry, ["scope"]) ??
          AURORA_VISUAL_TRANSFORM_BASE_SCOPE) === AURORA_VISUAL_TRANSFORM_BASE_SCOPE
    ) ?? transformStructFieldSets[0];
  const visualTransformStructIndex =
    transformFieldsFromList === undefined
      ? view.readStructIndex(findFieldByAliases(fields, ["visualtransform"]))
      : undefined;
  const transformFields =
    transformFieldsFromList !== undefined
      ? transformFieldsFromList
      : visualTransformStructIndex !== undefined
        ? view.getStructFields(visualTransformStructIndex)
        : undefined;

  if (!transformFields) {
    return undefined;
  }

  const transform = {
    scaleX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scalex"]) ?? 1
    ),
    scaleY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scaley"]) ?? 1
    ),
    scaleZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["scalez"]) ?? 1
    ),
    rotateX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatex"]) ?? 0
    ),
    rotateY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatey"]) ?? 0
    ),
    rotateZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["rotatez"]) ?? 0
    ),
    translateX: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatex"]) ?? 0
    ),
    translateY: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatey"]) ?? 0
    ),
    translateZ: clampNumber(
      readVisualTransformControllerValue(view, transformFields, ["translatez"]) ?? 0
    )
  };

  const isDefault =
    transform.scaleX === 1 &&
    transform.scaleY === 1 &&
    transform.scaleZ === 1 &&
    transform.rotateX === 0 &&
    transform.rotateY === 0 &&
    transform.rotateZ === 0 &&
    transform.translateX === 0 &&
    transform.translateY === 0 &&
    transform.translateZ === 0;

  return isDefault ? undefined : transform;
}

function readVisualTransformControllerValue(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  if (field.typeId === FIELD_TYPE.STRUCT) {
    const controllerFields = view.getStructFields(field.dataOrOffset);
    return (
      readNumberByAliases(view, controllerFields, ["valueto"]) ??
      readNumberByAliases(view, controllerFields, ["valuefrom"]) ??
      readNumberByAliases(view, controllerFields, ["value"])
    );
  }
  return view.readNumber(field);
}

function readListStructIndicesByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number[] {
  return view.readListStructIndices(findFieldByAliases(fields, aliases));
}

function normalizeListNumber(
  value: number | undefined,
  fallback: number | undefined
): number | undefined {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return fallback;
  }
  return Math.max(0, Math.trunc(value ?? 0));
}

function normalizeAuroraSpellMetaMagic(value: number | undefined): number {
  return normalizeListNumber(value, AURORA_DEFAULT_SPELL_META_MAGIC) ?? AURORA_DEFAULT_SPELL_META_MAGIC;
}

function normalizeAuroraSpellFlags(value: number | undefined): number {
  const source = normalizeListNumber(value, 0) ?? 0;
  return source | AURORA_SPELL_FLAGS_RUNTIME_BIT;
}

function normalizeAuroraSpecialAbilityCasterLevel(value: number | undefined): number {
  const source =
    normalizeListNumber(value, AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL) ??
    AURORA_DEFAULT_SPECIAL_ABILITY_CASTER_LEVEL;
  return Math.min(source, AURORA_MAX_SPECIAL_ABILITY_CASTER_LEVEL);
}

function parseDoorTransition(
  view: GffView,
  structIndex: number,
  fields: Map<string, GffFieldRef>
): ParsedAreaDoorTransitionBlueprint | undefined {
  const linkedTarget = readStringByAliases(view, fields, ["linkedto"]) ?? "";
  const linkedModule = readStringByAliases(view, fields, ["linkedtomodule"]) ?? "";
  const linkedTag =
    readStringByAliases(view, fields, ["transitiondestination", "transitiondestin"]) ?? "";
  const linkedWaypoint = readStringByAliases(view, fields, ["linkedwaypoint"]) ?? "";
  const loadScreenId = readIntegerByAliases(view, fields, ["loadscreenid", "loadscreen"]);
  const loadScreen =
    readStringByAliases(view, fields, ["loadscreenid", "loadscreen"]) ??
    (loadScreenId === undefined ? "" : String(Math.trunc(loadScreenId)));
  const linkedToFlags = readIntegerByAliases(view, fields, ["linkedtoflags"]);
  const storage = readCanonicalDoorTransitionStorage(view, structIndex);
  const extra: Record<string, string | number | boolean | null> = {};

  if (linkedToFlags !== undefined) {
    extra.linkedToFlags = Math.trunc(linkedToFlags);
  }
  if (loadScreenId !== undefined) {
    extra.loadScreenId = Math.trunc(loadScreenId);
  }

  const hasTransitionPayload =
    linkedTarget.length > 0 ||
    linkedModule.length > 0 ||
    linkedTag.length > 0 ||
    linkedWaypoint.length > 0 ||
    loadScreen.length > 0 ||
    Object.keys(extra).length > 0;

  if (!hasTransitionPayload) {
    return undefined;
  }

  return {
    linkedTarget,
    linkedModule,
    linkedTag,
    linkedWaypoint,
    loadScreen,
    flags: {},
    extra,
    ...(storage ? { storage } : {}),
  };
}

function readCanonicalDoorTransitionStorage(
  view: GffView,
  structIndex: number,
): AreaDoorTransitionStorage | undefined {
  if (view.structs[structIndex]?.typeId !== 8) return undefined;
  const entries = view.getStructFieldEntries(structIndex);
  if (!entries) return undefined;
  const readExact = (label: "LinkedTo" | "LinkedToFlags" | "LoadScreenID", typeId: number) => {
    const matches = entries.filter((entry) => entry.label.toLowerCase() === label.toLowerCase());
    return matches.length === 1 && matches[0]?.label === label && matches[0].field.typeId === typeId
      ? matches[0].field
      : undefined;
  };
  const linkedToField = readExact("LinkedTo", FIELD_TYPE.CEXOSTRING);
  const linkedToFlagsField = readExact("LinkedToFlags", FIELD_TYPE.BYTE);
  const loadScreenIdField = readExact("LoadScreenID", FIELD_TYPE.WORD);
  if (!linkedToField || !linkedToFlagsField || !loadScreenIdField) return undefined;
  const value = {
    linkedTo: view.readExactString(linkedToField),
    linkedToFlags: view.readNumber(linkedToFlagsField),
    loadScreenId: view.readNumber(loadScreenIdField),
  };
  return isAreaDoorTransitionStorage(value) ? Object.freeze(value) : undefined;
}

function parseSoundPositioning(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  fallbackElevation: number
): ParsedAreaSoundPositioningBlueprint {
  const active = readBooleanByAliases(view, fields, ["active"]);
  const continuous = readBooleanByAliases(view, fields, ["continuous"]);
  const looping = readBooleanByAliases(view, fields, ["looping"]);
  const positional = readBooleanByAliases(view, fields, ["positional"]);
  const randomPosition = readBooleanByAliases(view, fields, ["randomposition"]);
  const random = readBooleanByAliases(view, fields, ["random"]);
  const elevation = clampNonNegative(
    readNumberByAliases(view, fields, ["elevation"]) ?? fallbackElevation
  );
  const cutoffDistance = clampNonNegative(
    readNumberByAliases(view, fields, ["maxdistance"]) ?? 10
  );
  const maxVolumeDistance = Math.min(
    clampNonNegative(readNumberByAliases(view, fields, ["mindistance"]) ?? 1),
    cutoffDistance
  );
  const randomRangeWestEast = clampNonNegative(
    readNumberByAliases(view, fields, ["randomrangex", "randomxrange"]) ?? 0
  );
  const randomRangeNorthSouth = clampNonNegative(
    readNumberByAliases(view, fields, ["randomrangey", "randomyrange"]) ?? 0
  );
  const mode =
    positional === false
      ? "everywhere"
      : randomPosition === true || randomRangeWestEast > 0 || randomRangeNorthSouth > 0
        ? "random"
        : "specific";
  const intervalMs = clampNonNegative(
    Math.round(readNumberByAliases(view, fields, ["interval"]) ?? 6000)
  );
  const intervalVariationMs = Math.min(
    clampNonNegative(Math.round(readNumberByAliases(view, fields, ["intervalvrtn"]) ?? 0)),
    intervalMs
  );
  const rawVolume = readNumberByAliases(view, fields, ["volume"]);
  const rawVolumeVariation = readNumberByAliases(view, fields, ["volumevrtn"]);
  const pitchVariation = clampNonNegative(
    readNumberByAliases(view, fields, ["pitchvariation"]) ?? 0
  );
  const priority = clampNonNegative(
    Math.round(readNumberByAliases(view, fields, ["priority"]) ?? 0)
  );
  const hours = readNumberByAliases(view, fields, ["hours"]);
  const times = readNumberByAliases(view, fields, ["times"]);
  const soundList = parseSoundList(view, fields);
  const flags = compactBooleanFlags({
    active,
    continuous,
    looping,
    positional,
    randomPosition,
    random
  });
  const extra: Record<string, string | number | boolean | null> = {};
  if (soundList.length > 0) {
    extra.auroraSoundList = soundList.join("\n");
  }
  if (hours !== undefined) {
    extra.auroraHours = clampNumber(hours);
  }
  if (times !== undefined) {
    extra.auroraTimes = clampNumber(times);
  }

  return {
    mode,
    elevation,
    maxVolumeDistance,
    cutoffDistance,
    randomRangeWestEast: mode === "random" ? randomRangeWestEast : 0,
    randomRangeNorthSouth: mode === "random" ? randomRangeNorthSouth : 0,
    preserve: {
      timeWindow: times === undefined ? "" : String(clampNumber(times)),
      hourMask: hours === undefined ? "" : String(Math.round(hours)),
      active: active ?? true,
      whenToPlay: hours === undefined && times === undefined ? "always" : "hours",
      dayNight: "both",
      playStyle: looping ? "loop" : continuous ? "repeat" : "once",
      playOrder: random ? "random" : "sequential",
      intervalMs,
      intervalVariationMs,
      volume: normalizePercentLike(rawVolume, 1),
      volumeVariation: normalizePercentLike(rawVolumeVariation, 0),
      pitchVariation,
      priority,
      flags,
      extra
    }
  };
}

function parseSoundList(view: GffView, fields: Map<string, GffFieldRef>): string[] {
  const listField = findFieldByAliases(fields, ["sounds"]);
  const structIndices = view.readListStructIndices(listField);
  const sounds: string[] = [];
  for (const structIndex of structIndices) {
    const soundFields = view.getStructFields(structIndex);
    const sound = readStringByAliases(view, soundFields, ["sound", "resref", "soundresref"]);
    if (sound) {
      sounds.push(sound);
    }
  }
  return sounds;
}

function stringifyPlacement(entry: ParsedAreaPlacementBlueprint): string {
  return [
    entry.listKind,
    entry.templateResRef ?? "",
    entry.tag ?? "",
    entry.appearanceType ?? "",
    entry.placeableBasicIdentity ? JSON.stringify(entry.placeableBasicIdentity) : "",
    entry.placeableTrapType ? JSON.stringify(entry.placeableTrapType) : "",
    entry.placeableBodyBag ? JSON.stringify(entry.placeableBodyBag) : "",
    entry.placeablePortraitId ? JSON.stringify(entry.placeablePortraitId) : "",
    entry.placeableFaction ? JSON.stringify(entry.placeableFaction) : "",
    entry.placeableVariables ? JSON.stringify(entry.placeableVariables) : "",
    entry.placeableTemplateResRef ?? "",
    entry.placeableLocalizedStrings ? JSON.stringify(entry.placeableLocalizedStrings) : "",
    entry.creatureTag ? JSON.stringify(entry.creatureTag) : "",
    entry.creatureConversation ? JSON.stringify(entry.creatureConversation) : "",
    entry.creatureInterruptable ? JSON.stringify(entry.creatureInterruptable) : "",
    entry.creatureAdvancedFlags ? JSON.stringify(entry.creatureAdvancedFlags) : "",
    entry.creatureBodyBag ? JSON.stringify(entry.creatureBodyBag) : "",
    entry.creatureDecayTime ? JSON.stringify(entry.creatureDecayTime) : "",
    entry.creatureFaction ? JSON.stringify(entry.creatureFaction) : "",
    entry.creatureTemplateResRef ? JSON.stringify(entry.creatureTemplateResRef) : "",
    entry.creatureSpecialIdentityStrings
      ? JSON.stringify(entry.creatureSpecialIdentityStrings)
      : "",
    entry.creatureScriptResRefs ? JSON.stringify(entry.creatureScriptResRefs) : "",
    entry.creatureAppearance ? JSON.stringify(entry.creatureAppearance) : "",
    entry.creatureGender ? JSON.stringify(entry.creatureGender) : "",
    entry.creaturePerceptionRange ? JSON.stringify(entry.creaturePerceptionRange) : "",
    entry.creatureWalkRate ? JSON.stringify(entry.creatureWalkRate) : "",
    entry.creatureSoundSetFile ? JSON.stringify(entry.creatureSoundSetFile) : "",
    entry.creaturePhenotype ? JSON.stringify(entry.creaturePhenotype) : "",
    entry.creaturePortrait ? JSON.stringify(entry.creaturePortrait) : "",
    entry.creatureChallengeRating ? JSON.stringify(entry.creatureChallengeRating) : "",
    entry.creatureAbilityScores ? JSON.stringify(entry.creatureAbilityScores) : "",
    entry.creatureAppearanceColors ? JSON.stringify(entry.creatureAppearanceColors) : "",
    entry.creatureBodyParts ? JSON.stringify(entry.creatureBodyParts) : "",
    entry.creatureAppendages ? JSON.stringify(entry.creatureAppendages) : "",
    entry.creatureHitPointState ? JSON.stringify(entry.creatureHitPointState) : "",
    entry.creatureNaturalArmorClass ? JSON.stringify(entry.creatureNaturalArmorClass) : "",
    entry.creatureSavingThrowBonuses ? JSON.stringify(entry.creatureSavingThrowBonuses) : "",
    entry.creatureAlignment ? JSON.stringify(entry.creatureAlignment) : "",
    entry.creatureLocalizedStrings ? JSON.stringify(entry.creatureLocalizedStrings) : "",
    entry.itemTag ? JSON.stringify(entry.itemTag) : "",
    entry.triggerTag ? JSON.stringify(entry.triggerTag) : "",
    entry.triggerTemplateResRef ? JSON.stringify(entry.triggerTemplateResRef) : "",
    entry.triggerLocalizedName ? JSON.stringify(entry.triggerLocalizedName) : "",
    entry.triggerScriptResRefs ? JSON.stringify(entry.triggerScriptResRefs) : "",
    entry.triggerTransitionStorage ? JSON.stringify(entry.triggerTransitionStorage) : "",
    entry.triggerCoreProperties ? JSON.stringify(entry.triggerCoreProperties) : "",
    entry.triggerTrapProperties ? JSON.stringify(entry.triggerTrapProperties) : "",
    entry.triggerVariables ? JSON.stringify(entry.triggerVariables) : "",
    entry.encounterTag ? JSON.stringify(entry.encounterTag) : "",
    entry.encounterTemplateResRef ? JSON.stringify(entry.encounterTemplateResRef) : "",
    entry.waypointTag ? JSON.stringify(entry.waypointTag) : "",
    entry.waypointTemplateResRef ? JSON.stringify(entry.waypointTemplateResRef) : "",
    entry.waypointLocalizedName ? JSON.stringify(entry.waypointLocalizedName) : "",
    entry.waypointDescription ? JSON.stringify(entry.waypointDescription) : "",
    entry.waypointMapNote ? JSON.stringify(entry.waypointMapNote) : "",
    entry.encounterActive ? JSON.stringify(entry.encounterActive) : "",
    entry.encounterPlayerOnly ? JSON.stringify(entry.encounterPlayerOnly) : "",
    entry.encounterReset ? JSON.stringify(entry.encounterReset) : "",
    entry.encounterResetTime ? JSON.stringify(entry.encounterResetTime) : "",
    entry.encounterSpawnOption ? JSON.stringify(entry.encounterSpawnOption) : "",
    entry.encounterRespawns ? JSON.stringify(entry.encounterRespawns) : "",
    entry.encounterCreatureCounts ? JSON.stringify(entry.encounterCreatureCounts) : "",
    entry.encounterScriptResRefs ? JSON.stringify(entry.encounterScriptResRefs) : "",
    entry.encounterFaction ? JSON.stringify(entry.encounterFaction) : "",
    entry.encounterDifficulty ? JSON.stringify(entry.encounterDifficulty) : "",
    entry.encounterLocalizedName ? JSON.stringify(entry.encounterLocalizedName) : "",
    entry.encounterVariables ? JSON.stringify(entry.encounterVariables) : "",
    entry.encounterCreatureList ? JSON.stringify(entry.encounterCreatureList) : "",
    entry.itemTemplateResRef ? JSON.stringify(entry.itemTemplateResRef) : "",
    entry.itemInstanceState ? JSON.stringify(entry.itemInstanceState) : "",
    entry.itemLocalizedStrings ? JSON.stringify(entry.itemLocalizedStrings) : "",
    entry.itemVariables ? JSON.stringify(entry.itemVariables) : "",
    entry.storeMetadata?.scriptResRefs
      ? JSON.stringify(entry.storeMetadata.scriptResRefs)
      : "",
    entry.storeMetadata?.commerce ? JSON.stringify(entry.storeMetadata.commerce) : "",
    entry.storeMetadata?.variables ? JSON.stringify(entry.storeMetadata.variables) : "",
    entry.storeRestrictionsRaw ? JSON.stringify(entry.storeRestrictionsRaw) : "",
    entry.storeInventoryRaw ? JSON.stringify(entry.storeInventoryRaw) : "",
    entry.genericType ?? "",
    entry.x,
    entry.y,
    entry.z,
    entry.bearing,
    entry.visualTransform ? JSON.stringify(entry.visualTransform) : "",
    entry.soundPositioning ? JSON.stringify(entry.soundPositioning) : "",
    entry.doorTransition ? JSON.stringify(entry.doorTransition) : ""
  ].join("|");
}

function deriveBearingFromOrientation(
  xOrientation: number | undefined,
  yOrientation: number | undefined
): number | undefined {
  if (!Number.isFinite(xOrientation ?? Number.NaN) || !Number.isFinite(yOrientation ?? Number.NaN)) {
    return undefined;
  }
  if ((xOrientation ?? 0) === 0 && (yOrientation ?? 0) === 0) {
    return undefined;
  }
  const radians = Math.atan2(-(yOrientation ?? 0), xOrientation ?? 0);
  return (radians * 180) / Math.PI;
}

function deriveBearingFromRadians(value: number): number {
  return radiansToDegrees(value);
}

function radiansToDegrees(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeBearing(value: number): number {
  const normalized = ((value % 360) + 360) % 360;
  return clampNumber(normalized);
}

function readNameByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  return readNameInfoByAliases(view, fields, aliases).text;
}

function readNameInfoByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): { text?: string; strRef?: number; entries?: string[] } {
  const field = findFieldByAliases(fields, aliases);
  const loc = view.readLocString(field);
  const strRef = loc && isValidTalkTableStrRef(loc.strRef) ? loc.strRef : undefined;
  const entries = dedupeNameEntries(loc?.entries ?? []);
  if (loc?.text && loc.text.trim().length > 0) {
    return {
      text: sanitizeUtf8(loc.text),
      ...(strRef !== undefined ? { strRef } : {}),
      ...(entries.length > 0 ? { entries } : {})
    };
  }
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return {
      ...(strRef !== undefined ? { strRef } : {}),
      ...(entries.length > 0 ? { entries } : {})
    };
  }
  return {
    text: sanitizeUtf8(value),
    ...(strRef !== undefined ? { strRef } : {}),
    ...(entries.length > 0 ? { entries } : {})
  };
}

function readAlternateLocalizedNameEntry(
  nameInfo: { text?: string; entries?: string[] },
  primaryText: string | undefined
): string | undefined {
  const primaryKey = normalizeLocalizedNameEntryKey(primaryText);
  return nameInfo.entries?.find((entry) => {
    const normalized = normalizeLocalizedNameEntryKey(entry);
    return normalized.length > 0 && normalized !== primaryKey;
  });
}

function dedupeNameEntries(entries: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const entry of entries) {
    const sanitized = sanitizeUtf8(entry);
    const key = normalizeLocalizedNameEntryKey(sanitized);
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(sanitized);
  }
  return output;
}

function normalizeLocalizedNameEntryKey(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function readStringByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readString(field);
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  return sanitizeAscii(value);
}

function readStringIncludingEmptyByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  const value = view.readString(field);
  return value === undefined ? undefined : sanitizeAscii(value);
}

function readResRefIncludingEmptyByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field || field.typeId !== FIELD_TYPE.RESREF) return undefined;
  const value = view.readString(field);
  return value === undefined ? undefined : sanitizeAscii(value);
}

function readExactStringByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): string | undefined {
  const field = findFieldByAliases(fields, aliases);
  return view.readExactString(field);
}

function readNumberByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  const value = view.readNumber(field);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return value;
}

function readByteByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field || field.typeId !== FIELD_TYPE.BYTE) return undefined;
  return view.readNumber(field);
}

function readBooleanByteNumberByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const value = readByteByAliases(view, fields, aliases);
  return value === 0 || value === 1 ? value : undefined;
}

function readIntegerByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const value = readNumberByAliases(view, fields, aliases);
  if (!Number.isFinite(value ?? Number.NaN)) {
    return undefined;
  }
  return Math.trunc(value ?? 0);
}

function readBooleanByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): boolean | undefined {
  const value = readNumberByAliases(view, fields, aliases);
  if (value === undefined) {
    return undefined;
  }
  return value !== 0;
}

function readListCountByAliases(
  view: GffView,
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): number | undefined {
  const field = findFieldByAliases(fields, aliases);
  if (!field) {
    return undefined;
  }
  return view.readListStructIndices(field).length;
}

function findFieldByAliases(
  fields: Map<string, GffFieldRef>,
  aliases: readonly string[]
): GffFieldRef | undefined {
  for (const alias of aliases) {
    const found = fields.get(normalizeLabel(alias));
    if (found) {
      return found;
    }
  }
  return undefined;
}

function parseHeader(bytes: Buffer): GffHeader | null {
  if (bytes.length < GFF_HEADER_SIZE_BYTES) {
    return null;
  }

  const header: GffHeader = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
    listIndicesOffset: bytes.readUInt32LE(48),
    listIndicesCount: bytes.readUInt32LE(52)
  };

  if (
    !isRangeWithinBuffer(bytes, header.structOffset, header.structCount * GFF_STRUCT_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldOffset, header.fieldCount * GFF_FIELD_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.labelOffset, header.labelCount * GFF_LABEL_ENTRY_SIZE_BYTES) ||
    !isRangeWithinBuffer(bytes, header.fieldDataOffset, header.fieldDataCount) ||
    !isRangeWithinBuffer(bytes, header.fieldIndicesOffset, header.fieldIndicesCount) ||
    !isRangeWithinBuffer(bytes, header.listIndicesOffset, header.listIndicesCount)
  ) {
    return null;
  }

  return header;
}

function parseLabels(bytes: Buffer, header: GffHeader): string[] {
  const labels: string[] = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    const offset = header.labelOffset + index * GFF_LABEL_ENTRY_SIZE_BYTES;
    const raw = bytes.subarray(offset, offset + GFF_LABEL_ENTRY_SIZE_BYTES);
    const nullByteIndex = raw.indexOf(0);
    const usedLength = nullByteIndex >= 0 ? nullByteIndex : raw.length;
    labels.push(raw.subarray(0, usedLength).toString("ascii").trim());
  }
  return labels;
}

function parseStructs(bytes: Buffer, header: GffHeader): GffStructEntry[] {
  const structs: GffStructEntry[] = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * GFF_STRUCT_ENTRY_SIZE_BYTES;
    structs.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }
  return structs;
}

function resolveStructFieldIndices(
  bytes: Buffer,
  header: GffHeader,
  entry: GffStructEntry
): number[] | null {
  if (entry.fieldCount === 0) {
    return [];
  }

  if (entry.fieldCount === 1) {
    return [entry.dataOrOffset];
  }

  const start = header.fieldIndicesOffset + entry.dataOrOffset;
  const expectedSize = entry.fieldCount * 4;
  if (!isRangeWithinBuffer(bytes, start, expectedSize)) {
    return null;
  }

  const indices: number[] = [];
  for (let index = 0; index < entry.fieldCount; index += 1) {
    indices.push(bytes.readUInt32LE(start + index * 4));
  }
  return indices;
}

function readCExoString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const value = readCExoStringExact(bytes, header, dataOrOffset);
  return value === undefined ? undefined : sanitizeUtf8(value);
}

function readCExoStringExact(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 4)) {
    return undefined;
  }

  const length = bytes.readUInt32LE(offset);
  const valueOffset = offset + 4;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return bytes.subarray(valueOffset, valueOffset + length).toString("utf-8");
}

function readResRef(bytes: Buffer, header: GffHeader, dataOrOffset: number): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 1)) {
    return undefined;
  }

  const length = bytes.readUInt8(offset);
  const valueOffset = offset + 1;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) {
    return undefined;
  }

  return sanitizeAscii(bytes.subarray(valueOffset, valueOffset + length).toString("ascii"));
}

function readResRefExact(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number,
): string | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 1)) return undefined;
  const length = bytes.readUInt8(offset);
  const valueOffset = offset + 1;
  if (!isRangeWithinBuffer(bytes, valueOffset, length)) return undefined;
  return bytes.subarray(valueOffset, valueOffset + length).toString("ascii");
}

function readCExoLocString(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number
): ParsedCExoLocString | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinBuffer(bytes, offset, 12)) {
    return undefined;
  }

  const totalSize = bytes.readUInt32LE(offset);
  const strRef = bytes.readUInt32LE(offset + 4);
  const stringCount = bytes.readUInt32LE(offset + 8);
  if (!isRangeWithinBuffer(bytes, offset + 12, Math.max(totalSize - 8, 0))) {
    return undefined;
  }

  let cursor = offset + 12;
  const entries: string[] = [];
  for (let index = 0; index < stringCount; index += 1) {
    if (!isRangeWithinBuffer(bytes, cursor, 8)) {
      break;
    }
    cursor += 4;
    const textLength = bytes.readUInt32LE(cursor);
    cursor += 4;
    if (!isRangeWithinBuffer(bytes, cursor, textLength)) {
      break;
    }
    const text = sanitizeUtf8(bytes.subarray(cursor, cursor + textLength).toString("utf-8"));
    cursor += textLength;
    if (text.length > 0) {
      entries.push(text);
    }
  }

  return {
    strRef,
    text: entries[0] ?? "",
    entries
  };
}

function readExactCExoLocStringStorage(
  bytes: Buffer,
  header: GffHeader,
  dataOrOffset: number,
): Extract<AreaLocalizedStringStorage, { present: true }> | undefined {
  const offset = header.fieldDataOffset + dataOrOffset;
  if (!isRangeWithinFieldData(bytes, header, offset, 12)) return undefined;

  const totalSize = bytes.readUInt32LE(offset);
  if (!isRangeWithinFieldData(bytes, header, offset, totalSize + 4)) {
    return undefined;
  }
  const end = offset + totalSize + 4;
  const strRef = bytes.readUInt32LE(offset + 4);
  const count = bytes.readUInt32LE(offset + 8);
  if (count > MAX_AREA_LOCALIZED_STRING_ENTRIES) return undefined;

  const entries: Array<{ languageId: number; textBytesBase64: string }> = [];
  let cursor = offset + 12;
  let totalTextBytes = 0;
  for (let index = 0; index < count; index += 1) {
    if (cursor + 8 > end) return undefined;
    const languageId = bytes.readUInt32LE(cursor);
    const textLength = bytes.readUInt32LE(cursor + 4);
    cursor += 8;
    if (
      textLength > MAX_AREA_LOCALIZED_STRING_ENTRY_BYTES ||
      totalTextBytes + textLength > MAX_AREA_LOCALIZED_STRING_TOTAL_TEXT_BYTES
    ) {
      return undefined;
    }
    entries.push({
      languageId,
      textBytesBase64: bytes.subarray(cursor, cursor + textLength).toString("base64"),
    });
    totalTextBytes += textLength;
    cursor += textLength;
  }
  if (cursor !== end) return undefined;
  return { present: true, strRef, entries };
}

function isRangeWithinFieldData(
  bytes: Buffer,
  header: GffHeader,
  offset: number,
  length: number,
): boolean {
  const fieldDataEnd = header.fieldDataOffset + header.fieldDataCount;
  return isRangeWithinBuffer(bytes, offset, length) && offset + length <= fieldDataEnd;
}

function isRangeWithinBuffer(bytes: Buffer, offset: number, length: number): boolean {
  if (!Number.isFinite(offset) || !Number.isFinite(length)) {
    return false;
  }
  if (offset < 0 || length < 0) {
    return false;
  }
  if (offset > bytes.length) {
    return false;
  }
  if (offset + length > bytes.length) {
    return false;
  }
  return true;
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function sanitizeAscii(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function sanitizeUtf8(value: string): string {
  return value.replace(/\0/gu, "").trim();
}

function isValidTalkTableStrRef(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value !== 0xffffffff;
}

function clampNumber(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Number(value.toFixed(4));
}

function clampNonNegative(value: number): number {
  return Math.max(0, clampNumber(value));
}

function normalizePercentLike(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value ?? Number.NaN)) {
    return fallback;
  }
  const numeric = clampNonNegative(value ?? fallback);
  return numeric > 1 ? Math.min(numeric / 100, 1) : Math.min(numeric, 1);
}

function compactBooleanFlags(
  flags: Record<string, boolean | undefined>
): Record<string, boolean> {
  const output: Record<string, boolean> = {};
  Object.entries(flags).forEach(([key, value]) => {
    if (typeof value === "boolean") {
      output[key] = value;
    }
  });
  return output;
}

export const __auroraGffAreaParserInternals = {
  deriveBearingFromRadians,
  deriveBearingFromOrientation,
  radiansToDegrees,
  normalizeBearing,
  normalizeTileOrientation,
  normalizeLabel,
  sanitizeAscii,
  sanitizeUtf8,
  isRangeWithinBuffer,
  normalizePercentLike
} as const;
