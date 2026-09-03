import type { WalkmeshDomainModel } from "./domain/walkmesh";
import type { AuroraAreaEditingState, AuroraAreaTilesetDefinition } from "./domain/auroraAreaEditing";
import type { AreaAudioEnvironment } from "../areas/domain/areaAudioEnvironment";
import type { AreaVisualEnvironment } from "../areas/domain/areaVisualEnvironment";
import type { AreaVisualEnvironmentScalarControls } from "../areas/domain/areaVisualEnvironmentScalarControls";
import type { EffectiveAreaAudioCatalogBundle } from "../areas/domain/effectiveAreaAudioCatalog";
import type { EffectiveAreaLoadingScreenCatalog } from "../areas/domain/effectiveAreaLoadingScreenCatalog";
import type { EffectiveAreaVisualEnvironmentCatalogBundle } from "../areas/domain/effectiveAreaVisualEnvironmentCatalog";
import type { AreaVisualEnvironmentCatalogSelection } from "../areas/domain/areaVisualEnvironmentCatalogSelection";
import type { AreaDoorTransitionStorage } from "../shared/domain/areaDoorTransitionStorage";
import type { AuroraVariableTargetEntry } from "../shared/domain/auroraVariableTable";
import type { AreaSoundIntervalVariationStorage } from "../areas/domain/areaSoundIntervalVariationStorage";
import type { AreaSoundVolumeStorage } from "../areas/domain/areaSoundVolumeStorage";
import type { AreaSoundActiveStorage } from "../areas/domain/areaSoundActiveStorage";
import type { AreaSoundPlayOrderStorage } from "../areas/domain/areaSoundPlayOrderStorage";
import type { AreaSoundPlayStyleStorage } from "../areas/domain/areaSoundPlayStyleStorage";
import type { AreaSoundPlaybackStorage } from "../areas/domain/areaSoundPlaybackStorage";
import type { AreaSoundProfileStorage } from "../areas/domain/areaSoundProfileStorage";
import type { AreaSoundScheduleStorage } from "../areas/domain/areaSoundScheduleStorage";
import type { AreaStoreCommerceValue } from "./domain/storeCommerce";
import type { AreaStoreScriptResRefsValue } from "./domain/storeScriptResRefs";
import type { EncounterScriptResRefsStorage } from "./domain/encounterScriptResRefs";
import type { TriggerScriptResRefsStorage } from "./domain/triggerScriptResRefs";
import type { TriggerTransitionStorage } from "./domain/triggerTransitionStorage";
import type {
  AreaStoreRestrictionsProvenance,
  AreaStoreRestrictionsTarget,
} from "./domain/storeRestrictions";
import type {
  AreaStoreInventoryProvenance,
  AreaStoreInventoryTargetBucket,
} from "./domain/storeInventory";

export type TerrainBrushKind =
  | "corridor"
  | "doorway"
  | "inn"
  | "kitchen"
  | "livingroom"
  | "shop"
  | "wall";

export type SceneObjectKind =
  | "creatures"
  | "doors"
  | "encounters"
  | "items"
  | "placeables"
  | "sounds"
  | "stores"
  | "triggers"
  | "waypoints";

export interface SceneObjectPlaceableProperties {
  // Runtime normalization enforces boolean defaults for legacy/corrupted payloads.
  plot: boolean;
  useable: boolean;
  hasInventory: boolean;
  // Canonical physical zero-based row in the retained effective placeables.2da.
  appearanceType?: number;
  // Presence-sensitive native GIT HP/CurrentHP pair. Only HP is user-editable;
  // CurrentHP is derived by the backend with Aurora's exact signed-Short rule.
  hitPoints?: number;
  // Presence-sensitive native GIT Byte targets. Only exact source-backed
  // fields may be edited; absence is preserve-only and never a default.
  hardness?: number;
  fortitudeSave?: number;
  reflexSave?: number;
  willSave?: number;
  // Aurora parity payload. Existing provenance-bound placeables may edit only
  // script slots recovered from their exact native GIT instance.
  scriptSlots?: SceneObjectPlaceableScriptSlots;
  // Baseline UI disabled state snapshot for preserve-only roundtrip safety.
  disabledFlags?: SceneObjectPlaceableDisabledFlags;
  // Aurora-first parity: lock tab state payload.
  lockSettings?: SceneObjectPlaceableLockSettings;
  // Aurora-first parity: trap tab state payload.
  trapSettings?: SceneObjectPlaceableTrapSettings;
  // Aurora-first parity: advanced tab shell payload.
  advancedSettings?: SceneObjectPlaceableAdvancedSettings;
  // Aurora-first parity: UTP ItemList entries for placeable/container inventory.
  inventoryItems?: SceneObjectPlaceableInventoryItemReference[];
  variables?: SceneObjectPlaceableVariableTargetEntry[];
  // Aurora-first parity: description/comments tab payload.
  localizedName?: string;
  description?: string;
  comments?: string;
}

export interface SceneObjectStoreProperties {
  comments: string;
  commerce?: AreaStoreCommerceValue;
  scriptResRefs?: AreaStoreScriptResRefsValue;
  variables?: SceneObjectStoreVariableTargetEntry[];
  restrictions?: AreaStoreRestrictionsTarget;
  inventoryBuckets?: readonly AreaStoreInventoryTargetBucket[];
}

export interface SceneObjectPlaceableScriptSlots {
  onClick: string;
  onClosed: string;
  onDamaged: string;
  onDeath: string;
  onHeartbeat: string;
  onInvDisturbed: string;
  onLock: string;
  onMeleeAttacked: string;
  onOpen: string;
  onSpellCastAt: string;
  onUnlock: string;
  onUsed: string;
  onUserDefined: string;
}

export interface SceneObjectPlaceableDisabledFlags {
  plot: boolean;
  useable: boolean;
  hasInventory: boolean;
}

export interface SceneObjectPlaceableLockSettings {
  locked: boolean;
  canRelock: boolean;
  autoRemoveKeyAfterUse: boolean;
  keyRequiredToUnlockOrLock: boolean;
  openLockDc: number;
  closeLockDc: number;
  keyTag: string;
}

export interface SceneObjectPlaceableTrapSettings {
  isTrapped?: boolean;
  trapType: string;
  trapTypeRow?: number;
  detectionDc?: number;
  disarmDc?: number;
  oneShot?: boolean;
  detectable?: boolean;
  disarmable?: boolean;
  onDisarmScript: string;
  onTrapTriggeredScript: string;
  setDc: number;
  detectDcModWhenSetByRogue: number;
  disarmDcModWhenSetByRogue: number;
}

export interface SceneObjectPlaceableAdvancedSettings {
  blueprintResRef?: string;
  belongsToFaction?: string;
  factionId?: number;
  conversation?: string;
  noInterrupt?: boolean;
  portraitResRef?: string;
  portraitId?: number;
  initialState?: string;
  treasureModel?: string;
  treasureModelRow?: number;
}

export interface SceneObjectDoorLockSettings {
  locked: boolean;
  canRelock: boolean;
  autoRemoveKeyAfterUse: boolean;
  keyRequiredToUnlockOrLock: boolean;
  openLockDc: number;
  closeLockDc: number;
  keyTag: string;
}

export interface SceneObjectDoorTrapSettings {
  isTrapped: boolean;
  trapType: string;
  detectionDc: number;
  disarmDc: number;
  oneShot: boolean;
  detectable: boolean;
  disarmable: boolean;
  onDisarmScript: string;
  onTrapTriggeredScript: string;
  setDc: number;
  detectDcModWhenSetByRogue: number;
  disarmDcModWhenSetByRogue: number;
}

export interface SceneObjectDoorScriptSlots {
  onAreaTransitionClick: string;
  onClose: string;
  onDamaged: string;
  onDeath: string;
  onFailToOpen: string;
  onHeartbeat: string;
  onLock: string;
  onPhysicalAttacked: string;
  onOpen: string;
  onSpellCastAt: string;
  onUnlock: string;
  onUserDefined: string;
}

export interface SceneObjectDoorAdvancedSettings {
  blueprintResRef: string;
  belongsToFaction: string;
  conversation: string;
  noInterrupt: boolean;
  portraitResRef: string;
  initialState: string;
}

export interface SceneObjectDoorProperties {
  plot: boolean;
  hardness: number;
  hitPoints: number;
  fortitudeSave: number;
  reflexSave: number;
  willSave: number;
  appearanceType: string;
  genericAppearance: string;
  lockSettings?: SceneObjectDoorLockSettings;
  trapSettings?: SceneObjectDoorTrapSettings;
  scriptSlots?: SceneObjectDoorScriptSlots;
  advancedSettings?: SceneObjectDoorAdvancedSettings;
  description?: string;
  comments?: string;
}

export interface SceneObjectCreatureAbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SceneObjectCreatureRacialModifiers {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface SceneObjectCreatureSaveStats {
  fortitudeBase: number;
  fortitudeBonus: number;
  reflexBase: number;
  reflexBonus: number;
  willBase: number;
  willBonus: number;
}

export interface SceneObjectCreatureStatisticsSettings {
  abilityScores: SceneObjectCreatureAbilityScores;
  racialModifiers: SceneObjectCreatureRacialModifiers;
  saves: SceneObjectCreatureSaveStats;
  naturalArmorClass: number;
  baseArmorClass: number;
  dexterityBonus: number;
  sizeModifier: number;
  baseHitPoints: number;
  hitPointBonuses: number;
  currentHitPoints?: number;
  maxHitPoints?: number;
  movementRate: string;
}

export interface SceneObjectCreatureAppearanceSettings {
  partBasedAppearance: boolean;
  head: string;
  neck: string;
  torso: string;
  pelvis: string;
  rightBicep: string;
  leftBicep: string;
  rightForearm: string;
  leftForearm: string;
  rightHand: string;
  leftHand: string;
  rightThigh: string;
  leftThigh: string;
  rightShin: string;
  leftShin: string;
  rightFoot: string;
  leftFoot: string;
  wings: string;
  tail: string;
  colors?: {
    skin: string;
    hair: string;
    tattoo1: string;
    tattoo2: string;
  };
  sourceOnlyParts?: {
    belt: string;
    robe: string;
    rightShoulder: string;
    leftShoulder: string;
  };
}

export interface SceneObjectCreatureAppearanceProfile {
  source2daRow?: number;
  sourceKey?: string;
  modelType?: string;
  raceModel?: string;
  portrait2da?: string;
  envMap?: string;
  defaultPhenotype?: string;
  bloodColor?: string;
  sizeCategory?: number;
  sizeCategoryLabel?: string;
  sizeCategorySource2daRow?: number;
  sizeCategorySourceKey?: string;
  raceAppearanceId?: number;
}

export interface SceneObjectCreatureLookupProfile {
  raceLabelSource2daRow?: number;
  raceLabelSourceKey?: string;
  genderLabelSource2daRow?: number;
  genderLabelSourceKey?: string;
  portraitResolvedSource2daRow?: number;
  portraitResolvedSourceKey?: string;
  soundSetResRef?: string;
  soundSetSource2daRow?: number;
  soundSetSourceKey?: string;
}

export interface SceneObjectCreatureListCounts {
  classListCount?: number;
  skillListCount?: number;
  featListCount?: number;
  templateListCount?: number;
  specAbilityListCount?: number;
  inventoryItemListCount?: number;
  equipItemListCount?: number;
}

export interface SceneObjectCreatureLocalizedStringRefs {
  firstName?: number;
  lastName?: number;
  localizedName?: number;
  description?: number;
  identifiedDescription?: number;
  subrace?: number;
  deity?: number;
}

export interface SceneObjectCreatureLocalizedStrings {
  localizedName?: string;
  displayName?: string;
  identifiedDescription?: string;
}

export interface SceneObjectCreatureClassEntry {
  classId?: number;
  className: string;
  level: number;
}

export type SceneObjectPlaceableTrapByteSettings = Readonly<
  Partial<
    Pick<
      SceneObjectPlaceableTrapSettings,
      "isTrapped" | "detectable" | "disarmable" | "oneShot" | "detectionDc" | "disarmDc"
    >
  >
>;

export interface SceneObjectCreatureTemplateEntry {
  templateId?: number;
}

export interface SceneObjectCreatureSkillEntry {
  skillId?: number;
  skill: string;
  rank: number;
}

export interface SceneObjectCreatureFeatEntry {
  featId?: number;
  name: string;
  type: string;
  assigned: boolean;
}

export interface SceneObjectCreatureSpellEntry {
  spellId?: number;
  classIndex?: number;
  prepared: boolean;
  name: string;
  spellLevel: number;
  castingLevel: number;
  metaMagic?: number;
  flags?: number;
}

export interface SceneObjectCreatureSpecialAbilityEntry {
  spellId?: number;
  flags?: number;
  name: string;
  type: string;
  casterLevel: number;
  uses: number;
}

export type SceneObjectCreatureVariableEntry =
  | { name: string; type: "int"; value: number }
  | { name: string; type: "float"; value: number }
  | { name: string; type: "string"; value: string };

export type SceneObjectPlaceableVariableTargetEntry = SceneObjectCreatureVariableEntry;
export type SceneObjectCreatureVariableTargetEntry = SceneObjectCreatureVariableEntry;
export type SceneObjectEncounterVariableTargetEntry = SceneObjectCreatureVariableEntry;
export type SceneObjectWaypointVariableTargetEntry = SceneObjectCreatureVariableEntry;
export type SceneObjectItemVariableTargetEntry = SceneObjectCreatureVariableEntry;
export type SceneObjectStoreVariableTargetEntry = SceneObjectCreatureVariableEntry;

export type SceneObjectPlaceableVariableSourceEntry =
  SceneObjectPlaceableVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectPlaceableVariableProvenance {
  readonly expectedEntries: readonly SceneObjectPlaceableVariableSourceEntry[];
}

export type SceneObjectCreatureVariableSourceEntry =
  SceneObjectCreatureVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectCreatureVariableProvenance {
  readonly expectedEntries: readonly SceneObjectCreatureVariableSourceEntry[];
}

export type SceneObjectEncounterVariableSourceEntry =
  SceneObjectEncounterVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectEncounterVariableProvenance {
  readonly expectedEntries: readonly SceneObjectEncounterVariableSourceEntry[];
}

export type SceneObjectWaypointVariableSourceEntry =
  SceneObjectWaypointVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectWaypointVariableProvenance {
  readonly expectedEntries: readonly SceneObjectWaypointVariableSourceEntry[];
}

export type SceneObjectItemVariableSourceEntry =
  SceneObjectItemVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectItemVariableProvenance {
  readonly expectedEntries: readonly SceneObjectItemVariableSourceEntry[];
}

export type SceneObjectStoreVariableSourceEntry =
  SceneObjectStoreVariableTargetEntry & Readonly<{ sourceIndex: number }>;

export interface SceneObjectStoreVariableProvenance {
  readonly expectedEntries: readonly SceneObjectStoreVariableSourceEntry[];
}

export interface SceneObjectEmbeddedItemSummary {
  sourceStructTypeId?: number;
  templateResRef?: string;
  tag?: string;
  localizedName?: string;
  localizedNameStrRef?: number;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  plot?: boolean;
  baseItem?: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  cursed?: boolean;
  bodyPartRFoot?: number;
  bodyPartLFoot?: number;
  bodyPartRShin?: number;
  bodyPartLShin?: number;
  bodyPartLThigh?: number;
  bodyPartRThigh?: number;
  bodyPartPelvis?: number;
  bodyPartTorso?: number;
  bodyPartBelt?: number;
  bodyPartNeck?: number;
  bodyPartRFArm?: number;
  bodyPartLFArm?: number;
  bodyPartRBicep?: number;
  bodyPartLBicep?: number;
  bodyPartRShoul?: number;
  bodyPartLShoul?: number;
  bodyPartRHand?: number;
  bodyPartLHand?: number;
  bodyPartRobe?: number;
  leather1Color?: number;
  leather2Color?: number;
  cloth1Color?: number;
  cloth2Color?: number;
  metal1Color?: number;
  metal2Color?: number;
  itemPropertyListCount?: number;
  itemPropertyListEntries?: SceneObjectItemPropertyEntry[];
  scripts?: Record<string, string>;
  fieldCount?: number;
}

export interface SceneObjectCreatureInventoryItemReference {
  sourceIndex?: number;
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: SceneObjectEmbeddedItemSummary;
  itemTemplateId?: string;
  itemResRef?: string;
  itemSourceFingerprint?: string;
  itemSourceObjectKey?: string;
  itemBaseItem?: number;
  itemBaseItemEquipableSlots?: string;
  x?: number;
  y?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface SceneObjectCreatureInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export interface SceneObjectCreatureInventoryBlueprintEntry {
  readonly resRef: string;
  readonly itemResRef: string;
  readonly itemSourceObjectKey: string;
  readonly itemSourceFingerprint: string;
  readonly x: number;
  readonly y: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export type SceneObjectCreatureInventoryTargetEntry =
  | SceneObjectCreatureInventorySourceEntry
  | SceneObjectCreatureInventoryBlueprintEntry;

export type SceneObjectPlaceableInventoryItemReference =
  SceneObjectCreatureInventoryItemReference;

export interface SceneObjectPlaceableInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}

export interface SceneObjectPlaceableDurabilitySaveBytes {
  readonly hardness?: number;
  readonly fortitudeSave?: number;
  readonly reflexSave?: number;
  readonly willSave?: number;
}

export interface SceneObjectCreatureEquippedItemReference {
  sourceIndex?: number;
  resRef?: string;
  randomResRef?: string;
  randomList?: string;
  embeddedItem?: SceneObjectEmbeddedItemSummary;
  itemTemplateId?: string;
  itemResRef?: string;
  itemSourceFingerprint?: string;
  itemSourceObjectKey?: string;
  itemBaseItem?: number;
  itemBaseItemEquipableSlots?: string;
  slotMask?: number;
  dropable?: boolean;
  pickpocketable?: boolean;
  infinite?: boolean;
}

export interface SceneObjectCreatureEquipmentSourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly slotMask: number;
  readonly dropable: boolean;
  readonly pickpocketable: boolean;
}

export type SceneObjectCreatureEquipmentTargetEntry =
  SceneObjectCreatureEquipmentSourceEntry;

export interface SceneObjectCreatureScriptSlots {
  onBlocked: string;
  onCombatRoundEnd: string;
  onConversation: string;
  onDamaged: string;
  onDeath: string;
  onDisturbed: string;
  onHeartbeat: string;
  onPerception: string;
  onPhysicalAttacked: string;
  onRested: string;
  onSpawn: string;
  onSpellCastAt: string;
  onUserDefined: string;
}

export interface SceneObjectCreatureAdvancedSettings {
  blueprintResRef: string;
  paletteId?: number;
  disarmable: boolean;
  plot: boolean;
  playerCharacter?: boolean;
  leavesLootableCorpse: boolean;
  noPermanentDeath: boolean;
  immortal: boolean;
  bodyBag?: boolean;
  startingPackage?: boolean;
  startingPackageId?: number;
  treasureModel: string;
  treasureModelRow?: number;
  corpseDecayTimeSeconds?: number;
  faction: string;
  factionId?: number;
  subrace: string;
  deity: string;
  challengeRatingAdjustment: number;
  soundSet: string;
  soundSetFile?: number;
  perceptionRange: string;
  perceptionRangeId?: number;
  walkRateId?: number;
  walkRateSource2daRow?: number;
  walkRateSource2daName?: string;
  walkRateSpeed2daRow?: number;
  walkRateAppearance2daSourceKey?: string;
  walkRateSpeed2daSourceKey?: string;
  animationState?: number;
  animationName?: string;
}

export interface SceneObjectCreatureProperties {
  firstName: string;
  lastName: string;
  race: string;
  appearance: string;
  appearanceType?: number;
  phenotype: string;
  phenotypeId?: number;
  gender: string;
  genderId?: number;
  description: string;
  challengeRating: number;
  portraitResRef: string;
  portraitId?: number;
  conversation: string;
  noInterrupt: boolean;
  alignment?: string;
  statistics?: SceneObjectCreatureStatisticsSettings;
  appearanceSettings?: SceneObjectCreatureAppearanceSettings;
  appearanceProfile?: SceneObjectCreatureAppearanceProfile;
  lookupProfile?: SceneObjectCreatureLookupProfile;
  listCounts?: SceneObjectCreatureListCounts;
  localizedStringRefs?: SceneObjectCreatureLocalizedStringRefs;
  localizedStrings?: SceneObjectCreatureLocalizedStrings;
  classEntries?: SceneObjectCreatureClassEntry[];
  classIdentityDestructiveSpellClearConfirmed?: boolean;
  classSlotResizeDestructiveRemovalConfirmed?: boolean;
  templateEntries?: SceneObjectCreatureTemplateEntry[];
  skills?: SceneObjectCreatureSkillEntry[];
  skillListTruncationConfirmed?: boolean;
  scriptSlots?: SceneObjectCreatureScriptSlots;
  advancedSettings?: SceneObjectCreatureAdvancedSettings;
  feats?: SceneObjectCreatureFeatEntry[];
  spells?: SceneObjectCreatureSpellEntry[];
  specialAbilities?: SceneObjectCreatureSpecialAbilityEntry[];
  variables?: SceneObjectCreatureVariableEntry[];
  inventoryItems?: SceneObjectCreatureInventoryItemReference[];
  equippedItems?: SceneObjectCreatureEquippedItemReference[];
  comments?: string;
}

export type SceneSoundPositioningMode =
  | "everywhere"
  | "random"
  | "specific";

export type SceneSoundWhenToPlay = "always" | "dayNight" | "hours";
export type SceneSoundDayNight = "both" | "day" | "night";
export type SceneSoundPlayStyle = "once" | "repeat" | "loop";
export type SceneSoundPlayOrder = "sequential" | "random";

export type ScenePreservePrimitive = string | number | boolean | null;

export interface SceneObjectSoundPositioningPreservePayload {
  // Preserve-only shell for schedule/variation/priority fields.
  // Runtime behavior must not infer additional semantics from these values yet.
  timeWindow: string;
  hourMask: string;
  active?: boolean;
  whenToPlay?: SceneSoundWhenToPlay;
  dayNight?: SceneSoundDayNight;
  hoursStart?: number;
  hoursEnd?: number;
  playStyle?: SceneSoundPlayStyle;
  playOrder?: SceneSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  flags: Record<string, boolean>;
  extra: Record<string, ScenePreservePrimitive>;
}

export interface SceneObjectSoundPositioning {
  // Runtime normalization clamps invalid legacy values to safe baselines.
  mode: SceneSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  preserve?: SceneObjectSoundPositioningPreservePayload;
}

export interface SceneSoundPropertiesModel {
  name: string;
  tag: string;
  resRef: string;
  mode: SceneSoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  active: boolean;
  whenToPlay: SceneSoundWhenToPlay;
  dayNight: SceneSoundDayNight;
  hoursStart: number;
  hoursEnd: number;
  playStyle: SceneSoundPlayStyle;
  playOrder: SceneSoundPlayOrder;
  intervalMs: number;
  intervalVariationMs: number;
  volumeVariation: number;
  pitchVariation: number;
}

export interface SceneObjectDoorTransitionPayload {
  // Preserve-only payload for Aurora parity. Runtime behavior must not infer
  // transition semantics from these fields yet.
  linkedTarget: string;
  linkedModule: string;
  linkedTag: string;
  linkedWaypoint: string;
  loadScreen: string;
  flags: Record<string, boolean>;
  storage?: AreaDoorTransitionStorage;
  extra?: Record<string, ScenePreservePrimitive>;
}

export type SceneObjectVfxSourceKind =
  | "unknown"
  | "placeable_preview"
  | "source_mdl_graph"
  | "visualeffects_2da"
  | "effect_instance";

export type SceneObjectVfxCanonicalStatus =
  | "unmapped"
  | "preview_only"
  | "canonical";

export type AuroraVfxRendererEligibility =
  | "blocked"
  | "preview_only"
  | "source_backed";

export type AuroraVfxRetailParityStatus =
  | "unproven"
  | "blocked"
  | "proven";

export type SceneObjectVfxPreviewMode =
  | "none"
  | "sprite_scaffold"
  | "derived_model_preview"
  | "static_model_preview"
  | "aurora_emitter_particle_preview"
  | "aurora_light_node_preview"
  | "aurora_light_node_source_only"
  | "texture_particle_preview"
  | "chunk_model_source_only"
  | "chunk_model_particle_preview";

export interface SceneObjectVfxDiagnostic {
  code: string;
  severity: "info" | "warn" | "error";
  message: string;
}

export type AuroraVfxPayloadVersion = "aurora-vfx-payload/v1";

export type AuroraVfxJsonValue =
  | ScenePreservePrimitive
  | AuroraVfxJsonValue[]
  | { [key: string]: AuroraVfxJsonValue };

export type AuroraVfxDiagnosticGroupKey =
  | "sourceRows"
  | "effectInstance"
  | "phaseSchedule"
  | "dependencyGraph"
  | "runtimeState"
  | "renderContract"
  | "payload";

export type AuroraVfxPayloadDiagnostics = Record<
  AuroraVfxDiagnosticGroupKey,
  SceneObjectVfxDiagnostic[]
>;

export interface AuroraVfxPayloadContracts {
  sourceRows?: AuroraVfxJsonValue;
  effectInstance?: AuroraVfxJsonValue;
  aoeRuntimeObject?: AuroraVfxJsonValue;
  phaseSchedule?: AuroraVfxJsonValue;
  dependencyGraph?: AuroraVfxJsonValue;
  runtimeReplayCommand?: AuroraVfxJsonValue;
  runtimeEmitters?: AuroraVfxJsonValue;
  runtimeEmittersDeferred?: AuroraVfxJsonValue;
  runtimeEmittersHydration?: AuroraVfxJsonValue;
  runtimeState?: AuroraVfxJsonValue;
  runtimeSharedRng?: AuroraVfxJsonValue;
  renderContract?: AuroraVfxJsonValue;
  sourceMdlLights?: AuroraVfxJsonValue;
  sourceMdlLightFeatureManifest?: AuroraVfxJsonValue;
  sourceModelGraph?: AuroraVfxJsonValue;
}

export interface AuroraVfxPayloadProvenance {
  backendPayloadVersion?: string;
  sourceProfile?: string;
  sourceTable?: string;
  sourceRowId?: number;
  sourceLabel?: string;
  sourceResRef?: string;
  effectInstanceId?: string;
  runtimeProfile?: string;
  renderContractVersion?: string;
}

export interface AuroraVfxPayload {
  version: AuroraVfxPayloadVersion;
  canonicalStatus: SceneObjectVfxCanonicalStatus;
  backendCanonical: boolean;
  /** Additive v1 replacement for using canonicalStatus as renderer authority. */
  rendererEligibility?: AuroraVfxRendererEligibility;
  /** Independent retail evidence state; never inferred from renderer eligibility. */
  retailParityStatus?: AuroraVfxRetailParityStatus;
  sourceKind: SceneObjectVfxSourceKind;
  previewMode: SceneObjectVfxPreviewMode;
  diagnostics: AuroraVfxPayloadDiagnostics;
  contracts: AuroraVfxPayloadContracts;
  provenance: AuroraVfxPayloadProvenance;
}

export interface SceneObjectVfxPreservePayload {
  // Preserve-first shell for Aurora VFX. Preview adapters may render it, but
  // canonical runtime behavior must come from source rows + effect instances.
  version?: "scene-object-vfx-preserve/v1";
  profile: string;
  emitter: string;
  script: string;
  sourceKind: SceneObjectVfxSourceKind;
  sourceProfile: string;
  sourceTable: string;
  sourceRowId?: number;
  sourceLabel: string;
  sourceResRef: string;
  previewMode: SceneObjectVfxPreviewMode;
  canonicalStatus: SceneObjectVfxCanonicalStatus;
  diagnostics: SceneObjectVfxDiagnostic[];
  auroraPayload?: AuroraVfxPayload;
  flags: Record<string, boolean>;
  extra: Record<string, ScenePreservePrimitive>;
}

export interface SceneTileLightColor {
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
  sourceNode?: SceneTileSourceLightNode;
  nativeNode?: SceneTileNativeLightNode;
}

export type SceneTileSourceLightNode =
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

export interface SceneTileNativeLightNode {
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

export type SceneAreaGlobalLightingFieldName =
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

export interface SceneAreaGlobalLightingField {
  field: SceneAreaGlobalLightingFieldName;
  value: number;
}

export interface SceneAreaGlobalLighting {
  source: "are-root-fields";
  fields: SceneAreaGlobalLightingField[];
}

export interface SceneTile {
  id: string;
  row: number;
  col: number;
  terrain: TerrainBrushKind;
  orientation: 0 | 1 | 2 | 3;
  rotateTexture: boolean;
  plot: boolean;
  source?: "seed" | "aurora_tile_list";
  areaId?: string;
  tilesetResRef?: string;
  tileIndex?: number;
  tileId?: number;
  modelResRef?: string;
  modelSource?: "are-tile-list" | "set-tile-section";
  imageMap2D?: string;
  tilesetOrientation?: 0 | 1 | 2 | 3;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  mainLight1Color?: SceneTileLightColor;
  mainLight2Color?: SceneTileLightColor;
  sourceLight1Color?: SceneTileLightColor;
  sourceLight2Color?: SceneTileLightColor;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
  pathNode?: string;
  visibilityNode?: string;
  visibilityOrientation?: 0 | 1 | 2 | 3;
  doorVisibilityNode?: string;
  doorVisibilityOrientation?: 0 | 1 | 2 | 3;
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
  fallbackReason?: string;
}

export interface SceneObjectVisualTransform {
  scale: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  roll: number;
  yaw: number;
}

export interface SceneObjectEncounterCreatureEntry {
  resRef?: string;
  appearance?: number;
  challengeRating?: number;
  singleSpawn?: boolean;
}

export interface SceneObjectEncounterProperties {
  comments?: string;
  variables?: SceneObjectEncounterVariableTargetEntry[];
  localizedName?: string;
  description?: string;
  active?: boolean;
  difficulty?: number;
  difficultyIndex?: number;
  factionId?: number;
  maxCreatures?: number;
  recCreatures?: number;
  playerOnly?: boolean;
  reset?: boolean;
  resetTime?: number;
  respawns?: number;
  spawnOption?: number;
  creatureList?: SceneObjectEncounterCreatureEntry[];
  spawnPoints?: SceneObjectEncounterSpawnPointTargetEntry[];
  scripts?: Record<string, string>;
}

export interface SceneObjectItemArmorParts {
  rFoot?: number;
  lFoot?: number;
  rShin?: number;
  lShin?: number;
  lThigh?: number;
  rThigh?: number;
  pelvis?: number;
  torso?: number;
  belt?: number;
  neck?: number;
  rFArm?: number;
  lFArm?: number;
  rBicep?: number;
  lBicep?: number;
  rShoul?: number;
  lShoul?: number;
  rHand?: number;
  lHand?: number;
  robe?: number;
}

export interface SceneObjectItemMaterialColors {
  leather1?: number;
  leather2?: number;
  cloth1?: number;
  cloth2?: number;
  metal1?: number;
  metal2?: number;
}

export interface SceneObjectItemPropertyEntry {
  propertyName?: number;
  propertyLabel?: string;
  subtype?: number;
  costTable?: number;
  costValue?: number;
  param1?: number;
  param1Value?: number;
  chanceAppear?: number;
  propertyDefinitionSource2daRow?: number;
  propertyDefinitionSourceKey?: string;
  subTypeTable?: string;
  costTableDefinition?: string;
  param1Table?: string;
  nameStrRef?: number;
  gameStrRef?: number;
  descriptionStrRef?: number;
}

export interface SceneObjectEncounterCreatureListSourceEntry {
  readonly sourceIndex: number;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawnByte: 0 | 1;
}

export interface SceneObjectEncounterCreatureListLegacyTargetEntry {
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawn: boolean;
}

export interface SceneObjectEncounterCreatureListRetainedTargetEntry {
  readonly entryKind: "retained";
  readonly sourceIndex: number;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly resRef: string;
  readonly singleSpawn: boolean;
}

export interface SceneObjectEncounterCreatureListBlueprintTargetEntry {
  readonly entryKind: "effective_blueprint";
  readonly sourceProfileId: "effective-catalog-utc-encounter-creature-list-v1";
  readonly templateId: string;
  readonly resRef: string;
  readonly appearance: number;
  readonly challengeRating: number;
  readonly sourceObjectKey: string;
  readonly sourceSizeBytes: number;
  readonly sourceSha256: string;
  readonly singleSpawn: boolean;
}

export type SceneObjectEncounterCreatureListStructuralTargetEntry =
  | SceneObjectEncounterCreatureListRetainedTargetEntry
  | SceneObjectEncounterCreatureListBlueprintTargetEntry;

export type SceneObjectEncounterCreatureListTargetEntry =
  | SceneObjectEncounterCreatureListLegacyTargetEntry
  | SceneObjectEncounterCreatureListStructuralTargetEntry;

export interface SceneObjectEncounterCreatureListProvenance {
  readonly expectedEntries: readonly SceneObjectEncounterCreatureListSourceEntry[];
}

export interface SceneObjectEncounterSpawnPointSourceEntry {
  readonly sourceIndex: number;
  readonly nativeX: number;
  readonly nativeY: number;
  readonly nativeZ: number;
  readonly orientation: number;
}

export interface SceneObjectEncounterSpawnPointTargetEntry {
  readonly nativeX: number;
  readonly nativeY: number;
  readonly nativeZ: number;
  readonly orientation: number;
}

export interface SceneObjectEncounterSpawnPointListProvenance {
  readonly expectedEntries: readonly SceneObjectEncounterSpawnPointSourceEntry[];
}

export interface SceneObjectItemPropertyListTargetEntry {
  propertyName: number;
  subtype: number;
  costTable: number;
  costValue: number;
  param1: number;
  param1Value: number;
  chanceAppear: number;
}

export interface SceneObjectItemPropertyListSourceEntry
  extends SceneObjectItemPropertyListTargetEntry {
  sourceIndex: number;
}

export interface SceneObjectItemPropertyListProvenance {
  present: boolean;
  expectedEntries: SceneObjectItemPropertyListSourceEntry[];
}

export interface SceneObjectItemInventorySourceEntry {
  readonly sourceIndex: number;
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}

export interface SceneObjectItemInventoryBlueprintEntry {
  readonly resRef: string;
  readonly itemTemplateId: string;
  readonly itemResRef: string;
  readonly itemSourceProfileId: string;
  readonly itemSourceObjectKey: string;
  readonly itemSourceSizeBytes: number;
  readonly itemSourceFingerprint: string;
  readonly itemTag: string;
  readonly x: number;
  readonly y: number;
}

export type SceneObjectItemInventoryTargetEntry =
  | SceneObjectItemInventorySourceEntry
  | SceneObjectItemInventoryBlueprintEntry;

export interface SceneObjectItemBlueprintInventoryEntry {
  readonly resRef: string;
  readonly x: number;
  readonly y: number;
}

export interface SceneObjectItemBlueprintEquipmentEntry {
  readonly resRef: string;
  readonly slotMask: number;
}

export type SceneItemBaseItemModelType = 0 | 1 | 2 | 3;
export type SceneObjectItemExactArmorParts = Readonly<
  Required<SceneObjectItemArmorParts>
>;
export type SceneObjectItemExactMaterialColors = Readonly<
  Required<SceneObjectItemMaterialColors>
>;
export type SceneObjectItemBaseAppearanceValue =
  | Readonly<{
      baseItem: number;
      modelType: 0;
      appearance: Readonly<{ modelPart1: number }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 1;
      appearance: Readonly<{
        modelPart1: number;
        materialColors: SceneObjectItemExactMaterialColors;
      }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 2;
      appearance: Readonly<{
        modelPart1: number;
        modelPart2: number;
        modelPart3: number;
      }>;
    }>
  | Readonly<{
      baseItem: number;
      modelType: 3;
      appearance: Readonly<{
        armorParts: SceneObjectItemExactArmorParts;
        materialColors: SceneObjectItemExactMaterialColors;
      }>;
    }>;
export interface SceneObjectItemBaseAppearanceProvenance {
  readonly expectedValue: SceneObjectItemBaseAppearanceValue;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}
export interface SceneItemBaseItemCatalogDescriptor {
  readonly resourceName: "baseitems.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}
export interface SceneItemBaseItemCatalogRow {
  readonly rowIndex: number;
  readonly nameStrRef?: number;
  readonly label?: string;
  readonly modelType: SceneItemBaseItemModelType;
  readonly itemClass?: string;
  readonly displayName: string;
  readonly invSlotWidth?: number;
  readonly invSlotHeight?: number;
}
export interface SceneItemBaseItemCatalog {
  readonly descriptor: SceneItemBaseItemCatalogDescriptor;
  readonly rows: readonly SceneItemBaseItemCatalogRow[];
}

export interface SceneObjectItemModelPartCandidate {
  resRef: string;
  role?: string;
  partId?: number;
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
}

export interface SceneObjectItemArmorPartModelCandidate {
  slot: string;
  partId: number;
  partModelName?: string;
  nodeName?: string;
  modelPrefix?: string;
  modelResRef: string;
  assetId?: string;
  modelUrl?: string;
  glbUrl?: string;
}

export interface SceneObjectItemArmorPreviewContext {
  modelPrefix: string;
  sourceKey?: string;
  label?: string;
  gender?: number;
  phenotype?: number;
  raceModel?: string;
}

export interface SceneObjectItemModelAssetCandidate {
  assetId: string;
  role: string;
  fileName: string;
  objectKey: string;
  extension: string;
  reference: string;
  assetUrl: string;
  sizeBytes?: number;
}

export interface SceneObjectItemProperties {
  localizedName?: string;
  localizedNameStrRef?: number;
  description?: string;
  descriptionStrRef?: number;
  identifiedDescription?: string;
  identifiedDescriptionStrRef?: number;
  comments?: string;
  paletteId?: number;
  baseItem?: number;
  baseAppearance?: SceneObjectItemBaseAppearanceValue;
  baseItemLabel?: string;
  baseItemSourceKey?: string;
  baseItemItemClass?: string;
  baseItemModelType?: string;
  baseItemDefaultModel?: string;
  baseItemDefaultIcon?: string;
  baseItemInvSlotWidth?: number;
  baseItemInvSlotHeight?: number;
  baseItemCanRotateIcon?: number;
  baseItemEquipableSlots?: string;
  baseItemBaseCost?: number;
  baseItemStacking?: number;
  baseItemItemMultiplier?: number;
  baseItemMaxProps?: number;
  baseItemMinProps?: number;
  baseItemPropColumn?: string;
  baseItemStorePanel?: number;
  baseItemStorePanelSort?: number;
  baseItemChargesStarting?: number;
  baseItemIlrStackSize?: number;
  baseItemWeaponMatType?: number;
  baseItemAmmunitionType?: number;
  baseItemArcaneSpellFailure?: number;
  baseItemReqFeats?: number[];
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  modelParts?: number[];
  modelPartResRefs?: string[];
  modelPartResRefRoles?: string[];
  cloakModelRow?: number;
  cloakModel?: number;
  cloakTexture?: number;
  cloakIcon?: number;
  cloakModelResRef?: string;
  cloakTextureResRef?: string;
  cloakIconResRef?: string;
  cloakHiddenSlots?: string[];
  cloakSourceKey?: string;
  armorPreviewContext?: SceneObjectItemArmorPreviewContext;
  armorRobeHiddenSlots?: string[];
  modelPartCandidates?: SceneObjectItemModelPartCandidate[];
  armorPartModelCandidates?: SceneObjectItemArmorPartModelCandidate[];
  modelAssetCandidates?: SceneObjectItemModelAssetCandidate[];
  armorPartCostModifiers?: SceneObjectItemArmorParts;
  armorPartCostModifierTotal?: number;
  armorPartCostModifierResolvedCount?: number;
  armorPartCostModifierUnresolvedCount?: number;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified?: boolean;
  stolen?: boolean;
  plot?: boolean;
  cursed?: boolean;
  armorParts?: SceneObjectItemArmorParts;
  materialColors?: SceneObjectItemMaterialColors;
  propertyList?: SceneObjectItemPropertyEntry[];
  inventoryItems?: SceneObjectItemInventoryTargetEntry[];
  blueprintInventoryItems?: SceneObjectItemBlueprintInventoryEntry[];
  blueprintEquippedItems?: SceneObjectItemBlueprintEquipmentEntry[];
  visualTransform?: SceneObjectItemVisualTransformStorage;
  variables?: SceneObjectItemVariableTargetEntry[];
  scripts?: Record<string, string>;
}

export type SceneObjectItemInstanceStateField =
  | "charges"
  | "cost"
  | "stolen"
  | "stackSize"
  | "plot"
  | "addCost"
  | "identified"
  | "cursed";

export interface SceneObjectItemInstanceStateValue {
  readonly charges: number;
  readonly cost: number;
  readonly stolen: boolean;
  readonly stackSize: number;
  readonly plot: boolean;
  readonly addCost: number;
  readonly identified: boolean;
  readonly cursed: boolean;
}

export interface SceneObjectItemInstanceStateStorage {
  readonly presentFields: readonly SceneObjectItemInstanceStateField[];
  readonly values: SceneObjectItemInstanceStateValue;
}

export interface SceneObjectItemVisualTransformValue {
  readonly scaleX: number;
  readonly scaleY: number;
  readonly scaleZ: number;
  readonly rotateX: number;
  readonly rotateY: number;
  readonly rotateZ: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly translateZ: number;
}

export type SceneObjectItemVisualTransformStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: SceneObjectItemVisualTransformValue }>;

export type SceneObjectItemTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type SceneObjectTriggerTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type SceneObjectEncounterTagStorage = SceneObjectTriggerTagStorage;

export type SceneObjectWaypointTagStorage = SceneObjectTriggerTagStorage;

export type SceneObjectWaypointTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export type SceneObjectEncounterTemplateResRefStorage =
  SceneObjectWaypointTemplateResRefStorage;

export type SceneObjectTriggerTemplateResRefStorage =
  SceneObjectWaypointTemplateResRefStorage;

export type SceneObjectEncounterActiveStorage = Readonly<{ activeByte: 0 | 1 }>;

export type SceneObjectEncounterPlayerOnlyStorage =
  Readonly<{ playerOnlyByte: 0 | 1 }>;

export type SceneObjectEncounterResetStorage = Readonly<{ resetByte: 0 | 1 }>;

export type SceneObjectEncounterResetTimeStorage = Readonly<{ resetTime: number }>;

export type SceneObjectEncounterSpawnOptionStorage = Readonly<{ spawnOption: 0 | 1 }>;
export type SceneObjectEncounterRespawnsStorage = Readonly<{ respawns: number }>;
export type SceneObjectEncounterCreatureCountStorage = Readonly<{
  maxCreatures: number;
  recCreatures: number;
}>;
export type SceneObjectEncounterScriptResRefsStorage = EncounterScriptResRefsStorage;
export type SceneObjectTriggerScriptResRefsStorage = TriggerScriptResRefsStorage;

export type SceneObjectItemTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export interface SceneObjectDoorHookSourceMetadata {
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
}

export type SceneObjectPlaceableBasicIdentityTag =
  | { present: false }
  | { present: true; value: string };

export interface SceneObjectPlaceableBasicIdentityTable {
  resourceName: "placeables.2da";
  sourceObjectKey: string;
  sourceLayer: "module" | "hak" | "vanilla";
  sha256: string;
  sizeBytes: number;
  rowCount: number;
  rowIndex: number;
}

export type SceneObjectPlaceableBasicIdentityAppearance =
  | { present: false }
  | {
      present: true;
      nativeType: "dword";
      value: number;
      table?: SceneObjectPlaceableBasicIdentityTable;
    }
  | {
      present: true;
      nativeType: "byte";
      value: number;
    };

export interface SceneObjectPlaceableBasicIdentity {
  tag: SceneObjectPlaceableBasicIdentityTag;
  appearance: SceneObjectPlaceableBasicIdentityAppearance;
}

export type SceneObjectCreatureTagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type SceneObjectCreatureConversationStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: string }>;

export type SceneObjectCreatureTemplateResRefStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "resref"; value: string }>;

export interface SceneObjectCreatureTemplateResRefProvenance {
  readonly expectedResRef: string;
}

export type SceneObjectCreatureSpecialIdentityStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "cexostring"; value: string }>;

export interface SceneObjectCreatureSpecialIdentityStringsStorage {
  readonly subrace: SceneObjectCreatureSpecialIdentityStringStorage;
  readonly deity: SceneObjectCreatureSpecialIdentityStringStorage;
}

export interface SceneObjectCreatureSpecialIdentityStringProvenance {
  readonly expectedValue: string;
}

export interface SceneObjectCreatureSpecialIdentityStringsProvenance {
  readonly subrace?: SceneObjectCreatureSpecialIdentityStringProvenance;
  readonly deity?: SceneObjectCreatureSpecialIdentityStringProvenance;
}

export interface SceneObjectCreatureScriptResRefProvenance {
  readonly expectedResRef: string;
}

export type SceneObjectCreatureScriptResRefsProvenance = Readonly<Partial<Record<
  keyof SceneObjectCreatureScriptSlots,
  SceneObjectCreatureScriptResRefProvenance
>>>;

export type SceneObjectCreatureInterruptableStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: 0 | 1 }>;

export interface SceneObjectCreatureAppearanceTable {
  readonly resourceName: "appearance.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type SceneObjectCreatureAppearanceStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: SceneObjectCreatureAppearanceTable;
    }>;

export interface SceneObjectCreatureGenderTable {
  readonly resourceName: "gender.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type SceneObjectCreatureGenderStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: SceneObjectCreatureGenderTable;
    }>;

export type SceneObjectCreatureAppendageKey = "wings" | "tail";

export interface SceneObjectCreatureAppendageTable {
  readonly resourceName: "wingmodel.2da" | "tailmodel.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type SceneObjectCreatureAppendageDwordStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "dword";
      value: number;
      table?: SceneObjectCreatureAppendageTable;
    }>;

export type SceneObjectCreatureAppendageByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type SceneObjectCreatureAppendageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      modernDword: SceneObjectCreatureAppendageDwordStorage;
      legacyByte: SceneObjectCreatureAppendageByteStorage;
    }>;

export interface SceneObjectCreatureAppendagesStorage {
  readonly wings: SceneObjectCreatureAppendageStorage;
  readonly tail: SceneObjectCreatureAppendageStorage;
}

export interface SceneObjectCreaturePerceptionRangeTable {
  readonly resourceName: "ranges.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: 8 | 9 | 10 | 11;
}

export type SceneObjectCreaturePerceptionRangeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      table?: SceneObjectCreaturePerceptionRangeTable;
    }>;

export interface SceneObjectCreatureWalkRateTable {
  readonly resourceName: "creaturespeed.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly twoDaName: string;
}

export type SceneObjectCreatureWalkRateStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "int";
      value: number;
      table?: SceneObjectCreatureWalkRateTable;
    }>;

export interface SceneObjectCreatureSoundSetFileTable {
  readonly resourceName: "soundset.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly resRef: string;
}

export type SceneObjectCreatureSoundSetFileStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      table?: SceneObjectCreatureSoundSetFileTable;
    }>;

export interface SceneObjectCreatureStartingPackageTable {
  readonly resourceName: "packages.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly classId: number;
}

export type SceneObjectCreatureStartingPackageStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: number;
      classIds?: readonly number[];
      table?: SceneObjectCreatureStartingPackageTable;
    }>;

export interface SceneObjectCreatureSkillListTable {
  readonly resourceName: "skills.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type SceneObjectCreatureSkillListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 0;
      rankNativeType: "byte";
      ranks: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: SceneObjectCreatureSkillListTable;
    }>;

export interface SceneObjectCreatureFeatListTable {
  readonly resourceName: "feat.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type SceneObjectCreatureFeatListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 1;
      featNativeType: "word";
      featIds: readonly number[];
      opaqueSiblingFieldCounts: readonly number[];
      table?: SceneObjectCreatureFeatListTable;
    }>;

export interface SceneObjectCreatureSpecialAbilityListTable {
  readonly resourceName: "spells.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface SceneObjectCreatureSpecialAbilityPhysicalEntry {
  readonly spellId: number;
  readonly spellFlags: number;
  readonly casterLevel: number;
  readonly opaqueSiblingFieldCount: number;
}

export type SceneObjectCreatureSpecialAbilityListStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 4;
      entries: readonly SceneObjectCreatureSpecialAbilityPhysicalEntry[];
      table?: SceneObjectCreatureSpecialAbilityListTable;
    }>;

export interface SceneObjectCreatureClassLevelEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
}

export type SceneObjectCreatureClassLevelState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      entries: readonly SceneObjectCreatureClassLevelEntry[];
    }>;

export interface SceneObjectCreatureClassIdentityEntry {
  readonly classId: number;
  readonly level: number;
  readonly opaqueSiblingFieldCount: number;
  readonly canonicalSpellListFieldCount: number;
  readonly spellEntryCount: number;
}

export interface SceneObjectCreatureClassesTable {
  readonly resourceName: "classes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export type SceneObjectCreatureClassIdentityState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "list";
      structTypeId: 2;
      classNativeType: "int";
      levelNativeType: "short";
      classListGraphSha256: string;
      entries: readonly SceneObjectCreatureClassIdentityEntry[];
      classesTable?: SceneObjectCreatureClassesTable;
    }>;

export interface SceneObjectCreaturePhenotypeTable {
  readonly resourceName: "phenotype.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
}

export type SceneObjectCreaturePhenotypeStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "int";
      value: number;
      table?: SceneObjectCreaturePhenotypeTable;
    }>;

export interface SceneObjectCreaturePortraitSelectorContext {
  readonly genderValue: number;
  readonly raceValue: number;
}

export interface SceneObjectCreaturePortraitTable {
  readonly resourceName: "portraits.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly baseResRef: string;
}

export type SceneObjectCreaturePortraitStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "word";
      value: number;
      selectorContext?: SceneObjectCreaturePortraitSelectorContext;
      table?: SceneObjectCreaturePortraitTable;
    }>;

export type SceneObjectCreatureChallengeRatingStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "float";
      value: number;
    }>;

export type SceneObjectCreatureAbilityScoreStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type SceneObjectCreatureNaturalArmorClassStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type SceneObjectCreatureSavingThrowBonusStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "short"; value: number }>;

export interface SceneObjectCreatureSavingThrowBonusesStorage {
  readonly fortitude: SceneObjectCreatureSavingThrowBonusStorage;
  readonly reflex: SceneObjectCreatureSavingThrowBonusStorage;
  readonly will: SceneObjectCreatureSavingThrowBonusStorage;
}

export type SceneObjectCreatureAlignmentAxisValue = 0 | 50 | 100;

export type SceneObjectCreatureAlignmentByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      nativeType: "byte";
      value: SceneObjectCreatureAlignmentAxisValue;
    }>;

export interface SceneObjectCreatureAlignmentStorage {
  readonly goodEvil: SceneObjectCreatureAlignmentByteStorage;
  readonly lawfulChaotic: SceneObjectCreatureAlignmentByteStorage;
}

export interface SceneObjectCreatureAbilityScoresStorage {
  readonly strength: SceneObjectCreatureAbilityScoreStorage;
  readonly dexterity: SceneObjectCreatureAbilityScoreStorage;
  readonly constitution: SceneObjectCreatureAbilityScoreStorage;
  readonly intelligence: SceneObjectCreatureAbilityScoreStorage;
  readonly wisdom: SceneObjectCreatureAbilityScoreStorage;
  readonly charisma: SceneObjectCreatureAbilityScoreStorage;
}

export type SceneObjectCreatureAppearanceColorStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export interface SceneObjectCreatureAppearanceColorsStorage {
  readonly skin: SceneObjectCreatureAppearanceColorStorage;
  readonly hair: SceneObjectCreatureAppearanceColorStorage;
  readonly tattoo1: SceneObjectCreatureAppearanceColorStorage;
  readonly tattoo2: SceneObjectCreatureAppearanceColorStorage;
}

export type SceneObjectCreatureBodyPartByteStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "byte"; value: number }>;

export type SceneObjectCreatureBodyPartWordStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; nativeType: "word"; value: number }>;

export type SceneObjectCreatureBodyPartStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      value: number;
      legacyByte: SceneObjectCreatureBodyPartByteStorage;
      wideWord: SceneObjectCreatureBodyPartWordStorage;
    }>;

export interface SceneObjectCreatureBodyPartsStorage {
  readonly rightFoot: SceneObjectCreatureBodyPartStorage;
  readonly leftFoot: SceneObjectCreatureBodyPartStorage;
  readonly rightShin: SceneObjectCreatureBodyPartStorage;
  readonly leftShin: SceneObjectCreatureBodyPartStorage;
  readonly leftThigh: SceneObjectCreatureBodyPartStorage;
  readonly rightThigh: SceneObjectCreatureBodyPartStorage;
  readonly pelvis: SceneObjectCreatureBodyPartStorage;
  readonly torso: SceneObjectCreatureBodyPartStorage;
  readonly belt: SceneObjectCreatureBodyPartStorage;
  readonly neck: SceneObjectCreatureBodyPartStorage;
  readonly rightForearm: SceneObjectCreatureBodyPartStorage;
  readonly leftForearm: SceneObjectCreatureBodyPartStorage;
  readonly rightBicep: SceneObjectCreatureBodyPartStorage;
  readonly leftBicep: SceneObjectCreatureBodyPartStorage;
  readonly rightShoulder: SceneObjectCreatureBodyPartStorage;
  readonly leftShoulder: SceneObjectCreatureBodyPartStorage;
  readonly rightHand: SceneObjectCreatureBodyPartStorage;
  readonly leftHand: SceneObjectCreatureBodyPartStorage;
  readonly head: SceneObjectCreatureBodyPartStorage;
}

export interface SceneObjectCreatureHitPointRacialTypesBinding {
  readonly resourceName: "racialtypes.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
  readonly rowIndex: number;
  readonly constitutionAdjust: number;
}

export type SceneObjectCreatureHitPointState =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      hitPoints: Readonly<{ nativeType: "short"; value: number }>;
      currentHitPoints: Readonly<{ nativeType: "short"; value: number }>;
      maxHitPoints: Readonly<{ nativeType: "short"; value: number }>;
      constitution: Readonly<{ nativeType: "byte"; value: number }>;
      race: Readonly<{ nativeType: "byte"; value: number }>;
      classLevels: readonly number[];
      featRow40Present: boolean;
      racialTypes?: SceneObjectCreatureHitPointRacialTypesBinding;
    }>;

export interface ScenePlaceableTrapTypeTableDescriptor {
  readonly resourceName: "traps.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface ScenePlaceableTrapTypeRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly trapNameStrRef?: number;
  readonly setDc: number;
  readonly detectDcMod: number;
  readonly disarmDcMod: number;
  readonly displayName: string;
  readonly displaySource: "strref" | "label" | "row_index";
}

export interface ScenePlaceableTrapTypeCatalog {
  readonly descriptor: ScenePlaceableTrapTypeTableDescriptor;
  readonly rows: readonly ScenePlaceableTrapTypeRow[];
}

export interface SceneObjectPlaceableTrapTypeProvenance {
  readonly expectedValue: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ScenePlaceableBodyBagTableDescriptor {
  readonly resourceName: "bodybag.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface ScenePlaceableBodyBagRow {
  readonly rowIndex: number;
  readonly label?: string;
  readonly nameStrRef: number;
  readonly displayName: string;
  readonly displaySource: "strref" | "label" | "row_index";
}

export interface ScenePlaceableBodyBagCatalog {
  readonly descriptor: ScenePlaceableBodyBagTableDescriptor;
  readonly rows: readonly ScenePlaceableBodyBagRow[];
}

export interface SceneObjectPlaceableBodyBagProvenance {
  readonly expectedValue: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ScenePlaceablePortraitTableDescriptor {
  readonly resourceName: "portraits.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface ScenePlaceablePortraitRow {
  readonly rowIndex: number;
  readonly baseResRef: string;
}

export interface ScenePlaceablePortraitCatalog {
  readonly descriptor: ScenePlaceablePortraitTableDescriptor;
  readonly rows: readonly ScenePlaceablePortraitRow[];
}

export interface SceneCreaturePortraitRow {
  readonly rowIndex: number;
  readonly baseResRef: string;
  readonly sex: number;
  readonly race: number;
  readonly plot: 0;
}

export interface SceneCreaturePortraitCatalog {
  readonly descriptor: ScenePlaceablePortraitTableDescriptor;
  readonly rows: readonly SceneCreaturePortraitRow[];
}

export interface SceneObjectPlaceablePortraitProvenance {
  readonly expectedValue: number;
  readonly tableSha256: string;
  readonly tableRowCount: number;
}

export interface ScenePlaceableFactionCatalogDescriptor {
  readonly resourceName: "repute.fac";
  readonly sourceObjectKey: string;
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly factionCount: number;
}

export interface ScenePlaceableFactionRow {
  readonly factionId: number;
  readonly name: string;
  readonly parentFactionId: number;
  readonly isGlobal: boolean;
}

export interface ScenePlaceableFactionCatalog {
  readonly descriptor: ScenePlaceableFactionCatalogDescriptor;
  readonly rows: readonly ScenePlaceableFactionRow[];
}

export interface SceneObjectPlaceableFactionProvenance {
  readonly expectedValue: number;
  readonly catalogSha256: string;
  readonly catalogFactionCount: number;
}

export type SceneObjectCreatureFactionProvenance =
  SceneObjectPlaceableFactionProvenance;

export type SceneObjectEncounterFactionProvenance =
  SceneObjectPlaceableFactionProvenance;

export interface SceneEncounterDifficultyPair {
  readonly difficulty: number;
  readonly difficultyIndex: number;
}

export interface SceneEncounterDifficultyCatalogDescriptor {
  readonly resourceName: "encdifficulty.2da";
  readonly sourceObjectKey: string;
  readonly sourceLayer: "module" | "hak" | "vanilla";
  readonly sha256: string;
  readonly sizeBytes: number;
  readonly rowCount: number;
}

export interface SceneEncounterDifficultyCatalogRow {
  readonly rowIndex: number;
  readonly strRef: number;
  readonly value: number;
  readonly displayName: string;
  readonly displaySource: "strref" | "row_index";
}

export interface SceneEncounterDifficultyCatalog {
  readonly schemaVersion: "area-encounter-difficulty-catalog.v1";
  readonly descriptor: SceneEncounterDifficultyCatalogDescriptor;
  readonly rows: readonly SceneEncounterDifficultyCatalogRow[];
}

export interface SceneObjectEncounterDifficultyProvenance {
  readonly expectedValue: SceneEncounterDifficultyPair;
  readonly catalogSha256: string;
  readonly catalogRowCount: number;
}

export interface SceneObjectNativeLocalizedStringEntry {
  readonly languageId: number;
  readonly textBytesBase64: string;
}

export type SceneObjectNativeLocalizedStringStorage =
  | Readonly<{ present: false }>
  | Readonly<{
      present: true;
      strRef: number;
      entries: readonly SceneObjectNativeLocalizedStringEntry[];
    }>;

export interface SceneObjectWaypointMapNoteStorage {
  readonly hasMapNoteByte: 0 | 1;
  readonly mapNoteStorage: SceneObjectNativeLocalizedStringStorage;
  readonly mapNoteEnabledByte: 0 | 1;
}

export interface SceneObjectWaypointMapNoteValue {
  readonly hasMapNote: boolean;
  readonly mapNoteText: string;
  readonly mapNoteEnabled: boolean;
}

export interface SceneObjectWaypointAppearanceProvenance {
  readonly present: true;
  readonly nativeType: "byte";
  readonly value: number;
  readonly table: Readonly<{
    resourceName: "waypoint.2da";
    sourceObjectKey: string;
    sourceLayer: "module" | "hak" | "vanilla";
    sha256: string;
    sizeBytes: number;
    rowCount: number;
    rowIndex: number;
  }>;
}

export type SceneObjectPlaceableLocalizedStringEntry = SceneObjectNativeLocalizedStringEntry;
export type SceneObjectPlaceableLocalizedStringStorage = SceneObjectNativeLocalizedStringStorage;

export interface SceneObjectPlaceableLocalizedStrings {
  readonly locName: SceneObjectPlaceableLocalizedStringStorage;
  readonly description: SceneObjectPlaceableLocalizedStringStorage;
}

export interface SceneObjectCreatureNameLocalizedStrings {
  readonly firstName: SceneObjectNativeLocalizedStringStorage;
  readonly lastName: SceneObjectNativeLocalizedStringStorage;
  readonly description?: SceneObjectNativeLocalizedStringStorage;
}

export interface SceneObjectItemLocalizedStrings {
  readonly localizedName: SceneObjectNativeLocalizedStringStorage;
  readonly description: SceneObjectNativeLocalizedStringStorage;
  readonly identifiedDescription: SceneObjectNativeLocalizedStringStorage;
}

export type SceneObjectCreatureBinaryFlagStorage =
  | Readonly<{ present: false }>
  | Readonly<{ present: true; value: 0 | 1 }>;

export interface SceneObjectCreatureAdvancedFlagsStorage {
  readonly disarmable: SceneObjectCreatureBinaryFlagStorage;
  readonly plot: SceneObjectCreatureBinaryFlagStorage;
  readonly immortal: SceneObjectCreatureBinaryFlagStorage;
  readonly lootable: SceneObjectCreatureBinaryFlagStorage;
  readonly noPermanentDeath: SceneObjectCreatureBinaryFlagStorage;
}

export type SceneObjectCreatureBodyBagProvenance =
  SceneObjectPlaceableBodyBagProvenance;

export interface SceneObjectCreatureDecayTimeProvenance {
  readonly expectedMilliseconds: number;
}

export interface SceneObjectPolygonPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SceneObjectPolygonGeometry {
  readonly coordinateSpace: "native_local";
  readonly points: readonly SceneObjectPolygonPoint[];
}

export interface SceneObjectSourceMetadata {
  type: "seed" | "aurora_git" | "aurora_blueprint";
  areaId?: string;
  sourceObjectId?: string;
  sourceIndex?: number;
  sourceKind?:
    | "placeable"
    | "door"
    | "creature"
    | "encounter"
    | "item"
    | "sound"
    | "store"
    | "trigger"
    | "waypoint";
  templateId?: string;
  templateResRef?: string;
  sourceProfileId?: string;
  sourceObjectKey?: string;
  sourceSizeBytes?: number;
  sourceEtag?: string;
  sourceFileType?: string;
  sourceFileVersion?: string;
  sourceStructTypeId?: number;
  sourceModelResRef?: string;
  appearanceType?: number;
  genericType?: number;
  localizedName?: string;
  description?: string;
  creatureMetadata?: Record<string, string | number | boolean>;
  creatureTag?: SceneObjectCreatureTagStorage;
  creatureConversation?: SceneObjectCreatureConversationStorage;
  creatureTemplateResRef?: SceneObjectCreatureTemplateResRefProvenance;
  creatureSpecialIdentityStrings?: SceneObjectCreatureSpecialIdentityStringsProvenance;
  creatureScriptResRefs?: SceneObjectCreatureScriptResRefsProvenance;
  creatureInterruptable?: SceneObjectCreatureInterruptableStorage;
  creatureAppearance?: SceneObjectCreatureAppearanceStorage;
  creatureGender?: SceneObjectCreatureGenderStorage;
  creatureAppendages?: SceneObjectCreatureAppendagesStorage;
  creaturePerceptionRange?: SceneObjectCreaturePerceptionRangeStorage;
  creatureWalkRate?: SceneObjectCreatureWalkRateStorage;
  creatureSoundSetFile?: SceneObjectCreatureSoundSetFileStorage;
  creatureStartingPackage?: SceneObjectCreatureStartingPackageStorage;
  creatureSkillList?: SceneObjectCreatureSkillListStorage;
  creatureFeatList?: SceneObjectCreatureFeatListStorage;
  creatureSpecialAbilityList?: SceneObjectCreatureSpecialAbilityListStorage;
  creatureVariables?: SceneObjectCreatureVariableProvenance;
  creatureEditorComment?: string;
  itemTag?: SceneObjectItemTagStorage;
  triggerTag?: SceneObjectTriggerTagStorage;
  triggerTemplateResRef?: SceneObjectTriggerTemplateResRefStorage;
  triggerLocalizedNameStorage?: SceneObjectNativeLocalizedStringStorage;
  triggerEditorComment?: string;
  triggerScriptResRefsStorage?: SceneObjectTriggerScriptResRefsStorage;
  triggerTransitionStorage?: TriggerTransitionStorage;
  encounterTag?: SceneObjectEncounterTagStorage;
  encounterTemplateResRef?: SceneObjectEncounterTemplateResRefStorage;
  waypointTag?: SceneObjectWaypointTagStorage;
  waypointTemplateResRef?: SceneObjectWaypointTemplateResRefStorage;
  waypointLocalizedNameStorage?: SceneObjectNativeLocalizedStringStorage;
  waypointDescriptionStorage?: SceneObjectNativeLocalizedStringStorage;
  waypointMapNoteStorage?: SceneObjectWaypointMapNoteStorage;
  waypointAppearance?: SceneObjectWaypointAppearanceProvenance;
  waypointVariables?: SceneObjectWaypointVariableProvenance;
  waypointEditorComment?: string;
  encounterActiveStorage?: SceneObjectEncounterActiveStorage;
  encounterPlayerOnlyStorage?: SceneObjectEncounterPlayerOnlyStorage;
  encounterResetStorage?: SceneObjectEncounterResetStorage;
  encounterResetTimeStorage?: SceneObjectEncounterResetTimeStorage;
  encounterSpawnOptionStorage?: SceneObjectEncounterSpawnOptionStorage;
  encounterRespawnsStorage?: SceneObjectEncounterRespawnsStorage;
  encounterCreatureCountsStorage?: SceneObjectEncounterCreatureCountStorage;
  encounterScriptResRefsStorage?: SceneObjectEncounterScriptResRefsStorage;
  encounterFaction?: SceneObjectEncounterFactionProvenance;
  encounterDifficulty?: SceneObjectEncounterDifficultyProvenance;
  encounterLocalizedNameStorage?: SceneObjectNativeLocalizedStringStorage;
  encounterVariables?: SceneObjectEncounterVariableProvenance;
  encounterCreatureList?: SceneObjectEncounterCreatureListProvenance;
  encounterSpawnPoints?: SceneObjectEncounterSpawnPointListProvenance;
  encounterEditorComment?: string;
  itemTemplateResRef?: SceneObjectItemTemplateResRefStorage;
  itemEditorComment?: string;
  storeEditorComment?: string;
  storeCommerce?: AreaStoreCommerceValue;
  storeScriptResRefs?: AreaStoreScriptResRefsValue;
  storeVariables?: SceneObjectStoreVariableProvenance;
  storeRestrictions?: AreaStoreRestrictionsProvenance;
  storeInventory?: AreaStoreInventoryProvenance;
  itemInstanceState?: SceneObjectItemInstanceStateStorage;
  itemLocalizedStrings?: SceneObjectItemLocalizedStrings;
  itemVariables?: SceneObjectItemVariableProvenance;
  itemPropertyList?: SceneObjectItemPropertyListProvenance;
  itemInventoryItems?: readonly SceneObjectItemInventorySourceEntry[];
  itemVisualTransform?: SceneObjectItemVisualTransformStorage;
  itemBaseAppearance?: SceneObjectItemBaseAppearanceProvenance;
  creatureClassLevelState?: SceneObjectCreatureClassLevelState;
  creatureClassIdentityState?: SceneObjectCreatureClassIdentityState;
  creaturePhenotype?: SceneObjectCreaturePhenotypeStorage;
  creaturePortrait?: SceneObjectCreaturePortraitStorage;
  creatureChallengeRating?: SceneObjectCreatureChallengeRatingStorage;
  creatureAbilityScores?: SceneObjectCreatureAbilityScoresStorage;
  creatureAppearanceColors?: SceneObjectCreatureAppearanceColorsStorage;
  creatureBodyParts?: SceneObjectCreatureBodyPartsStorage;
  creatureHitPointState?: SceneObjectCreatureHitPointState;
  creatureNaturalArmorClass?: SceneObjectCreatureNaturalArmorClassStorage;
  creatureSavingThrowBonuses?: SceneObjectCreatureSavingThrowBonusesStorage;
  creatureAlignment?: SceneObjectCreatureAlignmentStorage;
  creatureFaction?: SceneObjectCreatureFactionProvenance;
  creatureLocalizedStrings?: SceneObjectCreatureNameLocalizedStrings;
  creatureAdvancedFlags?: SceneObjectCreatureAdvancedFlagsStorage;
  creatureBodyBag?: SceneObjectCreatureBodyBagProvenance;
  creatureDecayTime?: SceneObjectCreatureDecayTimeProvenance;
  creatureInventoryItems?: readonly SceneObjectCreatureInventorySourceEntry[];
  creatureEquippedItems?: readonly SceneObjectCreatureEquipmentSourceEntry[];
  placeableOnUsed?: string;
  placeableScriptResRefs?: Partial<Omit<SceneObjectPlaceableScriptSlots, "onUsed">>;
  placeableTrapScriptResRefs?: Partial<
    Pick<SceneObjectPlaceableTrapSettings, "onDisarmScript" | "onTrapTriggeredScript">
  >;
  placeableStatic?: boolean;
  placeableUseable?: boolean;
  placeablePlot?: boolean;
  placeableHasInventory?: boolean;
  placeableLockSettings?: Partial<SceneObjectPlaceableLockSettings>;
  placeableInventoryItems?: readonly SceneObjectPlaceableInventorySourceEntry[];
  placeableDurabilitySaveBytes?: Readonly<SceneObjectPlaceableDurabilitySaveBytes>;
  placeableConversation?: string;
  placeableInterruptable?: number;
  placeableTrapSettings?: SceneObjectPlaceableTrapByteSettings;
  placeableAnimationState?: number;
  placeableEditorComment?: string;
  placeableBasicIdentity?: SceneObjectPlaceableBasicIdentity;
  placeableTrapType?: SceneObjectPlaceableTrapTypeProvenance;
  placeableBodyBag?: SceneObjectPlaceableBodyBagProvenance;
  placeablePortrait?: SceneObjectPlaceablePortraitProvenance;
  placeableFaction?: SceneObjectPlaceableFactionProvenance;
  placeableVariables?: SceneObjectPlaceableVariableProvenance;
  placeableTemplateResRef?: string;
  placeableLocalizedStrings?: SceneObjectPlaceableLocalizedStrings;
  placeableHitPointState?: Readonly<{
    hitPoints: number;
    currentHitPoints: number;
  }>;
  doorTransitionStorage?: AreaDoorTransitionStorage;
  doorHook?: SceneObjectDoorHookSourceMetadata;
  polygonGeometry?: SceneObjectPolygonGeometry;
  soundIntervalVariationStorage?: AreaSoundIntervalVariationStorage;
  soundVolumeStorage?: AreaSoundVolumeStorage;
  soundActiveStorage?: AreaSoundActiveStorage;
  soundPlayOrderStorage?: AreaSoundPlayOrderStorage;
  soundPlayStyleStorage?: AreaSoundPlayStyleStorage;
  soundPlaybackStorage?: AreaSoundPlaybackStorage;
  soundProfileStorage?: AreaSoundProfileStorage;
  soundScheduleStorage?: AreaSoundScheduleStorage;
}

export interface SceneObject {
  id: string;
  kind: SceneObjectKind;
  name?: string;
  resRef: string;
  tag: string;
  previewImageUrl?: string;
  isStatic?: boolean;
  placeableProperties?: SceneObjectPlaceableProperties;
  doorProperties?: SceneObjectDoorProperties;
  creatureProperties?: SceneObjectCreatureProperties;
  encounterProperties?: SceneObjectEncounterProperties;
  itemProperties?: SceneObjectItemProperties;
  storeProperties?: SceneObjectStoreProperties;
  soundPositioning?: SceneObjectSoundPositioning;
  soundIntervalVariation?: AreaSoundIntervalVariationStorage;
  soundVolume?: AreaSoundVolumeStorage;
  soundActive?: AreaSoundActiveStorage;
  encounterActive?: SceneObjectEncounterActiveStorage;
  encounterPlayerOnly?: SceneObjectEncounterPlayerOnlyStorage;
  encounterReset?: SceneObjectEncounterResetStorage;
  encounterResetTime?: SceneObjectEncounterResetTimeStorage;
  encounterSpawnOption?: SceneObjectEncounterSpawnOptionStorage;
  encounterRespawns?: SceneObjectEncounterRespawnsStorage;
  encounterCreatureCounts?: SceneObjectEncounterCreatureCountStorage;
  encounterScriptResRefs?: SceneObjectEncounterScriptResRefsStorage;
  encounterFactionId?: number;
  encounterDifficulty?: SceneEncounterDifficultyPair;
  encounterLocalizedName?: string;
  encounterTemplateResRef?: string;
  triggerTemplateResRef?: string;
  triggerLocalizedName?: string;
  triggerEditorComment?: string;
  triggerScriptResRefs?: SceneObjectTriggerScriptResRefsStorage;
  triggerTransitionStorage?: TriggerTransitionStorage;
  waypointLocalizedName?: string;
  waypointTemplateResRef?: string;
  waypointDescription?: string;
  waypointMapNote?: SceneObjectWaypointMapNoteValue;
  waypointAppearance?: number;
  waypointVariables?: SceneObjectWaypointVariableTargetEntry[];
  waypointEditorComment?: string;
  soundPlayOrder?: AreaSoundPlayOrderStorage;
  soundPlayStyle?: AreaSoundPlayStyleStorage;
  soundPlayback?: AreaSoundPlaybackStorage;
  soundProfile?: AreaSoundProfileStorage;
  soundSchedule?: AreaSoundScheduleStorage;
  doorTransition?: SceneObjectDoorTransitionPayload;
  polygonGeometry?: SceneObjectPolygonGeometry;
  vfxPayload?: SceneObjectVfxPreservePayload;
  source?: SceneObjectSourceMetadata;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform: SceneObjectVisualTransform;
}

export interface AreaSceneObjectCounts {
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

export interface AreaSceneTileSource {
  type: "seed_placeholder" | "aurora_tile_list" | "blocked_missing_tile_data";
  tilesetResRef?: string;
  tileCount: number;
  fallbackReason?: string;
}

export interface AreaSceneTextureAtlas {
  atlasId: string;
  cacheKey: string;
  strategy: "blob-cache";
  objectKey?: string;
  contentType?: string;
  sizeBytes?: number;
  etag?: string;
}

export interface AuroraAreaVfxCollisionContract {
  version: "aurora-area-vfx-collision/v1";
  coordinateSpace: "aurora-area-z-up";
  unitsPerTile: 10;
  status: "ready" | "partial" | "unavailable";
  fingerprint: string;
  resources: Array<{
    resourceId: string;
    modelResRef: string;
    sourceObjectKey: string;
    sourceLayer: "module" | "hak" | "vanilla";
    sourceHash: string;
    walkmesh: AuroraVfxJsonValue;
  }>;
  instances: Array<{
    instanceId: string;
    resourceId: string;
    translation: { x: number; y: number; z: number };
    orientationQuarterTurns: number;
  }>;
  diagnostics: SceneObjectVfxDiagnostic[];
}

export interface AuroraWorldTimerContract {
  version: "aurora-worldtimer/v1";
  status: "ready";
  source: "module-ifo";
  sourceObjectKey: string;
  sourceHash: string;
  fingerprint: string;
  minutesPerHour: number;
  startHour: number;
  startTimeOfDayMs: number;
  dayLengthMs: number;
  tickUnit: "milliseconds";
  advanceMode: "scene-animation-delta";
}

export interface SceneAuroraAreaEditingPayload {
  state: AuroraAreaEditingState;
  definition: AuroraAreaTilesetDefinition;
  terrainBrush: string;
  selectedGroupId?: string;
  groupOrientation?: 0 | 1 | 2 | 3;
}

export interface AreaScene {
  sceneId: string;
  areaName: string;
  width: number;
  height: number;
  biome?: string;
  tags?: string[];
  areaComments?: string;
  areaEventScripts?: Readonly<Partial<Record<
    "onEnter" | "onExit" | "onHeartbeat" | "onUserDefined",
    string
  >>>;
  areaBasicIdentity?: Readonly<{
    name?: string;
    nameProfile?: "simple_inline_ascii" | "multi_entry_inline_ascii";
    nameEntries?: readonly Readonly<{ languageId: number; text: string }>[];
    tag?: string;
  }>;
  areaAdvancedFlags?: Readonly<{
    terrainType?: Readonly<{
      interior: boolean;
      natural: boolean;
      subterranean: boolean;
    }>;
    playerVsPlayer?: 0 | 1 | 2 | 3;
    noRest?: boolean;
    listenCheckModifier?: number;
    spotCheckModifier?: number;
    loadingScreenId?: number;
  }>;
  areaVariables?: AuroraVariableTargetEntry[];
  areaVisualEnvironment?: AreaVisualEnvironment;
  areaVisualEnvironmentScalarControls?: AreaVisualEnvironmentScalarControls;
  areaVisualEnvironmentCatalogSelection?: AreaVisualEnvironmentCatalogSelection;
  areaAudioEnvironment?: AreaAudioEnvironment;
  areaAudioEnvironmentCatalogs?: EffectiveAreaAudioCatalogBundle;
  areaVisualEnvironmentCatalogs?: EffectiveAreaVisualEnvironmentCatalogBundle;
  areaLoadingScreenCatalog?: EffectiveAreaLoadingScreenCatalog;
  moduleStartLocation?: Readonly<{
    areaResRef: string;
    x: number;
    y: number;
    z: number;
    directionX: number;
    directionY: number;
  }>;
  moduleStartLocationTargets?: readonly string[];
  areaTag?: string;
  benchmark?: boolean;
  previewImageUrl?: string;
  textureAtlas?: AreaSceneTextureAtlas;
  composition?: AreaSceneObjectCounts;
  backendUpdatedAt?: string;
  tileSource?: AreaSceneTileSource;
  lighting?: SceneAreaGlobalLighting;
  auroraVfxCollision?: AuroraAreaVfxCollisionContract;
  auroraWorldTimer?: AuroraWorldTimerContract;
  placeableTrapTypeCatalog?: ScenePlaceableTrapTypeCatalog;
  placeableBodyBagCatalog?: ScenePlaceableBodyBagCatalog;
  placeablePortraitCatalog?: ScenePlaceablePortraitCatalog;
  creaturePortraitCatalog?: SceneCreaturePortraitCatalog;
  itemBaseItemCatalog?: SceneItemBaseItemCatalog;
  placeableFactionCatalog?: ScenePlaceableFactionCatalog;
  encounterDifficultyCatalog?: SceneEncounterDifficultyCatalog;
  auroraAreaEditing?: SceneAuroraAreaEditingPayload;
  tiles: SceneTile[];
  objects: SceneObject[];
  walkmesh?: WalkmeshDomainModel;
  updatedAtUnixMs: number;
  source: "seed" | "local_draft" | "aurora_area";
}

export interface SceneHistoryState {
  past: AreaScene[];
  present: AreaScene;
  future: AreaScene[];
}
