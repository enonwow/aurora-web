
import type { AuroraAreaVfxCollisionContract } from "../../../common/aurora/vfx/aurora-area-vfx-collision.types";
import type { AuroraWorldTimerContract } from "../../../common/aurora/material/aurora-worldtimer.types";
import type { AreaPlaceableLocalizedStrings } from "./area-placeable-localized-strings";
import type { AreaEventScripts } from "./area-event-scripts";
import type { AreaBasicIdentity } from "./area-basic-identity";
import type { AreaAdvancedFlags } from "./area-advanced-flags";
import type { AreaModuleStartLocation } from "./area-module-start-location";
import type { AreaPlaceableVariableProvenance } from "./area-placeable-variable-table";
import type { AreaCreatureVariableProvenance } from "./area-creature-variable-table";
import type { AreaEncounterVariableProvenance } from "./area-encounter-variable-table";
import type { AreaWaypointVariableProvenance } from "./area-waypoint-variable-table";
import type { AreaEncounterCreatureListProvenance } from
  "./area-encounter-creature-single-spawn";
import type { AreaEncounterSpawnPointListProvenance } from
  "./area-encounter-spawn-point-list";
import type { AreaDoorTransitionStorage } from "./area-door-transition-storage";
import type { AreaVariableProvenance } from "./area-variable-table";
import type { AreaObjectPolygonGeometry } from "./area-object-polygon-geometry";
import type { AreaSoundIntervalVariationStorage } from "./area-sound-interval-variation-storage";
import type { AreaSoundVolumeStorage } from "./area-sound-volume-storage";
import type { AreaSoundActiveStorage } from "./area-sound-active-storage";
import type { AreaSoundPlayOrderStorage } from "./area-sound-play-order-storage";
import type { AreaSoundPlayStyleStorage } from "./area-sound-play-style-storage";
import type { AreaSoundPlaybackStorage } from "./area-sound-playback-storage";
import type { AreaSoundProfileStorage } from "./area-sound-profile-storage";
import type { AreaSoundScheduleStorage } from "./area-sound-schedule-storage";
import type { AreaCreatureTagStorage } from "./area-creature-tag";
import type { AreaCreatureConversationStorage } from "./area-creature-conversation";
import type { AreaCreatureInterruptableStorage } from "./area-creature-interruptable";
import type { AreaCreatureAppearanceStorage } from "./area-creature-appearance";
import type { AreaCreatureGenderStorage } from "./area-creature-gender";
import type { AreaCreaturePerceptionRangeStorage } from "./area-creature-perception-range";
import type { AreaCreatureWalkRateStorage } from "./area-creature-walk-rate";
import type { AreaCreatureSoundSetFileStorage } from "./area-creature-sound-set-file";
import type { AreaCreatureStartingPackageStorage } from "./area-creature-starting-package";
import type { AreaCreatureSkillListStorage } from "./area-creature-skill-list";
import type { AreaCreatureFeatListStorage } from "./area-creature-feat-list";
import type { AreaCreatureSpecialAbilityListStorage } from
  "./area-creature-special-ability-list";
import type { AreaCreatureClassLevelState } from "./area-creature-class-levels";
import type { AreaCreatureClassIdentityState } from "./area-creature-class-identity";
import type { AreaCreaturePhenotypeStorage } from "./area-creature-phenotype";
import type { AreaCreaturePortraitStorage } from "./area-creature-portrait";
import type { AreaCreatureChallengeRatingStorage } from "./area-creature-challenge-rating";
import type { AreaCreatureAbilityScoresStorage } from "./area-creature-ability-scores";
import type { AreaCreatureAppearanceColorsStorage } from "./area-creature-appearance-colors";
import type { AreaCreatureBodyPartsStorage } from "./area-creature-body-parts";
import type { AreaCreatureAppendagesStorage } from "./area-creature-appendages";
import type { AreaCreatureHitPointState } from "./area-creature-hit-points";
import type { AreaCreatureNaturalArmorClassStorage } from "./area-creature-natural-armor-class";
import type { AreaCreatureSavingThrowBonusesStorage } from "./area-creature-saving-throw-bonuses";
import type { AreaCreatureAlignmentStorage } from "./area-creature-alignment";
import type { AreaCreatureAdvancedFlagsStorage } from "./area-creature-advanced-flags";
import type {
  AreaCreatureBodyBagStorage,
  AreaCreatureDecayTimeStorage,
} from "./area-creature-death-remains";
import type { AreaCreatureFactionStorage } from "./area-creature-faction";
import type { AreaCreatureTemplateResRefStorage } from "./area-creature-template-resref";
import type { AreaCreatureSpecialIdentityStringsStorage } from "./area-creature-special-identity-strings";
import type { AreaCreatureScriptResRefsStorage } from "./area-creature-script-resrefs";
import type { AreaCreatureNameLocalizedStrings } from "./area-creature-localized-strings";
import type { AreaItemInstanceStateStorage } from "./area-item-instance-state";
import type { AreaItemTagStorage } from "./area-item-tag";
import type { AreaTriggerTagStorage } from "./area-trigger-tag";
import type { AreaTriggerTemplateResRefStorage } from "./area-trigger-template-resref";
import type { AreaTriggerLocalizedNameStorage } from "./area-trigger-localized-name";
import type { AreaTriggerScriptResRefsStorage } from "./area-trigger-script-resrefs";
import type { AreaTriggerTransitionStorage } from "./area-trigger-transition-storage";
import type { AreaEncounterTagStorage } from "./area-encounter-tag";
import type { AreaEncounterTemplateResRefStorage } from "./area-encounter-template-resref";
import type { AreaWaypointTagStorage } from "./area-waypoint-tag";
import type { AreaWaypointTemplateResRefStorage } from "./area-waypoint-template-resref";
import type { AreaWaypointLocalizedNameStorage } from "./area-waypoint-localized-name";
import type { AreaWaypointDescriptionStorage } from "./area-waypoint-description";
import type { AreaWaypointMapNoteStorage } from "./area-waypoint-map-note";
import type { AreaWaypointAppearanceProvenance } from "./area-waypoint-appearance";
import type { AreaEncounterActiveStorage } from "./area-encounter-active";
import type { AreaEncounterPlayerOnlyStorage } from "./area-encounter-player-only";
import type { AreaEncounterResetStorage } from "./area-encounter-reset";
import type { AreaEncounterResetTimeStorage } from "./area-encounter-reset-time";
import type { AreaEncounterSpawnOptionStorage } from "./area-encounter-spawn-option";
import type { AreaEncounterRespawnsStorage } from "./area-encounter-respawns";
import type { AreaEncounterCreatureCountStorage } from "./area-encounter-creature-counts";
import type { AreaEncounterScriptResRefsStorage } from "./area-encounter-script-resrefs";
import type { AreaEncounterFactionStorage } from "./area-encounter-faction";
import type { AreaEncounterDifficultyStorage } from "./area-encounter-difficulty";
import type { AreaEncounterLocalizedNameStorage } from "./area-encounter-localized-name";
import type { AreaItemTemplateResRefStorage } from "./area-item-template-resref";
import type { AreaItemLocalizedStrings } from "./area-item-localized-strings";
import type { AreaItemVariableProvenance } from "./area-item-variable-table";
import type { AreaItemPropertyListProvenance } from "./area-item-property-list";
import type { ExistingAreaItemBaseAppearanceProvenance } from "./area-item-base-appearance";
import type { AreaItemInventorySourceEntry } from "./area-item-inventory";
import type { AreaItemVisualTransformStorage } from "./area-item-visual-transform";
import type { AreaStoreCommerceValue } from "./area-store-commerce";
import type { AreaStoreScriptResRefsValue } from "./area-store-script-resrefs";
import type { AreaStoreVariableProvenance } from "./area-store-variable-table";
import type { ExistingAreaStoreRestrictionsProvenance } from "./area-store-restrictions";
import type { ExistingAreaStoreInventoryProvenance } from "./area-store-inventory";

export type AreaObjectKind =
  | "placeable"
  | "door"
  | "creature"
  | "encounter"
  | "item"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";

export interface AreaStoreMetadata {
  readonly editorComment?: string;
  readonly commerce?: AreaStoreCommerceValue;
  readonly scriptResRefs?: AreaStoreScriptResRefsValue;
  readonly variables?: AreaStoreVariableProvenance;
  readonly restrictions?: ExistingAreaStoreRestrictionsProvenance;
  readonly inventory?: ExistingAreaStoreInventoryProvenance;
}
export type AreaDeliveryMode = "proxy" | "direct";
export type AreaSoundPositioningMode = "everywhere" | "random" | "specific";
export type AreaSoundWhenToPlay = "always" | "dayNight" | "hours";
export type AreaSoundDayNight = "both" | "day" | "night";
export type AreaSoundPlayStyle = "once" | "repeat" | "loop";
export type AreaSoundPlayOrder = "sequential" | "random";
export type AreaPreservePrimitive = string | number | boolean | null;
export type AreaObjectCreatureMetadataPrimitive = string | number | boolean;
export type AreaObjectItemMetadataPrimitive = string | number | boolean;

export interface AreaObjectSoundPositioningPreservePayload {
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: AreaSoundWhenToPlay;
  dayNight?: AreaSoundDayNight;
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: AreaSoundPlayStyle;
  playOrder?: AreaSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, AreaPreservePrimitive>;
}

export interface AreaObjectSoundPositioning {
  mode: AreaSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve?: AreaObjectSoundPositioningPreservePayload;
}

export interface AreaObjectDoorTransition {
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  extra: Record<string, AreaPreservePrimitive>;
  storage?: AreaDoorTransitionStorage;
}

export interface AreaObjectVisualTransform {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  yaw: number;
  roll: number;
}

export type AreaPlaceableBasicIdentityTag =
  | { present: false }
  | { present: true; value: string };

export interface AreaPlaceableBasicIdentityTable {
  resourceName: "placeables.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
  rowIndex: number;
}

export type AreaPlaceableBasicIdentityAppearance =
  | { present: false }
  | {
      present: true;
      nativeType: "dword";
      value: number;
      table?: AreaPlaceableBasicIdentityTable;
    }
  | {
      present: true;
      nativeType: "byte";
      value: number;
    };

export interface AreaPlaceableBasicIdentity {
  tag: AreaPlaceableBasicIdentityTag;
  appearance: AreaPlaceableBasicIdentityAppearance;
}

export type AreaPlaceableTrapTypeStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };

export interface AreaPlaceableTrapTypeTableDescriptor {
  resourceName: "traps.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaPlaceableTrapTypeRow {
  rowIndex: number;
  label?: string;
  trapNameStrRef?: number;
  setDc: number;
  detectDcMod: number;
  disarmDcMod: number;
  displayName: string;
  displaySource: "strref" | "label" | "row_index";
}

export interface AreaPlaceableTrapTypeCatalog {
  descriptor: AreaPlaceableTrapTypeTableDescriptor;
  rows: AreaPlaceableTrapTypeRow[];
}

export type AreaPlaceableBodyBagStorage =
  | { present: false }
  | { present: true; nativeType: "byte"; value: number };

export type AreaPlaceablePortraitIdStorage =
  | { present: false }
  | { present: true; nativeType: "word"; value: number };

export type AreaPlaceableFactionStorage =
  | { present: false }
  | { present: true; nativeType: "dword"; value: number };

export interface AreaPlaceableBodyBagTableDescriptor {
  resourceName: "bodybag.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaPlaceableBodyBagRow {
  rowIndex: number;
  label?: string;
  nameStrRef: number;
  displayName: string;
  displaySource: "strref" | "label" | "row_index";
}

export interface AreaPlaceableBodyBagCatalog {
  descriptor: AreaPlaceableBodyBagTableDescriptor;
  rows: AreaPlaceableBodyBagRow[];
}

export interface AreaPlaceablePortraitTableDescriptor {
  resourceName: "portraits.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface AreaPlaceablePortraitRow {
  rowIndex: number;
  baseResRef: string;
}

export interface AreaPlaceablePortraitCatalog {
  descriptor: AreaPlaceablePortraitTableDescriptor;
  rows: AreaPlaceablePortraitRow[];
}

export interface AreaPlaceableFactionCatalogDescriptor {
  resourceName: "repute.fac";
  sourceObjectKey: string;
  sha256: string;
  sizeBytes: number;
  factionCount: number;
}

export interface AreaPlaceableFactionRow {
  factionId: number;
  name: string;
  parentFactionId: number;
  isGlobal: boolean;
}

export interface AreaPlaceableFactionCatalog {
  descriptor: AreaPlaceableFactionCatalogDescriptor;
  rows: AreaPlaceableFactionRow[];
}

export interface AreaObjectPlacement {
  objectId: string;
  sourceIndex?: number;
  kind: AreaObjectKind;
  templateId: string;
  resRef?: string;
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
  placeableMetadata?: Record<string, AreaObjectItemMetadataPrimitive>;
  creatureTag?: AreaCreatureTagStorage;
  creatureConversation?: AreaCreatureConversationStorage;
  creatureInterruptable?: AreaCreatureInterruptableStorage;
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
  creatureAdvancedFlags?: AreaCreatureAdvancedFlagsStorage;
  creatureBodyBag?: AreaCreatureBodyBagStorage;
  creatureDecayTime?: AreaCreatureDecayTimeStorage;
  creatureFaction?: AreaCreatureFactionStorage;
  creatureTemplateResRef?: AreaCreatureTemplateResRefStorage;
  creatureSpecialIdentityStrings?: AreaCreatureSpecialIdentityStringsStorage;
  creatureScriptResRefs?: AreaCreatureScriptResRefsStorage;
  creatureLocalizedStrings?: AreaCreatureNameLocalizedStrings;
  creatureMetadata?: Record<string, AreaObjectCreatureMetadataPrimitive>;
  itemTag?: AreaItemTagStorage;
  triggerTag?: AreaTriggerTagStorage;
  triggerTemplateResRef?: AreaTriggerTemplateResRefStorage;
  triggerLocalizedName?: AreaTriggerLocalizedNameStorage;
  triggerScriptResRefs?: AreaTriggerScriptResRefsStorage;
  triggerTransitionStorage?: AreaTriggerTransitionStorage;
  triggerMetadata?: Record<string, AreaObjectItemMetadataPrimitive>;
  encounterTag?: AreaEncounterTagStorage;
  encounterTemplateResRef?: AreaEncounterTemplateResRefStorage;
  waypointTag?: AreaWaypointTagStorage;
  waypointTemplateResRef?: AreaWaypointTemplateResRefStorage;
  waypointLocalizedName?: AreaWaypointLocalizedNameStorage;
  waypointDescription?: AreaWaypointDescriptionStorage;
  waypointMapNote?: AreaWaypointMapNoteStorage;
  waypointAppearance?: AreaWaypointAppearanceProvenance;
  waypointVariables?: AreaWaypointVariableProvenance;
  waypointMetadata?: Record<string, AreaObjectItemMetadataPrimitive>;
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
  encounterMetadata?: Record<string, AreaObjectItemMetadataPrimitive>;
  itemTemplateResRef?: AreaItemTemplateResRefStorage;
  itemInstanceState?: AreaItemInstanceStateStorage;
  itemLocalizedStrings?: AreaItemLocalizedStrings;
  itemVariables?: AreaItemVariableProvenance;
  itemPropertyList?: AreaItemPropertyListProvenance;
  itemBaseAppearance?: ExistingAreaItemBaseAppearanceProvenance;
  itemInventoryItems?: readonly AreaItemInventorySourceEntry[];
  itemVisualTransform?: AreaItemVisualTransformStorage;
  itemMetadata?: Record<string, AreaObjectItemMetadataPrimitive>;
  storeMetadata?: AreaStoreMetadata;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform?: AreaObjectVisualTransform;
  soundPositioning?: AreaObjectSoundPositioning;
  soundIntervalVariation?: AreaSoundIntervalVariationStorage;
  soundVolume?: AreaSoundVolumeStorage;
  soundActive?: AreaSoundActiveStorage;
  soundPlayOrder?: AreaSoundPlayOrderStorage;
  soundPlayStyle?: AreaSoundPlayStyleStorage;
  soundPlayback?: AreaSoundPlaybackStorage;
  soundProfile?: AreaSoundProfileStorage;
  soundSchedule?: AreaSoundScheduleStorage;
  doorTransition?: AreaObjectDoorTransition;
  polygonGeometry?: AreaObjectPolygonGeometry;
}

export interface AreaObjectCounts {
  placeables: number;
  doors: number;
  creatures: number;
  encounters: number;
  items: number;
  sounds: number;
  stores: number;
  triggers: number;
  waypoints: number;
  total: number;
}

export interface AreaTileLightColor {
  rowId: number;
  red?: number;
  green?: number;
  blue?: number;
  sourceKey?: string;
  sourceAnimationName?: string;
  sourceModelFileName?: string;
  sourceModelHash?: string;
  sourceMultiplier?: number;
  sourceMultiplierSource?: string;
  sourceProofStatus?: string;
  sourceNode?: AreaTileSourceLightNode;
  nativeNode?: AreaTileNativeLightNode;
}

export type AreaTileSourceLightNode =
  | {
      status: "source-node-resolved";
      slotIndex: 1 | 2;
      sourceNodeCount: number;
      name: string;
      position: [number, number, number];
      coordinateSpace: "model-local-aurora-z-up";
      sourceModelFileName: string;
      sourceModelObjectKey: string;
      sourceModelHash: string;
      proofStatus: "source-backed-tile-mdl-source-light-slot-count";
    }
  | {
      status: "source-node-absent-by-aurora-slot-count";
      slotIndex: 1 | 2;
      sourceNodeCount: number;
      sourceModelFileName: string;
      sourceModelObjectKey: string;
      sourceModelHash: string;
      proofStatus: "source-backed-tile-mdl-source-light-slot-count";
    };

export interface AreaTileNativeLightNode {
  status: "main-native-node-resolved";
  name: string;
  position: [number, number, number];
  coordinateSpace: "model-local-aurora-z-up";
  radius: number;
  multiplier: number;
  lightPriority?: number;
  ambientOnly?: boolean;
  dynamicType?: number;
  affectDynamic?: boolean;
  shadow?: boolean;
  sourceModelFileName: string;
  sourceModelObjectKey: string;
  sourceModelHash: string;
  proofStatus: "source-backed-tile-mdl-native-main-light";
}

export interface AreaTileInstance {
  tileInstanceId: string;
  areaId: string;
  tilesetResRef: string;
  row: number;
  col: number;
  tileIndex: number;
  tileId?: number;
  modelResRef?: string;
  modelSource?: "are-tile-list" | "set-tile-section";
  imageMap2D?: string;
  orientation?: number;
  tilesetOrientation?: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  mainLight1Color?: AreaTileLightColor;
  mainLight2Color?: AreaTileLightColor;
  sourceLight1Color?: AreaTileLightColor;
  sourceLight2Color?: AreaTileLightColor;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
  pathNode?: string;
  visibilityNode?: string;
  visibilityOrientation?: number;
  doorVisibilityNode?: string;
  doorVisibilityOrientation?: number;
  edges?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  cornerHeights?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  height?: number;
  source: "are-tile-list";
  fallbackReason?: string;
}

export type AreaGlobalLightingFieldName =
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

export interface AreaGlobalLightingField {
  field: AreaGlobalLightingFieldName;
  value: number;
}

export interface AreaGlobalLighting {
  source: "are-root-fields";
  fields: AreaGlobalLightingField[];
}

export interface AreaSoundBindingKeys {
  areaKey: "GI_sound_area";
  randomKey: "GI_sound_rndm";
  positionalKey: "GI_sound_pos";
}

export interface AreaSoundReference {
  soundId: string;
  resref: string;
  category: "ambient" | "music" | "effect";
  playbackMode: "looping" | "continuous" | "random" | "interval";
  ambientOnly: boolean;
}

export interface AreaSoundscape {
  bindingKeys: AreaSoundBindingKeys;
  area: AreaSoundReference[];
  random: AreaSoundReference[];
  positional: AreaSoundReference[];
}

export interface AreaSourceResourceDigests {
  areSha256: string;
  gitSha256?: string;
  gicSha256?: string;
  ifoSha256?: string;
}

export interface AreaRecord {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  comments?: string;
  eventScripts?: AreaEventScripts;
  basicIdentity?: AreaBasicIdentity;
  advancedFlags?: AreaAdvancedFlags;
  visualEnvironment?: import("./area-visual-environment").AreaVisualEnvironment;
  visualEnvironmentScalarControls?: import("./area-visual-environment-scalar-controls").AreaVisualEnvironmentScalarControls;
  visualEnvironmentCatalogSelection?: import("./area-visual-environment-catalog-selection").AreaVisualEnvironmentCatalogSelection;
  variables?: AreaVariableProvenance;
  audioEnvironment?: import("./area-audio-environment").AreaAudioEnvironment;
  audioEnvironmentCatalogs?: import("../../catalog/domain/effective-area-audio-two-da").EffectiveAreaAudioCatalogBundle;
  visualEnvironmentCatalogs?: import("../../catalog/domain/effective-area-visual-environment-two-da").EffectiveAreaVisualEnvironmentCatalogBundle;
  loadingScreenCatalog?: import("../../catalog/domain/effective-area-loading-screen-two-da").EffectiveAreaLoadingScreenCatalog;
  encounterDifficultyCatalog?: import("../../catalog/domain/effective-area-encounter-difficulty-two-da")
    .EffectiveAreaEncounterDifficultyCatalog;
  moduleStartLocation?: AreaModuleStartLocation;
  moduleStartLocationTargets?: readonly string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  textureAtlasObjectKey: string;
  textureAtlasContentType: string;
  textureAtlasSizeBytes: number;
  textureAtlasEtag?: string;
  textureAtlasFingerprint: string;
  tileSet?: string;
  tiles?: AreaTileInstance[];
  auroraVfxCollision?: AuroraAreaVfxCollisionContract;
  auroraWorldTimer?: AuroraWorldTimerContract;
  lighting?: AreaGlobalLighting;
  placeableTrapTypeCatalog?: AreaPlaceableTrapTypeCatalog;
  placeableBodyBagCatalog?: AreaPlaceableBodyBagCatalog;
  placeablePortraitCatalog?: AreaPlaceablePortraitCatalog;
  creaturePortraitCatalog?: import("../../catalog/domain/effective-creature-portraits-two-da")
    .EffectiveCreaturePortraitsTwoDaTable;
  itemBaseItemCatalog?: import("../../catalog/domain/effective-item-base-items-two-da")
    .EffectiveItemBaseItemsTwoDaTable;
  placeableFactionCatalog?: AreaPlaceableFactionCatalog;
  objects: AreaObjectPlacement[];
  soundscape: AreaSoundscape;
  sourceResources?: AreaSourceResourceDigests;
  updatedAt: string;
}

export interface AreaListItem {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlasId: string;
  objectCounts: AreaObjectCounts;
  updatedAt: string;
}

export interface AreaListQuery {
  query?: string;
  biome?: string;
  tag?: string;
  benchmark?: boolean;
  limit: number;
  offset: number;
}

export interface AreaListResult {
  items: AreaListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface AreaProcessQuery {
  areaId: string;
  bypassCache: boolean;
}

export interface AreaProcessingResult {
  areaId: string;
  name: string;
  biome: string;
  width: number;
  height: number;
  tags: string[];
  comments?: string;
  eventScripts?: AreaEventScripts;
  basicIdentity?: AreaBasicIdentity;
  advancedFlags?: AreaAdvancedFlags;
  visualEnvironment?: import("./area-visual-environment").AreaVisualEnvironment;
  visualEnvironmentScalarControls?: import("./area-visual-environment-scalar-controls").AreaVisualEnvironmentScalarControls;
  visualEnvironmentCatalogSelection?: import("./area-visual-environment-catalog-selection").AreaVisualEnvironmentCatalogSelection;
  variables?: AreaVariableProvenance;
  audioEnvironment?: import("./area-audio-environment").AreaAudioEnvironment;
  audioEnvironmentCatalogs?: import("../../catalog/domain/effective-area-audio-two-da").EffectiveAreaAudioCatalogBundle;
  visualEnvironmentCatalogs?: import("../../catalog/domain/effective-area-visual-environment-two-da").EffectiveAreaVisualEnvironmentCatalogBundle;
  loadingScreenCatalog?: import("../../catalog/domain/effective-area-loading-screen-two-da").EffectiveAreaLoadingScreenCatalog;
  encounterDifficultyCatalog?: import("../../catalog/domain/effective-area-encounter-difficulty-two-da")
    .EffectiveAreaEncounterDifficultyCatalog;
  moduleStartLocation?: AreaModuleStartLocation;
  moduleStartLocationTargets?: readonly string[];
  benchmark: boolean;
  previewImageUrl: string;
  textureAtlas: {
    atlasId: string;
    cacheKey: string;
    strategy: "blob-cache";
    objectKey?: string;
    contentType?: string;
    sizeBytes?: number;
    etag?: string;
  };
  tileSet?: string;
  tiles?: AreaTileInstance[];
  auroraVfxCollision?: AuroraAreaVfxCollisionContract;
  auroraWorldTimer?: AuroraWorldTimerContract;
  lighting?: AreaGlobalLighting;
  placeableTrapTypeCatalog?: AreaPlaceableTrapTypeCatalog;
  placeableBodyBagCatalog?: AreaPlaceableBodyBagCatalog;
  placeablePortraitCatalog?: AreaPlaceablePortraitCatalog;
  creaturePortraitCatalog?: import("../../catalog/domain/effective-creature-portraits-two-da")
    .EffectiveCreaturePortraitsTwoDaTable;
  itemBaseItemCatalog?: import("../../catalog/domain/effective-item-base-items-two-da")
    .EffectiveItemBaseItemsTwoDaTable;
  placeableFactionCatalog?: AreaPlaceableFactionCatalog;
  soundscape: AreaSoundscape;
  sourceResources?: AreaSourceResourceDigests;
  composition: AreaObjectCounts;
  objects: AreaObjectPlacement[];
  updatedAt: string;
  processedAt: string;
}
