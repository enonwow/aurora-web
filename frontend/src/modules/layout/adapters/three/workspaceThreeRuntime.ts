import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TransformControls } from "three/examples/jsm/controls/TransformControls.js";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import { BASE_AXES_HELPER_SIZE } from "../../axesHelperFacade";
import type { AreaScene } from "../../contracts";
import {
  clearPlaceableModelLoadQueue,
  PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG,
  PLACEABLE_SHARED_MODEL_MATERIAL_FLAG,
  type PlaceableTextureFetch
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import { disposeGridLayer } from "./workspaceGridLayer";

const MIN_ZOOM_DISTANCE = 1.2;
const MAX_ZOOM_DISTANCE = 220;
const LIGHT_COLOR = 0xffffff;
const BACKGROUND_COLOR = 0x0c1420;
const ORBIT_MOUSE_DISABLED = -1 as unknown as THREE.MOUSE;

export interface RuntimeState {
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
  objectMeshById: Map<string, THREE.Object3D>;
  objectPrimitiveGeometryCache: Map<string, THREE.BufferGeometry>;
  boundsLayer: THREE.Group;
  boundsHelpers: THREE.BoxHelper[];
  chunkLayer: THREE.Group;
  gizmoLayer: THREE.Group;
  gridLayer: THREE.Group;
  tileOverlayLayer: THREE.Group;
  placeableTextureLoader: THREE.TextureLoader;
  placeableDdsTextureLoader: DDSLoader;
  placeableTgaTextureLoader: TGALoader;
  placeableTextureFetch: PlaceableTextureFetch;
  placeableTextureRequestHeader: Record<string, string>;
  placeableTextureCacheByUrl: Map<string, THREE.Texture>;
  placeableTexturePendingByUrl: Map<string, Promise<THREE.Texture | null>>;
  placeableModelLoader: GLTFLoader;
  placeableModelCacheByUrl: Map<string, THREE.Object3D>;
  placeableModelPendingByUrl: Map<string, Promise<THREE.Object3D | null>>;
  placeableNormalizedModelCacheByKey: Map<string, THREE.Object3D>;
  placeableNormalizedModelPendingByKey: Map<string, Promise<THREE.Object3D | null>>;
  axesHelper: THREE.AxesHelper;
  frameId: number | null;
  resizeObserver: ResizeObserver | null;
}

interface PlaceableRequestHeaderLoader {
  setRequestHeader?: (requestHeader: Record<string, string>) => unknown;
}

export interface PlaceableAssetRequestHeaderRuntime {
  placeableTextureLoader?: PlaceableRequestHeaderLoader;
  placeableDdsTextureLoader?: PlaceableRequestHeaderLoader;
  placeableTgaTextureLoader?: PlaceableRequestHeaderLoader;
  placeableModelLoader?: PlaceableRequestHeaderLoader;
  placeableTextureRequestHeader?: Record<string, string>;
}

interface SceneCameraFramingOptions {
  objectPreview?: boolean;
}

interface SceneFrameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  source: "aurora_tile_list_and_git_objects" | "scene_dimensions";
}

function setPlaceableLoaderRequestHeader(
  loader: PlaceableRequestHeaderLoader | undefined,
  requestHeader: Record<string, string>
): void {
  if (typeof loader?.setRequestHeader !== "function") {
    return;
  }
  loader.setRequestHeader(requestHeader);
}

export function applyPlaceableAssetRequestHeaders(
  runtime: PlaceableAssetRequestHeaderRuntime,
  accessToken: string | null | undefined
): void {
  const normalizedToken = accessToken?.trim() ?? "";
  const requestHeader: Record<string, string> =
    normalizedToken.length > 0 ? { Authorization: `Bearer ${normalizedToken}` } : {};

  setPlaceableLoaderRequestHeader(runtime.placeableTextureLoader, requestHeader);
  setPlaceableLoaderRequestHeader(runtime.placeableDdsTextureLoader, requestHeader);
  setPlaceableLoaderRequestHeader(runtime.placeableTgaTextureLoader, requestHeader);
  setPlaceableLoaderRequestHeader(runtime.placeableModelLoader, requestHeader);
  if ("placeableTextureRequestHeader" in runtime) {
    runtime.placeableTextureRequestHeader = requestHeader;
  }
}

export function applyOrbitPointerBindings(
  controls: OrbitControls,
  options: { ctrlPanEnabled: boolean }
): void {
  controls.enablePan = true;
  controls.mouseButtons.LEFT = ORBIT_MOUSE_DISABLED;
  controls.mouseButtons.MIDDLE = THREE.MOUSE.ROTATE;
  controls.mouseButtons.RIGHT = options.ctrlPanEnabled ? THREE.MOUSE.PAN : ORBIT_MOUSE_DISABLED;
}

export function createRuntime(container: HTMLDivElement): RuntimeState {
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
    objectMeshById: new Map<string, THREE.Object3D>(),
    objectPrimitiveGeometryCache: new Map<string, THREE.BufferGeometry>(),
    boundsLayer,
    boundsHelpers: [],
    chunkLayer,
    gizmoLayer,
    gridLayer,
    tileOverlayLayer,
    placeableTextureLoader: new THREE.TextureLoader(),
    placeableDdsTextureLoader: new DDSLoader(),
    placeableTgaTextureLoader: new TGALoader(),
    placeableTextureFetch: window.fetch.bind(window),
    placeableTextureRequestHeader: {},
    placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
    placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
    placeableModelLoader: new GLTFLoader(),
    placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
    placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
    axesHelper,
    frameId: null,
    resizeObserver: null
  };
  return runtime;
}

export function disposeRuntime(runtime: RuntimeState): void {
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

  const disposedPreviewTextures = new Set<THREE.Texture>();
  const disposeGeneratedPreviewTextures = (material: THREE.Material): void => {
    if (material.userData?.auroraVfxGeneratedMaterial !== true) {
      return;
    }
    const texturedMaterial = material as THREE.Material & {
      map?: THREE.Texture | null;
      alphaMap?: THREE.Texture | null;
    };
    [texturedMaterial.map, texturedMaterial.alphaMap].forEach((texture) => {
      if (
        texture &&
        material.userData?.auroraSharedTexture !== true &&
        !disposedPreviewTextures.has(texture)
      ) {
        disposedPreviewTextures.add(texture);
        texture.dispose();
      }
    });
  };
  runtime.objectLayer.children.forEach((child) => {
    child.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        if (node.geometry.userData?.[PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG] !== true) {
          node.geometry.dispose();
        }
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => {
          if (material.userData?.[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG] === true) {
            return;
          }
          disposeGeneratedPreviewTextures(material);
          material.dispose();
        });
      }
      if (node instanceof THREE.Line) {
        node.geometry.dispose();
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        materials.forEach((material) => material.dispose());
      }
      if (node instanceof THREE.Sprite) {
        const spriteMaterial = node.material;
        [spriteMaterial.map, spriteMaterial.alphaMap].forEach((texture) => {
          if (
            texture &&
            spriteMaterial.userData?.auroraSharedTexture !== true &&
            !disposedPreviewTextures.has(texture)
          ) {
            disposedPreviewTextures.add(texture);
            texture.dispose();
          }
        });
        spriteMaterial.dispose();
      }
    });
  });
  runtime.objectLayer.clear();
  runtime.objectPrimitiveGeometryCache.forEach((geometry) => {
    geometry.dispose();
  });
  runtime.objectPrimitiveGeometryCache.clear();
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
  runtime.placeableTexturePendingByUrl.clear();
  runtime.placeableTextureCacheByUrl.forEach((texture) => {
    texture.dispose();
  });
  runtime.placeableTextureCacheByUrl.clear();
  runtime.placeableModelPendingByUrl.clear();
  clearPlaceableModelLoadQueue(runtime);
  runtime.placeableNormalizedModelPendingByKey.clear();
  runtime.placeableNormalizedModelCacheByKey.forEach((model) => {
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    });
  });
  runtime.placeableNormalizedModelCacheByKey.clear();
  runtime.placeableModelCacheByUrl.forEach((model) => {
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => material.dispose());
    });
  });
  runtime.placeableModelCacheByUrl.clear();

  runtime.transformControls.detach();
  runtime.transformControls.dispose();
  runtime.scene.remove(runtime.transformControls.getHelper());
  runtime.scene.remove(runtime.transformAnchor);

  runtime.controls.dispose();
  runtime.renderer.dispose();
  runtime.renderer.domElement.remove();
}

export function resizeRuntime(runtime: RuntimeState): void {
  const width = Math.max(1, Math.floor(runtime.container.clientWidth));
  const height = Math.max(1, Math.floor(runtime.container.clientHeight));
  runtime.renderer.setSize(width, height, false);
  runtime.camera.aspect = width / height;
  runtime.camera.updateProjectionMatrix();
}

export function centerCameraForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  options: SceneCameraFramingOptions = {}
): void {
  const objectPreview = options.objectPreview === true;
  const auroraAreaTopDown = shouldUseAuroraAreaTopDownFrame(sceneData, objectPreview);
  const frameBounds = resolveSceneFrameBounds(sceneData, objectPreview);
  const centerX = (frameBounds.minX + frameBounds.maxX) / 2;
  const centerY = (frameBounds.minZ + frameBounds.maxZ) / 2;
  const sizeX = Math.max(0.4, frameBounds.maxX - frameBounds.minX);
  const sizeZ = Math.max(0.4, frameBounds.maxZ - frameBounds.minZ);
  const span = Math.max(sizeX, sizeZ);
  const vfxObjectPreview =
    objectPreview &&
    sceneData.objects.some(
      (object) => object.kind === "placeables" && Boolean(object.vfxPayload)
    );
  const targetHeight = vfxObjectPreview
    ? 0.9
    : objectPreview
      ? 0.38
      : Math.max(0, Math.min(1.25, (frameBounds.minY + frameBounds.maxY) / 2));
  const distance = resolveSceneFrameDistance(
    runtime,
    sizeX,
    sizeZ,
    span,
    objectPreview,
    vfxObjectPreview,
    auroraAreaTopDown
  );

  runtime.controls.minDistance = vfxObjectPreview
    ? 0.5
    : objectPreview
      ? 0.28
      : Math.max(0.55, span * 0.12);
  runtime.controls.maxDistance = vfxObjectPreview
    ? Math.max(18, span * 10)
    : objectPreview
      ? Math.max(12, span * 8)
      : Math.max(48, span * 8);

  runtime.controls.target.set(centerX, targetHeight, centerY);
  if (auroraAreaTopDown) {
    runtime.camera.position.set(centerX, targetHeight + distance, centerY + 0.001);
  } else {
    runtime.camera.position.set(
      centerX + distance * 0.78,
      targetHeight + distance * 0.82,
      centerY + distance * 0.78
    );
  }
  runtime.camera.near = Math.max(0.05, Math.min(0.25, runtime.controls.minDistance * 0.24));
  runtime.camera.far = Math.max(1000, runtime.controls.maxDistance * 6);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
  writeSceneFrameDataset(runtime, frameBounds, {
    distance,
    mode: auroraAreaTopDown ? "aurora_area_top_down" : "perspective_orbit",
    sizeX,
    sizeZ,
    targetX: centerX,
    targetY: targetHeight,
    targetZ: centerY
  });
}

function shouldUseAuroraAreaTopDownFrame(sceneData: AreaScene, objectPreview: boolean): boolean {
  return (
    !objectPreview &&
    (sceneData.source === "aurora_area" || sceneData.tileSource?.type === "aurora_tile_list")
  );
}

export function focusCameraOnPoint(runtime: RuntimeState, worldX: number, worldY: number): void {
  const offset = runtime.camera.position.clone().sub(runtime.controls.target);
  runtime.controls.target.set(worldX, 0, worldY);
  runtime.camera.position.copy(runtime.controls.target.clone().add(offset));
  runtime.controls.update();
}

function resolveSceneFrameBounds(sceneData: AreaScene, objectPreview: boolean): SceneFrameBounds {
  const hasAuthoritativeAreaExtent =
    sceneData.source === "aurora_area" ||
    sceneData.tileSource?.type === "aurora_tile_list";
  const bounds: SceneFrameBounds = {
    minX: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minZ: Number.POSITIVE_INFINITY,
    maxZ: Number.NEGATIVE_INFINITY,
    source: "scene_dimensions"
  };

  if (!objectPreview) {
    expandSceneFrameBounds(bounds, 0, 0, 0);
    expandSceneFrameBounds(
      bounds,
      Math.max(1, sceneData.width),
      0.1,
      Math.max(1, sceneData.height)
    );
  }

  if (!objectPreview && sceneData.tiles.length > 0) {
    bounds.source = "aurora_tile_list_and_git_objects";
    sceneData.tiles.forEach((tile) => {
      expandSceneFrameBounds(bounds, tile.col, tile.height ?? 0, tile.row);
      expandSceneFrameBounds(bounds, tile.col + 1, (tile.height ?? 0) + 0.18, tile.row + 1);
    });
  }

  if (!objectPreview && !hasAuthoritativeAreaExtent && sceneData.objects.length > 0) {
    bounds.source =
      bounds.source === "aurora_tile_list_and_git_objects"
        ? "aurora_tile_list_and_git_objects"
        : "scene_dimensions";
    sceneData.objects.forEach((object) => {
      const radius = object.kind === "sounds" ? 0.18 : 0.55;
      expandSceneFrameBounds(bounds, object.x - radius, object.z, object.y - radius);
      expandSceneFrameBounds(bounds, object.x + radius, object.z + 1.5, object.y + radius);
    });
  }

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minZ)) {
    expandSceneFrameBounds(bounds, 0, 0, 0);
    expandSceneFrameBounds(
      bounds,
      Math.max(1, sceneData.width),
      0.1,
      Math.max(1, sceneData.height)
    );
  }

  return bounds;
}

function expandSceneFrameBounds(
  bounds: SceneFrameBounds,
  x: number,
  y: number,
  z: number
): void {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return;
  }
  bounds.minX = Math.min(bounds.minX, x);
  bounds.maxX = Math.max(bounds.maxX, x);
  bounds.minY = Math.min(bounds.minY, y);
  bounds.maxY = Math.max(bounds.maxY, y);
  bounds.minZ = Math.min(bounds.minZ, z);
  bounds.maxZ = Math.max(bounds.maxZ, z);
}

function resolveSceneFrameDistance(
  runtime: RuntimeState,
  sizeX: number,
  sizeZ: number,
  span: number,
  objectPreview: boolean,
  vfxObjectPreview: boolean,
  auroraAreaTopDown: boolean
): number {
  if (vfxObjectPreview) {
    return Math.max(2.65, span * 2.35);
  }
  if (objectPreview) {
    return Math.max(1.45, span * 1.4);
  }

  const aspect =
    runtime.camera.aspect > 0
      ? runtime.camera.aspect
      : Math.max(0.35, runtime.container.clientWidth / Math.max(1, runtime.container.clientHeight));
  const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const horizontalDistance = sizeX / Math.max(0.1, 2 * Math.tan(horizontalFov / 2));
  const verticalDistance = sizeZ / Math.max(0.1, 2 * Math.tan(verticalFov / 2));
  if (auroraAreaTopDown) {
    return Math.max(4.2, Math.max(horizontalDistance, verticalDistance) * 1.14, span * 0.62);
  }
  return Math.max(4.2, Math.max(horizontalDistance, verticalDistance) * 2.05, span * 0.9);
}

function writeSceneFrameDataset(
  runtime: RuntimeState,
  bounds: SceneFrameBounds,
  frame: {
    distance: number;
    mode: "aurora_area_top_down" | "perspective_orbit";
    sizeX: number;
    sizeZ: number;
    targetX: number;
    targetY: number;
    targetZ: number;
  }
): void {
  runtime.container.dataset.areaCameraFrameStatus = "fit-selected-area";
  runtime.container.dataset.areaCameraFrameSource = bounds.source;
  runtime.container.dataset.areaCameraFrameMode = frame.mode;
  runtime.container.dataset.areaCameraFrameSize = `${frame.sizeX.toFixed(3)}x${frame.sizeZ.toFixed(3)}`;
  runtime.container.dataset.areaCameraFrameTarget = `${frame.targetX.toFixed(3)},${frame.targetY.toFixed(3)},${frame.targetZ.toFixed(3)}`;
  runtime.container.dataset.areaCameraFrameDistance = frame.distance.toFixed(3);
  runtime.container.dataset.areaCameraFrameZoomRange = `${runtime.controls.minDistance.toFixed(3)}..${runtime.controls.maxDistance.toFixed(3)}`;
}
