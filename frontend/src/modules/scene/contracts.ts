import type { WalkmeshDomainModel } from "./domain/walkmesh";

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
  | "items"
  | "placeables"
  | "sounds";

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
}

export interface SceneObjectCreatureClassEntry {
  className: string;
  level: number;
}

export interface SceneObjectCreatureSkillEntry {
  skill: string;
  rank: number;
}

export interface SceneObjectCreatureFeatEntry {
  name: string;
  type: string;
  assigned: boolean;
}

export interface SceneObjectCreatureSpellEntry {
  prepared: boolean;
  name: string;
  spellLevel: number;
  castingLevel: number;
}

export interface SceneObjectCreatureSpecialAbilityEntry {
  name: string;
  type: string;
  casterLevel: number;
  uses: number;
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
  disarmable: boolean;
  plot: boolean;
  leavesLootableCorpse: boolean;
  noPermanentDeath: boolean;
  immortal: boolean;
  treasureModel: string;
  corpseDecayTimeSeconds: number;
  faction: string;
  subrace: string;
  deity: string;
  challengeRatingAdjustment: number;
  soundSet: string;
  perceptionRange: string;
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
  statistics?: SceneObjectCreatureStatisticsSettings;
  appearanceSettings?: SceneObjectCreatureAppearanceSettings;
  classEntries?: SceneObjectCreatureClassEntry[];
  skills?: SceneObjectCreatureSkillEntry[];
  scriptSlots?: SceneObjectCreatureScriptSlots;
  advancedSettings?: SceneObjectCreatureAdvancedSettings;
  feats?: SceneObjectCreatureFeatEntry[];
  spells?: SceneObjectCreatureSpellEntry[];
  specialAbilities?: SceneObjectCreatureSpecialAbilityEntry[];
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
}

export interface SceneObjectVfxPreservePayload {
  // Preserve-only placeholder until VFX editor/runtime lane is implemented.
  profile: string;
  emitter: string;
  script: string;
  flags: Record<string, boolean>;
  extra: Record<string, ScenePreservePrimitive>;
}

export interface SceneTile {
  id: string;
  row: number;
  col: number;
  terrain: TerrainBrushKind;
  orientation: 0 | 1 | 2 | 3;
  rotateTexture: boolean;
  plot: boolean;
}

export interface SceneObjectVisualTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  pitch: number;
  roll: number;
  yaw: number;
}

export interface SceneObject {
  id: string;
  kind: SceneObjectKind;
  name?: string;
  resRef: string;
  tag: string;
  isStatic?: boolean;
  placeableProperties?: SceneObjectPlaceableProperties;
  doorProperties?: SceneObjectDoorProperties;
  creatureProperties?: SceneObjectCreatureProperties;
  soundPositioning?: SceneObjectSoundPositioning;
  doorTransition?: SceneObjectDoorTransitionPayload;
  vfxPayload?: SceneObjectVfxPreservePayload;
  x: number;
  y: number;
  z: number;
  bearing: number;
  visualTransform: SceneObjectVisualTransform;
}

export interface AreaScene {
  sceneId: string;
  areaName: string;
  width: number;
  height: number;
  tiles: SceneTile[];
  objects: SceneObject[];
  walkmesh?: WalkmeshDomainModel;
  updatedAtUnixMs: number;
  source: "seed" | "local_draft";
}

export interface SceneHistoryState {
  past: AreaScene[];
  present: AreaScene;
  future: AreaScene[];
}
