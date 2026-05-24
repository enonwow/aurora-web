import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent
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
}

interface DragMoveState {
  active: boolean;
  lastWorld: { x: number; y: number } | null;
  objectIds: string[];
}

interface TransformGestureState {
  active: boolean;
  mode: "translate" | "rotate" | "scale" | null;
  axis: string | null;
  objectIds: string[];
  startAnchorPosition: THREE.Vector3;
  startAnchorRotationY: number;
  startAnchorQuaternion: THREE.Quaternion;
  sourceObjects: SceneObject[];
  sourceMeshPositions: Map<string, THREE.Vector3>;
  sourceMeshRotations: Map<string, THREE.Euler>;
  deltaX: number;
  deltaY: number;
  deltaZ: number;
  deltaBearingRad: number;
}

function createIdleTransformGestureState(): TransformGestureState {
  return {
    active: false,
    mode: null,
    axis: null,
    objectIds: [],
    startAnchorPosition: new THREE.Vector3(),
    startAnchorRotationY: 0,
    startAnchorQuaternion: new THREE.Quaternion(),
    sourceObjects: [],
    sourceMeshPositions: new Map<string, THREE.Vector3>(),
    sourceMeshRotations: new Map<string, THREE.Euler>(),
    deltaX: 0,
    deltaY: 0,
    deltaZ: 0,
    deltaBearingRad: 0
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
const BASE_AXES_HELPER_SIZE = 4.2;

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

const STATUS_COLOR: Record<MockRenderStatus, string> = {
  ok: "#4de083",
  warning: "#ffb347",
  error: "#ff5e73",
  non_render: "#0d131e"
};

const CHUNK_SIZE = 4;

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

function resolveSceneCoordinateMax(size: number): number {
  if (!Number.isFinite(size)) {
    return SCENE_COORDINATE_MIN;
  }
  return Math.max(SCENE_COORDINATE_MIN, size - SCENE_COORDINATE_EPSILON);
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
    (bound, object) => Math.max(bound, -object.visualTransform.offsetZ),
    Number.NEGATIVE_INFINITY
  );

  return clampDeltaToBounds(deltaZ, minDeltaZ, Number.POSITIVE_INFINITY);
}

function createTextSprite(text: string, scaleFactor = 1): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(8, 20, 38, 0.92)";
    ctx.fillRect(0, 26, canvas.width, 44);
    ctx.strokeStyle = "rgba(95, 142, 194, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 28, canvas.width - 4, 40);
    ctx.font = "700 30px Segoe UI";
    ctx.fillStyle = "#e6f1ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
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
  sprite.scale.set(1.6 * scaleFactor, 0.6 * scaleFactor, 1);
  sprite.renderOrder = 1000;
  return sprite;
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
  viewportFacade: WorkspaceCanvasViewportFacade
): void {
  disposeGridLayer(runtime.gridLayer);

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
  sceneScale: number
): void {
  clearObjectLayer(runtime);
  const selectedSet = new Set(selectedObjectIds);
  const markerScale = sceneScale;
  const objectRadius = 0.24 * markerScale;
  const collisionRadius = 0.33 * markerScale;
  const collisionThickness = Math.max(0.014, 0.04 * markerScale);
  const labelScale = markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;
  const objectBaseY = objectRadius + 0.012;

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

    const geometry = new THREE.SphereGeometry(objectRadius, 22, 22);
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
    mesh.position.set(
      object.x + object.visualTransform.offsetX,
      objectBaseY + object.visualTransform.offsetZ,
      object.y + object.visualTransform.offsetY
    );
    mesh.rotation.set(
      object.visualTransform.pitch,
      object.bearing + object.visualTransform.yaw,
      object.visualTransform.roll
    );

    if (selectedSet.has(object.id)) {
      material.emissive = new THREE.Color("#ffd87f");
      mesh.scale.setScalar(1.16);
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

    if (debugState.bounds) {
      const helperColor = isStatusMapped ? STATUS_COLOR[renderStatus] : "#8ab5ff";
      const boundsHelper = new THREE.BoxHelper(mesh, helperColor);
      runtime.boundsLayer.add(boundsHelper);
      runtime.boundsHelpers.push(boundsHelper);
    }
  });
}

function updateAxesHelperForScene(runtime: RuntimeState, sceneData: AreaScene, sceneScale: number): void {
  const axesSize = THREE.MathUtils.clamp(BASE_AXES_HELPER_SIZE * sceneScale, 0.34, BASE_AXES_HELPER_SIZE);
  const axesScale = axesSize / BASE_AXES_HELPER_SIZE;

  runtime.axesHelper.position.set(sceneData.width / 2, 0.02, sceneData.height / 2);
  runtime.axesHelper.scale.setScalar(axesScale);
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
    Boolean(runtime.transformControls.object) &&
    (debugState.gizmoMode === "translate" || debugState.gizmoMode === "rotate");
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
  const width = runtime.renderer.domElement.clientWidth;
  const height = runtime.renderer.domElement.clientHeight;
  const projected = new THREE.Vector3(worldX, WORLD_OBJECT_Y, worldY).project(runtime.camera);
  return {
    x: ((projected.x + 1) * 0.5) * width,
    y: ((-projected.y + 1) * 0.5) * height
  };
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
  onSelectionSnapshotChange
}: WorkspaceCanvasViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const commandRevisionRef = useRef(0);
  const nextObjectSequenceRef = useRef(1);
  const clipboardObjectsRef = useRef<SceneObject[]>([]);
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
  const [runtimePopupPinned, setRuntimePopupPinned] = useState(false);
  const [perfSnapshot, setPerfSnapshot] = useState<PerfSnapshot>({
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    geometries: 0,
    textures: 0
  });
  const trackTelemetry = trackTelemetryEvent;
  const scene = sceneHistory.present;

  useEffect(() => {
    onSceneObjectsSnapshotChange?.(scene.objects);
  }, [onSceneObjectsSnapshotChange, scene.objects]);

  useEffect(() => {
    onSelectionSnapshotChange?.(selectedObjectIds);
  }, [onSelectionSnapshotChange, selectedObjectIds]);

  useEffect(() => {
    if (!sidebarSelectSignal) {
      return;
    }

    const selectedObject = scene.objects.find(
      (object) => object.id === sidebarSelectSignal.objectId
    );
    if (!selectedObject) {
      return;
    }

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

    const selectedObject = scene.objects.find(
      (object) => object.id === sidebarContextMenuSignal.objectId
    );
    if (!selectedObject) {
      return;
    }

    const runtime = runtimeRef.current;
    let localX = 24;
    let localY = 24;

    if (runtime) {
      const rect = runtime.container.getBoundingClientRect();
      localX = Math.max(
        12,
        Math.min(rect.width - 12, sidebarContextMenuSignal.clientX - rect.left)
      );
      localY = Math.max(
        12,
        Math.min(rect.height - 12, sidebarContextMenuSignal.clientY - rect.top)
      );
    }

    setSelectedTileId(null);
    setSelectedObjectIds([selectedObject.id]);
    setContextMenu({
      x: localX,
      y: localY,
      objectId: selectedObject.id,
      objectKind: selectedObject.kind
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
      visualTransform: { ...object.visualTransform }
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

        const copy = sceneViewportPort.createObject(
          sourceObject.kind,
          sourceObject.x + translation.x,
          sourceObject.y + translation.y,
          nextSequence
        );
        copy.resRef = sourceObject.resRef;
        copy.tag = `${sourceObject.tag}_COPY`;
        copy.visualTransform = {
          ...sourceObject.visualTransform,
          offsetZ: toolbarState.canvasDebug.snapHeight
            ? snapHeightValue(sourceObject.visualTransform.offsetZ, workspaceOptions.snapHeightStep)
            : sourceObject.visualTransform.offsetZ
        };
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
    runtime.axesHelper.visible = toolbarState.canvasDebug.axes;
    updateAxesHelperForScene(runtime, scene, sceneScale);

    rebuildTerrainMesh(runtime, scene, selectedTileId, toolbarState.canvasDebug);
    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      selectedObjectIds,
      toolbarState.canvasDebug,
      sceneScale
    );
    rebuildChunkBounds(runtime, scene, toolbarState.canvasDebug.chunkBounds);
    rebuildGizmoOverlay(
      runtime,
      selectedObjectIds,
      objectById,
      toolbarState.canvasDebug,
      sceneScale
    );
    rebuildGridLayer(runtime, scene, viewportFacade);
    runtime.gridLayer.visible = toolbarState.canvasDebug.grid;
  }, [
    objectById,
    sceneViewportPort,
    scene,
    selectedObjectIds,
    selectedTileId,
    toolbarState.canvasDebug,
    viewportFacade,
    visibleObjects
  ]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    const transformControls = runtime.transformControls;
    const gizmoMode = toolbarState.canvasDebug.gizmoMode;
    const supportsTransformControls = gizmoMode === "translate" || gizmoMode === "rotate";

    if (transformControls.dragging && transformGestureRef.current.active) {
      return;
    }

    if (!supportsTransformControls) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const selectedObjects = selectedObjectIds
      .map((id) => objectById.get(id))
      .filter((object): object is SceneObject => Boolean(object));
    if (
      selectedObjects.length === 0 ||
      selectedObjects.some((object) => object.kind === "doors")
    ) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const movableObjects = selectedObjects.filter(
      (object) =>
        MOVE_ALLOWED_KINDS.has(object.kind) &&
        !isKindLocked(toolbarState.canvasDebug, object.kind)
    );
    if (movableObjects.length === 0) {
      transformGestureRef.current = createIdleTransformGestureState();
      transformControls.detach();
      transformControls.enabled = false;
      return;
    }

    const movableIdsSet = new Set(movableObjects.map((object) => object.id));
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
    runtime.transformAnchor.updateMatrixWorld();

    transformControls.enabled = true;
    transformControls.setSpace("world");
    transformControls.setMode(gizmoMode);
    transformControls.showX = gizmoMode === "translate";
    transformControls.showY = gizmoMode === "rotate";
    transformControls.showZ = gizmoMode === "translate";
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
      const objectIds = selectedObjectIds.filter((id) => {
        const object = objectById.get(id);
        if (!object) {
          return false;
        }
        return (
          MOVE_ALLOWED_KINDS.has(object.kind) &&
          !isKindLocked(toolbarState.canvasDebug, object.kind)
        );
      });
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
      objectIds.forEach((id) => {
        const mesh = runtime.objectMeshById.get(id);
        if (!mesh) {
          return;
        }
        sourceMeshPositions.set(id, mesh.position.clone());
        sourceMeshRotations.set(id, mesh.rotation.clone());
      });

      if (sourceMeshPositions.size === 0) {
        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      transformGestureRef.current = {
        active: true,
        mode,
        axis: transformControls.axis,
        objectIds,
        startAnchorPosition: runtime.transformAnchor.position.clone(),
        startAnchorRotationY: runtime.transformAnchor.rotation.y,
        startAnchorQuaternion: runtime.transformAnchor.quaternion.clone(),
        sourceObjects,
        sourceMeshPositions,
        sourceMeshRotations,
        deltaX: 0,
        deltaY: 0,
        deltaZ: 0,
        deltaBearingRad: 0
      };
    };

    const handleMouseDown = () => {
      startTransformGesture();
    };

    const handleMouseUp = () => {
      const gesture = transformGestureRef.current;
      if (!gesture.active || gesture.objectIds.length === 0) {
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

        transformGestureRef.current = createIdleTransformGestureState();
        return;
      }

      if (gesture.mode === "rotate") {
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
        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        const rawDeltaX = runtime.transformAnchor.position.x - gesture.startAnchorPosition.x;
        const rawDeltaY = runtime.transformAnchor.position.z - gesture.startAnchorPosition.z;
        const rawDeltaZ = runtime.transformAnchor.position.y - gesture.startAnchorPosition.y;
        const deltaX =
          axis.includes("X") && Math.abs(rawDeltaX) > epsilon ? rawDeltaX : 0;
        const deltaY =
          axis.includes("Z") && Math.abs(rawDeltaY) > epsilon ? rawDeltaY : 0;
        const deltaZ =
          axis.includes("Y") && Math.abs(rawDeltaZ) > epsilon ? rawDeltaZ : 0;

        const boundedDelta = clampTranslationDeltaToSceneBounds(
          scene,
          gesture.sourceObjects,
          { x: deltaX, y: deltaY }
        );
        const boundedDeltaZ = clampHeightDeltaToSurface(gesture.sourceObjects, deltaZ);

        gesture.deltaX = boundedDelta.x;
        gesture.deltaY = boundedDelta.y;
        gesture.deltaZ = boundedDeltaZ;

        gesture.objectIds.forEach((id) => {
          const mesh = runtime.objectMeshById.get(id);
          const sourcePosition = gesture.sourceMeshPositions.get(id);
          if (!mesh || !sourcePosition) {
            return;
          }
          mesh.position.set(
            sourcePosition.x + boundedDelta.x,
            sourcePosition.y + boundedDeltaZ,
            sourcePosition.z + boundedDelta.y
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
        const axis = (transformControls.axis ?? gesture.axis ?? "").toUpperCase();
        const supportsBearingDelta = axis.includes("Y") || axis === "E" || axis === "XYZE";
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
          if (!hitObjectId) {
            setContextMenu(null);
            return;
          }

          const hitObject = visibleObjects.find((object) => object.id === hitObjectId) ?? null;
          if (!hitObject) {
            setContextMenu(null);
            return;
          }

          setSelectedTileId(null);
          setSelectedObjectIds([hitObject.id]);
          setContextMenu({
            x: local.x,
            y: local.y,
            objectId: hitObject.id,
            objectKind: hitObject.kind
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

        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.updateTileTerrain(
            current.present,
            tile.id,
            terrainBrush
          );
          if (nextScene === current.present) {
            return current;
          }

          trackTelemetry("scene.tiles.paint", {
            userId,
            tileId: tile.id,
            terrain: terrainBrush
          });

          return sceneViewportPort.commitHistory(current, nextScene);
        });
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
        const placementX = toolbarState.canvasDebug.snapGrid
          ? snapGridValue(rawPlacementX, workspaceOptions.snapGridStep)
          : rawPlacementX;
        const placementY = toolbarState.canvasDebug.snapGrid
          ? snapGridValue(rawPlacementY, workspaceOptions.snapGridStep)
          : rawPlacementY;

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
          created.visualTransform.offsetZ = snapHeightValue(
            created.visualTransform.offsetZ,
            workspaceOptions.snapHeightStep
          );
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

      if (action === "delete") {
        setSceneHistory((current) => {
          const nextScene = sceneViewportPort.deleteObjectById(
            current.present,
            contextMenu.objectId
          );
          if (nextScene === current.present) {
            return current;
          }

          trackTelemetry("scene.context_menu.delete_object", {
            userId,
            objectId: contextMenu.objectId,
            objectKind: contextMenu.objectKind
          });

          return sceneViewportPort.commitHistory(current, nextScene);
        });
        setSelectedObjectIds((current) =>
          current.filter((selectedId) => selectedId !== contextMenu.objectId)
        );
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
          z: contextObj.visualTransform.offsetZ
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
      closeContextMenu,
      contextMenu,
      duplicateObjects,
      focusCameraOnWorldPoint,
      scene.objects,
      sceneViewportPort,
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
    return () => window.removeEventListener("keydown", handleEscape);
  }, [closeContextMenu, contextMenu]);

  const selectedTile = selectedTileId
    ? scene.tiles.find((tile) => tile.id === selectedTileId) ?? null
    : null;

  const selectedSummary =
    selectedObjectIds.length > 0
      ? `${selectedObjectIds.length} object(s)`
      : selectedTile
        ? `tile ${selectedTile.col},${selectedTile.row}`
        : "none";
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
    "LMB select/paint | Alt+LMB add object | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Arrows move selected | Ctrl/Cmd+C copy | Ctrl/Cmd+X cut | Ctrl/Cmd+V paste | Del delete | Gizmo: translate XYZ / rotate bearing (Y) | Canvas menu: gizmo/snap/layers/debug";
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

  return (
    <section className="canvas-stage-real">
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

      {contextMenu ? (
        <article
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
          <button
            type="button"
            role="menuitem"
            disabled={isContextObjectLocked}
            onClick={() => handleContextAction("adjust_location")}
          >
            Adjust location
          </button>
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
          <button type="button" role="menuitem" disabled={isContextObjectLocked} onClick={() => handleContextAction("properties")}>
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
