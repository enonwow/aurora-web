import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CSSProperties,
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import type {
  SelectionScope,
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../application/workspaceChromeFacade";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../contracts";
import { browserTelemetryFacade } from "../../telemetry/composition/browserTelemetrySingleton";
import type { TelemetryPayload } from "../../telemetry/domain/telemetryEvent";
import type { SceneViewportPort } from "../../scene/application/sceneViewportPort";
import type { ViewportFacade } from "../application/viewportFacade";
import { buildCanvasGridSegments, MASTER_CELLS_PER_TILE } from "../canvasGrid";
import type { WorkspaceOptionSettings } from "../application/layoutPreferencesFacade";
import { isContextMenuGesture, isCtrlPanGesture } from "../viewportPointerPolicy";
import { resolveTransformControlAxisVisibility } from "../transformControlAxisVisibility";
import { normalizeBearingDegrees } from "../../scene/domain/bearing";
import {
  BASE_AXES_HELPER_SIZE,
  resolveAxesHelperTransform
} from "../axesHelperFacade";
import {
  canUseVisualTransformGizmoForObject,
  resolveGizmoTranslationDeltas,
  isVisualTransformAppliedToObject,
  isVisualTransformEditableForObject,
  isVisualTransformGizmoMode,
  resolveGizmoColorPalette,
  resolveVisualTransformSelectionBlockedReason,
  resolveVtScaleFactorFromAnchor,
  type CanvasGizmoMode
} from "../visualTransformGizmoRules";
import {
  normalizeSoundGuidePositioning,
  resolveSoundGuideOverlayFlagsFromPositioning
} from "../soundGuideDomain";
import {
  createRuntimeSoundPlaybackState,
  reconcileRuntimeSoundPlaybackState,
  type RuntimeSoundPlaybackState as RuntimeSoundPlaybackStateModel
} from "../runtimeSoundPlaybackState";
import {
  getCurrentObjectAddDragPayload,
  OBJECT_ADD_DRAG_MIME,
  type ObjectAddDragPayload,
  setCurrentObjectAddDragPayload,
  tryParseObjectAddPayload
} from "./objectAddDragPayload";
import {
  SharedLockPropertySection,
  SharedTrapPropertySection
} from "./properties/LockTrapPropertySections";
import {
  SharedAdvancedSettingsSection,
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome,
  SharedLongTextPropertySection,
  SharedObjectPreviewPane,
  SharedPropertyTabsNav,
  SharedScriptSlotSection,
  type SharedPropertyTabOption
} from "./properties/SharedPropertyDialogSections";
import {
  DEFAULT_PROPERTY_DIALOG_DRAG_STATE,
  usePropertyDialogDrag,
  type PropertyDialogDragState
} from "./usePropertyDialogDrag";

type WorkspaceCanvasViewportFacade = Pick<
  ViewportFacade,
  "defaultMasterCellsPerTile" | "isContextMenuGesture" | "isCtrlPanGesture" | "buildGridSegments"
>;

type WorkspaceCanvasTelemetryTrack = (name: string, payload?: TelemetryPayload) => void;

const defaultViewportFacade: WorkspaceCanvasViewportFacade = {
  defaultMasterCellsPerTile: MASTER_CELLS_PER_TILE,
  isContextMenuGesture,
  isCtrlPanGesture,
  buildGridSegments(widthTiles, heightTiles, masterCellsPerTile) {
    return buildCanvasGridSegments(widthTiles, heightTiles, masterCellsPerTile);
  }
};

const defaultTrackTelemetryEvent: WorkspaceCanvasTelemetryTrack = (name, payload) => {
  browserTelemetryFacade.track(name, payload);
};

interface WorkspaceCanvasViewportProps {
  toolbarState: WorkspaceToolbarState;
  userId: string;
  sceneViewportPort: SceneViewportPort;
  viewportFacade?: WorkspaceCanvasViewportFacade;
  trackTelemetryEvent?: WorkspaceCanvasTelemetryTrack;
  commandSignal: WorkspaceCommandSignal | null;
  sidebarSelectSignal?: {
    revision: number;
    objectId: string;
    additive: boolean;
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  sidebarContextMenuSignal?: {
    revision: number;
    objectId: string;
    objectKind: SceneObjectKind;
    clientX: number;
    clientY: number;
  } | null;
  catalogScope?: {
    sourceType: string;
    allowedObjectIds: string[];
  } | null;
  workspaceOptions: WorkspaceOptionSettings;
  leftPanelWidthPx: number;
  rightPanelWidthPx: number;
  onSceneObjectsSnapshotChange?: (objects: SceneObject[]) => void;
  onSelectionSnapshotChange?: (selectedIds: string[]) => void;
  externalSceneSeed?: AreaScene | null;
}

interface SelectionBoxState {
  active: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface ContextMenuState {
  x: number;
  y: number;
  objectId: string;
  objectKind: SceneObjectKind;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

interface AnchoredDialogPositionState {
  objectId: string;
  windowX: number;
  windowY: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

interface AdjustLocationDraft {
  x: number;
  y: number;
  z: number;
  bearingDeg: number;
  scale: number;
  xRotationDeg: number;
  yRotationDeg: number;
  zRotationDeg: number;
  xTranslation: number;
  yTranslation: number;
  zTranslation: number;
}

interface AdjustLocationDialogState {
  objectIds: string[];
  snapshotObjects: SceneObject[];
  draft: AdjustLocationDraft;
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
  windowX: number;
  windowY: number;
  collapsed: boolean;
}

interface BearingDialDragState {
  active: boolean;
  pointerId: number | null;
}

type PlaceablePropertiesTab =
  | "basic"
  | "lock"
  | "trap"
  | "scripts"
  | "advanced"
  | "description"
  | "comments";

type SoundPropertiesTab = "basic" | "positioning" | "advanced";
type SoundPositioningMode = "everywhere" | "random" | "specific";
type SoundWhenToPlay = "always" | "dayNight" | "hours";
type SoundDayNight = "both" | "day" | "night";
type SoundPlayStyle = "once" | "repeat" | "loop";
type SoundPlayOrder = "sequential" | "random";
type DoorPropertiesTab =
  | "basic"
  | "lock"
  | "trap"
  | "scripts"
  | "advanced"
  | "description"
  | "comments"
  | "areaTransition";
type DoorTransitionDestinationType = "none" | "door" | "waypoint";
type CreaturePropertiesTab =
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
  | "comments";
type PlaceableScriptSlotKey =
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

type DoorScriptSlotKey =
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

const PLACEABLE_PROPERTIES_TAB_OPTIONS: ReadonlyArray<SharedPropertyTabOption<PlaceablePropertiesTab>> =
  [
    { id: "basic", label: "Basic" },
    { id: "lock", label: "Lock" },
    { id: "trap", label: "Trap" },
    { id: "scripts", label: "Scripts" },
    { id: "advanced", label: "Advanced" },
    { id: "description", label: "Description" },
    { id: "comments", label: "Comments" }
  ];

const DOOR_PROPERTIES_TAB_OPTIONS: ReadonlyArray<SharedPropertyTabOption<DoorPropertiesTab>> = [
  { id: "basic", label: "Basic" },
  { id: "lock", label: "Lock" },
  { id: "trap", label: "Trap" },
  { id: "areaTransition", label: "Area Transition" },
  { id: "scripts", label: "Scripts" },
  { id: "advanced", label: "Advanced" },
  { id: "description", label: "Description" },
  { id: "comments", label: "Comments" }
];

const SOUND_PROPERTIES_TAB_OPTIONS: ReadonlyArray<SharedPropertyTabOption<SoundPropertiesTab>> = [
  { id: "basic", label: "Basic" },
  { id: "positioning", label: "Positioning" },
  { id: "advanced", label: "Advanced" }
];

const PLACEABLE_SCRIPT_SLOT_KEYS: PlaceableScriptSlotKey[] = [
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

const DOOR_SCRIPT_SLOT_KEYS: DoorScriptSlotKey[] = [
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

const PLACEABLE_SCRIPT_SLOT_LABELS: Record<PlaceableScriptSlotKey, string> = {
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

const DOOR_SCRIPT_SLOT_LABELS: Record<DoorScriptSlotKey, string> = {
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

const CREATURE_SCRIPT_SLOT_KEYS: CreatureScriptSlotKey[] = [
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

const CREATURE_SCRIPT_SLOT_LABELS: Record<CreatureScriptSlotKey, string> = {
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

const PLACEABLE_TRAP_TYPE_OPTIONS = [
  "Spike Trap, Minor",
  "Spike Trap, Average",
  "Spike Trap, Deadly",
  "Acid Splash, Minor",
  "Fire Trap, Minor",
  "Electrical Trap, Minor",
  "Holy Trap, Minor"
];

const PLACEABLE_FACTION_OPTIONS = ["Hostile", "Commoner", "Defender", "Merchant", "Neutral"];
const PLACEABLE_INITIAL_STATE_OPTIONS = ["Default", "Open", "Closed", "Destroyed"];
const PLACEABLE_TREASURE_MODEL_OPTIONS = ["Default", "None", "Container", "Random"];
const DOOR_APPEARANCE_TYPE_OPTIONS = ["Use Generic Appearance", "Custom Appearance"];
const DOOR_GENERIC_APPEARANCE_OPTIONS = [
  "Wooden Door (Strong)",
  "Wooden Door (Weak)",
  "Stone Door",
  "Metal Door"
];
const DOOR_INITIAL_STATE_OPTIONS = ["Closed", "Open", "Destroyed"];
const CREATURE_RACE_OPTIONS = [
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
const CREATURE_GENDER_OPTIONS = ["None", "Male", "Female", "Both"];
const CREATURE_ALIGNMENT_OPTIONS = [
  "Lawful Good",
  "Neutral Good",
  "Chaotic Good",
  "Lawful Neutral",
  "True Neutral",
  "Chaotic Neutral",
  "Lawful Evil",
  "Neutral Evil",
  "Chaotic Evil"
];
const CREATURE_MOVEMENT_RATE_OPTIONS = [
  "Default",
  "Very Slow",
  "Slow",
  "Normal",
  "Fast",
  "Very Fast"
];
const CREATURE_FACTION_OPTIONS = ["Hostile", "Commoner", "Defender", "Merchant", "Neutral"];
const CREATURE_TREASURE_MODEL_OPTIONS = ["Default", "None", "Monster", "Random"];
const CREATURE_PERCEPTION_RANGE_OPTIONS = ["Default", "Near", "Medium", "Far", "Infinite"];
const CREATURE_FEAT_FILTER_OPTIONS = [
  "All Feats",
  "Class/Racial Feats",
  "Combat Feats",
  "Defensive Feats",
  "Other Feats"
];
const CREATURE_SPELL_LEVEL_FILTER_OPTIONS = [
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
const CREATURE_METAMAGIC_FILTER_OPTIONS = [
  "None",
  "Empower",
  "Extend",
  "Maximize",
  "Quicken",
  "Silent",
  "Still"
];
const CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS = [
  "All Spells and Abilities",
  "Monster Abilities",
  "Spells"
];

const CREATURE_DEFAULT_MOCK_FEATS: Array<{
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

const CREATURE_DEFAULT_MOCK_SPELLS: Array<{
  prepared: boolean;
  name: string;
  spellLevel: number;
  castingLevel: number;
}> = [
  { prepared: false, name: "Acid Fog", spellLevel: 6, castingLevel: 0 },
  { prepared: false, name: "Acid Splash", spellLevel: 0, castingLevel: 0 },
  { prepared: false, name: "Aid", spellLevel: 2, castingLevel: 0 },
  { prepared: false, name: "Amplify", spellLevel: 1, castingLevel: 0 },
  { prepared: false, name: "Animate Dead", spellLevel: 3, castingLevel: 0 }
];

const CREATURE_DEFAULT_MOCK_SPECIAL_ABILITIES: Array<{
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

const CREATURE_SKILL_LABELS = [
  "Animal Empathy",
  "Concentration",
  "Disable Trap",
  "Discipline",
  "Heal",
  "Hide",
  "Listen",
  "Lore",
  "Move Silently",
  "Open Lock",
  "Parry",
  "Perform",
  "Persuade",
  "Pick Pocket",
  "Search",
  "Set Trap",
  "Spellcraft",
  "Spot",
  "Taunt",
  "Use Magic Device",
  "Appraise",
  "Tumble",
  "Craft Trap",
  "Bluff",
  "Intimidate",
  "Craft Armor",
  "Craft Weapon",
  "Ride"
];

const CREATURE_PROPERTIES_TAB_OPTIONS: ReadonlyArray<SharedPropertyTabOption<CreaturePropertiesTab>> =
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
    { id: "comments", label: "Comments" }
  ];

const CREATURE_APPEARANCE_CORE_FIELDS: Array<{
  key: keyof CreaturePropertiesDraft["appearanceParts"];
  label: string;
}> = [
  { key: "head", label: "Head" },
  { key: "neck", label: "Neck" },
  { key: "torso", label: "Torso" },
  { key: "pelvis", label: "Pelvis" }
];

const CREATURE_APPEARANCE_LIMB_PAIRS: Array<{
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

const CREATURE_APPEARANCE_EXTRA_PAIR = {
  rightKey: "wings",
  rightLabel: "Wings",
  leftKey: "tail",
  leftLabel: "Tail"
} as const;

interface PlaceablePropertiesDraft {
  name: string;
  tag: string;
  resRef: string;
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
  advancedSettings: {
    blueprintResRef: string;
    belongsToFaction: string;
    conversation: string;
    noInterrupt: boolean;
    portraitResRef: string;
    initialState: string;
    treasureModel: string;
  };
  description: string;
  comments: string;
}

interface PlaceablePropertiesDialogState {
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

interface SoundPropertiesDraft {
  name: string;
  tag: string;
  resRef: string;
  comments: string;
  soundList: string[];
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
  flagsSummary: string;
  extraSummary: string;
}

interface SoundPropertiesDialogState {
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

interface DoorPropertiesDraft {
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
}

interface DoorPropertiesDialogState {
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

type CreatureScriptSlotKey =
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

interface CreaturePropertiesDraft {
  firstName: string;
  lastName: string;
  tag: string;
  race: string;
  appearance: string;
  phenotype: string;
  gender: string;
  description: string;
  challengeRating: number;
  portraitResRef: string;
  conversation: string;
  noInterrupt: boolean;
  alignment: string;
  classEntries: Array<{ className: string; level: number }>;
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
  skills: Array<{ skill: string; rank: number }>;
  scriptSlots: Record<CreatureScriptSlotKey, string>;
  advancedSettings: {
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
  };
  feats: Array<{ name: string; type: string; assigned: boolean }>;
  spells: Array<{ prepared: boolean; name: string; spellLevel: number; castingLevel: number }>;
  specialAbilities: Array<{ name: string; type: string; casterLevel: number; uses: number }>;
  comments: string;
}

interface CreaturePropertiesDialogState {
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

interface DragMoveState {
  active: boolean;
  lastWorld: { x: number; y: number } | null;
  objectIds: string[];
}

interface CanvasObjectAddPreviewState {
  payload: ObjectAddDragPayload;
  placementX: number;
  placementY: number;
  screenX: number;
  screenY: number;
}

interface ObjectAddPlacementCacheState {
  payloadKey: string;
  placementX: number;
  placementY: number;
  tileId: string | null;
  updatedAtUnixMs: number;
}

interface ObjectAddGhostState {
  payloadKey: string;
  mesh: THREE.Mesh;
  sceneScale: number;
}

interface ObjectAddDropFeedbackState {
  message: string;
  variant: "warning" | "success";
}

const ADJUST_LOCATION_DIALOG_MARGIN_PX = 12;
const CONTEXT_MENU_MARGIN_PX = 12;
const CONTEXT_MENU_FALLBACK_WIDTH_PX = 260;
const CONTEXT_MENU_FALLBACK_HEIGHT_PX = 320;
const CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX = 14;
const CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX = 12;
const CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX = 72;
const ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX = 520;
const ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX = 420;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 820;
const PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 540;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 840;
const CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 620;
const SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;
const DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX = 760;
const DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX = 520;

interface TransformGestureState {
  active: boolean;
  mode: "translate" | "rotate" | "scale" | null;
  applyVisualTransform: boolean;
  axis: string | null;
  objectIds: string[];
  startAnchorPosition: THREE.Vector3;
  startAnchorRotationY: number;
  startAnchorEuler: THREE.Euler;
  startAnchorQuaternion: THREE.Quaternion;
  startAnchorScale: THREE.Vector3;
  sourceObjects: SceneObject[];
  sourceMeshPositions: Map<string, THREE.Vector3>;
  sourceMeshRotations: Map<string, THREE.Euler>;
  sourceMeshScales: Map<string, THREE.Vector3>;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaBearingRad: number;
  deltaPitchRad: number;
  deltaYawRad: number;
  deltaRollRad: number;
  deltaScaleFactor: number;
}

function createIdleTransformGestureState(): TransformGestureState {
  return {
    active: false,
    mode: null,
    applyVisualTransform: false,
    axis: null,
    objectIds: [],
    startAnchorPosition: new THREE.Vector3(),
    startAnchorRotationY: 0,
    startAnchorEuler: new THREE.Euler(),
    startAnchorQuaternion: new THREE.Quaternion(),
    startAnchorScale: new THREE.Vector3(1, 1, 1),
    sourceObjects: [],
    sourceMeshPositions: new Map<string, THREE.Vector3>(),
    sourceMeshRotations: new Map<string, THREE.Euler>(),
    sourceMeshScales: new Map<string, THREE.Vector3>(),
    deltaX: 0,
    deltaY: 0,
    deltaZ: 0,
    deltaBearingRad: 0,
    deltaPitchRad: 0,
    deltaYawRad: 0,
    deltaRollRad: 0,
    deltaScaleFactor: 1
  };
}

interface RuntimeState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  transformControls: TransformControls;
  transformAnchor: THREE.Object3D;
  raycaster: THREE.Raycaster;
  groundPlane: THREE.Plane;
  container: HTMLDivElement;
  tileMesh: THREE.InstancedMesh | null;
  tileIdByInstance: string[];
  objectLayer: THREE.Group;
  objectMeshById: Map<string, THREE.Mesh>;
  boundsLayer: THREE.Group;
  boundsHelpers: THREE.BoxHelper[];
  chunkLayer: THREE.Group;
  gizmoLayer: THREE.Group;
  gridLayer: THREE.Group;
  tileOverlayLayer: THREE.Group;
  axesHelper: THREE.AxesHelper;
  frameId: number | null;
  resizeObserver: ResizeObserver | null;
}

interface PerfSnapshot {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

type RuntimeSoundPlaybackState = RuntimeSoundPlaybackStateModel;

interface RuntimeSoundLoopChannel {
  audio: HTMLAudioElement;
  sourceX: number;
  sourceY: number;
  sourceZ: number;
  label: string;
}

interface RuntimeSoundNowPlayingState {
  expiresAtUnixMs: number;
  label: string;
}

interface RuntimeSoundNowPlayingBadge {
  objectId: string;
  label: string;
}

interface CameraBookmark {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const MIN_ZOOM_DISTANCE = 1.2;
const MAX_ZOOM_DISTANCE = 220;
const WORLD_OBJECT_Y = 0.2;
const TILE_GEOMETRY_Y = 0;
const LIGHT_COLOR = 0xffffff;
const BACKGROUND_COLOR = 0x0c1420;
const ORBIT_MOUSE_DISABLED = -1 as unknown as THREE.MOUSE;
const OBJECT_KIND_BY_SCOPE: Partial<Record<SelectionScope, SceneObjectKind>> = {
  creatures: "creatures",
  doors: "doors",
  items: "items",
  placeables: "placeables",
  sounds: "sounds"
};

const TERRAIN_COLORS: Record<TerrainBrushKind, string> = {
  corridor: "#4f7fb7",
  doorway: "#5a8ec8",
  inn: "#7362b2",
  kitchen: "#6e8ea0",
  livingroom: "#6b82c4",
  shop: "#6f9b5d",
  wall: "#4a6685"
};

const OBJECT_COLORS: Record<SceneObjectKind, string> = {
  placeables: "#7fb3ff",
  creatures: "#ff9a7b",
  doors: "#ffd39c",
  items: "#b8ffb7",
  sounds: "#c8b4ff"
};

const OBJECT_LABELS: Record<SceneObjectKind, string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  items: "ITM",
  sounds: "SND"
};

const MOVE_ALLOWED_KINDS = new Set<SceneObjectKind>([
  "placeables",
  "creatures",
  "items",
  "sounds"
]);

type DebugState = WorkspaceToolbarState["canvasDebug"];
type MockRenderStatus = "ok" | "warning" | "error" | "non_render";
const VT_PHYSICAL_ANCHOR_COLOR = "#45f7a2";

const STATUS_COLOR: Record<MockRenderStatus, string> = {
  ok: "#4de083",
  warning: "#ffb347",
  error: "#ff5e73",
  non_render: "#0d131e"
};

const CHUNK_SIZE = 4;
const DEGREES_PER_RADIAN = 180 / Math.PI;
const RADIANS_PER_DEGREE = Math.PI / 180;
const SOUND_MARKER_ICON = "\u266A";
const SOUND_SPECIFIC_ICON = "\u2B07";
const SOUND_RANDOM_RANGE_COLOR = "#dff0ff";
const SOUND_HEIGHT_COLOR = "#83c7ff";
const SOUND_DOME_COLOR = "#9fd5ff";
const SOUND_EVERYWHERE_RING_COLOR = "#ff6d7f";
const SOUND_PRESERVE_DEFAULTS = {
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
const SOUND_PRESERVE_EXTRA_COMMENTS_KEY = "auroraComments";
const SOUND_PRESERVE_EXTRA_LIST_KEY = "auroraSoundList";
const SOUND_HOUR_COUNT = 24;
const TILE_OVERLAY_GRID_COLOR = 0xff3f51;
const SOUND_TEST_PREVIEW_ASSET_URL = "/sounds/mock_test_tone.wav";
const SOUND_RUNTIME_TICK_MS = 200;
const SOUND_NOW_PLAYING_BADGE_TTL_MS = 1200;
const SOUND_NOW_PLAYING_BADGE_LABEL = "PLAY";
const SOUND_HOUR_LABELS = [
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
function clampSoundHourIndex(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(Math.trunc(value), 0), SOUND_HOUR_COUNT - 1);
}

function parseSoundHourMask(
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

function encodeSoundHourMask(flags: boolean[]): string {
  return Array.from({ length: SOUND_HOUR_COUNT }, (_, index) => (flags[index] ? "1" : "0")).join("");
}

function resolveSoundHourBounds(flags: boolean[]): { start: number; end: number } {
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

function formatSoundFixed(value: number, fractionDigits: number): string {
  if (!Number.isFinite(value)) {
    return (0).toFixed(fractionDigits).replace(".", ",");
  }
  const normalized = Object.is(value, -0) ? 0 : value;
  return normalized.toFixed(fractionDigits).replace(".", ",");
}

function formatSoundSeconds(milliseconds: number, fractionDigits = 2): string {
  if (!Number.isFinite(milliseconds)) {
    return (0).toFixed(fractionDigits);
  }
  return formatSoundFixed(Math.max(milliseconds, 0) / 1000, fractionDigits);
}

function parseSoundNumericInput(value: string | number): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  const normalized = value.trim().replace(",", ".");
  if (normalized.length === 0) {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function deriveMaxVolumeDistanceFromCutoff(cutoffDistance: number): number {
  if (!Number.isFinite(cutoffDistance)) {
    return 0;
  }
  return Math.max(0, cutoffDistance) / 10;
}

function stableJsonStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableJsonStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJsonStringify(entry)}`)
      .join(",")}}`;
  }
  const serialized = JSON.stringify(value);
  return serialized ?? "null";
}

function toDegrees(radians: number): number {
  return normalizeBearingDegrees(radians * DEGREES_PER_RADIAN);
}

function toRadians(degrees: number): number {
  return normalizeBearingDegrees(degrees) * RADIANS_PER_DEGREE;
}

function normalizeBearingDegreesForInput(value: number): number {
  const normalized = normalizeBearingDegrees(value);
  if (value > 0 && normalized === 0) {
    return 360;
  }
  return normalized;
}

function toAdjustLocationCoordinate(
  worldCoordinate: number,
  sceneSize: number,
  unitsPerTile: number
): number {
  const sceneMax = resolveSceneCoordinateMax(sceneSize);
  return Math.max(0, (sceneMax - worldCoordinate) * unitsPerTile);
}

function fromAdjustLocationCoordinate(
  adjustCoordinate: number,
  sceneSize: number,
  unitsPerTile: number
): number {
  const sceneMax = resolveSceneCoordinateMax(sceneSize);
  const nextWorld = sceneMax - adjustCoordinate / unitsPerTile;
  return Math.min(sceneMax, Math.max(SCENE_COORDINATE_MIN, nextWorld));
}

function toAdjustLocationHeight(worldHeight: number, unitsPerTile: number): number {
  return worldHeight * unitsPerTile;
}

function fromAdjustLocationHeight(adjustHeight: number, unitsPerTile: number): number {
  return adjustHeight / unitsPerTile;
}

function buildAdjustLocationDraft(
  source: SceneObject,
  unitsPerTile: number,
  sceneWidth: number,
  sceneHeight: number
): AdjustLocationDraft {
  const zInAdjustUnits = toAdjustLocationHeight(source.z, unitsPerTile);
  const zTranslationInAdjustUnits = toAdjustLocationHeight(
    source.visualTransform.offsetZ,
    unitsPerTile
  );
  return {
    x: toAdjustLocationCoordinate(source.x, sceneWidth, unitsPerTile),
    y: toAdjustLocationCoordinate(source.y, sceneHeight, unitsPerTile),
    z: zInAdjustUnits,
    bearingDeg: toDegrees(source.bearing),
    scale: source.visualTransform.scale,
    xRotationDeg: toDegrees(source.visualTransform.pitch),
    yRotationDeg: toDegrees(source.visualTransform.yaw),
    zRotationDeg: toDegrees(source.visualTransform.roll),
    xTranslation: source.visualTransform.offsetX,
    yTranslation: source.visualTransform.offsetY,
    zTranslation: zTranslationInAdjustUnits
  };
}

function areAdjustLocationDraftsEqual(left: AdjustLocationDraft, right: AdjustLocationDraft): boolean {
  return (
    left.x === right.x &&
    left.y === right.y &&
    left.z === right.z &&
    left.bearingDeg === right.bearingDeg &&
    left.scale === right.scale &&
    left.xRotationDeg === right.xRotationDeg &&
    left.yRotationDeg === right.yRotationDeg &&
    left.zRotationDeg === right.zRotationDeg &&
    left.xTranslation === right.xTranslation &&
    left.yTranslation === right.yTranslation &&
    left.zTranslation === right.zTranslation
  );
}

function areObjectPlacementsEqual(
  leftScene: AreaScene,
  rightScene: AreaScene,
  objectIds: string[],
  includeVisualTransforms: boolean
): boolean {
  return objectIds.every((id) => {
    const leftObject = leftScene.objects.find((object) => object.id === id);
    const rightObject = rightScene.objects.find((object) => object.id === id);
    if (!leftObject || !rightObject) {
      return false;
    }
    if (
      leftObject.x !== rightObject.x ||
      leftObject.y !== rightObject.y ||
      leftObject.z !== rightObject.z ||
      leftObject.bearing !== rightObject.bearing
    ) {
      return false;
    }
    if (!includeVisualTransforms) {
      return true;
    }
    return (
      leftObject.visualTransform.scale === rightObject.visualTransform.scale &&
      leftObject.visualTransform.offsetX === rightObject.visualTransform.offsetX &&
      leftObject.visualTransform.offsetY === rightObject.visualTransform.offsetY &&
      leftObject.visualTransform.offsetZ === rightObject.visualTransform.offsetZ &&
      leftObject.visualTransform.pitch === rightObject.visualTransform.pitch &&
      leftObject.visualTransform.yaw === rightObject.visualTransform.yaw &&
      leftObject.visualTransform.roll === rightObject.visualTransform.roll
    );
  });
}

function resolveSceneObjectName(object: SceneObject): string {
  if (typeof object.name === "string" && object.name.trim().length > 0) {
    return object.name;
  }
  return object.tag;
}

function applyTransformControlsPalette(
  transformControls: TransformControls,
  gizmoMode: CanvasGizmoMode
): void {
  if (typeof transformControls.setColors !== "function") {
    return;
  }

  const palette = resolveGizmoColorPalette(gizmoMode);
  transformControls.setColors(palette.x, palette.y, palette.z, palette.active);
}

function resolveGizmoModeBadge(mode: CanvasGizmoMode): {
  label: string;
  variant: "world" | "vt";
} {
  if (mode === "translate") {
    return { label: "World Move (1)", variant: "world" };
  }
  if (mode === "rotate") {
    return { label: "World Bearing (2)", variant: "world" };
  }
  if (mode === "vt_rotate") {
    return { label: "VT Rotate (3)", variant: "vt" };
  }
  if (mode === "vt_translate") {
    return { label: "VT Offset (4)", variant: "vt" };
  }
  if (mode === "vt_scale") {
    return { label: "VT Scale (5)", variant: "vt" };
  }
  return { label: `Mode: ${mode}`, variant: "world" };
}

function resolveTransformControlsMode(
  gizmoMode: CanvasGizmoMode
): "translate" | "rotate" | "scale" | null {
  if (gizmoMode === "translate") {
    return "translate";
  }
  if (gizmoMode === "rotate") {
    return "rotate";
  }
  if (gizmoMode === "vt_translate") {
    return "translate";
  }
  if (gizmoMode === "vt_rotate") {
    return "rotate";
  }
  if (gizmoMode === "vt_scale") {
    return "scale";
  }
  return null;
}

function resolveAdjustLocationVisualTransformMeta(targets: SceneObject[]): {
  showVisualTransforms: boolean;
  mixedStaticPlaceables: boolean;
} {
  const showVisualTransforms = targets.every((object) =>
    isVisualTransformEditableForObject(object)
  );
  if (!showVisualTransforms) {
    return {
      showVisualTransforms: false,
      mixedStaticPlaceables: false
    };
  }

  const placeables = targets.filter((object) => object.kind === "placeables");
  const hasStaticPlaceable = placeables.some((object) => object.isStatic ?? true);
  const hasNonStaticPlaceable = placeables.some((object) => !(object.isStatic ?? true));

  return {
    showVisualTransforms: true,
    mixedStaticPlaceables: hasStaticPlaceable && hasNonStaticPlaceable
  };
}

function buildEmptyPlaceableScriptSlots(): Record<PlaceableScriptSlotKey, string> {
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

function buildPlaceableScriptSlotsDraft(source: SceneObject["placeableProperties"]): Record<PlaceableScriptSlotKey, string> {
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

function arePlaceableScriptSlotsEqual(
  left: Record<PlaceableScriptSlotKey, string>,
  right: Record<PlaceableScriptSlotKey, string>
): boolean {
  return PLACEABLE_SCRIPT_SLOT_KEYS.every((key) => left[key] === right[key]);
}

function arePlaceableDisabledFlagsEqual(
  left: PlaceablePropertiesDraft["disabledFlags"],
  right: PlaceablePropertiesDraft["disabledFlags"]
): boolean {
  return (
    left.plot === right.plot &&
    left.useable === right.useable &&
    left.hasInventory === right.hasInventory
  );
}

function arePlaceableLockSettingsEqual(
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

function arePlaceableTrapSettingsEqual(
  left: PlaceablePropertiesDraft["trapSettings"],
  right: PlaceablePropertiesDraft["trapSettings"]
): boolean {
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
  left: PlaceablePropertiesDraft["advancedSettings"],
  right: PlaceablePropertiesDraft["advancedSettings"]
): boolean {
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

function buildPlaceablePropertiesDraft(source: SceneObject): PlaceablePropertiesDraft {
  const placeableProperties = source.placeableProperties;
  const disabledFlags = placeableProperties?.disabledFlags;
  const lockSettings = placeableProperties?.lockSettings;
  const trapSettings = placeableProperties?.trapSettings;
  const advancedSettings = placeableProperties?.advancedSettings;
  return {
    name: resolveSceneObjectName(source),
    tag: source.tag,
    resRef: source.resRef,
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
    hardness: 5,
    hitPoints: 15,
    fortitudeSave: 16,
    reflexSave: 0,
    willSave: 0,
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
    advancedSettings: {
      blueprintResRef: advancedSettings?.blueprintResRef ?? source.resRef,
      belongsToFaction: advancedSettings?.belongsToFaction ?? PLACEABLE_FACTION_OPTIONS[0]!,
      conversation: advancedSettings?.conversation ?? "",
      noInterrupt: advancedSettings?.noInterrupt ?? false,
      portraitResRef: advancedSettings?.portraitResRef ?? "",
      initialState: advancedSettings?.initialState ?? PLACEABLE_INITIAL_STATE_OPTIONS[0]!,
      treasureModel: advancedSettings?.treasureModel ?? PLACEABLE_TREASURE_MODEL_OPTIONS[0]!
    },
    description: placeableProperties?.description ?? "",
    comments: placeableProperties?.comments ?? ""
  };
}

function buildSoundListFallback(resRef: string): string[] {
  const trimmedResRef = resRef.trim();
  if (trimmedResRef.length === 0) {
    return [];
  }
  return [trimmedResRef, `${trimmedResRef}1`, `${trimmedResRef}2`, `${trimmedResRef}3`];
}

function resolveSelectedSoundPreviewKey(draft: SoundPropertiesDraft): string {
  const selectedEntry =
    draft.selectedSoundIndex >= 0 && draft.selectedSoundIndex < draft.soundList.length
      ? draft.soundList[draft.selectedSoundIndex]
      : "";
  const fallback = selectedEntry.trim().length > 0 ? selectedEntry : draft.resRef;
  return fallback.trim();
}

function resolveSoundPreviewAssetUrl(previewKey: string): string | null {
  if (previewKey.trim().length === 0) {
    return null;
  }
  return SOUND_TEST_PREVIEW_ASSET_URL;
}

function resolveRuntimeSoundNowPlayingLabel(soundKey: string): string {
  const normalized = soundKey.trim();
  if (normalized.length === 0) {
    return SOUND_NOW_PLAYING_BADGE_LABEL;
  }
  return `${SOUND_NOW_PLAYING_BADGE_LABEL} - ${normalized}`;
}

function clampUnitInterval(value: number): number {
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

function resolveSoundPlaybackList(object: SceneObject): string[] {
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

function resolveEffectiveSoundPlayOrder(playOrder: SoundPlayOrder): SoundPlayOrder {
  return playOrder;
}

function resolveNextRuntimeSoundDelayMs(intervalMs: number, intervalVariationMs: number): number {
  const base = Math.max(250, intervalMs);
  const variance = Math.max(0, intervalVariationMs);
  if (variance <= 0) {
    return base;
  }
  const randomOffset = (Math.random() * 2 - 1) * variance;
  return Math.max(250, base + randomOffset);
}

function resolveDistanceAttenuation(
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

function buildSoundPropertiesDraft(source: SceneObject): SoundPropertiesDraft {
  const positioning = normalizeSoundGuidePositioning(source.soundPositioning);
  const normalizedCutoffDistance = Math.max(0, positioning.cutoffDistance);
  const preserve = source.soundPositioning?.preserve;
  const commentsValue = preserve?.extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY];
  const soundList = resolveSoundPlaybackList(source);
  return {
    name: resolveSceneObjectName(source),
    tag: source.tag,
    resRef: source.resRef,
    comments: typeof commentsValue === "string" ? commentsValue : "",
    soundList,
    selectedSoundIndex: soundList.length > 0 ? 0 : -1,
    mode: positioning.mode,
    elevation: positioning.elevation,
    maxVolumeDistance: deriveMaxVolumeDistanceFromCutoff(normalizedCutoffDistance),
    cutoffDistance: normalizedCutoffDistance,
    randomRangeWestEast: positioning.randomRangeWestEast,
    randomRangeNorthSouth: positioning.randomRangeNorthSouth,
    active: preserve?.active ?? SOUND_PRESERVE_DEFAULTS.active,
    whenToPlay: preserve?.whenToPlay ?? SOUND_PRESERVE_DEFAULTS.whenToPlay,
    dayNight: preserve?.dayNight ?? SOUND_PRESERVE_DEFAULTS.dayNight,
    hoursStart: preserve?.hoursStart ?? SOUND_PRESERVE_DEFAULTS.hoursStart,
    hoursEnd: preserve?.hoursEnd ?? SOUND_PRESERVE_DEFAULTS.hoursEnd,
    playStyle: preserve?.playStyle ?? SOUND_PRESERVE_DEFAULTS.playStyle,
    playOrder: preserve?.playOrder ?? SOUND_PRESERVE_DEFAULTS.playOrder,
    timeWindow: preserve?.timeWindow ?? SOUND_PRESERVE_DEFAULTS.timeWindow,
    hourMask: preserve?.hourMask ?? SOUND_PRESERVE_DEFAULTS.hourMask,
    intervalMs: preserve?.intervalMs ?? SOUND_PRESERVE_DEFAULTS.intervalMs,
    intervalVariationMs:
      preserve?.intervalVariationMs ?? SOUND_PRESERVE_DEFAULTS.intervalVariationMs,
    volume: preserve?.volume ?? SOUND_PRESERVE_DEFAULTS.volume,
    volumeVariation: preserve?.volumeVariation ?? SOUND_PRESERVE_DEFAULTS.volumeVariation,
    pitchVariation: preserve?.pitchVariation ?? SOUND_PRESERVE_DEFAULTS.pitchVariation,
    priority: preserve?.priority ?? SOUND_PRESERVE_DEFAULTS.priority,
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

function buildDoorPropertiesDraft(source: SceneObject): DoorPropertiesDraft {
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
  const flagsSummary =
    Object.keys(transitionFlags).length > 0
      ? Object.entries(transitionFlags)
          .map(([key, value]) => `${key}=${value ? "1" : "0"}`)
          .sort((left, right) => left.localeCompare(right))
          .join(", ")
      : "none";

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
    flagsSummary
  };
}

function buildCreatureScriptSlotsDraft(
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

function buildCreatureSkillsDraft(
  source: SceneObject["creatureProperties"]
): Array<{ skill: string; rank: number }> {
  const byName = new Map(
    (source?.skills ?? []).map((entry) => [entry.skill.toLowerCase(), entry.rank])
  );
  return CREATURE_SKILL_LABELS.map((skill) => ({
    skill,
    rank: byName.get(skill.toLowerCase()) ?? 0
  }));
}

function buildCreatureClassEntriesDraft(
  source: SceneObject["creatureProperties"]
): Array<{ className: string; level: number }> {
  const sourceEntries = source?.classEntries ?? [{ className: source?.race ?? "Aberration", level: 1 }];
  const normalized = sourceEntries.map((entry) => ({
    className: entry.className || "Class",
    level: Number.isFinite(entry.level) ? Math.max(1, Math.trunc(entry.level)) : 1
  }));
  while (normalized.length < 8) {
    normalized.push({
      className: "",
      level: 1
    });
  }
  return normalized.slice(0, 8);
}

function buildCreaturePropertiesDraft(source: SceneObject): CreaturePropertiesDraft {
  const creature = source.creatureProperties;
  const statistics = creature?.statistics;
  const abilityScores = statistics?.abilityScores;
  const racialModifiers = statistics?.racialModifiers;
  const saves = statistics?.saves;
  const appearanceSettings = creature?.appearanceSettings;
  const advanced = creature?.advancedSettings;
  return {
    firstName: creature?.firstName ?? resolveSceneObjectName(source),
    lastName: creature?.lastName ?? "",
    tag: source.tag,
    race: creature?.race ?? CREATURE_RACE_OPTIONS[0]!,
    appearance: creature?.appearance ?? source.resRef,
    phenotype: creature?.phenotype ?? "",
    gender: creature?.gender ?? CREATURE_GENDER_OPTIONS[0]!,
    description: creature?.description ?? "",
    challengeRating: creature?.challengeRating ?? 1,
    portraitResRef: creature?.portraitResRef ?? "",
    conversation: creature?.conversation ?? "",
    noInterrupt: creature?.noInterrupt ?? false,
    alignment: "Chaotic Evil",
    classEntries: buildCreatureClassEntriesDraft(creature),
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
    skills: buildCreatureSkillsDraft(creature),
    scriptSlots: buildCreatureScriptSlotsDraft(creature),
    advancedSettings: {
      blueprintResRef: advanced?.blueprintResRef ?? source.resRef,
      disarmable: advanced?.disarmable ?? false,
      plot: advanced?.plot ?? false,
      leavesLootableCorpse: advanced?.leavesLootableCorpse ?? false,
      noPermanentDeath: advanced?.noPermanentDeath ?? false,
      immortal: advanced?.immortal ?? false,
      treasureModel: advanced?.treasureModel ?? CREATURE_TREASURE_MODEL_OPTIONS[0]!,
      corpseDecayTimeSeconds: advanced?.corpseDecayTimeSeconds ?? 5,
      faction: advanced?.faction ?? CREATURE_FACTION_OPTIONS[0]!,
      subrace: advanced?.subrace ?? "",
      deity: advanced?.deity ?? "",
      challengeRatingAdjustment: advanced?.challengeRatingAdjustment ?? 0,
      soundSet: advanced?.soundSet ?? "",
      perceptionRange: advanced?.perceptionRange ?? CREATURE_PERCEPTION_RANGE_OPTIONS[0]!
    },
    feats: creature?.feats
      ? creature.feats.map((entry) => ({
          name: entry.name,
          type: entry.type,
          assigned: entry.assigned
        }))
      : [],
    spells: creature?.spells
      ? creature.spells.map((entry) => ({
          prepared: entry.prepared,
          name: entry.name,
          spellLevel: entry.spellLevel,
          castingLevel: entry.castingLevel
        }))
      : [],
    specialAbilities: creature?.specialAbilities
      ? creature.specialAbilities.map((entry) => ({
          name: entry.name,
          type: entry.type,
          casterLevel: entry.casterLevel,
          uses: entry.uses
        }))
      : [],
    comments: creature?.comments ?? ""
  };
}

function arePlaceablePropertiesDraftsEqual(
  left: PlaceablePropertiesDraft,
  right: PlaceablePropertiesDraft
): boolean {
  return (
    left.name === right.name &&
    left.tag === right.tag &&
    left.resRef === right.resRef &&
    left.isStatic === right.isStatic &&
    left.plot === right.plot &&
    left.useable === right.useable &&
    left.hasInventory === right.hasInventory &&
    left.scriptSlotsEnabled === right.scriptSlotsEnabled &&
    arePlaceableScriptSlotsEqual(left.scriptSlots, right.scriptSlots) &&
    left.disabledFlagsEnabled === right.disabledFlagsEnabled &&
    arePlaceableDisabledFlagsEqual(left.disabledFlags, right.disabledFlags) &&
    left.hardness === right.hardness &&
    left.hitPoints === right.hitPoints &&
    left.fortitudeSave === right.fortitudeSave &&
    left.reflexSave === right.reflexSave &&
    left.willSave === right.willSave &&
    arePlaceableLockSettingsEqual(left.lockSettings, right.lockSettings) &&
    arePlaceableTrapSettingsEqual(left.trapSettings, right.trapSettings) &&
    arePlaceableAdvancedSettingsEqual(left.advancedSettings, right.advancedSettings) &&
    left.description === right.description &&
    left.comments === right.comments
  );
}

function areSoundPropertiesDraftsEqual(
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
    left.flagsSummary === right.flagsSummary &&
    left.extraSummary === right.extraSummary
  );
}

function areDoorPropertiesDraftsEqual(
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
    left.flagsSummary === right.flagsSummary
  );
}

function areCreaturePropertiesDraftsEqual(
  left: CreaturePropertiesDraft,
  right: CreaturePropertiesDraft
): boolean {
  return stableJsonStringify(left) === stableJsonStringify(right);
}

function areNowPlayingBadgesEqual(
  left: readonly RuntimeSoundNowPlayingBadge[],
  right: readonly RuntimeSoundNowPlayingBadge[]
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let index = 0; index < left.length; index += 1) {
    if (
      left[index]?.objectId !== right[index]?.objectId ||
      left[index]?.label !== right[index]?.label
    ) {
      return false;
    }
  }
  return true;
}

function resolveAbilityScoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") {
    return true;
  }

  return target.isContentEditable;
}

function isObjectVisible(object: SceneObject, toolbarState: WorkspaceToolbarState): boolean {
  return Boolean(toolbarState.visibility[object.kind]);
}

function isObjectSelectableByScope(
  object: SceneObject,
  selectionScope: SelectionScope
): boolean {
  if (selectionScope === "all") {
    return true;
  }
  return OBJECT_KIND_BY_SCOPE[selectionScope] === object.kind;
}

function isObjectSelectableByCatalogScope(
  object: SceneObject,
  catalogScope: { sourceType: string; allowedObjectIds: string[] } | null | undefined,
  allowedIdsSet: Set<string>
): boolean {
  if (!catalogScope || catalogScope.sourceType === "all") {
    return true;
  }

  return allowedIdsSet.has(object.id);
}

function findTileAtWorld(scene: AreaScene, worldX: number, worldY: number): SceneTile | null {
  const col = Math.floor(worldX);
  const row = Math.floor(worldY);

  if (col < 0 || col >= scene.width || row < 0 || row >= scene.height) {
    return null;
  }

  return scene.tiles.find((tile) => tile.col === col && tile.row === row) ?? null;
}

function resolveMockRenderStatus(object: SceneObject): MockRenderStatus {
  if (!object.resRef.trim()) {
    return "error";
  }

  if (object.kind === "sounds") {
    return "non_render";
  }

  if (object.kind === "doors" && object.tag.endsWith("02")) {
    return "warning";
  }

  return "ok";
}

function usesStatusMapForKind(statusMap: DebugState["statusMap"], kind: SceneObjectKind): boolean {
  return statusMap === "all" || statusMap === kind;
}

function isKindLocked(debugState: DebugState, kind: SceneObjectKind): boolean {
  return debugState.lockedKinds[kind];
}

function isKindVisibleWithIsolation(debugState: DebugState, kind: SceneObjectKind): boolean {
  return debugState.isolateKind === "none" || debugState.isolateKind === kind;
}

function snapAngleRadians(value: number, stepDeg: number): number {
  const step = THREE.MathUtils.degToRad(Math.max(1, stepDeg));
  return Math.round(value / step) * step;
}

function snapHeightValue(value: number, step: number): number {
  const normalizedStep = Math.max(0.05, step);
  return Math.round(value / normalizedStep) * normalizedStep;
}

function snapGridValue(value: number, step: number): number {
  const normalizedStep = Math.max(0.1, step);
  return Math.round(value / normalizedStep) * normalizedStep;
}

const SCENE_COORDINATE_MIN = 0;
const SCENE_COORDINATE_EPSILON = 1e-4;
const OBJECT_ADD_PLACEMENT_CACHE_MAX_AGE_MS = 2000;

function resolveSceneCoordinateMax(size: number): number {
  if (!Number.isFinite(size)) {
    return SCENE_COORDINATE_MIN;
  }
  return Math.max(SCENE_COORDINATE_MIN, size - SCENE_COORDINATE_EPSILON);
}

function clampPlacementToSceneBounds(
  scene: AreaScene,
  placementX: number,
  placementY: number
): { x: number; y: number } {
  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  return {
    x: Math.min(maxX, Math.max(SCENE_COORDINATE_MIN, placementX)),
    y: Math.min(maxY, Math.max(SCENE_COORDINATE_MIN, placementY))
  };
}

function resolveObjectPlacementFromWorldPoint(
  scene: AreaScene,
  rawX: number,
  rawY: number,
  snapGrid: boolean,
  snapGridStep: number
): { x: number; y: number } {
  const snappedX = snapGrid ? snapGridValue(rawX, snapGridStep) : rawX;
  const snappedY = snapGrid ? snapGridValue(rawY, snapGridStep) : rawY;
  return clampPlacementToSceneBounds(scene, snappedX, snappedY);
}

function resolveObjectAddPayloadKey(payload: ObjectAddDragPayload): string {
  return `${payload.kind}::${payload.resRef.trim().toLowerCase()}::${payload.tag.trim().toLowerCase()}`;
}

export function resolveObjectAddDropPlacement(args: {
  payload: ObjectAddDragPayload;
  scene: AreaScene;
  preview:
    | { payload: ObjectAddDragPayload; placementX: number; placementY: number }
    | null
    | undefined;
  cachedPlacement:
    | {
        payloadKey: string;
        placementX: number;
        placementY: number;
        tileId: string | null;
        updatedAtUnixMs: number;
      }
    | null
    | undefined;
  dropPlacement: { x: number; y: number; tileId: string | null } | null;
  nowUnixMs: number;
}): { x: number; y: number; tileId: string | null } | null {
  const payloadKey = resolveObjectAddPayloadKey(args.payload);
  const previewPlacement =
    args.preview && resolveObjectAddPayloadKey(args.preview.payload) === payloadKey
      ? {
          x: args.preview.placementX,
          y: args.preview.placementY,
          tileId: findTileAtWorld(args.scene, args.preview.placementX, args.preview.placementY)?.id ?? null
        }
      : null;
  const cachedPlacement =
    args.cachedPlacement &&
    args.cachedPlacement.payloadKey === payloadKey &&
    args.nowUnixMs - args.cachedPlacement.updatedAtUnixMs <= OBJECT_ADD_PLACEMENT_CACHE_MAX_AGE_MS
      ? {
          x: args.cachedPlacement.placementX,
          y: args.cachedPlacement.placementY,
          tileId: args.cachedPlacement.tileId
        }
      : null;
  return previewPlacement ?? cachedPlacement ?? args.dropPlacement;
}

function clampDeltaToBounds(delta: number, minDelta: number, maxDelta: number): number {
  if (delta > 0) {
    if (maxDelta <= 0) {
      return 0;
    }
    return Math.min(delta, maxDelta);
  }
  if (delta < 0) {
    if (minDelta >= 0) {
      return 0;
    }
    return Math.max(delta, minDelta);
  }
  return 0;
}

function clampTranslationDeltaToSceneBounds(
  scene: AreaScene,
  objects: SceneObject[],
  delta: { x: number; y: number }
): { x: number; y: number } {
  if (objects.length === 0) {
    return { x: 0, y: 0 };
  }

  const maxX = resolveSceneCoordinateMax(scene.width);
  const maxY = resolveSceneCoordinateMax(scene.height);
  let minDeltaX = Number.NEGATIVE_INFINITY;
  let maxDeltaX = Number.POSITIVE_INFINITY;
  let minDeltaY = Number.NEGATIVE_INFINITY;
  let maxDeltaY = Number.POSITIVE_INFINITY;

  objects.forEach((object) => {
    minDeltaX = Math.max(minDeltaX, SCENE_COORDINATE_MIN - object.x);
    maxDeltaX = Math.min(maxDeltaX, maxX - object.x);
    minDeltaY = Math.max(minDeltaY, SCENE_COORDINATE_MIN - object.y);
    maxDeltaY = Math.min(maxDeltaY, maxY - object.y);
  });

  return {
    x: clampDeltaToBounds(delta.x, minDeltaX, maxDeltaX),
    y: clampDeltaToBounds(delta.y, minDeltaY, maxDeltaY)
  };
}

function clampHeightDeltaToSurface(objects: SceneObject[], deltaZ: number): number {
  if (objects.length === 0 || deltaZ >= 0) {
    return deltaZ;
  }

  const minDeltaZ = objects.reduce(
    (bound, object) => Math.max(bound, -object.z),
    Number.NEGATIVE_INFINITY
  );

  return clampDeltaToBounds(deltaZ, minDeltaZ, Number.POSITIVE_INFINITY);
}

interface TextSpriteOptions {
  fillColor?: string;
  strokeColor?: string;
  backgroundFill?: string;
  backgroundStroke?: string;
  autoWidth?: boolean;
  minWidthPx?: number;
  maxWidthPx?: number;
  horizontalPaddingPx?: number;
}

function createTextSprite(
  text: string,
  scaleFactor = 1,
  options: TextSpriteOptions = {}
): THREE.Sprite {
  const labelHeightPx = 96;
  const defaultLabelWidthPx = 256;
  const horizontalPaddingPx = options.horizontalPaddingPx ?? 24;
  const minWidthPx = options.minWidthPx ?? defaultLabelWidthPx;
  const maxWidthPx = options.maxWidthPx ?? 1400;
  const font = "700 30px Segoe UI";
  const canvas = document.createElement("canvas");
  let resolvedWidthPx = defaultLabelWidthPx;
  if (options.autoWidth) {
    const measureCanvas = document.createElement("canvas");
    const measureCtx = measureCanvas.getContext("2d");
    if (measureCtx) {
      measureCtx.font = font;
      const measuredTextWidth = Math.ceil(measureCtx.measureText(text).width);
      resolvedWidthPx = Math.min(
        Math.max(measuredTextWidth + horizontalPaddingPx * 2, minWidthPx),
        maxWidthPx
      );
    }
  }
  canvas.width = resolvedWidthPx;
  canvas.height = labelHeightPx;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = options.backgroundFill ?? "rgba(8, 20, 38, 0.92)";
    ctx.fillRect(0, 26, canvas.width, 44);
    ctx.strokeStyle = options.backgroundStroke ?? "rgba(95, 142, 194, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 28, canvas.width - 4, 40);
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (options.strokeColor) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = 2;
      ctx.strokeText(text, canvas.width / 2, canvas.height / 2);
    }
    ctx.fillStyle = options.fillColor ?? "#e6f1ff";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false
  });
  const sprite = new THREE.Sprite(material);
  const spriteHeight = 0.6 * scaleFactor;
  const spriteWidth = spriteHeight * (canvas.width / canvas.height);
  sprite.scale.set(spriteWidth, spriteHeight, 1);
  sprite.renderOrder = 1000;
  return sprite;
}

interface GlyphSpriteOptions {
  color: string;
  strokeColor?: string;
  fontSizePx?: number;
  weight?: number;
}

function createGlyphSprite(
  glyph: string,
  scaleFactor = 1,
  options: GlyphSpriteOptions
): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const fontSizePx = options.fontSizePx ?? 128;
    const weight = options.weight ?? 700;
    ctx.font = `${weight} ${fontSizePx}px "Segoe UI Symbol", "Segoe UI Emoji", "Segoe UI", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (options.strokeColor) {
      ctx.strokeStyle = options.strokeColor;
      ctx.lineWidth = Math.max(3, Math.round(fontSizePx * 0.07));
      ctx.strokeText(glyph, canvas.width / 2, canvas.height / 2);
    }
    ctx.fillStyle = options.color;
    ctx.fillText(glyph, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.64 * scaleFactor, 0.64 * scaleFactor, 1);
  sprite.renderOrder = 1002;
  return sprite;
}

function createDiceSprite(scaleFactor = 1): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 192;
  canvas.height = 192;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width * 0.5, canvas.height * 0.58);
    ctx.rotate(-0.26);

    const size = 70;
    const half = size / 2;
    ctx.fillStyle = "#f4f8ff";
    ctx.strokeStyle = "#0f1725";
    ctx.lineWidth = 6;
    ctx.fillRect(-half, -half, size, size);
    ctx.strokeRect(-half, -half, size, size);

    ctx.fillStyle = "#121c2d";
    const pipRadius = 4.6;
    const pipOffset = size * 0.24;
    const pips: ReadonlyArray<readonly [number, number]> = [
      [-pipOffset, -pipOffset],
      [pipOffset, -pipOffset],
      [0, 0],
      [-pipOffset, pipOffset],
      [pipOffset, pipOffset]
    ];
    pips.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, pipRadius, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(0.52 * scaleFactor, 0.52 * scaleFactor, 1);
  sprite.renderOrder = 1004;
  return sprite;
}

function createSoundModeMarkerGroup(
  mode: "everywhere" | "random" | "specific",
  markerScale: number
): THREE.Group {
  const marker = new THREE.Group();
  const noteSprite = createGlyphSprite(SOUND_MARKER_ICON, markerScale * 0.74, {
    color: "#0e1219",
    strokeColor: "#f2f8ff",
    fontSizePx: 126
  });
  noteSprite.position.set(0, markerScale * 0.42, 0);
  marker.add(noteSprite);

  if (mode === "random") {
    // Keep only the compact dice sprite to reduce visual noise.
    const diceSprite = createDiceSprite(markerScale * 0.86);
    diceSprite.position.set(markerScale * 0.05, markerScale * -0.27, markerScale * 0.06);
    marker.add(diceSprite);
  } else if (mode === "specific") {
    const arrowSprite = createGlyphSprite(SOUND_SPECIFIC_ICON, markerScale * 0.5, {
      color: "#ff3f55",
      strokeColor: "#0e1219",
      fontSizePx: 106
    });
    arrowSprite.position.set(0, markerScale * -0.08, 0);
    marker.add(arrowSprite);
  } else {
    const everywhereRing = new THREE.Mesh(
      new THREE.TorusGeometry(Math.max(0.08, markerScale * 0.22), Math.max(0.01, markerScale * 0.03), 8, 36),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(SOUND_EVERYWHERE_RING_COLOR),
        transparent: true,
        opacity: 0.92,
        depthWrite: false,
        depthTest: false
      })
    );
    everywhereRing.rotation.x = Math.PI / 2;
    everywhereRing.position.set(0, markerScale * -0.1, 0);
    everywhereRing.raycast = () => undefined;
    marker.add(everywhereRing);
  }

  marker.renderOrder = 1002;
  return marker;
}

function applyOrbitPointerBindings(
  controls: OrbitControls,
  options: { ctrlPanEnabled: boolean }
): void {
  controls.enablePan = true;
  controls.mouseButtons.LEFT = ORBIT_MOUSE_DISABLED;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
  controls.mouseButtons.RIGHT = options.ctrlPanEnabled ? THREE.MOUSE.PAN : ORBIT_MOUSE_DISABLED;
}

function disposeGridLayer(gridLayer: THREE.Group): void {
  gridLayer.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  gridLayer.clear();
}

function rebuildGridLayer(
  runtime: RuntimeState,
  sceneData: AreaScene,
  viewportFacade: WorkspaceCanvasViewportFacade,
  showTileGridOverlay: boolean
): void {
  disposeGridLayer(runtime.gridLayer);
  disposeGridLayer(runtime.tileOverlayLayer);

  const segments = viewportFacade.buildGridSegments(
    sceneData.width,
    sceneData.height,
    viewportFacade.defaultMasterCellsPerTile
  );

  const majorPoints: number[] = [];
  const minorPoints: number[] = [];

  segments.forEach((segment) => {
    const target = segment.kind === "major" ? majorPoints : minorPoints;
    target.push(...segment.start, ...segment.end);
  });

  const minorGeometry = new THREE.BufferGeometry();
  minorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(minorPoints, 3));
  const minorMaterial = new THREE.LineBasicMaterial({
    color: 0x1e3551,
    transparent: true,
    opacity: 0.86
  });
  const minorLines = new THREE.LineSegments(minorGeometry, minorMaterial);
  minorLines.position.set(0, -0.003, 0);
  runtime.gridLayer.add(minorLines);

  const majorGeometry = new THREE.BufferGeometry();
  majorGeometry.setAttribute("position", new THREE.Float32BufferAttribute(majorPoints, 3));
  const majorMaterial = new THREE.LineBasicMaterial({
    color: 0x2a4c73,
    transparent: true,
    opacity: 0.96
  });
  const majorLines = new THREE.LineSegments(majorGeometry, majorMaterial);
  majorLines.position.set(0, -0.002, 0);
  runtime.gridLayer.add(majorLines);

  if (!showTileGridOverlay || majorPoints.length === 0) {
    return;
  }

  const overlayGeometry = new THREE.BufferGeometry();
  overlayGeometry.setAttribute("position", new THREE.Float32BufferAttribute(majorPoints, 3));
  const overlayMaterial = new THREE.LineBasicMaterial({
    color: TILE_OVERLAY_GRID_COLOR,
    transparent: true,
    opacity: 0.9,
    depthWrite: false
  });
  const overlayLines = new THREE.LineSegments(overlayGeometry, overlayMaterial);
  overlayLines.position.set(0, 0.004, 0);
  overlayLines.renderOrder = 950;
  runtime.tileOverlayLayer.add(overlayLines);
}

function createRuntime(container: HTMLDivElement): RuntimeState {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(BACKGROUND_COLOR, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "crosshair";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
  camera.position.set(24, 22, 24);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = MIN_ZOOM_DISTANCE;
  controls.maxDistance = MAX_ZOOM_DISTANCE;
  applyOrbitPointerBindings(controls, { ctrlPanEnabled: false });

  const transformAnchor = new THREE.Object3D();
  transformAnchor.name = "transform-anchor";
  transformAnchor.visible = false;
  scene.add(transformAnchor);

  const transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.setSpace("world");
  transformControls.setSize(0.82);
  scene.add(transformControls.getHelper());

  const ambient = new THREE.AmbientLight(LIGHT_COLOR, 0.68);
  const directional = new THREE.DirectionalLight(LIGHT_COLOR, 0.78);
  directional.position.set(16, 26, 10);
  scene.add(ambient);
  scene.add(directional);

  const gridLayer = new THREE.Group();
  gridLayer.name = "scene-grid";
  scene.add(gridLayer);

  const tileOverlayLayer = new THREE.Group();
  tileOverlayLayer.name = "scene-tile-grid-overlay";
  scene.add(tileOverlayLayer);

  const axesHelper = new THREE.AxesHelper(BASE_AXES_HELPER_SIZE);
  axesHelper.position.set(0, 0.02, 0);
  scene.add(axesHelper);

  const objectLayer = new THREE.Group();
  objectLayer.name = "scene-objects";
  scene.add(objectLayer);

  const boundsLayer = new THREE.Group();
  boundsLayer.name = "scene-bounds";
  scene.add(boundsLayer);

  const chunkLayer = new THREE.Group();
  chunkLayer.name = "scene-chunk-bounds";
  scene.add(chunkLayer);

  const gizmoLayer = new THREE.Group();
  gizmoLayer.name = "scene-gizmo-overlay";
  scene.add(gizmoLayer);

  const runtime: RuntimeState = {
    renderer,
    scene,
    camera,
    controls,
    transformControls,
    transformAnchor,
    raycaster: new THREE.Raycaster(),
    groundPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    container,
    tileMesh: null,
    tileIdByInstance: [],
    objectLayer,
    objectMeshById: new Map<string, THREE.Mesh>(),
    boundsLayer,
    boundsHelpers: [],
    chunkLayer,
    gizmoLayer,
    gridLayer,
    tileOverlayLayer,
    axesHelper,
    frameId: null,
    resizeObserver: null
  };

  return runtime;
}

function disposeRuntime(runtime: RuntimeState): void {
  if (runtime.frameId !== null) {
    cancelAnimationFrame(runtime.frameId);
  }
  runtime.resizeObserver?.disconnect();

  if (runtime.tileMesh) {
    runtime.tileMesh.geometry.dispose();
    (runtime.tileMesh.material as THREE.Material).dispose();
    runtime.scene.remove(runtime.tileMesh);
    runtime.tileMesh = null;
  }

  runtime.objectLayer.children.forEach((child) => {
    child.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Line) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Sprite) {
        const spriteMaterial = node.material;
        spriteMaterial.map?.dispose();
        spriteMaterial.dispose();
      }
    });
  });
  runtime.objectLayer.clear();
  runtime.boundsHelpers.forEach((helper) => {
    helper.geometry.dispose();
  });
  runtime.boundsHelpers = [];
  runtime.boundsLayer.clear();
  runtime.chunkLayer.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
  runtime.chunkLayer.clear();
  disposeGridLayer(runtime.gridLayer);
  disposeGridLayer(runtime.tileOverlayLayer);
  runtime.gizmoLayer.children.forEach((child) => {
    if ("geometry" in child && (child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    if ("material" in child && (child as THREE.Mesh).material) {
      const material = (child as THREE.Mesh).material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  runtime.gizmoLayer.clear();

  runtime.transformControls.detach();
  runtime.transformControls.dispose();
  runtime.scene.remove(runtime.transformControls.getHelper());
  runtime.scene.remove(runtime.transformAnchor);

  runtime.controls.dispose();
  runtime.renderer.dispose();
  runtime.renderer.domElement.remove();
}

function resizeRuntime(runtime: RuntimeState): void {
  const width = Math.max(1, Math.floor(runtime.container.clientWidth));
  const height = Math.max(1, Math.floor(runtime.container.clientHeight));
  runtime.renderer.setSize(width, height, false);
  runtime.camera.aspect = width / height;
  runtime.camera.updateProjectionMatrix();
}

function centerCameraForScene(runtime: RuntimeState, sceneData: AreaScene): void {
  const centerX = sceneData.width / 2;
  const centerY = sceneData.height / 2;
  const span = Math.max(sceneData.width, sceneData.height);
  const distance = Math.max(3.2, span * 1.55);

  runtime.controls.minDistance = Math.max(0.75, span * 0.32);
  runtime.controls.maxDistance = Math.max(36, span * 12);

  runtime.controls.target.set(centerX, 0, centerY);
  runtime.camera.position.set(centerX + distance * 0.78, distance * 0.92, centerY + distance * 0.78);
  runtime.controls.update();
}

function focusCameraOnPoint(runtime: RuntimeState, worldX: number, worldY: number): void {
  const offset = runtime.camera.position.clone().sub(runtime.controls.target);
  runtime.controls.target.set(worldX, 0, worldY);
  runtime.camera.position.copy(runtime.controls.target.clone().add(offset));
  runtime.controls.update();
}

function clearObjectLayer(runtime: RuntimeState): void {
  runtime.objectLayer.children.forEach((child) => {
    child.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Line) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Sprite) {
        const spriteMaterial = node.material;
        spriteMaterial.map?.dispose();
        spriteMaterial.dispose();
      }
    });
  });
  runtime.objectLayer.clear();
  runtime.objectMeshById.clear();
  runtime.boundsHelpers.forEach((helper) => {
    helper.geometry.dispose();
  });
  runtime.boundsHelpers = [];
  runtime.boundsLayer.clear();
}

function rebuildTerrainMesh(
  runtime: RuntimeState,
  sceneData: AreaScene,
  selectedTileId: string | null,
  debugState: DebugState
): void {
  if (runtime.tileMesh) {
    runtime.scene.remove(runtime.tileMesh);
    runtime.tileMesh.geometry.dispose();
    (runtime.tileMesh.material as THREE.Material).dispose();
    runtime.tileMesh = null;
    runtime.tileIdByInstance = [];
  }

  const geometry = new THREE.PlaneGeometry(1, 1);
  geometry.rotateX(-Math.PI / 2);
  const compressionOpacity =
    debugState.textureCompression === "uastc"
      ? 0.95
      : debugState.textureCompression === "etc1s"
        ? 0.82
        : 0.72;
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: (debugState.hiddenMeshes ? 0.55 : compressionOpacity),
    wireframe: debugState.wireframe
  });
  const mesh = new THREE.InstancedMesh(geometry, material, sceneData.tiles.length);
  mesh.name = "terrain-tiles";

  const matrix = new THREE.Matrix4();
  const color = new THREE.Color();

  sceneData.tiles.forEach((tile, index) => {
    matrix.makeTranslation(tile.col + 0.5, TILE_GEOMETRY_Y, tile.row + 0.5);
    mesh.setMatrixAt(index, matrix);

    if (debugState.textures) {
      color.set(TERRAIN_COLORS[tile.terrain]);
    } else {
      color.set("#4f6179");
    }
    if (debugState.walkmeshOverlay) {
      color.lerp(new THREE.Color("#36ff9f"), 0.42);
    }
    if (selectedTileId === tile.id) {
      color.offsetHSL(0, 0, 0.18);
    }
    mesh.setColorAt(index, color);
    runtime.tileIdByInstance[index] = tile.id;
  });

  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) {
    mesh.instanceColor.needsUpdate = true;
  }

  runtime.tileMesh = mesh;
  runtime.scene.add(mesh);
}

function rebuildObjectMeshes(
  runtime: RuntimeState,
  objects: SceneObject[],
  selectedObjectIds: string[],
  debugState: DebugState,
  sceneScale: number,
  soundUnitsPerTile: number,
  runtimeSoundNowPlayingBadges: readonly RuntimeSoundNowPlayingBadge[],
  showRuntimeSoundNowPlaying: boolean
): void {
  clearObjectLayer(runtime);
  const selectedSet = new Set(selectedObjectIds);
  const nowPlayingLabelById = new Map<string, string>(
    runtimeSoundNowPlayingBadges.map((badge) => [badge.objectId, badge.label])
  );
  const markerScale = sceneScale;
  const soundMetersToWorldScale = 1 / Math.max(1, soundUnitsPerTile);
  const objectRadius = 0.24 * markerScale;
  const collisionRadius = 0.33 * markerScale;
  const collisionThickness = Math.max(0.014, 0.04 * markerScale);
  const labelScale = markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;
  const objectBaseY = objectRadius + 0.012;
  const toWorldSoundDistance = (meters: number) => Math.max(0, meters) * soundMetersToWorldScale;

  objects.forEach((object) => {
    const renderStatus = resolveMockRenderStatus(object);
    const locked = isKindLocked(debugState, object.kind);
    const shouldHideNonRender =
      debugState.hiddenMeshes &&
      !debugState.showNonRenderMeshes &&
      renderStatus === "non_render";
    if (shouldHideNonRender) {
      return;
    }

    const geometry =
      object.kind === "sounds"
        ? new THREE.SphereGeometry(objectRadius * 0.82, 18, 18)
        : new THREE.SphereGeometry(objectRadius, 22, 22);
    let colorHex = OBJECT_COLORS[object.kind];
    const isStatusMapped =
      debugState.statusMap !== "off" &&
      usesStatusMapForKind(debugState.statusMap, object.kind);
    if (isStatusMapped) {
      colorHex = STATUS_COLOR[renderStatus];
    } else if (!debugState.textures) {
      colorHex = "#8ba0bc";
    }
    if (locked) {
      colorHex = "#566376";
    }

    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      wireframe: debugState.wireframe
    });

    if (renderStatus === "non_render" && debugState.showNonRenderMeshes) {
      material.opacity = 0.45;
      material.transparent = true;
    }

    const mesh = new THREE.Mesh(geometry, material);
    const showPhysicalAnchor =
      object.kind !== "sounds" &&
      debugState.showVtPhysicalAnchor &&
      isVisualTransformAppliedToObject(object);
    if (showPhysicalAnchor) {
      const physicalAnchorGeometry = new THREE.SphereGeometry(objectRadius * 0.94, 16, 16);
      const physicalAnchorMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(VT_PHYSICAL_ANCHOR_COLOR),
        transparent: true,
        opacity: 0.72,
        wireframe: true,
        depthWrite: false,
        depthTest: false
      });
      const physicalAnchorMesh = new THREE.Mesh(physicalAnchorGeometry, physicalAnchorMaterial);
      physicalAnchorMesh.renderOrder = 20;
      physicalAnchorMesh.raycast = () => undefined;
      const physicalAnchorPosition = new THREE.Vector3(
        object.x,
        objectBaseY + object.z,
        object.y
      );
      physicalAnchorMesh.position.set(
        physicalAnchorPosition.x,
        physicalAnchorPosition.y,
        physicalAnchorPosition.z
      );
      physicalAnchorMesh.rotation.set(0, object.bearing, 0);
      physicalAnchorMesh.userData = {
        visualTransformPhysicalAnchor: true
      };
      runtime.objectLayer.add(physicalAnchorMesh);

      const visualAnchorPosition = new THREE.Vector3(
        object.x + object.visualTransform.offsetX,
        objectBaseY + object.z + object.visualTransform.offsetZ,
        object.y + object.visualTransform.offsetY
      );
      const displacement = visualAnchorPosition.clone().sub(physicalAnchorPosition);
      if (displacement.lengthSq() > 1e-6) {
        const connectorGeometry = new THREE.BufferGeometry().setFromPoints([
          physicalAnchorPosition,
          visualAnchorPosition
        ]);
        const connectorMaterial = new THREE.LineDashedMaterial({
          color: new THREE.Color("#45f7a2"),
          transparent: true,
          opacity: 0.95,
          dashSize: 0.08 * markerScale,
          gapSize: 0.04 * markerScale,
          depthTest: false,
          depthWrite: false
        });
        const connector = new THREE.Line(connectorGeometry, connectorMaterial);
        connector.computeLineDistances();
        connector.renderOrder = 19;
        connector.raycast = () => undefined;
        runtime.objectLayer.add(connector);
      }
    }

    const effectiveVisualTransform =
      object.kind === "placeables" && (object.isStatic ?? true)
        ? {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            // Aurora-first parity: static placeables ignore VT channels while keeping base position.
            offsetZ: 0,
            pitch: 0,
            yaw: 0,
            roll: 0
          }
        : object.visualTransform;
    const soundPositioning =
      object.kind === "sounds" ? normalizeSoundGuidePositioning(object.soundPositioning) : null;
    const soundOverlayFlags =
      object.kind === "sounds"
        ? resolveSoundGuideOverlayFlagsFromPositioning(soundPositioning)
        : null;
    const visualScale = Math.max(0.01, effectiveVisualTransform.scale);
    mesh.position.set(
      object.x + effectiveVisualTransform.offsetX,
      objectBaseY + object.z + effectiveVisualTransform.offsetZ,
      object.y + effectiveVisualTransform.offsetY
    );
    mesh.rotation.set(
      effectiveVisualTransform.pitch,
      object.bearing + effectiveVisualTransform.yaw,
      effectiveVisualTransform.roll
    );
    mesh.scale.setScalar(visualScale);

    if (selectedSet.has(object.id)) {
      material.emissive = new THREE.Color("#ffd87f");
      mesh.scale.setScalar(visualScale * 1.16);
    }

    if (object.kind === "sounds") {
      const soundGuidePositioning =
        soundPositioning ?? normalizeSoundGuidePositioning(object.soundPositioning);
      const markerMode = soundGuidePositioning.mode;
      const soundModeMarker = createSoundModeMarkerGroup(markerMode, markerScale);
      soundModeMarker.position.set(0, labelHeight * 0.8, 0);
      mesh.add(soundModeMarker);

      const physicalAnchorY = objectBaseY + object.z;
      const elevatedAnchorY =
        physicalAnchorY + toWorldSoundDistance(soundGuidePositioning.elevation);
      const physicalAnchorMesh = new THREE.Mesh(
        new THREE.SphereGeometry(objectRadius * 0.32, 12, 12),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color(SOUND_HEIGHT_COLOR),
          transparent: true,
          opacity: selectedSet.has(object.id) ? 1 : 0.9,
          depthWrite: false
        })
      );
      physicalAnchorMesh.position.set(object.x, physicalAnchorY, object.y);
      physicalAnchorMesh.renderOrder = 14;
      physicalAnchorMesh.raycast = () => undefined;
      runtime.objectLayer.add(physicalAnchorMesh);
      const visualAnchorPosition = new THREE.Vector3(mesh.position.x, mesh.position.y, mesh.position.z);
      if (visualAnchorPosition.distanceToSquared(physicalAnchorMesh.position) > 1e-6) {
        const anchorConnector = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            physicalAnchorMesh.position.clone(),
            visualAnchorPosition
          ]),
          new THREE.LineDashedMaterial({
            color: new THREE.Color(SOUND_HEIGHT_COLOR),
            transparent: true,
            opacity: selectedSet.has(object.id) ? 0.92 : 0.72,
            dashSize: Math.max(0.06, markerScale * 0.11),
            gapSize: Math.max(0.03, markerScale * 0.07),
            depthWrite: false
          })
        );
        anchorConnector.computeLineDistances();
        anchorConnector.raycast = () => undefined;
        runtime.objectLayer.add(anchorConnector);
      }

      if (soundOverlayFlags?.range) {
        const maxRange = toWorldSoundDistance(soundGuidePositioning.maxVolumeDistance);
        const cutoffRange = Math.max(
          maxRange,
          toWorldSoundDistance(soundGuidePositioning.cutoffDistance)
        );
        const rangeOpacity = selectedSet.has(object.id) ? 0.84 : 0.64;
        const createHorizontalRing = (
          radius: number,
          color: string,
          opacity: number,
          dashed: boolean
        ) => {
          const segments = 80;
          const ringPoints: THREE.Vector3[] = [];
          for (let segment = 0; segment <= segments; segment += 1) {
            const angle = (segment / segments) * Math.PI * 2;
            ringPoints.push(
              new THREE.Vector3(
                object.x + Math.cos(angle) * radius,
                elevatedAnchorY,
                object.y + Math.sin(angle) * radius
              )
            );
          }
          const ringGeometry = new THREE.BufferGeometry().setFromPoints(ringPoints);
          const ringMaterial = dashed
            ? new THREE.LineDashedMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity,
                dashSize: Math.max(0.06, markerScale * 0.14),
                gapSize: Math.max(0.03, markerScale * 0.09),
                depthWrite: false
              })
            : new THREE.LineBasicMaterial({
                color: new THREE.Color(color),
                transparent: true,
                opacity,
                depthWrite: false
              });
          const ring = new THREE.Line(ringGeometry, ringMaterial);
          if (dashed) {
            ring.computeLineDistances();
          }
          ring.raycast = () => undefined;
          runtime.objectLayer.add(ring);
        };

        if (cutoffRange > 0.001) {
          createHorizontalRing(cutoffRange, "#8fd3ff", rangeOpacity + 0.05, false);
        }
        if (maxRange > 0.001) {
          createHorizontalRing(maxRange, "#5f80b8", Math.min(1, rangeOpacity + 0.12), true);
        }
        if (cutoffRange > 0.001) {
          const domeRange = cutoffRange;
          const domeOpacity = selectedSet.has(object.id) ? 0.44 : 0.31;
          const domeDashSize = Math.max(0.05, markerScale * 0.12);
          const domeGapSize = Math.max(0.02, markerScale * 0.08);

          const latitudeHeights = [-0.8, -0.45, -0.2, 0.2, 0.45, 0.8];
          latitudeHeights.forEach((normalizedHeight) => {
            const bandY = elevatedAnchorY + domeRange * normalizedHeight;
            const bandRadius = domeRange * Math.sqrt(Math.max(0, 1 - normalizedHeight ** 2));
            if (bandRadius <= 0.001) {
              return;
            }
            const bandPoints: THREE.Vector3[] = [];
            const segmentCount = 56;
            for (let segment = 0; segment <= segmentCount; segment += 1) {
              const angle = (segment / segmentCount) * Math.PI * 2;
              bandPoints.push(
                new THREE.Vector3(
                  object.x + Math.cos(angle) * bandRadius,
                  bandY,
                  object.y + Math.sin(angle) * bandRadius
                )
              );
            }
            const bandLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(bandPoints),
              new THREE.LineDashedMaterial({
                color: new THREE.Color(SOUND_DOME_COLOR),
                transparent: true,
                opacity: domeOpacity,
                dashSize: domeDashSize,
                gapSize: domeGapSize,
                depthWrite: false
              })
            );
            bandLine.computeLineDistances();
            bandLine.raycast = () => undefined;
            runtime.objectLayer.add(bandLine);
          });

          const meridianCount = 12;
          for (let meridianIndex = 0; meridianIndex < meridianCount; meridianIndex += 1) {
            const azimuth = (meridianIndex / meridianCount) * Math.PI * 2;
            const meridianPoints: THREE.Vector3[] = [];
            const segmentCount = 48;
            for (let step = 0; step <= segmentCount; step += 1) {
              // Full 360deg meridian loop so both left and right hemispheres are visible.
              const angle = (step / segmentCount) * Math.PI * 2;
              const radial = domeRange * Math.cos(angle);
              meridianPoints.push(
                new THREE.Vector3(
                  object.x + Math.cos(azimuth) * radial,
                  elevatedAnchorY + domeRange * Math.sin(angle),
                  object.y + Math.sin(azimuth) * radial
                )
              );
            }
            const meridianLine = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(meridianPoints),
              new THREE.LineDashedMaterial({
                color: new THREE.Color(SOUND_DOME_COLOR),
                transparent: true,
                opacity: domeOpacity,
                dashSize: domeDashSize,
                gapSize: domeGapSize,
                depthWrite: false
              })
            );
            meridianLine.computeLineDistances();
            meridianLine.raycast = () => undefined;
            runtime.objectLayer.add(meridianLine);
          }
        }
      }

      if (
        soundOverlayFlags?.randBox &&
        soundGuidePositioning.randomRangeWestEast > 0 &&
        soundGuidePositioning.randomRangeNorthSouth > 0
      ) {
        const halfWidth = toWorldSoundDistance(soundGuidePositioning.randomRangeWestEast) / 2;
        const halfHeight = toWorldSoundDistance(soundGuidePositioning.randomRangeNorthSouth) / 2;
        const randomRangePoints = [
          new THREE.Vector3(object.x - halfWidth, elevatedAnchorY, object.y - halfHeight),
          new THREE.Vector3(object.x + halfWidth, elevatedAnchorY, object.y - halfHeight),
          new THREE.Vector3(object.x + halfWidth, elevatedAnchorY, object.y + halfHeight),
          new THREE.Vector3(object.x - halfWidth, elevatedAnchorY, object.y + halfHeight),
          new THREE.Vector3(object.x - halfWidth, elevatedAnchorY, object.y - halfHeight)
        ];
        const randomRangeGeometry = new THREE.BufferGeometry().setFromPoints(randomRangePoints);
        const randomRangeMaterial = new THREE.LineBasicMaterial({
          color: new THREE.Color(SOUND_RANDOM_RANGE_COLOR),
          transparent: true,
          opacity: selectedSet.has(object.id) ? 0.92 : 0.75,
          depthWrite: false
        });
        const randomRangeRect = new THREE.Line(randomRangeGeometry, randomRangeMaterial);
        randomRangeRect.raycast = () => undefined;
        runtime.objectLayer.add(randomRangeRect);
      }

      if (soundOverlayFlags?.height && Math.abs(elevatedAnchorY - physicalAnchorY) > 1e-4) {
        const heightGeometry = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(object.x, physicalAnchorY, object.y),
          new THREE.Vector3(object.x, elevatedAnchorY, object.y)
        ]);
        const heightLine = new THREE.Line(
          heightGeometry,
          new THREE.LineBasicMaterial({
            color: new THREE.Color(SOUND_HEIGHT_COLOR),
            transparent: true,
            opacity: selectedSet.has(object.id) ? 0.96 : 0.82,
            depthWrite: false
          })
        );
        heightLine.raycast = () => undefined;
        runtime.objectLayer.add(heightLine);
      }
    }

    mesh.userData = {
      objectId: object.id,
      objectKind: object.kind,
      objectLabel: OBJECT_LABELS[object.kind]
    };

    if (debugState.collisionOverlay) {
      const collisionGeometry = new THREE.TorusGeometry(collisionRadius, collisionThickness, 8, 24);
      const collisionMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#ff8c4d"),
        transparent: true,
        opacity: 0.85
      });
      const collisionRing = new THREE.Mesh(collisionGeometry, collisionMaterial);
      collisionRing.rotation.x = Math.PI / 2;
      collisionRing.position.set(0, 0.02, 0);
      mesh.add(collisionRing);
    }

    runtime.objectLayer.add(mesh);
    runtime.objectMeshById.set(object.id, mesh);

    if (debugState.objectLabels) {
      const labelSprite = createTextSprite(OBJECT_LABELS[object.kind], labelScale);
      labelSprite.position.set(0, labelHeight, 0);
      mesh.add(labelSprite);
    }
    if (
      showRuntimeSoundNowPlaying &&
      object.kind === "sounds" &&
      nowPlayingLabelById.has(object.id)
    ) {
      const nowPlayingSprite = createTextSprite(
        nowPlayingLabelById.get(object.id) ?? SOUND_NOW_PLAYING_BADGE_LABEL,
        markerScale * 0.74,
        {
          fillColor: "#d9ffe8",
          backgroundFill: "rgba(7, 35, 20, 0.92)",
          backgroundStroke: "rgba(74, 227, 153, 0.92)",
          autoWidth: true,
          minWidthPx: 180,
          maxWidthPx: 1800,
          horizontalPaddingPx: 30
        }
      );
      nowPlayingSprite.position.set(0, labelHeight + markerScale * 0.56, 0);
      mesh.add(nowPlayingSprite);
    }

    if (debugState.bounds) {
      const helperColor = isStatusMapped ? STATUS_COLOR[renderStatus] : "#8ab5ff";
      const boundsHelper = new THREE.BoxHelper(mesh, helperColor);
      runtime.boundsLayer.add(boundsHelper);
      runtime.boundsHelpers.push(boundsHelper);
    }
  });
}

function updateAxesHelperForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  sceneScale: number
): void {
  const transform = resolveAxesHelperTransform(sceneData.width, sceneData.height, sceneScale);
  runtime.axesHelper.position.set(
    transform.positionX,
    transform.positionY,
    transform.positionZ
  );
  runtime.axesHelper.scale.setScalar(transform.scale);
}

function rebuildChunkBounds(runtime: RuntimeState, sceneData: AreaScene, enabled: boolean): void {
  runtime.chunkLayer.children.forEach((child) => {
    if (child instanceof THREE.LineSegments) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  });
  runtime.chunkLayer.clear();

  if (!enabled) {
    return;
  }

  const points: number[] = [];
  const width = sceneData.width;
  const height = sceneData.height;
  for (let x = 0; x <= width; x += CHUNK_SIZE) {
    points.push(x, 0.02, 0, x, 0.02, height);
  }
  for (let y = 0; y <= height; y += CHUNK_SIZE) {
    points.push(0, 0.02, y, width, 0.02, y);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color("#ffb873"),
    transparent: true,
    opacity: 0.72
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = "chunk-bounds";
  runtime.chunkLayer.add(lines);
}

function rebuildGizmoOverlay(
  runtime: RuntimeState,
  selectedObjectIds: string[],
  objectById: Map<string, SceneObject>,
  debugState: DebugState,
  sceneScale: number
): void {
  runtime.gizmoLayer.children.forEach((child) => {
    if ("geometry" in child && (child as THREE.Mesh).geometry) {
      (child as THREE.Mesh).geometry.dispose();
    }
    if ("material" in child && (child as THREE.Mesh).material) {
      const material = (child as THREE.Mesh).material;
      if (Array.isArray(material)) {
        material.forEach((entry) => entry.dispose());
      } else {
        material.dispose();
      }
    }
  });
  runtime.gizmoLayer.clear();

  if (selectedObjectIds.length === 0) {
    return;
  }

  const selectedEntries = selectedObjectIds
    .map((id) => {
      const object = objectById.get(id);
      const mesh = runtime.objectMeshById.get(id);
      if (!object || !mesh) {
        return null;
      }
      return { object, mesh };
    })
    .filter((entry): entry is { object: SceneObject; mesh: THREE.Mesh } => Boolean(entry));

  if (selectedEntries.length === 0) {
    return;
  }

  // Aurora parity: doors are anchor-bound and block generic move gizmos.
  if (selectedEntries.some((entry) => entry.object.kind === "doors")) {
    return;
  }

  const movableEntries = selectedEntries.filter(
    (entry) =>
      MOVE_ALLOWED_KINDS.has(entry.object.kind) &&
      !isKindLocked(debugState, entry.object.kind)
  );
  if (movableEntries.length === 0) {
    return;
  }

  const usesInteractiveTransformControls =
    runtime.transformControls.enabled &&
    Boolean(runtime.transformControls.object);
  if (usesInteractiveTransformControls) {
    return;
  }

  // For multi-selection we keep only the interactive gizmo, no legacy overlay.
  if (selectedEntries.length > 1) {
    return;
  }

  const anchorPosition = new THREE.Vector3();
  movableEntries.forEach((entry) => {
    anchorPosition.add(entry.mesh.position);
  });
  anchorPosition.divideScalar(movableEntries.length);

  const gizmoScale = Math.max(0.08, sceneScale);
  if (debugState.gizmoMode === "translate") {
    const gizmoAxes = new THREE.AxesHelper(1.4 * gizmoScale);
    gizmoAxes.position.copy(anchorPosition);
    runtime.gizmoLayer.add(gizmoAxes);
    return;
  }

  if (debugState.gizmoMode === "rotate") {
    const ringGeometry = new THREE.TorusGeometry(
      0.58 * gizmoScale,
      Math.max(0.008, 0.02 * gizmoScale),
      12,
      64
    );
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#8dbdff"),
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(anchorPosition);
    ring.rotation.x = Math.PI / 2;
    runtime.gizmoLayer.add(ring);
    return;
  }

  const scaleGeometry = new THREE.BoxGeometry(
    0.95 * gizmoScale,
    0.95 * gizmoScale,
    0.95 * gizmoScale
  );
  const scaleMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#98efad"),
    wireframe: true
  });
  const scaleBox = new THREE.Mesh(scaleGeometry, scaleMaterial);
  scaleBox.position.copy(anchorPosition);
  runtime.gizmoLayer.add(scaleBox);
}

function pointerToNdc(
  runtime: RuntimeState,
  event: ReactMouseEvent<HTMLDivElement>
): THREE.Vector2 {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  return new THREE.Vector2(x, y);
}

function pointerToLocal(
  runtime: RuntimeState,
  event: ReactMouseEvent<HTMLDivElement>
): { x: number; y: number } {
  const rect = runtime.renderer.domElement.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function worldToScreen(runtime: RuntimeState, worldX: number, worldY: number): { x: number; y: number } {
  const projected = new THREE.Vector3(worldX, WORLD_OBJECT_Y, worldY);
  return worldVectorToScreen(runtime, projected);
}

function worldVectorToScreen(runtime: RuntimeState, worldPosition: THREE.Vector3): { x: number; y: number } {
  const width = runtime.renderer.domElement.clientWidth;
  const height = runtime.renderer.domElement.clientHeight;
  const projected = worldPosition.clone().project(runtime.camera);
  return {
    x: ((projected.x + 1) * 0.5) * width,
    y: ((-projected.y + 1) * 0.5) * height
  };
}

function resolveContextMenuAnchorScreen(
  runtime: RuntimeState,
  object: Pick<SceneObject, "x" | "y">,
  objectId?: string
): { x: number; y: number } {
  if (objectId) {
    const objectMesh = runtime.objectMeshById.get(objectId);
    if (objectMesh) {
      const meshWorldPosition = new THREE.Vector3();
      objectMesh.getWorldPosition(meshWorldPosition);
      return worldVectorToScreen(runtime, meshWorldPosition);
    }
  }
  return worldToScreen(runtime, object.x, object.y);
}

function normalizeContextMenuAnchorOffset(
  anchorOffsetX: number,
  anchorOffsetY: number
): { x: number; y: number } {
  const length = Math.hypot(anchorOffsetX, anchorOffsetY);
  if (length <= CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX || length === 0) {
    return { x: anchorOffsetX, y: anchorOffsetY };
  }
  const scale = CONTEXT_MENU_MAX_ANCHOR_OFFSET_PX / length;
  return {
    x: anchorOffsetX * scale,
    y: anchorOffsetY * scale
  };
}

function clampContextMenuPosition(
  x: number,
  y: number,
  viewportWidth: number,
  viewportHeight: number,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } {
  const minX = CONTEXT_MENU_MARGIN_PX;
  const minY = CONTEXT_MENU_MARGIN_PX;
  const maxX = Math.max(
    CONTEXT_MENU_MARGIN_PX,
    viewportWidth - menuWidth - CONTEXT_MENU_MARGIN_PX
  );
  const maxY = Math.max(
    CONTEXT_MENU_MARGIN_PX,
    viewportHeight - menuHeight - CONTEXT_MENU_MARGIN_PX
  );
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y))
  };
}

function resolveAnchoredContextMenuPosition(
  runtime: RuntimeState,
  object: Pick<SceneObject, "x" | "y">,
  objectId: string | undefined,
  anchorOffsetX: number,
  anchorOffsetY: number,
  menuWidth = CONTEXT_MENU_FALLBACK_WIDTH_PX,
  menuHeight = CONTEXT_MENU_FALLBACK_HEIGHT_PX
): { x: number; y: number } {
  const anchorScreen = resolveContextMenuAnchorScreen(runtime, object, objectId);
  const preferredX = anchorScreen.x + anchorOffsetX;
  const preferredY = anchorScreen.y + anchorOffsetY;
  const viewportWidth = runtime.renderer.domElement.clientWidth;
  const viewportHeight = runtime.renderer.domElement.clientHeight;
  return clampContextMenuPosition(
    preferredX,
    preferredY,
    viewportWidth,
    viewportHeight,
    menuWidth,
    menuHeight
  );
}

function intersectionOnGround(runtime: RuntimeState, ndc: THREE.Vector2): THREE.Vector3 | null {
  runtime.raycaster.setFromCamera(ndc, runtime.camera);
  const intersection = new THREE.Vector3();
  const hit = runtime.raycaster.ray.intersectPlane(runtime.groundPlane, intersection);
  return hit ?? null;
}

export function WorkspaceCanvasViewport({
  toolbarState,
  userId,
  sceneViewportPort,
  viewportFacade = defaultViewportFacade,
  trackTelemetryEvent = defaultTrackTelemetryEvent,
  commandSignal,
  sidebarSelectSignal,
  sidebarContextMenuSignal,
  catalogScope,
  workspaceOptions,
  leftPanelWidthPx,
  rightPanelWidthPx,
  onSceneObjectsSnapshotChange,
  onSelectionSnapshotChange,
  externalSceneSeed
}: WorkspaceCanvasViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const commandRevisionRef = useRef(0);
  const sidebarSelectRevisionRef = useRef<number | null>(null);
  const sidebarContextMenuRevisionRef = useRef<number | null>(null);
  const nextObjectSequenceRef = useRef(1);
  const clipboardObjectsRef = useRef<SceneObject[]>([]);
  const contextMenuRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogRef = useRef<HTMLElement | null>(null);
  const adjustLocationDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const placeablePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const placeablePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const soundPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const soundPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const soundPreviewAudioRef = useRef<HTMLAudioElement | null>(null);
  const runtimeSoundPlaybackStateRef = useRef<Map<string, RuntimeSoundPlaybackState>>(
    new Map<string, RuntimeSoundPlaybackState>()
  );
  const runtimeSoundLoopChannelsRef = useRef<Map<string, RuntimeSoundLoopChannel>>(
    new Map<string, RuntimeSoundLoopChannel>()
  );
  const runtimeSoundOneShotChannelsRef = useRef<Set<HTMLAudioElement>>(new Set<HTMLAudioElement>());
  const runtimeSoundNowPlayingRef = useRef<Map<string, RuntimeSoundNowPlayingState>>(
    new Map<string, RuntimeSoundNowPlayingState>()
  );
  const doorPropertiesDialogRef = useRef<HTMLElement | null>(null);
  const doorPropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const creaturePropertiesDialogRef = useRef<HTMLElement | null>(null);
  const creaturePropertiesDialogDragRef = useRef<PropertyDialogDragState>({
    ...DEFAULT_PROPERTY_DIALOG_DRAG_STATE
  });
  const bearingDialDragRef = useRef<BearingDialDragState>({
    active: false,
    pointerId: null
  });
  const lastPointerWorldRef = useRef<{ x: number; y: number } | null>(null);
  const dragMoveRef = useRef<DragMoveState>({
    active: false,
    lastWorld: null,
    objectIds: []
  });
  const transformGestureRef = useRef<TransformGestureState>(createIdleTransformGestureState());
  const bookmark1Ref = useRef<CameraBookmark | null>(null);
  const perfFrameRef = useRef({
    frameCount: 0,
    lastTick: 0
  });
  const [sceneHistory, setSceneHistory] = useState<SceneHistoryState>(() =>
    sceneViewportPort.createInitialHistory(userId)
  );
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [objectAddPreview, setObjectAddPreview] = useState<CanvasObjectAddPreviewState | null>(
    null
  );
  const objectAddPlacementCacheRef = useRef<ObjectAddPlacementCacheState | null>(null);
  const objectAddGhostRef = useRef<ObjectAddGhostState | null>(null);
  const terrainBrush: TerrainBrushKind = "corridor";
  const [objectBrush, setObjectBrush] = useState<SceneObjectKind>("placeables");
  const [lastSavedAtUnixMs, setLastSavedAtUnixMs] = useState<number | null>(null);
  const [webglReady, setWebglReady] = useState(false);
  const [webglFallbackReason, setWebglFallbackReason] = useState<string | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBoxState>({
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [adjustLocationDialog, setAdjustLocationDialog] =
    useState<AdjustLocationDialogState | null>(null);
  const [placeablePropertiesDialog, setPlaceablePropertiesDialog] =
    useState<PlaceablePropertiesDialogState | null>(null);
  const [soundPropertiesDialog, setSoundPropertiesDialog] =
    useState<SoundPropertiesDialogState | null>(null);
  const [doorPropertiesDialog, setDoorPropertiesDialog] =
    useState<DoorPropertiesDialogState | null>(null);
  const [creaturePropertiesDialog, setCreaturePropertiesDialog] =
    useState<CreaturePropertiesDialogState | null>(null);
  const [creatureFeatsFilter, setCreatureFeatsFilter] = useState<string>(
    CREATURE_FEAT_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsLevelFilter, setCreatureSpellsLevelFilter] = useState<string>(
    CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsMetaMagicFilter, setCreatureSpellsMetaMagicFilter] = useState<string>(
    CREATURE_METAMAGIC_FILTER_OPTIONS[0]!
  );
  const [creatureSpellsClassFilterIndex, setCreatureSpellsClassFilterIndex] = useState<number>(0);
  const [creatureSpecialAbilitiesFilter, setCreatureSpecialAbilitiesFilter] = useState<string>(
    CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!
  );
  const [runtimeSoundNowPlayingBadges, setRuntimeSoundNowPlayingBadges] = useState<
    RuntimeSoundNowPlayingBadge[]
  >([]);
  const [runtimePopupPinned, setRuntimePopupPinned] = useState(false);
  const [objectAddDropFeedback, setObjectAddDropFeedback] = useState<ObjectAddDropFeedbackState | null>(null);
  const [perfSnapshot, setPerfSnapshot] = useState<PerfSnapshot>({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0
  });
  const trackTelemetry = trackTelemetryEvent;
  const scene = sceneHistory.present;
  const adjustLocationUnitsPerTile = Math.max(1, viewportFacade.defaultMasterCellsPerTile);
  const clearObjectAddGhost = useCallback(() => {
    const current = objectAddGhostRef.current;
    if (!current) {
      return;
    }
    current.mesh.removeFromParent();
    current.mesh.geometry.dispose();
    const materials = Array.isArray(current.mesh.material) ? current.mesh.material : [current.mesh.material];
    materials.forEach((material) => material.dispose());
    objectAddGhostRef.current = null;
  }, []);
  const syncObjectAddGhost = useCallback(
    (payload: ObjectAddDragPayload, placementX: number, placementY: number, isInsideCanvasArea: boolean) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      const payloadKey = resolveObjectAddPayloadKey(payload);
      const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);
      const markerRadius = 0.24 * sceneScale;
      const sphereRadius = payload.kind === "sounds" ? markerRadius * 0.82 : markerRadius;
      const existingGhost = objectAddGhostRef.current;
      const shouldRecreateGhost =
        !existingGhost ||
        existingGhost.payloadKey !== payloadKey ||
        Math.abs(existingGhost.sceneScale - sceneScale) > 1e-6;

      if (shouldRecreateGhost) {
        clearObjectAddGhost();
        const ghostMesh = new THREE.Mesh(
          new THREE.SphereGeometry(sphereRadius, payload.kind === "sounds" ? 18 : 22, payload.kind === "sounds" ? 18 : 22),
          new THREE.MeshLambertMaterial({
            color: new THREE.Color(OBJECT_COLORS[payload.kind]),
            transparent: true,
            opacity: 0.7,
            wireframe: toolbarState.canvasDebug.wireframe,
            depthWrite: false
          })
        );
        ghostMesh.renderOrder = 30;
        ghostMesh.raycast = () => undefined;
        runtime.gizmoLayer.add(ghostMesh);
        objectAddGhostRef.current = {
          payloadKey,
          mesh: ghostMesh,
          sceneScale
        };
      }

      const activeGhost = objectAddGhostRef.current?.mesh;
      if (!activeGhost) {
        return;
      }
      const activeGhostMaterial = activeGhost.material as THREE.MeshLambertMaterial;
      activeGhostMaterial.color.set(isInsideCanvasArea ? OBJECT_COLORS[payload.kind] : "#ff5e73");
      activeGhostMaterial.opacity = isInsideCanvasArea ? 0.7 : 0.42;
      activeGhostMaterial.needsUpdate = true;
      activeGhost.position.set(placementX, markerRadius + 0.012, placementY);
    },
    [clearObjectAddGhost, scene.height, scene.width, sceneViewportPort, toolbarState.canvasDebug.wireframe]
  );

  useEffect(() => {
    onSceneObjectsSnapshotChange?.(scene.objects);
  }, [onSceneObjectsSnapshotChange, scene.objects]);

  useEffect(() => {
    onSelectionSnapshotChange?.(selectedObjectIds);
  }, [onSelectionSnapshotChange, selectedObjectIds]);

  useEffect(() => {
    const clearObjectAddPreview = () => {
      setObjectAddPreview(null);
      setCurrentObjectAddDragPayload(null);
      objectAddPlacementCacheRef.current = null;
      clearObjectAddGhost();
    };
    window.addEventListener("dragend", clearObjectAddPreview);
    window.addEventListener("drop", clearObjectAddPreview);
    return () => {
      window.removeEventListener("dragend", clearObjectAddPreview);
      window.removeEventListener("drop", clearObjectAddPreview);
    };
  }, [clearObjectAddGhost]);

  useEffect(
    () => () => {
      clearObjectAddGhost();
    },
    [clearObjectAddGhost]
  );

  useEffect(() => {
    if (!objectAddDropFeedback) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      setObjectAddDropFeedback(null);
    }, 2600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [objectAddDropFeedback]);

  useEffect(() => {
    if (!sidebarSelectSignal) {
      return;
    }
    if (sidebarSelectRevisionRef.current === sidebarSelectSignal.revision) {
      return;
    }

    const selectedObject = scene.objects.find(
      (object) => object.id === sidebarSelectSignal.objectId
    );
    if (!selectedObject) {
      return;
    }
    sidebarSelectRevisionRef.current = sidebarSelectSignal.revision;

    setSelectedTileId(null);
    setSelectedObjectIds((current) => {
      if (!sidebarSelectSignal.additive) {
        return [selectedObject.id];
      }

      const allowedSet = new Set(sidebarSelectSignal.allowedObjectIds);
      const scopedCurrent = current.filter((id) => allowedSet.has(id));
      if (scopedCurrent.includes(selectedObject.id)) {
        return scopedCurrent.filter((id) => id !== selectedObject.id);
      }

      return [...scopedCurrent, selectedObject.id];
    });
    setContextMenu(null);
    trackTelemetry("scene.selection.from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarSelectSignal.revision,
      additive: sidebarSelectSignal.additive,
      sourceType: sidebarSelectSignal.sourceType
    });
  }, [scene.objects, sidebarSelectSignal, userId]);

  useEffect(() => {
    if (!sidebarContextMenuSignal) {
      return;
    }
    if (sidebarContextMenuRevisionRef.current === sidebarContextMenuSignal.revision) {
      return;
    }

    const selectedObject = scene.objects.find(
      (object) => object.id === sidebarContextMenuSignal.objectId
    );
    if (!selectedObject) {
      return;
    }
    sidebarContextMenuRevisionRef.current = sidebarContextMenuSignal.revision;

    const runtime = runtimeRef.current;
    const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
    const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
    const anchoredPosition = runtime
      ? resolveAnchoredContextMenuPosition(
          runtime,
          selectedObject,
          selectedObject.id,
          anchorOffsetX,
          anchorOffsetY
        )
      : { x: 24, y: 24 };

    setSelectedTileId(null);
    setSelectedObjectIds((current) =>
      current.includes(selectedObject.id) ? current : [selectedObject.id]
    );
    setContextMenu({
      x: anchoredPosition.x,
      y: anchoredPosition.y,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      anchorOffsetX,
      anchorOffsetY
    });
    trackTelemetry("scene.context_menu.open_from_scene_object_list", {
      userId,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind,
      revision: sidebarContextMenuSignal.revision
    });
  }, [scene.objects, sidebarContextMenuSignal, userId]);

  const visibleObjects = useMemo(
    () =>
      scene.objects.filter(
        (object) =>
          isObjectVisible(object, toolbarState) &&
          isKindVisibleWithIsolation(toolbarState.canvasDebug, object.kind)
      ),
    [scene.objects, toolbarState]
  );

  const objectById = useMemo(
    () => new Map(scene.objects.map((object) => [object.id, object])),
    [scene.objects]
  );

  const catalogAllowedIdsSet = useMemo(
    () => new Set(catalogScope?.allowedObjectIds ?? scene.objects.map((object) => object.id)),
    [catalogScope?.allowedObjectIds, scene.objects]
  );

  const isSelectableByActiveFilters = useCallback(
    (object: SceneObject) =>
      isObjectSelectableByScope(object, toolbarState.selectionScope) &&
      isObjectSelectableByCatalogScope(object, catalogScope, catalogAllowedIdsSet),
    [catalogAllowedIdsSet, catalogScope, toolbarState.selectionScope]
  );

  const visibleObjectIdsSet = useMemo(
    () => new Set(visibleObjects.map((object) => object.id)),
    [visibleObjects]
  );

  const cloneSceneObject = useCallback((object: SceneObject): SceneObject => {
    return {
      ...object,
      visualTransform: { ...object.visualTransform },
      placeableProperties: object.placeableProperties
        ? {
            ...object.placeableProperties,
            scriptSlots: object.placeableProperties.scriptSlots
              ? { ...object.placeableProperties.scriptSlots }
              : undefined,
            disabledFlags: object.placeableProperties.disabledFlags
              ? { ...object.placeableProperties.disabledFlags }
              : undefined,
            lockSettings: object.placeableProperties.lockSettings
              ? { ...object.placeableProperties.lockSettings }
              : undefined,
            trapSettings: object.placeableProperties.trapSettings
              ? { ...object.placeableProperties.trapSettings }
              : undefined,
            advancedSettings: object.placeableProperties.advancedSettings
              ? { ...object.placeableProperties.advancedSettings }
              : undefined
          }
        : undefined,
      creatureProperties: object.creatureProperties
        ? {
            ...object.creatureProperties,
            statistics: object.creatureProperties.statistics
              ? {
                  ...object.creatureProperties.statistics,
                  abilityScores: { ...object.creatureProperties.statistics.abilityScores },
                  racialModifiers: { ...object.creatureProperties.statistics.racialModifiers },
                  saves: { ...object.creatureProperties.statistics.saves }
                }
              : undefined,
            appearanceSettings: object.creatureProperties.appearanceSettings
              ? { ...object.creatureProperties.appearanceSettings }
              : undefined,
            classEntries: object.creatureProperties.classEntries
              ? object.creatureProperties.classEntries.map((entry) => ({ ...entry }))
              : undefined,
            skills: object.creatureProperties.skills
              ? object.creatureProperties.skills.map((entry) => ({ ...entry }))
              : undefined,
            scriptSlots: object.creatureProperties.scriptSlots
              ? { ...object.creatureProperties.scriptSlots }
              : undefined,
            advancedSettings: object.creatureProperties.advancedSettings
              ? { ...object.creatureProperties.advancedSettings }
              : undefined,
            feats: object.creatureProperties.feats
              ? object.creatureProperties.feats.map((entry) => ({ ...entry }))
              : undefined,
            spells: object.creatureProperties.spells
              ? object.creatureProperties.spells.map((entry) => ({ ...entry }))
              : undefined,
            specialAbilities: object.creatureProperties.specialAbilities
              ? object.creatureProperties.specialAbilities.map((entry) => ({ ...entry }))
              : undefined
          }
        : undefined,
      doorTransition: object.doorTransition
        ? {
            ...object.doorTransition,
            flags: { ...object.doorTransition.flags }
          }
        : undefined,
      soundPositioning: object.soundPositioning
        ? { ...object.soundPositioning }
        : undefined
    };
  }, []);

  const getUnlockedSelectedObjects = useCallback(
    (objects: SceneObject[]): SceneObject[] =>
      objects.filter(
        (object) =>
          selectedObjectIds.includes(object.id) &&
          !isKindLocked(toolbarState.canvasDebug, object.kind)
      ),
    [selectedObjectIds, toolbarState.canvasDebug]
  );

  const resolveCopyAnchor = useCallback(
    (sourceObjects: SceneObject[]): { x: number; y: number } | null => {
      const fallbackOffset = toolbarState.canvasDebug.snapGrid
        ? Math.max(0.1, workspaceOptions.snapGridStep)
        : 0.35;
      return sceneViewportPort.resolveCopyAnchor({
        cursorAnchor: lastPointerWorldRef.current,
        sourcePoints: sourceObjects.map((object) => ({ x: object.x, y: object.y })),
        fallbackOffset
      });
    },
    [
      sceneViewportPort,
      toolbarState.canvasDebug.snapGrid,
      workspaceOptions.snapGridStep
    ]
  );

  const duplicateObjects = useCallback(
    (
      sourceObjects: SceneObject[],
      source: string,
      anchorOverride?: { x: number; y: number }
    ): SceneObject[] => {
      if (sourceObjects.length === 0) {
        trackTelemetry("scene.objects.copy_skipped", {
          userId,
          source,
          reason: "empty_source"
        });
        return [];
      }

      const anchor = anchorOverride ?? resolveCopyAnchor(sourceObjects);
      const translation = anchor
        ? sceneViewportPort.computeCopyTranslation({
            sourcePoints: sourceObjects.map((object) => ({ x: object.x, y: object.y })),
            anchor,
            snapGrid: toolbarState.canvasDebug.snapGrid,
            snapGridStep: workspaceOptions.snapGridStep
          })
        : null;
      if (!anchor || !translation) {
        trackTelemetry("scene.objects.copy_skipped", {
          userId,
          source,
          reason: "anchor_unresolved"
        });
        return [];
      }

      const copies = sourceObjects.map((sourceObject) => {
        const nextSequence = nextObjectSequenceRef.current;
        nextObjectSequenceRef.current += 1;
        const sourceSnapshot = cloneSceneObject(sourceObject);

        const copy = sceneViewportPort.createObject(
          sourceObject.kind,
          sourceObject.x + translation.x,
          sourceObject.y + translation.y,
          nextSequence
        );
        copy.name = sourceSnapshot.name;
        copy.resRef = sourceObject.resRef;
        copy.tag = `${sourceObject.tag}_COPY`;
        copy.isStatic = sourceSnapshot.isStatic;
        copy.visualTransform = { ...sourceSnapshot.visualTransform };
        copy.placeableProperties = sourceSnapshot.placeableProperties
          ? {
              ...sourceSnapshot.placeableProperties,
              scriptSlots: sourceSnapshot.placeableProperties.scriptSlots
                ? { ...sourceSnapshot.placeableProperties.scriptSlots }
                : undefined,
              disabledFlags: sourceSnapshot.placeableProperties.disabledFlags
                ? { ...sourceSnapshot.placeableProperties.disabledFlags }
                : undefined,
              lockSettings: sourceSnapshot.placeableProperties.lockSettings
                ? { ...sourceSnapshot.placeableProperties.lockSettings }
                : undefined,
              trapSettings: sourceSnapshot.placeableProperties.trapSettings
                ? { ...sourceSnapshot.placeableProperties.trapSettings }
                : undefined,
              advancedSettings: sourceSnapshot.placeableProperties.advancedSettings
                ? { ...sourceSnapshot.placeableProperties.advancedSettings }
                : undefined
            }
          : undefined;
        copy.creatureProperties = sourceSnapshot.creatureProperties
          ? {
              ...sourceSnapshot.creatureProperties,
              statistics: sourceSnapshot.creatureProperties.statistics
                ? {
                    ...sourceSnapshot.creatureProperties.statistics,
                    abilityScores: { ...sourceSnapshot.creatureProperties.statistics.abilityScores },
                    racialModifiers: {
                      ...sourceSnapshot.creatureProperties.statistics.racialModifiers
                    },
                    saves: { ...sourceSnapshot.creatureProperties.statistics.saves }
                  }
                : undefined,
              appearanceSettings: sourceSnapshot.creatureProperties.appearanceSettings
                ? { ...sourceSnapshot.creatureProperties.appearanceSettings }
                : undefined,
              classEntries: sourceSnapshot.creatureProperties.classEntries
                ? sourceSnapshot.creatureProperties.classEntries.map((entry) => ({ ...entry }))
                : undefined,
              skills: sourceSnapshot.creatureProperties.skills
                ? sourceSnapshot.creatureProperties.skills.map((entry) => ({ ...entry }))
                : undefined,
              scriptSlots: sourceSnapshot.creatureProperties.scriptSlots
                ? { ...sourceSnapshot.creatureProperties.scriptSlots }
                : undefined,
              advancedSettings: sourceSnapshot.creatureProperties.advancedSettings
                ? { ...sourceSnapshot.creatureProperties.advancedSettings }
                : undefined,
              feats: sourceSnapshot.creatureProperties.feats
                ? sourceSnapshot.creatureProperties.feats.map((entry) => ({ ...entry }))
                : undefined,
              spells: sourceSnapshot.creatureProperties.spells
                ? sourceSnapshot.creatureProperties.spells.map((entry) => ({ ...entry }))
                : undefined,
              specialAbilities: sourceSnapshot.creatureProperties.specialAbilities
                ? sourceSnapshot.creatureProperties.specialAbilities.map((entry) => ({ ...entry }))
                : undefined
            }
          : undefined;
        copy.soundPositioning = sourceSnapshot.soundPositioning
          ? {
              ...sourceSnapshot.soundPositioning,
              preserve: sourceSnapshot.soundPositioning.preserve
                ? {
                    ...sourceSnapshot.soundPositioning.preserve,
                    flags: { ...sourceSnapshot.soundPositioning.preserve.flags },
                    extra: { ...sourceSnapshot.soundPositioning.preserve.extra }
                  }
                : undefined
            }
          : undefined;
        copy.doorTransition = sourceSnapshot.doorTransition
          ? {
              ...sourceSnapshot.doorTransition,
              flags: { ...sourceSnapshot.doorTransition.flags }
            }
          : undefined;
        copy.vfxPayload = sourceSnapshot.vfxPayload
          ? {
              ...sourceSnapshot.vfxPayload,
              flags: { ...sourceSnapshot.vfxPayload.flags },
              extra: { ...sourceSnapshot.vfxPayload.extra }
            }
          : undefined;
        copy.z = toolbarState.canvasDebug.snapHeight
          ? snapHeightValue(sourceObject.z, workspaceOptions.snapHeightStep)
          : sourceObject.z;
        copy.bearing = toolbarState.canvasDebug.snapAngle
          ? snapAngleRadians(sourceObject.bearing, workspaceOptions.snapAngleStepDeg)
          : sourceObject.bearing;
        return copy;
      });

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.appendObjects(current.present, copies)
        )
      );
      setSelectedObjectIds(copies.map((object) => object.id));
      setSelectedTileId(null);
      trackTelemetry("scene.objects.copy_created", {
        userId,
        source,
        copiedCount: copies.length,
        anchorX: anchor.x,
        anchorY: anchor.y,
        preservedGeometry: true
      });
      return copies;
    },
    [
      cloneSceneObject,
      resolveCopyAnchor,
      sceneViewportPort,
      toolbarState.canvasDebug.snapAngle,
      toolbarState.canvasDebug.snapHeight,
      userId,
      workspaceOptions.snapAngleStepDeg,
      workspaceOptions.snapGridStep,
      workspaceOptions.snapHeightStep
    ]
  );

  const copySelectedObjectsToClipboard = useCallback(
    (source: string): SceneObject[] => {
      const selected = getUnlockedSelectedObjects(scene.objects);
      clipboardObjectsRef.current = selected.map((object) => cloneSceneObject(object));
      trackTelemetry("scene.clipboard.copied", {
        userId,
        source,
        copiedCount: selected.length
      });
      return selected;
    },
    [cloneSceneObject, getUnlockedSelectedObjects, scene.objects, userId]
  );

  const pasteClipboardObjects = useCallback(
    (source: string): SceneObject[] => {
      const clipboardObjects = clipboardObjectsRef.current
        .map((object) => cloneSceneObject(object))
        .filter((object) => !isKindLocked(toolbarState.canvasDebug, object.kind));

      if (clipboardObjects.length === 0) {
        trackTelemetry("scene.clipboard.paste_skipped", {
          userId,
          source,
          reason: "clipboard_empty_or_locked"
        });
        return [];
      }

      return duplicateObjects(clipboardObjects, source, resolveCopyAnchor(clipboardObjects) ?? undefined);
    },
    [
      cloneSceneObject,
      duplicateObjects,
      resolveCopyAnchor,
      toolbarState.canvasDebug,
      userId
    ]
  );

  const deleteSelectedObjects = useCallback(
    (source: string): number => {
      const deletableIds = getUnlockedSelectedObjects(scene.objects).map((object) => object.id);
      if (deletableIds.length === 0) {
        trackTelemetry("scene.objects.delete_skipped", {
          userId,
          source,
          reason: "selection_empty_or_locked"
        });
        return 0;
      }

      const idSet = new Set(deletableIds);
      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.deleteObjectsByIds(current.present, deletableIds)
        )
      );
      setSelectedObjectIds((current) => current.filter((id) => !idSet.has(id)));
      setSelectedTileId(null);
      trackTelemetry("scene.objects.delete", {
        userId,
        source,
        deleted: deletableIds.length
      });
      return deletableIds.length;
    },
    [
      getUnlockedSelectedObjects,
      scene.objects,
      sceneViewportPort,
      userId
    ]
  );

  const cutSelectedObjectsToClipboard = useCallback(
    (source: string): number => {
      const copied = copySelectedObjectsToClipboard(source);
      if (copied.length === 0) {
        return 0;
      }

      return deleteSelectedObjects(source);
    },
    [copySelectedObjectsToClipboard, deleteSelectedObjects]
  );

  const resolveMovableSelectionIds = useCallback(
    (targetObjectIds?: string[]): { ids: string[]; reason?: string } => {
      const targetIds = targetObjectIds ?? selectedObjectIds;
      const selectedObjects = scene.objects.filter((object) =>
        targetIds.includes(object.id)
      );
      if (selectedObjects.length === 0) {
        return { ids: [], reason: "selection_empty" };
      }

      // Aurora First parity: doors are anchor-bound and block generic move operations.
      if (selectedObjects.some((object) => object.kind === "doors")) {
        return { ids: [], reason: "selection_contains_doors" };
      }

      const unlockedMovableIds = selectedObjects
        .filter((object) => MOVE_ALLOWED_KINDS.has(object.kind))
        .filter((object) => !isKindLocked(toolbarState.canvasDebug, object.kind))
        .map((object) => object.id);

      if (unlockedMovableIds.length === 0) {
        return { ids: [], reason: "selection_locked_or_immovable" };
      }

      return { ids: unlockedMovableIds };
    },
    [scene.objects, selectedObjectIds, toolbarState.canvasDebug]
  );

  const moveSelectedObjectsByDelta = useCallback(
    (
      delta: { x: number; y: number },
      source: string,
      targetObjectIds?: string[]
    ): number => {
      if (delta.x === 0 && delta.y === 0) {
        return 0;
      }

      const resolved = resolveMovableSelectionIds(targetObjectIds);
      if (resolved.ids.length === 0) {
        trackTelemetry("scene.objects.move_skipped", {
          userId,
          source,
          reason: resolved.reason ?? "selection_unavailable"
        });
        return 0;
      }

      const movableIds = new Set(resolved.ids);
      const movableObjects = scene.objects.filter((object) => movableIds.has(object.id));
      const boundedDelta = clampTranslationDeltaToSceneBounds(scene, movableObjects, delta);
      if (boundedDelta.x === 0 && boundedDelta.y === 0) {
        trackTelemetry("scene.objects.move_skipped", {
          userId,
          source,
          reason: "scene_bounds"
        });
        return 0;
      }

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.translateObjectsByIds(
            current.present,
            resolved.ids,
            boundedDelta
          )
        )
      );
      setSelectedTileId(null);
      trackTelemetry("scene.objects.move", {
        userId,
        source,
        movedCount: resolved.ids.length,
        deltaX: boundedDelta.x,
        deltaY: boundedDelta.y
      });
      return resolved.ids.length;
    },
    [
      resolveMovableSelectionIds,
      scene,
      sceneViewportPort,
      userId
    ]
  );

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let runtime: RuntimeState;
    try {
      runtime = createRuntime(host);
    } catch {
      setWebglFallbackReason("WebGL runtime is unavailable in this environment.");
      setWebglReady(false);
      trackTelemetry("scene.webgl.init_failed", { userId });
      return;
    }

    runtimeRef.current = runtime;
    setWebglFallbackReason(null);
    setWebglReady(true);

    resizeRuntime(runtime);
    centerCameraForScene(runtime, scene);
    perfFrameRef.current = {
      frameCount: 0,
      lastTick: performance.now()
    };

    const animate = () => {
      runtime.controls.update();
      runtime.renderer.render(runtime.scene, runtime.camera);
      const now = performance.now();
      perfFrameRef.current.frameCount += 1;
      const elapsedMs = now - perfFrameRef.current.lastTick;
      if (elapsedMs >= 300) {
        const fps = Math.round((perfFrameRef.current.frameCount * 1000) / elapsedMs);
        setPerfSnapshot({
          fps,
          drawCalls: runtime.renderer.info.render.calls,
          triangles: runtime.renderer.info.render.triangles,
          geometries: runtime.renderer.info.memory.geometries,
          textures: runtime.renderer.info.memory.textures
        });
        perfFrameRef.current.frameCount = 0;
        perfFrameRef.current.lastTick = now;
      }
      runtime.frameId = requestAnimationFrame(animate);
    };
    animate();

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeRuntime(runtime);
          })
        : null;
    resizeObserver?.observe(host);
    runtime.resizeObserver = resizeObserver;

    const onWindowResize = () => resizeRuntime(runtime);
    window.addEventListener("resize", onWindowResize);

    return () => {
      window.removeEventListener("resize", onWindowResize);
      disposeRuntime(runtime);
      runtimeRef.current = null;
      setWebglReady(false);
    };
  }, [userId]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const setCtrlPan = (ctrlPanEnabled: boolean) => {
      applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled });
    };

    setCtrlPan(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Control") {
        setCtrlPan(false);
      }
    };

    const handleWindowBlur = () => {
      setCtrlPan(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
      setCtrlPan(false);
    };
  }, []);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.controls.rotateSpeed = workspaceOptions.cameraRotateSpeed;
    runtime.controls.zoomSpeed = workspaceOptions.cameraZoomSpeed;
    runtime.controls.panSpeed = workspaceOptions.cameraPanSpeed;
    runtime.controls.enableDamping = true;
    runtime.controls.dampingFactor = workspaceOptions.cameraDampingFactor;
    runtime.controls.update();
  }, [
    workspaceOptions.cameraDampingFactor,
    workspaceOptions.cameraPanSpeed,
    workspaceOptions.cameraRotateSpeed,
    workspaceOptions.cameraZoomSpeed
  ]);

  useEffect(() => {
    setSceneHistory(sceneViewportPort.createInitialHistory(userId));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = 0;
  }, [sceneViewportPort, userId]);

  useEffect(() => {
    if (!externalSceneSeed) {
      return;
    }
    setSceneHistory(sceneViewportPort.createHistoryFromScene(externalSceneSeed));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    commandRevisionRef.current = 0;
  }, [externalSceneSeed, sceneViewportPort]);

  useEffect(() => {
    nextObjectSequenceRef.current = scene.objects.length + 1;
  }, [scene.objects.length]);

  useEffect(() => {
    const scopedKind = OBJECT_KIND_BY_SCOPE[toolbarState.selectionScope];
    if (scopedKind) {
      setObjectBrush(scopedKind);
    }
  }, [toolbarState.selectionScope]);

  useEffect(() => {
    setSelectedObjectIds((current) =>
      current.filter((selectedId) => {
        if (!visibleObjectIdsSet.has(selectedId)) {
          return false;
        }
        const object = objectById.get(selectedId);
        if (!object) {
          return false;
        }
        return isSelectableByActiveFilters(object);
      })
    );
  }, [isSelectableByActiveFilters, objectById, visibleObjectIdsSet]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    const sceneScale = sceneViewportPort.getSceneScale(scene.width, scene.height);

    runtime.gridLayer.visible = toolbarState.canvasDebug.grid;
    runtime.tileOverlayLayer.visible = workspaceOptions.showTileGridOverlay;
    runtime.axesHelper.visible = toolbarState.canvasDebug.axes;
    updateAxesHelperForScene(runtime, scene, sceneScale);

    rebuildTerrainMesh(runtime, scene, selectedTileId, toolbarState.canvasDebug);
    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      selectedObjectIds,
      toolbarState.canvasDebug,
      sceneScale,
      adjustLocationUnitsPerTile,
      runtimeSoundNowPlayingBadges,
      workspaceOptions.showRuntimeSoundNowPlaying
    );
    rebuildChunkBounds(runtime, scene, toolbarState.canvasDebug.chunkBounds);
    rebuildGizmoOverlay(
      runtime,
      selectedObjectIds,
      objectById,
      toolbarState.canvasDebug,
      sceneScale
    );
    rebuildGridLayer(runtime, scene, viewportFacade, workspaceOptions.showTileGridOverlay);
    runtime.gridLayer.visible = toolbarState.canvasDebug.grid;
    runtime.tileOverlayLayer.visible = workspaceOptions.showTileGridOverlay;
  }, [
    objectById,
    sceneViewportPort,
    scene,
    selectedObjectIds,
    selectedTileId,
    toolbarState.canvasDebug,
    viewportFacade,
    runtimeSoundNowPlayingBadges,
    workspaceOptions.showRuntimeSoundNowPlaying,
    workspaceOptions.showTileGridOverlay,
    visibleObjects
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const transformControls = runtime.transformControls;
    const gizmoMode = toolbarState.canvasDebug.gizmoMode;
    const transformControlsMode = resolveTransformControlsMode(gizmoMode);
    const visualTransformMode = isVisualTransformGizmoMode(gizmoMode);

    if (transformControls.dragging && transformGestureRef.current.active) {
      return;
    }

    if (!transformControlsMode) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const selectedObjects = selectedObjectIds
      .map((id) => objectById.get(id))
      .filter((object): object is SceneObject => Boolean(object));
    if (selectedObjects.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    let transformableObjects: SceneObject[] = [];
    if (visualTransformMode) {
      const blockedReason = resolveVisualTransformSelectionBlockedReason(
        selectedObjects,
        toolbarState.canvasDebug
      );
      if (blockedReason) {
        transformGestureRef.current = createIdleTransformGestureState();
        transformControls.detach();
        transformControls.enabled = false;
        return;
      }
      transformableObjects = selectedObjects;
    } else {
      if (selectedObjects.some((object) => object.kind === "doors")) {
        transformGestureRef.current = createIdleTransformGestureState();
        transformControls.detach();
        transformControls.enabled = false;
        return;
      }

      transformableObjects = selectedObjects.filter(
        (object) =>
          MOVE_ALLOWED_KINDS.has(object.kind) &&
          !isKindLocked(toolbarState.canvasDebug, object.kind)
      );
    }

    if (transformableObjects.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const movableIdsSet = new Set(transformableObjects.map((object) => object.id));
    const movableMeshes = selectedObjectIds
      .filter((id) => movableIdsSet.has(id))
      .map((id) => runtime.objectMeshById.get(id))
      .filter((mesh): mesh is THREE.Mesh => Boolean(mesh));
    if (movableMeshes.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const center = new THREE.Vector3();
    movableMeshes.forEach((mesh) => {
      center.add(mesh.position);
    });
    center.divideScalar(movableMeshes.length);
    runtime.transformAnchor.position.copy(center);
    runtime.transformAnchor.rotation.set(0, 0, 0);
    runtime.transformAnchor.scale.set(1, 1, 1);
    runtime.transformAnchor.updateMatrixWorld();

    transformControls.enabled = true;
    transformControls.setSpace("world");
    transformControls.setMode(transformControlsMode);
    applyTransformControlsPalette(transformControls, gizmoMode);
    const axisVisibility = resolveTransformControlAxisVisibility(gizmoMode);
    transformControls.showX = axisVisibility.showX;
    transformControls.showY = axisVisibility.showY;
    transformControls.showZ = axisVisibility.showZ;
    // Keep gizmo interaction continuous/predictable; keyboard nudges still use snap rules.
    transformControls.setTranslationSnap(null);
    transformControls.setRotationSnap(null);
    transformControls.attach(runtime.transformAnchor);
  }, [
    objectById,
    selectedObjectIds,
    toolbarState.canvasDebug
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const transformControls = runtime.transformControls;
    const epsilon = 1e-5;

    const handleDraggingChanged = (event: { value?: unknown }) => {
      const isDragging = Boolean(event.value);
      runtime.controls.enabled = !isDragging;
    };

    const startTransformGesture = () => {
      const mode = transformControls.getMode() as "translate" | "rotate" | "scale";
      const applyVisualTransform = isVisualTransformGizmoMode(toolbarState.canvasDebug.gizmoMode);
      const selectedObjects = selectedObjectIds
        .map((id) => objectById.get(id))
        .filter((object): object is SceneObject => Boolean(object));
      if (selectedObjects.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (applyVisualTransform) {
        const blockedReason = resolveVisualTransformSelectionBlockedReason(
          selectedObjects,
          toolbarState.canvasDebug
        );
        if (blockedReason) {
          transformGestureRef.current = createIdleTransformGestureState();
          return;
        }
      }

      const objectIds = selectedObjects
        .filter((object) => {
          if (applyVisualTransform) {
            return (
              canUseVisualTransformGizmoForObject(object) &&
              !isKindLocked(toolbarState.canvasDebug, object.kind)
            );
          }
          return (
            MOVE_ALLOWED_KINDS.has(object.kind) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
          );
        })
        .map((object) => object.id);
      if (objectIds.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      const sourceObjects = objectIds
        .map((id) => objectById.get(id))
        .filter((object): object is SceneObject => Boolean(object))
        .map(cloneSceneObject);
      if (sourceObjects.length === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      const sourceMeshPositions = new Map<string, THREE.Vector3>();
      const sourceMeshRotations = new Map<string, THREE.Euler>();
      const sourceMeshScales = new Map<string, THREE.Vector3>();
      objectIds.forEach((id) => {
        const mesh = runtime.objectMeshById.get(id);
        if (!mesh) {
          return;
        }
        sourceMeshPositions.set(id, mesh.position.clone());
        sourceMeshRotations.set(id, mesh.rotation.clone());
        sourceMeshScales.set(id, mesh.scale.clone());
      });

      if (sourceMeshPositions.size === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      transformGestureRef.current = {
        active: true,
        mode,
        applyVisualTransform,
        axis: transformControls.axis,
        objectIds,
        startAnchorPosition: runtime.transformAnchor.position.clone(),
        startAnchorRotationY: runtime.transformAnchor.rotation.y,
        startAnchorEuler: runtime.transformAnchor.rotation.clone(),
        startAnchorQuaternion: runtime.transformAnchor.quaternion.clone(),
        startAnchorScale: runtime.transformAnchor.scale.clone(),
        sourceObjects,
        sourceMeshPositions,
        sourceMeshRotations,
        sourceMeshScales,
        deltaX: 0,
        deltaY: 0,
        deltaZ: 0,
        deltaBearingRad: 0,
        deltaPitchRad: 0,
        deltaYawRad: 0,
        deltaRollRad: 0,
        deltaScaleFactor: 1
      };
    };

    const handleMouseDown = () => {
      startTransformGesture();
    };

    const handleMouseUp = () => {
      const resetTransformAnchor = () => {
        runtime.transformAnchor.scale.set(1, 1, 1);
        runtime.transformAnchor.updateMatrixWorld();
      };
      const gesture = transformGestureRef.current;
      if (!gesture.active || gesture.objectIds.length === 0) {
        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "translate") {
        const deltaX = gesture.deltaX;
        const deltaY = gesture.deltaY;
        const deltaZ = gesture.deltaZ;
        const hasMoveDelta =
          Math.abs(deltaX) > epsilon || Math.abs(deltaY) > epsilon || Math.abs(deltaZ) > epsilon;

        if (hasMoveDelta) {
          if (gesture.applyVisualTransform) {
            const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
            setSceneHistory((current) => {
              let nextScene = current.present;
              gesture.objectIds.forEach((id) => {
                const sourceObject = sourceById.get(id);
                if (!sourceObject) {
                  return;
                }
                nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                  scale: sourceObject.visualTransform.scale,
                  offsetX: sourceObject.visualTransform.offsetX + deltaX,
                  offsetY: sourceObject.visualTransform.offsetY + deltaY,
                  offsetZ: sourceObject.visualTransform.offsetZ + deltaZ,
                  pitch: sourceObject.visualTransform.pitch,
                  yaw: sourceObject.visualTransform.yaw,
                  roll: sourceObject.visualTransform.roll
                });
              });
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.vt_translate", {
              userId,
              source: "gizmo_vt_translate",
              movedCount: gesture.objectIds.length,
              deltaX,
              deltaY,
              deltaZ
            });
          } else {
            setSceneHistory((current) => {
              let nextScene = current.present;
              if (Math.abs(deltaX) > epsilon || Math.abs(deltaY) > epsilon) {
                nextScene = sceneViewportPort.translateObjectsByIds(nextScene, gesture.objectIds, {
                  x: deltaX,
                  y: deltaY
                });
              }
              if (Math.abs(deltaZ) > epsilon) {
                nextScene = sceneViewportPort.adjustObjectsHeightByIds(
                  nextScene,
                  gesture.objectIds,
                  deltaZ
                );
              }
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.move", {
              userId,
              source: "gizmo_translate",
              movedCount: gesture.objectIds.length,
              deltaX,
              deltaY,
              deltaZ
            });
          }
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "rotate") {
        if (gesture.applyVisualTransform) {
          const deltaPitchRad = gesture.deltaPitchRad;
          const deltaYawRad = gesture.deltaYawRad;
          const deltaRollRad = gesture.deltaRollRad;
          const hasRotationDelta =
            Math.abs(deltaPitchRad) > epsilon ||
            Math.abs(deltaYawRad) > epsilon ||
            Math.abs(deltaRollRad) > epsilon;
          if (hasRotationDelta) {
            const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
            setSceneHistory((current) => {
              let nextScene = current.present;
              gesture.objectIds.forEach((id) => {
                const sourceObject = sourceById.get(id);
                if (!sourceObject) {
                  return;
                }
                nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                  scale: sourceObject.visualTransform.scale,
                  offsetX: sourceObject.visualTransform.offsetX,
                  offsetY: sourceObject.visualTransform.offsetY,
                  offsetZ: sourceObject.visualTransform.offsetZ,
                  pitch: sourceObject.visualTransform.pitch + deltaPitchRad,
                  yaw: sourceObject.visualTransform.yaw + deltaYawRad,
                  roll: sourceObject.visualTransform.roll + deltaRollRad
                });
              });
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.vt_rotate", {
              userId,
              source: "gizmo_vt_rotate",
              rotatedCount: gesture.objectIds.length,
              deltaPitchRad,
              deltaYawRad,
              deltaRollRad
            });
          }
        } else {
          const deltaBearingRad = gesture.deltaBearingRad;
          const hasRotationDelta = Math.abs(deltaBearingRad) > epsilon;
          if (hasRotationDelta) {
            setSceneHistory((current) => {
              const nextScene = sceneViewportPort.rotateObjectsBearingByIds(
                current.present,
                gesture.objectIds,
                deltaBearingRad
              );
              if (nextScene === current.present) {
                return current;
              }
              return sceneViewportPort.commitHistory(current, nextScene);
            });
            setSelectedTileId(null);
            trackTelemetry("scene.objects.rotate_bearing", {
              userId,
              source: "gizmo_rotate_bearing_y",
              rotatedCount: gesture.objectIds.length,
              deltaBearingRad
            });
          }
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "scale") {
        const scaleFactor = gesture.deltaScaleFactor;
        const hasScaleDelta = Math.abs(scaleFactor - 1) > epsilon;
        if (hasScaleDelta && gesture.applyVisualTransform) {
          const sourceById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
          setSceneHistory((current) => {
            let nextScene = current.present;
            gesture.objectIds.forEach((id) => {
              const sourceObject = sourceById.get(id);
              if (!sourceObject) {
                return;
              }
              nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, [id], {
                scale: sourceObject.visualTransform.scale * scaleFactor,
                offsetX: sourceObject.visualTransform.offsetX,
                offsetY: sourceObject.visualTransform.offsetY,
                offsetZ: sourceObject.visualTransform.offsetZ,
                pitch: sourceObject.visualTransform.pitch,
                yaw: sourceObject.visualTransform.yaw,
                roll: sourceObject.visualTransform.roll
              });
            });
            if (nextScene === current.present) {
              return current;
            }
            return sceneViewportPort.commitHistory(current, nextScene);
          });
          setSelectedTileId(null);
          trackTelemetry("scene.objects.vt_scale", {
            userId,
            source: "gizmo_vt_scale",
            scaledCount: gesture.objectIds.length,
            scaleFactor
          });
        }

        resetTransformAnchor();
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      resetTransformAnchor();
      transformGestureRef.current = createIdleTransformGestureState();
    };

    const handleObjectChange = () => {
      let gesture = transformGestureRef.current;
      if ((!gesture.active || gesture.objectIds.length === 0) && transformControls.dragging) {
        startTransformGesture();
        gesture = transformGestureRef.current;
      }
      if (!gesture.active || gesture.objectIds.length === 0) {
        return;
      }

      if (gesture.mode === "translate") {
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }
        const axis = transformControls.axis ?? gesture.axis ?? "";
        const deltas = resolveGizmoTranslationDeltas(
          gesture.startAnchorPosition,
          runtime.transformAnchor.position,
          axis,
          { vtMode: gesture.applyVisualTransform }
        );
        const deltaX = Math.abs(deltas.deltaX) > epsilon ? deltas.deltaX : 0;
        const deltaY = Math.abs(deltas.deltaY) > epsilon ? deltas.deltaY : 0;
        const deltaZ = Math.abs(deltas.deltaZ) > epsilon ? deltas.deltaZ : 0;

        const boundedDelta = gesture.applyVisualTransform
          ? { x: deltaX, y: deltaY }
          : clampTranslationDeltaToSceneBounds(scene, gesture.sourceObjects, {
              x: deltaX,
              y: deltaY
            });
        const boundedDeltaZ = clampHeightDeltaToSurface(gesture.sourceObjects, deltaZ);

        gesture.deltaX = boundedDelta.x;
        gesture.deltaY = boundedDelta.y;
        gesture.deltaZ = boundedDeltaZ;

        const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourcePosition = gesture.sourceMeshPositions.get(id);
          if (!mesh || !sourcePosition) {
            return;
          }
          const sourceObject = sourceObjectById.get(id);
          const freezeVisualXY =
            gesture.applyVisualTransform &&
            sourceObject?.kind === "placeables" &&
            (sourceObject.isStatic ?? true);
          const previewDeltaX = freezeVisualXY ? 0 : boundedDelta.x;
          const previewDeltaY = freezeVisualXY ? 0 : boundedDelta.y;
          mesh.position.set(
            sourcePosition.x + previewDeltaX,
            sourcePosition.y + boundedDeltaZ,
            sourcePosition.z + previewDeltaY
          );
        });

        const expectedAnchorX = gesture.startAnchorPosition.x + boundedDelta.x;
        const expectedAnchorY = gesture.startAnchorPosition.y + boundedDeltaZ;
        const expectedAnchorZ = gesture.startAnchorPosition.z + boundedDelta.y;
        if (
          Math.abs(runtime.transformAnchor.position.x - expectedAnchorX) > epsilon ||
          Math.abs(runtime.transformAnchor.position.y - expectedAnchorY) > epsilon ||
          Math.abs(runtime.transformAnchor.position.z - expectedAnchorZ) > epsilon
        ) {
          runtime.transformAnchor.position.set(expectedAnchorX, expectedAnchorY, expectedAnchorZ);
          runtime.transformAnchor.updateMatrixWorld();
        }
        return;
      }

      if (gesture.mode === "rotate") {
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }
        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        if (gesture.applyVisualTransform) {
          const applyAllAxes = axis.length === 0 || axis === "XYZE" || axis === "E";
          const deltaPitchRadRaw = runtime.transformAnchor.rotation.x - gesture.startAnchorEuler.x;
          const deltaYawRadRaw = runtime.transformAnchor.rotation.y - gesture.startAnchorEuler.y;
          const deltaRollRadRaw = runtime.transformAnchor.rotation.z - gesture.startAnchorEuler.z;
          const deltaPitchRad =
            (applyAllAxes || axis.includes("X")) && Math.abs(deltaPitchRadRaw) > epsilon
              ? deltaPitchRadRaw
              : 0;
          const deltaYawRad =
            (applyAllAxes || axis.includes("Y")) && Math.abs(deltaYawRadRaw) > epsilon
              ? deltaYawRadRaw
              : 0;
          const deltaRollRad =
            (applyAllAxes || axis.includes("Z")) && Math.abs(deltaRollRadRaw) > epsilon
              ? deltaRollRadRaw
              : 0;
          gesture.deltaPitchRad = deltaPitchRad;
          gesture.deltaYawRad = deltaYawRad;
          gesture.deltaRollRad = deltaRollRad;

          const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
          gesture.objectIds.forEach((id) => {
            const mesh = runtime.objectMeshById.get(id);
            const sourceRotation = gesture.sourceMeshRotations.get(id);
            if (!mesh || !sourceRotation) {
              return;
            }
            const sourceObject = sourceObjectById.get(id);
            const freezeVisualRotation =
              sourceObject?.kind === "placeables" && (sourceObject.isStatic ?? true);
            const previewDeltaPitch = freezeVisualRotation ? 0 : deltaPitchRad;
            const previewDeltaYaw = freezeVisualRotation ? 0 : deltaYawRad;
            const previewDeltaRoll = freezeVisualRotation ? 0 : deltaRollRad;
            mesh.rotation.set(
              sourceRotation.x + previewDeltaPitch,
              sourceRotation.y + previewDeltaYaw,
              sourceRotation.z + previewDeltaRoll
            );
          });
          return;
        }

        const supportsBearingDelta =
          axis.length === 0 || axis.includes("Y") || axis === "E" || axis === "XYZE";
        let deltaBearingRad = 0;
        if (supportsBearingDelta) {
          const up = new THREE.Vector3(0, 1, 0);
          const forward = new THREE.Vector3(0, 0, 1);
          const startForward = forward.applyQuaternion(gesture.startAnchorQuaternion);
          const currentForward = new THREE.Vector3(0, 0, 1).applyQuaternion(
            runtime.transformAnchor.quaternion
          );
          startForward.y = 0;
          currentForward.y = 0;
          if (startForward.lengthSq() > epsilon && currentForward.lengthSq() > epsilon) {
            startForward.normalize();
            currentForward.normalize();
            const cross = new THREE.Vector3().crossVectors(startForward, currentForward);
            const dot = THREE.MathUtils.clamp(startForward.dot(currentForward), -1, 1);
            deltaBearingRad = Math.atan2(cross.dot(up), dot);
          } else {
            deltaBearingRad = runtime.transformAnchor.rotation.y - gesture.startAnchorRotationY;
          }
          if (Math.abs(deltaBearingRad) <= epsilon) {
            deltaBearingRad = 0;
          }
        }
        gesture.deltaBearingRad = deltaBearingRad;

        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourceRotation = gesture.sourceMeshRotations.get(id);
          if (!mesh || !sourceRotation) {
            return;
          }
          mesh.rotation.set(
            sourceRotation.x,
            sourceRotation.y + deltaBearingRad,
            sourceRotation.z
          );
        });
        return;
      }

      if (gesture.mode === "scale") {
        if (!gesture.applyVisualTransform) {
          return;
        }
        if (transformControls.axis) {
          gesture.axis = transformControls.axis;
        }

        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        const clampedScaleFactor = resolveVtScaleFactorFromAnchor(
          gesture.startAnchorScale,
          runtime.transformAnchor.scale,
          axis
        );
        gesture.deltaScaleFactor = clampedScaleFactor;

        const sourceObjectById = new Map(gesture.sourceObjects.map((object) => [object.id, object]));
        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourceScaleForMesh = gesture.sourceMeshScales.get(id);
          if (!mesh || !sourceScaleForMesh) {
            return;
          }
          const sourceObject = sourceObjectById.get(id);
          const freezeVisualScale =
            sourceObject?.kind === "placeables" && (sourceObject.isStatic ?? true);
          const previewScaleFactor = freezeVisualScale ? 1 : clampedScaleFactor;
          mesh.scale.set(
            sourceScaleForMesh.x * previewScaleFactor,
            sourceScaleForMesh.y * previewScaleFactor,
            sourceScaleForMesh.z * previewScaleFactor
          );
        });
      }
    };

    transformControls.addEventListener("dragging-changed", handleDraggingChanged);
    transformControls.addEventListener("mouseDown", handleMouseDown);
    transformControls.addEventListener("mouseUp", handleMouseUp);
    transformControls.addEventListener("objectChange", handleObjectChange);

    return () => {
      transformControls.removeEventListener("dragging-changed", handleDraggingChanged);
      transformControls.removeEventListener("mouseDown", handleMouseDown);
      transformControls.removeEventListener("mouseUp", handleMouseUp);
      transformControls.removeEventListener("objectChange", handleObjectChange);
    };
  }, [
    cloneSceneObject,
    objectById,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug,
    trackTelemetry,
    userId
  ]);

  const focusCameraOnWorldPoint = useCallback((worldX: number, worldY: number) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }
    focusCameraOnPoint(runtime, worldX, worldY);
  }, []);

  useEffect(() => {
    if (!commandSignal || commandSignal.revision <= commandRevisionRef.current) {
      return;
    }

    commandRevisionRef.current = commandSignal.revision;

    if (commandSignal.actionKey === "undo") {
      setSceneHistory((current) => sceneViewportPort.undoHistory(current));
      trackTelemetry("scene.undo", { userId });
      return;
    }

    if (commandSignal.actionKey === "redo") {
      setSceneHistory((current) => sceneViewportPort.redoHistory(current));
      trackTelemetry("scene.redo", { userId });
      return;
    }

    if (commandSignal.actionKey === "reorient_camera") {
      const runtime = runtimeRef.current;
      if (runtime) {
        centerCameraForScene(runtime, scene);
      }
      trackTelemetry("scene.camera.reorient", {
        userId,
        sceneId: scene.sceneId
      });
      return;
    }

    if (commandSignal.actionKey === "save_local_draft") {
      try {
        sceneViewportPort.saveLocalDraft(userId, scene);
        const savedAt = Date.now();
        setLastSavedAtUnixMs(savedAt);
        trackTelemetry("scene.save_local_draft", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length,
          tileCount: scene.tiles.length
        });
      } catch {
        trackTelemetry("scene.save_local_draft_failed", {
          userId,
          sceneId: scene.sceneId
        });
      }
      return;
    }

    if (commandSignal.actionKey === "copy_selected_objects") {
      const copied = copySelectedObjectsToClipboard("toolbar_canvas");
      if (copied.length > 0) {
        duplicateObjects(copied, "toolbar_canvas");
      }
      return;
    }

    if (commandSignal.actionKey === "delete_selected_objects") {
      deleteSelectedObjects("toolbar_canvas");
      return;
    }

    if (commandSignal.actionKey === "select_same_resref") {
      const anchor = scene.objects.find((object) => selectedObjectIds.includes(object.id)) ?? null;
      if (anchor) {
        const nextIds = visibleObjects
          .filter(
            (object) =>
              object.resRef === anchor.resRef &&
              isSelectableByActiveFilters(object) &&
              !isKindLocked(toolbarState.canvasDebug, object.kind)
          )
          .map((object) => object.id);
        setSelectedObjectIds(nextIds);
        setSelectedTileId(null);
        trackTelemetry("scene.selection.same_resref", {
          userId,
          anchorObjectId: anchor.id,
          selectedCount: nextIds.length
        });
      }
      return;
    }

    if (commandSignal.actionKey === "select_invert") {
      const selectable = visibleObjects
        .filter(
          (object) =>
            isSelectableByActiveFilters(object) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
        )
        .map((object) => object.id);
      const selectedSet = new Set(selectedObjectIds);
      const inverted = selectable.filter((id) => !selectedSet.has(id));
      setSelectedObjectIds(inverted);
      setSelectedTileId(null);
      trackTelemetry("scene.selection.invert", {
        userId,
        selectedCount: inverted.length
      });
      return;
    }

    if (commandSignal.actionKey === "select_radius") {
      const selected = scene.objects.filter((object) => selectedObjectIds.includes(object.id));
      if (selected.length > 0) {
        const centerX = selected.reduce((sum, object) => sum + object.x, 0) / selected.length;
        const centerY = selected.reduce((sum, object) => sum + object.y, 0) / selected.length;
        const radius = 3.6;
        const nextIds = visibleObjects
          .filter((object) => {
            if (
              isKindLocked(toolbarState.canvasDebug, object.kind) ||
              !isSelectableByActiveFilters(object)
            ) {
              return false;
            }
            const dx = object.x - centerX;
            const dy = object.y - centerY;
            return dx * dx + dy * dy <= radius * radius;
          })
          .map((object) => object.id);
        setSelectedObjectIds(nextIds);
        trackTelemetry("scene.selection.radius", {
          userId,
          selectedCount: nextIds.length,
          radius
        });
      }
      return;
    }

    if (commandSignal.actionKey === "camera_bookmark_save_1") {
      const runtime = runtimeRef.current;
      if (runtime) {
        bookmark1Ref.current = {
          position: runtime.camera.position.clone(),
          target: runtime.controls.target.clone()
        };
        trackTelemetry("scene.camera.bookmark_saved", {
          userId,
          slot: 1
        });
      }
      return;
    }

    if (commandSignal.actionKey === "camera_bookmark_load_1") {
      const runtime = runtimeRef.current;
      const bookmark = bookmark1Ref.current;
      if (runtime && bookmark) {
        runtime.camera.position.copy(bookmark.position);
        runtime.controls.target.copy(bookmark.target);
        runtime.controls.update();
        trackTelemetry("scene.camera.bookmark_loaded", {
          userId,
          slot: 1
        });
      } else {
        trackTelemetry("scene.camera.bookmark_missing", {
          userId,
          slot: 1
        });
      }
      return;
    }

    if (commandSignal.actionKey === "debug_export_status_report") {
      const statusByKind = scene.objects.reduce<Record<SceneObjectKind, Record<MockRenderStatus, number>>>(
        (acc, object) => {
          const status = resolveMockRenderStatus(object);
          acc[object.kind][status] += 1;
          return acc;
        },
        {
          creatures: { ok: 0, warning: 0, error: 0, non_render: 0 },
          doors: { ok: 0, warning: 0, error: 0, non_render: 0 },
          items: { ok: 0, warning: 0, error: 0, non_render: 0 },
          placeables: { ok: 0, warning: 0, error: 0, non_render: 0 },
          sounds: { ok: 0, warning: 0, error: 0, non_render: 0 }
        }
      );

      const report = {
        generatedAtIso: new Date().toISOString(),
        sceneId: scene.sceneId,
        areaName: scene.areaName,
        objectCount: scene.objects.length,
        tileCount: scene.tiles.length,
        statusByKind
      };

      try {
        const blob = new Blob([JSON.stringify(report, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `${scene.sceneId}_status_report.json`;
        anchor.click();
        URL.revokeObjectURL(url);
        trackTelemetry("scene.debug.export_status_report", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length
        });
      } catch {
        trackTelemetry("scene.debug.export_status_report_failed", {
          userId,
          sceneId: scene.sceneId
        });
      }
      return;
    }
  }, [
    copySelectedObjectsToClipboard,
    commandSignal,
    deleteSelectedObjects,
    duplicateObjects,
    isSelectableByActiveFilters,
    scene,
    sceneViewportPort,
    selectedObjectIds,
    toolbarState.canvasDebug,
    toolbarState.selectionScope,
    userId,
    visibleObjects
  ]);

  useEffect(() => {
    const handleKeyboardObjectActions = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const isMeta = event.ctrlKey || event.metaKey;
      const lowerKey = event.key.toLowerCase();

      if (isMeta && lowerKey === "c") {
        event.preventDefault();
        copySelectedObjectsToClipboard("keyboard_shortcut");
        return;
      }

      if (isMeta && lowerKey === "x") {
        event.preventDefault();
        cutSelectedObjectsToClipboard("keyboard_shortcut");
        return;
      }

      if (isMeta && lowerKey === "v") {
        event.preventDefault();
        pasteClipboardObjects("keyboard_shortcut");
        return;
      }

      if (
        (event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "ArrowLeft" ||
          event.key === "ArrowRight") &&
        selectedObjectIds.length > 0
      ) {
        const baseStep = toolbarState.canvasDebug.snapGrid
          ? Math.max(0.1, workspaceOptions.snapGridStep)
          : 0.1;
        const step = event.shiftKey ? baseStep * 2 : baseStep;
        let deltaX = 0;
        let deltaY = 0;

        if (event.key === "ArrowUp") {
          deltaY = step;
        } else if (event.key === "ArrowDown") {
          deltaY = -step;
        } else if (event.key === "ArrowLeft") {
          deltaX = -step;
        } else if (event.key === "ArrowRight") {
          deltaX = step;
        }

        event.preventDefault();
        moveSelectedObjectsByDelta({ x: deltaX, y: deltaY }, "keyboard_shortcut_nudge");
        return;
      }

      if ((event.key !== "Delete" && event.key !== "Backspace") || selectedObjectIds.length === 0) {
        return;
      }

      event.preventDefault();
      deleteSelectedObjects("keyboard_shortcut");
    };

    window.addEventListener("keydown", handleKeyboardObjectActions);
    return () => window.removeEventListener("keydown", handleKeyboardObjectActions);
  }, [
    copySelectedObjectsToClipboard,
    cutSelectedObjectsToClipboard,
    deleteSelectedObjects,
    moveSelectedObjectsByDelta,
    pasteClipboardObjects,
    selectedObjectIds.length,
    toolbarState.canvasDebug.snapGrid,
    workspaceOptions.snapGridStep
  ]);

  const commitBoxSelection = useCallback(
    (box: SelectionBoxState, ctrlAdditive: boolean) => {
      const runtime = runtimeRef.current;
      if (!runtime || !box.active) {
        return;
      }

      const minX = Math.min(box.startX, box.currentX);
      const maxX = Math.max(box.startX, box.currentX);
      const minY = Math.min(box.startY, box.currentY);
      const maxY = Math.max(box.startY, box.currentY);

      const idsInBox = visibleObjects
        .filter(
          (object) =>
            isSelectableByActiveFilters(object) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
        )
        .filter((object) => {
          const screen = worldToScreen(runtime, object.x, object.y);
          return (
            screen.x >= minX &&
            screen.x <= maxX &&
            screen.y >= minY &&
            screen.y <= maxY
          );
        })
        .map((object) => object.id);

      setSelectedTileId(null);
      const mode = ctrlAdditive ? "add" : workspaceOptions.selectionBoxMode;
      setSelectedObjectIds((current) => {
        if (mode === "replace") {
          return idsInBox;
        }
        if (mode === "add") {
          const merged = new Set(current);
          idsInBox.forEach((id) => merged.add(id));
          return Array.from(merged);
        }
        if (mode === "subtract") {
          const boxSet = new Set(idsInBox);
          return current.filter((id) => !boxSet.has(id));
        }

        const boxSet = new Set(idsInBox);
        return current.filter((id) => boxSet.has(id));
      });
      trackTelemetry("scene.selection.box", {
        userId,
        mode,
        selectedInBox: idsInBox.length
      });
    },
    [
      isSelectableByActiveFilters,
      toolbarState.canvasDebug,
      userId,
      visibleObjects,
      workspaceOptions.selectionBoxMode
    ]
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }
      if (
        event.button === 0 &&
        runtime.transformControls.enabled &&
        (runtime.transformControls.dragging || runtime.transformControls.axis !== null)
      ) {
        return;
      }

      const local = pointerToLocal(runtime, event);
      const ndc = pointerToNdc(runtime, event);
      const groundHit = intersectionOnGround(runtime, ndc);
      if (groundHit) {
        lastPointerWorldRef.current = { x: groundHit.x, y: groundHit.z };
      } else {
        lastPointerWorldRef.current = null;
      }
      const findHitObjectId = (): string | null => {
        const meshCandidates = visibleObjects
          .filter((object) => isSelectableByActiveFilters(object))
          .map((object) => runtime.objectMeshById.get(object.id))
          .filter((mesh): mesh is THREE.Mesh => Boolean(mesh));

        runtime.raycaster.setFromCamera(ndc, runtime.camera);
        const intersections = runtime.raycaster.intersectObjects(meshCandidates, false);
        const firstHit = intersections[0];
        return (firstHit?.object.userData.objectId as string | undefined) ?? null;
      };

      if (event.button === 2) {
        if (viewportFacade.isCtrlPanGesture({ button: event.button, ctrlKey: event.ctrlKey })) {
          setContextMenu(null);
          applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled: true });
          return;
        }

        if (
          viewportFacade.isContextMenuGesture({
            button: event.button,
            ctrlKey: event.ctrlKey
          })
        ) {
          const hitObjectId = findHitObjectId();
          const selectedVisibleId =
            selectedObjectIds.find((id) => visibleObjects.some((object) => object.id === id)) ??
            null;
          const targetObjectId = hitObjectId ?? selectedVisibleId;
          if (!targetObjectId) {
            setContextMenu(null);
            return;
          }

          const hitObject = visibleObjects.find((object) => object.id === targetObjectId) ?? null;
          if (!hitObject) {
            setContextMenu(null);
            return;
          }

          setSelectedTileId(null);
          setSelectedObjectIds((current) =>
            current.includes(hitObject.id) ? current : [hitObject.id]
          );
          const clickedDirectlyOnTarget = hitObjectId === hitObject.id;
          const anchorScreen = resolveContextMenuAnchorScreen(runtime, hitObject, hitObject.id);
          const relativeOffset = clickedDirectlyOnTarget
            ? normalizeContextMenuAnchorOffset(
                local.x - anchorScreen.x,
                local.y - anchorScreen.y
              )
            : {
                x: CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX,
                y: CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX
              };
          const anchorOffsetX = relativeOffset.x;
          const anchorOffsetY = relativeOffset.y;
          const anchoredPosition = resolveAnchoredContextMenuPosition(
            runtime,
            hitObject,
            hitObject.id,
            anchorOffsetX,
            anchorOffsetY
          );
          setContextMenu({
            x: anchoredPosition.x,
            y: anchoredPosition.y,
            objectId: hitObject.id,
            objectKind: hitObject.kind,
            anchorOffsetX,
            anchorOffsetY
          });
          trackTelemetry("scene.context_menu.open", {
            userId,
            objectId: hitObject.id,
            objectKind: hitObject.kind
          });
          return;
        }
      }

      if (event.button !== 0) {
        return;
      }

      setContextMenu(null);
      if (event.shiftKey) {
        runtime.controls.enabled = false;
        setSelectionBox({
          active: true,
          startX: local.x,
          startY: local.y,
          currentX: local.x,
          currentY: local.y
        });
        return;
      }
      const tile = groundHit ? findTileAtWorld(scene, groundHit.x, groundHit.z) : null;

      if (toolbarState.selectionMode === "terrain") {
        if (!tile) {
          setSelectedTileId(null);
          return;
        }

        setSelectedTileId(tile.id);
        setSelectedObjectIds([]);
        const shouldTrackTerrainPaint = tile.terrain !== terrainBrush;

        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.updateTileTerrain(
            current.present,
            tile.id,
            terrainBrush
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        if (shouldTrackTerrainPaint) {
          trackTelemetry("scene.tiles.paint", {
            userId,
            tileId: tile.id,
            terrain: terrainBrush
          });
        }
        return;
      }

      const hitObjectId = findHitObjectId() ?? undefined;

      if (hitObjectId) {
        const hitObject = visibleObjects.find((object) => object.id === hitObjectId) ?? null;
        if (
          hitObject &&
          isSelectableByActiveFilters(hitObject) &&
          !isKindLocked(toolbarState.canvasDebug, hitObject.kind)
        ) {
          setSelectedTileId(null);
          if (event.ctrlKey) {
            setSelectedObjectIds((current) => {
              if (current.includes(hitObject.id)) {
                return current.filter((id) => id !== hitObject.id);
              }
              return [...current, hitObject.id];
            });
            return;
          }

          const nextSelectionIds = selectedObjectIds.includes(hitObject.id)
            ? selectedObjectIds
            : [hitObject.id];
          setSelectedObjectIds(nextSelectionIds);

          if (groundHit && !event.altKey && !runtime.transformControls.enabled) {
            const selectedForDrag = scene.objects.filter((object) =>
              nextSelectionIds.includes(object.id)
            );
            const hasDoorInSelection = selectedForDrag.some(
              (object) => object.kind === "doors"
            );
            const hasUnlockedMovable = selectedForDrag.some(
              (object) =>
                MOVE_ALLOWED_KINDS.has(object.kind) &&
                !isKindLocked(toolbarState.canvasDebug, object.kind)
            );

            if (!hasDoorInSelection && hasUnlockedMovable) {
              dragMoveRef.current = {
                active: true,
                lastWorld: { x: groundHit.x, y: groundHit.z },
                objectIds: nextSelectionIds
              };
              runtime.controls.enabled = false;
            }
          }
          return;
        }
      }

      if (event.altKey && tile) {
        const newObjectSequence = nextObjectSequenceRef.current;
        nextObjectSequenceRef.current += 1;

        const kind =
          toolbarState.selectionScope === "all"
            ? objectBrush
            : (OBJECT_KIND_BY_SCOPE[toolbarState.selectionScope] ?? objectBrush);
        if (isKindLocked(toolbarState.canvasDebug, kind)) {
          trackTelemetry("scene.objects.add_blocked_locked_layer", {
            userId,
            kind
          });
          return;
        }

        const rawPlacementX = groundHit?.x ?? tile.col + 0.5;
        const rawPlacementY = groundHit?.z ?? tile.row + 0.5;
        const placement = resolveObjectPlacementFromWorldPoint(
          scene,
          rawPlacementX,
          rawPlacementY,
          toolbarState.canvasDebug.snapGrid,
          workspaceOptions.snapGridStep
        );
        const placementX = placement.x;
        const placementY = placement.y;

        const created = sceneViewportPort.createObject(
          kind,
          placementX,
          placementY,
          newObjectSequence
        );
        if (toolbarState.canvasDebug.snapAngle) {
          created.bearing = snapAngleRadians(created.bearing, workspaceOptions.snapAngleStepDeg);
        }
        if (toolbarState.canvasDebug.snapHeight) {
          created.z = snapHeightValue(created.z, workspaceOptions.snapHeightStep);
        }

        setSceneHistory((current) =>
          sceneViewportPort.commitHistory(
            current,
            sceneViewportPort.appendObjects(current.present, [created])
          )
        );

        setSelectedObjectIds([created.id]);
        setSelectedTileId(tile.id);
        trackTelemetry("scene.objects.add", {
          userId,
          kind,
          objectId: created.id
        });
        return;
      }

      if (!event.ctrlKey) {
        setSelectedObjectIds([]);
      }
      setSelectedTileId(tile?.id ?? null);
    },
    [
      isSelectableByActiveFilters,
      objectBrush,
      scene,
      setContextMenu,
      terrainBrush,
      toolbarState.selectionMode,
      toolbarState.selectionScope,
      toolbarState.canvasDebug,
      userId,
      visibleObjects,
      selectedObjectIds,
      workspaceOptions,
      sceneViewportPort
    ]
  );

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const ndc = pointerToNdc(runtime, event);
    const groundHit = intersectionOnGround(runtime, ndc);
    if (groundHit) {
      lastPointerWorldRef.current = { x: groundHit.x, y: groundHit.z };
    } else {
      lastPointerWorldRef.current = null;
    }

    if (dragMoveRef.current.active) {
      if (!(event.buttons & 1)) {
        dragMoveRef.current = {
          active: false,
          lastWorld: null,
          objectIds: []
        };
        runtime.controls.enabled = true;
        return;
      }

      const lastWorld = dragMoveRef.current.lastWorld;
      if (groundHit && lastWorld) {
        const deltaX = groundHit.x - lastWorld.x;
        const deltaY = groundHit.z - lastWorld.y;
        const moved = moveSelectedObjectsByDelta(
          { x: deltaX, y: deltaY },
          "mouse_drag",
          dragMoveRef.current.objectIds
        );
        if (moved > 0) {
          dragMoveRef.current.lastWorld = { x: groundHit.x, y: groundHit.z };
        }
      }
      return;
    }

    if (runtime.transformControls.dragging) {
      return;
    }

    if (!selectionBox.active) {
      return;
    }

    const local = pointerToLocal(runtime, event);
    setSelectionBox((current) => ({
      ...current,
      currentX: local.x,
      currentY: local.y
    }));
  }, [moveSelectedObjectsByDelta, selectionBox.active]);

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (dragMoveRef.current.active) {
        dragMoveRef.current = {
          active: false,
          lastWorld: null,
          objectIds: []
        };
        const runtime = runtimeRef.current;
        if (runtime) {
          runtime.controls.enabled = true;
        }
      }

      if (!selectionBox.active) {
        return;
      }

      commitBoxSelection(selectionBox, Boolean(event.ctrlKey));
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.controls.enabled = true;
      }
      setSelectionBox({
        active: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    },
    [commitBoxSelection, selectionBox]
  );

  useEffect(() => {
    return () => {
      const runtime = runtimeRef.current;
      if (runtime) {
        runtime.controls.enabled = true;
      }
    };
  }, []);

  const clampAdjustLocationDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return { x, y };
      }
      const measuredRect = panelRect ?? adjustLocationDialogRef.current?.getBoundingClientRect() ?? null;
      const panelWidth = measuredRect?.width ?? ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX;
      const panelHeight = measuredRect?.height ?? ADJUST_LOCATION_DIALOG_FALLBACK_HEIGHT_PX;
      const maxX = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.width - panelWidth - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      const maxY = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.height - panelHeight - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      return {
        x: Math.min(Math.max(x, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxX),
        y: Math.min(Math.max(y, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxY)
      };
    },
    []
  );

  const openAdjustLocationDialog = useCallback(
    (targets: SceneObject[]) => {
      if (targets.length === 0) {
        return;
      }
      const targetIds = targets.map((object) => object.id);

      const source = targets[0];
      const hostRect = hostRef.current?.getBoundingClientRect();
      const preferredX = hostRect
        ? hostRect.width - ADJUST_LOCATION_DIALOG_FALLBACK_WIDTH_PX - ADJUST_LOCATION_DIALOG_MARGIN_PX
        : ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const preferredY = ADJUST_LOCATION_DIALOG_MARGIN_PX;
      const initialDialogPosition = clampAdjustLocationDialogPosition(preferredX, preferredY);
      const visualTransformMeta = resolveAdjustLocationVisualTransformMeta(targets);
      const snapshotObjects = targets.map(cloneSceneObject);
      setSelectedObjectIds(targetIds);
      setAdjustLocationDialog({
        objectIds: targetIds,
        snapshotObjects,
        showVisualTransforms: visualTransformMeta.showVisualTransforms,
        mixedStaticPlaceables: visualTransformMeta.mixedStaticPlaceables,
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        collapsed: false,
        draft: buildAdjustLocationDraft(
          source,
          adjustLocationUnitsPerTile,
          scene.width,
          scene.height
        )
      });
      trackTelemetry("scene.adjust_location.open", {
        userId,
        selectedCount: targets.length,
        visualTransforms: visualTransformMeta.showVisualTransforms
      });
    },
    [
      adjustLocationUnitsPerTile,
      clampAdjustLocationDialogPosition,
      cloneSceneObject,
      scene.height,
      scene.width,
      trackTelemetry,
      userId
    ]
  );

  const updateAdjustLocationDraftField = useCallback(
    (field: keyof AdjustLocationDraft, rawValue: string) => {
      const nextValue = Number(rawValue);
      if (!Number.isFinite(nextValue)) {
        return;
      }
      const sanitizedValue =
        field === "bearingDeg" ? normalizeBearingDegreesForInput(nextValue) : nextValue;
      setAdjustLocationDialog((current) =>
        current
          ? {
              ...current,
              draft: {
                ...current.draft,
                [field]: sanitizedValue
              }
            }
          : current
      );
    },
    []
  );

  const updateBearingByDialPointer = useCallback(
    (target: HTMLElement, clientX: number, clientY: number) => {
      const rect = target.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = clientX - centerX;
      const deltaY = clientY - centerY;
      // Aurora preview convention: 0 at top (12 o'clock), angles increase counterclockwise.
      const nextBearingDeg = normalizeBearingDegrees(
        Math.atan2(-deltaX, -deltaY) * DEGREES_PER_RADIAN
      );
      setAdjustLocationDialog((current) =>
        current
          ? {
              ...current,
              draft: {
                ...current.draft,
                bearingDeg: nextBearingDeg
              }
            }
          : current
      );
    },
    []
  );

  const startBearingDialDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0) {
        return;
      }
      bearingDialDragRef.current = {
        active: true,
        pointerId: event.pointerId
      };
      event.currentTarget.setPointerCapture(event.pointerId);
      updateBearingByDialPointer(event.currentTarget, event.clientX, event.clientY);
      event.preventDefault();
    },
    [updateBearingByDialPointer]
  );

  const moveBearingDialDrag = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = bearingDialDragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) {
        return;
      }
      updateBearingByDialPointer(event.currentTarget, event.clientX, event.clientY);
      event.preventDefault();
    },
    [updateBearingByDialPointer]
  );

  const endBearingDialDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = bearingDialDragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) {
      return;
    }
    bearingDialDragRef.current = {
      active: false,
      pointerId: null
    };
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  const resolveSceneWithAdjustLocationDraft = useCallback(
    (sourceScene: AreaScene, dialogState: AdjustLocationDialogState): AreaScene => {
      const draft = dialogState.draft;
      const objectIds = dialogState.objectIds;
      const includeVisualTransforms = dialogState.showVisualTransforms;
      const draftZWorld = fromAdjustLocationHeight(draft.z, adjustLocationUnitsPerTile);
      const draftVtZWorld = fromAdjustLocationHeight(
        draft.zTranslation,
        adjustLocationUnitsPerTile
      );
      let nextScene = sceneViewportPort.setObjectsAbsoluteLocationByIds(
        sourceScene,
        objectIds,
        {
          x: fromAdjustLocationCoordinate(draft.x, scene.width, adjustLocationUnitsPerTile),
          y: fromAdjustLocationCoordinate(draft.y, scene.height, adjustLocationUnitsPerTile),
          z: draftZWorld,
          bearing: toRadians(draft.bearingDeg)
        }
      );
      if (includeVisualTransforms) {
        nextScene = sceneViewportPort.setObjectsVisualTransformByIds(nextScene, objectIds, {
          scale: draft.scale,
          offsetX: draft.xTranslation,
          offsetY: draft.yTranslation,
          offsetZ: draftVtZWorld,
          pitch: toRadians(draft.xRotationDeg),
          yaw: toRadians(draft.yRotationDeg),
          roll: toRadians(draft.zRotationDeg)
        });
      }
      return nextScene;
    },
    [adjustLocationUnitsPerTile, scene.height, scene.width, sceneViewportPort]
  );

  useEffect(() => {
    if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
      return;
    }
    setSceneHistory((current) => {
      const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
        current.present,
        adjustLocationDialog.snapshotObjects
      );
      const nextPreviewScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
      if (
        areObjectPlacementsEqual(
          current.present,
          nextPreviewScene,
          adjustLocationDialog.objectIds,
          adjustLocationDialog.showVisualTransforms
        )
      ) {
        return current;
      }
      return {
        ...current,
        present: nextPreviewScene
      };
    });
  }, [
    adjustLocationDialog,
    adjustLocationDialog?.draft,
    adjustLocationDialog?.objectIds,
    adjustLocationDialog?.showVisualTransforms,
    adjustLocationDialog?.snapshotObjects,
    resolveSceneWithAdjustLocationDraft,
    sceneViewportPort
  ]);

  const applyAdjustLocationDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!adjustLocationDialog || adjustLocationDialog.objectIds.length === 0) {
        return;
      }

      const objectIds = adjustLocationDialog.objectIds;
      const includeVisualTransforms = adjustLocationDialog.showVisualTransforms;

      setSceneHistory((current) => {
        const baseScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        const finalScene = resolveSceneWithAdjustLocationDraft(baseScene, adjustLocationDialog);
        if (
          areObjectPlacementsEqual(
            baseScene,
            finalScene,
            objectIds,
            includeVisualTransforms
          )
        ) {
          return current;
        }
        return sceneViewportPort.commitHistory(
          {
            ...current,
            present: baseScene
          },
          finalScene
        );
      });

      trackTelemetry("scene.adjust_location.apply", {
        userId,
        selectedCount: objectIds.length,
        closeAfterApply,
        visualTransforms: includeVisualTransforms
      });

      if (closeAfterApply) {
        setAdjustLocationDialog(null);
      }
    },
    [
      adjustLocationDialog,
      sceneViewportPort,
      trackTelemetry,
      userId,
      resolveSceneWithAdjustLocationDraft
    ]
  );

  const cancelAdjustLocationDialog = useCallback(() => {
    if (adjustLocationDialog && adjustLocationDialog.snapshotObjects.length > 0) {
      setSceneHistory((current) => {
        const restoredScene = sceneViewportPort.restoreObjectsPlacementBySnapshots(
          current.present,
          adjustLocationDialog.snapshotObjects
        );
        if (
          areObjectPlacementsEqual(
            current.present,
            restoredScene,
            adjustLocationDialog.objectIds,
            adjustLocationDialog.showVisualTransforms
          )
        ) {
          return current;
        }
        return {
          ...current,
          present: restoredScene
        };
      });
      trackTelemetry("scene.adjust_location.cancel", {
        userId,
        selectedCount: adjustLocationDialog.snapshotObjects.length
      });
    }
    setAdjustLocationDialog(null);
  }, [adjustLocationDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleAdjustLocationDialogCollapsed = useCallback(() => {
    setAdjustLocationDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startAdjustLocationDialogDrag,
    onHeaderPointerMove: moveAdjustLocationDialogDrag,
    onHeaderPointerUp: endAdjustLocationDialogDrag,
    onHeaderPointerCancel: cancelAdjustLocationDialogDrag
  } = usePropertyDialogDrag({
    dialog: adjustLocationDialog,
    setDialog: setAdjustLocationDialog,
    hostRef,
    panelRef: adjustLocationDialogRef,
    dragRef: adjustLocationDialogDragRef,
    clampPosition: clampAdjustLocationDialogPosition
  });

  const clampPlaceablePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return { x, y };
      }
      const measuredRect =
        panelRect ?? placeablePropertiesDialogRef.current?.getBoundingClientRect() ?? null;
      const panelWidth = measuredRect?.width ?? PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
      const panelHeight = measuredRect?.height ?? PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
      const maxX = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.width - panelWidth - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      const maxY = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.height - panelHeight - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      return {
        x: Math.min(Math.max(x, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxX),
        y: Math.min(Math.max(y, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxY)
      };
    },
    []
  );

  const openPlaceablePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "placeables") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampPlaceablePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setPlaceablePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildPlaceablePropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.placeable_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampPlaceablePropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const updatePlaceablePropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "tag"
        | "resRef"
        | "isStatic"
        | "plot"
        | "useable"
        | "hasInventory"
        | "scriptSlotsEnabled"
        | "disabledFlagsEnabled"
        | "hardness"
        | "hitPoints"
        | "fortitudeSave"
        | "reflexSave"
        | "willSave"
        | "description"
        | "comments",
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const nextDraft =
          typeof value === "boolean"
            ? { ...current.draft, [field]: value }
            : { ...current.draft, [field]: value };
        if (arePlaceablePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updatePlaceableScriptSlotDraftField = useCallback(
    (field: PlaceableScriptSlotKey, value: string) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.draft.scriptSlots[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            scriptSlotsEnabled: true,
            scriptSlots: {
              ...current.draft.scriptSlots,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableDisabledFlagDraftField = useCallback(
    (field: keyof PlaceablePropertiesDraft["disabledFlags"], value: boolean) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if (current.draft.disabledFlags[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            disabledFlags: {
              ...current.draft.disabledFlags,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableLockDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["lockSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.lockSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableTrapDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["trapSettings"],
      value: string | boolean | number
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.trapSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updatePlaceableAdvancedDraftField = useCallback(
    (
      field: keyof PlaceablePropertiesDraft["advancedSettings"],
      value: string | boolean
    ) => {
      setPlaceablePropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const setPlaceablePropertiesActiveTab = useCallback((nextTab: PlaceablePropertiesTab) => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applyPlaceablePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!placeablePropertiesDialog) {
        return;
      }

      const draft = placeablePropertiesDialog.draft;
      const objectId = placeablePropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        const nextPlaceableProperties: NonNullable<SceneObject["placeableProperties"]> = {
          plot: draft.plot,
          useable: draft.useable,
          hasInventory: draft.hasInventory,
          lockSettings: { ...draft.lockSettings },
          trapSettings: { ...draft.trapSettings },
          advancedSettings: { ...draft.advancedSettings },
          description: draft.description,
          comments: draft.comments
        };
        if (draft.scriptSlotsEnabled) {
          nextPlaceableProperties.scriptSlots = { ...draft.scriptSlots };
        }
        if (draft.disabledFlagsEnabled) {
          nextPlaceableProperties.disabledFlags = { ...draft.disabledFlags };
        }
        const sourcePlaceableProperties = sourceObject.placeableProperties;
        const isScriptSlotsUnchanged = draft.scriptSlotsEnabled
          ? sourcePlaceableProperties?.scriptSlots !== undefined &&
            arePlaceableScriptSlotsEqual(sourcePlaceableProperties.scriptSlots, draft.scriptSlots)
          : sourcePlaceableProperties?.scriptSlots === undefined;
        const isDisabledFlagsUnchanged = draft.disabledFlagsEnabled
          ? sourcePlaceableProperties?.disabledFlags !== undefined &&
            sourcePlaceableProperties.disabledFlags.plot === draft.disabledFlags.plot &&
            sourcePlaceableProperties.disabledFlags.useable === draft.disabledFlags.useable &&
            sourcePlaceableProperties.disabledFlags.hasInventory === draft.disabledFlags.hasInventory
          : sourcePlaceableProperties?.disabledFlags === undefined;
        const isLockSettingsUnchanged = arePlaceableLockSettingsEqual(
          {
            locked: sourcePlaceableProperties?.lockSettings?.locked ?? false,
            canRelock: sourcePlaceableProperties?.lockSettings?.canRelock ?? false,
            autoRemoveKeyAfterUse:
              sourcePlaceableProperties?.lockSettings?.autoRemoveKeyAfterUse ?? false,
            keyRequiredToUnlockOrLock:
              sourcePlaceableProperties?.lockSettings?.keyRequiredToUnlockOrLock ?? false,
            openLockDc: sourcePlaceableProperties?.lockSettings?.openLockDc ?? 18,
            closeLockDc: sourcePlaceableProperties?.lockSettings?.closeLockDc ?? 0,
            keyTag: sourcePlaceableProperties?.lockSettings?.keyTag ?? ""
          },
          draft.lockSettings
        );
        const isTrapSettingsUnchanged = arePlaceableTrapSettingsEqual(
          {
            isTrapped: sourcePlaceableProperties?.trapSettings?.isTrapped ?? false,
            trapType: sourcePlaceableProperties?.trapSettings?.trapType ?? PLACEABLE_TRAP_TYPE_OPTIONS[0]!,
            detectionDc: sourcePlaceableProperties?.trapSettings?.detectionDc ?? 0,
            disarmDc: sourcePlaceableProperties?.trapSettings?.disarmDc ?? 15,
            oneShot: sourcePlaceableProperties?.trapSettings?.oneShot ?? true,
            detectable: sourcePlaceableProperties?.trapSettings?.detectable ?? true,
            disarmable: sourcePlaceableProperties?.trapSettings?.disarmable ?? true,
            onDisarmScript: sourcePlaceableProperties?.trapSettings?.onDisarmScript ?? "",
            onTrapTriggeredScript:
              sourcePlaceableProperties?.trapSettings?.onTrapTriggeredScript ?? "",
            setDc: sourcePlaceableProperties?.trapSettings?.setDc ?? 5,
            detectDcModWhenSetByRogue:
              sourcePlaceableProperties?.trapSettings?.detectDcModWhenSetByRogue ?? 10,
            disarmDcModWhenSetByRogue:
              sourcePlaceableProperties?.trapSettings?.disarmDcModWhenSetByRogue ?? 22
          },
          draft.trapSettings
        );
        const isAdvancedSettingsUnchanged = arePlaceableAdvancedSettingsEqual(
          {
            blueprintResRef:
              sourcePlaceableProperties?.advancedSettings?.blueprintResRef ?? sourceObject.resRef,
            belongsToFaction:
              sourcePlaceableProperties?.advancedSettings?.belongsToFaction ??
              PLACEABLE_FACTION_OPTIONS[0]!,
            conversation: sourcePlaceableProperties?.advancedSettings?.conversation ?? "",
            noInterrupt: sourcePlaceableProperties?.advancedSettings?.noInterrupt ?? false,
            portraitResRef: sourcePlaceableProperties?.advancedSettings?.portraitResRef ?? "",
            initialState:
              sourcePlaceableProperties?.advancedSettings?.initialState ??
              PLACEABLE_INITIAL_STATE_OPTIONS[0]!,
            treasureModel:
              sourcePlaceableProperties?.advancedSettings?.treasureModel ??
              PLACEABLE_TREASURE_MODEL_OPTIONS[0]!
          },
          draft.advancedSettings
        );
        const isDescriptionUnchanged =
          (sourcePlaceableProperties?.description ?? "") === draft.description;
        const isCommentsUnchanged = (sourcePlaceableProperties?.comments ?? "") === draft.comments;
        const sourceName = sourceObject.name ?? sourceObject.tag;
        const sourceIsStatic = sourceObject.isStatic ?? true;
        if (
          sourceName === nextName &&
          sourceObject.tag === nextTag &&
          sourceObject.resRef === nextResRef &&
          sourceIsStatic === draft.isStatic &&
          sourcePlaceableProperties?.plot === draft.plot &&
          sourcePlaceableProperties?.useable === draft.useable &&
          sourcePlaceableProperties?.hasInventory === draft.hasInventory &&
          isScriptSlotsUnchanged &&
          isDisabledFlagsUnchanged &&
          isLockSettingsUnchanged &&
          isTrapSettingsUnchanged &&
          isAdvancedSettingsUnchanged &&
          isDescriptionUnchanged &&
          isCommentsUnchanged
        ) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName,
                tag: nextTag,
                resRef: nextResRef,
                isStatic: draft.isStatic,
                placeableProperties: nextPlaceableProperties,
                soundPositioning: undefined
              }
            : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.placeable_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setPlaceablePropertiesDialog(null);
      }
    },
    [placeablePropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelPlaceablePropertiesDialog = useCallback(() => {
    if (placeablePropertiesDialog) {
      const snapshot = placeablePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "placeables") {
          return current;
        }
        const sourceDraft = buildPlaceablePropertiesDraft(sourceObject);
        const snapshotDraft = buildPlaceablePropertiesDraft(snapshot);
        if (arePlaceablePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.placeable_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setPlaceablePropertiesDialog(null);
  }, [cloneSceneObject, placeablePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const togglePlaceablePropertiesDialogCollapsed = useCallback(() => {
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const mapAnchoredDialogPosition = useCallback(
    function mapAnchoredDialogPosition<TDialogState extends AnchoredDialogPositionState>(
      current: TDialogState,
      nextPosition: { x: number; y: number }
    ): TDialogState {
      const runtime = runtimeRef.current;
      const targetObject =
        scene.objects.find((object) => object.id === current.objectId) ?? null;
      if (!runtime || !targetObject) {
        return {
          ...current,
          windowX: nextPosition.x,
          windowY: nextPosition.y
        };
      }
      const anchorScreen = resolveContextMenuAnchorScreen(
        runtime,
        targetObject,
        current.objectId
      );
      return {
        ...current,
        windowX: nextPosition.x,
        windowY: nextPosition.y,
        anchorOffsetX: nextPosition.x - anchorScreen.x,
        anchorOffsetY: nextPosition.y - anchorScreen.y
      };
    },
    [scene.objects]
  );

  const {
    onHeaderPointerDown: startPlaceablePropertiesDialogDrag,
    onHeaderPointerMove: movePlaceablePropertiesDialogDrag,
    onHeaderPointerUp: endPlaceablePropertiesDialogDrag,
    onHeaderPointerCancel: cancelPlaceablePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: placeablePropertiesDialog,
    setDialog: setPlaceablePropertiesDialog,
    hostRef,
    panelRef: placeablePropertiesDialogRef,
    dragRef: placeablePropertiesDialogDragRef,
    clampPosition: clampPlaceablePropertiesDialogPosition,
    shouldIgnoreTarget: (target) => Boolean(target?.closest("button, input, select, textarea")),
    mapPosition: mapAnchoredDialogPosition
  });

  const clampSoundPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return { x, y };
      }
      const measuredRect = panelRect ?? soundPropertiesDialogRef.current?.getBoundingClientRect() ?? null;
      const panelWidth = measuredRect?.width ?? SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
      const panelHeight = measuredRect?.height ?? SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
      const maxX = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.width - panelWidth - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      const maxY = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.height - panelHeight - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      return {
        x: Math.min(Math.max(x, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxX),
        y: Math.min(Math.max(y, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxY)
      };
    },
    []
  );

  const openSoundPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "sounds") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampSoundPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setSoundPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildSoundPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.sound_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampSoundPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const updateSoundPropertiesDraftField = useCallback(
    (field: keyof SoundPropertiesDraft, value: string | number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }

        let nextDraft = current.draft;
        if (field === "maxVolumeDistance") {
          return current;
        }
        if (field === "mode") {
          const nextMode = value as SoundPositioningMode;
          nextDraft = {
            ...current.draft,
            mode: nextMode
          };
        } else if (field === "cutoffDistance") {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          const nextCutoffDistance = Math.max(0, numericValue);
          nextDraft = {
            ...current.draft,
            cutoffDistance: nextCutoffDistance,
            maxVolumeDistance: deriveMaxVolumeDistanceFromCutoff(nextCutoffDistance)
          };
        } else if (
          field === "name" ||
          field === "tag" ||
          field === "resRef" ||
          field === "comments" ||
          field === "timeWindow" ||
          field === "hourMask"
        ) {
          nextDraft = {
            ...current.draft,
            [field]: String(value)
          };
        } else if (field === "flagsSummary" || field === "extraSummary") {
          return current;
        } else {
          const numericValue = parseSoundNumericInput(value);
          if (numericValue === null) {
            return current;
          }
          nextDraft = {
            ...current.draft,
            [field]: numericValue
          };
        }

        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const patchSoundPropertiesDraft = useCallback((patch: Partial<SoundPropertiesDraft>) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        ...patch
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundPropertiesActive = useCallback(() => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft = {
        ...current.draft,
        active: !current.draft.active
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const setSoundWhenToPlay = useCallback((nextWhenToPlay: SoundWhenToPlay, nextDayNight?: SoundDayNight) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const nextDraft: SoundPropertiesDraft = {
        ...current.draft,
        whenToPlay: nextWhenToPlay,
        dayNight:
          nextDayNight ?? (nextWhenToPlay === "always" ? "both" : current.draft.dayNight)
      };
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }
      return {
        ...current,
        draft: nextDraft
      };
    });
  }, []);

  const toggleSoundHour = useCallback(
    (hourIndex: number) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const currentMaskFlags = parseSoundHourMask(
          current.draft.hourMask,
          current.draft.hoursStart,
          current.draft.hoursEnd
        );
        const safeIndex = clampSoundHourIndex(hourIndex);
        currentMaskFlags[safeIndex] = !currentMaskFlags[safeIndex];
        const bounds = resolveSoundHourBounds(currentMaskFlags);
        const nextDraft: SoundPropertiesDraft = {
          ...current.draft,
          whenToPlay: "hours",
          hourMask: encodeSoundHourMask(currentMaskFlags),
          hoursStart: bounds.start,
          hoursEnd: bounds.end
        };
        if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const selectSoundListEntry = useCallback((index: number) => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }
      const safeIndex =
        current.draft.soundList.length === 0 ? -1 : Math.min(Math.max(index, 0), current.draft.soundList.length - 1);
      if (safeIndex === current.draft.selectedSoundIndex) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          selectedSoundIndex: safeIndex
        }
      };
    });
  }, []);

  const mutateSoundListDraft = useCallback(
    (
      recipe: (list: string[], selectedIndex: number) => { list: string[]; selectedIndex: number }
    ) => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const { list, selectedIndex } = recipe(
          [...current.draft.soundList],
          current.draft.selectedSoundIndex
        );
        const clampedSelectedIndex =
          list.length === 0 ? -1 : Math.min(Math.max(selectedIndex, 0), list.length - 1);
        if (
          list.join("\n") === current.draft.soundList.join("\n") &&
          clampedSelectedIndex === current.draft.selectedSoundIndex
        ) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            soundList: list,
            selectedSoundIndex: clampedSelectedIndex
          }
        };
      });
    },
    []
  );

  const addSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list) => {
      const nextNameBase = "as_mock_sound";
      let counter = list.length + 1;
      let nextValue = `${nextNameBase}${counter}`;
      while (list.includes(nextValue)) {
        counter += 1;
        nextValue = `${nextNameBase}${counter}`;
      }
      const nextList = [...list, nextValue];
      return {
        list: nextList,
        selectedIndex: nextList.length - 1
      };
    });
  }, [mutateSoundListDraft]);

  const removeSelectedSoundListEntry = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (list.length === 0 || selectedIndex < 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = list.filter((_, index) => index !== selectedIndex);
      return {
        list: nextList,
        selectedIndex: Math.min(selectedIndex, nextList.length - 1)
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryUp = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex <= 0 || selectedIndex >= list.length) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const previous = nextList[selectedIndex - 1];
      nextList[selectedIndex - 1] = nextList[selectedIndex];
      nextList[selectedIndex] = previous;
      return {
        list: nextList,
        selectedIndex: selectedIndex - 1
      };
    });
  }, [mutateSoundListDraft]);

  const moveSoundListEntryDown = useCallback(() => {
    mutateSoundListDraft((list, selectedIndex) => {
      if (selectedIndex < 0 || selectedIndex >= list.length - 1) {
        return { list, selectedIndex };
      }
      const nextList = [...list];
      const next = nextList[selectedIndex + 1];
      nextList[selectedIndex + 1] = nextList[selectedIndex];
      nextList[selectedIndex] = next;
      return {
        list: nextList,
        selectedIndex: selectedIndex + 1
      };
    });
  }, [mutateSoundListDraft]);

  const syncRuntimeSoundNowPlayingState = useCallback((nowUnixMs: number) => {
    const nowPlayingMap = runtimeSoundNowPlayingRef.current;
    let changed = false;
    for (const [objectId, state] of nowPlayingMap.entries()) {
      if (state.expiresAtUnixMs <= nowUnixMs) {
        nowPlayingMap.delete(objectId);
        changed = true;
      }
    }

    if (changed) {
      const nextBadges = Array.from(nowPlayingMap.entries())
        .map(([objectId, state]) => ({ objectId, label: state.label }))
        .sort((left, right) => left.objectId.localeCompare(right.objectId));
      setRuntimeSoundNowPlayingBadges((current) =>
        areNowPlayingBadgesEqual(current, nextBadges) ? current : nextBadges
      );
    }
  }, []);

  const markRuntimeSoundAsNowPlaying = useCallback(
    (objectId: string, nowUnixMs: number, soundKey: string) => {
      const nowPlayingMap = runtimeSoundNowPlayingRef.current;
      const label = resolveRuntimeSoundNowPlayingLabel(soundKey);
      nowPlayingMap.set(objectId, {
        expiresAtUnixMs: nowUnixMs + SOUND_NOW_PLAYING_BADGE_TTL_MS,
        label
      });
      const nextBadges = Array.from(nowPlayingMap.entries())
        .map(([entryObjectId, state]) => ({ objectId: entryObjectId, label: state.label }))
        .sort((left, right) => left.objectId.localeCompare(right.objectId));
      setRuntimeSoundNowPlayingBadges((current) =>
        areNowPlayingBadgesEqual(current, nextBadges) ? current : nextBadges
      );
    },
    []
  );

  const stopRuntimeLoopSoundChannelById = useCallback((objectId: string) => {
    const channel = runtimeSoundLoopChannelsRef.current.get(objectId);
    if (!channel) {
      return;
    }
    channel.audio.pause();
    channel.audio.currentTime = 0;
    runtimeSoundLoopChannelsRef.current.delete(objectId);
  }, []);

  const stopAllRuntimeSoundChannels = useCallback(() => {
    runtimeSoundLoopChannelsRef.current.forEach((channel) => {
      channel.audio.pause();
      channel.audio.currentTime = 0;
    });
    runtimeSoundLoopChannelsRef.current.clear();

    runtimeSoundOneShotChannelsRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    runtimeSoundOneShotChannelsRef.current.clear();

    runtimeSoundPlaybackStateRef.current.clear();
    runtimeSoundNowPlayingRef.current.clear();
    setRuntimeSoundNowPlayingBadges((current) => (current.length === 0 ? current : []));
  }, []);

  const stopSoundPreviewPlayback = useCallback(() => {
    const currentAudio = soundPreviewAudioRef.current;
    if (!currentAudio) {
      return;
    }
    currentAudio.pause();
    currentAudio.currentTime = 0;
    soundPreviewAudioRef.current = null;
  }, []);

  const playSelectedSoundPreview = useCallback(() => {
    if (typeof window === "undefined" || !soundPropertiesDialog) {
      return;
    }
    const previewKey = resolveSelectedSoundPreviewKey(soundPropertiesDialog.draft);
    const previewAssetUrl = resolveSoundPreviewAssetUrl(previewKey);
    if (!previewAssetUrl) {
      return;
    }

    const previousAudio = soundPreviewAudioRef.current;
    if (previousAudio) {
      previousAudio.pause();
      previousAudio.currentTime = 0;
    }

    const audio = new Audio(previewAssetUrl);
    audio.volume = Math.min(1, Math.max(0, soundPropertiesDialog.draft.volume));
    audio.loop = soundPropertiesDialog.draft.playStyle === "loop";
    audio.onended = () => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    };
    audio.onerror = () => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    };
    soundPreviewAudioRef.current = audio;

    void audio.play().catch(() => {
      if (soundPreviewAudioRef.current === audio) {
        soundPreviewAudioRef.current = null;
      }
    });
  }, [soundPropertiesDialog]);

  const setSoundPropertiesActiveTab = useCallback((nextTab: SoundPropertiesTab) => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const applySoundPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!soundPropertiesDialog) {
        return;
      }

      const draft = soundPropertiesDialog.draft;
      const objectId = soundPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "sounds") {
          return current;
        }
        const normalizedCutoffDistance = Math.max(0, draft.cutoffDistance);
        const normalizedMaxVolumeDistance =
          deriveMaxVolumeDistanceFromCutoff(normalizedCutoffDistance);
        const nextSoundPositioning = normalizeSoundGuidePositioning({
          mode: draft.mode,
          elevation: draft.elevation,
          maxVolumeDistance: normalizedMaxVolumeDistance,
          cutoffDistance: normalizedCutoffDistance,
          randomRangeWestEast:
            draft.mode === "random" ? draft.randomRangeWestEast : 0,
          randomRangeNorthSouth:
            draft.mode === "random" ? draft.randomRangeNorthSouth : 0
        });
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
          nextPreserveCore.intervalVariationMs ===
            SOUND_PRESERVE_DEFAULTS.intervalVariationMs &&
          nextPreserveCore.volume === SOUND_PRESERVE_DEFAULTS.volume &&
          nextPreserveCore.volumeVariation === SOUND_PRESERVE_DEFAULTS.volumeVariation &&
          nextPreserveCore.pitchVariation === SOUND_PRESERVE_DEFAULTS.pitchVariation &&
          nextPreserveCore.priority === SOUND_PRESERVE_DEFAULTS.priority;
        const sourceCommentsValue = sourcePreserve?.extra[SOUND_PRESERVE_EXTRA_COMMENTS_KEY];
        const sourceHasCommentsValue = typeof sourceCommentsValue === "string";
        const sourceListValue = sourcePreserve?.extra[SOUND_PRESERVE_EXTRA_LIST_KEY];
        const sourceHasListValue = typeof sourceListValue === "string";
        const nextCommentsValue = draft.comments.trim();
        const normalizedSoundList = draft.soundList
          .map((entry) => entry.trim())
          .filter((entry) => entry.length > 0);
        const defaultSoundList = buildSoundListFallback(sourceObject.resRef);
        const shouldPersistSoundList =
          sourceHasListValue || normalizedSoundList.join("\n") !== defaultSoundList.join("\n");
        const nextSoundListValue = shouldPersistSoundList ? normalizedSoundList.join("\n") : "";
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
                  if (nextSoundListValue.length > 0) {
                    extra[SOUND_PRESERVE_EXTRA_LIST_KEY] = nextSoundListValue;
                  } else {
                    delete extra[SOUND_PRESERVE_EXTRA_LIST_KEY];
                  }
                  return extra;
                })()
              }
            : undefined;
        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: draft.name,
                tag: draft.tag,
                resRef: draft.resRef,
                soundPositioning: {
                  ...nextSoundPositioning,
                  preserve: nextPreserve
                }
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
          nextTarget.soundPositioning?.maxVolumeDistance === sourceObject.soundPositioning?.maxVolumeDistance &&
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
          nextTarget.soundPositioning?.preserve?.volumeVariation ===
            sourcePreserve?.volumeVariation &&
          nextTarget.soundPositioning?.preserve?.pitchVariation ===
            sourcePreserve?.pitchVariation &&
          nextTarget.soundPositioning?.preserve?.priority === sourcePreserve?.priority &&
          stableJsonStringify(nextTarget.soundPositioning?.preserve?.flags ?? {}) ===
            stableJsonStringify(sourcePreserve?.flags ?? {}) &&
          stableJsonStringify(nextTarget.soundPositioning?.preserve?.extra ?? {}) ===
            stableJsonStringify(sourcePreserve?.extra ?? {})
        ) {
          return current;
        }
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.sound_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setSoundPropertiesDialog(null);
      }
    },
    [sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]
  );

  const cancelSoundPropertiesDialog = useCallback(() => {
    if (soundPropertiesDialog) {
      const snapshot = soundPropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "sounds") {
          return current;
        }
        const snapshotSound = snapshot.soundPositioning;
        const snapshotPreserve = snapshotSound?.preserve;
        const sourcePreserve = sourceObject.soundPositioning?.preserve;
        if (
          sourceObject.name === snapshot.name &&
          sourceObject.tag === snapshot.tag &&
          sourceObject.resRef === snapshot.resRef &&
          sourceObject.soundPositioning?.mode === snapshotSound?.mode &&
          sourceObject.soundPositioning?.elevation === snapshotSound?.elevation &&
          sourceObject.soundPositioning?.maxVolumeDistance === snapshotSound?.maxVolumeDistance &&
          sourceObject.soundPositioning?.cutoffDistance === snapshotSound?.cutoffDistance &&
          sourceObject.soundPositioning?.randomRangeWestEast === snapshotSound?.randomRangeWestEast &&
          sourceObject.soundPositioning?.randomRangeNorthSouth === snapshotSound?.randomRangeNorthSouth &&
          sourcePreserve?.timeWindow === snapshotPreserve?.timeWindow &&
          sourcePreserve?.hourMask === snapshotPreserve?.hourMask &&
          sourcePreserve?.active === snapshotPreserve?.active &&
          sourcePreserve?.whenToPlay === snapshotPreserve?.whenToPlay &&
          sourcePreserve?.dayNight === snapshotPreserve?.dayNight &&
          sourcePreserve?.hoursStart === snapshotPreserve?.hoursStart &&
          sourcePreserve?.hoursEnd === snapshotPreserve?.hoursEnd &&
          sourcePreserve?.playStyle === snapshotPreserve?.playStyle &&
          sourcePreserve?.playOrder === snapshotPreserve?.playOrder &&
          sourcePreserve?.intervalMs === snapshotPreserve?.intervalMs &&
          sourcePreserve?.intervalVariationMs === snapshotPreserve?.intervalVariationMs &&
          sourcePreserve?.volume === snapshotPreserve?.volume &&
          sourcePreserve?.volumeVariation === snapshotPreserve?.volumeVariation &&
          sourcePreserve?.pitchVariation === snapshotPreserve?.pitchVariation &&
          sourcePreserve?.priority === snapshotPreserve?.priority &&
          stableJsonStringify(sourcePreserve?.flags ?? {}) ===
            stableJsonStringify(snapshotPreserve?.flags ?? {}) &&
          stableJsonStringify(sourcePreserve?.extra ?? {}) ===
            stableJsonStringify(snapshotPreserve?.extra ?? {})
        ) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });
      trackTelemetry("scene.sound_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setSoundPropertiesDialog(null);
  }, [cloneSceneObject, sceneViewportPort, soundPropertiesDialog, trackTelemetry, userId]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      stopSoundPreviewPlayback();
    }
  }, [soundPropertiesDialog, stopSoundPreviewPlayback]);

  useEffect(() => () => stopSoundPreviewPlayback(), [stopSoundPreviewPlayback]);

  useEffect(() => {
    if (!workspaceOptions.enableRuntimeSoundPreview) {
      stopAllRuntimeSoundChannels();
      return;
    }

    const playTick = () => {
      const runtime = runtimeRef.current;
      const nowUnixMs = Date.now();
      syncRuntimeSoundNowPlayingState(nowUnixMs);

      if (!runtime) {
        return;
      }

      const listenerX = runtime.camera.position.x;
      const listenerY = runtime.camera.position.y;
      const listenerZ = runtime.camera.position.z;
      const soundMetersToWorldScale = 1 / Math.max(1, adjustLocationUnitsPerTile);
      const toWorldSoundDistance = (meters: number) =>
        Math.max(0, meters) * soundMetersToWorldScale;

      const candidateSounds = scene.objects.filter(
        (object) =>
          object.kind === "sounds" &&
          isObjectVisible(object, toolbarState) &&
          isKindVisibleWithIsolation(toolbarState.canvasDebug, object.kind)
      );
      const candidateIds = new Set(candidateSounds.map((object) => object.id));

      runtimeSoundPlaybackStateRef.current.forEach((_state, objectId) => {
        if (!candidateIds.has(objectId)) {
          runtimeSoundPlaybackStateRef.current.delete(objectId);
        }
      });
      runtimeSoundNowPlayingRef.current.forEach((_expiresAt, objectId) => {
        if (!candidateIds.has(objectId)) {
          runtimeSoundNowPlayingRef.current.delete(objectId);
        }
      });
      runtimeSoundLoopChannelsRef.current.forEach((_channel, objectId) => {
        if (!candidateIds.has(objectId)) {
          stopRuntimeLoopSoundChannelById(objectId);
        }
      });

      for (const object of candidateSounds) {
        const positioning = normalizeSoundGuidePositioning(object.soundPositioning);
        const preserve = object.soundPositioning?.preserve;
        const isActive = preserve?.active ?? SOUND_PRESERVE_DEFAULTS.active;
        const soundList = resolveSoundPlaybackList(object);
        const playStyle = preserve?.playStyle ?? SOUND_PRESERVE_DEFAULTS.playStyle;
        const playOrder = resolveEffectiveSoundPlayOrder(
          preserve?.playOrder ?? SOUND_PRESERVE_DEFAULTS.playOrder
        );
        const baseVolume = clampUnitInterval(preserve?.volume ?? SOUND_PRESERVE_DEFAULTS.volume);
        const intervalMs = Math.max(250, preserve?.intervalMs ?? SOUND_PRESERVE_DEFAULTS.intervalMs);
        const intervalVariationMs = Math.max(
          0,
          preserve?.intervalVariationMs ?? SOUND_PRESERVE_DEFAULTS.intervalVariationMs
        );

        if (!isActive || soundList.length === 0 || baseVolume <= 0) {
          stopRuntimeLoopSoundChannelById(object.id);
          runtimeSoundPlaybackStateRef.current.delete(object.id);
          runtimeSoundNowPlayingRef.current.delete(object.id);
          continue;
        }

        const resolveSourcePosition = () => {
          const baseX = object.x;
          const baseY = object.z + toWorldSoundDistance(positioning.elevation);
          const baseZ = object.y;
          if (positioning.mode !== "random") {
            return { x: baseX, y: baseY, z: baseZ };
          }
          const randomOffsetX = toWorldSoundDistance(positioning.randomRangeWestEast) * (Math.random() - 0.5);
          const randomOffsetZ =
            toWorldSoundDistance(positioning.randomRangeNorthSouth) * (Math.random() - 0.5);
          return {
            x: baseX + randomOffsetX,
            y: baseY,
            z: baseZ + randomOffsetZ
          };
        };

        const resolveEffectiveVolume = (sourceX: number, sourceY: number, sourceZ: number) => {
          const maxDistance = toWorldSoundDistance(positioning.maxVolumeDistance);
          const cutoffDistance = Math.max(
            maxDistance,
            toWorldSoundDistance(positioning.cutoffDistance)
          );
          const distance =
            positioning.mode === "everywhere"
              ? 0
              : Math.sqrt(
                  (listenerX - sourceX) ** 2 +
                    (listenerY - sourceY) ** 2 +
                    (listenerZ - sourceZ) ** 2
                );
          const attenuation = clampUnitInterval(
            resolveDistanceAttenuation(positioning.mode, distance, maxDistance, cutoffDistance)
          );
          return clampUnitInterval(baseVolume * attenuation);
        };

        let playbackState = runtimeSoundPlaybackStateRef.current.get(object.id);
        if (!playbackState) {
          playbackState = createRuntimeSoundPlaybackState(nowUnixMs, playStyle);
          runtimeSoundPlaybackStateRef.current.set(object.id, playbackState);
        }

        const playbackStatePatch = reconcileRuntimeSoundPlaybackState(
          playbackState,
          playStyle,
          nowUnixMs
        );
        if (playbackStatePatch.shouldStopLoopChannel) {
          stopRuntimeLoopSoundChannelById(object.id);
        }

        const loopChannel = runtimeSoundLoopChannelsRef.current.get(object.id);
        if (playStyle === "loop") {
          if (loopChannel) {
            const volume = resolveEffectiveVolume(
              loopChannel.sourceX,
              loopChannel.sourceY,
              loopChannel.sourceZ
            );
            loopChannel.audio.volume = volume;
            if (volume > 0) {
              markRuntimeSoundAsNowPlaying(object.id, nowUnixMs, loopChannel.label);
            }
            continue;
          }
          if (nowUnixMs < playbackState.nextPlayAtUnixMs) {
            continue;
          }
        } else if (playStyle === "once" && playbackState.playedOnce) {
          continue;
        } else if (nowUnixMs < playbackState.nextPlayAtUnixMs) {
          continue;
        }

        const selectedListIndex =
          playOrder === "random"
            ? Math.floor(Math.random() * soundList.length)
            : playbackState.nextSequentialIndex % soundList.length;
        if (playOrder === "sequential") {
          playbackState.nextSequentialIndex =
            (playbackState.nextSequentialIndex + 1) % soundList.length;
        }
        const previewKey = soundList[selectedListIndex] ?? object.resRef;
        const previewAssetUrl = resolveSoundPreviewAssetUrl(previewKey);
        if (!previewAssetUrl) {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
          continue;
        }

        const sourcePosition = resolveSourcePosition();
        const effectiveVolume = resolveEffectiveVolume(
          sourcePosition.x,
          sourcePosition.y,
          sourcePosition.z
        );
        if (effectiveVolume <= 0) {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
          continue;
        }

        const audio = new Audio(previewAssetUrl);
        audio.volume = effectiveVolume;
        if (playStyle === "loop") {
          audio.loop = true;
          runtimeSoundLoopChannelsRef.current.set(object.id, {
            audio,
            sourceX: sourcePosition.x,
            sourceY: sourcePosition.y,
            sourceZ: sourcePosition.z,
            label: previewKey
          });
        } else {
          runtimeSoundOneShotChannelsRef.current.add(audio);
          audio.onended = () => {
            runtimeSoundOneShotChannelsRef.current.delete(audio);
          };
          audio.onerror = () => {
            runtimeSoundOneShotChannelsRef.current.delete(audio);
          };
        }
        markRuntimeSoundAsNowPlaying(object.id, nowUnixMs, previewKey);
        void audio.play().catch(() => {
          runtimeSoundOneShotChannelsRef.current.delete(audio);
          if (playStyle === "loop") {
            stopRuntimeLoopSoundChannelById(object.id);
          }
        });

        if (playStyle === "once") {
          playbackState.playedOnce = true;
          playbackState.nextPlayAtUnixMs = Number.POSITIVE_INFINITY;
        } else if (playStyle === "loop") {
          playbackState.playedOnce = true;
          playbackState.nextPlayAtUnixMs = Number.POSITIVE_INFINITY;
        } else {
          playbackState.nextPlayAtUnixMs =
            nowUnixMs + resolveNextRuntimeSoundDelayMs(intervalMs, intervalVariationMs);
        }
      }

      syncRuntimeSoundNowPlayingState(nowUnixMs);
    };

    playTick();
    const timerId = window.setInterval(playTick, SOUND_RUNTIME_TICK_MS);
    return () => {
      window.clearInterval(timerId);
      stopAllRuntimeSoundChannels();
    };
  }, [
    adjustLocationUnitsPerTile,
    markRuntimeSoundAsNowPlaying,
    scene.objects,
    stopAllRuntimeSoundChannels,
    stopRuntimeLoopSoundChannelById,
    syncRuntimeSoundNowPlayingState,
    toolbarState,
    workspaceOptions.enableRuntimeSoundPreview
  ]);

  const toggleSoundPropertiesDialogCollapsed = useCallback(() => {
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startSoundPropertiesDialogDrag,
    onHeaderPointerMove: moveSoundPropertiesDialogDrag,
    onHeaderPointerUp: endSoundPropertiesDialogDrag,
    onHeaderPointerCancel: cancelSoundPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: soundPropertiesDialog,
    setDialog: setSoundPropertiesDialog,
    hostRef,
    panelRef: soundPropertiesDialogRef,
    dragRef: soundPropertiesDialogDragRef,
    clampPosition: clampSoundPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampDoorPropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return { x, y };
      }
      const measuredRect =
        panelRect ?? doorPropertiesDialogRef.current?.getBoundingClientRect() ?? null;
      const panelWidth = measuredRect?.width ?? DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
      const panelHeight = measuredRect?.height ?? DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
      const maxX = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.width - panelWidth - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      const maxY = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.height - panelHeight - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      return {
        x: Math.min(Math.max(x, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxX),
        y: Math.min(Math.max(y, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxY)
      };
    },
    []
  );

  const openDoorPropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "doors") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampDoorPropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setDoorPropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildDoorPropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      trackTelemetry("scene.door_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [clampDoorPropertiesDialogPosition, cloneSceneObject, trackTelemetry, userId]
  );

  const setDoorPropertiesActiveTab = useCallback((nextTab: DoorPropertiesTab) => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateDoorPropertiesDraftField = useCallback(
    (
      field:
        | "name"
        | "tag"
        | "resRef"
        | "appearanceType"
        | "genericAppearance"
        | "plot"
        | "hardness"
        | "hitPoints"
        | "fortitudeSave"
        | "reflexSave"
        | "willSave"
        | "description"
        | "comments",
      value: string | boolean | number
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        if ((current.draft as unknown as Record<string, string | boolean | number>)[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const updateDoorLockDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["lockSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.lockSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            lockSettings: {
              ...current.draft.lockSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTrapDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["trapSettings"], value: string | boolean | number) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.trapSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            trapSettings: {
              ...current.draft.trapSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorScriptSlotDraftField = useCallback((field: DoorScriptSlotKey, value: string) => {
    setDoorPropertiesDialog((current) => {
      if (!current || current.draft.scriptSlots[field] === value) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: value
          }
        }
      };
    });
  }, []);

  const updateDoorAdvancedDraftField = useCallback(
    (field: keyof DoorPropertiesDraft["advancedSettings"], value: string | boolean) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateDoorTransitionDraftField = useCallback(
    (
      field: "destinationTag" | "destinationType" | "linkedTarget" | "linkedModule" | "linkedWaypoint" | "loadScreen",
      value: string
    ) => {
      setDoorPropertiesDialog((current) => {
        if (!current || current.draft[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            [field]: value
          }
        };
      });
    },
    []
  );

  const applyDoorPropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!doorPropertiesDialog) {
        return;
      }

      const draft = doorPropertiesDialog.draft;
      const objectId = doorPropertiesDialog.objectId;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "doors") {
          return current;
        }
        const sourceDraft = buildDoorPropertiesDraft(sourceObject);
        if (areDoorPropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }
        const nextName = draft.name.trim();
        const nextTag = draft.tag.trim();
        const nextResRef = draft.resRef.trim();
        const nextDoorProperties: NonNullable<SceneObject["doorProperties"]> = {
          plot: draft.plot,
          hardness: draft.hardness,
          hitPoints: draft.hitPoints,
          fortitudeSave: draft.fortitudeSave,
          reflexSave: draft.reflexSave,
          willSave: draft.willSave,
          appearanceType: draft.appearanceType.trim() || DOOR_APPEARANCE_TYPE_OPTIONS[0]!,
          genericAppearance: draft.genericAppearance.trim() || DOOR_GENERIC_APPEARANCE_OPTIONS[0]!,
          lockSettings: { ...draft.lockSettings },
          trapSettings: { ...draft.trapSettings },
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            blueprintResRef: draft.advancedSettings.blueprintResRef.trim() || nextResRef
          },
          description: draft.description,
          comments: draft.comments
        };

        const nextFlags = { ...draft.transitionFlags };
        const hasTransitionFlags = Object.keys(nextFlags).length > 0;
        const nextDestinationType = draft.destinationType;
        const nextDestinationTag = draft.destinationTag.trim();
        const nextLinkedTarget =
          nextDestinationType === "none"
            ? ""
            : draft.linkedTarget.trim().length > 0
              ? draft.linkedTarget.trim()
              : nextDestinationType === "door"
                ? "door"
                : "waypoint";
        const nextLinkedModule = draft.linkedModule.trim();
        const nextLinkedWaypoint =
          nextDestinationType === "waypoint" ? draft.linkedWaypoint.trim() : "";
        const nextLoadScreen = draft.loadScreen.trim();
        const shouldClearTransition =
          nextDestinationType === "none" &&
          nextDestinationTag.length === 0 &&
          nextLinkedModule.length === 0 &&
          nextLinkedWaypoint.length === 0 &&
          nextLoadScreen.length === 0 &&
          !hasTransitionFlags;
        const nextDoorTransition = shouldClearTransition
          ? undefined
          : {
              linkedTarget: nextLinkedTarget,
              linkedModule: nextLinkedModule,
              linkedTag: nextDestinationTag,
              linkedWaypoint: nextLinkedWaypoint,
              loadScreen: nextLoadScreen,
              flags: nextFlags
            };

        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName,
                tag: nextTag,
                resRef: nextResRef,
                doorProperties: nextDoorProperties,
                doorTransition: nextDoorTransition
              }
            : object
        );
        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.door_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });

      if (closeAfterApply) {
        setDoorPropertiesDialog(null);
      }
    },
    [doorPropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelDoorPropertiesDialog = useCallback(() => {
    if (doorPropertiesDialog) {
      trackTelemetry("scene.door_properties.cancel", {
        userId,
        objectId: doorPropertiesDialog.objectId
      });
    }
    setDoorPropertiesDialog(null);
  }, [doorPropertiesDialog, trackTelemetry, userId]);

  const toggleDoorPropertiesDialogCollapsed = useCallback(() => {
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startDoorPropertiesDialogDrag,
    onHeaderPointerMove: moveDoorPropertiesDialogDrag,
    onHeaderPointerUp: endDoorPropertiesDialogDrag,
    onHeaderPointerCancel: cancelDoorPropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: doorPropertiesDialog,
    setDialog: setDoorPropertiesDialog,
    hostRef,
    panelRef: doorPropertiesDialogRef,
    dragRef: doorPropertiesDialogDragRef,
    clampPosition: clampDoorPropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const clampCreaturePropertiesDialogPosition = useCallback(
    (x: number, y: number, panelRect?: DOMRect | null) => {
      const hostRect = hostRef.current?.getBoundingClientRect();
      if (!hostRect) {
        return { x, y };
      }
      const measuredRect =
        panelRect ?? creaturePropertiesDialogRef.current?.getBoundingClientRect() ?? null;
      const panelWidth = measuredRect?.width ?? CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
      const panelHeight = measuredRect?.height ?? CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
      const maxX = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.width - panelWidth - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      const maxY = Math.max(
        ADJUST_LOCATION_DIALOG_MARGIN_PX,
        hostRect.height - panelHeight - ADJUST_LOCATION_DIALOG_MARGIN_PX
      );
      return {
        x: Math.min(Math.max(x, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxX),
        y: Math.min(Math.max(y, ADJUST_LOCATION_DIALOG_MARGIN_PX), maxY)
      };
    },
    []
  );

  const openCreaturePropertiesDialog = useCallback(
    (target: SceneObject) => {
      if (target.kind !== "creatures") {
        return;
      }

      const runtime = runtimeRef.current;
      const anchorOffsetX = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_X_PX;
      const anchorOffsetY = CONTEXT_MENU_DEFAULT_ANCHOR_OFFSET_Y_PX;
      const initialDialogPosition = runtime
        ? resolveAnchoredContextMenuPosition(
            runtime,
            target,
            target.id,
            anchorOffsetX,
            anchorOffsetY,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX,
            CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX
          )
        : clampCreaturePropertiesDialogPosition(
            ADJUST_LOCATION_DIALOG_MARGIN_PX,
            ADJUST_LOCATION_DIALOG_MARGIN_PX
          );
      setCreaturePropertiesDialog({
        objectId: target.id,
        snapshotObject: cloneSceneObject(target),
        draft: buildCreaturePropertiesDraft(target),
        activeTab: "basic",
        windowX: initialDialogPosition.x,
        windowY: initialDialogPosition.y,
        anchorOffsetX,
        anchorOffsetY,
        collapsed: false
      });
      setCreatureFeatsFilter(CREATURE_FEAT_FILTER_OPTIONS[0]!);
      setCreatureSpellsLevelFilter(CREATURE_SPELL_LEVEL_FILTER_OPTIONS[0]!);
      setCreatureSpellsMetaMagicFilter(CREATURE_METAMAGIC_FILTER_OPTIONS[0]!);
      setCreatureSpellsClassFilterIndex(0);
      setCreatureSpecialAbilitiesFilter(CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS[0]!);
      trackTelemetry("scene.creature_properties.open", {
        userId,
        objectId: target.id
      });
    },
    [
      clampCreaturePropertiesDialogPosition,
      cloneSceneObject,
      trackTelemetry,
      userId,
      setCreatureFeatsFilter,
      setCreatureSpellsLevelFilter,
      setCreatureSpellsMetaMagicFilter,
      setCreatureSpellsClassFilterIndex,
      setCreatureSpecialAbilitiesFilter
    ]
  );

  const setCreaturePropertiesActiveTab = useCallback((nextTab: CreaturePropertiesTab) => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            activeTab: nextTab
          }
        : current
    );
  }, []);

  const updateCreaturePropertiesDraftField = useCallback(
    (field: keyof CreaturePropertiesDraft, value: string | number | boolean) => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const nextDraft = { ...current.draft, [field]: value };
        if (areCreaturePropertiesDraftsEqual(current.draft, nextDraft)) {
          return current;
        }
        return {
          ...current,
          draft: nextDraft
        };
      });
    },
    []
  );

  const updateCreatureClassEntry = useCallback(
    (index: number, field: "className" | "level", value: string | number) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || index < 0 || index >= current.draft.classEntries.length) {
          return current;
        }
        const nextEntries = current.draft.classEntries.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, [field]: value } : entry
        );
        return {
          ...current,
          draft: {
            ...current.draft,
            classEntries: nextEntries
          }
        };
      });
    },
    []
  );

  const updateCreatureSkillRank = useCallback((index: number, rank: number) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || index < 0 || index >= current.draft.skills.length) {
        return current;
      }
      const nextSkills = current.draft.skills.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, rank } : entry
      );
      return {
        ...current,
        draft: {
          ...current.draft,
          skills: nextSkills
        }
      };
    });
  }, []);

  const updateCreatureScriptSlot = useCallback((field: CreatureScriptSlotKey, value: string) => {
    setCreaturePropertiesDialog((current) => {
      if (!current || current.draft.scriptSlots[field] === value) {
        return current;
      }
      return {
        ...current,
        draft: {
          ...current.draft,
          scriptSlots: {
            ...current.draft.scriptSlots,
            [field]: value
          }
        }
      };
    });
  }, []);

  const updateCreatureAppearancePart = useCallback(
    (field: keyof CreaturePropertiesDraft["appearanceParts"], value: string) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || current.draft.appearanceParts[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            appearanceParts: {
              ...current.draft.appearanceParts,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const updateCreatureAdvancedField = useCallback(
    (
      field: keyof CreaturePropertiesDraft["advancedSettings"],
      value: string | number | boolean
    ) => {
      setCreaturePropertiesDialog((current) => {
        if (!current || current.draft.advancedSettings[field] === value) {
          return current;
        }
        return {
          ...current,
          draft: {
            ...current.draft,
            advancedSettings: {
              ...current.draft.advancedSettings,
              [field]: value
            }
          }
        };
      });
    },
    []
  );

  const applyCreaturePropertiesDraft = useCallback(
    (closeAfterApply: boolean) => {
      if (!creaturePropertiesDialog) {
        return;
      }
      const objectId = creaturePropertiesDialog.objectId;
      const draft = creaturePropertiesDialog.draft;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === objectId);
        if (!sourceObject || sourceObject.kind !== "creatures") {
          return current;
        }

        const sourceDraft = buildCreaturePropertiesDraft(sourceObject);
        if (areCreaturePropertiesDraftsEqual(sourceDraft, draft)) {
          return current;
        }

        const nextTag = draft.tag.trim() || sourceObject.tag;
        const nextAppearanceResRef = draft.appearance.trim() || sourceObject.resRef;
        const nextFirstName = draft.firstName.trim() || resolveSceneObjectName(sourceObject);
        const nextName = [nextFirstName, draft.lastName.trim()].filter((part) => part.length > 0).join(" ");

        const nextCreatureProperties = {
          firstName: nextFirstName,
          lastName: draft.lastName.trim(),
          race: draft.race.trim(),
          appearance: draft.appearance.trim(),
          phenotype: draft.phenotype.trim(),
          gender: draft.gender.trim(),
          description: draft.description,
          challengeRating: Math.max(0, draft.challengeRating),
          portraitResRef: draft.portraitResRef.trim(),
          conversation: draft.conversation.trim(),
          noInterrupt: draft.noInterrupt,
          statistics: {
            abilityScores: {
              strength: draft.strength,
              dexterity: draft.dexterity,
              constitution: draft.constitution,
              intelligence: draft.intelligence,
              wisdom: draft.wisdom,
              charisma: draft.charisma
            },
            racialModifiers: {
              strength: draft.strRacial,
              dexterity: draft.dexRacial,
              constitution: draft.conRacial,
              intelligence: draft.intRacial,
              wisdom: draft.wisRacial,
              charisma: draft.chaRacial
            },
            saves: {
              fortitudeBase: draft.fortitudeBase,
              fortitudeBonus: draft.fortitudeBonus,
              reflexBase: draft.reflexBase,
              reflexBonus: draft.reflexBonus,
              willBase: draft.willBase,
              willBonus: draft.willBonus
            },
            naturalArmorClass: draft.naturalArmorClass,
            baseArmorClass: draft.baseArmorClass,
            dexterityBonus: draft.dexterityBonus,
            sizeModifier: draft.sizeModifier,
            baseHitPoints: draft.baseHitPoints,
            hitPointBonuses: draft.hitPointBonuses,
            movementRate: draft.movementRate
          },
          appearanceSettings: {
            partBasedAppearance: draft.appearancePartBased,
            ...draft.appearanceParts
          },
          classEntries: draft.classEntries
            .filter((entry) => entry.className.trim().length > 0)
            .map((entry) => ({
              className: entry.className.trim(),
              level: Math.max(1, Math.trunc(entry.level))
            })),
          skills: draft.skills.map((entry) => ({
            skill: entry.skill,
            rank: Math.max(0, Math.trunc(entry.rank))
          })),
          scriptSlots: { ...draft.scriptSlots },
          advancedSettings: {
            ...draft.advancedSettings,
            corpseDecayTimeSeconds: Math.max(
              0,
              Math.trunc(draft.advancedSettings.corpseDecayTimeSeconds)
            )
          },
          feats: draft.feats.map((entry) => ({ ...entry })),
          spells: draft.spells.map((entry) => ({ ...entry })),
          specialAbilities: draft.specialAbilities.map((entry) => ({ ...entry })),
          comments: draft.comments
        };

        const nextObjects = current.present.objects.map((object) =>
          object.id === objectId
            ? {
                ...object,
                name: nextName.length > 0 ? nextName : nextTag,
                tag: nextTag,
                resRef: nextAppearanceResRef,
                creatureProperties: nextCreatureProperties,
                placeableProperties: undefined,
                soundPositioning: undefined,
                doorTransition: undefined
              }
            : object
        );

        const nextScene = {
          ...current.present,
          objects: nextObjects
        };
        return sceneViewportPort.commitHistory(current, nextScene);
      });

      trackTelemetry("scene.creature_properties.apply", {
        userId,
        objectId,
        closeAfterApply
      });
      if (closeAfterApply) {
        setCreaturePropertiesDialog(null);
      }
    },
    [creaturePropertiesDialog, sceneViewportPort, trackTelemetry, userId]
  );

  const cancelCreaturePropertiesDialog = useCallback(() => {
    if (creaturePropertiesDialog) {
      const snapshot = creaturePropertiesDialog.snapshotObject;
      setSceneHistory((current) => {
        const sourceObject = current.present.objects.find((object) => object.id === snapshot.id);
        if (!sourceObject || sourceObject.kind !== "creatures" || snapshot.kind !== "creatures") {
          return current;
        }
        const sourceDraft = buildCreaturePropertiesDraft(sourceObject);
        const snapshotDraft = buildCreaturePropertiesDraft(snapshot);
        if (areCreaturePropertiesDraftsEqual(sourceDraft, snapshotDraft)) {
          return current;
        }
        const nextObjects = current.present.objects.map((object) =>
          object.id === snapshot.id ? cloneSceneObject(snapshot) : object
        );
        return sceneViewportPort.commitHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      trackTelemetry("scene.creature_properties.cancel", {
        userId,
        objectId: snapshot.id
      });
    }
    setCreaturePropertiesDialog(null);
  }, [cloneSceneObject, creaturePropertiesDialog, sceneViewportPort, trackTelemetry, userId]);

  const toggleCreaturePropertiesDialogCollapsed = useCallback(() => {
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            collapsed: !current.collapsed
          }
        : current
    );
  }, []);

  const {
    onHeaderPointerDown: startCreaturePropertiesDialogDrag,
    onHeaderPointerMove: moveCreaturePropertiesDialogDrag,
    onHeaderPointerUp: endCreaturePropertiesDialogDrag,
    onHeaderPointerCancel: cancelCreaturePropertiesDialogDrag
  } = usePropertyDialogDrag({
    dialog: creaturePropertiesDialog,
    setDialog: setCreaturePropertiesDialog,
    hostRef,
    panelRef: creaturePropertiesDialogRef,
    dragRef: creaturePropertiesDialogDragRef,
    clampPosition: clampCreaturePropertiesDialogPosition,
    mapPosition: mapAnchoredDialogPosition
  });

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleContextAction = useCallback(
    (
      action:
        | "adjust_location"
        | "delete"
        | "variables"
        | "properties"
        | "duplicate"
        | "focus"
        | "copy_world_position"
        | "reset_transform"
    ) => {
      if (!contextMenu) {
        return;
      }

      const contextObj = scene.objects.find((object) => object.id === contextMenu.objectId) ?? null;
      if (!contextObj) {
        closeContextMenu();
        return;
      }

      if (isKindLocked(toolbarState.canvasDebug, contextObj.kind)) {
        trackTelemetry("scene.context_menu.action_blocked_locked_layer", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "adjust_location") {
        const selectedObjects = selectedObjectIds
          .map((id) => scene.objects.find((object) => object.id === id) ?? null)
          .filter((object): object is SceneObject => Boolean(object));
        const selectionIncludesContext = selectedObjects.some(
          (object) => object.id === contextObj.id
        );
        const resolvedTargets =
          selectionIncludesContext && selectedObjects.length > 1
            ? selectedObjects
            : [contextObj];
        const editableTargets = resolvedTargets.filter(
          (object) =>
            MOVE_ALLOWED_KINDS.has(object.kind) &&
            !isKindLocked(toolbarState.canvasDebug, object.kind)
        );
        if (
          editableTargets.length === 0 ||
          editableTargets.some((object) => object.kind === "doors")
        ) {
          trackTelemetry("scene.adjust_location.blocked", {
            userId,
            objectId: contextObj.id,
            objectKind: contextObj.kind,
            selectedCount: resolvedTargets.length
          });
          closeContextMenu();
          return;
        }

        setSelectedTileId(null);
        setSelectedObjectIds(editableTargets.map((object) => object.id));
        setPlaceablePropertiesDialog(null);
        setSoundPropertiesDialog(null);
        setDoorPropertiesDialog(null);
        setCreaturePropertiesDialog(null);
        openAdjustLocationDialog(editableTargets);
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "properties") {
        if (
          contextObj.kind !== "placeables" &&
          contextObj.kind !== "sounds" &&
          contextObj.kind !== "doors" &&
          contextObj.kind !== "creatures"
        ) {
          trackTelemetry("scene.object_properties.blocked_kind", {
            userId,
            objectId: contextObj.id,
            objectKind: contextObj.kind
          });
          closeContextMenu();
          return;
        }

        setSelectedTileId(null);
        setSelectedObjectIds([contextObj.id]);
        setAdjustLocationDialog(null);
        if (contextObj.kind === "placeables") {
          setSoundPropertiesDialog(null);
          setDoorPropertiesDialog(null);
          setCreaturePropertiesDialog(null);
          openPlaceablePropertiesDialog(contextObj);
        } else if (contextObj.kind === "sounds") {
          setPlaceablePropertiesDialog(null);
          setDoorPropertiesDialog(null);
          setCreaturePropertiesDialog(null);
          openSoundPropertiesDialog(contextObj);
        } else if (contextObj.kind === "creatures") {
          setPlaceablePropertiesDialog(null);
          setSoundPropertiesDialog(null);
          setDoorPropertiesDialog(null);
          openCreaturePropertiesDialog(contextObj);
        } else {
          setPlaceablePropertiesDialog(null);
          setSoundPropertiesDialog(null);
          setCreaturePropertiesDialog(null);
          openDoorPropertiesDialog(contextObj);
        }
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
        closeContextMenu();
        return;
      }

      if (action === "delete") {
        const shouldTrackContextMenuDelete = scene.objects.some(
          (sceneObject) => sceneObject.id === contextMenu.objectId
        );
        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.deleteObjectById(
            current.present,
            contextMenu.objectId
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        setSelectedObjectIds((current) =>
          current.filter((selectedId) => selectedId !== contextMenu.objectId)
        );
        if (shouldTrackContextMenuDelete) {
          trackTelemetry("scene.context_menu.delete_object", {
            userId,
            objectId: contextMenu.objectId,
            objectKind: contextMenu.objectKind
          });
        }
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
      } else if (action === "duplicate") {
        duplicateObjects([contextObj], "context_menu");
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
      } else if (action === "focus") {
        focusCameraOnWorldPoint(contextObj.x, contextObj.y);
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
      } else if (action === "copy_world_position") {
        const payload = JSON.stringify({
          x: contextObj.x,
          y: contextObj.y,
          z: contextObj.z
        });
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
          void navigator.clipboard.writeText(payload).then(
            () =>
              trackTelemetry("scene.context_menu.copy_world_position", {
                userId,
                objectId: contextObj.id,
                copied: true
              }),
            () =>
              trackTelemetry("scene.context_menu.copy_world_position", {
                userId,
                objectId: contextObj.id,
                copied: false
              })
          );
        }
      } else if (action === "reset_transform") {
        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.resetObjectTransform(
            current.present,
            contextObj.id
          );
          if (nextScene === current.present) {
            return current;
          }
          return sceneViewportPort.commitHistory(current, nextScene);
        });
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextObj.id,
          objectKind: contextObj.kind,
          action
        });
      } else {
        trackTelemetry("scene.context_menu.action", {
          userId,
          objectId: contextMenu.objectId,
          objectKind: contextMenu.objectKind,
          action
        });
      }

      closeContextMenu();
    },
    [
      openAdjustLocationDialog,
      openCreaturePropertiesDialog,
      openDoorPropertiesDialog,
      openPlaceablePropertiesDialog,
      openSoundPropertiesDialog,
      closeContextMenu,
      contextMenu,
      duplicateObjects,
      focusCameraOnWorldPoint,
      scene.objects,
      sceneViewportPort,
      selectedObjectIds,
      toolbarState.canvasDebug,
      userId
    ]
  );

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeContextMenu();
      }
    };

    window.addEventListener("keydown", handleEscape);
    const runtime = runtimeRef.current;
    if (!runtime) {
      return () => {
        window.removeEventListener("keydown", handleEscape);
      };
    }

    const syncContextMenuToObject = () => {
      setContextMenu((current) => {
        if (!current) {
          return current;
        }
        const targetObject = scene.objects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject) {
          return null;
        }
        const menuWidth = contextMenuRef.current?.offsetWidth ?? CONTEXT_MENU_FALLBACK_WIDTH_PX;
        const menuHeight = contextMenuRef.current?.offsetHeight ?? CONTEXT_MENU_FALLBACK_HEIGHT_PX;
        const anchoredPosition = resolveAnchoredContextMenuPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          menuWidth,
          menuHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.x) < 0.5 &&
          Math.abs(anchoredPosition.y - current.y) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          x: anchoredPosition.x,
          y: anchoredPosition.y
        };
      });
    };

    syncContextMenuToObject();
    runtime.controls.addEventListener("change", syncContextMenuToObject);
    window.addEventListener("resize", syncContextMenuToObject);

    return () => {
      runtime.controls.removeEventListener("change", syncContextMenuToObject);
      window.removeEventListener("resize", syncContextMenuToObject);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeContextMenu, contextMenu, leftPanelWidthPx, rightPanelWidthPx, scene.objects]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncSoundPropertiesDialogToObject = () => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const targetObject = scene.objects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject || targetObject.kind !== "sounds") {
          return null;
        }
        const panelWidth = soundPropertiesDialogRef.current?.offsetWidth ?? SOUND_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
        const panelHeight =
          soundPropertiesDialogRef.current?.offsetHeight ?? SOUND_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
        const anchoredPosition = resolveAnchoredContextMenuPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          panelWidth,
          panelHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.windowX) < 0.5 &&
          Math.abs(anchoredPosition.y - current.windowY) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          windowX: anchoredPosition.x,
          windowY: anchoredPosition.y
        };
      });
    };

    syncSoundPropertiesDialogToObject();
    runtime.controls.addEventListener("change", syncSoundPropertiesDialogToObject);
    window.addEventListener("resize", syncSoundPropertiesDialogToObject);
    return () => {
      runtime.controls.removeEventListener("change", syncSoundPropertiesDialogToObject);
      window.removeEventListener("resize", syncSoundPropertiesDialogToObject);
    };
  }, [
    scene.objects,
    soundPropertiesDialog,
    soundPropertiesDialog?.anchorOffsetX,
    soundPropertiesDialog?.anchorOffsetY,
    soundPropertiesDialog?.collapsed,
    soundPropertiesDialog?.objectId
  ]);

  useEffect(() => {
    if (!placeablePropertiesDialog) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncPlaceablePropertiesDialogToObject = () => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const targetObject = scene.objects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject || targetObject.kind !== "placeables") {
          return null;
        }
        const panelWidth =
          placeablePropertiesDialogRef.current?.offsetWidth ?? PLACEABLE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
        const panelHeight =
          placeablePropertiesDialogRef.current?.offsetHeight ?? PLACEABLE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
        const anchoredPosition = resolveAnchoredContextMenuPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          panelWidth,
          panelHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.windowX) < 0.5 &&
          Math.abs(anchoredPosition.y - current.windowY) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          windowX: anchoredPosition.x,
          windowY: anchoredPosition.y
        };
      });
    };

    syncPlaceablePropertiesDialogToObject();
    runtime.controls.addEventListener("change", syncPlaceablePropertiesDialogToObject);
    window.addEventListener("resize", syncPlaceablePropertiesDialogToObject);
    return () => {
      runtime.controls.removeEventListener("change", syncPlaceablePropertiesDialogToObject);
      window.removeEventListener("resize", syncPlaceablePropertiesDialogToObject);
    };
  }, [
    placeablePropertiesDialog,
    placeablePropertiesDialog?.anchorOffsetX,
    placeablePropertiesDialog?.anchorOffsetY,
    placeablePropertiesDialog?.collapsed,
    placeablePropertiesDialog?.objectId,
    scene.objects
  ]);

  useEffect(() => {
    if (!doorPropertiesDialog) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncDoorPropertiesDialogToObject = () => {
      setDoorPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const targetObject = scene.objects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject || targetObject.kind !== "doors") {
          return null;
        }
        const panelWidth = doorPropertiesDialogRef.current?.offsetWidth ?? DOOR_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
        const panelHeight =
          doorPropertiesDialogRef.current?.offsetHeight ?? DOOR_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
        const anchoredPosition = resolveAnchoredContextMenuPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          panelWidth,
          panelHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.windowX) < 0.5 &&
          Math.abs(anchoredPosition.y - current.windowY) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          windowX: anchoredPosition.x,
          windowY: anchoredPosition.y
        };
      });
    };

    syncDoorPropertiesDialogToObject();
    runtime.controls.addEventListener("change", syncDoorPropertiesDialogToObject);
    window.addEventListener("resize", syncDoorPropertiesDialogToObject);
    return () => {
      runtime.controls.removeEventListener("change", syncDoorPropertiesDialogToObject);
      window.removeEventListener("resize", syncDoorPropertiesDialogToObject);
    };
  }, [
    doorPropertiesDialog,
    doorPropertiesDialog?.anchorOffsetX,
    doorPropertiesDialog?.anchorOffsetY,
    doorPropertiesDialog?.collapsed,
    doorPropertiesDialog?.objectId,
    scene.objects
  ]);

  useEffect(() => {
    if (!creaturePropertiesDialog) {
      return;
    }

    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const syncCreaturePropertiesDialogToObject = () => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const targetObject = scene.objects.find((object) => object.id === current.objectId) ?? null;
        if (!targetObject || targetObject.kind !== "creatures") {
          return null;
        }
        const panelWidth =
          creaturePropertiesDialogRef.current?.offsetWidth ?? CREATURE_PROPERTIES_DIALOG_FALLBACK_WIDTH_PX;
        const panelHeight =
          creaturePropertiesDialogRef.current?.offsetHeight ?? CREATURE_PROPERTIES_DIALOG_FALLBACK_HEIGHT_PX;
        const anchoredPosition = resolveAnchoredContextMenuPosition(
          runtime,
          targetObject,
          current.objectId,
          current.anchorOffsetX,
          current.anchorOffsetY,
          panelWidth,
          panelHeight
        );
        if (
          Math.abs(anchoredPosition.x - current.windowX) < 0.5 &&
          Math.abs(anchoredPosition.y - current.windowY) < 0.5
        ) {
          return current;
        }
        return {
          ...current,
          windowX: anchoredPosition.x,
          windowY: anchoredPosition.y
        };
      });
    };

    syncCreaturePropertiesDialogToObject();
    runtime.controls.addEventListener("change", syncCreaturePropertiesDialogToObject);
    window.addEventListener("resize", syncCreaturePropertiesDialogToObject);
    return () => {
      runtime.controls.removeEventListener("change", syncCreaturePropertiesDialogToObject);
      window.removeEventListener("resize", syncCreaturePropertiesDialogToObject);
    };
  }, [
    creaturePropertiesDialog,
    creaturePropertiesDialog?.anchorOffsetX,
    creaturePropertiesDialog?.anchorOffsetY,
    creaturePropertiesDialog?.collapsed,
    creaturePropertiesDialog?.objectId,
    scene.objects
  ]);

  useEffect(() => {
    if (!adjustLocationDialog) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelAdjustLocationDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [adjustLocationDialog, cancelAdjustLocationDialog]);

  useEffect(() => {
    if (!placeablePropertiesDialog) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelPlaceablePropertiesDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelPlaceablePropertiesDialog, placeablePropertiesDialog]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelSoundPropertiesDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelSoundPropertiesDialog, soundPropertiesDialog]);

  useEffect(() => {
    if (!doorPropertiesDialog) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelDoorPropertiesDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelDoorPropertiesDialog, doorPropertiesDialog]);

  useEffect(() => {
    if (!creaturePropertiesDialog) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cancelCreaturePropertiesDialog();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [cancelCreaturePropertiesDialog, creaturePropertiesDialog]);

  useEffect(() => {
    setAdjustLocationDialog((current) => {
      if (!current || current.objectIds.length === 0) {
        return current;
      }

      const liveObjects = current.objectIds
        .map((id) => scene.objects.find((object) => object.id === id) ?? null)
        .filter((object): object is SceneObject => Boolean(object));
      if (liveObjects.length === 0) {
        return current;
      }

      const source = liveObjects[0];
      const nextDraft = buildAdjustLocationDraft(
        source,
        adjustLocationUnitsPerTile,
        scene.width,
        scene.height
      );
      const visualTransformMeta = resolveAdjustLocationVisualTransformMeta(liveObjects);
      if (
        areAdjustLocationDraftsEqual(current.draft, nextDraft) &&
        current.showVisualTransforms === visualTransformMeta.showVisualTransforms &&
        current.mixedStaticPlaceables === visualTransformMeta.mixedStaticPlaceables
      ) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft,
        showVisualTransforms: visualTransformMeta.showVisualTransforms,
        mixedStaticPlaceables: visualTransformMeta.mixedStaticPlaceables
      };
    });
  }, [adjustLocationUnitsPerTile, scene.height, scene.objects, scene.width]);

  useEffect(() => {
    setPlaceablePropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "placeables") {
        return null;
      }

      const nextDraft = buildPlaceablePropertiesDraft(liveObject);
      if (arePlaceablePropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects]);

  useEffect(() => {
    setSoundPropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "sounds") {
        return null;
      }

      const nextDraft = buildSoundPropertiesDraft(liveObject);
      if (areSoundPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects]);

  useEffect(() => {
    setDoorPropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "doors") {
        return null;
      }

      const nextDraft = buildDoorPropertiesDraft(liveObject);
      if (areDoorPropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects]);

  useEffect(() => {
    setCreaturePropertiesDialog((current) => {
      if (!current) {
        return current;
      }

      const liveObject = scene.objects.find((object) => object.id === current.objectId);
      if (!liveObject || liveObject.kind !== "creatures") {
        return null;
      }

      const nextDraft = buildCreaturePropertiesDraft(liveObject);
      if (areCreaturePropertiesDraftsEqual(current.draft, nextDraft)) {
        return current;
      }

      return {
        ...current,
        draft: nextDraft
      };
    });
  }, [scene.objects]);

  useEffect(() => {
    if (!adjustLocationDialog) {
      return;
    }
    const clampedPosition = clampAdjustLocationDialogPosition(
      adjustLocationDialog.windowX,
      adjustLocationDialog.windowY
    );
    if (
      clampedPosition.x === adjustLocationDialog.windowX &&
      clampedPosition.y === adjustLocationDialog.windowY
    ) {
      return;
    }
    setAdjustLocationDialog((current) =>
      current
        ? {
            ...current,
            windowX: clampedPosition.x,
            windowY: clampedPosition.y
          }
        : current
    );
  }, [
    adjustLocationDialog,
    adjustLocationDialog?.collapsed,
    adjustLocationDialog?.windowX,
    adjustLocationDialog?.windowY,
    clampAdjustLocationDialogPosition
  ]);

  useEffect(() => {
    if (!placeablePropertiesDialog) {
      return;
    }
    const clampedPosition = clampPlaceablePropertiesDialogPosition(
      placeablePropertiesDialog.windowX,
      placeablePropertiesDialog.windowY
    );
    if (
      clampedPosition.x === placeablePropertiesDialog.windowX &&
      clampedPosition.y === placeablePropertiesDialog.windowY
    ) {
      return;
    }
    setPlaceablePropertiesDialog((current) =>
      current
        ? {
            ...current,
            windowX: clampedPosition.x,
            windowY: clampedPosition.y
          }
        : current
    );
  }, [
    clampPlaceablePropertiesDialogPosition,
    placeablePropertiesDialog,
    placeablePropertiesDialog?.collapsed,
    placeablePropertiesDialog?.windowX,
    placeablePropertiesDialog?.windowY
  ]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      return;
    }
    const clampedPosition = clampSoundPropertiesDialogPosition(
      soundPropertiesDialog.windowX,
      soundPropertiesDialog.windowY
    );
    if (
      clampedPosition.x === soundPropertiesDialog.windowX &&
      clampedPosition.y === soundPropertiesDialog.windowY
    ) {
      return;
    }
    setSoundPropertiesDialog((current) =>
      current
        ? {
            ...current,
            windowX: clampedPosition.x,
            windowY: clampedPosition.y
          }
        : current
    );
  }, [
    clampSoundPropertiesDialogPosition,
    soundPropertiesDialog,
    soundPropertiesDialog?.collapsed,
    soundPropertiesDialog?.windowX,
    soundPropertiesDialog?.windowY
  ]);

  useEffect(() => {
    if (!doorPropertiesDialog) {
      return;
    }
    const clampedPosition = clampDoorPropertiesDialogPosition(
      doorPropertiesDialog.windowX,
      doorPropertiesDialog.windowY
    );
    if (
      clampedPosition.x === doorPropertiesDialog.windowX &&
      clampedPosition.y === doorPropertiesDialog.windowY
    ) {
      return;
    }
    setDoorPropertiesDialog((current) =>
      current
        ? {
            ...current,
            windowX: clampedPosition.x,
            windowY: clampedPosition.y
          }
        : current
    );
  }, [
    clampDoorPropertiesDialogPosition,
    doorPropertiesDialog,
    doorPropertiesDialog?.collapsed,
    doorPropertiesDialog?.windowX,
    doorPropertiesDialog?.windowY
  ]);

  useEffect(() => {
    if (!creaturePropertiesDialog) {
      return;
    }
    const clampedPosition = clampCreaturePropertiesDialogPosition(
      creaturePropertiesDialog.windowX,
      creaturePropertiesDialog.windowY
    );
    if (
      clampedPosition.x === creaturePropertiesDialog.windowX &&
      clampedPosition.y === creaturePropertiesDialog.windowY
    ) {
      return;
    }
    setCreaturePropertiesDialog((current) =>
      current
        ? {
            ...current,
            windowX: clampedPosition.x,
            windowY: clampedPosition.y
          }
        : current
    );
  }, [
    clampCreaturePropertiesDialogPosition,
    creaturePropertiesDialog,
    creaturePropertiesDialog?.collapsed,
    creaturePropertiesDialog?.windowX,
    creaturePropertiesDialog?.windowY
  ]);

  useEffect(() => {
    if (!adjustLocationDialog) {
      return;
    }
    const handleResize = () => {
      setAdjustLocationDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampAdjustLocationDialogPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [adjustLocationDialog, clampAdjustLocationDialogPosition]);

  useEffect(() => {
    if (!placeablePropertiesDialog) {
      return;
    }
    const handleResize = () => {
      setPlaceablePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampPlaceablePropertiesDialogPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampPlaceablePropertiesDialogPosition, placeablePropertiesDialog]);

  useEffect(() => {
    if (!soundPropertiesDialog) {
      return;
    }
    const handleResize = () => {
      setSoundPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampSoundPropertiesDialogPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampSoundPropertiesDialogPosition, soundPropertiesDialog]);

  useEffect(() => {
    if (!doorPropertiesDialog) {
      return;
    }
    const handleResize = () => {
      setDoorPropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampDoorPropertiesDialogPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampDoorPropertiesDialogPosition, doorPropertiesDialog]);

  useEffect(() => {
    if (!creaturePropertiesDialog) {
      return;
    }
    const handleResize = () => {
      setCreaturePropertiesDialog((current) => {
        if (!current) {
          return current;
        }
        const clamped = clampCreaturePropertiesDialogPosition(current.windowX, current.windowY);
        if (clamped.x === current.windowX && clamped.y === current.windowY) {
          return current;
        }
        return {
          ...current,
          windowX: clamped.x,
          windowY: clamped.y
        };
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [clampCreaturePropertiesDialogPosition, creaturePropertiesDialog]);

  const selectedTile = selectedTileId
    ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
    : null;

  const selectedSummary =
    selectedObjectIds.length > 0
      ? `${selectedObjectIds.length} object(s)`
      : selectedTile
        ? `tile ${selectedTile.col},${selectedTile.row}`
        : "none";
  const selectedObjectsForTransform = selectedObjectIds
    .map((id) => objectById.get(id) ?? null)
    .filter((object): object is SceneObject => Boolean(object));
  const gizmoModeBadge = resolveGizmoModeBadge(toolbarState.canvasDebug.gizmoMode);
  const visualTransformBlockedReason = isVisualTransformGizmoMode(toolbarState.canvasDebug.gizmoMode)
    ? resolveVisualTransformSelectionBlockedReason(
        selectedObjectsForTransform,
        toolbarState.canvasDebug
      )
    : null;
  const nonRenderCount = scene.objects.filter(
    (object) => resolveMockRenderStatus(object) === "non_render"
  ).length;
  const lockedKinds = Object.entries(toolbarState.canvasDebug.lockedKinds)
    .filter(([, locked]) => locked)
    .map(([kind]) => kind);
  const lockSummary = lockedKinds.length > 0 ? lockedKinds.join(", ") : "none";
  const isolateSummary = toolbarState.canvasDebug.isolateKind;
  const bookmarkSaved = Boolean(bookmark1Ref.current);
  const snapSummary = [
    toolbarState.canvasDebug.snapGrid ? "grid" : null,
    toolbarState.canvasDebug.snapAngle ? "angle" : null,
    toolbarState.canvasDebug.snapHeight ? "height" : null
  ]
    .filter(Boolean)
    .join(", ");

  const saveStatus = lastSavedAtUnixMs
    ? `Saved ${new Date(lastSavedAtUnixMs).toLocaleTimeString()}`
    : "Not saved yet";
  const controlPresetLabel = "Aurora Classic";
  const inputHint =
    "LMB select/paint | Alt+LMB add object | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Arrows move selected | Ctrl/Cmd+C copy | Ctrl/Cmd+X cut | Ctrl/Cmd+V paste | Del delete | Gizmo: 1 world move / 2 world bearing / 3 VT rotate / 4 VT offset / 5 VT scale | Canvas menu: gizmo/snap/layers/debug";
  const hudLeftPx = leftPanelWidthPx + 14;
  const hudRightPx = rightPanelWidthPx + 14;
  const hudMaxWidth = `calc(100% - ${leftPanelWidthPx + rightPanelWidthPx + 28}px)`;
  const controlsHintBottomPx = 14;

  useEffect(() => {
    if (!toolbarState.canvasDebug.runtimeHud && runtimePopupPinned) {
      setRuntimePopupPinned(false);
    }
  }, [runtimePopupPinned, toolbarState.canvasDebug.runtimeHud]);

  const selectionBoxStyle = useMemo(() => {
    if (!selectionBox.active) {
      return undefined;
    }
    const left = Math.min(selectionBox.startX, selectionBox.currentX);
    const top = Math.min(selectionBox.startY, selectionBox.currentY);
    const width = Math.abs(selectionBox.currentX - selectionBox.startX);
    const height = Math.abs(selectionBox.currentY - selectionBox.startY);
    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`
    };
  }, [selectionBox]);

  const contextObject = contextMenu
    ? scene.objects.find((object) => object.id === contextMenu.objectId) ?? null
    : null;
  const isContextObjectLocked = contextObject
    ? isKindLocked(toolbarState.canvasDebug, contextObject.kind)
    : false;
  const isContextPropertiesSupported =
    contextObject?.kind === "placeables" ||
    contextObject?.kind === "sounds" ||
    contextObject?.kind === "doors" ||
    contextObject?.kind === "creatures";
  const soundPositioningMode = soundPropertiesDialog?.draft.mode ?? "specific";
  const soundGating = {
    positioningDisabled: soundPositioningMode === "everywhere",
    randomRangeEnabled: soundPositioningMode === "random"
  };
  const soundRandomRangeDisplay = soundPropertiesDialog
    ? {
        westEast:
          soundGating.randomRangeEnabled || soundPropertiesDialog.draft.randomRangeWestEast > 0
            ? soundPropertiesDialog.draft.randomRangeWestEast
            : 10,
        northSouth:
          soundGating.randomRangeEnabled || soundPropertiesDialog.draft.randomRangeNorthSouth > 0
            ? soundPropertiesDialog.draft.randomRangeNorthSouth
            : 10
      }
    : { westEast: 10, northSouth: 10 };
  const canPreviewSelectedSound = soundPropertiesDialog
    ? resolveSoundPreviewAssetUrl(resolveSelectedSoundPreviewKey(soundPropertiesDialog.draft)) !== null
    : false;
  const soundHourMaskFlags = soundPropertiesDialog
    ? parseSoundHourMask(
        soundPropertiesDialog.draft.hourMask,
        soundPropertiesDialog.draft.hoursStart,
        soundPropertiesDialog.draft.hoursEnd
      )
    : new Array<boolean>(SOUND_HOUR_COUNT).fill(false);
  const soundAdvancedWhenToPlay = soundPropertiesDialog?.draft.whenToPlay ?? "always";
  const isSoundSpecificHoursEnabled = soundAdvancedWhenToPlay === "hours";
  const creatureAbilityTotals = creaturePropertiesDialog
    ? {
        strength: creaturePropertiesDialog.draft.strength + creaturePropertiesDialog.draft.strRacial,
        dexterity: creaturePropertiesDialog.draft.dexterity + creaturePropertiesDialog.draft.dexRacial,
        constitution:
          creaturePropertiesDialog.draft.constitution + creaturePropertiesDialog.draft.conRacial,
        intelligence:
          creaturePropertiesDialog.draft.intelligence + creaturePropertiesDialog.draft.intRacial,
        wisdom: creaturePropertiesDialog.draft.wisdom + creaturePropertiesDialog.draft.wisRacial,
        charisma: creaturePropertiesDialog.draft.charisma + creaturePropertiesDialog.draft.chaRacial
      }
    : null;
  const creatureAbilityBonuses = creatureAbilityTotals
    ? {
        strength: resolveAbilityScoreModifier(creatureAbilityTotals.strength),
        dexterity: resolveAbilityScoreModifier(creatureAbilityTotals.dexterity),
        constitution: resolveAbilityScoreModifier(creatureAbilityTotals.constitution),
        intelligence: resolveAbilityScoreModifier(creatureAbilityTotals.intelligence),
        wisdom: resolveAbilityScoreModifier(creatureAbilityTotals.wisdom),
        charisma: resolveAbilityScoreModifier(creatureAbilityTotals.charisma)
      }
    : null;
  const creatureTotalArmorClass = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.naturalArmorClass +
      creaturePropertiesDialog.draft.baseArmorClass +
      creaturePropertiesDialog.draft.dexterityBonus +
      creaturePropertiesDialog.draft.sizeModifier
    : 0;
  const creatureTotalHitPoints = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.baseHitPoints + creaturePropertiesDialog.draft.hitPointBonuses
    : 0;
  const creatureCalculatedChallengeRating = creaturePropertiesDialog
    ? Math.max(
        0,
        creaturePropertiesDialog.draft.challengeRating +
          creaturePropertiesDialog.draft.advancedSettings.challengeRatingAdjustment
      )
    : 0;
  const creatureFeatsSource = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.feats.length > 0
      ? creaturePropertiesDialog.draft.feats
      : CREATURE_DEFAULT_MOCK_FEATS
    : [];
  const creatureFeatsRows =
    creatureFeatsFilter === "All Feats"
      ? creatureFeatsSource
      : creatureFeatsSource.filter((entry) => entry.type === creatureFeatsFilter);
  const creatureFeatsSummary = creatureFeatsSource
    .filter((entry) => entry.assigned)
    .reduce<Record<string, string[]>>((acc, entry) => {
      if (!acc[entry.type]) {
        acc[entry.type] = [];
      }
      acc[entry.type].push(entry.name);
      return acc;
    }, {});
  const creatureFeatsSummaryText =
    Object.entries(creatureFeatsSummary)
      .map(([type, names]) => `${type}\n${names.map((name) => `  ${name}`).join("\n")}`)
      .join("\n") || "No assigned feats";

  const creatureSpellSource = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.spells.length > 0
      ? creaturePropertiesDialog.draft.spells
      : CREATURE_DEFAULT_MOCK_SPELLS
    : [];
  const creatureSpellsRows =
    creatureSpellsLevelFilter === "All Levels"
      ? creatureSpellSource
      : creatureSpellSource.filter(
          (entry) => String(entry.spellLevel) === creatureSpellsLevelFilter
        );
  const creatureClassFilterEntries = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.classEntries
        .map((entry) => entry.className.trim())
        .filter((entry, index) => entry.length > 0 || index === 0)
        .slice(0, 8)
    : [];
  const creatureSpellsSummaryText =
    creatureSpellsRows.map((entry) => `${entry.name} (L${entry.spellLevel})`).join("\n") ||
    "No spells in current filter";

  const creatureSpecialAbilitiesSource = creaturePropertiesDialog
    ? creaturePropertiesDialog.draft.specialAbilities.length > 0
      ? creaturePropertiesDialog.draft.specialAbilities
      : CREATURE_DEFAULT_MOCK_SPECIAL_ABILITIES
    : [];
  const creatureSpecialAbilitiesRows =
    creatureSpecialAbilitiesFilter === "All Spells and Abilities"
      ? creatureSpecialAbilitiesSource
      : creatureSpecialAbilitiesSource.filter((entry) => entry.type === creatureSpecialAbilitiesFilter);
  const creatureSpecialAbilitiesSummaryText =
    creatureSpecialAbilitiesRows.map((entry) => `${entry.type}\n  ${entry.name}`).join("\n") ||
    "No abilities in current filter";
  const resolveCanvasObjectAddPlacement = useCallback(
    (clientX: number, clientY: number): { x: number; y: number; tileId: string | null } | null => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return null;
      }

      const rect = runtime.renderer.domElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return null;
      }

      const boundedClientX = Math.min(rect.right, Math.max(rect.left, clientX));
      const boundedClientY = Math.min(rect.bottom, Math.max(rect.top, clientY));
      const ndc = new THREE.Vector2(
        ((boundedClientX - rect.left) / rect.width) * 2 - 1,
        -((boundedClientY - rect.top) / rect.height) * 2 + 1
      );
      const groundHit = intersectionOnGround(runtime, ndc);
      if (!groundHit) {
        return null;
      }

      const placementX = groundHit.x;
      const placementY = groundHit.z;
      const tile = findTileAtWorld(scene, placementX, placementY);
      return {
        x: placementX,
        y: placementY,
        tileId: tile?.id ?? null
      };
    },
    [scene]
  );

  const handleCanvasDragOver = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const payload =
        tryParseObjectAddPayload(event.dataTransfer.getData(OBJECT_ADD_DRAG_MIME)) ??
        getCurrentObjectAddDragPayload();
      if (!payload) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";

      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        setObjectAddPreview(null);
        objectAddPlacementCacheRef.current = null;
        clearObjectAddGhost();
        return;
      }
      const payloadKey = resolveObjectAddPayloadKey(payload);

      const placement = resolveCanvasObjectAddPlacement(event.clientX, event.clientY);
      if (!placement) {
        setObjectAddPreview(null);
        clearObjectAddGhost();
        return;
      }
      objectAddPlacementCacheRef.current = {
        payloadKey,
        placementX: placement.x,
        placementY: placement.y,
        tileId: placement.tileId,
        updatedAtUnixMs: Date.now()
      };

      setObjectAddPreview({
        payload,
        placementX: placement.x,
        placementY: placement.y,
        screenX: event.clientX,
        screenY: event.clientY
      });
      syncObjectAddGhost(payload, placement.x, placement.y, placement.tileId !== null);
    },
    [
      clearObjectAddGhost,
      resolveCanvasObjectAddPlacement,
      setObjectAddPreview,
      syncObjectAddGhost,
      toolbarState.canvasDebug
    ]
  );

  const handleCanvasDragLeave = useCallback(() => {
    setObjectAddPreview(null);
    clearObjectAddGhost();
  }, [clearObjectAddGhost]);

  const handleCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      const payload =
        tryParseObjectAddPayload(event.dataTransfer.getData(OBJECT_ADD_DRAG_MIME)) ??
        getCurrentObjectAddDragPayload();
      if (!payload) {
        objectAddPlacementCacheRef.current = null;
        setCurrentObjectAddDragPayload(null);
        clearObjectAddGhost();
        return;
      }
      event.preventDefault();
      if (isKindLocked(toolbarState.canvasDebug, payload.kind)) {
        objectAddPlacementCacheRef.current = null;
        setCurrentObjectAddDragPayload(null);
        clearObjectAddGhost();
        return;
      }

      const canResolveFromDropPoint =
        Number.isFinite(event.clientX) &&
        Number.isFinite(event.clientY) &&
        (event.clientX !== 0 || event.clientY !== 0);
      const dropPlacement = canResolveFromDropPoint
        ? resolveCanvasObjectAddPlacement(event.clientX, event.clientY)
        : null;
      const resolvedPlacement = resolveObjectAddDropPlacement({
        payload,
        scene,
        preview: objectAddPreview,
        cachedPlacement: objectAddPlacementCacheRef.current,
        dropPlacement,
        nowUnixMs: Date.now()
      });
      setObjectAddPreview(null);
      objectAddPlacementCacheRef.current = null;
      setCurrentObjectAddDragPayload(null);
      clearObjectAddGhost();
      if (!resolvedPlacement || !resolvedPlacement.tileId) {
        setObjectAddDropFeedback({
          variant: "warning",
          message: "Obiekt upuszczono poza obszarem canvasu. Przenieś go nad tile i spróbuj ponownie."
        });
        trackTelemetry("scene.objects.add_from_panel_blocked_outside_canvas", {
          userId,
          kind: payload.kind
        });
        return;
      }

      setObjectAddDropFeedback(null);

      const placementX = resolvedPlacement.x;
      const placementY = resolvedPlacement.y;

      const newObjectSequence = nextObjectSequenceRef.current;
      nextObjectSequenceRef.current += 1;
      const created = sceneViewportPort.createObject(
        payload.kind,
        placementX,
        placementY,
        newObjectSequence
      );
      if (toolbarState.canvasDebug.snapAngle) {
        created.bearing = snapAngleRadians(created.bearing, workspaceOptions.snapAngleStepDeg);
      }
      if (toolbarState.canvasDebug.snapHeight) {
        created.z = snapHeightValue(created.z, workspaceOptions.snapHeightStep);
      }

      created.resRef = payload.resRef;
      created.name = payload.name;

      const sourceTemplate = scene.objects.find((object) => object.id === payload.id);
      if (sourceTemplate) {
        created.resRef = sourceTemplate.resRef;
        created.name = sourceTemplate.name;
        created.isStatic = sourceTemplate.isStatic;
        created.placeableProperties = sourceTemplate.placeableProperties
          ? {
              ...sourceTemplate.placeableProperties,
              scriptSlots: sourceTemplate.placeableProperties.scriptSlots
                ? { ...sourceTemplate.placeableProperties.scriptSlots }
                : undefined,
              disabledFlags: sourceTemplate.placeableProperties.disabledFlags
                ? { ...sourceTemplate.placeableProperties.disabledFlags }
                : undefined,
              lockSettings: sourceTemplate.placeableProperties.lockSettings
                ? { ...sourceTemplate.placeableProperties.lockSettings }
                : undefined,
              trapSettings: sourceTemplate.placeableProperties.trapSettings
                ? { ...sourceTemplate.placeableProperties.trapSettings }
                : undefined,
              advancedSettings: sourceTemplate.placeableProperties.advancedSettings
                ? { ...sourceTemplate.placeableProperties.advancedSettings }
                : undefined
            }
          : undefined;
        created.soundPositioning = sourceTemplate.soundPositioning
          ? {
              ...sourceTemplate.soundPositioning,
              preserve: sourceTemplate.soundPositioning.preserve
                ? {
                    ...sourceTemplate.soundPositioning.preserve,
                    flags: { ...sourceTemplate.soundPositioning.preserve.flags },
                    extra: { ...sourceTemplate.soundPositioning.preserve.extra }
                  }
                : undefined
            }
          : undefined;
        created.doorTransition = sourceTemplate.doorTransition
          ? {
              ...sourceTemplate.doorTransition,
              flags: { ...sourceTemplate.doorTransition.flags }
            }
          : undefined;
      }

      setSceneHistory((current) =>
        sceneViewportPort.commitHistory(
          current,
          sceneViewportPort.appendObjects(current.present, [created])
        )
      );
      setSelectedObjectIds([created.id]);
      setSelectedTileId(resolvedPlacement.tileId);
      trackTelemetry("scene.objects.add_from_panel", {
        userId,
        kind: payload.kind,
        objectId: created.id,
        sourceTemplateId: payload.id ?? null
      });
    },
    [
      clearObjectAddGhost,
      scene,
      scene.objects,
      sceneViewportPort,
      toolbarState.canvasDebug,
      trackTelemetry,
      userId,
      objectAddPreview,
      resolveCanvasObjectAddPlacement,
      workspaceOptions.snapAngleStepDeg,
      workspaceOptions.snapGridStep,
      workspaceOptions.snapHeightStep
    ]
  );

  return (
    <section
      className="canvas-stage-real"
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      <div
        ref={hostRef}
        className="workspace-render-canvas"
        aria-label="workspace render canvas"
        role="img"
        tabIndex={0}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(event) => event.preventDefault()}
      />

      {selectionBox.active && selectionBoxStyle ? (
        <div className="canvas-selection-box" style={selectionBoxStyle} aria-hidden="true" />
      ) : null}

      <aside
        className={`canvas-gizmo-mode-badge canvas-gizmo-mode-badge-${gizmoModeBadge.variant}`}
        role="note"
        aria-label="gizmo mode badge"
        style={{ left: `${hudLeftPx}px` }}
      >
        {gizmoModeBadge.label}
      </aside>

      {contextMenu ? (
        <article
          ref={contextMenuRef}
          className="canvas-context-menu"
          role="menu"
          aria-label="object context menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <header className="canvas-context-menu-header">
            <strong>{contextObject?.tag ?? contextMenu.objectId}</strong>
            <span>{contextMenu.objectKind}</span>
            {isContextObjectLocked ? <span>Layer locked</span> : null}
          </header>
          {contextObject?.kind !== "doors" ? (
            <button
              type="button"
              role="menuitem"
              disabled={isContextObjectLocked}
              onClick={() => handleContextAction("adjust_location")}
            >
              Adjust location
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={isContextObjectLocked}
            onClick={() => handleContextAction("duplicate")}
          >
            Duplicate
          </button>
          <button type="button" role="menuitem" onClick={() => handleContextAction("focus")}>
            Focus
          </button>
          <button type="button" role="menuitem" onClick={() => handleContextAction("copy_world_position")}>
            Copy world position
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isContextObjectLocked}
            onClick={() => handleContextAction("reset_transform")}
          >
            Reset transform
          </button>
          <button type="button" role="menuitem" disabled={isContextObjectLocked} onClick={() => handleContextAction("variables")}>
            Variables
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={isContextObjectLocked || !isContextPropertiesSupported}
            onClick={() => handleContextAction("properties")}
          >
            Properties
          </button>
          <button
            type="button"
            role="menuitem"
            className="danger"
            disabled={isContextObjectLocked}
            onClick={() => handleContextAction("delete")}
          >
            Delete
          </button>
        </article>
      ) : null}

      {adjustLocationDialog ? (
        <article
          ref={adjustLocationDialogRef}
          className={`canvas-adjust-location-dialog ${
            adjustLocationDialog.collapsed ? "is-collapsed" : ""
          }`}
          role="dialog"
          aria-label="Adjust location"
          style={{
            left: `${adjustLocationDialog.windowX}px`,
            top: `${adjustLocationDialog.windowY}px`
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <header
            className="canvas-adjust-location-header"
            onPointerDown={startAdjustLocationDialogDrag}
            onPointerMove={moveAdjustLocationDialogDrag}
            onPointerUp={endAdjustLocationDialogDrag}
            onPointerCancel={cancelAdjustLocationDialogDrag}
          >
            <div className="canvas-adjust-location-header-copy">
              <h2>Adjust Location</h2>
              <p>
                Editing {adjustLocationDialog.objectIds.length} object
                {adjustLocationDialog.objectIds.length === 1 ? "" : "s"}
              </p>
            </div>
            <div className="canvas-adjust-location-header-actions">
              <button
                type="button"
                onClick={() => toggleAdjustLocationDialogCollapsed()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label={
                  adjustLocationDialog.collapsed
                    ? "Expand adjust location dialog"
                    : "Collapse adjust location dialog"
                }
              >
                {adjustLocationDialog.collapsed ? "+" : "-"}
              </button>
              <button
                type="button"
                onClick={() => cancelAdjustLocationDialog()}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Close adjust location dialog"
              >
                x
              </button>
            </div>
          </header>

          {!adjustLocationDialog.collapsed ? (
            <>
              <section className="canvas-adjust-location-grid">
                <fieldset className="canvas-adjust-location-group">
                  <legend>Position</legend>
                  <label>
                    X
                    <input
                      type="number"
                      value={adjustLocationDialog.draft.x}
                      step="0.01"
                      onChange={(event) =>
                        updateAdjustLocationDraftField("x", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Y
                    <input
                      type="number"
                      value={adjustLocationDialog.draft.y}
                      step="0.01"
                      onChange={(event) =>
                        updateAdjustLocationDraftField("y", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Z
                    <input
                      type="number"
                      value={adjustLocationDialog.draft.z}
                      step="0.01"
                      onChange={(event) =>
                        updateAdjustLocationDraftField("z", event.target.value)
                      }
                    />
                  </label>
                </fieldset>

                <fieldset className="canvas-adjust-location-group">
                  <legend>Orientation</legend>
                  <label>
                    Bearing
                    <input
                      type="number"
                      value={adjustLocationDialog.draft.bearingDeg}
                      min="0"
                      max="360"
                      step="0.1"
                      onChange={(event) =>
                        updateAdjustLocationDraftField("bearingDeg", event.target.value)
                      }
                    />
                  </label>
                  <div
                    className="canvas-bearing-dial"
                    role="slider"
                    aria-label="Bearing dial"
                    aria-valuemin={0}
                    aria-valuemax={360}
                    aria-valuenow={Math.round(adjustLocationDialog.draft.bearingDeg)}
                    style={
                      {
                        "--bearing-dial-angle": `${adjustLocationDialog.draft.bearingDeg}deg`
                      } as CSSProperties
                    }
                    onPointerDown={startBearingDialDrag}
                    onPointerMove={moveBearingDialDrag}
                    onPointerUp={endBearingDialDrag}
                    onPointerCancel={endBearingDialDrag}
                  >
                    <span className="canvas-bearing-dial-center" />
                    <span className="canvas-bearing-dial-line" />
                  </div>
                </fieldset>
              </section>

              {adjustLocationDialog.showVisualTransforms ? (
                <section className="canvas-adjust-location-grid">
                  <fieldset className="canvas-adjust-location-group">
                    <legend>
                      Visual Transforms
                      <span
                        className="canvas-adjust-location-info"
                        title="Placeables: when Static is ON, visual transform values are saved but not rendered. When Static is OFF, saved values are applied."
                        aria-label="Visual transform rules info"
                      >
                        i
                      </span>
                    </legend>
                    <label>
                      Scale
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.scale}
                        step="0.01"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("scale", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      X Rotation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.xRotationDeg}
                        step="0.1"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("xRotationDeg", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Y Rotation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.yRotationDeg}
                        step="0.1"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("yRotationDeg", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Z Rotation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.zRotationDeg}
                        step="0.1"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("zRotationDeg", event.target.value)
                        }
                      />
                    </label>
                  </fieldset>

                  <fieldset className="canvas-adjust-location-group">
                    <legend>Visual Translation</legend>
                    <label>
                      X Translation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.xTranslation}
                        step="0.01"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("xTranslation", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Y Translation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.yTranslation}
                        step="0.01"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("yTranslation", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Z Translation
                      <input
                        type="number"
                        value={adjustLocationDialog.draft.zTranslation}
                        step="0.01"
                        onChange={(event) =>
                          updateAdjustLocationDraftField("zTranslation", event.target.value)
                        }
                      />
                    </label>
                  </fieldset>
                </section>
              ) : null}
              {adjustLocationDialog.showVisualTransforms &&
              adjustLocationDialog.mixedStaticPlaceables ? (
                <p className="canvas-adjust-location-note" role="note">
                  Mixed Static + non-Static selection: Visual Transforms are editable and saved
                  for all selected objects. Runtime applies scale/XY/rotation only where Static
                  is OFF; Z height still follows Adjust Location.
                </p>
              ) : null}

              <footer className="canvas-adjust-location-actions">
                <button type="button" onClick={() => applyAdjustLocationDraft(false)}>
                  Apply
                </button>
                <button type="button" onClick={() => applyAdjustLocationDraft(true)}>
                  OK
                </button>
                <button type="button" onClick={() => cancelAdjustLocationDialog()}>
                  Cancel
                </button>
              </footer>
            </>
          ) : null}
        </article>
      ) : null}

      {placeablePropertiesDialog ? (
        <SharedPropertyDialogChrome
          articleRef={placeablePropertiesDialogRef}
          articleClassName="canvas-placeable-properties-dialog"
          ariaLabel="Placeable properties"
          windowX={placeablePropertiesDialog.windowX}
          windowY={placeablePropertiesDialog.windowY}
          headerClassName="canvas-placeable-properties-header"
          headerCopyClassName="canvas-placeable-properties-header-copy"
          headerActionsClassName="canvas-placeable-properties-header-actions"
          title="Placeable Object Properties"
          subtitle={placeablePropertiesDialog.draft.tag || placeablePropertiesDialog.objectId}
          collapsed={placeablePropertiesDialog.collapsed}
          collapseLabel="Collapse placeable properties dialog"
          expandLabel="Expand placeable properties dialog"
          closeLabel="Close placeable properties dialog"
          onToggleCollapsed={togglePlaceablePropertiesDialogCollapsed}
          onClose={cancelPlaceablePropertiesDialog}
          onArticleMouseDown={(event) => event.stopPropagation()}
          onArticleContextMenu={(event) => event.preventDefault()}
          onHeaderPointerDown={startPlaceablePropertiesDialogDrag}
          onHeaderPointerMove={movePlaceablePropertiesDialogDrag}
          onHeaderPointerUp={endPlaceablePropertiesDialogDrag}
          onHeaderPointerCancel={cancelPlaceablePropertiesDialogDrag}
        >
          <>
              <SharedPropertyTabsNav
                className="canvas-placeable-properties-tabs"
                ariaLabel="placeable properties tabs"
                tabs={PLACEABLE_PROPERTIES_TAB_OPTIONS}
                activeTab={placeablePropertiesDialog.activeTab}
                onSelectTab={setPlaceablePropertiesActiveTab}
              />

              <section className="canvas-placeable-properties-shell">
                <SharedObjectPreviewPane
                  className="canvas-placeable-properties-preview-pane"
                  previewClassName="canvas-placeable-properties-preview"
                  previewText={placeablePropertiesDialog.draft.resRef}
                  actionClassName="canvas-placeable-properties-preview-action"
                />

                <div className="canvas-placeable-properties-pane">
                  {placeablePropertiesDialog.activeTab === "basic" ? (
                    <div className="canvas-placeable-properties-basic">
                      <div className="canvas-placeable-properties-basic-identity">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Name</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={placeablePropertiesDialog.draft.name}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("name", event.target.value)
                              }
                            />
                            <button type="button" disabled aria-label="Browse name">
                              ...
                            </button>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Tag</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={placeablePropertiesDialog.draft.tag}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("tag", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Appearance Type</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={placeablePropertiesDialog.draft.resRef}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("resRef", event.target.value)
                              }
                            />
                          </div>
                        </label>
                      </div>

                      <div className="canvas-placeable-properties-basic-details">
                        <div className="canvas-placeable-properties-basic-stats">
                          <label className="canvas-placeable-properties-field-row">
                            <span>Hardness</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                step="1"
                                value={placeablePropertiesDialog.draft.hardness}
                                onChange={(event) =>
                                  updatePlaceablePropertiesDraftField(
                                    "hardness",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Hit Points</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                step="1"
                                value={placeablePropertiesDialog.draft.hitPoints}
                                onChange={(event) =>
                                  updatePlaceablePropertiesDraftField(
                                    "hitPoints",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Fortitude Save</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                step="1"
                                value={placeablePropertiesDialog.draft.fortitudeSave}
                                onChange={(event) =>
                                  updatePlaceablePropertiesDraftField(
                                    "fortitudeSave",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Reflex Save</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                step="1"
                                value={placeablePropertiesDialog.draft.reflexSave}
                                onChange={(event) =>
                                  updatePlaceablePropertiesDraftField(
                                    "reflexSave",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Will Save</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="number"
                                step="1"
                                value={placeablePropertiesDialog.draft.willSave}
                                onChange={(event) =>
                                  updatePlaceablePropertiesDraftField(
                                    "willSave",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                        </div>
                        <div className="canvas-placeable-properties-basic-flags">
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.plot}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("plot", event.target.checked)
                              }
                            />
                            Plot
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.useable}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("useable", event.target.checked)
                              }
                            />
                            Useable
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.hasInventory}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField(
                                  "hasInventory",
                                  event.target.checked
                                )
                              }
                            />
                            Has Inventory
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.isStatic}
                              onChange={(event) =>
                                updatePlaceablePropertiesDraftField("isStatic", event.target.checked)
                              }
                            />
                            Static
                            <span className="canvas-accessibility-hidden">ACTIVE_NOW</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "lock" ? (
                    <SharedLockPropertySection
                      value={placeablePropertiesDialog.draft.lockSettings}
                      onChange={updatePlaceableLockDraftField}
                      classNames={{
                        root: "canvas-placeable-properties-group",
                        toggle: "canvas-placeable-properties-toggle",
                        dualFields: "canvas-placeable-properties-dual-fields",
                        fieldRow: "canvas-placeable-properties-field-row",
                        fieldControl: "canvas-placeable-properties-field-control",
                        fieldControlNarrow: "is-narrow"
                      }}
                      behavior={{
                        disableLockDetailsWhenUnlocked: true,
                        disableAutoRemoveKeyUnlessLockedAndRelockable: true
                      }}
                    />
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "trap" ? (
                    <SharedTrapPropertySection
                      value={placeablePropertiesDialog.draft.trapSettings}
                      onChange={updatePlaceableTrapDraftField}
                      trapTypeOptions={PLACEABLE_TRAP_TYPE_OPTIONS}
                      classNames={{
                        root: "canvas-placeable-properties-group",
                        nested: "canvas-placeable-properties-group canvas-placeable-properties-nested",
                        toggle: "canvas-placeable-properties-toggle",
                        toggleGrid: "canvas-placeable-properties-toggle-grid",
                        dualFields: "canvas-placeable-properties-dual-fields",
                        fieldRow: "canvas-placeable-properties-field-row",
                        fieldControl: "canvas-placeable-properties-field-control",
                        fieldControlNarrow: "is-narrow",
                        scriptRow: "canvas-placeable-properties-script-row"
                      }}
                      behavior={{
                        disableTrapDetailsWhenUntrapped: true
                      }}
                      scriptActionButtons={{
                        onDisarmScript: [{ label: "...", disabled: true }, { label: "Edit", disabled: true }],
                        onTrapTriggeredScript: [{ label: "...", disabled: true }, { label: "Edit", disabled: true }]
                      }}
                    />
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "scripts" ? (
                    <SharedScriptSlotSection
                      className="canvas-placeable-properties-group canvas-placeable-properties-scripts"
                      rowClassName="canvas-placeable-properties-script-row"
                      rowLabelClassName="canvas-placeable-properties-script-input-label"
                      slots={PLACEABLE_SCRIPT_SLOT_KEYS}
                      labels={PLACEABLE_SCRIPT_SLOT_LABELS}
                      values={placeablePropertiesDialog.draft.scriptSlots}
                      onChange={updatePlaceableScriptSlotDraftField}
                      inputIdPrefix="placeable-script"
                      hiddenLabelSuffix={<span className="canvas-accessibility-hidden"> Script</span>}
                      showInlineActionButtons
                      inlineBrowseDisabled
                      inlineEditDisabled
                      showSaveLoadActions
                      saveLoadActionsClassName="canvas-placeable-properties-script-actions"
                      saveDisabled
                      loadDisabled
                      enablePayloadToggle={{
                        checked: placeablePropertiesDialog.draft.scriptSlotsEnabled,
                        onChange: (checked) =>
                          updatePlaceablePropertiesDraftField("scriptSlotsEnabled", checked),
                        className: "canvas-accessibility-hidden",
                        label: "Enable script slots payload"
                      }}
                    />
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "advanced" ? (
                    <SharedAdvancedSettingsSection
                      sectionClassName="canvas-placeable-properties-group"
                      fieldRowClassName="canvas-placeable-properties-field-row"
                      fieldControlClassName="canvas-placeable-properties-field-control"
                      toggleClassName="canvas-placeable-properties-toggle"
                      portraitRowClassName="canvas-placeable-properties-portrait-row"
                      portraitPreviewClassName="canvas-placeable-properties-portrait-preview"
                      variablesRowClassName="canvas-placeable-properties-variables-row"
                      blueprintResRef={placeablePropertiesDialog.draft.advancedSettings.blueprintResRef}
                      onBlueprintResRefChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("blueprintResRef", nextValue)
                      }
                      belongsToFaction={placeablePropertiesDialog.draft.advancedSettings.belongsToFaction}
                      factionOptions={PLACEABLE_FACTION_OPTIONS}
                      onBelongsToFactionChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("belongsToFaction", nextValue)
                      }
                      conversation={placeablePropertiesDialog.draft.advancedSettings.conversation}
                      onConversationChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("conversation", nextValue)
                      }
                      showConversationActions
                      noInterrupt={placeablePropertiesDialog.draft.advancedSettings.noInterrupt}
                      onNoInterruptChange={(checked) =>
                        updatePlaceableAdvancedDraftField("noInterrupt", checked)
                      }
                      portraitResRef={placeablePropertiesDialog.draft.advancedSettings.portraitResRef}
                      onPortraitResRefChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("portraitResRef", nextValue)
                      }
                      showPortraitBrowseAction
                      initialState={placeablePropertiesDialog.draft.advancedSettings.initialState}
                      initialStateOptions={PLACEABLE_INITIAL_STATE_OPTIONS}
                      onInitialStateChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("initialState", nextValue)
                      }
                      treasureModel={placeablePropertiesDialog.draft.advancedSettings.treasureModel}
                      treasureModelOptions={PLACEABLE_TREASURE_MODEL_OPTIONS}
                      onTreasureModelChange={(nextValue) =>
                        updatePlaceableAdvancedDraftField("treasureModel", nextValue)
                      }
                    >
                      <details className="canvas-placeable-properties-preserve-note">
                        <summary>Preserve-only payload flags</summary>
                        <label className="canvas-placeable-properties-toggle">
                          <input
                            type="checkbox"
                            checked={placeablePropertiesDialog.draft.disabledFlagsEnabled}
                            onChange={(event) =>
                              updatePlaceablePropertiesDraftField(
                                "disabledFlagsEnabled",
                                event.target.checked
                              )
                            }
                          />
                          Enable disabled flags payload
                        </label>
                        <div className="canvas-placeable-properties-toggle-grid">
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.disabledFlags.plot}
                              disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                              onChange={(event) =>
                                updatePlaceableDisabledFlagDraftField("plot", event.target.checked)
                              }
                            />
                            Plot Disabled
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.disabledFlags.useable}
                              disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                              onChange={(event) =>
                                updatePlaceableDisabledFlagDraftField("useable", event.target.checked)
                              }
                            />
                            Useable Disabled
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={placeablePropertiesDialog.draft.disabledFlags.hasInventory}
                              disabled={!placeablePropertiesDialog.draft.disabledFlagsEnabled}
                              onChange={(event) =>
                                updatePlaceableDisabledFlagDraftField(
                                  "hasInventory",
                                  event.target.checked
                                )
                              }
                            />
                            Inventory Disabled
                          </label>
                        </div>
                      </details>
                    </SharedAdvancedSettingsSection>
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "description" ? (
                    <SharedLongTextPropertySection
                      sectionClassName="canvas-placeable-properties-group"
                      labelClassName="canvas-placeable-properties-fulltext"
                      label="Description"
                      value={placeablePropertiesDialog.draft.description}
                      onChange={(nextValue) =>
                        updatePlaceablePropertiesDraftField("description", nextValue)
                      }
                    />
                  ) : null}

                  {placeablePropertiesDialog.activeTab === "comments" ? (
                    <SharedLongTextPropertySection
                      sectionClassName="canvas-placeable-properties-group"
                      labelClassName="canvas-placeable-properties-fulltext"
                      label="Comments"
                      value={placeablePropertiesDialog.draft.comments}
                      onChange={(nextValue) =>
                        updatePlaceablePropertiesDraftField("comments", nextValue)
                      }
                    />
                  ) : null}
                </div>
              </section>

              <SharedDialogActionsFooter
                className="canvas-placeable-properties-actions"
                onApply={() => applyPlaceablePropertiesDraft(false)}
                onOk={() => applyPlaceablePropertiesDraft(true)}
                onCancel={() => cancelPlaceablePropertiesDialog()}
              />
          </>
        </SharedPropertyDialogChrome>
      ) : null}

      {creaturePropertiesDialog ? (
        <SharedPropertyDialogChrome
          articleRef={creaturePropertiesDialogRef}
          articleClassName="canvas-placeable-properties-dialog canvas-creature-properties-dialog"
          ariaLabel="Creature properties"
          windowX={creaturePropertiesDialog.windowX}
          windowY={creaturePropertiesDialog.windowY}
          headerClassName="canvas-placeable-properties-header"
          headerCopyClassName="canvas-placeable-properties-header-copy"
          headerActionsClassName="canvas-placeable-properties-header-actions"
          title="Creature Properties"
          subtitle={creaturePropertiesDialog.draft.tag || creaturePropertiesDialog.objectId}
          collapsed={creaturePropertiesDialog.collapsed}
          collapseLabel="Collapse creature properties dialog"
          expandLabel="Expand creature properties dialog"
          closeLabel="Close creature properties dialog"
          onToggleCollapsed={toggleCreaturePropertiesDialogCollapsed}
          onClose={cancelCreaturePropertiesDialog}
          onArticleMouseDown={(event) => event.stopPropagation()}
          onArticleContextMenu={(event) => event.preventDefault()}
          onHeaderPointerDown={startCreaturePropertiesDialogDrag}
          onHeaderPointerMove={moveCreaturePropertiesDialogDrag}
          onHeaderPointerUp={endCreaturePropertiesDialogDrag}
          onHeaderPointerCancel={cancelCreaturePropertiesDialogDrag}
        >
          <>
              <SharedPropertyTabsNav
                className="canvas-placeable-properties-tabs"
                ariaLabel="creature properties tabs"
                tabs={CREATURE_PROPERTIES_TAB_OPTIONS}
                activeTab={creaturePropertiesDialog.activeTab}
                onSelectTab={setCreaturePropertiesActiveTab}
              />

              <section className="canvas-placeable-properties-shell">
                <SharedObjectPreviewPane
                  className="canvas-placeable-properties-preview-pane"
                  previewClassName="canvas-placeable-properties-preview"
                  previewText={creaturePropertiesDialog.draft.appearance}
                  previewFallback="Creature Preview"
                  actionClassName="canvas-placeable-properties-preview-action"
                />

                <div className="canvas-placeable-properties-pane">
                  {creaturePropertiesDialog.activeTab === "basic" ? (
                    <div className="canvas-placeable-properties-basic canvas-creature-properties-basic">
                      <fieldset className="canvas-placeable-properties-basic-identity canvas-placeable-properties-group">
                        <legend>Profile</legend>
                        <label className="canvas-placeable-properties-field-row">
                          <span>First Name</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.firstName}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("firstName", event.target.value)
                              }
                            />
                            <button type="button" disabled aria-label="Browse first name">
                              ...
                            </button>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Last Name</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.lastName}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("lastName", event.target.value)
                              }
                            />
                            <button type="button" disabled aria-label="Browse last name">
                              ...
                            </button>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Tag</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.tag}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("tag", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Race</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creaturePropertiesDialog.draft.race}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("race", event.target.value)
                              }
                            >
                              {CREATURE_RACE_OPTIONS.map((race) => (
                                <option key={race} value={race}>
                                  {race}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Appearance</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.appearance}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("appearance", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Phenotype</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.phenotype}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("phenotype", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Gender</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creaturePropertiesDialog.draft.gender}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("gender", event.target.value)
                              }
                            >
                              {CREATURE_GENDER_OPTIONS.map((gender) => (
                                <option key={gender} value={gender}>
                                  {gender}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Challenge Rating</span>
                          <div className="canvas-placeable-properties-field-control is-narrow">
                            <input
                              type="number"
                              step="0.1"
                              min={0}
                              value={creaturePropertiesDialog.draft.challengeRating}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField(
                                  "challengeRating",
                                  Math.max(0, Number.parseFloat(event.target.value) || 0)
                                )
                              }
                            />
                          </div>
                        </label>
                      </fieldset>

                      <div className="canvas-creature-properties-basic-panel-stack">
                        <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                          <legend>Portrait</legend>
                          <div className="canvas-placeable-properties-portrait-row">
                            <div className="canvas-placeable-properties-portrait-preview">
                              <span>{creaturePropertiesDialog.draft.portraitResRef || "Portrait"}</span>
                            </div>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                aria-label="Portrait"
                                value={creaturePropertiesDialog.draft.portraitResRef}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "portraitResRef",
                                    event.target.value
                                  )
                                }
                              />
                              <button type="button" disabled aria-label="Browse portrait">
                                ...
                              </button>
                            </div>
                          </div>
                        </fieldset>

                        <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                          <legend>Conversation</legend>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Conversation</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={creaturePropertiesDialog.draft.conversation}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "conversation",
                                    event.target.value
                                  )
                                }
                              />
                              <button type="button" disabled aria-label="Browse conversation">
                                ...
                              </button>
                              <button type="button" disabled aria-label="Edit conversation">
                                Edit
                              </button>
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={creaturePropertiesDialog.draft.noInterrupt}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("noInterrupt", event.target.checked)
                              }
                            />
                            No Interrupt
                          </label>
                        </fieldset>
                      </div>
                    </div>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "statistics" ? (
                    <div className="canvas-creature-properties-statistics">
                      <fieldset className="canvas-placeable-properties-group">
                        <legend>Ability Scores</legend>
                        <table className="canvas-creature-properties-table">
                          <thead>
                            <tr>
                              <th scope="col">Ability</th>
                              <th scope="col">Score</th>
                              <th scope="col">Racial Modifier</th>
                              <th scope="col">Total</th>
                              <th scope="col">Bonus</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ["Strength", "strength", "strRacial"],
                              ["Dexterity", "dexterity", "dexRacial"],
                              ["Constitution", "constitution", "conRacial"],
                              ["Intelligence", "intelligence", "intRacial"],
                              ["Wisdom", "wisdom", "wisRacial"],
                              ["Charisma", "charisma", "chaRacial"]
                            ].map(([label, scoreField, racialField]) => {
                              const scoreValue = creaturePropertiesDialog.draft[
                                scoreField as keyof CreaturePropertiesDraft
                              ] as number;
                              const racialValue = creaturePropertiesDialog.draft[
                                racialField as keyof CreaturePropertiesDraft
                              ] as number;
                              const totalValue = scoreValue + racialValue;
                              const bonusValue = resolveAbilityScoreModifier(totalValue);
                              return (
                                <tr key={label}>
                                  <th scope="row">{label}</th>
                                  <td>
                                    <input
                                      type="number"
                                      step="1"
                                      aria-label={`${label} score`}
                                      value={scoreValue}
                                      onChange={(event) =>
                                        updateCreaturePropertiesDraftField(
                                          scoreField as keyof CreaturePropertiesDraft,
                                          Number.parseFloat(event.target.value) || 0
                                        )
                                      }
                                    />
                                  </td>
                                  <td>
                                    <input
                                      type="number"
                                      step="1"
                                      aria-label={`${label} racial modifier`}
                                      value={racialValue}
                                      onChange={(event) =>
                                        updateCreaturePropertiesDraftField(
                                          racialField as keyof CreaturePropertiesDraft,
                                          Number.parseFloat(event.target.value) || 0
                                        )
                                      }
                                    />
                                  </td>
                                  <td>{totalValue}</td>
                                  <td>{bonusValue}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </fieldset>

                      <div className="canvas-creature-properties-statistics-grid">
                        <fieldset className="canvas-placeable-properties-group">
                          <legend>Saves</legend>
                          <table className="canvas-creature-properties-table">
                            <thead>
                              <tr>
                                <th scope="col">Save</th>
                                <th scope="col">Base</th>
                                <th scope="col">Ability Modifier</th>
                                <th scope="col">Bonus</th>
                                <th scope="col">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {[
                                ["Fortitude", "fortitudeBase", "fortitudeBonus", "constitution"],
                                ["Reflex", "reflexBase", "reflexBonus", "dexterity"],
                                ["Will", "willBase", "willBonus", "wisdom"]
                              ].map(([label, baseField, bonusField, abilityField]) => {
                                const baseValue = creaturePropertiesDialog.draft[
                                  baseField as keyof CreaturePropertiesDraft
                                ] as number;
                                const bonusValue = creaturePropertiesDialog.draft[
                                  bonusField as keyof CreaturePropertiesDraft
                                ] as number;
                                const abilityModifier =
                                  creatureAbilityBonuses?.[
                                    abilityField as keyof NonNullable<typeof creatureAbilityBonuses>
                                  ] ?? 0;
                                return (
                                  <tr key={label}>
                                    <th scope="row">{label}</th>
                                    <td>
                                      <span aria-label={`${label} base`} className="canvas-creature-properties-cell-value">
                                        {baseValue}
                                      </span>
                                    </td>
                                    <td>{abilityModifier}</td>
                                    <td>
                                      <input
                                        type="number"
                                        step="1"
                                        aria-label={`${label} bonus`}
                                        value={bonusValue}
                                        onChange={(event) =>
                                          updateCreaturePropertiesDraftField(
                                            bonusField as keyof CreaturePropertiesDraft,
                                            Number.parseFloat(event.target.value) || 0
                                          )
                                        }
                                      />
                                    </td>
                                    <td>{baseValue + abilityModifier + bonusValue}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </fieldset>

                        <fieldset className="canvas-placeable-properties-group">
                          <legend>Armor / Hit Points</legend>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Natural AC</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.naturalArmorClass}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "naturalArmorClass",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Base AC</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.baseArmorClass}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "baseArmorClass",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Dexterity Bonus</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.dexterityBonus}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "dexterityBonus",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Size Modifier</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.sizeModifier}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "sizeModifier",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Base Hit Points</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.baseHitPoints}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "baseHitPoints",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Hit Point Bonuses</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                value={creaturePropertiesDialog.draft.hitPointBonuses}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "hitPointBonuses",
                                    Number.parseFloat(event.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Total Armor Class</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input type="number" step="1" value={creatureTotalArmorClass} readOnly />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Total Hit Points</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input type="number" step="1" value={creatureTotalHitPoints} readOnly />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Movement Rate</span>
                            <div className="canvas-placeable-properties-field-control">
                              <select
                                value={creaturePropertiesDialog.draft.movementRate}
                                onChange={(event) =>
                                  updateCreaturePropertiesDraftField(
                                    "movementRate",
                                    event.target.value
                                  )
                                }
                              >
                                {CREATURE_MOVEMENT_RATE_OPTIONS.map((movementRate) => (
                                  <option key={movementRate} value={movementRate}>
                                    {movementRate}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                        </fieldset>
                      </div>
                    </div>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "appearance" ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="checkbox"
                          checked={creaturePropertiesDialog.draft.appearancePartBased}
                          onChange={(event) =>
                            updateCreaturePropertiesDraftField(
                              "appearancePartBased",
                              event.target.checked
                            )
                          }
                        />
                        Use part-based appearance
                      </label>
                      <div className="canvas-creature-properties-appearance-aurora">
                        <div className="canvas-creature-properties-appearance-core">
                          {CREATURE_APPEARANCE_CORE_FIELDS.map((entry) => (
                            <label
                              key={entry.key}
                              className="canvas-placeable-properties-field-row canvas-creature-properties-appearance-core-row"
                            >
                              <span>{entry.label}</span>
                              <div className="canvas-placeable-properties-field-control">
                                <input
                                  type="text"
                                  value={creaturePropertiesDialog.draft.appearanceParts[entry.key]}
                                  disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                  onChange={(event) =>
                                    updateCreatureAppearancePart(entry.key, event.target.value)
                                  }
                                />
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="canvas-creature-properties-appearance-limbs">
                          {CREATURE_APPEARANCE_LIMB_PAIRS.map((pair) => (
                            <div key={pair.rightKey} className="canvas-creature-properties-appearance-pair">
                              <label className="canvas-placeable-properties-field-row">
                                <span>{pair.rightLabel}</span>
                                <div className="canvas-placeable-properties-field-control">
                                  <input
                                    type="text"
                                    value={
                                      creaturePropertiesDialog.draft.appearanceParts[pair.rightKey]
                                    }
                                    disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                    onChange={(event) =>
                                      updateCreatureAppearancePart(pair.rightKey, event.target.value)
                                    }
                                  />
                                </div>
                              </label>
                              <label className="canvas-placeable-properties-field-row">
                                <span>{pair.leftLabel}</span>
                                <div className="canvas-placeable-properties-field-control">
                                  <input
                                    type="text"
                                    value={
                                      creaturePropertiesDialog.draft.appearanceParts[pair.leftKey]
                                    }
                                    disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                    onChange={(event) =>
                                      updateCreatureAppearancePart(pair.leftKey, event.target.value)
                                    }
                                  />
                                </div>
                              </label>
                            </div>
                          ))}
                        </div>

                        <div className="canvas-creature-properties-appearance-tail-row">
                          <label className="canvas-placeable-properties-field-row">
                            <span>{CREATURE_APPEARANCE_EXTRA_PAIR.rightLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[
                                    CREATURE_APPEARANCE_EXTRA_PAIR.rightKey
                                  ]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(
                                    CREATURE_APPEARANCE_EXTRA_PAIR.rightKey,
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>{CREATURE_APPEARANCE_EXTRA_PAIR.leftLabel}</span>
                            <div className="canvas-placeable-properties-field-control">
                              <input
                                type="text"
                                value={
                                  creaturePropertiesDialog.draft.appearanceParts[
                                    CREATURE_APPEARANCE_EXTRA_PAIR.leftKey
                                  ]
                                }
                                disabled={!creaturePropertiesDialog.draft.appearancePartBased}
                                onChange={(event) =>
                                  updateCreatureAppearancePart(
                                    CREATURE_APPEARANCE_EXTRA_PAIR.leftKey,
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                          </label>
                        </div>
                      </div>
                      <p className="canvas-placeable-properties-note">
                        Aurora-first: part fields affect only models supporting body-part overrides.
                      </p>
                    </fieldset>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "classes" ? (
                    <div className="canvas-creature-properties-classes">
                      <fieldset className="canvas-placeable-properties-group">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Alignment</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creaturePropertiesDialog.draft.alignment}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("alignment", event.target.value)
                              }
                            >
                              {CREATURE_ALIGNMENT_OPTIONS.map((alignment) => (
                                <option key={alignment} value={alignment}>
                                  {alignment}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                      </fieldset>
                      <fieldset className="canvas-placeable-properties-group">
                        <legend>Classes</legend>
                        <table className="canvas-creature-properties-table">
                          <thead>
                            <tr>
                              <th scope="col">Class</th>
                              <th scope="col">Level</th>
                            </tr>
                          </thead>
                          <tbody>
                            {creaturePropertiesDialog.draft.classEntries.map((entry, index) => (
                              <tr key={`class_${index + 1}`}>
                                <td>
                                  <input
                                    type="text"
                                    value={entry.className}
                                    onChange={(event) =>
                                      updateCreatureClassEntry(index, "className", event.target.value)
                                    }
                                  />
                                </td>
                                <td>
                                  <input
                                    type="number"
                                    step="1"
                                    min={1}
                                    value={entry.level}
                                    onChange={(event) =>
                                      updateCreatureClassEntry(
                                        index,
                                        "level",
                                        Math.max(1, Number.parseFloat(event.target.value) || 1)
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Default Package for Autolevelup</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.defaultPackage}
                              onChange={(event) =>
                                updateCreaturePropertiesDraftField("defaultPackage", event.target.value)
                              }
                            />
                          </div>
                        </label>
                      </fieldset>
                    </div>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "skills" ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Skills</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Skill</th>
                            <th scope="col">Rank</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creaturePropertiesDialog.draft.skills.map((entry, index) => (
                            <tr key={entry.skill}>
                              <th scope="row">{entry.skill}</th>
                              <td>
                                <input
                                  type="number"
                                  step="1"
                                  min={0}
                                  value={entry.rank}
                                  onChange={(event) =>
                                    updateCreatureSkillRank(
                                      index,
                                      Math.max(0, Number.parseFloat(event.target.value) || 0)
                                    )
                                  }
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </fieldset>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "scripts" ? (
                    <SharedScriptSlotSection
                      className="canvas-placeable-properties-group"
                      legend="Scripts"
                      slots={CREATURE_SCRIPT_SLOT_KEYS}
                      labels={CREATURE_SCRIPT_SLOT_LABELS}
                      values={creaturePropertiesDialog.draft.scriptSlots}
                      onChange={updateCreatureScriptSlot}
                      inputIdPrefix="creature-script"
                      rowClassName="canvas-placeable-properties-field-row"
                      rowControlClassName="canvas-placeable-properties-field-control"
                      showInlineActionButtons
                      inlineBrowseDisabled
                      inlineEditDisabled
                    />
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "advanced" ? (
                    <div className="canvas-creature-properties-advanced">
                      <fieldset className="canvas-placeable-properties-group">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Blueprint ResRef</span>
                          <div className="canvas-placeable-properties-field-control">
                            <input
                              type="text"
                              value={creaturePropertiesDialog.draft.advancedSettings.blueprintResRef}
                              onChange={(event) =>
                                updateCreatureAdvancedField("blueprintResRef", event.target.value)
                              }
                            />
                          </div>
                        </label>
                        <div className="canvas-placeable-properties-basic-flags">
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={creaturePropertiesDialog.draft.advancedSettings.disarmable}
                              onChange={(event) =>
                                updateCreatureAdvancedField("disarmable", event.target.checked)
                              }
                            />
                            Disarmable
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={creaturePropertiesDialog.draft.advancedSettings.plot}
                              onChange={(event) =>
                                updateCreatureAdvancedField("plot", event.target.checked)
                              }
                            />
                            Plot
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={
                                creaturePropertiesDialog.draft.advancedSettings.leavesLootableCorpse
                              }
                              onChange={(event) =>
                                updateCreatureAdvancedField(
                                  "leavesLootableCorpse",
                                  event.target.checked
                                )
                              }
                            />
                            Leaves Lootable Corpse
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={creaturePropertiesDialog.draft.advancedSettings.noPermanentDeath}
                              onChange={(event) =>
                                updateCreatureAdvancedField(
                                  "noPermanentDeath",
                                  event.target.checked
                                )
                              }
                            />
                            No Permanent Death
                          </label>
                          <label className="canvas-placeable-properties-toggle">
                            <input
                              type="checkbox"
                              checked={creaturePropertiesDialog.draft.advancedSettings.immortal}
                              onChange={(event) =>
                                updateCreatureAdvancedField("immortal", event.target.checked)
                              }
                            />
                            Immortal
                          </label>
                        </div>
                      </fieldset>

                      <fieldset className="canvas-placeable-properties-group">
                        <div className="canvas-placeable-properties-dual-fields">
                          <label className="canvas-placeable-properties-field-row">
                            <span>Treasure Model</span>
                            <div className="canvas-placeable-properties-field-control">
                              <select
                                value={creaturePropertiesDialog.draft.advancedSettings.treasureModel}
                                onChange={(event) =>
                                  updateCreatureAdvancedField("treasureModel", event.target.value)
                                }
                              >
                                {CREATURE_TREASURE_MODEL_OPTIONS.map((treasureModel) => (
                                  <option key={treasureModel} value={treasureModel}>
                                    {treasureModel}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </label>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Corpse Decay Time (s)</span>
                            <div className="canvas-placeable-properties-field-control is-narrow">
                              <input
                                type="number"
                                step="1"
                                min={0}
                                value={
                                  creaturePropertiesDialog.draft.advancedSettings.corpseDecayTimeSeconds
                                }
                                onChange={(event) =>
                                  updateCreatureAdvancedField(
                                    "corpseDecayTimeSeconds",
                                    Math.max(0, Number.parseFloat(event.target.value) || 0)
                                  )
                                }
                              />
                            </div>
                          </label>
                        </div>

                        <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                          <legend>Faction</legend>
                          <label className="canvas-placeable-properties-field-row">
                            <span>Faction</span>
                            <div className="canvas-placeable-properties-field-control">
                              <select
                                value={creaturePropertiesDialog.draft.advancedSettings.faction}
                                onChange={(event) =>
                                  updateCreatureAdvancedField("faction", event.target.value)
                                }
                              >
                                {CREATURE_FACTION_OPTIONS.map((faction) => (
                                  <option key={faction} value={faction}>
                                    {faction}
                                  </option>
                                ))}
                              </select>
                              <button type="button" disabled>
                                Edit Factions
                              </button>
                            </div>
                          </label>
                        </fieldset>

                        <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                          <legend>Special</legend>
                          <div className="canvas-placeable-properties-dual-fields">
                            <label className="canvas-placeable-properties-field-row">
                              <span>Subrace</span>
                              <div className="canvas-placeable-properties-field-control">
                                <input
                                  type="text"
                                  value={creaturePropertiesDialog.draft.advancedSettings.subrace}
                                  onChange={(event) =>
                                    updateCreatureAdvancedField("subrace", event.target.value)
                                  }
                                />
                              </div>
                            </label>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Deity</span>
                              <div className="canvas-placeable-properties-field-control">
                                <input
                                  type="text"
                                  value={creaturePropertiesDialog.draft.advancedSettings.deity}
                                  onChange={(event) =>
                                    updateCreatureAdvancedField("deity", event.target.value)
                                  }
                                />
                              </div>
                            </label>
                          </div>
                          <div className="canvas-placeable-properties-variables-row">
                            <button type="button" disabled>
                              Apply Template
                            </button>
                          </div>
                        </fieldset>

                        <div className="canvas-creature-properties-advanced-special-grid">
                          <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                            <legend>Challenge Rating</legend>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Calculated</span>
                              <div className="canvas-placeable-properties-field-control is-narrow">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={creatureCalculatedChallengeRating.toFixed(2)}
                                  readOnly
                                />
                              </div>
                            </label>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Adjustment</span>
                              <div className="canvas-placeable-properties-field-control is-narrow">
                                <input
                                  type="number"
                                  step="1"
                                  value={
                                    creaturePropertiesDialog.draft.advancedSettings
                                      .challengeRatingAdjustment
                                  }
                                  onChange={(event) =>
                                    updateCreatureAdvancedField(
                                      "challengeRatingAdjustment",
                                      Number.parseFloat(event.target.value) || 0
                                    )
                                  }
                                />
                              </div>
                            </label>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Challenge Rating</span>
                              <div className="canvas-placeable-properties-field-control is-narrow">
                                <input
                                  type="number"
                                  step="0.1"
                                  min={0}
                                  value={creaturePropertiesDialog.draft.challengeRating}
                                  onChange={(event) =>
                                    updateCreaturePropertiesDraftField(
                                      "challengeRating",
                                      Math.max(0, Number.parseFloat(event.target.value) || 0)
                                    )
                                  }
                                />
                              </div>
                            </label>
                          </fieldset>

                          <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                            <legend>Sound / Perception</legend>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Sound Set</span>
                              <div className="canvas-placeable-properties-field-control">
                                <input
                                  type="text"
                                  value={creaturePropertiesDialog.draft.advancedSettings.soundSet}
                                  onChange={(event) =>
                                    updateCreatureAdvancedField("soundSet", event.target.value)
                                  }
                                />
                                <button type="button" disabled>
                                  ...
                                </button>
                              </div>
                            </label>
                            <label className="canvas-placeable-properties-field-row">
                              <span>Perception Range</span>
                              <div className="canvas-placeable-properties-field-control">
                                <select
                                  value={creaturePropertiesDialog.draft.advancedSettings.perceptionRange}
                                  onChange={(event) =>
                                    updateCreatureAdvancedField("perceptionRange", event.target.value)
                                  }
                                >
                                  {CREATURE_PERCEPTION_RANGE_OPTIONS.map((perceptionRange) => (
                                    <option key={perceptionRange} value={perceptionRange}>
                                      {perceptionRange}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </label>
                          </fieldset>
                        </div>

                        <div className="canvas-placeable-properties-variables-row">
                          <button type="button">Variables</button>
                        </div>
                      </fieldset>
                    </div>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "feats" ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Feats</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Type</th>
                            <th scope="col">Assigned</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creatureFeatsRows.map((entry, index) => (
                            <tr key={`feat_${index + 1}_${entry.name}`}>
                              <td>{entry.name}</td>
                              <td>{entry.type}</td>
                              <td>
                                <input type="checkbox" checked={entry.assigned} readOnly />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="canvas-creature-properties-aux-row">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Filter</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creatureFeatsFilter}
                              onChange={(event) => setCreatureFeatsFilter(event.target.value)}
                            >
                              {CREATURE_FEAT_FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <button type="button" disabled aria-label="Feats help">
                              ?
                            </button>
                          </div>
                        </label>
                      </div>
                      <label className="canvas-placeable-properties-fulltext">
                        <span>Feats Selection Summary</span>
                        <textarea value={creatureFeatsSummaryText} readOnly rows={7} />
                      </label>
                    </fieldset>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "spells" ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Spells</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Prepared</th>
                            <th scope="col">Name</th>
                            <th scope="col">Spell Level</th>
                            <th scope="col">Casting Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creatureSpellsRows.map((entry, index) => (
                            <tr key={`spell_${index + 1}_${entry.name}`}>
                              <td>
                                <input type="checkbox" checked={entry.prepared} readOnly />
                              </td>
                              <td>{entry.name}</td>
                              <td>{entry.spellLevel}</td>
                              <td>{entry.castingLevel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="canvas-placeable-properties-dual-fields">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Spell Level</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creatureSpellsLevelFilter}
                              onChange={(event) => setCreatureSpellsLevelFilter(event.target.value)}
                            >
                              {CREATURE_SPELL_LEVEL_FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </div>
                        </label>
                        <label className="canvas-placeable-properties-field-row">
                          <span>Meta-Magic</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creatureSpellsMetaMagicFilter}
                              onChange={(event) =>
                                setCreatureSpellsMetaMagicFilter(event.target.value)
                              }
                            >
                              {CREATURE_METAMAGIC_FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <button type="button" disabled aria-label="Spells help">
                              ?
                            </button>
                          </div>
                        </label>
                      </div>
                      <fieldset className="canvas-placeable-properties-group canvas-placeable-properties-nested">
                        <legend>Class</legend>
                        <div className="canvas-creature-properties-class-radio-grid">
                          {(creatureClassFilterEntries.length > 0
                            ? creatureClassFilterEntries
                            : ["Class 1"]
                          ).map((className, index) => (
                            <label
                              key={`${className || "class"}_${index + 1}`}
                              className="canvas-placeable-properties-toggle"
                            >
                              <input
                                type="radio"
                                name="creature-spells-class"
                                checked={creatureSpellsClassFilterIndex === index}
                                onChange={() => setCreatureSpellsClassFilterIndex(index)}
                              />
                              {className || `Class ${index + 1}`}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                      <label className="canvas-placeable-properties-fulltext">
                        <span>Spell Selection Summary</span>
                        <textarea value={creatureSpellsSummaryText} readOnly rows={7} />
                      </label>
                      <div className="canvas-placeable-properties-script-actions">
                        <button type="button" disabled>
                          Clear Class Spell List
                        </button>
                        <button type="button" disabled>
                          Save Class Spell List
                        </button>
                        <button type="button" disabled>
                          Load Class Spell List
                        </button>
                      </div>
                    </fieldset>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "specialAbilities" ? (
                    <fieldset className="canvas-placeable-properties-group">
                      <legend>Special Abilities</legend>
                      <table className="canvas-creature-properties-table">
                        <thead>
                          <tr>
                            <th scope="col">Name</th>
                            <th scope="col">Type</th>
                            <th scope="col">Caster Level</th>
                            <th scope="col">Uses</th>
                          </tr>
                        </thead>
                        <tbody>
                          {creatureSpecialAbilitiesRows.map((entry, index) => (
                            <tr key={`ability_${index + 1}_${entry.name}`}>
                              <td>{entry.name}</td>
                              <td>{entry.type}</td>
                              <td>{entry.casterLevel}</td>
                              <td>{entry.uses}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="canvas-creature-properties-aux-row">
                        <label className="canvas-placeable-properties-field-row">
                          <span>Filter</span>
                          <div className="canvas-placeable-properties-field-control">
                            <select
                              value={creatureSpecialAbilitiesFilter}
                              onChange={(event) =>
                                setCreatureSpecialAbilitiesFilter(event.target.value)
                              }
                            >
                              {CREATURE_SPECIAL_ABILITIES_FILTER_OPTIONS.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                            <button type="button" disabled aria-label="Special abilities help">
                              ?
                            </button>
                          </div>
                        </label>
                      </div>
                      <label className="canvas-placeable-properties-fulltext">
                        <span>Special Abilities Selection Summary</span>
                        <textarea value={creatureSpecialAbilitiesSummaryText} readOnly rows={7} />
                      </label>
                    </fieldset>
                  ) : null}

                  {creaturePropertiesDialog.activeTab === "comments" ? (
                    <SharedLongTextPropertySection
                      sectionClassName="canvas-placeable-properties-group"
                      legend="Comments"
                      label="Comments"
                      value={creaturePropertiesDialog.draft.comments}
                      onChange={(nextValue) =>
                        updateCreaturePropertiesDraftField("comments", nextValue)
                      }
                      rows={10}
                    />
                  ) : null}
                </div>
              </section>

              <SharedDialogActionsFooter
                className="canvas-placeable-properties-actions"
                onApply={() => applyCreaturePropertiesDraft(false)}
                onOk={() => applyCreaturePropertiesDraft(true)}
                onCancel={() => cancelCreaturePropertiesDialog()}
              />
          </>
        </SharedPropertyDialogChrome>
      ) : null}

      {soundPropertiesDialog ? (
        <SharedPropertyDialogChrome
          articleRef={soundPropertiesDialogRef}
          articleClassName="canvas-sound-properties-dialog"
          ariaLabel="Sound properties"
          windowX={soundPropertiesDialog.windowX}
          windowY={soundPropertiesDialog.windowY}
          headerClassName="canvas-sound-properties-header"
          headerCopyClassName="canvas-sound-properties-header-copy"
          headerActionsClassName="canvas-sound-properties-header-actions"
          title="Sound Properties"
          subtitle={soundPropertiesDialog.draft.tag || soundPropertiesDialog.objectId}
          collapsed={soundPropertiesDialog.collapsed}
          collapseLabel="Collapse sound properties dialog"
          expandLabel="Expand sound properties dialog"
          closeLabel="Close sound properties dialog"
          onToggleCollapsed={toggleSoundPropertiesDialogCollapsed}
          onClose={cancelSoundPropertiesDialog}
          onArticleMouseDown={(event) => event.stopPropagation()}
          onArticleContextMenu={(event) => event.preventDefault()}
          onHeaderPointerDown={startSoundPropertiesDialogDrag}
          onHeaderPointerMove={moveSoundPropertiesDialogDrag}
          onHeaderPointerUp={endSoundPropertiesDialogDrag}
          onHeaderPointerCancel={cancelSoundPropertiesDialogDrag}
        >
          <>
              <SharedPropertyTabsNav
                className="canvas-sound-properties-tabs"
                ariaLabel="sound properties tabs"
                tabs={SOUND_PROPERTIES_TAB_OPTIONS}
                activeTab={soundPropertiesDialog.activeTab}
                onSelectTab={setSoundPropertiesActiveTab}
              />

              {soundPropertiesDialog.activeTab === "basic" ? (
                <section className="canvas-sound-properties-shell canvas-sound-properties-basic-shell">
                  <div className="canvas-sound-properties-basic-top">
                    <label className="canvas-sound-properties-inline-input">
                      <span>Name</span>
                      <span className="canvas-sound-properties-inline-input-row">
                        <input
                          type="text"
                          value={soundPropertiesDialog.draft.name}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField("name", event.target.value)
                          }
                        />
                        <button type="button" className="canvas-sound-properties-inline-button">
                          ...
                        </button>
                      </span>
                    </label>
                    <label className="canvas-sound-properties-inline-input">
                      <span>Tag</span>
                      <input
                        type="text"
                        value={soundPropertiesDialog.draft.tag}
                        onChange={(event) =>
                          updateSoundPropertiesDraftField("tag", event.target.value)
                        }
                      />
                    </label>
                    <label className="canvas-sound-properties-inline-input">
                      <span>Comments</span>
                      <textarea
                        value={soundPropertiesDialog.draft.comments}
                        onChange={(event) =>
                          updateSoundPropertiesDraftField("comments", event.target.value)
                        }
                      />
                    </label>
                  </div>
                  <div className="canvas-sound-properties-basic-middle">
                    <label className="canvas-sound-properties-sound-list">
                      <span>List of Sounds to Play</span>
                      <select
                        size={8}
                        value={
                          soundPropertiesDialog.draft.selectedSoundIndex >= 0
                            ? String(soundPropertiesDialog.draft.selectedSoundIndex)
                            : ""
                        }
                        onChange={(event) => selectSoundListEntry(Number(event.target.value))}
                      >
                        {soundPropertiesDialog.draft.soundList.map((entry, index) => (
                          <option key={`${entry}_${index}`} value={String(index)}>
                            {entry}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="canvas-sound-properties-sound-actions">
                      <button
                        type="button"
                        onClick={() => playSelectedSoundPreview()}
                        disabled={!canPreviewSelectedSound}
                      >
                        Play
                      </button>
                      <button type="button" onClick={() => stopSoundPreviewPlayback()}>
                        Stop
                      </button>
                      <button type="button" onClick={() => addSoundListEntry()}>
                        Add Sounds...
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSelectedSoundListEntry()}
                        disabled={soundPropertiesDialog.draft.selectedSoundIndex < 0}
                      >
                        Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSoundListEntryUp()}
                        disabled={soundPropertiesDialog.draft.selectedSoundIndex <= 0}
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSoundListEntryDown()}
                        disabled={
                          soundPropertiesDialog.draft.selectedSoundIndex < 0 ||
                          soundPropertiesDialog.draft.selectedSoundIndex >=
                            soundPropertiesDialog.draft.soundList.length - 1
                        }
                      >
                        Move Down
                      </button>
                    </div>
                  </div>
                  <div className="canvas-sound-properties-basic-bottom">
                    <label className="canvas-sound-properties-volume-slider">
                      <span>Volume</span>
                      <div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.1}
                          value={Math.min(10, Math.max(0, soundPropertiesDialog.draft.volume * 10))}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField(
                              "volume",
                              Number(event.target.value) / 10
                            )
                          }
                        />
                        <span className="canvas-sound-properties-volume-scale">0 5 10</span>
                      </div>
                    </label>
                  </div>
                </section>
              ) : null}

              {soundPropertiesDialog.activeTab === "positioning" ? (
                <section className="canvas-sound-properties-shell canvas-sound-properties-shell-positioning">
                  <fieldset className="canvas-sound-properties-group">
                    <legend>Mode</legend>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-positioning-mode"
                        checked={soundPropertiesDialog.draft.mode === "everywhere"}
                        onChange={() => updateSoundPropertiesDraftField("mode", "everywhere")}
                      />
                      Plays everywhere in area
                    </label>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-positioning-mode"
                        checked={soundPropertiesDialog.draft.mode === "random"}
                        onChange={() => updateSoundPropertiesDraftField("mode", "random")}
                      />
                      Plays from random position each play
                    </label>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-positioning-mode"
                        checked={soundPropertiesDialog.draft.mode === "specific"}
                        onChange={() => updateSoundPropertiesDraftField("mode", "specific")}
                      />
                      Plays from specific position
                    </label>
                  </fieldset>
                  <fieldset className="canvas-sound-properties-group">
                    <legend>Volume Distances</legend>
                    <div className="canvas-sound-properties-positioning-aurora-row">
                      <div className="canvas-sound-properties-volume-visual" aria-hidden="true">
                        <span className="outer-ring" />
                        <span className="inner-ring" />
                        <span className="center-dot" />
                        <span className="center-guide" />
                        <span className="max-distance-arrow" />
                        <span className="cutoff-distance-arrow" />
                      </div>
                      <div className="canvas-sound-properties-volume-inputs">
                        <label>
                          Cutoff distance (m)
                          <input
                            type="text"
                            inputMode="decimal"
                            aria-label="Cutoff Distance"
                            value={formatSoundFixed(soundPropertiesDialog.draft.cutoffDistance, 1)}
                            disabled={soundGating.positioningDisabled}
                            onChange={(event) =>
                              updateSoundPropertiesDraftField("cutoffDistance", event.target.value)
                            }
                          />
                        </label>
                        <label>
                          Max Volume Distance (m)
                          <input
                            type="text"
                            aria-label="Max Volume Distance"
                            value={formatSoundFixed(
                              deriveMaxVolumeDistanceFromCutoff(
                                soundPropertiesDialog.draft.cutoffDistance
                              ),
                              1
                            )}
                            disabled
                            readOnly
                          />
                        </label>
                      </div>
                    </div>
                  </fieldset>
                  <div className="canvas-sound-properties-positioning-grid">
                    <fieldset className="canvas-sound-properties-group">
                      <legend>Height (m)</legend>
                      <div className="canvas-sound-properties-positioning-aurora-row canvas-sound-properties-positioning-aurora-row-height">
                        <div className="canvas-sound-properties-height-visual" aria-hidden="true">
                          <span className="height-circle" />
                          <span className="height-inner-circle" />
                          <span className="height-arrow" />
                          <span className="height-plane" />
                        </div>
                        <div className="canvas-sound-properties-height-input">
                          <label>
                            Height (m)
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label="Elevation"
                              value={formatSoundFixed(soundPropertiesDialog.draft.elevation, 1)}
                              disabled={soundGating.positioningDisabled}
                              onChange={(event) =>
                                updateSoundPropertiesDraftField("elevation", event.target.value)
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </fieldset>
                    <fieldset className="canvas-sound-properties-group">
                      <legend>Random Range</legend>
                      <div className="canvas-sound-properties-positioning-aurora-row canvas-sound-properties-positioning-aurora-row-random">
                        <div className="canvas-sound-properties-random-visual" aria-hidden="true">
                          {soundPropertiesDialog.draft.mode === "random" ? (
                            <span className="random-dice">{"\u2684"}</span>
                          ) : null}
                          <span className="ns-arrow" />
                          <span className="we-arrow" />
                          <span className="ns-label">N-S</span>
                          <span className="we-label">W-E</span>
                        </div>
                        <div className="canvas-sound-properties-random-inputs">
                          <label>
                            North-South Random Range (m)
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label="North-South"
                              value={formatSoundFixed(soundRandomRangeDisplay.northSouth, 1)}
                              disabled={!soundGating.randomRangeEnabled}
                              onChange={(event) =>
                                updateSoundPropertiesDraftField(
                                  "randomRangeNorthSouth",
                                  event.target.value
                                )
                              }
                            />
                          </label>
                          <label>
                            West-East Random Range (m)
                            <input
                              type="text"
                              inputMode="decimal"
                              aria-label="West-East"
                              value={formatSoundFixed(soundRandomRangeDisplay.westEast, 1)}
                              disabled={!soundGating.randomRangeEnabled}
                              onChange={(event) =>
                                updateSoundPropertiesDraftField(
                                  "randomRangeWestEast",
                                  event.target.value
                                )
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                  <p className="canvas-sound-properties-note">
                    Aurora-first gating: <strong>everywhere</strong> disables positioning,{" "}
                    <strong>random</strong> enables random range, and <strong>specific</strong> keeps
                    fixed anchor behavior.
                  </p>
                </section>
              ) : null}

              {soundPropertiesDialog.activeTab === "advanced" ? (
                <section className="canvas-sound-properties-shell canvas-sound-properties-advanced-shell">
                  <div className="canvas-sound-properties-advanced-resref-row">
                    <label className="canvas-sound-properties-inline-input">
                      <span>Blueprint ResRef</span>
                      <input type="text" value={soundPropertiesDialog.draft.resRef} readOnly />
                    </label>
                    <button type="button" className="canvas-sound-properties-inline-button">
                      Variables
                    </button>
                  </div>

                  <label className="canvas-sound-properties-mode canvas-sound-properties-active-toggle">
                    <input
                      type="checkbox"
                      checked={soundPropertiesDialog.draft.active}
                      onChange={() => toggleSoundPropertiesActive()}
                    />
                    Active
                  </label>

                  <fieldset className="canvas-sound-properties-group">
                    <legend>When to play</legend>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-advanced-when-to-play"
                        checked={
                          soundAdvancedWhenToPlay === "dayNight" &&
                          soundPropertiesDialog.draft.dayNight === "day"
                        }
                        onChange={() => setSoundWhenToPlay("dayNight", "day")}
                      />
                      Play during the day
                    </label>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-advanced-when-to-play"
                        checked={
                          soundAdvancedWhenToPlay === "dayNight" &&
                          soundPropertiesDialog.draft.dayNight === "night"
                        }
                        onChange={() => setSoundWhenToPlay("dayNight", "night")}
                      />
                      Play at night
                    </label>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-advanced-when-to-play"
                        checked={soundAdvancedWhenToPlay === "always"}
                        onChange={() => setSoundWhenToPlay("always", "both")}
                      />
                      Play at all times
                    </label>
                    <label className="canvas-sound-properties-mode">
                      <input
                        type="radio"
                        name="sound-advanced-when-to-play"
                        checked={soundAdvancedWhenToPlay === "hours"}
                        onChange={() => setSoundWhenToPlay("hours")}
                      />
                      Specific Hours
                    </label>
                    <div
                      className={`canvas-sound-properties-hour-grid ${
                        isSoundSpecificHoursEnabled ? "" : "is-disabled"
                      }`}
                    >
                      <span className="canvas-sound-properties-hour-grid-label" />
                      {SOUND_HOUR_LABELS.map((label) => (
                        <span key={`hour_head_${label}`} className="canvas-sound-properties-hour-grid-label">
                          {label}
                        </span>
                      ))}
                      <span className="canvas-sound-properties-hour-grid-label">AM</span>
                      {SOUND_HOUR_LABELS.map((_, hourIndex) => (
                        <input
                          key={`hour_am_${hourIndex}`}
                          type="checkbox"
                          checked={soundHourMaskFlags[hourIndex]}
                          disabled={!isSoundSpecificHoursEnabled}
                          onChange={() => toggleSoundHour(hourIndex)}
                        />
                      ))}
                      <span className="canvas-sound-properties-hour-grid-label">PM</span>
                      {SOUND_HOUR_LABELS.map((_, hourIndex) => (
                        <input
                          key={`hour_pm_${hourIndex}`}
                          type="checkbox"
                          checked={soundHourMaskFlags[hourIndex + 12]}
                          disabled={!isSoundSpecificHoursEnabled}
                          onChange={() => toggleSoundHour(hourIndex + 12)}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div className="canvas-sound-properties-advanced-grid">
                    <fieldset className="canvas-sound-properties-group">
                      <legend>Play Style</legend>
                      <label className="canvas-sound-properties-mode">
                        <input
                          type="radio"
                          name="sound-advanced-play-style"
                          checked={soundPropertiesDialog.draft.playStyle === "once"}
                          onChange={() => patchSoundPropertiesDraft({ playStyle: "once" })}
                        />
                        Once
                      </label>
                      <label className="canvas-sound-properties-mode">
                        <input
                          type="radio"
                          name="sound-advanced-play-style"
                          checked={soundPropertiesDialog.draft.playStyle === "repeat"}
                          onChange={() => patchSoundPropertiesDraft({ playStyle: "repeat" })}
                        />
                        Repeating
                      </label>
                      <label className="canvas-sound-properties-mode">
                        <input
                          type="radio"
                          name="sound-advanced-play-style"
                          checked={soundPropertiesDialog.draft.playStyle === "loop"}
                          onChange={() => patchSoundPropertiesDraft({ playStyle: "loop" })}
                        />
                        Seamlessly looping
                      </label>
                    </fieldset>

                    <fieldset className="canvas-sound-properties-group">
                      <legend>Play Order</legend>
                      <label className="canvas-sound-properties-mode">
                        <input
                          type="radio"
                          name="sound-advanced-play-order"
                          checked={soundPropertiesDialog.draft.playOrder === "sequential"}
                          onChange={() => patchSoundPropertiesDraft({ playOrder: "sequential" })}
                        />
                        Sequential
                      </label>
                      <label className="canvas-sound-properties-mode">
                        <input
                          type="radio"
                          name="sound-advanced-play-order"
                          checked={soundPropertiesDialog.draft.playOrder === "random"}
                          onChange={() => patchSoundPropertiesDraft({ playOrder: "random" })}
                        />
                        Random
                      </label>
                    </fieldset>
                  </div>

                  <fieldset className="canvas-sound-properties-group">
                    <legend>Interval</legend>
                    <label>
                      Interval between playing sounds (seconds)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatSoundSeconds(soundPropertiesDialog.draft.intervalMs)}
                        onChange={(event) => {
                          const seconds = parseSoundNumericInput(event.target.value);
                          if (seconds === null || seconds < 0) {
                            return;
                          }
                          updateSoundPropertiesDraftField("intervalMs", seconds * 1000);
                        }}
                      />
                    </label>
                    <label>
                      Interval Variation (seconds)
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatSoundSeconds(soundPropertiesDialog.draft.intervalVariationMs)}
                        onChange={(event) => {
                          const seconds = parseSoundNumericInput(event.target.value);
                          if (seconds === null || seconds < 0) {
                            return;
                          }
                          updateSoundPropertiesDraftField("intervalVariationMs", seconds * 1000);
                        }}
                      />
                    </label>
                  </fieldset>

                  <fieldset className="canvas-sound-properties-group">
                    <legend>Variation</legend>
                    <label className="canvas-sound-properties-volume-slider">
                      <span>Volume Variation</span>
                      <div>
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={0.1}
                          value={Math.min(10, Math.max(0, soundPropertiesDialog.draft.volumeVariation * 10))}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField(
                              "volumeVariation",
                              Number(event.target.value) / 10
                            )
                          }
                        />
                        <span className="canvas-sound-properties-volume-scale">0 5 10</span>
                      </div>
                    </label>
                    <label className="canvas-sound-properties-pitch-variation">
                      <span>Pitch Variation (octaves)</span>
                      <div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={formatSoundFixed(soundPropertiesDialog.draft.pitchVariation, 2)}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField("pitchVariation", event.target.value)
                          }
                        />
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={soundPropertiesDialog.draft.pitchVariation}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField("pitchVariation", event.target.value)
                          }
                        />
                      </div>
                    </label>
                  </fieldset>
                </section>
              ) : null}

              <SharedDialogActionsFooter
                className="canvas-sound-properties-actions"
                onApply={() => applySoundPropertiesDraft(false)}
                onOk={() => applySoundPropertiesDraft(true)}
                onCancel={() => cancelSoundPropertiesDialog()}
              />
          </>
        </SharedPropertyDialogChrome>
      ) : null}

      {doorPropertiesDialog ? (
        <SharedPropertyDialogChrome
          articleRef={doorPropertiesDialogRef}
          articleClassName="canvas-door-properties-dialog"
          ariaLabel="Door properties"
          windowX={doorPropertiesDialog.windowX}
          windowY={doorPropertiesDialog.windowY}
          headerClassName="canvas-door-properties-header"
          headerCopyClassName="canvas-door-properties-header-copy"
          headerActionsClassName="canvas-door-properties-header-actions"
          title="Door Properties"
          subtitle={doorPropertiesDialog.draft.tag || doorPropertiesDialog.objectId}
          collapsed={doorPropertiesDialog.collapsed}
          collapseLabel="Collapse door properties dialog"
          expandLabel="Expand door properties dialog"
          closeLabel="Close door properties dialog"
          onToggleCollapsed={toggleDoorPropertiesDialogCollapsed}
          onClose={cancelDoorPropertiesDialog}
          onArticleMouseDown={(event) => event.stopPropagation()}
          onArticleContextMenu={(event) => event.preventDefault()}
          onHeaderPointerDown={startDoorPropertiesDialogDrag}
          onHeaderPointerMove={moveDoorPropertiesDialogDrag}
          onHeaderPointerUp={endDoorPropertiesDialogDrag}
          onHeaderPointerCancel={cancelDoorPropertiesDialogDrag}
        >
          <>
              <SharedPropertyTabsNav
                className="canvas-door-properties-tabs"
                ariaLabel="door properties tabs"
                tabs={DOOR_PROPERTIES_TAB_OPTIONS}
                activeTab={doorPropertiesDialog.activeTab}
                onSelectTab={setDoorPropertiesActiveTab}
              />

              {doorPropertiesDialog.activeTab === "basic" ? (
                <section className="canvas-door-properties-shell">
                  <fieldset className="canvas-door-properties-group">
                    <legend>Basic</legend>
                    <label>
                      Name
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.name}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField("name", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Tag
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.tag}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField("tag", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Appearance Type
                      <select
                        value={doorPropertiesDialog.draft.appearanceType}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField("appearanceType", event.target.value)
                        }
                      >
                        {DOOR_APPEARANCE_TYPE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Generic Appearance
                      <select
                        value={doorPropertiesDialog.draft.genericAppearance}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField("genericAppearance", event.target.value)
                        }
                      >
                        {DOOR_GENERIC_APPEARANCE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="canvas-placeable-properties-toggle">
                      <input
                        type="checkbox"
                        checked={doorPropertiesDialog.draft.plot}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField("plot", event.target.checked)
                        }
                      />
                      Plot
                    </label>
                    <label>
                      Hardness
                      <input
                        type="number"
                        step="1"
                        value={doorPropertiesDialog.draft.hardness}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField(
                            "hardness",
                            Math.max(0, Number.parseFloat(event.target.value) || 0)
                          )
                        }
                      />
                    </label>
                    <label>
                      Hit Points
                      <input
                        type="number"
                        step="1"
                        value={doorPropertiesDialog.draft.hitPoints}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField(
                            "hitPoints",
                            Math.max(0, Number.parseFloat(event.target.value) || 0)
                          )
                        }
                      />
                    </label>
                    <label>
                      Fortitude Save
                      <input
                        type="number"
                        step="1"
                        value={doorPropertiesDialog.draft.fortitudeSave}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField(
                            "fortitudeSave",
                            Number.parseFloat(event.target.value) || 0
                          )
                        }
                      />
                    </label>
                    <label>
                      Reflex Save
                      <input
                        type="number"
                        step="1"
                        value={doorPropertiesDialog.draft.reflexSave}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField(
                            "reflexSave",
                            Number.parseFloat(event.target.value) || 0
                          )
                        }
                      />
                    </label>
                    <label>
                      Will Save
                      <input
                        type="number"
                        step="1"
                        value={doorPropertiesDialog.draft.willSave}
                        onChange={(event) =>
                          updateDoorPropertiesDraftField(
                            "willSave",
                            Number.parseFloat(event.target.value) || 0
                          )
                        }
                      />
                    </label>
                  </fieldset>
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "lock" ? (
                <section className="canvas-door-properties-shell">
                  <SharedLockPropertySection
                    value={doorPropertiesDialog.draft.lockSettings}
                    onChange={updateDoorLockDraftField}
                    legend="Lock"
                    classNames={{
                      root: "canvas-door-properties-group",
                      toggle: "canvas-placeable-properties-toggle"
                    }}
                  />
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "trap" ? (
                <section className="canvas-door-properties-shell">
                  <SharedTrapPropertySection
                    value={doorPropertiesDialog.draft.trapSettings}
                    onChange={updateDoorTrapDraftField}
                    trapTypeOptions={PLACEABLE_TRAP_TYPE_OPTIONS}
                    legend="Trap"
                    classNames={{
                      root: "canvas-door-properties-group",
                      nested: "canvas-door-properties-group",
                      toggle: "canvas-placeable-properties-toggle"
                    }}
                  />
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "areaTransition" ? (
                <section className="canvas-door-properties-shell">
                  <fieldset className="canvas-door-properties-group">
                    <legend>Area Transition</legend>
                    <label>
                      Destination Tag
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.destinationTag}
                        onChange={(event) =>
                          updateDoorTransitionDraftField("destinationTag", event.target.value)
                        }
                      />
                    </label>
                    <fieldset className="canvas-door-properties-group">
                      <legend>Destination Type</legend>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="radio"
                          name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                          checked={doorPropertiesDialog.draft.destinationType === "none"}
                          onChange={() => updateDoorTransitionDraftField("destinationType", "none")}
                        />
                        None
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="radio"
                          name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                          checked={doorPropertiesDialog.draft.destinationType === "door"}
                          onChange={() => updateDoorTransitionDraftField("destinationType", "door")}
                        />
                        Door
                      </label>
                      <label className="canvas-placeable-properties-toggle">
                        <input
                          type="radio"
                          name={`door-destination-type-${doorPropertiesDialog.objectId}`}
                          checked={doorPropertiesDialog.draft.destinationType === "waypoint"}
                          onChange={() =>
                            updateDoorTransitionDraftField("destinationType", "waypoint")
                          }
                        />
                        Waypoint
                      </label>
                    </fieldset>
                    <label>
                      Linked Target
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.linkedTarget}
                        onChange={(event) =>
                          updateDoorTransitionDraftField("linkedTarget", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Linked Module
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.linkedModule}
                        onChange={(event) =>
                          updateDoorTransitionDraftField("linkedModule", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Linked Waypoint
                      <input
                        type="text"
                        value={doorPropertiesDialog.draft.linkedWaypoint}
                        onChange={(event) =>
                          updateDoorTransitionDraftField("linkedWaypoint", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Loading Screen
                      <select
                        value={
                          doorPropertiesDialog.draft.loadScreen.trim().length > 0
                            ? doorPropertiesDialog.draft.loadScreen
                            : "Default"
                        }
                        onChange={(event) =>
                          updateDoorTransitionDraftField(
                            "loadScreen",
                            event.target.value === "Default" ? "" : event.target.value
                          )
                        }
                      >
                        <option value="Default">Default</option>
                        {doorPropertiesDialog.draft.loadScreen.trim().length > 0 ? (
                          <option value={doorPropertiesDialog.draft.loadScreen}>
                            {doorPropertiesDialog.draft.loadScreen}
                          </option>
                        ) : null}
                      </select>
                    </label>
                    <button type="button">Setup Area Transition</button>
                    <label>
                      Flags
                      <input type="text" value={doorPropertiesDialog.draft.flagsSummary} readOnly />
                    </label>
                  </fieldset>
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "scripts" ? (
                <section className="canvas-door-properties-shell">
                  <SharedScriptSlotSection
                    className="canvas-door-properties-group"
                    slots={DOOR_SCRIPT_SLOT_KEYS}
                    labels={DOOR_SCRIPT_SLOT_LABELS}
                    values={doorPropertiesDialog.draft.scriptSlots}
                    onChange={updateDoorScriptSlotDraftField}
                    inputIdPrefix="door-script"
                    legend="Scripts"
                    showSaveLoadActions
                    saveLoadActionsClassName="canvas-placeable-properties-script-actions"
                    saveDisabled
                    loadDisabled
                  />
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "advanced" ? (
                <section className="canvas-door-properties-shell">
                  <SharedAdvancedSettingsSection
                    sectionClassName="canvas-door-properties-group"
                    toggleClassName="canvas-placeable-properties-toggle"
                    variablesRowClassName="canvas-placeable-properties-variables-row"
                    blueprintResRef={doorPropertiesDialog.draft.advancedSettings.blueprintResRef}
                    onBlueprintResRefChange={(nextValue) =>
                      updateDoorAdvancedDraftField("blueprintResRef", nextValue)
                    }
                    belongsToFaction={doorPropertiesDialog.draft.advancedSettings.belongsToFaction}
                    factionOptions={PLACEABLE_FACTION_OPTIONS}
                    onBelongsToFactionChange={(nextValue) =>
                      updateDoorAdvancedDraftField("belongsToFaction", nextValue)
                    }
                    conversation={doorPropertiesDialog.draft.advancedSettings.conversation}
                    onConversationChange={(nextValue) =>
                      updateDoorAdvancedDraftField("conversation", nextValue)
                    }
                    noInterrupt={doorPropertiesDialog.draft.advancedSettings.noInterrupt}
                    onNoInterruptChange={(checked) =>
                      updateDoorAdvancedDraftField("noInterrupt", checked)
                    }
                    portraitResRef={doorPropertiesDialog.draft.advancedSettings.portraitResRef}
                    showPortraitPreview={false}
                    onPortraitResRefChange={(nextValue) =>
                      updateDoorAdvancedDraftField("portraitResRef", nextValue)
                    }
                    initialState={doorPropertiesDialog.draft.advancedSettings.initialState}
                    initialStateOptions={DOOR_INITIAL_STATE_OPTIONS}
                    onInitialStateChange={(nextValue) =>
                      updateDoorAdvancedDraftField("initialState", nextValue)
                    }
                  />
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "description" ? (
                <section className="canvas-door-properties-shell">
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-door-properties-group"
                    legend="Description"
                    label="Description"
                    value={doorPropertiesDialog.draft.description}
                    onChange={(nextValue) =>
                      updateDoorPropertiesDraftField("description", nextValue)
                    }
                    rows={9}
                  />
                </section>
              ) : null}

              {doorPropertiesDialog.activeTab === "comments" ? (
                <section className="canvas-door-properties-shell">
                  <SharedLongTextPropertySection
                    sectionClassName="canvas-door-properties-group"
                    legend="Comments"
                    label="Comments"
                    value={doorPropertiesDialog.draft.comments}
                    onChange={(nextValue) => updateDoorPropertiesDraftField("comments", nextValue)}
                    rows={9}
                  />
                </section>
              ) : null}

              <SharedDialogActionsFooter
                className="canvas-door-properties-actions"
                onApply={() => applyDoorPropertiesDraft(false)}
                onOk={() => applyDoorPropertiesDraft(true)}
                onCancel={() => cancelDoorPropertiesDialog()}
              />
          </>
        </SharedPropertyDialogChrome>
      ) : null}

      {toolbarState.canvasDebug.runtimeHud ? (
        <aside
          className={`canvas-runtime-anchor ${runtimePopupPinned ? "is-pinned" : ""}`}
          aria-label="canvas runtime"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          <button
            type="button"
            className="canvas-runtime-chip"
            aria-label="Runtime diagnostics"
            aria-pressed={runtimePopupPinned}
            onClick={() => setRuntimePopupPinned((current) => !current)}
          >
            <span className="canvas-runtime-chip-icon" aria-hidden="true">
              i
            </span>
            <span>Runtime</span>
          </button>
          <article className="canvas-runtime-popup" role="tooltip" aria-label="runtime diagnostics panel">
            <p>
              Controls: <strong>{controlPresetLabel}</strong>
            </p>
            <p>
              Runtime: <strong>{webglReady ? "Three.js / WebGL" : "Fallback"}</strong>
            </p>
            {webglFallbackReason ? (
              <p>
                Status: <strong>{webglFallbackReason}</strong>
              </p>
            ) : null}
            <p>
              Scene: <strong>{scene.areaName}</strong>
            </p>
            <p>
              Source: <strong>{scene.source}</strong>
            </p>
            <p>
              Selection: <strong>{selectedSummary}</strong>
            </p>
            <p>
              Debug map: <strong>{toolbarState.canvasDebug.statusMap}</strong>
            </p>
            <p>
              Overlays:{" "}
              <strong>
                walkmesh {toolbarState.canvasDebug.walkmeshOverlay ? "on" : "off"} / collision{" "}
                {toolbarState.canvasDebug.collisionOverlay ? "on" : "off"}
              </strong>
            </p>
            <p>
              Texture mode: <strong>{toolbarState.canvasDebug.textureCompression}</strong>
            </p>
            <p>
              Gizmo: <strong>{toolbarState.canvasDebug.gizmoMode}</strong>
            </p>
            <p>
              VT physical:{" "}
              <strong>{toolbarState.canvasDebug.showVtPhysicalAnchor ? "on" : "off"}</strong>
            </p>
            <p>
              Snap: <strong>{snapSummary || "off"}</strong>
            </p>
            <p>
              Snap step:{" "}
              <strong>
                grid {workspaceOptions.snapGridStep} / angle {workspaceOptions.snapAngleStepDeg}
                deg / height {workspaceOptions.snapHeightStep}
              </strong>
            </p>
            <p>
              Box mode: <strong>{workspaceOptions.selectionBoxMode}</strong>
            </p>
            <p>
              Per-object gizmo hints:{" "}
              <strong>{workspaceOptions.showPerObjectGizmoHints ? "on" : "off"}</strong>
            </p>
            <p>
              Isolate: <strong>{isolateSummary}</strong>
            </p>
            <p>
              Locked: <strong>{lockSummary}</strong>
            </p>
            <p>
              Bookmark #1: <strong>{bookmarkSaved ? "saved" : "empty"}</strong>
            </p>
            <p>
              Non-render objs: <strong>{nonRenderCount}</strong>
            </p>
            <p>
              Draft: <strong>{saveStatus}</strong>
            </p>
            {toolbarState.canvasDebug.perfHud ? (
              <>
                <p>
                  FPS: <strong>{perfSnapshot.fps}</strong>
                </p>
                <p>
                  Draw calls: <strong>{perfSnapshot.drawCalls}</strong>
                </p>
                <p>
                  Triangles: <strong>{perfSnapshot.triangles}</strong>
                </p>
                <p>
                  GPU mem: <strong>geo {perfSnapshot.geometries} / tex {perfSnapshot.textures}</strong>
                </p>
              </>
            ) : null}
          </article>
        </aside>
      ) : null}

      {objectAddDropFeedback ? (
        <aside
          className={`canvas-object-add-drop-feedback canvas-object-add-drop-feedback-${objectAddDropFeedback.variant}`}
          role="status"
          aria-live="polite"
          style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
        >
          {objectAddDropFeedback.message}
        </aside>
      ) : null}

      {visualTransformBlockedReason ? (
        <aside
          className="canvas-vt-blocked-note"
          role="note"
          aria-label="visual transform blocked info"
          style={{ right: `${hudRightPx}px`, maxWidth: hudMaxWidth }}
        >
          {visualTransformBlockedReason}
        </aside>
      ) : null}

      {toolbarState.canvasDebug.controlsHint ? (
        <aside
          className="canvas-controls-hint"
          role="note"
          aria-label="controls hint"
          style={{
            left: `${hudLeftPx}px`,
            bottom: `${controlsHintBottomPx}px`,
            maxWidth: hudMaxWidth
          }}
        >
          <button type="button" className="canvas-controls-hint-chip" aria-label="Controls help">
            <span className="canvas-controls-hint-icon" aria-hidden="true">
              i
            </span>
            <span>Controls</span>
          </button>
          <div className="canvas-controls-hint-popup" role="tooltip">
            {inputHint}
          </div>
        </aside>
      ) : null}
    </section>
  );
}





