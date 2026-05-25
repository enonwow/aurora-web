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

export type SceneSoundPositioningMode =
  | "everywhere"
  | "random"
  | "specific";

export type ScenePreservePrimitive = string | number | boolean | null;

export interface SceneObjectSoundPositioningPreservePayload {
  // Preserve-only shell for schedule/variation/priority fields.
  // Runtime behavior must not infer additional semantics from these values yet.
  timeWindow: string;
  hourMask: string;
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
