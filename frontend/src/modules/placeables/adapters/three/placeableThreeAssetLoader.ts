import * as THREE from "three";
import { recordVfxRuntimeAssetSettlement } from "../../../vfx/application/vfxRuntimeObservability";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { decodeTgaToRgba } from "../../../items/application/itemRawTextureDecoder";
import { ensureAuroraPltPaletteDataLoaded } from "../aurora/auroraPltPalette";
import {
  decodeAuroraPltTexture,
  type AuroraPltPaletteRowsByLayer
} from "../aurora/auroraPltTextureDecoder";
import { decodeAuroraTpcTexture } from "../aurora/auroraTpcTextureDecoder";
import { normalizePlaceableTextureReference } from "../../application/placeableTextureReferences";
import type {
  PlaceableRenderPackageAuroraMaterial,
  PlaceableRenderPackageAuroraTextureSlot,
  PlaceableRenderPackageTextureBinding
} from "../../contracts";
import {
  installAuroraMtrCustomShaderProgram,
  toPlaceableAuroraMtrCustomShaderState
} from "./auroraMtrCustomShaderProgram";
import {
  installAuroraMdlSourceMaterialLighting,
  installAuroraTxiAdditiveDecalRawGammaOutput,
  installAuroraTxiDecalUnlitWhite
} from "../../../shared/adapters/three/auroraMdlSourceMaterialLighting";
import {
  isPlaceableCacheNotFoundEnvelope,
  PLACEABLE_CACHE_NOT_FOUND_CODE,
  resolvePlaceableAssetDeliveryCacheKey
} from "../../domain/placeableCacheMiss";

export const PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR = 1.35;
export const PLACEABLE_AREA_MODEL_AURORA_UNITS_TO_TILE_SPACE = 0.1;
export const PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR = 4;
export const PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG = "auroraSharedPlaceableModelGeometry";
export const PLACEABLE_SHARED_MODEL_MATERIAL_FLAG = "auroraSharedPlaceableModelMaterial";
export const PLACEABLE_NORMALIZED_MODEL_PRESENTATION_METRICS_KEY =
  "auroraPlaceableNormalizedModelPresentationMetrics";
export const PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT = 4;
export const PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT = 2;
export const PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD = 48;
export const PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT = 8;
export const PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT = 8;
export const PLACEABLE_MODEL_LOAD_TIMEOUT_MS = 120_000;
export const PLACEABLE_MODEL_LOAD_PRIORITY_HIGH = "high";
export const PLACEABLE_MODEL_LOAD_PRIORITY_NORMAL = "normal";
export const PLACEABLE_TEXTURE_ANISOTROPY_CAP = 16;
export const PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT = 32;
export const PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH = "high";
export const PLACEABLE_TEXTURE_LOAD_PRIORITY_NORMAL = "normal";
export const PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT =
  "workspace:placeable-model-load-queue-progress";
const PLACEABLE_MODEL_LOAD_RETRY_COUNT = 2;
const PLACEABLE_MODEL_LOAD_RETRY_DELAY_MS = 120;
const PLACEABLE_MODEL_LOAD_RETRY_QUEUE_PRESSURE_DELAY_CAP_MS = 300;
const PLACEABLE_TEXTURE_FETCH_TIMEOUT_MS = 30_000;
const PLACEABLE_TEXTURE_BODY_TIMEOUT_MS = 30_000;
const PLACEABLE_TEXTURE_LOADER_TIMEOUT_MS = 30_000;
const PLACEABLE_TEXTURE_FETCH_DECODE_RETRY_LIMIT = 1;
const PLACEABLE_MISSING_TEXTURE_FALLBACK_SIZE = 4;
const AURORA_DIFFUSE_TEXTURE_SLOT = 0;

let placeableMissingTextureFallback: THREE.Texture | null = null;

export type PlaceableModelLoadPriority =
  | typeof PLACEABLE_MODEL_LOAD_PRIORITY_HIGH
  | typeof PLACEABLE_MODEL_LOAD_PRIORITY_NORMAL;
export type PlaceableTextureLoadPriority =
  | typeof PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH
  | typeof PLACEABLE_TEXTURE_LOAD_PRIORITY_NORMAL;
export type PlaceableModelLoadMode = "auto" | "loader";
export type PlaceableModelSourceHierarchyMode = "apply" | "preserve-loaded";
export type AuroraSupermodelDuplicateTargetMode = "first" | "all-by-uuid";
export type AuroraSupermodelPositionTrackMode = "retarget" | "source";

export interface AuroraSupermodelAnimationBuildOptions {
  suppressRootPositionTracks?: boolean;
  suppressRootDummyPositionTracks?: boolean;
  duplicateTargetMode?: AuroraSupermodelDuplicateTargetMode;
  positionTrackMode?: AuroraSupermodelPositionTrackMode;
}

export interface PlaceableModelNormalizeOptions {
  targetMaxAxisFactor?: number;
  cloneMaterials?: boolean;
  cacheKey?: string | null;
  modelLoadPriority?: PlaceableModelLoadPriority;
  modelLoadMode?: PlaceableModelLoadMode;
  sourceHierarchyMode?: PlaceableModelSourceHierarchyMode;
}

export interface PlaceableNormalizedModelPresentationMetrics {
  readonly meshCount: number;
  readonly boundsEmpty: boolean;
  readonly boundsSize: {
    readonly x: number;
    readonly y: number;
    readonly z: number;
  };
  readonly boundsLabel: string;
}

export interface AuroraSourceSkinningRuntime {
  readonly skinMeshCount: number;
  readonly weightedVertexCount: number;
  readonly inverseBindPoseCount: number;
  readonly meshNames: string[];
  readonly boneBindingCountsByMesh: string[];
  readonly bindPoseSourcesByMesh: string[];
  readonly meshBindPoseSourcesByMesh: string[];
  readonly runtimeBoundsByMesh: string[];
  readonly runtimeCentersByMesh: string[];
  readonly runtimeSizesByMesh: string[];
  readonly runtimeVertexSignaturesByMesh: string[];
  readonly influencingBoneNames: string[];
  readonly missingBoneNames: string[];
  apply: () => void;
}

export interface AuroraSourceHierarchySynthesisResult {
  synthesizedNodeCount: number;
  synthesizedNodeNames: string[];
  reparentedNodeCount: number;
  rebasedGeometryCount: number;
  rebasedGeometryNodeNames: string[];
}

export interface PlaceableTextureLoaderLike {
  load(
    url: string,
    onLoad: (texture: THREE.Texture) => void,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((event: unknown) => void) | undefined
  ): unknown;
}

export interface PlaceableAssetFetchResponse {
  ok?: boolean;
  status?: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob?: () => Promise<Blob>;
  json?: () => Promise<unknown>;
  clone?: () => PlaceableAssetFetchResponse;
}

export type PlaceableTextureFetch = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<PlaceableAssetFetchResponse>;

export type PlaceableModelFetch = (
  input: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal }
) => Promise<PlaceableAssetFetchResponse>;

export const PLACEABLE_ASSET_CACHE_MISS_EVENT = "placeable:asset-cache-miss";

export interface PlaceableAssetCacheMissEventDetail {
  cacheKey: string;
  url: string;
  status: number;
  assetKind: "model" | "texture";
  code: typeof PLACEABLE_CACHE_NOT_FOUND_CODE;
}

export interface PlaceableTextureRuntimeCache {
  placeableTextureLoader: PlaceableTextureLoaderLike;
  placeableDdsTextureLoader: PlaceableTextureLoaderLike;
  placeableTgaTextureLoader: PlaceableTextureLoaderLike;
  placeableTextureFetch?: PlaceableTextureFetch;
  placeableTextureRequestHeader?: Record<string, string>;
  placeableTextureMaxAnisotropy?: number;
  placeableTextureCacheByUrl: Map<string, THREE.Texture>;
  placeableTexturePendingByUrl: Map<string, Promise<THREE.Texture | null>>;
  container?: {
    dataset?: DOMStringMap | Record<string, string | undefined>;
    dispatchEvent?: (event: Event) => boolean;
  };
}

export interface PlaceableTextureLoadOptions {
  priority?: PlaceableTextureLoadPriority;
  label?: string;
  paletteRowsByLayer?: AuroraPltPaletteRowsByLayer;
}

interface PlaceableTextureLoadQueueState {
  activeCount: number;
  peakActiveCount: number;
  peakPendingCount: number;
  activeLabels: string[];
  queue: Array<{
    label: string;
    run: () => void;
  }>;
}

const placeableTextureLoadQueueByRuntime = new WeakMap<
  PlaceableTextureRuntimeCache,
  PlaceableTextureLoadQueueState
>();

export interface PlaceableModelRuntimeCache {
  placeableModelLoader: Pick<GLTFLoader, "load" | "parse">;
  placeableModelFetch?: PlaceableModelFetch;
  placeableModelRequestHeader?: Record<string, string>;
  placeableModelCacheByUrl: Map<string, THREE.Object3D>;
  placeableModelPendingByUrl: Map<string, Promise<THREE.Object3D | null>>;
  placeableNormalizedModelCacheByKey: Map<string, THREE.Object3D>;
  placeableNormalizedModelPendingByKey: Map<string, Promise<THREE.Object3D | null>>;
  placeableModelLoadConcurrencyLimit?: number;
  placeableModelLoadStartsPerFrameLimit?: number;
  placeableModelLoadTimeoutMs?: number;
  container?: {
    dataset?: DOMStringMap | Record<string, string | undefined>;
    dispatchEvent?: (event: Event) => boolean;
  };
}

export interface PlaceableModelLoadQueueProgressDetail {
  status: "loading" | "loaded";
  activeCount: number;
  pendingCount: number;
  loadCompleted: number;
  loadTotal: number;
  concurrencyLimit: number;
  startsPerFrameLimit: number;
  currentLabel: string;
}

export interface PlaceableTextureApplicationOptions {
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null;
  textureBindings?: PlaceableRenderPackageTextureBinding[] | null;
  skipMesh?: (mesh: THREE.Mesh) => boolean;
  allowSingleTextureFallback?: boolean;
}

export interface AuroraModelMaterialTextureApplicationReport {
  resolvedReferences: string[];
  unresolvedReferences: string[];
}

type AuroraMaterialContractNode =
  NonNullable<PlaceableRenderPackageAuroraMaterial>["materials"][number];
type AuroraTextureBindingNode = PlaceableRenderPackageTextureBinding;

interface AuroraTextureCycleState {
  readonly numX: number;
  readonly numY: number;
  readonly fps: number;
  readonly totalFrames: number;
}

interface AuroraTextureCycleBinding {
  readonly texture: THREE.Texture;
  readonly numX: number;
  readonly numY: number;
  readonly fps: number;
  readonly reference: string;
}

interface AuroraTextureCycleTextureState extends AuroraTextureCycleState {
  frameIndex: number;
  accumulatorSeconds: number;
  lastRendererFrameSerial: number | null;
  updateCount: number;
}

export interface AuroraTextureCycleRuntime {
  readonly materialCount: number;
  readonly textureCount: number;
  readonly references: string[];
  apply: (
    deltaSeconds?: number,
    elapsedSeconds?: number,
    rendererFrameSerial?: number
  ) => void;
  snapshots: () => AuroraTextureCycleRuntimeSnapshot[];
}

export interface AuroraTextureCycleRuntimeSnapshot {
  readonly reference: string;
  readonly numX: number;
  readonly numY: number;
  readonly fps: number;
  readonly frameIndex: number;
  readonly accumulatorSeconds: number;
  readonly lastRendererFrameSerial: number | null;
  readonly frameAdvanceCount: number;
  readonly source: string;
}

const AURORA_TEXTURE_CYCLE_RUNTIME_SOURCE =
  "nwtoolset.exe FUN_00a9b478 global-frame guard, strict 1/fps threshold, zeroed residual, modulo frame advance";
const auroraTextureCycleTextureStates = new WeakMap<
  THREE.Texture,
  AuroraTextureCycleTextureState
>();

interface ScheduledPlaceableModelLoad {
  start: () => Promise<THREE.Object3D | null>;
  resolve: (model: THREE.Object3D | null) => void;
  reject: (reason?: unknown) => void;
  currentLabel: string;
  priority: PlaceableModelLoadPriority;
}

interface PlaceableModelLoadQueueState {
  activeCount: number;
  startedThisFrame: number;
  frameResetScheduled: boolean;
  currentLoadTotal: number;
  currentLoadCompleted: number;
  peakConcurrencyLimit: number;
  peakStartsPerFrameLimit: number;
  peakActiveCount: number;
  peakPendingCount: number;
  peakLoadTotal: number;
  bulkModeActivated: boolean;
  activeLabels: string[];
  queue: ScheduledPlaceableModelLoad[];
}

interface PlaceableGltfLike {
  scene?: THREE.Object3D | null;
  animations?: THREE.AnimationClip[];
  parser?: {
    json?: {
      scene?: number;
      scenes?: Array<{
        extras?: unknown;
      }>;
      nodes?: Array<{
        name?: unknown;
        mesh?: unknown;
        extras?: unknown;
      }>;
      meshes?: Array<{
        primitives?: Array<{
          extras?: unknown;
        }>;
      }>;
      extras?: unknown;
    };
  };
}

interface PlaceableGltfAuroraModelMetadata {
  auroraMdlSourceModel?: string;
  auroraMdlSupermodel?: string;
  auroraMdlAnimationScale?: number;
  auroraMdlSourceAnimationCount?: number;
  auroraMdlSourceAnimationNames?: string[];
  auroraMdlSourceHierarchyNodeCount?: number;
  auroraMdlSourceHierarchyRootNodeNames?: string[];
  auroraMdlSourceHierarchyNodeTypes?: string[];
  auroraMdlSourceHierarchyDummyNodeNames?: string[];
  auroraMdlSourceHierarchySynthesizedNodeCount?: number;
  auroraMdlSourceHierarchySynthesizedNodeNames?: string[];
}

interface AuroraGltfSourceHierarchyNode {
  name: string;
  nodeType: string;
  parentName?: string;
  position?: [number, number, number];
  orientation?: [number, number, number, number];
  orientationFormat?: "axis-angle" | "quaternion";
  scale?: number;
}

interface AuroraGltfSourceAnimation {
  name: string;
  targetModel?: string;
  animRoot?: string;
  animationScale?: number;
  transitionTime?: number;
  events: AuroraGltfSourceAnimationEvent[];
  length: number;
  nodes: AuroraGltfSourceAnimationNode[];
  danglymeshOverrides: AuroraGltfSourceAnimationDanglymeshOverride[];
  animmeshUvAnimations: AuroraGltfSourceAnimationAnimmeshUv[];
  animmeshVertexAnimations: AuroraGltfSourceAnimationAnimmeshVertex[];
  alphaAnimations: AuroraGltfSourceAnimationAlpha[];
  selfIllumColorAnimations: AuroraGltfSourceAnimationSelfIllumColor[];
}

interface AuroraGltfSourceAnimationEvent {
  time: number;
  name: string;
}

interface AuroraGltfSourceAnimationNode {
  nodeName: string;
  positionKeys: AuroraGltfVectorKey[];
  orientationKeys: AuroraGltfOrientationKey[];
  scaleKeys: AuroraGltfScalarKey[];
  alphaKeys: AuroraGltfScalarKey[];
  selfIllumColorKeys: AuroraGltfVectorKey[];
  danglyDisplacement?: number;
  danglyPeriod?: number;
  danglyTightness?: number;
  samplePeriod?: number;
  animVerts?: Array<[number, number, number]>;
  animTverts?: Array<[number, number]>;
}

interface AuroraGltfSourceAnimationDanglymeshOverride {
  nodeName: string;
  displacement?: number;
  period?: number;
  tightness?: number;
}

interface AuroraGltfSourceAnimationAnimmeshUv {
  nodeName: string;
  samplePeriod: number;
  animTverts: Array<[number, number]>;
}

interface AuroraGltfSourceAnimationAnimmeshVertex {
  nodeName: string;
  samplePeriod: number;
  animVerts: Array<[number, number, number]>;
}

interface AuroraGltfSourceAnimationAlpha {
  nodeName: string;
  alphaKeys: AuroraGltfScalarKey[];
}

interface AuroraGltfSourceAnimationSelfIllumColor {
  nodeName: string;
  selfIllumColorKeys: AuroraGltfVectorKey[];
}

interface AuroraGltfVectorKey {
  time: number;
  value: [number, number, number];
}

interface AuroraGltfOrientationKey {
  time: number;
  axisAngle: [number, number, number, number];
}

interface AuroraGltfScalarKey {
  time: number;
  value: number;
}

interface AuroraSourceSkinWeightInfluence {
  bone: string;
  boneKey: string;
  weight: number;
}

interface AuroraSourceSkinInverseBindPose {
  bone: string;
  boneKey: string;
  qboneRefInv?: [number, number, number, number];
  tboneRefInv?: [number, number, number];
}

interface AuroraSourceSkinningBoneBindInverse {
  matrix: THREE.Matrix4;
  source:
    | "source-hierarchy"
    | "source-metadata"
    | "source-hierarchy-fallback"
    | "current-pose-fallback"
    | "world-fallback";
}

interface AuroraSourceSkinningMeshBinding {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  positionAttribute: THREE.BufferAttribute;
  bindPositions: Float32Array;
  perVertexWeights: AuroraSourceSkinWeightInfluence[][];
  boneBindInverses: Map<string, AuroraSourceSkinningBoneBindInverse>;
  skinMatricesByBone: Map<string, THREE.Matrix4>;
  meshBindWorld: THREE.Matrix4;
  inverseBindPoseCount: number;
}

interface AuroraSourceDanglymeshRuntime {
  danglyMeshCount: number;
  weightedVertexCount: number;
  nodeNames: string[];
  animationOverrideClipNames: string[];
  animationOverrideNodeNames: string[];
  apply: (deltaSeconds?: number, elapsedSeconds?: number) => void;
}

interface AuroraSourceDanglymeshAnimationOverride {
  displacement?: number;
  period?: number;
  tightness?: number;
}

interface AuroraSourceDanglymeshBinding {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  positionAttribute: THREE.BufferAttribute;
  restPositions: Float32Array;
  constraints: number[];
  displacement: number;
  period: number;
  phase: number;
  weightedVertexCount: number;
  animationOverrides: Map<string, AuroraSourceDanglymeshAnimationOverride>;
}

interface AuroraSourceAnimmeshRuntime {
  animmeshCount: number;
  uvMeshCount: number;
  vertexMeshCount: number;
  nodeNames: string[];
  animationClipNames: string[];
  apply: (deltaSeconds?: number, elapsedSeconds?: number) => void;
}

interface AuroraSourceAnimmeshBinding {
  mesh: THREE.Mesh;
  geometry: THREE.BufferGeometry;
  positionAttribute: THREE.BufferAttribute | null;
  uvAttribute: THREE.BufferAttribute | null;
  restPositions: Float32Array | null;
  restUvs: Float32Array | null;
  sourceVertexCount: number;
  sourceVertexIndices: number[];
  sourceTvertCount: number;
  sourceTvertIndices: number[];
  vertexAnimationsByClipName: Map<string, AuroraGltfSourceAnimationAnimmeshVertex>;
  uvAnimationsByClipName: Map<string, AuroraGltfSourceAnimationAnimmeshUv>;
}

interface AuroraSourceAlphaRuntime {
  alphaMeshCount: number;
  nodeNames: string[];
  animationClipNames: string[];
  apply: (deltaSeconds?: number, elapsedSeconds?: number) => void;
}

interface AuroraSourceAlphaBinding {
  mesh: THREE.Mesh;
  materials: THREE.Material[];
  restOpacity: number[];
  restTransparent: boolean[];
  animationsByClipName: Map<string, AuroraGltfSourceAnimationAlpha>;
}

interface AuroraSourceSelfIllumColorRuntime {
  selfIllumMeshCount: number;
  nodeNames: string[];
  animationClipNames: string[];
  apply: (deltaSeconds?: number, elapsedSeconds?: number) => void;
}

interface AuroraSourceSelfIllumColorMaterial extends THREE.Material {
  emissive?: THREE.Color;
  emissiveIntensity?: number;
}

interface AuroraSourceSelfIllumColorBinding {
  mesh: THREE.Mesh;
  materials: AuroraSourceSelfIllumColorMaterial[];
  restEmissiveColors: THREE.Color[];
  restEmissiveIntensities: number[];
  animationsByClipName: Map<string, AuroraGltfSourceAnimationSelfIllumColor>;
}

const placeableModelLoadQueues = new WeakMap<object, PlaceableModelLoadQueueState>();
const placeableAssetCacheMissKeysByRuntime = new WeakMap<object, Set<string>>();
const AURORA_SOURCE_SKINNING_GEOMETRY_READY_KEY = "auroraSourceSkinningGeometryReady";
const AURORA_SOURCE_SKINNING_BIND_POSITIONS_KEY = "auroraSourceSkinningBindPositions";
const AURORA_SOURCE_DANGLYMESH_GEOMETRY_READY_KEY = "auroraSourceDanglymeshGeometryReady";
const AURORA_SOURCE_ANIMMESH_GEOMETRY_READY_KEY = "auroraSourceAnimmeshGeometryReady";
const AURORA_SOURCE_ALPHA_MATERIAL_READY_KEY = "auroraSourceAlphaMaterialReady";
const AURORA_SOURCE_SELF_ILLUM_MATERIAL_READY_KEY =
  "auroraSourceSelfIllumMaterialReady";
const AURORA_DANGLYMESH_ANIMATION_OVERRIDES_USER_DATA_KEY =
  "auroraDanglymeshAnimationOverrides";
const AURORA_ANIMMESH_UV_ANIMATIONS_USER_DATA_KEY = "auroraAnimmeshUvAnimations";
const AURORA_ANIMMESH_VERTEX_ANIMATIONS_USER_DATA_KEY =
  "auroraAnimmeshVertexAnimations";
const AURORA_ALPHA_ANIMATIONS_USER_DATA_KEY = "auroraAlphaAnimations";
const AURORA_SELF_ILLUM_COLOR_ANIMATIONS_USER_DATA_KEY =
  "auroraSelfIllumColorAnimations";
const AURORA_SUPERMODEL_RETARGETED_CLIP_USER_DATA_KEY =
  "auroraSupermodelRetargeted";
const AURORA_SUPERMODEL_SUPPRESSED_ROOT_POSITION_USER_DATA_KEY =
  "auroraSupermodelSuppressedRootPositionTracks";
const AURORA_SUPERMODEL_POSITION_TRACK_MODE_USER_DATA_KEY =
  "auroraSupermodelPositionTrackMode";

class PlaceableModelLoadQueueCancelledError extends Error {
  constructor() {
    super("Placeable model load queue was cleared.");
    this.name = "PlaceableModelLoadQueueCancelledError";
  }
}

function isPlaceableModelLoadQueueCancelledError(
  error: unknown
): error is PlaceableModelLoadQueueCancelledError {
  return error instanceof PlaceableModelLoadQueueCancelledError;
}

function createPlaceableModelLoadQueueState(): PlaceableModelLoadQueueState {
  return {
    activeCount: 0,
    startedThisFrame: 0,
    frameResetScheduled: false,
    currentLoadTotal: 0,
    currentLoadCompleted: 0,
    peakConcurrencyLimit: 0,
    peakStartsPerFrameLimit: 0,
    peakActiveCount: 0,
    peakPendingCount: 0,
    peakLoadTotal: 0,
    bulkModeActivated: false,
    activeLabels: [],
    queue: []
  };
}

function formatPlaceableModelLoadCurrentLabel(modelUrl: string): string {
  const trimmed = modelUrl.trim();
  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed, "http://aurora.local");
    candidate = parsed.pathname.split("/").filter(Boolean).pop() ?? trimmed;
  } catch {
    candidate =
      trimmed.split("?")[0]?.split("#")[0]?.split(/[\\/]/u).filter(Boolean).pop() ??
      trimmed;
  }
  const decoded = (() => {
    try {
      return decodeURIComponent(candidate);
    } catch {
      return candidate;
    }
  })();
  const compact = decoded.trim() || "model";
  if (compact.length <= 48) {
    return compact;
  }
  return `${compact.slice(0, 20)}...${compact.slice(-20)}`;
}

function writePlaceableModelLoadOutcomeDiagnostics(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  outcome: string,
  details: Record<string, string | number | boolean | null | undefined> = {}
): void {
  const dataset = runtime.container?.dataset;
  if (!dataset) {
    return;
  }
  dataset.placeableModelLoadLastOutcome = outcome;
  dataset.placeableModelLoadLastUrl = formatPlaceableModelLoadCurrentLabel(modelUrl);
  const detailText = Object.entries(details)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join("|");
  dataset.placeableModelLoadLastDetails = detailText || "none";
}

function readPlaceableModelLoadQueueState(
  runtime: PlaceableModelRuntimeCache
): PlaceableModelLoadQueueState {
  const existing = placeableModelLoadQueues.get(runtime);
  if (existing) {
    return existing;
  }
  const created = createPlaceableModelLoadQueueState();
  placeableModelLoadQueues.set(runtime, created);
  return created;
}

function resetPlaceableModelLoadQueueBatchStats(
  state: PlaceableModelLoadQueueState
): void {
  state.currentLoadTotal = 0;
  state.currentLoadCompleted = 0;
  state.startedThisFrame = 0;
  state.peakConcurrencyLimit = 0;
  state.peakStartsPerFrameLimit = 0;
  state.peakActiveCount = 0;
  state.peakPendingCount = 0;
  state.peakLoadTotal = 0;
  state.bulkModeActivated = false;
}

function beginTrackedPlaceableModelLoadRequest(
  runtime: PlaceableModelRuntimeCache
): void {
  const state = readPlaceableModelLoadQueueState(runtime);
  if (state.activeCount === 0 && state.queue.length === 0 && state.currentLoadTotal === 0) {
    resetPlaceableModelLoadQueueBatchStats(state);
  }
  state.currentLoadTotal += 1;
  writePlaceableModelLoadQueueDiagnostics(runtime, state);
}

function completeTrackedPlaceableModelLoadRequest(
  runtime: PlaceableModelRuntimeCache
): void {
  const state = readPlaceableModelLoadQueueState(runtime);
  state.currentLoadCompleted = Math.min(
    state.currentLoadTotal,
    state.currentLoadCompleted + 1
  );
  if (
    state.activeCount === 0 &&
    state.queue.length === 0 &&
    state.currentLoadCompleted >= state.currentLoadTotal
  ) {
    state.currentLoadTotal = 0;
    state.currentLoadCompleted = 0;
  }
  writePlaceableModelLoadQueueDiagnostics(runtime, state);
}

function readPositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || value === undefined) {
    return fallback;
  }
  return Math.max(1, Math.floor(value));
}

function isBulkPlaceableModelLoadQueue(state: PlaceableModelLoadQueueState): boolean {
  return (
    state.currentLoadTotal >= PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD ||
    state.activeCount + state.queue.length >= PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD
  );
}

function resolvePlaceableModelLoadConcurrencyLimit(
  runtime: PlaceableModelRuntimeCache,
  state: PlaceableModelLoadQueueState
): number {
  if (runtime.placeableModelLoadConcurrencyLimit !== undefined) {
    return readPositiveInteger(
      runtime.placeableModelLoadConcurrencyLimit,
      PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT
    );
  }
  return isBulkPlaceableModelLoadQueue(state)
    ? PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT
    : PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT;
}

function resolvePlaceableModelLoadStartsPerFrameLimit(
  runtime: PlaceableModelRuntimeCache,
  state: PlaceableModelLoadQueueState
): number {
  if (runtime.placeableModelLoadStartsPerFrameLimit !== undefined) {
    return readPositiveInteger(
      runtime.placeableModelLoadStartsPerFrameLimit,
      PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT
    );
  }
  return isBulkPlaceableModelLoadQueue(state)
    ? PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT
    : PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT;
}

function schedulePlaceableModelLoadQueueDrain(callback: FrameRequestCallback): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(callback);
    return;
  }
  setTimeout(() => callback(0), 0);
}

function writePlaceableModelLoadQueueDiagnostics(
  runtime: PlaceableModelRuntimeCache,
  state: PlaceableModelLoadQueueState
): void {
  const dataset = runtime.container?.dataset;
  const pendingCount = state.queue.length;
  const isLoading = state.activeCount > 0 || pendingCount > 0;
  const loadTotal = isLoading
    ? Math.max(state.currentLoadTotal, state.activeCount + pendingCount)
    : 0;
  const loadCompleted = isLoading
    ? Math.max(0, Math.min(loadTotal, state.currentLoadCompleted))
    : loadTotal;
  const currentLabel = state.activeLabels[0] ?? state.queue[0]?.currentLabel ?? "";
  const concurrencyLimit = resolvePlaceableModelLoadConcurrencyLimit(runtime, state);
  const startsPerFrameLimit = resolvePlaceableModelLoadStartsPerFrameLimit(runtime, state);
  state.peakConcurrencyLimit = Math.max(state.peakConcurrencyLimit, concurrencyLimit);
  state.peakStartsPerFrameLimit = Math.max(
    state.peakStartsPerFrameLimit,
    startsPerFrameLimit
  );
  state.peakActiveCount = Math.max(state.peakActiveCount, state.activeCount);
  state.peakPendingCount = Math.max(state.peakPendingCount, pendingCount);
  state.peakLoadTotal = Math.max(state.peakLoadTotal, loadTotal);
  state.bulkModeActivated ||= isBulkPlaceableModelLoadQueue(state);
  if (dataset) {
    dataset.placeableModelLoadConcurrencyLimit = String(concurrencyLimit);
    dataset.placeableModelLoadStartsPerFrameLimit = String(startsPerFrameLimit);
    dataset.placeableModelLoadQueueActiveCount = String(state.activeCount);
    dataset.placeableModelLoadQueuePendingCount = String(pendingCount);
    dataset.placeableModelLoadQueueCompletedCount = String(loadCompleted);
    dataset.placeableModelLoadQueueTotalCount = String(loadTotal);
    dataset.placeableModelLoadQueueCurrent = currentLabel;
    dataset.placeableModelLoadPeakConcurrencyLimit = String(state.peakConcurrencyLimit);
    dataset.placeableModelLoadPeakStartsPerFrameLimit = String(
      state.peakStartsPerFrameLimit
    );
    dataset.placeableModelLoadQueuePeakActiveCount = String(state.peakActiveCount);
    dataset.placeableModelLoadQueuePeakPendingCount = String(state.peakPendingCount);
    dataset.placeableModelLoadQueuePeakTotalCount = String(state.peakLoadTotal);
    dataset.placeableModelLoadBulkModeActivated = String(state.bulkModeActivated);
  }
  runtime.container?.dispatchEvent?.(
    new CustomEvent<PlaceableModelLoadQueueProgressDetail>(
      PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT,
      {
        detail: {
          status: isLoading ? "loading" : "loaded",
          activeCount: state.activeCount,
          pendingCount,
          loadCompleted,
          loadTotal,
          concurrencyLimit,
          startsPerFrameLimit,
          currentLabel
        }
      }
    )
  );
}

function schedulePlaceableModelLoadQueueFrameReset(
  runtime: PlaceableModelRuntimeCache,
  state: PlaceableModelLoadQueueState
): void {
  if (state.frameResetScheduled) {
    return;
  }
  state.frameResetScheduled = true;
  schedulePlaceableModelLoadQueueDrain(() => {
    state.startedThisFrame = 0;
    state.frameResetScheduled = false;
    drainPlaceableModelLoadQueue(runtime, state);
  });
}

function drainPlaceableModelLoadQueue(
  runtime: PlaceableModelRuntimeCache,
  state: PlaceableModelLoadQueueState
): void {
  const concurrencyLimit = resolvePlaceableModelLoadConcurrencyLimit(runtime, state);
  const startsPerFrameLimit = resolvePlaceableModelLoadStartsPerFrameLimit(runtime, state);
  while (
    state.queue.length > 0 &&
    state.activeCount < concurrencyLimit
  ) {
    if (state.startedThisFrame >= startsPerFrameLimit) {
      schedulePlaceableModelLoadQueueFrameReset(runtime, state);
      return;
    }
    const entry = state.queue.shift();
    if (!entry) {
      continue;
    }
    state.activeCount += 1;
    state.startedThisFrame += 1;
    state.activeLabels.push(entry.currentLabel);
    writePlaceableModelLoadQueueDiagnostics(runtime, state);
    entry
      .start()
      .then((model) => {
        entry.resolve(model);
      })
      .catch(() => {
        entry.resolve(null);
      })
      .finally(() => {
        state.activeCount = Math.max(0, state.activeCount - 1);
        const activeLabelIndex = state.activeLabels.indexOf(entry.currentLabel);
        if (activeLabelIndex >= 0) {
          state.activeLabels.splice(activeLabelIndex, 1);
        }
        if (
          state.activeCount === 0 &&
          state.queue.length === 0 &&
          state.currentLoadCompleted >= state.currentLoadTotal
        ) {
          state.currentLoadTotal = 0;
          state.currentLoadCompleted = 0;
        }
        writePlaceableModelLoadQueueDiagnostics(runtime, state);
        drainPlaceableModelLoadQueue(runtime, state);
      });
  }
}

function schedulePlaceableModelLoad(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  start: () => Promise<THREE.Object3D | null>,
  options: { priority?: PlaceableModelLoadPriority } = {}
): Promise<THREE.Object3D | null> {
  const state = readPlaceableModelLoadQueueState(runtime);
  if (state.activeCount === 0 && state.queue.length === 0 && state.currentLoadTotal === 0) {
    resetPlaceableModelLoadQueueBatchStats(state);
  }
  const request = new Promise<THREE.Object3D | null>((resolve, reject) => {
    const entry: ScheduledPlaceableModelLoad = {
      start,
      resolve,
      reject,
      currentLabel: formatPlaceableModelLoadCurrentLabel(modelUrl),
      priority: options.priority ?? PLACEABLE_MODEL_LOAD_PRIORITY_NORMAL
    };
    if (entry.priority === PLACEABLE_MODEL_LOAD_PRIORITY_HIGH) {
      const firstNormalIndex = state.queue.findIndex(
        (queuedEntry) => queuedEntry.priority !== PLACEABLE_MODEL_LOAD_PRIORITY_HIGH
      );
      if (firstNormalIndex >= 0) {
        state.queue.splice(firstNormalIndex, 0, entry);
        return;
      }
    }
    state.queue.push(entry);
  });
  writePlaceableModelLoadQueueDiagnostics(runtime, state);
  drainPlaceableModelLoadQueue(runtime, state);
  return request;
}

export function clearPlaceableModelLoadQueue(runtime: PlaceableModelRuntimeCache): void {
  const state = placeableModelLoadQueues.get(runtime);
  if (!state) {
    return;
  }
  state.queue
    .splice(0)
    .forEach((entry) => entry.reject(new PlaceableModelLoadQueueCancelledError()));
  state.currentLoadTotal = state.activeCount;
  state.currentLoadCompleted = 0;
  state.peakConcurrencyLimit = 0;
  state.peakStartsPerFrameLimit = 0;
  state.peakActiveCount = state.activeCount;
  state.peakPendingCount = 0;
  state.peakLoadTotal = state.activeCount;
  state.bulkModeActivated = false;
  state.activeLabels = [];
  state.startedThisFrame = 0;
  state.frameResetScheduled = false;
  writePlaceableModelLoadQueueDiagnostics(runtime, state);
}

function resolvePlaceableTextureExtension(textureUrl: string): string {
  const normalized = textureUrl.trim().toLowerCase();
  try {
    const parsedUrl = new URL(normalized, "http://aurora.local");
    const format = parsedUrl.searchParams.get("format")?.trim().toLowerCase();
    if (format && /^[a-z0-9]+$/u.test(format)) {
      return `.${format}`;
    }
  } catch {
    // Fall through to path-based extension detection for relative or malformed URLs.
  }
  const stripped = normalized.split("?")[0].split("#")[0];
  const index = stripped.lastIndexOf(".");
  return index >= 0 ? stripped.slice(index) : "";
}

function resolvePlaceableTextureLoaderCandidates(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): PlaceableTextureLoaderLike[] {
  const extension = resolvePlaceableTextureExtension(textureUrl);
  if (extension === ".dds") {
    return [runtime.placeableDdsTextureLoader, runtime.placeableTgaTextureLoader];
  }
  if (extension === ".tga") {
    return [runtime.placeableTgaTextureLoader, runtime.placeableDdsTextureLoader];
  }
  return [runtime.placeableTextureLoader];
}

function shouldAttemptAuroraTpcDecode(textureUrl: string): boolean {
  const extension = resolvePlaceableTextureExtension(textureUrl);
  return extension === ".dds" || extension === ".tpc";
}

function shouldAttemptAuroraPltDecode(textureUrl: string): boolean {
  return resolvePlaceableTextureExtension(textureUrl) === ".plt";
}

function shouldAttemptAuroraTgaDecode(textureUrl: string): boolean {
  return resolvePlaceableTextureExtension(textureUrl) === ".tga";
}

function isPowerOfTwo(value: number): boolean {
  return Number.isInteger(value) && value > 0 && (value & (value - 1)) === 0;
}

function textureCanUseMipmaps(texture: THREE.Texture): boolean {
  const compressedTexture = texture as THREE.Texture & {
    isCompressedTexture?: boolean;
    mipmaps?: unknown[];
  };
  if (compressedTexture.isCompressedTexture) {
    return Array.isArray(compressedTexture.mipmaps) && compressedTexture.mipmaps.length > 1;
  }

  const image = texture.image as { width?: unknown; height?: unknown } | undefined;
  return (
    typeof image?.width === "number" &&
    typeof image?.height === "number" &&
    isPowerOfTwo(image.width) &&
    isPowerOfTwo(image.height)
  );
}

function resolveTextureAnisotropy(runtime: PlaceableTextureRuntimeCache): number {
  const requested = runtime.placeableTextureMaxAnisotropy ?? 1;
  return Math.max(1, Math.min(PLACEABLE_TEXTURE_ANISOTROPY_CAP, requested));
}

function configureLoadedPlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  texture: THREE.Texture,
  sourceFormat?: string,
  sourceUrl?: string
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  if (textureCanUseMipmaps(texture)) {
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    if (!((texture as THREE.Texture & { isCompressedTexture?: boolean }).isCompressedTexture)) {
      texture.generateMipmaps = true;
    }
  } else {
    texture.minFilter = THREE.LinearFilter;
  }
  texture.anisotropy = resolveTextureAnisotropy(runtime);
  texture.needsUpdate = true;
  texture.userData = {
    ...texture.userData,
    ...(sourceFormat ? { auroraSourceFormat: sourceFormat } : {}),
    ...(sourceUrl
      ? {
          auroraSourceUrl: sourceUrl,
          auroraTextureReference: normalizePlaceableTextureReference(sourceUrl)
        }
      : {}),
    auroraTextureAnisotropy: texture.anisotropy
  };
  return texture;
}

function configureAuroraGeneratedPltTexture(
  runtime: PlaceableTextureRuntimeCache,
  texture: THREE.Texture
): THREE.Texture {
  texture.colorSpace = THREE.NoColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = resolveTextureAnisotropy(runtime);
  texture.needsUpdate = true;
  texture.userData = {
    ...texture.userData,
    auroraPltGeneratedTargetFormat: "rgba8-linear",
    auroraPltSamplerState: {
      wrapS: "repeat",
      wrapT: "repeat",
      magFilter: "linear",
      minFilter: "linear-mipmap-linear",
      generateMipmaps: true
    }
  };
  return texture;
}

function resolvePlaceableTextureCacheAssetKey(textureUrl: string): string | null {
  const fallbackMatch = textureUrl
    .split(/[?#]/u)[0]
    ?.match(/\/catalog\/placeables\/cache\/[^/]+\/assets\/([^/]+)$/iu);
  try {
    const parsed = new URL(textureUrl, "http://aurora.local");
    const match = parsed.pathname.match(
      /\/catalog\/placeables\/cache\/[^/]+\/assets\/([^/]+)$/iu
    );
    const assetName = match?.[1] ?? fallbackMatch?.[1] ?? "";
    return assetName
      ? `aurora-placeable-texture-asset:${decodeURIComponent(assetName).toLowerCase()}`
      : null;
  } catch {
    const assetName = fallbackMatch?.[1] ?? "";
    return assetName
      ? `aurora-placeable-texture-asset:${decodeURIComponent(assetName).toLowerCase()}`
      : null;
  }
}

function resolvePlaceableTexturePaletteCacheSuffix(
  textureUrl: string,
  options: PlaceableTextureLoadOptions
): string {
  const rows = options.paletteRowsByLayer;
  if (!rows || !shouldAttemptAuroraPltDecode(textureUrl)) {
    return "";
  }
  const rowSignature = Object.entries(rows)
    .filter((entry): entry is [string, number] => {
      const row = entry[1];
      return typeof row === "number" && Number.isFinite(row);
    })
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([layer, row]) => `${layer}:${Math.trunc(row)}`)
    .join(",");
  return rowSignature ? `|plt-rows:${rowSignature}` : "";
}

function resolvePlaceableTextureRuntimeCacheKeys(
  textureUrl: string,
  options: PlaceableTextureLoadOptions = {}
): string[] {
  const assetKey = resolvePlaceableTextureCacheAssetKey(textureUrl);
  const baseKeys = assetKey && assetKey !== textureUrl ? [assetKey, textureUrl] : [textureUrl];
  const paletteSuffix = resolvePlaceableTexturePaletteCacheSuffix(textureUrl, options);
  return paletteSuffix ? baseKeys.map((cacheKey) => `${cacheKey}${paletteSuffix}`) : baseKeys;
}

function readCachedPlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  cacheKeys: readonly string[]
): THREE.Texture | undefined {
  for (const cacheKey of cacheKeys) {
    const texture = runtime.placeableTextureCacheByUrl.get(cacheKey);
    if (texture) {
      return texture;
    }
  }
  return undefined;
}

export function getCachedPlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string,
  options: PlaceableTextureLoadOptions = {}
): THREE.Texture | undefined {
  return readCachedPlaceableTexture(
    runtime,
    resolvePlaceableTextureRuntimeCacheKeys(textureUrl, options)
  );
}

function readPendingPlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  cacheKeys: readonly string[]
): Promise<THREE.Texture | null> | undefined {
  for (const cacheKey of cacheKeys) {
    const request = runtime.placeableTexturePendingByUrl.get(cacheKey);
    if (request) {
      return request;
    }
  }
  return undefined;
}

function writeCachedPlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  cacheKeys: readonly string[],
  texture: THREE.Texture
): void {
  cacheKeys.forEach((cacheKey) => {
    runtime.placeableTextureCacheByUrl.set(cacheKey, texture);
  });
}

function readPlaceableTextureLoadQueueState(
  runtime: PlaceableTextureRuntimeCache
): PlaceableTextureLoadQueueState {
  const existing = placeableTextureLoadQueueByRuntime.get(runtime);
  if (existing) {
    return existing;
  }
  const state: PlaceableTextureLoadQueueState = {
    activeCount: 0,
    peakActiveCount: 0,
    peakPendingCount: 0,
    activeLabels: [],
    queue: []
  };
  placeableTextureLoadQueueByRuntime.set(runtime, state);
  return state;
}

export function clearPlaceableTextureLoadQueue(
  runtime: PlaceableTextureRuntimeCache
): void {
  const state = placeableTextureLoadQueueByRuntime.get(runtime);
  if (!state) {
    return;
  }
  state.activeCount = 0;
  state.peakActiveCount = 0;
  state.peakPendingCount = 0;
  state.activeLabels = [];
  state.queue = [];
  writePlaceableTextureLoadQueueDiagnostics(runtime, state);
}

function writePlaceableTextureLoadQueueDiagnostics(
  runtime: PlaceableTextureRuntimeCache,
  state: PlaceableTextureLoadQueueState
): void {
  const dataset = runtime.container?.dataset;
  if (!dataset) {
    return;
  }
  const pendingCount = state.queue.length;
  state.peakActiveCount = Math.max(state.peakActiveCount, state.activeCount);
  state.peakPendingCount = Math.max(state.peakPendingCount, pendingCount);
  dataset.placeableTextureLoadConcurrencyLimit = String(
    Math.max(1, PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT)
  );
  dataset.placeableTextureLoadQueueActiveCount = String(state.activeCount);
  dataset.placeableTextureLoadQueuePendingCount = String(pendingCount);
  dataset.placeableTextureLoadQueuePeakActiveCount = String(state.peakActiveCount);
  dataset.placeableTextureLoadQueuePeakPendingCount = String(state.peakPendingCount);
  dataset.placeableTextureCacheSize = String(runtime.placeableTextureCacheByUrl.size);
  dataset.placeableTexturePendingCacheSize = String(runtime.placeableTexturePendingByUrl.size);
  dataset.placeableTextureLoadQueueActiveLabels = state.activeLabels.slice(0, 24).join("|");
  dataset.placeableTextureLoadQueuePendingLabels = state.queue
    .slice(0, 24)
    .map((entry) => entry.label)
    .join("|");
}

function resolvePlaceableTextureQueueLabel(textureUrl: string): string {
  try {
    const parsed = new URL(textureUrl, "http://aurora.local");
    return decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() ?? textureUrl)
      .slice(0, 80);
  } catch {
    return textureUrl.slice(0, 80);
  }
}

function schedulePlaceableTextureLoad(
  runtime: PlaceableTextureRuntimeCache,
  loadTexture: () => Promise<THREE.Texture | null>,
  options: PlaceableTextureLoadOptions = {}
): Promise<THREE.Texture | null> {
  const state = readPlaceableTextureLoadQueueState(runtime);
  const limit = Math.max(1, PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT);
  const label = options.label ?? "texture";
  return new Promise<THREE.Texture | null>((resolve) => {
    const run = (): void => {
      state.activeCount += 1;
      state.activeLabels.push(label);
      writePlaceableTextureLoadQueueDiagnostics(runtime, state);
      loadTexture()
        .then(resolve, () => resolve(null))
        .finally(() => {
          state.activeCount = Math.max(0, state.activeCount - 1);
          const labelIndex = state.activeLabels.indexOf(label);
          if (labelIndex >= 0) {
            state.activeLabels.splice(labelIndex, 1);
          }
          const next = state.queue.shift();
          writePlaceableTextureLoadQueueDiagnostics(runtime, state);
          if (next) {
            next.run();
          }
        });
    };
    if (state.activeCount < limit) {
      run();
      return;
    }
    if (options.priority === PLACEABLE_TEXTURE_LOAD_PRIORITY_HIGH) {
      state.queue.unshift({ label, run });
    } else {
      state.queue.push({ label, run });
    }
    writePlaceableTextureLoadQueueDiagnostics(runtime, state);
  });
}

export function getPlaceableMissingTextureFallbackTexture(
  runtime: PlaceableTextureRuntimeCache
): THREE.Texture {
  if (placeableMissingTextureFallback) {
    return placeableMissingTextureFallback;
  }

  const size = PLACEABLE_MISSING_TEXTURE_FALLBACK_SIZE;
  const data = new Uint8Array(size * size * 4);
  const light = [156, 167, 151, 255] as const;
  const dark = [72, 84, 96, 255] as const;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const color = (x + y) % 2 === 0 ? light : dark;
      const offset = (y * size + x) * 4;
      data[offset] = color[0];
      data[offset + 1] = color[1];
      data[offset + 2] = color[2];
      data[offset + 3] = color[3];
    }
  }

  const texture = configureLoadedPlaceableTexture(
    runtime,
    new THREE.DataTexture(data, size, size, THREE.RGBAFormat),
    "missing-texture-fallback"
  );
  texture.name = "Aurora missing placeable texture fallback";
  texture.userData = {
    ...texture.userData,
    auroraMissingTextureFallback: true
  };
  placeableMissingTextureFallback = texture;
  return texture;
}

function isInvalidCompressedPlaceableTexture(texture: THREE.Texture): boolean {
  const compressedTexture = texture as THREE.Texture & {
    isCompressedTexture?: boolean;
    mipmaps?: unknown[];
  };
  if (!compressedTexture.isCompressedTexture) {
    return false;
  }
  const image = compressedTexture.image as { width?: unknown; height?: unknown } | undefined;
  const hasImageDimensions =
    typeof image?.width === "number" &&
    Number.isFinite(image.width) &&
    image.width > 0 &&
    typeof image.height === "number" &&
    Number.isFinite(image.height) &&
    image.height > 0;
  return (
    !hasImageDimensions ||
    !Array.isArray(compressedTexture.mipmaps) ||
    compressedTexture.mipmaps.length === 0
  );
}

function loadPlaceableTextureWithLoader(
  loader: PlaceableTextureLoaderLike,
  textureUrl: string
): Promise<THREE.Texture | null> {
  return new Promise<THREE.Texture | null>((resolve) => {
    let settled = false;
    const timeout = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(null);
    }, PLACEABLE_TEXTURE_LOADER_TIMEOUT_MS);
    const finish = (texture: THREE.Texture | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timeout);
      resolve(texture);
    };
    loader.load(
      textureUrl,
      (texture) => {
        finish(isInvalidCompressedPlaceableTexture(texture) ? null : texture);
      },
      undefined,
      () => {
        finish(null);
      }
    );
  });
}

function hasPlaceableTextureRequestHeaders(runtime: PlaceableTextureRuntimeCache): boolean {
  return Object.keys(runtime.placeableTextureRequestHeader ?? {}).length > 0;
}

function canCreateObjectUrl(): boolean {
  return (
    typeof URL !== "undefined" &&
    typeof URL.createObjectURL === "function" &&
    typeof URL.revokeObjectURL === "function"
  );
}

function readPlaceableCacheMissKeys(runtime: object): Set<string> {
  const existing = placeableAssetCacheMissKeysByRuntime.get(runtime);
  if (existing) {
    return existing;
  }
  const created = new Set<string>();
  placeableAssetCacheMissKeysByRuntime.set(runtime, created);
  return created;
}

function hasPlaceableAssetCacheMiss(runtime: object, assetUrl: string): boolean {
  const cacheKey = resolvePlaceableAssetDeliveryCacheKey(assetUrl);
  return cacheKey ? readPlaceableCacheMissKeys(runtime).has(cacheKey) : false;
}

async function responseHasExactPlaceableCacheMissCode(
  response: PlaceableAssetFetchResponse
): Promise<boolean> {
  if (response.status !== 404) {
    return false;
  }
  try {
    return isPlaceableCacheNotFoundEnvelope(await response.clone?.().json?.());
  } catch {
    return false;
  }
}

async function recordPlaceableAssetCacheMissIfExact(
  runtime: PlaceableTextureRuntimeCache | PlaceableModelRuntimeCache,
  assetUrl: string,
  assetKind: PlaceableAssetCacheMissEventDetail["assetKind"],
  response: PlaceableAssetFetchResponse
): Promise<void> {
  const cacheKey = resolvePlaceableAssetDeliveryCacheKey(assetUrl);
  if (!cacheKey || !(await responseHasExactPlaceableCacheMissCode(response))) {
    return;
  }
  const observedCacheKeys = readPlaceableCacheMissKeys(runtime);
  const alreadyObserved = observedCacheKeys.has(cacheKey);
  observedCacheKeys.add(cacheKey);
  if (!alreadyObserved) {
    runtime.container?.dispatchEvent?.(
      new CustomEvent<PlaceableAssetCacheMissEventDetail>(PLACEABLE_ASSET_CACHE_MISS_EVENT, {
        detail: {
          cacheKey,
          url: assetUrl,
          status: 404,
          assetKind,
          code: PLACEABLE_CACHE_NOT_FOUND_CODE
        }
      })
    );
  }
}

function shouldLoadPlaceableTextureWithFetchedObjectUrl(
  runtime: PlaceableTextureRuntimeCache
): boolean {
  return (
    Boolean(runtime.placeableTextureFetch) &&
    hasPlaceableTextureRequestHeaders(runtime) &&
    canCreateObjectUrl()
  );
}

async function fetchPlaceableTextureWithTimeout(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<Awaited<ReturnType<PlaceableTextureFetch>> | null> {
  if (!runtime.placeableTextureFetch) {
    return null;
  }

  const abortController =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timeout = globalThis.setTimeout(() => {
        abortController?.abort();
        resolve(null);
      }, PLACEABLE_TEXTURE_FETCH_TIMEOUT_MS);
    });
    const responsePromise = runtime.placeableTextureFetch(textureUrl, {
      headers: runtime.placeableTextureRequestHeader ?? {},
      ...(abortController ? { signal: abortController.signal } : {})
    });
    const response = await Promise.race([responsePromise, timeoutPromise]);
    if (response) {
      await recordPlaceableAssetCacheMissIfExact(runtime, textureUrl, "texture", response);
    }
    return response;
  } catch {
    return null;
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

async function readPlaceableTextureBodyWithTimeout<T>(
  readBody: () => Promise<T>
): Promise<T | null> {
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timeout = globalThis.setTimeout(() => {
        resolve(null);
      }, PLACEABLE_TEXTURE_BODY_TIMEOUT_MS);
    });
    return await Promise.race([readBody(), timeoutPromise]);
  } catch {
    return null;
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

function readPlaceableTextureArrayBufferWithTimeout(
  response: Awaited<ReturnType<PlaceableTextureFetch>>
): Promise<ArrayBuffer | null> {
  return readPlaceableTextureBodyWithTimeout(() => response.arrayBuffer());
}

async function readPlaceableTextureBlobWithTimeout(
  response: Awaited<ReturnType<PlaceableTextureFetch>>
): Promise<Blob | null> {
  if (typeof response.blob === "function") {
    return readPlaceableTextureBodyWithTimeout(() => response.blob?.() ?? Promise.resolve(null));
  }
  const buffer = await readPlaceableTextureArrayBufferWithTimeout(response);
  return buffer ? new Blob([buffer]) : null;
}

async function fetchPlaceableTextureBlob(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<Blob | null> {
  try {
    const response = await fetchPlaceableTextureWithTimeout(runtime, textureUrl);
    if (!response || response.ok === false) {
      return null;
    }
    return readPlaceableTextureBlobWithTimeout(response);
  } catch {
    return null;
  }
}

async function loadPlaceableTextureWithFetchedObjectUrl(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<THREE.Texture | null> {
  if (!shouldLoadPlaceableTextureWithFetchedObjectUrl(runtime)) {
    return null;
  }

  const textureBlob = await fetchPlaceableTextureBlob(runtime, textureUrl);
  if (!textureBlob) {
    return null;
  }

  const objectUrl = URL.createObjectURL(textureBlob);
  try {
    for (const loader of resolvePlaceableTextureLoaderCandidates(runtime, textureUrl)) {
      const texture = await loadPlaceableTextureWithLoader(loader, objectUrl);
      if (!texture) {
        continue;
      }
      texture.userData = {
        ...texture.userData,
        auroraSourceUrl: textureUrl,
        auroraFetchedViaAuthorizedBlob: true
      };
      return texture;
    }
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadAuroraTpcTextureWithFetch(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<THREE.Texture | null> {
  if (!runtime.placeableTextureFetch || !shouldAttemptAuroraTpcDecode(textureUrl)) {
    return null;
  }

  try {
    const response = await fetchPlaceableTextureWithTimeout(runtime, textureUrl);
    if (!response || response.ok === false) {
      return null;
    }
    const buffer = await readPlaceableTextureArrayBufferWithTimeout(response);
    if (!buffer) {
      return null;
    }
    const decodedTexture = decodeAuroraTpcTexture(buffer);
    if (!decodedTexture) {
      return null;
    }
    const textureData =
      decodedTexture.sourceFormat.startsWith("tpc-") ||
      decodedTexture.sourceFormat.startsWith("dds-")
        ? flipPlaceableTextureRows(
            decodedTexture.data,
            decodedTexture.width,
            decodedTexture.height
          )
        : decodedTexture.data;
    const texture = configureLoadedPlaceableTexture(
      runtime,
      new THREE.DataTexture(
        textureData,
        decodedTexture.width,
        decodedTexture.height,
        THREE.RGBAFormat
      ),
      decodedTexture.sourceFormat,
      textureUrl
    );
    if (decodedTexture.isNormalMap) {
      texture.colorSpace = THREE.LinearSRGBColorSpace;
      texture.needsUpdate = true;
    }
    texture.userData = {
      ...texture.userData,
      hasAlpha: decodedTexture.hasAlpha,
      isBimodal: decodedTexture.isBimodal,
      auroraTextureHasAlpha: decodedTexture.hasAlpha,
      auroraTextureIsBimodal: decodedTexture.isBimodal,
      auroraTextureSoftAlphaPixelRatio: decodedTexture.softAlphaPixelRatio,
      auroraTextureIsNormalMap: decodedTexture.isNormalMap
    };
    return texture;
  } catch {
    return null;
  }
}

export function flipPlaceableTextureRows(
  data: Uint8Array,
  width: number,
  height: number
): Uint8Array {
  const rowByteLength = width * 4;
  const flippedData = new Uint8Array(data.length);
  for (let row = 0; row < height; row += 1) {
    const sourceOffset = row * rowByteLength;
    const targetOffset = (height - 1 - row) * rowByteLength;
    flippedData.set(data.subarray(sourceOffset, sourceOffset + rowByteLength), targetOffset);
  }
  return flippedData;
}

async function loadAuroraPltTextureWithFetch(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string,
  options: PlaceableTextureLoadOptions = {}
): Promise<THREE.Texture | null> {
  if (!runtime.placeableTextureFetch || !shouldAttemptAuroraPltDecode(textureUrl)) {
    return null;
  }

  try {
    if (options.paletteRowsByLayer) {
      await ensureAuroraPltPaletteDataLoaded();
    }
    const response = await fetchPlaceableTextureWithTimeout(runtime, textureUrl);
    if (!response || response.ok === false) {
      return null;
    }
    const buffer = await readPlaceableTextureArrayBufferWithTimeout(response);
    if (!buffer) {
      return null;
    }
    const decodedTexture = decodeAuroraPltTexture(buffer, {
      paletteRowsByLayer: options.paletteRowsByLayer
    });
    if (!decodedTexture) {
      return null;
    }
    const texture = configureAuroraGeneratedPltTexture(
      runtime,
      configureLoadedPlaceableTexture(
        runtime,
        new THREE.DataTexture(
          decodedTexture.data,
          decodedTexture.width,
          decodedTexture.height,
          THREE.RGBAFormat
        ),
        decodedTexture.sourceFormat,
        textureUrl
      )
    );
    texture.userData = {
      ...texture.userData,
      isPLT: true,
      auroraIsPlt: true,
      pltWidth: decodedTexture.width,
      pltHeight: decodedTexture.height,
      numLayers: decodedTexture.numLayers,
      usedLayers: decodedTexture.usedLayers,
      auroraPltPaletteRowsByLayer: options.paletteRowsByLayer,
      pltBuffer: buffer,
      auroraPltUsedLayerIndices: decodedTexture.usedLayers
        .map((used, index) => (used ? index : null))
        .filter((index): index is number => index !== null)
    };
    return texture;
  } catch {
    return null;
  }
}

async function loadAuroraTgaTextureWithFetch(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<THREE.Texture | null> {
  if (!runtime.placeableTextureFetch || !shouldAttemptAuroraTgaDecode(textureUrl)) {
    return null;
  }

  try {
    const response = await fetchPlaceableTextureWithTimeout(runtime, textureUrl);
    if (!response || response.ok === false) {
      return null;
    }
    const buffer = await readPlaceableTextureArrayBufferWithTimeout(response);
    if (!buffer) {
      return null;
    }
    const decodedTexture = decodeTgaToRgba(buffer);
    return configureLoadedPlaceableTexture(
      runtime,
      new THREE.DataTexture(
        new Uint8Array(decodedTexture.rgba),
        decodedTexture.width,
        decodedTexture.height,
        THREE.RGBAFormat
      ),
      "tga-rgba",
      textureUrl
    );
  } catch {
    return null;
  }
}

async function loadPlaceableTextureWithFetchDecodeRetry(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string,
  loadTexture: () => Promise<THREE.Texture | null>
): Promise<THREE.Texture | null> {
  for (let attempt = 0; attempt <= PLACEABLE_TEXTURE_FETCH_DECODE_RETRY_LIMIT; attempt += 1) {
    const texture = await loadTexture();
    if (texture) {
      return texture;
    }
    if (hasPlaceableAssetCacheMiss(runtime, textureUrl)) {
      return null;
    }
  }
  return null;
}

export function ensurePlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string,
  options: PlaceableTextureLoadOptions = {}
): Promise<THREE.Texture | null> {
  const textureCacheKeys = resolvePlaceableTextureRuntimeCacheKeys(textureUrl, options);
  const cachedTexture = readCachedPlaceableTexture(runtime, textureCacheKeys);
  if (cachedTexture) {
    recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
      stage: "cached",
      completedAtMs: Date.now()
    });
    writeCachedPlaceableTexture(runtime, textureCacheKeys, cachedTexture);
    return Promise.resolve(cachedTexture);
  }
  const pendingTexture = readPendingPlaceableTexture(runtime, textureCacheKeys);
  if (pendingTexture) {
    recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
      stage: "requested",
      startedAtMs: Date.now()
    });
    textureCacheKeys.forEach((cacheKey) => {
      runtime.placeableTexturePendingByUrl.set(cacheKey, pendingTexture);
    });
    return pendingTexture.then((texture) => {
      if (texture) {
        writeCachedPlaceableTexture(runtime, textureCacheKeys, texture);
      }
      return texture;
    });
  }
  recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
    stage: "requested",
    startedAtMs: Date.now()
  });
  const request = schedulePlaceableTextureLoad(runtime, async () => {
    if (runtime.placeableTextureFetch && shouldAttemptAuroraPltDecode(textureUrl)) {
      const auroraPltTexture = await loadPlaceableTextureWithFetchDecodeRetry(runtime, textureUrl, () =>
        loadAuroraPltTextureWithFetch(runtime, textureUrl, options)
      );
      if (auroraPltTexture) {
        writeCachedPlaceableTexture(runtime, textureCacheKeys, auroraPltTexture);
        return auroraPltTexture;
      }
    }

    if (runtime.placeableTextureFetch && shouldAttemptAuroraTgaDecode(textureUrl)) {
      const auroraTgaTexture = await loadPlaceableTextureWithFetchDecodeRetry(runtime, textureUrl, () =>
        loadAuroraTgaTextureWithFetch(runtime, textureUrl)
      );
      if (auroraTgaTexture) {
        writeCachedPlaceableTexture(runtime, textureCacheKeys, auroraTgaTexture);
        return auroraTgaTexture;
      }
    }

    if (runtime.placeableTextureFetch && shouldAttemptAuroraTpcDecode(textureUrl)) {
      const auroraTpcTexture = await loadPlaceableTextureWithFetchDecodeRetry(runtime, textureUrl, () =>
        loadAuroraTpcTextureWithFetch(runtime, textureUrl)
      );
      if (auroraTpcTexture) {
        writeCachedPlaceableTexture(runtime, textureCacheKeys, auroraTpcTexture);
        return auroraTpcTexture;
      }
    }

    if (hasPlaceableAssetCacheMiss(runtime, textureUrl)) return null;

    if (shouldLoadPlaceableTextureWithFetchedObjectUrl(runtime)) {
      const fetchedObjectUrlTexture = await loadPlaceableTextureWithFetchedObjectUrl(
        runtime,
        textureUrl
      );
      if (fetchedObjectUrlTexture) {
        configureLoadedPlaceableTexture(runtime, fetchedObjectUrlTexture, undefined, textureUrl);
        writeCachedPlaceableTexture(runtime, textureCacheKeys, fetchedObjectUrlTexture);
        return fetchedObjectUrlTexture;
      }
      if (hasPlaceableAssetCacheMiss(runtime, textureUrl)) return null;
    }

    for (const loader of resolvePlaceableTextureLoaderCandidates(runtime, textureUrl)) {
      const texture = await loadPlaceableTextureWithLoader(loader, textureUrl);
      if (!texture) {
        continue;
      }
      configureLoadedPlaceableTexture(runtime, texture, undefined, textureUrl);
      writeCachedPlaceableTexture(runtime, textureCacheKeys, texture);
      return texture;
    }
    return null;
  }, {
    ...options,
    label: options.label ?? resolvePlaceableTextureQueueLabel(textureUrl)
  })
    .then((texture) => {
      if (texture) {
        recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
          stage: "decoded",
          completedAtMs: Date.now()
        });
        recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
          stage: "cached",
          completedAtMs: Date.now()
        });
      } else {
        recordVfxRuntimeAssetSettlement(runtime, textureUrl, {
          stage: "failed",
          completedAtMs: Date.now(),
          error: "texture-load-failed"
        });
      }
      return texture;
    })
    .finally(() => {
    textureCacheKeys.forEach((cacheKey) => {
      runtime.placeableTexturePendingByUrl.delete(cacheKey);
    });
  });
  textureCacheKeys.forEach((cacheKey) => {
    runtime.placeableTexturePendingByUrl.set(cacheKey, request);
  });
  return request;
}

export function ensurePlaceableTexturesByReference(
  runtime: PlaceableTextureRuntimeCache,
  textureUrlsByReference: Map<string, string>,
  options: PlaceableTextureLoadOptions = {}
): Promise<Map<string, THREE.Texture>> {
  return ensurePlaceableTexturesByReferenceProgressive(
    runtime,
    textureUrlsByReference,
    undefined,
    options
  );
}

export function ensurePlaceableTexturesByReferenceProgressive(
  runtime: PlaceableTextureRuntimeCache,
  textureUrlsByReference: Map<string, string>,
  onTextureLoaded?: (event: {
    reference: string;
    texture: THREE.Texture;
    texturesByReference: Map<string, THREE.Texture>;
    loadedCount: number;
    totalCount: number;
  }) => void,
  options: PlaceableTextureLoadOptions = {}
): Promise<Map<string, THREE.Texture>> {
  const entries = Array.from(textureUrlsByReference.entries());
  const limit = Math.max(1, PLACEABLE_TEXTURE_LOAD_CONCURRENCY_LIMIT);
  const texturesByReference = new Map<string, THREE.Texture>();
  let nextIndex = 0;

  const worker = async (): Promise<void> => {
    while (nextIndex < entries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = entries[index];
      if (!entry) {
        continue;
      }
      const [reference, textureUrl] = entry;
      const texture = await ensurePlaceableTexture(runtime, textureUrl, options);
      if (!texture) {
        continue;
      }
      texturesByReference.set(reference, texture);
      onTextureLoaded?.({
        reference,
        texture,
        texturesByReference: new Map(texturesByReference),
        loadedCount: texturesByReference.size,
        totalCount: entries.length
      });
    }
  };

  return Promise.all(
    Array.from({ length: Math.min(limit, entries.length) }, () => worker())
  ).then(() => {
    return texturesByReference;
  });
}

function materialSupportsTextureMap(
  material: THREE.Material
): material is THREE.Material & { map: THREE.Texture | null; alphaTest: number } {
  return "map" in material;
}

interface PlaceableTextureAlphaProfile {
  usesAlpha: boolean;
  usesSoftAlpha: boolean;
}

interface PlaceableTextureAlphaCoverage {
  readonly transparentPixelRatio: number;
  readonly softAlphaPixelRatio: number;
  readonly alphaPixelRatio: number;
}

interface PlaceableTextureNearBlackCoverage {
  readonly status: "sampled_rgba" | "pixel_data_missing";
  readonly hasNearBlackPixels: boolean;
  readonly nearBlackPixelRatio: number;
  readonly sampledPixelCount: number;
}

const AURORA_DECAL_TEXTURE_REFERENCE_PATTERN =
  /(?:blood|dirt|plama|splat|stain|scorch|spill|mud|smudge|decal|smoke|fog|mist|cloud)/iu;
const AURORA_MAGENTA_KEY_TEXTURE_REFERENCE_PATTERN =
  /(?:plantmag|magenta[_-]?key|color[_-]?key)/iu;
const AURORA_ITEM_SHIELD_BLACK_KEY_TEXTURE_REFERENCE_PATTERN =
  /^ash(?:lw|sw|to)_\d{3}t$/iu;
const AURORA_TEXTURE_ALPHA_PROFILE_USER_DATA_KEY = "auroraTextureAlphaProfile";
const AURORA_TEXTURE_ALPHA_COVERAGE_USER_DATA_KEY = "auroraTextureAlphaCoverage";
const AURORA_TEXTURE_NEAR_BLACK_COVERAGE_USER_DATA_KEY =
  "auroraTextureNearBlackCoverage";
const AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY = "auroraMaterialShaderCacheKeys";
const AURORA_PUNCH_THROUGH_ALPHA_DISCARD_THRESHOLD = 0.2;
const AURORA_HARD_ALPHA_TEST_THRESHOLD = 0.5;
const AURORA_SOFT_ALPHA_CUTOUT_TEST_THRESHOLD = 0.75;
const AURORA_SOFT_ALPHA_LAYER_TRANSPARENT_PIXEL_RATIO = 0.25;
const AURORA_ALPHA_COVERAGE_SAMPLE_LIMIT = 65_536;
const AURORA_TRANSPARENCY_HINT_COLOR_KEY_ALPHA_TEST_THRESHOLD = 0.1;
const AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SOURCE_CHANNEL_THRESHOLD = 12;
const AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SHADER_SRGB_THRESHOLD =
  AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SOURCE_CHANNEL_THRESHOLD / 255;
const AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SHADER_LINEAR_THRESHOLD = 0.00368;
const AURORA_ITEM_SHIELD_BLACK_KEY_ALPHA_TEST_THRESHOLD = 0.01;
const AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_OFFSET = 0.006;
const AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_FALLBACK_COLOR = 0x68717a;
const AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_MIN_COLOR_CHANNEL = 8;

function cacheTextureAlphaProfile(
  texture: THREE.Texture,
  profile: PlaceableTextureAlphaProfile
): PlaceableTextureAlphaProfile {
  texture.userData = {
    ...texture.userData,
    [AURORA_TEXTURE_ALPHA_PROFILE_USER_DATA_KEY]: profile
  };
  return profile;
}

function readCachedTextureAlphaProfile(texture: THREE.Texture): PlaceableTextureAlphaProfile | null {
  const cached = asRecord(texture.userData?.[AURORA_TEXTURE_ALPHA_PROFILE_USER_DATA_KEY]);
  if (
    typeof cached?.usesAlpha === "boolean" &&
    typeof cached.usesSoftAlpha === "boolean"
  ) {
    return {
      usesAlpha: cached.usesAlpha,
      usesSoftAlpha: cached.usesSoftAlpha
    };
  }
  return null;
}

function resolveTextureAlphaProfileFromUserData(
  texture: THREE.Texture
): PlaceableTextureAlphaProfile | null {
  const cached = readCachedTextureAlphaProfile(texture);
  if (cached) {
    return cached;
  }
  const userData = texture.userData as Record<string, unknown>;
  const hasAlpha =
    userData.hasAlpha === true || userData.auroraTextureHasAlpha === true;
  if (!hasAlpha || typeof userData.isBimodal !== "boolean") {
    return null;
  }
  return cacheTextureAlphaProfile(texture, {
    usesAlpha: true,
    usesSoftAlpha: userData.isBimodal !== true
  });
}

function resolveTextureAlphaProfile(texture: THREE.Texture): PlaceableTextureAlphaProfile {
  if (!texture) {
    return { usesAlpha: false, usesSoftAlpha: false };
  }
  const profileFromUserData = resolveTextureAlphaProfileFromUserData(texture);
  if (profileFromUserData) {
    return profileFromUserData;
  }

  const withFormat = texture as THREE.Texture & { format?: number };
  if (
    withFormat.format === THREE.RGBA_S3TC_DXT1_Format ||
    withFormat.format === THREE.RGBA_S3TC_DXT3_Format ||
    withFormat.format === THREE.RGBA_S3TC_DXT5_Format
  ) {
    return cacheTextureAlphaProfile(texture, { usesAlpha: true, usesSoftAlpha: true });
  }

  const withImageData = texture as THREE.Texture & {
    image?: { data?: ArrayLike<number> };
  };
  const alphaData = withImageData.image?.data;
  if (!alphaData || alphaData.length < 4) {
    return cacheTextureAlphaProfile(texture, { usesAlpha: false, usesSoftAlpha: false });
  }
  let usesAlpha = false;
  let usesSoftAlpha = false;
  for (let index = 3; index < alphaData.length; index += 4) {
    const alpha = alphaData[index];
    if (alpha !== 255) {
      usesAlpha = true;
    }
    if (alpha !== 0 && alpha !== 255) {
      usesSoftAlpha = true;
    }
  }
  return cacheTextureAlphaProfile(texture, { usesAlpha, usesSoftAlpha });
}

function cacheTextureAlphaCoverage(
  texture: THREE.Texture,
  coverage: PlaceableTextureAlphaCoverage
): PlaceableTextureAlphaCoverage {
  texture.userData = {
    ...texture.userData,
    [AURORA_TEXTURE_ALPHA_COVERAGE_USER_DATA_KEY]: coverage
  };
  return coverage;
}

function readCachedTextureAlphaCoverage(
  texture: THREE.Texture
): PlaceableTextureAlphaCoverage | null {
  const cached = asRecord(texture.userData?.[AURORA_TEXTURE_ALPHA_COVERAGE_USER_DATA_KEY]);
  if (
    typeof cached?.transparentPixelRatio === "number" &&
    typeof cached.softAlphaPixelRatio === "number" &&
    typeof cached.alphaPixelRatio === "number"
  ) {
    return {
      transparentPixelRatio: cached.transparentPixelRatio,
      softAlphaPixelRatio: cached.softAlphaPixelRatio,
      alphaPixelRatio: cached.alphaPixelRatio
    };
  }
  return null;
}

function resolveTextureAlphaCoverage(texture: THREE.Texture): PlaceableTextureAlphaCoverage {
  const cached = readCachedTextureAlphaCoverage(texture);
  if (cached) {
    return cached;
  }
  const withImageData = texture as THREE.Texture & {
    image?: { data?: ArrayLike<number>; width?: number; height?: number };
  };
  const alphaData = withImageData.image?.data;
  if (alphaData && alphaData.length >= 4) {
    let transparentPixels = 0;
    let softAlphaPixels = 0;
    let alphaPixels = 0;
    let sampledPixels = 0;
    const totalPixels = Math.max(1, Math.floor(alphaData.length / 4));
    const pixelStep = Math.max(
      1,
      Math.floor(totalPixels / AURORA_ALPHA_COVERAGE_SAMPLE_LIMIT)
    );
    for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += pixelStep) {
      const index = pixelIndex * 4 + 3;
      const alpha = alphaData[index] ?? 255;
      sampledPixels += 1;
      if (alpha === 0) {
        transparentPixels += 1;
        alphaPixels += 1;
      } else if (alpha !== 255) {
        softAlphaPixels += 1;
        alphaPixels += 1;
      }
    }
    const total = Math.max(1, sampledPixels);
    return cacheTextureAlphaCoverage(texture, {
      transparentPixelRatio: transparentPixels / total,
      softAlphaPixelRatio: softAlphaPixels / total,
      alphaPixelRatio: alphaPixels / total
    });
  }

  const userData = texture.userData as Record<string, unknown>;
  const softAlphaPixelRatio =
    typeof userData.auroraTextureSoftAlphaPixelRatio === "number"
      ? Math.max(0, Math.min(1, userData.auroraTextureSoftAlphaPixelRatio))
      : 0;
  const hasAlpha =
    userData.hasAlpha === true || userData.auroraTextureHasAlpha === true;
  return cacheTextureAlphaCoverage(texture, {
    transparentPixelRatio: 0,
    softAlphaPixelRatio,
    alphaPixelRatio: hasAlpha ? Math.max(softAlphaPixelRatio, 0.001) : 0
  });
}

function cacheTextureNearBlackCoverage(
  texture: THREE.Texture,
  coverage: PlaceableTextureNearBlackCoverage
): PlaceableTextureNearBlackCoverage {
  texture.userData = {
    ...texture.userData,
    [AURORA_TEXTURE_NEAR_BLACK_COVERAGE_USER_DATA_KEY]: coverage
  };
  return coverage;
}

function readCachedTextureNearBlackCoverage(
  texture: THREE.Texture
): PlaceableTextureNearBlackCoverage | null {
  const cached = asRecord(
    texture.userData?.[AURORA_TEXTURE_NEAR_BLACK_COVERAGE_USER_DATA_KEY]
  );
  if (
    (cached?.status === "sampled_rgba" || cached?.status === "pixel_data_missing") &&
    typeof cached.hasNearBlackPixels === "boolean" &&
    typeof cached.nearBlackPixelRatio === "number" &&
    typeof cached.sampledPixelCount === "number"
  ) {
    return {
      status: cached.status,
      hasNearBlackPixels: cached.hasNearBlackPixels,
      nearBlackPixelRatio: cached.nearBlackPixelRatio,
      sampledPixelCount: cached.sampledPixelCount
    };
  }
  return null;
}

function resolveTextureNearBlackCoverage(
  texture: THREE.Texture
): PlaceableTextureNearBlackCoverage {
  const cached = readCachedTextureNearBlackCoverage(texture);
  if (cached) {
    return cached;
  }
  const withImageData = texture as THREE.Texture & {
    image?: { data?: ArrayLike<number> };
  };
  const rgbaData = withImageData.image?.data;
  if (!rgbaData || rgbaData.length < 4) {
    return cacheTextureNearBlackCoverage(texture, {
      status: "pixel_data_missing",
      hasNearBlackPixels: false,
      nearBlackPixelRatio: 0,
      sampledPixelCount: 0
    });
  }

  const totalPixels = Math.max(1, Math.floor(rgbaData.length / 4));
  const pixelStep = Math.max(
    1,
    Math.floor(totalPixels / AURORA_ALPHA_COVERAGE_SAMPLE_LIMIT)
  );
  let nearBlackPixels = 0;
  let sampledPixels = 0;
  for (let pixelIndex = 0; pixelIndex < totalPixels; pixelIndex += pixelStep) {
    const index = pixelIndex * 4;
    const red = rgbaData[index] ?? 255;
    const green = rgbaData[index + 1] ?? 255;
    const blue = rgbaData[index + 2] ?? 255;
    sampledPixels += 1;
    if (
      red <= AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SOURCE_CHANNEL_THRESHOLD &&
      green <= AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SOURCE_CHANNEL_THRESHOLD &&
      blue <= AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SOURCE_CHANNEL_THRESHOLD
    ) {
      nearBlackPixels += 1;
    }
  }
  const sampledPixelCount = Math.max(1, sampledPixels);
  return cacheTextureNearBlackCoverage(texture, {
    status: "sampled_rgba",
    hasNearBlackPixels: nearBlackPixels > 0,
    nearBlackPixelRatio: nearBlackPixels / sampledPixelCount,
    sampledPixelCount
  });
}

function resolveTransparencyHintNearBlackShaderThreshold(
  texture: THREE.Texture
): number {
  return texture.colorSpace === THREE.SRGBColorSpace
    ? AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SHADER_LINEAR_THRESHOLD
    : AURORA_TRANSPARENCY_HINT_NEAR_BLACK_SHADER_SRGB_THRESHOLD;
}

function resolvePrimaryMaterialTextureReference(material: THREE.Material): string {
  return resolveMaterialTextureReferences(material)[0] ?? "";
}

function isAuroraSoftAlphaDecalMaterial(
  material: THREE.Material,
  alphaProfile: PlaceableTextureAlphaProfile,
  selectedTextureReference?: string
): boolean {
  if (!alphaProfile.usesSoftAlpha) {
    return false;
  }
  const normalizedSelectedTextureReference = selectedTextureReference
    ? normalizePlaceableTextureReference(selectedTextureReference)
    : "";
  if (normalizedSelectedTextureReference.length > 0) {
    return AURORA_DECAL_TEXTURE_REFERENCE_PATTERN.test(normalizedSelectedTextureReference);
  }
  const textureReferences = [
    ...resolveMaterialTextureReferences(material),
    ...resolveMaterialTextureReferenceList(material)
  ]
    .filter((reference): reference is string => typeof reference === "string")
    .map(normalizePlaceableTextureReference)
    .filter(
      (reference, index, all) => reference.length > 0 && all.indexOf(reference) === index
    );
  return textureReferences.some((textureReference) =>
    AURORA_DECAL_TEXTURE_REFERENCE_PATTERN.test(textureReference)
  );
}

function isAuroraMagentaKeyMaterial(material: THREE.Material): boolean {
  const textureReference = resolvePrimaryMaterialTextureReference(material);
  return AURORA_MAGENTA_KEY_TEXTURE_REFERENCE_PATTERN.test(textureReference);
}

function isAuroraItemShieldBlackKeyMaterial(material: THREE.Material): boolean {
  const textureReference = resolvePrimaryMaterialTextureReference(material);
  return AURORA_ITEM_SHIELD_BLACK_KEY_TEXTURE_REFERENCE_PATTERN.test(textureReference);
}

function appendAuroraMaterialShaderCacheKey(material: THREE.Material, cacheKey: string): void {
  const currentKeys = Array.isArray(
    material.userData[AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY]
  )
    ? (material.userData[AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY] as unknown[])
        .filter((value): value is string => typeof value === "string")
    : [];
  if (!currentKeys.includes(cacheKey)) {
    material.userData = {
      ...material.userData,
      [AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY]: [...currentKeys, cacheKey]
    };
  }
  material.customProgramCacheKey = () => {
    const keys = Array.isArray(
      material.userData[AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY]
    )
      ? (material.userData[AURORA_MATERIAL_SHADER_CACHE_KEYS_USER_DATA_KEY] as unknown[])
          .filter((value): value is string => typeof value === "string")
      : [cacheKey];
    return keys.join("|");
  };
}

function applyAuroraMagentaKeyShader(material: THREE.Material): void {
  if (material.userData.auroraMagentaKeyShaderApplied === true) {
    return;
  }
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      [
        "#include <alphatest_fragment>",
        "vec3 auroraMagentaKeyColor = vec3(1.0, 0.0, 1.0);",
        "float auroraMagentaKeyDistance = distance(diffuseColor.rgb, auroraMagentaKeyColor);",
        "if (auroraMagentaKeyDistance < 0.35 && diffuseColor.r > 0.55 && diffuseColor.g < 0.38 && diffuseColor.b > 0.55) discard;"
      ].join("\n")
    );
  };
  appendAuroraMaterialShaderCacheKey(material, "aurora-magenta-key-v1");
  material.userData = {
    ...material.userData,
    auroraMagentaKeyShaderApplied: true
  };
}

function applyAuroraItemShieldBlackKeyShader(material: THREE.Material): void {
  if (material.userData.auroraItemShieldBlackKeyShaderApplied === true) {
    return;
  }
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      [
        "#include <alphatest_fragment>",
        "float auroraItemShieldBlackKeyMax = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);",
        "if (auroraItemShieldBlackKeyMax <= 0.025) discard;"
      ].join("\n")
    );
  };
  appendAuroraMaterialShaderCacheKey(material, "aurora-item-shield-black-key-v1");
  material.userData = {
    ...material.userData,
    auroraItemShieldBlackKeyShaderApplied: true
  };
}

function resolveAuroraItemShieldBackerColorFromTexture(
  texture: THREE.Texture | undefined
): THREE.Color | null {
  const image = texture?.image as
    | { data?: ArrayLike<number>; width?: number; height?: number }
    | undefined;
  const data = image?.data;
  const width = typeof image?.width === "number" ? image.width : 0;
  const height = typeof image?.height === "number" ? image.height : 0;
  if (!data || width <= 0 || height <= 0 || data.length < width * height * 4) {
    return null;
  }

  let red = 0;
  let green = 0;
  let blue = 0;
  let count = 0;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] ?? 255;
    if (alpha <= 16) {
      continue;
    }
    const r = data[index] ?? 0;
    const g = data[index + 1] ?? 0;
    const b = data[index + 2] ?? 0;
    if (Math.max(r, g, b) <= AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_MIN_COLOR_CHANNEL) {
      continue;
    }
    red += r;
    green += g;
    blue += b;
    count += 1;
  }
  return count > 0
    ? new THREE.Color(red / count / 255, green / count / 255, blue / count / 255)
    : null;
}

function resolveAuroraItemShieldBackerColor(
  material: THREE.Material,
  texture: THREE.Texture | undefined
): THREE.Color {
  const textureColor = resolveAuroraItemShieldBackerColorFromTexture(texture);
  if (textureColor) {
    return textureColor;
  }
  const materialWithColor = material as THREE.Material & { color?: THREE.Color };
  if (materialWithColor.color instanceof THREE.Color) {
    return materialWithColor.color.clone();
  }
  return new THREE.Color(AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_FALLBACK_COLOR);
}

function resolveAuroraItemShieldBackerNormal(geometry: THREE.BufferGeometry): THREE.Vector3 {
  const normalAttribute = geometry.getAttribute("normal");
  if (normalAttribute && normalAttribute.count > 0) {
    const normal = new THREE.Vector3();
    for (let index = 0; index < normalAttribute.count; index += 1) {
      normal.x += normalAttribute.getX(index);
      normal.y += normalAttribute.getY(index);
      normal.z += normalAttribute.getZ(index);
    }
    if (normal.lengthSq() > 1e-8) {
      return normal.normalize();
    }
  }

  geometry.computeBoundingBox();
  const size = new THREE.Vector3();
  geometry.boundingBox?.getSize(size);
  const axis =
    size.x <= size.y && size.x <= size.z ? "x" : size.y <= size.z ? "y" : "z";
  return new THREE.Vector3(axis === "x" ? -1 : 0, axis === "y" ? -1 : 0, axis === "z" ? -1 : 0);
}

function readGeometryVertexIndex(geometry: THREE.BufferGeometry, index: number): number {
  const indexAttribute = geometry.getIndex();
  return indexAttribute ? indexAttribute.getX(index) : index;
}

function readPositionAttributeVector(
  positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  target: THREE.Vector3
): THREE.Vector3 {
  return target.set(
    positionAttribute.getX(index),
    positionAttribute.getY(index),
    positionAttribute.getZ(index)
  );
}

function resolveAuroraItemShieldBackerTriangleNormal(
  geometry: THREE.BufferGeometry,
  vertexA: number,
  vertexB: number,
  vertexC: number,
  target: THREE.Vector3
): THREE.Vector3 {
  const normalAttribute = geometry.getAttribute("normal");
  if (normalAttribute && normalAttribute.count > Math.max(vertexA, vertexB, vertexC)) {
    target.set(
      normalAttribute.getX(vertexA) + normalAttribute.getX(vertexB) + normalAttribute.getX(vertexC),
      normalAttribute.getY(vertexA) + normalAttribute.getY(vertexB) + normalAttribute.getY(vertexC),
      normalAttribute.getZ(vertexA) + normalAttribute.getZ(vertexB) + normalAttribute.getZ(vertexC)
    );
    if (target.lengthSq() > 1e-8) {
      return target.normalize();
    }
  }

  const positionAttribute = geometry.getAttribute("position");
  const a = readPositionAttributeVector(positionAttribute, vertexA, new THREE.Vector3());
  const b = readPositionAttributeVector(positionAttribute, vertexB, new THREE.Vector3());
  const c = readPositionAttributeVector(positionAttribute, vertexC, new THREE.Vector3());
  return target.subVectors(b, a).cross(c.sub(a)).normalize();
}

function buildAuroraItemShieldBackerGeometry(
  geometry: THREE.BufferGeometry
): { geometry: THREE.BufferGeometry; normal: THREE.Vector3 } {
  const positionAttribute = geometry.getAttribute("position");
  const dominantNormal = resolveAuroraItemShieldBackerNormal(geometry);
  if (!positionAttribute || positionAttribute.itemSize < 3 || positionAttribute.count <= 0) {
    return { geometry: geometry.clone(), normal: dominantNormal };
  }

  const normalAttribute = geometry.getAttribute("normal");
  const indexCount = geometry.getIndex()?.count ?? positionAttribute.count;
  const positions: number[] = [];
  const normals: number[] = [];
  const triangleNormal = new THREE.Vector3();
  for (let index = 0; index + 2 < indexCount; index += 3) {
    const vertexA = readGeometryVertexIndex(geometry, index);
    const vertexB = readGeometryVertexIndex(geometry, index + 1);
    const vertexC = readGeometryVertexIndex(geometry, index + 2);
    if (Math.max(vertexA, vertexB, vertexC) >= positionAttribute.count) {
      continue;
    }
    resolveAuroraItemShieldBackerTriangleNormal(
      geometry,
      vertexA,
      vertexB,
      vertexC,
      triangleNormal
    );
    if (triangleNormal.dot(dominantNormal) < 0.35) {
      continue;
    }
    [vertexA, vertexB, vertexC].forEach((vertexIndex) => {
      positions.push(
        positionAttribute.getX(vertexIndex),
        positionAttribute.getY(vertexIndex),
        positionAttribute.getZ(vertexIndex)
      );
      if (normalAttribute && normalAttribute.count > vertexIndex) {
        normals.push(
          normalAttribute.getX(vertexIndex),
          normalAttribute.getY(vertexIndex),
          normalAttribute.getZ(vertexIndex)
        );
      }
    });
  }

  if (positions.length === 0) {
    return { geometry: geometry.clone(), normal: dominantNormal };
  }

  const backerGeometry = new THREE.BufferGeometry();
  backerGeometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) {
    backerGeometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    backerGeometry.computeVertexNormals();
  }
  return { geometry: backerGeometry, normal: dominantNormal };
}

function ensureAuroraItemShieldBlackKeyBackerMesh(
  mesh: THREE.Mesh,
  material: THREE.Material,
  texture: THREE.Texture | undefined
): void {
  if (mesh.userData.auroraItemShieldBlackKeyBackerAttached === true) {
    return;
  }
  if (!(mesh.geometry instanceof THREE.BufferGeometry)) {
    return;
  }
  const backerGeometry = buildAuroraItemShieldBackerGeometry(mesh.geometry);
  const backerMaterial = new THREE.MeshBasicMaterial({
    color: resolveAuroraItemShieldBackerColor(material, texture),
    side: THREE.DoubleSide,
    transparent: false,
    depthWrite: true
  });
  backerMaterial.name = "Aurora item shield black-key backer";
  backerMaterial.userData = {
    auroraItemShieldBlackKeyBacker: true,
    auroraItemShieldBlackKeyBackerSourceTexture: resolvePrimaryMaterialTextureReference(material)
  };

  const backer = new THREE.Mesh(backerGeometry.geometry, backerMaterial);
  backer.name = `${mesh.name || "aurora_item_shield"}_black_key_backer`;
  backer.position.copy(
    backerGeometry.normal
      .clone()
      .multiplyScalar(-AURORA_ITEM_SHIELD_BLACK_KEY_BACKER_OFFSET)
  );
  backer.castShadow = mesh.castShadow;
  backer.receiveShadow = mesh.receiveShadow;
  backer.userData = {
    auroraItemShieldBlackKeyBacker: true,
    auroraItemShieldBlackKeyBackerOffset: backer.position.toArray()
  };
  mesh.add(backer);
  mesh.userData = {
    ...mesh.userData,
    auroraItemShieldBlackKeyBackerAttached: true
  };
}

function readAuroraMaterialTransparencyHint(material: THREE.Material): number {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  const auroraMaterial = asRecord(aurora?.material);
  const rawHint =
    auroraMaterial?.transparencyHint ?? auroraMaterial?.transparencyhint ?? userData.transparencyHint;
  if (typeof rawHint === "number" && Number.isFinite(rawHint)) {
    return Math.max(0, Math.trunc(rawHint));
  }
  if (typeof rawHint === "string") {
    const parsed = Number(rawHint);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  return 0;
}

function isAuroraTransparencyHintColorKeyMaterial(
  material: THREE.Material,
  alphaProfile: PlaceableTextureAlphaProfile,
  nearBlackCoverage: PlaceableTextureNearBlackCoverage
): boolean {
  return (
    !alphaProfile.usesAlpha &&
    readAuroraMaterialTransparencyHint(material) > 0 &&
    nearBlackCoverage.status === "sampled_rgba" &&
    nearBlackCoverage.hasNearBlackPixels
  );
}

function applyAuroraTransparencyHintColorKeyShader(
  material: THREE.Material,
  maxChannelThreshold: number
): void {
  if (material.userData.auroraTransparencyHintColorKeyShaderApplied === true) {
    return;
  }
  const previousOnBeforeCompile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile(shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <alphatest_fragment>",
      [
        "#include <alphatest_fragment>",
        "float auroraTransparencyHintMaxChannel = max(max(diffuseColor.r, diffuseColor.g), diffuseColor.b);",
        `if (auroraTransparencyHintMaxChannel <= ${maxChannelThreshold.toFixed(6)}) discard;`
      ].join("\n")
    );
  };
  appendAuroraMaterialShaderCacheKey(
    material,
    `aurora-transparencyhint-source-near-black-v2-${maxChannelThreshold.toFixed(6)}`
  );
  material.userData = {
    ...material.userData,
    auroraTransparencyHintColorKeyShaderApplied: true,
    auroraTransparencyHintColorKeyShaderThreshold: maxChannelThreshold
  };
}

interface AuroraSelfIllumMaterial extends THREE.Material {
  emissiveMap?: THREE.Texture | null;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
}

function clampAuroraColorChannel(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(1, Math.max(0, value))
    : 0;
}

function readAuroraSelfIllumColor(material: THREE.Material): [number, number, number] | null {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  const auroraMaterial = asRecord(aurora?.material);
  const rawColor = auroraMaterial?.selfIllumColor;
  if (!Array.isArray(rawColor) || rawColor.length < 3) {
    return null;
  }
  const color: [number, number, number] = [
    clampAuroraColorChannel(rawColor[0]),
    clampAuroraColorChannel(rawColor[1]),
    clampAuroraColorChannel(rawColor[2])
  ];
  return color.some((channel) => channel > 0) ? color : null;
}

function applyAuroraSelfIllumTextureToMaterial(
  material: THREE.Material,
  texture: THREE.Texture
): boolean {
  const selfIllumColor = readAuroraSelfIllumColor(material);
  if (!selfIllumColor) {
    return false;
  }
  const selfIllumMaterial = material as AuroraSelfIllumMaterial;
  if (!("emissiveMap" in selfIllumMaterial)) {
    return false;
  }
  selfIllumMaterial.emissiveMap = texture;
  if (selfIllumMaterial.emissive instanceof THREE.Color) {
    selfIllumMaterial.emissive.setRGB(
      selfIllumColor[0],
      selfIllumColor[1],
      selfIllumColor[2]
    );
  }
  selfIllumMaterial.emissiveIntensity = 1;
  material.userData = {
    ...material.userData,
    auroraSelfIllumTextureApplied: true,
    auroraSelfIllumTextureMode: "webviewer-diffuse-emissive-map",
    auroraSelfIllumColor: selfIllumColor
  };
  material.needsUpdate = true;
  return true;
}

function applyTextureToMaterial(
  material: THREE.Material & { map: THREE.Texture | null; alphaTest: number },
  texture: THREE.Texture,
  selectedTextureReference?: string
): void {
  material.map = texture;
  if ("color" in material && material.color instanceof THREE.Color) {
    material.color.set(0xffffff);
  }
  const alphaProfile = resolveTextureAlphaProfile(texture);
  const nearBlackCoverage = resolveTextureNearBlackCoverage(texture);
  const normalizedSelectedTextureReference = selectedTextureReference
    ? normalizePlaceableTextureReference(selectedTextureReference)
    : "";
  const isSoftAlphaDecal = isAuroraSoftAlphaDecalMaterial(
    material,
    alphaProfile,
    normalizedSelectedTextureReference
  );
  const isMagentaKey = isAuroraMagentaKeyMaterial(material);
  const isItemShieldBlackKey = isAuroraItemShieldBlackKeyMaterial(material);
  const isTransparencyHintColorKey = isAuroraTransparencyHintColorKeyMaterial(
    material,
    alphaProfile,
    nearBlackCoverage
  );
  const alphaCoverage = resolveTextureAlphaCoverage(texture);
  const isSoftAlphaLayer =
    alphaProfile.usesSoftAlpha &&
    !isSoftAlphaDecal &&
    alphaCoverage.transparentPixelRatio >=
      AURORA_SOFT_ALPHA_LAYER_TRANSPARENT_PIXEL_RATIO;
  const usesAuroraCutout =
    ((alphaProfile.usesAlpha && !alphaProfile.usesSoftAlpha) ||
      isMagentaKey ||
      isItemShieldBlackKey ||
      isTransparencyHintColorKey) &&
    !isSoftAlphaDecal;
  const alphaMode =
    isSoftAlphaDecal || isSoftAlphaLayer
      ? "blend"
      : usesAuroraCutout
        ? "cutout"
        : "opaque";
  material.transparent = alphaMode === "blend";
  material.opacity = 1;
  material.alphaTest = usesAuroraCutout
    ? isTransparencyHintColorKey
      ? AURORA_TRANSPARENCY_HINT_COLOR_KEY_ALPHA_TEST_THRESHOLD
      : isItemShieldBlackKey
        ? AURORA_ITEM_SHIELD_BLACK_KEY_ALPHA_TEST_THRESHOLD
        : alphaProfile.usesSoftAlpha
        ? AURORA_SOFT_ALPHA_CUTOUT_TEST_THRESHOLD
        : AURORA_HARD_ALPHA_TEST_THRESHOLD
    : 0;
  if ("depthWrite" in material) {
    material.depthWrite = alphaMode !== "blend";
  }
  if (isMagentaKey) {
    applyAuroraMagentaKeyShader(material);
  }
  if (isItemShieldBlackKey) {
    applyAuroraItemShieldBlackKeyShader(material);
  }
  if (isTransparencyHintColorKey) {
    applyAuroraTransparencyHintColorKeyShader(
      material,
      resolveTransparencyHintNearBlackShaderThreshold(texture)
    );
  }
  if (isSoftAlphaDecal) {
    material.alphaTest = 0;
    material.blending = THREE.MultiplyBlending;
    material.premultipliedAlpha = true;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
  } else if (isSoftAlphaLayer) {
    material.blending = THREE.NormalBlending;
    material.premultipliedAlpha = false;
  }
  applyAuroraSelfIllumTextureToMaterial(material, texture);
  material.userData = {
    ...material.userData,
    auroraPrimaryTextureReference: resolvePrimaryMaterialTextureReference(material),
    auroraSelectedTextureReference: normalizedSelectedTextureReference || undefined,
    auroraTextureUsesAlpha: alphaProfile.usesAlpha,
    auroraTextureUsesSoftAlpha: alphaProfile.usesSoftAlpha,
    auroraTextureTransparentPixelRatio: alphaCoverage.transparentPixelRatio,
    auroraTextureSoftAlphaPixelRatio: alphaCoverage.softAlphaPixelRatio,
    auroraTextureAlphaPixelRatio: alphaCoverage.alphaPixelRatio,
    auroraTextureNearBlackCoverageStatus: nearBlackCoverage.status,
    auroraTextureNearBlackPixelRatio: nearBlackCoverage.nearBlackPixelRatio,
    auroraTextureNearBlackSampledPixelCount: nearBlackCoverage.sampledPixelCount,
    auroraTextureAlphaMode: alphaMode,
    auroraTextureAlphaTest: material.alphaTest,
    auroraSoftAlphaLayerMaterial: isSoftAlphaLayer,
    auroraSoftAlphaDecalMaterial: isSoftAlphaDecal,
    auroraMagentaKeyMaterial: isMagentaKey,
    auroraItemShieldBlackKeyMaterial: isItemShieldBlackKey,
    auroraTransparencyHint: readAuroraMaterialTransparencyHint(material),
    auroraTransparencyHintColorKeyMaterial: isTransparencyHintColorKey
  };
  material.needsUpdate = true;
}

function hasUsableUvAttribute(
  uvAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  vertexCount: number
): boolean {
  if (uvAttribute.count !== vertexCount) {
    return false;
  }
  let minU = Number.POSITIVE_INFINITY;
  let maxU = Number.NEGATIVE_INFINITY;
  let minV = Number.POSITIVE_INFINITY;
  let maxV = Number.NEGATIVE_INFINITY;
  for (let index = 0; index < uvAttribute.count; index += 1) {
    const u = uvAttribute.getX(index);
    const v = uvAttribute.getY(index);
    if (!Number.isFinite(u) || !Number.isFinite(v)) {
      return false;
    }
    if (u < minU) {
      minU = u;
    }
    if (u > maxU) {
      maxU = u;
    }
    if (v < minV) {
      minV = v;
    }
    if (v > maxV) {
      maxV = v;
    }
  }
  return maxU - minU > 1e-4 || maxV - minV > 1e-4;
}

function resolveAxisValue(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
  index: number,
  axis: number
): number {
  if (axis === 0) {
    return attribute.getX(index);
  }
  if (axis === 1) {
    return attribute.getY(index);
  }
  return attribute.getZ(index);
}

function buildPlanarUvFromPositions(
  positionAttribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
): Float32Array {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];
  for (let index = 0; index < positionAttribute.count; index += 1) {
    const x = positionAttribute.getX(index);
    const y = positionAttribute.getY(index);
    const z = positionAttribute.getZ(index);
    if (x < min[0]) {
      min[0] = x;
    }
    if (x > max[0]) {
      max[0] = x;
    }
    if (y < min[1]) {
      min[1] = y;
    }
    if (y > max[1]) {
      max[1] = y;
    }
    if (z < min[2]) {
      min[2] = z;
    }
    if (z > max[2]) {
      max[2] = z;
    }
  }

  const spans = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const sortedAxes = [0, 1, 2].sort((left, right) => spans[right]! - spans[left]!);
  const uAxis = sortedAxes[0] ?? 0;
  const vAxis = sortedAxes[1] ?? (uAxis === 1 ? 2 : 1);
  const uRange = spans[uAxis]! > 1e-6 ? spans[uAxis]! : 1;
  const vRange = spans[vAxis]! > 1e-6 ? spans[vAxis]! : 1;

  const uvValues = new Float32Array(positionAttribute.count * 2);
  for (let index = 0; index < positionAttribute.count; index += 1) {
    const uValue = (resolveAxisValue(positionAttribute, index, uAxis) - min[uAxis]!) / uRange;
    const vRaw = (resolveAxisValue(positionAttribute, index, vAxis) - min[vAxis]!) / vRange;
    uvValues[index * 2] = Number.isFinite(uValue) ? uValue : 0;
    uvValues[index * 2 + 1] = Number.isFinite(vRaw) ? 1 - vRaw : 0;
  }
  return uvValues;
}

function ensurePlaceableMeshUvCoordinates(mesh: THREE.Mesh): void {
  const geometry = mesh.geometry;
  if (!(geometry instanceof THREE.BufferGeometry)) {
    return;
  }
  const positionAttribute = geometry.getAttribute("position");
  if (!positionAttribute || positionAttribute.itemSize < 3 || positionAttribute.count <= 0) {
    return;
  }

  const uvAttribute = geometry.getAttribute("uv");
  if (uvAttribute && hasUsableUvAttribute(uvAttribute, positionAttribute.count)) {
    return;
  }

  const generatedUv = buildPlanarUvFromPositions(positionAttribute);
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(generatedUv, 2));
  const refreshedUv = geometry.getAttribute("uv");
  if (refreshedUv) {
    refreshedUv.needsUpdate = true;
  }
}

export function applyPlaceableTextureToModel(
  model: THREE.Object3D,
  texture: THREE.Texture,
  options: Pick<PlaceableTextureApplicationOptions, "skipMesh"> = {}
): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (options.skipMesh?.(node)) {
      return;
    }
    ensurePlaceableMeshUvCoordinates(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    let didUpdateMaterial = false;
    let itemShieldBackerMaterial: THREE.Material | null = null;
    let itemShieldBackerTexture: THREE.Texture | undefined;
    materials.forEach((material) => {
      if (!materialSupportsTextureMap(material)) {
        return;
      }
      applyTextureToMaterial(material, texture);
      if (material.userData.auroraItemShieldBlackKeyMaterial === true) {
        itemShieldBackerMaterial = material;
        itemShieldBackerTexture = texture;
      }
      didUpdateMaterial = true;
    });
    if (itemShieldBackerMaterial) {
      ensureAuroraItemShieldBlackKeyBackerMesh(
        node,
        itemShieldBackerMaterial,
        itemShieldBackerTexture
      );
    }
    if (didUpdateMaterial) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

export function applyPlaceableTexturesToModel(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture?: THREE.Texture,
  options: PlaceableTextureApplicationOptions = {}
): AuroraModelMaterialTextureApplicationReport {
  const auroraMaterialContractsByReference = buildAuroraMaterialContractsByReference(
    options.auroraMaterial
  );
  const auroraTextureBindingsByReference = buildAuroraTextureBindingsByReference(
    options.textureBindings
  );
  const singleTextureFallback =
    fallbackTexture ??
    (options.allowSingleTextureFallback !== false && texturesByReference.size === 1
      ? Array.from(texturesByReference.values())[0]
      : undefined);
  const resolvedReferences = new Set<string>();
  const unresolvedReferences = new Set<string>();
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    if (options.skipMesh?.(node)) {
      return;
    }
    ensurePlaceableMeshUvCoordinates(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    let didUpdateMaterial = false;
    let itemShieldBackerMaterial: THREE.Material | null = null;
    let itemShieldBackerTexture: THREE.Texture | undefined;
    materials.forEach((material) => {
      const materialContract = resolveAuroraMaterialContractForMaterial(
        material,
        auroraMaterialContractsByReference
      );
      const texture = resolveTextureForMaterial(
        material,
        texturesByReference,
        singleTextureFallback,
        auroraMaterialContractsByReference
      );
      const textureReferenceCandidates = resolveMaterialTextureReferences(material);
      const textureSlotReferenceCandidates = resolveMaterialTextureSlots(material).map(
        (slot) => `${slot.slot}:${slot.role}:${slot.reference}`
      );
      const expectedTextureReferences = deduplicateAliasPrefixes([
        ...textureReferenceCandidates,
        ...resolveMaterialTextureReferenceList(material),
        ...resolveMaterialTextureSlots(material).map((slot) => slot.reference)
      ]);
      expectedTextureReferences.forEach((reference) => {
        if (resolveTextureByReferenceCandidate(reference, texturesByReference)) {
          resolvedReferences.add(reference);
        } else if (!auroraMaterialContractsByReference.has(reference)) {
          unresolvedReferences.add(reference);
        }
      });
      const availableTextureReferences = Array.from(texturesByReference.keys()).sort(
        (left, right) => left.localeCompare(right)
      );
      const supportsTextureMap = materialSupportsTextureMap(material);
      const selectedTextureReference = texture
        ? resolveTextureReferenceForTexture(texture, texturesByReference)
        : undefined;
      let didUpdateThisMaterial = false;
      let customShaderInstalled = false;
      if (texture && supportsTextureMap) {
        applyTextureToMaterial(
          material,
          texture,
          selectedTextureReference
        );
        if (material.userData.auroraItemShieldBlackKeyMaterial === true) {
          itemShieldBackerMaterial = material;
          itemShieldBackerTexture = texture;
        }
        didUpdateThisMaterial = true;
      }
      if (materialContract) {
        applyAuroraMaterialContractToMaterial(material, materialContract);
        didUpdateThisMaterial = true;
        if (
          applyAuroraMaterialReplacementTexturesToMaterial(
            material,
            materialContract,
            texturesByReference
          )
        ) {
          didUpdateThisMaterial = true;
        }
      }
      if (
        applyAuroraTextureSlotsToMaterial(
          material,
          resolveAuroraMaterialTextureSlotsForMaterial(material, materialContract),
          texturesByReference
          )
        ) {
          didUpdateThisMaterial = true;
        }
      material.userData = {
        ...material.userData,
        auroraTextureApplicationStatus: texture
          ? supportsTextureMap
            ? "applied"
            : "unsupported-material"
          : "missing-texture",
        auroraTextureApplicationSelectedReference: selectedTextureReference ?? "",
        auroraTextureApplicationReferenceCandidates: textureReferenceCandidates,
        auroraTextureApplicationSlotReferenceCandidates: textureSlotReferenceCandidates,
        auroraTextureApplicationAvailableReferences: availableTextureReferences,
        auroraTextureApplicationSupportsMap: supportsTextureMap,
        auroraTextureApplicationMaterialType:
          material.type || material.constructor.name || "Material"
      };
      const textureBinding = texture
        ? resolveAuroraTextureBindingForMaterial(
            material,
            texture,
            texturesByReference,
            auroraTextureBindingsByReference
          )
        : null;
      material.userData = {
        ...material.userData,
        auroraTextureTxiSelectedTextureReference: selectedTextureReference ?? "",
        auroraTextureTxiAppliedReference: textureBinding?.txi
          ? normalizePlaceableTextureReference(textureBinding.reference)
          : "",
        auroraTextureTxiBindingStatus: textureBinding?.txi
          ? "applied-selected-texture-txi"
          : textureBinding
            ? "selected-texture-binding-without-txi"
            : "not-applied-no-selected-texture-txi"
      };
      if (texture && textureBinding?.txi && materialSupportsTextureMap(material)) {
        applyAuroraTextureTxiStateToMaterial(
          material,
          texture,
          textureBinding,
          texturesByReference
        );
        didUpdateThisMaterial = true;
      }
      if (materialContract) {
        const customShaderInstall = installAuroraMtrCustomShaderProgram({
          mesh: node,
          material,
          state: toPlaceableAuroraMtrCustomShaderState(materialContract.state),
          texturesBySlot: resolveAuroraMtrTexturesBySlot(
            materialContract.state.textureSlots,
            texturesByReference
          )
        });
        const customShaderMaterial =
          customShaderInstall.status === "installed"
            ? customShaderInstall.material
            : material;
        const customShaderInstallMetadata = {
          auroraMaterialCustomShaderInstallStatus: customShaderInstall.status,
          auroraMaterialCustomShaderInstallReason: customShaderInstall.reason
        };
        material.userData = { ...material.userData, ...customShaderInstallMetadata };
        customShaderMaterial.userData = {
          ...customShaderMaterial.userData,
          ...customShaderInstallMetadata
        };
        if (customShaderInstall.status === "installed") {
          customShaderInstalled = true;
          didUpdateThisMaterial = true;
        }
      }
      if (!customShaderInstalled) {
        if (material.userData.auroraTextureTxiDecal === true) {
          const txiDecalLighting = installAuroraTxiDecalUnlitWhite(material);
          didUpdateThisMaterial ||=
            txiDecalLighting.status !== "unsupported-material";
          if (material.userData.auroraTextureTxiBlending === "additive") {
            const rawGammaOutput =
              installAuroraTxiAdditiveDecalRawGammaOutput(material);
            didUpdateThisMaterial ||=
              rawGammaOutput.status !== "unsupported-material";
          }
        } else {
          const sourceMaterialLighting = installAuroraMdlSourceMaterialLighting(material);
          didUpdateThisMaterial ||= sourceMaterialLighting.status === "installed";
        }
      }
      didUpdateMaterial ||= didUpdateThisMaterial;
    });
    applyAuroraSourceMaterialColorAccumulationLaneToMesh(node, materials);
    if (itemShieldBackerMaterial) {
      ensureAuroraItemShieldBlackKeyBackerMesh(
        node,
        itemShieldBackerMaterial,
        itemShieldBackerTexture
      );
    }
      if (didUpdateMaterial) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
  });
  return {
    resolvedReferences: [...resolvedReferences].sort(),
    unresolvedReferences: [...unresolvedReferences].sort()
  };
}

function applyAuroraSourceMaterialColorAccumulationLaneToMesh(
  mesh: THREE.Mesh,
  materials: readonly THREE.Material[]
): void {
  const rawGammaAdditiveMaterialCount = materials.filter(
    (material) =>
      material.userData.auroraCanonicalColorAccumulationLane ===
      "aurora_raw_gamma_additive_before_retail_bloom"
  ).length;
  if (
    materials.length > 0 &&
    rawGammaAdditiveMaterialCount === materials.length
  ) {
    mesh.userData = {
      ...mesh.userData,
      auroraCanonicalColorAccumulationLane:
        "aurora_raw_gamma_additive_before_retail_bloom",
      auroraCanonicalColorAccumulationLaneSource:
        "source-txi-decal-additive-retail-gamma-framebuffer"
    };
  }
}

function resolveAuroraMaterialTextureSlotsForMaterial(
  material: THREE.Material,
  materialContract?: AuroraMaterialContractNode | null
): PlaceableRenderPackageAuroraTextureSlot[] {
  return deduplicateAuroraTextureSlots([
    ...(materialContract?.state.textureSlots ?? []),
    ...resolveMaterialTextureSlots(material)
  ]);
}

interface AuroraTextureSlotMaterial extends THREE.Material {
  normalMap?: THREE.Texture | null;
  normalScale?: THREE.Vector2;
  roughnessMap?: THREE.Texture | null;
  roughness?: number;
  metalness?: number;
  bumpMap?: THREE.Texture | null;
  bumpScale?: number;
  envMap?: THREE.Texture | null;
  envMapIntensity?: number;
  emissiveMap?: THREE.Texture | null;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
  specularMap?: THREE.Texture | null;
}

const auroraSpecularRoughnessTextureCache = new WeakMap<THREE.Texture, THREE.Texture>();

function copyAuroraTextureSamplingState(source: THREE.Texture, target: THREE.Texture): void {
  target.flipY = source.flipY;
  target.wrapS = source.wrapS;
  target.wrapT = source.wrapT;
  target.minFilter = source.minFilter;
  target.magFilter = source.magFilter;
  target.generateMipmaps = source.generateMipmaps;
  target.anisotropy = source.anisotropy;
}

function finalizeAuroraInvertedSpecularRoughnessTexture(
  source: THREE.Texture,
  target: THREE.Texture
): THREE.Texture {
  copyAuroraTextureSamplingState(source, target);
  target.colorSpace = THREE.LinearSRGBColorSpace;
  target.userData = {
    ...target.userData,
    auroraMtrSpecularInvertedToRoughness: true,
    auroraMtrSpecularSourceTextureName: source.name || undefined
  };
  target.needsUpdate = true;
  auroraSpecularRoughnessTextureCache.set(source, target);
  return target;
}

function invertAuroraSpecularDataTextureToRoughness(source: THREE.Texture): THREE.Texture | null {
  const image = source.image as
    | { data?: ArrayLike<number>; width?: number; height?: number }
    | undefined;
  const width = image?.width;
  const height = image?.height;
  const sourceData = image?.data;
  if (
    !sourceData ||
    typeof width !== "number" ||
    typeof height !== "number" ||
    width <= 0 ||
    height <= 0 ||
    sourceData.length < width * height * 4
  ) {
    return null;
  }
  const invertedData = new Uint8Array(width * height * 4);
  for (let index = 0; index < invertedData.length; index += 4) {
    invertedData[index] = 255 - Math.min(255, Math.max(0, Math.round(sourceData[index] ?? 0)));
    invertedData[index + 1] =
      255 - Math.min(255, Math.max(0, Math.round(sourceData[index + 1] ?? 0)));
    invertedData[index + 2] =
      255 - Math.min(255, Math.max(0, Math.round(sourceData[index + 2] ?? 0)));
    invertedData[index + 3] = Math.min(
      255,
      Math.max(0, Math.round(sourceData[index + 3] ?? 255))
    );
  }
  return finalizeAuroraInvertedSpecularRoughnessTexture(
    source,
    new THREE.DataTexture(invertedData, width, height, THREE.RGBAFormat)
  );
}

function invertAuroraSpecularCanvasTextureToRoughness(source: THREE.Texture): THREE.Texture | null {
  const rawImage = source.image as
    | ({ width?: unknown; height?: unknown } & CanvasImageSource)
    | undefined;
  const image = rawImage as CanvasImageSource | undefined;
  const width = typeof rawImage?.width === "number" ? rawImage.width : 0;
  const height = typeof rawImage?.height === "number" ? rawImage.height : 0;
  if (!image || width <= 0 || height <= 0 || typeof document === "undefined") {
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  try {
    context.drawImage(image, 0, 0);
    const imageData = context.getImageData(0, 0, width, height);
    for (let index = 0; index < imageData.data.length; index += 4) {
      imageData.data[index] = 255 - imageData.data[index];
      imageData.data[index + 1] = 255 - imageData.data[index + 1];
      imageData.data[index + 2] = 255 - imageData.data[index + 2];
    }
    context.putImageData(imageData, 0, 0);
  } catch {
    return null;
  }
  return finalizeAuroraInvertedSpecularRoughnessTexture(source, new THREE.CanvasTexture(canvas));
}

function invertAuroraSpecularTextureToRoughnessMap(source: THREE.Texture): THREE.Texture {
  const cached = auroraSpecularRoughnessTextureCache.get(source);
  if (cached) {
    return cached;
  }
  return (
    invertAuroraSpecularDataTextureToRoughness(source) ??
    invertAuroraSpecularCanvasTextureToRoughness(source) ??
    source
  );
}

function applyAuroraTextureSlotsToMaterial(
  material: THREE.Material,
  textureSlots: readonly PlaceableRenderPackageAuroraTextureSlot[],
  texturesByReference: Map<string, THREE.Texture>
): boolean {
  if (textureSlots.length === 0) {
    return false;
  }
  const slotMaterial = material as AuroraTextureSlotMaterial;
  const appliedRoles: string[] = [];
  const appliedReferences: string[] = [];
  const specularRoughnessReferences: string[] = [];

  textureSlots.forEach((slot) => {
    if (slot.role === "diffuse") {
      return;
    }
    const texture = resolveTextureByReferenceCandidate(slot.reference, texturesByReference);
    if (!texture) {
      return;
    }
    if (slot.role === "normal" && "normalMap" in slotMaterial) {
      slotMaterial.normalMap = texture;
      slotMaterial.normalScale?.set(1, 1);
    } else if (slot.role === "roughness" && "roughnessMap" in slotMaterial) {
      slotMaterial.roughnessMap = texture;
      slotMaterial.roughness = 1;
    } else if (slot.role === "height" && "bumpMap" in slotMaterial) {
      slotMaterial.bumpMap = texture;
      slotMaterial.bumpScale = 0.05;
    } else if (slot.role === "emissive" && "emissiveMap" in slotMaterial) {
      slotMaterial.emissiveMap = texture;
      slotMaterial.emissive?.set(0xffffff);
      slotMaterial.emissiveIntensity = 1;
    } else if (slot.role === "specular" && "roughnessMap" in slotMaterial) {
      slotMaterial.roughnessMap = invertAuroraSpecularTextureToRoughnessMap(texture);
      slotMaterial.roughness = 1;
      slotMaterial.metalness = 0;
      specularRoughnessReferences.push(slot.reference);
    } else if (slot.role === "specular" && "specularMap" in slotMaterial) {
      slotMaterial.specularMap = texture;
    } else {
      return;
    }
    appliedRoles.push(slot.role);
    appliedReferences.push(slot.reference);
  });

  if (appliedRoles.length === 0) {
    return false;
  }
  material.userData = {
    ...material.userData,
    auroraMaterialTextureSlotRoles: appliedRoles,
    auroraMaterialTextureSlotReferences: appliedReferences,
    ...(specularRoughnessReferences.length > 0
      ? {
          auroraMaterialSpecularRoughnessMode: "webviewer-inverted-specular",
          auroraMaterialSpecularRoughnessReferences: specularRoughnessReferences
        }
      : {})
  };
  material.needsUpdate = true;
  return true;
}

function applyAuroraMaterialReplacementTexturesToMaterial(
  material: THREE.Material,
  materialContract: AuroraMaterialContractNode,
  texturesByReference: Map<string, THREE.Texture>
): boolean {
  const state = materialContract.state;
  const references = {
    bumpmaptexture: state.bumpmaptexture,
    bumpyshinytexture: state.bumpyshinytexture,
    envmaptexture: state.envmaptexture,
    bumpreplacementtexture: state.bumpreplacementtexture
  };
  const authoredReferences = Object.entries(references).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  if (authoredReferences.length === 0) {
    return false;
  }

  const slotMaterial = material as AuroraTextureSlotMaterial;
  const bumpTexture = state.bumpmaptexture
    ? resolveTextureByReferenceCandidate(state.bumpmaptexture, texturesByReference)
    : undefined;
  const environmentTexture = state.envmaptexture
    ? resolveTextureByReferenceCandidate(state.envmaptexture, texturesByReference)
    : undefined;
  if (bumpTexture) {
    slotMaterial.bumpMap = bumpTexture;
  }
  if (environmentTexture) {
    slotMaterial.envMap = environmentTexture;
  }

  material.userData = {
    ...material.userData,
    auroraMaterialNamedTextureReferences: Object.fromEntries(authoredReferences),
    auroraMaterialBumpMapTextureBound: Boolean(bumpTexture),
    auroraMaterialEnvironmentMapTextureBound: Boolean(environmentTexture),
    auroraMaterialBumpyShinyTextureBindingStatus: state.bumpyshinytexture
      ? "source-reference-preserved-binding-unverified"
      : undefined,
    auroraMaterialBumpReplacementTextureBindingStatus: state.bumpreplacementtexture
      ? "source-reference-preserved-binding-unverified"
      : undefined
  };
  material.needsUpdate = true;
  return true;
}

function resolveAuroraMtrTexturesBySlot(
  textureSlots: readonly PlaceableRenderPackageAuroraTextureSlot[] | undefined,
  texturesByReference: Map<string, THREE.Texture>
): Map<number, THREE.Texture> {
  const texturesBySlot = new Map<number, THREE.Texture>();
  for (const slot of textureSlots ?? []) {
    if (slot.slot < 0 || slot.slot > 15) continue;
    const texture = resolveTextureByReferenceCandidate(slot.reference, texturesByReference);
    if (texture) texturesBySlot.set(slot.slot, texture);
  }
  return texturesBySlot;
}

function resolveTextureForMaterial(
  material: THREE.Material,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture: THREE.Texture | undefined,
  auroraMaterialContractsByReference: Map<string, AuroraMaterialContractNode> = new Map()
): THREE.Texture | undefined {
  const materialContract = resolveAuroraMaterialContractForMaterial(
    material,
    auroraMaterialContractsByReference
  );
  const materialContractSlots = materialContract?.state.textureSlots ?? [];
  let hasExplicitTextureSlots = materialContractSlots.length > 0;
  if (materialContractSlots.length > 0) {
    const texture = resolveTextureForAuroraTextureSlots(
      materialContractSlots,
      texturesByReference
    );
    if (texture) {
      return texture;
    }
  }

  const materialTextureSlots = resolveMaterialTextureSlots(material);
  hasExplicitTextureSlots ||= materialTextureSlots.length > 0;
  if (materialTextureSlots.length > 0) {
    const texture = resolveTextureForAuroraTextureSlots(
      materialTextureSlots,
      texturesByReference
    );
    if (texture) {
      return texture;
    }
  }

  const materialReferences = resolveMaterialTextureReferences(material);
  for (const reference of materialReferences) {
    const texture = resolveTextureByReferenceCandidate(reference, texturesByReference);
    if (texture) {
      return texture;
    }
  }
  const mtrBackedTexture = hasExplicitTextureSlots
    ? undefined
    : resolveTextureForAuroraMaterialContract(
        material,
        texturesByReference,
        auroraMaterialContractsByReference,
        materialContract
      );
  if (mtrBackedTexture) {
    return mtrBackedTexture;
  }
  if (materialReferences.length > 0) {
    return undefined;
  }
  return fallbackTexture;
}

function resolveTextureForAuroraMaterialContract(
  material: THREE.Material,
  texturesByReference: Map<string, THREE.Texture>,
  auroraMaterialContractsByReference: Map<string, AuroraMaterialContractNode>,
  resolvedMaterialContract?: AuroraMaterialContractNode | null
): THREE.Texture | undefined {
  const materialContract =
    resolvedMaterialContract ??
    resolveAuroraMaterialContractForMaterial(material, auroraMaterialContractsByReference);
  if (!materialContract) {
    return undefined;
  }
  const materialReferences = new Set(resolveMaterialTextureReferences(material));
  for (const reference of resolveMaterialTextureReferenceList(material)) {
    if (
      !reference ||
      materialReferences.has(reference) ||
      auroraMaterialContractsByReference.has(reference)
    ) {
      continue;
    }
    const texture = resolveTextureByReferenceCandidate(reference, texturesByReference);
    if (texture) {
      return texture;
    }
  }
  return undefined;
}

function resolveTextureForAuroraTextureSlots(
  textureSlots: readonly PlaceableRenderPackageAuroraTextureSlot[],
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  for (const reference of resolveAuroraDiffuseTextureSlotReferences(textureSlots)) {
    const texture = resolveTextureByReferenceCandidate(reference, texturesByReference);
    if (texture) {
      return texture;
    }
  }
  return undefined;
}

function resolveTextureByReferenceCandidate(
  reference: string,
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  const texture = texturesByReference.get(reference);
  if (texture) {
    return texture;
  }
  return resolveTextureByAuroraMaterialAlias(reference, texturesByReference);
}

function resolveTextureReferenceForTexture(
  texture: THREE.Texture,
  texturesByReference: Map<string, THREE.Texture>
): string | undefined {
  for (const [reference, candidate] of texturesByReference.entries()) {
    if (candidate === texture) {
      return reference;
    }
  }
  const userDataReference = texture.userData?.auroraTextureReference;
  return typeof userDataReference === "string" ? userDataReference : undefined;
}

function buildAuroraTextureBindingsByReference(
  textureBindings?: readonly AuroraTextureBindingNode[] | null
): Map<string, AuroraTextureBindingNode> {
  const bindingsByReference = new Map<string, AuroraTextureBindingNode>();
  textureBindings?.forEach((binding) => {
    [
      binding.reference,
      binding.fileName,
      binding.objectKey
    ].forEach((reference) => {
      const normalized = normalizePlaceableTextureReference(reference);
      if (normalized && !bindingsByReference.has(normalized)) {
        bindingsByReference.set(normalized, binding);
      }
    });
  });
  return bindingsByReference;
}

function resolveAuroraTextureBindingForMaterial(
  material: THREE.Material,
  texture: THREE.Texture,
  texturesByReference: Map<string, THREE.Texture>,
  textureBindingsByReference: Map<string, AuroraTextureBindingNode>
): AuroraTextureBindingNode | null {
  for (const reference of resolveMaterialTextureReferences(material)) {
    const textureBinding = textureBindingsByReference.get(reference);
    if (
      textureBinding &&
      doesAuroraTextureBindingBelongToTexture(
        textureBinding,
        texture,
        texturesByReference
      )
    ) {
      return textureBinding;
    }
  }

  const selectedTextureBindings = Array.from(
    new Set(textureBindingsByReference.values())
  ).filter((textureBinding) =>
    doesAuroraTextureBindingBelongToTexture(
      textureBinding,
      texture,
      texturesByReference
    )
  );
  return selectedTextureBindings.length === 1 ? selectedTextureBindings[0] : null;
}

function doesAuroraTextureBindingBelongToTexture(
  textureBinding: AuroraTextureBindingNode,
  texture: THREE.Texture,
  texturesByReference: Map<string, THREE.Texture>
): boolean {
  for (const reference of deduplicateAliasPrefixes([
    textureBinding.reference,
    textureBinding.fileName,
    textureBinding.objectKey
  ])) {
    if (resolveTextureByReferenceCandidate(reference, texturesByReference) === texture) {
      return true;
    }
  }
  return false;
}

function buildAuroraMaterialContractsByReference(
  auroraMaterial?: PlaceableRenderPackageAuroraMaterial | null
): Map<string, AuroraMaterialContractNode> {
  const contractsByReference = new Map<string, AuroraMaterialContractNode>();
  auroraMaterial?.materials.forEach((material) => {
    [
      material.materialFileName,
      material.materialObjectKey
    ].forEach((reference) => {
      const normalized = normalizePlaceableTextureReference(reference);
      if (normalized && !contractsByReference.has(normalized)) {
        contractsByReference.set(normalized, material);
      }
    });
  });
  return contractsByReference;
}

function resolveAuroraMaterialContractForMaterial(
  material: THREE.Material,
  auroraMaterialContractsByReference: Map<string, AuroraMaterialContractNode>
): AuroraMaterialContractNode | null {
  for (const reference of resolveMaterialTextureReferences(material)) {
    const materialContract = auroraMaterialContractsByReference.get(reference);
    if (materialContract) {
      return materialContract;
    }
  }
  return null;
}

function applyAuroraTextureTxiStateToMaterial(
  material: THREE.Material,
  texture: THREE.Texture,
  textureBinding: AuroraTextureBindingNode,
  texturesByReference: Map<string, THREE.Texture>
): void {
  const txi = textureBinding.txi;
  if (!txi) {
    return;
  }
  const cycleState = resolveAuroraTextureCycleState(txi);
  if (txi.decal) {
    material.transparent = true;
    material.depthWrite = false;
    material.alphaTest = 0;
  }
  if (txi.blending === "additive") {
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
    material.alphaTest = 0;
  } else if (txi.blending === "punchthrough") {
    material.transparent = false;
    material.depthWrite = true;
    material.alphaTest = Math.max(
      material.alphaTest,
      AURORA_PUNCH_THROUGH_ALPHA_DISCARD_THRESHOLD
    );
  }
  if (txi.clamp && txi.clamp > 0) {
    if (txi.clamp === 1 || txi.clamp === 3) {
      texture.wrapS = THREE.ClampToEdgeWrapping;
    }
    if (txi.clamp === 2 || txi.clamp === 3) {
      texture.wrapT = THREE.ClampToEdgeWrapping;
    }
    texture.needsUpdate = true;
  }
  if (txi.mipmap === false) {
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }
  if (txi.filter === false) {
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
  }
  const slotMaterial = material as AuroraTextureSlotMaterial;
  const bumpTexture = txi.bumpmaptexture
    ? resolveTextureByReferenceCandidate(txi.bumpmaptexture, texturesByReference)
    : undefined;
  if (bumpTexture && "bumpMap" in slotMaterial) {
    slotMaterial.bumpMap = bumpTexture;
    slotMaterial.bumpScale = 0.05;
  }
  const envTexture = txi.envmaptexture
    ? resolveTextureByReferenceCandidate(txi.envmaptexture, texturesByReference)
    : undefined;
  let envMapApplied = false;
  let envMapSkippedReason: string | undefined;
  if (envTexture && "envMap" in slotMaterial) {
    if (material instanceof THREE.MeshBasicMaterial) {
      envMapSkippedReason = "unlit-basic-material";
    } else {
      slotMaterial.envMap = envTexture;
      slotMaterial.envMapIntensity = 0.5;
      envMapApplied = true;
    }
  }
  if (cycleState) {
    ensureAuroraTextureCycleTextureState(texture, cycleState);
  }
  material.userData = {
    ...material.userData,
    auroraTextureTxiSource: textureBinding.fileName,
    auroraTextureTxiReference: textureBinding.reference,
    auroraTextureTxiDecal: txi.decal,
    auroraTextureTxiClamp: txi.clamp,
    auroraTextureTxiBlending: txi.blending,
    auroraTextureTxiMipmap: txi.mipmap,
    auroraTextureTxiFilter: txi.filter,
    auroraTextureTxiBumpMapTexture: txi.bumpmaptexture,
    auroraTextureTxiBumpMapApplied: Boolean(bumpTexture),
    auroraTextureTxiEnvMapTexture: txi.envmaptexture,
    auroraTextureTxiEnvMapApplied: envMapApplied,
    ...(envMapSkippedReason
      ? { auroraTextureTxiEnvMapSkippedReason: envMapSkippedReason }
      : {}),
    auroraTextureTxiProcedureType: txi.proceduretype,
    auroraTextureTxiNumX: cycleState?.numX ?? txi.numx,
    auroraTextureTxiNumY: cycleState?.numY ?? txi.numy,
    auroraTextureTxiFps: cycleState?.fps ?? txi.fps,
    ...(cycleState
      ? {
          auroraTextureTxiCycleActive: true,
          auroraTextureTxiCycleFrameCount: cycleState.totalFrames
        }
      : {})
  };
  material.needsUpdate = true;
}

function resolveAuroraTextureCycleState(
  txi: NonNullable<AuroraTextureBindingNode["txi"]>
): AuroraTextureCycleState | null {
  if (txi.proceduretype?.trim().toLowerCase() !== "cycle") {
    return null;
  }
  const numX = readAuroraTextureCyclePositiveInteger(txi.numx, 1);
  const numY = readAuroraTextureCyclePositiveInteger(txi.numy, 1);
  const fps = readAuroraTextureCyclePositiveNumber(txi.fps, 1);
  const totalFrames = numX * numY;
  if (totalFrames <= 1 || fps <= 0) {
    return null;
  }
  return {
    numX,
    numY,
    fps,
    totalFrames
  };
}

function readAuroraTextureCyclePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  const integer = Math.floor(value);
  return integer > 0 ? integer : fallback;
}

function readAuroraTextureCyclePositiveNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function applyAuroraTextureCycleFrame(
  texture: THREE.Texture,
  numX: number,
  numY: number,
  frameIndex: number
): void {
  const totalFrames = numX * numY;
  const boundedFrameIndex = Math.max(0, Math.trunc(frameIndex)) % totalFrames;
  const column = boundedFrameIndex % numX;
  const row = Math.floor(boundedFrameIndex / numX);
  texture.repeat.set(1 / numX, 1 / numY);
  texture.offset.set(column / numX, (numY - 1 - row) / numY);
  texture.needsUpdate = true;
}

function writeAuroraTextureCycleDiagnostics(
  texture: THREE.Texture,
  state: AuroraTextureCycleTextureState
): void {
  texture.userData = {
    ...texture.userData,
    auroraTextureTxiCycleFrameIndex: state.frameIndex,
    auroraTextureTxiCycleAccumulatorSeconds: state.accumulatorSeconds,
    auroraTextureTxiCycleLastRendererFrameSerial: state.lastRendererFrameSerial,
    auroraTextureTxiCycleUpdateCount: state.updateCount,
    auroraTextureTxiCycleRuntimeSource: AURORA_TEXTURE_CYCLE_RUNTIME_SOURCE
  };
}

function ensureAuroraTextureCycleTextureState(
  texture: THREE.Texture,
  cycleState: AuroraTextureCycleState
): AuroraTextureCycleTextureState {
  const existing = auroraTextureCycleTextureStates.get(texture);
  if (
    existing &&
    existing.numX === cycleState.numX &&
    existing.numY === cycleState.numY &&
    existing.fps === cycleState.fps
  ) {
    applyAuroraTextureCycleFrame(
      texture,
      existing.numX,
      existing.numY,
      existing.frameIndex
    );
    writeAuroraTextureCycleDiagnostics(texture, existing);
    return existing;
  }
  const state: AuroraTextureCycleTextureState = {
    ...cycleState,
    frameIndex: 0,
    accumulatorSeconds: 0,
    lastRendererFrameSerial: null,
    updateCount: 0
  };
  auroraTextureCycleTextureStates.set(texture, state);
  applyAuroraTextureCycleFrame(texture, state.numX, state.numY, state.frameIndex);
  writeAuroraTextureCycleDiagnostics(texture, state);
  return state;
}

function advanceAuroraTextureCycleTexture(
  binding: AuroraTextureCycleBinding,
  deltaSeconds: number | undefined,
  rendererFrameSerial: number | undefined
): void {
  const state = ensureAuroraTextureCycleTextureState(binding.texture, {
    numX: binding.numX,
    numY: binding.numY,
    fps: binding.fps,
    totalFrames: binding.numX * binding.numY
  });
  if (typeof deltaSeconds !== "number" || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0) {
    return;
  }
  const hasRendererFrameSerial =
    typeof rendererFrameSerial === "number" && Number.isFinite(rendererFrameSerial);
  if (hasRendererFrameSerial && state.lastRendererFrameSerial === rendererFrameSerial) {
    return;
  }
  if (hasRendererFrameSerial) {
    state.lastRendererFrameSerial = rendererFrameSerial;
  }
  state.accumulatorSeconds += deltaSeconds;
  if (1 / state.fps < state.accumulatorSeconds) {
    state.accumulatorSeconds = 0;
    state.frameIndex = (state.frameIndex + 1) % state.totalFrames;
    state.updateCount += 1;
    applyAuroraTextureCycleFrame(
      binding.texture,
      state.numX,
      state.numY,
      state.frameIndex
    );
  }
  writeAuroraTextureCycleDiagnostics(binding.texture, state);
}

function readAuroraTextureCycleUserDataNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function collectAuroraTextureCycleMaterials(root: THREE.Object3D): {
  bindings: AuroraTextureCycleBinding[];
  materialCount: number;
} {
  const bindingsByTexture = new Map<THREE.Texture, AuroraTextureCycleBinding>();
  let materialCount = 0;
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!materialSupportsTextureMap(material) || !material.map) {
        return;
      }
      const userData = material.userData ?? {};
      const procedureType = String(userData.auroraTextureTxiProcedureType ?? "").toLowerCase();
      if (procedureType !== "cycle" && userData.auroraTextureTxiCycleActive !== true) {
        return;
      }
      const numX = readAuroraTextureCyclePositiveInteger(
        readAuroraTextureCycleUserDataNumber(userData.auroraTextureTxiNumX),
        1
      );
      const numY = readAuroraTextureCyclePositiveInteger(
        readAuroraTextureCycleUserDataNumber(userData.auroraTextureTxiNumY),
        1
      );
      const fps = readAuroraTextureCyclePositiveNumber(
        readAuroraTextureCycleUserDataNumber(userData.auroraTextureTxiFps),
        1
      );
      if (numX * numY <= 1 || fps <= 0) {
        return;
      }
      materialCount += 1;
      const reference =
        typeof userData.auroraTextureTxiReference === "string"
          ? userData.auroraTextureTxiReference
          : "";
      const existing = bindingsByTexture.get(material.map);
      if (existing) {
        return;
      }
      bindingsByTexture.set(material.map, {
        texture: material.map,
        numX,
        numY,
        fps,
        reference
      });
    });
  });
  return {
    bindings: Array.from(bindingsByTexture.values()),
    materialCount
  };
}

export function createAuroraTextureCycleRuntime(
  root: THREE.Object3D
): AuroraTextureCycleRuntime | null {
  const { bindings, materialCount } = collectAuroraTextureCycleMaterials(root);
  if (bindings.length === 0) {
    return null;
  }
  const references = Array.from(
    new Set(bindings.map((binding) => binding.reference).filter((reference) => reference.length > 0))
  ).sort((left, right) => left.localeCompare(right));
  return {
    materialCount,
    textureCount: bindings.length,
    references,
    apply(
      deltaSeconds?: number,
      _elapsedSeconds?: number,
      rendererFrameSerial?: number
    ): void {
      bindings.forEach((binding) => {
        advanceAuroraTextureCycleTexture(binding, deltaSeconds, rendererFrameSerial);
      });
    },
    snapshots(): AuroraTextureCycleRuntimeSnapshot[] {
      return bindings.map((binding) => {
        const state = ensureAuroraTextureCycleTextureState(binding.texture, {
          numX: binding.numX,
          numY: binding.numY,
          fps: binding.fps,
          totalFrames: binding.numX * binding.numY
        });
        return {
          reference: binding.reference,
          numX: state.numX,
          numY: state.numY,
          fps: state.fps,
          frameIndex: state.frameIndex,
          accumulatorSeconds: state.accumulatorSeconds,
          lastRendererFrameSerial: state.lastRendererFrameSerial,
          frameAdvanceCount: state.updateCount,
          source: AURORA_TEXTURE_CYCLE_RUNTIME_SOURCE
        };
      });
    }
  };
}

function applyAuroraMaterialContractToMaterial(
  material: THREE.Material,
  materialContract: AuroraMaterialContractNode
): void {
  const state = materialContract.state;
  const framebufferRuntimeLane = resolveAuroraMaterialFramebufferRuntimeLane(
    state.sampleFramebuffer,
    state.volumetric
  );
  const slotMaterial = material as AuroraTextureSlotMaterial;
  const hasCustomShaderReference = Boolean(
    state.customShaderVS?.trim() ||
      state.customShaderFS?.trim() ||
      state.customShaderGS?.trim()
  );
  const customShaderProgramExecutionStatus = !hasCustomShaderReference
    ? "not-requested"
    : state.customShaderProgram?.status === "complete"
      ? "source-graph-ready-renderer-profile-and-binding-pending"
      : "source-graph-incomplete-execution-refused";
  if (typeof state.roughness === "number" && Number.isFinite(state.roughness)) {
    slotMaterial.roughness = Math.min(1, Math.max(0, state.roughness));
  }
  if (typeof state.specularity === "number" && Number.isFinite(state.specularity)) {
    slotMaterial.metalness = Math.min(0.3, Math.max(0, state.specularity * 0.2));
  }
  if (state.transparency) {
    material.transparent = true;
  }
  if (state.twoSided) {
    material.side = THREE.DoubleSide;
  }
  if (state.blending === "additive") {
    material.transparent = true;
    material.depthWrite = false;
    material.blending = THREE.AdditiveBlending;
  } else if (state.blending === "punchthrough") {
    material.transparent = false;
    material.alphaTest = Math.max(
      material.alphaTest,
      AURORA_PUNCH_THROUGH_ALPHA_DISCARD_THRESHOLD
    );
    material.depthWrite = true;
  }
  if (state.decal) {
    material.transparent = true;
    material.depthWrite = false;
    material.side = THREE.DoubleSide;
    material.alphaTest = 0;
    material.polygonOffset = true;
    material.polygonOffsetFactor = -1;
    material.polygonOffsetUnits = -1;
  }
  material.userData = {
    ...material.userData,
    auroraMaterialContractSource: materialContract.materialFileName,
    auroraMaterialCustomShaderVS: state.customShaderVS,
    auroraMaterialCustomShaderFS: state.customShaderFS,
    auroraMaterialCustomShaderGS: state.customShaderGS,
    auroraMaterialCustomShaderProgramStatus: state.customShaderProgram?.status,
    auroraMaterialCustomShaderReachableSourceCount: state.customShaderProgram?.sources.length,
    auroraMaterialCustomShaderUnresolvedRefs: state.customShaderProgram
      ? [...state.customShaderProgram.unresolvedRefs]
      : undefined,
    auroraMaterialCustomShaderExecutionStatus: customShaderProgramExecutionStatus,
    auroraMaterialShaderParameters: state.parameters?.map((parameter) => ({
      name: parameter.name,
      kind: parameter.kind,
      values: [...parameter.values],
      arity: parameter.arity
    })),
    auroraMaterialSampleFramebuffer: state.sampleFramebuffer,
    auroraMaterialVolumetric: state.volumetric,
    auroraMaterialFramebufferRuntimeLane: framebufferRuntimeLane,
    auroraMaterialFramebufferStateStatus:
      framebufferRuntimeLane === null
        ? "default-material-render-lane"
        : "source-pass-confirmed-custom-program-execution-pending",
    auroraMaterialFramebufferStateDiagnostic:
      framebufferRuntimeLane === null
        ? undefined
        : "VFX_MTR_CUSTOM_SHADER_PROGRAM_EXECUTION_REQUIRED",
    auroraMaterialFramebufferCaptureScope:
      framebufferRuntimeLane === null ? undefined : "mainscene",
    auroraMaterialFramebufferCaptureSource:
      framebufferRuntimeLane === null ? undefined : "active-framebuffer-slot-at-renderer+0x54c",
    auroraMaterialFramebufferCaptureDestinationSlot:
      framebufferRuntimeLane === 5 ? 1 : framebufferRuntimeLane === 6 ? 6 : undefined,
    auroraMaterialFramebufferAttachmentBindingMask:
      framebufferRuntimeLane === null ? undefined : 3,
    auroraMaterialFramebufferColorTextureUnit:
      framebufferRuntimeLane === null ? undefined : 11,
    auroraMaterialFramebufferDepthTextureUnit:
      framebufferRuntimeLane === null ? undefined : 12,
    auroraMaterialFramebufferPassSource:
      framebufferRuntimeLane === null
        ? undefined
        : "nwtoolset-1.5.0.5-mtr-framebuffer-pass-disassembly",
    auroraMaterialRoughness: state.roughness,
    auroraMaterialSpecularity: state.specularity,
    auroraMaterialSpecularityMetalness:
      typeof state.specularity === "number" && Number.isFinite(state.specularity)
        ? slotMaterial.metalness
        : undefined,
    auroraMaterialBlending: state.blending,
    auroraMaterialPunchThroughAlphaDiscardValue:
      state.blending === "punchthrough"
        ? AURORA_PUNCH_THROUGH_ALPHA_DISCARD_THRESHOLD
        : undefined,
    auroraMaterialPunchThroughAlphaDiscardSource:
      state.blending === "punchthrough"
        ? "nwtoolset-1.5.0.5-fAlphaDiscardValue-state1-disassembly"
        : undefined,
    auroraMaterialDecal: state.decal,
    auroraMaterialTransparency: state.transparency,
    auroraMaterialTwoSided: state.twoSided,
    auroraMaterialRenderHint: state.renderHint
  };
  material.needsUpdate = true;
}

function resolveAuroraMaterialFramebufferRuntimeLane(
  sampleFramebuffer: number | undefined,
  volumetric: boolean | undefined
): 5 | 6 | null {
  if (sampleFramebuffer === 2) return 6;
  if (sampleFramebuffer === 1 || volumetric === true) return 5;
  return null;
}

function resolveTextureByAuroraMaterialAlias(
  reference: string,
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  const normalized = normalizePlaceableTextureReference(reference);
  if (!normalized) {
    return undefined;
  }

  const bare = normalized.replace(/^mtr_/u, "");
  const normalizedMaxResRef =
    normalized.length > 16 ? normalized.slice(0, 16) : null;
  const bareMaxResRef = bare.length > 16 ? bare.slice(0, 16) : null;
  const candidates = deduplicateAliasPrefixes([
    normalized,
    bare,
    normalizedMaxResRef,
    bareMaxResRef,
    normalized.startsWith("mtr_") ? `tex_${bare}` : null
  ]);

  for (const prefix of candidates) {
    const preferred = texturesByReference.get(`${prefix}_d`);
    if (preferred) {
      return preferred;
    }
    const exact = texturesByReference.get(prefix);
    if (exact) {
      return exact;
    }
  }

  return undefined;
}

function deduplicateAliasPrefixes(values: Array<string | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value) => {
    const normalized = value?.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) {
      return;
    }
    seen.add(normalized);
    result.push(normalized);
  });
  return result;
}

function resolveMaterialTextureSlots(
  material: THREE.Material
): PlaceableRenderPackageAuroraTextureSlot[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  return deduplicateAuroraTextureSlots([
    ...readAuroraTextureSlots(aurora?.textureSlots),
    ...readAuroraTextureSlots(userData.textureSlots)
  ]);
}

function readAuroraTextureSlots(value: unknown): PlaceableRenderPackageAuroraTextureSlot[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const textureSlots: PlaceableRenderPackageAuroraTextureSlot[] = [];
  value.forEach((entry) => {
    const record = asRecord(entry);
    if (!record) {
      return;
    }
    const rawSlot = record.slot;
    const slot =
      typeof rawSlot === "number"
        ? rawSlot
        : typeof rawSlot === "string"
          ? Number.parseInt(rawSlot, 10)
          : Number.NaN;
    const reference =
      typeof record.reference === "string"
        ? normalizePlaceableTextureReference(record.reference)
        : "";
    if (!Number.isInteger(slot) || slot < 0 || !reference) {
      return;
    }
    const role = typeof record.role === "string" ? record.role.toLowerCase() : "";
    textureSlots.push({
      slot,
      role: resolveAuroraTextureSlotRole(slot, role),
      reference
    });
  });
  return textureSlots;
}

function resolveAuroraDiffuseTextureSlotReferences(
  textureSlots: readonly PlaceableRenderPackageAuroraTextureSlot[]
): string[] {
  const references = textureSlots
    .filter(
      (slot) =>
        slot.slot === AURORA_DIFFUSE_TEXTURE_SLOT ||
        slot.role.toLowerCase() === "diffuse"
    )
    .map((slot) => slot.reference);
  return references.filter(
    (reference, index, all) => reference.length > 0 && all.indexOf(reference) === index
  );
}

function deduplicateAuroraTextureSlots(
  textureSlots: PlaceableRenderPackageAuroraTextureSlot[]
): PlaceableRenderPackageAuroraTextureSlot[] {
  const bySlot = new Map<number, PlaceableRenderPackageAuroraTextureSlot>();
  textureSlots.forEach((slot) => {
    bySlot.set(slot.slot, slot);
  });
  return [...bySlot.values()].sort((left, right) => left.slot - right.slot);
}

function resolveAuroraTextureSlotRole(
  slot: number,
  role: string
): PlaceableRenderPackageAuroraTextureSlot["role"] {
  if (
    role === "diffuse" ||
    role === "normal" ||
    role === "specular" ||
    role === "roughness" ||
    role === "height" ||
    role === "emissive" ||
    role === "unknown"
  ) {
    return role;
  }
  if (slot === 0) {
    return "diffuse";
  }
  if (slot === 1) {
    return "normal";
  }
  if (slot === 2) {
    return "specular";
  }
  if (slot === 3) {
    return "roughness";
  }
  if (slot === 4) {
    return "height";
  }
  if (slot === 5) {
    return "emissive";
  }
  return "unknown";
}

function resolveMaterialTextureReferences(material: THREE.Material): string[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  const references: string[] = [];
  const primaryTextureReference = userData.auroraPrimaryTextureReference;
  if (typeof primaryTextureReference === "string") {
    references.push(primaryTextureReference);
  }
  const textureReference = aurora ? aurora.textureReference : undefined;
  if (typeof textureReference === "string") {
    references.push(textureReference);
  }
  const directTextureReference = userData.textureReference;
  if (typeof directTextureReference === "string") {
    references.push(directTextureReference);
  }
  const materialNameMatch = material.name.match(/^Aurora material\s+(.+)$/iu);
  if (materialNameMatch?.[1]) {
    references.push(materialNameMatch[1]);
  }
  return references
    .map(normalizePlaceableTextureReference)
    .filter((reference, index, all) => reference.length > 0 && all.indexOf(reference) === index);
}

function resolveMaterialTextureReferenceList(material: THREE.Material): string[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  const references: string[] = [];
  const textureReferences = aurora ? aurora.textureReferences : undefined;
  if (Array.isArray(textureReferences)) {
    textureReferences.forEach((reference) => {
      if (typeof reference === "string") {
        references.push(reference);
      }
    });
  }
  const directTextureReferences = userData.textureReferences;
  if (Array.isArray(directTextureReferences)) {
    directTextureReferences.forEach((reference) => {
      if (typeof reference === "string") {
        references.push(reference);
      }
    });
  }
  return references
    .map(normalizePlaceableTextureReference)
    .filter((reference, index, all) => reference.length > 0 && all.indexOf(reference) === index);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readAuroraRenderFlag(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readAuroraMdlRenderFlagFromUserData(
  userData: Record<string, unknown> | undefined
): number | undefined {
  const aurora = asRecord(userData?.aurora);
  const auroraMaterial = asRecord(aurora?.material);
  return readAuroraRenderFlag(auroraMaterial?.render ?? aurora?.render ?? userData?.render);
}

function readAuroraMdlRenderFlagForMesh(mesh: THREE.Mesh): number | undefined {
  return (
    readAuroraMdlRenderFlagFromUserData(mesh.userData) ??
    readAuroraMdlRenderFlagFromUserData(mesh.geometry.userData) ??
    (Array.isArray(mesh.material)
      ? mesh.material
          .map((material) => readAuroraMdlRenderFlagFromUserData(material.userData))
          .find((renderFlag) => typeof renderFlag === "number")
      : readAuroraMdlRenderFlagFromUserData(mesh.material.userData))
  );
}

function readAuroraMdlStringFromUserData(
  userData: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const aurora = asRecord(userData?.aurora);
  const value = aurora?.[key] ?? userData?.[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim().toLowerCase()
    : undefined;
}

function readAuroraMdlSourceNodeTypeForMesh(mesh: THREE.Mesh): string | undefined {
  return (
    readAuroraMdlStringFromUserData(mesh.userData, "sourceNodeType") ??
    readAuroraMdlStringFromUserData(mesh.geometry.userData, "sourceNodeType") ??
    (Array.isArray(mesh.material)
      ? mesh.material
          .map((material) => readAuroraMdlStringFromUserData(material.userData, "sourceNodeType"))
          .find((nodeType) => typeof nodeType === "string")
      : readAuroraMdlStringFromUserData(mesh.material.userData, "sourceNodeType"))
  );
}

function readAuroraMdlSourceMeshForMesh(mesh: THREE.Mesh): string | undefined {
  return (
    readAuroraMdlStringFromUserData(mesh.userData, "sourceMesh") ??
    readAuroraMdlStringFromUserData(mesh.geometry.userData, "sourceMesh") ??
    (Array.isArray(mesh.material)
      ? mesh.material
          .map((material) => readAuroraMdlStringFromUserData(material.userData, "sourceMesh"))
          .find((sourceMesh) => typeof sourceMesh === "string")
      : readAuroraMdlStringFromUserData(mesh.material.userData, "sourceMesh"))
  );
}

function isAuroraMdlEmitterProxyMesh(mesh: THREE.Mesh): boolean {
  const sourceNodeType = readAuroraMdlSourceNodeTypeForMesh(mesh);
  const sourceMesh = readAuroraMdlSourceMeshForMesh(mesh);
  return (
    sourceNodeType === "emitter" ||
    sourceMesh === "emitter_proxy" ||
    mesh.name.trim().toLowerCase() === "emitter_proxy"
  );
}

function applyAuroraMdlRenderFlags(scene: THREE.Object3D): {
  suppressedMeshCount: number;
  suppressedMeshNames: string[];
  emitterProxySuppressedMeshCount: number;
  emitterProxySuppressedMeshNames: string[];
} {
  let suppressedMeshCount = 0;
  const suppressedMeshNames: string[] = [];
  let emitterProxySuppressedMeshCount = 0;
  const emitterProxySuppressedMeshNames: string[] = [];
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const renderFlag = readAuroraMdlRenderFlagForMesh(node);
    const isEmitterProxy = isAuroraMdlEmitterProxyMesh(node);
    if (renderFlag !== 0 && !isEmitterProxy) {
      return;
    }
    suppressAuroraMdlMeshGeometryRender(node);
    suppressedMeshCount += 1;
    if (node.name) {
      suppressedMeshNames.push(node.name);
    }
    if (isEmitterProxy) {
      emitterProxySuppressedMeshCount += 1;
      if (node.name) {
        emitterProxySuppressedMeshNames.push(node.name);
      }
    }
    node.userData = {
      ...node.userData,
      ...(typeof renderFlag === "number" ? { auroraMdlRenderFlag: renderFlag } : {}),
      auroraMdlRenderSuppressed: true,
      ...(isEmitterProxy
        ? {
            auroraMdlEmitterProxyRenderSuppressed: true,
            auroraMdlEmitterProxySourceNodeType:
              readAuroraMdlSourceNodeTypeForMesh(node) ?? null,
            auroraMdlEmitterProxySourceMesh: readAuroraMdlSourceMeshForMesh(node) ?? null
          }
        : {})
    };
  });
  if (suppressedMeshCount > 0) {
    scene.userData = {
      ...scene.userData,
      auroraMdlRenderSuppressedMeshCount: suppressedMeshCount,
      auroraMdlRenderSuppressedMeshNames: suppressedMeshNames,
      ...(emitterProxySuppressedMeshCount > 0
        ? {
            auroraMdlEmitterProxySuppressedMeshCount:
              emitterProxySuppressedMeshCount,
            auroraMdlEmitterProxySuppressedMeshNames:
              emitterProxySuppressedMeshNames
          }
        : {})
    };
  }
  return {
    suppressedMeshCount,
    suppressedMeshNames,
    emitterProxySuppressedMeshCount,
    emitterProxySuppressedMeshNames
  };
}

function suppressAuroraMdlMeshGeometryRender(mesh: THREE.Mesh): void {
  const suppressMaterial = (material: THREE.Material): THREE.Material => {
    const clone = material.clone();
    clone.visible = false;
    clone.userData = {
      ...clone.userData,
      auroraMdlRenderSuppressed: true,
      auroraMdlRenderSuppressedMaterialClone: true
    };
    clone.needsUpdate = true;
    return clone;
  };

  mesh.visible = true;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.material = Array.isArray(mesh.material)
    ? mesh.material.map(suppressMaterial)
    : suppressMaterial(mesh.material);
}

function prepareClonedPlaceableModelResources(
  model: THREE.Object3D,
  options: { cloneMaterials: boolean }
): void {
  const cloneMaterial = (material: THREE.Material): THREE.Material => {
    const cloned = material.clone();
    delete cloned.userData[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG];
    return cloned;
  };
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.geometry.userData = {
      ...node.geometry.userData,
      [PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG]: true
    };
    if (!options.cloneMaterials) {
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        material.userData = {
          ...material.userData,
          [PLACEABLE_SHARED_MODEL_MATERIAL_FLAG]: true
        };
      });
      return;
    }
    if (Array.isArray(node.material)) {
      node.material = node.material.map((material) => cloneMaterial(material));
      return;
    }
    node.material = cloneMaterial(node.material);
  });
}

function resolvePlaceableModelRuntimeCacheKey(modelUrl: string, cacheKey?: string | null): string {
  const normalizedCacheKey = cacheKey?.trim();
  return normalizedCacheKey && normalizedCacheKey.length > 0 ? normalizedCacheKey : modelUrl;
}

function resolvePlaceableModelRuntimeCacheKeyWithOptions(
  modelUrl: string,
  options: { cacheKey?: string | null; sourceHierarchyMode?: PlaceableModelSourceHierarchyMode } = {}
): string {
  const baseKey = resolvePlaceableModelRuntimeCacheKey(modelUrl, options.cacheKey);
  return options.sourceHierarchyMode === "preserve-loaded"
    ? `${baseKey}|sourceHierarchy:preserve-loaded`
    : baseKey;
}

const PLACEABLE_MODEL_ANIMATION_CLIPS_USER_DATA_KEY = "auroraGltfAnimationClips";
const placeableModelAnimationClipsByModel = new WeakMap<
  THREE.Object3D,
  readonly THREE.AnimationClip[]
>();

type AuroraAnimationClipWithUserData = THREE.AnimationClip & {
  userData?: Record<string, unknown>;
};

function writePlaceableModelAnimationClips(
  model: THREE.Object3D,
  clips: readonly THREE.AnimationClip[]
): void {
  placeableModelAnimationClipsByModel.set(model, clips);
  Object.defineProperty(model.userData, PLACEABLE_MODEL_ANIMATION_CLIPS_USER_DATA_KEY, {
    configurable: true,
    enumerable: false,
    value: clips,
    writable: true
  });
}

export function readPlaceableModelAnimationClips(
  model: THREE.Object3D
): THREE.AnimationClip[] {
  const clips =
    model.userData?.[PLACEABLE_MODEL_ANIMATION_CLIPS_USER_DATA_KEY] ??
    placeableModelAnimationClipsByModel.get(model);
  if (!Array.isArray(clips)) {
    return [];
  }
  return clips.filter((clip): clip is THREE.AnimationClip => clip instanceof THREE.AnimationClip);
}

function readAuroraAnimationClipUserData(
  clip: THREE.AnimationClip
): Record<string, unknown> {
  const clipWithUserData = clip as AuroraAnimationClipWithUserData;
  if (!clipWithUserData.userData) {
    clipWithUserData.userData = {};
  }
  return clipWithUserData.userData;
}

export function isAuroraSupermodelRetargetedAnimationClip(
  clip: THREE.AnimationClip
): boolean {
  return (
    (clip as AuroraAnimationClipWithUserData).userData?.[
      AURORA_SUPERMODEL_RETARGETED_CLIP_USER_DATA_KEY
    ] === true
  );
}

function writeAuroraAnimationClipDanglymeshOverrides(
  clip: THREE.AnimationClip,
  overrides: readonly AuroraGltfSourceAnimationDanglymeshOverride[]
): void {
  if (overrides.length === 0) {
    return;
  }
  const userData = readAuroraAnimationClipUserData(clip);
  userData[AURORA_DANGLYMESH_ANIMATION_OVERRIDES_USER_DATA_KEY] = overrides.map(
    (override) => ({
      nodeName: override.nodeName,
      ...(typeof override.displacement === "number"
        ? { displacement: override.displacement }
        : {}),
      ...(typeof override.period === "number" ? { period: override.period } : {}),
      ...(typeof override.tightness === "number" ? { tightness: override.tightness } : {})
    })
  );
}

function readAuroraAnimationClipDanglymeshOverrides(
  clip: THREE.AnimationClip
): AuroraGltfSourceAnimationDanglymeshOverride[] {
  const userData = (clip as AuroraAnimationClipWithUserData).userData;
  const rawOverrides = userData?.[AURORA_DANGLYMESH_ANIMATION_OVERRIDES_USER_DATA_KEY];
  if (!Array.isArray(rawOverrides)) {
    return [];
  }
  return rawOverrides.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    if (!record || !nodeName) {
      return [];
    }
    const displacement = readAuroraSourceOptionalFiniteNumber(record.displacement);
    const period = readAuroraSourceOptionalFiniteNumber(record.period);
    const tightness = readAuroraSourceOptionalFiniteNumber(record.tightness);
    if (
      typeof displacement !== "number" &&
      typeof period !== "number" &&
      typeof tightness !== "number"
    ) {
      return [];
    }
    return [{
      nodeName,
      ...(typeof displacement === "number" ? { displacement } : {}),
      ...(typeof period === "number" ? { period } : {}),
      ...(typeof tightness === "number" ? { tightness } : {})
    }];
  });
}

function writeAuroraAnimationClipAnimmeshUvAnimations(
  clip: THREE.AnimationClip,
  animations: readonly AuroraGltfSourceAnimationAnimmeshUv[]
): void {
  if (animations.length === 0) {
    return;
  }
  const userData = readAuroraAnimationClipUserData(clip);
  userData[AURORA_ANIMMESH_UV_ANIMATIONS_USER_DATA_KEY] = animations.map(
    (animation) => ({
      nodeName: animation.nodeName,
      samplePeriod: animation.samplePeriod,
      animTverts: animation.animTverts.map((entry) => [entry[0], entry[1]])
    })
  );
}

function readAuroraAnimationClipAnimmeshUvAnimations(
  clip: THREE.AnimationClip
): AuroraGltfSourceAnimationAnimmeshUv[] {
  const userData = (clip as AuroraAnimationClipWithUserData).userData;
  const rawAnimations = userData?.[AURORA_ANIMMESH_UV_ANIMATIONS_USER_DATA_KEY];
  if (!Array.isArray(rawAnimations)) {
    return [];
  }
  return rawAnimations.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    const samplePeriod = readAuroraSourceOptionalFiniteNumber(record?.samplePeriod);
    const animTverts = readAuroraGltfVec2List(record?.animTverts);
    if (!record || !nodeName || typeof samplePeriod !== "number" || animTverts.length === 0) {
      return [];
    }
    return [{
      nodeName,
      samplePeriod,
      animTverts
    }];
  });
}

function writeAuroraAnimationClipAnimmeshVertexAnimations(
  clip: THREE.AnimationClip,
  animations: readonly AuroraGltfSourceAnimationAnimmeshVertex[]
): void {
  if (animations.length === 0) {
    return;
  }
  const userData = readAuroraAnimationClipUserData(clip);
  userData[AURORA_ANIMMESH_VERTEX_ANIMATIONS_USER_DATA_KEY] = animations.map(
    (animation) => ({
      nodeName: animation.nodeName,
      samplePeriod: animation.samplePeriod,
      animVerts: animation.animVerts.map((entry) => [entry[0], entry[1], entry[2]])
    })
  );
}

function readAuroraAnimationClipAnimmeshVertexAnimations(
  clip: THREE.AnimationClip
): AuroraGltfSourceAnimationAnimmeshVertex[] {
  const userData = (clip as AuroraAnimationClipWithUserData).userData;
  const rawAnimations = userData?.[AURORA_ANIMMESH_VERTEX_ANIMATIONS_USER_DATA_KEY];
  if (!Array.isArray(rawAnimations)) {
    return [];
  }
  return rawAnimations.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    const samplePeriod = readAuroraSourceOptionalFiniteNumber(record?.samplePeriod);
    const animVerts = readAuroraGltfVec3List(record?.animVerts);
    if (!record || !nodeName || typeof samplePeriod !== "number" || animVerts.length === 0) {
      return [];
    }
    return [{
      nodeName,
      samplePeriod,
      animVerts
    }];
  });
}

function writeAuroraAnimationClipAlphaAnimations(
  clip: THREE.AnimationClip,
  animations: readonly AuroraGltfSourceAnimationAlpha[]
): void {
  if (animations.length === 0) {
    return;
  }
  const userData = readAuroraAnimationClipUserData(clip);
  userData[AURORA_ALPHA_ANIMATIONS_USER_DATA_KEY] = animations.map((animation) => ({
    nodeName: animation.nodeName,
    alphaKeys: animation.alphaKeys.map((key) => ({
      time: key.time,
      value: key.value
    }))
  }));
}

function readAuroraAnimationClipAlphaAnimations(
  clip: THREE.AnimationClip
): AuroraGltfSourceAnimationAlpha[] {
  const userData = (clip as AuroraAnimationClipWithUserData).userData;
  const rawAnimations = userData?.[AURORA_ALPHA_ANIMATIONS_USER_DATA_KEY];
  if (!Array.isArray(rawAnimations)) {
    return [];
  }
  return rawAnimations.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    const alphaKeys = readAuroraGltfScalarKeys(record?.alphaKeys);
    if (!record || !nodeName || alphaKeys.length === 0) {
      return [];
    }
    return [{
      nodeName,
      alphaKeys
    }];
  });
}

function writeAuroraAnimationClipSelfIllumColorAnimations(
  clip: THREE.AnimationClip,
  animations: readonly AuroraGltfSourceAnimationSelfIllumColor[]
): void {
  if (animations.length === 0) {
    return;
  }
  const userData = readAuroraAnimationClipUserData(clip);
  userData[AURORA_SELF_ILLUM_COLOR_ANIMATIONS_USER_DATA_KEY] = animations.map(
    (animation) => ({
      nodeName: animation.nodeName,
      selfIllumColorKeys: animation.selfIllumColorKeys.map((key) => ({
        time: key.time,
        value: [key.value[0], key.value[1], key.value[2]]
      }))
    })
  );
}

function readAuroraAnimationClipSelfIllumColorAnimations(
  clip: THREE.AnimationClip
): AuroraGltfSourceAnimationSelfIllumColor[] {
  const userData = (clip as AuroraAnimationClipWithUserData).userData;
  const rawAnimations = userData?.[AURORA_SELF_ILLUM_COLOR_ANIMATIONS_USER_DATA_KEY];
  if (!Array.isArray(rawAnimations)) {
    return [];
  }
  return rawAnimations.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    const selfIllumColorKeys = readAuroraGltfVectorKeys(record?.selfIllumColorKeys);
    if (!record || !nodeName || selfIllumColorKeys.length === 0) {
      return [];
    }
    return [{
      nodeName,
      selfIllumColorKeys
    }];
  });
}

export function buildAuroraSupermodelAnimationClips(
  targetRoot: THREE.Object3D,
  supermodelRoot: THREE.Object3D,
  options: AuroraSupermodelAnimationBuildOptions = {}
): THREE.AnimationClip[] {
  const targetNamesByKey = collectAuroraAnimationTargetNames(targetRoot);
  const targetObjectsByKey = collectAuroraAnimationTargetObjects(targetRoot);
  const targetObjectListsByKey = collectAuroraAnimationTargetObjectLists(targetRoot);
  const supermodelObjectsByKey = collectAuroraAnimationTargetObjects(supermodelRoot);
  if (targetNamesByKey.size === 0) {
    return [];
  }

  const targetRootName =
    resolveAuroraAnimationRootName(targetRoot, targetNamesByKey) ??
    targetNamesByKey.get(targetRoot.name.toLowerCase());
  const supermodelRootKeys = collectAuroraAnimationRootKeys(supermodelRoot);
  const animationScale = resolveAuroraAnimationScale(targetRoot);
  const positionTrackMode = options.positionTrackMode ?? "retarget";
  const positionRetargetScale =
    resolveAuroraSupermodelPositionRetargetScale(
      targetObjectsByKey,
      supermodelObjectsByKey
    ) * animationScale;

  return readPlaceableModelAnimationClips(supermodelRoot).flatMap((clip) => {
    const remappedTrackEntries = clip.tracks.flatMap((track) => {
      const propertyStart = track.name.indexOf(".");
      if (propertyStart <= 0) {
        return [];
      }
      const sourceNodeKey = track.name.slice(0, propertyStart).toLowerCase();
      const propertyPath = track.name.slice(propertyStart);
      const remappedTrackTargets = remapAuroraSupermodelTrackTargets(
        track.name,
        targetNamesByKey,
        targetObjectListsByKey,
        supermodelObjectsByKey,
        supermodelRootKeys,
        targetRootName,
        options.duplicateTargetMode ?? "first"
      );
      if (remappedTrackTargets.length === 0) {
        return [];
      }
      return remappedTrackTargets.map((target) => ({
          track,
          sourceNodeKey,
          remappedTrackName: `${target.bindingName}${propertyPath}`,
          targetObject: target.object,
          isRootPositionTrack:
            propertyPath === ".position" &&
            (supermodelRootKeys.has(sourceNodeKey) ||
              (options.suppressRootDummyPositionTracks === true &&
                sourceNodeKey === "rootdummy"))
      }));
    });
    const shouldSuppressRootPositionTracks =
      options.suppressRootPositionTracks &&
      remappedTrackEntries.some((entry) => !entry.isRootPositionTrack);
    const tracks: THREE.KeyframeTrack[] = [];
    remappedTrackEntries.forEach(({ track, sourceNodeKey, remappedTrackName, targetObject, isRootPositionTrack }) => {
      if (shouldSuppressRootPositionTracks && isRootPositionTrack) {
        return;
      }
      const remappedTrack = track.clone();
      remappedTrack.name = remappedTrackName;
      const retargetedPosition =
        positionTrackMode === "retarget" &&
        retargetAuroraSupermodelPositionTrack(
          remappedTrack,
          sourceNodeKey,
          targetObject,
          supermodelObjectsByKey,
          positionRetargetScale
        );
      if (
        !retargetedPosition &&
        animationScale !== 1 &&
        remappedTrackName.endsWith(".position")
      ) {
        scaleAuroraVectorTrackValues(remappedTrack, animationScale);
      }
      tracks.push(remappedTrack);
    });
    const danglymeshOverrides = remapAuroraDanglymeshAnimationOverrides(
      readAuroraAnimationClipDanglymeshOverrides(clip),
      supermodelRootKeys,
      targetRootName
    );
    const animmeshUvAnimations = remapAuroraAnimmeshUvAnimations(
      readAuroraAnimationClipAnimmeshUvAnimations(clip),
      supermodelRootKeys,
      targetRootName
    );
    const animmeshVertexAnimations = remapAuroraAnimmeshVertexAnimations(
      readAuroraAnimationClipAnimmeshVertexAnimations(clip),
      supermodelRootKeys,
      targetRootName
    );
    const alphaAnimations = remapAuroraAlphaAnimations(
      readAuroraAnimationClipAlphaAnimations(clip),
      supermodelRootKeys,
      targetRootName
    );
    const selfIllumColorAnimations = remapAuroraSelfIllumColorAnimations(
      readAuroraAnimationClipSelfIllumColorAnimations(clip),
      supermodelRootKeys,
      targetRootName
    );
    if (
      tracks.length === 0 &&
      danglymeshOverrides.length === 0 &&
      animmeshUvAnimations.length === 0 &&
      animmeshVertexAnimations.length === 0 &&
      alphaAnimations.length === 0 &&
      selfIllumColorAnimations.length === 0
    ) {
      return [];
    }
    const remappedClip = new THREE.AnimationClip(clip.name, clip.duration, tracks);
    const remappedClipUserData = readAuroraAnimationClipUserData(remappedClip);
    remappedClipUserData[AURORA_SUPERMODEL_RETARGETED_CLIP_USER_DATA_KEY] = true;
    remappedClipUserData[
      AURORA_SUPERMODEL_SUPPRESSED_ROOT_POSITION_USER_DATA_KEY
    ] = shouldSuppressRootPositionTracks;
    remappedClipUserData[AURORA_SUPERMODEL_POSITION_TRACK_MODE_USER_DATA_KEY] =
      positionTrackMode;
    writeAuroraAnimationClipDanglymeshOverrides(remappedClip, danglymeshOverrides);
    writeAuroraAnimationClipAnimmeshUvAnimations(remappedClip, animmeshUvAnimations);
    writeAuroraAnimationClipAnimmeshVertexAnimations(
      remappedClip,
      animmeshVertexAnimations
    );
    writeAuroraAnimationClipAlphaAnimations(remappedClip, alphaAnimations);
    writeAuroraAnimationClipSelfIllumColorAnimations(
      remappedClip,
      selfIllumColorAnimations
    );
    return [remappedClip];
  });
}

function normalizeAuroraGltfString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function collectAuroraAnimationTargetNames(root: THREE.Object3D): Map<string, string> {
  const names = new Map<string, string>();
  root.traverse((node) => {
    const name = normalizeAuroraGltfString(node.name);
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    if (!names.has(key)) {
      names.set(key, name);
    }
  });
  return names;
}

function collectAuroraAnimationTargetObjects(
  root: THREE.Object3D
): Map<string, THREE.Object3D> {
  const objects = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    const name = normalizeAuroraGltfString(node.name);
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    if (!objects.has(key)) {
      objects.set(key, node);
    }
  });
  return objects;
}

function collectAuroraAnimationTargetObjectLists(
  root: THREE.Object3D
): Map<string, THREE.Object3D[]> {
  const objects = new Map<string, THREE.Object3D[]>();
  root.traverse((node) => {
    const name = normalizeAuroraGltfString(node.name);
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    const existing = objects.get(key);
    if (existing) {
      existing.push(node);
      return;
    }
    objects.set(key, [node]);
  });
  return objects;
}

function collectAuroraAnimationRootKeys(root: THREE.Object3D): Set<string> {
  const rootKeys = new Set<string>();
  const aurora = asRecord(root.userData?.aurora);
  [
    normalizeAuroraGltfString(root.userData?.auroraMdlSourceModel),
    normalizeAuroraGltfString(aurora?.sourceModel),
    normalizeAuroraGltfString(root.name),
    ...readAuroraGltfStringList(root.userData?.auroraMdlSourceHierarchyRootNodeNames),
    ...readAuroraGltfStringList(aurora?.sourceHierarchyRootNodeNames)
  ].forEach((name) => {
    if (name) {
      rootKeys.add(name.toLowerCase());
    }
  });
  return rootKeys;
}

function resolveAuroraAnimationRootName(
  root: THREE.Object3D,
  targetNamesByKey: Map<string, string>
): string | undefined {
  return [
    normalizeAuroraGltfString(root.userData?.auroraMdlSourceModel),
    normalizeAuroraGltfString(asRecord(root.userData?.aurora)?.sourceModel),
    normalizeAuroraGltfString(root.name),
    ...readAuroraGltfStringList(root.userData?.auroraMdlSourceHierarchyRootNodeNames)
  ]
    .map((name) => (name ? targetNamesByKey.get(name.toLowerCase()) : undefined))
    .find((name): name is string => Boolean(name));
}

function resolveAuroraAnimationScale(root: THREE.Object3D): number {
  const fromUserData = root.userData?.auroraMdlAnimationScale;
  if (typeof fromUserData === "number" && Number.isFinite(fromUserData)) {
    return fromUserData;
  }
  const fromAurora = asRecord(root.userData?.aurora)?.animationScale;
  return typeof fromAurora === "number" && Number.isFinite(fromAurora) ? fromAurora : 1;
}

function resolveAuroraSupermodelPositionRetargetScale(
  targetObjectsByKey: ReadonlyMap<string, THREE.Object3D>,
  supermodelObjectsByKey: ReadonlyMap<string, THREE.Object3D>
): number {
  const ratios: number[] = [];
  supermodelObjectsByKey.forEach((supermodelNode, key) => {
    const targetNode = targetObjectsByKey.get(key);
    if (!targetNode) {
      return;
    }
    const supermodelLength = supermodelNode.position.length();
    const targetLength = targetNode.position.length();
    if (supermodelLength <= 1e-6 || targetLength <= 1e-6) {
      return;
    }
    const ratio = targetLength / supermodelLength;
    if (Number.isFinite(ratio) && ratio > 0) {
      ratios.push(ratio);
    }
  });
  if (ratios.length === 0) {
    return 1;
  }
  ratios.sort((left, right) => left - right);
  return ratios[Math.floor(ratios.length / 2)] ?? 1;
}

function retargetAuroraSupermodelPositionTrack(
  track: THREE.KeyframeTrack,
  sourceNodeKey: string,
  targetNode: THREE.Object3D,
  supermodelObjectsByKey: ReadonlyMap<string, THREE.Object3D>,
  deltaScale: number
): boolean {
  if (!track.name.endsWith(".position")) {
    return false;
  }
  const supermodelNode = supermodelObjectsByKey.get(sourceNodeKey);
  if (!supermodelNode) {
    return false;
  }
  const values = track.values;
  for (let index = 0; index + 2 < values.length; index += 3) {
    values[index] =
      targetNode.position.x + (values[index] - supermodelNode.position.x) * deltaScale;
    values[index + 1] =
      targetNode.position.y + (values[index + 1] - supermodelNode.position.y) * deltaScale;
    values[index + 2] =
      targetNode.position.z + (values[index + 2] - supermodelNode.position.z) * deltaScale;
  }
  return true;
}

interface AuroraSupermodelTrackTarget {
  bindingName: string;
  object: THREE.Object3D;
}

function remapAuroraSupermodelTrackTargets(
  trackName: string,
  targetNamesByKey: Map<string, string>,
  targetObjectListsByKey: ReadonlyMap<string, readonly THREE.Object3D[]>,
  supermodelObjectsByKey: ReadonlyMap<string, THREE.Object3D>,
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined,
  duplicateTargetMode: AuroraSupermodelDuplicateTargetMode
): AuroraSupermodelTrackTarget[] {
  const propertyStart = trackName.indexOf(".");
  if (propertyStart <= 0) {
    return [];
  }
  const sourceNodeName = trackName.slice(0, propertyStart);
  const sourceNodeKey = sourceNodeName.toLowerCase();
  const exactTargetName = targetNamesByKey.get(sourceNodeKey);
  if (exactTargetName) {
    const exactTargets = targetObjectListsByKey.get(sourceNodeKey) ?? [];
    if (duplicateTargetMode === "all-by-uuid" && exactTargets.length > 1) {
      const parentMatchedTargets = filterAuroraSupermodelTargetsBySourceParent(
        exactTargets,
        supermodelObjectsByKey.get(sourceNodeKey)
      );
      const duplicateTargets =
        parentMatchedTargets.length > 0 ? parentMatchedTargets : exactTargets;
      return duplicateTargets.map((object) => ({
        bindingName: object.uuid,
        object
      }));
    }
    const object = exactTargets[0];
    return object
      ? [{
          bindingName: exactTargetName,
          object
        }]
      : [];
  }
  if (targetRootName && supermodelRootKeys.has(sourceNodeKey)) {
    const rootTargets = targetObjectListsByKey.get(targetRootName.toLowerCase()) ?? [];
    const object = rootTargets[0];
    return object
      ? [{
          bindingName: targetRootName,
          object
        }]
      : [];
  }
  return [];
}

function filterAuroraSupermodelTargetsBySourceParent(
  targets: readonly THREE.Object3D[],
  sourceObject: THREE.Object3D | undefined
): THREE.Object3D[] {
  const sourceParentKey = resolveAuroraAnimationObjectParentKey(sourceObject);
  if (!sourceParentKey) {
    return [];
  }
  return targets.filter(
    (target) => resolveAuroraAnimationObjectParentKey(target) === sourceParentKey
  );
}

function resolveAuroraAnimationObjectParentKey(
  object: THREE.Object3D | undefined
): string | undefined {
  if (!object) {
    return undefined;
  }
  const metadataParentName =
    normalizeAuroraGltfString(object.userData?.auroraSourceHierarchyParentName) ??
    normalizeAuroraGltfString(asRecord(object.userData?.aurora)?.sourceParentNode);
  const parentName = metadataParentName ?? normalizeAuroraGltfString(object.parent?.name);
  return parentName?.toLowerCase();
}

function remapAuroraDanglymeshAnimationOverrides(
  overrides: readonly AuroraGltfSourceAnimationDanglymeshOverride[],
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined
): AuroraGltfSourceAnimationDanglymeshOverride[] {
  return overrides.map((override) => {
    const sourceNodeKey = override.nodeName.toLowerCase();
    const nodeName =
      targetRootName && supermodelRootKeys.has(sourceNodeKey)
        ? targetRootName
        : override.nodeName;
    return {
      nodeName,
      ...(typeof override.displacement === "number"
        ? { displacement: override.displacement }
        : {}),
      ...(typeof override.period === "number" ? { period: override.period } : {}),
      ...(typeof override.tightness === "number" ? { tightness: override.tightness } : {})
    };
  });
}

function remapAuroraAnimmeshUvAnimations(
  animations: readonly AuroraGltfSourceAnimationAnimmeshUv[],
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined
): AuroraGltfSourceAnimationAnimmeshUv[] {
  return animations.map((animation) => {
    const sourceNodeKey = animation.nodeName.toLowerCase();
    const nodeName =
      targetRootName && supermodelRootKeys.has(sourceNodeKey)
        ? targetRootName
        : animation.nodeName;
    return {
      nodeName,
      samplePeriod: animation.samplePeriod,
      animTverts: animation.animTverts.map((entry) => [entry[0], entry[1]])
    };
  });
}

function remapAuroraAnimmeshVertexAnimations(
  animations: readonly AuroraGltfSourceAnimationAnimmeshVertex[],
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined
): AuroraGltfSourceAnimationAnimmeshVertex[] {
  return animations.map((animation) => {
    const sourceNodeKey = animation.nodeName.toLowerCase();
    const nodeName =
      targetRootName && supermodelRootKeys.has(sourceNodeKey)
        ? targetRootName
        : animation.nodeName;
    return {
      nodeName,
      samplePeriod: animation.samplePeriod,
      animVerts: animation.animVerts.map((entry) => [entry[0], entry[1], entry[2]])
    };
  });
}

function remapAuroraAlphaAnimations(
  animations: readonly AuroraGltfSourceAnimationAlpha[],
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined
): AuroraGltfSourceAnimationAlpha[] {
  return animations.map((animation) => {
    const sourceNodeKey = animation.nodeName.toLowerCase();
    const nodeName =
      targetRootName && supermodelRootKeys.has(sourceNodeKey)
        ? targetRootName
        : animation.nodeName;
    return {
      nodeName,
      alphaKeys: animation.alphaKeys.map((key) => ({ time: key.time, value: key.value }))
    };
  });
}

function remapAuroraSelfIllumColorAnimations(
  animations: readonly AuroraGltfSourceAnimationSelfIllumColor[],
  supermodelRootKeys: Set<string>,
  targetRootName: string | undefined
): AuroraGltfSourceAnimationSelfIllumColor[] {
  return animations.map((animation) => {
    const sourceNodeKey = animation.nodeName.toLowerCase();
    const nodeName =
      targetRootName && supermodelRootKeys.has(sourceNodeKey)
        ? targetRootName
        : animation.nodeName;
    return {
      nodeName,
      selfIllumColorKeys: animation.selfIllumColorKeys.map((key) => ({
        time: key.time,
        value: [key.value[0], key.value[1], key.value[2]]
      }))
    };
  });
}

function scaleAuroraVectorTrackValues(track: THREE.KeyframeTrack, scale: number): void {
  const values = track.values;
  for (let index = 0; index < values.length; index += 1) {
    values[index] *= scale;
  }
}

function readAuroraGltfSourceAnimationNames(aurora: Record<string, unknown>): string[] {
  const explicitNames = Array.isArray(aurora.sourceAnimationNames)
    ? aurora.sourceAnimationNames
        .map(normalizeAuroraGltfString)
        .filter((name): name is string => Boolean(name))
    : [];
  if (explicitNames.length > 0) {
    return explicitNames.filter((name, index, all) => all.indexOf(name) === index);
  }
  if (!Array.isArray(aurora.sourceAnimations)) {
    return [];
  }
  return aurora.sourceAnimations
    .map((entry) => asRecord(entry)?.name)
    .map(normalizeAuroraGltfString)
    .filter((name): name is string => Boolean(name))
    .filter((name, index, all) => all.indexOf(name) === index);
}

function readAuroraExtrasRecord(extras: unknown): Record<string, unknown> | undefined {
  const aurora = asRecord(asRecord(extras)?.aurora);
  return aurora ?? undefined;
}

function readPlaceableGltfParserAuroraExtras(
  gltf: PlaceableGltfLike
): Record<string, unknown> | undefined {
  const json = gltf.parser?.json;
  if (!json) {
    return undefined;
  }
  const sceneIndex =
    typeof json.scene === "number" && Number.isInteger(json.scene) && json.scene >= 0
      ? json.scene
      : 0;
  const sceneAurora = readAuroraExtrasRecord(json.scenes?.[sceneIndex]?.extras);
  return sceneAurora ?? readAuroraExtrasRecord(json.extras);
}

function mergePlaceableGltfParserAuroraExtrasIntoScene(
  gltf: PlaceableGltfLike,
  scene: THREE.Object3D
): void {
  const parserAurora = readPlaceableGltfParserAuroraExtras(gltf);
  if (parserAurora) {
    const sceneAurora = asRecord(scene.userData?.aurora);
    scene.userData = {
      ...scene.userData,
      aurora: {
        ...parserAurora,
        ...(sceneAurora ?? {})
      }
    };
  }
  mergePlaceableGltfNodeAndPrimitiveAuroraExtrasIntoScene(gltf, scene);
}

function mergePlaceableGltfNodeAndPrimitiveAuroraExtrasIntoScene(
  gltf: PlaceableGltfLike,
  scene: THREE.Object3D
): void {
  const json = gltf.parser?.json;
  if (!json?.nodes || !json.meshes) {
    return;
  }
  const primitiveAurorasByNodeName = new Map<string, Record<string, unknown>[]>();
  json.nodes.forEach((node) => {
    const nodeName = normalizeAuroraGltfString(node.name);
    const nodeAurora = readAuroraExtrasRecord(node.extras);
    const meshIndex =
      typeof node.mesh === "number" && Number.isInteger(node.mesh) && node.mesh >= 0
        ? node.mesh
        : undefined;
    const primitives =
      typeof meshIndex === "number" ? json.meshes?.[meshIndex]?.primitives ?? [] : [];
    const primitiveAuroras = primitives
      .map((primitive) => readAuroraExtrasRecord(primitive.extras))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry));
    if (!nodeName || (!nodeAurora && primitiveAuroras.length === 0)) {
      return;
    }
    const existing = primitiveAurorasByNodeName.get(nodeName) ?? [];
    existing.push(Object.assign({}, nodeAurora ?? {}, ...primitiveAuroras));
    primitiveAurorasByNodeName.set(nodeName, existing);
  });
  if (primitiveAurorasByNodeName.size === 0) {
    return;
  }
  scene.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const primitiveAurora = takePlaceableGltfNodePrimitiveAurora(
      node.name,
      primitiveAurorasByNodeName
    );
    if (!primitiveAurora) {
      return;
    }
    const nodeAurora = asRecord(node.userData?.aurora);
    const geometryAurora = asRecord(node.geometry.userData?.aurora);
    node.userData = {
      ...node.userData,
      aurora: {
        ...primitiveAurora,
        ...(nodeAurora ?? {})
      }
    };
    node.geometry.userData = {
      ...node.geometry.userData,
      aurora: {
        ...primitiveAurora,
        ...(geometryAurora ?? {})
      }
    };
  });
}

function takePlaceableGltfNodePrimitiveAurora(
  nodeName: string,
  primitiveAurorasByNodeName: Map<string, Record<string, unknown>[]>
): Record<string, unknown> | undefined {
  const normalizedNodeName = normalizeAuroraGltfString(nodeName);
  const uniqueSuffixBaseName = normalizedNodeName?.replace(/_\d+$/u, "");
  const candidateNames: string[] =
    normalizedNodeName && uniqueSuffixBaseName && uniqueSuffixBaseName !== normalizedNodeName
      ? [normalizedNodeName, uniqueSuffixBaseName]
      : normalizedNodeName
        ? [normalizedNodeName]
        : [];
  for (const candidateName of candidateNames) {
    const entries = primitiveAurorasByNodeName.get(candidateName);
    const entry = entries?.shift();
    if (entry) {
      return entry;
    }
  }
  return undefined;
}

function readAuroraGltfStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map(normalizeAuroraGltfString)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry, index, all) => all.indexOf(entry) === index);
}

function readAuroraGltfSourceHierarchyDummyNodeNames(
  aurora: Record<string, unknown>
): string[] {
  if (!Array.isArray(aurora.sourceHierarchy)) {
    return [];
  }
  return aurora.sourceHierarchy
    .filter((entry) => asRecord(entry)?.nodeType === "dummy")
    .map((entry) => asRecord(entry)?.name)
    .map(normalizeAuroraGltfString)
    .filter((entry): entry is string => Boolean(entry))
    .filter((entry, index, all) => all.indexOf(entry) === index);
}

function readAuroraGltfSourceHierarchyNodes(
  aurora: Record<string, unknown>
): AuroraGltfSourceHierarchyNode[] {
  if (!Array.isArray(aurora.sourceHierarchy)) {
    return [];
  }
  return aurora.sourceHierarchy.flatMap((entry) => {
    const record = asRecord(entry);
    const name = normalizeAuroraGltfString(record?.name);
    const nodeType = normalizeAuroraGltfString(record?.nodeType);
    if (!record || !name || !nodeType) {
      return [];
    }
    const parentName = normalizeAuroraGltfString(record.parentName);
    const position = readAuroraGltfVec3(record.position);
    const orientation = readAuroraGltfQuaternion(record.orientation);
    const orientationFormat =
      record.orientationFormat === "quaternion" || record.orientationFormat === "axis-angle"
        ? record.orientationFormat
        : undefined;
    const scale =
      typeof record.scale === "number" && Number.isFinite(record.scale)
        ? record.scale
        : undefined;
    return [{
      name,
      nodeType,
      ...(parentName ? { parentName } : {}),
      ...(position ? { position } : {}),
      ...(orientation ? { orientation } : {}),
      ...(orientationFormat ? { orientationFormat } : {}),
      ...(typeof scale === "number" ? { scale } : {})
    }];
  });
}

function readAuroraGltfVec3(value: unknown): [number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 3) {
    return undefined;
  }
  const entries = value.slice(0, 3);
  return entries.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ? (entries as [number, number, number])
    : undefined;
}

function readAuroraGltfVec2(value: unknown): [number, number] | undefined {
  if (!Array.isArray(value) || value.length < 2) {
    return undefined;
  }
  const entries = value.slice(0, 2);
  return entries.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ? (entries as [number, number])
    : undefined;
}

function readAuroraGltfVec2List(value: unknown): Array<[number, number]> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const vector = readAuroraGltfVec2(entry);
    return vector ? [vector] : [];
  });
}

function readAuroraGltfVec3List(value: unknown): Array<[number, number, number]> {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const vector = readAuroraGltfVec3(entry);
    return vector ? [vector] : [];
  });
}

function readAuroraGltfQuaternion(value: unknown): [number, number, number, number] | undefined {
  if (!Array.isArray(value) || value.length < 4) {
    return undefined;
  }
  const entries = value.slice(0, 4);
  return entries.every((entry) => typeof entry === "number" && Number.isFinite(entry))
    ? (entries as [number, number, number, number])
    : undefined;
}

export function ensureAuroraSourceHierarchyObjects(
  scene: THREE.Object3D
): AuroraSourceHierarchySynthesisResult {
  const emptyResult: AuroraSourceHierarchySynthesisResult = {
    synthesizedNodeCount: 0,
    synthesizedNodeNames: [],
    reparentedNodeCount: 0,
    rebasedGeometryCount: 0,
    rebasedGeometryNodeNames: []
  };
  const aurora = asRecord(scene.userData?.aurora);
  if (!aurora) {
    return emptyResult;
  }
  const hierarchyNodes = readAuroraGltfSourceHierarchyNodes(aurora);
  if (hierarchyNodes.length === 0) {
    return emptyResult;
  }

  const objectsByName = new Map<string, THREE.Object3D[]>();
  const objectsBySourceMeshName = new Map<string, THREE.Object3D[]>();
  const objectsByGltfUniqueBaseName = new Map<string, THREE.Object3D[]>();
  const sourceHierarchyCandidateObjects: THREE.Object3D[] = [];
  scene.traverse((node) => {
    sourceHierarchyCandidateObjects.push(node);
    if (node.name) {
      const key = node.name.toLowerCase();
      const existing = objectsByName.get(key);
      if (existing) {
        existing.push(node);
      } else {
        objectsByName.set(key, [node]);
      }
      const uniqueBaseName = normalizeAuroraGltfLoaderUniqueBaseName(node.name);
      if (uniqueBaseName && uniqueBaseName.toLowerCase() !== key) {
        const baseKey = uniqueBaseName.toLowerCase();
        const existingByBase = objectsByGltfUniqueBaseName.get(baseKey);
        if (existingByBase) {
          existingByBase.push(node);
        } else {
          objectsByGltfUniqueBaseName.set(baseKey, [node]);
        }
      }
    }
    const sourceMeshName = normalizeAuroraGltfString(asRecord(node.userData?.aurora)?.sourceMesh);
    if (sourceMeshName) {
      const key = sourceMeshName.toLowerCase();
      const existing = objectsBySourceMeshName.get(key);
      if (existing) {
        existing.push(node);
      } else {
        objectsBySourceMeshName.set(key, [node]);
      }
    }
  });

  const synthesizedNodeNames: string[] = [];
  const assignedObjects = new Set<THREE.Object3D>();
  const assignedObjectBySourceNode = new Map<
    AuroraGltfSourceHierarchyNode,
    THREE.Object3D
  >();
  hierarchyNodes.forEach((sourceNode, sourceNodeIndex) => {
    const existingObject = resolveAuroraSourceHierarchyExistingObject(
      sourceNode,
      sourceNodeIndex,
      hierarchyNodes,
      sourceHierarchyCandidateObjects,
      objectsByName,
      objectsBySourceMeshName,
      objectsByGltfUniqueBaseName,
      assignedObjects
    );
    if (existingObject) {
      assignedObjectBySourceNode.set(sourceNode, existingObject);
      assignedObjects.add(existingObject);
      return;
    }
    const node = new THREE.Object3D();
    node.name = sourceNode.name;
    if (!isAuroraGltfSourceHierarchySkinNode(sourceNode)) {
      applyAuroraSourceHierarchyTransform(node, sourceNode);
    }
    node.userData = {
      ...node.userData,
      auroraSourceHierarchySynthesized: true,
      auroraSourceHierarchyNodeType: sourceNode.nodeType,
      ...(isAuroraGltfSourceHierarchySkinNode(sourceNode)
        ? { auroraSourceHierarchySkinPoseSuppressed: true }
        : {}),
      ...(sourceNode.parentName ? { auroraSourceHierarchyParentName: sourceNode.parentName } : {})
    };
    assignedObjectBySourceNode.set(sourceNode, node);
    synthesizedNodeNames.push(sourceNode.name);
  });

  scene.updateMatrixWorld(true);
  const originalWorldMatrixByNode = new WeakMap<THREE.Object3D, THREE.Matrix4>();
  hierarchyNodes.forEach((sourceNode) => {
    const node = assignedObjectBySourceNode.get(sourceNode);
    if (!node) {
      return;
    }
    originalWorldMatrixByNode.set(node, node.matrixWorld.clone());
    const isSkinNode = isAuroraGltfSourceHierarchySkinNode(sourceNode);
    if (!isSkinNode) {
      applyAuroraSourceHierarchyTransform(node, sourceNode);
    }
    node.userData = {
      ...node.userData,
      auroraSourceHierarchyNodeType: sourceNode.nodeType,
      ...(isSkinNode ? { auroraSourceHierarchySkinPoseSuppressed: true } : {}),
      ...(sourceNode.parentName ? { auroraSourceHierarchyParentName: sourceNode.parentName } : {})
    };
  });

  let reparentedNodeCount = 0;
  hierarchyNodes.forEach((sourceNode, sourceNodeIndex) => {
    const node = assignedObjectBySourceNode.get(sourceNode);
    if (!node) {
      return;
    }
    const parent = sourceNode.parentName
      ? resolveAuroraSourceHierarchyAssignedParent(
          hierarchyNodes,
          assignedObjectBySourceNode,
          sourceNode.parentName,
          sourceNodeIndex
        )
      : undefined;
    const targetParent = parent ?? scene;
    if (node.parent !== targetParent) {
      if (isAuroraGltfSourceHierarchySkinNode(sourceNode)) {
        targetParent.attach(node);
      } else {
        targetParent.add(node);
      }
      reparentedNodeCount += 1;
    }
  });

  scene.updateMatrixWorld(true);
  let rebasedGeometryCount = 0;
  const rebasedGeometryNodeNames: string[] = [];
  hierarchyNodes.forEach((sourceNode) => {
    if (isAuroraGltfSourceHierarchySkinNode(sourceNode)) {
      return;
    }
    const node = assignedObjectBySourceNode.get(sourceNode);
    const originalWorldMatrix = node ? originalWorldMatrixByNode.get(node) : undefined;
    if (!node || !originalWorldMatrix || !(node instanceof THREE.Mesh)) {
      return;
    }
    if (rebaseAuroraSourceHierarchyMeshGeometry(node, originalWorldMatrix)) {
      rebasedGeometryCount += 1;
      if (node.name) {
        rebasedGeometryNodeNames.push(node.name);
      }
    }
  });

  return {
    synthesizedNodeCount: synthesizedNodeNames.length,
    synthesizedNodeNames,
    reparentedNodeCount,
    rebasedGeometryCount,
    rebasedGeometryNodeNames
  };
}

function resolveAuroraSourceHierarchyExistingObject(
  sourceNode: AuroraGltfSourceHierarchyNode,
  sourceNodeIndex: number,
  hierarchyNodes: readonly AuroraGltfSourceHierarchyNode[],
  candidateObjects: readonly THREE.Object3D[],
  objectsByName: ReadonlyMap<string, readonly THREE.Object3D[]>,
  objectsBySourceMeshName: ReadonlyMap<string, readonly THREE.Object3D[]>,
  objectsByGltfUniqueBaseName: ReadonlyMap<string, readonly THREE.Object3D[]>,
  assignedObjects: ReadonlySet<THREE.Object3D>
): THREE.Object3D | undefined {
  const sourceNodeKey = sourceNode.name.toLowerCase();
  const candidates = uniqueAuroraSourceHierarchyObjects([
    ...(objectsBySourceMeshName.get(sourceNodeKey) ?? []),
    ...(objectsByGltfUniqueBaseName.get(sourceNodeKey) ?? []),
    ...(objectsByName.get(sourceNodeKey) ?? [])
  ]).filter((object) => !assignedObjects.has(object));
  if (candidates.length === 0) {
    return undefined;
  }

  const scoredCandidates = candidates
    .map((object, candidateIndex) => ({
      object,
      candidateIndex,
      score: scoreAuroraSourceHierarchyExistingObject(
        sourceNode,
        sourceNodeIndex,
        hierarchyNodes,
        object,
        candidateObjects
      )
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.candidateIndex - right.candidateIndex);
  return scoredCandidates[0]?.object;
}

function uniqueAuroraSourceHierarchyObjects(
  objects: readonly THREE.Object3D[]
): THREE.Object3D[] {
  const seen = new Set<THREE.Object3D>();
  const unique: THREE.Object3D[] = [];
  objects.forEach((object) => {
    if (seen.has(object)) {
      return;
    }
    seen.add(object);
    unique.push(object);
  });
  return unique;
}

function scoreAuroraSourceHierarchyExistingObject(
  sourceNode: AuroraGltfSourceHierarchyNode,
  sourceNodeIndex: number,
  hierarchyNodes: readonly AuroraGltfSourceHierarchyNode[],
  object: THREE.Object3D,
  candidateObjects: readonly THREE.Object3D[]
): number {
  const objectAurora = asRecord(object.userData?.aurora);
  const sourceNodeKey = sourceNode.name.toLowerCase();
  const sourceParentKey = sourceNode.parentName?.toLowerCase() ?? "";
  const sourceNodeTypeKey = sourceNode.nodeType.trim().toLowerCase();
  const objectNameKey = object.name.toLowerCase();
  const objectBaseNameKey = normalizeAuroraGltfLoaderUniqueBaseName(object.name)?.toLowerCase();
  const objectSourceMeshKey = normalizeAuroraGltfString(objectAurora?.sourceMesh)?.toLowerCase();
  const objectParentKey = normalizeAuroraGltfString(objectAurora?.sourceParentNode)?.toLowerCase();
  const objectNodeTypeKey = normalizeAuroraGltfString(objectAurora?.sourceNodeType)?.toLowerCase();

  let score = 0;
  if (objectSourceMeshKey === sourceNodeKey) {
    score += 100;
  }
  if (objectNameKey === sourceNodeKey) {
    score += 25;
  }
  if (objectBaseNameKey === sourceNodeKey && objectNameKey !== sourceNodeKey) {
    score += 20;
  }
  if (objectParentKey && objectParentKey === sourceParentKey) {
    score += 60;
  }
  if (objectNodeTypeKey && objectNodeTypeKey === sourceNodeTypeKey) {
    score += 10;
  }

  if (objectSourceMeshKey === sourceNodeKey && objectParentKey === sourceParentKey) {
    score += 100;
  }

  const sourceDuplicateOrdinal = countAuroraSourceHierarchyDuplicateOrdinal(
    hierarchyNodes,
    sourceNode,
    sourceNodeIndex
  );
  const objectDuplicateOrdinal = countAuroraSourceHierarchyObjectDuplicateOrdinal(
    candidateObjects,
    object,
    sourceNodeKey
  );
  if (sourceDuplicateOrdinal === objectDuplicateOrdinal) {
    score += 5;
  }

  return score;
}

function countAuroraSourceHierarchyDuplicateOrdinal(
  hierarchyNodes: readonly AuroraGltfSourceHierarchyNode[],
  sourceNode: AuroraGltfSourceHierarchyNode,
  sourceNodeIndex: number
): number {
  const sourceNodeKey = sourceNode.name.toLowerCase();
  let ordinal = 0;
  for (let index = 0; index < sourceNodeIndex; index += 1) {
    if (hierarchyNodes[index]?.name.toLowerCase() === sourceNodeKey) {
      ordinal += 1;
    }
  }
  return ordinal;
}

function countAuroraSourceHierarchyObjectDuplicateOrdinal(
  candidateObjects: readonly THREE.Object3D[],
  object: THREE.Object3D,
  sourceNodeKey: string
): number {
  let ordinal = 0;
  for (const candidate of candidateObjects) {
    if (candidate === object) {
      return ordinal;
    }
    const candidateAurora = asRecord(candidate.userData?.aurora);
    const candidateSourceMeshKey =
      normalizeAuroraGltfString(candidateAurora?.sourceMesh)?.toLowerCase();
    const candidateBaseNameKey =
      normalizeAuroraGltfLoaderUniqueBaseName(candidate.name)?.toLowerCase();
    if (
      candidate.name.toLowerCase() === sourceNodeKey ||
      candidateSourceMeshKey === sourceNodeKey ||
      candidateBaseNameKey === sourceNodeKey
    ) {
      ordinal += 1;
    }
  }
  return ordinal;
}

function normalizeAuroraGltfLoaderUniqueBaseName(name: string): string | undefined {
  const normalized = normalizeAuroraGltfString(name);
  return normalized?.replace(/_\d+$/u, "");
}

function resolveAuroraSourceHierarchyAssignedParent(
  hierarchyNodes: readonly AuroraGltfSourceHierarchyNode[],
  assignedObjectBySourceNode: ReadonlyMap<AuroraGltfSourceHierarchyNode, THREE.Object3D>,
  parentName: string,
  childSourceNodeIndex: number
): THREE.Object3D | undefined {
  const parentKey = parentName.toLowerCase();
  for (let index = childSourceNodeIndex - 1; index >= 0; index -= 1) {
    const candidate = hierarchyNodes[index];
    if (candidate?.name.toLowerCase() !== parentKey) {
      continue;
    }
    const object = assignedObjectBySourceNode.get(candidate);
    if (object) {
      return object;
    }
  }
  for (let index = 0; index < hierarchyNodes.length; index += 1) {
    if (index === childSourceNodeIndex) {
      continue;
    }
    const candidate = hierarchyNodes[index];
    if (candidate?.name.toLowerCase() !== parentKey) {
      continue;
    }
    const object = assignedObjectBySourceNode.get(candidate);
    if (object) {
      return object;
    }
  }
  return undefined;
}

function isAuroraGltfSourceHierarchySkinNode(
  sourceNode: Pick<AuroraGltfSourceHierarchyNode, "nodeType">
): boolean {
  return sourceNode.nodeType.trim().toLowerCase() === "skin";
}

function rebaseAuroraSourceHierarchyMeshGeometry(
  mesh: THREE.Mesh,
  originalWorldMatrix: THREE.Matrix4
): boolean {
  const rebaseMatrix = new THREE.Matrix4()
    .copy(mesh.matrixWorld)
    .invert()
    .multiply(originalWorldMatrix);
  if (isAuroraSourceHierarchyIdentityMatrix(rebaseMatrix)) {
    return false;
  }
  mesh.geometry = mesh.geometry.clone();
  mesh.geometry.applyMatrix4(rebaseMatrix);
  mesh.geometry.computeBoundingBox();
  mesh.geometry.computeBoundingSphere();
  mesh.userData = {
    ...mesh.userData,
    auroraSourceHierarchyGeometryRebased: true
  };
  return true;
}

function isAuroraSourceHierarchyIdentityMatrix(matrix: THREE.Matrix4): boolean {
  const identity = new THREE.Matrix4();
  return matrix.elements.every(
    (entry, index) => Math.abs(entry - identity.elements[index]) <= 1e-6
  );
}

function applyAuroraSourceHierarchyTransform(
  node: THREE.Object3D,
  sourceNode: AuroraGltfSourceHierarchyNode
): void {
  if (sourceNode.position) {
    node.position.set(
      sourceNode.position[0],
      sourceNode.position[2],
      sourceNode.position[1]
    );
  }
  if (sourceNode.orientation) {
    const orientation = mapAuroraSourceHierarchyOrientationToThree(
      sourceNode.orientation,
      sourceNode.orientationFormat
    );
    if (orientation) {
      node.quaternion.copy(orientation);
    }
  }
  if (typeof sourceNode.scale === "number" && Number.isFinite(sourceNode.scale)) {
    node.scale.setScalar(sourceNode.scale);
  }
}

function mapAuroraSourceHierarchyOrientationToThree(
  orientation: [number, number, number, number],
  orientationFormat: "axis-angle" | "quaternion" | undefined
): THREE.Quaternion | null {
  if (orientationFormat === "quaternion") {
    const [x, y, z, w] = orientation;
    const quaternion = new THREE.Quaternion(-x, -z, -y, w);
    return quaternion.lengthSq() > 1e-12 ? quaternion.normalize() : null;
  }

  const [axisX, axisY, axisZ, angle] = orientation;
  const axis = new THREE.Vector3(-axisX, -axisZ, -axisY);
  if (axis.lengthSq() <= 1e-8 || Math.abs(angle) <= 1e-8) {
    return null;
  }
  return new THREE.Quaternion().setFromAxisAngle(axis.normalize(), angle);
}

function buildAuroraSourceAnimationClips(scene: THREE.Object3D): THREE.AnimationClip[] {
  const aurora = asRecord(scene.userData?.aurora);
  if (!aurora) {
    return [];
  }
  return readAuroraGltfSourceAnimations(aurora).flatMap((animation) => {
    const tracks: THREE.KeyframeTrack[] = [];
    const animationScale = resolveAuroraSourceAnimationScale(scene, animation);
    animation.nodes.forEach((node) => {
      const targetNodeName = resolveAuroraSourceAnimationTargetNodeName(
        scene,
        animation,
        node.nodeName
      );
      if (!targetNodeName) {
        return;
      }
      if (node.positionKeys.length > 0) {
        tracks.push(
          new THREE.VectorKeyframeTrack(
            `${targetNodeName}.position`,
            node.positionKeys.map((key) => key.time),
            node.positionKeys.flatMap((key) => [
              key.value[0] * animationScale,
              key.value[2] * animationScale,
              key.value[1] * animationScale
            ])
          )
        );
      }
      if (node.orientationKeys.length > 0) {
        tracks.push(
          new THREE.QuaternionKeyframeTrack(
            `${targetNodeName}.quaternion`,
            node.orientationKeys.map((key) => key.time),
            node.orientationKeys.flatMap((key) =>
              convertAuroraAxisAngleKeyToQuaternionArray(key.axisAngle)
            )
          )
        );
      }
      if (node.scaleKeys.length > 0) {
        tracks.push(
          new THREE.VectorKeyframeTrack(
            `${targetNodeName}.scale`,
            node.scaleKeys.map((key) => key.time),
            node.scaleKeys.flatMap((key) => [key.value, key.value, key.value])
          )
        );
      }
    });
    if (
      tracks.length === 0 &&
      animation.danglymeshOverrides.length === 0 &&
      animation.animmeshUvAnimations.length === 0 &&
      animation.animmeshVertexAnimations.length === 0 &&
      animation.alphaAnimations.length === 0 &&
      animation.selfIllumColorAnimations.length === 0 &&
      animation.events.length === 0
    ) {
      return [];
    }
    const clip = new THREE.AnimationClip(animation.name, animation.length, tracks);
    const userData = readAuroraAnimationClipUserData(clip);
    if (animation.targetModel) {
      userData.auroraMdlSourceAnimationTargetModel = animation.targetModel;
    }
    if (animation.animRoot) {
      userData.auroraMdlSourceAnimationRoot = animation.animRoot;
    }
    if (typeof animation.transitionTime === "number") {
      userData.auroraMdlSourceAnimationTransitionTime = animation.transitionTime;
    }
    if (animation.events.length > 0) {
      userData.auroraMdlSourceAnimationEvents = animation.events.map((event) => ({
        time: event.time,
        name: event.name
      }));
      userData.auroraMdlSourceAnimationEventCount = animation.events.length;
      userData.auroraMdlSourceAnimationEventNames = animation.events.map(
        (event) => event.name
      );
    }
    userData.auroraMdlSourceAnimationScale = animationScale;
    writeAuroraAnimationClipDanglymeshOverrides(clip, animation.danglymeshOverrides);
    writeAuroraAnimationClipAnimmeshUvAnimations(clip, animation.animmeshUvAnimations);
    writeAuroraAnimationClipAnimmeshVertexAnimations(
      clip,
      animation.animmeshVertexAnimations
    );
    writeAuroraAnimationClipAlphaAnimations(clip, animation.alphaAnimations);
    writeAuroraAnimationClipSelfIllumColorAnimations(
      clip,
      animation.selfIllumColorAnimations
    );
    return [clip];
  });
}

function resolveAuroraSourceAnimationScale(
  scene: THREE.Object3D,
  animation: AuroraGltfSourceAnimation
): number {
  if (
    typeof animation.animationScale === "number" &&
    Number.isFinite(animation.animationScale)
  ) {
    return animation.animationScale;
  }
  return resolveAuroraAnimationScale(scene);
}

function resolveAuroraSourceAnimationTargetNodeName(
  scene: THREE.Object3D,
  animation: AuroraGltfSourceAnimation,
  nodeName: string
): string | null {
  const animRoot = animation.animRoot?.trim();
  if (animRoot && scene.getObjectByName(animRoot)) {
    const rootAliases = [
      animation.targetModel,
      normalizeAuroraGltfString(asRecord(scene.userData?.aurora)?.sourceModel),
      scene.name
    ]
      .map((value) => value?.trim().toLowerCase())
      .filter((value): value is string => Boolean(value));
    if (rootAliases.includes(nodeName.trim().toLowerCase())) {
      return animRoot;
    }
  }
  return scene.getObjectByName(nodeName) ? nodeName : null;
}

function readAuroraGltfSourceAnimations(
  aurora: Record<string, unknown>
): AuroraGltfSourceAnimation[] {
  if (!Array.isArray(aurora.sourceAnimations)) {
    return [];
  }
  return aurora.sourceAnimations.flatMap((entry) => {
    const record = asRecord(entry);
    const name = normalizeAuroraGltfString(record?.name);
    if (!record || !name) {
      return [];
    }
    const length =
      typeof record.length === "number" && Number.isFinite(record.length)
        ? Math.max(0, record.length)
        : -1;
    const targetModel = normalizeAuroraGltfString(record.targetModel);
    const animRoot = normalizeAuroraGltfString(record.animRoot);
    const animationScale = readAuroraSourceOptionalFiniteNumber(record.animationScale);
    const transitionTime = readAuroraSourceOptionalFiniteNumber(record.transitionTime);
    const events = readAuroraGltfSourceAnimationEvents(record.events);
    const nodes = readAuroraGltfSourceAnimationNodes(record.nodes);
    return [{
      name,
      ...(targetModel ? { targetModel } : {}),
      ...(animRoot ? { animRoot } : {}),
      ...(typeof animationScale === "number" ? { animationScale } : {}),
      ...(typeof transitionTime === "number" ? { transitionTime } : {}),
      events,
      length,
      nodes,
      danglymeshOverrides: buildAuroraSourceAnimationDanglymeshOverrides(nodes),
      animmeshUvAnimations: buildAuroraSourceAnimationAnimmeshUvAnimations(nodes),
      animmeshVertexAnimations: buildAuroraSourceAnimationAnimmeshVertexAnimations(nodes),
      alphaAnimations: buildAuroraSourceAnimationAlphaAnimations(nodes),
      selfIllumColorAnimations: buildAuroraSourceAnimationSelfIllumColorAnimations(nodes)
    }];
  });
}

function readAuroraGltfSourceAnimationEvents(
  value: unknown
): AuroraGltfSourceAnimationEvent[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .flatMap((entry) => {
      const record = asRecord(entry);
      const time = readAuroraSourceOptionalFiniteNumber(record?.time);
      const name = normalizeAuroraGltfString(record?.name);
      if (!record || typeof time !== "number" || time < 0 || !name) {
        return [];
      }
      return [{ time, name }];
    })
    .sort((left, right) => left.time - right.time || left.name.localeCompare(right.name));
}

function readAuroraGltfSourceAnimationNodes(
  value: unknown
): AuroraGltfSourceAnimationNode[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const nodeName = normalizeAuroraGltfString(record?.nodeName);
    if (!record || !nodeName) {
      return [];
    }
    return [{
      nodeName,
      positionKeys: readAuroraGltfVectorKeys(record.positionKeys),
      orientationKeys: readAuroraGltfOrientationKeys(record.orientationKeys),
      scaleKeys: readAuroraGltfScalarKeys(record.scaleKeys),
      alphaKeys: readAuroraGltfScalarKeys(record.alphaKeys),
      selfIllumColorKeys: readAuroraGltfVectorKeys(record.selfIllumColorKeys),
      ...(() => {
        const danglyDisplacement = readAuroraSourceOptionalFiniteNumber(
          record.danglyDisplacement
        );
        const danglyPeriod = readAuroraSourceOptionalFiniteNumber(record.danglyPeriod);
        const danglyTightness = readAuroraSourceOptionalFiniteNumber(
          record.danglyTightness
        );
        const samplePeriod = readAuroraSourceOptionalFiniteNumber(record.samplePeriod);
        const animVerts = readAuroraGltfVec3List(record.animVerts);
        const animTverts = readAuroraGltfVec2List(record.animTverts);
        return {
          ...(typeof danglyDisplacement === "number" ? { danglyDisplacement } : {}),
          ...(typeof danglyPeriod === "number" ? { danglyPeriod } : {}),
          ...(typeof danglyTightness === "number" ? { danglyTightness } : {}),
          ...(typeof samplePeriod === "number" ? { samplePeriod } : {}),
          ...(animVerts.length > 0 ? { animVerts } : {}),
          ...(animTverts.length > 0 ? { animTverts } : {})
        };
      })()
    }];
  });
}

function buildAuroraSourceAnimationDanglymeshOverrides(
  nodes: readonly AuroraGltfSourceAnimationNode[]
): AuroraGltfSourceAnimationDanglymeshOverride[] {
  return nodes.flatMap((node) => {
    if (
      typeof node.danglyDisplacement !== "number" &&
      typeof node.danglyPeriod !== "number" &&
      typeof node.danglyTightness !== "number"
    ) {
      return [];
    }
    return [{
      nodeName: node.nodeName,
      ...(typeof node.danglyDisplacement === "number"
        ? { displacement: node.danglyDisplacement }
        : {}),
      ...(typeof node.danglyPeriod === "number" ? { period: node.danglyPeriod } : {}),
      ...(typeof node.danglyTightness === "number"
        ? { tightness: node.danglyTightness }
        : {})
    }];
  });
}

function buildAuroraSourceAnimationAnimmeshUvAnimations(
  nodes: readonly AuroraGltfSourceAnimationNode[]
): AuroraGltfSourceAnimationAnimmeshUv[] {
  return nodes.flatMap((node) => {
    if (
      typeof node.samplePeriod !== "number" ||
      node.samplePeriod <= 0 ||
      !Array.isArray(node.animTverts) ||
      node.animTverts.length === 0
    ) {
      return [];
    }
    return [{
      nodeName: node.nodeName,
      samplePeriod: node.samplePeriod,
      animTverts: node.animTverts
    }];
  });
}

function buildAuroraSourceAnimationAnimmeshVertexAnimations(
  nodes: readonly AuroraGltfSourceAnimationNode[]
): AuroraGltfSourceAnimationAnimmeshVertex[] {
  return nodes.flatMap((node) => {
    if (
      typeof node.samplePeriod !== "number" ||
      node.samplePeriod <= 0 ||
      !Array.isArray(node.animVerts) ||
      node.animVerts.length === 0
    ) {
      return [];
    }
    return [{
      nodeName: node.nodeName,
      samplePeriod: node.samplePeriod,
      animVerts: node.animVerts
    }];
  });
}

function buildAuroraSourceAnimationAlphaAnimations(
  nodes: readonly AuroraGltfSourceAnimationNode[]
): AuroraGltfSourceAnimationAlpha[] {
  return nodes.flatMap((node) => {
    if (node.alphaKeys.length === 0) {
      return [];
    }
    return [{
      nodeName: node.nodeName,
      alphaKeys: node.alphaKeys
    }];
  });
}

function buildAuroraSourceAnimationSelfIllumColorAnimations(
  nodes: readonly AuroraGltfSourceAnimationNode[]
): AuroraGltfSourceAnimationSelfIllumColor[] {
  return nodes.flatMap((node) => {
    if (node.selfIllumColorKeys.length === 0) {
      return [];
    }
    return [{
      nodeName: node.nodeName,
      selfIllumColorKeys: node.selfIllumColorKeys
    }];
  });
}

function readAuroraGltfVectorKeys(value: unknown): AuroraGltfVectorKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const time = typeof record?.time === "number" && Number.isFinite(record.time)
      ? record.time
      : undefined;
    const vector = readAuroraGltfVec3(record?.value);
    return time !== undefined && vector ? [{ time, value: vector }] : [];
  });
}

function readAuroraGltfOrientationKeys(value: unknown): AuroraGltfOrientationKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const time = typeof record?.time === "number" && Number.isFinite(record.time)
      ? record.time
      : undefined;
    const axisAngle = readAuroraGltfQuaternion(record?.axisAngle);
    return time !== undefined && axisAngle ? [{ time, axisAngle }] : [];
  });
}

function readAuroraGltfScalarKeys(value: unknown): AuroraGltfScalarKey[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const time = typeof record?.time === "number" && Number.isFinite(record.time)
      ? record.time
      : undefined;
    const rawValue = record?.value;
    const parsedValue =
      typeof rawValue === "number" && Number.isFinite(rawValue) ? rawValue : undefined;
    return time !== undefined && parsedValue !== undefined
      ? [{ time, value: parsedValue }]
      : [];
  });
}

function convertAuroraAxisAngleKeyToQuaternionArray(
  axisAngle: [number, number, number, number]
): [number, number, number, number] {
  const axis = new THREE.Vector3(-axisAngle[0], -axisAngle[2], -axisAngle[1]);
  const quaternion = new THREE.Quaternion();
  if (axis.lengthSq() > 1e-8 && Math.abs(axisAngle[3]) > 1e-8) {
    axis.normalize();
    quaternion.setFromAxisAngle(axis, axisAngle[3]);
  }
  return [quaternion.x, quaternion.y, quaternion.z, quaternion.w];
}

function readAuroraGltfIntegerList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is number => Number.isInteger(entry) && entry >= 0)
    .map((entry) => Math.trunc(entry));
}

function readAuroraSourceSkinWeightInfluences(
  value: unknown
): AuroraSourceSkinWeightInfluence[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const bone = normalizeAuroraGltfString(record?.bone);
    const weight = typeof record?.weight === "number" && Number.isFinite(record.weight)
      ? record.weight
      : undefined;
    if (!bone || typeof weight !== "number" || weight <= 0) {
      return [];
    }
    return [{
      bone,
      boneKey: bone.toLowerCase(),
      weight
    }];
  });
}

function readAuroraSourceOriginalVertexWeights(
  value: unknown
): AuroraSourceSkinWeightInfluence[][] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(readAuroraSourceSkinWeightInfluences);
}

function readAuroraSourceSkinInverseBindPoses(
  value: unknown
): AuroraSourceSkinInverseBindPose[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.flatMap((entry) => {
    const record = asRecord(entry);
    const bone = normalizeAuroraGltfString(record?.bone);
    if (!bone) {
      return [];
    }
    const qboneRefInv = readAuroraSourceFiniteTuple(record?.qboneRefInv, 4);
    const tboneRefInv = readAuroraSourceFiniteTuple(record?.tboneRefInv, 3);
    if (!qboneRefInv && !tboneRefInv) {
      return [];
    }
    return [
      {
        bone,
        boneKey: bone.toLowerCase(),
        ...(qboneRefInv
          ? { qboneRefInv: qboneRefInv as [number, number, number, number] }
          : {}),
        ...(tboneRefInv ? { tboneRefInv: tboneRefInv as [number, number, number] } : {})
      }
    ];
  });
}

function readAuroraSourceFiniteTuple(value: unknown, length: number): number[] | null {
  if (!Array.isArray(value) || value.length < length) {
    return null;
  }
  const tuple = value.slice(0, length).map((entry) =>
    typeof entry === "number" && Number.isFinite(entry) ? entry : Number.NaN
  );
  return tuple.every(Number.isFinite) ? tuple : null;
}

function readAuroraSourceSkinWeightsMetadata(
  mesh: THREE.Mesh
): Record<string, unknown> | null {
  const nodeAurora = asRecord(mesh.userData?.aurora);
  const nodeSkinWeights = asRecord(nodeAurora?.skinWeights);
  if (nodeSkinWeights) {
    return nodeSkinWeights;
  }
  const geometryAurora = asRecord(mesh.geometry.userData?.aurora);
  return asRecord(geometryAurora?.skinWeights);
}

function readAuroraSourceDanglymeshMetadata(
  mesh: THREE.Mesh
): Record<string, unknown> | null {
  const nodeAurora = asRecord(mesh.userData?.aurora);
  const nodeDanglymesh = asRecord(nodeAurora?.danglymesh);
  if (nodeDanglymesh) {
    return nodeDanglymesh;
  }
  const geometryAurora = asRecord(mesh.geometry.userData?.aurora);
  return asRecord(geometryAurora?.danglymesh);
}

function readAuroraSourceAnimmeshMetadata(
  mesh: THREE.Mesh
): Record<string, unknown> | null {
  const nodeAurora = asRecord(mesh.userData?.aurora);
  const nodeAnimmesh = asRecord(nodeAurora?.animmesh);
  if (nodeAnimmesh) {
    return nodeAnimmesh;
  }
  const geometryAurora = asRecord(mesh.geometry.userData?.aurora);
  return asRecord(geometryAurora?.animmesh);
}

function readAuroraGltfNumberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((entry) =>
    typeof entry === "number" && Number.isFinite(entry) ? entry : 0
  );
}

function readAuroraSourceDanglymeshConstraintWeights(value: unknown): number[] {
  return readAuroraGltfNumberList(value).map((entry) =>
    Math.max(0, Math.min(1, entry > 1 ? entry / 255 : entry))
  );
}

function readAuroraSourceFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readAuroraSourceOptionalFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function buildAuroraSourceSkinningObjectMap(
  root: THREE.Object3D
): Map<string, THREE.Object3D> {
  const objectByName = new Map<string, THREE.Object3D>();
  root.traverse((node) => {
    const name = normalizeAuroraGltfString(node.name);
    if (!name) {
      return;
    }
    const key = name.toLowerCase();
    if (!objectByName.has(key)) {
      objectByName.set(key, node);
    }
  });
  return objectByName;
}

function buildAuroraSourceHierarchyWorldMatrixMap(
  root: THREE.Object3D
): Map<string, THREE.Matrix4> {
  const aurora = asRecord(root.userData?.aurora);
  if (!aurora) {
    return new Map();
  }
  const sourceNodes = readAuroraGltfSourceHierarchyNodes(aurora);
  if (sourceNodes.length === 0) {
    return new Map();
  }
  const sourceNodeByKey = new Map<string, AuroraGltfSourceHierarchyNode>();
  sourceNodes.forEach((sourceNode) => {
    const key = sourceNode.name.trim().toLowerCase();
    if (key && !sourceNodeByKey.has(key)) {
      sourceNodeByKey.set(key, sourceNode);
    }
  });
  const worldMatrixByKey = new Map<string, THREE.Matrix4>();
  const resolvingKeys = new Set<string>();

  const resolveWorldMatrix = (sourceNode: AuroraGltfSourceHierarchyNode): THREE.Matrix4 => {
    const key = sourceNode.name.trim().toLowerCase();
    const cached = worldMatrixByKey.get(key);
    if (cached) {
      return cached;
    }
    if (resolvingKeys.has(key)) {
      const cycleMatrix = buildAuroraSourceHierarchyLocalMatrix(sourceNode);
      worldMatrixByKey.set(key, cycleMatrix);
      return cycleMatrix;
    }
    resolvingKeys.add(key);
    let matrix = buildAuroraSourceHierarchyLocalMatrix(sourceNode);
    const parentKey = sourceNode.parentName?.trim().toLowerCase() ?? "";
    if (parentKey && parentKey !== key) {
      const parentNode = sourceNodeByKey.get(parentKey);
      if (parentNode) {
        matrix = new THREE.Matrix4().multiplyMatrices(resolveWorldMatrix(parentNode), matrix);
      }
    }
    resolvingKeys.delete(key);
    worldMatrixByKey.set(key, matrix);
    return matrix;
  };

  sourceNodes.forEach((sourceNode) => {
    resolveWorldMatrix(sourceNode);
  });
  return worldMatrixByKey;
}

function resolveAuroraSourceHierarchyWorldMatrixForNode(
  node: THREE.Object3D,
  sourceNodeName: string,
  mapCache: WeakMap<THREE.Object3D, Map<string, THREE.Matrix4>>
): THREE.Matrix4 | undefined {
  const key = sourceNodeName.trim().toLowerCase();
  if (!key) {
    return undefined;
  }
  let current: THREE.Object3D | null = node;
  while (current) {
    let sourceHierarchyWorldMatrixByName = mapCache.get(current);
    if (!sourceHierarchyWorldMatrixByName) {
      sourceHierarchyWorldMatrixByName = buildAuroraSourceHierarchyWorldMatrixMap(current);
      mapCache.set(current, sourceHierarchyWorldMatrixByName);
    }
    const matrix = sourceHierarchyWorldMatrixByName.get(key);
    if (matrix) {
      return matrix;
    }
    current = current.parent;
  }
  return undefined;
}

function buildAuroraSourceHierarchyLocalMatrix(
  sourceNode: AuroraGltfSourceHierarchyNode
): THREE.Matrix4 {
  const position = sourceNode.position
    ? new THREE.Vector3(
        sourceNode.position[0],
        sourceNode.position[2],
        sourceNode.position[1]
      )
    : new THREE.Vector3();
  const quaternion =
    sourceNode.orientation
      ? mapAuroraSourceHierarchyOrientationToThree(
          sourceNode.orientation,
          sourceNode.orientationFormat
        ) ?? new THREE.Quaternion()
      : new THREE.Quaternion();
  const scale =
    typeof sourceNode.scale === "number" && Number.isFinite(sourceNode.scale)
      ? new THREE.Vector3(sourceNode.scale, sourceNode.scale, sourceNode.scale)
      : new THREE.Vector3(1, 1, 1);
  return new THREE.Matrix4().compose(position, quaternion, scale);
}

function buildAuroraSourceSkinningInverseBindPoseMap(
  poses: readonly AuroraSourceSkinInverseBindPose[]
): Map<string, THREE.Matrix4> {
  const poseByBoneKey = new Map<string, THREE.Matrix4>();
  poses.forEach((pose) => {
    const matrix = buildAuroraSourceSkinningInverseBindPoseMatrix(pose);
    if (!matrix) {
      return;
    }
    poseByBoneKey.set(pose.boneKey, matrix);
  });
  return poseByBoneKey;
}

function buildAuroraSourceSkinningInverseBindPoseMatrix(
  pose: AuroraSourceSkinInverseBindPose
): THREE.Matrix4 | null {
  const position = pose.tboneRefInv
    ? new THREE.Vector3(pose.tboneRefInv[0], pose.tboneRefInv[2], pose.tboneRefInv[1])
    : new THREE.Vector3();
  const quaternion = pose.qboneRefInv
    ? buildAuroraSourceSkinningInverseBindPoseQuaternion(pose.qboneRefInv)
    : new THREE.Quaternion();
  if (!quaternion) {
    return null;
  }
  return new THREE.Matrix4().compose(position, quaternion, new THREE.Vector3(1, 1, 1));
}

function isAuroraSourceSkinningCreaturePartContext(node: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = node;
  while (current) {
    if (
      typeof current.userData?.creaturePartSlot === "string" ||
      current.userData?.creaturePartModelGroupStatus === "loaded" ||
      current.userData?.creaturePartModelGroupStatus === "partial" ||
      current.name.endsWith(":creature-part-models")
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function shouldUseCurrentPoseFallbackForAuroraSourceSkinning(
  mesh: THREE.Mesh,
  inverseBindPoseCount: number
): boolean {
  return inverseBindPoseCount === 0 && isAuroraSourceSkinningCreaturePartContext(mesh);
}

function buildAuroraSourceSkinningInverseBindPoseQuaternion(
  value: [number, number, number, number]
): THREE.Quaternion | null {
  const [x, y, z, w] = value;
  const lengthSq = x * x + y * y + z * z + w * w;
  if (lengthSq <= 1e-12) {
    return new THREE.Quaternion();
  }
  return new THREE.Quaternion(-x, -z, -y, w).normalize();
}

function formatAuroraSourceSkinningRuntimeNumber(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 0.00005) {
    return "0.0000";
  }
  return value.toFixed(4);
}

function formatAuroraSourceSkinningRuntimeVector(value: THREE.Vector3): string {
  return [
    formatAuroraSourceSkinningRuntimeNumber(value.x),
    formatAuroraSourceSkinningRuntimeNumber(value.y),
    formatAuroraSourceSkinningRuntimeNumber(value.z)
  ].join(",");
}

function formatAuroraSourceSkinningRuntimeBox(box: THREE.Box3 | null): string {
  if (!box || box.isEmpty()) {
    return "empty";
  }
  return `${formatAuroraSourceSkinningRuntimeVector(box.min)} -> ${formatAuroraSourceSkinningRuntimeVector(box.max)}`;
}

function formatAuroraSourceSkinningRuntimeVertexSignature(
  positionArray: Float32Array,
  stride: number,
  vertexCount: number
): string {
  if (stride < 3 || vertexCount <= 0) {
    return "empty";
  }
  const sampleIndices = Array.from(
    new Set([
      0,
      Math.max(0, Math.floor((vertexCount - 1) / 2)),
      Math.max(0, vertexCount - 1)
    ])
  );
  return sampleIndices
    .map((vertexIndex) => {
      const offset = vertexIndex * stride;
      return `${vertexIndex}:${[
        formatAuroraSourceSkinningRuntimeNumber(positionArray[offset] ?? 0),
        formatAuroraSourceSkinningRuntimeNumber(positionArray[offset + 1] ?? 0),
        formatAuroraSourceSkinningRuntimeNumber(positionArray[offset + 2] ?? 0)
      ].join(",")}`;
    })
    .join(";");
}

function ensureAuroraSourceDanglymeshGeometryWritable(mesh: THREE.Mesh): THREE.BufferGeometry {
  const currentGeometry = mesh.geometry;
  if (currentGeometry.userData?.[AURORA_SOURCE_DANGLYMESH_GEOMETRY_READY_KEY] === true) {
    return currentGeometry;
  }
  const clonedGeometry = currentGeometry.clone();
  clonedGeometry.userData = {
    ...currentGeometry.userData,
    [AURORA_SOURCE_DANGLYMESH_GEOMETRY_READY_KEY]: true
  };
  delete (clonedGeometry.userData as Record<string, unknown>)[
    PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG
  ];
  mesh.geometry = clonedGeometry;
  return clonedGeometry;
}

function ensureAuroraSourceAnimmeshGeometryWritable(mesh: THREE.Mesh): THREE.BufferGeometry {
  const currentGeometry = mesh.geometry;
  if (currentGeometry.userData?.[AURORA_SOURCE_ANIMMESH_GEOMETRY_READY_KEY] === true) {
    return currentGeometry;
  }
  const clonedGeometry = currentGeometry.clone();
  clonedGeometry.userData = {
    ...currentGeometry.userData,
    [AURORA_SOURCE_ANIMMESH_GEOMETRY_READY_KEY]: true
  };
  delete (clonedGeometry.userData as Record<string, unknown>)[
    PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG
  ];
  mesh.geometry = clonedGeometry;
  return clonedGeometry;
}

function ensureAuroraSourceSkinningGeometryWritable(mesh: THREE.Mesh): THREE.BufferGeometry {
  const currentGeometry = mesh.geometry;
  if (currentGeometry.userData?.[AURORA_SOURCE_SKINNING_GEOMETRY_READY_KEY] === true) {
    ensureAuroraSourceSkinningBindPositionsStored(currentGeometry);
    return currentGeometry;
  }
  const clonedGeometry = currentGeometry.clone();
  clonedGeometry.userData = {
    ...currentGeometry.userData,
    [AURORA_SOURCE_SKINNING_GEOMETRY_READY_KEY]: true
  };
  delete (clonedGeometry.userData as Record<string, unknown>)[
    PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG
  ];
  ensureAuroraSourceSkinningBindPositionsStored(clonedGeometry);
  mesh.geometry = clonedGeometry;
  return clonedGeometry;
}

function ensureAuroraSourceSkinningBindPositionsStored(
  geometry: THREE.BufferGeometry
): Float32Array | null {
  const positionAttribute = geometry.getAttribute("position");
  if (
    !(positionAttribute instanceof THREE.BufferAttribute) ||
    !(positionAttribute.array instanceof Float32Array)
  ) {
    return null;
  }
  const existing = geometry.userData?.[AURORA_SOURCE_SKINNING_BIND_POSITIONS_KEY];
  if (existing instanceof Float32Array && existing.length === positionAttribute.array.length) {
    return existing;
  }
  const bindPositions = new Float32Array(positionAttribute.array.length);
  bindPositions.set(positionAttribute.array);
  geometry.userData = {
    ...geometry.userData,
    [AURORA_SOURCE_SKINNING_BIND_POSITIONS_KEY]: bindPositions
  };
  return bindPositions;
}

function readAuroraSourceSkinningBindPositions(
  geometry: THREE.BufferGeometry,
  positionAttribute: THREE.BufferAttribute
): Float32Array {
  const stored = ensureAuroraSourceSkinningBindPositionsStored(geometry);
  const source =
    stored && stored.length === positionAttribute.array.length
      ? stored
      : positionAttribute.array;
  const bindPositions = new Float32Array(positionAttribute.array.length);
  bindPositions.set(source as Float32Array);
  return bindPositions;
}

function ensureAuroraSourceAlphaMaterialsWritable(mesh: THREE.Mesh): THREE.Material[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (
    materials.length > 0 &&
    materials.every((material) => material.userData?.[AURORA_SOURCE_ALPHA_MATERIAL_READY_KEY] === true)
  ) {
    return materials;
  }
  const cloneMaterial = (material: THREE.Material): THREE.Material => {
    const cloned = material.clone();
    cloned.userData = {
      ...material.userData,
      [AURORA_SOURCE_ALPHA_MATERIAL_READY_KEY]: true,
      [AURORA_SOURCE_SELF_ILLUM_MATERIAL_READY_KEY]: true
    };
    delete (cloned.userData as Record<string, unknown>)[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG];
    return cloned;
  };
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => cloneMaterial(material));
    return mesh.material;
  }
  mesh.material = cloneMaterial(mesh.material);
  return [mesh.material];
}

function ensureAuroraSourceSelfIllumMaterialsWritable(
  mesh: THREE.Mesh
): AuroraSourceSelfIllumColorMaterial[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  if (
    materials.length > 0 &&
    materials.every(
      (material) =>
        material.userData?.[AURORA_SOURCE_SELF_ILLUM_MATERIAL_READY_KEY] === true
    )
  ) {
    return materials.filter(
      (material): material is AuroraSourceSelfIllumColorMaterial =>
        "emissive" in material && material.emissive instanceof THREE.Color
    );
  }
  const cloneMaterial = (
    material: THREE.Material
  ): AuroraSourceSelfIllumColorMaterial => {
    const cloned = material.clone() as AuroraSourceSelfIllumColorMaterial;
    cloned.userData = {
      ...material.userData,
      [AURORA_SOURCE_ALPHA_MATERIAL_READY_KEY]: true,
      [AURORA_SOURCE_SELF_ILLUM_MATERIAL_READY_KEY]: true
    };
    delete (cloned.userData as Record<string, unknown>)[PLACEABLE_SHARED_MODEL_MATERIAL_FLAG];
    return cloned;
  };
  if (Array.isArray(mesh.material)) {
    mesh.material = mesh.material.map((material) => cloneMaterial(material));
    return mesh.material.filter(
      (material): material is AuroraSourceSelfIllumColorMaterial =>
        "emissive" in material && material.emissive instanceof THREE.Color
    );
  }
  const clonedMaterial = cloneMaterial(mesh.material);
  mesh.material = clonedMaterial;
  return "emissive" in clonedMaterial && clonedMaterial.emissive instanceof THREE.Color
    ? [clonedMaterial]
    : [];
}

function buildAuroraSourceDanglymeshAnimationOverrideRuntime(
  animationClips: readonly THREE.AnimationClip[]
): {
  clipNames: string[];
  nodeNames: string[];
  overridesByNodeKey: Map<string, Map<string, AuroraSourceDanglymeshAnimationOverride>>;
} {
  const clipNames: string[] = [];
  const nodeNames = new Set<string>();
  const overridesByNodeKey = new Map<
    string,
    Map<string, AuroraSourceDanglymeshAnimationOverride>
  >();

  animationClips.forEach((clip, index) => {
    const clipName = clip.name || `clip_${index}`;
    const overrides = readAuroraAnimationClipDanglymeshOverrides(clip);
    if (overrides.length === 0) {
      return;
    }
    clipNames.push(clipName);
    overrides.forEach((override) => {
      const nodeKey = override.nodeName.toLowerCase();
      nodeNames.add(override.nodeName);
      let overridesByClipName = overridesByNodeKey.get(nodeKey);
      if (!overridesByClipName) {
        overridesByClipName = new Map<string, AuroraSourceDanglymeshAnimationOverride>();
        overridesByNodeKey.set(nodeKey, overridesByClipName);
      }
      overridesByClipName.set(clipName, {
        ...(typeof override.displacement === "number"
          ? { displacement: override.displacement }
          : {}),
        ...(typeof override.period === "number" ? { period: override.period } : {}),
        ...(typeof override.tightness === "number" ? { tightness: override.tightness } : {})
      });
    });
  });

  return {
    clipNames: clipNames.filter((name, index, all) => all.indexOf(name) === index),
    nodeNames: Array.from(nodeNames),
    overridesByNodeKey
  };
}

function buildAuroraSourceAnimmeshAnimationRuntime(
  animationClips: readonly THREE.AnimationClip[]
): {
  clipNames: string[];
  uvAnimationsByNodeKey: Map<string, Map<string, AuroraGltfSourceAnimationAnimmeshUv>>;
  vertexAnimationsByNodeKey: Map<
    string,
    Map<string, AuroraGltfSourceAnimationAnimmeshVertex>
  >;
} {
  const clipNames: string[] = [];
  const uvAnimationsByNodeKey = new Map<
    string,
    Map<string, AuroraGltfSourceAnimationAnimmeshUv>
  >();
  const vertexAnimationsByNodeKey = new Map<
    string,
    Map<string, AuroraGltfSourceAnimationAnimmeshVertex>
  >();

  animationClips.forEach((clip, index) => {
    const clipName = clip.name || `clip_${index}`;
    const uvAnimations = readAuroraAnimationClipAnimmeshUvAnimations(clip);
    const vertexAnimations = readAuroraAnimationClipAnimmeshVertexAnimations(clip);
    if (uvAnimations.length === 0 && vertexAnimations.length === 0) {
      return;
    }
    clipNames.push(clipName);
    uvAnimations.forEach((animation) => {
      const nodeKey = animation.nodeName.toLowerCase();
      let animationsByClipName = uvAnimationsByNodeKey.get(nodeKey);
      if (!animationsByClipName) {
        animationsByClipName = new Map<string, AuroraGltfSourceAnimationAnimmeshUv>();
        uvAnimationsByNodeKey.set(nodeKey, animationsByClipName);
      }
      animationsByClipName.set(clipName, animation);
    });
    vertexAnimations.forEach((animation) => {
      const nodeKey = animation.nodeName.toLowerCase();
      let animationsByClipName = vertexAnimationsByNodeKey.get(nodeKey);
      if (!animationsByClipName) {
        animationsByClipName =
          new Map<string, AuroraGltfSourceAnimationAnimmeshVertex>();
        vertexAnimationsByNodeKey.set(nodeKey, animationsByClipName);
      }
      animationsByClipName.set(clipName, animation);
    });
  });

  return {
    clipNames: clipNames.filter((name, index, all) => all.indexOf(name) === index),
    uvAnimationsByNodeKey,
    vertexAnimationsByNodeKey
  };
}

function isAuroraSourceAnimmeshAttribute(
  attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined,
  itemSize: number
): attribute is THREE.BufferAttribute {
  return (
    attribute instanceof THREE.BufferAttribute &&
    attribute.array instanceof Float32Array &&
    attribute.itemSize >= itemSize
  );
}

export function createAuroraSourceAnimmeshRuntime(
  root: THREE.Object3D,
  animationClips: readonly THREE.AnimationClip[] = []
): AuroraSourceAnimmeshRuntime | null {
  const animationRuntime = buildAuroraSourceAnimmeshAnimationRuntime(animationClips);
  const activeClipName = animationRuntime.clipNames[0];
  if (!activeClipName) {
    return null;
  }

  const bindings: AuroraSourceAnimmeshBinding[] = [];
  const nodeNames: string[] = [];
  let uvMeshCount = 0;
  let vertexMeshCount = 0;

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const animmesh = readAuroraSourceAnimmeshMetadata(node);
    if (!animmesh) {
      return;
    }
    const uvAnimationsByClipName =
      animationRuntime.uvAnimationsByNodeKey.get(node.name.toLowerCase()) ??
      new Map<string, AuroraGltfSourceAnimationAnimmeshUv>();
    const vertexAnimationsByClipName =
      animationRuntime.vertexAnimationsByNodeKey.get(node.name.toLowerCase()) ??
      new Map<string, AuroraGltfSourceAnimationAnimmeshVertex>();
    if (uvAnimationsByClipName.size === 0 && vertexAnimationsByClipName.size === 0) {
      return;
    }

    const sourceTvertCount = Math.max(
      0,
      Math.trunc(readAuroraSourceFiniteNumber(animmesh.sourceTvertCount, 0))
    );
    const sourceTvertIndices = readAuroraGltfIntegerList(
      animmesh.gltfVertexSourceTvertIndices
    );
    const sourceVertexIndices = readAuroraGltfIntegerList(
      animmesh.gltfVertexSourceIndices
    );
    const explicitSourceVertexCount = Math.max(
      0,
      Math.trunc(readAuroraSourceFiniteNumber(animmesh.sourceVertexCount, 0))
    );
    const inferredSourceVertexCount =
      sourceVertexIndices.length > 0 ? Math.max(...sourceVertexIndices) + 1 : 0;
    const sourceVertexCount = Math.max(
      explicitSourceVertexCount,
      inferredSourceVertexCount
    );

    const currentUvAttribute = node.geometry.getAttribute("uv");
    const currentPositionAttribute = node.geometry.getAttribute("position");
    const canAnimateUv =
      uvAnimationsByClipName.size > 0 &&
      sourceTvertCount > 0 &&
      sourceTvertIndices.length > 0 &&
      isAuroraSourceAnimmeshAttribute(currentUvAttribute, 2);
    const canAnimateVertex =
      vertexAnimationsByClipName.size > 0 &&
      sourceVertexCount > 0 &&
      sourceVertexIndices.length > 0 &&
      isAuroraSourceAnimmeshAttribute(currentPositionAttribute, 3);
    if (!canAnimateUv && !canAnimateVertex) {
      return;
    }

    const geometry = ensureAuroraSourceAnimmeshGeometryWritable(node);
    const uvAttribute = canAnimateUv
      ? geometry.getAttribute("uv")
      : undefined;
    const positionAttribute = canAnimateVertex
      ? geometry.getAttribute("position")
      : undefined;
    const writableUvAttribute = isAuroraSourceAnimmeshAttribute(uvAttribute, 2)
      ? uvAttribute
      : null;
    const writablePositionAttribute = isAuroraSourceAnimmeshAttribute(
      positionAttribute,
      3
    )
      ? positionAttribute
      : null;
    if (!writableUvAttribute && !writablePositionAttribute) {
      return;
    }

    writableUvAttribute?.setUsage(THREE.DynamicDrawUsage);
    writablePositionAttribute?.setUsage(THREE.DynamicDrawUsage);
    const restUvs = writableUvAttribute
      ? new Float32Array(writableUvAttribute.array)
      : null;
    const restPositions = writablePositionAttribute
      ? new Float32Array(writablePositionAttribute.array)
      : null;
    bindings.push({
      mesh: node,
      geometry,
      positionAttribute: writablePositionAttribute,
      uvAttribute: writableUvAttribute,
      restPositions,
      restUvs,
      sourceVertexCount,
      sourceVertexIndices,
      sourceTvertCount,
      sourceTvertIndices,
      vertexAnimationsByClipName,
      uvAnimationsByClipName
    });
    if (writableUvAttribute) {
      uvMeshCount += 1;
    }
    if (writablePositionAttribute) {
      vertexMeshCount += 1;
    }
    nodeNames.push(node.name);
  });

  if (bindings.length === 0) {
    return null;
  }

  let wallTimeSeconds = 0;
  const apply = (deltaSeconds = 0, elapsedSeconds?: number): void => {
    if (typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)) {
      wallTimeSeconds = elapsedSeconds;
    } else if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      wallTimeSeconds += deltaSeconds;
    }

    bindings.forEach((binding) => {
      if (binding.uvAttribute && binding.restUvs) {
        const animation = binding.uvAnimationsByClipName.get(activeClipName);
        const uvArray = binding.uvAttribute.array as Float32Array;
        if (!animation) {
          uvArray.set(binding.restUvs);
          binding.uvAttribute.needsUpdate = true;
        } else {
          const samplePeriod = Math.max(0.001, Math.abs(animation.samplePeriod));
          const frameCount = Math.floor(
            animation.animTverts.length / binding.sourceTvertCount
          );
          if (frameCount <= 0) {
            uvArray.set(binding.restUvs);
            binding.uvAttribute.needsUpdate = true;
          } else {
            const rawFrame = (wallTimeSeconds / samplePeriod) % frameCount;
            const frameA = Math.floor(rawFrame) % frameCount;
            const frameB = (frameA + 1) % frameCount;
            const frameBlend = rawFrame - Math.floor(rawFrame);
            const frameOffsetA = frameA * binding.sourceTvertCount;
            const frameOffsetB = frameB * binding.sourceTvertCount;
            for (
              let vertexIndex = 0;
              vertexIndex < binding.uvAttribute.count;
              vertexIndex += 1
            ) {
              const offset = vertexIndex * binding.uvAttribute.itemSize;
              const sourceTvertIndex = binding.sourceTvertIndices[vertexIndex] ?? 0;
              const sourceUvA = animation.animTverts[frameOffsetA + sourceTvertIndex];
              const sourceUvB = animation.animTverts[frameOffsetB + sourceTvertIndex];
              if (!sourceUvA || !sourceUvB) {
                uvArray[offset] = binding.restUvs[offset] ?? 0;
                uvArray[offset + 1] = binding.restUvs[offset + 1] ?? 0;
                continue;
              }
              const u = sourceUvA[0] + (sourceUvB[0] - sourceUvA[0]) * frameBlend;
              const v = sourceUvA[1] + (sourceUvB[1] - sourceUvA[1]) * frameBlend;
              uvArray[offset] = u;
              uvArray[offset + 1] = 1 - v;
            }
            binding.uvAttribute.needsUpdate = true;
          }
        }
      }

      if (binding.positionAttribute && binding.restPositions) {
        const animation = binding.vertexAnimationsByClipName.get(activeClipName);
        const positionArray = binding.positionAttribute.array as Float32Array;
        if (!animation) {
          positionArray.set(binding.restPositions);
          binding.positionAttribute.needsUpdate = true;
          binding.geometry.computeBoundingSphere();
          return;
        }
        const samplePeriod = Math.max(0.001, Math.abs(animation.samplePeriod));
        const frameCount = Math.floor(
          animation.animVerts.length / binding.sourceVertexCount
        );
        if (frameCount <= 0) {
          positionArray.set(binding.restPositions);
          binding.positionAttribute.needsUpdate = true;
          binding.geometry.computeBoundingSphere();
          return;
        }
        const rawFrame = (wallTimeSeconds / samplePeriod) % frameCount;
        const frameA = Math.floor(rawFrame) % frameCount;
        const frameB = (frameA + 1) % frameCount;
        const frameBlend = rawFrame - Math.floor(rawFrame);
        const frameOffsetA = frameA * binding.sourceVertexCount;
        const frameOffsetB = frameB * binding.sourceVertexCount;
        for (
          let vertexIndex = 0;
          vertexIndex < binding.positionAttribute.count;
          vertexIndex += 1
        ) {
          const offset = vertexIndex * binding.positionAttribute.itemSize;
          const sourceVertexIndex = binding.sourceVertexIndices[vertexIndex] ?? 0;
          const sourceVertexA =
            animation.animVerts[frameOffsetA + sourceVertexIndex];
          const sourceVertexB =
            animation.animVerts[frameOffsetB + sourceVertexIndex];
          if (!sourceVertexA || !sourceVertexB) {
            positionArray[offset] = binding.restPositions[offset] ?? 0;
            positionArray[offset + 1] = binding.restPositions[offset + 1] ?? 0;
            positionArray[offset + 2] = binding.restPositions[offset + 2] ?? 0;
            continue;
          }
          positionArray[offset] =
            sourceVertexA[0] + (sourceVertexB[0] - sourceVertexA[0]) * frameBlend;
          positionArray[offset + 1] =
            sourceVertexA[2] + (sourceVertexB[2] - sourceVertexA[2]) * frameBlend;
          positionArray[offset + 2] =
            sourceVertexA[1] + (sourceVertexB[1] - sourceVertexA[1]) * frameBlend;
        }
        binding.positionAttribute.needsUpdate = true;
        binding.geometry.computeBoundingSphere();
      }
    });
  };

  return {
    animmeshCount: bindings.length,
    uvMeshCount,
    vertexMeshCount,
    nodeNames,
    animationClipNames: animationRuntime.clipNames,
    apply
  };
}

function buildAuroraSourceAlphaAnimationRuntime(
  animationClips: readonly THREE.AnimationClip[]
): {
  clipNames: string[];
  animationsByNodeKey: Map<string, Map<string, AuroraGltfSourceAnimationAlpha>>;
} {
  const clipNames: string[] = [];
  const animationsByNodeKey = new Map<
    string,
    Map<string, AuroraGltfSourceAnimationAlpha>
  >();

  animationClips.forEach((clip) => {
    const clipName = clip.name || `clip_${clipNames.length}`;
    const animations = readAuroraAnimationClipAlphaAnimations(clip);
    if (animations.length === 0) {
      return;
    }
    clipNames.push(clipName);
    animations.forEach((animation) => {
      const nodeKey = animation.nodeName.toLowerCase();
      let animationsByClipName = animationsByNodeKey.get(nodeKey);
      if (!animationsByClipName) {
        animationsByClipName = new Map<string, AuroraGltfSourceAnimationAlpha>();
        animationsByNodeKey.set(nodeKey, animationsByClipName);
      }
      animationsByClipName.set(clipName, animation);
    });
  });

  return {
    clipNames: clipNames.filter((name, index, all) => all.indexOf(name) === index),
    animationsByNodeKey
  };
}

function interpolateAuroraSourceAlphaKeys(
  keys: readonly AuroraGltfScalarKey[],
  timeSeconds: number,
  fallback: number
): number {
  if (keys.length === 0) {
    return fallback;
  }
  if (keys.length === 1) {
    return THREE.MathUtils.clamp(keys[0]?.value ?? fallback, 0, 1);
  }
  if (timeSeconds <= (keys[0]?.time ?? 0)) {
    return THREE.MathUtils.clamp(keys[0]?.value ?? fallback, 0, 1);
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey && timeSeconds >= lastKey.time) {
    return THREE.MathUtils.clamp(lastKey.value, 0, 1);
  }
  for (let index = 0; index < keys.length - 1; index += 1) {
    const left = keys[index];
    const right = keys[index + 1];
    if (!left || !right || timeSeconds < left.time || timeSeconds > right.time) {
      continue;
    }
    const alpha = right.time === left.time
      ? 0
      : (timeSeconds - left.time) / (right.time - left.time);
    return THREE.MathUtils.clamp(
      left.value + (right.value - left.value) * alpha,
      0,
      1
    );
  }
  return fallback;
}

export function createAuroraSourceAlphaRuntime(
  root: THREE.Object3D,
  animationClips: readonly THREE.AnimationClip[] = []
): AuroraSourceAlphaRuntime | null {
  const animationRuntime = buildAuroraSourceAlphaAnimationRuntime(animationClips);
  const activeClipName = animationRuntime.clipNames[0];
  if (!activeClipName) {
    return null;
  }

  const bindings: AuroraSourceAlphaBinding[] = [];
  const nodeNames: string[] = [];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const animationsByClipName =
      animationRuntime.animationsByNodeKey.get(node.name.toLowerCase()) ??
      new Map<string, AuroraGltfSourceAnimationAlpha>();
    if (animationsByClipName.size === 0) {
      return;
    }
    const materials = ensureAuroraSourceAlphaMaterialsWritable(node);
    if (materials.length === 0) {
      return;
    }
    bindings.push({
      mesh: node,
      materials,
      restOpacity: materials.map((material) => material.opacity),
      restTransparent: materials.map((material) => material.transparent),
      animationsByClipName
    });
    nodeNames.push(node.name);
  });

  if (bindings.length === 0) {
    return null;
  }

  let wallTimeSeconds = 0;
  const apply = (deltaSeconds = 0, elapsedSeconds?: number): void => {
    if (typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)) {
      wallTimeSeconds = elapsedSeconds;
    } else if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      wallTimeSeconds += deltaSeconds;
    }

    bindings.forEach((binding) => {
      const animation = binding.animationsByClipName.get(activeClipName);
      binding.materials.forEach((material, materialIndex) => {
        const restOpacity = binding.restOpacity[materialIndex] ?? 1;
        const alpha = animation
          ? interpolateAuroraSourceAlphaKeys(animation.alphaKeys, wallTimeSeconds, restOpacity)
          : restOpacity;
        material.opacity = alpha;
        material.transparent = (binding.restTransparent[materialIndex] ?? false) || alpha < 0.999;
        material.needsUpdate = true;
      });
    });
  };

  return {
    alphaMeshCount: bindings.length,
    nodeNames,
    animationClipNames: animationRuntime.clipNames,
    apply
  };
}

function buildAuroraSourceSelfIllumColorAnimationRuntime(
  animationClips: readonly THREE.AnimationClip[]
): {
  clipNames: string[];
  animationsByNodeKey: Map<string, Map<string, AuroraGltfSourceAnimationSelfIllumColor>>;
} {
  const clipNames: string[] = [];
  const animationsByNodeKey = new Map<
    string,
    Map<string, AuroraGltfSourceAnimationSelfIllumColor>
  >();

  animationClips.forEach((clip) => {
    const clipName = clip.name || `clip_${clipNames.length}`;
    const animations = readAuroraAnimationClipSelfIllumColorAnimations(clip);
    if (animations.length === 0) {
      return;
    }
    clipNames.push(clipName);
    animations.forEach((animation) => {
      const nodeKey = animation.nodeName.toLowerCase();
      let animationsByClipName = animationsByNodeKey.get(nodeKey);
      if (!animationsByClipName) {
        animationsByClipName = new Map<string, AuroraGltfSourceAnimationSelfIllumColor>();
        animationsByNodeKey.set(nodeKey, animationsByClipName);
      }
      animationsByClipName.set(clipName, animation);
    });
  });

  return {
    clipNames: clipNames.filter((name, index, all) => all.indexOf(name) === index),
    animationsByNodeKey
  };
}

function interpolateAuroraSourceColorKeys(
  keys: readonly AuroraGltfVectorKey[],
  timeSeconds: number,
  fallback: THREE.Color
): THREE.Color {
  if (keys.length === 0) {
    return fallback.clone();
  }
  const readColor = (key: AuroraGltfVectorKey | undefined): THREE.Color => {
    if (!key) {
      return fallback.clone();
    }
    return new THREE.Color(
      THREE.MathUtils.clamp(key.value[0], 0, 1),
      THREE.MathUtils.clamp(key.value[1], 0, 1),
      THREE.MathUtils.clamp(key.value[2], 0, 1)
    );
  };
  if (keys.length === 1 || timeSeconds <= (keys[0]?.time ?? 0)) {
    return readColor(keys[0]);
  }
  const lastKey = keys[keys.length - 1];
  if (lastKey && timeSeconds >= lastKey.time) {
    return readColor(lastKey);
  }
  for (let index = 0; index < keys.length - 1; index += 1) {
    const left = keys[index];
    const right = keys[index + 1];
    if (!left || !right || timeSeconds < left.time || timeSeconds > right.time) {
      continue;
    }
    const alpha = right.time === left.time
      ? 0
      : (timeSeconds - left.time) / (right.time - left.time);
    return new THREE.Color(
      THREE.MathUtils.clamp(left.value[0] + (right.value[0] - left.value[0]) * alpha, 0, 1),
      THREE.MathUtils.clamp(left.value[1] + (right.value[1] - left.value[1]) * alpha, 0, 1),
      THREE.MathUtils.clamp(left.value[2] + (right.value[2] - left.value[2]) * alpha, 0, 1)
    );
  }
  return fallback.clone();
}

export function createAuroraSourceSelfIllumColorRuntime(
  root: THREE.Object3D,
  animationClips: readonly THREE.AnimationClip[] = []
): AuroraSourceSelfIllumColorRuntime | null {
  const animationRuntime = buildAuroraSourceSelfIllumColorAnimationRuntime(
    animationClips
  );
  const activeClipName = animationRuntime.clipNames[0];
  if (!activeClipName) {
    return null;
  }

  const bindings: AuroraSourceSelfIllumColorBinding[] = [];
  const nodeNames: string[] = [];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const animationsByClipName =
      animationRuntime.animationsByNodeKey.get(node.name.toLowerCase()) ??
      new Map<string, AuroraGltfSourceAnimationSelfIllumColor>();
    if (animationsByClipName.size === 0) {
      return;
    }
    const materials = ensureAuroraSourceSelfIllumMaterialsWritable(node);
    if (materials.length === 0) {
      return;
    }
    materials.forEach((material) => {
      material.userData = {
        ...material.userData,
        auroraSelfIllumColorAnimationReady: true,
        auroraSelfIllumColorAnimationMode: "webviewer-selfillumcolorkey"
      };
    });
    bindings.push({
      mesh: node,
      materials,
      restEmissiveColors: materials.map((material) =>
        material.emissive instanceof THREE.Color
          ? material.emissive.clone()
          : new THREE.Color(0, 0, 0)
      ),
      restEmissiveIntensities: materials.map((material) =>
        typeof material.emissiveIntensity === "number" ? material.emissiveIntensity : 1
      ),
      animationsByClipName
    });
    nodeNames.push(node.name);
  });

  if (bindings.length === 0) {
    return null;
  }

  let wallTimeSeconds = 0;
  const apply = (deltaSeconds = 0, elapsedSeconds?: number): void => {
    if (typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)) {
      wallTimeSeconds = elapsedSeconds;
    } else if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      wallTimeSeconds += deltaSeconds;
    }

    bindings.forEach((binding) => {
      const animation = binding.animationsByClipName.get(activeClipName);
      binding.materials.forEach((material, materialIndex) => {
        const restColor =
          binding.restEmissiveColors[materialIndex] ?? new THREE.Color(0, 0, 0);
        const color = animation
          ? interpolateAuroraSourceColorKeys(
              animation.selfIllumColorKeys,
              wallTimeSeconds,
              restColor
            )
          : restColor;
        material.emissive?.copy(color);
        material.emissiveIntensity = animation
          ? Math.max(binding.restEmissiveIntensities[materialIndex] ?? 1, 1)
          : binding.restEmissiveIntensities[materialIndex] ?? 1;
        material.userData = {
          ...material.userData,
          auroraSelfIllumColorAnimationApplied: Boolean(animation),
          auroraSelfIllumColorAnimationClipName: animation ? activeClipName : "",
          auroraSelfIllumColorAnimationColor: [color.r, color.g, color.b]
        };
        material.needsUpdate = true;
      });
    });
  };

  return {
    selfIllumMeshCount: bindings.length,
    nodeNames,
    animationClipNames: animationRuntime.clipNames,
    apply
  };
}

export function createAuroraSourceDanglymeshRuntime(
  root: THREE.Object3D,
  animationClips: readonly THREE.AnimationClip[] = []
): AuroraSourceDanglymeshRuntime | null {
  const bindings: AuroraSourceDanglymeshBinding[] = [];
  const nodeNames: string[] = [];
  let weightedVertexCount = 0;
  const animationOverrides = buildAuroraSourceDanglymeshAnimationOverrideRuntime(
    animationClips
  );
  const activeOverrideClipName = animationOverrides.clipNames[0];

  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const danglymesh = readAuroraSourceDanglymeshMetadata(node);
    if (!danglymesh) {
      return;
    }
    const originalConstraints = readAuroraSourceDanglymeshConstraintWeights(
      danglymesh.originalConstraints
    );
    if (originalConstraints.length === 0) {
      return;
    }

    const geometry = ensureAuroraSourceDanglymeshGeometryWritable(node);
    const positionAttribute = geometry.getAttribute("position");
    if (
      !(positionAttribute instanceof THREE.BufferAttribute) ||
      !(positionAttribute.array instanceof Float32Array) ||
      positionAttribute.itemSize < 3
    ) {
      return;
    }

    const gltfVertexSourceIndices = readAuroraGltfIntegerList(
      danglymesh.gltfVertexSourceIndices
    );
    const constraints: number[] = [];
    let meshWeightedVertexCount = 0;
    for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += 1) {
      const sourceVertexIndex = gltfVertexSourceIndices[vertexIndex] ?? vertexIndex;
      const constraint = originalConstraints[sourceVertexIndex] ?? 0;
      constraints.push(constraint);
      if (constraint > 0.001) {
        meshWeightedVertexCount += 1;
      }
    }
    if (meshWeightedVertexCount === 0) {
      return;
    }

    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const restPositions = new Float32Array(positionAttribute.array.length);
    restPositions.set(positionAttribute.array);
    bindings.push({
      mesh: node,
      geometry,
      positionAttribute,
      restPositions,
      constraints,
      displacement: Math.max(
        0,
        readAuroraSourceFiniteNumber(danglymesh.displacement, 0.5)
      ),
      period: Math.max(0.001, readAuroraSourceFiniteNumber(danglymesh.period, 1)),
      phase: resolveAuroraDanglymeshPhase(node.name),
      weightedVertexCount: meshWeightedVertexCount,
      animationOverrides:
        animationOverrides.overridesByNodeKey.get(node.name.toLowerCase()) ??
        new Map<string, AuroraSourceDanglymeshAnimationOverride>()
    });
    nodeNames.push(node.name);
    weightedVertexCount += meshWeightedVertexCount;
  });

  if (bindings.length === 0) {
    return null;
  }

  let wallTimeSeconds = 0;
  const apply = (deltaSeconds = 0, elapsedSeconds?: number): void => {
    if (typeof elapsedSeconds === "number" && Number.isFinite(elapsedSeconds)) {
      wallTimeSeconds = elapsedSeconds;
    } else if (Number.isFinite(deltaSeconds) && deltaSeconds > 0) {
      wallTimeSeconds += deltaSeconds;
    }

    bindings.forEach((binding) => {
      const positionArray = binding.positionAttribute.array as Float32Array;
      const override =
        activeOverrideClipName ?
          binding.animationOverrides.get(activeOverrideClipName) :
          undefined;
      const displacement =
        typeof override?.displacement === "number"
          ? Math.abs(override.displacement)
          : binding.displacement;
      const overridePeriod =
        typeof override?.period === "number" ? Math.abs(override.period) : undefined;
      const period =
        typeof overridePeriod === "number" && overridePeriod > 0.001
          ? overridePeriod
          : binding.period;
      if (displacement < 0.0001) {
        positionArray.set(binding.restPositions);
        binding.positionAttribute.needsUpdate = true;
        binding.geometry.computeBoundingSphere();
        return;
      }

      const t = wallTimeSeconds / period;
      for (let vertexIndex = 0; vertexIndex < binding.constraints.length; vertexIndex += 1) {
        const offset = vertexIndex * binding.positionAttribute.itemSize;
        const constraint = binding.constraints[vertexIndex] ?? 0;
        const amplitude = displacement * constraint;
        positionArray[offset] =
          (binding.restPositions[offset] ?? 0) +
          Math.sin(t + binding.phase) * amplitude * 0.6;
        positionArray[offset + 1] =
          (binding.restPositions[offset + 1] ?? 0) +
          Math.sin(t * 1.3 + binding.phase + 1.1) * amplitude;
        positionArray[offset + 2] =
          (binding.restPositions[offset + 2] ?? 0) +
          Math.sin(t * 0.7 + binding.phase + 2.3) * amplitude * 0.4;
      }
      binding.positionAttribute.needsUpdate = true;
      binding.geometry.computeBoundingBox();
      binding.geometry.computeBoundingSphere();
    });
  };

  return {
    danglyMeshCount: bindings.length,
    weightedVertexCount,
    nodeNames,
    animationOverrideClipNames: animationOverrides.clipNames,
    animationOverrideNodeNames: animationOverrides.nodeNames,
    apply
  };
}

function resolveAuroraDanglymeshPhase(name: string): number {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) >>> 0;
  }
  return (hash % 1000) / 1000 * Math.PI * 2;
}

export function createAuroraSourceSkinningRuntime(
  root: THREE.Object3D
): AuroraSourceSkinningRuntime | null {
  const objectByName = buildAuroraSourceSkinningObjectMap(root);
  const sourceHierarchyWorldMatrixMapCache = new WeakMap<
    THREE.Object3D,
    Map<string, THREE.Matrix4>
  >();
  const bindings: AuroraSourceSkinningMeshBinding[] = [];
  const influencingBoneNamesByKey = new Map<string, string>();
  const missingBoneNamesByKey = new Map<string, string>();
  const meshNames: string[] = [];
  const boneBindingCountsByMesh: string[] = [];
  const bindPoseSourcesByMesh: string[] = [];
  const meshBindPoseSourcesByMesh: string[] = [];
  const runtimeBoundsByMesh: string[] = [];
  const runtimeCentersByMesh: string[] = [];
  const runtimeSizesByMesh: string[] = [];
  const runtimeVertexSignaturesByMesh: string[] = [];
  let weightedVertexCount = 0;
  let inverseBindPoseCount = 0;

  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const skinWeights = readAuroraSourceSkinWeightsMetadata(node);
    if (!skinWeights) {
      return;
    }
    const originalVertexWeights = readAuroraSourceOriginalVertexWeights(
      skinWeights.originalVertexWeights
    );
    if (originalVertexWeights.length === 0) {
      return;
    }
    const inverseBindPoses = buildAuroraSourceSkinningInverseBindPoseMap(
      readAuroraSourceSkinInverseBindPoses(skinWeights.inverseBindPoses)
    );
    const nodeAurora = asRecord(node.userData?.aurora);
    const sourceMeshName =
      normalizeAuroraGltfString(nodeAurora?.sourceMesh) || normalizeAuroraGltfString(node.name);
    const useCurrentPoseFallback = shouldUseCurrentPoseFallbackForAuroraSourceSkinning(
      node,
      inverseBindPoses.size
    );
    const sourceMeshBindWorld = !useCurrentPoseFallback && sourceMeshName
      ? resolveAuroraSourceHierarchyWorldMatrixForNode(
          node,
          sourceMeshName,
          sourceHierarchyWorldMatrixMapCache
        )
      : undefined;

    const geometry = ensureAuroraSourceSkinningGeometryWritable(node);
    const positionAttribute = geometry.getAttribute("position");
    if (
      !(positionAttribute instanceof THREE.BufferAttribute) ||
      !(positionAttribute.array instanceof Float32Array) ||
      positionAttribute.itemSize < 3
    ) {
      return;
    }

    const gltfVertexSourceIndices = readAuroraGltfIntegerList(
      skinWeights.gltfVertexSourceIndices
    );
    const perVertexWeights: AuroraSourceSkinWeightInfluence[][] = [];
    const boneKeysForMesh = new Set<string>();
    let meshWeightedVertexCount = 0;
    for (let vertexIndex = 0; vertexIndex < positionAttribute.count; vertexIndex += 1) {
      const sourceVertexIndex = gltfVertexSourceIndices[vertexIndex] ?? vertexIndex;
      const influences = originalVertexWeights[sourceVertexIndex] ?? [];
      influences.forEach((influence) => {
        if (objectByName.has(influence.boneKey)) {
          boneKeysForMesh.add(influence.boneKey);
          influencingBoneNamesByKey.set(influence.boneKey, influence.bone);
          return;
        }
        missingBoneNamesByKey.set(influence.boneKey, influence.bone);
      });
      if (influences.length > 0) {
        meshWeightedVertexCount += 1;
      }
      perVertexWeights.push(influences);
    }
    if (meshWeightedVertexCount === 0 || boneKeysForMesh.size === 0) {
      return;
    }

    const boneBindInverses = new Map<string, AuroraSourceSkinningBoneBindInverse>();
    const skinMatricesByBone = new Map<string, THREE.Matrix4>();
    boneKeysForMesh.forEach((boneKey) => {
      const boneObject = objectByName.get(boneKey);
      if (!boneObject) {
        return;
      }
      const sourceInverseBindPose = inverseBindPoses.get(boneKey);
      const sourceHierarchyBindWorld = useCurrentPoseFallback
        ? undefined
        : resolveAuroraSourceHierarchyWorldMatrixForNode(
            node,
            boneObject.name,
            sourceHierarchyWorldMatrixMapCache
          );
      const useSourceHierarchyModelSpaceBind =
        Boolean(
          sourceInverseBindPose &&
            sourceHierarchyBindWorld &&
            sourceMeshBindWorld &&
            !useCurrentPoseFallback
        );
      boneBindInverses.set(boneKey, {
        matrix: useSourceHierarchyModelSpaceBind && sourceHierarchyBindWorld
          ? sourceHierarchyBindWorld.clone().invert()
          : sourceInverseBindPose
            ? sourceInverseBindPose.clone()
            : sourceHierarchyBindWorld
            ? sourceHierarchyBindWorld.clone().invert()
            : boneObject.matrixWorld.clone().invert(),
        source: useSourceHierarchyModelSpaceBind
          ? "source-hierarchy"
          : sourceInverseBindPose
            ? "source-metadata"
            : sourceHierarchyBindWorld
            ? "source-hierarchy-fallback"
            : useCurrentPoseFallback
              ? "current-pose-fallback"
              : "world-fallback"
      });
      skinMatricesByBone.set(boneKey, new THREE.Matrix4());
    });
    if (boneBindInverses.size === 0) {
      return;
    }

    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    const bindPositions = readAuroraSourceSkinningBindPositions(
      geometry,
      positionAttribute
    );
    (positionAttribute.array as Float32Array).set(bindPositions);
    positionAttribute.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const meshBindWorld = useCurrentPoseFallback
      ? node.matrixWorld.clone()
      : sourceMeshBindWorld?.clone() ?? node.matrixWorld.clone();
    node.userData = {
      ...node.userData,
      auroraSourceSkinningBindPoseMode:
        geometry.userData?.[AURORA_SOURCE_SKINNING_BIND_POSITIONS_KEY] instanceof Float32Array
          ? "stored-original-positions"
          : "current-positions",
      auroraSourceSkinningBindPositionCount: positionAttribute.count,
      ...(useCurrentPoseFallback
        ? {
            auroraSourceSkinningCurrentPoseFallback: true,
            auroraSourceSkinningCurrentPoseFallbackReason:
              "creature-part-without-source-inverse-bind-poses"
          }
        : {})
    };
    const sourceMetadataBindCount = Array.from(boneBindInverses.values()).filter(
      (entry) => entry.source === "source-metadata"
    ).length;
    const sourceHierarchyBindCount = Array.from(boneBindInverses.values()).filter(
      (entry) => entry.source === "source-hierarchy"
    ).length;
    const sourceHierarchyFallbackBindCount = Array.from(boneBindInverses.values()).filter(
      (entry) => entry.source === "source-hierarchy-fallback"
    ).length;
    const currentPoseFallbackBindCount = Array.from(boneBindInverses.values()).filter(
      (entry) => entry.source === "current-pose-fallback"
    ).length;
    const worldFallbackBindCount =
      boneBindInverses.size -
      sourceMetadataBindCount -
      sourceHierarchyBindCount -
      sourceHierarchyFallbackBindCount -
      currentPoseFallbackBindCount;
    meshNames.push(node.name);
    boneBindingCountsByMesh.push(`${node.name}:${boneBindInverses.size}`);
    const bindPoseSourceFragments = [
      ...(sourceHierarchyBindCount > 0
        ? [`source-hierarchy=${sourceHierarchyBindCount}`]
        : []),
      `source-metadata=${sourceMetadataBindCount}`,
      `source-hierarchy-fallback=${sourceHierarchyFallbackBindCount}`,
      ...(currentPoseFallbackBindCount > 0
        ? [`current-pose-fallback=${currentPoseFallbackBindCount}`]
        : []),
      `world-fallback=${worldFallbackBindCount}`
    ];
    bindPoseSourcesByMesh.push(
      `${node.name}:${bindPoseSourceFragments.join(",")}`
    );
    meshBindPoseSourcesByMesh.push(
      `${node.name}:${
        useCurrentPoseFallback
          ? "current-pose-fallback"
          : sourceMeshBindWorld
            ? "source-hierarchy"
            : "current-matrix-world"
      }`
    );
    bindings.push({
      mesh: node,
      geometry,
      positionAttribute,
      bindPositions,
      perVertexWeights,
      boneBindInverses,
      skinMatricesByBone,
      meshBindWorld,
      inverseBindPoseCount: Array.from(boneKeysForMesh).filter((boneKey) =>
        inverseBindPoses.has(boneKey)
      ).length
    });
    weightedVertexCount += meshWeightedVertexCount;
    inverseBindPoseCount += Array.from(boneKeysForMesh).filter((boneKey) =>
      inverseBindPoses.has(boneKey)
    ).length;
  });

  if (bindings.length === 0) {
    return null;
  }

  const meshWorldInverse = new THREE.Matrix4();
  const bindPosition = new THREE.Vector3();
  const transformedPosition = new THREE.Vector3();
  const finalPosition = new THREE.Vector3();

  const apply = (): void => {
    root.updateMatrixWorld(true);
    runtimeBoundsByMesh.length = 0;
    runtimeCentersByMesh.length = 0;
    runtimeSizesByMesh.length = 0;
    runtimeVertexSignaturesByMesh.length = 0;
    bindings.forEach((binding) => {
      binding.mesh.updateMatrixWorld(true);
      meshWorldInverse.copy(binding.mesh.matrixWorld).invert();
      binding.boneBindInverses.forEach((boneBindInverse, boneKey) => {
        const boneObject = objectByName.get(boneKey);
        const skinMatrix = binding.skinMatricesByBone.get(boneKey);
        if (!boneObject || !skinMatrix) {
          return;
        }
        skinMatrix.multiplyMatrices(meshWorldInverse, boneObject.matrixWorld);
        skinMatrix.multiply(boneBindInverse.matrix);
        if (
          boneBindInverse.source === "source-hierarchy-fallback" ||
          boneBindInverse.source === "current-pose-fallback"
        ) {
          skinMatrix.multiply(binding.meshBindWorld);
        }
      });

      const positionArray = binding.positionAttribute.array as Float32Array;
      const stride = binding.positionAttribute.itemSize;
      for (let vertexIndex = 0; vertexIndex < binding.perVertexWeights.length; vertexIndex += 1) {
        const offset = vertexIndex * stride;
        const influences = binding.perVertexWeights[vertexIndex] ?? [];
        finalPosition.set(0, 0, 0);
        bindPosition.set(
          binding.bindPositions[offset] ?? 0,
          binding.bindPositions[offset + 1] ?? 0,
          binding.bindPositions[offset + 2] ?? 0
        );

        let totalWeight = 0;
        influences.forEach((influence) => {
          const skinMatrix = binding.skinMatricesByBone.get(influence.boneKey);
          if (!skinMatrix) {
            return;
          }
          transformedPosition.copy(bindPosition).applyMatrix4(skinMatrix);
          finalPosition.addScaledVector(transformedPosition, influence.weight);
          totalWeight += influence.weight;
        });

        if (totalWeight < 1e-6) {
          finalPosition.copy(bindPosition);
        } else if (Math.abs(totalWeight - 1) > 0.01) {
          finalPosition.divideScalar(totalWeight);
        }

        positionArray[offset] = finalPosition.x;
        positionArray[offset + 1] = finalPosition.y;
        positionArray[offset + 2] = finalPosition.z;
      }
      binding.positionAttribute.needsUpdate = true;
      binding.geometry.computeBoundingBox();
      binding.geometry.computeBoundingSphere();
      const box = binding.geometry.boundingBox;
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      if (box && !box.isEmpty()) {
        box.getCenter(center);
        box.getSize(size);
      }
      const meshName = binding.mesh.name || "skinmesh";
      const boundsLabel = formatAuroraSourceSkinningRuntimeBox(box);
      const centerLabel = formatAuroraSourceSkinningRuntimeVector(center);
      const sizeLabel = formatAuroraSourceSkinningRuntimeVector(size);
      const signatureLabel = formatAuroraSourceSkinningRuntimeVertexSignature(
        positionArray,
        stride,
        binding.perVertexWeights.length
      );
      binding.mesh.userData = {
        ...binding.mesh.userData,
        auroraSourceSkinningRuntimeBounds: boundsLabel,
        auroraSourceSkinningRuntimeCenter: centerLabel,
        auroraSourceSkinningRuntimeSize: sizeLabel,
        auroraSourceSkinningRuntimeVertexSignature: signatureLabel
      };
      runtimeBoundsByMesh.push(
        `${meshName}:${boundsLabel}`
      );
      runtimeCentersByMesh.push(`${meshName}:${centerLabel}`);
      runtimeSizesByMesh.push(`${meshName}:${sizeLabel}`);
      runtimeVertexSignaturesByMesh.push(
        `${meshName}:${signatureLabel}`
      );
    });
  };

  return {
    skinMeshCount: bindings.length,
    weightedVertexCount,
    inverseBindPoseCount,
    meshNames,
    boneBindingCountsByMesh,
    bindPoseSourcesByMesh,
    meshBindPoseSourcesByMesh,
    runtimeBoundsByMesh,
    runtimeCentersByMesh,
    runtimeSizesByMesh,
    runtimeVertexSignaturesByMesh,
    influencingBoneNames: Array.from(influencingBoneNamesByKey.values()).sort((left, right) =>
      left.localeCompare(right)
    ),
    missingBoneNames: Array.from(missingBoneNamesByKey.values()).sort((left, right) =>
      left.localeCompare(right)
    ),
    apply
  };
}

function mergePlaceableAnimationClips(
  gltfAnimations: readonly THREE.AnimationClip[],
  sourceAnimations: readonly THREE.AnimationClip[]
): THREE.AnimationClip[] {
  const clips = [...gltfAnimations];
  const names = new Set(clips.map((clip) => clip.name).filter(Boolean));
  sourceAnimations.forEach((clip) => {
    if (!clip.name || !names.has(clip.name)) {
      clips.push(clip);
      if (clip.name) {
        names.add(clip.name);
      }
    }
  });
  return clips;
}

function readPlaceableGltfAuroraModelMetadata(
  scene: THREE.Object3D
): PlaceableGltfAuroraModelMetadata {
  const aurora = asRecord(scene.userData?.aurora);
  if (!aurora) {
    return {};
  }
  const sourceModel = normalizeAuroraGltfString(aurora.sourceModel);
  const supermodel = normalizeAuroraGltfString(aurora.supermodel);
  const animationScale =
    typeof aurora.animationScale === "number" && Number.isFinite(aurora.animationScale)
      ? aurora.animationScale
      : undefined;
  const sourceAnimationNames = readAuroraGltfSourceAnimationNames(aurora);
  const sourceHierarchyNodeCount =
    typeof aurora.sourceHierarchyNodeCount === "number" &&
    Number.isFinite(aurora.sourceHierarchyNodeCount)
      ? Math.max(0, Math.trunc(aurora.sourceHierarchyNodeCount))
      : Array.isArray(aurora.sourceHierarchy)
        ? aurora.sourceHierarchy.length
        : 0;
  const sourceHierarchyRootNodeNames = readAuroraGltfStringList(
    aurora.sourceHierarchyRootNodeNames
  );
  const sourceHierarchyNodeTypes = readAuroraGltfStringList(aurora.sourceHierarchyNodeTypes);
  const sourceHierarchyDummyNodeNames = readAuroraGltfSourceHierarchyDummyNodeNames(aurora);
  return {
    ...(sourceModel ? { auroraMdlSourceModel: sourceModel } : {}),
    ...(supermodel ? { auroraMdlSupermodel: supermodel } : {}),
    ...(typeof animationScale === "number" ? { auroraMdlAnimationScale: animationScale } : {}),
    ...(sourceAnimationNames.length > 0
      ? {
          auroraMdlSourceAnimationCount: sourceAnimationNames.length,
          auroraMdlSourceAnimationNames: sourceAnimationNames
        }
      : {}),
    ...(sourceHierarchyNodeCount > 0
      ? {
          auroraMdlSourceHierarchyNodeCount: sourceHierarchyNodeCount,
          auroraMdlSourceHierarchyRootNodeNames: sourceHierarchyRootNodeNames,
          auroraMdlSourceHierarchyNodeTypes: sourceHierarchyNodeTypes,
          auroraMdlSourceHierarchyDummyNodeNames: sourceHierarchyDummyNodeNames
        }
      : {})
  };
}

function clonePlaceableModelForScene(
  model: THREE.Object3D,
  options: { cloneMaterials?: boolean } = {}
): THREE.Object3D {
  const clone = model.clone(true);
  prepareClonedPlaceableModelResources(clone, {
    cloneMaterials: options.cloneMaterials ?? true
  });
  const animationClips = readPlaceableModelAnimationClips(model);
  if (animationClips.length > 0) {
    writePlaceableModelAnimationClips(clone, animationClips);
  }
  return clone;
}

function countRenderableModelMeshes(model: THREE.Object3D): number {
  let count = 0;
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      count += 1;
    }
  });
  return count;
}

function isPlaceableNormalizedModelPresentationMetrics(
  value: unknown
): value is PlaceableNormalizedModelPresentationMetrics {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Partial<PlaceableNormalizedModelPresentationMetrics>;
  const boundsSize = candidate.boundsSize as
    | Partial<PlaceableNormalizedModelPresentationMetrics["boundsSize"]>
    | undefined;
  if (!boundsSize || typeof boundsSize !== "object") {
    return false;
  }
  return (
    typeof candidate.meshCount === "number" &&
    typeof candidate.boundsEmpty === "boolean" &&
    typeof candidate.boundsLabel === "string" &&
    typeof boundsSize.x === "number" &&
    typeof boundsSize.y === "number" &&
    typeof boundsSize.z === "number"
  );
}

export function readPlaceableNormalizedModelPresentationMetrics(
  model: THREE.Object3D
): PlaceableNormalizedModelPresentationMetrics | null {
  const metrics = model.userData?.[PLACEABLE_NORMALIZED_MODEL_PRESENTATION_METRICS_KEY];
  return isPlaceableNormalizedModelPresentationMetrics(metrics) ? metrics : null;
}

export function resolvePlaceableNormalizedModelPresentationMetrics(
  model: THREE.Object3D
): PlaceableNormalizedModelPresentationMetrics {
  const cached = readPlaceableNormalizedModelPresentationMetrics(model);
  if (cached) {
    return cached;
  }
  const bounds = new THREE.Box3().setFromObject(model);
  const boundsSize = new THREE.Vector3();
  if (!bounds.isEmpty()) {
    bounds.getSize(boundsSize);
  }
  const metrics: PlaceableNormalizedModelPresentationMetrics = {
    meshCount: countRenderableModelMeshes(model),
    boundsEmpty: bounds.isEmpty(),
    boundsSize: {
      x: boundsSize.x,
      y: boundsSize.y,
      z: boundsSize.z
    },
    boundsLabel: bounds.isEmpty()
      ? "empty"
      : `${boundsSize.x.toFixed(3)}x${boundsSize.y.toFixed(3)}x${boundsSize.z.toFixed(3)}`
  };
  model.userData = {
    ...model.userData,
    [PLACEABLE_NORMALIZED_MODEL_PRESENTATION_METRICS_KEY]: metrics
  };
  return metrics;
}

export function ensurePlaceableModel(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  options: {
    cloneMaterials?: boolean;
    cacheKey?: string | null;
    priority?: PlaceableModelLoadPriority;
    loadMode?: PlaceableModelLoadMode;
    sourceHierarchyMode?: PlaceableModelSourceHierarchyMode;
    timeoutMs?: number;
  } = {}
): Promise<THREE.Object3D | null> {
  const runtimeCacheKey = resolvePlaceableModelRuntimeCacheKeyWithOptions(modelUrl, options);
  const cachedModel = runtime.placeableModelCacheByUrl.get(runtimeCacheKey);
  if (cachedModel) {
    recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
      stage: "cached",
      completedAtMs: Date.now()
    });
    return Promise.resolve(clonePlaceableModelForScene(cachedModel, options));
  }

  const pendingModel = runtime.placeableModelPendingByUrl.get(runtimeCacheKey);
  if (pendingModel) {
    recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
      stage: "requested",
      startedAtMs: Date.now()
    });
    return pendingModel.then((resolvedModel) =>
      resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
    );
  }

  recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
    stage: "requested",
    startedAtMs: Date.now()
  });
  const request = loadPlaceableModelWithRetry(
    runtime,
    modelUrl,
    runtimeCacheKey,
    {
      priority: options.priority,
      loadMode: options.loadMode,
      sourceHierarchyMode: options.sourceHierarchyMode,
      timeoutMs: options.timeoutMs
    }
  )
    .then((model) => {
      if (model) {
        recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
          stage: "decoded",
          completedAtMs: Date.now()
        });
        recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
          stage: "cached",
          completedAtMs: Date.now()
        });
      } else {
        recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
          stage: "failed",
          completedAtMs: Date.now(),
          error: "model-load-failed"
        });
      }
      return model;
    })
    .finally(() => {
    runtime.placeableModelPendingByUrl.delete(runtimeCacheKey);
  });
  runtime.placeableModelPendingByUrl.set(runtimeCacheKey, request);
  return request.then((resolvedModel) =>
    resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
  );
}

async function loadPlaceableModelWithRetry(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  runtimeCacheKey: string,
  options: {
    priority?: PlaceableModelLoadPriority;
    loadMode?: PlaceableModelLoadMode;
    sourceHierarchyMode?: PlaceableModelSourceHierarchyMode;
    timeoutMs?: number;
  } = {}
): Promise<THREE.Object3D | null> {
  beginTrackedPlaceableModelLoadRequest(runtime);
  try {
    for (let attempt = 0; attempt <= PLACEABLE_MODEL_LOAD_RETRY_COUNT; attempt += 1) {
      const attemptUrl =
        attempt === 0 ? modelUrl : appendPlaceableModelRetryToken(modelUrl, attempt);
      recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
        stage: "requested",
        startedAtMs: Date.now(),
        retryCount: attempt
      });
      let loadedModel: THREE.Object3D | null;
      try {
        loadedModel = await schedulePlaceableModelLoad(
          runtime,
          attemptUrl,
          () =>
            loadPlaceableModelOnce(runtime, attemptUrl, {
              loadMode: options.loadMode,
              sourceHierarchyMode: options.sourceHierarchyMode,
              timeoutMs: options.timeoutMs
            }),
          { priority: options.priority }
        );
      } catch (error) {
        if (isPlaceableModelLoadQueueCancelledError(error)) {
          return null;
        }
        throw error;
      }
      if (loadedModel) {
        runtime.placeableModelCacheByUrl.set(runtimeCacheKey, loadedModel);
        return loadedModel;
      }
      if (hasPlaceableAssetCacheMiss(runtime, modelUrl)) {
        return null;
      }
      if (attempt < PLACEABLE_MODEL_LOAD_RETRY_COUNT) {
        await delayPlaceableModelRetry(
          resolvePlaceableModelRetryDelayMs(runtime, attempt)
        );
      }
    }
    return null;
  } finally {
    completeTrackedPlaceableModelLoadRequest(runtime);
  }
}

function loadPlaceableModelOnce(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  options: {
    loadMode?: PlaceableModelLoadMode;
    sourceHierarchyMode?: PlaceableModelSourceHierarchyMode;
    timeoutMs?: number;
  } = {}
): Promise<THREE.Object3D | null> {
  if (runtime.placeableModelFetch && options.loadMode !== "loader") {
    return loadPlaceableModelFromArrayBuffer(runtime, modelUrl, options);
  }
  return new Promise<THREE.Object3D | null>((resolve) => {
    let settled = false;
    const timeout = globalThis.setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(null);
    }, resolvePlaceableModelLoadTimeoutMs(runtime, options.timeoutMs));
    const finish = (model: THREE.Object3D | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timeout);
      resolve(model);
    };
    runtime.placeableModelLoader.load(
      modelUrl,
      (gltf) => {
        finish(resolvePlaceableGltfScene(gltf, options));
      },
      undefined,
      () => {
        finish(null);
      }
    );
  });
}

function resolvePlaceableModelLoadTimeoutMs(
  runtime: PlaceableModelRuntimeCache,
  overrideMs?: number
): number {
  if (Number.isFinite(overrideMs ?? Number.NaN) && (overrideMs ?? 0) > 0) {
    return Math.max(1_000, Math.min(120_000, Math.trunc(overrideMs ?? 0)));
  }
  const configured = runtime.placeableModelLoadTimeoutMs;
  if (!Number.isFinite(configured ?? Number.NaN) || (configured ?? 0) <= 0) {
    return PLACEABLE_MODEL_LOAD_TIMEOUT_MS;
  }
  return Math.max(1_000, Math.min(120_000, Math.trunc(configured ?? 0)));
}

async function loadPlaceableModelFromArrayBuffer(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  options: {
    sourceHierarchyMode?: PlaceableModelSourceHierarchyMode;
    timeoutMs?: number;
  } = {}
): Promise<THREE.Object3D | null> {
  const abortController =
    typeof AbortController !== "undefined" ? new AbortController() : null;
  let timeout: ReturnType<typeof globalThis.setTimeout> | null = null;
  try {
    const timeoutPromise = new Promise<null>((resolve) => {
      timeout = globalThis.setTimeout(() => {
        writePlaceableModelLoadOutcomeDiagnostics(runtime, modelUrl, "timeout", {
          timeoutMs: resolvePlaceableModelLoadTimeoutMs(runtime, options.timeoutMs)
        });
        abortController?.abort();
        resolve(null);
      }, resolvePlaceableModelLoadTimeoutMs(runtime, options.timeoutMs));
    });
    const loadPromise = (async (): Promise<THREE.Object3D | null> => {
      writePlaceableModelLoadOutcomeDiagnostics(runtime, modelUrl, "fetch_start");
      const response = await runtime.placeableModelFetch?.(modelUrl, {
        headers: runtime.placeableModelRequestHeader,
        ...(abortController ? { signal: abortController.signal } : {})
      });
      if (!response || response.ok === false) {
        if (response) {
          await recordPlaceableAssetCacheMissIfExact(runtime, modelUrl, "model", response);
        }
        recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
          stage: "requested",
          completedAtMs: Date.now(),
          httpStatus: response?.status ?? null,
          error: "model-http-non-ok"
        });
        writePlaceableModelLoadOutcomeDiagnostics(runtime, modelUrl, "fetch_failed", {
          status: response?.status ?? null,
          ok: response?.ok ?? null
        });
        return null;
      }
      const modelBuffer = await response.arrayBuffer();
      recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
        stage: "requested",
        completedAtMs: Date.now(),
        httpStatus: response.status
      });
      writePlaceableModelLoadOutcomeDiagnostics(runtime, modelUrl, "fetch_complete", {
        status: response.status ?? null,
        bytes: modelBuffer.byteLength
      });
      const parsedModel = await parsePlaceableModelArrayBuffer(
        runtime,
        modelUrl,
        modelBuffer,
        options
      );
      writePlaceableModelLoadOutcomeDiagnostics(
        runtime,
        modelUrl,
        parsedModel ? "parse_complete" : "parse_null",
        { bytes: modelBuffer.byteLength }
      );
      if (parsedModel) {
        recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
          stage: "decoded",
          completedAtMs: Date.now(),
          httpStatus: response.status
        });
      }
      return parsedModel;
    })();
    return await Promise.race([loadPromise, timeoutPromise]);
  } catch {
    recordVfxRuntimeAssetSettlement(runtime, modelUrl, {
      stage: "failed",
      completedAtMs: Date.now(),
      error: "model-fetch-or-parse-exception"
    });
    writePlaceableModelLoadOutcomeDiagnostics(runtime, modelUrl, "exception");
    return null;
  } finally {
    if (timeout) {
      globalThis.clearTimeout(timeout);
    }
  }
}

function parsePlaceableModelArrayBuffer(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  modelBuffer: ArrayBuffer,
  options: { sourceHierarchyMode?: PlaceableModelSourceHierarchyMode } = {}
): Promise<THREE.Object3D | null> {
  return new Promise<THREE.Object3D | null>((resolve) => {
    runtime.placeableModelLoader.parse(
      modelBuffer,
      resolvePlaceableModelResourcePath(modelUrl),
      (gltf) => {
        resolve(resolvePlaceableGltfScene(gltf, options));
      },
      () => {
        resolve(null);
      }
    );
  });
}

function resolvePlaceableGltfScene(
  gltf: PlaceableGltfLike,
  options: { sourceHierarchyMode?: PlaceableModelSourceHierarchyMode } = {}
): THREE.Object3D | null {
  const scene = gltf.scene ?? null;
  if (!scene) {
    return null;
  }
  mergePlaceableGltfParserAuroraExtrasIntoScene(gltf, scene);
  const sourceHierarchySynthesis =
    options.sourceHierarchyMode === "preserve-loaded"
      ? {
          synthesizedNodeCount: 0,
          synthesizedNodeNames: [],
          reparentedNodeCount: 0,
          rebasedGeometryCount: 0,
          rebasedGeometryNodeNames: []
        }
      : ensureAuroraSourceHierarchyObjects(scene);
  const sourceAnimationClips = buildAuroraSourceAnimationClips(scene);
  applyAuroraMdlRenderFlags(scene);
  const animations = mergePlaceableAnimationClips(gltf.animations ?? [], sourceAnimationClips);
  const auroraModelMetadata = readPlaceableGltfAuroraModelMetadata(scene);
  scene.userData = {
    ...scene.userData,
    ...auroraModelMetadata,
    ...(sourceHierarchySynthesis.synthesizedNodeCount > 0
      ? {
          auroraMdlSourceHierarchySynthesizedNodeCount:
            sourceHierarchySynthesis.synthesizedNodeCount,
          auroraMdlSourceHierarchySynthesizedNodeNames:
            sourceHierarchySynthesis.synthesizedNodeNames
        }
      : {}),
    ...(sourceHierarchySynthesis.reparentedNodeCount > 0
      ? {
          auroraMdlSourceHierarchyReparentedNodeCount:
            sourceHierarchySynthesis.reparentedNodeCount
        }
      : {}),
    ...(sourceHierarchySynthesis.rebasedGeometryCount > 0
      ? {
          auroraMdlSourceHierarchyRebasedGeometryCount:
            sourceHierarchySynthesis.rebasedGeometryCount,
          auroraMdlSourceHierarchyRebasedGeometryNodeNames:
            sourceHierarchySynthesis.rebasedGeometryNodeNames
        }
      : {}),
    ...(sourceAnimationClips.length > 0
      ? {
          auroraMdlSourceAnimationClipCount: sourceAnimationClips.length,
          auroraMdlSourceAnimationClipNames: sourceAnimationClips.map((clip) => clip.name)
        }
      : {}),
    auroraGltfAnimationCount: animations.length,
    auroraGltfAnimationNames: animations.map((animation) => animation.name).filter(Boolean),
    auroraGltfAnimationDurations: animations.map((animation) => animation.duration),
    auroraGltfHasAnimations: animations.length > 0
  };
  if (animations.length > 0) {
    writePlaceableModelAnimationClips(scene, animations);
  }
  return scene;
}

function resolvePlaceableModelResourcePath(modelUrl: string): string {
  try {
    const parsed = new URL(modelUrl, window.location.href);
    const lastSlashIndex = parsed.href.lastIndexOf("/");
    return lastSlashIndex >= 0 ? parsed.href.slice(0, lastSlashIndex + 1) : parsed.href;
  } catch {
    const stripped = modelUrl.split("?")[0]?.split("#")[0] ?? modelUrl;
    const lastSlashIndex = stripped.lastIndexOf("/");
    return lastSlashIndex >= 0 ? stripped.slice(0, lastSlashIndex + 1) : "";
  }
}

function appendPlaceableModelRetryToken(modelUrl: string, attempt: number): string {
  try {
    const url = new URL(modelUrl, window.location.href);
    url.searchParams.set("auroraModelRetry", String(attempt));
    return url.toString();
  } catch {
    const separator = modelUrl.includes("?") ? "&" : "?";
    return `${modelUrl}${separator}auroraModelRetry=${attempt}`;
  }
}

function delayPlaceableModelRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function resolvePlaceableModelRetryDelayMs(
  runtime: PlaceableModelRuntimeCache,
  attempt: number
): number {
  const state = placeableModelLoadQueues.get(runtime);
  const queuePressureDelayMs = state
    ? Math.min(
        PLACEABLE_MODEL_LOAD_RETRY_QUEUE_PRESSURE_DELAY_CAP_MS,
        state.queue.length * 2
      )
    : 0;
  return PLACEABLE_MODEL_LOAD_RETRY_DELAY_MS * (attempt + 1) + queuePressureDelayMs;
}

function normalizePlaceableModelCacheNumber(value: number, fallback: string): string {
  return Number.isFinite(value) ? value.toFixed(6) : fallback;
}

export function buildNormalizedPlaceableModelCacheKey(
  modelUrl: string,
  objectRadius: number,
  options: PlaceableModelNormalizeOptions = {}
): string {
  const runtimeCacheKey = resolvePlaceableModelRuntimeCacheKeyWithOptions(modelUrl, options);
  const normalizedRadius = normalizePlaceableModelCacheNumber(objectRadius, "default");
  const targetMaxAxisFactor = normalizePlaceableModelCacheNumber(
    options.targetMaxAxisFactor ?? PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR,
    "default"
  );
  return `${runtimeCacheKey}|r:${normalizedRadius}|f:${targetMaxAxisFactor}`;
}

export function ensureNormalizedPlaceableModel(
  runtime: PlaceableModelRuntimeCache,
  modelUrl: string,
  objectRadius: number,
  options: PlaceableModelNormalizeOptions = {}
): Promise<THREE.Object3D | null> {
  const cacheKey = buildNormalizedPlaceableModelCacheKey(modelUrl, objectRadius, options);
  const cachedModel = runtime.placeableNormalizedModelCacheByKey.get(cacheKey);
  if (cachedModel) {
    return Promise.resolve(clonePlaceableModelForScene(cachedModel, options));
  }

  const pendingModel = runtime.placeableNormalizedModelPendingByKey.get(cacheKey);
  if (pendingModel) {
    return pendingModel.then((resolvedModel) =>
      resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
    );
  }

  const request = ensurePlaceableModel(runtime, modelUrl, {
    cacheKey: options.cacheKey,
    loadMode: options.modelLoadMode,
    priority: options.modelLoadPriority,
    sourceHierarchyMode: options.sourceHierarchyMode
  })
    .then((resolvedModel) => {
      if (!resolvedModel) {
        return null;
      }
      normalizePlaceableModelToObjectRadius(objectRadius, resolvedModel, options);
      resolvePlaceableNormalizedModelPresentationMetrics(resolvedModel);
      runtime.placeableNormalizedModelCacheByKey.set(cacheKey, resolvedModel);
      return resolvedModel;
    })
    .finally(() => {
      runtime.placeableNormalizedModelPendingByKey.delete(cacheKey);
    });
  runtime.placeableNormalizedModelPendingByKey.set(cacheKey, request);
  return request.then((resolvedModel) =>
    resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
  );
}

export function normalizePlaceableModelToObjectRadius(
  objectRadius: number,
  model: THREE.Object3D,
  options: PlaceableModelNormalizeOptions = {}
): void {
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) {
    return;
  }
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const maxAxis = Math.max(size.x, size.y, size.z);
  let modelScaleFactor = 1;
  if (maxAxis > 0 && Number.isFinite(maxAxis)) {
    const targetMaxAxis =
      objectRadius *
      (options.targetMaxAxisFactor ?? PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR);
    modelScaleFactor = targetMaxAxis / maxAxis;
    model.scale.multiplyScalar(modelScaleFactor);
  }
  const center = new THREE.Vector3();
  bounds.getCenter(center);
  model.position.x -= center.x * modelScaleFactor;
  model.position.y -= bounds.min.y * modelScaleFactor;
  model.position.z -= center.z * modelScaleFactor;
}
