import * as THREE from "three";
import type { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { decodeAuroraTpcTexture } from "../aurora/auroraTpcTextureDecoder";
import { normalizePlaceableTextureReference } from "../../application/placeableTextureReferences";

export const PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR = 1.35;
export const PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR = 4;
export const PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG = "auroraSharedPlaceableModelGeometry";
export const PLACEABLE_SHARED_MODEL_MATERIAL_FLAG = "auroraSharedPlaceableModelMaterial";
export const PLACEABLE_NORMALIZED_MODEL_PRESENTATION_METRICS_KEY =
  "auroraPlaceableNormalizedModelPresentationMetrics";
export const PLACEABLE_MODEL_LOAD_CONCURRENCY_LIMIT = 6;
export const PLACEABLE_MODEL_LOAD_STARTS_PER_FRAME_LIMIT = 3;
export const PLACEABLE_MODEL_BULK_LOAD_QUEUE_THRESHOLD = 96;
export const PLACEABLE_MODEL_BULK_LOAD_CONCURRENCY_LIMIT = 32;
export const PLACEABLE_MODEL_BULK_LOAD_STARTS_PER_FRAME_LIMIT = 8;
export const PLACEABLE_MODEL_LOAD_QUEUE_PROGRESS_EVENT =
  "workspace:placeable-model-load-queue-progress";

export interface PlaceableModelNormalizeOptions {
  targetMaxAxisFactor?: number;
  cloneMaterials?: boolean;
  cacheKey?: string | null;
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

export interface PlaceableTextureLoaderLike {
  load(
    url: string,
    onLoad: (texture: THREE.Texture) => void,
    onProgress?: ((event: ProgressEvent) => void) | undefined,
    onError?: ((event: unknown) => void) | undefined
  ): unknown;
}

export type PlaceableTextureFetch = (
  input: string,
  init?: { headers?: Record<string, string> }
) => Promise<{
  ok?: boolean;
  arrayBuffer: () => Promise<ArrayBuffer>;
  blob?: () => Promise<Blob>;
}>;

export interface PlaceableTextureRuntimeCache {
  placeableTextureLoader: PlaceableTextureLoaderLike;
  placeableDdsTextureLoader: PlaceableTextureLoaderLike;
  placeableTgaTextureLoader: PlaceableTextureLoaderLike;
  placeableTextureFetch?: PlaceableTextureFetch;
  placeableTextureRequestHeader?: Record<string, string>;
  placeableTextureCacheByUrl: Map<string, THREE.Texture>;
  placeableTexturePendingByUrl: Map<string, Promise<THREE.Texture | null>>;
}

export interface PlaceableModelRuntimeCache {
  placeableModelLoader: Pick<GLTFLoader, "load">;
  placeableModelCacheByUrl: Map<string, THREE.Object3D>;
  placeableModelPendingByUrl: Map<string, Promise<THREE.Object3D | null>>;
  placeableNormalizedModelCacheByKey: Map<string, THREE.Object3D>;
  placeableNormalizedModelPendingByKey: Map<string, Promise<THREE.Object3D | null>>;
  placeableModelLoadConcurrencyLimit?: number;
  placeableModelLoadStartsPerFrameLimit?: number;
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

interface ScheduledPlaceableModelLoad {
  start: () => Promise<THREE.Object3D | null>;
  resolve: (model: THREE.Object3D | null) => void;
  currentLabel: string;
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

const placeableModelLoadQueues = new WeakMap<object, PlaceableModelLoadQueueState>();

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
        state.currentLoadCompleted = Math.min(
          state.currentLoadTotal,
          state.currentLoadCompleted + 1
        );
        if (state.activeCount === 0 && state.queue.length === 0) {
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
  start: () => Promise<THREE.Object3D | null>
): Promise<THREE.Object3D | null> {
  const state = readPlaceableModelLoadQueueState(runtime);
  if (state.activeCount === 0 && state.queue.length === 0) {
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
  state.currentLoadTotal += 1;
  const request = new Promise<THREE.Object3D | null>((resolve) => {
    state.queue.push({
      start,
      resolve,
      currentLabel: formatPlaceableModelLoadCurrentLabel(modelUrl)
    });
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
  state.queue.splice(0).forEach((entry) => entry.resolve(null));
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

function configureLoadedPlaceableTexture(
  texture: THREE.Texture,
  sourceFormat?: string
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.needsUpdate = true;
  if (sourceFormat) {
    texture.userData = {
      ...texture.userData,
      auroraSourceFormat: sourceFormat
    };
  }
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
    loader.load(
      textureUrl,
      (texture) => {
        resolve(isInvalidCompressedPlaceableTexture(texture) ? null : texture);
      },
      undefined,
      () => {
        resolve(null);
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

function shouldLoadPlaceableTextureWithFetchedObjectUrl(
  runtime: PlaceableTextureRuntimeCache
): boolean {
  return (
    Boolean(runtime.placeableTextureFetch) &&
    hasPlaceableTextureRequestHeaders(runtime) &&
    canCreateObjectUrl()
  );
}

async function fetchPlaceableTextureBlob(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<Blob | null> {
  if (!runtime.placeableTextureFetch) {
    return null;
  }

  try {
    const response = await runtime.placeableTextureFetch(textureUrl, {
      headers: runtime.placeableTextureRequestHeader ?? {}
    });
    if (response.ok === false) {
      return null;
    }
    if (typeof response.blob === "function") {
      return response.blob();
    }
    return new Blob([await response.arrayBuffer()]);
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
    const response = await runtime.placeableTextureFetch(textureUrl, {
      headers: runtime.placeableTextureRequestHeader ?? {}
    });
    if (response.ok === false) {
      return null;
    }
    const decodedTexture = decodeAuroraTpcTexture(await response.arrayBuffer());
    if (!decodedTexture) {
      return null;
    }
    return configureLoadedPlaceableTexture(
      new THREE.DataTexture(
        decodedTexture.data,
        decodedTexture.width,
        decodedTexture.height,
        THREE.RGBAFormat
      ),
      decodedTexture.sourceFormat
    );
  } catch {
    return null;
  }
}

export function ensurePlaceableTexture(
  runtime: PlaceableTextureRuntimeCache,
  textureUrl: string
): Promise<THREE.Texture | null> {
  const cachedTexture = runtime.placeableTextureCacheByUrl.get(textureUrl);
  if (cachedTexture) {
    return Promise.resolve(cachedTexture);
  }
  const pendingTexture = runtime.placeableTexturePendingByUrl.get(textureUrl);
  if (pendingTexture) {
    return pendingTexture;
  }
  const request = (async () => {
    if (runtime.placeableTextureFetch && shouldAttemptAuroraTpcDecode(textureUrl)) {
      const auroraTpcTexture = await loadAuroraTpcTextureWithFetch(runtime, textureUrl);
      if (auroraTpcTexture) {
        runtime.placeableTextureCacheByUrl.set(textureUrl, auroraTpcTexture);
        return auroraTpcTexture;
      }
    }

    if (shouldLoadPlaceableTextureWithFetchedObjectUrl(runtime)) {
      const fetchedObjectUrlTexture = await loadPlaceableTextureWithFetchedObjectUrl(
        runtime,
        textureUrl
      );
      if (fetchedObjectUrlTexture) {
        configureLoadedPlaceableTexture(fetchedObjectUrlTexture);
        runtime.placeableTextureCacheByUrl.set(textureUrl, fetchedObjectUrlTexture);
        return fetchedObjectUrlTexture;
      }
    }

    for (const loader of resolvePlaceableTextureLoaderCandidates(runtime, textureUrl)) {
      const texture = await loadPlaceableTextureWithLoader(loader, textureUrl);
      if (!texture) {
        continue;
      }
      configureLoadedPlaceableTexture(texture);
      runtime.placeableTextureCacheByUrl.set(textureUrl, texture);
      return texture;
    }
    return null;
  })().finally(() => {
    runtime.placeableTexturePendingByUrl.delete(textureUrl);
  });
  runtime.placeableTexturePendingByUrl.set(textureUrl, request);
  return request;
}

export function ensurePlaceableTexturesByReference(
  runtime: PlaceableTextureRuntimeCache,
  textureUrlsByReference: Map<string, string>
): Promise<Map<string, THREE.Texture>> {
  return Promise.all(
    Array.from(textureUrlsByReference.entries()).map(async ([reference, textureUrl]) => {
      const texture = await ensurePlaceableTexture(runtime, textureUrl);
      return texture ? ([reference, texture] as const) : null;
    })
  ).then((entries) => {
    const texturesByReference = new Map<string, THREE.Texture>();
    entries.forEach((entry) => {
      if (entry) {
        texturesByReference.set(entry[0], entry[1]);
      }
    });
    return texturesByReference;
  });
}

function materialSupportsTextureMap(
  material: THREE.Material
): material is THREE.Material & { map: THREE.Texture | null; alphaTest: number } {
  return "map" in material;
}

function textureLikelyUsesAlpha(texture: THREE.Texture): boolean {
  if (!texture) {
    return false;
  }

  const withFormat = texture as THREE.Texture & { format?: number };
  if (
    withFormat.format === THREE.RGBA_S3TC_DXT1_Format ||
    withFormat.format === THREE.RGBA_S3TC_DXT3_Format ||
    withFormat.format === THREE.RGBA_S3TC_DXT5_Format
  ) {
    return true;
  }

  const withImageData = texture as THREE.Texture & {
    image?: { data?: ArrayLike<number> };
  };
  const alphaData = withImageData.image?.data;
  if (!alphaData || alphaData.length < 4) {
    return false;
  }
  for (let index = 3; index < alphaData.length; index += 4) {
    if (alphaData[index] !== 255) {
      return true;
    }
  }
  return false;
}

function applyTextureToMaterial(
  material: THREE.Material & { map: THREE.Texture | null; alphaTest: number },
  texture: THREE.Texture
): void {
  material.map = texture;
  material.side = THREE.DoubleSide;
  const usesAlpha = textureLikelyUsesAlpha(texture);
  material.transparent = usesAlpha;
  material.opacity = 1;
  material.alphaTest = usesAlpha ? 0.01 : 0;
  if ("depthWrite" in material) {
    material.depthWrite = true;
  }
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
  texture: THREE.Texture
): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    ensurePlaceableMeshUvCoordinates(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    let didUpdateMaterial = false;
    materials.forEach((material) => {
      if (!materialSupportsTextureMap(material)) {
        return;
      }
      applyTextureToMaterial(material, texture);
      didUpdateMaterial = true;
    });
    if (didUpdateMaterial) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

export function applyPlaceableTexturesToModel(
  model: THREE.Object3D,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture?: THREE.Texture
): void {
  const singleTextureFallback =
    fallbackTexture ??
    (texturesByReference.size === 1 ? Array.from(texturesByReference.values())[0] : undefined);
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    ensurePlaceableMeshUvCoordinates(node);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    let didUpdateMaterial = false;
    materials.forEach((material) => {
      const texture = resolveTextureForMaterial(
        material,
        texturesByReference,
        singleTextureFallback
      );
      if (!texture || !materialSupportsTextureMap(material)) {
        return;
      }
      applyTextureToMaterial(material, texture);
      didUpdateMaterial = true;
    });
    if (didUpdateMaterial) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
}

function resolveTextureForMaterial(
  material: THREE.Material,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture: THREE.Texture | undefined
): THREE.Texture | undefined {
  for (const reference of resolveMaterialTextureReferences(material)) {
    const texture = texturesByReference.get(reference);
    if (texture) {
      return texture;
    }
    const aliasedTexture = resolveTextureByAuroraMaterialAlias(
      reference,
      texturesByReference
    );
    if (aliasedTexture) {
      return aliasedTexture;
    }
  }
  return fallbackTexture;
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
  const candidates = deduplicateAliasPrefixes([
    normalized,
    bare,
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
    const startsWithUnderscore = [...texturesByReference.entries()].find(([key]) =>
      key.startsWith(`${prefix}_`)
    );
    if (startsWithUnderscore) {
      return startsWithUnderscore[1];
    }
    const startsWith = [...texturesByReference.entries()].find(([key]) =>
      key.startsWith(prefix)
    );
    if (startsWith) {
      return startsWith[1];
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

function resolveMaterialTextureReferences(material: THREE.Material): string[] {
  const userData = material.userData as Record<string, unknown>;
  const aurora = asRecord(userData.aurora);
  const references: string[] = [];
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
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

function clonePlaceableModelForScene(
  model: THREE.Object3D,
  options: { cloneMaterials?: boolean } = {}
): THREE.Object3D {
  const clone = model.clone(true);
  prepareClonedPlaceableModelResources(clone, {
    cloneMaterials: options.cloneMaterials ?? true
  });
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
  options: { cloneMaterials?: boolean; cacheKey?: string | null } = {}
): Promise<THREE.Object3D | null> {
  const runtimeCacheKey = resolvePlaceableModelRuntimeCacheKey(modelUrl, options.cacheKey);
  const cachedModel = runtime.placeableModelCacheByUrl.get(runtimeCacheKey);
  if (cachedModel) {
    return Promise.resolve(clonePlaceableModelForScene(cachedModel, options));
  }

  const pendingModel = runtime.placeableModelPendingByUrl.get(runtimeCacheKey);
  if (pendingModel) {
    return pendingModel.then((resolvedModel) =>
      resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
    );
  }

  const request = schedulePlaceableModelLoad(
    runtime,
    modelUrl,
    () =>
      new Promise<THREE.Object3D | null>((resolve) => {
        runtime.placeableModelLoader.load(
          modelUrl,
          (gltf) => {
            const loadedModel = gltf.scene;
            if (!loadedModel) {
              resolve(null);
              return;
            }
            runtime.placeableModelCacheByUrl.set(runtimeCacheKey, loadedModel);
            resolve(loadedModel);
          },
          undefined,
          () => {
            resolve(null);
          }
        );
      })
  ).finally(() => {
    runtime.placeableModelPendingByUrl.delete(runtimeCacheKey);
  });
  runtime.placeableModelPendingByUrl.set(runtimeCacheKey, request);
  return request.then((resolvedModel) =>
    resolvedModel ? clonePlaceableModelForScene(resolvedModel, options) : null
  );
}

function normalizePlaceableModelCacheNumber(value: number, fallback: string): string {
  return Number.isFinite(value) ? value.toFixed(6) : fallback;
}

export function buildNormalizedPlaceableModelCacheKey(
  modelUrl: string,
  objectRadius: number,
  options: PlaceableModelNormalizeOptions = {}
): string {
  const runtimeCacheKey = resolvePlaceableModelRuntimeCacheKey(modelUrl, options.cacheKey);
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

  const request = ensurePlaceableModel(runtime, modelUrl, { cacheKey: options.cacheKey })
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
