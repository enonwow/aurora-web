import type {
  AreaScene,
  SceneObjectCreatureAdvancedSettings,
  SceneObjectCreatureAppearanceProfile,
  SceneObjectCreatureAppearanceSettings,
  SceneObjectCreatureClassEntry,
  SceneObjectCreatureEquippedItemReference,
  SceneObjectCreatureFeatEntry,
  SceneObjectCreatureInventoryItemReference,
  SceneObjectCreatureLocalizedStringRefs,
  SceneObjectCreatureLocalizedStrings,
  SceneObjectCreatureLookupProfile,
  SceneObjectCreatureListCounts,
  SceneObjectCreatureProperties,
  SceneObjectCreatureScriptSlots,
  SceneObjectCreatureSkillEntry,
  SceneObjectCreatureSpecialAbilityEntry,
  SceneObjectCreatureSpellEntry,
  SceneObjectCreatureStatisticsSettings,
  SceneObjectCreatureTemplateEntry,
  SceneObjectEmbeddedItemSummary,
  SceneObjectItemPropertyEntry,
  SceneObjectPlaceableAdvancedSettings,
  SceneObjectDoorAdvancedSettings,
  SceneObjectDoorLockSettings,
  SceneObjectDoorProperties,
  SceneObjectDoorScriptSlots,
  SceneObjectDoorTrapSettings,
  SceneObjectPlaceableLockSettings,
  SceneObjectDoorTransitionPayload,
  SceneObject,
  SceneObjectPlaceableDisabledFlags,
  SceneObjectPlaceableInventoryItemReference,
  SceneObjectPlaceableProperties,
  SceneObjectPlaceableScriptSlots,
  SceneObjectPlaceableTrapSettings,
  SceneObjectSoundPositioningPreservePayload,
  SceneObjectSoundPositioning,
  SceneObjectVfxCanonicalStatus,
  SceneObjectVfxDiagnostic,
  SceneObjectVfxPreviewMode,
  SceneObjectVfxPreservePayload,
  SceneObjectVfxSourceKind,
  ScenePreservePrimitive,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import {
  collectAuroraVfxPayloadDiagnostics,
  normalizeAuroraVfxPayload
} from "./auroraVfxPayload";
import { createWalkmeshDomainModel } from "./walkmesh";
import {
  normalizeSoundPositioning,
  normalizeSoundPositioningPreservePayload
} from "./sound";
import {
  AREA_DOOR_CONSTRUCTION_PROFILE,
  getAreaDoorConstructionDefaults,
  getAreaObjectConstructionDefaults,
} from "./areaWaypointConstructionProfile";
import { isPlaceableDurabilitySaveByte } from "./placeableDurabilitySaveBytes";
import { isEditablePlaceableHitPoints } from "./placeableHitPoints";
import {
  areaDoorTransitionStorageEqual,
  cloneAreaDoorTransitionStorage,
  isAreaDoorTransitionStorage,
} from "../../shared/domain/areaDoorTransitionStorage";
import {
  placeableVariableTargetEntriesEqual,
  readPlaceableVariableTargetEntries,
} from "./placeableVariableTable";
import {
  isPlaceableTrapTargetValue,
  type PlaceableTrapByteField
} from "./placeableTrapByteFields";

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
export const DEFAULT_BLANK_SCENE_ID = "blank_builder_v1";

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

export function createEmptyPlaceableScriptSlots(): SceneObjectPlaceableScriptSlots {
  return { ...DEFAULT_PLACEABLE_SCRIPT_SLOTS };
}

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

export function createDefaultPlaceableTrapSettings(): SceneObjectPlaceableTrapSettings {
  return { ...DEFAULT_PLACEABLE_TRAP_SETTINGS };
}

const DEFAULT_PLACEABLE_ADVANCED_SETTINGS: Required<
  Pick<
    SceneObjectPlaceableAdvancedSettings,
    | "blueprintResRef"
    | "belongsToFaction"
    | "portraitResRef"
    | "initialState"
    | "treasureModel"
  >
> = {
  blueprintResRef: "",
  belongsToFaction: "Hostile",
  portraitResRef: "",
  initialState: "Default",
  treasureModel: "Default"
};

const DEFAULT_DOOR_PROPERTIES: SceneObjectDoorProperties = {
  plot: false,
  hardness: 5,
  hitPoints: 80,
  fortitudeSave: 16,
  reflexSave: 0,
  willSave: 0,
  appearanceType: "Use Generic Appearance",
  genericAppearance: "Wooden Door (Strong)"
};

const DEFAULT_DOOR_LOCK_SETTINGS: SceneObjectDoorLockSettings = {
  locked: false,
  canRelock: false,
  autoRemoveKeyAfterUse: false,
  keyRequiredToUnlockOrLock: false,
  openLockDc: 18,
  closeLockDc: 0,
  keyTag: ""
};

const DEFAULT_DOOR_TRAP_SETTINGS: SceneObjectDoorTrapSettings = {
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

const DEFAULT_DOOR_SCRIPT_SLOTS: SceneObjectDoorScriptSlots = {
  onAreaTransitionClick: "",
  onClose: "",
  onDamaged: "",
  onDeath: "",
  onFailToOpen: "",
  onHeartbeat: "",
  onLock: "",
  onPhysicalAttacked: "",
  onOpen: "",
  onSpellCastAt: "",
  onUnlock: "",
  onUserDefined: ""
};

const DEFAULT_DOOR_ADVANCED_SETTINGS: SceneObjectDoorAdvancedSettings = {
  blueprintResRef: "",
  belongsToFaction: "Hostile",
  conversation: "",
  noInterrupt: false,
  portraitResRef: "",
  initialState: "Closed"
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
  currentHitPoints: 10,
  maxHitPoints: 10,
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
  tail: "",
  colors: {
    skin: "",
    hair: "",
    tattoo1: "",
    tattoo2: ""
  },
  sourceOnlyParts: {
    belt: "",
    robe: "",
    rightShoulder: "",
    leftShoulder: ""
  }
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

const DEFAULT_CREATURE_ADVANCED_SETTINGS = {
  blueprintResRef: "",
  disarmable: false,
  plot: false,
  playerCharacter: false,
  leavesLootableCorpse: false,
  noPermanentDeath: false,
  immortal: false,
  bodyBag: false,
  startingPackage: false,
  treasureModel: "Default",
  corpseDecayTimeSeconds: 5,
  faction: "Hostile",
  subrace: "",
  deity: "",
  challengeRatingAdjustment: 0,
  soundSet: "",
  perceptionRange: "Default"
} satisfies SceneObjectCreatureAdvancedSettings;

const DEFAULT_CREATURE_CLASS_ENTRIES: SceneObjectCreatureClassEntry[] = [
  { className: "Aberration", level: 1 }
];

const DEFAULT_CREATURE_TEMPLATE_ENTRIES: SceneObjectCreatureTemplateEntry[] = [];
const DEFAULT_CREATURE_SKILL_ENTRIES: SceneObjectCreatureSkillEntry[] = [];
const DEFAULT_CREATURE_FEAT_ENTRIES: SceneObjectCreatureFeatEntry[] = [];
const DEFAULT_CREATURE_SPELL_ENTRIES: SceneObjectCreatureSpellEntry[] = [];
const DEFAULT_CREATURE_SPECIAL_ABILITY_ENTRIES: SceneObjectCreatureSpecialAbilityEntry[] = [];
const DEFAULT_CREATURE_INVENTORY_ITEMS: SceneObjectCreatureInventoryItemReference[] = [];
const DEFAULT_CREATURE_EQUIPPED_ITEMS: SceneObjectCreatureEquippedItemReference[] = [];

const DEFAULT_VFX_PAYLOAD: SceneObjectVfxPreservePayload = {
  version: "scene-object-vfx-preserve/v1",
  profile: "",
  emitter: "",
  script: "",
  sourceKind: "unknown",
  sourceProfile: "",
  sourceTable: "",
  sourceLabel: "",
  sourceResRef: "",
  previewMode: "none",
  canonicalStatus: "unmapped",
  diagnostics: [],
  flags: {},
  extra: {}
};

const VFX_SOURCE_KINDS = new Set<SceneObjectVfxSourceKind>([
  "unknown",
  "placeable_preview",
  "source_mdl_graph",
  "visualeffects_2da",
  "effect_instance"
]);

const VFX_PREVIEW_MODES = new Set<SceneObjectVfxPreviewMode>([
  "none",
  "sprite_scaffold",
  "derived_model_preview",
  "static_model_preview",
  "aurora_emitter_particle_preview",
  "aurora_light_node_preview",
  "aurora_light_node_source_only",
  "texture_particle_preview",
  "chunk_model_source_only",
  "chunk_model_particle_preview"
]);

const VFX_CANONICAL_STATUSES = new Set<SceneObjectVfxCanonicalStatus>([
  "unmapped",
  "preview_only",
  "canonical"
]);

const VFX_DIAGNOSTIC_SEVERITIES = new Set<SceneObjectVfxDiagnostic["severity"]>([
  "info",
  "warn",
  "error"
]);

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function asOptionalString(value: unknown, fallback: string | undefined): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return fallback;
}

function asEnumValue<TValue extends string>(
  value: unknown,
  allowed: ReadonlySet<TValue>,
  fallback: TValue
): TValue {
  if (typeof value !== "string") {
    return fallback;
  }
  return allowed.has(value as TValue) ? (value as TValue) : fallback;
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function asOptionalInteger(value: unknown, fallback: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : fallback;
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

function normalizeVfxDiagnostics(value: unknown): SceneObjectVfxDiagnostic[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    if (!isRecord(entry)) {
      return [];
    }
    const code = asString(entry.code, "").trim();
    if (!code) {
      return [];
    }
    return [
      {
        code,
        severity: asEnumValue(entry.severity, VFX_DIAGNOSTIC_SEVERITIES, "warn"),
        message: asString(entry.message, "")
      }
    ];
  });
}

function normalizeVfxPayload(value: unknown): SceneObjectVfxPreservePayload | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const sourceRowId = asFiniteNumber(value.sourceRowId, Number.NaN);
  const auroraPayload = normalizeAuroraVfxPayload(value.auroraPayload);
  const requestedCanonicalStatus = asEnumValue(
    value.canonicalStatus,
    VFX_CANONICAL_STATUSES,
    DEFAULT_VFX_PAYLOAD.canonicalStatus
  );
  const legacyCanonicalDowngraded =
    requestedCanonicalStatus === "canonical" && auroraPayload?.backendCanonical !== true;
  const diagnostics = normalizeVfxDiagnostics(value.diagnostics);
  const canonicalStatus = auroraPayload?.canonicalStatus ??
    (legacyCanonicalDowngraded ? "preview_only" : requestedCanonicalStatus);
  if (legacyCanonicalDowngraded) {
    diagnostics.push({
      code: "VFX_CANONICAL_STATUS_BACKEND_MARK_REQUIRED",
      severity: "warn",
      message:
        "Legacy VFX payload requested canonical status without backendCanonical=true; frontend downgraded it to preview_only."
    });
  }
  if (auroraPayload) {
    diagnostics.push(...collectAuroraVfxPayloadDiagnostics(auroraPayload));
  }
  return {
    version: "scene-object-vfx-preserve/v1",
    profile: asString(value.profile, DEFAULT_VFX_PAYLOAD.profile),
    emitter: asString(value.emitter, DEFAULT_VFX_PAYLOAD.emitter),
    script: asString(value.script, DEFAULT_VFX_PAYLOAD.script),
    sourceKind:
      auroraPayload?.sourceKind ??
      asEnumValue(value.sourceKind, VFX_SOURCE_KINDS, DEFAULT_VFX_PAYLOAD.sourceKind),
    sourceProfile:
      auroraPayload?.provenance.sourceProfile ??
      asString(value.sourceProfile, DEFAULT_VFX_PAYLOAD.sourceProfile),
    sourceTable:
      auroraPayload?.provenance.sourceTable ??
      asString(value.sourceTable, DEFAULT_VFX_PAYLOAD.sourceTable),
    ...(typeof auroraPayload?.provenance.sourceRowId === "number"
      ? { sourceRowId: auroraPayload.provenance.sourceRowId }
      : Number.isFinite(sourceRowId)
        ? { sourceRowId }
        : {}),
    sourceLabel:
      auroraPayload?.provenance.sourceLabel ??
      asString(value.sourceLabel, DEFAULT_VFX_PAYLOAD.sourceLabel),
    sourceResRef:
      auroraPayload?.provenance.sourceResRef ??
      asString(value.sourceResRef, DEFAULT_VFX_PAYLOAD.sourceResRef),
    previewMode:
      auroraPayload?.previewMode ??
      asEnumValue(value.previewMode, VFX_PREVIEW_MODES, DEFAULT_VFX_PAYLOAD.previewMode),
    canonicalStatus,
    diagnostics: dedupeVfxDiagnostics(diagnostics),
    ...(auroraPayload ? { auroraPayload } : {}),
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
    left.sourceKind === right.sourceKind &&
    left.sourceProfile === right.sourceProfile &&
    left.sourceTable === right.sourceTable &&
    left.sourceRowId === right.sourceRowId &&
    left.sourceLabel === right.sourceLabel &&
    left.sourceResRef === right.sourceResRef &&
    left.previewMode === right.previewMode &&
    left.canonicalStatus === right.canonicalStatus &&
    areVfxDiagnosticsEqual(left.diagnostics, right.diagnostics) &&
    areAuroraVfxPayloadsEqual(left.auroraPayload, right.auroraPayload) &&
    areBooleanMapsEqual(left.flags, right.flags) &&
    arePrimitiveMapsEqual(left.extra, right.extra)
  );
}

function areAuroraVfxPayloadsEqual(
  left: SceneObjectVfxPreservePayload["auroraPayload"],
  right: SceneObjectVfxPreservePayload["auroraPayload"]
): boolean {
  if (left === undefined || right === undefined) {
    return left === right;
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

function areVfxDiagnosticsEqual(
  left: SceneObjectVfxDiagnostic[],
  right: SceneObjectVfxDiagnostic[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => {
    const candidate = right[index];
    if (!candidate) {
      return false;
    }
    return (
      entry.code === candidate.code &&
      entry.severity === candidate.severity &&
      entry.message === candidate.message
    );
  });
}

function dedupeVfxDiagnostics(
  diagnostics: SceneObjectVfxDiagnostic[]
): SceneObjectVfxDiagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((diagnostic) => {
    const key = `${diagnostic.code}:${diagnostic.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
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

function areDoorTransitionStorageValuesEqual(
  left: SceneObjectDoorTransitionPayload["storage"],
  right: SceneObjectDoorTransitionPayload["storage"],
): boolean {
  if (left === undefined && right === undefined) return true;
  if (!left || !right || !isAreaDoorTransitionStorage(left)) return false;
  return Object.isFrozen(left) && areaDoorTransitionStorageEqual(left, right);
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
  const hasEqualPresence = (field: PlaceableTrapByteField): boolean =>
    Object.prototype.hasOwnProperty.call(left, field) ===
    Object.prototype.hasOwnProperty.call(right, field);
  return (
    hasEqualPresence("isTrapped") &&
    hasEqualPresence("detectable") &&
    hasEqualPresence("disarmable") &&
    hasEqualPresence("oneShot") &&
    hasEqualPresence("detectionDc") &&
    hasEqualPresence("disarmDc") &&
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
  const hasEqualPresence = (field: keyof SceneObjectPlaceableAdvancedSettings): boolean =>
    Object.prototype.hasOwnProperty.call(left, field) ===
    Object.prototype.hasOwnProperty.call(right, field);
  return (
    hasEqualPresence("blueprintResRef") &&
    hasEqualPresence("belongsToFaction") &&
    hasEqualPresence("factionId") &&
    hasEqualPresence("conversation") &&
    hasEqualPresence("noInterrupt") &&
    hasEqualPresence("portraitResRef") &&
    hasEqualPresence("portraitId") &&
    hasEqualPresence("initialState") &&
    hasEqualPresence("treasureModel") &&
    hasEqualPresence("treasureModelRow") &&
    left.blueprintResRef === right.blueprintResRef &&
    left.belongsToFaction === right.belongsToFaction &&
    left.factionId === right.factionId &&
    left.conversation === right.conversation &&
    left.noInterrupt === right.noInterrupt &&
    left.portraitResRef === right.portraitResRef &&
    left.portraitId === right.portraitId &&
    left.initialState === right.initialState &&
    left.treasureModel === right.treasureModel &&
    left.treasureModelRow === right.treasureModelRow
  );
}

function areDoorLockSettingsEqual(
  left: SceneObjectDoorLockSettings | undefined,
  right: SceneObjectDoorLockSettings | undefined
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

function areDoorTrapSettingsEqual(
  left: SceneObjectDoorTrapSettings | undefined,
  right: SceneObjectDoorTrapSettings | undefined
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

function areDoorScriptSlotsEqual(
  left: SceneObjectDoorScriptSlots | undefined,
  right: SceneObjectDoorScriptSlots | undefined
): boolean {
  if (!left && !right) {
    return true;
  }
  if (!left || !right) {
    return false;
  }
  return (
    left.onAreaTransitionClick === right.onAreaTransitionClick &&
    left.onClose === right.onClose &&
    left.onDamaged === right.onDamaged &&
    left.onDeath === right.onDeath &&
    left.onFailToOpen === right.onFailToOpen &&
    left.onHeartbeat === right.onHeartbeat &&
    left.onLock === right.onLock &&
    left.onPhysicalAttacked === right.onPhysicalAttacked &&
    left.onOpen === right.onOpen &&
    left.onSpellCastAt === right.onSpellCastAt &&
    left.onUnlock === right.onUnlock &&
    left.onUserDefined === right.onUserDefined
  );
}

function areDoorAdvancedSettingsEqual(
  left: SceneObjectDoorAdvancedSettings | undefined,
  right: SceneObjectDoorAdvancedSettings | undefined
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
    left.initialState === right.initialState
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
      ...(typeof candidate.classId === "number" && Number.isFinite(candidate.classId)
        ? { classId: Math.max(0, Math.min(255, Math.trunc(candidate.classId))) }
        : {}),
      className: className.length > 0 ? className : "Class",
      level
    };
  });
}

function normalizeCreatureTemplateEntries(value: unknown): SceneObjectCreatureTemplateEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((entry) => {
      const candidate = isRecord(entry) ? entry : {};
      const templateId = candidate.templateId;
      return typeof templateId === "number" && Number.isFinite(templateId)
        ? { templateId: Math.trunc(templateId) }
        : {};
    })
    .filter((entry) => typeof entry.templateId === "number");
}

function normalizeCreatureLocalizedStringRefs(
  value: Partial<Record<keyof SceneObjectCreatureLocalizedStringRefs, unknown>> | undefined,
  fallback?: SceneObjectCreatureLocalizedStringRefs
): SceneObjectCreatureLocalizedStringRefs | undefined {
  const refs: SceneObjectCreatureLocalizedStringRefs = {
    ...(asOptionalInteger(value?.firstName, fallback?.firstName) !== undefined
      ? { firstName: asOptionalInteger(value?.firstName, fallback?.firstName) }
      : {}),
    ...(asOptionalInteger(value?.lastName, fallback?.lastName) !== undefined
      ? { lastName: asOptionalInteger(value?.lastName, fallback?.lastName) }
      : {}),
    ...(asOptionalInteger(value?.localizedName, fallback?.localizedName) !== undefined
      ? { localizedName: asOptionalInteger(value?.localizedName, fallback?.localizedName) }
      : {}),
    ...(asOptionalInteger(value?.description, fallback?.description) !== undefined
      ? { description: asOptionalInteger(value?.description, fallback?.description) }
      : {}),
    ...(asOptionalInteger(value?.identifiedDescription, fallback?.identifiedDescription) !== undefined
      ? {
          identifiedDescription: asOptionalInteger(
            value?.identifiedDescription,
            fallback?.identifiedDescription
          )
        }
      : {}),
    ...(asOptionalInteger(value?.subrace, fallback?.subrace) !== undefined
      ? { subrace: asOptionalInteger(value?.subrace, fallback?.subrace) }
      : {}),
    ...(asOptionalInteger(value?.deity, fallback?.deity) !== undefined
      ? { deity: asOptionalInteger(value?.deity, fallback?.deity) }
      : {})
  };

  return Object.values(refs).some((entry) => entry !== undefined) ? refs : undefined;
}

function normalizeCreatureLookupProfile(
  value: Partial<Record<keyof SceneObjectCreatureLookupProfile, unknown>> | undefined,
  fallback?: SceneObjectCreatureLookupProfile
): SceneObjectCreatureLookupProfile | undefined {
  const raceLabelSource2daRow = asOptionalInteger(
    value?.raceLabelSource2daRow,
    fallback?.raceLabelSource2daRow
  );
  const raceLabelSourceKey = asOptionalString(
    value?.raceLabelSourceKey,
    fallback?.raceLabelSourceKey
  );
  const genderLabelSource2daRow = asOptionalInteger(
    value?.genderLabelSource2daRow,
    fallback?.genderLabelSource2daRow
  );
  const genderLabelSourceKey = asOptionalString(
    value?.genderLabelSourceKey,
    fallback?.genderLabelSourceKey
  );
  const portraitResolvedSource2daRow = asOptionalInteger(
    value?.portraitResolvedSource2daRow,
    fallback?.portraitResolvedSource2daRow
  );
  const portraitResolvedSourceKey = asOptionalString(
    value?.portraitResolvedSourceKey,
    fallback?.portraitResolvedSourceKey
  );
  const soundSetResRef = asOptionalString(value?.soundSetResRef, fallback?.soundSetResRef);
  const soundSetSource2daRow = asOptionalInteger(
    value?.soundSetSource2daRow,
    fallback?.soundSetSource2daRow
  );
  const soundSetSourceKey = asOptionalString(
    value?.soundSetSourceKey,
    fallback?.soundSetSourceKey
  );
  const profile: SceneObjectCreatureLookupProfile = {
    ...(raceLabelSource2daRow !== undefined ? { raceLabelSource2daRow } : {}),
    ...(raceLabelSourceKey ? { raceLabelSourceKey } : {}),
    ...(genderLabelSource2daRow !== undefined ? { genderLabelSource2daRow } : {}),
    ...(genderLabelSourceKey ? { genderLabelSourceKey } : {}),
    ...(portraitResolvedSource2daRow !== undefined ? { portraitResolvedSource2daRow } : {}),
    ...(portraitResolvedSourceKey ? { portraitResolvedSourceKey } : {}),
    ...(soundSetResRef ? { soundSetResRef } : {}),
    ...(soundSetSource2daRow !== undefined ? { soundSetSource2daRow } : {}),
    ...(soundSetSourceKey ? { soundSetSourceKey } : {})
  };

  return Object.values(profile).some((entry) => entry !== undefined) ? profile : undefined;
}

function asOptionalCount(value: unknown, fallback: number | undefined): number | undefined {
  const integer = asOptionalInteger(value, fallback);
  return integer === undefined ? undefined : clampMin(integer, 0);
}

function normalizeCreatureListCounts(
  value: Partial<Record<keyof SceneObjectCreatureListCounts, unknown>> | undefined,
  fallback?: SceneObjectCreatureListCounts
): SceneObjectCreatureListCounts | undefined {
  const classListCount = asOptionalCount(value?.classListCount, fallback?.classListCount);
  const skillListCount = asOptionalCount(value?.skillListCount, fallback?.skillListCount);
  const featListCount = asOptionalCount(value?.featListCount, fallback?.featListCount);
  const templateListCount = asOptionalCount(
    value?.templateListCount,
    fallback?.templateListCount
  );
  const specAbilityListCount = asOptionalCount(
    value?.specAbilityListCount,
    fallback?.specAbilityListCount
  );
  const inventoryItemListCount = asOptionalCount(
    value?.inventoryItemListCount,
    fallback?.inventoryItemListCount
  );
  const equipItemListCount = asOptionalCount(
    value?.equipItemListCount,
    fallback?.equipItemListCount
  );
  const counts: SceneObjectCreatureListCounts = {
    ...(classListCount !== undefined ? { classListCount } : {}),
    ...(skillListCount !== undefined ? { skillListCount } : {}),
    ...(featListCount !== undefined ? { featListCount } : {}),
    ...(templateListCount !== undefined ? { templateListCount } : {}),
    ...(specAbilityListCount !== undefined ? { specAbilityListCount } : {}),
    ...(inventoryItemListCount !== undefined ? { inventoryItemListCount } : {}),
    ...(equipItemListCount !== undefined ? { equipItemListCount } : {})
  };

  return Object.values(counts).some((entry) => entry !== undefined) ? counts : undefined;
}

function normalizeCreatureLocalizedStrings(
  value: Partial<Record<keyof SceneObjectCreatureLocalizedStrings, unknown>> | undefined,
  fallback?: SceneObjectCreatureLocalizedStrings
): SceneObjectCreatureLocalizedStrings | undefined {
  const localizedName = asOptionalString(value?.localizedName, fallback?.localizedName);
  const displayName = asOptionalString(value?.displayName, fallback?.displayName);
  const identifiedDescription = asOptionalString(
    value?.identifiedDescription,
    fallback?.identifiedDescription
  );
  const strings: SceneObjectCreatureLocalizedStrings = {
    ...(localizedName ? { localizedName } : {}),
    ...(displayName ? { displayName } : {}),
    ...(identifiedDescription ? { identifiedDescription } : {})
  };

  return Object.values(strings).some((entry) => entry !== undefined) ? strings : undefined;
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
      ...(typeof candidate.featId === "number" && Number.isFinite(candidate.featId)
        ? { featId: Math.max(0, Math.min(65535, Math.trunc(candidate.featId))) }
        : {}),
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
      ...(typeof candidate.spellId === "number" && Number.isFinite(candidate.spellId)
        ? { spellId: Math.max(0, Math.min(65535, Math.trunc(candidate.spellId))) }
        : {}),
      ...(typeof candidate.classIndex === "number" && Number.isFinite(candidate.classIndex)
        ? { classIndex: clampMin(Math.trunc(candidate.classIndex), 0) }
        : {}),
      prepared: isBoolean(candidate.prepared) ? candidate.prepared : false,
      name: asString(candidate.name, "").trim(),
      spellLevel: clampMin(Math.trunc(asFiniteNumber(candidate.spellLevel, 0)), 0),
      castingLevel: clampMin(Math.trunc(asFiniteNumber(candidate.castingLevel, 0)), 0),
      ...(typeof candidate.metaMagic === "number" && Number.isFinite(candidate.metaMagic)
        ? { metaMagic: Math.trunc(candidate.metaMagic) }
        : {}),
      ...(typeof candidate.flags === "number" && Number.isFinite(candidate.flags)
        ? { flags: Math.trunc(candidate.flags) }
        : {})
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
      ...(typeof candidate.spellId === "number" && Number.isFinite(candidate.spellId)
        ? { spellId: Math.max(0, Math.min(65535, Math.trunc(candidate.spellId))) }
        : {}),
      ...(typeof candidate.flags === "number" && Number.isFinite(candidate.flags)
        ? { flags: Math.max(0, Math.min(255, Math.trunc(candidate.flags))) }
        : {}),
      name: asString(candidate.name, "").trim(),
      type: asString(candidate.type, "").trim(),
      casterLevel: clampMin(Math.trunc(asFiniteNumber(candidate.casterLevel, 0)), 0),
      uses: clampMin(Math.trunc(asFiniteNumber(candidate.uses, 0)), 0)
    };
  });
}

function normalizeEmbeddedItemPropertyEntries(
  value: unknown
): SceneObjectItemPropertyEntry[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((entry) => {
      const candidate = isRecord(entry) ? entry : {};
      const normalized: SceneObjectItemPropertyEntry = {
        propertyName: normalizeEmbeddedItemNumber(candidate.propertyName),
        propertyLabel: asString(candidate.propertyLabel, "").trim() || undefined,
        subtype: normalizeEmbeddedItemNumber(candidate.subtype),
        costTable: normalizeEmbeddedItemNumber(candidate.costTable),
        costValue: normalizeEmbeddedItemNumber(candidate.costValue),
        param1: normalizeEmbeddedItemNumber(candidate.param1),
        param1Value: normalizeEmbeddedItemNumber(candidate.param1Value),
        chanceAppear: normalizeEmbeddedItemNumber(candidate.chanceAppear),
        propertyDefinitionSource2daRow: normalizeEmbeddedItemNumber(
          candidate.propertyDefinitionSource2daRow
        ),
        propertyDefinitionSourceKey:
          asString(candidate.propertyDefinitionSourceKey, "").trim() || undefined,
        subTypeTable: asString(candidate.subTypeTable, "").trim() || undefined,
        costTableDefinition: asString(candidate.costTableDefinition, "").trim() || undefined,
        param1Table: asString(candidate.param1Table, "").trim() || undefined,
        nameStrRef: normalizeEmbeddedItemNumber(candidate.nameStrRef),
        gameStrRef: normalizeEmbeddedItemNumber(candidate.gameStrRef),
        descriptionStrRef: normalizeEmbeddedItemNumber(candidate.descriptionStrRef)
      };
      return Object.values(normalized).some((entryValue) => entryValue !== undefined && entryValue !== "")
        ? normalized
        : undefined;
    })
    .filter((entry): entry is SceneObjectItemPropertyEntry => entry !== undefined);
}

function normalizeEmbeddedItemSummary(value: unknown): SceneObjectEmbeddedItemSummary | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const itemPropertyListEntries = normalizeEmbeddedItemPropertyEntries(
    value.itemPropertyListEntries
  );
  const normalized: SceneObjectEmbeddedItemSummary = {
    sourceStructTypeId: normalizeEmbeddedItemNumber(value.sourceStructTypeId),
    templateResRef: asString(value.templateResRef, "").trim() || undefined,
    tag: asString(value.tag, "").trim() || undefined,
    localizedName: asString(value.localizedName, "").trim() || undefined,
    localizedNameStrRef: normalizeEmbeddedItemNumber(value.localizedNameStrRef),
    description: asString(value.description, "").trim() || undefined,
    descriptionStrRef: normalizeEmbeddedItemNumber(value.descriptionStrRef),
    identifiedDescription: asString(value.identifiedDescription, "").trim() || undefined,
    identifiedDescriptionStrRef: normalizeEmbeddedItemNumber(value.identifiedDescriptionStrRef),
    comments: asString(value.comments, "").trim() || undefined,
    paletteId: normalizeEmbeddedItemNumber(value.paletteId),
    plot: isBoolean(value.plot) ? value.plot : undefined,
    baseItem: normalizeEmbeddedItemNumber(value.baseItem),
    modelPart1: normalizeEmbeddedItemNumber(value.modelPart1),
    modelPart2: normalizeEmbeddedItemNumber(value.modelPart2),
    modelPart3: normalizeEmbeddedItemNumber(value.modelPart3),
    cost: normalizeEmbeddedItemNumber(value.cost),
    addCost: normalizeEmbeddedItemNumber(value.addCost),
    costTable: normalizeEmbeddedItemNumber(value.costTable),
    costValue: normalizeEmbeddedItemNumber(value.costValue),
    charges: normalizeEmbeddedItemNumber(value.charges),
    stackSize: normalizeEmbeddedItemNumber(value.stackSize),
    identified: isBoolean(value.identified) ? value.identified : undefined,
    stolen: isBoolean(value.stolen) ? value.stolen : undefined,
    cursed: isBoolean(value.cursed) ? value.cursed : undefined,
    bodyPartRFoot: normalizeEmbeddedItemNumber(value.bodyPartRFoot),
    bodyPartLFoot: normalizeEmbeddedItemNumber(value.bodyPartLFoot),
    bodyPartRShin: normalizeEmbeddedItemNumber(value.bodyPartRShin),
    bodyPartLShin: normalizeEmbeddedItemNumber(value.bodyPartLShin),
    bodyPartLThigh: normalizeEmbeddedItemNumber(value.bodyPartLThigh),
    bodyPartRThigh: normalizeEmbeddedItemNumber(value.bodyPartRThigh),
    bodyPartPelvis: normalizeEmbeddedItemNumber(value.bodyPartPelvis),
    bodyPartTorso: normalizeEmbeddedItemNumber(value.bodyPartTorso),
    bodyPartBelt: normalizeEmbeddedItemNumber(value.bodyPartBelt),
    bodyPartNeck: normalizeEmbeddedItemNumber(value.bodyPartNeck),
    bodyPartRFArm: normalizeEmbeddedItemNumber(value.bodyPartRFArm),
    bodyPartLFArm: normalizeEmbeddedItemNumber(value.bodyPartLFArm),
    bodyPartRBicep: normalizeEmbeddedItemNumber(value.bodyPartRBicep),
    bodyPartLBicep: normalizeEmbeddedItemNumber(value.bodyPartLBicep),
    bodyPartRShoul: normalizeEmbeddedItemNumber(value.bodyPartRShoul),
    bodyPartLShoul: normalizeEmbeddedItemNumber(value.bodyPartLShoul),
    bodyPartRHand: normalizeEmbeddedItemNumber(value.bodyPartRHand),
    bodyPartLHand: normalizeEmbeddedItemNumber(value.bodyPartLHand),
    bodyPartRobe: normalizeEmbeddedItemNumber(value.bodyPartRobe),
    leather1Color: normalizeEmbeddedItemNumber(value.leather1Color),
    leather2Color: normalizeEmbeddedItemNumber(value.leather2Color),
    cloth1Color: normalizeEmbeddedItemNumber(value.cloth1Color),
    cloth2Color: normalizeEmbeddedItemNumber(value.cloth2Color),
    metal1Color: normalizeEmbeddedItemNumber(value.metal1Color),
    metal2Color: normalizeEmbeddedItemNumber(value.metal2Color),
    itemPropertyListCount:
      itemPropertyListEntries !== undefined
        ? itemPropertyListEntries.length
        : normalizeEmbeddedItemNumber(value.itemPropertyListCount),
    itemPropertyListEntries,
    scripts: normalizeEmbeddedItemScripts(value.scripts),
    fieldCount: normalizeEmbeddedItemNumber(value.fieldCount)
  };
  return Object.entries(normalized).some(([key, entry]) =>
    key === "itemPropertyListEntries"
      ? Array.isArray(entry) && entry.length > 0
      : entry !== undefined && entry !== ""
  )
    ? normalized
    : undefined;
}

function normalizeEmbeddedItemScripts(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const normalized = Object.fromEntries(
    Object.entries(value)
      .map(([key, entry]) => [key.trim(), asString(entry, "").trim()] as const)
      .filter(([key, entry]) => key.length > 0 && entry.length > 0)
  );
  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function normalizeEmbeddedItemNumber(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.trunc(value);
}

function normalizeCreatureInventoryItems(
  value: unknown
): SceneObjectCreatureInventoryItemReference[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((entry) => {
      const candidate = isRecord(entry) ? entry : {};
      const normalized: SceneObjectCreatureInventoryItemReference = {
        sourceIndex:
          typeof candidate.sourceIndex === "number" &&
          Number.isSafeInteger(candidate.sourceIndex) &&
          candidate.sourceIndex >= 0
            ? candidate.sourceIndex
            : undefined,
        resRef: asString(candidate.resRef, "").trim() || undefined,
        randomResRef: asString(candidate.randomResRef, "").trim() || undefined,
        randomList: asString(candidate.randomList, "").trim() || undefined,
        embeddedItem: normalizeEmbeddedItemSummary(candidate.embeddedItem),
        itemTemplateId: asString(candidate.itemTemplateId, "").trim() || undefined,
        itemResRef: asString(candidate.itemResRef, "").trim() || undefined,
        itemSourceFingerprint: asString(candidate.itemSourceFingerprint, "").trim() || undefined,
        itemSourceObjectKey: asString(candidate.itemSourceObjectKey, "").trim() || undefined,
        itemBaseItem:
          typeof candidate.itemBaseItem === "number" && Number.isFinite(candidate.itemBaseItem)
            ? Math.trunc(candidate.itemBaseItem)
            : undefined,
        itemBaseItemEquipableSlots:
          asString(candidate.itemBaseItemEquipableSlots, "").trim() || undefined,
        x:
          typeof candidate.x === "number" && Number.isFinite(candidate.x)
            ? Math.trunc(candidate.x)
            : undefined,
        y:
          typeof candidate.y === "number" && Number.isFinite(candidate.y)
            ? Math.trunc(candidate.y)
            : undefined,
        dropable: isBoolean(candidate.dropable) ? candidate.dropable : undefined,
        pickpocketable: isBoolean(candidate.pickpocketable) ? candidate.pickpocketable : undefined,
        infinite: isBoolean(candidate.infinite) ? candidate.infinite : undefined
      };
      return Object.fromEntries(
        Object.entries(normalized).filter(([, entryValue]) => entryValue !== undefined)
      ) as SceneObjectCreatureInventoryItemReference;
    })
    .filter((entry) => Object.values(entry).some((value) => value !== undefined && value !== ""));
}

function normalizePlaceableInventoryItems(
  value: unknown
): SceneObjectPlaceableInventoryItemReference[] | undefined {
  const normalized = normalizeCreatureInventoryItems(value);
  return normalized;
}

function normalizeCreatureEquippedItems(
  value: unknown
): SceneObjectCreatureEquippedItemReference[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value
    .map((entry) => {
      const candidate = isRecord(entry) ? entry : {};
      const normalized: SceneObjectCreatureEquippedItemReference = {
        resRef: asString(candidate.resRef, "").trim() || undefined,
        randomResRef: asString(candidate.randomResRef, "").trim() || undefined,
        randomList: asString(candidate.randomList, "").trim() || undefined,
        embeddedItem: normalizeEmbeddedItemSummary(candidate.embeddedItem),
        itemTemplateId: asString(candidate.itemTemplateId, "").trim() || undefined,
        itemResRef: asString(candidate.itemResRef, "").trim() || undefined,
        itemSourceFingerprint: asString(candidate.itemSourceFingerprint, "").trim() || undefined,
        itemSourceObjectKey: asString(candidate.itemSourceObjectKey, "").trim() || undefined,
        itemBaseItem:
          typeof candidate.itemBaseItem === "number" && Number.isFinite(candidate.itemBaseItem)
            ? Math.trunc(candidate.itemBaseItem)
            : undefined,
        itemBaseItemEquipableSlots:
          asString(candidate.itemBaseItemEquipableSlots, "").trim() || undefined,
        slotMask:
          typeof candidate.slotMask === "number" && Number.isFinite(candidate.slotMask)
            ? Math.trunc(candidate.slotMask)
            : undefined,
        dropable: isBoolean(candidate.dropable) ? candidate.dropable : undefined,
        pickpocketable: isBoolean(candidate.pickpocketable) ? candidate.pickpocketable : undefined,
        infinite: isBoolean(candidate.infinite) ? candidate.infinite : undefined
      };
      return normalized;
    })
    .filter((entry) => Object.values(entry).some((value) => value !== undefined && value !== ""));
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
      entry.classId === right[index]?.classId &&
      entry.className === right[index]?.className &&
      entry.level === right[index]?.level
  );
}

function areCreatureTemplateEntriesEqual(
  left: SceneObjectCreatureTemplateEntry[] | undefined,
  right: SceneObjectCreatureTemplateEntry[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every((entry, index) => entry.templateId === right[index]?.templateId);
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
      entry.featId === right[index]?.featId &&
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
      entry.spellId === right[index]?.spellId &&
      entry.classIndex === right[index]?.classIndex &&
      entry.prepared === right[index]?.prepared &&
      entry.name === right[index]?.name &&
      entry.spellLevel === right[index]?.spellLevel &&
      entry.castingLevel === right[index]?.castingLevel &&
      entry.metaMagic === right[index]?.metaMagic &&
      entry.flags === right[index]?.flags
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
      entry.spellId === right[index]?.spellId &&
      entry.flags === right[index]?.flags &&
      entry.name === right[index]?.name &&
      entry.type === right[index]?.type &&
      entry.casterLevel === right[index]?.casterLevel &&
      entry.uses === right[index]?.uses
  );
}

function areCreatureInventoryItemsEqual(
  left: SceneObjectCreatureInventoryItemReference[] | undefined,
  right: SceneObjectCreatureInventoryItemReference[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.sourceIndex === right[index]?.sourceIndex &&
      entry.resRef === right[index]?.resRef &&
      entry.randomResRef === right[index]?.randomResRef &&
      entry.randomList === right[index]?.randomList &&
      areEmbeddedItemSummariesEqual(entry.embeddedItem, right[index]?.embeddedItem) &&
      entry.itemTemplateId === right[index]?.itemTemplateId &&
      entry.itemResRef === right[index]?.itemResRef &&
      entry.itemSourceFingerprint === right[index]?.itemSourceFingerprint &&
      entry.itemSourceObjectKey === right[index]?.itemSourceObjectKey &&
      entry.itemBaseItem === right[index]?.itemBaseItem &&
      entry.itemBaseItemEquipableSlots === right[index]?.itemBaseItemEquipableSlots &&
      entry.x === right[index]?.x &&
      entry.y === right[index]?.y &&
      entry.dropable === right[index]?.dropable &&
      entry.pickpocketable === right[index]?.pickpocketable &&
      entry.infinite === right[index]?.infinite
  );
}

function arePlaceableInventoryItemsEqual(
  left: SceneObjectPlaceableInventoryItemReference[] | undefined,
  right: SceneObjectPlaceableInventoryItemReference[] | undefined
): boolean {
  return areCreatureInventoryItemsEqual(left, right);
}

function areCreatureEquippedItemsEqual(
  left: SceneObjectCreatureEquippedItemReference[] | undefined,
  right: SceneObjectCreatureEquippedItemReference[] | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  if (left.length !== right.length) {
    return false;
  }
  return left.every(
    (entry, index) =>
      entry.resRef === right[index]?.resRef &&
      entry.randomResRef === right[index]?.randomResRef &&
      entry.randomList === right[index]?.randomList &&
      areEmbeddedItemSummariesEqual(entry.embeddedItem, right[index]?.embeddedItem) &&
      entry.itemTemplateId === right[index]?.itemTemplateId &&
      entry.itemResRef === right[index]?.itemResRef &&
      entry.itemSourceFingerprint === right[index]?.itemSourceFingerprint &&
      entry.itemSourceObjectKey === right[index]?.itemSourceObjectKey &&
      entry.itemBaseItem === right[index]?.itemBaseItem &&
      entry.itemBaseItemEquipableSlots === right[index]?.itemBaseItemEquipableSlots &&
      entry.slotMask === right[index]?.slotMask &&
      entry.dropable === right[index]?.dropable &&
      entry.pickpocketable === right[index]?.pickpocketable &&
      entry.infinite === right[index]?.infinite
  );
}

function areEmbeddedItemSummariesEqual(
  left: SceneObjectEmbeddedItemSummary | undefined,
  right: SceneObjectEmbeddedItemSummary | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return JSON.stringify(left) === JSON.stringify(right);
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
    left.currentHitPoints === right.currentHitPoints &&
    left.maxHitPoints === right.maxHitPoints &&
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
    left.tail === right.tail &&
    left.colors?.skin === right.colors?.skin &&
    left.colors?.hair === right.colors?.hair &&
    left.colors?.tattoo1 === right.colors?.tattoo1 &&
    left.colors?.tattoo2 === right.colors?.tattoo2 &&
    left.sourceOnlyParts?.belt === right.sourceOnlyParts?.belt &&
    left.sourceOnlyParts?.robe === right.sourceOnlyParts?.robe &&
    left.sourceOnlyParts?.rightShoulder === right.sourceOnlyParts?.rightShoulder &&
    left.sourceOnlyParts?.leftShoulder === right.sourceOnlyParts?.leftShoulder
  );
}

function areCreatureAppearanceProfilesEqual(
  left: SceneObjectCreatureAppearanceProfile | undefined,
  right: SceneObjectCreatureAppearanceProfile | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.source2daRow === right.source2daRow &&
    left.sourceKey === right.sourceKey &&
    left.modelType === right.modelType &&
    left.raceModel === right.raceModel &&
    left.portrait2da === right.portrait2da &&
    left.envMap === right.envMap &&
    left.defaultPhenotype === right.defaultPhenotype &&
    left.bloodColor === right.bloodColor &&
    left.sizeCategory === right.sizeCategory &&
    left.sizeCategoryLabel === right.sizeCategoryLabel &&
    left.sizeCategorySource2daRow === right.sizeCategorySource2daRow &&
    left.sizeCategorySourceKey === right.sizeCategorySourceKey &&
    left.raceAppearanceId === right.raceAppearanceId
  );
}

function areCreatureLookupProfilesEqual(
  left: SceneObjectCreatureLookupProfile | undefined,
  right: SceneObjectCreatureLookupProfile | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.raceLabelSource2daRow === right.raceLabelSource2daRow &&
    left.raceLabelSourceKey === right.raceLabelSourceKey &&
    left.genderLabelSource2daRow === right.genderLabelSource2daRow &&
    left.genderLabelSourceKey === right.genderLabelSourceKey &&
    left.portraitResolvedSource2daRow === right.portraitResolvedSource2daRow &&
    left.portraitResolvedSourceKey === right.portraitResolvedSourceKey &&
    left.soundSetResRef === right.soundSetResRef &&
    left.soundSetSource2daRow === right.soundSetSource2daRow &&
    left.soundSetSourceKey === right.soundSetSourceKey
  );
}

function areCreatureListCountsEqual(
  left: SceneObjectCreatureListCounts | undefined,
  right: SceneObjectCreatureListCounts | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.classListCount === right.classListCount &&
    left.skillListCount === right.skillListCount &&
    left.featListCount === right.featListCount &&
    left.templateListCount === right.templateListCount &&
    left.specAbilityListCount === right.specAbilityListCount &&
    left.inventoryItemListCount === right.inventoryItemListCount &&
    left.equipItemListCount === right.equipItemListCount
  );
}

function areCreatureLocalizedStringRefsEqual(
  left: SceneObjectCreatureLocalizedStringRefs | undefined,
  right: SceneObjectCreatureLocalizedStringRefs | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.firstName === right.firstName &&
    left.lastName === right.lastName &&
    left.localizedName === right.localizedName &&
    left.description === right.description &&
    left.identifiedDescription === right.identifiedDescription &&
    left.subrace === right.subrace &&
    left.deity === right.deity
  );
}

function areCreatureLocalizedStringsEqual(
  left: SceneObjectCreatureLocalizedStrings | undefined,
  right: SceneObjectCreatureLocalizedStrings | undefined
): boolean {
  if (!left || !right) {
    return left === right;
  }
  return (
    left.localizedName === right.localizedName &&
    left.displayName === right.displayName &&
    left.identifiedDescription === right.identifiedDescription
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
    left.paletteId === right.paletteId &&
    left.disarmable === right.disarmable &&
    left.plot === right.plot &&
    left.playerCharacter === right.playerCharacter &&
    left.leavesLootableCorpse === right.leavesLootableCorpse &&
    left.noPermanentDeath === right.noPermanentDeath &&
    left.immortal === right.immortal &&
    left.bodyBag === right.bodyBag &&
    left.startingPackage === right.startingPackage &&
    left.startingPackageId === right.startingPackageId &&
    left.treasureModel === right.treasureModel &&
    left.treasureModelRow === right.treasureModelRow &&
    left.corpseDecayTimeSeconds === right.corpseDecayTimeSeconds &&
    left.factionId === right.factionId &&
    left.faction === right.faction &&
    left.subrace === right.subrace &&
    left.deity === right.deity &&
    left.challengeRatingAdjustment === right.challengeRatingAdjustment &&
    left.soundSet === right.soundSet &&
    left.perceptionRange === right.perceptionRange &&
    left.perceptionRangeId === right.perceptionRangeId &&
    left.walkRateSource2daRow === right.walkRateSource2daRow &&
    left.walkRateSource2daName === right.walkRateSource2daName &&
    left.walkRateSpeed2daRow === right.walkRateSpeed2daRow &&
    left.walkRateAppearance2daSourceKey === right.walkRateAppearance2daSourceKey &&
    left.walkRateSpeed2daSourceKey === right.walkRateSpeed2daSourceKey &&
    left.animationState === right.animationState &&
    left.animationName === right.animationName
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
    plot: false,
    source: "seed"
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
    const hasRawInventoryItems = Array.isArray(rawPlaceableProperties?.inventoryItems);
    const hasRawVariables = Array.isArray(rawPlaceableProperties?.variables);
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
    const currentHasAppearanceType = Object.prototype.hasOwnProperty.call(
      currentPlaceableProperties ?? {},
      "appearanceType"
    );
    const currentHasHitPoints = Object.prototype.hasOwnProperty.call(
      currentPlaceableProperties ?? {},
      "hitPoints"
    );
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
    const shouldNormalizeInventoryItems =
      hasRawInventoryItems || currentPlaceableProperties?.inventoryItems !== undefined;
    const shouldNormalizeVariables =
      hasRawVariables || currentPlaceableProperties?.variables !== undefined;
    const shouldNormalizeLocalizedName =
      typeof rawPlaceableProperties?.localizedName === "string";
    const shouldNormalizeDescription =
      typeof rawPlaceableProperties?.description === "string";
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
            trapType: asString(rawTrapSettings?.trapType, DEFAULT_PLACEABLE_TRAP_SETTINGS.trapType),
            ...(Object.prototype.hasOwnProperty.call(rawTrapSettings ?? {}, "trapTypeRow") &&
              Number.isSafeInteger(rawTrapSettings?.trapTypeRow) &&
              Number(rawTrapSettings?.trapTypeRow) >= 0 &&
              Number(rawTrapSettings?.trapTypeRow) <= 0xff
              ? { trapTypeRow: Number(rawTrapSettings?.trapTypeRow) }
              : {}),
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
    if (nextTrapSettings && rawTrapSettings) {
      for (const field of [
        "isTrapped",
        "detectable",
        "disarmable",
        "oneShot",
        "detectionDc",
        "disarmDc"
      ] as const) {
        if (!Object.prototype.hasOwnProperty.call(rawTrapSettings, field)) continue;
        const value = rawTrapSettings[field];
        nextTrapSettings[field] = (isPlaceableTrapTargetValue(field, value)
          ? value
          : DEFAULT_PLACEABLE_TRAP_SETTINGS[field]) as never;
      }
    }

    const nextAdvancedSettings: SceneObjectPlaceableAdvancedSettings | undefined =
      shouldNormalizeAdvancedSettings
        ? {}
        : undefined;
    if (nextAdvancedSettings && rawAdvancedSettings) {
      for (const field of [
        "blueprintResRef",
        "belongsToFaction",
        "portraitResRef",
        "initialState",
        "treasureModel"
      ] as const) {
        if (!Object.prototype.hasOwnProperty.call(rawAdvancedSettings, field)) continue;
        nextAdvancedSettings[field] = asString(
          rawAdvancedSettings[field],
          DEFAULT_PLACEABLE_ADVANCED_SETTINGS[field]
        );
      }
      if (typeof rawAdvancedSettings?.conversation === "string") {
        nextAdvancedSettings.conversation = rawAdvancedSettings.conversation;
      }
      if (isBoolean(rawAdvancedSettings?.noInterrupt)) {
        nextAdvancedSettings.noInterrupt = rawAdvancedSettings.noInterrupt;
      }
      if (Number.isSafeInteger(rawAdvancedSettings?.portraitId) &&
        Number(rawAdvancedSettings?.portraitId) >= 0 &&
        Number(rawAdvancedSettings?.portraitId) <= 0xffff) {
        nextAdvancedSettings.portraitId = Number(rawAdvancedSettings.portraitId);
      }
      if (Number.isSafeInteger(rawAdvancedSettings?.factionId) &&
        Number(rawAdvancedSettings?.factionId) >= 0 &&
        Number(rawAdvancedSettings?.factionId) <= 0xffffffff) {
        nextAdvancedSettings.factionId = Number(rawAdvancedSettings.factionId);
      }
      if (Number.isSafeInteger(rawAdvancedSettings?.treasureModelRow) &&
        Number(rawAdvancedSettings?.treasureModelRow) >= 0 &&
        Number(rawAdvancedSettings?.treasureModelRow) <= 0xff) {
        nextAdvancedSettings.treasureModelRow = Number(rawAdvancedSettings.treasureModelRow);
      }
    }

    const nextLocalizedName = shouldNormalizeLocalizedName
      ? asString(rawPlaceableProperties?.localizedName, "")
      : undefined;
    const nextDescription = shouldNormalizeDescription
      ? asString(rawPlaceableProperties?.description, "")
      : undefined;
    const nextComments = shouldNormalizeComments
      ? asString(rawPlaceableProperties?.comments, "")
      : undefined;
    const nextInventoryItems = shouldNormalizeInventoryItems
      ? normalizePlaceableInventoryItems(rawPlaceableProperties?.inventoryItems) ??
        (currentPlaceableProperties?.inventoryItems
          ? currentPlaceableProperties.inventoryItems.map((entry) => ({
              ...entry,
              embeddedItem: normalizeEmbeddedItemSummary(entry.embeddedItem)
            }))
          : [])
      : undefined;
    const nextVariables = shouldNormalizeVariables
      ? readPlaceableVariableTargetEntries(rawPlaceableProperties?.variables)?.map(
          (entry) => ({ ...entry }),
        )
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
    if (isPlaceableDurabilitySaveByte(rawPlaceableProperties?.hardness)) {
      nextPlaceableProperties.hardness = rawPlaceableProperties.hardness;
    }
    if (isPlaceableDurabilitySaveByte(rawPlaceableProperties?.fortitudeSave)) {
      nextPlaceableProperties.fortitudeSave = rawPlaceableProperties.fortitudeSave;
    }
    if (isPlaceableDurabilitySaveByte(rawPlaceableProperties?.reflexSave)) {
      nextPlaceableProperties.reflexSave = rawPlaceableProperties.reflexSave;
    }
    if (isPlaceableDurabilitySaveByte(rawPlaceableProperties?.willSave)) {
      nextPlaceableProperties.willSave = rawPlaceableProperties.willSave;
    }
    if (isEditablePlaceableHitPoints(rawPlaceableProperties?.hitPoints)) {
      nextPlaceableProperties.hitPoints = rawPlaceableProperties.hitPoints;
    }
    if (
      Number.isSafeInteger(rawPlaceableProperties?.appearanceType) &&
      Number(rawPlaceableProperties?.appearanceType) >= 0 &&
      Number(rawPlaceableProperties?.appearanceType) <= 0xffff_ffff
    ) {
      nextPlaceableProperties.appearanceType = Number(rawPlaceableProperties?.appearanceType);
    }
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
    if (nextInventoryItems !== undefined) {
      nextPlaceableProperties.inventoryItems = nextInventoryItems;
    }
    if (nextVariables !== undefined) {
      nextPlaceableProperties.variables = nextVariables;
    }
    if (nextLocalizedName !== undefined) {
      nextPlaceableProperties.localizedName = nextLocalizedName;
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
    const isLocalizedNameUnchanged =
      nextLocalizedName !== undefined || currentPlaceableProperties?.localizedName === undefined;
    const isCommentsUnchanged =
      nextComments === undefined
        ? currentPlaceableProperties?.comments === undefined
        : (currentPlaceableProperties?.comments ?? "") === nextComments;

    if (
      currentPlaceableProperties?.plot === nextPlaceableProperties.plot &&
      currentPlaceableProperties?.useable === nextPlaceableProperties.useable &&
      currentPlaceableProperties?.hasInventory === nextPlaceableProperties.hasInventory &&
      currentHasAppearanceType === Object.prototype.hasOwnProperty.call(
        nextPlaceableProperties,
        "appearanceType"
      ) &&
      currentPlaceableProperties?.appearanceType === nextPlaceableProperties.appearanceType &&
      currentHasHitPoints === Object.prototype.hasOwnProperty.call(
        nextPlaceableProperties,
        "hitPoints"
      ) &&
      currentPlaceableProperties?.hardness === nextPlaceableProperties.hardness &&
      currentPlaceableProperties?.fortitudeSave === nextPlaceableProperties.fortitudeSave &&
      currentPlaceableProperties?.reflexSave === nextPlaceableProperties.reflexSave &&
      currentPlaceableProperties?.willSave === nextPlaceableProperties.willSave &&
      isScriptSlotsUnchanged &&
      isDisabledFlagsUnchanged &&
      isLockSettingsUnchanged &&
      isTrapSettingsUnchanged &&
      isAdvancedSettingsUnchanged &&
      arePlaceableInventoryItemsEqual(
        currentPlaceableProperties?.inventoryItems,
        nextInventoryItems
      ) &&
      placeableVariableTargetEntriesEqual(
        currentPlaceableProperties?.variables,
        nextVariables,
      ) &&
      isLocalizedNameUnchanged &&
      isDescriptionUnchanged &&
      isCommentsUnchanged &&
      normalizedObject.doorProperties === undefined &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.encounterProperties === undefined &&
      normalizedObject.soundPositioning === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      placeableProperties: nextPlaceableProperties,
      doorProperties: undefined,
      creatureProperties: undefined,
      encounterProperties: undefined,
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
    const hasRawAppearanceProfile = isRecord(rawCreatureProperties?.appearanceProfile);
    const hasRawLookupProfile = isRecord(rawCreatureProperties?.lookupProfile);
    const hasRawListCounts = isRecord(rawCreatureProperties?.listCounts);
    const hasRawLocalizedStringRefs = isRecord(rawCreatureProperties?.localizedStringRefs);
    const hasRawLocalizedStrings = isRecord(rawCreatureProperties?.localizedStrings);
    const hasRawScriptSlots = isRecord(rawCreatureProperties?.scriptSlots);
    const hasRawAdvancedSettings = isRecord(rawCreatureProperties?.advancedSettings);
    const hasRawClassEntries = Array.isArray(rawCreatureProperties?.classEntries);
    const hasRawTemplateEntries = Array.isArray(rawCreatureProperties?.templateEntries);
    const hasRawSkills = Array.isArray(rawCreatureProperties?.skills);
    const hasRawFeats = Array.isArray(rawCreatureProperties?.feats);
    const hasRawSpells = Array.isArray(rawCreatureProperties?.spells);
    const hasRawSpecialAbilities = Array.isArray(rawCreatureProperties?.specialAbilities);
    const hasRawInventoryItems = Array.isArray(rawCreatureProperties?.inventoryItems);
    const hasRawEquippedItems = Array.isArray(rawCreatureProperties?.equippedItems);
    const shouldNormalizeAlignment =
      typeof rawCreatureProperties?.alignment === "string" ||
      currentCreatureProperties?.alignment !== undefined;
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
    const rawAppearanceProfile = hasRawAppearanceProfile
      ? (rawCreatureProperties?.appearanceProfile as Partial<
          Record<keyof SceneObjectCreatureAppearanceProfile, unknown>
        >)
      : undefined;
    const rawLookupProfile = hasRawLookupProfile
      ? (rawCreatureProperties?.lookupProfile as Partial<
          Record<keyof SceneObjectCreatureLookupProfile, unknown>
        >)
      : undefined;
    const rawListCounts = hasRawListCounts
      ? (rawCreatureProperties?.listCounts as Partial<
          Record<keyof SceneObjectCreatureListCounts, unknown>
        >)
      : undefined;
    const rawLocalizedStringRefs = hasRawLocalizedStringRefs
      ? (rawCreatureProperties?.localizedStringRefs as Partial<
          Record<keyof SceneObjectCreatureLocalizedStringRefs, unknown>
        >)
      : undefined;
    const rawLocalizedStrings = hasRawLocalizedStrings
      ? (rawCreatureProperties?.localizedStrings as Partial<
          Record<keyof SceneObjectCreatureLocalizedStrings, unknown>
        >)
      : undefined;
    const rawAppearanceColors = isRecord(rawAppearanceSettings?.colors)
      ? (rawAppearanceSettings?.colors as Partial<
          Record<NonNullable<SceneObjectCreatureAppearanceSettings["colors"]> extends infer T ? keyof T : never, unknown>
        >)
      : undefined;
    const rawAppearanceSourceOnlyParts = isRecord(rawAppearanceSettings?.sourceOnlyParts)
      ? (rawAppearanceSettings?.sourceOnlyParts as Partial<
          Record<
            NonNullable<SceneObjectCreatureAppearanceSettings["sourceOnlyParts"]> extends infer T ? keyof T : never,
            unknown
          >
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
      currentHitPoints: asFiniteNumber(
        sourceStatisticsCandidate?.currentHitPoints,
        sourceStatisticsCandidate?.maxHitPoints ??
          sourceStatisticsCandidate?.baseHitPoints ??
          DEFAULT_CREATURE_STATISTICS.currentHitPoints ??
          10
      ),
      maxHitPoints: asFiniteNumber(
        sourceStatisticsCandidate?.maxHitPoints,
        sourceStatisticsCandidate?.baseHitPoints ??
          DEFAULT_CREATURE_STATISTICS.maxHitPoints ??
          10
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
      tail: asString(sourceAppearanceSettingsCandidate?.tail, DEFAULT_CREATURE_APPEARANCE_SETTINGS.tail),
      colors: {
        skin: asString(
          sourceAppearanceSettingsCandidate?.colors?.skin,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.colors?.skin ?? ""
        ),
        hair: asString(
          sourceAppearanceSettingsCandidate?.colors?.hair,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.colors?.hair ?? ""
        ),
        tattoo1: asString(
          sourceAppearanceSettingsCandidate?.colors?.tattoo1,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.colors?.tattoo1 ?? ""
        ),
        tattoo2: asString(
          sourceAppearanceSettingsCandidate?.colors?.tattoo2,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.colors?.tattoo2 ?? ""
        )
      },
      sourceOnlyParts: {
        belt: asString(
          sourceAppearanceSettingsCandidate?.sourceOnlyParts?.belt,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.sourceOnlyParts?.belt ?? ""
        ),
        robe: asString(
          sourceAppearanceSettingsCandidate?.sourceOnlyParts?.robe,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.sourceOnlyParts?.robe ?? ""
        ),
        rightShoulder: asString(
          sourceAppearanceSettingsCandidate?.sourceOnlyParts?.rightShoulder,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.sourceOnlyParts?.rightShoulder ?? ""
        ),
        leftShoulder: asString(
          sourceAppearanceSettingsCandidate?.sourceOnlyParts?.leftShoulder,
          DEFAULT_CREATURE_APPEARANCE_SETTINGS.sourceOnlyParts?.leftShoulder ?? ""
        )
      }
    };
    const sourceAppearanceProfileCandidate = currentCreatureProperties?.appearanceProfile;
    const sourceAppearanceProfile: SceneObjectCreatureAppearanceProfile = {
      ...(typeof sourceAppearanceProfileCandidate?.source2daRow === "number"
        ? { source2daRow: sourceAppearanceProfileCandidate.source2daRow }
        : {}),
      ...(sourceAppearanceProfileCandidate?.sourceKey
        ? { sourceKey: sourceAppearanceProfileCandidate.sourceKey }
        : {}),
      ...(sourceAppearanceProfileCandidate?.modelType
        ? { modelType: sourceAppearanceProfileCandidate.modelType }
        : {}),
      ...(sourceAppearanceProfileCandidate?.raceModel
        ? { raceModel: sourceAppearanceProfileCandidate.raceModel }
        : {}),
      ...(sourceAppearanceProfileCandidate?.portrait2da
        ? { portrait2da: sourceAppearanceProfileCandidate.portrait2da }
        : {}),
      ...(sourceAppearanceProfileCandidate?.envMap
        ? { envMap: sourceAppearanceProfileCandidate.envMap }
        : {}),
      ...(sourceAppearanceProfileCandidate?.defaultPhenotype
        ? { defaultPhenotype: sourceAppearanceProfileCandidate.defaultPhenotype }
        : {}),
      ...(sourceAppearanceProfileCandidate?.bloodColor
        ? { bloodColor: sourceAppearanceProfileCandidate.bloodColor }
        : {}),
      ...(typeof sourceAppearanceProfileCandidate?.sizeCategory === "number" &&
      Number.isFinite(sourceAppearanceProfileCandidate.sizeCategory)
        ? { sizeCategory: sourceAppearanceProfileCandidate.sizeCategory }
        : {}),
      ...(sourceAppearanceProfileCandidate?.sizeCategoryLabel
        ? { sizeCategoryLabel: sourceAppearanceProfileCandidate.sizeCategoryLabel }
        : {}),
      ...(typeof sourceAppearanceProfileCandidate?.sizeCategorySource2daRow === "number" &&
      Number.isFinite(sourceAppearanceProfileCandidate.sizeCategorySource2daRow)
        ? { sizeCategorySource2daRow: sourceAppearanceProfileCandidate.sizeCategorySource2daRow }
        : {}),
      ...(sourceAppearanceProfileCandidate?.sizeCategorySourceKey
        ? { sizeCategorySourceKey: sourceAppearanceProfileCandidate.sizeCategorySourceKey }
        : {}),
      ...(typeof sourceAppearanceProfileCandidate?.raceAppearanceId === "number" &&
      Number.isFinite(sourceAppearanceProfileCandidate.raceAppearanceId)
        ? { raceAppearanceId: sourceAppearanceProfileCandidate.raceAppearanceId }
        : {})
    };
    const sourceLocalizedStringRefs = normalizeCreatureLocalizedStringRefs(
      currentCreatureProperties?.localizedStringRefs
    );
    const sourceLookupProfile = normalizeCreatureLookupProfile(
      currentCreatureProperties?.lookupProfile
    );
    const sourceListCounts = normalizeCreatureListCounts(currentCreatureProperties?.listCounts);
    const sourceLocalizedStrings = normalizeCreatureLocalizedStrings(
      currentCreatureProperties?.localizedStrings
    );
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
    const sourceAdvancedSettings = {
      blueprintResRef: asString(
        sourceAdvancedSettingsCandidate?.blueprintResRef,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.blueprintResRef
      ),
      ...(typeof sourceAdvancedSettingsCandidate?.paletteId === "number" &&
      Number.isFinite(sourceAdvancedSettingsCandidate.paletteId)
        ? { paletteId: sourceAdvancedSettingsCandidate.paletteId }
        : {}),
      disarmable: isBoolean(sourceAdvancedSettingsCandidate?.disarmable)
        ? sourceAdvancedSettingsCandidate.disarmable
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.disarmable,
      plot: isBoolean(sourceAdvancedSettingsCandidate?.plot)
        ? sourceAdvancedSettingsCandidate.plot
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.plot,
      playerCharacter: isBoolean(sourceAdvancedSettingsCandidate?.playerCharacter)
        ? sourceAdvancedSettingsCandidate.playerCharacter
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.playerCharacter,
      leavesLootableCorpse: isBoolean(sourceAdvancedSettingsCandidate?.leavesLootableCorpse)
        ? sourceAdvancedSettingsCandidate.leavesLootableCorpse
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.leavesLootableCorpse,
      noPermanentDeath: isBoolean(sourceAdvancedSettingsCandidate?.noPermanentDeath)
        ? sourceAdvancedSettingsCandidate.noPermanentDeath
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.noPermanentDeath,
      immortal: isBoolean(sourceAdvancedSettingsCandidate?.immortal)
        ? sourceAdvancedSettingsCandidate.immortal
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.immortal,
      bodyBag: isBoolean(sourceAdvancedSettingsCandidate?.bodyBag)
        ? sourceAdvancedSettingsCandidate.bodyBag
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.bodyBag,
      startingPackage: isBoolean(sourceAdvancedSettingsCandidate?.startingPackage)
        ? sourceAdvancedSettingsCandidate.startingPackage
        : DEFAULT_CREATURE_ADVANCED_SETTINGS.startingPackage,
      treasureModel: asString(
        sourceAdvancedSettingsCandidate?.treasureModel,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.treasureModel
      ),
      ...(Number.isSafeInteger(sourceAdvancedSettingsCandidate?.treasureModelRow) &&
      Number(sourceAdvancedSettingsCandidate?.treasureModelRow) >= 0 &&
      Number(sourceAdvancedSettingsCandidate?.treasureModelRow) <= 0xff
        ? { treasureModelRow: Number(sourceAdvancedSettingsCandidate?.treasureModelRow) }
        : {}),
      corpseDecayTimeSeconds: clampMin(
        asFiniteNumber(
          sourceAdvancedSettingsCandidate?.corpseDecayTimeSeconds,
          DEFAULT_CREATURE_ADVANCED_SETTINGS.corpseDecayTimeSeconds
        ),
        0
      ),
      ...(Number.isSafeInteger(sourceAdvancedSettingsCandidate?.factionId) &&
      Number(sourceAdvancedSettingsCandidate?.factionId) >= 0 &&
      Number(sourceAdvancedSettingsCandidate?.factionId) <= 0xffff
        ? { factionId: Number(sourceAdvancedSettingsCandidate?.factionId) }
        : {}),
      faction: asString(sourceAdvancedSettingsCandidate?.faction, DEFAULT_CREATURE_ADVANCED_SETTINGS.faction),
      subrace: asString(sourceAdvancedSettingsCandidate?.subrace, DEFAULT_CREATURE_ADVANCED_SETTINGS.subrace),
      deity: asString(sourceAdvancedSettingsCandidate?.deity, DEFAULT_CREATURE_ADVANCED_SETTINGS.deity),
      challengeRatingAdjustment: asFiniteNumber(
        sourceAdvancedSettingsCandidate?.challengeRatingAdjustment,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.challengeRatingAdjustment
      ),
      soundSet: asString(sourceAdvancedSettingsCandidate?.soundSet, DEFAULT_CREATURE_ADVANCED_SETTINGS.soundSet),
      ...(typeof sourceAdvancedSettingsCandidate?.soundSetFile === "number" &&
      Number.isFinite(sourceAdvancedSettingsCandidate.soundSetFile)
        ? { soundSetFile: Math.max(0, Math.min(65535, Math.trunc(sourceAdvancedSettingsCandidate.soundSetFile))) }
        : {}),
      ...(Number.isSafeInteger(sourceAdvancedSettingsCandidate?.startingPackageId) &&
      Number(sourceAdvancedSettingsCandidate?.startingPackageId) >= 0 &&
      Number(sourceAdvancedSettingsCandidate?.startingPackageId) <= 0xff
        ? { startingPackageId: Number(sourceAdvancedSettingsCandidate?.startingPackageId) }
        : {}),
      perceptionRange: asString(
        sourceAdvancedSettingsCandidate?.perceptionRange,
        DEFAULT_CREATURE_ADVANCED_SETTINGS.perceptionRange
      ),
      ...(Number.isSafeInteger(sourceAdvancedSettingsCandidate?.perceptionRangeId) &&
      [8, 9, 10, 11].includes(Number(sourceAdvancedSettingsCandidate?.perceptionRangeId))
        ? { perceptionRangeId: Number(sourceAdvancedSettingsCandidate?.perceptionRangeId) }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.walkRateSource2daRow === "number" &&
      Number.isFinite(sourceAdvancedSettingsCandidate.walkRateSource2daRow)
        ? { walkRateSource2daRow: Math.trunc(sourceAdvancedSettingsCandidate.walkRateSource2daRow) }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.walkRateSource2daName === "string" &&
      sourceAdvancedSettingsCandidate.walkRateSource2daName.trim().length > 0
        ? { walkRateSource2daName: sourceAdvancedSettingsCandidate.walkRateSource2daName.trim() }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.walkRateSpeed2daRow === "number" &&
      Number.isFinite(sourceAdvancedSettingsCandidate.walkRateSpeed2daRow)
        ? { walkRateSpeed2daRow: Math.trunc(sourceAdvancedSettingsCandidate.walkRateSpeed2daRow) }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.walkRateAppearance2daSourceKey === "string" &&
      sourceAdvancedSettingsCandidate.walkRateAppearance2daSourceKey.trim().length > 0
        ? {
            walkRateAppearance2daSourceKey:
              sourceAdvancedSettingsCandidate.walkRateAppearance2daSourceKey.trim()
          }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.walkRateSpeed2daSourceKey === "string" &&
      sourceAdvancedSettingsCandidate.walkRateSpeed2daSourceKey.trim().length > 0
        ? {
            walkRateSpeed2daSourceKey:
              sourceAdvancedSettingsCandidate.walkRateSpeed2daSourceKey.trim()
          }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.animationState === "number" &&
      Number.isFinite(sourceAdvancedSettingsCandidate.animationState)
        ? { animationState: Math.trunc(sourceAdvancedSettingsCandidate.animationState) }
        : {}),
      ...(typeof sourceAdvancedSettingsCandidate?.animationName === "string" &&
      sourceAdvancedSettingsCandidate.animationName.trim().length > 0
        ? { animationName: sourceAdvancedSettingsCandidate.animationName.trim() }
        : {})
    } satisfies SceneObjectCreatureAdvancedSettings;

    const shouldNormalizeStatistics =
      hasRawStatistics || currentCreatureProperties?.statistics !== undefined;
    const shouldNormalizeAppearanceSettings =
      hasRawAppearanceSettings || currentCreatureProperties?.appearanceSettings !== undefined;
    const shouldNormalizeAppearanceProfile =
      hasRawAppearanceProfile || currentCreatureProperties?.appearanceProfile !== undefined;
    const shouldNormalizeLookupProfile =
      hasRawLookupProfile || currentCreatureProperties?.lookupProfile !== undefined;
    const shouldNormalizeListCounts =
      hasRawListCounts || currentCreatureProperties?.listCounts !== undefined;
    const shouldNormalizeLocalizedStringRefs =
      hasRawLocalizedStringRefs || currentCreatureProperties?.localizedStringRefs !== undefined;
    const shouldNormalizeLocalizedStrings =
      hasRawLocalizedStrings || currentCreatureProperties?.localizedStrings !== undefined;
    const shouldNormalizeScriptSlots =
      hasRawScriptSlots || currentCreatureProperties?.scriptSlots !== undefined;
    const shouldNormalizeAdvancedSettings =
      hasRawAdvancedSettings || currentCreatureProperties?.advancedSettings !== undefined;
    const shouldNormalizeClassEntries =
      hasRawClassEntries || currentCreatureProperties?.classEntries !== undefined;
    const shouldNormalizeTemplateEntries =
      hasRawTemplateEntries || currentCreatureProperties?.templateEntries !== undefined;
    const shouldNormalizeSkills =
      hasRawSkills || currentCreatureProperties?.skills !== undefined;
    const shouldNormalizeFeats =
      hasRawFeats || currentCreatureProperties?.feats !== undefined;
    const shouldNormalizeSpells =
      hasRawSpells || currentCreatureProperties?.spells !== undefined;
    const shouldNormalizeSpecialAbilities =
      hasRawSpecialAbilities || currentCreatureProperties?.specialAbilities !== undefined;
    const shouldNormalizeInventoryItems =
      hasRawInventoryItems || currentCreatureProperties?.inventoryItems !== undefined;
    const shouldNormalizeEquippedItems =
      hasRawEquippedItems || currentCreatureProperties?.equippedItems !== undefined;

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
            currentHitPoints: asFiniteNumber(
              rawStatistics?.currentHitPoints,
              sourceStatistics.currentHitPoints ??
                sourceStatistics.maxHitPoints ??
                sourceStatistics.baseHitPoints
            ),
            maxHitPoints: asFiniteNumber(
              rawStatistics?.maxHitPoints,
              sourceStatistics.maxHitPoints ?? sourceStatistics.baseHitPoints
            ),
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
            tail: asString(rawAppearanceSettings?.tail, sourceAppearanceSettings.tail),
            colors: {
              skin: asString(rawAppearanceColors?.skin, sourceAppearanceSettings.colors?.skin ?? ""),
              hair: asString(rawAppearanceColors?.hair, sourceAppearanceSettings.colors?.hair ?? ""),
              tattoo1: asString(
                rawAppearanceColors?.tattoo1,
                sourceAppearanceSettings.colors?.tattoo1 ?? ""
              ),
              tattoo2: asString(
                rawAppearanceColors?.tattoo2,
                sourceAppearanceSettings.colors?.tattoo2 ?? ""
              )
            },
            sourceOnlyParts: {
              belt: asString(
                rawAppearanceSourceOnlyParts?.belt,
                sourceAppearanceSettings.sourceOnlyParts?.belt ?? ""
              ),
              robe: asString(
                rawAppearanceSourceOnlyParts?.robe,
                sourceAppearanceSettings.sourceOnlyParts?.robe ?? ""
              ),
              rightShoulder: asString(
                rawAppearanceSourceOnlyParts?.rightShoulder,
                sourceAppearanceSettings.sourceOnlyParts?.rightShoulder ?? ""
              ),
              leftShoulder: asString(
                rawAppearanceSourceOnlyParts?.leftShoulder,
                sourceAppearanceSettings.sourceOnlyParts?.leftShoulder ?? ""
              )
            }
          }
        : undefined;
    const nextAppearanceProfileSourceKey = asOptionalString(
      rawAppearanceProfile?.sourceKey,
      sourceAppearanceProfile.sourceKey
    );
    const nextAppearanceProfileModelType = asOptionalString(
      rawAppearanceProfile?.modelType,
      sourceAppearanceProfile.modelType
    );
    const nextAppearanceProfileRaceModel = asOptionalString(
      rawAppearanceProfile?.raceModel,
      sourceAppearanceProfile.raceModel
    );
    const nextAppearanceProfilePortrait2da = asOptionalString(
      rawAppearanceProfile?.portrait2da,
      sourceAppearanceProfile.portrait2da
    );
    const nextAppearanceProfileEnvMap = asOptionalString(
      rawAppearanceProfile?.envMap,
      sourceAppearanceProfile.envMap
    );
    const nextAppearanceProfileDefaultPhenotype = asOptionalString(
      rawAppearanceProfile?.defaultPhenotype,
      sourceAppearanceProfile.defaultPhenotype
    );
    const nextAppearanceProfileBloodColor = asOptionalString(
      rawAppearanceProfile?.bloodColor,
      sourceAppearanceProfile.bloodColor
    );
    const nextAppearanceProfileSizeCategory =
      typeof rawAppearanceProfile?.sizeCategory === "number" &&
      Number.isFinite(rawAppearanceProfile.sizeCategory)
        ? rawAppearanceProfile.sizeCategory
        : sourceAppearanceProfile.sizeCategory;
    const nextAppearanceProfileSizeCategoryLabel = asOptionalString(
      rawAppearanceProfile?.sizeCategoryLabel,
      sourceAppearanceProfile.sizeCategoryLabel
    );
    const nextAppearanceProfileSizeCategorySource2daRow =
      typeof rawAppearanceProfile?.sizeCategorySource2daRow === "number" &&
      Number.isFinite(rawAppearanceProfile.sizeCategorySource2daRow)
        ? rawAppearanceProfile.sizeCategorySource2daRow
        : sourceAppearanceProfile.sizeCategorySource2daRow;
    const nextAppearanceProfileSizeCategorySourceKey = asOptionalString(
      rawAppearanceProfile?.sizeCategorySourceKey,
      sourceAppearanceProfile.sizeCategorySourceKey
    );
    const nextAppearanceProfileRaceAppearanceId =
      typeof rawAppearanceProfile?.raceAppearanceId === "number" &&
      Number.isFinite(rawAppearanceProfile.raceAppearanceId)
        ? rawAppearanceProfile.raceAppearanceId
        : sourceAppearanceProfile.raceAppearanceId;
    const nextAppearanceProfile: SceneObjectCreatureAppearanceProfile | undefined =
      shouldNormalizeAppearanceProfile
        ? {
            ...(typeof rawAppearanceProfile?.source2daRow === "number" &&
            Number.isFinite(rawAppearanceProfile.source2daRow)
              ? { source2daRow: rawAppearanceProfile.source2daRow }
              : sourceAppearanceProfile.source2daRow !== undefined
              ? { source2daRow: sourceAppearanceProfile.source2daRow }
              : {}),
            ...(nextAppearanceProfileSourceKey ? { sourceKey: nextAppearanceProfileSourceKey } : {}),
            ...(nextAppearanceProfileModelType ? { modelType: nextAppearanceProfileModelType } : {}),
            ...(nextAppearanceProfileRaceModel ? { raceModel: nextAppearanceProfileRaceModel } : {}),
            ...(nextAppearanceProfilePortrait2da ? { portrait2da: nextAppearanceProfilePortrait2da } : {}),
            ...(nextAppearanceProfileEnvMap ? { envMap: nextAppearanceProfileEnvMap } : {}),
            ...(nextAppearanceProfileDefaultPhenotype
              ? { defaultPhenotype: nextAppearanceProfileDefaultPhenotype }
              : {}),
            ...(nextAppearanceProfileBloodColor
              ? { bloodColor: nextAppearanceProfileBloodColor }
              : {}),
            ...(nextAppearanceProfileSizeCategory !== undefined
              ? { sizeCategory: nextAppearanceProfileSizeCategory }
              : {}),
            ...(nextAppearanceProfileSizeCategoryLabel
              ? { sizeCategoryLabel: nextAppearanceProfileSizeCategoryLabel }
              : {}),
            ...(nextAppearanceProfileSizeCategorySource2daRow !== undefined
              ? { sizeCategorySource2daRow: nextAppearanceProfileSizeCategorySource2daRow }
              : {}),
            ...(nextAppearanceProfileSizeCategorySourceKey
              ? { sizeCategorySourceKey: nextAppearanceProfileSizeCategorySourceKey }
              : {}),
            ...(nextAppearanceProfileRaceAppearanceId !== undefined
              ? { raceAppearanceId: nextAppearanceProfileRaceAppearanceId }
              : {})
          }
        : undefined;
    const nextLocalizedStringRefs = shouldNormalizeLocalizedStringRefs
      ? normalizeCreatureLocalizedStringRefs(rawLocalizedStringRefs, sourceLocalizedStringRefs)
      : undefined;
    const nextLookupProfile = shouldNormalizeLookupProfile
      ? normalizeCreatureLookupProfile(rawLookupProfile, sourceLookupProfile)
      : undefined;
    const nextListCounts = shouldNormalizeListCounts
      ? normalizeCreatureListCounts(rawListCounts, sourceListCounts)
      : undefined;
    const nextLocalizedStrings = shouldNormalizeLocalizedStrings
      ? normalizeCreatureLocalizedStrings(rawLocalizedStrings, sourceLocalizedStrings)
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
            ...(typeof rawAdvancedSettings?.paletteId === "number" &&
            Number.isFinite(rawAdvancedSettings.paletteId)
              ? { paletteId: rawAdvancedSettings.paletteId }
              : typeof sourceAdvancedSettings.paletteId === "number" &&
                  Number.isFinite(sourceAdvancedSettings.paletteId)
                ? { paletteId: sourceAdvancedSettings.paletteId }
                : {}),
            disarmable: isBoolean(rawAdvancedSettings?.disarmable)
              ? rawAdvancedSettings.disarmable
              : sourceAdvancedSettings.disarmable,
            plot: isBoolean(rawAdvancedSettings?.plot)
              ? rawAdvancedSettings.plot
              : sourceAdvancedSettings.plot,
            playerCharacter: isBoolean(rawAdvancedSettings?.playerCharacter)
              ? rawAdvancedSettings.playerCharacter
              : sourceAdvancedSettings.playerCharacter,
            leavesLootableCorpse: isBoolean(rawAdvancedSettings?.leavesLootableCorpse)
              ? rawAdvancedSettings.leavesLootableCorpse
              : sourceAdvancedSettings.leavesLootableCorpse,
            noPermanentDeath: isBoolean(rawAdvancedSettings?.noPermanentDeath)
              ? rawAdvancedSettings.noPermanentDeath
              : sourceAdvancedSettings.noPermanentDeath,
            immortal: isBoolean(rawAdvancedSettings?.immortal)
              ? rawAdvancedSettings.immortal
              : sourceAdvancedSettings.immortal,
            bodyBag: isBoolean(rawAdvancedSettings?.bodyBag)
              ? rawAdvancedSettings.bodyBag
              : sourceAdvancedSettings.bodyBag,
            startingPackage: isBoolean(rawAdvancedSettings?.startingPackage)
              ? rawAdvancedSettings.startingPackage
              : sourceAdvancedSettings.startingPackage,
            treasureModel: asString(rawAdvancedSettings?.treasureModel, sourceAdvancedSettings.treasureModel),
            ...(Number.isSafeInteger(rawAdvancedSettings?.treasureModelRow) &&
            Number(rawAdvancedSettings?.treasureModelRow) >= 0 &&
            Number(rawAdvancedSettings?.treasureModelRow) <= 0xff
              ? { treasureModelRow: Number(rawAdvancedSettings?.treasureModelRow) }
              : sourceAdvancedSettings.treasureModelRow !== undefined
                ? { treasureModelRow: sourceAdvancedSettings.treasureModelRow }
                : {}),
            corpseDecayTimeSeconds: clampMin(
              asFiniteNumber(rawAdvancedSettings?.corpseDecayTimeSeconds, sourceAdvancedSettings.corpseDecayTimeSeconds),
              0
            ),
            ...(Number.isSafeInteger(rawAdvancedSettings?.factionId) &&
            Number(rawAdvancedSettings?.factionId) >= 0 &&
            Number(rawAdvancedSettings?.factionId) <= 0xffff
              ? { factionId: Number(rawAdvancedSettings?.factionId) }
              : sourceAdvancedSettings.factionId !== undefined
                ? { factionId: sourceAdvancedSettings.factionId }
                : {}),
            faction: asString(rawAdvancedSettings?.faction, sourceAdvancedSettings.faction),
            subrace: asString(rawAdvancedSettings?.subrace, sourceAdvancedSettings.subrace),
            deity: asString(rawAdvancedSettings?.deity, sourceAdvancedSettings.deity),
            challengeRatingAdjustment: asFiniteNumber(
              rawAdvancedSettings?.challengeRatingAdjustment,
              sourceAdvancedSettings.challengeRatingAdjustment
            ),
            soundSet: asString(rawAdvancedSettings?.soundSet, sourceAdvancedSettings.soundSet),
            ...(typeof rawAdvancedSettings?.soundSetFile === "number" &&
            Number.isFinite(rawAdvancedSettings.soundSetFile)
              ? { soundSetFile: Math.max(0, Math.min(65535, Math.trunc(rawAdvancedSettings.soundSetFile))) }
              : sourceAdvancedSettings.soundSetFile !== undefined
                ? { soundSetFile: sourceAdvancedSettings.soundSetFile }
                : {}),
            ...(Number.isSafeInteger(rawAdvancedSettings?.startingPackageId) &&
            Number(rawAdvancedSettings?.startingPackageId) >= 0 &&
            Number(rawAdvancedSettings?.startingPackageId) <= 0xff
              ? { startingPackageId: Number(rawAdvancedSettings?.startingPackageId) }
              : sourceAdvancedSettings.startingPackageId !== undefined
                ? { startingPackageId: sourceAdvancedSettings.startingPackageId }
                : {}),
            perceptionRange: asString(
              rawAdvancedSettings?.perceptionRange,
              sourceAdvancedSettings.perceptionRange
            ),
            ...(Number.isSafeInteger(rawAdvancedSettings?.perceptionRangeId) &&
            [8, 9, 10, 11].includes(Number(rawAdvancedSettings?.perceptionRangeId))
              ? { perceptionRangeId: Number(rawAdvancedSettings?.perceptionRangeId) }
              : Number.isSafeInteger(sourceAdvancedSettings.perceptionRangeId) &&
                  [8, 9, 10, 11].includes(Number(sourceAdvancedSettings.perceptionRangeId))
                ? { perceptionRangeId: Number(sourceAdvancedSettings.perceptionRangeId) }
                : {}),
            ...(typeof rawAdvancedSettings?.walkRateSource2daRow === "number" &&
            Number.isFinite(rawAdvancedSettings.walkRateSource2daRow)
              ? { walkRateSource2daRow: Math.trunc(rawAdvancedSettings.walkRateSource2daRow) }
              : typeof sourceAdvancedSettings.walkRateSource2daRow === "number" &&
                  Number.isFinite(sourceAdvancedSettings.walkRateSource2daRow)
                ? { walkRateSource2daRow: Math.trunc(sourceAdvancedSettings.walkRateSource2daRow) }
                : {}),
            ...(typeof rawAdvancedSettings?.walkRateSource2daName === "string" &&
            rawAdvancedSettings.walkRateSource2daName.trim().length > 0
              ? { walkRateSource2daName: rawAdvancedSettings.walkRateSource2daName.trim() }
              : typeof sourceAdvancedSettings.walkRateSource2daName === "string" &&
                  sourceAdvancedSettings.walkRateSource2daName.trim().length > 0
                ? { walkRateSource2daName: sourceAdvancedSettings.walkRateSource2daName.trim() }
                : {}),
            ...(typeof rawAdvancedSettings?.walkRateSpeed2daRow === "number" &&
            Number.isFinite(rawAdvancedSettings.walkRateSpeed2daRow)
              ? { walkRateSpeed2daRow: Math.trunc(rawAdvancedSettings.walkRateSpeed2daRow) }
              : typeof sourceAdvancedSettings.walkRateSpeed2daRow === "number" &&
                  Number.isFinite(sourceAdvancedSettings.walkRateSpeed2daRow)
                ? { walkRateSpeed2daRow: Math.trunc(sourceAdvancedSettings.walkRateSpeed2daRow) }
                : {}),
            ...(typeof rawAdvancedSettings?.walkRateAppearance2daSourceKey === "string" &&
            rawAdvancedSettings.walkRateAppearance2daSourceKey.trim().length > 0
              ? {
                  walkRateAppearance2daSourceKey:
                    rawAdvancedSettings.walkRateAppearance2daSourceKey.trim()
                }
              : typeof sourceAdvancedSettings.walkRateAppearance2daSourceKey === "string" &&
                  sourceAdvancedSettings.walkRateAppearance2daSourceKey.trim().length > 0
                ? {
                    walkRateAppearance2daSourceKey:
                      sourceAdvancedSettings.walkRateAppearance2daSourceKey.trim()
                  }
                : {}),
            ...(typeof rawAdvancedSettings?.walkRateSpeed2daSourceKey === "string" &&
            rawAdvancedSettings.walkRateSpeed2daSourceKey.trim().length > 0
              ? { walkRateSpeed2daSourceKey: rawAdvancedSettings.walkRateSpeed2daSourceKey.trim() }
              : typeof sourceAdvancedSettings.walkRateSpeed2daSourceKey === "string" &&
                  sourceAdvancedSettings.walkRateSpeed2daSourceKey.trim().length > 0
                ? {
                    walkRateSpeed2daSourceKey:
                      sourceAdvancedSettings.walkRateSpeed2daSourceKey.trim()
                  }
                : {}),
            ...(typeof rawAdvancedSettings?.animationState === "number" &&
            Number.isFinite(rawAdvancedSettings.animationState)
              ? { animationState: Math.trunc(rawAdvancedSettings.animationState) }
              : typeof sourceAdvancedSettings.animationState === "number" &&
                  Number.isFinite(sourceAdvancedSettings.animationState)
                ? { animationState: Math.trunc(sourceAdvancedSettings.animationState) }
                : {}),
            ...(typeof rawAdvancedSettings?.animationName === "string" &&
            rawAdvancedSettings.animationName.trim().length > 0
              ? { animationName: rawAdvancedSettings.animationName.trim() }
              : typeof sourceAdvancedSettings.animationName === "string" &&
                  sourceAdvancedSettings.animationName.trim().length > 0
                ? { animationName: sourceAdvancedSettings.animationName.trim() }
                : {})
          }
        : undefined;

    const normalizedClassEntries = normalizeCreatureClassEntries(rawCreatureProperties?.classEntries);
    const normalizedTemplateEntries = normalizeCreatureTemplateEntries(
      rawCreatureProperties?.templateEntries
    );
    const normalizedSkills = normalizeCreatureSkillEntries(rawCreatureProperties?.skills);
    const normalizedFeats = normalizeCreatureFeatEntries(rawCreatureProperties?.feats);
    const normalizedSpells = normalizeCreatureSpellEntries(rawCreatureProperties?.spells);
    const normalizedSpecialAbilities = normalizeCreatureSpecialAbilityEntries(
      rawCreatureProperties?.specialAbilities
    );
    const normalizedInventoryItems = normalizeCreatureInventoryItems(
      rawCreatureProperties?.inventoryItems
    );
    const normalizedEquippedItems = normalizeCreatureEquippedItems(
      rawCreatureProperties?.equippedItems
    );

    const nextClassEntries = shouldNormalizeClassEntries
      ? normalizedClassEntries ??
        (currentCreatureProperties?.classEntries
          ? currentCreatureProperties.classEntries.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_CLASS_ENTRIES.map((entry) => ({ ...entry })))
      : undefined;
    const nextTemplateEntries = shouldNormalizeTemplateEntries
      ? normalizedTemplateEntries ??
        (currentCreatureProperties?.templateEntries
          ? currentCreatureProperties.templateEntries.map((entry) => ({ ...entry }))
          : DEFAULT_CREATURE_TEMPLATE_ENTRIES.map((entry) => ({ ...entry })))
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
    const nextInventoryItems = shouldNormalizeInventoryItems
      ? normalizedInventoryItems ??
        (currentCreatureProperties?.inventoryItems
          ? currentCreatureProperties.inventoryItems.map((entry) => ({
              ...entry,
              embeddedItem: normalizeEmbeddedItemSummary(entry.embeddedItem)
            }))
          : DEFAULT_CREATURE_INVENTORY_ITEMS.map((entry) => ({ ...entry })))
      : undefined;
    const nextEquippedItems = shouldNormalizeEquippedItems
      ? normalizedEquippedItems ??
        (currentCreatureProperties?.equippedItems
          ? currentCreatureProperties.equippedItems.map((entry) => ({
              ...entry,
              embeddedItem: normalizeEmbeddedItemSummary(entry.embeddedItem)
            }))
          : DEFAULT_CREATURE_EQUIPPED_ITEMS.map((entry) => ({ ...entry })))
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
    const currentHasCreatureAppearanceType = Object.prototype.hasOwnProperty.call(
      currentCreatureProperties ?? {},
      "appearanceType",
    );
    const rawCreatureAppearanceType = rawCreatureProperties?.appearanceType;
    const nextCreatureAppearanceType = Number.isSafeInteger(rawCreatureAppearanceType) &&
      Number(rawCreatureAppearanceType) >= 0 && Number(rawCreatureAppearanceType) <= 0xffff
        ? Number(rawCreatureAppearanceType)
        : Number.isSafeInteger(currentCreatureProperties?.appearanceType) &&
            Number(currentCreatureProperties?.appearanceType) >= 0 &&
            Number(currentCreatureProperties?.appearanceType) <= 0xffff
          ? Number(currentCreatureProperties?.appearanceType)
          : undefined;
    const sourcePhenotype = asString(
      currentCreatureProperties?.phenotype,
      DEFAULT_CREATURE_PROPERTIES.phenotype
    );
    const nextPhenotype = asString(rawCreatureProperties?.phenotype, sourcePhenotype);
    const currentHasCreaturePhenotypeId = Object.prototype.hasOwnProperty.call(
      currentCreatureProperties ?? {},
      "phenotypeId",
    );
    const rawCreaturePhenotypeId = rawCreatureProperties?.phenotypeId;
    const nextCreaturePhenotypeId = Number.isSafeInteger(rawCreaturePhenotypeId) &&
      Number(rawCreaturePhenotypeId) >= 0 && Number(rawCreaturePhenotypeId) <= 0xff &&
      Number(rawCreaturePhenotypeId) !== 1
        ? Number(rawCreaturePhenotypeId)
        : Number.isSafeInteger(currentCreatureProperties?.phenotypeId) &&
            Number(currentCreatureProperties?.phenotypeId) >= 0 &&
            Number(currentCreatureProperties?.phenotypeId) <= 0xff &&
            Number(currentCreatureProperties?.phenotypeId) !== 1
          ? Number(currentCreatureProperties?.phenotypeId)
          : undefined;
    const sourceGender = asString(currentCreatureProperties?.gender, DEFAULT_CREATURE_PROPERTIES.gender);
    const nextGender = asString(rawCreatureProperties?.gender, sourceGender);
    const currentHasCreatureGenderId = Object.prototype.hasOwnProperty.call(
      currentCreatureProperties ?? {},
      "genderId",
    );
    const rawCreatureGenderId = rawCreatureProperties?.genderId;
    const nextCreatureGenderId = Number.isSafeInteger(rawCreatureGenderId) &&
      Number(rawCreatureGenderId) >= 0 && Number(rawCreatureGenderId) <= 0xff
        ? Number(rawCreatureGenderId)
        : Number.isSafeInteger(currentCreatureProperties?.genderId) &&
            Number(currentCreatureProperties?.genderId) >= 0 &&
            Number(currentCreatureProperties?.genderId) <= 0xff
          ? Number(currentCreatureProperties?.genderId)
          : undefined;
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
    const currentHasCreaturePortraitId = Object.prototype.hasOwnProperty.call(
      currentCreatureProperties ?? {},
      "portraitId",
    );
    const rawCreaturePortraitId = rawCreatureProperties?.portraitId;
    const nextCreaturePortraitId = Number.isSafeInteger(rawCreaturePortraitId) &&
      Number(rawCreaturePortraitId) >= 0 && Number(rawCreaturePortraitId) <= 0xffff
        ? Number(rawCreaturePortraitId)
        : Number.isSafeInteger(currentCreatureProperties?.portraitId) &&
            Number(currentCreatureProperties?.portraitId) >= 0 &&
            Number(currentCreatureProperties?.portraitId) <= 0xffff
          ? Number(currentCreatureProperties?.portraitId)
          : undefined;
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
    const nextAlignment = shouldNormalizeAlignment
      ? asString(
          rawCreatureProperties?.alignment,
          asString(currentCreatureProperties?.alignment, "True Neutral")
        )
      : undefined;

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
    if (nextCreatureAppearanceType !== undefined) {
      nextCreatureProperties.appearanceType = nextCreatureAppearanceType;
    }
    if (nextCreaturePhenotypeId !== undefined) {
      nextCreatureProperties.phenotypeId = nextCreaturePhenotypeId;
    }
    if (nextCreatureGenderId !== undefined) {
      nextCreatureProperties.genderId = nextCreatureGenderId;
    }
    if (nextCreaturePortraitId !== undefined) {
      nextCreatureProperties.portraitId = nextCreaturePortraitId;
    }
    if (nextStatistics !== undefined) {
      nextCreatureProperties.statistics = nextStatistics;
    }
    if (nextAppearanceSettings !== undefined) {
      nextCreatureProperties.appearanceSettings = nextAppearanceSettings;
    }
    if (nextAppearanceProfile !== undefined) {
      nextCreatureProperties.appearanceProfile = nextAppearanceProfile;
    }
    if (nextLookupProfile !== undefined) {
      nextCreatureProperties.lookupProfile = nextLookupProfile;
    }
    if (nextListCounts !== undefined) {
      nextCreatureProperties.listCounts = nextListCounts;
    }
    if (nextLocalizedStringRefs !== undefined) {
      nextCreatureProperties.localizedStringRefs = nextLocalizedStringRefs;
    }
    if (nextLocalizedStrings !== undefined) {
      nextCreatureProperties.localizedStrings = nextLocalizedStrings;
    }
    if (nextClassEntries !== undefined) {
      nextCreatureProperties.classEntries = nextClassEntries;
    }
    if (nextTemplateEntries !== undefined) {
      nextCreatureProperties.templateEntries = nextTemplateEntries;
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
    if (nextInventoryItems !== undefined) {
      nextCreatureProperties.inventoryItems = nextInventoryItems;
    }
    if (nextEquippedItems !== undefined) {
      nextCreatureProperties.equippedItems = nextEquippedItems;
    }
    if (nextAlignment !== undefined) {
      nextCreatureProperties.alignment = nextAlignment;
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
      currentHasCreatureAppearanceType === Object.prototype.hasOwnProperty.call(
        nextCreatureProperties,
        "appearanceType",
      ) &&
      currentCreatureProperties?.appearanceType === nextCreatureProperties.appearanceType &&
      (currentCreatureProperties?.phenotype ?? DEFAULT_CREATURE_PROPERTIES.phenotype) === nextPhenotype &&
      currentHasCreaturePhenotypeId === Object.prototype.hasOwnProperty.call(
        nextCreatureProperties,
        "phenotypeId",
      ) &&
      currentCreatureProperties?.phenotypeId === nextCreatureProperties.phenotypeId &&
      (currentCreatureProperties?.gender ?? DEFAULT_CREATURE_PROPERTIES.gender) === nextGender &&
      currentHasCreatureGenderId === Object.prototype.hasOwnProperty.call(
        nextCreatureProperties,
        "genderId",
      ) &&
      currentCreatureProperties?.genderId === nextCreatureProperties.genderId &&
      (currentCreatureProperties?.description ?? "") === nextDescription &&
      (currentCreatureProperties?.challengeRating ?? DEFAULT_CREATURE_PROPERTIES.challengeRating) ===
        nextChallengeRating &&
      (currentCreatureProperties?.portraitResRef ?? "") === nextPortraitResRef &&
      currentHasCreaturePortraitId === Object.prototype.hasOwnProperty.call(
        nextCreatureProperties,
        "portraitId",
      ) &&
      currentCreatureProperties?.portraitId === nextCreatureProperties.portraitId &&
      (currentCreatureProperties?.conversation ?? "") === nextConversation &&
      (currentCreatureProperties?.noInterrupt ?? DEFAULT_CREATURE_PROPERTIES.noInterrupt) ===
        nextNoInterrupt &&
      (shouldNormalizeAlignment
        ? (currentCreatureProperties?.alignment ?? "True Neutral") === nextAlignment
        : currentCreatureProperties?.alignment === undefined) &&
      areCreatureStatisticsEqual(currentCreatureProperties?.statistics, nextStatistics) &&
      areCreatureAppearanceSettingsEqual(
        currentCreatureProperties?.appearanceSettings,
        nextAppearanceSettings
      ) &&
      areCreatureAppearanceProfilesEqual(
        currentCreatureProperties?.appearanceProfile,
        nextAppearanceProfile
      ) &&
      areCreatureLookupProfilesEqual(
        currentCreatureProperties?.lookupProfile,
        nextLookupProfile
      ) &&
      areCreatureListCountsEqual(
        currentCreatureProperties?.listCounts,
        nextListCounts
      ) &&
      areCreatureLocalizedStringRefsEqual(
        currentCreatureProperties?.localizedStringRefs,
        nextLocalizedStringRefs
      ) &&
      areCreatureLocalizedStringsEqual(
        currentCreatureProperties?.localizedStrings,
        nextLocalizedStrings
      ) &&
      areCreatureClassEntriesEqual(currentCreatureProperties?.classEntries, nextClassEntries) &&
      areCreatureTemplateEntriesEqual(
        currentCreatureProperties?.templateEntries,
        nextTemplateEntries
      ) &&
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
      areCreatureInventoryItemsEqual(
        currentCreatureProperties?.inventoryItems,
        nextInventoryItems
      ) &&
      areCreatureEquippedItemsEqual(
        currentCreatureProperties?.equippedItems,
        nextEquippedItems
      ) &&
      isCommentsUnchanged &&
      normalizedObject.doorProperties === undefined &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.encounterProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      normalizedObject.doorTransition === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      name: nextFirstName,
      doorProperties: undefined,
      creatureProperties: nextCreatureProperties,
      placeableProperties: undefined,
      encounterProperties: undefined,
      soundPositioning: undefined,
      doorTransition: undefined
    };
  }

  if (normalizedObject.kind === "doors") {
    const rawDoorProperties =
      (normalizedObject.doorProperties as
        | Partial<Record<keyof SceneObjectDoorProperties, unknown>>
        | undefined) ?? undefined;
    const hasRawLockSettings = isRecord(rawDoorProperties?.lockSettings);
    const hasRawTrapSettings = isRecord(rawDoorProperties?.trapSettings);
    const hasRawScriptSlots = isRecord(rawDoorProperties?.scriptSlots);
    const hasRawAdvancedSettings = isRecord(rawDoorProperties?.advancedSettings);

    const rawLockSettings = hasRawLockSettings
      ? (rawDoorProperties?.lockSettings as Partial<
          Record<keyof SceneObjectDoorLockSettings, unknown>
        >)
      : undefined;
    const rawTrapSettings = hasRawTrapSettings
      ? (rawDoorProperties?.trapSettings as Partial<
          Record<keyof SceneObjectDoorTrapSettings, unknown>
        >)
      : undefined;
    const rawScriptSlots = hasRawScriptSlots
      ? (rawDoorProperties?.scriptSlots as Partial<
          Record<keyof SceneObjectDoorScriptSlots, unknown>
        >)
      : undefined;
    const rawAdvancedSettings = hasRawAdvancedSettings
      ? (rawDoorProperties?.advancedSettings as Partial<
          Record<keyof SceneObjectDoorAdvancedSettings, unknown>
        >)
      : undefined;

    const currentDoorProperties = normalizedObject.doorProperties;
    const shouldNormalizeLockSettings =
      hasRawLockSettings || currentDoorProperties?.lockSettings !== undefined;
    const shouldNormalizeTrapSettings =
      hasRawTrapSettings || currentDoorProperties?.trapSettings !== undefined;
    const shouldNormalizeScriptSlots =
      hasRawScriptSlots || currentDoorProperties?.scriptSlots !== undefined;
    const shouldNormalizeAdvancedSettings =
      hasRawAdvancedSettings || currentDoorProperties?.advancedSettings !== undefined;
    const shouldNormalizeDescription =
      typeof rawDoorProperties?.description === "string" ||
      currentDoorProperties?.description !== undefined;
    const shouldNormalizeComments =
      typeof rawDoorProperties?.comments === "string" ||
      currentDoorProperties?.comments !== undefined;

    const nextLockSettings: SceneObjectDoorLockSettings | undefined =
      shouldNormalizeLockSettings
        ? {
            locked: isBoolean(rawLockSettings?.locked)
              ? rawLockSettings.locked
              : DEFAULT_DOOR_LOCK_SETTINGS.locked,
            canRelock: isBoolean(rawLockSettings?.canRelock)
              ? rawLockSettings.canRelock
              : DEFAULT_DOOR_LOCK_SETTINGS.canRelock,
            autoRemoveKeyAfterUse: isBoolean(rawLockSettings?.autoRemoveKeyAfterUse)
              ? rawLockSettings.autoRemoveKeyAfterUse
              : DEFAULT_DOOR_LOCK_SETTINGS.autoRemoveKeyAfterUse,
            keyRequiredToUnlockOrLock: isBoolean(rawLockSettings?.keyRequiredToUnlockOrLock)
              ? rawLockSettings.keyRequiredToUnlockOrLock
              : DEFAULT_DOOR_LOCK_SETTINGS.keyRequiredToUnlockOrLock,
            openLockDc: asFiniteNumber(rawLockSettings?.openLockDc, DEFAULT_DOOR_LOCK_SETTINGS.openLockDc),
            closeLockDc: asFiniteNumber(rawLockSettings?.closeLockDc, DEFAULT_DOOR_LOCK_SETTINGS.closeLockDc),
            keyTag: asString(rawLockSettings?.keyTag, DEFAULT_DOOR_LOCK_SETTINGS.keyTag)
          }
        : undefined;

    const nextTrapSettings: SceneObjectDoorTrapSettings | undefined =
      shouldNormalizeTrapSettings
        ? {
            isTrapped: isBoolean(rawTrapSettings?.isTrapped)
              ? rawTrapSettings.isTrapped
              : DEFAULT_DOOR_TRAP_SETTINGS.isTrapped,
            trapType: asString(rawTrapSettings?.trapType, DEFAULT_DOOR_TRAP_SETTINGS.trapType),
            detectionDc: asFiniteNumber(rawTrapSettings?.detectionDc, DEFAULT_DOOR_TRAP_SETTINGS.detectionDc),
            disarmDc: asFiniteNumber(rawTrapSettings?.disarmDc, DEFAULT_DOOR_TRAP_SETTINGS.disarmDc),
            oneShot: isBoolean(rawTrapSettings?.oneShot)
              ? rawTrapSettings.oneShot
              : DEFAULT_DOOR_TRAP_SETTINGS.oneShot,
            detectable: isBoolean(rawTrapSettings?.detectable)
              ? rawTrapSettings.detectable
              : DEFAULT_DOOR_TRAP_SETTINGS.detectable,
            disarmable: isBoolean(rawTrapSettings?.disarmable)
              ? rawTrapSettings.disarmable
              : DEFAULT_DOOR_TRAP_SETTINGS.disarmable,
            onDisarmScript: asString(rawTrapSettings?.onDisarmScript, DEFAULT_DOOR_TRAP_SETTINGS.onDisarmScript),
            onTrapTriggeredScript: asString(
              rawTrapSettings?.onTrapTriggeredScript,
              DEFAULT_DOOR_TRAP_SETTINGS.onTrapTriggeredScript
            ),
            setDc: asFiniteNumber(rawTrapSettings?.setDc, DEFAULT_DOOR_TRAP_SETTINGS.setDc),
            detectDcModWhenSetByRogue: asFiniteNumber(
              rawTrapSettings?.detectDcModWhenSetByRogue,
              DEFAULT_DOOR_TRAP_SETTINGS.detectDcModWhenSetByRogue
            ),
            disarmDcModWhenSetByRogue: asFiniteNumber(
              rawTrapSettings?.disarmDcModWhenSetByRogue,
              DEFAULT_DOOR_TRAP_SETTINGS.disarmDcModWhenSetByRogue
            )
          }
        : undefined;

    const nextScriptSlots: SceneObjectDoorScriptSlots | undefined =
      shouldNormalizeScriptSlots
        ? {
            onAreaTransitionClick: asString(
              rawScriptSlots?.onAreaTransitionClick,
              DEFAULT_DOOR_SCRIPT_SLOTS.onAreaTransitionClick
            ),
            onClose: asString(rawScriptSlots?.onClose, DEFAULT_DOOR_SCRIPT_SLOTS.onClose),
            onDamaged: asString(rawScriptSlots?.onDamaged, DEFAULT_DOOR_SCRIPT_SLOTS.onDamaged),
            onDeath: asString(rawScriptSlots?.onDeath, DEFAULT_DOOR_SCRIPT_SLOTS.onDeath),
            onFailToOpen: asString(rawScriptSlots?.onFailToOpen, DEFAULT_DOOR_SCRIPT_SLOTS.onFailToOpen),
            onHeartbeat: asString(rawScriptSlots?.onHeartbeat, DEFAULT_DOOR_SCRIPT_SLOTS.onHeartbeat),
            onLock: asString(rawScriptSlots?.onLock, DEFAULT_DOOR_SCRIPT_SLOTS.onLock),
            onPhysicalAttacked: asString(
              rawScriptSlots?.onPhysicalAttacked,
              DEFAULT_DOOR_SCRIPT_SLOTS.onPhysicalAttacked
            ),
            onOpen: asString(rawScriptSlots?.onOpen, DEFAULT_DOOR_SCRIPT_SLOTS.onOpen),
            onSpellCastAt: asString(rawScriptSlots?.onSpellCastAt, DEFAULT_DOOR_SCRIPT_SLOTS.onSpellCastAt),
            onUnlock: asString(rawScriptSlots?.onUnlock, DEFAULT_DOOR_SCRIPT_SLOTS.onUnlock),
            onUserDefined: asString(rawScriptSlots?.onUserDefined, DEFAULT_DOOR_SCRIPT_SLOTS.onUserDefined)
          }
        : undefined;

    const nextAdvancedSettings: SceneObjectDoorAdvancedSettings | undefined =
      shouldNormalizeAdvancedSettings
        ? {
            blueprintResRef: asString(
              rawAdvancedSettings?.blueprintResRef,
              DEFAULT_DOOR_ADVANCED_SETTINGS.blueprintResRef
            ),
            belongsToFaction: asString(
              rawAdvancedSettings?.belongsToFaction,
              DEFAULT_DOOR_ADVANCED_SETTINGS.belongsToFaction
            ),
            conversation: asString(
              rawAdvancedSettings?.conversation,
              DEFAULT_DOOR_ADVANCED_SETTINGS.conversation
            ),
            noInterrupt: isBoolean(rawAdvancedSettings?.noInterrupt)
              ? rawAdvancedSettings.noInterrupt
              : DEFAULT_DOOR_ADVANCED_SETTINGS.noInterrupt,
            portraitResRef: asString(
              rawAdvancedSettings?.portraitResRef,
              DEFAULT_DOOR_ADVANCED_SETTINGS.portraitResRef
            ),
            initialState: asString(
              rawAdvancedSettings?.initialState,
              DEFAULT_DOOR_ADVANCED_SETTINGS.initialState
            )
          }
        : undefined;

    const nextDescription = shouldNormalizeDescription
      ? asString(rawDoorProperties?.description, "")
      : undefined;
    const nextComments = shouldNormalizeComments
      ? asString(rawDoorProperties?.comments, "")
      : undefined;

    const nextDoorProperties: SceneObjectDoorProperties = {
      plot: isBoolean(rawDoorProperties?.plot) ? rawDoorProperties.plot : DEFAULT_DOOR_PROPERTIES.plot,
      hardness: asFiniteNumber(rawDoorProperties?.hardness, DEFAULT_DOOR_PROPERTIES.hardness),
      hitPoints: asFiniteNumber(rawDoorProperties?.hitPoints, DEFAULT_DOOR_PROPERTIES.hitPoints),
      fortitudeSave: asFiniteNumber(rawDoorProperties?.fortitudeSave, DEFAULT_DOOR_PROPERTIES.fortitudeSave),
      reflexSave: asFiniteNumber(rawDoorProperties?.reflexSave, DEFAULT_DOOR_PROPERTIES.reflexSave),
      willSave: asFiniteNumber(rawDoorProperties?.willSave, DEFAULT_DOOR_PROPERTIES.willSave),
      appearanceType: asString(rawDoorProperties?.appearanceType, DEFAULT_DOOR_PROPERTIES.appearanceType),
      genericAppearance: asString(rawDoorProperties?.genericAppearance, DEFAULT_DOOR_PROPERTIES.genericAppearance)
    };
    if (nextLockSettings !== undefined) {
      nextDoorProperties.lockSettings = nextLockSettings;
    }
    if (nextTrapSettings !== undefined) {
      nextDoorProperties.trapSettings = nextTrapSettings;
    }
    if (nextScriptSlots !== undefined) {
      nextDoorProperties.scriptSlots = nextScriptSlots;
    }
    if (nextAdvancedSettings !== undefined) {
      nextDoorProperties.advancedSettings = nextAdvancedSettings;
    }
    if (nextDescription !== undefined) {
      nextDoorProperties.description = nextDescription;
    }
    if (nextComments !== undefined) {
      nextDoorProperties.comments = nextComments;
    }

    const rawDoorTransition =
      (normalizedObject.doorTransition as
        | Partial<Record<keyof SceneObjectDoorTransitionPayload, unknown>>
        | undefined) ?? undefined;
    const shouldNormalizeDoorTransition = rawDoorTransition !== undefined;
    const nextDoorTransitionExtra = normalizePreservePrimitiveMap(rawDoorTransition?.extra);
    const nextDoorTransitionStorage = isAreaDoorTransitionStorage(rawDoorTransition?.storage)
      ? cloneAreaDoorTransitionStorage(rawDoorTransition.storage)
      : undefined;
    const nextDoorTransition: SceneObjectDoorTransitionPayload | undefined = shouldNormalizeDoorTransition
      ? {
          linkedTarget: asString(rawDoorTransition?.linkedTarget, ""),
          linkedModule: asString(rawDoorTransition?.linkedModule, ""),
          linkedTag: asString(rawDoorTransition?.linkedTag, ""),
          linkedWaypoint: asString(rawDoorTransition?.linkedWaypoint, ""),
          loadScreen: asString(rawDoorTransition?.loadScreen, ""),
          flags: normalizeDoorTransitionFlags(rawDoorTransition?.flags),
          ...(nextDoorTransitionStorage
            ? { storage: nextDoorTransitionStorage }
            : {}),
          ...(Object.keys(nextDoorTransitionExtra).length > 0
            ? { extra: nextDoorTransitionExtra }
            : {})
        }
      : undefined;
    const currentDoorTransition = normalizedObject.doorTransition;
    const isDoorPropertiesUnchanged =
      currentDoorProperties?.plot === nextDoorProperties.plot &&
      currentDoorProperties?.hardness === nextDoorProperties.hardness &&
      currentDoorProperties?.hitPoints === nextDoorProperties.hitPoints &&
      currentDoorProperties?.fortitudeSave === nextDoorProperties.fortitudeSave &&
      currentDoorProperties?.reflexSave === nextDoorProperties.reflexSave &&
      currentDoorProperties?.willSave === nextDoorProperties.willSave &&
      currentDoorProperties?.appearanceType === nextDoorProperties.appearanceType &&
      currentDoorProperties?.genericAppearance === nextDoorProperties.genericAppearance &&
      areDoorLockSettingsEqual(currentDoorProperties?.lockSettings, nextLockSettings) &&
      areDoorTrapSettingsEqual(currentDoorProperties?.trapSettings, nextTrapSettings) &&
      areDoorScriptSlotsEqual(currentDoorProperties?.scriptSlots, nextScriptSlots) &&
      areDoorAdvancedSettingsEqual(currentDoorProperties?.advancedSettings, nextAdvancedSettings) &&
      (nextDescription === undefined
        ? currentDoorProperties?.description === undefined
        : (currentDoorProperties?.description ?? "") === nextDescription) &&
      (nextComments === undefined
        ? currentDoorProperties?.comments === undefined
        : (currentDoorProperties?.comments ?? "") === nextComments);

    const isDoorTransitionUnchanged =
      nextDoorTransition === undefined
        ? currentDoorTransition === undefined
        : currentDoorTransition?.linkedTarget === nextDoorTransition.linkedTarget &&
          currentDoorTransition?.linkedModule === nextDoorTransition.linkedModule &&
          currentDoorTransition?.linkedTag === nextDoorTransition.linkedTag &&
          currentDoorTransition?.linkedWaypoint === nextDoorTransition.linkedWaypoint &&
          currentDoorTransition?.loadScreen === nextDoorTransition.loadScreen &&
          areDoorTransitionFlagsEqual(currentDoorTransition?.flags ?? {}, nextDoorTransition.flags) &&
          areDoorTransitionStorageValuesEqual(
            currentDoorTransition?.storage,
            nextDoorTransition.storage,
          ) &&
          arePrimitiveMapsEqual(currentDoorTransition?.extra ?? {}, nextDoorTransition.extra ?? {});

    if (
      isDoorPropertiesUnchanged &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.encounterProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      isDoorTransitionUnchanged
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      doorProperties: nextDoorProperties,
      placeableProperties: undefined,
      creatureProperties: undefined,
      encounterProperties: undefined,
      soundPositioning: undefined,
      doorTransition: nextDoorTransition
    };
  }

  if (normalizedObject.kind === "encounters") {
    if (
      normalizedObject.doorProperties === undefined &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.soundPositioning === undefined &&
      normalizedObject.doorTransition === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      doorProperties: undefined,
      placeableProperties: undefined,
      creatureProperties: undefined,
      soundPositioning: undefined,
      doorTransition: undefined
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
      normalizedObject.doorProperties === undefined &&
      normalizedObject.placeableProperties === undefined &&
      normalizedObject.creatureProperties === undefined &&
      normalizedObject.encounterProperties === undefined
    ) {
      return normalizedObject;
    }

    return {
      ...normalizedObject,
      doorProperties: undefined,
      placeableProperties: undefined,
      creatureProperties: undefined,
      encounterProperties: undefined,
      soundPositioning: nextSoundPositioning
    };
  }

  if (
    normalizedObject.doorProperties === undefined &&
    normalizedObject.placeableProperties === undefined &&
    normalizedObject.creatureProperties === undefined &&
    normalizedObject.encounterProperties === undefined &&
    normalizedObject.soundPositioning === undefined
  ) {
    return normalizedObject;
  }

  // Defensive cleanup for corrupted drafts where metadata ended up on unsupported kinds.
  // This keeps runtime behavior deterministic without changing public API contracts.
  return {
    ...normalizedObject,
    doorProperties: undefined,
    placeableProperties: undefined,
    creatureProperties: undefined,
    encounterProperties: undefined,
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

function createSceneTiles(width: number, height: number): SceneTile[] {
  const tiles: SceneTile[] = [];
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      tiles.push(createTile(row, col));
    }
  }
  return tiles;
}

export function createBlankAreaScene(
  width = DEFAULT_SEED_SCENE_WIDTH_TILES,
  height = DEFAULT_SEED_SCENE_HEIGHT_TILES,
  updatedAtUnixMs = Date.now()
): AreaScene {
  const tiles = createSceneTiles(width, height);
  return {
    sceneId: DEFAULT_BLANK_SCENE_ID,
    areaName: "Untitled Area",
    width,
    height,
    tileSource: {
      type: "seed_placeholder",
      tileCount: tiles.length,
      fallbackReason: "blank-startup-scene"
    },
    tiles,
    objects: [],
    walkmesh: createWalkmeshDomainModel({}),
    updatedAtUnixMs,
    source: "seed"
  };
}

export function createSeedAreaScene(
  width = DEFAULT_SEED_SCENE_WIDTH_TILES,
  height = DEFAULT_SEED_SCENE_HEIGHT_TILES
): AreaScene {
  const tiles = createSceneTiles(width, height);

  return {
    sceneId: "wnd_seed_builder_v1",
    areaName: "Seed Area (MVP Runtime)",
    width,
    height,
    tileSource: {
      type: "seed_placeholder",
      tileCount: tiles.length,
      fallbackReason: "seed-scene-placeholder"
    },
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
  const constructionDefaults = getAreaObjectConstructionDefaults(kind);
  const index = String(sequence).padStart(3, "0");
  const baseResRefByKind: Record<SceneObjectKind, string> = {
    placeables: "plc_a01",
    creatures: "nw_hguard",
    doors: "nw_door_ttr_11",
    encounters: "enc_forest_ambush",
    items: "nw_it_mpotion001",
    sounds: "as_amb_forest",
    stores: "store_general",
    triggers: "trg_generic",
    waypoints: "nw_waypoint001"
  };

  const key = kind.slice(0, 3);
  return normalizeSceneObjectMetadata({
    id: `${key}_${index}`,
    kind,
    name: `${kind.toUpperCase()}_${index}`,
    resRef: constructionDefaults?.resRef ?? baseResRefByKind[kind],
    tag: constructionDefaults?.tag ?? `${kind.toUpperCase()}_${index}`,
    ...(constructionDefaults ? { source: constructionDefaults.source } : {}),
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

export function createNewDoorHookSceneObject(
  scene: AreaScene,
  x: number,
  y: number,
  sequence: number,
): SceneObject | undefined {
  if (!Number.isSafeInteger(sequence) || sequence < 0) {
    return undefined;
  }
  const editing = scene.auroraAreaEditing;
  const profile = AREA_DOOR_CONSTRUCTION_PROFILE;
  const hook = profile.hook;
  if (
    !editing ||
    editing.state.tilesetResRef !== hook.tilesetResRef ||
    editing.definition.tilesetResRef !== hook.tilesetResRef ||
    editing.state.tilesetFingerprint !== hook.tilesetSha256 ||
    editing.definition.fingerprint !== hook.tilesetSha256 ||
    editing.state.width !== scene.width ||
    editing.state.height !== scene.height
  ) {
    return undefined;
  }

  const row = Math.floor(y);
  const col = Math.floor(x);
  if (row < 0 || col < 0 || row >= editing.state.height || col >= editing.state.width) {
    return undefined;
  }
  const retainedTile = editing.state.tiles.find(
    (candidate) => candidate.row === row && candidate.col === col,
  );
  if (
    !retainedTile ||
    retainedTile.tileId !== hook.tileId ||
    retainedTile.orientation !== hook.tileOrientation ||
    retainedTile.height !== hook.tileHeight
  ) {
    return undefined;
  }

  const definitionTile = editing.definition.tiles.find((candidate) => candidate.tileId === hook.tileId);
  if (
    !definitionTile ||
    definitionTile.orientation !== hook.tileOrientation
  ) {
    return undefined;
  }
  const definitionHooks = definitionTile.doorHooks;
  if (!definitionHooks || definitionHooks.length !== 1) {
    return undefined;
  }
  const definitionHook = definitionHooks[0]!;
  if (
    definitionHook.index !== hook.hookIndex ||
    definitionHook.type !== hook.hookType ||
    definitionHook.x !== hook.localX ||
    definitionHook.y !== hook.localY ||
    definitionHook.z !== hook.localZ ||
    definitionHook.orientationDegrees !== hook.orientationDegrees
  ) {
    return undefined;
  }

  const worldX = col + 0.5 + hook.localX / 10;
  const worldY = row + 0.5 + hook.localY / 10;
  const worldZ = hook.localZ / 10;
  const isOccupied = scene.objects.some((object) => {
    if (object.kind !== "doors") return false;
    const existingHook = object.source?.doorHook;
    return (
      existingHook?.profileId === hook.profileId &&
      existingHook.row === row &&
      existingHook.col === col &&
      existingHook.hookIndex === hook.hookIndex
    ) || (
      object.x === worldX && object.y === worldY && object.z === worldZ
    );
  });
  if (isOccupied) return undefined;

  const constructionDefaults = getAreaDoorConstructionDefaults(row, col)!;
  const index = String(sequence).padStart(3, "0");
  return normalizeSceneObjectMetadata({
    id: `doo_${index}`,
    kind: "doors",
    name: "Barn 1 Door",
    resRef: constructionDefaults.resRef,
    tag: constructionDefaults.tag,
    source: constructionDefaults.source,
    isStatic: false,
    x: worldX,
    y: worldY,
    z: worldZ,
    bearing: hook.sceneBearing,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      roll: 0,
      yaw: 0,
    },
  });
}
