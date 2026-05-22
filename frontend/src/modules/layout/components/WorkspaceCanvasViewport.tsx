import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { trackTelemetry } from "../../telemetry/telemetryStore";
import type {
  SelectionScope,
  WorkspaceCommandSignal,
  WorkspaceToolbarState
} from "../roleTopbarPolicy";
import type { ViewportControlPresetId } from "../viewportControlSettings";
import type {
  AreaScene,
  SceneHistoryState,
  SceneObject,
  SceneObjectKind,
  SceneTile,
  TerrainBrushKind
} from "../../scene/contracts";
import {
  isContextMenuGesture,
  isCtrlPanGesture
} from "../viewportPointerPolicy";
import {
  createNewSceneObject,
  createSeedAreaScene
} from "../../scene/sceneFactory";
import {
  commitSceneHistory,
  createSceneHistory,
  redoSceneHistory,
  undoSceneHistory
} from "../../scene/sceneHistory";
import {
  loadLocalSceneDraft,
  loadLocalSceneAutosaves,
  saveLocalSceneAutosave,
  saveLocalSceneDraft
} from "../../scene/localDraftStore";
import type { WorkspaceOptionSettings } from "../workspaceOptionSettings";

interface WorkspaceCanvasViewportProps {
  toolbarState: WorkspaceToolbarState;
  userId: string;
  commandSignal: WorkspaceCommandSignal | null;
  viewportControlPreset: ViewportControlPresetId;
  workspaceOptions: WorkspaceOptionSettings;
  leftPanelWidthPx: number;
  rightPanelWidthPx: number;
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

interface RuntimeState {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
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
  gridHelper: THREE.GridHelper;
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

const MIN_ZOOM_DISTANCE = 6;
const MAX_ZOOM_DISTANCE = 120;
const WORLD_OBJECT_Y = 0.33;
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

const TERRAIN_BRUSH_OPTIONS: TerrainBrushKind[] = [
  "corridor",
  "doorway",
  "inn",
  "kitchen",
  "livingroom",
  "shop",
  "wall"
];

const OBJECT_BRUSH_OPTIONS: SceneObjectKind[] = [
  "placeables",
  "creatures",
  "doors",
  "items",
  "sounds"
];

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

function findTileAtWorld(scene: AreaScene, worldX: number, worldY: number): SceneTile | null {
  const col = Math.floor(worldX);
  const row = Math.floor(worldY);

  if (col < 0 || col >= scene.width || row < 0 || row >= scene.height) {
    return null;
  }

  return scene.tiles.find((tile) => tile.col === col && tile.row === row) ?? null;
}

function initialSceneHistory(userId: string): SceneHistoryState {
  const fallback = createSeedAreaScene();
  try {
    const autosaves = loadLocalSceneAutosaves(userId, window.localStorage);
    if (autosaves.length > 0) {
      return createSceneHistory(autosaves[0]);
    }
    const draft = loadLocalSceneDraft(userId, window.localStorage);
    return createSceneHistory(draft ?? fallback);
  } catch {
    return createSceneHistory(fallback);
  }
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

function createTextSprite(text: string): THREE.Sprite {
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
  sprite.scale.set(1.6, 0.6, 1);
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

  const ambient = new THREE.AmbientLight(LIGHT_COLOR, 0.68);
  const directional = new THREE.DirectionalLight(LIGHT_COLOR, 0.78);
  directional.position.set(16, 26, 10);
  scene.add(ambient);
  scene.add(directional);

  const gridHelper = new THREE.GridHelper(120, 120, 0x2a4c73, 0x1e3551);
  gridHelper.position.set(0, -0.002, 0);
  scene.add(gridHelper);

  const axesHelper = new THREE.AxesHelper(4.2);
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
    gridHelper,
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
  const distance = Math.max(16, span * 1.55);

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
  debugState: DebugState
): void {
  clearObjectLayer(runtime);
  const selectedSet = new Set(selectedObjectIds);

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

    const geometry = new THREE.SphereGeometry(0.26, 22, 22);
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
      WORLD_OBJECT_Y + object.visualTransform.offsetZ,
      object.y + object.visualTransform.offsetY
    );
    mesh.rotation.y = object.bearing + object.visualTransform.yaw;

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
      const collisionGeometry = new THREE.TorusGeometry(0.36, 0.04, 8, 24);
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
      const labelSprite = createTextSprite(OBJECT_LABELS[object.kind]);
      labelSprite.position.set(0, 0.56, 0);
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
  debugState: DebugState
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

  const anchorId = selectedObjectIds[0];
  if (!anchorId) {
    return;
  }

  const anchorMesh = runtime.objectMeshById.get(anchorId);
  if (!anchorMesh) {
    return;
  }

  if (debugState.gizmoMode === "translate") {
    const gizmoAxes = new THREE.AxesHelper(1.4);
    gizmoAxes.position.copy(anchorMesh.position);
    runtime.gizmoLayer.add(gizmoAxes);
    return;
  }

  if (debugState.gizmoMode === "rotate") {
    const ringGeometry = new THREE.TorusGeometry(0.58, 0.02, 12, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#8dbdff"),
      transparent: true,
      opacity: 0.85
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.copy(anchorMesh.position);
    ring.rotation.x = Math.PI / 2;
    runtime.gizmoLayer.add(ring);
    return;
  }

  const scaleGeometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
  const scaleMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color("#98efad"),
    wireframe: true
  });
  const scaleBox = new THREE.Mesh(scaleGeometry, scaleMaterial);
  scaleBox.position.copy(anchorMesh.position);
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
  commandSignal,
  viewportControlPreset,
  workspaceOptions,
  leftPanelWidthPx,
  rightPanelWidthPx
}: WorkspaceCanvasViewportProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const runtimeRef = useRef<RuntimeState | null>(null);
  const commandRevisionRef = useRef(0);
  const nextObjectSequenceRef = useRef(1);
  const bookmark1Ref = useRef<CameraBookmark | null>(null);
  const perfFrameRef = useRef({
    frameCount: 0,
    lastTick: 0
  });
  const [sceneHistory, setSceneHistory] = useState<SceneHistoryState>(() =>
    initialSceneHistory(userId)
  );
  const [selectedObjectIds, setSelectedObjectIds] = useState<string[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [terrainBrush, setTerrainBrush] = useState<TerrainBrushKind>("corridor");
  const [objectBrush, setObjectBrush] = useState<SceneObjectKind>("placeables");
  const [lastSavedAtUnixMs, setLastSavedAtUnixMs] = useState<number | null>(null);
  const [isAddPlacementArmed, setIsAddPlacementArmed] = useState(false);
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

  const scene = sceneHistory.present;
  const isBlenderPreset = viewportControlPreset === "blender-viewport";

  const visibleObjects = useMemo(
    () =>
      scene.objects.filter(
        (object) =>
          isObjectVisible(object, toolbarState) &&
          isKindVisibleWithIsolation(toolbarState.canvasDebug, object.kind)
      ),
    [scene.objects, toolbarState]
  );

  const visibleObjectIdsSet = useMemo(
    () => new Set(visibleObjects.map((object) => object.id)),
    [visibleObjects]
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
  }, [isBlenderPreset]);

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
    setSceneHistory(initialSceneHistory(userId));
    setSelectedObjectIds([]);
    setSelectedTileId(null);
    setIsAddPlacementArmed(false);
    commandRevisionRef.current = 0;
  }, [userId]);

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
      current.filter((selectedId) => visibleObjectIdsSet.has(selectedId))
    );
  }, [visibleObjectIdsSet]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) {
      return;
    }

    runtime.gridHelper.visible = toolbarState.canvasDebug.grid;
    runtime.axesHelper.visible = toolbarState.canvasDebug.axes;

    rebuildTerrainMesh(runtime, scene, selectedTileId, toolbarState.canvasDebug);
    rebuildObjectMeshes(
      runtime,
      visibleObjects,
      selectedObjectIds,
      toolbarState.canvasDebug
    );
    rebuildChunkBounds(runtime, scene, toolbarState.canvasDebug.chunkBounds);
    rebuildGizmoOverlay(runtime, selectedObjectIds, toolbarState.canvasDebug);

    const helperSize = Math.max(scene.width, scene.height) * 2;
    runtime.gridHelper.geometry.dispose();
    runtime.scene.remove(runtime.gridHelper);
    runtime.gridHelper = new THREE.GridHelper(helperSize, helperSize, 0x2a4c73, 0x1e3551);
    runtime.gridHelper.position.set(0, -0.002, 0);
    runtime.gridHelper.visible = toolbarState.canvasDebug.grid;
    runtime.scene.add(runtime.gridHelper);
    runtime.axesHelper.visible = toolbarState.canvasDebug.axes;
  }, [
    scene,
    selectedObjectIds,
    selectedTileId,
    toolbarState.canvasDebug,
    visibleObjects
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
      setSceneHistory((current) => undoSceneHistory(current));
      trackTelemetry("scene.undo", { userId });
      return;
    }

    if (commandSignal.actionKey === "redo") {
      setSceneHistory((current) => redoSceneHistory(current));
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
        saveLocalSceneDraft(userId, scene, window.localStorage);
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

    if (commandSignal.actionKey === "select_same_resref") {
      const anchor = scene.objects.find((object) => selectedObjectIds.includes(object.id)) ?? null;
      if (anchor) {
        const nextIds = visibleObjects
          .filter(
            (object) =>
              object.resRef === anchor.resRef &&
              isObjectSelectableByScope(object, toolbarState.selectionScope) &&
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
            isObjectSelectableByScope(object, toolbarState.selectionScope) &&
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
            if (isKindLocked(toolbarState.canvasDebug, object.kind)) {
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
    commandSignal,
    scene,
    selectedObjectIds,
    toolbarState.canvasDebug,
    toolbarState.selectionScope,
    userId,
    visibleObjects
  ]);

  useEffect(() => {
    if (!workspaceOptions.autosaveEnabled) {
      return;
    }

    const intervalMs = Math.max(10, workspaceOptions.autosaveIntervalSec) * 1000;
    const handle = window.setInterval(() => {
      try {
        const autosaves = saveLocalSceneAutosave(
          userId,
          scene,
          window.localStorage,
          workspaceOptions.autosaveMaxEntries
        );
        const savedAt = Date.now();
        setLastSavedAtUnixMs(savedAt);
        trackTelemetry("scene.autosave.saved", {
          userId,
          sceneId: scene.sceneId,
          objectCount: scene.objects.length,
          tileCount: scene.tiles.length,
          intervalSec: workspaceOptions.autosaveIntervalSec,
          retainedEntries: autosaves.length
        });
      } catch {
        trackTelemetry("scene.autosave.failed", {
          userId,
          sceneId: scene.sceneId
        });
      }
    }, intervalMs);

    return () => window.clearInterval(handle);
  }, [
    scene,
    userId,
    workspaceOptions.autosaveEnabled,
    workspaceOptions.autosaveIntervalSec,
    workspaceOptions.autosaveMaxEntries
  ]);

  useEffect(() => {
    const handleDelete = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      if ((event.key !== "Delete" && event.key !== "Backspace") || selectedObjectIds.length === 0) {
        return;
      }

      event.preventDefault();
      setSceneHistory((current) => {
        const deletableIds = new Set(
          current.present.objects
            .filter(
              (object) =>
                selectedObjectIds.includes(object.id) &&
                !isKindLocked(toolbarState.canvasDebug, object.kind)
            )
            .map((object) => object.id)
        );
        const nextObjects = current.present.objects.filter(
          (object) => !deletableIds.has(object.id)
        );
        if (nextObjects.length === current.present.objects.length) {
          return current;
        }

        trackTelemetry("scene.objects.delete", {
          userId,
          deleted: current.present.objects.length - nextObjects.length
        });

        return commitSceneHistory(current, {
          ...current.present,
          objects: nextObjects
        });
      });
      setSelectedObjectIds([]);
    };

    window.addEventListener("keydown", handleDelete);
    return () => window.removeEventListener("keydown", handleDelete);
  }, [selectedObjectIds, toolbarState.canvasDebug, userId]);

  useEffect(() => {
    if (!isBlenderPreset) {
      setIsAddPlacementArmed(false);
      return;
    }

    const handleBlenderShortcuts = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) {
        return;
      }

      const lowerKey = event.key.toLowerCase();

      if (event.key === "Escape") {
        setIsAddPlacementArmed(false);
        return;
      }

      if (event.shiftKey && lowerKey === "a") {
        event.preventDefault();
        setIsAddPlacementArmed(true);
        trackTelemetry("scene.blender.add_mode_armed", { userId });
        return;
      }

      if (lowerKey === "f") {
        event.preventDefault();
        const selectedObjects = scene.objects.filter((object) =>
          selectedObjectIds.includes(object.id)
        );
        if (selectedObjects.length > 0) {
          const centerX =
            selectedObjects.reduce((sum, object) => sum + object.x, 0) /
            selectedObjects.length;
          const centerY =
            selectedObjects.reduce((sum, object) => sum + object.y, 0) /
            selectedObjects.length;
          focusCameraOnWorldPoint(centerX, centerY);
          trackTelemetry("scene.blender.focus_selected", {
            userId,
            selectedObjects: selectedObjects.length
          });
          return;
        }

        if (selectedTileId) {
          const selectedTile = scene.tiles.find((tile) => tile.id === selectedTileId);
          if (selectedTile) {
            focusCameraOnWorldPoint(selectedTile.col + 0.5, selectedTile.row + 0.5);
            trackTelemetry("scene.blender.focus_tile", {
              userId,
              tileId: selectedTileId
            });
            return;
          }
        }

        focusCameraOnWorldPoint(scene.width / 2, scene.height / 2);
        trackTelemetry("scene.blender.focus_scene", { userId });
      }
    };

    window.addEventListener("keydown", handleBlenderShortcuts);
    return () => window.removeEventListener("keydown", handleBlenderShortcuts);
  }, [
    focusCameraOnWorldPoint,
    isBlenderPreset,
    scene,
    selectedObjectIds,
    selectedTileId,
    userId
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
            isObjectSelectableByScope(object, toolbarState.selectionScope) &&
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
    [toolbarState.canvasDebug, toolbarState.selectionScope, userId, visibleObjects, workspaceOptions.selectionBoxMode]
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      const runtime = runtimeRef.current;
      if (!runtime) {
        return;
      }

      const local = pointerToLocal(runtime, event);
      const ndc = pointerToNdc(runtime, event);
      const findHitObjectId = (): string | null => {
        const meshCandidates = visibleObjects
          .map((object) => runtime.objectMeshById.get(object.id))
          .filter((mesh): mesh is THREE.Mesh => Boolean(mesh));

        runtime.raycaster.setFromCamera(ndc, runtime.camera);
        const intersections = runtime.raycaster.intersectObjects(meshCandidates, false);
        const firstHit = intersections[0];
        return (firstHit?.object.userData.objectId as string | undefined) ?? null;
      };

      if (event.button === 2) {
        if (isCtrlPanGesture({ button: event.button, ctrlKey: event.ctrlKey })) {
          setContextMenu(null);
          applyOrbitPointerBindings(runtime.controls, { ctrlPanEnabled: true });
          return;
        }

        if (isContextMenuGesture({ button: event.button, ctrlKey: event.ctrlKey })) {
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

      const groundHit = intersectionOnGround(runtime, ndc);
      const tile = groundHit ? findTileAtWorld(scene, groundHit.x, groundHit.z) : null;

      if (toolbarState.selectionMode === "terrain") {
        if (!tile) {
          setSelectedTileId(null);
          return;
        }

        setSelectedTileId(tile.id);
        setSelectedObjectIds([]);

        setSceneHistory((current) => {
          const existing = current.present.tiles.find((entry) => entry.id === tile.id);
          if (!existing || existing.terrain === terrainBrush) {
            return current;
          }

          const nextTiles = current.present.tiles.map((entry) =>
            entry.id === tile.id ? { ...entry, terrain: terrainBrush } : entry
          );

          trackTelemetry("scene.tiles.paint", {
            userId,
            tileId: tile.id,
            terrain: terrainBrush
          });

          return commitSceneHistory(current, {
            ...current.present,
            tiles: nextTiles
          });
        });
        return;
      }

      const hitObjectId = findHitObjectId() ?? undefined;

      if (hitObjectId) {
        const hitObject = visibleObjects.find((object) => object.id === hitObjectId) ?? null;
        if (
          hitObject &&
          isObjectSelectableByScope(hitObject, toolbarState.selectionScope) &&
          !isKindLocked(toolbarState.canvasDebug, hitObject.kind)
        ) {
          setSelectedTileId(null);
          setSelectedObjectIds((current) => {
            if (event.ctrlKey) {
              if (current.includes(hitObject.id)) {
                return current.filter((id) => id !== hitObject.id);
              }
              return [...current, hitObject.id];
            }
            return [hitObject.id];
          });
          return;
        }
      }

      const wantsAddByClassic = !isBlenderPreset && event.altKey;
      const wantsAddByBlender = isBlenderPreset && isAddPlacementArmed;
      if ((wantsAddByClassic || wantsAddByBlender) && tile) {
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

        const created = createNewSceneObject(
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
          commitSceneHistory(current, {
            ...current.present,
            objects: [...current.present.objects, created]
          })
        );

        setSelectedObjectIds([created.id]);
        setSelectedTileId(tile.id);
        setIsAddPlacementArmed(false);
        trackTelemetry("scene.objects.add", {
          userId,
          kind,
          objectId: created.id,
          preset: viewportControlPreset
        });
        return;
      }

      if (!event.ctrlKey) {
        setSelectedObjectIds([]);
      }
      setSelectedTileId(tile?.id ?? null);
    },
    [
      isAddPlacementArmed,
      isBlenderPreset,
      objectBrush,
      scene,
      setContextMenu,
      terrainBrush,
      toolbarState.selectionMode,
      toolbarState.selectionScope,
      toolbarState.canvasDebug,
      userId,
      viewportControlPreset,
      visibleObjects,
      workspaceOptions
    ]
  );

  const handleMouseMove = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const runtime = runtimeRef.current;
    if (!runtime || !selectionBox.active) {
      return;
    }
    const local = pointerToLocal(runtime, event);
    setSelectionBox((current) => ({
      ...current,
      currentX: local.x,
      currentY: local.y
    }));
  }, [selectionBox.active]);

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
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
          const nextObjects = current.present.objects.filter(
            (object) => object.id !== contextMenu.objectId
          );
          if (nextObjects.length === current.present.objects.length) {
            return current;
          }

          trackTelemetry("scene.context_menu.delete_object", {
            userId,
            objectId: contextMenu.objectId,
            objectKind: contextMenu.objectKind
          });

          return commitSceneHistory(current, {
            ...current.present,
            objects: nextObjects
          });
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
        const nextSequence = nextObjectSequenceRef.current;
        nextObjectSequenceRef.current += 1;
        const copy = createNewSceneObject(
          contextObj.kind,
          contextObj.x + (toolbarState.canvasDebug.snapGrid ? workspaceOptions.snapGridStep : 0.35),
          contextObj.y + (toolbarState.canvasDebug.snapGrid ? workspaceOptions.snapGridStep : 0.35),
          nextSequence
        );
        copy.resRef = contextObj.resRef;
        copy.tag = `${contextObj.tag}_COPY`;
        copy.visualTransform = {
          ...contextObj.visualTransform,
          offsetZ: toolbarState.canvasDebug.snapHeight
            ? snapHeightValue(contextObj.visualTransform.offsetZ, workspaceOptions.snapHeightStep)
            : contextObj.visualTransform.offsetZ
        };
        copy.bearing = toolbarState.canvasDebug.snapAngle
          ? snapAngleRadians(contextObj.bearing, workspaceOptions.snapAngleStepDeg)
          : contextObj.bearing;

        setSceneHistory((current) =>
          commitSceneHistory(current, {
            ...current.present,
            objects: [...current.present.objects, copy]
          })
        );
        setSelectedObjectIds([copy.id]);
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
          const nextObjects = current.present.objects.map((object) =>
            object.id === contextObj.id
              ? {
                  ...object,
                  bearing: 0,
                  visualTransform: {
                    offsetX: 0,
                    offsetY: 0,
                    offsetZ: 0,
                    pitch: 0,
                    roll: 0,
                    yaw: 0
                  }
                }
              : object
          );
          return commitSceneHistory(current, {
            ...current.present,
            objects: nextObjects
          });
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
      focusCameraOnWorldPoint,
      scene.objects,
      toolbarState.canvasDebug,
      userId,
      workspaceOptions
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
  const controlPresetLabel =
    viewportControlPreset === "blender-viewport"
      ? "Blender Viewport"
      : "Aurora Classic";
  const inputHint =
    viewportControlPreset === "blender-viewport"
      ? "LMB select/paint | Shift+A arm add | LMB place | F focus | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Canvas menu: gizmo/snap/layers/debug"
      : "LMB select/paint | Alt+LMB add object | Ctrl+LMB multi | Shift drag box | MMB rotate | Ctrl+RMB pan | RMB object menu | Wheel zoom | Canvas menu: gizmo/snap/layers/debug";
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

      <aside
        className="canvas-editor-hud"
        aria-label="canvas editor controls"
        style={{ left: `${hudLeftPx}px`, maxWidth: hudMaxWidth }}
      >
        <label>
          Terrain brush
          <select
            aria-label="terrain brush"
            value={terrainBrush}
            onChange={(event) => setTerrainBrush(event.target.value as TerrainBrushKind)}
          >
            {TERRAIN_BRUSH_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label>
          Object brush
          <select
            aria-label="object brush"
            value={objectBrush}
            onChange={(event) => setObjectBrush(event.target.value as SceneObjectKind)}
          >
            {OBJECT_BRUSH_OPTIONS.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() => {
            setSelectedObjectIds([]);
            setSelectedTileId(null);
          }}
        >
          Clear selection
        </button>
      </aside>

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
            <p>
              Autosave:{" "}
              <strong>
                {workspaceOptions.autosaveEnabled
                  ? `on / ${workspaceOptions.autosaveIntervalSec}s / max ${workspaceOptions.autosaveMaxEntries}`
                  : "off"}
              </strong>
            </p>
            {isBlenderPreset ? (
              <p>
                Add mode: <strong>{isAddPlacementArmed ? "armed" : "idle"}</strong>
              </p>
            ) : null}
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
