import type {
  AreaScene,
  SceneObject,
  SceneObjectEmbeddedItemSummary,
  SceneObjectPlaceableInventoryItemReference
} from "../contracts";
import type {
  SceneObjectCreatureProperties,
  SceneObjectItemArmorParts,
  SceneObjectItemBlueprintEquipmentEntry,
  SceneObjectItemBlueprintInventoryEntry,
  SceneObjectItemInventoryTargetEntry,
  SceneObjectItemMaterialColors,
  SceneObjectItemProperties,
  SceneObjectItemPropertyEntry,
  SceneObjectItemVariableTargetEntry,
  SceneObjectPlaceableProperties,
  ScenePlaceableBodyBagCatalog,
  ScenePlaceableFactionCatalog,
} from "../../scene/contracts";
import { CREATURE_SKILL_LABELS } from "../../creatures/application/creatureSkillLabels";
import { PLACEABLE_ANIMATION_STATE_TOKENS } from "../../scene/domain/placeableAnimationState";
import { CREATURE_ALIGNMENT_LABELS } from "../../scene/domain/creatureAlignment";
import { canEditExistingCreatureInventory } from "../../scene/domain/creatureInventory";
import {
  canEditExistingCreatureEquipment,
  readCreatureEquipmentTargetEntries
} from "../../scene/domain/creatureEquipment";
import { canEditExistingCreatureTag } from "./creatureTagProvenance";
import { canEditExistingCreatureConversation } from "./creatureConversationProvenance";
import { canEditExistingCreatureInterruptable } from "./creatureInterruptableProvenance";
import { canEditExistingCreatureAdvancedFlag } from "./creatureAdvancedFlagsProvenance";
import {
  canEditExistingCreatureBodyBag,
  canEditExistingCreatureDecayTime,
} from "../../scene/domain/creatureDeathRemains";
import { canEditExistingCreatureAppearance } from "./creatureAppearanceProvenance";
import { canEditExistingCreatureGender } from "./creatureGenderProvenance";
import { canEditExistingCreaturePhenotype } from "../../scene/domain/creaturePhenotype";
import { canEditExistingCreatureFaction } from "./creatureFactionProvenance";
import { canEditExistingCreatureTemplateResRef } from "./creatureTemplateResRefProvenance";
import { canEditExistingCreatureSpecialIdentityString } from "./creatureSpecialIdentityStringsProvenance";
import {
  canEditExistingCreatureNameLocalizedString,
} from "./creatureLocalizedStringProvenance";
import { normalizeSoundGuidePositioning } from "../soundGuideDomain";
import { resolvePreservedPlaceableAppearanceDword } from "./placeableBasicIdentityPreservation";
import { readExistingPlaceableHitPointState } from "./placeableHitPointProvenance";
import {
  materializeExistingDoorTransitionStorage,
  readExistingDoorTransitionStorageProvenance,
} from "./doorTransitionStorageProvenance";
import {
  areaSoundIntervalVariationStoragesEqual,
  cloneAreaSoundIntervalVariationStorage,
  readAreaSoundIntervalVariationStorage,
  soundIntervalVariationPresentationFromStorage,
  soundIntervalVariationStorageFromPresentation,
} from "../../areas/domain/areaSoundIntervalVariationStorage";
import {
  areaSoundVolumeStoragesEqual,
  cloneAreaSoundVolumeStorage,
  readAreaSoundVolumeStorage,
  soundVolumePresentationFromStorage,
  soundVolumeStorageFromPresentation,
} from "../../areas/domain/areaSoundVolumeStorage";
import {
  areaSoundSchedulePresentationFromStorage,
  areaSoundScheduleStorageFromPresentation,
  areaSoundScheduleStoragesEqual,
  cloneAreaSoundScheduleStorage,
  readAreaSoundScheduleStorage,
} from "../../areas/domain/areaSoundScheduleStorage";
import {
  areaSoundActiveStoragesEqual,
  cloneAreaSoundActiveStorage,
  readAreaSoundActiveStorage,
  soundActivePresentationFromStorage,
  soundActiveStorageFromPresentation,
} from "../../areas/domain/areaSoundActiveStorage";
import {
  areaSoundPlayOrderStoragesEqual,
  cloneAreaSoundPlayOrderStorage,
  readAreaSoundPlayOrderStorage,
  soundPlayOrderPresentationFromStorage,
  soundPlayOrderStorageFromPresentation,
} from "../../areas/domain/areaSoundPlayOrderStorage";
import {
  areaSoundPlayStylePresentationFromStorage,
  areaSoundPlayStyleStorageFromPresentation,
  areaSoundPlayStyleStoragesEqual,
  cloneAreaSoundPlayStyleStorage,
  readAreaSoundPlayStyleStorage,
} from "../../areas/domain/areaSoundPlayStyleStorage";
import {
  areaSoundPlaybackPresentationFromStorage,
  areaSoundPlaybackStorageFromPresentation,
  areaSoundPlaybackStoragesEqual,
  cloneAreaSoundPlaybackStorage,
  readAreaSoundPlaybackStorage,
} from "../../areas/domain/areaSoundPlaybackStorage";
import {
  areaSoundProfilePresentationFromStorage,
  areaSoundProfileStorageFromPresentation,
  areaSoundProfileStoragesEqual,
  cloneAreaSoundProfileStorage,
  readAreaSoundProfileStorage,
} from "../../areas/domain/areaSoundProfileStorage";

export { CREATURE_SKILL_LABELS };

function cloneEmbeddedItemSummary(
  embeddedItem: SceneObjectEmbeddedItemSummary | undefined
): SceneObjectEmbeddedItemSummary | undefined {
  return embeddedItem
    ? {
        ...embeddedItem,
        itemPropertyListEntries: embeddedItem.itemPropertyListEntries
          ? embeddedItem.itemPropertyListEntries.map((entry) => ({ ...entry }))
          : undefined
      }
    : undefined;
}

export interface PropertyTabOption<TTab extends string> {
  id: TTab;
  label: string;
}

export type PlaceablePropertiesTab =
  | "basic"
  | "inventory"
  | "lock"
  | "trap"
  | "scripts"
  | "advanced"
  | "description"
  | "comments";

export type SoundPropertiesTab = "basic" | "positioning" | "advanced";
export type SoundPositioningMode = "everywhere" | "random" | "specific";
export type SoundWhenToPlay = "always" | "dayNight" | "hours";
export type SoundDayNight = "both" | "day" | "night";
export type SoundPlayStyle = "once" | "repeat" | "loop";
export type SoundPlayOrder = "sequential" | "random";
export type DoorPropertiesTab =
  | "basic"
  | "lock"
  | "trap"
  | "scripts"
  | "advanced"
  | "description"
  | "comments"
  | "areaTransition";
export type DoorTransitionDestinationType = "none" | "door" | "waypoint";
export type CreaturePropertiesTab =
  | "basic"
  | "statistics"
  | "appearance"
  | "classes"
  | "skills"
  | "scripts"
  | "advanced"
  | "feats"
  | "spells"
  | "specialAbilities"
  | "inventory"
  | "comments";
export type ItemPropertiesTab =
  | "basic"
  | "visual"
  | "colors"
  | "properties"
  | "variables"
  | "comments";
export type PlaceableScriptSlotKey =
  | "onClick"
  | "onClosed"
  | "onDamaged"
  | "onDeath"
  | "onHeartbeat"
  | "onInvDisturbed"
  | "onLock"
  | "onMeleeAttacked"
  | "onOpen"
  | "onSpellCastAt"
  | "onUnlock"
  | "onUsed"
  | "onUserDefined";

export type DoorScriptSlotKey =
  | "onAreaTransitionClick"
  | "onClose"
  | "onDamaged"
  | "onDeath"
  | "onFailToOpen"
  | "onHeartbeat"
  | "onLock"
  | "onPhysicalAttacked"
  | "onOpen"
  | "onSpellCastAt"
  | "onUnlock"
  | "onUserDefined";

export const PLACEABLE_PROPERTIES_TAB_OPTIONS: ReadonlyArray<PropertyTabOption<PlaceablePropertiesTab>> =
  [
    { id: "basic", label: "Basic" },
    { id: "inventory", label: "Inventory" },
    { id: "lock", label: "Lock" },
    { id: "trap", label: "Trap" },
    { id: "scripts", label: "Scripts" },
    { id: "advanced", label: "Advanced" },
    { id: "description", label: "Description" },
    { id: "comments", label: "Comments" }
  ];

export const DOOR_PROPERTIES_TAB_OPTIONS: ReadonlyArray<PropertyTabOption<DoorPropertiesTab>> = [
  { id: "basic", label: "Basic" },
  { id: "lock", label: "Lock" },
  { id: "trap", label: "Trap" },
  { id: "areaTransition", label: "Area Transition" },
  { id: "scripts", label: "Scripts" },
  { id: "advanced", label: "Advanced" },
  { id: "description", label: "Description" },
  { id: "comments", label: "Comments" }
];

export const SOUND_PROPERTIES_TAB_OPTIONS: ReadonlyArray<PropertyTabOption<SoundPropertiesTab>> = [
  { id: "basic", label: "Basic" },
  { id: "positioning", label: "Positioning" },
  { id: "advanced", label: "Advanced" }
];

export const ITEM_PROPERTIES_TAB_OPTIONS: ReadonlyArray<PropertyTabOption<ItemPropertiesTab>> = [
  { id: "basic", label: "Basic" },
  { id: "visual", label: "Visual" },
  { id: "colors", label: "Colors" },
  { id: "properties", label: "Properties" },
  { id: "variables", label: "Variables" },
  { id: "comments", label: "Comments" }
];

export const PLACEABLE_SCRIPT_SLOT_KEYS: PlaceableScriptSlotKey[] = [
  "onClick",
  "onClosed",
  "onDamaged",
  "onDeath",
  "onHeartbeat",
  "onInvDisturbed",
  "onLock",
  "onMeleeAttacked",
  "onOpen",
  "onSpellCastAt",
  "onUnlock",
  "onUsed",
  "onUserDefined"
];

export const DOOR_SCRIPT_SLOT_KEYS: DoorScriptSlotKey[] = [
  "onAreaTransitionClick",
  "onClose",
  "onDamaged",
  "onDeath",
  "onFailToOpen",
  "onHeartbeat",
  "onLock",
  "onPhysicalAttacked",
  "onOpen",
  "onSpellCastAt",
  "onUnlock",
  "onUserDefined"
];

export const PLACEABLE_SCRIPT_SLOT_LABELS: Record<PlaceableScriptSlotKey, string> = {
  onClick: "OnClick",
  onClosed: "OnClose",
  onDamaged: "OnDamaged",
  onDeath: "OnDeath",
  onHeartbeat: "OnHeartbeat",
  onInvDisturbed: "OnDisturbed",
  onLock: "OnLock",
  onMeleeAttacked: "OnPhysicalAttacked",
  onOpen: "OnOpen",
  onSpellCastAt: "OnSpellCastAt",
  onUnlock: "OnUnLock",
  onUsed: "OnUsed",
  onUserDefined: "OnUserDefined"
};

export const DOOR_SCRIPT_SLOT_LABELS: Record<DoorScriptSlotKey, string> = {
  onAreaTransitionClick: "OnAreaTransitionClick",
  onClose: "OnClose",
  onDamaged: "OnDamaged",
  onDeath: "OnDeath",
  onFailToOpen: "OnFailToOpen",
  onHeartbeat: "OnHeartbeat",
  onLock: "OnLock",
  onPhysicalAttacked: "OnPhysicalAttacked",
  onOpen: "OnOpen",
  onSpellCastAt: "OnSpellCastAt",
  onUnlock: "OnUnLock",
  onUserDefined: "OnUserDefined"
};

export const CREATURE_SCRIPT_SLOT_KEYS: CreatureScriptSlotKey[] = [
  "onBlocked",
  "onCombatRoundEnd",
  "onConversation",
  "onDamaged",
  "onDeath",
  "onDisturbed",
  "onHeartbeat",
  "onPerception",
  "onPhysicalAttacked",
  "onRested",
  "onSpawn",
  "onSpellCastAt",
  "onUserDefined"
];

export const CREATURE_SCRIPT_SLOT_LABELS: Record<CreatureScriptSlotKey, string> = {
  onBlocked: "OnBlocked",
  onCombatRoundEnd: "OnCombatRoundEnd",
  onConversation: "OnConversation",
  onDamaged: "OnDamaged",
  onDeath: "OnDeath",
  onDisturbed: "OnDisturbed",
  onHeartbeat: "OnHeartbeat",
  onPerception: "OnPerception",
  onPhysicalAttacked: "OnPhysicalAttacked",
  onRested: "OnRested",
  onSpawn: "OnSpawn",
  onSpellCastAt: "OnSpellCastAt",
  onUserDefined: "OnUserDefined"
};

export const PLACEABLE_TRAP_TYPE_OPTIONS = [
  "Spike Trap, Minor",
  "Spike Trap, Average",
  "Spike Trap, Deadly",
  "Acid Splash, Minor",
  "Fire Trap, Minor",
  "Electrical Trap, Minor",
  "Holy Trap, Minor"
];

export const PLACEABLE_FACTION_OPTIONS = ["Hostile", "Commoner", "Defender", "Merchant", "Neutral"];
export const PLACEABLE_INITIAL_STATE_OPTIONS = PLACEABLE_ANIMATION_STATE_TOKENS;
export const PLACEABLE_TREASURE_MODEL_OPTIONS = ["Default", "None", "Container", "Random"];
export const DOOR_APPEARANCE_TYPE_OPTIONS = ["Use Generic Appearance", "Custom Appearance"];
export const DOOR_GENERIC_APPEARANCE_OPTIONS = [
  "Wooden Door (Strong)",
  "Wooden Door (Weak)",
  "Stone Door",
  "Metal Door"
];
export const DOOR_INITIAL_STATE_OPTIONS = ["Closed", "Open", "Destroyed"];
export const CREATURE_RACE_OPTIONS = [
  "Aberration",
  "Animal",
  "Beast",
  "Construct",
  "Dragon",
  "Elemental",
  "Fey",
  "Giant",
  "Humanoid",
  "Magical Beast",
  "Monstrous Humanoid",
  "Outsider",
  "Undead",
  "Vermin"
];
export const CREATURE_ALIGNMENT_OPTIONS = [...CREATURE_ALIGNMENT_LABELS];
export const CREATURE_MOVEMENT_RATE_OPTIONS = [
  "Default",
  "Very Slow",
  "Slow",
  "Normal",
  "Fast",
  "Very Fast"
];
export const CREATURE_FACTION_OPTIONS = ["Hostile", "Commoner", "Defender", "Merchant", "Neutral"];
export const CREATURE_TREASURE_MODEL_OPTIONS = ["Default", "None", "Monster", "Random"];
export const CREATURE_PERCEPTION_RANGE_OPTIONS = ["Default", "Near", "Medium", "Far", "Infinite"];
export const CREATURE_FEAT_FILTER_OPTIONS = [
  "All Feats",
  "Class/Racial Feats",
  "Combat Feats",
  "Defensive Feats",
  "Other Feats"
];
export const CREATURE_SPELL_LEVEL_FILTER_OPTIONS = [
  "All Levels",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9"
];
export const CREATURE_METAMAGIC_FILTER_OPTIONS = [
  "None",
  "Empower",
  "Extend",
  "Maximize",
  "Quicken",
  "Silent",
  "Still"
];
export const CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS = [
  "All Spells and Abilities",
  "Monster Abilities",
  "Spells"
];

export const CREATURE_DEFAULT_FEATS: Array<{
  name: string;
  type: string;
  assigned: boolean;
}> = [
  { name: "Alertness", type: "Class/Racial Feats", assigned: true },
  { name: "Weapon Proficiency (creature)", type: "Class/Racial Feats", assigned: true },
  { name: "Cleave", type: "Combat Feats", assigned: true },
  { name: "Dodge", type: "Defensive Feats", assigned: true },
  { name: "Darkvision", type: "Other Feats", assigned: true },
  { name: "Ambidexterity", type: "Combat Feats", assigned: false },
  { name: "Animal Companion", type: "Other Feats", assigned: false },
  { name: "Arcane Defense (Abjuration)", type: "Other Feats", assigned: false },
  { name: "Arcane Defense (Conjuration)", type: "Other Feats", assigned: false },
  { name: "Arcane Defense (Divination)", type: "Other Feats", assigned: false },
  { name: "Arcane Defense (Enchantment)", type: "Other Feats", assigned: false }
];

export const CREATURE_DEFAULT_SPELLS: Array<{
  prepared: boolean;
  name: string;
  spellLevel: number;
  castingLevel: number;
  metaMagic?: number;
  flags?: number;
}> = [
  { prepared: false, name: "Acid Fog", spellLevel: 6, castingLevel: 0 },
  { prepared: false, name: "Acid Splash", spellLevel: 0, castingLevel: 0 },
  { prepared: false, name: "Aid", spellLevel: 2, castingLevel: 0 },
  { prepared: false, name: "Amplify", spellLevel: 1, castingLevel: 0 },
  { prepared: false, name: "Animate Dead", spellLevel: 3, castingLevel: 0 }
];

export const CREATURE_DEFAULT_SPECIAL_ABILITIES: Array<{
  name: string;
  type: string;
  casterLevel: number;
  uses: number;
}> = [
  { name: "Acid Fog", type: "Spells", casterLevel: 0, uses: 0 },
  { name: "Aid", type: "Spells", casterLevel: 0, uses: 0 },
  { name: "Aura of Cold", type: "Monster Abilities", casterLevel: 0, uses: 0 },
  { name: "Aura of Fear", type: "Monster Abilities", casterLevel: 0, uses: 0 },
  { name: "Gaze, Fear", type: "Monster Abilities", casterLevel: 6, uses: 6 }
];

export const CREATURE_PROPERTIES_TAB_OPTIONS: ReadonlyArray<PropertyTabOption<CreaturePropertiesTab>> =
  [
    { id: "basic", label: "Basic" },
    { id: "statistics", label: "Statistics" },
    { id: "appearance", label: "Appearance" },
    { id: "classes", label: "Classes" },
    { id: "skills", label: "Skills" },
    { id: "scripts", label: "Scripts" },
    { id: "advanced", label: "Advanced" },
    { id: "feats", label: "Feats" },
    { id: "spells", label: "Spells" },
    { id: "specialAbilities", label: "Special Abilities" },
    { id: "inventory", label: "Inventory" },
    { id: "comments", label: "Comments" }
  ];

export const CREATURE_APPEARANCE_CORE_FIELDS: Array<{
  key: keyof CreaturePropertiesDraft["appearanceParts"];
  label: string;
}> = [
  { key: "head", label: "Head" },
  { key: "neck", label: "Neck" },
  { key: "torso", label: "Torso" },
  { key: "pelvis", label: "Pelvis" }
];

export const CREATURE_APPEARANCE_LIMB_PAIRS: Array<{
  rightKey: keyof CreaturePropertiesDraft["appearanceParts"];
  rightLabel: string;
  leftKey: keyof CreaturePropertiesDraft["appearanceParts"];
  leftLabel: string;
}> = [
  {
    rightKey: "rightBicep",
    rightLabel: "Right Bicep",
    leftKey: "leftBicep",
    leftLabel: "Left Bicep"
  },
  {
    rightKey: "rightForearm",
    rightLabel: "Right Forearm",
    leftKey: "leftForearm",
    leftLabel: "Left Forearm"
  },
  {
    rightKey: "rightHand",
    rightLabel: "Right Hand",
    leftKey: "leftHand",
    leftLabel: "Left Hand"
  },
  {
    rightKey: "rightThigh",
    rightLabel: "Right Thigh",
    leftKey: "leftThigh",
    leftLabel: "Left Thigh"
  },
  {
    rightKey: "rightShin",
    rightLabel: "Right Shin",
    leftKey: "leftShin",
    leftLabel: "Left Shin"
  },
  {
    rightKey: "rightFoot",
    rightLabel: "Right Foot",
    leftKey: "leftFoot",
    leftLabel: "Left Foot"
  }
];

export const CREATURE_APPEARANCE_EXTRA_PAIR = {
  rightKey: "wings",
  rightLabel: "Wings",
  leftKey: "tail",
  leftLabel: "Tail"
} as const;

export interface PlaceablePropertiesDraft {
  name: string;
  localizedNameEntries?: NonNullable<SceneObjectPlaceableProperties["localizedNameEntries"]>;
  tag: string;
  resRef: string;
  appearanceType?: number;
  isStatic: boolean;
  plot: boolean;
  useable: boolean;
  hasInventory: boolean;
  scriptSlotsEnabled: boolean;
  scriptSlots: Record<PlaceableScriptSlotKey, string>;
  disabledFlagsEnabled: boolean;
  disabledFlags: {
    plot: boolean;
    useable: boolean;
    hasInventory: boolean;
  };
  inventoryItems: SceneObjectPlaceableInventoryItemReference[];
  variables: NonNullable<SceneObjectPlaceableProperties["variables"]>;
  hardness: number;
  hitPoints: number;
  fortitudeSave: number;
  reflexSave: number;
  willSave: number;
  lockSettings: {
    locked: boolean;
    canRelock: boolean;
    autoRemoveKeyAfterUse: boolean;
    keyRequiredToUnlockOrLock: boolean;
    openLockDc: number;
    closeLockDc: number;
    keyTag: string;
  };
  trapSettings: {
    isTrapped: boolean;
    trapType: string;
    trapTypeRow?: number;
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
  };
  advancedSettings: {
    blueprintResRef: string;
    belongsToFaction: string;
    factionId?: number;
    conversation: string;
    noInterrupt: boolean;
    portraitResRef: string;
    portraitId?: number;
    initialState: string;
    treasureModel: string;
    treasureModelRow?: number;
  };
  description: string;
  descriptionEntries?: NonNullable<SceneObjectPlaceableProperties["descriptionEntries"]>;
  comments: string;
}

export interface PlaceablePropertiesDialogState {
  objectId: string;
  snapshotObject: SceneObject;
  draft: PlaceablePropertiesDraft;
  activeTab: PlaceablePropertiesTab;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

export interface ItemPropertiesDraft {
  name: string;
  tag: string;
  resRef: string;
  appearanceType?: number;
  localizedName: string;
  localizedNameEntries?: NonNullable<SceneObjectItemProperties["localizedNameEntries"]>;
  localizedNameStrRef?: number;
  description: string;
  descriptionEntries?: NonNullable<SceneObjectItemProperties["descriptionEntries"]>;
  descriptionStrRef?: number;
  identifiedDescription: string;
  identifiedDescriptionEntries?: NonNullable<
    SceneObjectItemProperties["identifiedDescriptionEntries"]
  >;
  identifiedDescriptionStrRef?: number;
  comments: string;
  paletteId?: number;
  baseItem?: number;
  modelPart1?: number;
  modelPart2?: number;
  modelPart3?: number;
  armorPreviewContext: {
    modelPrefix: string;
    label: string;
    gender: string;
    phenotype: string;
    raceModel: string;
  };
  cloakModelRow?: number;
  cloakModel?: number;
  cloakTexture?: number;
  cloakIcon?: number;
  cloakModelResRef: string;
  cloakTextureResRef: string;
  cloakIconResRef: string;
  armorParts: SceneObjectItemArmorParts;
  materialColors: SceneObjectItemMaterialColors;
  cost?: number;
  addCost?: number;
  costTable?: number;
  costValue?: number;
  charges?: number;
  stackSize?: number;
  identified: boolean;
  stolen: boolean;
  plot: boolean;
  cursed: boolean;
  propertyList: SceneObjectItemPropertyEntry[];
  inventoryItems: SceneObjectItemInventoryTargetEntry[];
  blueprintInventoryItems: SceneObjectItemBlueprintInventoryEntry[];
  blueprintEquippedItems: SceneObjectItemBlueprintEquipmentEntry[];
  variables: SceneObjectItemVariableTargetEntry[];
  scripts: Record<string, string>;
}

export interface ItemPropertiesDialogState {
  objectId: string;
  snapshotObject: SceneObject;
  draft: ItemPropertiesDraft;
  activeTab: ItemPropertiesTab;
  previewProcessingStatus?: "idle" | "processing" | "ready" | "error";
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

export interface SoundPropertiesDraft {
  name: string;
  tag: string;
  resRef: string;
  comments: string;
  soundList: string[];
  catalogSoundResRef: string;
  selectedSoundIndex: number;
  mode: SoundPositioningMode;
  elevation: number;
  maxVolumeDistance: number;
  cutoffDistance: number;
  randomRangeWestEast: number;
  randomRangeNorthSouth: number;
  active: boolean;
  whenToPlay: SoundWhenToPlay;
  dayNight: SoundDayNight;
  hoursStart: number;
  hoursEnd: number;
  playStyle: SoundPlayStyle;
  playOrder: SoundPlayOrder;
  timeWindow: string;
  hourMask: string;
  intervalMs: number;
  intervalVariationMs: number;
  volume: number;
  volumeVariation: number;
  pitchVariation: number;
  priority: number;
  backendSoundId: string;
  backendCategory: string;
  backendFormat: string;
  backendSpatialMode: string;
  backendPlaybackMode: string;
  flagsSummary: string;
  extraSummary: string;
}

export interface SoundPropertiesDialogState {
  objectId: string;
  snapshotObject: SceneObject;
  draft: SoundPropertiesDraft;
  activeTab: SoundPropertiesTab;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

export interface DoorPropertiesDraft {
  name: string;
  tag: string;
  resRef: string;
  appearanceType: string;
  genericAppearance: string;
  plot: boolean;
  hardness: number;
  hitPoints: number;
  fortitudeSave: number;
  reflexSave: number;
  willSave: number;
  lockSettings: {
    locked: boolean;
    canRelock: boolean;
    autoRemoveKeyAfterUse: boolean;
    keyRequiredToUnlockOrLock: boolean;
    openLockDc: number;
    closeLockDc: number;
    keyTag: string;
  };
  trapSettings: {
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
  };
  scriptSlots: Record<DoorScriptSlotKey, string>;
  advancedSettings: {
    blueprintResRef: string;
    belongsToFaction: string;
    conversation: string;
    noInterrupt: boolean;
    portraitResRef: string;
    initialState: string;
  };
  description: string;
  comments: string;
  destinationTag: string;
  destinationType: DoorTransitionDestinationType;
  linkedTarget: string;
  linkedModule: string;
  linkedWaypoint: string;
  loadScreen: string;
  transitionFlags: Record<string, boolean>;
  flagsSummary: string;
  transitionStorageEditable: boolean;
  linkedTo: string;
  linkedToFlags: number;
  loadScreenId: number;
}

export interface DoorPropertiesDialogState {
  objectId: string;
  snapshotObject: SceneObject;
  draft: DoorPropertiesDraft;
  activeTab: DoorPropertiesTab;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

export type CreatureScriptSlotKey =
  | "onBlocked"
  | "onCombatRoundEnd"
  | "onConversation"
  | "onDamaged"
  | "onDeath"
  | "onDisturbed"
  | "onHeartbeat"
  | "onPerception"
  | "onPhysicalAttacked"
  | "onRested"
  | "onSpawn"
  | "onSpellCastAt"
  | "onUserDefined";

export interface CreaturePropertiesDraft {
  tagControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  conversationControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  appearanceControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  genderControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  phenotypeControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  factionControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  templateResRefControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  subraceControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  deityControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  noInterruptControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  disarmableControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  plotControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  immortalControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  lootableControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  noPermanentDeathControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  bodyBagControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  decayTimeControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  firstNameControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  lastNameControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  descriptionControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  inventoryControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  equippedItemsControlState: "ACTIVE_NOW" | "PRESERVE_ONLY";
  firstName: string;
  firstNameEntries?: NonNullable<SceneObjectCreatureProperties["firstNameEntries"]>;
  lastName: string;
  lastNameEntries?: NonNullable<SceneObjectCreatureProperties["lastNameEntries"]>;
  tag: string;
  race: string;
  appearance: string;
  appearanceType?: number;
  phenotype: string;
  phenotypeId?: number;
  gender: string;
  genderId?: number;
  description: string;
  descriptionEntries?: NonNullable<SceneObjectCreatureProperties["descriptionEntries"]>;
  challengeRating: number;
  portraitResRef: string;
  portraitId?: number;
  conversation: string;
  noInterrupt: boolean;
  alignment: string;
  classEntries: Array<{ classId?: number; className: string; level: number }>;
  classIdentityDestructiveSpellClearConfirmed: boolean;
  classSlotResizeDestructiveRemovalConfirmed: boolean;
  classSpellClearSlotIndices: number[];
  classSpellClearConfirmed: boolean;
  classSpellRemovalTargets: NonNullable<
    SceneObjectCreatureProperties["classSpellRemovalTargets"]
  >;
  classSpellRemovalConfirmed: boolean;
  classSpellReorders: NonNullable<
    SceneObjectCreatureProperties["classSpellReorders"]
  >;
  classSpellReorderConfirmed: boolean;
  templateEntries: Array<{ templateId?: number }>;
  defaultPackage: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  strRacial: number;
  dexRacial: number;
  conRacial: number;
  intRacial: number;
  wisRacial: number;
  chaRacial: number;
  fortitudeBase: number;
  fortitudeBonus: number;
  reflexBase: number;
  reflexBonus: number;
  willBase: number;
  willBonus: number;
  naturalArmorClass: number;
  baseArmorClass: number;
  dexterityBonus: number;
  sizeModifier: number;
  baseHitPoints: number;
  hitPointBonuses: number;
  currentHitPoints: number;
  maxHitPoints: number;
  movementRate: string;
  appearancePartBased: boolean;
  appearanceParts: {
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
  };
  appearanceColors: {
    skin: string;
    hair: string;
    tattoo1: string;
    tattoo2: string;
  };
  appearanceSourceOnlyParts: {
    belt: string;
    robe: string;
    rightShoulder: string;
    leftShoulder: string;
  };
  skills: Array<{ skillId?: number; skill: string; rank: number }>;
  skillListTruncationConfirmed: boolean;
  scriptSlots: Record<CreatureScriptSlotKey, string>;
  advancedSettings: {
    blueprintResRef: string;
    paletteId?: number;
    disarmable: boolean;
    plot: boolean;
    playerCharacter: boolean;
    leavesLootableCorpse: boolean;
    noPermanentDeath: boolean;
    immortal: boolean;
    bodyBag: boolean;
    startingPackage: boolean;
    startingPackageId?: number;
    treasureModel: string;
    treasureModelRow?: number;
    corpseDecayTimeSeconds?: number;
    factionId?: number;
    faction: string;
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
  };
  feats: Array<{ featId?: number; name: string; type: string; assigned: boolean }>;
  spells: Array<{
    spellId?: number;
    classIndex?: number;
    prepared: boolean;
    name: string;
    spellLevel: number;
    castingLevel: number;
    metaMagic?: number;
    flags?: number;
  }>;
  specialAbilities: Array<{
    spellId?: number;
    flags?: number;
    name: string;
    type: string;
    casterLevel: number;
    uses: number;
  }>;
  variables: Array<
    | { name: string; type: "int"; value: number }
    | { name: string; type: "float"; value: number }
    | { name: string; type: "string"; value: string }
  >;
  inventoryItems: Array<{
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
  }>;
  equippedItems: Array<{
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
  }>;
  comments: string;
}

export interface CreaturePropertiesDialogState {
  objectId: string;
  snapshotObject: SceneObject;
  draft: CreaturePropertiesDraft;
  activeTab: CreaturePropertiesTab;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
  collapsed: boolean;
}

export const SOUND_PRESERVE_DEFAULTS = {
  timeWindow: "",
  hourMask: "",
  active: true,
  whenToPlay: "always" as SoundWhenToPlay,
  dayNight: "both" as SoundDayNight,
  hoursStart: 0,
  hoursEnd: 23,
  playStyle: "repeat" as SoundPlayStyle,
  playOrder: "sequential" as SoundPlayOrder,
  intervalMs: 6000,
  intervalVariationMs: 0,
  volume: 1,
  volumeVariation: 0,
  pitchVariation: 0,
  priority: 0
} as const;
export const SOUND_PRESERVE_EXTRA_COMMENTS_KEY = "auroraComments";
export const SOUND_PRESERVE_EXTRA_LIST_KEY = "auroraSoundList";
export const SOUND_HOUR_COUNT = 24;
export const SOUND_PREVIEW_TONE_ASSET_URL = "/sounds/preview_tone.wav";
export const SOUND_NOW_PLAYING_BADGE_LABEL = "PLAY";
export const SOUND_HOUR_LABELS = [
  "12",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11"
] as const;

export function clampSoundHourIndex(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(value), 0), SOUND_HOUR_COUNT - 1);
}

export function parseSoundHourMask(
  hourMask: string,
  fallbackStartHour: number,
  fallbackEndHour: number
): boolean[] {
  const trimmedMask = hourMask.trim();
  if (/^[01]{24}$/.test(trimmedMask)) {
    return trimmedMask.split("").map((entry) => entry === "1");
  }
  if (trimmedMask.length === 0) {
    return new Array<boolean>(SOUND_HOUR_COUNT).fill(false);
  }

  const flags = new Array<boolean>(SOUND_HOUR_COUNT).fill(false);
  const start = clampSoundHourIndex(fallbackStartHour);
  const end = clampSoundHourIndex(fallbackEndHour);
  if (start <= end) {
    for (let index = start; index <= end; index += 1) {
      flags[index] = true;
    }
  } else {
    for (let index = start; index < SOUND_HOUR_COUNT; index += 1) {
      flags[index] = true;
    }
    for (let index = 0; index <= end; index += 1) {
      flags[index] = true;
    }
  }
  return flags;
}

export function encodeSoundHourMask(flags: boolean[]): string {
  return Array.from({ length: SOUND_HOUR_COUNT }, (_, index) => (flags[index] ? "1" : "0")).join("");
}

export function resolveSoundHourBounds(flags: boolean[]): { start: number; end: number } {
  const activeIndexes = flags
    .map((isActive, index) => (isActive ? index : -1))
    .filter((index) => index >= 0);
  if (activeIndexes.length === 0) {
    return {
      start: SOUND_PRESERVE_DEFAULTS.hoursStart,
      end: SOUND_PRESERVE_DEFAULTS.hoursEnd
    };
  }
  return {
    start: activeIndexes[0],
    end: activeIndexes[activeIndexes.length - 1]
  };
}

export function formatSoundFixed(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(fractionDigits).replace(".", ",");
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(fractionDigits).replace(".", ",");
}

export function formatSoundSeconds(milliseconds: number, fractionDigits = 2): string {
  if (!Number.isFinite(milliseconds)) {
    return (0).toFixed(fractionDigits);
  }
  return formatSoundFixed(Math.max(milliseconds, 0) / 1000, fractionDigits);
}

export function parseSoundNumericInput(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = value.replace(",", ".").trim();
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function deriveMaxVolumeDistanceFromCutoff(cutoffDistance: number): number {
  if (!Number.isFinite(cutoffDistance)) {
    return 0;
  }
  return Math.max(0, cutoffDistance) / 10;
}

export function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJsonStringify(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized ?? "null";
}

function resolveSceneObjectName(object: SceneObject): string {
  if (object.name && object.name.trim().length > 0) {
    return object.name;
  }
  return object.resRef;
}

function cloneItemPropertyEntry(
  entry: SceneObjectItemPropertyEntry
): SceneObjectItemPropertyEntry {
  return { ...entry };
}

export function buildItemPropertiesDraft(source: SceneObject): ItemPropertiesDraft {
  const item = source.itemProperties;
  const armorPreviewContext = item?.armorPreviewContext;
  return {
    name: resolveSceneObjectName(source),
    tag: source.tag,
    resRef: source.resRef,
    localizedName: item?.localizedName ?? "",
    localizedNameEntries: item?.localizedNameEntries
      ? item.localizedNameEntries.map((entry) => ({ ...entry }))
      : undefined,
    localizedNameStrRef: item?.localizedNameStrRef,
    description: item?.description ?? "",
    descriptionEntries: item?.descriptionEntries
      ? item.descriptionEntries.map((entry) => ({ ...entry }))
      : undefined,
    descriptionStrRef: item?.descriptionStrRef,
    identifiedDescription: item?.identifiedDescription ?? "",
    identifiedDescriptionEntries: item?.identifiedDescriptionEntries
      ? item.identifiedDescriptionEntries.map((entry) => ({ ...entry }))
      : undefined,
    identifiedDescriptionStrRef: item?.identifiedDescriptionStrRef,
    comments: item?.comments ?? "",
    paletteId: item?.paletteId,
    baseItem: item?.baseItem,
    modelPart1: item?.modelPart1 ?? item?.modelParts?.[0],
    modelPart2: item?.modelPart2 ?? item?.modelParts?.[1],
    modelPart3: item?.modelPart3 ?? item?.modelParts?.[2],
    armorPreviewContext: {
      modelPrefix: armorPreviewContext?.modelPrefix ?? "",
      label: armorPreviewContext?.label ?? "",
      gender:
        armorPreviewContext?.gender !== undefined ? String(armorPreviewContext.gender) : "",
      phenotype:
        armorPreviewContext?.phenotype !== undefined ? String(armorPreviewContext.phenotype) : "",
      raceModel: armorPreviewContext?.raceModel ?? ""
    },
    cloakModelRow: item?.cloakModelRow,
    cloakModel: item?.cloakModel,
    cloakTexture: item?.cloakTexture,
    cloakIcon: item?.cloakIcon,
    cloakModelResRef: item?.cloakModelResRef ?? "",
    cloakTextureResRef: item?.cloakTextureResRef ?? "",
    cloakIconResRef: item?.cloakIconResRef ?? "",
    armorParts: item?.armorParts ? { ...item.armorParts } : {},
    materialColors: item?.materialColors ? { ...item.materialColors } : {},
    cost: item?.cost,
    addCost: item?.addCost,
    costTable: item?.costTable,
    costValue: item?.costValue,
    charges: item?.charges,
    stackSize: item?.stackSize,
    identified: item?.identified ?? false,
    stolen: item?.stolen ?? false,
    plot: item?.plot ?? false,
    cursed: item?.cursed ?? false,
    propertyList: item?.propertyList ? item.propertyList.map(cloneItemPropertyEntry) : [],
    inventoryItems: item?.inventoryItems ? item.inventoryItems.map((entry) => ({ ...entry })) : [],
    blueprintInventoryItems: item?.blueprintInventoryItems
      ? item.blueprintInventoryItems.map((entry) => ({ ...entry }))
      : [],
    blueprintEquippedItems: item?.blueprintEquippedItems
      ? item.blueprintEquippedItems.map((entry) => ({ ...entry }))
      : [],
    variables: item?.variables ? item.variables.map((entry) => ({ ...entry })) : [],
    scripts: item?.scripts ? { ...item.scripts } : {}
  };
}

export function buildEmptyPlaceableScriptSlots(): Record<PlaceableScriptSlotKey, string> {
  return {
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
}

export function buildPlaceableScriptSlotsDraft(source: SceneObject["placeableProperties"]): Record<PlaceableScriptSlotKey, string> {
  const draft = buildEmptyPlaceableScriptSlots();
  const sourceSlots = source?.scriptSlots;
  if (!sourceSlots) {
    return draft;
  }
  for (const key of PLACEABLE_SCRIPT_SLOT_KEYS) {
    draft[key] = sourceSlots[key] ?? "";
  }
  return draft;
}

export function arePlaceableScriptSlotsEqual(
  left: Record<PlaceableScriptSlotKey, string>,
  right: Record<PlaceableScriptSlotKey, string>
): boolean {
  return PLACEABLE_SCRIPT_SLOT_KEYS.every((key) => left[key] === right[key]);
}

export function arePlaceableDisabledFlagsEqual(
  left: PlaceablePropertiesDraft["disabledFlags"],
  right: PlaceablePropertiesDraft["disabledFlags"]
): boolean {
  return (
    left.plot === right.plot &&
    left.useable === right.useable &&
    left.hasInventory === right.hasInventory
  );
}

export function arePlaceableLockSettingsEqual(
  left: PlaceablePropertiesDraft["lockSettings"],
  right: PlaceablePropertiesDraft["lockSettings"]
): boolean {
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

export function arePlaceableTrapSettingsEqual(
  left: Partial<PlaceablePropertiesDraft["trapSettings"]>,
  right: Partial<PlaceablePropertiesDraft["trapSettings"]>
): boolean {
  return (
    left.isTrapped === right.isTrapped &&
    left.trapType === right.trapType &&
    left.trapTypeRow === right.trapTypeRow &&
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

export function arePlaceableAdvancedSettingsEqual(
  left: Partial<PlaceablePropertiesDraft["advancedSettings"]>,
  right: Partial<PlaceablePropertiesDraft["advancedSettings"]>
): boolean {
  return (
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

export function buildPlaceablePropertiesDraft(source: SceneObject): PlaceablePropertiesDraft {
  const placeableProperties = source.placeableProperties;
  const disabledFlags = placeableProperties?.disabledFlags;
  const lockSettings = placeableProperties?.lockSettings;
  const trapSettings = placeableProperties?.trapSettings;
  const advancedSettings = placeableProperties?.advancedSettings;
  return {
    name: placeableProperties?.localizedName ?? resolveSceneObjectName(source),
    ...(placeableProperties?.localizedNameEntries
      ? {
          localizedNameEntries: placeableProperties.localizedNameEntries.map(
            (entry) => ({ ...entry }),
          ),
        }
      : {}),
    tag: source.tag,
    resRef: source.resRef,
    appearanceType:
      placeableProperties?.appearanceType ??
      resolvePreservedPlaceableAppearanceDword(source.source),
    isStatic: source.isStatic ?? true,
    plot: placeableProperties?.plot ?? false,
    useable: placeableProperties?.useable ?? false,
    hasInventory: placeableProperties?.hasInventory ?? false,
    scriptSlotsEnabled: placeableProperties?.scriptSlots !== undefined,
    scriptSlots: buildPlaceableScriptSlotsDraft(placeableProperties),
    disabledFlagsEnabled: disabledFlags !== undefined,
    disabledFlags: {
      plot: disabledFlags?.plot ?? false,
      useable: disabledFlags?.useable ?? false,
      hasInventory: disabledFlags?.hasInventory ?? false
    },
    inventoryItems: placeableProperties?.inventoryItems
      ? placeableProperties.inventoryItems.map((entry) => ({
          ...entry,
          embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem)
        }))
      : [],
    variables: placeableProperties?.variables
      ? placeableProperties.variables.map((entry) => ({ ...entry }))
      : [],
    hardness: placeableProperties?.hardness ?? 5,
    hitPoints:
      placeableProperties?.hitPoints ??
      readExistingPlaceableHitPointState(source.source)?.hitPoints ??
      15,
    fortitudeSave: placeableProperties?.fortitudeSave ?? 16,
    reflexSave: placeableProperties?.reflexSave ?? 0,
    willSave: placeableProperties?.willSave ?? 0,
    lockSettings: {
      locked: lockSettings?.locked ?? false,
      canRelock: lockSettings?.canRelock ?? false,
      autoRemoveKeyAfterUse: lockSettings?.autoRemoveKeyAfterUse ?? false,
      keyRequiredToUnlockOrLock: lockSettings?.keyRequiredToUnlockOrLock ?? false,
      openLockDc: lockSettings?.openLockDc ?? 18,
      closeLockDc: lockSettings?.closeLockDc ?? 0,
      keyTag: lockSettings?.keyTag ?? ""
    },
    trapSettings: {
      isTrapped: trapSettings?.isTrapped ?? false,
      trapType: trapSettings?.trapType ?? PLACEABLE_TRAP_TYPE_OPTIONS[0]!,
      ...(trapSettings?.trapTypeRow !== undefined
        ? { trapTypeRow: trapSettings.trapTypeRow }
        : {}),
      detectionDc: trapSettings?.detectionDc ?? 0,
      disarmDc: trapSettings?.disarmDc ?? 15,
      oneShot: trapSettings?.oneShot ?? true,
      detectable: trapSettings?.detectable ?? true,
      disarmable: trapSettings?.disarmable ?? true,
      onDisarmScript: trapSettings?.onDisarmScript ?? "",
      onTrapTriggeredScript: trapSettings?.onTrapTriggeredScript ?? "",
      setDc: trapSettings?.setDc ?? 5,
      detectDcModWhenSetByRogue: trapSettings?.detectDcModWhenSetByRogue ?? 10,
      disarmDcModWhenSetByRogue: trapSettings?.disarmDcModWhenSetByRogue ?? 22
    },
    advancedSettings: {
      blueprintResRef: advancedSettings?.blueprintResRef ?? source.resRef,
      belongsToFaction: advancedSettings?.belongsToFaction ?? PLACEABLE_FACTION_OPTIONS[0]!,
      ...(advancedSettings?.factionId === undefined
        ? {}
        : { factionId: advancedSettings.factionId }),
      conversation: advancedSettings?.conversation ?? "",
      noInterrupt: advancedSettings?.noInterrupt ?? false,
      portraitResRef: advancedSettings?.portraitResRef ?? "",
      ...(advancedSettings?.portraitId === undefined
        ? {}
        : { portraitId: advancedSettings.portraitId }),
      initialState: advancedSettings?.initialState ?? PLACEABLE_INITIAL_STATE_OPTIONS[0]!,
      treasureModel: advancedSettings?.treasureModel ?? PLACEABLE_TREASURE_MODEL_OPTIONS[0]!,
      ...(advancedSettings?.treasureModelRow === undefined
        ? {}
        : { treasureModelRow: advancedSettings.treasureModelRow })
    },
    description: placeableProperties?.description ?? "",
    ...(placeableProperties?.descriptionEntries
      ? {
          descriptionEntries: placeableProperties.descriptionEntries.map(
            (entry) => ({ ...entry }),
          ),
        }
      : {}),
    comments: placeableProperties?.comments ?? ""
  };
}

export function buildSoundListFallback(resRef: string): string[] {
  const trimmedResRef = resRef.trim();
  if (trimmedResRef.length === 0) {
    return [];
  }
  return [trimmedResRef, `${trimmedResRef}1`, `${trimmedResRef}2`, `${trimmedResRef}3`];
}

export function resolveSelectedSoundPreviewKey(draft: SoundPropertiesDraft): string {
  const selectedEntry =
    draft.selectedSoundIndex >= 0 && draft.selectedSoundIndex < draft.soundList.length
      ? draft.soundList[draft.selectedSoundIndex]
      : "";
  const fallback = selectedEntry.trim().length > 0 ? selectedEntry : draft.resRef;
  return fallback.trim();
}

export function resolveSoundPreviewAssetUrl(previewKey: string): string | null {
  if (previewKey.trim().length === 0) {
    return null;
  }
  return SOUND_PREVIEW_TONE_ASSET_URL;
}

export function resolveRuntimeSoundNowPlayingLabel(soundKey: string): string {
  const normalized = soundKey.trim();
  if (normalized.length === 0) {
    return SOUND_NOW_PLAYING_BADGE_LABEL;
  }
  return `${SOUND_NOW_PLAYING_BADGE_LABEL} - ${normalized}`;
}

export function clampUnitInterval(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

export function resolveSoundPlaybackList(object: SceneObject): string[] {
  const listValue = object.soundPositioning?.preserve?.extra[SOUND_PRESERVE_EXTRA_LIST_KEY];
  const parsed =
    typeof listValue === "string"
      ? listValue
          .split(/\r?\n|[,;]+/)
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0)
      : [];
  return parsed.length > 0 ? parsed : buildSoundListFallback(object.resRef);
}

export function resolveEffectiveSoundPlayOrder(playOrder: SoundPlayOrder): SoundPlayOrder {
  return playOrder;
}

export function resolveNextRuntimeSoundDelayMs(intervalMs: number, intervalVariationMs: number): number {
  const base = Math.max(250, intervalMs);
  const variance = Math.max(0, intervalVariationMs);
  if (variance <= 0) {
    return base;
  }
  const randomOffset = (Math.random() * 2 - 1) * variance;
  return Math.max(250, base + randomOffset);
}

export function resolveDistanceAttenuation(
  mode: SoundPositioningMode,
  distance: number,
  maxDistance: number,
  cutoffDistance: number
): number {
  if (mode === "everywhere") {
    return 1;
  }
  if (distance <= maxDistance) {
    return 1;
  }
  if (distance >= cutoffDistance) {
    return 0;
  }
  if (cutoffDistance <= maxDistance) {
    return 0;
  }
  return 1 - (distance - maxDistance) / (cutoffDistance - maxDistance);
}

export function buildSoundPropertiesDraft(source: SceneObject): SoundPropertiesDraft {
  const positioning = normalizeSoundGuidePositioning(source.soundPositioning);
  const preserve = source.soundPositioning?.preserve;
  const commentsValue = preserve?.extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY];
  const exactProfile = readAreaSoundProfileStorage(source.soundProfile);
  const exactProfilePresentation = exactProfile
    ? areaSoundProfilePresentationFromStorage(exactProfile)
    : undefined;
  const normalizedCutoffDistance = exactProfilePresentation?.cutoffDistance
    ?? Math.max(0, positioning.cutoffDistance);
  const exactPlayback = readAreaSoundPlaybackStorage(source.soundPlayback);
  const exactPlaybackPresentation = exactPlayback
    ? areaSoundPlaybackPresentationFromStorage(exactPlayback)
    : undefined;
  const soundList = exactProfilePresentation
    ? [...exactProfilePresentation.sounds]
    : exactPlaybackPresentation
    ? [...exactPlaybackPresentation.sounds]
    : resolveSoundPlaybackList(source);
  const extra = preserve?.extra ?? {};
  const exactIntervalVariation = readAreaSoundIntervalVariationStorage(
    source.soundIntervalVariation,
  );
  const exactPresentation = exactIntervalVariation
    ? soundIntervalVariationPresentationFromStorage(exactIntervalVariation)
    : undefined;
  const exactVolume = readAreaSoundVolumeStorage(source.soundVolume);
  const exactVolumePresentation = exactVolume
    ? soundVolumePresentationFromStorage(exactVolume)
    : undefined;
  const exactSchedule = readAreaSoundScheduleStorage(source.soundSchedule);
  const exactSchedulePresentation = exactSchedule
    ? areaSoundSchedulePresentationFromStorage(exactSchedule)
    : undefined;
  const exactActive = readAreaSoundActiveStorage(source.soundActive);
  const exactActivePresentation = exactActive
    ? soundActivePresentationFromStorage(exactActive)
    : undefined;
  const exactPlayOrder = readAreaSoundPlayOrderStorage(source.soundPlayOrder);
  const exactPlayOrderPresentation = exactPlayOrder
    ? soundPlayOrderPresentationFromStorage(exactPlayOrder)
    : undefined;
  const exactPlayStyle = readAreaSoundPlayStyleStorage(source.soundPlayStyle);
  const exactPlayStylePresentation = exactPlayStyle
    ? areaSoundPlayStylePresentationFromStorage(exactPlayStyle)
    : undefined;
  const toReadonlyMetadataValue = (value: unknown): string =>
    typeof value === "string" || typeof value === "number" || typeof value === "boolean"
      ? String(value)
      : "";
  return {
    name: resolveSceneObjectName(source),
    tag: source.tag,
    resRef: source.resRef,
    comments: typeof commentsValue === "string" ? commentsValue : "",
    soundList,
    catalogSoundResRef: "",
    selectedSoundIndex: soundList.length > 0 ? 0 : -1,
    mode: exactProfilePresentation?.mode ?? positioning.mode,
    elevation: exactProfilePresentation?.elevation ?? positioning.elevation,
    maxVolumeDistance: exactProfilePresentation?.maxVolumeDistance
      ?? deriveMaxVolumeDistanceFromCutoff(normalizedCutoffDistance),
    cutoffDistance: normalizedCutoffDistance,
    randomRangeWestEast: exactProfilePresentation?.randomRangeWestEast
      ?? positioning.randomRangeWestEast,
    randomRangeNorthSouth: exactProfilePresentation?.randomRangeNorthSouth
      ?? positioning.randomRangeNorthSouth,
    active: exactActivePresentation?.active
      ?? preserve?.active
      ?? SOUND_PRESERVE_DEFAULTS.active,
    whenToPlay: exactSchedulePresentation?.whenToPlay
      ?? preserve?.whenToPlay
      ?? SOUND_PRESERVE_DEFAULTS.whenToPlay,
    dayNight: exactSchedulePresentation?.dayNight
      ?? preserve?.dayNight
      ?? SOUND_PRESERVE_DEFAULTS.dayNight,
    hoursStart: preserve?.hoursStart ?? SOUND_PRESERVE_DEFAULTS.hoursStart,
    hoursEnd: preserve?.hoursEnd ?? SOUND_PRESERVE_DEFAULTS.hoursEnd,
    playStyle: exactProfilePresentation?.playStyle
      ?? exactPlaybackPresentation?.playStyle
      ?? exactPlayStylePresentation?.playStyle
      ?? preserve?.playStyle
      ?? SOUND_PRESERVE_DEFAULTS.playStyle,
    playOrder: exactPlayOrderPresentation?.playOrder
      ?? preserve?.playOrder
      ?? SOUND_PRESERVE_DEFAULTS.playOrder,
    timeWindow: preserve?.timeWindow ?? SOUND_PRESERVE_DEFAULTS.timeWindow,
    hourMask: exactSchedulePresentation?.hourMask
      ?? preserve?.hourMask
      ?? SOUND_PRESERVE_DEFAULTS.hourMask,
    intervalMs: exactPresentation?.intervalMs
      ?? preserve?.intervalMs
      ?? SOUND_PRESERVE_DEFAULTS.intervalMs,
    intervalVariationMs:
      exactPresentation?.intervalVariationMs
      ?? preserve?.intervalVariationMs
      ?? SOUND_PRESERVE_DEFAULTS.intervalVariationMs,
    volume: exactVolumePresentation?.volume
      ?? preserve?.volume
      ?? SOUND_PRESERVE_DEFAULTS.volume,
    volumeVariation: exactPresentation?.volumeVariation
      ?? preserve?.volumeVariation
      ?? SOUND_PRESERVE_DEFAULTS.volumeVariation,
    pitchVariation: exactPresentation?.pitchVariation
      ?? preserve?.pitchVariation
      ?? SOUND_PRESERVE_DEFAULTS.pitchVariation,
    priority: preserve?.priority ?? SOUND_PRESERVE_DEFAULTS.priority,
    backendSoundId: toReadonlyMetadataValue(extra.backendSoundId),
    backendCategory: toReadonlyMetadataValue(extra.category),
    backendFormat: toReadonlyMetadataValue(extra.format),
    backendSpatialMode: toReadonlyMetadataValue(extra.spatialMode),
    backendPlaybackMode: toReadonlyMetadataValue(extra.playbackMode),
    flagsSummary:
      preserve && Object.keys(preserve.flags).length > 0
        ? stableJsonStringify(preserve.flags)
        : "none",
    extraSummary:
      preserve && Object.keys(preserve.extra).length > 0
        ? stableJsonStringify(preserve.extra)
        : "none"
  };
}

function formatDoorTransitionFlagsSummary(
  transition: SceneObject["doorTransition"]
): string {
  const entries = transition?.flags
    ? Object.entries(transition.flags).map(([key, value]) => `${key}=${value ? "1" : "0"}`)
    : [];
  const rawLinkedToFlags = transition?.storage?.linkedToFlags ?? transition?.extra?.linkedToFlags;

  if (typeof rawLinkedToFlags === "number" && Number.isFinite(rawLinkedToFlags)) {
    entries.push(`linkedToFlags=${Math.trunc(rawLinkedToFlags)}`);
  } else if (typeof rawLinkedToFlags === "string" && rawLinkedToFlags.trim().length > 0) {
    entries.push(`linkedToFlags=${rawLinkedToFlags.trim()}`);
  } else if (typeof rawLinkedToFlags === "boolean") {
    entries.push(`linkedToFlags=${rawLinkedToFlags ? "1" : "0"}`);
  }

  return entries.length > 0
    ? entries.sort((left, right) => left.localeCompare(right)).join(", ")
    : "none";
}

export function applySoundPropertiesDraftToScene(
  scene: AreaScene,
  objectId: string,
  draft: SoundPropertiesDraft
): AreaScene {
  const sourceObject = scene.objects.find((object) => object.id === objectId);
  if (!sourceObject || sourceObject.kind !== "sounds") {
    return scene;
  }

  const exactSourceProfile = readAreaSoundProfileStorage(
    sourceObject.source?.soundProfileStorage,
  );
  const exactCurrentProfile = readAreaSoundProfileStorage(sourceObject.soundProfile);
  const profileEditable = exactSourceProfile !== null && exactCurrentProfile !== null;
  const exactSourcePlayback = readAreaSoundPlaybackStorage(
    sourceObject.source?.soundPlaybackStorage,
  );
  const exactCurrentPlayback = readAreaSoundPlaybackStorage(sourceObject.soundPlayback);
  const playbackEditable = !profileEditable
    && exactSourcePlayback !== null
    && exactCurrentPlayback !== null;

  const normalizedSoundList = draft.soundList
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  const nextExactProfile = profileEditable
    ? areaSoundProfileStorageFromPresentation(exactCurrentProfile, {
        sounds: normalizedSoundList,
        playStyle: draft.playStyle,
        mode: draft.mode,
        elevation: draft.elevation,
        cutoffDistance: draft.cutoffDistance,
        maxVolumeDistance: draft.maxVolumeDistance,
        randomRangeWestEast: draft.mode === "random" ? draft.randomRangeWestEast : 0,
        randomRangeNorthSouth: draft.mode === "random" ? draft.randomRangeNorthSouth : 0,
      }) ?? cloneAreaSoundProfileStorage(exactCurrentProfile)
    : undefined;
  const nextExactProfilePresentation = nextExactProfile
    ? areaSoundProfilePresentationFromStorage(nextExactProfile)
    : undefined;

  const normalizedCutoffDistance = nextExactProfilePresentation?.cutoffDistance
    ?? Math.max(0, draft.cutoffDistance);
  const normalizedMaxVolumeDistance = nextExactProfilePresentation?.maxVolumeDistance
    ?? deriveMaxVolumeDistanceFromCutoff(normalizedCutoffDistance);
  const positioningMode = nextExactProfilePresentation?.mode ?? draft.mode;
  const normalizedSoundPositioning = normalizeSoundGuidePositioning({
    mode: positioningMode,
    elevation: nextExactProfilePresentation?.elevation ?? draft.elevation,
    maxVolumeDistance: normalizedMaxVolumeDistance,
    cutoffDistance: normalizedCutoffDistance,
    randomRangeWestEast: positioningMode === "random"
      ? nextExactProfilePresentation?.randomRangeWestEast ?? draft.randomRangeWestEast
      : 0,
    randomRangeNorthSouth: positioningMode === "random"
      ? nextExactProfilePresentation?.randomRangeNorthSouth ?? draft.randomRangeNorthSouth
      : 0
  });
  const nextSoundPositioning = nextExactProfilePresentation
    ? { ...normalizedSoundPositioning, elevation: nextExactProfilePresentation.elevation }
    : normalizedSoundPositioning;
  const sourcePreserve = sourceObject.soundPositioning?.preserve;
  const nextPreserveCore = {
    timeWindow: draft.timeWindow,
    hourMask: draft.hourMask,
    active: draft.active,
    whenToPlay: draft.whenToPlay,
    dayNight: draft.dayNight,
    hoursStart: draft.hoursStart,
    hoursEnd: draft.hoursEnd,
    playStyle: draft.playStyle,
    playOrder: draft.playOrder,
    intervalMs: draft.intervalMs,
    intervalVariationMs: draft.intervalVariationMs,
    volume: draft.volume,
    volumeVariation: draft.volumeVariation,
    pitchVariation: draft.pitchVariation,
    priority: draft.priority
  };
  const isPreserveDefault =
    nextPreserveCore.timeWindow === SOUND_PRESERVE_DEFAULTS.timeWindow &&
    nextPreserveCore.hourMask === SOUND_PRESERVE_DEFAULTS.hourMask &&
    nextPreserveCore.active === SOUND_PRESERVE_DEFAULTS.active &&
    nextPreserveCore.whenToPlay === SOUND_PRESERVE_DEFAULTS.whenToPlay &&
    nextPreserveCore.dayNight === SOUND_PRESERVE_DEFAULTS.dayNight &&
    nextPreserveCore.hoursStart === SOUND_PRESERVE_DEFAULTS.hoursStart &&
    nextPreserveCore.hoursEnd === SOUND_PRESERVE_DEFAULTS.hoursEnd &&
    nextPreserveCore.playStyle === SOUND_PRESERVE_DEFAULTS.playStyle &&
    nextPreserveCore.playOrder === SOUND_PRESERVE_DEFAULTS.playOrder &&
    nextPreserveCore.intervalMs === SOUND_PRESERVE_DEFAULTS.intervalMs &&
    nextPreserveCore.intervalVariationMs === SOUND_PRESERVE_DEFAULTS.intervalVariationMs &&
    nextPreserveCore.volume === SOUND_PRESERVE_DEFAULTS.volume &&
    nextPreserveCore.volumeVariation === SOUND_PRESERVE_DEFAULTS.volumeVariation &&
    nextPreserveCore.pitchVariation === SOUND_PRESERVE_DEFAULTS.pitchVariation &&
    nextPreserveCore.priority === SOUND_PRESERVE_DEFAULTS.priority;
  const sourceCommentsValue = sourcePreserve?.extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY];
  const sourceHasCommentsValue = typeof sourceCommentsValue === "string";
  const sourceListValue = sourcePreserve?.extra[SOUND_PRESERVE_EXTRA_LIST_KEY];
  const sourceHasListValue = typeof sourceListValue === "string";
  const nextCommentsValue = draft.comments.trim();
  const defaultSoundList = buildSoundListFallback(sourceObject.resRef);
  const shouldPersistSoundList = !profileEditable && !playbackEditable && (
    sourceHasListValue || normalizedSoundList.join("\n") !== defaultSoundList.join("\n")
  );
  const nextSoundListValue = profileEditable || playbackEditable
    ? (sourceHasListValue ? sourceListValue : "")
    : shouldPersistSoundList ? normalizedSoundList.join("\n") : "";
  const hasAuroraBasicPreserve =
    nextCommentsValue.length > 0 ||
    sourceHasCommentsValue ||
    nextSoundListValue.length > 0 ||
    sourceHasListValue;
  const nextPreserve =
    sourcePreserve || !isPreserveDefault || hasAuroraBasicPreserve
      ? {
          ...nextPreserveCore,
          flags: sourcePreserve?.flags ? { ...sourcePreserve.flags } : {},
          extra: (() => {
            const extra = sourcePreserve?.extra ? { ...sourcePreserve.extra } : {};
            if (nextCommentsValue.length > 0) {
              extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY] = nextCommentsValue;
            } else {
              delete extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY];
            }
            if (!profileEditable && !playbackEditable) {
              if (nextSoundListValue.length > 0) {
                extra[SOUND_PRESERVE_EXTRA_LIST_KEY] = nextSoundListValue;
              } else {
                delete extra[SOUND_PRESERVE_EXTRA_LIST_KEY];
              }
            }
            return extra;
          })()
        }
      : undefined;
  const exactSourceStorage = readAreaSoundIntervalVariationStorage(
    sourceObject.source?.soundIntervalVariationStorage,
  );
  const exactCurrentStorage = readAreaSoundIntervalVariationStorage(
    sourceObject.soundIntervalVariation,
  );
  const nextExactStorage = exactSourceStorage && exactCurrentStorage
    ? soundIntervalVariationStorageFromPresentation({
        intervalMs: draft.intervalMs,
        intervalVariationMs: draft.intervalVariationMs,
        pitchVariation: draft.pitchVariation,
        volumeVariation: draft.volumeVariation,
      }) ?? cloneAreaSoundIntervalVariationStorage(exactCurrentStorage)
    : undefined;
  const exactSourceVolume = readAreaSoundVolumeStorage(
    sourceObject.source?.soundVolumeStorage,
  );
  const exactCurrentVolume = readAreaSoundVolumeStorage(sourceObject.soundVolume);
  const nextExactVolume = exactSourceVolume && exactCurrentVolume
    ? soundVolumeStorageFromPresentation({ volume: draft.volume })
      ?? cloneAreaSoundVolumeStorage(exactCurrentVolume)
    : undefined;
  const exactSourceSchedule = readAreaSoundScheduleStorage(
    sourceObject.source?.soundScheduleStorage,
  );
  const exactCurrentSchedule = readAreaSoundScheduleStorage(sourceObject.soundSchedule);
  const nextExactSchedule = exactSourceSchedule && exactCurrentSchedule
    ? areaSoundScheduleStorageFromPresentation({
        whenToPlay: draft.whenToPlay,
        dayNight: draft.dayNight,
        hourMask: draft.hourMask,
      }) ?? cloneAreaSoundScheduleStorage(exactCurrentSchedule)
    : undefined;
  const exactSourceActive = readAreaSoundActiveStorage(
    sourceObject.source?.soundActiveStorage,
  );
  const exactCurrentActive = readAreaSoundActiveStorage(sourceObject.soundActive);
  const nextExactActive = exactSourceActive && exactCurrentActive
    ? soundActiveStorageFromPresentation({ active: draft.active })
      ?? cloneAreaSoundActiveStorage(exactCurrentActive)
    : undefined;
  const exactSourcePlayOrder = readAreaSoundPlayOrderStorage(
    sourceObject.source?.soundPlayOrderStorage,
  );
  const exactCurrentPlayOrder = readAreaSoundPlayOrderStorage(sourceObject.soundPlayOrder);
  const nextExactPlayOrder = exactSourcePlayOrder && exactCurrentPlayOrder
    ? soundPlayOrderStorageFromPresentation({ playOrder: draft.playOrder })
      ?? cloneAreaSoundPlayOrderStorage(exactCurrentPlayOrder)
    : undefined;
  const exactSourcePlayStyle = readAreaSoundPlayStyleStorage(
    sourceObject.source?.soundPlayStyleStorage,
  );
  const exactCurrentPlayStyle = readAreaSoundPlayStyleStorage(sourceObject.soundPlayStyle);
  const nextExactPlayback = !profileEditable && exactSourcePlayback && exactCurrentPlayback
    ? areaSoundPlaybackStorageFromPresentation(exactCurrentPlayback, {
        sounds: normalizedSoundList,
        playStyle: draft.playStyle,
      }) ?? cloneAreaSoundPlaybackStorage(exactCurrentPlayback)
    : undefined;
  const nextExactPlayStyle = !profileEditable
    && !nextExactPlayback
    && exactSourcePlayStyle
    && exactCurrentPlayStyle
    ? areaSoundPlayStyleStorageFromPresentation(exactCurrentPlayStyle, {
        playStyle: draft.playStyle,
      }) ?? cloneAreaSoundPlayStyleStorage(exactCurrentPlayStyle)
    : undefined;
  const nextObjects = scene.objects.map((object) =>
    object.id === objectId
      ? {
          ...object,
          name: draft.name,
          tag: draft.tag,
          resRef: draft.resRef,
          soundPositioning: {
            ...nextSoundPositioning,
            preserve: nextPreserve
          },
          ...(nextExactStorage
            ? { soundIntervalVariation: cloneAreaSoundIntervalVariationStorage(nextExactStorage) }
            : {}),
          ...(nextExactVolume
            ? { soundVolume: cloneAreaSoundVolumeStorage(nextExactVolume) }
            : {}),
          ...(nextExactSchedule
            ? { soundSchedule: cloneAreaSoundScheduleStorage(nextExactSchedule) }
            : {}),
          ...(nextExactActive
            ? { soundActive: cloneAreaSoundActiveStorage(nextExactActive) }
            : {}),
          ...(nextExactPlayOrder
            ? { soundPlayOrder: cloneAreaSoundPlayOrderStorage(nextExactPlayOrder) }
            : {}),
          ...(nextExactPlayStyle
            ? { soundPlayStyle: cloneAreaSoundPlayStyleStorage(nextExactPlayStyle) }
            : {}),
          ...(nextExactPlayback
            ? { soundPlayback: cloneAreaSoundPlaybackStorage(nextExactPlayback) }
            : {}),
          ...(nextExactProfile
            ? { soundProfile: cloneAreaSoundProfileStorage(nextExactProfile) }
            : {})
        }
      : object
  );
  const nextTarget = nextObjects.find((object) => object.id === objectId);
  if (
    nextTarget &&
    nextTarget.name === sourceObject.name &&
    nextTarget.tag === sourceObject.tag &&
    nextTarget.resRef === sourceObject.resRef &&
    nextTarget.soundPositioning?.mode === sourceObject.soundPositioning?.mode &&
    nextTarget.soundPositioning?.elevation === sourceObject.soundPositioning?.elevation &&
    nextTarget.soundPositioning?.maxVolumeDistance ===
      sourceObject.soundPositioning?.maxVolumeDistance &&
    nextTarget.soundPositioning?.cutoffDistance === sourceObject.soundPositioning?.cutoffDistance &&
    nextTarget.soundPositioning?.randomRangeWestEast ===
      sourceObject.soundPositioning?.randomRangeWestEast &&
    nextTarget.soundPositioning?.randomRangeNorthSouth ===
      sourceObject.soundPositioning?.randomRangeNorthSouth &&
    nextTarget.soundPositioning?.preserve?.timeWindow === sourcePreserve?.timeWindow &&
    nextTarget.soundPositioning?.preserve?.hourMask === sourcePreserve?.hourMask &&
    nextTarget.soundPositioning?.preserve?.active === sourcePreserve?.active &&
    nextTarget.soundPositioning?.preserve?.whenToPlay === sourcePreserve?.whenToPlay &&
    nextTarget.soundPositioning?.preserve?.dayNight === sourcePreserve?.dayNight &&
    nextTarget.soundPositioning?.preserve?.hoursStart === sourcePreserve?.hoursStart &&
    nextTarget.soundPositioning?.preserve?.hoursEnd === sourcePreserve?.hoursEnd &&
    nextTarget.soundPositioning?.preserve?.playStyle === sourcePreserve?.playStyle &&
    nextTarget.soundPositioning?.preserve?.playOrder === sourcePreserve?.playOrder &&
    nextTarget.soundPositioning?.preserve?.intervalMs === sourcePreserve?.intervalMs &&
    nextTarget.soundPositioning?.preserve?.intervalVariationMs ===
      sourcePreserve?.intervalVariationMs &&
    nextTarget.soundPositioning?.preserve?.volume === sourcePreserve?.volume &&
    nextTarget.soundPositioning?.preserve?.volumeVariation === sourcePreserve?.volumeVariation &&
    nextTarget.soundPositioning?.preserve?.pitchVariation === sourcePreserve?.pitchVariation &&
    nextTarget.soundPositioning?.preserve?.priority === sourcePreserve?.priority &&
    stableJsonStringify(nextTarget.soundPositioning?.preserve?.flags ?? {}) ===
      stableJsonStringify(sourcePreserve?.flags ?? {}) &&
    stableJsonStringify(nextTarget.soundPositioning?.preserve?.extra ?? {}) ===
      stableJsonStringify(sourcePreserve?.extra ?? {}) &&
    (
      (!nextTarget.soundIntervalVariation && !sourceObject.soundIntervalVariation)
      || areaSoundIntervalVariationStoragesEqual(
        nextTarget.soundIntervalVariation,
        sourceObject.soundIntervalVariation,
      )
    ) &&
    (
      (!nextTarget.soundVolume && !sourceObject.soundVolume)
      || areaSoundVolumeStoragesEqual(nextTarget.soundVolume, sourceObject.soundVolume)
    ) &&
    (
      (!nextTarget.soundSchedule && !sourceObject.soundSchedule)
      || areaSoundScheduleStoragesEqual(nextTarget.soundSchedule, sourceObject.soundSchedule)
    ) &&
    (
      (!nextTarget.soundActive && !sourceObject.soundActive)
      || areaSoundActiveStoragesEqual(nextTarget.soundActive, sourceObject.soundActive)
    ) &&
    (
      (!nextTarget.soundPlayOrder && !sourceObject.soundPlayOrder)
      || areaSoundPlayOrderStoragesEqual(
        nextTarget.soundPlayOrder,
        sourceObject.soundPlayOrder,
      )
    ) &&
    (
      (!nextTarget.soundPlayStyle && !sourceObject.soundPlayStyle)
      || areaSoundPlayStyleStoragesEqual(
        nextTarget.soundPlayStyle,
        sourceObject.soundPlayStyle,
      )
    ) &&
    (
      (!nextTarget.soundPlayback && !sourceObject.soundPlayback)
      || areaSoundPlaybackStoragesEqual(
        nextTarget.soundPlayback,
        sourceObject.soundPlayback,
      )
    ) &&
    (
      (!nextTarget.soundProfile && !sourceObject.soundProfile)
      || areaSoundProfileStoragesEqual(
        nextTarget.soundProfile,
        sourceObject.soundProfile,
      )
    )
  ) {
    return scene;
  }
  return {
    ...scene,
    objects: nextObjects
  };
}

export function buildDoorPropertiesDraft(source: SceneObject): DoorPropertiesDraft {
  const doorProperties = source.doorProperties;
  const lockSettings = doorProperties?.lockSettings;
  const trapSettings = doorProperties?.trapSettings;
  const advancedSettings = doorProperties?.advancedSettings;
  const scriptSlots = doorProperties?.scriptSlots;
  const transition = source.doorTransition;
  const destinationType: DoorTransitionDestinationType =
    transition?.linkedWaypoint && transition.linkedWaypoint.trim().length > 0
      ? "waypoint"
      : transition &&
          (transition.linkedTarget.trim().length > 0 ||
            transition.linkedTag.trim().length > 0 ||
            transition.linkedModule.trim().length > 0)
        ? "door"
        : "none";
  const transitionFlags = transition?.flags ? { ...transition.flags } : {};
  const flagsSummary = formatDoorTransitionFlagsSummary(transition);
  const sourceTransitionStorage = source.kind === "doors"
    ? readExistingDoorTransitionStorageProvenance(source.source)
    : undefined;
  const targetTransitionStorage = sourceTransitionStorage
    ? materializeExistingDoorTransitionStorage(source.source, transition?.storage) ??
      sourceTransitionStorage
    : undefined;

  return {
    name: resolveSceneObjectName(source),
    tag: source.tag,
    resRef: source.resRef,
    appearanceType: doorProperties?.appearanceType ?? DOOR_APPEARANCE_TYPE_OPTIONS[0]!,
    genericAppearance: doorProperties?.genericAppearance ?? DOOR_GENERIC_APPEARANCE_OPTIONS[0]!,
    plot: doorProperties?.plot ?? false,
    hardness: doorProperties?.hardness ?? 5,
    hitPoints: doorProperties?.hitPoints ?? 80,
    fortitudeSave: doorProperties?.fortitudeSave ?? 16,
    reflexSave: doorProperties?.reflexSave ?? 0,
    willSave: doorProperties?.willSave ?? 0,
    lockSettings: {
      locked: lockSettings?.locked ?? false,
      canRelock: lockSettings?.canRelock ?? false,
      autoRemoveKeyAfterUse: lockSettings?.autoRemoveKeyAfterUse ?? false,
      keyRequiredToUnlockOrLock: lockSettings?.keyRequiredToUnlockOrLock ?? false,
      openLockDc: lockSettings?.openLockDc ?? 18,
      closeLockDc: lockSettings?.closeLockDc ?? 0,
      keyTag: lockSettings?.keyTag ?? ""
    },
    trapSettings: {
      isTrapped: trapSettings?.isTrapped ?? false,
      trapType: trapSettings?.trapType ?? PLACEABLE_TRAP_TYPE_OPTIONS[0]!,
      detectionDc: trapSettings?.detectionDc ?? 0,
      disarmDc: trapSettings?.disarmDc ?? 15,
      oneShot: trapSettings?.oneShot ?? true,
      detectable: trapSettings?.detectable ?? true,
      disarmable: trapSettings?.disarmable ?? true,
      onDisarmScript: trapSettings?.onDisarmScript ?? "",
      onTrapTriggeredScript: trapSettings?.onTrapTriggeredScript ?? "",
      setDc: trapSettings?.setDc ?? 5,
      detectDcModWhenSetByRogue: trapSettings?.detectDcModWhenSetByRogue ?? 10,
      disarmDcModWhenSetByRogue: trapSettings?.disarmDcModWhenSetByRogue ?? 22
    },
    scriptSlots: {
      onAreaTransitionClick: scriptSlots?.onAreaTransitionClick ?? "",
      onClose: scriptSlots?.onClose ?? "",
      onDamaged: scriptSlots?.onDamaged ?? "",
      onDeath: scriptSlots?.onDeath ?? "",
      onFailToOpen: scriptSlots?.onFailToOpen ?? "",
      onHeartbeat: scriptSlots?.onHeartbeat ?? "",
      onLock: scriptSlots?.onLock ?? "",
      onPhysicalAttacked: scriptSlots?.onPhysicalAttacked ?? "",
      onOpen: scriptSlots?.onOpen ?? "",
      onSpellCastAt: scriptSlots?.onSpellCastAt ?? "",
      onUnlock: scriptSlots?.onUnlock ?? "",
      onUserDefined: scriptSlots?.onUserDefined ?? ""
    },
    advancedSettings: {
      blueprintResRef: advancedSettings?.blueprintResRef ?? source.resRef,
      belongsToFaction: advancedSettings?.belongsToFaction ?? PLACEABLE_FACTION_OPTIONS[0]!,
      conversation: advancedSettings?.conversation ?? "",
      noInterrupt: advancedSettings?.noInterrupt ?? false,
      portraitResRef: advancedSettings?.portraitResRef ?? "",
      initialState: advancedSettings?.initialState ?? DOOR_INITIAL_STATE_OPTIONS[0]!
    },
    description: doorProperties?.description ?? "",
    comments: doorProperties?.comments ?? "",
    destinationTag: transition?.linkedTag ?? "",
    destinationType,
    linkedTarget: transition?.linkedTarget ?? "",
    linkedModule: transition?.linkedModule ?? "",
    linkedWaypoint: transition?.linkedWaypoint ?? "",
    loadScreen: transition?.loadScreen ?? "",
    transitionFlags,
    flagsSummary,
    transitionStorageEditable: sourceTransitionStorage !== undefined,
    linkedTo: targetTransitionStorage?.linkedTo ?? "",
    linkedToFlags: targetTransitionStorage?.linkedToFlags ?? 0,
    loadScreenId: targetTransitionStorage?.loadScreenId ?? 0,
  };
}

export function buildCreatureScriptSlotsDraft(
  source: SceneObject["creatureProperties"]
): Record<CreatureScriptSlotKey, string> {
  const slots = source?.scriptSlots;
  return {
    onBlocked: slots?.onBlocked ?? "",
    onCombatRoundEnd: slots?.onCombatRoundEnd ?? "",
    onConversation: slots?.onConversation ?? "",
    onDamaged: slots?.onDamaged ?? "",
    onDeath: slots?.onDeath ?? "",
    onDisturbed: slots?.onDisturbed ?? "",
    onHeartbeat: slots?.onHeartbeat ?? "",
    onPerception: slots?.onPerception ?? "",
    onPhysicalAttacked: slots?.onPhysicalAttacked ?? "",
    onRested: slots?.onRested ?? "",
    onSpawn: slots?.onSpawn ?? "",
    onSpellCastAt: slots?.onSpellCastAt ?? "",
    onUserDefined: slots?.onUserDefined ?? ""
  };
}

export function buildCreatureSkillsDraft(
  source: SceneObject["creatureProperties"]
): Array<{ skillId?: number; skill: string; rank: number }> {
  if (source?.skills?.some((entry) => entry.skillId !== undefined)) {
    return source.skills.map((entry) => ({ ...entry }));
  }
  const byName = new Map(
    (source?.skills ?? []).map((entry) => [entry.skill.toLowerCase(), entry.rank])
  );
  return CREATURE_SKILL_LABELS.map((skill) => ({
    skill,
    rank: byName.get(skill.toLowerCase()) ?? 0
  }));
}

export function buildCreatureClassEntriesDraft(
  source: SceneObject["creatureProperties"]
): Array<{ classId?: number; className: string; level: number }> {
  const sourceEntries = source?.classEntries ?? [{ className: source?.race ?? "Aberration", level: 1 }];
  const normalized = sourceEntries.map((entry) => ({
    ...(entry.classId !== undefined ? { classId: entry.classId } : {}),
    className: entry.className || "Class",
    level: Number.isFinite(entry.level) ? Math.max(1, Math.trunc(entry.level)) : 1
  }));
  return normalized.length > 0
    ? normalized.slice(0, 8)
    : [{ className: source?.race ?? "Aberration", level: 1 }];
}

export function buildCreaturePropertiesDraft(
  source: SceneObject,
  bodyBagCatalog?: ScenePlaceableBodyBagCatalog | null,
  factionCatalog?: ScenePlaceableFactionCatalog | null,
): CreaturePropertiesDraft {
  const creature = source.creatureProperties;
  const statistics = creature?.statistics;
  const abilityScores = statistics?.abilityScores;
  const racialModifiers = statistics?.racialModifiers;
  const saves = statistics?.saves;
  const appearanceSettings = creature?.appearanceSettings;
  const advanced = creature?.advancedSettings;
  const equipmentSource = source.source?.creatureEquippedItems;
  const equipmentEditable = canEditExistingCreatureEquipment(source.source) &&
    equipmentSource !== undefined &&
    readCreatureEquipmentTargetEntries(creature?.equippedItems, equipmentSource) !== undefined;
  return {
    tagControlState: canEditExistingCreatureTag(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    conversationControlState: canEditExistingCreatureConversation(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    appearanceControlState: canEditExistingCreatureAppearance(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    genderControlState: canEditExistingCreatureGender(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    phenotypeControlState: canEditExistingCreaturePhenotype(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    factionControlState: canEditExistingCreatureFaction(source.source, factionCatalog)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    templateResRefControlState: canEditExistingCreatureTemplateResRef(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    subraceControlState: canEditExistingCreatureSpecialIdentityString(source.source, "subrace")
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    deityControlState: canEditExistingCreatureSpecialIdentityString(source.source, "deity")
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    noInterruptControlState: canEditExistingCreatureInterruptable(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    disarmableControlState: canEditExistingCreatureAdvancedFlag(
      source.source,
      "disarmable",
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    plotControlState: canEditExistingCreatureAdvancedFlag(source.source, "plot")
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    immortalControlState: canEditExistingCreatureAdvancedFlag(source.source, "immortal")
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    lootableControlState: canEditExistingCreatureAdvancedFlag(source.source, "lootable")
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    noPermanentDeathControlState: canEditExistingCreatureAdvancedFlag(
      source.source,
      "noPermanentDeath",
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    bodyBagControlState: canEditExistingCreatureBodyBag(
      source.source,
      bodyBagCatalog,
      advanced?.leavesLootableCorpse === true,
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    decayTimeControlState: canEditExistingCreatureDecayTime(
      source.source,
      advanced?.leavesLootableCorpse === true,
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    firstNameControlState: canEditExistingCreatureNameLocalizedString(
      source.source,
      "firstName",
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    lastNameControlState: canEditExistingCreatureNameLocalizedString(
      source.source,
      "lastName",
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    descriptionControlState: canEditExistingCreatureNameLocalizedString(
      source.source,
      "description",
    )
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    inventoryControlState: canEditExistingCreatureInventory(source.source)
      ? "ACTIVE_NOW"
      : "PRESERVE_ONLY",
    equippedItemsControlState: equipmentEditable ? "ACTIVE_NOW" : "PRESERVE_ONLY",
    firstName: creature?.firstName ?? resolveSceneObjectName(source),
    firstNameEntries: creature?.firstNameEntries
      ? creature.firstNameEntries.map((entry) => ({ ...entry }))
      : undefined,
    lastName: creature?.lastName ?? "",
    lastNameEntries: creature?.lastNameEntries
      ? creature.lastNameEntries.map((entry) => ({ ...entry }))
      : undefined,
    tag: source.tag,
    race: creature?.race ?? CREATURE_RACE_OPTIONS[0]!,
    appearance: creature?.appearance ?? source.resRef,
    appearanceType: creature?.appearanceType,
    phenotype: creature?.phenotype ?? "",
    phenotypeId: creature?.phenotypeId,
    gender: creature?.gender ?? "",
    genderId: creature?.genderId,
    description: creature?.description ?? "",
    descriptionEntries: creature?.descriptionEntries
      ? creature.descriptionEntries.map((entry) => ({ ...entry }))
      : undefined,
    challengeRating: creature?.challengeRating ?? 1,
    portraitResRef: creature?.portraitResRef ?? "",
    portraitId: creature?.portraitId,
    conversation: creature?.conversation ?? "",
    noInterrupt: creature?.noInterrupt ?? false,
    alignment: creature?.alignment ?? "True Neutral",
    classEntries: buildCreatureClassEntriesDraft(creature),
    classIdentityDestructiveSpellClearConfirmed:
      creature?.classIdentityDestructiveSpellClearConfirmed ?? false,
    classSlotResizeDestructiveRemovalConfirmed:
      creature?.classSlotResizeDestructiveRemovalConfirmed ?? false,
    classSpellClearSlotIndices: creature?.classSpellClearSlotIndices
      ? [...creature.classSpellClearSlotIndices]
      : [],
    classSpellClearConfirmed: creature?.classSpellClearConfirmed ?? false,
    classSpellRemovalTargets: creature?.classSpellRemovalTargets
      ? creature.classSpellRemovalTargets.map((target) => ({ ...target }))
      : [],
    classSpellRemovalConfirmed: creature?.classSpellRemovalConfirmed ?? false,
    classSpellReorders: creature?.classSpellReorders
      ? creature.classSpellReorders.map((reorder) => ({
          ...reorder,
          entryOrder: [...reorder.entryOrder],
        }))
      : [],
    classSpellReorderConfirmed: creature?.classSpellReorderConfirmed ?? false,
    templateEntries: creature?.templateEntries
      ? creature.templateEntries.map((entry) => ({ ...entry }))
      : [],
    defaultPackage: "Default",
    strength: abilityScores?.strength ?? 10,
    dexterity: abilityScores?.dexterity ?? 10,
    constitution: abilityScores?.constitution ?? 10,
    intelligence: abilityScores?.intelligence ?? 10,
    wisdom: abilityScores?.wisdom ?? 10,
    charisma: abilityScores?.charisma ?? 10,
    strRacial: racialModifiers?.strength ?? 0,
    dexRacial: racialModifiers?.dexterity ?? 0,
    conRacial: racialModifiers?.constitution ?? 0,
    intRacial: racialModifiers?.intelligence ?? 0,
    wisRacial: racialModifiers?.wisdom ?? 0,
    chaRacial: racialModifiers?.charisma ?? 0,
    fortitudeBase: saves?.fortitudeBase ?? 0,
    fortitudeBonus: saves?.fortitudeBonus ?? 0,
    reflexBase: saves?.reflexBase ?? 0,
    reflexBonus: saves?.reflexBonus ?? 0,
    willBase: saves?.willBase ?? 0,
    willBonus: saves?.willBonus ?? 0,
    naturalArmorClass: statistics?.naturalArmorClass ?? 10,
    baseArmorClass: statistics?.baseArmorClass ?? 10,
    dexterityBonus: statistics?.dexterityBonus ?? 0,
    sizeModifier: statistics?.sizeModifier ?? 0,
    baseHitPoints: statistics?.baseHitPoints ?? 10,
    hitPointBonuses: statistics?.hitPointBonuses ?? 0,
    currentHitPoints:
      statistics?.currentHitPoints ??
      statistics?.maxHitPoints ??
      (statistics?.baseHitPoints ?? 10) + (statistics?.hitPointBonuses ?? 0),
    maxHitPoints:
      statistics?.maxHitPoints ??
      (statistics?.baseHitPoints ?? 10) + (statistics?.hitPointBonuses ?? 0),
    movementRate: statistics?.movementRate ?? CREATURE_MOVEMENT_RATE_OPTIONS[0]!,
    appearancePartBased: appearanceSettings?.partBasedAppearance ?? false,
    appearanceParts: {
      head: appearanceSettings?.head ?? "",
      neck: appearanceSettings?.neck ?? "",
      torso: appearanceSettings?.torso ?? "",
      pelvis: appearanceSettings?.pelvis ?? "",
      rightBicep: appearanceSettings?.rightBicep ?? "",
      leftBicep: appearanceSettings?.leftBicep ?? "",
      rightForearm: appearanceSettings?.rightForearm ?? "",
      leftForearm: appearanceSettings?.leftForearm ?? "",
      rightHand: appearanceSettings?.rightHand ?? "",
      leftHand: appearanceSettings?.leftHand ?? "",
      rightThigh: appearanceSettings?.rightThigh ?? "",
      leftThigh: appearanceSettings?.leftThigh ?? "",
      rightShin: appearanceSettings?.rightShin ?? "",
      leftShin: appearanceSettings?.leftShin ?? "",
      rightFoot: appearanceSettings?.rightFoot ?? "",
      leftFoot: appearanceSettings?.leftFoot ?? "",
      wings: appearanceSettings?.wings ?? "",
      tail: appearanceSettings?.tail ?? ""
    },
    appearanceColors: {
      skin: appearanceSettings?.colors?.skin ?? "",
      hair: appearanceSettings?.colors?.hair ?? "",
      tattoo1: appearanceSettings?.colors?.tattoo1 ?? "",
      tattoo2: appearanceSettings?.colors?.tattoo2 ?? ""
    },
    appearanceSourceOnlyParts: {
      belt: appearanceSettings?.sourceOnlyParts?.belt ?? "",
      robe: appearanceSettings?.sourceOnlyParts?.robe ?? "",
      rightShoulder: appearanceSettings?.sourceOnlyParts?.rightShoulder ?? "",
      leftShoulder: appearanceSettings?.sourceOnlyParts?.leftShoulder ?? ""
    },
    skills: buildCreatureSkillsDraft(creature),
    skillListTruncationConfirmed: creature?.skillListTruncationConfirmed ?? false,
    scriptSlots: buildCreatureScriptSlotsDraft(creature),
    advancedSettings: {
      blueprintResRef: advanced?.blueprintResRef ?? source.resRef,
      paletteId: advanced?.paletteId,
      disarmable: advanced?.disarmable ?? false,
      plot: advanced?.plot ?? false,
      playerCharacter: advanced?.playerCharacter ?? false,
      leavesLootableCorpse: advanced?.leavesLootableCorpse ?? false,
      noPermanentDeath: advanced?.noPermanentDeath ?? false,
      immortal: advanced?.immortal ?? false,
      bodyBag: advanced?.bodyBag ?? false,
      startingPackage: advanced?.startingPackage ?? false,
      ...(typeof advanced?.startingPackageId === "number"
        ? { startingPackageId: advanced.startingPackageId }
        : {}),
      treasureModel: advanced?.treasureModel ?? CREATURE_TREASURE_MODEL_OPTIONS[0]!,
      ...(advanced?.treasureModelRow === undefined
        ? {}
        : { treasureModelRow: advanced.treasureModelRow }),
      ...(advanced?.corpseDecayTimeSeconds === undefined
        ? {}
        : { corpseDecayTimeSeconds: advanced.corpseDecayTimeSeconds }),
      ...(advanced?.factionId === undefined
        ? {}
        : { factionId: advanced.factionId }),
      faction: advanced?.faction ?? CREATURE_FACTION_OPTIONS[0]!,
      subrace: advanced?.subrace ?? "",
      deity: advanced?.deity ?? "",
      challengeRatingAdjustment: advanced?.challengeRatingAdjustment ?? 0,
      soundSet: advanced?.soundSet ?? "",
      ...(typeof advanced?.soundSetFile === "number" ? { soundSetFile: advanced.soundSetFile } : {}),
      perceptionRange: advanced?.perceptionRange ?? CREATURE_PERCEPTION_RANGE_OPTIONS[0]!,
      ...(typeof advanced?.perceptionRangeId === "number"
        ? { perceptionRangeId: advanced.perceptionRangeId }
        : {}),
      ...(typeof advanced?.walkRateId === "number"
        ? { walkRateId: advanced.walkRateId }
        : {}),
      ...(typeof advanced?.walkRateSource2daRow === "number"
        ? { walkRateSource2daRow: advanced.walkRateSource2daRow }
        : {}),
      ...(advanced?.walkRateSource2daName ? { walkRateSource2daName: advanced.walkRateSource2daName } : {}),
      ...(typeof advanced?.walkRateSpeed2daRow === "number"
        ? { walkRateSpeed2daRow: advanced.walkRateSpeed2daRow }
        : {}),
      ...(advanced?.walkRateAppearance2daSourceKey
        ? { walkRateAppearance2daSourceKey: advanced.walkRateAppearance2daSourceKey }
        : {}),
      ...(advanced?.walkRateSpeed2daSourceKey
        ? { walkRateSpeed2daSourceKey: advanced.walkRateSpeed2daSourceKey }
        : {}),
      ...(typeof advanced?.animationState === "number"
        ? { animationState: advanced.animationState }
        : {}),
      ...(advanced?.animationName ? { animationName: advanced.animationName } : {})
    },
    feats: creature?.feats
      ? creature.feats.map((entry) => ({
          ...(entry.featId !== undefined ? { featId: entry.featId } : {}),
          name: entry.name,
          type: entry.type,
          assigned: entry.assigned
        }))
      : [],
    spells: creature?.spells
      ? creature.spells.map((entry) => ({
          ...(entry.spellId !== undefined ? { spellId: entry.spellId } : {}),
          ...(entry.classIndex !== undefined ? { classIndex: entry.classIndex } : {}),
          prepared: entry.prepared,
          name: entry.name,
          spellLevel: entry.spellLevel,
          castingLevel: entry.castingLevel,
          metaMagic: entry.metaMagic,
          flags: entry.flags
        }))
      : [],
    specialAbilities: creature?.specialAbilities
      ? creature.specialAbilities.map((entry) => ({
          ...(entry.spellId !== undefined ? { spellId: entry.spellId } : {}),
          ...(entry.flags !== undefined ? { flags: entry.flags } : {}),
          name: entry.name,
          type: entry.type,
          casterLevel: entry.casterLevel,
          uses: entry.uses
        }))
      : [],
    variables: creature?.variables ? creature.variables.map((entry) => ({ ...entry })) : [],
    inventoryItems: creature?.inventoryItems
      ? creature.inventoryItems.map((entry) => ({
          ...entry,
          ...(entry.embeddedItem
            ? { embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem) }
            : {})
        }))
      : [],
    equippedItems: creature?.equippedItems
      ? creature.equippedItems.map((entry) => ({
          ...entry,
          ...(entry.embeddedItem
            ? { embeddedItem: cloneEmbeddedItemSummary(entry.embeddedItem) }
            : {})
        }))
      : [],
    comments: creature?.comments ?? ""
  };
}

export function arePlaceablePropertiesDraftsEqual(
  left: PlaceablePropertiesDraft,
  right: PlaceablePropertiesDraft
): boolean {
  return (
    left.name === right.name &&
    stableJsonStringify(left.localizedNameEntries) ===
      stableJsonStringify(right.localizedNameEntries) &&
    left.tag === right.tag &&
    left.resRef === right.resRef &&
    left.appearanceType === right.appearanceType &&
    left.isStatic === right.isStatic &&
    left.plot === right.plot &&
    left.useable === right.useable &&
    left.hasInventory === right.hasInventory &&
    left.scriptSlotsEnabled === right.scriptSlotsEnabled &&
    arePlaceableScriptSlotsEqual(left.scriptSlots, right.scriptSlots) &&
    left.disabledFlagsEnabled === right.disabledFlagsEnabled &&
    arePlaceableDisabledFlagsEqual(left.disabledFlags, right.disabledFlags) &&
    stableJsonStringify(left.inventoryItems) === stableJsonStringify(right.inventoryItems) &&
    stableJsonStringify(left.variables) === stableJsonStringify(right.variables) &&
    left.hardness === right.hardness &&
    left.hitPoints === right.hitPoints &&
    left.fortitudeSave === right.fortitudeSave &&
    left.reflexSave === right.reflexSave &&
    left.willSave === right.willSave &&
    arePlaceableLockSettingsEqual(left.lockSettings, right.lockSettings) &&
    arePlaceableTrapSettingsEqual(left.trapSettings, right.trapSettings) &&
    arePlaceableAdvancedSettingsEqual(left.advancedSettings, right.advancedSettings) &&
    left.description === right.description &&
    stableJsonStringify(left.descriptionEntries) ===
      stableJsonStringify(right.descriptionEntries) &&
    left.comments === right.comments
  );
}

export function areItemPropertiesDraftsEqual(
  left: ItemPropertiesDraft,
  right: ItemPropertiesDraft
): boolean {
  return stableJsonStringify(left) === stableJsonStringify(right);
}

export function areSoundPropertiesDraftsEqual(
  left: SoundPropertiesDraft,
  right: SoundPropertiesDraft
): boolean {
  const leftSoundList = left.soundList.join("\n");
  const rightSoundList = right.soundList.join("\n");
  return (
    left.name === right.name &&
    left.tag === right.tag &&
    left.resRef === right.resRef &&
    left.comments === right.comments &&
    left.selectedSoundIndex === right.selectedSoundIndex &&
    left.catalogSoundResRef === right.catalogSoundResRef &&
    leftSoundList === rightSoundList &&
    left.mode === right.mode &&
    left.elevation === right.elevation &&
    left.maxVolumeDistance === right.maxVolumeDistance &&
    left.cutoffDistance === right.cutoffDistance &&
    left.randomRangeWestEast === right.randomRangeWestEast &&
    left.randomRangeNorthSouth === right.randomRangeNorthSouth &&
    left.active === right.active &&
    left.whenToPlay === right.whenToPlay &&
    left.dayNight === right.dayNight &&
    left.hoursStart === right.hoursStart &&
    left.hoursEnd === right.hoursEnd &&
    left.playStyle === right.playStyle &&
    left.playOrder === right.playOrder &&
    left.timeWindow === right.timeWindow &&
    left.hourMask === right.hourMask &&
    left.intervalMs === right.intervalMs &&
    left.intervalVariationMs === right.intervalVariationMs &&
    left.volume === right.volume &&
    left.volumeVariation === right.volumeVariation &&
    left.pitchVariation === right.pitchVariation &&
    left.priority === right.priority &&
    left.backendSoundId === right.backendSoundId &&
    left.backendCategory === right.backendCategory &&
    left.backendFormat === right.backendFormat &&
    left.backendSpatialMode === right.backendSpatialMode &&
    left.backendPlaybackMode === right.backendPlaybackMode &&
    left.flagsSummary === right.flagsSummary &&
    left.extraSummary === right.extraSummary
  );
}

export function areDoorPropertiesDraftsEqual(
  left: DoorPropertiesDraft,
  right: DoorPropertiesDraft
): boolean {
  return (
    left.name === right.name &&
    left.tag === right.tag &&
    left.resRef === right.resRef &&
    left.appearanceType === right.appearanceType &&
    left.genericAppearance === right.genericAppearance &&
    left.plot === right.plot &&
    left.hardness === right.hardness &&
    left.hitPoints === right.hitPoints &&
    left.fortitudeSave === right.fortitudeSave &&
    left.reflexSave === right.reflexSave &&
    left.willSave === right.willSave &&
    arePlaceableLockSettingsEqual(left.lockSettings, right.lockSettings) &&
    arePlaceableTrapSettingsEqual(left.trapSettings, right.trapSettings) &&
    stableJsonStringify(left.scriptSlots) === stableJsonStringify(right.scriptSlots) &&
    left.advancedSettings.blueprintResRef === right.advancedSettings.blueprintResRef &&
    left.advancedSettings.belongsToFaction === right.advancedSettings.belongsToFaction &&
    left.advancedSettings.conversation === right.advancedSettings.conversation &&
    left.advancedSettings.noInterrupt === right.advancedSettings.noInterrupt &&
    left.advancedSettings.portraitResRef === right.advancedSettings.portraitResRef &&
    left.advancedSettings.initialState === right.advancedSettings.initialState &&
    left.description === right.description &&
    left.comments === right.comments &&
    left.destinationTag === right.destinationTag &&
    left.destinationType === right.destinationType &&
    left.linkedTarget === right.linkedTarget &&
    left.linkedModule === right.linkedModule &&
    left.linkedWaypoint === right.linkedWaypoint &&
    left.loadScreen === right.loadScreen &&
    stableJsonStringify(left.transitionFlags) === stableJsonStringify(right.transitionFlags) &&
    left.flagsSummary === right.flagsSummary &&
    left.transitionStorageEditable === right.transitionStorageEditable &&
    left.linkedTo === right.linkedTo &&
    left.linkedToFlags === right.linkedToFlags &&
    left.loadScreenId === right.loadScreenId
  );
}

export function areCreaturePropertiesDraftsEqual(
  left: CreaturePropertiesDraft,
  right: CreaturePropertiesDraft
): boolean {
  return stableJsonStringify(left) === stableJsonStringify(right);
}

export function resolveAbilityScoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

