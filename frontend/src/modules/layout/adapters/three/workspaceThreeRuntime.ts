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
  clearPlaceableTextureLoadQueue,
  createAuroraTextureCycleRuntime,
  PLACEABLE_TEXTURE_ANISOTROPY_CAP,
  PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT,
  PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT,
  PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG,
  PLACEABLE_SHARED_MODEL_MATERIAL_FLAG,
  type AuroraTextureCycleRuntime,
  type PlaceableModelFetch,
  type PlaceableTextureFetch
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import { installAuroraLinearLightFalloffShaderChunk } from "./auroraThreeLightFalloff";
import { AuroraRetailBloomPass } from "./auroraRetailBloomPass";
import {
  advanceAuroraVfxCanonicalRuntimePlayback,
  seekAuroraVfxCanonicalRuntimePlayback,
  updateAuroraVfxCanonicalCameraBillboards
} from "./auroraVfxCanonicalRenderer";
import { installAuroraVfxRenderQueueSort } from "./auroraVfxRenderQueue";
import { disposeGridLayer } from "./workspaceGridLayer";
import { resolveAuroraAreaRenderTileHeight } from "./workspaceAreaRenderCoordinates";

const MIN_ZOOM_DISTANCE = 1.2;
const MAX_ZOOM_DISTANCE = 220;
const LIGHT_COLOR = 0xffffff;
const BACKGROUND_COLOR = 0x0c1420;
const AUTH_PROTECTED_GLTF_TEXTURE_DEPENDENCY_PATTERN =
  /\/(?:_aurora\/v1|api\/v1)\/settings\/runtime\/module-cache\/textures\//u;
const CONTRACT_DDS_TEXTURE_PLACEHOLDER_DATA_URL =
  "data:image/vnd-ms.dds;base64,RERTIHwAAAAPEAAAAQAAAAEAAAAEAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAABBAAAAAAAAACAAAAAAAP8AAP8AAP8AAAAAAAD/ABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
const ORBIT_MOUSE_DISABLED = -1 as unknown as THREE.MOUSE;
const ORBIT_CONTROLS_Y_UP = new THREE.Vector3(0, 1, 0);
const DEFAULT_CAMERA_FOV_DEGREES = 55;
const TOP_DOWN_ORACLE_CAMERA_FOV_DEGREES = 5;
const TOP_DOWN_ORACLE_AREA_FRAME_MARGIN = 1.12;
const CAMERA_FRAME_FOV_DENOMINATOR_EPSILON = 1e-6;
const AREA_CAMERA_BOUNDS_POLICY =
  "footprint_xz_connected_visible_terrain/v1";
const AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON = 1e-6;
const AREA_CAMERA_EXCLUDED_MESH_SAMPLE_LIMIT = 8;

function resolvePerspectiveFrameDistance(
  span: number,
  fieldOfViewRadians: number
): number {
  return span / Math.max(
    CAMERA_FRAME_FOV_DENOMINATOR_EPSILON,
    2 * Math.tan(fieldOfViewRadians / 2)
  );
}
const WORKSPACE_PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT =
  PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT;
const WORKSPACE_PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT =
  PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT;

// Keep the framing distance expressed as the real camera-to-target distance.
// The previous per-axis multipliers made the actual orbit radius ~37% larger
// than the calculated distance, which left small Aurora areas visibly under-framed.
const SCENE_FRAME_CAMERA_DIRECTION = new THREE.Vector3(0.78, 0.82, 0.78).normalize();

export interface RuntimeState {
  renderer: THREE.WebGLRenderer;
  auroraRetailBloomPass?: AuroraRetailBloomPass;
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
  objectAnimationMixersById: Map<string, RuntimeObjectAnimationPlayback>;
  auroraTextureCycleRuntimesByObjectId: Map<
    string,
    RuntimeAuroraTextureCyclePlayback
  >;
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
  placeableTextureMaxAnisotropy: number;
  placeableTextureCacheByUrl: Map<string, THREE.Texture>;
  placeableTexturePendingByUrl: Map<string, Promise<THREE.Texture | null>>;
  placeableModelLoader: GLTFLoader;
  placeableModelFetch: PlaceableModelFetch;
  placeableModelRequestHeader: Record<string, string>;
  placeableModelCacheByUrl: Map<string, THREE.Object3D>;
  placeableModelPendingByUrl: Map<string, Promise<THREE.Object3D | null>>;
  placeableNormalizedModelCacheByKey: Map<string, THREE.Object3D>;
  placeableNormalizedModelPendingByKey: Map<string, Promise<THREE.Object3D | null>>;
  placeableModelLoadConcurrencyLimit: number;
  placeableModelLoadStartsPerFrameLimit: number;
  axesHelper: THREE.AxesHelper;
  frameId: number | null;
  auroraTextureCycleFrameSerial: number;
  resizeObserver: ResizeObserver | null;
}

export interface RuntimeObjectAnimationPlayback {
  mixer: THREE.AnimationMixer;
  root: THREE.Object3D;
  clipCount: number;
  actions: THREE.AnimationAction[];
  actionNames: string[];
  clipRuns: RuntimeObjectAnimationClipRun[];
  followUpRunIndex: number | null;
  elapsedSeconds: number;
  autoplay: boolean;
  applyInitialPose: boolean;
  processedEvents: RuntimeObjectAnimationProcessedEvent[];
  mirrorUserDataTargets: THREE.Object3D[];
  afterUpdate?: (
    deltaSeconds?: number,
    elapsedSeconds?: number,
    animationTimeSeconds?: number,
    animationCompleted?: boolean,
    rendererFrameSerial?: number,
    rendererDeltaSeconds?: number
  ) => void;
}

export interface RuntimeAuroraTextureCyclePlayback {
  root: THREE.Object3D;
  runtime: AuroraTextureCycleRuntime;
}

export interface RuntimeObjectAnimationClipRun {
  clipName: string;
  durationSeconds: number;
  transitionSeconds: number;
  priority: number;
  timeScale: number;
  loopMode: "loop" | "once";
  events: RuntimeObjectAnimationEvent[];
  currentTimeSeconds: number;
  lastEventIndex: number;
  completed: boolean;
  active: boolean;
  isFollowUp: boolean;
  blendWeight: number;
  blendPhase: "queued" | "fade-in" | "steady" | "fade-out" | "completed";
  handoffStarted: boolean;
  handoffToClipName?: string;
  handoffTransitionSeconds?: number;
}

export interface RuntimeObjectAnimationEvent {
  timeSeconds: number;
  name: string;
}

export interface RuntimeObjectAnimationProcessedEvent {
  clipName: string;
  name: string;
  timeSeconds: number;
  elapsedSeconds: number;
}

export interface RuntimeObjectAnimationPlaybackOptions {
  afterUpdate?: (
    deltaSeconds?: number,
    elapsedSeconds?: number,
    animationTimeSeconds?: number,
    animationCompleted?: boolean
  ) => void;
  autoplay?: boolean;
  applyInitialPose?: boolean;
  priority?: number;
  timeScale?: number;
  followUpClip?: THREE.AnimationClip | null;
  followUpPriority?: number;
  followUpTimeScale?: number;
  mirrorUserDataTargets?: THREE.Object3D[];
}

function readRuntimeObjectAnimationClipUserData(
  clip: THREE.AnimationClip
): Record<string, unknown> {
  return clip.userData && typeof clip.userData === "object"
    ? (clip.userData as Record<string, unknown>)
    : {};
}

function resolveRuntimeObjectAnimationTransitionSeconds(clip: THREE.AnimationClip): number {
  const userData = readRuntimeObjectAnimationClipUserData(clip);
  const value = userData.auroraMdlSourceAnimationTransitionTime;
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 0;
}

function resolveRuntimeObjectAnimationRunPriority(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
}

function resolveRuntimeObjectAnimationRunTimeScale(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
}

function resolveRuntimeObjectAnimationLoopMode(
  clip: THREE.AnimationClip
): RuntimeObjectAnimationClipRun["loopMode"] {
  const userData = readRuntimeObjectAnimationClipUserData(clip);
  if (userData.auroraMdlSourceAnimationLoopMode === "once") {
    return "once";
  }
  if (userData.auroraMdlSourceAnimationLoopMode === "loop") {
    return "loop";
  }
  const normalizedName = (clip.name || "").trim().toLowerCase();
  if (
    /(dead|death|die|damage|hit|slash|stab|attack|bowshot|xbowshot|throw|cast|spell|appear|disappear|conjure|knock|kdbck|spasm|getup)/iu.test(
      normalizedName
    )
  ) {
    return "once";
  }
  return "loop";
}

function readRuntimeObjectAnimationEvents(
  clip: THREE.AnimationClip
): RuntimeObjectAnimationEvent[] {
  const userData = readRuntimeObjectAnimationClipUserData(clip);
  const events = userData.auroraMdlSourceAnimationEvents;
  if (!Array.isArray(events)) {
    return [];
  }
  return events
    .flatMap((entry) => {
      if (!entry || typeof entry !== "object") {
        return [];
      }
      const record = entry as Record<string, unknown>;
      const time = record.time;
      const name = record.name;
      if (
        typeof time !== "number" ||
        !Number.isFinite(time) ||
        time < 0 ||
        typeof name !== "string" ||
        name.trim().length === 0
      ) {
        return [];
      }
      return [{ timeSeconds: time, name: name.trim() }];
    })
    .sort(
      (left, right) =>
        left.timeSeconds - right.timeSeconds || left.name.localeCompare(right.name)
    );
}

export function buildRuntimeObjectAnimationRunUserData(
  playback: RuntimeObjectAnimationPlayback
): Record<string, unknown> {
  const eventCount = playback.clipRuns.reduce((sum, run) => sum + run.events.length, 0);
  const compositeBaseClipNames = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationCompositeBaseClipName)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const recoveryPoseClipNames = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationRecoveryPoseClipName)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const recoveryPoseCandidateNames = playback.actions
    .map(
      (action) =>
        action.getClip().userData?.creatureAnimationRecoveryPoseClipNameCandidate
    )
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const recoveryPoseFallbacks = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationRecoveryPoseFallback)
    .filter((fallback): fallback is string => typeof fallback === "string" && fallback.length > 0);
  const recoveryPoseFallbackReasons = playback.actions
    .map(
      (action) =>
        action.getClip().userData?.creatureAnimationRecoveryPoseFallbackReason
    )
    .filter((reason): reason is string => typeof reason === "string" && reason.length > 0);
  const recoveryPoseSkippedReasons = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationRecoveryPoseSkippedReason)
    .filter((reason): reason is string => typeof reason === "string" && reason.length > 0);
  const compositeBasePoseSkippedReasons = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationCompositeBasePoseSkippedReason)
    .filter((reason): reason is string => typeof reason === "string" && reason.length > 0);
  const compositeBasePoseCandidateNames = playback.actions
    .map((action) => action.getClip().userData?.creatureAnimationCompositeBaseClipNameCandidate)
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  return {
    creatureAnimationPlaybackAnimRunMode: "aurora-stack-v1",
    creatureAnimationPlaybackLoopModes: playback.clipRuns.map((run) => run.loopMode),
    creatureAnimationPlaybackTransitionSeconds: playback.clipRuns.map((run) =>
      Number(run.transitionSeconds.toFixed(3))
    ),
    creatureAnimationPlaybackRunStates: playback.clipRuns.map((run) =>
      run.completed ? "completed" : run.active ? "active" : "queued"
    ),
    creatureAnimationPlaybackRunPriorities: playback.clipRuns.map((run) => run.priority),
    creatureAnimationPlaybackRunBlendPhases: playback.clipRuns.map((run) => run.blendPhase),
    creatureAnimationPlaybackRunBlendWeights: playback.clipRuns.map((run) =>
      Number(run.blendWeight.toFixed(3))
    ),
    creatureAnimationPlaybackTimeScales: playback.clipRuns.map((run) =>
      Number(run.timeScale.toFixed(3))
    ),
    creatureAnimationPlaybackActionWeights: playback.actions.map((action) =>
      Number(action.getEffectiveWeight().toFixed(3))
    ),
    creatureAnimationPlaybackFollowUpClipNames: playback.clipRuns
      .filter((run) => run.isFollowUp)
      .map((run) => run.clipName),
    creatureAnimationPlaybackHandoffClipNames: playback.clipRuns
      .flatMap((run) => (run.handoffToClipName ? [run.handoffToClipName] : [])),
    creatureAnimationPlaybackHandoffTransitionSeconds: playback.clipRuns
      .flatMap((run) =>
        typeof run.handoffTransitionSeconds === "number"
          ? [Number(run.handoffTransitionSeconds.toFixed(3))]
          : []
      ),
    creatureAnimationPlaybackEventCount: eventCount,
    creatureAnimationPlaybackEventNames: playback.clipRuns.flatMap((run) =>
      run.events.map((event) => event.name)
    ),
    creatureAnimationPlaybackProcessedEventCount: playback.processedEvents.length,
    creatureAnimationPlaybackProcessedEventNames: playback.processedEvents.map(
      (event) => event.name
    ),
    creatureAnimationPlaybackCompositeBaseClipNames: compositeBaseClipNames,
    creatureAnimationPlaybackCompositeBasePoseCount: compositeBaseClipNames.length,
    creatureAnimationPlaybackCompositeBasePoseSkippedReasons:
      compositeBasePoseSkippedReasons,
    creatureAnimationPlaybackCompositeBasePoseCandidateNames:
      compositeBasePoseCandidateNames,
    creatureAnimationPlaybackRecoveryPoseClipNames: recoveryPoseClipNames,
    creatureAnimationPlaybackRecoveryPoseCount: recoveryPoseClipNames.length,
    creatureAnimationPlaybackRecoveryPoseCandidateNames:
      recoveryPoseCandidateNames,
    creatureAnimationPlaybackRecoveryPoseFallbacks: recoveryPoseFallbacks,
    creatureAnimationPlaybackRecoveryPoseFallbackReasons:
      recoveryPoseFallbackReasons,
    creatureAnimationPlaybackRecoveryPoseSkippedReasons:
      recoveryPoseSkippedReasons,
    creatureAnimationPlaybackCompletedActionNames: playback.clipRuns
      .filter((run) => run.completed)
      .map((run) => run.clipName)
  };
}

function resolveRuntimeObjectAnimationMirrorTargets(
  root: THREE.Object3D,
  targets: readonly THREE.Object3D[] | undefined
): THREE.Object3D[] {
  const seen = new Set<THREE.Object3D>([root]);
  return (targets ?? []).filter((target) => {
    if (seen.has(target)) {
      return false;
    }
    seen.add(target);
    return true;
  });
}

function mirrorRuntimeObjectAnimationRunUserData(
  playback: RuntimeObjectAnimationPlayback
): void {
  if (playback.mirrorUserDataTargets.length === 0) {
    return;
  }
  const userData = buildRuntimeObjectAnimationRunUserData(playback);
  playback.mirrorUserDataTargets.forEach((target) => {
    target.userData = {
      ...target.userData,
      ...userData
    };
  });
}

function resolveRuntimeObjectAnimationEffectTiming(
  playback: RuntimeObjectAnimationPlayback
): { animationTimeSeconds: number; animationCompleted: boolean } {
  const primaryRun = playback.clipRuns[0];
  if (!primaryRun) {
    return {
      animationTimeSeconds: playback.elapsedSeconds,
      animationCompleted: false
    };
  }
  return {
    animationTimeSeconds: (playback.clipRuns.find(
      (run) => run.active && !run.completed
    ) ?? primaryRun).currentTimeSeconds,
    animationCompleted:
      primaryRun.completed &&
      !playback.clipRuns.some((run) => run.isFollowUp && run.active)
  };
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
  placeableModelRequestHeader?: Record<string, string>;
}

interface SceneCameraFramingOptions {
  objectPreview?: boolean;
  topDownTargetX?: number;
  topDownTargetY?: number;
  topDownTargetZ?: number;
  topDownDistance?: number;
}

export interface SceneFrameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  source:
    | "aurora_tile_list_and_git_objects"
    | "scene_dimensions"
    | "runtime_object_bounds"
    | "runtime_terrain_bounds";
}

export interface CameraFrameCoverage {
  status: "pass" | "failed";
  clippedCornerCount: number;
  minimumNdcMargin: number;
}

interface VisibleTerrainBoundsResolution {
  cameraBounds: THREE.Box3;
  observedBounds: THREE.Box3;
  excludedMeshCount: number;
  excludedMeshSample: string[];
  expansionRatio: number;
}

interface OrbitControlsCameraUpCache {
  _quat?: THREE.Quaternion;
  _quatInverse?: THREE.Quaternion;
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
  if ("placeableModelRequestHeader" in runtime) {
    runtime.placeableModelRequestHeader = requestHeader;
  }
}

export function resolveAuroraGltfTextureDependencyUrl(url: string): string {
  // GLTFLoader falls back to TextureLoader/ImageLoader when createImageBitmap
  // is unavailable (including some proof/browser environments). ImageLoader
  // cannot attach our Bearer header, so protected external texture URIs emit a
  // 401 even though the Aurora render contract subsequently binds the same
  // material through the authenticated shared texture pipeline. Substitute a
  // neutral decodeable DDS pixel for that redundant GLTF dependency. Aurora
  // GLBs declare these URIs through MSFT_texture_dds, so a PNG would still be
  // sent through DDSLoader and corrupt its parser. The contract
  // texture application remains authoritative and is covered by runtime map
  // readiness.
  return AUTH_PROTECTED_GLTF_TEXTURE_DEPENDENCY_PATTERN.test(url)
    ? CONTRACT_DDS_TEXTURE_PLACEHOLDER_DATA_URL
    : url;
}

export function createAuroraGltfLoadingManager(
  onProtectedTextureDependency?: (url: string) => void
): THREE.LoadingManager {
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const resolvedUrl = resolveAuroraGltfTextureDependencyUrl(url);
    if (resolvedUrl !== url) {
      onProtectedTextureDependency?.(url);
    }
    return resolvedUrl;
  });
  return manager;
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

export function syncOrbitControlsCameraUp(controls: OrbitControls): void {
  const cachedControls = controls as OrbitControls & OrbitControlsCameraUpCache;
  if (
    !(cachedControls._quat instanceof THREE.Quaternion) ||
    !(cachedControls._quatInverse instanceof THREE.Quaternion)
  ) {
    return;
  }

  cachedControls._quat.setFromUnitVectors(controls.object.up, ORBIT_CONTROLS_Y_UP);
  cachedControls._quatInverse.copy(cachedControls._quat).invert();
}

function setRuntimeCameraUp(runtime: RuntimeState, x: number, y: number, z: number): void {
  runtime.camera.up.set(x, y, z).normalize();
  syncOrbitControlsCameraUp(runtime.controls);
}

function setRuntimeCameraFov(runtime: RuntimeState, fovDegrees: number): void {
  if (Math.abs(runtime.camera.fov - fovDegrees) < 0.001) {
    return;
  }
  runtime.camera.fov = fovDegrees;
  runtime.camera.updateProjectionMatrix();
}

export function createRuntime(container: HTMLDivElement): RuntimeState {
  installAuroraLinearLightFalloffShaderChunk();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    stencil: true,
    powerPreference: "high-performance"
  });
  installAuroraVfxRenderQueueSort(renderer);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(BACKGROUND_COLOR, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  renderer.domElement.style.cursor = "crosshair";
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND_COLOR);

  const camera = new THREE.PerspectiveCamera(DEFAULT_CAMERA_FOV_DEGREES, 1, 0.1, 1000);
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
  ambient.name = "workspace-default-preview-ambient-light";
  directional.name = "workspace-default-preview-directional-light";
  ambient.userData.auroraWorkspaceDefaultPreviewLight = true;
  directional.userData.auroraWorkspaceDefaultPreviewLight = true;
  ambient.userData.auroraWorkspaceDefaultPreviewLightSource =
    "Aurora Web workspace visibility helper; not an Aurora runtime light";
  directional.userData.auroraWorkspaceDefaultPreviewLightSource =
    "Aurora Web workspace visibility helper; not an Aurora runtime light";
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

  const placeableModelLoadingManager = createAuroraGltfLoadingManager((url) => {
    const previousCount = Number(
      container.dataset.placeableModelProtectedTextureDependencySubstitutionCount ?? 0
    );
    container.dataset.placeableModelProtectedTextureDependencySubstitutionCount = String(
      previousCount + 1
    );
    container.dataset.placeableModelProtectedTextureDependencySubstitutionStatus =
      "contract-texture-pipeline-authoritative";
    container.dataset.placeableModelProtectedTextureDependencySample =
      url.split("?")[0]?.slice(-160) ?? "protected-texture";
  });

  const runtime: RuntimeState = {
    renderer,
    auroraRetailBloomPass: new AuroraRetailBloomPass(),
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
    objectAnimationMixersById: new Map<string, RuntimeObjectAnimationPlayback>(),
    auroraTextureCycleRuntimesByObjectId: new Map<
      string,
      RuntimeAuroraTextureCyclePlayback
    >(),
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
    placeableTextureMaxAnisotropy: Math.min(
      renderer.capabilities.getMaxAnisotropy(),
      PLACEABLE_TEXTURE_ANISOTROPY_CAP
    ),
    placeableTextureCacheByUrl: new Map<string, THREE.Texture>(),
    placeableTexturePendingByUrl: new Map<string, Promise<THREE.Texture | null>>(),
    placeableModelLoader: new GLTFLoader(placeableModelLoadingManager),
    placeableModelFetch: window.fetch.bind(window),
    placeableModelRequestHeader: {},
    placeableModelCacheByUrl: new Map<string, THREE.Object3D>(),
    placeableModelPendingByUrl: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableNormalizedModelCacheByKey: new Map<string, THREE.Object3D>(),
    placeableNormalizedModelPendingByKey: new Map<string, Promise<THREE.Object3D | null>>(),
    placeableModelLoadConcurrencyLimit: WORKSPACE_PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT,
    placeableModelLoadStartsPerFrameLimit: WORKSPACE_PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT,
    axesHelper,
    frameId: null,
    auroraTextureCycleFrameSerial: 0,
    resizeObserver: null
  };
  return runtime;
}

function ensureRuntimeObjectAnimationMixerMap(
  runtime: RuntimeState
): Map<string, RuntimeObjectAnimationPlayback> {
  if (!runtime.objectAnimationMixersById) {
    runtime.objectAnimationMixersById = new Map<string, RuntimeObjectAnimationPlayback>();
  }
  return runtime.objectAnimationMixersById;
}

function ensureRuntimeAuroraTextureCycleMap(
  runtime: RuntimeState
): Map<string, RuntimeAuroraTextureCyclePlayback> {
  if (!runtime.auroraTextureCycleRuntimesByObjectId) {
    runtime.auroraTextureCycleRuntimesByObjectId = new Map<
      string,
      RuntimeAuroraTextureCyclePlayback
    >();
  }
  return runtime.auroraTextureCycleRuntimesByObjectId;
}

function writeRuntimeAuroraTextureCyclePlaybackUserData(
  playback: RuntimeAuroraTextureCyclePlayback
): void {
  const snapshots = playback.runtime.snapshots();
  playback.root.userData = {
    ...playback.root.userData,
    auroraTextureCycleRuntimeStatus: "active",
    auroraTextureCycleRuntimeMode: "aurora-global-resource-frame-clock",
    auroraTextureCycleRuntimeTextureCount: playback.runtime.textureCount,
    auroraTextureCycleRuntimeMaterialCount: playback.runtime.materialCount,
    auroraTextureCycleRuntimeReferences: playback.runtime.references,
    auroraTextureCycleRuntimeSnapshots: snapshots,
    auroraTextureCycleRuntimeFrameIndices: snapshots.map(
      (snapshot) => snapshot.frameIndex
    ),
    auroraTextureCycleRuntimeAccumulators: snapshots.map(
      (snapshot) => snapshot.accumulatorSeconds
    ),
    auroraTextureCycleRuntimeLastRendererFrameSerials: snapshots.map(
      (snapshot) => snapshot.lastRendererFrameSerial
    ),
    auroraTextureCycleRuntimeFrameAdvanceCounts: snapshots.map(
      (snapshot) => snapshot.frameAdvanceCount
    )
  };
}

export function writeRuntimeObjectAnimationDataset(runtime: RuntimeState): void {
  const registry = ensureRuntimeObjectAnimationMixerMap(runtime);
  const textureCycleRegistry = ensureRuntimeAuroraTextureCycleMap(runtime);
  const playbacks = Array.from(registry.entries());
  const creatureRuntimeRoots = Array.from(runtime.objectMeshById.entries()).filter(
    ([, root]) => root.userData?.objectKind === "creatures"
  );
  runtime.container.dataset.objectAnimationMixerCount = String(registry.size);
  runtime.container.dataset.auroraTextureCycleRuntimeObjectCount = String(
    textureCycleRegistry.size
  );
  runtime.container.dataset.auroraTextureCycleRuntimeObjectIds = Array.from(
    textureCycleRegistry.keys()
  ).join("|");
  runtime.container.dataset.auroraTextureCycleRuntimeReferences = Array.from(
    new Set(
      Array.from(textureCycleRegistry.values()).flatMap(
        (entry) => entry.runtime.references
      )
    )
  )
    .sort((left, right) => left.localeCompare(right))
    .join("|");
  runtime.container.dataset.objectAnimationMixerActionNames = playbacks
    .flatMap(([, entry]) => entry.actionNames)
    .join("|");
  const creaturePlaybacks = playbacks.filter(
    ([, entry]) => entry.root.userData?.objectKind === "creatures"
  );
  const creatureCount = creaturePlaybacks.length;
  runtime.container.dataset.creatureAnimationMixerCount = String(creatureCount);
  runtime.container.dataset.creatureAnimationRuntimeObjectIds = creatureRuntimeRoots
    .map(([objectId]) => objectId)
    .join("|");
  runtime.container.dataset.creatureAnimationRuntimePlaybackStatuses = creatureRuntimeRoots
    .map(([, root]) =>
      typeof root.userData?.creatureAnimationPlaybackStatus === "string"
        ? root.userData.creatureAnimationPlaybackStatus
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationRuntimeAvailableClipCounts = creatureRuntimeRoots
    .map(([, root]) =>
      typeof root.userData?.creatureAnimationAvailableClipCount === "number"
        ? String(root.userData.creatureAnimationAvailableClipCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationRuntimeAvailableClipNames =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationAvailableClipNames)
          ? root.userData.creatureAnimationAvailableClipNames.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipNames =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipNames)
          ? root.userData.creatureAnimationSelectedClipNames.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipTrackCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipTrackCounts)
          ? root.userData.creatureAnimationSelectedClipTrackCounts.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipTargetCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipTargetCounts)
          ? root.userData.creatureAnimationSelectedClipTargetCounts.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimePlayableClipTrackCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationPlayableClipTrackCounts)
          ? root.userData.creatureAnimationPlayableClipTrackCounts.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimePlayableClipTargetCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationPlayableClipTargetCounts)
          ? root.userData.creatureAnimationPlayableClipTargetCounts.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningMeshNames =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningMeshNames)
          ? root.userData.creatureSourceSkinningMeshNames.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningBindPoseSources =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningBindPoseSourcesByMesh)
          ? root.userData.creatureSourceSkinningBindPoseSourcesByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningMeshBindPoseSources =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningMeshBindPoseSourcesByMesh)
          ? root.userData.creatureSourceSkinningMeshBindPoseSourcesByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningBoneBindingCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningBoneBindingCountsByMesh)
          ? root.userData.creatureSourceSkinningBoneBindingCountsByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningRuntimeBounds =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningRuntimeBoundsByMesh)
          ? root.userData.creatureSourceSkinningRuntimeBoundsByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningRuntimeCenters =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningRuntimeCentersByMesh)
          ? root.userData.creatureSourceSkinningRuntimeCentersByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningRuntimeSizes =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningRuntimeSizesByMesh)
          ? root.userData.creatureSourceSkinningRuntimeSizesByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSourceSkinningRuntimeVertexSignatures =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureSourceSkinningRuntimeVertexSignaturesByMesh)
          ? root.userData.creatureSourceSkinningRuntimeVertexSignaturesByMesh.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipBasePoseNames =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipBasePoseNames)
          ? root.userData.creatureAnimationSelectedClipBasePoseNames.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipBasePoseSkippedReasons =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipBasePoseSkippedReasons)
          ? root.userData.creatureAnimationSelectedClipBasePoseSkippedReasons.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeSelectedClipBasePoseCandidateNames =
    creatureRuntimeRoots
      .map(([, root]) =>
        Array.isArray(root.userData?.creatureAnimationSelectedClipBasePoseCandidateNames)
          ? root.userData.creatureAnimationSelectedClipBasePoseCandidateNames.join(",")
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeLoadedModelAnimationCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureRenderLoadedModelAnimationCount === "number"
          ? String(root.userData.creatureRenderLoadedModelAnimationCount)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeLoadedModelSourceClipCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureRenderLoadedModelSourceAnimationClipCount === "number"
          ? String(root.userData.creatureRenderLoadedModelSourceAnimationClipCount)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeStateMappingStatuses =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureAnimationStateMappingStatus === "string"
          ? root.userData.creatureAnimationStateMappingStatus
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeStates =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureAnimationState === "number"
          ? String(root.userData.creatureAnimationState)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeDirectSupermodelStatuses =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureRenderDirectSupermodelLoadStatus === "string"
          ? root.userData.creatureRenderDirectSupermodelLoadStatus
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationRuntimeDirectSupermodelClipCounts =
    creatureRuntimeRoots
      .map(([, root]) =>
        typeof root.userData?.creatureRenderDirectSupermodelClipCount === "number"
          ? String(root.userData.creatureRenderDirectSupermodelClipCount)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerObjectIds = creaturePlaybacks
    .map(([objectId]) => objectId)
    .join("|");
  runtime.container.dataset.creatureAnimationMixerActionNames = creaturePlaybacks
    .flatMap(([, entry]) => entry.actionNames)
    .join("|");
  runtime.container.dataset.creatureAnimationMixerPlaybackStatuses = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackStatus === "string"
        ? entry.root.userData.creatureAnimationPlaybackStatus
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerPlaybackRootModes = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackRootMode === "string"
        ? entry.root.userData.creatureAnimationPlaybackRootMode
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerPlaybackRootNames = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackRootName === "string"
        ? entry.root.userData.creatureAnimationPlaybackRootName
        : entry.root.name
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerInitialPoseApplied = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackInitialPoseApplied === "boolean"
        ? String(entry.root.userData.creatureAnimationPlaybackInitialPoseApplied)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerAnimRunModes = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackAnimRunMode === "string"
        ? entry.root.userData.creatureAnimationPlaybackAnimRunMode
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerLoopModes = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackLoopModes)
        ? entry.root.userData.creatureAnimationPlaybackLoopModes.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerTransitionSeconds = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackTransitionSeconds)
        ? entry.root.userData.creatureAnimationPlaybackTransitionSeconds.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerRunStates = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackRunStates)
        ? entry.root.userData.creatureAnimationPlaybackRunStates.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerRunPriorities = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackRunPriorities)
        ? entry.root.userData.creatureAnimationPlaybackRunPriorities.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerRunBlendPhases = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackRunBlendPhases)
        ? entry.root.userData.creatureAnimationPlaybackRunBlendPhases.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerRunBlendWeights = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackRunBlendWeights)
        ? entry.root.userData.creatureAnimationPlaybackRunBlendWeights.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerTimeScales = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackTimeScales)
        ? entry.root.userData.creatureAnimationPlaybackTimeScales.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerActionWeights = creaturePlaybacks
    .map(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackActionWeights)
        ? entry.root.userData.creatureAnimationPlaybackActionWeights.join(",")
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerFollowUpClipNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackFollowUpClipNames)
        ? entry.root.userData.creatureAnimationPlaybackFollowUpClipNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerHandoffClipNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackHandoffClipNames)
        ? entry.root.userData.creatureAnimationPlaybackHandoffClipNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerHandoffTransitionSeconds = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackHandoffTransitionSeconds)
        ? entry.root.userData.creatureAnimationPlaybackHandoffTransitionSeconds
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerEventCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackEventCount === "number"
        ? String(entry.root.userData.creatureAnimationPlaybackEventCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerEventNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackEventNames)
        ? entry.root.userData.creatureAnimationPlaybackEventNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerProcessedEventCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationPlaybackProcessedEventCount === "number"
        ? String(entry.root.userData.creatureAnimationPlaybackProcessedEventCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerProcessedEventNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackProcessedEventNames)
        ? entry.root.userData.creatureAnimationPlaybackProcessedEventNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerCompletedActionNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationPlaybackCompletedActionNames)
        ? entry.root.userData.creatureAnimationPlaybackCompletedActionNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerAvailableClipCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationAvailableClipCount === "number"
        ? String(entry.root.userData.creatureAnimationAvailableClipCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureAnimationSelectedClipNames)
        ? entry.root.userData.creatureAnimationSelectedClipNames
        : []
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipTrackCounts =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationSelectedClipTrackCounts)
          ? entry.root.userData.creatureAnimationSelectedClipTrackCounts
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipTargetCounts =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationSelectedClipTargetCounts)
          ? entry.root.userData.creatureAnimationSelectedClipTargetCounts
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerPlayableClipTrackCounts =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlayableClipTrackCounts)
          ? entry.root.userData.creatureAnimationPlayableClipTrackCounts
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerPlayableClipTargetCounts =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlayableClipTargetCounts)
          ? entry.root.userData.creatureAnimationPlayableClipTargetCounts
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceSkinningMeshNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureSourceSkinningMeshNames)
          ? entry.root.userData.creatureSourceSkinningMeshNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceSkinningBindPoseSources =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureSourceSkinningBindPoseSourcesByMesh)
          ? entry.root.userData.creatureSourceSkinningBindPoseSourcesByMesh
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceSkinningBoneBindingCounts =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureSourceSkinningBoneBindingCountsByMesh)
          ? entry.root.userData.creatureSourceSkinningBoneBindingCountsByMesh
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationSelectedClipBasePoseNames)
          ? entry.root.userData.creatureAnimationSelectedClipBasePoseNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseSkippedReasons =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationSelectedClipBasePoseSkippedReasons)
          ? entry.root.userData.creatureAnimationSelectedClipBasePoseSkippedReasons
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectedClipBasePoseCandidateNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationSelectedClipBasePoseCandidateNames)
          ? entry.root.userData.creatureAnimationSelectedClipBasePoseCandidateNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerCompositeBaseClipNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackCompositeBaseClipNames)
          ? entry.root.userData.creatureAnimationPlaybackCompositeBaseClipNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerCompositeBasePoseSkippedReasons =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackCompositeBasePoseSkippedReasons)
          ? entry.root.userData.creatureAnimationPlaybackCompositeBasePoseSkippedReasons
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerCompositeBasePoseCandidateNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackCompositeBasePoseCandidateNames)
          ? entry.root.userData.creatureAnimationPlaybackCompositeBasePoseCandidateNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRecoveryPoseClipNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackRecoveryPoseClipNames)
          ? entry.root.userData.creatureAnimationPlaybackRecoveryPoseClipNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRecoveryPoseCandidateNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackRecoveryPoseCandidateNames)
          ? entry.root.userData.creatureAnimationPlaybackRecoveryPoseCandidateNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRecoveryPoseFallbacks =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackRecoveryPoseFallbacks)
          ? entry.root.userData.creatureAnimationPlaybackRecoveryPoseFallbacks
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRecoveryPoseFallbackReasons =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackRecoveryPoseFallbackReasons)
          ? entry.root.userData.creatureAnimationPlaybackRecoveryPoseFallbackReasons
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRecoveryPoseSkippedReasons =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(entry.root.userData?.creatureAnimationPlaybackRecoveryPoseSkippedReasons)
          ? entry.root.userData.creatureAnimationPlaybackRecoveryPoseSkippedReasons
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRequestedClipNames = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationRequestedClipName === "string"
        ? entry.root.userData.creatureAnimationRequestedClipName
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerSelectionModes = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationSelectionMode === "string"
        ? entry.root.userData.creatureAnimationSelectionMode
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerStateMappingStatuses =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureAnimationStateMappingStatus === "string"
          ? entry.root.userData.creatureAnimationStateMappingStatus
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerStates = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureAnimationState === "number"
        ? String(entry.root.userData.creatureAnimationState)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackCounts =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureAnimationSuppressedMissingTargetTrackCount ===
        "number"
          ? String(entry.root.userData.creatureAnimationSuppressedMissingTargetTrackCount)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSuppressedMissingTargetTrackNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(
          entry.root.userData?.creatureAnimationSuppressedMissingTargetTrackNames
        )
          ? entry.root.userData.creatureAnimationSuppressedMissingTargetTrackNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyStatuses =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureDirectAutoAnimationSafetyStatus === "string"
          ? entry.root.userData.creatureDirectAutoAnimationSafetyStatus
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerDirectAutoSafetyReasons =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureDirectAutoAnimationSafetyReason === "string"
          ? entry.root.userData.creatureDirectAutoAnimationSafetyReason
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerDirectAutoRetargetedSupermodelClips =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureDirectAutoAnimationRetargetedSupermodelClip ===
        "boolean"
          ? String(entry.root.userData.creatureDirectAutoAnimationRetargetedSupermodelClip)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerDirectAutoGuardFlags =
    creaturePlaybacks
      .map(([, entry]) => {
        const userData = entry.root.userData ?? {};
        return [
          `skin=${typeof userData.creatureDirectAutoAnimationSourceSkinMeshCount === "number" ? userData.creatureDirectAutoAnimationSourceSkinMeshCount : ""}`,
          `sourceSkinMeshTracks=${typeof userData.creatureDirectAutoAnimationSourceSkinMeshTrackCount === "number" ? userData.creatureDirectAutoAnimationSourceSkinMeshTrackCount : ""}`,
          `sourceSkinBoneTracks=${typeof userData.creatureDirectAutoAnimationSourceSkinBoneTrackCount === "number" ? userData.creatureDirectAutoAnimationSourceSkinBoneTrackCount : ""}`,
          `sourceHierarchyReparented=${typeof userData.creatureDirectAutoAnimationSourceHierarchyReparentedNodeCount === "number" ? userData.creatureDirectAutoAnimationSourceHierarchyReparentedNodeCount : ""}`,
          `renderableRebasedGeometryTracks=${typeof userData.creatureDirectAutoAnimationRenderableRebasedGeometryTrackCount === "number" ? userData.creatureDirectAutoAnimationRenderableRebasedGeometryTrackCount : ""}`,
          `sourceSkinInverseBinds=${typeof userData.creatureSourceSkinningInverseBindPoseCount === "number" ? userData.creatureSourceSkinningInverseBindPoseCount : ""}`,
          `suppressed=${typeof userData.creatureDirectAutoAnimationRenderSuppressedMeshCount === "number" ? userData.creatureDirectAutoAnimationRenderSuppressedMeshCount : ""}`,
          `direct=${typeof userData.creatureDirectAutoAnimationDirectModelClipCount === "number" ? userData.creatureDirectAutoAnimationDirectModelClipCount : ""}`,
          `super=${typeof userData.creatureDirectAutoAnimationDirectSupermodelClipCount === "number" ? userData.creatureDirectAutoAnimationDirectSupermodelClipCount : ""}`,
          `companion=${typeof userData.creatureDirectAutoAnimationHasCompanionGeometry === "boolean" ? String(userData.creatureDirectAutoAnimationHasCompanionGeometry) : ""}`,
          `sourceSkinning=${typeof userData.creatureDirectAutoAnimationCanPlaySourceSkinning === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlaySourceSkinning) : ""}`,
          `hybridSourceSkinning=${typeof userData.creatureDirectAutoAnimationCanPlayHybridSourceSkinning === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlayHybridSourceSkinning) : ""}`,
          `sourceSkinningCompanion=${typeof userData.creatureDirectAutoAnimationCanPlaySourceSkinningCompanion === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlaySourceSkinningCompanion) : ""}`,
          `segmented=${typeof userData.creatureDirectAutoAnimationCanPlaySegmented === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlaySegmented) : ""}`,
          `directSource=${typeof userData.creatureDirectAutoAnimationCanPlayDirectSource === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlayDirectSource) : ""}`,
          `declaredSupermodel=${typeof userData.creatureDirectAutoAnimationCanPlayDeclaredDirectSupermodel === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlayDeclaredDirectSupermodel) : ""}`,
          `directSuper=${typeof userData.creatureDirectAutoAnimationCanPlayDirectSupermodel === "boolean" ? String(userData.creatureDirectAutoAnimationCanPlayDirectSupermodel) : ""}`,
          `superOnly=${typeof userData.creatureDirectAutoAnimationUsesOnlyRetargetedSupermodelClip === "boolean" ? String(userData.creatureDirectAutoAnimationUsesOnlyRetargetedSupermodelClip) : ""}`,
          `ownSourceSuperFallback=${typeof userData.creatureDirectAutoAnimationCanUseRetargetedSupermodelWithOwnSourceClips === "boolean" ? String(userData.creatureDirectAutoAnimationCanUseRetargetedSupermodelWithOwnSourceClips) : ""}`,
          `allow=${typeof userData.creatureDirectAutoAnimationAllowRebased === "boolean" ? String(userData.creatureDirectAutoAnimationAllowRebased) : ""}`
        ].join(",");
      })
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRootMotionNeutralized =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureDirectAutoAnimationRootMotionNeutralized ===
        "boolean"
          ? String(entry.root.userData.creatureDirectAutoAnimationRootMotionNeutralized)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedNodeNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(
          entry.root.userData?.creatureDirectAutoAnimationRootMotionNeutralizedNodeNames
        )
          ? entry.root.userData.creatureDirectAutoAnimationRootMotionNeutralizedNodeNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRootMotionNeutralizedModes =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureDirectAutoAnimationRootMotionNeutralizedMode ===
        "string"
          ? entry.root.userData.creatureDirectAutoAnimationRootMotionNeutralizedMode
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerLoadedModelAnimationCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureRenderLoadedModelAnimationCount === "number"
        ? String(entry.root.userData.creatureRenderLoadedModelAnimationCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerLoadedModelSourceClipCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureRenderLoadedModelSourceAnimationClipCount === "number"
        ? String(entry.root.userData.creatureRenderLoadedModelSourceAnimationClipCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceHierarchyReparentedNodeCounts =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData?.creatureRenderLoadedModelSourceHierarchyReparentedNodeCount ===
        "number"
          ? String(entry.root.userData.creatureRenderLoadedModelSourceHierarchyReparentedNodeCount)
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceHierarchyRebasedGeometryCounts =
    creaturePlaybacks
      .map(([, entry]) =>
        typeof entry.root.userData
          .creatureRenderLoadedModelSourceHierarchyRebasedGeometryCount === "number"
          ? String(
              entry.root.userData.creatureRenderLoadedModelSourceHierarchyRebasedGeometryCount
            )
          : ""
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerSourceHierarchyRebasedGeometryNames =
    creaturePlaybacks
      .flatMap(([, entry]) =>
        Array.isArray(
          entry.root.userData?.creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames
        )
          ? entry.root.userData.creatureRenderLoadedModelSourceHierarchyRebasedGeometryNodeNames
          : []
      )
      .join("|");
  runtime.container.dataset.creatureAnimationMixerRenderSuppressedMeshCounts = creaturePlaybacks
    .map(([, entry]) =>
      typeof entry.root.userData?.creatureRenderLoadedModelRenderSuppressedMeshCount === "number"
        ? String(entry.root.userData.creatureRenderLoadedModelRenderSuppressedMeshCount)
        : ""
    )
    .join("|");
  runtime.container.dataset.creatureAnimationMixerRenderSuppressedMeshNames = creaturePlaybacks
    .flatMap(([, entry]) =>
      Array.isArray(entry.root.userData?.creatureRenderLoadedModelRenderSuppressedMeshNames)
        ? entry.root.userData.creatureRenderLoadedModelRenderSuppressedMeshNames
        : []
    )
    .join("|");
}

export function clearRuntimeObjectAnimationPlayback(
  runtime: RuntimeState,
  objectId: string
): void {
  const registry = ensureRuntimeObjectAnimationMixerMap(runtime);
  const current = registry.get(objectId);
  if (!current) {
    return;
  }
  current.mixer.stopAllAction();
  current.mixer.uncacheRoot(current.root);
  registry.delete(objectId);
  writeRuntimeObjectAnimationDataset(runtime);
}

export function clearRuntimeObjectAnimationPlaybacks(runtime: RuntimeState): void {
  const registry = ensureRuntimeObjectAnimationMixerMap(runtime);
  registry.forEach((entry) => {
    entry.mixer.stopAllAction();
    entry.mixer.uncacheRoot(entry.root);
  });
  registry.clear();
  ensureRuntimeAuroraTextureCycleMap(runtime).clear();
  writeRuntimeObjectAnimationDataset(runtime);
}

export function registerRuntimeAuroraTextureCyclePlayback(
  runtime: RuntimeState,
  objectId: string,
  root: THREE.Object3D
): AuroraTextureCycleRuntime | null {
  const textureCycleRuntime = createAuroraTextureCycleRuntime(root);
  const registry = ensureRuntimeAuroraTextureCycleMap(runtime);
  if (!textureCycleRuntime) {
    registry.delete(objectId);
    return null;
  }
  const playback: RuntimeAuroraTextureCyclePlayback = {
    root,
    runtime: textureCycleRuntime
  };
  registry.set(objectId, playback);
  textureCycleRuntime.apply(0, 0);
  writeRuntimeAuroraTextureCyclePlaybackUserData(playback);
  writeRuntimeObjectAnimationDataset(runtime);
  return textureCycleRuntime;
}

export function registerRuntimeObjectAnimationPlayback(
  runtime: RuntimeState,
  objectId: string,
  root: THREE.Object3D,
  clips: readonly THREE.AnimationClip[],
  options: RuntimeObjectAnimationPlaybackOptions = {}
): RuntimeObjectAnimationPlayback | null {
  const playableClips = clips.filter(
    (clip) => clip instanceof THREE.AnimationClip && Number.isFinite(clip.duration)
  );
  const autoplay = options.autoplay ?? true;
  const applyInitialPose = options.applyInitialPose ?? true;
  const priority = resolveRuntimeObjectAnimationRunPriority(options.priority);
  const timeScale = resolveRuntimeObjectAnimationRunTimeScale(options.timeScale);
  clearRuntimeObjectAnimationPlayback(runtime, objectId);
  if (playableClips.length === 0) {
    if (options.afterUpdate) {
      const mixer = new THREE.AnimationMixer(root);
      const playback: RuntimeObjectAnimationPlayback = {
        mixer,
        root,
        clipCount: 0,
        actions: [],
        actionNames: [],
        clipRuns: [],
        followUpRunIndex: null,
        elapsedSeconds: 0,
        autoplay,
        applyInitialPose: true,
        processedEvents: [],
        mirrorUserDataTargets: resolveRuntimeObjectAnimationMirrorTargets(
          root,
          options.mirrorUserDataTargets
        ),
        afterUpdate: options.afterUpdate
      };
      mixer.update(0);
      options.afterUpdate(0, 0, 0, false);
      ensureRuntimeObjectAnimationMixerMap(runtime).set(objectId, playback);
      root.userData = {
        ...root.userData,
        creatureAnimationPlaybackStatus: "runtime-effects",
        creatureAnimationPlaybackMode: "three-runtime-effects",
        creatureAnimationPlaybackClipCount: 0,
        creatureAnimationPlaybackActionNames: []
      };
      writeRuntimeObjectAnimationDataset(runtime);
      return playback;
    }
    root.userData = {
      ...root.userData,
      creatureAnimationPlaybackStatus: "no-clips",
      creatureAnimationPlaybackClipCount: 0,
      creatureAnimationPlaybackActionNames: []
    };
    writeRuntimeObjectAnimationDataset(runtime);
    return null;
  }

  const mixer = new THREE.AnimationMixer(root);
  const actions: THREE.AnimationAction[] = [];
  const actionNames: string[] = [];
  const clipRuns: RuntimeObjectAnimationClipRun[] = [];
  playableClips.forEach((clip, index) => {
    const action = mixer.clipAction(clip);
    actions.push(action);
    const loopMode = resolveRuntimeObjectAnimationLoopMode(clip);
    const transitionSeconds = resolveRuntimeObjectAnimationTransitionSeconds(clip);
    action.reset();
    if (loopMode === "once") {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }
    action.setEffectiveTimeScale(timeScale);
    const blendWeight = autoplay && transitionSeconds > 0 ? 0 : 1;
    action.play();
    action.paused = !autoplay;
    action.setEffectiveWeight(blendWeight);
    const clipName = clip.name || `clip_${index}`;
    actionNames.push(clipName);
    clipRuns.push({
      clipName,
      durationSeconds: Number.isFinite(clip.duration) && clip.duration > 0 ? clip.duration : 0,
      transitionSeconds,
      priority,
      timeScale,
      loopMode,
      events: readRuntimeObjectAnimationEvents(clip),
      currentTimeSeconds: 0,
      lastEventIndex: 0,
      completed: false,
      active: true,
      isFollowUp: false,
      blendWeight,
      blendPhase: blendWeight < 1 ? "fade-in" : "steady",
      handoffStarted: false
    });
  });
  let followUpRunIndex: number | null = null;
  const followUpClip = options.followUpClip;
  if (
    followUpClip instanceof THREE.AnimationClip &&
    Number.isFinite(followUpClip.duration) &&
    !playableClips.some((clip) => clip.uuid === followUpClip.uuid)
  ) {
    const action = mixer.clipAction(followUpClip);
    const loopMode = resolveRuntimeObjectAnimationLoopMode(followUpClip);
    const transitionSeconds = resolveRuntimeObjectAnimationTransitionSeconds(followUpClip);
    const followUpPriority = resolveRuntimeObjectAnimationRunPriority(
      options.followUpPriority ?? priority - 1
    );
    const followUpTimeScale = resolveRuntimeObjectAnimationRunTimeScale(
      options.followUpTimeScale ?? timeScale
    );
    action.reset();
    if (loopMode === "once") {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
    }
    action.enabled = false;
    action.paused = true;
    action.setEffectiveTimeScale(followUpTimeScale);
    action.setEffectiveWeight(0);
    const clipName = followUpClip.name || `clip_${actions.length}`;
    actions.push(action);
    actionNames.push(clipName);
    followUpRunIndex = clipRuns.length;
    clipRuns.push({
      clipName,
      durationSeconds:
        Number.isFinite(followUpClip.duration) && followUpClip.duration > 0
          ? followUpClip.duration
          : 0,
      transitionSeconds,
      priority: followUpPriority,
      timeScale: followUpTimeScale,
      loopMode,
      events: readRuntimeObjectAnimationEvents(followUpClip),
      currentTimeSeconds: 0,
      lastEventIndex: 0,
      completed: false,
      active: false,
      isFollowUp: true,
      blendWeight: 0,
      blendPhase: "queued",
      handoffStarted: false
    });
  }

  const playback: RuntimeObjectAnimationPlayback = {
    mixer,
    root,
    clipCount: playableClips.length,
    actions,
    actionNames,
    clipRuns,
    followUpRunIndex,
    elapsedSeconds: 0,
    autoplay,
    applyInitialPose,
    processedEvents: [],
    mirrorUserDataTargets: resolveRuntimeObjectAnimationMirrorTargets(
      root,
      options.mirrorUserDataTargets
    ),
    ...(options.afterUpdate ? { afterUpdate: options.afterUpdate } : {})
  };
  if (applyInitialPose) {
    mixer.update(0);
    const effectTiming = resolveRuntimeObjectAnimationEffectTiming(playback);
    options.afterUpdate?.(
      0,
      0,
      effectTiming.animationTimeSeconds,
      effectTiming.animationCompleted
    );
  }
  ensureRuntimeObjectAnimationMixerMap(runtime).set(objectId, playback);
  root.userData = {
    ...root.userData,
    creatureAnimationPlaybackStatus: autoplay ? "playing" : "paused",
    creatureAnimationPlaybackMode: "three-animation-mixer",
    creatureAnimationPlaybackClipCount: playableClips.length,
    creatureAnimationPlaybackActionNames: actionNames,
    ...buildRuntimeObjectAnimationRunUserData(playback)
  };
  mirrorRuntimeObjectAnimationRunUserData(playback);
  writeRuntimeObjectAnimationDataset(runtime);
  return playback;
}

export function updateRuntimeObjectAnimationPlaybacks(
  runtime: RuntimeState,
  deltaSeconds: number
): void {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return;
  }
  const registry = ensureRuntimeObjectAnimationMixerMap(runtime);
  const clampedDeltaSeconds = Math.min(deltaSeconds, 0.1);
  runtime.auroraTextureCycleFrameSerial =
    (Number.isFinite(runtime.auroraTextureCycleFrameSerial)
      ? runtime.auroraTextureCycleFrameSerial
      : 0) + 1;
  const rendererFrameSerial = runtime.auroraTextureCycleFrameSerial;
  ensureRuntimeAuroraTextureCycleMap(runtime).forEach((entry) => {
    entry.runtime.apply(deltaSeconds, undefined, rendererFrameSerial);
    writeRuntimeAuroraTextureCyclePlaybackUserData(entry);
  });
  registry.forEach((entry) => {
    if (!entry.autoplay && entry.clipCount > 0) {
      if (entry.applyInitialPose) {
        entry.mixer.update(0);
        const effectTiming = resolveRuntimeObjectAnimationEffectTiming(entry);
        entry.afterUpdate?.(
          0,
          entry.elapsedSeconds,
          effectTiming.animationTimeSeconds,
          effectTiming.animationCompleted,
          rendererFrameSerial,
          deltaSeconds
        );
      }
      return;
    }
    advanceRuntimeObjectAnimationRunBlendWeights(entry, clampedDeltaSeconds);
    entry.mixer.update(clampedDeltaSeconds);
    const nextElapsedSeconds = entry.elapsedSeconds + clampedDeltaSeconds;
    processRuntimeObjectAnimationRunEvents(
      entry,
      clampedDeltaSeconds,
      nextElapsedSeconds
    );
    const effectTiming = resolveRuntimeObjectAnimationEffectTiming(entry);
    entry.afterUpdate?.(
      clampedDeltaSeconds,
      nextElapsedSeconds,
      effectTiming.animationTimeSeconds,
      effectTiming.animationCompleted,
      rendererFrameSerial,
      deltaSeconds
    );
    entry.elapsedSeconds = nextElapsedSeconds;
    entry.root.userData = {
      ...entry.root.userData,
      creatureAnimationPlaybackElapsedSeconds: Number(entry.elapsedSeconds.toFixed(3)),
      ...buildRuntimeObjectAnimationRunUserData(entry)
    };
    mirrorRuntimeObjectAnimationRunUserData(entry);
  });
  runtime.objectLayer.traverse((object) => {
    advanceAuroraVfxCanonicalRuntimePlayback(
      object,
      clampedDeltaSeconds,
      rendererFrameSerial,
      deltaSeconds
    );
  });
  writeRuntimeObjectAnimationDataset(runtime);
}

export interface RuntimeAuroraVfxCanonicalPlaybackState {
  rootCount: number;
  frameCount: number;
  frameIndex: number;
  elapsedSeconds: number;
  durationSeconds: number;
  visibleFrameCount: number;
  visibleDrawMeshCount: number;
  visibleDrawParticleCount: number;
  visibleMappedMaterialCount: number;
  visibleAlphaMappedMaterialCount: number;
  visibleTextureReferences: string[];
  visibleDrawBoundsCenter: number[];
  visibleDrawBoundsSize: number[];
  playbackRootSamples: Array<Record<string, unknown>>;
  visibleDrawMeshSamples: Array<Record<string, unknown>>;
  completed: boolean;
}

export function seekRuntimeAuroraVfxCanonicalPlaybacks(
  runtime: RuntimeState,
  elapsedSeconds: number
): number {
  let soughtRootCount = 0;
  runtime.objectLayer.traverse((object) => {
    if (seekAuroraVfxCanonicalRuntimePlayback(object, elapsedSeconds)) {
      soughtRootCount += 1;
    }
  });
  return soughtRootCount;
}

export function readRuntimeAuroraVfxCanonicalPlaybackState(
  runtime: RuntimeState
): RuntimeAuroraVfxCanonicalPlaybackState {
  let rootCount = 0;
  let frameCount = 0;
  let frameIndex = 0;
  let elapsedSeconds = 0;
  let durationSeconds = 0;
  let visibleFrameCount = 0;
  let visibleDrawMeshCount = 0;
  let visibleDrawParticleCount = 0;
  let visibleMappedMaterialCount = 0;
  let visibleAlphaMappedMaterialCount = 0;
  const visibleTextureReferences = new Set<string>();
  const visibleDrawBounds = new THREE.Box3();
  const playbackRootSamples: Array<Record<string, unknown>> = [];
  const visibleDrawMeshSamples: Array<Record<string, unknown>> = [];
  runtime.camera.updateMatrixWorld(true);
  const cameraFrustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().multiplyMatrices(
      runtime.camera.projectionMatrix,
      runtime.camera.matrixWorldInverse
    )
  );
  let completed = false;
  runtime.objectLayer.traverse((object) => {
    const runtimeFrames = object.children.filter(
      (child) => child.userData.auroraVfxCanonicalRuntimeFrame === true
    );
    if (
      object.userData.auroraVfxCanonicalRuntimePlayback !== true ||
      runtimeFrames.length === 0
    ) {
      return;
    }
    rootCount += 1;
    playbackRootSamples.push({
      name: object.name,
      visible: object.visible,
      parentName: object.parent?.name ?? "",
      runtimeFrameCount: runtimeFrames.length,
      visibleRuntimeFrameCount: runtimeFrames.filter((frame) => frame.visible).length
    });
    frameCount = Math.max(
      frameCount,
      Number(object.userData.auroraVfxCanonicalRuntimePlaybackFrameCount) || 0
    );
    frameIndex = Math.max(
      frameIndex,
      Number(object.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex) || 0
    );
    elapsedSeconds = Math.max(
      elapsedSeconds,
      Number(object.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds) || 0
    );
    durationSeconds = Math.max(
      durationSeconds,
      Number(object.userData.auroraVfxCanonicalRuntimePlaybackDurationSeconds) || 0
    );
    const visibleFrames = runtimeFrames.filter((child) => child.visible);
    visibleFrameCount += visibleFrames.length;
    visibleFrames.forEach((frame) => {
      frame.traverse((node) => {
        if (!(node instanceof THREE.Mesh) || !node.visible) return;
        if (node.userData.auroraVfxCanonicalDrawMesh !== true) return;
        visibleDrawMeshCount += 1;
        visibleDrawParticleCount +=
          Number(node.userData.auroraVfxCanonicalDrawParticleCount) || 0;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const primaryMap = (
          materials[0] as THREE.Material & { map?: THREE.Texture | null }
        )?.map ?? null;
        const textureImage = primaryMap?.image as
          | { width?: unknown; height?: unknown; data?: unknown }
          | undefined;
        const textureImageDataCandidate = textureImage?.data;
        const textureImageData =
          ArrayBuffer.isView(textureImageDataCandidate) &&
          !(textureImageDataCandidate instanceof DataView)
            ? (textureImageDataCandidate as unknown as ArrayLike<number>)
            : null;
        let textureImageChannelMin = Number.POSITIVE_INFINITY;
        let textureImageChannelMax = Number.NEGATIVE_INFINITY;
        const textureImageComponentMin = [
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY,
          Number.POSITIVE_INFINITY
        ];
        const textureImageComponentMax = [
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY,
          Number.NEGATIVE_INFINITY
        ];
        if (textureImageData) {
          for (let index = 0; index < textureImageData.length; index += 1) {
            const value = Number(textureImageData[index]);
            textureImageChannelMin = Math.min(textureImageChannelMin, value);
            textureImageChannelMax = Math.max(textureImageChannelMax, value);
            const component = index % 4;
            textureImageComponentMin[component] = Math.min(
              textureImageComponentMin[component]!,
              value
            );
            textureImageComponentMax[component] = Math.max(
              textureImageComponentMax[component]!,
              value
            );
          }
        }
        materials.forEach((material) => {
          const mappedMaterial = material as THREE.Material & {
            map?: THREE.Texture | null;
            alphaMap?: THREE.Texture | null;
          };
          if (mappedMaterial.map) visibleMappedMaterialCount += 1;
          if (mappedMaterial.alphaMap) visibleAlphaMappedMaterialCount += 1;
        });
        const textureReference = node.userData.auroraVfxCanonicalTextureReference;
        if (typeof textureReference === "string" && textureReference.length > 0) {
          visibleTextureReferences.add(textureReference);
        }
        visibleDrawBounds.expandByObject(node, true);
        node.geometry.computeBoundingSphere();
        node.updateWorldMatrix(true, false);
        const worldSphere = node.geometry.boundingSphere
          ?.clone()
          .applyMatrix4(node.matrixWorld);
        const position = node.geometry.getAttribute("position");
        let firstTriangleFacingDot: number | null = null;
        if (position && position.count >= 3) {
          const first = new THREE.Vector3()
            .fromBufferAttribute(position, 0)
            .applyMatrix4(node.matrixWorld);
          const second = new THREE.Vector3()
            .fromBufferAttribute(position, 1)
            .applyMatrix4(node.matrixWorld);
          const third = new THREE.Vector3()
            .fromBufferAttribute(position, 2)
            .applyMatrix4(node.matrixWorld);
          const frontNormal = new THREE.Vector3()
            .crossVectors(second.clone().sub(first), third.clone().sub(first));
          const triangleCenter = first.clone().add(second).add(third).multiplyScalar(1 / 3);
          const towardCamera = runtime.camera.position.clone().sub(triangleCenter);
          if (frontNormal.lengthSq() > 1e-16 && towardCamera.lengthSq() > 1e-16) {
            firstTriangleFacingDot = frontNormal.normalize().dot(towardCamera.normalize());
          }
        }
        visibleDrawMeshSamples.push({
          name: node.name,
          parentName: node.parent?.name ?? "",
          ancestorChain: buildObjectAncestorChain(node),
          frustumCulled: node.frustumCulled,
          intersectsCameraFrustum: cameraFrustum.intersectsObject(node),
          layersMask: node.layers.mask,
          cameraLayersMask: runtime.camera.layers.mask,
          materialVisible: materials.every((material) => material.visible),
          worldBoundingSphereCenter: worldSphere?.center.toArray() ?? [],
          worldBoundingSphereRadius: worldSphere?.radius ?? 0,
          worldMatrixDeterminant: node.matrixWorld.determinant(),
          parentWorldMatrixDeterminant: node.parent?.matrixWorld.determinant() ?? null,
          parentWorldScale:
            node.parent?.getWorldScale(new THREE.Vector3()).toArray() ?? [],
          textureRepeat: primaryMap?.repeat.toArray() ?? [],
          textureOffset: primaryMap?.offset.toArray() ?? [],
          textureCenter: primaryMap?.center.toArray() ?? [],
          textureRotation: primaryMap?.rotation ?? null,
          textureMatrixAutoUpdate: primaryMap?.matrixAutoUpdate ?? null,
          textureImageWidth: Number(textureImage?.width ?? 0),
          textureImageHeight: Number(textureImage?.height ?? 0),
          textureImageDataLength: textureImageData?.length ?? 0,
          textureImageChannelMin: Number.isFinite(textureImageChannelMin)
            ? textureImageChannelMin
            : null,
          textureImageChannelMax: Number.isFinite(textureImageChannelMax)
            ? textureImageChannelMax
            : null,
          textureImageComponentMin: textureImageComponentMin.map((value) =>
            Number.isFinite(value) ? value : null
          ),
          textureImageComponentMax: textureImageComponentMax.map((value) =>
            Number.isFinite(value) ? value : null
          ),
          textureAtlasTransformOwnership:
            primaryMap?.userData.auroraVfxCanonicalParticleAtlasTransformOwnership ?? "",
          uvRange: {
            uMin: Number(node.geometry.userData.auroraVfxCanonicalUvAttributeUMin ?? 0),
            uMax: Number(node.geometry.userData.auroraVfxCanonicalUvAttributeUMax ?? 0),
            vMin: Number(node.geometry.userData.auroraVfxCanonicalUvAttributeVMin ?? 0),
            vMax: Number(node.geometry.userData.auroraVfxCanonicalUvAttributeVMax ?? 0)
          },
          alphaRange: {
            min: Number(node.geometry.userData.auroraVfxCanonicalAlphaAttributeMin ?? 0),
            max: Number(node.geometry.userData.auroraVfxCanonicalAlphaAttributeMax ?? 0)
          },
          firstTriangleFacingDot,
          effectiveFrontFacingDot:
            firstTriangleFacingDot === null
              ? null
              : firstTriangleFacingDot * Math.sign(node.matrixWorld.determinant()),
          renderOrder: node.renderOrder
        });
      });
    });
    completed =
      completed || object.userData.auroraVfxCanonicalRuntimePlaybackCompleted === true;
  });
  const visibleDrawBoundsCenter = new THREE.Vector3();
  const visibleDrawBoundsSize = new THREE.Vector3();
  if (!visibleDrawBounds.isEmpty()) {
    visibleDrawBounds.getCenter(visibleDrawBoundsCenter);
    visibleDrawBounds.getSize(visibleDrawBoundsSize);
  }
  return {
    rootCount,
    frameCount,
    frameIndex,
    elapsedSeconds,
    durationSeconds,
    visibleFrameCount,
    visibleDrawMeshCount,
    visibleDrawParticleCount,
    visibleMappedMaterialCount,
    visibleAlphaMappedMaterialCount,
    visibleTextureReferences: Array.from(visibleTextureReferences),
    visibleDrawBoundsCenter: visibleDrawBoundsCenter.toArray(),
    visibleDrawBoundsSize: visibleDrawBoundsSize.toArray(),
    playbackRootSamples,
    visibleDrawMeshSamples,
    completed
  };
}

function buildObjectAncestorChain(object: THREE.Object3D): string[] {
  const chain: string[] = [];
  let current: THREE.Object3D | null = object;
  while (current) {
    chain.push(`${current.name || current.type}:visible=${current.visible}`);
    current = current.parent;
  }
  return chain;
}

function advanceRuntimeObjectAnimationRunBlendWeights(
  playback: RuntimeObjectAnimationPlayback,
  deltaSeconds: number
): void {
  playback.clipRuns.forEach((run, index) => {
    const action = playback.actions[index];
    if (!action) {
      return;
    }
    if (run.blendPhase === "fade-in") {
      const increment =
        run.transitionSeconds > 0 ? deltaSeconds / run.transitionSeconds : 1;
      run.blendWeight = Math.min(1, run.blendWeight + increment);
      if (run.blendWeight >= 1) {
        run.blendPhase = "steady";
      }
    } else if (run.blendPhase === "fade-out") {
      // Aurora's AnimRun removes weight at twice the fade-in rate once a run ends.
      const decrement =
        run.transitionSeconds > 0 ? (deltaSeconds * 2) / run.transitionSeconds : 1;
      run.blendWeight = Math.max(0, run.blendWeight - decrement);
      if (run.blendWeight <= 0) {
        run.blendPhase = "completed";
        action.stop();
        action.enabled = false;
        action.paused = true;
      }
    }
    action.setEffectiveWeight(run.blendWeight);
  });
}

export interface RuntimeObjectAnimationTimeSample {
  objectId: string;
  rootName: string;
  clipNames: string[];
  clipRuns: Array<{
    clipName: string;
    currentTimeSeconds: number;
    durationSeconds: number;
    loopMode: RuntimeObjectAnimationClipRun["loopMode"];
    priority: number;
    timeScale: number;
    active: boolean;
    completed: boolean;
  }>;
  requestedTimeSeconds: number;
  elapsedSeconds: number;
  completedActionNames: string[];
}

export function sampleRuntimeObjectAnimationAtTime(
  runtime: RuntimeState,
  timeSeconds: number
): RuntimeObjectAnimationTimeSample[] {
  const registry = ensureRuntimeObjectAnimationMixerMap(runtime);
  const requestedTimeSeconds = Number.isFinite(timeSeconds)
    ? Math.max(0, timeSeconds)
    : 0;
  const samples: RuntimeObjectAnimationTimeSample[] = [];
  registry.forEach((entry, objectId) => {
    entry.clipRuns.forEach((run) => {
      if (!run.active) {
        run.currentTimeSeconds = 0;
        return;
      }
      if (run.durationSeconds <= 0) {
        run.currentTimeSeconds = 0;
        run.completed = false;
        return;
      }
      const scaledTimeSeconds = requestedTimeSeconds * run.timeScale;
      if (run.loopMode === "loop") {
        run.currentTimeSeconds = scaledTimeSeconds % run.durationSeconds;
        run.completed = false;
        return;
      }
      run.currentTimeSeconds = Math.min(scaledTimeSeconds, run.durationSeconds);
      run.completed = scaledTimeSeconds >= run.durationSeconds;
    });
    entry.clipRuns.forEach((run, index) => {
      if (run.completed) {
        startRuntimeObjectAnimationFollowUp(entry, index);
      }
    });
    const primaryRun = entry.clipRuns[0];
    const followUpRun =
      entry.followUpRunIndex === null ? null : entry.clipRuns[entry.followUpRunIndex];
    const primaryRunHandoffStartSeconds =
      primaryRun && primaryRun.timeScale > 0
        ? primaryRun.durationSeconds / primaryRun.timeScale
        : null;
    const primaryRunHandoffElapsedSeconds =
      primaryRunHandoffStartSeconds === null
        ? 0
        : Math.max(0, requestedTimeSeconds - primaryRunHandoffStartSeconds);
    const primaryRunHandoffTransitionSeconds =
      primaryRun?.handoffTransitionSeconds ?? 0;
    const primaryRunHandoffWeight =
      primaryRun?.completed === true &&
      primaryRun.handoffStarted === true &&
      followUpRun?.active === true &&
      primaryRunHandoffTransitionSeconds > 0 &&
      primaryRunHandoffElapsedSeconds < primaryRunHandoffTransitionSeconds / 2
      ? Math.max(
          0,
          1 - (primaryRunHandoffElapsedSeconds * 2) / primaryRunHandoffTransitionSeconds
        )
      : 0;
    if (primaryRun?.completed && followUpRun?.active && followUpRun.durationSeconds > 0) {
      const followUpTimeSeconds = Math.max(
        0,
        requestedTimeSeconds - (primaryRunHandoffStartSeconds ?? requestedTimeSeconds)
      );
      const scaledFollowUpTimeSeconds = followUpTimeSeconds * followUpRun.timeScale;
      followUpRun.currentTimeSeconds =
        followUpRun.loopMode === "loop"
          ? scaledFollowUpTimeSeconds % followUpRun.durationSeconds
          : Math.min(scaledFollowUpTimeSeconds, followUpRun.durationSeconds);
      followUpRun.completed =
        followUpRun.loopMode === "once" &&
        scaledFollowUpTimeSeconds >= followUpRun.durationSeconds;
    }
    if (primaryRun) {
      primaryRun.blendWeight = primaryRun.completed
        ? primaryRunHandoffWeight
        : primaryRun.transitionSeconds > 0
          ? Math.min(1, requestedTimeSeconds / primaryRun.transitionSeconds)
          : 1;
      primaryRun.blendPhase = primaryRun.completed
        ? primaryRun.blendWeight > 0
          ? "fade-out"
          : "completed"
        : primaryRun.blendWeight < 1
          ? "fade-in"
          : "steady";
    }
    if (followUpRun?.active) {
      followUpRun.blendWeight =
        followUpRun.transitionSeconds > 0
          ? Math.min(1, primaryRunHandoffElapsedSeconds / followUpRun.transitionSeconds)
          : 1;
      followUpRun.blendPhase =
        followUpRun.blendWeight < 1 ? "fade-in" : "steady";
    }
    entry.actions.forEach((action, index) => {
      const run = entry.clipRuns[index];
      const isPrimaryHandoffSource = index === 0 && primaryRunHandoffWeight > 0;
      if (!run?.active && !isPrimaryHandoffSource) {
        action.enabled = false;
        action.paused = true;
        action.setEffectiveWeight(0);
        return;
      }
      action.enabled = true;
      action.paused = false;
      action.setEffectiveTimeScale(run.timeScale);
      if (isPrimaryHandoffSource) {
        action.setEffectiveWeight(run.blendWeight);
        action.time = run.durationSeconds;
        return;
      }
      action.setEffectiveWeight(run.blendWeight);
      action.time = run.currentTimeSeconds;
    });
    entry.mixer.update(0);
    const effectTiming = resolveRuntimeObjectAnimationEffectTiming(entry);
    entry.afterUpdate?.(
      0,
      requestedTimeSeconds,
      effectTiming.animationTimeSeconds,
      effectTiming.animationCompleted
    );
    entry.elapsedSeconds = requestedTimeSeconds;
    entry.root.userData = {
      ...entry.root.userData,
      creatureAnimationPlaybackElapsedSeconds: Number(entry.elapsedSeconds.toFixed(3)),
      ...buildRuntimeObjectAnimationRunUserData(entry)
    };
    mirrorRuntimeObjectAnimationRunUserData(entry);
    samples.push({
      objectId,
      rootName: entry.root.name || "",
      clipNames: entry.actionNames,
      clipRuns: entry.clipRuns.map((run) => ({
        clipName: run.clipName,
        currentTimeSeconds: Number(run.currentTimeSeconds.toFixed(3)),
        durationSeconds: Number(run.durationSeconds.toFixed(3)),
        loopMode: run.loopMode,
        priority: run.priority,
        timeScale: Number(run.timeScale.toFixed(3)),
        active: run.active,
        completed: run.completed
      })),
      requestedTimeSeconds: Number(requestedTimeSeconds.toFixed(3)),
      elapsedSeconds: Number(entry.elapsedSeconds.toFixed(3)),
      completedActionNames: entry.clipRuns
        .filter((run) => run.completed)
        .map((run) => run.clipName)
    });
  });
  writeRuntimeObjectAnimationDataset(runtime);
  return samples;
}

function startRuntimeObjectAnimationFollowUp(
  playback: RuntimeObjectAnimationPlayback,
  completedRunIndex: number,
  initialFadeDeltaSeconds = 0
): void {
  const sourceRun = playback.clipRuns[completedRunIndex];
  const followUpRunIndex = playback.followUpRunIndex;
  if (
    !sourceRun ||
    !sourceRun.completed ||
    sourceRun.isFollowUp ||
    sourceRun.handoffStarted ||
    followUpRunIndex === null
  ) {
    return;
  }
  sourceRun.handoffStarted = true;
  const followUpRun = playback.clipRuns[followUpRunIndex];
  const sourceAction = playback.actions[completedRunIndex];
  const followUpAction = playback.actions[followUpRunIndex];
  if (!followUpRun || !sourceAction || !followUpAction || followUpRun.active) {
    return;
  }
  const transitionSeconds = Math.max(0, sourceRun.transitionSeconds);
  followUpRun.active = true;
  followUpRun.blendWeight =
    playback.autoplay && followUpRun.transitionSeconds > 0
      ? Math.min(1, initialFadeDeltaSeconds / followUpRun.transitionSeconds)
      : 1;
  followUpRun.blendPhase = followUpRun.blendWeight < 1 ? "fade-in" : "steady";
  followUpAction.reset();
  followUpAction.enabled = true;
  followUpAction.paused = !playback.autoplay;
  followUpAction.setEffectiveTimeScale(followUpRun.timeScale);
  followUpAction.setEffectiveWeight(followUpRun.blendWeight);
  if (playback.autoplay) {
    followUpAction.play();
  }
  sourceRun.blendPhase = transitionSeconds > 0 ? "fade-out" : "completed";
  sourceRun.blendWeight =
    transitionSeconds > 0
      ? Math.max(
          0,
          sourceAction.getEffectiveWeight() - (initialFadeDeltaSeconds * 2) / transitionSeconds
        )
      : 0;
  if (sourceRun.blendWeight <= 0) {
    sourceRun.blendPhase = "completed";
    sourceAction.stop();
    sourceAction.enabled = false;
  }
  sourceAction.setEffectiveWeight(sourceRun.blendWeight);
  sourceRun.active = false;
  sourceRun.handoffToClipName = followUpRun.clipName;
  sourceRun.handoffTransitionSeconds = transitionSeconds;
}

function processRuntimeObjectAnimationRunEvents(
  playback: RuntimeObjectAnimationPlayback,
  deltaSeconds: number,
  elapsedSeconds: number
): void {
  playback.clipRuns.forEach((run, runIndex) => {
    if (!run.active || run.completed || run.durationSeconds <= 0) {
      return;
    }
    const previousTime = run.currentTimeSeconds;
    let nextTime = previousTime + deltaSeconds * run.timeScale;
    if (run.loopMode === "loop") {
      if (nextTime >= run.durationSeconds) {
        processRuntimeObjectAnimationEventsInRange(
          playback,
          run,
          previousTime,
          run.durationSeconds,
          elapsedSeconds
        );
        nextTime %= run.durationSeconds;
        run.currentTimeSeconds = 0;
        run.lastEventIndex = 0;
        processRuntimeObjectAnimationEventsInRange(
          playback,
          run,
          0,
          nextTime,
          elapsedSeconds
        );
      } else {
        processRuntimeObjectAnimationEventsInRange(
          playback,
          run,
          previousTime,
          nextTime,
          elapsedSeconds
        );
      }
      run.currentTimeSeconds = nextTime;
      return;
    }

    const boundedNextTime = Math.min(nextTime, run.durationSeconds);
    processRuntimeObjectAnimationEventsInRange(
      playback,
      run,
      previousTime,
      boundedNextTime,
      elapsedSeconds
    );
    run.currentTimeSeconds = boundedNextTime;
    if (nextTime >= run.durationSeconds) {
      run.completed = true;
      startRuntimeObjectAnimationFollowUp(playback, runIndex, deltaSeconds);
    }
  });
}

function processRuntimeObjectAnimationEventsInRange(
  playback: RuntimeObjectAnimationPlayback,
  run: RuntimeObjectAnimationClipRun,
  previousTime: number,
  nextTime: number,
  elapsedSeconds: number
): void {
  for (let index = run.lastEventIndex; index < run.events.length; index += 1) {
    const event = run.events[index];
    if (!event) {
      continue;
    }
    if (event.timeSeconds > previousTime && event.timeSeconds <= nextTime) {
      playback.processedEvents.push({
        clipName: run.clipName,
        name: event.name,
        timeSeconds: event.timeSeconds,
        elapsedSeconds: Number(elapsedSeconds.toFixed(3))
      });
      run.lastEventIndex = index + 1;
      continue;
    }
    if (event.timeSeconds > nextTime) {
      break;
    }
  }
}

export function disposeRuntime(runtime: RuntimeState): void {
  if (runtime.frameId !== null) {
    cancelAnimationFrame(runtime.frameId);
  }
  runtime.resizeObserver?.disconnect();
  clearRuntimeObjectAnimationPlaybacks(runtime);

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
  clearPlaceableTextureLoadQueue(runtime);
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
  runtime.auroraRetailBloomPass?.dispose();
  runtime.renderer.dispose();
  runtime.renderer.domElement.remove();
}

export function resizeRuntime(runtime: RuntimeState): void {
  const width = Math.max(1, Math.floor(runtime.container.clientWidth));
  const height = Math.max(1, Math.floor(runtime.container.clientHeight));
  runtime.renderer.setSize(width, height, false);
  runtime.renderer.getDrawingBufferSize(runtimeDrawingBufferSize);
  runtime.auroraRetailBloomPass?.setSize(
    runtimeDrawingBufferSize.x,
    runtimeDrawingBufferSize.y
  );
  runtime.camera.aspect = width / height;
  runtime.camera.updateProjectionMatrix();
}

const runtimeDrawingBufferSize = new THREE.Vector2();

export function renderRuntime(runtime: RuntimeState): void {
  if (runtime.auroraRetailBloomPass) {
    runtime.auroraRetailBloomPass.render(runtime.renderer, runtime.scene, runtime.camera);
    return;
  }
  renderRuntimeWithoutPostprocess(runtime);
}

export function renderRuntimeWithoutPostprocess(runtime: RuntimeState): void {
  updateAuroraVfxCanonicalCameraBillboards(runtime.scene, runtime.camera);
  runtime.renderer.render(runtime.scene, runtime.camera);
}

export function centerCameraForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  options: SceneCameraFramingOptions = {}
): void {
  const objectPreview = options.objectPreview === true;
  const auroraAreaFrame = shouldUseAuroraAreaFrame(sceneData, objectPreview);
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
  setRuntimeCameraFov(runtime, DEFAULT_CAMERA_FOV_DEGREES);
  const distance = resolveSceneFrameDistance(
    runtime,
    sizeX,
    sizeZ,
    span,
    objectPreview,
    vfxObjectPreview,
    auroraAreaFrame
  );

  runtime.controls.minDistance = vfxObjectPreview
    ? 0.5
    : objectPreview
      ? 0.28
      : Math.max(0.55, span * 0.12);
  runtime.controls.maxDistance = resolveSceneFrameMaxDistance(span, distance, {
    objectPreview,
    vfxObjectPreview,
    auroraAreaFrame
  });

  runtime.controls.target.set(centerX, targetHeight, centerY);
  setRuntimeCameraUp(runtime, 0, 1, 0);
  runtime.camera.position
    .copy(runtime.controls.target)
    .addScaledVector(SCENE_FRAME_CAMERA_DIRECTION, distance);
  runtime.camera.near = Math.max(0.05, Math.min(0.25, runtime.controls.minDistance * 0.24));
  runtime.camera.far = Math.max(1000, runtime.controls.maxDistance * 6);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
  writeSceneFrameDataset(runtime, frameBounds, {
    distance,
    mode: "perspective_orbit",
    sizeX,
    sizeZ,
    targetX: centerX,
    targetY: targetHeight,
    targetZ: centerY
  });
  // A repeated Fit Area must use already-loaded GLB bounds immediately; the
  // ready-event path below performs the same refit when models arrive later.
  if (auroraAreaFrame) {
    refitFocusedPerspectiveCameraForVisibleTerrain(runtime);
  }
}

export function centerCameraForRuntimeObjectPreview(runtime: RuntimeState): boolean {
  const visibleBounds = resolveRuntimeVisibleObjectBounds(runtime);
  if (!visibleBounds) {
    return false;
  }
  const bounds = resolveRuntimeObjectPreviewCameraBounds(runtime, visibleBounds);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);
  const sizeX = Math.max(0.4, size.x);
  const sizeY = Math.max(0.4, size.y);
  const sizeZ = Math.max(0.4, size.z);
  const span = Math.max(sizeX, sizeY, sizeZ);
  const aspect =
    runtime.camera.aspect > 0
      ? runtime.camera.aspect
      : Math.max(0.35, runtime.container.clientWidth / Math.max(1, runtime.container.clientHeight));
  const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const verticalDistance = resolvePerspectiveFrameDistance(sizeY, verticalFov);
  const horizontalDistance = resolvePerspectiveFrameDistance(
    Math.max(sizeX, sizeZ),
    horizontalFov
  );
  const distance = Math.max(1.45, verticalDistance, horizontalDistance, span * 1.2) * 1.7;
  const direction = new THREE.Vector3(0.78, 0.82, 0.78).normalize();

  runtime.controls.minDistance = Math.max(0.2, span * 0.12);
  runtime.controls.maxDistance = Math.max(12, span * 8, distance * 6);
  runtime.controls.target.copy(center);
  setRuntimeCameraUp(runtime, 0, 1, 0);
  runtime.camera.position.copy(center.clone().add(direction.multiplyScalar(distance)));
  runtime.camera.near = Math.max(0.05, Math.min(0.25, runtime.controls.minDistance * 0.24));
  runtime.camera.far = Math.max(1000, runtime.controls.maxDistance * 6);
  runtime.camera.updateProjectionMatrix();
  runtime.controls.update();
  writeSceneFrameDataset(
    runtime,
    {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minY: bounds.min.y,
      maxY: bounds.max.y,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
      source: "runtime_object_bounds"
    },
    {
      distance,
      mode: "perspective_orbit",
      sizeX,
      sizeZ,
      targetX: center.x,
      targetY: center.y,
      targetZ: center.z
    }
  );
  runtime.container.dataset.areaCameraFrameRuntimeBounds = `${formatFrameNumber(
    bounds.min.x
  )},${formatFrameNumber(bounds.min.y)},${formatFrameNumber(bounds.min.z)}..${formatFrameNumber(
    bounds.max.x
  )},${formatFrameNumber(bounds.max.y)},${formatFrameNumber(bounds.max.z)}`;
  return true;
}

export function setTopDownOracleCameraForScene(
  runtime: RuntimeState,
  sceneData: AreaScene,
  options: SceneCameraFramingOptions = {}
): void {
  const objectPreview = options.objectPreview === true;
  const frameBounds = resolveSceneFrameBounds(sceneData, objectPreview);
  const centerX = (frameBounds.minX + frameBounds.maxX) / 2;
  const centerZ = (frameBounds.minZ + frameBounds.maxZ) / 2;
  const sizeX = Math.max(0.4, frameBounds.maxX - frameBounds.minX);
  const sizeZ = Math.max(0.4, frameBounds.maxZ - frameBounds.minZ);
  const focusTargetX =
    typeof options.topDownTargetX === "number" && Number.isFinite(options.topDownTargetX)
      ? options.topDownTargetX
      : centerX;
  const focusTargetZ =
    typeof options.topDownTargetZ === "number" && Number.isFinite(options.topDownTargetZ)
      ? options.topDownTargetZ
      : centerZ;
  setRuntimeCameraFov(runtime, TOP_DOWN_ORACLE_CAMERA_FOV_DEGREES);
  const aspect =
    runtime.camera.aspect > 0
      ? runtime.camera.aspect
      : Math.max(0.35, runtime.container.clientWidth / Math.max(1, runtime.container.clientHeight));
  const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const horizontalDistance = resolvePerspectiveFrameDistance(
    sizeX,
    horizontalFov
  );
  const verticalDistance = resolvePerspectiveFrameDistance(
    sizeZ,
    verticalFov
  );
  const targetHeight =
    typeof options.topDownTargetY === "number" && Number.isFinite(options.topDownTargetY)
      ? options.topDownTargetY
      : Math.max(0, Math.min(1.25, frameBounds.minY));
  const defaultDistance = Math.max(
    4.2,
    Math.max(horizontalDistance, verticalDistance) * TOP_DOWN_ORACLE_AREA_FRAME_MARGIN,
    frameBounds.maxY - targetHeight + 1.6
  );
  const distance =
    typeof options.topDownDistance === "number" && Number.isFinite(options.topDownDistance)
      ? Math.max(0.8, options.topDownDistance)
      : defaultDistance;

  runtime.controls.minDistance = Math.max(0.55, Math.max(sizeX, sizeZ) * 0.08);
  runtime.controls.maxDistance = Math.max(512, Math.max(sizeX, sizeZ) * 32, distance * 12);
  runtime.controls.target.set(focusTargetX, targetHeight, focusTargetZ);
  setRuntimeCameraUp(runtime, 0, 0, 1);
  runtime.camera.position.set(focusTargetX, targetHeight + distance, focusTargetZ);
  runtime.camera.lookAt(focusTargetX, targetHeight, focusTargetZ);
  runtime.camera.near = Math.max(0.05, Math.min(0.25, runtime.controls.minDistance * 0.24));
  runtime.camera.far = Math.max(1000, runtime.controls.maxDistance * 6);
  runtime.camera.updateProjectionMatrix();
  writeSceneFrameDataset(runtime, frameBounds, {
    distance,
    mode: "top_down_oracle",
    sizeX,
    sizeZ,
    targetX: focusTargetX,
    targetY: targetHeight,
    targetZ: focusTargetZ
  });
  runtime.controls.update();
  applyTopDownOracleCameraLock(runtime);
}

export function applyTopDownOracleCameraLock(runtime: RuntimeState): boolean {
  if (runtime.container.dataset.areaCameraFrameMode !== "top_down_oracle") {
    return false;
  }
  const target = parseCameraFrameTarget(runtime.container.dataset.areaCameraFrameTarget);
  const distance = parseFiniteNumber(runtime.container.dataset.areaCameraFrameDistance);
  if (!target || distance === null) {
    return false;
  }

  runtime.controls.target.set(target.x, target.y, target.z);
  setRuntimeCameraFov(runtime, TOP_DOWN_ORACLE_CAMERA_FOV_DEGREES);
  setRuntimeCameraUp(runtime, 0, 0, 1);
  runtime.camera.position.set(target.x, target.y + distance, target.z);
  runtime.camera.lookAt(target.x, target.y, target.z);
  runtime.camera.updateMatrixWorld(true);
  writeCameraFramePoseDataset(runtime);
  return true;
}

/**
 * Once source-backed terrain GLBs are loaded, their geometry can extend below
 * or beyond the logical 1x1 tile footprint (pits, bridges and cave entries).
 * The initial camera frame only knows the ARE grid, so reframe from visible
 * terrain bounds to keep an oracle top-down view from clipping those models.
 */
export function refitTopDownOracleCameraForVisibleTerrain(runtime: RuntimeState): boolean {
  if (runtime.container.dataset.areaCameraFrameMode !== "top_down_oracle") {
    return false;
  }
  const terrainBounds = resolveVisibleTerrainBounds(runtime);
  if (!terrainBounds) return false;
  const bounds = terrainBounds.cameraBounds;

  const sizeX = Math.max(0.4, bounds.max.x - bounds.min.x);
  const sizeZ = Math.max(0.4, bounds.max.z - bounds.min.z);
  const targetX = (bounds.min.x + bounds.max.x) / 2;
  const targetZ = (bounds.min.z + bounds.max.z) / 2;
  const previousTarget = parseCameraFrameTarget(runtime.container.dataset.areaCameraFrameTarget);
  const targetY = previousTarget?.y ?? 0;
  setRuntimeCameraFov(runtime, TOP_DOWN_ORACLE_CAMERA_FOV_DEGREES);
  const aspect = runtime.camera.aspect > 0 ? runtime.camera.aspect : 1;
  const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const horizontalDistance = resolvePerspectiveFrameDistance(
    sizeX,
    horizontalFov
  );
  const verticalDistance = resolvePerspectiveFrameDistance(
    sizeZ,
    verticalFov
  );
  const footprintDistance =
    Math.max(horizontalDistance, verticalDistance) * TOP_DOWN_ORACLE_AREA_FRAME_MARGIN;
  const distance = Math.max(
    4.2,
    footprintDistance + Math.max(0, bounds.max.y - targetY)
  );
  runtime.controls.minDistance = Math.max(0.55, Math.max(sizeX, sizeZ) * 0.08);
  runtime.controls.maxDistance = Math.max(512, Math.max(sizeX, sizeZ) * 32, distance * 12);
  runtime.controls.target.set(targetX, targetY, targetZ);
  setRuntimeCameraUp(runtime, 0, 0, 1);
  runtime.camera.position.set(targetX, targetY + distance, targetZ);
  runtime.camera.lookAt(targetX, targetY, targetZ);
  runtime.camera.near = Math.max(0.05, Math.min(0.25, runtime.controls.minDistance * 0.24));
  runtime.camera.far = Math.max(1000, runtime.controls.maxDistance * 6);
  runtime.camera.updateProjectionMatrix();
  writeSceneFrameDataset(
    runtime,
    {
      minX: bounds.min.x,
      maxX: bounds.max.x,
      minY: bounds.min.y,
      maxY: bounds.max.y,
      minZ: bounds.min.z,
      maxZ: bounds.max.z,
      source: "runtime_terrain_bounds"
    },
    {
      distance,
      mode: "top_down_oracle",
      sizeX,
      sizeZ,
      targetX,
      targetY,
      targetZ
    }
  );
  writeVisibleTerrainBoundsPolicyDataset(runtime, terrainBounds);
  runtime.controls.update();
  return true;
}

/**
 * The proof runner can request a deliberately angled view of one newly placed
 * group.  Aurora tile models routinely extend beyond the 1x1 ARE footprint
 * (particularly trees, cave entrances and overhangs), so retaining the
 * requested distance after model loading can clip valid geometry at the
 * viewport edge.  Refit that focused perspective to the full visible terrain
 * sphere while retaining the requested yaw and elevation.
 */
export function refitFocusedPerspectiveCameraForVisibleTerrain(runtime: RuntimeState): boolean {
  const frameMode = runtime.container.dataset.areaCameraFrameMode;
  if (frameMode !== "focused_perspective" && frameMode !== "perspective_orbit") {
    return false;
  }
  const terrainBounds = resolveVisibleTerrainBounds(runtime);
  if (!terrainBounds) return false;
  const bounds = terrainBounds.cameraBounds;

  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const radius = Math.max(0.35, sphere.radius);
  const offset = runtime.camera.position.clone().sub(runtime.controls.target);
  const viewDirection = offset.lengthSq() > 0.000001
    ? offset.normalize()
    : new THREE.Vector3(1, 1, 1).normalize();
  const aspect = runtime.camera.aspect > 0 ? runtime.camera.aspect : 1;
  const verticalFov = THREE.MathUtils.degToRad(runtime.camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const limitingHalfFov = Math.max(THREE.MathUtils.degToRad(2), Math.min(verticalFov, horizontalFov) / 2);
  // The bounding-sphere distance is the minimum distance that guarantees the
  // complete terrain bounds fit at the current aspect ratio. Multiplying it by
  // less than one made wide Areas appear ready while their corners were
  // visibly clipped after Full View resized the canvas (for example a 32x20
  // scv01 Area at aspect ~= 1). Keep a small proof-safe margin for Area
  // framing; focused object captures retain their wider allowance.
  const frameAllowance = frameMode === "perspective_orbit" ? 1.04 : 1.16;
  const distance = Math.max(0.9, (radius / Math.sin(limitingHalfFov)) * frameAllowance);

  runtime.controls.minDistance = Math.max(0.55, radius * 0.12);
  runtime.controls.maxDistance = Math.max(512, radius * 64, distance * 12);
  runtime.controls.target.copy(sphere.center);
  setRuntimeCameraUp(runtime, 0, 1, 0);
  runtime.camera.position.copy(sphere.center).addScaledVector(viewDirection, distance);
  runtime.camera.lookAt(sphere.center);
  runtime.camera.near = Math.max(0.05, Math.min(0.25, distance * 0.04));
  runtime.camera.far = Math.max(1000, distance * 48);
  runtime.camera.updateProjectionMatrix();
  runtime.camera.updateMatrixWorld(true);
  runtime.container.dataset.areaCameraFrameStatus =
    frameMode === "perspective_orbit"
      ? "fit-selected-area-visible-terrain"
      : "focused-perspective-visible-terrain";
  const frameSource = runtime.container.dataset.areaCameraFrameSource ?? "runtime";
  runtime.container.dataset.areaCameraFrameSource = frameSource.includes("+visible-terrain-bounds")
    ? frameSource
    : `${frameSource}+visible-terrain-bounds`;
  runtime.container.dataset.areaCameraFrameTarget = formatFrameVector(sphere.center);
  runtime.container.dataset.areaCameraFrameDistance = distance.toFixed(3);
  runtime.container.dataset.areaCameraFrameAllowance = frameAllowance.toFixed(2);
  runtime.container.dataset.areaCameraFrameSize = `${(bounds.max.x - bounds.min.x).toFixed(3)}x${(bounds.max.z - bounds.min.z).toFixed(3)}`;
  runtime.container.dataset.areaCameraFrameZoomRange = `${runtime.controls.minDistance.toFixed(3)}..${runtime.controls.maxDistance.toFixed(3)}`;
  runtime.container.dataset.areaCameraFrameRuntimeBounds = `${formatFrameVector(bounds.min)}..${formatFrameVector(bounds.max)}`;
  writeCameraFramePoseDataset(runtime);
  writeCameraFrameTerrainBindingDataset(runtime, {
    minX: bounds.min.x,
    maxX: bounds.max.x,
    minY: bounds.min.y,
    maxY: bounds.max.y,
    minZ: bounds.min.z,
    maxZ: bounds.max.z,
    source: "runtime_terrain_bounds"
  });
  writeVisibleTerrainBoundsPolicyDataset(runtime, terrainBounds);
  runtime.controls.update();
  return true;
}

function resolveVisibleTerrainBounds(
  runtime: RuntimeState
): VisibleTerrainBoundsResolution | null {
  runtime.container.dataset.areaCameraFrameBoundsPolicy =
    AREA_CAMERA_BOUNDS_POLICY;
  const footprintLayer = runtime.scene.getObjectByName(
    "terrain-area-extent-footprint"
  );
  if (!footprintLayer) {
    writeMissingTerrainFootprintPolicyDataset(runtime);
    return null;
  }

  const footprintBounds = resolveVisibleLayerBounds(footprintLayer);
  if (!footprintBounds) {
    writeMissingTerrainFootprintPolicyDataset(runtime);
    return null;
  }

  const cameraBounds = footprintBounds.clone();
  const observedBounds = footprintBounds.clone();
  let excludedMeshCount = 0;
  const excludedMeshSample: string[] = [];
  const terrainLayer = runtime.scene.getObjectByName(
    "terrain-backend-tile-models"
  );
  if (terrainLayer) {
    terrainLayer.updateWorldMatrix(true, true);
    terrainLayer.traverse((node) => {
      if (!(node instanceof THREE.Mesh) || !isObjectHierarchyVisible(node, terrainLayer)) {
        return;
      }
      const meshBounds = resolveMeshWorldBounds(node);
      if (!meshBounds) return;
      observedBounds.union(meshBounds);
      if (boundsIntersectInXZ(meshBounds, footprintBounds)) {
        // A connected overhang, bridge, cave mouth or other legitimate Aurora
        // mesh contributes its complete 3D extent once any part of its XZ AABB
        // meets the logical Area footprint.
        cameraBounds.union(meshBounds);
        return;
      }
      excludedMeshCount += 1;
      if (excludedMeshSample.length < AREA_CAMERA_EXCLUDED_MESH_SAMPLE_LIMIT) {
        excludedMeshSample.push(
          `${node.name || "<unnamed>"}:${formatFrameVector(meshBounds.min)}..${formatFrameVector(meshBounds.max)}`
        );
      }
    });
  }

  const cameraSpanX = Math.max(
    AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON,
    cameraBounds.max.x - cameraBounds.min.x
  );
  const cameraSpanZ = Math.max(
    AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON,
    cameraBounds.max.z - cameraBounds.min.z
  );
  const expansionRatio = Math.max(
    (observedBounds.max.x - observedBounds.min.x) / cameraSpanX,
    (observedBounds.max.z - observedBounds.min.z) / cameraSpanZ
  );
  return {
    cameraBounds,
    observedBounds,
    excludedMeshCount,
    excludedMeshSample,
    expansionRatio
  };
}

function resolveVisibleLayerBounds(layer: THREE.Object3D): THREE.Box3 | null {
  const bounds = new THREE.Box3();
  let hasVisibleMesh = false;
  layer.updateWorldMatrix(true, true);
  layer.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || !isObjectHierarchyVisible(node, layer)) {
      return;
    }
    const meshBounds = resolveMeshWorldBounds(node);
    if (!meshBounds) return;
    bounds.union(meshBounds);
    hasVisibleMesh = true;
  });
  return hasVisibleMesh && !bounds.isEmpty() ? bounds : null;
}

function resolveMeshWorldBounds(mesh: THREE.Mesh): THREE.Box3 | null {
  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  if (!mesh.geometry.boundingBox || mesh.geometry.boundingBox.isEmpty()) {
    return null;
  }
  return mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld);
}

function isObjectHierarchyVisible(
  object: THREE.Object3D,
  layer: THREE.Object3D
): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    if (current === layer) return true;
    current = current.parent;
  }
  return false;
}

function boundsIntersectInXZ(
  candidate: THREE.Box3,
  footprint: THREE.Box3
): boolean {
  return (
    candidate.max.x + AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON >= footprint.min.x &&
    candidate.min.x - AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON <= footprint.max.x &&
    candidate.max.z + AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON >= footprint.min.z &&
    candidate.min.z - AREA_CAMERA_BOUNDS_INTERSECTION_EPSILON <= footprint.max.z
  );
}

function writeMissingTerrainFootprintPolicyDataset(runtime: RuntimeState): void {
  runtime.container.dataset.areaCameraFrameBoundsPolicy =
    AREA_CAMERA_BOUNDS_POLICY;
  runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus =
    "logical_footprint_missing";
  runtime.container.dataset.areaCameraFrameExcludedMeshCount = "0";
  runtime.container.dataset.areaCameraFrameExcludedMeshSample = "";
  runtime.container.dataset.areaCameraFrameRuntimeBoundsExpansionRatio = "nan";
  delete runtime.container.dataset.areaCameraFrameObservedTerrainBounds;
  delete runtime.container.dataset.areaCameraFrameCameraTerrainBounds;
}

function writeVisibleTerrainBoundsPolicyDataset(
  runtime: RuntimeState,
  resolution: VisibleTerrainBoundsResolution
): void {
  runtime.container.dataset.areaCameraFrameBoundsPolicy =
    AREA_CAMERA_BOUNDS_POLICY;
  runtime.container.dataset.areaCameraFrameObservedTerrainBounds =
    `${formatFrameVector(resolution.observedBounds.min)}..${formatFrameVector(resolution.observedBounds.max)}`;
  runtime.container.dataset.areaCameraFrameCameraTerrainBounds =
    `${formatFrameVector(resolution.cameraBounds.min)}..${formatFrameVector(resolution.cameraBounds.max)}`;
  runtime.container.dataset.areaCameraFrameExcludedMeshCount =
    String(resolution.excludedMeshCount);
  runtime.container.dataset.areaCameraFrameExcludedMeshSample =
    resolution.excludedMeshSample.join("|");
  runtime.container.dataset.areaCameraFrameRuntimeBoundsExpansionRatio =
    formatFrameNumber(resolution.expansionRatio);
  runtime.container.dataset.areaCameraFrameRuntimeBoundsPolicyStatus =
    resolution.excludedMeshCount > 0
      ? "runtime_bounds_outlier"
      : "within_footprint_connected_bounds";
}

function parseCameraFrameTarget(value: string | undefined): THREE.Vector3 | null {
  if (!value) {
    return null;
  }
  const parts = value.split(",").map((part) => parseFiniteNumber(part));
  if (parts.length !== 3 || parts.some((part) => part === null)) {
    return null;
  }
  return new THREE.Vector3(parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0);
}

function parseFiniteNumber(value: string | undefined): number | null {
  if (value === undefined || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatFrameNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3) : "nan";
}

function formatFrameVector(value: { x: number; y: number; z: number }): string {
  return `${formatFrameNumber(value.x)},${formatFrameNumber(value.y)},${formatFrameNumber(value.z)}`;
}

function writeCameraFramePoseDataset(runtime: RuntimeState): void {
  const direction = runtime.camera.getWorldDirection(new THREE.Vector3());
  runtime.container.dataset.areaCameraFramePosition = formatFrameVector(runtime.camera.position);
  runtime.container.dataset.areaCameraFrameActualTarget = formatFrameVector(runtime.controls.target);
  runtime.container.dataset.areaCameraFrameUp = formatFrameVector(runtime.camera.up);
  runtime.container.dataset.areaCameraFrameDirection = formatFrameVector(direction);
  runtime.container.dataset.areaCameraFrameActualDistance = runtime.camera.position
    .distanceTo(runtime.controls.target)
    .toFixed(3);
  runtime.container.dataset.areaCameraFrameFov = runtime.camera.fov.toFixed(3);
}

function shouldUseAuroraAreaFrame(sceneData: AreaScene, objectPreview: boolean): boolean {
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
      const height = resolveAuroraAreaRenderTileHeight(
        tile.height,
        sceneData.auroraAreaEditing?.definition.defaults?.transition
      );
      expandSceneFrameBounds(bounds, tile.col, height, tile.row);
      expandSceneFrameBounds(bounds, tile.col + 1, height + 0.18, tile.row + 1);
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

function resolveRuntimeVisibleObjectBounds(runtime: RuntimeState): THREE.Box3 | null {
  const bounds = new THREE.Box3();
  let hasBounds = false;
  runtime.objectMeshById.forEach((root) => {
    root.updateWorldMatrix(true, true);
    root.traverse((node) => {
      if (!isVisibleInHierarchy(node) || !(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      if (
        materials.length > 0 &&
        materials.every((material) => material.visible === false || material.opacity <= 0)
      ) {
        return;
      }
      if (node instanceof THREE.InstancedMesh) {
        node.computeBoundingBox();
        const instancedBounds = node.boundingBox;
        if (instancedBounds && !instancedBounds.isEmpty()) {
          bounds.union(instancedBounds.clone().applyMatrix4(node.matrixWorld));
          hasBounds = true;
          return;
        }
      }
      const geometry = node.geometry;
      if (!geometry.attributes.position) {
        return;
      }
      if (!geometry.boundingBox) {
        geometry.computeBoundingBox();
      }
      if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) {
        return;
      }
      bounds.union(geometry.boundingBox.clone().applyMatrix4(node.matrixWorld));
      hasBounds = true;
    });
  });
  return hasBounds && !bounds.isEmpty() ? bounds : null;
}

function parseRuntimeObjectPreviewModelBoundsSize(value: string | undefined): THREE.Vector3 | null {
  if (!value) {
    return null;
  }
  const match = value.trim().match(/^([0-9.]+)x([0-9.]+)x([0-9.]+)$/u);
  if (!match) {
    return null;
  }
  const size = new THREE.Vector3(Number(match[1]), Number(match[2]), Number(match[3]));
  return Number.isFinite(size.x) && Number.isFinite(size.y) && Number.isFinite(size.z)
    ? size
    : null;
}

function resolveRuntimeObjectPreviewCameraBounds(
  runtime: RuntimeState,
  bounds: THREE.Box3
): THREE.Box3 {
  const runtimeSize = new THREE.Vector3();
  bounds.getSize(runtimeSize);
  const runtimeSpan = Math.max(runtimeSize.x, runtimeSize.y, runtimeSize.z);
  const modelBoundsSize = parseRuntimeObjectPreviewModelBoundsSize(
    runtime.container.dataset.placeableModelBounds
  );
  if (!modelBoundsSize) {
    return bounds;
  }
  const modelSpan = Math.max(modelBoundsSize.x, modelBoundsSize.y, modelBoundsSize.z);
  if (runtimeSpan >= 0.08 || modelSpan <= Math.max(0.08, runtimeSpan * 4)) {
    return bounds;
  }
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  const fallbackSize = new THREE.Vector3(
    Math.max(runtimeSize.x, modelBoundsSize.x),
    Math.max(runtimeSize.y, modelBoundsSize.y),
    Math.max(runtimeSize.z, modelBoundsSize.z)
  );
  const halfSize = fallbackSize.multiplyScalar(0.5);
  return new THREE.Box3(center.clone().sub(halfSize), center.clone().add(halfSize));
}

function isVisibleInHierarchy(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (!current.visible) {
      return false;
    }
    current = current.parent;
  }
  return true;
}

function resolveSceneFrameDistance(
  runtime: RuntimeState,
  sizeX: number,
  sizeZ: number,
  span: number,
  objectPreview: boolean,
  vfxObjectPreview: boolean,
  auroraAreaFrame: boolean
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
  const horizontalDistance = resolvePerspectiveFrameDistance(
    sizeX,
    horizontalFov
  );
  const verticalDistance = resolvePerspectiveFrameDistance(
    sizeZ,
    verticalFov
  );
  if (auroraAreaFrame) {
    return Math.max(2.6, Math.max(horizontalDistance, verticalDistance) * 1.14, span * 0.62);
  }
  return Math.max(4.2, Math.max(horizontalDistance, verticalDistance) * 2.05, span * 0.9);
}

export function resolveSceneFrameMaxDistance(
  span: number,
  distance: number,
  options: {
    objectPreview: boolean;
    vfxObjectPreview: boolean;
    auroraAreaFrame: boolean;
  }
): number {
  if (options.vfxObjectPreview) {
    return Math.max(18, span * 10);
  }
  if (options.objectPreview) {
    return Math.max(12, span * 8);
  }
  if (options.auroraAreaFrame) {
    return Math.max(512, span * 32, distance * 12);
  }
  return Math.max(48, span * 8);
}

export function evaluateCameraFrameCoverage(
  camera: THREE.PerspectiveCamera,
  bounds: SceneFrameBounds
): CameraFrameCoverage {
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const corners = [
    [bounds.minX, bounds.minY, bounds.minZ],
    [bounds.minX, bounds.minY, bounds.maxZ],
    [bounds.minX, bounds.maxY, bounds.minZ],
    [bounds.minX, bounds.maxY, bounds.maxZ],
    [bounds.maxX, bounds.minY, bounds.minZ],
    [bounds.maxX, bounds.minY, bounds.maxZ],
    [bounds.maxX, bounds.maxY, bounds.minZ],
    [bounds.maxX, bounds.maxY, bounds.maxZ]
  ] as const;
  let clippedCornerCount = 0;
  let minimumNdcMargin = Number.POSITIVE_INFINITY;
  corners.forEach(([x, y, z]) => {
    const projected = new THREE.Vector3(x, y, z).project(camera);
    const cornerMargin = Math.min(
      1 - Math.abs(projected.x),
      1 - Math.abs(projected.y),
      projected.z + 1,
      1 - projected.z
    );
    minimumNdcMargin = Math.min(minimumNdcMargin, cornerMargin);
    if (
      !Number.isFinite(projected.x) ||
      !Number.isFinite(projected.y) ||
      !Number.isFinite(projected.z) ||
      cornerMargin < 0
    ) {
      clippedCornerCount += 1;
    }
  });
  return {
    status: clippedCornerCount === 0 ? "pass" : "failed",
    clippedCornerCount,
    minimumNdcMargin: Number.isFinite(minimumNdcMargin)
      ? minimumNdcMargin
      : Number.NEGATIVE_INFINITY
  };
}

function writeCameraFrameTerrainBindingDataset(
  runtime: RuntimeState,
  bounds: SceneFrameBounds
): void {
  const coverage = evaluateCameraFrameCoverage(runtime.camera, bounds);
  runtime.container.dataset.areaCameraFrameTerrainBuildId =
    runtime.container.dataset.areaTerrainBuildId ?? "terrain-build-missing";
  runtime.container.dataset.areaCameraFrameTileStateDigest =
    runtime.container.dataset.areaTerrainTileStateDigest ??
    "tile-state-digest-missing";
  runtime.container.dataset.areaCameraFrameBoundsDigest = [
    formatFrameNumber(bounds.minX),
    formatFrameNumber(bounds.maxX),
    formatFrameNumber(bounds.minY),
    formatFrameNumber(bounds.maxY),
    formatFrameNumber(bounds.minZ),
    formatFrameNumber(bounds.maxZ),
    bounds.source
  ].join(":");
  runtime.container.dataset.areaCameraFrameCoverageStatus = coverage.status;
  runtime.container.dataset.areaCameraFrameClippedCornerCount = String(
    coverage.clippedCornerCount
  );
  runtime.container.dataset.areaCameraFrameMinimumNdcMargin =
    formatFrameNumber(coverage.minimumNdcMargin);
}

function writeSceneFrameDataset(
  runtime: RuntimeState,
  bounds: SceneFrameBounds,
  frame: {
    distance: number;
    mode: "perspective_orbit" | "top_down_oracle";
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
  writeCameraFramePoseDataset(runtime);
  writeCameraFrameTerrainBindingDataset(runtime, bounds);
}
