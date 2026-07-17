import type { WalkmeshDomainModel } from "./domain/walkmesh";
import type { AuroraAreaEditingState, AuroraAreaTilesetDefinition } from "./domain/auroraAreaEditing";

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
  // Preserve-only payload for Aurora parity. Stored and normalized defensively,
  // but runtime/editor behavior must not infer new semantics from these fields yet.
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
  // Aurora-first parity: description/comments tab payload.
  description?: string;
  comments?: string;
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

export interface SceneObjectPlaceableAdvancedSettings {
  blueprintResRef: string;
  belongsToFaction: string;
  conversation: string;
  noInterrupt: boolean;
  portraitResRef: string;
  initialState: string;
  treasureModel: string;
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

export interface SceneObjectCreatureTemplateEntry {
  templateId?: number;
}

export interface SceneObjectCreatureSkillEntry {
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

export type SceneObjectPlaceableInventoryItemReference =
  SceneObjectCreatureInventoryItemReference;

export interface SceneObjectCreatureEquippedItemReference {
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
  treasureModel: string;
  corpseDecayTimeSeconds: number;
  faction: string;
  subrace: string;
  deity: string;
  challengeRatingAdjustment: number;
  soundSet: string;
  soundSetFile?: number;
  perceptionRange: string;
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
  phenotype: string;
  gender: string;
  description: string;
  challengeRating: number;
  portraitResRef: string;
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
  templateEntries?: SceneObjectCreatureTemplateEntry[];
  skills?: SceneObjectCreatureSkillEntry[];
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
  extra?: Record<string, ScenePreservePrimitive>;
}

export type SceneObjectVfxSourceKind =
  | "unknown"
  | "placeable_preview"
  | "visualeffects_2da"
  | "effect_instance";

export type SceneObjectVfxCanonicalStatus =
  | "unmapped"
  | "preview_only"
  | "canonical";

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
  phaseSchedule?: AuroraVfxJsonValue;
  dependencyGraph?: AuroraVfxJsonValue;
  runtimeState?: AuroraVfxJsonValue;
  renderContract?: AuroraVfxJsonValue;
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
  scripts?: Record<string, string>;
}

export interface SceneObjectSourceMetadata {
  type: "seed" | "aurora_git";
  areaId?: string;
  sourceObjectId?: string;
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
  soundPositioning?: SceneObjectSoundPositioning;
  doorTransition?: SceneObjectDoorTransitionPayload;
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
  benchmark?: boolean;
  previewImageUrl?: string;
  textureAtlas?: AreaSceneTextureAtlas;
  composition?: AreaSceneObjectCounts;
  backendUpdatedAt?: string;
  tileSource?: AreaSceneTileSource;
  lighting?: SceneAreaGlobalLighting;
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
