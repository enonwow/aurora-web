import type * as THREE from "three";
import type { ObjectAddDragPayload } from "../application/objectAddDragPayload";
import type { AreaScene } from "../contracts";
import type { CanvasGizmoMode } from "../visualTransformGizmoRules";

export interface SceneCameraFramingOptions {
  objectPreview?: boolean;
}

export interface WorkspaceRuntimeRef<TRuntime> {
  current: TRuntime | null;
}

export interface WorkspaceCameraRuntimePort<TRuntime, TBookmark> {
  centerCameraForScene(
    runtime: TRuntime,
    sceneData: AreaScene,
    options?: SceneCameraFramingOptions
  ): void;
  createCameraBookmark(runtime: TRuntime): TBookmark;
  restoreCameraBookmark(runtime: TRuntime, bookmark: TBookmark): void;
}

export interface WorkspaceSoundListenerRuntimePort<TRuntime> {
  getListenerPosition(runtime: TRuntime): { x: number; y: number; z: number };
}

export interface WorkspaceAnchoredOverlayRuntimePort<TRuntime> {
  resolveAnchoredObjectPosition(
    runtime: TRuntime,
    object: { x: number; y: number },
    objectId: string | undefined,
    anchorOffsetX: number,
    anchorOffsetY: number,
    overlayWidthPx: number,
    overlayHeightPx: number
  ): { x: number; y: number };
  addCameraChangeListener(runtime: TRuntime, listener: () => void): () => void;
}

export interface WorkspacePointerEventLike {
  clientX: number;
  clientY: number;
}

export interface WorkspacePointerRuntimePort<TRuntime, TPointerRay> {
  setOrbitPointerBindings(runtime: TRuntime, options: { ctrlPanEnabled: boolean }): void;
  setControlsEnabled(runtime: TRuntime, enabled: boolean): void;
  isTransformInteractionActive(runtime: TRuntime): boolean;
  isTransformDragging(runtime: TRuntime): boolean;
  pointerToLocal(runtime: TRuntime, event: WorkspacePointerEventLike): { x: number; y: number };
  pointerToRay(runtime: TRuntime, event: WorkspacePointerEventLike): TPointerRay;
  intersectionOnGround(runtime: TRuntime, pointerRay: TPointerRay): { x: number; y: number } | null;
  worldToScreen(runtime: TRuntime, worldX: number, worldY: number): { x: number; y: number };
  resolveContextMenuAnchorScreen(
    runtime: TRuntime,
    object: { x: number; y: number },
    objectId?: string
  ): { x: number; y: number };
  findFirstObjectHitId(
    runtime: TRuntime,
    pointerRay: TPointerRay,
    objectIds: readonly string[]
  ): string | null;
}

export interface WorkspaceTransformControlsLike {
  enabled: boolean;
  dragging: boolean;
  axis: string | null;
  showX: boolean;
  showY: boolean;
  showZ: boolean;
  detach(): void;
  setSpace(space: "world" | "local"): void;
  setMode(mode: "translate" | "rotate" | "scale"): void;
  setTranslationSnap(value: number | null): void;
  setRotationSnap(value: number | null): void;
  attach(object: THREE.Object3D): void;
  getMode(): string;
}

export interface WorkspaceTransformRuntime {
  controls: {
    enabled: boolean;
  };
  transformControls: WorkspaceTransformControlsLike;
  transformAnchor: THREE.Object3D;
  objectMeshById: Map<string, THREE.Object3D>;
}

export interface WorkspaceTransformRuntimePort<TRuntime> {
  applyTransformControlsPalette(runtime: TRuntime, gizmoMode: CanvasGizmoMode): void;
  addTransformControlEventListener(
    runtime: TRuntime,
    type: "dragging-changed" | "mouseDown" | "mouseUp" | "objectChange",
    listener: (event: { value?: unknown }) => void
  ): () => void;
}

export interface WorkspaceObjectAddGhostRef<TGhost> {
  current: TGhost | null;
}

export interface WorkspaceObjectAddRuntimePort<TRuntime, TGhost> {
  clearObjectAddGhost(ghostRef: WorkspaceObjectAddGhostRef<TGhost>): void;
  syncObjectAddGhost(args: {
    runtime: TRuntime;
    ghostRef: WorkspaceObjectAddGhostRef<TGhost>;
    payload: ObjectAddDragPayload;
    placementX: number;
    placementY: number;
    objectRenderScale: number;
    wireframe: boolean;
    isInsideCanvasArea: boolean;
  }): void;
  resolveCanvasObjectAddPlacement(
    runtime: TRuntime,
    scene: AreaScene,
    clientX: number,
    clientY: number
  ): { x: number; y: number; tileId: string | null } | null;
}
