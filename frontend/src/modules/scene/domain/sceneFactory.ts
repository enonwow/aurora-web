import type {
  AreaScene,
  SceneObjectCreatureAdvancedSettings,
  SceneObjectCreatureAppearanceSettings,
  SceneObjectCreatureClassEntry,
  SceneObjectCreatureFeatEntry,
  SceneObjectCreatureProperties,
  SceneObjectCreatureScriptSlots,
  SceneObjectCreatureSkillEntry,
  SceneObjectCreatureSpecialAbilityEntry,
  SceneObjectCreatureSpellEntry,
  SceneObjectCreatureStatisticsSettings,
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectPlaceableLockSettings,
  SceneObjectDoorTransitionPayload,
  SceneObject,
  SceneObjectPlaceableDisabledFlags,
  SceneObjectPlaceableProperties,
  SceneObjectPlaceableScriptSlots,
  SceneObjectPlaceableTrapSettings,
  SceneObjectSoundPositioningPreservePayload,
  SceneObjectSoundPositioning,
  SceneObjectVfxPreservePayload,
  ScenePreservePrimitive,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import { createWalkmeshDomainModel } from "./walkmesh";
import {
  normalizeSoundPositioning,
  normalizeSoundPositioningPreservePayload
} from "./sound";

const TERRAIN_SEQUENCE: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

export const LEGACY_SEED_SCENE_WIDTH_TILES = 18;
export const LEGACY_SEED_SCENE_HEIGHT_TILES = 18;
export const DEFAULT_SEED_SCENE_WIDTH_TILES = 2;
export const DEFAULT_SEED_SCENE_HEIGHT_TILES = 2;

const DEFAULT_PLACEABLE_PROPERTIES: SceneObjectPlaceableProperties = {
  plot: false,
  useable: false,
  hasInventory: false
};

const DEFAULT_PLACEABLE_SCRIPT_SLOTS: SceneObjectPlaceableScriptSlots = {
  onClick: "",
  onClosed: "",
  onDamaged: "",
  onDeath: "",
  onHeartbeat: "",
  onInvDisturbed: "",
  onLock: "",
  onMeleeAttacked: "",
  onOpen: "",
  onSpellCastAt: "",
  onUnlock: "",
  onUsed: "",
  onUserDefined: ""
};

const DEFAULT_PLACEABLE_DISABLED_FLAGS: SceneObjectPlaceableDisabledFlags = {
  plot: true,
  useable: true,
  hasInventory: true
};

const DEFAULT_PLACEABLE_LOCK_SETTINGS: SceneObjectPlaceableLockSettings = {
  locked: false,
  canRelock: false,
  autoRemoveKeyAfterUse: false,
  keyRequiredToUnlockOrLock: false,
  openLockDc: 18,
  closeLockDc: 0,
  keyTag: ""
};

const DEFAULT_PLACEABLE_TRAP_SETTINGS: SceneObjectPlaceableTrapSettings = {
  isTrapped: false,
  trapType: "Spike Trap, Minor",
  detectionDc: 0,
  disarmDc: 15,
  oneShot: true,
  detectable: true,
  disarmable: true,
  onDisarmScript: "",
  onTrapTriggeredScript: "",
  setDc: 5,
  detectDcModWhenSetByRogue: 10,
  disarmDcModWhenSetByRogue: 22
};

const DEFAULT_PLACEABLE_ADVANCED_SETTINGS: SceneObjectPlaceableAdvancedSettings = {
  blueprintResRef: "",
  belongsToFaction: "Hostile",
  conversation: "",
  noInterrupt: false,
  portraitResRef: "",
  initialState: "Default",
  treasureModel: "Default"
};

const DEFAULT_CREATURE_PROPERTIES: SceneObjectCreatureProperties = {
  firstName: "",
  lastName: "",
  race: "Aberration",
  appearance: "",
  phenotype: "",
  gender: "None",
  description: "",
  challengeRating: 1,
  portraitResRef: "",
  conversation: "",
  noInterrupt: false,
  comments: ""
};

const DEFAULT_CREATURE_STATISTICS: SceneObjectCreatureStatisticsSettings = {
  abilityScores: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10
  },
  racialModifiers: {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  },
  saves: {
    fortitudeBase: 0,
    fortitudeBonus: 0,
    reflexBase: 0,
    reflexBonus: 0,
    willBase: 0,
    willBonus: 0
  },
  naturalArmorClass: 10,
  baseArmorClass: 10,
  dexterityBonus: 0,
  sizeModifier: 0,
  baseHitPoints: 10,
  hitPointBonuses: 0,
  movementRate: "Default"
};

const DEFAULT_CREATURE_APPEARANCE_SETTINGS: SceneObjectCreatureAppearanceSettings = {
  partBasedAppearance: false,
  head: "",
  neck: "",
  torso: "",
  pelvis: "",
  rightBicep: "",
  leftBicep: "",
  rightForearm: "",
  leftForearm: "",
  rightHand: "",
  leftHand: "",
  rightThigh: "",
  leftThigh: "",
  rightShin: "",
  leftShin: "",
  rightFoot: "",
  leftFoot: "",
  wings: "",
  tail: ""
};

const DEFAULT_CREATURE_SCRIPT_SLOTS: SceneObjectCreatureScriptSlots = {
  onBlocked: "",
  onCombatRoundEnd: "",
  onConversation: "",
  onDamaged: "",
  onDeath: "",
  onDisturbed: "",
  onHeartbeat: "",
  onPerception: "",
  onPhysicalAttacked: "",
  onRested: "",
  onSpawn: "",
  onSpellCastAt: "",
  onUserDefined: ""
};

const DEFAULT_CREATURE_ADVANCED_SETTINGS: SceneObjectCreatureAdvancedSettings = {
  blueprintResRef: "",
  disarmable: false,
  plot: false,
  leavesLootableCorpse: false,
  noPermanentDeath: false,
  immortal: false,
  treasureModel: "Default",
  corpseDecayTimeSeconds: 5,
  faction: "Hostile",
  subrace: "",
  deity: "",
  challengeRatingAdjustment: 0,
  soundSet: "",
  perceptionRange: "Default"
};

const DEFAULT_CREATURE_CLASS_ENTRIES: SceneObjectCreatureClassEntry[] = [
  { className: "Aberration", level: 1 }
];

const DEFAULT_CREATURE_SKILL_ENTRIES: SceneObjectCreatureSkillEntry[] = [];
const DEFAULT_CREATURE_FEAT_ENTRIES: SceneObjectCreatureFeatEntry[] = [];
const DEFAULT_CREATURE_SPELL_ENTRIES: SceneObjectCreatureSpellEntry[] = [];
const DEFAULT_CREATURE_SPECIAL_ABILITY_ENTRIES: SceneObjectCreatureSpecialAbilityEntry[] = [];

const DEFAULT_VFX_PAYLOAD: SceneObjectVfxPreservePayload = {
  profile: "",
  emitter: "",
  script: "",
  flags: {},
  extra: {}
};

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function isPreservePrimitive(value: unknown): value is ScenePreservePrimitive {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function normalizeDoorTransitionFlags(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (typeof candidate === "boolean") {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizePreserveBooleanMap(value: unknown): Record<string, boolean> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, boolean> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (typeof candidate === "boolean") {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizePreservePrimitiveMap(
  value: unknown
): Record<string, ScenePreservePrimitive> {
  if (!isRecord(value)) {
    return {};
  }
  const normalized: Record<string, ScenePreservePrimitive> = {};
  Object.entries(value).forEach(([key, candidate]) => {
    if (isPreservePrimitive(candidate)) {
      normalized[key] = candidate;
    }
  });
  return normalized;
}

function normalizeVfxPayload(value: unknown): SceneObjectVfxPreservePayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    profile: asString(value.profile, DEFAULT_VFX_PAYLOAD.profile),
    emitter: asString(value.emitter, DEFAULT_VFX_PAYLOAD.emitter),
    script: asString(value.script, DEFAULT_VFX_PAYLOAD.script),
    flags: normalizePreserveBooleanMap(value.flags),
    extra: normalizePreservePrimitiveMap(value.extra)
  };
}

function areBooleanMapsEqual(left: Record<string, boolean>, right: Record<string, boolean>): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function arePrimitiveMapsEqual(
  left: Record<string, ScenePreservePrimitive>,
  right: Record<string, ScenePreservePrimitive>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function areSoundPositioningPreservePayloadEqual(
  left: SceneObjectSoundPositioningPreservePayload | undefined,
  right: SceneObjectSoundPositioningPreservePayload | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    left.timeWindow === right.timeWindow &&
    left.hourMask === right.hourMask &&
    left.active === right.active &&
    left.whenToPlay === right.whenToPlay &&
    left.dayNight === right.dayNight &&
    left.hoursStart === right.hoursStart &&
    left.hoursEnd === right.hoursEnd &&
    left.playStyle === right.playStyle &&
    left.playOrder === right.playOrder &&
    left.intervalMs === right.intervalMs &&
    left.intervalVariationMs === right.intervalVariationMs &&
    left.volume === right.volume &&
    left.volumeVariation === right.volumeVariation &&
    left.pitchVariation === right.pitchVariation &&
    left.priority === right.priority &&
    areBooleanMapsEqual(left.flags, right.flags) &&
    arePrimitiveMapsEqual(left.extra, right.extra)
  );
}

function areVfxPayloadsEqual(
  left: SceneObjectVfxPreservePayload | undefined,
  right: SceneObjectVfxPreservePayload | undefined
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return (
    left.profile === right.profile &&
    left.emitter === right.emitter &&
    left.script === right.script &&
    areBooleanMapsEqual(left.flags, right.flags) &&
    arePrimitiveMapsEqual(left.extra, right.extra)
  );
}

function areDoorTransitionFlagsEqual(
  left: Record<string, boolean>,
  right: Record<string, boolean>
): boolean {
  const leftEntries = Object.entries(left);
  const rightEntries = Object.entries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every(([key, value]) => right[key] === value);
}

function arePlaceableLockSettingsEqual(
  left: SceneObjectPlaceableLockSettings | undefined,
  right: SceneObjectPlaceableLockSettings | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.locked === right.locked &&
    left.canRelock === right.canRelock &&
    left.autoRemoveKeyAfterUse === right.autoRemoveKeyAfterUse &&
    left.keyRequiredToUnlockOrLock === right.keyRequiredToUnlockOrLock &&
    left.openLockDc === right.openLockDc &&
    left.closeLockDc === right.closeLockDc &&
    left.keyTag === right.keyTag
  );
}

function arePlaceableTrapSettingsEqual(
  left: SceneObjectPlaceableTrapSettings | undefined,
  right: SceneObjectPlaceableTrapSettings | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.isTrapped === right.isTrapped &&
    left.trapType === right.trapType &&
    left.detectionDc === right.detectionDc &&
    left.disarmDc === right.disarmDc &&
    left.oneShot === right.oneShot &&
    left.detectable === right.detectable &&
    left.disarmable === right.disarmable &&
    left.onDisarmScript === right.onDisarmScript &&
    left.onTrapTriggeredScript === right.onTrapTriggeredScript &&
    left.setDc === right.setDc &&
    left.detectDcModWhenSetByRogue === right.detectDcModWhenSetByRogue &&
    left.disarmDcModWhenSetByRogue === right.disarmDcModWhenSetByRogue
  );
}

function arePlaceableAdvancedSettingsEqual(
  left: SceneObjectPlaceableAdvancedSettings | undefined,
  right: SceneObjectPlaceableAdvancedSettings | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.blueprintResRef === right.blueprintResRef &&
    left.belongsToFaction === right.belongsToFaction &&
    left.conversation === right.conversation &&
    left.noInterrupt === right.noInterrupt &&
    left.portraitResRef === right.portraitResRef &&
    left.initialState === right.initialState &&
    left.treasureModel === right.treasureModel
  );
}

function normalizeCreatureClassEntries(value: unknown): SceneObjectCreatureClassEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => {
    const candidate = isRecord(entry) ? entry : {};
    const className = asString(candidate.className, "").trim();
    const level = clampMin(Math.trunc(asFiniteNumber(candidate.level, 1)), 1);
    return {
      className: className.length > 0 ? className : "Class",
      level
    };
  });
}

function normalizeCreatureSkillEntries(value: unknown): SceneObjectCreatureSkillEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => {
    const candidate = isRecord(entry) ? entry : {};
    return {
      skill: asString(candidate.skill, "").trim(),
      rank: clampMin(Math.trunc(asFiniteNumber(candidate.rank, 0)), 0)
    };
  });
}

function normalizeCreatureFeatEntries(value: unknown): SceneObjectCreatureFeatEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => {
    const candidate = isRecord(entry) ? entry : {};
    return {
      name: asString(candidate.name, "").trim(),
      type: asString(candidate.type, "").trim(),
      assigned: isBoolean(candidate.assigned) ? candidate.assigned : false
    };
  });
}

function normalizeCreatureSpellEntries(value: unknown): SceneObjectCreatureSpellEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => {
    const candidate = isRecord(entry) ? entry : {};
    return {
      prepared: isBoolean(candidate.prepared) ? candidate.prepared : false,
      name: asString(candidate.name, "").trim(),
      spellLevel: clampMin(Math.trunc(asFiniteNumber(candidate.spellLevel, 0)), 0),
      castingLevel: clampMin(Math.trunc(asFiniteNumber(candidate.castingLevel, 0)), 0)
    };
  });
}

function normalizeCreatureSpecialAbilityEntries(
  value: unknown
): SceneObjectCreatureSpecialAbilityEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.map((entry) => {
    const candidate = isRecord(entry) ? entry : {};
    return {
      name: asString(candidate.name, "").trim(),
      type: asString(candidate.type, "").trim(),
      casterLevel: clampMin(Math.trunc(asFiniteNumber(candidate.casterLevel, 0)), 0),
      uses: clampMin(Math.trunc(asFiniteNumber(candidate.uses, 0)), 0)
    };
  });
}

function areCreatureClassEntriesEqual(
  left: SceneObjectCreatureClassEntry[] | undefined,
  right: SceneObjectCreatureClassEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.className === right[index]?.className && entry.level === right[index]?.level
  );
}

function areCreatureSkillEntriesEqual(
  left: SceneObjectCreatureSkillEntry[] | undefined,
  right: SceneObjectCreatureSkillEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) => entry.skill === right[index]?.skill && entry.rank === right[index]?.rank
  );
}

function areCreatureFeatEntriesEqual(
  left: SceneObjectCreatureFeatEntry[] | undefined,
  right: SceneObjectCreatureFeatEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.name === right[index]?.name &&
      entry.type === right[index]?.type &&
      entry.assigned === right[index]?.assigned
  );
}

function areCreatureSpellEntriesEqual(
  left: SceneObjectCreatureSpellEntry[] | undefined,
  right: SceneObjectCreatureSpellEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.prepared === right[index]?.prepared &&
      entry.name === right[index]?.name &&
      entry.spellLevel === right[index]?.spellLevel &&
      entry.castingLevel === right[index]?.castingLevel
  );
}

function areCreatureSpecialAbilityEntriesEqual(
  left: SceneObjectCreatureSpecialAbilityEntry[] | undefined,
  right: SceneObjectCreatureSpecialAbilityEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.name === right[index]?.name &&
      entry.type === right[index]?.type &&
      entry.casterLevel === right[index]?.casterLevel &&
      entry.uses === right[index]?.uses
  );
}

function areCreatureStatisticsEqual(
  left: SceneObjectCreatureStatisticsSettings | undefined,
  right: SceneObjectCreatureStatisticsSettings | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.abilityScores.strength === right.abilityScores.strength &&
    left.abilityScores.dexterity === right.abilityScores.dexterity &&
    left.abilityScores.constitution === right.abilityScores.constitution &&
    left.abilityScores.intelligence === right.abilityScores.intelligence &&
    left.abilityScores.wisdom === right.abilityScores.wisdom &&
    left.abilityScores.charisma === right.abilityScores.charisma &&
    left.racialModifiers.strength === right.racialModifiers.strength &&
    left.racialModifiers.dexterity === right.racialModifiers.dexterity &&
    left.racialModifiers.constitution === right.racialModifiers.constitution &&
    left.racialModifiers.intelligence === right.racialModifiers.intelligence &&
    left.racialModifiers.wisdom === right.racialModifiers.wisdom &&
    left.racialModifiers.charisma === right.racialModifiers.charisma &&
    left.saves.fortitudeBase === right.saves.fortitudeBase &&
    left.saves.fortitudeBonus === right.saves.fortitudeBonus &&
    left.saves.reflexBase === right.saves.reflexBase &&
    left.saves.reflexBonus === right.saves.reflexBonus &&
    left.saves.willBase === right.saves.willBase &&
    left.saves.willBonus === right.saves.willBonus &&
    left.naturalArmorClass === right.naturalArmorClass &&
    left.baseArmorClass === right.baseArmorClass &&
    left.dexterityBonus === right.dexterityBonus &&
    left.sizeModifier === right.sizeModifier &&
    left.baseHitPoints === right.baseHitPoints &&
    left.hitPointBonuses === right.hitPointBonuses &&
    left.movementRate === right.movementRate
  );
}

function areCreatureAppearanceSettingsEqual(
  left: SceneObjectCreatureAppearanceSettings | undefined,
  right: SceneObjectCreatureAppearanceSettings | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.partBasedAppearance === right.partBasedAppearance &&
    left.head === right.head &&
    left.neck === right.neck &&
    left.torso === right.torso &&
    left.pelvis === right.pelvis &&
    left.rightBicep === right.rightBicep &&
    left.leftBicep === right.leftBicep &&
    left.rightForearm === right.rightForearm &&
    left.leftForearm === right.leftForearm &&
    left.rightHand === right.rightHand &&
    left.leftHand === right.leftHand &&
    left.rightThigh === right.rightThigh &&
    left.leftThigh === right.leftThigh &&
    left.rightShin === right.rightShin &&
    left.leftShin === right.leftShin &&
    left.rightFoot === right.rightFoot &&
    left.leftFoot === right.leftFoot &&
    left.wings === right.wings &&
    left.tail === right.tail
  );
}

function areCreatureScriptSlotsEqual(
  left: SceneObjectCreatureScriptSlots | undefined,
  right: SceneObjectCreatureScriptSlots | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.onBlocked === right.onBlocked &&
    left.onCombatRoundEnd === right.onCombatRoundEnd &&
    left.onConversation === right.onConversation &&
    left.onDamaged === right.onDamaged &&
    left.onDeath === right.onDeath &&
    left.onDisturbed === right.onDisturbed &&
    left.onHeartbeat === right.onHeartbeat &&
    left.onPerception === right.onPerception &&
    left.onPhysicalAttacked === right.onPhysicalAttacked &&
    left.onRested === right.onRested &&
    left.onSpawn === right.onSpawn &&
    left.onSpellCastAt === right.onSpellCastAt &&
    left.onUserDefined === right.onUserDefined
  );
}

function areCreatureAdvancedSettingsEqual(
  left: SceneObjectCreatureAdvancedSettings | undefined,
  right: SceneObjectCreatureAdvancedSettings | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.blueprintResRef === right.blueprintResRef &&
    left.disarmable === right.disarmable &&
    left.plot === right.plot &&
    left.leavesLootableCorpse === right.leavesLootableCorpse &&
    left.noPermanentDeath === right.noPermanentDeath &&
    left.immortal === right.immortal &&
    left.treasureModel === right.treasureModel &&
    left.corpseDecayTimeSeconds === right.corpseDecayTimeSeconds &&
    left.faction === right.faction &&
    left.subrace === right.subrace &&
    left.deity === right.deity &&
    left.challengeRatingAdjustment === right.challengeRatingAdjustment &&
    left.soundSet === right.soundSet &&
    left.perceptionRange === right.perceptionRange
  );
}

function terrainByIndex(index: number): TerrainBrushKind {
  return TERRAIN_SEQUENCE[index % TERRAIN_SEQUENCE.length];
}

function createTile(row: number, col: number): SceneTile {
  const id = `tile_${row}_${col}`;
  const sequenceIndex = (row * 17 + col * 31) % TERRAIN_SEQUENCE.length;
  return {
    id,
    row,
    col,
    terrain: terrainByIndex(sequenceIndex),
    orientation: ((row + col) % 4) as 0 | 1 | 2 | 3,
    rotateTexture: (row + col) % 2 === 0,
    plot: false
  };
}

function scaleCoordinate(value: number, from: number, to: number): number {
  if (from <= 0) {
    return value;
  }
  return (value / from) * to;
}

export function normalizeSceneObjectMetadata(object: SceneObject): SceneObject {
  const rawVfxPayload =
    (object.vfxPayload as Partial<Record<keyof SceneObjectVfxPreservePayload, unknown>> | undefined) ??
    undefined;
  const shouldNormalizeVfxPayload = isRecord(rawVfxPayload) || object.vfxPayload !== undefined;
  const nextVfxPayload: SceneObjectVfxPreservePayload | undefined = shouldNormalizeVfxPayload
    ? normalizeVfxPayload(rawVfxPayload) ?? { ...DEFAULT_VFX_PAYLOAD }
    : undefined;
  const hasVfxChanged = !areVfxPayloadsEqual(object.vfxPayload, nextVfxPayload);
  const normalizedObject = hasVfxChanged
    ? {
        ...object,
        vfxPayload: nextVfxPayload
      }
    : object;

  if (normalizedObject.kind === "placeables") {
    const rawPlaceableProperties =
      (normalizedObject.placeableProperties as
        | Partial<Record<keyof SceneObjectPlaceableProperties, unknown>>
        | undefined) ?? undefined;
    const hasRawScriptSlots = isRecord(rawPlaceableProperties?.scriptSlots);
    const hasRawDisabledFlags = isRecord(rawPlaceableProperties?.disabledFlags);
    const hasRawLockSettings = isRecord(rawPlaceableProperties?.lockSettings);
    const hasRawTrapSettings = isRecord(rawPlaceableProperties?.trapSettings);
    const hasRawAdvancedSettings = isRecord(rawPlaceableProperties?.advancedSettings);
    const rawScriptSlots = hasRawScriptSlots
      ? (rawPlaceableProperties?.scriptSlots as Partial<
          Record<keyof SceneObjectPlaceableScriptSlots, unknown>
        >)
      : undefined;
    const rawDisabledFlags = hasRawDisabledFlags
      ? (rawPlaceableProperties?.disabledFlags as Partial<
          Record<keyof SceneObjectPlaceableDisabledFlags, unknown>
        >)
      : undefined;
    const rawLockSettings = hasRawLockSettings
      ? (rawPlaceableProperties?.lockSettings as Partial<
          Record<keyof SceneObjectPlaceableLockSettings, unknown>
        >)
      : undefined;
    const rawTrapSettings = hasRawTrapSettings
      ? (rawPlaceableProperties?.trapSettings as Partial<
          Record<keyof SceneObjectPlaceableTrapSettings, unknown>
        >)
      : undefined;
    const rawAdvancedSettings = hasRawAdvancedSettings
      ? (rawPlaceableProperties?.advancedSettings as Partial<
          Record<keyof SceneObjectPlaceableAdvancedSettings, unknown>
        >)
      : undefined;
    const currentPlaceableProperties = normalizedObject.placeableProperties;
    const shouldNormalizeScriptSlots =
      hasRawScriptSlots || currentPlaceableProperties?.scriptSlots !== undefined;
    const shouldNormalizeDisabledFlags =
      hasRawDisabledFlags || currentPlaceableProperties?.disabledFlags !== undefined;
    const shouldNormalizeLockSettings =
      hasRawLockSettings || currentPlaceableProperties?.lockSettings !== undefined;
    const shouldNormalizeTrapSettings =
      hasRawTrapSettings || currentPlaceableProperties?.trapSettings !== undefined;
    const shouldNormalizeAdvancedSettings =
      hasRawAdvancedSettings || currentPlaceableProperties?.advancedSettings !== undefined;
    const shouldNormalizeDescription =
      typeof rawPlaceableProperties?.description === "string" ||
      currentPlaceableProperties?.description !== undefined;
    const shouldNormalizeComments =
      typeof rawPlaceableProperties?.comments === "string" ||
      currentPlaceableProperties?.comments !== undefined;

    const nextScriptSlots: SceneObjectPlaceableScriptSlots | undefined = shouldNormalizeScriptSlots
      ? {
          onClick: asString(rawScriptSlots?.onClick, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onClick),
          onClosed: asString(rawScriptSlots?.onClosed, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onClosed),
          onDamaged: asString(rawScriptSlots?.onDamaged, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onDamaged),
          onDeath: asString(rawScriptSlots?.onDeath, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onDeath),
          onHeartbeat: asString(rawScriptSlots?.onHeartbeat, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onHeartbeat),
          onInvDisturbed: asString(
            rawScriptSlots?.onInvDisturbed,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onInvDisturbed
          ),
          onLock: asString(rawScriptSlots?.onLock, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onLock),
          onMeleeAttacked: asString(
            rawScriptSlots?.onMeleeAttacked,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onMeleeAttacked
          ),
          onOpen: asString(rawScriptSlots?.onOpen, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onOpen),
          onSpellCastAt: asString(
            rawScriptSlots?.onSpellCastAt,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onSpellCastAt
          ),
          onUnlock: asString(rawScriptSlots?.onUnlock, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUnlock),
          onUsed: asString(rawScriptSlots?.onUsed, DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUsed),
          onUserDefined: asString(
            rawScriptSlots?.onUserDefined,
            DEFAULT_PLACEABLE_SCRIPT_SLOTS.onUserDefined
          )
        }
      : undefined;

    const nextDisabledFlags: SceneObjectPlaceableDisabledFlags | undefined =
      shouldNormalizeDisabledFlags
        ? {
            plot: isBoolean(rawDisabledFlags?.plot)
              ? rawDisabledFlags.plot
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.plot,
            useable: isBoolean(rawDisabledFlags?.useable)
              ? rawDisabledFlags.useable
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.useable,
            hasInventory: isBoolean(rawDisabledFlags?.hasInventory)
              ? rawDisabledFlags.hasInventory
              : DEFAULT_PLACEABLE_DISABLED_FLAGS.hasInventory
          }
        : undefined;

    const nextLockSettings: SceneObjectPlaceableLockSettings | undefined =
      shouldNormalizeLockSettings
        ? {
            locked: isBoolean(rawLockSettings?.locked)
              ? rawLockSettings.locked
              : DEFAULT_PLACEABLE_LOCK_SETTINGS.locked,
            canRelock: isBoolean(rawLockSettings?.canRelock)
              ? rawLockSettings.canRelock
              : DEFAULT_PLACEABLE_LOCK_SETTINGS.canRelock,
            autoRemoveKeyAfterUse: isBoolean(rawLockSettings?.autoRemoveKeyAfterUse)
              ? rawLockSettings.autoRemoveKeyAfterUse
              : DEFAULT_PLACEABLE_LOCK_SETTINGS.autoRemoveKeyAfterUse,
            keyRequiredToUnlockOrLock: isBoolean(rawLockSettings?.keyRequiredToUnlockOrLock)
              ? rawLockSettings.keyRequiredToUnlockOrLock
              : DEFAULT_PLACEABLE_LOCK_SETTINGS.keyRequiredToUnlockOrLock,
            openLockDc: asFiniteNumber(
              rawLockSettings?.openLockDc,
              DEFAULT_PLACEABLE_LOCK_SETTINGS.openLockDc
            ),
            closeLockDc: asFiniteNumber(
              rawLockSettings?.closeLockDc,
              DEFAULT_PLACEABLE_LOCK_SETTINGS.closeLockDc
            ),
            keyTag: asString(rawLockSettings?.keyTag, DEFAULT_PLACEABLE_LOCK_SETTINGS.keyTag)
          }
        : undefined;

    const nextTrapSettings: SceneObjectPlaceableTrapSettings | undefined =
      shouldNormalizeTrapSettings
        ? {
            isTrapped: isBoolean(rawTrapSettings?.isTrapped)
              ? rawTrapSettings.isTrapped
              : DEFAULT_PLACEABLE_TRAP_SETTINGS.isTrapped,
            trapType: asString(rawTrapSettings?.trapType, DEFAULT_PLACEABLE_TRAP_SETTINGS.trapType),
            detectionDc: asFiniteNumber(
              rawTrapSettings?.detectionDc,
              DEFAULT_PLACEABLE_TRAP_SETTINGS.detectionDc
            ),
            disarmDc: asFiniteNumber(rawTrapSettings?.disarmDc, DEFAULT_PLACEABLE_TRAP_SETTINGS.disarmDc),
            oneShot: isBoolean(rawTrapSettings?.oneShot)
              ? rawTrapSettings.oneShot
              : DEFAULT_PLACEABLE_TRAP_SETTINGS.oneShot,
            detectable: isBoolean(rawTrapSettings?.detectable)
              ? rawTrapSettings.detectable
              : DEFAULT_PLACEABLE_TRAP_SETTINGS.detectable,
            disarmable: isBoolean(rawTrapSettings?.disarmable)
              ? rawTrapSettings.disarmable
              : DEFAULT_PLACEABLE_TRAP_SETTINGS.disarmable,
            onDisarmScript: asString(
              rawTrapSettings?.onDisarmScript,
              DEFAULT_PLACEABLE_TRAP_SETTINGS.onDisarmScript
            ),
            onTrapTriggeredScript: asString(
              rawTrapSettings?.onTrapTriggeredScript,
              DEFAULT_PLACEABLE_TRAP_SETTINGS.onTrapTriggeredScript
            ),
            setDc: asFiniteNumber(rawTrapSettings?.setDc, DEFAULT_PLACEABLE_TRAP_SETTINGS.setDc),
            detectDcModWhenSetByRogue: asFiniteNumber(
              rawTrapSettings?.detectDcModWhenSetByRogue,
              DEFAULT_PLACEABLE_TRAP_SETTINGS.detectDcModWhenSetByRogue
            ),
            disarmDcModWhenSetByRogue: asFiniteNumber(
              rawTrapSettings?.disarmDcModWhenSetByRogue,
              DEFAULT_PLACEABLE_TRAP_SETTINGS.disarmDcModWhenSetByRogue
            )
          }
        : undefined;

    const nextAdvancedSettings: SceneObjectPlaceableAdvancedSettings | undefined =
      shouldNormalizeAdvancedSettings
        ? {
            blueprintResRef: asString(
              rawAdvancedSettings?.blueprintResRef,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.blueprintResRef
            ),
            belongsToFaction: asString(
              rawAdvancedSettings?.belongsToFaction,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.belongsToFaction
            ),
            conversation: asString(
              rawAdvancedSettings?.conversation,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.conversation
            ),
            noInterrupt: isBoolean(rawAdvancedSettings?.noInterrupt)
              ? rawAdvancedSettings.noInterrupt
              : DEFAULT_PLACEABLE_ADVANCED_SETTINGS.noInterrupt,
            portraitResRef: asString(
              rawAdvancedSettings?.portraitResRef,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.portraitResRef
            ),
            initialState: asString(
              rawAdvancedSettings?.initialState,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.initialState
            ),
            treasureModel: asString(
              rawAdvancedSettings?.treasureModel,
              DEFAULT_PLACEABLE_ADVANCED_SETTINGS.treasureModel
            )
          }
        : undefined;

    const nextDescription = shouldNormalizeDescription
      ? asString(rawPlaceableProperties?.description, "")
      : undefined;
    const nextComments = shouldNormalizeComments
      ? asString(rawPlaceableProperties?.comments, "")
      : undefined;

    const nextPlaceableProperties: SceneObjectPlaceableProperties = {
      plot: isBoolean(rawPlaceableProperties?.plot)
        ? rawPlaceableProperties.plot
        : DEFAULT_PLACEABLE_PROPERTIES.plot,
      useable: isBoolean(rawPlaceableProperties?.useable)
        ? rawPlaceableProperties.useable
        : DEFAULT_PLACEABLE_PROPERTIES.useable,
      hasInventory: isBoolean(rawPlaceableProperties?.hasInventory)
        ? rawPlaceableProperties.hasInventory
        : DEFAULT_PLACEABLE_PROPERTIES.hasInventory
    };
    if (nextScriptSlots !== undefined) {
      nextPlaceableProperties.scriptSlots = nextScriptSlots;
    }
    if (nextDisabledFlags !== undefined) {
      nextPlaceableProperties.disabledFlags = nextDisabledFlags;
    }
    if (nextLockSettings !== undefined) {
      nextPlaceableProperties.lockSettings = nextLockSettings;
    }
    if (nextTrapSettings !== undefined) {
      nextPlaceableProperties.trapSettings = nextTrapSettings;
    }
    if (nextAdvancedSettings !== undefined) {
      nextPlaceableProperties.advancedSettings = nextAdvancedSettings;
    }
    if (nextDescription !== undefined) {
      nextPlaceableProperties.description = nextDescription;
    }
    if (nextComments !== undefined) {
      nextPlaceableProperties.comments = nextComments;
    }

    const currentScriptSlots = currentPlaceableProperties?.scriptSlots;
    const currentDisabledFlags = currentPlaceableProperties?.disabledFlags;
    const isScriptSlotsUnchanged =
      nextScriptSlots === undefined
        ? currentScriptSlots === undefined
        : currentScriptSlots?.onClick === nextScriptSlots.onClick &&
          currentScriptSlots?.onClosed === nextScriptSlots.onClosed &&
          currentScriptSlots?.onDamaged === nextScriptSlots.onDamaged &&
          currentScriptSlots?.onDeath === nextScriptSlots.onDeath &&
          currentScriptSlots?.onHeartbeat === nextScriptSlots.onHeartbeat &&
          currentScriptSlots?.onInvDisturbed === nextScriptSlots.onInvDisturbed &&
          currentScriptSlots?.onLock === nextScriptSlots.onLock &&
          currentScriptSlots?.onMeleeAttacked === nextScriptSlots.onMeleeAttacked &&
          currentScriptSlots?.onOpen === nextScriptSlots.onOpen &&
          currentScriptSlots?.onSpellCastAt === nextScriptSlots.onSpellCastAt &&
          currentScriptSlots?.onUnlock === nextScriptSlots.onUnlock &&
          currentScriptSlots?.onUsed === nextScriptSlots.onUsed &&
          currentScriptSlots?.onUserDefined === nextScriptSlots.onUserDefined;
    const isDisabledFlagsUnchanged =
      nextDisabledFlags === undefined
        ? currentDisabledFlags === undefined
        : currentDisabledFlags?.plot === nextDisabledFlags.plot &&
          currentDisabledFlags?.useable === nextDisabledFlags.useable &&
          currentDisabledFlags?.hasInventory === nextDisabledFlags.hasInventory;
    const isLockSettingsUnchanged = arePlaceableLockSettingsEqual(
      currentPlaceableProperties?.lockSettings,
      nextLockSettings
    );
    const isTrapSettingsUnchanged = arePlaceableTrapSettingsEqual(
      currentPlaceableProperties?.trapSettings,
      nextTrapSettings
    );
    const isAdvancedSettingsUnchanged = arePlaceableAdvancedSettingsEqual(
      currentPlaceableProperties?.advancedSettings,
      nextAdvancedSettings
    );
    const isDescriptionUnchanged =
      nextDescription === undefined
        ? currentPlaceableProperties?.description === undefined
        : (currentPlaceableProperties?.description ?? "") === nextDescription;
    const isCommentsUnchanged =
      nextComments === undefined
        ? currentPlaceableProperties?.comments === undefined
        : (currentPlaceableProperties?.comments ?? "") === nextComments;

    if (
      currentPlaceableProperties?.plot === nextPlaceableProperties.plot &&
      currentPlaceableProperties?.useable === nextPlaceableProperties.useable &&
      currentPlaceableProperties?.hasInventory === nextPlaceableProperties.hasInventory &&
      isScriptSlotsUnchanged &&
      isDisabledFlagsUnchanged &&
      isLockSettingsUnchanged &&
      isTrapSettingsUnchanged &&
      isAdvancedSettingsUnchanged &&
      isDescriptionUnchanged &&
      isCommentsUnchanged &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.soundPositioning === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: nextPlaceableProperties,
      creatureProperties: undefined,
      soundPositioning: undefined
    };
  }

  if (normalizedObject.kind === "creatures") {
    const rawCreatureProperties =
      (normalizedObject.creatureProperties as
        | Partial<Record<keyof SceneObjectCreatureProperties, unknown>>
        | undefined) ?? undefined;
    const currentCreatureProperties = normalizedObject.creatureProperties;

    const hasRawStatistics = isRecord(rawCreatureProperties?.statistics);
    const hasRawAppearanceSettings = isRecord(rawCreatureProperties?.appearanceSettings);
    const hasRawScriptSlots = isRecord(rawCreatureProperties?.scriptSlots);
    const hasRawAdvancedSettings = isRecord(rawCreatureProperties?.advancedSettings);
    const hasRawClassEntries = Array.isArray(rawCreatureProperties?.classEntries);
    const hasRawSkills = Array.isArray(rawCreatureProperties?.skills);
    const hasRawFeats = Array.isArray(rawCreatureProperties?.feats);
    const hasRawSpells = Array.isArray(rawCreatureProperties?.spells);
    const hasRawSpecialAbilities = Array.isArray(rawCreatureProperties?.specialAbilities);
    const shouldNormalizeComments =
      typeof rawCreatureProperties?.comments === "string" ||
      currentCreatureProperties?.comments !== undefined;

    const rawStatistics = hasRawStatistics
      ? (rawCreatureProperties?.statistics as Partial<
          Record<keyof SceneObjectCreatureStatisticsSettings, unknown>
        >)
      : undefined;
    const rawAbilityScores = isRecord(rawStatistics?.abilityScores)
      ? (rawStatistics?.abilityScores as Partial<
          Record<keyof SceneObjectCreatureStatisticsSettings["abilityScores"], unknown>
        >)
      : undefined;
    const rawRacialModifiers = isRecord(rawStatistics?.racialModifiers)
      ? (rawStatistics?.racialModifiers as Partial<
          Record<keyof SceneObjectCreatureStatisticsSettings["racialModifiers"], unknown>
        >)
      : undefined;
    const rawSaves = isRecord(rawStatistics?.saves)
      ? (rawStatistics?.saves as Partial<
          Record<keyof SceneObjectCreatureStatisticsSettings["saves"], unknown>
        >)
      : undefined;
    const rawAppearanceSettings = hasRawAppearanceSettings
      ? (rawCreatureProperties?.appearanceSettings as Partial<
          Record<keyof SceneObjectCreatureAppearanceSettings, unknown>
        >)
      : undefined;
    const rawScriptSlots = hasRawScriptSlots
      ? (rawCreatureProperties?.scriptSlots as Partial<
          Record<keyof SceneObjectCreatureScriptSlots, unknown>
        >)
      : undefined;
    const rawAdvancedSettings = hasRawAdvancedSettings
      ? (rawCreatureProperties?.advancedSettings as Partial<
          Record<keyof SceneObjectCreatureAdvancedSettings, unknown>
        >)
      : undefined;

    const sourceStatisticsCandidate = currentCreatureProperties?.statistics;
    const sourceStatistics: SceneObjectCreatureStatisticsSettings = {
      abilityScores: {
        strength: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.strength,
          DEFAULT_CREATURE_STATISTICS.abilityScores.strength
        ),
        dexterity: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.dexterity,
          DEFAULT_CREATURE_STATISTICS.abilityScores.dexterity
        ),
        constitution: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.constitution,
          DEFAULT_CREATURE_STATISTICS.abilityScores.constitution
        ),
        intelligence: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.intelligence,
          DEFAULT_CREATURE_STATISTICS.abilityScores.intelligence
        ),
        wisdom: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.wisdom,
          DEFAULT_CREATURE_STATISTICS.abilityScores.wisdom
        ),
        charisma: asFiniteNumber(
          sourceStatisticsCandidate?.abilityScores?.charisma,
          DEFAULT_CREATURE_STATISTICS.abilityScores.charisma
        )
      },
      racialModifiers: {
        strength: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.strength,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.strength
        ),
        dexterity: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.dexterity,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.dexterity
        ),
        constitution: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.constitution,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.constitution
        ),
        intelligence: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.intelligence,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.intelligence
        ),
        wisdom: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.wisdom,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.wisdom
        ),
        charisma: asFiniteNumber(
          sourceStatisticsCandidate?.racialModifiers?.charisma,
          DEFAULT_CREATURE_STATISTICS.racialModifiers.charisma
        )
      },
      saves: {
        fortitudeBase: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.fortitudeBase,
          DEFAULT_CREATURE_STATISTICS.saves.fortitudeBase
        ),
        fortitudeBonus: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.fortitudeBonus,
          DEFAULT_CREATURE_STATISTICS.saves.fortitudeBonus
        ),
        reflexBase: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.reflexBase,
          DEFAULT_CREATURE_STATISTICS.saves.reflexBase
        ),
        reflexBonus: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.reflexBonus,
          DEFAULT_CREATURE_STATISTICS.saves.reflexBonus
        ),
        willBase: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.willBase,
          DEFAULT_CREATURE_STATISTICS.saves.willBase
        ),
        willBonus: asFiniteNumber(
          sourceStatisticsCandidate?.saves?.willBonus,
          DEFAULT_CREATURE_STATISTICS.saves.willBonus
        )
      },
      naturalArmorClass: asFiniteNumber(
        sourceStatisticsCandidate?.naturalArmorClass,
        DEFAULT_CREATURE_STATISTICS.naturalArmorClass
      ),
      baseArmorClass: asFiniteNumber(
        sourceStatisticsCandidate?.baseArmorClass,
        DEFAULT_CREATURE_STATISTICS.baseArmorClass
      ),
      dexterityBonus: asFiniteNumber(
        sourceStatisticsCandidate?.dexterityBonus,
        DEFAULT_CREATURE_STATISTICS.dexterityBonus
      ),
      sizeModifier: asFiniteNumber(
        sourceStatisticsCandidate?.sizeModifier,
        DEFAULT_CREATURE_STATISTICS.sizeModifier
      ),
      baseHitPoints: asFiniteNumber(
        sourceStatisticsCandidate?.baseHitPoints,
        DEFAULT_CREATURE_STATISTICS.baseHitPoints
      ),
      hitPointBonuses: asFiniteNumber(
        sourceStatisticsCandidate?.hitPointBonuses,
        DEFAULT_CREATURE_STATISTICS.hitPointBonuses
      ),
      movementRate: asString(
        sourceStatisticsCandidate?.movementRate,
        DEFAULT_CREATURE_STATISTICS.movementRate
      )
    };
    const sourceAppearanceSettingsCandidate = currentCreatureProperties?.appearanceSettings;
    const sourceAppearanceSettings: SceneObjectCreatureAppearanceSettings = {
      partBasedAppearance: isBoolean(sourceAppearanceSettingsCandidate?.partBasedAppearance)
        ? sourceAppearanceSettingsCandidate.partBasedAppearance
        : DEFAULT_CREATURE_APPEARANCE_SETTINGS.partBasedAppearance,
      head: asString(sourceAppearanceSettingsCandidate?.head, DEFAULT_CREATURE_APPEARANCE_SETTINGS.head),
      neck: asString(sourceAppearanceSettingsCandidate?.neck, DEFAULT_CREATURE_APPEARANCE_SETTINGS.neck),
      torso: asString(sourceAppearanceSettingsCandidate?.torso, DEFAULT_CREATURE_APPEARANCE_SETTINGS.torso),
      pelvis: asString(
        sourceAppearanceSettingsCandidate?.pelvis,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.pelvis
      ),
      rightBicep: asString(
        sourceAppearanceSettingsCandidate?.rightBicep,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightBicep
      ),
      leftBicep: asString(
        sourceAppearanceSettingsCandidate?.leftBicep,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftBicep
      ),
      rightForearm: asString(
        sourceAppearanceSettingsCandidate?.rightForearm,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightForearm
      ),
      leftForearm: asString(
        sourceAppearanceSettingsCandidate?.leftForearm,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftForearm
      ),
      rightHand: asString(
        sourceAppearanceSettingsCandidate?.rightHand,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightHand
      ),
      leftHand: asString(
        sourceAppearanceSettingsCandidate?.leftHand,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftHand
      ),
      rightThigh: asString(
        sourceAppearanceSettingsCandidate?.rightThigh,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightThigh
      ),
      leftThigh: asString(
        sourceAppearanceSettingsCandidate?.leftThigh,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftThigh
      ),
      rightShin: asString(
        sourceAppearanceSettingsCandidate?.rightShin,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightShin
      ),
      leftShin: asString(
        sourceAppearanceSettingsCandidate?.leftShin,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftShin
      ),
      rightFoot: asString(
        sourceAppearanceSettingsCandidate?.rightFoot,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.rightFoot
      ),
      leftFoot: asString(
        sourceAppearanceSettingsCandidate?.leftFoot,
        DEFAULT_CREATURE_APPEARANCE_SETTINGS.leftFoot
      ),
      wings: asString(sourceAppearanceSettingsCandidate?.wings, DEFAULT_CREATURE_APPEARANCE_SETTINGS.wings),
      tail: asString(sourceAppearanceSettingsCandidate?.tail, DEFAULT_CREATURE_APPEARANCE_SETTINGS.tail)
    };
    const sourceScriptSlotsCandidate = currentCreatureProperties?.scriptSlots;
    const sourceScriptSlots: SceneObjectCreatureScriptSlots = {
      onBlocked: asString(sourceScriptSlotsCandidate?.onBlocked, DEFAULT_CREATURE_SCRIPT_SLOTS.onBlocked),
      onCombatRoundEnd: asString(
        sourceScriptSlotsCandidate?.onCombatRoundEnd,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onCombatRoundEnd
      ),
      onConversation: asString(
        sourceScriptSlotsCandidate?.onConversation,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onConversation
      ),
      onDamaged: asString(sourceScriptSlotsCandidate?.onDamaged, DEFAULT_CREATURE_SCRIPT_SLOTS.onDamaged),
      onDeath: asString(sourceScriptSlotsCandidate?.onDeath, DEFAULT_CREATURE_SCRIPT_SLOTS.onDeath),
      onDisturbed: asString(
        sourceScriptSlotsCandidate?.onDisturbed,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onDisturbed
      ),
      onHeartbeat: asString(
        sourceScriptSlotsCandidate?.onHeartbeat,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onHeartbeat
      ),
      onPerception: asString(
        sourceScriptSlotsCandidate?.onPerception,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onPerception
      ),
      onPhysicalAttacked: asString(
        sourceScriptSlotsCandidate?.onPhysicalAttacked,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onPhysicalAttacked
      ),
      onRested: asString(sourceScriptSlotsCandidate?.onRested, DEFAULT_CREATURE_SCRIPT_SLOTS.onRested),
      onSpawn: asString(sourceScriptSlotsCandidate?.onSpawn, DEFAULT_CREATURE_SCRIPT_SLOTS.onSpawn),
      onSpellCastAt: asString(
        sourceScriptSlotsCandidate?.onSpellCastAt,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onSpellCastAt
      ),
      onUserDefined: asString(
        sourceScriptSlotsCandidate?.onUserDefined,
        DEFAULT_CREATURE_SCRIPT_SLOTS.onUserDefined
      )
    };
    const sourceAdvancedSettingsCandidate = currentCreatureProperties?.advancedSettings;
    const sourceAdvancedSettings: SceneObjectCreatureAdvancedSettings = {
      blueprintResRef: asString(
        sourceAdvancedSettingsCandidate?.blueprintResRef,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.blueprintResRef
      ),
      disarmable: isBoolean(sourceAdvancedSettingsCandidate?.disarmable)
        ? sourceAdvancedSettingsCandidate.disarmable
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.disarmable,
      plot: isBoolean(sourceAdvancedSettingsCandidate?.plot)
        ? sourceAdvancedSettingsCandidate.plot
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.plot,
      leavesLootableCorpse: isBoolean(sourceAdvancedSettingsCandidate?.leavesLootableCorpse)
        ? sourceAdvancedSettingsCandidate.leavesLootableCorpse
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.leavesLootableCorpse,
      noPermanentDeath: isBoolean(sourceAdvancedSettingsCandidate?.noPermanentDeath)
        ? sourceAdvancedSettingsCandidate.noPermanentDeath
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.noPermanentDeath,
      immortal: isBoolean(sourceAdvancedSettingsCandidate?.immortal)
        ? sourceAdvancedSettingsCandidate.immortal
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.immortal,
      treasureModel: asString(
        sourceAdvancedSettingsCandidate?.treasureModel,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.treasureModel
      ),
      corpseDecayTimeSeconds: clampMin(
        asFiniteNumber(
          sourceAdvancedSettingsCandidate?.corpseDecayTimeSeconds,
          DEFAULT_CREATURE_ADVANCED_SETTINGS.corpseDecayTimeSeconds
        ),
        0
      ),
      faction: asString(sourceAdvancedSettingsCandidate?.faction, DEFAULT_CREATURE_ADVANCED_SETTINGS.faction),
      subrace: asString(sourceAdvancedSettingsCandidate?.subrace, DEFAULT_CREATURE_ADVANCED_SETTINGS.subrace),
      deity: asString(sourceAdvancedSettingsCandidate?.deity, DEFAULT_CREATURE_ADVANCED_SETTINGS.deity),
      challengeRatingAdjustment: asFiniteNumber(
        sourceAdvancedSettingsCandidate?.challengeRatingAdjustment,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.challengeRatingAdjustment
      ),
      soundSet: asString(sourceAdvancedSettingsCandidate?.soundSet, DEFAULT_CREATURE_ADVANCED_SETTINGS.soundSet),
      perceptionRange: asString(
        sourceAdvancedSettingsCandidate?.perceptionRange,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.perceptionRange
      )
    };

    const shouldNormalizeStatistics =
      hasRawStatistics || currentCreatureProperties?.statistics !== undefined;
    const shouldNormalizeAppearanceSettings =
      hasRawAppearanceSettings || currentCreatureProperties?.appearanceSettings !== undefined;
    const shouldNormalizeScriptSlots =
      hasRawScriptSlots || currentCreatureProperties?.scriptSlots !== undefined;
    const shouldNormalizeAdvancedSettings =
      hasRawAdvancedSettings || currentCreatureProperties?.advancedSettings !== undefined;
    const shouldNormalizeClassEntries =
      hasRawClassEntries || currentCreatureProperties?.classEntries !== undefined;
    const shouldNormalizeSkills =
      hasRawSkills || currentCreatureProperties?.skills !== undefined;
    const shouldNormalizeFeats =
      hasRawFeats || currentCreatureProperties?.feats !== undefined;
    const shouldNormalizeSpells =
      hasRawSpells || currentCreatureProperties?.spells !== undefined;
    const shouldNormalizeSpecialAbilities =
      hasRawSpecialAbilities || currentCreatureProperties?.specialAbilities !== undefined;

    const nextStatistics: SceneObjectCreatureStatisticsSettings | undefined =
      shouldNormalizeStatistics
        ? {
            abilityScores: {
              strength: asFiniteNumber(
                rawAbilityScores?.strength,
                sourceStatistics.abilityScores.strength
              ),
              dexterity: asFiniteNumber(
                rawAbilityScores?.dexterity,
                sourceStatistics.abilityScores.dexterity
              ),
              constitution: asFiniteNumber(
                rawAbilityScores?.constitution,
                sourceStatistics.abilityScores.constitution
              ),
              intelligence: asFiniteNumber(
                rawAbilityScores?.intelligence,
                sourceStatistics.abilityScores.intelligence
              ),
              wisdom: asFiniteNumber(rawAbilityScores?.wisdom, sourceStatistics.abilityScores.wisdom),
              charisma: asFiniteNumber(
                rawAbilityScores?.charisma,
                sourceStatistics.abilityScores.charisma
              )
            },
            racialModifiers: {
              strength: asFiniteNumber(
                rawRacialModifiers?.strength,
                sourceStatistics.racialModifiers.strength
              ),
              dexterity: asFiniteNumber(
                rawRacialModifiers?.dexterity,
                sourceStatistics.racialModifiers.dexterity
              ),
              constitution: asFiniteNumber(
                rawRacialModifiers?.constitution,
                sourceStatistics.racialModifiers.constitution
              ),
              intelligence: asFiniteNumber(
                rawRacialModifiers?.intelligence,
                sourceStatistics.racialModifiers.intelligence
              ),
              wisdom: asFiniteNumber(
                rawRacialModifiers?.wisdom,
                sourceStatistics.racialModifiers.wisdom
              ),
              charisma: asFiniteNumber(
                rawRacialModifiers?.charisma,
                sourceStatistics.racialModifiers.charisma
              )
            },
            saves: {
              fortitudeBase: asFiniteNumber(rawSaves?.fortitudeBase, sourceStatistics.saves.fortitudeBase),
              fortitudeBonus: asFiniteNumber(rawSaves?.fortitudeBonus, sourceStatistics.saves.fortitudeBonus),
              reflexBase: asFiniteNumber(rawSaves?.reflexBase, sourceStatistics.saves.reflexBase),
              reflexBonus: asFiniteNumber(rawSaves?.reflexBonus, sourceStatistics.saves.reflexBonus),
              willBase: asFiniteNumber(rawSaves?.willBase, sourceStatistics.saves.willBase),
              willBonus: asFiniteNumber(rawSaves?.willBonus, sourceStatistics.saves.willBonus)
            },
            naturalArmorClass: asFiniteNumber(
              rawStatistics?.naturalArmorClass,
              sourceStatistics.naturalArmorClass
            ),
            baseArmorClass: asFiniteNumber(rawStatistics?.baseArmorClass, sourceStatistics.baseArmorClass),
            dexterityBonus: asFiniteNumber(rawStatistics?.dexterityBonus, sourceStatistics.dexterityBonus),
            sizeModifier: asFiniteNumber(rawStatistics?.sizeModifier, sourceStatistics.sizeModifier),
            baseHitPoints: asFiniteNumber(rawStatistics?.baseHitPoints, sourceStatistics.baseHitPoints),
            hitPointBonuses: asFiniteNumber(rawStatistics?.hitPointBonuses, sourceStatistics.hitPointBonuses),
            movementRate: asString(rawStatistics?.movementRate, sourceStatistics.movementRate)
          }
        : undefined;

    const nextAppearanceSettings: SceneObjectCreatureAppearanceSettings | undefined =
      shouldNormalizeAppearanceSettings
        ? {
            partBasedAppearance: isBoolean(rawAppearanceSettings?.partBasedAppearance)
              ? rawAppearanceSettings.partBasedAppearance
              : sourceAppearanceSettings.partBasedAppearance,
            head: asString(rawAppearanceSettings?.head, sourceAppearanceSettings.head),
            neck: asString(rawAppearanceSettings?.neck, sourceAppearanceSettings.neck),
            torso: asString(rawAppearanceSettings?.torso, sourceAppearanceSettings.torso),
            pelvis: asString(rawAppearanceSettings?.pelvis, sourceAppearanceSettings.pelvis),
            rightBicep: asString(rawAppearanceSettings?.rightBicep, sourceAppearanceSettings.rightBicep),
            leftBicep: asString(rawAppearanceSettings?.leftBicep, sourceAppearanceSettings.leftBicep),
            rightForearm: asString(
              rawAppearanceSettings?.rightForearm,
              sourceAppearanceSettings.rightForearm
            ),
            leftForearm: asString(rawAppearanceSettings?.leftForearm, sourceAppearanceSettings.leftForearm),
            rightHand: asString(rawAppearanceSettings?.rightHand, sourceAppearanceSettings.rightHand),
            leftHand: asString(rawAppearanceSettings?.leftHand, sourceAppearanceSettings.leftHand),
            rightThigh: asString(rawAppearanceSettings?.rightThigh, sourceAppearanceSettings.rightThigh),
            leftThigh: asString(rawAppearanceSettings?.leftThigh, sourceAppearanceSettings.leftThigh),
            rightShin: asString(rawAppearanceSettings?.rightShin, sourceAppearanceSettings.rightShin),
            leftShin: asString(rawAppearanceSettings?.leftShin, sourceAppearanceSettings.leftShin),
            rightFoot: asString(rawAppearanceSettings?.rightFoot, sourceAppearanceSettings.rightFoot),
            leftFoot: asString(rawAppearanceSettings?.leftFoot, sourceAppearanceSettings.leftFoot),
            wings: asString(rawAppearanceSettings?.wings, sourceAppearanceSettings.wings),
            tail: asString(rawAppearanceSettings?.tail, sourceAppearanceSettings.tail)
          }
        : undefined;

    const nextScriptSlots: SceneObjectCreatureScriptSlots | undefined =
      shouldNormalizeScriptSlots
        ? {
            onBlocked: asString(rawScriptSlots?.onBlocked, sourceScriptSlots.onBlocked),
            onCombatRoundEnd: asString(
              rawScriptSlots?.onCombatRoundEnd,
              sourceScriptSlots.onCombatRoundEnd
            ),
            onConversation: asString(rawScriptSlots?.onConversation, sourceScriptSlots.onConversation),
            onDamaged: asString(rawScriptSlots?.onDamaged, sourceScriptSlots.onDamaged),
            onDeath: asString(rawScriptSlots?.onDeath, sourceScriptSlots.onDeath),
            onDisturbed: asString(rawScriptSlots?.onDisturbed, sourceScriptSlots.onDisturbed),
            onHeartbeat: asString(rawScriptSlots?.onHeartbeat, sourceScriptSlots.onHeartbeat),
            onPerception: asString(rawScriptSlots?.onPerception, sourceScriptSlots.onPerception),
            onPhysicalAttacked: asString(
              rawScriptSlots?.onPhysicalAttacked,
              sourceScriptSlots.onPhysicalAttacked
            ),
            onRested: asString(rawScriptSlots?.onRested, sourceScriptSlots.onRested),
            onSpawn: asString(rawScriptSlots?.onSpawn, sourceScriptSlots.onSpawn),
            onSpellCastAt: asString(rawScriptSlots?.onSpellCastAt, sourceScriptSlots.onSpellCastAt),
            onUserDefined: asString(rawScriptSlots?.onUserDefined, sourceScriptSlots.onUserDefined)
          }
        : undefined;

    const nextAdvancedSettings: SceneObjectCreatureAdvancedSettings | undefined =
      shouldNormalizeAdvancedSettings
        ? {
            blueprintResRef: asString(
              rawAdvancedSettings?.blueprintResRef,
              sourceAdvancedSettings.blueprintResRef
            ),
            disarmable: isBoolean(rawAdvancedSettings?.disarmable)
              ? rawAdvancedSettings.disarmable
              : sourceAdvancedSettings.disarmable,
            plot: isBoolean(rawAdvancedSettings?.plot)
              ? rawAdvancedSettings.plot
              : sourceAdvancedSettings.plot,
            leavesLootableCorpse: isBoolean(rawAdvancedSettings?.leavesLootableCorpse)
              ? rawAdvancedSettings.leavesLootableCorpse
              : sourceAdvancedSettings.leavesLootableCorpse,
            noPermanentDeath: isBoolean(rawAdvancedSettings?.noPermanentDeath)
              ? rawAdvancedSettings.noPermanentDeath
              : sourceAdvancedSettings.noPermanentDeath,
            immortal: isBoolean(rawAdvancedSettings?.immortal)
              ? rawAdvancedSettings.immortal
              : sourceAdvancedSettings.immortal,
            treasureModel: asString(rawAdvancedSettings?.treasureModel, sourceAdvancedSettings.treasureModel),
            corpseDecayTimeSeconds: clampMin(
              asFiniteNumber(rawAdvancedSettings?.corpseDecayTimeSeconds, sourceAdvancedSettings.corpseDecayTimeSeconds),
              0
            ),
            faction: asString(rawAdvancedSettings?.faction, sourceAdvancedSettings.faction),
            subrace: asString(rawAdvancedSettings?.subrace, sourceAdvancedSettings.subrace),
            deity: asString(rawAdvancedSettings?.deity, sourceAdvancedSettings.deity),
            challengeRatingAdjustment: asFiniteNumber(
              rawAdvancedSettings?.challengeRatingAdjustment,
              sourceAdvancedSettings.challengeRatingAdjustment
            ),
            soundSet: asString(rawAdvancedSettings?.soundSet, sourceAdvancedSettings.soundSet),
            perceptionRange: asString(
              rawAdvancedSettings?.perceptionRange,
              sourceAdvancedSettings.perceptionRange
            )
          }
        : undefined;

    const normalizedClassEntries = normalizeCreatureClassEntries(rawCreatureProperties?.classEntries);
    const normalizedSkills = normalizeCreatureSkillEntries(rawCreatureProperties?.skills);
    const normalizedFeats = normalizeCreatureFeatEntries(rawCreatureProperties?.feats);
    const normalizedSpells = normalizeCreatureSpellEntries(rawCreatureProperties?.spells);
    const normalizedSpecialAbilities = normalizeCreatureSpecialAbilityEntries(
      rawCreatureProperties?.specialAbilities
    );

    const nextClassEntries = shouldNormalizeClassEntries
      ? normalizedClassEntries ??
        (currentCreatureProperties?.classEntries
          ? currentCreatureProperties.classEntries.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_CLASS_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;
    const nextSkills = shouldNormalizeSkills
      ? normalizedSkills ??
        (currentCreatureProperties?.skills
          ? currentCreatureProperties.skills.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_SKILL_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;
    const nextFeats = shouldNormalizeFeats
      ? normalizedFeats ??
        (currentCreatureProperties?.feats
          ? currentCreatureProperties.feats.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_FEAT_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;
    const nextSpells = shouldNormalizeSpells
      ? normalizedSpells ??
        (currentCreatureProperties?.spells
          ? currentCreatureProperties.spells.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_SPELL_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;
    const nextSpecialAbilities = shouldNormalizeSpecialAbilities
      ? normalizedSpecialAbilities ??
        (currentCreatureProperties?.specialAbilities
          ? currentCreatureProperties.specialAbilities.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_SPECIAL_ABILITY_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;

    const fallbackFirstName = asString(
      currentCreatureProperties?.firstName,
      asString(normalizedObject.name, normalizedObject.tag)
    );
    const nextFirstName = asString(rawCreatureProperties?.firstName, fallbackFirstName);
    const sourceLastName = asString(
      currentCreatureProperties?.lastName,
      DEFAULT_CREATURE_PROPERTIES.lastName
    );
    const nextLastName = asString(rawCreatureProperties?.lastName, sourceLastName);
    const sourceRace = asString(currentCreatureProperties?.race, DEFAULT_CREATURE_PROPERTIES.race);
    const nextRace = asString(rawCreatureProperties?.race, sourceRace);
    const sourceAppearance = asString(currentCreatureProperties?.appearance, normalizedObject.resRef);
    const nextAppearance = asString(rawCreatureProperties?.appearance, sourceAppearance);
    const sourcePhenotype = asString(
      currentCreatureProperties?.phenotype,
      DEFAULT_CREATURE_PROPERTIES.phenotype
    );
    const nextPhenotype = asString(rawCreatureProperties?.phenotype, sourcePhenotype);
    const sourceGender = asString(currentCreatureProperties?.gender, DEFAULT_CREATURE_PROPERTIES.gender);
    const nextGender = asString(rawCreatureProperties?.gender, sourceGender);
    const sourceDescription = asString(
      currentCreatureProperties?.description,
      DEFAULT_CREATURE_PROPERTIES.description
    );
    const nextDescription = asString(rawCreatureProperties?.description, sourceDescription);
    const sourceChallengeRating = asFiniteNumber(
      currentCreatureProperties?.challengeRating,
      DEFAULT_CREATURE_PROPERTIES.challengeRating
    );
    const nextChallengeRating = clampMin(
      asFiniteNumber(rawCreatureProperties?.challengeRating, sourceChallengeRating),
      0
    );
    const sourcePortraitResRef = asString(
      currentCreatureProperties?.portraitResRef,
      DEFAULT_CREATURE_PROPERTIES.portraitResRef
    );
    const nextPortraitResRef = asString(rawCreatureProperties?.portraitResRef, sourcePortraitResRef);
    const sourceConversation = asString(
      currentCreatureProperties?.conversation,
      DEFAULT_CREATURE_PROPERTIES.conversation
    );
    const nextConversation = asString(rawCreatureProperties?.conversation, sourceConversation);
    const sourceNoInterrupt = isBoolean(currentCreatureProperties?.noInterrupt)
      ? currentCreatureProperties.noInterrupt
      : DEFAULT_CREATURE_PROPERTIES.noInterrupt;
    const nextNoInterrupt = isBoolean(rawCreatureProperties?.noInterrupt)
      ? rawCreatureProperties.noInterrupt
      : sourceNoInterrupt;

    const nextComments = shouldNormalizeComments
      ? asString(rawCreatureProperties?.comments, asString(currentCreatureProperties?.comments, ""))
      : undefined;

    const nextCreatureProperties: SceneObjectCreatureProperties = {
      firstName: nextFirstName,
      lastName: nextLastName,
      race: nextRace,
      appearance: nextAppearance,
      phenotype: nextPhenotype,
      gender: nextGender,
      description: nextDescription,
      challengeRating: nextChallengeRating,
      portraitResRef: nextPortraitResRef,
      conversation: nextConversation,
      noInterrupt: nextNoInterrupt
    };
    if (nextStatistics !== undefined) {
      nextCreatureProperties.statistics = nextStatistics;
    }
    if (nextAppearanceSettings !== undefined) {
      nextCreatureProperties.appearanceSettings = nextAppearanceSettings;
    }
    if (nextClassEntries !== undefined) {
      nextCreatureProperties.classEntries = nextClassEntries;
    }
    if (nextSkills !== undefined) {
      nextCreatureProperties.skills = nextSkills;
    }
    if (nextScriptSlots !== undefined) {
      nextCreatureProperties.scriptSlots = nextScriptSlots;
    }
    if (nextAdvancedSettings !== undefined) {
      nextCreatureProperties.advancedSettings = nextAdvancedSettings;
    }
    if (nextFeats !== undefined) {
      nextCreatureProperties.feats = nextFeats;
    }
    if (nextSpells !== undefined) {
      nextCreatureProperties.spells = nextSpells;
    }
    if (nextSpecialAbilities !== undefined) {
      nextCreatureProperties.specialAbilities = nextSpecialAbilities;
    }
    if (nextComments !== undefined) {
      nextCreatureProperties.comments = nextComments;
    }

    const isCommentsUnchanged =
      nextComments === undefined
        ? currentCreatureProperties?.comments === undefined
        : (currentCreatureProperties?.comments ?? "") === nextComments;

    if (
      currentCreatureProperties?.firstName === nextFirstName &&
      (currentCreatureProperties?.lastName ?? "") === nextLastName &&
      (currentCreatureProperties?.race ?? DEFAULT_CREATURE_PROPERTIES.race) === nextRace &&
      (currentCreatureProperties?.appearance ?? normalizedObject.resRef) === nextAppearance &&
      (currentCreatureProperties?.phenotype ?? DEFAULT_CREATURE_PROPERTIES.phenotype) === nextPhenotype &&
      (currentCreatureProperties?.gender ?? DEFAULT_CREATURE_PROPERTIES.gender) === nextGender &&
      (currentCreatureProperties?.description ?? "") === nextDescription &&
      (currentCreatureProperties?.challengeRating ?? DEFAULT_CREATURE_PROPERTIES.challengeRating) ===
        nextChallengeRating &&
      (currentCreatureProperties?.portraitResRef ?? "") === nextPortraitResRef &&
      (currentCreatureProperties?.conversation ?? "") === nextConversation &&
      (currentCreatureProperties?.noInterrupt ?? DEFAULT_CREATURE_PROPERTIES.noInterrupt) ===
        nextNoInterrupt &&
      areCreatureStatisticsEqual(currentCreatureProperties?.statistics, nextStatistics) &&
      areCreatureAppearanceSettingsEqual(
        currentCreatureProperties?.appearanceSettings,
        nextAppearanceSettings
      ) &&
      areCreatureClassEntriesEqual(currentCreatureProperties?.classEntries, nextClassEntries) &&
      areCreatureSkillEntriesEqual(currentCreatureProperties?.skills, nextSkills) &&
      areCreatureScriptSlotsEqual(currentCreatureProperties?.scriptSlots, nextScriptSlots) &&
      areCreatureAdvancedSettingsEqual(
        currentCreatureProperties?.advancedSettings,
        nextAdvancedSettings
      ) &&
      areCreatureFeatEntriesEqual(currentCreatureProperties?.feats, nextFeats) &&
      areCreatureSpellEntriesEqual(currentCreatureProperties?.spells, nextSpells) &&
      areCreatureSpecialAbilityEntriesEqual(
        currentCreatureProperties?.specialAbilities,
        nextSpecialAbilities
      ) &&
      isCommentsUnchanged &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      normalizedObject.doorTransition === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      name: nextFirstName,
      creatureProperties: nextCreatureProperties,
      placeableProperties: undefined,
      soundPositioning: undefined,
      doorTransition: undefined
    };
  }

  if (normalizedObject.kind === "doors") {
    const rawDoorTransition =
      (normalizedObject.doorTransition as
        | Partial<Record<keyof SceneObjectDoorTransitionPayload, unknown>>
        | undefined) ?? undefined;
    const shouldNormalizeDoorTransition = rawDoorTransition !== undefined;
    const nextDoorTransition: SceneObjectDoorTransitionPayload | undefined = shouldNormalizeDoorTransition
      ? {
          linkedTarget: asString(rawDoorTransition?.linkedTarget, ""),
          linkedModule: asString(rawDoorTransition?.linkedModule, ""),
          linkedTag: asString(rawDoorTransition?.linkedTag, ""),
          linkedWaypoint: asString(rawDoorTransition?.linkedWaypoint, ""),
          loadScreen: asString(rawDoorTransition?.loadScreen, ""),
          flags: normalizeDoorTransitionFlags(rawDoorTransition?.flags)
        }
      : undefined;
    const currentDoorTransition = normalizedObject.doorTransition;
    const isDoorTransitionUnchanged =
      nextDoorTransition === undefined
        ? currentDoorTransition === undefined
        : currentDoorTransition?.linkedTarget === nextDoorTransition.linkedTarget &&
          currentDoorTransition?.linkedModule === nextDoorTransition.linkedModule &&
          currentDoorTransition?.linkedTag === nextDoorTransition.linkedTag &&
          currentDoorTransition?.linkedWaypoint === nextDoorTransition.linkedWaypoint &&
          currentDoorTransition?.loadScreen === nextDoorTransition.loadScreen &&
          areDoorTransitionFlagsEqual(currentDoorTransition?.flags ?? {}, nextDoorTransition.flags);

    if (
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      isDoorTransitionUnchanged
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: undefined,
      creatureProperties: undefined,
      soundPositioning: undefined,
      doorTransition: nextDoorTransition
    };
  }

  if (normalizedObject.kind === "sounds") {
    const rawSoundPositioning =
      (normalizedObject.soundPositioning as
        | Partial<Record<keyof SceneObjectSoundPositioning, unknown>>
        | undefined) ?? undefined;
    const fallbackElevation = clampMin(asFiniteNumber(normalizedObject.z, 0), 0);
    const normalizedSoundPositioning = normalizeSoundPositioning(rawSoundPositioning, fallbackElevation);
    const shouldNormalizePreservePayload =
      isRecord(rawSoundPositioning?.preserve) ||
      normalizedObject.soundPositioning?.preserve !== undefined;
    const nextPreservePayload: SceneObjectSoundPositioningPreservePayload | undefined =
      shouldNormalizePreservePayload
        ? normalizeSoundPositioningPreservePayload(rawSoundPositioning?.preserve)
        : undefined;
    const nextSoundPositioning: SceneObjectSoundPositioning = { ...normalizedSoundPositioning };
    if (nextPreservePayload !== undefined) {
      nextSoundPositioning.preserve = nextPreservePayload;
    }
    const currentSoundPositioning = normalizedObject.soundPositioning;
    if (
      currentSoundPositioning?.mode === nextSoundPositioning.mode &&
      currentSoundPositioning?.elevation === nextSoundPositioning.elevation &&
      currentSoundPositioning?.maxVolumeDistance === nextSoundPositioning.maxVolumeDistance &&
      currentSoundPositioning?.cutoffDistance === nextSoundPositioning.cutoffDistance &&
      currentSoundPositioning?.randomRangeWestEast === nextSoundPositioning.randomRangeWestEast &&
      currentSoundPositioning?.randomRangeNorthSouth === nextSoundPositioning.randomRangeNorthSouth &&
      areSoundPositioningPreservePayloadEqual(
        currentSoundPositioning?.preserve,
        nextSoundPositioning.preserve
      ) &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.creatureProperties === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: undefined,
      creatureProperties: undefined,
      soundPositioning: nextSoundPositioning
    };
  }

  if (
    normalizedObject.placeableProperties === undefined &&
    normalizedObject.creatureProperties === undefined &&
    normalizedObject.soundPositioning === undefined
  ) {
    return normalizedObject;
  }

  // Defensive cleanup for corrupted drafts where metadata ended up on unsupported kinds.
  // This keeps runtime behavior deterministic without changing public API contracts.
  return {
    ...normalizedObject,
    placeableProperties: undefined,
    creatureProperties: undefined,
    soundPositioning: undefined
  };
}

export function rescaleSceneObjectsToSize(
  objects: SceneObject[],
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number
): SceneObject[] {
  return objects.map((object) =>
    normalizeSceneObjectMetadata({
      ...object,
      x: scaleCoordinate(object.x, fromWidth, toWidth),
      y: scaleCoordinate(object.y, fromHeight, toHeight)
    })
  );
}

function createSeedObjects(width: number, height: number): SceneObject[] {
  const seedObjects: Array<
    Omit<SceneObject, "visualTransform" | "bearing" | "tag" | "resRef" | "z"> & {
      resRef: string;
      tag: string;
      bearing?: number;
    }
  > = [
    { id: "plc_barrel_01", kind: "placeables", x: 3.2, y: 5.7, resRef: "plc_a01", tag: "PLC_BARREL_01" },
    { id: "plc_table_02", kind: "placeables", x: 6.6, y: 9.4, resRef: "plc_a02", tag: "PLC_TABLE_02" },
    { id: "plc_chair_03", kind: "placeables", x: 10.1, y: 8.1, resRef: "plc_x02", tag: "PLC_CHAIR_03" },
    { id: "plc_crate_04", kind: "placeables", x: 12.8, y: 13.4, resRef: "plc_a03", tag: "PLC_CRATE_04" },
    { id: "crt_devo_01", kind: "creatures", x: 8.4, y: 7.3, resRef: "nw_battdevour", tag: "CRT_DEVOURER_01" },
    { id: "crt_guard_02", kind: "creatures", x: 13.7, y: 6.4, resRef: "nw_hguard", tag: "CRT_GUARD_02" },
    { id: "dr_nw_01", kind: "doors", x: 1.5, y: 8.5, resRef: "nw_door_ttr_11", tag: "DOOR_WEST_01" },
    { id: "dr_nw_02", kind: "doors", x: 17.2, y: 9.1, resRef: "nw_door_ttr_11", tag: "DOOR_EAST_02" },
    { id: "itm_chest_01", kind: "items", x: 9.8, y: 4.7, resRef: "nw_it_mpotion001", tag: "ITEM_CHEST_01" },
    { id: "itm_sword_02", kind: "items", x: 14.2, y: 12.7, resRef: "nw_wswm001", tag: "ITEM_SWORD_02" },
    { id: "snd_amb_01", kind: "sounds", x: 5.1, y: 14.8, resRef: "as_amb_forest", tag: "SOUND_FOREST_01" },
    { id: "snd_amb_02", kind: "sounds", x: 15.4, y: 3.2, resRef: "as_amb_caves", tag: "SOUND_CAVES_02" }
  ];

  return seedObjects.map((entry) =>
    normalizeSceneObjectMetadata({
      ...entry,
      name: entry.tag,
      isStatic: entry.kind === "placeables",
      x: scaleCoordinate(entry.x, LEGACY_SEED_SCENE_WIDTH_TILES, width),
      y: scaleCoordinate(entry.y, LEGACY_SEED_SCENE_HEIGHT_TILES, height),
      z: 0,
      bearing: entry.bearing ?? 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0
      }
    })
  );
}

export function createSeedAreaScene(
  width = DEFAULT_SEED_SCENE_WIDTH_TILES,
  height = DEFAULT_SEED_SCENE_HEIGHT_TILES
): AreaScene {
  const tiles: SceneTile[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      tiles.push(createTile(row, col));
    }
  }

  return {
    sceneId: "wnd_seed_builder_v1",
    areaName: "Seed Area (MVP Runtime)",
    width,
    height,
    tiles,
    objects: createSeedObjects(width, height),
    walkmesh: createWalkmeshDomainModel({}),
    updatedAtUnixMs: Date.now(),
    source: "seed"
  };
}

export function createNewSceneObject(
  kind: SceneObjectKind,
  x: number,
  y: number,
  sequence: number
): SceneObject {
  const index = String(sequence).padStart(3, "0");
  const baseResRefByKind: Record<SceneObjectKind, string> = {
    placeables: "plc_a01",
    creatures: "nw_hguard",
    doors: "nw_door_ttr_11",
    items: "nw_it_mpotion001",
    sounds: "as_amb_forest"
  };

  const key = kind.slice(0, 3);
  return normalizeSceneObjectMetadata({
    id: `${key}_${index}`,
    kind,
    name: `${kind.toUpperCase()}_${index}`,
    resRef: baseResRefByKind[kind],
    tag: `${kind.toUpperCase()}_${index}`,
    isStatic: kind === "placeables",
    x,
    y,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0
    }
  });
}
