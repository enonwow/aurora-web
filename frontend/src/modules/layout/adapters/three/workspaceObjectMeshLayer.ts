import * as THREE from "three";
import type { PlaceableViewportRenderPayload } from "../../../placeables/application/placeableRenderPayloadResolver";
import {
  buildVfxPayloadFromPlaceablePreview,
  buildVfxPayloadFromRenderPayload
} from "../../../placeables/application/placeableVfxPreservePayload";
import {
  applyPlaceableTextureToModel,
  applyPlaceableTexturesToModel,
  ensureNormalizedPlaceableModel,
  ensurePlaceableModel,
  ensurePlaceableTexture,
  PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR,
  PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
  PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG,
  resolvePlaceableNormalizedModelPresentationMetrics
} from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import type { RuntimeSoundNowPlayingBadge } from "../../runtimeSoundPlaybackState";
import { SOUND_NOW_PLAYING_BADGE_LABEL } from "../../application/workspaceObjectPropertyDrafts";
import type { SceneObject, SceneObjectKind } from "../../contracts";
import {
  normalizeSoundGuidePositioning,
  resolveEditorSoundGuideOverlayFlags
} from "../../soundGuideDomain";
import { isVisualTransformAppliedToObject } from "../../visualTransformGizmoRules";
import {
  isKindLocked,
  resolveMockRenderStatus,
  resolveSceneObjectRenderScale,
  usesStatusMapForKind,
  type DebugState,
  type MockRenderStatus
} from "../../application/workspaceSceneInteraction";
import {
  isAreaSharedPlaceablesRendererSceneObject,
  resolveAreaPlaceablePlaceholderReason,
  resolvePlaceableRenderContractState,
  resolvePlaceableTextureDeliveryUrlsByReference,
  resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId,
  SHARED_PLACEABLES_RENDERER_PATH,
  type AreaPlaceablePlaceholderReason
} from "../../application/workspacePlaceableRenderContracts";
import {
  createSoundModeMarkerGroup,
  createTextSprite
} from "./workspaceCanvasSprites";
import {
  createAuroraVfxCanonicalRenderGroup,
  isCanonicalAuroraVfxRenderablePayload
} from "./auroraVfxCanonicalRenderer";
import { clearObjectLayer } from "./workspaceObjectLayerDisposal";
import {
  applyPlaceableVfxParticleTexture,
  createPlaceableFallbackGeometry,
  createPlaceableGeometryFromPayload,
  createPlaceableVfxPreviewGroup,
  decoratePlaceableModelForObjectSelection,
  isPlaceableVfxNullTextureReference,
  isPlaceableVfxPayload,
  resolvePlaceableVfxAlphaCompanionTextureReference,
  resolvePlaceableVfxColor,
  resolvePlaceableVfxTextureReference,
  summarizePlaceableTextureSourceFormats,
  writePlaceableModelDebugStatus
} from "./workspacePlaceableModelPresentation";
import type { RuntimeState } from "./workspaceThreeRuntime";

export interface SoundRenderDiagnostics {
  readonly marker: number;
  readonly editorGuides: number;
}

const SOUND_MARKER_DIAGNOSTIC_ROLE = "sound-marker";
const SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE = "sound-editor-guide";

function markSoundEditorGuide(node: THREE.Object3D, objectId: string, role: string): void {
  node.userData = {
    ...node.userData,
    soundRenderDiagnosticRole: SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE,
    soundGuideRole: role,
    objectId,
    objectKind: "sounds"
  };
}

export function resolveSoundRenderDiagnostics(runtime: Pick<RuntimeState, "objectLayer" | "objectMeshById">): SoundRenderDiagnostics {
  let marker = 0;
  runtime.objectMeshById.forEach((node) => {
    if (node.userData?.soundRenderDiagnosticRole === SOUND_MARKER_DIAGNOSTIC_ROLE) {
      marker += 1;
    }
  });

  let editorGuides = 0;
  runtime.objectLayer.traverse((node) => {
    if (node.userData?.soundRenderDiagnosticRole === SOUND_EDITOR_GUIDE_DIAGNOSTIC_ROLE) {
      editorGuides += 1;
    }
  });

  return { marker, editorGuides };
}

export function writeSoundRenderDiagnostics(runtime: RuntimeState): SoundRenderDiagnostics {
  const diagnostics = resolveSoundRenderDiagnostics(runtime);
  runtime.container.dataset.soundMarkerCount = String(diagnostics.marker);
  runtime.container.dataset.soundEditorGuideCount = String(diagnostics.editorGuides);
  return diagnostics;
}

export const OBJECT_COLORS: Record<SceneObjectKind, string> = {
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

const VT_PHYSICAL_ANCHOR_COLOR = "#45f7a2";

const STATUS_COLOR: Record<MockRenderStatus, string> = {
  ok: "#4de083",
  warning: "#ffb347",
  error: "#ff5e73",
  non_render: "#0d131e"
};

export const AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT = 96;
export const AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_EVENT =
  "aurora:areas:primitive-fallback-render-suppression";
export const AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON =
  "area-mass-primitive-fallback-render-suppressed";
const AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER: typeof SHARED_PLACEABLES_RENDERER_PATH =
  "shared-placeables-renderer";

const SOUND_RANDOM_RANGE_COLOR = "#dff0ff";
const SOUND_HEIGHT_COLOR = "#83c7ff";
const SOUND_DOME_COLOR = "#9fd5ff";
const OBJECT_INSTANCED_FALLBACK_PLACEABLE_ROLE = "instanced-fallback-placeable";
const OBJECT_INSTANCED_FALLBACK_PROXY_ROLE = "instanced-fallback-placeable-proxy";
const OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE = "instanced-area-object-source-footprint";
const AREA_OBJECT_SOURCE_ID_LABEL_ROLE = "area-object-source-id-label";
const AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY = "areaObjectSourceDefaultOpacity";
const AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY = "areaObjectSourceSelectedOpacity";
const AREA_OBJECT_BASE_SCALE_KEY = "auroraObjectBaseScale";
const AREA_OBJECT_SELECTED_SCALE_KEY = "auroraObjectSelectedScale";
const AREA_OBJECT_INSTANCED_MESH_KEY = "auroraInstancedFallbackMesh";
const AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY = "auroraInstancedFallbackInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY = "auroraSourceFootprintDefaultMesh";
const AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY = "auroraSourceFootprintSelectedMesh";
const AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY =
  "auroraSourceFootprintDefaultInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY =
  "auroraSourceFootprintSelectedInstanceId";
const AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY = "auroraSourceFootprintLocalY";

interface ObjectPrimitiveGeometryRuntimeCache {
  objectPrimitiveGeometryCache?: Map<string, THREE.BufferGeometry>;
}

interface InstancedFallbackPlaceableEntry {
  objectId: string;
  proxy: THREE.Object3D;
  selected: boolean;
  colorHex: string;
}

interface InstancedFallbackPlaceableBatch {
  key: string;
  opacity: number;
  wireframe: boolean;
  entries: InstancedFallbackPlaceableEntry[];
}

interface InstancedAreaObjectSourceFootprintEntry {
  proxy: THREE.Object3D;
  selected: boolean;
  localY: number;
}

interface InstancedAreaObjectSourceFootprintBatch {
  status: AreaObjectSourceRenderStatus;
  entries: InstancedAreaObjectSourceFootprintEntry[];
}

const reusableObjectMatrixComposer = new THREE.Object3D();
const reusableInstanceColor = new THREE.Color();
const reusableFootprintLocalMatrixComposer = new THREE.Object3D();
const reusableFootprintInstanceMatrix = new THREE.Matrix4();
const hiddenInstanceMatrix = new THREE.Matrix4().makeScale(1e-6, 1e-6, 1e-6);
const EMPTY_TEXTURE_URLS_BY_REFERENCE = new Map<string, string>();
const EMPTY_CHUNK_MODEL_URLS_BY_ASSET_ID = new Map<string, string>();

function getRuntimePrimitiveGeometryCache(
  runtime: ObjectPrimitiveGeometryRuntimeCache
): Map<string, THREE.BufferGeometry> {
  if (!runtime.objectPrimitiveGeometryCache) {
    runtime.objectPrimitiveGeometryCache = new Map<string, THREE.BufferGeometry>();
  }
  return runtime.objectPrimitiveGeometryCache;
}

function getSharedPrimitiveGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  key: string,
  factory: () => THREE.BufferGeometry
): THREE.BufferGeometry {
  const cache = getRuntimePrimitiveGeometryCache(runtime);
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }
  const geometry = factory();
  geometry.userData = {
    ...geometry.userData,
    [PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG]: true
  };
  cache.set(key, geometry);
  return geometry;
}

function getSharedPlaceableFallbackGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `placeable-fallback:${objectRadius.toFixed(6)}`,
    () => createPlaceableFallbackGeometry(objectRadius)
  );
}

function getSharedDoorPrimitiveGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `door-primitive:${objectRadius.toFixed(6)}`,
    () => createDoorPrimitiveGeometry(objectRadius)
  );
}

function getSharedSphereGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  key: string,
  radius: number,
  widthSegments: number,
  heightSegments: number
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `${key}:${radius.toFixed(6)}:${widthSegments}:${heightSegments}`,
    () => new THREE.SphereGeometry(radius, widthSegments, heightSegments)
  );
}

function getSharedAreaObjectSourceFootprintGeometry(
  runtime: ObjectPrimitiveGeometryRuntimeCache,
  objectRadius: number,
  status: AreaObjectSourceRenderStatus
): THREE.BufferGeometry {
  return getSharedPrimitiveGeometry(
    runtime,
    `area-object-source-footprint:${status}:${objectRadius.toFixed(6)}`,
    () =>
      new THREE.TorusGeometry(
        objectRadius * (status === "source-backed" ? 1.38 : 1.18),
        Math.max(0.008, objectRadius * 0.038),
        8,
        48
      )
  );
}

function resolveFallbackOpacity(renderStatus: MockRenderStatus, debugState: DebugState): number {
  return renderStatus === "non_render" && debugState.showNonRenderMeshes ? 0.45 : 1;
}

function resolveAreaObjectSourceFootprintColor(status: AreaObjectSourceRenderStatus): string {
  return status === "source-backed" ? "#69dfa6" : "#d39a55";
}

function resolveAreaObjectSourceFootprintOpacity(
  status: AreaObjectSourceRenderStatus,
  selected: boolean
): number {
  if (selected) {
    return 0.98;
  }
  return status === "source-backed" ? 0.72 : 0.56;
}

function composeObjectInstanceMatrix(root: THREE.Object3D): THREE.Matrix4 {
  reusableObjectMatrixComposer.position.copy(root.position);
  reusableObjectMatrixComposer.quaternion.copy(root.quaternion);
  reusableObjectMatrixComposer.scale.copy(root.scale);
  reusableObjectMatrixComposer.updateMatrix();
  return reusableObjectMatrixComposer.matrix;
}

function resolveInstancedFallbackSelectedColor(baseColorHex: string, selected: boolean): string {
  return selected ? "#ffd87f" : baseColorHex;
}

function composeAreaObjectSourceFootprintInstanceMatrix(
  root: THREE.Object3D,
  localY: number
): THREE.Matrix4 {
  root.updateMatrix();
  reusableFootprintLocalMatrixComposer.position.set(0, localY, 0);
  reusableFootprintLocalMatrixComposer.rotation.set(Math.PI / 2, 0, 0);
  reusableFootprintLocalMatrixComposer.scale.setScalar(1);
  reusableFootprintLocalMatrixComposer.updateMatrix();
  return reusableFootprintInstanceMatrix.multiplyMatrices(
    root.matrix,
    reusableFootprintLocalMatrixComposer.matrix
  );
}

function setAreaObjectSourceFootprintInstanceVisibility(
  mesh: THREE.InstancedMesh | undefined,
  instanceId: number | undefined,
  root: THREE.Object3D,
  localY: number,
  visible: boolean
): void {
  if (!(mesh instanceof THREE.InstancedMesh) || typeof instanceId !== "number") {
    return;
  }
  mesh.setMatrixAt(
    instanceId,
    visible ? composeAreaObjectSourceFootprintInstanceMatrix(root, localY) : hiddenInstanceMatrix
  );
  mesh.instanceMatrix.needsUpdate = true;
}

type AreaObjectSourceRenderStatus = "source-backed" | "fallback";
type AreaObjectSharedRendererPayloadStatus =
  | "payload-bound"
  | "missing-payload"
  | "not-applicable";
type AreaObjectSharedRendererGeometryStatus =
  | "model-url-ready"
  | "still-loading"
  | "model-load-failed"
  | "primitive-fallback"
  | "missing-payload"
  | "not-applicable";

interface AreaObjectSharedRendererRuntimeEvidence {
  isAreaObjectSharedPlaceablesRendererTarget: boolean;
  auroraAreaObjectSharedRendererPath:
    | typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
    | "not-applicable";
  auroraAreaObjectSharedRendererPayloadStatus: AreaObjectSharedRendererPayloadStatus;
  auroraAreaObjectSharedRendererGeometryStatus: AreaObjectSharedRendererGeometryStatus;
  auroraAreaObjectSharedRendererPlaceholderReason: AreaPlaceablePlaceholderReason;
  auroraAreaObjectSharedRendererModelUrl: string;
  auroraAreaObjectSharedRendererRuntimeMarker?: typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER;
}

interface AreaPrimitiveFallbackRenderSuppressionSnapshot {
  version: "aurora-areas-primitive-fallback-render-suppression/v1";
  path: typeof AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER;
  reason: typeof AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON;
  renderLimit: number;
  candidateCount: number;
  renderedCount: number;
  suppressedCount: number;
  selectedBypassCount: number;
  renderedIds: string[];
  suppressedIds: string[];
}

function createDoorPrimitiveGeometry(objectRadius: number): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(
    Math.max(0.1, objectRadius * 0.78),
    Math.max(0.28, objectRadius * 2.2),
    Math.max(0.05, objectRadius * 0.18)
  );
  return geometry;
}

function resolveAreaObjectSourceRenderStatus(object: SceneObject): AreaObjectSourceRenderStatus {
  return object.source?.type === "aurora_git" ? "source-backed" : "fallback";
}

export function isAreaObjectSharedPlaceablesRendererTarget(object: SceneObject): boolean {
  return isAreaSharedPlaceablesRendererSceneObject(object);
}

function buildAreaObjectSharedRendererRuntimeEvidence(input: {
  sharedRendererTarget: boolean;
  payloadStatus: AreaObjectSharedRendererPayloadStatus;
  geometryStatus: AreaObjectSharedRendererGeometryStatus;
  placeholderReason: AreaPlaceablePlaceholderReason;
  modelUrl: string | null | undefined;
}): AreaObjectSharedRendererRuntimeEvidence {
  return {
    isAreaObjectSharedPlaceablesRendererTarget: input.sharedRendererTarget,
    auroraAreaObjectSharedRendererPath: input.sharedRendererTarget
      ? AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
      : "not-applicable",
    auroraAreaObjectSharedRendererPayloadStatus: input.payloadStatus,
    auroraAreaObjectSharedRendererGeometryStatus: input.geometryStatus,
    auroraAreaObjectSharedRendererPlaceholderReason: input.placeholderReason,
    auroraAreaObjectSharedRendererModelUrl: input.modelUrl ?? "",
    ...(input.sharedRendererTarget
      ? {
          auroraAreaObjectSharedRendererRuntimeMarker:
            AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER
        }
      : {})
  };
}

function markAreaObjectSharedRendererRuntimeEvidence(
  root: THREE.Object3D,
  evidence: AreaObjectSharedRendererRuntimeEvidence
): void {
  root.userData = {
    ...root.userData,
    ...evidence
  };
  if (!evidence.isAreaObjectSharedPlaceablesRendererTarget) {
    return;
  }
  root.traverse((node) => {
    node.userData = {
      ...node.userData,
      ...evidence
    };
  });
}

function shouldRenderAreaObjectSourceAffordance(
  object: SceneObject,
  selected: boolean,
  debugState: DebugState
): boolean {
  if (object.kind !== "placeables" && object.kind !== "doors") {
    return false;
  }
  return selected || debugState.objectLabels || debugState.bounds || debugState.collisionOverlay;
}

function createAreaObjectSourceFootprint(
  objectRadius: number,
  status: AreaObjectSourceRenderStatus,
  selected: boolean
): THREE.Mesh {
  const defaultOpacity = status === "source-backed" ? 0.72 : 0.56;
  const selectedOpacity = 0.98;
  const geometry = new THREE.TorusGeometry(
    objectRadius * (status === "source-backed" ? 1.38 : 1.18),
    Math.max(0.008, objectRadius * 0.038),
    8,
    48
  );
  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(status === "source-backed" ? "#69dfa6" : "#d39a55"),
    transparent: true,
    opacity: selected ? selectedOpacity : defaultOpacity,
    depthWrite: false
  });
  const footprint = new THREE.Mesh(geometry, material);
  footprint.rotation.x = Math.PI / 2;
  footprint.renderOrder = selected ? 16 : 11;
  footprint.raycast = () => undefined;
  footprint.userData = {
    areaObjectSourceAffordance: true,
    areaObjectSourceStatus: status,
    [AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY]: defaultOpacity,
    [AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY]: selectedOpacity
  };
  return footprint;
}

function formatViewportSourceId(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return "";
  }
  const normalized = value.trim();
  return normalized.length > 18 ? `${normalized.slice(0, 15)}...` : normalized;
}

function resolveTextureReferenceForDeliveryUrl(
  textureUrlsByReference: Map<string, string>,
  textureDeliveryUrl: string | null | undefined
): string | null {
  if (!textureDeliveryUrl) {
    return null;
  }
  for (const [reference, deliveryUrl] of textureUrlsByReference.entries()) {
    if (deliveryUrl === textureDeliveryUrl) {
      return reference;
    }
  }
  return null;
}

function resolveVfxAlphaCompanionTexture(
  particleTexturesByReference: Map<string, THREE.Texture>,
  textureReference: string | null | undefined
): THREE.Texture | null {
  const alphaReference = resolvePlaceableVfxAlphaCompanionTextureReference(textureReference);
  return alphaReference ? particleTexturesByReference.get(alphaReference) ?? null : null;
}

function collectCachedPlaceableTexturesByReference(
  runtime: RuntimeState,
  textureUrlsByReference: Map<string, string>
): Map<string, THREE.Texture> {
  const texturesByReference = new Map<string, THREE.Texture>();
  textureUrlsByReference.forEach((textureDeliveryUrl, reference) => {
    const cachedTexture = runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl);
    if (cachedTexture) {
      texturesByReference.set(reference, cachedTexture);
    }
  });
  return texturesByReference;
}

function resolveVfxModelFallbackTexture(
  runtime: RuntimeState,
  textureDeliveryUrl: string | null,
  texturesByReference: Map<string, THREE.Texture>
): THREE.Texture | undefined {
  return (
    (textureDeliveryUrl
      ? runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl)
      : undefined) ??
    (texturesByReference.size === 1 ? Array.from(texturesByReference.values())[0] : undefined)
  );
}

function applyPlaceableTexturesToVfxChunkModels(
  chunkModelsByAssetId: Map<string, THREE.Object3D>,
  texturesByReference: Map<string, THREE.Texture>,
  fallbackTexture: THREE.Texture | undefined
): void {
  if (texturesByReference.size === 0 && !fallbackTexture) {
    return;
  }
  chunkModelsByAssetId.forEach((chunkModel) => {
    applyPlaceableTexturesToModel(chunkModel, texturesByReference, fallbackTexture);
  });
}

function inferPlaceablePreviewVfxPayload(object: SceneObject) {
  if (object.kind !== "placeables" || !object.id.startsWith("preview:")) {
    return undefined;
  }

  return buildVfxPayloadFromPlaceablePreview({
    templateId: object.id.slice("preview:".length) || object.id,
    resref: object.resRef,
    name: object.name ?? object.tag,
    kind: "placeables"
  });
}

function hasRenderableAuroraVfxEmitter(payload: PlaceableViewportRenderPayload): boolean {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return false;
  }
  return emitters.some((emitter) =>
    Boolean(
      emitter.renderMode ||
        emitter.emitterType ||
        emitter.texture ||
        emitter.chunkName ||
        emitter.simulation ||
        emitter.animations?.length
    )
  );
}

function hasRenderableAuroraVfxLight(payload: PlaceableViewportRenderPayload): boolean {
  const lights = payload.renderPackage?.auroraLight?.lights;
  if (!Array.isArray(lights) || lights.length === 0) {
    return false;
  }
  return lights.some((light) =>
    Boolean(
      light.nodeName ||
        light.radius ||
        light.multiplier ||
        light.color ||
        light.animations?.length
    )
  );
}

function hasAuroraVfxChunkModelEmitter(payload: PlaceableViewportRenderPayload): boolean {
  const emitters = payload.renderPackage?.auroraEmitter?.emitters;
  if (!Array.isArray(emitters) || emitters.length === 0) {
    return false;
  }
  return emitters.some(
    (emitter) => typeof emitter.chunkName === "string" && emitter.chunkName.trim().length > 0
  );
}

function writeAreaPrimitiveFallbackRenderSuppressionDiagnostics(
  runtime: RuntimeState,
  snapshot: AreaPrimitiveFallbackRenderSuppressionSnapshot
): void {
  runtime.container.dataset.areaPrimitiveFallbackRenderSuppressionSnapshot =
    JSON.stringify(snapshot);
  runtime.container.dataset.areaPrimitiveFallbackRenderSuppressionReason =
    snapshot.reason;
  runtime.container.dataset.areaPrimitiveFallbackRenderLimit = String(snapshot.renderLimit);
  runtime.container.dataset.areaPrimitiveFallbackCandidateCount = String(
    snapshot.candidateCount
  );
  runtime.container.dataset.areaPrimitiveFallbackRenderedCount = String(
    snapshot.renderedCount
  );
  runtime.container.dataset.areaPrimitiveFallbackSuppressedCount = String(
    snapshot.suppressedCount
  );
  runtime.container.dataset.areaPrimitiveFallbackSuppressedIds =
    snapshot.suppressedIds.join("|");
  runtime.container.dispatchEvent(
    new CustomEvent<AreaPrimitiveFallbackRenderSuppressionSnapshot>(
      AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_EVENT,
      {
        detail: snapshot
      }
    )
  );
}

function disposeMeshResources(mesh: THREE.Mesh): void {
  if (mesh.geometry.userData?.[PLACEABLE_SHARED_MODEL_GEOMETRY_FLAG] !== true) {
    mesh.geometry.dispose();
  }
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((entry) => entry.dispose());
}

export function resolveSceneObjectRenderBaseY(
  isPrimitiveObject: boolean,
  objectRadius: number,
  geometry?: THREE.BufferGeometry | null
): number {
  if (!isPrimitiveObject) {
    return 0;
  }
  if (geometry) {
    geometry.computeBoundingBox();
    const minY = geometry.boundingBox?.min.y;
    if (typeof minY === "number" && Number.isFinite(minY)) {
      return -minY + 0.012;
    }
  }
  return objectRadius + 0.012;
}

function resolveObjectEffectiveVisualTransform(object: SceneObject): SceneObject["visualTransform"] {
  if (object.kind === "placeables" && (object.isStatic ?? true)) {
    return {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0
    };
  }
  return object.visualTransform;
}

function findAreaObjectSourceIdLabel(root: THREE.Object3D): THREE.Sprite | null {
  let label: THREE.Sprite | null = null;
  root.traverse((node) => {
    if (label || !(node instanceof THREE.Sprite)) {
      return;
    }
    if (node.userData?.role === AREA_OBJECT_SOURCE_ID_LABEL_ROLE) {
      label = node;
    }
  });
  return label;
}

function syncAreaObjectSourceIdLabel(input: {
  root: THREE.Object3D;
  object: SceneObject;
  selected: boolean;
  markerScale: number;
  labelHeight: number;
}): void {
  const sourceIdLabel = formatViewportSourceId(input.object.source?.sourceObjectId);
  const existingLabel = findAreaObjectSourceIdLabel(input.root);
  if (!sourceIdLabel) {
    if (existingLabel) {
      existingLabel.visible = false;
    }
    return;
  }
  if (existingLabel) {
    existingLabel.visible = input.selected;
    return;
  }
  if (!input.selected) {
    return;
  }
  const sourceIdSprite = createTextSprite(sourceIdLabel, input.markerScale * 0.58, {
    fillColor: "#ecfff5",
    backgroundFill: "rgba(8, 44, 28, 0.94)",
    backgroundStroke: "rgba(105, 223, 166, 0.92)",
    autoWidth: true,
    minWidthPx: 130,
    maxWidthPx: 760,
    horizontalPaddingPx: 22
  });
  sourceIdSprite.position.set(0, input.labelHeight + input.markerScale * 0.6, 0);
  sourceIdSprite.userData = {
    ...sourceIdSprite.userData,
    role: AREA_OBJECT_SOURCE_ID_LABEL_ROLE
  };
  input.root.add(sourceIdSprite);
}

function updateAreaObjectSourceSelectionState(
  root: THREE.Object3D,
  object: SceneObject,
  selected: boolean,
  debugState: DebugState,
  markerScale: number,
  labelHeight: number
): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh) || node.userData?.areaObjectSourceAffordance !== true) {
      return;
    }
    const material = node.material;
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((entry) => {
      if (!("opacity" in entry)) {
        return;
      }
      const defaultOpacity = Number(
        node.userData?.[AREA_OBJECT_SOURCE_DEFAULT_OPACITY_KEY] ?? entry.opacity
      );
      const selectedOpacity = Number(
        node.userData?.[AREA_OBJECT_SOURCE_SELECTED_OPACITY_KEY] ?? entry.opacity
      );
      entry.opacity = selected ? selectedOpacity : defaultOpacity;
      entry.needsUpdate = true;
    });
  });
  if (shouldRenderAreaObjectSourceAffordance(object, selected, debugState)) {
    syncAreaObjectSourceIdLabel({ root, object, selected, markerScale, labelHeight });
  }
}

function setPrimitiveObjectSelectionEmissive(root: THREE.Object3D, selected: boolean): void {
  if (!(root instanceof THREE.Mesh)) {
    return;
  }
  const materials = Array.isArray(root.material) ? root.material : [root.material];
  materials.forEach((material) => {
    if (!("emissive" in material) || !(material.emissive instanceof THREE.Color)) {
      return;
    }
    const baseEmissive =
      typeof material.userData?.auroraObjectBaseEmissive === "string"
        ? material.userData.auroraObjectBaseEmissive
        : "#000000";
    material.emissive = selected ? new THREE.Color("#ffd87f") : new THREE.Color(baseEmissive);
    material.needsUpdate = true;
  });
}

function updateInstancedFallbackProxySelection(root: THREE.Object3D, selected: boolean): void {
  const instancedMesh = root.userData?.[AREA_OBJECT_INSTANCED_MESH_KEY] as
    | THREE.InstancedMesh
    | undefined;
  const instanceId = root.userData?.[AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY];
  if (!(instancedMesh instanceof THREE.InstancedMesh) || typeof instanceId !== "number") {
    return;
  }
  const baseScale = Number(root.userData?.[AREA_OBJECT_BASE_SCALE_KEY] ?? root.scale.x);
  const selectedScale = Number(
    root.userData?.[AREA_OBJECT_SELECTED_SCALE_KEY] ?? baseScale * 1.16
  );
  root.scale.setScalar(selected ? selectedScale : baseScale);
  instancedMesh.setMatrixAt(instanceId, composeObjectInstanceMatrix(root));
  const baseColorHex =
    typeof root.userData?.auroraInstancedFallbackColor === "string"
      ? root.userData.auroraInstancedFallbackColor
      : OBJECT_COLORS.placeables;
  instancedMesh.setColorAt(
    instanceId,
    reusableInstanceColor.set(resolveInstancedFallbackSelectedColor(baseColorHex, selected))
  );
  instancedMesh.instanceMatrix.needsUpdate = true;
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true;
  }
  const localY = Number(root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY] ?? 0);
  setAreaObjectSourceFootprintInstanceVisibility(
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY] as
      | THREE.InstancedMesh
      | undefined,
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY] as number | undefined,
    root,
    localY,
    !selected
  );
  setAreaObjectSourceFootprintInstanceVisibility(
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY] as
      | THREE.InstancedMesh
      | undefined,
    root.userData?.[AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY] as number | undefined,
    root,
    localY,
    selected
  );
}

export function updateObjectMeshSelectionState(
  runtime: RuntimeState,
  objects: SceneObject[],
  selectedObjectIds: string[],
  debugState: DebugState,
  sceneScale: number,
  renderAreaGeometry: boolean
): void {
  const selectedSet = new Set(selectedObjectIds);
  const markerScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);
  const objectRadius = 0.24 * markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;

  objects.forEach((object) => {
    const root = runtime.objectMeshById.get(object.id);
    if (!root) {
      return;
    }
    const selected = selectedSet.has(object.id);
    if (root.userData?.role === OBJECT_INSTANCED_FALLBACK_PROXY_ROLE) {
      updateInstancedFallbackProxySelection(root, selected);
    } else {
      const baseScale = Number(root.userData?.[AREA_OBJECT_BASE_SCALE_KEY] ?? root.scale.x);
      const selectedScale = Number(
        root.userData?.[AREA_OBJECT_SELECTED_SCALE_KEY] ?? baseScale * 1.16
      );
      root.scale.setScalar(selected ? selectedScale : baseScale);
      if (root.userData?.auroraPrimitiveObject === true) {
        setPrimitiveObjectSelectionEmissive(root, selected);
      }
    }
    updateAreaObjectSourceSelectionState(root, object, selected, debugState, markerScale, labelHeight);
  });
}

export function rebuildObjectMeshes(
  runtime: RuntimeState,
  objects: SceneObject[],
  selectedObjectIds: string[],
  debugState: DebugState,
  sceneScale: number,
  renderAreaGeometry: boolean,
  soundUnitsPerTile: number,
  runtimeSoundNowPlayingBadges: readonly RuntimeSoundNowPlayingBadge[],
  showRuntimeSoundNowPlaying: boolean,
  placeableRenderPayloadByObjectId: Record<string, PlaceableViewportRenderPayload> | null
): void {
  clearObjectLayer(runtime);
  writePlaceableModelDebugStatus(runtime, "idle", {
    objectCount: objects.length,
    meshCount: null,
    bounds: null,
    url: null
  });
  const selectedSet = new Set(selectedObjectIds);
  const nowPlayingLabelById = new Map<string, string>(
    runtimeSoundNowPlayingBadges.map((badge) => [badge.objectId, badge.label])
  );
  const markerScale = resolveSceneObjectRenderScale(sceneScale, renderAreaGeometry);
  const placeableModelTargetMaxAxisFactor = renderAreaGeometry
    ? PLACEABLE_AREA_MODEL_TARGET_MAX_AXIS_FACTOR
    : PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR;
  const soundMetersToWorldScale = 1 / Math.max(1, soundUnitsPerTile);
  const objectRadius = 0.24 * markerScale;
  const collisionRadius = 0.33 * markerScale;
  const collisionThickness = Math.max(0.014, 0.04 * markerScale);
  const labelScale = markerScale;
  const labelHeight = objectRadius + 0.08 * markerScale;
  const objectBaseY = objectRadius + 0.012;
  const toWorldSoundDistance = (meters: number) => Math.max(0, meters) * soundMetersToWorldScale;
  let areaPrimitiveFallbackCandidateCount = 0;
  let areaPrimitiveFallbackRenderedCount = 0;
  let areaPrimitiveFallbackSuppressedCount = 0;
  let areaPrimitiveFallbackSelectedBypassCount = 0;
  const areaPrimitiveFallbackRenderedIds: string[] = [];
  const areaPrimitiveFallbackSuppressedIds: string[] = [];
  const instancedFallbackPlaceableBatches = new Map<string, InstancedFallbackPlaceableBatch>();
  const instancedAreaObjectSourceFootprintBatches = new Map<
    AreaObjectSourceRenderStatus,
    InstancedAreaObjectSourceFootprintBatch
  >();

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

    const placeableRenderPayload =
      object.kind === "placeables" || object.kind === "doors"
        ? placeableRenderPayloadByObjectId?.[object.id] ?? null
        : null;
    const placeableRenderContractState = placeableRenderPayload
      ? resolvePlaceableRenderContractState(placeableRenderPayload)
      : null;
    const sharedRendererTarget = isAreaObjectSharedPlaceablesRendererTarget(object);
    const sharedRendererPayloadStatus: AreaObjectSharedRendererPayloadStatus = sharedRendererTarget
      ? placeableRenderPayload
        ? "payload-bound"
        : "missing-payload"
      : "not-applicable";
    const isAreaSharedRendererPrimitiveFallback =
      renderAreaGeometry &&
      sharedRendererTarget &&
      (!placeableRenderPayload ||
        !placeableRenderContractState?.modelUrl ||
        placeableRenderContractState.fallbackToPrimitive);
    if (isAreaSharedRendererPrimitiveFallback) {
      areaPrimitiveFallbackCandidateCount += 1;
      const selected = selectedSet.has(object.id);
      if (!selected && areaPrimitiveFallbackRenderedCount >= AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT) {
        areaPrimitiveFallbackSuppressedCount += 1;
        areaPrimitiveFallbackSuppressedIds.push(object.id);
        return;
      }
      if (selected && areaPrimitiveFallbackRenderedCount >= AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT) {
        areaPrimitiveFallbackSelectedBypassCount += 1;
      }
      areaPrimitiveFallbackRenderedCount += 1;
      areaPrimitiveFallbackRenderedIds.push(object.id);
    }
    const placeableTextureUrlsByReference = placeableRenderPayload
      ? resolvePlaceableTextureDeliveryUrlsByReference(placeableRenderPayload)
      : EMPTY_TEXTURE_URLS_BY_REFERENCE;
    const placeableChunkModelUrlsByAssetId =
      placeableRenderPayload && placeableRenderPayload.placeable.render.isVfx
        ? resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId(placeableRenderPayload)
        : EMPTY_CHUNK_MODEL_URLS_BY_ASSET_ID;
    let colorHex = OBJECT_COLORS[object.kind];
    const objectLabel = OBJECT_LABELS[object.kind];
    const isStatusMapped =
      debugState.statusMap !== "off" &&
      usesStatusMapForKind(debugState.statusMap, object.kind);
    const isRenderPayloadVfxPlaceable =
      object.kind === "placeables" &&
      Boolean(placeableRenderPayload && isPlaceableVfxPayload(placeableRenderPayload));
    const previewVfxPayload = object.kind === "placeables" ? object.vfxPayload : undefined;
    const inferredPreviewVfxPayload =
      !placeableRenderPayload && !previewVfxPayload
        ? inferPlaceablePreviewVfxPayload(object)
        : undefined;
    const isVfxPlaceable =
      isRenderPayloadVfxPlaceable ||
      Boolean(!placeableRenderPayload && (previewVfxPayload || inferredPreviewVfxPayload));
    const auroraVfxPayload =
      isRenderPayloadVfxPlaceable && placeableRenderPayload
        ? buildVfxPayloadFromRenderPayload(placeableRenderPayload)
        : previewVfxPayload ?? inferredPreviewVfxPayload;
    const canonicalAuroraVfxPayload = auroraVfxPayload?.auroraPayload;
    const shouldUseCanonicalVfxRenderer = isCanonicalAuroraVfxRenderablePayload(
      canonicalAuroraVfxPayload
    );
    if (isStatusMapped) {
      colorHex = STATUS_COLOR[renderStatus];
    } else if (isVfxPlaceable && placeableRenderPayload) {
      colorHex = resolvePlaceableVfxColor(placeableRenderPayload);
    } else if (!debugState.textures) {
      colorHex = "#8ba0bc";
    }
    if (locked) {
      colorHex = "#566376";
    }

    const hasRenderableVfxEmitter =
      isVfxPlaceable && placeableRenderPayload
        ? hasRenderableAuroraVfxEmitter(placeableRenderPayload)
        : false;
    const hasRenderableVfxLight =
      isVfxPlaceable && placeableRenderPayload
        ? hasRenderableAuroraVfxLight(placeableRenderPayload)
        : false;
    const hasVfxChunkModelEmitter =
      isVfxPlaceable && placeableRenderPayload
        ? hasAuroraVfxChunkModelEmitter(placeableRenderPayload)
        : false;
    const shouldRenderVfxAsStaticModel =
      isVfxPlaceable &&
      !shouldUseCanonicalVfxRenderer &&
      Boolean(placeableRenderPayload) &&
      !hasRenderableVfxEmitter &&
      !hasRenderableVfxLight &&
      Boolean(
        placeableRenderContractState?.modelUrl &&
          !placeableRenderContractState.fallbackToPrimitive
      );
    const shouldUsePlaceableModel =
      !shouldUseCanonicalVfxRenderer &&
      (!isVfxPlaceable || shouldRenderVfxAsStaticModel) &&
      Boolean(
        placeableRenderContractState?.modelUrl &&
          !placeableRenderContractState.fallbackToPrimitive
      ) &&
      (object.kind === "placeables" || object.kind === "doors");
    const sharedRendererPlaceholderReason = resolveAreaPlaceablePlaceholderReason({
      sharedRendererTarget,
      payload: placeableRenderPayload,
      renderState: placeableRenderContractState,
      isPending: shouldUsePlaceableModel
    });
    const sharedRendererGeometryStatus: AreaObjectSharedRendererGeometryStatus =
      !sharedRendererTarget
        ? "not-applicable"
        : sharedRendererPlaceholderReason === "missing-payload"
          ? "missing-payload"
          : sharedRendererPlaceholderReason === "none"
            ? "model-url-ready"
            : sharedRendererPlaceholderReason === "still-loading"
              ? "still-loading"
              : sharedRendererPlaceholderReason === "model-load-failed"
                ? "model-load-failed"
                : "primitive-fallback";
    const sharedRendererRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererGeometryStatus,
      placeholderReason: sharedRendererPlaceholderReason,
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const sharedRendererModelReadyRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererTarget ? "model-url-ready" : "not-applicable",
      placeholderReason: sharedRendererTarget ? "none" : "not-applicable",
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const sharedRendererModelFailedRuntimeEvidence = buildAreaObjectSharedRendererRuntimeEvidence({
      sharedRendererTarget,
      payloadStatus: sharedRendererPayloadStatus,
      geometryStatus: sharedRendererTarget ? "model-load-failed" : "not-applicable",
      placeholderReason: sharedRendererTarget ? "model-load-failed" : "not-applicable",
      modelUrl: placeableRenderContractState?.modelUrl
    });
    const canUseInstancedFallbackPlaceable =
      object.kind === "placeables" &&
      !placeableRenderPayload &&
      !isVfxPlaceable &&
      !shouldUsePlaceableModel &&
      !debugState.collisionOverlay &&
      !debugState.bounds &&
      !debugState.objectLabels &&
      !(debugState.showVtPhysicalAnchor && isVisualTransformAppliedToObject(object));
    if (canUseInstancedFallbackPlaceable) {
      const fallbackGeometry = getSharedPlaceableFallbackGeometry(runtime, objectRadius);
      const renderBaseY = resolveSceneObjectRenderBaseY(true, objectRadius, fallbackGeometry);
      const effectiveVisualTransform = resolveObjectEffectiveVisualTransform(object);
      const visualScale = Math.max(0.01, effectiveVisualTransform.scale);
      const selected = selectedSet.has(object.id);
      const selectedScale = visualScale * 1.16;
      const proxy = new THREE.Object3D();
      proxy.position.set(
        object.x + effectiveVisualTransform.offsetX,
        renderBaseY + object.z + effectiveVisualTransform.offsetZ,
        object.y + effectiveVisualTransform.offsetY
      );
      proxy.rotation.set(
        effectiveVisualTransform.pitch,
        object.bearing + effectiveVisualTransform.yaw,
        effectiveVisualTransform.roll
      );
      proxy.scale.setScalar(selected ? selectedScale : visualScale);
      const sourceRenderStatus = resolveAreaObjectSourceRenderStatus(object);
      proxy.userData = {
        objectId: object.id,
        objectKind: object.kind,
        objectLabel,
        role: OBJECT_INSTANCED_FALLBACK_PROXY_ROLE,
        auroraPrimitiveObject: true,
        auroraInstancedFallbackColor: colorHex,
        auroraAreaObjectSourceStatus: sourceRenderStatus,
        auroraAreaObjectSourceType: object.source?.type ?? "",
        auroraAreaObjectSourceId: object.source?.sourceObjectId ?? "",
        auroraAreaObjectSourceKind: object.source?.sourceKind ?? "",
        auroraAreaObjectTemplateId: object.source?.templateId ?? object.resRef,
        auroraAreaObjectPosition: `${object.x},${object.y},${object.z}`,
        auroraAreaObjectBearing: String(object.bearing),
        [AREA_OBJECT_BASE_SCALE_KEY]: visualScale,
        [AREA_OBJECT_SELECTED_SCALE_KEY]: selectedScale,
        ...sharedRendererRuntimeEvidence
      };
      markAreaObjectSharedRendererRuntimeEvidence(proxy, sharedRendererRuntimeEvidence);
      if (shouldRenderAreaObjectSourceAffordance(object, selected, debugState)) {
        const footprintLocalY = -renderBaseY + 0.026;
        proxy.userData = {
          ...proxy.userData,
          [AREA_OBJECT_SOURCE_FOOTPRINT_LOCAL_Y_KEY]: footprintLocalY
        };
        const footprintBatch =
          instancedAreaObjectSourceFootprintBatches.get(sourceRenderStatus) ??
          {
            status: sourceRenderStatus,
            entries: []
          };
        footprintBatch.entries.push({
          proxy,
          selected,
          localY: footprintLocalY
        });
        instancedAreaObjectSourceFootprintBatches.set(sourceRenderStatus, footprintBatch);
        syncAreaObjectSourceIdLabel({
          root: proxy,
          object,
          selected,
          markerScale,
          labelHeight
        });
      }
      runtime.objectLayer.add(proxy);
      runtime.objectMeshById.set(object.id, proxy);

      const opacity = resolveFallbackOpacity(renderStatus, debugState);
      const batchKey = `${colorHex}|${opacity.toFixed(3)}|${debugState.wireframe ? "wire" : "solid"}`;
      const batch =
        instancedFallbackPlaceableBatches.get(batchKey) ??
        {
          key: batchKey,
          opacity,
          wireframe: debugState.wireframe,
          entries: []
        };
      batch.entries.push({
        objectId: object.id,
        proxy,
        selected,
        colorHex
      });
      instancedFallbackPlaceableBatches.set(batch.key, batch);
      return;
    }
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(colorHex),
      wireframe: debugState.wireframe
    });

    if (renderStatus === "non_render" && debugState.showNonRenderMeshes) {
      material.opacity = 0.45;
      material.transparent = true;
    }

    if (isVfxPlaceable) {
      material.transparent = true;
      material.opacity = debugState.wireframe ? 1 : 0.62;
      material.emissive = new THREE.Color(colorHex);
      material.emissiveIntensity = 1.35;
      material.side = THREE.DoubleSide;
      material.depthWrite = false;
    }

    if (
      placeableRenderContractState?.fallbackToPrimitive &&
      !placeableRenderContractState.hasTextureContract
    ) {
      material.transparent = true;
      material.opacity = Math.min(material.opacity ?? 1, 0.88);
      material.emissive = new THREE.Color("#1a2138");
      material.emissiveIntensity = 0.55;
    }
    material.userData = {
      ...material.userData,
      auroraObjectBaseEmissive:
        "emissive" in material && material.emissive instanceof THREE.Color
          ? `#${material.emissive.getHexString()}`
          : "#000000"
    };

    if (placeableRenderContractState && !debugState.wireframe && !isVfxPlaceable) {
      const textureUrl = placeableRenderContractState.textureDeliveryUrl;
      if (textureUrl) {
        const textureFromCache = runtime.placeableTextureCacheByUrl.get(textureUrl);
        if (textureFromCache) {
          material.map = textureFromCache;
          material.transparent = true;
          material.alphaTest = 0.02;
          material.needsUpdate = true;
        } else {
          void ensurePlaceableTexture(runtime, textureUrl).then((resolvedTexture) => {
            if (!resolvedTexture) {
              return;
            }
            material.map = resolvedTexture;
            material.transparent = true;
            material.alphaTest = 0.02;
            material.needsUpdate = true;
          });
        }
      } else if (placeableRenderContractState.hasMetadataContract) {
        // Metadata-only contract: keep graceful primitive fallback without extra work.
      }
    }
    const geometry =
      object.kind === "sounds"
        ? getSharedSphereGeometry(runtime, "sound-marker", objectRadius * 0.82, 18, 18)
        : placeableRenderPayload
          ? createPlaceableGeometryFromPayload(placeableRenderPayload, objectRadius)
          : object.kind === "placeables"
            ? getSharedPlaceableFallbackGeometry(runtime, objectRadius)
            : object.kind === "doors"
              ? getSharedDoorPrimitiveGeometry(runtime, objectRadius)
              : getSharedSphereGeometry(runtime, "object-marker", objectRadius, 22, 22);
    const primitiveFallbackMesh =
      object.kind === "sounds" || isVfxPlaceable ? null : new THREE.Mesh(geometry, material);
    const vfxTextureReference =
      isVfxPlaceable && placeableRenderPayload && hasRenderableVfxEmitter
        ? resolvePlaceableVfxTextureReference(placeableRenderPayload)
        : null;
    const hasVfxNullTextureReference = isPlaceableVfxNullTextureReference(vfxTextureReference);
    const normalizedVfxTextureReference = vfxTextureReference?.trim().toLowerCase() ?? null;
    const vfxTextureUrl =
      isVfxPlaceable && hasRenderableVfxEmitter && !debugState.wireframe && !hasVfxNullTextureReference
        ? (normalizedVfxTextureReference
            ? placeableTextureUrlsByReference.get(normalizedVfxTextureReference) ?? null
            : null) ??
          placeableRenderContractState?.textureDeliveryUrl ??
          null
        : null;
    const vfxParticleTexture =
      vfxTextureUrl ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? null : null;
    const vfxParticleTexturesByReference = new Map<string, THREE.Texture>();
    if (isVfxPlaceable && hasRenderableVfxEmitter && !debugState.wireframe) {
      collectCachedPlaceableTexturesByReference(
        runtime,
        placeableTextureUrlsByReference
      ).forEach((texture, reference) => vfxParticleTexturesByReference.set(reference, texture));
    }
    const vfxChunkModelsByAssetId = new Map<string, THREE.Object3D>();
    if (isVfxPlaceable && hasRenderableVfxEmitter && !debugState.wireframe) {
      placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
        const cachedModel = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
        if (cachedModel) {
          vfxChunkModelsByAssetId.set(assetId, cachedModel);
        }
      });
      applyPlaceableTexturesToVfxChunkModels(
        vfxChunkModelsByAssetId,
        vfxParticleTexturesByReference,
        resolveVfxModelFallbackTexture(runtime, vfxTextureUrl, vfxParticleTexturesByReference)
      );
    }
    const vfxTextureUrlsForLoading =
      isVfxPlaceable && hasRenderableVfxEmitter && !hasVfxNullTextureReference
      ? Array.from(
          new Set([
            ...Array.from(placeableTextureUrlsByReference.values()),
            ...(vfxTextureUrl ? [vfxTextureUrl] : [])
          ])
        )
      : [];
    const missingVfxTextureUrls = vfxTextureUrlsForLoading.filter(
      (textureDeliveryUrl) => !runtime.placeableTextureCacheByUrl.has(textureDeliveryUrl)
    );
    const canonicalVfxParticleTexturesByReference =
      shouldUseCanonicalVfxRenderer && placeableRenderPayload
        ? collectCachedPlaceableTexturesByReference(runtime, placeableTextureUrlsByReference)
        : new Map<string, THREE.Texture>();
    const canonicalVfxGroup =
      shouldUseCanonicalVfxRenderer && canonicalAuroraVfxPayload
        ? createAuroraVfxCanonicalRenderGroup(canonicalAuroraVfxPayload, {
            objectRadius,
            particleTexturesByReference: canonicalVfxParticleTexturesByReference
          })
        : null;
    const vfxPreviewGroup =
      isVfxPlaceable &&
      !shouldUseCanonicalVfxRenderer &&
      placeableRenderPayload &&
      !debugState.wireframe &&
      !shouldRenderVfxAsStaticModel
        ? createPlaceableVfxPreviewGroup(placeableRenderPayload, objectRadius, colorHex, {
            particleTexture: vfxParticleTexture,
            textureDeliveryUrl: vfxTextureUrl,
            particleTexturesByReference: vfxParticleTexturesByReference,
            textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
            chunkModelsByAssetId: vfxChunkModelsByAssetId,
            chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes
          })
        : null;
    const pendingVfxRoot =
      isVfxPlaceable && !placeableRenderPayload && !canonicalVfxGroup ? new THREE.Group() : null;
    if (pendingVfxRoot) {
      pendingVfxRoot.userData = {
        ...pendingVfxRoot.userData,
        vfxPreviewRole: "pending-render-payload",
        vfxTextureStatus: "waiting-render-payload",
        vfxTextureDeliveryUrl: vfxTextureUrl,
        vfxTextureDeliveryUrls: vfxTextureUrlsForLoading
      };
    }
    if (vfxPreviewGroup && missingVfxTextureUrls.length > 0) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingVfxTextureUrls[0] ?? null,
        loadPhase: "vfx-texture",
        loadCompleted: 0,
        loadTotal: missingVfxTextureUrls.length,
        textureStatus: "loading",
        textureCount: vfxTextureUrlsForLoading.length,
        textureLoaded: 0,
        textureSource: null
      });
      let resolvedVfxTextureRequests = 0;
      missingVfxTextureUrls.forEach((textureDeliveryUrl) => {
        void ensurePlaceableTexture(runtime, textureDeliveryUrl).then((resolvedTexture) => {
          resolvedVfxTextureRequests += 1;
          const latestRoot = runtime.objectMeshById.get(object.id);
          if (latestRoot !== vfxPreviewGroup) {
            return;
          }
          if (!resolvedTexture) {
            vfxPreviewGroup.userData = {
              ...vfxPreviewGroup.userData,
              vfxTextureStatus:
                resolvedVfxTextureRequests >= missingVfxTextureUrls.length ? "missing" : "loading"
            };
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: textureDeliveryUrl,
              loadPhase: "vfx-texture",
              loadCompleted: resolvedVfxTextureRequests,
              loadTotal: missingVfxTextureUrls.length,
              textureStatus: "missing",
              textureCount: vfxTextureUrlsForLoading.length,
              textureLoaded: resolvedVfxTextureRequests,
              textureSource: null
            });
            return;
          }
          const textureReference = resolveTextureReferenceForDeliveryUrl(
            placeableTextureUrlsByReference,
            textureDeliveryUrl
          );
          applyPlaceableVfxParticleTexture(
            vfxPreviewGroup,
            resolvedTexture,
            textureDeliveryUrl,
            resolveVfxAlphaCompanionTexture(vfxParticleTexturesByReference, textureReference)
          );
          vfxPreviewGroup.userData = {
            ...vfxPreviewGroup.userData,
            vfxTextureStatus:
              resolvedVfxTextureRequests >= missingVfxTextureUrls.length ? "applied" : "loading"
          };
          if (
            hasVfxChunkModelEmitter &&
            placeableRenderPayload &&
            resolvedVfxTextureRequests >= missingVfxTextureUrls.length
          ) {
            const chunkModelsByAssetId = new Map<string, THREE.Object3D>();
            placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
              const cachedModel = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
              if (cachedModel) {
                chunkModelsByAssetId.set(assetId, cachedModel);
              }
            });
            if (chunkModelsByAssetId.size > 0) {
              const refreshedParticleTexturesByReference =
                collectCachedPlaceableTexturesByReference(
                  runtime,
                  placeableTextureUrlsByReference
                );
              const refreshedParticleTexture =
                vfxTextureUrl
                  ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? null
                  : null;
              applyPlaceableTexturesToVfxChunkModels(
                chunkModelsByAssetId,
                refreshedParticleTexturesByReference,
                resolveVfxModelFallbackTexture(
                  runtime,
                  vfxTextureUrl,
                  refreshedParticleTexturesByReference
                )
              );
              const refreshedGroup = createPlaceableVfxPreviewGroup(
                placeableRenderPayload,
                objectRadius,
                colorHex,
                {
                  particleTexture: refreshedParticleTexture,
                  textureDeliveryUrl: vfxTextureUrl,
                  particleTexturesByReference: refreshedParticleTexturesByReference,
                  textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
                  chunkModelsByAssetId,
                  chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
                  showLightDiagnosticGizmos: debugState.showNonRenderMeshes
                }
              );
              decoratePlaceableModelForObjectSelection(
                refreshedGroup,
                object.id,
                object.kind,
                objectLabel
              );
              refreshedGroup.position.copy(vfxPreviewGroup.position);
              refreshedGroup.quaternion.copy(vfxPreviewGroup.quaternion);
              refreshedGroup.scale.copy(vfxPreviewGroup.scale);
              refreshedGroup.userData = {
                ...refreshedGroup.userData,
                objectId: object.id,
                objectKind: object.kind,
                objectLabel,
                ...(auroraVfxPayload
                  ? {
                      auroraVfxPayload,
                      auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                      auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                      auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                        (diagnostic) => diagnostic.code
                      )
                    }
                  : {})
              };
              markAreaObjectSharedRendererRuntimeEvidence(
                refreshedGroup,
                sharedRendererRuntimeEvidence
              );
              runtime.objectLayer.remove(vfxPreviewGroup);
              runtime.objectLayer.add(refreshedGroup);
              runtime.objectMeshById.set(object.id, refreshedGroup);
            }
          }
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: textureDeliveryUrl,
            loadPhase: "vfx-texture",
            loadCompleted: resolvedVfxTextureRequests,
            loadTotal: missingVfxTextureUrls.length,
            textureStatus:
              resolvedVfxTextureRequests >= missingVfxTextureUrls.length
                ? "applied"
                : "loading",
            textureCount: vfxTextureUrlsForLoading.length,
            textureLoaded: resolvedVfxTextureRequests,
            textureSource:
              typeof resolvedTexture.userData?.auroraSourceFormat === "string"
                ? resolvedTexture.userData.auroraSourceFormat
                : ""
          });
        });
      });
    }
    if (
      vfxPreviewGroup &&
      vfxTextureUrlsForLoading.length > 0 &&
      missingVfxTextureUrls.length === 0
    ) {
      const cachedVfxTextures = vfxTextureUrlsForLoading
        .map((textureDeliveryUrl) => runtime.placeableTextureCacheByUrl.get(textureDeliveryUrl))
        .filter((texture): texture is THREE.Texture => Boolean(texture));
      writePlaceableModelDebugStatus(runtime, "loaded", {
        objectId: object.id,
        url: vfxTextureUrl ?? vfxTextureUrlsForLoading[0] ?? null,
        loadPhase: "vfx-texture",
        loadCompleted: vfxTextureUrlsForLoading.length,
        loadTotal: vfxTextureUrlsForLoading.length,
        textureStatus: vfxPreviewGroup.userData?.vfxTextureStatus === "applied" ? "applied" : "missing",
        textureCount: vfxTextureUrlsForLoading.length,
        textureLoaded: cachedVfxTextures.length,
        textureSource: summarizePlaceableTextureSourceFormats(cachedVfxTextures)
      });
    }
    const missingVfxChunkModelEntries = isVfxPlaceable
      ? Array.from(placeableChunkModelUrlsByAssetId.entries()).filter(
          ([, modelDeliveryUrl]) => !runtime.placeableModelCacheByUrl.has(modelDeliveryUrl)
        )
      : [];
    if (vfxPreviewGroup && missingVfxChunkModelEntries.length > 0 && placeableRenderPayload) {
      writePlaceableModelDebugStatus(runtime, "loading", {
        objectId: object.id,
        url: missingVfxChunkModelEntries[0]?.[1] ?? null,
        loadPhase: "vfx-chunk-model",
        loadCompleted: 0,
        loadTotal: missingVfxChunkModelEntries.length,
        textureStatus: "chunk-model-loading",
        textureCount: 0,
        textureLoaded: 0,
        textureSource: null
      });
      void (async () => {
        const resolvedEntries = await Promise.all(
          missingVfxChunkModelEntries.map(async ([assetId, modelDeliveryUrl]) => {
            const resolvedModel = await ensurePlaceableModel(runtime, modelDeliveryUrl);
            return resolvedModel ? ([assetId, modelDeliveryUrl, resolvedModel] as const) : null;
          })
        );
        if (missingVfxTextureUrls.length > 0) {
          await Promise.all(
            missingVfxTextureUrls.map((textureDeliveryUrl) =>
              ensurePlaceableTexture(runtime, textureDeliveryUrl)
            )
          );
        }
        return resolvedEntries;
      })().then((resolvedEntries) => {
        const latestRoot = runtime.objectMeshById.get(object.id);
        if (!latestRoot || latestRoot !== vfxPreviewGroup) {
          return;
        }
        const chunkModelsByAssetId = new Map<string, THREE.Object3D>();
        placeableChunkModelUrlsByAssetId.forEach((modelDeliveryUrl, assetId) => {
          const alreadyCached = runtime.placeableModelCacheByUrl.get(modelDeliveryUrl);
          if (alreadyCached) {
            chunkModelsByAssetId.set(assetId, alreadyCached);
          }
        });
        resolvedEntries.forEach((entry) => {
          if (!entry) {
            return;
          }
          chunkModelsByAssetId.set(entry[0], entry[2]);
        });
        const refreshedParticleTexturesByReference =
          collectCachedPlaceableTexturesByReference(runtime, placeableTextureUrlsByReference);
        applyPlaceableTexturesToVfxChunkModels(
          chunkModelsByAssetId,
          refreshedParticleTexturesByReference,
          resolveVfxModelFallbackTexture(runtime, vfxTextureUrl, refreshedParticleTexturesByReference)
        );
        if (chunkModelsByAssetId.size === 0) {
          vfxPreviewGroup.userData = {
            ...vfxPreviewGroup.userData,
            vfxChunkModelStatus: "missing",
            vfxTextureStatus: "chunk-model-missing"
          };
          writePlaceableModelDebugStatus(runtime, "missing", {
            objectId: object.id,
            url: missingVfxChunkModelEntries[0]?.[1] ?? null,
            loadPhase: "vfx-chunk-model",
            loadCompleted: missingVfxChunkModelEntries.length,
            loadTotal: missingVfxChunkModelEntries.length,
            textureStatus: "chunk-model-missing",
            textureCount: 0,
            textureLoaded: 0,
            textureSource: null
          });
          return;
        }
        const refreshedGroup = createPlaceableVfxPreviewGroup(
          placeableRenderPayload,
          objectRadius,
          colorHex,
          {
            particleTexture: vfxTextureUrl
              ? runtime.placeableTextureCacheByUrl.get(vfxTextureUrl) ?? vfxParticleTexture
              : vfxParticleTexture,
            textureDeliveryUrl: vfxTextureUrl,
            particleTexturesByReference:
              refreshedParticleTexturesByReference.size > 0
                ? refreshedParticleTexturesByReference
                : vfxParticleTexturesByReference,
            textureDeliveryUrlsByReference: placeableTextureUrlsByReference,
            chunkModelsByAssetId,
            chunkModelUrlsByAssetId: placeableChunkModelUrlsByAssetId,
            showLightDiagnosticGizmos: debugState.showNonRenderMeshes
          }
        );
        decoratePlaceableModelForObjectSelection(
          refreshedGroup,
          object.id,
          object.kind,
          objectLabel
        );
        refreshedGroup.position.copy(latestRoot.position);
        refreshedGroup.quaternion.copy(latestRoot.quaternion);
        refreshedGroup.scale.copy(latestRoot.scale);
        refreshedGroup.userData = {
          ...refreshedGroup.userData,
          objectId: object.id,
          objectKind: object.kind,
          objectLabel,
          ...(auroraVfxPayload
            ? {
                auroraVfxPayload,
                auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
                auroraVfxPreviewMode: auroraVfxPayload.previewMode,
                auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                  (diagnostic) => diagnostic.code
                )
              }
            : {})
        };
        markAreaObjectSharedRendererRuntimeEvidence(
          refreshedGroup,
          sharedRendererRuntimeEvidence
        );
        runtime.objectLayer.remove(latestRoot);
        runtime.objectLayer.add(refreshedGroup);
        runtime.objectMeshById.set(object.id, refreshedGroup);
        writePlaceableModelDebugStatus(runtime, "loaded", {
          objectId: object.id,
          url: missingVfxChunkModelEntries[0]?.[1] ?? null,
          loadPhase: "vfx-chunk-model",
          loadCompleted: missingVfxChunkModelEntries.length,
          loadTotal: missingVfxChunkModelEntries.length,
          textureStatus: "chunk-model-applied",
          textureCount: 0,
          textureLoaded: 0,
          textureSource: null
        });
      });
    }
    if (primitiveFallbackMesh) {
      if (shouldUsePlaceableModel) {
        primitiveFallbackMesh.position.y = resolveSceneObjectRenderBaseY(
          true,
          objectRadius,
          geometry
        );
      }
      decoratePlaceableModelForObjectSelection(
        primitiveFallbackMesh,
        object.id,
        object.kind,
        objectLabel
      );
    }
    const objectRoot = shouldUsePlaceableModel
      ? new THREE.Object3D()
      : canonicalVfxGroup ??
        vfxPreviewGroup ??
        primitiveFallbackMesh ??
        pendingVfxRoot ??
        new THREE.Mesh(geometry, material);
    if (vfxPreviewGroup && primitiveFallbackMesh && !shouldUsePlaceableModel) {
      primitiveFallbackMesh.material.transparent = true;
      primitiveFallbackMesh.material.opacity = Math.min(
        primitiveFallbackMesh.material.opacity ?? 1,
        0.08
      );
      primitiveFallbackMesh.material.depthWrite = false;
      primitiveFallbackMesh.renderOrder = 8;
      vfxPreviewGroup.add(primitiveFallbackMesh);
    }
    if (shouldUsePlaceableModel && vfxPreviewGroup) {
      decoratePlaceableModelForObjectSelection(
        vfxPreviewGroup,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.add(vfxPreviewGroup);
    }
    if (shouldUsePlaceableModel && primitiveFallbackMesh) {
      objectRoot.add(primitiveFallbackMesh);
    }
    const isPrimitiveObject = !shouldUsePlaceableModel && !isVfxPlaceable;
    const objectRenderPackageModelUrl = shouldUsePlaceableModel
      ? placeableRenderContractState?.modelUrl
      : null;
    const objectRenderPackageModelCacheKey = shouldUsePlaceableModel
      ? (placeableRenderContractState?.modelCacheKey ?? objectRenderPackageModelUrl)
      : null;
    if (shouldUsePlaceableModel) {
      objectRoot.userData = {
        objectId: object.id,
        objectKind: object.kind,
        objectLabel: objectLabel,
        renderPackageModelUrl: objectRenderPackageModelUrl,
        renderPackageModelCacheKey: objectRenderPackageModelCacheKey,
        ...(auroraVfxPayload
          ? {
              auroraVfxPayload,
              auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
              auroraVfxPreviewMode: auroraVfxPayload.previewMode,
              auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                (diagnostic) => diagnostic.code
              )
            }
          : {})
      };
      if (objectRenderPackageModelUrl) {
        const shouldCloneModelMaterials =
          !debugState.wireframe &&
          (placeableTextureUrlsByReference.size > 0 ||
            Boolean(placeableRenderContractState?.textureDeliveryUrl));
        writePlaceableModelDebugStatus(runtime, "loading", {
          objectId: object.id,
          url: objectRenderPackageModelUrl,
          loadPhase: "model",
          loadCompleted: 0,
          loadTotal: 1
        });
        void ensureNormalizedPlaceableModel(
          runtime,
          objectRenderPackageModelUrl,
          objectRadius,
          {
            targetMaxAxisFactor: placeableModelTargetMaxAxisFactor,
            cloneMaterials: shouldCloneModelMaterials,
            cacheKey: objectRenderPackageModelCacheKey
          }
        ).then((resolvedModel) => {
          if (!resolvedModel) {
            const latestObjectRoot = runtime.objectMeshById.get(object.id);
            if (
              latestObjectRoot &&
              latestObjectRoot.userData.renderPackageModelUrl === objectRenderPackageModelUrl
            ) {
              markAreaObjectSharedRendererRuntimeEvidence(
                latestObjectRoot,
                sharedRendererModelFailedRuntimeEvidence
              );
            }
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              loadPhase: "model",
              loadCompleted: 1,
              loadTotal: 1
            });
            return;
          }
          const latestObjectRoot = runtime.objectMeshById.get(object.id);
          if (!latestObjectRoot) {
            return;
          }
          if (
            latestObjectRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
          ) {
            return;
          }

          const modelMetrics =
            resolvePlaceableNormalizedModelPresentationMetrics(resolvedModel);
          if (modelMetrics.boundsEmpty || modelMetrics.meshCount < 1) {
            markAreaObjectSharedRendererRuntimeEvidence(
              latestObjectRoot,
              sharedRendererModelFailedRuntimeEvidence
            );
            writePlaceableModelDebugStatus(runtime, "missing", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              meshCount: modelMetrics.meshCount,
              bounds: modelMetrics.boundsEmpty ? "empty" : "invalid",
              loadPhase: "model",
              loadCompleted: 1,
              loadTotal: 1
            });
            return;
          }
          decoratePlaceableModelForObjectSelection(
            resolvedModel,
            object.id,
            object.kind,
            objectLabel
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            latestObjectRoot,
            sharedRendererModelReadyRuntimeEvidence
          );
          markAreaObjectSharedRendererRuntimeEvidence(
            resolvedModel,
            sharedRendererModelReadyRuntimeEvidence
          );
          writePlaceableModelDebugStatus(runtime, "loaded", {
            objectId: object.id,
            url: objectRenderPackageModelUrl,
            meshCount: modelMetrics.meshCount,
            bounds: modelMetrics.boundsLabel
          });
          const textureUrl = placeableRenderContractState?.textureDeliveryUrl;
          const textureUrlsByReference = placeableTextureUrlsByReference;
          const expectedTextureCount = Math.max(
            textureUrlsByReference.size,
            textureUrl ? 1 : 0
          );
          const loadTotal = 1 + expectedTextureCount;
          if (textureUrlsByReference.size > 0 && !debugState.wireframe) {
            writePlaceableModelDebugStatus(runtime, "loading", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              meshCount: modelMetrics.meshCount,
              bounds: modelMetrics.boundsLabel,
              loadPhase: "textures",
              loadCompleted: 1,
              loadTotal,
              textureStatus: "loading",
              textureCount: expectedTextureCount,
              textureLoaded: 0,
              textureSource: null
            });
            let resolvedTextureRequests = 0;
            const textureRequests = Array.from(textureUrlsByReference.entries()).map(
              async ([reference, textureDeliveryUrl]) => {
                const resolvedTexture = await ensurePlaceableTexture(runtime, textureDeliveryUrl);
                resolvedTextureRequests += 1;
                const latestRoot = runtime.objectMeshById.get(object.id);
                if (
                  latestRoot &&
                  latestRoot.userData.renderPackageModelUrl === objectRenderPackageModelUrl
                ) {
                  writePlaceableModelDebugStatus(runtime, "loading", {
                    objectId: object.id,
                    url: objectRenderPackageModelUrl,
                    loadPhase: "textures",
                    loadCompleted: Math.min(loadTotal, 1 + resolvedTextureRequests),
                    loadTotal,
                    textureStatus: "loading",
                    textureCount: expectedTextureCount,
                    textureLoaded: resolvedTextureRequests,
                    textureSource: null
                  });
                }
                return resolvedTexture ? ([reference, resolvedTexture] as const) : null;
              }
            );

            void Promise.all(textureRequests).then((resolvedTextureEntries) => {
              const latestRoot = runtime.objectMeshById.get(object.id);
              if (!latestRoot) {
                return;
              }
              if (
                latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
              ) {
                return;
              }

              const texturesByReference = new Map<string, THREE.Texture>();
              resolvedTextureEntries.forEach((entry) => {
                if (!entry) {
                  return;
                }
                texturesByReference.set(entry[0], entry[1]);
              });

              if (texturesByReference.size === 0) {
                writePlaceableModelDebugStatus(runtime, "loaded", {
                  objectId: object.id,
                  url: objectRenderPackageModelUrl,
                  loadPhase: "complete",
                  loadCompleted: loadTotal,
                  loadTotal,
                  textureStatus: "missing",
                  textureCount: 0,
                  textureLoaded: resolvedTextureRequests,
                  textureSource: null
                });
                return;
              }

              const fallbackTexture = textureUrl
                ? runtime.placeableTextureCacheByUrl.get(textureUrl)
                : undefined;
              applyPlaceableTexturesToModel(
                resolvedModel,
                texturesByReference,
                fallbackTexture
              );
              writePlaceableModelDebugStatus(runtime, "loaded", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "complete",
                loadCompleted: loadTotal,
                loadTotal,
                textureStatus: "applied",
                textureCount: texturesByReference.size,
                textureLoaded: resolvedTextureRequests,
                textureSource: summarizePlaceableTextureSourceFormats(
                  texturesByReference.values()
                )
              });
            });
          } else if (textureUrl && !debugState.wireframe) {
            const textureFromCache = runtime.placeableTextureCacheByUrl.get(textureUrl);
            if (textureFromCache) {
              applyPlaceableTextureToModel(resolvedModel, textureFromCache);
              writePlaceableModelDebugStatus(runtime, "loaded", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "complete",
                loadCompleted: loadTotal,
                loadTotal,
                textureStatus: "applied",
                textureCount: 1,
                textureLoaded: 1,
                textureSource:
                  typeof textureFromCache.userData?.auroraSourceFormat === "string"
                    ? textureFromCache.userData.auroraSourceFormat
                    : ""
              });
            } else {
              writePlaceableModelDebugStatus(runtime, "loading", {
                objectId: object.id,
                url: objectRenderPackageModelUrl,
                loadPhase: "textures",
                loadCompleted: 1,
                loadTotal,
                textureStatus: "loading",
                textureCount: 1,
                textureLoaded: 0,
                textureSource: null
              });
              void ensurePlaceableTexture(runtime, textureUrl).then((resolvedTexture) => {
                const latestRoot = runtime.objectMeshById.get(object.id);
                if (!latestRoot) {
                  return;
                }
                if (
                  latestRoot.userData.renderPackageModelUrl !== objectRenderPackageModelUrl
                ) {
                  return;
                }

                if (!resolvedTexture) {
                  writePlaceableModelDebugStatus(runtime, "loaded", {
                    objectId: object.id,
                    url: objectRenderPackageModelUrl,
                    loadPhase: "complete",
                    loadCompleted: loadTotal,
                    loadTotal,
                    textureStatus: "missing",
                    textureCount: 0,
                    textureLoaded: 1,
                    textureSource: null
                  });
                  return;
                }
                applyPlaceableTextureToModel(resolvedModel, resolvedTexture);
                writePlaceableModelDebugStatus(runtime, "loaded", {
                  objectId: object.id,
                  url: objectRenderPackageModelUrl,
                  loadPhase: "complete",
                  loadCompleted: loadTotal,
                  loadTotal,
                  textureStatus: "applied",
                  textureCount: 1,
                  textureLoaded: 1,
                  textureSource:
                    typeof resolvedTexture.userData?.auroraSourceFormat === "string"
                      ? resolvedTexture.userData.auroraSourceFormat
                      : ""
                });
              });
            }
          } else {
            writePlaceableModelDebugStatus(runtime, "loaded", {
              objectId: object.id,
              url: objectRenderPackageModelUrl,
              loadPhase: "complete",
              loadCompleted: loadTotal,
              loadTotal,
              textureStatus: expectedTextureCount > 0 ? "skipped" : "missing",
              textureCount: 0,
              textureLoaded: 0,
              textureSource: null
            });
          }
          if (primitiveFallbackMesh?.parent === latestObjectRoot) {
            latestObjectRoot.remove(primitiveFallbackMesh);
            disposeMeshResources(primitiveFallbackMesh);
          }
          latestObjectRoot.add(resolvedModel);
        });
      }
    } else {
      decoratePlaceableModelForObjectSelection(
        objectRoot,
        object.id,
        object.kind,
        objectLabel
      );
      objectRoot.userData = {
        ...objectRoot.userData,
        objectId: object.id,
        objectKind: object.kind,
        objectLabel,
        ...(auroraVfxPayload
          ? {
              auroraVfxPayload,
              auroraVfxCanonicalStatus: auroraVfxPayload.canonicalStatus,
              auroraVfxPreviewMode: auroraVfxPayload.previewMode,
              auroraVfxDiagnosticCodes: auroraVfxPayload.diagnostics.map(
                (diagnostic) => diagnostic.code
              )
            }
          : {})
      };
    }

    const renderNode = objectRoot;
    const renderBaseY = resolveSceneObjectRenderBaseY(
      isPrimitiveObject,
      objectRadius,
      objectRoot instanceof THREE.Mesh ? objectRoot.geometry : null
    );
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

    const effectiveVisualTransform = resolveObjectEffectiveVisualTransform(object);
    const soundPositioning =
      object.kind === "sounds" ? normalizeSoundGuidePositioning(object.soundPositioning) : null;
    const soundOverlayFlags =
      object.kind === "sounds"
        ? resolveEditorSoundGuideOverlayFlags(soundPositioning, {
            editorVisible: true,
            locked
          })
        : null;
    const visualScale = Math.max(0.01, effectiveVisualTransform.scale);
    const selectedVisualScale = visualScale * 1.16;
    renderNode.position.set(
      object.x + effectiveVisualTransform.offsetX,
      renderBaseY + object.z + effectiveVisualTransform.offsetZ,
      object.y + effectiveVisualTransform.offsetY
    );
    renderNode.rotation.set(
      effectiveVisualTransform.pitch,
      object.bearing + effectiveVisualTransform.yaw,
      effectiveVisualTransform.roll
    );
    renderNode.scale.setScalar(visualScale);

    if (selectedSet.has(object.id)) {
      if (isPrimitiveObject && renderNode instanceof THREE.Mesh) {
        material.emissive = new THREE.Color("#ffd87f");
      }
      renderNode.scale.setScalar(selectedVisualScale);
    }

    const sourceRenderStatus = resolveAreaObjectSourceRenderStatus(object);
    if (shouldRenderAreaObjectSourceAffordance(object, selectedSet.has(object.id), debugState)) {
      const footprint = createAreaObjectSourceFootprint(
        objectRadius,
        sourceRenderStatus,
        selectedSet.has(object.id)
      );
      footprint.position.set(0, -renderBaseY + 0.026, 0);
      renderNode.add(footprint);
      syncAreaObjectSourceIdLabel({
        root: renderNode,
        object,
        selected: selectedSet.has(object.id),
        markerScale,
        labelHeight
      });
    }

    if (object.kind === "sounds") {
      const soundGuidePositioning =
        soundPositioning ?? normalizeSoundGuidePositioning(object.soundPositioning);
      const markerMode = soundGuidePositioning.mode;
      const soundModeMarker = createSoundModeMarkerGroup(markerMode, markerScale);
      soundModeMarker.position.set(0, labelHeight * 0.8, 0);
      renderNode.add(soundModeMarker);

      const physicalAnchorY = objectBaseY + object.z;
      const elevatedAnchorY =
        physicalAnchorY + toWorldSoundDistance(soundGuidePositioning.elevation);
      if (soundOverlayFlags?.anchor) {
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
        markSoundEditorGuide(physicalAnchorMesh, object.id, "anchor");
        runtime.objectLayer.add(physicalAnchorMesh);
        const visualAnchorPosition = new THREE.Vector3(
          renderNode.position.x,
          renderNode.position.y,
          renderNode.position.z
        );
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
          markSoundEditorGuide(anchorConnector, object.id, "anchor-connector");
          runtime.objectLayer.add(anchorConnector);
        }
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
          markSoundEditorGuide(ring, object.id, dashed ? "max-range" : "cutoff-range");
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
            markSoundEditorGuide(bandLine, object.id, "dome-latitude");
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
            markSoundEditorGuide(meridianLine, object.id, "dome-meridian");
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
        markSoundEditorGuide(randomRangeRect, object.id, "random-range");
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
        markSoundEditorGuide(heightLine, object.id, "height");
        runtime.objectLayer.add(heightLine);
      }
    }

    renderNode.userData = {
      ...renderNode.userData,
      objectId: object.id,
      objectKind: object.kind,
      objectLabel: OBJECT_LABELS[object.kind],
      auroraAreaObjectSourceStatus: sourceRenderStatus,
      auroraAreaObjectSourceType: object.source?.type ?? "",
      auroraAreaObjectSourceId: object.source?.sourceObjectId ?? "",
      auroraAreaObjectSourceKind: object.source?.sourceKind ?? "",
      auroraAreaObjectTemplateId: object.source?.templateId ?? object.resRef,
      auroraAreaObjectPosition: `${object.x},${object.y},${object.z}`,
      auroraAreaObjectBearing: String(object.bearing),
      auroraPrimitiveObject: isPrimitiveObject,
      [AREA_OBJECT_BASE_SCALE_KEY]: visualScale,
      [AREA_OBJECT_SELECTED_SCALE_KEY]: selectedVisualScale,
      ...sharedRendererRuntimeEvidence,
      ...(object.kind === "sounds"
        ? {
            soundRenderDiagnosticRole: SOUND_MARKER_DIAGNOSTIC_ROLE
          }
        : {})
    };
    markAreaObjectSharedRendererRuntimeEvidence(renderNode, sharedRendererRuntimeEvidence);

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
      renderNode.add(collisionRing);
    }

    runtime.objectLayer.add(renderNode);
    runtime.objectMeshById.set(object.id, renderNode);

    if (debugState.objectLabels) {
      const labelSprite = createTextSprite(OBJECT_LABELS[object.kind], labelScale);
      labelSprite.position.set(0, labelHeight, 0);
      renderNode.add(labelSprite);
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
      renderNode.add(nowPlayingSprite);
    }

    if (debugState.bounds) {
      const helperColor = isStatusMapped ? STATUS_COLOR[renderStatus] : "#8ab5ff";
      const boundsHelper = new THREE.BoxHelper(renderNode, helperColor);
      runtime.boundsLayer.add(boundsHelper);
      runtime.boundsHelpers.push(boundsHelper);
    }
  });

  instancedFallbackPlaceableBatches.forEach((batch) => {
    if (batch.entries.length === 0) {
      return;
    }
    const geometry = getSharedPlaceableFallbackGeometry(runtime, objectRadius);
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color("#ffffff"),
      wireframe: batch.wireframe,
      vertexColors: true,
      transparent: batch.opacity < 1,
      opacity: batch.opacity
    });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, batch.entries.length);
    instancedMesh.userData = {
      role: OBJECT_INSTANCED_FALLBACK_PLACEABLE_ROLE,
      objectKind: "placeables",
      objectIds: batch.entries.map((entry) => entry.objectId)
    };
    instancedMesh.renderOrder = 7;
    batch.entries.forEach((entry, instanceId) => {
      entry.proxy.userData = {
        ...entry.proxy.userData,
        [AREA_OBJECT_INSTANCED_MESH_KEY]: instancedMesh,
        [AREA_OBJECT_INSTANCED_INSTANCE_ID_KEY]: instanceId
      };
      instancedMesh.setMatrixAt(instanceId, composeObjectInstanceMatrix(entry.proxy));
      instancedMesh.setColorAt(
        instanceId,
        reusableInstanceColor.set(
          resolveInstancedFallbackSelectedColor(entry.colorHex, entry.selected)
        )
      );
    });
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
    runtime.objectLayer.add(instancedMesh);
  });

  instancedAreaObjectSourceFootprintBatches.forEach((batch) => {
    if (batch.entries.length === 0) {
      return;
    }
    const geometry = getSharedAreaObjectSourceFootprintGeometry(
      runtime,
      objectRadius,
      batch.status
    );
    const defaultMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolveAreaObjectSourceFootprintColor(batch.status)),
      transparent: true,
      opacity: resolveAreaObjectSourceFootprintOpacity(batch.status, false),
      depthWrite: false
    });
    const selectedMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(resolveAreaObjectSourceFootprintColor(batch.status)),
      transparent: true,
      opacity: resolveAreaObjectSourceFootprintOpacity(batch.status, true),
      depthWrite: false
    });
    const defaultMesh = new THREE.InstancedMesh(geometry, defaultMaterial, batch.entries.length);
    const selectedMesh = new THREE.InstancedMesh(geometry, selectedMaterial, batch.entries.length);
    defaultMesh.renderOrder = 11;
    selectedMesh.renderOrder = 16;
    defaultMesh.raycast = () => undefined;
    selectedMesh.raycast = () => undefined;
    defaultMesh.userData = {
      role: OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE,
      areaObjectSourceStatus: batch.status,
      selected: false
    };
    selectedMesh.userData = {
      role: OBJECT_INSTANCED_SOURCE_FOOTPRINT_ROLE,
      areaObjectSourceStatus: batch.status,
      selected: true
    };
    batch.entries.forEach((entry, instanceId) => {
      entry.proxy.userData = {
        ...entry.proxy.userData,
        [AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_MESH_KEY]: defaultMesh,
        [AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_MESH_KEY]: selectedMesh,
        [AREA_OBJECT_SOURCE_FOOTPRINT_DEFAULT_INSTANCE_ID_KEY]: instanceId,
        [AREA_OBJECT_SOURCE_FOOTPRINT_SELECTED_INSTANCE_ID_KEY]: instanceId
      };
      defaultMesh.setMatrixAt(
        instanceId,
        entry.selected
          ? hiddenInstanceMatrix
          : composeAreaObjectSourceFootprintInstanceMatrix(entry.proxy, entry.localY)
      );
      selectedMesh.setMatrixAt(
        instanceId,
        entry.selected
          ? composeAreaObjectSourceFootprintInstanceMatrix(entry.proxy, entry.localY)
          : hiddenInstanceMatrix
      );
    });
    defaultMesh.instanceMatrix.needsUpdate = true;
    selectedMesh.instanceMatrix.needsUpdate = true;
    runtime.objectLayer.add(defaultMesh);
    runtime.objectLayer.add(selectedMesh);
  });

  writeAreaPrimitiveFallbackRenderSuppressionDiagnostics(runtime, {
    version: "aurora-areas-primitive-fallback-render-suppression/v1",
    path: AREA_OBJECT_SHARED_PLACEABLES_RENDERER_RUNTIME_MARKER,
    reason: AREA_PRIMITIVE_FALLBACK_RENDER_SUPPRESSION_REASON,
    renderLimit: AREA_PRIMITIVE_FALLBACK_RENDER_LIMIT,
    candidateCount: areaPrimitiveFallbackCandidateCount,
    renderedCount: areaPrimitiveFallbackRenderedCount,
    suppressedCount: areaPrimitiveFallbackSuppressedCount,
    selectedBypassCount: areaPrimitiveFallbackSelectedBypassCount,
    renderedIds: areaPrimitiveFallbackRenderedIds,
    suppressedIds: areaPrimitiveFallbackSuppressedIds
  });
}
